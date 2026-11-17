import {parseMoneyValue} from '../financeCalculations.js';
import {civilToday,derivePatrimony,latestPatrimonyTransferVersions} from './patrimonyAutoBalance.js';
import {periodForDate,periodForKey} from './periodEngine.js';
import {patrimonySnapshotValue} from './patrimonyMerge.js';
const live=e=>e&&!e.deleted&&!e.deletedAt;
const cents=v=>Math.round(parseMoneyValue(v)*100);
export function patrimonyTransferHistory(entries=[]){
 return latestPatrimonyTransferVersions(entries.flatMap(e=>e.fundTransfersV1||[]))
   .sort((a,b)=>String(b.date).localeCompare(String(a.date))||String(b.createdAt).localeCompare(String(a.createdAt)));
}
export function validPatrimonyTransferDate(date, today = civilToday()){
 if(typeof date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(date)||date>today)return false;
 try{periodForDate(date);return true;}catch{return false;}
}
export function patrimonyTransferAvailability(state, entryId, date, today = civilToday()){
 const entry=(state.patrimonioEntries||[]).find(e=>live(e)&&String(e.id)===String(entryId));
 if(!entry||!validPatrimonyTransferDate(date,today))return null;
 if(date===today){
  const live=patrimonySnapshotValue(state.patrimonioValues,entry);
  return live.found?live.value:null;
 }
 const settings=state.accountingPeriod?.settings;
 if(state.patrimonioMode!=='manuale'&&entry.balanceLink?.enabled){
  const derived=derivePatrimony({entries:state.patrimonioEntries,expenses:state.expenses,incomes:state.incomes,shareCashMovements:state.shareCashMovements,mode:state.patrimonioMode,today:date,periodSettings:settings});
  const detail=derived.details[String(entry.id)];
  if(detail&&!detail.blocked)return detail.amount;
 }
 const period=periodForDate(date,settings);
 const snapshot=patrimonySnapshotValue(state.patrimonioHistory?.[period.key],entry);
 return date===periodForKey(period.key,settings).end&&snapshot.found?snapshot.value:null;
}
// Transfers are versioned ledger records. Opening balances are independent of the ledger.
export function transferPatrimonyFunds(state,{id,fromId,toId,amount,date},now=new Date().toISOString()){
 const today=civilToday(new Date(now));
 date=date??today;
 if(!validPatrimonyTransferDate(date,today))throw Error('TRANSFER_DATE');
 const entries=state.patrimonioEntries||[],old=patrimonyTransferHistory(entries).find(r=>r.id===id);
 if(old){if(old.fromId!==String(fromId)||old.toId!==String(toId)||cents(old.amount)!==cents(amount)||old.date!==date)throw Error('TRANSFER_ID_CONFLICT');return null;}
 if(!id||String(fromId)===String(toId))throw Error('TRANSFER_ACCOUNTS');
 const from=entries.find(e=>live(e)&&String(e.id)===String(fromId)),to=entries.find(e=>live(e)&&String(e.id)===String(toId));
 if(!from||!to)throw Error('TRANSFER_ACCOUNTS');
 const numeric=Number(parseMoneyValue(amount)),sum=cents(amount);
 if(String(amount).trim()===''||!/^\d[\d.,\s]*$/.test(String(amount).trim())||!Number.isFinite(numeric)||!Number.isSafeInteger(sum)||sum<=0)throw Error('TRANSFER_AMOUNT');
 if([from,to].some(e=>state.patrimonioAutomatic?.details?.[String(e.id)]?.blocked))throw Error('TRANSFER_MAPPING');
 const values={...(state.patrimonioValues||{})},before={},after={};
 for(const [entry,delta]of [[from,-sum],[to,sum]]){
  const current=cents(values[entry.id]??0);if(!Number.isSafeInteger(current)||!Number.isSafeInteger(current+delta))throw Error('TRANSFER_AMOUNT');
  before[entry.id]=current/100;after[entry.id]=(current+delta)/100;values[entry.id]=after[entry.id];
 }
 const month=state.accountingPeriod?.keyForDate(today)||today.slice(0,7);
 const transferMonth=state.accountingPeriod?.keyForDate(date)||date.slice(0,7);
 const record={id:String(id),date,amount:sum/100,fromId:String(from.id),toId:String(to.id),fromName:from.name,toName:to.name,before,after,createdAt:now};
 const updated=entries.map(e=>{
  if(![String(from.id),String(to.id)].includes(String(e.id)))return e;
  return {...e,...(String(e.id)===String(from.id)?{fundTransfersV1:[...(e.fundTransfersV1||[]),record]}:{}),updatedAt:now};
 });
 const history={...(state.patrimonioHistory||{})};
 for(const [key,prior] of Object.entries(history)){
  if(key<transferMonth||key>=month)continue;
  const next={...prior};
  let totalDelta=0;
  for(const [entry,delta] of [[from,-sum],[to,sum]]){
   const hit=patrimonySnapshotValue(prior,entry);
   if(!hit.found)continue;
   next[entry.id]=(cents(hit.value)+delta)/100;
   if(prior._postClosingBase?.[entry.id]!=null)next._postClosingBase={...next._postClosingBase,[entry.id]:(cents(prior._postClosingBase[entry.id])+delta)/100};
   totalDelta+=delta;
  }
  if(typeof prior._total==='number')next._total=(cents(prior._total)+totalDelta)/100;
  history[key]=next;
 }
 const snapshot={...(history[month]||{}),[from.id]:after[from.id],[to.id]:after[to.id]};
 if(state.patrimonioMode!=='manuale'){
  snapshot._automatic={...snapshot._automatic};
  for(const entry of [from,to])if(entry.balanceLink?.enabled)snapshot._automatic[entry.id]=true;
 }
 for(const e of entries.filter(live))if(!e.archived&&!Object.prototype.hasOwnProperty.call(snapshot,e.id))snapshot[e.id]=values[e.id]??0;
 snapshot._total=entries.filter(e=>live(e)&&(!e.archived||Object.prototype.hasOwnProperty.call(snapshot,e.id))).reduce((n,e)=>n+cents(snapshot[e.id]??0),0)/100;
 history[month]=snapshot;
 return {patrimonioEntries:updated,patrimonioValues:values,patrimonioHistory:history,record};
}

