import {patrimonyReferences} from '../finance/patrimonyMerge.js';
import {readableDarkText} from '../ui/textContrast';
import {catalogRemapText} from '../i18n/catalogRemapTranslations';
import {useState} from 'react';
import {useApp,fmtDate,getAllIncomeTypes} from '../core';
import {Badge,Btn,FainancePickerModal} from '../widget';
import {FainanceIcon} from '../icons/customIconLibrary';
import {secondarySettingsStyle} from '../ui/SettingsControls';
import {catalogReferences,methodRemapConflict} from '../finance/catalogRemap.js';
import './CatalogDeleteDialog.css';
export function catalogDestinationItems(c:any,scope:string,items:any[]){
 const rows=scope==='incomeCategory'?[...getAllIncomeTypes(c.customIncomeTypes||[],c.incomeTypeOverrides||{}),...items]:items;
 return [...new Map(rows.map(x=>[String(x.id),x])).values()];
}
function LinkedMovement({reference,source,scope}:any){
 const c:any=useApp(),L=(x:string)=>c.translateUiRuntimeText?c.translateUiRuntimeText(x):x;
 const {row:item,direction,collection}=reference,income=direction==='income';
 const categories=income?catalogDestinationItems(c,'incomeCategory',c.incomeTypes||[]):c.cats||[];
 const categoryId=(income?[item.type,item.incomeType,item.typeId,item.catId,item.categoryId]:[item.catId,item.categoryId]).find(x=>x!=null&&String(x)!=='');
 const category=categories.find(x=>String(x.id)===String(categoryId))||(['expenseCategory','incomeCategory'].includes(scope)?source:null);
 const groups=income?c.incomeGroups||[]:c.expenseGroups||[],area=groups.find(x=>String(x.id)===String(category?.group));
 const methodId=income?item.receivedInMethodId:item.methodId??item.method;
 const method=(c.methods||[]).find(x=>String(x.id)===String(methodId)),methodName=method?.name||(income?item.receivedInMethodName:item.methodName);
 const amount=Number(item.amount)||0,signed=income?amount:-amount;
 const color=readableDarkText(income?(c.incomeColor||'#18794E'):(c.expenseColor||'#B63B45'),!!c.dark,c.cardBg);
 return <article data-catalog-linked-movement className="catalog-linked-movement" style={{background:c.cardBg,border:'1px solid '+c.borderC,borderRadius:12,padding:'10px 14px',display:'flex',gap:10,alignItems:'flex-start'}}>
  <span style={{display:'inline-flex',flexShrink:0,paddingTop:2}}><FainanceIcon value={category?.icon||(income?'💰':'📦')} size={20}/></span>
  <div style={{flex:1,minWidth:0}}><div style={{display:'flex',gap:10,alignItems:'flex-start',justifyContent:'space-between'}}><strong style={{fontSize:14,fontWeight:700,overflowWrap:'anywhere',minWidth:0}}>{item.desc||item.description||item.name||L(income?'Entrata':'Uscita')}</strong><strong style={{fontSize:15,fontWeight:850,color,whiteSpace:'nowrap',flexShrink:0}}>{signed<0?'−':'+'}{c.fmt(Math.abs(amount))}</strong></div>
   <div className="catalog-history-badges" style={{display:'flex',flexWrap:'wrap',gap:6,marginTop:6}}>{category&&<Badge color={category.color||'#245B8E'} name={L(category.name)+(category.archived?' [A]':'')} small/>}{methodName&&<Badge color={method?.color||'#B4B2A9'} name={methodName+(method?.archived?' [A]':'')} small/>}{item.rateizzato&&<Badge color="#7F77DD" name={'÷'+item.rate+'m'} small/>}{category?.excludeFromTotals&&<Badge color="#EF9F27" name={L('Non conteggiata')} small/>}</div>
   <div style={{display:'flex',flexWrap:'wrap',gap:6,fontSize:11,color:c.subC,marginTop:6}}><span>{L(income?'Entrata':'Uscita')}</span>{area&&<span>· {L(area.name)}</span>}{(item.date||item.effectiveFrom)&&<span>· {fmtDate(String(item.date||item.effectiveFrom).slice(0,10),c.dateFmt)}</span>}{collection==='recurring'&&<span>· {L('Ricorrente')}</span>}</div>
  </div>
 </article>;
}
export function CatalogDeleteDialog({source,scope,items,onClose,onConfirm}:any){
 const c:any=useApp(),L=(x:string)=>catalogRemapText(c.lang,c.translateUiRuntimeText?c.translateUiRuntimeText(x):x);
 const [target,setTarget]=useState(''),[error,setError]=useState('');
 const patrimony=scope==='patrimonioEntry', references=patrimony?patrimonyReferences(c,source):catalogReferences(c,scope,source),targets=catalogDestinationItems(c,scope,items).filter(x=>!x.deleted&&!x.deletedAt&&String(x.id)!==String(source.id));
 return <FainancePickerModal open title={L('Elimina e riassegna')+' · '+source.name} onClose={onClose} footer={<div style={{display:'grid',gap:8}}>{error&&<div role="alert" style={{fontSize:13,color:c.dark?'#FF9AA3':'#B63B45'}}>{error}</div>}<div style={{display:'flex',justifyContent:'flex-end',gap:8}}><Btn style={secondarySettingsStyle(c)} onClick={onClose}>{L('Annulla')}</Btn><Btn style={patrimony?{minHeight:38,padding:'9px 14px'}:secondarySettingsStyle(c)} onClick={()=>{try{if(!target)throw Error(L('Scegli la destinazione per i movimenti collegati.'));onConfirm(target);}catch(e){setError(e instanceof Error?e.message:String(e));}}}>{L('Conferma cancellazione')}</Btn></div></div>}>
  <p style={{fontSize:13,lineHeight:1.5,margin:'0 0 14px',color:c.subC}}>{patrimony?L('I saldi vengono accorpati mese per mese: i valori già presenti nella destinazione vengono sommati.'):L('Confermi la cancellazione? I movimenti restano nello storico e vengono riassegnati alla destinazione scelta.')}</p>
  <div data-catalog-destination style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,padding:14,borderRadius:14,border:'2px solid '+(c.secondaryButtonColor||'#5FAFE5'),background:c.dark?'#10243A':'#F7F9FC'}}><strong style={{fontSize:16,color:c.textC,flex:1}}>{L('Sposta in')}</strong><select aria-label={L('Sposta in')} value={target} onChange={e=>{setTarget(e.target.value);setError('');}} style={{width:'60%',minWidth:0,padding:12,borderRadius:10,border:'1px solid #D8E1EA',background:'#FFFFFF',color:'#000000',colorScheme:'light',fontSize:14,fontWeight:600}}><option value="">{L('Seleziona')}</option>{targets.map(x=><option key={x.id} value={x.id} data-fainance-icon-ref={x.icon||undefined} disabled={scope==='method'&&methodRemapConflict(c,source.id,x.id)} style={{background:'#FFFFFF',color:'#000000'}}>{L(x.name)}{x.archived?' · '+L(scope==='method'?'Archiviato':'Archiviata'):''}{scope==='method'&&methodRemapConflict(c,source.id,x.id)?' · '+L('Collegato a un altro conto'):''}</option>)}</select></div>
  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,margin:'18px 0 10px'}}><strong style={{fontSize:13}}>{L(patrimony?'Saldi da accorpare':'Movimenti e ricorrenze collegati')}</strong><span style={{fontSize:12,fontWeight:700,color:c.subC}}>{references.length}</span></div>
  <div style={{display:'flex',flexDirection:'column',gap:8}}>{patrimony?references.map(reference=><article key={reference.month} data-patrimony-merge-month style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,padding:'12px 14px',background:c.cardBg,border:'1px solid '+c.borderC,borderRadius:12}}><span style={{display:'flex',alignItems:'center',gap:8}}><FainanceIcon value={source.icon||'🏦'} size={20}/><span><strong>{reference.month==='current'?L('Saldo attuale'):reference.month}</strong><br/><small style={{color:c.subC}}>{source.name}</small></span></span><strong>{c.fmt(reference.amount)}</strong></article>):references.map(reference=><LinkedMovement key={reference.collection+':'+reference.row.id} reference={reference} source={source} scope={scope}/>)}</div>
 </FainancePickerModal>;
}
