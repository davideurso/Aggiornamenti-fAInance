// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICHE.TSX — StatsPanel
// Tab Generali / Budget / Risparmio.
// Tutto lo stato viene letto da useApp() — nessuna prop richiesta.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useApp, useStorage, MONTHS_FULL, MONTHS_SHORT, BALANCE_COLOR,
  DEFAULT_EXPENSE_GROUPS, rateMonth, dateOffset, todayStr } from './core';
import { DonutChart, BarChart, LineChart, StatCard, Btn } from './widget';
import { TRANSLATIONS, translateFainanceText } from './traduzioni';

export function StatsPanel(){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _ctx:any=useApp();
  var {lang,cats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_ctx;
  var {setExpenseGroups,incomeGroups,setIncomeGroups,incomeTypes,customIncomeTypes,setCustomIncomeTypes,incomeTypeOverrides,setIncomeTypeOverrides}:any=_ctx;
  var {recurring,setRecurring,goals,setGoals,alerts,setAlerts,expenses,setExpenses}:any=_ctx;
  var {incomes,setIncomes,sym,fmt,dark,dateFmt,curMonthKey,addExpenses}:any=_ctx;
  var {addIncomes,confirmRecurring,catOrder,setCatOrder,methodOrder,setMethodOrder,catSortMode,setCatSortMode}:any=_ctx;
  var {methodSortMode,setMethodSortMode,budgetPlan,setBudgetPlan,btnRadius,expenseColor,incomeColor,isMobile}:any=_ctx;
  var {patrimonioAreas,setPatrimonioAreas,patrimonioEntries,setPatrimonioEntries,patrimonioValues,setPatrimonioValues,patrimonioMode,setPatrimonioMode}:any=_ctx;
  var {patrimonioHistory,setPatrimonioHistory,patrimonioNotes,setPatrimonioNotes,historyFutureMode,setHistoryFutureMode,historySortDate,setHistorySortDate}:any=_ctx;
  var {historySortDirection,setHistorySortDirection,appuntiDocuments,setAppuntiDocuments,appuntiNotes,setAppuntiNotes,bankCoords,setBankCoords}:any=_ctx;
  var {notifPrefs,setNotifPrefs,customNotifs,setCustomNotifs,aiDismissed,setAiDismissed,aiChat,setAiChat}:any=_ctx;
  var {aiDataAccess,setAiDataAccess,aiFloatingEnabled,setAiFloatingEnabled,secondaryCurrency,secRate,fmtSec,secSym}:any=_ctx;
  var {secRateLoading,currency,showSecInHistory,setShowSecInHistory,showSecInStats,setShowSecInStats,showSecInBudget,setShowSecInBudget}:any=_ctx;
  var {showSecInPatrimonio,setShowSecInPatrimonio,textC,subC,borderC,cardBg,inp,sb}:any=_ctx;
  var {bgColor,tab,setTab,settingsPage,setSettingsPage,speseSubTab,setSpeseSubTab,addType}:any=_ctx;
  var {setAddType,addSubTab,setAddSubTab,historyTab,setHistoryTab,editingItem,setEditingItem,mobileMenu}:any=_ctx;
  var {setMobileMenu,toast,setToast,alertPopup,setAlertPopup,statsView,setStatsView,curYear}:any=_ctx;
  var {yearExp,yearInc,monthlyTotals,searchQuery,setSearchQuery,showFilters,setShowFilters,filterYear}:any=_ctx;
  var {setFilterYear,filterMonth,setFilterMonth,filterMonths,setFilterMonths,filterCat,setFilterCat,filterCats}:any=_ctx;
  var {setFilterCats,filterCatExclude,setFilterCatExclude,filterGroup,setFilterGroup,filterDateFrom,setFilterDateFrom,filterDateTo}:any=_ctx;
  var {setFilterDateTo,filterAmtMin,setFilterAmtMin,filterAmtMax,setFilterAmtMax,filteredExpenses,filteredIncomes,shareProjects}:any=_ctx;
  var {setShareProjects,shareSelectedProjectId,setShareSelectedProjectId,shareProjectTab,setShareProjectTab,shareReceivedInvites,shareInviteLoading,showShareInHistory}:any=_ctx;
  var {setShowShareInHistory,confirmButtonColor,setConfirmButtonColor,firestoreReady,userKey,userId,currentUser,pendingCount}:any=_ctx;
  var {alertTriggered,getCat,getMethod,getIT,curMonthExp,curMonthInc,last12Balance,aiTab}:any=_ctx;
  var {setAiTab,aiLoading,setAiLoading,aiAdviceFilter,setAiAdviceFilter,voiceModal,setVoiceModal,voiceListening}:any=_ctx;
  var {setVoiceListening,voiceText,setVoiceText,voiceError,setVoiceError,voiceConfirm,setVoiceConfirm,voiceSaving}:any=_ctx;
  var {setVoiceSaving,voiceParsed,setVoiceParsed,defaultExpenseCat,setDefaultExpenseCat,defaultExpenseMethod,setDefaultExpenseMethod,defaultExpenseArea}:any=_ctx;
  var {setDefaultExpenseArea,defaultIncomeType,setDefaultIncomeType,defaultIncomeArea,setDefaultIncomeArea,defaultMethodArea,setDefaultMethodArea,incomeTypeOrder}:any=_ctx;
  var {setIncomeTypeOrder,deleteConfirmId,setDeleteConfirmId,mergeFrom,setMergeFrom,mergeTo,setMergeTo,homeBalanceView}:any=_ctx;
  var {setHomeBalanceView,firstDayOfWeek,setFirstDayOfWeek,aiFloatingPos,setAiFloatingPos,aiFloatingDrag,setAiFloatingDrag,widgetBgColor}:any=_ctx;
  var {setWidgetBgColor,widgetBgAlpha,setWidgetBgAlpha,widgetExpenseColor,setWidgetExpenseColor,widgetIncomeColor,setWidgetIncomeColor,widgetTitle}:any=_ctx;
  var {setWidgetTitle,widgetSubtitle,setWidgetSubtitle,widgetExpenseLabel,setWidgetExpenseLabel,widgetIncomeLabel,setWidgetIncomeLabel,widgetShowHeader}:any=_ctx;
  var {setWidgetShowHeader,widgetButtonStyle,setWidgetButtonStyle,widgetVoiceEnabled,setWidgetVoiceEnabled,widget2Enabled,setWidget2Enabled,widget2Type}:any=_ctx;
  var {setWidget2Type,widget2TitleColor,setWidget2TitleColor,widget2BodyColor,setWidget2BodyColor,widget2AccentColor,setWidget2AccentColor,widget2BgAlpha}:any=_ctx;
  var {setWidget2BgAlpha,widget2TextSize,setWidget2TextSize,widget2MaxChars,setWidget2MaxChars,widget2AutoUpdate,setWidget2AutoUpdate,widget2SelectedNoteId}:any=_ctx;
  var {setWidget2SelectedNoteId,widget2SelectedBankId,setWidget2SelectedBankId,widget3Enabled,setWidget3Enabled,widget3TextColor,setWidget3TextColor,widget3AccentColor}:any=_ctx;
  var {setWidget3AccentColor,widget3PercentColor,setWidget3PercentColor,widget3BgAlpha,setWidget3BgAlpha,widget3ShowPercent,setWidget3ShowPercent,widget3ShowAmounts}:any=_ctx;
  var {setWidget3ShowAmounts,widget3AutoUpdate,setWidget3AutoUpdate,widget3SelectedGoalId,setWidget3SelectedGoalId,bgTheme,setBgTheme,btnStyle}:any=_ctx;
  var {setBtnStyle,shownAlertIds,setShownAlertIds,settingsValuesTab,setSettingsValuesTab}:any=_ctx;
  var t=TRANSLATIONS[lang]||TRANSLATIONS.it;
  function L(v){return translateFainanceText(v,lang||"it");}
  var currentPlan=(_ctx&&_ctx.currentPlan)||"free";
  var planNames={free:"Gratis",base:"Base",premium:"Completo"};
  function planRankLocal(p){return p==="premium"?2:p==="base"?1:0;}
  function planNameLocal(p){return planNames[p]||"Gratis";}
  function canPlan(required){return planRankLocal(currentPlan)>=planRankLocal(required);}
  function openInfo(){if(setTab)setTab("settings");if(setSettingsPage)setSettingsPage("info");}
  // ─────────────────────────────────────────────────────────────────────────
  var [statMode,setStatMode]=useStorage(userKey("stats_mode_v1"),"range");var [statYear,setStatYear]=useStorage(userKey("stats_year_v1"),String(curYear));var [statMonth,setStatMonth]=useStorage(userKey("stats_month_v1"),curMonthKey);var [rangeFrom,setRangeFrom]=useStorage(userKey("stats_range_from_v1"),dateOffset(365));var [rangeTo,setRangeTo]=useStorage(userKey("stats_range_to_v1"),todayStr());var [statsTab,setStatsTab]=useState("general");
  var canYearFilter=canPlan("base");
  var canRangeFilter=canPlan("premium");
  var canRateView=canPlan("base");
  var canCategoryStats=canPlan("base");
  var canIncomeTypeStats=canPlan("base");
  var canMonthlyCharts=canPlan("base");
  var canBudgetRisk=canPlan("base");
  var canBudgetArea=canPlan("base");
  var canBudgetCategory=canPlan("base");
  var canBudgetCategoryDelta=canPlan("premium");
  var canSavingAdvanced=canPlan("premium");
  var effectiveStatMode=(statMode==="range"&&!canRangeFilter)?(canYearFilter?"year":"month"):(statMode==="year"&&!canYearFilter?"month":statMode);
  var effectiveStatsView=canRateView?statsView:"reale";
  var lockedStats=[
    {name:"Filtro anno",plan:"base"},{name:"Filtro intervallo date personalizzato",plan:"premium"},{name:"Distribuzione uscite per categoria",plan:"base"},{name:"Dettaglio categorie dentro ogni area",plan:"base"},{name:"Entrate per tipo",plan:"base"},{name:"Entrate vs uscite mensili",plan:"base"},{name:"Saldo mensile dell’anno",plan:"base"},{name:"Vista reale / rateizzata",plan:"base"},{name:"Categorie sforate",plan:"base"},{name:"Budget per area",plan:"base"},{name:"Budget per categoria",plan:"base"},{name:"Importo avanzato / sforato per categoria",plan:"premium"},{name:"Score attendibilità del risparmio",plan:"premium"},{name:"Scostamento medio dal piano",plan:"premium"},{name:"Trend miglioramento / peggioramento",plan:"premium"},{name:"Tabella mensile dettagliata",plan:"premium"}
  ].filter(function(x){return !canPlan(x.plan);});
  var lockedBox={background:dark?"#3a321a":"#FFF8E1",border:"1px solid "+(dark?"#7a6220":"#F2D36B"),borderRadius:14,padding:"12px 14px",color:dark?"#F8D981":"#856404"};
  var grps=expenseGroups||DEFAULT_EXPENSE_GROUPS;
  if(expenses.length+incomes.length===0){return <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20,display:"flex",flexDirection:"column",gap:10}}><div style={{fontSize:18,fontWeight:900,color:textC}}>{L("Statistiche")}</div><div style={{fontSize:13,color:subC,lineHeight:1.45}}>{L("Registra qualche movimento per vedere le statistiche. Aggiungi entrate e uscite per confrontare il tuo andamento negli ultimi 12 mesi.")}</div><Btn onClick={function(){setTab("spese");setSpeseSubTab("add");setAddType("expense");}} bg="#7F77DD" style={{alignSelf:"flex-start"}}>{L("Aggiungi movimento")}</Btn></div>;}
  function getPeriodMonths(){
    if(effectiveStatMode==="month")return [statMonth];
    if(effectiveStatMode==="year")return Array.from({length:12},function(_,i){return statYear+"-"+String(i+1).padStart(2,"0");});
    var arr=[],d=new Date(rangeFrom.slice(0,7)+"-01"),end=new Date(rangeTo.slice(0,7)+"-01");
    while(d<=end){arr.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));d.setMonth(d.getMonth()+1);}
    return arr;
  }
  var periodMonths=getPeriodMonths();
  function itemInPeriod(item){if(effectiveStatMode==="year")return item.date&&item.date.startsWith(statYear);if(effectiveStatMode==="range")return item.date>=rangeFrom&&item.date<=rangeTo;return item.date&&item.date.startsWith(statMonth);}
  function rateInPeriod(item){return periodMonths.reduce(function(a,mk){return a+rateMonth(item,mk);},0);}
  function getFExp(){return expenses.filter(itemInPeriod);}
  function getFInc(){return incomes.filter(itemInPeriod);}
  var fExp=getFExp();var fInc=getFInc();
  var mExp=effectiveStatsView==="rateizzato"?expenses.reduce(function(a,e){return a+rateInPeriod(e);},0):fExp.reduce(function(a,e){return a+e.amount;},0);
  var mInc=effectiveStatsView==="rateizzato"?incomes.reduce(function(a,i){return a+rateInPeriod(i);},0):fInc.reduce(function(a,i){return a+i.amount;},0);
  var groupStatsLocal=grps.map(function(g){var gc=cats.filter(function(c){return c.group===g.id;});var total=effectiveStatsView==="rateizzato"?expenses.reduce(function(a,e){return gc.some(function(c){return c.id===e.catId;})?a+rateInPeriod(e):a;},0):fExp.filter(function(e){return gc.some(function(c){return c.id===e.catId;});}).reduce(function(a,e){return a+e.amount;},0);var catBreakdown=gc.map(function(c){var ct=effectiveStatsView==="rateizzato"?expenses.reduce(function(a,e){return e.catId===c.id?a+rateInPeriod(e):a;},0):fExp.filter(function(e){return e.catId===c.id;}).reduce(function(a,e){return a+e.amount;},0);return{...c,total:ct};}).filter(function(c){return c.total>0;}).sort(function(a,b){return b.total-a.total;});return{...g,total:total,catBreakdown:catBreakdown};}).filter(function(g){return g.total>0;});
  var donutData=groupStatsLocal.map(function(g){return{value:g.total,color:g.color,label:g.name};});
  var incByType=incomeTypes.map(function(it){return{label:it.icon,value:fInc.filter(function(i){return i.type===it.id;}).reduce(function(a,i){return a+i.amount;},0),color:it.color};}).filter(function(x){return x.value>0;});
  var titleLabel=effectiveStatMode==="year"?statYear:effectiveStatMode==="month"?MONTHS_FULL[parseInt(statMonth.split("-")[1])-1]+" "+statMonth.split("-")[0]:rangeFrom+" - "+rangeTo;

  // Budget stats
  var budgetPlanRef=budgetPlan;
  var budgetStats=useMemo(function(){
    if(!budgetPlanRef||!budgetPlanRef.items)return null;
    return cats.map(function(c){
      var bi=budgetPlanRef.items.find(function(i){return i.catId===c.id;});var budgeted=bi?bi.amount:0;if(!budgeted)return null;
      var spent;if(effectiveStatsView==="rateizzato")spent=expenses.reduce(function(a,e){return e.catId===c.id?a+rateInPeriod(e):a;},0);else spent=fExp.filter(function(e){return e.catId===c.id;}).reduce(function(a,e){return a+e.amount;},0);
      return{cat:c,budgeted:budgeted,spent:spent,pct:budgeted>0?Math.min(200,(spent/budgeted)*100):0,diff:budgeted-spent};
    }).filter(Boolean);
  },[budgetPlanRef,fExp,statMonth,statMode,effectiveStatsView,expenses,cats]);

  var budgetGroupStats=useMemo(function(){
    if(!budgetPlanRef||!budgetPlanRef.items)return null;
    return grps.map(function(g){
      var gc=cats.filter(function(c){return c.group===g.id;});
      var totalBudgeted=gc.reduce(function(a,c){var bi=budgetPlanRef.items.find(function(i){return i.catId===c.id;});return a+(bi?bi.amount:0);},0);if(!totalBudgeted)return null;
      var totalSpent;if(effectiveStatsView==="rateizzato")totalSpent=expenses.reduce(function(a,e){return gc.some(function(c){return c.id===e.catId;})?a+rateInPeriod(e):a;},0);else totalSpent=fExp.filter(function(e){return gc.some(function(c){return c.id===e.catId;});}).reduce(function(a,e){return a+e.amount;},0);
      return{group:g,budgeted:totalBudgeted,spent:totalSpent,pct:totalBudgeted>0?Math.min(200,(totalSpent/totalBudgeted)*100):0,diff:totalBudgeted-totalSpent};
    }).filter(Boolean);
  },[budgetPlanRef,fExp,grps,cats,statMonth,statMode,effectiveStatsView,expenses]);

  // Monthly saving trend: planned vs real, last 12 months
  var savingTrend=useMemo(function(){
    if(!budgetPlanRef)return null;
    var totalBudget=budgetPlanRef.items?budgetPlanRef.items.reduce(function(a,i){return a+i.amount;},0):0;
    var ref=budgetPlanRef.income||0;
    var plannedSaving=Math.max(0,ref-totalBudget);
    return Array.from({length:12},function(_,i){
      var key=curYear+"-"+String(i+1).padStart(2,"0");
      var monthExp=expenses.filter(function(e){return e.date.startsWith(key);}).reduce(function(a,e){return a+e.amount;},0);
      var monthInc=incomes.filter(function(i2){return i2.date.startsWith(key);}).reduce(function(a,i2){return a+i2.amount;},0);
      var realSaving=monthInc-monthExp;
      return{label:MONTHS_SHORT[i],planned:plannedSaving,real:realSaving,diff:realSaving-plannedSaving,hasData:monthInc>0||monthExp>0};
    });
  },[budgetPlanRef,expenses,incomes,curYear]);

  // Attendibility score
  var attendibility=useMemo(function(){
    if(!savingTrend)return null;
    var withData=savingTrend.filter(function(m){return m.hasData;});
    if(!withData.length)return null;
    var hits=withData.filter(function(m){return m.real>=m.planned;}).length;
    var score=Math.round((hits/withData.length)*100);
    var avgDiff=withData.reduce(function(a,m){return a+m.diff;},0)/withData.length;
    var improving=(function(){
      var halves=[withData.slice(0,Math.floor(withData.length/2)),withData.slice(Math.floor(withData.length/2))];
      if(halves[0].length<2||halves[1].length<2)return null;
      var avg1=halves[0].reduce(function(a,m){return a+m.diff;},0)/halves[0].length;
      var avg2=halves[1].reduce(function(a,m){return a+m.diff;},0)/halves[1].length;
      return avg2>avg1;
    })();
    return{score:score,hits:hits,total:withData.length,avgDiff:avgDiff,improving:improving};
  },[savingTrend]);

  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
      <div style={{display:"flex",gap:0,marginBottom:14,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3,boxShadow:dark?"none":"inset 0 0 0 1px #eee"}}><button onClick={function(){setStatMode("month");}} style={{...sb,flex:1,background:effectiveStatMode==="month"?"#378ADD":"transparent",color:effectiveStatMode==="month"?"#fff":subC,borderRadius:10,fontWeight:effectiveStatMode==="month"?700:500}}>{L("Mese")}</button><button onClick={function(){if(canYearFilter)setStatMode("year");}} disabled={!canYearFilter} style={{...sb,flex:1,background:effectiveStatMode==="year"?"#378ADD":"transparent",color:!canYearFilter?"#bbb":(effectiveStatMode==="year"?"#fff":subC),borderRadius:10,fontWeight:effectiveStatMode==="year"?700:500,cursor:canYearFilter?"pointer":"not-allowed",opacity:canYearFilter?1:.45}}>{canYearFilter?L("Anno"):L("Anno 🔒")}</button><button onClick={function(){if(canRangeFilter)setStatMode("range");}} disabled={!canRangeFilter} style={{...sb,flex:1,background:effectiveStatMode==="range"?"#378ADD":"transparent",color:!canRangeFilter?"#bbb":(effectiveStatMode==="range"?"#fff":subC),borderRadius:10,fontWeight:effectiveStatMode==="range"?700:500,cursor:canRangeFilter?"pointer":"not-allowed",opacity:canRangeFilter?1:.45}}>{canRangeFilter?L("Range"):L("Range 🔒")}</button></div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        {effectiveStatMode==="month"&&<input type="month" value={statMonth} onChange={function(e){setStatMonth(e.target.value);}} style={{...inp,flexShrink:0}}/>}
        {effectiveStatMode==="year"&&<select value={statYear} onChange={function(e){setStatYear(e.target.value);}} style={{...inp,width:"auto"}}>{Array.from(new Set([...expenses,...incomes].map(function(e){return e.date?e.date.slice(0,4):"";}).filter(Boolean))).sort(function(a,b){return b-a;}).map(function(y){return <option key={y} value={y}>{y}</option>;})}</select>}
        {effectiveStatMode==="range"&&<div style={{display:"flex",gap:10,flexWrap:"wrap"}}><div><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>{L("Da")}</label><input type="date" value={rangeFrom} onChange={function(e){setRangeFrom(e.target.value);}} style={inp}/></div><div><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>{L("A")}</label><input type="date" value={rangeTo} onChange={function(e){setRangeTo(e.target.value);}} style={inp}/></div></div>}
        {canRateView?<div style={{display:"flex",background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3,boxShadow:dark?"none":"inset 0 0 0 1px #eee"}}><button onClick={function(){setStatsView("rateizzato");}} style={{...sb,background:effectiveStatsView==="rateizzato"?"#7F77DD":"transparent",color:effectiveStatsView==="rateizzato"?"#fff":subC,borderRadius:10,fontWeight:effectiveStatsView==="rateizzato"?700:500}}>{L("Rateizzato")}</button><button onClick={function(){setStatsView("reale");}} style={{...sb,background:effectiveStatsView==="reale"?"#378ADD":"transparent",color:effectiveStatsView==="reale"?"#fff":subC,borderRadius:10,fontWeight:effectiveStatsView==="reale"?700:500}}>{L("Reale")}</button></div>:<div style={{...lockedBox,fontSize:12,padding:"8px 10px"}}>{L("🔒 Vista rateizzata disponibile dal piano Base.")}</div>}
      </div>
    </div>

    <div style={{display:"flex",gap:0,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3}}>
      <button onClick={function(){setStatsTab("general");}} style={{flex:1,padding:"8px",border:"none",borderRadius:10,background:statsTab==="general"?(dark?"#444":"#fff"):"transparent",color:statsTab==="general"?textC:subC,fontSize:13,cursor:"pointer",fontWeight:statsTab==="general"?600:400}}>{"📊 "+L("Generali")}</button>
      <button onClick={function(){setStatsTab("budget");}} style={{flex:1,padding:"8px",border:"none",borderRadius:10,background:statsTab==="budget"?(dark?"#444":"#fff"):"transparent",color:statsTab==="budget"?textC:subC,fontSize:13,cursor:"pointer",fontWeight:statsTab==="budget"?600:400}}>{"💰 "+L("Budget")}</button>
      <button onClick={function(){setStatsTab("saving");}} style={{flex:1,padding:"8px",border:"none",borderRadius:10,background:statsTab==="saving"?(dark?"#444":"#fff"):"transparent",color:statsTab==="saving"?textC:subC,fontSize:13,cursor:"pointer",fontWeight:statsTab==="saving"?600:400}}>{"📈 "+L("Risparmio")}</button>
    </div>

    {statsTab==="general"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":(canYearFilter?"repeat(4,1fr)":"repeat(3,1fr)"),gap:12}}><StatCard title={L("Uscite")} value={fmt(mExp)} color={expenseColor} bg={expenseColor+"22"} sub={showSecInStats?fmtSec(mExp)||undefined:undefined}/><StatCard title={L("Entrate")} value={fmt(mInc)} color={incomeColor} bg={incomeColor+"22"} sub={showSecInStats?fmtSec(mInc)||undefined:undefined}/><StatCard title={L("Saldo")} value={fmt(mInc-mExp)} color={BALANCE_COLOR} bg="#e8f4ff" sub={showSecInStats?fmtSec(mInc-mExp)||undefined:undefined}/>{canYearFilter&&<StatCard title={L("Anno")+" "+curYear} value={fmt(yearExp)} color="#534AB7" bg="#f0f0ff" sub={showSecInStats?fmtSec(yearExp)||undefined:undefined}/>}</div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:10,color:subC}}>{L("Distribuzione")+" — "+titleLabel}</div>{donutData.length===0?<div style={{color:"#ccc",fontSize:13,textAlign:"center",padding:"24px 0"}}>{L("Nessun dato")}</div>:<div style={{display:"flex",gap:16,alignItems:"center"}}><DonutChart data={donutData} size={120}/><div style={{flex:1}}>{donutData.map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/><span style={{fontSize:11,flex:1,color:subC}}>{d.label}</span><span style={{fontSize:11,fontWeight:500,color:textC}}>{fmt(d.value)}</span></div>;})}</div></div>}</div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:6,color:subC}}>{L("Per area")}</div>{groupStatsLocal.length===0?<div style={{color:"#ccc",fontSize:13}}>{t.noData}</div>:groupStatsLocal.map(function(g){return <div key={g.id} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,fontWeight:500,color:textC}}>{g.name}</span><span style={{fontSize:13,fontWeight:500,color:textC}}>{fmt(g.total)}</span></div><div style={{background:dark?"#333":"#f5f5f5",borderRadius:4,height:8,marginBottom:4}}><div style={{background:g.color,height:8,borderRadius:4,width:(groupStatsLocal[0].total>0?g.total/groupStatsLocal[0].total*100:0)+"%"}}/></div>{canCategoryStats&&g.catBreakdown.map(function(c){return <div key={c.id} style={{display:"flex",justifyContent:"space-between",padding:"2px 0 2px 12px"}}><span style={{fontSize:12,color:subC}}>{c.icon} {c.name}</span><span style={{fontSize:12,color:subC}}>{fmt(c.total)}</span></div>;})}</div>;})} </div>
      </div>
      {canMonthlyCharts&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:8,color:subC}}>{L("Entrate vs Uscite —")} {curYear}</div><BarChart data={monthlyTotals} width={isMobile?300:580} height={160}/></div>}
      {canMonthlyCharts&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:6,color:subC}}>{L("Saldo mensile")} {curYear}</div><LineChart data={monthlyTotals} width={isMobile?300:580} height={120} color={BALANCE_COLOR}/></div>}
      {canIncomeTypeStats&&incByType.length>0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:10,color:subC}}>{L("Entrate per tipo —")} {titleLabel}</div><div style={{display:"flex",gap:14,alignItems:"center"}}><DonutChart data={incByType} size={100}/><div style={{flex:1}}>{incByType.map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:20}}>{d.label}</span><span style={{fontSize:11,fontWeight:500,color:textC}}>{fmt(d.value)}</span></div>;})}</div></div></div>}
    </div>}

    {statsTab==="budget"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      {!budgetPlan&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:40,textAlign:"center",color:subC,fontSize:14}}>{L("Nessun budget configurato. Vai nella sezione Budget per impostarlo.")}</div>}
      {budgetPlan&&budgetStats&&<>
        {(function(){var tb=budgetPlan.items?budgetPlan.items.reduce(function(a,i){return a+i.amount;},0):0;var over=budgetStats.filter(function(s){return !s.diff||s.diff<0;}).length;return <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":(canBudgetRisk?"repeat(4,1fr)":"repeat(3,1fr)"),gap:12}}><StatCard title={L("Budget totale")} value={fmt(tb)} color="#7F77DD" bg="#f0f0ff" sub={showSecInBudget?fmtSec(tb)||undefined:undefined}/><StatCard title={L("Speso nel periodo")} value={fmt(mExp)} color={expenseColor} bg={expenseColor+"22"} sub={showSecInBudget?fmtSec(mExp)||undefined:undefined}/>{canBudgetRisk&&<StatCard title={L("Categorie sforate")} value={String(over)} color="#E24B4A" bg="#fff0f0"/>}<StatCard title={L("Risparmio pianif.")} value={fmt(Math.max(0,(budgetPlan.income||0)-tb))} color="#1D9E75" bg="#e8f8f0" sub={showSecInBudget?fmtSec(Math.max(0,(budgetPlan.income||0)-tb))||undefined:undefined}/></div>;}())}
        {canBudgetArea&&budgetGroupStats&&budgetGroupStats.length>0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{L("Budget per area —")} {titleLabel}</div>{budgetGroupStats.map(function(gs){var barColor=gs.pct>=100?"#E24B4A":gs.pct>=80?"#EF9F27":"#1D9E75";return <div key={gs.group.id} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}><span style={{fontSize:13,fontWeight:500,color:textC}}>{gs.group.name}</span><span style={{fontSize:12,color:subC}}>{fmt(gs.spent)} / {fmt(gs.budgeted)}</span></div><div style={{background:dark?"#333":"#f0f0f0",borderRadius:8,height:10}}><div style={{background:barColor,height:10,borderRadius:8,width:Math.min(100,gs.pct)+"%"}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:3}}><span style={{fontSize:11,color:barColor,fontWeight:500}}>{Math.round(gs.pct)}%</span><span style={{fontSize:11,color:gs.diff>=0?"#1D9E75":"#E24B4A"}}>{gs.diff>=0?L("avanza")+" "+fmt(gs.diff):L("sfora")+" "+fmt(Math.abs(gs.diff))}</span></div></div>;})} </div>}
        {canBudgetCategory&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{L("Budget per categoria —")} {titleLabel}</div>{budgetStats.sort(function(a,b){return b.pct-a.pct;}).map(function(s){var barColor=s.pct>=100?"#E24B4A":s.pct>=80?"#EF9F27":"#1D9E75";return <div key={s.cat.id} style={{marginBottom:10}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3,alignItems:"center"}}><div style={{display:"flex",alignItems:"center",gap:6}}><span style={{fontSize:15}}>{s.cat.icon}</span><span style={{fontSize:13,color:textC}}>{s.cat.name}</span></div><span style={{fontSize:12,color:subC}}>{fmt(s.spent)} / {fmt(s.budgeted)}</span></div><div style={{background:dark?"#333":"#f0f0f0",borderRadius:6,height:7}}><div style={{background:barColor,height:7,borderRadius:6,width:Math.min(100,s.pct)+"%"}}/></div><div style={{display:"flex",justifyContent:"space-between",marginTop:2}}><span style={{fontSize:10,color:barColor}}>{Math.round(s.pct)}%</span>{canBudgetCategoryDelta&&<span style={{fontSize:10,color:s.diff>=0?"#1D9E75":"#E24B4A"}}>{s.diff>=0?L("avanza")+" "+fmt(s.diff):L("sfora")+" "+fmt(Math.abs(s.diff))}</span>}</div></div>;})}
        </div>}
        {canBudgetRisk&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>{L("🔴 Categorie sforate / a rischio")}</div>{budgetStats.filter(function(s){return s.pct>=80;}).length===0?<div style={{fontSize:13,color:"#1D9E75",textAlign:"center",padding:"16px 0"}}>{L("✅ Nessuna categoria sforata o a rischio!")}</div>:budgetStats.filter(function(s){return s.pct>=80;}).sort(function(a,b){return b.pct-a.pct;}).map(function(s){var barColor=s.pct>=100?"#E24B4A":"#EF9F27";return <div key={s.cat.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderRadius:10,background:dark?"#252535":"#fafafa",border:"1px solid "+(s.pct>=100?"#fcc":(dark?"#444":"#eee")),marginBottom:8}}><span style={{fontSize:18}}>{s.cat.icon}</span><div style={{flex:1}}><div style={{fontSize:13,fontWeight:500,color:s.pct>=100?"#E24B4A":textC}}>{s.cat.name}</div><div style={{fontSize:11,color:subC}}>{fmt(s.spent)} {L("di")} {fmt(s.budgeted)}</div></div><div style={{textAlign:"right"}}><div style={{fontSize:14,fontWeight:700,color:barColor}}>{Math.round(s.pct)}%</div><div style={{fontSize:11,color:s.diff>=0?"#EF9F27":"#E24B4A"}}>{s.diff>=0?L("rimane")+" "+fmt(s.diff):L("sfora")+" "+fmt(Math.abs(s.diff))}</div></div></div>;})}
        </div>}
      </>}
    </div>}

    {statsTab==="saving"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      {!budgetPlan&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:40,textAlign:"center",color:subC,fontSize:14}}>{L("Nessun budget configurato. Vai nella sezione Budget per impostarlo.")}</div>}
      {budgetPlan&&savingTrend&&<>
        {/* Attendibility score */}
        {attendibility&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:14}}>{L("📊 Attendibilità del risparmio —")} {curYear}</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {canSavingAdvanced&&<StatCard title={L("Score attendibilità")} value={attendibility.score+"%"} color={attendibility.score>=70?"#1D9E75":attendibility.score>=40?"#EF9F27":"#E24B4A"} bg={attendibility.score>=70?"#e8f8f0":attendibility.score>=40?"#fff8e1":"#fff0f0"} sub={L("Mesi centrati")+": "+attendibility.hits+"/"+attendibility.total}/>}
            {canSavingAdvanced&&<StatCard title={L("Scostamento medio")} value={(attendibility.avgDiff>=0?"+":"")+fmt(attendibility.avgDiff)} color={attendibility.avgDiff>=0?"#1D9E75":"#E24B4A"} bg={attendibility.avgDiff>=0?"#e8f8f0":"#fff0f0"} sub={L("risparmio reale vs pianificato")}/>}
            <StatCard title={L("Risparmio pianificato")} value={fmt(budgetPlan.income&&budgetPlan.items?Math.max(0,(budgetPlan.income||0)-budgetPlan.items.reduce(function(a,i){return a+i.amount;},0)):0)} color="#7F77DD" bg="#f0f0ff" sub={L("mensile da budget")}/>
            {canSavingAdvanced&&<StatCard title={L("Trend")} value={attendibility.improving===null?"–":attendibility.improving?("📈 "+L("In miglioramento")):("📉 "+L("In peggioramento"))} color={attendibility.improving?"#1D9E75":"#E24B4A"} bg={attendibility.improving?"#e8f8f0":"#fff0f0"} sub={L("confronto prima/seconda metà anno")}/>}
          </div>
          <div style={{fontSize:12,color:subC,marginBottom:6}}>{L("Risparmio pianificato (tratteggiato viola) vs reale (barre) —")} {curYear}</div>
          <svg width={isMobile?300:560} height={160}>
            {(function(){
              var w=isMobile?300:560,h=160,pl=8,pr=8,pt=10,pb=22;
              var cw=w-pl-pr,ch=h-pt-pb;
              var allVals=savingTrend.map(function(m){return[m.planned,m.real];}).flat();
              var maxV=Math.max.apply(null,allVals.map(function(v){return Math.abs(v);}));if(!maxV)maxV=1;
              var bw=cw/12,barW=Math.max(4,Math.floor(bw*0.55));
              var midY=pt+ch/2;
              var scaleY=function(v){return midY-((v/maxV)*(ch/2));};
              var planPts=savingTrend.map(function(m,i){return{x:pl+i*bw+bw/2,y:scaleY(m.planned)};});
              var planLine=planPts.map(function(p,i){return(i===0?"M":"L")+p.x.toFixed(1)+" "+p.y.toFixed(1);}).join(" ");
              var tc2=dark?"#888":"#bbb";
              return <>
                <line x1={pl} y1={midY} x2={w-pr} y2={midY} stroke={dark?"#555":"#ddd"} strokeWidth={1} strokeDasharray="3,3"/>
                {[0,0.5,1].map(function(p){var y=pt+ch*(1-p);return <line key={p} x1={pl} y1={y} x2={w-pr} y2={y} stroke={dark?"#2a2a3e":"#f0f0f0"} strokeWidth={1}/>;})}
                {savingTrend.map(function(m,i){
                  if(!m.hasData)return null;
                  var cx=pl+i*bw+bw/2;
                  var barH=Math.abs(scaleY(m.real)-midY);var isPos=m.real>=0;
                  var barColor2=m.real>=m.planned?"#1D9E75":"#E24B4A";
                  return <g key={i}>
                    <rect x={cx-barW/2} y={isPos?midY-barH:midY} width={barW} height={Math.max(1,barH)} fill={barColor2} opacity={0.75} rx={2}/>
                    <text x={cx} y={h-5} textAnchor="middle" fontSize={8} fill={tc2}>{m.label}</text>
                  </g>;
                })}
                <path d={planLine} fill="none" stroke="#7F77DD" strokeWidth={2} strokeDasharray="5,3" strokeLinejoin="round"/>
              </>;
            })()}
          </svg>
          <div style={{display:"flex",gap:16,marginTop:8,flexWrap:"wrap"}}><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:4,background:"#1D9E75",borderRadius:2}}/><span style={{fontSize:11,color:subC}}>{L("Risparmio reale positivo")}</span></div><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:4,background:"#E24B4A",borderRadius:2}}/><span style={{fontSize:11,color:subC}}>{L("Risparmio reale negativo")}</span></div><div style={{display:"flex",alignItems:"center",gap:4}}><div style={{width:16,height:3,background:"#7F77DD",borderRadius:1,borderTop:"2px dashed #7F77DD"}}/><span style={{fontSize:11,color:subC}}>{L("Risparmio pianificato")}</span></div></div>
        </div>}

        {/* Month by month table */}
        {canSavingAdvanced&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>Dettaglio mensile — {curYear}</div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:dark?"#252535":"#f5f5f5"}}>{["Mese","Entrate","Uscite","Risparmio reale","Risparmio pianif.","Scostamento"].map(function(h){return <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:subC}}>{L(h)}</th>;})}</tr></thead><tbody>{savingTrend.map(function(m,i){if(!m.hasData)return null;var monthKey=curYear+"-"+String(i+1).padStart(2,"0");var mInc2=incomes.filter(function(inc){return inc.date.startsWith(monthKey);}).reduce(function(a,inc){return a+inc.amount;},0);var mExp2=expenses.filter(function(e){return e.date.startsWith(monthKey);}).reduce(function(a,e){return a+e.amount;},0);return <tr key={i} style={{borderBottom:"1px solid "+(dark?"#333":"#f0f0f0"),background:m.real>=m.planned?(dark?"#1a2a1e22":"#f0faf5"):(dark?"#2a1a1a22":"#fff8f8")}}><td style={{padding:"7px 10px",fontWeight:500,color:textC}}>{MONTHS_FULL[i]}</td><td style={{padding:"7px 10px",color:"#1D9E75"}}>{fmt(mInc2)}</td><td style={{padding:"7px 10px",color:"#E24B4A"}}>{fmt(mExp2)}</td><td style={{padding:"7px 10px",fontWeight:600,color:m.real>=0?"#1D9E75":"#E24B4A"}}>{fmt(m.real)}</td><td style={{padding:"7px 10px",color:"#7F77DD"}}>{fmt(m.planned)}</td><td style={{padding:"7px 10px",fontWeight:600,color:m.diff>=0?"#1D9E75":"#E24B4A"}}>{m.diff>=0?"+":""}{fmt(m.diff)}</td></tr>;})} </tbody></table></div>
        </div>}
      </>}
    </div>}

    {lockedStats.length>0&&<div style={{...lockedBox,display:"flex",flexDirection:"column",gap:10}}>
      <div style={{fontSize:14,fontWeight:800}}>{L("🔒 Statistiche non disponibili nel piano")} {planNameLocal(currentPlan)}</div>
      <div style={{fontSize:12,lineHeight:1.4}}>{L("Alla fine della pagina trovi le statistiche e i grafici che non possono essere visualizzati con il piano attuale.")}</div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:8}}>
        {lockedStats.map(function(item){return <div key={item.name} style={{background:dark?"rgba(255,255,255,0.06)":"rgba(255,255,255,0.55)",border:"1px dashed "+(dark?"#7a6220":"#E4C85F"),borderRadius:10,padding:"8px 10px",fontSize:12,display:"flex",justifyContent:"space-between",gap:8}}><span>{L(item.name)}</span><b>{planNameLocal(item.plan)}</b></div>;})}
      </div>
      <button onClick={openInfo} style={{alignSelf:"flex-start",background:"#7F77DD",color:"#fff",border:"none",borderRadius:btnRadius,padding:"9px 14px",fontSize:13,fontWeight:800,cursor:"pointer"}}>{L("Info / Cambia piano")}</button>
    </div>}
  </div>;
}


// ── CONSULENTE AI ──────────────────────────────────────────────────────────
