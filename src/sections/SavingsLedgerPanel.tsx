import { closureText } from '../i18n/savingsClosureTranslations';
import { savingsGoalText } from '../i18n/savingsGoalsTranslations';
import { useState } from 'react';
import { useApp, todayStr } from '../core';
import { cancelSavingsEntry, saveSavingsEntry, savingsAmountMinor } from '../finance/savingsLedger';
import { ledgerText } from '../i18n/savingsLedgerTranslations';
import { savingsText } from '../i18n/savingsTranslations';

export function SavingsLedgerPanel({bucketId}:{bucketId:string}) {
  const ctx:any = useApp();
  const [draft,setDraft] = useState<any>(null);
  const [cancelId,setCancelId] = useState<{id:string;revision:number}|null>(null);
  const [error,setError] = useState('');
  const [saved,setSaved] = useState(false);
  const bucket = ctx.financeEvolution.savings.buckets.find(item=>item.id===bucketId);
  if (!bucket) return null;
  const lang=ctx.lang || 'it';
  const T=(key:Parameters<typeof ledgerText>[1])=>ledgerText(lang,key);
  const G=(key:Parameters<typeof savingsGoalText>[1])=>savingsGoalText(lang,key);
  const S=(key:Parameters<typeof savingsText>[1])=>savingsText(lang,key);
  const money=(minor:number)=>new Intl.NumberFormat(lang,{style:'currency',currency:bucket.currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100);
  const dateLabel=(date:string)=>{try{return date ? new Intl.DateTimeFormat(lang).format(new Date(date+'T12:00:00')) : '—';}catch{return '—';}};
  const entries=[...ctx.financeEvolution.savings.entries,...ctx.financeEvolution.savings.coverageEntries.filter(e=>e.kind==='period-v1').map(e=>({...e,kind:'coverage',amountMinor:-e.amountMinor}))].filter(entry=>entry.bucketId===bucketId).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')) || a.id.localeCompare(b.id));
  const button={border:`1px solid ${ctx.borderC}`,borderRadius:10,padding:'9px 11px',background:ctx.cardBg,color:ctx.textC,cursor:'pointer'};
  function apply(operation:(previous:any)=>any) {
    try {ctx.setFinanceEvolution(operation);setDraft(null);setCancelId(null);setError('');setSaved(true);}
    catch(failure){const code=failure instanceof Error?failure.message:'';setError(code==='CLOSED_SAVINGS_ENTRY'?closureText(lang,'depositLock'):T(code==='INVALID_SAVINGS_AMOUNT'?'invalidAmount':code==='INVALID_SAVINGS_DATE'?'invalidDate':code==='SAVINGS_ENTRY_CONFLICT'?'conflict':['BUCKET_NOT_FOUND','INACTIVE_SAVINGS_BUCKET','SAVINGS_ENTRY_UNAVAILABLE'].includes(code)?'unavailable':'failed'));setSaved(false);}
  }
  function edit(entry?:any) {
    setError('');setSaved(false);setCancelId(null);
    setDraft(entry?{id:entry.id,expectedRevision:entry.revision,date:entry.date,amount:(entry.amountMinor/100).toFixed(2),source:entry.source}:{id:crypto.randomUUID(),date:todayStr(),amount:'',source:'planned',includeGoal:true,expectedGoalId:bucket.goalId || null});
  }
  return <section aria-label={`${T('title')} — ${bucket.name}`} style={{marginTop:12,borderTop:`1px solid ${ctx.borderC}`,paddingTop:12}}>
    <div>{T('balance')}: <strong>{money(bucket.balanceMinor)}</strong></div>
    <details style={{marginTop:10}}>
      <summary style={{cursor:'pointer',fontWeight:700}}>{T('title')}</summary>
      <p style={{fontSize:12,color:ctx.subC,lineHeight:1.5}}>{T('hint')}</p>
      {bucket.active !== false && !draft && <button type="button" style={{...button,background:ctx.confirmButtonColor || '#6555BA',color:'#fff'}} onClick={()=>edit()}>{T('add')}</button>}
      {draft && <form style={{display:'grid',gap:10,marginTop:10}} onSubmit={event=>{event.preventDefault();apply(previous=>{if(draft.expectedRevision==null && bucket.goalId && !(draft.source==='extra' && draft.includeGoal===false)){const goal=(ctx.goals || []).find(item=>String(item.id)===bucket.goalId);if(!goal || (goal.currency || ctx.currency)!==bucket.currency)throw new Error('SAVINGS_ENTRY_UNAVAILABLE');}return saveSavingsEntry(previous,{...draft,bucketId,currency:bucket.currency,amountMinor:savingsAmountMinor(draft.amount)});});}}>
        <label>{T('date')}<input required type="date" value={draft.date} onChange={event=>setDraft({...draft,date:event.target.value})} style={{...ctx.inp,display:'block',width:'100%',boxSizing:'border-box'}}/></label>
        <label>{T('amount')} ({bucket.currency})<input required type="text" inputMode="decimal" value={draft.amount} onChange={event=>setDraft({...draft,amount:event.target.value})} style={{...ctx.inp,display:'block',width:'100%',boxSizing:'border-box'}}/></label>
        <label>{T('source')}<select value={draft.source} onChange={event=>setDraft({...draft,source:event.target.value})} style={{...ctx.inp,display:'block',width:'100%'}}><option value="planned">{T('planned')}</option><option value="extra">{T('extra')}</option></select></label>
        {draft.expectedRevision==null && bucket.goalId && draft.source==='extra' && <label><input type="checkbox" checked={draft.includeGoal!==false} onChange={event=>setDraft({...draft,includeGoal:event.target.checked})}/> {G('extra')}</label>}
        <div style={{display:'flex',flexWrap:'wrap',gap:8}}><button type="submit" style={button}>{S('save')}</button><button type="button" style={button} onClick={()=>{setDraft(null);setError('');}}>{S('cancel')}</button></div>
      </form>}
      {error && <p role="alert" style={{color:ctx.expColor || '#B42318'}}>{error}</p>}
      {saved && <p role="status">{T('saved')}</p>}
      <h4 style={{margin:'14px 0 8px'}}>{T('history')}</h4>
      {!entries.length && <p style={{fontSize:12,color:ctx.subC}}>{T('empty')}</p>}
      <div style={{display:'grid',gap:10}}>{entries.map(entry=><div key={entry.id} style={{border:`1px solid ${ctx.borderC}`,borderRadius:10,padding:10}}>
        <strong style={{textDecoration:entry.status==='cancelled'?'line-through':undefined}}>{money(entry.amountMinor)}</strong>
        <div style={{fontSize:12,marginTop:4}}>{dateLabel(entry.date)}{entry.goalId && <> · {(ctx.goals || []).find(goal=>String(goal.id)===entry.goalId)?.name || G('unavailable')}</>}</div>
        {entry.kind==='coverage'&&<div style={{fontSize:12}}>{closureText(lang,'coverage')}</div>}
        {entry.status==='cancelled' ? <div style={{fontSize:12,color:ctx.subC}}>{T('cancelled')}</div> : entry.kind==='manual' && <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:8}}>
          <button type="button" style={button} disabled={!!draft || cancelId!==null} onClick={()=>edit(entry)}>{T('edit')}</button>
          <button type="button" style={button} disabled={!!draft || cancelId!==null} onClick={()=>{setCancelId({id:entry.id,revision:entry.revision});setError('');setSaved(false);}}>{T('cancelEntry')}</button>
        </div>}
        {cancelId?.id===entry.id && <div style={{marginTop:10}}><p style={{fontSize:12}}>{T('confirmHint')}</p><div style={{display:'flex',flexWrap:'wrap',gap:8}}><button type="button" style={button} onClick={()=>apply(previous=>cancelSavingsEntry(previous,entry.id,cancelId.revision))}>{T('confirmCancel')}</button><button type="button" style={button} onClick={()=>setCancelId(null)}>{S('cancel')}</button></div></div>}
        {!!entry.history?.length && <details style={{marginTop:8,fontSize:12,color:ctx.subC}}><summary style={{cursor:'pointer'}}>{T('revisions')}</summary>{entry.history.map((previous,index)=><p key={index}>{dateLabel(previous.date)} · {money(previous.amountMinor)}</p>)}</details>}
      </div>)}</div>
    </details>
  </section>;
}
