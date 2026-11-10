import { readableDarkText } from '../ui/textContrast';
import { closureText } from '../i18n/savingsClosureTranslations';
import { savingsGoalText } from '../i18n/savingsGoalsTranslations';
import { useState } from 'react';
import { useApp, todayStr, smallDecimalNode } from '../core';
import { cancelSavingsEntry, saveSavingsEntry, savingsAmountMinor } from '../finance/savingsLedger';
import { ledgerText } from '../i18n/savingsLedgerTranslations';
import { savingsText } from '../i18n/savingsTranslations';

export function SavingsLedgerPanel({bucketId}:{bucketId:string}) {
  const ctx:any = useApp();
  const [draft,setDraft] = useState<any>(null);
  const [cancelId,setCancelId] = useState<{id:string;revision:number}|null>(null);
  const [error,setError] = useState('');
  const bucket = ctx.financeEvolution.savings.buckets.find(item=>item.id===bucketId);
  if (!bucket) return null;
  const lang=ctx.lang || 'it';
  const T=(key:Parameters<typeof ledgerText>[1])=>ledgerText(lang,key);
  const G=(key:Parameters<typeof savingsGoalText>[1])=>savingsGoalText(lang,key);
  const S=(key:Parameters<typeof savingsText>[1])=>savingsText(lang,key);
  const money=(minor:number)=>smallDecimalNode(new Intl.NumberFormat(lang,{style:'currency',currency:bucket.currency,minimumFractionDigits:2,maximumFractionDigits:2}).format(minor/100),lang);
  const dateLabel=(date:string)=>{try{return date ? new Intl.DateTimeFormat(lang).format(new Date(date+'T12:00:00')) : '—';}catch{return '—';}};
  const entries=[...ctx.financeEvolution.savings.entries,...ctx.financeEvolution.savings.coverageEntries.filter(e=>e.kind==='period-v1').map(e=>({...e,kind:'coverage',amountMinor:-e.amountMinor}))].filter(entry=>entry.bucketId===bucketId).slice().sort((a,b)=>String(b.date||'').localeCompare(String(a.date||'')) || String(b.createdAt||'').localeCompare(String(a.createdAt||'')) || a.id.localeCompare(b.id));
  const accent=ctx.confirmButtonColor||'#6555BA',surface=ctx.dark?'#10243A':'#FFFFFF';
  const symbol=new Intl.NumberFormat(lang,{style:'currency',currency:bucket.currency,currencyDisplay:'narrowSymbol'}).formatToParts(0).find(part=>part.type==='currency')?.value || bucket.currency;
  const button={minHeight:44,fontSize:13,fontWeight:750,display:'inline-flex',alignItems:'center',justifyContent:'center',gap:7,boxSizing:'border-box' as const,border:`1px solid ${ctx.borderC}`,borderRadius:12,padding:'10px 14px',background:ctx.cardBg,color:ctx.textC,cursor:'pointer'};
  const primary={...button,background:accent,borderColor:accent,color:readableDarkText('#fff',ctx.dark,accent),boxShadow:ctx.dark?'none':'0 3px 9px '+accent+'25'};
  const secondary={...button,background:ctx.dark?'#19314A':'#EFF3F8',borderColor:ctx.borderC,color:ctx.textC};
  const correction={...button,background:ctx.dark?'#18354F':'#EDF4FC',borderColor:ctx.dark?'#355C80':'#C9DDF2',color:readableDarkText('#245B8E',ctx.dark,ctx.dark?'#18354F':'#EDF4FC')};
  const danger={...button,background:ctx.dark?'#3B242C':'#FFF1F2',borderColor:ctx.dark?'#75424E':'#F3C8CF',color:readableDarkText('#B63B45',ctx.dark,ctx.dark?'#3B242C':'#FFF1F2')};
  const field={...ctx.inp,display:'block',width:'100%',minWidth:0,minHeight:46,boxSizing:'border-box' as const,border:`1px solid ${ctx.borderC}`,borderRadius:11,padding:'11px 12px',fontSize:16,lineHeight:1.3,background:surface,color:ctx.textC,colorScheme:ctx.dark?'dark':'light'};
  const label={display:'grid',gap:7,fontSize:12,fontWeight:750,color:ctx.subC,minWidth:0};
  function apply(operation:(previous:any)=>any) {
    try {ctx.setFinanceEvolution(operation);setDraft(null);setCancelId(null);setError('');ctx.setToast?.({id:crypto.randomUUID(),text:T('saved'),type:'success',color:'#18794E',duration:2200});}
    catch(failure){const code=failure instanceof Error?failure.message:'';setError(code==='CLOSED_SAVINGS_ENTRY'?closureText(lang,'depositLock'):T(code==='INVALID_SAVINGS_AMOUNT'?'invalidAmount':code==='INVALID_SAVINGS_DATE'?'invalidDate':code==='SAVINGS_ENTRY_CONFLICT'?'conflict':['BUCKET_NOT_FOUND','INACTIVE_SAVINGS_BUCKET','SAVINGS_ENTRY_UNAVAILABLE'].includes(code)?'unavailable':'failed'));}
  }
  function edit(entry?:any) {
    setError('');setCancelId(null);
    setDraft(entry?{id:entry.id,expectedRevision:entry.revision,date:entry.date,amount:(entry.amountMinor/100).toFixed(2),source:entry.source}:{id:crypto.randomUUID(),date:todayStr(),amount:'',source:'planned',includeGoal:true,expectedGoalId:bucket.goalId || null});
  }
  return <section aria-label={`${T('title')} — ${bucket.name}`} style={{marginTop:12,borderTop:`1px solid ${ctx.borderC}`,paddingTop:12}}>
    <div data-savings-balance style={{display:'flex',flexDirection:'column',gap:7,padding:'13px 14px',borderRadius:12,border:`1px solid ${ctx.borderC}`,background:ctx.dark?'#132B29':'#EAF8F1',minWidth:0}}>
      <div style={{fontSize:12,fontWeight:700,color:readableDarkText(ctx.subC,ctx.dark,ctx.dark?'#132B29':'#EAF8F1')}}>{T('balance')}</div>
      <strong style={{fontSize:24,lineHeight:1.2,fontWeight:850,fontVariantNumeric:'tabular-nums',overflowWrap:'anywhere',color:readableDarkText(bucket.balanceMinor<0?(ctx.expColor||'#B63B45'):'#18794E',ctx.dark,ctx.dark?'#132B29':'#EAF8F1')}}>{money(bucket.balanceMinor)}</strong>
    </div>
    <details style={{marginTop:10}}>
      <summary style={{cursor:'pointer',fontWeight:700}}>{T('title')}</summary>
      <p style={{fontSize:12,color:ctx.subC,lineHeight:1.5}}>{T('hint')}</p>
      {bucket.active !== false && !draft && <button type="button" style={primary} onClick={()=>edit()}>{T('add')}</button>}
      {draft && <form data-savings-entry-form style={{display:'grid',gap:14,marginTop:14,padding:14,borderRadius:15,border:`1px solid ${ctx.borderC}`,background:ctx.dark?'#0D1E30':'#F1F5FA'}} onSubmit={event=>{event.preventDefault();apply(previous=>{if(draft.expectedRevision==null && bucket.goalId && !(draft.source==='extra' && draft.includeGoal===false)){const goal=(ctx.goals || []).find(item=>String(item.id)===bucket.goalId);if(!goal || (goal.currency || ctx.currency)!==bucket.currency)throw new Error('SAVINGS_ENTRY_UNAVAILABLE');}return saveSavingsEntry(previous,{...draft,bucketId,currency:bucket.currency,amountMinor:savingsAmountMinor(draft.amount)});});}}>
        <div style={{display:'flex',alignItems:'center',gap:9,fontSize:14,fontWeight:850,color:ctx.textC}}><span aria-hidden="true">💰</span>{draft.expectedRevision==null?T('add'):T('edit')}</div>
        <label style={label}>{T('date')}<input required type="date" value={draft.date} onChange={event=>setDraft({...draft,date:event.target.value})} style={field}/></label>
        <label style={label}>{T('amount')}<div style={{position:'relative',minWidth:0}}><span aria-hidden="true" style={{position:'absolute',left:13,top:'50%',transform:'translateY(-50%)',fontSize:17,fontWeight:800,color:ctx.subC,pointerEvents:'none'}}>{symbol}</span><input required aria-label={T('amount')} type="text" inputMode="decimal" value={draft.amount} onChange={event=>setDraft({...draft,amount:event.target.value})} style={{...field,paddingLeft:42,fontWeight:750}}/></div></label>
        <label style={label}>{T('source')}<select aria-label={T('source')} value={draft.source} onChange={event=>setDraft({...draft,source:event.target.value})} style={field}><option value="planned" data-fainance-icon-ref={"\u{1F331}"}>{T('planned')}</option><option value="extra" data-fainance-icon-ref={"\u{2795}"}>{T('extra')}</option></select></label>
        {draft.expectedRevision==null && bucket.goalId && draft.source==='extra' && <label><input type="checkbox" checked={draft.includeGoal!==false} onChange={event=>setDraft({...draft,includeGoal:event.target.checked})}/> {G('extra')}</label>}
        <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10,paddingTop:2}}><button type="submit" style={primary}>{S('save')}</button><button type="button" style={secondary} onClick={()=>{setDraft(null);setError('');}}>{S('cancel')}</button></div>
      </form>}
      {error && <p role="alert" style={{color:readableDarkText(ctx.expColor || '#B42318', ctx.dark, "#35354a")}}>{error}</p>}
      <h4 style={{margin:'14px 0 8px'}}>{T('history')}</h4>
      {!entries.length && <p style={{fontSize:12,color:ctx.subC}}>{T('empty')}</p>}
      <div style={{display:'grid',gap:10}}>{entries.map(entry=><div key={entry.id} style={{border:`1px solid ${ctx.borderC}`,borderRadius:10,padding:12,background:ctx.dark?'#10243A':'#FFFFFF'}}>
        <strong style={{textDecoration:entry.status==='cancelled'?'line-through':undefined}}>{money(entry.amountMinor)}</strong>
        <div style={{fontSize:12,marginTop:4}}>{dateLabel(entry.date)}{entry.goalId && <> · {(ctx.goals || []).find(goal=>String(goal.id)===entry.goalId)?.name || G('unavailable')}</>}</div>
        {entry.kind==='coverage'&&<div style={{fontSize:12}}>{closureText(lang,'coverage')}</div>}
        {entry.status==='cancelled' ? <div style={{fontSize:12,color:ctx.subC}}>{T('cancelled')}</div> : entry.kind==='manual' && <div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:8,marginTop:12}}>
          <button type="button" style={{...correction,opacity:draft || cancelId!==null?.5:1}} disabled={!!draft || cancelId!==null} onClick={()=>edit(entry)}>{T('edit')}</button>
          <button type="button" style={{...danger,opacity:draft || cancelId!==null?.5:1}} disabled={!!draft || cancelId!==null} onClick={()=>{setCancelId({id:entry.id,revision:entry.revision});setError('');}}>{T('cancelEntry')}</button>
        </div>}
        {cancelId?.id===entry.id && <div style={{marginTop:10}}><p style={{fontSize:12}}>{T('confirmHint')}</p><div style={{display:'flex',flexWrap:'wrap',gap:8}}><button type="button" style={danger} onClick={()=>apply(previous=>cancelSavingsEntry(previous,entry.id,cancelId.revision))}>{T('confirmCancel')}</button><button type="button" style={secondary} onClick={()=>setCancelId(null)}>{S('cancel')}</button></div></div>}
        {!!entry.history?.length && <details style={{marginTop:8,fontSize:12,color:ctx.subC}}><summary style={{cursor:'pointer'}}>{T('revisions')}</summary>{entry.history.map((previous,index)=><p key={index}>{dateLabel(previous.date)} · {money(previous.amountMinor)}</p>)}</details>}
      </div>)}</div>
    </details>
  </section>;
}
