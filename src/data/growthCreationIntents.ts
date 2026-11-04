import {firebaseApp,fbAuth} from '../firebase/client';
type Family='goals'|'rules'|'budgetVersions'|'budgetOverrides'|'alerts'|'shareProjects';
type Intent={family:Family;entityId:string;nonce:string};
const enabled=()=>firebaseApp.options.projectId==='fainance-test-20260823195207';
const key=(uid:string)=>'user_'+uid+'_growth_creation_pending_test_v1';
const families:Family[]=['goals','rules','budgetVersions','budgetOverrides','alerts','shareProjects'];
const failed=new Set<string>();
const failureKey=(uid:string)=>key(uid)+'_incomplete';
function incomplete(uid:string):void{failed.add(uid);try{localStorage.setItem(failureKey(uid),'true');}catch{}}
function load(uid:string):Intent[]{
 const x=JSON.parse(localStorage.getItem(key(uid))||'[]');
 if(!Array.isArray(x)||x.length>100)throw Error('CREATION_QUEUE_UNQUALIFIED');
 const ids=new Set<string>(),nonces=new Set<string>();
 for(const r of x){
  if(!r||Object.keys(r).sort().join(',')!=='entityId,family,nonce'||!families.includes(r.family)||typeof r.entityId!=='string'||!r.entityId||r.entityId.length>128||/[\x00-\x1f]/.test(r.entityId)||typeof r.nonce!=='string'||!/^[0-9a-f-]{36}$/.test(r.nonce))throw Error('CREATION_QUEUE_UNQUALIFIED');
  const id=r.family+'\0'+r.entityId;if(ids.has(id)||nonces.has(r.nonce))throw Error('CREATION_QUEUE_UNQUALIFIED');ids.add(id);nonces.add(r.nonce);
 }
 return x;
}
export function growthCreationCaptureComplete(uid:string):boolean{
 if(!enabled()||!uid||fbAuth.currentUser?.uid!==uid)return false;
 try{load(uid);return !failed.has(uid)&&localStorage.getItem(failureKey(uid))===null;}catch{incomplete(uid);return false;}
}
// Device-only technical queue, excluded from the preference/backup allowlist. No dates or amounts.
// Only explicit new logical identities enter; cloud hydration/import arrays do not call this.
export function noteGrowthCreations(uid:string,family:Family,current:any,next:any):void{
 if(!enabled()||!uid||fbAuth.currentUser?.uid!==uid)return;
 try{
  const ids=(v:any)=>family==='budgetOverrides'?Object.keys(v||{}):(Array.isArray(v)?v:[]).map(x=>String(x?.id??''));
  const before=new Set(ids(current)),queue=load(uid);
  for(const entityId of ids(next)){
   if(!entityId||entityId==='legacy-budget'||entityId.length>128||before.has(entityId)||queue.some(x=>x.family===family&&x.entityId===entityId))continue;
   if(queue.length>=100){incomplete(uid);continue;}
   queue.push({family,entityId,nonce:crypto.randomUUID()});
  }
  localStorage.setItem(key(uid),JSON.stringify(queue));
 }catch{incomplete(uid);/* Metrics never change the outcome of the business save. */}
}
export function pendingGrowthCreations(uid:string):Intent[]{if(!enabled()||fbAuth.currentUser?.uid!==uid)return [];try{return load(uid);}catch{incomplete(uid);return [];}}
export function acknowledgeGrowthCreations(uid:string,nonces:string[]):void{
 if(!enabled()||fbAuth.currentUser?.uid!==uid)return;
 try{const accepted=new Set(nonces);localStorage.setItem(key(uid),JSON.stringify(load(uid).filter(x=>!accepted.has(x.nonce))));}catch{incomplete(uid);}
}
