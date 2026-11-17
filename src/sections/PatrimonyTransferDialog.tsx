import {useRef,useState} from 'react';
import {useApp,fmtDate,parseMoney} from '../core';
import {TRANSLATIONS} from '../traduzioni';
import {Btn,DatePickerField,FainancePickerModal} from '../widget';
import {secondarySettingsStyle} from '../ui/SettingsControls';
import {cashFlowText,transferText} from '../i18n/cashFlowTranslations';
import {civilToday} from '../finance/patrimonyAutoBalance.js';
import {patrimonyTransferAvailability,patrimonyTransferHistory,revisePatrimonyTransfer,transferPatrimonyFunds,validPatrimonyTransferDate} from '../finance/patrimonyTransfers.js';

const newDraft=()=>({fromId:'',toId:'',amount:'',date:civilToday()});
type Draft=ReturnType<typeof newDraft>;

function TransferFields({draft,change,compact=false,workletSize='0.5x'}:{draft:Draft;change:(draft:Draft)=>void;compact?:boolean;workletSize?:string}){
 const c:any=useApp(),L=(x:string)=>c.translateUiRuntimeText(x);
 const movementLabels=TRANSLATIONS[c.lang]||TRANSLATIONS.it;
 const entries=(c.patrimonioEntries||[]).filter(e=>!e.deleted&&!e.deletedAt);
 const small=compact&&workletSize==='0.5x', expanded=compact&&workletSize==='2x';
 const field={boxSizing:'border-box' as const,minWidth:0,width:'100%',minHeight:small?32:44,paddingTop:small?5:11,paddingBottom:small?5:11,paddingLeft:small?6:12,paddingRight:small?6:12,fontSize:small?12:15,borderRadius:10,border:'1px solid #D8E1EA',background:'#fff',color:'#000',colorScheme:'light' as const};
 const account=(label:string,key:'fromId'|'toId',other:string)=><select aria-label={label} value={draft[key]} onChange={e=>change({...draft,[key]:e.target.value})} style={field}>
  <option value="">{label}</option>{entries.map(e=><option key={e.id} value={String(e.id)} disabled={String(e.id)===other} data-fainance-icon-ref={e.icon||'🏦'}>{e.name}</option>)}
 </select>;
 return <div style={{display:'grid',gap:expanded?8:compact?6:12,minWidth:0}}>
  <div style={{display:'grid',gridTemplateColumns:compact&&!expanded?'minmax(0,1fr)':'minmax(0,1fr) auto',gap:8,alignItems:'center'}}>
   <div style={{display:'grid',gridTemplateColumns:compact&&!small?'repeat(2,minmax(0,1fr))':'minmax(0,1fr)',gap:small?6:8,minWidth:0}}>{account(movementLabels.from,'fromId',draft.toId)}{account(movementLabels.to,'toId',draft.fromId)}</div>
   {(!compact||expanded)&&<button type="button" aria-label={transferText(c.lang,'swap')} title={transferText(c.lang,'swap')} onClick={()=>change({...draft,fromId:draft.toId,toId:draft.fromId})} style={{...secondarySettingsStyle(c),width:expanded?32:44,minHeight:expanded?32:44,padding:expanded?0:undefined,fontSize:expanded?16:20}}>⇄</button>}
  </div>
  <label style={{position:'relative',display:'block'}}>
   <span aria-hidden="true" style={{position:'absolute',top:'50%',left:compact?7:12,transform:'translateY(-50%)',color:'#333',fontSize:compact?12:14}}>{c.sym||c.currency}</span>
   <input aria-label={L('Importo')} placeholder={L('Importo')} inputMode="decimal" value={draft.amount} onChange={e=>change({...draft,amount:e.target.value})} style={{...field,paddingLeft:compact?29:42}}/>
  </label>
  {(!compact||expanded)&&<DatePickerField label={cashFlowText(c.lang,"chooseDate")} value={draft.date} onChange={date=>change({...draft,date})} showShortcuts={!compact}/>}
 </div>;
}

