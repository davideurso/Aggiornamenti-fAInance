'use strict';
// A06 Production contract: completely synthetic, no credentials or network.
// Both source events and the output HTTP schema are verified fail-closed.
const test=require('node:test');
const assert=require('node:assert/strict');
const engine=require('../functions/growthDeletionProduction.cjs');
const http=require('../functions/growthDeletionProductionHttp.cjs');
const PROD='fainance-a7794';
const FROM='2026-11-09',TO='2026-11-10';
const CLOCK='2026-11-11T12:00:00.000Z';
const stamp=()=>({server:true});
const request=(uid='synthetic-test-user')=>({
  uid,status:'pending',requestedAt:'2026-11-01T10:00:00.000Z',
  scheduledAt:'2026-11-16T10:00:00.000Z',graceDays:15
});
function fake(){
 const docs=new Map();
 const collection={
  doc:id=>({id,async create(value){
    if(docs.has(id))throw Object.assign(Error('replay'),{code:6});
    docs.set(id,value);
  }}),
  where:(field,op,val)=>{
    assert.equal(field,'periodDayRome');
    assert.equal(op,'>=');
    return {
      where:(second,compare,end)=>{
        assert.equal(second,'periodDayRome');assert.equal(compare,'<');
        return {
          select:(...fields)=>{
            assert.deepEqual(fields,['eventType','source']);
            return {limit:n=>{
              assert.equal(n,10001);
              return {get:async()=>({docs:[...docs.values()]
                .filter(v=>v.periodDayRome>=val&&v.periodDayRome<end)
                .map(v=>({data:()=>v}))})};
            }};
          }
        };
      }
    };
  }
 };
 return {docs,db:{collection:name=>{
   assert.equal(name,engine.COLLECTION);return collection;
 }}};
}
test('Production project identity and period guards cannot be bypassed',async()=>{
 const f=fake();
 await assert.rejects(()=>engine.append({db:f.db,project:'fainance-test-20260823195207',
   eventId:'provider_evt_1234',type:engine.EVENT_TYPES.deleted,time:CLOCK,serverTimestamp:stamp}),/A06_PRODUCTION_PROJECT_REQUIRED/);
 await assert.rejects(()=>engine.summarize({db:f.db,project:PROD,from:'2026-11-39',
   toExclusive:TO,asOf:CLOCK}),/A06_PERIOD_INVALID/);
});
test('Rome day conversion handles winter and summer clock transitions',()=>{
 assert.equal(engine.dayRome(Date.parse('2026-11-07T23:45:00Z')),'2026-11-08');
 assert.equal(engine.dayRome(Date.parse('2026-07-01T22:05:00Z')),'2026-07-02');
});
test('Only Firestore provider IDs are used as replay identity; no account key is retained',async()=>{
 const f=fake();
 const opts={db:f.db,project:PROD,eventId:'provider_event_012345',
   type:engine.EVENT_TYPES.deleted,time:'2026-11-09T14:00:00Z',serverTimestamp:stamp};
 assert.equal(await engine.append(opts),true);
 assert.equal(await engine.append(opts),false);
 assert.equal(f.docs.size,1);
 const [id,value]=[...f.docs][0];
 assert(!id.includes('synthetic')&&!JSON.stringify(value).includes('uid'));
 assert.deepEqual(Object.keys(value).sort(),[
   'app','environment','eventType','expiresAt','occurredAt',
   'periodDayRome','schemaVersion','source'
 ].sort());
 assert(value.expiresAt instanceof Date);
 assert.equal(value.periodDayRome,'2026-11-09');
});
test('Failed Firestore event write is not swallowed or mistaken for a duplicate',async()=>{
 const db={collection:()=>({doc:()=>({create:async()=>{throw Error('permission denied');}})})};
 await assert.rejects(()=>engine.append({db,project:PROD,eventId:'provider_event_error',
   type:engine.EVENT_TYPES.deleted,time:CLOCK,serverTimestamp:stamp}),/permission denied/);
});
test('Request status transitions require 15-day grace and confirmed cancellation',()=>{
 const r=request();
 assert.equal(engine.transition(null,r),engine.EVENT_TYPES.requested);
 assert.equal(engine.transition(null,{...r,scheduledAt:'2026-11-16T10:00:00.041Z'}),engine.EVENT_TYPES.requested);
 assert.equal(engine.transition(null,{...r,scheduledAt:'2026-11-16T10:10:00.000Z'}),null);
 assert.equal(engine.transition({...r,status:'cancelled'},r),engine.EVENT_TYPES.requested);
 assert.equal(engine.transition(r,{...r,status:'pending'}),null);
 assert.equal(engine.transition(null,{...r,graceDays:7}),null);
 assert.equal(engine.transition(null,{...r,scheduledAt:'2026-11-14T10:00:00Z'}),null);
 assert.equal(engine.transition(r,{...r,status:'cancelled',cancelledAt:CLOCK}),engine.EVENT_TYPES.revoked);
 assert.equal(engine.transition(r,{...r,status:'cancelled'}),null);
 assert.equal(engine.transition(r,null),null);
});
test('Request observer creates only confirmed transitions and never writes UID',async()=>{
 const f=fake(),uid='synthetic-test-user';
 const r=request(uid);
 const event={id:'provider_request_12345',time:'2026-11-09T10:10:00Z',params:{uid},
   data:{before:{exists:false},after:{exists:true,data:()=>r}}};
 assert.equal(await engine.observedRequest({db:f.db,project:PROD,event,serverTimestamp:stamp}),true);
 assert.equal(await engine.observedRequest({db:f.db,project:PROD,event,serverTimestamp:stamp}),false);
 assert.equal(f.docs.size,1);
 assert(!JSON.stringify([...f.docs.values()][0]).includes(uid));
});
test('Auth observer is a separate authoritative source and replays idempotently',async()=>{
 const f=fake();
 const args={db:f.db,project:PROD,eventId:'firebase_auth_event_12345',
  time:'2026-11-09T12:00:00Z',serverTimestamp:stamp};
 assert.equal(await engine.observedAuthDeletion(args),true);
 assert.equal(await engine.observedAuthDeletion(args),false);
 const value=[...f.docs.values()][0];
 assert.equal(value.source,engine.SOURCES.auth);
 assert.equal(value.eventType,engine.EVENT_TYPES.deleted);
});
test('First full covered day aggregates all three event types',async()=>{
 const f=fake();
 await engine.append({db:f.db,project:PROD,eventId:'a06_deleted_event_01',
  type:engine.EVENT_TYPES.deleted,time:'2026-11-09T07:00:00Z',serverTimestamp:stamp});
 await engine.append({db:f.db,project:PROD,eventId:'a06_request_event_02',
  type:engine.EVENT_TYPES.requested,time:'2026-11-09T08:00:00Z',serverTimestamp:stamp});
 await engine.append({db:f.db,project:PROD,eventId:'a06_revoked_event_03',
  type:engine.EVENT_TYPES.revoked,time:'2026-11-09T09:00:00Z',serverTimestamp:stamp});
 const actual=await engine.summarize({db:f.db,project:PROD,from:FROM,toExclusive:TO,asOf:CLOCK});
 assert.equal(actual.status,'SOURCE_COMPLETE');
 assert.deepEqual([actual.completed,actual.pending,actual.revoked],[1,1,1]);
 assert.equal(actual.productionQualified,true);
 assert.equal(actual.numericExportAllowed,true);
});
test('Empty real completed period is zero ONLY with valid source and full coverage',async()=>{
 const f=fake();
 const actual=await engine.summarize({db:f.db,project:PROD,from:FROM,toExclusive:TO,asOf:CLOCK});
 assert.equal(actual.status,'SOURCE_COMPLETE');
 assert.deepEqual([actual.completed,actual.pending,actual.revoked],[0,0,0]);
 const old=await engine.summarize({db:f.db,project:PROD,from:'2026-11-08',toExclusive:FROM,asOf:CLOCK});
 assert.equal(old.status,'N_D');assert.equal(old.completed,null);
});
test('Out-of-bounds retention/period and malformed events never become 0',async()=>{
 const f=fake();
 const late=await engine.summarize({db:f.db,project:PROD,from:FROM,toExclusive:TO,asOf:'2028-11-11T12:00:00Z'});
 assert.equal(late.status,'N_D');
 const early=await engine.summarize({db:f.db,project:PROD,from:FROM,toExclusive:TO,asOf:'2026-11-09T12:00:00Z'});
 assert.equal(early.status,'N_D');
 f.docs.set('unqualified',{eventType:'UNKNOWN',source:'invalid',periodDayRome:FROM});
 const invalid=await engine.summarize({db:f.db,project:PROD,from:FROM,toExclusive:TO,asOf:CLOCK});
 assert.equal(invalid.status,'N_D');assert.equal(invalid.numericExportAllowed,false);
});
test('HTTP source discloses only qualified server envelope, not private fields',async()=>{
 const f=fake();
 const complete=await engine.summarize({db:f.db,project:PROD,from:FROM,toExclusive:TO,asOf:CLOCK});
 assert.equal(http.validateReport(complete,{from:FROM,toExclusive:TO}),complete);
 assert.throws(()=>http.validateReport({...complete,uid:'private'},{
   from:FROM,toExclusive:TO}),/A06_PRODUCTION_REPORT_INVALID/);
 assert.throws(()=>http.validateReport({...complete,completed:null},{
   from:FROM,toExclusive:TO}),/A06_PRODUCTION_COUNT_UNQUALIFIED/);
 const unavailable={...complete,status:'N_D',complete:false,productionQualified:false,
  numericExportAllowed:false,completed:null,pending:null,revoked:null};
 assert.equal(http.validateReport(unavailable,{from:FROM,toExclusive:TO}),unavailable);
});
test('HTTP malformed requests rejected, incorrect Prod configuration denied',async()=>{
 assert.throws(()=>http.handler({project:'fainance-test-20260823195207',db:{}}),/A06_PRODUCTION_ONLY/);
 const f=fake();
 const call=http.handler({db:f.db,project:PROD,now:()=>CLOCK});
 const state={statusCode:null,payload:null,headers:{}};
 const res={set:(k,v)=>{state.headers[k]=v;return res;},
  status:c=>{state.statusCode=c;return res;},
  json:x=>{state.payload=x;return res;}};
 await call({method:'GET',body:{}},res);assert.equal(state.statusCode,405);
 await call({method:'POST',body:{from:FROM,toExclusive:TO,uid:'unauthorized'}},res);
 assert.equal(state.statusCode,400);
 await call({method:'POST',body:{from:FROM,toExclusive:TO}},res);
 assert.equal(state.statusCode,200);
 assert.equal(state.payload.status,'SOURCE_COMPLETE');
 assert.equal(state.headers['Cache-Control'],'no-store');
});
