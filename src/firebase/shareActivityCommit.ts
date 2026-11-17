import {Capacitor,CapacitorHttp} from '@capacitor/core';

const TEST_PROJECT = 'fainance-test-20260823195207';
type WireValue = Record<string, any>;
const recentWrites = new Map<string, { name: string; updateTime: string; fields: Record<string, WireValue> }>();

function recordShareTiming(start: number, readMs: number, commitMs: number) {
 if (typeof window === 'undefined') return;
 const host = window as any;
 const rows = host.__FAINANCE_SHARE_COMMIT_TIMINGS__ || [];
 host.__FAINANCE_SHARE_COMMIT_TIMINGS__ = [...rows, { totalMs: Math.round(performance.now() - start), readMs, commitMs }].slice(-20);
}

export function useNativeShareCommit(project: string) {
 return project === TEST_PROJECT && Capacitor.getPlatform() === 'android';
}

function decode(value: WireValue): any {
 if ('nullValue' in value) return null;
 if ('arrayValue' in value) return (value.arrayValue.values || []).map(decode);
 if ('mapValue' in value) return unpack(value.mapValue.fields);
 if ('integerValue' in value) return Number(value.integerValue);
 for(const key of ['stringValue','booleanValue','doubleValue','timestampValue'])if(key in value)return value[key];
 throw Error('SHARE_UNSUPPORTED_FIELD');
}
function unpack(fields: Record<string,WireValue> = {}){
 return Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,decode(value)]));
}
function encode(value: any): WireValue {
 if(value===null)return {nullValue:null};
 if(Array.isArray(value))return {arrayValue:{values:value.map(encode)}};
 if(typeof value==='object')return {mapValue:{fields:pack(value)}};
 if(typeof value==='boolean')return {booleanValue:value};
 if(typeof value==='number'&&Number.isFinite(value))return Number.isSafeInteger(value)?{integerValue:String(value)}:{doubleValue:value};
 if(typeof value==='string')return {stringValue:value};
 throw Error('SHARE_UNSUPPORTED_FIELD');
}
function pack(fields: Record<string,any>){
 return Object.fromEntries(Object.entries(fields).map(([key,value])=>[key,encode(value)]));
}

// Versioned Firestore REST commit keeps the activity and the private method atomic.
export async function commitNativeShareActivity({projectId,activityId,uid,token,apply,privateMethod}){
 const database = 'projects/'+TEST_PROJECT+'/databases/(default)/documents';
 const path = 'shareProjects/'+encodeURIComponent(projectId);
 const url = 'https://firestore.googleapis.com/v1/'+database;
 const headers = {Authorization:'Bearer '+token,'Content-Type':'application/json'};
 const options = {headers,responseType:'json' as const,connectTimeout:6000,readTimeout:8000};
 const key = JSON.stringify([uid, projectId]);
 const start = performance.now();
 let readMs = 0;
 let commitMs = 0;
 for(let attempt=0;attempt<3;attempt++){
  const cached = attempt === 0 ? recentWrites.get(key) : undefined;
  let document = cached;
  if (!document) {
   const readStart = performance.now();
   const read=await CapacitorHttp.get({...options,url:url+'/'+path});
   readMs += Math.round(performance.now()-readStart);
   if(read.status!==200||!read.data?.updateTime)throw Error('SHARE_PROJECT_READ_FAILED');
   document = read.data;
  }
  const remote={...unpack(document.fields),id:projectId};
  let patch;
  try { patch=apply(remote); }
  catch (error) {
   if (!cached) throw error;
   recentWrites.delete(key);
   continue;
  }
  const rawActivities=document.fields?.activities?.arrayValue?.values||[];
  const before=new Map(rawActivities.map(value=>[String(decode(value).id),value]));
  const fields=pack(patch);
  // Keep the wire representation of every unrelated activity exactly as read.
  fields.activities={arrayValue:{values:patch.activities.map(row=>String(row.id)===activityId?encode(row):before.get(String(row.id)))}};
  const writes:any[]=[{update:{name:document.name,fields},updateMask:{fieldPaths:Object.keys(patch)},currentDocument:{updateTime:document.updateTime}}];
  if(privateMethod)writes.push({update:{name:database+'/users/'+uid+'/shareCashMethods/'+privateMethod.key,fields:pack(privateMethod.data)}});
  const commitStart=performance.now();
  const result=await CapacitorHttp.post({...options,url:url+':commit',data:{writes}});
  commitMs += Math.round(performance.now()-commitStart);
  recentWrites.delete(key);
  if(result.status===200){
   const updateTime=result.data?.writeResults?.[0]?.updateTime;
   if(updateTime){
    if(recentWrites.size>=16)recentWrites.delete(recentWrites.keys().next().value);
    recentWrites.set(key,{name:document.name,updateTime,fields:{...document.fields,...fields}});
   }
   recordShareTiming(start,readMs,commitMs);
   return {...remote,...patch};
  }
  if(!['ABORTED','FAILED_PRECONDITION'].includes(result.data?.error?.status))throw Error('SHARE_PROJECT_COMMIT_FAILED');
 }
 throw Error('SHARE_PROJECT_CHANGED');
}

