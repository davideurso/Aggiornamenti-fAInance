import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url), ts=require('typescript');
const target='fainance-test-20260823195207';
const database=`projects/${target}/databases/(default)/documents`;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function load(file,deps,globals={}) {
 const relative=process.env.BRIDGE_NATIVE_TEST_BASELINE==='1'&&file==='integrations/mundelyBridge.ts'?'../baseline/src/':'../src/';
 const source=fs.readFileSync(new URL(relative+file,import.meta.url),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
 assert.equal(compiled.diagnostics.length,0,'TypeScript syntax: '+file);
 const box={exports:{}};
 new Function('require','exports','module','fetch','window','CustomEvent',compiled.outputText)(
  name=>{assert(name in deps,'Unexpected import '+name);return deps[name]},box.exports,box,globals.fetch,
  globals.window,globals.CustomEvent||class {constructor(type,options){this.type=type;this.detail=options?.detail}});
 return box.exports;
}
function pack(value) {
 if(value===null)return{nullValue:null};
 if(Array.isArray(value))return{arrayValue:{values:value.map(pack)}};
 if(typeof value==='object')return{mapValue:{fields:Object.fromEntries(Object.entries(value).map(([k,v])=>[k,pack(v)]))}};
 if(typeof value==='number')return Number.isSafeInteger(value)?{integerValue:String(value)}:{doubleValue:value};
 if(typeof value==='boolean')return{booleanValue:value};
 if(typeof value==='string')return{stringValue:value};
 throw Error('fixture unsupported value');
}
function unpack(value) {
 if('nullValue'in value)return null;
 if('arrayValue'in value)return(value.arrayValue.values||[]).map(unpack);
 if('mapValue'in value)return Object.fromEntries(Object.entries(value.mapValue.fields||{}).map(([k,v])=>[k,unpack(v)]));
 if('integerValue'in value)return Number(value.integerValue);
 for(const key of ['stringValue','doubleValue','booleanValue','timestampValue'])if(key in value)return value[key];
 throw Error('fixture unsupported wire');
}
function fixture({platform='android',environment='test',sdkPending=false}={}) {
 const docs=new Map(),calls=[],events=[],acks=[],reverse=[],bridgeOptions=[];
 let revision=0,sdkCalls=0,bridgeCalls=0;
 const control={beforeGet:null,beforePost:null,afterPost:null,denyGet:false,denyCommit:false,loseAfterCommit:false,loseBeforeCommit:false,conflictOnce:false,alwaysConflict:false,loseBridgeAck:false};
 const auth={currentUser:{uid:'synthetic-finance',displayName:'Synthetic',getIdToken:async()=>'synthetic-token'}};
 const uid=auth.currentUser.uid;
 function put(path,value) {docs.set(path,{name:database+'/'+path,updateTime:'v'+(++revision),fields:pack(value).mapValue.fields});}
 function data(path){return docs.has(path)?unpack({mapValue:{fields:docs.get(path).fields}}):null;}
 const project={id:'mundely_synthetic',ownerUid:uid,memberUids:[uid],sourceApp:'mundely',sourceEnvironment:'test',mundelyUid:'synthetic-mundely',mundelyTripId:'synthetic-trip',name:'Synthetic trip',activities:[{id:200,kind:'expense',amount:5,desc:'Share source',currency:'EUR',date:'2026-11-10'}],categories:[],deletedActivityIds:[],updatedAtMs:1,shareRevision:1};
 put('shareProjects/'+project.id,project);
 put('users/'+uid,{name:'Synthetic owner',email:'synthetic@example.invalid'});
 const expense={id:'synthetic-expense-sync',targetShareProjectId:project.id,targetShareActivityKey:'100',expenseId:'synthetic-expense',tripId:'synthetic-trip',amount:10,description:'Mundely source',currency:'EUR',category:'food',date:'2026-11-10',time:'12:00',deleted:false};
 const linked={mundelyUid:'synthetic-mundely',tripId:'synthetic-trip',targetShareProjectId:project.id,activeExpenseIds:['synthetic-expense'],categories:[]};
 const pending={tripSyncs:[],expenseSyncs:[expense],linkedTrips:[linked]};
 async function exchange(body) {
  bridgeCalls++;calls.push({kind:'bridge',action:body.action});
  if(body.action==='pull')return{linkRequests:[],...structuredClone(pending)};
  if(body.action==='convertCurrency')return{baseAmount:8,baseCurrency:'EUR',exchangeRate:0.8,exchangeRateSource:'synthetic',exchangeRateDate:'2026-11-10'};
  if(body.action==='ackExpense') {acks.push(structuredClone(body));if(body.syncStatus==='completed')pending.expenseSyncs=pending.expenseSyncs.filter(x=>x.id!==body.syncId);return{};}
  if(body.action==='ackTrip') {acks.push(structuredClone(body));if(body.syncStatus==='completed')pending.tripSyncs=pending.tripSyncs.filter(x=>x.id!==body.syncId);return{};}
  if(body.action==='reconcileShareExpenses') {reverse.push(structuredClone(body));return{removeShareActivityKeys:[]};}
  throw Error('unexpected action '+body.action);
 }
 const response=data=>({ok:true,environment:'test',targetProjectId:target,bridgeVersion:13,...data});
 const http={
  get:async options=>{
   calls.push({kind:'get',url:options.url,connectTimeout:options.connectTimeout,readTimeout:options.readTimeout});
   await control.beforeGet?.(options);
   if(control.denyGet)return{status:403,data:{error:{status:'PERMISSION_DENIED'}}};
   const path=decodeURIComponent(options.url.split('/documents/')[1].split('?')[0]);
   return docs.has(path)?{status:200,data:structuredClone(docs.get(path))}:{status:404,data:{error:{status:'NOT_FOUND'}}};
  },
  post:async options=>{
   if(options.url.includes('.cloudfunctions.net/')){bridgeOptions.push({action:options.data.action,readTimeout:options.readTimeout});const body=response(await exchange(options.data));if(control.loseBridgeAck&&options.data.action==='ackExpense'){control.loseBridgeAck=false;throw Error('synthetic ACK response lost');}return{status:200,data:body};}
   calls.push({kind:'commit',writes:structuredClone(options.data.writes),connectTimeout:options.connectTimeout,readTimeout:options.readTimeout});
   await control.beforePost?.(options);
   if(control.denyCommit)return{status:403,data:{error:{status:'PERMISSION_DENIED'}}};
   if(control.loseBeforeCommit){control.loseBeforeCommit=false;throw Error('synthetic network interruption');}
   if(control.conflictOnce||control.alwaysConflict){control.conflictOnce=false;return{status:409,data:{error:{status:'ABORTED'}}};}
   for(const write of options.data.writes) {
    const path=write.update.name.slice(database.length+1),existing=docs.get(path);
    if(write.currentDocument?.exists===false && existing)return{status:409,data:{error:{status:'ALREADY_EXISTS'}}};
    if(write.currentDocument?.updateTime!==undefined&&write.currentDocument.updateTime!==existing?.updateTime)return{status:409,data:{error:{status:'FAILED_PRECONDITION'}}};
   }
   const writeResults=[];
   for(const write of options.data.writes) {
    const path=write.update.name.slice(database.length+1),existing=docs.get(path);
    const fields=write.updateMask?{...existing.fields,...write.update.fields}:structuredClone(write.update.fields);
    const updateTime='v'+(++revision);
    docs.set(path,{name:write.update.name,fields,updateTime});writeResults.push({updateTime});
   }
   await control.afterPost?.(options);
   if(control.loseAfterCommit){control.loseAfterCommit=false;throw Error('synthetic response lost');}
   return{status:200,data:{writeResults}};
  }
 };
 const helper=load('firebase/shareActivityCommit.ts',{'@capacitor/core':{Capacitor:{getPlatform:()=>platform},CapacitorHttp:http}});
 const writer=load('data/singleFlightWrite.js',{});
 const sdk={
  doc:(_db,...parts)=>({path:parts.join('/'),id:parts.at(-1)}),
  getDoc:async ref=>{sdkCalls++;if(sdkPending)return new Promise(()=>{});return{exists:()=>docs.has(ref.path),data:()=>data(ref.path)};},
  setDoc:async(ref,value,options)=>{sdkCalls++;if(sdkPending)return new Promise(()=>{});put(ref.path,options?.merge?{...data(ref.path),...value}:value);},
  runTransaction:async(_db,callback)=>{sdkCalls++;if(sdkPending)return new Promise(()=>{});const writes=[];await callback({get:async ref=>({exists:()=>docs.has(ref.path),data:()=>data(ref.path)}),update:(ref,patch)=>writes.push([ref.path,patch])});for(const[path,patch]of writes)put(path,{...data(path),...patch});}
 };
 const window={dispatchEvent:event=>{events.push(event);return true;}};
 const bridge=load('integrations/mundelyBridge.ts',{
  'firebase/firestore':sdk,'../config/env':{appEnvironment:environment,firebaseConfig:{projectId:environment==='test'?target:'fainance-a7794'},functionsRegion:'europe-west1'},
  '../firebase/client':{fbAuth:auth,fbDb:{}},'../data/singleFlightWrite.js':writer,'../firebase/shareActivityCommit':helper,'@capacitor/core':{CapacitorHttp:http},
 },{window,fetch:async(_url,options)=>({ok:true,json:async()=>response(await exchange(JSON.parse(options.body)))})});
 const context=()=>({firebaseProjectId:environment==='test'?target:'fainance-a7794',projectId:project.id,uid,token:'synthetic-token',assertSession:()=>{if(auth.currentUser?.uid!==uid)throw Error('SESSION_CHANGED')}});
 return{helper,bridge,docs,data,put,control,auth,uid,project,expense,pending,calls,acks,reverse,events,bridgeOptions,context,sdkCalls:()=>sdkCalls,bridgeCalls:()=>bridgeCalls};
}
async function settledWithin(promise) {
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('bridge remained pending on the WebView SDK')),150)})]);}
 finally{clearTimeout(timer);}
}
test('native complete expense cycle bypasses a permanently pending full SDK and publishes confirmed projects',async()=>{
 const f=fixture({sdkPending:true});await settledWithin(f.bridge.syncMundelyBridgeNow());
 assert.equal(f.sdkCalls(),0);assert(f.acks.some(x=>x.action==='ackExpense'&&x.syncStatus==='completed'));
 assert(f.data('shareProjects/'+f.project.id).activities.some(x=>x.mundelyExpenseId===f.expense.expenseId));
 assert(f.reverse.some(x=>x.expenses.some(e=>e.activityKey==='200')));
 assert(f.events.some(x=>x.type==='fainance:share-project-committed'&&x.detail.project.activities.some(a=>a.mundelyExpenseId===f.expense.expenseId)));
 assert(f.calls.filter(x=>x.kind==='get'||x.kind==='commit').every(x=>x.connectTimeout===6000&&x.readTimeout===8000));
});
test('a queued new trip cannot block native expense work on a pending SDK',async()=>{
 const f=fixture({sdkPending:true});
 f.pending.tripSyncs=[{id:'new-trip-sync',tripId:'new-trip',mundelyUid:'synthetic-mundely',name:'New trip',targetShareProjectId:'mundely_new',syncMode:'create',status:'planning'}];
 await settledWithin(f.bridge.syncMundelyBridgeNow());
 assert.equal(f.sdkCalls(),0);assert(f.acks.some(x=>x.action==='ackTrip'&&x.syncStatus==='completed'));
 assert(f.acks.some(x=>x.action==='ackExpense'&&x.syncStatus==='completed'));
 assert.equal(f.data('shareProjects/mundely_new').ownerName,'Synthetic owner');
});
test('native trip create replay preserves existing activities, categories and participants',async()=>{
 const f=fixture();const old=f.data('shareProjects/'+f.project.id);old.participants=[{id:'kept',uid:f.uid}];old.memberUids.push('synthetic-peer');old.categories=[{id:'kept-category'}];f.put('shareProjects/'+f.project.id,old);
 const sync={id:'replayed',tripId:'synthetic-trip',mundelyUid:'synthetic-mundely',name:'Rename',targetShareProjectId:f.project.id,syncMode:'create'};
 await f.bridge.syncMundelyTripsToShare([sync]);
 const now=f.data('shareProjects/'+f.project.id);
 assert.deepEqual(now.activities,old.activities);assert.deepEqual(now.categories,old.categories);assert.deepEqual(now.participants,old.participants);assert.deepEqual(now.memberUids,old.memberUids);
 assert.equal(now.name,'Rename');
});
test('native create replay cannot take ownership from a member or relink another Mundely trip',async()=>{
 for(const patch of [{ownerUid:'other',memberUids:['other','synthetic-finance']},{mundelyUid:'other'},{mundelyTripId:'other-trip'},{sourceEnvironment:'production'}]){
  const f=fixture(),path='shareProjects/'+f.project.id;f.put(path,{...f.data(path),...patch});const before=structuredClone(f.docs.get(path));
  await f.bridge.syncMundelyTripsToShare([{id:'replay',tripId:'synthetic-trip',mundelyUid:'synthetic-mundely',name:'Attempt',targetShareProjectId:f.project.id,syncMode:'create'}]);
  assert.deepEqual(f.docs.get(path),before);assert.equal(f.acks[0].syncStatus,'error');assert.equal(f.events.length,0);
 }
});
test('only native currency conversion allows the verified three-provider timeout window',async()=>{
 const f=fixture();await f.bridge.syncMundelyExpensesToShare([{...f.expense,currency:'USD'}]);
 assert.equal(f.bridgeOptions.find(x=>x.action==='convertCurrency').readTimeout,15000);
 assert.equal(f.bridgeOptions.find(x=>x.action==='ackExpense').readTimeout,8000);
 assert.equal(f.acks[0].syncStatus,'completed');
});
test('native archive trip metadata remains supported and does not clear expenses',async()=>{
 const f=fixture();const before=f.data('shareProjects/'+f.project.id).activities;
 await f.bridge.syncMundelyTripsToShare([{id:'archive-sync',tripId:'synthetic-trip',mundelyUid:'synthetic-mundely',name:'Archive',targetShareProjectId:f.project.id,syncMode:'update',archived:true}]);
 const after=f.data('shareProjects/'+f.project.id);assert.equal(after.archived,true);assert.deepEqual(after.activities,before);
});
test('concurrent native polls remain one flight and coalesce into one fresh pass',async()=>{
 const f=fixture({sdkPending:true}),gate=deferred();let first=true;
 f.control.beforeGet=async()=>{if(first){first=false;await gate.promise;}};
 const a=f.bridge.syncMundelyBridgeNow();await tick();const b=f.bridge.syncMundelyBridgeNow();assert.equal(a,b);gate.resolve();await a;
 assert.equal(f.calls.filter(x=>x.kind==='bridge'&&x.action==='pull').length,2);
 assert.equal(f.data('shareProjects/'+f.project.id).activities.filter(x=>x.mundelyExpenseId===f.expense.expenseId).length,1);
});
test('Web and iOS Test retain their existing SDK transport',async()=>{
 for(const platform of ['web','ios']){const f=fixture({platform});await f.bridge.syncMundelyBridgeNow();assert(f.sdkCalls()>0);assert.equal(f.calls.filter(x=>x.kind==='get'||x.kind==='commit').length,0);assert.equal(f.events.length,0);}
});
test('Production and unauthenticated clients never use Test native requests',async()=>{
 const production=fixture({environment:'production'});await production.bridge.syncMundelyBridgeNow();assert.equal(production.calls.length,0);
 await assert.rejects(production.helper.readNativeShareProject(production.context()),/SHARE_NATIVE_TEST_ONLY/);
 const signedOut=fixture();signedOut.auth.currentUser=null;await signedOut.bridge.syncMundelyBridgeNow();assert.equal(signedOut.calls.length,0);
});
test('native CAS conflict re-reads the latest project and preserves a concurrent expense',async()=>{
 const f=fixture();let once=true;
 f.control.beforePost=()=>{if(once){once=false;const remote=f.data('shareProjects/'+f.project.id);remote.activities.push({id:300,kind:'expense',amount:7,desc:'Concurrent'});f.put('shareProjects/'+f.project.id,remote);}};
 await f.bridge.syncMundelyExpensesToShare([f.expense]);
 const activities=f.data('shareProjects/'+f.project.id).activities;assert(activities.some(x=>x.id===300));assert(activities.some(x=>x.id===100));
 assert.equal(f.calls.filter(x=>x.kind==='get').length,2);
});
test('unchanged wire timestamps survive category and expense updates',async()=>{
 const f=fixture(),doc=f.docs.get('shareProjects/'+f.project.id);
 doc.fields.activities.arrayValue.values[0].mapValue.fields.createdAt={timestampValue:'2026-10-01T10:00:00Z'};
 const before=structuredClone(doc.fields.activities.arrayValue.values[0]);
 await f.bridge.syncMundelyExpensesToShare([f.expense]);
 const kept=f.docs.get('shareProjects/'+f.project.id).fields.activities.arrayValue.values.find(x=>unpack(x).id===200);
 assert.deepEqual(kept,before);
});
test('lost native commit response keeps the item queued and retries by the same activity ID',async()=>{
 const f=fixture();f.control.loseAfterCommit=true;
 await f.bridge.syncMundelyExpensesToShare([f.expense]);
 assert.equal(f.acks.length,0);assert.equal(f.events.length,0);assert.equal(f.pending.expenseSyncs.length,1);
 await f.bridge.syncMundelyExpensesToShare([f.expense]);
 assert.equal(f.acks.length,1);assert.equal(f.acks[0].syncStatus,'completed');
 assert.equal(f.data('shareProjects/'+f.project.id).activities.filter(x=>x.id===100).length,1);
});
test('uncertain native ACK response is never followed by an error ACK',async()=>{
 const f=fixture();f.control.loseBridgeAck=true;await f.bridge.syncMundelyExpensesToShare([f.expense]);
 assert.equal(f.acks.length,1);assert.equal(f.acks[0].syncStatus,'completed');assert.equal(f.pending.expenseSyncs.length,0);
 assert.equal(f.data('shareProjects/'+f.project.id).activities.filter(x=>x.id===100).length,1);
});
test('lost native trip-create response is retried without erasing later Share edits',async()=>{
 const f=fixture(),trip={id:'new-trip-sync',tripId:'new-trip',mundelyUid:'synthetic-mundely',name:'New trip',targetShareProjectId:'mundely_new',syncMode:'create'};
 f.pending.tripSyncs=[trip];f.control.loseAfterCommit=true;await f.bridge.syncMundelyTripsToShare([trip]);assert.equal(f.acks.length,0);
 const remote=f.data('shareProjects/mundely_new');remote.activities=[{id:900,amount:5}];remote.participants.push({id:'peer'});f.put('shareProjects/mundely_new',remote);
 await f.bridge.syncMundelyTripsToShare([trip]);assert.equal(f.acks[0].syncStatus,'completed');
 assert.deepEqual(f.data('shareProjects/mundely_new').activities,remote.activities);assert.deepEqual(f.data('shareProjects/mundely_new').participants,remote.participants);
});
test('native interruption before commit never acknowledges or loses the queued expense',async()=>{
 const f=fixture();f.control.loseBeforeCommit=true;await f.bridge.syncMundelyExpensesToShare([f.expense]);
 assert.equal(f.acks.length,0);assert(!f.data('shareProjects/'+f.project.id).activities.some(x=>x.id===100));
 await f.bridge.syncMundelyExpensesToShare([f.expense]);assert.equal(f.acks[0].syncStatus,'completed');
});
test('native conflict exhaustion keeps the queue retryable and permission rejection cannot acknowledge success',async()=>{
 const retry=fixture();retry.control.alwaysConflict=true;await retry.bridge.syncMundelyExpensesToShare([retry.expense]);assert.equal(retry.acks.length,0);
 assert.equal(retry.calls.filter(x=>x.kind==='commit').length,3);
 const denied=fixture();denied.control.denyCommit=true;await denied.bridge.syncMundelyExpensesToShare([denied.expense]);assert.equal(denied.acks[0].syncStatus,'error');assert.equal(denied.events.length,0);assert.equal(denied.sdkCalls(),0);
});
test('account changes during native read or commit suppress later writes, ACKs and receipts',async()=>{
 const read=fixture();read.control.beforeGet=()=>{read.auth.currentUser={uid:'other'};};
 await read.bridge.syncMundelyExpensesToShare([read.expense]);assert.equal(read.calls.filter(x=>x.kind==='commit').length,0);assert.equal(read.acks.length,0);
 const commit=fixture();commit.control.afterPost=()=>{commit.auth.currentUser={uid:'other'};};
 await commit.bridge.syncMundelyExpensesToShare([commit.expense]);assert.equal(commit.acks.length,0);assert.equal(commit.events.length,0);
});
test('foreign project and wrong-document response are rejected before mutation',async()=>{
 const f=fixture();f.put('shareProjects/'+f.project.id,{...f.project,ownerUid:'other',memberUids:['other']});
 await assert.rejects(f.helper.updateNativeShareProject({...f.context(),apply:()=>({activities:[]})}),/SHARE_PROJECT_ACCESS_DENIED/);
 assert.equal(f.calls.filter(x=>x.kind==='commit').length,0);
 const wrong=fixture();wrong.docs.get('shareProjects/'+wrong.project.id).name=database+'/shareProjects/other';
 await assert.rejects(wrong.helper.readNativeShareProject(wrong.context()),/SHARE_PROJECT_READ_FAILED/);
});
test('native deletion and late echo keep durable tombstones and do not revive an activity',async()=>{
 const f=fixture();await f.bridge.syncMundelyExpensesToShare([f.expense]);await f.bridge.syncMundelyExpensesToShare([{...f.expense,deleted:true}]);await f.bridge.syncMundelyExpensesToShare([f.expense]);
 const value=f.data('shareProjects/'+f.project.id);assert(value.deletedActivityIds.includes('100'));assert(!value.activities.some(x=>x.id===100));
});
test('normal native activity save still commits private method atomically and preserves unrelated wire values',async()=>{
 const f=fixture();const doc=f.docs.get('shareProjects/'+f.project.id),before=structuredClone(doc.fields.activities.arrayValue.values[0]);
 const result=await f.helper.commitNativeShareActivity({projectId:f.project.id,activityId:'400',uid:f.uid,token:'synthetic-token',apply:remote=>({activities:[...remote.activities,{id:400,kind:'expense',amount:2}],updatedAtMs:400}),privateMethod:{key:'synthetic-method',data:{methodId:'synthetic'}}});
 assert(result.activities.some(x=>x.id===400));assert.equal(f.calls.find(x=>x.kind==='commit').writes.length,2);
 assert.deepEqual(f.docs.get('shareProjects/'+f.project.id).fields.activities.arrayValue.values[0],before);
 assert.equal(f.data('users/'+f.uid+'/shareCashMethods/synthetic-method').methodId,'synthetic');
});
function receiptFixture() {
 const text=fs.readFileSync(new URL('../src/app.tsx',import.meta.url),'utf8'),ast=ts.createSourceFile('app.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const names=['applyCommittedShareProject','acceptMundelyShareProjectCommit','shareProjectStamp','preferShareProject','shareParticipantKey','shareActivityKey','mergeShareRecordArrays','mergeShareProjectDeep','mergeShareProjectArrays'];
 const found={};function visit(n){if(ts.isFunctionDeclaration(n)&&names.includes(n.name?.text))found[n.name.text]=n.getText(ast);ts.forEachChild(n,visit);}visit(ast);assert.equal(Object.keys(found).length,names.length);
 const uid='synthetic-finance',ref={current:[]},receipts={current:{uid,projects:new Map()}},auth={currentUser:{uid}};
 let cloud={uid,projects:[]};const tombstones=new Set();
 const deps={userId:uid,fbAuth:auth,fbDb:{app:{options:{projectId:target}}},useNativeShareCommit:project=>project===target,shareProjectsRef:ref,shareCashReceipts:receipts,
  setShareCashCloud:fn=>{cloud=fn(cloud);},setShareProjects:fn=>{ref.current=fn(ref.current);},latestShareProjectTombstones:()=>tombstones,
  filterShareProjectsByTombstones:(rows,dead)=>rows.filter(row=>!dead.has(row.id)),normalizeEmail:x=>x,normalizePhoneForLookup:x=>x,syncRecordTime:x=>Number(x?.updatedAtMs)||Date.parse(x?.updatedAt||x?.createdAt||'')||0};
 const code=ts.transpileModule(Object.values(found).join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2020,module:ts.ModuleKind.None}}).outputText;
 const api=new Function(...Object.keys(deps),code+';return {applyCommittedShareProject,acceptMundelyShareProjectCommit};')(...Object.values(deps));
 return{api,uid,auth,ref,receipts,cloud:()=>cloud,tombstones};
}
test('confirmed native bridge receipt updates visible Share data without any Firestore listener',()=>{
 const f=receiptFixture(),project={id:'mundely_synthetic',ownerUid:f.uid,memberUids:[f.uid],sourceApp:'mundely',sourceEnvironment:'test',mundelyTripId:'synthetic-trip',activities:[{id:1,amount:7,updatedAtMs:10}],updatedAtMs:10};
 f.ref.current=[{...project,activities:[],updatedAtMs:1}];
 f.api.acceptMundelyShareProjectCommit({detail:{uid:f.uid,project}});
 assert.equal(f.ref.current[0].activities.length,1);assert.equal(f.cloud().projects[0].activities.length,1);
 f.api.acceptMundelyShareProjectCommit({detail:{uid:f.uid,project}});assert.equal(f.ref.current[0].activities.length,1);
});
test('native receipts ignore stale accounts, foreign projects, unknown non-linked projects and tombstones',()=>{
 const f=receiptFixture(),base={id:'unknown',ownerUid:f.uid,activities:[{id:1}],updatedAtMs:10};
 f.api.acceptMundelyShareProjectCommit({detail:{uid:f.uid,project:base}});assert.equal(f.ref.current.length,0);
 const linked={...base,id:'mundely_new',sourceApp:'mundely',sourceEnvironment:'test',mundelyTripId:'new'};
 f.api.acceptMundelyShareProjectCommit({detail:{uid:'other',project:linked}});assert.equal(f.ref.current.length,0);
 f.api.acceptMundelyShareProjectCommit({detail:{uid:f.uid,project:{...linked,ownerUid:'other',memberUids:['other']}}});assert.equal(f.ref.current.length,0);
 f.tombstones.add(linked.id);f.api.acceptMundelyShareProjectCommit({detail:{uid:f.uid,project:linked}});assert.equal(f.ref.current.length,0);
 f.tombstones.clear();f.api.acceptMundelyShareProjectCommit({detail:{uid:f.uid,project:linked}});assert.equal(f.ref.current.length,1);assert.equal(f.cloud().projects.length,1);
 f.auth.currentUser={uid:'other'};f.api.acceptMundelyShareProjectCommit({detail:{uid:f.uid,project:{...linked,activities:[{id:2}],updatedAtMs:20}}});assert.equal(f.ref.current[0].activities[0].id,1);
});
