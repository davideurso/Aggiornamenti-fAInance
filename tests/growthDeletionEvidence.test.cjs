'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const mod=require('../functions/growthDeletionEvidence.cjs');
const marker='FAKE_SERVER_TIMESTAMP';
test('A06 event has no UID/email/username or stable account-derived identifier',()=>{
 const event=mod.payload(Date.parse('2026-11-07T00:15:00Z'),()=>marker);
 assert.deepEqual(Object.keys(event).sort(),mod.FIELDS.slice().sort());
 assert.equal(event.periodDayRome,'2026-11-07');
 assert.equal(event.occurredAt,marker);
 for(const field of ['uid','hashedUid','email','username','amount','claim','requestId'])
  assert.equal(Object.hasOwn(event,field),false);
});
test('A06 server clock respects Rome DST without reusing UTC date',()=>{
 assert.equal(mod.dayRome(Date.parse('2026-10-24T22:30:00Z')),'2026-10-25');
 assert.equal(mod.dayRome(Date.parse('2026-10-25T23:30:00Z')),'2026-10-26');
});
test('A06 append cannot use Production, unknown server clock or invalid claim',async()=>{
 const db={collection:()=>({doc:()=>({path:'growthDeletionEventsTest/random'})}),runTransaction:()=>{throw Error('MUST_NOT_RUN')}};
 await assert.rejects(mod.appendConfirmed({db,project:'fainance-a7794'}),/DELETION_TEST_ONLY/);
 await assert.rejects(mod.appendConfirmed({db,project:mod.TEST,requestRef:{},
   claim:'bad-claim',now:Date.now,serverTimestamp:()=>marker}),/DELETION_SCOPE_INVALID/);
});
test('A06 append succeeds only with processing claim and transactional request removal',async()=>{
 const path='accountDeletionRequests/synthetic',requestRef={path};
 let existing={status:'processing',processingClaim:'f91c0ce0-0dd9-4406-a64c-5f37e03215b3'};
 let saved=null,deleted=false;
 const db={collection:collection=>{
  assert.equal(collection,mod.COLLECTION);
  return{doc:()=>({path:collection+'/opaque-random'})};
 },runTransaction:async work=>{
  const changes=[];
  const tx={
   get:async()=>({exists:!!existing,data:()=>existing}),
   create:(ref,payload)=>changes.push(()=>{saved={ref,payload};}),
   delete:ref=>changes.push(()=>{assert.equal(ref,requestRef);existing=null;deleted=true;}),
  };
  await work(tx);
  changes.forEach(fn=>fn());
 }};
 assert.equal(await mod.appendConfirmed({db,project:mod.TEST,requestRef,
  claim:'f91c0ce0-0dd9-4406-a64c-5f37e03215b3',
  now:()=>Date.parse('2026-11-10T08:00:00Z'),serverTimestamp:()=>marker}),true);
 assert(saved&&deleted);
 assert.equal(saved.payload.app,'fAInance');
 assert.equal(saved.payload.periodDayRome,'2026-11-10');
 assert.equal(saved.payload.occurredAt,marker);
 await assert.rejects(mod.appendConfirmed({db,project:mod.TEST,requestRef,
  claim:'f91c0ce0-0dd9-4406-a64c-5f37e03215b3',
  now:()=>Date.parse('2026-11-10T08:00:00Z'),serverTimestamp:()=>marker}),/DELETION_CLAIM_CHANGED/);
});
test('A06 incomplete historical or open period always returns N/D',async()=>{
 const db={collection:()=>{throw Error('SHOULD_NOT_QUERY')}};
 let s=await mod.summarize({db,project:mod.TEST,from:'2026-11-01',toExclusive:'2026-11-09',
  asOf:'2026-11-15T10:00:00Z'});
 assert.equal(s.status,'N_D');assert.equal(s.completed,null);assert.equal(s.reason,'HISTORICAL_SOURCE_NOT_RECORDED');
 s=await mod.summarize({db,project:mod.TEST,from:'2026-11-08',toExclusive:'2026-11-16',
  asOf:'2026-11-15T10:00:00Z'});
 assert.equal(s.status,'N_D');assert.equal(s.reason,'PERIOD_NOT_CLOSED');
});
test('A06 source count is allowed only on an explicitly covered Test closed period',async()=>{
 const calls=[];
 const query={where:(field,op,value)=>{calls.push([field,op,value]);return query;},
  count:()=>({get:async()=>({data:()=>({count:3})})})};
 const db={collection:name=>{assert.equal(name,mod.COLLECTION);return query;}};
 const r=await mod.summarize({db,project:mod.TEST,from:'2026-11-08',toExclusive:'2026-11-10',
  asOf:'2026-11-11T13:00:00Z'});
 assert.equal(r.status,'SOURCE_OBSERVED');assert.equal(r.completed,3);assert.equal(r.complete,true);
 assert.equal(r.numericExportAllowed,false);assert.equal(r.productionQualified,false);
 assert.deepEqual(calls,[['periodDayRome','>=','2026-11-08'],['periodDayRome','<','2026-11-10']]);
});
test('A06 unavailable query fails closed, never returns fabricated zero',async()=>{
 const db={collection:()=>{throw Error('unavailable')}};
 const r=await mod.summarize({db,project:mod.TEST,from:'2026-11-08',toExclusive:'2026-11-09',
  asOf:'2026-11-11T10:00:00Z'});
 assert.equal(r.status,'N_D');assert.equal(r.completed,null);assert.equal(r.reason,'SERVER_SOURCE_UNAVAILABLE');
});
