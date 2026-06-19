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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
  var grps=expenseGroups||DEFAULT_EXPENSE_GROUPS;
  var donutData=useMemo(function(){return grps.map(function(g){var gc=cats.filter(function(c){return c.group===g.id;});var total=expenses.filter(function(e){return e.date.startsWith(curMonthKey)&&gc.some(function(c){return c.id===e.catId;});}).reduce(function(a,e){return a+e.amount;},0);return{value:total,color:g.color,label:g.name};}).filter(function(d){return d.value>0;});},[grps]);
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
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:12,color:subC,marginBottom:10}}>{L("Distribuzione uscite")} — {monthFullName?monthFullName(now.getMonth()):MONTHS_FULL[now.getMonth()]}</div>{donutData.length===0?<div style={{fontSize:13,color:"#ccc",textAlign:"center",padding:"20px 0"}}>{L("Nessuna spesa")}</div>:<div style={{display:"flex",gap:14,alignItems:"center"}}><DonutChart data={donutData} size={100}/><div style={{flex:1}}>{donutData.map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/><span style={{fontSize:11,flex:1,color:subC}}>{d.label}</span><span style={{fontSize:11,fontWeight:500,color:textC}}>{fmt(d.value)}</span></div>;})}</div></div>}</div>
      <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:12,color:subC,marginBottom:6}}>{L("Entrate vs Uscite")} {curYear}</div><BarChart data={monthlyTotals} width={260} height={120}/></div>
    </div>
    <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:12,color:subC,marginBottom:6}}>{L("Saldo mensile")} {curYear}</div><LineChart data={monthlyTotals} width={isMobile?300:560} height={100} color={BALANCE_COLOR}/></div>
    <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>{[{title:L("Ultime uscite"),items:expenses.slice(0,5),isExp:true},{title:L("Ultime entrate"),items:incomes.slice(0,5),isExp:false}].map(function(pair){return <div key={pair.title} style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:12,color:subC,marginBottom:10}}>{pair.title}</div>{pair.items.length===0&&<div style={{fontSize:13,color:"#ccc",textAlign:"center",padding:"16px 0"}}>{pair.isExp?L("Nessuna spesa"):L("Nessuna entrata")}</div>}{pair.items.map(function(e){var c=pair.isExp?getCat(e.catId):null;var it=!pair.isExp?getIT(e.type):null;return <div key={e.id} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 0",borderBottom:"1px solid "+borderC}}><span style={{fontSize:16,flexShrink:0}}>{pair.isExp?(c?c.icon:"📦"):(it?it.icon:"💰")}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:13,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:textC}}>{e.desc||(c?c.name:it?it.name:"")||"-"}</div><div style={{fontSize:11,color:subC}}>{fmtDate(e.date,dateFmt)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:13,fontWeight:500,color:pair.isExp?expenseColor:incomeColor}}>{fmt(e.amount)}</div>{secRate&&<div style={{fontSize:10,color:subC}}>{fmtSec(e.amount)}</div>}</div></div>;})}</div>;})}</div>
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
  function segBtnStyle(active,color,opts){opts=opts||{};var c=color||confirmC;return {flex:1,padding:isMobile?"7px 6px":"8px 9px",border:"none",borderRadius:Math.max(9,Math.min(btnRadius||10,11)),background:active?("linear-gradient(135deg,"+c+", "+c+"dd)"):(dark?"rgba(255,255,255,0.06)":"linear-gradient(180deg,#ffffff 0%,#f7f7f7 100%)"),color:active?"#fff":subC,fontSize:opts.fontSize||(isMobile?12:13),cursor:"pointer",fontWeight:active?850:700,boxShadow:active?("0 5px 13px "+c+"28"):(dark?"none":"0 2px 8px rgba(0,0,0,0.045)"),position:opts.position||"relative",transition:"all .18s ease",minHeight:isMobile?36:40,display:"flex",alignItems:"center",justifyContent:"center",gap:4,lineHeight:1.08};}
  return <div><div style={{display:"flex",gap:6,marginBottom:14,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:4}}><button onClick={function(){setSpeseSubTab("add");}} style={segBtnStyle(speseSubTab==="add",confirmC)}>{L("Semplice")}</button><button onClick={function(){setSpeseSubTab("recurring");}} style={segBtnStyle(speseSubTab==="recurring",confirmC,{position:"relative"})}>{L("Ricorrenti")}{pendingCount>0&&<span style={{position:"absolute",top:4,right:10,background:expenseColor,color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"inline-flex",alignItems:"center",justifyContent:"center"}}>{pendingCount}</span>}</button></div>{speseSubTab==="add"&&<div><div style={{display:"flex",gap:6,marginBottom:14,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:4}}><button onClick={function(){handleAddType("expense");}} style={segBtnStyle(addType==="expense",expenseColor)}>💸 {L(t.expenses)}</button><button onClick={function(){handleAddType("income");}} style={segBtnStyle(addType==="income",incomeColor)}>💰 {L(t.incomes)}</button></div><div style={{display:"flex",gap:5,marginBottom:10,background:dark?"#252535":"#f5f5f5",borderRadius:10,padding:4}}><button onClick={function(){setAddSubTab("single");}} style={segBtnStyle(addSubTab==="single",confirmC,{fontSize:12})}>⚡ {L(t.single)}</button><button onClick={function(){setAddSubTab("bulk");}} style={segBtnStyle(addSubTab==="bulk",confirmC,{fontSize:12})}>📋 {L(t.multiple)}</button>{addType==="expense"&&<button onClick={function(){if(_c.canUsePlanFeature&&!_c.canUsePlanFeature("receiptScan",1)){setToast&&setToast(_c.upgradeMessage?_c.upgradeMessage("receiptScan"):"Limite scontrini raggiunto");return;}setAddSubTab("receipt");}} style={segBtnStyle(addSubTab==="receipt",confirmC,{fontSize:12})}>📷 {L("Scontrino")}</button>}</div><div style={{background:dark?"#1e1e30":"linear-gradient(180deg,#ffffff 0%,#f7f6ff 100%)",borderRadius:16,border:"1px solid "+borderC,padding:isMobile?12:16,boxShadow:dark?"none":"0 4px 18px rgba(83,74,183,0.08)"}}>{addSubTab==="single"&&<ExpenseForm type={addType} onSave={function(item){if(addType==="expense"){addExpenses([item],"manual");}else{addIncomes([item],"manual");}}}/>} {addSubTab==="bulk"&&<BulkEntry type={addType} maxRows={_c.bulkMovementRowLimit?_c.bulkMovementRowLimit(_c.currentPlan):undefined} limitMessage={_c.bulkMovementRowLimit&&_c.bulkMovementRowLimit(_c.currentPlan)!==Infinity?(L("Il limite delle righe multiple, con il piano attuale, è di ")+_c.bulkMovementRowLimit(_c.currentPlan)):""} onSave={function(items){if(addType==="expense"){addExpenses(items,"bulk");}else{addIncomes(items,"bulk");}}}/>} {addSubTab==="receipt"&&addType==="expense"&&<ReceiptScanPanel onSave={function(item){addExpenses([item],"receipt");}}/>}</div></div>}{speseSubTab==="recurring"&&<RecurringManager/>}</div>;
}

export function HistoryPanel(){
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
  var V=t;
  var now=new Date();
  var sinp:any={width:"100%",borderRadius:8,border:"1px solid "+(dark?"#444":"#ddd"),padding:"8px 10px",fontSize:14,background:dark?"#2a2a3e":"#fff",color:dark?"#eee":"#333",boxSizing:"border-box"};
  var availableYears=useMemo(function(){var yrs=new Set([...expenses,...incomes].map(function(e){return e.date?e.date.slice(0,4):null;}).filter(Boolean));return ["all",...Array.from(yrs).sort(function(a,b){return b-a;})];});
  var grps=expenseGroups||DEFAULT_EXPENSE_GROUPS;
  var [historyVisibleCount,setHistoryVisibleCount]=useState(80);
  useEffect(function(){setHistoryVisibleCount(80);},[historyTab,filterYear,filterMonth,filterMonths,searchQuery,filterCat,filterCats,filterCatExclude,filterGroup,filterDateFrom,filterDateTo,filterAmtMin,filterAmtMax]);
  var visibleExpenses=filteredExpenses.slice(0,historyVisibleCount);
  var visibleIncomes=filteredIncomes.slice(0,historyVisibleCount);
  return <div><div style={{display:"flex",gap:0,marginBottom:12,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3,boxShadow:dark?"none":"inset 0 0 0 1px #eee"}}><button onClick={function(){setHistoryTab("expenses");}} style={{flex:1,padding:"10px",border:"none",borderRadius:10,background:historyTab==="expenses"?expenseColor:"transparent",color:historyTab==="expenses"?"#fff":subC,fontSize:13,cursor:"pointer",fontWeight:historyTab==="expenses"?700:500,boxShadow:historyTab==="expenses"?"0 4px 12px rgba(226,75,74,0.22)":"none"}}>💸 {t.expenses}</button><button onClick={function(){setHistoryTab("incomes");}} style={{flex:1,padding:"10px",border:"none",borderRadius:10,background:historyTab==="incomes"?incomeColor:"transparent",color:historyTab==="incomes"?"#fff":subC,fontSize:13,cursor:"pointer",fontWeight:historyTab==="incomes"?700:500,boxShadow:historyTab==="incomes"?"0 4px 12px rgba(29,158,117,0.22)":"none"}}>💰 {t.incomes}</button></div><div style={{position:"relative",marginBottom:10}}><span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",fontSize:14,color:"#aaa"}}>🔍</span><input type="text" placeholder={t.search} defaultValue={searchQuery} onChange={function(e){_c.historySearchDraftRef.current=e.target.value;}} onKeyDown={function(e){if(e.key==="Enter")setSearchQuery(_c.historySearchDraftRef.current||"");}} onBlur={function(){setSearchQuery(_c.historySearchDraftRef.current||"");}} style={{...inp,width:"100%",paddingLeft:34,paddingRight:searchQuery?34:10,boxSizing:"border-box"}}/>{searchQuery&&<button onClick={function(){_c.historySearchDraftRef.current="";setSearchQuery("");}} style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",color:"#aaa",fontSize:16}}>x</button>}</div><div style={{display:"flex",gap:8,marginBottom:10,flexWrap:"wrap",alignItems:"center"}}><select value={filterYear} onChange={function(e){setFilterYear(e.target.value);setFilterMonth("");}} style={{...inp,flex:"0 0 auto"}}>{availableYears.map(function(y){return <option key={y} value={y}>{y==="all"?L("Tutti gli anni"):y}</option>;})}</select><select value={filterMonth} onChange={function(e){setFilterMonth(e.target.value);setFilterMonths([]);}} style={{...inp,flex:"0 0 auto"}}><option value="">{L("Tutti i mesi")}</option>{Array.from({length:12},function(_,i){var m=String(i+1).padStart(2,"0");var key=(filterYear&&filterYear!=="all"?filterYear:String(curYear))+"-"+m;return <option key={m} value={key}>{monthFullName?monthFullName(i):MONTHS_FULL[i]}</option>;})}</select><button onClick={function(){setFilterDateFrom("");setFilterDateTo("");setFilterMonth(curMonthKey);setFilterMonths([]);}} style={{background:dark?"#252535":"#EEF4FF",color:"#378ADD",border:"1px solid #BFD7FF",borderRadius:btnRadius,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{L("Mese corrente")}</button><button onClick={function(){setFilterMonth("");setFilterMonths([]);setFilterDateFrom(dateOffset(30));setFilterDateTo(todayStr());}} style={{background:dark?"#252535":"#EEF4FF",color:"#378ADD",border:"1px solid #BFD7FF",borderRadius:btnRadius,padding:"8px 12px",fontSize:12,fontWeight:700,cursor:"pointer"}}>{L("Ultimi 30 giorni")}</button><button onClick={function(){setShowFilters(!showFilters);}} style={{background:showFilters?"linear-gradient(135deg,#7F77DD,#378ADD)":(dark?"#252535":"#EEF4FF"),color:showFilters?"#fff":"#378ADD",border:"1px solid "+(showFilters?"#7F77DD":"#BFD7FF"),borderRadius:btnRadius,padding:"8px 14px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:showFilters?"0 4px 12px rgba(55,138,221,0.22)":"none"}}>🔎 {L("Filtri")}</button>{(searchQuery||filterCat!=="all"||(filterCats&&filterCats.length)||filterCatExclude||(filterMonths&&filterMonths.length)||filterGroup!=="all"||filterDateFrom||filterDateTo||filterAmtMin||filterAmtMax||filterMonth)&&<Btn onClick={function(){setSearchQuery("");setFilterCat("all");setFilterCats([]);setFilterCatExclude(false);setFilterGroup("all");setFilterDateFrom("");setFilterDateTo("");setFilterAmtMin("");setFilterAmtMax("");setFilterMonth("");setFilterMonths([]);}} bg="#f0f0f0" color="#666" style={{padding:"6px 12px",fontSize:12}}>{t.clearFilters}</Btn>}</div>{showFilters&&<div style={{background:dark?"#252535":"#f9f9f9",borderRadius:12,border:"1px solid "+borderC,padding:14,marginBottom:12}}><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>{historyTab==="expenses"&&<><div style={{gridColumn:"1/-1"}}><div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}><label style={{fontSize:11,color:subC}}>{L("Categorie")}</label><div style={{display:"flex",gap:6}}><button onClick={function(){var all=cats.map(function(c){return String(c.id);});if(showShareInHistory)all.push("share");setFilterCats(all);setFilterCat("all");}} style={{border:"none",background:"transparent",color:confirmButtonColor,cursor:"pointer",fontSize:11}}>{L("Seleziona tutte")}</button><button onClick={function(){setFilterCatExclude(!filterCatExclude);}} style={{border:"1px solid "+(filterCatExclude?expenseColor:borderC),borderRadius:8,background:filterCatExclude?expenseColor+"22":"transparent",color:filterCatExclude?expenseColor:subC,cursor:"pointer",fontSize:11,padding:"2px 6px"}}>{L("Escludi")}</button></div></div><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{cats.concat(showShareInHistory?[{id:"share",icon:"🤝",name:"Share",color:confirmButtonColor}]:[]).map(function(c){var cid=String(c.id);var active=filterCats.includes(cid);return <button key={cid} onClick={function(){setFilterCats(function(list){setFilterCat("all");return list.includes(cid)?list.filter(function(x){return x!==cid;}):list.concat([cid]);});}} style={{padding:"5px 9px",borderRadius:20,border:"1px solid "+(active?c.color:borderC),background:active?c.color+"22":"transparent",color:active?c.color:textC,fontSize:12,cursor:"pointer"}}>{c.icon} {c.name}</button>;})}</div>{showShareInHistory&&<div style={{fontSize:11,color:subC,marginTop:6}}>{L("Share appare perché è attiva la visualizzazione delle spese Share nello storico.")}</div>}</div><div style={{gridColumn:"1/-1"}}><label style={{fontSize:11,color:subC,display:"block",marginBottom:5}}>{L("Mesi multipli")}</label><div style={{display:"flex",gap:6,flexWrap:"wrap"}}>{Array.from({length:12},function(_,i){var mk=(filterYear&&filterYear!=="all"?filterYear:String(curYear))+"-"+String(i+1).padStart(2,"0");var active=filterMonths.includes(mk);return <button key={mk} onClick={function(){setFilterMonth("");setFilterMonths(function(list){return list.includes(mk)?list.filter(function(x){return x!==mk;}):list.concat([mk]);});}} style={{padding:"5px 8px",borderRadius:18,border:"1px solid "+(active?confirmButtonColor:borderC),background:active?confirmButtonColor+"22":"transparent",color:active?confirmButtonColor:textC,fontSize:11,cursor:"pointer"}}>{monthShortName?monthShortName(i):MONTHS_SHORT[i]}</button>;})}</div></div><div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Area")}</label><select value={filterGroup} onChange={function(e){setFilterGroup(e.target.value);}} style={{...inp,width:"100%"}}><option value="all">{L("Tutte")}</option>{grps.map(function(g){return <option key={g.id} value={g.id}>{g.name}</option>;})}<option value="share">Share</option></select></div></>}<div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Data da")}</label><input type="date" value={filterDateFrom} onChange={function(e){setFilterDateFrom(e.target.value);}} style={{...inp,width:"100%"}}/></div><div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Data a")}</label><input type="date" value={filterDateTo} onChange={function(e){setFilterDateTo(e.target.value);}} style={{...inp,width:"100%"}}/></div><div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Importo min")}</label><input type="number" value={filterAmtMin} onChange={function(e){setFilterAmtMin(e.target.value);}} style={{...inp,width:"100%"}}/></div><div><label style={{fontSize:11,color:subC,display:"block",marginBottom:3}}>{L("Importo max")}</label><input type="number" value={filterAmtMax} onChange={function(e){setFilterAmtMax(e.target.value);}} style={{...inp,width:"100%"}}/></div></div></div>}{historyTab==="expenses"&&<><div style={{fontSize:12,color:subC,marginBottom:8}}>{filteredExpenses.length} {L("voci")} — {fmt(filteredExpenses.reduce(function(a,e){return a+e.amount;},0))}</div>{filteredExpenses.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:"32px 0"}}>{t.noExpenses}</div>}{visibleExpenses.map(function(e){var c=e._share?{icon:"🤝",name:"Share",color:confirmButtonColor}:getCat(e.catId);var m=e._share?null:getMethod(e.methodId);var eid=e.id;var ecopy={id:e.id,amount:e.amount,catId:e.catId,methodId:e.methodId,desc:e.desc,date:e.date,rateizzato:e.rateizzato,rate:e.rate};return <div key={eid} style={{background:cardBg,borderRadius:10,border:"1px solid "+borderC,padding:"10px 14px",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18,flexShrink:0}}>{c?c.icon:"📦"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:textC}}>{e.desc||"-"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:3}}>{c&&<Badge color={c.color} name={c.name} small/>}{m&&<Badge color={m.color} name={m.name+(m.archived?" [A]":"")} small/>}{e.rateizzato&&<Badge color="#7F77DD" name={"÷"+e.rate+"m"} small/>}<span style={{fontSize:11,color:subC}}>{fmtDate(e.date,dateFmt)}</span></div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><div style={{fontSize:15,fontWeight:500,color:expenseColor}}>{fmt(e.amount)}{secRate&&showSecInHistory&&fmtSec(e.amount)&&<div style={{fontSize:10,color:subC,fontWeight:400}}>{fmtSec(e.amount)}</div>}</div>{!e._share&&<div style={{display:"flex",gap:6}}><button title={L("Modifica")} onClick={function(){setEditingItem({item:ecopy,isExp:true});}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>✏️</button><button title={L("Elimina")} onClick={function(){setDeleteConfirmId(eid);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",cursor:"pointer",color:expenseColor,fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>🗑️</button></div>}</div></div>{deleteConfirmId===eid&&!e._share&&<div style={{marginTop:10,background:"#fff0f0",borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><span style={{fontSize:13,color:expenseColor}}>{L("Eliminare?")}</span><div style={{display:"flex",gap:8}}><Btn onClick={function(){setExpenses(function(prev){return prev.filter(function(x){return x.id!==eid;});});setDeleteConfirmId(null);setToast&&setToast({text:"Uscita eliminata",type:"success"});}} bg={expenseColor} style={{padding:"5px 12px",fontSize:13,fontWeight:500}}>{L("Elimina")}</Btn><Btn onClick={function(){setDeleteConfirmId(null);}} bg="#f0f0f0" color="#555" style={{padding:"5px 12px",fontSize:13}}>{V.cancel}</Btn></div></div>}</div>;})}{filteredExpenses.length>visibleExpenses.length&&<Btn onClick={function(){setHistoryVisibleCount(historyVisibleCount+80);}} bg={dark?"#333":"#f0f0f0"} color={textC} style={{width:"100%",padding:"10px 12px",fontSize:13,marginBottom:8}}>{L("Mostra altri")} ({visibleExpenses.length}/{filteredExpenses.length})</Btn>} </>}{historyTab==="incomes"&&<><div style={{fontSize:12,color:subC,marginBottom:8}}>{filteredIncomes.length} {L("voci")} — {fmt(filteredIncomes.reduce(function(a,i){return a+i.amount;},0))}</div>{filteredIncomes.length===0&&<div style={{textAlign:"center",color:"#ccc",padding:"32px 0"}}>{t.noIncomes}</div>}{visibleIncomes.map(function(inc){var it=getIT(inc.type);var iid=inc.id;var icopy={id:inc.id,amount:inc.amount,type:inc.type,desc:inc.desc,date:inc.date,rateizzato:inc.rateizzato,rate:inc.rate};return <div key={iid} style={{background:cardBg,borderRadius:10,border:"1px solid "+borderC,padding:"10px 14px",marginBottom:8}}><div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18,flexShrink:0}}>{it?it.icon:"💰"}</span><div style={{flex:1,minWidth:0}}><div style={{fontSize:14,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",color:textC}}>{inc.desc||"-"}</div><div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:3}}>{it&&<Badge color={it.color} name={it.name} small/>}{inc.rateizzato&&<Badge color="#7F77DD" name={"÷"+inc.rate+"m"} small/>}<span style={{fontSize:11,color:subC}}>{fmtDate(inc.date,dateFmt)}</span></div></div><div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:4}}><div style={{fontSize:15,fontWeight:500,color:incomeColor}}>+{fmt(inc.amount)}{secRate&&showSecInHistory&&fmtSec(inc.amount)&&<div style={{fontSize:10,color:subC,fontWeight:400}}>{fmtSec(inc.amount)}</div>}</div><div style={{display:"flex",gap:6}}><button title={L("Modifica")} onClick={function(){setEditingItem({item:icopy,isExp:false});}} style={{background:"#EEF4FF",border:"1px solid #BFD7FF",cursor:"pointer",color:"#378ADD",fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>✏️</button><button title={L("Elimina")} onClick={function(){setDeleteConfirmId(iid);}} style={{background:"#FFF0F0",border:"1px solid #FFD0D0",cursor:"pointer",color:expenseColor,fontSize:14,padding:"5px 8px",borderRadius:8,fontWeight:700}}>🗑️</button></div></div></div>{deleteConfirmId===iid&&<div style={{marginTop:10,background:"#fff0f0",borderRadius:8,padding:"10px 12px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><span style={{fontSize:13,color:expenseColor}}>{L("Eliminare?")}</span><div style={{display:"flex",gap:8}}><Btn onClick={function(){setIncomes(function(prev){return prev.filter(function(x){return x.id!==iid;});});setDeleteConfirmId(null);setToast&&setToast({text:"Entrata eliminata",type:"success"});}} bg={expenseColor} style={{padding:"5px 12px",fontSize:13,fontWeight:500}}>{L("Elimina")}</Btn><Btn onClick={function(){setDeleteConfirmId(null);}} bg="#f0f0f0" color="#555" style={{padding:"5px 12px",fontSize:13}}>{V.cancel}</Btn></div></div>}</div>;})}{filteredIncomes.length>visibleIncomes.length&&<Btn onClick={function(){setHistoryVisibleCount(historyVisibleCount+80);}} bg={dark?"#333":"#f0f0f0"} color={textC} style={{width:"100%",padding:"10px 12px",fontSize:13,marginBottom:8}}>{L("Mostra altri")} ({visibleIncomes.length}/{filteredIncomes.length})</Btn>} </>}</div>;
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
    var req=buildAIRequest(q);var token="";try{if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();}catch(e){}var aiHeaders:any={"Content-Type":"application/json"};if(token)aiHeaders.Authorization="Bearer "+token;var res=await fetch(AI_AGENT_ENDPOINT,{method:"POST",headers:aiHeaders,body:JSON.stringify(req)});var data=null;try{data=await res.json();}catch(e){}if(!res.ok){throw new Error((data&&data.error)||("Errore agente AI: "+res.status));}
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
  var raw=String(txt||""), n=normalizeVoiceText(raw);function title(v){return String(v||"").trim().replace(/\s+/g," ").replace(/^./,function(ch){return ch.toUpperCase();});}
  var semantic=[{desc:"Supermercato",words:["supermercato","supermarket","supermercado","supermarche","supermarkt","sklep","alimentari","groceries","compra","compras","zakupy","boodschappen"]},{desc:"Pizze",words:["pizze","pizzas"]},{desc:"Pizza",words:["pizza","pizzeria"]},{desc:"Ristorante",words:["ristorante","restaurant","restaurante","restauracja","cena","pranzo","dinner","lunch","sushi","kebab","hamburger"]},{desc:"Bar",words:["bar","caffe","cafe","coffee","cappuccino"]},{desc:"Caramelle",words:["caramella","caramelle","candy","candies"]},{desc:"Carburante",words:["benzina","diesel","gasolio","carburante","fuel","gasolina","paliwo"]},{desc:"Farmacia",words:["farmacia","pharmacy","pharmacie","apotheke","apteka"]},{desc:"Stipendio",words:["stipendio","salario","salary","payroll","sueldo"]},{desc:"Latte",words:["latte","milk","lait","milch","mleko","melk","lapte"]},{desc:"Pane",words:["pane","bread","pain","brot","chleb","brood"]},{desc:"Caffè",words:["caffe","espresso","cappuccino","macchiato"]},{desc:"Abbonamento",words:["abbonamento","subscription","abonnement","abonnement","abonnierung"]},{desc:"Affitto",words:["affitto","rent","loyer","miete","czynsz","huur"]},{desc:"Mutuo",words:["mutuo","mortgage","hypotheque","hypothek","hipoteka"]},{desc:"Assicurazione",words:["assicurazione","insurance","assurance","versicherung","ubezpieczenie"]},{desc:"Bolletta",words:["bolletta","bollette","utenza","luce","gas","acqua","electricity","internet"]},{desc:"Taxi",words:["taxi","uber","cab","cabify"]},{desc:"Palestra",words:["palestra","gym","fitness","salle"]},{desc:"Cinema",words:["cinema","film","movie","teatro","theatre"]},{desc:"Aereo",words:["aereo","volo","flight","avion","flug"]},{desc:"Hotel",words:["hotel","albergo","ostello","motel","hostel"]},{desc:"Treno",words:["treno","train","zug","pociag"]},{desc:"Medicine",words:["medicina","medicine","farmaco","pillola","compressa","aspirina","antibiotico"]}];
  // Find ALL semantic matches in order of appearance in the string
  var firstSemanticIdx=9999, firstSemanticDesc=null;
  for(var i=0;i<semantic.length;i++){for(var j=0;j<semantic[i].words.length;j++){var ww=semantic[i].words[j];var wm=n.search(new RegExp("\\b"+escapeVoiceRegex(ww)+"\\b"));if(wm>=0&&wm<firstSemanticIdx){firstSemanticIdx=wm;firstSemanticDesc=semantic[i].desc;}}}
  // Strip noise words to find the "real" description
  var s=n;
  ["aggiungi","aggiungere","anadir","add","ajouter","hinzufugen","adicionar","dodaj","voeg","adauga","una","un","uscita","uscite","spesa","spese","expense","expenses","gasto","gastos","depense","despesa","ausgabe","wydatek","uitgave","cheltuiala","entrata","entrate","income","ingreso","ingresos","revenu","receita","einnahme","przychod","inkomst","venit","ho","hai","pagato","pagata","paid","paye","bezahlt","speso","ricevuto","ricevuta","received","di","da","per","con","in","il","la","lo","le","gli","al","allo","alla","alle","ai","del","della","delle","dei","euro","eur","euros","oggi","hoy","today","aujourd","hui","heute","hoje","dzis","vandaag","azi","ieri","ayer","yesterday","hier","gestern","ontem","wczoraj","gisteren","fa","hace","ago","vor","dias","dia","giorni","giorno","days","day","tage","mois","mesi","months","meses","rateizza","rateizzata","split","dividi","ricorrente","mensile","mese","tre","due","uno","uno","una","quattro","cinque","sei","sette","otto","nove","dieci","venti","trenta","forty","fifty","three","two","four","five","six","seven","eight","nine","ten"].forEach(function(w){s=s.replace(new RegExp("\\b"+escapeVoiceRegex(normalizeVoiceText(w))+"\\b","ig")," ");});
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
  var raw=String(txt||"").trim();var n=normalizeVoiceText(raw);if(!n)return null;var amount=parseVoiceAmount(n);if(!amount||amount<=0){setVoiceError(voiceUiText(lang).invalid);return null;}
  var isIncome=/\b(entrata|entrate|incasso|incassato|ricevuto|ricevuta|stipendio|salario|salary|payroll|income|revenue|ingreso|ingresos|sueldo|revenu|recette|receita|einnahme|gehalt|przychod|pensja|inkomst|venit|salariu|\u03ad\u03c3\u03bf\u03b4\u03bf|\u03b5\u03c3\u03bf\u03b4\u03bf|\u03bc\u03b9\u03c3\u03b8\u03bf\u03c2|\u03bc\u03b9\u03c3\u03b8\u03cc\u03c2)\b/.test(n);
  var isExpense=/\b(uscita|uscite|spesa|spese|speso|pagato|pagata|expense|expenses|paid|gasto|gastos|depense|d\u00e9pense|despesa|ausgabe|bezahlt|wydatek|uitgave|cheltuiala|cheltuial\u0103|\u03ad\u03be\u03bf\u03b4\u03bf|\u03b5\u03be\u03bf\u03b4\u03bf)\b/.test(n);
  var type=isIncome&&!isExpense?"income":"expense";var date=parseVoiceDate(n);var rateInfo=parseVoiceRate(n);var rate=rateInfo.rate,rateizzato=rateInfo.rateizzato;
  if(type==="income"){var it=findByVoiceName(incomeTypes,n)||incomeTypes[0];if(/\b(stipendio|salario|salary|payroll|sueldo|gehalt|pensja|salariu|\u03bc\u03b9\u03c3\u03b8\u03bf\u03c2|\u03bc\u03b9\u03c3\u03b8\u03cc\u03c2)\b/.test(n))it=incomeTypes.find(function(x){return x.id==="salario";})||it;if(/\b(bonus|premio|tredicesima|quattordicesima)\b/.test(n))it=incomeTypes.find(function(x){return x.id==="bonus";})||it;return{type:"income",amount:amount,date:date,desc:cleanVoiceDescription(raw,"income",null,null,it),incomeType:it?it.id:"salario",incomeTypeName:it?it.name:"Entrata",rateizzato:rateizzato,rate:rate};}
  var c=categoryBySemanticVoice(n);var activeMethods=methods.filter(function(x){return !x.archived;});var mentionedMethod=findByVoiceName(activeMethods,n);var m=mentionedMethod||getDefaultVoiceExpenseMethod();return{type:"expense",amount:amount,date:date,desc:cleanVoiceDescription(raw,"expense",c,m,null),catId:c?c.id:1,catName:c?c.name:"Categoria",methodId:m?m.id:1,methodName:m?m.name:"Metodo",rateizzato:rateizzato,rate:rate};
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
  if(isNative){
    if(!nativeSpeech){setVoiceError("Su Android la WebView non gestisce il riconoscimento vocale in modo affidabile. Serve il plugin nativo SpeechRecognition. Installa @capacitor-community/speech-recognition e poi esegui npx cap sync android.");return;}
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
          throw new Error("Permesso microfono non concesso. Apri Impostazioni Android > App > fAInance Test > Autorizzazioni > Microfono > Consenti.");
        }
        return res2;
      });
    }
    var runNative=function(retry){return ensureNativeSpeechPermission()
      .then(function(){return nativeSpeech.available?nativeSpeech.available():{available:true};})
      .then(function(av){if(av&&av.available===false)throw new Error("Riconoscimento vocale non disponibile sul dispositivo.");return nativeSpeech.start({language:language,maxResults:3,prompt:"Parla ora",partialResults:false,popup:false});})
      .then(function(res){var matches=res&&res.matches?res.matches:[];var txt2=matches&&matches[0]?matches[0]:"";if(!txt2)throw new Error("Nessun testo riconosciuto");setVoiceText(txt2);setVoiceParsed(parseVoiceCommand(txt2));})
      .catch(function(err){var msg=err&&err.message?err.message:String(err||"");var low=msg.toLowerCase();if(retry&&(low.indexOf("didn't understand")>=0||low.indexOf("didnt understand")>=0||low.indexOf("nessun")>=0)){return new Promise(function(resolve){setTimeout(resolve,450);}).then(function(){return runNative(false);});}if(low.indexOf("missing permission")>=0||low.indexOf("permission")>=0){setVoiceError("Permesso microfono mancante o non letto correttamente. Controlla che il microfono sia consentito nelle impostazioni Android dell'app, poi chiudi e riapri fAInance Test.");return;}setVoiceError((low.indexOf("didn't understand")>=0||low.indexOf("didnt understand")>=0||low.indexOf("no match")>=0||low.indexOf("nessun")>=0)?"Nessun testo riconosciuto. Riprova e parla dopo il segnale, oppure scrivi il comando nel campo testo.":"Errore riconoscimento vocale nativo: "+msg);})
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
    if(addExpenses([{id:Date.now(),amount:Number(voiceParsed.amount)||0,catId:Number(voiceParsed.catId),methodId:Number(voiceParsed.methodId),desc:voiceParsed.desc,date:voiceParsed.date,rateizzato:!!voiceParsed.rateizzato,rate:Number(voiceParsed.rate)||1}],"voice")){closeVoiceModal();}
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
      <div style={{background:"linear-gradient(135deg,#7F77DD,#378ADD)",color:"#fff",padding:"18px 20px",display:"flex",alignItems:"center",gap:12}}><div style={{fontSize:30}}>🎙️</div><div style={{flex:1}}><div style={{fontSize:17,fontWeight:900}}>{V.title}</div><div style={{fontSize:12,opacity:0.85}}>{V.sub}</div></div><button onClick={closeVoiceModal} style={{background:"rgba(255,255,255,0.18)",border:"none",borderRadius:9,color:"#fff",fontSize:18,cursor:"pointer",padding:"4px 10px"}}>×</button></div>
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
      var foundUser=null;
      var userSnap=await getDocs(query(collection(fbDb,"users"),where("email","==",email),limit(1))).catch(function(){return null;});
      if(userSnap&&userSnap.docs&&userSnap.docs.length){var d=userSnap.docs[0];foundUser={uid:d.id,...d.data()};}
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
      {shareProjectTab==="partecipanti"&&<div style={{display:"flex",flexDirection:"column",gap:12}}><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Partecipanti")}</div>{participants.map(function(p){return <div key={p.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1px solid "+borderC,opacity:p.status==="archived"?0.55:1}}><div style={{width:34,height:34,borderRadius:"50%",background:confirmButtonColor+"22",display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:confirmButtonColor}}>{personLabel(p).slice(0,1).toUpperCase()}</div><div style={{flex:1}}><div style={{fontSize:13,fontWeight:900,color:textC}}>{personLabel(p)}</div><div style={{fontSize:11,color:subC}}>{L(p.kind==="fake"?"Persona esterna":p.kind==="registered"?"Utente fAInance":"Invito in attesa")}{p.email?" · "+p.email:""}{p.status==="pending"?" · "+L("pendente"):""}{p.status==="archived"?" · "+L("archiviato"):""}</div></div>{p.id!=="me"&&<div style={{display:"flex",gap:5}}>{p.status==="archived"?<button onClick={function(){restoreParticipant(p.id);}} style={{background:"#eef8f4",border:"1px solid #bdebdc",borderRadius:8,color:incomeColor,padding:"5px 7px"}}>{L("Ripristina")}</button>:<button onClick={function(){archiveParticipant(p.id);}} style={{background:"#fff8e1",border:"1px solid #ffe29a",borderRadius:8,color:"#9a6a00",padding:"5px 7px"}}>{L("Archivia")}</button>}<button onClick={function(){removeParticipant(p.id);}} style={{background:"#fff0f0",border:"1px solid #ffd0d0",borderRadius:8,color:expenseColor,padding:"5px 7px"}}>{L("Elimina")}</button></div>}</div>;})}</div><div style={{background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:14}}><div style={{fontSize:14,fontWeight:900,color:textC,marginBottom:10}}>{L("Aggiungi partecipante")}</div><div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:10,padding:3,marginBottom:10}}>{[{id:"user",label:L("Utente")},{id:"fake",label:L("Persona esterna")}].map(function(m){return <button key={m.id} onClick={function(){setPersonMode(m.id);}} style={{flex:1,border:"none",borderRadius:8,padding:"7px",background:personMode===m.id?confirmButtonColor:"transparent",color:personMode===m.id?"#fff":subC,fontSize:12,fontWeight:800}}>{m.label}</button>;})}</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr auto",gap:8}}>{personMode==="fake"?<input placeholder={L("Nome persona esterna")} value={newPersonName} onChange={function(e){setNewPersonName(e.target.value);}} style={sinp}/>:<input placeholder={L("Email utente")} value={newPersonEmail} onChange={function(e){setNewPersonEmail(e.target.value);}} style={sinp}/>}<Btn onClick={addParticipant} bg={confirmButtonColor} disabled={participantBusy}>{participantBusy?"...":L("Aggiungi")}</Btn></div><div style={{fontSize:11,color:subC,marginTop:8}}>{L("Utente richiede solo l'email: quando l'account viene collegato, verrà mostrato il nome reale. Persona esterna usa solo il nome e non riceve inviti.")}</div></div></div>}
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
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_c;
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
  return <div style={{display:"flex",flexDirection:"column",gap:14}}><div style={{fontSize:20,fontWeight:900,color:textC}}>Altro</div><div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:12}}>{items.map(function(item){return <button key={item.id} onClick={function(){setTab(item.id);setSettingsPage(null);setMobileMenu(false);}} style={{position:"relative",textAlign:"left",background:cardBg,border:"1px solid "+borderC,borderRadius:16,padding:"15px 16px",display:"flex",alignItems:"center",gap:12,cursor:"pointer",color:textC,boxShadow:dark?"none":"0 4px 14px rgba(0,0,0,0.05)"}}><span style={{fontSize:24,width:32,textAlign:"center"}}>{item.icon}</span><span style={{flex:1}}><span style={{display:"block",fontSize:15,fontWeight:800}}>{capSectionLabel(item.label)}</span><span style={{display:"block",fontSize:12,color:subC,marginTop:2}}>{item.sub}</span></span>{item.badge>0&&<span style={{position:"absolute",right:12,top:12,background:expenseColor,color:"#fff",borderRadius:"50%",width:20,height:20,fontSize:11,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{item.badge}</span>}</button>;})}</div></div>;
}
// panelContent is defined in app.tsx (accede a AppuntiPanel e SettingsPanel nested)
