import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantSchedulesForApp} from '../src/finance/assistantSchedules.js';
import {itemAmountForMonth} from '../src/financeCalculations.js';
import {recurringMissingFields} from '../src/finance/recurringValidation.js';
import {recurringValidationMessage} from '../src/i18n/recurringValidation.js';
import {buildInstallmentRegistry} from '../src/finance/installmentRegistry.js';
const base={today:'2026-11-04',curMonthKey:'2026-11',aiDataAccess:'full',currency:'EUR',cats:[{id:'bills',name:'Utenze'}],methods:[{id:'card',name:'Carta principale'}],incomeTypes:[{id:'salary',name:'Stipendio'}]};
const rate={id:'rate',desc:'Computer',date:'2026-10-04',amount:100,rateizzato:true,rate:3,catId:'bills',methodId:'card'};
const rule={id:'salary',name:'Stipendio',rtype:'income',amount:1200,frequency:'monthly',dayOfMonth:0,effectiveFrom:'2026-01-01',incomeType:'salary',receivedInMethodId:'card'};
test('answers monthly installment income/expenses, with exact remainder and saved classifications',()=>{
 const r=assistantSchedulesForApp({...base,expenses:[rate],incomes:[{...rate,id:'income',desc:'Rimborso',amount:300,receivedInMethodId:'card',type:'salary'}]},'Qual è il totale delle rateizzazioni di questo mese?');
 assert.equal(r.status,'LOADED_DATA');assert.deepEqual(r.installments.currentPeriodTotals,{expense:33.33,income:100,count:2});
 assert.equal(r.installments.rows.find(x=>x.type==='expense').paymentMethod,'Carta principale');
 const dec=assistantSchedulesForApp({...base,expenses:[rate]},'rate dicembre 2026');assert.equal(dec.installments.requestedTotals.expense,33.34);
 const backwards=assistantSchedulesForApp({...base,expenses:[{...rate,date:'2026-12-04',rateDirection:'backward'}]},'rate ottobre 2026');assert.equal(backwards.installments.requestedTotals.expense,33.34);
});
test('date changes remove old allocations; deletion removes all contribution without stale cache',()=>{
 const c={...base,expenses:[{...rate,rate:1}]};
 assert.equal(assistantSchedulesForApp(c,'ottobre 2026').installments.requestedTotals.expense,100);
 c.expenses[0]={...c.expenses[0],date:'2026-11-05'};
 assert.equal(assistantSchedulesForApp(c,'ottobre 2026').installments.requestedTotals.expense,0);
 assert.equal(assistantSchedulesForApp(c,'novembre 2026').installments.requestedTotals.expense,100);
 c.expenses[0].deletedAt='2026-11-05T13:00:00Z';
 assert.equal(assistantSchedulesForApp(c,'novembre 2026').installments.requestedTotals.expense,0);
});
test('financial periods match the existing accounting engine, including backward allocation',()=>{
 for(const direction of ['forward','backward']){
  const settings={mode:'financial',startDay:15},row={...rate,date:'2026-11-30',rateDirection:direction};
  const r=assistantSchedulesForApp({...base,accountingPeriod:{settings},expenses:[row]},'questo mese');
  assert.equal(r.installments.currentPeriodTotals.expense,itemAmountForMonth(row,r.accountingPeriod.key,settings));
  assert.equal(r.installments.requestedTotals.expense,r.installments.currentPeriodTotals.expense);
 }
});
test('recurring last day, annual date, next income and confirmation/skip are separate',()=>{
 const r=assistantSchedulesForApp({...base,recurring:[rule,{...rule,id:'annual',name:'Premio',frequency:'annual',annualMonth:11,dayOfMonth:20,amount:500},
  {...rule,id:'confirmed',name:'Affitto',rtype:'expense',dayOfMonth:1,confirmed:['2026-11']},
  {...rule,id:'skipped',name:'Saltata',skippedOccurrences:['2026-11-30']} ]},'quali sono le entrate ricorrenti questo mese e le prossime?');
 const rows=r.recurring.requestedOccurrences.rows;assert.equal(rows.find(x=>x.ruleId==='salary').date,'2026-11-30');
 assert.equal(rows.find(x=>x.ruleId==='annual').date,'2026-11-20');assert.equal(rows.find(x=>x.ruleId==='confirmed').status,'confirmed');assert.equal(rows.find(x=>x.ruleId==='skipped').status,'skipped');
 assert.equal(r.recurring.requestedTotals.pending.income,1700);assert.equal(r.recurring.requestedTotals.pending.expense,0);
 assert.equal(r.recurring.upcoming.rows[0].name,'Premio');assert.equal(r.recurring.rules.rows[0].paymentMethod,'Carta principale');
});
test('generated recurring movement is confirmed once; future activation and leap dates are respected',()=>{
 const r=assistantSchedulesForApp({...base,incomes:[{id:'generated',date:'2026-11-30',amount:1200,recurringRuleId:'salary',recurringOccurrenceDate:'2026-11-30'}],recurring:[rule,{...rule,id:'future',effectiveFrom:'2028-05-01'}]},'questo mese');
 assert.equal(r.recurring.requestedTotals.pending.income,0);assert.equal(r.recurring.requestedTotals.confirmed.income,1200);
 assert.equal(r.recurring.rules.rows.find(x=>x.id==='future').nextOccurrence.date,'2028-05-31');
 const leap=assistantSchedulesForApp({...base,today:'2028-02-01',recurring:[{...rule,frequency:'annual',annualMonth:2,dayOfMonth:29}]},'febbraio 2028');
 assert.equal(leap.recurring.requestedOccurrences.rows[0].date,'2028-02-29');
});
test('all records contribute before detail limits; requested name survives truncation, duplicates/deleted excluded',()=>{
 const rows=Array.from({length:130},(_,i)=>({...rate,id:String(i),desc:'Computer '+i,date:'2026-11-01',amount:300}));
 const r=assistantSchedulesForApp({...base,expenses:[...rows,rows[0],{...rate,id:'deleted',deleted:true}]},'Computer 129 questo mese');
 assert.equal(r.installments.currentPeriodTotals.expense,13000);assert.equal(r.installments.totalCount,130);assert.equal(r.installments.omittedCount,50);
 assert(r.installments.rows.some(x=>x.name==='Computer 129'));
});
test('privacy and invalid ranges fail closed',()=>{
 for(const aiDataAccess of ['summary','areas',undefined])assert.deepEqual(assistantSchedulesForApp({...base,aiDataAccess,expenses:[rate],recurring:[rule]}),{status:'N_D',reason:'FULL_DATA_ACCESS_REQUIRED'});
 assert.equal(assistantSchedulesForApp(base,'2026-02-31').status,'N_D');
});
test('recurring validation requires name and day, retains last-day zero and all ten translations',()=>{
 const f={name:'Bolletta',amount:'55',catId:'bills',methodId:'card',frequency:'monthly',dayOfMonth:1};
 assert.deepEqual(recurringMissingFields(f,'EUR'),[]);assert.deepEqual(recurringMissingFields({...f,name:'  ',amount:'',dayOfMonth:''},'EUR'),['name','amount','day']);
 assert.deepEqual(recurringMissingFields({...f,dayOfMonth:0},'EUR'),[]);
 for(const lang of ['it','en','es','fr','de','pt','pl','nl','ro','el']){
  const message=recurringValidationMessage(lang,['name','amount','day']);assert(!message.includes('undefined'));assert(!message.includes('{fields}'));assert(message.length>40);
 }
});

