import test from 'node:test';
import assert from 'node:assert/strict';
import {buildSavingsForecast as forecast} from '../src/finance/savingsForecast.js';
const today='2026-10-23';
const fixture=()=>({today,incomes:[7,8,9].map(m=>({date:'2026-0'+m+'-01',amount:2500,type:'salary',desc:'Salary '+({7:'July',8:'August',9:'September'}[m])})),
 expenses:[7,8,9].map(m=>({date:'2026-0'+m+'-02',amount:2000,catId:1,desc:'Usual'}))});
test('observed savings of 500 give 500/1000/1500 without future records or arbitrary haircut',()=>{
 const input=fixture(),before=JSON.stringify(input),r=forecast(input);
 assert.equal(r.averageMonthlySavings,500);
 assert.deepEqual(r.horizons.map(h=>h.estimatedSavings),[500,1000,1500]);
 assert(r.horizons.every(h=>h.adjustment===0&&h.adjustments.length===0&&h.ledgerBalance===null));
 assert.equal(JSON.stringify(input),before);
});
test('actual mean, not salary labels, controls projection; current partial month is separate',()=>{
 const input=fixture();input.incomes.push({date:'2026-10-01',amount:1,type:'salary'});
 const r=forecast(input);assert.equal(r.current.net,1);assert.equal(r.averageMonthlySavings,500);
 assert.deepEqual(r.horizons.map(h=>h.estimatedSavings),[500,1000,1500]);
});
test('explicit exceptional future cost affects only horizons containing its actual date',()=>{
 const input=fixture();input.expenses.push({date:'2026-12-01',amount:200,catId:1,oneOff:true,desc:'Repair'});
 const r=forecast(input);assert.deepEqual(r.horizons.map(h=>h.estimatedSavings),[500,800,1300]);
 assert.equal(r.horizons[1].adjustments[0].reason,'EXPLICIT_EXCEPTIONAL');
});
test('normal recorded payment is already in the baseline and is never charged twice',()=>{
 const input=fixture();input.expenses.push({date:'2026-11-02',amount:2000,catId:1,desc:'Usual'});
 const r=forecast(input);assert.equal(r.horizons[0].estimatedSavings,500);assert.equal(r.horizons[0].adjustment,0);
});
test('concrete increase and reduction of regular expense replace only the historical amount',()=>{
 for(const [amount,result] of [[2200,300],[1800,700]]){
 const input=fixture();input.expenses.push({date:'2026-11-02',amount,catId:1,desc:'Usual'});
 const h=forecast(input).horizons[0];assert.equal(h.estimatedSavings,result);
 assert.equal(h.adjustments[0].historicalAmount,2000);assert.equal(h.adjustments[0].knownAmount,amount);
 }
});
test('missing future salary is not a loss; an explicitly recorded lower regular salary is a real change',()=>{
 const input=fixture();input.incomes=input.incomes.map(r=>({...r,desc:'Salary'}));
 assert.equal(forecast(input).horizons[0].estimatedSavings,500);
 input.incomes.push({date:'2026-11-01',amount:2300,type:'salary',desc:'Salary'});
 assert.equal(forecast(input).horizons[0].estimatedSavings,300);
});
test('new dated recurrence adds only actual due events; generated recorded occurrence is not duplicated',()=>{
 const input=fixture();input.recurring=[{id:'new',rtype:'expense',catId:2,name:'New subscription',amount:100,dayOfMonth:1,effectiveFrom:'2026-11-01'}];
 let r=forecast(input);assert.deepEqual(r.horizons.map(h=>h.estimatedSavings),[400,800,1200]);
 input.expenses.push({id:'generated',date:'2026-11-01',amount:100,catId:2,desc:'New subscription',recurringOccurrenceId:'new@2026-11-01'});
 r=forecast(input);assert.equal(r.horizons[0].adjustment,-100);
});
test('same-category ordinary commitments replace their allowance rather than duplicate it',()=>{
 const input=fixture();input.expenses.push({date:'2026-11-03',amount:2100,catId:1,desc:'Different description'});
 const h=forecast(input).horizons[0];assert.equal(h.adjustment,-100);assert.equal(h.estimatedSavings,400);
 assert.equal(h.adjustments[0].reason,'KNOWN_TOTAL_ABOVE_BASELINE');
});
test('a future known expense can legitimately exceed positive historical savings',()=>{
 const input=fixture();input.expenses.push({date:'2026-11-10',amount:1200,catId:2,desc:'New purchase'});
 const h=forecast(input).horizons[0];assert.equal(h.estimatedSavings,-700);assert.equal(h.adjustments.length,1);
});
test('transfers, excluded categories/types and deleted records never alter real savings or adjustments',()=>{
 const input=fixture();
 input.expenses.push({date:'2026-08-03',amount:9000,catId:4,isTransfer:true},{date:'2026-11-03',amount:9000,catId:4,isTransfer:true},
 {date:'2026-09-03',amount:9000,catId:3},{date:'2026-11-03',amount:9000,catId:3},{date:'2026-08-03',amount:9000,deleted:true});
 input.incomes.push({date:'2026-08-03',amount:9000,type:'excluded'},{date:'2026-11-03',amount:9000,type:'excluded'});
 input.excludeExpense=r=>r.catId===3;input.excludeIncome=r=>r.type==='excluded';
 assert.equal(forecast(input).horizons[0].estimatedSavings,500);
});
test('budgets are limits; actual installment amounts count once on the recorded date',()=>{
 const input=fixture();input.expenses[0]={...input.expenses[0],rateizzato:true,rate:12,rateDirection:'backward'};
 input.budgetPlan={items:[{catId:1,amount:90000}]};
 const r=forecast(input);assert.equal(r.monthlyHistory[0].expense,2000);assert.equal(r.averageMonthlySavings,500);
 assert.equal(r.horizons[0].adjustment,0);
});
test('three completed fiscal periods, not civil months or current partial period, define the sample',()=>{
 const input={today:'2026-10-23',periodSettings:{mode:'financial',startDay:25},
 incomes:['2026-06-26','2026-07-27','2026-08-27'].map(date=>({date,amount:2500,type:'s'})),
 expenses:['2026-06-28','2026-07-28','2026-08-28'].map(date=>({date,amount:2000,catId:1}))};
 const r=forecast(input);assert.deepEqual(r.monthlyHistory.map(p=>[p.key,p.start,p.end]),[
 ['2026-07','2026-06-25','2026-07-24'],['2026-08','2026-07-25','2026-08-24'],['2026-09','2026-08-25','2026-09-24']]);
 assert.equal(r.averageMonthlySavings,500);
});
test('short/missing history yields unavailable forecasts rather than invented zero or negative scenarios',()=>{
 const empty=forecast({today});assert.equal(empty.status,'N_D');assert(empty.horizons.every(h=>h.estimatedSavings===null));
 const short=fixture();short.incomes=short.incomes.slice(1);short.expenses=short.expenses.slice(1);
 assert.equal(forecast(short).status,'N_D');assert.throws(()=>forecast({today:'2026-02-30'}));
});
test('exact horizons cross year, leap dates and DST; cents reconcile with independent raw arithmetic',()=>{
 const input=fixture();input.today='2026-12-15';input.incomes=input.incomes.map((r,i)=>({...r,date:'2026-'+String(9+i).padStart(2,'0')+'-01',amount:1000.01+i*.01}));
 input.expenses=input.expenses.map((r,i)=>({...r,date:'2026-'+String(9+i).padStart(2,'0')+'-02',amount:700.02}));
 const r=forecast(input);assert.deepEqual(r.horizons.map(h=>h.date),['2027-01-14','2027-02-13','2027-03-15']);
 const expected=Math.round((input.incomes.reduce((n,x)=>n+Math.round(x.amount*100),0)-input.expenses.reduce((n,x)=>n+Math.round(x.amount*100),0))/3);
 assert.equal(r.averageMonthlySavings,expected/100);
 for(const h of r.horizons)assert.equal(Math.round(h.estimatedSavings*100),expected*h.days/30+h.adjustments.reduce((n,a)=>n+Math.round(a.amount*100),0));
 assert.deepEqual(forecast({...fixture(),today:'2028-02-01'}).horizons.map(h=>h.date),['2028-03-02','2028-04-01','2028-05-01']);
});

