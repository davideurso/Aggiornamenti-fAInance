import {useEffect,useState} from 'react';
import {useApp,todayStr} from '../core';
import {closurePreview,closeSavingsPeriod,coverSavingsDeficit,deficitRemaining,distributeSavings} from '../finance/savingsClosure';
import {periodLabel,shiftPeriodKey} from '../finance/periodEngine';
import {closureText} from '../i18n/savingsClosureTranslations';
import {savingsText} from '../i18n/savingsTranslations';

export function SavingsClosurePanel({periodKey}:{periodKey:string}) {
  const ctx:any=useApp();
  const [draft,setDraft]=useState<any>(null),[error,setError]=useState(false);
  useEffect(()=>{setDraft(null);setError(false);},[periodKey,ctx.currency,ctx.financeEvolution?.period?.mode,ctx.financeEvolution?.period?.startDay]);
  if(!ctx.financeEvolution||!ctx.accountingPeriod)return null;
  const today=todayStr(),currency=ctx.currency||'EUR';
  if(ctx.accountingPeriod.forKey(periodKey).end>=ctx.accountingPeriod.forDate(today).start)return null;
  const T=(key:Parameters<typeof closureText>[1])=>closureText(ctx.lang||'it',key);
  const money=(n:number)=>new Intl.NumberFormat(ctx.lang||'it',{style:'currency',currency}).format(n/100);
  let preview:any;
  try{preview=closurePreview(ctx.financeEvolution,ctx.legacyBudgetPlan,ctx.expensesForAnalysis||ctx.expenses,ctx.incomes,periodKey,currency,today);}
  catch{return <p role="note">{T('overlap')}</p>;}
  const summary=preview.existing||preview.snapshot;
  const button={padding:'10px 12px',borderRadius:10,border:`1px solid ${ctx.borderC}`,background:ctx.cardBg,color:ctx.textC,cursor:'pointer'};
  const values=draft?Object.fromEntries(Object.entries(draft.values).map(([id,value])=>[id,Math.round(Number(value)*100)])):{};
  const total=Object.values(values).reduce((n:number,v:number)=>n+v,0) as number;
  const valid=Object.values(draft?.values||{}).every(v=>/^\d+$/.test(String(v)))&&Number.isSafeInteger(total)&&total<=summary.availableMinor;
  return <section aria-label={T('title')} style={{padding:14,marginTop:12,border:`1px solid ${ctx.borderC}`,borderRadius:14,color:ctx.textC,background:ctx.cardBg,minWidth:0}}>
    <h3 style={{margin:'0 0 10px',fontSize:16}}>{T(preview.existing?'closed':'title')} · {periodLabel(periodKey,ctx.lang||'it')}</h3>
    <div style={{display:'grid',gap:6,fontSize:13}}>
      <span>{T('real')}: <strong>{money(summary.realMinor)}</strong></span>
      <span>{T('deposited')}: <strong>{money(summary.depositedMinor)}</strong></span>
      <span>{T(preview.existing?'residual':'available')}: <strong>{money(preview.existing?summary.residualMinor:summary.availableMinor)}</strong></span>
    </div>
    {preview.existing?<p style={{fontSize:12,color:ctx.subC}}>{T('snapshot')}</p>:<>
      {summary.depositedMinor>Math.max(0,summary.realMinor)&&<p role="note" style={{fontSize:12}}>{T('overallocated')}</p>}
      {!draft?<button type="button" style={{...button,marginTop:12}} onClick={()=>{setDraft({token:preview.token,buckets:preview.buckets,values:Object.fromEntries(Object.entries(preview.proposal).map(([id,n])=>[id,String(Number(n)/100)]))});setError(false);}}>{T('review')}</button>:
        <form onSubmit={event=>{event.preventDefault();if(!valid)return;try{ctx.setFinanceEvolution(previous=>closeSavingsPeriod(previous,{legacyPlan:ctx.legacyBudgetPlan,expenses:ctx.expensesForAnalysis||ctx.expenses,incomes:ctx.incomes,periodKey,currency,today,goals:ctx.goals,expectedToken:draft.token,allocations:values}));setDraft(null);setError(false);}catch{setError(true);}}}>
          <p style={{fontSize:12}}>{T('hint')}</p>
          <p style={{fontSize:12}}>{T('closingHint')}</p>
          {!draft.buckets.length&&<p>{T('empty')}</p>}
          <div style={{display:'grid',gap:8}}>{draft.buckets.map(b=><label key={b.id} style={{minWidth:0,overflowWrap:'anywhere'}}>{b.name}<input type="number" min="0" step="1" required value={draft.values[b.id]} onChange={e=>setDraft({...draft,values:{...draft.values,[b.id]:e.target.value}})} style={{...ctx.inp,width:'100%',boxSizing:'border-box',display:'block',minWidth:0}}/></label>)}</div>
          <p>{T('residual')}: <strong>{money(summary.availableMinor-total)}</strong></p>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="submit" disabled={!valid} style={button}>{T('confirm')}</button><button type="button" style={button} onClick={()=>{setDraft(null);setError(false);}}>{savingsText(ctx.lang||'it','cancel')}</button></div>
        </form>}
    </>}
    {error&&<p role="alert">{T('error')}</p>}
  </section>;
}

