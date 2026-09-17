// Extracted from app.tsx in Architecture Phase 11. Behavior unchanged.
export function fainanceNativePlatform(){
  try{
    var cap=(typeof window!=="undefined")?(window as any).Capacitor:null;
    if(cap&&cap.getPlatform)return String(cap.getPlatform()||"").toLowerCase();
  }catch(e){}
  return "web";
}
export function fainanceIsNativePlatform(){
  try{
    var cap=(typeof window!=="undefined")?(window as any).Capacitor:null;
    if(cap&&cap.isNativePlatform)return !!cap.isNativePlatform();
  }catch(e){}
  return false;
}
function fainanceMetaEventsPlugin(){
  try{var cap=(typeof window!=="undefined")?(window as any).Capacitor:null;return cap&&cap.Plugins?cap.Plugins.FainanceMetaEvents:null;}catch(e){return null;}
}
export function fainanceSetMetaEventsConsent(granted:boolean){
  try{var plugin=fainanceMetaEventsPlugin();if(plugin&&plugin.setConsent)return Promise.resolve(plugin.setConsent({granted:!!granted}));}catch(e){}
  return Promise.resolve(null);
}
export function fainanceLogMetaEvent(name:string,value?:number,params?:any){
  try{var plugin=fainanceMetaEventsPlugin();if(plugin&&plugin.logEvent)return Promise.resolve(plugin.logEvent({name:String(name||""),value:typeof value==="number"?value:undefined,params:params||{}}));}catch(e){}
  return Promise.resolve(null);
}