test('annual detail includes carried allocations and exposes all twelve civil monthly totals',()=>{
 const expenses=[{...rate,id:'before',date:'2025-12-31'},
   {...rate,id:'after',date:'2027-01-31',rateDirection:'backward'},
   {...rate,id:'outside',date:'2024-01-31'}];
 const r=assistantSchedulesForApp({...base,expenses},'spese rateizzate dal 2026-01-01 al 2026-12-31');
 assert.equal(r.status,'LOADED_DATA');assert.equal(r.installments.rows.length,2);
 assert.equal(r.installments.detailScope,'requested_period');assert.equal(r.installments.knownRecordCount,3);
 assert.equal(r.installments.requestedRecordCount,2);assert.equal(r.installments.requestedInstallmentCount,4);
 assert.equal(r.installments.requestedTotals.expense,133.34);assert.equal(r.installments.requestedMonthlyTotals.length,12);
 assert.deepEqual(r.installments.requestedMonthlyTotals.map(row=>row.expense),[33.33,33.34,0,0,0,0,0,0,0,0,33.34,33.33]);
 const ui=buildInstallmentRegistry({expenses,year:2026,currency:'EUR'});
 assert.equal(r.installments.requestedTotals.expense,ui.summary.countedAnnualAmount);
 assert.deepEqual(r.installments.requestedMonthlyTotals.map(row=>row.expense),ui.summary.countedMonthlyAmounts);
});

