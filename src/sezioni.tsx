import { useState, useEffect, useRef, useMemo } from 'react';
import { registerPlugin } from '@capacitor/core';
import { useApp, useStorage, MONTHS_FULL, MONTHS_SHORT, BALANCE_COLOR, COLORS,
  DEFAULT_EXPENSE_GROUPS, DEFAULT_PATRIMONIO_AREAS, DEFAULT_PATRIMONIO_ENTRIES,
  DEFAULT_GOALS, DEFAULT_BUDGET_PLAN, DEFAULT_CATS, DEFAULT_METHODS,
  getAllIncomeTypes, rateMonth, fmtDate, fmtAmt, parseMoney, todayStr, dateOffset,
  androidDownload, fbAuth, fbDb, doc, setDoc, getDoc, getDocs, addDoc,
  collection, query, where, limit, AI_AGENT_ENDPOINT, AI_OUT_OF_SCOPE_MESSAGE, AI_AGENT_SCOPE_INSTRUCTION,
  CURRENCIES, INCOME_TYPES, exportToCSV, exportToXLSX, parseCSVText,
  parseDateWithFormat, IMPORT_DATE_FORMATS, DATE_FORMATS, fmtAmt as fmtAmtFn,
  GOAL_ICONS, EMOJI_LIST, BG_THEMES, aiGrilloMascot
} from './core';
import { TRANSLATIONS } from './traduzioni';
import { parseFainanceSingleVoiceCommon } from './voiceParser';
import { Btn, Badge, Toggle, StatCard, Toast, DonutChart, BarChart, LineChart,
  SortableRows, EmojiPicker, DatePickerField, GoalsPanel, AlertsPanel,
  AIGrilloIcon, FAInanceLogo, EditModal, PatrimonioSettingsPanel, AreasEditor,
  ExpenseForm, BulkEntry, ReceiptScanPanel, RecurringManager,
} from './widget';

const AI_VOICE_ENDPOINT = AI_AGENT_ENDPOINT.replace(/askFinanceAI(?:\?.*)?$/, "synthesizeFinanceVoice");
const AI_REALTIME_ENDPOINT = AI_AGENT_ENDPOINT.replace(/askFinanceAI(?:\?.*)?$/, "createFinanceRealtimeSession");
const FainanceAudioNative:any = registerPlugin("FainanceAudio");


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

async function getFainanceContactsPlugin(){
  try{
    var cap=(typeof window!=="undefined")?(window as any).Capacitor:null;
    var plugins=cap&&cap.Plugins?cap.Plugins:{};
    var p=plugins.FainanceContacts||plugins.CapacitorContacts||plugins.Contacts||plugins.CapgoCapacitorContacts;
    if(p)return p;
  }catch(e){}
  // Do not import @capgo/capacitor-contacts here: Vite must be able to build the web bundle even when the native package is not installed in the iOS build environment.
  return null;
}
function firstContactValue(v:any){
  if(!v)return "";
  if(typeof v==="string"||typeof v==="number")return String(v);
  if(Array.isArray(v)){for(var i=0;i<v.length;i++){var r=firstContactValue(v[i]);if(r)return r;}return "";}
  return v.value||v.address||v.email||v.number||v.normalizedNumber||v.display||v.formatted||v.formattedName||v.name||v.label||"";
}
function normalizeFainanceContact(c:any){
  if(!c)return null;
  if(c.contact)c=c.contact;
  if(c.contacts&&c.contacts[0])c=c.contacts[0];
  if(c.person)c=c.person;
  var structuredName=firstContactValue(c.name)||firstContactValue(c.names);
  var name=firstContactValue(c.displayName)||firstContactValue(c.fullName)||structuredName||[firstContactValue(c.givenName),firstContactValue(c.middleName),firstContactValue(c.familyName)].filter(Boolean).join(" ");
  var email=firstContactValue(c.emailAddresses)||firstContactValue(c.emails)||firstContactValue(c.email);
  var phone=firstContactValue(c.phoneNumbers)||firstContactValue(c.phones)||firstContactValue(c.tel)||firstContactValue(c.phone);
  name=String(name||"").trim();email=String(email||"").trim();phone=String(phone||"").trim();
  if(!name&&!email&&!phone)return null;
  return {name:name,email:email,phone:phone};
}
function normalizeFainanceContactsResult(res:any){
  if(!res)return [];
  var arr:any[]=[];
  if(Array.isArray(res))arr=res;
  else if(Array.isArray(res.contacts))arr=res.contacts;
  else if(res.contact)arr=[res.contact];
  else arr=[res];
  return arr.map(normalizeFainanceContact).filter(Boolean);
}
function fainanceContactFields(){return ["id","fullName","givenName","middleName","familyName","displayName","emailAddresses","phoneNumbers"] as any;}
async function tryFainanceContactPicker(plugin:any){
  if(!plugin)return null;
  var fields=fainanceContactFields();
  var attempts=[
    function(){return plugin.pickContact?plugin.pickContact():null;},
    function(){return plugin.pickContact?plugin.pickContact({fields:fields,multiple:false}):null;},
    function(){return plugin.pickContacts?plugin.pickContacts({multiple:false}):null;},
    function(){return plugin.pickContacts?plugin.pickContacts({fields:fields,multiple:false}):null;}
  ];
  for(var i=0;i<attempts.length;i++){
    try{
      var res=await attempts[i]();
      var list=normalizeFainanceContactsResult(res);
      if(list.length)return list[0];
    }catch(e){}
  }
  return null;
}
async function requestFainanceContactsPermission(plugin:any){
  try{if(plugin&&plugin.checkPermissions){var st=await plugin.checkPermissions();var r=st&&(st.readContacts||st.contacts||st.granted);if(r===true||r==="granted"||r==="limited")return true;}}catch(e){}
  try{if(plugin&&plugin.requestPermissions){var rp=await plugin.requestPermissions({permissions:["readContacts"]});var rr=rp&&(rp.readContacts||rp.contacts||rp.granted);if(rr===true||rr==="granted"||rr==="limited")return true;}}catch(e){}
  try{if(plugin&&plugin.requestPermissions){await plugin.requestPermissions();return true;}}catch(e){}
  return false;
}
async function chooseFainanceContactFromList(cleaned:any[]){
  if(!cleaned||!cleaned.length)return null;
  if(cleaned.length===1)return cleaned[0];
  if(typeof document==="undefined")return cleaned[0];
  return await new Promise(function(resolve){
    var original=cleaned.slice(0,800);
    var selected=false;
    var overlay=document.createElement("div");
    overlay.setAttribute("role","dialog");
    overlay.setAttribute("aria-modal","true");
    overlay.style.position="fixed";
    overlay.style.inset="0";
    overlay.style.zIndex="2147483647";
    overlay.style.background="rgba(0,0,0,.55)";
    overlay.style.display="flex";
    overlay.style.alignItems="center";
    overlay.style.justifyContent="center";
    overlay.style.padding="14px";
    var card=document.createElement("div");
    card.style.width="min(560px,100%)";
    card.style.maxHeight="86vh";
    card.style.background="#ffffff";
    card.style.color="#111827";
    card.style.borderRadius="22px";
    card.style.boxShadow="0 22px 60px rgba(0,0,0,.34)";
    card.style.overflow="hidden";
    card.style.display="flex";
    card.style.flexDirection="column";
    var header=document.createElement("div");
    header.style.display="flex";
    header.style.alignItems="center";
    header.style.justifyContent="space-between";
    header.style.gap="12px";
    header.style.padding="14px 14px 10px";
    header.style.borderBottom="1px solid #e5e7eb";
    var title=document.createElement("div");
    title.textContent=L("Seleziona contatto");
    title.style.fontSize="18px";
    title.style.fontWeight="900";
    title.style.lineHeight="1.2";
    var close=document.createElement("button");
    close.type="button";
    close.textContent="×";
    close.setAttribute("aria-label",L("Chiudi"));
    close.style.width="38px";
    close.style.height="38px";
    close.style.borderRadius="12px";
    close.style.border="1px solid #fecaca";
    close.style.background="#fee2e2";
    close.style.color="#ef4444";
    close.style.fontSize="26px";
    close.style.fontWeight="900";
    close.style.lineHeight="30px";
    close.style.cursor="pointer";
    close.onclick=function(){cleanup(null);};
    header.appendChild(title);header.appendChild(close);
    var searchWrap=document.createElement("div");
    searchWrap.style.padding="12px 14px";
    searchWrap.style.borderBottom="1px solid #e5e7eb";
    var search=document.createElement("input");
    search.type="search";
    search.placeholder=L("Cerca contatto");
    search.style.width="100%";
    search.style.boxSizing="border-box";
    search.style.border="1px solid #d1d5db";
    search.style.borderRadius="14px";
    search.style.padding="12px 13px";
    search.style.fontSize="15px";
    search.style.outline="none";
    searchWrap.appendChild(search);
    var list=document.createElement("div");
    list.style.overflowY="auto";
    list.style.maxHeight="calc(86vh - 130px)";
    list.style.padding="6px 8px 10px";
    var empty=document.createElement("div");
    empty.textContent=L("Nessun contatto trovato");
    empty.style.padding="22px";
    empty.style.textAlign="center";
    empty.style.color="#6b7280";
    empty.style.fontWeight="700";
    function contactText(c:any){return String([c.name,c.email,c.phone].filter(Boolean).join(" ")).toLowerCase();}
    function render(){
      var q=String(search.value||"").trim().toLowerCase();
      var filtered=q?original.filter(function(c:any){return contactText(c).indexOf(q)>=0;}):original;
      list.innerHTML="";
      if(!filtered.length){list.appendChild(empty);return;}
      filtered.slice(0,250).forEach(function(c:any){
        var row=document.createElement("button");
        row.type="button";
        row.style.width="100%";
        row.style.display="grid";
        row.style.gridTemplateColumns="42px 1fr";
        row.style.gap="10px";
        row.style.alignItems="center";
        row.style.textAlign="left";
        row.style.border="0";
        row.style.background="transparent";
        row.style.borderRadius="14px";
        row.style.padding="10px";
        row.style.cursor="pointer";
        row.onmouseenter=function(){row.style.background="#f3f4f6";};
        row.onmouseleave=function(){row.style.background="transparent";};
        row.onclick=function(){cleanup(c);};
        var avatar=document.createElement("div");
        avatar.textContent=String(c.name||c.email||c.phone||"?").trim().slice(0,1).toUpperCase();
        avatar.style.width="42px";
        avatar.style.height="42px";
        avatar.style.borderRadius="14px";
        avatar.style.background="#dbeafe";
        avatar.style.color="#2563eb";
        avatar.style.display="flex";
        avatar.style.alignItems="center";
        avatar.style.justifyContent="center";
        avatar.style.fontWeight="900";
        var info=document.createElement("div");
        info.style.minWidth="0";
        var name=document.createElement("div");
        name.textContent=c.name||c.email||c.phone||L("Contatto");
        name.style.fontSize="14px";
        name.style.fontWeight="900";
        name.style.whiteSpace="nowrap";
        name.style.overflow="hidden";
        name.style.textOverflow="ellipsis";
        var meta=document.createElement("div");
        meta.textContent=[c.email,c.phone].filter(Boolean).join(" · ");
        meta.style.fontSize="12px";
        meta.style.color="#6b7280";
        meta.style.marginTop="2px";
        meta.style.whiteSpace="nowrap";
        meta.style.overflow="hidden";
        meta.style.textOverflow="ellipsis";
        info.appendChild(name);if(meta.textContent)info.appendChild(meta);
        row.appendChild(avatar);row.appendChild(info);list.appendChild(row);
      });
    }
    function cleanup(value:any){
      if(selected)return;
      selected=true;
      try{document.removeEventListener("keydown",onKey);}catch(e){}
      try{overlay.remove();}catch(e){try{document.body.removeChild(overlay);}catch(_e){}}
      resolve(value);
    }
    function onKey(ev:KeyboardEvent){if(ev.key==="Escape")cleanup(null);}
    search.addEventListener("input",render);
    document.addEventListener("keydown",onKey);
    overlay.onclick=function(ev:any){if(ev&&ev.target===overlay)cleanup(null);};
    card.appendChild(header);card.appendChild(searchWrap);card.appendChild(list);overlay.appendChild(card);document.body.appendChild(overlay);
    render();
    setTimeout(function(){try{search.focus();}catch(e){}},60);
  });
}

async function pickFainanceContact(){
  var plugin=await getFainanceContactsPlugin();
  if(plugin){
    try{if(plugin.isSupported){var sup=await plugin.isSupported();if(sup&&sup.isSupported===false)throw new Error("CONTACTS_NOT_SUPPORTED");}}catch(e){}
    try{if(plugin.isAvailable){var av=await plugin.isAvailable();if(av&&av.isAvailable===false)throw new Error("CONTACTS_NOT_AVAILABLE");}}catch(e){}
    // Prima leggiamo la rubrica dentro l'app: così non si perde lo stato del form al ritorno dal picker Android.
    try{
      if(plugin.getContacts){
        await requestFainanceContactsPermission(plugin);
        var fields=fainanceContactFields();
        var res=await plugin.getContacts({fields:fields,limit:500,offset:0});
        var cleaned=normalizeFainanceContactsResult(res);
        var chosen=await chooseFainanceContactFromList(cleaned);
        if(chosen)return chosen;
      }
    }catch(e){}
    // Fallback: picker nativo Android/iOS.
    var picked=await tryFainanceContactPicker(plugin);
    if(picked)return picked;
  }
  try{
    var nav:any=(typeof navigator!=="undefined"?navigator:null);
    if(nav&&nav.contacts&&nav.contacts.select){var contacts=await nav.contacts.select(["name","email","tel"],{multiple:false});var c=contacts&&contacts[0];if(c)return normalizeFainanceContact(c);}
  }catch(e){}
  return null;
}
try{if(typeof window!=="undefined"){(window as any).fainancePickContact=pickFainanceContact;}}catch(e){}


// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONI.TSX — Pannelli principali dell'app
// HomePanel, SpesePanel, HistoryPanel, ConsulenteAIPanel, FloatingAIButton,
// CopyMonthWidget, PatrimonioPanel, SharePanel, MorePanel, panelContent
// Tutto lo stato viene letto da useApp() — nessuna prop necessaria.
// ═══════════════════════════════════════════════════════════════════════════════

export function HomePanel(){
  var ctx:any=useApp();
  var {lang,expenses,incomes,goals,budgetPlan,shareProjects,shoppingCards,shoppingItems,setShoppingItems,appuntiNotes,bankCoords,creditCards,homeWorklets,setHomeWorklets,currentPlan,setTab,setSettingsPage,setSpeseSubTab,setAddType,setAddSubTab,setToast,fmt,fmtSec,secRate,secondaryCurrency,secRateLoading,currency,sym,secSym,curMonthKey,homeBalanceView,monthShortName,monthFullName,cats,expenseGroups,incomeTypes,isMobile,btnRadius,expenseColor,incomeColor,textC,subC,borderC,cardBg,dark,dateFmt,getCat,getIT,curMonthExp,curMonthInc,last12Balance,pendingCount,alertTriggered,markAlertsSeen,userKey,setVoiceModal,setVoiceText,setVoiceParsed,setVoiceError,setVoiceListening,openVoiceModal,setAiTab,setAiAdviceFilter}:any=ctx;
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  var HOME_LIBRARY=[
    {type:"assistant_voice_widget",icon:"🦗",label:assistantVoiceUiText(lang||"it").title,desc:assistantVoiceUiText(lang||"it").sub},
    {type:"quick_actions",icon:"⚡",label:"Tasti rapidi Entrate / Uscite",desc:"Pulsanti rapidi per inserire entrate e uscite"},
    {type:"summary",icon:"📌",label:"Riassunto",desc:"Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi"},
    {type:"distribution_expenses",icon:"🥧",label:"Distribuzione Uscite",desc:"Grafico per aree di uscita con intervallo temporale"},
    {type:"income_vs_expense",icon:"📊",label:"Entrate vs Uscite",desc:"Confronto mensile tra entrate e uscite"},
    {type:"monthly_balance",icon:"📈",label:"Saldo Mensile",desc:"Andamento del saldo negli ultimi 6 o 12 mesi"},
    {type:"latest_expenses",icon:"🧾",label:"Ultime Uscite",desc:"Lista delle ultime uscite con numero configurabile"},
    {type:"latest_incomes",icon:"💰",label:"Ultime Entrate",desc:"Lista delle ultime entrate con numero configurabile"},
    {type:"share_recent",icon:"🤝",label:"Share - Ultime transazioni",desc:"Ultime transazioni di un progetto Share scelto"},
    {type:"share_balance",icon:"⚖️",label:"Share - Saldo",desc:"Saldo personale di un progetto Share scelto"},
    {type:"planned_saving",icon:"🌱",label:"Risparmio Pianificato",desc:"Risparmio pianificato dal Budget e confronto con il reale"},
    {type:"fidelity_card",icon:"💳",label:"Fidelity Card",desc:"Mostra una carta fidelity o prepagata scelta"},
    {type:"goal",icon:"🎯",label:"Obiettivo",desc:"Avanzamento di un obiettivo scelto"},
    {type:"expenses_by_area",icon:"🗂️",label:"Uscite per Area",desc:"Uscite raggruppate per area"},
    {type:"expenses_by_category",icon:"🏷️",label:"Uscite per Categoria",desc:"Uscite raggruppate per categoria"},
    {type:"incomes_by_type",icon:"💵",label:"Entrate per Tipo",desc:"Entrate raggruppate per tipo"},
    {type:"budget_overview",icon:"📋",label:"Budget - Riepilogo",desc:"Riepilogo budget, spesa reale e risparmio"},
    {type:"budget_by_category",icon:"🧮",label:"Budget - Categorie",desc:"Categorie di budget con consumo del mese"},
    {type:"savings_progress",icon:"📈",label:"Risparmio - Andamento",desc:"Andamento sintetico del risparmio"},
    {type:"note_widget",icon:"📝",label:"Note",desc:"Mostra una nota scelta dagli Appunti"},
    {type:"bank_coord_widget",icon:"🏦",label:"Coordinata bancaria",desc:"Mostra una coordinata bancaria scelta"},
    {type:"credit_card_widget",icon:"💳",label:"Carta di Credito",desc:"Mostra una carta di credito salvata"},
    {type:"shopping_list_widget",icon:"🧺",label:"Lista della spesa",desc:"Mostra gli elementi della lista della spesa scelta"},
    {type:"button_voice",icon:"🎙️",label:"Voce",desc:"Bottone rapido per aprire Voce"},
    {type:"button_receipt",icon:"📷",label:"Scontrino",desc:"Bottone rapido per aprire Scontrino"},
    {type:"button_settings",icon:"⚙",label:"Impostazioni",desc:"Bottone rapido per aprire Impostazioni"},
    {type:"button_share",icon:"🤝",label:"Share",desc:"Bottone rapido per aprire Share"},
    {type:"button_ai_advice",icon:"🦗",label:"Consigli AI",desc:"Bottone rapido per aprire i consigli AI"},
    {type:"button_ai_chat",icon:"💬",label:"Chat AI",desc:"Bottone rapido per aprire la chat AI"},
    {type:"button_stats",icon:"📊",label:"Statistiche",desc:"Bottone rapido per aprire Statistiche"},
    {type:"button_patrimonio",icon:"💎",label:"Patrimonio",desc:"Bottone rapido per aprire Patrimonio"},
    {type:"button_budget",icon:"💰",label:"Budget",desc:"Bottone rapido per aprire Budget"},
    {type:"button_shopping",icon:"🛒",label:"Spesa",desc:"Bottone rapido per aprire Spesa"},
    {type:"button_goals",icon:"🎯",label:"Obiettivi",desc:"Bottone rapido per aprire Obiettivi"},
    {type:"button_alerts",icon:"🔔",label:"Alert",desc:"Bottone rapido per aprire Alert"},
    {type:"button_appunti",icon:"🗂",label:"Appunti",desc:"Bottone rapido per aprire Appunti"}
  ];
  var WORKLET_LABELS:any={};HOME_LIBRARY.forEach(function(x){WORKLET_LABELS[x.type]=x.label;});
  var HOME_DEFAULT_WORKLETS=[
    {id:"home_quick_actions",type:"quick_actions",size:"1x",color:"#F8FAFF",params:{showTitle:false}},
    {id:"home_summary",type:"summary",size:"1x",color:"#FFFFFF",params:{showTitle:false}},
    {id:"home_distribution_expenses",type:"distribution_expenses",size:"1x",color:"#FFFFFF",params:{range:6}},
    {id:"home_income_vs_expense",type:"income_vs_expense",size:"1x",color:"#FFFFFF",params:{range:6}},
    {id:"home_monthly_balance",type:"monthly_balance",size:"2x",color:"#FFFFFF",params:{range:6}},
    {id:"home_latest_expenses",type:"latest_expenses",size:"1x",color:"#FFFFFF",params:{count:5}},
    {id:"home_latest_incomes",type:"latest_incomes",size:"1x",color:"#FFFFFF",params:{count:5}}
  ];
  var HOME_COLORS=["#FFFFFF","#F8FAFF","#F0EDFF","#E8F4FF","#EAF7EE","#FFF8E1","#FFF0F0","#FDF2F8","#EEF2FF","#F1F5F9","#E0F2FE","#DCFCE7","#FEF3C7","#FFE4E6","#EDE9FE","#E0E7FF","#CCFBF1","#F3E8FF","#111827","#1E1E30"];
  var RANGE_LABELS:any={1:"Ultimo mese",3:"Ultimi 3 mesi",6:"Ultimi 6 mesi",12:"Ultimi 12 mesi"};
  var premiumHome=String(currentPlan||"free")==="premium";
  var [homeEditMode,setHomeEditMode]=useState(false);
  var [editDraft,setEditDraft]=useState<any>(null);
  var [dragPayload,setDragPayload]=useState<any>(null);
  var [homeDropIndex,setHomeDropIndex]=useState<any>(null);
  var [homeDragging,setHomeDragging]=useState<any>(null);
  var homePointerDragRef:any=useRef(null);
  var homeCountDraftRef:any=useRef({});
  var homeTitleDraftRef:any=useRef({});
  var [homeDonePos,setHomeDonePos]=useState<any>({right:14,bottom:78});
  var homeDoneDragRef:any=useRef(null);
  var secondaryC=(ctx.secondaryButtonColor||"#7FC8F8");
  var [homeShoppingLists]=useStorage(userKey("shopping_lists_v2"),[{id:"main",title:"Lista principale",icon:"🧺",createdAt:new Date().toISOString()}]);
  var [homeActiveShoppingListId]=useStorage(userKey("shopping_active_list_id_v2"),"main");
  useEffect(function(){
    try{
      var key=(userKey?userKey("home_edit_request_v1"):"home_edit_request_v1");
      if(localStorage.getItem(key)==="1"){
        localStorage.removeItem(key);
        if(premiumHome)setHomeEditMode(true);
      }
    }catch(e){}
  },[premiumHome,userKey]);
  function lib(type){return HOME_LIBRARY.find(function(x){return x.type===type;})||{type:type,icon:"🧩",label:type,desc:""};}
  function safeNum(v){var n=Number(v);return Number.isFinite(n)?n:0;}
  function lastMonthKeys(n){var count=Math.max(1,Number(n)||1);var now=new Date();var arr=[];for(var i=count-1;i>=0;i--){var d=new Date(now.getFullYear(),now.getMonth()-i,1);arr.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));}return arr;}
  function monthLabel(k){var m=parseInt(String(k).slice(5,7),10)-1;var yy=String(k).slice(2,4);var base=monthShortName?monthShortName(m):(MONTHS_SHORT[m]||String(k).slice(5,7));return base+" "+yy;}
  function totalInKeys(list,keys){return (list||[]).reduce(function(a,e){return a+keys.reduce(function(s,k){return s+safeNum(rateMonth(e,k));},0);},0);}
  function sumBy(list,keys,getKey,getLabel,getColor){var map:any={};(list||[]).forEach(function(e){var val=keys.reduce(function(s,k){return s+safeNum(rateMonth(e,k));},0);if(!val)return;var key=getKey(e)||"altro";if(!map[key])map[key]={key:key,label:getLabel(e,key),value:0,color:getColor(e,key)};map[key].value+=val;});return Object.keys(map).map(function(k){return map[k];}).sort(function(a,b){return b.value-a.value;});}
  function allGroups(){var base=(Array.isArray(expenseGroups)&&expenseGroups.length)?expenseGroups:DEFAULT_EXPENSE_GROUPS;var out=base.slice();if(!out.some(function(g){return String(g.id)==="altro";})){var alt=(DEFAULT_EXPENSE_GROUPS||[]).find(function(g){return String(g.id)==="altro";})||{id:"altro",name:"Altro",icon:"📦",color:"#D3D1C7"};out.push(alt);}return out;}
  function groupForExpense(e){var cat=getCat?getCat(e.catId):(cats||[]).find(function(c){return String(c.id)===String(e.catId);});var groups=allGroups();var g=(groups||[]).find(function(x){return cat&&String(x.id)===String(cat.group);});return g||(groups||[]).find(function(x){return String(x.id)==="altro";})||{id:"altro",name:"Altro",icon:"📦",color:"#D3D1C7"};}
  function monthlyChart(n){
    var keys=lastMonthKeys(n);
    return keys.map(function(k){
      var exp=totalInKeys(expenses,[k]);
      var inc=totalInKeys(incomes,[k]);
      return {label:monthLabel(k),exp:exp,inc:inc,value:inc-exp};
    }).filter(function(row){
      // Empty months are not shown: charts contain only months with at least
      // one income or expense, while preserving chronological order.
      return Math.abs(safeNum(row.exp))>0.000001||Math.abs(safeNum(row.inc))>0.000001;
    });
  }
  function rangeTitle(w){var n=(w.params&&w.params.range)||12;return RANGE_LABELS[n]||RANGE_LABELS[12];}
  function workletColor(w){return String((w&&w.color)||"#FFFFFF");}
  function isHomeNavButton(type){return String(type||"").indexOf("button_")===0;}
  function maskHomeCardNumber(n){var clean=String(n||"").replace(/\D/g,"");if(!clean)return "—";if(clean.length<=4)return clean;return "•••• •••• •••• "+clean.slice(-4);}
  function maskHomeIban(v){var s=String(v||"").replace(/\s+/g,"").toUpperCase();if(!s)return "—";return s.length>8?s.slice(0,4)+" •••• "+s.slice(-4):s;}
  function textOnBg(hex){var h=String(hex||"#FFFFFF").replace("#","");if(h.length===3)h=h[0]+h[0]+h[1]+h[1]+h[2]+h[2];var r=parseInt(h.slice(0,2),16)||255,g=parseInt(h.slice(2,4),16)||255,b=parseInt(h.slice(4,6),16)||255;return (r*299+g*587+b*114)/1000<145?"#FFFFFF":"#222222";}
  function defaultParams(type){return {quick_actions:{showTitle:false},summary:{showTitle:false},distribution_expenses:{range:6},income_vs_expense:{range:6},monthly_balance:{range:6},latest_expenses:{count:5},latest_incomes:{count:5},share_recent:{count:5,projectId:(shareProjects&&shareProjects[0]&&shareProjects[0].id)||""},share_balance:{projectId:(shareProjects&&shareProjects[0]&&shareProjects[0].id)||""},planned_saving:{range:12},fidelity_card:{cardId:(shoppingCards&&shoppingCards[0]&&shoppingCards[0].id)||""},goal:{goalId:(goals&&goals[0]&&goals[0].id)||""},expenses_by_area:{range:12},expenses_by_category:{range:12},incomes_by_type:{range:12},budget_overview:{range:12},budget_by_category:{range:12},savings_progress:{range:12},note_widget:{noteId:(appuntiNotes&&appuntiNotes[0]&&appuntiNotes[0].id)||""},bank_coord_widget:{bankId:(bankCoords&&bankCoords[0]&&bankCoords[0].id)||""},credit_card_widget:{creditCardId:(creditCards&&creditCards[0]&&creditCards[0].id)||""},shopping_list_widget:{listId:homeActiveShoppingListId||((homeShoppingLists&&homeShoppingLists[0]&&homeShoppingLists[0].id)||"main")},assistant_voice_widget:{showTitle:true},button_voice:{},button_receipt:{},button_settings:{},button_share:{},button_ai_advice:{},button_ai_chat:{},button_stats:{},button_patrimonio:{},button_budget:{},button_shopping:{},button_goals:{},button_alerts:{},button_appunti:{}}[type]||{};}
  function defaultSize(type){if(type==="assistant_voice_widget")return "1x1";if(isHomeNavButton(type))return "1x";return ["monthly_balance","savings_progress"].indexOf(type)>=0?"2x":"1x";}
  function makeWorklet(type){return {id:"home_"+type+"_"+Date.now()+"_"+Math.floor(Math.random()*1000),type:type,size:defaultSize(type),color:HOME_COLORS[(activeWorklets.length+1)%HOME_COLORS.length],params:{showTitle:true,customTitle:"",...defaultParams(type)}};}
  function normalizeWorkletSize(type,size){var raw=String(size||"");if(type==="assistant_voice_widget")return ["1x1","1x2","2x1","2x2"].indexOf(raw)>=0?raw:"1x1";return raw==="0.5x"?"0.5x":(raw==="1x"?"1x":"2x");}
  function normalizeWorklets(list,allowDefault){var arr=Array.isArray(list)?list:[];if(!arr.length&&allowDefault)arr=HOME_DEFAULT_WORKLETS;var seen:any={};return arr.map(function(w){var raw=String((w&&w.type)||"");var canonical=raw==="button_ai"?"button_ai_advice":(["assistant_voice","voice_assistant","voice_assistant_widget","assistant_widget"].indexOf(raw)>=0?"assistant_voice_widget":raw);return {...(w||{}),type:canonical};}).filter(function(w){return w&&WORKLET_LABELS[w.type]&&!seen[w.type]&&(seen[w.type]=true);}).map(function(w,i){var p=w.params||{};return {...w,id:w.id||("home_w_"+i+"_"+w.type),size:normalizeWorkletSize(w.type,w.size),color:w.color||"#FFFFFF",params:{showTitle:p.showTitle!==false,customTitle:String(p.customTitle||""),...defaultParams(w.type),...p}};});}
    function saveWorklets(arr,msg){if(setHomeWorklets)setHomeWorklets(arr);}
  function sanitizeWorkletParams(type,params){var p={...(params||{})};p.showTitle=p.showTitle!==false;p.customTitle=String(p.customTitle||"").trim();if(p.countInput!==undefined)delete p.countInput;if(["latest_expenses","latest_incomes","share_recent"].indexOf(type)>=0){p.count=Math.max(1,Math.min(20,Number(p.count)||5));}return p;}
  function startHomeEdit(){if(!premiumHome){if(setToast)setToast({text:L("La Home personalizzata è disponibile solo nel piano Completo."),type:"warning",icon:"🔒",color:"#FFF8E1",textColor:"#856404"});setTab("settings");setSettingsPage("plans_settings");return;}setHomeEditMode(true);}
  function emptyBox(text){return <div style={{fontSize:13,color:subC,textAlign:"center",padding:"18px 0"}}>{L(text)}</div>;}
  function listMovement(items,isExp,compact){var sorted=(items||[]).slice().sort(function(a,b){return String(b.date||"").localeCompare(String(a.date||""));});return <div style={{display:"flex",flexDirection:"column",gap:0,minWidth:0}}>{(!sorted||!sorted.length)&&emptyBox(isExp?"Nessuna spesa":"Nessuna entrata")}{sorted.map(function(e){var c=isExp?(getCat?getCat(e.catId):null):null;var it=!isExp?(getIT?getIT(e.type):null):null;return <div key={e.id} style={{display:"flex",alignItems:"center",gap:compact?5:8,padding:compact?"6px 0":"7px 0",borderBottom:"1px solid "+borderC,minWidth:0}}><span style={{fontSize:compact?14:16,flexShrink:0}}>{isExp?(c?c.icon:"📦"):(it?it.icon:"💰")}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:compact?12:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:textC,fontWeight:compact?750:undefined}}>{e.desc||(c?c.name:it?it.name:"")||"-"}</div><div style={{fontSize:compact?10:11,color:subC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{fmtDate(e.date,dateFmt)}</div></div><div style={{textAlign:"right",flexShrink:0,maxWidth:compact?76:132,overflow:"hidden"}}><div style={{fontSize:compact?12:13,fontWeight:700,color:isExp?expenseColor:incomeColor,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmt(safeNum(e.amount))}</div>{!compact&&secRate&&fmtSec&&<div style={{fontSize:10,color:subC,lineHeight:1.15,overflowWrap:"anywhere"}}>{fmtSec(safeNum(e.amount))}</div>}</div></div>;})}</div>;}
  function legendChart(data,compact,doubleSize){var total=(data||[]).reduce(function(a,d){return a+safeNum(d.value);},0);if(!total)return emptyBox("Nessun dato disponibile");if(compact){return <div style={{display:"flex",flexDirection:"column",gap:8,alignItems:"center",minWidth:0}}><DonutChart data={data.slice(0,5)} size={78}/><div style={{width:"100%",minWidth:0}}>{data.slice(0,4).map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:5,marginBottom:4,minWidth:0}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/><span style={{fontSize:10,flex:1,color:subC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label}</span></div>;})}</div></div>;}return <div style={{display:"flex",gap:14,alignItems:"center",minWidth:0}}><DonutChart data={data.slice(0,7)} size={doubleSize?142:104}/><div style={{flex:1,minWidth:0}}>{data.slice(0,7).map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5,minWidth:0}}><div style={{width:9,height:9,borderRadius:"50%",background:d.color,flexShrink:0}}/><span style={{fontSize:11,flex:1,color:subC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.label}</span><span style={{fontSize:11,fontWeight:800,color:textC,whiteSpace:"nowrap"}}>{fmt(d.value)}</span></div>;})}</div></div>;}
  function budgetNumbers(range){var keys=lastMonthKeys(range||12);var items=(budgetPlan&&Array.isArray(budgetPlan.items))?budgetPlan.items:[];var plannedMonthly=items.reduce(function(a,i){return a+safeNum(i.amount);},0);var incomeMonthly=safeNum((budgetPlan&&budgetPlan.manualIncome!=null)?budgetPlan.manualIncome:(budgetPlan&&budgetPlan.income));var factor=Math.max(1,keys.length);var planned=plannedMonthly*factor;var income=incomeMonthly*factor;var saving=Math.max(0,income-planned);var spent=totalInKeys(expenses,keys);var real=totalInKeys(incomes,keys)-spent;return {items:items,keys:keys,planned:planned,income:income,saving:saving,spent:spent,real:real,diff:real-saving};}
  function selectedShareProject(w){var id=w.params&&w.params.projectId;return (shareProjects||[]).find(function(p){return String(p.id)===String(id);})||(shareProjects||[])[0];}
  function selectedGoal(w){var id=w.params&&w.params.goalId;return (goals||[]).find(function(g){return String(g.id)===String(id);})||(goals||[])[0];}
  function selectedCard(w){var id=w.params&&w.params.cardId;return (shoppingCards||[]).find(function(c){return String(c.id)===String(id);})||(shoppingCards||[])[0];}
  function selectedNote(w){var id=w.params&&w.params.noteId;return (appuntiNotes||[]).find(function(n){return String(n.id)===String(id);})||(appuntiNotes||[])[0];}
  function selectedBank(w){var id=w.params&&w.params.bankId;return (bankCoords||[]).find(function(b){return String(b.id)===String(id);})||(bankCoords||[])[0];}
  function selectedCreditCard(w){var id=w.params&&w.params.creditCardId;return (creditCards||[]).find(function(c){return String(c.id)===String(id);})||(creditCards||[])[0];}
  function selectedShoppingList(w){var lists=(homeShoppingLists&&homeShoppingLists.length)?homeShoppingLists:[{id:"main",title:"Lista principale",icon:"🧺"}];var id=(w.params&&w.params.listId)||homeActiveShoppingListId||"main";return lists.find(function(l){return String(l.id)===String(id);})||lists[0];}
  function shoppingItemsForList(list){var id=list?list.id:"main";return (shoppingItems||[]).filter(function(x){return !x.archived&&String(x.listId||"main")===String(id);}).slice().sort(function(a,b){if(!!a.bought!==!!b.bought)return a.bought?1:-1;return (a.order||0)-(b.order||0);});}
  function shareBalance(p){if(!p)return 0;var me=String((ctx.currentUser&&ctx.currentUser.email)||ctx.userId||"").toLowerCase();return (p.activities||[]).reduce(function(a,x){var amt=safeNum(x.amount);var paid=String(x.paidBy||"").toLowerCase();var shares=x.shares||{};var myShare=safeNum(shares[me]!==undefined?shares[me]:shares[ctx.userId]);return a+(paid===me?amt:0)-myShare;},0);}
  function homeEan13CheckDigit(first12){var sum=0;String(first12||"").slice(0,12).split("").forEach(function(ch,i){sum+=(Number(ch)||0)*(i%2===0?1:3);});return String((10-(sum%10))%10);}
  function homeEncodeEan13Bits(raw){var code=String(raw||"").replace(/\D/g,"");if(code.length===12)code+=homeEan13CheckDigit(code);if(code.length!==13)return "";var Lp=["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];var Gp=["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];var Rp=["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];var parity=["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"][Number(code[0])||0];var bits="101";for(var i=1;i<=6;i++){var d=Number(code[i])||0;bits+=(parity[i-1]==="L"?Lp[d]:Gp[d]);}bits+="01010";for(var j=7;j<=12;j++){bits+=Rp[Number(code[j])||0];}bits+="101";return bits;}
  function homeCode128Bits(raw){var value=String(raw||"").trim().replace(/[^ -~]/g,"");if(!value)return "";var patterns=["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];var vals=[];if(/^\d{2,}$/.test(value)){if(value.length%2===0){vals=[105];for(var i=0;i<value.length;i+=2)vals.push(Number(value.slice(i,i+2)));}else{vals=[104,Math.max(0,Math.min(94,value.charCodeAt(0)-32)),99];for(var j=1;j<value.length;j+=2)vals.push(Number(value.slice(j,j+2)));}}else{vals=[104];for(var k=0;k<value.length;k++){var code=value.charCodeAt(k);vals.push(Math.max(0,Math.min(94,code-32)));}}var checksum=vals[0];for(var n=1;n<vals.length;n++)checksum+=vals[n]*n;vals.push(checksum%103);vals.push(106);var bits="";vals.forEach(function(v){var pat=patterns[v]||patterns[0];for(var x=0;x<pat.length;x++){bits+=(x%2===0?"1":"0").repeat(Number(pat[x])||1);}});return bits;}
  function homeBarcodeBars(code){var raw=String(code||"").replace(/[^0-9A-Za-z \.\-_$%\/+]/g,"").trim();var bits=homeCode128Bits(raw);if(!bits){var clean=String(code||"").replace(/\D/g,"");bits=homeEncodeEan13Bits(clean);}if(!bits)return [];bits="0000000000"+bits+"0000000000";return bits.split("").map(function(x){return {on:x==="1"};});}
  function homeQrCells(code){var seed=String(code||"");var cells=[];for(var y=0;y<17;y++){for(var x=0;x<17;x++){var finder=(x<5&&y<5)||(x>11&&y<5)||(x<5&&y>11);var v=finder?((x===0||x===4||y===0||y===4)||(x>1&&x<3&&y>1&&y<3)):(((x*7+y*11+seed.charCodeAt((x+y)%Math.max(seed.length,1)))%5)<2);cells.push({on:v});}}return cells;}
  function homeCardCodePreview(c){var type=c&&c.codeType||"barcode";if(type==="qr"){var cells=homeQrCells(c&&c.code);return <div style={{display:"grid",gridTemplateColumns:"repeat(17,1fr)",gap:1,width:"min(160px,100%)",aspectRatio:"1 / 1",margin:"10px auto 0",background:"#fff",padding:10,borderRadius:12,boxSizing:"border-box"}}>{cells.map(function(cell,i){return <div key={i} style={{background:cell.on?"#111":"#fff"}}/>;})}</div>;}var bars=homeBarcodeBars(c&&c.code);return <div style={{marginTop:12,background:"#fff",borderRadius:12,padding:"12px 10px 8px",overflow:"hidden",boxSizing:"border-box"}}><div style={{display:"flex",alignItems:"stretch",height:68,gap:0,width:"100%",justifyContent:"center"}}>{bars.map(function(b,i){return <div key={i} style={{background:b.on?"#050505":"transparent",height:"100%",flex:"1 1 0",minWidth:0}}/>;})}</div><div style={{color:"#111827",textAlign:"center",fontSize:11,fontWeight:900,letterSpacing:1.2,marginTop:6,wordBreak:"break-all"}}>{String(c&&c.code||"")}</div></div>;}
  function homeButtonDef(type){var map:any={button_voice:{icon:"🎙️",label:"Voce",tab:"voice"},button_receipt:{icon:"📷",label:"Scontrino",tab:"receipt"},button_settings:{icon:"⚙",label:"Impostazioni",tab:"settings"},button_share:{icon:"🤝",label:"Share",tab:"share"},button_ai_advice:{icon:"ai",label:"Consigli AI",tab:"consulenteAI",aiTab:"consigli"},button_ai_chat:{icon:"💬",label:"Chat AI",tab:"consulenteAI",aiTab:"chat"},button_ai:{icon:"ai",label:"Consigli AI",tab:"consulenteAI",aiTab:"consigli"},button_stats:{icon:"📊",label:"Statistiche",tab:"stats"},button_patrimonio:{icon:"💎",label:"Patrimonio",tab:"patrimonio"},button_budget:{icon:"💰",label:"Budget",tab:"budget"},button_shopping:{icon:"🛒",label:"Spesa",tab:"shopping"},button_goals:{icon:"🎯",label:"Obiettivi",tab:"goals"},button_alerts:{icon:"🔔",label:"Alert",tab:"alerts"},button_appunti:{icon:"🗂",label:"Appunti",tab:"appunti"}};return map[type]||{icon:"🧩",label:type,tab:"home"};}
  function homeScrollTop(){function run(){try{window.scrollTo({top:0,left:0,behavior:"auto"});document.documentElement.scrollTop=0;document.body.scrollTop=0;var nodes=document.querySelectorAll("div");for(var i=0;i<nodes.length;i++){var el:any=nodes[i];var st=getComputedStyle(el);if((st.overflowY==="auto"||st.overflowY==="scroll")&&el.scrollHeight>el.clientHeight){el.scrollTop=0;}}}catch(_e){}}[0,80,220,500].forEach(function(ms){setTimeout(run,ms);});}
  function openHomeButton(type){var d=homeButtonDef(type);if(d.tab==="voice"){if(openVoiceModal)openVoiceModal();else{if(setVoiceText)setVoiceText("");if(setVoiceParsed)setVoiceParsed(null);if(setVoiceError)setVoiceError("");if(setVoiceListening)setVoiceListening(false);if(setVoiceModal)setVoiceModal(true);}homeScrollTop();return;}if(d.tab==="receipt"){setTab("spese");setSpeseSubTab("add");setAddType("expense");setAddSubTab("receipt");homeScrollTop();return;}setTab(d.tab);if(d.tab==="settings"&&setSettingsPage)setSettingsPage(null);if(d.tab==="consulenteAI"&&setAiTab){setAiTab(d.aiTab||"consigli");if(d.aiTab==="chat"){try{localStorage.setItem("fainance_open_ai_chat_input_once","1");}catch(_e){}[120,320,700].forEach(function(ms){setTimeout(function(){try{window.dispatchEvent(new Event("fainance-focus-ai-chat-input"));}catch(_e){}},ms);});return;}if(d.aiTab==="consigli"&&setAiAdviceFilter)setAiAdviceFilter("all");}homeScrollTop();}
  function homeButtonIcon(type,sz){var d=homeButtonDef(type);if(d.icon==="ai")return <AIGrilloIcon size={sz||28}/>;return <span style={{fontSize:sz||28,lineHeight:1}}>{d.icon}</span>;}
  function homeTitleText(w){var custom=w&&w.params?String(w.params.customTitle||"").trim():"";return custom||L((lib(w.type).label)||w.type);}
  function homeShowTitle(w){return !(w&&w.params&&w.params.showTitle===false);}
  function draftCountKey(d){return String((d&&d.id)||(d&&d.type)||"home_count");}
  function draftTitleKey(d){return String((d&&d.id)||(d&&d.type)||"home_title")+"_title";}
  function toggleHomeShoppingItem(id){if(!setShoppingItems)return;setShoppingItems(function(list){return (list||[]).map(function(x){return String(x.id)===String(id)?{...x,bought:!x.bought,boughtAt:!x.bought?new Date().toISOString():"",updatedAt:new Date().toISOString()}:x;});});}
  function renderWorklet(w){var range=Number((w.params&&w.params.range)||12);var keys=lastMonthKeys(range);var compact=String(w.size||"")==="0.5x";var doubleSize=String(w.size||"")==="2x";if(w.type==="assistant_voice_widget"){var av=assistantVoiceUiText(lang||"it");var avSize=String(w.size||"1x1"),avTall=avSize==="1x2"||avSize==="2x2",avWide=avSize==="2x1"||avSize==="2x2";return <button type="button" onClick={function(){if(openVoiceModal)openVoiceModal();else if(setVoiceModal)setVoiceModal(true);}} style={{width:"100%",height:"100%",minHeight:avTall?172:78,border:"none",borderRadius:14,background:"linear-gradient(135deg,rgba(127,119,221,.18),rgba(55,138,221,.13))",color:textC,display:"flex",alignItems:"center",justifyContent:"center",gap:avWide?16:8,flexDirection:avWide?"row":"column",padding:avTall?16:10,cursor:"pointer",textAlign:avWide?"left":"center",overflow:"hidden"}}><AIGrilloIcon size={avTall?(avWide?84:76):(avWide?58:46)}/><div style={{minWidth:0,maxWidth:avWide?280:"100%"}}>{homeShowTitle(w)&&<div style={{fontSize:avTall?17:14,fontWeight:950,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{homeTitleText(w)}</div>}<div style={{fontSize:avTall?12:10,color:subC,lineHeight:1.35,marginTop:homeShowTitle(w)?4:0,display:"-webkit-box",WebkitLineClamp:avTall?3:1,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{av.sub}</div><div style={{display:"inline-flex",alignItems:"center",gap:5,marginTop:avTall?10:5,padding:avTall?"7px 10px":"4px 8px",borderRadius:999,background:"#7F77DD",color:"#fff",fontSize:avTall?12:10,fontWeight:900}}>🎙️ {av.speak}</div></div></button>;}if(isHomeNavButton(w.type)){var bd=homeButtonDef(w.type);var showLabel=homeShowTitle(w);var lbl=homeTitleText(w);return <button type="button" onClick={function(){openHomeButton(w.type);}} style={{width:"100%",height:doubleSize?"100%":undefined,minHeight:doubleSize?88:56,border:"none",borderRadius:14,background:secondaryC,color:"#fff",display:"flex",alignItems:"center",justifyContent:"center",gap:compact?4:8,flexDirection:compact?"column":"row",fontSize:compact?10:13,fontWeight:950,cursor:"pointer",boxShadow:dark?"none":"0 8px 18px rgba(0,0,0,.12)",padding:compact?"8px 4px":"10px 10px",textAlign:"center",lineHeight:1.12,overflow:"hidden"}}>{homeButtonIcon(w.type,compact?22:28)}{showLabel&&<span style={{overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:compact?2:1,WebkitBoxOrient:"vertical"}}>{lbl}</span>}</button>;}if(w.type==="quick_actions")return <div style={{display:"flex",gap:compact?8:10,flexDirection:compact?"column":"row",flexWrap:"wrap",height:doubleSize?"100%":undefined,alignItems:doubleSize?"stretch":undefined}}><Btn onClick={function(){setTab("spese");setSpeseSubTab("add");setAddType("expense");setAddSubTab("single");}} bg={expenseColor} style={{flex:1,minWidth:compact?0:130,padding:compact?"10px 8px":"12px 16px",minHeight:doubleSize?72:undefined,fontWeight:900,fontSize:compact?12:undefined}}>− {L(t.expense||"Uscita")}</Btn><Btn onClick={function(){setTab("spese");setSpeseSubTab("add");setAddType("income");setAddSubTab("single");}} bg={incomeColor} style={{flex:1,minWidth:compact?0:130,padding:compact?"10px 8px":"12px 16px",minHeight:doubleSize?72:undefined,fontWeight:900,fontSize:compact?12:undefined}}>+ {L(t.income||"Entrata")}</Btn></div>;
    if(w.type==="summary"){var secBal=fmtSec&&fmtSec(curMonthInc-curMonthExp);return <div style={{display:"grid",gridTemplateColumns:compact?"1fr":(isMobile?"1fr 1fr":"repeat(4,1fr)"),gap:compact?8:12}}><StatCard title={L("Uscite mese")} value={fmt(curMonthExp)} color={expenseColor} bg={expenseColor+"22"} sub={(fmtSec&&fmtSec(curMonthExp))&&(secRateLoading?"...":fmtSec(curMonthExp))||undefined}/><StatCard title={L("Entrate mese")} value={fmt(curMonthInc)} color={incomeColor} bg={incomeColor+"22"} sub={(fmtSec&&fmtSec(curMonthInc))&&(secRateLoading?"...":fmtSec(curMonthInc))||undefined}/><StatCard title={L("Saldo mese")} value={fmt(curMonthInc-curMonthExp)} color="#378ADD" bg="#e8f4ff" sub={secBal&&(secRateLoading?"...":secBal)||undefined}/><StatCard title={L("Saldo ultimi 12 mesi")} value={fmt(last12Balance)} color={BALANCE_COLOR} bg="#e8f4ff" sub={(fmtSec&&fmtSec(last12Balance))&&(secRateLoading?"...":fmtSec(last12Balance))||undefined}/></div>;}
    if(w.type==="distribution_expenses"||w.type==="expenses_by_area"){var data=sumBy(expenses,keys,function(e){return groupForExpense(e).id;},function(e){var g=groupForExpense(e);return (g.icon?g.icon+" ":"")+(g.name||"Altro");},function(e){return groupForExpense(e).color||expenseColor;});return legendChart(data,compact,doubleSize);}
    if(w.type==="expenses_by_category"){var data2=sumBy(expenses,keys,function(e){return e.catId||"altro";},function(e){var c=getCat?getCat(e.catId):null;return (c&&c.icon?c.icon+" ":"")+(c&&c.name?c.name:L("Altro"));},function(e){var c=getCat?getCat(e.catId):null;return (c&&c.color)||expenseColor;});return legendChart(data2,compact,doubleSize);}
    if(w.type==="incomes_by_type"){var data3=sumBy(incomes,keys,function(e){return e.type||"other";},function(e){var it=getIT?getIT(e.type):null;return (it&&it.icon?it.icon+" ":"")+(it&&it.name?it.name:L("Altro"));},function(e){var it=getIT?getIT(e.type):null;return (it&&it.color)||incomeColor;});return legendChart(data3,compact,doubleSize);}
    if(w.type==="income_vs_expense")return <div style={{overflow:"hidden",width:"100%"}}><BarChart data={monthlyChart(range)} width={compact?150:(isMobile?420:640)} height={compact?132:(doubleSize?300:170)}/></div>;
    if(w.type==="monthly_balance")return <div style={{overflow:"hidden",width:"100%"}}><LineChart data={monthlyChart(range).map(function(m){return {label:m.label,value:m.value};})} width={compact?150:(isMobile?360:560)} height={compact?128:(doubleSize?300:170)} color={BALANCE_COLOR}/></div>;
    if(w.type==="latest_expenses"){var n=Math.max(1,Number(w.params&&w.params.count)||5);return listMovement((expenses||[]).slice(0,n),true,compact);}
    if(w.type==="latest_incomes"){var n2=Math.max(1,Number(w.params&&w.params.count)||5);return listMovement((incomes||[]).slice(0,n2),false,compact);}
    if(w.type==="share_recent"){var p=selectedShareProject(w);var acts=p?(p.activities||[]).slice().sort(function(a,b){return String(b.date||"").localeCompare(String(a.date||""));}).slice(0,Math.max(1,Number(w.params&&w.params.count)||5)):[];var maxH=doubleSize?260:(compact?112:118);return <div style={{display:"flex",flexDirection:"column",minWidth:0,height:"100%"}}>{!p&&emptyBox("Nessun progetto Share")}{p&&<div style={{fontSize:compact?11:12,color:subC,marginBottom:6,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.name}</div>}<div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",paddingRight:2,maxHeight:maxH}}>{acts.map(function(a,i){return <div key={i} style={{display:"flex",justifyContent:"space-between",gap:8,padding:compact?"5px 0":"7px 0",borderBottom:"1px solid "+borderC,minWidth:0}}><div style={{minWidth:0,flex:1}}><div style={{fontSize:compact?12:13,color:textC,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.desc||a.note||L("Transazione")}</div><div style={{fontSize:compact?10:11,color:subC}}>{fmtDate(a.date,dateFmt)}</div></div><div style={{fontSize:compact?12:13,fontWeight:900,color:expenseColor,whiteSpace:"nowrap"}}>{fmt(safeNum(a.amount))}</div></div>;})}</div></div>;}
        if(w.type==="share_balance"){var sp=selectedShareProject(w);var bal=shareBalance(sp);return <div>{!sp&&emptyBox("Nessun progetto Share")} {sp&&<><div style={{fontSize:13,color:subC,marginBottom:6}}>{sp.name}</div><div style={{fontSize:26,fontWeight:950,color:bal>=0?incomeColor:expenseColor}}>{fmt(bal)}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{bal>=0?L("Credito stimato"):L("Quota da saldare")}</div></>}</div>;}
    if(w.type==="planned_saving"){var b=budgetNumbers(range);var realPositive=b.real>=0;var diffPositive=b.diff>=0;var plannedBase=Math.abs(Number(b.saving)||0);var realForProgress=Math.max(0,Number(b.real)||0);var savingProgress=plannedBase>0?Math.max(0,Math.min(100,(realForProgress/plannedBase)*100)):(realForProgress>0?100:0);var savingSurface=dark?"rgba(255,255,255,.055)":"rgba(255,255,255,.76)";var savingBorder=dark?"rgba(255,255,255,.10)":"rgba(15,23,42,.07)";return <div style={{display:"flex",flexDirection:"column",gap:compact?8:10,height:"100%",justifyContent:"space-between"}}><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:compact?7:10}}><div style={{background:savingSurface,border:"1px solid "+savingBorder,borderRadius:12,padding:compact?"9px 10px":"11px 12px",minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:5,fontSize:compact?9:10,fontWeight:850,color:subC,lineHeight:1.15,marginBottom:5}}><span style={{fontSize:compact?12:14}}>🌱</span><span style={{minWidth:0}}>{L("Risparmio pianificato")}</span></div><div style={{fontSize:compact?15:18,fontWeight:950,color:"#1D9E75",lineHeight:1.05,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmt(b.saving)}</div></div><div style={{background:savingSurface,border:"1px solid "+savingBorder,borderRadius:12,padding:compact?"9px 10px":"11px 12px",minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:5,fontSize:compact?9:10,fontWeight:850,color:subC,lineHeight:1.15,marginBottom:5}}><span style={{fontSize:compact?12:14}}>{realPositive?"✓":"!"}</span><span style={{minWidth:0}}>{L("Risparmio reale")}</span></div><div style={{fontSize:compact?15:18,fontWeight:950,color:realPositive?"#1D9E75":"#E24B4A",lineHeight:1.05,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{fmt(b.real)}</div></div></div><div style={{background:savingSurface,border:"1px solid "+savingBorder,borderRadius:12,padding:compact?"9px 10px":"10px 12px"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:7}}><span style={{fontSize:compact?9:10,fontWeight:850,color:subC}}>{L("Scostamento")}</span><span style={{fontSize:compact?11:12,fontWeight:950,color:diffPositive?incomeColor:expenseColor,whiteSpace:"nowrap"}}>{b.diff>=0?"+":""}{fmt(b.diff)}</span></div><div style={{height:compact?6:7,borderRadius:999,background:dark?"rgba(255,255,255,.10)":"rgba(15,23,42,.08)",overflow:"hidden"}}><div style={{height:"100%",width:savingProgress+"%",maxWidth:"100%",borderRadius:999,background:realPositive?"linear-gradient(90deg,#1D9E75,#4BC18F)":"linear-gradient(90deg,#E24B4A,#F29F3D)",transition:"width .25s ease"}}/></div></div></div>;}if(w.type==="budget_overview"){var b2=budgetNumbers(range);return <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><StatCard title={L("Risparmio pianificato")} value={fmt(b2.saving)} color="#1D9E75" bg="#E8F8F0"/><StatCard title={L("Risparmio reale")} value={fmt(b2.real)} color={b2.real>=0?"#1D9E75":"#E24B4A"} bg={b2.real>=0?"#E8F8F0":"#FFF0F0"}/><div style={{gridColumn:"1/-1",fontSize:12,color:subC}}>{L("Scostamento")}: <b style={{color:b2.diff>=0?incomeColor:expenseColor}}>{b2.diff>=0?"+":""}{fmt(b2.diff)}</b></div></div>;}
    if(w.type==="savings_progress"){var rows=monthlyChart(range).map(function(m){return {label:m.label,value:m.value};});return <div style={{overflow:"hidden",width:"100%"}}><LineChart data={rows} width={compact?150:(isMobile?360:560)} height={compact?110:(doubleSize?240:108)} color="#1D9E75"/></div>;}
    if(w.type==="budget_by_category"){var b2=budgetNumbers(range);if(!b2.items.length)return emptyBox("Nessun budget configurato");return <div>{b2.items.slice(0,6).map(function(it,i){var c=getCat?getCat(it.catId):null;var spent=(expenses||[]).reduce(function(a,e){return String(e.catId)===String(it.catId)?a+b2.keys.reduce(function(s,k){return s+safeNum(rateMonth(e,k));},0):a;},0);var lim=safeNum(it.amount)*Math.max(1,b2.keys.length);var pct=lim>0?Math.min(100,(spent/lim)*100):0;return <div key={i} style={{marginBottom:8}}><div style={{display:"flex",justifyContent:"space-between",gap:8,fontSize:12,color:textC}}><span>{c&&c.icon} {c?c.name:L("Categoria")}</span><b>{fmt(spent)} / {fmt(lim)}</b></div><div style={{height:7,borderRadius:999,background:dark?"#333":"#eef",overflow:"hidden",marginTop:4}}><div style={{height:7,width:pct+"%",background:pct>=100?expenseColor:"#7F77DD"}}/></div></div>;})}</div>;}
    if(w.type==="note_widget"){var note=selectedNote(w);if(!note)return emptyBox("Nessuna nota inserita");return <div style={{display:"flex",flexDirection:"column",gap:8,minWidth:0}}><div style={{fontSize:compact?14:17,fontWeight:950,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{note.title||L("Nota")}</div><div style={{fontSize:compact?12:13,color:subC,lineHeight:1.35,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:doubleSize?8:(compact?4:5),WebkitBoxOrient:"vertical",whiteSpace:"pre-wrap"}}>{note.text||note.title||""}</div></div>;}
    if(w.type==="bank_coord_widget"){var bank=selectedBank(w);if(!bank)return emptyBox("Nessuna coordinata bancaria");return <div style={{display:"flex",flexDirection:"column",gap:7,minWidth:0}}><div style={{fontSize:compact?14:17,fontWeight:950,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bank.bank||L("Coordinata bancaria")}</div>{bank.holder&&<div style={{fontSize:12,color:subC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bank.holder}</div>}<div style={{fontSize:compact?13:15,fontWeight:950,color:textC,letterSpacing:.4,wordBreak:"break-all"}}>{maskHomeIban(bank.iban)}</div>{!compact&&bank.bic&&<div style={{fontSize:12,color:subC}}>BIC: {bank.bic}</div>}</div>;}
    if(w.type==="credit_card_widget"){var cc=selectedCreditCard(w);if(!cc)return emptyBox("Nessuna carta di credito");return <div style={{background:"linear-gradient(135deg,#334155,#111827 82%)",borderRadius:18,padding:compact?12:16,color:"#fff",minHeight:doubleSize?230:(compact?110:145),display:"flex",flexDirection:"column",justifyContent:"space-between",boxSizing:"border-box"}}><div><div style={{fontSize:compact?14:18,fontWeight:950,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cc.name||cc.issuer||L("Carta di Credito")}</div>{cc.holder&&<div style={{fontSize:11,opacity:.76,marginTop:4,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{cc.holder}</div>}</div><div><div style={{fontSize:compact?14:18,fontWeight:950,letterSpacing:1.2}}>{maskHomeCardNumber(cc.number)}</div>{cc.expiry&&<div style={{fontSize:11,opacity:.76,marginTop:4}}>{L("Scadenza")}: {cc.expiry}</div>}</div></div>;}
    if(w.type==="shopping_list_widget"){var sl=selectedShoppingList(w);var rows=shoppingItemsForList(sl);var openRows=rows.filter(function(x){return !x.bought;});var maxH2=doubleSize?300:(compact?118:150);return <div style={{display:"flex",flexDirection:"column",gap:7,minWidth:0,height:"100%"}}><div style={{display:"flex",alignItems:"center",gap:8,minWidth:0,flexShrink:0}}><span style={{fontSize:compact?18:22}}>{sl&&sl.icon||"🧺"}</span><div style={{minWidth:0}}><div style={{fontSize:compact?14:17,fontWeight:950,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{sl&&sl.title||L("Lista della spesa")}</div><div style={{fontSize:11,color:subC}}>{openRows.length} {L("da comprare")}</div></div></div><div style={{overflowY:"auto",WebkitOverflowScrolling:"touch",paddingRight:2,maxHeight:maxH2}}>{rows.map(function(x){var bought=!!x.bought;return <button type="button" key={x.id} onClick={function(e){e.stopPropagation();toggleHomeShoppingItem(x.id);}} style={{width:"100%",border:"none",background:bought?(ctx.shoppingBoughtColor||"#EAF7EE"):"transparent",borderRadius:10,display:"flex",alignItems:"center",gap:7,minWidth:0,fontSize:compact?12:13,color:bought?subC:textC,padding:"6px 4px",borderBottom:"1px solid "+borderC,cursor:"pointer",textAlign:"left"}}><span style={{fontSize:15,flexShrink:0}}>{bought?"☑":"☐"}</span><span style={{flex:1,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",textDecoration:bought?"line-through":"none"}}>{x.name}</span>{x.qty&&String(x.qty)!=="1"&&<span style={{fontSize:11,color:subC,flexShrink:0}}>{x.qty} {x.unit||""}</span>}</button>;})}{!rows.length&&emptyBox("Lista vuota")}</div></div>;}
        if(w.type==="fidelity_card"){var card=selectedCard(w);if(!card)return emptyBox("Nessuna carta Fidelity");var bg=card.color||"#0F9F76";return <div style={{background:"linear-gradient(135deg,"+bg+",#101828 82%)",borderRadius:18,padding:16,color:"#fff",minHeight:doubleSize?260:(compact?150:170)}}><div style={{fontSize:18,fontWeight:950}}>{card.name||L("Carta")}</div>{homeCardCodePreview(card)}</div>;}
    if(w.type==="goal"){var g=selectedGoal(w);if(!g)return emptyBox("Nessun obiettivo");var target=safeNum(g.target),saved=safeNum(g.saved),pct2=target>0?Math.min(100,(saved/target)*100):0;return <div><div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{fontSize:26}}>{g.icon||"🎯"}</div><div><div style={{fontSize:16,fontWeight:950,color:textC}}>{g.name}</div><div style={{fontSize:12,color:subC}}>{Math.round(pct2)}% · {fmt(saved)} / {fmt(target)}</div></div></div><div style={{height:10,borderRadius:999,background:dark?"#333":"#eef",overflow:"hidden"}}><div style={{height:10,width:pct2+"%",background:g.color||"#7F77DD"}}/></div></div>;}
    return emptyBox("Worklet non disponibile");
  }
  var activeWorklets=premiumHome?normalizeWorklets(homeWorklets,true):HOME_DEFAULT_WORKLETS;
  function insertedTypes(){var m:any={};activeWorklets.forEach(function(w){m[w.type]=true;});return m;}
  function availableItems(){var m=insertedTypes();return HOME_LIBRARY.filter(function(x){return x.type!=="assistant_voice_widget"&&!m[x.type];});}
  function applyDraft(){if(!editDraft)return;var rawCount=homeCountDraftRef.current?homeCountDraftRef.current[draftCountKey(editDraft)]:undefined;var rawTitle=homeTitleDraftRef.current?homeTitleDraftRef.current[draftTitleKey(editDraft)]:undefined;var mergedParams={...(editDraft.params||{})};if(rawTitle!==undefined)mergedParams.customTitle=rawTitle;if(rawCount!==undefined&&["latest_expenses","latest_incomes","share_recent"].indexOf(editDraft.type)>=0){mergedParams.count=Math.max(1,Math.min(20,Number(rawCount)||1));}var draft={...editDraft,params:sanitizeWorkletParams(editDraft.type,mergedParams)};if(homeCountDraftRef.current)delete homeCountDraftRef.current[draftCountKey(editDraft)];if(homeTitleDraftRef.current)delete homeTitleDraftRef.current[draftTitleKey(editDraft)];if(draft.mode==="add"){var w={id:draft.id||("home_"+draft.type+"_"+Date.now()),type:draft.type,size:draft.size||defaultSize(draft.type),color:draft.color||"#FFFFFF",params:draft.params||{}};saveWorklets(activeWorklets.concat([w]));setEditDraft(null);return;}saveWorklets(activeWorklets.map(function(w){return String(w.id)===String(draft.id)?{id:w.id,type:w.type,size:draft.size||w.size,color:draft.color||w.color,params:draft.params||{}}:w;}));setEditDraft(null);}
  function removeDraft(){if(!editDraft||editDraft.mode==="add")return;saveWorklets(activeWorklets.filter(function(w){return String(w.id)!==String(editDraft.id);}));setEditDraft(null);}
  function removeActive(id){saveWorklets(activeWorklets.filter(function(w){return String(w.id)!==String(id);}));if(editDraft&&String(editDraft.id)===String(id))setEditDraft(null);}
  function openActiveSettings(w){setEditDraft({...w,mode:"edit",params:{...(w.params||{})}});}
  function openLibrarySettings(type){var w=makeWorklet(type);setEditDraft({...w,mode:"add"});}
  function insertAtFromLibrary(type,index,openPopup){if(insertedTypes()[type])return;var w=makeWorklet(type);var arr=activeWorklets.slice();var to=Math.max(0,Math.min(index,arr.length));arr.splice(to,0,w);saveWorklets(arr);if(openPopup)setEditDraft({...w,mode:"edit"});else setEditDraft(null);}
  function moveActive(from,to){if(from===undefined||from===null||from<0||from>=activeWorklets.length||to<0||from===to)return;var arr=activeWorklets.slice();var item=arr.splice(from,1)[0];var target=Math.max(0,Math.min(Number(to),arr.length));arr.splice(target,0,item);saveWorklets(arr);setEditDraft(null);setHomeDropIndex(null);}
  function readDrag(e){try{var raw=e.dataTransfer&&e.dataTransfer.getData("application/x-fainance-home-worklet");if(raw)return JSON.parse(raw);}catch(_e){}return dragPayload;}
  function getDropIndexFromPoint(x,y){var index=activeWorklets.length;try{var el=document.elementFromPoint(x,y);var node=el&&el.closest?el.closest("[data-home-worklet-index]"):null;if(node){var raw=node.getAttribute("data-home-worklet-index");if(raw!==null&&raw!==""){var idx=Number(raw);var r=node.getBoundingClientRect();var midY=r.top+(r.height/2);var midX=r.left+(r.width/2);if(Math.abs(y-midY)<Math.max(22,r.height*.32))index=idx+(x>midX?1:0);else index=idx+(y>midY?1:0);}}}catch(_e){}return Math.max(0,Math.min(index,activeWorklets.length));}
  function applyActiveDrop(from,dropIndex){if(from===undefined||from===null||from<0||from>=activeWorklets.length)return;var di=Math.max(0,Math.min(Number(dropIndex),activeWorklets.length));if(di===from||di===from+1){setEditDraft(null);setHomeDropIndex(null);return;}var arr=activeWorklets.slice();var item=arr.splice(from,1)[0];var target=Math.max(0,Math.min(di,arr.length));if(from<di)target=Math.max(0,target-1);arr.splice(target,0,item);saveWorklets(arr);setEditDraft(null);setHomeDropIndex(null);}
  function completeHomeDrag(payload,dropIndex){setDragPayload(null);setHomeDragging(null);setHomeDropIndex(null);if(!payload)return;if(payload.source==="library")insertAtFromLibrary(payload.type,dropIndex,true);if(payload.source==="active")applyActiveDrop(Number(payload.index),dropIndex);}
  function dropAt(e,index){try{e.preventDefault();e.stopPropagation();}catch(_e){}var payload=readDrag(e);completeHomeDrag(payload,index);}
  function isInteractiveTarget(target){try{return !!(target&&target.closest&&target.closest("button,input,select,textarea,label"));}catch(_e){return false;}}
  function clearHomeDragTimer(state){try{if(state&&state.timer)clearTimeout(state.timer);}catch(_e){}}
  function armHomeDrag(state,target,pointerId){var cur=homePointerDragRef.current;if(!cur||cur!==state)return;cur.armed=true;cur.moved=false;setDragPayload(state.payload);setHomeDragging(state.payload);setHomeDropIndex(state.payload&&state.payload.source==="active"?Number(state.payload.index):activeWorklets.length);try{if(target&&target.setPointerCapture&&pointerId!==undefined)target.setPointerCapture(pointerId);}catch(_e){}}
  function startPointerDrag(e,payload){if(!homeEditMode||!premiumHome||isInteractiveTarget(e.target))return;if(e.pointerType==="touch")return;if(e.button!==undefined&&e.button!==0)return;var target=e.currentTarget;var pointerId=e.pointerId;var state:any={payload:payload,startX:e.clientX,startY:e.clientY,lastX:e.clientX,lastY:e.clientY,moved:false,armed:false,timer:null};state.timer=setTimeout(function(){armHomeDrag(state,target,pointerId);},2000);homePointerDragRef.current=state;}
  function movePointerDrag(e){var s=homePointerDragRef.current;if(!s||e.pointerType==="touch")return;var dx=Math.abs(e.clientX-s.startX),dy=Math.abs(e.clientY-s.startY);if(!s.armed){if(dx>10||dy>10){clearHomeDragTimer(s);homePointerDragRef.current=null;}return;}s.lastX=e.clientX;s.lastY=e.clientY;if(dx>7||dy>7)s.moved=true;var di=getDropIndexFromPoint(e.clientX,e.clientY);setHomeDropIndex(di);try{e.preventDefault();e.stopPropagation();}catch(_e){}}
  function endPointerDrag(e){var s=homePointerDragRef.current;if(!s||e.pointerType==="touch")return;clearHomeDragTimer(s);homePointerDragRef.current=null;if(!s.armed||!s.moved){setHomeDragging(null);setHomeDropIndex(null);return;}try{e.preventDefault();e.stopPropagation();}catch(_e){}var x=e.clientX||s.lastX,y=e.clientY||s.lastY;completeHomeDrag(s.payload,getDropIndexFromPoint(x,y));}
  function cancelHomePointerDrag(){var s=homePointerDragRef.current;clearHomeDragTimer(s);homePointerDragRef.current=null;setHomeDragging(null);setHomeDropIndex(null);setDragPayload(null);}
  function touchPoint(e,end){var list=end?e.changedTouches:e.touches;var t=list&&list[0];return t?{x:t.clientX,y:t.clientY}:null;}
  function startTouchDrag(e,payload){if(!homeEditMode||!premiumHome||isInteractiveTarget(e.target))return;if(!e.touches||e.touches.length!==1)return;var p=touchPoint(e,false);if(!p)return;var target=e.currentTarget;var state:any={payload:payload,startX:p.x,startY:p.y,lastX:p.x,lastY:p.y,moved:false,armed:false,timer:null,touch:true};state.timer=setTimeout(function(){armHomeDrag(state,target,undefined);},2000);homePointerDragRef.current=state;}
  function moveTouchDrag(e){var s=homePointerDragRef.current;if(!s||!s.touch)return;var p=touchPoint(e,false);if(!p)return;var dx=Math.abs(p.x-s.startX),dy=Math.abs(p.y-s.startY);if(!s.armed){if(dx>10||dy>10){clearHomeDragTimer(s);homePointerDragRef.current=null;}return;}s.lastX=p.x;s.lastY=p.y;if(dx>7||dy>7)s.moved=true;setHomeDropIndex(getDropIndexFromPoint(p.x,p.y));try{e.preventDefault();e.stopPropagation();}catch(_e){}}
  function endTouchDrag(e){var s=homePointerDragRef.current;if(!s||!s.touch)return;clearHomeDragTimer(s);homePointerDragRef.current=null;if(!s.armed||!s.moved){setHomeDragging(null);setHomeDropIndex(null);setDragPayload(null);return;}var p=touchPoint(e,true)||{x:s.lastX,y:s.lastY};try{e.preventDefault();e.stopPropagation();}catch(_e){}completeHomeDrag(s.payload,getDropIndexFromPoint(p.x,p.y));}
  function cancelTouchDrag(){cancelHomePointerDrag();}
  function cleanHomeWorkletTitle(v){return String(v==null?"":v).replace(/[\s\u00A0\u2007\u202F\-‐‑‒–—―:·•]+$/g,"").trim();}
  function cardTitle(w){var item=lib(w.type);return (item.icon?item.icon+" ":"")+cleanHomeWorkletTitle(homeTitleText(w));}
  function rangeBadge(w){var txt="";if(["distribution_expenses","income_vs_expense","expenses_by_area","expenses_by_category","incomes_by_type","planned_saving","budget_overview","budget_by_category","savings_progress"].indexOf(w.type)>=0)txt=L(rangeTitle(w));else if(w.type==="monthly_balance")txt=((w.params&&w.params.range)==6?L("Ultimi 6 mesi"):L("Ultimi 12 mesi"));return cleanHomeWorkletTitle(txt);}
  function isGraphWorklet(type){return ["distribution_expenses","expenses_by_area","expenses_by_category","incomes_by_type","income_vs_expense","monthly_balance","savings_progress"].indexOf(String(type||""))>=0;}
  function workletCard(w,index,available){
    var bg=workletColor(w),fg=textOnBg(bg),size=String(w.size||"2x"),assistantType=w.type==="assistant_voice_widget",assistantWide=size==="2x1"||size==="2x2",assistantTall=size==="1x2"||size==="2x2",compact=size==="0.5x",buttonType=isHomeNavButton(w.type);
    var spanUnits=assistantType?(assistantWide?4:2):(buttonType?(size==="0.5x"?1:(size==="1x"?2:4)):(compact?2:(isMobile?4:(size==="2x"?4:2))));
    var span="span "+spanUnits;
    var title=cardTitle(w),badge=compact||buttonType||assistantType?"":rangeBadge(w),isEditing=homeEditMode&&premiumHome,showHeader=available||(!buttonType&&!assistantType&&homeShowTitle(w));
    var countN=Math.max(1,Number(w.params&&w.params.count)||5);
    function homeWorkletBaseHeight(type,size,countN){
      var compact=size==="0.5x";
      if(type==="assistant_voice_widget")return assistantTall?196:100;
      if(isHomeNavButton(type))return 72;
      if(compact){
        if(type==="quick_actions")return 106;
        if(type==="summary")return 218;
        if(type==="fidelity_card")return 220;
        if(type==="share_balance")return 120;
        if(type==="share_recent")return 136;
        if(type==="shopping_list_widget")return 172;
        if(type==="latest_expenses"||type==="latest_incomes")return Math.min(260,70+countN*38);
        if(type==="income_vs_expense"||type==="monthly_balance")return 168;
        if(type==="savings_progress")return 148;
        if(type==="distribution_expenses"||type==="expenses_by_area"||type==="expenses_by_category"||type==="incomes_by_type")return 172;
        if(type==="goal")return 112;
        return 145;
      }
      if(type==="quick_actions")return 84;
      if(type==="summary")return secondaryCurrency&&secRate?226:166;
      if(type==="fidelity_card")return 210;
      if(type==="credit_card_widget")return 160;
      if(type==="note_widget"||type==="bank_coord_widget"||type==="shopping_list_widget")return 170;
      if(type==="share_recent")return 140;
      if(type==="latest_expenses"||type==="latest_incomes")return Math.min(390,72+(countN*((secondaryCurrency&&secRate)?50:42)));
      if(type==="income_vs_expense"||type==="monthly_balance")return 216;
      if(type==="savings_progress")return 164;
      if(type==="distribution_expenses")return 150;
      if(type==="expenses_by_area"||type==="expenses_by_category"||type==="incomes_by_type")return 166;
      if(type==="goal")return 106;
      return 160;
    }
    var normalH=homeWorkletBaseHeight(w.type,size,countN);
    var doubleHeightTypes=["quick_actions","summary","distribution_expenses","income_vs_expense","monthly_balance","latest_expenses","latest_incomes","share_recent","share_balance","planned_saving","fidelity_card","goal","expenses_by_area","expenses_by_category","incomes_by_type","budget_overview","budget_by_category","savings_progress","note_widget","bank_coord_widget","credit_card_widget","shopping_list_widget"];
    var targetH=available?118:(assistantType?(assistantTall?196:100):(buttonType?(size==="2x"?112:72):((size==="2x"&&doubleHeightTypes.indexOf(w.type)>=0)?(normalH*2):normalH)));
    if(!available&&!buttonType&&!homeShowTitle(w)){
      if(w.type==="quick_actions")targetH=compact?94:(size==="2x"?128:66);
      else if(w.type==="summary")targetH=compact?((secondaryCurrency&&secRate)?232:174):(size==="2x"?((secondaryCurrency&&secRate)?350:286):((secondaryCurrency&&secRate)?218:150));
      else if(w.type==="distribution_expenses")targetH=compact?150:(size==="2x"?280:136);
      else if(w.type==="expenses_by_area"||w.type==="expenses_by_category"||w.type==="incomes_by_type")targetH=compact?164:(size==="2x"?318:154);
      else if(w.type==="income_vs_expense"||w.type==="monthly_balance")targetH=compact?158:(size==="2x"?350:204);
      else if(w.type==="savings_progress")targetH=compact?142:(size==="2x"?300:142);
      else if(w.type==="goal")targetH=compact?102:(size==="2x"?150:92);
      else targetH=Math.max(72,targetH-30);
    }
    if(isEditing&&!available&&compact)targetH+=22;
    // Il riepilogo contiene quattro StatCard. La sua altezza minima deve dipendere
    // dal numero reale di righe e dalla presenza della valuta secondaria; in caso
    // contrario l’ultima riga viene tagliata dal contenitore del worklet.
    if(!available&&!buttonType&&w.type==="summary"){
      var summaryHasSecondary=!!(secondaryCurrency&&secRate);
      var summaryCardHeight=summaryHasSecondary?88:70;
      var summaryColumns=compact?1:(isMobile?2:4);
      var summaryRows=Math.ceil(4/summaryColumns);
      var summaryGap=compact?8:12;
      var summaryPadding=compact?20:32;
      var summaryHeaderHeight=homeShowTitle(w)?30:0;
      var summaryRequiredHeight=(summaryRows*summaryCardHeight)+(Math.max(0,summaryRows-1)*summaryGap)+summaryPadding+summaryHeaderHeight;
      targetH=Math.max(targetH,summaryRequiredHeight);
    }
    var rowSpan=Math.max(3,Math.ceil((targetH+14)/(8+14)));
    var payload=available?{source:"library",type:w.type}:{source:"active",index:index,id:w.id};
    var common={gridColumn:span,gridRowEnd:"span "+rowSpan,background:bg,borderRadius:16,border:"1px solid "+(available?(assistantType?"#7F77DD":(dark?"#38384a":"#d7d8e4")):borderC),padding:buttonType?(compact?8:10):(compact?10:16),paddingTop:isEditing&&!available&&compact?70:(buttonType?(compact?8:10):(compact?10:16)),overflow:"hidden",boxShadow:available?"none":(dark?"none":"0 4px 18px rgba(0,0,0,0.04)"),color:fg,opacity:available?(assistantType?.96:.52):1,position:"relative",cursor:(isEditing?(homeDragging?"grabbing":"grab"):"default"),minHeight:targetH,boxSizing:"border-box",display:"flex",flexDirection:"column",justifyContent:available?"center":"flex-start",touchAction:isEditing?"pan-y":"auto",userSelect:isEditing?"none":"auto",minWidth:0,height:"100%"};
    var headerStyle={display:showHeader?"flex":"none",justifyContent:"space-between",alignItems:"flex-start",gap:compact?5:10,marginBottom:available?0:8,paddingRight:isEditing&&!available&&!compact?152:(isEditing&&!available?0:0),minHeight:isEditing&&!available&&!compact?32:0,minWidth:0};
    var titleStyle:any={fontSize:compact?11:13,fontWeight:950,color:available?fg:textC,lineHeight:1.15,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",display:"-webkit-box",WebkitLineClamp:compact?2:1,WebkitBoxOrient:"vertical"};
    var ctl=function(disabled){return {position:"absolute",border:"1px solid "+borderC,borderRadius:999,background:cardBg,color:textC,width:compact?28:32,height:compact?28:32,padding:0,cursor:disabled?"not-allowed":"pointer",opacity:disabled?.35:1,fontSize:compact?18:20,fontWeight:950,lineHeight:1,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,.12)",zIndex:3};};
    var upStyle={...ctl(index<=0),...(compact?{left:8,top:8}:{right:116,top:8})};
    var downStyle={...ctl(index>=activeWorklets.length-1),...(compact?{left:8,top:42}:{right:80,top:8})};
    var gearStyle={position:"absolute",right:compact?8:44,top:compact?8:8,width:compact?28:32,height:compact?28:32,borderRadius:999,border:"1px solid "+borderC,background:dark?"#252535":"#FFFFFF",color:textC,cursor:"pointer",fontSize:compact?15:16,fontWeight:900,boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,.12)",zIndex:3};
    var closeStyle={position:"absolute",right:compact?8:8,top:compact?42:8,width:compact?28:32,height:compact?28:32,borderRadius:999,border:"1px solid #ef4444",background:"#E24B4A",color:"#fff",cursor:"pointer",fontSize:compact?16:18,fontWeight:950,boxShadow:dark?"none":"0 2px 8px rgba(226,75,74,.24)",lineHeight:1,zIndex:3};
    return <div key={(available?"available_":"active_")+w.id} data-home-worklet-index={available?undefined:index} draggable={false} onPointerDown={function(e){startPointerDrag(e,payload);}} onPointerMove={movePointerDrag} onPointerUp={endPointerDrag} onPointerCancel={cancelHomePointerDrag} onTouchStart={function(e){startTouchDrag(e,payload);}} onTouchMove={moveTouchDrag} onTouchEnd={endTouchDrag} onTouchCancel={cancelTouchDrag} onContextMenu={function(e){if(isEditing){try{e.preventDefault();}catch(_e){}}}} onDragStart={function(e){try{e.preventDefault();}catch(_e){}}} onDragOver={function(e){if(isEditing){try{e.preventDefault();}catch(_e){}}}} onDrop={function(e){if(isEditing&&!available)dropAt(e,index);}} onClick={function(){if(isEditing&&available)openLibrarySettings(w.type);}} style={common as any}>
      <div style={headerStyle as any}><div style={titleStyle}>{title}</div>{available&&assistantType&&<div style={{fontSize:10,color:"#7F77DD",fontWeight:950,whiteSpace:"nowrap",flexShrink:0}}>{L("Nuovo")}</div>}{badge&&<div style={{fontSize:11,color:available?fg:subC,fontWeight:800,opacity:available?.8:1,whiteSpace:"nowrap",flexShrink:0}}>{badge}</div>}</div>
      {isEditing&&!available&&<button type="button" onPointerDown={function(e){e.stopPropagation();}} onClick={function(e){e.stopPropagation();moveActive(index,index-1);}} disabled={index<=0} title={L("Sposta su")} style={upStyle as any}>↑</button>}
      {isEditing&&!available&&<button type="button" onPointerDown={function(e){e.stopPropagation();}} onClick={function(e){e.stopPropagation();moveActive(index,index+1);}} disabled={index>=activeWorklets.length-1} title={L("Sposta giù")} style={downStyle as any}>↓</button>}
      {isEditing&&!available&&<button type="button" onPointerDown={function(e){e.stopPropagation();}} onClick={function(e){e.stopPropagation();openActiveSettings(w);}} title={L("Impostazioni worklet")} style={gearStyle as any}>⚙</button>}
      {isEditing&&!available&&<button type="button" onPointerDown={function(e){e.stopPropagation();}} onClick={function(e){e.stopPropagation();removeActive(w.id);}} title={L("Rimuovi dalla Home")} style={closeStyle as any}>×</button>}
      {available?<div style={{display:"flex",justifyContent:"center",alignItems:"center",marginTop:12}}><button type="button" onPointerDown={function(e){e.stopPropagation();}} onClick={function(e){e.stopPropagation();openLibrarySettings(w.type);}} style={{border:"none",background:secondaryC,color:"#fff",borderRadius:12,padding:"9px 12px",fontSize:12,fontWeight:950,cursor:"pointer",boxShadow:dark?"none":"0 5px 14px rgba(0,0,0,.12)",opacity:.65}}>＋ {assistantType?assistantVoiceUiText(lang||"it").title:L("Aggiungi worklet")}</button></div>:<div style={{pointerEvents:"auto",flex:(homeShowTitle(w)||!(w.type==="quick_actions"||w.type==="summary"))?1:"0 0 auto",minWidth:0,overflowY:(isGraphWorklet(w.type)||w.type==="quick_actions"||assistantType)?"hidden":"auto",overflowX:"hidden",WebkitOverflowScrolling:"touch",boxSizing:"border-box",paddingRight:2,paddingBottom:isGraphWorklet(w.type)?0:0,overscrollBehavior:"auto",touchAction:"pan-y"}}>{renderWorklet(w)}</div>}
    </div>;
  }
  function updateDraft(patch){setEditDraft(function(d){return d?{...d,...patch}:d;});}
  function updateDraftParams(patch){setEditDraft(function(d){return d?{...d,params:{...(d.params||{}),...patch}}:d;});}
  function seg(items,value,onChange){return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{items.map(function(it){var active=String(value)===String(it.id);return <button key={it.id} type="button" onClick={function(){onChange(it.id);}} style={{border:"1px solid "+(active?"#7F77DD":borderC),background:active?(dark?"#24213a":"#F0EDFF"):cardBg,color:active?"#7F77DD":textC,borderRadius:12,padding:"8px 10px",fontSize:12,fontWeight:active?900:700,cursor:"pointer"}}>{L(it.label)}</button>;})}</div>;}
  function countField(label,w){var k=draftCountKey(editDraft||w);var initial=(homeCountDraftRef.current&&homeCountDraftRef.current[k]!==undefined)?homeCountDraftRef.current[k]:String((w.params&&w.params.count)||5);return <Field label={label}><input type="text" inputMode="numeric" defaultValue={initial} onChange={function(e){var raw=String(e.target.value||"").replace(/\D/g,"").slice(0,2);if(homeCountDraftRef.current)homeCountDraftRef.current[k]=raw;}} onBlur={function(e){var raw=String(e.target.value||"").replace(/\D/g,"").slice(0,2);var n=Math.max(1,Math.min(20,Number(raw)||1));if(homeCountDraftRef.current)homeCountDraftRef.current[k]=String(n);updateDraftParams({count:n});}} style={{...inputStyle,width:"100%"}}/></Field>;}
  function popupParams(w){var type=w.type;var rangeTypes=["distribution_expenses","income_vs_expense","expenses_by_area","expenses_by_category","incomes_by_type","planned_saving","budget_overview","budget_by_category","savings_progress"];if(rangeTypes.indexOf(type)>=0)return <Field label="Intervallo">{seg([1,3,6,12].map(function(n){return {id:n,label:n===1?"Ultimo mese":"Ultimi "+n+" mesi"};}),Number((w.params&&w.params.range)||12),function(v){updateDraftParams({range:Number(v)});})}</Field>;if(type==="monthly_balance")return <Field label="Intervallo">{seg([{id:6,label:"Ultimi 6 mesi"},{id:12,label:"Ultimi 12 mesi"}],Number((w.params&&w.params.range)||12),function(v){updateDraftParams({range:Number(v)});})}</Field>;if(type==="latest_expenses"||type==="latest_incomes")return countField("Numero elementi",w);if(type==="share_recent")return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 150px",gap:10}}><Field label="Progetto Share"><select value={(w.params&&w.params.projectId)||""} onChange={function(e){updateDraftParams({projectId:e.target.value});}} style={{...inputStyle,width:"100%"}}>{(shareProjects||[]).length===0&&<option value="">{L("Nessun progetto Share")}</option>}{(shareProjects||[]).map(function(p){return <option key={p.id} value={p.id}>{p.icon||"🤝"} {p.name}</option>;})}</select></Field>{countField("Numero transazioni",w)}</div>;if(type==="share_balance")return <Field label="Progetto Share"><select value={(w.params&&w.params.projectId)||""} onChange={function(e){updateDraftParams({projectId:e.target.value});}} style={{...inputStyle,width:"100%"}}>{(shareProjects||[]).length===0&&<option value="">{L("Nessun progetto Share")}</option>}{(shareProjects||[]).map(function(p){return <option key={p.id} value={p.id}>{p.icon||"🤝"} {p.name}</option>;})}</select></Field>;if(type==="fidelity_card")return <Field label="Carta"><select value={(w.params&&w.params.cardId)||""} onChange={function(e){updateDraftParams({cardId:e.target.value});}} style={{...inputStyle,width:"100%"}}>{(shoppingCards||[]).length===0&&<option value="">{L("Nessuna carta")}</option>}{(shoppingCards||[]).map(function(c){return <option key={c.id} value={c.id}>{c.name}</option>;})}</select></Field>;if(type==="goal")return <Field label="Obiettivo"><select value={(w.params&&w.params.goalId)||""} onChange={function(e){updateDraftParams({goalId:e.target.value});}} style={{...inputStyle,width:"100%"}}>{(goals||[]).length===0&&<option value="">{L("Nessun obiettivo")}</option>}{(goals||[]).map(function(g){return <option key={g.id} value={g.id}>{g.icon||"🎯"} {g.name}</option>;})}</select></Field>;if(type==="note_widget")return <Field label="Nota"><select value={(w.params&&w.params.noteId)||""} onChange={function(e){updateDraftParams({noteId:e.target.value});}} style={{...inputStyle,width:"100%"}}>{(appuntiNotes||[]).length===0&&<option value="">{L("Nessuna nota")}</option>}{(appuntiNotes||[]).map(function(n){return <option key={n.id} value={n.id}>{n.title||L("Nota")}</option>;})}</select></Field>;if(type==="bank_coord_widget")return <Field label="Coordinata bancaria"><select value={(w.params&&w.params.bankId)||""} onChange={function(e){updateDraftParams({bankId:e.target.value});}} style={{...inputStyle,width:"100%"}}>{(bankCoords||[]).length===0&&<option value="">{L("Nessuna coordinata bancaria")}</option>}{(bankCoords||[]).map(function(b){return <option key={b.id} value={b.id}>{b.bank||b.holder||L("Coordinata bancaria")}</option>;})}</select></Field>;if(type==="credit_card_widget")return <Field label="Carta di Credito"><select value={(w.params&&w.params.creditCardId)||""} onChange={function(e){updateDraftParams({creditCardId:e.target.value});}} style={{...inputStyle,width:"100%"}}>{(creditCards||[]).length===0&&<option value="">{L("Nessuna carta di credito")}</option>}{(creditCards||[]).map(function(c){return <option key={c.id} value={c.id}>{c.name||c.issuer||L("Carta di Credito")}</option>;})}</select></Field>;if(type==="shopping_list_widget")return <Field label="Lista della spesa"><select value={(w.params&&w.params.listId)||homeActiveShoppingListId||"main"} onChange={function(e){updateDraftParams({listId:e.target.value});}} style={{...inputStyle,width:"100%"}}>{((homeShoppingLists&&homeShoppingLists.length)?homeShoppingLists:[{id:"main",title:"Lista principale",icon:"🧺"}]).map(function(l){return <option key={l.id} value={l.id}>{l.icon||"🧺"} {l.title||L("Lista della spesa")}</option>;})}</select></Field>;return <div style={{fontSize:12,color:subC}}>{L("Questo worklet non richiede parametri specifici.")}</div>;}
    function Field(props){return <label style={{display:"block",fontSize:12,fontWeight:900,color:subC}}>{L(props.label)}<div style={{marginTop:7}}>{props.children}</div></label>;}
  var inputStyle={border:"1px solid "+borderC,borderRadius:12,padding:"10px 12px",background:dark?"#1e1e30":"#fff",color:textC,fontSize:13,boxSizing:"border-box"};
  function closeHomeEdit(){setHomeEditMode(false);setEditDraft(null);setHomeDragging(null);setHomeDropIndex(null);setDragPayload(null);}
  function editHelpBox(bottom){return <div style={{background:dark?"#24213a":"#F0EDFF",border:"1px solid "+(dark?"#3d376a":"#D8D2FF"),borderRadius:16,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><div><div style={{fontSize:15,fontWeight:950,color:dark?"#BEB8FF":"#534AB7"}}>🧩 {L("Modifica Home")}</div><div style={{fontSize:12,color:subC,marginTop:3,lineHeight:1.4}}>{L("Sposta i widget con le frecce, entra nella configurazione per modificare il titolo, lo sfondo e la grandezza.")}{bottom&&<><br/>{L("I widget disponibili sono in fondo alla pagina.")}</>}</div></div><button type="button" onClick={closeHomeEdit} style={{border:"none",background:"#7F77DD",color:"#fff",borderRadius:12,padding:"10px 14px",fontSize:13,fontWeight:950,cursor:"pointer"}}>{L("Fine modifica")}</button></div>;}
  function startHomeDoneButtonDrag(e){if(!homeEditMode||!premiumHome)return;var p={x:e.clientX,y:e.clientY};homeDoneDragRef.current={startX:p.x,startY:p.y,right:homeDonePos.right,bottom:homeDonePos.bottom,moved:false};try{if(e.currentTarget&&e.currentTarget.setPointerCapture)e.currentTarget.setPointerCapture(e.pointerId);}catch(_e){}try{e.preventDefault();e.stopPropagation();}catch(_e){}}
  function moveHomeDoneButtonDrag(e){var s=homeDoneDragRef.current;if(!s)return;var dx=e.clientX-s.startX,dy=e.clientY-s.startY;if(Math.abs(dx)>4||Math.abs(dy)>4)s.moved=true;var w=(typeof window!=="undefined"?window.innerWidth:390),h=(typeof window!=="undefined"?window.innerHeight:760);var maxRight=Math.max(8,w-150),maxBottom=Math.max(12,h-56);setHomeDonePos({right:Math.min(maxRight,Math.max(8,s.right-dx)),bottom:Math.min(maxBottom,Math.max(12,s.bottom-dy))});try{e.preventDefault();e.stopPropagation();}catch(_e){}}
  function endHomeDoneButtonDrag(e){var s=homeDoneDragRef.current;homeDoneDragRef.current=null;if(!s||!s.moved)closeHomeEdit();try{e.preventDefault();e.stopPropagation();}catch(_e){}}
  function floatingDoneButton(){return <button type="button" onClick={function(e){try{e.preventDefault();e.stopPropagation();}catch(_e){}closeHomeEdit();}} onTouchEnd={function(e){try{e.preventDefault();e.stopPropagation();}catch(_e){}closeHomeEdit();}} style={{position:"fixed",right:homeDonePos.right,bottom:homeDonePos.bottom,zIndex:9998,border:"none",background:"#7F77DD",color:"#fff",borderRadius:999,padding:"12px 16px",fontSize:13,fontWeight:950,cursor:"pointer",boxShadow:"0 8px 26px rgba(0,0,0,.24)",touchAction:"manipulation",userSelect:"none"}}>✓ {L("Fine modifica")}</button>;}
  function settingsPopup(){if(!editDraft)return null;var item=lib(editDraft.type);var params=editDraft.params||{};return <div onClick={function(){setEditDraft(null);}} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.48)",zIndex:99999,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 14px 2vh",boxSizing:"border-box",overflowY:"auto"}}><div onClick={function(e){e.stopPropagation();}} style={{width:"min(560px,100%)",maxHeight:"88vh",overflow:"auto",WebkitOverflowScrolling:"touch",background:cardBg,border:"1px solid "+borderC,borderRadius:22,padding:18,boxShadow:"0 22px 70px rgba(0,0,0,.32)"}}><div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12,marginBottom:14}}><div><div style={{fontSize:18,fontWeight:950,color:textC}}>{item.icon} {L(item.label)}</div><div style={{fontSize:12,color:subC,lineHeight:1.45,marginTop:4}}>{L(item.desc||"")}</div></div><button type="button" onClick={function(){setEditDraft(null);}} style={{width:34,height:34,borderRadius:999,border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,cursor:"pointer",fontSize:20,fontWeight:900}}>×</button></div><div style={{display:"flex",flexDirection:"column",gap:14}}><Field label="Titolo">{seg([{id:"show",label:"Mostra titolo"},{id:"hide",label:"Nascondi titolo"}],params.showTitle===false?"hide":"show",function(v){updateDraftParams({showTitle:v!=="hide"});})}</Field><Field label="Titolo personalizzato"><input key={draftTitleKey(editDraft)} type="text" defaultValue={(homeTitleDraftRef.current&&homeTitleDraftRef.current[draftTitleKey(editDraft)]!==undefined)?homeTitleDraftRef.current[draftTitleKey(editDraft)]:(params.customTitle||"")} onChange={function(e){if(homeTitleDraftRef.current)homeTitleDraftRef.current[draftTitleKey(editDraft)]=e.target.value;}} onBlur={function(e){if(homeTitleDraftRef.current)homeTitleDraftRef.current[draftTitleKey(editDraft)]=e.target.value;updateDraftParams({customTitle:e.target.value});}} placeholder={L(item.label)} style={{...inputStyle,width:"100%"}}/></Field>{popupParams(editDraft)}<Field label="Grandezza del worklet">{seg(editDraft.type==="assistant_voice_widget"?[{id:"1x1",label:"1x1"},{id:"1x2",label:"1x2"},{id:"2x1",label:"2x1"},{id:"2x2",label:"2x2"}]:[{id:"0.5x",label:"0.5x"},{id:"1x",label:"1x"},{id:"2x",label:"2x"}],editDraft.size||defaultSize(editDraft.type),function(v){updateDraft({size:v});})}</Field><Field label="Colore di sfondo"><div style={{display:"grid",gridTemplateColumns:"repeat(10,1fr)",gap:8}}>{HOME_COLORS.map(function(c){var active=String(editDraft.color||"").toUpperCase()===c.toUpperCase();return <button key={c} type="button" onClick={function(){updateDraft({color:c});}} title={c} style={{height:32,borderRadius:999,border:active?"3px solid #7F77DD":"1px solid "+borderC,background:c,cursor:"pointer",boxShadow:c==="#FFFFFF"?"inset 0 0 0 1px #ddd":"none"}}/>;})}</div></Field><div style={{display:"flex",gap:10,justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",marginTop:2}}>{editDraft.mode!=="add"?<button type="button" onClick={removeDraft} style={{border:"1px solid #fecaca",background:"#FFF0F0",color:"#E24B4A",borderRadius:12,padding:"10px 14px",fontSize:13,fontWeight:900,cursor:"pointer"}}>{L("Rimuovi dalla Home")}</button>:<div/>}<div style={{display:"flex",gap:8,marginLeft:"auto"}}><button type="button" onClick={function(){setEditDraft(null);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#f5f5f5",color:textC,borderRadius:12,padding:"10px 14px",fontSize:13,fontWeight:800,cursor:"pointer"}}>{L("Annulla")}</button><button type="button" onClick={applyDraft} style={{border:"none",background:"#7F77DD",color:"#fff",borderRadius:12,padding:"10px 14px",fontSize:13,fontWeight:950,cursor:"pointer"}}>{L(editDraft.mode==="add"?"Aggiungi alla Home":"Salva impostazioni")}</button></div></div></div></div></div>;}
  var now=new Date();
  var quickCards=[
    {show:(incomes||[]).length===0,icon:"💰",title:L("Registra la tua prima entrata"),tab:"spese",type:"income"},
    {show:(expenses||[]).length===0,icon:"💸",title:L("Aggiungi la tua prima uscita"),tab:"spese",type:"expense"},
    {show:!(budgetPlan&&(safeNum(budgetPlan.manualIncome)>0||safeNum(budgetPlan.income)>0||((budgetPlan.items||[]).some(function(i){return safeNum(i.amount)>0;})))),icon:"📊",title:L("Imposta il tuo budget mensile"),tab:"budget"},
    {show:!(goals||[]).some(function(g){var d=DEFAULT_GOALS.find(function(x){return x.id===g.id;});return safeNum(g.saved)>0||!!g.deadline||!d||d.name!==g.name||safeNum(d.target)!==safeNum(g.target);}),icon:"🎯",title:L("Configura i tuoi obiettivi"),tab:"goals"}
  ].filter(function(card){return card.show;});
  var available=availableItems();
  var assistantVoiceAlreadyActive=!!insertedTypes()["assistant_voice_widget"];
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {pendingCount>0&&<div onClick={function(){setTab("spese");setSpeseSubTab("ricorrenti");}} style={{background:"#fff3cd",border:"1px solid #ffeeba",borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:"#856404"}}>🔄 {String((t&&t.recurringPendingHome)||L("{count} ricorrenti da confermare per {month}")).replace("{count}",String(pendingCount)).replace("{month}",(monthFullName?monthFullName(now.getMonth()):MONTHS_FULL[now.getMonth()]))}</span><span style={{color:"#856404"}}>›</span></div>}
    {alertTriggered>0&&<div onClick={function(){if(markAlertsSeen)markAlertsSeen();setTab("alerts");}} style={{background:"#fff0f0",border:"1px solid #fcc",borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:expenseColor}}>🔔 {alertTriggered} {L("alert di spesa superati")}</span><span style={{color:expenseColor}}>›</span></div>}
    {quickCards.length>0&&!homeEditMode&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>{quickCards.map(function(card){return <button key={card.title} onClick={function(){setTab(card.tab);if(card.tab==="spese"){setSpeseSubTab("add");setAddType(card.type);setAddSubTab("single");}}} style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left",color:textC,boxShadow:dark?"none":"0 3px 14px rgba(0,0,0,0.04)"}}><span style={{fontSize:24}}>{card.icon}</span><span style={{fontSize:13,fontWeight:800}}>{card.title}</span><span style={{marginLeft:"auto",color:subC}}>›</span></button>;})}</div>}
    {secondaryCurrency&&secRate&&<div style={{background:dark?"#252535":"#f0f8ff",borderRadius:10,padding:"8px 14px",border:"1px solid "+(dark?"#334":"#c8e0ff"),fontSize:12,color:dark?"#8bf":"#1a5fa8"}}>💱 {L("Conversione")} {currency} → {secondaryCurrency}: 1 {sym} = {secSym}{secRate.toFixed(4)} · {L("Tasso aggiornato in tempo reale")}</div>}
    {secondaryCurrency&&!secRate&&!secRateLoading&&<div style={{background:"#FFF8E1",borderRadius:10,padding:"8px 14px",border:"1px solid #FFD54F",fontSize:12,color:"#856404"}}>⚠️ {L("Impossibile recuperare il tasso")} {currency}/{secondaryCurrency}. {L("Controlla la connessione.")}</div>}
    {homeEditMode&&premiumHome&&editHelpBox(false)}
    <div onDragOver={function(e){if(homeEditMode&&premiumHome){try{e.preventDefault();}catch(_e){}}}} onDrop={function(e){if(homeEditMode&&premiumHome)dropAt(e,activeWorklets.length);}} style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gridAutoRows:8,gridAutoFlow:"row",gap:14}}>{activeWorklets.map(function(w,i){return <>{homeEditMode&&homeDragging&&homeDropIndex===i&&<div key={"drop_"+i} style={{gridColumn:"1 / -1",height:8,borderRadius:999,background:"#7F77DD",opacity:.65}}/>}{workletCard(w,i,false)}</>;})}{homeEditMode&&homeDragging&&homeDropIndex===activeWorklets.length&&<div style={{gridColumn:"1 / -1",height:8,borderRadius:999,background:"#7F77DD",opacity:.65}}/>}</div>
    {homeEditMode&&premiumHome&&!assistantVoiceAlreadyActive&&<button type="button" onClick={function(){openLibrarySettings("assistant_voice_widget");}} style={{width:"100%",border:"2px solid #7F77DD",background:dark?"linear-gradient(135deg,#29243D,#1D2A3A)":"linear-gradient(135deg,#F0EDFF,#EAF5FF)",borderRadius:18,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,cursor:"pointer",textAlign:"left",boxShadow:dark?"none":"0 8px 24px rgba(127,119,221,.16)"}}><AIGrilloIcon size={52}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:16,fontWeight:950,color:textC}}>{L("Assistente vocale")}</div><div style={{fontSize:12,color:subC,lineHeight:1.4,marginTop:3}}>{L("Aggiungi il worklet dedicato alla conversazione vocale. Dimensioni: 1x1, 1x2, 2x1 e 2x2.")}</div></div><span style={{background:"#7F77DD",color:"#fff",borderRadius:999,padding:"8px 11px",fontSize:12,fontWeight:950,whiteSpace:"nowrap"}}>＋ {L("Aggiungi")}</span></button>}
    {homeEditMode&&premiumHome&&available.length>0&&<div style={{display:"flex",flexDirection:"column",gap:10,marginTop:4}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div style={{fontSize:13,fontWeight:950,color:subC}}>＋ {L("Worklet disponibili")}</div><div style={{fontSize:11,color:subC}}>{L("Clicca per configurare o trascina nella posizione desiderata")}</div></div><div style={{display:"grid",gridTemplateColumns:"repeat(4,minmax(0,1fr))",gridAutoRows:8,gridAutoFlow:"row dense",gap:14}}>{available.map(function(item){var w={id:"available_"+item.type,type:item.type,size:defaultSize(item.type),color:"#FFFFFF",params:defaultParams(item.type)};return workletCard(w,-1,true);})}</div></div>}
    {homeEditMode&&premiumHome&&available.length===0&&assistantVoiceAlreadyActive&&<div style={{fontSize:12,color:subC,textAlign:"center",padding:"8px 0"}}>{L("Tutti i worklet disponibili sono già presenti nella Home.")}</div>}
    {homeEditMode&&premiumHome?editHelpBox(true):<button type="button" onClick={startHomeEdit} style={{width:"100%",border:"1px dashed "+(premiumHome?"#7F77DD":"#D6B24B"),background:premiumHome?(dark?"#24213a":"#F0EDFF"):(dark?"#2d2514":"#FFF8E1"),color:premiumHome?(dark?"#BEB8FF":"#534AB7"):(dark?"#ffd58a":"#856404"),borderRadius:16,padding:"14px 16px",fontSize:14,fontWeight:950,cursor:"pointer"}}>{premiumHome?"🧩 "+L("Personalizza Home"):"🔒 "+L("Personalizza Home")+" · "+L("Piano Completo")}</button>}
    {homeEditMode&&premiumHome&&floatingDoneButton()}
    {settingsPopup()}
  </div>;
}

export function SpesePanel(){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c:any=useApp();
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_c;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_c;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_c;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_c;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_c;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_c;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_c;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_c;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat}:any=_c;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_c;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_c;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_c;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_c;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_c;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_c;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_c;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_c;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_c;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_c;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_c;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_c;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening,openVoiceModal}:any=_c;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_c;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_c;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_c;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_c;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_c;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_c;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_c;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_c;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_c;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_c;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_c;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_c;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_c;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  // ─────────────────────────────────────────────────────────────────────────
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  function L(s){return _c.translateUiRuntimeText?_c.translateUiRuntimeText(s):s;}
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  function handleAddType(tp){setAddType(tp);if(tp==="income"&&addSubTab==="receipt")setAddSubTab("single");}
  var confirmC=confirmButtonColor||"#7F77DD";
  var secondaryC=secondaryButtonColor||"#7FC8F8";
  function segBtnStyle(active,color,opts){opts=opts||{};var c=color||secondaryC;return {flex:1,padding:isMobile?"7px 6px":"8px 9px",border:"1px solid "+(active?c:borderC),borderRadius:Math.max(9,Math.min(btnRadius||10,11)),background:active?(dark?(c+"33"):(c+"1f")):(dark?"rgba(255,255,255,0.035)":"linear-gradient(180deg,#ffffff 0%,#f7f7f7 100%)"),color:active?c:subC,fontSize:opts.fontSize||(isMobile?12:13),cursor:"pointer",fontWeight:active?850:700,boxShadow:dark?"none":"0 2px 8px rgba(0,0,0,0.035)",position:opts.position||"relative",transition:"all .18s ease",minHeight:isMobile?36:40,display:"flex",alignItems:"center",justifyContent:"center",gap:4,lineHeight:1.08};}
  function typeBtnStyle(active,color,opts){opts=opts||{};var c=color||confirmC;return {flex:1,padding:isMobile?"7px 6px":"8px 9px",border:"none",borderRadius:Math.max(9,Math.min(btnRadius||10,11)),background:active?("linear-gradient(135deg,"+c+", "+c+"dd)"):(dark?"rgba(255,255,255,0.06)":"linear-gradient(180deg,#ffffff 0%,#f7f7f7 100%)"),color:active?"#fff":subC,fontSize:opts.fontSize||(isMobile?12:13),cursor:"pointer",fontWeight:active?850:700,boxShadow:active?("0 5px 13px "+c+"28"):(dark?"none":"0 2px 8px rgba(0,0,0,0.045)"),position:opts.position||"relative",transition:"all .18s ease",minHeight:isMobile?36:40,display:"flex",alignItems:"center",justifyContent:"center",gap:4,lineHeight:1.08};}
  return <div><div style={{display:"flex",gap:6,marginBottom:8,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:4}}><button onClick={function(){handleAddType("expense");}} style={typeBtnStyle(addType==="expense",expenseColor)}>💸 {L(t.expenses)}</button><button onClick={function(){handleAddType("income");}} style={typeBtnStyle(addType==="income",incomeColor)}>💰 {L(t.incomes)}</button></div><div style={{display:"flex",gap:6,marginBottom:8,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:4}}><button onClick={function(){setSpeseSubTab("add");}} style={segBtnStyle(speseSubTab==="add",secondaryC)}>⚡ {L("Semplice")}</button><button onClick={function(){setSpeseSubTab("recurring");}} style={segBtnStyle(speseSubTab==="recurring",secondaryC,{position:"relative"})}>🔁 {L("Ricorrente")}{pendingCount>0&&<span style={{position:"absolute",top:4,right:10,background:expenseColor,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{pendingCount}</span>}</button></div>{speseSubTab==="add"&&<div><div style={{display:"flex",gap:5,marginBottom:8,background:dark?"#252535":"#f5f5f5",borderRadius:10,padding:4}}><button onClick={function(){setAddSubTab("single");}} style={segBtnStyle(addSubTab==="single",secondaryC,{fontSize:12})}>⚡ {L(t.single)}</button><button onClick={function(){setAddSubTab("bulk");}} style={segBtnStyle(addSubTab==="bulk",secondaryC,{fontSize:12})}>📋 {L(t.multiple)}</button>{addType==="expense"&&<button onClick={function(){if(_c.canUsePlanFeature&&!_c.canUsePlanFeature("receiptScan",1)){setToast&&setToast(_c.upgradeMessage?_c.upgradeMessage("receiptScan"):"Limite scontrini raggiunto");return;}setAddSubTab("receipt");}} style={segBtnStyle(addSubTab==="receipt",secondaryC,{fontSize:12})}>📷 {L("Scontrino")}</button>}</div><div style={{background:dark?"#1e1e30":"linear-gradient(180deg,#ffffff 0%,#f7f6ff 100%)",borderRadius:16,border:"1px solid "+borderC,padding:isMobile?12:16,boxShadow:dark?"none":"0 4px 18px rgba(83,74,183,0.08)"}}>{addSubTab==="single"&&<ExpenseForm type={addType} onSave={function(item){if(addType==="expense"){addExpenses([item],"manual");}else{addIncomes([item],"manual");}}}/>} {addSubTab==="bulk"&&<BulkEntry type={addType} maxRows={_c.bulkMovementRowLimit?_c.bulkMovementRowLimit(_c.currentPlan):undefined} limitMessage={_c.bulkMovementRowLimit&&_c.bulkMovementRowLimit(_c.currentPlan)!==Infinity?(L("Il limite delle righe multiple, con il piano attuale, è di ")+_c.bulkMovementRowLimit(_c.currentPlan)):""} onSave={function(items){if(addType==="expense"){addExpenses(items,"bulk");}else{addIncomes(items,"bulk");}}}/>} {addSubTab==="receipt"&&addType==="expense"&&<ReceiptScanPanel onSave={function(item){addExpenses([item],"receipt");}}/>}</div></div>}{speseSubTab==="recurring"&&<RecurringManager/>}</div>;
}

export function HistoryPanel(){
  var _c:any=useApp();
  var {lang,cats,methods,expenseGroups,incomeTypes,expenses,setExpenses,incomes,setIncomes,fmt,dark,dateFmt,curMonthKey,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {textC,subC,borderC,cardBg,inp,historyTab,setHistoryTab,editingItem,setEditingItem,setToast,curYear}:any=_c;
  var {searchQuery,setSearchQuery,filterYear,setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats,setFilterCats,filterCatExclude,setFilterCatExclude,filterMethods,setFilterMethods,filterAreaPersonal,setFilterAreaPersonal,filterAreaShare,setFilterAreaShare,filterGroup,setFilterGroup}:any=_c;
  var {filterDateFrom,setFilterDateFrom,filterDateTo,setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes}:any=_c;
  var {showShareInHistory,setShowShareInHistory,confirmButtonColor,secondaryButtonColor,setNativeBannerSuppressed,getCat,getMethod,getIT,secRate,showSecInHistory,fmtSec,historySearchDraftRef,deleteConfirmId,setDeleteConfirmId}:any=_c;
  var userKey:any=_c.userKey;
  var {historySortDate,setHistorySortDate,historySortDirection,setHistorySortDirection,historySortSecondary,setHistorySortSecondary,historySortSecondaryDirection,setHistorySortSecondaryDirection}:any=_c;
  var translateUiRuntimeText:any=_c.translateUiRuntimeText;
  var monthShortName:any=_c.monthShortName;
  var monthFullName:any=_c.monthFullName;
  function L(s){return translateUiRuntimeText?translateUiRuntimeText(s):s;}
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  var V=t;
  var confirmC=confirmButtonColor||"#378ADD";
  var secondaryC=secondaryButtonColor||"#7FC8F8";
  var fieldOptions=[{id:"date",label:"Data Movimento"},{id:"created",label:"Data Immissione"},{id:"amount",label:"Importo"},{id:"category",label:"Categorie"}];
  var dirOptions=[{id:"asc",label:"Crescente"},{id:"desc",label:"Decrescente"}];
  var [historyVisibleCount,setHistoryVisibleCount]=useState(80);
  var [showSortModal,setShowSortModal]=useState(false);
  var [showFilterModal,setShowFilterModal]=useState(false);
  var [filterSectionsOpen,setFilterSectionsOpen]=useState<any>({period:false,amount:false,category:false,methods:false,area:false});
  var [sortDraftPrimary,setSortDraftPrimary]=useState(normSortField(historySortDate));
  var [sortDraftPrimaryDir,setSortDraftPrimaryDir]=useState(historySortDirection||"desc");
  var [sortDraftSecondary,setSortDraftSecondary]=useState(normSortField(historySortSecondary||"amount"));
  var [sortDraftSecondaryDir,setSortDraftSecondaryDir]=useState(historySortSecondaryDirection||"desc");
  var [showMonthSelector,setShowMonthSelector]=useState(false);
  var historyRootRef:any=useRef(null);
  var historyLastScrollRef:any=useRef(0);
  var historyScrollRafRef:any=useRef(0);
  var historyActionsVisibleRef:any=useRef(true);
  var historyScrollQuietUntilRef:any=useRef(0);
  var [historyActionsVisible,setHistoryActionsVisible]=useState(true);

  function historySavedFilterKey(){try{return userKey?userKey("history_saved_filter_v1"):"history_saved_filter_v1";}catch(e){return "history_saved_filter_v1";}}
  function setHistoryDefaultFilters(){setSearchQuery("");if(historySearchDraftRef)historySearchDraftRef.current="";setFilterYear("all");setFilterMonth("");setFilterMonths([]);setFilterCat("all");setFilterCats([]);setFilterCatExclude(false);setFilterMethods([]);setFilterAreaPersonal(true);setFilterAreaShare(true);if(setShowShareInHistory)setShowShareInHistory(true);setFilterGroup("all");setFilterDateFrom("");setFilterDateTo("");setFilterAmtMin("");setFilterAmtMax("");setHistoryTab("all");setShowMonthSelector(false);}
  function currentHistoryFilterPayload(){return{searchQuery:searchQuery||"",filterYear:filterYear||"all",filterMonth:filterMonth||"",filterMonths:filterMonths||[],filterCat:filterCat||"all",filterCats:filterCats||[],filterCatExclude:!!filterCatExclude,filterMethods:filterMethods||[],filterAreaPersonal:!!filterAreaPersonal,filterAreaShare:!!filterAreaShare,showShareInHistory:!!showShareInHistory,filterGroup:filterGroup||"all",filterDateFrom:filterDateFrom||"",filterDateTo:filterDateTo||"",filterAmtMin:filterAmtMin||"",filterAmtMax:filterAmtMax||"",historyTab:historyTab||"all"};}
  function applyHistoryFilterPayload(saved){if(!saved||typeof saved!=="object"){setHistoryDefaultFilters();return;}setSearchQuery(String(saved.searchQuery||""));if(historySearchDraftRef)historySearchDraftRef.current=String(saved.searchQuery||"");setFilterYear(saved.filterYear||"all");setFilterMonth(saved.filterMonth||"");setFilterMonths(Array.isArray(saved.filterMonths)?saved.filterMonths:[]);setFilterCat(saved.filterCat||"all");setFilterCats(Array.isArray(saved.filterCats)?saved.filterCats:[]);setFilterCatExclude(!!saved.filterCatExclude);setFilterMethods(Array.isArray(saved.filterMethods)?saved.filterMethods:[]);setFilterAreaPersonal(saved.filterAreaPersonal!==undefined?!!saved.filterAreaPersonal:true);setFilterAreaShare(saved.filterAreaShare!==undefined?!!saved.filterAreaShare:true);if(setShowShareInHistory)setShowShareInHistory(saved.showShareInHistory!==undefined?!!saved.showShareInHistory:true);setFilterGroup(saved.filterGroup||"all");setFilterDateFrom(saved.filterDateFrom||"");setFilterDateTo(saved.filterDateTo||"");setFilterAmtMin(saved.filterAmtMin||"");setFilterAmtMax(saved.filterAmtMax||"");setHistoryTab(saved.historyTab||"all");setShowMonthSelector(false);}
  function saveHistoryFilter(){try{localStorage.setItem(historySavedFilterKey(),JSON.stringify({...currentHistoryFilterPayload(),savedAt:new Date().toISOString()}));if(setToast)setToast({text:L("Filtro salvato"),type:"success",color:confirmC,icon:"✅"});}catch(e){if(setToast)setToast({text:L("Errore salvataggio filtro"),type:"error",color:"#E24B4A",icon:"🚫"});}}
  useEffect(function(){try{var raw=localStorage.getItem(historySavedFilterKey());if(raw){applyHistoryFilterPayload(JSON.parse(raw));}else{setHistoryDefaultFilters();}}catch(e){setHistoryDefaultFilters();}},[]);

  useEffect(function(){historyActionsVisibleRef.current=historyActionsVisible;},[historyActionsVisible]);

  useEffect(function(){
    var open=showSortModal||showFilterModal;
    if(setNativeBannerSuppressed)setNativeBannerSuppressed(!!open);
    if(open){try{var cap=(window as any).Capacitor;var ads=cap&&cap.Plugins&&cap.Plugins.FainanceAds;if(ads&&ads.hideBanner)ads.hideBanner({});}catch(e){}}
    return function(){if(setNativeBannerSuppressed)setNativeBannerSuppressed(false);};
  },[showSortModal,showFilterModal]);

  useEffect(function(){setHistoryVisibleCount(80);historyActionsVisibleRef.current=true;historyScrollQuietUntilRef.current=Date.now()+120;setHistoryActionsVisible(true);},[historyTab,filterYear,filterMonth,JSON.stringify(filterMonths||[]),searchQuery,filterCat,JSON.stringify(filterCats||[]),filterCatExclude,JSON.stringify(filterMethods||[]),filterAreaPersonal,filterAreaShare,filterGroup,filterDateFrom,filterDateTo,filterAmtMin,filterAmtMax,historySortDate,historySortDirection,historySortSecondary,historySortSecondaryDirection]);

  useEffect(function(){
    function scrollTopOf(target){return target===window?((window.pageYOffset||document.documentElement.scrollTop||document.body.scrollTop||0)):(target.scrollTop||0);}
    function findScrollTarget(){var node:any=historyRootRef.current;var p=node&&node.parentElement;while(p&&p!==document.body){try{var st=window.getComputedStyle?window.getComputedStyle(p):null;var oy=st?String(st.overflowY||""):"";if(oy==="auto"||oy==="scroll"||oy==="overlay")return p;}catch(e){}if(p.scrollHeight>p.clientHeight+40)return p;p=p.parentElement;}return window;}
    var target:any=findScrollTarget();
    historyLastScrollRef.current=scrollTopOf(target);
    function setHistoryActionsVisibleStable(next,y){
      if(historyActionsVisibleRef.current===next){historyLastScrollRef.current=y;return;}
      historyActionsVisibleRef.current=next;
      setHistoryActionsVisible(next);
      historyScrollQuietUntilRef.current=Date.now()+220;
      historyLastScrollRef.current=y;
    }
    function onScroll(){
      if(historyScrollRafRef.current)return;
      historyScrollRafRef.current=requestAnimationFrame(function(){
        historyScrollRafRef.current=0;
        var y=scrollTopOf(target);
        var nowMs=Date.now();
        if(nowMs<historyScrollQuietUntilRef.current){historyLastScrollRef.current=y;return;}
        var diff=y-historyLastScrollRef.current;
        if(y<=6){setHistoryActionsVisibleStable(true,y);return;}
        if(diff<=-3){setHistoryActionsVisibleStable(true,y);return;}
        if(diff>=12){setHistoryActionsVisibleStable(false,y);return;}
      });
    }
    try{target.addEventListener("scroll",onScroll,{passive:true});}catch(e){}
    return function(){try{target.removeEventListener("scroll",onScroll);}catch(e){}try{if(historyScrollRafRef.current)cancelAnimationFrame(historyScrollRafRef.current);}catch(e){}};
  },[]);

  var availableYears=useMemo(function(){var yrs:any=new Set([...(expenses||[]),...(incomes||[])].map(function(e:any){return e.date?String(e.date).slice(0,4):null;}).filter(Boolean));return ["all",...Array.from(yrs).sort(function(a:any,b:any){return String(b).localeCompare(String(a));})];},[expenses,incomes]);
  var grps=expenseGroups||DEFAULT_EXPENSE_GROUPS;
  var expenseFilterActive=(filterCat&&filterCat!=="all")||(filterCats&&filterCats.length>0)||(filterGroup&&filterGroup!=="all")||(filterMethods&&filterMethods.length>0)||filterAreaShare===false;

  function normSortField(v){if(v==="operation")return "date";if(v==="immission")return "created";if(v==="created")return "created";if(v==="amount")return "amount";if(v==="category")return "category";return "date";}
  function categorySortLabel(item){if(item&&item._historyKind==="income"){var it=getIT?getIT(item.type):null;return String((it&&it.name)||item.type||"");}var c=getCat?getCat(item.catId):null;return String((c&&c.name)||item.catName||item.catId||"");}
  function sortValue(item,field){var f=normSortField(field);if(f==="amount")return Number(item.amount)||0;if(f==="created")return item.createdAt?String(item.createdAt):(item.id?String(item.id):"");if(f==="category")return categorySortLabel(item).toLowerCase();return item.date||"";}
  function compareField(a,b,field,dir){var f=normSortField(field);var av=sortValue(a,f),bv=sortValue(b,f);if(av===bv)return 0;var res=f==="amount"?(Number(av)>Number(bv)?1:-1):(String(av)>String(bv)?1:-1);return dir==="asc"?res:-res;}
  function sortLocal(list){return list.slice().sort(function(a,b){var first=compareField(a,b,historySortDate,historySortDirection);if(first!==0)return first;return compareField(a,b,historySortSecondary||"amount",historySortSecondaryDirection||"desc");});}
  function displaySortLabel(field,dir){var f=normSortField(field);var lab=fieldOptions.find(function(x){return x.id===f;});var d=dirOptions.find(function(x){return x.id===(dir||"desc");});return L(lab?lab.label:"Data Movimento")+" · "+L(d?d.label:"Decrescente");}
  function openSort(){setSortDraftPrimary(normSortField(historySortDate));setSortDraftPrimaryDir(historySortDirection||"desc");setSortDraftSecondary(normSortField(historySortSecondary||"amount"));setSortDraftSecondaryDir(historySortSecondaryDirection||"desc");setShowSortModal(true);}
  function applySort(){setHistorySortDate(sortDraftPrimary);setHistorySortDirection(sortDraftPrimaryDir);setHistorySortSecondary(sortDraftSecondary);setHistorySortSecondaryDirection(sortDraftSecondaryDir);setShowSortModal(false);}
  function clearFilters(){setHistoryDefaultFilters();}
  function activeTypeLabel(){return historyTab==="incomes"?L("Entrate"):historyTab==="expenses"?L("Uscite"):L("Entrate")+" + "+L("Uscite");}
  function historyKindActive(kind){return kind==="expenses"?historyTab!=="incomes":historyTab!=="expenses";}
  function toggleHistoryKind(kind){var ex=historyTab!=="incomes";var inc=historyTab!=="expenses";if(kind==="expenses")ex=!ex;else inc=!inc;if(!ex&&!inc){ex=true;inc=true;}setHistoryTab(ex&&inc?"all":(ex?"expenses":"incomes"));}

  var historyRows=useMemo(function(){
    var ex=(filteredExpenses||[]).map(function(x:any){return {...x,_historyKind:"expense"};});
    var incAll=(filteredIncomes||[]).map(function(x:any){return {...x,_historyKind:"income"};});
    if(historyTab==="expenses")return ex;
    if(historyTab==="incomes")return incAll;
    return sortLocal(ex.concat(incAll));
  },[filteredExpenses,filteredIncomes,historyTab,expenseFilterActive,historySortDate,historySortDirection,historySortSecondary,historySortSecondaryDirection,cats]);
  var visibleRows=historyRows.slice(0,historyVisibleCount);

  function appButton(active,customColor){var c=customColor||secondaryC;return {border:"1px solid "+(active?c:borderC),background:active?c:(dark?"#252535":"#fff"),color:active?"#fff":textC,borderRadius:btnRadius,padding:"9px 12px",fontSize:13,fontWeight:850,cursor:"pointer",boxShadow:active?("0 5px 14px "+c+"28"):"none"};}
  function primaryButton(){return {border:"1px solid "+confirmC,background:confirmC,color:"#fff",borderRadius:btnRadius,padding:"9px 12px",fontSize:13,fontWeight:900,cursor:"pointer",boxShadow:"0 5px 14px "+confirmC+"28"};}
  function modalBase(){return {position:"fixed",zIndex:9999,inset:0,background:dark?"#171724":"#F7F8FF",color:textC,overflowY:"auto",boxSizing:"border-box",padding:isMobile?"calc(env(safe-area-inset-top, 0px) + 22px) 16px calc(env(safe-area-inset-bottom, 0px) + 26px)":"28px max(24px,calc((100vw - 760px)/2)) 34px"};}
  function sectionStyle(){return {background:cardBg,border:"1px solid "+borderC,borderRadius:18,padding:isMobile?14:18,boxShadow:dark?"none":"0 8px 26px rgba(15,23,42,.07)",marginBottom:14};}
  function modalHeader(title,closeFn){return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,marginBottom:16}}><div><div style={{fontSize:22,fontWeight:950,color:textC}}>{title}</div><div style={{fontSize:12,color:subC,marginTop:3}}>{L("Storico movimenti")}</div></div><button onClick={closeFn} style={{width:42,height:42,borderRadius:14,border:"1px solid #FCA5A5",background:dark?"#3A2228":"#FFF5F5",color:"#F87171",fontSize:22,fontWeight:950,cursor:"pointer",boxShadow:"0 4px 14px #F8717133"}}>×</button></div>;}
  function selectableLabel(label,active){return <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:6,width:"100%"}}><span style={{fontSize:13,fontWeight:950}}>{active?"✓":"○"}</span><span>{label}</span></span>;}
  function toggleButton(label,active,onClick,color){return <button type="button" onClick={onClick} style={appButton(active,color)}>{selectableLabel(L(label),active)}</button>;}
  function choiceGrid(value,setter,items,cols){return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat("+(cols||items.length)+",1fr)",gap:8}}>{items.map(function(it){var active=value===it.id;return <button key={it.id} onClick={function(){setter(it.id);}} style={appButton(active)}>{selectableLabel(L(it.label),active)}</button>;})}</div>;}
  function sortSection(title,value,setValue,dir,setDir){return <div style={sectionStyle()}><div style={{fontSize:16,fontWeight:950,color:textC,marginBottom:12}}>{title}</div><div style={{marginBottom:10}}>{choiceGrid(dir,setDir,dirOptions,2)}</div>{choiceGrid(value,setValue,fieldOptions,2)}</div>;}
  function searchBox(){return <div style={{position:"relative"}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#aaa"}}>🔍</span><input type="text" placeholder={t.search} value={searchQuery} onChange={function(e){if(historySearchDraftRef)historySearchDraftRef.current=e.target.value;setSearchQuery(e.target.value);}} style={{...inp,width:"100%",paddingLeft:34,paddingRight:searchQuery?34:10,boxSizing:"border-box"}}/>{searchQuery&&<button onClick={function(){if(historySearchDraftRef)historySearchDraftRef.current="";setSearchQuery("");}} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:confirmC,fontSize:16,fontWeight:950}}>×</button>}</div>;}
  function monthButtons(){return <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:7}}>{Array.from({length:12},function(_,i){var mk=(filterYear&&filterYear!=="all"?filterYear:String(curYear))+"-"+String(i+1).padStart(2,"0");var active=(filterMonths||[]).includes(mk);return <button key={mk} onClick={function(){setFilterMonth("");setFilterMonths(function(list){return (list||[]).includes(mk)?list.filter(function(x){return x!==mk;}):(list||[]).concat([mk]);});}} style={{...appButton(active),padding:"8px 6px",fontSize:11}}>{selectableLabel(monthShortName?monthShortName(i):MONTHS_SHORT[i],active)}</button>;})}</div>;}
  function prefixedCatId(kind,id){return kind+":"+String(id);}
  function isCatActive(kind,id){var key=prefixedCatId(kind,id);return (filterCats||[]).map(String).includes(key)||(kind==="expense"&&(filterCats||[]).map(String).includes(String(id)));}
  function togglePrefixedCat(kind,id){var key=prefixedCatId(kind,id);setFilterCat("all");setFilterCats(function(list){var base=(list||[]).map(String).filter(function(x){return !(kind==="expense"&&x===String(id));});return base.includes(key)?base.filter(function(x){return x!==key;}):base.concat([key]);});}
  function isMethodActive(id){return (filterMethods||[]).map(String).includes(String(id));}
  function toggleMethod(id){setFilterMethods(function(list){var key=String(id);var base=(list||[]).map(String);return base.includes(key)?base.filter(function(x){return x!==key;}):base.concat([key]);});}
  function exactAmountValue(){return filterAmtMin&&filterAmtMax&&String(filterAmtMin)===String(filterAmtMax)?String(filterAmtMin):"";}
  function setExactAmountValue(v){setFilterAmtMin(v);setFilterAmtMax(v);}
  function incomeTypeItems(){return (incomeTypes||[]).filter(function(x){return x&&x.id&&!x.deleted&&!x.archived;});}
  function activeExpenseFilterCats(){return (cats||[]).filter(function(c){return c&&c.id&&!c.deleted&&!c.archived;});}
  function activeFilterMethods(){return (methods||[]).filter(function(m){return m&&m.id&&!m.deleted&&!m.archived;});}
  function categoryButtons(items,kind){return <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>{(items||[]).filter(function(c){return c&&c.id&&!c.deleted&&!c.archived;}).map(function(c){var id=String(c.id);var active=isCatActive(kind,id);var col=c.color||confirmC;return <button type="button" key={kind+id} onClick={function(){togglePrefixedCat(kind,id);}} style={{padding:"8px 11px",borderRadius:999,border:"1px solid "+(active?col:(dark?"#46465d":"#D7DEEA")),background:active?col:(dark?"#242438":"#FFFFFF"),color:active?"#fff":textC,fontSize:12,fontWeight:900,cursor:"pointer",boxShadow:active?("0 5px 14px "+col+"30"):(dark?"none":"0 2px 8px rgba(15,23,42,.05)")}}>{active?"✓ ":""}{c.icon||"🏷️"} {L(c.name)}</button>;})}</div>;}
  function toggleFilterSection(id){setFilterSectionsOpen(function(prev){return {...(prev||{}),[id]:!(prev&&prev[id])};});}
  function fixedHistoryLabel(key){
    var code=String(lang||"it").split("-")[0];
    var labels:any={
      exactAmount:{it:"Importo esatto",en:"Exact amount",es:"Importe exacto",fr:"Montant exact",de:"Exakter Betrag",pt:"Valor exato",pl:"Dokładna kwota",nl:"Exact bedrag",ro:"Sumă exactă",el:"Ακριβές ποσό"},
      from:{it:"Da",en:"From",es:"Desde",fr:"De",de:"Von",pt:"De",pl:"Od",nl:"Van",ro:"De la",el:"Από"},
      to:{it:"A",en:"To",es:"Hasta",fr:"À",de:"Bis",pt:"Até",pl:"Do",nl:"Tot",ro:"Până la",el:"Έως"}
    };
    return (labels[key]&&labels[key][code])||(labels[key]&&labels[key].it)||key;
  }
  function filterSectionSummary(id){
    if(id==="period"){if(filterDateFrom||filterDateTo)return [filterDateFrom||"…",filterDateTo||"…"].join(" → ");if((filterMonths||[]).length)return String((filterMonths||[]).length)+" "+L("mesi selezionati");if(filterMonth)return L("Mese selezionato");if(filterYear&&filterYear!=="all")return String(filterYear);return L("Tutto il periodo");}
    if(id==="amount"){var exact=exactAmountValue();if(exact)return fixedHistoryLabel("exactAmount")+": "+exact;if(filterAmtMin||filterAmtMax)return (filterAmtMin||"0")+" – "+(filterAmtMax||"∞");return L("Qualsiasi importo");}
    if(id==="category"){var count=(filterCats||[]).length;return count?String(count)+" "+L("selezionate"):L("Tutte le categorie");}
    if(id==="methods"){var count=(filterMethods||[]).length;return count?String(count)+" "+L("selezionati"):L("Tutti i metodi");}
    if(id==="area"){if(filterAreaPersonal&&filterAreaShare)return L("Personale e Share");if(filterAreaPersonal)return L("Personale");if(filterAreaShare)return "Share";return L("Nessuna area");}
    return "";
  }
  function accordionSection(id,title,children,accent){
    var open=!!(filterSectionsOpen&&filterSectionsOpen[id]);
    return <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,marginBottom:10,overflow:"hidden",boxShadow:dark?"none":"0 3px 12px rgba(15,23,42,.045)"}}>
      <button type="button" onClick={function(){toggleFilterSection(id);}} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"12px 14px",border:"none",background:open?(dark?"#232337":"#FBFCFF"):"transparent",color:textC,cursor:"pointer",textAlign:"left"}}>
        <span style={{display:"flex",alignItems:"center",gap:9,minWidth:0}}><span style={{width:4,height:28,borderRadius:4,background:accent||confirmC,flexShrink:0}}/><span style={{minWidth:0}}><span style={{display:"block",fontSize:14,fontWeight:950}}>{title}</span><span style={{display:"block",fontSize:11,color:subC,marginTop:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{filterSectionSummary(id)}</span></span></span>
        <span style={{fontSize:18,color:subC,transform:open?"rotate(180deg)":"rotate(0deg)",transition:"transform .16s ease",flexShrink:0}}>⌄</span>
      </button>
      {open&&<div style={{padding:"4px 14px 14px",borderTop:"1px solid "+borderC}}>{children}</div>}
    </div>;
  }
  function renderFilterModal(){return <div style={modalBase()}>{modalHeader(L("Filtra"),function(){setShowFilterModal(false);})}
    <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:12,marginBottom:10}}><div style={{fontSize:13,fontWeight:950,color:textC,marginBottom:9}}>{L("Filtra per")}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{toggleButton("Entrate",historyKindActive("incomes"),function(){toggleHistoryKind("incomes");},incomeColor)}{toggleButton("Uscite",historyKindActive("expenses"),function(){toggleHistoryKind("expenses");},expenseColor)}</div></div>
    <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:12,marginBottom:10}}><div style={{fontSize:13,fontWeight:950,color:textC,marginBottom:9}}>{L("Parola chiave")}</div>{searchBox()}</div>
    {accordionSection("period",L("Periodo"),<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"end",paddingTop:10}}><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Anno")}<select value={filterYear} onChange={function(e){setFilterYear(e.target.value);setFilterMonth("");}} style={{...inp,width:"100%",marginTop:5}}>{availableYears.map(function(y:any){return <option key={y} value={y}>{y==="all"?L("Tutti gli anni"):y}</option>;})}</select></label><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Mese")}<select value={filterMonth} onChange={function(e){setFilterMonth(e.target.value);setFilterMonths([]);}} style={{...inp,width:"100%",marginTop:5}}><option value="">{L("Tutti i mesi")}</option>{Array.from({length:12},function(_,i){var m=String(i+1).padStart(2,"0");var key=(filterYear&&filterYear!=="all"?filterYear:String(curYear))+"-"+m;return <option key={m} value={key}>{monthFullName?monthFullName(i):MONTHS_FULL[i]}</option>;})}</select></label></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Data da")}<input type="date" value={filterDateFrom} onChange={function(e){setFilterDateFrom(e.target.value);}} style={{...inp,width:"100%",marginTop:5}}/></label><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Data a")}<input type="date" value={filterDateTo} onChange={function(e){setFilterDateTo(e.target.value);}} style={{...inp,width:"100%",marginTop:5}}/></label></div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}><button type="button" onClick={function(){setFilterDateFrom("");setFilterDateTo("");setFilterMonth(curMonthKey);setFilterMonths([]);}} style={appButton(false)}>{L("Mese corrente")}</button><button type="button" onClick={function(){setFilterMonth("");setFilterMonths([]);setFilterDateFrom(dateOffset(30));setFilterDateTo(todayStr());}} style={appButton(false)}>{L("Ultimi 30 giorni")}</button></div>
      <div style={{marginTop:12}}><button type="button" onClick={function(){setShowMonthSelector(!showMonthSelector);}} style={{...appButton(showMonthSelector),width:"100%"}}>{showMonthSelector?"✓ ":""}{L("Seleziona Mesi")}</button>{showMonthSelector&&<div style={{marginTop:10}}>{monthButtons()}</div>}</div>
    </>,"#7F77DD")}
    {accordionSection("amount",L("Importo"),<>
      <label style={{fontSize:11,fontWeight:900,color:subC,display:"block",paddingTop:10,marginBottom:10}}>{fixedHistoryLabel("exactAmount")}<input value={exactAmountValue()} onChange={function(e){setExactAmountValue(e.target.value);}} inputMode="decimal" placeholder="0" style={{...inp,width:"100%",marginTop:5}}/></label>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"end"}}><label style={{fontSize:11,fontWeight:900,color:subC}}>{fixedHistoryLabel("from")}<input value={filterAmtMin} onChange={function(e){setFilterAmtMin(e.target.value);}} inputMode="decimal" placeholder="0" style={{...inp,width:"100%",marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{fixedHistoryLabel("to")}<input value={filterAmtMax} onChange={function(e){setFilterAmtMax(e.target.value);}} inputMode="decimal" placeholder="0" style={{...inp,width:"100%",marginTop:5}}/></label></div>
    </>,"#F59E0B")}
    {accordionSection("category",L("Categoria"),<>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,paddingTop:10,marginBottom:12}}>{toggleButton("Includi Categorie",!filterCatExclude,function(){setFilterCatExclude(false);})}{toggleButton("Escludi Categorie",!!filterCatExclude,function(){setFilterCatExclude(true);})}</div>
      {historyKindActive("expenses")&&<div style={{background:dark?"#2B2024":"#FFF7F7",border:"1px solid "+(dark?"#59343C":"#FFD7D7"),borderRadius:12,padding:11,marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:7,fontSize:13,fontWeight:950,color:expenseColor,marginBottom:9}}><span>🔴</span>{L("Categorie Uscite")}</div>{categoryButtons(activeExpenseFilterCats(),"expense")}</div>}
      {historyKindActive("incomes")&&<div style={{background:dark?"#172D28":"#F1FCF8",border:"1px solid "+(dark?"#285449":"#BDEDDD"),borderRadius:12,padding:11,marginBottom:10}}><div style={{display:"flex",alignItems:"center",gap:7,fontSize:13,fontWeight:950,color:incomeColor,marginBottom:9}}><span>🟢</span>{L("Categorie Entrate")}</div>{categoryButtons(incomeTypeItems(),"income")}</div>}
      {historyKindActive("expenses")&&showShareInHistory&&filterAreaShare&&<div style={{background:dark?"#252239":"#F5F3FF",border:"1px solid "+(dark?"#4C456B":"#DDD6FE"),borderRadius:12,padding:11}}><div style={{fontSize:13,fontWeight:950,color:confirmC,marginBottom:8}}>🤝 Share</div><button type="button" onClick={function(){setFilterCat("all");setFilterCats(function(list){var base=(list||[]).map(String);return base.includes("share")?base.filter(function(x){return x!=="share";}):base.concat(["share"]);});}} style={{padding:"8px 11px",borderRadius:999,border:"1px solid "+((filterCats||[]).includes("share")?confirmC:borderC),background:(filterCats||[]).includes("share")?confirmC:(dark?"#242438":"#fff"),color:(filterCats||[]).includes("share")?"#fff":textC,fontSize:12,fontWeight:900,cursor:"pointer"}}>{(filterCats||[]).includes("share")?"✓ ":""}🤝 Share</button></div>}
      <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:12}}><button type="button" onClick={function(){var all:any[]=[];if(historyKindActive("expenses")){activeExpenseFilterCats().forEach(function(c){all.push("expense:"+String(c.id));});if(showShareInHistory&&filterAreaShare)all.push("share");}if(historyKindActive("incomes")){incomeTypeItems().forEach(function(c){all.push("income:"+String(c.id));});}setFilterCats(all);setFilterCat("all");}} style={{border:"none",background:"transparent",color:confirmC,cursor:"pointer",fontSize:12,fontWeight:900}}>{L("Seleziona tutte")}</button><button type="button" onClick={function(){setFilterCats([]);setFilterCat("all");}} style={{border:"none",background:"transparent",color:subC,cursor:"pointer",fontSize:12,fontWeight:900}}>{L("Pulisci")}</button></div>
    </>,"#10B981")}
    {historyKindActive("expenses")&&accordionSection("methods",L("Metodi di pagamento"),<><div style={{display:"flex",gap:7,flexWrap:"wrap",paddingTop:10}}>{activeFilterMethods().map(function(m){var active=isMethodActive(m.id);return <button type="button" key={m.id} onClick={function(){toggleMethod(m.id);}} style={{padding:"8px 11px",borderRadius:999,border:"1px solid "+(active?(m.color||confirmC):(dark?"#46465d":"#D7DEEA")),background:active?(m.color||confirmC):(dark?"#242438":"#fff"),color:active?"#fff":textC,fontSize:12,fontWeight:900,cursor:"pointer",boxShadow:active?("0 5px 14px "+(m.color||confirmC)+"30"):"none"}}>{active?"✓ ":""}{m.icon||"💳"} {L(m.name)}</button>;})}</div><div style={{marginTop:10}}><button type="button" onClick={function(){setFilterMethods([]);}} style={{border:"none",background:"transparent",color:subC,cursor:"pointer",fontSize:12,fontWeight:900}}>{L("Pulisci metodi")}</button></div></>,"#3B82F6")}
    {accordionSection("area",L("Area"),<div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,paddingTop:10}}>{toggleButton("Personale",!!filterAreaPersonal,function(){if(filterAreaPersonal&&filterAreaShare){setFilterAreaPersonal(false);}else{setFilterAreaPersonal(true);}},secondaryC)}{toggleButton("Share",!!filterAreaShare,function(){if(filterAreaShare&&filterAreaPersonal){setFilterAreaShare(false);}else{setFilterAreaShare(true);}},secondaryC)}</div>,"#8B5CF6")}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:dark?"#171724":"#F7F8FF",paddingTop:10}}><button type="button" onClick={function(){setShowFilterModal(false);}} style={{...primaryButton(),gridColumn:"1 / -1",padding:"16px 18px",fontSize:16,minHeight:52}}>{L("Filtra")}</button><button type="button" onClick={clearFilters} style={{...appButton(true,secondaryC),padding:"13px 16px",fontWeight:900}}>{L("Pulisci filtri")}</button><button type="button" onClick={saveHistoryFilter} style={{...appButton(true,secondaryC),padding:"13px 16px",fontWeight:900}}>{L("Salva filtro")}</button></div>
  </div>;}
  function renderSortModal(){return <div style={modalBase()}>{modalHeader(L("Ordina"),function(){setShowSortModal(false);})}{sortSection(L("Filtra per"),sortDraftPrimary,setSortDraftPrimary,sortDraftPrimaryDir,setSortDraftPrimaryDir)}{sortSection(L("E poi per"),sortDraftSecondary,setSortDraftSecondary,sortDraftSecondaryDir,setSortDraftSecondaryDir)}<div style={{position:"sticky",bottom:0,background:dark?"#171724":"#F7F8FF",paddingTop:10}}><button onClick={applySort} style={{...primaryButton(),width:"100%",padding:"14px 16px",fontSize:15}}>{L("Ordina")}</button></div></div>;}

  function renderExpense(e){var shareColor=e._share?(e._shareProjectColor||confirmC):null;var c=e._share?{icon:e._shareProjectIcon||"🤝",name:e._shareProjectName||"Share",color:shareColor||confirmC}:getCat(e.catId);var m=e._share?null:(getMethod(e.methodId)||(e.methodName?{id:e.methodId,name:e.methodName,color:"#B4B2A9",archived:true}:null));var eid="exp_"+e.id;var ecopy={id:e.id,amount:e.amount,catId:e.catId,methodId:e.methodId,methodName:e.methodName,desc:e.desc,date:e.date,rateizzato:e.rateizzato,rate:e.rate};return <div key={eid} style={{background:e._share?(shareColor+"18"):cardBg,borderRadius:12,border:"1px solid "+(e._share?(shareColor+"55"):borderC),padding:"10px 14px",marginBottom:8,boxShadow:e._share?(dark?"none":"0 5px 14px "+shareColor+"18"):"none"}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18,flexShrink:0}}>{c?c.icon:"📦"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:textC}}>{e.desc||"-"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:3}}>{c&&<Badge color={c.color} name={L(c.name)} small/>}{m&&<Badge color={m.color} name={m.name+(m.archived?" [A]":"")} small/>}{e.rateizzato&&<Badge color="#7F77DD" name={"÷"+e.rate+"m"} small/>}<span style={{fontSize:11,color:subC}}>{fmtDate(e.date,dateFmt)}</span></div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><div style={{fontSize:15,fontWeight:850,color:expenseColor}}>{fmt(e.amount)}{secRate&&showSecInHistory&&fmtSec(e.amount)&&<div style={{fontSize:10,color:subC,fontWeight:400}}>{fmtSec(e.amount)}</div>}</div>{!e._share&&<div style={{display:"flex",gap:6}}><button title={L("Modifica")} onClick={function(){setEditingItem({item:ecopy,isExp:true});}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>✏️</button><button title={L("Elimina")} onClick={function(){setDeleteConfirmId(eid);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",cursor:"pointer",color:expenseColor,fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>🗑️</button></div>}</div></div>{deleteConfirmId===eid&&!e._share&&<div style={{marginTop:10,background:"#fff0f0",borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><span style={{fontSize:13,color:expenseColor}}>{L("Eliminare?")}</span><div style={{display:"flex",gap:8}}><button onClick={function(){setExpenses(function(prev){return prev.filter(function(x){return x.id!==e.id;});});setDeleteConfirmId(null);setToast&&setToast({text:"Uscita eliminata",type:"success"});}} style={{...appButton(true),background:expenseColor,borderColor:expenseColor,padding:"6px 12px"}}>{L("Elimina")}</button><button onClick={function(){setDeleteConfirmId(null);}} style={{...appButton(false),padding:"6px 12px"}}>{V.cancel}</button></div></div>}</div>;}
  function renderIncome(inc){var it=getIT(inc.type);var iid="inc_"+inc.id;var icopy={id:inc.id,amount:inc.amount,type:inc.type,desc:inc.desc,date:inc.date,rateizzato:inc.rateizzato,rate:inc.rate};return <div key={iid} style={{background:cardBg,borderRadius:12,border:"1px solid "+borderC,padding:"10px 14px",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18,flexShrink:0}}>{it?it.icon:"💰"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:700,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:textC}}>{inc.desc||"-"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:3}}>{it&&<Badge color={it.color} name={L(it.name)} small/>}{inc.rateizzato&&<Badge color="#7F77DD" name={"÷"+inc.rate+"m"} small/>}<span style={{fontSize:11,color:subC}}>{fmtDate(inc.date,dateFmt)}</span></div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><div style={{fontSize:15,fontWeight:850,color:incomeColor}}>+{fmt(inc.amount)}{secRate&&showSecInHistory&&fmtSec(inc.amount)&&<div style={{fontSize:10,color:subC,fontWeight:400}}>{fmtSec(inc.amount)}</div>}</div><div style={{display:"flex",gap:6}}><button title={L("Modifica")} onClick={function(){setEditingItem({item:icopy,isExp:false});}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>✏️</button><button title={L("Elimina")} onClick={function(){setDeleteConfirmId(iid);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",cursor:"pointer",color:expenseColor,fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>🗑️</button></div></div></div>{deleteConfirmId===iid&&<div style={{marginTop:10,background:"#fff0f0",borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><span style={{fontSize:13,color:expenseColor}}>{L("Eliminare?")}</span><div style={{display:"flex",gap:8}}><button onClick={function(){setIncomes(function(prev){return prev.filter(function(x){return x.id!==inc.id;});});setDeleteConfirmId(null);setToast&&setToast({text:"Entrata eliminata",type:"success"});}} style={{...appButton(true),background:expenseColor,borderColor:expenseColor,padding:"6px 12px"}}>{L("Elimina")}</button><button onClick={function(){setDeleteConfirmId(null);}} style={{...appButton(false),padding:"6px 12px"}}>{V.cancel}</button></div></div>}</div>;}

  var totalExpenses=(filteredExpenses||[]).reduce(function(a,e){return a+(Number(e.amount)||0);},0);
  var totalIncomes=(filteredIncomes||[]).reduce(function(a,i){return a+(Number(i.amount)||0);},0);
  var historyActionsStyle:any={position:"sticky",top:0,zIndex:20,display:"flex",gap:8,marginBottom:historyActionsVisible?8:0,alignItems:"center",background:dark?"#171724":"#F7F8FF",padding:historyActionsVisible?"0 0 8px":"0",boxShadow:(historyActionsVisible&&!dark)?"0 8px 14px rgba(247,248,255,.92)":"none",maxHeight:historyActionsVisible?72:0,opacity:historyActionsVisible?1:0,transform:historyActionsVisible?"translateY(0)":"translateY(-12px)",overflow:"hidden",pointerEvents:historyActionsVisible?"auto":"none",transition:"max-height .14s ease, opacity .10s ease, transform .10s ease, margin-bottom .10s ease, padding .10s ease"};
  return <div ref={historyRootRef}>{showFilterModal&&renderFilterModal()}{showSortModal&&renderSortModal()}<div style={historyActionsStyle}><button onClick={function(){setShowFilterModal(true);}} style={{...primaryButton(),flex:1,padding:"11px 12px"}}>☰ {L("Filtra")}</button><button onClick={openSort} style={{...primaryButton(),flex:1,padding:"11px 12px"}}>↕ {L("Ordina")}</button></div><div style={{display:"flex",gap:8,alignItems:"center",justifyContent:"space-between",marginBottom:10,background:dark?"#252535":"#f8f8ff",border:"1px solid "+borderC,borderRadius:14,padding:"9px 11px"}}><div style={{fontSize:12,color:subC}}>{L("Vista")}: <b style={{color:textC}}>{activeTypeLabel()}</b></div><div style={{fontSize:12,color:subC,textAlign:"right"}}>{L("Ordine")}: <b style={{color:textC}}>{displaySortLabel(historySortDate,historySortDirection)}</b><span style={{display:"block",fontSize:11}}>{L("E poi per")}: {displaySortLabel(historySortSecondary,historySortSecondaryDirection)}</span></div></div><div style={{marginBottom:10}}>{searchBox()}</div><div style={{fontSize:12,color:subC,marginBottom:8}}>{historyRows.length} {L("voci")}{historyTab!=="incomes"&&" · "+L("Uscite")+": "+fmt(totalExpenses)}{historyTab!=="expenses"&&" · "+L("Entrate")+": "+fmt(totalIncomes)}</div>{historyRows.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:"32px 0"}}>{historyTab==="incomes"?t.noIncomes:t.noExpenses}</div>}{visibleRows.map(function(row:any){return row._historyKind==="income"?renderIncome(row):renderExpense(row);})}{historyRows.length>visibleRows.length&&<button onClick={function(){setHistoryVisibleCount(historyVisibleCount+80);}} style={{...appButton(false),width:"100%",padding:"10px 12px",marginBottom:8}}>{L("Mostra altri")} ({visibleRows.length}/{historyRows.length})</button>}</div>;
}

export function ConsulenteAIPanel(){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c:any=useApp();
  var translateUiRuntimeText:any=_c.translateUiRuntimeText;
  function L(s){return translateUiRuntimeText?translateUiRuntimeText(s):s;}
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_c;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_c;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_c;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_c;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_c;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_c;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_c;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_c;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat,aiExternalConsent,setAiExternalConsent}:any=_c;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_c;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_c;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_c;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_c;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_c;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_c;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_c;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_c;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_c;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_c;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_c;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_c;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening}:any=_c;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_c;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_c;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_c;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_c;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_c;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_c;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_c;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_c;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_c;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_c;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_c;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_c;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_c;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_c;
  var {canUsePlanFeature,consumePlanFeature,upgradeMessage,handleRewardedFeature}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  // ─────────────────────────────────────────────────────────────────────────
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var aiChatSectionRef=useRef(null);
  var chatInputRef=useRef(null);
  var aiSuggestionLangRef=useRef(null);
  var [aiConsentPrompt,setAiConsentPrompt]=useState<any>(null);
  function acceptAIExternalConsent(){
    var cb=aiConsentPrompt&&aiConsentPrompt.onAccept;
    setAiExternalConsent(true,new Date().toISOString());
    setAiConsentPrompt(null);
    try{if(cb)cb();}catch(e){}
  }
  function declineAIExternalConsent(){
    setAiConsentPrompt(null);
    setToast({text:L("Per usare il Consulente AI esterno devi autorizzare l’invio dei dati indicati. Puoi continuare a usare l’app senza questa funzione."),type:"warning",color:"#EF9F27",icon:"⚠️"});
  }
  function requireAIExternalConsent(next){
    if(aiExternalConsent){next();return;}
    setAiConsentPrompt({onAccept:next});
  }
  var grps=expenseGroups||DEFAULT_EXPENSE_GROUPS;
  var textC2=textC,subC2=subC,borderC2=borderC,cardBg2=cardBg;
  function monthKeyOffset(offset){var d=new Date(curYear,now.getMonth()+offset,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");}
  function sumExpMonth(mk,filterFn){return expenses.filter(function(e){return e.date&&e.date.startsWith(mk)&&(!filterFn||filterFn(e));}).reduce(function(a,e){return a+(parseFloat(e.amount)||0);},0);}
  function sumIncMonth(mk,filterFn){return incomes.filter(function(i){return i.date&&i.date.startsWith(mk)&&(!filterFn||filterFn(i));}).reduce(function(a,i){return a+(parseFloat(i.amount)||0);},0);}
  function catName(e){var c=getCat(e.catId);return c?c.name:"";}
  function catGroup(e){var c=getCat(e.catId);return c?c.group:"";}
  function isFood(e){var n=catName(e).toLowerCase();return n.includes("supermerc")||n.includes("aliment")||n.includes("spesa")||n.includes("cibo");}
  function isUtility(e){var n=(catName(e)+" "+(e.desc||"")).toLowerCase();return n.includes("uten")||n.includes("bollett")||n.includes("elettric")||n.includes("luce")||n.includes("gas")||n.includes("internet")||n.includes("telefono")||n.includes("acqua");}
  function isSalary(i){var n=((i.desc||"")+" "+(i.type||"")).toLowerCase();return n.includes("stipend")||n.includes("salario")||n.includes("busta")||(i.type==="salario"||i.type==="stipendio");}
  function isWeekend(iso){var d=new Date(iso+"T12:00:00");var day=d.getDay();return day===0||day===6;}
  function isExtra(e){var g=catGroup(e);var n=catName(e).toLowerCase();return g!=="casa"&&!n.includes("mutuo")&&!n.includes("uten")&&!n.includes("medicina");}
  function isEntertainmentRecurring(r){var n=(r.name||"").toLowerCase();return r.rtype==="expense"&&(n.includes("netflix")||n.includes("spotify")||n.includes("prime")||n.includes("disney")||n.includes("dazn")||n.includes("now")||n.includes("youtube")||n.includes("apple")||n.includes("streaming"));}
  function addAdvice(arr,item){if(!aiDismissed.includes(item.id))arr.push(item);}

  var aiAdvices=useMemo(function(){
    var arr=[];
    var visibleMonth=curMonthKey;
    var currentExp=sumExpMonth(visibleMonth);
    var currentInc=sumIncMonth(visibleMonth);
    var prevKeys=[monthKeyOffset(-1),monthKeyOffset(-2),monthKeyOffset(-3)];

    var entSubs=recurring.filter(isEntertainmentRecurring);
    if(entSubs.length>=2){
      var total=entSubs.reduce(function(a,r){return a+(parseFloat(r.amount)||0);},0);
      var minSave=Math.max(1,Math.round(total*0.18));
      var maxSave=Math.max(minSave,Math.round(total*0.25));
      addAdvice(arr,{id:"subs-entertainment",type:"risparmio",priority:"Media",icon:"🎬",title:L("Abbonamenti intrattenimento"),savingMonthly:maxSave,text:L("Hai")+" "+entSubs.length+" "+L("abbonamenti attivi per intrattenimento")+": "+entSubs.map(function(r){return r.name;}).join(", ")+". "+L("Totale")+": "+fmt(total)+"/"+L("mese")+". "+L("Valuta se sospenderne uno")+": "+L("risparmio stimato")+" "+fmt(minSave)+"–"+fmt(maxSave)+"/"+L("mese")+", "+L("cioè")+" "+fmt(minSave*12)+"–"+fmt(maxSave*12)+" "+L("all’anno")+".",question:L("Vuoi prendere in considerazione questa opzione a breve termine o queste spese non sono negoziabili?")});
    }

    var foodNow=sumExpMonth(visibleMonth,isFood);
    var foodPrevAvg=prevKeys.reduce(function(a,mk){return a+sumExpMonth(mk,isFood);},0)/3;
    if(foodNow>0&&foodPrevAvg>0&&foodNow>foodPrevAvg*1.1){
      var pct=((foodNow-foodPrevAvg)/foodPrevAvg)*100;
      var saveFood=Math.round(foodNow*0.03);
      addAdvice(arr,{id:"food-increase",type:"ottimizzazione",priority:pct>=20?"Alta":"Media",icon:"🛒",title:L("Spese alimentari in aumento"),savingMonthly:saveFood,text:L("Le spese alimentari sono aumentate del")+" "+pct.toFixed(1).replace(".",",")+"% "+L("rispetto alla media degli ultimi 3 mesi")+". "+L("Questo mese hai speso")+" "+fmt(foodNow)+", "+L("contro una media di")+" "+fmt(foodPrevAvg)+".",question:L("Vogliamo analizzarle nello specifico?")+" "+L("Riducendole anche solo del 3%, puoi risparmiare circa")+" "+fmt(saveFood)+" "+L("al mese")+". "});
    }

    var weekendExtra=expenses.filter(function(e){return e.date&&e.date.startsWith(visibleMonth)&&isWeekend(e.date)&&isExtra(e);}).reduce(function(a,e){return a+(parseFloat(e.amount)||0);},0);
    var extraTotal=expenses.filter(function(e){return e.date&&e.date.startsWith(visibleMonth)&&isExtra(e);}).reduce(function(a,e){return a+(parseFloat(e.amount)||0);},0);
    if(extraTotal>0&&weekendExtra/extraTotal>=0.3){
      var pctW=(weekendExtra/extraTotal)*100;
      var saveW=Math.round(weekendExtra*0.05);
      addAdvice(arr,{id:"weekend-extra",type:"abitudine",priority:"Media",icon:"🌙",title:L("Spese extra concentrate nel weekend"),savingMonthly:saveW,text:L("Il")+" "+pctW.toFixed(1).replace(".",",")+"% "+L("delle spese extra del mese avviene nel weekend")+". "+L("Spese weekend extra")+": "+fmt(weekendExtra)+" "+L("su")+" "+fmt(extraTotal)+".",question:L("Vuoi impostare un limite weekend o analizzare il dettaglio?")+" "+L("Riducendole del 5%, risparmi circa")+" "+fmt(saveW)+" "+L("al mese")+". "});
    }

    var salaryNow=sumIncMonth(visibleMonth,isSalary);
    var salaryPrevAvg=prevKeys.reduce(function(a,mk){return a+sumIncMonth(mk,isSalary);},0)/3;
    if(salaryNow===0&&salaryPrevAvg>0){
      addAdvice(arr,{id:"missing-salary",type:"controllo",priority:"Alta",icon:"💼",title:L("Possibile stipendio mancante"),savingMonthly:0,text:L("Nel mese corrente non risulta registrata un’entrata assimilabile allo stipendio, mentre negli ultimi 3 mesi la media era")+" "+fmt(salaryPrevAvg)+".",question:L("Ti sei dimenticato di inserirla o è corretto così?")});
    }

    var utilNow=sumExpMonth(visibleMonth,isUtility);
    var utilPrevAvg=prevKeys.reduce(function(a,mk){return a+sumExpMonth(mk,isUtility);},0)/3;
    if(utilNow===0&&utilPrevAvg>0){
      addAdvice(arr,{id:"missing-utilities",type:"controllo",priority:"Alta",icon:"💡",title:L("Possibile bolletta mancante"),savingMonthly:0,text:L("Nel mese corrente non risultano uscite riconducibili a utenze o bollette")+". "+L("Negli ultimi 3 mesi la media era")+" "+fmt(utilPrevAvg)+".",question:L("Ti sei dimenticato di inserirla o è giusto così?")});
    }

    recurring.forEach(function(r){
      if((r.confirmed||[]).includes(visibleMonth)||(r.skipped||[]).includes(visibleMonth))return;
      var amount=parseFloat(r.amount)||0;
      if(!amount)return;
      var isPresent=(r.rtype==="expense"?expenses:incomes).some(function(x){return x.date&&x.date.startsWith(visibleMonth)&&Math.abs((parseFloat(x.amount)||0)-amount)<=1&&String(x.desc||"").toLowerCase().includes(String(r.name||"").toLowerCase().slice(0,8));});
      if(!isPresent){addAdvice(arr,{id:"missing-recurring-"+r.id,type:"controllo",priority:"Alta",icon:r.rtype==="expense"?"🔄":"💰",title:L("Ricorrente non registrata"),savingMonthly:0,text:L("Non trovo nel mese corrente la voce ricorrente")+" “"+r.name+"” "+L("da")+" "+fmt(amount)+".",question:L("Va confermata, saltata o inserita manualmente?")});}
    });

    if(budgetPlan&&budgetPlan.items){
      budgetPlan.items.forEach(function(b){
        var c=cats.find(function(x){return x.id===b.catId;});
        if(!c||!b.amount)return;
        var spent=sumExpMonth(visibleMonth,function(e){return e.catId===c.id;});
        var pct=b.amount>0?(spent/b.amount)*100:0;
        if(pct>=90){
          var over=Math.max(0,spent-b.amount);
          addAdvice(arr,{id:"budget-risk-"+c.id,type:"budget",priority:pct>=100?"Alta":"Media",icon:c.icon||"💰",title:(pct>=100?L("Budget superato"):L("Budget a rischio"))+": "+c.name,savingMonthly:Math.round(Math.max(0,spent-b.amount*0.95)),text:L("Hai usato il")+" "+pct.toFixed(1).replace(".",",")+"% "+L("del budget")+" “"+c.name+"”: "+fmt(spent)+" "+L("su")+" "+fmt(b.amount)+".",question:pct>=100?L("Vuoi analizzare le singole uscite per capire dove intervenire?"):L("Vuoi impostare un limite più stretto per il resto del mese?")});
        }
      });
    }

    if(!arr.length){
      arr.push({id:"ai-empty",type:"info",priority:"Bassa",icon:"✅",title:L("Nessuna criticità evidente"),savingMonthly:0,text:currentExp===0&&currentInc===0?L("Non ci sono ancora abbastanza dati nel mese corrente per generare consigli affidabili."):L("Al momento non emergono anomalie forti dai dati disponibili. Continua a registrare entrate, uscite e ricorrenze per migliorare la precisione del Consulente AI."),question:L("Puoi iniziare chiedendo: “Come posso risparmiare questo mese?”")});
    }
    return arr.sort(function(a,b){var pr={Alta:0,Media:1,Bassa:2};return (pr[a.priority]||9)-(pr[b.priority]||9)||(b.savingMonthly||0)-(a.savingMonthly||0);});
  },[expenses,incomes,recurring,budgetPlan,cats,aiDismissed,curMonthKey,statsView,lang]);

  var totalSaving=aiAdvices.reduce(function(a,x){return a+(x.savingMonthly||0);},0);
  var highCount=aiAdvices.filter(function(x){return x.priority==="Alta";}).length;
  var controlCount=aiAdvices.filter(function(x){return x.type==="controllo";}).length;
  var filteredAiAdvices=aiAdvices.filter(function(x){if(aiAdviceFilter==="high")return x.priority==="Alta";if(aiAdviceFilter==="control")return x.type==="controllo";return true;});
  function dismissAdvice(id){setAiDismissed(function(p){return p.includes(id)?p:[...p,id];});}
  function openAIChat(prefill){
    setAiTab("chat");
    if(prefill!==undefined&&prefill!==null&&String(prefill).trim())aiSuggestionLangRef.current=lang||"it";
    setTimeout(function(){
      if(aiChatSectionRef.current&&aiChatSectionRef.current.scrollIntoView){aiChatSectionRef.current.scrollIntoView({behavior:"smooth",block:"start"});}
      if(chatInputRef.current){
        if(prefill!==undefined&&prefill!==null)chatInputRef.current.value=prefill;
        chatInputRef.current.focus();
      }
    },80);
  }
  function askAI(text){
    var q=String(text||"").trim();
    openAIChat(q);
    if(q){setTimeout(function(){try{sendChat();}catch(e){}},220);}
  }
  function buildAIContext(){
    var mk=curMonthKey;
    var expMonth=sumExpMonth(mk);
    var incMonth=sumIncMonth(mk);
    var prevMonth=monthKeyOffset(-1);
    var expPrev=sumExpMonth(prevMonth);
    var incPrev=sumIncMonth(prevMonth);
    var expYear=expenses.filter(function(e){return e.date&&e.date.startsWith(String(curYear));}).reduce(function(a,e){return a+(parseFloat(e.amount)||0);},0);
    var incYear=incomes.filter(function(i){return i.date&&i.date.startsWith(String(curYear));}).reduce(function(a,i){return a+(parseFloat(i.amount)||0);},0);
    var byCat={};
    expenses.filter(function(e){return e.date&&e.date.startsWith(mk);}).forEach(function(e){var c=getCat(e.catId);var name=c?c.name:"Altro";byCat[name]=(byCat[name]||0)+(parseFloat(e.amount)||0);});
    var topCats=Object.keys(byCat).map(function(k){return{name:k,amount:byCat[k]};}).sort(function(a,b){return b.amount-a.amount;}).slice(0,8);
    var byIncome={};
    incomes.filter(function(i){return i.date&&i.date.startsWith(mk);}).forEach(function(i){var it=incomeTypes.find(function(x){return x.id===i.type;});var name=it?it.name:(i.type||"Entrata");byIncome[name]=(byIncome[name]||0)+(parseFloat(i.amount)||0);});
    var topIncome=Object.keys(byIncome).map(function(k){return{name:k,amount:byIncome[k]};}).sort(function(a,b){return b.amount-a.amount;}).slice(0,6);
    var dataQuality={expensesCount:expenses.length,incomesCount:incomes.length,recurringCount:recurring.length,currentMonthExpenses:expenses.filter(function(e){return e.date&&e.date.startsWith(mk);}).length,currentMonthIncomes:incomes.filter(function(i){return i.date&&i.date.startsWith(mk);}).length,missingRecurringHints:aiAdvices.filter(function(a){return a.type==="controllo";}).map(function(a){return a.title;}).slice(0,8)};
    var recurringSummary=recurring.slice(0,20).map(function(r){return{name:r.name,type:r.rtype,amount:parseFloat(r.amount)||0,dayOfMonth:r.dayOfMonth||null};});
    var budgetSummary=(budgetPlan&&budgetPlan.items?budgetPlan.items:[]).map(function(b){var c=getCat(b.catId);var spent=sumExpMonth(mk,function(e){return e.catId===b.catId;});return{category:c?c.name:String(b.catId),area:c?((grps.find(function(g){return g.id===c.group;})||{}).name||c.group):"",budget:parseFloat(b.amount)||0,spent:spent};}).filter(function(x){return x.budget||x.spent;});
    var budgetRisks=budgetSummary.map(function(b){var pct=b.budget>0?(b.spent/b.budget)*100:0;return{category:b.category,area:b.area,budget:b.budget,spent:b.spent,usedPct:pct,remaining:b.budget-b.spent};}).filter(function(b){return b.usedPct>=80;}).sort(function(a,b){return b.usedPct-a.usedPct;});
    var patrimonioTotal=0;
    try{patrimonioTotal=Object.keys(patrimonioValues||{}).reduce(function(a,k){return a+(parseFloat(patrimonioValues[k])||0);},0);}catch(e){}
    var ctx={
      app:"fAInance",
      language:lang,
      currency:currency,
      month:mk,
      dataAccessLevel:aiDataAccess,
      dataAccessLabel:aiDataAccess==="full"?"analisi completa - tutte le transazioni":aiDataAccess==="areas"?"analisi media - spese per area":"analisi limitata - solo riepilogo",
      totals:{incomeMonth:incMonth,expenseMonth:expMonth,balanceMonth:incMonth-expMonth,incomeYear:incYear,expenseYear:expYear,balanceYear:incYear-expYear,patrimonioTotal:patrimonioTotal},
      trend:{previousMonth:prevMonth,incomePreviousMonth:incPrev,expensePreviousMonth:expPrev,balancePreviousMonth:incPrev-expPrev,expenseDeltaVsPrevious:expMonth-expPrev,incomeDeltaVsPrevious:incMonth-incPrev},
      dataQuality:dataQuality,
      topExpenseCategories:topCats,
      topIncomeTypes:topIncome,
      recurring:recurringSummary,
      budget:budgetSummary,
      budgetRisks:budgetRisks,
      activeAdvice:aiAdvices.slice(0,10).map(function(a){return{title:a.title,priority:a.priority,type:a.type,savingMonthly:a.savingMonthly||0,text:a.text,question:a.question};})
    };
    if(aiDataAccess==="areas"||aiDataAccess==="full"){
      var byArea={};
      expenses.filter(function(e){return e.date&&e.date.startsWith(mk);}).forEach(function(e){var c=getCat(e.catId);var areaId=c?c.group:"altro";var g=grps.find(function(x){return x.id===areaId;});var areaName=g?g.name:(areaId||"Altro");if(!byArea[areaName])byArea[areaName]={area:areaName,amount:0,count:0,categories:{}};var amt=parseFloat(e.amount)||0;byArea[areaName].amount+=amt;byArea[areaName].count+=1;var cn=c?c.name:"Altro";byArea[areaName].categories[cn]=(byArea[areaName].categories[cn]||0)+amt;});
      ctx.expenseAreas=Object.keys(byArea).map(function(k){var a=byArea[k];return{area:a.area,amount:a.amount,count:a.count,categories:Object.keys(a.categories).map(function(cn){return{name:cn,amount:a.categories[cn]};}).sort(function(x,y){return y.amount-x.amount;}).slice(0,8)};}).sort(function(x,y){return y.amount-x.amount;});
    }
    if(aiDataAccess==="full"){
      ctx.transactions={
        expenses:expenses.slice().sort(function(a,b){return String(b.date||"").localeCompare(String(a.date||""));}).slice(0,500).map(function(e){var c=getCat(e.catId);var m=methods.find(function(x){return x.id===e.methodId;});var g=c?grps.find(function(x){return x.id===c.group;}):null;return{date:e.date,amount:parseFloat(e.amount)||0,category:c?c.name:"Altro",area:g?g.name:(c?c.group:""),method:m?m.name:"",description:e.desc||"",instalment:!!e.rateizzato,months:e.rate||null};}),
        incomes:incomes.slice().sort(function(a,b){return String(b.date||"").localeCompare(String(a.date||""));}).slice(0,300).map(function(i){var it=incomeTypes.find(function(x){return x.id===i.type;});return{date:i.date,amount:parseFloat(i.amount)||0,type:it?it.name:(i.type||"Entrata"),description:i.desc||"",instalment:!!i.rateizzato,months:i.rate||null};})
      };
    }
    return ctx;
  }
  function isAIQuestionInScope(q){return !!String(q||"").trim();}
  function detectTextLanguage(q){
    var raw=String(q||"");var s=normalizeVoiceText(raw);var scores={it:0,es:0,en:0,fr:0,de:0,pt:0,pl:0,nl:0,ro:0,el:0};
    var sets={
      es:["como","ahorro","gastos","ingresos","presupuesto","quiero","puedo","mes","dinero","consejo","ayuda","hola","porque","cuanto","donde","cuando"],
      en:["how","save","expenses","income","budget","money","month","hello","hi","advice","why","what","where","when","can","should"],
      fr:["comment","economiser","depenses","revenus","budget","argent","mois","bonjour","pourquoi","combien","conseil","aide"],
      de:["wie","sparen","ausgaben","einnahmen","budget","geld","monat","hallo","warum","wieviel","hilfe"],
      pt:["como","poupar","despesas","receitas","orcamento","orçamento","dinheiro","mes","mês","ola","olá","porque","quanto"],
      pl:["jak","oszczedzac","oszczędzać","wydatki","przychody","budzet","budżet","pieniadze","pieniądze","miesiac","miesiąc","czesc","cześć"],
      nl:["hoe","sparen","uitgaven","inkomsten","budget","geld","maand","hallo","waarom","advies"],
      ro:["cum","economisesc","cheltuieli","venituri","buget","bani","luna","lună","salut","de ce","sfat"],
      el:["πως","πώς","εξοδα","έξοδα","εσοδα","έσοδα","προυπολογισμος","προϋπολογισμός","χρηματα","χρήματα","μηνας","μήνας","γεια","γιατι","γιατί"],
      it:["come","risparmio","spese","entrate","budget","soldi","mese","ciao","perche","perché","quanto","consiglio","aiuto"]
    };
    Object.keys(sets).forEach(function(code){sets[code].forEach(function(w){if(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(w))+"\\b","i").test(s))scores[code]+=1;});});
    if(/[¿¡ñ]/i.test(raw))scores.es+=3;if(/[àèéìòù]/i.test(raw))scores.it+=2;if(/[çœàâêîôûëïüÿæ]/i.test(raw))scores.fr+=2;if(/[äöüß]/i.test(raw))scores.de+=3;if(/[ãõç]/i.test(raw))scores.pt+=3;if(/[ąćęłńóśźż]/i.test(raw))scores.pl+=3;if(/[ăâîșşțţ]/i.test(raw))scores.ro+=3;if(/[Ͱ-Ͽ]/.test(raw))scores.el+=5;
    var best=lang||"it",val=0;Object.keys(scores).forEach(function(k){if(scores[k]>val){best=k;val=scores[k];}});return best;
  }
  function languageName(code){return {it:"italiano",es:"spagnolo",en:"inglese",fr:"francese",de:"tedesco",pt:"portoghese",pl:"polacco",nl:"olandese",ro:"rumeno",el:"greco"}[code]||"inglese";}
  function localizedOutOfScope(code){return {it:AI_OUT_OF_SCOPE_MESSAGE,es:"Solo puedo ayudarte con finanzas personales, presupuesto, gastos, ingresos, ahorro y funciones de la app fAInance.",en:"I can only help with personal finance, budget, expenses, income, savings and fAInance app features.",fr:"Je peux seulement aider avec les finances personnelles, le budget, les dépenses, les revenus, l’épargne et les fonctions de l’app fAInance.",de:"Ich kann nur bei persönlichen Finanzen, Budget, Ausgaben, Einnahmen, Sparen und Funktionen der fAInance-App helfen.",pt:"Só posso ajudar com finanças pessoais, orçamento, despesas, receitas, poupança e funções da app fAInance.",pl:"Mogę pomóc tylko w finansach osobistych, budżecie, wydatkach, przychodach, oszczędzaniu i funkcjach aplikacji fAInance.",nl:"Ik kan alleen helpen met persoonlijke financiën, budget, uitgaven, inkomsten, sparen en functies van de fAInance-app.",ro:"Te pot ajuta doar cu finanțe personale, buget, cheltuieli, venituri, economii și funcțiile aplicației fAInance.",el:"Μπορώ να βοηθήσω μόνο με προσωπικά οικονομικά, προϋπολογισμό, έξοδα, έσοδα, αποταμίευση και λειτουργίες της εφαρμογής fAInance."}[code]||localizedOutOfScope("en");}
  function buildAIRequest(q){
    var forced=aiSuggestionLangRef.current;
    var qLang=forced||detectTextLanguage(q);
    aiSuggestionLangRef.current=null;
    var lname=languageName(qLang);
    return {question:"[LANGUAGE_LOCK="+qLang+" / "+lname+". Reply ONLY in "+lname+". Output must be entirely in "+lname+". Do not use Greek unless LANGUAGE_LOCK is el.] "+q,language:qLang,context:(function(){var c=buildAIContext();c.language=qLang;return c;})(),chatHistory:(aiChat||[]).filter(function(m){return m&&m.role==="user";}).slice(-8).map(function(m){return{role:"user",text:m.rawText||m.text};}),instruction:AI_AGENT_SCOPE_INSTRUCTION+" LANGUAGE_LOCK: rispondi esclusivamente in "+lname+" (codice "+qLang+"). Se il messaggio nasce da un suggerimento dell’app, usa la lingua predefinita dell’app. Per i messaggi digitati dall’utente, mantieni la lingua dell’ultimo messaggio dell’utente. Non rispondere mai in greco se il codice lingua non è el. Rispetta dataAccessLevel: summary=usa solo riepiloghi, areas=usa anche aggregati per area, full=puoi usare anche le transazioni inviate. Usa trend, budgetRisks, dataQuality e activeAdvice per dare 2-4 azioni concrete. Usa importi stimati solo quando derivano dai dati. Non inventare dati personali mancanti. Presenta scenari, rischi e ipotesi: niente certezze assolute."};
  }
  function detectAnswerLanguage(ans){var raw=String(ans||"");if(/[Ͱ-Ͽ]/.test(raw))return "el";return detectTextLanguage(raw);}
  function answerNeedsTranslation(ans,target){var detected=detectAnswerLanguage(ans);return !!target&&detected!==target;}
  function looksItalianAnswer(ans){var s=normalizeVoiceText(ans||"");var hits=["puoi","spese","entrate","risparmio","mese","consiglio","categoria","budget","dati","app","devi","taglia","riduci","vedi","euro"].filter(function(w){return new RegExp("\\b"+w+"\\b").test(s);}).length;return hits>=3;}
  async function callFinanceAgent(q){
    var req=buildAIRequest(q);var token="";try{if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();}catch(e){}var aiHeaders:any={"Content-Type":"application/json"};if(token)aiHeaders.Authorization="Bearer "+token;var aiCtrl=new AbortController();var aiTimeout=setTimeout(function(){aiCtrl.abort();},15000);var res=await fetch(AI_AGENT_ENDPOINT,{method:"POST",headers:aiHeaders,signal:aiCtrl.signal,body:JSON.stringify(req)}).finally(function(){clearTimeout(aiTimeout);});var data=null;try{data=await res.json();}catch(e){}if(!res.ok){throw new Error((data&&data.error)||("Errore agente AI: "+res.status));}
    var answer=(data&&(data.answer||data.message||data.text))||"";if(!answer)throw new Error("L’agente AI non ha restituito una risposta valida.");answer=String(answer).replace(/\*\*/g,"").replace(/^\s*#{1,6}\s*/gm,"").replace(/`/g,"");
    if(answerNeedsTranslation(answer,req.language)){
      try{var tRes=await fetch(AI_AGENT_ENDPOINT,{method:"POST",headers:aiHeaders,body:JSON.stringify({question:"Translate this answer into "+languageName(req.language)+". Return only the translated answer, no notes. Text: "+answer,language:req.language,context:{app:"fAInance",translationOnly:true},instruction:"Task: translate only. Output language: "+languageName(req.language)+". Do not answer in Italian. Return only translated text."})});var td=await tRes.json();var translated=(td&&(td.answer||td.message||td.text))||"";if(translated)answer=String(translated).replace(/\*\*/g,"").replace(/^\s*#{1,6}\s*/gm,"").replace(/`/g,"");}catch(e){}
    }
    return answer;
  }
  function botAnswer(q){
    var query=(q||"").toLowerCase();
    if(!expenses.length&&!incomes.length)return "Non ci sono ancora dati sufficienti. Inserisci almeno qualche uscita, entrata e ricorrenza: altrimenti il consiglio sarebbe inventato.";
    if(query.includes("rispar")||query.includes("taglia")||query.includes("ottim")){
      var top=aiAdvices.filter(function(a){return a.savingMonthly>0;}).slice(0,3);
      if(!top.length)return "Non vedo tagli evidenti con i dati attuali. I controlli più utili ora sono ricorrenze mancanti, bollette e budget a rischio.";
      return "Le prime 3 azioni ad alto impatto sono: "+top.map(function(a,i){return (i+1)+") "+a.title+" — circa "+fmt(a.savingMonthly)+"/mese";}).join("; ")+". Potenziale annuo stimato: "+fmt(top.reduce(function(s,a){return s+a.savingMonthly;},0)*12)+".";
    }
    if(query.includes("budget")){
      var bud=aiAdvices.filter(function(a){return a.type==="budget";});
      if(!bud.length)return "Non risultano budget superati o vicini al limite. Se vuoi più precisione, configura un budget per ogni categoria principale.";
      return bud.map(function(a){return a.title+": "+a.text;}).join("\n");
    }
    if(query.includes("abbon")){
      var sub=aiAdvices.find(function(a){return a.id==="subs-entertainment";});
      return sub?sub.text+" "+sub.question:"Non trovo abbastanza abbonamenti ricorrenti riconoscibili. Registra gli abbonamenti nella sezione Ricorrenti per farmeli analizzare meglio.";
    }
    if(query.includes("manc" )||query.includes("diment" )||query.includes("bollett")||query.includes("stipend")){
      var checks=aiAdvices.filter(function(a){return a.type==="controllo";});
      if(!checks.length)return "Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.";
      return checks.map(function(a){return a.title+": "+a.text+" "+a.question;}).join("\n");
    }
    return "Posso aiutarti su risparmio mensile, budget, abbonamenti, spese weekend, bollette o possibili entrate/uscite mancanti. Dai dati attuali vedo "+aiAdvices.length+" indicazioni, di cui "+highCount+" ad alta priorità.";
  }
  async function sendChat(){
    var q=(chatInputRef.current&&chatInputRef.current.value?chatInputRef.current.value:"").trim();if(!q||aiLoading)return;
    function runAllowed(){
      var userMsg={id:Date.now(),role:"user",text:q};
      setAiChat(function(p){return [...p,userMsg].slice(-50);});
      if(chatInputRef.current)chatInputRef.current.value="";
      if(consumePlanFeature)consumePlanFeature("aiReply",1);
      if(!isAIQuestionInScope(q)){
        setAiChat(function(p){return [...p,{id:Date.now()+1,role:"assistant",text:localizedOutOfScope(detectTextLanguage(q))}].slice(-50);});
        return;
      }
      function callExternalAI(){
        setAiLoading(true);
        callFinanceAgent(q).then(function(ans){
          setAiChat(function(p){return [...p,{id:Date.now()+1,role:"assistant",text:ans}].slice(-50);});
        }).catch(function(err){
          var rawErr=(err&&err.message?err.message:"errore sconosciuto");
          var local=botAnswer(q);
          var errMsg=(rawErr.indexOf("429")>=0?"Il motore AI remoto non ha quota disponibile.":"Il motore AI remoto non è disponibile ora.")+" Intanto posso darti una lettura locale dei dati:\n"+local;
          setAiChat(function(p){return [...p,{id:Date.now()+2,role:"assistant",text:errMsg}].slice(-50);});
        }).finally(function(){setAiLoading(false);});
      }
      requireAIExternalConsent(callExternalAI);
    }
    if(handleRewardedFeature){handleRewardedFeature("aiReply",1,function(){runAllowed();});return;}
    if(canUsePlanFeature&&!canUsePlanFeature("aiReply",1)){setToast({text:upgradeMessage?upgradeMessage("aiReply"):L("Hai raggiunto il limite giornaliero di risposte AI."),type:"warning",color:"#EF9F27",icon:"⚠️"});return;}
    runAllowed();
  }
  var sinp={width:"100%",borderRadius:8,border:"1px solid "+borderC2,padding:"9px 11px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:textC2,boxSizing:"border-box"};
  var aiAccessLabel=aiDataAccess==="full"?L("analisi completa: tutte le transazioni essenziali"):aiDataAccess==="areas"?L("analisi media: riepilogo + spese per area"):L("analisi limitata: solo riepilogo aggregato");
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{position:"relative",overflow:"hidden",background:dark?"#252535":"linear-gradient(135deg,#ffffff,#f4f1ff)",border:"1px solid "+borderC2,borderRadius:18,padding:isMobile?18:22,minHeight:isMobile?132:150,boxShadow:dark?"none":"0 8px 28px rgba(127,119,221,0.12)"}}>
      <div style={{position:"relative",zIndex:2,maxWidth:620}}>
        <div style={{fontSize:22,fontWeight:900,color:textC2,marginBottom:6}}>{L("Consulente AI")}</div>
        <div style={{fontSize:12,color:subC2,lineHeight:1.5,marginBottom:14}}>{L("Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.")}</div>
        <div style={{display:"flex",gap:9,flexWrap:"wrap"}}><button onClick={function(){openAIChat("");}} style={{background:"linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#7FC8F8))",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontSize:13,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 4px 14px rgba(127,119,221,0.22)"}}>💬 {L("Chat")}</button><button onClick={function(){if(openVoiceModal)openVoiceModal(true);else setVoiceModal(true);}} style={{background:"linear-gradient(135deg,#1D9E75,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontSize:13,fontWeight:800,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 4px 14px rgba(29,158,117,0.22)"}}>🎙️ {L("Parla con l’assistente")}</button></div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
      <button onClick={function(){setAiAdviceFilter("all");setAiTab("consigli");}} style={{border:"none",background:"transparent",padding:0,textAlign:"left",cursor:"pointer"}}><StatCard title={L("Risparmio potenziale")} value={fmt(totalSaving)} color="#1D9E75" bg="#e8f8f0" sub={fmt(totalSaving*12)+"/anno"}/></button>
      <button onClick={function(){setAiAdviceFilter("all");setAiTab("consigli");}} style={{border:"none",background:"transparent",padding:0,textAlign:"left",cursor:"pointer"}}><StatCard title={L("Consigli attivi")} value={String(aiAdvices.length)} color="#7F77DD" bg="#f0f0ff"/></button>
      <button onClick={function(){setAiAdviceFilter("high");setAiTab("consigli");}} style={{border:"none",background:"transparent",padding:0,textAlign:"left",cursor:"pointer"}}><StatCard title={L("Priorità alta")} value={String(highCount)} color={highCount?"#E24B4A":"#1D9E75"} bg={highCount?"#fff0f0":"#e8f8f0"}/></button>
      <button onClick={function(){setAiAdviceFilter("control");setAiTab("consigli");}} style={{border:"none",background:"transparent",padding:0,textAlign:"left",cursor:"pointer"}}><StatCard title={L("Controlli dati")} value={String(controlCount)} color="#EF9F27" bg="#fff8e1"/></button>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      {[{id:"consigli",label:"📌 "+L("Consigli e metriche"),sub:L("Analisi automatiche"),color:"#7F77DD"},{id:"chat",label:"💬 "+L("Conversazione"),sub:L("Domande su fAInance"),color:"#378ADD"}].map(function(tb){var active=aiTab===tb.id;return <button key={tb.id} onClick={function(){tb.id==="chat"?openAIChat(undefined):setAiTab(tb.id);}} style={{textAlign:"left",padding:"13px 14px",borderRadius:14,border:"1.5px solid "+(active?tb.color:borderC2),background:active?("linear-gradient(135deg,"+tb.color+"22,#ffffff)"):(dark?"#252535":"#fff"),color:active?tb.color:textC2,fontSize:13,cursor:"pointer",fontWeight:800,boxShadow:active?"0 4px 14px rgba(127,119,221,0.16)":"none"}}><div>{tb.label}</div><div style={{fontSize:11,fontWeight:500,color:active?tb.color:subC2,marginTop:3}}>{tb.sub}</div></button>;})}
    </div>
    {aiTab==="consigli"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>{filteredAiAdvices.map(function(a){var pc=a.priority==="Alta"?"#E24B4A":a.priority==="Media"?"#EF9F27":"#1D9E75";return <div key={a.id} style={{background:cardBg2,borderRadius:14,border:"1px solid "+borderC2,padding:16}}><div style={{display:"flex",alignItems:"flex-start",gap:12}}><div style={{fontSize:24,width:34,textAlign:"center"}}>{a.icon}</div><div style={{flex:1}}><div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap",marginBottom:5}}><div style={{fontSize:15,fontWeight:800,color:textC2}}>{a.title}</div><span style={{fontSize:10,fontWeight:700,color:pc,background:pc+"22",borderRadius:10,padding:"2px 7px"}}>{L(a.priority)}</span>{a.savingMonthly>0&&<span style={{fontSize:10,fontWeight:700,color:"#1D9E75",background:"#1D9E7522",borderRadius:10,padding:"2px 7px"}}>+{fmt(a.savingMonthly)}/{L("mese")}</span>}</div><div style={{fontSize:13,color:subC2,lineHeight:1.5,whiteSpace:"pre-line"}}>{a.text}</div><div style={{fontSize:13,color:textC2,fontWeight:600,marginTop:8}}>{a.question}</div><div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><Btn onClick={function(){askAI(a.title);}} bg="#7F77DD" style={{padding:"7px 12px",fontSize:12}}>{L("Analizza")}</Btn>{a.id!=="ai-empty"&&<Btn onClick={function(){dismissAdvice(a.id);}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#555"} style={{padding:"7px 12px",fontSize:12}}>{L("Non mostrare più")}</Btn>}</div></div></div></div>;})}</div>}
    {aiTab==="chat"&&<div ref={aiChatSectionRef} style={{background:cardBg2,borderRadius:14,border:"1px solid "+borderC2,padding:12,display:"flex",flexDirection:"column",minHeight:520}}><div style={{height:420,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:12,paddingRight:2}}>{aiChat.length===0&&<><div style={{fontSize:12,color:subC2,background:dark?"#1e1e30":"#f4f1ff",border:"1px solid "+(dark?"#3a3a5a":"#d8d1ff"),borderRadius:12,padding:"9px 11px"}}>{expenses.length+incomes.length===0?L("Per darti consigli davvero utili, ho bisogno di qualche movimento registrato. Puoi comunque farmi domande generali sulla gestione delle tue finanze e sulle funzioni dell’app."):L("Puoi chiedere analisi, consigli e chiarimenti solo su fAInance e sui dati gestiti nell’app.")} {L("Livello dati attivo")}: {aiAccessLabel}.</div><div style={{fontSize:13,color:subC2,textAlign:"center",padding:"34px 0"}}>{L("Esempi: “Come posso risparmiare questo mese?”, “Quali categorie pesano di più?”, “Analizza i miei abbonamenti”, “Perché non vedo gli alert?”")}</div></>}{aiChat.map(function(m){var mine=m.role==="user";return <div key={m.id} style={{alignSelf:mine?"flex-end":"flex-start",maxWidth:"84%",background:mine?"#7F77DD":(dark?"#252535":"#f5f5f5"),color:mine?"#fff":textC2,borderRadius:14,padding:"10px 12px",fontSize:13,whiteSpace:"pre-line",lineHeight:1.45}}>{m.text}</div>;})}{aiLoading&&<div style={{alignSelf:"flex-start",background:dark?"#252535":"#f5f5f5",color:subC2,borderRadius:14,padding:"10px 12px",fontSize:13}}>{L("Sto analizzando...")}</div>}</div><div style={{display:"flex",gap:8}}><button type="button" onClick={function(){if(openVoiceModal)openVoiceModal(true);else setVoiceModal(true);}} title={L("Apri assistente vocale")} style={{width:42,height:42,borderRadius:"50%",border:"none",background:"linear-gradient(135deg,#1D9E75,#378ADD)",color:"#fff",fontSize:18,cursor:"pointer",flexShrink:0}}>🎙️</button><input ref={chatInputRef} disabled={aiLoading} onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();sendChat();}}} placeholder={L("Scrivi una domanda su fAInance...")} style={{...sinp,flex:1,opacity:aiLoading?0.7:1}}/><Btn onClick={sendChat} disabled={aiLoading} bg="#7F77DD">{aiLoading?"...":L("Invia")}</Btn></div></div>}

    {aiConsentPrompt&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.58)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 16px 2vh",boxSizing:"border-box",overflowY:"auto"}}>
      <div style={{width:"100%",maxWidth:560,background:cardBg2,border:"1px solid "+borderC2,borderRadius:22,boxShadow:"0 18px 60px rgba(0,0,0,.34)",padding:18}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}><AIGrilloIcon size={42}/><div><div style={{fontSize:17,fontWeight:950,color:textC2}}>{L("Consenso per l’uso dell’Agente AI esterno")}</div><div style={{fontSize:12,color:subC2,marginTop:3}}>{L("Prima di inviare dati al servizio AI esterno devi autorizzare il trattamento.")}</div></div></div>
        <div style={{fontSize:13,color:textC2,lineHeight:1.5,display:"flex",flexDirection:"column",gap:10}}>
          <div>{L("Per generare le risposte del Consulente AI, fAInance invia alcuni dati a servizi esterni di intelligenza artificiale.")}</div>
          <div><b>{L("Dati inviati")}:</b><br/>• {L("la domanda che scrivi nella chat")}<br/>• {L("la lingua selezionata e il livello di analisi scelto")}<br/>• {L("riepiloghi finanziari, budget, categorie, ricorrenze e dati aggregati")}<br/>• {L("solo con Analisi completa, anche transazioni essenziali: data, importo, categoria o tipo e descrizione")}</div>
          <div><b>{L("Destinatari")}:</b><br/>• {L("backend sicuro fAInance")}<br/>• OpenAI</div>
          <div style={{color:subC2}}>{L("Non vengono inviati CVV, dati biometrici, password, documenti caricati, immagini, fidelity card o dati completi delle carte di credito.")}</div>
          <div>{L("Puoi non accettare e continuare a usare l’app senza inviare dati all’Agente AI esterno.")}</div>
        </div>
        <div style={{display:"flex",gap:10,marginTop:16,flexDirection:isMobile?"column":"row"}}>
          <button onClick={acceptAIExternalConsent} style={{flex:1,border:"none",borderRadius:btnRadius,padding:"12px 14px",background:"linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#7FC8F8))",color:"#fff",fontSize:14,fontWeight:900,cursor:"pointer"}}>{L("Accetto e continuo")}</button>
          <button onClick={declineAIExternalConsent} style={{flex:1,border:"1px solid "+borderC2,borderRadius:btnRadius,padding:"12px 14px",background:dark?"#252535":"#fff",color:subC2,fontSize:14,fontWeight:900,cursor:"pointer"}}>{L("Non accetto")}</button>
        </div>
      </div>
    </div>}
  </div>;
}

export function normalizeVoiceText(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/€(\d+)[,\.](\d{1,2})/g,"$1.$2 euro ").replace(/(\d+)[,\.](\d{1,2})€/g,"$1.$2 euro ").replace(/(\d+)€(\d{1,2})/g,"$1.$2 euro ").replace(/€(\d+)/g,"$1 euro ").replace(/(\d+)€/g,"$1 euro ").replace(/€/g," euro ").replace(/[^0-9a-zA-Z\u00C0-\u024F\u0370-\u03FF\s,.]/g," ").replace(/\s+/g," ").trim();}
export function escapeVoiceRegex(v){return String(v||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
var VOICE_LANGS={it:"it-IT",en:"en-US",es:"es-ES",fr:"fr-FR",de:"de-DE",pt:"pt-PT",pl:"pl-PL",nl:"nl-NL",ro:"ro-RO",el:"el-GR"};
var VOICE_JOINERS=["e","ed","and","y","con","et","und","mit","com","i","z","en","si","și","και","me","de","di","del","da","of","van","cent","cents","centimo","centimos","centesimo","centesimi","centime","centimes","centavo","centavos","grosz","grosze","groszy","centi","lei","ban","bani","λεπτα","λεπτο","euro","euros","eur"];
var VOICE_NUMBERS={
'zero':0,'zer0':0,'μηδεν':0,'uno':1,'una':1,'un':1,'one':1,'a':1,'ein':1,'eine':1,'einen':1,'uno_es':1,'um':1,'uma':1,'jeden':1,'jedna':1,'jedno':1,'een':1,'unu':1,'una_ro':1,'ένα':1,'ενα':1,'μια':1,'μία':1,'due':2,'two':2,'dos':2,'deux':2,'zwei':2,'dois':2,'duas':2,'dwa':2,'dwie':2,'twee':2,'doi':2,'doua':2,'două':2,'δυο':2,'δύο':2,'δυο_gr':2,'tre':3,'three':3,'tres':3,'trois':3,'drei':3,'três':3,'tres_pt':3,'trzy':3,'drie':3,'trei':3,'τρια':3,'τρία':3,'quattro':4,'four':4,'cuatro':4,'quatre':4,'vier':4,'quatro':4,'cztery':4,'patru':4,'τεσσερα':4,'τέσσερα':4,'cinque':5,'five':5,'cinco':5,'cinq':5,'fünf':5,'funf':5,'pięć':5,'piec':5,'vijf':5,'cinci':5,'πεντε':5,'πέντε':5,'sei':6,'six':6,'seis':6,'sechs':6,'sześć':6,'szesc':6,'zes':6,'sase':6,'șase':6,'έξι':6,'εξι':6,'sette':7,'seven':7,'siete':7,'sept':7,'sieben':7,'sete':7,'siedem':7,'zeven':7,'sapte':7,'șapte':7,'επτα':7,'επτά':7,'otto':8,'eight':8,'ocho':8,'huit':8,'acht':8,'oito':8,'osiem':8,'opt':8,'οκτω':8,'οκτώ':8,'nove':9,'nine':9,'nueve':9,'neuf':9,'neun':9,'nove_pt':9,'dziewięć':9,'dziewiec':9,'negen':9,'noua':9,'nouă':9,'εννεα':9,'εννέα':9,'dieci':10,'ten':10,'diez':10,'dix':10,'zehn':10,'dez':10,'dziesięć':10,'dziesiec':10,'tien':10,'zece':10,'δεκα':10,'δέκα':10,'undici':11,'eleven':11,'once':11,'onze':11,'elf':11,'jedenaście':11,'jedenascie':11,'unsprezece':11,'εντεκα':11,'έντεκα':11,'dodici':12,'twelve':12,'doce':12,'douze':12,'zwolf':12,'zwölf':12,'dwanaście':12,'dwanascie':12,'twaalf':12,'doisprezece':12,'douasprezece':12,'δωδεκα':12,'δώδεκα':12,'tredici':13,'thirteen':13,'trece':13,'treize':13,'dreizehn':13,'treze':13,'trzynaście':13,'trzynascie':13,'dertien':13,'treisprezece':13,'quattordici':14,'fourteen':14,'catorce':14,'quatorze':14,'vierzehn':14,'catorze':14,'czternaście':14,'czternascie':14,'veertien':14,'paisprezece':14,'quindici':15,'fifteen':15,'quince':15,'quinze':15,'fünfzehn':15,'funfzehn':15,'quinze_pt':15,'piętnaście':15,'pietnascie':15,'vijftien':15,'cincisprezece':15,'sedici':16,'sixteen':16,'dieciseis':16,'seize':16,'sechzehn':16,'dezesseis':16,'szesnaście':16,'szesnascie':16,'zestien':16,'saisprezece':16,'șaisprezece':16,'diciassette':17,'seventeen':17,'diecisiete':17,'dix_sept':17,'dixsept':17,'siebzehn':17,'dezessete':17,'siedemnaście':17,'siedemnascie':17,'zeventien':17,'saptesprezece':17,'șaptesprezece':17,'diciotto':18,'eighteen':18,'dieciocho':18,'dix_huit':18,'dixhuit':18,'achtzehn':18,'dezoito':18,'osiemnaście':18,'osiemnascie':18,'achttien':18,'optsprezece':18,'diciannove':19,'nineteen':19,'diecinueve':19,'dix_neuf':19,'dixneuf':19,'neunzehn':19,'dezenove':19,'dziewiętnaście':19,'dziewietnascie':19,'negentien':19,'nouasprezece':19,'venti':20,'twenty':20,'veinte':20,'vingt':20,'zwanzig':20,'vinte':20,'dwadzieścia':20,'dwadziescia':20,'twintig':20,'douazeci':20,'είκοσι':20,'εικοσι':20,'trenta':30,'thirty':30,'treinta':30,'trente':30,'dreissig':30,'dreißig':30,'trinta':30,'trzydzieści':30,'trzydziesci':30,'dertig':30,'treizeci':30,'τριαντα':30,'τριάντα':30,'quaranta':40,'forty':40,'cuarenta':40,'quarante':40,'vierzig':40,'quarenta':40,'czterdzieści':40,'czterdziesci':40,'veertig':40,'patruzeci':40,'σαραντα':40,'σαράντα':40,'cinquanta':50,'fifty':50,'cincuenta':50,'cinquante':50,'fünfzig':50,'funfzig':50,'cinquenta':50,'pięćdziesiąt':50,'piecdziesiat':50,'vijftig':50,'cincizeci':50,'πενηντα':50,'πενήντα':50,'sessanta':60,'sixty':60,'sesenta':60,'soixante':60,'sechzig':60,'sessenta':60,'sześćdziesiąt':60,'szescdziesiat':60,'zestig':60,'saizeci':60,'εξηντα':60,'εξήντα':60,'settanta':70,'seventy':70,'setenta':70,'soixante_dix':70,'siebzig':70,'setenta_pt':70,'siedemdziesiąt':70,'siedemdziesiat':70,'zeventig':70,'saptezeci':70,'εβδομηντα':70,'εβδομήντα':70,'ottanta':80,'eighty':80,'ochenta':80,'quatre_vingts':80,'quatrevingts':80,'achtzig':80,'oitenta':80,'osiemdziesiąt':80,'osiemdziesiat':80,'tachtig':80,'optzeci':80,'ογδοντα':80,'ογδόντα':80,'novanta':90,'ninety':90,'noventa':90,'quatre_vingt_dix':90,'quatrevingtdix':90,'neunzig':90,'noventa_pt':90,'dziewięćdziesiąt':90,'dziewiecdziesiat':90,'negentig':90,'nouazeci':90,'ενενηντα':90,'ενενήντα':90
};
export function normalizeVoiceNumberToken(v){return normalizeVoiceText(v).replace(/-/g,"_").replace(/\s+/g,"_");}
export function voiceNumberToInt(v){return voiceNumberPhraseValue(v);}
export function voiceNumberPhraseValue(v){
  var s=normalizeVoiceText(v).replace(/-/g," ").trim();
  if(!s)return 0;
  if(/^\d+$/.test(s))return parseInt(s,10);
  var key=normalizeVoiceNumberToken(s);
  if(VOICE_NUMBERS[key]!==undefined)return VOICE_NUMBERS[key];
  var tokens=s.split(/\s+/).filter(function(x){return x&&!VOICE_JOINERS.includes(x);});
  var total=0,current=0;
  for(var i=0;i<tokens.length;i++){
    var tk=tokens[i], nk=normalizeVoiceNumberToken(tk);
    if(VOICE_NUMBERS[nk]!==undefined){current+=VOICE_NUMBERS[nk];continue;}
    if(["hundred","cento","cien","ciento","cent","hundert","cem","sto","honderd","suta","sută","εκατο"].includes(nk)){current=(current||1)*100;continue;}
    if(["thousand","mille","mil","tausend","tysiac","tysiąc","duizend","mie","χιλια"].includes(nk)){total+=(current||1)*1000;current=0;continue;}
  }
  return total+current;
}
export function allVoiceNumberWords(){return Object.keys(VOICE_NUMBERS).map(function(k){return k.replace(/_/g," ");}).sort(function(a,b){return b.length-a.length;});}
export function firstVoiceNumberFromText(v){
  var s=normalizeVoiceText(v), m=s.match(/\b(\d{1,4})\b/); if(m)return parseInt(m[1],10);
  var words=allVoiceNumberWords();
  for(var i=0;i<words.length;i++){if(new RegExp("\\b"+escapeVoiceRegex(words[i])+"\\b","i").test(s))return voiceNumberPhraseValue(words[i]);}
  return 0;
}
export function parseVoiceAmount(n){
  var s=normalizeVoiceText(n);
  // Corregge trascrizioni tipiche del riconoscimento vocale: "4 4 euro" => "44 euro".
  // Il bug visto nello screenshot nasceva proprio da questo caso: 44 veniva letto come 4,04.
  for(var mergePass=0;mergePass<3;mergePass++){
    s=s.replace(/\b(\d)\s+(\d)(?=\s*(?:euros|euro|eur)\b)/g,"$1$2");
    s=s.replace(/\b(\d)\s+(\d)(?=\s+(?:con|e|ed|and|y|cent|cents|centesimi|centimos)\b)/g,"$1$2");
  }
  var decimalMatch=s.match(/\b(\d{1,6})[\.,](\d{1,2})\b/);
  if(decimalMatch)return parseFloat(decimalMatch[1]+"."+decimalMatch[2].padEnd(2,"0"));
  var connectors="con|y|e|ed|and|et|und|mit|com|i|z|en|si|și|και|me";
  var centWords="cent|cents|centimo|centimos|centesimo|centesimi|centime|centimes|centavo|centavos|grosz|grosze|groszy|lei|ban|bani|λεπτα|λεπτο";
  var explicitEuroCents=s.match(new RegExp("\\b(\\d{1,6})\\s*(?:euros|euro|eur)\\s*(?:(?:"+connectors+")\\s*)?(\\d{1,2})\\s*(?:"+centWords+")?\\b","i"));
  if(explicitEuroCents){var ew=parseInt(explicitEuroCents[1],10),ec=parseInt(explicitEuroCents[2],10);if(!isNaN(ew)&&!isNaN(ec)&&ec>=0&&ec<100)return ew+(ec/100);}
  var numericEuro=s.match(/\b(\d{1,6})\s*(?:euros|euro|eur)\b/);
  if(numericEuro)return parseFloat(numericEuro[1]);
  var numericWithCents=s.match(new RegExp("\\b(\\d{1,6})\\s+(?:(?:"+connectors+")\\s+)(\\d{1,2})\\s*(?:"+centWords+")?\\b","i"));
  if(numericWithCents){var nw=parseInt(numericWithCents[1],10),nc=parseInt(numericWithCents[2],10);if(!isNaN(nw)&&!isNaN(nc)&&nc>=0&&nc<100)return nw+(nc/100);}
  var numericWithExplicitCent=s.match(new RegExp("\\b(\\d{1,6})\\s+(\\d{1,2})\\s*(?:"+centWords+")\\b","i"));
  if(numericWithExplicitCent){var cw=parseInt(numericWithExplicitCent[1],10),cc=parseInt(numericWithExplicitCent[2],10);if(!isNaN(cw)&&!isNaN(cc)&&cc>=0&&cc<100)return cw+(cc/100);}
  var wordList=allVoiceNumberWords().map(escapeVoiceRegex).join("|");
  var wordSeq="(?:"+wordList+")(?:\\s+(?:(?:"+connectors+")\\s+)?(?:"+wordList+")){0,4}";
  var wordEuro=new RegExp("\\b("+wordSeq+")\\s*(?:euros|euro|eur)\\b(?:\\s*(?:(?:"+connectors+")\\s*)?("+wordSeq+"|\\d{1,2})(?:\\s*(?:"+centWords+"))?)?","i");
  var wm=s.match(wordEuro);
  if(wm){var whole=voiceNumberPhraseValue(wm[1]);var cents=0;if(wm[2]){cents=/^\d+$/.test(wm[2].trim())?parseInt(wm[2].trim(),10):voiceNumberPhraseValue(wm[2]);if(cents>99)cents=0;}return whole+(cents>0?cents/100:0);}
  var wordWithCentsNoEuro=new RegExp("\\b("+wordSeq+")\\s+(?:"+connectors+")\\s+("+wordSeq+"|\\d{1,2})\\b","i");
  var wcn=s.match(wordWithCentsNoEuro);
  if(wcn){var whole2=voiceNumberPhraseValue(wcn[1]);var cents2=/^\d+$/.test(wcn[2].trim())?parseInt(wcn[2].trim(),10):voiceNumberPhraseValue(wcn[2]);if(whole2>0&&cents2>=0&&cents2<100)return whole2+(cents2/100);}
  var genericNumber=s.match(/\b(\d{1,6})\b/); if(genericNumber)return parseFloat(genericNumber[1]);
  var anyWord=s.match(new RegExp("\\b("+wordSeq+")\\b","i")); return anyWord?voiceNumberPhraseValue(anyWord[1]):0;
}
export function findByVoiceName(list,text){var nt=normalizeVoiceText(text);var found=null;(list||[]).forEach(function(item){var nn=normalizeVoiceText(item.name||"");if(nn&&new RegExp("\\b"+escapeVoiceRegex(nn)+"\\b","i").test(nt)){if(!found||nn.length>normalizeVoiceText(found.name||"").length)found=item;}});return found;}
export function voiceContainsAny(n,words){return words.some(function(w){return new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(w))+"\\b","i").test(n);});}
export function scoreVoiceCategory(c,n,rule){var cn=normalizeVoiceText(c&&c.name||"");var score=0;if(rule.names.some(function(name){var nn=normalizeVoiceText(name);return cn===nn;}))score+=100;if(rule.names.some(function(name){var nn=normalizeVoiceText(name);return cn.indexOf(nn)>=0||nn.indexOf(cn)>=0;}))score+=55;if(rule.area&&normalizeVoiceText(c.group||"")===normalizeVoiceText(rule.area))score+=18;if(rule.avoid&&rule.avoid.some(function(a){return cn.indexOf(normalizeVoiceText(a))>=0;}))score-=80;if(rule.words.some(function(w){return cn.indexOf(normalizeVoiceText(w))>=0;}))score+=12;return score;}
export function cleanVoiceDescription(txt,kind,cat,method,incomeType){
  var raw=String(txt||""), n=normalizeVoiceText(raw);function title(v){return String(v||"").trim().replace(/\s+/g," ").replace(/^./,function(ch){return ch.toUpperCase();});}
  var semantic=[{desc:"Supermercato",words:["supermercato","supermarket","supermercado","supermarche","supermarkt","sklep","alimentari","groceries","compra","compras","zakupy","boodschappen"]},{desc:"Pizze",words:["pizze","pizzas"]},{desc:"Pizza",words:["pizza","pizzeria"]},{desc:"Ristorante",words:["ristorante","restaurant","restaurante","restauracja","cena","pranzo","dinner","lunch","sushi","kebab","hamburger"]},{desc:"Bar",words:["bar","caffe","cafe","coffee","cappuccino"]},{desc:"Caramelle",words:["caramella","caramelle","candy","candies"]},{desc:"Carburante",words:["benzina","diesel","gasolio","carburante","fuel","gasolina","paliwo"]},{desc:"Farmacia",words:["farmacia","pharmacy","pharmacie","apotheke","apteka"]},{desc:"Stipendio",words:["stipendio","salario","salary","payroll","sueldo"]},{desc:"Latte",words:["latte","milk","lait","milch","mleko","melk","lapte"]},{desc:"Pane",words:["pane","bread","pain","brot","chleb","brood"]},{desc:"Caffè",words:["caffe","espresso","cappuccino","macchiato"]},{desc:"Abbonamento",words:["abbonamento","subscription","abonnement","abonnement","abonnierung"]},{desc:"Affitto",words:["affitto","rent","loyer","miete","czynsz","huur"]},{desc:"Mutuo",words:["mutuo","mortgage","hypotheque","hypothek","hipoteka"]},{desc:"Assicurazione",words:["assicurazione","insurance","assurance","versicherung","ubezpieczenie"]},{desc:"Bolletta",words:["bolletta","bollette","utenza","luce","gas","acqua","electricity","internet"]},{desc:"Taxi",words:["taxi","uber","cab","cabify"]},{desc:"Palestra",words:["palestra","gym","fitness","salle"]},{desc:"Cinema",words:["cinema","film","movie","teatro","theatre"]},{desc:"Aereo",words:["aereo","volo","flight","avion","flug"]},{desc:"Hotel",words:["hotel","albergo","ostello","motel","hostel"]},{desc:"Treno",words:["treno","train","zug","pociag"]},{desc:"Medicine",words:["medicina","medicine","farmaco","pillola","compressa","aspirina","antibiotico"]}];
  // Find ALL semantic matches in order of appearance in the string
  var firstSemanticIdx=9999, firstSemanticDesc=null;
  for(var i=0;i<semantic.length;i++){for(var j=0;j<semantic[i].words.length;j++){var ww=semantic[i].words[j];var wm=n.search(new RegExp("\\b"+escapeVoiceRegex(ww)+"\\b"));if(wm>=0&&wm<firstSemanticIdx){firstSemanticIdx=wm;firstSemanticDesc=semantic[i].desc;}}}
  // Strip noise words to find the "real" description
  var s=n;
  ["aggiungi","aggiungere","anadir","add","ajouter","hinzufugen","adicionar","dodaj","voeg","adauga","una","un","uscita","uscite","spesa","spese","expense","expenses","gasto","gastos","depense","despesa","ausgabe","wydatek","uitgave","cheltuiala","entrata","entrate","income","ingreso","ingresos","revenu","receita","einnahme","przychod","inkomst","venit","ho","hai","pagato","pagata","pagati","pagate","paid","paye","bezahlt","speso","spesa","spesi","spese","ricevuto","ricevuta","ricevuti","ricevute","received","carta","credito","debito","contanti","cash","bancomat","paypal","satispay","bonifico","pagamento","metodo","assegno","transfer","wire","card","debit","credit","ho","hai","abbiamo","avete","hanno","di","da","per","con","in","il","la","lo","le","gli","al","allo","alla","alle","ai","del","della","delle","dei","euro","eur","euros","cent","centesimi","centesimo","centavo","oggi","hoy","today","aujourd","hui","heute","hoje","dzis","vandaag","azi","ieri","ayer","yesterday","hier","gestern","ontem","wczoraj","gisteren","fa","hace","ago","vor","dias","dia","giorni","giorno","days","day","tage","mois","mesi","months","meses","rateizza","rateizzata","split","dividi","ricorrente","mensile","mese","tre","due","uno","uno","una","quattro","cinque","sei","sette","otto","nove","dieci","venti","trenta","forty","fifty","three","two","four","five","six","seven","eight","nine","ten"].forEach(function(w){s=s.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(w))+"\\b","ig")," ");});
  s=s.replace(/\d+(?:[.,]\d+)?/g," ");
  if(cat&&cat.name)s=s.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(cat.name))+"\\b","ig")," ");
  if(method&&method.name)s=s.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(method.name))+"\\b","ig")," ");
  s=s.replace(/\s+/g," ").trim();
  // Prefer non-noise words as description (more specific than category name)
  if(s)return title(s);
  // Fall back to semantic match
  if(firstSemanticDesc)return firstSemanticDesc;
  if(kind==="income"&&incomeType&&incomeType.name)return incomeType.name;
  if(cat&&cat.name)return cat.name;
  return kind==="income"?"Entrata":"Spesa";
}

export function parseVoiceDate(n){
  var date=todayStr();
  if(/\b(ieri|ayer|yesterday|hier|gestern|ontem|wczoraj|gisteren|ieri|χθες)\b/.test(n))return dateOffset(1);
  if(/\b(avantieri|altro ieri|anteayer|day before yesterday|vorgestern|anteontem|przedwczoraj|eergisteren|alaltaieri|προχθες)\b/.test(n))return dateOffset(2);
  var dayWords="giorni|giorno|days|day|dias|dia|jours|jour|tage|tag|dias|dzien|dni|dagen|zi|ημερες|ημερα";
  var numericDays=n.match(new RegExp("\\b(?:hace|il y a|vor|ha|há|temu|acum)?\\s*(\\d{1,2})\\s*(?:"+dayWords+")\\s*(?:fa|ago|temu)?\\b","i"));
  var wordList=allVoiceNumberWords().map(escapeVoiceRegex).join("|");
  var wordDays=n.match(new RegExp("\\b(?:hace|il y a|vor|ha|há|temu|acum)?\\s*("+wordList+")\\s*(?:"+dayWords+")\\s*(?:fa|ago|temu)?\\b","i"));
  var days=numericDays?parseInt(numericDays[1],10):(wordDays?voiceNumberToInt(wordDays[1]):0); if(days>0)return dateOffset(days);
  return date;
}
export function parseVoiceRate(n){
  var hasRateWord=/\b(rateizza|rateizzare|rateizzata|rateizzato|dividi|divisa|diviso|split|amort|riparti|distribuisci|spalma|reparte|dividir|dividido|mensual|mensile|monthly|monatlich|mensuel|mensal|rata|installment|instalment|parcelar|raty|rate)\b/.test(n);
  var hasRecurringWord=/\b(ricorrente|ricorrenti|recurring|mensile|mensili|ogni mese|every month|cada mes|chaque mois|jeden monat|todo mes|co miesiac|elke maand|lunar)\b/.test(n);
  var rateMatch=n.match(/(?:rateizz\w*|dividi|divisa|diviso|split|amort|riparti|distribuisci|spalma|reparte|dividir|dividido|parcelar|raty|rate)[^0-9]{0,30}(\d{1,2})/)||n.match(/(\d{1,2})\s*(?:mesi|months|meses|mois|monate|meses|miesiecy|maanden|luni)\b/);
  var rate=rateMatch?Math.max(2,Math.min(60,parseInt(rateMatch[1],10))):12; return{rateizzato:!!(rateMatch||hasRateWord||hasRecurringWord),rate:rate};
}
export function voiceUiText(code){var dict={
  it:{title:"Aggiunta vocale",sub:"Spese o entrate con anteprima obbligatoria",listening:"Sto ascoltando...",retry:"🎙️ Riprova ascolto",hint:"La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.",examples:"Esempi: “Aggiungi uscita 12 euro supermercato oggi”, “Aggiungi entrata 1500 euro stipendio”, “Spesa 240 euro assicurazione rateizzata in 12 mesi”.",placeholder:"Oppure scrivi qui il comando vocale...",analyze:"Analizza comando",cancel:"Annulla",save:"Salva",exp:"Uscita",inc:"Entrata",recognized:" riconosciuta",amount:"Importo",date:"Data",cat:"Categoria",method:"Metodo",type:"Tipo",desc:"Descrizione",inst:"Rateizzazione",no:"No",months:"mesi",invalid:"Non ho trovato un importo valido. Esempio: Aggiungi uscita 12 euro supermercato oggi",savedExp:"Uscita aggiunta con la voce",savedInc:"Entrata aggiunta con la voce",speak:"Parla ora"},
  en:{title:"Voice entry",sub:"Expenses or income with mandatory preview",listening:"Listening...",retry:"🎙️ Retry listening",hint:"Recording starts automatically when you open this screen. Use the button only to retry.",examples:"Examples: “Add expense 12 euro supermarket today”, “Add income 1500 euro salary”, “Expense 240 euro insurance split over 12 months”.",placeholder:"Or type the voice command here...",analyze:"Analyze command",cancel:"Cancel",save:"Save",exp:"Expense",inc:"Income",recognized:" recognized",amount:"Amount",date:"Date",cat:"Category",method:"Method",type:"Type",desc:"Description",inst:"Instalment",no:"No",months:"months",invalid:"I did not find a valid amount. Example: Add expense 12 euro supermarket today",savedExp:"Expense added by voice",savedInc:"Income added by voice",speak:"Speak now"},
  es:{title:"Añadido por voz",sub:"Gastos o ingresos con vista previa obligatoria",listening:"Estoy escuchando...",retry:"🎙️ Reintentar escucha",hint:"La grabación empieza automáticamente al abrir esta pantalla. Usa el botón solo si quieres intentarlo de nuevo.",examples:"Ejemplos: “Añadir gasto 12 euro supermercado hoy”, “Añadir ingreso 1500 euro salario”, “Gasto 240 euro seguro dividido en 12 meses”.",placeholder:"O escribe aquí el comando de voz...",analyze:"Analizar comando",cancel:"Cancelar",save:"Guardar",exp:"Gasto",inc:"Ingreso",recognized:" reconocido",amount:"Importe",date:"Fecha",cat:"Categoría",method:"Método",type:"Tipo",desc:"Descripción",inst:"División",no:"No",months:"meses",invalid:"No he encontrado un importe válido. Ejemplo: Añadir gasto 12 euro supermercado hoy",savedExp:"Gasto añadido por voz",savedInc:"Ingreso añadido por voz",speak:"Habla ahora"},
  fr:{title:"Ajout vocal",sub:"Dépenses ou revenus avec aperçu obligatoire",listening:"J’écoute...",retry:"🎙️ Réessayer l’écoute",hint:"L’enregistrement démarre automatiquement à l’ouverture de cet écran. Utilisez le bouton seulement pour réessayer.",examples:"Exemples : “Ajouter dépense 12 euro supermarché aujourd’hui”, “Ajouter revenu 1500 euro salaire”, “Dépense 240 euro assurance répartie sur 12 mois”.",placeholder:"Ou écrivez ici la commande vocale...",analyze:"Analyser la commande",cancel:"Annuler",save:"Enregistrer",exp:"Dépense",inc:"Revenu",recognized:" reconnu",amount:"Montant",date:"Date",cat:"Catégorie",method:"Méthode",type:"Type",desc:"Description",inst:"Échelonnement",no:"Non",months:"mois",invalid:"Je n’ai pas trouvé de montant valide. Exemple : Ajouter dépense 12 euro supermarché aujourd’hui",savedExp:"Dépense ajoutée par la voix",savedInc:"Revenu ajouté par la voix",speak:"Parlez maintenant"},
  de:{title:"Spracheingabe",sub:"Ausgaben oder Einnahmen mit Pflichtvorschau",listening:"Ich höre zu...",retry:"🎙️ Erneut anhören",hint:"Die Aufnahme startet automatisch beim Öffnen dieses Bildschirms. Verwende die Taste nur zum Wiederholen.",examples:"Beispiele: „Ausgabe 12 Euro Supermarkt heute hinzufügen“, „Einnahme 1500 Euro Gehalt hinzufügen“, „Ausgabe 240 Euro Versicherung auf 12 Monate aufteilen“.",placeholder:"Oder Sprachbefehl hier eingeben...",analyze:"Befehl analysieren",cancel:"Abbrechen",save:"Speichern",exp:"Ausgabe",inc:"Einnahme",recognized:" erkannt",amount:"Betrag",date:"Datum",cat:"Kategorie",method:"Methode",type:"Typ",desc:"Beschreibung",inst:"Ratenaufteilung",no:"Nein",months:"Monate",invalid:"Ich habe keinen gültigen Betrag gefunden. Beispiel: Ausgabe 12 Euro Supermarkt heute hinzufügen",savedExp:"Ausgabe per Sprache hinzugefügt",savedInc:"Einnahme per Sprache hinzugefügt",speak:"Jetzt sprechen"},
  pt:{title:"Entrada por voz",sub:"Despesas ou receitas com pré-visualização obrigatória",listening:"A ouvir...",retry:"🎙️ Tentar ouvir novamente",hint:"A gravação começa automaticamente ao abrir este ecrã. Use o botão apenas para tentar novamente.",examples:"Exemplos: “Adicionar despesa 12 euro supermercado hoje”, “Adicionar receita 1500 euro salário”, “Despesa 240 euro seguro dividido em 12 meses”.",placeholder:"Ou escreva aqui o comando de voz...",analyze:"Analisar comando",cancel:"Cancelar",save:"Guardar",exp:"Despesa",inc:"Receita",recognized:" reconhecida",amount:"Valor",date:"Data",cat:"Categoria",method:"Método",type:"Tipo",desc:"Descrição",inst:"Parcelamento",no:"Não",months:"meses",invalid:"Não encontrei um valor válido. Exemplo: Adicionar despesa 12 euro supermercado hoje",savedExp:"Despesa adicionada por voz",savedInc:"Receita adicionada por voz",speak:"Fale agora"},
  pl:{title:"Dodawanie głosowe",sub:"Wydatki lub przychody z obowiązkowym podglądem",listening:"Słucham...",retry:"🎙️ Spróbuj ponownie",hint:"Nagrywanie zaczyna się automatycznie po otwarciu tego ekranu. Użyj przycisku tylko, aby spróbować ponownie.",examples:"Przykłady: „Dodaj wydatek 12 euro supermarket dziś”, „Dodaj przychód 1500 euro pensja”, „Wydatek 240 euro ubezpieczenie podzielone na 12 miesięcy”.",placeholder:"Albo wpisz tutaj polecenie głosowe...",analyze:"Analizuj polecenie",cancel:"Anuluj",save:"Zapisz",exp:"Wydatek",inc:"Przychód",recognized:" rozpoznany",amount:"Kwota",date:"Data",cat:"Kategoria",method:"Metoda",type:"Typ",desc:"Opis",inst:"Raty",no:"Nie",months:"miesięcy",invalid:"Nie znaleziono prawidłowej kwoty. Przykład: Dodaj wydatek 12 euro supermarket dziś",savedExp:"Wydatek dodany głosowo",savedInc:"Przychód dodany głosowo",speak:"Mów teraz"},
  nl:{title:"Spraakinvoer",sub:"Uitgaven of inkomsten met verplichte preview",listening:"Ik luister...",retry:"🎙️ Opnieuw luisteren",hint:"De opname start automatisch wanneer je dit scherm opent. Gebruik de knop alleen om opnieuw te proberen.",examples:"Voorbeelden: “Voeg uitgave 12 euro supermarkt vandaag toe”, “Voeg inkomen 1500 euro salaris toe”, “Uitgave 240 euro verzekering verdeeld over 12 maanden”.",placeholder:"Of typ hier de spraakopdracht...",analyze:"Opdracht analyseren",cancel:"Annuleren",save:"Opslaan",exp:"Uitgave",inc:"Inkomst",recognized:" herkend",amount:"Bedrag",date:"Datum",cat:"Categorie",method:"Methode",type:"Type",desc:"Beschrijving",inst:"Gespreid",no:"Nee",months:"maanden",invalid:"Geen geldig bedrag gevonden. Voorbeeld: Voeg uitgave 12 euro supermarkt vandaag toe",savedExp:"Uitgave via stem toegevoegd",savedInc:"Inkomst via stem toegevoegd",speak:"Spreek nu"},
  ro:{title:"Introducere vocală",sub:"Cheltuieli sau venituri cu previzualizare obligatorie",listening:"Ascult...",retry:"🎙️ Reîncearcă ascultarea",hint:"Înregistrarea pornește automat când deschizi acest ecran. Folosește butonul doar pentru a încerca din nou.",examples:"Exemple: „Adaugă cheltuială 12 euro supermarket azi”, „Adaugă venit 1500 euro salariu”, „Cheltuială 240 euro asigurare împărțită în 12 luni”.",placeholder:"Sau scrie aici comanda vocală...",analyze:"Analizează comanda",cancel:"Anulează",save:"Salvează",exp:"Cheltuială",inc:"Venit",recognized:" recunoscută",amount:"Sumă",date:"Dată",cat:"Categorie",method:"Metodă",type:"Tip",desc:"Descriere",inst:"Eșalonare",no:"Nu",months:"luni",invalid:"Nu am găsit o sumă validă. Exemplu: Adaugă cheltuială 12 euro supermarket azi",savedExp:"Cheltuială adăugată vocal",savedInc:"Venit adăugat vocal",speak:"Vorbește acum"},
  el:{title:"Φωνητική εισαγωγή",sub:"Έξοδα ή έσοδα με υποχρεωτική προεπισκόπηση",listening:"Ακούω...",retry:"🎙️ Δοκιμή ξανά",hint:"Η εγγραφή ξεκινά αυτόματα όταν ανοίγετε αυτή την οθόνη. Χρησιμοποιήστε το κουμπί μόνο για νέα προσπάθεια.",examples:"Παραδείγματα: “Προσθήκη εξόδου 12 ευρώ σούπερ μάρκετ σήμερα”, “Προσθήκη εσόδου 1500 ευρώ μισθός”, “Έξοδο 240 ευρώ ασφάλεια σε 12 μήνες”.",placeholder:"Ή γράψτε εδώ τη φωνητική εντολή...",analyze:"Ανάλυση εντολής",cancel:"Άκυρο",save:"Αποθήκευση",exp:"Έξοδο",inc:"Έσοδο",recognized:" αναγνωρίστηκε",amount:"Ποσό",date:"Ημερομηνία",cat:"Κατηγορία",method:"Μέθοδος",type:"Τύπος",desc:"Περιγραφή",inst:"Δόσεις",no:"Όχι",months:"μήνες",invalid:"Δεν βρήκα έγκυρο ποσό. Παράδειγμα: Προσθήκη εξόδου 12 ευρώ σούπερ μάρκετ σήμερα",savedExp:"Το έξοδο προστέθηκε φωνητικά",savedInc:"Το έσοδο προστέθηκε φωνητικά",speak:"Μιλήστε τώρα"}
};return dict[code]||dict.en;}
export function VoiceEntryModal(){
  var c:any=useApp();
  var currentPlan=String((c&&c.currentPlan)||"free");
  var quickRequested=false;
  try{quickRequested=localStorage.getItem("fainance_voice_quick_mode_once")==="1";localStorage.removeItem("fainance_voice_quick_mode_once");}catch(e){}
  var [mode,setMode]=useState((currentPlan==="base"||currentPlan==="premium")&&!quickRequested?"assistant":"quick");
  if(mode==="quick")return <QuickVoiceEntryModal/>;
  return <VoiceAssistantModal onQuick={function(){setMode("quick");}}/>;
}

function assistantVoiceUiText(code){var dict:any={
  it:{title:"Assistente vocale",sub:"Parla con fAInance, fai domande e chiedi di eseguire operazioni",listening:"Sto ascoltando...",speak:"Parla",stop:"Interrompi e parla",continuous:"Conversazione continua",placeholder:"Scrivi o pronuncia una richiesta...",send:"Invia",close:"Chiudi",quick:"Inserimento rapido",thinking:"Sto analizzando...",empty:"Parlami delle tue finanze, chiedimi qualsiasi argomento finanziario oppure dimmi di creare e modificare movimenti, ricorrenti, obiettivi, budget, alert, debiti, patrimonio, liste, appunti, Share e impostazioni dell’app.",confirm:"Operazione pronta",execute:"Esegui",cancel:"Annulla",consentTitle:"Autorizza l’assistente AI",consentText:"Per rispondere e interpretare le operazioni, fAInance invia a OpenAI la tua richiesta e i dati finanziari consentiti nelle impostazioni. Non vengono inviati password, dati biometrici o dati completi delle carte.",accept:"Accetto e continuo",cancelled:"Operazione annullata.",done:"Operazione completata.",unavailable:"Il riconoscimento vocale non è disponibile. Puoi comunque scrivere la richiesta.",error:"Non riesco a contattare l’assistente in questo momento."},
  en:{title:"Voice assistant",sub:"Talk to fAInance, ask questions and request actions",listening:"Listening...",speak:"Speak",stop:"Stop",continuous:"Continuous conversation",placeholder:"Type or say a request...",send:"Send",close:"Close",quick:"Quick entry",thinking:"Analysing...",empty:"Ask about your finances or the app, or tell me to add an expense, income, goal or shopping list.",confirm:"Action ready",execute:"Run",cancel:"Cancel",consentTitle:"Authorise the AI assistant",consentText:"To answer and interpret actions, fAInance sends OpenAI your request and the financial data allowed in settings. Passwords, biometric data and full card details are not sent.",accept:"Accept and continue",cancelled:"Action cancelled.",done:"Action completed.",unavailable:"Voice recognition is unavailable. You can still type your request.",error:"I cannot contact the assistant right now."},
  es:{title:"Asistente de voz",sub:"Habla con fAInance, haz preguntas y solicita acciones",listening:"Escuchando...",speak:"Hablar",stop:"Interrumpir",continuous:"Conversación continua",placeholder:"Escribe o di una solicitud...",send:"Enviar",close:"Cerrar",quick:"Entrada rápida",thinking:"Analizando...",empty:"Pregunta por tus finanzas o la app, o pide añadir un gasto, ingreso, objetivo o lista de la compra.",confirm:"Operación lista",execute:"Ejecutar",cancel:"Cancelar",consentTitle:"Autoriza el asistente de IA",consentText:"Para responder e interpretar operaciones, fAInance envía a OpenAI tu solicitud y los datos financieros permitidos en los ajustes. No se envían contraseñas, datos biométricos ni datos completos de tarjetas.",accept:"Acepto y continúo",cancelled:"Operación cancelada.",done:"Operación completada.",unavailable:"El reconocimiento de voz no está disponible. Puedes escribir la solicitud.",error:"No puedo contactar con el asistente ahora."},
  fr:{title:"Assistant vocal",sub:"Parlez à fAInance, posez des questions et demandez des actions",listening:"J’écoute...",speak:"Parler",stop:"Interrompre",continuous:"Conversation continue",placeholder:"Écrivez ou prononcez une demande...",send:"Envoyer",close:"Fermer",quick:"Saisie rapide",thinking:"Analyse en cours...",empty:"Posez une question sur vos finances ou l’app, ou demandez d’ajouter une dépense, un revenu, un objectif ou une liste de courses.",confirm:"Opération prête",execute:"Exécuter",cancel:"Annuler",consentTitle:"Autoriser l’assistant IA",consentText:"Pour répondre et interpréter les actions, fAInance envoie à OpenAI votre demande et les données financières autorisées dans les réglages. Les mots de passe, données biométriques et données complètes des cartes ne sont pas envoyés.",accept:"J’accepte et je continue",cancelled:"Opération annulée.",done:"Opération terminée.",unavailable:"La reconnaissance vocale n’est pas disponible. Vous pouvez écrire votre demande.",error:"Impossible de contacter l’assistant actuellement."},
  de:{title:"Sprachassistent",sub:"Sprich mit fAInance, stelle Fragen und fordere Aktionen an",listening:"Ich höre zu...",speak:"Sprechen",stop:"Unterbrechen",continuous:"Fortlaufendes Gespräch",placeholder:"Anfrage schreiben oder sprechen...",send:"Senden",close:"Schließen",quick:"Schnelleingabe",thinking:"Analyse läuft...",empty:"Frage nach deinen Finanzen oder der App oder bitte darum, eine Ausgabe, Einnahme, ein Ziel oder eine Einkaufsliste hinzuzufügen.",confirm:"Aktion bereit",execute:"Ausführen",cancel:"Abbrechen",consentTitle:"KI-Assistenten autorisieren",consentText:"Für Antworten und Aktionen sendet fAInance deine Anfrage und die in den Einstellungen erlaubten Finanzdaten an OpenAI. Passwörter, biometrische Daten und vollständige Kartendaten werden nicht gesendet.",accept:"Akzeptieren und fortfahren",cancelled:"Aktion abgebrochen.",done:"Aktion abgeschlossen.",unavailable:"Spracherkennung ist nicht verfügbar. Du kannst die Anfrage schreiben.",error:"Der Assistent ist derzeit nicht erreichbar."},
  pt:{title:"Assistente de voz",sub:"Fale com o fAInance, faça perguntas e peça ações",listening:"A ouvir...",speak:"Falar",stop:"Interromper",continuous:"Conversa contínua",placeholder:"Escreva ou diga um pedido...",send:"Enviar",close:"Fechar",quick:"Entrada rápida",thinking:"A analisar...",empty:"Pergunte sobre as suas finanças ou a app, ou peça para adicionar uma despesa, receita, objetivo ou lista de compras.",confirm:"Operação pronta",execute:"Executar",cancel:"Cancelar",consentTitle:"Autorizar o assistente de IA",consentText:"Para responder e interpretar ações, o fAInance envia à OpenAI o seu pedido e os dados financeiros permitidos nas definições. Não são enviados dados biométricos, palavras-passe ou dados completos de cartões.",accept:"Aceito e continuo",cancelled:"Operação cancelada.",done:"Operação concluída.",unavailable:"O reconhecimento de voz não está disponível. Pode escrever o pedido.",error:"Não consigo contactar o assistente agora."},
  pl:{title:"Asystent głosowy",sub:"Rozmawiaj z fAInance, zadawaj pytania i zlecaj działania",listening:"Słucham...",speak:"Mów",stop:"Przerwij",continuous:"Ciągła rozmowa",placeholder:"Wpisz lub wypowiedz polecenie...",send:"Wyślij",close:"Zamknij",quick:"Szybkie dodawanie",thinking:"Analizuję...",empty:"Zapytaj o finanse lub aplikację albo poproś o dodanie wydatku, przychodu, celu lub listy zakupów.",confirm:"Działanie gotowe",execute:"Wykonaj",cancel:"Anuluj",consentTitle:"Zezwól na asystenta AI",consentText:"Aby odpowiadać i interpretować działania, fAInance wysyła do OpenAI Twoje polecenie i dane finansowe dozwolone w ustawieniach. Hasła, dane biometryczne i pełne dane kart nie są wysyłane.",accept:"Akceptuję i kontynuuję",cancelled:"Działanie anulowane.",done:"Działanie zakończone.",unavailable:"Rozpoznawanie mowy jest niedostępne. Możesz wpisać polecenie.",error:"Nie można teraz połączyć się z asystentem."},
  nl:{title:"Spraakassistent",sub:"Praat met fAInance, stel vragen en vraag acties",listening:"Ik luister...",speak:"Spreken",stop:"Onderbreken",continuous:"Doorlopend gesprek",placeholder:"Typ of spreek een verzoek...",send:"Verzenden",close:"Sluiten",quick:"Snelle invoer",thinking:"Bezig met analyseren...",empty:"Vraag naar je financiën of de app, of vraag om een uitgave, inkomen, doel of boodschappenlijst toe te voegen.",confirm:"Actie klaar",execute:"Uitvoeren",cancel:"Annuleren",consentTitle:"AI-assistent toestaan",consentText:"Om antwoorden en acties te verwerken stuurt fAInance je verzoek en de in de instellingen toegestane financiële gegevens naar OpenAI. Wachtwoorden, biometrische gegevens en volledige kaartgegevens worden niet verzonden.",accept:"Accepteren en doorgaan",cancelled:"Actie geannuleerd.",done:"Actie voltooid.",unavailable:"Spraakherkenning is niet beschikbaar. Je kunt het verzoek typen.",error:"De assistent is nu niet bereikbaar."},
  ro:{title:"Asistent vocal",sub:"Vorbește cu fAInance, pune întrebări și solicită acțiuni",listening:"Ascult...",speak:"Vorbește",stop:"Întrerupe",continuous:"Conversație continuă",placeholder:"Scrie sau spune o solicitare...",send:"Trimite",close:"Închide",quick:"Introducere rapidă",thinking:"Analizez...",empty:"Întreabă despre finanțele tale sau aplicație ori cere adăugarea unei cheltuieli, unui venit, obiectiv sau liste de cumpărături.",confirm:"Operațiune pregătită",execute:"Execută",cancel:"Anulează",consentTitle:"Autorizează asistentul AI",consentText:"Pentru răspunsuri și acțiuni, fAInance trimite către OpenAI solicitarea și datele financiare permise în setări. Nu sunt trimise parole, date biometrice sau date complete ale cardurilor.",accept:"Accept și continui",cancelled:"Operațiune anulată.",done:"Operațiune finalizată.",unavailable:"Recunoașterea vocală nu este disponibilă. Poți scrie solicitarea.",error:"Asistentul nu poate fi contactat acum."},
  el:{title:"Φωνητικός βοηθός",sub:"Μιλήστε με το fAInance, κάντε ερωτήσεις και ζητήστε ενέργειες",listening:"Ακούω...",speak:"Μιλήστε",stop:"Διακοπή",continuous:"Συνεχής συνομιλία",placeholder:"Γράψτε ή πείτε ένα αίτημα...",send:"Αποστολή",close:"Κλείσιμο",quick:"Γρήγορη εισαγωγή",thinking:"Ανάλυση...",empty:"Ρωτήστε για τα οικονομικά σας ή την εφαρμογή ή ζητήστε να προστεθεί έξοδο, έσοδο, στόχος ή λίστα αγορών.",confirm:"Η ενέργεια είναι έτοιμη",execute:"Εκτέλεση",cancel:"Ακύρωση",consentTitle:"Εξουσιοδότηση βοηθού AI",consentText:"Για απαντήσεις και ενέργειες, το fAInance στέλνει στην OpenAI το αίτημά σας και τα οικονομικά δεδομένα που επιτρέπονται στις ρυθμίσεις. Δεν αποστέλλονται κωδικοί, βιομετρικά ή πλήρη στοιχεία καρτών.",accept:"Αποδοχή και συνέχεια",cancelled:"Η ενέργεια ακυρώθηκε.",done:"Η ενέργεια ολοκληρώθηκε.",unavailable:"Η αναγνώριση φωνής δεν είναι διαθέσιμη. Μπορείτε να γράψετε το αίτημα.",error:"Δεν είναι δυνατή η σύνδεση με τον βοηθό τώρα."}
};return dict[code]||dict.en;}

function assistantRealtimeUiText(code){
  var d:any={
    it:{connectingTitle:"Attendi: connessione vocale in corso",connectingSub:"Non parlare ancora. Ti avviso appena il microfono è pronto.",readyTitle:"Microfono pronto: ora puoi parlare",readySub:"Parla liberamente. Puoi interrompermi iniziando a parlare.",listeningTitle:"Ti sto ascoltando…",listeningSub:"Continua a parlare e concludi la frase normalmente.",speakingTitle:"Sto rispondendo",speakingSub:"Puoi interrompermi semplicemente iniziando a parlare.",inactiveTitle:"Conversazione vocale non attiva",inactiveSub:"Premi Avvia per collegare il microfono.",camera:"Scatta foto",attach:"Allega foto",documentReading:"Sto interpretando il documento…",documentAttached:"Foto allegata",volume:"Volume assistente"},
    en:{connectingTitle:"Wait: voice connection in progress",connectingSub:"Do not speak yet. I will tell you when the microphone is ready.",readyTitle:"Microphone ready: you can speak now",readySub:"Speak freely. You can interrupt me by starting to talk.",listeningTitle:"I’m listening…",listeningSub:"Keep speaking and finish your sentence normally.",speakingTitle:"I’m replying",speakingSub:"You can interrupt me simply by starting to speak.",inactiveTitle:"Voice conversation is not active",inactiveSub:"Tap Start to connect the microphone.",camera:"Take photo",attach:"Attach photo",documentReading:"I’m interpreting the document…",documentAttached:"Photo attached",volume:"Assistant volume"},
    es:{connectingTitle:"Espera: conectando la voz",connectingSub:"No hables todavía. Te avisaré cuando el micrófono esté listo.",readyTitle:"Micrófono listo: ya puedes hablar",readySub:"Habla libremente. Puedes interrumpirme empezando a hablar.",listeningTitle:"Te escucho…",listeningSub:"Sigue hablando y termina la frase con normalidad.",speakingTitle:"Estoy respondiendo",speakingSub:"Puedes interrumpirme simplemente empezando a hablar.",inactiveTitle:"Conversación de voz no activa",inactiveSub:"Pulsa Iniciar para conectar el micrófono.",camera:"Hacer foto",attach:"Adjuntar foto",documentReading:"Estoy interpretando el documento…",documentAttached:"Foto adjunta",volume:"Volumen del asistente"},
    fr:{connectingTitle:"Patientez : connexion vocale en cours",connectingSub:"Ne parlez pas encore. Je vous préviens dès que le micro est prêt.",readyTitle:"Micro prêt : vous pouvez parler",readySub:"Parlez librement. Vous pouvez m’interrompre en commençant à parler.",listeningTitle:"Je vous écoute…",listeningSub:"Continuez et terminez votre phrase normalement.",speakingTitle:"Je réponds",speakingSub:"Vous pouvez m’interrompre simplement en parlant.",inactiveTitle:"Conversation vocale inactive",inactiveSub:"Appuyez sur Démarrer pour connecter le micro.",camera:"Prendre une photo",attach:"Joindre une photo",documentReading:"J’interprète le document…",documentAttached:"Photo jointe",volume:"Volume de l’assistant"},
    de:{connectingTitle:"Bitte warten: Sprachverbindung wird hergestellt",connectingSub:"Noch nicht sprechen. Ich melde mich, sobald das Mikrofon bereit ist.",readyTitle:"Mikrofon bereit: Du kannst jetzt sprechen",readySub:"Sprich frei. Du kannst mich unterbrechen, indem du zu sprechen beginnst.",listeningTitle:"Ich höre zu…",listeningSub:"Sprich weiter und beende den Satz normal.",speakingTitle:"Ich antworte",speakingSub:"Du kannst mich einfach durch Sprechen unterbrechen.",inactiveTitle:"Sprachgespräch nicht aktiv",inactiveSub:"Tippe auf Start, um das Mikrofon zu verbinden.",camera:"Foto aufnehmen",attach:"Foto anhängen",documentReading:"Dokument wird interpretiert…",documentAttached:"Foto angehängt",volume:"Assistentenlautstärke"},
    pt:{connectingTitle:"Aguarde: ligação de voz em curso",connectingSub:"Ainda não fale. Aviso quando o microfone estiver pronto.",readyTitle:"Microfone pronto: já pode falar",readySub:"Fale livremente. Pode interromper-me começando a falar.",listeningTitle:"Estou a ouvir…",listeningSub:"Continue e termine a frase normalmente.",speakingTitle:"Estou a responder",speakingSub:"Pode interromper-me simplesmente começando a falar.",inactiveTitle:"Conversa por voz inativa",inactiveSub:"Toque em Iniciar para ligar o microfone.",camera:"Tirar foto",attach:"Anexar foto",documentReading:"Estou a interpretar o documento…",documentAttached:"Foto anexada",volume:"Volume do assistente"},
    pl:{connectingTitle:"Poczekaj: trwa łączenie głosowe",connectingSub:"Jeszcze nie mów. Dam znać, gdy mikrofon będzie gotowy.",readyTitle:"Mikrofon gotowy: możesz mówić",readySub:"Mów swobodnie. Możesz mi przerwać, zaczynając mówić.",listeningTitle:"Słucham…",listeningSub:"Mów dalej i zakończ zdanie normalnie.",speakingTitle:"Odpowiadam",speakingSub:"Możesz mi przerwać, po prostu zaczynając mówić.",inactiveTitle:"Rozmowa głosowa nieaktywna",inactiveSub:"Naciśnij Start, aby połączyć mikrofon.",camera:"Zrób zdjęcie",attach:"Dołącz zdjęcie",documentReading:"Interpretuję dokument…",documentAttached:"Dołączono zdjęcie",volume:"Głośność asystenta"},
    nl:{connectingTitle:"Wacht: spraakverbinding wordt gemaakt",connectingSub:"Praat nog niet. Ik laat weten wanneer de microfoon klaar is.",readyTitle:"Microfoon klaar: je kunt nu praten",readySub:"Praat vrijuit. Je kunt mij onderbreken door te beginnen met praten.",listeningTitle:"Ik luister…",listeningSub:"Praat verder en maak je zin normaal af.",speakingTitle:"Ik antwoord",speakingSub:"Je kunt mij onderbreken door gewoon te beginnen met praten.",inactiveTitle:"Spraakgesprek niet actief",inactiveSub:"Tik op Start om de microfoon te verbinden.",camera:"Foto maken",attach:"Foto bijvoegen",documentReading:"Ik interpreteer het document…",documentAttached:"Foto bijgevoegd",volume:"Assistentvolume"},
    ro:{connectingTitle:"Așteaptă: conexiunea vocală este în curs",connectingSub:"Nu vorbi încă. Te anunț când microfonul este pregătit.",readyTitle:"Microfon pregătit: poți vorbi acum",readySub:"Vorbește liber. Mă poți întrerupe începând să vorbești.",listeningTitle:"Te ascult…",listeningSub:"Continuă și încheie fraza normal.",speakingTitle:"Răspund",speakingSub:"Mă poți întrerupe pur și simplu începând să vorbești.",inactiveTitle:"Conversația vocală nu este activă",inactiveSub:"Apasă Pornire pentru a conecta microfonul.",camera:"Fă o fotografie",attach:"Atașează fotografie",documentReading:"Interpretez documentul…",documentAttached:"Fotografie atașată",volume:"Volumul asistentului"},
    el:{connectingTitle:"Περιμένετε: γίνεται φωνητική σύνδεση",connectingSub:"Μην μιλήσετε ακόμη. Θα σας ενημερώσω όταν το μικρόφωνο είναι έτοιμο.",readyTitle:"Το μικρόφωνο είναι έτοιμο: μιλήστε τώρα",readySub:"Μιλήστε ελεύθερα. Μπορείτε να με διακόψετε αρχίζοντας να μιλάτε.",listeningTitle:"Σας ακούω…",listeningSub:"Συνεχίστε και ολοκληρώστε κανονικά τη φράση.",speakingTitle:"Απαντώ",speakingSub:"Μπορείτε να με διακόψετε απλώς αρχίζοντας να μιλάτε.",inactiveTitle:"Η φωνητική συνομιλία δεν είναι ενεργή",inactiveSub:"Πατήστε Έναρξη για σύνδεση του μικροφώνου.",camera:"Λήψη φωτογραφίας",attach:"Επισύναψη φωτογραφίας",documentReading:"Ερμηνεύω το έγγραφο…",documentAttached:"Η φωτογραφία επισυνάφθηκε",volume:"Ένταση βοηθού"}
  };return d[code]||d.en;
}

function FinanceMicIcon({size=24,muted=false,active=false}:{size?:number,muted?:boolean,active?:boolean}){
  return <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="11" y="4" width="10" height="16" rx="5" fill="currentColor"/><path d="M7.5 15.5c0 4.7 3.8 8.5 8.5 8.5s8.5-3.8 8.5-8.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/><path d="M16 24v4M11.5 28h9" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"/>{active&&<><path d="M4.5 11.5c-1.4 2.8-1.4 6.2 0 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity=".65"/><path d="M27.5 11.5c1.4 2.8 1.4 6.2 0 9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" opacity=".65"/></>}{muted&&<path d="M6 6l20 20" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>}</svg>;
}

function VoiceAssistantModal({onQuick}){
  var c:any=useApp();
  var {lang,dark,textC,subC,borderC,cardBg,btnRadius,isMobile,voiceModal,setVoiceModal,voiceListening,setVoiceListening,voiceError,setVoiceError}:any=c;
  var {aiChat,setAiChat,aiExternalConsent,setAiExternalConsent,aiDataAccess,aiLoading,setAiLoading}:any=c;
  var {expenses,incomes,cats,setCats,methods,setMethods,incomeTypes,expenseGroups,methodGroups,recurring,setRecurring,budgetPlan,setBudgetPlan,goals,setGoals,alerts,setAlerts}:any=c;
  var {patrimonioValues,setPatrimonioValues,patrimonioEntries,setPatrimonioEntries,patrimonioAreas,curMonthKey,debtCredits,setDebtCredits,appuntiNotes,setAppuntiNotes,shareProjects,createShareProject,updateShareProject,userId,currentUser}:any=c;
  var {addExpenses,addIncomes,setTab,setSettingsPage,setSpeseSubTab,setAddType,setAddSubTab,setHistoryTab,setMobileMenu,setToast}:any=c;
  var {shoppingItems,setShoppingItems,shoppingAreas,shoppingDefaultArea,shoppingLists,setShoppingLists,activeShoppingListId,setActiveShoppingListId}:any=c;
  var {currentPlan,PLAN_LIMITS,canUsePlanFeature,consumePlanFeature,handleRewardedFeature,upgradeMessage,canAddPlanItem,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultIncomeType,setDefaultIncomeType}:any=c;
  var {bgTheme,setBgTheme,btnStyle,setBtnStyle,showAppSummaryHeader,setShowAppSummaryHeader,mobileNavIconCount,setMobileNavIconCount,mobileNavOrder,setMobileNavOrder,mobileMenuOrder,setMobileMenuOrder,homeBalanceView,setHomeBalanceView,homeWorklets,setHomeWorklets,statsView,setStatsView,dateFmt,setDateFmt,firstDayOfWeek,setFirstDayOfWeek}:any=c;
  var {showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget,showSecInPatrimonio,setShowSecInPatrimonio,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate,historySortDirection,setHistorySortDirection,historySortSecondary,setHistorySortSecondary,historySortSecondaryDirection,setHistorySortSecondaryDirection}:any=c;
  var {showShareInHistory,setShowShareInHistory,showDebtCreditsInPatrimonio,setShowDebtCreditsInPatrimonio,showDebtCreditsInExpenses,setShowDebtCreditsInExpenses,shoppingProductSort,setShoppingProductSort,shoppingBoughtColor,setShoppingBoughtColor,setShoppingDefaultArea,patrimonioMode,setPatrimonioMode,aiDataAccess:setAiAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,setSecondaryButtonColor}:any=c;
  var V=assistantVoiceUiText(lang||"it");
  var RT=assistantRealtimeUiText(lang||"it");
  var [input,setInput]=useState("");
  var [busy,setBusy]=useState(false);
  var [speaking,setSpeaking]=useState(false);
  var [continuous,setContinuous]=useState(true);
  var [pendingActions,setPendingActions]=useState<any[]>([]);
  var [realtimeStatus,setRealtimeStatus]=useState("idle");
  var [realtimeMicEnabled,setRealtimeMicEnabled]=useState(true);
  var [realtimeAssistantDraft,setRealtimeAssistantDraft]=useState("");
  var [realtimeUserDraft,setRealtimeUserDraft]=useState("");
  var [volumeNotice,setVolumeNotice]=useState("");
  var [documentLoading,setDocumentLoading]=useState(false);
  var [attachmentMenuOpen,setAttachmentMenuOpen]=useState(false);
  var endRef=useRef<any>(null);
  var webRecognitionRef=useRef<any>(null);
  var nativeSpeechRef=useRef<any>(null);
  var nativeTtsRef=useRef<any>(null);
  var nativeAudioRef=useRef<any>(null);
  var speechAbortRef=useRef<any>(null);
  var assistantRequestAbortRef=useRef<any>(null);
  var speechCycleRef=useRef(0);
  var realtimePeerRef=useRef<any>(null);
  var realtimeChannelRef=useRef<any>(null);
  var realtimeStreamRef=useRef<any>(null);
  var realtimeAudioRef=useRef<any>(null);
  var realtimeAudioContextRef=useRef<any>(null);
  var realtimeAudioSourceRef=useRef<any>(null);
  var realtimeGainRef=useRef<any>(null);
  var assistantVolumeRef=useRef<number>(1);
  var volumeNoticeTimerRef=useRef<any>(null);
  var voiceErrorTimerRef=useRef<any>(null);
  var cameraInputRef=useRef<any>(null);
  var galleryInputRef=useRef<any>(null);
  var documentInputRef=useRef<any>(null);
  var realtimeConnectionAbortRef=useRef<any>(null);
  var realtimeAssistantDraftRef=useRef("");
  var realtimeUserDraftRef=useRef("");
  var realtimeHandledCallsRef=useRef<any>(new Set());
  var lastVoiceUserRequestRef=useRef("");
  var lastRealtimeAssistantTranscriptRef=useRef("");
  var pendingActionsRef=useRef<any[]>([]);
  var nativeTextRef=useRef("");
  var nativeSessionDoneRef=useRef(false);
  var mountedRef=useRef(true);
  var realtimeAutoStartAttemptedRef=useRef(false);
  var activeAttachmentRef=useRef<any>(null);
  var systemMediaMutedRef=useRef(false);
  var microphoneProcessingContextRef=useRef<any>(null);
  var microphoneProcessingSourceRef=useRef<any>(null);
  var microphoneProcessingGateRef=useRef<any>(null);
  var microphoneProcessingDestinationRef=useRef<any>(null);
  var microphoneProcessingTimerRef=useRef<any>(null);
  var microphoneProcessedStreamRef=useRef<any>(null);
  var sinp:any={width:"100%",borderRadius:12,border:"1px solid "+borderC,padding:"11px 12px",fontSize:14,background:dark?"#202033":"#fff",color:textC,boxSizing:"border-box"};
  var localeMap:any={it:"it-IT",en:"en-US",es:"es-ES",fr:"fr-FR",de:"de-DE",pt:"pt-PT",pl:"pl-PL",nl:"nl-NL",ro:"ro-RO",el:"el-GR"};
  function appendMessage(role,text){var clean=String(text||"").trim();if(!clean)return;setAiChat(function(p){return [...(p||[]),{id:Date.now()+Math.random(),role:role,text:clean,source:"voice-assistant"}].slice(-80);});}
  function appendVoiceMessage(transcript,confidence){
    var raw=String(transcript||"").replace(/\s+/g," ").trim();
    if(!raw)return;
    // Mostra esclusivamente la trascrizione definitiva restituita dal motore
    // di riconoscimento: niente etichette generiche e niente testo provvisorio.
    setAiChat(function(p){return [...(p||[]),{id:Date.now()+Math.random(),role:"user",text:raw,rawText:raw,transcriptionConfidence:confidence,source:"voice-input-final"}].slice(-80);});
  }
  function clearVoiceErrorTimer(){try{if(voiceErrorTimerRef.current)clearTimeout(voiceErrorTimerRef.current);}catch(e){}voiceErrorTimerRef.current=null;}
  function clearVoiceNotice(){clearVoiceErrorTimer();setVoiceError("");}
  function showTemporaryVoiceNotice(text,delay){var clean=String(text||"").trim();clearVoiceErrorTimer();setVoiceError(clean);if(!clean)return;voiceErrorTimerRef.current=setTimeout(function(){if(mountedRef.current)setVoiceError("");voiceErrorTimerRef.current=null;},Math.max(1800,Number(delay)||4500));}
  function cleanSpeechText(text){return String(text||"").replace(/https?:\/\/\S+/g,"").replace(/[•*_#`]/g," ").replace(/\s+/g," ").trim();}
  function nativePlatform(){try{var cap:any=(window as any).Capacitor;return !!(cap&&((typeof cap.isNativePlatform==="function"&&cap.isNativePlatform())||(typeof cap.getPlatform==="function"&&["android","ios"].indexOf(String(cap.getPlatform()).toLowerCase())>=0)));}catch(e){return false;}}
  function clampAssistantVolume(value:any){var parsed=Number(value);return Math.max(0,Math.min(1,Number.isFinite(parsed)?parsed:1));}
  function applyAssistantSystemVolume(value:any,muted?:any){
    var ratio=muted===true?0:clampAssistantVolume(value);
    assistantVolumeRef.current=ratio;
    systemMediaMutedRef.current=ratio<=0;
    try{var gain=realtimeGainRef.current,ctx=realtimeAudioContextRef.current;if(gain&&gain.gain){var now=ctx&&Number.isFinite(ctx.currentTime)?ctx.currentTime:0;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(ratio,now);}}catch(e){try{if(realtimeGainRef.current)realtimeGainRef.current.gain.value=ratio;}catch(e2){}}
    try{var audio=realtimeAudioRef.current;if(audio){audio.volume=ratio;audio.muted=ratio<=0;}}catch(e){}
    try{var fallback=nativeAudioRef.current;if(fallback){fallback.volume=ratio;fallback.muted=ratio<=0;}}catch(e){}
  }
  async function syncSystemMediaVolume(){
    if(!nativePlatform()){applyAssistantSystemVolume(1,false);return 1;}
    try{
      var result:any=FainanceAudioNative&&FainanceAudioNative.getMediaVolume?await FainanceAudioNative.getMediaVolume():null;
      var current=Number(result&&result.current),maximum=Math.max(1,Number(result&&result.max)||1),ratio=Number(result&&result.ratio);
      if(!Number.isFinite(ratio))ratio=Number.isFinite(current)?current/maximum:1;
      applyAssistantSystemVolume(ratio,(result&&result.muted===true)||current<=0);
      return assistantVolumeRef.current;
    }catch(e){applyAssistantSystemVolume(1,false);return 1;}
  }
  function setNativeAssistantAudio(active){if(!nativePlatform())return;try{var fn=active?FainanceAudioNative.activateAssistantAudio:FainanceAudioNative.releaseAssistantAudio;if(fn)Promise.resolve(fn.call(FainanceAudioNative)).then(function(){if(active)syncSystemMediaVolume();}).catch(function(){});return;}catch(e){}try{var cap:any=(window as any).Capacitor,plugin=cap&&cap.Plugins&&cap.Plugins.FainanceAudio,legacyFn=active&&plugin?plugin.activateAssistantAudio:(plugin&&plugin.releaseAssistantAudio);if(legacyFn)Promise.resolve(legacyFn.call(plugin)).then(function(){if(active)syncSystemMediaVolume();}).catch(function(){});}catch(e){}}
  async function attachRealtimeAudioStream(remoteStream:any){
    // Riproduzione stabile tramite elemento audio nativo della WebView.
    // Il volume viene applicato direttamente all'elemento ad ogni singola
    // tacca Android, evitando l'AudioContext che poteva restare sospeso e
    // rendere completamente muta la risposta Realtime.
    try{
      var previous=realtimeAudioRef.current;
      if(previous){
        try{previous.pause();}catch(e){}
        try{previous.srcObject=null;}catch(e){}
        try{if(previous.parentNode)previous.parentNode.removeChild(previous);}catch(e){}
      }
    }catch(e){}
    realtimeAudioRef.current=null;
    try{var oldSource=realtimeAudioSourceRef.current;if(oldSource)oldSource.disconnect();}catch(e){}
    realtimeAudioSourceRef.current=null;
    try{var oldGain=realtimeGainRef.current;if(oldGain)oldGain.disconnect();}catch(e){}
    realtimeGainRef.current=null;
    try{var oldCtx=realtimeAudioContextRef.current;if(oldCtx&&oldCtx.state!=="closed")await oldCtx.close();}catch(e){}
    realtimeAudioContextRef.current=null;

    await syncSystemMediaVolume();
    var audio=document.createElement("audio");
    audio.autoplay=true;
    audio.controls=false;
    audio.preload="auto";
    (audio as any).playsInline=true;
    audio.setAttribute("playsinline","true");
    audio.style.display="none";
    audio.srcObject=remoteStream;
    audio.volume=assistantVolumeRef.current;
    audio.muted=assistantVolumeRef.current<=0;
    document.body.appendChild(audio);
    realtimeAudioRef.current=audio;

    // Applica nuovamente il livello dopo l'aggancio dello stream, perché su
    // alcune WebView Android il valore può essere inizializzato solo dopo
    // l'assegnazione di srcObject.
    applyAssistantSystemVolume(assistantVolumeRef.current,assistantVolumeRef.current<=0);
    await audio.play();
    await syncSystemMediaVolume();
    return true;
  }
  async function prepareNoiseFilteredMicrophone(acquired:any){
    try{
      var AudioCtx:any=(window as any).AudioContext||(window as any).webkitAudioContext;
      if(!AudioCtx||!acquired)return acquired;
      var ctx:any;
      try{ctx=new AudioCtx({latencyHint:"interactive",sampleRate:48000});}catch(e){ctx=new AudioCtx();}
      var source=ctx.createMediaStreamSource(acquired);
      var highpass=ctx.createBiquadFilter();highpass.type="highpass";highpass.frequency.value=115;highpass.Q.value=.72;
      var lowpass=ctx.createBiquadFilter();lowpass.type="lowpass";lowpass.frequency.value=8500;lowpass.Q.value=.7;
      var analyser=ctx.createAnalyser();analyser.fftSize=512;analyser.smoothingTimeConstant=.28;
      var gate=ctx.createGain();gate.gain.value=0;
      var destination=ctx.createMediaStreamDestination();
      source.connect(highpass);highpass.connect(lowpass);lowpass.connect(analyser);analyser.connect(gate);gate.connect(destination);
      var samples=new Float32Array(analyser.fftSize),started=Date.now(),ambient=.006,lastOpen=0;
      var timer=setInterval(function(){
        try{
          analyser.getFloatTimeDomainData(samples);
          var sum=0;for(var i=0;i<samples.length;i++)sum+=samples[i]*samples[i];
          var rms=Math.sqrt(sum/Math.max(1,samples.length));
          var elapsed=Date.now()-started;
          if(elapsed<900){ambient=ambient*.88+rms*.12;}
          var threshold=Math.max(.017,Math.min(.065,ambient*2.7));
          if(rms>threshold)lastOpen=Date.now();
          var open=(Date.now()-lastOpen)<260;
          var now=ctx.currentTime||0;
          gate.gain.cancelScheduledValues(now);
          gate.gain.setTargetAtTime(open?1:0,now,open?.012:.055);
        }catch(e){}
      },35);
      microphoneProcessingContextRef.current=ctx;
      microphoneProcessingSourceRef.current=source;
      microphoneProcessingGateRef.current=gate;
      microphoneProcessingDestinationRef.current=destination;
      microphoneProcessingTimerRef.current=timer;
      microphoneProcessedStreamRef.current=destination.stream;
      try{await ctx.resume();}catch(e){}
      return destination.stream;
    }catch(e){
      return acquired;
    }
  }
  function conciseTechnicalMessage(raw:any){var text=String(raw||"").replace(/\s+/g," ").trim();if(!text)return "";if(text.length>180)text=text.slice(0,177)+"…";return text;}
  function realtimeFailureMessage(error:any,phase?:string,status?:number,serverMessage?:string){
    var raw=conciseTechnicalMessage(serverMessage||((error&&error.message)||error)||"");
    var name=String((error&&error.name)||"").toLowerCase();
    try{if(typeof navigator!=="undefined"&&navigator.onLine===false)return "Sei offline. Controlla la connessione e riprova.";}catch(e){}
    if(/permission|notallowed|denied/i.test(raw))return realtimePermissionDeniedMessage();
    if(status===401)return "La sessione è scaduta. Accedi di nuovo e riapri l’assistente.";
    if(status===403)return raw||"L’assistente vocale è disponibile dal piano Base.";
    if(status===429)return "L’assistente è molto richiesto in questo momento. Attendi qualche secondo e riprova.";
    if(name==="aborterror")return "La connessione sta impiegando troppo tempo. Tocca Avvia per riprovare.";
    if(String(phase||"")==="datachannel")return "La conversazione si è interrotta. Tocca Avvia per riprovare.";
    return "La conversazione vocale non è disponibile in questo momento. Tocca Avvia per riprovare.";
  }
  function realtimeServerFailure(error:any){
    var code=String((error&&error.code)||"").toLowerCase(),type=String((error&&error.type)||"").toLowerCase();
    if(code==="no_match"||code==="no-match"||type==="no_match"||type==="no-match")return "";
    if(code.indexOf("rate")>=0||type.indexOf("rate")>=0)return "L’assistente è molto richiesto in questo momento. Attendi qualche secondo e riprova.";
    if(type==="server_error"||code.indexOf("server")>=0)return "Non ho capito bene. Prova a ripetere più vicino al telefono.";
    return "Non ho capito bene. Prova a ripetere più vicino al telefono.";
  }
  function sendRealtimeEvent(event:any){var dc=realtimeChannelRef.current;if(!dc||dc.readyState!=="open")return false;try{dc.send(JSON.stringify(event));return true;}catch(e){return false;}}
  function realtimeActionsFrom(value:any){var allowed=["open_section","create_expense","create_income","create_recurring","create_goal","update_goal_saved","create_alert","set_category_budget","create_debt_credit","update_debt_credit","delete_debt_credit","set_patrimonio_value","create_note","add_shopping_items","create_shopping_list","create_share_project","create_share_expense","create_share_settlement","create_expense_category","create_payment_method","set_setting"];return (Array.isArray(value)?value:[]).map(function(raw){var a={...(raw||{})},signal=[lastVoiceUserRequestRef.current,a.summary,a.description,a.projectName,a.holder,a.entityName].join(" ").toLowerCase();if(a.action==="create_expense"&&/(spesa condivisa|spesa share|share expense|shared expense|split expense|divid|nel progetto|progetto share)/i.test(signal))a.action="create_share_expense";if(a.action==="update_debt_credit"&&/(elimina|cancella|rimuovi|chiudi definitivamente|delete|remove|erase)/i.test(signal)){a.action="delete_debt_credit";a.amount=null;a.initialAmount=null;}return a;}).filter(function(a){return a&&allowed.indexOf(String(a.action||""))>=0;}).slice(0,16).map(function(a){return {...a,action:String(a.action||""),summary:String(a.summary||"").slice(0,500),items:Array.isArray(a.items)?a.items.slice(0,100):[],shareParticipants:Array.isArray(a.shareParticipants)?a.shareParticipants.slice(0,50):[]};});}
  function updatePendingActions(next:any[]){pendingActionsRef.current=Array.isArray(next)?next:[];setPendingActions(pendingActionsRef.current);}
  function sendRealtimeToolResult(callId:string,payload:any,createResponse?:boolean){var sent=sendRealtimeEvent({type:"conversation.item.create",item:{type:"function_call_output",call_id:callId,output:JSON.stringify(payload||{})}});if(sent&&createResponse!==false)setTimeout(function(){sendRealtimeEvent({type:"response.create"});},20);}
  async function handleRealtimeFunctionCall(event:any){var callId=String(event&&event.call_id||"");if(!callId||realtimeHandledCallsRef.current.has(callId))return;realtimeHandledCallsRef.current.add(callId);var args:any={};try{args=JSON.parse(String(event.arguments||"{}"));}catch(e){sendRealtimeToolResult(callId,{status:"error",error:"Argomenti non validi."});return;}var name=String(event.name||"");
    if(name==="propose_fainance_actions"){var actions=realtimeActionsFrom(args.actions),opens=actions.filter(function(a){return a.action==="open_section";}),writes=actions.filter(function(a){return a.action!=="open_section";});if(writes.length){sendRealtimeEvent({type:"response.cancel"});sendRealtimeEvent({type:"output_audio_buffer.clear"});var preamble=lastRealtimeAssistantTranscriptRef.current;lastRealtimeAssistantTranscriptRef.current="";if(preamble)setAiChat(function(p){var list=[...(p||[])];var last=list[list.length-1];if(last&&last.role==="assistant"&&last.source==="voice-assistant"&&String(last.text||"").trim()===preamble)list.pop();return list;});realtimeAssistantDraftRef.current="";setRealtimeAssistantDraft("");setSpeaking(false);setBusy(false);updatePendingActions(writes);sendRealtimeToolResult(callId,{status:"confirmation_required",summaries:writes.map(actionSummary),uiConfirmation:true},false);return;}if(opens.length){sendRealtimeToolResult(callId,{status:"completed",result:"Sezione aperta."},false);setTimeout(function(){openSection(opens[0]);},80);return;}sendRealtimeToolResult(callId,{status:"error",error:"Nessuna azione valida."});return;}
    if(name==="confirm_pending_actions"){var pending=pendingActionsRef.current.slice();if(!pending.length){sendRealtimeToolResult(callId,{status:"nothing_to_confirm"});return;}var results:any[]=[];try{pending.forEach(function(a){var r=executeAction(a);if(r)results.push(r);});updatePendingActions([]);sendRealtimeToolResult(callId,{status:"completed",results:results});}catch(e){sendRealtimeToolResult(callId,{status:"error",error:String((e&&e.message)||V.error)});}return;}
    if(name==="cancel_pending_actions"){updatePendingActions([]);sendRealtimeToolResult(callId,{status:"cancelled"});return;}
    sendRealtimeToolResult(callId,{status:"error",error:"Strumento non disponibile."});
  }
  function handleRealtimeEvent(raw:any){var event:any=raw;try{if(typeof raw==="string")event=JSON.parse(raw);}catch(e){return;}if(!event||!event.type)return;var type=String(event.type);
    if(type==="session.created"||type==="session.updated"){setRealtimeStatus("connected");clearVoiceNotice();return;}
    if(type==="input_audio_buffer.speech_started"){clearVoiceNotice();realtimeUserDraftRef.current="";setRealtimeUserDraft("");setVoiceListening(true);setSpeaking(false);setBusy(false);return;}
    if(type==="input_audio_buffer.speech_stopped"){setVoiceListening(false);setBusy(true);return;}
    if(type==="conversation.item.input_audio_transcription.delta"){var ud=String(event.delta||"");realtimeUserDraftRef.current+=ud;return;}
    if(type==="conversation.item.input_audio_transcription.completed"){var ut=String(event.transcript||realtimeUserDraftRef.current||"").trim();realtimeUserDraftRef.current="";setRealtimeUserDraft("");clearVoiceNotice();if(ut){var probs=Array.isArray(event.logprobs)?event.logprobs:[];var avgLogProb=probs.length?probs.reduce(function(sum,p){var lp=Number(p&&p.logprob);return sum+(Number.isFinite(lp)?lp:-4);},0)/probs.length:null;var confidence=avgLogProb===null?null:Math.exp(Math.max(-12,Math.min(0,avgLogProb)));lastVoiceUserRequestRef.current=ut;appendVoiceMessage(ut,confidence);if(consumePlanFeature)consumePlanFeature("aiReply",1);var check=normalized(ut);var hearingCheck=/^(mi senti|mi stai sentendo|riesci a sentirmi|mi ascolti|ci sei|can you hear me|do you hear me)[?.! ]*$/.test(check);if(hearingCheck)sendRealtimeEvent({type:"response.create",response:{instructions:"Rispondi esattamente e soltanto: Sì, ti sento."}});else if(activeAttachmentRef.current){sendRealtimeEvent({type:"response.cancel"});sendRealtimeEvent({type:"output_audio_buffer.clear"});callAssistant(ut);}else sendRealtimeEvent({type:"response.create"});}return;}
    if(type==="response.output_audio_transcript.delta"){var ad=String(event.delta||"");realtimeAssistantDraftRef.current+=ad;setRealtimeAssistantDraft(realtimeAssistantDraftRef.current);return;}
    if(type==="response.output_audio_transcript.done"){clearVoiceNotice();var at=String(event.transcript||realtimeAssistantDraftRef.current||"").trim();realtimeAssistantDraftRef.current="";setRealtimeAssistantDraft("");if(at){lastRealtimeAssistantTranscriptRef.current=at;appendMessage("assistant",at);}return;}
    if(type==="output_audio_buffer.started"){setSpeaking(true);setBusy(false);return;}
    if(type==="output_audio_buffer.stopped"||type==="output_audio_buffer.cleared"){setSpeaking(false);setBusy(false);return;}
    if(type==="response.created"){clearVoiceNotice();setBusy(true);return;}
    if(type==="response.function_call_arguments.done"){handleRealtimeFunctionCall(event);return;}
    if(type==="response.done"){setBusy(false);clearVoiceNotice();return;}
    if(type==="error"){setBusy(false);var realtimeMessage=realtimeServerFailure(event.error||{});if(realtimeMessage)showTemporaryVoiceNotice(realtimeMessage,/^Non ho capito bene/i.test(realtimeMessage)?4200:6200);return;}
  }
  function realtimePermissionDeniedMessage(){var m:any={it:"Permesso microfono negato. Apri le impostazioni del dispositivo, seleziona fAInance e consenti l’accesso al microfono, poi premi di nuovo Avvia.",en:"Microphone permission denied. Open the device settings, select fAInance and allow microphone access, then tap Start again.",es:"Permiso de micrófono denegado. Abre los ajustes del dispositivo, selecciona fAInance y permite el acceso al micrófono; después pulsa Iniciar de nuevo.",fr:"Autorisation du microphone refusée. Ouvrez les réglages de l’appareil, sélectionnez fAInance et autorisez le microphone, puis appuyez de nouveau sur Démarrer.",de:"Mikrofonzugriff verweigert. Öffne die Geräteeinstellungen, wähle fAInance und erlaube den Mikrofonzugriff. Tippe danach erneut auf Start.",pt:"Permissão do microfone negada. Abra as definições do dispositivo, selecione fAInance e permita o acesso ao microfone; depois toque novamente em Iniciar.",pl:"Odmówiono dostępu do mikrofonu. Otwórz ustawienia urządzenia, wybierz fAInance i zezwól na dostęp do mikrofonu, a następnie ponownie naciśnij Start.",nl:"Microfoontoegang geweigerd. Open de apparaatinstellingen, selecteer fAInance en sta microfoontoegang toe. Tik daarna opnieuw op Start.",ro:"Permisiunea pentru microfon a fost refuzată. Deschide setările dispozitivului, selectează fAInance și permite accesul la microfon, apoi apasă din nou Pornire.",el:"Η άδεια μικροφώνου απορρίφθηκε. Ανοίξτε τις ρυθμίσεις της συσκευής, επιλέξτε fAInance και επιτρέψτε την πρόσβαση στο μικρόφωνο και, στη συνέχεια, πατήστε ξανά Έναρξη."};return m[lang]||m.en;}
  async function ensureRealtimeMicrophonePermission(){if(!nativePlatform())return true;var mod:any=await import("@capgo/capacitor-speech-recognition");var speech:any=mod.SpeechRecognition||mod.default||mod;if(!speech)throw new Error(realtimePermissionDeniedMessage());var permission:any=speech.checkPermissions?await speech.checkPermissions():{};var state=String((permission&&permission.speechRecognition)||"").toLowerCase();if(state!=="granted"&&speech.requestPermissions){permission=await speech.requestPermissions();state=String((permission&&permission.speechRecognition)||"").toLowerCase();}if(state!=="granted")throw new Error(realtimePermissionDeniedMessage());return true;}
  function disconnectRealtime(nextStatus?:string){
    setNativeAssistantAudio(false);
    try{if(realtimeConnectionAbortRef.current)realtimeConnectionAbortRef.current.abort();}catch(e){}
    realtimeConnectionAbortRef.current=null;
    try{var dc=realtimeChannelRef.current;if(dc)dc.close();}catch(e){}realtimeChannelRef.current=null;
    try{var pc=realtimePeerRef.current;if(pc)pc.close();}catch(e){}realtimePeerRef.current=null;
    try{var stream=realtimeStreamRef.current;if(stream)stream.getTracks().forEach(function(t){t.stop();});}catch(e){}realtimeStreamRef.current=null;
    try{var processed=microphoneProcessedStreamRef.current;if(processed)processed.getTracks().forEach(function(t){t.stop();});}catch(e){}microphoneProcessedStreamRef.current=null;
    try{if(microphoneProcessingTimerRef.current)clearInterval(microphoneProcessingTimerRef.current);}catch(e){}microphoneProcessingTimerRef.current=null;
    try{var micSource=microphoneProcessingSourceRef.current;if(micSource)micSource.disconnect();}catch(e){}microphoneProcessingSourceRef.current=null;
    try{var micGate=microphoneProcessingGateRef.current;if(micGate)micGate.disconnect();}catch(e){}microphoneProcessingGateRef.current=null;
    microphoneProcessingDestinationRef.current=null;
    try{var micCtx=microphoneProcessingContextRef.current;if(micCtx&&micCtx.state!=="closed")Promise.resolve(micCtx.close()).catch(function(){});}catch(e){}microphoneProcessingContextRef.current=null;
    try{var audio=realtimeAudioRef.current;if(audio){audio.pause();audio.srcObject=null;if(audio.parentNode)audio.parentNode.removeChild(audio);}}catch(e){}realtimeAudioRef.current=null;
    try{var outSource=realtimeAudioSourceRef.current;if(outSource)outSource.disconnect();}catch(e){}realtimeAudioSourceRef.current=null;
    try{var outGain=realtimeGainRef.current;if(outGain)outGain.disconnect();}catch(e){}realtimeGainRef.current=null;
    try{var outCtx=realtimeAudioContextRef.current;if(outCtx&&outCtx.state!=="closed")Promise.resolve(outCtx.close()).catch(function(){});}catch(e){}realtimeAudioContextRef.current=null;
    realtimeAssistantDraftRef.current="";realtimeUserDraftRef.current="";setRealtimeAssistantDraft("");setRealtimeUserDraft("");setRealtimeStatus(nextStatus||"idle");setRealtimeMicEnabled(true);setVoiceListening(false);setSpeaking(false);setBusy(false);
  }
  async function connectRealtime(){
    if(realtimeStatus==="connecting"||realtimeStatus==="connected")return;
    if(!aiExternalConsent){setVoiceError(V.consentTitle);return;}
    setVoiceError("");setBusy(true);stopListening(false);stopSpeaking();disconnectRealtime();setRealtimeStatus("connecting");setNativeAssistantAudio(true);
    var phase="initialisation",statusCode=0,serverMessage="",connectionTimer:any=null;
    try{
      if(typeof RTCPeerConnection==="undefined"||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error("Conversazione vocale non supportata su questo dispositivo.");
      var contextForRealtime=buildContext();
      if(contextForRealtime&&contextForRealtime.transactions){contextForRealtime.transactions={expenses:(contextForRealtime.transactions.expenses||[]).slice(0,80),incomes:(contextForRealtime.transactions.incomes||[]).slice(0,50)};}
      var controller=new AbortController();realtimeConnectionAbortRef.current=controller;connectionTimer=setTimeout(function(){try{controller.abort();}catch(e){}},18000);
      phase="microphone";
      var mediaPromise=(async function(){await ensureRealtimeMicrophonePermission();try{var supported:any=navigator.mediaDevices.getSupportedConstraints?navigator.mediaDevices.getSupportedConstraints():{};var audioConstraints:any={echoCancellation:{ideal:true},noiseSuppression:{ideal:true},autoGainControl:{ideal:false},channelCount:{ideal:1},sampleRate:{ideal:48000},sampleSize:{ideal:16},googEchoCancellation:true,googNoiseSuppression:true,googHighpassFilter:true,googTypingNoiseDetection:true,googAutoGainControl:false};if(supported.voiceIsolation)audioConstraints.voiceIsolation={ideal:true};var acquired=await navigator.mediaDevices.getUserMedia({audio:audioConstraints,video:false});try{acquired.getAudioTracks().forEach(function(track:any){try{track.contentHint="speech";}catch(e){}try{var extra:any={echoCancellation:true,noiseSuppression:true,autoGainControl:false,channelCount:1};if(supported.voiceIsolation)extra.voiceIsolation=true;Promise.resolve(track.applyConstraints(extra)).catch(function(){});}catch(e){}});}catch(e){}realtimeStreamRef.current=acquired;return await prepareNoiseFilteredMicrophone(acquired);}catch(mediaError){var mediaName=String((mediaError&&mediaError.name)||"").toLowerCase(),mediaMessage=String((mediaError&&mediaError.message)||"").toLowerCase();if(mediaName.indexOf("notallowed")>=0||mediaName.indexOf("permission")>=0||mediaMessage.indexOf("permission")>=0||mediaMessage.indexOf("denied")>=0)throw new Error(realtimePermissionDeniedMessage());throw mediaError;}})();
      phase="session";
      var sessionPromise=(async function(){var token="";if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();var headers:any={"Content-Type":"application/json"};if(token)headers.Authorization="Bearer "+token;var response=await fetch(AI_REALTIME_ENDPOINT,{method:"POST",headers:headers,signal:controller.signal,body:JSON.stringify({language:lang||"it",aiDataAccess:aiDataAccess||"summary",financeContext:contextForRealtime,chatHistory:(aiChat||[]).slice(-4).map(function(m){return{role:m.role,text:m.rawText||m.text};})})});var payload:any={};try{payload=await response.json();}catch(e){}if(!response.ok||!payload.value){statusCode=response.status;serverMessage=String((payload&&payload.error)||"");var err:any=new Error(serverMessage||("Errore sessione "+response.status));err.httpStatus=response.status;err.serverMessage=serverMessage;throw err;}return payload;})();
      var peerPromise=(async function(){var stream=await mediaPromise;phase="webrtc";var pc=new RTCPeerConnection();realtimePeerRef.current=pc;pc.ontrack=function(e){var remote=(e.streams&&e.streams[0])?e.streams[0]:new MediaStream([e.track]);attachRealtimeAudioStream(remote).catch(function(){showTemporaryVoiceNotice("L’audio dell’assistente non è partito. Tocca Avvia per riprovare.",6200);});};pc.onconnectionstatechange=function(){var st=String(pc.connectionState||"");if(st==="connected"){setRealtimeStatus("connected");setBusy(false);setVoiceError("");}else if(st==="failed"){setRealtimeStatus("error");showTemporaryVoiceNotice("La conversazione vocale non è disponibile in questo momento. Tocca Avvia per riprovare.",6200);}else if(st==="disconnected"){showTemporaryVoiceNotice("La conversazione si è interrotta. Tocca Avvia per riprovare.",5200);}};stream.getAudioTracks().forEach(function(track){pc.addTrack(track,stream);});var dc=pc.createDataChannel("oai-events");realtimeChannelRef.current=dc;realtimeHandledCallsRef.current=new Set();dc.onopen=function(){if(connectionTimer)clearTimeout(connectionTimer);realtimeConnectionAbortRef.current=null;setRealtimeStatus("connected");setBusy(false);setVoiceError("");};dc.onmessage=function(ev){handleRealtimeEvent(ev.data);};dc.onerror=function(ev:any){setRealtimeStatus("error");showTemporaryVoiceNotice(realtimeFailureMessage(new Error(conciseTechnicalMessage(ev&&ev.message)||"Data channel error"),"datachannel"),6200);};dc.onclose=function(){if(mountedRef.current&&voiceModal)setRealtimeStatus(function(current){return current==="error"?current:"idle";});};var offer=await pc.createOffer();await pc.setLocalDescription(offer);return{pc:pc,offer:offer};})();
      var pair=await Promise.all([peerPromise,sessionPromise]),peerData:any=pair[0],tokenData:any=pair[1];
      phase="webrtc";
      var sdpRes=await fetch("https://api.openai.com/v1/realtime/calls",{method:"POST",headers:{Authorization:"Bearer "+tokenData.value,"Content-Type":"application/sdp"},signal:controller.signal,body:peerData.offer.sdp||""});
      if(!sdpRes.ok){statusCode=sdpRes.status;serverMessage=await sdpRes.text();var sdpError:any=new Error(serverMessage||("Errore OpenAI "+sdpRes.status));sdpError.httpStatus=sdpRes.status;throw sdpError;}
      await peerData.pc.setRemoteDescription({type:"answer",sdp:await sdpRes.text()});setRealtimeMicEnabled(true);
    }catch(e){
      if(connectionTimer)clearTimeout(connectionTimer);statusCode=Number((e&&e.httpStatus)||statusCode)||0;serverMessage=String((e&&e.serverMessage)||serverMessage||"");
      disconnectRealtime("error");showTemporaryVoiceNotice(realtimeFailureMessage(e,phase,statusCode,serverMessage),6200);setBusy(false);
    }
  }
  function toggleRealtimeMicrophone(){var stream=realtimeStreamRef.current;if(!stream)return;var next=!realtimeMicEnabled;stream.getAudioTracks().forEach(function(t){t.enabled=next;});try{var processed=microphoneProcessedStreamRef.current;if(processed)processed.getAudioTracks().forEach(function(t){t.enabled=next;});}catch(e){}setRealtimeMicEnabled(next);setVoiceListening(false);}
  function sendRealtimeText(q:string){lastVoiceUserRequestRef.current=String(q||"");if(!sendRealtimeEvent({type:"conversation.item.create",item:{type:"message",role:"user",content:[{type:"input_text",text:q}]}}))return false;sendRealtimeEvent({type:"response.create"});setBusy(true);return true;}
  function stopSpeaking(){
    speechCycleRef.current+=1;
    try{if(speechAbortRef.current)speechAbortRef.current.abort();}catch(e){}speechAbortRef.current=null;
    try{var audio=nativeAudioRef.current;if(audio){audio.onended=null;audio.onerror=null;audio.pause();if(audio.src&&String(audio.src).startsWith("blob:"))URL.revokeObjectURL(audio.src);}}catch(e){}nativeAudioRef.current=null;
    try{var tts=nativeTtsRef.current;if(tts&&tts.stop)Promise.resolve(tts.stop()).catch(function(){});}catch(e){}
    try{if(typeof window!=="undefined"&&window.speechSynthesis)window.speechSynthesis.cancel();}catch(e){}
    if(mountedRef.current)setSpeaking(false);
  }
  function resumeListeningAfterSpeech(resume,cycle){if(resume&&continuous&&voiceModal&&mountedRef.current&&cycle===speechCycleRef.current)setTimeout(function(){if(cycle===speechCycleRef.current)startListening();},280);}
  async function speakFallback(clean,resume,cycle){
    try{
      if(cycle!==speechCycleRef.current)return;
      if(nativePlatform()){
        var tts=nativeTtsRef.current;
        if(!tts){var mod:any=await import("@capacitor-community/text-to-speech");tts=mod.TextToSpeech||mod.default||mod;nativeTtsRef.current=tts;}
        if(cycle!==speechCycleRef.current||!tts||!tts.speak)return;
        try{if(tts.stop)await tts.stop();}catch(e){}
        if(cycle!==speechCycleRef.current)return;setSpeaking(true);
        await tts.speak({text:clean,lang:localeMap[lang]||"it-IT",rate:1.02,pitch:1,volume:assistantVolumeRef.current,category:"ambient",queueStrategy:0});
        if(cycle!==speechCycleRef.current||!mountedRef.current)return;setSpeaking(false);resumeListeningAfterSpeech(resume,cycle);return;
      }
      if(typeof window==="undefined"||!window.speechSynthesis||typeof SpeechSynthesisUtterance==="undefined"){resumeListeningAfterSpeech(resume,cycle);return;}
      window.speechSynthesis.cancel();var u=new SpeechSynthesisUtterance(clean);u.lang=localeMap[lang]||"it-IT";u.rate=1.02;u.pitch=1;u.volume=assistantVolumeRef.current;
      u.onstart=function(){if(mountedRef.current&&cycle===speechCycleRef.current)setSpeaking(true);};
      u.onend=function(){if(!mountedRef.current||cycle!==speechCycleRef.current)return;setSpeaking(false);resumeListeningAfterSpeech(resume,cycle);};
      u.onerror=function(){if(!mountedRef.current||cycle!==speechCycleRef.current)return;setSpeaking(false);resumeListeningAfterSpeech(resume,cycle);};
      window.speechSynthesis.speak(u);
    }catch(e){if(mountedRef.current&&cycle===speechCycleRef.current){setSpeaking(false);resumeListeningAfterSpeech(resume,cycle);}}
  }
  async function speak(text,resume){
    var clean=cleanSpeechText(text);if(!clean)return;
    stopSpeaking();var cycle=++speechCycleRef.current;
    try{
      var token="";if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();if(cycle!==speechCycleRef.current)return;
      var headers:any={"Content-Type":"application/json"};if(token)headers.Authorization="Bearer "+token;
      var ctrl=new AbortController();speechAbortRef.current=ctrl;if(mountedRef.current)setSpeaking(true);
      var timer=setTimeout(function(){ctrl.abort();},30000);
      var res=await fetch(AI_VOICE_ENDPOINT,{method:"POST",headers:headers,signal:ctrl.signal,body:JSON.stringify({text:clean,language:lang||"it"})}).finally(function(){clearTimeout(timer);});
      if(cycle!==speechCycleRef.current)return;if(!res.ok)throw new Error("Natural voice unavailable");
      var blob=await res.blob();if(cycle!==speechCycleRef.current)return;if(!blob||!blob.size)throw new Error("Empty voice response");
      var url=URL.createObjectURL(blob);var audio=new Audio(url);nativeAudioRef.current=audio;audio.preload="auto";audio.volume=assistantVolumeRef.current;audio.muted=assistantVolumeRef.current<=0;
      audio.onended=function(){try{URL.revokeObjectURL(url);}catch(e){}if(nativeAudioRef.current===audio)nativeAudioRef.current=null;if(!mountedRef.current||cycle!==speechCycleRef.current)return;setSpeaking(false);resumeListeningAfterSpeech(resume,cycle);};
      audio.onerror=function(){try{URL.revokeObjectURL(url);}catch(e){}if(nativeAudioRef.current===audio)nativeAudioRef.current=null;if(!mountedRef.current||cycle!==speechCycleRef.current)return;setSpeaking(false);speakFallback(clean,resume,cycle);};
      await audio.play();
    }catch(e){speechAbortRef.current=null;if(!mountedRef.current||cycle!==speechCycleRef.current)return;setSpeaking(false);await speakFallback(clean,resume,cycle);}
  }
  function finishListening(text){var q=String(text||"").trim();setVoiceListening(false);if(q){setInput(q);setTimeout(function(){sendMessage(q);},60);}}
  async function finishNativeListening(){if(nativeSessionDoneRef.current)return;nativeSessionDoneRef.current=true;var q=String(nativeTextRef.current||"").trim();try{var p=nativeSpeechRef.current;if(p&&p.getLastPartialResult){var last=await p.getLastPartialResult();q=String((last&&last.text)||((last&&last.matches&&last.matches[0])||q)||"").trim();}}catch(e){}finishListening(q);}
  function stopListening(submitPartial){setVoiceListening(false);try{var p=nativeSpeechRef.current;if(p){if(submitPartial&&p.forceStop)Promise.resolve(p.forceStop({timeout:1200})).then(finishNativeListening).catch(finishNativeListening);else if(p.stop)Promise.resolve(p.stop()).catch(function(){});}}catch(e){}try{if(webRecognitionRef.current)webRecognitionRef.current.stop();}catch(e){}webRecognitionRef.current=null;}
  async function startNativeListening(){
    var mod:any=await import("@capgo/capacitor-speech-recognition");var SpeechRecognition:any=mod.SpeechRecognition||mod.default||mod;if(!SpeechRecognition||!SpeechRecognition.start)throw new Error("SpeechRecognition unavailable");
    nativeSpeechRef.current=SpeechRecognition;nativeTextRef.current="";nativeSessionDoneRef.current=false;
    var available=SpeechRecognition.available?await SpeechRecognition.available():{available:true};if(available&&available.available===false)throw new Error("SpeechRecognition unavailable");
    var permission=SpeechRecognition.checkPermissions?await SpeechRecognition.checkPermissions():{};var state=String((permission&&permission.speechRecognition)||"").toLowerCase();if(state!=="granted"){permission=SpeechRecognition.requestPermissions?await SpeechRecognition.requestPermissions():permission;state=String((permission&&permission.speechRecognition)||"").toLowerCase();}if(state&&state!=="granted")throw new Error("Microphone permission denied");
    try{if(SpeechRecognition.removeAllListeners)await SpeechRecognition.removeAllListeners();}catch(e){}
    if(SpeechRecognition.addListener){
      await SpeechRecognition.addListener("partialResults",function(data:any){var matches=(data&&data.matches)||[];var t=String((data&&data.accumulatedText)||matches[0]||(data&&data.accumulated)||"").trim();if(t){nativeTextRef.current=t;setInput(t);}});
      await SpeechRecognition.addListener("listeningState",function(data:any){var stopped=(data&&data.status==="stopped")||(data&&data.state==="stopped");if(stopped)setTimeout(finishNativeListening,100);});
      await SpeechRecognition.addListener("error",function(data:any){var code=String((data&&data.code)||"");if(code&&code!=="no-match")setVoiceError(code==="permission-denied"?V.unavailable:String((data&&data.message)||V.unavailable));setTimeout(finishNativeListening,80);});
    }
    var res:any=await SpeechRecognition.start({language:localeMap[lang]||"it-IT",maxResults:3,partialResults:true,popup:false,prompt:V.speak,addPunctuation:true,allowForSilence:1300});var matches=(res&&res.matches)||[];if(matches[0]){nativeTextRef.current=String(matches[0]);setInput(String(matches[0]));}
  }
  function startWebListening(){var SR:any=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!SR)throw new Error("SpeechRecognition unavailable");var rec=new SR();webRecognitionRef.current=rec;rec.lang=localeMap[lang]||"it-IT";rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=3;var last="";rec.onresult=function(ev:any){var out="";for(var i=ev.resultIndex;i<ev.results.length;i++)out+=ev.results[i][0].transcript;last=out.trim();if(last)setInput(last);};rec.onerror=function(ev:any){setVoiceListening(false);if(ev&&ev.error!=="no-speech"&&ev.error!=="aborted")setVoiceError(V.unavailable);};rec.onend=function(){webRecognitionRef.current=null;finishListening(last);};rec.start();}
  async function startListening(){if(busy||aiLoading||voiceListening)return;stopSpeaking();setVoiceError("");setInput("");setVoiceListening(true);try{if(nativePlatform())await startNativeListening();else startWebListening();}catch(e){setVoiceListening(false);setVoiceError(V.unavailable);}}
  function interruptAndListen(){stopSpeaking();setVoiceError("");setTimeout(function(){if(mountedRef.current)startListening();},90);}
  function compressFinanceImage(dataUrl:string){return new Promise<string>(function(resolve,reject){try{var img=new Image();img.onload=function(){try{var maxSide=1800,w=img.width||1,h=img.height||1,scale=Math.min(1,maxSide/Math.max(w,h)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));var ctx2=canvas.getContext("2d");if(!ctx2)throw new Error("Canvas non disponibile.");ctx2.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",0.84));}catch(e){reject(e);}};img.onerror=function(){reject(new Error("Immagine non leggibile."));};img.src=dataUrl;}catch(e){reject(e);}});}
  function readFinanceFile(file:any){return new Promise<string>(function(resolve,reject){if(!file){reject(new Error("Nessuna foto selezionata."));return;}if(file.size&&file.size>18*1024*1024){reject(new Error("La foto supera 18 MB. Riducila e riprova."));return;}var reader=new FileReader();reader.onload=function(){compressFinanceImage(String(reader.result||"")).then(resolve).catch(reject);};reader.onerror=function(){reject(new Error("Non riesco a leggere la foto selezionata."));};reader.readAsDataURL(file);});}
  function readFinanceDocumentFile(file:any){return new Promise<any>(function(resolve,reject){if(!file){reject(new Error("Nessun documento selezionato."));return;}if(file.size&&file.size>12*1024*1024){reject(new Error("Il documento supera 12 MB."));return;}var allowed=/\.(pdf|doc|docx|rtf|txt|csv|xls|xlsx|json|xml|ods|odt)$/i.test(String(file.name||""))||/pdf|word|officedocument|spreadsheet|excel|csv|text|json|xml|rtf|opendocument/i.test(String(file.type||""));if(!allowed){reject(new Error("Formato non supportato. Usa PDF, Word, Excel, CSV o un file di testo."));return;}var reader=new FileReader();reader.onload=function(){resolve({dataUrl:String(reader.result||""),name:String(file.name||"documento"),mimeType:String(file.type||"application/octet-stream")});};reader.onerror=function(){reject(new Error("Non riesco a leggere il documento selezionato."));};reader.readAsDataURL(file);});}
  async function analyzeFinanceDocument(fileDataUrl:string,fileName?:string,fileMimeType?:string,isImage?:boolean){
    if(documentLoading||busy||aiLoading)return;
    if(!aiExternalConsent){setVoiceError(V.consentTitle);return;}
    if(canUsePlanFeature&&!canUsePlanFeature("receiptScan",1)){setVoiceError(upgradeMessage?upgradeMessage("receiptScan"):"Hai raggiunto il limite di scansione documenti.");return;}
    activeAttachmentRef.current={dataUrl:fileDataUrl,name:fileName||"documento",mimeType:fileMimeType||(isImage!==false?"image/jpeg":"application/octet-stream"),isImage:isImage!==false,createdAt:Date.now()};
    var wasMicEnabled=realtimeMicEnabled,stream=realtimeStreamRef.current;
    if(stream&&wasMicEnabled)try{stream.getAudioTracks().forEach(function(t){t.enabled=false;});setRealtimeMicEnabled(false);}catch(e){}
    sendRealtimeEvent({type:"response.cancel"});sendRealtimeEvent({type:"output_audio_buffer.clear"});
    setAttachmentMenuOpen(false);setDocumentLoading(true);setBusy(true);setAiLoading(true);setVoiceError("");
    appendMessage("user","📎 Allegato"+(fileName?" · "+fileName:""));
    try{
      var token="";if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();
      var headers:any={"Content-Type":"application/json"};if(token)headers.Authorization="Bearer "+token;
      var ctrl=new AbortController();assistantRequestAbortRef.current=ctrl;var timer=setTimeout(function(){ctrl.abort();},70000);
      var payload:any={
        mode:"assistant",
        question:"Rispondi esclusivamente in "+languageName(lang||"it")+". Leggi davvero il contenuto dell’allegato. Se contiene una spesa, uno scontrino, una bolletta o una fattura, non inviare un semplice riepilogo: prepara direttamente una proposta create_expense pronta per la conferma, usando soltanto importo, data del documento, descrizione, categoria suggerita e metodo predefinito. Non aggiungere note tecniche, dati fiscali, numero documento, indirizzo, partita IVA, imponibile o IVA. Se contiene più entrate o più movimenti, estrai tutte le righe e proponi un’azione distinta per ciascuna. Non dire mai che non puoi leggere il file allegato.",
        language:lang||"it",
        aiDataAccess:aiDataAccess||"summary",
        financeContext:buildContext(),
        chatHistory:(aiChat||[]).filter(function(m){return m&&m.role==="user";}).slice(-8).map(function(m){return{role:"user",text:m.rawText||m.text};})
      };
      if(isImage!==false){payload.imageDataUrl=fileDataUrl;payload.imageName=fileName||"documento.jpg";}
      else{payload.fileDataUrl=fileDataUrl;payload.fileName=fileName||"documento";payload.fileMimeType=fileMimeType||"application/octet-stream";}
      var res=await fetch(AI_AGENT_ENDPOINT,{method:"POST",headers:headers,signal:ctrl.signal,body:JSON.stringify(payload)}).finally(function(){clearTimeout(timer);if(assistantRequestAbortRef.current===ctrl)assistantRequestAbortRef.current=null;});
      var data:any={};try{data=await res.json();}catch(e){}
      if(!res.ok)throw Object.assign(new Error((data&&data.error)||("Errore "+res.status)),{httpStatus:res.status});
      var answer=String((data&&data.answer)||"").trim(),actions=realtimeActionsFrom((data&&data.actions)||[]),opens=actions.filter(function(a){return a.action==="open_section";}),writes=actions.filter(function(a){return a.action!=="open_section";}).map(function(a){if(a.action==="create_expense"||a.action==="create_income"){return {...a,note:""};}return a;});
      if(consumePlanFeature){consumePlanFeature("receiptScan",1);consumePlanFeature("aiReply",1);}
      if(writes.length){updatePendingActions(writes);}
      else{
        if(answer){appendMessage("assistant",answer);speak(answer,false);}
        if(opens.length)setTimeout(function(){openSection(opens[0]);},80);
      }
    }catch(e){
      var msg=realtimeFailureMessage(e,"document",Number((e&&e.httpStatus)||0));setVoiceError(msg);appendMessage("assistant",msg);
    }finally{
      setDocumentLoading(false);setBusy(false);setAiLoading(false);
      if(stream&&wasMicEnabled)try{stream.getAudioTracks().forEach(function(t){t.enabled=true;});setRealtimeMicEnabled(true);}catch(e){}
    }
  }
  async function takeFinancePhoto(){setAttachmentMenuOpen(false);try{if(nativePlatform()){var mod:any=await import("@capacitor/camera");var photo=await mod.Camera.getPhoto({quality:84,allowEditing:false,resultType:mod.CameraResultType.DataUrl,source:mod.CameraSource.Camera,direction:mod.CameraDirection.Rear,saveToGallery:false,correctOrientation:true,promptLabelHeader:"Documento",promptLabelPhoto:"Scatta foto",promptLabelPicture:"Scatta foto"});if(photo&&photo.dataUrl){var compressed=await compressFinanceImage(String(photo.dataUrl));await analyzeFinanceDocument(compressed,"foto_"+Date.now()+".jpg","image/jpeg",true);return;}}if(cameraInputRef.current)cameraInputRef.current.click();}catch(e){var raw=String((e&&e.message)||"");if(!/cancel|cancell|user/i.test(raw))setVoiceError("Non riesco ad aprire la fotocamera.");}}
  async function chooseFinancePhoto(){setAttachmentMenuOpen(false);try{if(nativePlatform()){var mod:any=await import("@capacitor/camera");var photo=await mod.Camera.getPhoto({quality:84,allowEditing:false,resultType:mod.CameraResultType.DataUrl,source:mod.CameraSource.Photos,saveToGallery:false,correctOrientation:true,promptLabelHeader:"Foto",promptLabelPhoto:"Carica foto",promptLabelPicture:"Carica foto"});if(photo&&photo.dataUrl){var compressed=await compressFinanceImage(String(photo.dataUrl));await analyzeFinanceDocument(compressed,"foto_"+Date.now()+".jpg","image/jpeg",true);return;}}if(galleryInputRef.current)galleryInputRef.current.click();}catch(e){var raw=String((e&&e.message)||"");if(!/cancel|cancell|user/i.test(raw))setVoiceError("Non riesco a caricare la foto.");}}
  function chooseFinanceDocument(){setAttachmentMenuOpen(false);if(documentInputRef.current)documentInputRef.current.click();}
  async function onFinanceFileSelected(event:any){var file=event&&event.target&&event.target.files&&event.target.files[0];try{if(file){var dataUrl=await readFinanceFile(file);await analyzeFinanceDocument(dataUrl,file.name||"documento.jpg",file.type||"image/jpeg",true);}}catch(e){setVoiceError(String((e&&e.message)||"Non riesco a leggere la foto."));}finally{try{event.target.value="";}catch(e){}}}
  async function onFinanceDocumentSelected(event:any){var file=event&&event.target&&event.target.files&&event.target.files[0];try{if(file){var data=await readFinanceDocumentFile(file);await analyzeFinanceDocument(data.dataUrl,data.name,data.mimeType,false);}}catch(e){setVoiceError(String((e&&e.message)||"Non riesco a leggere il documento."));}finally{try{event.target.value="";}catch(e){}}}
  function monthKey(){return String(curMonthKey||todayStr().slice(0,7));}
  function debtBalance(d){var total=Number(d&&d.initialAmount)||0;(d&&d.transactions||[]).forEach(function(t){var n=Number(t.amount)||0;total+=t.action==="increase"?n:-n;});return Math.max(0,total);}
  function buildContext(){
    var mk=monthKey();var monthExpenses=(expenses||[]).filter(function(x){return String(x.date||"").slice(0,7)===mk;});var monthIncomes=(incomes||[]).filter(function(x){return String(x.date||"").slice(0,7)===mk;});
    var expM=monthExpenses.reduce(function(a,x){return a+(Number(x.amount)||0);},0),incM=monthIncomes.reduce(function(a,x){return a+(Number(x.amount)||0);},0);var pv=patrimonioValues&&patrimonioValues[mk]||{};var patrimonioTotal=Object.keys(pv||{}).reduce(function(a,k){return a+(Number(pv[k])||0);},0);
    var ctx:any={app:"fAInance",today:todayStr(),language:lang||"it",dataAccessLevel:aiDataAccess||"summary",plan:currentPlan||"free",
      defaults:{date:todayStr(),expenseCategory:(cats||[]).find(function(x){return String(x.id)===String(defaultExpenseCat);})?.name||"",expenseMethod:(methods||[]).find(function(x){return String(x.id)===String(defaultExpenseMethod);})?.name||"",incomeType:(incomeTypes||[]).find(function(x){return String(x.id)===String(defaultIncomeType);})?.name||"",shoppingArea:shoppingDefaultArea||""},
      settings:{appearance:bgTheme||"default",buttonStyle:btnStyle||"soft",topBar:showAppSummaryHeader!==false,bottomBarIcons:Math.max(3,Math.min(7,Number(mobileNavIconCount)||5)),bottomBarOrder:mobileNavOrder||[],menuOrder:mobileMenuOrder||[],homeBalanceView:homeBalanceView||"rateizzato",statisticsView:statsView||"rateizzato",dateFormat:dateFmt||"dmy",firstDayOfWeek:firstDayOfWeek||"mon",secondaryCurrency:{history:!!showSecInHistory,statistics:!!showSecInStats,budget:!!showSecInBudget,patrimonio:!!showSecInPatrimonio},history:{futureMode:historyFutureMode,sortDate:historySortDate,sortDirection:historySortDirection,secondary:historySortSecondary,secondaryDirection:historySortSecondaryDirection},showShareInHistory:!!showShareInHistory,showDebtCreditsInPatrimonio:!!showDebtCreditsInPatrimonio,showDebtCreditsInExpenses:!!showDebtCreditsInExpenses,shoppingProductSort:shoppingProductSort||"custom",shoppingDefaultArea:shoppingDefaultArea||"",patrimonioMode:patrimonioMode||"manuale",aiDataAccess:aiDataAccess||"summary",aiFloatingEnabled:!!aiFloatingEnabled},
      totals:{month:mk,expenses:expM,incomes:incM,balance:incM-expM,patrimonio:patrimonioTotal},
      dataQuality:{expensesCount:(expenses||[]).length,incomesCount:(incomes||[]).length,recurringCount:(recurring||[]).length,goalsCount:(goals||[]).length,alertsCount:(alerts||[]).length,debtCreditsCount:(debtCredits||[]).length,shoppingOpenItems:(shoppingItems||[]).filter(function(x){return !x.archived&&!x.bought;}).length},
      catalogs:{categories:(cats||[]).filter(function(x){return !x.archived;}).map(function(x){return{id:String(x.id),name:x.name,groupId:String(x.group||"")};}),expenseGroups:(expenseGroups||[]).map(function(x){return{id:String(x.id),name:x.name};}),methods:(methods||[]).filter(function(x){return !x.archived;}).map(function(x){return{id:String(x.id),name:x.name,groupId:String(x.group||"")};}),methodGroups:(methodGroups||[]).map(function(x){return{id:String(x.id),name:x.name};}),incomeTypes:(incomeTypes||[]).map(function(x){return{id:String(x.id),name:x.name};}),shoppingAreas:(shoppingAreas||[]).slice(0,50),patrimonioAreas:(patrimonioAreas||[]).map(function(x){return{id:String(x.id),name:x.name};}),patrimonioEntries:(patrimonioEntries||[]).map(function(x){return{id:String(x.id),name:x.name,areaId:String(x.areaId||"")};}),sections:["home","expenses","incomes","recurring","history","statistics","budget","goals","alerts","patrimonio","debtCredits","shopping","share","appunti","settings","ai"]}};
    if(aiDataAccess==="areas"||aiDataAccess==="full"){var byCat:any={},byArea:any={};monthExpenses.forEach(function(x){var cat=(cats||[]).find(function(y){return String(y.id)===String(x.catId);});var cn=cat?cat.name:"Altro",gid=cat?String(cat.group||"altro"):"altro",grp=(expenseGroups||[]).find(function(g){return String(g.id)===gid;});var gn=grp?grp.name:gid,n=Number(x.amount)||0;byCat[cn]=(byCat[cn]||0)+n;byArea[gn]=(byArea[gn]||0)+n;});ctx.topExpenseCategories=Object.keys(byCat).map(function(k){return{name:k,amount:byCat[k]};}).sort(function(a,b){return b.amount-a.amount;}).slice(0,12);ctx.expenseAreas=Object.keys(byArea).map(function(k){return{name:k,amount:byArea[k]};}).sort(function(a,b){return b.amount-a.amount;});}
    if(aiDataAccess==="full"){
      ctx.goals=(goals||[]).map(function(g){return{name:g.name,target:Number(g.target)||0,saved:Number(g.saved)||0,deadline:g.deadline||"",period:g.period||"annual"};});
      ctx.alerts=(alerts||[]).map(function(a){var target=a.type==="cat"?(cats||[]).find(function(x){return String(x.id)===String(a.catId);}):(expenseGroups||[]).find(function(x){return String(x.id)===String(a.groupId);});return{name:a.name,type:a.type,target:target?target.name:"",budget:Number(a.budget)||0,period:a.period||"monthly"};});
      ctx.debtCredits=(debtCredits||[]).map(function(d){return{kind:d.kind,holder:d.holder,balance:debtBalance(d),startDate:d.startDate||"",endDate:d.estimatedEndDate||"",note:d.note||""};});
      ctx.shopping={activeListId:activeShoppingListId||"main",lists:(shoppingLists||[]).map(function(x){return{id:String(x.id),title:x.title||""};}),activeItems:(shoppingItems||[]).filter(function(x){return !x.archived&&!x.bought;}).slice(0,100).map(function(x){return{name:x.name,area:x.area||"",quantity:x.qty||"1",unit:x.unit||"unità",listId:String(x.listId||"main")};})};
      ctx.budget=budgetPlan||{};ctx.recurring=(recurring||[]).slice(0,80).map(function(x){return{name:x.name,type:x.rtype,amount:Number(x.amount)||0,frequency:x.frequency||"monthly",dayOfMonth:x.dayOfMonth||1};});ctx.patrimonio=(patrimonioEntries||[]).map(function(x){return{name:x.name,areaId:x.areaId,value:Number(pv[String(x.id)])||0};});ctx.notes=(appuntiNotes||[]).slice(0,40).map(function(x){return{title:x.title||"",text:String(x.text||"").slice(0,500)};});ctx.shareProjects=(shareProjects||[]).slice(0,40).map(function(x){var activeParticipants=(x.participants||[]).filter(function(p){return String(p.status||"active")!=="archived";});return{id:String(x.id||""),name:x.name,description:x.description||"",participants:activeParticipants.map(function(p){return{id:String(p.id||""),name:p.name||p.displayName||p.email||"",role:p.role||"member",status:p.status||"active",kind:p.kind||p.type||"",isCurrent:String(p.uid||"")===String(userId||"")||String(p.id||"")==="me"};}),expensesCount:(x.activities||[]).filter(function(a){return a&&a.kind!=="settlement";}).length,settlementsCount:(x.activities||[]).filter(function(a){return a&&a.kind==="settlement";}).length};});
      ctx.transactions={expenses:(expenses||[]).slice(0,500).map(function(x){var cat=(cats||[]).find(function(y){return String(y.id)===String(x.catId);});var met=(methods||[]).find(function(y){return String(y.id)===String(x.methodId);});return{date:x.date,amount:Number(x.amount)||0,description:x.desc||"",category:cat?cat.name:"",method:met?met.name:""};}),incomes:(incomes||[]).slice(0,300).map(function(x){var it=(incomeTypes||[]).find(function(y){return String(y.id)===String(x.type);});return{date:x.date,amount:Number(x.amount)||0,description:x.desc||"",type:it?it.name:String(x.type||"")};})};
    }
    return ctx;
  }
  function normalized(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();}
  function booleanValue(v,def){var n=normalized(v);if(["true","1","si","sì","yes","on","show","mostra","visible","attiva","attivo"].indexOf(n)>=0)return true;if(["false","0","no","off","hide","nascondi","hidden","disattiva","disattivo"].indexOf(n)>=0)return false;return def;}
  function validISODate(value,allowEmpty){var raw=String(value||"").trim();if(!raw)return allowEmpty?"":todayStr();if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new Error("Data non valida.");var p=raw.split("-").map(Number),d=new Date(p[0],p[1]-1,p[2]);if(d.getFullYear()!==p[0]||d.getMonth()!==p[1]-1||d.getDate()!==p[2])throw new Error("Data non valida.");return raw;}
  function findNamed(list,name,fallbackId){var active=(list||[]).filter(function(x){return !x.archived;}),n=normalized(name);if(n){var exact=active.find(function(x){return normalized(x.name)===n;});if(exact)return exact;var fuzzy=active.filter(function(x){var xn=normalized(x.name);return xn&&(xn.indexOf(n)>=0||n.indexOf(xn)>=0);});return fuzzy.length===1?fuzzy[0]:null;}var fallback=active.find(function(x){return fallbackId!==undefined&&String(x.id)===String(fallbackId);});return fallback||active[0]||null;}
  function findUniqueByName(list,name,key){var n=normalized(name),field=key||"name";if(!n)return null;var exact=(list||[]).find(function(x){return normalized(x[field])===n;});if(exact)return exact;var fuzzy=(list||[]).filter(function(x){var xn=normalized(x[field]);return xn&&(xn.indexOf(n)>=0||n.indexOf(xn)>=0);});return fuzzy.length===1?fuzzy[0]:null;}
  function shareRound(value){return Math.round((Number(value)||0)*100)/100;}
  function shareParticipantLabel(p){return String((p&&(p.name||p.displayName||p.email||p.phone))||"").trim();}
  function resolveShareProject(name){var active=(shareProjects||[]).filter(function(x){return x&&!x.archived;});var requested=String(name||"").trim();if(requested){var found=findUniqueByName(active,requested,"name");if(!found)throw new Error("Progetto Share non trovato o nome ambiguo.");return found;}if(active.length===1)return active[0];throw new Error(active.length?"Specifica il progetto Share.":"Non ci sono progetti Share disponibili.");}
  function activeShareParticipants(project){return (project&&project.participants||[]).filter(function(p){return p&&String(p.status||"active")!=="archived";});}
  function resolveShareParticipant(participants,name,allowCurrent){var requested=String(name||"").trim(),current=(participants||[]).find(function(p){return String(p.uid||"")===String(userId||"")||String(p.id||"")==="me";});if(requested){var n=normalized(requested);if(["io","me","myself","utente corrente","current user","moi","yo","ich","eu"].indexOf(n)>=0&&current)return current;var exact=(participants||[]).find(function(p){return normalized(shareParticipantLabel(p))===n;});if(exact)return exact;var fuzzy=(participants||[]).filter(function(p){var pn=normalized(shareParticipantLabel(p));return pn&&(pn.indexOf(n)>=0||n.indexOf(pn)>=0);});if(fuzzy.length===1)return fuzzy[0];throw new Error("Partecipante Share non trovato o nome ambiguo: "+requested);}if(allowCurrent&&current)return current;return null;}
  function buildShareSplits(total,participants,specs,mode){var amount=shareRound(total),selected:any[]=[];(specs||[]).forEach(function(spec){var p=resolveShareParticipant(participants,spec&&spec.name,false);if(p&&!selected.some(function(x){return String(x.p.id)===String(p.id);}))selected.push({p:p,spec:spec});});if(!selected.length)selected=(participants||[]).map(function(p){return{p:p,spec:{}};});if(!selected.length)throw new Error("Il progetto Share non ha partecipanti attivi.");var shares:any={},current=resolveShareParticipant(participants,"",true);var splitMode=mode==="amount"||mode==="percent"?mode:"equal";if(splitMode==="amount"){var sum=0,missing:any[]=[];selected.forEach(function(x){var raw=x.spec&&x.spec.amount;if(raw===null||raw===undefined||raw===""){missing.push(x);return;}var n=shareRound(raw);if(!(n>=0))throw new Error("Quota Share non valida per "+shareParticipantLabel(x.p)+".");shares[String(x.p.id)]=n;sum=shareRound(sum+n);});if(!missing.length&&sum<amount-0.01&&current&&!selected.some(function(x){return String(x.p.id)===String(current.id);})){selected.push({p:current,spec:{}});missing.push(selected[selected.length-1]);}if(missing.length===1){var remainder=shareRound(amount-sum);if(remainder<0)throw new Error("Le quote Share superano l’importo totale.");shares[String(missing[0].p.id)]=remainder;sum=shareRound(sum+remainder);}else if(missing.length>1)throw new Error("Specifica una sola quota mancante oppure tutte le quote Share.");if(Math.abs(sum-amount)>0.01)throw new Error("Le quote Share devono sommare all’importo totale.");return{shares:shares,mode:"amount"};}if(splitMode==="percent"){var pctSum=0,missingPct:any[]=[];selected.forEach(function(x){var raw=x.spec&&x.spec.percent;if(raw===null||raw===undefined||raw===""){missingPct.push(x);return;}var pct=Number(raw);if(!Number.isFinite(pct)||pct<0)throw new Error("Percentuale Share non valida per "+shareParticipantLabel(x.p)+".");x.pct=pct;pctSum+=pct;});if(!missingPct.length&&pctSum<99.99&&current&&!selected.some(function(x){return String(x.p.id)===String(current.id);})){var added={p:current,spec:{},pct:100-pctSum};selected.push(added);missingPct.push(added);}if(missingPct.length===1){missingPct[0].pct=100-pctSum;pctSum=100;}else if(missingPct.length>1)throw new Error("Specifica una sola percentuale mancante oppure tutte le percentuali Share.");if(Math.abs(pctSum-100)>0.01)throw new Error("Le percentuali Share devono sommare a 100.");var assigned=0;selected.forEach(function(x,i){var pct=Number(x.pct!==undefined?x.pct:(x.spec&&x.spec.percent))||0,n=i===selected.length-1?shareRound(amount-assigned):shareRound(amount*pct/100);shares[String(x.p.id)]=n;assigned=shareRound(assigned+n);});return{shares:shares,mode:"percent"};}var base=Math.floor((amount/selected.length)*100)/100,assigned2=0;selected.forEach(function(x,i){var n=i===selected.length-1?shareRound(amount-assigned2):base;shares[String(x.p.id)]=n;assigned2=shareRound(assigned2+n);});return{shares:shares,mode:"equal"};}
  function resolveArea(name){var n=normalized(name);return (shoppingAreas||[]).find(function(x){return normalized(x)===n;})||(shoppingAreas||[]).find(function(x){return n&&(normalized(x).indexOf(n)>=0||n.indexOf(normalized(x))>=0);})||shoppingDefaultArea||(shoppingAreas||[])[0]||"Altro";}
  function actionSummary(a){
    if(a&&a.action==="create_expense"){
      var expenseCat=String(a.categoryName||((cats||[]).find(function(x){return String(x.id)===String(defaultExpenseCat);})||{}).name||"Predefinita");
      var expenseMethod=String(a.methodName||((methods||[]).find(function(x){return String(x.id)===String(defaultExpenseMethod);})||{}).name||"Predefinito");
      return ["Importo: € "+Number(a.amount||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}),"Data: "+String(a.date||todayStr()),"Descrizione: "+String(a.description||"Spesa"),"Categoria: "+expenseCat,"Metodo: "+expenseMethod,a.note?"Dettagli: "+String(a.note):""].filter(Boolean).join("\n");
    }
    if(a&&a.action==="create_income"){
      var incomeType=String(a.incomeTypeName||((incomeTypes||[]).find(function(x){return String(x.id)===String(defaultIncomeType);})||{}).name||"Predefinita");
      return ["Importo: € "+Number(a.amount||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}),"Data: "+String(a.date||todayStr()),"Descrizione: "+String(a.description||"Entrata"),"Tipo: "+incomeType,a.note?"Dettagli: "+String(a.note):""].filter(Boolean).join("\n");
    }
    if(a&&a.summary)return a.summary;
    var m:any={create_recurring:"Ricorrente",create_goal:"Obiettivo",update_goal_saved:"Aggiornamento obiettivo",create_alert:"Alert",set_category_budget:"Budget",create_debt_credit:"Debito / Credito",update_debt_credit:"Transazione Debito / Credito",delete_debt_credit:"Elimina Debito / Credito",set_patrimonio_value:"Patrimonio",create_note:"Appunto",add_shopping_items:"Lista della spesa",create_shopping_list:"Nuova lista",create_share_project:"Progetto Share",create_share_expense:"Spesa Share",create_share_settlement:"Saldo Share",create_expense_category:"Categoria",create_payment_method:"Metodo",set_setting:"Impostazione"};
    return (m[a.action]||a.action||"Operazione")+(a.entityName||a.goalName||a.alertName||a.holder||a.assetName||a.listTitle||a.projectName||a.settingName?" · "+(a.entityName||a.goalName||a.alertName||a.holder||a.assetName||a.listTitle||a.projectName||a.settingName):"")+(a.amount!=null?" · "+a.amount:"");
  }
  function addShoppingRecords(specs,listId){var items=(specs||[]).filter(function(x){return String(x.name||"").trim();});if(!items.length)throw new Error("Nessun prodotto valido.");var activeCount=(shoppingItems||[]).filter(function(x){return !x.archived&&String(x.listId||"main")===String(listId);}).length;var lim=PLAN_LIMITS&&PLAN_LIMITS[currentPlan]?PLAN_LIMITS[currentPlan].shoppingListItems:Infinity;if(lim!==Infinity&&activeCount+items.length>Number(lim))throw new Error(upgradeMessage?upgradeMessage("shoppingListItems"):"Limite della lista della spesa raggiunto.");setShoppingItems(function(source){var next=Array.isArray(source)?source.slice():[],added:any[]=[];items.forEach(function(spec,idx){var name=String(spec.name||"").trim(),area=resolveArea(spec.area),catalog=next.find(function(x){return x.archived&&normalized(x.name)===normalized(name)&&normalized(x.area)===normalized(area);}),catalogId=catalog?String(catalog.productId||catalog.id):("prod_"+Date.now()+"_"+idx+"_"+Math.floor(Math.random()*9999));if(!catalog)next.push({id:catalogId,productId:catalogId,name:name,area:area,note:spec.note||"",qty:String(spec.quantity||"1"),unit:spec.unit||"unità",bought:false,archived:true,listId:"",order:Date.now()+idx,createdAt:new Date().toISOString(),catalogOnly:true,usageCount:1});added.push({id:"shop_"+Date.now()+"_"+idx+"_"+Math.floor(Math.random()*9999),productId:catalogId,name:name,area:area,note:spec.note||"",qty:String(spec.quantity||"1"),unit:spec.unit||"unità",bought:false,archived:false,listId:String(listId||"main"),order:Date.now()+idx,createdAt:new Date().toISOString(),catalogOnly:false});});return added.concat(next);});}
  function executeAction(a){
    var shareSignal=[a&&a.summary,a&&a.description,a&&a.projectName].join(" ").toLowerCase();if(a&&a.action==="create_expense"&&/(spesa condivisa|spesa share|share expense|shared expense|split expense|divid|nel progetto|progetto share)/i.test(shareSignal))return executeAction({...a,action:"create_share_expense"});
    if(a.action==="create_expense"){var amount=Number(a.amount)||0;if(amount<=0)throw new Error("Importo non valido.");var cat=findNamed(cats,a.categoryName,defaultExpenseCat),method=findNamed(methods,a.methodName,defaultExpenseMethod);if(!cat)throw new Error("Categoria non trovata o ambigua.");if(!method)throw new Error("Metodo di pagamento non trovato o ambiguo.");var ok=addExpenses([{id:Date.now()+Math.random(),amount:amount,catId:cat.id,methodId:method.id,methodName:method.name,desc:a.description||cat.name,date:validISODate(a.date,false),rateizzato:!!a.rateizzato,rate:Math.max(1,Number(a.rate)||1)}],"assistant");if(ok===false)throw new Error("Non è stato possibile aggiungere l’uscita.");return actionSummary(a);}
    if(a.action==="create_income"){var amount2=Number(a.amount)||0;if(amount2<=0)throw new Error("Importo non valido.");var it=findNamed(incomeTypes,a.incomeTypeName,defaultIncomeType);if(!it)throw new Error("Tipo di entrata non trovato o ambiguo.");var ok2=addIncomes([{id:Date.now()+Math.random(),amount:amount2,type:it.id,desc:a.description||it.name,date:validISODate(a.date,false),rateizzato:!!a.rateizzato,rate:Math.max(1,Number(a.rate)||1)}],"assistant");if(ok2===false)throw new Error("Non è stato possibile aggiungere l’entrata.");return actionSummary(a);}
    if(a.action==="create_recurring"){var ar=Number(a.amount)||0,nameR=String(a.recurringName||a.description||"").trim(),rtype=a.recurringType==="income"?"income":"expense";if(ar<=0||!nameR)throw new Error("Nome o importo della ricorrente non valido.");var rc=findNamed(cats,a.categoryName,defaultExpenseCat),rm=findNamed(methods,a.methodName,defaultExpenseMethod),ri=findNamed(incomeTypes,a.incomeTypeName,defaultIncomeType);if(rtype==="expense"&&(!rc||!rm))throw new Error("Categoria o metodo della ricorrente non valido.");if(rtype==="income"&&!ri)throw new Error("Tipo di entrata della ricorrente non valido.");setRecurring(function(p){return [{id:Date.now()+Math.random(),name:nameR,icon:a.icon||(rtype==="income"?"💰":"🔁"),rtype:rtype,amount:ar,catId:rc?rc.id:null,methodId:rm?rm.id:null,incomeType:ri?ri.id:null,dayOfMonth:Math.max(0,Math.min(31,Number(a.dayOfMonth)||1)),annualMonth:Math.max(1,Math.min(12,Number(a.annualMonth)||new Date().getMonth()+1)),rateizzato:!!a.rateizzato,rate:Math.max(1,Number(a.rate)||1),frequency:a.frequency==="annual"?"annual":"monthly",confirmed:[],skipped:[]}].concat(p||[]);});return actionSummary(a);}
    if(a.action==="create_goal"){var target=Number(a.target)||0,goalName=String(a.goalName||"").trim();if(!goalName||target<=0)throw new Error("Nome o importo dell’obiettivo non valido.");if(findUniqueByName(goals,goalName,"name"))throw new Error("Esiste già un obiettivo con questo nome.");if(canAddPlanItem&&!canAddPlanItem("goals",(goals||[]).length,1))throw new Error(upgradeMessage?upgradeMessage("goals"):"Limite obiettivi raggiunto.");setGoals(function(p){return [...(p||[]),{id:Date.now()+Math.random(),name:goalName,target:target,saved:Math.max(0,Number(a.saved)||0),deadline:validISODate(a.deadline,true),period:a.period==="monthly"?"monthly":"annual",icon:a.icon||"🎯",color:a.color||"#7F77DD"}];});return actionSummary(a);}
    if(a.action==="update_goal_saved"){var goal=findUniqueByName(goals,a.goalName,"name"),delta=Number(a.savedDelta)||0;if(!goal)throw new Error("Obiettivo non trovato o nome ambiguo.");if(!delta)throw new Error("Importo non valido.");setGoals(function(p){return (p||[]).map(function(g){return String(g.id)===String(goal.id)?{...g,saved:Math.max(0,(Number(g.saved)||0)+delta)}:g;});});return actionSummary(a);}
    if(a.action==="create_alert"){var ba=Number(a.budgetAmount)||Number(a.amount)||0;if(ba<=0)throw new Error("Budget dell’alert non valido.");var isGroup=a.alertScope==="group",targetA=isGroup?findNamed(expenseGroups,a.alertTargetName,null):findNamed(cats,a.alertTargetName,defaultExpenseCat);if(!targetA)throw new Error("Categoria o area dell’alert non trovata.");setAlerts(function(p){return [{id:Date.now()+Math.random(),name:String(a.alertName||("Alert "+targetA.name)).trim(),type:isGroup?"group":"cat",catId:isGroup?null:targetA.id,groupId:isGroup?targetA.id:null,budget:ba,triggerMode:a.triggerMode==="pct"?"pct":"immediate",triggerPct:Math.max(0,Math.min(200,Number(a.triggerPct)||0)),customText:a.customText||"",period:a.period==="annual"?"annual":"monthly"}].concat(p||[]);});return actionSummary(a);}
    if(a.action==="set_category_budget"){var bc=Number(a.budgetAmount)||Number(a.amount)||0,catB=findNamed(cats,a.categoryName||a.alertTargetName,defaultExpenseCat);if(!catB||bc<=0)throw new Error("Categoria o importo del budget non valido.");setBudgetPlan(function(prev){var base=prev&&typeof prev==="object"?prev:DEFAULT_BUDGET_PLAN,items=Array.isArray(base.items)?base.items.slice():[];var found=false;items=items.map(function(x){if(String(x.catId)===String(catB.id)){found=true;return{...x,amount:bc};}return x;});if(!found)items.push({catId:catB.id,amount:bc,pct:0});return{...base,items:items};});return actionSummary(a);}
    if(a.action==="create_debt_credit"){var da=Number(a.initialAmount)||Number(a.amount)||0,holder=String(a.holder||a.entityName||"").trim();if(da<=0||!holder)throw new Error("Persona o importo del Debito / Credito non valido.");if(canAddPlanItem&&!canAddPlanItem("debtCredits",(debtCredits||[]).length,1))throw new Error(upgradeMessage?upgradeMessage("debtCredits"):"Limite Debiti / Crediti raggiunto.");setDebtCredits(function(p){return [{id:"dc_"+Date.now(),kind:a.debtKind==="credit"?"credit":"debt",holder:holder,initialAmount:da,startDate:validISODate(a.startDate||a.date,false),estimatedEndDate:validISODate(a.endDate,true),note:a.note||a.description||"",transactions:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}].concat(p||[]);});return actionSummary(a);}
    if(a.action==="update_debt_credit"){var debt=findUniqueByName(debtCredits,a.holder||a.entityName,"holder"),txa=Number(a.amount)||0;if(!debt)throw new Error("Debito / Credito non trovato o nome ambiguo.");if(txa<=0)throw new Error("Importo non valido.");var tx={id:"tx_"+Date.now(),action:a.transactionMode==="increase"?"increase":"reduction",amount:txa,date:validISODate(a.date,false),startDate:debt.startDate||todayStr(),estimatedEndDate:a.endDate||debt.estimatedEndDate||"",note:a.note||a.description||"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};setDebtCredits(function(p){return (p||[]).map(function(x){return String(x.id)===String(debt.id)?{...x,transactions:[tx].concat(x.transactions||[]),updatedAt:new Date().toISOString()}:x;});});return actionSummary(a);}
    if(a.action==="delete_debt_credit"){var debtToDelete=findUniqueByName(debtCredits,a.holder||a.entityName,"holder");if(!debtToDelete)throw new Error("Debito / Credito non trovato o nome ambiguo.");setDebtCredits(function(p){return (p||[]).filter(function(x){return String(x.id)!==String(debtToDelete.id);});});a.holder=debtToDelete.holder;return actionSummary(a);}
    if(a.action==="set_patrimonio_value"){var value=Number(a.value);if(!Number.isFinite(value))throw new Error("Valore del patrimonio non valido.");var asset=findUniqueByName(patrimonioEntries,a.assetName||a.entityName,"name"),assetId=asset&&asset.id;if(!asset){var area=findNamed(patrimonioAreas,a.assetGroup,null)||(patrimonioAreas||[])[0];assetId="asset_"+Date.now();setPatrimonioEntries(function(p){return [...(p||[]),{id:assetId,name:String(a.assetName||a.entityName||"Patrimonio"),icon:a.icon||"📦",areaId:area?area.id:"altro"}];});}setPatrimonioValues(function(prev){var next={...(prev||{})},mk=monthKey();next[mk]={...(next[mk]||{}),[String(assetId)]:value};return next;});return actionSummary(a);}
    if(a.action==="create_note"){var title=String(a.noteTitle||a.entityName||"").trim(),text=String(a.noteText||a.note||a.description||"").trim();if(!title&&!text)throw new Error("Appunto vuoto.");setAppuntiNotes(function(p){return [{id:"note_"+Date.now(),title:title||text.slice(0,50),text:text,createdAt:new Date().toISOString()}].concat(p||[]);});return actionSummary(a);}
    if(a.action==="add_shopping_items"){var requested=String(a.listTitle||"").trim(),targetList=requested?findUniqueByName(shoppingLists,requested,"title"):((shoppingLists||[]).find(function(x){return String(x.id)===String(activeShoppingListId);})||(shoppingLists||[])[0]||{id:"main"});if(!targetList)throw new Error("Lista della spesa non trovata.");addShoppingRecords(a.items||[],targetList.id);return actionSummary(a);}
    if(a.action==="create_shopping_list"){var title=String(a.listTitle||a.entityName||"").trim();if(!title)throw new Error("Titolo della lista non valido.");var existing=findUniqueByName(shoppingLists,title,"title"),listId=existing?existing.id:("list_"+Date.now()+"_"+Math.floor(Math.random()*9999));if(!existing){var lim=PLAN_LIMITS&&PLAN_LIMITS[currentPlan]?PLAN_LIMITS[currentPlan].shoppingLists:Infinity;if(lim!==Infinity&&(shoppingLists||[]).length+1>Number(lim))throw new Error(upgradeMessage?upgradeMessage("shoppingLists"):"Limite liste della spesa raggiunto.");setShoppingLists(function(p){return [...(p||[]),{id:listId,title:title,icon:a.listIcon||a.icon||"🧺",createdAt:new Date().toISOString()}];});}setActiveShoppingListId(String(listId));if((a.items||[]).length)addShoppingRecords(a.items,listId);return actionSummary(a);}
    if(a.action==="create_share_project"){var pn=String(a.projectName||a.entityName||"").trim();if(!pn)throw new Error("Nome del progetto Share non valido.");var project=createShareProject(pn,a.projectDescription||a.description||"",a.projectIcon||a.icon||"🤝",a.projectColor||a.color||"#4F8FF7");if(!project)throw new Error("Non è stato possibile creare il progetto Share.");return actionSummary(a);}
    if(a.action==="create_share_expense"){var shareAmount=Number(a.amount)||0;if(shareAmount<=0)throw new Error("Importo della spesa Share non valido.");var shareProject=resolveShareProject(a.projectName),participants=activeShareParticipants(shareProject);if(!participants.length)throw new Error("Il progetto Share non ha partecipanti attivi.");var payer=resolveShareParticipant(participants,a.paidByName,true)||participants[0];var split=buildShareSplits(shareAmount,participants,a.shareParticipants||[],a.splitMode);var shareToday=(shareProject.activities||[]).filter(function(x){return x&&x.kind!=="settlement"&&String(x.createdAt||"").slice(0,10)===todayStr();}).length;if(canAddPlanItem&&!canAddPlanItem("shareDailyExpenses",shareToday,1))throw new Error(upgradeMessage?upgradeMessage("shareDailyExpenses",shareToday):"Limite giornaliero Share raggiunto.");var activity={id:Date.now()+Math.random(),kind:"expense",amount:shareRound(shareAmount),desc:String(a.description||"Spesa condivisa").trim()||"Spesa condivisa",paidBy:String(payer.id),date:validISODate(a.date,false),time:new Date().toTimeString().slice(0,5),shares:split.shares,splitMode:split.mode,sharedWith:Object.keys(split.shares),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!updateShareProject)throw new Error("Aggiornamento del progetto Share non disponibile.");updateShareProject(shareProject.id,function(p){return{...p,activities:[activity].concat(p.activities||[])};});if(consumePlanFeature)consumePlanFeature("shareDailyExpenses",1);a.projectName=shareProject.name;return actionSummary(a);}
    if(a.action==="create_share_settlement"){var settlementAmount=Number(a.amount)||0;if(settlementAmount<=0)throw new Error("Importo del saldo Share non valido.");var settlementProject=resolveShareProject(a.projectName),settlementParticipants=activeShareParticipants(settlementProject);var fromP=resolveShareParticipant(settlementParticipants,a.fromParticipantName,true),toP=resolveShareParticipant(settlementParticipants,a.toParticipantName,false);if(!fromP||!toP)throw new Error("Indica chi paga e chi riceve il saldo Share.");if(String(fromP.id)===String(toP.id))throw new Error("Il saldo Share richiede due partecipanti diversi.");var settlement={id:Date.now()+Math.random(),kind:"settlement",amount:shareRound(settlementAmount),from:String(fromP.id),to:String(toP.id),date:validISODate(a.date,false),time:new Date().toTimeString().slice(0,5),desc:a.description||"Saldo tra partecipanti",createdAt:new Date().toISOString()};if(!updateShareProject)throw new Error("Aggiornamento del progetto Share non disponibile.");updateShareProject(settlementProject.id,function(p){return{...p,activities:[settlement].concat(p.activities||[])};});a.projectName=settlementProject.name;return actionSummary(a);}
    if(a.action==="create_expense_category"){var cn=String(a.entityName||a.categoryName||"").trim();if(!cn)throw new Error("Nome della categoria non valido.");if(findUniqueByName(cats,cn,"name"))throw new Error("La categoria esiste già.");var cg=findNamed(expenseGroups,a.categoryGroup,null)||(expenseGroups||[])[0],maxId=(cats||[]).reduce(function(m,x){var n=Number(x.id);return Number.isFinite(n)?Math.max(m,n):m;},0)+1;setCats(function(p){return [...(p||[]),{id:maxId,name:cn,icon:a.icon||"📌",group:cg?cg.id:"altro",color:a.color||"#7F77DD",archived:false}];});return actionSummary(a);}
    if(a.action==="create_payment_method"){var mn=String(a.entityName||a.methodName||"").trim();if(!mn)throw new Error("Nome del metodo non valido.");if(findUniqueByName(methods,mn,"name"))throw new Error("Il metodo esiste già.");var mg=findNamed(methodGroups,a.methodGroup,null)||(methodGroups||[])[0],maxM=(methods||[]).reduce(function(m,x){var n=Number(x.id);return Number.isFinite(n)?Math.max(m,n):m;},0)+1;setMethods(function(p){return [...(p||[]),{id:maxM,name:mn,icon:a.icon||"💳",group:mg?mg.id:"altro",color:a.color||"#378ADD",archived:false}];});return actionSummary(a);}
    if(a.action==="set_setting"){var sn=normalized(a.settingName),sv=String(a.settingValue||"").trim(),nv=normalized(sv),compact=sn.replace(/ /g,"");var truth=booleanValue(sv,true);
      if(["appearance","theme","modalita scura","aspetto"].indexOf(sn)>=0){setBgTheme(nv.indexOf("dark")>=0||nv.indexOf("scur")>=0?"dark":(nv.indexOf("slate")>=0?"slate":"default"));}
      else if(["button style","button_style","stile pulsanti"].indexOf(sn)>=0){setBtnStyle(["rounded","soft","square","sharp"].indexOf(nv)>=0?nv:(nv.indexOf("quadr")>=0?"square":"soft"));}
      else if(compact==="topbar"||sn.indexOf("barra superiore")>=0||sn.indexOf("riepilogo in alto")>=0||sn.indexOf("intestazione home")>=0){setShowAppSummaryHeader(truth);}
      else if(compact==="bottombaricons"||sn.indexOf("numero icone")>=0||sn.indexOf("icone barra inferiore")>=0){setMobileNavIconCount(Math.max(3,Math.min(7,Number(sv)||5)));}
      else if(compact==="homebalanceview"||sn.indexOf("saldo home")>=0||sn.indexOf("visualizzazione home")>=0){setHomeBalanceView(nv.indexOf("real")>=0?"reale":"rateizzato");}
      else if(compact==="statisticsview"||sn.indexOf("statistiche")>=0&&sn.indexOf("second")<0){setStatsView(nv.indexOf("real")>=0?"reale":"rateizzato");}
      else if(compact==="dateformat"||sn.indexOf("formato data")>=0){setDateFmt(nv.indexOf("mdy")>=0?"mdy":(nv.indexOf("ymd")>=0?"ymd":"dmy"));}
      else if(compact==="firstdayofweek"||sn.indexOf("primo giorno")>=0){setFirstDayOfWeek(nv.indexOf("sun")>=0||nv.indexOf("domen")>=0?"sun":"mon");}
      else if(compact==="defaultexpensecategory"||sn.indexOf("categoria predefinita")>=0){var dc=findNamed(cats,sv,null);if(!dc)throw new Error("Categoria predefinita non trovata.");setDefaultExpenseCat(String(dc.id));}
      else if(compact==="defaultpaymentmethod"||sn.indexOf("metodo predefinito")>=0){var dm=findNamed(methods,sv,null);if(!dm)throw new Error("Metodo predefinito non trovato.");setDefaultExpenseMethod(String(dm.id));}
      else if(compact==="defaultincometype"||sn.indexOf("tipo entrata predefinito")>=0){var di=findNamed(incomeTypes,sv,null);if(!di)throw new Error("Tipo di entrata predefinito non trovato.");setDefaultIncomeType(String(di.id));}
      else if(compact==="secondarycurrencyhistory"||sn.indexOf("seconda valuta storico")>=0){setShowSecInHistory(truth);}
      else if(compact==="secondarycurrencystatistics"||sn.indexOf("seconda valuta statistiche")>=0){setShowSecInStats(truth);}
      else if(compact==="secondarycurrencybudget"||sn.indexOf("seconda valuta budget")>=0){setShowSecInBudget(truth);}
      else if(compact==="secondarycurrencypatrimonio"||sn.indexOf("seconda valuta patrimonio")>=0){setShowSecInPatrimonio(truth);}
      else if(compact==="historyfuturemode"||sn.indexOf("movimenti futuri")>=0){setHistoryFutureMode(nv.indexOf("future")>=0||nv.indexOf("futur")>=0?"all":"untilToday");}
      else if(compact==="historysortdate"||sn.indexOf("ordinamento storico data")>=0){setHistorySortDate(nv.indexOf("creaz")>=0?"createdAt":"date");}
      else if(compact==="historysortdirection"||sn.indexOf("direzione storico")>=0){setHistorySortDirection(nv.indexOf("asc")>=0||nv.indexOf("crescent")>=0?"asc":"desc");}
      else if(compact==="historysecondarysort"||sn.indexOf("secondo ordinamento storico")>=0){setHistorySortSecondary(nv.indexOf("descr")>=0?"description":(nv.indexOf("categor")>=0?"category":"amount"));}
      else if(compact==="historysecondarydirection"||sn.indexOf("direzione secondo ordinamento")>=0){setHistorySortSecondaryDirection(nv.indexOf("asc")>=0||nv.indexOf("crescent")>=0?"asc":"desc");}
      else if(compact==="showshareinhistory"||sn.indexOf("share nello storico")>=0){setShowShareInHistory(truth);}
      else if(compact==="showdebtcreditsinpatrimonio"||sn.indexOf("debiti")>=0&&sn.indexOf("patrimonio")>=0){setShowDebtCreditsInPatrimonio(truth);}
      else if(compact==="showdebtcreditsinexpenses"||sn.indexOf("debiti")>=0&&(sn.indexOf("uscite")>=0||sn.indexOf("spese")>=0)){setShowDebtCreditsInExpenses(truth);}
      else if(compact==="shoppingproductsort"||sn.indexOf("ordinamento prodotti")>=0){setShoppingProductSort(nv.indexOf("alpha")>=0||nv.indexOf("alfabet")>=0?"alphabetical":"custom");}
      else if(compact==="shoppingdefaultarea"||sn.indexOf("area predefinita spesa")>=0){setShoppingDefaultArea(resolveArea(sv));}
      else if(compact==="patrimoniomode"||sn.indexOf("modalita patrimonio")>=0){setPatrimonioMode(nv.indexOf("auto")>=0?"automatica":"manuale");}
      else if(compact==="aidataaccess"||sn.indexOf("accesso dati ai")>=0){setAiDataAccess(nv.indexOf("full")>=0||nv.indexOf("complet")>=0?"full":(nv.indexOf("area")>=0?"areas":"summary"));}
      else if(compact==="aifloatingbutton"||sn.indexOf("pulsante ai")>=0){setAiFloatingEnabled(truth);}
      else if(compact==="confirmbuttoncolor"||sn.indexOf("colore conferma")>=0){if(!/^#[0-9a-f]{6}$/i.test(sv))throw new Error("Usa un colore esadecimale, per esempio #378ADD.");setConfirmButtonColor(sv);}
      else if(compact==="secondarybuttoncolor"||sn.indexOf("colore secondario")>=0){if(!/^#[0-9a-f]{6}$/i.test(sv))throw new Error("Usa un colore esadecimale, per esempio #7FC8F8.");setSecondaryButtonColor(sv);}
      else throw new Error("Questa impostazione è sensibile o non è modificabile dall’assistente.");return actionSummary(a);}
    return "";
  }
  function openSection(a){var sec=normalized(a.section||"").replace(/ /g,"");var map:any={home:"home",expenses:"spese",expense:"spese",uscite:"spese",incomes:"spese",income:"spese",entrate:"spese",recurring:"spese",ricorrenti:"spese",history:"history",storico:"history",statistics:"stats",statistiche:"stats",budget:"budget",goals:"goals",obiettivi:"goals",alerts:"alerts",alert:"alerts",patrimonio:"patrimonio",assets:"patrimonio",debtcredits:"debtCredits",debiti:"debtCredits",crediti:"debtCredits",shopping:"shopping",spesa:"shopping",share:"share",appunti:"appunti",notes:"appunti",settings:"settings",impostazioni:"settings",ai:"consulenteAI",assistant:"voice"};var target=map[sec]||"home";if(target==="voice")return;setTab(target);setSettingsPage(null);setMobileMenu(false);if(target==="spese"){setSpeseSubTab(sec==="recurring"||sec==="ricorrenti"?"recurring":"add");setAddType(sec==="incomes"||sec==="income"||sec==="entrate"?"income":"expense");setAddSubTab("single");}if(target==="history")setHistoryTab("expenses");setVoiceModal(false);}
  function isYes(q){return /^(si|sì|ok|okay|confermo|conferma|vai|procedi|yes|confirm|dale|vale|oui|ja|sim|tak|da|ναι)\b/i.test(String(q||"").trim());}
  function isNo(q){return /^(no|annulla|annullo|cancel|cancelar|non|nein|não|nie|nu|όχι)\b/i.test(String(q||"").trim());}
  function confirmPending(userText){if(String(userText||"").trim())appendMessage("user",userText);try{pendingActions.forEach(function(a){executeAction(a);});updatePendingActions([]);var msg=V.done;appendMessage("assistant",msg);speak(msg,true);}catch(e){var msg2=(e&&e.message)||V.error;appendMessage("assistant",msg2);speak(msg2,true);}}
  function cancelPending(userText){appendMessage("user",userText||V.cancel);updatePendingActions([]);appendMessage("assistant",V.cancelled);speak(V.cancelled,true);}
  async function callAssistant(q){
    setBusy(true);setAiLoading(true);setVoiceError("");
    try{
      var token="";if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();
      var headers:any={"Content-Type":"application/json"};if(token)headers.Authorization="Bearer "+token;
      var ctrl=new AbortController();assistantRequestAbortRef.current=ctrl;var timer=setTimeout(function(){ctrl.abort();},70000);
      var assistantLang=String(lang||"it");var assistantLanguageName=languageName(assistantLang);var requestPayload:any={mode:"assistant",question:"[LANGUAGE_LOCK="+assistantLang+"] Rispondi esclusivamente in "+assistantLanguageName+". "+q,language:assistantLang,aiDataAccess:aiDataAccess||"summary",financeContext:{...buildContext(),language:assistantLang},chatHistory:(aiChat||[]).filter(function(m){return m&&m.role==="user";}).slice(-10).map(function(m){return{role:"user",text:m.rawText||m.text};}),instruction:"Rispondi soltanto in "+assistantLanguageName+" (codice "+assistantLang+"). Ignora qualsiasi lingua usata nelle precedenti risposte dell’assistente."};
      var attachment=activeAttachmentRef.current;
      if(attachment){
        if(attachment.isImage){requestPayload.imageDataUrl=attachment.dataUrl;requestPayload.imageName=attachment.name||"allegato.jpg";}
        else{requestPayload.fileDataUrl=attachment.dataUrl;requestPayload.fileName=attachment.name||"documento";requestPayload.fileMimeType=attachment.mimeType||"application/octet-stream";}
        requestPayload.question="La richiesta seguente si riferisce anche all’ultimo allegato, che devi leggere direttamente: "+q;
      }
      var res=await fetch(AI_AGENT_ENDPOINT,{method:"POST",headers:headers,signal:ctrl.signal,body:JSON.stringify(requestPayload)}).finally(function(){clearTimeout(timer);if(assistantRequestAbortRef.current===ctrl)assistantRequestAbortRef.current=null;});
      var data:any=null;try{data=await res.json();}catch(e){}
      if(!res.ok){var assistantHttpError:any=new Error((data&&data.error)||("Il servizio AI ha restituito l’errore "+res.status+"."));assistantHttpError.httpStatus=res.status;throw assistantHttpError;}
      var answer=String((data&&data.answer)||"").trim()||"Il servizio AI non ha restituito una risposta. Riprova.";
      if(answerNeedsTranslation(answer,assistantLang)){try{var translateResponse=await fetch(AI_AGENT_ENDPOINT,{method:"POST",headers:headers,body:JSON.stringify({mode:"assistant",question:"Traduci il testo seguente in "+assistantLanguageName+". Restituisci soltanto la traduzione: "+answer,language:assistantLang,financeContext:{language:assistantLang},chatHistory:[],instruction:"Traduzione pura. Output esclusivamente in "+assistantLanguageName+"."})});var translateData:any=await translateResponse.json();var corrected=String((translateData&&translateData.answer)||"").trim();if(corrected)answer=corrected;}catch(e){}}
      var actions=realtimeActionsFrom(data&&data.actions).filter(function(a){return a&&a.action&&a.action!=="none";}),openActions=actions.filter(function(a){return a.action==="open_section";}),writeActions=actions.filter(function(a){return a.action!=="open_section";});
      if(writeActions.length){updatePendingActions(writeActions);return;}
      appendMessage("assistant",answer);
      if(openActions.length){setToast({text:answer,type:"success",icon:"✨"});openSection(openActions[0]);return;}
      speak(answer,true);
    }catch(e){
      if(e&&e.name==="AbortError"&&!mountedRef.current)return;
      var msg=realtimeFailureMessage(e,"assistant",Number((e&&e.httpStatus)||0));setVoiceError(msg);appendMessage("assistant",msg);
    }finally{if(mountedRef.current){setBusy(false);setAiLoading(false);}}
  }
  function sendMessage(forced){var q=String(forced!==undefined?forced:input||"").trim();if(!q||busy||aiLoading)return;setInput("");if(!aiExternalConsent){setVoiceError(V.consentTitle);return;}stopListening(false);if(pendingActions.length&&isYes(q)){confirmPending(q);return;}if(pendingActions.length&&isNo(q)){cancelPending(q);return;}function run(){appendMessage("user",q);if(consumePlanFeature)consumePlanFeature("aiReply",1);callAssistant(q);}if(activeAttachmentRef.current){if(handleRewardedFeature){handleRewardedFeature("aiReply",1,run);return;}if(canUsePlanFeature&&!canUsePlanFeature("aiReply",1)){setToast({text:upgradeMessage?upgradeMessage("aiReply"):"Limite AI raggiunto",type:"warning",color:"#EF9F27",icon:"⚠️"});return;}run();return;}if(realtimeStatus==="connected"){appendMessage("user",q);if(consumePlanFeature)consumePlanFeature("aiReply",1);if(!sendRealtimeText(q))setVoiceError("La conversazione non è ancora pronta. Attendi il messaggio “Microfono pronto” e riprova.");return;}if(handleRewardedFeature){handleRewardedFeature("aiReply",1,run);return;}if(canUsePlanFeature&&!canUsePlanFeature("aiReply",1)){setToast({text:upgradeMessage?upgradeMessage("aiReply"):"Limite AI raggiunto",type:"warning",color:"#EF9F27",icon:"⚠️"});return;}run();}
  useEffect(function(){mountedRef.current=true;return function(){mountedRef.current=false;clearVoiceErrorTimer();try{if(assistantRequestAbortRef.current)assistantRequestAbortRef.current.abort();}catch(e){}stopListening(false);stopSpeaking();disconnectRealtime();try{var p=nativeSpeechRef.current;if(p&&p.removeAllListeners)p.removeAllListeners();}catch(e){}};},[]);
  useEffect(function(){pendingActionsRef.current=pendingActions;},[pendingActions]);
  useEffect(function(){
    function onSystemVolume(event:any){
      var detail=(event&&event.detail)||{};
      var current=Number(detail.current),maximum=Math.max(1,Number(detail.max)||1),ratio=Number(detail.ratio);
      if(!Number.isFinite(ratio))ratio=Number.isFinite(current)?current/maximum:1;
      applyAssistantSystemVolume(ratio,detail.muted===true||current<=0);
    }
    try{window.addEventListener("fainance-assistant-system-volume",onSystemVolume as any);}catch(e){}
    return function(){try{window.removeEventListener("fainance-assistant-system-volume",onSystemVolume as any);}catch(e){}};
  },[]);
  useEffect(function(){if(realtimeAutoStartAttemptedRef.current||!aiExternalConsent)return;var requested=false;try{requested=localStorage.getItem("fainance_voice_realtime_autostart_once")==="1";}catch(e){}if(!requested)return;realtimeAutoStartAttemptedRef.current=true;try{localStorage.removeItem("fainance_voice_realtime_autostart_once");}catch(e){}var timer=setTimeout(function(){if(mountedRef.current)connectRealtime();},60);return function(){clearTimeout(timer);};},[aiExternalConsent]);
  useEffect(function(){try{if(endRef.current)endRef.current.scrollIntoView({behavior:"smooth",block:"end"});}catch(e){}},[aiChat,busy,pendingActions.length]);
  function close(){clearVoiceErrorTimer();try{if(assistantRequestAbortRef.current)assistantRequestAbortRef.current.abort();}catch(e){}activeAttachmentRef.current=null;stopListening(false);stopSpeaking();disconnectRealtime();setVoiceModal(false);setVoiceError("");}
  var messages=(aiChat||[]).slice(-40);
  var statusTitle=realtimeStatus==="connecting"?RT.connectingTitle:(realtimeStatus==="connected"?(voiceListening?RT.listeningTitle:(speaking?RT.speakingTitle:RT.readyTitle)):RT.inactiveTitle);
  var statusSub=realtimeStatus==="connecting"?RT.connectingSub:(realtimeStatus==="connected"?(voiceListening?RT.listeningSub:(speaking?RT.speakingSub:RT.readySub)):RT.inactiveSub);
  var statusAccent=realtimeStatus==="connecting"?"#378ADD":(realtimeStatus==="connected"?(voiceListening?"#EF9F27":"#1D9E75"):"#7F77DD");
  return <div style={{position:"fixed",inset:0,zIndex:1000,background:"rgba(0,0,0,.62)",display:"flex",alignItems:isMobile?"stretch":"center",justifyContent:"center",padding:isMobile?0:18}} onClick={close}>
    <div onClick={function(e){e.stopPropagation();}} style={{width:"100%",maxWidth:760,height:isMobile?"100%":"min(820px,94vh)",background:dark?"#171724":"#F8F9FF",border:isMobile?"none":"1px solid "+borderC,borderRadius:isMobile?0:24,boxShadow:"0 22px 70px rgba(0,0,0,.38)",display:"flex",flexDirection:"column",overflow:"hidden",position:"relative"}}>
      <div style={{padding:isMobile?"7px 10px":"10px 14px",background:dark?"#202033":"linear-gradient(135deg,#F0EDFF,#EAF5FF)",borderBottom:"1px solid "+borderC,display:"flex",alignItems:"center",gap:isMobile?8:10,minHeight:isMobile?58:68}}><AIGrilloIcon size={isMobile?34:40}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:isMobile?15:17,fontWeight:950,color:textC,lineHeight:1.12}}>{V.title}</div>{!isMobile&&<div style={{fontSize:11,color:subC,marginTop:2,lineHeight:1.25}}>{V.sub}</div>}</div><button onClick={onQuick} style={{border:"1px solid "+borderC,background:dark?"#2A2A3E":"#fff",color:textC,borderRadius:9,padding:isMobile?"7px 8px":"8px 10px",fontSize:isMobile?10:11,fontWeight:850,cursor:"pointer",whiteSpace:"nowrap"}}>⚡ {isMobile?"Rapido":V.quick}</button><button onClick={close} style={{width:isMobile?34:38,height:isMobile?34:38,borderRadius:11,border:"1px solid #FFB8B8",background:dark?"#3A1F25":"#FFF0F0",color:"#E24B4A",fontSize:22,fontWeight:950,cursor:"pointer"}}>×</button></div>
      {!aiExternalConsent?<div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}><div style={{maxWidth:560,background:cardBg,border:"1px solid "+borderC,borderRadius:18,padding:20}}><div style={{fontSize:17,fontWeight:950,color:textC,marginBottom:8}}>{V.consentTitle}</div><div style={{fontSize:13,color:subC,lineHeight:1.55,marginBottom:16}}>{V.consentText}</div><button onClick={function(){setAiExternalConsent(true,new Date().toISOString());setVoiceError("");}} style={{width:"100%",border:"none",borderRadius:btnRadius,padding:"12px 14px",background:"linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#7FC8F8))",color:"#fff",fontWeight:900,cursor:"pointer"}}>{V.accept}</button></div></div>:<>
      <div style={{margin:"12px 14px 8px",padding:"13px 14px",display:"flex",alignItems:"center",gap:12,border:"2px solid "+statusAccent,borderRadius:15,background:realtimeStatus==="connecting"?(dark?"#17263A":"#EDF6FF"):(realtimeStatus==="connected"?(dark?"#153229":"#ECFFF7"):(dark?"#28233B":"#F3F0FF")),boxShadow:"0 7px 20px "+statusAccent+"26"}}><span style={{width:13,height:13,borderRadius:"50%",background:statusAccent,boxShadow:"0 0 0 6px "+statusAccent+"22",flexShrink:0,animation:realtimeStatus==="connecting"?"pulse 1.2s infinite":"none"}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:15,fontWeight:950,color:textC,lineHeight:1.25}}>{statusTitle}</div><div style={{fontSize:12,color:subC,lineHeight:1.4,marginTop:3,fontWeight:realtimeStatus==="connecting"?750:500}}>{statusSub}</div></div>{realtimeStatus!=="connected"&&realtimeStatus!=="connecting"&&<button onClick={connectRealtime} style={{border:"none",background:"linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#7FC8F8))",color:"#fff",borderRadius:10,padding:"9px 12px",fontSize:12,fontWeight:900,cursor:"pointer"}}><span style={{display:"inline-flex",verticalAlign:"middle",marginRight:5}}><FinanceMicIcon size={17}/></span>Avvia</button>}</div>
      <div style={{flex:1,overflowY:"auto",padding:16,display:"flex",flexDirection:"column",gap:10,WebkitOverflowScrolling:"touch"}}>{messages.length===0&&<div style={{textAlign:"center",color:subC,fontSize:13,lineHeight:1.55,padding:"44px 18px"}}><AIGrilloIcon size={76}/><div style={{marginTop:12}}>{V.empty}</div></div>}{messages.map(function(m){var mine=m.role==="user";return <div key={m.id} style={{alignSelf:mine?"flex-end":"flex-start",maxWidth:"86%",background:mine?(dark?"rgba(127,119,221,.24)":"#ECE9FF"):cardBg,color:mine?(dark?"#E7E2FF":"#514B8F"):textC,border:mine?("1px solid "+(dark?"rgba(151,142,235,.38)":"#D8D2FF")):("1px solid "+borderC),borderRadius:16,padding:"10px 12px",fontSize:13,lineHeight:1.48,whiteSpace:"pre-line",boxShadow:mine?"none":(dark?"none":"0 3px 12px rgba(0,0,0,.05)")}}>{m.text}</div>;})} {realtimeAssistantDraft&&<div style={{alignSelf:"flex-start",maxWidth:"86%",background:cardBg,color:textC,border:"1px solid "+borderC,borderRadius:16,padding:"10px 12px",fontSize:13,lineHeight:1.48}}>{realtimeAssistantDraft}</div>}{(busy||aiLoading)&&!realtimeAssistantDraft&&<div style={{alignSelf:"flex-start",background:cardBg,color:subC,border:"1px solid "+borderC,borderRadius:16,padding:"10px 12px",fontSize:13}}>{documentLoading?RT.documentReading:V.thinking}</div>}{pendingActions.length>0&&<div style={{background:dark?"linear-gradient(135deg,#28233B,#222235)":"linear-gradient(135deg,#F4FFF9,#F7F6FF)",border:"2px solid "+(dark?"#4E9E82":"#79C9AA"),borderRadius:18,padding:16,boxShadow:dark?"none":"0 8px 24px rgba(29,158,117,.12)"}}><div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10}}><span style={{width:28,height:28,borderRadius:"50%",display:"inline-flex",alignItems:"center",justifyContent:"center",background:"#1D9E75",color:"#fff",fontWeight:950}}>✓</span><div style={{fontSize:15,fontWeight:950,color:textC}}>{V.confirm}</div></div><div style={{display:"flex",flexDirection:"column",gap:7}}>{pendingActions.map(function(a,idx){return <div key={idx} style={{fontSize:13,color:textC,lineHeight:1.4,background:dark?"rgba(255,255,255,.04)":"rgba(255,255,255,.8)",border:"1px solid "+borderC,borderRadius:11,padding:"9px 10px",whiteSpace:"pre-line"}}>{actionSummary(a)}</div>;})}</div><div style={{display:"flex",gap:8,marginTop:14}}><button onClick={function(){confirmPending("");}} style={{flex:1,border:"none",borderRadius:11,padding:"12px",background:"#1D9E75",color:"#fff",fontWeight:950,cursor:"pointer",fontSize:13}}>✓ {V.execute||"Esegui"}</button><button onClick={function(){cancelPending("");}} style={{flex:.72,border:"1px solid "+borderC,borderRadius:11,padding:"12px",background:cardBg,color:textC,fontWeight:900,cursor:"pointer",fontSize:13}}>{V.cancel}</button></div></div>}<div ref={endRef}/></div>
      {voiceError&&<div style={{margin:"0 14px 10px",background:dark?"#3A1F25":"#FFF0F0",border:"1px solid #E24B4A55",borderRadius:12,padding:"10px 12px",fontSize:12,color:"#E24B4A",lineHeight:1.45,fontWeight:700}}>⚠️ {voiceError}</div>}
            <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={onFinanceFileSelected} style={{display:"none"}}/>
      <input ref={galleryInputRef} type="file" accept="image/*" onChange={onFinanceFileSelected} style={{display:"none"}}/>
      <input ref={documentInputRef} type="file" accept=".pdf,.doc,.docx,.rtf,.txt,.csv,.xls,.xlsx,.json,.xml,.ods,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain" onChange={onFinanceDocumentSelected} style={{display:"none"}}/>
      {attachmentMenuOpen&&<div style={{position:"absolute",left:70,bottom:76,zIndex:12,minWidth:190,background:dark?"#27273A":"#fff",border:"1px solid "+borderC,borderRadius:14,boxShadow:"0 14px 35px rgba(0,0,0,.24)",padding:7}}><button onClick={takeFinancePhoto} disabled={documentLoading||busy} style={{width:"100%",border:"none",background:"transparent",color:textC,textAlign:"left",padding:"11px 12px",borderRadius:10,fontWeight:850,cursor:"pointer"}}>📷 Scatta foto</button><button onClick={chooseFinancePhoto} disabled={documentLoading||busy} style={{width:"100%",border:"none",background:"transparent",color:textC,textAlign:"left",padding:"11px 12px",borderRadius:10,fontWeight:850,cursor:"pointer"}}>🖼️ Carica foto</button><button onClick={chooseFinanceDocument} disabled={documentLoading||busy} style={{width:"100%",border:"none",background:"transparent",color:textC,textAlign:"left",padding:"11px 12px",borderRadius:10,fontWeight:850,cursor:"pointer"}}>📄 Carica documento</button></div>}
      <div style={{padding:"10px 14px 12px",background:dark?"#202033":"#fff",display:"grid",gridTemplateColumns:"auto auto minmax(0,1fr) auto",gap:9,alignItems:"end",borderTop:"1px solid "+borderC}}><button onClick={realtimeStatus==="connected"?toggleRealtimeMicrophone:connectRealtime} disabled={realtimeStatus==="connecting"} title={realtimeStatus==="connected"?(realtimeMicEnabled?"Disattiva microfono":"Attiva microfono"):"Avvia conversazione"} style={{width:48,height:48,borderRadius:"50%",border:"none",background:realtimeStatus==="connected"?(realtimeMicEnabled?(voiceListening?"#EF9F27":"#1D9E75"):"#777"):(realtimeStatus==="connecting"?"#A8A8A8":"linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#7FC8F8))"),color:"#fff",fontSize:20,fontWeight:900,cursor:realtimeStatus==="connecting"?"wait":"pointer",boxShadow:"0 5px 16px rgba(127,119,221,.3)"}}><FinanceMicIcon size={25} muted={realtimeStatus==="connected"&&!realtimeMicEnabled} active={realtimeStatus==="connected"&&realtimeMicEnabled&&voiceListening}/></button><button onClick={function(){setAttachmentMenuOpen(function(v){return !v;});}} disabled={documentLoading||busy} title="Aggiungi allegato" style={{width:48,height:48,borderRadius:"50%",border:"1px solid "+borderC,background:dark?"#2A2A3E":"#F5F6FB",color:textC,fontSize:27,fontWeight:500,lineHeight:1,cursor:documentLoading||busy?"wait":"pointer"}}>+</button><textarea value={input} onChange={function(e){setInput(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder={realtimeStatus==="connected"?"Parla liberamente oppure scrivi qui…":V.placeholder} style={{...sinp,minHeight:48,maxHeight:110,resize:"none"}}/><button onClick={function(){sendMessage();}} disabled={!input.trim()||busy||aiLoading||realtimeStatus==="connecting"} style={{height:48,border:"none",borderRadius:12,padding:"0 15px",background:input.trim()&&!busy?"#7F77DD":"#A8A8A8",color:"#fff",fontWeight:900,cursor:input.trim()&&!busy?"pointer":"not-allowed"}}>{V.send}</button></div>
      </>}
    </div>
  </div>;
}

function QuickVoiceEntryModal(){

  // ── Destructure completo dal context ─────────────────────────────────────
  var _c:any=useApp();
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_c;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_c;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_c;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_c;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_c;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_c;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_c;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_c;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat}:any=_c;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_c;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_c;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_c;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_c;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_c;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_c;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_c;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_c;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_c;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_c;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_c;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_c;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening}:any=_c;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_c;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_c;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_c;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_c;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_c;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_c;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_c;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_c;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_c;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_c;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_c;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_c;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_c;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  // ─────────────────────────────────────────────────────────────────────────
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};

  function getDefaultVoiceExpenseCategory(){return cats.find(function(c){return String(c.id)===String(defaultExpenseCat);})||cats.find(function(c){return normalizeVoiceText(c.name)==="spesa";})||cats[0];}
  function getDefaultVoiceExpenseMethod(){var active=methods.filter(function(x){return !x.archived;});return active.find(function(m){return String(m.id)===String(defaultExpenseMethod);})||active[0]||methods[0];}
  function categoryBySemanticVoice(n){
  function pickCat(names,group){var best=null;(cats||[]).forEach(function(c){var cn=normalizeVoiceText(c.name||"");var cg=normalizeVoiceText(c.group||"");names.forEach(function(name){var nn=normalizeVoiceText(name);if(cn===nn||cn.indexOf(nn)>=0||nn.indexOf(cn)>=0){if(!best||cg===normalizeVoiceText(group||""))best=c;}});});return best;}
  if(/\b(farmacia|farmacie|pharmacy|pharmacie|apotheke|apteka|farmaco|farmaci|medicina|medicine|medicinali|medicinale|pillola|pillole|compressa|compresse|aspirina|antibiotico|tachipirina|brufen|oki|medico|doctor|dentista|dentist|visita|analisi)\b/.test(n))return pickCat(["Salute","Farmacia","Medicine","Medicina"],"vita")||getDefaultVoiceExpenseCategory();
  if(/\b(supermercato|spesa alimentare|alimentari|grocery|groceries|supermarket|supermercado|esselunga|coop|conad|lidl|aldi|eurospin|carrefour|pane|latte|frutta|verdura)\b/.test(n))return pickCat(["Spesa","Supermercato","Alimentari"],"vita")||getDefaultVoiceExpenseCategory();
  if(/\b(pizza|pizzeria|ristorante|restaurant|restaurante|sushi|kebab|hamburger|pranzo|cena|delivery|deliveroo|glovo|just eat)\b/.test(n))return pickCat(["Ristoranti","Ristorante","Restaurant"],"tempo")||getDefaultVoiceExpenseCategory();
  if(/\b(bar|caffe|caffè|cafe|coffee|cappuccino|colazione|brioche)\b/.test(n))return pickCat(["Bar","Caffè","Cafe"],"tempo")||getDefaultVoiceExpenseCategory();
  if(/\b(benzina|diesel|gasolio|carburante|fuel|gasolina|rifornimento)\b/.test(n))return pickCat(["Carburante","Benzina","Fuel"],"trasporti")||getDefaultVoiceExpenseCategory();
  if(/\b(treno|metro|bus|autobus|tram|taxi|uber|bolt|biglietto|ticket)\b/.test(n))return pickCat(["Trasporti","Transport","Taxi"],"trasporti")||getDefaultVoiceExpenseCategory();
  if(/\b(luce|gas|acqua|internet|telefono|bolletta|bollette|utenza|utenze)\b/.test(n))return pickCat(["Utenze","Bollette","Utilities"],"casa")||getDefaultVoiceExpenseCategory();
  var rules=[
    {names:["supermercato","supermarket","supermercado","supermarche","supermarkt","sklep","magazin","alimentari","grocery"],area:"vita",words:["supermercato","supermarket","supermercado","supermarche","supermarkt","sklep","magazin","alimentari","alimentacion","groceries","comida","food","spesa","compra","compras","zakupy","boodschappen","cumparaturi","alimente","caramella","caramelle","dolci","bread","pane","pan","pain","brot","chleb","paine","latte","milk","leche","lait","milch","mleko","lapte","frutta","verdura","esselunga","coop","conad","lidl","aldi","eurospin","carrefour"],avoid:["mutuo","affitto","rent","mortgage","miete"]},
    {names:["ristorante","restaurant","restaurante","restauracja","pizzeria","pizza","pizze"],area:"svago",words:["pizza","pizze","pizzas","pizzeria","restaurant","restaurante","ristorante","restauracja","restaurant","cena","pranzo","dinner","lunch","sushi","kebab","hamburger","delivery","deliveroo","glovo","just eat"],avoid:["mutuo","affitto","rent","mortgage"]},
    {names:["bar","caffe","cafe","coffee"],area:"svago",words:["bar","caffe","cafe","coffee","cappuccino","brioche","colazione","breakfast","desayuno","petit dejeuner","fruhstuck"],avoid:["mutuo","affitto"]},
    {names:["carburante","benzina","fuel","gasolina","essence","kraftstoff","combustivel","paliwo"],area:"trasporti",words:["benzina","diesel","gasolio","carburante","fuel","gasoline","gasolina","essence","kraftstoff","combustivel","paliwo","rifornimento"]},
    {names:["trasporti","transport","taxi","metro","treno","bus"],area:"trasporti",words:["metro","treno","train","bus","autobus","biglietto","ticket","tram","taxi","uber","bolt"]},
    {names:["salute","health","medicina","farmacia","pharmacy","pharmacie","apotheke","farmacia","apteka"],area:"vita",words:["salute","health","sanita","farmacia","pharmacy","pharmacie","apotheke","apteka","farmaco","farmaci","medicine","medicina","medicinali","medicinale","medico","doctor","dentista","dentist","visita","analisi"]},
    {names:["utenze","bollette","utilities","bills","servizi"],area:"casa",words:["luce","gas","acqua","water","electricity","internet","telefono","bolletta","bollette","bill","bills","netflix","spotify"]},
    {names:["viaggi","travel","viaje","voyage","reise","podroz","vacanza"],area:"svago",words:["volo","flight","hotel","albergo","booking","airbnb","viaggio","travel","viaje","voyage","reise","vacanza","holiday"]},
    {names:["sport","tempo libero","hobby","esperienze"],area:"svago",words:["biliardo","cinema","teatro","concerto","libro","books","hobby","sport","tennis"]}
  ];
  var best=null,bestScore=0;for(var i=0;i<rules.length;i++){if(voiceContainsAny(n,rules[i].words)){(cats||[]).forEach(function(c){var sc=scoreVoiceCategory(c,n,rules[i]);if(sc>bestScore){bestScore=sc;best=c;}});}}
  if(best&&bestScore>0)return best;var exact=findByVoiceName(cats,n);if(exact)return exact;return getDefaultVoiceExpenseCategory();
}
  function parseVoiceCommand(txt){
  var raw=String(txt||"").trim();var common=parseFainanceSingleVoiceCommon(raw);var n=normalizeVoiceText(common.converted||raw);if(!n)return null;var amount=common.amount||parseVoiceAmount(n);if(!amount||amount<=0){setVoiceError(voiceUiText(lang).invalid);return null;}
  var isIncome=/\b(entrata|entrate|incasso|incassato|ricevuto|ricevuta|stipendio|salario|salary|payroll|income|revenue|ingreso|ingresos|sueldo|revenu|recette|receita|einnahme|gehalt|przychod|pensja|inkomst|venit|salariu|\u03ad\u03c3\u03bf\u03b4\u03bf|\u03b5\u03c3\u03bf\u03b4\u03bf|\u03bc\u03b9\u03c3\u03b8\u03bf\u03c2|\u03bc\u03b9\u03c3\u03b8\u03cc\u03c2)\b/.test(n);
  var isExpense=/\b(uscita|uscite|spesa|spese|speso|pagato|pagata|expense|expenses|paid|gasto|gastos|depense|d\u00e9pense|despesa|ausgabe|bezahlt|wydatek|uitgave|cheltuiala|cheltuial\u0103|\u03ad\u03be\u03bf\u03b4\u03bf|\u03b5\u03be\u03bf\u03b4\u03bf)\b/.test(n);
  var type=isIncome&&!isExpense?"income":(common.type||"expense");var date=common.date||parseVoiceDate(n);var rateInfo=parseVoiceRate(n);var rate=rateInfo.rate,rateizzato=rateInfo.rateizzato;
  if(type==="income"){var it=findByVoiceName(incomeTypes,n)||incomeTypes[0];if(/\b(stipendio|salario|salary|payroll|sueldo|gehalt|pensja|salariu|\u03bc\u03b9\u03c3\u03b8\u03bf\u03c2|\u03bc\u03b9\u03c3\u03b8\u03cc\u03c2)\b/.test(n))it=incomeTypes.find(function(x){return x.id==="salario";})||it;if(/\b(bonus|premio|tredicesima|quattordicesima)\b/.test(n))it=incomeTypes.find(function(x){return x.id==="bonus";})||it;return{type:"income",amount:amount,date:date,desc:common.description||cleanVoiceDescription(raw,"income",null,null,it),incomeType:it?it.id:"salario",incomeTypeName:it?it.name:"Entrata",rateizzato:rateizzato,rate:rate};}
  var c=categoryBySemanticVoice(n);var activeMethods=methods.filter(function(x){return !x.archived;});var mentionedMethod=findByVoiceName(activeMethods,n);var m=mentionedMethod||getDefaultVoiceExpenseMethod();return{type:"expense",amount:amount,date:date,desc:common.description||cleanVoiceDescription(raw,"expense",c,m,null),catId:c?c.id:1,catName:c?c.name:"Categoria",methodId:m?m.id:1,methodName:m?m.name:"Metodo",rateizzato:rateizzato,rate:rate};
  }
  function updateVoiceParsed(patch){setVoiceParsed(function(p){return p?{...p,...patch}:p;});}
  function changeVoiceCat(id){var c=(cats||[]).find(function(x){return String(x.id)===String(id);});if(c)updateVoiceParsed({catId:c.id,catName:c.name});}
  function changeVoiceMethod(id){var m=(methods||[]).find(function(x){return String(x.id)===String(id);});if(m)updateVoiceParsed({methodId:m.id,methodName:m.name});}
  function changeVoiceIncomeType(id){var it=(incomeTypes||[]).find(function(x){return String(x.id)===String(id);});if(it)updateVoiceParsed({incomeType:it.id,incomeTypeName:it.name});}
  function analyzeVoiceText(){setVoiceError("");var parsed=parseVoiceCommand(voiceText);setVoiceParsed(parsed);}
  function openVoiceModal(autoStart){setVoiceModal(true);setVoiceText("");setVoiceParsed(null);setVoiceError("");setVoiceListening(false);if(autoStart!==false){setTimeout(function(){startVoiceListening();},250);}}
  function closeVoiceModal(){setVoiceModal(false);setVoiceListening(false);setVoiceText("");setVoiceParsed(null);setVoiceError("");}
  function startVoiceListening(){
  setVoiceError("");setVoiceParsed(null);
  var win:any=window;
  var language=VOICE_LANGS[lang]||"en-US";
  var cap=win.Capacitor;
  var isNative=cap&&cap.isNativePlatform&&cap.isNativePlatform();
  var platform=(cap&&cap.getPlatform)?cap.getPlatform():"";
  if(isNative){
    setVoiceListening(true);
    (async function(){
      var mod:any=await import("@capgo/capacitor-speech-recognition");var nativeSpeech:any=mod.SpeechRecognition||mod.default||mod;
      if(!nativeSpeech||!nativeSpeech.start)throw new Error("Riconoscimento vocale nativo non disponibile");
      var av=nativeSpeech.available?await nativeSpeech.available():{available:true};if(av&&av.available===false)throw new Error("Riconoscimento vocale non disponibile sul dispositivo");
      var perm=nativeSpeech.checkPermissions?await nativeSpeech.checkPermissions():{};var state=String((perm&&perm.speechRecognition)||"").toLowerCase();
      if(state!=="granted"){perm=nativeSpeech.requestPermissions?await nativeSpeech.requestPermissions():perm;state=String((perm&&perm.speechRecognition)||"").toLowerCase();}
      if(state&&state!=="granted")throw new Error(platform==="ios"?"Permesso microfono o riconoscimento vocale non concesso.":"Permesso microfono non concesso.");
      var res=await nativeSpeech.start({language:language,maxResults:3,prompt:"Parla ora",partialResults:false,popup:false,addPunctuation:true});
      var matches=res&&res.matches?res.matches:[];var txt2=matches&&matches[0]?matches[0]:"";if(!txt2)throw new Error("Nessun testo riconosciuto");setVoiceText(txt2);setVoiceParsed(parseVoiceCommand(txt2));
    })().catch(function(err){var msg=err&&err.message?err.message:String(err||"");setVoiceError(msg||"Errore riconoscimento vocale nativo");}).finally(function(){setVoiceListening(false);});
    return;
  }
  var SpeechRecognition=win.SpeechRecognition||win.webkitSpeechRecognition;
  if(!SpeechRecognition){setVoiceError("Riconoscimento vocale non disponibile su questo dispositivo. Puoi scrivere il comando nel campo testo e premere Analizza.");return;}
  try{
    var rec=new SpeechRecognition();
    rec.lang=language;
    rec.interimResults=false;rec.maxAlternatives=1;rec.continuous=false;
    setVoiceListening(true);
    rec.onresult=function(ev){var txt2="";for(var ri=0;ri<ev.results.length;ri++){if(ev.results[ri]&&ev.results[ri][0]&&ev.results[ri][0].transcript){txt2+=(txt2?" ":"")+ev.results[ri][0].transcript;}}if(txt2){setVoiceText(txt2);if(ev.results[ev.results.length-1].isFinal){setVoiceParsed(parseVoiceCommand(txt2));}}};
    rec.onerror=function(ev){var errCode=ev&&ev.error?ev.error:"non disponibile";var errMsg=errCode==="not-allowed"?"Permesso microfono negato dal browser. Su Android usa il plugin nativo SpeechRecognition oppure scrivi il comando nel campo testo.":"Errore riconoscimento vocale: "+errCode;setVoiceError(errMsg);setVoiceListening(false);};
    rec.onend=function(){setVoiceListening(false);};
    rec.start();
  }catch(err){setVoiceListening(false);setVoiceError("Impossibile avviare il microfono. Verifica i permessi audio.");}
}
  
  function saveVoiceEntry(){
  if(!voiceParsed)return;
  if(voiceParsed.type==="income"){
    if(addIncomes([{id:Date.now(),amount:Number(voiceParsed.amount)||0,type:voiceParsed.incomeType,desc:voiceParsed.desc,date:voiceParsed.date,rateizzato:!!voiceParsed.rateizzato,rate:Number(voiceParsed.rate)||1}],"voice")){closeVoiceModal();}
  }else{
    if(addExpenses([{id:Date.now(),amount:Number(voiceParsed.amount)||0,catId:Number(voiceParsed.catId),methodId:Number(voiceParsed.methodId),methodName:voiceParsed.methodName,desc:voiceParsed.desc,date:voiceParsed.date,rateizzato:!!voiceParsed.rateizzato,rate:Number(voiceParsed.rate)||1}],"voice")){closeVoiceModal();}
  }
}  var parsed=voiceParsed;
  var V=voiceUiText(lang);
  var voiceAutoStartedRef=useRef(false);
  useEffect(function(){
    if(voiceAutoStartedRef.current)return;
    voiceAutoStartedRef.current=true;
    var t1=setTimeout(function(){startVoiceListening();},350);
    return function(){clearTimeout(t1);};
  },[]);
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:520,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 16px 2vh",boxSizing:"border-box",overflowY:"auto"}} onClick={function(e){if(e.target===e.currentTarget)closeVoiceModal();}}>
    <div style={{background:cardBg,borderRadius:20,border:"1px solid "+borderC,width:"100%",maxWidth:430,maxHeight:"92vh",boxShadow:"0 10px 40px rgba(0,0,0,0.28)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{background:"linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#7FC8F8))",color:"#fff",padding:"18px 20px",display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:30}}>🎙️</div><div style={{flex:1}}><div style={{fontSize:17,fontWeight:900}}>{V.title}</div><div style={{fontSize:12,opacity:0.85}}>{V.sub}</div></div><button onClick={closeVoiceModal} aria-label={V.cancel} style={{width:42,height:42,borderRadius:14,border:"1px solid #FCA5A5",background:dark?"#3A2228":"#FFF5F5",color:"#F87171",fontSize:22,fontWeight:950,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px #F8717133"}}>×</button></div>
      <div style={{padding:18,display:"flex",flexDirection:"column",gap:12,overflowY:"auto",WebkitOverflowScrolling:"touch"}}>
        <button onClick={startVoiceListening} disabled={voiceListening} style={{background:voiceListening?"#EF9F27":"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"13px 14px",fontSize:15,fontWeight:800,cursor:"pointer"}}>{voiceListening?V.listening:V.retry}</button>
        <div style={{fontSize:12,color:subC,lineHeight:1.45}}>{V.hint}</div>
        <div style={{fontSize:12,color:subC,lineHeight:1.45}}>{V.examples}</div>
        <textarea value={voiceText} onChange={function(e){setVoiceText(e.target.value);setVoiceParsed(null);setVoiceError("");}} placeholder={V.placeholder} style={{minHeight:74,borderRadius:12,border:"1px solid "+borderC,padding:"10px 12px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:textC,resize:"vertical"}}/>
        <button onClick={analyzeVoiceText} style={{background:dark?"#333":"#f0f0f0",color:textC,border:"none",borderRadius:btnRadius,padding:"10px 12px",fontSize:13,fontWeight:700,cursor:"pointer"}}>{V.analyze}</button>
        {voiceError&&<div style={{background:dark?"#3a1d1d":"#fff0f0",border:"1px solid #E24B4A55",borderRadius:12,padding:"10px 12px",fontSize:12,color:"#E24B4A"}}>⚠️ {voiceError}</div>}
        {parsed&&<div style={{background:dark?"#1e1e30":"#f7f6ff",border:"1px solid "+(parsed.type==="expense"?expenseColor:incomeColor)+"55",borderRadius:14,padding:14}}>
          <div style={{fontSize:13,fontWeight:900,color:parsed.type==="expense"?expenseColor:incomeColor,marginBottom:8}}>{parsed.type==="expense"?V.exp:V.inc}{V.recognized} · Modifica prima di salvare</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,fontSize:12,color:textC}}>
            <div><label style={{fontWeight:800,display:"block",marginBottom:4}}>{V.amount}</label><input type="number" step="0.01" value={parsed.amount} onChange={function(e){updateVoiceParsed({amount:e.target.value});}} style={sinp}/></div>
            <div><label style={{fontWeight:800,display:"block",marginBottom:4}}>{V.date}</label><input type="date" value={parsed.date} onChange={function(e){updateVoiceParsed({date:e.target.value});}} style={sinp}/></div>
            {parsed.type==="expense"?<><div><label style={{fontWeight:800,display:"block",marginBottom:4}}>{V.cat}</label><select value={parsed.catId} onChange={function(e){changeVoiceCat(e.target.value);}} style={sinp}>{(cats||[]).filter(function(c){return !c.archived;}).map(function(c){return <option key={c.id} value={c.id}>{c.name}</option>;})}</select></div><div><label style={{fontWeight:800,display:"block",marginBottom:4}}>{V.method}</label><select value={parsed.methodId} onChange={function(e){changeVoiceMethod(e.target.value);}} style={sinp}>{(methods||[]).filter(function(m){return !m.archived;}).map(function(m){return <option key={m.id} value={m.id}>{m.name}</option>;})}</select></div></>:<div style={{gridColumn:"1/-1"}}><label style={{fontWeight:800,display:"block",marginBottom:4}}>{V.type}</label><select value={parsed.incomeType} onChange={function(e){changeVoiceIncomeType(e.target.value);}} style={sinp}>{(incomeTypes||[]).map(function(it){return <option key={it.id} value={it.id}>{it.name}</option>;})}</select></div>}
            <div style={{gridColumn:"1/-1"}}><label style={{fontWeight:800,display:"block",marginBottom:4}}>{V.desc}</label><input value={parsed.desc||""} onChange={function(e){updateVoiceParsed({desc:e.target.value});}} style={sinp}/></div>
            <div style={{gridColumn:"1/-1",display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,alignItems:"end"}}><label style={{display:"flex",alignItems:"center",gap:8,fontSize:12,fontWeight:800}}><input type="checkbox" checked={!!parsed.rateizzato} onChange={function(e){updateVoiceParsed({rateizzato:e.target.checked});}}/> {V.inst}</label><input type="number" min="1" max="60" disabled={!parsed.rateizzato} value={parsed.rate||1} onChange={function(e){updateVoiceParsed({rate:e.target.value});}} style={{...sinp,opacity:parsed.rateizzato?1:0.45}}/></div>
          </div>
        </div>}
        <div style={{display:"flex",gap:10}}><Btn onClick={closeVoiceModal} bg={dark?"#333":"#f0f0f0"} color={textC} style={{flex:1,padding:12}}>{V.cancel}</Btn><Btn onClick={saveVoiceEntry} disabled={!parsed} bg={parsed?"#1D9E75":"#999"} style={{flex:1,padding:12,fontWeight:900}}>{V.save}</Btn></div>
      </div>
    </div>
  </div>;
}

export function FloatingAIButton({desktop}){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c:any=useApp();
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_c;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_c;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_c;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_c;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_c;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_c;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_c;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_c;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat}:any=_c;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_c;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_c;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_c;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_c;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_c;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_c;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_c;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_c;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_c;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_c;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_c;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_c;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening}:any=_c;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_c;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_c;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_c;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_c;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_c;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_c;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_c;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_c;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_c;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_c;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_c;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_c;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_c;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  // ─────────────────────────────────────────────────────────────────────────
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var buttonWidth=desktop?82:78;
  var buttonHeight=desktop?108:102;
  var bottom=Math.max(12,Number(aiFloatingPos&&aiFloatingPos.bottom)||78);
  var right=Math.max(8,Number(aiFloatingPos&&aiFloatingPos.right)||18);
  var dragState=aiFloatingDrag;
  function getPoint(e){return e.touches&&e.touches[0]?e.touches[0]:e.changedTouches&&e.changedTouches[0]?e.changedTouches[0]:e;}
  function startDrag(e){var point=getPoint(e);if(e.currentTarget&&e.currentTarget.setPointerCapture&&e.pointerId!==undefined){try{e.currentTarget.setPointerCapture(e.pointerId);}catch(err){}}setAiFloatingDrag({startX:point.clientX,startY:point.clientY,right:right,bottom:bottom,moved:false});if(e.cancelable)e.preventDefault();}
  function applyDrag(e){if(!dragState)return;var point=getPoint(e);var dx=point.clientX-dragState.startX;var dy=point.clientY-dragState.startY;var maxRight=Math.max(8,(window.innerWidth||390)-buttonWidth-8);var maxBottom=Math.max(12,(window.innerHeight||760)-buttonHeight-12);var next={right:Math.min(maxRight,Math.max(8,dragState.right-dx)),bottom:Math.min(maxBottom,Math.max(12,dragState.bottom-dy))};var moved=dragState.moved||Math.abs(dx)>6||Math.abs(dy)>6;setAiFloatingDrag({...dragState,moved:moved});setAiFloatingPos(next);if(e.cancelable)e.preventDefault();}
  function endDrag(e){var moved=dragState&&dragState.moved;setAiFloatingDrag(null);if(!moved){setTab("consulenteAI");setAiTab("chat");setSettingsPage(null);setMobileMenu(false);}if(e&&e.cancelable)e.preventDefault();}
  return <div style={{position:"fixed",right:right,bottom:bottom,zIndex:250,width:buttonWidth,height:buttonHeight,overflow:"visible"}}>
    <button onClick={function(e){e.stopPropagation();setAiFloatingEnabled(false);}} title="Nascondi icona AI" style={{position:"absolute",left:-2,top:-2,zIndex:2,width:22,height:22,borderRadius:"50%",border:"1px solid rgba(0,0,0,0.12)",background:"rgba(255,255,255,0.92)",color:"#555",fontSize:14,fontWeight:900,lineHeight:"18px",cursor:"pointer",boxShadow:"0 2px 8px rgba(0,0,0,0.18)"}}>×</button>
    <button onPointerDown={startDrag} onPointerMove={applyDrag} onPointerUp={endDrag} onPointerCancel={endDrag} title="Grillo parlante AI" style={{width:buttonWidth,height:buttonHeight,borderRadius:0,border:"none",background:"transparent",padding:0,color:"#fff",boxShadow:"none",fontSize:desktop?27:25,cursor:dragState?"grabbing":"grab",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"none",userSelect:"none",overflow:"visible"}}><img src={aiGrilloMascot} alt="Consulente AI" draggable={false} style={{width:"100%",height:"100%",display:"block",objectFit:"contain",pointerEvents:"none",background:"transparent",transform:"none"}}/></button>
  </div>;
}

// ── COPY MONTH WIDGET (proper component to avoid hooks-in-IIFE) ──────────────
export function CopyMonthWidget({pHistory,pEntries,selMonthKey,setDraft,setToast,dark,textC,subC,borderC,sinp,btnRadius,onCopyMonth}){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c:any=useApp();
  var translateUiRuntimeText:any=_c.translateUiRuntimeText;
  function L(s){return translateUiRuntimeText?translateUiRuntimeText(s):s;}
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_c;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_c;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_c;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_c;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_c;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_c;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_c;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_c;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat}:any=_c;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_c;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_c;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_c;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_c;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_c;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_c;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_c;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_c;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_c;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_c;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_c;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_c;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening}:any=_c;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_c;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_c;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_c;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_c;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_c;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_c;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_c;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_c;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_c;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_c;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_c;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_c;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_c;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  // ─────────────────────────────────────────────────────────────────────────
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var availMonths=Object.keys(pHistory).sort().reverse().filter(function(mk){return mk!==selMonthKey;});
  var [copyFrom,setCopyFrom]=useState(availMonths[0]||"");
  var [showCopy,setShowCopy]=useState(false);
  if(!availMonths.length)return null;
  // Keep copyFrom valid when availMonths changes
  if(copyFrom&&!availMonths.includes(copyFrom)){setCopyFrom(availMonths[0]||"");}
  return <div style={{background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:"12px 16px"}}>
    {!showCopy
      ?<button onClick={function(){setShowCopy(true);}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500,padding:0}}>📋 {L("Copia valori da un altro mese...")}</button>
      :<div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
        <span style={{fontSize:13,color:textC}}>{L("Copia da")}</span>
        <select value={copyFrom} onChange={function(e){setCopyFrom(e.target.value);}} style={{...sinp,flex:1,padding:"6px 10px"}}>
          {availMonths.map(function(mk){return <option key={mk} value={mk}>{MONTHS_SHORT[parseInt(mk.split("-")[1])-1]} {mk.slice(0,4)}</option>;})}
        </select>
        <button onClick={function(){
          var srcSnap=pHistory[copyFrom];
          if(!srcSnap)return;
          var nd={};
          pEntries.forEach(function(e){nd[e.id]=srcSnap[e.id]!==undefined?String(srcSnap[e.id]):"";});
          setDraft(nd);
          setShowCopy(false);
          setToast(L("Valori copiati da")+" "+MONTHS_SHORT[parseInt(copyFrom.split("-")[1])-1]+" "+copyFrom.slice(0,4));
        }} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>{L("Copia")}</button>
        <button onClick={function(){setShowCopy(false);}} style={{background:"none",border:"none",cursor:"pointer",color:subC,fontSize:13}}>{L("Annulla")}</button>
      </div>
    }
  </div>;
}

// ── PATRIMONIO PANEL ────────────────────────────────────────────────────────
export function PatrimonioPanel(){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c:any=useApp();
  var translateUiRuntimeText:any=_c.translateUiRuntimeText;
  var monthShortName:any=_c.monthShortName;
  var monthFullName:any=_c.monthFullName;
  function L(s){return translateUiRuntimeText?translateUiRuntimeText(s):s;}
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_c;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_c;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_c;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_c;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_c;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_c;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_c;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_c;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat}:any=_c;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_c;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_c;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_c;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_c;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_c;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_c;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_c;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_c;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_c;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_c;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_c;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_c;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening}:any=_c;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_c;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_c;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_c;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_c;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_c;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_c;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_c;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_c;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_c;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_c;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_c;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_c;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_c;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  // ─────────────────────────────────────────────────────────────────────────
  var V=TRANSLATIONS[lang]||TRANSLATIONS.it;
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var pAreas=patrimonioAreas||DEFAULT_PATRIMONIO_AREAS;
  var pEntries=patrimonioEntries||DEFAULT_PATRIMONIO_ENTRIES;
  var pHistory=patrimonioHistory||{};
  var pNotes=patrimonioNotes||{};
  var sinp={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"7px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333"};

  // Tab principale
  var [patTab,setPatTab]=useState("inserimento"); // "inserimento" | "storico"

  // ── INSERIMENTO: mese selezionato ─────────────────────────────────────────
  var [selYear,setSelYear]=useState(curYear);
  var [selMonth,setSelMonth]=useState(now.getMonth()+1); // 1-12
  var selMonthKey=selYear+"-"+String(selMonth).padStart(2,"0");
  var isCurrentMonth=selMonthKey===curMonthKey;

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
  function saveNote(){setPatrimonioNotes(function(n){return{...n,[noteEntryId]:noteDraft};});setNoteEntryId(null);}

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
    setSelMonth(m);setSelYear(y);
  }

  function copyPatrimonioSnapshot(copyFromKey){
    var targetYear=selYear;var targetMonth=selMonth;
    var srcSnap=pHistory[copyFromKey];
    if(!srcSnap){setToast("Nessun valore disponibile per il mese selezionato");return;}
    var nd={};
    pEntries.forEach(function(e){var raw=srcSnap[e.id];if(raw===undefined&&srcSnap.values)raw=srcSnap.values[e.id];if(raw===undefined&&srcSnap.entries)raw=srcSnap.entries[e.id];nd[e.id]=raw!==undefined?String(raw):"";});
    setDraft(nd);
    setSelYear(targetYear);setSelMonth(targetMonth);
    setToast(L("Valori copiati da")+" "+MONTHS_SHORT[parseInt(copyFromKey.split("-")[1])-1]+" "+copyFromKey.slice(0,4));
  }

  // Salva snapshot per il mese selezionato
  function saveMonthSnap(){
    var snap={};
    pEntries.forEach(function(e){snap[e.id]=parseFloat(draft[e.id])||0;});
    snap._total=draftTotal;
    snap._savedAt=new Date().toISOString();
    // Se è il mese corrente aggiorna anche pValues (valori "live")
    if(isCurrentMonth){
      var newVals={};
      pEntries.forEach(function(e){newVals[e.id]=parseFloat(draft[e.id])||0;});
      setPatrimonioValues(newVals);
    }
    setPatrimonioHistory(function(h){return{...h,[selMonthKey]:snap};});
    setToast("Patrimonio "+MONTHS_SHORT[selMonth-1]+" "+selYear+" salvato");
  }

  // Elimina snapshot mese
  function delMonthSnap(mk){
    setPatrimonioHistory(function(h){var q={...h};delete q[mk];return q;});
    setToast("Snapshot eliminato");
  }

  function addEntry(areaId){if(!newEntryName.trim())return;var nid="entry_"+Date.now();setPatrimonioEntries(function(p){return [...p,{id:nid,name:newEntryName.trim(),icon:newEntryIcon,areaId:areaId}];});setDraft(function(d){return{...d,[nid]:""}});setNewEntryName("");setNewEntryIcon("📦");setAddingEntry(null);}
  function delEntry(eid){setPatrimonioEntries(function(p){return p.filter(function(x){return x.id!==eid;});});setDraft(function(d){var q={...d};delete q[eid];return q;});if(isCurrentMonth)setPatrimonioValues(function(p){var q={...p};delete q[eid];return q;});}

  // ── STORICO ────────────────────────────────────────────────────────────────
  var [histViewYear,setHistViewYear]=useState(String(curYear));
  var histMonths=useMemo(function(){
    var keys=Object.keys(pHistory).sort();
    return keys.map(function(mk,i){
      var snap=pHistory[mk];
      var prev=i>0?pHistory[keys[i-1]]:null;
      var total=snap._total||pEntries.reduce(function(a,e){return a+(parseFloat(snap[e.id])||0);},0);
      var prevT=prev?(prev._total||pEntries.reduce(function(a,e){return a+(parseFloat(prev[e.id])||0);},0)):null;
      return{mk:mk,snap:snap,total:total,delta:prevT!==null?total-prevT:null};
    }).reverse();
  },[pHistory,pEntries]);
  var histYears=useMemo(function(){var ys=new Set(histMonths.map(function(m){return m.mk.slice(0,4);}));return Array.from(ys).sort(function(a,b){return b-a;});},[histMonths]);
  var filteredHist=histMonths.filter(function(m){return m.mk.startsWith(histViewYear);});

  // Totale corrente (mese corrente) per header
  var liveTotalSnap=pHistory[curMonthKey];
  var liveTotal=liveTotalSnap?(liveTotalSnap._total||pEntries.reduce(function(a,e){return a+(parseFloat(liveTotalSnap[e.id])||0);},0)):pEntries.reduce(function(a,e){return a+(parseFloat((patrimonioValues||{})[e.id])||0);},0);
  var livePrevSnap=pHistory[useMemo(function(){var d=new Date(curYear,now.getMonth()-1,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");},[])];
  var livePrevTotal=livePrevSnap?(livePrevSnap._total||0):null;

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>

    {/* Note modal */}
    {noteEntryId&&(function(){
      var entry=pEntries.find(function(e){return e.id===noteEntryId;});
      return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 16px 2vh",boxSizing:"border-box",overflowY:"auto"}} onClick={function(e){if(e.target===e.currentTarget){saveNote();}}}>
        <div style={{background:dark?"#1e1e30":"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:440,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:600,color:textC}}>{entry?entry.icon+" "+L(entry.name):L("Nota")}</div>
            <button onClick={function(){saveNote();}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#aaa"}}>×</button>
          </div>
          <textarea value={noteDraft} onChange={function(e){setNoteDraft(e.target.value);}} placeholder={L("Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)")} style={{...sinp,height:120,resize:"vertical",lineHeight:1.5}} autoFocus/>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={saveNote} bg="#7F77DD" style={{flex:1,padding:"10px",fontWeight:600}}>💾 {L("Salva nota")}</Btn>
            <Btn onClick={function(){setNoteEntryId(null);}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"} style={{padding:"10px 14px"}}>{V.cancel}</Btn>
          </div>
          {pNotes[noteEntryId]&&<button onClick={function(){setPatrimonioNotes(function(n){var q={...n};delete q[noteEntryId];return q;});setNoteEntryId(null);}} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:12,width:"100%"}}>🗑 {L("Elimina nota")}</button>}
        </div>
      </div>;
    })()}

    {/* ── Header totale ── */}
    <div style={{background:"linear-gradient(135deg,#378ADD22,#9F77DD22)",borderRadius:14,border:"1px solid "+(dark?"#444":"#ddd"),padding:20,textAlign:"center"}}>
      <div style={{fontSize:11,color:subC,marginBottom:2}}>{L("Patrimonio")} — {monthFullName?monthFullName(now.getMonth()):MONTHS_FULL[now.getMonth()]} {curYear}</div>
      <div style={{fontSize:32,fontWeight:700,color:liveTotal>=0?"#1D9E75":"#E24B4A"}}>{fmt(liveTotal)}</div>
      {secRate&&showSecInPatrimonio&&fmtSec(liveTotal)&&<div style={{fontSize:14,color:subC,marginTop:2}}>{fmtSec(liveTotal)}</div>}
      {livePrevTotal!==null&&<div style={{fontSize:13,fontWeight:500,color:(liveTotal-livePrevTotal)>=0?"#1D9E75":"#E24B4A",marginTop:4}}>
        {(liveTotal-livePrevTotal)>=0?"▲":"▼"} {fmt(Math.abs(liveTotal-livePrevTotal))} {L("vs mese scorso")}
      </div>}
      <div style={{fontSize:11,color:subC,marginTop:6}}>{L("Modalità")}: {L(patrimonioMode==="manuale"?"Manuale":"Semi-automatica")} {patrimonioMode==="semi"?"⚠️":""}</div>
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
          <div style={{fontSize:16,fontWeight:700,color:textC}}>{monthFullName?monthFullName(selMonth-1):MONTHS_FULL[selMonth-1]} {selYear}</div>
          <div style={{fontSize:11,color:subC,marginTop:2}}>
            {existingSnap?("✅ "+L("Dati già salvati")):(isCurrentMonth?L("Mese corrente — non ancora salvato"):("⚠️ "+L("Nessun dato per questo mese")))}
          </div>
        </div>
        <button onClick={function(){goMonth(1);}} disabled={selMonthKey>=curMonthKey} style={{background:"none",border:"none",cursor:selMonthKey>=curMonthKey?"not-allowed":"pointer",fontSize:20,color:selMonthKey>=curMonthKey?"#ccc":subC,padding:"4px 8px",borderRadius:8}}>›</button>
      </div>

      {/* Totale mese selezionato + delta */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC}}>
        <div>
          <div style={{fontSize:11,color:subC}}>{L("Totale")} {monthShortName?monthShortName(selMonth-1):MONTHS_SHORT[selMonth-1]} {selYear}</div>
          <div style={{fontSize:22,fontWeight:700,color:draftTotal>=0?"#1D9E75":"#E24B4A"}}>{fmt(draftTotal)}{secRate&&showSecInPatrimonio&&fmtSec(draftTotal)&&<div style={{fontSize:12,color:subC,fontWeight:400,marginTop:2}}>{fmtSec(draftTotal)}</div>}</div>
        </div>
        {totalDelta!==null&&<div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:subC}}>{L("vs")} {monthShortName?monthShortName(parseInt(prevKey.split("-")[1])-1):MONTHS_SHORT[parseInt(prevKey.split("-")[1])-1]}</div>
          <div style={{fontSize:16,fontWeight:600,color:totalDelta>=0?"#1D9E75":"#E24B4A"}}>{totalDelta>=0?"+":""}{fmt(totalDelta)}</div>
        </div>}
        <button onClick={saveMonthSnap} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 18px",fontSize:14,cursor:"pointer",fontWeight:600}}>
          {existingSnap?("🔄 "+L("Aggiorna")):("💾 "+L("Salva"))}
        </button>
      </div>

      {/* Copia dal mese precedente */}
      {(()=>{
        var prevMk=(()=>{var m=selMonth-1;var y=selYear;if(m<1){m=12;y--;}return y+"-"+String(m).padStart(2,"0");})();
        var prevSnap=pHistory[prevMk];
        if(!prevSnap)return null;
        return <button onClick={function(){
          var nd={};
          pEntries.forEach(function(e){nd[e.id]=prevSnap[e.id]!==undefined?String(prevSnap[e.id]):"";});
          setDraft(nd);
          setToast(L("Valori copiati da")+" "+(monthShortName?monthShortName(parseInt(prevMk.split("-")[1])-1):MONTHS_SHORT[parseInt(prevMk.split("-")[1])-1])+" "+prevMk.slice(0,4));
        }} style={{background:"none",border:"1px solid #7F77DD",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500,padding:"7px 14px",borderRadius:8}}>
          ⬅️ {L("Copia dal mese precedente")}
        </button>;
      })()}
      {/* Copia da altro mese */}
      <CopyMonthWidget
        pHistory={pHistory}
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
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}>
              <span style={{fontSize:20}}>{area.icon}</span>
              <span style={{fontSize:15,fontWeight:600,color:textC}}>{area.name}</span>
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
                <div style={{display:"flex",alignItems:"center",gap:10,padding:"8px 10px",background:dark?"#252535":"#f9f9f9",borderRadius:pNotes[entry.id]?"10px 10px 0 0":10,border:"1px solid "+(editingId===entry.id?"#7F77DD":(dark?"#333":"#f0f0f0"))}}>
                <span style={{fontSize:16,flexShrink:0}}>{entry.icon}</span>
                <span style={{flex:1,fontSize:13,color:textC}}>{entry.name}</span>
                {editingId===entry.id
                  ?<div style={{display:"flex",gap:6,alignItems:"center"}}>
                    <input type="number" value={rawVal} placeholder="0"
                      onChange={function(e){var v=e.target.value;setDraft(function(d){return{...d,[entry.id]:v};});}}
                      onKeyDown={function(e){if(e.key==="Enter"||e.key==="Tab")setEditingId(null);}}
                      style={{...sinp,width:110,padding:"4px 8px",fontSize:13}} autoFocus/>
                    <button onClick={function(){setEditingId(null);}} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:12,fontWeight:500}}>✓</button>
                  </div>
                  :<div style={{display:"flex",alignItems:"center",gap:6}}>
                    {entryDelta!==null&&entryDelta!==0&&<span style={{fontSize:11,fontWeight:500,color:entryDelta>0?"#1D9E75":"#E24B4A",minWidth:56,textAlign:"right"}}>{entryDelta>0?"+":""}{fmt(entryDelta)}</span>}
                    <span onClick={function(){setEditingId(entry.id);}} style={{fontSize:14,fontWeight:500,color:numVal>0?"#1D9E75":numVal<0?"#E24B4A":subC,minWidth:80,textAlign:"right",cursor:"pointer",borderBottom:"1px dashed "+(dark?"#555":"#ddd"),padding:"1px 0"}}>{rawVal===""?"—":fmt(numVal)}</span>
                    <button onClick={function(){setEditingId(entry.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:14,padding:0}}>✏</button>
                    <button onClick={function(){openNote(entry.id);}} title={L("Nota")} style={{background:pNotes[entry.id]?"#EEEDFE":"none",border:pNotes[entry.id]?"1px solid #AFA9EC":"none",borderRadius:6,cursor:"pointer",color:pNotes[entry.id]?"#534AB7":"#ccc",fontSize:13,padding:"1px 5px"}}>📝</button>
                    <button onClick={function(){delEntry(entry.id);}} style={{background:"none",border:"none",cursor:"pointer",color:"#ccc",fontSize:14,padding:0}}>×</button>
                  </div>
                }
                </div>
                {pNotes[entry.id]&&<div onClick={function(){openNote(entry.id);}} style={{padding:"6px 12px",background:dark?"#1e1e30":"#f5f4ff",border:"1px solid "+(dark?"#3a3a5a":"#c8c0f8"),borderTop:"none",borderRadius:"0 0 10px 10px",fontSize:11,color:dark?"#aac":"#534AB7",cursor:"pointer",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>📝 {pNotes[entry.id]}</div>}
              </div>;
            })}
          </div>
          {addingEntry===area.id
            ?<div style={{marginTop:10,display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
              <EmojiPicker value={newEntryIcon} onChange={setNewEntryIcon}/>
              <input type="text" placeholder={L("Nome voce")} value={newEntryName} onChange={function(e){setNewEntryName(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addEntry(area.id);}} style={{...sinp,flex:1,minWidth:120}}/>
              <button onClick={function(){addEntry(area.id);}} style={{background:"#1D9E75",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>{L("Aggiungi")}</button>
              <button onClick={function(){setAddingEntry(null);setNewEntryName("");}} style={{background:"#f0f0f0",color:"#666",border:"none",borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:13}}>{L("Annulla")}</button>
            </div>
            :<button onClick={function(){setAddingEntry(area.id);}} style={{marginTop:10,background:"none",border:"1px dashed "+(dark?"#444":"#ddd"),borderRadius:8,padding:"7px 14px",cursor:"pointer",color:subC,fontSize:13,width:"100%"}}>+ {L("Aggiungi voce")}</button>
          }
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
              {coords.map(function(p,i){return <g key={i}><circle cx={p.x} cy={p.y} r={3} fill="#7F77DD"/><text x={p.x} y={h-5} textAnchor="middle" fontSize={8} fill={tc2}>{monthShortName?monthShortName(parseInt(p.mk.split("-")[1])-1):MONTHS_SHORT[parseInt(p.mk.split("-")[1])-1]}</text></g>;})}
            </svg>;
          })()}
        </div>}

        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{L("Dettaglio mensile")}</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:dark?"#252535":"#f5f5f5"}}>
                <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:subC}}>{L("Mese")}</th>
                <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>{L("Totale")}</th>
                <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>Δ</th>
                {pAreas.slice(0,isMobile?2:4).map(function(a){return <th key={a.id} style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>{a.icon}</th>;})}
                <th style={{padding:"7px 10px",textAlign:"center",fontWeight:600,color:subC}}></th>
              </tr></thead>
              <tbody>
                {filteredHist.map(function(m){
                  var lbl=(monthShortName?monthShortName(parseInt(m.mk.split("-")[1])-1):MONTHS_SHORT[parseInt(m.mk.split("-")[1])-1])+" "+m.mk.slice(0,4);
                  return <tr key={m.mk} style={{borderBottom:"1px solid "+(dark?"#333":"#f0f0f0")}}>
                    <td style={{padding:"8px 10px",color:textC,fontWeight:500}}>
                      <button onClick={function(){setSelYear(parseInt(m.mk.slice(0,4)));setSelMonth(parseInt(m.mk.split("-")[1]));setPatTab("inserimento");}} style={{background:"none",border:"none",cursor:"pointer",color:"#7F77DD",fontSize:12,fontWeight:600,padding:0,textDecoration:"underline"}}>{lbl}</button>
                    </td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:700,color:m.total>=0?"#1D9E75":"#E24B4A"}}>{fmt(m.total)}</td>
                    <td style={{padding:"8px 10px",textAlign:"right",fontWeight:500,color:m.delta===null?subC:m.delta>=0?"#1D9E75":"#E24B4A"}}>{m.delta===null?"—":(m.delta>=0?"+":"")+fmt(m.delta)}</td>
                    {pAreas.slice(0,isMobile?2:4).map(function(a){
                      var aEnts=pEntries.filter(function(e){return e.areaId===a.id;});
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
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{L("Variazioni per voce")} — {monthShortName?monthShortName(parseInt(filteredHist[0].mk.split("-")[1])-1):MONTHS_SHORT[parseInt(filteredHist[0].mk.split("-")[1])-1]} {L("vs mese precedente")}</div>
          {filteredHist[0].delta===null?<div style={{fontSize:12,color:subC}}>{L("Nessun mese precedente nel registro.")}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {pEntries.map(function(entry){
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
export function SharePanel(){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c:any=useApp();
  var translateUiRuntimeText:any=_c.translateUiRuntimeText;
  function L(s){return translateUiRuntimeText?translateUiRuntimeText(s):s;}
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_c;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_c;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_c;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_c;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_c;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_c;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_c;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_c;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat}:any=_c;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_c;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_c;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_c;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_c;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_c;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_c;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_c;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_c;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_c;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_c;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_c;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_c;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening}:any=_c;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_c;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_c;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_c;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_c;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_c;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_c;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_c;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_c;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_c;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_c;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_c;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_c;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_c;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  // ─────────────────────────────────────────────────────────────────────────
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var projects=shareProjects||[];
  var shareProjectLimitReached=!!canAddPlanItem&&!canAddPlanItem("shareProjects",projects.length,1);
  var selected=projects.find(function(p){return p.id===shareSelectedProjectId;})||projects[0]||null;
  var participants=selected?(selected.participants||[]):[];
  var activeParticipants=participants.filter(function(p){return p.status!=="archived";});
  var [newPersonName,setNewPersonName]=useState("");
  var [newPersonEmail,setNewPersonEmail]=useState("");
  var [personMode,setPersonMode]=useState("user");
  var [shareAmount,setShareAmount]=useState("");
  var [shareDesc,setShareDesc]=useState("");
  var [sharePaidBy,setSharePaidBy]=useState("me");
  var [shareDate,setShareDate]=useState(todayStr());
  var [splitMode,setSplitMode]=useState("equal");
  var [splitDraft,setSplitDraft]=useState({});
    var [shareSplitTouched,setShareSplitTouched]=useState(false);
  var [shareParticipantIds,setShareParticipantIds]=useState([]);
  var [shareEditingActivityId,setShareEditingActivityId]=useState(null);
  var [projectNameDraft,setProjectNameDraft]=useState(selected?selected.name||"":"");
  var [projectDescDraft,setProjectDescDraft]=useState(selected?selected.description||"":"");
  var [projectEditingDetails,setProjectEditingDetails]=useState(false);
  var [settlementFrom,setSettlementFrom]=useState("me");
  var [settlementTo,setSettlementTo]=useState("");
  var [settlementAmount,setSettlementAmount]=useState("");
  var [settlementDate,setSettlementDate]=useState(todayStr());
  var [participantBusy,setParticipantBusy]=useState(false);
  var sinp={width:"100%",borderRadius:10,border:"1px solid "+borderC,padding:"9px 11px",fontSize:13,background:dark?"#2a2a3e":"#fff",color:textC,boxSizing:"border-box"};
  useEffect(function(){setProjectNameDraft(selected?selected.name||"":"");setProjectDescDraft(selected?selected.description||"":"");setProjectEditingDetails(false);setShareEditingActivityId(null);},[selected?selected.id:null]);
  useEffect(function(){var ids=activeParticipants.map(function(p){return p.id;});setShareParticipantIds(function(list){var clean=(list||[]).filter(function(id){return ids.includes(id);});return clean.length?clean:ids;});},[selected?selected.id:null,activeParticipants.map(function(p){return p.id;}).join("|")]);
  function resetShareExpenseForm(){setShareAmount("");setShareDesc("");setShareDate(todayStr());setSplitDraft({});setShareSplitTouched(false);setShareEditingActivityId(null);setShareParticipantIds(activeParticipants.map(function(p){return p.id;}));}
  function personLabel(p){return p&&p.uid===userId?((currentUser&&currentUser.name)||p.name||"Nome"):p.name;}
  var currentShareMember=(participants||[]).find(function(p){return p.uid===userId;})||(participants||[]).find(function(p){return p.id==="me";});
  var currentShareMemberId=currentShareMember?currentShareMember.id:"me";
  useEffect(function(){var ids=activeParticipants.map(function(p){return p.id;});if(ids.length&&!ids.includes(sharePaidBy))setSharePaidBy(currentShareMemberId&&ids.includes(currentShareMemberId)?currentShareMemberId:ids[0]);},[selected?selected.id:null,activeParticipants.map(function(p){return p.id;}).join("|"),currentShareMemberId]);
  function saveProjectDetails(){if(!selected)return;var v=(projectNameDraft||"").trim()||"Progetto";var d=(projectDescDraft||"").trim();updateShareProject(selected.id,function(p){return{...p,name:v,description:d,updatedAt:new Date().toISOString()};});setProjectEditingDetails(false);setToast("Progetto Share aggiornato");}
  function normalizePhoneForLookup(v){return String(v||"").replace(/[^0-9]/g,"");}
  function safeLookupDocId(prefix,value){return prefix+":"+String(value||"").trim().toLowerCase().replace(/\//g,"_");}
  async function findRegisteredUserForShare(email,phone){
    var em=normalizeEmail(email||"");var ph=normalizePhoneForLookup(phone||"");
    try{if(em){var le=await getDoc(doc(fbDb,"userLookup",safeLookupDocId("email",em))).catch(function(){return null;});if(le&&le.exists&&le.exists()){var led=le.data();if(led&&led.uid)return {uid:led.uid,...led,matchType:"email"};}}}catch(e){}
    try{if(ph){var lp=await getDoc(doc(fbDb,"userLookup",safeLookupDocId("phone",ph))).catch(function(){return null;});if(lp&&lp.exists&&lp.exists()){var lpd=lp.data();if(lpd&&lpd.uid)return {uid:lpd.uid,...lpd,matchType:"phone"};}}}catch(e){}
    try{if(em){var byEmail=await getDocs(query(collection(fbDb,"users"),where("email","==",em),limit(1))).catch(function(){return null;});if(byEmail&&byEmail.docs&&byEmail.docs.length){var de=byEmail.docs[0];return {uid:de.id,...de.data(),matchType:"email"};}}}catch(e){}
    try{if(ph){var byPhone=await getDocs(query(collection(fbDb,"users"),where("phone","==",ph),limit(1))).catch(function(){return null;});if(byPhone&&byPhone.docs&&byPhone.docs.length){var dp=byPhone.docs[0];return {uid:dp.id,...dp.data(),matchType:"phone"};}}}catch(e){}
    return null;
  }

  async function loadShareParticipantFromContact(){
    if(!selected||participantBusy)return;
    setParticipantBusy(true);
    try{
      var fn=(typeof window!=="undefined"?(window as any).fainancePickContact:null)||pickFainanceContact;
      var c=await fn();
      if(c&&(c.name||c.email||c.phone)){
        var cname=String(c.name||c.email||c.phone||"").trim();
        var cemail=normalizeEmail(c.email||"");
        var cphone=normalizePhoneForLookup(c.phone||"");
        var foundUser=await findRegisteredUserForShare(cemail,cphone);
        if(foundUser&&foundUser.email&&!cemail)cemail=normalizeEmail(foundUser.email);
        var already=(participants||[]).some(function(p){var pe=normalizeEmail(p.email||"");var pp=normalizePhoneForLookup(p.phone||"");var pn=String(p.name||"").trim().toLowerCase();return (cemail&&pe&&pe===cemail)||(cphone&&pp&&pp===cphone)||(!cemail&&!cphone&&pn&&pn===cname.toLowerCase())||(foundUser&&p.uid&&p.uid===foundUser.uid);});
        if(already){setToast({text:L("Partecipante già presente"),type:"warning",icon:"📇",color:"#FFF8E1",textColor:"#856404"});return;}
        if(foundUser){
          var name=foundUser.name||foundUser.displayName||cname||cemail||cphone;
          var item={id:"p_"+Date.now(),uid:foundUser.uid,name:name,email:cemail||normalizeEmail(foundUser.email||""),phone:cphone||normalizePhoneForLookup(foundUser.phone||""),kind:"registered",type:"registered",role:"member",status:"pending"};
          updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([item]),updatedAt:new Date().toISOString()};});
          try{await createShareInvite(selected,item,item.email||"",name,foundUser);}catch(inviteErr){console.warn("Share invite from contact not sent",inviteErr);}
          setNewPersonName("");setNewPersonEmail("");setPersonMode("user");
          setToast({text:L("Invito Share inviato correttamente."),type:"success",icon:"📇"});
          return;
        }
        if(cemail){
          var inviteItem={id:"p_"+Date.now(),uid:null,name:cname||cemail,email:cemail,phone:cphone,kind:"invited",type:"invited",role:"member",status:"pending"};
          updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([inviteItem]),updatedAt:new Date().toISOString()};});
          try{await createShareInvite(selected,inviteItem,cemail,cname||cemail,null);}catch(inviteErr2){console.warn("Share invite from contact not sent",inviteErr2);}
          setNewPersonName("");setNewPersonEmail("");setPersonMode("user");
          setToast({text:L("Contatto importato dalla rubrica"),type:"success",icon:"📇"});
          return;
        }
        var fakeItem={id:"p_"+Date.now(),name:cname,email:"",phone:cphone,kind:"fake",type:"fake",role:"member",status:"active"};
        updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([fakeItem]),updatedAt:new Date().toISOString()};});
        setNewPersonName("");setNewPersonEmail("");setPersonMode("fake");
        setToast({text:L("Contatto importato dalla rubrica"),type:"success",icon:"📇"});
        return;
      }
      setToast({text:L("Nessun contatto selezionato."),type:"warning",color:"#FFF8E1",icon:"📇",textColor:"#856404"});
    }catch(e){
      console.error(e);
      setToast({text:L("Impossibile aprire la rubrica. Controlla i permessi contatti nelle impostazioni Android dell'app."),type:"warning",color:"#FFF8E1",icon:"📇",textColor:"#856404"});
    }finally{setParticipantBusy(false);}
  }
  async function addParticipant(){
    if(!selected||participantBusy)return;
    var name=newPersonName.trim();var email=normalizeEmail(newPersonEmail);
    if(personMode==="fake"){
      if(!name){setToast("Inserisci il nome della persona esterna");return;}
      var fakeItem={id:"p_"+Date.now(),name:name,email:"",kind:"fake",type:"fake",role:"member",status:"active"};
      updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([fakeItem])};});
      setNewPersonName("");setNewPersonEmail("");setToast("Persona esterna aggiunta");return;
    }
    if(!email){setToast("Inserisci l'email dell'utente");return;}
    setParticipantBusy(true);
    try{
      var foundUser=await findRegisteredUserForShare(email,"");
      name=foundUser?(foundUser.name||foundUser.displayName||email):email;
      var item={id:"p_"+Date.now(),uid:foundUser?foundUser.uid:null,name:name,email:email,kind:foundUser?"registered":"invited",type:foundUser?"registered":"invited",role:"member",status:"pending"};
      updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).concat([item])};});
      await createShareInvite(selected,item,email,name,foundUser);
      setNewPersonName("");setNewPersonEmail("");
      setToast(foundUser?"Invito creato: notifica in app ed email inviata":"Invito creato: email inviata. Quando l'utente si registra con questa email, troverà l'invito.");
    }catch(e){console.error(e);setToast("Errore durante la creazione dell'invito");}
    finally{setParticipantBusy(false);}
  }
  function removeParticipant(pid){if(!selected||pid==="me")return;if(!window.confirm(L("Eliminare questa persona dal progetto Share?")))return;updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).filter(function(x){return x.id!==pid;})};});setToast("Partecipante eliminato");}
  function archiveParticipant(pid){if(!selected||pid==="me")return;if(!window.confirm(L("Archiviare questa persona dal progetto Share?")))return;updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).map(function(x){return x.id===pid?{...x,status:"archived"}:x;})};});setToast("Partecipante archiviato");}
  function restoreParticipant(pid){if(!selected||pid==="me")return;updateShareProject(selected.id,function(p){return{...p,participants:(p.participants||[]).map(function(x){return x.id===pid?{...x,status:"active"}:x;})};});}
  function shareRound(v){return Math.round((Number(v)||0)*100)/100;}
  function selectedShareIds(){var activeIds=activeParticipants.map(function(p){return p.id;});return (shareParticipantIds&&shareParticipantIds.length?shareParticipantIds:activeIds).filter(function(id){return activeIds.includes(id);});}
  function computeShares(){
    var amount=shareRound(parseFloat(shareAmount)||0);var ids=selectedShareIds();var shares={};
    if(!ids.length)return shares;
    if(splitMode==="equal"){var remaining=amount;ids.forEach(function(id,i){var value=i===ids.length-1?remaining:shareRound(amount/ids.length);shares[id]=shareRound(value);remaining=shareRound(remaining-value);});}
    else if(splitMode==="percent"){ids.forEach(function(id){shares[id]=shareRound(amount*((parseFloat(splitDraft[id])||0)/100));});}
    else{ids.forEach(function(id){shares[id]=shareRound(parseFloat(splitDraft[id])||0);});}
    return shares;
  }
  function shareValidation(){
    var amount=shareRound(parseFloat(shareAmount)||0);var ids=selectedShareIds();
    if(!amount||amount<=0)return{ok:false,blocking:false,message:""};
    if(!ids.length)return{ok:false,blocking:true,message:L("Seleziona almeno un partecipante con cui condividere la spesa.")};
    if(splitMode==="percent"){
      var pct=ids.reduce(function(a,id){return a+(parseFloat(splitDraft[id])||0);},0);var pctDiff=shareRound(100-pct);
      if(Math.abs(pctDiff)>0.009){var moneyDiff=shareRound(amount*(pctDiff/100));return{ok:false,blocking:true,message:pctDiff>0?(lang==="es"?"Falta todavía el "+pctDiff.toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+") para llegar al 100%.":lang==="en"?"Still missing "+pctDiff.toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+") to reach 100%.":"Manca ancora il "+pctDiff.toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+") per arrivare al 100%."):(lang==="es"?"Has superado el 100% en "+Math.abs(pctDiff).toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+").":lang==="en"?"You exceeded 100% by "+Math.abs(pctDiff).toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+").":"Hai superato il 100% di "+Math.abs(pctDiff).toFixed(2).replace(".",",")+"% ("+fmt(Math.abs(moneyDiff))+").")};}
    }
    if(splitMode==="amount"){
      var sum=ids.reduce(function(a,id){return a+shareRound(parseFloat(splitDraft[id])||0);},0);var diff=shareRound(amount-sum);
      if(Math.abs(diff)>0.009)return{ok:false,blocking:true,message:diff>0?(lang==="es"?"Faltan todavía "+fmt(Math.abs(diff))+" para llegar al total.":lang==="en"?"Still missing "+fmt(Math.abs(diff))+" to reach the total.":"Mancano ancora "+fmt(Math.abs(diff))+" per arrivare al totale."):(lang==="es"?"Has superado el total en "+fmt(Math.abs(diff))+".":lang==="en"?"You exceeded the total by "+fmt(Math.abs(diff))+".":"Hai superato il totale di "+fmt(Math.abs(diff))+".")};
    }
    return{ok:true,blocking:false,message:""};
  }
  function addSharedActivity(){
    if(!selected)return;if(!shareAmount||parseFloat(shareAmount)<=0){setToast("Inserisci l'importo");return;}
    var validation=shareValidation();if(validation.blocking){setToast(validation.message);return;}
    var shares=computeShares();
    if(!Object.keys(shares).length){setToast("Seleziona almeno un partecipante con cui condividere");return;}
    var activity={id:shareEditingActivityId||Date.now(),kind:"expense",amount:shareRound(parseFloat(shareAmount)),desc:shareDesc||"Spesa condivisa",paidBy:sharePaidBy,date:shareDate,time:shareEditingActivityId?(((selected.activities||[]).find(function(x){return x.id===shareEditingActivityId;})||{}).time||new Date().toTimeString().slice(0,5)):new Date().toTimeString().slice(0,5),shares:shares,splitMode:splitMode,sharedWith:Object.keys(shares),createdAt:shareEditingActivityId?(((selected.activities||[]).find(function(x){return x.id===shareEditingActivityId;})||{}).createdAt||new Date().toISOString()):new Date().toISOString(),updatedAt:new Date().toISOString()};
    updateShareProject(selected.id,function(p){
      if(shareEditingActivityId){
        return{...p,activities:(p.activities||[]).map(function(a){return a.id===shareEditingActivityId?activity:a;})};
      }
      return{...p,activities:[activity].concat(p.activities||[])};
    });
    resetShareExpenseForm();setToast(L(shareEditingActivityId?"Spesa Share aggiornata":"Spesa Share aggiunta"));
  }
  function startEditSharedActivity(a){
    if(!a||a.kind==="settlement")return;
    var amt=shareRound(Number(a.amount||0));
    setShareEditingActivityId(a.id);
    setShareAmount(String(amt||""));
    setShareDesc(a.desc||"");
    setSharePaidBy(a.paidBy||currentShareMemberId||"me");
    setShareDate(a.date||todayStr());
    var ids=Object.keys(a.shares||{});
    setShareParticipantIds(ids.length?ids:activeParticipants.map(function(p){return p.id;}));
    var mode=a.splitMode||"amount";
    setSplitMode(mode);
    var draft={};
    if(mode==="percent"){ids.forEach(function(id){draft[id]=amt?String(shareRound((Number(a.shares[id]||0)/amt)*100)):"";});}
    else if(mode==="amount"){ids.forEach(function(id){draft[id]=String(shareRound(Number(a.shares[id]||0)));});}
    else {draft={};}
    setSplitDraft(draft);
    setShareSplitTouched(false);
    setShareProjectTab("attivita");
    setTimeout(function(){try{var el=document.getElementById("share_expense_form");if(el&&el.scrollIntoView)el.scrollIntoView({behavior:"smooth",block:"start"});}catch(e){}},80);
  }
  function addSettlement(){
    if(!selected)return;if(!settlementAmount||parseFloat(settlementAmount)<=0)return;
    var activity={id:Date.now(),kind:"settlement",amount:parseFloat(settlementAmount),from:settlementFrom,to:settlementTo||"me",date:settlementDate,time:new Date().toTimeString().slice(0,5),desc:"Saldo tra partecipanti",createdAt:new Date().toISOString()};
    updateShareProject(selected.id,function(p){return{...p,activities:[activity].concat(p.activities||[])};});
    setSettlementAmount("");setToast("Saldo registrato");
  }
  function deleteActivity(aid){if(!selected)return;if(!window.confirm(L("Eliminare questa spesa Share?")))return;updateShareProject(selected.id,function(p){return{...p,activities:(p.activities||[]).filter(function(a){return a.id!==aid;})};});setToast("Spesa Share eliminata");}
  function balances(){
    var bal={};participants.forEach(function(p){bal[p.id]=0;});
    ((selected&&selected.activities)||[]).forEach(function(a){
      if(a.kind==="settlement"){bal[a.from]=(bal[a.from]||0)+Number(a.amount||0);bal[a.to]=(bal[a.to]||0)-Number(a.amount||0);return;}
      var paid=a.paidBy||"me";bal[paid]=(bal[paid]||0)+Number(a.amount||0);
      Object.keys(a.shares||{}).forEach(function(pid){bal[pid]=(bal[pid]||0)-Number(a.shares[pid]||0);});
    });
    return bal;
  }
  function simplifiedDebts(){
    var b=balances();var debtors=[],creditors=[];Object.keys(b).forEach(function(k){var v=Math.round(b[k]*100)/100;if(v< -0.009)debtors.push({id:k,amount:-v});if(v>0.009)creditors.push({id:k,amount:v});});
    var rows=[];debtors.forEach(function(d){creditors.forEach(function(c){if(d.amount<=0||c.amount<=0)return;var x=Math.min(d.amount,c.amount);rows.push({from:d.id,to:c.id,amount:Math.round(x*100)/100});d.amount-=x;c.amount-=x;});});return rows;
  }
  var b=selected?balances():{};var debts=selected?simplifiedDebts():[];var totalSpent=selected?(selected.activities||[]).filter(function(a){return a.kind!=="settlement";}).reduce(function(a,x){return a+Number(x.amount||0);},0):0;
  var myBalance=b[currentShareMemberId]||0;
  var shareCheck=shareValidation();
  var showShareCheck=shareCheck.blocking&&(shareSplitTouched||Object.keys(splitDraft||{}).some(function(k){return String(splitDraft[k]||"").trim()!=="";}));
  var tabs=[{id:"attivita",label:L("Attività")},{id:"partecipanti",label:L("Partecipanti")},{id:"riassunto",label:L("Riassunto")},{id:"saldi",label:L("Saldi")}];
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10}}><div><div style={{fontSize:20,fontWeight:900,color:textC}}>Share</div><div style={{fontSize:12,color:subC}}>{L("Progetti, spese condivise e saldi")}</div></div><Btn onClick={function(){if(shareProjectLimitReached)return;createShareProject();}} bg={shareProjectLimitReached?"#999":confirmButtonColor} disabled={shareProjectLimitReached}>{L("+ Progetto")}</Btn></div>{shareProjectLimitReached&&<div style={{background:dark?"#342b16":"#FFF8E1",border:"1.5px solid "+(dark?"#6a5520":"#FFD54F"),borderRadius:14,padding:"12px 14px",fontSize:13,color:dark?"#FFE5A6":"#856404",fontWeight:800,lineHeight:1.4}}>⚠️ {L("Hai raggiunto il limite massimo del tuo piano. Non puoi aggiungere altri elementi in questa sezione.")}</div>}
    {(shareReceivedInvites||[]).length>0&&<div style={{background:confirmButtonColor+"18",border:"1px solid "+confirmButtonColor+"55",borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><div style={{fontSize:14,fontWeight:900,color:textC}}>{L("Inviti ricevuti")}</div><div style={{fontSize:12,color:subC}}>{L("Accetta o rifiuta gli inviti ai progetti Share.")}</div></div><button onClick={loadShareCollaboration} style={{background:"transparent",border:"1px solid "+borderC,borderRadius:10,padding:"6px 9px",color:subC,cursor:"pointer"}}>{shareInviteLoading?"...":"↻"}</button></div>{shareReceivedInvites.map(function(inv){return <div key={inv.id} style={{background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{flex:1,minWidth:160}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{inv.projectName||"Progetto Share"}</div><div style={{fontSize:11,color:subC}}>{L("Invito da")} {inv.invitedByName||L("utente fAInance")}</div></div><Btn onClick={function(){acceptShareInvite(inv);}} bg={confirmButtonColor} style={{padding:"7px 10px",fontSize:12}}>{L("Accetta")}</Btn><Btn onClick={function(){declineShareInvite(inv);}} bg={dark?"#333":"#f0f0f0"} color={textC} style={{padding:"7px 10px",fontSize:12}}>{L("Rifiuta")}</Btn></div>;})}</div>}
    {projects.length===0&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:22,textAlign:"center",color:subC}}><div style={{fontSize:34,marginBottom:8}}>🤝</div><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:5}}>{L("Nessun progetto Share")}</div><div style={{fontSize:12}}>{L("Crea un progetto per inserire partecipanti, movimenti e saldi.")}</div></div>}
    {projects.length>0&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>{projects.map(function(p){var active=selected&&selected.id===p.id;return <button key={p.id} onClick={function(){setShareSelectedProjectId(p.id);setShareProjectTab("attivita");}} style={{flex:"0 0 auto",border:"1px solid "+(active?confirmButtonColor:borderC),background:active?confirmButtonColor:"transparent",color:active?"#fff":textC,borderRadius:14,padding:"9px 12px",cursor:"pointer",fontSize:13,fontWeight:800}}>{p.name||L("Progetto")}</button>;})}</div>}
    {selected&&<>
      <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}>
        <div style={{display:"flex",gap:10,alignItems:"flex-start",marginBottom:10}}>{projectEditingDetails?<div style={{flex:1,display:"flex",flexDirection:"column",gap:8}}><input value={projectNameDraft} onChange={function(e){setProjectNameDraft(e.target.value);}} style={{...sinp,fontSize:17,fontWeight:900}}/><textarea placeholder={L("Descrizione progetto (opzionale)")} value={projectDescDraft} onChange={function(e){setProjectDescDraft(e.target.value);}} style={{...sinp,minHeight:72,resize:"vertical"}}/><div style={{display:"flex",gap:8}}><Btn onClick={saveProjectDetails} bg={confirmButtonColor}>{L("Salva modifiche")}</Btn><Btn onClick={function(){setProjectNameDraft(selected?selected.name||"":"");setProjectDescDraft(selected?selected.description||"":"");setProjectEditingDetails(false);}} bg={dark?"#333":"#f0f0f0"} color={textC}>{L("Annulla")}</Btn></div></div>:<div style={{flex:1,minWidth:0}}><div style={{fontSize:17,fontWeight:900,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{selected.name||"Progetto"}</div>{selected.description&&<div style={{fontSize:12,color:subC,marginTop:4,whiteSpace:"pre-wrap"}}>{selected.description}</div>}</div>}<button onClick={function(){setProjectEditingDetails(true);setProjectNameDraft(selected?selected.name||"":"");setProjectDescDraft(selected?selected.description||"":"");}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",color:confirmButtonColor,borderRadius:10,padding:"8px 10px",cursor:"pointer"}}>✏</button><button onClick={function(){if(window.confirm(L("Eliminare il progetto Share?")))deleteShareProject(selected.id);}} style={{background:"#fff0f0",border:"1px solid #ffd0d0",color:expenseColor,borderRadius:10,padding:"8px 10px",cursor:"pointer"}}>🗑</button></div>
        <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}>{tabs.map(function(tb){return <button key={tb.id} onClick={function(){setShareProjectTab(tb.id);}} style={{flex:1,border:"none",borderRadius:10,padding:"8px 4px",background:shareProjectTab===tb.id?confirmButtonColor:"transparent",color:shareProjectTab===tb.id?"#fff":subC,fontSize:12,fontWeight:shareProjectTab===tb.id?800:600,cursor:"pointer"}}>{tb.label}</button>;})}</div>
      </div>
      {shareProjectTab==="attivita"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        <div id="share_expense_form" style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:10}}><div style={{fontSize:14,fontWeight:900,color:textC}}>{L(shareEditingActivityId?"Modifica spesa condivisa":"+ Spesa condivisa")}</div>{shareEditingActivityId&&<button onClick={resetShareExpenseForm} style={{background:"transparent",border:"1px solid "+borderC,borderRadius:9,padding:"6px 8px",fontSize:12,color:subC,cursor:"pointer"}}>{L("Annulla modifica")}</button>}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 2fr 1fr",gap:8}}><input type="number" placeholder={L("Importo")} value={shareAmount} onChange={function(e){setShareAmount(e.target.value);}} style={sinp}/><input placeholder={L("Descrizione")} value={shareDesc} onChange={function(e){setShareDesc(e.target.value);}} style={sinp}/><input type="date" value={shareDate} onChange={function(e){setShareDate(e.target.value);}} style={sinp}/></div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1.4fr",gap:8,marginTop:8}}><select value={sharePaidBy} onChange={function(e){setSharePaidBy(e.target.value);}} style={sinp}>{activeParticipants.map(function(p){return <option key={p.id} value={p.id}>{L("Pagato da")} {personLabel(p)}</option>;})}</select><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6}}>{[{id:"equal",label:L("Equa")},{id:"percent",label:L("Percentuali")},{id:"amount",label:L("Importi")}].map(function(m){return <button key={m.id} onClick={function(){setSplitMode(m.id);setSplitDraft({});setShareSplitTouched(false);}} style={{border:"1px solid "+(splitMode===m.id?confirmButtonColor:borderC),background:splitMode===m.id?confirmButtonColor:"transparent",color:splitMode===m.id?"#fff":textC,borderRadius:10,padding:"8px 6px",fontSize:12,fontWeight:800,cursor:"pointer"}}>{m.label}</button>;})}</div></div><div style={{marginTop:10,background:dark?"#252535":"#f9f9f9",border:"1px solid "+borderC,borderRadius:12,padding:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8,marginBottom:8}}><div style={{fontSize:12,fontWeight:900,color:textC}}>{L("Condivisa con")}</div><label style={{display:"flex",alignItems:"center",gap:6,fontSize:12,color:subC,cursor:"pointer"}}><input type="checkbox" checked={activeParticipants.length>0&&shareParticipantIds.length===activeParticipants.length} onChange={function(){var all=activeParticipants.map(function(p){return p.id;});setShareParticipantIds(shareParticipantIds.length===all.length?[]:all);}}/>{L("Tutti")}</label></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{activeParticipants.map(function(p){var checked=shareParticipantIds.includes(p.id);return <label key={p.id} style={{display:"flex",alignItems:"center",gap:6,border:"1px solid "+(checked?confirmButtonColor:borderC),background:checked?confirmButtonColor+"22":"transparent",borderRadius:20,padding:"5px 9px",fontSize:12,color:checked?confirmButtonColor:textC,cursor:"pointer"}}><input type="checkbox" checked={checked} onChange={function(){setShareParticipantIds(function(list){return list.includes(p.id)?list.filter(function(x){return x!==p.id;}):list.concat([p.id]);});}}/>{personLabel(p)}</label>;})}</div></div>{splitMode!=="equal"&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,marginTop:8}}>{activeParticipants.filter(function(p){return shareParticipantIds.includes(p.id);}).map(function(p){return <div key={p.id}><label style={{fontSize:11,color:subC}}>{personLabel(p)} {splitMode==="percent"?"%":"€"}</label><input type="number" value={splitDraft[p.id]||""} onChange={function(e){var v=e.target.value;setShareSplitTouched(true);setSplitDraft(function(d){return{...d,[p.id]:v};});}} style={sinp}/></div>;})}</div>}{showShareCheck&&<div style={{marginTop:10,background:dark?"#2f2a1e":"#fff8e6",border:"1px solid #F2C94C77",borderRadius:12,padding:"9px 10px",fontSize:12,color:dark?"#F2C94C":"#8A6500",fontWeight:600}}>💡 {shareCheck.message}</div>}<div style={{marginTop:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{fontSize:12,color:subC}}>{L("Quote")}: {Object.keys(computeShares()).map(function(id){var p=participants.find(function(x){return x.id===id;});return (p?personLabel(p):id)+" "+fmt(computeShares()[id]);}).join(" · ")}</div><Btn onClick={addSharedActivity} bg={showShareCheck?"#999":confirmButtonColor} disabled={showShareCheck}>{L(shareEditingActivityId?"Aggiorna spesa":"Salva spesa")}</Btn></div></div>
        <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Attività del progetto")}</div>{(selected.activities||[]).length===0&&<div style={{fontSize:13,color:subC,textAlign:"center",padding:"18px 0"}}>{L("Nessuna attività")}</div>}{(selected.activities||[]).map(function(a){var paid=participants.find(function(p){return p.id===a.paidBy;});var from=participants.find(function(p){return p.id===a.from;});var to=participants.find(function(p){return p.id===a.to;});return <div key={a.id} style={{borderBottom:"1px solid "+borderC,padding:"10px 0",display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18}}>{a.kind==="settlement"?"↔️":"🧾"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:800,color:textC,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{a.kind==="settlement"?((from?personLabel(from):a.from)+" "+L("ha pagato")+" "+(to?personLabel(to):a.to)):a.desc}</div><div style={{fontSize:11,color:subC}}>{fmtDate(a.date,dateFmt)} · {a.time||"--:--"}</div>{a.kind!=="settlement"&&<div style={{marginTop:7,display:"flex",flexDirection:"column",gap:5}}><div style={{fontSize:11,color:textC,fontWeight:800}}>{L("Pagata da")}: {paid?personLabel(paid):(a.paidBy||"—")}</div><div style={{fontSize:11,color:subC,lineHeight:1.35}}>{L("Condivisa con")}: {Object.keys(a.shares||{}).map(function(pid){var pp=participants.find(function(x){return x.id===pid;});return (pp?personLabel(pp):pid)+" "+fmt(a.shares[pid]);}).join(" · ")||"—"}</div></div>}</div><div style={{fontSize:13,fontWeight:900,color:a.kind==="settlement"?confirmButtonColor:expenseColor}}>{fmt(a.amount)}</div>{a.kind!=="settlement"&&<button onClick={function(){startEditSharedActivity(a);}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",borderRadius:9,padding:"5px 8px",cursor:"pointer",color:confirmButtonColor,fontSize:12,fontWeight:800}}>{L("Modifica")}</button>}<button onClick={function(){deleteActivity(a.id);}} style={{background:"none",border:"none",cursor:"pointer",color:subC}}>×</button></div>;})}</div>
      </div>}
      {shareProjectTab==="partecipanti"&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Partecipanti")}</div>{participants.map(function(p){return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+borderC,opacity:p.status==="archived"?0.55:1}}><div style={{width:34,height:34,borderRadius:"50%",background:confirmButtonColor+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:confirmButtonColor}}>{personLabel(p).slice(0,1).toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{personLabel(p)}</div><div style={{fontSize:11,color:subC}}>{L(p.kind==="fake"?"Persona esterna":p.kind==="registered"?"Utente fAInance":"Invito in attesa")}{p.email?" · "+p.email:""}{p.status==="pending"?" · "+L("pendente"):""}{p.status==="archived"?" · "+L("archiviato"):""}</div></div>{p.id!=="me"&&<div style={{display:"flex",gap:5}}>{p.status==="archived"?<button onClick={function(){restoreParticipant(p.id);}} style={{background:"#eef8f4",border:"1px solid #bdebdc",borderRadius:8,color:incomeColor,padding:"5px 7px"}}>{L("Ripristina")}</button>:<button onClick={function(){archiveParticipant(p.id);}} style={{background:"#fff8e1",border:"1px solid #ffe29a",borderRadius:8,color:"#9a6a00",padding:"5px 7px"}}>{L("Archivia")}</button>}<button onClick={function(){removeParticipant(p.id);}} style={{background:"#fff0f0",border:"1px solid #ffd0d0",borderRadius:8,color:expenseColor,padding:"5px 7px"}}>{L("Elimina")}</button></div>}</div>;})}</div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Aggiungi partecipante")}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:6,background:dark?"#252535":"#f5f5f5",borderRadius:10,padding:3,marginBottom:10}}><button type="button" onClick={function(){setPersonMode("user");}} style={{border:"1px solid "+(personMode==="user"?secondaryButtonColor:borderC),borderRadius:8,padding:"8px 6px",background:personMode==="user"?secondaryButtonColor:(dark?"#252535":"#fff"),color:personMode==="user"?"#fff":textC,fontSize:12,fontWeight:850,cursor:"pointer"}}>{L("Utente")}</button><button type="button" onClick={loadShareParticipantFromContact} disabled={participantBusy} style={{border:"1px solid "+(participantBusy?secondaryButtonColor:borderC),borderRadius:8,padding:"8px 6px",background:participantBusy?secondaryButtonColor:(dark?"#252535":"#fff"),color:participantBusy?"#fff":textC,fontSize:12,fontWeight:850,cursor:participantBusy?"not-allowed":"pointer",opacity:participantBusy?0.65:1}}>{participantBusy?"...":L("Da Rubrica")}</button><button type="button" onClick={function(){setPersonMode("fake");}} style={{border:"1px solid "+(personMode==="fake"?secondaryButtonColor:borderC),borderRadius:8,padding:"8px 6px",background:personMode==="fake"?secondaryButtonColor:(dark?"#252535":"#fff"),color:personMode==="fake"?"#fff":textC,fontSize:12,fontWeight:850,cursor:"pointer"}}>{L("Persona Esterna")}</button></div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr auto",gap:8}}>{personMode==="fake"?<input placeholder={L("Nome persona esterna")} value={newPersonName} onChange={function(e){setNewPersonName(e.target.value);}} style={sinp}/>:<input placeholder={L("Email utente")} value={newPersonEmail} onChange={function(e){setNewPersonEmail(e.target.value);}} style={sinp}/>}<Btn onClick={addParticipant} bg={confirmButtonColor} disabled={participantBusy}>{participantBusy?"...":L("Aggiungi")}</Btn></div><div style={{fontSize:11,color:subC,marginTop:8}}>{L("Utente richiede solo l'email: quando l'account viene collegato, verrà mostrato il nome reale. Persona esterna usa solo il nome e non riceve inviti.")}</div></div></div>}
      {shareProjectTab==="riassunto"&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Riassunto")}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:10}}><StatCard title={L("Spese progetto")} value={fmt(totalSpent)} color={expenseColor} bg={expenseColor+"22"}/><StatCard title={L("Mi devono")} value={fmt(Math.max(0,myBalance))} color={incomeColor} bg={incomeColor+"22"}/><StatCard title={L("Devo")} value={fmt(Math.max(0,-myBalance))} color={expenseColor} bg={expenseColor+"22"}/></div><div style={{fontSize:12,color:subC,marginTop:12}}>{L("Questa sezione è secondaria: il flusso principale resta progetto → inserimento spesa.")}</div></div>}
      {shareProjectTab==="saldi"&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Chi deve soldi a chi")}</div>{debts.length===0&&<div style={{fontSize:13,color:subC,textAlign:"center",padding:"16px 0"}}>{L("Nessun saldo aperto")}</div>}{debts.map(function(d,i){var from=participants.find(function(p){return p.id===d.from;});var to=participants.find(function(p){return p.id===d.to;});return <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:13,color:textC,flex:1}}>{from?personLabel(from):d.from} {L("deve pagare")} {to?personLabel(to):d.to}</span><span style={{fontSize:14,fontWeight:900,color:confirmButtonColor}}>{fmt(d.amount)}</span></div>;})}</div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Registra saldo/rimborso")}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr auto",gap:8}}><select value={settlementFrom} onChange={function(e){setSettlementFrom(e.target.value);}} style={sinp}>{participants.map(function(p){return <option key={p.id} value={p.id}>{personLabel(p)}</option>;})}</select><select value={settlementTo} onChange={function(e){setSettlementTo(e.target.value);}} style={sinp}>{participants.map(function(p){return <option key={p.id} value={p.id}>{L("a")} {personLabel(p)}</option>;})}</select><input type="number" placeholder={L("Importo")} value={settlementAmount} onChange={function(e){setSettlementAmount(e.target.value);}} style={sinp}/><label style={{...sinp,minWidth:0,display:"flex",alignItems:"center",justifyContent:"space-between",position:"relative",overflow:"hidden",cursor:"pointer"}}><span>{fmtDate(settlementDate,dateFmt)}</span><span>📅</span><input aria-label={L("Data")} type="date" value={settlementDate} onChange={function(e){setSettlementDate(e.target.value);}} style={{position:"absolute",inset:0,opacity:0,width:"100%",height:"100%",cursor:"pointer"}}/></label><Btn onClick={addSettlement} bg={confirmButtonColor}>{L("Registra")}</Btn></div></div></div>}
    </>}
  </div>;
}

export function MorePanel(){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c:any=useApp();
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_c;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_c;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_c;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_c;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_c;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_c;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_c;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_c;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_c;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat}:any=_c;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_c;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_c;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_c;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_c;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_c;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_c;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_c;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_c;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_c;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_c;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_c;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,secondaryButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_c;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening}:any=_c;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_c;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_c;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_c;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_c;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_c;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_c;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_c;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_c;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_c;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_c;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_c;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_c;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_c;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  // ─────────────────────────────────────────────────────────────────────────
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  function capSectionLabel(v){v=String(v||"");return v?v.charAt(0).toLocaleUpperCase()+v.slice(1):v;}
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var items=[{id:"share",icon:"🤝",label:"Share",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Progetti, costi condivisi e saldi"])||"Progetti, costi condivisi e saldi"},{id:"stats",icon:"📊",label:t.stats||"Statistiche",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Grafici, confronti e metriche"])||"Grafici, confronti e metriche"},{id:"budget",icon:"💰",label:t.budget||"Budget",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Piano mensile e risparmio"])||"Piano mensile e risparmio"},{id:"goals",icon:"🎯",label:t.goals||"Obiettivi",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Risparmi e target"])||"Risparmi e target"},{id:"patrimonio",icon:"💎",label:(TRANSLATIONS[lang]&&TRANSLATIONS[lang].patrimonio)||"Patrimonio",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Asset, conti e storico"])||"Asset, conti e storico"},{id:"appunti",icon:"🗂",label:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Appunti"])||"Appunti",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Note, documenti e coordinate"])||"Note, documenti e coordinate"},{id:"alerts",icon:"🔔",label:t.alerts||"Alert",sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Soglie e avvisi"])||"Soglie e avvisi",badge:alertTriggered},{id:"consulenteAI",icon:<AIGrilloIcon size={28}/>,label:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Consulente AI"])||(lang==="es"?"Asesor IA":lang==="en"?"AI Advisor":"Consulente AI"),sub:(TRANSLATIONS[lang]&&TRANSLATIONS[lang]["Analisi e domande"])||"Analisi e domande"},{id:"settings",icon:"⚙",label:t.settings||"Impostazioni",sub:"Profilo, dati e preferenze"}];
  return <div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><div style={{fontSize:20,fontWeight:900,color:textC}}>{(_c.translateUiRuntimeText?_c.translateUiRuntimeText("Altro"):"Altro")}</div><button onClick={function(){setMobileMenu(false);setTab("home");}} style={{width:38,height:38,borderRadius:19,border:"1px solid "+borderC,background:dark?"#1e1e30":"#fff",color:textC,fontSize:22,fontWeight:900,cursor:"pointer",lineHeight:1}}>×</button></div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>{items.map(function(item){return <button key={item.id} onClick={function(){setTab(item.id);setSettingsPage(null);setMobileMenu(false);}} style={{position:"relative",textAlign:"left",background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:"15px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",color:textC,boxShadow:dark?"none":"0 4px 14px rgba(0,0,0,0.05)"}}><span style={{fontSize:24,width:32,textAlign:"center"}}>{item.icon}</span><span style={{flex:1}}><span style={{display:"block",fontSize:15,fontWeight:800}}>{capSectionLabel(item.label)}</span><span style={{display:"block",fontSize:12,color:subC,marginTop:2}}>{item.sub}</span></span>{item.badge>0&&<span style={{position:"absolute",right:12,top:12,background:expenseColor,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{item.badge}</span>}</button>;})}</div></div>;
}
// panelContent is defined in app.tsx (accede a AppuntiPanel e SettingsPanel nested)

export function ConfirmDialog(){
  var _c:any=useApp();
  var confirmState=_c.confirmState,setConfirmState=_c.setConfirmState,dark=_c.dark,textC=_c.textC,btnRadius=_c.btnRadius;
  function L(s){return _c.translateUiRuntimeText?_c.translateUiRuntimeText(s):s;}
  if(!confirmState)return null;
  return <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",padding:"10vh 16px 2vh",boxSizing:"border-box",overflowY:"auto",background:"rgba(0,0,0,0.45)"}} onClick={function(e){if(e.target===e.currentTarget)setConfirmState(null);}}>
    <div style={{background:dark?"#1e1e30":"#fff",borderRadius:18,padding:"24px 28px",maxWidth:320,width:"90%",boxShadow:"0 8px 32px rgba(0,0,0,0.22)",textAlign:"center"}}>
      <div style={{fontSize:15,fontWeight:600,color:textC,marginBottom:20,lineHeight:1.5}}>{confirmState.msg}</div>
      <div style={{display:"flex",gap:10,justifyContent:"center"}}>
        <button onClick={function(){var cb=confirmState.onOk;setConfirmState(null);cb();}} style={{flex:1,background:"#E24B4A",color:"#fff",border:"none",borderRadius:btnRadius||12,padding:"10px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{L("✓ Conferma")}</button>
        <button onClick={function(){setConfirmState(null);}} style={{flex:1,background:dark?"#333":"#f0f0f0",color:dark?"#eee":"#555",border:"none",borderRadius:btnRadius||12,padding:"10px",fontSize:14,fontWeight:700,cursor:"pointer"}}>{L("Annulla")}</button>
      </div>
    </div>
  </div>;
}

export function DebtCreditsPanel(){
  function L(s){return translateUiRuntimeText(s);}
  var debtBaseAllowed=currentPlan==="base"||currentPlan==="premium";
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
  var debtContactDraftRef=useRef<any>(null);
    var debtAppliedContactRef=useRef<string>("");
  var sinp={...inp,width:"100%",boxSizing:"border-box"};
  var labelStyle={fontSize:11,fontWeight:900,color:subC,margin:"0 0 5px 2px",textTransform:"uppercase",letterSpacing:.3};
  function field(label,child){return <div style={{display:"flex",flexDirection:"column",gap:0}}><label style={labelStyle}>{L(label)}</label>{child}</div>;}
  function balance(item){var v=Number(item.initialAmount||0);(item.transactions||[]).forEach(function(tx){var a=Number(tx.amount||0);v+=tx.action==="increase"?a:-a;});return Math.max(0,Math.round(v*100)/100);}
  function selected(){return (debtCredits||[]).find(function(x){return String(x.id)===String(selectedId);})||null;}
  function resetForm(){setEditingId(null);setKind("debt");setHolder("");setAmount("");setStartDate(todayStr());setEndDate("");setNote("");setShowDebtForm(false);}
  function openItem(item){setSelectedId(item.id);setShowTxForm(false);setEditingTxId("");setTxType("reduction");setTxDate(todayStr());setTxStart(item.startDate||todayStr());setTxEnd(item.estimatedEndDate||"");setTxAmount("");setTxNote("");}
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
  function saveItem(){
    if(!debtBaseAllowed){setToast({text:L("Debiti / Crediti disponibili dal piano Base."),type:"error",color:"#E24B4A",icon:"🚫"});return;}
    var a=parseMoney(amount);if(!holder.trim()||!a){setToast({text:L("Inserisci titolare e importo."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}
    if(editingId){
      setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(editingId)?{...x,kind:kind,holder:holder.trim(),initialAmount:a,startDate:startDate||todayStr(),estimatedEndDate:endDate||"",note:note.trim(),updatedAt:new Date().toISOString()}:x;});});
      setSelectedId(null);setToast({text:L("Debito / Credito aggiornato"),type:"success",icon:"✅"});resetForm();return;
    }
    var item={id:"dc_"+Date.now(),kind:kind,holder:holder.trim(),initialAmount:a,startDate:startDate||todayStr(),estimatedEndDate:endDate||"",note:note.trim(),transactions:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    setDebtCredits(function(list){return [item].concat(list||[]);});setSelectedId(null);setToast({text:L("Debito / Credito salvato"),type:"success",icon:"✅"});resetForm();
  }
  function deleteItem(id){if(!window.confirm(L("Eliminare questo Debito / Credito?")))return;setDebtCredits(function(list){return (list||[]).filter(function(x){return String(x.id)!==String(id);});});if(String(selectedId)===String(id))setSelectedId(null);if(String(editingId)===String(id))resetForm();setToast({text:L("Debito / Credito eliminato"),type:"success",icon:"🗑️"});}
  function editItem(item){setKind(item.kind||"debt");setHolder(item.holder||"");setAmount(String(item.initialAmount||""));setStartDate(item.startDate||todayStr());setEndDate(item.estimatedEndDate||"");setNote(item.note||"");setEditingId(item.id);setSelectedId(null);setShowTxForm(false);setShowDebtForm(true);}
  function saveTx(){var item=selected();if(!item)return;var a=parseMoney(txAmount);if(!a){setToast({text:L("Inserisci l'importo della transazione."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}if(editingTxId&&!window.confirm(L("Confermi la modifica?")))return;var tx={id:editingTxId||("tx_"+Date.now()),action:txType==="increase"?"increase":"reduction",amount:a,date:txDate||todayStr(),startDate:txStart||item.startDate||todayStr(),estimatedEndDate:txEnd||item.estimatedEndDate||"",note:txNote.trim(),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};setDebtCredits(function(list){return (list||[]).map(function(x){if(String(x.id)!==String(item.id))return x;var txs=(x.transactions||[]);return {...x,transactions:editingTxId?txs.map(function(t){return String(t.id)===String(editingTxId)?{...t,...tx}:t;}):[tx].concat(txs),updatedAt:new Date().toISOString()};});});setTxAmount("");setTxNote("");setEditingTxId("");setShowTxForm(false);setToast({text:L(editingTxId?"Transazione modificata":"Transazione Debito / Credito salvata"),type:"success",icon:"✅"});}
  function deleteTx(itemId,txId){if(!window.confirm(L("Confermi la cancellazione?")))return;setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(itemId)?{...x,transactions:(x.transactions||[]).filter(function(t){return String(t.id)!==String(txId);}),updatedAt:new Date().toISOString()}:x;});});setToast({text:L("Cancellazione completata"),type:"success",icon:"🗑️"});}
  function editTx(tx){setEditingTxId(tx.id);setTxType(tx.action||"reduction");setTxAmount(String(tx.amount||""));setTxDate(tx.date||todayStr());setTxStart(tx.startDate||todayStr());setTxEnd(tx.estimatedEndDate||"");setTxNote(tx.note||"");setShowTxForm(true);}
  function closeItem(item){var b=balance(item);if(b<=0)return;if(!window.confirm(L(item.kind==="debt"?"Chiudere questo Debito?":"Chiudere questo Credito?")))return;var tx={id:"tx_"+Date.now(),action:"reduction",amount:b,date:todayStr(),startDate:item.startDate||todayStr(),estimatedEndDate:item.estimatedEndDate||"",note:L(item.kind==="debt"?"Debito chiuso":"Credito chiuso"),createdAt:new Date().toISOString(),closing:true};setDebtCredits(function(list){return (list||[]).map(function(x){return String(x.id)===String(item.id)?{...x,transactions:[tx].concat(x.transactions||[]),closedAt:new Date().toISOString(),updatedAt:new Date().toISOString()}:x;});});setShowTxForm(false);setToast({text:L(item.kind==="debt"?"Debito chiuso":"Credito chiuso"),type:"success",icon:"✅"});}
  function reportPatrimonio(item){var val=balance(item)*(item.kind==="debt"?-1:1);var id="dc_"+item.id;setPatrimonioEntries(function(list){var exists=(list||[]).some(function(e){return e.id===id;});if(exists)return list;return (list||[]).concat([{id:id,name:(item.kind==="debt"?L("Debito"):L("Credito"))+" - "+item.holder,icon:item.kind==="debt"?"📉":"📈",color:item.kind==="debt"?"#E24B4A":"#1D9E75",group:"altro"}]);});setPatrimonioValues(function(v){var next={...(v||{})};if(!next[curMonthKey])next[curMonthKey]={};next[curMonthKey][id]=val;return next;});setToast({text:L("Debito / Credito riportato nel patrimonio"),type:"success",icon:"💎"});}
  function reportMovement(item){var a=balance(item);if(!a)return;var desc=(item.kind==="debt"?L("Debito"):L("Credito"))+" - "+item.holder;if(item.kind==="debt"){addExpenses([{id:Date.now(),amount:a,catId:(cats&&cats[0]&&cats[0].id)||1,methodId:(methods&&methods[0]&&methods[0].id)||1,desc:desc,date:todayStr()}],"manual");}else{addIncomes([{id:Date.now(),amount:a,typeId:(incomeTypes&&incomeTypes[0]&&incomeTypes[0].id)||"stipendio",desc:desc,date:todayStr()}],"manual");}setToast({text:L("Debito / Credito riportato nei movimenti"),type:"success",icon:"💸"});}
  var sel=selected();
  if(sel){return <div style={{display:"flex",flexDirection:"column",gap:14}}><button onClick={function(){setSelectedId(null);setShowTxForm(false);setEditingTxId("");}} style={{alignSelf:"flex-start",background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>‹ {L("Indietro")}</button><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:balance(sel)<=0?(dark?"#202024":"#f2f2f2"):(dark?"#252535":"#F8FAFC"),border:"1px solid "+borderC,borderRadius:14,padding:14}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"flex-start"}}><div><div style={{fontSize:18,fontWeight:900,color:textC}}>{sel.kind==="debt"?"📉":"📈"} {sel.holder}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L(sel.kind==="debt"?"Debito":"Credito")} · {L("Saldo attuale")}: <b style={{color:balance(sel)<=0?incomeColor:textC}}>{fmt(balance(sel))}</b> {balance(sel)<=0&&<b style={{color:incomeColor}}> · {L("Estinto")}</b>}</div><div style={{fontSize:12,color:subC,marginTop:4}}>{L("Data inizio")}: {sel.startDate||"-"} · {L("Fine stimata")}: {sel.estimatedEndDate||"-"}</div>{sel.note&&<div style={{fontSize:12,color:subC,marginTop:4}}>{sel.note}</div>}</div><button onClick={function(){editItem(sel);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>✏️</button></div></div><div style={{display:"flex",gap:8,flexWrap:"wrap"}}>{balance(sel)>0&&<button onClick={function(){setEditingTxId("");setTxType("reduction");setTxAmount("");setTxDate(todayStr());setTxStart(sel.startDate||todayStr());setTxEnd(sel.estimatedEndDate||"");setTxNote("");setShowTxForm(function(v){return !v;});}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>＋ {L("Aggiungi transazione")}</button>}{balance(sel)>0&&<button onClick={function(){closeItem(sel);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>✅ {L(sel.kind==="debt"?"Chiudi Debito":"Chiudi Credito")}</button>}{showDebtCreditsInPatrimonio&&<button onClick={function(){reportPatrimonio(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💎 {L("Riporta nel patrimonio")}</button>}{showDebtCreditsInExpenses&&<button onClick={function(){reportMovement(sel);}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:10,padding:"8px 10px",fontWeight:800,cursor:"pointer"}}>💸 {L("Riporta nei movimenti")}</button>}</div>{balance(sel)>0&&showTxForm&&<div style={{background:dark?"#1f2333":"#FAFBFF",border:"1px solid "+borderC,borderRadius:14,padding:14,display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 120px 140px",gap:8}}>{field("Tipo transazione",<select value={txType} onChange={function(e){setTxType(e.target.value);}} style={sinp}><option value="reduction">{L(sel.kind==="debt"?"Riduzione del Debito":"Riduzione del Credito")}</option><option value="increase">{L(sel.kind==="debt"?"Aumento del debito":"Aumento del Credito")}</option></select>)}{field("Importo",<input value={txAmount} onChange={function(e){setTxAmount(e.target.value);}} inputMode="decimal" placeholder={L("Importo")} style={sinp}/>)}{field("Data transazione",<input type="date" value={txDate} onChange={function(e){setTxDate(e.target.value);}} style={sinp}/>)}{field("Data inizio",<input type="date" value={txStart} onChange={function(e){setTxStart(e.target.value);}} style={sinp}/>)}{field("Data stimata fine",<input type="date" value={txEnd} onChange={function(e){setTxEnd(e.target.value);}} style={sinp}/>)}{field("Commento",<input value={txNote} onChange={function(e){setTxNote(e.target.value);}} placeholder={L("Commento")} style={sinp}/>)}<button onClick={saveTx} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:"pointer"}}>＋ {L(editingTxId?"Salva modifica":"Aggiungi transazione")}</button>{editingTxId&&<button onClick={function(){setEditingTxId("");setShowTxForm(false);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:"pointer"}}>{L("Annulla")}</button>}</div>}<div>{(sel.transactions||[]).map(function(tx){return <div key={tx.id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid "+borderC,borderRadius:10,padding:"8px 10px",marginBottom:6,background:dark?"#252535":"#fff"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:900,color:tx.action==="increase"?expenseColor:incomeColor}}>{tx.action==="increase"?"＋":"−"} {fmt(tx.amount)} · {tx.date||""}</div><div style={{fontSize:11,color:subC}}>{L("Inizio")}: {tx.startDate||"-"} · {L("Fine stimata")}: {tx.estimatedEndDate||"-"}{tx.note?" · "+tx.note:""}</div></div><button onClick={function(){editTx(tx);}} style={{border:"none",background:dark?"#2b2b3a":"#eef1ff",color:confirmButtonColor,borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>✏️</button><button onClick={function(){deleteTx(sel.id,tx.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>🗑️</button></div>;})}{!(sel.transactions||[]).length&&<div style={{fontSize:13,color:subC}}>{L("Nessuna transazione inserita")}</div>}</div></div></div></div>;}
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{background:debtBaseAllowed?cardBg:(dark?"#342b16":"#FFF8E1"),border:"1px solid "+(debtBaseAllowed?borderC:"#FFD54F"),borderRadius:16,padding:16}}>
      <div style={{fontSize:18,fontWeight:900,color:textC,marginBottom:4}}>💳 {L("Debiti / Crediti")}</div>
      <div style={{fontSize:12,color:subC,marginBottom:12}}>{L("Registra debiti e crediti, aggiorna il saldo con transazioni e riportali in patrimonio o nei movimenti.")}</div>
      {!debtBaseAllowed&&<div style={{fontSize:12,color:dark?"#ffd58a":"#856404",marginBottom:12,fontWeight:700}}>🚫 {L("Disponibile dal piano Base.")}</div>}
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
              <button type="button" onClick={resetForm} aria-label={L("Chiudi")} style={{width:40,height:40,borderRadius:12,border:"1px solid #FFB8B8",background:dark?"#3A1F25":"#FFF0F0",color:"#E24B4A",fontSize:24,fontWeight:950,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>×</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"150px 1fr 130px 150px",gap:10}}>
              {field("Tipo",<select value={kind} onChange={function(e){setKind(e.target.value);}} style={sinp}><option value="debt">{L("Debito")}</option><option value="credit">{L("Credito")}</option></select>)}
              {field("Titolare",<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr auto",gap:8}}><input value={holder} onChange={function(e){setHolder(e.target.value);}} placeholder={L("Nome titolare")} style={sinp}/><button type="button" onClick={pickContact} disabled={debtContactBusy} title={L("Cerca nella rubrica")} style={{border:"1px solid "+secondaryButtonColor,background:secondaryButtonColor,color:"#fff",borderRadius:btnRadius,padding:"10px 13px",fontSize:12,fontWeight:900,cursor:debtContactBusy?"not-allowed":"pointer",whiteSpace:"nowrap",opacity:debtContactBusy?0.75:1,boxShadow:dark?"none":"0 3px 10px rgba(0,0,0,0.10)"}}>{debtContactBusy?"...":L("Da Rubrica")}</button></div>)}
              {field("Importo iniziale",<input value={amount} onChange={function(e){setAmount(e.target.value);}} placeholder={L("Importo")} inputMode="decimal" style={sinp}/>)}
              {field("Data inizio",<input type="date" value={startDate} onChange={function(e){setStartDate(e.target.value);}} style={sinp}/>)}
              {field("Data stimata fine",<input type="date" value={endDate} onChange={function(e){setEndDate(e.target.value);}} style={sinp}/>)}
              {field("Commento",<input value={note} onChange={function(e){setNote(e.target.value);}} placeholder={L("Commento")} style={sinp}/>)}
              <div style={{display:"flex",gap:8,alignItems:"flex-end",gridColumn:isMobile?"auto":"1 / -1"}}><button onClick={saveItem} disabled={!debtBaseAllowed} style={{background:debtBaseAllowed?confirmButtonColor:"#ccc",color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px 14px",fontWeight:900,cursor:debtBaseAllowed?"pointer":"not-allowed",width:"100%"}}>{L("Salva")}</button></div>
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
      <div style={{display:"none"}}>
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
            <button onClick={saveTx} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontWeight:900,cursor:"pointer"}}>＋ {L("Aggiungi transazione")}</button>
          </div>}
          <div>{(sel.transactions||[]).map(function(tx){return <div key={tx.id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid "+borderC,borderRadius:10,padding:"8px 10px",marginBottom:6,background:dark?"#252535":"#fff"}}><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,fontWeight:900,color:tx.action==="increase"?expenseColor:incomeColor}}>{tx.action==="increase"?"＋":"−"} {fmt(tx.amount)} · {tx.date||""}</div><div style={{fontSize:11,color:subC}}>{L("Inizio")}: {tx.startDate||"-"} · {L("Fine stimata")}: {tx.estimatedEndDate||"-"}{tx.note?" · "+tx.note:""}</div></div><button onClick={function(){deleteTx(sel.id,tx.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"5px 7px",cursor:"pointer"}}>🗑️</button></div>;})}{!(sel.transactions||[]).length&&<div style={{fontSize:13,color:subC}}>{L("Nessuna transazione inserita")}</div>}</div>
        </div>}
      </div>
    </div>
  </div>;
}


export function ShoppingPanel(){
  function L(s){return translateUiRuntimeText(s);}
  var todayIso=new Date().toISOString().slice(0,10);
  var [tabShop,setTabShop]=useStorage(userKey("shopping_active_tab_v1"),"list");
  var [newListTitle,setNewListTitle]=useState("");
  var [newListIcon,setNewListIcon]=useState("🧺");
  var [showNewListForm,setShowNewListForm]=useState(false);
  var [showItemForm,setShowItemForm]=useState(false);
  var [showProductForm,setShowProductForm]=useState(false);
  var [showProductSortMenu,setShowProductSortMenu]=useState(false);
  var [cardName,setCardName]=useState("");
  var [cardCode,setCardCode]=useState("");
  var [cardCodeType,setCardCodeType]=useState("barcode");
  var [cardColor,setCardColor]=useState("#0F9F76");
  var [itemName,setItemName]=useState("");
  var [itemArea,setItemArea]=useState(shoppingDefaultArea||"Alimenti");
  var [itemNote,setItemNote]=useState("");
  var [itemQty,setItemQty]=useState("1");
  var [itemUnit,setItemUnit]=useState("unità");
  var [productName,setProductName]=useState("");
  var [productArea,setProductArea]=useState(shoppingDefaultArea||"Alimenti");
  var [productNote,setProductNote]=useState("");
  var [productQty,setProductQty]=useState("1");
  var [productUnit,setProductUnit]=useState("unità");
  var [editingProductId,setEditingProductId]=useState("");
  var [editingCardId,setEditingCardId]=useState("");
  var [pendingDeleteCardId,setPendingDeleteCardId]=useState("");
  var [showCardCreateChoice,setShowCardCreateChoice]=useState(false);
  var [showCardManualForm,setShowCardManualForm]=useState(false);
  var [pendingScannedCard,setPendingScannedCard]=useState(null);
  var sinp={...inp,width:"100%",boxSizing:"border-box"};
  var softPanel={background:dark?"#1f1f31":"linear-gradient(180deg,#ffffff,#fffaf2)",border:"1px solid "+borderC,borderRadius:20,padding:16,boxShadow:dark?"none":"0 10px 26px rgba(15,23,42,.07)"};
  var formBox={background:dark?"#181827":"linear-gradient(135deg,#fffaf2,#ffffff)",border:"1px solid "+(dark?borderC:"#F4C46A"),borderRadius:18,padding:14,boxShadow:dark?"none":"0 8px 22px rgba(239,159,39,.10)"};
  var lists=(shoppingLists&&shoppingLists.length)?shoppingLists:[{id:"main",title:"Lista principale",icon:"🧺",createdAt:new Date().toISOString()}];
  var activeList=lists.find(function(x){return String(x.id)===String(activeShoppingListId);})||lists[0];
  var activeListId=activeList?activeList.id:"main";
  var areas=(shoppingAreas&&shoppingAreas.length)?shoppingAreas:DEFAULT_SHOPPING_AREAS;
  var unitOptions=["unità","grammi","millilitri","altro"];
  function areaIcon(a){return (shoppingAreaIcons&&shoppingAreaIcons[a])||"📌";}
  function qtyLabel(x){var q=String((x&&x.qty)||"").trim();var u=String((x&&x.unit)||"").trim();if(!q||q==="1")return "";return q+(u?" "+L(u):"");}
  function normName(v){return String(v||"").trim().toLowerCase();}
  function sameProduct(a,b){return normName(a&&a.name)===normName(b&&b.name)&&String((a&&a.area)||"Altro")===String((b&&b.area)||"Altro");}
  function itemBelongsToList(x){return !x.archived&&(String(x.listId||"main")===String(activeListId));}
  function activeItems(){return (shoppingItems||[]).filter(itemBelongsToList);}
  function activeItemsOrdered(){return activeItems().slice().sort(function(a,b){if(!!a.bought!==!!b.bought)return a.bought?1:-1;return (a.order||0)-(b.order||0);});}
  function productArchive(){var seen={};var base=(shoppingItems||[]).filter(function(x){return x.archived;}).filter(function(x){var k=normName(x.name)+"|"+String(x.area||"");if(seen[k])return false;seen[k]=true;return true;});return sortProducts(base);}
  function areaIndex(a){var i=areas.indexOf(a||"Altro");return i<0?999:i;}
  function sortProducts(list){var arr=(list||[]).slice();if(shoppingProductSort==="alpha")arr.sort(function(a,b){return String(a.name||"").localeCompare(String(b.name||""));});else if(shoppingProductSort==="area")arr.sort(function(a,b){return areaIndex(a.area)-areaIndex(b.area)||String(a.name||"").localeCompare(String(b.name||""));});else if(shoppingProductSort==="usage")arr.sort(function(a,b){return (b.usageCount||0)-(a.usageCount||0)||String(a.name||"").localeCompare(String(b.name||""));});else arr.sort(function(a,b){return (a.order||0)-(b.order||0)||areaIndex(a.area)-areaIndex(b.area)||String(a.name||"").localeCompare(String(b.name||""));});return arr;}
  function groupedProducts(){var groups=[];var by={};productArchive().forEach(function(x){var a=x.area||"Altro";if(!by[a]){by[a]=[];groups.push({area:a,items:by[a]});}by[a].push(x);});if(shoppingProductSort==="alpha"||shoppingProductSort==="usage")return [{area:L(shoppingProductSort==="alpha"?"Alfabetico":"Per utilizzo"),items:productArchive()}];return groups.sort(function(g1,g2){return areaIndex(g1.area)-areaIndex(g2.area);});}
  function ean13CheckDigit(first12){var sum=0;String(first12||"").slice(0,12).split("").forEach(function(ch,i){sum+=(Number(ch)||0)*(i%2===0?1:3);});return String((10-(sum%10))%10);}
  function encodeEan13Bits(raw){var code=String(raw||"").replace(/\D/g,"");if(code.length===12)code+=ean13CheckDigit(code);if(code.length!==13)return "";var Lp=["0001101","0011001","0010011","0111101","0100011","0110001","0101111","0111011","0110111","0001011"];var Gp=["0100111","0110011","0011011","0100001","0011101","0111001","0000101","0010001","0001001","0010111"];var Rp=["1110010","1100110","1101100","1000010","1011100","1001110","1010000","1000100","1001000","1110100"];var parity=["LLLLLL","LLGLGG","LLGGLG","LLGGGL","LGLLGG","LGGLLG","LGGGLL","LGLGLG","LGLGGL","LGGLGL"][Number(code[0])||0];var bits="101";for(var i=1;i<=6;i++){var d=Number(code[i])||0;bits+=(parity[i-1]==="L"?Lp[d]:Gp[d]);}bits+="01010";for(var j=7;j<=12;j++){bits+=Rp[Number(code[j])||0];}bits+="101";return bits;}
  function code128Bits(raw){var value=String(raw||"").trim().replace(/[^ -~]/g,"");if(!value)return "";var patterns=["212222","222122","222221","121223","121322","131222","122213","122312","132212","221213","221312","231212","112232","122132","122231","113222","123122","123221","223211","221132","221231","213212","223112","312131","311222","321122","321221","312212","322112","322211","212123","212321","232121","111323","131123","131321","112313","132113","132311","211313","231113","231311","112133","112331","132131","113123","113321","133121","313121","211331","231131","213113","213311","213131","311123","311321","331121","312113","312311","332111","314111","221411","431111","111224","111422","121124","121421","141122","141221","112214","112412","122114","122411","142112","142211","241211","221114","413111","241112","134111","111242","121142","121241","114212","124112","124211","411212","421112","421211","212141","214121","412121","111143","111341","131141","114113","114311","411113","411311","113141","114131","311141","411131","211412","211214","211232","2331112"];var vals=[];if(/^\d{2,}$/.test(value)){if(value.length%2===0){vals=[105];for(var i=0;i<value.length;i+=2)vals.push(Number(value.slice(i,i+2)));}else{vals=[104,Math.max(0,Math.min(94,value.charCodeAt(0)-32)),99];for(var i=1;i<value.length;i+=2)vals.push(Number(value.slice(i,i+2)));}}else{vals=[104];for(var i=0;i<value.length;i++){var code=value.charCodeAt(i);vals.push(Math.max(0,Math.min(94,code-32)));}}var checksum=vals[0];for(var j=1;j<vals.length;j++)checksum+=vals[j]*j;vals.push(checksum%103);vals.push(106);var bits="";vals.forEach(function(v){var pat=patterns[v]||patterns[0];for(var k=0;k<pat.length;k++){bits+=(k%2===0?"1":"0").repeat(Number(pat[k])||1);}});return bits;}
  function barcodeBars(code){var raw=String(code||"").replace(/[^0-9A-Za-z \.\-_$%\/+]/g,"").trim();var bits=code128Bits(raw);if(!bits){var clean=String(code||"").replace(/\D/g,"");bits=encodeEan13Bits(clean);}if(!bits)return [];bits="0000000000"+bits+"0000000000";return bits.split("").map(function(x){return {on:x==="1",w:2};});}
  function qrCells(code){var seed=String(code||"");var cells=[];for(var y=0;y<17;y++){for(var x=0;x<17;x++){var finder=(x<5&&y<5)||(x>11&&y<5)||(x<5&&y>11);var v=finder?((x===0||x===4||y===0||y===4)||(x>1&&x<3&&y>1&&y<3)):(((x*7+y*11+seed.charCodeAt((x+y)%Math.max(seed.length,1)))%5)<2);cells.push({x:x,y:y,on:v});}}return cells;}
  function catalogHas(name,area,list){return (list||shoppingItems||[]).some(function(x){return x.archived&&normName(x.name)===normName(name)&&String(x.area||"Altro")===String(area||"Altro");});}
  function listHasProduct(x){return activeItems().some(function(a){return sameProduct(a,x);});}
  function touchUsage(name,area){setShoppingItems(function(list){return (list||[]).map(function(x){return x.archived&&normName(x.name)===normName(name)&&String(x.area||"Altro")===String(area||"Altro")?{...x,usageCount:(x.usageCount||0)+1,lastUsedAt:new Date().toISOString()}:x;});});}
  function addShoppingList(){var title=String(newListTitle||"").trim();if(!title){setToast({text:L("Inserisci il titolo della lista."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}var id="list_"+Date.now();setShoppingLists(function(list){return (list||[]).concat([{id:id,title:title,icon:newListIcon||"🧺",createdAt:new Date().toISOString()}]);});setActiveShoppingListId(id);setNewListTitle("");setNewListIcon("🧺");setShowNewListForm(false);}
  function deleteShoppingList(id){if(String(id)==="main"||lists.length<=1)return;if(!window.confirm(L("Eliminare questa lista della spesa?")))return;setShoppingLists(function(list){return (list||[]).filter(function(x){return String(x.id)!==String(id);});});setShoppingItems(function(list){return (list||[]).filter(function(x){return String(x.listId||"main")!==String(id)||x.archived;});});setActiveShoppingListId("main");}
  function saveCard(){var clean=String(cardCode||"").replace(/\D/g,"");if(!cardName.trim()||!clean){setToast({text:L("Inserisci nome carta e codice numerico."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}if(editingCardId){setShoppingCards(function(list){return (list||[]).map(function(c){return String(c.id)===String(editingCardId)?{...c,name:cardName.trim(),code:clean,codeType:cardCodeType,color:cardColor,updatedAt:new Date().toISOString()}:c;});});setEditingCardId("");setPendingScannedCard(null);setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");setShowCardManualForm(false);setShowCardCreateChoice(false);setToast({text:L("Carta aggiornata"),type:"success",icon:"✅"});return;}var lim=(PLAN_LIMITS[currentPlan]&&PLAN_LIMITS[currentPlan].shoppingCards)||2;if(lim!==Infinity&&(shoppingCards||[]).length>=lim){setToast({text:L("Hai raggiunto il limite di carte del tuo piano."),type:"error",color:"#E24B4A",icon:"🚫"});return;}var c={id:"card_"+Date.now(),name:cardName.trim(),code:clean,codeType:cardCodeType,color:cardColor,createdAt:new Date().toISOString(),fromScan:!!pendingScannedCard};setShoppingCards(function(list){return [c].concat(list||[]);});setPendingScannedCard(null);setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");setShowCardManualForm(false);setShowCardCreateChoice(false);setToast({text:L("Carta salvata"),type:"success",icon:"✅"});}
  function editCard(c){setPendingScannedCard(null);setEditingCardId(c.id);setCardName(c.name||"");setCardCode(String(c.code||""));setCardCodeType(c.codeType||"barcode");setCardColor(c.color||"#0F9F76");setShowCardCreateChoice(false);setShowCardManualForm(false);setTabShop("cards");}
  function deleteCard(id){setPendingDeleteCardId(String(id||""));}
    function confirmDeleteCard(){var id=String(pendingDeleteCardId||"");if(!id)return;setShoppingCards(function(list){return (list||[]).filter(function(c){return String(c.id)!==id;});});if(String(editingCardId)===id){setEditingCardId("");setCardName("");setCardCode("");setShowCardManualForm(false);setShowCardCreateChoice(false);}setPendingDeleteCardId("");setToast({text:L("Carta eliminata"),type:"success",icon:"🗑️"});}
  function readRawFromBarcodeResult(res){var candidates=[];try{candidates.push(res&&res.rawValue,res&&res.displayValue,res&&res.content,res&&res.text,res&&res.value,res&&res.result);}catch(e){}try{if(res&&Array.isArray(res.barcodes))res.barcodes.forEach(function(b){candidates.push(b&&b.rawValue,b&&b.displayValue,b&&b.value,b&&b.text);});}catch(e){}for(var i=0;i<candidates.length;i++){var raw=String(candidates[i]||"").replace(/\D/g,"");if(raw.length>=4)return raw;}return "";}
  async function scanCardWithNativePlugins(){try{var cap=(window as any).Capacitor;var plugins=(cap&&cap.Plugins)||{};var p=plugins.BarcodeScanner||plugins.BarcodeScanning||plugins.MLKitBarcodeScanner;if(!p)return "";try{if(p.requestPermissions)await p.requestPermissions();}catch(e){}var formats=["QR_CODE","EAN_13","EAN_8","CODE_128","CODE_39","UPC_A","UPC_E","ITF"];var res=null;if(p.scan){res=await p.scan({formats:formats});}else if(p.scanBarcode){res=await p.scanBarcode({formats:formats});}else if(p.startScan){res=await p.startScan();}else if(p.scanCode){res=await p.scanCode();}var raw=readRawFromBarcodeResult(res);try{if(p.stopScan)await p.stopScan();}catch(e){}return raw;}catch(e){return "";}}
  function manualCardPrompt(message){setShowCardCreateChoice(true);setShowCardManualForm(true);setToast({text:L(message||"Non sono riuscito a leggere automaticamente il codice. Si apre l’inserimento manuale."),type:"warning",color:"#FFF8E1",icon:"⌨️",textColor:"#856404"});}
  function normalizeScannedCardCode(raw){return String(raw||"").replace(/\D/g,"");}
  function guessScannedCardName(clean){var c=String(clean||"");if(c==="0470024406224"||c==="470024406224")return "Il Gigante";return L("Carta scansionata");}
  function saveScannedCard(raw,kind){var clean=normalizeScannedCardCode(raw);if(!clean){manualCardPrompt();return;}var detectedType=kind||"barcode";var suggestedName=guessScannedCardName(clean);var draftColor=cardColor||"#0F9F76";setPendingScannedCard({name:suggestedName,code:clean,codeType:detectedType,color:draftColor,createdAt:new Date().toISOString()});setEditingCardId("");setCardName(suggestedName);setCardCode(clean);setCardCodeType(detectedType);setCardColor(draftColor);setShowCardCreateChoice(true);setShowCardManualForm(true);setTabShop("cards");}
  function scanPhysicalCard(){(async function(){try{var nativeRaw=await scanCardWithNativePlugins();if(nativeRaw){saveScannedCard(nativeRaw,"barcode");return;}scanCardFromImage(true);}catch(e){manualCardPrompt("Scanner non disponibile. Inserisci il codice manualmente.");}})();}
  function scanCardFromImage(useCamera){try{var input=document.createElement("input");input.type="file";input.accept="image/*";if(useCamera)input.setAttribute("capture","environment");input.onchange=async function(){try{var file=input.files&&input.files[0];if(!file){manualCardPrompt();return;}if("BarcodeDetector" in window){var Detector=(window as any).BarcodeDetector;var detector=new Detector({formats:["qr_code","ean_13","ean_8","code_128","code_39","upc_a","upc_e","itf"]});var bmp=await createImageBitmap(file);var codes=await detector.detect(bmp);var raw=codes&&codes[0]&&codes[0].rawValue?String(codes[0].rawValue).replace(/\D/g,""):"";if(raw){saveScannedCard(raw,codes&&codes[0]&&String(codes[0].format||"").toLowerCase().indexOf("qr")>=0?"qr":"barcode");return;}}manualCardPrompt("Non sono riuscito a leggere automaticamente il codice. Si apre l’inserimento manuale.");}catch(e){manualCardPrompt("Non sono riuscito a leggere automaticamente il codice. Si apre l’inserimento manuale.");}};input.click();}catch(e){manualCardPrompt("Scanner non disponibile. Inserisci il codice manualmente.");}}
  function uploadCardPhoto(){scanCardFromImage(false);}
  function makeItem(name,area,archived,extra){return {id:(archived?"prod_":"shop_")+Date.now()+"_"+Math.floor(Math.random()*9999),name:name,area:area||"Altro",note:(extra&&extra.note)||"",qty:(extra&&extra.qty)||"1",unit:(extra&&extra.unit)||"unità",bought:false,archived:!!archived,listId:archived?"":activeListId,order:Date.now(),createdAt:new Date().toISOString(),catalogOnly:!!archived,usageCount:(extra&&extra.usageCount)||0};}
  function saveItem(){if(!itemName.trim()){setToast({text:L("Inserisci il nome del prodotto."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}var lim=(PLAN_LIMITS[currentPlan]&&PLAN_LIMITS[currentPlan].shoppingListItems)||25;if(lim!==Infinity&&activeItems().length>=lim){setToast({text:L("Hai raggiunto il limite della lista spesa del tuo piano."),type:"error",color:"#E24B4A",icon:"🚫"});return;}var area=itemArea||"Altro";var name=itemName.trim();var extra={note:itemNote,qty:itemQty,unit:itemUnit,usageCount:1};var it=makeItem(name,area,false,extra);setShoppingItems(function(list){var next=[it].concat(list||[]);if(!catalogHas(name,area,next)){next.push(makeItem(name,area,true,extra));}else{next=next.map(function(x){return x.archived&&normName(x.name)===normName(name)&&String(x.area||"Altro")===String(area||"Altro")?{...x,usageCount:(x.usageCount||0)+1,lastUsedAt:new Date().toISOString()}:x;});}return next;});setItemName("");setItemNote("");setItemQty("1");setItemUnit("unità");setShowItemForm(false);}
  function saveProductOnly(){if(!productName.trim()){setToast({text:L("Inserisci il nome del prodotto."),type:"warning",color:"#FFF8E1",icon:"⚠️",textColor:"#856404"});return;}var name=productName.trim();var area=productArea||"Altro";var extra={note:productNote,qty:productQty,unit:productUnit};if(editingProductId){setShoppingItems(function(list){return (list||[]).map(function(x){return String(x.id)===String(editingProductId)?{...x,name:name,area:area,note:productNote,qty:productQty,unit:productUnit,updatedAt:new Date().toISOString()}:x;});});cancelEditProduct();setTabShop("products");return;}setShoppingItems(function(list){if(catalogHas(name,area,list)){setToast({text:L("Prodotto già presente in Prodotti"),type:"warning",color:"#FFF8E1",icon:"📦",textColor:"#856404"});return list||[];}return [makeItem(name,area,true,extra)].concat(list||[]);});setProductName("");setProductNote("");setProductQty("1");setProductUnit("unità");setShowProductForm(false);setTabShop("products");}
  function addProductToList(x){if(listHasProduct(x))return;var lim=(PLAN_LIMITS[currentPlan]&&PLAN_LIMITS[currentPlan].shoppingListItems)||25;if(lim!==Infinity&&activeItems().length>=lim){setToast({text:L("Hai raggiunto il limite della lista spesa del tuo piano."),type:"error",color:"#E24B4A",icon:"🚫"});return;}setShoppingItems(function(list){return [{...x,id:"shop_"+Date.now()+"_"+Math.floor(Math.random()*9999),archived:false,bought:false,listId:activeListId,order:Date.now(),restoredAt:new Date().toISOString()}].concat((list||[]).map(function(p){return p.archived&&String(p.id)===String(x.id)?{...p,usageCount:(p.usageCount||0)+1,lastUsedAt:new Date().toISOString()}:p;}));});setTabShop("products");}
  function editProduct(x){setEditingProductId(x.id);setProductName(x.name||"");setProductArea(x.area||shoppingDefaultArea||"Alimenti");setProductNote(x.note||"");setProductQty(x.qty||"1");setProductUnit(x.unit||"unità");setShowProductForm(false);setTabShop("products");}
  function deleteProduct(id){if(!window.confirm(L("Eliminare questo prodotto?")))return;setShoppingItems(function(list){return (list||[]).filter(function(x){return String(x.id)!==String(id);});});if(String(editingProductId)===String(id))cancelEditProduct();setToast({text:L("Prodotto eliminato"),type:"success",icon:"🗑️"});}
  function cancelEditProduct(){setEditingProductId("");setProductName("");setProductArea(shoppingDefaultArea||"Alimenti");setProductNote("");setProductQty("1");setProductUnit("unità");setShowProductForm(false);}
  function toggleItem(id){setShoppingItems(function(list){return (list||[]).map(function(x){return String(x.id)===String(id)?{...x,bought:!x.bought,boughtAt:!x.bought?new Date().toISOString():"",order:Date.now()}:x;});});}
  function deleteItem(id){setShoppingItems(function(list){return (list||[]).map(function(x){return String(x.id)===String(id)?{...x,archived:true,bought:false,listId:"",catalogOnly:true,order:Date.now(),archivedAt:new Date().toISOString()}:x;});});}
  function removeBoughtItems(){setShoppingItems(function(list){return (list||[]).map(function(x){return itemBelongsToList(x)&&x.bought?{...x,archived:true,bought:false,listId:"",catalogOnly:true,order:Date.now(),archivedAt:new Date().toISOString()}:x;});});}
  function moveArea(idx,dir){var next=areas.slice();var j=idx+dir;if(j<0||j>=next.length)return;var tmp=next[idx];next[idx]=next[j];next[j]=tmp;setShoppingAreas(next);}
  function moveProduct(id,dir){var current=(shoppingItems||[]).find(function(x){return String(x.id)===String(id);});var area=current?(current.area||"Altro"):"Altro";var archive=productArchive().filter(function(x){return String(x.area||"Altro")===String(area);});var idx=archive.findIndex(function(x){return String(x.id)===String(id);});var j=idx+dir;if(idx<0||j<0||j>=archive.length)return;var ids=archive.map(function(x){return x.id;});var tmp=ids[idx];ids[idx]=ids[j];ids[j]=tmp;setShoppingItems(function(list){return (list||[]).map(function(x){var pos=ids.indexOf(x.id);return pos>=0?{...x,order:(areaIndex(x.area)+1)*10000+pos+1}:x;});});}
  function moveItem(id,dir){var items=activeItemsOrdered().filter(function(x){return !x.bought;});var idx=items.findIndex(function(x){return String(x.id)===String(id);});var j=idx+dir;if(idx<0||j<0||j>=items.length)return;var ids=items.map(function(x){return x.id;});var tmp=ids[idx];ids[idx]=ids[j];ids[j]=tmp;setShoppingItems(function(list){return (list||[]).map(function(x){var pos=ids.indexOf(x.id);return pos>=0?{...x,order:pos+1}:x;});});}
  function productForm(prefix){
    var isList=prefix==="item";
    var qVal=isList?itemQty:productQty;
    var uVal=isList?itemUnit:productUnit;
    return <div style={{...formBox,borderRadius:22,padding:16,background:dark?"#202033":"linear-gradient(135deg,#fff7e8,#ffffff)",boxShadow:dark?"none":"0 12px 28px rgba(239,159,39,.14)"}} onClick={function(e){e.stopPropagation();}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1.4fr 150px 95px 135px",gap:8,alignItems:"end"}}>
        <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Nome prodotto")}<input value={isList?itemName:productName} onChange={function(e){isList?setItemName(e.target.value):setProductName(e.target.value);}} placeholder={L("Nome prodotto")} style={{...sinp,marginTop:5}}/></label>
        <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Area")}<select value={isList?itemArea:productArea} onChange={function(e){isList?setItemArea(e.target.value):setProductArea(e.target.value);}} style={{...sinp,marginTop:5}}>{areas.map(function(a){return <option key={a} value={a}>{areaIcon(a)} {L(a)}</option>;})}</select></label>
        <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Quantità")}<input value={qVal} onChange={function(e){var v=e.target.value.replace(/[^0-9.,]/g,"");isList?setItemQty(v):setProductQty(v);}} placeholder="1" inputMode="decimal" style={{...sinp,marginTop:5}}/></label>
        <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Unità")}<select value={uVal} onChange={function(e){isList?setItemUnit(e.target.value):setProductUnit(e.target.value);}} style={{...sinp,marginTop:5}}>{unitOptions.map(function(u){return <option key={u} value={u}>{L(u)}</option>;})}</select></label>
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 150px",gap:8,marginTop:8,alignItems:"end"}}>
        <label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Note")}<input value={isList?itemNote:productNote} onChange={function(e){isList?setItemNote(e.target.value):setProductNote(e.target.value);}} placeholder={L("Note")} style={{...sinp,marginTop:5}}/></label>
        <button type="button" onClick={function(e){e.stopPropagation();(isList?saveItem:saveProductOnly)();}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"11px 12px",fontWeight:950,cursor:"pointer"}}>{isList?"＋ ":(editingProductId?"💾 ":"＋ ")}{L(isList?"Aggiungi alla lista":(editingProductId?"Salva modifica":"Crea"))}</button>
      </div>
      {!isList&&editingProductId&&<button type="button" onClick={function(e){e.stopPropagation();cancelEditProduct();}} style={{marginTop:8,background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>× {L("Annulla modifica")}</button>}
    </div>;
  }
  function cardCodePreview(c){var type=c.codeType||"barcode";if(type==="qr"){var cells=qrCells(c.code);return <div style={{display:"grid",gridTemplateColumns:"repeat(17,1fr)",gap:1,width:"min(210px,100%)",aspectRatio:"1 / 1",margin:"0 auto",background:"#fff",padding:12,borderRadius:14,boxShadow:"0 8px 18px rgba(0,0,0,.16)",boxSizing:"border-box"}}>{cells.map(function(cell,i){return <div key={i} style={{background:cell.on?"#111":"#fff"}}/>;})}</div>;}var bars=barcodeBars(c.code);return <div style={{background:"#fff",borderRadius:18,padding:"18px 14px 12px",overflow:"hidden",position:"relative",boxShadow:"0 8px 18px rgba(0,0,0,.16)",width:"100%",boxSizing:"border-box"}}><div style={{display:"flex",alignItems:"stretch",height:128,gap:0,width:"100%",justifyContent:"center"}}>{bars.map(function(b,i){return <div key={i} style={{background:b.on?"#050505":"transparent",height:"100%",flex:"1 1 0",minWidth:0}}/>;})}</div><div style={{color:"#111827",textAlign:"center",fontSize:12,fontWeight:900,letterSpacing:1.4,marginTop:8,wordBreak:"break-all"}}>{String(c.code||"")}</div></div>;}
  var active=activeItemsOrdered();
  var archive=productArchive();
  var listGroups={};active.forEach(function(x){var key=x.bought?L("Acquistati"):(x.area||"Altro");if(!listGroups[key])listGroups[key]=[];listGroups[key].push(x);});
  var productTitleStyle={fontSize:18,fontWeight:950,color:textC,marginBottom:4};
  var helperTextStyle={fontSize:12,color:subC,marginBottom:12};
  return <div style={{display:"flex",flexDirection:"column",gap:14}}>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>{[{id:"list",label:"Lista della spesa",icon:"🧺"},{id:"products",label:"Prodotti",icon:"📦"},{id:"cards",label:"Fidelity card",icon:"💳"}].map(function(t){return <button type="button" key={t.id} onClick={function(){setTabShop(t.id);}} style={{border:"1px solid "+(tabShop===t.id?confirmButtonColor:borderC),background:tabShop===t.id?confirmButtonColor:(dark?"#252535":"#fff"),color:tabShop===t.id?"#fff":textC,borderRadius:14,padding:"10px 8px",fontWeight:950,cursor:"pointer",fontSize:12}}>{t.icon} {L(t.label)}</button>;})}</div>

    {tabShop==="list"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={softPanel}>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.25fr .95fr",gap:12,alignItems:"stretch",marginBottom:12}}>
          <div style={{background:dark?"#252535":"linear-gradient(135deg,#FFF7E8,#FFFFFF)",border:"1px solid "+(dark?borderC:"#F4D79B"),borderRadius:18,padding:14}}><div style={{fontSize:20,fontWeight:950,color:textC,display:"flex",alignItems:"center",gap:8}}>🧺 {L("Lista della spesa")}</div><div style={{fontSize:12,color:subC,marginTop:4,lineHeight:1.35}}>{L("Spunta i prodotti già messi nel carrello.")}<br/>{L("Se vuoi creare un’altra lista, vai nelle impostazioni")} <button type="button" onClick={function(){setTab("settings");setSettingsPage("shopping_settings");}} style={{border:"none",background:"transparent",padding:0,color:confirmButtonColor,fontWeight:900,cursor:"pointer",textDecoration:"underline"}}>{L("Spesa")}</button></div></div>
          <div style={{background:dark?"#252535":"#fff",border:"1px solid "+borderC,borderRadius:18,padding:12,display:"flex",flexDirection:"column",gap:10,justifyContent:"center"}}><select value={activeListId} onChange={function(e){setActiveShoppingListId(e.target.value);}} style={{...sinp,minWidth:170,fontWeight:900}}>{lists.map(function(l){return <option key={l.id} value={l.id}>{l.icon||"🧺"} {l.title}</option>;})}</select><button type="button" onClick={function(){setShowItemForm(!showItemForm);}} style={{background:dark?"#1d1d2b":"#F8FAFC",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 10px",fontWeight:950,cursor:"pointer"}}>＋ {L("Crea Prodotto")}</button></div>
        </div>
                  {showItemForm&&productForm("item")}
      </div>
      <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}>
        {Object.keys(listGroups).map(function(area){return <div key={area} style={{marginBottom:12}}><div style={{fontSize:13,fontWeight:950,color:textC,marginBottom:7}}>{area==L("Acquistati")?"✅":areaIcon(area)} {L(area)}</div>{listGroups[area].map(function(x,idx){var bought=!!x.bought;return <div key={x.id} style={{display:"flex",alignItems:"center",gap:8,border:"1px solid "+borderC,borderRadius:12,padding:"9px 10px",marginBottom:7,background:bought?shoppingBoughtColor:(dark?"#252535":"#fff")}}><input type="checkbox" checked={bought} onChange={function(){toggleItem(x.id);}} style={{width:18,height:18,accentColor:incomeColor}}/><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:900,color:bought?subC:textC,textDecoration:bought?"line-through":"none",wordBreak:"break-word"}}>{x.name} {qtyLabel(x)&&<span style={{fontSize:11,color:subC}}>× {qtyLabel(x)}</span>}</div>{x.note&&<div style={{fontSize:11,color:subC,wordBreak:"break-word"}}>{x.note}</div>}</div>{!bought&&<button type="button" disabled={idx===0} onClick={function(){moveItem(x.id,-1);}} style={{border:"1px solid "+borderC,background:dark?"#1d1d2b":"#fff",borderRadius:8,padding:"4px 7px",opacity:idx===0?0.35:1,cursor:idx===0?"not-allowed":"pointer"}}>▲</button>}{!bought&&<button type="button" disabled={idx===listGroups[area].length-1} onClick={function(){moveItem(x.id,1);}} style={{border:"1px solid "+borderC,background:dark?"#1d1d2b":"#fff",borderRadius:8,padding:"4px 7px",opacity:idx===listGroups[area].length-1?0.35:1,cursor:idx===listGroups[area].length-1?"not-allowed":"pointer"}}>▼</button>}<button type="button" onClick={function(){deleteItem(x.id);}} style={{border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:8,padding:"6px 8px",cursor:"pointer"}}>🗑️</button></div>;})}</div>;})}
        {active.some(function(x){return x.bought;})&&<div style={{marginTop:12,display:"flex",justifyContent:"center"}}><button type="button" onClick={removeBoughtItems} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 14px",fontWeight:950,cursor:"pointer",boxShadow:dark?"none":"0 6px 16px rgba(15,23,42,.07)"}}>🧹 {L("Rimuovi prodotti acquistati")}</button></div>}
        {!active.length&&<div style={{fontSize:13,color:subC}}>{L("Lista della spesa vuota")}</div>}
      </div>
    </div>}

    {tabShop==="products"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={softPanel}>
        <div style={{background:dark?"#252535":"linear-gradient(135deg,#FFFFFF,#FFF8E8)",border:"1px solid "+(dark?borderC:"#F1D39C"),borderRadius:20,padding:16,boxShadow:dark?"none":"0 10px 24px rgba(15,23,42,.06)",marginBottom:showProductForm&&!editingProductId?12:0}}>
          <div style={{fontSize:21,fontWeight:950,color:textC,lineHeight:1.1,display:"flex",alignItems:"center",gap:8}}>📦 {L("Prodotti")}</div>
          <div style={{fontSize:12,color:subC,marginTop:6,lineHeight:1.35}}>{L("Tocca il prodotto per aggiungerlo alla lista.")}</div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,alignItems:"center",marginTop:14}}><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();setEditingProductId("");if(showProductForm&&!editingProductId){setShowProductForm(false);return;}setProductName("");setProductArea(shoppingDefaultArea||"Alimenti");setProductNote("");setProductQty("1");setProductUnit("unità");setShowProductForm(true);setShowProductSortMenu(false);setTabShop("products");}} style={{background:dark?"#1d1d2b":"#F8FAFC",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"10px 10px",fontWeight:950,cursor:"pointer",whiteSpace:"nowrap"}}>＋ {L("Crea Prodotto")}</button><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();setShowProductSortMenu(function(v){return !v;});setShowProductForm(false);setTabShop("products");}} style={{background:showProductSortMenu?confirmButtonColor:(dark?"#1d1d2b":"#F8FAFC"),color:showProductSortMenu?"#fff":textC,border:"1px solid "+(showProductSortMenu?confirmButtonColor:borderC),borderRadius:btnRadius,padding:"10px 10px",fontWeight:950,cursor:"pointer",whiteSpace:"nowrap"}}>↕ {L("Ordina")}</button></div>{showProductSortMenu&&<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:8,background:dark?"#1d1d2b":"#fff",border:"1px solid "+borderC,borderRadius:16,padding:8,marginTop:10}}>{[{id:"alpha",label:"Alfabetico"},{id:"area",label:"Per Area"},{id:"usage",label:"Per utilizzo"},{id:"custom",label:"Personalizzato"}].map(function(m){return <button type="button" key={m.id} onClick={function(e){e.preventDefault();e.stopPropagation();setShoppingProductSort(m.id);setShowProductSortMenu(false);setTabShop("products");}} style={{border:"1px solid "+(shoppingProductSort===m.id?confirmButtonColor:borderC),background:shoppingProductSort===m.id?confirmButtonColor:(dark?"#252535":"#F8FAFC"),color:shoppingProductSort===m.id?"#fff":textC,borderRadius:999,padding:"9px 8px",fontSize:12,fontWeight:950,cursor:"pointer",textAlign:"center"}}>{L(m.label)}</button>;})}</div>}
        </div>
        {showProductForm&&!editingProductId&&productForm("product")}
      </div>
      <div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:18,padding:14}}>
        {!archive.length&&<div style={{fontSize:13,color:subC}}>{L("Nessun prodotto salvato")}</div>}
        {groupedProducts().map(function(group){return <div key={group.area} style={{marginBottom:16}}><div style={{fontSize:13,fontWeight:950,color:textC,margin:"0 0 8px"}}>{areaIcon(group.area)} {L(group.area)}</div><div style={{display:"flex",flexDirection:"column",gap:9}}>{group.items.map(function(x,idx){var inList=listHasProduct(x);var editing=String(editingProductId)===String(x.id);return <div key={x.id} style={{border:"1px solid "+(editing?confirmButtonColor:(inList?incomeColor:borderC)),background:inList?(dark?"#183425":"linear-gradient(135deg,#E7F8EE,#F6FFF9)"):(dark?"#252535":"linear-gradient(135deg,#ffffff,#fbfbff)"),borderRadius:18,padding:12,boxShadow:dark?"none":"0 8px 22px rgba(15,23,42,.06)"}}><div style={{display:"grid",gridTemplateColumns:isMobile?"minmax(0,1fr) 38px 38px 38px 38px":"minmax(0,1fr) 140px 38px 38px 38px 38px",alignItems:"center",gap:7}}><button type="button" disabled={inList} onClick={function(e){e.preventDefault();e.stopPropagation();addProductToList(x);setTabShop("products");}} style={{border:"none",background:"transparent",textAlign:"left",cursor:inList?"default":"pointer",padding:"2px 0",minWidth:0}}><div style={{display:"flex",alignItems:"center",gap:7,flexWrap:"wrap"}}><span style={{fontSize:15,fontWeight:950,color:inList?incomeColor:textC,wordBreak:"break-word"}}>{x.name}</span>{inList&&<span style={{fontSize:11,fontWeight:950,color:incomeColor,background:dark?"#123121":"#D9F4E5",border:"1px solid "+incomeColor,borderRadius:999,padding:"2px 7px"}}>✓ {L("In lista")}</span>}</div><div style={{fontSize:11,color:inList?incomeColor:subC,marginTop:3}}>{qtyLabel(x)?qtyLabel(x)+" · ":""}{x.note||""}</div></button><div style={{fontSize:11,color:inList?incomeColor:subC,fontWeight:900,background:dark?"#1d1d2b":"#F7F7F7",border:"1px solid "+borderC,borderRadius:999,padding:"6px 9px",textAlign:"center",display:isMobile?"none":"block",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{L(x.area||"Altro")}{x.usageCount?" · "+x.usageCount:""}</div><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();editProduct(x);setTabShop("products");}} style={{width:38,height:38,border:"none",background:dark?"#2b2b3a":"#EEF1FF",color:confirmButtonColor,borderRadius:12,padding:0,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>✏️</button><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();deleteProduct(x.id);setTabShop("products");}} style={{width:38,height:38,border:"none",background:"#FFF0F0",color:"#E24B4A",borderRadius:12,padding:0,cursor:"pointer",fontSize:16,display:"flex",alignItems:"center",justifyContent:"center"}}>🗑️</button><button type="button" disabled={shoppingProductSort!=="custom"||idx===0} onClick={function(e){e.preventDefault();e.stopPropagation();moveProduct(x.id,-1);setTabShop("products");}} style={{width:38,height:38,border:"1px solid "+borderC,background:dark?"#1d1d2b":"#fff",borderRadius:12,padding:0,opacity:(shoppingProductSort!=="custom"||idx===0)?0.35:1,cursor:shoppingProductSort!=="custom"||idx===0?"not-allowed":"pointer",fontSize:15,fontWeight:950,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>▲</button><button type="button" disabled={shoppingProductSort!=="custom"||idx===group.items.length-1} onClick={function(e){e.preventDefault();e.stopPropagation();moveProduct(x.id,1);setTabShop("products");}} style={{width:38,height:38,border:"1px solid "+borderC,background:dark?"#1d1d2b":"#fff",borderRadius:12,padding:0,opacity:(shoppingProductSort!=="custom"||idx===group.items.length-1)?0.35:1,cursor:shoppingProductSort!=="custom"||idx===group.items.length-1?"not-allowed":"pointer",fontSize:15,fontWeight:950,display:"flex",alignItems:"center",justifyContent:"center",lineHeight:1}}>▼</button></div>{editing&&<div style={{marginTop:10}}>{productForm("product")}</div>}</div>;})}</div></div>;})}
      </div>
    </div>}

    {tabShop==="cards"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
      <div style={softPanel}>
        <div style={productTitleStyle}>💳 {L("Fidelity card e prepagate")}</div>
        <div style={helperTextStyle}>{L("Crea una carta solo quando ti serve: puoi scansionarla, caricare una foto o compilare i dati manualmente.")}</div>
        <button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();if(showCardCreateChoice&&!editingCardId){setShowCardCreateChoice(false);setShowCardManualForm(false);return;}setPendingScannedCard(null);setEditingCardId("");setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");setShowCardCreateChoice(true);setShowCardManualForm(false);setTabShop("cards");}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 12px",fontWeight:950,cursor:"pointer",marginBottom:showCardCreateChoice?12:0}}>＋ {L("Nuova Carta")}</button>
        {showCardCreateChoice&&<div style={{...formBox,marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"repeat(3,1fr)",gap:8}}><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();scanPhysicalCard();}} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"12px",fontWeight:950,cursor:"pointer"}}>📷 {L("Scansiona carta")}</button><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();uploadCardPhoto();}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"12px",fontWeight:950,cursor:"pointer"}}>🖼️ {L("Carica foto")}</button><button type="button" onClick={function(e){e.preventDefault();e.stopPropagation();setShowCardManualForm(true);}} style={{background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"12px",fontWeight:950,cursor:"pointer"}}>⌨️ {L("Compila manualmente")}</button></div>{showCardManualForm&&<div style={{marginTop:12,background:dark?"#202033":"#fff",border:"1px solid "+borderC,borderRadius:18,padding:12}}>{pendingScannedCard&&<div style={{marginBottom:10,padding:"10px 12px",borderRadius:14,background:dark?"#26263a":"#F0FDF4",border:"1px solid "+(dark?"#3A3A52":"#BBF7D0")}}><div style={{fontSize:15,fontWeight:950,color:textC}}>✅ {L("Conferma dati carta")}</div><div style={{fontSize:12,color:subC,marginTop:3}}>{L("Il codice è stato letto. Controlla i dati prima di salvare la carta.")}</div></div>}<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr 130px 54px 120px",gap:8,alignItems:"end"}}><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Nome carta")}<input value={cardName} onChange={function(e){setCardName(e.target.value);}} placeholder={L("Nome carta")} style={{...sinp,marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Codice numerico")}<input value={cardCode} onChange={function(e){setCardCode(e.target.value.replace(/\D/g,""));}} placeholder={L("Codice numerico")} inputMode="numeric" style={{...sinp,marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Tipo codice")}<select value={cardCodeType} onChange={function(e){setCardCodeType(e.target.value);}} style={{...sinp,marginTop:5}}><option value="barcode">{L("Codice a barre")}</option><option value="qr">{L("QR")}</option></select></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Colore")}<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:6}}>{["#0F9F76","#378ADD","#7F77DD","#EF9F27","#E24B4A","#111827"].map(function(c){return <button key={c} type="button" onClick={function(){setCardColor(c);}} style={{width:26,height:26,borderRadius:999,border:cardColor===c?"3px solid #111827":"1px solid #E5E7EB",background:c,cursor:"pointer"}}/>;})}<input type="color" value={cardColor} onChange={function(e){setCardColor(e.target.value);}} style={{width:34,height:30,border:"none",background:"transparent"}}/></div></label><button type="button" onClick={saveCard} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"11px",fontWeight:950,cursor:"pointer"}}>{editingCardId?"💾 ":"＋ "}{L(editingCardId?"Salva modifica":"Aggiungi")}</button></div>{editingCardId&&<button type="button" onClick={function(){setEditingCardId("");setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");setShowCardManualForm(false);setShowCardCreateChoice(false);}} style={{marginTop:8,background:dark?"#252535":"#fff",color:textC,border:"1px solid "+borderC,borderRadius:btnRadius,padding:"9px 12px",fontWeight:900,cursor:"pointer"}}>× {L("Annulla modifica")}</button>}</div>}</div>}
        {false&&pendingScannedCard&&<div style={{...formBox,marginBottom:12,border:"2px solid "+confirmButtonColor,background:dark?"#202033":"linear-gradient(135deg,#fff7df,#ffffff)"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:10}}><div><div style={{fontSize:16,fontWeight:950,color:textC}}>✅ {L("Conferma dati carta")}</div><div style={{fontSize:12,color:subC,marginTop:3}}>{L("Il codice è stato letto. Controlla i dati prima di salvare la carta.")}</div></div><button type="button" onClick={function(){setPendingScannedCard(null);setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");}} style={{border:"1px solid "+borderC,background:dark?"#252535":"#fff",color:textC,borderRadius:12,padding:"7px 10px",fontWeight:950,cursor:"pointer"}}>×</button></div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1.2fr 1fr 130px 54px 120px",gap:8,alignItems:"end"}}><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Nome carta")}<input value={cardName} onChange={function(e){setCardName(e.target.value);}} placeholder={L("Nome carta")} style={{...sinp,marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Codice numerico")}<input value={cardCode} onChange={function(e){setCardCode(e.target.value.replace(/\D/g,""));}} placeholder={L("Codice numerico")} inputMode="numeric" style={{...sinp,marginTop:5}}/></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Tipo codice")}<select value={cardCodeType} onChange={function(e){setCardCodeType(e.target.value);}} style={{...sinp,marginTop:5}}><option value="barcode">{L("Codice a barre")}</option><option value="qr">{L("QR")}</option></select></label><label style={{fontSize:11,fontWeight:900,color:subC}}>{L("Colore")}<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:6}}>{["#0F9F76","#378ADD","#7F77DD","#EF9F27","#E24B4A","#111827"].map(function(c){return <button key={c} type="button" onClick={function(){setCardColor(c);}} style={{width:26,height:26,borderRadius:999,border:cardColor===c?"3px solid #111827":"1px solid #E5E7EB",background:c,cursor:"pointer"}}/>;})}<input type="color" value={cardColor} onChange={function(e){setCardColor(e.target.value);}} style={{width:34,height:30,border:"none",background:"transparent"}}/></div></label><button type="button" onClick={saveCard} style={{background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"11px",fontWeight:950,cursor:"pointer"}}>💾 {L("Salva carta")}</button></div></div>}
      </div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>{(shoppingCards||[]).map(function(c){var mainColor=c.color||((c.type||"")==="prepaid"?"#7F77DD":"#0F9F76");return <div key={c.id} style={{background:"linear-gradient(135deg,"+mainColor+",#101828 82%)",border:"1px solid rgba(255,255,255,.18)",borderRadius:26,padding:18,boxShadow:"0 18px 38px rgba(0,0,0,.24)",color:"#fff",position:"relative",overflow:"hidden",minHeight:250}}><div style={{position:"absolute",right:-45,top:-45,width:160,height:160,borderRadius:999,background:"rgba(255,255,255,.13)"}}/><div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:16,position:"relative"}}><div><div style={{fontSize:20,fontWeight:950,letterSpacing:.2}}>{c.name}</div><div style={{fontSize:12,opacity:.82,marginTop:6,letterSpacing:1.2}}>{c.code}</div></div><div style={{display:"flex",gap:6}}><button type="button" onClick={function(){editCard(c);}} style={{border:"none",background:"rgba(255,255,255,.22)",color:"#fff",borderRadius:10,padding:"7px 9px",height:36,cursor:"pointer"}}>✏️</button><button type="button" onClick={function(){deleteCard(c.id);}} style={{border:"none",background:"rgba(255,255,255,.22)",color:"#fff",borderRadius:10,padding:"7px 9px",height:36,cursor:"pointer"}}>🗑️</button></div></div>{cardCodePreview(c)}{String(editingCardId)===String(c.id)&&<div style={{marginTop:12,background:"rgba(255,255,255,.96)",color:"#111827",borderRadius:18,padding:12,position:"relative",zIndex:2}}><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr 110px 54px",gap:8,alignItems:"end"}}><label style={{fontSize:11,fontWeight:900,color:"#6B7280"}}>{L("Nome carta")}<input value={cardName} onChange={function(e){setCardName(e.target.value);}} placeholder={L("Nome carta")} style={{...sinp,marginTop:5,background:"#fff",color:"#111827"}}/></label><label style={{fontSize:11,fontWeight:900,color:"#6B7280"}}>{L("Codice numerico")}<input value={cardCode} onChange={function(e){setCardCode(e.target.value.replace(/\D/g,""));}} placeholder={L("Codice numerico")} inputMode="numeric" style={{...sinp,marginTop:5,background:"#fff",color:"#111827"}}/></label><label style={{fontSize:11,fontWeight:900,color:"#6B7280"}}>{L("Tipo codice")}<select value={cardCodeType} onChange={function(e){setCardCodeType(e.target.value);}} style={{...sinp,marginTop:5,background:"#fff",color:"#111827"}}><option value="barcode">{L("Codice a barre")}</option><option value="qr">{L("QR")}</option></select></label><label style={{fontSize:11,fontWeight:900,color:"#6B7280"}}>{L("Colore")}<div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginTop:6}}>{["#0F9F76","#378ADD","#7F77DD","#EF9F27","#E24B4A","#111827"].map(function(c){return <button key={c} type="button" onClick={function(){setCardColor(c);}} style={{width:26,height:26,borderRadius:999,border:cardColor===c?"3px solid #111827":"1px solid #E5E7EB",background:c,cursor:"pointer"}}/>;})}<input type="color" value={cardColor} onChange={function(e){setCardColor(e.target.value);}} style={{width:34,height:30,border:"none",background:"transparent"}}/></div></label></div><div style={{display:"flex",gap:8,marginTop:10}}><button type="button" onClick={saveCard} style={{flex:1,background:confirmButtonColor,color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 12px",fontWeight:950,cursor:"pointer"}}>💾 {L("Salva modifica")}</button><button type="button" onClick={function(){setEditingCardId("");setCardName("");setCardCode("");setCardCodeType("barcode");setCardColor("#0F9F76");}} style={{background:"#fff",color:"#111827",border:"1px solid #E5E7EB",borderRadius:btnRadius,padding:"10px 12px",fontWeight:950,cursor:"pointer"}}>× {L("Annulla")}</button></div></div>}</div>;})}{!(shoppingCards||[]).length&&<div style={{fontSize:13,color:subC,background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:16}}>{L("Nessuna carta inserita")}</div>}</div>
    </div>}
  {pendingDeleteCardId&&<div style={{position:"fixed",inset:0,zIndex:10050,background:"rgba(0,0,0,.48)",display:"flex",alignItems:"flex-start",justifyContent:"center",padding:"19vh 16px 3vh",boxSizing:"border-box"}} onClick={function(e){if(e.target===e.currentTarget)setPendingDeleteCardId("");}}><div style={{width:"100%",maxWidth:360,background:dark?"#1b1b2b":"#fff",border:"1px solid "+borderC,borderRadius:20,padding:18,boxShadow:"0 18px 50px rgba(0,0,0,.28)"}} onClick={function(e){e.stopPropagation();}}><div style={{fontSize:17,fontWeight:950,color:textC,marginBottom:8}}>{L("Eliminare questa carta?")}</div><div style={{fontSize:12,color:subC,lineHeight:1.45,marginBottom:16}}>{L("La carta verrà rimossa definitivamente.")}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}><button type="button" onClick={function(){setPendingDeleteCardId("");}} style={{border:"1px solid "+borderC,borderRadius:12,padding:"11px 12px",background:dark?"#252535":"#f5f5f5",color:textC,fontWeight:850,cursor:"pointer"}}>{L("Annulla")}</button><button type="button" onClick={confirmDeleteCard} style={{border:"none",borderRadius:12,padding:"11px 12px",background:"#E24B4A",color:"#fff",fontWeight:900,cursor:"pointer"}}>{L("Elimina")}</button></div></div></div>}</div>;
}

