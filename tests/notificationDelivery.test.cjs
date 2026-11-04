const {test}=require('node:test');const a=require('node:assert/strict');const path=require('node:path');
const root=process.env.FAINANCE_SOURCE||path.resolve(__dirname,'..');const {createDelivery}=require(path.join(root,'backend/fainance-notifications-functions/notificationDelivery.cjs'));const {due,expand,createScheduler}=require(path.join(root,'backend/fainance-notifications-functions/notificationSchedule.cjs'));
class DB{
 constructor(){this.rows=new Map();this.queue=Promise.resolve();}
 collection(c){const db=this;const q=(filters=[])=>({doc(id){return db.ref(c+'/'+id)},where(k,op,v){return q([...filters,[k,v]])},orderBy(){return this},limit(){return this},startAfter(){return this},async get(){const docs=[...db.rows].filter(([k,d])=>k.startsWith(c+'/')&&filters.every(([f,v])=>d[f]===v)).map(([k])=>db.snap(k));return {docs,size:docs.length,empty:!docs.length}}});return q();}
 ref(k){const db=this;return {id:k.split('/').pop(),path:k,async get(){return db.snap(k)},async set(d,o){db.rows.set(k,o?.merge?{...db.rows.get(k),...d}:d)},async update(d){if(!db.rows.has(k))throw Error('missing');db.rows.set(k,{...db.rows.get(k),...d})}};}
 snap(k){return {id:k.split('/').pop(),exists:this.rows.has(k),ref:this.ref(k),data:()=>this.rows.get(k)}}
 runTransaction(fn){const next=this.queue.then(()=>fn({get:r=>r.get(),set:(r,d,o)=>r.set(d,o),create:(r,d)=>{a.equal(this.rows.has(r.path),false);this.rows.set(r.path,d)}}));this.queue=next.catch(()=>{});return next;}
}
function fixture(mode='push_email'){
 const db=new DB();db.rows.set('appNotifications/n',{targetUid:'u',title:'Test',message:'Test',type:'custom_reminder',status:'active'});db.rows.set('notificationProfiles/u',{channels:{custom:mode}});db.rows.set('pushDevices/old',{targetUid:'u',token:'same',active:true});db.rows.set('pushDevices/new',{uid:'u',token:'same',active:true});
 let pushes=0,emails=0;const runtime=createDelivery({db,messaging:{async send(){pushes++;return 'fcm-id'}},auth:{async getUser(){return {email:'self@example.test',emailVerified:true}}},emailFrom:()=> 'App <info@example.test>',emailKey:()=> 'test',fetcher:async()=>{emails++;return {ok:true,async json(){return {id:'email-id'}}}}});
 return {db,runtime,counts:()=>[pushes,emails]};
}
test('all five channel choices, duplicate tokens and replay',async()=>{for(const [mode,expected]of [['off',[0,0]],['in_app',[0,0]],['push',[1,0]],['email',[0,1]],['push_email',[1,1]]]){const f=fixture(mode);await f.runtime.deliver('n');await f.runtime.deliver('n');a.deepEqual(f.counts(),expected);}});
test('concurrent invocation cannot duplicate accepted deliveries',async()=>{const f=fixture();await Promise.all([f.runtime.deliver('n'),f.runtime.deliver('n')]);a.deepEqual(f.counts(),[1,1]);});
test('deleted/expired notifications never send',async()=>{const f=fixture();f.db.rows.get('appNotifications/n').status='deleted';await f.runtime.deliver('n');a.deepEqual(f.counts(),[0,0]);});
test('missing verified sender is explicit, never sent',async()=>{const f=fixture('email');const d=createDelivery({db:f.db,emailFrom:()=>'',emailKey:()=>'',auth:{},messaging:{}});await d.deliver('n');a.equal([...f.db.rows.values()].find(d=>d.channel==='email').state,'BLOCKED');});
test('FCM acceptance does not assert device delivery',async()=>{const f=fixture('push');await f.runtime.deliver('n');const r=[...f.db.rows.values()].find(x=>x.channel?.startsWith('push:'));a.equal(r.state,'ACCEPTED');a.equal(r.deliveryConfirmed,false);});
test('calendar rules clamp month end and respect timezone, leap year, DST',()=>{
 const r={id:'r',title:'x',freq:'monthly',dayOfMonth:31,hour:'09:00'};a.equal(due(r,Date.parse('2026-02-28T08:00Z'),'Europe/Rome'),'2026-02-28T09:00');a.equal(due(r,Date.parse('2026-02-27T08:00Z'),'Europe/Rome'),null);
 a.equal(due({...r,freq:'yearly',date:'2024-02-29'},Date.parse('2028-02-29T08:00Z'),'Europe/Rome'),'2028-02-29T09:00');
 a.equal(due({...r,freq:'daily',hour:'02:30'},Date.parse('2026-10-25T00:30Z'),'Europe/Rome'),due({...r,freq:'daily',hour:'02:30'},Date.parse('2026-10-25T01:30Z'),'Europe/Rome'));
 a.equal(due({...r,active:false},Date.parse('2026-02-28T08:00Z'),'Europe/Rome'),null);
});
test('scheduler replay or physical deletion cannot resurrect occurrence',async()=>{const db=new DB(),now=()=>Date.parse('2026-10-25T08:00:00Z');db.rows.set('userData/u',{customNotifs:[{id:'r',title:'Test',text:'hello',freq:'daily',hour:'09:00'}],notifPrefs:{}});const run=createScheduler({db,now});await run();const keys=[...db.rows.keys()].filter(k=>k.startsWith('appNotifications/'));a.equal(keys.length,1);await run();a.equal([...db.rows.keys()].filter(k=>k.startsWith('appNotifications/')).length,1);db.rows.delete(keys[0]);await run();a.equal([...db.rows.keys()].filter(k=>k.startsWith('appNotifications/')).length,0);});
test('off schedule consumes occurrence without inbox or external side effects',async()=>{const db=new DB();db.rows.set('userData/u',{customNotifs:[{id:'r',title:'x',freq:'daily',hour:'09:00'}]});db.rows.set('notificationProfiles/u',{channels:{custom:'off'}});await createScheduler({db,now:()=>Date.parse('2026-10-25T08:00Z')})();a.equal([...db.rows.keys()].filter(k=>k.startsWith('appNotifications/')).length,0);});

