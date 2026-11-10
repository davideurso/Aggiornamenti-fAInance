const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require.resolve('../src/app.tsx'),'utf8');
test('actual setup ad gate blocks every stage and permits normal app after completion',()=>{
 const start=source.indexOf('  var adsBlockedBySetup ='),end=source.indexOf(';',start)+1,code=source.slice(start,end);
 const ready={initialSetupOpen:false,onboardingGuideOpen:false,initialSetupStatus:'complete',onboardingGuideEligibleNow:()=>false,userId:'u',accountUiReady:true,termsAccepted:true,privacyAccepted:true,appLocked:false};
 for(const state of [{initialSetupOpen:true},{onboardingGuideOpen:true},{initialSetupStatus:'essential_pending'},{initialSetupStatus:'advanced_pending'},{onboardingGuideEligibleNow:()=>true},{userId:''},{accountUiReady:false}]){const context={...ready,...state};vm.runInNewContext(code,context);assert.equal(context.adsBlockedBySetup,true);}
 vm.runInNewContext(code,ready);assert.equal(ready.adsBlockedBySetup,false);
});
test('actual banner effect stops pending timers and observer callbacks when wizard opens or effect unmounts',()=>{
 const start=source.indexOf('  useEffect(',source.indexOf('  var topAdSlotHeight')),end=source.indexOf('\n  );',start)+6;
 let effect,shown=0,hidden=0;const callbacks=[];
 const context={useEffect:f=>effect=f,nativePlugin:()=>({showBanner:()=>{shown++;return Promise.resolve()},hideBanner:()=>{hidden++}}),topAdVisible:true,topAdNativeBanner:true,requestAdConsentIfNeeded:()=>{},adsBlockedBySetupRef:{current:false},topAdBoxRef:{current:null},ResizeObserver:undefined,setTimeout:f=>{callbacks.push(f);return callbacks.length},clearTimeout:()=>{},window:{addEventListener:()=>{},removeEventListener:()=>{}},currentBannerAdUnitId:()=>'',mobileSummaryVisible:false,console,tab:'home',currentPlan:'free',showAppSummaryHeader:true,topAdSlotHeight:68,nativeBannerSuppressed:false};
 vm.runInNewContext(source.slice(start,end),context);const cleanup=effect();callbacks[0]();assert.equal(shown,1);
 context.adsBlockedBySetupRef.current=true;for(const fn of callbacks)fn();assert.equal(shown,1);
 cleanup();context.adsBlockedBySetupRef.current=false;for(const fn of callbacks)fn();assert.equal(shown,1);assert.equal(hidden,1);
});
test('actual full-screen and consent entry points do nothing during guided setup',()=>{
 for(const name of ['requestAdConsentIfNeeded','showShortInterstitialForExtraMovement','showRewardedAdForExtraMovement']){
  const start=source.indexOf('  function '+name+'('),brace=source.indexOf('{',start);let depth=1,pos=brace+1;
  while(depth&&pos<source.length){if(source[pos]==='{')depth++;if(source[pos]==='}')depth--;pos++;}
  const context={adsBlockedBySetupRef:{current:true},nativePlugin:()=>{throw Error('Unexpected native ad request')}};
  vm.runInNewContext(source.slice(start,pos)+'\nthis.invoke='+name+';',context);context.invoke(()=>{throw Error('Unexpected reward')});
 }
});
