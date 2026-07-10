import { useState, useEffect, useRef, useMemo } from 'react';
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
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,markAlertsSeen,statsView,setStatsView,curYear}:any=_c;
  var {translateUiRuntimeText,monthShortName,monthFullName}:any=_c;
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
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  function L(s){return translateUiRuntimeText?translateUiRuntimeText(s):s;}
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  function effectiveHomeExpenseGroups(){
    var base=(Array.isArray(expenseGroups)&&expenseGroups.length)?expenseGroups:DEFAULT_EXPENSE_GROUPS;
    var out=(base||[]).slice();
    if(!out.some(function(g){return String(g.id)==="altro";})){
      var altro=(DEFAULT_EXPENSE_GROUPS||[]).find(function(g){return String(g.id)==="altro";})||{id:"altro",name:"Altro",icon:"📦",color:"#D3D1C7"};
      out.push(altro);
    }
    return out;
  }
  function catsForHomeGroup(group){
    var ids=(grps||[]).map(function(g){return String(g.id);});
    return (cats||[]).filter(function(c){var cg=String(c.group||"");return cg===String(group.id)||((!cg||ids.indexOf(cg)<0)&&String(group.id)==="altro");});
  }
  var grps=effectiveHomeExpenseGroups();
  function homeLast12MonthKeys(){var n=new Date();var start=new Date(n.getFullYear(),n.getMonth()-11,1);return Array.from({length:12},function(_,i){var d=new Date(start.getFullYear(),start.getMonth()+i,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");});}
  function homeMonthLabel(mk){var m=parseInt(String(mk).slice(5,7),10)-1;var yy=String(mk).slice(2,4);var base=monthShortName?monthShortName(m):(MONTHS_SHORT[m]||String(mk).slice(5,7));return base+" "+yy;}
  var homeLast12Keys=useMemo(function(){return homeLast12MonthKeys();},[curMonthKey]);
  var homeViewMode=homeBalanceView==="reale"?"reale":"rateizzato";
  function homeMovementAmountForMonth(item,mk){
    if(!item||!item.date||!mk)return 0;
    var amount=parseFloat(item.amount)||0;
    if(homeViewMode==="reale")return String(item.date||"").startsWith(mk)?amount:0;
    try{return Number(rateMonth({...item,amount:amount},mk)||0);}catch(e){return 0;}
  }
  var homeMonthlyTotals=useMemo(function(){return homeLast12Keys.map(function(mk){var exp=(expenses||[]).reduce(function(a,e){return a+homeMovementAmountForMonth(e,mk);},0);var inc=(incomes||[]).reduce(function(a,i){return a+homeMovementAmountForMonth(i,mk);},0);return{label:homeMonthLabel(mk),exp:exp,inc:inc,value:inc-exp};});},[homeLast12Keys.join("|"),expenses,incomes,lang,homeViewMode]);
  var donutData=useMemo(function(){var knownCatIds=(cats||[]).map(function(c){return String(c.id);});return grps.map(function(g){var gc=catsForHomeGroup(g);var ids=gc.map(function(c){return String(c.id);});var isOther=String(g.id)==="altro";var total=(expenses||[]).filter(function(e){if(!e||!e.date)return false;var cid=String(e.catId);return ids.indexOf(cid)>=0||(isOther&&knownCatIds.indexOf(cid)<0);}).reduce(function(a,e){return a+homeLast12Keys.reduce(function(sum,mk){return sum+homeMovementAmountForMonth(e,mk);},0);},0);return{value:total,color:g.color,label:L(g.name)};}).filter(function(d){return d.value>0;});},[grps,cats,expenses,homeLast12Keys.join("|"),homeViewMode,lang]);
  var secBal=fmtSec(curMonthInc-curMonthExp);
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
      <button onClick={function(){setTab("spese");setSpeseSubTab("add");setAddType("expense");setAddSubTab("single");}} style={{background:"linear-gradient(135deg,"+expenseColor+",#B83232)",color:"#fff",border:"none",borderRadius:btnRadius,padding:isMobile?"16px 14px":"20px",fontSize:isMobile?15:17,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 8px 20px rgba(226,75,74,0.24)",minHeight:isMobile?64:72,textAlign:"center",lineHeight:1.1}}>
        <span style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.22)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,flexShrink:0}}>+</span>
        <span>{L("Uscita")}</span>
      </button>
      <button onClick={function(){setTab("spese");setSpeseSubTab("add");setAddType("income");setAddSubTab("single");}} style={{background:"linear-gradient(135deg,"+incomeColor+",#147A5A)",color:"#fff",border:"none",borderRadius:btnRadius,padding:isMobile?"16px 14px":"20px",fontSize:isMobile?15:17,fontWeight:700,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:"0 8px 20px rgba(29,158,117,0.24)",minHeight:isMobile?64:72,textAlign:"center",lineHeight:1.1}}>
        <span style={{width:28,height:28,borderRadius:"50%",background:"rgba(255,255,255,0.22)",display:"inline-flex",alignItems:"center",justifyContent:"center",fontSize:20,fontWeight:800,flexShrink:0}}>+</span>
        <span>{L("Entrata")}</span>
      </button>
    </div>
    {pendingCount>0&&<div onClick={function(){setTab("spese");setSpeseSubTab("recurring");}} style={{background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:"#856404"}}>🔄 {String((t&&t.recurringPendingHome)||L("{count} ricorrenti da confermare per {month}")).replace("{count}",String(pendingCount)).replace("{month}",(monthFullName?monthFullName(now.getMonth()):MONTHS_FULL[now.getMonth()]))}</span><span style={{color:"#856404"}}>›</span></div>}
    {alertTriggered>0&&<div onClick={function(){if(markAlertsSeen)markAlertsSeen();setTab("alerts");}} style={{background:"#fff0f0",border:"1px solid #fcc",borderRadius:12,padding:"12px 16px",cursor:"pointer",display:"flex",justifyContent:"space-between",alignItems:"center"}}><span style={{fontSize:13,color:expenseColor}}>🔔 {alertTriggered} {L("alert di spesa superati")}</span><span style={{color:expenseColor}}>›</span></div>}
    {(() => {
      var budgetConfigured=!!(budgetPlan&&(Number(budgetPlan.manualIncome)>0||Number(budgetPlan.income)>0||(budgetPlan.items||[]).some(function(i){return Number(i.amount)>0;})));
      var goalsConfigured=(goals||[]).some(function(g){var d=DEFAULT_GOALS.find(function(x){return x.id===g.id;});return Number(g.saved)>0||!!g.deadline||!d||d.name!==g.name||Number(d.target)!==Number(g.target);});
      var quickCards=[
        {show:incomes.length===0,icon:"💰",title:L("Registra la tua prima entrata"),tab:"spese",type:"income"},
        {show:expenses.length===0,icon:"💸",title:L("Aggiungi la tua prima uscita"),tab:"spese",type:"expense"},
        {show:!budgetConfigured,icon:"📊",title:L("Imposta il tuo budget mensile"),tab:"budget"},
        {show:!goalsConfigured,icon:"🎯",title:L("Configura i tuoi obiettivi"),tab:"goals"}
      ].filter(function(card){return card.show;});
      return quickCards.length>0?<div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:10}}>{quickCards.map(function(card){return <button key={card.title} onClick={function(){setTab(card.tab);if(card.tab==="spese"){setSpeseSubTab("add");setAddType(card.type);setAddSubTab("single");}}} style={{background:cardBg,border:"1px solid "+borderC,borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",textAlign:"left",color:textC,boxShadow:dark?"none":"0 3px 14px rgba(0,0,0,0.04)"}}><span style={{fontSize:24}}>{card.icon}</span><span style={{fontSize:13,fontWeight:800}}>{card.title}</span><span style={{marginLeft:"auto",color:subC}}>›</span></button>;})}</div>:null;
    })()}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12}}>
      <StatCard title={L("Uscite mese")} value={fmt(curMonthExp)} color={expenseColor} bg={expenseColor+"22"} sub={fmtSec(curMonthExp)&&(secRateLoading?"...":fmtSec(curMonthExp))||undefined}/>
      <StatCard title={L("Entrate mese")} value={fmt(curMonthInc)} color={incomeColor} bg={incomeColor+"22"} sub={fmtSec(curMonthInc)&&(secRateLoading?"...":fmtSec(curMonthInc))||undefined}/>
      <StatCard title={L("Saldo mese")} value={fmt(curMonthInc-curMonthExp)} color="#378ADD" bg="#e8f4ff" sub={secBal&&(secRateLoading?"...":secBal)||undefined}/>
      <StatCard title={L("Saldo ultimi 12 mesi")} value={fmt(last12Balance)} color={BALANCE_COLOR} bg="#e8f4ff" sub={fmtSec(last12Balance)&&(secRateLoading?"...":fmtSec(last12Balance))||undefined}/>
    </div>
    {secondaryCurrency&&secRate&&<div style={{background:dark?"#252535":"#f0f8ff",borderRadius:10,padding:"8px 14px",border:"1px solid "+(dark?"#334":"#c8e0ff"),fontSize:12,color:dark?"#8bf":"#1a5fa8"}}>
      💱 Conversione {currency} → {secondaryCurrency}: 1 {sym} = {secSym}{secRate.toFixed(4)} · Tasso aggiornato in tempo reale
    </div>}
    {secondaryCurrency&&!secRate&&!secRateLoading&&<div style={{background:"#FFF8E1",borderRadius:10,padding:"8px 14px",border:"1px solid #FFD54F",fontSize:12,color:"#856404"}}>
      ⚠️ Impossibile recuperare il tasso {currency}/{secondaryCurrency}. Controlla la connessione.
    </div>}
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:12,color:subC,marginBottom:10}}>{L("Distribuzione uscite")} — {L("Ultimi 12 mesi")}</div>{donutData.length===0?<div style={{fontSize:13,color:"#ccc",textAlign:"center",padding:"20px 0"}}>{L("Nessuna spesa")}</div>:<div style={{display:"flex",gap:14,alignItems:"center"}}><DonutChart data={donutData} size={100}/><div style={{flex:1}}>{donutData.map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/><span style={{fontSize:11,flex:1,color:subC}}>{d.label}</span><span style={{fontSize:11,fontWeight:500,color:textC}}>{fmt(d.value)}</span></div>;})}</div></div>}</div>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16,overflow:"hidden"}}><div style={{fontSize:12,color:subC,marginBottom:6}}>{L("Entrate vs Uscite")} — {L("Ultimi 12 mesi")}</div><BarChart data={homeMonthlyTotals} width={isMobile?420:640} height={138}/></div>
    </div>
    <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16,overflow:"hidden"}}><div style={{fontSize:12,color:subC,marginBottom:6}}>{L("Saldo mensile")} — {L("Ultimi 12 mesi")}</div><LineChart data={homeMonthlyTotals} width={isMobile?360:560} height={104} color={BALANCE_COLOR}/></div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>{[{title:L("Ultime uscite"),items:expenses.slice(0,5),isExp:true},{title:L("Ultime entrate"),items:incomes.slice(0,5),isExp:false}].map(function(pair){return <div key={pair.title} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16,minWidth:0,overflow:"hidden"}}><div style={{fontSize:12,color:subC,marginBottom:10}}>{pair.title}</div>{pair.items.length===0&&<div style={{fontSize:13,color:"#ccc",textAlign:"center",padding:"16px 0"}}>{pair.isExp?L("Nessuna spesa"):L("Nessuna entrata")}</div>}{pair.items.map(function(e){var c=pair.isExp?getCat(e.catId):null;var it=!pair.isExp?getIT(e.type):null;return <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:16,flexShrink:0}}>{pair.isExp?(c?c.icon:"📦"):(it?it.icon:"💰")}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:textC}}>{e.desc||(c?c.name:it?it.name:"")||"-"}</div><div style={{fontSize:11,color:subC}}>{fmtDate(e.date,dateFmt)}</div></div><div style={{textAlign:"right",flexShrink:0,maxWidth:96,overflow:"hidden"}}><div style={{fontSize:13,fontWeight:500,color:pair.isExp?expenseColor:incomeColor,whiteSpace:"nowrap"}}>{fmt(e.amount)}</div>{secRate&&<div style={{fontSize:10,color:subC}}>{fmtSec(e.amount)}</div>}</div></div>;})}</div>;})}</div>
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
  function modalBase(){return {position:"fixed",zIndex:9999,inset:0,background:dark?"#171724":"#F7F8FF",color:textC,overflowY:"auto",padding:isMobile?"18px 16px 26px":"28px max(24px,calc((100vw - 760px)/2)) 34px"};}
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
  function incomeTypeItems(){return (incomeTypes||[]).filter(function(x){return x&&x.id;});}
  function categoryButtons(items,kind){return <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(items||[]).map(function(c){var id=String(c.id);var active=isCatActive(kind,id);var col=c.color||confirmC;return <button key={kind+id} onClick={function(){togglePrefixedCat(kind,id);}} style={{padding:"7px 9px",borderRadius:999,border:"1px solid "+(active?col:borderC),background:active?col:"transparent",color:active?"#fff":textC,fontSize:12,fontWeight:850,cursor:"pointer"}}>{active?"✓ ":"○ "}{c.icon||"🏷️"} {L(c.name)}</button>;})}</div>;}
  function renderFilterModal(){return <div style={modalBase()}>{modalHeader(L("Filtra"),function(){setShowFilterModal(false);})}
    <div style={sectionStyle()}><div style={{fontSize:16,fontWeight:950,color:textC,marginBottom:12}}>{L("Filtra per")}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{toggleButton("Entrate",historyKindActive("incomes"),function(){toggleHistoryKind("incomes");},incomeColor)}{toggleButton("Uscite",historyKindActive("expenses"),function(){toggleHistoryKind("expenses");},expenseColor)}</div></div>
    <div style={sectionStyle()}><div style={{fontSize:16,fontWeight:950,color:textC,marginBottom:12}}>{L("Parola chiave")}</div>{searchBox()}</div>
    <div style={sectionStyle()}><div style={{fontSize:16,fontWeight:950,color:textC,marginBottom:12}}>{L("Periodo")}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"end"}}><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Anno")}<select value={filterYear} onChange={function(e){setFilterYear(e.target.value);setFilterMonth("");}} style={{...inp,width:"100%",marginTop:5}}>{availableYears.map(function(y:any){return <option key={y} value={y}>{y==="all"?L("Tutti gli anni"):y}</option>;})}</select></label><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Mese")}<select value={filterMonth} onChange={function(e){setFilterMonth(e.target.value);setFilterMonths([]);}} style={{...inp,width:"100%",marginTop:5}}><option value="">{L("Tutti i mesi")}</option>{Array.from({length:12},function(_,i){var m=String(i+1).padStart(2,"0");var key=(filterYear&&filterYear!=="all"?filterYear:String(curYear))+"-"+m;return <option key={m} value={key}>{monthFullName?monthFullName(i):MONTHS_FULL[i]}</option>;})}</select></label></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Data da")}<input type="date" value={filterDateFrom} onChange={function(e){setFilterDateFrom(e.target.value);}} style={{...inp,width:"100%",marginTop:5}}/></label><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Data a")}<input type="date" value={filterDateTo} onChange={function(e){setFilterDateTo(e.target.value);}} style={{...inp,width:"100%",marginTop:5}}/></label></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}><button onClick={function(){setFilterDateFrom("");setFilterDateTo("");setFilterMonth(curMonthKey);setFilterMonths([]);}} style={appButton(false)}>{L("Mese corrente")}</button><button onClick={function(){setFilterMonth("");setFilterMonths([]);setFilterDateFrom(dateOffset(30));setFilterDateTo(todayStr());}} style={appButton(false)}>{L("Ultimi 30 giorni")}</button></div><div style={{marginTop:12}}><button onClick={function(){setShowMonthSelector(!showMonthSelector);}} style={{...appButton(showMonthSelector),width:"100%"}}>{showMonthSelector?"✓ ":"○ "}{L("Seleziona Mesi")}</button>{showMonthSelector&&<div style={{marginTop:10}}>{monthButtons()}</div>}</div></div>
    <div style={sectionStyle()}><div style={{fontSize:16,fontWeight:950,color:textC,marginBottom:12}}>{L("Importo")}</div><label style={{fontSize:11,fontWeight:850,color:subC,display:"block",marginBottom:10}}>{L("Importo")} <span style={{fontWeight:650,color:subC}}>({L("Importo esatto")})</span><input value={exactAmountValue()} onChange={function(e){setExactAmountValue(e.target.value);}} inputMode="decimal" placeholder="0" style={{...inp,width:"100%",marginTop:5}}/></label><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,alignItems:"end"}}><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("Da")}<input value={filterAmtMin} onChange={function(e){setFilterAmtMin(e.target.value);}} inputMode="decimal" placeholder="0" style={{...inp,width:"100%",marginTop:5}}/></label><label style={{fontSize:11,fontWeight:850,color:subC}}>{L("A")}<input value={filterAmtMax} onChange={function(e){setFilterAmtMax(e.target.value);}} inputMode="decimal" placeholder="0" style={{...inp,width:"100%",marginTop:5}}/></label></div></div>
    <div style={sectionStyle()}><div style={{fontSize:16,fontWeight:950,color:textC,marginBottom:12}}>{L("Categorie")}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>{toggleButton("Includi Categorie",!filterCatExclude,function(){setFilterCatExclude(false);})}{toggleButton("Escludi Categorie",!!filterCatExclude,function(){setFilterCatExclude(true);})}</div>{historyKindActive("expenses")&&<div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:900,color:subC,marginBottom:7}}>{L("Categorie Uscite")}</div>{categoryButtons(cats||[],"expense")}</div>}{historyKindActive("incomes")&&<div style={{marginBottom:12}}><div style={{fontSize:12,fontWeight:900,color:subC,marginBottom:7}}>{L("Categorie Entrate")}</div>{categoryButtons(incomeTypeItems(),"income")}</div>}{historyKindActive("expenses")&&showShareInHistory&&filterAreaShare&&<div><div style={{fontSize:12,fontWeight:900,color:subC,marginBottom:7}}>Share</div><button onClick={function(){setFilterCat("all");setFilterCats(function(list){var base=(list||[]).map(String);return base.includes("share")?base.filter(function(x){return x!=="share";}):base.concat(["share"]);});}} style={{padding:"7px 9px",borderRadius:999,border:"1px solid "+((filterCats||[]).includes("share")?confirmC:borderC),background:(filterCats||[]).includes("share")?confirmC:"transparent",color:(filterCats||[]).includes("share")?"#fff":textC,fontSize:12,fontWeight:850,cursor:"pointer"}}>{(filterCats||[]).includes("share")?"✓ ":"○ "}🤝 Share</button></div>}<div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button onClick={function(){var all:any[]=[];if(historyKindActive("expenses")){(cats||[]).forEach(function(c){all.push("expense:"+String(c.id));});if(showShareInHistory&&filterAreaShare)all.push("share");}if(historyKindActive("incomes")){incomeTypeItems().forEach(function(c){all.push("income:"+String(c.id));});}setFilterCats(all);setFilterCat("all");}} style={{border:"none",background:"transparent",color:confirmC,cursor:"pointer",fontSize:12,fontWeight:850}}>{L("Seleziona tutte")}</button><button onClick={function(){setFilterCats([]);setFilterCat("all");}} style={{border:"none",background:"transparent",color:subC,cursor:"pointer",fontSize:12,fontWeight:850}}>{L("Pulisci")}</button></div></div>
    {historyKindActive("expenses")&&<div style={sectionStyle()}><div style={{fontSize:16,fontWeight:950,color:textC,marginBottom:12}}>{L("Metodo di pagamento")}</div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{(methods||[]).map(function(m){var active=isMethodActive(m.id);return <button key={m.id} onClick={function(){toggleMethod(m.id);}} style={{padding:"7px 9px",borderRadius:999,border:"1px solid "+(active?(m.color||confirmC):borderC),background:active?(m.color||confirmC):"transparent",color:active?"#fff":textC,fontSize:12,fontWeight:850,cursor:"pointer"}}>{active?"✓ ":"○ "}{m.icon||"💳"} {L(m.name)}</button>;})}</div><div style={{marginTop:10}}><button onClick={function(){setFilterMethods([]);}} style={{border:"none",background:"transparent",color:subC,cursor:"pointer",fontSize:12,fontWeight:850}}>{L("Pulisci metodi")}</button></div></div>}
    <div style={sectionStyle()}><div style={{fontSize:16,fontWeight:950,color:textC,marginBottom:12}}>{L("Area")}</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}>{toggleButton("Personale",!!filterAreaPersonal,function(){if(filterAreaPersonal&&filterAreaShare){setFilterAreaPersonal(false);}else{setFilterAreaPersonal(true);}},secondaryC)}{toggleButton("Share",!!filterAreaShare,function(){if(filterAreaShare&&filterAreaPersonal){setFilterAreaShare(false);}else{setFilterAreaShare(true);}},secondaryC)}</div></div>
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,position:"sticky",bottom:0,background:dark?"#171724":"#F7F8FF",paddingTop:10}}><button onClick={function(){setShowFilterModal(false);}} style={{...primaryButton(),gridColumn:"1 / -1",padding:"16px 18px",fontSize:16,minHeight:52}}>{L("Filtra")}</button><button onClick={clearFilters} style={{...appButton(true,secondaryC),padding:"13px 16px",fontWeight:900}}>{L("Pulisci filtri")}</button><button onClick={saveHistoryFilter} style={{...appButton(true,secondaryC),padding:"13px 16px",fontWeight:900}}>{L("Salva filtro")}</button></div></div>;}
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
  var {canUsePlanFeature,consumePlanFeature,upgradeMessage,handleRewardedFeature}:any=_c;
