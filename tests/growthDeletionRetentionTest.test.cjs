'use strict';
// A06.05 Test-only retention gate; uses synthetic event-time, never users.
const test=require('node:test'),assert=require('node:assert/strict');
const lifecycle=require('../functions/growthDeletionLifecycleEvents.cjs');
const worker=require('../functions/growthDeletionEvidence.cjs');
const DAY=86400000,RETENTION=400*DAY;
const eventAt='2026-11-09T09:15:00Z';
test('both Test event producers declare the identical fixed retention window',()=>{
 assert.equal(worker.RETENTION_DAYS,400);
 assert.equal(lifecycle.RETENTION_DAYS,400);
 assert.equal(lifecycle.COLLECTION,worker.COLLECTION);
});
test('confirmed auth, request and revoke events retain no personal identity and expire in 400 days',()=>{
 for(const kind of Object.values(lifecycle.TYPES)){
  const row=lifecycle.makeEvent({kind,time:eventAt,serverTimestamp:()=>('SERVER_TIME')});
  assert(row.expiresAt instanceof Date);
  assert.equal(row.expiresAt.getTime(),Date.parse(eventAt)+RETENTION);
  assert.equal(row.environment,'Test');
  assert.equal(row.periodDayRome,'2026-11-09');
  assert.equal(row.occurredAt,'SERVER_TIME');
  for(const forbidden of ['uid','email','phone','hashedUid','payload','token','claim']){
   assert(!Object.hasOwn(row,forbidden));
  }
 }
});
test('deletion worker transaction uses same TTL field and does not persist UID',()=>{
 const at=Date.parse('2026-11-10T07:30:00Z');
 const row=worker.payload(at,()=>('SERVER_TIME'));
 assert.deepEqual(Object.keys(row).sort(),worker.FIELDS.slice().sort());
 assert(row.expiresAt instanceof Date);
 assert.equal(row.expiresAt.getTime(),at+RETENTION);
 for(const forbidden of ['uid','email','hashedUid','token','requestId'])
  assert(!Object.hasOwn(row,forbidden));
});
test('both readers deny TTL-purged date ranges without querying Firestore',async()=>{
 const db={collection:()=>{throw Error('NEVER_QUERY_OUTSIDE_RETENTION')}};
 const args={db,project:worker.TEST,from:'2026-11-08',
  toExclusive:'2026-11-09',asOf:'2028-01-01T10:00:00Z'};
 const a=await worker.summarize(args);
 const b=await lifecycle.summarize(args);
 for(const r of [a,b]){
  assert.equal(r.status,'N_D');
  assert.equal(r.reason,'OUTSIDE_RETENTION_COVERAGE');
  assert.equal(r.completed,null);
  assert.equal(r.numericExportAllowed,false);
 }
});
test('fresh Test coverage still reads valid closed periods',async()=>{
 const query={where:()=>query,select:()=>query,limit:()=>query,
  get:async()=>({docs:[]}),count:()=>({get:async()=>({data:()=>({count:0})})})};
 const db={collection:()=>query};
 const args={db,project:worker.TEST,from:'2026-11-08',
  toExclusive:'2026-11-09',asOf:'2026-11-10T10:00:00Z'};
 assert.equal((await lifecycle.summarize(args)).status,'SOURCE_OBSERVED');
 assert.equal((await worker.summarize(args)).status,'SOURCE_OBSERVED');
});