export function revisePatrimonyTransfer(state,id,replacement,now=new Date().toISOString()){
 const rows=state.patrimonioEntries||[],old=patrimonyTransferHistory(rows).find(r=>String(r.id)===String(id));
 if(!old)throw Error('TRANSFER_NOT_FOUND');
 const stamp=new Date(Math.max(Date.parse(now),Date.parse(old.updatedAt||old.createdAt)+1)).toISOString();
 const values={...state.patrimonioValues},history={...state.patrimonioHistory};
 const period=state.accountingPeriod?.keyForDate(old.date)||old.date.slice(0,7);
 const adjustments=[[old.fromId,cents(old.amount)],[old.toId,-cents(old.amount)]];
 for(const [entryId,delta] of adjustments){
  const entry=rows.find(e=>String(e.id)===String(entryId));
  if(!entry||!live(entry))continue;
  values[entryId]=(cents(values[entryId]??0)+delta)/100;
  for(const [key,snapshot] of Object.entries(history)){
   if(key<period)continue;
   const hit=patrimonySnapshotValue(snapshot,entry);
   if(!hit.found)continue;
   const next={...snapshot,[entryId]:(cents(hit.value)+delta)/100};
   if(snapshot._postClosingBase?.[entryId]!=null)next._postClosingBase={...snapshot._postClosingBase,[entryId]:(cents(snapshot._postClosingBase[entryId])+delta)/100};
   if(typeof snapshot._total==='number')next._total=(cents(snapshot._total)+delta)/100;
   history[key]=next;
  }
 }
 const entries=rows.map(entry=>{
  if(String(entry.id)!==String(old.fromId))return entry;
  return {...entry,updatedAt:stamp,fundTransfersV1:[...(entry.fundTransfersV1||[]),{...old,deletedAt:stamp,updatedAt:stamp}]};
 });
 const reversed={...state,patrimonioEntries:entries,patrimonioValues:values,patrimonioHistory:history};
 if(!replacement)return {patrimonioEntries:entries,patrimonioValues:values,patrimonioHistory:history,record:{...old,deletedAt:stamp}};
 return transferPatrimonyFunds(reversed,{...replacement,id},new Date(Date.parse(stamp)+1).toISOString());
}