var {normalizeEmail,loadShareCollaboration,acceptShareInvite,declineShareInvite,createShareInvite,createShareProject,updateShareProject,deleteShareProject,canAddPlanItem}:any=_c;
  var [aiExternalConsent,setAiExternalConsent]:any=useStorage(userKey("ai_external_ai_consent_v1"),{accepted:false,version:1});
  var [pendingAIConsentQuestion,setPendingAIConsentQuestion]:any=useState(null);
  // ─────────────────────────────────────────────────────────────────────────
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var aiChatSectionRef=useRef(null);
  var chatInputRef=useRef(null);
  var aiSuggestionLangRef=useRef(null);
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
  function isAIQuestionInScope(q){
    if(aiSuggestionLangRef.current)return true;
    var s=String(q||"").toLowerCase();
    if(!s.trim())return false;
    var appWords=["fainance","app","sezione","schermata","impostaz","widget","backup","import","export","csv","excel","dati","storico","statistic","budget","patrimonio","alert","notific","obiettiv","ricorrent","categoria","categorie","metodo","metodi","entrate","uscite","spese","saldo","movimenti","abbonament","bollett","utenze","risparm","risparmiare","ahorro","ahorrar","gastos","ingresos","presupuesto","dinero","soldi","finanze","finanzi","conto","conti","transaz","rateizz","mese","mensile","anno","annuale","stipend","salario","salary","payroll","sueldo","gehalt","pensja","salariu","mancante","missing","dimenticato","consiglio","consigli","analizza","analisi","tecnico","funzionamento","supporto","finanza","finance","financial","personal finance","saving","savings","expenses","expense","income","earnings","cost","costs","debt","loan","mortgage","rent","subscription","subscriptions","utilities","bill","bills","invest","investment","investments","cashflow","cash flow","ahorros","finanzas","financiero","financiera","costes","deuda","prestamo","préstamo","hipoteca","alquiler","suscripcion","suscripción","factura","facturas","finances","depenses","dépenses","revenus","epargne","épargne","argent","loyer","abonnement","abonnements","facture","factures"];
    var clearOut=["ricetta","cucina","viaggio","hotel","volo","aereo","film","serie","the mentalist","calcio","tennis","sport","storia","filosofia","ermeneutica","medicina","salute","politica","presidente","meteo","traduci","traduzione","scrivi un messaggio","whatsapp","email","codice","home assistant","workday","nomadair"];
    if(clearOut.some(function(w){return s.indexOf(w)>=0;})&&!appWords.some(function(w){return s.indexOf(w)>=0;}))return false;
    return appWords.some(function(w){return s.indexOf(w)>=0;});
  }
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
  function aiPrivacyLangCode(){return String(lang||"it").split("-")[0].toLowerCase();}
  function aiExternalDisclosureText(){
    var code=aiPrivacyLangCode();
    var dict:any={
      it:{title:"Consenso per l’uso dell’Agente AI esterno",intro:"Per generare le risposte del Consulente AI, fAInance invia alcuni dati a servizi esterni di intelligenza artificiale.",dataTitle:"Dati inviati",data:["la domanda che scrivi nella chat","la lingua selezionata","il livello di analisi scelto nelle impostazioni IA","riepiloghi finanziari, budget, categorie, ricorrenze e dati aggregati","se scegli Analisi completa, anche le transazioni essenziali: data, importo, categoria/metodo o tipo entrata e descrizione"],recipientsTitle:"Destinatari",recipients:["backend sicuro fAInance","provider AI esterno usato da fAInance: OpenAI"],excludedTitle:"Dati non inviati",excluded:"Non vengono inviati CVV, dati biometrici, password, documenti caricati, immagini, fidelity card o dati delle carte di credito.",choice:"Puoi non accettare e continuare a usare l’app senza inviare dati all’Agente AI esterno.",accept:"Accetto e continuo",decline:"Non accetto",toastDecline:"Consenso non concesso: la richiesta non è stata inviata all’Agente AI esterno."},
      en:{title:"Consent to use the external AI Advisor",intro:"To generate AI Advisor responses, fAInance sends some data to external artificial intelligence services.",dataTitle:"Data sent",data:["the question you write in the chat","the selected language","the analysis level selected in AI settings","financial summaries, budgets, categories, recurring items and aggregated data","if you choose Full analysis, also essential transactions: date, amount, category/payment method or income type and description"],recipientsTitle:"Recipients",recipients:["fAInance secure backend","external AI provider used by fAInance: OpenAI"],excludedTitle:"Data not sent",excluded:"CVV, biometric data, passwords, uploaded documents, images, loyalty cards and credit card details are not sent.",choice:"You can refuse consent and continue using the app without sending data to the external AI Advisor.",accept:"Accept and continue",decline:"Do not accept",toastDecline:"Consent not granted: the request was not sent to the external AI Advisor."},
      es:{title:"Consentimiento para usar el Asesor IA externo",intro:"Para generar las respuestas del Asesor IA, fAInance envía algunos datos a servicios externos de inteligencia artificial.",dataTitle:"Datos enviados",data:["la pregunta que escribes en el chat","el idioma seleccionado","el nivel de análisis elegido en los ajustes de IA","resúmenes financieros, presupuestos, categorías, recurrentes y datos agregados","si eliges Análisis completo, también las transacciones esenciales: fecha, importe, categoría/método o tipo de ingreso y descripción"],recipientsTitle:"Destinatarios",recipients:["backend seguro de fAInance","proveedor externo de IA usado por fAInance: OpenAI"],excludedTitle:"Datos no enviados",excluded:"No se envían CVV, datos biométricos, contraseñas, documentos cargados, imágenes, tarjetas de fidelidad ni datos de tarjetas de crédito.",choice:"Puedes no aceptar y seguir usando la app sin enviar datos al Asesor IA externo.",accept:"Aceptar y continuar",decline:"No acepto",toastDecline:"Consentimiento no concedido: la solicitud no se ha enviado al Asesor IA externo."},
      fr:{title:"Consentement à l’utilisation du Conseiller IA externe",intro:"Pour générer les réponses du Conseiller IA, fAInance envoie certaines données à des services externes d’intelligence artificielle.",dataTitle:"Données envoyées",data:["la question écrite dans le chat","la langue sélectionnée","le niveau d’analyse choisi dans les paramètres IA","résumés financiers, budgets, catégories, éléments récurrents et données agrégées","si vous choisissez Analyse complète, aussi les transactions essentielles : date, montant, catégorie/méthode ou type de revenu et description"],recipientsTitle:"Destinataires",recipients:["backend sécurisé fAInance","fournisseur IA externe utilisé par fAInance : OpenAI"],excludedTitle:"Données non envoyées",excluded:"CVV, données biométriques, mots de passe, documents chargés, images, cartes de fidélité et données de cartes de crédit ne sont pas envoyés.",choice:"Vous pouvez refuser et continuer à utiliser l’app sans envoyer de données au Conseiller IA externe.",accept:"J’accepte et continue",decline:"Je refuse",toastDecline:"Consentement non accordé : la demande n’a pas été envoyée au Conseiller IA externe."},
      de:{title:"Einwilligung zur Nutzung des externen KI-Beraters",intro:"Um Antworten des KI-Beraters zu erzeugen, sendet fAInance einige Daten an externe Dienste für künstliche Intelligenz.",dataTitle:"Gesendete Daten",data:["die Frage, die du im Chat schreibst","die ausgewählte Sprache","die in den KI-Einstellungen gewählte Analysestufe","Finanzübersichten, Budgets, Kategorien, wiederkehrende Einträge und aggregierte Daten","bei Vollständiger Analyse auch wesentliche Transaktionen: Datum, Betrag, Kategorie/Methode oder Einnahmentyp und Beschreibung"],recipientsTitle:"Empfänger",recipients:["sicheres fAInance-Backend","externer KI-Anbieter von fAInance: OpenAI"],excludedTitle:"Nicht gesendete Daten",excluded:"CVV, biometrische Daten, Passwörter, hochgeladene Dokumente, Bilder, Kundenkarten und Kreditkartendaten werden nicht gesendet.",choice:"Du kannst ablehnen und die App weiter nutzen, ohne Daten an den externen KI-Berater zu senden.",accept:"Akzeptieren und fortfahren",decline:"Nicht akzeptieren",toastDecline:"Einwilligung nicht erteilt: Die Anfrage wurde nicht an den externen KI-Berater gesendet."},
      pt:{title:"Consentimento para usar o Consultor IA externo",intro:"Para gerar as respostas do Consultor IA, a fAInance envia alguns dados a serviços externos de inteligência artificial.",dataTitle:"Dados enviados",data:["a pergunta que escreves no chat","o idioma selecionado","o nível de análise escolhido nas definições de IA","resumos financeiros, orçamentos, categorias, recorrências e dados agregados","se escolheres Análise completa, também transações essenciais: data, valor, categoria/método ou tipo de receita e descrição"],recipientsTitle:"Destinatários",recipients:["backend seguro fAInance","fornecedor externo de IA usado pela fAInance: OpenAI"],excludedTitle:"Dados não enviados",excluded:"CVV, dados biométricos, palavras-passe, documentos carregados, imagens, cartões de fidelidade e dados de cartões de crédito não são enviados.",choice:"Podes não aceitar e continuar a usar a app sem enviar dados ao Consultor IA externo.",accept:"Aceitar e continuar",decline:"Não aceito",toastDecline:"Consentimento não concedido: o pedido não foi enviado ao Consultor IA externo."},
      pl:{title:"Zgoda na użycie zewnętrznego Doradcy AI",intro:"Aby wygenerować odpowiedzi Doradcy AI, fAInance wysyła część danych do zewnętrznych usług sztucznej inteligencji.",dataTitle:"Wysyłane dane",data:["pytanie wpisane w czacie","wybrany język","poziom analizy wybrany w ustawieniach AI","podsumowania finansowe, budżety, kategorie, pozycje cykliczne i dane zagregowane","przy Pełnej analizie także podstawowe transakcje: data, kwota, kategoria/metoda lub typ przychodu i opis"],recipientsTitle:"Odbiorcy",recipients:["bezpieczny backend fAInance","zewnętrzny dostawca AI używany przez fAInance: OpenAI"],excludedTitle:"Dane niewysyłane",excluded:"CVV, dane biometryczne, hasła, przesłane dokumenty, obrazy, karty lojalnościowe i dane kart kredytowych nie są wysyłane.",choice:"Możesz odmówić i nadal korzystać z aplikacji bez wysyłania danych do zewnętrznego Doradcy AI.",accept:"Akceptuję i kontynuuję",decline:"Nie akceptuję",toastDecline:"Nie udzielono zgody: żądanie nie zostało wysłane do zewnętrznego Doradcy AI."},
      nl:{title:"Toestemming voor de externe AI-adviseur",intro:"Om antwoorden van de AI-adviseur te genereren, stuurt fAInance bepaalde gegevens naar externe kunstmatige-intelligentiediensten.",dataTitle:"Verzonden gegevens",data:["de vraag die je in de chat schrijft","de geselecteerde taal","het analyseniveau dat in de AI-instellingen is gekozen","financiële samenvattingen, budgetten, categorieën, terugkerende posten en geaggregeerde gegevens","bij Volledige analyse ook essentiële transacties: datum, bedrag, categorie/methode of inkomstentype en beschrijving"],recipientsTitle:"Ontvangers",recipients:["beveiligde fAInance-backend","externe AI-provider gebruikt door fAInance: OpenAI"],excludedTitle:"Niet verzonden gegevens",excluded:"CVV, biometrische gegevens, wachtwoorden, geüploade documenten, afbeeldingen, klantenkaarten en creditcardgegevens worden niet verzonden.",choice:"Je kunt weigeren en de app blijven gebruiken zonder gegevens naar de externe AI-adviseur te sturen.",accept:"Accepteren en doorgaan",decline:"Niet accepteren",toastDecline:"Toestemming niet gegeven: het verzoek is niet naar de externe AI-adviseur verzonden."},
      ro:{title:"Consimțământ pentru utilizarea Consilierului AI extern",intro:"Pentru a genera răspunsurile Consilierului AI, fAInance trimite unele date către servicii externe de inteligență artificială.",dataTitle:"Date trimise",data:["întrebarea scrisă în chat","limba selectată","nivelul de analiză ales în setările AI","rezumate financiare, bugete, categorii, elemente recurente și date agregate","dacă alegi Analiză completă, și tranzacțiile esențiale: dată, sumă, categorie/metodă sau tip de venit și descriere"],recipientsTitle:"Destinatari",recipients:["backend securizat fAInance","furnizor AI extern folosit de fAInance: OpenAI"],excludedTitle:"Date netrimise",excluded:"CVV, date biometrice, parole, documente încărcate, imagini, carduri de fidelitate și date ale cardurilor de credit nu sunt trimise.",choice:"Poți refuza și poți continua să folosești aplicația fără să trimiți date către Consilierul AI extern.",accept:"Accept și continui",decline:"Nu accept",toastDecline:"Consimțământ neacordat: solicitarea nu a fost trimisă către Consilierul AI extern."},
      el:{title:"Συναίνεση για χρήση εξωτερικού Συμβούλου AI",intro:"Για τη δημιουργία απαντήσεων του Συμβούλου AI, το fAInance στέλνει ορισμένα δεδομένα σε εξωτερικές υπηρεσίες τεχνητής νοημοσύνης.",dataTitle:"Δεδομένα που αποστέλλονται",data:["η ερώτηση που γράφεις στη συνομιλία","η επιλεγμένη γλώσσα","το επίπεδο ανάλυσης που έχει επιλεγεί στις ρυθμίσεις AI","οικονομικές περιλήψεις, προϋπολογισμοί, κατηγορίες, επαναλαμβανόμενα στοιχεία και συγκεντρωτικά δεδομένα","αν επιλέξεις Πλήρη ανάλυση, και βασικές συναλλαγές: ημερομηνία, ποσό, κατηγορία/μέθοδος ή τύπος εσόδου και περιγραφή"],recipientsTitle:"Παραλήπτες",recipients:["ασφαλές backend fAInance","εξωτερικός πάροχος AI που χρησιμοποιεί το fAInance: OpenAI"],excludedTitle:"Δεδομένα που δεν αποστέλλονται",excluded:"CVV, βιομετρικά δεδομένα, κωδικοί πρόσβασης, ανεβασμένα έγγραφα, εικόνες, κάρτες πελάτη και στοιχεία πιστωτικών καρτών δεν αποστέλλονται.",choice:"Μπορείς να μην αποδεχτείς και να συνεχίσεις να χρησιμοποιείς την εφαρμογή χωρίς αποστολή δεδομένων στον εξωτερικό Σύμβουλο AI.",accept:"Αποδοχή και συνέχεια",decline:"Δεν αποδέχομαι",toastDecline:"Δεν δόθηκε συναίνεση: το αίτημα δεν στάλθηκε στον εξωτερικό Σύμβουλο AI."}
    };
    return dict[code]||dict.en;
  }
  function aiExternalConsentAccepted(){return !!(aiExternalConsent&&aiExternalConsent.accepted===true&&Number(aiExternalConsent.version||0)>=1);}
  function acceptAIExternalConsent(){
    var q=String(pendingAIConsentQuestion||"");
    setAiExternalConsent({accepted:true,version:1,acceptedAt:new Date().toISOString(),backend:"fAInance secure backend",provider:"OpenAI"});
    setPendingAIConsentQuestion(null);
    setTimeout(function(){try{if(chatInputRef.current)chatInputRef.current.value=q;sendChat();}catch(e){}},30);
  }
  function declineAIExternalConsent(){
    var txt=aiExternalDisclosureText();
    setAiExternalConsent({accepted:false,version:1,declinedAt:new Date().toISOString(),backend:"fAInance secure backend",provider:"OpenAI"});
    setPendingAIConsentQuestion(null);
    setToast&&setToast({text:txt.toastDecline,type:"warning",color:"#EF9F27",icon:"⚠️"});
  }
  function ExternalAIConsentModal(){
    var txt=aiExternalDisclosureText();
    return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.58)",zIndex:950,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{width:"100%",maxWidth:560,maxHeight:"88vh",overflowY:"auto",background:cardBg2,borderRadius:22,border:"1px solid "+borderC2,boxShadow:"0 18px 70px rgba(0,0,0,.34)",padding:20}}>
        <div style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}><AIGrilloIcon size={46}/><div><div style={{fontSize:18,fontWeight:950,color:textC2,lineHeight:1.2}}>{txt.title}</div><div style={{fontSize:13,color:subC2,lineHeight:1.45,marginTop:6}}>{txt.intro}</div></div></div>
        <div style={{background:dark?"#1e1e30":"#F8FAFF",border:"1px solid "+borderC2,borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:12}}>
          <div><div style={{fontSize:13,fontWeight:900,color:textC2,marginBottom:6}}>📤 {txt.dataTitle}</div><ul style={{margin:"0 0 0 18px",padding:0,fontSize:12.5,color:subC2,lineHeight:1.45}}>{txt.data.map(function(x,i){return <li key={i}>{x}</li>;})}</ul></div>
          <div><div style={{fontSize:13,fontWeight:900,color:textC2,marginBottom:6}}>🏢 {txt.recipientsTitle}</div><ul style={{margin:"0 0 0 18px",padding:0,fontSize:12.5,color:subC2,lineHeight:1.45}}>{txt.recipients.map(function(x,i){return <li key={i}>{x}</li>;})}</ul></div>
          <div><div style={{fontSize:13,fontWeight:900,color:textC2,marginBottom:6}}>🔒 {txt.excludedTitle}</div><div style={{fontSize:12.5,color:subC2,lineHeight:1.45}}>{txt.excluded}</div></div>
        </div>
        <div style={{fontSize:12.5,color:subC2,lineHeight:1.45,marginTop:12,marginBottom:14}}>{txt.choice}</div>
        <button onClick={acceptAIExternalConsent} style={{width:"100%",background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"13px 16px",fontSize:15,fontWeight:950,cursor:"pointer",boxShadow:"0 8px 22px rgba(127,119,221,.28)",marginBottom:9}}>{txt.accept}</button>
        <button onClick={declineAIExternalConsent} style={{width:"100%",background:dark?"#252535":"#fff",color:subC2,border:"1px solid "+borderC2,borderRadius:btnRadius,padding:"12px 16px",fontSize:14,fontWeight:900,cursor:"pointer"}}>{txt.decline}</button>
      </div>
    </div>;
  }
  function buildAIRequest(q){
    var forced=aiSuggestionLangRef.current;
    var qLang=forced||detectTextLanguage(q);
    aiSuggestionLangRef.current=null;
    var lname=languageName(qLang);
    return {question:"[LANGUAGE_LOCK="+qLang+" / "+lname+". Reply ONLY in "+lname+". Output must be entirely in "+lname+". Do not use Greek unless LANGUAGE_LOCK is el.] "+q,language:qLang,context:buildAIContext(),instruction:AI_AGENT_SCOPE_INSTRUCTION+" LANGUAGE_LOCK: rispondi esclusivamente in "+lname+" (codice "+qLang+"). Se il messaggio nasce da un suggerimento dell’app, usa la lingua predefinita dell’app. Per i messaggi digitati dall’utente, mantieni la lingua dell’ultimo messaggio dell’utente. Non rispondere mai in greco se il codice lingua non è el. Rispetta dataAccessLevel: summary=usa solo riepiloghi, areas=usa anche aggregati per area, full=puoi usare anche le transazioni inviate. Usa trend, budgetRisks, dataQuality e activeAdvice per dare 2-4 azioni concrete. Usa importi stimati solo quando derivano dai dati. Non inventare dati personali mancanti. Presenta scenari, rischi e ipotesi: niente certezze assolute."};
  }
  function detectAnswerLanguage(ans){var raw=String(ans||"");if(/[Ͱ-Ͽ]/.test(raw))return "el";return detectTextLanguage(raw);}
  function answerNeedsTranslation(ans,target){var detected=detectAnswerLanguage(ans);if(target==="el")return detected!=="el";if(detected==="el")return true;if(target==="it")return false;return detected!==target&&looksItalianAnswer(ans);}
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
    if(!aiExternalConsentAccepted()){setPendingAIConsentQuestion(q);return;}
    async function runAllowed(){
      var userMsg={id:Date.now(),role:"user",text:q};
      setAiChat(function(p){return [...p,userMsg].slice(-50);});
      if(chatInputRef.current)chatInputRef.current.value="";
      if(consumePlanFeature)consumePlanFeature("aiReply",1);
      if(!isAIQuestionInScope(q)){
        setAiChat(function(p){return [...p,{id:Date.now()+1,role:"assistant",text:localizedOutOfScope(detectTextLanguage(q))}].slice(-50);});
        return;
      }
      setAiLoading(true);
      try{
        var ans=await callFinanceAgent(q);
        setAiChat(function(p){return [...p,{id:Date.now()+1,role:"assistant",text:ans}].slice(-50);});
      }catch(err){
        var rawErr=(err&&err.message?err.message:"errore sconosciuto");
        var local=botAnswer(q);
        var errMsg=(rawErr.indexOf("429")>=0?"Il motore AI remoto non ha quota disponibile.":"Il motore AI remoto non e disponibile ora.")+" Intanto posso darti una lettura locale dei dati:\n"+local;
        setAiChat(function(p){return [...p,{id:Date.now()+2,role:"assistant",text:errMsg}].slice(-50);});
      }finally{
        setAiLoading(false);
      }
    }
    if(handleRewardedFeature){handleRewardedFeature("aiReply",1,function(){runAllowed();});return;}
    if(canUsePlanFeature&&!canUsePlanFeature("aiReply",1)){setToast({text:upgradeMessage?upgradeMessage("aiReply"):L("Hai raggiunto il limite giornaliero di risposte AI."),type:"warning",color:"#EF9F27",icon:"⚠️"});return;}
    runAllowed();
  }
  var sinp={width:"100%",borderRadius:8,border:"1px solid "+borderC2,padding:"9px 11px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:textC2,boxSizing:"border-box"};
  var aiAccessLabel=aiDataAccess==="full"?L("analisi completa: tutte le transazioni essenziali"):aiDataAccess==="areas"?L("analisi media: riepilogo + spese per area"):L("analisi limitata: solo riepilogo aggregato");
  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    {pendingAIConsentQuestion!==null&&<ExternalAIConsentModal/>}
    <div style={{position:"relative",overflow:"hidden",background:dark?"#252535":"linear-gradient(135deg,#ffffff,#f4f1ff)",border:"1px solid "+borderC2,borderRadius:18,padding:isMobile?18:22,minHeight:isMobile?132:150,boxShadow:dark?"none":"0 8px 28px rgba(127,119,221,0.12)"}}>
      <div style={{position:"relative",zIndex:2,maxWidth:620}}>
        <div style={{fontSize:22,fontWeight:900,color:textC2,marginBottom:6}}>{L("Consulente AI")}</div>
        <div style={{fontSize:12,color:subC2,lineHeight:1.5,marginBottom:14}}>{L("Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app.")}</div>
        <button onClick={function(){openAIChat("");}} style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 14px",fontSize:13,fontWeight:700,cursor:"pointer",display:"inline-flex",alignItems:"center",gap:8,boxShadow:"0 4px 14px rgba(127,119,221,0.22)"}}>💬 {L("Inizia conversazione")}</button>
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
    {aiTab==="chat"&&<div ref={aiChatSectionRef} style={{background:cardBg2,borderRadius:14,border:"1px solid "+borderC2,padding:12,display:"flex",flexDirection:"column",minHeight:520}}><div style={{height:420,overflowY:"auto",display:"flex",flexDirection:"column",gap:10,marginBottom:12,paddingRight:2}}>{aiChat.length===0&&<><div style={{fontSize:12,color:subC2,background:dark?"#1e1e30":"#f4f1ff",border:"1px solid "+(dark?"#3a3a5a":"#d8d1ff"),borderRadius:12,padding:"9px 11px"}}>{expenses.length+incomes.length===0?L("Per darti consigli davvero utili, ho bisogno di qualche movimento registrato. Puoi comunque farmi domande generali sulla gestione delle tue finanze e sulle funzioni dell’app."):L("Puoi chiedere analisi, consigli e chiarimenti solo su fAInance e sui dati gestiti nell’app.")} {L("Livello dati attivo")}: {aiAccessLabel}.</div><div style={{fontSize:13,color:subC2,textAlign:"center",padding:"34px 0"}}>{L("Esempi: “Come posso risparmiare questo mese?”, “Quali categorie pesano di più?”, “Analizza i miei abbonamenti”, “Perché non vedo gli alert?”")}</div></>}{aiChat.map(function(m){var mine=m.role==="user";return <div key={m.id} style={{alignSelf:mine?"flex-end":"flex-start",maxWidth:"84%",background:mine?"#7F77DD":(dark?"#252535":"#f5f5f5"),color:mine?"#fff":textC2,borderRadius:14,padding:"10px 12px",fontSize:13,whiteSpace:"pre-line",lineHeight:1.45}}>{m.text}</div>;})}{aiLoading&&<div style={{alignSelf:"flex-start",background:dark?"#252535":"#f5f5f5",color:subC2,borderRadius:14,padding:"10px 12px",fontSize:13}}>{L("Sto analizzando...")}</div>}</div><div style={{display:"flex",gap:8}}><input ref={chatInputRef} disabled={aiLoading} onKeyDown={function(e){if(e.key==="Enter"){e.preventDefault();sendChat();}}} placeholder={L("Scrivi una domanda su fAInance...")} style={{...sinp,flex:1,opacity:aiLoading?0.7:1}}/><Btn onClick={sendChat} disabled={aiLoading} bg="#7F77DD">{aiLoading?"...":L("Invia")}</Btn></div></div>}

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
  function title(v){return String(v||"").trim().replace(/\s+/g," ").replace(/^./,function(ch){return ch.toUpperCase();});}
  var n=normalizeVoiceText(txt);
  // 1) IMPORTO: "X euro e Y centesimi", numeri, valuta
  n=n.replace(/\b\d{1,6}\s*(euro|eur)?\s*(e|ed|con|virgola)\s*\d{1,2}\s*(centesimi|centesimo|cent|cents)?\b/ig," ");
  n=n.replace(/\d+(?:[.,]\d+)?/g," ");
  n=n.replace(/\b(euro|eur|euros|cent|cents|centesimi|centesimo|centavo)\b/ig," ");
  // 2) METODO: nome scelto + parole-metodo generiche (10 lingue)
  if(method&&method.name)n=n.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(method.name))+"\\b","ig")," ");
  ["carta","carte","credito","debito","contanti","cash","bancomat","paypal","satispay","bonifico","assegno","pagamento","metodo","card","debit","credit","transfer","wire","tarjeta","efectivo","virement","especes","ueberweisung","gotowka","przelew","contant","numerar"].forEach(function(w){n=n.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(w))+"\\b","ig")," ");});
  // 3) CATEGORIA: nome scelto (per le entrate anche il tipo entrata)
  if(cat&&cat.name)n=n.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(cat.name))+"\\b","ig")," ");
  if(kind==="income"&&incomeType&&incomeType.name)n=n.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(incomeType.name))+"\\b","ig")," ");
  // 4) TIPO/AZIONE + ARTICOLI/PREPOSIZIONI + DATA + RICORRENZA
  ["aggiungi","aggiungere","anadir","add","ajouter","hinzufugen","adicionar","dodaj","voeg","adauga","uscita","uscite","spesa","spese","speso","spesi","expense","expenses","gasto","gastos","depense","despesa","ausgabe","wydatek","uitgave","cheltuiala","entrata","entrate","income","ingreso","ingresos","revenu","recette","receita","einnahme","przychod","inkomst","venit","ho","hai","abbiamo","avete","hanno","pagato","pagata","pagati","pagate","paid","paye","bezahlt","ricevuto","ricevuta","ricevuti","ricevute","received","di","da","per","con","in","il","la","lo","le","gli","al","allo","alla","alle","ai","del","della","delle","dei","un","una","uno","e","ed","and","oggi","hoy","today","aujourd","hui","heute","hoje","dzis","vandaag","azi","ieri","ayer","yesterday","hier","gestern","ontem","wczoraj","gisteren","fa","hace","ago","vor","dias","dia","giorni","giorno","days","day","tage","rateizza","rateizzata","split","dividi","ricorrente","mensile","annuale","mese","mesi","months","meses"].forEach(function(w){n=n.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(w))+"\\b","ig")," ");});
  n=n.replace(/\s+/g," ").trim();
  // 5) Ciò che resta è la descrizione reale (più specifica di categoria/metodo)
  if(n)return title(n);
  // 6) Fallback semantico multilingua
  var full=normalizeVoiceText(txt);
  var semantic=[["Supermercato",["supermercato","supermarket","supermercado","alimentari","groceries","compra","compras","zakupy","boodschappen"]],["Pizza",["pizza","pizzeria"]],["Ristorante",["ristorante","restaurant","restaurante","cena","pranzo","dinner","lunch","sushi","kebab"]],["Bar",["bar","caffe","cafe","coffee","cappuccino"]],["Carburante",["benzina","diesel","gasolio","carburante","fuel","gasolina","paliwo"]],["Farmacia",["farmacia","pharmacy","pharmacie","apotheke","apteka"]],["Stipendio",["stipendio","salario","salary","payroll","sueldo"]],["Bolletta",["bolletta","bollette","utenza","luce","gas","acqua","internet"]],["Affitto",["affitto","rent","loyer","miete"]],["Taxi",["taxi","uber","cab"]]];
  for(var si=0;si<semantic.length;si++){for(var sj=0;sj<semantic[si][1].length;sj++){if(new RegExp("\\b"+escapeVoiceRegex(semantic[si][1][sj])+"\\b").test(full))return semantic[si][0];}}
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
  if(type==="income"){var it=findByVoiceName(incomeTypes,n)||incomeTypes[0];if(/\b(stipendio|salario|salary|payroll|sueldo|gehalt|pensja|salariu|\u03bc\u03b9\u03c3\u03b8\u03bf\u03c2|\u03bc\u03b9\u03c3\u03b8\u03cc\u03c2)\b/.test(n))it=incomeTypes.find(function(x){return x.id==="salario";})||it;if(/\b(bonus|premio|tredicesima|quattordicesima)\b/.test(n))it=incomeTypes.find(function(x){return x.id==="bonus";})||it;return{type:"income",amount:amount,date:date,desc:cleanVoiceDescription(raw,"income",null,null,it)||common.description,incomeType:it?it.id:"salario",incomeTypeName:it?it.name:"Entrata",rateizzato:rateizzato,rate:rate};}
  var c=categoryBySemanticVoice(n);var activeMethods=methods.filter(function(x){return !x.archived;});var mentionedMethod=findByVoiceName(activeMethods,n);var m=mentionedMethod||getDefaultVoiceExpenseMethod();return{type:"expense",amount:amount,date:date,desc:cleanVoiceDescription(raw,"expense",c,m,null)||common.description,catId:c?c.id:1,catName:c?c.name:"Categoria",methodId:m?m.id:1,methodName:m?m.name:"Metodo",rateizzato:rateizzato,rate:rate};
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
  var nativeSpeech=cap&&cap.Plugins&&cap.Plugins.SpeechRecognition;
  var platform=(cap&&cap.getPlatform)?cap.getPlatform():"";
  if(isNative){
    if(!nativeSpeech){setVoiceError(platform==="ios"?"Riconoscimento vocale iOS non disponibile in questa build. Scrivi il comando nel campo testo e premi Analizza.":"Riconoscimento vocale nativo non disponibile in questa build. Scrivi il comando nel campo testo e premi Analizza.");return;}
    setVoiceListening(true);
    function normalizePermState(res){
      var v=res&&(res.speechRecognition||res.microphone||res.permission||res.state||res.status);
      return String(v||"").toLowerCase();
    }
    function ensureNativeSpeechPermission(){
      var checked=Promise.resolve(nativeSpeech.checkPermissions?nativeSpeech.checkPermissions():{});
      return checked.then(function(res){
        var state=normalizePermState(res);
        if(state==="granted"||state==="authorized")return res;
        if(nativeSpeech.requestPermissions)return nativeSpeech.requestPermissions();
        if(nativeSpeech.requestPermission)return nativeSpeech.requestPermission();
        return res;
      }).then(function(res2){
        var state2=normalizePermState(res2);
        if(state2&&state2!=="granted"&&state2!=="authorized"&&state2!=="prompt"&&state2!=="undefined"){
          throw new Error(platform==="ios"?"Permesso microfono o riconoscimento vocale non concesso. Apri Impostazioni iPhone > fAInance > Microfono e Riconoscimento vocale, poi consenti l'accesso.":"Permesso microfono non concesso. Apri Impostazioni Android > App > fAInance Test > Autorizzazioni > Microfono > Consenti.");
        }
        return res2;
      });
    }
    var runNative=function(retry){return ensureNativeSpeechPermission()
      .then(function(){return nativeSpeech.available?nativeSpeech.available():{available:true};})
      .then(function(av){if(av&&av.available===false)throw new Error("Riconoscimento vocale non disponibile sul dispositivo.");return nativeSpeech.start({language:language,maxResults:3,prompt:"Parla ora",partialResults:false,popup:false});})
      .then(function(res){var matches=res&&res.matches?res.matches:[];var txt2=matches&&matches[0]?matches[0]:"";if(!txt2)throw new Error("Nessun testo riconosciuto");setVoiceText(txt2);setVoiceParsed(parseVoiceCommand(txt2));})
      .catch(function(err){var msg=err&&err.message?err.message:String(err||"");var low=msg.toLowerCase();if(retry&&(low.indexOf("didn't understand")>=0||low.indexOf("didnt understand")>=0||low.indexOf("nessun")>=0)){return new Promise(function(resolve){setTimeout(resolve,450);}).then(function(){return runNative(false);});}if(low.indexOf("missing permission")>=0||low.indexOf("permission")>=0){setVoiceError(platform==="ios"?"Permesso microfono o riconoscimento vocale mancante. Controlla le autorizzazioni iOS dell'app, poi chiudi e riapri fAInance.":"Permesso microfono mancante o non letto correttamente. Controlla che il microfono sia consentito nelle impostazioni Android dell'app, poi chiudi e riapri fAInance Test.");return;}setVoiceError((low.indexOf("didn't understand")>=0||low.indexOf("didnt understand")>=0||low.indexOf("no match")>=0||low.indexOf("nessun")>=0)?"Nessun testo riconosciuto. Riprova e parla dopo il segnale, oppure scrivi il comando nel campo testo.":"Errore riconoscimento vocale nativo: "+msg);})
      .finally(function(){setVoiceListening(false);});};
    runNative(true);
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
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:520,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={function(e){if(e.target===e.currentTarget)closeVoiceModal();}}>
    <div style={{background:cardBg,borderRadius:20,border:"1px solid "+borderC,width:"100%",maxWidth:430,maxHeight:"92vh",boxShadow:"0 10px 40px rgba(0,0,0,0.28)",overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <div style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",padding:"18px 20px",display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:30}}>🎙️</div><div style={{flex:1}}><div style={{fontSize:17,fontWeight:900}}>{V.title}</div><div style={{fontSize:12,opacity:0.85}}>{V.sub}</div></div><button onClick={closeVoiceModal} aria-label={V.cancel} style={{width:42,height:42,borderRadius:14,border:"1px solid #FCA5A5",background:dark?"#3A2228":"#FFF5F5",color:"#F87171",fontSize:22,fontWeight:950,lineHeight:1,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 14px #F8717133"}}>×</button></div>
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
    <button onPointerDown={startDrag} onPointerMove={applyDrag} onPointerUp={endDrag} onPointerCancel={endDrag} onTouchStart={startDrag} onTouchMove={applyDrag} onTouchEnd={endDrag} title="Grillo parlante AI" style={{width:buttonWidth,height:buttonHeight,borderRadius:0,border:"none",background:"transparent",padding:0,color:"#fff",boxShadow:"none",fontSize:desktop?27:25,cursor:dragState?"grabbing":"grab",display:"flex",alignItems:"center",justifyContent:"center",touchAction:"none",userSelect:"none",overflow:"visible"}}><img src={aiGrilloMascot} alt="Consulente AI" draggable={false} style={{width:"100%",height:"100%",display:"block",objectFit:"contain",pointerEvents:"none",background:"transparent",transform:"none"}}/></button>
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
      return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={function(e){if(e.target===e.currentTarget){saveNote();}}}>
        <div style={{background:dark?"#1e1e30":"#fff",borderRadius:16,padding:20,width:"100%",maxWidth:440,boxShadow:"0 8px 40px rgba(0,0,0,0.2)"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:600,color:textC}}>{entry?entry.icon+" "+entry.name:"Nota"}</div>
            <button onClick={function(){saveNote();}} style={{background:"none",border:"none",fontSize:20,cursor:"pointer",color:"#aaa"}}>×</button>
          </div>
          <textarea value={noteDraft} onChange={function(e){setNoteDraft(e.target.value);}} placeholder="Inserisci una nota per questa voce... (es. dettagli conto, scadenze, obiettivi)" style={{...sinp,height:120,resize:"vertical",lineHeight:1.5}} autoFocus/>
          <div style={{display:"flex",gap:8,marginTop:12}}>
            <Btn onClick={saveNote} bg="#7F77DD" style={{flex:1,padding:"10px",fontWeight:600}}>💾 Salva nota</Btn>
            <Btn onClick={function(){setNoteEntryId(null);}} bg={dark?"#333":"#f0f0f0"} color={dark?"#eee":"#666"} style={{padding:"10px 14px"}}>{V.cancel}</Btn>
          </div>
          {pNotes[noteEntryId]&&<button onClick={function(){setPatrimonioNotes(function(n){var q={...n};delete q[noteEntryId];return q;});setNoteEntryId(null);}} style={{marginTop:8,background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:12,width:"100%"}}>🗑 Elimina nota</button>}
        </div>
      </div>;
    })()}

    {/* ── Header totale ── */}
    <div style={{background:"linear-gradient(135deg,#378ADD22,#9F77DD22)",borderRadius:14,border:"1px solid "+(dark?"#444":"#ddd"),padding:20,textAlign:"center"}}>
      <div style={{fontSize:11,color:subC,marginBottom:2}}>Patrimonio — {monthFullName?monthFullName(now.getMonth()):MONTHS_FULL[now.getMonth()]} {curYear}</div>
      <div style={{fontSize:32,fontWeight:700,color:liveTotal>=0?"#1D9E75":"#E24B4A"}}>{fmt(liveTotal)}</div>
      {secRate&&showSecInPatrimonio&&fmtSec(liveTotal)&&<div style={{fontSize:14,color:subC,marginTop:2}}>{fmtSec(liveTotal)}</div>}
      {livePrevTotal!==null&&<div style={{fontSize:13,fontWeight:500,color:(liveTotal-livePrevTotal)>=0?"#1D9E75":"#E24B4A",marginTop:4}}>
        {(liveTotal-livePrevTotal)>=0?"▲":"▼"} {fmt(Math.abs(liveTotal-livePrevTotal))} vs mese scorso
      </div>}
      <div style={{fontSize:11,color:subC,marginTop:6}}>Modalità: {patrimonioMode==="manuale"?"Manuale":"Semi-automatica ⚠️"}</div>
    </div>

    {/* ── Tab ── */}
    <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}>
      <button onClick={function(){setPatTab("inserimento");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:patTab==="inserimento"?(dark?"#444":"#fff"):"transparent",color:patTab==="inserimento"?textC:subC,fontSize:14,cursor:"pointer",fontWeight:patTab==="inserimento"?500:400}}>✏️ Inserimento</button>
      <button onClick={function(){setPatTab("storico");}} style={{flex:1,padding:"9px",border:"none",borderRadius:10,background:patTab==="storico"?(dark?"#444":"#fff"):"transparent",color:patTab==="storico"?textC:subC,fontSize:14,cursor:"pointer",fontWeight:patTab==="storico"?500:400}}>
        📅 Storico {histMonths.length>0&&<span style={{fontSize:11,background:"#7F77DD",color:"#fff",borderRadius:10,padding:"1px 6px",marginLeft:4}}>{histMonths.length}</span>}
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
            {existingSnap?"✅ Dati già salvati":(isCurrentMonth?"Mese corrente — non ancora salvato":"⚠️ Nessun dato per questo mese")}
          </div>
        </div>
        <button onClick={function(){goMonth(1);}} disabled={selMonthKey>=curMonthKey} style={{background:"none",border:"none",cursor:selMonthKey>=curMonthKey?"not-allowed":"pointer",fontSize:20,color:selMonthKey>=curMonthKey?"#ccc":subC,padding:"4px 8px",borderRadius:8}}>›</button>
      </div>

      {/* Totale mese selezionato + delta */}
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 16px",background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC}}>
        <div>
          <div style={{fontSize:11,color:subC}}>Totale {monthShortName?monthShortName(selMonth-1):MONTHS_SHORT[selMonth-1]} {selYear}</div>
          <div style={{fontSize:22,fontWeight:700,color:draftTotal>=0?"#1D9E75":"#E24B4A"}}>{fmt(draftTotal)}{secRate&&showSecInPatrimonio&&fmtSec(draftTotal)&&<div style={{fontSize:12,color:subC,fontWeight:400,marginTop:2}}>{fmtSec(draftTotal)}</div>}</div>
        </div>
        {totalDelta!==null&&<div style={{textAlign:"right"}}>
          <div style={{fontSize:11,color:subC}}>vs {MONTHS_SHORT[parseInt(prevKey.split("-")[1])-1]}</div>
          <div style={{fontSize:16,fontWeight:600,color:totalDelta>=0?"#1D9E75":"#E24B4A"}}>{totalDelta>=0?"+":""}{fmt(totalDelta)}</div>
        </div>}
        <button onClick={saveMonthSnap} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"10px 18px",fontSize:14,cursor:"pointer",fontWeight:600}}>
          {existingSnap?"🔄 Aggiorna":"💾 Salva"}
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
          setToast(L("Valori copiati da")+" "+MONTHS_SHORT[parseInt(prevMk.split("-")[1])-1]+" "+prevMk.slice(0,4));
        }} style={{background:"none",border:"1px solid #7F77DD",cursor:"pointer",color:"#7F77DD",fontSize:13,fontWeight:500,padding:"7px 14px",borderRadius:8}}>
          ⬅️ Copia dal mese precedente
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
                    <button onClick={function(){openNote(entry.id);}} title="Nota" style={{background:pNotes[entry.id]?"#EEEDFE":"none",border:pNotes[entry.id]?"1px solid #AFA9EC":"none",borderRadius:6,cursor:"pointer",color:pNotes[entry.id]?"#534AB7":"#ccc",fontSize:13,padding:"1px 5px"}}>📝</button>
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
              <input type="text" placeholder="Nome voce" value={newEntryName} onChange={function(e){setNewEntryName(e.target.value);}} onKeyDown={function(e){if(e.key==="Enter")addEntry(area.id);}} style={{...sinp,flex:1,minWidth:120}}/>
              <button onClick={function(){addEntry(area.id);}} style={{background:"#1D9E75",color:"#fff",border:"none",borderRadius:8,padding:"7px 14px",cursor:"pointer",fontSize:13,fontWeight:500}}>{L("Aggiungi")}</button>
              <button onClick={function(){setAddingEntry(null);setNewEntryName("");}} style={{background:"#f0f0f0",color:"#666",border:"none",borderRadius:8,padding:"7px 10px",cursor:"pointer",fontSize:13}}>{L("Annulla")}</button>
            </div>
            :<button onClick={function(){setAddingEntry(area.id);}} style={{marginTop:10,background:"none",border:"1px dashed "+(dark?"#444":"#ddd"),borderRadius:8,padding:"7px 14px",cursor:"pointer",color:subC,fontSize:13,width:"100%"}}>+ Aggiungi voce</button>
          }
        </div>;
      })}
      {patrimonioMode==="semi"&&<div style={{background:"#FFF8E1",border:"1px solid #FFD54F",borderRadius:12,padding:"12px 16px"}}><span style={{fontSize:13,color:"#856404"}}>⚠️ Modalità semi-automatica in beta.</span></div>}
    </>}

    {/* ══════════════════════ TAB STORICO ══════════════════════ */}
    {patTab==="storico"&&<>
      {histMonths.length===0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:40,textAlign:"center",color:subC,fontSize:14}}>
        Nessuno storico disponibile. Nella scheda Inserimento seleziona un mese, inserisci i valori e clicca "💾 Salva".
      </div>}

      {histMonths.length>0&&<>
        {histYears.length>1&&<div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {histYears.map(function(y){return <button key={y} onClick={function(){setHistViewYear(y);}} style={{padding:"6px 14px",borderRadius:8,border:"1px solid "+(histViewYear===y?"#7F77DD":borderC),background:histViewYear===y?"#EEEDFE":(dark?"#252535":"#f5f5f5"),color:histViewYear===y?"#534AB7":textC,fontSize:13,cursor:"pointer",fontWeight:histViewYear===y?600:400}}>{y}</button>;})}
        </div>}

        {filteredHist.length>1&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:10}}>Andamento patrimonio — {histViewYear}</div>
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
              {coords.map(function(p,i){return <g key={i}><circle cx={p.x} cy={p.y} r={3} fill="#7F77DD"/><text x={p.x} y={h-5} textAnchor="middle" fontSize={8} fill={tc2}>{MONTHS_SHORT[parseInt(p.mk.split("-")[1])-1]}</text></g>;})}
            </svg>;
          })()}
        </div>}

        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>Dettaglio mensile</div>
          <div style={{overflowX:"auto"}}>
            <table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}>
              <thead><tr style={{background:dark?"#252535":"#f5f5f5"}}>
                <th style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:subC}}>Mese</th>
                <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>Totale</th>
                <th style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>Δ</th>
                {pAreas.slice(0,isMobile?2:4).map(function(a){return <th key={a.id} style={{padding:"7px 10px",textAlign:"right",fontWeight:600,color:subC}}>{a.icon}</th>;})}
                <th style={{padding:"7px 10px",textAlign:"center",fontWeight:600,color:subC}}></th>
              </tr></thead>
              <tbody>
                {filteredHist.map(function(m){
                  var lbl=MONTHS_SHORT[parseInt(m.mk.split("-")[1])-1]+" "+m.mk.slice(0,4);
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
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>Variazioni per voce — {MONTHS_SHORT[parseInt(filteredHist[0].mk.split("-")[1])-1]} vs mese precedente</div>
          {filteredHist[0].delta===null?<div style={{fontSize:12,color:subC}}>{L("Nessun mese precedente nel registro.")}</div>:
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {pEntries.map(function(entry){
              var cur=parseFloat(filteredHist[0].snap[entry.id])||0;
              var prev2=filteredHist.length>1?(parseFloat(filteredHist[1].snap[entry.id])||0):null;
              var d2=prev2!==null?cur-prev2:null;
              if(cur===0&&(d2===null||d2===0))return null;
              return <div key={entry.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:dark?"#252535":"#f9f9f9",borderRadius:8}}>
                <span style={{fontSize:14,flexShrink:0}}>{entry.icon}</span>
                <span style={{flex:1,fontSize:12,color:textC}}>{entry.name}</span>
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
    {(shareReceivedInvites||[]).length>0&&<div style={{background:confirmButtonColor+"18",border:"1px solid "+confirmButtonColor+"55",borderRadius:16,padding:14,display:"flex",flexDirection:"column",gap:10}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div><div style={{fontSize:14,fontWeight:900,color:textC}}>{L("Inviti ricevuti")}</div><div style={{fontSize:12,color:subC}}>{L("Accetta o rifiuta gli inviti ai progetti Share.")}</div></div><button onClick={loadShareCollaboration} style={{background:"transparent",border:"1px solid "+borderC,borderRadius:10,padding:"6px 9px",color:subC,cursor:"pointer"}}>{shareInviteLoading?"...":"↻"}</button></div>{shareReceivedInvites.map(function(inv){return <div key={inv.id} style={{background:cardBg,border:"1px solid "+borderC,borderRadius:12,padding:10,display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}><div style={{flex:1,minWidth:160}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{inv.projectName||"Progetto Share"}</div><div style={{fontSize:11,color:subC}}>Invito da {inv.invitedByName||"utente fAInance"}</div></div><Btn onClick={function(){acceptShareInvite(inv);}} bg={confirmButtonColor} style={{padding:"7px 10px",fontSize:12}}>{L("Accetta")}</Btn><Btn onClick={function(){declineShareInvite(inv);}} bg={dark?"#333":"#f0f0f0"} color={textC} style={{padding:"7px 10px",fontSize:12}}>{L("Rifiuta")}</Btn></div>;})}</div>}
    {projects.length===0&&<div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:22,textAlign:"center",color:subC}}><div style={{fontSize:34,marginBottom:8}}>🤝</div><div style={{fontSize:14,fontWeight:700,color:textC,marginBottom:5}}>{L("Nessun progetto Share")}</div><div style={{fontSize:12}}>{L("Crea un progetto per inserire partecipanti, movimenti e saldi.")}</div></div>}
    {projects.length>0&&<div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:2}}>{projects.map(function(p){var active=selected&&selected.id===p.id;return <button key={p.id} onClick={function(){setShareSelectedProjectId(p.id);setShareProjectTab("attivita");}} style={{flex:"0 0 auto",border:"1px solid "+(active?confirmButtonColor:borderC),background:active?confirmButtonColor:"transparent",color:active?"#fff":textC,borderRadius:14,padding:"9px 12px",cursor:"pointer",fontSize:13,fontWeight:800}}>{p.name||"Progetto"}</button>;})}</div>}
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
      {shareProjectTab==="saldi"&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Chi deve soldi a chi")}</div>{debts.length===0&&<div style={{fontSize:13,color:subC,textAlign:"center",padding:"16px 0"}}>{L("Nessun saldo aperto")}</div>}{debts.map(function(d,i){var from=participants.find(function(p){return p.id===d.from;});var to=participants.find(function(p){return p.id===d.to;});return <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:13,color:textC,flex:1}}>{from?personLabel(from):d.from} {L("deve pagare")} {to?personLabel(to):d.to}</span><span style={{fontSize:14,fontWeight:900,color:confirmButtonColor}}>{fmt(d.amount)}</span></div>;})}</div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Registra saldo/rimborso")}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"1fr 1fr 1fr 1fr auto",gap:8}}><select value={settlementFrom} onChange={function(e){setSettlementFrom(e.target.value);}} style={sinp}>{participants.map(function(p){return <option key={p.id} value={p.id}>{personLabel(p)}</option>;})}</select><select value={settlementTo} onChange={function(e){setSettlementTo(e.target.value);}} style={sinp}>{participants.map(function(p){return <option key={p.id} value={p.id}>{L("a")} {personLabel(p)}</option>;})}</select><input type="number" placeholder={L("Importo")} value={settlementAmount} onChange={function(e){setSettlementAmount(e.target.value);}} style={sinp}/><input type="date" value={settlementDate} onChange={function(e){setSettlementDate(e.target.value);}} style={sinp}/><Btn onClick={addSettlement} bg={confirmButtonColor}>{L("Registra")}</Btn></div></div></div>}
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
  return <div style={{position:"fixed",inset:0,zIndex:9999,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.45)"}} onClick={function(e){if(e.target===e.currentTarget)setConfirmState(null);}}>
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
  function deleteCard(id){if(!window.confirm(L("Eliminare questa carta?")))return;setShoppingCards(function(list){return (list||[]).filter(function(c){return String(c.id)!==String(id);});});if(String(editingCardId)===String(id)){setEditingCardId("");setCardName("");setCardCode("");setShowCardManualForm(false);setShowCardCreateChoice(false);}setToast({text:L("Carta eliminata"),type:"success",icon:"🗑️"});}
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
  </div>;
}