type NativeShareProjectContext = {
 firebaseProjectId: string;
 projectId: string;
 uid: string;
 token: string;
 assertSession: () => void;
};
type NativeShareProjectDocument = {name: string; updateTime: string; fields: Record<string, WireValue>};

function nativeShareFailure(code: string, retryable = false) {
 const error = new Error(code) as Error & {nativeShareRetryable?: boolean};
 error.nativeShareRetryable = retryable;
 return error;
}

function nativeShareProjectRequest(context: NativeShareProjectContext) {
 if (!useNativeShareCommit(context.firebaseProjectId)) throw Error('SHARE_NATIVE_TEST_ONLY');
 if (!context.uid || !context.token || !context.projectId || context.projectId.includes('/')) throw Error('SHARE_PROJECT_INVALID');
 context.assertSession();
 const database = 'projects/'+TEST_PROJECT+'/databases/(default)/documents';
 const name = database+'/shareProjects/'+context.projectId;
 const url = 'https://firestore.googleapis.com/v1/'+database;
 const options = {headers:{Authorization:'Bearer '+context.token,'Content-Type':'application/json'},
  responseType:'json' as const,connectTimeout:6000,readTimeout:8000};
 return {name,url,options};
}

async function readNativeShareDocument(context: NativeShareProjectContext): Promise<NativeShareProjectDocument | null> {
 const request = nativeShareProjectRequest(context);
 const response = await CapacitorHttp.get({...request.options,url:request.url+'/shareProjects/'+encodeURIComponent(context.projectId)})
  .catch(()=>{throw nativeShareFailure('SHARE_PROJECT_READ_UNCONFIRMED',true);});
 context.assertSession();
 if (response.status === 404) return null;
 if (response.status !== 200 || !response.data?.updateTime || response.data?.name !== request.name) {
  throw nativeShareFailure('SHARE_PROJECT_READ_FAILED',response.status===429||response.status>=500);
 }
 return response.data as NativeShareProjectDocument;
}

function nativeShareProjectData(context: NativeShareProjectContext, document: NativeShareProjectDocument) {
 const project: Record<string,any> = {...unpack(document.fields),id:context.projectId};
 if (String(project.ownerUid || '') !== context.uid && !(Array.isArray(project.memberUids) ? project.memberUids : []).map(String).includes(context.uid)) {
  throw Error('SHARE_PROJECT_ACCESS_DENIED');
 }
 return project;
}

// Keep the exact Firestore wire values for unchanged fields, including timestamps.
function nativeSharePatchValue(value: any, previous?: WireValue): WireValue {
 if (previous && JSON.stringify(decode(previous)) === JSON.stringify(value)) return previous;
 if (Array.isArray(value)) return {arrayValue:{values:value.map((item,index)=>nativeSharePatchValue(item,previous?.arrayValue?.values?.[index]))}};
 if (value && typeof value === 'object') return {mapValue:{fields:Object.fromEntries(Object.entries(value)
  .map(([key,item])=>[key,nativeSharePatchValue(item,previous?.mapValue?.fields?.[key])]))}};
 return encode(value);
}

export async function readNativeShareProject(context: NativeShareProjectContext): Promise<Record<string,any> | null> {
 const document = await readNativeShareDocument(context);
 return document ? nativeShareProjectData(context, document) : null;
}

// Only the signed-in owner's display fields are needed when a linked trip is
// first created. Keep this optional read off the WebView Firestore stream too.
export async function readNativeShareOwnerProfile(context: NativeShareProjectContext): Promise<Record<string,any> | null> {
 const request = nativeShareProjectRequest(context);
 const name = 'projects/'+TEST_PROJECT+'/databases/(default)/documents/users/'+context.uid;
 const mask = ['name','firstName','lastName','email'].map(field=>'mask.fieldPaths='+field).join('&');
 const response = await CapacitorHttp.get({...request.options,url:request.url+'/users/'+encodeURIComponent(context.uid)+'?'+mask})
  .catch(()=>{throw nativeShareFailure('SHARE_OWNER_READ_UNCONFIRMED',true);});
 context.assertSession();
 if (response.status===404) return null;
 if (response.status!==200 || response.data?.name!==name) throw nativeShareFailure('SHARE_OWNER_READ_FAILED',response.status===429||response.status>=500);
 return unpack(response.data.fields);
}

