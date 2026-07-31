// ═══════════════════════════════════════════════════════════════════════════════
// STATISTICHE.TSX — StatsPanel
// Tab Generali / Budget / Risparmio.
// Tutto lo stato viene letto da useApp() — nessuna prop richiesta.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useMemo } from 'react';
import { useApp, useStorage, MONTHS_FULL, MONTHS_SHORT, BALANCE_COLOR,
  DEFAULT_EXPENSE_GROUPS, getAllIncomeTypes, rateMonth, dateOffset, todayStr } from './core';
import { DonutChart, BarChart, LineChart, StatCard, Btn } from './widget';
import { TRANSLATIONS, translateFainanceText } from './traduzioni';

export function StatsPanel(){
  // ── Destructure completo dal context ─────────────────────────────────────
  var _ctx:any=useApp();
  var {lang,cats,historicalExpenseCats,setCats,methods,setMethods,methodGroups,setMethodGroups,expenseGroups}:any=_ctx;
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
  var [statMode,setStatMode]=useStorage(userKey("stats_mode_v3"),"last12");var [statYear,setStatYear]=useStorage(userKey("stats_year_v2"),String(curYear));var [statMonth,setStatMonth]=useStorage(userKey("stats_month_v2"),curMonthKey);var [rangeFrom,setRangeFrom]=useStorage(userKey("stats_range_from_v2"),dateOffset(365));var [rangeTo,setRangeTo]=useStorage(userKey("stats_range_to_v2"),todayStr());var [statsTab,setStatsTab]=useState("general");
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
  var effectiveStatMode=(statMode==="range"&&!canRangeFilter)?"last12":(statMode==="year"&&!canYearFilter?"last12":(["month","year","range","last12"].indexOf(statMode)>=0?statMode:"last12"));
  var effectiveStatsView=canRateView?statsView:"reale";
  var lockedBox={background:dark?"#252535":"#F6F7F9",border:"1px solid "+borderC,borderRadius:14,padding:"12px 14px",color:subC};
  function usableStatsCategoryName(value,id){var name=String(value||"").trim(),sid=String(id||"");if(!name)return false;if(sid&&(name===sid||name.toLowerCase()===("categoria "+sid).toLowerCase()||name.toLowerCase()===("category "+sid).toLowerCase()))return false;if(/^(categoria|category|catégorie|kategorie|categoría|categorie|kategoria|κατηγορία)\s+[0-9_-]{5,}$/i.test(name)||/^[0-9_-]{5,}$/.test(name))return false;return true;}
  function unresolvedStatsCategory(){return{id:"__history_unresolved__",name:L("Movimenti storici"),icon:"🗂️",color:"#B4B2A9",group:"__history_unresolved__",archived:true,historical:true,unresolved:true};}
  function normalizeStatsCategoryName(value){try{return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase().replace(/\s+/g," ");}catch(e){return String(value||"").trim().toLowerCase().replace(/\s+/g," ");}}
  function statsCategoryFromMovement(e){
    var id=String(e&&e.catId!==undefined?e.catId:"");
    var movementName=String((e&&(e.catName||e.categoryName||e.categoryLabel))||"").trim();
    var currentById=(cats||[]).find(function(c){return c&&!c.deleted&&String(c.id)===id;});
    if(currentById&&usableStatsCategoryName(currentById.name,currentById.id))return {...currentById,archived:!!currentById.archived};
    if(movementName){var nn=normalizeStatsCategoryName(movementName);var currentByName=(cats||[]).find(function(c){return c&&!c.deleted&&normalizeStatsCategoryName(c.name)===nn;});if(currentByName)return {...currentByName,archived:!!currentByName.archived};}
    var historicalById=(historicalExpenseCats||[]).find(function(c){return c&&!c.deleted&&String(c.id)===id;});
    if(historicalById&&usableStatsCategoryName(historicalById.name,historicalById.id))return {...historicalById,archived:false};
    if(movementName){var nh=normalizeStatsCategoryName(movementName);var historicalByName=(historicalExpenseCats||[]).find(function(c){return c&&!c.deleted&&normalizeStatsCategoryName(c.name)===nh;});if(historicalByName)return {...historicalByName,archived:false};}
    if(usableStatsCategoryName(movementName,id))return{id:id||("history_"+normalizeStatsCategoryName(movementName)),name:movementName,icon:String((e&&(e.catIcon||e.categoryIcon))||"🏷️"),color:String((e&&(e.catColor||e.categoryColor))||"#B4B2A9"),group:String((e&&(e.catGroup||e.categoryGroup||e.groupId))||""),archived:false,historical:true};
    return unresolvedStatsCategory();
  }
  var statsCats=useMemo(function(){var map:any={},order:string[]=[];var hasUnresolved=false;(Array.isArray(expenses)?expenses:[]).forEach(function(e){var c=statsCategoryFromMovement(e);if(!c)return;if(c.unresolved){hasUnresolved=true;return;}var id=String(c.id);if(!map[id])order.push(id);map[id]={...(map[id]||{}),...c,id:id,archived:c.archived===true};});var out=order.map(function(id){return map[id];});if(hasUnresolved)out.push(unresolvedStatsCategory());return out;},[historicalExpenseCats,cats,expenses]);
  var grps=useMemo(function(){var base=((Array.isArray(expenseGroups)&&expenseGroups.length)?expenseGroups:DEFAULT_EXPENSE_GROUPS).slice(),known:any={};base.forEach(function(g){known[String(g.id)]=true;});if(statsCats.some(function(c){return c&&c.unresolved;}))base.push({id:"__history_unresolved__",name:L("Movimenti storici"),icon:"🗂️",color:"#B4B2A9",historical:true});if(statsCats.some(function(c){return c&&!c.unresolved&&(!c.group||!known[String(c.group)]);}))base.push({id:"__history_archived__",name:L("Categorie archiviate"),icon:"🗂️",color:"#B4B2A9",historical:true});return base;},[expenseGroups,statsCats]);
  function statsGroupIdForCat(c){if(c&&c.unresolved)return "__history_unresolved__";var gid=String(c&&c.group||"");if(gid&&(grps||[]).some(function(g){return String(g.id)===gid;}))return gid;return "__history_archived__";}
  function catsForStatsGroup(group){return (statsCats||[]).filter(function(c){return statsGroupIdForCat(c)===String(group.id);});}
  function openHistoryForStatsCategory(cat){
    if(setHistoryTab)setHistoryTab("expenses");
    if(setFilterCat)setFilterCat("all");
    if(setFilterCats)setFilterCats(["expense:"+String(cat&&cat.id||"")]);
    if(setFilterCatExclude)setFilterCatExclude(false);
    if(setFilterGroup)setFilterGroup("all");
    if(setFilterYear)setFilterYear("all");
    if(setFilterMonth)setFilterMonth("");
    if(setFilterMonths)setFilterMonths([]);
    if(setFilterDateFrom)setFilterDateFrom("");
    if(setFilterDateTo)setFilterDateTo("");
    if(setTab)setTab("history");
  }
  function last12StatsMonthKeys(){
    var n=new Date();var start=new Date(n.getFullYear(),n.getMonth()-11,1);
    return Array.from({length:12},function(_,i){var d=new Date(start.getFullYear(),start.getMonth()+i,1);return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0");});
  }
  function monthKeyLabel(mk){
    var m=parseInt(String(mk).slice(5,7),10)-1;var yy=String(mk).slice(2,4);
    var base=MONTHS_SHORT[m]||String(mk).slice(5,7);
    return effectiveStatMode==="year"?base:(base+" "+yy);
  }
  if(expenses.length+incomes.length===0){return <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20,display:"flex",flexDirection:"column",gap:10}}><div style={{fontSize:18,fontWeight:900,color:textC}}>{L("Statistiche")}</div><div style={{fontSize:13,color:subC,lineHeight:1.45}}>{L("Registra qualche movimento per vedere le statistiche. Aggiungi entrate e uscite per confrontare il tuo andamento negli ultimi 12 mesi.")}</div><Btn onClick={function(){setTab("spese");setSpeseSubTab("add");setAddType("expense");}} bg="#7F77DD" style={{alignSelf:"flex-start"}}>{L("Aggiungi movimento")}</Btn></div>;}
  function getPeriodMonths(){
    if(effectiveStatMode==="month")return [statMonth];
    if(effectiveStatMode==="year")return Array.from({length:12},function(_,i){return statYear+"-"+String(i+1).padStart(2,"0");});
    if(effectiveStatMode==="last12")return last12StatsMonthKeys();
    var arr=[],d=new Date(rangeFrom.slice(0,7)+"-01"),end=new Date(rangeTo.slice(0,7)+"-01");
    while(d<=end){arr.push(d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"));d.setMonth(d.getMonth()+1);}
    return arr;
  }
  var periodMonths=getPeriodMonths();
  var savingTrendMonths=effectiveStatMode==="last12"?last12StatsMonthKeys():periodMonths;
  var periodStartDate=periodMonths.length?periodMonths[0]+"-01":statMonth+"-01";
  var periodEndDate=effectiveStatMode==="last12"?todayStr():(effectiveStatMode==="range"?rangeTo:(periodMonths.length?periodMonths[periodMonths.length-1]+"-31":todayStr()));
  function itemInPeriod(item){if(!item||!item.date)return false;if(effectiveStatMode==="year")return item.date.startsWith(statYear);if(effectiveStatMode==="month")return item.date.startsWith(statMonth);return item.date>=periodStartDate&&item.date<=periodEndDate;}
  function rateInPeriod(item){return periodMonths.reduce(function(a,mk){return a+rateMonth(item,mk);},0);}
  function getFExp(){return expenses.filter(itemInPeriod);}
  function getFInc(){return incomes.filter(itemInPeriod);}
  var fExp=getFExp();var fInc=getFInc();
  var mExp=effectiveStatsView==="rateizzato"?expenses.reduce(function(a,e){return a+rateInPeriod(e);},0):fExp.reduce(function(a,e){return a+e.amount;},0);
  var mInc=effectiveStatsView==="rateizzato"?incomes.reduce(function(a,i){return a+rateInPeriod(i);},0):fInc.reduce(function(a,i){return a+i.amount;},0);
  var groupStatsLocal=grps.map(function(g){var gc=catsForStatsGroup(g);var ids=gc.map(function(c){return String(c.id);});function resolvedId(e){var r=statsCategoryFromMovement(e);return r?String(r.id):"";}function expBelongs(e){var resolved=statsCategoryFromMovement(e);if(String(g.id)==="__history_unresolved__")return !!(resolved&&resolved.unresolved);return ids.indexOf(resolvedId(e))>=0;}var total=effectiveStatsView==="rateizzato"?expenses.reduce(function(a,e){return expBelongs(e)?a+rateInPeriod(e):a;},0):fExp.filter(expBelongs).reduce(function(a,e){return a+(parseFloat(e.amount)||0);},0);var catBreakdown=gc.map(function(c){var ct=effectiveStatsView==="rateizzato"?expenses.reduce(function(a,e){return resolvedId(e)===String(c.id)?a+rateInPeriod(e):a;},0):fExp.filter(function(e){return resolvedId(e)===String(c.id);}).reduce(function(a,e){return a+(parseFloat(e.amount)||0);},0);return{...c,total:ct};}).filter(function(c){return c.total>0;}).sort(function(a,b){return b.total-a.total;});return{...g,total:total,catBreakdown:catBreakdown};}).filter(function(g){return g.total>0;});
  groupStatsLocal.sort(function(a,b){return b.total-a.total;});
  var donutData=groupStatsLocal.map(function(g){return{value:g.total,color:g.color,label:g.name};});
  var allStatsIncomeTypes=getAllIncomeTypes(customIncomeTypes,incomeTypeOverrides).filter(function(x){return !x.deleted;});
  var incByType=allStatsIncomeTypes.map(function(it){return{label:it.icon,value:fInc.filter(function(i){return String(i.type)===String(it.id);}).reduce(function(a,i){return a+i.amount;},0),color:it.color,name:it.name,archived:!!it.archived};}).filter(function(x){return x.value>0;});
  var titleLabel=effectiveStatMode==="last12"?L("Ultimi 12 mesi"):(effectiveStatMode==="year"?statYear:effectiveStatMode==="month"?MONTHS_FULL[parseInt(statMonth.split("-")[1])-1]+" "+statMonth.split("-")[0]:rangeFrom+" - "+rangeTo);
  var statsMonthlyTotals=useMemo(function(){return periodMonths.map(function(mk){var exp=effectiveStatsView==="rateizzato"?expenses.reduce(function(a,e){return a+rateMonth(e,mk);},0):expenses.filter(function(e){return e.date&&e.date.startsWith(mk);}).reduce(function(a,e){return a+(parseFloat(e.amount)||0);},0);var inc=effectiveStatsView==="rateizzato"?incomes.reduce(function(a,i){return a+rateMonth(i,mk);},0):incomes.filter(function(i){return i.date&&i.date.startsWith(mk);}).reduce(function(a,i){return a+(parseFloat(i.amount)||0);},0);return{label:monthKeyLabel(mk),exp:exp,inc:inc,value:inc-exp};});},[periodMonths.join("|"),expenses,incomes,effectiveStatsView,effectiveStatMode]);
  var monthlyDivisor=Math.max(1,periodMonths.length);
  var monthlyAverageSummary=[
    {id:"expenses",label:L("Uscite medie mensili"),value:mExp/monthlyDivisor,color:expenseColor},
    {id:"income",label:L("Entrate medie mensili"),value:mInc/monthlyDivisor,color:incomeColor},
    {id:"balance",label:L("Saldo medio mensile"),value:(mInc-mExp)/monthlyDivisor,color:BALANCE_COLOR}
  ];
  var monthlyAreaStats=groupStatsLocal.map(function(g){return{id:g.id,label:g.name,value:g.total/monthlyDivisor,color:g.color};}).filter(function(x){return Math.abs(x.value)>0;});
  var monthlyCategoryStats=groupStatsLocal.reduce(function(out,g){return out.concat((g.catBreakdown||[]).map(function(c){return{id:String(c.id),label:(c.icon?c.icon+" ":"")+c.name+(c.archived?(" · "+L("Archiviata")):""),value:c.total/monthlyDivisor,color:c.color||g.color};}));},[]).filter(function(x){return Math.abs(x.value)>0;}).sort(function(a,b){return b.value-a.value;});
  var monthlyIncomeTypeStats=allStatsIncomeTypes.map(function(it){var total=effectiveStatsView==="rateizzato"?incomes.reduce(function(a,i){return String(i.type)===String(it.id)?a+rateInPeriod(i):a;},0):fInc.filter(function(i){return String(i.type)===String(it.id);}).reduce(function(a,i){return a+(parseFloat(i.amount)||0);},0);return{id:String(it.id),label:(it.icon?it.icon+" ":"")+it.name+(it.archived?(" · "+L("Archiviata")):""),value:total/monthlyDivisor,color:it.color};}).filter(function(x){return Math.abs(x.value)>0;}).sort(function(a,b){return b.value-a.value;});

  // Budget stats
  var budgetPlanRef=budgetPlan;
  var budgetStats=useMemo(function(){
    if(!budgetPlanRef||!budgetPlanRef.items)return null;
    return statsCats.map(function(c){
      var bi=budgetPlanRef.items.find(function(i){return i.catId===c.id;});var budgeted=bi?bi.amount:0;if(!budgeted)return null;
      var spent;if(effectiveStatsView==="rateizzato")spent=expenses.reduce(function(a,e){return e.catId===c.id?a+rateInPeriod(e):a;},0);else spent=fExp.filter(function(e){return e.catId===c.id;}).reduce(function(a,e){return a+e.amount;},0);
      return{cat:c,budgeted:budgeted,spent:spent,pct:budgeted>0?Math.min(200,(spent/budgeted)*100):0,diff:budgeted-spent};
    }).filter(Boolean);
  },[budgetPlanRef,fExp,statMonth,statMode,effectiveStatsView,expenses,statsCats]);

  var budgetGroupStats=useMemo(function(){
    if(!budgetPlanRef||!budgetPlanRef.items)return null;
    return grps.map(function(g){
      var gc=statsCats.filter(function(c){return statsGroupIdForCat(c)===String(g.id);});
      var totalBudgeted=gc.reduce(function(a,c){var bi=budgetPlanRef.items.find(function(i){return i.catId===c.id;});return a+(bi?bi.amount:0);},0);if(!totalBudgeted)return null;
      var totalSpent;if(effectiveStatsView==="rateizzato")totalSpent=expenses.reduce(function(a,e){return gc.some(function(c){return c.id===e.catId;})?a+rateInPeriod(e):a;},0);else totalSpent=fExp.filter(function(e){return gc.some(function(c){return c.id===e.catId;});}).reduce(function(a,e){return a+e.amount;},0);
      return{group:g,budgeted:totalBudgeted,spent:totalSpent,pct:totalBudgeted>0?Math.min(200,(totalSpent/totalBudgeted)*100):0,diff:totalBudgeted-totalSpent};
    }).filter(Boolean);
  },[budgetPlanRef,fExp,grps,statsCats,statMonth,statMode,effectiveStatsView,expenses]);

  // Monthly saving trend: planned vs real, defaulting to the selected period / last 12 months
  var savingTrend=useMemo(function(){
    if(!budgetPlanRef)return null;
    var totalBudget=budgetPlanRef.items?budgetPlanRef.items.reduce(function(a,i){return a+i.amount;},0):0;
    var ref=budgetPlanRef.income||0;
    var plannedSaving=Math.max(0,ref-totalBudget);
    return (savingTrendMonths||[]).map(function(key){
      var monthExp=expenses.filter(function(e){return e.date&&e.date.startsWith(key);}).reduce(function(a,e){return a+e.amount;},0);
      var monthInc=incomes.filter(function(i2){return i2.date&&i2.date.startsWith(key);}).reduce(function(a,i2){return a+i2.amount;},0);
      var realSaving=monthInc-monthExp;
      return{key:key,label:monthKeyLabel(key),planned:plannedSaving,real:realSaving,diff:realSaving-plannedSaving,hasData:monthInc>0||monthExp>0};
    });
  },[budgetPlanRef,expenses,incomes,savingTrendMonths.join("|"),effectiveStatMode]);

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

  function MonthlyValueRows(props:any){
    var items=(props.items||[]).slice(0,props.limit||10);
    if(!items.length)return <div style={{color:subC,fontSize:13,textAlign:"center",padding:"18px 0"}}>{L("Nessun dato")}</div>;
    var max=Math.max.apply(null,items.map(function(x){return Math.abs(Number(x.value)||0);}));if(!max)max=1;
    return <div>{items.map(function(item){var v=Number(item.value)||0;return <div key={String(item.id)} style={{marginBottom:11}}><div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center",marginBottom:4}}><span style={{fontSize:12,color:textC,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</span><span style={{fontSize:12,color:textC,fontWeight:800,whiteSpace:"nowrap"}}>{fmt(v)} <span style={{fontSize:10,color:subC,fontWeight:500}}>{L("al mese")}</span></span></div><div style={{height:9,borderRadius:999,background:dark?"#303043":"#EEF0F4",overflow:"hidden"}}><div style={{height:"100%",width:Math.max(v?3:0,Math.min(100,Math.abs(v)/max*100))+"%",background:item.color||"#7F77DD",borderRadius:999,opacity:v<0?0.65:1}}/></div></div>;})}</div>;
  }
  function MonthlyBudgetRows(props:any){
    var items=(props.items||[]).slice(0,props.limit||10);
    if(!items.length)return <div style={{color:subC,fontSize:13,textAlign:"center",padding:"18px 0"}}>{L("Nessun dato")}</div>;
    var max=Math.max.apply(null,items.reduce(function(a,x){return a.concat([Math.abs(Number(x.average)||0),Math.abs(Number(x.budget)||0)]);},[]));if(!max)max=1;
    return <div>{items.map(function(item){var av=Number(item.average)||0,bg=Number(item.budget)||0;return <div key={String(item.id)} style={{marginBottom:14}}><div style={{display:"flex",justifyContent:"space-between",gap:8,marginBottom:5}}><span style={{fontSize:12,color:textC,fontWeight:650,minWidth:0,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{item.label}</span><span style={{fontSize:11,color:subC,whiteSpace:"nowrap"}}>{fmt(av)} / {fmt(bg)}</span></div><div style={{display:"grid",gap:4}}><div style={{height:8,borderRadius:999,background:dark?"#303043":"#EEF0F4",overflow:"hidden"}}><div style={{height:"100%",width:Math.min(100,Math.abs(av)/max*100)+"%",background:item.color||expenseColor,borderRadius:999}}/></div><div style={{height:5,borderRadius:999,background:dark?"#303043":"#EEF0F4",overflow:"hidden"}}><div style={{height:"100%",width:Math.min(100,Math.abs(bg)/max*100)+"%",background:"#7F77DD",borderRadius:999,opacity:.65}}/></div></div></div>;})}<div style={{display:"flex",gap:14,flexWrap:"wrap",fontSize:10,color:subC,marginTop:4}}><span>● {L("Uscite medie mensili")}</span><span style={{color:"#7F77DD"}}>● {L("Budget mensile")}</span></div></div>;
  }
  function PreviewGraphic(props:any){
    var type=String(props.type||"bar"),stroke=dark?"#B9B6C8":"#8B879A",fill=dark?"#6F6B82":"#B6B2C2";
    if(type==="donut")return <svg width="100%" height="44" viewBox="0 0 120 44"><circle cx="23" cy="22" r="14" fill="none" stroke={fill} strokeWidth="8" opacity=".62"/><path d="M23 8 A14 14 0 0 1 36 26" fill="none" stroke={stroke} strokeWidth="8" strokeLinecap="round"/><rect x="49" y="8" width="56" height="4" rx="2" fill={fill}/><rect x="49" y="19" width="44" height="4" rx="2" fill={fill}/><rect x="49" y="30" width="35" height="4" rx="2" fill={fill}/></svg>;
    if(type==="line")return <svg width="100%" height="44" viewBox="0 0 120 44"><line x1="4" y1="38" x2="116" y2="38" stroke={fill}/><polyline points="6,32 24,24 42,28 60,13 78,21 96,9 114,17" fill="none" stroke={stroke} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>;
    if(type==="budget")return <svg width="100%" height="44" viewBox="0 0 120 44">{[7,21,35].map(function(y,i){return <g key={y}><rect x="5" y={y} width="110" height="7" rx="3.5" fill={fill}/><rect x="5" y={y} width={[76,49,91][i]} height="7" rx="3.5" fill={stroke}/></g>;})}</svg>;
    return <svg width="100%" height="44" viewBox="0 0 120 44">{[19,33,25,38,22,31].map(function(h,i){return <rect key={i} x={8+i*18} y={41-h} width="10" height={h} rx="2" fill={i%2?fill:stroke}/>;})}</svg>;
  }
  var planPreviewMap:any={
    general:{base:[{title:L("Distribuzione per categoria"),type:"donut"},{title:L("Entrate vs Uscite mensili"),type:"bar"},{title:L("Saldo mensile"),type:"line"},{title:L("Entrate per tipo"),type:"donut"}],premium:[]},
    budget:{base:[{title:L("Categorie sforate"),type:"budget"},{title:L("Budget per area"),type:"budget"},{title:L("Budget per categoria"),type:"budget"}],premium:[{title:L("Importo avanzato o sforato"),type:"budget"}]},
    saving:{base:[],premium:[{title:L("Attendibilità del risparmio"),type:"bar"},{title:L("Scostamento medio"),type:"line"},{title:L("Trend"),type:"line"},{title:L("Dettaglio mensile"),type:"bar"}]},
    monthly:{base:[{title:L("Entrate e Uscite medie mensili"),type:"bar"},{title:L("Saldo medio mensile"),type:"line"},{title:L("Spesa media mensile per area"),type:"budget"},{title:L("Spesa media mensile per categoria"),type:"budget"},{title:L("Entrata media mensile per tipo"),type:"budget"},{title:L("Spesa media mensile rispetto al budget per area"),type:"budget"},{title:L("Spesa media mensile rispetto al budget per categoria"),type:"budget"}],premium:[{title:L("Scostamento medio mensile dal budget"),type:"budget"}]}
  };
  function PlanPreviewSection(plan,items){
    if(!items||!items.length)return null;if(currentPlan==="premium")return null;if(plan==="base"&&currentPlan!=="free")return null;if(plan==="premium"&&currentPlan!=="free"&&currentPlan!=="base")return null;
    var title=plan==="base"?L("Statistiche incluse nel piano Base"):L("Statistiche incluse nel piano Completo");
    return <section style={{marginTop:8,paddingTop:4}}><div style={{display:"flex",alignItems:"center",gap:9,marginBottom:10,padding:"9px 11px",borderRadius:12,background:plan==="base"?(dark?"#29253B":"#F1EEFF"):(dark?"#21342F":"#EAF8F2"),border:"1px solid "+(plan==="base"?(dark?"#4A416B":"#D8D0FF"):(dark?"#31584D":"#BFE7D8"))}}><span aria-hidden="true" style={{fontSize:17}}>{plan==="base"?"✨":"💎"}</span><div style={{fontSize:14,fontWeight:900,color:plan==="base"?(dark?"#D9D2FF":"#534AB7"):(dark?"#BFE8DA":"#146B55"),lineHeight:1.2}}>{title}</div><div style={{height:2,flex:1,borderRadius:2,background:plan==="base"?(dark?"#6F63A6":"#AFA5E8"):(dark?"#4D8B78":"#73C5A8"),opacity:.55}}/></div><div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8}}>{items.map(function(item,index){return <div key={item.title+index} style={{background:cardBg,border:"1px solid "+borderC,borderRadius:11,padding:"9px 8px",overflow:"hidden",minWidth:0}}><div style={{fontSize:10.5,fontWeight:800,color:textC,marginBottom:4,lineHeight:1.2,minHeight:25,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{item.title}</div><div aria-hidden="true" style={{opacity:.20,filter:"grayscale(.35)",pointerEvents:"none"}}><PreviewGraphic type={item.type}/></div></div>;})}</div></section>;
  }
  function LockedPreviews(props:any){var tabName=props&&props.tabName;var cfg=planPreviewMap[tabName]||{base:[],premium:[]};return <>{PlanPreviewSection("base",cfg.base)}{PlanPreviewSection("premium",cfg.premium)}</>;}


  return <div style={{display:"flex",flexDirection:"column",gap:16}}>
    <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
      <div style={{display:"flex",gap:0,marginBottom:14,background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3,boxShadow:dark?"none":"inset 0 0 0 1px #eee"}}><button onClick={function(){setStatMode("month");}} style={{...sb,flex:1,background:effectiveStatMode==="month"?"#378ADD":"transparent",color:effectiveStatMode==="month"?"#fff":subC,borderRadius:10,fontWeight:effectiveStatMode==="month"?700:500}}>{L("Mese")}</button><button onClick={function(){setStatMode("last12");}} style={{...sb,flex:1,background:effectiveStatMode==="last12"?"#378ADD":"transparent",color:effectiveStatMode==="last12"?"#fff":subC,borderRadius:10,fontWeight:effectiveStatMode==="last12"?700:500}}>{L("Ultimi 12 mesi")}</button><button onClick={function(){if(canYearFilter)setStatMode("year");}} disabled={!canYearFilter} style={{...sb,flex:1,background:effectiveStatMode==="year"?"#378ADD":"transparent",color:!canYearFilter?"#bbb":(effectiveStatMode==="year"?"#fff":subC),borderRadius:10,fontWeight:effectiveStatMode==="year"?700:500,cursor:canYearFilter?"pointer":"not-allowed",opacity:canYearFilter?1:.45}}>{canYearFilter?L("Anno"):L("Anno 🔒")}</button><button onClick={function(){if(canRangeFilter)setStatMode("range");}} disabled={!canRangeFilter} style={{...sb,flex:1,background:effectiveStatMode==="range"?"#378ADD":"transparent",color:!canRangeFilter?"#bbb":(effectiveStatMode==="range"?"#fff":subC),borderRadius:10,fontWeight:effectiveStatMode==="range"?700:500,cursor:canRangeFilter?"pointer":"not-allowed",opacity:canRangeFilter?1:.45}}>{canRangeFilter?L("Range"):L("Range 🔒")}</button></div>
      <div style={{display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
        {effectiveStatMode==="month"&&<input type="month" value={statMonth} onChange={function(e){setStatMonth(e.target.value);}} style={{...inp,flexShrink:0}}/>}
        {effectiveStatMode==="year"&&<select value={statYear} onChange={function(e){setStatYear(e.target.value);}} style={{...inp,width:"auto"}}>{Array.from(new Set([...expenses,...incomes].map(function(e){return e.date?e.date.slice(0,4):"";}).filter(Boolean))).sort(function(a,b){return b-a;}).map(function(y){return <option key={y} value={y}>{y}</option>;})}</select>}
        {effectiveStatMode==="range"&&<div style={{display:"flex",gap:10,flexWrap:"wrap"}}><div><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>{L("Da")}</label><input type="date" value={rangeFrom} onChange={function(e){setRangeFrom(e.target.value);}} style={inp}/></div><div><label style={{fontSize:12,color:subC,display:"block",marginBottom:4}}>{L("A")}</label><input type="date" value={rangeTo} onChange={function(e){setRangeTo(e.target.value);}} style={inp}/></div></div>}
        {canRateView?<div style={{display:"flex",background:dark?"#252535":"#f5f5f5",borderRadius:12,padding:3,boxShadow:dark?"none":"inset 0 0 0 1px #eee"}}><button onClick={function(){setStatsView("rateizzato");}} style={{...sb,background:effectiveStatsView==="rateizzato"?"#7F77DD":"transparent",color:effectiveStatsView==="rateizzato"?"#fff":subC,borderRadius:10,fontWeight:effectiveStatsView==="rateizzato"?700:500}}>{L("Rateizzato")}</button><button onClick={function(){setStatsView("reale");}} style={{...sb,background:effectiveStatsView==="reale"?"#378ADD":"transparent",color:effectiveStatsView==="reale"?"#fff":subC,borderRadius:10,fontWeight:effectiveStatsView==="reale"?700:500}}>{L("Reale")}</button></div>:<div style={{...lockedBox,fontSize:12,padding:"8px 10px"}}>{L("🔒 Vista rateizzata disponibile dal piano Base.")}</div>}
      </div>
    </div>

    <div style={{display:"grid",gridTemplateColumns:isMobile?"repeat(2,minmax(0,1fr))":"repeat(4,minmax(0,1fr))",background:dark?"linear-gradient(145deg,#202033,#292941)":"linear-gradient(145deg,#EEF4FF,#F7F3FF)",border:"1px solid "+(dark?"#3D3D59":"#DCE6F6"),borderRadius:16,padding:6,gap:7,boxShadow:dark?"none":"0 7px 22px rgba(55,138,221,.10)"}}>
      {[{id:"general",icon:"📊",label:L("Generali")},{id:"monthly",icon:"🗓️",label:L("Medie mensili")},{id:"budget",icon:"💰",label:L("Budget")},{id:"saving",icon:"📈",label:L("Risparmio")}].map(function(item){var active=statsTab===item.id;return <button key={item.id} onClick={function(){setStatsTab(item.id);}} style={{minWidth:0,minHeight:44,padding:"9px 7px",border:"1px solid "+(active?"transparent":(dark?"#45455F":"#DDE5F0")),borderRadius:12,background:active?("linear-gradient(135deg,"+(confirmButtonColor||"#378ADD")+",#5FAFE5)"):(dark?"rgba(255,255,255,.045)":"rgba(255,255,255,.78)"),color:active?"#fff":textC,fontSize:isMobile?11.5:13,cursor:"pointer",fontWeight:active?900:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",boxShadow:active?"0 6px 15px rgba(55,138,221,.28)":(dark?"none":"0 2px 7px rgba(15,23,42,.05)"),transform:active?"translateY(-1px)":"none",transition:"all .18s ease"}}><span style={{fontSize:isMobile?14:16,marginRight:4}}>{item.icon}</span>{item.label}</button>;})}
    </div>

    {statsTab==="general"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":(canYearFilter?"repeat(4,1fr)":"repeat(3,1fr)"),gap:12}}><StatCard title={L("Uscite")} value={fmt(mExp)} color={expenseColor} bg={expenseColor+"22"} sub={showSecInStats?fmtSec(mExp)||undefined:undefined}/><StatCard title={L("Entrate")} value={fmt(mInc)} color={incomeColor} bg={incomeColor+"22"} sub={showSecInStats?fmtSec(mInc)||undefined:undefined}/><StatCard title={L("Saldo")} value={fmt(mInc-mExp)} color={BALANCE_COLOR} bg="#e8f4ff" sub={showSecInStats?fmtSec(mInc-mExp)||undefined:undefined}/>{canYearFilter&&<StatCard title={L("Anno")+" "+curYear} value={fmt(yearExp)} color="#534AB7" bg="#f0f0ff" sub={showSecInStats?fmtSec(yearExp)||undefined:undefined}/>}</div>
      <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:10,color:subC}}>{L("Distribuzione")+" — "+titleLabel}</div>{donutData.length===0?<div style={{color:"#ccc",fontSize:13,textAlign:"center",padding:"24px 0"}}>{L("Nessun dato")}</div>:<div style={{display:"flex",gap:16,alignItems:"center"}}><DonutChart data={donutData} size={120}/><div style={{flex:1}}>{donutData.map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><div style={{width:8,height:8,borderRadius:"50%",background:d.color,flexShrink:0}}/><span style={{fontSize:11,flex:1,color:subC}}>{d.label}</span><span style={{fontSize:11,fontWeight:500,color:textC}}>{fmt(d.value)}</span></div>;})}</div></div>}</div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:6,color:subC}}>{L("Per area")+" — "+titleLabel}</div>{groupStatsLocal.length===0?<div style={{color:"#ccc",fontSize:13}}>{t.noData}</div>:groupStatsLocal.map(function(g){return <div key={g.id} style={{marginBottom:12}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}><span style={{fontSize:13,fontWeight:500,color:textC}}>{g.name}</span><span style={{fontSize:13,fontWeight:500,color:textC}}>{fmt(g.total)}</span></div><div style={{background:dark?"#333":"#f5f5f5",borderRadius:4,height:8,marginBottom:4}}><div style={{background:g.color,height:8,borderRadius:4,width:(groupStatsLocal[0].total>0?g.total/groupStatsLocal[0].total*100:0)+"%"}}/></div>{canCategoryStats&&g.catBreakdown.map(function(c){return <button type="button" key={c.id} onClick={function(){openHistoryForStatsCategory(c);}} style={{width:"100%",display:"flex",justifyContent:"space-between",padding:"5px 4px 5px 12px",border:"none",background:"transparent",cursor:"pointer",textAlign:"left",borderRadius:7}}><span style={{fontSize:12,color:subC}}>{c.icon} {c.name}{(c.archived||c.deleted)?" [A]":""}</span><span style={{fontSize:12,color:subC,fontWeight:700}}>{fmt(c.total)} ›</span></button>;})}</div>;})} </div>
      </div>
      {canMonthlyCharts&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:8,color:subC}}>{L("Entrate vs Uscite")} — {titleLabel}</div><BarChart data={statsMonthlyTotals} width={isMobile?300:580} height={160}/></div>}
      {canMonthlyCharts&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:6,color:subC}}>{L("Saldo mensile")} — {titleLabel}</div><LineChart data={statsMonthlyTotals} width={isMobile?300:580} height={120} color={BALANCE_COLOR}/></div>}
      {canIncomeTypeStats&&incByType.length>0&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:500,marginBottom:10,color:subC}}>{L("Entrate per tipo —")} {titleLabel}</div><div style={{display:"flex",gap:14,alignItems:"center"}}><DonutChart data={incByType} size={100}/><div style={{flex:1}}>{incByType.map(function(d,i){return <div key={i} style={{display:"flex",alignItems:"center",gap:6,marginBottom:5}}><span style={{fontSize:20}}>{d.label}</span><span style={{fontSize:11,fontWeight:500,color:textC}}>{fmt(d.value)}</span></div>;})}</div></div></div>}
      <LockedPreviews tabName="general"/>
    </div>}

    {statsTab==="monthly"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      {canMonthlyCharts&&<>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}>
          <div style={{fontSize:15,fontWeight:900,color:textC,marginBottom:4}}>{L("Medie mensili")}</div>
          <div style={{fontSize:11,color:subC,marginBottom:14}}>{titleLabel+" · "+monthlyDivisor+" "+L("mesi considerati, inclusi quelli senza movimenti")}</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(3,1fr)",gap:10}}>
            <StatCard title={L("Entrate medie mensili")} value={fmt(monthlyAverageSummary[1].value)} color={incomeColor} bg={incomeColor+"22"}/>
            <StatCard title={L("Uscite medie mensili")} value={fmt(monthlyAverageSummary[0].value)} color={expenseColor} bg={expenseColor+"22"}/>
            <StatCard title={L("Saldo medio mensile")} value={fmt(monthlyAverageSummary[2].value)} color={BALANCE_COLOR} bg="#e8f4ff"/>
          </div>
        </div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:800,marginBottom:12,color:textC}}>{L("Entrate e Uscite medie mensili")}</div><BarChart data={[{label:L("Media mensile"),exp:monthlyAverageSummary[0].value,inc:monthlyAverageSummary[1].value}]} width={isMobile?300:580} height={150}/></div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:800,marginBottom:12,color:textC}}>{L("Saldo medio mensile")}</div><MonthlyValueRows items={[monthlyAverageSummary[2]]}/></div>
        <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr":"1fr 1fr",gap:14}}><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:800,marginBottom:12,color:textC}}>{L("Spesa media mensile per area")}</div><MonthlyValueRows items={monthlyAreaStats}/></div><div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:800,marginBottom:12,color:textC}}>{L("Spesa media mensile per categoria")}</div><MonthlyValueRows items={monthlyCategoryStats} limit={12}/></div></div>
        <div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:800,marginBottom:12,color:textC}}>{L("Entrata media mensile per tipo")}</div>{monthlyIncomeTypeStats.length?<MonthlyValueRows items={monthlyIncomeTypeStats}/>:<div style={{fontSize:13,color:subC,textAlign:"center",padding:"18px 0"}}>{L("Nessuna entrata nel periodo selezionato.")}</div>}</div>
        {budgetPlan&&budgetStats&&<>
          {canBudgetArea&&budgetGroupStats&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:12}}>{L("Spesa media mensile rispetto al budget per area")}</div><MonthlyBudgetRows items={budgetGroupStats.map(function(x){return{id:x.group.id,label:x.group.name,average:x.spent/monthlyDivisor,budget:x.budgeted,color:x.group.color};})}/></div>}
          {canBudgetCategory&&budgetStats&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:12}}>{L("Spesa media mensile rispetto al budget per categoria")}</div><MonthlyBudgetRows items={budgetStats.map(function(x){return{id:x.cat.id,label:(x.cat.icon?x.cat.icon+" ":"")+x.cat.name+(x.cat.archived?(" · "+L("Archiviata")):""),average:x.spent/monthlyDivisor,budget:x.budgeted,color:x.cat.color};}).sort(function(a,b){return b.average-a.average;})} limit={12}/></div>}
          {canBudgetCategoryDelta&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:16}}><div style={{fontSize:13,fontWeight:800,color:textC,marginBottom:12}}>{L("Scostamento medio mensile dal budget")}</div><MonthlyValueRows items={budgetStats.map(function(x){var value=x.budgeted-(x.spent/monthlyDivisor);return{id:x.cat.id,label:(x.cat.icon?x.cat.icon+" ":"")+x.cat.name+(x.cat.archived?(" · "+L("Archiviata")):""),value:value,color:value>=0?"#1D9E75":"#E24B4A"};}).sort(function(a,b){return Math.abs(b.value)-Math.abs(a.value);})} limit={12}/></div>}
        </>}
        {!budgetPlan&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20,textAlign:"center",fontSize:13,color:subC}}>{L("Configura un budget per visualizzare i grafici mensili rispetto al budget.")}</div>}
      </>}
      <LockedPreviews tabName="monthly"/>
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
        <LockedPreviews tabName="budget"/>
      </>}
    </div>}

    {statsTab==="saving"&&<div style={{display:"flex",flexDirection:"column",gap:16}}>
      {!budgetPlan&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:40,textAlign:"center",color:subC,fontSize:14}}>{L("Nessun budget configurato. Vai nella sezione Budget per impostarlo.")}</div>}
      {budgetPlan&&savingTrend&&<>
        {/* Attendibility score */}
        {attendibility&&<div style={{background:cardBg,borderRadius:14,border:"1px solid "+borderC,padding:20}}>
          <div style={{fontSize:15,fontWeight:700,color:textC,marginBottom:14}}>{L("📊 Attendibilità del risparmio —")} {titleLabel}</div>
          <div style={{display:"grid",gridTemplateColumns:isMobile?"1fr 1fr":"repeat(4,1fr)",gap:12,marginBottom:16}}>
            {canSavingAdvanced&&<StatCard title={L("Score attendibilità")} value={attendibility.score+"%"} color={attendibility.score>=70?"#1D9E75":attendibility.score>=40?"#EF9F27":"#E24B4A"} bg={attendibility.score>=70?"#e8f8f0":attendibility.score>=40?"#fff8e1":"#fff0f0"} sub={L("Mesi centrati")+": "+attendibility.hits+"/"+attendibility.total}/>}
            {canSavingAdvanced&&<StatCard title={L("Scostamento medio")} value={(attendibility.avgDiff>=0?"+":"")+fmt(attendibility.avgDiff)} color={attendibility.avgDiff>=0?"#1D9E75":"#E24B4A"} bg={attendibility.avgDiff>=0?"#e8f8f0":"#fff0f0"} sub={L("risparmio reale vs pianificato")}/>}
            <StatCard title={L("Risparmio pianificato")} value={fmt(budgetPlan.income&&budgetPlan.items?Math.max(0,(budgetPlan.income||0)-budgetPlan.items.reduce(function(a,i){return a+i.amount;},0)):0)} color="#7F77DD" bg="#f0f0ff" sub={L("mensile da budget")}/>
            {canSavingAdvanced&&<StatCard title={L("Trend")} value={attendibility.improving===null?"–":attendibility.improving?("📈 "+L("In miglioramento")):("📉 "+L("In peggioramento"))} color={attendibility.improving?"#1D9E75":"#E24B4A"} bg={attendibility.improving?"#e8f8f0":"#fff0f0"} sub={L("confronto prima/seconda metà anno")}/>}
          </div>
          <div style={{fontSize:12,color:subC,marginBottom:6}}>{L("Risparmio pianificato (tratteggiato viola) vs reale (barre) —")} {titleLabel}</div>
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
          <div style={{fontSize:13,fontWeight:600,color:textC,marginBottom:12}}>Dettaglio mensile — {titleLabel}</div>
          <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:12}}><thead><tr style={{background:dark?"#252535":"#f5f5f5"}}>{["Mese","Entrate","Uscite","Risparmio reale","Risparmio pianif.","Scostamento"].map(function(h){return <th key={h} style={{padding:"7px 10px",textAlign:"left",fontWeight:600,color:subC}}>{L(h)}</th>;})}</tr></thead><tbody>{savingTrend.map(function(m,i){if(!m.hasData)return null;var monthKey=m.key||savingTrendMonths[i];var mInc2=incomes.filter(function(inc){return inc.date&&inc.date.startsWith(monthKey);}).reduce(function(a,inc){return a+inc.amount;},0);var mExp2=expenses.filter(function(e){return e.date&&e.date.startsWith(monthKey);}).reduce(function(a,e){return a+e.amount;},0);return <tr key={i} style={{borderBottom:"1px solid "+(dark?"#333":"#f0f0f0"),background:m.real>=m.planned?(dark?"#1a2a1e22":"#f0faf5"):(dark?"#2a1a1a22":"#fff8f8")}}><td style={{padding:"7px 10px",fontWeight:500,color:textC}}>{m.label}</td><td style={{padding:"7px 10px",color:"#1D9E75"}}>{fmt(mInc2)}</td><td style={{padding:"7px 10px",color:"#E24B4A"}}>{fmt(mExp2)}</td><td style={{padding:"7px 10px",fontWeight:600,color:m.real>=0?"#1D9E75":"#E24B4A"}}>{fmt(m.real)}</td><td style={{padding:"7px 10px",color:"#7F77DD"}}>{fmt(m.planned)}</td><td style={{padding:"7px 10px",fontWeight:600,color:m.diff>=0?"#1D9E75":"#E24B4A"}}>{m.diff>=0?"+":""}{fmt(m.diff)}</td></tr>;})} </tbody></table></div>
        </div>}
      </>}
      <LockedPreviews tabName="saving"/>
    </div>}
  </div>;
}


// ── CONSULENTE AI ──────────────────────────────────────────────────────────
