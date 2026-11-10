'use strict';
// A06.03 — strictly synthetic verification of the ACTUAL fAInance Test
// deletion worker module. No Firebase SDK initialized, real users, or network.
const test=require('node:test');
const assert=require('node:assert/strict');
const {deletionEligible,createMaintenance,assertProject}=require('../functions/fainanceMaintenance.cjs');
const UID='synthetic-test-owner';
const AT=Date.parse('2026-11-07T00:00:00.000Z');
const REQUEST={uid:UID,status:'pending',
  requestedAt:'2026-10-01T10:00:00.000Z',
  scheduledAt:'2026-10-17T10:00:00.000Z',graceDays:15};
const PROFILE={deletionStatus:'pending',deletionGraceDays:15,
  deletionRequestedAt:REQUEST.requestedAt,deletionScheduledAt:REQUEST.scheduledAt};
function environment({request=REQUEST,profile=PROFILE,authError,storageError,now=AT,onDelete}={}){
 let eventId=0;
 const data=new Map([
  ['accountDeletionRequests/'+UID,structuredClone(request)],
  ['users/'+UID,structuredClone(profile)],
  ['userData/'+UID,{expenses:[{amount:17}]}],
 ]);
 const events=[],logs=[];
 function doc(path){
  return {path,id:path.split('/').at(-1),
   get:async()=>snapshot(path),
   update:async patch=>{assert(data.has(path));data.set(path,{...data.get(path),...patch});events.push('update:'+path)},
   delete:async()=>{data.delete(path);events.push('delete:'+path)}};
 }
 function snapshot(path){const value=data.get(path);return{exists:value!==undefined,data:()=>value,id:path.split('/').at(-1),ref:doc(path)};}
 function collection(path){
  return {path,
   doc:id=>doc(path+'/'+(id||'synthetic-event-'+(++eventId))),
   where:(_field,_op,_value)=>{const query={get:async()=>({empty:true,docs:[],size:0}),limit:()=>query};return query;},
   get:async()=>({empty:true,docs:[],size:0}),
  };
 }
 const db={
  collection,
  recursiveDelete:async ref=>{events.push('recursive:'+ref.path);data.delete(ref.path);if(onDelete)onDelete(ref.path,data);},
  runTransaction:async work=>{
   const changes=[];
   const tx={get:async ref=>snapshot(ref.path),
    update:(ref,patch)=>changes.push(()=>{data.set(ref.path,{...data.get(ref.path),...patch});events.push('txUpdate:'+ref.path)}),
    create:(ref,payload)=>changes.push(()=>{assert(!data.has(ref.path));data.set(ref.path,structuredClone(payload));events.push('txCreate:'+ref.path)}),
    delete:ref=>changes.push(()=>{data.delete(ref.path);events.push('txDelete:'+ref.path)})};
   const r=await work(tx);changes.forEach(fn=>fn());return r;
  },
  batch:()=>{throw Error('UNEXPECTED_BATCH')},
 };
 const auth={deleteUser:async uid=>{assert.equal(uid,UID);events.push('auth.deleteUser');if(authError)throw Object.assign(Error('synthetic'),{code:authError});}};
 const storage={bucket:()=>({exists:async()=>{if(storageError)throw Error('SYNTHETIC_STORAGE_ERROR');return [false]},
  deleteFiles:()=>{throw Error('UNEXPECTED_BUCKET_DELETE')}})};
 const log={info:(code,value)=>logs.push({level:'info',code,value}),error:(code,value)=>logs.push({level:'error',code,value})};
 const api=createMaintenance({db,auth,storage,project:'fainance-test-20260823195207',now:()=>now,log,
  serverTimestamp:()=>new Date(now).toISOString()});
 return{api,data,events,logs};
}
test('A06.03: worker project safety rejects arbitrary environments',()=>{
 assert.throws(()=>assertProject('mundely-47cc8'),/UNEXPECTED_FAINANCE_PROJECT/);
 assert.throws(()=>assertProject('unknown'),/UNEXPECTED_FAINANCE_PROJECT/);
});
test('A06.03: account deletion cannot be advanced before 15-day grace',()=>{
 const pending={...REQUEST,scheduledAt:'2026-10-07T10:00:00.000Z'};
 assert.equal(deletionEligible(UID,pending,{...PROFILE,deletionScheduledAt:pending.scheduledAt},AT),false);
 assert.equal(deletionEligible(UID,REQUEST,PROFILE,AT),true);
});
test('A06.03: cancelled, mismatched and invalid owner never eligible',()=>{
 assert.equal(deletionEligible(UID,REQUEST,{...PROFILE,deletionCancelledAt:'2026-10-08'},AT),false);
 assert.equal(deletionEligible(UID,{...REQUEST,status:'cancelled'},PROFILE,AT),false);
 assert.equal(deletionEligible('other',REQUEST,PROFILE,AT),false);
});
test('A06.03: happy path completes only after authoritative Firebase Auth confirmation',async()=>{
 const h=environment();
 assert.equal(await h.api.processOne(UID),'completed');
 assert(!h.data.has('users/'+UID));
 assert(!h.data.has('accountDeletionRequests/'+UID));
 assert(!h.data.has('userData/'+UID));
 const n=h.events.indexOf('auth.deleteUser'),root=h.events.indexOf('recursive:users/'+UID);
 assert(n>=0&&root>n);
 assert(!h.logs.some(x=>x.level==='error'));
});
test('A06.03: Auth user-not-found is an idempotent confirmed absence',async()=>{
 const h=environment({authError:'auth/user-not-found'});
 assert.equal(await h.api.processOne(UID),'completed');
 assert(!h.data.has('accountDeletionRequests/'+UID));
 assert(h.events.includes('auth.deleteUser'));
});
test('A06.03: Auth permission failure never becomes completed',async()=>{
 const h=environment({authError:'auth/insufficient-permission'});
 assert.equal(await h.api.processOne(UID),'needs_review');
 assert.equal(h.data.get('accountDeletionRequests/'+UID).status,'needs_review');
 assert(h.data.has('accountDeletionRequests/'+UID));
 assert(!h.events.includes('recursive:users/'+UID));
 assert(h.logs.some(x=>x.level==='error'&&x.code==='account_deletion_requires_review'));
});
test('A06.03: unknown Auth failure does not get silently swallowed',async()=>{
 const h=environment({authError:'auth/internal-error'});
 assert.equal(await h.api.processOne(UID),'needs_review');
 assert.equal(h.data.get('accountDeletionRequests/'+UID).status,'needs_review');
 assert(!h.events.includes('recursive:users/'+UID));
});
test('A06.03: storage failure blocks Auth deletion and leaves reviewable claim',async()=>{
 const h=environment({storageError:true});
 assert.equal(await h.api.processOne(UID),'needs_review');
 assert.equal(h.data.get('accountDeletionRequests/'+UID).status,'needs_review');
 assert(!h.events.includes('auth.deleteUser'));
});
test('A06.03: cancellation mid-deletion cannot be reported as success',async()=>{
 const h=environment({onDelete:(path,data)=>{if(path==='userData/'+UID){
  data.set('users/'+UID,{...data.get('users/'+UID),deletionCancelledAt:'2026-11-06T01:00:00Z'});
 }}});
 assert.equal(await h.api.processOne(UID),'needs_review');
 assert.equal(h.data.get('accountDeletionRequests/'+UID).status,'needs_review');
 assert(!h.events.includes('auth.deleteUser'));
});
test('A06.03: ineligible profile causes neither auth nor Firestore mutation',async()=>{
 const h=environment({profile:{...PROFILE,deletionStatus:'active'}});
 assert.equal(await h.api.processOne(UID),'skipped');
 assert.equal(h.events.length,0);
 assert(h.data.has('accountDeletionRequests/'+UID));
});
