'use strict';
// A06.03 real Firestore TRANSACTIONS in an isolated demo emulator.
// Firebase Auth and Storage are stubbed: NEVER delete a real user's account.
const assert=require('node:assert/strict');
const admin=require('../functions/node_modules/firebase-admin');
const {createMaintenance}=require('../functions/fainanceMaintenance.cjs');
const evidence=require('../functions/growthDeletionEvidence.cjs');
const EXPECT='127.0.0.1:8796';
const PROJECT='demo-fainance-shared-metrics';
if(process.env.FIRESTORE_EMULATOR_HOST!==EXPECT||process.env.GCLOUD_PROJECT&&process.env.GCLOUD_PROJECT!==PROJECT)
 throw Error('DEMO_FIRESTORE_EMULATOR_REQUIRED');
const app=admin.initializeApp({projectId:PROJECT},'synthetic-a06-cleanup');
const db=admin.firestore(app);
const REQUEST={status:'pending',graceDays:15,
 requestedAt:'2026-10-01T10:00:00.000Z',scheduledAt:'2026-10-17T10:00:00.000Z'};
const PROFILE={deletionStatus:'pending',deletionGraceDays:15,
 deletionRequestedAt:REQUEST.requestedAt,deletionScheduledAt:REQUEST.scheduledAt};
const now=()=>Date.parse('2026-11-10T12:00:00Z');
const storage={bucket:()=>({exists:async()=>[false],
 deleteFiles:()=>{throw Error('NO_CLOUD_STORAGE')}})};
async function seed(suffix){
 const uid='growth-a06-'+suffix;
 const profile=db.collection('users').doc(uid);
 const request=db.collection('accountDeletionRequests').doc(uid);
 const data=db.collection('userData').doc(uid);
 await Promise.all([
  profile.set(PROFILE),
  request.set({...REQUEST,uid}),
  data.set({expenses:[{amount:12,description:'synthetic'}]})
 ]);
 return {uid,profile,request,data};
}
async function verify(type,errorCode){
 const refs=await seed(type);
 let calls=0;
 const auth={deleteUser:async uid=>{
  assert.equal(uid,refs.uid);calls++;
  if(errorCode)throw Object.assign(Error('synthetic Auth failure'),{code:errorCode});
 }};
 const log={info:()=>{},error:()=>{}};
 const api=createMaintenance({db,auth,storage,project:'fainance-test-20260823195207',now,log,
  serverTimestamp:()=>admin.firestore.FieldValue.serverTimestamp()});
 try{
  const countBefore=(await db.collection(evidence.COLLECTION).count().get()).data().count;
  const result=await api.processOne(refs.uid);
  assert.equal(calls,1);
  if(errorCode&&errorCode!=='auth/user-not-found'){
   assert.equal(result,'needs_review');
   assert.equal((await refs.request.get()).data().status,'needs_review');
   assert((await refs.profile.get()).exists);
   assert(!(await refs.data.get()).exists);
  }else{
   assert.equal(result,'completed');
   assert(!(await refs.request.get()).exists);
   assert(!(await refs.profile.get()).exists);
   assert(!(await refs.data.get()).exists);
  }
  const events=await db.collection(evidence.COLLECTION).get();
  assert.equal(events.size,countBefore+(result==='completed'?1:0));
  for(const event of events.docs){
   assert.deepEqual(Object.keys(event.data()).sort(),evidence.FIELDS.slice().sort());
   assert.equal(event.data().app,'fAInance');
   assert.equal(event.data().environment,'Test');
   assert.equal(event.data().periodDayRome,'2026-11-10');
   assert(event.data().expiresAt instanceof admin.firestore.Timestamp);
   assert.equal(event.data().expiresAt.toMillis(),now()+evidence.RETENTION_DAYS*86400000);
  }
  console.log('[OK] Synthetic Firestore transaction '+type+': '+result+' ledgerEvents='+events.size);
 }finally{
  await Promise.allSettled([db.recursiveDelete(refs.profile),refs.request.delete(),db.recursiveDelete(refs.data)]);
 }
}
async function main(){
 try{
  await verify('successful',null);
  await verify('already-absent','auth/user-not-found');
  await verify('auth-denied','auth/insufficient-permission');
  const total=await evidence.summarize({db,project:evidence.TEST,from:'2026-11-10',toExclusive:'2026-11-11',asOf:'2026-11-12T12:00:00Z'});
  assert.equal(total.status,'SOURCE_OBSERVED');assert.equal(total.completed,2);
  const historical=await evidence.summarize({db,project:evidence.TEST,from:'2026-10-01',toExclusive:'2026-11-11',asOf:'2026-11-12T12:00:00Z'});
  assert.equal(historical.status,'N_D');assert.equal(historical.completed,null);
  console.log('[OK] A06.04 closed-period count=2 and incomplete history N/D, synthetic only');
  await Promise.all((await db.collection(evidence.COLLECTION).get()).docs.map(row=>row.ref.delete()));
  console.log('[OK] Firestore emulator 3 scenarios, 0 real Auth/Storage operations');
 }finally{await app.delete();}
}
main().catch(e=>{console.error('[STOP] '+String(e.message||e));process.exitCode=1;});
