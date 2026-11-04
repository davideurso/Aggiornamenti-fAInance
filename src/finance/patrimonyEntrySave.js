import {parseMoneyValue} from '../financeCalculations.js';
import {patrimonySnapshotValue} from './patrimonyMerge.js';
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const cents=v=>Math.round(parseMoneyValue(v)*100);
export function validPatrimonyAmount(value){return typeof value==='number'?Number.isFinite(value):/^[-+]?\d+(?:[.,]\d+)?$/.test(String(value).trim());}
export function savePatrimonyEntryAmount(state,{entryId,month,value},now=new Date().toISOString()){
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)||month>state.curMonthKey)throw Error('INVALID_PATRIMONY_MONTH');
 const entries=state.patrimonioEntries||[],entry=entries.find(e=>String(e.id)===String(entryId)&&!e.deleted&&!e.deletedAt);if(!entry)throw Error('INVALID_PATRIMONY_ENTRY');
 if(!validPatrimonyAmount(value)||!Number.isSafeInteger(cents(value)))throw Error('INVALID_PATRIMONY_AMOUNT');
 const detail=month===state.curMonthKey&&state.patrimonioAutomatic?.details?.[String(entryId)];if(detail&&!detail.blocked)throw Error('AUTOMATIC_PATRIMONY_ENTRY');
 const amount=cents(value)/100,history=state.patrimonioHistory||{},values=state.patrimonioValues||{},previous=history[month]||{},hit=patrimonySnapshotValue(previous,entry),current=month===state.curMonthKey;
 if(hit.found&&cents(hit.value)===cents(amount)&&(!current||(own(values,entry.id)&&cents(values[entry.id])===cents(amount))))return{changed:false,amount,patrimonioHistory:history,patrimonioValues:values};
 const base={};if(current)for(const e of entries)if(!e.deleted&&!e.deletedAt&&!e.archived&&own(values,e.id)&&!patrimonySnapshotValue(previous,e).found)base[e.id]=values[e.id];
 const snapshot={...base,...previous,[entry.id]:amount};
 // Preserve legacy nested snapshots; the edited field is canonical and must agree.
 for(const key of ['values','entries'])if(previous[key]&&typeof previous[key]==='object'){
  snapshot[key]={...previous[key]};for(const name of [String(entry.id),entry.name])if(own(snapshot[key],name))snapshot[key][name]=amount;
 }
 snapshot._entryTransactionCounts={...(previous._entryTransactionCounts||{}),[String(entry.id)]:Math.max(1,Number(previous._entryTransactionCounts?.[String(entry.id)])||0)};
 const oldCount=Number(previous._entryTransactionCounts?.[String(entry.id)])||0;
 snapshot._transactionCount=previous._transactionCount!=null?Number(previous._transactionCount)+(oldCount>0?0:1):Object.values(snapshot._entryTransactionCounts).reduce((n,x)=>n+Number(x||0),0);
 snapshot._total=entries.filter(e=>!e.deleted&&!e.deletedAt&&(!e.archived||patrimonySnapshotValue(snapshot,e).found)).reduce((sum,e)=>sum+cents(patrimonySnapshotValue(snapshot,e).value),0)/100;
 snapshot._savedAt=now;
 snapshot._confirmedEntries={...snapshot._confirmedEntries,[entry.id]:true};
 snapshot._entryConfirmedAt={...snapshot._entryConfirmedAt,[entry.id]:now};
 if(snapshot._postClosingBase){snapshot._postClosingBase={...snapshot._postClosingBase};delete snapshot._postClosingBase[entry.id];}
 return{changed:true,amount,patrimonioHistory:{...history,[month]:snapshot},patrimonioValues:current?{...values,[entry.id]:amount}:values};
}
