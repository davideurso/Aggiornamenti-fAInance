// Test integration: preserve newer remote edits and explicit remote deletions
// when an offline device first reconnects. Never expose decrypted values in logs.
export function mergeSensitiveRecords(cloud,local,deleted,kind){
 const stamp=r=>Math.max(Number(r?.syncUpdatedAtMs||0),Date.parse(r?.updatedAt||r?.createdAt||'')||0);
 const rows=new Map();
 for(const r of [...(Array.isArray(cloud)?cloud:[]),...(Array.isArray(local)?local:[])]){
  if(!r||r.id==null)continue;const id=String(r.id),prior=rows.get(id);
  if(!prior||stamp(r)>=stamp(prior))rows.set(id,r);
 }
 return [...rows.values()].filter(r=>{const d=deleted?.[kind+':'+r.id];return !d||!d.explicit||Number(d.deletedAt||0)<stamp(r);});
}
