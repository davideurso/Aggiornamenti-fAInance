'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ts=require('typescript'),path=require('node:path'),{plan}=require('../functions/growthCreationEvidence.cjs'),gateway=require('../functions/growthMetricsTestGateway.cjs');
function client({store=new Map(),project='fainance-test-20260823195207',failWrites=false,reply}={}){
 const auth={currentUser:{uid:'owner'}},firebase={firebaseApp:{options:{projectId:project}},fbAuth:auth},queue={},bridge={},calls=[],infos=[],warns=[];
 const common={crypto,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>{if(failWrites)throw Error('PRIVATE_STORAGE_ERROR');store.set(k,v);}},console:{info:(...a)=>infos.push(a),warn:(...a)=>warns.push(a)}};
 const run=(name,exports,require)=>vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/data',name),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{...common,exports,require});
 run('growthCreationIntents.ts',queue,()=>firebase);
 run('growthMetricsCommit.ts',bridge,n=>n==='./growthCreationIntents'?queue:n==='firebase/functions'?{getFunctions:()=>({}),httpsCallable:()=>async body=>{calls.push(body);return{data:reply||{available:true,testOnly:true,numericExportAllowed:false,acknowledgedCreationNonces:[],creationQualification:{status:'QUALIFIED_SOURCE'}}};}}:firebase);
 return{queue,bridge,store,auth,calls,infos,warns};
}
const tick=()=>new Promise(setImmediate),key='user_owner_growth_creation_pending_test_v1';
const source=()=>({baseCurrency:'EUR',goals:[],alerts:[],shareProjects:[{id:'a',ownerUid:'owner'},{id:'b',ownerUid:'other'}],financeEvolution:{rules:[],budget:{standardVersions:[],overrides:{}}}});
test('capacity preserves the fitting prefix and missing creations remain explicitly incomplete after acknowledgement and restart',()=>{
 const c=client();c.queue.noteGrowthCreations('owner','goals',[],Array.from({length:99},(_,i)=>({id:'g'+i})));
 c.queue.noteGrowthCreations('owner','goals',[],[{id:'fit'},{id:'overflow'},{id:'overflow2'}]);
 const pending=c.queue.pendingGrowthCreations('owner');assert.equal(pending.length,100);assert.equal(pending[99].entityId,'fit');assert.equal(c.queue.growthCreationCaptureComplete('owner'),false);
 c.queue.acknowledgeGrowthCreations('owner',pending.map(x=>x.nonce));assert.equal(c.queue.pendingGrowthCreations('owner').length,0);assert.equal(client({store:c.store}).queue.growthCreationCaptureComplete('owner'),false);
});
test('corrupt, duplicate and unexpected private queue contents are not emitted or silently overwritten',()=>{
 for(const value of ['bad',JSON.stringify([{family:'goals',entityId:'g',nonce:crypto.randomUUID(),amount:'PRIVATE'}]),JSON.stringify(Array(2).fill({family:'goals',entityId:'g',nonce:crypto.randomUUID()}))]){
  const c=client();c.store.set(key,value);assert.equal(c.queue.pendingGrowthCreations('owner').length,0);assert.equal(c.queue.growthCreationCaptureComplete('owner'),false);assert.equal(c.store.get(key),value);
 }
});
test('storage failures preserve existing intents and cannot claim complete capture',()=>{
 const store=new Map([[key,JSON.stringify([{family:'goals',entityId:'existing',nonce:crypto.randomUUID()}])]]),before=store.get(key),c=client({store,failWrites:true});
 assert.doesNotThrow(()=>c.queue.noteGrowthCreations('owner','goals',[],[{id:'new'}]));assert.equal(store.get(key),before);assert.equal(c.queue.growthCreationCaptureComplete('owner'),false);
});
test('Production and another signed-in owner never write queue or diagnostic flags',()=>{
 for(const c of [client({project:'fainance-a7794'}),client()]){
  if(c.store.size===0)c.auth.currentUser.uid='other';c.queue.noteGrowthCreations('owner','goals',[],[{id:1}]);assert.equal(c.queue.growthCreationCaptureComplete('owner'),false);assert.equal(c.store.size,0);
 }
});
test('only relevant source changes refresh: array order and private descriptions skip, Share owner changes do not',async()=>{
 const c=client(),s=source();c.bridge.notifyGrowthSourceCommitted('owner','FUNCTIONS','ORDINARY',s);await tick();assert.equal(c.calls.length,1);assert.equal(c.calls[0].creationCaptureComplete,true);
 s.shareProjects.reverse();c.bridge.notifyGrowthSourceCommitted('owner','FUNCTIONS','ORDINARY',s);await tick();assert.equal(c.calls.length,1);
 s.shareProjects[0].name='PRIVATE_NAME';c.bridge.notifyGrowthSourceCommitted('owner','FUNCTIONS','ORDINARY',s);await tick();assert.equal(c.calls.length,1);
 s.shareProjects[0].ownerUid='owner';c.bridge.notifyGrowthSourceCommitted('owner','FUNCTIONS','ORDINARY',s);await tick();assert.equal(c.calls.length,2);assert.ok(!JSON.stringify(c.calls).includes('PRIVATE_NAME'));
});
test('successful stock with incomplete creation capture is not logged as confirmed and never retried automatically',async()=>{
 const c=client({reply:{available:true,testOnly:true,numericExportAllowed:false,acknowledgedCreationNonces:[],creationQualification:{status:'N_D'}}});
 const s=source();c.bridge.notifyGrowthSourceCommitted('owner','FUNCTIONS','ORDINARY',s);await tick();assert.equal(c.infos.length,0);assert.equal(c.warns.length,1);
 c.bridge.notifyGrowthSourceCommitted('owner','FUNCTIONS','ORDINARY',s);await tick();assert.equal(c.calls.length,1);
});
test('server keeps a known gap across later clean clients without losing verified event acknowledgements',()=>{
 const s=source(),stock={goals:0,alerts:0,shareProjects:2,rules:0,budgetVersions:0,budgetOverrides:0},first=plan({uid:'owner',state:s,stock,creationCaptureComplete:true});
 s.goals=[{id:'new'}];stock.goals=1;const intent={family:'goals',entityId:'new',nonce:crypto.randomUUID()};
 const gap=plan({uid:'owner',state:s,stock,registry:first.registry,intents:[intent],creationCaptureComplete:false});assert.equal(gap.events.length,1);assert.deepEqual(gap.acknowledged,[intent.nonce]);assert.equal(gap.qualification.reason,'CREATION_CAPTURE_INCOMPLETE');assert.equal(gap.registry.captureIncomplete,true);
 const later=plan({uid:'owner',state:s,stock,registry:gap.registry,creationCaptureComplete:true});assert.equal(later.qualification.status,'N_D');assert.equal(later.qualification.captureComplete,false);assert.equal(later.registry.numericExportAllowed,false);
});
test('authenticated gateway accepts only the bounded capture boolean and forwards it to the same engine',async()=>{
 const scopes=[];class HttpsError extends Error{constructor(code,message){super(message);this.code=code;}}
 const handle=gateway.createHandler({db:{projectId:gateway.TEST_PROJECT},engine:{refresh:async(_,scope)=>{scopes.push(scope);return{creationQualification:{status:'N_D'},acknowledgedCreationNonces:[]};},read:async()=>({available:true})},serverTimestamp:()=>0,HttpsError,getUser:async uid=>({uid,disabled:false,tokensValidAfterTime:'1970-01-01T00:00:00Z'})});
 const auth={uid:'owner',token:{auth_time:Math.floor(Date.now()/1000)}};await handle({auth,data:{operation:'refresh',creationCaptureComplete:false}});assert.equal(scopes[0].creationCaptureComplete,false);
 for(const data of [{operation:'refresh',creationCaptureComplete:'true'},{operation:'read',creationCaptureComplete:true}])await assert.rejects(handle({auth,data}),e=>e.code==='invalid-argument');
});
