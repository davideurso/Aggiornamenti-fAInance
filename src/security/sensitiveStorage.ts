import { useState, useEffect, useRef, useCallback } from 'react';
import { fainanceBytesToBase64, fainanceBase64ToBytes } from '../utils/base64';

const FAINANCE_SENSITIVE_STORAGE_PREFIX="fainance_sensitive_v2:";
async function fainanceDeriveSensitiveKey(uid:string){
  if(!uid)throw new Error("Identificativo account mancante.");
  if(typeof crypto==="undefined"||!crypto.subtle)throw new Error("Cifratura non disponibile su questo dispositivo.");
  var enc=new TextEncoder();
  var material=await crypto.subtle.importKey("raw",enc.encode("fainance_sensitive_"+uid),"PBKDF2",false,["deriveKey"]);
  return crypto.subtle.deriveKey({name:"PBKDF2",salt:enc.encode("fainance_sensitive_salt_v2"),iterations:150000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);
}
export async function fainanceEncryptSensitiveData(data:any,uid:string){
  var key=await fainanceDeriveSensitiveKey(uid);var iv=crypto.getRandomValues(new Uint8Array(12));var enc=new TextEncoder();
  var encrypted=await crypto.subtle.encrypt({name:"AES-GCM",iv:iv},key,enc.encode(JSON.stringify(data==null?[]:data)));
  var payload=new Uint8Array(iv.length+encrypted.byteLength);payload.set(iv,0);payload.set(new Uint8Array(encrypted),iv.length);
  return FAINANCE_SENSITIVE_STORAGE_PREFIX+fainanceBytesToBase64(payload);
}
export async function fainanceDecryptSensitiveData(value:any,uid:string){
  if(Array.isArray(value))return value;
  if(value==null||value==="")return [];
  if(typeof value!=="string")throw new Error("Formato dati sensibili non valido.");
  var encoded=value.indexOf(FAINANCE_SENSITIVE_STORAGE_PREFIX)===0?value.slice(FAINANCE_SENSITIVE_STORAGE_PREFIX.length):value;
  var payload=fainanceBase64ToBytes(encoded);
  if(payload.length<=12)throw new Error("Dati cifrati non validi.");
  var iv=payload.slice(0,12),cipher=payload.slice(12);var key=await fainanceDeriveSensitiveKey(uid);
  var decrypted=await crypto.subtle.decrypt({name:"AES-GCM",iv:iv},key,cipher);
  var parsed=JSON.parse(new TextDecoder().decode(decrypted));
  if(!Array.isArray(parsed))throw new Error("Contenuto cifrato non valido.");
  return parsed;
}
function syncJsonStableEqual(a:any,b:any){try{return JSON.stringify(a)===JSON.stringify(b);}catch(e){return false;}}
function fainanceDispatchStorageWrite(key:string){
  try{
    if(typeof window!=="undefined"&&window.dispatchEvent){
      var ev:any;try{ev=new CustomEvent("fainance-storage-write",{detail:{key:key}});}catch(_e){ev=new Event("fainance-storage-write");ev.detail={key:key};}
      window.dispatchEvent(ev);
    }
  }catch(e){}
}
export function useFainanceSensitiveStorage(key:string,dv:any,uid:string){
  var [value,setValue]=useState(Array.isArray(dv)?dv:[]);var [ready,setReady]=useState(false);var writeRevision=useRef(0);
  useEffect(function(){
    var cancelled=false;setReady(false);writeRevision.current++;
    (async function(){
      try{
        var raw=localStorage.getItem(key);
        if(raw==null||raw===""){if(!cancelled)setValue(Array.isArray(dv)?dv:[]);return;}
        var stored:any;try{stored=JSON.parse(raw);}catch(e){stored=raw;}
        var decoded=await fainanceDecryptSensitiveData(stored,uid);
        if(cancelled)return;
        setValue(decoded);
        if(Array.isArray(stored)){
          var upgraded=await fainanceEncryptSensitiveData(decoded,uid);
          if(!cancelled)localStorage.setItem(key,JSON.stringify(upgraded));
        }
      }catch(e){
        console.error("Sensitive local storage read error",key,(e&&e.message)||e);
        if(!cancelled)setValue(Array.isArray(dv)?dv:[]);
      }finally{if(!cancelled)setReady(true);}
    })();
    return function(){cancelled=true;};
  },[key,uid]);
  var save=useCallback(function(next:any){
    setValue(function(prev:any){
      var resolved=typeof next==="function"?next(prev):next;var safe=Array.isArray(resolved)?resolved:[];if(syncJsonStableEqual(prev,safe))return prev;var revision=++writeRevision.current;
      fainanceEncryptSensitiveData(safe,uid).then(function(encrypted){
        if(revision!==writeRevision.current)return;
        localStorage.setItem(key,JSON.stringify(encrypted));fainanceDispatchStorageWrite(key);
      }).catch(function(err){console.error("Sensitive local storage write blocked",key,(err&&err.message)||err);});
      return safe;
    });
  },[key,uid]);
  return [value,save,ready];
}
