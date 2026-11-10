'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {plan,identity}=require('../functions/growthCreationEvidence.cjs'),engine=require('../functions/financeMetricsEngine.cjs'),gateway=require('../functions/growthMetricsTestGateway.cjs');
const families=['goals','rules','budgetVersions','budgetOverrides'];
const empty=()=>({goals:[],alerts:[],shareProjects:[],baseCurrency:'EUR',financeEvolution:{rules:[],budget:{standardVersions:[],overrides:{}}}});
const stock={goals:0,rules:0,budgetVersions:0,budgetOverrides:0};
const intent=(id='new')=>({family:'goals',entityId:id,nonce:crypto.randomUUID()});
const legacy=()=>({schema:'first-server-confirmation-v1',seen:[],tokens:[],numericExportAllowed:false,wholeAppPopulationQualified:false});

test('missing goals cannot be baselined by an otherwise valid rules source',()=>{
 const state=empty();delete state.goals;
 const first=plan({state,stock:{...stock,goals:null}});
 assert.equal(first.qualification.status,'PARTIAL_SOURCE');assert.ok(!first.registry.baselinedFamilies.includes('goals'));
 state.goals=[{id:'old_import'}];const p=intent('old_import');
 const restored=plan({state,stock:{...stock,goals:1},registry:first.registry,intents:[p]});
 assert.equal(restored.events.length,0);assert.deepEqual(restored.acknowledged,[p.nonce]);
 assert.ok(restored.registry.baselinedFamilies.includes('goals'));
 state.goals.push({id:'actually_new'});
 assert.equal(plan({state,stock:{...stock,goals:2},registry:restored.registry,intents:[intent('actually_new')]}).events.length,1);
});
test('legacy registry preserves seen identities but does not invent missing baselines',()=>{
 const state=empty();state.goals=[{id:'existing'}];const reg=legacy();reg.seen=[identity('goals','removed')];const before=JSON.stringify(reg);
 const result=plan({state,stock:{...stock,goals:1},registry:reg,intents:[intent('existing')]});
 assert.equal(result.events.length,0);assert.equal(result.registry.seen.length,2);assert.equal(JSON.stringify(reg),before);
});
test('initial baseline acknowledges present intents without manufacturing first-use events',()=>{
 const state=empty();state.goals=[{id:'new'}];const p=intent(),missing=intent('not_saved');
 const result=plan({state,stock:{...stock,goals:1},intents:[p,missing]});
 assert.equal(result.events.length,0);assert.deepEqual(result.acknowledged,[p.nonce]);
});
test('a qualified zero baseline permits the first true creation and rejects replay/restore',()=>{
 const state=empty(),first=plan({state,stock});state.goals=[{id:'new',name:'PRIVATE_GOAL'}];const p=intent();
 const next=plan({state,stock:{...stock,goals:1},registry:first.registry,intents:[p]});
 assert.equal(next.events.length,1);assert.equal(JSON.stringify(next).includes('PRIVATE_GOAL'),false);
 const removed=plan({state:empty(),stock,registry:next.registry});
 assert.equal(plan({state,stock:{...stock,goals:1},registry:removed.registry,intents:[p]}).events.length,0);
});
test('broken registry cannot silently reset the deduplication history',()=>{
 const bad=[{}, {...legacy(),seen:'broken'}, {...legacy(),tokens:[null]}, {...legacy(),seen:['not-a-hash']}, {...legacy(),baselinedFamilies:['unknown']}, {...legacy(),baselinedFamilies:['goals','goals']}];
 for(const registry of bad)assert.throws(()=>plan({state:empty(),stock,registry}),/CREATION_REGISTRY_INVALID/);
});
test('full registry still permits replay but rejects genuinely new capacity atomically',()=>{
 const state=empty();state.goals=Array.from({length:2000},(_,i)=>({id:'g'+i}));
 const first=plan({state,stock:{...stock,goals:2000}}),before=JSON.stringify(first.registry);
 assert.equal(plan({state,stock:{...stock,goals:2000},registry:first.registry,intents:[intent('g0')]}).events.length,0);
 state.goals.push({id:'overflow'});assert.throws(()=>plan({state,stock:{...stock,goals:2001},registry:first.registry,intents:[intent('overflow')]}),/CREATION_REGISTRY_CAPACITY/);
 assert.equal(JSON.stringify(first.registry),before);
});

