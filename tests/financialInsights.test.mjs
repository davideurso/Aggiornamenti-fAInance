import {buildSavingsForecast} from '../src/finance/savingsForecast.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import {buildFinancialForecast as forecast, buildFinancialInsights as insights, resolveInsightRange as range, shiftCivilDate, financialInsightsForApp} from '../src/finance/financialInsights.js';
import {buildFinancialCalendar} from '../src/finance/financialCalendar.js';
const today='2026-10-21', settings={mode:'calendar',startDay:1};
const category=[{id:1,name:'Spese variabili'},{id:2,name:'Abbonamenti'},{id:3,name:'Rate'}];
const fixture=()=>({today,currency:'EUR',categories:category,
  expenses:[{id:'variable',date:'2026-09-21',amount:90,catId:1},{id:'installment',date:'2026-10-01',amount:300,rateizzato:true,rate:3,catId:3},
    {id:'future',date:'2026-10-25',amount:5,catId:1}],
  incomes:[{id:'salary',date:'2026-10-01',amount:2000}],
  recurring:[{id:'salary-r',rtype:'income',name:'Salario',amount:1000,dayOfMonth:1,effectiveFrom:'2026-11-01'},
    {id:'subscription',rtype:'expense',name:'Abbonamento',amount:100,catId:2,dayOfMonth:5,effectiveFrom:'2026-11-01'}]});
