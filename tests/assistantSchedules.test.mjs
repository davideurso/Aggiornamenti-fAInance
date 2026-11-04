import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantSchedulesForApp} from '../src/finance/assistantSchedules.js';
import {itemAmountForMonth} from '../src/financeCalculations.js';
import {recurringMissingFields} from '../src/finance/recurringValidation.js';
import {recurringValidationMessage} from '../src/i18n/recurringValidation.js';
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