test('excluded installments remain identifiable but never inflate the counted expense or income totals',()=>{
 const counted={...rate,date:'2026-11-04'},excluded={...counted,id:'excluded',catId:'excluded',amount:300};
 const c={...base,expenses:[counted,excluded],countedExpensesForAnalysis:[counted],
   incomes:[{...excluded,id:'income',type:'excluded'}],
   isExpenseExcludedFromTotals:row=>row.catId==='excluded',isIncomeExcludedFromTotals:row=>row.type==='excluded'};
 const r=assistantSchedulesForApp(c,'questo mese');
 assert.equal(r.installments.rows.length,3);assert.equal(r.installments.requestedExpenseCount,2);
 assert.deepEqual(r.installments.requestedTotals,{expense:33.33,income:0,count:1});
 assert.deepEqual(r.installments.requestedExcludedTotals,{expense:100,income:100,count:2});
 assert.deepEqual(r.installments.currentPeriodTotals,{expense:33.33,income:0,count:1});
 assert.equal(r.installments.requestedMonthlyTotals[0].excludedExpense,100);
 assert.equal(r.installments.rows.filter(row=>row.excludedFromTotals).length,2);
});

test('annual detail truncation is explicit while every amount and month remains complete',()=>{
 const expenses=Array.from({length:130},(_,i)=>({...rate,id:String(i),desc:'Computer '+i,date:'2026-01-31'}));
 const r=assistantSchedulesForApp({...base,expenses},'Computer 129 rate dal 2026-01-01 al 2026-12-31');
 assert.equal(r.installments.rows.length,80);assert.equal(r.installments.omittedCount,50);
 assert.equal(r.installments.requestedRecordCount,130);assert.equal(r.installments.requestedInstallmentCount,390);
 assert.equal(r.installments.requestedOmittedCount,50);assert.equal(r.installments.requestedInstallmentsOmittedCount,150);
 assert.equal(r.installments.requestedTotals.expense,13000);
 assert.deepEqual(r.installments.requestedMonthlyTotals.map(row=>row.expense),[4332.9,4332.9,4334.2,0,0,0,0,0,0,0,0,0]);
 assert(r.installments.rows.some(row=>row.name==='Computer 129'));
});

test('a long requested range declares omitted per-plan allocations independently of omitted movements',()=>{
 const r=assistantSchedulesForApp({...base,expenses:[{...rate,date:'2025-01-31',amount:300,rate:30}]},
   'rate dal 2025-01-01 al 2027-12-31');
 assert.equal(r.installments.requestedTotals.expense,300);assert.equal(r.installments.requestedRecordCount,1);
 assert.equal(r.installments.requestedInstallmentCount,30);assert.equal(r.installments.rows[0].requestedInstallments.length,24);
 assert.equal(r.installments.rows[0].requestedInstallmentsOmitted,6);
 assert.equal(r.installments.requestedOmittedCount,0);assert.equal(r.installments.requestedInstallmentsOmittedCount,6);
 assert.equal(r.installments.requestedMonthlyTotals.length,36);
});