function fakeDb(registry,state=empty()){
 const db={projectId:gateway.TEST_PROJECT},values=new Map([['users/owner',{deletionStatus:'active'}],['userData/owner',state],['users/owner/syncMeta/movementsV2Clean',{schemaVersion:2,state:'enabled-clean'}]]),writes=[];
 if(registry!==undefined)values.set('users/owner/growthMetrics/creationRegistry',registry);
 const timestamp={seconds:100,nanoseconds:0,toDate:()=>new Date(100000)},revisions=new Map();
 db.doc=path=>({path,collection:name=>db.collection(path+'/'+name)});db.collection=path=>({path,doc:name=>db.doc(path+'/'+name)});
 db.runTransaction=async fn=>fn({get:async ref=>ref.path.endsWith('/movementsV2')?{docs:[]}:{exists:values.has(ref.path),ref,updateTime:revisions.get(ref.path)||timestamp,readTime:timestamp,data:()=>values.get(ref.path)},set:(ref,v)=>{writes.push(ref.path);values.set(ref.path,v)},create:(ref,v)=>{assert.ok(!values.has(ref.path));writes.push(ref.path);values.set(ref.path,v)}});
 return{db,values,writes,timestamp,revisions};
}
const scope=()=>({uid:'owner',authenticatedUid:'owner',accountAuthority:{source:'FIREBASE_AUTH_SERVER',uid:'owner',disabled:false,checkedAt:Date.now()}});
test('failed ledger reports N/D while preserving stock, registry, intents and source',async()=>{
 const reg={...legacy(),seen:['bad']},h=fakeDb(reg),before=JSON.stringify(reg),p=intent();
 const result=await engine.refresh(h.db,{...scope(),creationIntents:[p]},{serverTimestamp:()=>h.timestamp});
 assert.equal(result.creationQualification.status,'N_D');assert.equal(result.creationQualification.reason,'CREATION_REGISTRY_INVALID');assert.deepEqual(result.acknowledgedCreationNonces,[]);
 assert.equal(JSON.stringify(h.values.get('users/owner/growthMetrics/creationRegistry')),before);
 assert.deepEqual(h.writes,['users/owner/growthMetrics/current']);
 const view=await engine.read(h.db,scope());assert.equal(view.available,true);assert.equal(view.numericExportAllowed,false);
 assert.equal(view.metrics.find(x=>x.id==='a10_goals').readings[0].value,0);
});
test('ledger capacity failure is also visible when stock has not changed',async()=>{
 const h=fakeDb();await engine.refresh(h.db,scope(),{serverTimestamp:()=>h.timestamp});
 h.values.set('users/owner/growthMetrics/creationRegistry',{...legacy(),baselinedFamilies:families,tokens:Array.from({length:2001},(_,i)=>crypto.createHash('sha256').update(String(i)).digest('hex'))});
 const result=await engine.refresh(h.db,scope(),{serverTimestamp:()=>h.timestamp});
 assert.equal(result.changed,false);assert.equal(result.creationQualification.reason,'CREATION_REGISTRY_CAPACITY');
});
test('unknown source exceptions are sanitized and never acknowledged',async()=>{
 const h=fakeDb(undefined,{accountDataCompressedV5:'PRIVATE_INVALID_VALUE',accountDataCompressionV5:'bad'});
 const result=await engine.refresh(h.db,scope(),{serverTimestamp:()=>h.timestamp});
 assert.equal(result.creationQualification.reason,'CREATION_SOURCE_UNQUALIFIED');assert.equal(JSON.stringify(result).includes('PRIVATE_INVALID_VALUE'),false);assert.deepEqual(result.acknowledgedCreationNonces,[]);
});
class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
test('authenticated gateway exposes distinct ledger outcome without changing stock availability',async()=>{
 const h=fakeDb({...legacy(),seen:['bad']});
 const handle=gateway.createHandler({db:h.db,engine,serverTimestamp:()=>h.timestamp,HttpsError,getUser:async uid=>({uid,disabled:false,tokensValidAfterTime:'1970-01-01T00:00:00Z'})});
 const auth={uid:'owner',token:{auth_time:Math.floor(Date.now()/1000)}};
 const result=await handle({auth,data:{operation:'refresh'}});assert.equal(result.available,true);assert.equal(result.creationQualification.status,'N_D');assert.equal(result.numericExportAllowed,false);
 const read=await handle({auth,data:{operation:'read'}});assert.equal(read.creationQualification.reason,'CREATION_CHECK_NOT_REQUESTED');
 await assert.rejects(handle({auth,data:{operation:'refresh',creationQualification:{status:'QUALIFIED_SOURCE'}}}),e=>e.code==='invalid-argument');
});
test('Production and other owners remain excluded before source operations',()=>{
 assert.throws(()=>engine.guard({projectId:'fainance-a7794'},'owner','owner'),/TEST_ONLY/);
 assert.throws(()=>engine.guard({projectId:gateway.TEST_PROJECT},'owner','other'),/OWNER/);
});