// The bridge uses the same native transport and updateTime precondition as Share
// activity saves. Reads always come from the server; an uncertain commit is never
// acknowledged or retried against the same snapshot.
export async function updateNativeShareProject(context: NativeShareProjectContext & {
 apply: (project: Record<string,any> | null) => Promise<Record<string,any> | void> | Record<string,any> | void;
}): Promise<Record<string,any> | null> {
 const request = nativeShareProjectRequest(context);
 const cacheKey = JSON.stringify([context.uid,context.projectId]);
 for (let attempt=0;attempt<3;attempt++) {
  const document = await readNativeShareDocument(context);
  const remote = document ? nativeShareProjectData(context,document) : null;
  const patch = await context.apply(remote);
  context.assertSession();
  if (!patch || Object.keys(patch).length === 0) return remote;
  if (!document || !remote) throw Error('SHARE_PROJECT_MISSING');
  const fields: Record<string,WireValue> = Object.fromEntries(Object.entries(patch).map(([key,value])=>[key,nativeSharePatchValue(value,document.fields?.[key])]));
  if (Array.isArray(patch.activities)) {
   const previous = new Map((document.fields?.activities?.arrayValue?.values || []).map(value=>[String(decode(value).id),value]));
   fields.activities = {arrayValue:{values:patch.activities.map(row=>nativeSharePatchValue(row,previous.get(String(row.id))))}};
  }
  // A normal Share save must re-read after this bridge write, even if its response
  // is lost. Its existing CAS guard still handles concurrent edits.
  recentWrites.delete(cacheKey);
  const result = await CapacitorHttp.post({...request.options,url:request.url+':commit',data:{writes:[{
   update:{name:document.name,fields},updateMask:{fieldPaths:Object.keys(patch)},currentDocument:{updateTime:document.updateTime}
  }]}}).catch(()=>{throw nativeShareFailure('SHARE_PROJECT_COMMIT_UNCONFIRMED',true);});
  context.assertSession();
  if (result.status === 200) {
   if (!result.data?.writeResults?.[0]?.updateTime) throw nativeShareFailure('SHARE_PROJECT_COMMIT_UNCONFIRMED',true);
   return {...remote,...patch};
  }
  if (!['ABORTED','FAILED_PRECONDITION'].includes(result.data?.error?.status)) throw nativeShareFailure('SHARE_PROJECT_COMMIT_FAILED',result.status===429||result.status>=500);
 }
 throw nativeShareFailure('SHARE_PROJECT_CHANGED',true);
}

// Create uses an existence precondition. A repeated create after a lost ACK must
// preserve the activities/categories already saved in that Share project.
export async function upsertNativeShareProject(context: NativeShareProjectContext & {
 create: Record<string,any>;
 update: Record<string,any>;
}): Promise<Record<string,any>> {
 const request = nativeShareProjectRequest(context);
 if (context.create.ownerUid!==context.uid || context.update.ownerUid!==context.uid) throw Error('SHARE_PROJECT_ACCESS_DENIED');
 const expected = context.update;
 if (expected.sourceApp!=='mundely' || expected.sourceEnvironment!=='test'
     || !String(expected.mundelyUid || '') || !String(expected.mundelyTripId || '')
     || ['sourceApp','sourceEnvironment','mundelyUid','mundelyTripId'].some(key=>context.create[key]!==expected[key])) {
  throw Error('SHARE_PROJECT_LINK_MISMATCH');
 }
 recentWrites.delete(JSON.stringify([context.uid,context.projectId]));
 const result = await CapacitorHttp.post({...request.options,url:request.url+':commit',data:{writes:[{
  update:{name:request.name,fields:pack(context.create)},currentDocument:{exists:false}
 }]}}).catch(()=>{throw nativeShareFailure('SHARE_PROJECT_COMMIT_UNCONFIRMED',true);});
 context.assertSession();
 if (result.status===200) {
  if (!result.data?.writeResults?.[0]?.updateTime) throw nativeShareFailure('SHARE_PROJECT_COMMIT_UNCONFIRMED',true);
  return {...context.create,id:context.projectId};
 }
 if (!['ALREADY_EXISTS','FAILED_PRECONDITION','ABORTED'].includes(result.data?.error?.status)) {
  throw nativeShareFailure('SHARE_PROJECT_COMMIT_FAILED',result.status===429||result.status>=500);
 }
 const updated = await updateNativeShareProject({...context,apply:remote=>{
  if (!remote) throw nativeShareFailure('SHARE_PROJECT_CHANGED',true);
  if (remote.ownerUid!==context.uid) throw Error('SHARE_PROJECT_ACCESS_DENIED');
  if (['sourceApp','sourceEnvironment','mundelyUid','mundelyTripId'].some(key=>remote[key]!==expected[key])) {
   throw Error('SHARE_PROJECT_LINK_MISMATCH');
  }
  return {...expected,memberUids:Array.isArray(remote.memberUids)?remote.memberUids:expected.memberUids};
 }});
 if (!updated) throw nativeShareFailure('SHARE_PROJECT_CHANGED',true);
 return updated;
}
