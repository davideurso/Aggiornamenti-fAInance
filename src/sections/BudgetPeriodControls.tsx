import { useState } from 'react';
import { useApp, fmtDate } from '../core';
import { budgetText } from '../i18n/budgetTranslations';
import { budgetPeriodSummary, budgetSourceForPeriod, type BudgetScope } from '../finance/budgetEngine';
import { periodLabel, type PeriodComparison } from '../finance/periodEngine';

export function BudgetPeriodControls({ periodKey, onPeriodChange, scope, onScopeChange, plan }: {
  periodKey: string; onPeriodChange: (value: string) => void; scope: BudgetScope; onScopeChange: (value: BudgetScope) => void; plan: any;
}) {
  const ctx: any=useApp();
  const [expanded,setExpanded]=useState(false);
  const T=(key: Parameters<typeof budgetText>[1])=>budgetText(ctx.lang||'it',key);
  const comparison=ctx.financeEvolution.budget.comparison as PeriodComparison;
  const summary=budgetPeriodSummary(ctx.expensesForAnalysis||ctx.expenses,ctx.incomes,plan,periodKey,ctx.accountingPeriod.settings,comparison);
  const pct=(value: number|null)=>value===null?'—':new Intl.NumberFormat(ctx.lang||'it',{style:'percent',maximumFractionDigits:1}).format(value);
  const bounds=ctx.accountingPeriod.forKey(periodKey);
  const source=budgetSourceForPeriod(ctx.financeEvolution,periodKey);
  const isMobile=!!ctx.isMobile;
  const softBg=ctx.dark?'#202030':'#F7F8FC';
  const field={...ctx.inp,width:'100%',marginTop:6,minWidth:0,boxSizing:'border-box' as const};
  const controlCard={background:softBg,border:`1px solid ${ctx.borderC}`,borderRadius:12,padding:'10px 11px',minWidth:0};
  const metricCard={background:softBg,border:`1px solid ${ctx.borderC}`,borderRadius:13,padding:'12px 13px',minWidth:0};
  const sourceAccent=source.kind==='month'?(ctx.confirmButtonColor || '#6555BA'):'#1D9E75';
  const differenceColor=summary.difference>=0?'#1D9E75':(ctx.expColor || '#B42318');
  const sourceLabel=T(source.kind==='month'?'monthlyOverride':'standard');

  return <section aria-label="Budget" style={{background:ctx.cardBg,color:ctx.textC,border:`1px solid ${ctx.borderC}`,borderRadius:16,overflow:'hidden',boxShadow:ctx.dark?'none':'0 6px 20px rgba(0,0,0,.04)'}}>
    <button type="button" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} style={{appearance:'none',width:'100%',border:'none',background:'transparent',padding:isMobile?'14px 15px':'16px 18px',cursor:'pointer',display:'flex',alignItems:'center',gap:14,textAlign:'left',color:ctx.textC}}>
      <div style={{width:46,height:46,borderRadius:14,background:ctx.dark?'#252B3C':'#F1F4FA',display:'flex',alignItems:'center',justifyContent:'center',fontSize:23,flexShrink:0}}>📅</div>
      <div style={{minWidth:0,flex:1}}>
        <div style={{fontSize:15,fontWeight:850,color:ctx.textC,marginBottom:4}}>{T('period')}</div>
        <div style={{fontSize:12,color:ctx.subC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{periodLabel(periodKey,ctx.lang||'it')} · <strong style={{color:sourceAccent}}>{sourceLabel}</strong></div>
      </div>
      <span aria-hidden="true" style={{fontSize:20,color:ctx.subC,flexShrink:0,transform:expanded?'rotate(90deg)':'rotate(0deg)',transition:'transform .15s ease'}}>›</span>
    </button>

    {expanded && <div style={{borderTop:`1px solid ${ctx.borderC}`,padding:isMobile?14:16}}>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'repeat(3,minmax(0,1fr))',gap:10}}>
        <label style={controlCard}>{T('period')}<input type="month" aria-label={T('period')} value={periodKey} onChange={e=>{if(/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))onPeriodChange(e.target.value);}} style={field}/></label>
        <label style={controlCard}>{T('scope')}<select value={scope} onChange={e=>onScopeChange(e.target.value as BudgetScope)} style={field}><option value="month">{T('month')}</option><option value="future">{T('future')}</option></select></label>
        <label style={controlCard}>{T('compare')}<select value={comparison} onChange={e=>ctx.setFinanceEvolution(previous=>({...previous,budget:{...previous.budget,comparison:e.target.value}}))} style={field}>
          {(['previous','previousYear','average6','average12'] as const).map(value=><option key={value} value={value}>{T(value)}</option>)}
        </select></label>
      </div>

      <div style={{display:'flex',alignItems:'center',gap:8,marginTop:10,fontSize:12,color:ctx.subC,lineHeight:1.4,flexWrap:'wrap'}}>
        <span aria-hidden="true">📅</span>
        <span>{periodLabel(periodKey,ctx.lang||'it')}</span>
        <span aria-hidden="true">·</span>
        <span>{fmtDate(bounds.start,ctx.dateFmt)} → {fmtDate(bounds.end,ctx.dateFmt)}</span>
      </div>

      <div style={{marginTop:12,border:`1px solid ${ctx.borderC}`,borderLeft:`4px solid ${sourceAccent}`,borderRadius:13,padding:'11px 12px',background:softBg}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,flexWrap:'wrap'}}>
          <div style={{minWidth:0}}>
            <strong role="status" style={{fontSize:14,color:ctx.textC}}>{sourceLabel}</strong>
            {source.kind==='standard' && source.from && <div style={{fontSize:12,color:ctx.subC,marginTop:3}}>{T('standardFrom')} {periodLabel(source.from,ctx.lang)}</div>}
            {scope==='future' && <div style={{fontSize:12,color:ctx.subC,marginTop:4,lineHeight:1.4}}>{T('futureHint')}</div>}
          </div>
          {source.kind==='month' && <button type="button" onClick={()=>ctx.resetPeriodBudget(periodKey)} style={{border:`1px solid ${ctx.borderC}`,background:ctx.cardBg,color:ctx.textC,borderRadius:10,padding:'8px 11px',cursor:'pointer',fontWeight:750,whiteSpace:'nowrap'}}>{T('useStandard')}</button>}
        </div>
      </div>

      <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,minmax(0,1fr))':'repeat(3,minmax(0,1fr))',gap:10,marginTop:12}}>
        <div style={{...metricCard,gridColumn:isMobile?'1 / -1':'auto'}}>
          <div style={{fontSize:12,color:ctx.subC,marginBottom:4}}>{T('achievement')}</div>
          <strong style={{display:'block',fontSize:isMobile?28:26,lineHeight:1.05,fontVariantNumeric:'tabular-nums'}}>{pct(summary.planAchievement)}</strong>
        </div>
        <div style={metricCard}>
          <div style={{fontSize:12,color:ctx.subC,marginBottom:4}}>{T('rate')}</div>
          <strong style={{display:'block',fontSize:20,lineHeight:1.1,fontVariantNumeric:'tabular-nums'}}>{pct(summary.actualSavingsRate)}</strong>
        </div>
        <div style={metricCard}>
          <div style={{fontSize:12,color:ctx.subC,marginBottom:4}}>{T('difference')}</div>
          <strong style={{display:'block',fontSize:20,lineHeight:1.1,color:differenceColor,fontVariantNumeric:'tabular-nums'}}>{summary.difference>0?'+':''}{ctx.fmt(summary.difference)}</strong>
          <div style={{fontSize:11,color:ctx.subC,marginTop:4}}>{T(comparison)}</div>
        </div>
      </div>

      <details style={{marginTop:12,fontSize:12,color:ctx.subC,borderTop:`1px solid ${ctx.borderC}`,paddingTop:10}}><summary style={{cursor:'pointer',fontWeight:700}}>{T('details')}</summary><div style={{lineHeight:1.5}}><p style={{margin:'8px 0 4px'}}>{T('achievementHelp')}</p><p style={{margin:'4px 0 0'}}>{T('rateHelp')}</p></div></details>
    </div>}
  </section>;
}