function persist(c,next){
 if(!next)return;
 if(c.persistPatrimonyTransfer) {
  if(!c.persistPatrimonyTransfer(next))throw Error('TRANSFER_NOT_SAVED');
 }else{
  c.setPatrimonioValues(next.patrimonioValues);
  c.setPatrimonioHistory(next.patrimonioHistory);
  c.setPatrimonioEntries(next.patrimonioEntries);
 }
}
function transferAvailability(c, draft: Draft, editId?: string) {
 if (!draft.fromId || !validPatrimonyTransferDate(draft.date) || c.firestoreReady === false || c.shareCashMovements === null) return null;
 const state = editId ? {...c, ...revisePatrimonyTransfer(c, editId, null)} : c;
 return patrimonyTransferAvailability(state, draft.fromId, draft.date);
}
function requestedAmountText(c, amount: number) {
 return c.translateUiRuntimeText('Importo') + ' ' + c.fmt(amount);
}
function availableBalanceText(c, date: string, amount: number) {
 return cashFlowText(c.lang, 'availableBalance').replace('{date}', fmtDate(date, c.dateFmt)).replace('{amount}', c.fmt(amount));
}

function useTransfer(draft:Draft,onSaved:()=>void,editId?:string){
 const c:any=useApp();
 const [notice,setNotice]=useState(''),[warning,setWarning]=useState(''),[success,setSuccess]=useState(false);
 const saving=useRef(false),id=useRef('transfer_'+(globalThis.crypto?.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2)));
 function clear(){setNotice('');setWarning('');}
 function save(confirmed=false){
  if(saving.current)return;
  if(c.firestoreReady===false||c.shareCashMovements===null){setNotice(transferText(c.lang,'wait'));return;}
  if(!validPatrimonyTransferDate(draft.date)){setNotice(cashFlowText(c.lang,'invalidDate'));return;}
  try{
   const prepared=editId?revisePatrimonyTransfer(c,editId,draft):transferPatrimonyFunds(c,{id:id.current,...draft});
   const available=transferAvailability(c,draft,editId);
   if(!confirmed&&(available===null||parseMoney(draft.amount)>available)){
    const balance = available === null ? fmtDate(draft.date,c.dateFmt) : availableBalanceText(c,draft.date,available);
    setWarning(requestedAmountText(c,parseMoney(draft.amount)) + '\n' + balance + '\n' + cashFlowText(c.lang,available===null?'unknownBalance':'overBalance'));return;
   }
   saving.current=true;
   persist(c,prepared);
   clear();setSuccess(true);onSaved();
  }catch(e){
   saving.current=false;
   const code=e instanceof Error?e.message:'';
   setNotice(transferText(c.lang,code==='TRANSFER_AMOUNT'?'amountError':code==='TRANSFER_ACCOUNTS'?'accountsError':code==='TRANSFER_MAPPING'?'mappingError':'saveError'));
  }
 }
 function closeSuccess(){saving.current=false;setSuccess(false);id.current='transfer_'+(globalThis.crypto?.randomUUID?.()||Date.now()+'_'+Math.random().toString(36).slice(2));}
 return {notice,warning,success,clear,save,closeSuccess};
}
function TransferFeedback({flow,onClose}:{flow:ReturnType<typeof useTransfer>;onClose?:()=>void}){
 const c:any=useApp(),L=(x:string)=>c.translateUiRuntimeText(x);
 return <>
  {flow.notice&&<p role="alert" style={{color:c.dark?'#FF9AA3':'#B63B45',margin:'4px 0',fontSize:13}}>{flow.notice}</p>}
  {flow.warning&&<FainancePickerModal open zIndex={10200} title={transferText(c.lang,'title')} tone="warning" onClose={flow.clear}
   footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><Btn style={secondarySettingsStyle(c)} onClick={flow.clear}>{L('Annulla')}</Btn><Btn onClick={()=>flow.save(true)}>{L('Conferma')}</Btn></div>}>
   <div style={{whiteSpace:'pre-line'}}>{flow.warning}</div>
  </FainancePickerModal>}
  {flow.success&&<FainancePickerModal open zIndex={10200} title={transferText(c.lang,'saved')} tone="success" onClose={()=>{flow.closeSuccess();onClose?.();}}>
   <Btn onClick={()=>{flow.closeSuccess();onClose?.();}}>{L('Chiudi')}</Btn>
  </FainancePickerModal>}
 </>;
}
export function PatrimonyTransferWorklet({size='1x'}:{size?:string}){
 const c:any=useApp();
 const [draft,setDraft]=useState(newDraft);
 const flow=useTransfer({...draft,date:size==='2x'?draft.date:civilToday()},()=>setDraft(newDraft()));
 return <div data-patrimony-transfer-worklet style={{display:'grid',alignContent:'center',gap:size==='2x'?12:8,minWidth:0,height:'100%'}}>
  <TransferFields draft={draft} change={value=>{setDraft(value);flow.clear();}} compact workletSize={size}/>
  <Btn style={{padding:size==='0.5x'?'7px 4px':'11px 12px',fontSize:size==='0.5x'?12:14,minWidth:0}} onClick={()=>flow.save()}>{transferText(c.lang,'title')}</Btn>
  <TransferFeedback flow={flow}/>
 </div>;
}
export function PatrimonyTransferRows({records}:{records:any[]}){
 const c:any=useApp(),L=(x:string)=>c.translateUiRuntimeText(x);
 const [edit,setEdit]=useState<any>(null),[remove,setRemove]=useState<any>(null),[error,setError]=useState('');
 const deleting=useRef(false);
 function deleteSelected(){
  if(deleting.current||!remove)return;
  deleting.current=true;
  try{if(c.firestoreReady===false)throw Error();persist(c,revisePatrimonyTransfer(c,remove.id,null));setRemove(null);setError('');}
  catch{setError(transferText(c.lang,'saveError'));}
  finally{deleting.current=false;}
 }
 return <>
  {records.map(record=><div key={record.id} data-patrimony-transfer-row style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:8,flexWrap:'wrap',padding:'9px 0',borderBottom:'1px solid '+c.borderC}}>
   <span style={{minWidth:0,fontSize:13}}>{record.fromName} → {record.toName}<br/><small>{fmtDate(record.date,c.dateFmt)}</small></span>
   <strong>{c.fmt(record.amount)}</strong>
   <div style={{display:'flex',gap:5}}>
    <Btn style={secondarySettingsStyle(c)} onClick={()=>setEdit(record)}>{L('Modifica')}</Btn>
    <Btn style={secondarySettingsStyle(c)} onClick={()=>{setError('');setRemove(record);}}>{L('Elimina')}</Btn>
   </div>
  </div>)}
  {edit&&<PatrimonyTransferDialog record={edit} onClose={()=>setEdit(null)}/>}
  {remove&&<FainancePickerModal open zIndex={10170} title={cashFlowText(c.lang,'deleteTransfer')} onClose={()=>setRemove(null)}
   footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><Btn style={secondarySettingsStyle(c)} onClick={()=>setRemove(null)}>{L('Annulla')}</Btn><Btn bg="#B63B45" onClick={deleteSelected}>{L('Elimina')}</Btn></div>}>
   <p>{cashFlowText(c.lang,'deleteTransferBody')}</p>{error&&<p role="alert">{error}</p>}
  </FainancePickerModal>}
 </>;
}
export function PatrimonyTransferDialog({onClose,record}:{onClose:()=>void;record?:any}){
 const c:any=useApp(),L=(x:string)=>c.translateUiRuntimeText(x);
 const [draft,setDraft]=useState<Draft>(()=>record?{fromId:String(record.fromId),toId:String(record.toId),amount:String(record.amount),date:record.date}:newDraft());
 const flow=useTransfer(draft,()=>{},record?.id);
 const history=patrimonyTransferHistory(c.patrimonioEntries||[]);
 let available: number | null = null;
 try { available = transferAvailability(c,draft,record?.id); } catch {}
 return <>
  {!flow.success&&<FainancePickerModal open zIndex={record?10160:10150} title={record?cashFlowText(c.lang,'editTransfer'):transferText(c.lang,'title')} onClose={onClose}
   footer={<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><Btn style={secondarySettingsStyle(c)} onClick={onClose}>{L('Annulla')}</Btn><Btn onClick={()=>flow.save()}>{record?L('Salva'):transferText(c.lang,'submit')}</Btn></div>}>
   <p style={{margin:'0 0 12px',color:c.subC,fontSize:13}}>{transferText(c.lang,'description')}</p>
   <TransferFields draft={draft} change={value=>{setDraft(value);flow.clear();}}/>
   {available!==null&&<p style={{color:c.subC,fontSize:13}}>{availableBalanceText(c,draft.date,available)}</p>}
   {flow.notice&&<p role="alert" style={{color:c.dark?'#FF9AA3':'#B63B45'}}>{flow.notice}</p>}
   {!record&&history.length>0&&<section style={{marginTop:16}}><strong>{transferText(c.lang,'recent')}</strong><PatrimonyTransferRows records={history.slice(0,10)}/></section>}
  </FainancePickerModal>}
  <TransferFeedback flow={{...flow,notice:''}} onClose={onClose}/>
 </>;
}
