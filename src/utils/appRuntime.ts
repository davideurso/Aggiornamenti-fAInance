export function focusFainanceInput(ref:any, delay?:number){
  try{
    var scheduledFrom=document.activeElement;
    setTimeout(function(){
      try{
        var el=ref&&ref.current?ref.current:null;
        if(!el||!el.focus||!el.isConnected)return;
                  if(document.activeElement&&document.activeElement.tagName==="SELECT")return;
          // A delayed opening focus must not steal a later tap or a nested picker.
          if(document.activeElement!==scheduledFrom&&document.activeElement!==el)return;
          var dialog=document.querySelector&&document.querySelector('[role="dialog"][aria-modal="true"]');
          if(dialog&&!dialog.contains(el))return;
        el.focus({preventScroll:true});
        if(el.select)el.select();
      }catch(e){}
    },delay==null?90:delay);
  }catch(e){}
}

export function fainancePromiseTimeout(promise:any, ms:number, message:string){
  return new Promise(function(resolve,reject){
    var done=false;
    var timer=setTimeout(function(){
      if(done)return;
      done=true;
      reject(new Error(message||"Operazione scaduta."));
    },ms);
    Promise.resolve(promise).then(function(value){
      if(done)return;
      done=true;
      clearTimeout(timer);
      resolve(value);
    }).catch(function(err){
      if(done)return;
      done=true;
      clearTimeout(timer);
      reject(err);
    });
  });
}

export function numOr(v:any,f:any){var n=Number(v);return Number.isFinite(n)?n:f;}
export function readFainanceStoredLang(){
  try{
    var raw=localStorage.getItem("pref_lang_v2");
    if(!raw)return "it";
    try{
      var parsed=JSON.parse(raw);
      return parsed||"it";
    }catch(e){
      return String(raw).replace(/^"|"$/g,"")||"it";
    }
  }catch(e){return "it";}
}
