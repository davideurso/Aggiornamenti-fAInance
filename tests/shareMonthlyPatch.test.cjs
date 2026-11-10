const fs=require('fs'),assert=require('assert/strict'),vm=require('vm');
const path=require('path');const root=path.resolve(__dirname,'..');
const share=fs.readFileSync(path.join(root,'src/sections/SharePanel.tsx'),'utf8');
const core=fs.readFileSync(path.join(root,'src/core.tsx'),'utf8');
const home=fs.readFileSync(path.join(root,'src/sezioni.tsx'),'utf8');
const parser=core.slice(core.indexOf('export function parseMoney('),core.indexOf('export function numberLocale(')).replace('export ','');
const functions=share.slice(share.indexOf('  function shareRound('),share.indexOf('  var newShareProjectFormValid'));
function split(mode,amount,draft){const c={useEffect:()=>{},shareExpenseFormOpen:true,shareEditingActivityId:null,shareSplitTouched:false,splitMode:mode,shareAmount:amount,splitDraft:draft,shareFx:{currency:'EUR'},_c:{currency:'EUR'},activeParticipants:[{id:'a'},{id:'b'}],shareParticipantIds:['a','b'],L:x=>x,lang:'it',fmt:n=>n.toFixed(2)};vm.createContext(c);vm.runInContext(parser+functions,c);return {shares:c.computeShares(),validation:c.shareValidation(),defaults:c.defaultShareSplitDraft(mode),context:c};}
for(const value of ['84,63','84.63']){const r=split('amount','114,63',{a:value,b:'30,00'});assert.equal(r.validation.ok,true);assert.equal(r.shares.a,84.63);assert.equal(r.shares.b,30);assert.equal(JSON.parse(JSON.stringify(r.shares)).a,84.63);}
assert.equal(split('amount','0.30',{a:'0.10',b:'0.20'}).validation.ok,true);
assert.match(split('amount','114.63',{a:'84',b:'30'}).validation.message,/0.63/);
assert.match(split('amount','114.63',{a:'84.64',b:'30'}).validation.message,/0.01/);
for(const a of ['-1','abc','84.633','84,63xyz','1.2.3'])assert.equal(split('amount','114.63',{a,b:'30'}).validation.ok,false);
assert.equal(split('amount','114.63',{a:'114.63',b:''}).validation.ok,true);
const equal=split('equal','114.63',{});assert.equal(Math.round((equal.shares.a+equal.shares.b)*100),11463);
const percent=split('percent','114.63',{a:'60',b:'40'});assert.equal(percent.validation.ok,true);assert.equal(percent.shares.a,68.78);assert.equal(percent.shares.b,45.85);
assert.equal(split('percent','114.63',{a:'60',b:'30'}).validation.ok,false);
const calendar=core.slice(core.indexOf('function balancePeriodLocalDate('),core.indexOf('// ── DATE HELPERS',core.indexOf('function balancePeriodLocalDate('))).replace(/export /g,'');
const block=home.slice(home.indexOf('var monthlyExpenseAverage ='),home.indexOf('      var monthlyShowDecimals',home.indexOf('var monthlyExpenseAverage =')));
function compare(date,items,avg){const c={Date:class extends Date{constructor(...args){super(...(args.length?args:[date]));}},countedExpenses:items,keys:['2026-09'],totalInKeys:()=>avg,homeBalanceView:'reale',safeNum:Number,lang:'it',subC:'gray',expenseColor:'red',incomeColor:'green'};vm.createContext(c);vm.runInContext(calendar+block.replace(/ as any/g,""),c);return c;}
let c=compare('2026-10-14T12:00:00',[{date:'2026-09-01',amount:100},{date:'2026-09-30',amount:200},{date:'2026-10-01',amount:999}],200);assert.equal(c.closedMonthKey,'2026-09');assert.equal(c.closedMonthExpense,300);assert.equal(c.monthlyDifference,100);assert.equal(c.monthlyDifferencePct,50);
c=compare('2027-01-01T12:00:00',[{date:'2026-12-31',amount:10}],20);assert.equal(c.closedMonthKey,'2026-12');assert.equal(c.monthlyDifferencePct,-50);
c=compare('2024-03-01T12:00:00',[{date:'2024-02-29',amount:0}],0);assert.equal(c.closedMonthHasData,true);assert.equal(c.monthlyDifferencePct,null);
c=compare('2026-10-14T12:00:00',[],0);assert.equal(c.closedMonthHasData,false);assert.equal(c.closedMonthExpense,0);
assert.match(share,/shares: shares,/);assert.match(home,/amountForBalancePeriodMonth\(item, closedMonthKey,.*"calendar", 1\)/);
console.log('[OK] Share: centesimi, virgola/punto, residuo, invalidi, Equa, Percentuali, serializzazione. Worklet: confini calendario, anno, bisestile, zero e assenza dati.');

for (const count of [1,2,3,7]) {
  const r=split('amount','114.63',{}), c=r.context;
  c.activeParticipants=Array.from({length:count},(_,i)=>({id:String(i)})); c.shareParticipantIds=c.activeParticipants.map(p=>p.id);
  for(const mode of ['amount','percent']) {
    c.splitMode=mode;c.splitDraft=c.defaultShareSplitDraft(mode);
    assert.equal(c.shareValidation().ok,true);
    assert.equal(Math.round(Object.values(c.computeShares()).reduce((a,b)=>a+b,0)*100),11463);
  }
  c.shareParticipantIds=[];assert.equal(Object.keys(c.computeShares()).length,0);assert.equal(c.shareValidation().ok,false);
}
const tiny=split('percent','0.01',{a:'50',b:'50'});assert.equal(Math.round((tiny.shares.a+tiny.shares.b)*100),1);
assert.match(home,/monthlyized_expenses: \{ range: 12, showDecimals: false \}/);
assert.match(home,/type === "monthlyized_expenses" &&/);
console.log('[OK] Defaults Importi/Percentuali per 1,2,3,7 partecipanti; residuo in centesimi; deselezione; opzione decimali.');
