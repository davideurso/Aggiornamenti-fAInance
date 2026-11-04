import {FainanceIcon} from '../icons/customIconLibrary';
import {Btn, Toggle, FainanceInfoPopover, FainancePickerModal} from '../widget';
import {secondarySettingsStyle} from '../ui/SettingsControls';
import {patrimonyOptionsText} from '../i18n/catalogSettingsTranslations';
import { useState } from 'react';
import { useApp, parseMoney } from '../core';
import { civilToday, createBalanceCheckpoint, derivePatrimony, balanceMethodOwner, initialBalanceMethods } from '../finance/patrimonyAutoBalance.js';
import { patrimonyLinkText } from '../i18n/patrimonyLinkTranslations';

export function PatrimonyLinksSettings({ allowEditing = true, onLocked }: { allowEditing?: boolean; onLocked?: () => void }) {
  const c:any = useApp(), t=(key:string)=>patrimonyLinkText(c.lang,key);
  const [step,setStep]=useState(1);
  const [editing,setEditing]=useState(''), [chosen,setChosen]=useState<string[]>([]), [amount,setAmount]=useState(''), [date,setDate]=useState(civilToday()), [error,setError]=useState(''), [preview,setPreview]=useState<any>(null);
  const all=c.patrimonioEntries||[], entries=all.filter(e=>!e.deleted), methods=(c.methods||[]).filter(m=>!m.deleted);
  const ready=c.firestoreReady!==false&&c.shareCashMovements!==null;
  const enabled=c.patrimonioMode!=='manuale', auto=c.patrimonioAutomatic||{details:{},conflicts:[],unassigned:0};
  const input={width:'100%',minWidth:0,padding:'10px 12px',borderRadius:10,border:'1px solid '+c.borderC,background:c.cardBg,color:c.textC,fontSize:14,boxSizing:'border-box' as const};
  const button={...secondarySettingsStyle(c),minHeight:38,padding:'9px 12px',width:'auto',cursor:'pointer',fontSize:13};
  const primaryButton={minHeight:38,padding:'9px 12px',width:'auto',cursor:'pointer',fontSize:13};
  function writable(){if(!ready){setError(t('sync'));return false;}if(allowEditing)return true;if(onLocked)onLocked();return false;}
  function clear(){setEditing('');setError('');setPreview(null);}
  function begin(entry){
    if(!writable())return;
    setStep(1);setEditing(String(entry.id));setChosen(initialBalanceMethods(entry,all,methods));setAmount(String(c.patrimonioValues?.[entry.id]??0));setDate(civilToday());setError('');setPreview(null);
  }
  function freeze(){
    // Materialize the derived view only on an explicit user action, never on sync/hydration.
    c.setPatrimonioValues({...c.patrimonioValues});c.setPatrimonioHistory({...c.patrimonioHistory});
  }
  function toggle(){
    if(!writable())return;
    clear();
    if(enabled){freeze();c.setPatrimonioMode('manuale');return;}
    // Resume from frozen balances: movements entered while paused are already reconciled by the user.
    c.setPatrimonioEntries(all.map(e=>{
      const link=e.balanceLink, last=link?.checkpoints?.at(-1);
      if(!link?.enabled||!last)return e;
      const cp=createBalanceCheckpoint({date:civilToday(),amount:Number(c.patrimonioValues?.[e.id]??last.amount),methodIds:last.methodIds,expenses:c.expenses,incomes:c.incomes,shareCashMovements:c.shareCashMovements});
      return {...e,balanceLink:{...link,checkpoints:[...link.checkpoints,cp]},updatedAt:new Date().toISOString()};
    }));
    c.setPatrimonioMode('entrambe');
  }
  function buildPreview(){
    if(!writable())return;
    try{
      if(!amount.trim()||!/^[-+]?\s*\d[\d.,\s]*$/.test(amount.trim())){setError(L('Inserisci un saldo valido, anche zero.'));return;}
      if(!date||date>civilToday()){setError(L('Scegli una data valida, non futura.'));return;}
      if(!chosen.length){setError(L('Seleziona almeno un pagamento o una ricezione.'));return;}
      if(chosen.some(id=>!methods.some(m=>String(m.id)===id))){setError(L('Una voce selezionata non è più disponibile. Torna indietro e scegli di nuovo.'));return;}
      const owner=chosen.map(id=>balanceMethodOwner(all,editing,id)).find(Boolean);
      if(owner){setError(L('Una voce selezionata è già collegata a')+' '+owner.name+'. '+L('Torna indietro e scegli una voce libera.'));return;}
      const checkpoint=createBalanceCheckpoint({date,amount:parseMoney(amount),methodIds:chosen,expenses:c.expenses,incomes:c.incomes,shareCashMovements:c.shareCashMovements});
      const candidate=all.map(e=>String(e.id)===editing?{...e,balanceLink:{version:1,enabled:true,checkpoints:[...(e.balanceLink?.checkpoints||[]),checkpoint]},updatedAt:new Date().toISOString()}:e);
      const result=derivePatrimony({entries:candidate,values:c.patrimonioValues,history:c.patrimonioHistory,expenses:c.expenses,incomes:c.incomes,shareCashMovements:c.shareCashMovements,mode:'entrambe',periodSettings:c.accountingPeriod?.settings});
      const next={entries:candidate,amount:result.values[editing],checkpoint,signature:JSON.stringify({link:all.find(e=>String(e.id)===editing)?.balanceLink||null,expenses:c.expenses,incomes:c.incomes,shareCashMovements:c.shareCashMovements})};setPreview(next);setError('');return next;
    }catch{setPreview(null);setError(L('Impossibile preparare il collegamento. Nessun dato è stato modificato.'));}
  }
  function confirm(candidate=preview){
    const preview=candidate;
    if(!writable()||!preview)return;
    if(preview.signature!==JSON.stringify({link:all.find(e=>String(e.id)===editing)?.balanceLink||null,expenses:c.expenses,incomes:c.incomes,shareCashMovements:c.shareCashMovements})){setError(t('changed'));setPreview(null);return;}
    // Revalidate against the latest synchronized ownership before committing the preview.
    const owner=chosen.map(id=>balanceMethodOwner(all,editing,id)).find(Boolean);
    if(owner){setError(L('Una voce selezionata è già collegata a')+' '+owner.name+'. '+L('Torna indietro e scegli una voce libera.'));setPreview(null);return;}
    const entry=preview.entries.find(e=>String(e.id)===editing);
    if(!all.some(e=>String(e.id)===editing&&!e.deleted)){clear();return;}
    freeze();c.setPatrimonioEntries(all.map(e=>String(e.id)===editing?{...e,balanceLink:entry.balanceLink,updatedAt:new Date().toISOString()}:e));clear();
  }
  const L=(text:string)=>c.translateUiRuntimeText?c.translateUiRuntimeText(text):text;
  const row={display:'flex',alignItems:'center',justifyContent:'space-between',gap:16,padding:'14px 0',borderBottom:'1px solid '+c.borderC,textAlign:'left' as const};
  return <section data-patrimony-links style={{color:c.textC}}>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
      <h3 style={{fontSize:14,fontWeight:700,margin:0}}>{patrimonyOptionsText(c.lang,0)}</h3>
      <FainanceInfoPopover label={t('title')} title={t('title')} body={<div style={{whiteSpace:'pre-line'}}>{patrimonyOptionsText(c.lang,2)}{'\n'}{t('pause')}</div>}/>
    </div>
    <Toggle label={patrimonyOptionsText(c.lang,1)} labelFirst checked={enabled} onChange={toggle} color={c.secondaryButtonColor||'#5FAFE5'}/>
    {!ready&&<p role="status" style={{fontSize:12}}>{t('sync')}</p>}
    {enabled&&<>
      {!!auto.conflicts.length&&<p role="alert" style={{color:c.dark?'#FF9AA3':'#B63B45'}}>{t('conflict')}</p>}
      <div style={{display:'flex',flexDirection:'column',marginTop:12}}>{entries.map(entry=>{
        const id=String(entry.id), linked=!!entry.balanceLink?.enabled, cp=entry.balanceLink?.checkpoints?.at(-1);
        const linkedMethods=(cp?.methodIds||[]).map(mid=>methods.find(m=>String(m.id)===String(mid))||{id:mid,name:t('unavailable'),icon:'💳'});
        return <div key={id} data-patrimony-link-row style={row}>
          <span style={{flex:1,minWidth:0,fontSize:13,fontWeight:600,overflowWrap:'anywhere'}}>{entry.name}{entry.archived?' · '+L('Archiviata'):''}</span>
          <button type="button" aria-label={linked?t('reconcile')+': '+entry.name:t('link')} onClick={()=>begin(entry)} style={linked?{background:'#FFFFFF',border:'1px solid #D8E1EA',borderRadius:12,padding:8,color:'#000000',cursor:'pointer',textAlign:'left',fontSize:13,width:'55%',maxWidth:250,display:'flex',flexDirection:'column',gap:6,overflowWrap:'anywhere'}:{...button,padding:'9px 12px',fontSize:12,maxWidth:'55%'}}>{linked?linkedMethods.map(method=><span data-linked-method key={String(method.id)} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 3px',minWidth:0}}><FainanceIcon value={method.icon||'💳'} size={18}/><span style={{minWidth:0}}>{method.name}{method.archived?' [A]':''}</span></span>):t('link')}</button>
        </div>;
      })}</div>
    </>}
    <FainancePickerModal open={!!editing} title={entries.find(e=>String(e.id)===editing)?.name||t('methods')} onClose={clear} footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8,flexWrap:'wrap'}}>{error&&<p role="alert" style={{width:'100%',margin:0,fontSize:13,color:c.dark?'#FF9AA3':'#B63B45'}}>{error}</p>}
      <Btn style={button} onClick={clear}>{t('cancel')}</Btn>
      {all.find(e=>String(e.id)===editing)?.balanceLink?.enabled&&<Btn style={button} onClick={()=>{if(!writable())return;freeze();c.setPatrimonioEntries(all.map(e=>String(e.id)===editing?{...e,balanceLink:{...e.balanceLink,enabled:false},updatedAt:new Date().toISOString()}:e));clear();}}>{t('unlink')}</Btn>}
      {step===2&&<Btn style={button} onClick={()=>{setStep(1);setError('');}}>{L('Indietro')}</Btn>}
      {step===1?<Btn style={primaryButton} onClick={()=>{if(!writable())return;if(!chosen.length){setError(L('Seleziona almeno un pagamento o una ricezione.'));return;}setStep(2);setError('');}}>{L('Successivo')}</Btn>:<Btn style={primaryButton} onClick={()=>{const next=buildPreview();if(next)confirm(next);}}>{L('Salva')}</Btn>}
    </div>}>
      <div style={{display:'grid',gap:12}}>
        <div role="status" style={{fontSize:13,fontWeight:700}}>{step===1?'1 / 2 · '+t('methods'):'2 / 2 · '+t('confirmed')}</div>
        {step===1&&<fieldset style={{border:'none',padding:0,margin:0,minWidth:0}}><legend style={{fontSize:13,fontWeight:600,marginBottom:8}}>{t('methods')}</legend>
          {methods.map(m=>{
            const mid=String(m.id), selected=chosen.includes(mid), owner=balanceMethodOwner(all,editing,mid);
            return <label key={mid} style={{...row,opacity:owner?0.45:1,background:selected?'#F3F4F6':'#FFFFFF',color:'#000000',padding:'10px 8px',borderRadius:8,cursor:owner?'not-allowed':'pointer',fontSize:13}}>
              <span style={{display:'flex',gap:8,alignItems:'center'}}><FainanceIcon value={m.icon||'💳'} size={18}/>{m.name}{m.archived?' · '+L('Archiviato'):''}{owner?' → '+owner.name:''}</span>
              <input type="checkbox" checked={selected} disabled={!!owner&&!selected} onChange={()=>{setChosen(selected?chosen.filter(x=>x!==mid):[...chosen,mid]);setPreview(null);}}/>
            </label>;
          })}
        </fieldset>}
        {step===2&&<><div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12}}><strong style={{fontSize:13}}>{t('confirmed')}</strong><FainanceInfoPopover label={t('baseline')} title={t('confirmed')} body={<>{t('baseline')}<br/>{t('limits')}</>}/></div>
        <label style={row}><span style={{flex:1,fontSize:13}}>{t('date')}</span><input aria-label={t('date')} type="date" max={civilToday()} value={date} onChange={e=>{setDate(e.target.value);setPreview(null);}} style={{...input,width:'52%',colorScheme:c.dark?'dark':'light'}}/></label>
        <label style={row}><span style={{flex:1,fontSize:13}}>{t('confirmed')}</span><input aria-label={t('confirmed')} inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setPreview(null);}} style={{...input,width:'52%',textAlign:'right'}}/></label>
        </>}
        
        {preview&&<div role="status" style={{fontSize:13}}>{t('preview')}: <strong>{c.fmt(preview.amount)}</strong><br/>{t('preserve')}</div>}
      </div>
    </FainancePickerModal>
  </section>;
}
