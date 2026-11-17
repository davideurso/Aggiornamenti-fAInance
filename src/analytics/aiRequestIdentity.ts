// A logical request keeps its identity through authentication refresh and an
// automatic translation. No user content is copied to analytics.
export function withAiRequestIdentity<T extends Record<string,any>>(input:T,parentId?:string):T & {growthRequestId?:string} {
 const payload=input as T & {growthRequestId?:string};
 const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
 if(uuid.test(parentId||''))payload.growthRequestId=parentId;
 else if(!uuid.test(payload.growthRequestId||'')){
  if(typeof crypto!=='undefined'&&typeof crypto.randomUUID==='function')payload.growthRequestId=crypto.randomUUID();
 }
 return payload;
}