test('stale deleted copies and conflicting duplicate IDs cannot produce a plausible complete total',()=>{
 const r=assistantSchedulesForApp({...base,expenses:[rate,{...rate,deletedAt:'2026-11-05'},
   {...rate,id:'conflict'},{...rate,id:'conflict',amount:300}]},'questo mese');
 assert.equal(r.installments.rows.length,0);assert.equal(r.installments.requestedTotals.expense,0);
 assert.equal(r.installments.invalidCount,1);assert.equal(r.installments.conflictCount,1);
 assert.equal(r.installments.accountCompletenessCertified,false);
});

test('schedule analysis leaves frozen source data untouched and preserves non-two-decimal amounts',()=>{
 const row=Object.freeze({...rate,amount:1.001,minorUnitDigits:3});
 const c=Object.freeze({...base,expenses:Object.freeze([row])});
 const r=assistantSchedulesForApp(c,'rate ottobre 2026');
 assert.equal(r.installments.requestedTotals.expense,.333);
 assert.equal(r.installments.rows[0].totalAmount,1.001);
 assert.equal(c.expenses[0],row);assert.equal(row.date,'2026-10-04');
});

test('annual comparisons use complete allocation years, including carried, backward, future and excluded quotes',()=>{
 const expenses=Object.freeze([
  {...rate,id:'carried',date:'2025-12-31'},
  {...rate,id:'backward',date:'2027-01-31',rateDirection:'backward'},
  {...rate,id:'previous-only',date:'2025-06-30',amount:40,rate:2},
  {...rate,id:'excluded-expense',date:'2025-12-15',amount:300,catId:'excluded'},
 ].map(Object.freeze));
 const incomes=Object.freeze([
  {...rate,id:'income',date:'2025-11-30',amount:90},
  {...rate,id:'excluded-income',date:'2026-01-15',amount:80,rate:2,rateDirection:'backward',type:'excluded'},
 ].map(Object.freeze));
 const c=Object.freeze({...base,today:'2026-01-02',curMonthKey:'2026-01',accountingPeriod:{settings:{mode:'financial',startDay:15}},
  expenses,incomes,isExpenseExcludedFromTotals:row=>row.catId==='excluded',isIncomeExcludedFromTotals:row=>row.type==='excluded'});
 const result=assistantSchedulesForApp(c,'Confronta le spese rateizzate 2026 vs 2025');
 assert.equal(result.status,'LOADED_DATA');
 const r=result.installments;
 assert.equal(result.requestedPeriod.start,'2026-01-01');assert.equal(result.requestedPeriod.end,'2026-12-31');
 assert.deepEqual(r.comparisonPeriod,{start:'2025-01-01',end:'2025-12-31'});
 assert.deepEqual(r.requestedTotals,{expense:133.34,income:30,count:3});
 assert.deepEqual(r.comparisonTotals,{expense:73.33,income:60,count:3});
 assert.deepEqual(r.requestedExcludedTotals,{expense:200,income:40,count:2});
 assert.deepEqual(r.comparisonExcludedTotals,{expense:100,income:40,count:2});
 assert.equal(r.requestedRecordCount,5);assert.equal(r.requestedInstallmentCount,8);
 assert.equal(r.comparisonRecordCount,5);assert.equal(r.comparisonExpenseCount,3);assert.equal(r.comparisonIncomeCount,2);
 assert.equal(r.comparisonInstallmentCount,7);
 assert.deepEqual(r.comparisonDelta,{basis:'REQUESTED_MINUS_COMPARISON',expense:60.01,income:-30,
  countedRecordCount:0,recordCount:0,installmentCount:1,excludedExpense:100,excludedIncome:0,excludedRecordCount:0});
 assert.equal(r.comparisonMonthlyTotals.length,12);
 assert.deepEqual(r.comparisonMonthlyTotals.map(row=>row.month),Array.from({length:12},(_,i)=>'2025-'+String(i+1).padStart(2,'0')));
 assert.deepEqual(r.comparisonMonthlyTotals.map(row=>row.expense),[0,0,0,0,0,20,20,0,0,0,0,33.33]);
 assert.deepEqual(r.comparisonMonthlyTotals.map(row=>row.income),[0,0,0,0,0,0,0,0,0,0,30,30]);
 assert.deepEqual(r.requestedMonthlyTotals.map(row=>row.expense),[33.33,33.34,0,0,0,0,0,0,0,0,33.34,33.33]);
 assert.equal(r.comparisonMonthlyTotals[11].excludedExpense,100);assert.equal(r.comparisonMonthlyTotals[11].excludedIncome,40);
 assert.equal(r.comparisonDetailScope,'summary_only');assert.equal(r.comparisonOmittedCount,5);assert.equal(r.comparisonInstallmentsOmittedCount,7);
 assert(!r.rows.some(row=>row.id==='expense:previous-only'));
 const primary=assistantSchedulesForApp(c,'spese rateizzate 2026').installments;
 for(const field of ['rows','requestedTotals','requestedExcludedTotals','requestedMonthlyTotals','requestedRecordCount','requestedInstallmentCount'])assert.deepEqual(r[field],primary[field]);
 assert.equal(c.expenses,expenses);assert.equal(c.incomes,incomes);assert.equal(expenses[0].date,'2025-12-31');
});

