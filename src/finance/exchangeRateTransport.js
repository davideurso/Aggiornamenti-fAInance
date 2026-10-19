import {Capacitor, CapacitorHttp} from '@capacitor/core';
export async function exchangeRateResponse(url, {signal}={}, runtime={native:()=>Capacitor.isNativePlatform(),get:options=>CapacitorHttp.get(options),fetch:(...args)=>fetch(...args)}) {
  if(signal?.aborted) throw new Error('FX_ABORTED');
  if(!runtime.native()) return runtime.fetch(url,{signal});
  return new Promise((resolve,reject)=>{
    let settled=false;
    const finish=(error,value)=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',cancel);error?reject(error):resolve(value);};
    const cancel=()=>finish(new Error('FX_ABORTED'));
    const timer=setTimeout(()=>finish(new Error('FX_TIMEOUT')),7000);
    signal?.addEventListener('abort',cancel,{once:true});
    Promise.resolve().then(()=>runtime.get({url,responseType:'json',connectTimeout:6000,readTimeout:6000}))
      .then(response=>finish(null,{ok:response.status>=200&&response.status<300,json:async()=>typeof response.data==='string'?JSON.parse(response.data):response.data}))
      .catch(error=>finish(error));
  });
}