test('a legacy Test refresh without capture-completeness proof is N/D and cannot later self-heal',async()=>{
 const h=fakeDb(),owner=scope(),ts=()=>h.timestamp;
 const first=await engine.refresh(h.db,owner,{serverTimestamp:ts});
 assert.equal(first.creationQualification.status,'N_D');
 assert.equal(first.creationQualification.reason,'CREATION_CAPTURE_INCOMPLETE');
 assert.equal(first.creationQualification.captureComplete,false);
 assert.equal(first.creationQualification.numericExportAllowed,false);
 const registry=h.values.get('users/owner/growthMetrics/creationRegistry');
 assert.equal(registry.captureIncomplete,true);
 assert.equal(registry.numericExportAllowed,false);
 const later=await engine.refresh(h.db,{...scope(),creationCaptureComplete:true},{serverTimestamp:ts});
 assert.equal(later.changed,false);
 assert.equal(later.creationQualification.status,'N_D');
 assert.equal(later.creationQualification.captureComplete,false);
 assert.equal(h.values.get('users/owner/growthMetrics/creationRegistry').captureIncomplete,true);
});
test('an explicitly complete Test first refresh can qualify source without authorizing numeric publication',async()=>{
 const h=fakeDb(),ts=()=>h.timestamp;
 const first=await engine.refresh(h.db,{...scope(),creationCaptureComplete:true},{serverTimestamp:ts});
 assert.equal(first.creationQualification.status,'QUALIFIED_SOURCE');
 assert.equal(first.creationQualification.captureComplete,true);
 assert.equal(first.creationQualification.numericExportAllowed,false);
 const registry=h.values.get('users/owner/growthMetrics/creationRegistry');
 assert.equal(registry.captureIncomplete,false);
 assert.equal(registry.wholeAppPopulationQualified,false);
 const view=await engine.read(h.db,scope());
 assert.equal(view.available,true);
 assert.equal(view.numericExportAllowed,false);
});

