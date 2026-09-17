// fAInance synchronization kernel.
// Extracted from app.tsx without changing merge/tombstone/timestamp semantics.
// This module is intentionally pure and framework/platform independent.

export function accountSyncErrorInfo(e:any){
    var rawCode=String((e&&e.code)||"unknown");var code=rawCode.indexOf("/")>=0?rawCode.split("/").pop()||rawCode:rawCode;
    return {code:String(code||"unknown").toLowerCase(),rawCode:rawCode,message:String((e&&e.message)||e||"Errore sconosciuto")};
  }

export function accountSyncIsTransientError(e:any){
    var info=accountSyncErrorInfo(e);
    return ["unavailable","cancelled","canceled","aborted","deadline-exceeded","network-request-failed"].indexOf(info.code)>=0;
  }

export function syncJsonEqual(a,b){try{return JSON.stringify(a)===JSON.stringify(b);}catch(e){return false;}}

export function syncRecordTime(item){
    if(!item||typeof item!=="object")return 0;
    var candidates=[Number(item.syncUpdatedAtMs||0),Number(item.updatedAtMs||0),Number(item.order||0)];
    try{candidates.push(Date.parse(item.updatedAt||"")||0,Date.parse(item.createdAt||"")||0,Date.parse(item.restoredAt||"")||0,Date.parse(item.boughtAt||"")||0);}catch(e){}
    return Math.max.apply(Math,candidates.filter(function(x){return isFinite(x)&&x>0;}).concat([0]));
  }

export function syncComparableRecord(item){if(!item||typeof item!=="object")return item;var out={...item};delete out.syncUpdatedAtMs;return out;}

export function syncTombstoneTime(value){if(value&&typeof value==="object")return Number(value.deletedAt||value.ts||0);return 0;}

export function isExplicitSyncTombstone(value){return !!(value&&typeof value==="object"&&(value.explicit===true||value.source==="user"));}

export function mergeSyncTombstones(a,b){
    var out={};[a,b].forEach(function(src){if(!src||typeof src!=="object")return;Object.keys(src).forEach(function(k){var value=src[k];if(!isExplicitSyncTombstone(value))return;var ts=syncTombstoneTime(value);if(ts>syncTombstoneTime(out[k]))out[k]={deletedAt:ts,source:"user",explicit:true};});});
    return out;
  }

export function mergeSyncRecords(localValue,cloudValue,tombstones,keyFn,preferLocalOrder){
    var local=Array.isArray(localValue)?localValue:[];var cloud=Array.isArray(cloudValue)?cloudValue:[];var chosen={};
    function add(item,preferOnTie){if(!item||typeof item!=="object")return;var key=keyFn(item);if(!key)return;var prev=chosen[key];if(!prev||syncRecordTime(item)>syncRecordTime(prev)||(syncRecordTime(item)===syncRecordTime(prev)&&preferOnTie))chosen[key]=item;}
    cloud.forEach(function(x){add(x,!preferLocalOrder);});local.forEach(function(x){add(x,!!preferLocalOrder);});
    var order=[];var seen={};(preferLocalOrder?local.concat(cloud):cloud.concat(local)).forEach(function(x){var key=keyFn(x);if(key&&!seen[key]){seen[key]=true;order.push(key);}});
    return order.map(function(key){return chosen[key];}).filter(function(item){var key=keyFn(item);var deletedAt=syncTombstoneTime(tombstones&&tombstones[key]);return !deletedAt||syncRecordTime(item)>deletedAt;});
  }

export function stampLocalSyncRecords(currentValue,nextValue,keyFn){
    var current=Array.isArray(currentValue)?currentValue:[];var next=Array.isArray(nextValue)?nextValue:[];var currentByKey={};var now=Date.now();
    current.forEach(function(item){var key=keyFn(item);if(key)currentByKey[key]=item;});
    return next.map(function(item){var key=keyFn(item);var prev=key?currentByKey[key]:null;if(prev&&syncJsonEqual(syncComparableRecord(prev),syncComparableRecord(item))){var previousStamp=Number(prev.syncUpdatedAtMs||0);return previousStamp&&Number(item.syncUpdatedAtMs||0)!==previousStamp?{...item,syncUpdatedAtMs:previousStamp}:item;}return {...item,syncUpdatedAtMs:now};});
  }

export function removedSyncRecordTombstones(currentValue,nextValue,keyFn){
    var current=Array.isArray(currentValue)?currentValue:[];var next=Array.isArray(nextValue)?nextValue:[];var present={};var out={};var now=Date.now();
    next.forEach(function(item){var key=keyFn(item);if(key)present[key]=true;});current.forEach(function(item){var key=keyFn(item);if(key&&!present[key])out[key]={deletedAt:now,source:"user",explicit:true};});return out;
  }

export function accountSyncRecordKey(namespace,item){
    if(!item||typeof item!=="object")return "";
    var id=item.id!==undefined&&item.id!==null?String(item.id):String(item.syncRecordId||item.uuid||item.createdAt||item.created_at||"");
    if(!id&&item.date!==undefined)id=[item.date,item.amount,item.description||item.desc||item.title||item.name||""].join("|");
    return id?String(namespace)+":"+id:"";
  }
