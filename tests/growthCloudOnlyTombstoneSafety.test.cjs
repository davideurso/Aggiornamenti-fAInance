'use strict';
// A09.04 Test-only legacy migration coverage; completely synthetic.
// No Firebase credentials, network, user data, emulator state or Production.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const ts=require('typescript');
const root=path.join(__dirname,'..');
function compiled(file){
 const text=fs.readFileSync(path.join(root,file),'utf8');
 const result=ts.transpileModule(text,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020},reportDiagnostics:true});
 assert.equal((result.diagnostics||[]).filter(d=>d.category===ts.DiagnosticCategory.Error).length,0,file);
 return result.outputText;
}
function simple(file){
 const box={exports:{}};
 new Function('exports','module',compiled(file))(box.exports,box);
 return box.exports;
}
const policy=simple('src/data/movementSyncCleanPolicy.ts');
const algorithms=simple('src/data/syncAlgorithms.ts');
const testProject='fainance-test-20260823195207';
const tombstone={deletedAt:3000,source:'user',explicit:true};
function harness({projectId=testProject,marker=null,cloud={expenses:[],incomes:[]},rows=[]}={}){
 let meta=marker&&structuredClone(marker),remote=structuredClone(cloud);
 const storage=new Map(),prefs=new Map(),allRows=new Map();
 for(const row of rows)allRows.set(row.recordId,structuredClone(row));
 const calls=[],fbDb={app:{options:{projectId}}},ss=v=>({exists:()=>v!=null,data:()=>structuredClone(v)});
 const fake={
  doc:(base,...parts)=>({path:[base.path,...parts].filter(Boolean).join('/')}),
  collection:(_base,...parts)=>({path:parts.join('/')}),
  getDocFromCache:async()=>ss(meta),
  getDocFromServer:async ref=>ss(ref.path.startsWith('userData/')?remote:meta),
  getDocsFromServer:async()=>({docs:[...allRows.values()].map(row=>({data:()=>structuredClone(row)}))}),
  setDoc:async(ref,value)=>{
   calls.push({path:ref.path,kind:value?.kind||null,state:value?.state||null});
   if(ref.path.includes('/syncMeta/'))meta={...(meta||{}),...structuredClone(value)};
   else if(ref.path.includes('/movementsV2/'))allRows.set(value.recordId,structuredClone(value));
  },
  waitForPendingWrites:async()=>undefined,
  onSnapshot:()=>()=>{},runTransaction:()=>{throw Error('NO_LIVE_TRANSACTION');},
 };
 const dependencies={
  'firebase/firestore':fake,
  '@capacitor/preferences':{Preferences:{get:async({key})=>({value:prefs.get(key)||null}),set:async({key,value})=>{prefs.set(key,value);}}},
  '../firebase/client':{fbDb},
  './accountCloudCodec':{fainanceExpandAccountCloudDataV5:async value=>value},
  '../utils/readDeadline':{readWithDeadline:promise=>promise},
  './movementSyncCleanPolicy':policy,'./syncAlgorithms':algorithms,
  './growthMetricsCommit':{notifyGrowthSourceCommitted:()=>undefined},
 };
 const box={exports:{}};
 vm.runInNewContext(compiled('src/data/movementSyncCleanV2.ts'),{
  module:box,exports:box.exports,require:name=>{assert(name in dependencies,'Unexpected module '+name);return dependencies[name];},
  localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},
  navigator:{onLine:true},crypto:{randomUUID:()=>require('node:crypto').randomUUID()},
  Date,Math,Map,Set,Object,Number,Promise,console,setInterval,clearInterval,setTimeout,clearTimeout,
 });
 return {api:box.exports,allRows,calls,localStorage:storage,cloud:v=>{remote=structuredClone(v);},get marker(){return meta;}};
}
const state={expenses:[],incomes:[],accountDeletedRecords:{'expense:old':tombstone}};
function record({uid='owner',recordId='expense:old',updatedAtMs=3000,deleted=true}={}){
 return {schemaVersion:2,uid,kind:'expense',recordId,deleted,
  payload:deleted?null:{id:'old',baseCurrency:'EUR',baseAmount:12},
  updatedAtMs,deletedAtMs:deleted?updatedAtMs:0,mutationId:'fixture'};
}
test('A09.04: explicit movement deletions detected, unrelated tombstones ignored',()=>{
 const h=harness();
 assert.equal(h.api.hasLegacyMovementTombstonesV2({'expense:a':tombstone}),true);
 assert.equal(h.api.hasLegacyMovementTombstonesV2({'income:a':tombstone}),true);
 assert.equal(h.api.hasLegacyMovementTombstonesV2({'goal:a':tombstone}),false);
 assert.equal(h.api.hasLegacyMovementTombstonesV2({'expense:a':{deletedAt:3000}}),false);
});
test('A09.04: pure cloud coverage requires deletion representation and correct time',()=>{
 const h=harness();
 const local={'expense:old':tombstone};
 assert.equal(h.api.legacyCloudRepresentedLocallyV2('owner',[],[],{},[],[],local),false);
 assert.equal(h.api.legacyCloudRepresentedLocallyV2('owner',[],[],local,[],[],local),true);
 assert.equal(h.api.legacyCloudRepresentedLocallyV2('owner',[],[],{'expense:old':{...tombstone,deletedAt:2999}},[],[],local),false);
});
test('A09.04: new Test account with cloud-only tombstone cannot be enabled-clean',async()=>{
 const h=harness({cloud:state});
 const s=await h.api.movementSyncV2AccountStatus('owner',[],[],{});
 assert.equal(s.active,false);assert.equal(s.reason,'legacy-migration-required');
 assert.equal(h.calls.length,0);
});
test('A09.04: migration refuses missing cloud-only tombstone before any write',async()=>{
 const h=harness({cloud:state});
 await assert.rejects(h.api.migrateLegacyMovementSnapshotV2('owner',[],[],{}),
  /SYNC_V2_LEGACY_CLOUD_NOT_HYDRATED/);
 assert.equal(h.calls.length,0);assert.equal(h.allRows.size,0);
});
test('A09.04: hydrated cloud deletion migrates as tombstone and completes marker',async()=>{
 const h=harness({cloud:state});
 const result=await h.api.migrateLegacyMovementSnapshotV2('owner',[],[],state.accountDeletedRecords);
 assert.equal(result.total,1);
 assert.equal(h.allRows.get('expense:old')?.deleted,true);
 assert.equal(h.allRows.get('expense:old')?.updatedAtMs,3000);
 await h.api.completeMovementSyncV2Migration('owner');
 assert.equal(h.marker.state,'enabled-migrated');
});
test('A09.04: wrong enabled-clean marker waits for cloud hydration, never activates',async()=>{
 const h=harness({marker:{schemaVersion:2,state:'enabled-clean'},cloud:state});
 const s=await h.api.movementSyncV2AccountStatus('owner',[],[],{});
 assert.equal(s.active,false);assert.equal(s.reason,'status-check-unavailable');
 assert.equal(h.marker.state,'enabled-clean');assert.equal(h.calls.length,0);
});
test('A09.04: wrong enabled-clean marker recovers from hydrated missing tombstone',async()=>{
 const h=harness({marker:{schemaVersion:2,state:'enabled-clean'},cloud:state});
 const s=await h.api.movementSyncV2AccountStatus('owner',[],[],state.accountDeletedRecords);
 assert.equal(s.active,false);assert.equal(s.reason,'legacy-migration-required');
 assert.equal(h.calls.length,0);
});
test('A09.04: correct V2 tombstone converts old clean marker without changing business data',async()=>{
 const h=harness({marker:{schemaVersion:2,state:'enabled-clean'},cloud:state,rows:[record()]});
 const s=await h.api.movementSyncV2AccountStatus('owner',[],[],state.accountDeletedRecords);
 assert.equal(s.active,true);assert.equal(s.reason,'migrated-server-confirmed');
 assert.equal(h.marker.state,'enabled-migrated');
 assert.equal(h.allRows.get('expense:old')?.deleted,true);
});
test('A09.04: unacknowledged device with only local deletion must catch up',async()=>{
 const h=harness({marker:{schemaVersion:2,state:'enabled-migrated'},cloud:state});
 const s=await h.api.movementSyncV2AccountStatus('owner',[],[],state.accountDeletedRecords);
 assert.equal(s.active,false);assert.equal(s.reason,'device-catchup-required');
});
test('A09.04: ordinary clean Test user remains clean without unnecessary migration',async()=>{
 const h=harness({cloud:{expenses:[],incomes:[]}});
 const s=await h.api.movementSyncV2AccountStatus('owner',[],[],{});
 assert.equal(s.active,true);assert.equal(s.reason,'new-clean-account');
 assert.equal(h.marker.state,'enabled-clean');
});
test('A09.04: Production project still follows its unchanged original clean path',async()=>{
 const h=harness({projectId:'fainance-a7794',cloud:state});
 const s=await h.api.movementSyncV2AccountStatus('owner',[],[],{});
 assert.equal(s.active,true);assert.equal(s.reason,'new-clean-account');
 assert.equal(h.marker.state,'enabled-clean');
});
