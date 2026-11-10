import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url), ts=require('typescript');
const sourceRoot=process.env.FAINANCE_DELETE_SOURCE_ROOT||fileURLToPath(new URL('../src/',import.meta.url));
const supportRoot=process.env.FAINANCE_DELETE_SUPPORT_ROOT||sourceRoot;
const target='fainance-test-20260823195207';
const database=`projects/${target}/databases/(default)/documents`;
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return{promise,resolve,reject}};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function load(file,deps,globals={}) {
 const source=fs.readFileSync(path.join(file==='integrations/mundelyBridge.ts'?sourceRoot:supportRoot,file),'utf8');
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
 const docs=new Map(),calls=[],events=[],acks=[],reverse=[],bridgeOptions=[],mundelyRows=new Map();
 let revision=0,sdkCalls=0,bridgeCalls=0;
 const control={beforeGet:null,beforePost:null,afterPost:null,denyGet:false,denyCommit:false,loseAfterCommit:false,loseBeforeCommit:false,conflictOnce:false,alwaysConflict:false,loseBridgeAck:false,beforeExchange:null,rejectReverse:null,eventRefresh:false};
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
 mundelyRows.set(project.id,new Set(['100','200']));
 async function exchange(body) {
  bridgeCalls++;calls.push({kind:'bridge',action:body.action});
  await control.beforeExchange?.(body);
  if(body.action==='pull')return{linkRequests:[],...structuredClone(pending)};
  if(body.action==='convertCurrency')return{baseAmount:8,baseCurrency:'EUR',exchangeRate:0.8,exchangeRateSource:'synthetic',exchangeRateDate:'2026-11-10'};
  if(body.action==='ackExpense') {acks.push(structuredClone(body));if(body.syncStatus==='completed')pending.expenseSyncs=pending.expenseSyncs.filter(x=>x.id!==body.syncId);return{};}
  if(body.action==='ackTrip') {acks.push(structuredClone(body));if(body.syncStatus==='completed')pending.tripSyncs=pending.tripSyncs.filter(x=>x.id!==body.syncId);return{};}
  if(body.action==='reconcileShareExpenses') {reverse.push(structuredClone(body));mundelyRows.set(body.targetShareProjectId,new Set(body.expenses.map(x=>x.activityKey).filter(key=>!body.deletedActivityKeys.includes(key))));return{removeShareActivityKeys:[]};}
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
   if(options.url.includes('.cloudfunctions.net/')&&options.data.action==='reconcileShareExpenses'&&control.rejectReverse)return{status:400,data:{ok:false,error:control.rejectReverse}};
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
 return{helper,bridge,docs,data,put,control,auth,uid,project,expense,pending,calls,acks,reverse,events,bridgeOptions,context,mundelyRows,linked,sdkCalls:()=>sdkCalls,bridgeCalls:()=>bridgeCalls};
}
async function settledWithin(promise) {
 let timer;
 try{return await Promise.race([promise,new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('bridge remained pending on the WebView SDK')),1000)})]);}
 finally{clearTimeout(timer);}
}