test('30/60/90 uses exact civil dates across DST, leap days and year changes',()=>{
  const f=forecast(fixture());
  assert.deepEqual(f.horizons.map(x=>[x.days,x.date]),[[30,'2026-11-20'],[60,'2026-12-20'],[90,'2027-01-19']]);
  assert.equal(shiftCivilDate('2028-02-28',1),'2028-02-29');
  assert.equal(shiftCivilDate('2026-03-28',2),'2026-03-30');
  assert.equal(shiftCivilDate('2026-12-31',1),'2027-01-01');
});
test('future schedule, installments, variable overlap and ledger reconcile to exact cents',()=>{
  const f=forecast(fixture()),r=f.horizons[0];
  assert.equal(f.openingLedgerBalance,null);assert.equal(f.historicalLedgerNet,1810);
  assert.equal(f.baseline.observationDays,30);
  assert.equal(f.baseline.dailyVariableExpense,3);
  assert.equal(r.knownIncome,1000);
  assert.equal(r.knownExpense,205);
  assert.equal(r.estimatedAdditionalExpense,85);
  assert.equal(r.ledgerBalance,null);assert.equal(r.knownChange,795);
  assert.equal(r.estimatedLedgerBalance,null);assert.equal(r.estimatedChange,710);
  for(const h of f.horizons) {
    const days=f.daily.filter(x=>x.date<=h.date);
    assert.equal(Math.round(h.knownChange*100),days.reduce((n,d)=>n+d.knownIncome-d.knownExpense,0));
    assert.equal(Math.round((h.knownChange+h.inferredIncome-h.inferredExpense-h.estimatedAdditionalExpense)*100),Math.round(h.estimatedChange*100));
  }
});
test('calendar and forecast use identical recorded/planned entries, without mutating inputs',()=>{
  const input=fixture(),before=JSON.stringify(input),f=forecast(input);
  const november=buildFinancialCalendar({...input,month:'2026-11'});
  const expected=november.days.filter(d=>d.date<=f.horizons[0].date).flatMap(d=>d.entries);
  const actual=f.daily.filter(d=>d.date.startsWith('2026-11')&&d.date<=f.horizons[0].date).flatMap(d=>d.entries);
  assert.deepEqual(actual,expected);assert.equal(JSON.stringify(input),before);
});
test('today recorded rows are counted only in opening, pending recurrence today once',()=>{
  const f=forecast({today,expenses:[{id:'a',date:today,amount:20,catId:1}],recurring:[{id:'b',rtype:'expense',name:'R',dayOfMonth:21,amount:10,catId:2}]});
  assert.equal(f.historicalLedgerNet,-20);assert.equal(f.openingLedgerBalance,null);
  assert.equal(f.horizons[0].knownExpense,10); // pending Oct 21 only; Nov 21 is outside Nov 20
});
test('confirmed, skipped, generated, deleted and not-yet-effective recurrences do not duplicate',()=>{
  const f=forecast({today,expenses:[{date:'2026-11-05',amount:20,catId:2,desc:'R',recurringOccurrenceId:'r@2026-11-05'}],recurring:[
    {id:'r',rtype:'expense',dayOfMonth:5,amount:20,name:'R',catId:2},
    {id:'skip',rtype:'expense',dayOfMonth:7,amount:99,skipped:['2026-11']},
    {id:'confirmed',rtype:'expense',dayOfMonth:8,amount:99,confirmed:['2026-11']},
    {id:'gone',rtype:'expense',dayOfMonth:6,amount:999,deleted:true},
    {id:'later',rtype:'expense',dayOfMonth:6,amount:999,effectiveFrom:'2027-02-01'}]});
  assert.equal(f.horizons[0].knownExpense,20);
});
test('short history and missing opening are unavailable, not invented zero balances',()=>{
  const empty=forecast({today});assert.equal(empty.status,'N_D');assert.equal(empty.horizons[0].ledgerBalance,null);
  const future=forecast({today,incomes:[{date:'2026-11-01',amount:100}]});
  assert.equal(future.horizons[0].knownChange,100);assert.equal(future.horizons[0].ledgerBalance,null);
  const short=forecast({today,expenses:[{date:'2026-10-20',amount:100,catId:1}]});
  assert.equal(short.horizons[0].estimatedAdditionalExpense,null);
});
test('legacy recurring categories are not counted again as variable averages',()=>{
  const f=forecast({today,expenses:[{date:'2026-09-01',amount:50,catId:2,desc:'R'}],recurring:[{id:'r',rtype:'expense',dayOfMonth:1,amount:50,catId:2,name:'R'}]});
  assert.equal(f.baseline.dailyVariableExpense,0);assert.equal(f.horizons[0].estimatedAdditionalExpense,0);
  assert.equal(f.horizons[0].knownExpense,50);
});
test('all loaded rows are aggregated before any UI/AI display limit; future, invalid and deleted are separate',()=>{
  const rows=Array.from({length:1200},(_,i)=>({id:i,date:'2026-10-02',amount:'0,01',catId:1}));
  rows.push({date:'2026-10-25',amount:900,catId:1},{date:'2026-02-30',amount:999},{date:'2026-10-02',amount:999,deleted:true});
  const r=insights({today,periodKey:'2026-10',expenses:rows,categories:category,question:'2026-10'});
  assert.equal(r.requestedPeriod.expense,12);assert.equal(r.requestedPeriod.expenseCount,1200);
  assert.equal(r.requestedPeriod.futureRecordedExpense,900);assert.equal(r.coverage.invalidExpenseRows,1);
});
test('explicit inclusive ISO and European date ranges, invalid dates and ambiguous day/month requests',()=>{
  assert.deepEqual(range('dal 2026-09-01 al 2026-09-30',today,'2026-10',settings),{status:'VALID',basis:'explicit_dates',start:'2026-09-01',end:'2026-09-30'});
  assert.equal(range('dal 01/09/2026 al 15/09/2026',today,'2026-10',settings).end,'2026-09-15');
  for(const q of ['2026-02-30','2026-13','2026-10-21 e 2026-10-20','dal 1 al 15 settembre'])
    assert.equal(range(q,today,'2026-10',settings).status,'N_D',q);
  assert.equal(range('ultimi 30 giorni',today,'2026-10',settings).start,'2026-09-22');
});
test('named month pairs inherit explicit year, fiscal month respects agreed second-half naming',()=>{
  const r=range('agosto e settembre 2025',today,'2026-10',settings);
  assert.equal(r.start,'2025-08-01');assert.equal(r.end,'2025-09-30');
  const fiscal=range('ottobre 2026',today,'2026-10',{mode:'financial',startDay:27});
  assert.equal(fiscal.start,'2026-09-27');assert.equal(fiscal.end,'2026-10-26');
});
test('category deltas include disappeared categories and avoid division by zero',()=>{
  const r=insights({today,periodKey:'2026-10',categories:category,expenses:[
    {date:'2026-09-01',amount:50,catId:2},{date:'2026-10-01',amount:20,catId:1}]});
  assert.equal(r.categoryChanges.find(x=>x.categoryId==='2').delta,-50);
  assert.equal(r.categoryChanges.find(x=>x.categoryId==='1').percentage,null);
});
test('full data gets budget version/override, exact residual and projected overrun without adding budget as a cost',()=>{
  const input=fixture(),r=insights({...input,accessLevel:'full',periodKey:'2026-10',budgetPlan:{items:[{catId:1,amount:1000}]},
    financeEvolution:{budget:{overrides:{'2026-10':{items:[{catId:1,amount:20},{catId:3,amount:500}]}}}}});
  const b=r.budgets.find(x=>x.categoryId==='1');
  assert.equal(b.budget,20);assert.equal(b.spent,0);assert.equal(b.committedExpense,5);
  assert.equal(b.remainingAfterCommitments,15);assert.equal(b.projectedExpense,30);assert.equal(b.projectedOverrun,10);
  assert.equal(r.budgets.find(x=>x.categoryId==='3').committedExpense,0,'past purchase already counted at full actual date');
  assert.deepEqual(r.forecast.horizons,buildSavingsForecast(input).horizons,'budget is not a second expense');
});
test('privacy: summary/areas emit no income, balance, budget, description or profile values',()=>{
  const secret='PRIVATE_SENTINEL';
  for(const accessLevel of ['summary','areas']) {
    const r=insights({...fixture(),accessLevel,budgetPlan:{items:[{catId:1,amount:987654}]},
      incomes:[{date:today,amount:123456,desc:secret}],
      expenses:[{date:today,amount:12,catId:1,desc:secret,methodName:secret}],profile:{name:secret}});
    const json=JSON.stringify(r);assert(!json.includes(secret));assert(!json.includes('123456'));assert(!json.includes('987654'));
    assert(!('forecast' in r));assert(!('budgets' in r));assert(!('largestExpenses' in r));assert(!('income' in r.selectedPeriod));
  }
  const c={today,aiDataAccess:'summary',expenses:[],cats:[]};
  Object.defineProperty(c,'incomes',{get(){throw Error('Hidden source must not be accessed');}});
  assert.doesNotThrow(()=>financialInsightsForApp(c));
});
test('excluded expenses/incomes are absent from forecast, including scheduled recurrences',()=>{
  const f=forecast({...fixture(),expenses:[{date:today,amount:9999,catId:9}],incomes:[],
    recurring:[{id:'hidden',rtype:'expense',dayOfMonth:1,amount:9999,catId:9}],excludeExpense:r=>r.catId===9});
  assert.equal(f.status,'N_D');
});
test('fractional installments preserve exact total cents',()=>{
  const f=forecast({today:'2026-09-01',expenses:[{id:1,date:'2026-09-02',amount:100,rateizzato:true,rate:3}]});
  const total=f.daily.flatMap(d=>d.entries).reduce((n,e)=>n+e.cents,0);
  assert.equal(total,-10000);
});
test('recorded negative balances keep their sign; source values are not repaired or modified',()=>{
  const input={today,expenses:[{date:'2026-09-01',amount:200}]},before=JSON.stringify(input);
  const f=forecast(input);assert(f.historicalLedgerNet<0);assert.equal(f.horizons[0].ledgerBalance,null);assert.equal(JSON.stringify(input),before);
});
test('actual assistant context builders attach insights for typed, advice and per-turn realtime requests',()=>{
  const source=fs.readFileSync('src/sezioni.tsx','utf8'),ast=ts.createSourceFile('s.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),found={};
  function visit(n){if(ts.isFunctionDeclaration(n)&&['buildContext','buildAIContext','realtimeTurnDirective'].includes(n.name?.text))found[n.name.text]=n;ts.forEachChild(n,visit);}visit(ast);
  for(const name of ['buildContext','buildAIContext']) {
    const text=found[name].getText(ast);
    assert(text.includes('financialInsightsForApp('));
    const ctxNode=found[name].body.statements.find(n=>ts.isExpressionStatement(n)&&n.getText(ast).includes('ctx.financialInsights ='));
    assert(ctxNode);
    let captured;
    const code=ts.transpileModule(ctxNode.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
    const context={ctx:{},question:'2026-09',todayStr:()=>today,financialInsightsForApp:(c,q)=>(captured={c,q},{verified:true}),c:{aiDataAccess:'full'},_c:{aiDataAccess:'areas'}};
    vm.runInNewContext(code,context);
    assert.equal(captured.q,'2026-09');assert.equal(captured.c.today,today);assert.equal(context.ctx.financialInsights.verified,true);
  }
  assert(found.realtimeTurnDirective.getText(ast).includes('financialInsightsForApp('));
  assert(source.includes('financeContext:buildContext(q)'));assert(source.includes('context: buildAIContext(q)'));
});
console.log('Read-only financial insights: deterministic calculations, privacy, coverage, budget and real integration checks.');

test('advice payload uses the backend financeContext contract and the selected read level',async()=>{
 const output=ts.transpileModule(fs.readFileSync('src/assistantLogic.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const box={exports:{}};vm.runInNewContext(output,box);
 const context={financialInsights:{schema:1,marker:'LOCAL_CALCULATION'},dataAccessLevel:'full'};
 const request=box.exports.buildFinanceAdviceRequestPayload({question:'Quanto spenderò?',context,forcedLanguage:'it'});
 assert.equal(request.aiDataAccess,'full');
 assert.deepEqual(JSON.parse(JSON.stringify(request.financeContext)),JSON.parse(JSON.stringify(request.context)));
 assert.equal(request.financeContext.financialInsights.marker,'LOCAL_CALCULATION');
 assert(request.instruction.includes('authoritative local calculation'));
});
test('bounded transport retains exact requested category and marks omitted categories',()=>{
 const cats=Array.from({length:100},(_,i)=>({id:i,name:'Categoria '+i}));
 const exp=cats.flatMap(cat=>Array.from({length:13},(_,i)=>({date:'2026-'+String(Math.max(1,10-i)).padStart(2,'0')+'-01',amount:cat.id+1,catId:cat.id})));
 const r=financialInsightsForApp({today,curMonthKey:'2026-10',aiDataAccess:'summary',expenses:exp,cats},'Categoria 99 ottobre 2026');
 assert(r.requestedPeriod.categories.some(x=>x.category==='Categoria 99'));
 assert(r.requestedPeriod.categoriesOmitted>0);assert(JSON.stringify(r).length<60000);
});
test('comparison requests keep the two periods separate, without treating them as one sum',()=>{
 const r=insights({today,periodKey:'2026-10',question:'ottobre 2026 rispetto settembre 2026',expenses:[
  {date:'2026-10-02',amount:20,catId:1},{date:'2026-09-02',amount:10,catId:1}]});
 assert.equal(r.requestedPeriod.expense,20);assert.equal(r.requestedComparison.expense,10);assert.equal(r.requestedExpenseDelta,10);
});
test('iOS guard is registered by the actual storyboard controller and collection defaults to disabled',()=>{
 const swift=fs.readFileSync('ios/App/App/FainanceAnalyticsGuardPlugin.swift','utf8');
 assert(swift.includes('FirebaseApp.app()?.options.projectID'));assert(swift.includes('Bundle.main.bundleIdentifier'));
 assert(swift.includes('bridge?.registerPluginInstance(FainanceAnalyticsGuardPlugin())'));
 const storyboard=fs.readFileSync('ios/App/App/Base.lproj/Main.storyboard','utf8');
 assert(storyboard.includes('FainanceAnalyticsViewController'));
 const info=fs.readFileSync('ios/App/App/Info.plist','utf8');
 assert(/FIREBASE_ANALYTICS_COLLECTION_ENABLED<\/key>\s*<false\/>/.test(info));
});

test('Share is counted once in known commitments and excluded from private variable averages',()=>{
 const privateRow={id:'p',date:'2026-09-21',amount:90,catId:1};
 const shared={id:'s',date:'2026-09-21',amount:60,catId:1,_share:true,shareProjectId:'trip',shareActivityId:'past'};
 const project={id:'trip',participants:[{id:'me',uid:'viewer'},{id:'other',uid:'other'}],
   activities:[{id:'future',date:'2026-11-01',amount:100,shares:{me:50,other:50}}]};
 const imported={date:'2026-11-01',amount:50,catId:1,_share:true,shareProjectId:'trip',shareActivityId:'future'};
 const r=forecast({today,expenses:[privateRow,imported],analysisExpenses:[privateRow,shared,imported],shareProjects:[project],userId:'viewer'});
 assert.equal(r.baseline.dailyVariableExpense,3);
 assert.equal(r.horizons[0].knownExpense,50);
 assert.equal(r.horizons[0].estimatedAdditionalExpense,90);
});

test('a requested future Budget uses its actual saved override and scheduled commitments',()=>{
 const r=insights({...fixture(),accessLevel:'full',periodKey:'2026-10',question:'Budget novembre 2026',
  legacyBudgetPlan:{items:[{catId:2,amount:1000}]},
  financeEvolution:{budget:{overrides:{'2026-11':{items:[{catId:2,amount:80}]}}}}});
 assert.equal(r.budgetPeriod.key,'2026-11');
 assert.equal(r.budgets[0].budget,80);assert.equal(r.budgets[0].committedExpense,100);
 assert.equal(r.budgets[0].status,'COMMITTED_OVER_LIMIT');
 assert.equal(r.budgets[0].remainingAfterCommitments,-20);
});

test('annual questions use civil years even when financial months start on day 27',()=>{
 const fiscal={mode:'financial',startDay:27},now='2026-11-10';
 for(const q of ['spese rateizzate 2026',"rate di quest’anno",'rate di questo anno','this year installments','cuotas este año']) {
  const requested=range(q,now,'2026-08',fiscal);
  assert.equal(requested.start,'2026-01-01',q);assert.equal(requested.end,'2026-12-31',q);
 }
 assert.equal(range('anno scorso',now,'2026-08',fiscal).start,'2025-01-01');
 assert.equal(range('2024',now,'2026-08',fiscal).end,'2024-12-31');
 assert.equal(range('spese nel 0000',now,'2026-08',fiscal).status,'N_D');
 assert.equal(range('Ho speso 2026 euro',now,'2026-08',fiscal).basis,'selected_period');
 assert.equal(range('Posso spendere 2000 questo mese?',now,'2026-08',fiscal).basis,'current_budget_period');
});

test('relative comparisons resolve both real periods instead of returning only the previous one',()=>{
 const now='2026-11-10';
 const request=range('questo mese rispetto al mese scorso',now,'2026-08',settings);
 assert.equal(request.start,'2026-11-01');assert.equal(request.comparisonStart,'2026-10-01');
 const reverse=range('mese scorso rispetto a questo mese',now,'2026-08',settings);
 assert.equal(reverse.start,'2026-10-01');assert.equal(reverse.comparisonStart,'2026-11-01');
 const year=range("quest'anno rispetto all'anno scorso",now,'2026-08',settings);
 assert.equal(year.start,'2026-01-01');assert.equal(year.comparisonStart,'2025-01-01');
 const sameMonth=range("questo mese rispetto all'anno scorso",now,'2026-08',settings);
 assert.equal(sameMonth.start,'2026-11-01');assert.equal(sameMonth.comparisonStart,'2025-11-01');
 assert.equal(range('questo mese e mese scorso',now,'2026-08',settings).status,'N_D');
 const implicit=range('Perché ho speso di più questo mese?',now,'2026-08',settings);
 assert.equal(implicit.start,'2026-11-01');assert.equal(implicit.comparisonStart,'2026-10-01');
 assert.equal(implicit.comparisonImplicit,true);
});

test('requested historical category changes reconcile cents independently of the selected month',()=>{
 const r=insights({today:'2026-11-10',periodKey:'2026-11',question:'agosto 2026 rispetto luglio 2026',categories:category,expenses:[
  {date:'2026-08-01',amount:60.03,catId:1},{date:'2026-07-01',amount:20.01,catId:1},
  {date:'2026-07-02',amount:10.04,catId:2},{date:'2026-08-03',amount:5.02,catId:3}]});
 assert.deepEqual(r.categoryChanges,[],'selected-month API remains separate');
 assert.equal(r.requestedExpenseDelta,35);
 assert.equal(r.requestedComparisonBasis,'COMPLETE_PERIODS');
 assert.equal(r.requestedCategoryChanges.find(x=>x.categoryId==='1').delta,40.02);
 assert.equal(r.requestedCategoryChanges.find(x=>x.categoryId==='2').delta,-10.04);
 assert.equal(r.requestedCategoryChanges.find(x=>x.categoryId==='3').percentage,null);
 assert.equal(r.requestedCategoryReconciliation.categoryDelta,35);
 assert.equal(r.requestedCategoryReconciliation.reconciled,true);
});

test('partial requested financial months compare matching elapsed days in either order',()=>{
 const input={today:'2026-11-10',periodKey:'2026-08',periodSettings:{mode:'financial',startDay:27},categories:category,expenses:[
  {date:'2026-10-28',amount:60,catId:1},{date:'2026-11-20',amount:700,catId:1},
  {date:'2026-09-28',amount:20,catId:1},{date:'2026-10-20',amount:800,catId:1}]};
 const r=insights({...input,question:'questo mese rispetto al mese scorso'});
 assert.equal(r.requestedPeriod.start,'2026-10-27');assert.equal(r.requestedPeriod.end,'2026-11-10');
 assert.equal(r.requestedComparison.start,'2026-09-27');assert.equal(r.requestedComparison.end,'2026-10-11');
 assert.equal(r.requestedPeriod.comparisonStart,r.requestedComparison.start);
 assert.equal(r.requestedPeriod.comparisonEnd,r.requestedComparison.end);
 assert.equal(r.requestedComparisonBasis,'MATCHED_ELAPSED_DAYS');assert.equal(r.requestedExpenseDelta,40);
 assert.equal(r.requestedPeriodBounds.end,'2026-11-26');
 assert.equal(r.requestedPeriodBounds.comparisonEnd,'2026-10-26');
 const reverse=insights({...input,question:'mese scorso rispetto a questo mese',accessLevel:'full'});
 assert.equal(reverse.requestedExpenseDelta,-40);
 assert.equal(reverse.largestExpenses.length,1,'matched-range details cannot include the rest of the old month');
});

test('year comparisons match the same civil cutoff and clamp leap-day anniversaries',()=>{
 const r=insights({today:'2028-02-29',periodKey:'2028-02',question:'2028 rispetto 2027',categories:category,accessLevel:'full',expenses:[
  {date:'2028-02-29',amount:60,catId:1},{date:'2027-02-28',amount:20,catId:1},{date:'2027-03-01',amount:800,catId:1}],
  incomes:[{date:'2028-02-01',amount:100},{date:'2027-02-01',amount:70}]});
 assert.equal(r.requestedPeriod.start,'2028-01-01');assert.equal(r.requestedPeriod.end,'2028-02-29');
 assert.equal(r.requestedComparison.end,'2027-02-28');
 assert.equal(r.requestedComparisonBasis,'MATCHED_CALENDAR_DATES');
 assert.equal(r.requestedExpenseDelta,40);assert.equal(r.requestedIncomeDelta,30);assert.equal(r.requestedNetDelta,-10);
 assert.equal(r.requestedCategoryReconciliation.reconciled,true);
});

test('four explicit dates retain both exact user ranges without implicit cutoff matching',()=>{
 const q='Confronta dal 01/08/2026 al 15/08/2026 rispetto al periodo dal 01/07/2026 al 31/07/2026';
 const request=range(q,'2026-11-10','2026-11',settings);
 assert.equal(request.basis,'explicit_date_comparison');assert.equal(request.end,'2026-08-15');assert.equal(request.comparisonEnd,'2026-07-31');
 const r=insights({today:'2026-11-10',periodKey:'2026-11',question:q,expenses:[{date:'2026-08-16',amount:99},{date:'2026-07-20',amount:10}]});
 assert.equal(r.requestedPeriod.expense,0);assert.equal(r.requestedComparison.expense,10);assert.equal(r.requestedComparisonBasis,'EXPLICIT_DATES');
});

test('requested comparisons respect exclusions and tombstones while retaining unnamed-category evidence',()=>{
 const input={today:'2026-11-10',periodKey:'2026-11',question:'agosto 2026 rispetto luglio 2026',accessLevel:'full',categories:category,
  excludeExpense:row=>row.catId===9,excludeIncome:row=>row.type==='hidden',
  expenses:[{date:'2026-08-01',amount:40,catId:1},{date:'2026-07-01',amount:10,catId:1},
   {date:'2026-08-02',amount:9000,catId:9},{date:'2026-08-03',amount:8000,catId:1,deletedAt:'2026-09-01'},
   {date:'2026-08-04',amount:5,catId:'unresolved'}],
  incomes:[{date:'2026-08-01',amount:100,type:'visible'},{date:'2026-08-01',amount:7000,type:'hidden'}]};
 const before=JSON.stringify(input),r=insights(input);
 assert.equal(r.requestedExpenseDelta,35);assert.equal(r.requestedPeriod.income,100);
 assert.equal(r.coverage.excludedExpenseRows,1);assert.equal(r.coverage.excludedIncomeRows,1);
 assert.equal(r.coverage.unnamedExpenseCategoryRows,1);
 assert.equal(r.requestedCategoryChanges.find(x=>x.categoryId==='unresolved').category,'[CATEGORY_NAME_UNAVAILABLE]');
 assert.equal(r.requestedCategoryReconciliation.reconciled,true);assert.equal(JSON.stringify(input),before);
});

test('bounded requested category differences disclose omitted contribution and preserve a requested name',()=>{
 const cats=Array.from({length:100},(_,i)=>({id:i,name:'Categoria '+i}));
 const expenses=cats.map(cat=>({date:'2026-08-01',amount:100-cat.id,catId:cat.id}));
 const r=financialInsightsForApp({today:'2026-11-10',curMonthKey:'2026-11',aiDataAccess:'summary',expenses,cats},'Categoria 99 agosto 2026 rispetto luglio 2026');
 assert(r.requestedCategoryChanges.some(x=>x.category==='Categoria 99'));
 assert(r.requestedCategoryChangesOmitted>0);
 const evidence=r.requestedCategoryReconciliation;
 assert.equal(Math.round((evidence.displayedCategoryDelta+evidence.omittedCategoryDelta)*100),Math.round(evidence.expenseDelta*100));
 assert.equal(evidence.reconciled,true);
 assert(!('requestedIncomeDelta' in r));
});


test('expense drivers use matched dates, exact cents and recorded descriptions only in full access', () => {
  const options={
    today:'2026-11-10', question:'Perché ho speso di più questo mese?',
    categories:[{id:1,name:'Casa'}],
    expenses:[
      {date:'2026-11-05',catId:1,desc:'Energia',amount:45.15},
      {date:'2026-11-08',catId:1,desc:' energia ',amount:5.10},
      {date:'2026-10-05',catId:1,desc:'ENERGIA',amount:25},
      {date:'2026-10-23',catId:1,desc:'Fuori confronto',amount:200},
      {date:'2026-11-06',catId:1,desc:'Eliminato',amount:300,deleted:true}
    ]
  };
  const result=insights({...options,accessLevel:'full'});
  assert.equal(result.requestedExpenseDelta,25.25);
  assert.deepEqual(result.requestedExpenseDrivers,{
    status:'PARTIAL', omittedCount:0, omittedDelta:0,
    drivers:[{categoryId:'1',category:'Casa',description:'Energia',
      current:50.25,previous:25,currentCount:2,previousCount:1,delta:25.25}]
  });
  assert.equal(insights(options).requestedExpenseDrivers,undefined);
  const withoutBaseline=insights({...options,accessLevel:'full',expenses:options.expenses.slice(0,2)});
  assert.equal(withoutBaseline.requestedExpenseDrivers,null);
  assert.equal(withoutBaseline.requestedCategoryReconciliation.dataStatus,'N_D');
});