test('A09.04 lifecycle: deleted or ineligible owner cannot refresh or read metrics, with zero writes',async()=>{
 const scenarios=[
  h=>h.values.set('users/owner',{deletionStatus:'pending'}),
  h=>h.values.set('accountDeletionRequests/owner',{status:'requested'}),
  (h,a)=>a.accountAuthority.disabled=true,
  (h,a)=>a.accountAuthority.checkedAt=Date.now()-61000,
  (h,a)=>a.accountAuthority.uid='different-user'
 ];
 for(const setup of scenarios){
  const h=fakeDb(),s=scope();setup(h,s);
  await assert.rejects(engine.refresh(h.db,{...s,creationCaptureComplete:true},{serverTimestamp:()=>h.timestamp}),/ACCOUNT_NOT_ELIGIBLE/);
  assert.deepEqual(h.writes,[]);
  const view=await engine.read(h.db,s);
  assert.equal(view.available,false);
  assert.equal(view.reason,'ACCOUNT_NOT_ELIGIBLE');
  assert.deepEqual(view.metrics,[]);
 }
});
test('A09.04 migrated legacy cloud identities must exist in V2 even with completion marker',()=>{
 const uid='owner',accountData={...empty(),expenses:[{id:'old',amount:13}],incomes:[]};
 const syncMeta={schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:1000};
 const missing=engine.derive({uid,accountData,syncMeta,records:[]});
 assert.equal(missing.movements,null);
 assert.ok(missing.reasons.includes('LEGACY_MIGRATION_INCOMPLETE'));
 const row={schemaVersion:2,uid,kind:'expense',recordId:'expense:old',deleted:false,updatedAtMs:1,payload:{baseCurrency:'EUR',baseAmount:13}};
 const present=engine.derive({uid,accountData,syncMeta,records:[row]});
 assert.equal(present.movements?.expenseCount,1);
 const deleted=engine.derive({uid,accountData,syncMeta,records:[{...row,deleted:true,payload:null}]});
 assert.equal(deleted.movements?.expenseCount,0);
 assert.equal(deleted.reasons.includes('LEGACY_MIGRATION_INCOMPLETE'),false);
 const malformed=engine.derive({uid,accountData:{...empty(),expenses:'invalid'},syncMeta,records:[row]});
 assert.ok(malformed.reasons.includes('LEGACY_SOURCE_UNQUALIFIED'));
});
test('A09.04 legacy movements without IDs use the exact V2 deterministic identity',()=>{
 const uid='owner',legacy={date:'2026-11-06',amount:10,description:'legacy-no-id'};
 const accountData={...empty(),expenses:[legacy],incomes:[]};
 const syncMeta={schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:1000};
 const row={schemaVersion:2,uid,kind:'expense',recordId:'expense:legacy_1a4yn8m',deleted:false,updatedAtMs:1,payload:{baseCurrency:'EUR',baseAmount:10}};
 const present=engine.derive({uid,accountData,syncMeta,records:[row]});
 assert.equal(present.movements?.expenseCount,1);
 const mismatch=engine.derive({uid,accountData,syncMeta,records:[{...row,recordId:'expense:other'}]});
 assert.ok(mismatch.reasons.includes('LEGACY_MIGRATION_INCOMPLETE'));
});
test('A09.04 explicit cloud tombstones cannot be absent, stale or resurrected in V2',()=>{
 const uid='owner',marker={schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:4000};
 const state={...empty(),expenses:[],incomes:[],accountDeletedRecords:{
  'expense:old':{deletedAt:3000,source:'user',explicit:true},
  'goal:unrelated':{deletedAt:999999,source:'user',explicit:true}
 }};
 const active={schemaVersion:2,uid,kind:'expense',recordId:'expense:old',deleted:false,updatedAtMs:3000,payload:{baseCurrency:'EUR',baseAmount:17}};
 const missing=engine.derive({uid,accountData:state,syncMeta:marker,records:[]});
 assert.equal(missing.movements,null);
 assert.ok(missing.reasons.includes('LEGACY_TOMBSTONE_UNMIGRATED'));
 const alive=engine.derive({uid,accountData:state,syncMeta:marker,records:[active]});
 assert.equal(alive.movements,null);
 assert.ok(alive.reasons.includes('LEGACY_TOMBSTONE_UNMIGRATED'));
 const tooOld=engine.derive({uid,accountData:state,syncMeta:marker,records:[{...active,deleted:true,updatedAtMs:2999,payload:null}]});
 assert.equal(tooOld.movements,null);
 const correct=engine.derive({uid,accountData:state,syncMeta:marker,records:[{...active,deleted:true,payload:null}]});
 assert.deepEqual(correct.movements,{expenseCount:0,incomeCount:0});
 assert.equal(correct.reasons.includes('LEGACY_TOMBSTONE_UNMIGRATED'),false);
 const clean=engine.derive({uid,accountData:state,syncMeta:{schemaVersion:2,state:'enabled-clean'},records:[]});
 assert.equal(clean.movements,null);
 assert.ok(clean.reasons.includes('LEGACY_SOURCE_NOT_MIGRATED'));
});
test('A09.04 newer legacy movement outranks older tombstone without false N/D',()=>{
 const uid='owner',syncMeta={schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:5000};
 const state={...empty(),expenses:[{id:'resumed',amount:15,syncUpdatedAtMs:4000}],incomes:[],
  accountDeletedRecords:{'expense:resumed':{deletedAt:3000,source:'user',explicit:true}}};
 const base={schemaVersion:2,uid,kind:'expense',recordId:'expense:resumed',deleted:false,updatedAtMs:4000,
  payload:{baseCurrency:'EUR',baseAmount:15}};
 const valid=engine.derive({uid,accountData:state,syncMeta,records:[base]});
 assert.deepEqual(valid.movements,{expenseCount:1,incomeCount:0});
 assert.equal(valid.reasons.includes('LEGACY_TOMBSTONE_UNMIGRATED'),false);
 const stale=engine.derive({uid,accountData:state,syncMeta,records:[{...base,updatedAtMs:2999}]});
 assert.equal(stale.movements,null);
 assert.ok(stale.reasons.includes('LEGACY_MIGRATION_INCOMPLETE'));
 const equalTimeState={...state,expenses:[{id:'resumed',amount:15,syncUpdatedAtMs:3000}]};
 const tied=engine.derive({uid,accountData:equalTimeState,syncMeta,records:[{...base,updatedAtMs:3000}]});
 assert.equal(tied.movements,null);
 assert.ok(tied.reasons.includes('LEGACY_TOMBSTONE_UNMIGRATED'));
 const noSource={...state,expenses:[]};
 const unauthorizedRevival=engine.derive({uid,accountData:noSource,syncMeta,records:[base]});
 assert.equal(unauthorizedRevival.movements,null);
 assert.ok(unauthorizedRevival.reasons.includes('LEGACY_TOMBSTONE_UNMIGRATED'));
});
test('A09.04 malformed explicit cloud deletion is N/D without contaminating other family stock',()=>{
 const uid='owner',state={...empty(),expenses:[],incomes:[],accountDeletedRecords:{
  'income:bad':{deletedAt:'invalid',explicit:true}
 }};
 const result=engine.derive({uid,accountData:state,syncMeta:{schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:1000},records:[]});
 assert.equal(result.movements,null);
 assert.ok(result.reasons.includes('LEGACY_TOMBSTONE_UNQUALIFIED'));
 assert.equal(result.functions?.goals,0);
 assert.equal(result.moneyByCurrency,null);
});
test('A09.04 stale V2 revision cannot represent newer cloud legacy, including tombstones',()=>{
 const uid='owner',syncMeta={schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:3000};
 const accountData={...empty(),expenses:[{id:'stale',amount:19,syncUpdatedAtMs:2000}],incomes:[]};
 const record={schemaVersion:2,uid,kind:'expense',recordId:'expense:stale',deleted:false,updatedAtMs:1999,payload:{baseCurrency:'EUR',baseAmount:19}};
 const stale=engine.derive({uid,accountData,syncMeta,records:[record]});
 assert.equal(stale.movements,null);assert.ok(stale.reasons.includes('LEGACY_MIGRATION_INCOMPLETE'));
 const fresh=engine.derive({uid,accountData,syncMeta,records:[{...record,updatedAtMs:2000}]});
 assert.deepEqual(fresh.movements,{expenseCount:1,incomeCount:0});
 const staleTombstone=engine.derive({uid,accountData,syncMeta,records:[{...record,deleted:true,payload:null}]});
 assert.equal(staleTombstone.movements,null);
 const freshTombstone=engine.derive({uid,accountData,syncMeta,records:[{...record,updatedAtMs:2000,deleted:true,payload:null}]});
 assert.deepEqual(freshTombstone.movements,{expenseCount:0,incomeCount:0});
 const missingVersion=engine.derive({uid,accountData,syncMeta,records:[{...record,updatedAtMs:undefined}]});
 assert.equal(missingVersion.movements,null);
});
test('A09.04 unqualified V2 migration marker does not turn legacy or incomplete movement sources into production numbers',()=>{
 const uid='owner',accountData=empty();
 const raw={schemaVersion:2,uid,kind:'expense',recordId:'expense:1',deleted:false,payload:{baseCurrency:'EUR',baseAmount:19}};
 for(const syncMeta of [undefined,null,{schemaVersion:2,state:'migration-running'},{schemaVersion:1,state:'enabled-clean'}]){
  const r=engine.derive({uid,records:[raw],accountData,syncMeta});
  assert.equal(r.movements,null);
  assert.equal(r.moneyByCurrency,null);
  assert.ok(r.reasons.includes('MOVEMENT_AUTHORITY_UNQUALIFIED'));
  assert.equal(r.periodCreations,null);
 }
});

