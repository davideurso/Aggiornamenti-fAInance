import { cashFlowText, transferText } from '../i18n/cashFlowTranslations';
import {savePatrimonyEntryAmount,validPatrimonyAmount} from '../finance/patrimonyEntrySave.js';
import {PatrimonyTransferDialog} from './PatrimonyTransferDialog';
import {secondarySettingsStyle, settingsActionStyle} from '../ui/SettingsControls';
import {patrimonySnapshotValue} from '../finance/patrimonyMerge.js';
import { readableDarkText } from '../ui/textContrast';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp, DEFAULT_PATRIMONIO_AREAS, DEFAULT_PATRIMONIO_ENTRIES, parseMoney, smallDecimalNode } from '../core';
import { Btn, EmojiPicker, PopupCloseButton, FainancePickerModal, FainanceInfoPopover } from '../widget';
import { L } from '../utils/translationFallback';
import { patrimonyLinkText } from '../i18n/patrimonyLinkTranslations';
import { CopyMonthWidget } from './CopyMonthWidget';

export function PatrimonioPanel(){
  var _c:any=useApp();
  const [showTransfer,setShowTransfer]=useState(false);
  const [deleteEntry,setDeleteEntry]=useState<any>(null);
  var {borderC,btnRadius,cardBg,confirmButtonColor,consumePlanFeature,curMonthKey,curYear,dark,featureUsageKey,fmt,fmtSec,isMobile,lang,sym,monthFullName,monthShortName,now,patrimonioAreas,patrimonioEntries,patrimonioAutomatic,patrimonioHistory,patrimonioMode,patrimonioNotes,patrimonioValues,planCount,rewardedFeatureGateState,secRate,setMobileMenu,setPatrimonioEntries,setPatrimonioHistory,setPatrimonioNotes,setPatrimonioValues,setTab,setToast,settingAllowed,showRewardedAdForExtraMovement,showSecInPatrimonio,showPatrimonioDecimals,subC,successToastForFeature,textC,translateUiRuntimeText,unlockRewardedFeature,userKey}:any=_c;

    var allPatrimonioAreas=patrimonioAreas||DEFAULT_PATRIMONIO_AREAS;
    var allPatrimonioEntries=patrimonioEntries||DEFAULT_PATRIMONIO_ENTRIES;
    var pHistory=patrimonioHistory||{};
    var pNotes=patrimonioNotes||{};
    function snapshotEntryValue(snap,entry){
      if(!snap||typeof snap!=="object"||!entry)return{found:false,value:undefined};
      var keys=[entry.id,String(entry.id),entry.name,String(entry.name||"")];
      for(var i=0;i<keys.length;i++){var k=keys[i];if(k&&Object.prototype.hasOwnProperty.call(snap,k))return{found:true,value:snap[k]};}
      var nested=[snap.values,snap.entries];
      for(var n=0;n<nested.length;n++){var obj=nested[n];if(!obj||typeof obj!=="object")continue;for(var j=0;j<keys.length;j++){var nk=keys[j];if(nk&&Object.prototype.hasOwnProperty.call(obj,nk))return{found:true,value:obj[nk]};}}
      return{found:false,value:undefined};
    }
    function snapshotHasEntryData(snap,entry){
      if(!snap||!entry)return false;
      var counts=snap._entryTransactionCounts;
      if(counts&&typeof counts==="object"&&Number(counts[String(entry.id)]||0)>0)return true;
      var hit=snapshotEntryValue(snap,entry);
      if(!hit.found||hit.value===undefined||hit.value===null||String(hit.value).trim()==="")return false;
      // FIX 2.0.3 — parsing coerente: decide se la voce ha un valore non nullo.
      var numeric=parseMoney(hit.value);
      return Number.isFinite(numeric)?numeric!==0:true;
    }
    var patrimonioLastDataMonthByEntry={};
    Object.keys(pHistory).sort().forEach(function(mk){var snap=pHistory[mk];allPatrimonioEntries.forEach(function(entry){if(entry&&snapshotHasEntryData(snap,entry))patrimonioLastDataMonthByEntry[String(entry.id)]=mk;});});
    function patrimonioEntryVisibleInMonth(entry,mk){if(!entry||entry.deleted)return false;if(!entry.archived)return true;var last=patrimonioLastDataMonthByEntry[String(entry.id)]||"";return !!last&&String(mk)<=String(last);}
    function patrimonioEntriesForMonth(mk){return allPatrimonioEntries.filter(function(entry){return patrimonioEntryVisibleInMonth(entry,mk);});}
    function patrimonioAreasForEntries(entriesForMonth){return allPatrimonioAreas.filter(function(area){if(!area||area.deleted)return false;return (entriesForMonth||[]).some(function(entry){return String(entry.areaId)===String(area.id);});});}
    var patrimonioEntryAllowed=settingAllowed("base");
    function lockedPatrimonioEntry(){setToast({text:L("Aggiungi voce patrimonio disponibile dal piano Base."),type:"warning",color:"#EF9F27",icon:"⚠️"});}
    var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:readableDarkText(dark?"#eee":"#333", dark, dark?"#2a2a3e":"#fff")};
    function fmtWhole(value){var n=Math.round(Math.abs(Number(value)||0));try{return String(sym||"€")+" "+new Intl.NumberFormat(lang||"it-IT",{minimumFractionDigits:0,maximumFractionDigits:0}).format(n);}catch(e){return (fmt?String(fmt(n)):String(n)).replace(/([.,]\d{1,2})$/,"").trim();}}
    function PatrimonioAmount({value,forcePlus=false}){
      var n=Number(value)||0;
      if(!showPatrimonioDecimals)return <span aria-label={n<0?fmt(n):undefined}>{forcePlus&&n>0?"+":""}{fmtWhole(n)}</span>;
      try{
        var parts=new Intl.NumberFormat(lang||"it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}).formatToParts(Math.abs(n));
        var whole=parts.filter(function(part){return part.type!=="decimal"&&part.type!=="fraction";}).map(function(part){return part.value;}).join("");
        var decimals=parts.filter(function(part){return part.type==="decimal"||part.type==="fraction";}).map(function(part){return part.value;}).join("");
        return <span aria-label={n<0?fmt(n):undefined} style={{whiteSpace:"nowrap"}}>{forcePlus&&n>0?"+":""}{String(sym||"€")+" "+whole}<span style={{fontSize:"0.72em",fontWeight:"inherit"}}>{decimals}</span></span>;
      }catch(e){
        var fixed=Math.abs(n).toFixed(2).split(".");
        return <span aria-label={n<0?fmt(n):undefined} style={{whiteSpace:"nowrap"}}>{forcePlus&&n>0?"+":""}{String(sym||"€")+" "+fixed[0]}<span style={{fontSize:"0.72em",fontWeight:"inherit"}}>{"."+fixed[1]}</span></span>;
      }
    }

    // Tab principale
    var [patTab,setPatTab]=useState("inserimento"); // "inserimento" | "storico"

    // ── INSERIMENTO: mese selezionato ─────────────────────────────────────────
    function readPatrimonioSelectedMonth(){try{var v=localStorage.getItem(userKey("patrimonio_selected_month_v1"));if(v&&/^\d{4}-\d{2}$/.test(v))return v;}catch(e){}return curMonthKey;}
    function rememberPatrimonioSelectedMonth(y,m){try{localStorage.setItem(userKey("patrimonio_selected_month_v1"),y+"-"+String(m).padStart(2,"0"));}catch(e){}}
    var initialPatMonth=readPatrimonioSelectedMonth();
    var [selYear,setSelYear]=useState(function(){return Number(initialPatMonth.slice(0,4))||curYear;});
    var [selMonth,setSelMonth]=useState(function(){return Number(initialPatMonth.slice(5,7))||now.getMonth()+1;}); // 1-12
    var selMonthKey=selYear+"-"+String(selMonth).padStart(2,"0");
    var pEntries=patrimonioEntriesForMonth(selMonthKey);
    var pAreas=patrimonioAreasForEntries(pEntries);
    var isCurrentMonth=selMonthKey===curMonthKey;
    useEffect(function(){rememberPatrimonioSelectedMonth(selYear,selMonth);},[selYear,selMonth]);

    // Valori editabili per il mese selezionato
    var existingSnap=pHistory[selMonthKey]||null;
    var [manualDraft,setDraft]=useState({});
    var [editingId,setEditingId]=useState(null);
    function savedEntryDraft(entry){
      const hit=snapshotEntryValue(pHistory[selMonthKey],entry);
      if(hit.found)return hit.value==null||String(hit.value).trim()===""?"":String(parseMoney(hit.value));
      return isCurrentMonth&&Object.prototype.hasOwnProperty.call(patrimonioValues||{},entry.id)?String(patrimonioValues[entry.id]??""):"";
    }
    // Read synchronized values on every render. Only the field being edited
    // owns a temporary draft; remote changes to this month remain visible.
    var draft={};
    pEntries.forEach(function(entry){draft[entry.id]=editingId===entry.id&&Object.prototype.hasOwnProperty.call(manualDraft,entry.id)?manualDraft[entry.id]:savedEntryDraft(entry);});
    if(isCurrentMonth)pEntries.forEach(function(entry){var detail=patrimonioAutomatic?.details?.[String(entry.id)];if(detail&&!detail.blocked)draft[entry.id]=String(detail.amount);});
    var hasCurrentAutomatic=isCurrentMonth&&pEntries.some(function(entry){var detail=patrimonioAutomatic?.details?.[String(entry.id)];return detail&&!detail.blocked;});
    var prevSelKey=useRef(selMonthKey);
    useEffect(function(){if(prevSelKey.current===selMonthKey)return;prevSelKey.current=selMonthKey;setDraft({});setEditingId(null);},[selMonthKey]);
    function beginEntryEdit(entry){
      if(_c.firestoreReady===false){setToast({text:L("Attendi il caricamento dei dati prima di modificare i collegamenti."),type:"warning"});return;}
      setDraft(function(previous){return {...previous,[entry.id]:savedEntryDraft(entry)};});setEditingId(entry.id);
    }
    function autoSavePatrimonyEntry(entry,value){
      if(!validPatrimonyAmount(value))return false;
      if(_c.firestoreReady===false)return false;
      try{
        const args={entryId:entry.id,month:selMonthKey,value};
        const next=savePatrimonyEntryAmount(_c,args);
        if(!next.changed)return true;
        if(isCurrentMonth)setPatrimonioValues(function(previous){return {...previous,[entry.id]:next.amount};});
        setPatrimonioHistory(function(previous){return savePatrimonyEntryAmount({..._c,patrimonioHistory:previous},args).patrimonioHistory;});
        return true;
      }catch(e){setToast({text:L("Importo non salvato. Controlla il valore e riprova."),type:"error"});return false;}
    }
    function finishEntryEdit(entry){
      const value=manualDraft[entry.id];
      if(validPatrimonyAmount(value)&&!autoSavePatrimonyEntry(entry,value))return;
      setDraft(function(previous){const next={...previous};delete next[entry.id];return next;});setEditingId(null);
    }

    var [addingEntry,setAddingEntry]=useState(null);
    var [newEntryName,setNewEntryName]=useState("");
    var [newEntryIcon,setNewEntryIcon]=useState("📦");
    var [noteEntryId,setNoteEntryId]=useState(null); // id voce di cui si stanno editando le note
    var [noteDraft,setNoteDraft]=useState("");

    function openNote(eid){setNoteEntryId(eid);setNoteDraft(pNotes[eid]||"");}
    function saveNote(){setPatrimonioNotes(function(n){return{...n,[noteEntryId]:noteDraft};});setNoteEntryId(null);setToast({text:"Nota inserita",type:"success",color:"#1D9E75",icon:"✅"});}

    // Totale calcolato dal draft
    var draftTotal=pEntries.reduce(function(a,e){return a+(parseFloat(draft[e.id])||0);},0);

    // Mese precedente nello storico per calcolare delta
    var prevKey=useMemo(function(){
      var d=new Date(selYear,selMonth-2,1);
      return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");
    },[selYear,selMonth]);
    var prevSnap=pHistory[prevKey]||null;
    var prevTotal=prevSnap?(prevSnap._total||pEntries.reduce(function(a,e){return a+(parseFloat(prevSnap[e.id])||0);},0)):null;
    var totalDelta=prevTotal!==null?draftTotal-prevTotal:null;

    // Naviga mese
    function goMonth(dir){
      var m=selMonth+dir;var y=selYear;
      if(m>12){m=1;y++;}if(m<1){m=12;y--;}
      setSelMonth(m);setSelYear(y);rememberPatrimonioSelectedMonth(y,m);
    }

    function copyPatrimonioSnapshot(copyFromKey,rewardAlreadyGranted){
      if(hasCurrentAutomatic){setToast({text:patrimonyLinkText(lang,"manage"),type:"warning"});return;}
      var pg=rewardedFeatureGateState("patrimonioCopy",1);
      if(!rewardAlreadyGranted&&pg.state==="blocked"){setToast({text:pg.text,type:"error",color:"#E24B4A",icon:"🚫"});return;}
      if(!rewardAlreadyGranted&&pg.state==="ad"){
        showRewardedAdForExtraMovement(function(){
          if(unlockRewardedFeature("patrimonioCopy",1))copyPatrimonioSnapshot(copyFromKey,true);
        });
        return;
      }
      var keepY=selYear,keepM=selMonth;
      var histSnap=pHistory&&pHistory[copyFromKey]?pHistory[copyFromKey]:null;
      var liveSnap=(copyFromKey===curMonthKey)?(patrimonioValues||{}):null;
      var srcSnap: Record<string, any>={};
      if(histSnap&&typeof histSnap==="object")srcSnap={...srcSnap,...histSnap};
      if(liveSnap&&typeof liveSnap==="object")srcSnap={...srcSnap,...liveSnap};
      function readValue(entry){
        if(!entry)return undefined;
        var keys=[entry.id,String(entry.id),entry.name,String(entry.name||"")];
        for(var i=0;i<keys.length;i++){var k=keys[i];if(k&&srcSnap[k]!==undefined)return srcSnap[k];}
        if(srcSnap.values){for(var j=0;j<keys.length;j++){var kv=keys[j];if(kv&&srcSnap.values[kv]!==undefined)return srcSnap.values[kv];}}
        if(srcSnap.entries){for(var z=0;z<keys.length;z++){var ke=keys[z];if(ke&&srcSnap.entries[ke]!==undefined)return srcSnap.entries[ke];}}
        return undefined;
      }
      var sourceKeys=Object.keys(srcSnap||{}).filter(function(k){return k.indexOf("_")!==0&&k!=="values"&&k!=="entries";});
      var hasValues=pEntries.some(function(e){var raw=readValue(e);return raw!==undefined&&raw!==null&&String(raw)!=="";}) || sourceKeys.some(function(k){var raw=srcSnap[k];return raw!==undefined&&raw!==null&&String(raw)!=="";});
      if(!hasValues){setToast({text:"Nessun valore disponibile per il mese selezionato",type:"error",color:"#E24B4A",icon:"🚫"});return;}
      var nd={};
      var copiedSnap: Record<string, any>={};
      // FIX 2.0.3 — gli snapshot salvati possono contenere stringhe con virgola: "1.500,00"
      // veniva letto come 1,50 sia nel valore singolo sia nel totale.
      pEntries.forEach(function(e){var raw=readValue(e);var val=raw!==undefined&&raw!==null?String(raw):"";nd[e.id]=val;copiedSnap[e.id]=parseMoney(val);});
      copiedSnap._total=pEntries.reduce(function(a,e){return a+parseMoney(nd[e.id]);},0);
      copiedSnap._entryTransactionCounts={};
      pEntries.forEach(function(e){if(String(nd[e.id]||"").trim()!=="")copiedSnap._entryTransactionCounts[String(e.id)]=1;});
      copiedSnap._transactionCount=Object.keys(copiedSnap._entryTransactionCounts).reduce(function(a,k){return a+Number(copiedSnap._entryTransactionCounts[k]||0);},0);
      copiedSnap._savedAt=new Date().toISOString();
      copiedSnap._confirmedEntries=Object.fromEntries(pEntries.filter(entry=>Object.prototype.hasOwnProperty.call(copiedSnap,entry.id)).map(entry=>[entry.id,true]));
      setDraft(nd);
      setPatrimonioHistory(function(h){return {...(h||{}),[keepY+"-"+String(keepM).padStart(2,"0")]:copiedSnap};});
      if((keepY+"-"+String(keepM).padStart(2,"0"))===curMonthKey){var liveVals={};pEntries.forEach(function(e){liveVals[e.id]=copiedSnap[e.id]||0;});setPatrimonioValues(liveVals);}
      setSelYear(keepY);setSelMonth(keepM);rememberPatrimonioSelectedMonth(keepY,keepM);
      consumePlanFeature("patrimonioCopy",1);
      var usedAfterCopy=planCount(featureUsageKey("patrimonioCopy"))+1;
      setToast(successToastForFeature("patrimonioCopy","Valori copiati da "+monthShortName(parseInt(copyFromKey.split("-")[1])-1)+" "+copyFromKey.slice(0,4),usedAfterCopy));
    }

    // Salva snapshot per il mese selezionato
    // Elimina snapshot mese
    function delMonthSnap(mk){
      setPatrimonioHistory(function(h){var q={...h};delete q[mk];return q;});
      setToast("Snapshot eliminato");
    }

    var patrimonioEntryFormValid=patrimonioEntryAllowed&&!!String(newEntryName||"").trim();
    function addEntry(areaId){if(!patrimonioEntryFormValid)return;var nid="entry_"+Date.now();var area=(pAreas||[]).find(function(a){return String(a.id)===String(areaId);})||pAreas[0]||{};var nowIso=new Date().toISOString();setPatrimonioEntries(function(p){return [...(p||[]),{id:nid,name:newEntryName.trim(),icon:newEntryIcon,color:area.color||"#B4B2A9",areaId:areaId||area.id||"altro",custom:true,userCreated:true,createdAt:nowIso,updatedAt:nowIso}];});setDraft(function(d){return{...d,[nid]:""}});setNewEntryName("");setNewEntryIcon("📦");setAddingEntry(null);}
    function delEntry(entry){
      if(!entry||_c.firestoreReady===false)return;
      const stamp=new Date().toISOString(),id=String(entry.id);
      const keys=allPatrimonioEntries.some(e=>!e.deleted&&String(e.id)!==id&&e.name===entry.name)?[id]:[id,entry.name].filter(Boolean);
      function remove(obj){const next={...(obj||{})};for(const key of keys)delete next[key];return next;}
      setPatrimonioValues(remove);
      setPatrimonioNotes(remove);
      setPatrimonioHistory(history=>Object.fromEntries(Object.entries(history||{}).map(([key,snapshot]:any)=>{
        const next=remove(snapshot);
        for(const field of ['values','entries','_automatic','_entryTransactionCounts','_confirmedEntries','_entryConfirmedAt','_postClosingBase'])if(snapshot?.[field])next[field]=remove(snapshot[field]);
        if(typeof snapshot?._total==="number"){
          const hit=patrimonySnapshotValue(snapshot,{...entry,name:keys.length>1?entry.name:""});
          if(hit.found)next._total=Math.round((snapshot._total-hit.value)*100)/100;
        }
        return [key,next];
      })));
      setPatrimonioEntries(rows=>rows.map(e=>{
        if(String(e.id)!==id)return e;
        const {balanceLink,...rest}=e;
        return {...rest,archived:true,deleted:true,userDeleted:true,custom:true,deletedAt:stamp,updatedAt:stamp};
      }));
      setDraft(remove);setDeleteEntry(null);
    }


    // ── STORICO ────────────────────────────────────────────────────────────────
    var [histViewYear,setHistViewYear]=useState(String(curYear));
    var histMonths=useMemo(function(){
      var keys=Object.keys(pHistory).sort();
      return keys.map(function(mk,i){
        var snap=pHistory[mk];
        var prev=i>0?pHistory[keys[i-1]]:null;
        var monthEntries=patrimonioEntriesForMonth(mk);
        var prevEntries=i>0?patrimonioEntriesForMonth(keys[i-1]):[];
        var total=snap._total||monthEntries.reduce(function(a,e){return a+(parseFloat(snap[e.id])||0);},0);
        var prevT=prev?(prev._total||prevEntries.reduce(function(a,e){return a+(parseFloat(prev[e.id])||0);},0)):null;
        return{mk:mk,snap:snap,total:total,delta:prevT!==null?total-prevT:null};
      }).reverse();
    },[pHistory,allPatrimonioEntries]);
    var histYears=useMemo(function(){var ys=new Set(histMonths.map(function(m){return m.mk.slice(0,4);}));return Array.from(ys).sort(function(a,b){return b-a;});},[histMonths]);
    var filteredHist=histMonths.filter(function(m){return m.mk.startsWith(histViewYear);});
    var filteredHistoryEntryIds={};
    filteredHist.forEach(function(m){patrimonioEntriesForMonth(m.mk).forEach(function(entry){filteredHistoryEntryIds[String(entry.id)]=true;});});
    var historyEntries=allPatrimonioEntries.filter(function(entry){return entry&&!entry.deleted&&filteredHistoryEntryIds[String(entry.id)];});
    var historyAreas=patrimonioAreasForEntries(historyEntries);

    function openPatrimonioStatistics(){
      try{localStorage.setItem(userKey("stats_tab_v1"),JSON.stringify("patrimonio"));}catch(e){}
      try{if(typeof window!=="undefined")window.dispatchEvent(new CustomEvent("fainance-open-stats-tab",{detail:"patrimonio"}));}catch(e){}
      setTab("stats");setMobileMenu(false);
    }

    return <>{showTransfer&&<PatrimonyTransferDialog onClose={()=>setShowTransfer(false)}/ >}{deleteEntry&&<FainancePickerModal open title={cashFlowText(lang,"deleteEntry")} onClose={()=>setDeleteEntry(null)}
        footer={<div style={{display:"flex",justifyContent:"flex-end",gap:8}}><Btn style={secondarySettingsStyle(_c)} onClick={()=>setDeleteEntry(null)}>{L("Annulla")}</Btn><Btn bg="#B63B45" onClick={()=>delEntry(deleteEntry)}>{L("Elimina")}</Btn></div>}>
        <strong>{deleteEntry.name}</strong><p>{cashFlowText(lang,"deleteEntryWarning")}</p>
      </FainancePickerModal>}<div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Note modal */}
      {noteEntryId&&(function(){
        var entry=pEntries.find(function(e){return e.id===noteEntryId;});
        return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"17vh 16px 3vh",boxSizing:"border-box",overflowY:"auto"}} onClick={function(e){if(e.target===e.currentTarget){saveNote();}}}>
          <div style={{background:dark?"#1e1e30":"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:440,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:15.5,fontWeight:600,color:textC}}>{entry?entry.icon+" "+entry.name:"Nota"}</div>
              <PopupCloseButton onClick={function(){saveNote();}} dark={dark} label={L("Chiudi")} />
            </div>
            <textarea value={noteDraft} onChange={function(e){setNoteDraft(e.target.value);}} placeholder={L("Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)")} style={{...sinp,height:120,resize:"vertical",lineHeight:1.5}} autoFocus/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn onClick={saveNote} bg="#7F77DD" style={{flex:1,padding:"10px",fontWeight:600}}>{"💾 "+L("Salva nota")}</Btn>
              <Btn onClick={function(){setNoteEntryId(null);}} style={{...secondarySettingsStyle(_c),padding:"10px 14px"}}>{L("Annulla")}</Btn>
            </div>
            {pNotes[noteEntryId]&&<button onClick={function(){if(!window.confirm(L("Eliminare questa nota?")))return;setPatrimonioNotes(function(n){var q={...n};delete q[noteEntryId];return q;});setNoteEntryId(null);setToast(L("Nota eliminata"));}} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",color:readableDarkText("#aaa", dark, "none"),fontSize:12,width:"100%"}}>{"🗑 "+L("Elimina nota")}</button>}
          </div>
        </div>;
      })()}

      {/* ── Header Patrimonio: il totale resta nella scheda del mese selezionato ── */}
      <div style={{background:"linear-gradient(135deg,#378ADD22,#9F77DD22)",borderRadius:14,border:"1px solid "+(dark?"#444":"#ddd"),padding:isMobile?16:18,display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"space-between",gap:14,flexDirection:isMobile?"column":"row"}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:20,fontWeight:850,color:textC,display:"flex",alignItems:"center",gap:8}}>💎 {L("Patrimonio")}</div>
          <div style={{fontSize:12,color:subC,marginTop:5,lineHeight:1.45}}>{L("Gestisci i valori mensili, confronta i mesi e consulta lo storico.")}</div>
          <div style={{fontSize:11,color:subC,marginTop:5}}>{L("Modalità")}: {L(patrimonioMode==="manuale"?"Manuale":"Semi-automatica")}</div>
        </div>
        <button type="button" onClick={openPatrimonioStatistics} style={{background:confirmButtonColor||"#7F77DD",color:readableDarkText("#fff", dark, confirmButtonColor||"#7F77DD"),border:"none",borderRadius:btnRadius,padding:"10px 14px",fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",alignSelf:isMobile?"stretch":"center"}}>📊 {L("Statistiche Patrimonio")}</button>
      </div>

      {/* ── Tab ── */}
      <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}>
        <button onClick={function(){setPatTab("inserimento");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:patTab==="inserimento"?(dark?"#444":"#fff"):"transparent",color:readableDarkText(patTab==="inserimento"?textC:subC, dark, patTab==="inserimento"?(dark?"#444":"#fff"):"transparent"),fontSize:14,cursor:"pointer",fontWeight:patTab==="inserimento"?500:400}}>✏️ {L("Inserimento")}</button>
        <button onClick={function(){setPatTab("storico");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:patTab==="storico"?(dark?"#444":"#fff"):"transparent",color:readableDarkText(patTab==="storico"?textC:subC, dark, patTab==="storico"?(dark?"#444":"#fff"):"transparent"),fontSize:14,cursor:"pointer",fontWeight:patTab==="storico"?500:400}}>
          📅 {L("Storico")} {histMonths.length>0&&<span style={{fontSize:11,background:"#7F77DD",color:readableDarkText("#fff", dark, "#7F77DD"),borderRadius:10,padding:"1px 6px",marginLeft:4}}>{histMonths.length}</span>}
        </button>
      </div>

      {/* ══════════════════════ TAB INSERIMENTO ══════════════════════ */}
      {patTab==="inserimento"&&<>

        {/* Selettore mese */}
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={function(){goMonth(-1);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:readableDarkText(subC, dark, "none"),padding:"4px 8px",borderRadius:8}}>‹</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:textC}}>{monthFullName(selMonth-1)} {selYear}</div>
          </div>
          <button onClick={function(){goMonth(1);}} disabled={selMonthKey>=curMonthKey} style={{background:"none",border:"none",cursor:selMonthKey>=curMonthKey?"not-allowed":"pointer",fontSize:20,color:readableDarkText(selMonthKey>=curMonthKey?"#ccc":subC, dark, "none"),padding:"4px 8px",borderRadius:8}}>›</button>
        </div>

        {/* Totale mese selezionato + delta */}
        <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,auto)",gap:8,alignItems:"center",padding:"12px 13px",background:dark?"#10243A":"#F7F9FC",borderRadius:14,border:"1px solid "+borderC}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:12,fontWeight:750,color:subC}}>{L("Totale")} {monthFullName(selMonth-1)} {selYear}</div>
            <div style={{fontSize:isMobile?20:26,fontWeight:900,color:readableDarkText(draftTotal>=0?"#1D9E75":"#E24B4A", dark, dark?"#252535":"#f9f9f9"),lineHeight:1.1,wordBreak:"break-word"}}><PatrimonioAmount value={draftTotal}/></div>
            {secRate&&showSecInPatrimonio&&fmtSec(Math.abs(draftTotal))&&<div style={{fontSize:12,color:subC,fontWeight:500,marginTop:2}}>{smallDecimalNode(fmtSec(Math.abs(draftTotal)), lang)}</div>}
            {totalDelta!==null&&<div style={{fontSize:13,fontWeight:800,color:readableDarkText(totalDelta>=0?"#1D9E75":"#E24B4A", dark, dark?"#252535":"#f9f9f9"),marginTop:5}}>{L("vs")} {monthFullName(parseInt(prevKey.split("-")[1])-1)}: <PatrimonioAmount value={totalDelta} forcePlus/></div>}
          </div>
          <Btn style={{minHeight:38,maxWidth:isMobile?112:180,padding:isMobile?"8px":"9px 14px",whiteSpace:"normal"}} onClick={()=>setShowTransfer(true)}>{transferText(lang,"title")}</Btn>
        </div>

        {/* Copia da altro mese */}
        {!hasCurrentAutomatic&&<CopyMonthWidget
          pHistory={(function(){var h={...(pHistory||{})};var hasLive=pEntries.some(function(e){var v=(patrimonioValues||{})[e.id];return v!==undefined&&v!==null&&String(v)!==""&&Number(v)!==0;});if(hasLive){h[curMonthKey]={...(h[curMonthKey]||{}),...(patrimonioValues||{})};}return h;})()}
          pEntries={pEntries}
          selMonthKey={selMonthKey}
          setDraft={setDraft}
          setToast={setToast}
          dark={dark}
          textC={textC}
          subC={subC}
          borderC={borderC}
          sinp={sinp}
          btnRadius={btnRadius}
          onCopyMonth={copyPatrimonioSnapshot}
        />}

        {/* Aree e voci */}
        {pAreas.map(function(area){
          var aEntries=pEntries.filter(function(e){return e.areaId===area.id;});
          var aTotal=aEntries.reduce(function(a,e){return a+(parseFloat(draft[e.id])||0);},0);
          var aPrevTotal=prevSnap?aEntries.reduce(function(a,e){return a+(parseFloat(prevSnap[e.id])||0);},0):null;
          var aDelta=aPrevTotal!==null?aTotal-aPrevTotal:null;
          return <div key={area.id} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:isMobile?11:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:isMobile?9:12,gap:isMobile?7:10,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                <span style={{fontSize:20}}>{area.icon}</span>
                <span style={{fontSize:15.5,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{L(area.name)}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15.8,fontWeight:600,color:readableDarkText(aTotal>=0?"#1D9E75":"#E24B4A", dark, cardBg)}}><PatrimonioAmount value={aTotal}/></div>
                {aDelta!==null&&aDelta!==0&&<div style={{fontSize:11.5,color:readableDarkText(aDelta>0?"#1D9E75":"#E24B4A", dark, cardBg)}}><PatrimonioAmount value={aDelta} forcePlus/></div>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {aEntries.map(function(entry){
                var automaticDetail=isCurrentMonth&&patrimonioAutomatic?.details?.[String(entry.id)];
                var automatic=!!automaticDetail&&!automaticDetail.blocked;
                var rawVal=draft[entry.id]||"";
                var numVal=parseFloat(rawVal)||0;
                var previous=patrimonySnapshotValue(prevSnap,entry);
                var prevEntryVal=previous.found?previous.value:null;
                return <div key={entry.id} data-patrimony-entry={String(entry.id)}>
                  <div style={{display:"flex",alignItems:"center",gap:isMobile?5:8,padding:isMobile?"7px 6px":"8px 10px",background:dark?"#252535":"#f9f9f9",borderRadius:pNotes[entry.id]?"10px 10px 0 0":10,border:"1px solid "+(editingId===entry.id?"#7F77DD":(dark?"#333":"#f0f0f0")),minWidth:0,overflow:"hidden"}}>
                  <span style={{fontSize:isMobile?16.5:16,flexShrink:0}}>{entry.icon}</span>
                  <span style={{flex:"1 1 auto",minWidth:0,fontSize:isMobile?"clamp(13.1px,4.05vw,14.8px)":13,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(entry.name)}{automatic&&<small style={{display:"block",fontSize:10,color:subC}}>{patrimonyLinkText(lang,"automatic")}</small>}</span>
                  {editingId===entry.id&&!automatic
                    ?<div style={{display:"flex",gap:isMobile?4:6,alignItems:"center",flexShrink:0,minWidth:0}}>
                      <input type="number" value={rawVal} placeholder="0"
                        onChange={function(e){var v=e.target.value;setDraft(function(d){return{...d,[entry.id]:v};});autoSavePatrimonyEntry(entry,v);}}
                        onBlur={function(){finishEntryEdit(entry);}}
                        disabled={_c.firestoreReady===false}
                        aria-label={entry.name}
                        onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();e.currentTarget.blur();}}}
                        style={{...sinp,width:isMobile?"clamp(68px,24vw,92px)":110,padding:isMobile?"4px 5px":"4px 8px",fontSize:isMobile?13.6:13}} autoFocus/>

                    </div>
                    :<div style={{display:"flex",alignItems:"center",gap:isMobile?3:6,flexShrink:0,minWidth:0}}>
                      <strong style={{fontSize:isMobile?15:17,color:numVal<0?(dark?"#FF9AA3":"#B63B45"):numVal>0?(dark?"#79D5A8":"#18794E"):textC,whiteSpace:"nowrap"}}>{rawVal===""?"—":<PatrimonioAmount value={numVal}/>}</strong>
                      {prevEntryVal!==null&&<span style={{fontSize:isMobile?11:12,color:prevEntryVal<0?(dark?"#FFB6BD":"#A24C55"):prevEntryVal>0?(dark?"#A3DEBC":"#438063"):subC,whiteSpace:"nowrap"}}><PatrimonioAmount value={prevEntryVal}/></span>}
                      <FainanceInfoPopover label={cashFlowText(lang,"entryActions")} trigger="▾" size={30} popupWidth={220}
                        buttonStyle={{borderRadius:8,background:dark?"#334F74":"#EEF4FF",borderColor:dark?"#527198":"#BFD7FF",color:dark?"#fff":"#052A5F",boxShadow:"none"}}
                        body={<div style={{display:"grid",gap:6}}>
                          <button type="button" data-fainance-popover-action style={{...settingsActionStyle(_c,"edit"),color:"#052A5F"}} onClick={()=>{if(automatic){setToast({text:patrimonyLinkText(lang,"manage"),type:"info"});return;}beginEntryEdit(entry);}}>{L("Modifica")}</button>
                          <button type="button" data-fainance-popover-action style={{...settingsActionStyle(_c,"edit"),color:"#052A5F"}} onClick={()=>openNote(entry.id)}>{cashFlowText(lang,"addNote")}</button>
                          <button type="button" data-fainance-popover-action style={{...settingsActionStyle(_c,"delete"),color:"#8A2D36"}} onClick={()=>setDeleteEntry(entry)}>{cashFlowText(lang,"deleteEntry")}</button>
                        </div>}/>
                    </div>
                  }
                  </div>
                  {pNotes[entry.id]&&<div onClick={function(){openNote(entry.id);}} style={{padding:"6px 12px",background:dark?"#1e1e30":"#f5f4ff",border:"1px solid "+(dark?"#3a3a5a":"#c8c0f8"),borderTop:"none",borderRadius:"0 0 10px 10px",fontSize:11.5,color:readableDarkText(dark?"#aac":"#534AB7", dark, dark?"#1e1e30":"#f5f4ff"),cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {pNotes[entry.id]}</div>}
                </div>;
              })}
            </div>
            {false&&addingEntry===area.id&&null}
          </div>;
        })}
      </>}

      {/* ══════════════════════ TAB STORICO ══════════════════════ */}
      {patTab==="storico"&&<>
        {histMonths.length===0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:40,textAlign:"center",color:subC,fontSize:14}}>
          {L("Nessuno storico disponibile. Nella scheda Inserimento seleziona un mese e inserisci i valori: si salvano automaticamente.")}
        </div>}

        {histMonths.length>0&&<>
          {histYears.length>1&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {histYears.map(function(y){return <button key={y} onClick={function(){setHistViewYear(y);}} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(histViewYear===y?"#7F77DD":borderC),background:histViewYear===y?"#EEEDFE":(dark?"#252535":"#f5f5f5"),color:readableDarkText(histViewYear===y?"#534AB7":textC, dark, histViewYear===y?"#EEEDFE":(dark?"#252535":"#f5f5f5")),fontSize:13,cursor:"pointer",fontWeight:histViewYear===y?600:400}}>{y}</button>;})}
          </div>}

          {filteredHist.length>1&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:10}}>{L("Andamento patrimonio")} — {histViewYear}</div>
            {(function(){
              var pts=[...filteredHist].reverse();
              var vals=pts.map(function(m){return m.total;});
              var maxV=Math.max.apply(null,vals);var minV=Math.min.apply(null,vals);
              var range=maxV-minV;if(!range)range=maxV||1;
              var w=isMobile?300:500,h=100,pl=8,pr=8,pt2=8,pb=20;
              var cw=w-pl-pr,ch=h-pt2-pb;
              var coords=pts.map(function(m,i){return{x:pl+i*(cw/Math.max(pts.length-1,1)),y:pt2+ch-((m.total-minV)/range)*ch,mk:m.mk,total:m.total};});
              var linePath=coords.map(function(p,i){return(i===0?"M":"L")+p.x.toFixed(1)+" "+p.y.toFixed(1);}).join(" ");
              var areaPath=linePath+" L"+coords[coords.length-1].x+" "+(pt2+ch)+" L"+coords[0].x+" "+(pt2+ch)+" Z";
              var tc2=dark?"#888":"#bbb";
              return <svg width={w} height={h}>
                <defs><linearGradient id="patGrad2" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#7F77DD" stopOpacity="0.3"/><stop offset="100%" stopColor="#7F77DD" stopOpacity="0"/></linearGradient></defs>
                <path d={areaPath} fill="url(#patGrad2)"/>
                <path d={linePath} fill="none" stroke="#7F77DD" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
                      {coords.map(function(p,i){return <g key={i}><circle cx={p.x} cy={p.y} r={3} fill="#7F77DD"/><text x={p.x} y={h-5} textAnchor="middle" fontSize={8} fill={tc2}>{monthShortName(parseInt(p.mk.split("-")[1])-1)}</text></g>;})}
              </svg>;
            })()}
          </div>}

          <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{L("Dettaglio mensile")}</div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
                <thead><tr style={{background:dark?"#252535":"#f5f5f5"}}>
                  <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:subC}}>{translateUiRuntimeText("Mese")}</th>
                  <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>{L("Totale")}</th>
                  <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>Δ</th>
                  {historyAreas.slice(0,isMobile?2:4).map(function(a){return <th key={a.id} style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>{a.icon}</th>;})}
                  <th style={{padding:"7px 10px",textAlign:"center",fontWeight:600,color:subC}}></th>
                </tr></thead>
                <tbody>
                  {filteredHist.map(function(m){
                    var lbl=monthShortName(parseInt(m.mk.split("-")[1])-1)+" "+m.mk.slice(0,4);
                    return <tr key={m.mk} style={{borderBottom:"1px solid "+(dark?"#333":"#f0f0f0")}}>
                      <td style={{padding:"8px 10px",color:textC,fontWeight:500}}>
                        <button onClick={function(){setSelYear(parseInt(m.mk.slice(0,4)));setSelMonth(parseInt(m.mk.split("-")[1]));setPatTab("inserimento");}} style={{background:"none",border:"none",cursor:"pointer",color:readableDarkText("#7F77DD", dark, "none"),fontSize:12,fontWeight:600,padding:0,textDecoration:"underline"}}>{lbl}</button>
                      </td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:readableDarkText(m.total>=0?"#1D9E75":"#E24B4A", dark, "#35354a")}}><PatrimonioAmount value={m.total}/></td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:500,color:readableDarkText(m.delta===null?subC:m.delta>=0?"#1D9E75":"#E24B4A", dark, "#35354a")}}>{m.delta===null?"—":<PatrimonioAmount value={m.delta} forcePlus/>}</td>
                      {historyAreas.slice(0,isMobile?2:4).map(function(a){
                        var aEnts=patrimonioEntriesForMonth(m.mk).filter(function(e){return e.areaId===a.id;});
                        var aT=aEnts.reduce(function(acc,e){return acc+(parseFloat(m.snap[e.id])||0);},0);
                        return <td key={a.id} style={{padding:"8px 10px",textAlign:"right",color:aT<0?(dark?"#FF9AA3":"#B63B45"):subC,fontSize:11}}><PatrimonioAmount value={aT}/></td>;
                      })}
                      <td style={{padding:"8px 10px",textAlign:"center"}}>
                        <button onClick={function(){if(window.confirm(L("Eliminare snapshot ")+m.mk+"?")){delMonthSnap(m.mk);}}} style={{background:"none",border:"none",cursor:"pointer",color:readableDarkText("#ccc", dark, "none"),fontSize:13}}>×</button>
                      </td>
                    </tr>;
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {filteredHist.length>0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{L("Variazioni per voce")} — {monthShortName(parseInt(filteredHist[0].mk.split("-")[1])-1)} {L("vs mese precedente")}</div>
            {filteredHist[0].delta===null?<div style={{fontSize:12,color:subC}}>{translateUiRuntimeText("Nessun mese precedente nel registro.")}</div>:
            <div style={{display:"flex",flexDirection:"column",gap:6}}>
              {(filteredHist.length?patrimonioEntriesForMonth(filteredHist[0].mk):[]).map(function(entry){
                var cur=parseFloat(filteredHist[0].snap[entry.id])||0;
                var prev2=filteredHist.length>1?(parseFloat(filteredHist[1].snap[entry.id])||0):null;
                var d2=prev2!==null?cur-prev2:null;
                if(cur===0&&(d2===null||d2===0))return null;
                return <div key={entry.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:dark?"#252535":"#f9f9f9",borderRadius:8}}>
                  <span style={{fontSize:14,flexShrink:0}}>{entry.icon}</span>
                  <span style={{flex:1,fontSize:12,color:textC}}>{L(entry.name)}</span>
                  <span style={{fontSize:13,fontWeight:500,color:readableDarkText(cur>=0?"#1D9E75":"#E24B4A", dark, dark?"#252535":"#f9f9f9"),minWidth:70,textAlign:"right"}}><PatrimonioAmount value={cur}/></span>
                  {d2!==null&&<span style={{fontSize:11,fontWeight:500,color:readableDarkText(d2===0?subC:d2>0?"#1D9E75":"#E24B4A", dark, dark?"#252535":"#f9f9f9"),minWidth:60,textAlign:"right"}}>{d2===0?"—":<PatrimonioAmount value={d2} forcePlus/>}</span>}
                </div>;
              }).filter(Boolean)}
            </div>}
          </div>}
        </>}
      </>}
    </div></>;
  }
