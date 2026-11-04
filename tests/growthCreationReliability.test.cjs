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
 const timestamp={seconds:100,nanoseconds:0,toDate:()=>new Date(100000)};
 db.doc=path=>({path,collection:name=>db.collection(path+'/'+name)});db.collection=path=>({path,doc:name=>db.doc(path+'/'+name)});
 db.runTransaction=async fn=>fn({get:async ref=>ref.path.endsWith('/movementsV2')?{docs:[]}:{exists:values.has(ref.path),ref,updateTime:timestamp,readTime:timestamp,data:()=>values.get(ref.path)},set:(ref,v)=>{writes.push(ref.path);values.set(ref.path,v)},create:(ref,v)=>{assert.ok(!values.has(ref.path));writes.push(ref.path);values.set(ref.path,v)}});
 return{db,values,writes,timestamp};
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