test('a known salary change is recognized despite changing monthly descriptions',()=>{
 const input=fixture();input.incomes.push({date:'2026-11-01',amount:2300,type:'salary',desc:'Salary November'});
 assert.equal(forecast(input).horizons[0].estimatedSavings,300);
});

test('signed future refunds and chargebacks adjust only their actual amount, not the usual payment',()=>{
 const input=fixture();input.expenses.push({date:'2026-11-02',amount:-100,catId:1,desc:'Usual'});
 input.incomes.push({date:'2026-11-01',amount:-50,type:'salary',desc:'Salary November'});
 const h=forecast(input).horizons[0];assert.equal(h.adjustment,50);assert.equal(h.estimatedSavings,550);
});

test('a second known income of the same type is additional, never a salary cut',()=>{
 const input=fixture();
 input.incomes.push({date:'2026-11-01',type:'salary',desc:'Salary November',amount:2500},
  {date:'2026-11-02',type:'salary',desc:'Second employer',amount:500});
 const h=forecast(input).horizons[0];assert.equal(h.adjustment,500);assert.equal(h.estimatedSavings,1000);
 const onlySecond=fixture();onlySecond.incomes.push({date:'2026-11-02',type:'salary',desc:'Second employer',amount:500});
 assert(forecast(onlySecond).horizons[0].estimatedSavings>=500,'an unmatched income cannot fabricate a lost salary');
});

test('split or additional payments from one source are compared as one completed-period total',()=>{
 for(const [parts,result] of [[[1000,1500],500],[[2500,500],1000]]){
  const input=fixture();parts.forEach((amount,i)=>input.incomes.push({date:'2026-11-0'+(i+1),type:'salary',desc:'Salary November',amount}));
  const h=forecast(input).horizons[0];assert.equal(h.estimatedSavings,result);
 }
 const input=fixture();input.expenses.push({date:'2026-11-02',catId:1,desc:'Usual',amount:2000},{date:'2026-11-03',catId:1,desc:'Usual',amount:2000});
 assert.equal(forecast(input).horizons[0].estimatedSavings,-1500,'two real bills exceed one usual monthly bill');
});
test('a recorded salary with a month label covers its pending recurrence exactly once',()=>{
 const input=fixture();input.incomes.push({date:'2026-11-01',type:'salary',desc:'Salary November',amount:2500});
 input.recurring=[{id:'salary',rtype:'income',incomeType:'salary',name:'Salary',amount:2500,dayOfMonth:1}];
 assert.equal(forecast(input).horizons[0].estimatedSavings,500);
});
