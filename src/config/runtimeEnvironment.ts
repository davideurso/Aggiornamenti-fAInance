var fainanceRuntimeAppIdPromise:any=null;
export async function fainanceRuntimeAppId(){
  if(fainanceRuntimeAppIdPromise)return fainanceRuntimeAppIdPromise;
  fainanceRuntimeAppIdPromise=(async function(){
    try{
      var cap:any=(typeof window!=="undefined")?(window as any).Capacitor:null;
      if(!cap||!cap.isNativePlatform||!cap.isNativePlatform())return "web";
      var plugin=cap.Plugins&&cap.Plugins.App?cap.Plugins.App:null;
      if(plugin&&plugin.getInfo){var info=await plugin.getInfo();return String((info&&info.id)||"");}
      var mod:any=await import("@capacitor/app");
      if(mod&&mod.App&&mod.App.getInfo){var importedInfo=await mod.App.getInfo();return String((importedInfo&&importedInfo.id)||"");}
    }catch(e){console.warn("App id detection failed",(e&&e.message)||e);}
    return "";
  })();
  return fainanceRuntimeAppIdPromise;
}
export async function fainanceIsTestBuild(){var appId=String(await fainanceRuntimeAppId()||"").toLowerCase();return appId==="it.fainanceapp.app.test"||appId.endsWith(".test");}
