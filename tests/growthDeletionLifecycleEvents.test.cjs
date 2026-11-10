'use strict';
// A06: strictly synthetic Test-only request/revocation/Auth deletion flow.
// No Firebase client, no network, no real or production account.
const test=require('node:test'),assert=require('node:assert/strict');
const mod=require('../functions/growthDeletionLifecycleEvents.cjs');
const time='2026-11-09T09:15:00Z';
const project=mod.TEST;
const serverTimestamp=()=>({kind:'SERVER_CLOCK'});
const uid='synthetic-test-owner'; // NEVER stored
function dbFake(){
 const data=new Map(),events=[];
 return{
  data,events,
  collection:name=>{
   assert.equal(name,mod.COLLECTION);
   return{doc:id=>({
    id,
    create:async v=>{
     if(data.has(id))throw Object.assign(Error('already exists'),{code:6});
     data.set(id,structuredClone(v));events.push('created');return v;
    }
   })};
  }
 };
}
function requestEvent({
 id='evt-00000001',when=time,from=null,to='pending',stamp='2026-11-09T09:14:30Z',
 pathUid=uid,recordUid=uid,
}={}){
 const previous=from?{uid,status:from,requestedAt:'2026-10-01T09:00:00Z'}:null;
 const current={uid:recordUid,status:to,updatedAt:stamp,
  requestedAt:stamp,scheduledAt:new Date(Date.parse(stamp)+15*86400000).toISOString(),
  graceDays:15,cancelledAt:to==='cancelled'?stamp:undefined};
 return {id,time:when,params:{uid:pathUid},
  data:{before:{exists:!!previous,data:()=>previous},
    after:{exists:true,data:()=>current}}};
}
function queryDb(entries){
 const items=entries.map(v=>({data:()=>v}));
 const calls=[],q={
  where:(f,o,v)=>{calls.push(['where',f,o,v]);return q;},
  select:(...v)=>{calls.push(['select',...v]);return q;},
  limit:n=>{calls.push(['limit',n]);return q;},
  get:async()=>({docs:items}),
 };
 return{calls,collection:name=>{assert.equal(name,mod.COLLECTION);return q}};
}
test('A06 lifecycle event schema contains no account identity or private data',()=>{
 const event=mod.makeEvent({kind:mod.TYPES.confirmed,time,serverTimestamp});
 assert.deepEqual(Object.keys(event).sort(),['schemaVersion','eventType','app','environment','source','periodDayRome','occurredAt','expiresAt'].sort());
 assert.equal(event.periodDayRome,'2026-11-09');
 assert(!JSON.stringify(event).includes(uid));
 for(const k of ['uid','account','email','username','hashUid','requestId','token'])
  assert(!Object.hasOwn(event,k));
});
test('A06 events never allow Production or invalid provider time',async()=>{
 const db=dbFake();
 await assert.rejects(mod.appendEvent({db,project:'fainance-a7794',kind:mod.TYPES.confirmed,
  eventId:'event-0001',time,serverTimestamp}),/A06_TEST_ONLY/);
 await assert.rejects(mod.appendEvent({db,project,kind:mod.TYPES.confirmed,
  eventId:'event-0002',time:'fake',serverTimestamp}),/A06_EVENT_TIME_INVALID/);
 assert.equal(db.data.size,0);
});
test('A06 Auth deletion writes one durable event and deduplicates retry',async()=>{
 const db=dbFake();
 const args={db,project,eventId:'auth-event-12345',time,serverTimestamp};
 assert.equal(await mod.observedAuthDeletion(args),true);
 assert.equal(await mod.observedAuthDeletion(args),false);
 assert.equal(db.data.size,1);
 const row=[...db.data.values()][0];
 assert.equal(row.eventType,mod.TYPES.confirmed);
 assert.equal(row.source,mod.SOURCE_AUTH);
 assert(!JSON.stringify([...db.data]).includes(uid));
});
test('A06 Firestore pending request and cancellation each count once',async()=>{
 const db=dbFake();
 const requested=requestEvent();
 assert.equal(await mod.observedRequest({db,project,event:requested,serverTimestamp}),true);
 assert.equal(await mod.observedRequest({db,project,event:requested,serverTimestamp}),false);
 const cancelled=requestEvent({id:'evt-00000002',from:'pending',to:'cancelled'});
 assert.equal(await mod.observedRequest({db,project,event:cancelled,serverTimestamp}),true);
 assert.equal(db.data.size,2);
 assert.deepEqual([...db.data.values()].map(x=>x.eventType).sort(),
  [mod.TYPES.requested,mod.TYPES.revoked].sort());
});
test('A06 real Test client clock drift after separate Date.now calls is counted',()=>{
 const r={status:'pending',requestedAt:'2026-11-09T09:00:00.000Z',
  scheduledAt:'2026-11-24T09:00:00.025Z',graceDays:15};
 assert.equal(mod.transition(null,r),mod.TYPES.requested);
 assert.equal(mod.transition(null,{...r,scheduledAt:'2026-11-24T09:10:00.000Z'}),null);
});

