'use strict';
// Isolated Firestore Emulator integration test for the EXISTING Test-only
// fAInance Growth producer. Uses synthetic data, no Production or user account.
// Run: FIRESTORE_EMULATOR_HOST=127.0.0.1:8796 node this-script.cjs
const assert=require('node:assert/strict');
const crypto=require('node:crypto');
if(process.env.FIRESTORE_EMULATOR_HOST!=='127.0.0.1:8796')throw Error('EMULATOR_HOST_REQUIRED');
const admin=require('../functions/node_modules/firebase-admin');
const engine=require('../functions/financeMetricsEngine.cjs');
const project='demo-fainance-shared-metrics';
const app=admin.initializeApp({projectId:project},'growth-emulator-integrity');
const db=app.firestore();
const serverTimestamp=()=>admin.firestore.FieldValue.serverTimestamp();
const uid='synthetic-growth-'+crypto.randomUUID();
const scope={uid,authenticatedUid:uid,creationCaptureComplete:true};
const profile=db.doc('users/'+uid),state=db.doc('userData/'+uid),
 marker=db.doc('users/'+uid+'/syncMeta/movementsV2Clean'),
 current=db.doc('users/'+uid+'/growthMetrics/current'),
 deletion=db.doc('accountDeletionRequests/'+uid);
