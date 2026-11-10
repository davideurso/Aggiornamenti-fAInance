import test from 'node:test';
import assert from 'node:assert/strict';
import {buildFinancialForecast as forecast,shiftCivilDate} from '../src/finance/financialInsights.js';
import {forecastPrudentBreakdown} from '../src/finance/forecastPresentation.js';
const today='2026-10-22';
const salaries=()=>[
 {date:'2026-07-27',type:'salary',desc:'Stipendio',amount:2400},
 {date:'2026-08-27',type:'salary',desc:'Stipendio Agosto',amount:2600},
 {date:'2026-09-25',type:'salary',desc:'Stipendio Settembre',amount:2500},
];
const history=()=>[{date:'2026-07-01',catId:99,amount:1,oneOff:true},...Array.from({length:90},(_,i)=>({date:shiftCivilDate(today,i-90),catId:1,desc:'Expense '+i,amount:10}))];
test('varying monthly pay and month suffixes remain one observed source',()=>{
 const input={today,incomes:salaries(),expenses:history()},before=JSON.stringify(input),f=forecast(input);
 assert.equal(f.historicalPatterns.filter(p=>p.kind==='income').length,1);
 assert.equal(f.historicalPatterns[0].amount,2500);
 assert.equal(f.historicalPatterns[0].minimumAmount,2400);
 assert.equal(f.historicalPatterns[0].maximumAmount,2600);
 for(const [i,h] of f.horizons.entries()){
  assert.equal(h.inferredIncome,2500*(i+1));assert.equal(h.inferredPrudentIncome,2400*(i+1));
  assert.equal(h.estimatedChange,2200*(i+1));assert.equal(h.incomeHypotheses.length,i+1);
  assert.equal(forecastPrudentBreakdown(h).excludedIncome,100*(i+1));
 }
 assert.equal(JSON.stringify(input),before);
});
test('recorded pay with a new month label replaces the same hypothesis exactly once',()=>{
 const f=forecast({today,incomes:[...salaries(),{date:'2026-10-27',type:'salary',desc:'Stipendio Ottobre',amount:2550}],expenses:history()});
 assert.equal(f.horizons[0].knownIncome,2550);assert.equal(f.horizons[0].inferredIncome,0);
 assert.equal(f.horizons[1].inferredIncome,2500);
});
test('scheduled income of the same type and source covers the hypothesis',()=>{
 const f=forecast({today,incomes:salaries(),expenses:history(),recurring:[{id:'s',rtype:'income',incomeType:'salary',name:'Stipendio Ottobre',amount:2500,dayOfMonth:27}]});
 assert.equal(f.horizons[0].knownIncome,2500);assert.equal(f.horizons[0].inferredIncome,0);
});
test('unrelated income with the same text but another income type cannot cover salary',()=>{
 const f=forecast({today,incomes:[...salaries(),{date:'2026-10-27',type:'gift',desc:'Stipendio Ottobre',amount:20}],expenses:history()});
 assert.equal(f.horizons[0].knownIncome,20);assert.equal(f.horizons[0].inferredIncome,2500);
});
test('excluded or exceptional income cannot become a recurring income hypothesis',()=>{
 for(const extra of [{excludeIncome:r=>r.type==='salary'},{incomes:salaries().map(r=>({...r,oneOff:true}))},{incomes:salaries().map(r=>({...r,exceptional:true}))}]){
 const f=forecast({today,incomes:salaries(),expenses:history(),...extra});assert.equal(f.horizons[0].inferredIncome,0);
 }
});
test('missing months, multiple payments and erratic dates do not invent a regular source',()=>{
 for(const incomes of [salaries().slice(1),salaries().concat({date:'2026-09-26',type:'salary',desc:'Stipendio',amount:20}),salaries().map((r,i)=>({...r,date:r.date.slice(0,8)+(5+i*10)}))]){
 const f=forecast({today,incomes,expenses:history()});assert.equal(f.horizons[0].inferredIncome,0);
 }
});
test('same description and distinct types remain two independent sources',()=>{
 const incomes=salaries().flatMap(r=>[r,{...r,type:'second',amount:r.amount/2}]);
 const f=forecast({today,incomes,expenses:history()});assert.equal(f.horizons[0].inferredIncome,3750);
 assert.equal(f.historicalPatterns.filter(p=>p.kind==='income').length,2);
});
test('month/year suffixes normalize but different employers do not merge',()=>{
 const incomes=salaries().map((r,i)=>({...r,desc:['Employer July 2026','Employer August 2026','Employer September 2026'][i]}));
 assert.equal(forecast({today,incomes,expenses:history()}).horizons[0].inferredIncome,2500);
 incomes[2].desc='Another employer September 2026';
 assert.equal(forecast({today,incomes,expenses:history()}).horizons[0].inferredIncome,0);
});
test('fixed expense stability keeps its amount criterion; no optimistic force-positive rule',()=>{
 const f=forecast({today,incomes:salaries(),expenses:history().concat({date:'2026-10-30',catId:3,amount:5000,oneOff:true})});
 assert(f.horizons[0].estimatedChange<0);
 const expenses=[7,8,9].map((m,i)=>({date:'2026-0'+m+'-05',catId:2,amount:100+i*100,desc:'Changing expense'}));
 assert.equal(forecast({today,incomes:salaries(),expenses}).historicalPatterns.filter(p=>p.kind==='expense').length,0);
});