test('A06 unchanged pending, unrelated owner, canceled without pending do not count',async()=>{
 const db=dbFake();
 for(const e of [
  requestEvent({id:'evt-00000003',from:'pending',to:'pending'}),
  requestEvent({id:'evt-00000004',pathUid:'other'}),
  requestEvent({id:'evt-00000005',from:null,to:'cancelled'}),
  requestEvent({id:'evt-00000006',from:'cancelled',to:'cancelled'}),
 ]){
  assert.equal(await mod.observedRequest({db,project,event:e,serverTimestamp}),false);
 }
 assert.equal(db.data.size,0);
});
test('A06 retry after transient database failure cannot emit phantom success',async()=>{
 const db={collection:()=>({doc:()=>({create:async()=>{throw Object.assign(Error('unavailable'),{code:14});}})})};
 await assert.rejects(mod.observedAuthDeletion({db,project,eventId:'auth-event-12345',
  time,serverTimestamp}),/unavailable/);
});
test('A06 closed verified source counts three independent event flows only',async()=>{
 const db=queryDb([
  {eventType:mod.TYPES.confirmed,source:mod.SOURCE_AUTH},
  {eventType:mod.TYPES.confirmed,source:mod.SOURCE_AUTH},
  {eventType:mod.TYPES.requested,source:mod.SOURCE_REQUEST},
  {eventType:mod.TYPES.revoked,source:mod.SOURCE_REQUEST},
  {eventType:mod.TYPES.confirmed,source:'processDueAccountDeletions'}, // exclude old writer duplicate
 ]);
 const r=await mod.summarize({db,project,from:'2026-11-08',toExclusive:'2026-11-10',
  asOf:'2026-11-11T08:00:00Z'});
 assert.equal(r.status,'SOURCE_OBSERVED');
 assert.deepEqual([r.completed,r.pending,r.revoked],[2,1,1]);
 assert.equal(r.productionQualified,false);
 assert.equal(r.numericExportAllowed,false);
 assert(db.calls.some(x=>x[0]==='limit'&&x[1]===10001));
});
test('A06 no events in a fully covered closed Test period yields real 0',async()=>{
 const r=await mod.summarize({db:queryDb([]),project,
  from:'2026-11-08',toExclusive:'2026-11-09',asOf:'2026-11-10T10:00:00Z'});
 assert.deepEqual([r.completed,r.pending,r.revoked],[0,0,0]);
 assert.equal(r.status,'SOURCE_OBSERVED');
});
test('A06 missing history/open period/unexpected source/error remain N/D',async()=>{
 const errorDb={collection:()=>{throw Error('unavailable')}};
 for(const args of [
  {from:'2026-11-07',toExclusive:'2026-11-09',asOf:'2026-11-10T10:00:00Z'},
  {from:'2026-11-08',toExclusive:'2026-11-11',asOf:'2026-11-10T10:00:00Z'},
  {from:'2026-11-08',toExclusive:'2026-11-09',asOf:'2026-11-10T10:00:00Z'},
 ]){
  const r=await mod.summarize({db:errorDb,project,...args});
  assert.equal(r.status,'N_D');
  assert.equal(r.completed,null);
  assert.equal(r.pending,null);
  assert.equal(r.revoked,null);
 }
 const r=await mod.summarize({db:queryDb([{eventType:mod.TYPES.confirmed,source:'unknown'}]),
  project,from:'2026-11-08',toExclusive:'2026-11-09',asOf:'2026-11-10T10:00:00Z'});
 assert.equal(r.status,'N_D');
});