const base={
 baseCurrency:'EUR',expenses:[],incomes:[],goals:[],alerts:[],
 shareProjects:[],financeEvolution:{rules:[],budget:{standardVersions:[],overrides:{}}}
};
const record=(kind,id,amount,deleted=false)=>({
 schemaVersion:2,uid,kind,recordId:kind+':'+id,deleted,updatedAtMs:1000,
 payload:deleted?null:{baseCurrency:'EUR',baseAmount:amount}
});
const readItem=(view,id)=>{
 const v=view.metrics.find(x=>x.id===id);
 assert.ok(v,'missing worklet '+id);return v;
};
async function main(){
 try{
  assert.equal(db.projectId,project);
  await Promise.all([
   profile.set({deletionStatus:'active'}),
   state.set(base),
   marker.set({schemaVersion:2,state:'enabled-clean'}),
   db.doc('users/'+uid+'/movementsV2/a').set(record('expense','a',12.34)),
   db.doc('users/'+uid+'/movementsV2/b').set(record('income','b',5.67)),
   db.doc('users/'+uid+'/movementsV2/c').set(record('expense','c',999,true))
  ]);
  const first=await engine.refresh(db,scope,{serverTimestamp});
  assert.equal(first.changed,true);
  let view=await engine.read(db,scope);
  assert.equal(view.available,true);
  assert.equal(view.numericExportAllowed,false);
  assert.equal(readItem(view,'a09_expenses').readings[0].value,1);
  assert.equal(readItem(view,'a09_incomes').readings[0].value,1);
  const firstRecord=(await current.get()).data();
  assert.ok(firstRecord.sourceRevisionDigest);
  assert.equal(firstRecord.wholeAppPopulationQualified,false);
  // The source changed but the metric totals did not: old snapshot MUST expire.
  await state.update({syntheticRevision:1});
  view=await engine.read(db,scope);
  assert.equal(view.available,false);
  assert.equal(view.reason,'SOURCE_ADVANCED_REFRESH_REQUIRED');
  const refreshed=await engine.refresh(db,scope,{serverTimestamp});
  assert.equal(refreshed.changed,true);
  assert.equal(refreshed.revision,first.revision+1);
  const changed=(await current.get()).data();
  assert.equal(changed.metricRevisionDigest,firstRecord.metricRevisionDigest);
  assert.notEqual(changed.sourceRevisionDigest,firstRecord.sourceRevisionDigest);
  view=await engine.read(db,scope);assert.equal(view.available,true);
  // Critical A09 guard: V2 enabled-clean while legacy cloud still contains data.
  await state.update({expenses:[{id:'synthetic-legacy',amount:25,syncUpdatedAtMs:2000}]});
  assert.equal((await engine.read(db,scope)).available,false);
  const blocked=await engine.refresh(db,scope,{serverTimestamp});
  assert.equal(blocked.changed,true);
  view=await engine.read(db,scope);
  assert.equal(view.available,true);
  assert.deepEqual(readItem(view,'a09_expenses').readings,[]);
  assert.equal(view.numericExportAllowed,false);
  const invalid=(await current.get()).data();
  assert.ok(invalid.values.reasons.includes('LEGACY_SOURCE_NOT_MIGRATED'));
  // V2 migration without final verified marker cannot silently restore figures.
  await marker.set({schemaVersion:2,state:'enabled-migrated'});
  await engine.refresh(db,scope,{serverTimestamp});
  view=await engine.read(db,scope);
  assert.deepEqual(readItem(view,'a09_expenses').readings,[]);
  // A client-written completion marker cannot conceal legacy cloud records
  // still absent from Firestore V2.
  await marker.set({schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:1000});
  await engine.refresh(db,scope,{serverTimestamp});
  view=await engine.read(db,scope);
  assert.deepEqual(readItem(view,'a09_expenses').readings,[]);
  assert.ok((await current.get()).data().values.reasons.includes('LEGACY_MIGRATION_INCOMPLETE'));
  // Represent the legacy identity on the server. Older tombstones remain valid
  // representations of migrated records without inflating active counts.
  const migrated=db.doc('users/'+uid+'/movementsV2/migrated-legacy');
  await migrated.set(record('expense','synthetic-legacy',25));
  await engine.refresh(db,scope,{serverTimestamp});
  view=await engine.read(db,scope);
  assert.deepEqual(readItem(view,'a09_expenses').readings,[]);
  assert.ok((await current.get()).data().values.reasons.includes('LEGACY_MIGRATION_INCOMPLETE'));
  await migrated.set({...record('expense','synthetic-legacy',25),updatedAtMs:2000});
  await engine.refresh(db,scope,{serverTimestamp});
  view=await engine.read(db,scope);
  assert.equal(readItem(view,'a09_expenses').readings[0].value,2);
  await migrated.set({...record('expense','synthetic-legacy',25,true),updatedAtMs:2000});
  await engine.refresh(db,scope,{serverTimestamp});
  view=await engine.read(db,scope);
  assert.equal(readItem(view,'a09_expenses').readings[0].value,1);
  // Legacy cloud explicitly deleted this record AFTER its old V2 tombstone.
  // A client-reported migration marker cannot make that stale delete complete.
  await state.update({accountDeletedRecords:{'expense:synthetic-legacy':{
    deletedAt:3000,source:'user',explicit:true
  }}});
  await engine.refresh(db,scope,{serverTimestamp});
  view=await engine.read(db,scope);
  assert.deepEqual(readItem(view,'a09_expenses').readings,[]);
  assert.ok((await current.get()).data().values.reasons.includes('LEGACY_TOMBSTONE_UNMIGRATED'));
  await migrated.set({...record('expense','synthetic-legacy',25,true),updatedAtMs:3000});
  await engine.refresh(db,scope,{serverTimestamp});
  view=await engine.read(db,scope);
  assert.equal(readItem(view,'a09_expenses').readings[0].value,1);
  // Independent synthetic account: a newer saved legacy update outranks
  // the older cloud tombstone, exactly as the V2 migration planner does.
  const secondaryUid='synthetic-revival-'+crypto.randomUUID();
  const secondaryProfile=db.doc('users/'+secondaryUid);
  const secondaryState=db.doc('userData/'+secondaryUid);
  try{
   await Promise.all([
    secondaryProfile.set({deletionStatus:'active'}),
    secondaryState.set({...base,expenses:[{id:'later',amount:31,syncUpdatedAtMs:4000}],
     accountDeletedRecords:{'expense:later':{deletedAt:3000,source:'user',explicit:true}}}),
    db.doc('users/'+secondaryUid+'/syncMeta/movementsV2Clean').set({
     schemaVersion:2,state:'enabled-migrated',migrationCompletedAtMs:5000}),
    db.doc('users/'+secondaryUid+'/movementsV2/later').set({
     schemaVersion:2,uid:secondaryUid,kind:'expense',recordId:'expense:later',
     deleted:false,updatedAtMs:4000,payload:{baseCurrency:'EUR',baseAmount:31}})
   ]);
   const secondaryScope={uid:secondaryUid,authenticatedUid:secondaryUid,creationCaptureComplete:true};
   await engine.refresh(db,secondaryScope,{serverTimestamp});
   let secondaryView=await engine.read(db,secondaryScope);
   assert.equal(readItem(secondaryView,'a09_expenses').readings[0].value,1);
   // The same timestamps now tie: deletion must win, never an active count.
   await secondaryState.update({expenses:[{id:'later',amount:31,syncUpdatedAtMs:3000}]});
   await engine.refresh(db,secondaryScope,{serverTimestamp});
   secondaryView=await engine.read(db,secondaryScope);
   assert.deepEqual(readItem(secondaryView,'a09_expenses').readings,[]);
  }finally{
   await Promise.allSettled([db.recursiveDelete(secondaryProfile),secondaryState.delete()]);
  }
  // A pending deletion blocks both refresh and read before any new data commits.
  await deletion.set({status:'requested'});
  await assert.rejects(engine.refresh(db,scope,{serverTimestamp}),/ACCOUNT_NOT_ELIGIBLE/);
  view=await engine.read(db,scope);
  assert.equal(view.available,false);
  assert.equal(view.reason,'ACCOUNT_NOT_ELIGIBLE');
  console.log('[OK] Firestore Emulator: real transaction, V2/tombstone, restore-source revision, legacy N/D, migration completion, deletion block, owner isolation; no Production data.');
 }finally{
  // Synthetic-only cleanup. The emulator is also destroyed on exit.
  await Promise.allSettled([
   db.recursiveDelete(profile),state.delete(),deletion.delete()
  ]);
  await app.delete();
 }
}
main().catch(error=>{console.error('[STOP] Emulator contract: '+(error.code||error.message||'unknown'));process.exitCode=1;});
