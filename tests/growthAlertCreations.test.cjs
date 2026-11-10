'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ts=require('typescript');
const {plan,claims}=require('../functions/growthCreationEvidence.cjs');
function client(project='fainance-test-20260823195207'){
 const store=new Map(),auth={currentUser:{uid:'owner'}},exports={};
 const context={exports,require:()=>({firebaseApp:{options:{projectId:project}},fbAuth:auth}),crypto,localStorage:{getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,v)}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname+'/../src/data/growthCreationIntents.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,context);
 const source=ts.createSourceFile('app.tsx',fs.readFileSync(__dirname+'/../src/app.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let setters=[];function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='setAlerts')setters.push(n.getText(source));ts.forEachChild(n,walk);}walk(source);assert.equal(setters.length,1);
 const env={alertsRef:{current:[]},applyingFirestoreRef:{current:false},userId:'owner',noteGrowthCreations:exports.noteGrowthCreations,prepareAccountCollectionWrite:(kind,old,next)=>{assert.equal(kind,'alert');return next;},setAlertsRaw:value=>{env.saved=value;return value;}};
 vm.runInNewContext(setters[0],env);
 return{...exports,env,auth,store};
}
const state=()=>({goals:[],alerts:[],financeEvolution:{rules:[],budget:{standardVersions:[],overrides:{}}}});
const stock={goals:0,rules:0,budgetVersions:0,budgetOverrides:0,alerts:0};
test('real App setter queues manual/AI alert IDs, never private content, edits or deletions',()=>{
 const c=client();c.env.setAlerts(p=>[...p,{id:123,name:'PRIVATE_ALERT',budget:250}]);c.env.setAlerts(p=>[{id:456.25,name:'PRIVATE_AI'},...p]);
 assert.equal(c.pendingGrowthCreations('owner').length,2);assert.ok(c.pendingGrowthCreations('owner').every(x=>x.family==='alerts'));
 assert.ok(!JSON.stringify([...c.store.values()]).includes('PRIVATE_'));
 c.env.setAlerts(p=>p.map(x=>({...x,budget:450})));c.env.setAlerts(p=>p.slice(1));assert.equal(c.pendingGrowthCreations('owner').length,2);
 claims(JSON.parse(JSON.stringify(c.pendingGrowthCreations('owner'))));
});
test('hydration, imports, reset, other owner and Production do not queue alert creations',()=>{
 const c=client();c.env.setAlerts([{id:1}]);c.env.setAlerts([]);c.env.applyingFirestoreRef.current=true;c.env.setAlerts(()=>[{id:2}]);assert.equal(c.pendingGrowthCreations('owner').length,0);
 c.env.applyingFirestoreRef.current=false;c.auth.currentUser.uid='other';c.env.setAlerts(()=>[{id:3}]);assert.equal(c.store.size,0);
 const prod=client('fainance-a7794');prod.env.setAlerts(()=>[{id:4}]);assert.equal(prod.store.size,0);
});
test('queue failure cannot block the business save and missing server acknowledgement retains intent',()=>{
 const c=client();c.store.set('user_owner_growth_creation_pending_test_v1','broken');c.env.setAlerts(()=>[{id:1}]);assert.equal(c.env.saved[0].id,1);
 c.store.clear();c.env.setAlerts(p=>[...p,{id:2}]);c.acknowledgeGrowthCreations('owner',[]);assert.equal(c.pendingGrowthCreations('owner').length,1);
 c.acknowledgeGrowthCreations('owner',c.pendingGrowthCreations('owner').map(x=>x.nonce));assert.equal(c.pendingGrowthCreations('owner').length,0);
});
test('old four-family registry establishes alert baseline without turning existing stock into births',()=>{
 const s=state(),legacy=plan({state:s,stock:{...stock,alerts:null}}).registry;s.alerts=[{id:1}];
 assert.ok(!legacy.baselinedFamilies.includes('alerts'));
 const p={family:'alerts',entityId:'1',nonce:crypto.randomUUID()};
 const baseline=plan({state:s,stock:{...stock,alerts:1},registry:legacy,intents:[p]});assert.equal(baseline.events.length,0);assert.deepEqual(baseline.acknowledged,[p.nonce]);
 assert.ok(baseline.registry.baselinedFamilies.includes('alerts'));assert.equal(baseline.qualification.status,'PARTIAL_SOURCE'); // Share coverage is independently unqualified in this alert-only fixture.
 s.alerts.push({id:2});const next=plan({state:s,stock:{...stock,alerts:2},registry:baseline.registry,intents:[{...p,entityId:'2',nonce:crypto.randomUUID()}]});assert.equal(next.events.length,1);
 assert.equal(next.registry.numericExportAllowed,false);assert.equal(next.registry.wholeAppPopulationQualified,false);
});
test('unqualified alerts stay pending; delete/restore cannot duplicate an admitted alert',()=>{
 const s=state(),baseline=plan({state:s,stock}).registry,p={family:'alerts',entityId:'2',nonce:crypto.randomUUID()};
 s.alerts=[{id:2}];const missing=plan({state:s,stock:{...stock,alerts:null},registry:baseline,intents:[p]});assert.equal(missing.events.length,0);assert.equal(missing.acknowledged.length,0);assert.equal(missing.qualification.status,'PARTIAL_SOURCE');
 const created=plan({state:s,stock:{...stock,alerts:1},registry:baseline,intents:[p]});assert.equal(created.events.length,1);
 const deleted=plan({state:state(),stock,registry:created.registry});const restored=plan({state:s,stock:{...stock,alerts:1},registry:deleted.registry,intents:[{...p,nonce:crypto.randomUUID()}]});assert.equal(restored.events.length,0);
});
