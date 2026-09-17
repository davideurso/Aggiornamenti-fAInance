import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../core';
import { goalSavedAmount, linkSavingsGoal } from '../finance/savingsGoals';
import { savingsGoalText } from '../i18n/savingsGoalsTranslations';
import { savingsText } from '../i18n/savingsTranslations';

export function SavingsGoalPanel({bucketId, completion}:{bucketId:string;completion:boolean}) {
  const ctx:any=useApp();
  const [draft,setDraft]=useState<{goalId:string;expectedGoalId:string|null}|null>(null);
  const [error,setError]=useState(false);
  const bucket=ctx.financeEvolution.savings.buckets.find(item=>item.id===bucketId);
  if (!bucket) return null;
  const T=(key:Parameters<typeof savingsGoalText>[1])=>savingsGoalText(ctx.lang || 'it',key);
  const S=(key:Parameters<typeof savingsText>[1])=>savingsText(ctx.lang || 'it',key);
  const goals=ctx.goals || [];
  const goal=goals.find(item=>String(item.id)===bucket.goalId && (item.currency || ctx.currency)===bucket.currency);
  const eligible=goals.filter(item=>(item.currency || ctx.currency)===bucket.currency && Number(item.target)>goalSavedAmount(ctx.financeEvolution,item,ctx.currency));
  const money=(value:number)=>new Intl.NumberFormat(ctx.lang || 'it',{style:'currency',currency:bucket.currency}).format(value);
  const button={border:`1px solid ${ctx.borderC}`,borderRadius:10,padding:'9px 11px',background:ctx.cardBg,color:ctx.textC,cursor:'pointer',fontWeight:700,overflowWrap:'anywhere' as const};
  const accent=ctx.confirmButtonColor || '#6555BA';
  const softBg=ctx.dark?'#191A28':'#FFFFFF';
  function edit(){setDraft({goalId:eligible.some(item=>String(item.id)===bucket.goalId)?bucket.goalId:'',expectedGoalId:bucket.goalId || null});setError(false);}
  function save(id:string|null,expected:string|null){
    try {ctx.setFinanceEvolution(previous=>linkSavingsGoal(previous,bucketId,id,ctx.goals || [],ctx.currency,expected));setDraft(null);setError(false);}
    catch {setError(true);}
  }
  const complete=completion && goal && Number(goal.target)>0 && !draft;
  const saved=goal ? goalSavedAmount(ctx.financeEvolution,goal,ctx.currency) : 0;
  const target=goal ? Number(goal.target)||0 : 0;
  const pct=target>0?Math.min(100,Math.max(0,(saved/target)*100)):0;

  return <section aria-label={`${T('title')} — ${bucket.name}`} style={{marginTop:12,padding:12,border:`1px solid ${ctx.borderC}`,borderRadius:13,background:softBg}}>
    <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
      <div style={{minWidth:0,flex:1}}>
        <div style={{fontSize:11,color:ctx.subC,fontWeight:800,textTransform:'uppercase',letterSpacing:.35}}>{T('title')}</div>
        <div style={{display:'flex',alignItems:'center',gap:7,marginTop:4,minWidth:0}}>
          <span aria-hidden="true">🎯</span>
          <strong style={{fontSize:14,overflowWrap:'anywhere'}}>{goal?.name || (bucket.goalId?T('unavailable'):T('none'))}</strong>
        </div>
      </div>
      {!draft && <button type="button" style={{...button,color:accent,border:`1px solid ${ctx.dark?'#4B4A70':'#D9D3FF'}`,background:ctx.dark?'#26253B':'#F3F0FF',flexShrink:0}} onClick={edit}>{T('change')}</button>}
    </div>

    {goal && <div style={{marginTop:10}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:10,fontSize:12,color:ctx.subC,marginBottom:5}}><span>{money(saved)}</span><span>{money(target)}</span></div>
      <div style={{height:7,borderRadius:999,overflow:'hidden',background:ctx.dark?'#333342':'#E9EAF0'}}><div style={{height:'100%',width:`${pct}%`,background:pct>=100?'#1D9E75':accent,borderRadius:999}}/></div>
    </div>}

    <p style={{fontSize:11,color:ctx.subC,lineHeight:1.45,margin:'9px 0 0'}}>{T('hint')}</p>

    {draft && <form onSubmit={event=>{event.preventDefault();save(draft.goalId,draft.expectedGoalId);}} style={{display:'grid',gap:9,marginTop:10,paddingTop:10,borderTop:`1px solid ${ctx.borderC}`}}>
      <label style={{fontSize:12,fontWeight:800}}>{T('title')}<select autoFocus value={draft.goalId} onChange={event=>setDraft({...draft,goalId:event.target.value})} style={{...ctx.inp,display:'block',width:'100%',minWidth:0,boxSizing:'border-box',marginTop:6}}><option value="">{T('none')}</option>{eligible.map(item=><option key={item.id} value={String(item.id)}>{item.name}</option>)}</select></label>
      {!eligible.length && <p style={{fontSize:11,color:ctx.subC,margin:0}}>{T('empty')}</p>}
      <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><button type="submit" style={{...button,background:accent,color:'#fff',border:`1px solid ${accent}`}}>{S('save')}</button><button type="button" style={button} onClick={()=>{setDraft(null);setError(false);}}>{S('cancel')}</button></div>
    </form>}
    {error && <p role="alert" style={{fontSize:11,color:ctx.expColor || '#B42318',margin:'8px 0 0'}}>{T('error')}</p>}
    {complete && createPortal(<div style={{position:'fixed',inset:0,zIndex:11000,background:'rgba(0,0,0,.45)',display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div role="dialog" aria-modal="true" aria-label={T('completed')} style={{background:ctx.cardBg,color:ctx.textC,borderRadius:16,padding:20,width:'100%',maxWidth:420,maxHeight:'85dvh',overflowY:'auto',boxSizing:'border-box'}}>
        <h3 style={{margin:'0 0 12px'}}>{T('completed')}</h3><p style={{overflowWrap:'anywhere'}}>{goal.name}</p>
        <p>{money(saved)} / {money(target)}</p>
        <div style={{display:'grid',gap:10,marginTop:16}}><button type="button" autoFocus style={{...button,background:accent,color:'#fff'}} onClick={edit}>{T('newGoal')}</button><button type="button" style={button} onClick={()=>save(null,bucket.goalId)}>{T('unlink')}</button></div>
        {error && <p role="alert">{T('error')}</p>}
      </div>
    </div>,document.body)}
  </section>;
}