function sourceBetween(file,start,end) {
 const source=fs.readFileSync(file,'utf8'),from=source.indexOf(start),to=source.indexOf(end,from+start.length);
 assert(from>=0&&to>from,'real caller anchors in '+file);return source.slice(from,to);
}
function uiDelete(f,{projectId=f.project.id,refresh=false}={}) {
 const app=sourceBetween(path.join(sourceRoot,'app.tsx'),'  async function updatePersistedShareActivity(','  function shareCurrentParticipant(');
 const panel=path.join(supportRoot,'sections/SharePanel.tsx');
 const persist=sourceBetween(panel,'  async function persistShareActivityEdit(','  function addSharedActivity(');
 const remove=sourceBetween(panel,'  async function deleteActivity(','  function balances(');
 const compiled=ts.transpileModule(app+persist+remove,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
 const state={visible:{...f.data('shareProjects/'+projectId),id:projectId},toasts:[],events:[],refreshes:[]};
 const deps={...f.helper,...f.bridge,selected:state.visible,userId:f.uid,fbAuth:f.auth,
  fbDb:{app:{options:{projectId:target}}},shareProjectsRef:{current:[state.visible]},
  doc:(_db,...parts)=>({path:parts.join('/'),id:parts.at(-1)}),
  shareProjectStamp:p=>Number(p?.updatedAtMs||0),syncRecordTime:a=>Number(a?.syncUpdatedAtMs||0),
  applyCommittedShareProject:(_uid,_pid,p)=>{state.visible=p;},
  window:{confirm:()=>true,dispatchEvent:e=>{state.events.push(e.type);if(refresh)state.refreshes.push(f.bridge.syncMundelyBridgeNow().catch(()=>{}));}},
  CustomEvent:class{constructor(type){this.type=type;}},shareMutationInFlight:{current:false},
  setToast:v=>state.toasts.push(v),L:x=>x,setShareReceiptUploads:fn=>fn([]),
  runTransaction:()=>{throw Error('SDK_REACHED');},sanitizeShareCloudValue:x=>x,
 };
 return {...state,state,...new Function('deps',`with(deps){${compiled};return {deleteActivity};}`)(deps)};
}
function twoRows(f) {
 const project=f.data('shareProjects/'+f.project.id);
 project.activities.push({id:100,kind:'expense',amount:10,desc:'Mundely source',currency:'EUR',date:'2026-11-10',sourceApp:'mundely',mundelyTripId:f.linked.tripId,mundelyExpenseId:'synthetic-expense'});
 f.put('shareProjects/'+f.project.id,project);f.pending.expenseSyncs=[];
 return project;
}
function commitTombstone(f,keys) {
 const p=f.data('shareProjects/'+f.project.id);
 p.activities=p.activities.filter(x=>!keys.includes(String(x.id)));
 p.deletedActivityIds=[...new Set([...(p.deletedActivityIds||[]),...keys])];
 f.put('shareProjects/'+p.id,p);return p;
}
function earlierTrip(f) {
 const p={...structuredClone(f.project),id:'mundely_earlier',mundelyTripId:'earlier-trip',activities:[]};
 f.put('shareProjects/'+p.id,p);
 const linked={...f.linked,tripId:p.mundelyTripId,targetShareProjectId:p.id,activeExpenseIds:[]};
 f.pending.linkedTrips=[linked,f.linked];return linked;
}

for(const [origin,id] of [['Share',200],['Mundely',100]]) {
 test('confirmed '+origin+' deletion waits for its reverse confirmation before reporting success',async()=>{
  const f=fixture({sdkPending:true});twoRows(f);
  const entered=deferred(),release=deferred();
  f.control.beforeExchange=async body=>{if(body.action==='reconcileShareExpenses'&&body.targetShareProjectId===f.project.id){entered.resolve();await release.promise;}};
  const ui=uiDelete(f,{refresh:true});let done=false;
  const deletion=ui.deleteActivity(id).then(()=>{done=true;});
  try {
   await settledWithin(entered.promise);await tick();
   assert.equal(done,false,'UI deletion completed before Mundely acknowledged it');
   assert(f.data('shareProjects/'+f.project.id).deletedActivityIds.includes(String(id)));
   assert(f.mundelyRows.get(f.project.id).has(String(id)));
  } finally {release.resolve();await deletion;await Promise.all(ui.state.refreshes);}
  assert(!f.mundelyRows.get(f.project.id).has(String(id)));
  assert(ui.state.toasts.includes('Spesa Share eliminata'));
 });
}

test('unrelated stalled fullcycle cannot delay a confirmed deletion in the current trip',async()=>{
 const f=fixture({sdkPending:true});twoRows(f);const earlier=earlierTrip(f);
 const entered=deferred(),release=deferred();
 f.control.beforeExchange=async body=>{if(body.action==='reconcileShareExpenses'&&body.targetShareProjectId===earlier.targetShareProjectId){entered.resolve();await release.promise;}};
 const cycle=f.bridge.syncMundelyBridgeNow();await settledWithin(entered.promise);
 const ui=uiDelete(f,{refresh:true});
 try {
  await settledWithin(ui.deleteActivity(200));
  assert(!f.mundelyRows.get(f.project.id).has('200'),'deleted Share row still visible in Mundely while unrelated trip is pending');
 } finally {release.resolve();await cycle;await Promise.all(ui.state.refreshes);}
 assert.equal(f.sdkCalls(),0);
});

test('unrelated failed fullcycle cannot prevent the direct confirmed deletion',async()=>{
 const f=fixture();twoRows(f);const earlier=earlierTrip(f);
 f.control.beforeExchange=async body=>{if(body.action==='reconcileShareExpenses'&&body.targetShareProjectId===earlier.targetShareProjectId)throw Error('synthetic unrelated timeout');};
 await assert.rejects(f.bridge.syncMundelyBridgeNow());
 const ui=uiDelete(f,{refresh:true});await ui.deleteActivity(100);await Promise.all(ui.state.refreshes);
 assert(!f.mundelyRows.get(f.project.id).has('100'));
});

test('deleting the last Share expense confirms an empty Mundely result',async()=>{
 const f=fixture();f.pending.expenseSyncs=[];f.mundelyRows.set(f.project.id,new Set(['200']));
 const ui=uiDelete(f);await ui.deleteActivity(200);
 assert.equal(f.mundelyRows.get(f.project.id).size,0);
 assert.deepEqual(f.reverse[0].expenses,[]);assert.deepEqual(f.reverse[0].deletedActivityKeys,['200']);
});

test('an older reverse for the same project completes before the fresh deletion read',async()=>{
 const f=fixture();twoRows(f);const entered=deferred(),release=deferred();let first=true;
 f.control.beforeExchange=async body=>{if(body.action==='reconcileShareExpenses'&&first){first=false;entered.resolve();await release.promise;}};
 const older=f.bridge.reconcileFainanceShareExpensesToMundely([f.linked]);await settledWithin(entered.promise);
 const ui=uiDelete(f);let done=false;const deletion=ui.deleteActivity(200).then(()=>{done=true;});
 await tick();assert.equal(done,false);assert.equal(f.reverse.length,0);
 release.resolve();await older;await deletion;
 assert.equal(f.reverse.length,2);assert(f.reverse[0].expenses.some(x=>x.activityKey==='200'));
 assert(!f.reverse[1].expenses.some(x=>x.activityKey==='200'));assert(!f.mundelyRows.get(f.project.id).has('200'));
 await f.bridge.reconcileFainanceShareExpensesToMundely([f.linked]);assert(!f.mundelyRows.get(f.project.id).has('200'));
});

test('consecutive same-project deletions enqueue fresh reads instead of sharing an obsolete promise',async()=>{
 const f=fixture();twoRows(f);let first=true;const entered=deferred(),release=deferred();
 f.control.beforeExchange=async body=>{if(body.action==='reconcileShareExpenses'&&first){first=false;entered.resolve();await release.promise;}};
 const a=f.bridge.syncMundelyShareDeletionToMundely(commitTombstone(f,['100']),'100');await settledWithin(entered.promise);
 const b=f.bridge.syncMundelyShareDeletionToMundely(commitTombstone(f,['200']),'200');assert.notEqual(a,b);
 release.resolve();await a;await b;assert.equal(f.mundelyRows.get(f.project.id).size,0);
 assert.deepEqual(new Set(f.reverse.at(-1).deletedActivityKeys),new Set(['100','200']));
});

test('reverse failure preserves the confirmed Share deletion, emits retry event and shows existing error',async()=>{
 const f=fixture();twoRows(f);f.control.rejectReverse='SHARE_RECONCILE_WORKSPACE_RACE';
 const ui=uiDelete(f);await ui.deleteActivity(200);
 assert(f.data('shareProjects/'+f.project.id).deletedActivityIds.includes('200'));
 assert(!ui.state.visible.activities.some(x=>x.id===200));
 assert(ui.state.events.includes('fainance:share-mutated'));
 assert(ui.state.toasts.some(x=>x?.type==='error'));assert(!ui.state.toasts.includes('Spesa Share eliminata'));
 f.control.rejectReverse=null;await f.bridge.syncMundelyShareDeletionToMundely(ui.state.visible,'200');
 assert(!f.mundelyRows.get(f.project.id).has('200'));
});

test('failed direct reads are not silently reported as completed and a retry is unpoisoned',async()=>{
 for(const mode of ['denied','missing','mismatch','lost-tombstone']){
  const f=fixture();const committed=commitTombstone(f,['200']);
  if(mode==='denied')f.control.denyGet=true;
  if(mode==='missing')f.docs.delete('shareProjects/'+f.project.id);
  if(mode==='mismatch')f.put('shareProjects/'+f.project.id,{...committed,mundelyTripId:'different-trip'});
  if(mode==='lost-tombstone')f.put('shareProjects/'+f.project.id,{...committed,deletedActivityIds:[]});
  await assert.rejects(f.bridge.syncMundelyShareDeletionToMundely(committed,'200'));assert.equal(f.reverse.length,0);
  f.control.denyGet=false;f.put('shareProjects/'+f.project.id,committed);
  await f.bridge.syncMundelyShareDeletionToMundely(committed,'200');assert.equal(f.reverse.length,1);
 }
});

test('account change while a deletion waits rejects the old UID without a new-account request',async()=>{
 const f=fixture();twoRows(f);let first=true;const entered=deferred(),release=deferred();
 f.control.beforeExchange=async body=>{if(body.action==='reconcileShareExpenses'&&first){first=false;entered.resolve();await release.promise;}};
 const older=f.bridge.reconcileFainanceShareExpensesToMundely([f.linked]);const oldObserved=older.catch(e=>e);
 await settledWithin(entered.promise);const queued=f.bridge.syncMundelyShareDeletionToMundely(commitTombstone(f,['200']),'200');
 const queuedObserved=queued.catch(e=>e);
 f.auth.currentUser={uid:'other-synthetic',getIdToken:async()=>'other-token'};release.resolve();
 assert(await oldObserved instanceof Error);assert(await queuedObserved instanceof Error);assert.equal(f.reverse.length,1);
 f.auth.currentUser={uid:f.uid,getIdToken:async()=>'synthetic-token'};
 await f.bridge.syncMundelyShareDeletionToMundely(f.data('shareProjects/'+f.project.id),'200');assert(!f.mundelyRows.get(f.project.id).has('200'));
});

test('account change after a fresh Share read prevents the reverse POST',async()=>{
 const f=fixture();const committed=commitTombstone(f,['200']);
 f.control.beforeGet=async()=>{f.auth.currentUser={uid:'other-synthetic',getIdToken:async()=>'other-token'};};
 await assert.rejects(f.bridge.syncMundelyShareDeletionToMundely(committed,'200'));assert.equal(f.reverse.length,0);
});

test('normal projects, unlinked metadata, additions, edits, other users and non-Android-Test are no-ops',async()=>{
 for(const options of [{environment:'production'},{platform:'ios'},{platform:'web'}]){
  const f=fixture(options);await f.bridge.syncMundelyShareDeletionToMundely(commitTombstone(f,['200']),'200');assert.equal(f.calls.length,0);
 }
 for(const patch of [{sourceApp:'fainance'},{sourceEnvironment:'production'},{id:'normal-share'},{mundelyUid:''},{mundelyTripId:''},{ownerUid:'other',memberUids:['other']},{deletedActivityIds:[]},{activities:[{id:200,kind:'expense',amount:5}]}]){
  const f=fixture();const p={...commitTombstone(f,['200']),...patch};await f.bridge.syncMundelyShareDeletionToMundely(p,'200');assert.equal(f.calls.length,0);
 }
 const f=fixture();f.auth.currentUser=null;await f.bridge.syncMundelyShareDeletionToMundely(commitTombstone(f,['200']),'200');assert.equal(f.calls.length,0);
});

test('the existing backend archive rejection remains an error and leaves Mundely read-only',async()=>{
 const f=fixture();const committed={...commitTombstone(f,['200']),archived:true};f.put('shareProjects/'+f.project.id,committed);
 f.control.rejectReverse='ARCHIVED_TRIP_READ_ONLY';const before=new Set(f.mundelyRows.get(f.project.id));
 await assert.rejects(f.bridge.syncMundelyShareDeletionToMundely(committed,'200'),/ARCHIVED_TRIP_READ_ONLY/);
 assert.deepEqual(f.mundelyRows.get(f.project.id),before);
});
