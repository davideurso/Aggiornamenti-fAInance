import {parseMoneyValue} from '../financeCalculations.js';
import {civilToday,createBalanceCheckpoint} from './patrimonyAutoBalance.js';
const own=(o,k)=>o&&Object.prototype.hasOwnProperty.call(o,k);
const live=e=>e&&!e.deleted&&!e.deletedAt;
const cents=v=>Math.round(parseMoneyValue(v)*100);
function keys(entry){return [...new Set([String(entry.id),entry.name].filter(Boolean))];}
export function patrimonySnapshotValue(snapshot,entry){
 for(const container of [snapshot,snapshot?.values,snapshot?.entries])for(const key of keys(entry))if(own(container,key))return {found:true,value:parseMoneyValue(container[key])};
 return {found:false,value:0};
}
export function patrimonyReferences(state,source){
 const rows=Object.entries(state.patrimonioHistory||{}).filter(([key])=>/^\d{4}-\d{2}$/.test(key)).sort(([a],[b])=>a.localeCompare(b)).flatMap(([month,snapshot])=>{const hit=patrimonySnapshotValue(snapshot,source);return hit.found?[{month,amount:hit.value}]:[];});
 const current=patrimonySnapshotValue(state.patrimonioValues,source);
 if(current.found)rows.push({month:'current',amount:current.value});
 return rows;
}
export function patrimonyHasData(state,source){return patrimonyReferences(state,source).length>0||keys(source).some(k=>own(state.patrimonioNotes,k))||!!source.balanceLink?.checkpoints?.length;}
function mergedSnapshot(snapshot,source,target){
 const a=patrimonySnapshotValue(snapshot,source),b=patrimonySnapshotValue(snapshot,target);
 if(!a.found)return snapshot;
 const out={...snapshot};
 for(const name of ['values','entries'])if(out[name]&&typeof out[name]==='object'&&!Array.isArray(out[name])){out[name]={...out[name]};for(const k of [...keys(source),...keys(target)])delete out[name][k];}
 for(const k of [...keys(source),...keys(target)])delete out[k];
 out[target.id]=(cents(a.value)+cents(b.value))/100;
 for(const meta of ['_automatic','_entryTransactionCounts'])if(snapshot[meta]){
  out[meta]={...snapshot[meta]};const av=out[meta][source.id],bv=out[meta][target.id];delete out[meta][source.id];
  if(av!==undefined||bv!==undefined)out[meta][target.id]=meta==='_automatic'?!!(av||bv):(Number(av)||0)+(Number(bv)||0);
 }
 // _total and unrelated snapshot metadata already represent the same aggregate.
 return out;
}
export function mergePatrimony(state,source,target,now=new Date().toISOString()){
 const entries=state.patrimonioEntries||[],s=entries.find(e=>live(e)&&String(e.id)===String(source.id)),t=entries.find(e=>live(e)&&String(e.id)===String(target?.id));
 if(!s||!t||String(s.id)===String(t.id))throw Error('INVALID_PATRIMONY_TARGET');
 // A legacy name-only value cannot be assigned safely when that name belongs to both entries.
 if(s.name===t.name&&[state.patrimonioValues,...Object.values(state.patrimonioHistory||{})].some(snap=>!own(snap,s.id)&&!own(snap,t.id)&&[snap,snap?.values,snap?.entries].some(obj=>own(obj,s.name))))throw Error('AMBIGUOUS_PATRIMONY_NAME');
 const values=mergedSnapshot(state.patrimonioValues||{},s,t),history=Object.fromEntries(Object.entries(state.patrimonioHistory||{}).map(([month,snap])=>[month,mergedSnapshot(snap,s,t)]));
 const notes={...(state.patrimonioNotes||{})};const sn=keys(s).find(k=>own(notes,k)),tn=keys(t).find(k=>own(notes,k));
 if(sn){const note=notes[sn];if(tn&&String(notes[tn])!==String(note))notes[t.id]=String(notes[tn])+'\n\n'+s.name+': '+String(note);else notes[t.id]=note;for(const k of keys(s))if(k!==String(t.id))delete notes[k];}
 const ids=[...new Set([s,t].flatMap(e=>e.balanceLink?.enabled?e.balanceLink.checkpoints?.at(-1)?.methodIds||[]:[]).map(String))];
 if(entries.some(e=>live(e)&&![String(s.id),String(t.id)].includes(String(e.id))&&e.balanceLink?.enabled&&e.balanceLink.checkpoints?.at(-1)?.methodIds?.some(id=>ids.includes(String(id)))))throw Error('PATRIMONY_MAPPING_CONFLICT');
 let balanceLink=t.balanceLink;
 if(ids.length){const amount=patrimonySnapshotValue(values,t).value;const checkpoint=createBalanceCheckpoint({date:civilToday(new Date(now)),amount,methodIds:ids,expenses:state.expenses,incomes:state.incomes,shareCashMovements:state.shareCashMovements,now});balanceLink={version:1,enabled:true,checkpoints:[...(t.balanceLink?.checkpoints||[]),checkpoint]};}
 const updated=entries.map(e=>String(e.id)===String(s.id)?{...e,archived:true,deleted:true,userDeleted:true,custom:true,deletedAt:now,updatedAt:now,...(e.balanceLink?{balanceLink:{...e.balanceLink,enabled:false}}:{})}:String(e.id)===String(t.id)?{...e,...(balanceLink?{balanceLink}:{}),updatedAt:now}:e);
 return {patrimonioEntries:updated,patrimonioValues:values,patrimonioHistory:history,patrimonioNotes:notes};
}
