import { useState, useEffect, useRef, useMemo } from 'react';
import { useApp, DEFAULT_PATRIMONIO_AREAS, DEFAULT_PATRIMONIO_ENTRIES } from '../core';
import { Btn, EmojiPicker, PopupCloseButton } from '../widget';
import { L } from '../utils/translationFallback';
import { CopyMonthWidget } from './CopyMonthWidget';

export function PatrimonioPanel(){
  var _c:any=useApp();
  var {borderC,btnRadius,cardBg,confirmButtonColor,consumePlanFeature,curMonthKey,curYear,dark,featureUsageKey,fmt,fmtSec,isMobile,monthFullName,monthShortName,now,patrimonioAreas,patrimonioEntries,patrimonioHistory,patrimonioMode,patrimonioNotes,patrimonioValues,planCount,rewardedFeatureGateState,secRate,setMobileMenu,setPatrimonioEntries,setPatrimonioHistory,setPatrimonioNotes,setPatrimonioValues,setTab,setToast,settingAllowed,showRewardedAdForExtraMovement,showSecInPatrimonio,subC,successToastForFeature,textC,translateUiRuntimeText,unlockRewardedFeature,userKey}:any=_c;

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
      var normalized=String(hit.value).trim().replace(/\s/g,"").replace(",",".");
      var numeric=Number(normalized);
      return Number.isFinite(numeric)?numeric!==0:true;
    }
    var patrimonioLastDataMonthByEntry={};
    Object.keys(pHistory).sort().forEach(function(mk){var snap=pHistory[mk];allPatrimonioEntries.forEach(function(entry){if(entry&&snapshotHasEntryData(snap,entry))patrimonioLastDataMonthByEntry[String(entry.id)]=mk;});});
    function patrimonioEntryVisibleInMonth(entry,mk){if(!entry||entry.deleted)return false;if(!entry.archived)return true;var last=patrimonioLastDataMonthByEntry[String(entry.id)]||"";return !!last&&String(mk)<=String(last);}
    function patrimonioEntriesForMonth(mk){return allPatrimonioEntries.filter(function(entry){return patrimonioEntryVisibleInMonth(entry,mk);});}
    function patrimonioAreasForEntries(entriesForMonth){return allPatrimonioAreas.filter(function(area){if(!area||area.deleted)return false;return (entriesForMonth||[]).some(function(entry){return String(entry.areaId)===String(area.id);});});}
    var patrimonioEntryAllowed=settingAllowed("base");
    function lockedPatrimonioEntry(){setToast({text:L("Aggiungi voce patrimonio disponibile dal piano Base."),type:"warning",color:"#EF9F27",icon:"⚠️"});}
    var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};

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
    var [draft,setDraft]=useState(function(){
      var d={};
      pEntries.forEach(function(e){d[e.id]=existingSnap?String(existingSnap[e.id]||""):String((pHistory[curMonthKey]||{})[e.id]||"");});
      return d;
    });
    var prevSelKey=useRef(selMonthKey);
    useEffect(function(){
      if(prevSelKey.current===selMonthKey)return;
      prevSelKey.current=selMonthKey;
      var snap=pHistory[selMonthKey]||null;
      var d={};
      pEntries.forEach(function(e){d[e.id]=snap?String(snap[e.id]||""):"";});
      setDraft(d);
      setEditingId(null);
    },[selMonthKey,pHistory,pEntries]);

    var [editingId,setEditingId]=useState(null);
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
      var srcSnap={};
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
      var copiedSnap={};
      pEntries.forEach(function(e){var raw=readValue(e);var val=raw!==undefined&&raw!==null?String(raw):"";nd[e.id]=val;copiedSnap[e.id]=parseFloat(String(val).replace(",","."))||0;});
      copiedSnap._total=pEntries.reduce(function(a,e){return a+(parseFloat(String(nd[e.id]||"").replace(",","."))||0);},0);
      copiedSnap._entryTransactionCounts={};
      pEntries.forEach(function(e){if(String(nd[e.id]||"").trim()!=="")copiedSnap._entryTransactionCounts[String(e.id)]=1;});
      copiedSnap._transactionCount=Object.keys(copiedSnap._entryTransactionCounts).reduce(function(a,k){return a+Number(copiedSnap._entryTransactionCounts[k]||0);},0);
      copiedSnap._savedAt=new Date().toISOString();
      setDraft(nd);
      setPatrimonioHistory(function(h){return {...(h||{}),[keepY+"-"+String(keepM).padStart(2,"0")]:copiedSnap};});
      if((keepY+"-"+String(keepM).padStart(2,"0"))===curMonthKey){var liveVals={};pEntries.forEach(function(e){liveVals[e.id]=copiedSnap[e.id]||0;});setPatrimonioValues(liveVals);}
      setSelYear(keepY);setSelMonth(keepM);rememberPatrimonioSelectedMonth(keepY,keepM);
      consumePlanFeature("patrimonioCopy",1);
      var usedAfterCopy=planCount(featureUsageKey("patrimonioCopy"))+1;
      setToast(successToastForFeature("patrimonioCopy","Valori copiati da "+monthShortName(parseInt(copyFromKey.split("-")[1])-1)+" "+copyFromKey.slice(0,4),usedAfterCopy));
    }

    // Salva snapshot per il mese selezionato
    function saveMonthSnap(){
      var snap={};
      var entryCounts={};
      pEntries.forEach(function(e){var raw=String(draft[e.id]??"").trim();snap[e.id]=parseFloat(raw)||0;if(raw!=="")entryCounts[String(e.id)]=1;});
      snap._total=draftTotal;
      snap._entryTransactionCounts=entryCounts;
      snap._transactionCount=Object.keys(entryCounts).reduce(function(a,k){return a+Number(entryCounts[k]||0);},0);
      snap._savedAt=new Date().toISOString();
      // Se è il mese corrente aggiorna anche pValues (valori "live")
      if(isCurrentMonth){
        var newVals={};
        pEntries.forEach(function(e){newVals[e.id]=parseFloat(draft[e.id])||0;});
        setPatrimonioValues(newVals);
      }
      setPatrimonioHistory(function(h){return{...h,[selMonthKey]:snap};});
      var keepY=selYear,keepM=selMonth;
      rememberPatrimonioSelectedMonth(keepY,keepM);setTimeout(function(){setSelYear(keepY);setSelMonth(keepM);rememberPatrimonioSelectedMonth(keepY,keepM);},0);
      setToast("Patrimonio "+monthShortName(selMonth-1)+" "+selYear+" salvato");
    }

    // Elimina snapshot mese
    function delMonthSnap(mk){
      setPatrimonioHistory(function(h){var q={...h};delete q[mk];return q;});
      setToast("Snapshot eliminato");
    }

    var patrimonioEntryFormValid=patrimonioEntryAllowed&&!!String(newEntryName||"").trim();
    function addEntry(areaId){if(!patrimonioEntryFormValid)return;var nid="entry_"+Date.now();var area=(pAreas||[]).find(function(a){return String(a.id)===String(areaId);})||pAreas[0]||{};var nowIso=new Date().toISOString();setPatrimonioEntries(function(p){return [...(p||[]),{id:nid,name:newEntryName.trim(),icon:newEntryIcon,color:area.color||"#B4B2A9",areaId:areaId||area.id||"altro",custom:true,userCreated:true,createdAt:nowIso,updatedAt:nowIso}];});setDraft(function(d){return{...d,[nid]:""}});setNewEntryName("");setNewEntryIcon("📦");setAddingEntry(null);}
    function entryHasSavedData(eid){var sid=String(eid);if(patrimonioValues&&Object.prototype.hasOwnProperty.call(patrimonioValues,sid))return true;return Object.keys(pHistory||{}).some(function(mk){var snap=pHistory[mk]||{};var values=(snap&&typeof snap==="object"&&(snap.values||snap.entries))||snap||{};return values&&Object.prototype.hasOwnProperty.call(values,sid);});}
    function delEntry(eid){var nowIso=new Date().toISOString();var used=entryHasSavedData(eid);setPatrimonioEntries(function(p){return (p||[]).map(function(x){return String(x.id)===String(eid)?{...x,archived:true,deleted:!used,custom:true,userDeleted:!used,updatedAt:nowIso,...(!used?{deletedAt:nowIso}:{})}:x;});});setDraft(function(d){var q={...d};delete q[eid];return q;});if(used)setToast({text:L("La voce contiene dati storici ed è stata archiviata."),type:"success",color:"#1D9E75",icon:"🗂"});else setToast({text:L("Cancellazione completata"),type:"success",color:"#1D9E75",icon:"🗑️"});}

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

    return <div style={{display:"flex",flexDirection:"column",gap:16}}>

      {/* Note modal */}
      {noteEntryId&&(function(){
        var entry=pEntries.find(function(e){return e.id===noteEntryId;});
        return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"17vh 16px 3vh",boxSizing:"border-box",overflowY:"auto"}} onClick={function(e){if(e.target===e.currentTarget){saveNote();}}}>
          <div style={{background:dark?"#1e1e30":"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:440,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:600,color:textC}}>{entry?entry.icon+" "+entry.name:"Nota"}</div>
              <PopupCloseButton onClick={function(){saveNote();}} dark={dark} label={L("Chiudi")} />
            </div>
            <textarea value={noteDraft} onChange={function(e){setNoteDraft(e.target.value);}} placeholder={L("Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)")} style={{...sinp,height:120,resize:"vertical",lineHeight:1.5}} autoFocus/>
            <div style={{display:"flex",gap:8,marginTop:12}}>
              <Btn onClick={saveNote} bg="#7F77DD" style={{flex:1,padding:"10px",fontWeight:600}}>{"💾 "+L("Salva nota")}</Btn>
              <Btn onClick={function(){setNoteEntryId(null);}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"} style={{padding:"10px 14px"}}>{L("Annulla")}</Btn>
            </div>
            {pNotes[noteEntryId]&&<button onClick={function(){if(!window.confirm(L("Eliminare questa nota?")))return;setPatrimonioNotes(function(n){var q={...n};delete q[noteEntryId];return q;});setNoteEntryId(null);setToast(L("Nota eliminata"));}} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:12,width:"100%"}}>{"🗑 "+L("Elimina nota")}</button>}
          </div>
        </div>;
      })()}

      {/* ── Header Patrimonio: il totale resta nella scheda del mese selezionato ── */}
      <div style={{background:"linear-gradient(135deg,#378ADD22,#9F77DD22)",borderRadius:14,border:"1px solid "+(dark?"#444":"#ddd"),padding:isMobile?16:18,display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"space-between",gap:14,flexDirection:isMobile?"column":"row"}}>
        <div style={{minWidth:0}}>
          <div style={{fontSize:20,fontWeight:850,color:textC,display:"flex",alignItems:"center",gap:8}}>💎 {L("Patrimonio")}</div>
          <div style={{fontSize:12,color:subC,marginTop:5,lineHeight:1.45}}>{L("Gestisci i valori mensili, confronta i mesi e consulta lo storico.")}</div>
          <div style={{fontSize:11,color:subC,marginTop:5}}>{L("Modalità")}: {L(patrimonioMode==="manuale"?"Manuale":"Semi-automatica")} {patrimonioMode==="semi"?"⚠️":""}</div>
        </div>
        <button type="button" onClick={openPatrimonioStatistics} style={{background:confirmButtonColor||"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontSize:13,fontWeight:800,cursor:"pointer",whiteSpace:"nowrap",alignSelf:isMobile?"stretch":"center"}}>📊 {L("Statistiche Patrimonio")}</button>
      </div>

      {/* ── Tab ── */}
      <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}>
        <button onClick={function(){setPatTab("inserimento");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:patTab==="inserimento"?(dark?"#444":"#fff"):"transparent",color:patTab==="inserimento"?textC:subC,fontSize:14,cursor:"pointer",fontWeight:patTab==="inserimento"?500:400}}>✏️ {L("Inserimento")}</button>
        <button onClick={function(){setPatTab("storico");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:patTab==="storico"?(dark?"#444":"#fff"):"transparent",color:patTab==="storico"?textC:subC,fontSize:14,cursor:"pointer",fontWeight:patTab==="storico"?500:400}}>
          📅 {L("Storico")} {histMonths.length>0&&<span style={{fontSize:11,background:"#7F77DD",color:"#fff",borderRadius:10,padding:"1px 6px",marginLeft:4}}>{histMonths.length}</span>}
        </button>
      </div>

      {/* ══════════════════════ TAB INSERIMENTO ══════════════════════ */}
      {patTab==="inserimento"&&<>

        {/* Selettore mese */}
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <button onClick={function(){goMonth(-1);}} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:subC,padding:"4px 8px",borderRadius:8}}>‹</button>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:16,fontWeight:700,color:textC}}>{monthFullName(selMonth-1)} {selYear}</div>
            <div style={{fontSize:11,color:subC,marginTop:2}}>
              {existingSnap?("✅ "+L("Dati già salvati")):(isCurrentMonth?L("Mese corrente — non ancora salvato"):("⚠️ "+L("Nessun dato per questo mese")))}
            </div>
          </div>
          <button onClick={function(){goMonth(1);}} disabled={selMonthKey>=curMonthKey} style={{background:"none",border:"none",cursor:selMonthKey>=curMonthKey?"not-allowed":"pointer",fontSize:20,color:selMonthKey>=curMonthKey?"#ccc":subC,padding:"4px 8px",borderRadius:8}}>›</button>
        </div>

        {/* Totale mese selezionato + delta */}
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"minmax(0,1fr) auto",gap:12,alignItems:"center",padding:"14px 16px",background:dark?"#252535":"#f9f9f9",borderRadius:14,border:"1px solid "+borderC}}>
          <div style={{minWidth:0}}>
            <div style={{fontSize:11,color:subC}}>{L("Totale")} {monthShortName(selMonth-1)} {selYear}</div>
            <div style={{fontSize:isMobile?24:26,fontWeight:900,color:draftTotal>=0?"#1D9E75":"#E24B4A",lineHeight:1.1,wordBreak:"break-word"}}>{fmt(draftTotal)}</div>
            {secRate&&showSecInPatrimonio&&fmtSec(draftTotal)&&<div style={{fontSize:12,color:subC,fontWeight:500,marginTop:2}}>{fmtSec(draftTotal)}</div>}
            {totalDelta!==null&&<div style={{fontSize:13,fontWeight:800,color:totalDelta>=0?"#1D9E75":"#E24B4A",marginTop:5}}>{L("vs")} {monthShortName(parseInt(prevKey.split("-")[1])-1)}: {totalDelta>=0?"+":""}{fmt(totalDelta)}</div>}
          </div>
          <button onClick={saveMonthSnap} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px 18px",fontSize:14,cursor:"pointer",fontWeight:900,width:isMobile?"100%":"auto",minWidth:isMobile?0:118,boxShadow:dark?"none":"0 6px 18px rgba(127,119,221,0.28)"}}>
            {existingSnap?("🔄 "+L("Aggiorna")):("💾 "+L("Salva"))}
          </button>
        </div>

        {/* Copia da altro mese */}
        <CopyMonthWidget
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
        />

        {/* Aree e voci */}
        {pAreas.map(function(area){
          var aEntries=pEntries.filter(function(e){return e.areaId===area.id;});
          var aTotal=aEntries.reduce(function(a,e){return a+(parseFloat(draft[e.id])||0);},0);
          var aPrevTotal=prevSnap?aEntries.reduce(function(a,e){return a+(parseFloat(prevSnap[e.id])||0);},0):null;
          var aDelta=aPrevTotal!==null?aTotal-aPrevTotal:null;
          return <div key={area.id} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,gap:10,minWidth:0}}>
              <div style={{display:"flex",alignItems:"center",gap:8,minWidth:0}}>
                <span style={{fontSize:20}}>{area.icon}</span>
                <span style={{fontSize:15,fontWeight:600,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",minWidth:0}}>{L(area.name)}</span>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontSize:15,fontWeight:600,color:aTotal>=0?"#1D9E75":"#E24B4A"}}>{fmt(aTotal)}</div>
                {aDelta!==null&&aDelta!==0&&<div style={{fontSize:11,color:aDelta>0?"#1D9E75":"#E24B4A"}}>{aDelta>0?"+":""}{fmt(aDelta)}</div>}
              </div>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:8}}>
              {aEntries.map(function(entry){
                var rawVal=draft[entry.id]||"";
                var numVal=parseFloat(rawVal)||0;
                var prevEntryVal=prevSnap?parseFloat(prevSnap[entry.id])||0:null;
                var entryDelta=prevEntryVal!==null?numVal-prevEntryVal:null;
                return <div key={entry.id}>
                  <div style={{display:"flex",alignItems:"center",gap:8,padding:isMobile?"8px 8px":"8px 10px",background:dark?"#252535":"#f9f9f9",borderRadius:pNotes[entry.id]?"10px 10px 0 0":10,border:"1px solid "+(editingId===entry.id?"#7F77DD":(dark?"#333":"#f0f0f0")),minWidth:0,overflow:"hidden"}}>
                  <span style={{fontSize:16,flexShrink:0}}>{entry.icon}</span>
                  <span style={{flex:"1 1 auto",minWidth:0,fontSize:13,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(entry.name)}</span>
                  {editingId===entry.id
                    ?<div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <input type="number" value={rawVal} placeholder="0"
                        onChange={function(e){var v=e.target.value;setDraft(function(d){return{...d,[entry.id]:v};});}}
                        onKeyDown={function(e){if(e.key==="Enter"||e.key==="Tab")setEditingId(null);}}
                        style={{...sinp,width:110,padding:"4px 8px",fontSize:13}} autoFocus/>
                      <button onClick={function(){setEditingId(null);}} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:500}}>✓</button>
                    </div>
                    :<div style={{display:"flex",alignItems:"center",gap:isMobile?4:6,flexShrink:0,minWidth:0}}>
                      {entryDelta!==null&&entryDelta!==0&&<span style={{fontSize:11,fontWeight:500,color:entryDelta>0?"#1D9E75":"#E24B4A",minWidth:isMobile?42:56,textAlign:"right",whiteSpace:"nowrap"}}>{entryDelta>0?"+":""}{fmt(entryDelta)}</span>}
                      <span onClick={function(){setEditingId(entry.id);}} style={{fontSize:isMobile?12:14,fontWeight:500,color:numVal>0?"#1D9E75":numVal<0?"#E24B4A":subC,minWidth:isMobile?62:80,maxWidth:isMobile?72:110,textAlign:"right",cursor:"pointer",borderBottom:"1px dashed "+(dark?"#555":"#ddd"),padding:"1px 0",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{rawVal===""?"—":fmt(numVal)}</span>
                      <button title={L("Modifica")} onClick={function(){setEditingId(entry.id);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",cursor:"pointer",color:"#378ADD",fontSize:isMobile?12:14,padding:isMobile?"4px 6px":"5px 8px",borderRadius:8,fontWeight:700,flexShrink:0}}>✏️</button>
                      <button onClick={function(){openNote(entry.id);}} title={L("Nota")} style={{background:pNotes[entry.id]?"#EEEDFE":"none",border:pNotes[entry.id]?"1px solid #AFA9EC":"none",borderRadius:6,cursor:"pointer",color:pNotes[entry.id]?"#534AB7":"#ccc",fontSize:isMobile?12:13,padding:isMobile?"1px 3px":"1px 5px",flexShrink:0}}>📝</button>
                      <button title={L("Elimina")} onClick={function(){if(!window.confirm(L("Eliminare questa voce dal Patrimonio?")))return;delEntry(entry.id);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",cursor:"pointer",color:"#E24B4A",fontSize:isMobile?12:14,padding:isMobile?"4px 6px":"5px 8px",borderRadius:8,fontWeight:700,flexShrink:0}}>🗑️</button>
                    </div>
                  }
                  </div>
                  {pNotes[entry.id]&&<div onClick={function(){openNote(entry.id);}} style={{padding:"6px 12px",background:dark?"#1e1e30":"#f5f4ff",border:"1px solid "+(dark?"#3a3a5a":"#c8c0f8"),borderTop:"none",borderRadius:"0 0 10px 10px",fontSize:11,color:dark?"#aac":"#534AB7",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {pNotes[entry.id]}</div>}
                </div>;
              })}
            </div>
            {false&&addingEntry===area.id&&null}
          </div>;
        })}
        {patrimonioMode==="semi"&&<div style={{background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:12,padding:"12px 16px"}}><span style={{fontSize:13,color:"#856404"}}>⚠️ {L("Modalità semi-automatica in beta.")}</span></div>}
      </>}

      {/* ══════════════════════ TAB STORICO ══════════════════════ */}
      {patTab==="storico"&&<>
        {histMonths.length===0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:40,textAlign:"center",color:subC,fontSize:14}}>
          {L("Nessuno storico disponibile. Nella scheda Inserimento seleziona un mese, inserisci i valori e clicca Salva.")}
        </div>}

        {histMonths.length>0&&<>
          {histYears.length>1&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
            {histYears.map(function(y){return <button key={y} onClick={function(){setHistViewYear(y);}} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(histViewYear===y?"#7F77DD":borderC),background:histViewYear===y?"#EEEDFE":(dark?"#252535":"#f5f5f5"),color:histViewYear===y?"#534AB7":textC,fontSize:13,cursor:"pointer",fontWeight:histViewYear===y?600:400}}>{y}</button>;})}
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
                        <button onClick={function(){setSelYear(parseInt(m.mk.slice(0,4)));setSelMonth(parseInt(m.mk.split("-")[1]));setPatTab("inserimento");}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:12,fontWeight:600,padding:0,textDecoration:"underline"}}>{lbl}</button>
                      </td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:m.total>=0?"#1D9E75":"#E24B4A"}}>{fmt(m.total)}</td>
                      <td style={{padding:"8px 10px",textAlign:"right",fontWeight:500,color:m.delta===null?subC:m.delta>=0?"#1D9E75":"#E24B4A"}}>{m.delta===null?"—":(m.delta>=0?"+":"")+fmt(m.delta)}</td>
                      {historyAreas.slice(0,isMobile?2:4).map(function(a){
                        var aEnts=patrimonioEntriesForMonth(m.mk).filter(function(e){return e.areaId===a.id;});
                        var aT=aEnts.reduce(function(acc,e){return acc+(parseFloat(m.snap[e.id])||0);},0);
                        return <td key={a.id} style={{padding:"8px 10px",textAlign:"right",color:subC,fontSize:11}}>{fmt(aT)}</td>;
                      })}
                      <td style={{padding:"8px 10px",textAlign:"center"}}>
                        <button onClick={function(){if(window.confirm(L("Eliminare snapshot ")+m.mk+"?")){delMonthSnap(m.mk);}}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:13}}>×</button>
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
                  <span style={{fontSize:13,fontWeight:500,color:cur>=0?"#1D9E75":"#E24B4A",minWidth:70,textAlign:"right"}}>{fmt(cur)}</span>
                  {d2!==null&&<span style={{fontSize:11,fontWeight:500,color:d2===0?subC:d2>0?"#1D9E75":"#E24B4A",minWidth:60,textAlign:"right"}}>{d2===0?"—":(d2>0?"+":"")+fmt(d2)}</span>}
                </div>;
              }).filter(Boolean)}
            </div>}
          </div>}
        </>}
      </>}
    </div>;
  }