test('current V6 schedules override stale legacy, including an explicit empty schedule',async()=>{
 const {gzipSync}=require('node:zlib');const {readScheduleState}=require(path.join(root,'backend/fainance-notifications-functions/notificationSchedule.cjs'));
 const db=new DB(),uid='u',rule={id:'r',title:'V6',freq:'daily',hour:'09:00'};
 function backup(rules){return {uid,reason:'user-state-authority-v6',encoding:'gzip-base64-json-v1',payload:gzipSync(JSON.stringify({uid,snapshot:{uid,kind:'user-state-authority-v6',schemaVersion:6,values:{custom_notifs_v1:JSON.stringify(rules),notif_prefs_v1:JSON.stringify({notificationChannels:{custom:'push_email'}})}}})).toString('base64')}}
 db.rows.set('users/u/backups/current',backup([rule]));a.equal((await readScheduleState(db,uid,{customNotifs:[]})).customNotifs[0].title,'V6');
 db.rows.set('users/u/backups/current',backup([]));a.deepEqual((await readScheduleState(db,uid,{customNotifs:[rule]})).customNotifs,[]);
});
test('profile plus V6 works without legacy userData, and malformed account cannot block another user',async()=>{
 const {gzipSync}=require('node:zlib');const db=new DB(),now=()=>Date.parse('2026-10-25T08:00Z');
 db.rows.set('notificationProfiles/u',{});db.rows.set('notificationProfiles/bad',{});db.rows.set('users/bad/backups/current',{uid:'bad',reason:'user-state-authority-v6',encoding:'bad'});
 db.rows.set('users/u/backups/current',{uid:'u',reason:'user-state-authority-v6',encoding:'gzip-base64-json-v1',payload:gzipSync(JSON.stringify({uid:'u',snapshot:{uid:'u',kind:'user-state-authority-v6',schemaVersion:6,values:{custom_notifs_v1:JSON.stringify([{id:'r',title:'V6',freq:'daily',hour:'09:00'}])}}})).toString('base64')});
 await createScheduler({db,now})();a.equal([...db.rows.keys()].filter(k=>k.startsWith('appNotifications/')).length,1);a.equal(db.rows.get('notificationProfiles/bad').scheduleStatus,'BLOCKED');
});