export function SavingsDeficitsPanel(){
  const ctx:any=useApp(),[draft,setDraft]=useState<any>(null),[error,setError]=useState(false);
  if(!ctx.financeEvolution)return null;
  const savings=ctx.financeEvolution.savings, deficits=savings.deficits.filter(d=>d.kind==='period-v1');
  if(!deficits.length)return null;
  const T=(key:Parameters<typeof closureText>[1])=>closureText(ctx.lang||'it',key);
  const button={padding:'10px 12px',borderRadius:10,border:`1px solid ${ctx.borderC}`,background:ctx.cardBg,color:ctx.textC,cursor:'pointer'};
  function edit(d){
    const remaining=deficitRemaining(savings,d),buckets=savings.buckets.filter(b=>b.currency===d.currency&&b.balanceMinor>0);
    const limit=Math.min(remaining,buckets.reduce((n,b)=>n+Math.floor(b.balanceMinor/100)*100,0));
    const proposed=distributeSavings(limit,buckets.map(b=>({id:b.id,weight:Math.floor(b.balanceMinor/100)})));
    setDraft({id:crypto.randomUUID(),deficitId:d.id,expectedRemaining:remaining,buckets,values:Object.fromEntries(Object.entries(proposed).map(([id,n])=>[id,String(Number(n)/100)]))});setError(false);
  }
  return <section aria-label={T('deficits')} style={{padding:14,marginTop:12,border:`1px solid ${ctx.borderC}`,borderRadius:14,background:ctx.cardBg,color:ctx.textC}}>
    <h3 style={{fontSize:16,margin:'0 0 10px'}}>{T('deficits')}</h3>
    {deficits.map(d=>{const money=(n:number)=>new Intl.NumberFormat(ctx.lang||'it',{style:'currency',currency:d.currency}).format(n/100);return <article key={d.id} style={{padding:'10px 0',borderTop:`1px solid ${ctx.borderC}`}}>
      <strong>{periodLabel(d.periodKey,ctx.lang||'it')} · {money(-d.originalMinor)}</strong><div>{T(d.status)}</div>
      <div>{T('remaining')}: {money(deficitRemaining(savings,d))}</div>
      {d.status!=='covered'&&draft?.deficitId!==d.id&&<button type="button" style={{...button,marginTop:8}} onClick={()=>edit(d)}>{T('cover')}</button>}
      {draft?.deficitId===d.id&&<form onSubmit={e=>{e.preventDefault();try{const allocations=Object.fromEntries(Object.entries(draft.values).map(([id,value])=>{if(!/^\d+(?:[.,]\d{1,2})?$/.test(String(value)))throw new Error('AMOUNT');return [id,Math.round(Number(String(value).replace(',','.'))*100)];}));ctx.setFinanceEvolution(previous=>coverSavingsDeficit(previous,{...draft,allocations}));setDraft(null);setError(false);}catch{setError(true);}}}>
        <p style={{fontSize:12}}>{T('coverageHint')}</p>
        {draft.buckets.map(b=><label key={b.id} style={{display:'block',marginTop:8,overflowWrap:'anywhere'}}>{b.name} · {money(b.balanceMinor)}<input required type="text" inputMode="decimal" value={draft.values[b.id]} onChange={e=>setDraft({...draft,values:{...draft.values,[b.id]:e.target.value}})} style={{...ctx.inp,display:'block',width:'100%',minWidth:0,boxSizing:'border-box'}}/></label>)}
        <div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}><button type="submit" disabled={!draft.buckets.length} style={button}>{T('cover')}</button><button type="button" style={button} onClick={()=>{setDraft(null);setError(false);}}>{savingsText(ctx.lang||'it','cancel')}</button></div>
        {error&&<p role="alert">{T('error')}</p>}
      </form>}
    </article>;})}
  </section>;
}

export function SavingsHomeClosing(){
  const ctx:any=useApp();
  if(!ctx.financeEvolution||!ctx.accountingPeriod)return null;
  const key=shiftPeriodKey(ctx.accountingPeriod.forDate(todayStr()).key,-1);
  const active=ctx.financeEvolution.savings.buckets.some(b=>b.active!==false&&b.currency===ctx.currency);
  return <>{active&&<details><summary style={{cursor:'pointer',fontWeight:700}}>{closureText(ctx.lang||'it','title')} · {periodLabel(key,ctx.lang||'it')}</summary><SavingsClosurePanel periodKey={key}/></details>}<SavingsDeficitsPanel/></>;
}
