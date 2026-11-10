'use strict';
// A06 true Firestore SDK transaction/query acceptance in isolated DEMO emulator.
// No production API, authenticated user, genuine deletion or external request.
const assert=require('node:assert/strict');
const admin=require('../functions/node_modules/firebase-admin');
const lifecycle=require('../functions/growthDeletionLifecycleEvents.cjs');
const EXPECT='127.0.0.1:8796';
if(process.env.FIRESTORE_EMULATOR_HOST!==EXPECT||
  process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!=='demo-fainance-shared-metrics')
 throw Error('A06_DEMO_EMULATOR_ONLY');
const app=admin.initializeApp({projectId:'demo-fainance-shared-metrics'},'a06-event-flow-fixture');
const db=admin.firestore(app),stamp=()=>admin.firestore.FieldValue.serverTimestamp();
function changed(id,status,previous){
 const uid='synthetic-a06-owner';
 const before=previous?{uid,status:previous}:null;
 const after={uid,status,requestedAt:'2026-11-08T10:00:00Z',
  scheduledAt:'2026-11-23T10:00:00Z',graceDays:15,
  cancelledAt:status==='cancelled'?'2026-11-08T15:30:00Z':undefined};
 return {id,time:'2026-11-08T15:30:00Z',params:{uid},
  data:{before:{exists:!!before,data:()=>before},
    after:{exists:true,data:()=>after}}};
}
async function main(){
 const collection=db.collection(lifecycle.COLLECTION);
 try{
  assert.equal(await lifecycle.observedAuthDeletion({db,project:lifecycle.TEST,
   eventId:'simulated-auth-event-ABC012345',time:'2026-11-08T16:00:00Z',
   serverTimestamp:stamp}),true);
  assert.equal(await lifecycle.observedAuthDeletion({db,project:lifecycle.TEST,
   eventId:'simulated-auth-event-ABC012345',time:'2026-11-08T16:00:00Z',
   serverTimestamp:stamp}),false);
  assert.equal(await lifecycle.observedRequest({db,project:lifecycle.TEST,
   event:changed('synthetic-request-event-001','pending',null),
   serverTimestamp:stamp}),true);
  assert.equal(await lifecycle.observedRequest({db,project:lifecycle.TEST,
   event:changed('synthetic-revoke-event-002','cancelled','pending'),
   serverTimestamp:stamp}),true);
  const old=db.collection(lifecycle.COLLECTION).doc('legacy-duplicate-for-emulator');
  await old.create({schemaVersion:1,eventType:lifecycle.TYPES.confirmed,app:'fAInance',
   environment:'Test',source:'processDueAccountDeletions',
   periodDayRome:'2026-11-08',occurredAt:stamp()});
  const summary=await lifecycle.summarize({db,project:lifecycle.TEST,
   from:'2026-11-08',toExclusive:'2026-11-09',asOf:'2026-11-10T10:00:00Z'});
  assert.equal(summary.status,'SOURCE_OBSERVED');
  assert.deepEqual([summary.completed,summary.pending,summary.revoked],[1,1,1]);
  assert.equal(summary.productionQualified,false);
  assert.equal(summary.numericExportAllowed,false);
  const docs=(await collection.get()).docs;
  assert.equal(docs.length,4);
  for(const doc of docs){
   const fields=doc.data();
   if(fields.source!=='processDueAccountDeletions'){
    assert(fields.expiresAt instanceof admin.firestore.Timestamp);
    const expected=Date.parse('2026-11-08T'+
      (fields.eventType===lifecycle.TYPES.confirmed?'16:00:00Z':'15:30:00Z'))+
      lifecycle.RETENTION_DAYS*86400000;
    assert.equal(fields.expiresAt.toMillis(),expected);
   }
   assert(!Object.keys(fields).some(k=>/uid|email|username|phone|claim/i.test(k)));
   assert(!JSON.stringify(fields).includes('synthetic-a06-owner'));
  }
  console.log('[OK] A06 Test-only 3 lifecycle event types / Auth replay / old-worker exclusion');
  console.log('[OK] Firestore emulator 4 identity-free documents, 1/1/1 counts, no real user');
 }finally{
  const docs=(await collection.get()).docs;
  await Promise.all(docs.map(d=>d.ref.delete()));
  await app.delete();
 }
}
main().catch(e=>{console.error('[STOP] '+String(e.message||e));process.exitCode=1;});
