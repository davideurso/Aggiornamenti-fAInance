import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFinancialForecast as forecast,shiftCivilDate} from '../src/finance/financialInsights.js';
const today='2026-10-22';
const history=()=>Array.from({length:90},(_,i)=>({id:'h'+i,date:shiftCivilDate(today,i-90),amount:10,catId:1,desc:'Ordinary '+i}));
const stable=()=>[7,8,9].map(m=>({date:'2026-0'+m+'-05',amount:100,catId:1,desc:'Donation'}));
test('ordinary history survives an unrelated recurrence in its category',()=>{
 const r=forecast({today,expenses:history(),recurring:[{id:'r',rtype:'expense',amount:50,catId:1,name:'Subscription',dayOfMonth:1}]});
 assert.equal(r.baseline.dailyVariableExpense,10);
 for(const [i,h] of r.horizons.entries()){assert.equal(h.knownExpense,50*(i+1));assert.equal(h.estimatedAdditionalExpense,10*h.days);assert.equal(h.estimatedChange,-10*h.days-50*(i+1));}
});
test('legacy generated recurring rows are removed individually, not their whole category',()=>{
 const recurring={id:'r',rtype:'expense',amount:50,catId:1,name:'Subscription',dayOfMonth:1};
 const expenses=history().concat([{date:'2026-08-01',amount:50,catId:1,desc:'Subscription'},{date:'2026-09-01',amount:50,catId:1,desc:'Subscription'}]);
 const r=forecast({today,expenses,recurring:[recurring]});assert.equal(r.baseline.dailyVariableExpense,10);assert.equal(r.horizons[0].knownExpense,50);
});
test('unrelated future payments and rules do not suppress fixed historical patterns',()=>{
 for(const extra of [{expenses:stable().concat([{date:'2026-11-10',amount:1,catId:1,desc:'Other recipient'}])},{recurring:[{id:'r',rtype:'expense',amount:50,catId:1,name:'Subscription',dayOfMonth:1}]}]){
  const r=forecast({today,expenses:stable(),...extra});assert.equal(r.horizons[0].inferredExpense,100);
 }
});
test('same real payment or recurrence replaces a historical hypothesis once',()=>{
 for(const extra of [{expenses:stable().concat([{date:'2026-11-05',amount:110,catId:1,desc:'Donation'}])},{recurring:[{id:'r',rtype:'expense',amount:100,catId:1,name:'Donation',dayOfMonth:5}]}]){
  const r=forecast({today,expenses:stable(),...extra});assert.equal(r.horizons[0].inferredExpense,0);
 }
});
test('ordinary future payments replace the overlapping horizon average in cents',()=>{
 for(const amount of [5,100,300,1000]){
  const r=forecast({today,expenses:history().concat([{date:'2026-11-01',amount,catId:1,desc:'Groceries'}])});
  for(const h of r.horizons){const independentlyExpected=Math.max(0,Math.round(h.days*10*100)-Math.round(amount*100))/100;assert.equal(h.estimatedAdditionalExpense,independentlyExpected);assert.equal(h.estimatedChange,-Math.max(h.days*10,amount));}
 }
});
test('a commitment outside a horizon cannot reduce that horizon estimate',()=>{
 const r=forecast({today,expenses:history().concat([{date:shiftCivilDate(today,31),amount:300,catId:1}])});
 assert.equal(r.horizons[0].knownExpense,0);assert.equal(r.horizons[0].estimatedAdditionalExpense,300);
 assert.equal(r.horizons[1].estimatedAdditionalExpense,300);
});
test('explicit exceptional and one-off future expenses stay additional to ordinary spending',()=>{
 for(const flag of ['oneOff','exceptional']){
  const r=forecast({today,expenses:history().concat([{date:'2026-11-01',amount:300,catId:1,[flag]:true}])});
  for(const h of r.horizons){assert.equal(h.estimatedAdditionalExpense,h.days*10);assert.equal(h.estimatedChange,-300-h.days*10);}
 }
});
test('marked historical exceptional expenses do not inflate ordinary baseline',()=>{
 for(const flag of ['oneOff','exceptional']){
  const r=forecast({today,expenses:history().concat([{date:'2026-09-01',amount:5000,catId:1,[flag]:true}])});
  assert.equal(r.baseline.dailyVariableExpense,10);
 }
});
test('internal transfer markers are excluded from both forecast directions',()=>{
 for(const marker of [{isTransfer:true},{transferId:'x'},{kind:'transfer'},{type:'giroconto'}]){
  const r=forecast({today,expenses:[{date:'2026-11-01',amount:300,...marker}],incomes:[{date:'2026-11-02',amount:200,...marker}]});
  assert.equal(r.horizons[0].knownExpense,0);assert.equal(r.horizons[0].knownIncome,0);
 }
});
test('excluded rules do not suppress eligible same-category history',()=>{
 const r=forecast({today,expenses:history(),recurring:[{id:'excluded',rtype:'expense',amount:50,catId:1,name:'Subscription',dayOfMonth:1,omit:true}],excludeExpense:r=>r.omit===true});
 assert.equal(r.baseline.dailyVariableExpense,10);assert.equal(r.horizons[0].knownExpense,0);
});
test('budget limits do not become expenses; inputs and missing cash balance remain unchanged',()=>{
 const input={today,expenses:history(),budgetPlan:{items:[{catId:1,amount:10000}]}},before=JSON.stringify(input);
 const r=forecast(input);assert.equal(JSON.stringify(input),before);assert.equal(r.openingLedgerBalance,null);
 assert.deepEqual(r.horizons,forecast({today,expenses:history()}).horizons);
});
test('leap-year, DST, today boundary, and exact horizon arithmetic reconcile',()=>{
 for(const date of ['2028-02-28','2026-03-28','2026-10-22','2026-12-31']){
  const expenses=Array.from({length:90},(_,i)=>({date:shiftCivilDate(date,i-90),amount:10,catId:1,desc:'Variable '+i}));
  expenses.push({date,amount:999,catId:1},{date:shiftCivilDate(date,30),amount:120,catId:1});
  const r=forecast({today:date,expenses});
  for(const h of r.horizons){assert.equal(h.date,shiftCivilDate(date,h.days));assert.equal(h.estimatedAdditionalExpense,h.days*10-120);assert.equal(h.knownExpense,120);assert.equal(h.ledgerBalance,null);assert.equal(Math.round(h.estimatedAdditionalExpense*100),r.daily.filter(d=>d.date<=h.date).reduce((s,d)=>s+d.additional,0));}
 }
});
test('rate, confirmed recurrence and excluded categories keep independent known totals',()=>{
 const r=forecast({today,expenses:[{id:'rate',date:'2026-10-01',amount:300,rateizzato:true,rate:3,catId:3},{date:'2026-11-05',amount:20,catId:2,recurringOccurrenceId:'r@2026-11-05'},{date:'2026-11-06',amount:999,catId:9}],recurring:[{id:'r',rtype:'expense',amount:20,catId:2,dayOfMonth:5}],excludeExpense:r=>r.catId===9});
 assert.equal(r.horizons[0].knownExpense,120);assert.equal(r.horizons[1].knownExpense,240);
});

test('recorded fixed and generated recurring payments never offset unrelated variable history',()=>{
 const expenses=history().concat(stable()).concat([{date:'2026-11-05',amount:100,catId:1,desc:'Donation'},{date:'2026-11-06',amount:50,catId:1,desc:'Subscription',recurringRuleId:'r',recurringOccurrenceDate:'2026-11-06'}]);
 const r=forecast({today,expenses,recurring:[{id:'r',rtype:'expense',amount:50,catId:1,name:'Subscription',dayOfMonth:6}]});
 assert.equal(r.horizons[0].knownExpense,150);
 assert.equal(r.horizons[0].estimatedAdditionalExpense,300);
});

test('same description and amount outside the scheduled date remain ordinary expense',()=>{
 const expenses=history().concat([{date:'2026-09-12',amount:50,catId:1,desc:'Subscription'}]);
 const r=forecast({today,expenses,recurring:[{id:'r',rtype:'expense',amount:50,catId:1,name:'Subscription',dayOfMonth:1}]});
 assert.equal(r.baseline.dailyVariableExpense,10.56);
});
