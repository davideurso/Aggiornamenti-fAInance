import { useState, useEffect, useRef, useMemo } from 'react';
import { CURRENCIES } from '../core';
import { Toast } from '../widget';

// Notifications are kept in a small external store so showing/hiding a toast
// never rerenders App and never resets a form that the user is editing.
export var FAINANCE_TOAST_CURRENT:any=null;
var FAINANCE_TOAST_LISTENERS=new Set<any>();
export function publishFainanceToast(value:any){
  FAINANCE_TOAST_CURRENT=value;
  FAINANCE_TOAST_LISTENERS.forEach(function(listener){try{listener(value);}catch(e){}});
}
export function GlobalToastHost(){
  var [value,setValue]=useState<any>(FAINANCE_TOAST_CURRENT);
  useEffect(function(){
    function listener(next:any){setValue(next);}
    FAINANCE_TOAST_LISTENERS.add(listener);
    return function(){FAINANCE_TOAST_LISTENERS.delete(listener);};
  },[]);
  return value?<Toast key={(value&&value.id)||String(value)} msg={value} onDone={function(){publishFainanceToast(null);}}/>:null;
}

// Numeric fields across the whole app automatically select the current reference
// value when they receive focus (tap, click or Tab). The first typed digit therefore
// replaces it immediately, without requiring the user to delete it manually.
export function GlobalNumericInputAssist(){
  useEffect(function(){
    function isNumericInput(target:any){
      if(!target||String(target.tagName||'').toLowerCase()!=='input')return false;
      if(target.disabled||target.readOnly)return false;
      var type=String(target.getAttribute('type')||'text').toLowerCase();
      var mode=String(target.getAttribute('inputmode')||'').toLowerCase();
      if(type==='password'||type==='date'||type==='time'||type==='datetime-local'||type==='month'||type==='week'||type==='tel')return false;
      return type==='number'||mode==='numeric'||mode==='decimal';
    }
    function selectNumericValue(event:any){
      var el=event&&event.target;
      if(!isNumericInput(el))return;
      try{
        setTimeout(function(){
          try{
            if(document.activeElement!==el)return;
            if(typeof el.select==='function')el.select();
          }catch(_e){}
        },0);
      }catch(_e){}
    }
    document.addEventListener('focusin',selectNumericValue,true);
    return function(){document.removeEventListener('focusin',selectNumericValue,true);};
  },[]);
  return null;
}

export function StableCurrencyPicker({value,onChange,exclude,allowNone,dark,textC,subC,borderC,translate}:any){
  var [query,setQuery]=useState("");
  var inputRef=useRef<any>(null);
  var Lc=typeof translate==="function"?translate:function(v){return v;};
  var normalized=String(query||"").toLowerCase().trim();
  var list=useMemo(function(){
    return CURRENCIES.filter(function(c){
      if(exclude&&c.code===exclude)return false;
      if(!normalized)return true;
      return c.code.toLowerCase().indexOf(normalized)>=0||String(c.name||"").toLowerCase().indexOf(normalized)>=0||String(c.symbol||"").toLowerCase().indexOf(normalized)>=0;
    }).slice(0,180);
  },[normalized,exclude]);
  var fieldStyle={width:"100%",borderRadius:12,border:"1px solid "+borderC,padding:"11px 12px",fontSize:13,background:dark?"#252535":"#fff",color:textC,boxSizing:"border-box",outline:"none"};
  return <div onPointerDown={function(e){e.stopPropagation();}} onClick={function(e){e.stopPropagation();}} style={{display:"flex",flexDirection:"column",gap:8,position:"relative"}}>
    <input ref={inputRef} autoComplete="off" inputMode="search" placeholder={Lc("Cerca valuta, es. euro, dollaro, yen...")} value={query} onChange={function(e){setQuery(e.currentTarget.value);}} onKeyDown={function(e){e.stopPropagation();}} style={fieldStyle}/>
    <select value={value||""} onChange={function(e){onChange(e.currentTarget.value);}} style={fieldStyle}>
      {allowNone&&<option value="">{Lc("Nessuna")}</option>}
      {list.map(function(c){return <option key={c.code} value={c.code}>{c.symbol} {c.code} — {c.name}</option>;})}
    </select>
    <div style={{fontSize:11,color:subC}}>{list.length} {Lc("valute mostrate")}{normalized?Lc(" per la ricerca"):""}.</div>
  </div>;
}
