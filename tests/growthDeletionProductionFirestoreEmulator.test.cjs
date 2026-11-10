'use strict';
// A06 Production-source acceptance with the REAL Firestore emulator SDK.
// All documents and provider events are synthetic. No Auth, Production API,
// real account, billing mutation, deleted user or live Cloud Run invocation.
const assert=require('node:assert/strict');
const admin=require('../functions/node_modules/firebase-admin');
const source=require('../functions/growthDeletionProduction.cjs');
const http=require('../functions/growthDeletionProductionHttp.cjs');
const EXPECT='127.0.0.1:8796';
const DEMO='demo-fainance-shared-metrics';
if(process.env.FIRESTORE_EMULATOR_HOST!==EXPECT||
  (process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!==DEMO))
  throw Error('A06_DEMO_EMULATOR_ONLY');
const app=admin.initializeApp({projectId:DEMO},'a06-prod-isolated-fixture');
const db=admin.firestore(app);
const stamp=()=>admin.firestore.FieldValue.serverTimestamp();
function requestEvent(id,status,oldStatus) {
  const uid='synthetic-never-real-account';
  return {id,time:'2026-11-09T15:30:00Z',params:{uid},
    data:{before:{exists:!!oldStatus,data:()=>({uid,status:oldStatus})},
      after:{exists:true,data:()=>({uid,status,
        requestedAt:'2026-11-09T10:00:00Z',
        scheduledAt:'2026-11-24T10:00:00Z',graceDays:15,
        cancelledAt:status==='cancelled'?'2026-11-09T15:30:00Z':undefined})}
    }};
}
async function main() {
 const ref=db.collection(source.COLLECTION);
 try{
  assert.equal(await source.observedAuthDeletion({
    db,project:source.PROD,eventId:'provider-synthetic-auth-20261109',
    time:'2026-11-09T15:00:00Z',serverTimestamp:stamp}),true);
  assert.equal(await source.observedAuthDeletion({
    db,project:source.PROD,eventId:'provider-synthetic-auth-20261109',
    time:'2026-11-09T15:00:00Z',serverTimestamp:stamp}),false);
  assert.equal(await source.observedRequest({
    db,project:source.PROD,event:requestEvent('provider-synthetic-request-20261109','pending',null),
    serverTimestamp:stamp}),true);
  assert.equal(await source.observedRequest({
    db,project:source.PROD,event:requestEvent('provider-synthetic-revoked-20261109','cancelled','pending'),
    serverTimestamp:stamp}),true);
  const qualified=await source.summarize({db,project:source.PROD,
    from:'2026-11-09',toExclusive:'2026-11-10',asOf:'2026-11-11T10:00:00Z'});
  assert.equal(qualified.status,'SOURCE_COMPLETE');
  assert.deepEqual([qualified.completed,qualified.pending,qualified.revoked],[1,1,1]);
  assert.equal(qualified.productionQualified,true);
  assert.equal(qualified.numericExportAllowed,true);
  http.validateReport(qualified,{from:'2026-11-09',toExclusive:'2026-11-10'});
  const old=await source.summarize({db,project:source.PROD,
    from:'2026-11-08',toExclusive:'2026-11-09',asOf:'2026-11-11T10:00:00Z'});
  assert.equal(old.status,'N_D');
  assert.equal(old.completed,null);
  const docs=(await ref.get()).docs;
  assert.equal(docs.length,3);
  for(const doc of docs){
    const fields=doc.data();
    assert.deepEqual(Object.keys(fields).sort(),[
      'schemaVersion','eventType','app','environment','source',
      'periodDayRome','occurredAt','expiresAt'
    ].sort());
    assert(!Object.keys(fields).some(k=>/uid|email|username|phone|claim/i.test(k)));
    assert(!JSON.stringify(fields).includes('synthetic-never-real-account'));
    assert(fields.expiresAt&&typeof fields.expiresAt.toDate==='function');
  }
  console.log('[OK] A06 PROD engine: REAL Firestore emulator event create/replay/query 1/1/1');
  console.log('[OK] Identity-free documents, 400-day expiry field, history N/D; no Production touched');
 } finally {
   const docs=(await ref.get()).docs;
   await Promise.all(docs.map(v=>v.ref.delete()));
   await app.delete();
 }
}
main().catch(e=>{console.error('[STOP] '+String(e.message||e));process.exitCode=1;});
