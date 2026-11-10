'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),crypto=require('node:crypto');
const ts=require('typescript');
const {plan}=require('../functions/growthCreationEvidence.cjs');
const empty=()=>({goals:[],alerts:[],shareProjects:[],financeEvolution:{rules:[],budget:{standardVersions:[],overrides:{}}}});
const stock={goals:0,alerts:0,shareProjects:0,rules:0,budgetVersions:0,budgetOverrides:0};
const claim=id=>({family:'shareProjects',entityId:id,nonce:crypto.randomUUID()});
test('only the real creation command queues Share: cloud merge, membership and imports do not',()=>{
 const exports={},saved=new Map(),auth={currentUser:{uid:'owner'}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname+'/../src/data/growthCreationIntents.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,crypto,require:()=>({firebaseApp:{options:{projectId:'fainance-test-20260823195207'}},fbAuth:auth}),localStorage:{getItem:k=>saved.get(k)||null,setItem:(k,v)=>saved.set(k,v)}});
 const source=ts.createSourceFile('app.tsx',fs.readFileSync(__dirname+'/../src/app.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 const nodes={};function walk(n){if(ts.isFunctionDeclaration(n)&&['setShareProjects','createShareProject'].includes(n.name?.text))nodes[n.name.text]=n.getText(source);ts.forEachChild(n,walk);}walk(source);
 const env={userId:'owner',currentUser:{name:'PRIVATE_NAME',email:'private@example.test'},dark:false,shareProjects:[],shareProjectsRef:{current:[]},applyingFirestoreRef:{current:false},normalizeEmail:v=>v,canAddPlanItem:()=>true,readableDarkText:v=>v,prepareAccountCollectionWrite:(_k,_c,n)=>n,setShareProjectsRaw:v=>{env.shareProjects=v;},syncShareProjectToCloud:()=>{},setShareSelectedProjectId:()=>{},setShareProjectTab:()=>{},noteGrowthCreations:exports.noteGrowthCreations};
 vm.runInNewContext(nodes.setShareProjects+'\n'+nodes.createShareProject,env);
 env.setShareProjects(p=>[{id:'joined',ownerUid:'someone_else'},...p]);env.setShareProjects([{id:'restored',ownerUid:'owner'}]);assert.equal(exports.pendingGrowthCreations('owner').length,0);
 const made=env.createShareProject('PRIVATE_PROJECT','PRIVATE_DESCRIPTION','x','#123456');const q=exports.pendingGrowthCreations('owner');assert.equal(q.length,1);assert.equal(q[0].family,'shareProjects');assert.equal(q[0].entityId,made.id);assert.ok(!JSON.stringify([...saved.values()]).includes('PRIVATE_'));
 env.setShareProjects(p=>p.map(x=>({...x,name:'edit'})));env.setShareProjects(p=>p.filter(x=>x.id!==made.id));assert.equal(exports.pendingGrowthCreations('owner').length,1);
});
test('six qualified families establish a baseline and recognize one owned Share creation',()=>{
 const s=empty(),first=plan({uid:'owner',state:s,stock});assert.equal(first.qualification.status,'QUALIFIED_SOURCE');assert.equal(first.registry.baselinedFamilies.length,6);
 s.shareProjects=[{id:'p',ownerUid:'owner',name:'PRIVATE_NAME'}];const p=claim('p'),before=JSON.stringify(s);
 const next=plan({uid:'owner',state:s,stock:{...stock,shareProjects:1},registry:first.registry,intents:[p]});assert.equal(next.events.length,1);assert.equal(next.events[0].family,'shareProjects');assert.equal(JSON.stringify(s),before);assert.ok(!JSON.stringify(next).includes('PRIVATE_NAME'));
 assert.equal(plan({uid:'owner',state:s,stock:{...stock,shareProjects:1},registry:next.registry,intents:[p]}).events.length,0);
 assert.equal(next.registry.numericExportAllowed,false);assert.equal(next.registry.wholeAppPopulationQualified,false);
});
test('participation in somebody else project cannot become an owned creation',()=>{
 const s=empty(),base=plan({uid:'owner',state:s,stock}).registry;s.shareProjects=[{id:'foreign',ownerUid:'other'}];
 const r=plan({uid:'owner',state:s,stock:{...stock,shareProjects:1},registry:base,intents:[claim('foreign')]});assert.equal(r.events.length,0);assert.equal(r.acknowledged.length,0);assert.equal(r.registry.seen.length,0);
});
test('unknown legacy owner keeps Share N/D without blocking independent families',()=>{
 const s=empty();s.shareProjects=[{id:'legacy'}];const first=plan({uid:'owner',state:s,stock:{...stock,shareProjects:1}});assert.equal(first.qualification.status,'PARTIAL_SOURCE');assert.ok(!first.registry.baselinedFamilies.includes('shareProjects'));assert.ok(first.registry.baselinedFamilies.includes('goals'));
 s.shareProjects[0].ownerUid='owner';const p=claim('legacy'),adopted=plan({uid:'owner',state:s,stock:{...stock,shareProjects:1},registry:first.registry,intents:[p]});assert.equal(adopted.events.length,0);assert.deepEqual(adopted.acknowledged,[p.nonce]);
});
test('previous five-family registry adopts Share without backfill; missing owner scope cannot qualify',()=>{
 const s=empty(),old=plan({state:s,stock}).registry;assert.ok(!old.baselinedFamilies.includes('shareProjects'));
 s.shareProjects=[{id:'old',ownerUid:'owner'}];const r=plan({uid:'owner',state:s,stock:{...stock,shareProjects:1},registry:old,intents:[claim('old')]});assert.equal(r.events.length,0);assert.ok(r.registry.baselinedFamilies.includes('shareProjects'));
});
