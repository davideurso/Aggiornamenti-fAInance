// ═══════════════════════════════════════════════════════════════════════════════
// WIDGET.TSX — Componenti UI riutilizzabili
// Grafici, form inserimento, pannelli impostazioni, modal, import, loghi
// Per usare un componente: import { NomeComponente } from './widget'
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useApp, useStorage, COLORS, EMOJI_LIST, DEFAULT_CATS, DEFAULT_METHODS,
  DEFAULT_EXPENSE_GROUPS, DEFAULT_INCOME_GROUPS, DEFAULT_PATRIMONIO_AREAS, DEFAULT_PATRIMONIO_ENTRIES,
  DEFAULT_BUDGET_PLAN, MONTHS_FULL, MONTHS_SHORT, INCOME_TYPES, CURRENCIES,
  GOAL_ICONS, BALANCE_COLOR, BG_THEMES,
  getAllIncomeTypes, sortedCats, sortedMethods, fmtDate, fmtAmt, parseMoney,
  todayStr, dateOffset, rateMonth, parseDateWithFormat, parseCSVText,
  androidDownload, exportToCSV, exportToXLSX,
  RECEIPT_OCR_ENDPOINT, fbAuth, fbDb, doc, setDoc, getDoc,
  appLogo, appBanner, aiGrilloMascot
} from './core';
import { TRANSLATIONS, translateFainanceText } from './traduzioni';


function focusFainanceInput(ref:any, delay?:number){
  try{
    setTimeout(function(){
      try{
        var el=ref&&ref.current?ref.current:null;
        if(!el||!el.focus)return;
        el.focus({preventScroll:true});
        if(el.select)el.select();
      }catch(e){}
    },delay==null?90:delay);
  }catch(e){}
}


const GOOGLE_PICKER_CLIENT_ID = '739607555867-i5uhrj1d1vs0je81qtqkks4dn903mu.apps.googleusercontent.com';
const GOOGLE_PICKER_API_KEY = 'AIzaSyBub3sUOwWqQsutPMAGjK_GInzqgrKTUno';
const GOOGLE_PICKER_APP_ID = '739607555867';
const GOOGLE_PICKER_SCOPE = 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/spreadsheets.readonly';
var FAINANCE_GOOGLE_PICKER_TOKEN = '';
var FAINANCE_GOOGLE_SCRIPT_PROMISES:any = {};

function loadFainanceExternalScript(src:string,id:string){
  if(typeof document==='undefined')return Promise.reject(new Error('document non disponibile'));
  if(FAINANCE_GOOGLE_SCRIPT_PROMISES[id])return FAINANCE_GOOGLE_SCRIPT_PROMISES[id];
  FAINANCE_GOOGLE_SCRIPT_PROMISES[id]=new Promise(function(resolve,reject){
    var existing=document.getElementById(id) as HTMLScriptElement | null;
    if(existing){
      if((existing as any).dataset&&((existing as any).dataset.loaded==='1')){resolve(true);return;}
      existing.addEventListener('load',function(){resolve(true);});
      existing.addEventListener('error',function(){delete FAINANCE_GOOGLE_SCRIPT_PROMISES[id];reject(new Error('Script Google non caricato'));});
      return;
    }
    var script=document.createElement('script');
    script.id=id;script.src=src;script.async=true;script.defer=true;
    script.onload=function(){try{(script as any).dataset.loaded='1';}catch(e){}resolve(true);};
    script.onerror=function(){try{script.remove();}catch(e){}delete FAINANCE_GOOGLE_SCRIPT_PROMISES[id];reject(new Error('Script Google non caricato: '+src));};
    document.head.appendChild(script);
  });
  return FAINANCE_GOOGLE_SCRIPT_PROMISES[id];
}


// 1.6.68: safe module-level translator fallback.
// Prevents runtime crashes when a component calls L(...) before declaring a local translator.
function FAI_TRANSLATE(value:any){
  try{
    var fn=(typeof window!=="undefined")?(window as any).fainanceTranslateUi:null;
    if(fn)return fn(value);
  }catch(e){}
  return value;
}
function L(value:any){return FAI_TRANSLATE(value);}
function PL(value:any){return FAI_TRANSLATE(value);}

function effectiveExpenseGroups(groups:any){
  var base=(Array.isArray(groups)&&groups.length)?groups:DEFAULT_EXPENSE_GROUPS;
  var out=base.slice();
  var hasAltro=out.some(function(g:any){return String(g.id)==="altro";});
  if(!hasAltro){var defAltro=(DEFAULT_EXPENSE_GROUPS||[]).find(function(g:any){return String(g.id)==="altro";})||{id:"altro",name:"Altro",icon:"📦",color:"#D3D1C7"};out.push(defAltro);}
  return out;
}
function effectiveExpenseCats(list:any){
  var base=Array.isArray(list)?list:DEFAULT_CATS;
  return (base||[]).filter(function(c:any){return !c.deleted&&!c.archived;});
}
function effectiveMethods(list:any){
  var base=Array.isArray(list)?list:DEFAULT_METHODS;
  return (base||[]).filter(function(m:any){return !m.deleted&&!m.archived;});
}
function safeCatsForGroup(list:any, groups:any, g:any){
  var effectiveGroups=effectiveExpenseGroups(groups);
  var ids=(effectiveGroups||[]).map(function(x:any){return String(x.id);});
  return (effectiveExpenseCats(list)||[]).filter(function(c:any){var cg=String(c.group||"");return cg===String(g.id)||((!cg||ids.indexOf(cg)<0)&&String(g.id)==="altro");});
}
function orderBySavedIds(list:any,order:any){
  var arr=Array.isArray(list)?list:[];
  var ord=(Array.isArray(order)?order:[]).map(function(id:any){return String(id);}).filter(Boolean);
  if(!ord.length)return arr.slice();
  return arr.slice().sort(function(a:any,b:any){var ia=ord.indexOf(String(a&&a.id)),ib=ord.indexOf(String(b&&b.id));if(ia===-1&&ib===-1)return 0;if(ia===-1)return 1;if(ib===-1)return -1;return ia-ib;});
}
function orderedIncomeTypesForContext(ctx:any){
  var raw=((ctx&&ctx.incomeTypes&&ctx.incomeTypes.length)?ctx.incomeTypes:getAllIncomeTypes(ctx&&ctx.customIncomeTypes,ctx&&ctx.incomeTypeOverrides));
  return orderBySavedIds((raw||[]).filter(function(it:any){return !it.deleted&&!it.archived;}),ctx&&ctx.incomeTypeOrder);
}