test('A09 producer invalidates a same-value snapshot when its authoritative source revision changes',async()=>{
 const h=fakeDb(),owner={...scope(),creationCaptureComplete:true},clock=()=>h.timestamp;
 const first=await engine.refresh(h.db,owner,{serverTimestamp:clock});
 assert.equal(first.changed,true);
 const original=h.values.get('users/owner/growthMetrics/current');
 assert.ok(original.sourceRevisionDigest);
 assert.equal((await engine.read(h.db,owner)).available,true);
 // A restore/overwrite may update the Firestore source while preserving every count.
 h.revisions.set('userData/owner',{seconds:101,nanoseconds:123,toDate:()=>new Date(101000)});
 const stale=await engine.read(h.db,owner);
 assert.equal(stale.available,false);
 assert.equal(stale.reason,'SOURCE_ADVANCED_REFRESH_REQUIRED');
 const updated=await engine.refresh(h.db,owner,{serverTimestamp:clock});
 assert.equal(updated.changed,true);
 assert.equal(updated.revision,first.revision+1);
 const current=h.values.get('users/owner/growthMetrics/current');
 assert.equal(current.metricRevisionDigest,original.metricRevisionDigest);
 assert.notEqual(current.sourceRevisionDigest,original.sourceRevisionDigest);
 assert.equal(current.numericExportAllowed,false);
 assert.equal(current.wholeAppPopulationQualified,false);
 assert.equal((await engine.read(h.db,owner)).available,true);
 const replay=await engine.refresh(h.db,owner,{serverTimestamp:clock});
 assert.equal(replay.changed,false);
});

