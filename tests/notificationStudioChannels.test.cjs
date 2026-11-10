const{test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const root=process.env.FAINANCE_SOURCE||path.resolve(__dirname,'..');const admin=path.resolve(root,'../../Centro Amministrazione/backend');
class Db{
 constructor(){this.rows=new Map();}
 ref(p){return {id:p.split('/').pop(),path:p,get:async()=>({exists:this.rows.has(p),data:()=>this.rows.get(p)}),update:async d=>this.rows.set(p,{...this.rows.get(p),...d}),set:async(d,o)=>this.rows.set(p,o?.merge?{...this.rows.get(p),...d}:d)};}
 collection(p){return {doc:id=>this.ref(p+'/'+id),add:async d=>this.rows.set(p+'/'+this.rows.size,d)};}
 batch(){const pending=[];return {set:(r,d)=>pending.push([r,d]),commit:async()=>{for(const[r,d]of pending)await r.set(d)}};}
 async runTransaction(fn){return fn({get:r=>r.get(),create:(r,d)=>{assert(!this.rows.has(r.path));this.rows.set(r.path,d)}})}
}
test('actual Admin Studio respects all channels, delegates delivery and preserves dismissal on replay',async()=>{
 const model=await import(require('node:url').pathToFileURL(path.join(admin,'notificationModel.mjs')).href);
 for(const mode of ['off','in_app','push','email','push_email']){
  const db=new Db();db.rows.set('notificationProfiles/u',{channels:{service:mode}});let directSends=0;
  const modules={
   'firebase-functions/v2/https':{onCall:(_o,f)=>f,HttpsError:class extends Error{constructor(c,m){super(m);this.code=c;}}},
   'firebase-admin/app':{getApps:()=>[{name:'[DEFAULT]'}],initializeApp:()=>({})},
   'firebase-admin/firestore':{getFirestore:()=>db,FieldValue:{serverTimestamp:()=>1}},
   'firebase-admin/messaging':{getMessaging:()=>({sendEachForMulticast:async()=>{directSends++;throw Error('Unexpected direct push')}})},
   'firebase-admin/storage':{getStorage:()=>({})},
   './studio-projects.json':{},'./fainanceUsers.cjs':{loadUsers:async()=>({users:[{uid:'u',accountStatus:'active'}]})},crypto:require('crypto')};
  const context={require:n=>{if(!(n in modules))throw Error(n);return modules[n]},exports:{},process:{env:{GCLOUD_PROJECT:'fainance-test-20260823195207'}},model,Buffer,console};
  const source=fs.readFileSync(path.join(admin,'notificationStudio.cjs'),'utf8').replace("await import('./notificationModel.mjs')",'model');
  // The module's local model binding is renamed to avoid shadowing the injected module.
  vm.runInNewContext(source.replace('model=model,','model=globalModel,'),{...context,globalModel:model});
  const request={auth:{uid:'admin',token:{hubAccessVersion:1,hubIdentityUid:'self',fainanceAdminRole:'admin'}},data:{operation:'send',requestId:'11111111-1111-4111-8111-111111111111',title:'Test',message:'Synthetic admin notification',audience:{type:'users',uids:['u']}}};
  const result=await context.exports.handler(request);assert.equal(result.inboxCount,1);assert.equal(directSends,0);assert.equal(result.pushStatus,'queued_by_user_preferences');
  const inbox=[...db.rows].filter(([p])=>p.startsWith('appNotifications/'));if(inbox.length){assert.equal(inbox[0][1].status,'active');inbox[0][1].status='deleted';}
  const replay=await context.exports.handler(request);assert.equal(replay.campaignId,result.campaignId);assert.equal([...db.rows].filter(([p])=>p.startsWith('appNotifications/')).length,inbox.length);if(inbox.length)assert.equal(db.rows.get(inbox[0][0]).status,'deleted');
 }
});
