import { useState, useEffect, useRef } from 'react';
import { useApp, parseMoney, todayStr } from '../core';
import { pickFainanceContact } from '../native/appContacts';
import { debtCreditBalance } from '../finance/debtCredit';
import { PopupCloseButton } from '../widget';

export function DebtCreditsPanel(){
  var _c:any=useApp();
  var {addExpenses,addIncomes,borderC,btnRadius,cardBg,cats,confirmButtonColor,curMonthKey,currentPlan,dark,debtCredits,expenseColor,findRegisteredUserForShare,fmt,incomeColor,incomeTypes,inp,isMobile,methods,secondaryButtonColor,setDebtCredits,setPatrimonioEntries,setPatrimonioValues,setToast,showDebtCreditsInExpenses,showDebtCreditsInPatrimonio,subC,textC,translateUiRuntimeText}:any=_c;

    function L(s){return translateUiRuntimeText(s);}
    var debtBaseAllowed=currentPlan==="premium";
    var [kind,setKind]=useState("debt");
    var [holder,setHolder]=useState("");
    var [amount,setAmount]=useState("");
    var [startDate,setStartDate]=useState(todayStr());
    var [endDate,setEndDate]=useState("");
    var [note,setNote]=useState("");
    var [selectedId,setSelectedId]=useState(null);
    var [editingId,setEditingId]=useState(null);
    var [txAmount,setTxAmount]=useState("");
    var [txType,setTxType]=useState("reduction");
    var [txDate,setTxDate]=useState(todayStr());
    var [txStart,setTxStart]=useState(todayStr());
    var [txEnd,setTxEnd]=useState("");
    var [txNote,setTxNote]=useState("");
    var [showTxForm,setShowTxForm]=useState(false);
    var [showDebtForm,setShowDebtForm]=useState(false);
    var [editingTxId,setEditingTxId]=useState("");
    var [debtContactBusy,setDebtContactBusy]=useState(false);
    var [debtUsername,setDebtUsername]=useState("");
    var [debtUsernameBusy,setDebtUsernameBusy]=useState(false);
    var [debtCounterparty,setDebtCounterparty]=useState<any>(null);
    var debtContactDraftRef=useRef<any>(null);
    var debtAppliedContactRef=useRef<string>("");
    var sinp={...inp,width:"100%",boxSizing:"border-box"};
    var labelStyle={fontSize:11,fontWeight:900,color:subC,margin:"0 0 5px 2px",textTransform:"uppercase",letterSpacing:.3};
    function field(label,child){return <div style={{display:"flex",flexDirection:"column",gap:0}}><label style={labelStyle}>{L(label)}</label>{child}</div>;}
    function balance(item){return debtCreditBalance(item);}
    function selected(){return (debtCredits||[]).find(function(x){return String(x.id)===String(selectedId);})||null;}
    function scrollDebtCreditDetail(){setTimeout(function(){try{var el=document.getElementById("debtCreditDetailPanel");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){}},220);}
    function resetForm(){setEditingId(null);setKind("debt");setHolder("");setAmount("");setStartDate(todayStr());setEndDate("");setNote("");setDebtUsername("");setDebtCounterparty(null);setShowDebtForm(false);}
    function openItem(item){setSelectedId(item.id);setShowTxForm(false);setEditingTxId("");setTxType("reduction");setTxDate(todayStr());setTxStart(item.startDate||todayStr());setTxEnd(item.estimatedEndDate||"");setTxAmount("");setTxNote("");scrollDebtCreditDetail();}
    function debtContactName(c:any){return String((c&&(c.name||c.email||c.phone))||"").trim();}
    function debtDraftSnapshot(){return {kind:kind,holder:holder,amount:amount,startDate:startDate,endDate:endDate,note:note,editingId:editingId,showDebtForm:true};}
    function applyDebtDraft(d:any){if(!d)return;if(d.kind)setKind(d.kind);if(typeof d.amount!=="undefined")setAmount(String(d.amount||""));if(typeof d.startDate!=="undefined")setStartDate(d.startDate||todayStr());if(typeof d.endDate!=="undefined")setEndDate(d.endDate||"");if(typeof d.note!=="undefined")setNote(d.note||"");if(typeof d.editingId!=="undefined")setEditingId(d.editingId||null);}
    function keepDebtFormOpen(){setSelectedId(null);setShowTxForm(false);setEditingTxId("");setShowDebtForm(true);}
    function applyDebtContact(c:any,draft?:any){
    var contactName=debtContactName(c);if(!contactName)return false;
    var safeDraft=draft||debtContactDraftRef.current||{};
    var applyKey=String(contactName)+"|"+String((safeDraft&&safeDraft.__contactTs)||"");
    debtAppliedContactRef.current=applyKey;
    try{
      if(typeof sessionStorage!=="undefined")sessionStorage.setItem("fainance_debt_holder_last",contactName);
      if(typeof localStorage!=="undefined")localStorage.setItem("fainance_debt_holder_last",contactName);
    }catch(e){}
    function forceApply(){
      applyDebtDraft(safeDraft);
      setSelectedId(null);
      setShowTxForm(false);
      setEditingTxId("");
      setShowDebtForm(true);
      setHolder(contactName);
      setDebtCounterparty(null);
    }
    forceApply();
    try{requestAnimationFrame(function(){forceApply();});}catch(e){}
    setTimeout(forceApply,0);
    setTimeout(forceApply,120);
    setTimeout(forceApply,450);
    setTimeout(forceApply,900);
    return true;
  }
  function consumePendingDebtContact(){
    try{
      var raw="";
      if(typeof sessionStorage!=="undefined")raw=sessionStorage.getItem("fainance_pending_debt_contact")||"";
      if(!raw&&typeof localStorage!=="undefined")raw=localStorage.getItem("fainance_pending_debt_contact")||"";
      if(!raw)return false;
      var payload=JSON.parse(raw);
      if(!payload||!payload.contact)return false;
      if(payload.ts&&Date.now()-Number(payload.ts)>30000){
        try{if(typeof sessionStorage!=="undefined")sessionStorage.removeItem("fainance_pending_debt_contact");}catch(_a){}
        try{if(typeof localStorage!=="undefined")localStorage.removeItem("fainance_pending_debt_contact");}catch(_b){}
        return false;
      }
      var contactName=debtContactName(payload.contact);
      var key=String(contactName)+"|"+String(payload.ts||"");
      if(!contactName||debtAppliedContactRef.current===key)return false;
      var d=payload.draft||{};d.__contactTs=payload.ts||Date.now();
      var ok=applyDebtContact(payload.contact,d);
      setTimeout(function(){try{if(typeof sessionStorage!=="undefined")sessionStorage.removeItem("fainance_pending_debt_contact");}catch(_c){}},5000);
      return ok;
    }catch(e){}
    return false;
  }
  useEffect(function(){
      consumePendingDebtContact();
      function h(){consumePendingDebtContact();}
      var ticks=0;
      var timer:any=null;
      try{timer=setInterval(function(){ticks++;consumePendingDebtContact();if(ticks>=25&&timer)clearInterval(timer);},200);}catch(e){}
      try{window.addEventListener("fainanceDebtContactSelected",h);window.addEventListener("focus",h);document.addEventListener("visibilitychange",h);}catch(e){}
      return function(){try{if(timer)clearInterval(timer);window.removeEventListener("fainanceDebtContactSelected",h);window.removeEventListener("focus",h);document.removeEventListener("visibilitychange",h);}catch(e){}};
    },[]);
    useEffect(function(){consumePendingDebtContact();});
    function consumePendingDebtCreditOpen(detail?:any){
      var id=String((detail&&(detail.debtCreditId||detail.id))||"");
      if(!id){try{id=String(sessionStorage.getItem("fainance_debt_credit_open_id_v1")||"");}catch(e){}}
      if(!id){try{id=String(localStorage.getItem("fainance_debt_credit_open_id_v1")||"");}catch(e){}}
      if(!id)return false;
      var exists=(debtCredits||[]).some(function(d){return String(d.id)===String(id);});
      if(!exists)return false;
      setSelectedId(id);
      setShowTxForm(false);
      setEditingTxId("");
      setShowDebtForm(false);
      scrollDebtCreditDetail();
      try{sessionStorage.removeItem("fainance_debt_credit_open_id_v1");}catch(e){}
      try{localStorage.removeItem("fainance_debt_credit_open_id_v1");}catch(e){}
      return true;
    }
    useEffect(function(){
      function handler(ev?:any){consumePendingDebtCreditOpen(ev&&ev.detail);}
      try{window.addEventListener("fainance-open-debt-credit",handler);}catch(e){}
      var timers=[80,260,650,1200,2000].map(function(ms){return setTimeout(function(){consumePendingDebtCreditOpen();},ms);});
      return function(){try{window.removeEventListener("fainance-open-debt-credit",handler);}catch(e){}timers.forEach(function(t){clearTimeout(t);});};
    },[debtCredits.map(function(d){return String(d.id);}).join("|")]);
    async function pickContact(ev?:any){
      try{if(ev&&ev.preventDefault)ev.preventDefault();if(ev&&ev.stopPropagation)ev.stopPropagation();}catch(_e){}
      if(debtContactBusy)return;
      var draft=debtDraftSnapshot();
      (draft as any).__contactTs=Date.now();
      debtContactDraftRef.current=draft;
      keepDebtFormOpen();
      try{if(typeof sessionStorage!=="undefined")sessionStorage.setItem("fainance_pending_debt_draft",JSON.stringify(draft));if(typeof localStorage!=="undefined")localStorage.setItem("fainance_pending_debt_draft",JSON.stringify(draft));}catch(_s){}
      setDebtContactBusy(true);
      try{
        var fn=(typeof window!=="undefined"?(window as any).fainancePickContact:null)||pickFainanceContact;
        var c=await fn();
        if(c&&(c.name||c.email||c.phone)){
          try{var pendingDebtContactPayload=JSON.stringify({contact:c,draft:draft,ts:(draft as any).__contactTs||Date.now()});if(typeof sessionStorage!=="undefined")sessionStorage.setItem("fainance_pending_debt_contact",pendingDebtContactPayload);if(typeof localStorage!=="undefined")localStorage.setItem("fainance_pending_debt_contact",pendingDebtContactPayload);}catch(_s2){}
          if(applyDebtContact(c,draft)){
            try{window.dispatchEvent(new CustomEvent("fainanceDebtContactSelected"));}catch(_ev){}
            setToast({text:L("Contatto importato dalla rubrica"),type:"success",icon:"📇"});
            return;
          }
        }
        keepDebtFormOpen();
        setToast({text:L("Nessun contatto selezionato."),type:"warning",color:"#FFF8E1",icon:"📇",textColor:"#856404"});
      }catch(e){keepDebtFormOpen();setToast({text:L("Impossibile leggere la rubrica. Inserisci il titolare manualmente."),type:"warning",color:"#FFF8E1",icon:"📇",textColor:"#856404"});}
      finally{setDebtContactBusy(false);}
    }
    async function searchDebtUsername(){
      var clean=String(debtUsername||"").trim().replace(/^@+/,"");
      if(!clean){setToast({text:L("Inserisci uno username"),type:"warning",icon:"🔎",color:"#FFF8E1",textColor:"#856404"});return;}
      if(debtUsernameBusy)return;
      setDebtUsernameBusy(true);
      try{
        var found=await findRegisteredUserForShare("","",clean);
        if(!found){setToast({text:L("Nessun utente trovato con questo username"),type:"warning",icon:"🔎",color:"#FFF8E1",textColor:"#856404"});return;}
        setDebtCounterparty(found);
        setDebtUsername(found.username||clean);
        setHolder("@"+(found.username||clean));
        setToast({text:L("Utente trovato"),type:"success",icon:"✅"});
      }catch(e){setToast({text:L("Ricerca username non disponibile"),type:"error",icon:"🚫"});}
      finally{setDebtUsernameBusy(false);}
    }
    var debtFormValid=debtBaseAllowed&&!!String(holder||"").trim()&&parseMoney(amount)>0&&!!String(startDate||"").trim();
    var debtTxFormValid=parseMoney(txAmount)>0&&!!String(txDate||"").trim();
    function saveItem(){
      if(!debtBaseAllowed){setToast({text:"Questa funzione non è disponibile con il piano attuale.\nEffettua l’upgrade",type:"warning",color:"#FFF8E1",textColor:"#856404",icon:"🔒",actionLabel:"Piani",actionPage:"plans_settings",duration:7000});return;}
      var a=parseMoney(amount);if(!holder.trim()||!a){setToast({text:L("Inserisci titolare e importo."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}
      if(editingId){
        setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(editingId)?{...x,kind:kind,holder:holder.trim(),counterpartyUid:debtCounterparty?debtCounterparty.uid:"",counterpartyUsername:debtCounterparty?(debtCounterparty.username||debtUsername):"",initialAmount:a,startDate:startDate||todayStr(),estimatedEndDate:endDate||"",note:note.trim(),updatedAt:new Date().toISOString()}:x;});});
        setSelectedId(null);setToast({text:L("Debito / Credito aggiornato"),type:"success",icon:"✅"});resetForm();return;
      }
      var item={id:"dc_"+Date.now(),kind:kind,holder:holder.trim(),counterpartyUid:debtCounterparty?debtCounterparty.uid:"",counterpartyUsername:debtCounterparty?(debtCounterparty.username||debtUsername):"",initialAmount:a,startDate:startDate||todayStr(),estimatedEndDate:endDate||"",note:note.trim(),transactions:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
      setDebtCredits(function(list){return [item].concat(list||[]);});setSelectedId(null);setToast({text:L("Debito / Credito salvato"),type:"success",icon:"✅"});resetForm();
    }
    function deleteItem(id){if(!window.confirm(L("Eliminare questo Debito / Credito?")))return;setDebtCredits(function(list){return (list||[]).filter(function(x){return String(x.id)!==String(id);});});if(String(selectedId)===String(id))setSelectedId(null);if(String(editingId)===String(id))resetForm();setToast({text:L("Debito / Credito eliminato"),type:"success",icon:"🗑️"});}
    function editItem(item){setKind(item.kind||"debt");setHolder(item.holder||"");setDebtUsername(item.counterpartyUsername||"");setDebtCounterparty(item.counterpartyUid?{uid:item.counterpartyUid,username:item.counterpartyUsername||""}:null);setAmount(String(item.initialAmount||""));setStartDate(item.startDate||todayStr());setEndDate(item.estimatedEndDate||"");setNote(item.note||"");setEditingId(item.id);setSelectedId(null);setShowTxForm(false);setShowDebtForm(true);}
    function saveTx(){var item=selected();if(!item)return;var a=parseMoney(txAmount);if(!a){setToast({text:L("Inserisci l'importo della transazione."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}if(editingTxId&&!window.confirm(L("Confermi la modifica?")))return;var tx={id:editingTxId||("tx_"+Date.now()),action:txType==="increase"?"increase":"reduction",amount:a,date:txDate||todayStr(),startDate:txStart||item.startDate||todayStr(),estimatedEndDate:txEnd||item.estimatedEndDate||"",note:txNote.trim(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};setDebtCredits(function(list){return (list||[]).map(function(x){if(String(x.id)!==String(item.id))return x;var txs=(x.transactions||[]);return {...x,transactions:editingTxId?txs.map(function(t){return String(t.id)===String(editingTxId)?{...t,...tx}:t;}):[tx].concat(txs),updatedAt:new Date().toISOString()};});});setTxAmount("");setTxNote("");setEditingTxId("");setShowTxForm(false);setToast({text:L(editingTxId?"Transazione modificata":"Transazione Debito / Credito salvata"),type:"success",icon:"✅"});}
    function deleteTx(itemId,txId){if(!window.confirm(L("Confermi la cancellazione?")))return;setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(itemId)?{...x,transactions:(x.transactions||[]).filter(function(t){return String(t.id)!==String(txId);}),updatedAt:new Date().toISOString()}:x;});});setToast({text:L("Cancellazione completata"),type:"success",icon:"🗑️"});}
    function editTx(tx){setEditingTxId(tx.id);setTxType(tx.action||"reduction");setTxAmount(String(tx.amount||""));setTxDate(tx.date||todayStr());setTxStart(tx.startDate||todayStr());setTxEnd(tx.estimatedEndDate||"");setTxNote(tx.note||"");setShowTxForm(true);}
    function closeItem(item){var b=balance(item);if(b<=0)return;if(!window.confirm(L(item.kind==="debt"?"Chiudere questo Debito?":"Chiudere questo Credito?")))return;var tx={id:"tx_"+Date.now(),action:"reduction",amount:b,date:todayStr(),startDate:item.startDate||todayStr(),estimatedEndDate:item.estimatedEndDate||"",note:L(item.kind==="debt"?"Debito chiuso":"Credito chiuso"),createdAt:new Date().toISOString(),closing:true};setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(item.id)?{...x,transactions:[tx].concat(x.transactions||[]),closedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:x;});});setShowTxForm(false);setToast({text:L(item.kind==="debt"?"Debito chiuso":"Credito chiuso"),type:"success",icon:"✅"});}
    function reportPatrimonio(item){var val=balance(item)*(item.kind==="debt"?-1:1);var id="dc_"+item.id;setPatrimonioEntries(function(list){var exists=(list||[]).some(function(e){return e.id===id;});if(exists)return list;return (list||[]).concat([{id:id,name:(item.kind==="debt"?L("Debito"):L("Credito"))+" - "+item.holder,icon:item.kind==="debt"?"📉":"📈",color:item.kind==="debt"?"#E24B4A":"#1D9E75",group:"altro"}]);});setPatrimonioValues(function(v){var next={...(v||{})};if(!next[curMonthKey])next[curMonthKey]={};next[curMonthKey][id]=val;return next;});setToast({text:L("Debito / Credito riportato nel patrimonio"),type:"success",icon:"💎"});}
    function reportMovement(item){var a=balance(item);if(!a)return;var desc=(item.kind==="debt"?L("Debito"):L("Credito"))+" - "+item.holder;if(item.kind==="debt"){addExpenses([{id:Date.now(),amount:a,catId:(cats&&cats[0]&&cats[0].id)||1,methodId:(methods&&methods[0]&&methods[0].id)||1,desc:desc,date:todayStr()}],"manual");}else{addIncomes([{id:Date.now(),amount:a,typeId:(incomeTypes&&incomeTypes[0]&&incomeTypes[0].id)||"stipendio",desc:desc,date:todayStr()}],"manual");}setToast({text:L("Debito / Credito riportato nei movimenti"),type:"success",icon:"💸"});}
    var sel=selected();
    if(sel){return <div style={{display:"flex",flexDirection:"column",gap:14}}><button onClick={function(){setSelectedId(null);setShowTxForm(false);setEditingTxId("");}} style={{alignSelf:"flex-start",background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>‹ {L("Indietro")}</button><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:balance(sel)<=0?(dark?"#202024":"#f2f2f2"):(dark?"#252535":"#F8FAFC"),border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><div style={{fontSize:18,fontWeight:900,color:textC}}>{sel.kind==="debt"?"📉":"📈"} {sel.holder}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L(sel.kind==="debt"?"Debito":"Credito")} · {L("Saldo attuale")}: <b style={{color:balance(sel)<=0?incomeColor:textC}}>{fmt(balance(sel))}</b> {balance(sel)<=0&&<b style={{color:incomeColor}}> · {L("Estinto")}</b>}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L("Data inizio")}: {sel.startDate||"-"} · {L("Fine stimata")}: {sel.estimatedEndDate||"-"}</div>{sel.note&&<div style={{fontSize:12,color:subC,marginTop:4}}>{sel.note}</div>}</div><button onClick={function(){editItem(sel);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>✏️</button></div></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{balance(sel)>0&&<button onClick={function(){setEditingTxId("");setTxType("reduction");setTxAmount("");setTxDate(todayStr());setTxStart(sel.startDate||todayStr());setTxEnd(sel.estimatedEndDate||"");setTxNote("");setShowTxForm(function(v){return !v;});}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>＋ {L("Aggiungi transazione")}</button>}{balance(sel)>0&&<button onClick={function(){closeItem(sel);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>✅ {L(sel.kind==="debt"?"Chiudi Debito":"Chiudi Credito")}</button>}{showDebtCreditsInPatrimonio&&<button onClick={function(){reportPatrimonio(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💎 {L("Riporta nel patrimonio")}</button>}{showDebtCreditsInExpenses&&<button onClick={function(){reportMovement(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💸 {L("Riporta nei movimenti")}</button>}</div>{balance(sel)>0&&showTxForm&&<div style={{background:dark?"#1f2333":"#FAFBFF",border:"1px solid "+borderC,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 120px 140px",gap:8}}>{field("Tipo transazione",<select value={txType} onChange={function(e){setTxType(e.target.value);}} style={sinp}><option value="reduction">{L(sel.kind==="debt"?"Riduzione del Debito":"Riduzione del Credito")}</option><option value="increase">{L(sel.kind==="debt"?"Aumento del debito":"Aumento del Credito")}</option></select>)}{field("Importo",<input value={txAmount} onChange={function(e){setTxAmount(e.target.value);}} inputMode="decimal" placeholder={L("Importo")} style={sinp}/>)}{field("Data transazione",<input type="date" value={txDate} onChange={function(e){setTxDate(e.target.value);}} style={sinp}/>)}{field("Data inizio",<input type="date" value={txStart} onChange={function(e){setTxStart(e.target.value);}} style={sinp}/>)}{field("Data stimata fine",<input type="date" value={txEnd} onChange={function(e){setTxEnd(e.target.value);}} style={sinp}/>)}{field("Commento",<input value={txNote} onChange={function(e){setTxNote(e.target.value);}} placeholder={L("Commento")} style={sinp}/>)}<button onClick={saveTx} disabled={!debtTxFormValid} style={{background:debtTxFormValid?confirmButtonColor:"#A8A8A8",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:debtTxFormValid?"pointer":"not-allowed"}}>＋ {L(editingTxId?"Salva modifica":"Aggiungi transazione")}</button>{editingTxId&&<button onClick={function(){setEditingTxId("");setShowTxForm(false);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:"pointer"}}>{L("Annulla")}</button>}</div>}<div>{(sel.transactions||[]).map(function(tx){return <div key={tx.id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid "+borderC,borderRadius:10,padding:"8px 10px",marginBottom:6,background:dark?"#252535":"#fff"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:900,color:tx.action==="increase"?expenseColor:incomeColor}}>{tx.action==="increase"?"＋":"−"} {fmt(tx.amount)} · {tx.date||""}</div><div style={{fontSize:11,color:subC}}>{L("Inizio")}: {tx.startDate||"-"} · {L("Fine stimata")}: {tx.estimatedEndDate||"-"}{tx.note?" · "+tx.note:""}</div></div><button onClick={function(){editTx(tx);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>✏️</button><button onClick={function(){deleteTx(sel.id,tx.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>🗑️</button></div>;})}{!(sel.transactions||[]).length&&<div style={{fontSize:13,color:subC}}>{L("Nessuna transazione inserita")}</div>}</div></div></div></div>;}
    return <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{background:debtBaseAllowed?cardBg:(dark?"#2B2B36":"#F3F4F6"),border:"1px solid "+(debtBaseAllowed?borderC:(dark?"#4B4B58":"#D1D5DB")),borderRadius:16,padding:16}}>
        <div style={{fontSize:18,fontWeight:900,color:textC,marginBottom:4}}>💳 {L("Debiti / Crediti")}</div>
        <div style={{fontSize:12,color:subC,marginBottom:12}}>{L("Registra debiti e crediti, aggiorna il saldo con transazioni e riportali in patrimonio o nei movimenti.")}</div>
        {!debtBaseAllowed&&<div style={{fontSize:12,color:dark?"#ffd58a":"#856404",marginBottom:12,fontWeight:700}}>🚫 {L("Questa funzione non è disponibile con il piano attuale.")}</div>}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3, minmax(0, 1fr))",gap:10,marginTop:12}}>
          <div style={{background:dark?"#252535":"#F8FAFC",border:"1px solid "+borderC,borderRadius:14,padding:12}}>
            <div style={{fontSize:11,color:subC,fontWeight:800,textTransform:"uppercase"}}>{L("Totale Debiti")}</div>
            <div style={{fontSize:18,fontWeight:900,color:expenseColor}}>{fmt((debtCredits||[]).filter(function(x){return x.kind==="debt";}).reduce(function(a,x){return a+balance(x);},0))}</div>
          </div>
          <div style={{background:dark?"#252535":"#F8FAFC",border:"1px solid "+borderC,borderRadius:14,padding:12}}>
            <div style={{fontSize:11,color:subC,fontWeight:800,textTransform:"uppercase"}}>{L("Totale Crediti")}</div>
            <div style={{fontSize:18,fontWeight:900,color:incomeColor}}>{fmt((debtCredits||[]).filter(function(x){return x.kind==="credit";}).reduce(function(a,x){return a+balance(x);},0))}</div>
          </div>
          <button onClick={function(){resetForm();setShowDebtForm(true);}} disabled={!debtBaseAllowed} style={{background:debtBaseAllowed?confirmButtonColor:"#ccc",color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px 14px",fontWeight:900,cursor:debtBaseAllowed?"pointer":"not-allowed"}}>＋ {L("Aggiungi Debito o Credito")}</button>
        </div>
        {(showDebtForm||editingId)&&<div style={{position:"fixed",inset:0,zIndex:9999,background:dark?"#12121d":"#F6F7FB",padding:isMobile?12:24,boxSizing:"border-box",overflowY:"auto"}}>
          <div style={{maxWidth:760,margin:"0 auto",background:cardBg,border:"1px solid "+borderC,borderRadius:20,padding:isMobile?14:18,boxShadow:dark?"none":"0 18px 48px rgba(15,23,42,.18)"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:14}}>
              <div style={{fontSize:19,fontWeight:950,color:textC}}>{L(editingId?"Salva modifica":"Aggiungi Debito o Credito")}</div>
              <PopupCloseButton onClick={resetForm} dark={dark} label={L("Chiudi")} />
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"150px 1fr 130px 150px",gap:10}}>
              {field("Tipo",<select value={kind} onChange={function(e){setKind(e.target.value);}} style={sinp}><option value="debt">{L("Debito")}</option><option value="credit">{L("Credito")}</option></select>)}
              {field("Titolare",<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr auto",gap:8}}><input value={holder} onChange={function(e){setHolder(e.target.value);setDebtCounterparty(null);}} placeholder={L("Nome titolare")} style={sinp}/><button type="button" onClick={pickContact} disabled={debtContactBusy} title={L("Cerca nella rubrica")} style={{border:"1px solid "+secondaryButtonColor,background:secondaryButtonColor,color:"#fff",borderRadius:btnRadius,padding:"10px 13px",fontSize:12,fontWeight:900,cursor:debtContactBusy?"not-allowed":"pointer",whiteSpace:"nowrap",opacity:debtContactBusy?0.75:1,boxShadow:dark?"none":"0 3px 10px rgba(0,0,0,0.10)"}}>{debtContactBusy?"...":L("Da Rubrica")}</button></div>)}
              {field("Cerca utente",<div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:8}}><input value={debtUsername} onChange={function(e){setDebtUsername(e.target.value);setDebtCounterparty(null);}} onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();searchDebtUsername();}}} placeholder={L("@username")} autoCapitalize="none" autoCorrect="off" style={sinp}/><button type="button" onClick={searchDebtUsername} disabled={debtUsernameBusy} style={{border:"1px solid "+secondaryButtonColor,background:dark?"#252535":"#fff",color:secondaryButtonColor,borderRadius:btnRadius,padding:"10px 13px",fontSize:12,fontWeight:900,cursor:debtUsernameBusy?"not-allowed":"pointer",whiteSpace:"nowrap",opacity:debtUsernameBusy?0.7:1}}>{debtUsernameBusy?"...":L("Cerca")}</button></div>)}
              {field("Importo iniziale",<input value={amount} onChange={function(e){setAmount(e.target.value);}} placeholder={L("Importo")} inputMode="decimal" style={sinp}/>)}
              {field("Data inizio",<input type="date" value={startDate} onChange={function(e){setStartDate(e.target.value);}} style={sinp}/>)}
              {field("Data stimata fine",<input type="date" value={endDate} onChange={function(e){setEndDate(e.target.value);}} style={sinp}/>)}
              {field("Commento",<input value={note} onChange={function(e){setNote(e.target.value);}} placeholder={L("Commento")} style={sinp}/>)}
              <div style={{display:"flex",gap:8,alignItems:"flex-end",gridColumn:isMobile?"auto":"1 / -1"}}><button onClick={saveItem} disabled={!debtFormValid} style={{background:debtFormValid?confirmButtonColor:"#A8A8A8",color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px 14px",fontWeight:900,cursor:debtFormValid?"pointer":"not-allowed",width:"100%"}}>{L("Salva")}</button></div>
            </div>
          </div>
        </div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr",gap:12}}>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}>
          <div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Elenco Debiti / Crediti")}</div>
          {!(debtCredits||[]).length&&<div style={{fontSize:13,color:subC}}>{L("Nessun Debito / Credito inserito")}</div>}
          {(debtCredits||[]).map(function(item){var b=balance(item);var active=String(selectedId)===String(item.id);var extinct=b<=0;return <div key={item.id} onClick={function(){openItem(item);}} style={{border:"1px solid "+(active?confirmButtonColor:borderC),borderRadius:12,padding:10,marginBottom:8,background:extinct?(dark?"#202024":"#f2f2f2"):(active?(dark?"#252535":"#f7f5ff"):(dark?"#1e1e30":"#fff")),opacity:extinct?.62:1,cursor:"pointer"}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}><div style={{minWidth:0}}><div style={{fontSize:14,fontWeight:900,color:textC,wordBreak:"break-word"}}>{item.kind==="debt"?"📉":"📈"} {item.holder}</div><div style={{fontSize:12,color:subC}}>{L(item.kind==="debt"?"Debito":"Credito")} · {L("Saldo")}: {fmt(b)} {extinct&&<span style={{marginLeft:6,fontWeight:900,color:incomeColor}}>· {L("Estinto")}</span>}</div></div><div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={function(e){e.stopPropagation();editItem(item);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>✏️</button><button onClick={function(e){e.stopPropagation();deleteItem(item.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>🗑️</button></div></div></div>;})}
        </div>
        <div id="debtCreditDetailPanel" style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}>
          {!sel&&<div style={{fontSize:13,color:subC}}>{L("Seleziona un Debito / Credito per inserire transazioni.")}</div>}
          {sel&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:balance(sel)<=0?(dark?"#202024":"#f2f2f2"):(dark?"#252535":"#F8FAFC"),border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><div style={{fontSize:16,fontWeight:900,color:textC}}>{sel.kind==="debt"?"📉":"📈"} {sel.holder}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L(sel.kind==="debt"?"Debito":"Credito")} · {L("Saldo attuale")}: <b style={{color:balance(sel)<=0?incomeColor:textC}}>{fmt(balance(sel))}</b> {balance(sel)<=0&&<b style={{color:incomeColor}}> · {L("Estinto")}</b>}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L("Data inizio")}: {sel.startDate||"-"} · {L("Fine stimata")}: {sel.estimatedEndDate||"-"}</div>{sel.note&&<div style={{fontSize:12,color:subC,marginTop:4}}>{sel.note}</div>}</div><div style={{display:"flex",gap:6,flexShrink:0}}><button onClick={function(){editItem(sel);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>✏️</button><button onClick={function(){setSelectedId(null);setShowTxForm(false);}} style={{border:"none",background:dark?"#333":"#f0f0f0",color:textC,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>×</button></div></div></div>
            <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{balance(sel)>0&&<button onClick={function(){setShowTxForm(function(v){return !v;});}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>＋ {L("Aggiungi transazione")}</button>}{balance(sel)>0&&<button onClick={function(){closeItem(sel);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>✅ {L(sel.kind==="debt"?"Chiudi Debito":"Chiudi Credito")}</button>}{showDebtCreditsInPatrimonio&&<button onClick={function(){reportPatrimonio(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💎 {L("Riporta nel patrimonio")}</button>}{showDebtCreditsInExpenses&&<button onClick={function(){reportMovement(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💸 {L("Riporta nei movimenti")}</button>}</div>
            {balance(sel)>0&&showTxForm&&<div style={{background:dark?"#1f2333":"#FAFBFF",border:"1px solid "+borderC,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 120px 140px",gap:8}}>
              {field("Tipo transazione",<select value={txType} onChange={function(e){setTxType(e.target.value);}} style={sinp}><option value="reduction">{L(sel.kind==="debt"?"Riduzione del Debito":"Riduzione del Credito")}</option><option value="increase">{L(sel.kind==="debt"?"Aumento del debito":"Aumento del Credito")}</option></select>)}
              {field("Importo",<input value={txAmount} onChange={function(e){setTxAmount(e.target.value);}} inputMode="decimal" placeholder={L("Importo")} style={sinp}/>)}
              {field("Data transazione",<input type="date" value={txDate} onChange={function(e){setTxDate(e.target.value);}} style={sinp}/>)}
              {field("Data inizio",<input type="date" value={txStart} onChange={function(e){setTxStart(e.target.value);}} style={sinp}/>)}
              {field("Data stimata fine",<input type="date" value={txEnd} onChange={function(e){setTxEnd(e.target.value);}} style={sinp}/>)}
              {field("Commento",<input value={txNote} onChange={function(e){setTxNote(e.target.value);}} placeholder={L("Commento")} style={sinp}/>)}
              <button onClick={saveTx} disabled={!debtTxFormValid} style={{background:debtTxFormValid?confirmButtonColor:"#A8A8A8",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:debtTxFormValid?"pointer":"not-allowed"}}>＋ {L("Aggiungi transazione")}</button>
            </div>}
            <div>{(sel.transactions||[]).map(function(tx){return <div key={tx.id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid "+borderC,borderRadius:10,padding:"8px 10px",marginBottom:6,background:dark?"#252535":"#fff"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:900,color:tx.action==="increase"?expenseColor:incomeColor}}>{tx.action==="increase"?"＋":"−"} {fmt(tx.amount)} · {tx.date||""}</div><div style={{fontSize:11,color:subC}}>{L("Inizio")}: {tx.startDate||"-"} · {L("Fine stimata")}: {tx.estimatedEndDate||"-"}{tx.note?" · "+tx.note:""}</div></div><button onClick={function(){deleteTx(sel.id,tx.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>🗑️</button></div>;})}{!(sel.transactions||[]).length&&<div style={{fontSize:13,color:subC}}>{L("Nessuna transazione inserita")}</div>}</div>
          </div>}
        </div>
      </div>
    </div>;
  }