export function DonutChart({data,size}){var {dark}=useApp();if(!data||!data.length)return <div style={{width:size,height:size,borderRadius:"50%",background:dark?"#2a2a3e":"#f0f0f0",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#aaa"}}>vuoto</div>;var total=data.reduce(function(a,d){return a+(d.value||0);},0);if(!total)return null;var r=size/2,cx=r,cy=r,ir=r*0.56,angle=-Math.PI/2,slices=[];data.forEach(function(d){var sw=(d.value/total)*2*Math.PI,x1=cx+r*Math.cos(angle),y1=cy+r*Math.sin(angle),a2=angle+sw,x2=cx+r*Math.cos(a2),y2=cy+r*Math.sin(a2),ix1=cx+ir*Math.cos(angle),iy1=cy+ir*Math.sin(angle),ix2=cx+ir*Math.cos(a2),iy2=cy+ir*Math.sin(a2),lg=sw>Math.PI?1:0;slices.push({path:"M "+x1+" "+y1+" A "+r+" "+r+" 0 "+lg+" 1 "+x2+" "+y2+" L "+ix2+" "+iy2+" A "+ir+" "+ir+" 0 "+lg+" 0 "+ix1+" "+iy1+" Z",color:d.color});angle=a2;});return <svg width={size} height={size} viewBox={"0 0 "+size+" "+size}>{slices.map(function(s,i){return <path key={i} d={s.path} fill={s.color} opacity={0.85}/>;})}</svg>;}
export function BarChart({data,width,height}){var {dark,isMobile}=useApp();if(!data||!data.length)return null;var max=Math.max.apply(null,data.map(function(d){return Math.max(d.exp||0,d.inc||0);}));if(!max)max=1;var w=width||320;var pl=12,pr=12,pt=8,pb=isMobile?34:28,cw=w-pl-pr,ch=height-pt-pb,bw=cw/data.length,barW=Math.max(isMobile?5:4,Math.floor(bw*(isMobile?0.32:0.28))),gap=isMobile?4:3,tc=dark?"#888":"#999",labelStep=isMobile&&data.length>8?2:1;return <svg data-no-translate="true" className="notranslate" width="100%" height={height} viewBox={"0 0 "+w+" "+height} preserveAspectRatio="none" style={{display:"block",overflow:"visible"}}>{[0,0.5,1].map(function(p){var y=pt+ch*(1-p);return <line key={p} x1={pl} y1={y} x2={w-pr} y2={y} stroke={dark?"#2a2a3e":"#f0f0f0"} strokeWidth={1}/>;})}{data.map(function(d,i){var cx2=pl+i*bw+bw/2,hE=d.exp>0?Math.max(2,Math.round((d.exp/max)*ch)):0,hI=d.inc>0?Math.max(2,Math.round((d.inc/max)*ch)):0;return <g key={i}>{hE>0&&<rect x={cx2-barW-gap/2} y={pt+ch-hE} width={barW} height={hE} fill="#E24B4A" rx={2} opacity={0.82}/>}{hI>0&&<rect x={cx2+gap/2} y={pt+ch-hI} width={barW} height={hI} fill="#1D9E75" rx={2} opacity={0.82}/>}{i%labelStep===0&&<text className="notranslate" data-no-translate="true" x={cx2} y={height-7} textAnchor="middle" fontSize={isMobile?6.5:8} fill={tc}>{d.label}</text>}</g>;})}</svg>;}
export function LineChart({data,width,height,color}){var ctx=useApp();var dark=ctx.dark,fmt=ctx.fmt;if(!data||!data.length)return null;color=color||"#7F77DD";var max=Math.max.apply(null,data.map(function(d){return d.value||0;}));var min=Math.min.apply(null,data.map(function(d){return d.value||0;}));var range=max-min;if(!range){range=max||1;}var w=width||320;var showAxis=w>=220;var pl=showAxis?52:8,pr=4,pt=8,pb=22,cw=w-pl-pr,ch=height-pt-pb;function axisValue(v){try{if(fmt)return fmt(v);}catch(e){}var n=Math.round(Number(v)||0);return "€ "+String(n);}var ticks=[max,(max+min)/2,min];var pts=data.map(function(d,i){var x=data.length===1?pl+(cw/2):pl+i*(cw/(data.length-1));var y=data.length===1?pt+(ch/2):pt+ch-((d.value-min)/range)*ch;return{x:x,y:y,v:d.value,label:d.label};});var line=pts.map(function(p,i){return(i===0?"M":"L")+p.x.toFixed(1)+" "+p.y.toFixed(1);}).join(" ");var area=data.length===1?"":line+" L"+pts[pts.length-1].x+" "+(pt+ch)+" L"+pts[0].x+" "+(pt+ch)+" Z";var gid="lg"+color.replace("#","");var tc=dark?"#888":"#999";return <svg data-no-translate="true" className="notranslate" width="100%" height={height} viewBox={"0 0 "+w+" "+height} preserveAspectRatio="none" style={{display:"block",overflow:"visible"}}><defs><linearGradient id={gid} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity="0.25"/><stop offset="100%" stopColor={color} stopOpacity="0"/></linearGradient></defs>{[0,0.5,1].map(function(p){var y=pt+ch*(1-p);return <g key={p}>{showAxis&&<text className="notranslate" data-no-translate="true" x={2} y={Math.max(9,y+3)} textAnchor="start" fontSize={8} fill={tc}>{axisValue(ticks[p===0?0:(p===0.5?1:2)])}</text>}<line x1={pl} y1={y} x2={w-pr} y2={y} stroke={dark?"#2a2a3e":"#f0f0f0"} strokeWidth={1}/></g>;})}{area&&<path d={area} fill={"url(#"+gid+")"}/>}<path d={line} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>{data.length===1&&<circle cx={pts[0].x} cy={pts[0].y} r={4} fill={color}/>} {pts.map(function(p,i){return <text key={i} className="notranslate" data-no-translate="true" x={p.x} y={height-5} textAnchor="middle" fontSize={8} fill={tc}>{p.label}</text>;})}</svg>;}

// ── UI ATOMS ─────────────────────────────────────────────────────────────────
export function Btn({children,onClick,bg,color,style,disabled}){var ctx=useApp();var btnRadius=ctx.btnRadius;var primary=ctx.confirmButtonColor||"#378ADD";var secondary=ctx.secondaryButtonColor||"#7FC8F8";var resolved=!bg?primary:(bg==="#7F77DD"?primary:(bg==="#378ADD"?secondary:bg));return <button type="button" onClick={onClick} disabled={disabled} style={{background:resolved,color:color||"#fff",border:"none",borderRadius:btnRadius,padding:"8px 16px",cursor:disabled?"not-allowed":"pointer",fontWeight:500,fontSize:13,opacity:disabled?0.5:1,...(style||{})}}>{children}</button>;}
export function Badge({color,name,small}){var {btnRadius}=useApp();return <span style={{background:color+"33",color,border:"1px solid "+color+"66",borderRadius:small?Math.min(btnRadius,12):btnRadius,padding:small?"2px 8px":"3px 10px",fontSize:small?11:13,fontWeight:500,whiteSpace:"nowrap"}}>{name}</span>;}
export function Toggle({label,checked,onChange,color}){var ctx=useApp();var dark=ctx.dark;var c=color||ctx.secondaryButtonColor||"#7FC8F8";return <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",userSelect:"none"}}><div onClick={onChange} style={{width:44,height:24,borderRadius:12,background:checked?c:"#ccc",position:"relative",transition:"background 0.2s",flexShrink:0}}><div style={{position:"absolute",top:3,left:checked?23:3,width:18,height:18,borderRadius:"50%",background:"#fff",transition:"left 0.2s"}}/></div><span style={{fontSize:13,color:checked?c:(dark?"#aaa":"#888"),fontWeight:checked?500:400}}>{label}</span></label>;}
export function RatePicker({value,onChange,direction,onDirectionChange}){
  var ctx=useApp();
  var t=ctx.t,btnRadius=ctx.btnRadius,dark=ctx.dark,currentPlan=ctx.currentPlan,planLimits=ctx.planLimits,translateUiRuntimeText=ctx.translateUiRuntimeText;
  var L=translateUiRuntimeText||function(s){return s;};
  var opts=(planLimits&&Array.isArray(planLimits.instalmentOptions))?planLimits.instalmentOptions:[2,3,4,6,12,24];
  var premium=!opts||opts.length===0||currentPlan==="premium";
  var dir=direction||"forward";
  var [infoOpen,setInfoOpen]=useState(false);
  function setSafe(v){var n=parseInt(v,10);if(isNaN(n)||n<1)n=1;if(n>240)n=240;onChange(n);}
  return <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:8}}>
    {premium?<div><label style={{fontSize:11,color:dark?"#aaa":"#666",display:"block",marginBottom:4}}>{L("Numero di mesi")}</label><input type="number" min={1} max={240} value={value||1} onChange={function(e){setSafe(e.target.value);}} style={{width:"100%",maxWidth:160,borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"}}/></div>:<div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{opts.map(function(n){return <button key={n} onClick={function(){onChange(n);}} style={{padding:"5px 12px",borderRadius:btnRadius,border:"1px solid "+(Number(value)===n?"#7F77DD":"#ddd"),background:Number(value)===n?"#EEEDFE":"transparent",color:Number(value)===n?"#534AB7":(dark?"#ddd":"#666"),fontSize:13,cursor:"pointer"}}>{n} {t.months}</button>;})}</div>}
    <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",position:"relative"}}>
      {[{id:"forward",label:L("Avanti")},{id:"backward",label:L("Indietro")}].map(function(o){var active=dir===o.id;return <button key={o.id} onClick={function(){if(onDirectionChange)onDirectionChange(o.id);}} style={{padding:"5px 11px",borderRadius:btnRadius,border:"1px solid "+(active?"#7F77DD":(dark?"#444":"#ddd")),background:active?"#EEEDFE":"transparent",color:active?"#534AB7":(dark?"#ddd":"#666"),fontSize:12,fontWeight:active?700:500,cursor:"pointer"}}>{o.label}</button>;})}
      <button onClick={function(){setInfoOpen(function(v){return !v;});}} style={{width:26,height:26,borderRadius:"50%",border:"1px solid "+(dark?"#444":"#ddd"),background:dark?"#252535":"#fff",color:"#7F77DD",fontWeight:900,cursor:"pointer"}}>i</button>
      {infoOpen&&<div style={{position:"absolute",left:0,top:34,zIndex:30,background:dark?"#252535":"#fff",color:dark?"#eee":"#333",border:"1px solid "+(dark?"#444":"#ddd"),borderRadius:12,padding:"10px 12px",boxShadow:"0 6px 24px rgba(0,0,0,.18)",fontSize:12,lineHeight:1.45,maxWidth:280}}>{L("Avanti: la rata parte dal mese selezionato e continua nei mesi successivi. Indietro: la rata parte dal mese selezionato e viene distribuita anche nei mesi precedenti.")}</div>}
    </div>
  </div>;
}
function normalizeIconGlyph(v){var x=String(v||"");var map={AMZ:"🛒",SPOT:"🟢","D+":"🏰",HBO:"🅷",YT:"▶️",GPT:"🤖",CLA:"🧠",PAY:"🅿️",SAM:"📱",G:"🔎",MS:"🪟",ADB:"🅰️",CNV:"🎨",DBX:"☁️",REV:"💳",WISE:"🌍",N26:"🏦",SKY:"📺",DAZN:"🏟️",TIM:"☎️",VOD:"📶",ILIAD:"📶",W3:"📶"};return map[x]||x;}
export function EmojiPicker({value,onChange}){var [open,setOpen]=useState(false);function iconStyle(e){var txt=String(normalizeIconGlyph(e)||"");return {fontSize:txt.length>2?16:20,fontWeight:500,background:"none",border:"none",cursor:"pointer",padding:"2px 4px",borderRadius:4,minWidth:28,height:28,lineHeight:"24px",display:"inline-flex",alignItems:"center",justifyContent:"center"};}var shown=normalizeIconGlyph(value)||"📦";return <div style={{position:"relative"}}><button onClick={function(){setOpen(function(o){return !o;});}} style={{fontSize:20,fontWeight:500,background:"#f5f5f5",border:"1px solid #ddd",borderRadius:8,padding:"4px 10px",cursor:"pointer",minWidth:44,height:36}}>{shown}</button>{open&&<div style={{position:"absolute",zIndex:200,background:"#fff",border:"1px solid #ddd",borderRadius:10,padding:8,display:"flex",flexWrap:"wrap",gap:4,width:292,maxHeight:320,overflowY:"auto",boxShadow:"0 4px 16px rgba(0,0,0,0.15)",top:40,left:0}}>{EMOJI_LIST.map(function(e){var g=normalizeIconGlyph(e);return <button key={e} title={String(e)} onClick={function(){onChange(g);setOpen(false);}} style={iconStyle(e)}>{g}</button>;})}</div>}</div>;}
export function DatePickerField({value,onChange}){var {t,btnRadius}=useApp();var td=todayStr(),y=dateOffset(1),tw=dateOffset(2);return <div style={{display:"flex",flexDirection:"column",gap:8}}><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{[{l:t.today,v:td},{l:t.yesterday,v:y},{l:t.twoDaysAgo,v:tw}].map(function(p){return <button key={p.l} onClick={function(){onChange(p.v);}} style={{padding:"6px 12px",borderRadius:btnRadius,border:"1px solid "+(value===p.v?"#333":"#ddd"),background:value===p.v?"#333":"transparent",color:value===p.v?"#fff":"#666",fontSize:13,cursor:"pointer"}}>{p.l}</button>;})}</div><input type="date" value={value} onChange={function(e){onChange(e.target.value);}} style={{width:"100%",borderRadius:8,border:"1px solid #ddd",padding:"8px 10px",fontSize:14}}/></div>;}
export function StatCard({title,value,color,bg,sub}){var {dark}=useApp();var hasSub=!!sub;return <div style={{background:dark?"#252535":bg,borderRadius:12,padding:hasSub?"12px 14px":"9px 12px",minWidth:0,minHeight:hasSub?88:70,boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:"center",overflow:"hidden"}}><div style={{fontSize:11,color,opacity:0.8,marginBottom:hasSub?4:3,lineHeight:1.18,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{title}</div><div style={{fontSize:hasSub?"clamp(14px,4.2vw,18px)":"clamp(13px,4vw,18px)",lineHeight:1.08,fontWeight:800,color,minWidth:0,overflowWrap:"anywhere",wordBreak:"break-word"}}>{value}</div>{sub&&<div style={{fontSize:"clamp(9px,3vw,11px)",lineHeight:1.15,color,opacity:0.68,marginTop:5,minWidth:0,overflowWrap:"anywhere",wordBreak:"break-word"}}>{sub}</div>}</div>;}
export function Toast({msg,onDone,color}){
  var ctx=useApp();
  var payload=msg&&typeof msg==="object"&&!Array.isArray(msg)?msg:{text:String(msg||"")};
  var rawText=String((payload&&payload.text)||(payload&&payload.message)||"");
  var tr=ctx&&ctx.translateUiRuntimeText?ctx.translateUiRuntimeText:function(v){try{return translateFainanceText(v,(ctx&&ctx.lang)||"it");}catch(e){return v;}};
  var text=rawText.split("\n").map(function(part){return tr(part);}).join("\n");
  var type=payload&&payload.type?String(payload.type):"";
  var lower=text.toLowerCase();
  var isError=type==="error"||lower.indexOf("errore")>=0||lower.indexOf("non valido")>=0||lower.indexOf("non supportato")>=0||lower.indexOf("non trovato")>=0||lower.indexOf("riprova")>=0||lower.indexOf("limite")>=0||lower.indexOf("raggiunto")>=0||lower.indexOf("non disponibile")>=0||lower.indexOf("non inclus")>=0;
  var isWarning=type==="warning"||lower.indexOf("piano")>=0||lower.indexOf("cambia piano")>=0||lower.indexOf("passa al piano")>=0||lower.indexOf("upgrade")>=0||lower.indexOf("disponibile dal piano")>=0;
  var bg=color||payload.color||(isError?"#E24B4A":isWarning?"#EF9F27":"#1D9E75");
  var toastTextColor=payload.textColor||((String(bg).toUpperCase()==="#FFF8E1"||String(bg).toUpperCase()==="#FDECEC"||String(bg).toUpperCase()==="#FFF0F0")?(isError?"#E24B4A":"#856404"):"#fff");
  var icon=payload.icon||(isError?"🚫":isWarning?"🔒":"✅");
  var duration=Number(payload.duration||((isError||isWarning)?3600:2400));
  function goInfo(){if(ctx&&ctx.setTab)ctx.setTab("settings");if(ctx&&ctx.setSettingsPage)ctx.setSettingsPage("info");if(ctx&&ctx.setMobileMenu)ctx.setMobileMenu(false);if(onDone)onDone();}
  var showInfo=payload.actionLabel||((isError||isWarning)&&lower.indexOf("info")>=0);
  useEffect(function(){var timer=setTimeout(function(){if(onDone)onDone();},duration);return function(){clearTimeout(timer);};},[payload.id,text,type,duration]);
  return <div style={{position:"fixed",top:"clamp(240px,38vh,360px)",left:"50%",transform:"translateX(-50%)",background:bg,color:toastTextColor,borderRadius:22,padding:"16px 22px",fontSize:14,fontWeight:800,zIndex:600,boxShadow:"0 8px 40px rgba(0,0,0,0.28)",textAlign:"center",minWidth:240,maxWidth:"88vw",lineHeight:1.35,pointerEvents:"none"}}>
    <button onClick={function(e){e.stopPropagation();if(onDone)onDone();}} style={{position:"absolute",top:8,right:10,background:"rgba(255,255,255,0.18)",border:"none",borderRadius:12,color:"#fff",width:24,height:24,cursor:"pointer",fontWeight:900,pointerEvents:"auto"}}>×</button>
    <div style={{fontSize:34,marginBottom:8}}>{icon}</div>
    <div style={{whiteSpace:"pre-line",padding:"0 6px"}}>{text}</div>
    {showInfo&&<button onClick={goInfo} style={{marginTop:11,background:"rgba(255,255,255,0.18)",border:"1px solid rgba(255,255,255,0.48)",borderRadius:12,color:"#fff",padding:"8px 14px",fontSize:13,fontWeight:900,cursor:"pointer",pointerEvents:"auto"}}>{payload.actionLabel?tr(payload.actionLabel):tr("Info")}</button>}
  </div>;
}

export function AlertPopup({newAlerts,onClose}){
  var ctx=useApp();
  var {fmt}=ctx;
  function L(s){return translateFainanceText(s,(ctx&&ctx.lang)||"it");}
  if(!newAlerts||!newAlerts.length)return null;
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 16px 2vh",boxSizing:"border-box",overflowY:"auto"}} onClick={function(e){if(e.target===e.currentTarget)onClose();}}>
    <div style={{background:"#fff",borderRadius:20,width:"100%",maxWidth:420,overflow:"hidden",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
      <div style={{background:"#E24B4A",padding:"18px 20px",display:"flex",alignItems:"center",gap:10}}>
        <span style={{fontSize:26}}>🔔</span>
        <div style={{flex:1}}>
          <div style={{fontSize:16,fontWeight:700,color:"#fff"}}>{L("Alert superato!")}</div>
          <div style={{fontSize:12,color:"rgba(255,255,255,0.85)"}}>{newAlerts.length===1?L("1 nuova soglia superata"):String(newAlerts.length)+" "+L("nuove soglie superate")}</div>
        </div>
        <button onClick={function(){onClose(newAlerts);}} style={{background:"rgba(255,255,255,0.2)",border:"none",borderRadius:8,color:"#fff",fontSize:18,cursor:"pointer",padding:"4px 10px"}}>x</button>
      </div>
      <div style={{padding:"16px 20px",maxHeight:340,overflowY:"auto"}}>
        {newAlerts.map(function(al){return <div key={al.id} style={{marginBottom:14,padding:"12px 14px",background:"#fff5f5",borderRadius:12,border:"1px solid #fcc"}}>
          <div style={{fontSize:14,fontWeight:600,color:"#C03030",marginBottom:4}}>{al.name}</div>
          {al.customText&&<div style={{fontSize:13,color:"#555",marginBottom:6,fontStyle:"italic"}}>"{al.customText}"</div>}
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:13,fontWeight:600,color:"#E24B4A"}}>{al.spentFmt}</span>
            <span style={{fontSize:12,color:"#aaa"}}>{L("budget")} {al.budgetFmt}</span>
          </div>
          <div style={{background:"#f0f0f0",borderRadius:8,height:6}}><div style={{background:"#E24B4A",height:6,borderRadius:8,width:Math.min(100,al.pct)+"%"}}/></div>
          <div style={{fontSize:11,color:"#E24B4A",marginTop:3,textAlign:"right"}}>{Math.round(al.pct)}%</div>
        </div>;})}
      </div>
      <div style={{padding:"12px 20px",borderTop:"1px solid #eee"}}>
        <button onClick={function(){onClose(newAlerts);}} style={{width:"100%",background:"#E24B4A",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontWeight:600,fontSize:14,cursor:"pointer"}}>{L("Ho capito")}</button>
      </div>
    </div>
  </div>;
}

// ── FORMS ────────────────────────────────────────────────────────────────────
export function ExpenseForm({onSave,type}){
  var ctx=useApp();var t=ctx.t,cats=effectiveExpenseCats(ctx.cats),methods=effectiveMethods(ctx.methods),sym=ctx.sym,dark=ctx.dark,catOrder=ctx.catOrder,methodOrder=ctx.methodOrder,catSortMode=ctx.catSortMode,methodSortMode=ctx.methodSortMode,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups),expenseColor=ctx.expenseColor,incomeColor=ctx.incomeColor,confirmButtonColor=ctx.confirmButtonColor,secondaryButtonColor=ctx.secondaryButtonColor,btnRadius=ctx.btnRadius,isMobile=ctx.isMobile;
  var sCats=useMemo(function(){return sortedCats(cats,catOrder,catSortMode,expenseGroups);},[cats,catOrder,catSortMode,expenseGroups]);
  var sMethods=useMemo(function(){return sortedMethods(methods,methodOrder,methodSortMode);},[methods,methodOrder,methodSortMode]);
  var sIncomeTypes=useMemo(function(){return orderedIncomeTypesForContext(ctx);},[ctx.incomeTypes,ctx.incomeTypeOrder,ctx.customIncomeTypes,ctx.incomeTypeOverrides]);
  var grps=effectiveExpenseGroups(expenseGroups);
  var defaultCat=(sCats.find(function(c){return String(c.id)===String(ctx.defaultExpenseCat||"");})||sCats[0]||{id:1});
  var defaultMethod=(sMethods.find(function(m){return String(m.id)===String(ctx.defaultExpenseMethod||"");})||sMethods[0]||{id:1});
  var defaultIncomeType=(sIncomeTypes.find(function(it){return String(it.id)===String(ctx.defaultIncomeType||"");})||sIncomeTypes[0]||{id:"salario"});
  var eE={amount:"",catId:defaultCat.id,methodId:defaultMethod.id,desc:"",date:todayStr(),rateizzato:false,rate:12,rateDirection:"forward"};
  var eI={amount:"",itype:defaultIncomeType.id,desc:"",date:todayStr(),rateizzato:false,rate:12,rateDirection:"forward"};
  function formDraftKey(tp){try{return ctx.userKey?ctx.userKey("draft_single_"+tp+"_v1"):"draft_single_"+tp+"_v1";}catch(e){return "draft_single_"+tp+"_v1";}}
  function emptyFormForType(tp){return tp==="expense"?eE:eI;}
  function hasRealDraftContent(value,tp){var blank=emptyFormForType(tp);if(!value)return false;if(String(value.amount||"").trim())return true;if(String(value.desc||"").trim())return true;if(String(value.date||"")!==String(blank.date||""))return true;if(!!value.rateizzato)return true;if(String(value.rate||"")!==String(blank.rate||""))return true;if(String(value.rateDirection||"")!==String(blank.rateDirection||""))return true;return false;}
  function readFormDraft(tp){var blank=emptyFormForType(tp);try{var raw=localStorage.getItem(formDraftKey(tp));if(!raw)return blank;var saved=JSON.parse(raw);if(!saved||typeof saved!=="object"||!hasRealDraftContent(saved,tp))return blank;var merged={...blank,...saved};if(tp==="expense"){if(!sCats.some(function(c){return String(c.id)===String(merged.catId);})){merged.catId=blank.catId;}if(!sMethods.some(function(m){return String(m.id)===String(merged.methodId);})){merged.methodId=blank.methodId;}}else if(!sIncomeTypes.some(function(it){return String(it.id)===String(merged.itype);})){merged.itype=blank.itype;}return merged;}catch(e){return blank;}}
  function isMeaningfulFormDraft(value,tp){return hasRealDraftContent(value,tp);}
  var [f,setF]=useState(function(){return readFormDraft(type);});
  var amountInputRef=useRef(null);
  useEffect(function(){focusFainanceInput(amountInputRef,120);},[type]);
  useEffect(function(){setF(readFormDraft(type));},[type,defaultCat.id,defaultMethod.id,defaultIncomeType.id]);
  useEffect(function(){try{if(isMeaningfulFormDraft(f,type))localStorage.setItem(formDraftKey(type),JSON.stringify({...f,updatedAt:new Date().toISOString()}));else localStorage.removeItem(formDraftKey(type));}catch(e){}},[f,type]);
  var btnC=type==="expense"?expenseColor:incomeColor;
  var mainButtonC=confirmButtonColor||"#378ADD";
  var lang=(ctx&&ctx.lang)||"it";
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  var V=t;
  function TL(v){return translateFainanceText(v,lang);}
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#777";var borderC=dark?"#444":"#e8e8ee";
  var panelBg=dark?"linear-gradient(160deg,#252535 0%,#1e1e30 100%)":"linear-gradient(160deg,#ffffff 0%,#faf9ff 100%)";
  var fieldBg=dark?"#1e1e30":"#fff";
  var inp={width:"100%",borderRadius:10,border:"1px solid "+borderC,padding:isMobile?"6px 8px":"10px 12px",fontSize:14,background:fieldBg,color:tc,boxSizing:"border-box",outline:"none"};
  var fieldCard={background:fieldBg,border:"1px solid "+borderC,borderRadius:14,padding:isMobile?"7px 8px":"11px 13px",boxShadow:dark?"none":"0 2px 12px rgba(0,0,0,0.03)"};
  var label={fontSize:10,color:sc,display:"block",marginBottom:4,fontWeight:700,textTransform:"uppercase",letterSpacing:.35};
  var expenseFormValid=parseMoney(f.amount)>0&&!!String(f.date||"").trim()&&(type==="expense"?(!!String(f.catId||"").trim()&&!!String(f.methodId||"").trim()):!!String(f.itype||"").trim());
  function save(){if(!expenseFormValid)return;var amount=parseMoney(f.amount);var item={id:Date.now(),amount:amount,desc:f.desc,date:f.date,rateizzato:f.rateizzato,rate:f.rate,rateDirection:f.rateDirection||"forward"};if(type==="expense"){item.catId=f.catId;item.methodId=f.methodId;}else{item.type=f.itype;}onSave(item);try{localStorage.removeItem(formDraftKey(type));}catch(e){}setF(emptyFormForType(type));}
  var secondaryC=secondaryButtonColor||"#7F77DD";
  var amountGradient=type==="expense"?"linear-gradient(135deg,#5E230D 0%,#9A3F13 52%,#3E1608 100%)":"linear-gradient(135deg,#062F49 0%,#075C83 55%,#041F33 100%)";
  var whiteSoft="rgba(255,255,255,.70)";
  var amountText=String(f.amount||"").trim()?String(f.amount):"_ _";
  var amountHasValue=!!String(f.amount||"").trim();
  var descriptionStyle={...inp,minHeight:isMobile?72:82,height:isMobile?72:82,resize:"none",padding:isMobile?"11px 12px":"12px 14px",lineHeight:1.25,fontFamily:"inherit"};
  var dateBtnBase={height:isMobile?38:42,borderRadius:btnRadius,border:"1px solid "+(dark?"#3f3f52":"#E4E2F2"),background:dark?"#252535":"#fff",color:tc,fontSize:isMobile?10:14,fontWeight:850,cursor:"pointer",boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,.035)",whiteSpace:"nowrap"};
  function dateBtnStyle(active){return {...dateBtnBase,borderColor:active?secondaryC:(dark?"#3f3f52":"#E4E2F2"),background:active?(dark?secondaryC+"44":secondaryC+"14"):(dark?"#252535":"#fff"),color:active?secondaryC:tc};}
  function toggleSwitch(){return <button type="button" aria-label={TL("Rateizza")} onClick={function(){setF(function(p){return{...p,rateizzato:!p.rateizzato};});}} style={{width:isMobile?34:42,height:isMobile?19:23,borderRadius:999,border:"1px solid rgba(255,255,255,.45)",background:f.rateizzato?"rgba(255,255,255,.88)":"rgba(255,255,255,.24)",padding:2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:f.rateizzato?"flex-end":"flex-start",transition:"all .18s ease",boxShadow:"inset 0 1px 2px rgba(0,0,0,.12)"}}><span style={{width:isMobile?15:19,height:isMobile?15:19,borderRadius:"50%",background:f.rateizzato?btnC:"#fff",display:"block",boxShadow:"0 2px 7px rgba(0,0,0,.20)"}}/></button>;}
  return <div style={{background:dark?"#181827":"#fff",border:"1px solid "+borderC,borderRadius:18,padding:isMobile?10:18,boxShadow:dark?"none":"0 8px 28px rgba(83,74,183,0.08)",display:"flex",flexDirection:"column",gap:isMobile?10:14}}>
    <div style={{textAlign:"center",padding:"0 2px 2px"}}><div style={{fontSize:isMobile?18:22,fontWeight:950,color:tc,letterSpacing:.1}}>{type==="expense"?TL("Nuova uscita"):TL("Nuova entrata")}</div></div>
    <div style={{background:amountGradient,borderRadius:18,padding:isMobile?"16px 14px":"22px 26px",display:"grid",gridTemplateColumns:isMobile?"44px minmax(0,1fr) 58px":"58px minmax(0,1fr) 86px",gap:isMobile?6:14,alignItems:"center",color:"#fff",boxShadow:dark?"none":"0 10px 24px rgba(83,74,183,.18)"}}>
      <div style={{width:isMobile?34:46,height:isMobile?34:46,borderRadius:"50%",background:"rgba(255,255,255,.96)",display:"flex",alignItems:"center",justifyContent:"center",color:btnC,boxShadow:"0 6px 16px rgba(0,0,0,.12)"}}>
        <svg width={isMobile?20:28} height={isMobile?20:28} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4.5 7.5h13.8c1.1 0 2 .9 2 2v8.2c0 1.1-.9 2-2 2H4.5c-1.1 0-2-.9-2-2V6.8c0-1 .8-1.8 1.8-1.8h11.2c.8 0 1.4.6 1.4 1.4v1.1" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M15.4 12.1h5v3.3h-5c-.9 0-1.6-.7-1.6-1.6v-.1c0-.9.7-1.6 1.6-1.6Z" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"/><path d="M5 7.5h11.8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round"/></svg>
      </div>
      <div style={{minWidth:0,textAlign:"center"}}>
        <div style={{fontSize:isMobile?11:14,fontWeight:850,textTransform:"uppercase",letterSpacing:.8,color:whiteSoft,marginBottom:2}}>{t.amount}</div>
        <div style={{position:"relative"}}>
          {!amountHasValue&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:isMobile?36:52,fontWeight:950,color:"#fff",lineHeight:1,pointerEvents:"none",textShadow:"0 2px 10px rgba(0,0,0,.12)"}}>_ _</div>}
          <input ref={amountInputRef} autoFocus type="text" inputMode="decimal" placeholder="" value={f.amount} onChange={function(e){setF(function(p){return{...p,amount:e.target.value};});}} style={{width:amountHasValue?"100%":(isMobile?70:104),display:"block",margin:"0 auto",border:"none",background:"transparent",padding:0,textAlign:amountHasValue?"center":"left",fontSize:isMobile?36:52,fontWeight:950,color:"#fff",WebkitTextFillColor:"#fff",outline:"none",lineHeight:1,textShadow:"0 2px 10px rgba(0,0,0,.12)"}}/>
        </div>
        {!String(f.amount||"").trim()&&<div style={{fontSize:isMobile?13:16,color:whiteSoft,fontWeight:600,marginTop:4}}>{TL("Inserisci l\'importo")}</div>}
      </div>
      <div style={{height:"100%",minHeight:isMobile?52:66,borderLeft:"1px solid rgba(255,255,255,.32)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:isMobile?3:6,paddingLeft:isMobile?5:10}}>
        <div style={{fontSize:isMobile?9:12,fontWeight:950,textTransform:"uppercase",letterSpacing:.6,color:"#fff"}}>{t.instalment}</div>
        {toggleSwitch()}
      </div>
    </div>
    {f.rateizzato&&<div style={{background:dark?"#24213a":"#F0EDFF",border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),borderRadius:14,padding:isMobile?10:13}}><div style={{fontSize:12,color:dark?"#BEB8FF":"#534AB7",marginBottom:7,fontWeight:800}}>{t.instalmentIn} {f.rate} {t.months} - {fmtAmt(parseMoney(f.amount)?parseMoney(f.amount)/f.rate:0,sym)} {t.perMonth}</div><RatePicker value={f.rate} direction={f.rateDirection||"forward"} onChange={function(n){setF(function(p){return{...p,rate:n};});}} onDirectionChange={function(d){setF(function(p){return{...p,rateDirection:d};});}}/></div>}
    {type==="expense"?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:isMobile?8:12}}>
      <div style={fieldCard}><label style={{...label,color:dark?sc:"#343647"}}>{t.category}</label><select value={f.catId} onChange={function(e){setF(function(p){return{...p,catId:e.target.value};});}} style={{...inp,padding:isMobile?"10px 10px 10px 2px":"11px 12px 11px 4px",paddingLeft:isMobile?2:4,fontSize:isMobile?13:16,fontWeight:750,border:"none",background:"transparent",height:isMobile?48:52}}>{sCats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div>
      <div style={fieldCard}><label style={{...label,color:dark?sc:"#343647"}}>{TL("Metodo di pagamento")}</label><select value={f.methodId} onChange={function(e){setF(function(p){return{...p,methodId:e.target.value};});}} style={{...inp,padding:isMobile?"10px 10px 10px 2px":"11px 12px 11px 4px",paddingLeft:isMobile?2:4,fontSize:isMobile?13:16,fontWeight:750,border:"none",background:"transparent",height:isMobile?48:52}}>{sMethods.map(function(m){return <option key={m.id} value={m.id}>{m.icon} {m.name}</option>;})}</select></div>
    </div>:<div style={fieldCard}><label style={{...label,color:dark?sc:"#343647"}}>{t.incomeType}</label><select value={f.itype} onChange={function(e){setF(function(p){return{...p,itype:e.target.value};});}} style={{...inp,padding:isMobile?"10px 10px 10px 2px":"11px 12px 11px 4px",paddingLeft:isMobile?2:4,fontSize:isMobile?13:16,fontWeight:750,border:"none",background:"transparent",height:isMobile?48:52}}>{sIncomeTypes.map(function(it){return <option key={it.id} value={it.id}>{it.icon} {it.name}</option>;})}</select></div>}
    <div style={{...fieldCard,padding:isMobile?10:13}}><label style={{...label,color:dark?sc:"#343647"}}>{t.description}</label><textarea placeholder={TL("Aggiungi una descrizione (opzionale)")} value={f.desc} onChange={function(e){setF(function(p){return{...p,desc:e.target.value};});}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();save();}}} style={descriptionStyle}/></div>
    <div style={{...fieldCard,padding:isMobile?10:13}}><label style={{...label,color:dark?sc:"#343647",marginBottom:8}}>{t.date}</label><div style={{display:"grid",gridTemplateColumns:isMobile?".58fr .58fr .92fr 2.28fr":"1fr 1fr 1.25fr 2.15fr",gap:isMobile?5:10,alignItems:"center"}}><button type="button" onClick={function(){setF(function(p){return{...p,date:todayStr()};});}} style={dateBtnStyle(f.date===todayStr())}>{t.today}</button><button type="button" onClick={function(){setF(function(p){return{...p,date:dateOffset(1)};});}} style={dateBtnStyle(f.date===dateOffset(1))}>{t.yesterday}</button><button type="button" onClick={function(){setF(function(p){return{...p,date:dateOffset(2)};});}} style={dateBtnStyle(f.date===dateOffset(2))}>{t.twoDaysAgo}</button><label style={{...dateBtnStyle(false),display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",padding:"0 5px",gap:4}}><span style={{pointerEvents:"none",fontWeight:850}}>{fmtDate(f.date,ctx.dateFmt||"dd/mm/yyyy")}</span><span style={{pointerEvents:"none",fontSize:17}}>📅</span><input type="date" value={f.date} onChange={function(e){setF(function(p){return{...p,date:e.target.value};});}} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/></label></div></div>
    <button onClick={save} disabled={!expenseFormValid} style={{background:expenseFormValid?mainButtonC:"#A8A8A8",color:"#fff",border:"none",borderRadius:btnRadius,padding:isMobile?15:17,fontSize:isMobile?16:18,fontWeight:950,cursor:expenseFormValid?"pointer":"not-allowed",boxShadow:expenseFormValid?(dark?"none":"0 8px 20px "+mainButtonC+"44"):"none",letterSpacing:.2}}>{type==="expense"?TL("Salva Uscita"):TL("Salva Entrata")}</button>
  </div>;
}

export function ReceiptScanPanel({onSave,shareMode}){
  var ctx=useApp();var cats=effectiveExpenseCats(ctx.cats),methods=effectiveMethods(ctx.methods),sym=ctx.sym,dark=ctx.dark,catOrder=ctx.catOrder,methodOrder=ctx.methodOrder,catSortMode=ctx.catSortMode,methodSortMode=ctx.methodSortMode,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups),expenseColor=ctx.expenseColor,confirmButtonColor=ctx.confirmButtonColor,btnRadius=ctx.btnRadius,isMobile=ctx.isMobile;
  var L=ctx.translateUiRuntimeText||function(s){return s;};
  var sCats=useMemo(function(){return sortedCats(cats,catOrder,catSortMode,expenseGroups);},[cats,catOrder,catSortMode,expenseGroups]);
  var sMethods=useMemo(function(){return sortedMethods(methods,methodOrder,methodSortMode);},[methods,methodOrder,methodSortMode]);
  var defaultCat=(sCats.find(function(c){return String(c.id)===String(ctx.defaultExpenseCat||"");})||sCats[0]||{id:1});
  var defaultMethod=(sMethods.find(function(m){return String(m.id)===String(ctx.defaultExpenseMethod||"");})||sMethods[0]||{id:1});
  var [imageUrl,setImageUrl]=useState("");var [imageName,setImageName]=useState("");var [receiptText,setReceiptText]=useState("");var [msg,setMsg]=useState("");var [ocrLoading,setOcrLoading]=useState(false);var [ocrConfidence,setOcrConfidence]=useState(null);
  var [f,setF]=useState({amount:"",catId:defaultCat.id,methodId:defaultMethod.id,desc:L("Scontrino"),date:todayStr()});
  var fileRef=useRef(null);var uploadRef=useRef(null);var receiptDescInputRef=useRef(null);var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#777";var borderC=dark?"#444":"#e8e8ee";var fieldBg=dark?"#1e1e30":"#fff";
  var nativeCameraOpeningRef=useRef(false);
  var shareReceiptSubmittedRef=useRef(false);
  var videoRef=useRef(null);var [cameraPreviewOpen,setCameraPreviewOpen]=useState(false);var [cameraStream,setCameraStream]=useState(null);var [cameraFacing,setCameraFacing]=useState("environment");var [cameraZoom,setCameraZoom]=useState(1);var [cameraTorch,setCameraTorch]=useState(false);var [cameraError,setCameraError]=useState("");
  function stopReceiptCameraPreview(){try{if(cameraStream&&cameraStream.getTracks)cameraStream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});}catch(e){}setCameraStream(null);setCameraPreviewOpen(false);setCameraTorch(false);}
  async function bindReceiptCameraStream(stream){setCameraStream(stream);setCameraPreviewOpen(true);setTimeout(function(){try{if(videoRef.current){videoRef.current.srcObject=stream;videoRef.current.play&&videoRef.current.play();}}catch(e){}},50);}
  async function openReceiptPreviewWithFacing(facing){setCameraError("");try{if(cameraStream&&cameraStream.getTracks)cameraStream.getTracks().forEach(function(t){try{t.stop();}catch(e){}});}catch(e){}try{var stream=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing==="environment"?{exact:"environment"}:"user",width:{ideal:1920},height:{ideal:1080}},audio:false});setCameraFacing(facing);await bindReceiptCameraStream(stream);return true;}catch(e1){try{var stream2=await navigator.mediaDevices.getUserMedia({video:{facingMode:facing,width:{ideal:1920},height:{ideal:1080}},audio:false});setCameraFacing(facing);await bindReceiptCameraStream(stream2);return true;}catch(e2){setCameraError(L("Camera non disponibile."));return false;}}}
  async function openReceiptCameraPreview(){try{localStorage.removeItem("fainance_receipt_auto_camera_once");}catch(e){}if(navigator&&navigator.mediaDevices&&navigator.mediaDevices.getUserMedia){var ok=await openReceiptPreviewWithFacing("environment");if(ok)return true;}return false;}
  async function switchReceiptCamera(){await openReceiptPreviewWithFacing(cameraFacing==="environment"?"user":"environment");}
  async function applyReceiptZoom(next){var z=Math.max(1,Math.min(4,Number(next)||1));setCameraZoom(z);try{var track=cameraStream&&cameraStream.getVideoTracks&&cameraStream.getVideoTracks()[0];if(track&&track.applyConstraints)await track.applyConstraints({advanced:[{zoom:z}]});}catch(e){}}
  async function toggleReceiptTorch(){var next=!cameraTorch;setCameraTorch(next);try{var track=cameraStream&&cameraStream.getVideoTracks&&cameraStream.getVideoTracks()[0];if(track&&track.applyConstraints)await track.applyConstraints({advanced:[{torch:next}]});}catch(e){}}
  function captureReceiptPreviewPhoto(){try{var video:any=videoRef.current;if(!video)return;var canvas=document.createElement("canvas");var w=video.videoWidth||1280;var h=video.videoHeight||720;canvas.width=w;canvas.height=h;var ctx2=canvas.getContext("2d");if(cameraZoom>1){var zw=w/cameraZoom,zh=h/cameraZoom,zx=(w-zw)/2,zy=(h-zh)/2;ctx2.drawImage(video,zx,zy,zw,zh,0,0,w,h);}else ctx2.drawImage(video,0,0,w,h);var img=canvas.toDataURL("image/jpeg",0.92);var nm="scontrino_"+Date.now()+".jpg";stopReceiptCameraPreview();shareReceiptSubmittedRef.current=false;setImageName(nm);setImageUrl(img);setOcrConfidence(null);setReceiptText("");setMsg(L("Foto scattata. Lettura automatica in corso..."));runOCRWithImage(img,nm);}catch(e){setCameraError(L("Foto non riuscita. Riprova."));}}
  async function openReceiptCameraFromWidget(){
    try{localStorage.removeItem("fainance_receipt_auto_camera_once");}catch(e){}
    if(nativeCameraOpeningRef.current)return;
    nativeCameraOpeningRef.current=true;
    try{
      var isNative=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
      if(isNative){
        var cameraMod:any=await import("@capacitor/camera");
        var photo=await cameraMod.Camera.getPhoto({quality:82,allowEditing:false,resultType:cameraMod.CameraResultType.DataUrl,source:cameraMod.CameraSource.Camera,direction:cameraMod.CameraDirection.Rear,saveToGallery:false,correctOrientation:true,promptLabelHeader:L("Scontrino"),promptLabelPhoto:L("Fotocamera posteriore"),promptLabelPicture:L("Fotocamera posteriore")});
        var img=photo&&photo.dataUrl?photo.dataUrl:"";
        if(img){var nm="scontrino_"+Date.now()+".jpg";shareReceiptSubmittedRef.current=false;setImageName(nm);setImageUrl(img);setOcrConfidence(null);setReceiptText("");setMsg(L("Foto scattata. Lettura automatica in corso..."));runOCRWithImage(img,nm);return;}
      }
    }catch(e){try{console.warn("Apertura camera non riuscita",e);}catch(_e){}}
    finally{setTimeout(function(){nativeCameraOpeningRef.current=false;},900);}
    try{if(fileRef.current)fileRef.current.click();}catch(e){}
  }
  async function openReceiptUploadFromWidget(){
    try{
      var isNative=!!(window.Capacitor&&window.Capacitor.isNativePlatform&&window.Capacitor.isNativePlatform());
      if(isNative){
        var cameraMod:any=await import("@capacitor/camera");
        var photo=await cameraMod.Camera.getPhoto({quality:82,allowEditing:false,resultType:cameraMod.CameraResultType.DataUrl,source:cameraMod.CameraSource.Photos,saveToGallery:false,correctOrientation:true,promptLabelHeader:L("Scontrino"),promptLabelPhoto:L("Galleria"),promptLabelPicture:L("Scegli foto")});
        var img=photo&&photo.dataUrl?photo.dataUrl:"";
        if(img){var nm="scontrino_"+Date.now()+".jpg";shareReceiptSubmittedRef.current=false;setImageName(nm);setImageUrl(img);setOcrConfidence(null);setReceiptText("");setMsg(L("Foto caricata. Lettura automatica in corso..."));runOCRWithImage(img,nm);return;}
      }
    }catch(e){try{console.warn("Apertura galleria non riuscita",e);}catch(_e){}}
    setTimeout(function(){try{if(uploadRef.current)uploadRef.current.click();else if(fileRef.current)fileRef.current.click();}catch(e2){}},0);
  }
  useEffect(function(){
    function handler(){openReceiptCameraFromWidget();}
    try{window.addEventListener("fainance-open-receipt-camera",handler);}catch(e){}
    try{
      if(localStorage.getItem("fainance_receipt_auto_camera_once")==="1"){
        openReceiptCameraFromWidget();
      }else{
        setTimeout(function(){try{openReceiptCameraFromWidget();}catch(e){}},250);
      }
    }catch(e){
      setTimeout(function(){try{openReceiptCameraFromWidget();}catch(e2){}},250);
    }
    return function(){try{window.removeEventListener("fainance-open-receipt-camera",handler);}catch(e){}};
  },[]);
  var inp={width:"100%",borderRadius:10,border:"1px solid "+borderC,padding:isMobile?"8px 9px":"10px 12px",fontSize:14,background:fieldBg,color:tc,boxSizing:"border-box",outline:"none"};
  var label={fontSize:10,color:sc,display:"block",marginBottom:4,fontWeight:800,textTransform:"uppercase",letterSpacing:.35};var card={background:fieldBg,border:"1px solid "+borderC,borderRadius:14,padding:isMobile?10:14};
  function normalizeReceiptText(value){return String(value||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
  function parseAmount(text){
    var lines=(text||"").split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean);
    var fullText=String(text||"");
    function normalizeOcrAmount(v){
      return String(v||"")
        .replace(/[€$£]/g," ")
        .replace(/\b(eur|euro|euros)\b/ig," ")
        .replace(/[Oo]/g,"0")
        .replace(/(?<=\d)\s*[,\.]\s*(?=\d{1,2}\b)/g,",")
        .replace(/\s+/g," ")
        .trim();
    }
    function toNum(v){
      var raw=normalizeOcrAmount(v).replace(/\s/g,"");
      if(!raw)return 0;
      var hasComma=raw.indexOf(",")>=0,hasDot=raw.indexOf(".")>=0;
      if(hasComma&&hasDot){raw=raw.replace(/\./g,"").replace(",", ".");}
      else if(hasComma){raw=raw.replace(",", ".");}
      var n=parseFloat(raw);
      return isNaN(n)?0:n;
    }
    function normLine(l){return normalizeReceiptText(l).replace(/\s+/g," ").trim();}
    function amountMatches(l){
      var out=[];var textLine=normalizeOcrAmount(l);
      // 1) importi con decimali: 5,86 / 5.86 / 5 , 86 / € 5,86
      var re=/(?:€|eur|euro|euros)?\s*(\d{1,5}(?:[\.\s]\d{3})*(?:\s*[,\.]\s*\d{1,2}))\s*(?:€|eur|euro|euros)?/ig;
      var m;
      while((m=re.exec(textLine))!==null){
        var raw=m[1]||m[0];var n=toNum(raw);
        if(n>0&&n<100000)out.push({raw:raw,amount:n,pos:m.index,decimal:true});
      }
      // 1b) OCR spesso separa i centesimi: "30 06" vicino a TOTALE/PAGATO = 30,06.
      var lowLine=normLine(l);
      if(isTotalLabel(lowLine)||isPaymentLabel(lowLine)){
        var reSplit=/\b(\d{1,4})\s+(\d{2})\b/g;
        while((m=reSplit.exec(textLine))!==null){
          var rawSplit=(m[1]||"")+","+(m[2]||"");var ns=toNum(rawSplit);
          if(ns>0&&ns<100000&&!out.some(function(x){return Math.abs(x.amount-ns)<0.009;}))out.push({raw:rawSplit,amount:ns,pos:m.index,decimal:true,splitDecimal:true});
        }
      }
      // 2) importi interi solo se esplicitamente vicini a valuta/totale: evita quantità tipo 2 o righe IVA.
      var reInt=/(?:€|eur|euro|euros)\s*(\d{1,5})\b|\b(\d{1,5})\s*(?:€|eur|euro|euros)\b/ig;
      while((m=reInt.exec(textLine))!==null){
        var raw2=m[1]||m[2]||m[0];var n2=toNum(raw2);
        if(n2>0&&n2<100000&&!out.some(function(x){return Math.abs(x.amount-n2)<0.009;}))out.push({raw:raw2,amount:n2,pos:m.index,decimal:false});
      }
      return out;
    }
    function isTotalLabel(low){return /\b(tot|tot\.|totale|total)\b|totale\s+complessivo|totale\s+documento|totale\s+doc|totale\s+scontrino|totale\s+pagare|totale\s+da\s+pagare|da\s+pagare|importo\s+totale|amount\s+due|grand\s+total|total\s+amount|total\s+due|montant\s+total|total\s+a\s+payer|importe\s+total|total\s+a\s+pagar|valor\s+total|gesamtbetrag|summe/i.test(low);}
    function isStrongTotalLabel(low){return /totale\s+complessivo|totale\s+documento|totale\s+scontrino|totale\s+da\s+pagare|da\s+pagare|importo\s+totale|grand\s+total|amount\s+due|total\s+due|montant\s+total|importe\s+total|valor\s+total|gesamtbetrag/i.test(low);}
    function isPaymentLabel(low){return /importo\s+pagato|totale\s+pagato|pagamento\s+elettronico|pagamento\s+carta|pagato|pagamento|transazione|paid|payment|card|cash|contanti|bancomat|pos|elettronico|elettronica|pago|pagado|paiement|paye|bezahlt/i.test(low);}
    function isTaxOrNonTotal(low){return /iva|i\.v\.a|di\s+cui\s+iva|imposta|aliquota|tax|vat|tva|impuesto|mwst|ust|resto|cambio|sconto|abbuono|arrotond|residuo|subtotale|sub\s*totale|parziale|imponibile/i.test(low);}
    function isUnitOrItemLine(low){return /prezzo|prez\.|pz|qta|quantita|quantita|qty|quantity|unita|unitario|unit price|descrizione|articolo|item|reparto|codice|\bn\.?\s*\d+\s*[x*]\s*\d/i.test(low);}
    function pushCandidate(candidates,amount,score,line,index,reason,decimal){
      if(!(amount>0)||amount>=100000)return;
      candidates.push({amount:amount,score:score,line:line,index:index,reason:reason||"",decimal:!!decimal});
    }
    var candidates=[];
    // OCR a blocchi: label e totale possono finire su righe diverse o con centesimi separati.
    (function(){
      var labelWindow=/(totale\s+complessivo|totale\s+documento|totale\s+doc|totale\s+scontrino|totale\s+da\s+pagare|da\s+pagare|importo\s+totale|importo\s+pagato|totale\s+pagato|pagamento\s+elettronico|pagamento\s+carta|amount\s+due|grand\s+total|total\s+due|total\s+amount)[\s\S]{0,90}?(\d{1,4})\s+(\d{2})\b/ig;
      var fm;
      while((fm=labelWindow.exec(fullText))!==null){
        var amt=toNum((fm[2]||"")+","+(fm[3]||""));
        if(amt>0&&amt<100000)pushCandidate(candidates,amt,1180,String(fm[0]).slice(0,120),0,"label_split_decimal_window",true);
      }
    })();
    lines.forEach(function(l,idx){
      var low=normLine(l);
      var around=normLine(((lines[idx-2]||"")+" "+(lines[idx-1]||"")+" "+l+" "+(lines[idx+1]||"")+" "+(lines[idx+2]||"")));
      var ms=amountMatches(l);
      if(!ms.length)return;
      ms.forEach(function(m){
        var score=0;
        if(isStrongTotalLabel(low))score+=620;
        else if(isTotalLabel(low))score+=500;
        if(isStrongTotalLabel(around))score+=210;
        else if(isTotalLabel(around))score+=140;
        if(isPaymentLabel(low))score+=300;
        else if(isPaymentLabel(around))score+=110;
        if(isTaxOrNonTotal(low))score-=620;
        if(isTaxOrNonTotal(around)&&!isTotalLabel(around)&&!isPaymentLabel(around))score-=320;
        if(isUnitOrItemLine(low))score-=260;
        if(/\d+\s*[x*]\s*\d/.test(low))score-=320;
        if(!m.decimal)score-=260;
        if(m.amount<1)score-=320;
        if(m.amount>=1&&m.amount<3&&!isTotalLabel(around)&&!isPaymentLabel(around))score-=130;
        score+=idx*0.4;
        pushCandidate(candidates,m.amount,score,l,idx,"line",m.decimal);
      });
    });

    // OCR a colonne: label totale / pagamento su una riga, valore nelle righe successive.
    lines.forEach(function(l,idx){
      var low=normLine(l);
      var strong=isStrongTotalLabel(low);
      var total=isTotalLabel(low);
      var payment=isPaymentLabel(low);
      if(!strong&&!total&&!payment)return;
      for(var j=0;j<=7;j++){
        var line=lines[idx+j]||"";
        var nlow=normLine(line);
        var ms=amountMatches(line);
        ms.forEach(function(m){
          var score=(strong?900:(total?780:660))-(j*38);
          if(payment)score+=120;
          if(isTaxOrNonTotal(nlow)&&!isTotalLabel(nlow)&&!isPaymentLabel(nlow))score-=760;
          if(isUnitOrItemLine(nlow)&&!isTotalLabel(nlow)&&!isPaymentLabel(nlow))score-=300;
          if(!m.decimal)score-=230;
          if(m.amount<1)score-=430;
          pushCandidate(candidates,m.amount,score,line,idx+j,"lookahead",m.decimal);
        });
      }
    });

    // Fallback specifico: se vicino a una label forte ci sono più importi, il totale reale è quasi sempre
    // il massimo importo decimale non IVA. Evita casi come 2,00 prodotto / 0,36 IVA quando c'è 5,86 pagato.
    lines.forEach(function(l,idx){
      var low=normLine(l);
      if(!isStrongTotalLabel(low)&&!isPaymentLabel(low))return;
      var windowText=lines.slice(idx,Math.min(lines.length,idx+8)).join("\n");
      var ws=[];
      windowText.split(/\r?\n/).forEach(function(wl,wi){
        var wlow=normLine(wl);
        amountMatches(wl).forEach(function(m){
          if(m.decimal&&!isTaxOrNonTotal(wlow)&&m.amount>=1){ws.push({amount:m.amount,line:wl,wi:wi});}
        });
      });
      if(ws.length){
        ws.sort(function(a,b){return b.amount-a.amount;});
        pushCandidate(candidates,ws[0].amount,980,ws[0].line,idx+ws[0].wi,"max_near_total_or_payment",true);
      }
    });

    candidates=candidates.filter(function(c){return c.amount>0&&c.amount<100000;});
    if(!candidates.length)return "";

    var hasDecimal=candidates.some(function(c){return c.decimal;});
    if(hasDecimal)candidates=candidates.filter(function(c){return c.decimal||c.score>=700;});

    // Bonus frequenza: il totale spesso compare come totale, pagamento e importo pagato.
    var freq={};
    candidates.forEach(function(c){var k=(Math.round(c.amount*100)/100).toFixed(2);freq[k]=(freq[k]||0)+1;});
    candidates=candidates.map(function(c){var k=(Math.round(c.amount*100)/100).toFixed(2);return {...c,score:c.score+(freq[k]-1)*95};});

    // Se abbiamo candidati collegati a totale/pagamento, escludiamo righe prodotto/IVA.
    var strongCandidates=candidates.filter(function(c){return c.score>=320;});
    if(strongCandidates.length)candidates=strongCandidates;

    candidates.sort(function(a,b){
      if(b.score!==a.score)return b.score-a.score;
      if(Math.abs(b.amount-a.amount)>0.009)return b.amount-a.amount;
      return b.index-a.index;
    });
    return String(Math.round(candidates[0].amount*100)/100);
  }
  function parseDate(text){var m=(text||"").match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})/);if(m){var y=m[3].length===2?"20"+m[3]:m[3];return y+"-"+m[2].padStart(2,"0")+"-"+m[1].padStart(2,"0");}var iso=(text||"").match(/(\d{4})-(\d{2})-(\d{2})/);if(iso)return iso[1]+"-"+iso[2]+"-"+iso[3];return todayStr();}
  function parseMerchant(text){var lines=(text||"").split(/\r?\n/).map(function(l){return l.trim();}).filter(function(l){return l&&l.length>2&&!/^[-=*]+$/.test(l);});var first=lines.find(function(l){return !/scontrino|documento|partita iva|p\.iva|codice|telefono|tel\.|totale|importo|reparto|iva|cassa/i.test(l);});return first?first.slice(0,60):"Scontrino";}
  function isBadReceiptDescription(value){var low=normalizeReceiptText(value);return !low||/^(descrizion|descrizione|description|scontrino|documento|commerciale|fiscale|totale|importo|iva|reparto|cassa|operatore|barcode|codice|numero|transazione|pagamento|cliente|copia)$/.test(low)||low.length<3;}
  function inferPurchasedDescription(text){
    var lines=(text||"").split(/\r?\n/).map(function(l){return l.trim();}).filter(Boolean);
    var cleanProduct=function(v){return String(v||"").replace(/\s{2,}.*$/,"").replace(/\b(n\.?\s*\d+\s*[x*]\s*\d+(?:[,\.]\d{1,2})?)\b/ig,"").replace(/\b(iva|prezzo|eur|euro|totale|importo|pagamento|documento|commerciale)\b/ig,"").replace(/[0-9€%*,;:]+/g," ").replace(/\s+/g," ").trim();};
    var known=[
      {re:/caffe|caffè|coffee|espresso|cappuccino/i,name:"Caffè"},
      {re:/pizza|pizze|pizzeria/i,name:"Pizza"},
      {re:/pane|panino|sandwich|croissant|brioche/i,name:"Bar"},
      {re:/farmaco|medicin|paracetamol|tachipirina|aspirina/i,name:"Farmacia"}
    ];
    var full=(text||"");
    for(var k=0;k<known.length;k++){if(known[k].re.test(full))return known[k].name;}
    for(var i=0;i<lines.length;i++){
      var low=normalizeReceiptText(lines[i]);
      if(/descrizione|description|documento|commerciale|partita|p\.iva|telefono|codice|totale|importo|pagamento|iva|prezzo|operatore|copia|cliente/.test(low))continue;
      if(/\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}/.test(lines[i]))continue;
      if(/\d+\s*[x*]\s*\d/.test(low))continue;
      if(/\d/.test(low)&&!/[a-zàèéìòù]/i.test(lines[i]))continue;
      var cand=cleanProduct(lines[i]);
      if(cand&&cand.length>=3&&cand.length<=40)return cand.charAt(0).toUpperCase()+cand.slice(1);
    }
    return "";
  }
  function inferReceiptDescription(text,merchant,suggested){var all=normalizeReceiptText((text||"")+" "+(merchant||"")+" "+(suggested||""));if(/benu/.test(all)&&/farmacia/.test(all))return "Benu Farmacia";if(/farmacia|parafarmacia/.test(all))return "Farmacia";if(/esselunga/.test(all))return "Esselunga";if(/carrefour/.test(all))return "Carrefour";if(/conad/.test(all))return "Conad";if(/coop/.test(all))return "Coop";if(/lidl/.test(all))return "Lidl";if(/eurospin/.test(all))return "Eurospin";if(/aldi/.test(all))return "Aldi";if(/ikea/.test(all))return "IKEA";if(/leroy/.test(all))return "Leroy Merlin";if(/q8/.test(all))return "Q8";if(/eni/.test(all))return "ENI";var product=inferPurchasedDescription(text);if(product)return product;if(!isBadReceiptDescription(merchant))return String(merchant||"").trim().slice(0,60);return "Scontrino";}
  function findCatByName(name){if(!name)return null;var low=normalizeReceiptText(name);return sCats.find(function(c){return c.name&&normalizeReceiptText(c.name)===low;})||sCats.find(function(c){return c.name&&(low.indexOf(normalizeReceiptText(c.name))>=0||normalizeReceiptText(c.name).indexOf(low)>=0);})||null;}
  function findMethodByName(name){if(!name)return null;var low=normalizeReceiptText(name);return sMethods.find(function(m){return m.name&&normalizeReceiptText(m.name)===low;})||sMethods.find(function(m){return m.name&&(low.indexOf(normalizeReceiptText(m.name))>=0||normalizeReceiptText(m.name).indexOf(low)>=0);})||null;}
  function findCatByAliases(names){for(var i=0;i<names.length;i++){var c=findCatByName(names[i]);if(c)return c;}return null;}
  function findMethodByAliases(names){for(var i=0;i<names.length;i++){var m=findMethodByName(names[i]);if(m)return m;}return null;}
  function categoryFor(text,merchant,suggested){var all=normalizeReceiptText((text||"")+" "+(merchant||"")+" "+(suggested||""));var rules=[
    {re:/farmacia|parafarmacia|medicinal|medicina|farmaceut|benu|lloyds|dr\.max|dr max|farmacie/i,names:["Salute","Farmacia","Medicine","Medicina"]},
    {re:/benzina|carburante|diesel|eni|q8|tamoil|esso|shell|ip |stazione servizio/i,names:["Carburante","Benzina"]},
    {re:/ristorant|ristorante|trattoria|pizzeria|pizza|osteria|sushi|burger|kebab|mcdonald|mc donald|old wild west|al capri/i,names:["Ristoranti","Ristorante","Pizzeria","Pizza"]},
    {re:/\bbar\b|caffe|caffè|gelateria|pasticceria|panetteria/i,names:["Bar"]},
    {re:/esselunga|carrefour|coop|conad|lidl|aldi|supermercato|market|pam|eurospin|penny|unes|iper|bennet|cra[iy]|despar|sigma|alimentari/i,names:["Spesa","Supermercato","Alimentari"]},
    {re:/ikea|leroy|brico|obi|arredo|mondo convenienza|casa shop|kasanova/i,names:["Casa","Manutenzione","Arredamento"]},
    {re:/taxi|uber|it taxi|freenow/i,names:["Trasporti","Taxi"]},
    {re:/parcheggio|parking|sosta|autosilo|garage/i,names:["Trasporti","Parcheggi"]},
    {re:/decathlon|sport|palestra|fitness/i,names:["Hobby","Sport"]},
    {re:/zara|hm|h&m|ovs|primark|moda|abbigliamento/i,names:["Moda"]},
    {re:/cinema|teatro|ticket|biglietto|museo|evento/i,names:["Esperienze"]},
    {re:/amazon|paypal|online|ecommerce|shop/i,names:["Altro","Imprevisti"]}
  ];for(var i=0;i<rules.length;i++){if(rules[i].re.test(all)){var c=findCatByAliases(rules[i].names);if(c)return c.id;}}
  if(suggested){var sc=findCatByName(suggested);if(sc)return sc.id;}
  return defaultCat.id;}
  function methodFor(text,suggested){var low=normalizeReceiptText((text||"")+" "+(suggested||""));if(/contanti|cash|resto/.test(low)){var cash=findMethodByAliases(["Contanti","Cash"]);if(cash)return cash.id;}if(/amex|american express/.test(low)){var am=findMethodByAliases(["Amex","American Express"]);if(am)return am.id;}if(/bbva/.test(low)){var bb=findMethodByAliases(["BBVA"]);if(bb)return bb.id;}if(/paypal/.test(low)){var pp=findMethodByAliases(["PayPal"]);if(pp)return pp.id;}if(/revolut/.test(low)){var rv=findMethodByAliases(["Revolut"]);if(rv)return rv.id;}if(/carta|bancomat|pos|visa|mastercard|pagobancomat|contactless|credito|debito|elettronico|elettronica/.test(low)){var cm=sMethods.find(function(m){return m.name&&/(revolut|bbva|amex|carta|card|debito|bancomat)/i.test(m.name);});if(cm)return cm.id;}return defaultMethod.id;}
  function applyParsed(data,sourceText){var txt=sourceText||data.text||data.ocrText||data.rawText||data.fullText||data.extractedText||data.receiptText||receiptText||"";var rawMerchant=data.merchant||data.shop||data.store||parseMerchant(txt);var localAmount=parseAmount(txt);var backendAmount=data.totalAmount||data.total||data.grandTotal||data.paidAmount||data.amount;var amount=backendAmount!=null&&backendAmount!==""?String(backendAmount):localAmount;if(localAmount){var parsedBackend=parseFloat(String(amount).replace(",","."))||0;var parsedLocal=parseFloat(String(localAmount).replace(",","."))||0;var backendLooksInteger=String(amount).indexOf(",")<0&&String(amount).indexOf(".")<0;if(!parsedBackend||Math.abs(parsedBackend-parsedLocal)>0.009||backendLooksInteger||(parsedLocal>parsedBackend&&parsedBackend>0&&parsedBackend/parsedLocal<0.92)){amount=localAmount;}}var date=data.date||parseDate(txt);var suggestedCat=data.categoryId||data.catId||data.categoryName||data.category||data.suggestedCategory||"";var suggestedMethod=data.methodId||data.methodName||data.method||data.paymentMethod||"";var merchant=inferReceiptDescription(txt,rawMerchant,suggestedCat);var cat=null;if(data.categoryId||data.catId)cat=sCats.find(function(c){return String(c.id)===String(data.categoryId||data.catId);})||null;if(!cat)cat=findCatByName(suggestedCat)||null;var meth=null;if(data.methodId)meth=sMethods.find(function(m){return String(m.id)===String(data.methodId);})||null;if(!meth)meth=findMethodByName(suggestedMethod)||null;var parsedItem={id:Date.now(),amount:parseFloat(String(amount||"0").replace(",","."))||0,catId:cat?cat.id:categoryFor(txt,merchant,suggestedCat),methodId:meth?meth.id:methodFor(txt,suggestedMethod),desc:merchant||L("Scontrino"),date:date||todayStr(),rateizzato:false,rate:12,receipt:true,receiptImageName:imageName||"",receiptOcrText:txt||"",receiptOcrConfidence:data.confidence};
      setF(function(p){return{...p,amount:amount||p.amount,date:date||p.date,catId:parsedItem.catId,methodId:parsedItem.methodId,desc:parsedItem.desc||p.desc};});
      if(!shareMode)focusFainanceInput(receiptDescInputRef,160);
      if(txt)setReceiptText(txt);if(data.confidence!=null)setOcrConfidence(data.confidence);
      if(shareMode&&parsedItem.amount>0&&!shareReceiptSubmittedRef.current){
        shareReceiptSubmittedRef.current=true;
        setTimeout(function(){try{onSave(parsedItem);}catch(e){}},80);
      }
    }
  async function prepareReceiptImage(file){
    return new Promise(function(resolve){
      try{
        var reader=new FileReader();
        reader.onload=function(ev){
          var img=new Image();
          img.onload=function(){
            try{
              var maxSide=1900;
              var w=img.width,h=img.height;
              var scale=Math.min(1,maxSide/Math.max(w,h));
              var canvas=document.createElement("canvas");
              canvas.width=Math.max(1,Math.round(w*scale));
              canvas.height=Math.max(1,Math.round(h*scale));
              var ctx2=canvas.getContext("2d");
              if(ctx2){ctx2.imageSmoothingEnabled=true;ctx2.imageSmoothingQuality="high";ctx2.fillStyle="#fff";ctx2.fillRect(0,0,canvas.width,canvas.height);ctx2.drawImage(img,0,0,canvas.width,canvas.height);}
              resolve(canvas.toDataURL("image/jpeg",0.90));
            }catch(e){resolve(String(ev.target.result||""));}
          };
          img.onerror=function(){resolve(String(ev.target.result||""));};
          img.src=String(ev.target.result||"");
        };
        reader.onerror=function(){resolve("");};
        reader.readAsDataURL(file);
      }catch(e){resolve("");}
    });
  }
  function receiptLocale(){return {it:"it-IT",en:"en-US",es:"es-ES",fr:"fr-FR",de:"de-DE",pt:"pt-PT",pl:"pl-PL",nl:"nl-NL",ro:"ro-RO",el:"el-GR"}[(ctx&&ctx.lang)||"it"]||"it-IT";}
  function unreadableReceiptMessage(){return L("Non riesco a leggere questa immagine.\nProva con un'altra foto.");}
  function receiptHasAnyNumber(value){return /\d/.test(String(value||""));}
  async function runOCRWithImage(img,name){
    if(!img){setMsg(L("Prima scatta o carica la foto dello scontrino."));return;}
    setOcrLoading(true);setMsg(L("Sto leggendo lo scontrino..."));setOcrConfidence(null);
    try{
      var token="";try{if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();}catch(e){}
      var ocrCtrl=new AbortController();var ocrTimeout=setTimeout(function(){ocrCtrl.abort();},15000);var res=await fetch(RECEIPT_OCR_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json",...(token?{"Authorization":"Bearer "+token}:{})},signal:ocrCtrl.signal,body:JSON.stringify({imageBase64:img,imageData:img,imageName:name||imageName||"receipt.jpg",categories:sCats.map(function(c){return{name:c.name,id:c.id};}),methods:sMethods.map(function(m){return{name:m.name,id:m.id};}),locale:receiptLocale(),strictTotal:true,instructions:"Estrai il totale finale pagato dello scontrino. Dai priorità a TOTALE COMPLESSIVO, TOTALE DOCUMENTO, TOTALE DA PAGARE, IMPORTO PAGATO, PAGAMENTO ELETTRONICO. Se i centesimi sono separati, ad esempio 30 06 vicino al totale o al pagamento, interpretali come 30,06. Non usare IVA, di cui IVA, imponibile, prezzo unitario, quantità, reparto, numero documento, numero scontrino, codici o righe prodotto. Restituisci anche il testo OCR completo."})});
      var data=await res.json().catch(function(){return{};});
      if(!res.ok||data.ok===false)throw new Error(data.error||("Errore OCR "+res.status));
      var fullText=data.text||data.ocrText||data.rawText||data.fullText||data.extractedText||data.receiptText||"";
      var detectedAmount=data.amount||data.totalAmount||data.total||data.grandTotal||data.paidAmount||"";
      if(!receiptHasAnyNumber(fullText)&&!receiptHasAnyNumber(detectedAmount)){
        setReceiptText("");setOcrConfidence(0);setMsg(unreadableReceiptMessage());setOcrLoading(false);return;
      }
      applyParsed(data,fullText);
      setMsg(detectedAmount?L("Scontrino letto automaticamente. Controlla l'anteprima e salva."):L("Testo letto, ma il totale non è sicuro: controlla e completa l'importo."));
    }catch(err){setMsg(L("Lettura automatica non riuscita")+": "+(err&&err.message?err.message:L("errore sconosciuto"))+". "+L("Puoi comunque compilare manualmente l'anteprima."));}
    setOcrLoading(false);
  }
  function runOCR(){runOCRWithImage(imageUrl,imageName||"receipt.jpg");}
  function onFile(e){var file=e.target.files&&e.target.files[0];if(!file)return;var nm=file.name||"scontrino.jpg";setImageName(nm);setOcrConfidence(null);setReceiptText("");setMsg(L("Foto caricata. Preparo l'immagine e avvio la lettura..."));prepareReceiptImage(file).then(function(img){if(!img){setMsg(unreadableReceiptMessage());return;}setImageUrl(img);setMsg(L("Foto caricata. Lettura automatica in corso..."));runOCRWithImage(img,nm);});}
  var receiptFormValid=parseMoney(f.amount)>0&&!!String(f.date||"").trim()&&(shareMode||(!!String(f.catId||"").trim()&&!!String(f.methodId||"").trim()));
  function save(){if(!receiptFormValid){setMsg(L("Inserisci un importo valido prima di salvare."));return;}var ok=onSave({id:Date.now(),amount:parseFloat(f.amount),catId:Number(f.catId),methodId:Number(f.methodId),desc:f.desc||L("Scontrino"),date:f.date,rateizzato:false,rate:12,receipt:true,receiptImageName:imageName||"",receiptOcrText:receiptText||"",receiptOcrConfidence:ocrConfidence});if(ok===false)return;setImageUrl("");setImageName("");setReceiptText("");setOcrConfidence(null);setMsg(L("Scontrino salvato come uscita."));setF({amount:"",catId:defaultCat.id,methodId:defaultMethod.id,desc:L("Scontrino"),date:todayStr()});if(fileRef.current)fileRef.current.value="";if(uploadRef.current)uploadRef.current.value="";}
  var cameraPreviewOverlay=cameraPreviewOpen?<div style={{position:"fixed",inset:0,zIndex:99999,background:"#05050a",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:14}}>
    <div style={{width:"100%",maxWidth:520,maxHeight:"72vh",overflow:"hidden",borderRadius:18,background:"#000"}}><video ref={videoRef} playsInline autoPlay muted style={{width:"100%",height:"100%",maxHeight:"72vh",objectFit:"cover",transform:"scale("+cameraZoom+")",transformOrigin:"center"}}/></div>
    {cameraError?<div style={{color:"#FFD27A",fontWeight:800,marginTop:10}}>{cameraError}</div>:null}
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:8,width:"100%",maxWidth:520,marginTop:14}}>
      <button type="button" onClick={switchReceiptCamera} style={{border:"none",borderRadius:14,padding:"11px 8px",fontWeight:900}}>{L("🔄 Camera")}</button>
      <button type="button" onClick={function(){applyReceiptZoom(cameraZoom>=2.5?1:cameraZoom+0.5);}} style={{border:"none",borderRadius:14,padding:"11px 8px",fontWeight:900}}>🔍 {cameraZoom.toFixed(1)}x</button>
      <button type="button" onClick={toggleReceiptTorch} style={{border:"none",borderRadius:14,padding:"11px 8px",fontWeight:900}}>⚡ {cameraTorch?L("On"):L("Off")}</button>
      <button type="button" onClick={stopReceiptCameraPreview} style={{border:"none",borderRadius:14,padding:"11px 8px",fontWeight:900}}>✕</button>
    </div>
    <button type="button" onClick={captureReceiptPreviewPhoto} style={{marginTop:14,width:"100%",maxWidth:520,border:"none",borderRadius:18,padding:"15px 16px",fontSize:18,fontWeight:1000,background:expenseColor,color:"#fff"}}>📷 {L("Scatta foto")}</button>
  </div>:null;

  return <div style={{background:dark?"linear-gradient(160deg,#252535 0%,#1e1e30 100%)":"linear-gradient(160deg,#ffffff 0%,#f7fbff 100%)",border:"1px solid "+borderC,borderRadius:16,padding:isMobile?12:18,display:"flex",flexDirection:"column",gap:14,boxShadow:dark?"none":"0 10px 30px rgba(55,138,221,0.12)"}}>
    <div style={{display:"flex",alignItems:"center",gap:12}}><div style={{width:48,height:48,borderRadius:16,background:"linear-gradient(135deg,"+expenseColor+"22,#7F77DD22)",border:"1px solid "+expenseColor+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:26}}>🧾</div><div style={{flex:1}}><div style={{fontSize:17,fontWeight:900,color:tc}}>{L("Scansiona scontrino")}</div><div style={{fontSize:12,color:sc,lineHeight:1.35}}>{L("Scatta una foto: la lettura parte automaticamente. Controlla e salva la spesa.")}</div></div></div>
    {cameraPreviewOverlay}
    <input ref={fileRef} type="file" accept="image/*" capture="environment" onChange={onFile} style={{position:"fixed",left:-9999,top:-9999,width:1,height:1,opacity:.01}}/>
    <input ref={uploadRef} type="file" accept="image/*" onChange={onFile} style={{position:"fixed",left:-9999,top:-9999,width:1,height:1,opacity:.01}}/>
    <div style={{border:"2px dashed "+(dark?"#5c6280":"#bfd7ff"),borderRadius:18,padding:isMobile?18:24,textAlign:"center",background:dark?"linear-gradient(160deg,#1e1e30,#22263d)":"linear-gradient(160deg,#f8fbff,#f4f1ff)",boxShadow:dark?"none":"inset 0 1px 0 rgba(255,255,255,0.85)"}}>{imageUrl?<img src={imageUrl} alt={L("Scontrino")} style={{maxWidth:"100%",maxHeight:220,borderRadius:14,objectFit:"contain",display:"block",margin:"0 auto 12px",boxShadow:"0 8px 24px rgba(0,0,0,0.12)"}}/>:<div style={{width:64,height:64,borderRadius:20,margin:"0 auto 10px",background:"#fff",border:"1px solid "+(dark?"#444":"#e3e7f5"),display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,boxShadow:dark?"none":"0 8px 22px rgba(55,138,221,0.10)"}}>🧾</div>}<div style={{fontSize:14,fontWeight:900,color:tc}}>{imageUrl?L("Cambia foto"):L("Aggiungi scontrino")}</div><div style={{fontSize:12,color:sc,marginTop:4,lineHeight:1.35}}>{ocrLoading?L("Lettura automatica in corso..."):L("Puoi scattare una foto o caricare un'immagine dalla galleria.")}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:14}}><button type="button" onClick={function(e){e.stopPropagation();openReceiptCameraFromWidget();}} style={{background:"linear-gradient(135deg,"+expenseColor+",#7F77DD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 10px",fontSize:12,fontWeight:900,cursor:"pointer",boxShadow:dark?"none":"0 6px 16px "+expenseColor+"33"}}>📷 {L("Fotografa")}</button><button type="button" onClick={function(e){e.stopPropagation();openReceiptUploadFromWidget();}} style={{background:dark?"#333":"#fff",color:tc,border:"1px solid "+(dark?"#555":"#d7def0"),borderRadius:btnRadius,padding:"10px 10px",fontSize:12,fontWeight:900,cursor:"pointer"}}>🖼️ {L("Carica foto")}</button></div></div>
    {imageUrl&&<button onClick={runOCR} disabled={ocrLoading} style={{background:ocrLoading?"#aaa":expenseColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontSize:13,fontWeight:900,cursor:ocrLoading?"not-allowed":"pointer"}}>{ocrLoading?L("Lettura in corso..."):L("Rileggi automaticamente")}</button>}
    {ocrConfidence!=null&&<div style={{fontSize:11,color:sc,marginTop:-4}}>{L("Confidenza OCR")}: {Math.round(Number(ocrConfidence)*100)}%</div>}
    {msg&&<div style={{background:dark?"#1e1e30":"#fff8e1",border:"1px solid "+(dark?"#555":"#ffe08a"),borderRadius:12,padding:"10px 12px",fontSize:12,color:dark?"#ddd":"#745400",lineHeight:1.45}}>{L(msg)}</div>}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}><div style={card}><label style={label}>{L("Importo")} ({sym})</label><input type="text" inputMode="decimal" value={f.amount} onChange={function(e){setF(function(p){return{...p,amount:e.target.value};});}} placeholder="_,__" style={{...inp,fontSize:22,fontWeight:900,color:expenseColor}}/></div><div style={card}><label style={label}>{L("Data")}</label><DatePickerField value={f.date} onChange={function(v){setF(function(p){return{...p,date:v};});}}/></div>{!shareMode&&<div style={card}><label style={label}>{L("Categoria")}</label><select value={f.catId} onChange={function(e){setF(function(p){return{...p,catId:e.target.value};});}} style={inp}>{sCats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div>}{!shareMode&&<div style={card}><label style={label}>{L("Metodo")}</label><select value={f.methodId} onChange={function(e){setF(function(p){return{...p,methodId:e.target.value};});}} style={inp}>{sMethods.map(function(m){return <option key={m.id} value={m.id}>{m.icon} {m.name}</option>;})}</select></div>}<div style={{...card,gridColumn:isMobile?"auto":"1/-1"}}><label style={label}>{L("Descrizione")}</label><input ref={receiptDescInputRef} value={f.desc} onChange={function(e){setF(function(p){return{...p,desc:e.target.value};});}} placeholder={L("Negozio o descrizione")} style={inp}/></div></div>
    <button onClick={save} disabled={!receiptFormValid} style={{background:receiptFormValid?(confirmButtonColor||"#378ADD"):"#A8A8A8",color:"#fff",border:"none",borderRadius:btnRadius,padding:isMobile?12:15,fontSize:15,fontWeight:900,cursor:receiptFormValid?"pointer":"not-allowed",boxShadow:receiptFormValid?(dark?"none":"0 6px 18px "+(confirmButtonColor||"#378ADD")+"44"):"none"}}>{L(shareMode?"Usa dati scontrino":"Salva uscita da scontrino")}</button>
  </div>;
}
export function BulkEntry({onSave,type,maxRows,limitMessage}){
  var ctx=useApp();var t=ctx.t,cats=effectiveExpenseCats(ctx.cats),methods=effectiveMethods(ctx.methods),dark=ctx.dark,catOrder=ctx.catOrder,methodOrder=ctx.methodOrder,catSortMode=ctx.catSortMode,methodSortMode=ctx.methodSortMode,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups),isMobile=ctx.isMobile;
  var L=ctx.translateUiRuntimeText||function(s){return translateFainanceText(s,(ctx&&ctx.lang)||"it");};
  var sCats=useMemo(function(){return sortedCats(cats,catOrder,catSortMode,expenseGroups);},[cats,catOrder,catSortMode,expenseGroups]);
  var sMethods=useMemo(function(){return sortedMethods(methods,methodOrder,methodSortMode);},[methods,methodOrder,methodSortMode]);
  var sIncomeTypes=useMemo(function(){return orderedIncomeTypesForContext(ctx);},[ctx.incomeTypes,ctx.incomeTypeOrder,ctx.customIncomeTypes,ctx.incomeTypeOverrides]);
  function blank(){var dc=(sCats.find(function(c){return String(c.id)===String(ctx.defaultExpenseCat||"");})||sCats[0]||{id:1});var dm=(sMethods.find(function(m){return String(m.id)===String(ctx.defaultExpenseMethod||"");})||sMethods[0]||{id:1});var di=(sIncomeTypes.find(function(it){return String(it.id)===String(ctx.defaultIncomeType||"");})||sIncomeTypes[0]||{id:"salario"});return{_id:Date.now()+Math.random(),amount:"",catId:dc.id,methodId:dm.id,itype:di.id,desc:"",date:todayStr(),rateizzato:false,rate:12,rateDirection:"forward"};}
  var [rows,setRows]=useState([blank()]);
  var firstAmountInputRef=useRef(null);
  useEffect(function(){focusFainanceInput(firstAmountInputRef,120);},[type,isMobile]);
  maxRows=maxRows===undefined?Infinity:Number(maxRows);
  var hasRowLimit=maxRows!==Infinity&&isFinite(maxRows);
  var rowLimitReached=hasRowLimit&&rows.length>=maxRows;
  var limitBox=<div style={{background:"#FFF8E1",border:"1.5px solid #FFD54F",borderRadius:12,padding:"10px 12px",fontSize:12,color:"#856404",fontWeight:700,lineHeight:1.35}}>{limitMessage||L("Hai raggiunto il numero massimo di righe multiple consentite dal tuo piano.")}</div>;
  var inp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box",minWidth:0};
  var sinp={width:"100%",borderRadius:6,border:"1px solid "+(dark?"#444":"#ddd"),padding:"6px 8px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};
  function upd(id,k,v){setRows(function(r){return r.map(function(x){return x._id===id?{...x,[k]:v}:x;});});}
  var bulkHasValidRows=rows.some(function(r){return parseMoney(r.amount)>0&&!!String(r.date||"").trim()&&(type==="expense"?(!!String(r.catId||"").trim()&&!!String(r.methodId||"").trim()):!!String(r.itype||"").trim());});
  function saveAll(){var valid=rows.filter(function(r){return parseMoney(r.amount)>0&&!!String(r.date||"").trim()&&(type==="expense"?(!!String(r.catId||"").trim()&&!!String(r.methodId||"").trim()):!!String(r.itype||"").trim());});if(!valid.length)return;var ok=onSave(valid.map(function(r){return{id:Date.now()+Math.random(),amount:parseFloat(r.amount),catId:Number(r.catId),methodId:Number(r.methodId),type:r.itype,desc:r.desc,date:r.date,rateizzato:r.rateizzato,rate:r.rate,rateDirection:r.rateDirection||"forward"};}));if(ok!==false)setRows([blank()]);}
  var tc=dark?"#aaa":"#666";

  // MOBILE: card layout per ogni riga, allineato al form singolo
  if(isMobile){
    var amountGradient=type==="expense"?"linear-gradient(135deg,#5E230D 0%,#9A3F13 52%,#3E1608 100%)":"linear-gradient(135deg,#062F49 0%,#075C83 55%,#041F33 100%)";
    var fieldCard={background:dark?"#1f1f31":"#fff",border:"1px solid "+(dark?"#3d3d50":"#ECE9F6"),borderRadius:16,padding:10,boxShadow:dark?"none":"0 4px 12px rgba(83,74,183,0.05)"};
    function dateBtnStyle(active){return {height:38,borderRadius:12,border:"1px solid "+(active?"#7F77DD":(dark?"#3f3f52":"#E4E2F2")),background:active?(dark?"#7F77DD44":"#7F77DD14"):(dark?"#252535":"#fff"),color:active?"#7F77DD":(dark?"#eee":"#333"),fontSize:11,fontWeight:850,cursor:"pointer",whiteSpace:"nowrap",boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,.035)"};}
    return <div>
      {rows.map(function(r,idx){return <div key={r._id} style={{background:dark?"#181827":"#fff",borderRadius:18,border:"1px solid "+(dark?"#3d3d50":"#E6E2F7"),padding:10,marginBottom:12,boxShadow:dark?"none":"0 8px 24px rgba(83,74,183,0.08)"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,padding:"2px 2px 0"}}>
          <span style={{fontSize:14,fontWeight:900,color:dark?"#eee":"#333"}}>{L("Voce")} {idx+1}</span>
          {rows.length>1&&<button onClick={function(){setRows(function(p){return p.filter(function(x){return x._id!==r._id;});});}} style={{width:28,height:28,borderRadius:10,border:"1px solid "+(dark?"#444":"#E6E2F7"),background:dark?"#252535":"#fff",cursor:"pointer",color:"#F87171",fontSize:18,lineHeight:1}}>×</button>}
        </div>
        <div style={{background:amountGradient,borderRadius:18,padding:"14px 14px",display:"grid",gridTemplateColumns:"44px minmax(0,1fr) 58px",gap:6,alignItems:"center",color:"#fff",boxShadow:dark?"none":"0 10px 24px rgba(83,74,183,.12)",marginBottom:10}}>
          <div style={{width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,.96)",display:"flex",alignItems:"center",justifyContent:"center",color:type==="expense"?"#E24B4A":"#1D9E75",fontSize:18,boxShadow:"0 6px 16px rgba(0,0,0,.12)"}}>{type==="expense"?"💳":"💰"}</div>
          <div style={{minWidth:0,textAlign:"center"}}>
            <div style={{fontSize:11,fontWeight:850,textTransform:"uppercase",letterSpacing:.8,color:"rgba(255,255,255,.70)",marginBottom:2}}>{L("Importo")}</div>
            <div style={{position:"relative"}}>{!String(r.amount||"").trim()&&<div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"flex-start",fontSize:34,fontWeight:950,color:"#fff",lineHeight:1,pointerEvents:"none"}}>_ _</div>}<input ref={idx===0?firstAmountInputRef:null} autoFocus={idx===0} type="text" inputMode="decimal" placeholder="" value={r.amount} onChange={function(e){upd(r._id,"amount",e.target.value);}} style={{width:"100%",border:"none",background:"transparent",padding:0,textAlign:"left",fontSize:34,fontWeight:950,color:"#fff",WebkitTextFillColor:"#fff",outline:"none",lineHeight:1}}/></div>
            {!String(r.amount||"").trim()&&<div style={{fontSize:13,color:"rgba(255,255,255,.70)",fontWeight:600,marginTop:4}}>{L("Inserisci l\'importo")}</div>}
          </div>
          <div style={{height:"100%",minHeight:52,borderLeft:"1px solid rgba(255,255,255,.32)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,paddingLeft:5}}>
            <div style={{fontSize:9,fontWeight:950,textTransform:"uppercase",letterSpacing:.6,color:"#fff"}}>{L("Rateizza")}</div>
            <button type="button" onClick={function(){upd(r._id,"rateizzato",!r.rateizzato);}} style={{width:34,height:19,borderRadius:999,border:"1px solid rgba(255,255,255,.45)",background:r.rateizzato?"rgba(255,255,255,.88)":"rgba(255,255,255,.24)",padding:2,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:r.rateizzato?"flex-end":"flex-start",boxShadow:"inset 0 1px 2px rgba(0,0,0,.12)"}}><span style={{width:15,height:15,borderRadius:"50%",background:r.rateizzato?(type==="expense"?"#E24B4A":"#1D9E75"):"#fff",display:"block",boxShadow:"0 2px 7px rgba(0,0,0,.20)"}}/></button>
          </div>
        </div>
        {r.rateizzato&&<div style={{background:dark?"#24213a":"#F0EDFF",border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),borderRadius:14,padding:10,marginBottom:10}}><RatePicker value={r.rate} direction={r.rateDirection||"forward"} onChange={function(n){upd(r._id,"rate",n);}} onDirectionChange={function(d){upd(r._id,"rateDirection",d);}}/></div>}
        {type==="expense"?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:10}}>
          <div style={fieldCard}><label style={{fontSize:11,fontWeight:800,color:tc,display:"block",marginBottom:6}}>{L('Categoria')}</label><select value={r.catId} onChange={function(e){upd(r._id,"catId",e.target.value);}} style={{...inp,padding:"10px 10px 10px 2px",paddingLeft:2,fontSize:13,fontWeight:750,border:"none",background:"transparent",height:48}}>{sCats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div>
          <div style={fieldCard}><label style={{fontSize:11,fontWeight:800,color:tc,display:"block",marginBottom:6}}>{L('Metodo')}</label><select value={r.methodId} onChange={function(e){upd(r._id,"methodId",e.target.value);}} style={{...inp,padding:"10px 10px 10px 2px",paddingLeft:2,fontSize:13,fontWeight:750,border:"none",background:"transparent",height:48}}>{sMethods.map(function(m){return <option key={m.id} value={m.id}>{m.icon} {m.name}</option>;})}</select></div>
        </div>:<div style={{...fieldCard,marginBottom:10}}><label style={{fontSize:11,fontWeight:800,color:tc,display:"block",marginBottom:6}}>{L('Tipo')}</label><select value={r.itype} onChange={function(e){upd(r._id,"itype",e.target.value);}} style={{...inp,padding:"10px 10px 10px 2px",paddingLeft:2,fontSize:13,fontWeight:750,border:"none",background:"transparent",height:48}}>{sIncomeTypes.map(function(it){return <option key={it.id} value={it.id}>{it.icon} {it.name}</option>;})}</select></div>}
        <div style={{...fieldCard,marginBottom:10}}><label style={{fontSize:11,fontWeight:800,color:tc,display:"block",marginBottom:6}}>{L("Descrizione")}</label><textarea value={r.desc} onChange={function(e){upd(r._id,"desc",e.target.value);}} style={{...inp,minHeight:72,height:72,resize:"none",padding:"11px 12px",lineHeight:1.25,fontFamily:"inherit"}} placeholder={L("Inserisci una descrizione...")}/></div>
        <div style={fieldCard}><label style={{fontSize:11,fontWeight:800,color:tc,display:"block",marginBottom:8}}>{L("Data")}</label><div style={{display:"grid",gridTemplateColumns:".58fr .58fr .92fr 2.28fr",gap:5,alignItems:"center"}}><button type="button" onClick={function(){upd(r._id,"date",todayStr());}} style={dateBtnStyle(r.date===todayStr())}>{ctx.t.today}</button><button type="button" onClick={function(){upd(r._id,"date",dateOffset(1));}} style={dateBtnStyle(r.date===dateOffset(1))}>{ctx.t.yesterday}</button><button type="button" onClick={function(){upd(r._id,"date",dateOffset(2));}} style={dateBtnStyle(r.date===dateOffset(2))}>{ctx.t.twoDaysAgo}</button><label style={{...dateBtnStyle(false),display:"flex",alignItems:"center",justifyContent:"center",position:"relative",overflow:"hidden",padding:"0 5px",gap:4}}><span style={{pointerEvents:"none",fontWeight:850}}>{fmtDate(r.date,ctx.dateFmt||"dd/mm/yyyy")}</span><span style={{pointerEvents:"none",fontSize:17}}>📅</span><input type="date" value={r.date} onChange={function(e){upd(r._id,"date",e.target.value);}} style={{position:"absolute",inset:0,opacity:0,cursor:"pointer"}}/></label></div></div>
      </div>;})}
      <div style={{display:"flex",gap:10,marginTop:4}}>
        {rowLimitReached?limitBox:<Btn onClick={function(){setRows(function(p){return rowLimitReached?p:[...p,blank()];});}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#444"}>{L(t.addRow)}</Btn>}
        <Btn onClick={saveAll} disabled={!bulkHasValidRows} bg={bulkHasValidRows?(type==="expense"?"#E24B4A":"#1D9E75"):"#A8A8A8"}>{L(t.saveAll)} ({rows.length})</Btn>
      </div>
    </div>;
  }

  // DESKTOP: tabella orizzontale
  return <div><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><thead><tr style={{background:dark?"#252535":"#f5f5f5"}}><th style={{padding:"8px 6px",textAlign:"left",fontWeight:500,color:tc,minWidth:190}}>{t.amount}</th>{type==="expense"?<><th style={{padding:"8px 6px",textAlign:"left",fontWeight:500,color:tc,minWidth:120}}>{t.category}</th><th style={{padding:"8px 6px",textAlign:"left",fontWeight:500,color:tc,minWidth:100}}>{t.method}</th></>:<th style={{padding:"8px 6px",textAlign:"left",fontWeight:500,color:tc}}>{t.incomeType}</th>}<th style={{padding:"8px 6px",textAlign:"left",fontWeight:500,color:tc,minWidth:120}}>{t.description}</th><th style={{padding:"8px 6px",textAlign:"left",fontWeight:500,color:tc,minWidth:126}}>{t.date}</th><th style={{padding:"8px 6px",color:tc}}>÷</th><th></th></tr></thead><tbody>{rows.map(function(r,idx){return <tr key={r._id} style={{borderBottom:"1px solid "+(dark?"#333":"#f0f0f0")}}><td style={{padding:5}}><input ref={idx===0?firstAmountInputRef:null} autoFocus={idx===0} type="text" inputMode="decimal" value={r.amount} onChange={function(e){upd(r._id,"amount",e.target.value);}} style={{...sinp,width:190,minWidth:190,fontSize:22,fontWeight:900}} placeholder="_,__"/></td>{type==="expense"?<><td style={{padding:5}}><select value={r.catId} onChange={function(e){upd(r._id,"catId",e.target.value);}} style={sinp}>{sCats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></td><td style={{padding:5}}><select value={r.methodId} onChange={function(e){upd(r._id,"methodId",e.target.value);}} style={sinp}>{sMethods.map(function(m){return <option key={m.id} value={m.id}>{m.icon} {m.name}</option>;})}</select></td></>:<td style={{padding:5}}><select value={r.itype} onChange={function(e){upd(r._id,"itype",e.target.value);}} style={sinp}>{sIncomeTypes.map(function(it){return <option key={it.id} value={it.id}>{it.icon} {it.name}</option>;})}</select></td>}<td style={{padding:5}}><input type="text" value={r.desc} onChange={function(e){upd(r._id,"desc",e.target.value);}} style={{...sinp,minWidth:110}} placeholder={L("Inserisci una descrizione...")}/></td><td style={{padding:5}}><input type="date" value={r.date} onChange={function(e){upd(r._id,"date",e.target.value);}} style={{...sinp,minWidth:126}}/></td><td style={{padding:5,textAlign:"center"}}><input type="checkbox" checked={r.rateizzato} onChange={function(){upd(r._id,"rateizzato",!r.rateizzato);}}/>{r.rateizzato&&<div style={{marginTop:4,minWidth:150}}><RatePicker value={r.rate} direction={r.rateDirection||"forward"} onChange={function(n){upd(r._id,"rate",n);}} onDirectionChange={function(d){upd(r._id,"rateDirection",d);}}/></div>}</td><td style={{padding:5}}><button onClick={function(){setRows(function(p){return p.filter(function(x){return x._id!==r._id;});});}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:15}}>x</button></td></tr>;})} </tbody></table></div><div style={{display:"flex",gap:10,marginTop:12}}>{rowLimitReached?limitBox:<Btn onClick={function(){setRows(function(p){return rowLimitReached?p:[...p,blank()];});}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#444"}>{L(t.addRow)}</Btn>}<Btn onClick={saveAll} disabled={!bulkHasValidRows} bg={bulkHasValidRows?(type==="expense"?"#E24B4A":"#1D9E75"):"#A8A8A8"}>{L(t.saveAll)} ({rows.length})</Btn></div></div>;
}
export function RecurringManager(){
  var ctx=useApp();
  function L(v){return translateFainanceText(v,ctx.lang||'it');}
  var cats=effectiveExpenseCats(ctx.cats),methods=effectiveMethods(ctx.methods),recurring=ctx.recurring||[],setRecurring=ctx.setRecurring,sym=ctx.sym,dark=ctx.dark,curMonthKey=ctx.curMonthKey,confirmRecurring=ctx.confirmRecurring,catOrder=ctx.catOrder,methodOrder=ctx.methodOrder,catSortMode=ctx.catSortMode,methodSortMode=ctx.methodSortMode,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups),btnRadius=ctx.btnRadius||12,confirmButtonColor=ctx.confirmButtonColor||"#378ADD",secondaryButtonColor=ctx.secondaryButtonColor||"#7F77DD";
  var lang=(ctx&&ctx.lang)||"it";
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  var incomeTypes=orderedIncomeTypesForContext(ctx);
  var sCats=useMemo(function(){return sortedCats(cats,catOrder,catSortMode,expenseGroups);},[cats,catOrder,catSortMode,expenseGroups]);
  var sMethods=useMemo(function(){return sortedMethods(methods,methodOrder,methodSortMode);},[methods,methodOrder,methodSortMode]);
  var now=new Date();
  function autoIcon(name){var n=String(name||"").toLowerCase();if(n.indexOf("netflix")>=0)return "🅽";if(n.indexOf("spotify")>=0)return "🟢";if(n.indexOf("amazon")>=0||n.indexOf("prime")>=0)return "📦";if(n.indexOf("disney")>=0)return "🏰";if(n.indexOf("hbo")>=0||n.indexOf("max")>=0)return "🅷";if(n.indexOf("youtube")>=0)return "▶️";if(n.indexOf("chatgpt")>=0||n.indexOf("openai")>=0)return "🤖";if(n.indexOf("claude")>=0)return "🧠";if(n.indexOf("paypal")>=0)return "🅿️";if(n.indexOf("apple")>=0||n.indexOf("icloud")>=0)return "🍎";if(n.indexOf("samsung")>=0)return "📱";if(n.indexOf("google")>=0)return "🟣";if(n.indexOf("microsoft")>=0||n.indexOf("office")>=0)return "🪟";if(n.indexOf("adobe")>=0)return "🅰️";if(n.indexOf("canva")>=0)return "🎨";if(n.indexOf("dropbox")>=0)return "☁️";if(n.indexOf("revolut")>=0||n.indexOf("wise")>=0||n.indexOf("n26")>=0)return "💳";if(n.indexOf("sky")>=0||n.indexOf("dazn")>=0)return "📺";if(n.indexOf("tim")>=0||n.indexOf("vodafone")>=0||n.indexOf("iliad")>=0||n.indexOf("wind")>=0)return "📶";return "";}
  function makeBlank(){var dc=(sCats.find(function(c){return String(c.id)===String(ctx.defaultExpenseCat||"");})||sCats[0]||{id:1});var dm=(sMethods.find(function(m){return String(m.id)===String(ctx.defaultExpenseMethod||"");})||sMethods[0]||{id:1});var di=(incomeTypes.find(function(it){return String(it.id)===String(ctx.defaultIncomeType||"");})||incomeTypes[0]||{id:"salario"});return{name:"",icon:"🔁",amount:"",catId:dc.id,methodId:dm.id,rtype:"expense",incomeType:di.id,dayOfMonth:1,annualMonth:now.getMonth()+1,rateizzato:false,rate:12,frequency:"monthly"};}
  var [showForm,setShowForm]=useState(false);
  var [editingId,setEditingId]=useState(null);
  var [deleteId,setDeleteId]=useState(null);
  var [form,setForm]=useState(makeBlank());
  var [toast,setToast]=useState(null);
  var recurringAmountInputRef=useRef(null);
  useEffect(function(){if(showForm||editingId)focusFainanceInput(recurringAmountInputRef,120);},[showForm,editingId]);
  var inp={width:"100%",borderRadius:10,border:"1px solid "+(dark?"#444":"#ddd"),padding:"10px 12px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var cardBg=dark?"#252535":"#fff";
  function recurringMonth(r){if(String(r.frequency)!=="annual")return now.getMonth()+1;var raw=(r.annualMonth!=null?r.annualMonth:(r.monthOfYear!=null?r.monthOfYear:(r.month!=null?r.month:r.dayOfMonth)));var n=parseInt(raw,10);if(isNaN(n)||n<1||n>12)n=1;return n;}
  function recurringDay(r){var raw=(String(r.frequency)==="annual"&&r.annualMonth==null&&r.month==null&&r.monthOfYear==null)?1:r.dayOfMonth;var n=parseInt(raw,10);if(isNaN(n))n=1;if(n<0)n=1;if(n>31)n=31;return n;}
  var pending=recurring.filter(function(r){if(String(r.frequency)==="annual"&&recurringMonth(r)!==(now.getMonth()+1))return false;return !(r.confirmed||[]).includes(curMonthKey)&&!(r.skipped||[]).includes(curMonthKey);});
  if(ctx.planLimits&&ctx.planLimits.recurringMovements===0){return <div style={{background:dark?"#342b16":"#FFF8E1",border:"1px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:14,padding:16,color:dark?"#ffd58a":"#856404",fontSize:13,fontWeight:800}}>{L("🔒 I movimenti ricorrenti non sono disponibili nel tuo piano.")}</div>;}
  function showToast(msg,color){setToast({msg:msg,color:color||"#1D9E75"});}
  function setField(k,v){setForm(function(p){var next={...p,[k]:v};if(k==="name"&&(!p.icon||p.icon==="🔁"||p.icon==="💸"||p.icon==="💰")){var ai=autoIcon(v);if(ai)next.icon=ai;}if(k==="rtype"&&(!p.icon||p.icon==="🔁"||p.icon==="💸"||p.icon==="💰")){next.icon=v==="income"?"💰":"💸";}return next;});}
  function normalizePayload(){var icon=form.icon||autoIcon(form.name)||(form.rtype==="income"?"💰":"💸");var day=Number(form.dayOfMonth);if(isNaN(day))day=1;if(day<0)day=1;if(day>31)day=31;var month=Number(form.annualMonth);if(isNaN(month)||month<1||month>12)month=now.getMonth()+1;return{...form,id:editingId||Date.now(),icon:icon,name:String(form.name||"").trim(),amount:parseFloat(form.amount),catId:Number(form.catId),methodId:Number(form.methodId),dayOfMonth:day,annualMonth:month,rate:Number(form.rate||12),rateizzato:!!form.rateizzato,frequency:form.frequency||"monthly"};}
  function startCreate(){setEditingId(null);setForm(makeBlank());setShowForm(true);setDeleteId(null);}
  function startEdit(r){var base=makeBlank();var annualMonth=recurringMonth(r);var day=recurringDay(r);setEditingId(r.id);setForm({...base,...r,icon:r.icon||autoIcon(r.name)||(r.rtype==="income"?"💰":"💸"),annualMonth:annualMonth,dayOfMonth:day,amount:String(r.amount||"")});setShowForm(false);setDeleteId(null);}
  function cancelForm(){setShowForm(false);setEditingId(null);setForm(makeBlank());}
  var recurringFormValid=!!String(form.name||"").trim()&&parseMoney(form.amount)>0&&Number(form.dayOfMonth)>=0&&Number(form.dayOfMonth)<=31&&(form.frequency!=="annual"||(Number(form.annualMonth)>=1&&Number(form.annualMonth)<=12))&&(form.rtype==="income"?!!String(form.incomeType||"").trim():(!!String(form.catId||"").trim()&&!!String(form.methodId||"").trim()));
  function saveRecurring(){if(!recurringFormValid)return;if(!editingId&&ctx.canAddPlanItem&&!ctx.canAddPlanItem("recurringMovements",(recurring||[]).length,1)){if(ctx.setToast)ctx.setToast(ctx.upgradeMessage?ctx.upgradeMessage("recurringMovements",(recurring||[]).length):"Limite ricorrenti raggiunto");return;}var payload=normalizePayload();if(editingId){setRecurring(function(prev){return prev.map(function(r){return r.id===editingId?{...r,...payload,id:r.id,confirmed:r.confirmed||[],skipped:r.skipped||[]}:r;});});showToast("Ricorrente modificata. Lo storico già generato resta invariato.");}else{setRecurring(function(prev){return [...prev,{...payload,confirmed:[],skipped:[]}];});showToast("Ricorrente creata correttamente.");}cancelForm();}
  function skipRecurring(r){setRecurring(function(prev){return prev.map(function(x){return x.id===r.id?{...x,skipped:[...(x.skipped||[]),curMonthKey]}:x;});});showToast("Ricorrente saltata per questo mese.","#1D9E75");}
  function confirmOne(r){if(confirmRecurring)confirmRecurring(r,curMonthKey);showToast((r.rtype==="income"?"Entrata":"Uscita")+" ricorrente confermata correttamente.");}
  function deleteRecurring(id){setRecurring(function(prev){return prev.filter(function(r){return r.id!==id;});});setDeleteId(null);showToast("Ricorrente eliminata. Lo storico già generato resta invariato.","#E24B4A");}
  function typeLabel(r){return r.rtype==="income"?(t.incomes||"Entrata"):(t.expenses||"Uscita");}
  function catObj(r){if(r.rtype==="income")return incomeTypes.find(function(x){return x.id===r.incomeType;})||{icon:"💰",name:"Entrata"};return sCats.find(function(x){return Number(x.id)===Number(r.catId);})||{icon:"📦",name:"Categoria"};}
  function methodObj(r){return sMethods.find(function(x){return Number(x.id)===Number(r.methodId);})||null;}
  function recIcon(r){return normalizeIconGlyph(r.icon)||autoIcon(r.name)||(r.rtype==="income"?"💰":"💸");}
  function dateText(r){if(String(r.frequency)==="annual"){var mi=recurringMonth(r)-1;var dn=recurringDay(r);return L("Annuale")+" · "+dn+" "+L(MONTHS_FULL[mi]||"");}var d=recurringDay(r);return L("Mensile")+" · "+L("giorno")+" "+(d===0?L("ultimo"):d);}
  function chip(icon,text,bg,color){return <span style={{display:"inline-flex",alignItems:"center",gap:5,borderRadius:999,padding:"4px 8px",fontSize:11,fontWeight:800,background:bg,color:color,whiteSpace:"nowrap",maxWidth:"100%"}}><span>{icon}</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{text}</span></span>;}
  function typeSegment(){return <div style={{display:"flex",gap:6,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:4}}><button onClick={function(){setField("rtype","expense");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:form.rtype!=="income"?"#E24B4A":"transparent",color:form.rtype!=="income"?"#fff":sc,fontSize:13,cursor:"pointer",fontWeight:form.rtype!=="income"?800:600}}>{L("Uscita")}</button><button onClick={function(){setField("rtype","income");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:form.rtype==="income"?"#1D9E75":"transparent",color:form.rtype==="income"?"#fff":sc,fontSize:13,cursor:"pointer",fontWeight:form.rtype==="income"?800:600}}>{L("Entrata")}</button></div>;}
  function formBox(inline){return <div style={{background:inline?(dark?"#202033":"#FAFBFF"):(dark?"#1e1e30":"#f9f9ff"),borderRadius:18,border:"1.5px solid "+(editingId?"#7F77DD":borderC),padding:16,boxShadow:dark?"none":"0 6px 20px rgba(127,119,221,0.08)",marginTop:inline?12:0}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><div><div style={{fontSize:15,fontWeight:900,color:tc}}>{editingId?L('Modifica ricorrente'):L('Nuova ricorrente')}</div><div style={{fontSize:12,color:sc}}>{L('Non modifica le voci già presenti nello storico.')}</div></div><button onClick={cancelForm} style={{background:dark?"#333":"#fff",border:"1px solid "+borderC,borderRadius:10,color:sc,cursor:"pointer",fontSize:18,width:34,height:34}}>×</button></div><div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"grid",gridTemplateColumns:"auto 1fr 1fr",gap:10,alignItems:"end"}}><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L('Icona')}</label><EmojiPicker value={form.icon||autoIcon(form.name)||"🔁"} onChange={function(v){setField("icon",v);}}/></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L('Nome')}</label><input value={form.name} onChange={function(e){setField("name",e.target.value);}} style={inp}/></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L('Importo')}</label><input ref={recurringAmountInputRef} autoFocus type="text" inputMode="decimal" placeholder="_,__" value={form.amount} onChange={function(e){setField("amount",e.target.value);}} style={inp}/></div></div>{typeSegment()}<div style={{display:"flex",gap:6,marginBottom:2,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:4}}><button onClick={function(){setField("frequency","monthly");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:form.frequency!=="annual"?(secondaryButtonColor||"#7F77DD"):(dark?"#252535":"#fff"),color:form.frequency!=="annual"?"#fff":sc,fontSize:13,cursor:"pointer",fontWeight:form.frequency!=="annual"?700:500}}>{L("Mensile")}</button><button onClick={function(){setField("frequency","annual");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:form.frequency==="annual"?(secondaryButtonColor||"#7F77DD"):(dark?"#252535":"#fff"),color:form.frequency==="annual"?"#fff":sc,fontSize:13,cursor:"pointer",fontWeight:form.frequency==="annual"?700:500}}>{L("Annuale")}</button></div><div style={{display:"grid",gridTemplateColumns:form.frequency==="annual"?"1fr 1fr":"1fr",gap:10}}>{form.frequency==="annual"&&<div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L("Mese")}</label><select value={form.annualMonth||1} onChange={function(e){setField("annualMonth",Number(e.target.value));}} style={inp}>{MONTHS_FULL.map(function(m,i){return <option key={i+1} value={i+1}>{L(m)}</option>;})}</select></div>}<div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L("Giorno")}</label><input type="number" min={form.frequency==="monthly"?0:1} max={31} value={form.dayOfMonth} onChange={function(e){setField("dayOfMonth",Number(e.target.value));}} style={inp}/></div></div>{form.rtype==="expense"?<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L('Categoria')}</label><select value={form.catId} onChange={function(e){setField("catId",e.target.value);}} style={inp}>{sCats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L('Metodo')}</label><select value={form.methodId} onChange={function(e){setField("methodId",e.target.value);}} style={inp}>{sMethods.map(function(m){return <option key={m.id} value={m.id}>{m.icon} {m.name}</option>;})}</select></div></div>:<div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L('Tipo entrata')}</label><select value={form.incomeType} onChange={function(e){setField("incomeType",e.target.value);}} style={inp}>{incomeTypes.map(function(it){return <option key={it.id} value={it.id}>{it.icon} {L(it.name)}</option>;})}</select></div>}<div style={{background:dark?"#252535":"#fff",border:"1px solid "+borderC,borderRadius:14,padding:12}}><Toggle label={L('Rateizza')} checked={!!form.rateizzato} onChange={function(){setField("rateizzato",!form.rateizzato);}}/>{form.rateizzato&&<RatePicker value={form.rate||12} onChange={function(n){setField("rate",n);}}/>}</div><div style={{display:"flex",gap:10,marginTop:4}}><Btn onClick={saveRecurring} disabled={!recurringFormValid} bg={recurringFormValid?(confirmButtonColor||"#378ADD"):"#A8A8A8"} style={{flex:1,padding:12,fontWeight:900}}>{editingId?L('Salva modifiche'):L('Crea ricorrente')}</Btn><Btn onClick={cancelForm} bg={dark?"#333":"#f0f0f0"} color={tc} style={{padding:"12px 16px"}}>{L('Annulla')}</Btn></div></div></div>;}
  function cardView(r){var isDelete=deleteId===r.id;var editing=editingId===r.id;var cat=catObj(r);var met=methodObj(r);return <div key={r.id} style={{background:cardBg,borderRadius:18,border:"1px solid "+borderC,padding:14,boxShadow:dark?"none":"0 2px 12px rgba(0,0,0,0.04)"}}><div style={{display:"flex",alignItems:"flex-start",gap:12}}><div style={{width:48,height:48,borderRadius:18,background:r.rtype==="income"?"#1D9E7522":"#E24B4A22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{recIcon(r)}</div><div style={{flex:1,minWidth:0}}><div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"flex-start"}}><div style={{minWidth:0}}><div style={{fontSize:15,fontWeight:900,color:tc,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.name}</div><div style={{fontSize:20,fontWeight:950,color:r.rtype==="income"?"#1D9E75":"#E24B4A",marginTop:2}}>{fmtAmt(r.amount,sym)}</div></div><span style={{fontSize:10,borderRadius:20,padding:"3px 9px",fontWeight:900,background:r.rtype==="income"?"#1D9E7522":"#E24B4A22",color:r.rtype==="income"?"#1D9E75":"#E24B4A",whiteSpace:"nowrap"}}>{typeLabel(r)}</span></div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:8}}>{chip(cat.icon,L(cat.name),dark?"#303044":"#F4F6FF",tc)}{r.rtype==="expense"&&met&&chip(met.icon,L(met.name),dark?"#303044":"#F4F6FF",tc)}{chip("🔁",dateText(r),dark?"#30263d":"#F1ECFF",dark?"#d7d0ff":"#6554D9")}{chip("✅",L('Confermate')+": "+((r.confirmed||[]).length),dark?"#173326":"#E8F8F0","#1D9E75")}{chip("⏭️",L('Saltate')+": "+((r.skipped||[]).length),dark?"#332d1d":"#FFF7DF","#B17900")}</div></div></div>{editing&&formBox(true)}{!editing&&<div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:12,flexWrap:"wrap"}}><button onClick={function(){startEdit(r);}} style={{background:dark?"#24213a":"#EEF4FF",border:"1px solid "+(dark?"#3d376a":"#BFD7FF"),borderRadius:10,padding:"8px 10px",cursor:"pointer",color:dark?"#BEB8FF":"#378ADD",fontSize:12,fontWeight:900}}>✏️ {L('Modifica')}</button><button onClick={function(){setDeleteId(r.id);setShowForm(false);setEditingId(null);}} style={{background:dark?"#3a1a1a":"#FFF0F0",border:"1px solid "+(dark?"#6a3030":"#FFD0D0"),borderRadius:10,padding:"8px 10px",cursor:"pointer",color:"#E24B4A",fontSize:12,fontWeight:900}}>🗑 {L('Elimina')}</button></div>}{isDelete&&<div style={{marginTop:12,background:dark?"#3a1a1a":"#fff0f0",border:"1px solid "+(dark?"#6a3030":"#ffd0d0"),borderRadius:14,padding:12,display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}><div style={{flex:1,minWidth:190}}><div style={{fontSize:13,fontWeight:900,color:"#E24B4A"}}>{L('Eliminare questa ricorrente?')}</div><div style={{fontSize:12,color:dark?"#f0bbbb":"#8a4a4a",marginTop:2}}>{L('Le uscite/entrate già presenti nello storico resteranno salvate.')}</div></div><Btn onClick={function(){deleteRecurring(r.id);}} bg="#E24B4A" style={{padding:"8px 14px",fontWeight:900}}>{L('Elimina')}</Btn><Btn onClick={function(){setDeleteId(null);}} bg={dark?"#333":"#fff"} color={tc} style={{padding:"8px 14px"}}>{L('Annulla')}</Btn></div>}</div>;}
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {toast&&<Toast msg={toast.msg} color={toast.color} onDone={function(){setToast(null);}}/>}
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:900,color:tc}}>{L('Transazioni ricorrenti')}</div><div style={{fontSize:12,color:sc,marginTop:2}}>{L('Le modifiche valgono solo per le prossime conferme. Lo storico già generato non viene toccato.')}</div></div><Btn onClick={startCreate} bg={confirmButtonColor} style={{padding:"7px 12px",fontWeight:700,fontSize:12,borderRadius:10,flexShrink:0,whiteSpace:"nowrap"}}>{L('+ Nuova')}</Btn></div>
    {pending.length>0?<div style={{background:dark?"#342b16":"#FFF8E1",borderRadius:16,border:"1px solid "+(dark?"#6a5520":"#FFD54F"),padding:14}}><div style={{fontSize:13,fontWeight:900,color:dark?"#ffd58a":"#856404",marginBottom:10}}>{L('Da confermare per')} {(ctx.monthFullName?ctx.monthFullName(now.getMonth()):L(MONTHS_FULL[now.getMonth()]))}:</div>{pending.map(function(r){var cat=catObj(r);return <div key={r.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8,flexWrap:"wrap",background:dark?"#252535":"#fff",borderRadius:12,padding:"10px 12px",border:"1px solid "+borderC}}><div style={{width:38,height:38,borderRadius:14,background:r.rtype==="income"?"#1D9E7522":"#E24B4A22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:18}}>{recIcon(r)}</div><div style={{flex:1,minWidth:160}}><div style={{fontSize:14,fontWeight:900,color:tc}}>{r.name}</div><div style={{fontSize:12,color:sc}}>{fmtAmt(r.amount,sym)} · {cat.icon} {L(cat.name)} · {dateText(r)}</div></div><Btn onClick={function(){confirmOne(r);}} bg="#1D9E75" style={{padding:"7px 12px",fontSize:12}}>✅ {L('Conferma')}</Btn><Btn onClick={function(){skipRecurring(r);}} bg={dark?"#333":"#f0f0f0"} color={tc} style={{padding:"7px 12px",fontSize:12}}>⏭️ {L('Salta')}</Btn></div>;})}</div>:<div style={{background:dark?"#153025":"#e8f8f0",borderRadius:14,padding:"12px 16px",fontSize:13,color:"#1D9E75",fontWeight:800}}>{L("Nessuna entrata o uscita ricorrente")}</div>}
    {showForm&&!editingId&&formBox(false)}
    <div style={{display:"flex",flexDirection:"column",gap:10}}>{recurring.length===0&&<div style={{fontSize:13,color:"#ccc",textAlign:"center",padding:"24px 0"}}>{L('Nessuna ricorrente configurata.')}</div>}{recurring.map(cardView)}</div>
  </div>;
}
export function GoalsPanel(){
  var ctx=useApp();var t=ctx.t,goals=ctx.goals,setGoals=ctx.setGoals,sym=ctx.sym,dark=ctx.dark,btnRadius=ctx.btnRadius;
  var canAddPlanItem=ctx.canAddPlanItem,upgradeMessage=ctx.upgradeMessage,setToast=ctx.setToast,setTab=ctx.setTab,setSettingsPage=ctx.setSettingsPage,planRemaining=ctx.planRemaining,currentPlan=ctx.currentPlan,planLabel=ctx.planLabel,lang=ctx.lang;
  var [showAdd,setShowAdd]=useState(false);var [editingGoalId,setEditingGoalId]=useState(null);var [addAmt,setAddAmt]=useState({});
  var blank={name:"",target:0,saved:0,deadline:"",icon:"🎯",color:"#7F77DD",period:"monthly"};var [form,setForm]=useState(blank);
  var inp={width:"100%",borderRadius:10,border:"1px solid "+(dark?"#444":"#ddd"),padding:"10px 12px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var lang=(ctx&&ctx.lang)||"it";
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  var V=t;
  var L=ctx.translateUiRuntimeText||function(x){return translateFainanceText?translateFainanceText(x,lang):x;};
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var cardBg=dark?"#252535":"#fff";
  function goalsAllowed(){return !canAddPlanItem||canAddPlanItem("goals",(goals||[]).length,1);}
  function openPlanInfoLocal(){if(setTab)setTab("settings");if(setSettingsPage)setSettingsPage("info");}
  function showGoalLimit(){
    if(setToast)setToast({
      text:upgradeMessage?upgradeMessage("goals",(goals||[]).length):"Hai raggiunto il numero massimo di obiettivi del tuo piano. Elimina un obiettivo oppure vai in Info per passare a un piano superiore.",
      type:"error",
      actionLabel:"Info"
    });
  }
  var goalFormValid=!!String(form.name||"").trim()&&Number(form.target)>0&&Number(form.saved||0)>=0;
  function addGoal(){if(!goalFormValid)return;if(editingGoalId){setGoals(function(p){return p.map(function(g){return g.id===editingGoalId?{...g,...form,id:g.id,target:parseFloat(form.target),saved:parseFloat(form.saved)||0}:g;});});setEditingGoalId(null);setForm(blank);setShowAdd(false);if(setToast)setToast(L("Obiettivo modificato correttamente"));return;}if(!goalsAllowed()){showGoalLimit();return;}setGoals(function(p){return [...p,{...form,id:Date.now(),target:parseFloat(form.target),saved:parseFloat(form.saved)||0}];});setForm(blank);setShowAdd(false);if(setToast)setToast(L("Obiettivo creato correttamente"));}
  function startEditGoal(g){setEditingGoalId(g.id);setForm({...blank,...g,target:String(g.target||0),saved:String(g.saved||0)});setShowAdd(true);}
  function cancelGoalForm(){setEditingGoalId(null);setForm(blank);setShowAdd(false);}
  function addSaving(gid){var v=parseFloat(addAmt[gid]);if(!v||v<=0)return;setGoals(function(p){return p.map(function(g){return g.id===gid?{...g,saved:Number(g.saved||0)+v}:g;});});setAddAmt(function(p){return{...p,[gid]:""};});if(setToast)setToast(L("Obiettivo modificato correttamente"));}
  function moveGoal(id,dir){setGoals(function(prev){var arr=prev.slice();var i=arr.findIndex(function(g){return g.id===id;});if(i<0)return prev;var j=i+dir;if(j<0||j>=arr.length)return prev;var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;return arr;});}
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div><div style={{fontSize:16,fontWeight:900,color:tc}}>🎯 {L("Obiettivi di risparmio")}</div>{planRemaining&&<div style={{fontSize:12,color:goalsAllowed()?sc:(dark?"#ffd58a":"#856404"),marginTop:2}}>{L("Disponibili")}: {planRemaining("goals",(goals||[]).length)===Infinity?L("illimitati"):planRemaining("goals",(goals||[]).length)}</div>}</div><Btn onClick={function(){if(!goalsAllowed()){showGoalLimit();return;}setEditingGoalId(null);setForm(blank);setShowAdd(function(s){return !s;});}} bg={goalsAllowed()?"#7F77DD":"#999"} style={{padding:"10px 18px",fontWeight:900}}>+ {L("Nuovo")}</Btn></div>
    {!goalsAllowed()&&<div style={{background:dark?"#342b16":"#FFF8E1",border:"1px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:14,padding:"12px 14px",fontSize:13,color:dark?"#ffd58a":"#856404",lineHeight:1.4}}>🔒 {L("Hai raggiunto il limite di obiettivi del piano")} {planLabel?planLabel(currentPlan,lang):L("attuale")}. <button onClick={openPlanInfoLocal} style={{background:"none",border:"none",padding:0,color:dark?"#FFE5A6":"#534AB7",fontWeight:900,cursor:"pointer"}}>{L("Cambia piano")}</button></div>}
    {showAdd&&<div style={{background:dark?"#252535":"#f9f9f9",borderRadius:14,border:"1px solid "+borderC,padding:18}}><div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L("Icona")}</label><div style={{display:"flex",flexWrap:"wrap",gap:3,maxWidth:200}}>{GOAL_ICONS.map(function(ic){return <button key={ic} onClick={function(){setForm(function(p){return{...p,icon:ic};});}} style={{fontSize:17,background:form.icon===ic?"#EEEDFE":"none",border:form.icon===ic?"1px solid #7F77DD":"1px solid transparent",borderRadius:6,padding:"2px 4px",cursor:"pointer"}}>{ic}</button>;})}</div></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:4}}>{L("Colore")}</label><div style={{display:"flex",flexWrap:"wrap",gap:4}}>{COLORS.slice(0,9).map(function(c){return <button key={c} onClick={function(){setForm(function(p){return{...p,color:c};});}} style={{width:22,height:22,background:c,border:form.color===c?"2px solid #333":"2px solid transparent",borderRadius:"50%",cursor:"pointer",padding:0}}/>;})}</div></div></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:10}}><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L('Nome')}</label><input value={form.name} onChange={function(e){setForm(function(p){return{...p,name:e.target.value};});}} style={inp} placeholder={L("es. Vacanza")}/></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Periodo")}</label><select value={form.period} onChange={function(e){setForm(function(p){return{...p,period:e.target.value};});}} style={inp}><option value="monthly">{L("Mensile")}</option><option value="annual">{L("Annuale")}</option></select></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>Target ({sym})</label><input type="number" value={form.target} onChange={function(e){setForm(function(p){return{...p,target:e.target.value};});}} style={inp}/></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Già risparmiato")}</label><input type="number" value={form.saved} onChange={function(e){setForm(function(p){return{...p,saved:e.target.value};});}} style={inp}/></div><div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Scadenza")}</label><input type="date" value={form.deadline} onChange={function(e){setForm(function(p){return{...p,deadline:e.target.value};});}} style={inp}/></div></div><div style={{display:"flex",gap:8}}><Btn onClick={addGoal} disabled={!goalFormValid} bg={goalFormValid?"#7F77DD":"#A8A8A8"}>{editingGoalId?L("Salva modifiche"):L("Crea")}</Btn><Btn onClick={cancelGoalForm} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"}>{t.cancel}</Btn></div></div>}
    {goals.length===0&&!showAdd&&<div style={{textAlign:"center",color:"#ccc",padding:"40px 0",fontSize:14}}>{L("Nessun obiettivo. Creane uno!")}</div>}
    <div style={{display:"flex",flexDirection:"column",gap:14}}>{goals.map(function(g,idx){var saved=Number(g.saved||0),target=Number(g.target||0),pct=target>0?Math.min(100,(saved/target)*100):0,done=pct>=100,daysLeft=null;if(g.deadline)daysLeft=Math.ceil((new Date(g.deadline)-new Date())/86400000);return <div key={g.id} style={{background:cardBg,borderRadius:16,border:"1px solid "+borderC,padding:16,position:"relative",overflow:"hidden",boxShadow:dark?"none":"0 4px 18px rgba(0,0,0,0.04)"}}><div style={{position:"absolute",top:0,left:0,width:pct+"%",height:4,background:done?"#1D9E75":g.color}}/><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:12,marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:12,minWidth:0}}><div style={{width:48,height:48,borderRadius:14,background:g.color+"22",display:"flex",alignItems:"center",justifyContent:"center",fontSize:24,flexShrink:0}}>{g.icon}</div><div style={{minWidth:0}}><div style={{fontSize:18,fontWeight:900,color:tc,lineHeight:1.12}}>{g.name}</div><div style={{fontSize:12,color:sc,marginTop:3}}>{L(g.period==="annual"?"Annuale":"Mensile")}{g.deadline&&" · "+(daysLeft>0?daysLeft+L("g"):L("Scaduto"))}</div></div></div><div style={{display:"flex",gap:5,alignItems:"center",flexShrink:0}}><button disabled={idx===0} onClick={function(){moveGoal(g.id,-1);}} style={{width:30,height:30,borderRadius:10,border:"1px solid "+borderC,background:dark?"#1e1e30":"#f8f8f8",color:idx===0?"#bbb":tc,cursor:idx===0?"default":"pointer"}}>↑</button><button disabled={idx===goals.length-1} onClick={function(){moveGoal(g.id,1);}} style={{width:30,height:30,borderRadius:10,border:"1px solid "+borderC,background:dark?"#1e1e30":"#f8f8f8",color:idx===goals.length-1?"#bbb":tc,cursor:idx===goals.length-1?"default":"pointer"}}>↓</button><button title={L("Modifica")} onClick={function(){startEditGoal(g);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>✏️</button><button title={L("Elimina")} onClick={function(){if(!window.confirm(L("Eliminare questo obiettivo?")))return;setGoals(function(p){return p.filter(function(x){return x.id!==g.id;});});if(setToast)setToast(L("Obiettivo eliminato correttamente"));}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",cursor:"pointer",color:"#E24B4A",fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>🗑️</button></div></div><div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",gap:10,marginBottom:6}}><span style={{fontSize:18,fontWeight:900,color:g.color}}>{fmtAmt(saved,sym)}</span><span style={{fontSize:14,color:sc}}>{L("di")} {fmtAmt(target,sym)}</span></div><div style={{background:dark?"#333":"#f0f0f0",borderRadius:8,height:9,overflow:"hidden"}}><div style={{background:done?"#1D9E75":g.color,height:9,borderRadius:8,width:pct+"%"}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:5,marginBottom:12}}><span style={{fontSize:12,color:done?"#1D9E75":sc,fontWeight:700}}>{done?L("Completato!"):Math.round(pct)+"%"}</span>{!done&&<span style={{fontSize:12,color:sc}}>{L("mancano")} {fmtAmt(Math.max(0,target-saved),sym)}</span>}</div>{!done&&<div style={{background:dark?"#1e1e30":"#F8FAFC",border:"1px solid "+(dark?"#444":"#E5E7EB"),borderRadius:14,padding:12}}><div style={{fontSize:12,color:sc,fontWeight:800,marginBottom:8}}>{L("Aggiungi importo risparmiato")}</div><div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) auto",gap:10,alignItems:"center"}}><label style={{display:"flex",alignItems:"center",gap:8,background:dark?"#252535":"#fff",border:"1px solid "+(dark?"#555":"#DADDE5"),borderRadius:12,padding:"0 12px",minWidth:0}}><span style={{fontSize:18,color:g.color,fontWeight:900}}>{sym}</span><input type="number" placeholder="0,00" value={addAmt[g.id]||""} onChange={function(e){setAddAmt(function(p){return{...p,[g.id]:e.target.value};});}} onKeyDown={function(e){if(e.key==="Enter"&&Number(addAmt[g.id])>0)addSaving(g.id);}} style={{width:"100%",border:"none",outline:"none",padding:"13px 0",fontSize:16,background:"transparent",color:tc,minWidth:0}}/></label><button onClick={function(){addSaving(g.id);}} disabled={!(Number(addAmt[g.id])>0)} style={{height:48,minWidth:116,border:"none",borderRadius:12,background:Number(addAmt[g.id])>0?g.color:"#A8A8A8",color:"#fff",fontSize:15,fontWeight:900,cursor:Number(addAmt[g.id])>0?"pointer":"not-allowed",boxShadow:Number(addAmt[g.id])>0?(dark?"none":"0 5px 14px "+g.color+"44"):"none"}}>+ {L("Aggiungi")}</button></div></div>}</div>;})}</div>
  </div>;
}
export function AlertsPanel(){
  var ctx=useApp();var t=ctx.t,alerts=ctx.alerts,setAlerts=ctx.setAlerts,cats=effectiveExpenseCats(ctx.cats),expenses=ctx.expenses,sym=ctx.sym,dark=ctx.dark,curMonthKey=ctx.curMonthKey,budgetPlan=ctx.budgetPlan,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups),setToast=ctx.setToast;
  function L(s){return translateFainanceText(s,(ctx&&ctx.lang)||"it");}
  var groups=effectiveExpenseGroups(expenseGroups);
  var canAddPlanItem=ctx.canAddPlanItem||function(){return true;};
  var upgradeMessage=ctx.upgradeMessage||function(){return L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione.");};
  var blank={name:"",type:"cat",catId:cats[0]?cats[0].id:1,groupId:groups[0]?groups[0].id:"casa",budget:"",triggerMode:"immediate",triggerPct:0,customText:"",period:"monthly"};
  var [showAdd,setShowAdd]=useState(false);var [editingId,setEditingId]=useState(null);var [form,setForm]=useState(blank);
  var inp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var lang=(ctx&&ctx.lang)||"it";
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  var V=t;
  var L=ctx.translateUiRuntimeText||function(x){return translateFainanceText?translateFainanceText(x,lang):x;};
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";
  function getPrefilledBudget(catId,groupId,tp){if(!budgetPlan||!budgetPlan.items)return "";if(tp==="cat"){var item=budgetPlan.items.find(function(i){return i.catId===Number(catId);});return item&&item.amount>0?String(item.amount):"";}var total=budgetPlan.items.filter(function(i){var c=cats.find(function(c){return c.id===i.catId;});return c&&c.group===groupId;}).reduce(function(a,i){return a+i.amount;},0);return total>0?String(total):"";}
  function nowYear(){return new Date().getFullYear();}
  function getSpent(al){var prefix=al.period==="annual"?String(nowYear()):curMonthKey;if(al.type==="cat")return expenses.filter(function(e){return Number(e.catId)===Number(al.catId)&&e.date.startsWith(prefix);}).reduce(function(a,e){return a+e.amount;},0);var gc=cats.filter(function(c){return c.group===al.groupId;}).map(function(c){return c.id;});return expenses.filter(function(e){return gc.includes(e.catId)&&e.date.startsWith(prefix);}).reduce(function(a,e){return a+e.amount;},0);}
  function isTriggered(al){var s=getSpent(al);return al.triggerMode==="immediate"?s>=al.budget:s>=al.budget*(1+(al.triggerPct||0)/100);}
  function getPct(al){var s=getSpent(al);return al.budget>0?Math.min(200,(s/al.budget)*100):0;}
  function normalizeForm(){return{...form,catId:Number(form.catId),budget:parseFloat(form.budget),triggerPct:parseFloat(form.triggerPct)||0};}
  var alertLimitReached=!editingId&&!canAddPlanItem("alerts",(alerts||[]).length,1);
  function LimitReachedBox(){return <div style={{background:dark?"#342b16":"#FFF8E1",border:"1px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:14,padding:"12px 14px",fontSize:13,color:dark?"#FFE5A6":"#856404",fontWeight:800,lineHeight:1.4}}>⚠️ {L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione.")}</div>;}
  var alertFormValid=!!String(form.name||"").trim()&&Number(form.budget)>0&&(form.type==="cat"?!!String(form.catId||"").trim():!!String(form.groupId||"").trim())&&(form.triggerMode!=="pct"||(Number(form.triggerPct)>=0&&Number(form.triggerPct)<=200));
  function saveAlert(){if(!alertFormValid)return;if(!editingId&&alertLimitReached){if(setToast)setToast({text:L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione."),type:"warning",color:"#EF9F27",icon:"⚠️"});return;}if(!form.name||!form.budget){if(setToast)setToast({text:L("Inserisci nome e budget dell’alert per proseguire."),type:"warning",color:"#EF9F27",icon:"⚠️"});return;}var clean=normalizeForm();if(editingId){setAlerts(function(p){return p.map(function(a){return a.id===editingId?{...a,...clean,id:editingId}:a;});});if(setToast)setToast(L("Alert modificato correttamente"));}else{setAlerts(function(p){return [...p,{...clean,id:Date.now()}];});if(setToast)setToast(L("Alert creato correttamente"));}setForm(blank);setEditingId(null);setShowAdd(false);}
  function startEdit(al){setForm({name:al.name||"",type:al.type||"cat",catId:al.catId||blank.catId,groupId:al.groupId||blank.groupId,budget:String(al.budget||""),triggerMode:al.triggerMode||"immediate",triggerPct:al.triggerPct||0,customText:al.customText||"",period:al.period||"monthly"});setEditingId(al.id);setShowAdd(true);}
  function cancelForm(){setForm(blank);setEditingId(null);setShowAdd(false);}
  function handleTypeChange(nt){var nb=getPrefilledBudget(form.catId,form.groupId,nt);setForm(function(p){return{...p,type:nt,budget:nb||p.budget};});}
  function handleCatChange(v){var nb=getPrefilledBudget(Number(v),form.groupId,"cat");setForm(function(p){return{...p,catId:Number(v),budget:nb||p.budget};});}
  function handleGroupChange(v){var nb=getPrefilledBudget(form.catId,v,"group");setForm(function(p){return{...p,groupId:v,budget:nb||p.budget};});}
  var triggered=alerts.filter(isTriggered).length;
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div style={{display:"flex",alignItems:"center",gap:8}}><div style={{fontSize:14,fontWeight:700,color:tc}}>🔔 {L("Alert di spesa")}</div>{triggered>0&&<span style={{background:"#E24B4A",color:"#fff",borderRadius:20,padding:"2px 8px",fontSize:12,fontWeight:600}}>{triggered} {L("attivi")}</span>}</div><Btn onClick={function(){if(alertLimitReached)return;setEditingId(null);setForm(blank);setShowAdd(function(s){return !s;});}} bg={alertLimitReached?"#999":"#E24B4A"} disabled={alertLimitReached}>+ {L("Nuovo alert")}</Btn></div>
    {alertLimitReached&&<LimitReachedBox/>}
    {showAdd&&!alertLimitReached&&<div style={{background:dark?"#252535":"#f9f9f9",borderRadius:14,border:"1px solid "+borderC,padding:18}}><div style={{fontSize:15,fontWeight:900,color:tc,marginBottom:12}}>{L(editingId?"Modifica alert":"Nuovo alert")}</div><div style={{display:"flex",flexDirection:"column",gap:10}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Nome alert")}</label><input value={form.name} onChange={function(e){setForm(function(p){return{...p,name:e.target.value};});}} style={inp} placeholder={L("es. Budget ristorante")}/></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Budget")} ({sym})</label><input type="number" value={form.budget} onChange={function(e){setForm(function(p){return{...p,budget:e.target.value};});}} style={inp} placeholder="200"/></div></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Periodo")}</label><div style={{display:"flex",gap:0,background:dark?"#333":"#f0f0f0",borderRadius:10,padding:3}}><button onClick={function(){setForm(function(p){return{...p,period:"monthly"};});}} style={{flex:1,padding:"7px",border:"none",borderRadius:8,background:form.period==="monthly"?(dark?"#555":"#fff"):"transparent",color:form.period==="monthly"?tc:sc,fontSize:13,cursor:"pointer"}}>{L("Mensile")}</button><button onClick={function(){setForm(function(p){return{...p,period:"annual"};});}} style={{flex:1,padding:"7px",border:"none",borderRadius:8,background:form.period==="annual"?(dark?"#555":"#fff"):"transparent",color:form.period==="annual"?tc:sc,fontSize:13,cursor:"pointer"}}>{L("Annuale")}</button></div></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Testo personalizzato")}</label><textarea value={form.customText} onChange={function(e){setForm(function(p){return{...p,customText:e.target.value};});}} style={{...inp,height:60,resize:"vertical"}} placeholder={L("es. Troppo al ristorante!")}/></div><div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Tipo soglia")}</label><div style={{display:"flex",gap:0,background:dark?"#333":"#f0f0f0",borderRadius:10,padding:3}}><button onClick={function(){handleTypeChange("cat");}} style={{flex:1,padding:"7px",border:"none",borderRadius:8,background:form.type==="cat"?(dark?"#555":"#fff"):"transparent",color:form.type==="cat"?tc:sc,fontSize:13,cursor:"pointer"}}>{L("Singola categoria")}</button><button onClick={function(){handleTypeChange("group");}} style={{flex:1,padding:"7px",border:"none",borderRadius:8,background:form.type==="group"?(dark?"#555":"#fff"):"transparent",color:form.type==="group"?tc:sc,fontSize:13,cursor:"pointer"}}>{L("Area")}</button></div></div>{form.type==="cat"?<div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L('Categoria')}</label><select value={form.catId} onChange={function(e){handleCatChange(e.target.value);}} style={inp}>{groups.map(function(g){return <optgroup key={g.id} label={g.name}>{safeCatsForGroup(cats,groups,g).map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</optgroup>;})}</select></div>:<div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Area")}</label><select value={form.groupId} onChange={function(e){handleGroupChange(e.target.value);}} style={inp}>{groups.map(function(g){return <option key={g.id} value={g.id}>{g.name}</option>;})}</select></div>}<div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>{L("Modalità attivazione")}</label><div style={{display:"flex",gap:0,background:dark?"#333":"#f0f0f0",borderRadius:10,padding:3}}><button onClick={function(){setForm(function(p){return{...p,triggerMode:"immediate"};});}} style={{flex:1,padding:"7px",border:"none",borderRadius:8,background:form.triggerMode==="immediate"?(dark?"#555":"#fff"):"transparent",color:form.triggerMode==="immediate"?tc:sc,fontSize:13,cursor:"pointer"}}>{L("Superamento immediato")}</button><button onClick={function(){setForm(function(p){return{...p,triggerMode:"pct"};});}} style={{flex:1,padding:"7px",border:"none",borderRadius:8,background:form.triggerMode==="pct"?(dark?"#555":"#fff"):"transparent",color:form.triggerMode==="pct"?tc:sc,fontSize:13,cursor:"pointer"}}>{L("Dopo % superamento")}</button></div></div>{form.triggerMode==="pct"&&<div><label style={{fontSize:11,color:sc,display:"block",marginBottom:3}}>% (es. 25 attiva al 125%)</label><input type="number" min={0} max={200} value={form.triggerPct} onChange={function(e){setForm(function(p){return{...p,triggerPct:e.target.value};});}} style={inp} placeholder="25"/></div>}<div style={{display:"flex",gap:8}}><Btn onClick={saveAlert} disabled={!alertFormValid} bg={alertFormValid?"#E24B4A":"#A8A8A8"}>{L(editingId?"Salva modifiche":"Crea alert")}</Btn><Btn onClick={cancelForm} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"}>{t.cancel}</Btn></div></div></div>}
    {alerts.length===0&&!showAdd&&<div style={{textAlign:"center",color:"#ccc",padding:"40px 0",fontSize:14}}>{L("Nessun alert configurato.")}</div>}
    {alerts.map(function(al){var spent=getSpent(al),p=getPct(al),trig=isTriggered(al),barColor=p>=100?"#E24B4A":p>=75?"#EF9F27":"#1D9E75";var cat2=al.type==="cat"?cats.find(function(c){return c.id===al.catId;}):null;var grp2=al.type==="group"?groups.find(function(g){return g.id===al.groupId;}):null;var label=al.type==="cat"?(cat2?cat2.icon+" "+cat2.name:"?"):("📂 "+(grp2?grp2.name:al.groupId));var tLabel=al.triggerMode==="immediate"?L("al 100%"):L("al ")+(100+(al.triggerPct||0))+"%";return <div key={al.id} style={{background:trig?(dark?"#3a1a1a":"#fff5f5"):(dark?"#252535":"#fff"),borderRadius:12,border:"1px solid "+(trig?"#fcc":borderC),padding:"14px 16px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6,gap:10}}><div style={{minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>{trig&&<span>⚠️</span>}<div style={{fontSize:14,fontWeight:700,color:trig?"#E24B4A":tc}}>{al.name}</div><span style={{fontSize:10,background:al.period==="annual"?"#EEF":"#EFE",color:al.period==="annual"?"#534AB7":"#1D9E75",borderRadius:10,padding:"1px 6px"}}>{L(al.period==="annual"?"Annuale":"Mensile")}</span></div><div style={{fontSize:11,color:sc,marginTop:2}}>{label} · {L("attiva")} {tLabel}</div>{al.customText&&<div style={{fontSize:12,color:trig?"#E24B4A":sc,marginTop:4,fontStyle:"italic"}}>"{al.customText}"</div>}</div><div style={{display:"flex",gap:6,flexShrink:0}}><button title={L("Modifica")} onClick={function(){startEdit(al);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",borderRadius:8,cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",fontWeight:700}}>✏️</button><button title={L("Elimina")} onClick={function(){if(!window.confirm(L("Eliminare questo alert?")))return;setAlerts(function(p){return p.filter(function(x){return x.id!==al.id;});});if(setToast)setToast(L("Alert eliminato correttamente"));}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",borderRadius:8,cursor:"pointer",color:"#E24B4A",fontSize:14,padding:"5px 8px",fontWeight:700}}>🗑️</button></div></div><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:600,color:barColor}}>{fmtAmt(spent,sym)}</span><span style={{fontSize:12,color:sc}}>{L("budget")} {fmtAmt(al.budget,sym)}</span></div><div style={{background:dark?"#333":"#f0f0f0",borderRadius:8,height:6}}><div style={{background:barColor,height:6,borderRadius:8,width:Math.min(100,p)+"%"}}/></div><div style={{fontSize:11,color:barColor,marginTop:3,textAlign:"right"}}>{Math.round(p)}%</div></div>;})}
  </div>;
}

export function BudgetPlanPanel(){
  var ctx=useApp();var cats=effectiveExpenseCats(ctx.cats),incomes=ctx.incomes,expenses=ctx.expenses,budgetPlan=ctx.budgetPlan,setBudgetPlan=ctx.setBudgetPlan,sym=ctx.sym,dark=ctx.dark,fmt=ctx.fmt,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups),curMonthKey=ctx.curMonthKey,isMobile=ctx.isMobile;
  var L=ctx.translateUiRuntimeText||function(s){return s;};
  var groups=effectiveExpenseGroups(expenseGroups);
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var cardBg=dark?"#252535":"#fff";
  var [savingToast,setSavingToast]=useState(false);
  var [showInfoTooltip,setShowInfoTooltip]=useState(false);

  var avgIncome=useMemo(function(){var cutoff=new Date();cutoff.setFullYear(cutoff.getFullYear()-1);var monthly={};incomes.forEach(function(i){if(new Date(i.date)>=cutoff){var mk=i.date.slice(0,7);monthly[mk]=(monthly[mk]||0)+i.amount;}});var ks=Object.keys(monthly);if(!ks.length)return 0;return ks.reduce(function(a,k){return a+monthly[k];},0)/ks.length;},[incomes]);

  var [manualIncome,setManualIncome]=useState(budgetPlan&&budgetPlan.manualIncome!=null?String(budgetPlan.manualIncome):"");
  var effectiveIncome=manualIncome!==""?parseFloat(manualIncome)||0:avgIncome;

  var initItems=useMemo(function(){return cats.map(function(c){var ex=budgetPlan&&budgetPlan.items?budgetPlan.items.find(function(i){return i.catId===c.id;}):null;return{catId:c.id,amount:ex?ex.amount:0,pct:ex?ex.pct||0:0};});},[cats]);
  var [items,setItems]=useState(initItems);
  useEffect(function(){setItems(cats.map(function(c){var ex=budgetPlan&&budgetPlan.items?budgetPlan.items.find(function(i){return i.catId===c.id;}):null;return{catId:c.id,amount:ex?ex.amount:0,pct:ex?ex.pct||0:0};}));},[cats.length]);
  useEffect(function(){setItems(function(prev){return prev.map(function(item){if(item.pct>0&&effectiveIncome>0){return{...item,amount:Math.round(effectiveIncome*item.pct/100*100)/100};}return item;});});},[effectiveIncome]);

  var totalAlloc=items.reduce(function(a,i){return a+i.amount;},0);
  var savingPlanned=Math.max(0,effectiveIncome-totalAlloc);
  var savingPct=effectiveIncome>0?(savingPlanned/effectiveIncome)*100:0;

  // Current month real saving
  var curMonthExp=useMemo(function(){return expenses.filter(function(e){return e.date.startsWith(curMonthKey);}).reduce(function(a,e){return a+e.amount;},0);},[expenses,curMonthKey]);
  var curMonthInc=useMemo(function(){return incomes.filter(function(i){return i.date.startsWith(curMonthKey);}).reduce(function(a,i){return a+i.amount;},0);},[incomes,curMonthKey]);
  var realSaving=curMonthInc-curMonthExp;
  var savingDiff=realSaving-savingPlanned;

  function updateAmt(catId,val){var n=parseFloat(val)||0;setItems(function(prev){return prev.map(function(i){if(i.catId!==catId)return i;var newPct=effectiveIncome>0?Math.round(n/effectiveIncome*10000)/100:0;return{...i,amount:n,pct:newPct};});});}
  function updatePct(catId,val){var pv=parseFloat(val)||0;var n=effectiveIncome>0?Math.round(effectiveIncome*pv/100*100)/100:0;setItems(function(prev){return prev.map(function(i){if(i.catId!==catId)return i;return{...i,amount:n,pct:pv};});});}
  function save(){setBudgetPlan({income:effectiveIncome,manualIncome:manualIncome!==""?parseFloat(manualIncome):null,items:items});setSavingToast(true);}

  var inp={borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:isMobile?"6px 6px":"7px 10px",fontSize:isMobile?12:13,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box",minWidth:0};
  var budgetGridCols=isMobile?"minmax(132px,1.35fr) minmax(78px,0.8fr) minmax(58px,0.6fr)":"1fr 130px 90px";
  var budgetGridGap=isMobile?"4px 5px":"4px 8px";
  var hasBudgetIncome=effectiveIncome>0;
  var pctBar=Math.min(100,effectiveIncome>0?(totalAlloc/effectiveIncome)*100:0);
  var barColor=pctBar>100?"#E24B4A":pctBar>80?"#EF9F27":"#1D9E75";

  var infoButtonStyle={width:24,height:24,borderRadius:"50%",border:"1px solid #BFD7FF",background:dark?"#1f2c42":"#EEF4FF",color:"#378ADD",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:900,cursor:"pointer",boxShadow:dark?"none":"0 2px 8px rgba(55,138,221,0.18)",userSelect:"none"};
  var infoPopupStyle={position:"absolute",top:30,left:0,background:dark?"#20263a":"#fff",border:"1px solid "+(dark?"#46506f":"#d6e4ff"),borderRadius:14,padding:"12px 14px",fontSize:13,color:tc,zIndex:20,boxShadow:"0 12px 32px rgba(0,0,0,0.18)",minWidth:250,maxWidth:320,lineHeight:1.45};

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {savingToast&&<Toast msg={L("Suddivisione salvata con successo!")} onDone={function(){setSavingToast(false);}} color="#7F77DD"/>}

    {/* ── RISPARMIO SECTION ── */}
    <div style={{background:dark?"#1a2a1e":"#edfaf3",borderRadius:14,border:"2px solid #1D9E75",padding:20}}>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
        <span style={{fontSize:20}}>💰</span>
        <div style={{fontSize:15,fontWeight:700,color:"#1D9E75"}}>{L("Risparmio pianificato")}</div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:14}}>
        <div style={{background:cardBg,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:11,color:sc,marginBottom:3}}>{L("Reddito di rif.")}</div>
          <div style={{fontSize:16,fontWeight:700,color:tc}}>{fmt(effectiveIncome)}</div>
        </div>
        <div style={{background:cardBg,borderRadius:10,padding:"12px 14px",textAlign:"center"}}>
          <div style={{fontSize:11,color:sc,marginBottom:3}}>{L("Totale allocato")}</div>
          <div style={{fontSize:16,fontWeight:700,color:"#E24B4A"}}>{fmt(totalAlloc)}</div>
        </div>
        <div style={{background:cardBg,borderRadius:10,padding:"12px 14px",textAlign:"center",border:"2px solid #1D9E75"}}>
          <div style={{fontSize:11,color:"#1D9E75",marginBottom:3,fontWeight:600}}>{L("Risparmio pianif.")}</div>
          <div style={{fontSize:16,fontWeight:700,color:"#1D9E75"}}>{fmt(savingPlanned)}</div>
          <div style={{fontSize:11,color:"#1D9E75"}}>{Math.round(savingPct)}% {L("del reddito")}</div>
        </div>
      </div>
      <div style={{background:cardBg,borderRadius:10,padding:"12px 14px",marginBottom:10}}>
        <div style={{fontSize:12,color:sc,marginBottom:6}}>{L("Confronto mese corrente")} ({curMonthKey})</div>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div>
            <div style={{fontSize:11,color:sc}}>{L("Risparmio reale")}</div>
            <div style={{fontSize:16,fontWeight:700,color:realSaving>=0?"#1D9E75":"#E24B4A"}}>{fmt(realSaving)}</div>
          </div>
          <div style={{fontSize:22,color:savingDiff>=0?"#1D9E75":"#E24B4A"}}>{savingDiff>=0?"✅":"⚠️"}</div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:11,color:sc}}>{L("Rispetto al piano")}</div>
            <div style={{fontSize:16,fontWeight:700,color:savingDiff>=0?"#1D9E75":"#E24B4A"}}>{savingDiff>=0?"+":""}{fmt(savingDiff)}</div>
          </div>
        </div>
      </div>
    </div>

    {/* ── REDDITO ── */}
    <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
      <div style={{fontSize:15,fontWeight:600,color:tc,marginBottom:14}}>📥 {L("Reddito mensile di riferimento")}</div>
      <div style={{display:"flex",alignItems:"center",gap:12,flexWrap:"wrap"}}>
        <div style={{flex:1,minWidth:200}}>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6,position:"relative"}}>
            <span style={{fontSize:13,color:sc}}>{L("Reddito di riferimento")}</span>
            <button type="button" aria-label={L("Informazioni")} onClick={function(){setShowInfoTooltip(function(v){return !v;});}} style={infoButtonStyle}>i</button>
            {showInfoTooltip&&<div style={infoPopupStyle}><div style={{fontSize:13,fontWeight:900,color:tc,marginBottom:4}}>ℹ {L("Reddito di riferimento")}</div><div style={{color:sc}}>{L("Media entrate mensili (ultimi 12 mesi)")}</div><div style={{fontWeight:900,color:"#1D9E75",fontSize:18,marginTop:6}}>{fmt(avgIncome)}</div></div>}
          </div>
          <div style={{fontSize:22,fontWeight:700,color:"#1D9E75",marginBottom:8}}>{fmt(effectiveIncome)}</div>
          <label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{L("Importo manuale")}:</label>
          <input type="number" placeholder={String(Math.round(avgIncome))} value={manualIncome} onChange={function(e){setManualIncome(e.target.value);}} style={{...inp,width:180}}/>
          {manualIncome!==""&&<button onClick={function(){setManualIncome("");}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:12,marginLeft:8}}>✕ {L("reset")}</button>}
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:12,color:sc,marginBottom:4}}>{L("Totale allocato")}</div>
          <div style={{fontSize:20,fontWeight:700,color:barColor}}>{fmt(totalAlloc)}</div>
          <div style={{fontSize:12,color:savingPlanned>0?"#1D9E75":"#aaa",marginTop:2}}>{L("Disponibile")}: {fmt(savingPlanned)}</div>
        </div>
      </div>
      <div style={{background:dark?"#333":"#f0f0f0",borderRadius:8,height:8,marginTop:12}}><div style={{background:barColor,height:8,borderRadius:8,width:pctBar+"%",transition:"width 0.3s"}}/></div>
      <div style={{fontSize:11,color:sc,marginTop:4}}>{Math.round(pctBar)}% {L("del reddito allocato")} · {L("risparmio pianificato")}: {Math.round(savingPct)}%</div>
    </div>

    {/* ── CATEGORIE ── */}
    <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
      <div style={{fontSize:15,fontWeight:600,color:tc,marginBottom:14}}>📊 {L("Suddivisione per categoria")}</div>
      <div style={{display:"grid",gridTemplateColumns:budgetGridCols,gap:budgetGridGap,marginBottom:8}}><div style={{fontSize:11,fontWeight:600,color:sc}}>{L("CATEGORIA")}</div><div style={{fontSize:11,fontWeight:600,color:sc,textAlign:"right"}}>{L("IMPORTO")} ({sym})</div><div style={{fontSize:11,fontWeight:600,color:sc,textAlign:"right"}}>% {L("REDDITO")}</div></div>
      {groups.map(function(g){var gc=safeCatsForGroup(cats,groups,g);if(!gc.length)return null;var gt=gc.reduce(function(a,c){var it=items.find(function(i){return i.catId===c.id;});return a+(it?it.amount:0);},0);return <div key={g.id} style={{marginBottom:12}}><div style={{fontSize:11,fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:1,marginBottom:6,paddingBottom:4,borderBottom:"1px solid "+borderC}}>{g.name} — {fmt(gt)}</div>{gc.map(function(c){var item=items.find(function(i){return i.catId===c.id;})||{amount:0,pct:0};var pctVal=item.pct||0;return <div key={c.id} style={{display:"grid",gridTemplateColumns:budgetGridCols,gap:budgetGridGap,alignItems:"center",marginBottom:4}}><div style={{display:"flex",alignItems:"center",gap:6,minWidth:0}}><span style={{fontSize:16,flexShrink:0}}>{c.icon}</span><span style={{fontSize:isMobile?12:13,color:tc,overflow:"visible",textOverflow:"clip",whiteSpace:isMobile?"normal":"nowrap",lineHeight:1.15,wordBreak:"break-word"}}>{L(c.name)}</span></div>{hasBudgetIncome?<input type="number" min={0} value={item.amount||""} onChange={function(e){updateAmt(c.id,e.target.value);}} placeholder="0" style={{...inp,textAlign:"right",padding:isMobile?"5px 5px":"5px 8px",width:"100%"}}/>:<div style={{fontSize:isMobile?12:13,color:sc,textAlign:"right",padding:isMobile?"5px 5px":"5px 8px"}}>—</div>}<input type="number" min={0} max={100} step={0.1} value={pctVal||""} onChange={function(e){updatePct(c.id,e.target.value);}} placeholder="0%" style={{...inp,textAlign:"right",padding:isMobile?"5px 5px":"5px 8px",width:"100%"}}/></div>;})}</div>;})}
      <Btn onClick={save} bg="#7F77DD" style={{marginTop:8,padding:"10px 24px",fontSize:14}}>Salva suddivisione</Btn>
    </div>
  </div>;
}

export function SettingsList({items,setItems,label,showGroup,showIcon,groupList,isMethod,allowArchive,usageScope}){
  var ctx=useApp();
  function L(v){return translateFainanceText(v,(ctx&&ctx.lang)||"it");}
  var t=ctx.t||{},dark=ctx.dark;
  var expenses=ctx.expenses||[],incomes=ctx.incomes||[],recurring=ctx.recurring||[];
  var gl=groupList||[];if(usageScope==="expenseCategory")gl=effectiveExpenseGroups(gl);
  var confirmButtonColor=ctx.confirmButtonColor||"#7F77DD";var btnRadius=ctx.btnRadius||14;
  var [newName,setNewName]=useState("");var [newColor,setNewColor]=useState(COLORS[0]);var [newGroup,setNewGroup]=useState(gl[0]?gl[0].id:"");var [newIcon,setNewIcon]=useState("📦");var [showCreate,setShowCreate]=useState(false);
  var [editId,setEditId]=useState(null);var [editName,setEditName]=useState("");var [editColor,setEditColor]=useState("");var [editGroup,setEditGroup]=useState(gl[0]?gl[0].id:"");var [editIcon,setEditIcon]=useState("📦");
  var inp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var baseBlocked=ctx.currentPlan==="free";var setToast=ctx.setToast;var groupIds=(gl||[]).map(function(g){return String(g.id);});
  function lockedWarn(){if(setToast)setToast({text:L("Funzione disponibile dal piano Base."),type:"warning",color:"#EF9F27",icon:"⚠️"});}
  function resetCreate(){setNewName("");setNewColor(COLORS[0]);setNewGroup(gl[0]?gl[0].id:"");setNewIcon("📦");setShowCreate(false);}
  function add(){if(baseBlocked){lockedWarn();return;}if(!newName.trim())return;var groupToSave=newGroup;if(showGroup&&usageScope==="expenseCategory"&&(!groupToSave||groupIds.indexOf(String(groupToSave))<0))groupToSave="altro";var nowIso=new Date().toISOString();setItems([...(items||[]),{id:Date.now(),name:newName.trim(),color:newColor,icon:newIcon,custom:true,createdAt:nowIso,updatedAt:nowIso,...(showGroup?{group:groupToSave}:{})}]);resetCreate();}
  function itemIsUsed(id){var sid=String(id);var current=(items||[]).find(function(i){return String(i&&i.id)===sid;})||{};function norm(v){try{return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ");}catch(e){return String(v||"").trim().toLowerCase().replace(/\s+/g," ");}}var names=[current.name,current.label,current.title].filter(Boolean).map(norm);function sameId(v){return String(v==null?"":v)===sid;}function sameName(v){var nv=norm(v);return !!nv&&names.indexOf(nv)>=0;}function activeRow(x){return x&&!x.deleted&&!x.archived&&String(x.status||"")!=="deleted"&&String(x.status||"")!=="archived";}var scope=usageScope||(isMethod?"method":"generic");if(scope==="method")return expenses.filter(activeRow).some(function(e){return sameId(e.methodId)||sameId(e.method)||sameName(e.methodName)||sameName(e.paymentMethodName)||sameName(e.paymentMethod);})||incomes.filter(activeRow).some(function(e){return sameId(e.methodId)||sameId(e.method)||sameName(e.methodName)||sameName(e.paymentMethodName)||sameName(e.paymentMethod);})||recurring.filter(activeRow).some(function(e){return sameId(e.methodId)||sameId(e.method)||sameName(e.methodName)||sameName(e.paymentMethodName)||sameName(e.paymentMethod);});if(scope==="expenseCategory")return expenses.filter(activeRow).some(function(e){return sameId(e.catId)||sameId(e.categoryId)||sameName(e.catName)||sameName(e.categoryName)||sameName(e.category)||sameName(e.cat);})||recurring.filter(activeRow).some(function(e){return String(e.rtype||"expense")!=="income"&&(sameId(e.catId)||sameId(e.categoryId)||sameName(e.catName)||sameName(e.categoryName)||sameName(e.category)||sameName(e.cat));});if(scope==="incomeCategory")return incomes.filter(activeRow).some(function(e){return sameId(e.type)||sameId(e.incomeType)||sameId(e.typeId)||sameId(e.catId)||sameId(e.categoryId)||sameName(e.typeName)||sameName(e.incomeTypeName)||sameName(e.categoryName)||sameName(e.category);})||recurring.filter(activeRow).some(function(e){return String(e.rtype||"")==="income"&&(sameId(e.incomeType)||sameId(e.type)||sameId(e.typeId)||sameId(e.catId)||sameId(e.categoryId)||sameName(e.typeName)||sameName(e.incomeTypeName)||sameName(e.categoryName)||sameName(e.category));});return false;}
  function isDefaultExpenseCategory(id){return usageScope==="expenseCategory"&&(DEFAULT_CATS||[]).some(function(c){return String(c.id)===String(id);});}
  function hardDeleteFromSettings(id){var nowIso=new Date().toISOString();var sid=String(id);setItems((items||[]).map(function(i){return String(i.id)===sid?{...i,archived:true,deleted:true,custom:true,userDeleted:true,deletedAt:nowIso,updatedAt:nowIso}:i;}));try{if(usageScope==="expenseCategory"){if(ctx.setCatOrder)ctx.setCatOrder(function(prev){return (prev||[]).filter(function(x){return String(x)!==sid;});});if(ctx.defaultExpenseCat&&String(ctx.defaultExpenseCat)===sid&&ctx.setDefaultExpenseCat)ctx.setDefaultExpenseCat("");if(ctx.setBudgetPlan)ctx.setBudgetPlan(function(prev){var bp=prev||{};return {...bp,items:(bp.items||[]).filter(function(b){return String(b.catId||b.categoryId||"")!==sid;})};});}else if(usageScope==="method"){if(ctx.setMethodOrder)ctx.setMethodOrder(function(prev){return (prev||[]).filter(function(x){return String(x)!==sid;});});if(ctx.defaultExpenseMethod&&String(ctx.defaultExpenseMethod)===sid&&ctx.setDefaultExpenseMethod)ctx.setDefaultExpenseMethod("");}else if(usageScope==="incomeCategory"){if(ctx.setIncomeTypeOrder)ctx.setIncomeTypeOrder(function(prev){return (prev||[]).filter(function(x){return String(x)!==sid;});});if(ctx.defaultIncomeType&&String(ctx.defaultIncomeType)===sid&&ctx.setDefaultIncomeType)ctx.setDefaultIncomeType("");}}catch(e){} }
  function del(id){if(baseBlocked){lockedWarn();return;}if(itemIsUsed(id)){if(setToast)setToast({text:L("Questa voce è usata in movimenti o ricorrenze attive. Prima accorpala o sposta i movimenti, poi potrai eliminarla."),type:"warning",color:"#EF9F27",icon:"⚠️"});return;}hardDeleteFromSettings(id);if(setToast)setToast({text:L("Cancellazione completata"),type:"success",icon:"🗑️"});}
  function startEdit(item){if(baseBlocked){lockedWarn();return;}setEditId(item.id);setEditName(item.name);setEditColor(item.color||COLORS[0]);setEditGroup(item.group||(gl[0]?gl[0].id:""));setEditIcon(item.icon||"📦");}
  function saveEdit(){if(baseBlocked){lockedWarn();return;}setItems((items||[]).map(function(i){return String(i.id)===String(editId)?{...i,name:editName,color:editColor,icon:editIcon,custom:true,updatedAt:new Date().toISOString(),...(showGroup?{group:editGroup}:{})}:i;}));setEditId(null);}
  function toggleArchive(id){if(baseBlocked){lockedWarn();return;}setItems((items||[]).map(function(i){return String(i.id)===String(id)?{...i,archived:!i.archived,custom:true,updatedAt:new Date().toISOString()}:i;}));}
  var grouped=showGroup&&gl.length?gl.map(function(g){return{...g,items:(items||[]).filter(function(c){var cg=String(c.group||"");return !c.deleted&&!c.archived&&(cg===String(g.id)||(usageScope==="expenseCategory"&&String(g.id)==="altro"&&(!cg||groupIds.indexOf(cg)<0)));})};}).concat([{id:"__archived",name:"Archiviati",items:(items||[]).filter(function(c){return !!c.archived&&!c.deleted;})}]):[{id:"_",name:"",items:(items||[]).filter(function(c){return !c.deleted;})}];
  function createButtonLabel(){var s=String(label||"Nuova voce");if(/^Aggiungi\s+metodo/i.test(s))return "Nuovo metodo di pagamento";if(/^Aggiungi\s+categoria/i.test(s))return "Nuova categoria";if(/^Aggiungi\s+voce/i.test(s))return "Nuova voce";if(/^Aggiungi\s+area/i.test(s))return "Nuova area";if(/^Aggiungi\s+/i.test(s))s=s.replace(/^Aggiungi\s+/i,"Nuova ");return s;}
  var createLabel=createButtonLabel();
  return <div>{grouped.map(function(g){if(!g.items.length)return null;return <div key={g.id}>{showGroup&&g.name&&<div style={{fontSize:11,fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:1,margin:"12px 0 6px"}}>{L(g.name)}</div>}{g.items.map(function(item){return <div key={item.id} style={{background:dark?"#252535":"#fff",borderRadius:10,border:"1px solid "+(dark?"#444":"#eee"),padding:"10px 12px",marginBottom:8,opacity:item.archived?0.6:1}}>{editId===item.id?<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>{showIcon&&<EmojiPicker value={editIcon} onChange={setEditIcon}/>}<input type="color" value={editColor} onChange={function(e){setEditColor(e.target.value);}} style={{width:32,height:32,padding:0,border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}/><input value={editName} onChange={function(e){setEditName(e.target.value);}} style={{...inp,flex:1,minWidth:80}} onKeyDown={function(e){if(e.key==="Enter")saveEdit();}}/>{showGroup&&gl.length>0&&<select value={editGroup} onChange={function(e){setEditGroup(e.target.value);}} style={{...inp,flex:1,minWidth:90}}>{gl.map(function(g2){return <option key={g2.id} value={g2.id}>{L(g2.name)}</option>;})}</select>}<Btn onClick={saveEdit} disabled={!String(editName||"").trim()} bg={String(editName||"").trim()?confirmButtonColor:"#A8A8A8"} style={{padding:"6px 10px",fontSize:13}}>{L(t.save||"Salva")}</Btn><Btn onClick={function(){setEditId(null);}} bg={dark?"#333":"#f0f0f0"} color={tc} style={{padding:"6px 10px",fontSize:13}}>{L("Annulla")}</Btn></div>:<div style={{display:"flex",alignItems:"center",gap:10}}>{showIcon&&<span style={{fontSize:18}}>{item.icon||"📦"}</span>}<div style={{width:12,height:12,borderRadius:"50%",background:item.color,flexShrink:0}}/><span style={{flex:1,fontSize:14,color:tc,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(item.name)}</span>{item.archived&&<span style={{fontSize:10,background:dark?"#333":"#f0f0f0",color:sc,borderRadius:10,padding:"1px 6px"}}>{L("Archiviato")}</span>}<button onClick={function(){startEdit(item);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",borderRadius:8,cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",fontWeight:700}}>✏️</button><button onClick={function(){toggleArchive(item.id);}} title={item.archived?L("Ripristina"):L("Archivia")} style={{background:"none",border:"none",cursor:"pointer",fontSize:15,color:"#bbb"}}>{item.archived?"📂":"🗂"}</button><button onClick={function(){del(item.id);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",borderRadius:8,cursor:"pointer",color:"#E24B4A",fontSize:14,padding:"5px 8px",fontWeight:700}}>🗑️</button></div>}</div>;})}</div>;})}<button type="button" onClick={function(){if(baseBlocked){lockedWarn();return;}setShowCreate(true);}} style={{width:"100%",marginTop:8,background:baseBlocked?"#EF9F27":confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"13px 16px",cursor:"pointer",fontSize:15,fontWeight:900,boxShadow:dark?"none":"0 6px 18px rgba(55,138,221,0.25)"}}>＋ {L(createLabel)}</button>{showCreate&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 16px 2vh",boxSizing:"border-box",overflowY:"auto"}}><div style={{width:"100%",maxWidth:520,background:dark?"#252535":"#fff",borderRadius:22,border:"1px solid "+borderC,boxShadow:"0 16px 60px rgba(0,0,0,0.35)",padding:18}}><div style={{fontSize:17,fontWeight:900,color:tc,marginBottom:12}}>{L(createLabel)}</div><div style={{display:"flex",flexDirection:"column",gap:12}}>{showIcon&&<div><div style={{fontSize:12,fontWeight:800,color:sc,marginBottom:6}}>{L("Icona")}</div><EmojiPicker value={newIcon} onChange={setNewIcon}/></div>}<div><div style={{fontSize:12,fontWeight:800,color:sc,marginBottom:6}}>{L("Colore")}</div><input type="color" value={newColor} disabled={baseBlocked} onChange={function(e){if(baseBlocked){lockedWarn();return;}setNewColor(e.target.value);}} style={{width:54,height:42,padding:0,border:"none",borderRadius:10,cursor:"pointer",background:"transparent"}}/></div><div><div style={{fontSize:12,fontWeight:800,color:sc,marginBottom:6}}>{L("Nome voce")}</div><input autoFocus placeholder={L("Nome voce")} value={newName} disabled={baseBlocked} onChange={function(e){if(baseBlocked){lockedWarn();return;}setNewName(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")add();}} style={{...inp,width:"100%"}}/></div>{showGroup&&gl.length>0&&<div><div style={{fontSize:12,fontWeight:800,color:sc,marginBottom:6}}>{L("Area")}</div><select value={newGroup} disabled={baseBlocked} onChange={function(e){if(baseBlocked){lockedWarn();return;}setNewGroup(e.target.value);}} style={{...inp,width:"100%"}}>{gl.map(function(g2){return <option key={g2.id} value={g2.id}>{L(g2.name)}</option>;})}</select></div>}</div><div style={{display:"flex",gap:8,marginTop:16}}><Btn onClick={add} disabled={baseBlocked||!String(newName||"").trim()} bg={!baseBlocked&&String(newName||"").trim()?confirmButtonColor:"#A8A8A8"} style={{flex:1,padding:12,fontWeight:900}}>{L("Salva")}</Btn><Btn onClick={resetCreate} bg={dark?"#333":"#f0f0f0"} color={tc}>{L("Annulla")}</Btn></div></div></div>}</div>;
}
export function AreasEditor({onlyPatrimonio}){var ctx=useApp();function L(v){return translateFainanceText(v,(ctx&&ctx.lang)||"it");}var expenseGroups=ctx.expenseGroups,setExpenseGroups=ctx.setExpenseGroups,incomeGroups=ctx.incomeGroups,setIncomeGroups=ctx.setIncomeGroups,methodGroups=ctx.methodGroups,setMethodGroups=ctx.setMethodGroups,patrimonioAreas=ctx.patrimonioAreas,setPatrimonioAreas=ctx.setPatrimonioAreas,dark=ctx.dark;var [areaTab,setAreaTab]=useState(onlyPatrimonio?"patrimonio":"expense");var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var cardBg=dark?"#252535":"#fff";var inp={width:"100%",borderRadius:8,border:"1px solid "+borderC,padding:"7px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:tc};
  var current=areaTab==="expense"?expenseGroups:areaTab==="income"?incomeGroups:areaTab==="method"?methodGroups:(patrimonioAreas||DEFAULT_PATRIMONIO_AREAS);
  var setCurrent=areaTab==="expense"?setExpenseGroups:areaTab==="income"?setIncomeGroups:areaTab==="method"?setMethodGroups:setPatrimonioAreas;
  var isPatrimonio=areaTab==="patrimonio";var baseBlocked=ctx.currentPlan==="free";var setToast=ctx.setToast;function lockedWarn(){if(setToast)setToast({text:"Funzione disponibile dal piano Base.",type:"warning",color:"#EF9F27",icon:"⚠️"});}
  var [newName,setNewName]=useState("");var [newColor,setNewColor]=useState(COLORS[0]);var [newIcon,setNewIcon]=useState("📋");
  function add(){if(baseBlocked){lockedWarn();return;}if(!newName.trim())return;var nitem=isPatrimonio?{id:"area_"+Date.now(),name:newName.trim(),color:newColor,icon:newIcon}:{id:"area_"+Date.now(),name:newName.trim(),color:newColor};setCurrent([...current,nitem]);setNewName("");}
  function del(id){if(baseBlocked){lockedWarn();return;}setCurrent(current.filter(function(g){return g.id!==id;}));}
  function rename(id,v){if(baseBlocked){lockedWarn();return;}setCurrent(current.map(function(g){return g.id===id?{...g,name:v}:g;}));}
  function recolor(id,v){if(baseBlocked){lockedWarn();return;}setCurrent(current.map(function(g){return g.id===id?{...g,color:v}:g;}));}
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:10,padding:3,marginBottom:4,flexWrap:"wrap"}}>
      {(onlyPatrimonio?[{id:"patrimonio",label:"💎 Patrimonio"}]:[{id:"expense",label:"💸 Uscite"},{id:"income",label:"💰 Entrate"},{id:"method",label:"💳 Metodi di pagamento"}]).map(function(tb){return <button key={tb.id} onClick={function(){setAreaTab(tb.id);}} style={{flex:1,padding:"8px",border:"none",borderRadius:8,background:areaTab===tb.id?(dark?"#444":"#fff"):"transparent",color:areaTab===tb.id?tc:sc,fontSize:12,cursor:"pointer",fontWeight:areaTab===tb.id?600:400,minWidth:80}}>{L(tb.label)}</button>;})}
    </div>
    {current.map(function(g){return <div key={g.id} style={{background:cardBg,borderRadius:10,border:"1px solid "+borderC,padding:"10px 12px",display:"flex",alignItems:"center",gap:8}}>
      {isPatrimonio&&<span style={{fontSize:18}}>{g.icon||"📋"}</span>}
      <input type="color" value={g.color} onChange={function(e){recolor(g.id,e.target.value);}} style={{width:28,height:28,padding:0,border:"none",borderRadius:6,cursor:"pointer",flexShrink:0}}/>
      <input value={g.name} onChange={function(e){rename(g.id,e.target.value);}} style={{...inp,flex:1}}/>
      <button onClick={function(){del(g.id);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",borderRadius:8,cursor:"pointer",color:"#E24B4A",fontSize:14,padding:"5px 8px",fontWeight:700}}>🗑️</button>
    </div>;})}
    <div onClick={function(){if(baseBlocked)lockedWarn();}} style={{background:baseBlocked?(dark?"#342b16":"#FFF8E1"):cardBg,borderRadius:10,border:"1.5px dashed "+(baseBlocked?(dark?"#6a5520":"#FFD54F"):(dark?"#555":"#ddd")),padding:"10px 12px"}}>
      <div style={{display:"flex",gap:8,alignItems:"center"}}>
        {isPatrimonio&&<EmojiPicker value={newIcon} onChange={setNewIcon}/>}
        <input type="color" value={newColor} disabled={baseBlocked} onChange={function(e){if(baseBlocked){lockedWarn();return;}setNewColor(e.target.value);}} style={{width:32,height:32,padding:0,border:"none",borderRadius:6,cursor:"pointer"}}/>
        <input placeholder={L("Nome area")} value={newName} disabled={baseBlocked} onChange={function(e){if(baseBlocked){lockedWarn();return;}setNewName(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")add();}} style={{...inp,flex:1}}/>
        <button onClick={add} disabled={baseBlocked||!String(newName||"").trim()} style={{background:!baseBlocked&&String(newName||"").trim()?"#333":"#A8A8A8",color:"#fff",border:"none",borderRadius:8,padding:"6px 12px",cursor:!baseBlocked&&String(newName||"").trim()?"pointer":"not-allowed",fontSize:20,lineHeight:1}}>+</button>
      </div>
    </div>
  </div>;
}


export function SortableRows({items,onChange,onMove,renderItem,emptyText}){
  var ctx=useApp();var dark=ctx.dark;
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var rowBg=dark?"#1e1e30":"#f9f9f9";
  function moveOne(i,dir){
    var arr=(items||[]).slice();
    var j=i+dir;
    if(j<0||j>=arr.length)return;
    var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;
    if(onMove){onMove(i,dir);return;}
    if(onChange)onChange(arr,i,j);
  }
  function btn(label,disabled,fn){return <button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();if(!disabled)fn();}} disabled={disabled} style={{border:"1px solid "+borderC,borderRadius:8,background:disabled?(dark?"#1b1b25":"#f2f2f2"):(dark?"#252535":"#fff"),color:tc,width:42,height:42,cursor:disabled?"not-allowed":"pointer",fontSize:16,opacity:disabled?0.35:1,flexShrink:0,fontWeight:800}}>{label}</button>;}
  if(!items||items.length===0)return <div style={{fontSize:13,color:sc,textAlign:"center",padding:"16px 0"}}>{emptyText||L("Nessuna voce")}</div>;
  return <div style={{display:"flex",flexDirection:"column",gap:8}}>{items.map(function(item,i){var id=item&&item.id!=null?String(item.id):String(i);return <div key={id} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:rowBg,borderRadius:10,border:"1px solid "+borderC,opacity:item.archived?0.55:1,minWidth:0}}>
    <div style={{flex:1,minWidth:0}}>{renderItem(item,i)}</div>
    {btn("▲",i===0,function(){moveOne(i,-1);})}
    {btn("▼",i===items.length-1,function(){moveOne(i,1);})}
  </div>;})}</div>;
}

export function PatrimonioSettingsPanel({forcedSection,allowEditing=true,onLocked}={}){
  var ctx=useApp();
  function L(v){return translateFainanceText(v,(ctx&&ctx.lang)||"it");}
  var patrimonioAreas=ctx.patrimonioAreas,setPatrimonioAreas=ctx.setPatrimonioAreas,patrimonioEntries=ctx.patrimonioEntries,setPatrimonioEntries=ctx.setPatrimonioEntries,patrimonioValues=ctx.patrimonioValues,setPatrimonioValues=ctx.setPatrimonioValues,patrimonioHistory=ctx.patrimonioHistory,setPatrimonioHistory=ctx.setPatrimonioHistory,patrimonioNotes=ctx.patrimonioNotes,setPatrimonioNotes=ctx.setPatrimonioNotes,patrimonioMode=ctx.patrimonioMode,setPatrimonioMode=ctx.setPatrimonioMode,dark=ctx.dark;
  var userKey=ctx.userKey||function(k){return k;};
  var areas=patrimonioAreas||DEFAULT_PATRIMONIO_AREAS;
  var entries=patrimonioEntries||DEFAULT_PATRIMONIO_ENTRIES;
  var [areaView,setAreaView]=useStorage(userKey("patrimonio_settings_area_view"),"list");
  var [entryView,setEntryView]=useStorage(userKey("patrimonio_settings_entry_view"),"list");
  var showPatrimonioLocalReorder=false;
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var cardBg=dark?"#252535":"#fff";var softBg=dark?"#1e1e30":"#f9f9f9";
  function LocalSegmented({items,value,onChange}){return <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3,marginBottom:12}}>{items.map(function(it){var active=value===it.id;var disabled=!!it.disabled;return <button type="button" key={it.id} disabled={disabled} onClick={function(){if(disabled){if(onLocked)onLocked();return;}onChange(it.id);}} style={{flex:1,padding:"9px 10px",border:"none",borderRadius:10,background:active?"linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#7FC8F8))":"transparent",color:active?"#fff":(disabled?(dark?"#666":"#aaa"):sc),fontSize:13,cursor:disabled?"not-allowed":"pointer",fontWeight:active?800:400,boxShadow:active?"0 3px 10px rgba(127,119,221,0.25)":"none",opacity:disabled?.6:1}}>{L(it.label)}{disabled?" 🔒":""}</button>;})}</div>;}
  function sectionTitle(icon,title,desc){return <div style={{marginBottom:12}}><div style={{fontSize:14,fontWeight:700,color:tc,marginBottom:3}}>{icon} {L(title)}</div><div style={{fontSize:12,color:sc,lineHeight:1.4}}>{L(desc)}</div></div>;}
  function lockedHint(){return allowEditing?null:<div onClick={function(){if(onLocked)onLocked();}} style={{fontSize:12,color:dark?"#ffd58a":"#856404",background:dark?"#342b16":"#FFF8E1",border:"1px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:10,padding:"8px 10px",marginTop:10,lineHeight:1.35,cursor:"pointer"}}>{L("🔒 Creazione, modifica, eliminazione e riordino disponibili dal piano Base.")}</div>;}
  function guardedSetItems(fn){return function(next){if(!allowEditing){if(onLocked)onLocked();return;}fn(next);};}
  function areaName(id){var a=areas.find(function(x){return x.id===id;});return a?a.name:"Area";}
  function normalizedEntries(){return entries.map(function(e){var a=areas.find(function(x){return x.id===e.areaId;})||areas[0]||{};return {...e,group:e.areaId||(a.id||""),color:e.color||(a.color||COLORS[0])};});}
  function setEntryItems(next){if(!allowEditing){if(onLocked)onLocked();return;}setPatrimonioEntries((next||[]).map(function(e){return {...e,areaId:e.group||e.areaId||(areas[0]?areas[0].id:""),group:undefined};}));}
  function moveAreas(i,dir){if(!allowEditing){if(onLocked)onLocked();return;}var j=i+dir;if(j<0||j>=areas.length)return;var arr=areas.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setPatrimonioAreas(arr);}
  function moveEntries(i,dir){if(!allowEditing){if(onLocked)onLocked();return;}var arr=normalizedEntries();var j=i+dir;if(j<0||j>=arr.length)return;var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setEntryItems(arr);}
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {(!forcedSection||forcedSection==="areas")&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>{sectionTitle("📂","Aree","Stessa interfaccia delle altre liste: modifica, archivia, cancella e riordina.")}{showPatrimonioLocalReorder&&<LocalSegmented items={[{id:"list",label:"Lista"},{id:"order",label:"Riordina",disabled:!allowEditing}]} value={areaView} onChange={setAreaView}/>} {(areaView==="list"||!showPatrimonioLocalReorder)&&<><SettingsList items={areas} setItems={guardedSetItems(setPatrimonioAreas)} label="Aggiungi area patrimonio" showIcon/>{lockedHint()}</>}{showPatrimonioLocalReorder&&areaView==="order"&&<SortableRows items={areas} onMove={moveAreas} renderItem={function(a){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>{a.icon||"📋"}</span><div style={{width:10,height:10,borderRadius:"50%",background:a.color||COLORS[0],flexShrink:0}}/><span style={{fontSize:13,color:tc,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.name}</span>{a.archived&&<span style={{fontSize:10,background:dark?"#333":"#f0f0f0",color:sc,borderRadius:10,padding:"1px 6px"}}>Archiviata</span>}</div>;}}/>}</div>}
    {(!forcedSection||forcedSection==="entries")&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>{sectionTitle("💎","Voci","Stessa interfaccia delle altre liste: modifica, archivia, cancella, riordina e associazione area.")}{showPatrimonioLocalReorder&&<LocalSegmented items={[{id:"list",label:"Lista"},{id:"order",label:"Riordina",disabled:!allowEditing}]} value={entryView} onChange={setEntryView}/>} {(entryView==="list"||!showPatrimonioLocalReorder)&&<><SettingsList items={normalizedEntries()} setItems={setEntryItems} label="Aggiungi voce patrimonio" showIcon showGroup groupList={areas}/>{lockedHint()}</>} {showPatrimonioLocalReorder&&entryView==="order"&&<SortableRows items={normalizedEntries()} onMove={moveEntries} renderItem={function(e){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18}}>{e.icon||"📦"}</span><div style={{width:10,height:10,borderRadius:"50%",background:e.color||COLORS[0],flexShrink:0}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:tc,fontWeight:600,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.name}</div><div style={{fontSize:11,color:sc,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{L(areaName(e.group||e.areaId))}{e.archived?" · "+L("Archiviata"):""}</div></div></div>;}}/>}</div>}
    {(!forcedSection||forcedSection==="mode")&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>{sectionTitle("⚙️","Modalità","Come vengono aggiornati i valori del patrimonio.")}<div style={{display:"flex",flexDirection:"column",gap:8}}>{[{id:"manuale",label:"Manuale",desc:"Inserisci i valori manualmente"},{id:"semi",label:"Semi-automatica ⚠️",desc:"Beta: collega ai metodi di pagamento"},{id:"entrambe",label:"Entrambe",desc:"Usa sia il manuale che il semi-auto"}].map(function(m){return <button key={m.id} onClick={function(){setPatrimonioMode(m.id);}} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 16px",border:"2px solid "+(patrimonioMode===m.id?"#378ADD":borderC),borderRadius:12,background:patrimonioMode===m.id?(dark?"#1a2535":"#e8f4ff"):softBg,cursor:"pointer",textAlign:"left"}}><div style={{width:18,height:18,borderRadius:"50%",border:"2px solid "+(patrimonioMode===m.id?"#378ADD":"#ccc"),background:patrimonioMode===m.id?"#378ADD":"transparent",flexShrink:0}}/><div><div style={{fontSize:13,fontWeight:600,color:tc}}>{L(m.label)}</div><div style={{fontSize:11,color:sc}}>{L(m.desc)}</div></div></button>;})}</div>{patrimonioMode!=="manuale"&&<div style={{marginTop:12,background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:8,padding:"10px 12px"}}><span style={{fontSize:12,color:"#856404"}}>{L("⚠️ La modalità semi-automatica è in beta. I valori potrebbero non essere precisi.")}</span></div>}</div>}
  </div>;
}

export function SortOrderPanel(){
  var ctx=useApp();
  var cats=effectiveExpenseCats(ctx.cats),setCats=ctx.setCats,methods=effectiveMethods(ctx.methods),catOrder=ctx.catOrder,setCatOrder=ctx.setCatOrder,methodOrder=ctx.methodOrder,setMethodOrder=ctx.setMethodOrder,catSortMode=ctx.catSortMode,setCatSortMode=ctx.setCatSortMode,methodSortMode=ctx.methodSortMode,setMethodSortMode=ctx.setMethodSortMode,dark=ctx.dark,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups);
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var cardBg=dark?"#252535":"#fff";
  var orderedCats=useMemo(function(){return sortedCats(cats,catOrder,"custom",expenseGroups);},[cats,catOrder,expenseGroups]);
  var orderedMethods=useMemo(function(){return sortedMethods(methods,methodOrder,"custom");},[methods,methodOrder]);

  function moveCat(i,dir){
    var arr=orderedCats.map(function(c){return c.id;});
    var j=i+dir;
    if(j<0||j>=arr.length)return;
    var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;
    setCatOrder(arr);
  }
  function moveMethod(i,dir){
    var arr=orderedMethods.map(function(m){return m.id;});
    var j=i+dir;
    if(j<0||j>=arr.length)return;
    var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;
    setMethodOrder(arr);
  }

  var sortModes=[{id:"group",label:"Per Aree"},{id:"custom",label:"Personalizzato"}];
  var btnStyle={background:"none",border:"1px solid "+borderC,borderRadius:6,padding:"2px 8px",cursor:"pointer",fontSize:14,color:tc};

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
      <div style={{fontSize:14,fontWeight:600,color:tc,marginBottom:4}}>{"💸 "+L("Ordine categorie uscite")}</div>
      {<SortableRows items={orderedCats} onMove={function(i,dir){var j=i+dir;if(j<0||j>=orderedCats.length)return;var arr=orderedCats.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setCatOrder(arr.map(function(c){return String(c.id);}));setCatSortMode("custom");setCats(arr.concat(cats.filter(function(c){return arr.findIndex(function(x){return String(x.id)===String(c.id);})<0;})));}} renderItem={function(c){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18,flexShrink:0}}>{c.icon}</span><span style={{flex:1,fontSize:13,color:tc,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{c.name}</span></div>;}}/>}
    </div>
    <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
      <div style={{fontSize:14,fontWeight:600,color:tc,marginBottom:4}}>{"💳 "+L("Ordine metodi di pagamento")}</div>
      {<SortableRows items={orderedMethods} onMove={function(i,dir){var j=i+dir;if(j<0||j>=orderedMethods.length)return;var arr=orderedMethods.slice();var tmp=arr[i];arr[i]=arr[j];arr[j]=tmp;setMethodOrder(arr.map(function(m){return String(m.id);}));setMethodSortMode("custom");setMethods(arr.concat(methods.filter(function(m){return arr.findIndex(function(x){return String(x.id)===String(m.id);})<0;})));}} renderItem={function(m){return <div style={{display:"flex",alignItems:"center",gap:10,minWidth:0}}><span style={{fontSize:18,flexShrink:0}}>{m.icon}</span><span style={{flex:1,fontSize:13,color:tc,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{m.name}</span></div>;}}/>}
    </div>
  </div>;
}
export function DeleteDataPanel(){
  var ctx=useApp();
  var expenses=ctx.expenses,setExpenses=ctx.setExpenses,incomes=ctx.incomes,setIncomes=ctx.setIncomes,cats=effectiveExpenseCats(ctx.cats),setCats=ctx.setCats,methods=effectiveMethods(ctx.methods),setMethods=ctx.setMethods,recurring=ctx.recurring,setRecurring=ctx.setRecurring,goals=ctx.goals,setGoals=ctx.setGoals,alerts=ctx.alerts,setAlerts=ctx.setAlerts,budgetPlan=ctx.budgetPlan,setBudgetPlan=ctx.setBudgetPlan,patrimonioValues=ctx.patrimonioValues,setPatrimonioValues=ctx.setPatrimonioValues,patrimonioHistory=ctx.patrimonioHistory,setPatrimonioHistory=ctx.setPatrimonioHistory,patrimonioNotes=ctx.patrimonioNotes,setPatrimonioNotes=ctx.setPatrimonioNotes,patrimonioAreas=ctx.patrimonioAreas,setPatrimonioAreas=ctx.setPatrimonioAreas,patrimonioEntries=ctx.patrimonioEntries,setPatrimonioEntries=ctx.setPatrimonioEntries,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups),setExpenseGroups=ctx.setExpenseGroups,incomeGroups=ctx.incomeGroups,setIncomeGroups=ctx.setIncomeGroups,customIncomeTypes=ctx.customIncomeTypes||[],setCustomIncomeTypes=ctx.setCustomIncomeTypes,incomeTypeOverrides=ctx.incomeTypeOverrides||{},setIncomeTypeOverrides=ctx.setIncomeTypeOverrides,methodGroups=ctx.methodGroups,setMethodGroups=ctx.setMethodGroups,appuntiDocuments=ctx.appuntiDocuments,setAppuntiDocuments=ctx.setAppuntiDocuments,appuntiNotes=ctx.appuntiNotes,setAppuntiNotes=ctx.setAppuntiNotes,bankCoords=ctx.bankCoords,setBankCoords=ctx.setBankCoords,creditCards=ctx.creditCards||[],setCreditCards=ctx.setCreditCards,debtCredits=ctx.debtCredits||[],setDebtCredits=ctx.setDebtCredits,shoppingCards=ctx.shoppingCards||[],setShoppingCards=ctx.setShoppingCards,shoppingItems=ctx.shoppingItems||[],setShoppingItems=ctx.setShoppingItems,shoppingAreas=ctx.shoppingAreas||[],setShoppingAreas=ctx.setShoppingAreas,shoppingAreaIcons=ctx.shoppingAreaIcons||{},setShoppingAreaIcons=ctx.setShoppingAreaIcons,shoppingBoughtColor=ctx.shoppingBoughtColor,setShoppingBoughtColor=ctx.setShoppingBoughtColor,dark=ctx.dark,dateFmt=ctx.dateFmt,fmt=ctx.fmt;
  var groups=effectiveExpenseGroups(expenseGroups);
  var incomeGroupList=(incomeGroups&&incomeGroups.length)?incomeGroups:DEFAULT_INCOME_GROUPS;
  var incomeTypeList=ctx.incomeTypes||getAllIncomeTypes(customIncomeTypes,incomeTypeOverrides);
  var [tab,setTab]=useState("sections");
  var [movType,setMovType]=useState("expense");
  var [mode,setMode]=useState("category");
  var [selCats,setSelCats]=useState([]);
  var [selIncomeTypes,setSelIncomeTypes]=useState([]);
  var [delFrom,setDelFrom]=useState("");
  var [delTo,setDelTo]=useState("");
  var [delSearch,setDelSearch]=useState("");
  var [selIds,setSelIds]=useState([]);
  var [sections,setSections]=useState([]);
  var [confirmDel,setConfirmDel]=useState(false);
  var [showPreview,setShowPreview]=useState(false);
  var lang=ctx.lang||"it";
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  var V=t;
  var L=ctx.translateUiRuntimeText||function(x){return translateFainanceText?translateFainanceText(x,lang):x;};
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";var borderC=dark?"#444":"#eee";var cardBg=dark?"#252535":"#fff";
  var inp={width:"100%",borderRadius:8,border:"1px solid "+borderC,padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:tc};
  var sectionOptions=[
    {id:"expenses",icon:"💸",label:L("Uscite"),count:expenses.length,clear:function(){setExpenses([]);}},
    {id:"incomes",icon:"💰",label:L("Entrate"),count:incomes.length,clear:function(){setIncomes([]);}},
    {id:"recurring",icon:"🔁",label:L("Ricorrenti"),count:recurring.length,clear:function(){setRecurring([]);}},
    {id:"goals",icon:"🎯",label:t.goals||"Obiettivi",count:goals.length,clear:function(){setGoals([]);}},
    {id:"alerts",icon:"🔔",label:t.alerts||"Alert",count:alerts.length,clear:function(){setAlerts([]);}},
    {id:"budget",icon:"📊",label:t.budget||"Budget",count:budgetPlan?1:0,clear:function(){setBudgetPlan(null);}},
    {id:"patrimonio",icon:"💎",label:L("Patrimonio"),count:Object.keys(patrimonioValues||{}).length+Object.keys(patrimonioHistory||{}).length,clear:function(){setPatrimonioValues({});setPatrimonioHistory({});setPatrimonioNotes({});}},
    {id:"appuntiDocs",icon:"📎",label:L("Documenti"),count:(appuntiDocuments||[]).length,clear:function(){setAppuntiDocuments([]);}},
    {id:"appuntiNotes",icon:"📝",label:L("Appunti"),count:(appuntiNotes||[]).length,clear:function(){setAppuntiNotes([]);}},
    {id:"bank",icon:"🏦",label:L("Coordinate bancarie"),count:(bankCoords||[]).length,clear:function(){setBankCoords([]);}},
    {id:"creditCards",icon:"💳",label:L("Carte di credito"),count:(creditCards||[]).length,clear:function(){setCreditCards&&setCreditCards([]);}},
    {id:"expenseCategories",icon:"🏷",label:L("Aree / Categorie Uscite"),count:(groups||[]).length+(cats||[]).length,clear:function(){setCats([]);if(setExpenseGroups)setExpenseGroups([]);}},
    {id:"incomeCategories",icon:"🏷",label:L("Aree / Categorie Entrate"),count:(incomeGroupList||[]).length+(incomeTypeList||[]).length,clear:function(){if(setIncomeGroups)setIncomeGroups([]);if(setCustomIncomeTypes)setCustomIncomeTypes([]);if(setIncomeTypeOverrides)setIncomeTypeOverrides({});}},
    {id:"methods",icon:"💳",label:L("Metodi pagamento"),count:methods.length,clear:function(){setMethods([]);if(setMethodGroups)setMethodGroups([]);}},
    {id:"patrimonioConfig",icon:"⚙️",label:L("Config. patrimonio"),count:(patrimonioAreas||[]).length+(patrimonioEntries||[]).length,clear:function(){setPatrimonioAreas([]);setPatrimonioEntries([]);}},
    {id:"debtCredits",icon:"💳",label:L("Debiti / Crediti"),count:(debtCredits||[]).length,clear:function(){setDebtCredits&&setDebtCredits([]);}},
    {id:"shopping",icon:"🧺",label:L("Spesa"),count:(shoppingCards||[]).length+(shoppingItems||[]).length+(shoppingAreas||[]).length,clear:function(){setShoppingCards&&setShoppingCards([]);setShoppingItems&&setShoppingItems([]);setShoppingAreas&&setShoppingAreas([]);setShoppingAreaIcons&&setShoppingAreaIcons({});}},
  ];
  function toggleSection(id){setSections(function(p){return p.includes(id)?p.filter(function(x){return x!==id;}):[...p,id];});}
  function toggleCat(id){setSelCats(function(p){return p.includes(id)?p.filter(function(x){return x!==id;}):[...p,id];});}
  function toggleIncomeType(id){setSelIncomeTypes(function(p){return p.includes(id)?p.filter(function(x){return x!==id;}):[...p,id];});}
  function baseMovements(){return movType==="expense"?expenses:incomes;}
  function getMovementsToDelete(){
    var list=baseMovements();
    if(mode==="all")return list.map(function(e){return e.id;});
    if(mode==="category"&&movType==="expense")return list.filter(function(e){return selCats.map(String).includes(String(e.catId));}).map(function(e){return e.id;});
    if(mode==="category"&&movType==="income")return list.filter(function(e){return selIncomeTypes.includes(e.type);}).map(function(e){return e.id;});
    if(mode==="date")return list.filter(function(e){return(!delFrom||e.date>=delFrom)&&(!delTo||e.date<=delTo);}).map(function(e){return e.id;});
    if(mode==="search")return selIds;
    return [];
  }
  function getToDeleteCount(){return sections.reduce(function(a,id){var s=sectionOptions.find(function(x){return x.id===id;});return a+(s?s.count:0);},0);}
  function runSearch(){var q=delSearch.trim().toLowerCase();if(!q)return;var list=baseMovements().filter(function(e){var c=movType==="expense"?cats.find(function(c){return c.id===e.catId;}):getAllIncomeTypes().find(function(t){return t.id===e.type;});return(e.desc||"").toLowerCase().includes(q)||(c?c.name:"").toLowerCase().includes(q);});setSelIds(list.map(function(e){return e.id;}));setShowPreview(true);}
  function previewItems(){var ids=new Set(getMovementsToDelete());return baseMovements().filter(function(e){return ids.has(e.id);}).slice(0,80);}
  function doDelete(){
    sectionOptions.filter(function(s){return sections.includes(s.id);}).forEach(function(s){s.clear();});
    setSections([]);setSelCats([]);setSelIncomeTypes([]);setDelFrom("");setDelTo("");setDelSearch("");setSelIds([]);setConfirmDel(false);setShowPreview(false);
  }
  var count=getToDeleteCount();
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:"10px 14px",fontSize:13,color:sc}}>{L("Elimina i dati per singola sezione.")}</div>
    {tab==="sections"&&<div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:14}}>
      
      <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:10,width:"100%"}}>{sectionOptions.map(function(s){return <label key={s.id} style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",borderRadius:14,border:"1px solid "+(sections.includes(s.id)?"#E24B4A":borderC),background:sections.includes(s.id)?"#fde8e8":cardBg,cursor:"pointer",minWidth:0,boxSizing:"border-box",boxShadow:sections.includes(s.id)?"0 4px 14px rgba(226,75,74,0.12)":"0 2px 8px rgba(0,0,0,0.03)"}}><input type="checkbox" checked={sections.includes(s.id)} onChange={function(){toggleSection(s.id);}} style={{accentColor:"#E24B4A",width:18,height:18,flexShrink:0}}/><span style={{fontSize:20,width:24,textAlign:"center",flexShrink:0}}>{s.icon}</span><span style={{flex:1,fontSize:14,color:tc,fontWeight:500,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"normal",lineHeight:1.25}}>{s.label}</span><span style={{fontSize:12,color:sc,flexShrink:0,minWidth:24,textAlign:"right"}}>{s.count}</span></label>;})}</div>
    </div>}
    {tab==="movements"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}><button onClick={function(){setMovType("expense");setSelIds([]);}} style={{flex:1,padding:"8px",border:"none",borderRadius:10,background:movType==="expense"?"#E24B4A":"transparent",color:movType==="expense"?"#fff":sc,fontSize:13,cursor:"pointer"}}>{L("Uscite")}</button><button onClick={function(){setMovType("income");setSelIds([]);}} style={{flex:1,padding:"8px",border:"none",borderRadius:10,background:movType==="income"?"#1D9E75":"transparent",color:movType==="income"?"#fff":sc,fontSize:13,cursor:"pointer"}}>{L("Entrate")}</button></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{[{id:"all",label:"Tutto",icon:""},{id:"category",label:"Per categoria",icon:"🏷"},{id:"date",label:"Per date",icon:"📅"},{id:"search",label:"Per testo",icon:"🔍"}].map(function(m){return <button key={m.id} onClick={function(){setMode(m.id);setConfirmDel(false);setShowPreview(false);}} style={{padding:"10px",border:"1px solid "+(mode===m.id?"#E24B4A":borderC),borderRadius:10,background:mode===m.id?"#fde8e8":cardBg,color:mode===m.id?"#E24B4A":tc,cursor:"pointer",textAlign:"left",fontSize:13}}><span style={{fontSize:18,marginRight:6}}>{m.icon}</span>{m.label}</button>;})}</div>
      {mode==="category"&&movType==="expense"&&<div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:14}}>{groups.map(function(g){var gc=safeCatsForGroup(cats,groups,g);return gc.length>0&&<div key={g.id}><div style={{fontSize:11,fontWeight:600,color:"#aaa",textTransform:"uppercase",letterSpacing:1,margin:"10px 0 6px"}}>{g.name}</div>{gc.map(function(c){var n=expenses.filter(function(e){return String(e.catId)===String(c.id);}).length;return <label key={c.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:selCats.includes(c.id)?"#fde8e8":"transparent",marginBottom:4}}><input type="checkbox" checked={selCats.map(String).includes(String(c.id))} onChange={function(){toggleCat(c.id);}} style={{accentColor:"#E24B4A",width:16,height:16}}/><span style={{fontSize:16}}>{c.icon}</span><span style={{fontSize:14,color:tc}}>{c.name}</span><span style={{marginLeft:"auto",fontSize:12,color:sc}}>{n+" "+L("voci")}</span></label>;})}</div>;})}</div>}
      {mode==="category"&&movType==="income"&&<div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:14}}>{getAllIncomeTypes().map(function(ti){var n=incomes.filter(function(e){return e.type===ti.id;}).length;return <label key={ti.id} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",borderRadius:8,cursor:"pointer",background:selIncomeTypes.includes(ti.id)?"#e8f8f0":"transparent",marginBottom:4}}><input type="checkbox" checked={selIncomeTypes.includes(ti.id)} onChange={function(){toggleIncomeType(ti.id);}} style={{accentColor:"#1D9E75",width:16,height:16}}/><span style={{fontSize:16}}>{ti.icon}</span><span style={{fontSize:14,color:tc}}>{ti.name}</span><span style={{marginLeft:"auto",fontSize:12,color:sc}}>{n+" "+L("voci")}</span></label>;})}</div>}
      {mode==="date"&&<div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:14,display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{L("Da")}</label><input type="date" value={delFrom} onChange={function(e){setDelFrom(e.target.value);}} style={inp}/></div><div><label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{L("A")}</label><input type="date" value={delTo} onChange={function(e){setDelTo(e.target.value);}} style={inp}/></div></div>}
      {mode==="search"&&<div style={{background:dark?"#1e1e30":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:14}}><div style={{display:"flex",gap:8}}><input placeholder="Cerca descrizione o categoria..." value={delSearch} onChange={function(e){setDelSearch(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")runSearch();}} style={{...inp,flex:1}}/><Btn onClick={runSearch}>Cerca</Btn></div><div style={{fontSize:12,color:sc,marginTop:8}}>La ricerca seleziona automaticamente i risultati trovati.</div></div>}
      {showPreview&&count>0&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:14,maxHeight:260,overflowY:"auto"}}>{previewItems().map(function(e){var c=movType==="expense"?cats.find(function(x){return x.id===e.catId;}):getAllIncomeTypes().find(function(x){return x.id===e.type;});return <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+borderC}}><span>{c?c.icon:"📦"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,color:tc,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{e.desc||c?.name||"-"}</div><div style={{fontSize:11,color:sc}}>{fmtDate(e.date,dateFmt)}</div></div><div style={{fontSize:13,fontWeight:500,color:movType==="expense"?"#E24B4A":"#1D9E75"}}>{fmt(e.amount)}</div></div>;})}</div>}
    </div>}
    {count>0&&!confirmDel&&<div style={{display:"flex",gap:10}}><Btn onClick={function(){setConfirmDel(true);}} bg="#E24B4A" style={{flex:1,padding:13,fontSize:14,fontWeight:600}}>Elimina ({count})</Btn></div>}
    {confirmDel&&<div style={{background:"#fff0f0",border:"1px solid #E24B4A",borderRadius:12,padding:14}}><div style={{fontSize:14,fontWeight:600,color:"#E24B4A",marginBottom:8}}>Conferma eliminazione</div><div style={{fontSize:13,color:"#555",marginBottom:14}}>Operazione non reversibile. Elementi interessati: <strong>{count}</strong>.</div><div style={{display:"flex",gap:10}}><Btn onClick={doDelete} bg="#E24B4A" style={{flex:1,padding:11,fontSize:14,fontWeight:600}}>{L('Conferma')}</Btn><Btn onClick={function(){setConfirmDel(false);}} bg="#f0f0f0" color="#555" style={{flex:1,padding:11,fontSize:14}}>{V.cancel}</Btn></div></div>}
    {count===0&&<div style={{fontSize:13,color:"#aaa",textAlign:"center",padding:"8px 0"}}>{L("Nessun dato selezionato")}</div>}
  </div>;
}
export function EditModal({item,isExp,onSave,onClose}){var ctx=useApp();var t=ctx.t,expenseGroups=effectiveExpenseGroups(ctx.expenseGroups),cats=sortedCats(effectiveExpenseCats(ctx.cats),ctx.catOrder,ctx.catSortMode,expenseGroups),methods=sortedMethods(effectiveMethods(ctx.methods),ctx.methodOrder,ctx.methodSortMode),incomeTypes=orderedIncomeTypesForContext(ctx),sym=ctx.sym,dark=ctx.dark,btnRadius=ctx.btnRadius;var groups=expenseGroups;var groupIds=(groups||[]).map(function(g){return String(g.id);});function catsForGroup(g){return (cats||[]).filter(function(c){var cg=String(c.group||"");return cg===String(g.id)||((!cg||groupIds.indexOf(cg)<0)&&String(g.id)==="altro");});}var [f,setF]=useState({...item});var editAmountInputRef=useRef(null);useEffect(function(){focusFainanceInput(editAmountInputRef,120);},[]);var inp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box",minWidth:0};var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";function L(s){return ctx.translateUiRuntimeText?ctx.translateUiRuntimeText(s):s;}var editMovementValid=parseMoney(f.amount)>0&&!!String(f.date||"").trim()&&(isExp?(!!String(f.catId||"").trim()&&!!String(f.methodId||"").trim()):!!String(f.type||((incomeTypes&&incomeTypes[0])?incomeTypes[0].id:"salario")).trim());function save(){if(!editMovementValid)return;var amount=parseMoney(f.amount);var payload={...f,amount:amount};if(isExp){payload.catId=f.catId;payload.methodId=f.methodId;}else{payload.type=f.type||((incomeTypes&&incomeTypes[0])?incomeTypes[0].id:"salario");}onSave(payload);}return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 16px 2vh",boxSizing:"border-box",overflowY:"auto"}} onClick={function(e){if(e.target===e.currentTarget)onClose();}}><div style={{background:dark?"#1e1e30":"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:440,maxHeight:"90vh",overflowY:"auto"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontSize:15,fontWeight:600,color:tc}}>Modifica {isExp?t.expenses:t.incomes}</div><button onClick={onClose} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#aaa"}}>x</button></div><div style={{display:"flex",flexDirection:"column",gap:12}}><div><label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{t.amount} ({sym})</label><input ref={editAmountInputRef} autoFocus type="text" inputMode="decimal" placeholder="_,__" value={f.amount} onChange={function(e){setF(function(p){return{...p,amount:e.target.value};});}} style={{...inp,fontSize:20,fontWeight:500}}/></div><div><label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{t.description}</label><input type="text" value={f.desc||""} onChange={function(e){setF(function(p){return{...p,desc:e.target.value};});}} style={inp}/></div>{isExp&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><div><label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{t.category}</label><select value={f.catId} onChange={function(e){setF(function(p){return{...p,catId:e.target.value};});}} style={inp}>{cats.map(function(c){return <option key={c.id} value={c.id}>{c.icon} {c.name}</option>;})}</select></div><div><label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{t.method}</label><select value={f.methodId} onChange={function(e){setF(function(p){return{...p,methodId:e.target.value};});}} style={inp}>{methods.map(function(m){return <option key={m.id} value={m.id}>{m.archived?"[Arch] ":""}{m.icon} {m.name}</option>;})}</select></div></div>}{!isExp&&<div><label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{L("Categoria entrata")}</label><select value={f.type||""} onChange={function(e){setF(function(p){return{...p,type:e.target.value};});}} style={inp}>{(incomeTypes||[]).map(function(it){return <option key={it.id} value={it.id}>{it.icon} {L(it.name)}</option>;})}</select></div>}<div><label style={{fontSize:12,color:sc,display:"block",marginBottom:4}}>{t.date}</label><DatePickerField value={f.date} onChange={function(v){setF(function(p){return{...p,date:v};});}}/></div><div style={{background:f.rateizzato?(dark?"#2a2a3e":"#EEEDFE"):(dark?"#252535":"#f5f5f5"),borderRadius:12,padding:12,border:f.rateizzato?"1px solid #AFA9EC":"1px solid "+(dark?"#444":"#eee")}}><Toggle label={t.instalment} checked={!!f.rateizzato} onChange={function(){setF(function(p){return{...p,rateizzato:!p.rateizzato};});}}/>{f.rateizzato&&<div style={{marginTop:8}}><div style={{fontSize:12,color:"#534AB7",marginBottom:4}}>{f.rate} {t.months} - {fmtAmt(parseMoney(f.amount)?parseMoney(f.amount)/f.rate:0,sym)}{t.perMonth}</div><RatePicker value={f.rate||12} direction={f.rateDirection||"forward"} onChange={function(n){setF(function(p){return{...p,rate:n};});}} onDirectionChange={function(d){setF(function(p){return{...p,rateDirection:d};});}}/></div>}</div><div style={{display:"flex",gap:10,marginTop:4}}><Btn onClick={save} disabled={!editMovementValid} bg={editMovementValid?(isExp?"#E24B4A":"#1D9E75"):"#A8A8A8"} style={{flex:1,padding:12,fontSize:14,fontWeight:600}}>{t.save}</Btn><Btn onClick={onClose} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#555"} style={{flex:1,padding:12,fontSize:14}}>{t.cancel}</Btn></div></div></div></div>;}

// ── IMPORT DATA ───────────────────────────────────────────────────────────────
export function ImportData(props:any={}){
  var ctx=useApp();
  var onBackupJsonText=props&&props.onBackupJsonText;
  var cats=effectiveExpenseCats(ctx.cats),setCats=ctx.setCats,methods=effectiveMethods(ctx.methods),setMethods=ctx.setMethods,addExpenses=ctx.addExpenses,addIncomes=ctx.addIncomes,dark=ctx.dark,sym=ctx.sym,setToast=ctx.setToast;
  var patrimonioEntries=ctx.patrimonioEntries,patrimonioHistory=ctx.patrimonioHistory,setPatrimonioHistory=ctx.setPatrimonioHistory,setPatrimonioNotes=ctx.setPatrimonioNotes,setPatrimonioEntries=ctx.setPatrimonioEntries;
  var incomeTypes=ctx.incomeTypes||getAllIncomeTypes(ctx.customIncomeTypes,ctx.incomeTypeOverrides),setCustomIncomeTypes=ctx.setCustomIncomeTypes;
  var pEntries=patrimonioEntries||DEFAULT_PATRIMONIO_ENTRIES;
  var [importType,setImportType]=useState("expense");var [step,setStep]=useState(0);var [rows,setRows]=useState<any[]>([]);var [cols,setCols]=useState<any[]>([]);var [map,setMap]=useState<any>({date:"",amount:"",desc:"",cat:"",method:"",itype:"",rate:"",entryId:"",monthKey:"",patNote:""});var [importDateFmt,setImportDateFmt]=useState("auto");var [preview,setPreview]=useState<any[]>([]);var [msg,setMsg]=useState("");var [importSuccess,setImportSuccess]=useState<any>(null);var [importLoading,setImportLoading]=useState<any>(null);
  var [unknowns,setUnknowns]=useState<any>({expenseCategory:[],paymentMethod:[],incomeType:[],patrimonioEntry:[]});
  var [unknownDecision,setUnknownDecision]=useState("create");
  var [replacementMap,setReplacementMap]=useState<any>({});
  var fileRef=useRef<any>();
  useEffect(function(){
    try{
      loadFainanceExternalScript("https://apis.google.com/js/api.js","fainance-google-api-client").then(function(){
        try{var gapi=(window as any).gapi;if(gapi&&gapi.load)gapi.load("picker",{callback:function(){}});}
        catch(e){}
      }).catch(function(){});
    }catch(e){}
  },[]);
  var sinp={borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"6px 10px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};
  var tc=dark?"#eee":"#333";var sc=dark?"#aaa":"#888";
  function L(s){return ctx.translateUiRuntimeText?ctx.translateUiRuntimeText(s):s;}
  function looksLikeBackupJsonText(text){
    var raw=String(text||"").replace(/^\uFEFF/,"").trim();
    if(!raw||!(raw.charAt(0)==="{"||raw.charAt(0)==="["))return false;
    return /"(expenses|incomes|exp_v10|inc_v10|fainanceBackup|backup|userData|patrimonioValues|budgetPlan|shareProjects|debtCredits|shoppingCards|shoppingItems|shoppingLists)"\s*:/.test(raw);
  }
  function importBackupJsonFromGenericPicker(text,fileName){
    if(!onBackupJsonText)return false;
    if(!/\.json$/i.test(String(fileName||""))&&!looksLikeBackupJsonText(text))return false;
    return Promise.resolve(onBackupJsonText(text,fileName)).then(function(){setImportLoading(null);setMsg("");setStep(0);return true;});
  }
  function resetAll(){setStep(0);setRows([]);setCols([]);setPreview([]);setUnknowns({expenseCategory:[],paymentMethod:[],incomeType:[],patrimonioEntry:[]});setReplacementMap({});setUnknownDecision("create");setMap({date:"",amount:"",desc:"",cat:"",method:"",itype:"",rate:"",entryId:"",monthKey:"",patNote:""});setImportLoading(null);setMsg("");}
  function setImportProgress(file,stage,pct){setImportLoading({file:file||"",stage:L(stage),pct:Math.max(0,Math.min(100,Math.round(pct||0)))});}
  function finishImportLoad(file){setImportProgress(file||"", "File caricato", 100);setTimeout(function(){setImportLoading(null);},250);}
  function applyImportedRows(data,fileName){
    var clean=(data||[]).map(function(r){return Array.isArray(r)?r.map(function(c){return c==null?"":String(c);}) : [];}).filter(function(r){return r.some(function(c){return String(c||"").trim()!=="";});});
    if(!clean||clean.length<2){setImportLoading(null);setMsg(L("Nessun dato trovato nel foglio selezionato."));return false;}
    var header=(clean[0]||[]).map(function(h,i){var v=String(h||"").trim();return v||(L("Colonna")+" "+(i+1));});
    var body=clean.slice(1).filter(function(r){return r.some(function(c){return c!==undefined&&c!==null&&String(c).trim()!=="";});});
    if(!body.length){setImportLoading(null);setMsg(L("Nessuna riga dati trovata nel foglio selezionato."));return false;}
    setImportProgress(fileName||"Drive","Preparazione colonne",92);
    setCols(header);setRows(body);setPreview([]);setUnknowns({expenseCategory:[],paymentMethod:[],incomeType:[],patrimonioEntry:[]});setReplacementMap({});setUnknownDecision("create");setMap({date:"",amount:"",desc:"",cat:"",method:"",itype:"",rate:"",entryId:"",monthKey:"",patNote:""});setStep(1);setMsg("");finishImportLoad(fileName||"Drive");return true;
  }
  function base64ToArrayBuffer(b64){var bin=atob(String(b64||""));var len=bin.length;var bytes=new Uint8Array(len);for(var i=0;i<len;i++)bytes[i]=bin.charCodeAt(i);return bytes.buffer;}
  function base64ToText(b64){try{return new TextDecoder("utf-8").decode(new Uint8Array(base64ToArrayBuffer(b64)));}catch(e){return atob(String(b64||""));}}
  function parseImportedDelimitedText(text){var raw=String(text||"").replace(/^\uFEFF/,"");var first=(raw.split(/\r?\n/).find(function(l){return l.trim();})||"");if(first.indexOf("\t")>=0&&first.indexOf(",")<0&&first.indexOf(";")<0)raw=raw.replace(/\t/g,";");return parseCSVText(raw);}
  function parseImportMoney(value){
    if(typeof value==="number"&&isFinite(value))return value;
    var raw=String(value==null?"":value).trim();
    if(!raw)return NaN;
    var neg=/^\s*-|\(.*\)/.test(raw);
    var s=raw.replace(/[^0-9,.'\-]/g,"").replace(/'/g,"").replace(/-/g,"");
    if(!s)return NaN;
    var lastComma=s.lastIndexOf(",");
    var lastDot=s.lastIndexOf(".");
    function onlyDigits(x){return String(x||"").replace(/\D/g,"");}
    var out="";
    if(lastComma>=0&&lastDot>=0){
      var decSep=lastComma>lastDot?",":".";
      var thouSep=decSep===","?".":",";
      out=s.split(thouSep).join("").replace(decSep,".");
    }else if(lastComma>=0){
      var parts=s.split(",");
      var tail=parts[parts.length-1]||"";
      if(parts.length>2){out=parts.join("");}
      else if(tail.length===3&&(parts[0]||"").length<=3){out=parts.join("");}
      else {out=parts[0]+"."+tail;}
    }else if(lastDot>=0){
      var parts2=s.split(".");
      var tail2=parts2[parts2.length-1]||"";
      if(parts2.length>2){out=parts2.join("");}
      else if(tail2.length===3&&(parts2[0]||"").length<=3){out=parts2.join("");}
      else {out=parts2[0]+"."+tail2;}
    }else{out=onlyDigits(s);}
    var n=parseFloat(out);
    if(isNaN(n))return NaN;
    return neg?-Math.abs(n):n;
  }
  function parseImportedHtmlTable(text){
    try{
      var html=String(text||"");
      var doc2=null;
      if(typeof DOMParser!=="undefined")doc2=new DOMParser().parseFromString(html,"text/html");
      var table=doc2?doc2.querySelector("table"):null;
      if(table){
        var trs=Array.prototype.slice.call(table.querySelectorAll("tr"));
        var rows2=trs.map(function(tr){return Array.prototype.slice.call(tr.querySelectorAll("th,td")).map(function(td){return String((td.textContent||"")).replace(/\s+/g," ").trim();});}).filter(function(r){return r.some(function(c){return String(c||"").trim()!=="";});});
        return rows2;
      }
      var cleaned=html.replace(/<\/tr>/ig,"\n").replace(/<\/(td|th)>/ig,";").replace(/<[^>]+>/g," ").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">");
      return parseImportedDelimitedText(cleaned);
    }catch(e){return null;}
  }
  async function handleNativePickedSpreadsheet(res){
    if(!res||res.cancelled){setImportLoading(null);return;}
    var name=String(res.name||res.fileName||"Foglio Drive");
    var originalMime=String(res.mimeType||"");
    var exportMime=String(res.exportMimeType||"");
    var mime=(exportMime||originalMime||"");
    var b64=String(res.dataBase64||res.base64||"");
    if(!b64){setImportLoading(null);setMsg(L("Non riesco a leggere il file selezionato da Drive."));return;}
    setMsg("");setRows([]);setCols([]);setPreview([]);setImportSuccess(null);setStep(0);setImportProgress(name,"Analisi file",70);
    var ab=base64ToArrayBuffer(b64);
    var u8=new Uint8Array(ab);
    var looksZip=u8.length>=2&&u8[0]===0x50&&u8[1]===0x4B;
    var looksPdf=u8.length>=4&&u8[0]===0x25&&u8[1]===0x50&&u8[2]===0x44&&u8[3]===0x46;
    var isNativeGoogleSheet=/google-apps\.spreadsheet/i.test(originalMime)||/google-apps\.spreadsheet/i.test(exportMime)||!!res.isGoogleSheetNative;
    if(looksPdf){setImportLoading(null);setMsg(L("Drive ha consegnato il Foglio Google come PDF, non come tabella. Riprova selezionando il Foglio Google dall’elenco Drive oppure esportalo come .xlsx/.csv."));return;}
    var decodedText="";
    var isHtml=/html/i.test(mime)||/\.html?$/i.test(name);
    if(!looksZip){try{decodedText=base64ToText(b64);}catch(_e){decodedText="";}}
    if(!isHtml&&decodedText&&/^\s*(<!doctype\s+html|<html|<table)/i.test(decodedText))isHtml=true;
    if(isHtml){
      var parsedHtml=parseImportedHtmlTable(decodedText);
      if(!parsedHtml||parsedHtml.length<2){setImportLoading(null);setMsg(L("Il Foglio Google selezionato non ha fornito una tabella leggibile."));return;}
      applyImportedRows(parsedHtml,name);return;
    }
    var isCsv=/csv|comma-separated|text\/plain|text\/|tab-separated/i.test(mime)||/\.csv$/i.test(name)||(isNativeGoogleSheet&&!looksZip&&!looksPdf);
    if(isCsv){
      var parsed=parseImportedDelimitedText(decodedText||base64ToText(b64));
      if(!parsed||parsed.length<2){setImportLoading(null);setMsg(L("File CSV vuoto o non valido."));return;}
      applyImportedRows(parsed,name);return;
    }
    if(!looksZip){setImportLoading(null);setMsg(L("Formato file non supportato. Usa un file .xlsx, .xls o .csv."));return;}
    var data=await parseXLSXBuffer(ab);
    if(data&&data.__unsupported){setImportLoading(null);setMsg(L("Formato Excel non supportato. Salva il file come .xlsx oppure CSV e riprova."));return;}
    if(!data||data.length<2){setImportLoading(null);setMsg(L("Nessun dato nel file Excel."));return;}
    applyImportedRows(data,name);
  }
  function openImportPicker(){
    setMsg("");setImportLoading(null);
    try{if(fileRef.current)fileRef.current.value="";}catch(_clear){}
    if(fileRef.current)fileRef.current.click();
  }
  async function ensureGooglePickerLibraries(){
    await loadFainanceExternalScript("https://apis.google.com/js/api.js","fainance-google-api-client");
    var gapi=(window as any).gapi;
    if(!gapi)throw new Error("Google API non disponibile.");
    await new Promise(function(resolve,reject){
      try{gapi.load("picker",{callback:function(){resolve(true);},onerror:function(){reject(new Error("Google Picker non disponibile."));},timeout:12000,ontimeout:function(){reject(new Error("Timeout Google Picker."));}});}catch(e){reject(e);}
    });
    var google=(window as any).google;
    if(!google||!google.picker)throw new Error("Google Picker non disponibile.");
    return google;
  }
  async function requestNativeGoogleDriveFileToken(forceConsent?:boolean){
    try{
      var mod:any=await import("@capacitor-firebase/authentication");
      var FirebaseAuthentication=mod&&mod.FirebaseAuthentication;
      if(!FirebaseAuthentication||!FirebaseAuthentication.signInWithGoogle)throw new Error("Autenticazione Google nativa non disponibile.");
      var promptValue=forceConsent?"consent select_account":"select_account";
      var result=await FirebaseAuthentication.signInWithGoogle({
        scopes:["email","profile"].concat(GOOGLE_PICKER_SCOPE.split(/\s+/)),
        customParameters:[{key:"prompt",value:promptValue}]
      });
      var credData=result&&result.credential?result.credential:(result&&result.user?result.user:(result||{}));
      var token=credData.accessToken||credData.access_token||(result&&result.accessToken)||(result&&result.access_token)||"";
      if(!token)throw new Error("Token Google nativo non disponibile.");
      FAINANCE_GOOGLE_PICKER_TOKEN=token;
      return token;
    }catch(e){
      throw e;
    }
  }
  async function requestGooglePickerToken(google:any,forceConsent?:boolean){
    if(FAINANCE_GOOGLE_PICKER_TOKEN&&!forceConsent)return FAINANCE_GOOGLE_PICKER_TOKEN;
    try{
      return await requestNativeGoogleDriveFileToken(forceConsent);
    }catch(nativeErr){
      try{
        await loadFainanceExternalScript("https://accounts.google.com/gsi/client","fainance-google-gsi-client");
        var googleNow=(window as any).google||google;
        if(!googleNow||!googleNow.accounts||!googleNow.accounts.oauth2)throw nativeErr||new Error("Google Identity Services non disponibile.");
        return await new Promise(function(resolve,reject){
          try{
            var client=googleNow.accounts.oauth2.initTokenClient({
              client_id:GOOGLE_PICKER_CLIENT_ID,
              scope:GOOGLE_PICKER_SCOPE,
              prompt:forceConsent?"consent":"",
              callback:function(resp:any){
                if(resp&&resp.error){reject(new Error(resp.error_description||resp.error));return;}
                var token=resp&&resp.access_token;
                if(!token){reject(new Error("Token Google non disponibile."));return;}
                FAINANCE_GOOGLE_PICKER_TOKEN=token;
                resolve(token);
              }
            });
            client.requestAccessToken({prompt:forceConsent?"consent":""});
          }catch(e){reject(e);}
        });
      }catch(webErr){
        throw webErr||nativeErr;
      }
    }
  }
  async function getGooglePickerTokenWithConsent(google:any){
    try{return await requestGooglePickerToken(google,false);}catch(e){FAINANCE_GOOGLE_PICKER_TOKEN="";return await requestGooglePickerToken(google,true);}
  }
  async function googleSheetsFetchJson(url:string,token:any,retry?:boolean){
    var res=await fetch(url,{headers:{Authorization:"Bearer "+token}});
    if(res.status===401&&!retry){FAINANCE_GOOGLE_PICKER_TOKEN="";var google=(window as any).google;var tk=await requestGooglePickerToken(google,true);return await googleSheetsFetchJson(url,tk,true);}
    if(!res.ok){var txt="";try{txt=await res.text();}catch(e){}throw new Error(txt||("HTTP "+res.status));}
    return await res.json();
  }
  async function googleDriveFetchBlob(url:string,token:any,retry?:boolean){
    var res=await fetch(url,{headers:{Authorization:"Bearer "+token}});
    if(res.status===401&&!retry){FAINANCE_GOOGLE_PICKER_TOKEN="";var google=(window as any).google;var tk=await requestGooglePickerToken(google,true);return await googleDriveFetchBlob(url,tk,true);}
    if(!res.ok){var txt="";try{txt=await res.text();}catch(e){}throw new Error(txt||("HTTP "+res.status));}
    return await res.arrayBuffer();
  }
  async function importDriveSpreadsheetFile(fileId:string,fileName:string,mimeType:string,token:any){
    var name=String(fileName||"File Drive");
    var mime=String(mimeType||"");
    var id=encodeURIComponent(fileId);
    var isGoogleSheet=/google-apps\.spreadsheet/i.test(mime);
    if(isGoogleSheet){
      try{await importGoogleSheetById(fileId,name,token);return;}
      catch(sheetErr){
        setImportProgress(name,"Esportazione Foglio Google",62);
        var exportUrl="https://www.googleapis.com/drive/v3/files/"+id+"/export?mimeType="+encodeURIComponent("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        var exported=await googleDriveFetchBlob(exportUrl,token,false);
        var exportedRows=await parseXLSXBuffer(exported);
        if(!exportedRows||exportedRows.length<2)throw sheetErr;
        applyImportedRows(exportedRows,name);return;
      }
    }
    setImportProgress(name,"Download file Drive",52);
    var mediaUrl="https://www.googleapis.com/drive/v3/files/"+id+"?alt=media";
    var ab=await googleDriveFetchBlob(mediaUrl,token,false);
    var lower=name.toLowerCase();
    if(/\.csv$/.test(lower)||/csv|text\//i.test(mime)){
      var txt=new TextDecoder("utf-8").decode(new Uint8Array(ab));
      var parsed=parseImportedDelimitedText(txt);
      if(!parsed||parsed.length<2){setImportLoading(null);setMsg(L("File CSV vuoto o non valido."));return;}
      applyImportedRows(parsed,name);return;
    }
    if(/\.xlsx?$/.test(lower)||/spreadsheet|excel|vnd\.ms-excel/i.test(mime)){
      var data=await parseXLSXBuffer(ab);
      if(data&&data.__unsupported){setImportLoading(null);setMsg(L("Formato Excel non supportato. Salva il file come .xlsx oppure CSV e riprova."));return;}
      if(!data||data.length<2){setImportLoading(null);setMsg(L("Nessun dato nel file Excel."));return;}
      applyImportedRows(data,name);return;
    }
    setImportLoading(null);setMsg(L("Formato file non supportato. Usa un file .xlsx, .xls o .csv."));
  }
  async function importGoogleSheetById(fileId:string,fileName:string,token:any){
    setMsg("");setRows([]);setCols([]);setPreview([]);setImportSuccess(null);setStep(0);
    setImportProgress(fileName||"Google Sheets","Lettura Foglio Google",45);
    var base="https://sheets.googleapis.com/v4/spreadsheets/"+encodeURIComponent(fileId);
    var meta=await googleSheetsFetchJson(base+"?fields="+encodeURIComponent("sheets(properties(title,index,hidden))"),token,false);
    var sheets=((meta&&meta.sheets)||[]).map(function(s:any){return s&&s.properties?s.properties:null;}).filter(function(p:any){return p&&p.title&&!p.hidden;}).sort(function(a:any,b:any){return Number(a.index||0)-Number(b.index||0);});
    if(!sheets.length)throw new Error("Nessun foglio interno trovato.");
    var values:any=null;
    for(var i=0;i<sheets.length;i++){
      var title=String(sheets[i].title||"");
      setImportProgress(fileName||"Google Sheets","Lettura dati",55+i*8);
      var range="'"+title.replace(/'/g,"''")+"'!A1:ZZ10000";
      var data=await googleSheetsFetchJson(base+"/values/"+encodeURIComponent(range)+"?majorDimension=ROWS&valueRenderOption=UNFORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING",token,false);
      if(data&&data.values&&data.values.length>1){values=data.values;break;}
    }
    if(!values||values.length<2){setImportLoading(null);setMsg(L("Il Foglio Google selezionato non contiene righe dati leggibili."));return;}
    applyImportedRows(values,fileName||"Google Sheets");
  }
  async function openGoogleSheetsPicker(){
    setMsg("");setRows([]);setCols([]);setPreview([]);setImportSuccess(null);setStep(0);
    setImportProgress("Google Sheets","Preparazione Google Picker",5);
    try{
      var google:any=await ensureGooglePickerLibraries();
      setImportProgress("Google Sheets","Autorizzazione Google",18);
      var token:any=await getGooglePickerTokenWithConsent(google);
      setImportProgress("Google Sheets","Apertura Google Drive",30);
      await new Promise(function(resolve){
        var view=new google.picker.DocsView(google.picker.ViewId.SPREADSHEETS);
        try{view.setIncludeFolders(false);view.setSelectFolderEnabled(false);}catch(e){}
        var builder=new google.picker.PickerBuilder()
          .setDeveloperKey(GOOGLE_PICKER_API_KEY)
          .setOAuthToken(token)
          .setAppId(GOOGLE_PICKER_APP_ID)
          .addView(view)
          .setCallback(async function(data:any){
            try{
              if(data&&data.action===google.picker.Action.CANCEL){setImportLoading(null);resolve(true);return;}
              if(data&&data.action===google.picker.Action.PICKED&&data.docs&&data.docs[0]){
                var doc=data.docs[0];
                await importDriveSpreadsheetFile(String(doc.id||""),String(doc.name||doc.title||"Google Drive"),String(doc.mimeType||""),token);
                resolve(true);return;
              }
            }catch(e){setImportLoading(null);var detail=String((e&&e.message)||e||"");setMsg(L("Non riesco a leggere il file selezionato da Google Drive. Controlla che il file non sia vuoto e che l'autorizzazione Google sia attiva.")+(detail?"\n"+detail:""));resolve(true);}
          });
        try{builder.enableFeature(google.picker.Feature.SUPPORT_DRIVES);}catch(e){}
        var picker=builder.build();
        picker.setVisible(true);
      });
    }catch(e){setImportLoading(null);var m=String((e&&e.message)||e||"");setMsg(L("Non riesco ad aprire Google Sheets. Verifica che Google Picker API, Drive API e Sheets API siano abilitate, che il dominio sia autorizzato e che l’account Google abbia concesso l’accesso al file selezionato.")+(m?"\n"+m:""));}
  }
  function normName(v){return String(v==null?"":v).trim().toLowerCase();}
  function findByName(list,name){var n=normName(name);if(!n)return null;return (list||[]).find(function(x){return normName(x.name)===n||normName(x.id)===n;})||null;}
  function uniquePush(arr,val){var v=String(val||"").trim();if(v&&!arr.some(function(x){return normName(x)===normName(v);}))arr.push(v);}
  function cleanId(prefix,name){return prefix+"_"+String(name||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"").slice(0,42)+"_"+Date.now();}
  function collectUnknowns(list){var out={expenseCategory:[],paymentMethod:[],incomeType:[],patrimonioEntry:[]};(list||[]).forEach(function(r){var u=r&&r.unknowns?r.unknowns:{};if(u.expenseCategory)uniquePush(out.expenseCategory,u.expenseCategory);if(u.paymentMethod)uniquePush(out.paymentMethod,u.paymentMethod);if(u.incomeType)uniquePush(out.incomeType,u.incomeType);if(u.patrimonioEntry)uniquePush(out.patrimonioEntry,u.patrimonioEntry);});return out;}
  function unknownTotal(u=unknowns){return (u.expenseCategory||[]).length+(u.paymentMethod||[]).length+(u.incomeType||[]).length+(u.patrimonioEntry||[]).length;}
  function rowHasUnknown(r){return r&&r.unknowns&&Object.keys(r.unknowns).some(function(k){return !!r.unknowns[k];});}
  function optionList(kind){if(kind==="expenseCategory")return (cats||[]).filter(function(c:any){return !c.deleted&&!c.archived;});if(kind==="paymentMethod")return (methods||[]).filter(function(m:any){return !m.deleted&&!m.archived;});if(kind==="incomeType")return (incomeTypes||[]).filter(function(it:any){return !it.deleted&&!it.archived;});return pEntries;}
  function replacementKey(kind,name){return kind+"::"+normName(name);}
  function selectedReplacement(kind,name){var opts=optionList(kind)||[];if(!opts.length)return null;var key=replacementKey(kind,name);var raw=replacementMap[key];return opts.find(function(x){return String(x.id)===String(raw);})||opts[0];}
  function parseXLSXBuffer(ab){
    return new Promise(function(resolve){
      try{
        var u8=new Uint8Array(ab);
        if(!u8.length||u8[0]!==0x50||u8[1]!==0x4B){resolve({__unsupported:true});return;}
        var dv=new DataView(ab),entries={},idx=0;
        while(idx<u8.length-4){if(u8[idx]===0x50&&u8[idx+1]===0x4B&&u8[idx+2]===0x03&&u8[idx+3]===0x04){var cm=dv.getUint16(idx+8,true),cs=dv.getUint32(idx+18,true),fl=dv.getUint16(idx+26,true),el=dv.getUint16(idx+28,true);var fn=String.fromCharCode.apply(null,u8.slice(idx+30,idx+30+fl));var ds2=idx+30+fl+el;entries[fn]={cm:cm,data:u8.slice(ds2,ds2+cs)};idx=ds2+cs;}else idx++;}
        function decomp(data,cb){if(typeof DecompressionStream!=="undefined"){var ds3=new DecompressionStream("deflate-raw"),w=ds3.writable.getWriter(),r=ds3.readable.getReader(),chunks=[];function pump(res){if(res.done){cb(chunks.reduce(function(a,c){var n=new Uint8Array(a.length+c.length);n.set(a);n.set(c,a.length);return n;},new Uint8Array()));return;}chunks.push(res.value);r.read().then(pump);}r.read().then(pump);w.write(data);w.close();}else cb(data);}
        function u8ToStr(u82){return new TextDecoder("utf-8").decode(u82);}
        function getSS(xml){var arr=[],re=/<si>[\s\S]*?<\/si>/g,m;while((m=re.exec(xml))!==null){var tr=/<t[^>]*>([^<]*)<\/t>/g,tm,v="";while((tm=tr.exec(m[0]))!==null)v+=tm[1];arr.push(v);}return arr;}
        function parseSheet(xml,ss){
          var rows2=[],rowRe=/<row[^>]*>([\s\S]*?)<\/row>/g,rm;
          while((rm=rowRe.exec(xml))!==null){
            var cells={},cRe=/<c r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g,cm2;
            while((cm2=cRe.exec(rm[1]))!==null){
              var col=cm2[1],attrs=cm2[3],inner=cm2[4];var vm=inner.match(/<v>([^<]*)<\/v>/);var rawVal=vm?vm[1]:"";var val;
              if(attrs.indexOf('t="s"')>=0){val=ss[parseInt(rawVal,10)]||"";}else if(attrs.indexOf('t="inlineStr"')>=0){var tm2=inner.match(/<t[^>]*>([^<]*)<\/t>/);val=tm2?tm2[1]:"";}else if(rawVal!==""){var num=parseFloat(rawVal);val=isNaN(num)?rawVal:num;}else{val="";}
              var ci3=0;for(var ci4=0;ci4<col.length;ci4++)ci3=ci3*26+(col.charCodeAt(ci4)-64);cells[ci3]=val;
            }
            if(Object.keys(cells).length){var mx=Math.max.apply(null,Object.keys(cells).map(Number));var arr2=[];for(var jj=1;jj<=mx;jj++)arr2.push(cells[jj]!==undefined?cells[jj]:"");rows2.push(arr2);}
          }
          return rows2;
        }
        var ssKey=Object.keys(entries).find(function(k){return k.indexOf("sharedStrings")>=0;});var shKey=Object.keys(entries).find(function(k){return /xl\/worksheets\/[Ss]heet1/.test(k);})||Object.keys(entries).find(function(k){return /xl\/worksheets\/sheet/.test(k);});
        if(!shKey){resolve(null);return;}function withSS(cb){if(!ssKey){cb([]);return;}var e=entries[ssKey];if(e.cm===0){cb(getSS(u8ToStr(e.data)));return;}decomp(e.data,function(raw){cb(getSS(u8ToStr(raw)));});}
        withSS(function(ss){var e2=entries[shKey];if(e2.cm===0){resolve(parseSheet(u8ToStr(e2.data),ss));return;}decomp(e2.data,function(raw){resolve(parseSheet(u8ToStr(raw),ss));});});
      }catch(err){resolve(null);}
    });
  }
  function handleFile(e){
    var inputEl=e&&((e.currentTarget)||(e.target));
    var file=inputEl&&inputEl.files?inputEl.files[0]:null;if(!file)return;
    function clearPickedFile(){try{if(inputEl)inputEl.value="";}catch(_clearErr){}}
    setMsg("");setRows([]);setCols([]);setPreview([]);setImportSuccess(null);setStep(0);
    setImportProgress(file.name,"Caricamento file",0);
    var fileName=String(file.name||"");var fileType=String(file.type||"");
    var isJson=/\.json$/i.test(fileName)||/json/i.test(fileType);
    var isTextJsonCandidate=isJson||/\.(txt|backup)$/i.test(fileName)||/text\//i.test(fileType)||!fileType;
    if(isTextJsonCandidate&&onBackupJsonText){
      var jsonReader=new FileReader();
      jsonReader.onprogress=function(ev){if(ev.lengthComputable)setImportProgress(file.name,"Lettura file",Math.min(85,(ev.loaded/ev.total)*85));else setImportProgress(file.name,"Lettura file",35);};
      jsonReader.onerror=function(){clearPickedFile();setImportLoading(null);setMsg(L("Errore durante la lettura del file."));};
      jsonReader.onload=function(ev){
        setImportProgress(file.name,"Analisi file",90);
        var text=String(ev&&ev.target&&ev.target.result||"");
        if(isJson||looksLikeBackupJsonText(text)){
          importBackupJsonFromGenericPicker(text,file.name).then(function(done){
            clearPickedFile();
            if(done)return;
            var parsed=parseImportedDelimitedText(text);
            if(!parsed||parsed.length<2){setImportLoading(null);setMsg(L("File CSV vuoto o non valido."));return;}
            applyImportedRows(parsed,file.name);
          }).catch(function(err){clearPickedFile();console.error("Backup JSON import error",err);setImportLoading(null);setMsg(L("File JSON non valido"));});
          return;
        }
        clearPickedFile();
        var parsed=parseImportedDelimitedText(text);
        if(!parsed||parsed.length<2){setImportLoading(null);setMsg(L("File CSV vuoto o non valido."));return;}
        applyImportedRows(parsed,file.name);
      };
      jsonReader.readAsText(file,"UTF-8");
      return;
    }
    var isGoogleSheetNative=/\.gsheet$/i.test(fileName)||fileType==="application/vnd.google-apps.spreadsheet";
    if(isGoogleSheetNative)setImportProgress(file.name,"Apertura Foglio Google",8);
    var isExcel=isGoogleSheetNative||/\.(xlsx|xls)$/i.test(fileName)||/spreadsheetml\.sheet|vnd\.ms-excel/i.test(fileType);
    if(isExcel){
      var reader=new FileReader();
      reader.onprogress=function(ev){if(ev.lengthComputable)setImportProgress(file.name,"Lettura file",Math.min(70,(ev.loaded/ev.total)*70));else setImportProgress(file.name,"Lettura file",25);};
      reader.onerror=function(){clearPickedFile();setImportLoading(null);setMsg(L("Errore durante la lettura del file."));};
      reader.onload=function(ev){
        clearPickedFile();
        setImportProgress(file.name,"Analisi file",78);
        setTimeout(function(){parseXLSXBuffer(ev.target.result).then(function(data){
          if(data&&data.__unsupported){setImportLoading(null);setMsg(isGoogleSheetNative?L("Il Foglio Google nativo non ha fornito dati leggibili all’app. Da Drive apri il menu del file e scegli Scarica/Esporta come .xlsx oppure .csv, poi importalo qui."):L("Formato Excel non supportato. Salva il file come .xlsx oppure CSV e riprova."));return;}
          if(!data||data.length<2){setImportLoading(null);setMsg(isGoogleSheetNative?L("Il Foglio Google nativo non ha fornito dati leggibili all’app. Da Drive apri il menu del file e scegli Scarica/Esporta come .xlsx oppure .csv, poi importalo qui."):L("Nessun dato nel file Excel."));return;}
          applyImportedRows(data,file.name);
        }).catch(function(){setImportLoading(null);setMsg(L("Errore durante l'analisi del file Excel."));});},0);
      };
      reader.readAsArrayBuffer(file);
    }else{
      var reader2=new FileReader();
      reader2.onprogress=function(ev){if(ev.lengthComputable)setImportProgress(file.name,"Lettura file",Math.min(85,(ev.loaded/ev.total)*85));else setImportProgress(file.name,"Lettura file",35);};
      reader2.onerror=function(){clearPickedFile();setImportLoading(null);setMsg(L("Errore durante la lettura del file."));};
      reader2.onload=function(ev){
        setImportProgress(file.name,"Analisi file",90);
        var text=String(ev&&ev.target&&ev.target.result||"");
        if(onBackupJsonText&&looksLikeBackupJsonText(text)){importBackupJsonFromGenericPicker(text,file.name).then(function(){clearPickedFile();}).catch(function(err){clearPickedFile();console.error("Backup JSON import error",err);setImportLoading(null);setMsg(L("File JSON non valido"));});return;}
        clearPickedFile();
        var parsed=parseImportedDelimitedText(text);
        if(!parsed||parsed.length<2){setImportLoading(null);setMsg(L("File CSV vuoto o non valido."));return;}
        applyImportedRows(parsed,file.name);
      };
      reader2.readAsText(file,"UTF-8");
    }
  }
  function buildPreview(){
    if(importType==="patrimonio"){if(!map.monthKey||!map.entryId||!map.amount){setMsg(L("Mappa almeno Data/Mese, Categoria/Voce e Importo"));return;}}else if(!map.date||!map.amount){setMsg(L("Mappa almeno Data e Importo"));return;}
    var di=cols.indexOf(map.date),ai=cols.indexOf(map.amount),dsi=cols.indexOf(map.desc),ci2=cols.indexOf(map.cat),mi=cols.indexOf(map.method),ri=cols.indexOf(map.rate||"");var failCount=0;
    var p=rows.map(function(r){var rawA=r[ai]||"";var amt=parseImportMoney(rawA);var rateVal=0;if(ri>=0){var rv=parseInt(r[ri]);if(!isNaN(rv)&&rv>1&&rv<=60)rateVal=rv;}
      if(importType==="expense"){var rawD=r[di];var parsedDate=parseDateWithFormat(rawD,importDateFmt);if(!parsedDate)failCount++;var iso=parsedDate||todayStr();var catN=ci2>=0?String(r[ci2]||"").trim():"";var methN=mi>=0?String(r[mi]||"").trim():"";var mc=findByName(cats,catN);var mm=findByName(methods,methN);var unknown={};if(catN&&!mc)unknown.expenseCategory=catN;if(methN&&!mm)unknown.paymentMethod=methN;return{date:iso,amount:isNaN(amt)?0:Math.abs(amt),desc:dsi>=0?String(r[dsi]||""):"",catName:catN,methodName:methN,catId:mc?mc.id:(cats[0]?cats[0].id:1),methodId:mm?mm.id:(methods[0]?methods[0].id:1),rateizzato:rateVal>0,rate:rateVal||12,unknowns:unknown};}
      if(importType==="income"){var rawD2=r[di];var parsedDate2=parseDateWithFormat(rawD2,importDateFmt);if(!parsedDate2)failCount++;var iso2=parsedDate2||todayStr();var typeN=ci2>=0?String(r[ci2]||"").trim():"";var it=findByName(incomeTypes,typeN);var unknown2={};if(typeN&&!it)unknown2.incomeType=typeN;return{date:iso2,amount:isNaN(amt)?0:Math.abs(amt),desc:dsi>=0?String(r[dsi]||""):"",typeName:typeN,itype:it?it.id:"salario",rateizzato:rateVal>0,rate:rateVal||12,unknowns:unknown2};}
      if(importType==="patrimonio"){var mkIdx=cols.indexOf(map.monthKey);var eiIdx=cols.indexOf(map.entryId);var noteIdx=cols.indexOf(map.patNote||"");var rawDate=mkIdx>=0?r[mkIdx]:"";var rawEntry=eiIdx>=0?String(r[eiIdx]||"").trim():"";var mk="";if(typeof rawDate==="string"&&/^\d{4}-\d{2}$/.test(rawDate.trim())){mk=rawDate.trim();}else{var isoFull=parseDateWithFormat(rawDate,importDateFmt);if(isoFull&&isoFull.length>=7)mk=isoFull.slice(0,7);else failCount++;}var rawAmt=r[ai]||"";var cleanAmt=parseImportMoney(rawAmt);var noteVal=noteIdx>=0?String(r[noteIdx]||"").trim():"";var pEntry=findByName(pEntries,rawEntry);var unknown3={};if(rawEntry&&!pEntry)unknown3.patrimonioEntry=rawEntry;return{monthKey:mk,entryId:pEntry?pEntry.id:(pEntries[0]?pEntries[0].id:"altro"),entryName:rawEntry,amount:isNaN(cleanAmt)?0:Math.abs(cleanAmt),note:noteVal,unknowns:unknown3};}
      return null;}).filter(function(r){return r&&(importType==="patrimonio"?r.monthKey&&r.entryName&&r.amount>=0:r.amount>0);});
    var u=collectUnknowns(p);if(failCount>0)setMsg("⚠️ "+failCount+" "+L("date non riconosciute. Verifica il formato selezionato."));else setMsg("");setPreview(p);setUnknowns(u);setUnknownDecision("create");setStep(2);
  }
  function resolvePreviewRows(){var mode=unknownTotal()>0?unknownDecision:"create";if(mode==="skip")return preview.filter(function(r){return !rowHasUnknown(r);});var catMap={},methodMap={},incomeMap={},patMap={};if(mode==="create"){var now=Date.now();var newCats=(unknowns.expenseCategory||[]).filter(function(n){return !findByName(cats,n);}).map(function(n,i){return{id:now+i+11,name:n,icon:"📦",color:"#D3D1C7",group:"altro"};});var newMethods=(unknowns.paymentMethod||[]).filter(function(n){return !findByName(methods,n);}).map(function(n,i){return{id:now+i+1011,name:n,icon:"💳",color:"#D3D1C7",group:"altri"};});var newIncome=(unknowns.incomeType||[]).filter(function(n){return !findByName(incomeTypes,n);}).map(function(n,i){return{id:cleanId("income",n),name:n,icon:"💰",color:"#9FE1CB",group:"extra_inc",custom:true};});var newPat=(unknowns.patrimonioEntry||[]).filter(function(n){return !findByName(pEntries,n);}).map(function(n,i){return{id:cleanId("pat",n),name:n,icon:"📦",areaId:"altro"};});newCats.forEach(function(x){catMap[normName(x.name)]=x.id;});newMethods.forEach(function(x){methodMap[normName(x.name)]=x.id;});newIncome.forEach(function(x){incomeMap[normName(x.name)]=x.id;});newPat.forEach(function(x){patMap[normName(x.name)]=x.id;});if(newCats.length&&setCats)setCats(function(list){return (list||[]).concat(newCats);});if(newMethods.length&&setMethods)setMethods(function(list){return (list||[]).concat(newMethods);});if(newIncome.length&&setCustomIncomeTypes)setCustomIncomeTypes(function(list){return (list||[]).concat(newIncome);});if(newPat.length&&setPatrimonioEntries)setPatrimonioEntries(function(list){return (list||DEFAULT_PATRIMONIO_ENTRIES).concat(newPat);});}
    return preview.map(function(r){var out={...r,unknowns:{}};if(rowHasUnknown(r)){if(mode==="replace"){if(r.unknowns.expenseCategory){var c=selectedReplacement("expenseCategory",r.unknowns.expenseCategory);if(c)out.catId=c.id;}if(r.unknowns.paymentMethod){var m=selectedReplacement("paymentMethod",r.unknowns.paymentMethod);if(m)out.methodId=m.id;}if(r.unknowns.incomeType){var it=selectedReplacement("incomeType",r.unknowns.incomeType);if(it)out.itype=it.id;}if(r.unknowns.patrimonioEntry){var pe=selectedReplacement("patrimonioEntry",r.unknowns.patrimonioEntry);if(pe)out.entryId=pe.id;}}else{if(r.unknowns.expenseCategory)out.catId=catMap[normName(r.unknowns.expenseCategory)]||out.catId;if(r.unknowns.paymentMethod)out.methodId=methodMap[normName(r.unknowns.paymentMethod)]||out.methodId;if(r.unknowns.incomeType)out.itype=incomeMap[normName(r.unknowns.incomeType)]||out.itype;if(r.unknowns.patrimonioEntry)out.entryId=patMap[normName(r.unknowns.patrimonioEntry)]||out.entryId;}}return out;});}
  function doImport(){var finalPreview=resolvePreviewRows();if(!finalPreview.length){setMsg(L("Nessuna voce valida da importare."));return;}var importedOk=true;if(importType==="expense")importedOk=addExpenses(finalPreview.map(function(p){return{id:Date.now()+Math.random(),amount:p.amount,catId:p.catId,methodId:p.methodId,methodName:p.methodName,desc:p.desc,date:p.date,rateizzato:p.rateizzato,rate:p.rate};}),"import");else if(importType==="income")importedOk=addIncomes(finalPreview.map(function(p){return{id:Date.now()+Math.random(),amount:p.amount,type:p.itype,desc:p.desc,date:p.date,rateizzato:p.rateizzato,rate:p.rate};}),"import");else if(importType==="patrimonio"){var byMonth={};var byMonthNotes={};finalPreview.forEach(function(row){if(!row.monthKey)return;if(!byMonth[row.monthKey])byMonth[row.monthKey]={};if(!byMonthNotes[row.monthKey])byMonthNotes[row.monthKey]={};byMonth[row.monthKey][row.entryId]=row.amount;if(row.note)byMonthNotes[row.monthKey][row.entryId]=row.note;});var newHist={...(patrimonioHistory||{})};Object.keys(byMonth).forEach(function(mk){var snap={...(newHist[mk]||{}),...byMonth[mk]};snap._total=Object.keys(snap).filter(function(k){return !String(k).startsWith("_");}).reduce(function(a,k){return a+(parseFloat(snap[k])||0);},0);snap._savedAt=new Date().toISOString();newHist[mk]=snap;});setPatrimonioHistory(newHist);if(Object.keys(byMonthNotes).length>0){var allNotes={};Object.keys(byMonthNotes).forEach(function(mk){Object.assign(allNotes,byMonthNotes[mk]);});setPatrimonioNotes(function(n){return{...(n||{}),...allNotes};});}}if(!importedOk)return;var typeLabel=importType==="expense"?"uscite":importType==="income"?"entrate":"voci patrimonio";setImportSuccess({count:finalPreview.length,type:typeLabel});if(unknownTotal()>0&&setToast)setToast({text:L("Importazione completata con gestione dei valori sconosciuti"),type:"success",icon:"✅"});resetAll();}
  function unknownSection(kind,title,items){if(!items||!items.length)return null;var opts=optionList(kind)||[];return <div style={{background:dark?"#202033":"#fff",border:"1px solid "+(dark?"#444":"#eee"),borderRadius:10,padding:10,marginTop:8}}><div style={{fontSize:12,fontWeight:700,color:tc,marginBottom:6}}>{L(title)} ({items.length})</div>{items.map(function(name){var key=replacementKey(kind,name);return <div key={key} style={{display:"grid",gridTemplateColumns:unknownDecision==="replace"?"1fr 1fr":"1fr",gap:8,alignItems:"center",padding:"5px 0",borderTop:"1px solid "+(dark?"#333":"#f0f0f0")}}><div style={{fontSize:12,color:sc,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>• {name}</div>{unknownDecision==="replace"&&<select value={String((replacementMap[key]!==undefined?replacementMap[key]:(opts[0]?opts[0].id:"")))} onChange={function(e){var v=e.target.value;setReplacementMap(function(m){return{...m,[key]:v};});}} style={{...sinp,width:"100%"}}>{opts.map(function(o){return <option key={String(o.id)} value={String(o.id)}>{o.icon?o.icon+" ":""}{o.name}</option>;})}</select>}</div>;})}</div>;}
  function unknownResolutionBox(){var total=unknownTotal();if(!total)return null;return <div style={{background:dark?"#2a2414":"#FFF8E1",border:"1px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:12,padding:14,marginBottom:12}}><div style={{fontSize:14,fontWeight:800,color:dark?"#FFD54F":"#856404",marginBottom:5}}>⚠️ {L("Valori non presenti in fAInance")}</div><div style={{fontSize:12,color:dark?"#f5d98a":"#856404",lineHeight:1.45,marginBottom:12}}>{L("Prima di importare scegli come gestire categorie, metodi o voci sconosciute trovate nel file.")}</div><div style={{display:"grid",gridTemplateColumns:"1fr",gap:8,marginBottom:10}}>{[{id:"create",label:"Creiamo queste nuove categorie"},{id:"replace",label:"Sostituiamo queste categorie sconosciute con una già esistente"},{id:"skip",label:"Non importiamo queste transazioni e importiamo solo quelle corrette"}].map(function(o){var active=unknownDecision===o.id;return <button key={o.id} onClick={function(){setUnknownDecision(o.id);}} style={{background:active?(ctx.confirmButtonColor||"#7F77DD"):(dark?"#252535":"#fff"),color:active?"#fff":tc,border:"1px solid "+(active?(ctx.confirmButtonColor||"#7F77DD"):(dark?"#555":"#ddd")),borderRadius:10,padding:"10px 12px",fontSize:12,fontWeight:700,textAlign:"left",cursor:"pointer"}}>{L(o.label)}</button>;})}</div>{unknownDecision==="skip"&&<div style={{fontSize:12,color:dark?"#f5d98a":"#856404",marginBottom:8}}>{L("Le righe con valori sconosciuti saranno escluse dall'importazione.")}</div>}{unknownSection("expenseCategory","Categorie di Uscita sconosciute",unknowns.expenseCategory)}{unknownSection("paymentMethod","Metodi di Pagamento sconosciuti",unknowns.paymentMethod)}{unknownSection("incomeType","Categorie di Entrata sconosciute",unknowns.incomeType)}{unknownSection("patrimonioEntry","Categorie del Patrimonio sconosciute",unknowns.patrimonioEntry)}</div>;}
  var tabColor=importType==="expense"?"#E24B4A":importType==="income"?"#1D9E75":"#7F77DD";
  var IMPORT_GUIDELINES={expense:{title:"Formato file Uscite",body:"Il file deve avere le colonne:\n• Data (es. 31/12/2025)\n• Importo (es. 150,00 oppure € 150)\n• Categoria (nome della categoria, es. Supermercato)\n• Metodo (es. Revolut)\n• Descrizione (testo libero, opzionale)\n• Rate (numero di mesi, opzionale)"},income:{title:"Formato file Entrate",body:"Il file deve avere le colonne:\n• Data (es. 31/12/2025)\n• Importo (es. 1500,00)\n• Tipo entrata (es. Busta paga / Salario)\n• Descrizione (testo libero, opzionale)\n• Rate (numero di mesi, opzionale)"},patrimonio:{title:"Formato file Patrimonio",body:"Il file deve avere le colonne:\n• Data (es. 01/04/2026) — verrà convertita in mese YYYY-MM\n• Importo (es. € 20.000)\n• Categoria (nome voce patrimonio, es. Conto corrente)\n• Note (testo libero, opzionale)\n\nOgni riga = valore di una voce per un determinato mese."}};
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>{importSuccess&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 16px 2vh",boxSizing:"border-box",overflowY:"auto"}} onClick={function(){setImportSuccess(null);}}><div style={{background:dark?"#1e1e30":"#fff",borderRadius:20,padding:32,textAlign:"center",maxWidth:320,width:"100%",boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}><div style={{fontSize:56,marginBottom:12}}>✅</div><div style={{fontSize:20,fontWeight:700,color:tc,marginBottom:8}}>{L("Importazione completata!")}</div><div style={{fontSize:15,color:sc,marginBottom:6}}><span style={{fontSize:28,fontWeight:700,color:tabColor,display:"block",marginBottom:4}}>{importSuccess.count}</span>{L(importSuccess.type)} {L("importate con successo")}</div><button onClick={function(){setImportSuccess(null);}} style={{marginTop:16,background:"linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#7FC8F8))",color:"#fff",border:"none",borderRadius:12,padding:"12px 32px",fontSize:14,fontWeight:600,cursor:"pointer"}}>OK</button></div></div>}
    {importLoading&&<div style={{background:dark?"#202033":"#EEF4FF",border:"1px solid "+(dark?"#3d376a":"#BFD7FF"),borderRadius:12,padding:"12px 14px"}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:8}}><div style={{fontSize:13,fontWeight:800,color:tc}}>📥 {importLoading.stage||L("Caricamento file")}</div><div style={{fontSize:12,fontWeight:900,color:tabColor}}>{importLoading.pct||0}%</div></div><div style={{fontSize:11,color:sc,marginBottom:8,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{importLoading.file}</div><div style={{height:7,borderRadius:99,background:dark?"#333":"#DDE8FF",overflow:"hidden"}}><div style={{height:"100%",width:(importLoading.pct||0)+"%",background:tabColor,borderRadius:99,transition:"width .15s linear"}}/></div></div>}
    <div style={{display:"flex",gap:0,background:dark?"#333":"#f5f5f5",borderRadius:12,padding:3}}><button onClick={function(){setImportType("expense");resetAll();}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:importType==="expense"?"#E24B4A":"transparent",color:importType==="expense"?"#fff":sc,fontSize:14,cursor:"pointer",fontWeight:importType==="expense"?500:400}}>{"💸 "+L("Uscite")}</button><button onClick={function(){setImportType("income");resetAll();}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:importType==="income"?"#1D9E75":"transparent",color:importType==="income"?"#fff":sc,fontSize:14,cursor:"pointer",fontWeight:importType==="income"?500:400}}>{"💰 "+L("Entrate")}</button><button onClick={function(){setImportType("patrimonio");resetAll();}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:importType==="patrimonio"?"#7F77DD":"transparent",color:importType==="patrimonio"?"#fff":sc,fontSize:14,cursor:"pointer",fontWeight:importType==="patrimonio"?500:400}}>{"💎 "+L("Patrimonio")}</button></div>
    {step===0&&<div style={{background:importType==="patrimonio"?(dark?"#252535":"#f0edff"):importType==="expense"?(dark?"#2a1e1e":"#fff5f5"):(dark?"#1e2a1e":"#f0faf5"),borderRadius:10,border:"1px solid "+(importType==="patrimonio"?(dark?"#44408a":"#c8c0f8"):importType==="expense"?(dark?"#5a2a2a":"#fcc"):( dark?"#2a5a2a":"#a8e6c8")),padding:"12px 16px"}}><div style={{fontSize:12,fontWeight:700,color:importType==="patrimonio"?"#534AB7":importType==="expense"?"#E24B4A":"#1D9E75",marginBottom:6}}>{L(IMPORT_GUIDELINES[importType].title)}</div><div style={{fontSize:12,color:sc,lineHeight:1.7,whiteSpace:"pre-line"}}>{L(IMPORT_GUIDELINES[importType].body)}</div></div>}
    {msg&&<div style={{background:msg.startsWith("Import")?"#e8f8f0":msg.startsWith("⚠")?"#fff8e1":"#fff3cd",borderRadius:8,padding:"10px 14px",fontSize:13,color:msg.startsWith("Import")?"#1D9E75":"#856404"}}>{msg}</div>}
    {step===0&&<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"stretch"}} onDragOver={function(e){e.preventDefault();}} onDrop={function(e){e.preventDefault();var f=e.dataTransfer.files[0];if(f){var fake={target:{files:[f],value:""}};handleFile(fake);}}}>
      <button type="button" onClick={openImportPicker} style={{width:"100%",border:"1px solid "+(dark?"#444":"#d7d7d7"),background:dark?"#252535":"#f7f7f7",borderRadius:12,padding:"13px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:tc,fontSize:13,fontWeight:800,cursor:"pointer",minHeight:54,boxShadow:"none"}}><span style={{fontSize:18}}>📁</span><span>{L("Importa dal Telefono")}</span></button>
      <button type="button" onClick={openGoogleSheetsPicker} style={{width:"100%",border:"1px solid "+(dark?"#444":"#d7d7d7"),background:dark?"#252535":"#f7f7f7",borderRadius:12,padding:"13px 10px",display:"flex",alignItems:"center",justifyContent:"center",gap:8,color:tc,fontSize:13,fontWeight:800,cursor:"pointer",minHeight:54,boxShadow:"none"}}><span style={{fontSize:18}}>☁️</span><span>{L("Importa da Google Drive")}</span></button>
    </div>}<input ref={fileRef} type="file" accept=".xlsx,.xls,.csv,.json,.txt,text/csv,application/json,text/plain,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" style={{display:"none"}} onChange={handleFile}/>
    {step===1&&<div style={{background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+(dark?"#444":"#eee"),padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:12,color:tc}}>{L("Mappa colonne")} ({rows.length} {L("righe")})</div><div style={{marginBottom:14,background:dark?"#1e1e30":"#f0f8ff",borderRadius:10,padding:"12px 14px",border:"1px solid "+(dark?"#334":"#c8e0ff")}}><label style={{fontSize:12,fontWeight:600,color:dark?"#8bf":"#1a5fa8",display:"block",marginBottom:6}}>📅 {L("Formato delle date nel file")}</label><select value={importDateFmt} onChange={function(e){setImportDateFmt(e.target.value);}} style={{...sinp,width:"100%"}}><option value="dmy">GG/MM/AAAA (europeo)</option><option value="mdy">MM/GG/AAAA (americano)</option><option value="ymd">{L("AAAA-MM-GG (ISO)")}</option><option value="ym">{L("AAAA-MM (già nel formato corretto)")}</option><option value="auto">{L("Rilevamento automatico")}</option></select></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>{(importType==="patrimonio"?[["monthKey","Data / Mese *"],["entryId","Categoria / Voce *"],["amount","Importo / Valore *"],["patNote","Note (opzionale)"]]:(importType==="expense"?[["date","Data *"],["amount","Importo *"],["desc","Descrizione"],["cat","Categoria"],["method","Metodo di pagamento"],["rate","Rate (mesi)"]]:[["date","Data *"],["amount","Importo *"],["desc","Descrizione"],["cat","Tipo entrata"],["rate","Rate (mesi)"]])).map(function(pair){var k=pair[0],l=pair[1];return <div key={k}><label style={{fontSize:12,color:sc,display:"block",marginBottom:3}}>{L(l)}</label><select value={map[k]||""} onChange={function(e){var v=e.target.value;setMap(function(p){return{...p,[k]:v};});}} style={{...sinp,width:"100%"}}><option value="">{L("-- nessuna --")}</option>{cols.map(function(c,ci5){return <option key={ci5} value={c}>{c||("(col. "+(ci5+1)+")")}</option>;})}</select></div>;})}</div><div style={{display:"flex",gap:8}}><Btn onClick={buildPreview}>{L("Anteprima")}</Btn><Btn onClick={function(){setStep(0);}} bg={dark?"#333":"#f0f0f0"} color={tc}>{L("Indietro")}</Btn></div></div>}
    {step===2&&<div>{unknownResolutionBox()}<div style={{fontSize:13,color:sc,marginBottom:10}}>{preview.length} {L("voci trovate")}{unknownTotal()>0?" · "+unknownTotal()+" "+L("valori sconosciuti"):""}</div><div style={{overflowX:"auto",maxHeight:260,overflowY:"auto",border:"1px solid "+(dark?"#444":"#eee"),borderRadius:8}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead style={{background:dark?"#252535":"#f5f5f5",position:"sticky",top:0}}><tr>{(importType==="patrimonio"?["Mese","Categoria","Valore","Note","Stato"]:["Data","Importo","Descrizione","Cat/Tipo","Stato"]).map(function(h){return <th key={h} style={{padding:"8px 10px",textAlign:"left",fontWeight:500,color:sc}}>{L(h)}</th>;})}</tr></thead><tbody>{preview.map(function(r,i){var warn=rowHasUnknown(r);return <tr key={i} style={{borderBottom:"1px solid "+(dark?"#333":"#f5f5f5"),background:warn?(dark?"#2a2414":"#fffaf0"):"transparent"}}>{importType==="patrimonio"?<><td style={{padding:"6px 10px",color:tc}}>{r.monthKey}</td><td style={{padding:"6px 10px",color:tc}}>{r.entryName}</td><td style={{padding:"6px 10px",color:"#7F77DD",fontWeight:500}}>{fmtAmt(r.amount,sym)}</td><td style={{padding:"6px 10px",color:sc,fontSize:11,maxWidth:120,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{r.note||"—"}</td><td style={{padding:"6px 10px",color:warn?"#EF9F27":sc,fontSize:11}}>{warn?L("Da gestire"):L("OK")}</td></>:<><td style={{padding:"6px 10px",color:tc}}>{fmtDate(r.date,ctx.dateFmt)}</td><td style={{padding:"6px 10px",color:tabColor,fontWeight:500}}>{fmtAmt(r.amount,sym)}</td><td style={{padding:"6px 10px",color:tc}}>{r.desc}</td><td style={{padding:"6px 10px",fontSize:11,color:sc}}>{importType==="expense"?(r.catName||"-"):(r.typeName||r.itype)}</td><td style={{padding:"6px 10px",color:warn?"#EF9F27":sc,fontSize:11}}>{warn?L("Da gestire"):L("OK")}</td></>}</tr>;})}</tbody></table></div><div style={{display:"flex",gap:8,marginTop:12}}><Btn onClick={doImport} bg={tabColor} style={{padding:"10px 20px",fontSize:14,fontWeight:500}}>{L("Importa")} {unknownDecision==="skip"?preview.filter(function(r){return !rowHasUnknown(r);}).length:preview.length} {L("voci")}</Btn><Btn onClick={function(){setStep(1);}} bg={dark?"#333":"#f0f0f0"} color={tc}>{L("Indietro")}</Btn></div></div>}
  </div>;
}

// ── APP ───────────────────────────────────────────────────────────────────────

// ── LOGO ─────────────────────────────────────────────────────────────────────
export function FAInanceLogo({size,style}){
  size=size||48;
  return <img src={appLogo} alt="fAInance" style={{width:size,height:size,objectFit:"contain",borderRadius:Math.round(size*0.22),...(style||{})}}/>;
}
export function AIGrilloIcon({size,style,imgStyle}){
  size=size||34;
  return <span aria-label="Consulente AI" style={{width:size,height:size,display:"inline-flex",alignItems:"center",justifyContent:"center",overflow:"visible",background:"transparent",border:"none",boxShadow:"none",borderRadius:0,lineHeight:0,flexShrink:0,padding:0,...(style||{})}}>
    <img src={aiGrilloMascot} alt="Consulente AI" draggable={false} style={{width:"100%",height:"100%",maxWidth:"100%",maxHeight:"100%",objectFit:"contain",display:"block",background:"transparent",border:"none",boxShadow:"none",borderRadius:0,transform:"none",...(imgStyle||{})}}/>
  </span>;
}



// ── LOGIN ────────────────────────────────────────────────────────────────────
