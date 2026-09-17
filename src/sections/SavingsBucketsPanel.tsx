import { createPortal } from 'react-dom';
import { SavingsGoalPanel } from './SavingsGoalPanel';
import { goalSavedAmount } from '../finance/savingsGoals';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '../core';
import { createSavingsBucket, updateSavingsBucket } from '../finance/savingsBuckets';
import { savingsText } from '../i18n/savingsTranslations';
import { savingsPlanSummary, setSavingsPlanAmount } from '../finance/savingsPlan';
import { periodLabel } from '../finance/periodEngine';
import { budgetText } from '../i18n/budgetTranslations';
import { SavingsLedgerPanel } from './SavingsLedgerPanel';

function SavingsInfoPopover({ children, dark }: {children:any;dark:boolean}) {
  const [open,setOpen]=useState(false);
  const [position,setPosition]=useState<{left:number;top:number;width:number}|null>(null);
  const anchorRef=useRef<HTMLDivElement|null>(null);
  const popupRef=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{
    if(!open || typeof window==='undefined') { setPosition(null); return; }
    const place=()=>{
      if(!anchorRef.current) return;
      const rect=anchorRef.current.getBoundingClientRect();
      const width=Math.min(320,Math.max(220,window.innerWidth-20));
      let left=Math.max(10,Math.min(rect.right-width,window.innerWidth-width-10));
      let top=rect.bottom+8;
      const popupHeight=popupRef.current?.getBoundingClientRect().height || 120;
      if(top+popupHeight>window.innerHeight-10) top=Math.max(10,rect.top-popupHeight-8);
      setPosition({left,top,width});
    };
    place();
    const raf=window.requestAnimationFrame(place);
    window.addEventListener('resize',place);
    window.addEventListener('orientationchange',place);
    window.addEventListener('scroll',place,true);
    const outside=(event:PointerEvent)=>{
      const target=event.target as Node;
      if(anchorRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown',outside,true);
    return ()=>{
      window.cancelAnimationFrame(raf);
      window.removeEventListener('resize',place);
      window.removeEventListener('orientationchange',place);
      window.removeEventListener('scroll',place,true);
      document.removeEventListener('pointerdown',outside,true);
    };
  },[open]);
  const theme={
    buttonBg:dark?'#5B4918':'#FFF3BF',
    buttonBorder:dark?'#D0AF48':'#E8CC72',
    buttonText:dark?'#FFE08B':'#8A6500',
    popupBg:dark?'#3B3014':'#FFF8D8',
    popupBorder:dark?'#C8A53A':'#E7CA6A',
    popupText:dark?'#F2DF9C':'#6B5900',
  };
  const popup=open && typeof document!=='undefined' ? createPortal(
    <div ref={popupRef} role="dialog" aria-label="Informazioni" style={{position:'fixed',left:position?.left??10,top:position?.top??10,width:position?.width??280,maxWidth:'calc(100vw - 20px)',boxSizing:'border-box',padding:'11px 13px',fontSize:12,lineHeight:1.45,color:theme.popupText,zIndex:2147483000,visibility:position?'visible':'hidden',background:theme.popupBg,border:`1px solid ${theme.popupBorder}`,borderRadius:14,boxShadow:dark?'0 12px 28px rgba(0,0,0,.28)':'0 12px 30px rgba(206,171,56,.18)'}}>{children}</div>,
    document.body
  ) : null;
  return <>
    <div ref={anchorRef} style={{position:'relative',display:'inline-flex',alignItems:'center'}}>
      <button type="button" aria-label="Informazioni" title="Informazioni" aria-expanded={open} onClick={()=>setOpen(value=>!value)} style={{width:24,height:24,borderRadius:'50%',border:`1px solid ${theme.buttonBorder}`,background:theme.buttonBg,color:theme.buttonText,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:900,cursor:'pointer',boxShadow:dark?'none':'0 3px 10px rgba(194,157,31,0.16)',padding:0,userSelect:'none'}}>i</button>
    </div>
    {popup}
  </>;
}

export function SavingsBucketsPanel({periodKey, scope, plan}: {periodKey:string;scope:'month'|'future';plan:any}) {
  const ctx: any = useApp();
  const [expanded,setExpanded] = useState(false);
  const [editing, setEditing] = useState<string|null>(null);
  const [name, setName] = useState('');
  const [error, setError] = useState<Parameters<typeof savingsText>[1]|null>(null);
  const [saved, setSaved] = useState(false);
  const [amountId, setAmountId] = useState<string|null>(null);
  const [amount, setAmount] = useState('');
  useEffect(()=>{setAmountId(null);setError(null);setSaved(false);},[periodKey,scope]);
  if (!ctx.financeEvolution || !ctx.setFinanceEvolution) return null;
  const T = (key: Parameters<typeof savingsText>[1]) => savingsText(ctx.lang || 'it', key);
  const buckets = ctx.financeEvolution.savings.buckets;
  const completionBucket = buckets.find(bucket=>{const goal=(ctx.goals || []).find(item=>String(item.id)===bucket.goalId);return goal && Number(goal.target)>0 && goalSavedAmount(ctx.financeEvolution,goal,ctx.currency)>=Number(goal.target);});
  const close = () => { setEditing(null); setName(''); setAmountId(null); setError(null); };
  const summary = savingsPlanSummary(plan);
  const money = (value:number) => new Intl.NumberFormat(ctx.lang || 'it',{style:'currency',currency:plan?.savingsPlanCurrency || ctx.currency || 'EUR',maximumFractionDigits:2}).format(value);
  function apply(operation: (previous: any) => any) {
    try {
      ctx.setFinanceEvolution(operation);
      close(); setSaved(true);
    } catch (failure) {
      const code = failure instanceof Error ? failure.message : '';
      setError(code === 'INVALID_SAVINGS_PLAN_AMOUNT' ? 'invalidAmount' : code === 'SAVINGS_PLAN_EXCEEDED' ? 'exceeded' : code === 'SAVINGS_PLAN_CURRENCY' ? 'currencyMismatch' : code === 'INVALID_BUCKET_NAME' ? 'invalidName' : code === 'DUPLICATE_BUCKET_NAME' ? 'duplicate' : ['BUCKET_NOT_FOUND','INACTIVE_SAVINGS_BUCKET'].includes(code) ? 'unavailable' : 'failed');
      setSaved(false);
    }
  }
  const softBg=ctx.dark?'#202030':'#F7F8FC';
  const accent=ctx.confirmButtonColor || '#6555BA';
  const actionButton = { border:`1px solid ${ctx.borderC}`, background:ctx.cardBg, color:ctx.textC, borderRadius:10, padding:'9px 11px', cursor:'pointer', fontWeight:700, overflowWrap:'anywhere' as const };
  const primaryButton = {...actionButton,background:accent,color:'#fff',border:`1px solid ${accent}`};

  return <section style={{borderRadius:16,border:`1px solid ${ctx.borderC}`,background:ctx.cardBg,color:ctx.textC,overflow:'hidden',boxShadow:ctx.dark?'none':'0 6px 20px rgba(0,0,0,.04)'}}>
    <div style={{display:'flex',alignItems:'center',gap:10,padding:ctx.isMobile?'14px 15px':'16px 18px'}}>
      <button type="button" onClick={()=>setExpanded(value=>!value)} aria-expanded={expanded} style={{appearance:'none',flex:1,minWidth:0,border:'none',background:'transparent',color:ctx.textC,padding:0,cursor:'pointer',display:'flex',alignItems:'center',gap:14,textAlign:'left'}}>
        <div style={{width:46,height:46,borderRadius:14,background:ctx.dark?'#24332D':'#EAF8F1',display:'flex',alignItems:'center',justifyContent:'center',fontSize:23,flexShrink:0}}>💰</div>
        <div style={{minWidth:0,flex:1}}>
          <div style={{display:'flex',alignItems:'center',gap:7,minWidth:0,marginBottom:4}}>
            <span style={{fontSize:15,fontWeight:850,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{T('title')}</span>
            <span aria-label={`${buckets.length}`} style={{minWidth:22,height:22,padding:'0 7px',borderRadius:999,background:ctx.dark?'#34344A':'#F0EEFF',color:accent,fontWeight:850,fontSize:11,display:'inline-flex',alignItems:'center',justifyContent:'center',boxSizing:'border-box',flexShrink:0}}>{buckets.length}</span>
          </div>
          <div style={{fontSize:12,color:ctx.subC,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{periodLabel(periodKey,ctx.lang || 'it')} · {budgetText(ctx.lang || 'it',scope)}</div>
        </div>
      </button>
      <SavingsInfoPopover dark={!!ctx.dark}>
        <div>{T('intro')}</div>
        <div style={{marginTop:6}}>{T('planningHint')}</div>
      </SavingsInfoPopover>
      <button type="button" onClick={()=>setExpanded(value=>!value)} aria-label={T('title')} aria-expanded={expanded} style={{width:28,height:36,border:'none',background:'transparent',padding:0,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:ctx.subC}}>
        <span aria-hidden="true" style={{fontSize:20,transform:expanded?'rotate(90deg)':'rotate(0deg)',transition:'transform .15s ease'}}>›</span>
      </button>
    </div>

    {expanded && <div style={{borderTop:`1px solid ${ctx.borderC}`,padding:14}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(105px,1fr))',gap:8,marginBottom:12}}>
        {[{label:T('planned'),value:summary.available},{label:T('allocated'),value:summary.allocated},{label:T('remaining'),value:summary.remaining}].map((item,index)=><div key={item.label} style={{background:softBg,border:`1px solid ${ctx.borderC}`,borderRadius:12,padding:'10px 11px',minWidth:0}}>
          <div style={{fontSize:11,color:ctx.subC,lineHeight:1.25,minHeight:28}}>{item.label}</div>
          <strong style={{display:'block',fontSize:16,marginTop:4,color:index===2 && item.value<0?(ctx.expColor || '#B42318'):ctx.textC,fontVariantNumeric:'tabular-nums',overflowWrap:'anywhere'}}>{money(item.value)}</strong>
        </div>)}
      </div>

      {summary.remaining < -0.000001 && <div role="alert" style={{color:ctx.expColor || '#B42318',background:ctx.dark?'#351F25':'#FFF4F2',border:`1px solid ${ctx.dark?'#65323D':'#FFD5CF'}`,borderRadius:11,padding:'9px 10px',fontSize:12,lineHeight:1.4,marginBottom:12}}>{T('overallocated')}</div>}
      {!buckets.length && <div style={{background:softBg,border:`1px dashed ${ctx.borderC}`,borderRadius:12,padding:14,textAlign:'center',fontSize:13,color:ctx.subC,marginBottom:10}}>{T('empty')}</div>}

      <div style={{display:'grid',gap:12}}>
        {buckets.map(bucket=><article key={bucket.id} aria-label={bucket.name} style={{border:`1px solid ${ctx.borderC}`,borderRadius:15,padding:13,minWidth:0,background:softBg}}>
          <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10}}>
            <div style={{minWidth:0,flex:1}}>
              <strong style={{display:'block',fontSize:15,overflowWrap:'anywhere',lineHeight:1.25}}>{bucket.name}</strong>
              <span style={{display:'inline-flex',alignItems:'center',marginTop:6,padding:'3px 8px',borderRadius:999,fontSize:11,fontWeight:800,background:bucket.active===false?(ctx.dark?'#34343C':'#ECEDEF'):(ctx.dark?'#15372C':'#E9F8F1'),color:bucket.active===false?ctx.subC:'#1D9E75'}}>{T(bucket.active === false ? 'inactive' : 'active')}</span>
            </div>
            <div style={{textAlign:'right',flexShrink:0}}>
              <div style={{fontSize:10,color:ctx.subC}}>{T('amount')}</div>
              <strong style={{fontSize:17,fontVariantNumeric:'tabular-nums'}}>{money(plan?.savingsPlannedAmounts?.[bucket.id] || 0)}</strong>
            </div>
          </div>

          <div style={{display:'flex',flexWrap:'wrap',gap:7,marginTop:12}}>
            {bucket.active !== false && <button type="button" style={primaryButton} disabled={editing !== null || amountId !== null} onClick={()=>{setAmountId(bucket.id);setAmount(String(plan?.savingsPlannedAmounts?.[bucket.id] || 0));setError(null);setSaved(false);}}>{T('editAmount')}</button>}
            <button type="button" style={actionButton} disabled={amountId !== null} onClick={()=>{setEditing(bucket.id);setName(bucket.name || '');setError(null);setSaved(false);}}>{T('edit')}</button>
            <button type="button" style={actionButton} disabled={editing !== null || amountId !== null} onClick={()=>apply(previous=>updateSavingsBucket(previous,bucket.id,{active:bucket.active === false}))}>{T(bucket.active === false ? 'enable' : 'disable')}</button>
          </div>

          <SavingsGoalPanel bucketId={bucket.id} completion={expanded && completionBucket?.id===bucket.id}/>
          <SavingsLedgerPanel bucketId={bucket.id}/>
        </article>)}
      </div>

      {amountId !== null && <form style={{marginTop:12,padding:12,borderRadius:13,background:softBg,border:`1px solid ${ctx.borderC}`}} onSubmit={event=>{event.preventDefault();if(!amount.trim()){setError('invalidAmount');return;}apply(previous=>setSavingsPlanAmount(previous,ctx.legacyBudgetPlan,periodKey,amountId,Number(amount),ctx.currency || 'EUR',scope));}}>
        <label style={{fontSize:12,fontWeight:800}}>{T('amount')} — {buckets.find(bucket=>bucket.id===amountId)?.name}<input autoFocus type="number" min="0" step="1" value={amount} onChange={event=>{setAmount(event.target.value);setError(null);}} style={{...ctx.inp,display:'block',boxSizing:'border-box',width:'100%',marginTop:7}}/></label>
        <div style={{display:'flex',gap:8,marginTop:10}}><button type="submit" style={primaryButton}>{T('save')}</button><button type="button" style={actionButton} onClick={close}>{T('cancel')}</button></div>
      </form>}

      {editing === null ? <button type="button" disabled={amountId !== null} style={{...primaryButton,marginTop:12,width:'100%',padding:'11px 13px'}} onClick={()=>{setEditing('');setName('');setError(null);setSaved(false);}}>{T('add')}</button> :
        <form style={{marginTop:12,padding:12,borderRadius:13,background:softBg,border:`1px solid ${ctx.borderC}`}} onSubmit={event=>{event.preventDefault();const id=editing || crypto.randomUUID();apply(previous=>editing ? updateSavingsBucket(previous,id,{name}) : createSavingsBucket(previous,{id,name,currency:ctx.currency || 'EUR'}));}}>
          <label style={{display:'block',fontSize:12,fontWeight:800}}>{T('name')}<input autoFocus value={name} maxLength={120} onChange={event=>{setName(event.target.value);setError(null);}} style={{...ctx.inp,display:'block',boxSizing:'border-box',width:'100%',minWidth:0,marginTop:7}}/></label>
          <div style={{display:'flex',flexWrap:'wrap',gap:8,marginTop:10}}>
            <button type="submit" style={primaryButton}>{T('save')}</button>
            <button type="button" style={actionButton} onClick={close}>{T('cancel')}</button>
          </div>
        </form>}
      {error && <div role="alert" style={{color:ctx.expColor || '#B42318',fontSize:12,marginTop:10}}>{T(error)}</div>}
      {saved && <div role="status" style={{color:'#1D9E75',fontSize:12,marginTop:10,fontWeight:700}}>{T('saved')}</div>}
    </div>}
  </section>;
}
