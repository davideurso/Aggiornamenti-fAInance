const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const channels=require('../backend/fainance-notifications-functions/notificationChannels.cjs');
test('system communication policy agrees across client and server for every channel',async()=>{
 const client=await import('../src/notifications/notificationChannels.mjs');
 for(const mode of ['off','in_app','push','email','push_email'])for(const type of ['admin_broadcast','admin_campaign','system_notice']){
  assert.equal(client.isSystemCommunication(type),true);assert.equal(channels.isSystemCommunication(type),true);
  assert.equal(client.notificationShowsInApp({service:mode},type),true);
  assert.equal(client.notificationAllowsPush({service:mode},type),['push','push_email'].includes(mode));
  assert.equal(client.notificationAllowsEmail({service:mode},type),['email','push_email'].includes(mode));
 }
 for(const type of ['custom_reminder','salary_reminder','expense_reminder','period_closure','spending_alert','share_invite','recurring_confirmation']){assert.equal(client.isSystemCommunication(type),false);assert.equal(channels.isSystemCommunication(type),false);}
});
test('actual authenticated deletion callable rejects system records and preserves personal tombstones',async()=>{
 const source=fs.readFileSync(require.resolve('../backend/fainance-notifications-functions/index.js'),'utf8');
 const code=source.slice(source.indexOf('exports.fainanceDeleteAppNotification ='),source.indexOf('exports.fainanceQueueAdminNotificationCampaign ='));
 for(const [type,owner,allowed]of [['admin_broadcast','u',false],['admin_campaign','u',false],['system_notice','u',false],['custom_reminder','u',true],['custom_reminder','other',false]]){
  let writes=0;const row={type,targetUid:owner,occurrenceId:'occurrence',status:'active'};
  const context={exports:{},REGION:'test',require:()=>channels,requireAuth:r=>{if(!r.auth)throw Error('unauthenticated');return r.auth},cleanText:v=>String(v||''),onCall:(_o,f)=>f,HttpsError:class extends Error{constructor(c,m){super(m);this.code=c}},FieldValue:{serverTimestamp:()=>1},db:{collection:()=>({doc:()=>({get:async()=>({exists:true,data:()=>row}),set:async d=>{writes++;Object.assign(row,d)}})})}};
  vm.runInNewContext(code,context);
  const run=()=>context.exports.fainanceDeleteAppNotification({auth:{uid:'u'},data:{notificationId:'n'}});
  if(allowed){const result=await run();assert.equal(result.occurrenceId,'occurrence');assert.equal(row.status,'deleted');assert.equal(writes,1);}
  else{await assert.rejects(run,{code:'permission-denied'});assert.equal(writes,0);assert.equal(row.status,'active');}
 }
});
test('actual bulk dismissal preserves system communications while dismissing personal records',async()=>{
 const {isSystemCommunication,notificationShowsInApp}=await import('../src/notifications/notificationChannels.mjs');
 const source=fs.readFileSync(require.resolve('../src/notifications/NotificationCenter.tsx'),'utf8');
 const start=source.indexOf('  async function deleteAllDismissable() {'),end=source.indexOf('  const actionButton =',start);
 const deleted=[];let cleared=0;
 const ctx={notifPrefs:{notificationChannels:{service:'off',custom:'in_app'}},lang:'it'};
 const context={ctx,isSystemCommunication,notificationShowsInApp,bulkDeleting:false,window:{confirm:()=>true},notificationChannelText:()=>'',setBulkDeleteError:()=>{},setBulkDeleting:()=>{},spendingItems:[],closureItems:[],storedItems:[{id:'admin',type:'admin_broadcast'},{id:'system',type:'system_notice'},{id:'personal',type:'custom_reminder'}],userId:'u',deleteAppNotification:async(_uid,id)=>deleted.push(id),clearLocalReminders:()=>cleared++};
 vm.runInNewContext(source.slice(start,end)+'\nthis.run=deleteAllDismissable;',context);await context.run();assert.deepEqual(deleted,['personal']);assert.equal(cleared,1);
});
