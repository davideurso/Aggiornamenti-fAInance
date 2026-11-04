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