test('comparison evidence is null when no comparison period was requested',()=>{
 const r=assistantSchedulesForApp({...base,expenses:[rate]},'rate 2026').installments;
 for(const field of ['comparisonPeriod','comparisonTotals','comparisonExcludedTotals','comparisonRecordCount',
  'comparisonExpenseCount','comparisonIncomeCount','comparisonInstallmentCount','comparisonMonthlyTotals',
  'comparisonDelta','comparisonDetailScope','comparisonOmittedCount','comparisonInstallmentsOmittedCount'])assert.equal(r[field],null,field);
 assert.equal(r.requestedTotals.expense,100);
});

test('a resolved comparison with no loaded allocations reports zero coverage totals, not absent comparison',()=>{
 const r=assistantSchedulesForApp({...base,expenses:[rate]},'rate 2026 vs 2025').installments;
 assert.deepEqual(r.comparisonTotals,{expense:0,income:0,count:0});assert.equal(r.comparisonRecordCount,0);
 assert.equal(r.comparisonInstallmentCount,0);assert.equal(r.comparisonOmittedCount,0);
 assert.equal(r.comparisonMonthlyTotals.length,12);assert(r.comparisonMonthlyTotals.every(row=>row.expense===0&&row.income===0));
 assert.equal(r.comparisonDelta.expense,100);assert.equal(r.comparisonDelta.recordCount,1);
 assert.equal(r.accountCompletenessCertified,false);
 const reverse=assistantSchedulesForApp({...base,expenses:[rate]},'rate 2025 vs 2026').installments;
 assert.equal(reverse.requestedRecordCount,0);assert.equal(reverse.comparisonRecordCount,1);
 assert.equal(reverse.comparisonDelta.expense,-100);assert.equal(reverse.comparisonDelta.installmentCount,-3);
});

test('comparison totals are complete before primary row truncation and declare withheld comparison details',()=>{
 const expenses=Array.from({length:130},(_,i)=>({...rate,id:String(i),desc:'Computer '+i,date:'2025-12-31'}));
 const r=assistantSchedulesForApp({...base,expenses},'rate 2026 vs 2025').installments;
 assert.equal(r.rows.length,80);assert.equal(r.requestedOmittedCount,50);
 assert.equal(r.requestedTotals.expense,8667.1);assert.equal(r.comparisonTotals.expense,4332.9);
 assert.equal(r.comparisonDelta.expense,4334.2);assert.equal(r.comparisonRecordCount,130);
 assert.equal(r.comparisonInstallmentCount,130);assert.equal(r.comparisonMonthlyTotals[11].expense,4332.9);
 assert.equal(r.comparisonMonthlyTotals[11].recordCount,130);assert.equal(r.comparisonMonthlyTotals[11].installmentCount,130);
 assert.equal(r.comparisonOmittedCount,130);assert.equal(r.comparisonInstallmentsOmittedCount,130);
 assert.equal(r.comparisonDetailScope,'summary_only');
});
