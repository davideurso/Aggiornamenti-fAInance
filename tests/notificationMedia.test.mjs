import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { normalizeNotificationMedia, safeMediaUrl, readNotificationMedia, INTERNAL_DESTINATIONS } from '../functions/notificationMedia.mjs';

let checks=0;
for(const value of ['javascript:alert(1)','data:image/png;base64,a','file:///x','http://youtube.com/a','https://127.0.0.1/a','https://[::1]/a','https://2130706433/a','https://0x7f000001/a','https://localhost/a','https://host.local/a','https://user:pass@youtube.com/a','https://youtube.com:8080/a','https://you\\tube.com/a',' https://youtube.com/a','https://youtube.com/\na']) {
  assert.equal(safeMediaUrl(value),'',value); checks++;
  assert.throws(()=>normalizeNotificationMedia({videoUrl:value})); checks++;
}
for(const value of ['https://youtu.be/abc?t=2','https://images.fainanceapp.it/demo.png','https://www.youtube.com/watch?v=abc&list=xyz']) { assert.ok(safeMediaUrl(value)); checks++; }
assert.equal(normalizeNotificationMedia(undefined),undefined); checks++;
assert.equal(normalizeNotificationMedia({}),undefined); checks++;
assert.equal(readNotificationMedia('{invalid'),undefined); checks++;
for(const destination of ['__proto__','constructor','settings?delete=all','https://example.org']) { assert.throws(()=>normalizeNotificationMedia({destination})); checks++; }
for(const destination of Object.keys(INTERNAL_DESTINATIONS)) { assert.equal(normalizeNotificationMedia({destination}).destination,destination); checks++; }
assert.equal(readNotificationMedia(JSON.stringify({destination:'history'})).destination,'history'); checks++;

// Execute the real callable and its real helper functions with isolated Firebase fakes.
const source=fs.readFileSync(new URL('../functions/index.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function normalizePushPlatform('),source.indexOf('async function collectActivePushDevices('));
const callable=source.slice(source.indexOf('exports.fainanceQueueAdminNotificationCampaign ='),source.indexOf('// Ogni documento creato'))
 .replace('const { normalizeNotificationMedia } = await import("./notificationMedia.mjs");','const { normalizeNotificationMedia } = mediaModule;');
class HttpsError extends Error { constructor(code,message){super(message);this.code=code;} }
async function run(data,auth={uid:'admin',token:{fainanceAdminRole:'admin'}}) {
 const writes=[],sent=[];
 const db={ collection(name){ return {doc(id='campaign1'){return {id,set:async row=>writes.push({name,id,row})};},add:async row=>writes.push({name,row})};}, batch(){return {set(ref,row){writes.push({name:'inbox',id:ref.id,row});},commit:async()=>{}};} };
 const firestore=()=>db; firestore.FieldValue={serverTimestamp:()=>1};
 const devices=[{uid:'a',token:'a1',language:'it',platform:'android'},{uid:'a',token:'a1',language:'it',platform:'android'},{uid:'b',token:'b1',language:'fr',platform:'ios'}];
 const context={exports:{}, onCall:(_options,handler)=>handler,HttpsError,PUSH_REGION:'europe-west1',Buffer,mediaModule:{normalizeNotificationMedia},normalizeLang:value=>String(value||'en').split('-')[0],collectActivePushDevices:async()=>devices,admin:{firestore,messaging:()=>({sendEachForMulticast:async message=>{sent.push(message);return {successCount:message.tokens.length,failureCount:0,responses:message.tokens.map(()=>({success:true}))};}})}};
 vm.runInNewContext(helpers+callable,context);
 try { return {result:await context.exports.fainanceQueueAdminNotificationCampaign({data,auth}),writes,sent}; } catch(error){return {error,writes,sent};}
}
const base={translations:{en:{title:'New',message:'Tutorial'},it:{title:'Novità',message:'Video'}}};
let r=await run({...base,media:{videoUrl:'javascript:alert(1)'}});assert.equal(r.error.code,'invalid-argument');assert.equal(r.writes.length,0);checks+=2;
r=await run({...base,media:{destination:'home'}},null);assert.equal(r.error.code,'unauthenticated');assert.equal(r.writes.length,0);checks+=2;
r=await run(base,{uid:'user',token:{fainanceAdminRole:'support'}});assert.equal(r.error.code,'permission-denied');checks++;
r=await run({...base,media:{videoUrl:'https://youtu.be/demo',destination:'history'},audience:{type:'users',uids:['b']}});assert.equal(r.result.targetedDevices,1);assert.equal(r.sent[0].notification.title,'New');assert.equal(JSON.parse(r.sent[0].data.media).destination,'history');assert.equal(r.writes.filter(w=>w.name==='inbox').length,1);assert.equal(r.writes.find(w=>w.name==='inbox').row.targetUid,'b');assert.equal(r.writes.find(w=>w.name==='inbox').row.status,'campaign_direct_push');checks+=6;
r=await run({...base,audience:{type:'platform',platform:'android'},media:{screenshotUrl:'https://images.fainanceapp.it/x.png'}});assert.equal(r.result.targetedDevices,1);assert.equal(r.sent[0].notification.title,'Novità');checks+=2;
r=await run(base);assert.equal(r.result.targetedDevices,2);assert.ok(r.sent.every(m=>!('media' in m.data)));assert.equal(r.writes.filter(w=>w.name==='inbox').length,0);checks+=3;
r=await run({...base,translations:{en:{title:'長'.repeat(120),message:'長'.repeat(1000)}},media:{videoUrl:'https://youtu.be/'+ 'a'.repeat(1200)}});assert.equal(r.error.code,'invalid-argument');assert.equal(r.writes.length,0);checks+=2;
r=await run({mediaCapabilityCheck:true});assert.equal(r.result.mediaSchemaVersion,1);assert.equal(r.writes.length,0);checks+=2;
// Legacy triggers must not broadcast or send a second push for direct campaigns.
const legacy=fs.readFileSync(new URL('../backend/fainance-notifications-functions/index.js',import.meta.url),'utf8');
for (const [name, next, row] of [
 ['fainanceAdminNotificationCampaign','fainancePushOnAppNotification',{dispatchMode:'direct_v2',translations:{en:{title:'x',message:'y'}}}],
 ['fainancePushOnAppNotification',null,{status:'campaign_direct_push',targetUid:'user'}],
]) {
 const start=legacy.indexOf('exports.'+name+' =');
 const nextExport=legacy.indexOf('\nexports.',start+10);
 const end=next?legacy.indexOf('exports.'+next+' ='):(nextExport<0?legacy.length:nextExport);
 const context={exports:{},REGION:'europe-west1',onDocumentCreated:(_config,handler)=>handler,cleanText:x=>String(x||'')};
 vm.runInNewContext(legacy.slice(start,end),context);
 await context.exports[name]({data:{data:()=>row},params:{campaignId:'campaign1'}});checks++;
}
console.log(`${checks} assertions passed: URLs, routes, auth, audience, localization, legacy payload, inbox, push byte limit, capability and duplicate guards.`);
