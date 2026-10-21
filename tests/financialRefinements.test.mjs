import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import vm from 'node:vm';
import {buildFinancialForecast as forecast,buildFinancialInsights as insights,resolveInsightRange as range} from '../src/finance/financialInsights.js';
const today='2026-10-21',categories=[{id:1,name:'Beneficenza'},{id:2,name:'Spesa'}];
const stable=[7,8,9].map(m=>({id:m,date:'2026-0'+m+'-05',amount:100,catId:1,desc:'Donazione'}));
function budget(rows,limit=100,settings){return insights({today,periodKey:'2026-10',periodSettings:settings,categories,expenses:rows,accessLevel:'full',budgetPlan:{items:[{catId:1,amount:limit}]}}).budgets[0];}
test('fixed charity at 90%, 100% or close to budget is not itself at risk',()=>{
 for(const limit of [100,101,110]){
  const b=budget([...stable,{date:'2026-10-05',amount:100,catId:1}],limit);
  assert.equal(b.risk,false);assert.equal(b.status,'WITHIN_LIMIT');assert.equal(b.estimatedAdditionalExpense,0);assert.equal(b.projectedExpense,100);
 }
 const due=budget(stable);assert.equal(due.projectedExpense,100);assert.equal(due.risk,false);
 const overdue=budget([...stable,{date:'2026-10-05',amount:101,catId:1}]);assert.equal(overdue.risk,true);assert.equal(overdue.status,'EXCEEDED');
});
test('new known commitment breaks a fixed budget and is not suppressed by its history',()=>{
 const b=budget([...stable,{date:'2026-10-05',amount:100,catId:1},{date:'2026-10-25',amount:20,catId:1}]);
 assert.equal(b.risk,true);assert.equal(b.status,'COMMITTED_OVER_LIMIT');assert.equal(b.projectedExpense,120);assert.equal(b.projectedOverrun,20);
 const tooLow=budget(stable,90);assert.equal(tooLow.status,'PROJECTED_OVER_LIMIT');assert.equal(tooLow.projectedOverrun,10);
});
test('missing or erratic months cannot classify a category as stable; no near-limit status invents risk',()=>{
 const b=budget([...stable.slice(1),{date:'2026-10-20',amount:90,catId:1}]);assert.equal(b.stableHistory,null);
 const short=budget([{date:'2026-10-20',amount:90,catId:1}]);assert.equal(short.risk,false);assert.equal(short.status,'INSUFFICIENT_DATA');
 const changing=budget(stable.map((r,i)=>({...r,amount:50+i*70})));assert.equal(changing.stableHistory,null);
});
test('stable classification follows fiscal periods and never treats an incomplete month as a complete sample',()=>{
 const rows=['2026-06-28','2026-07-28','2026-08-28'].map(date=>({date,amount:100,catId:1}));
 const b=budget([...rows,{date:'2026-09-28',amount:100,catId:1}],100,{mode:'financial',startDay:25});
 assert.equal(b.risk,false);assert.equal(b.stableHistory.typicalExpense,100);assert.equal(b.estimatedAdditionalExpense,0);
});
test('category labels recover snapshots and never fall back to timestamp IDs',()=>{
 const exp=[{date:'2026-10-02',amount:1000,catId:1792393927258},{date:'2026-10-03',amount:30,catId:'old',categoryNameSnapshot:'Beneficenza'}];
 const r=insights({today,expenses:exp,categories:[],accessLevel:'full',budgetPlan:{items:[{catId:1792393927258,amount:1100}]}});
 assert.equal(r.selectedPeriod.categories[0].category,'[CATEGORY_NAME_UNAVAILABLE]');assert.equal(r.selectedPeriod.categories[1].category,'Beneficenza');
 assert.equal(r.budgets[0].category,'[CATEGORY_NAME_UNAVAILABLE]');assert(!r.largestExpenses.some(x=>x.category==='1792393927258'));
});
test('month-on-month category increases compare matching elapsed days',()=>{
 const r=insights({today,periodKey:'2026-10',expenses:[{date:'2026-10-05',amount:100,catId:1},{date:'2026-09-05',amount:70,catId:1},{date:'2026-09-25',amount:500,catId:1}]});
 assert.equal(r.comparisonPeriod.end,'2026-09-21');assert.equal(r.categoryChanges[0].previousAmount,70);assert.equal(r.categoryChanges[0].delta,30);assert.equal(r.previousPeriod.expense,570);
 assert.equal(range('questo mese',today,'2026-08',{mode:'financial',startDay:25}).start,'2026-09-25');
 assert.equal(range('ultimi tre mesi',today,'2026-10',{mode:'calendar',startDay:1}).start,'2026-08-01');
});
test('unverified lifetime ledger cannot produce absolute forecast balances',()=>{
 const r=forecast({today,expenses:[{date:'2026-07-01',amount:100}],incomes:[{date:'2020-01-01',amount:125000},{date:'2026-11-01',amount:1500}]});
 assert.equal(r.openingLedgerBalance,null);for(const h of r.horizons){assert.equal(h.ledgerBalance,null);assert.equal(h.estimatedLedgerBalance,null);assert.equal(h.knownChange,1500);}
 assert.equal(r.horizons[0].estimatedChange,1500);
});
test('stable history expenses/income are explicit assumptions and do not duplicate recorded or explicit recurrences',()=>{
 const incomes=[7,8,9].map(m=>({date:'2026-0'+m+'-01',amount:2000,desc:'Stipendio'}));
 const r=forecast({today,expenses:stable,incomes,categories});
 assert.equal(r.horizons[0].inferredIncome,2000);assert.equal(r.horizons[0].inferredExpense,100);
 assert.equal(r.horizons[0].estimatedAdditionalExpense,0);assert.equal(r.horizons[0].estimatedChange,1900);
 assert.equal(r.horizons[0].knownIncome,0);assert.equal(r.horizons[0].knownExpense,0);
 const recorded=forecast({today,expenses:[...stable,{date:'2026-11-05',amount:110,catId:1,desc:'Donazione'}],incomes:[...incomes,{date:'2026-11-01',amount:2100,desc:'Stipendio'}]});
 assert.equal(recorded.horizons[0].inferredExpense,0);assert.equal(recorded.horizons[0].inferredIncome,0);
 const explicit=forecast({today,expenses:stable,incomes,recurring:[{id:'r',rtype:'expense',dayOfMonth:5,name:'Donazione',amount:100,catId:1},{id:'s',rtype:'income',dayOfMonth:1,name:'Stipendio',amount:2000}]});
 assert.equal(explicit.historicalPatterns.length,0);assert.equal(explicit.horizons[0].knownIncome,2000);assert.equal(explicit.horizons[0].knownExpense,100);
});
test('prudent scenario is reconciled, separate from central, and never more optimistic',()=>{
 const expenses=[{date:'2026-07-01',amount:300,catId:2},{date:'2026-08-01',amount:600,catId:2},{date:'2026-09-01',amount:900,catId:2}];
 const r=forecast({today,expenses,categories});
 for(const h of r.horizons){assert(h.prudentChange<=h.estimatedChange);assert.equal(h.estimatedChange,h.knownChange+h.inferredIncome-h.inferredExpense-h.estimatedAdditionalExpense);}
});
test('actual app state initializer always opens Home and resume state remains in-session',()=>{
 const source=fs.readFileSync('src/app.tsx','utf8'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let initializer;function visit(n){if(ts.isVariableDeclaration(n)&&ts.isArrayBindingPattern(n.name)&&n.name.elements[0]?.name?.getText(ast)==='tab')initializer=n.initializer;ts.forEachChild(n,visit);}visit(ast);
 assert(initializer);let captured;
 vm.runInNewContext(initializer.getText(ast),{useState:value=>(captured=typeof value==='function'?value():value)});
 assert.equal(captured,'home');
 assert(!source.includes('localStorage.setItem(userKey("resume_tab_v1")'));
});
