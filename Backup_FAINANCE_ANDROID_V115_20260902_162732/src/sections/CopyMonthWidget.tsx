import { useState } from 'react';
import { useApp } from '../core';

export function CopyMonthWidget({pHistory,pEntries,selMonthKey,setDraft,setToast,dark,textC,subC,borderC,sinp,btnRadius,onCopyMonth}){
  var _c:any=useApp();
  var {monthShortName,translateUiRuntimeText}:any=_c;

    var availMonths=Object.keys(pHistory).sort().reverse().filter(function(mk){return mk!==selMonthKey;});
    var [copyFrom,setCopyFrom]=useState(availMonths[0]||"");
    var [showCopy,setShowCopy]=useState(false);
    if(!availMonths.length)return null;
    // Keep copyFrom valid when availMonths changes
    if(copyFrom&&!availMonths.includes(copyFrom)){setCopyFrom(availMonths[0]||"");}
    return <div style={{background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:"12px 16px"}}>
      {!showCopy
        ?<button onClick={function(){setShowCopy(true);}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500,padding:0}}>📋 {translateUiRuntimeText("Copia valori da un altro mese...")}</button>
        :<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <span style={{fontSize:13,color:textC}}>{translateUiRuntimeText("Copia da")}</span>
          <select value={copyFrom} onChange={function(e){setCopyFrom(e.target.value);}} style={{...sinp,flex:1,padding:"6px 10px"}}>
            {availMonths.map(function(mk){return <option key={mk} value={mk}>{monthShortName(parseInt(mk.split("-")[1])-1)} {mk.slice(0,4)}</option>;})}
          </select>
          <button onClick={function(){
            if(onCopyMonth){onCopyMonth(copyFrom);setShowCopy(false);return;}
            var srcSnap=pHistory[copyFrom];
            if(!srcSnap)return;
            var nd={};
            pEntries.forEach(function(e){var raw=srcSnap[e.id];if(raw===undefined&&srcSnap.values)raw=srcSnap.values[e.id];if(raw===undefined&&srcSnap.entries)raw=srcSnap.entries[e.id];nd[e.id]=raw!==undefined?String(raw):"";});
            setDraft(nd);
            setShowCopy(false);
            setToast(translateUiRuntimeText("Valori copiati da")+" "+monthShortName(parseInt(copyFrom.split("-")[1])-1)+" "+copyFrom.slice(0,4));
          }} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>{translateUiRuntimeText("Copia")}</button>
          <button onClick={function(){setShowCopy(false);}} style={{background:"none",border:"none",cursor:"pointer",color:subC,fontSize:13}}>{translateUiRuntimeText("Annulla")}</button>
        </div>
      }
    </div>;
  }