test('A09.03 clean account with un-migrated legacy cloud movements stays N/D, never a false zero',()=>{
 const data={...empty(),expenses:[{id:'legacy-private',amount:18}],incomes:[]};
 const out=engine.derive({uid:'owner',accountData:data,records:[],syncMeta:{schemaVersion:2,state:'enabled-clean'}});
 assert.equal(out.movements,null);
 assert.equal(out.moneyByCurrency,null);
 assert.ok(out.reasons.includes('LEGACY_SOURCE_NOT_MIGRATED'));
 assert.equal(out.periodCreations,null);
});
test('A09.03 migrated account needs both completion marker and V2 legacy representation',()=>{
 const data={...empty(),expenses:[{id:'legacy-private',amount:18}],incomes:[]};
 const missing=engine.derive({uid:'owner',accountData:data,records:[],syncMeta:{schemaVersion:2,state:'enabled-migrated'}});
 assert.equal(missing.movements,null);
 assert.ok(missing.reasons.includes('MIGRATION_COMPLETION_UNVERIFIED'));
 const marker={schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:1000};
 const incomplete=engine.derive({uid:'owner',accountData:data,records:[],syncMeta:marker});
 assert.equal(incomplete.movements,null);
 assert.ok(incomplete.reasons.includes('LEGACY_MIGRATION_INCOMPLETE'));
 const record={schemaVersion:2,uid:'owner',kind:'expense',recordId:'expense:legacy-private',deleted:false,updatedAtMs:1,payload:{baseCurrency:'EUR',baseAmount:18}};
 const valid=engine.derive({uid:'owner',accountData:data,records:[record],syncMeta:marker});
 assert.deepEqual(valid.movements,{expenseCount:1,incomeCount:0});
 assert.equal(valid.periodCreations,null);
});
test('A09.03 valid movement identities count independently while invalid money remains unavailable',()=>{
 const row={uid:'owner',kind:'expense',schemaVersion:2,recordId:'expense:safe',deleted:false,payload:{baseCurrency:'EUR',baseAmount:NaN}};
 const out=engine.derive({uid:'owner',accountData:empty(),records:[row],syncMeta:{schemaVersion:2,state:'enabled-clean'}});
 assert.equal(out.moneyByCurrency,null);
 assert.deepEqual(out.movements,{expenseCount:1,incomeCount:0});
 assert.ok(out.reasons.includes('MONEY_INVALID'));
 const view=engine.worklets({schema:'fainance-common-metrics-local-v1',projectId:engine.PROJECT,testOnly:true,numericExportAllowed:false,values:out,calculatedAt:{toDate:()=>new Date(0)}},true);
 assert.match(view.find(m=>m.id==='a09_expenses').readings[0].note,/Importi non qualificati: N\/D/);
 assert.ok(!view.some(m=>m.id.includes('_money')));
});
