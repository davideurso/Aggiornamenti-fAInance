// Virtual notices have no server delivery timestamp. Preserve their first
// observation; never reset it when a notice is read or its label changes.
export function serverNotificationTime(item) {
 const ms=Number(item?.createdAtMs);
 if(Number.isFinite(ms)&&ms>0)return ms;
 const raw=item?.createdAt;
 if(raw&&typeof raw.toMillis==='function'){const value=raw.toMillis();if(Number.isFinite(value)&&value>0)return value;}
 const value=typeof raw==='string'?Date.parse(raw):NaN;
 return Number.isFinite(value)&&value>0?value:0;
}
export function recordNotificationArrivals(previous,items,now) {
 const source=previous&&typeof previous==='object'&&!Array.isArray(previous)?previous:{};
 const result={...source};let changed=false;
 const time=Number(now);if(!Number.isFinite(time)||time<=0)return source;
 let order=Math.max(0,...Object.values(source).map(row=>Number(row?.order)||0));
 for(const item of items||[]){
  const key=String(item?.id||'');if(!key||result[key]?.at>0)continue;
  // Stored messages retain the timestamp supplied by their authoring service.
  result[key]={at:!item.virtual&&serverNotificationTime(item)||time,order:++order};changed=true;
 }
 if(!changed)return source;
 const keys=Object.keys(result).sort((a,b)=>Number(result[b].order)-Number(result[a].order));
 return Object.fromEntries(keys.slice(0,1000).map(key=>[key,result[key]]));
}
export function sortNotificationsNewestFirst(items,arrivals={}) {
 return (items||[]).map((item,index)=>({item,index})).sort((a,b)=>{
  const time=item=>!item.virtual&&serverNotificationTime(item)||Number(arrivals[String(item.id)]?.at)||0;
  return time(b.item)-time(a.item)||(Number(arrivals[String(b.item.id)]?.order)||0)-(Number(arrivals[String(a.item.id)]?.order)||0)||a.index-b.index;
 }).map(row=>row.item);
}