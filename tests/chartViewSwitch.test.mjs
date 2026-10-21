import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { loadTypeScript } from './loadTypeScript.mjs';
const {createAccountingPeriod}=loadTypeScript('src/finance/accountingPeriod.ts');
const home=ts.createSourceFile('home.tsx',fs.readFileSync('src/sezioni.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const stats=ts.createSourceFile('stats.tsx',fs.readFileSync('src/statistiche.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find(root,predicate){let found;function visit(node){if(predicate(node))found=node;else ts.forEachChild(node,visit);}visit(root);assert(found);return found;}
function call(name,context){const node=find(home,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);const code=ts.transpileModule(node.getText(home),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return new Function(...Object.keys(context),code+';return '+name)(...Object.values(context));}
const memo=find(stats,n=>ts.isVariableDeclaration(n)&&n.name.getText(stats)==='statsMonthlyTotals').initializer;
const code=ts.transpileModule('const result='+memo.getText(stats),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const expenses=[{date:'2026-05-27',amount:120,rateizzato:true,rate:3}];
const incomes=[{date:'2026-06-27',amount:300}];
const keys=['2026-05','2026-06','2026-07','2026-08'];
let priorDeps,cache;const useMemo=(compute,deps)=>{if(!priorDeps||deps.some((v,i)=>!Object.is(v,priorDeps[i]))){cache=compute();priorDeps=deps;}return cache;};
const signatures=new Set();
for(const settings of [{mode:'calendar',startDay:1},{mode:'financial',startDay:27}]){
  const accountingPeriod=createAccountingPeriod(settings);
  for(const mode of ['reale','rateizzato']){
    const totals=call('totalInKeys',{accountingPeriod,homeBalanceView:mode});
    const rows=call('monthlyChart',{lastMonthKeys:()=>keys,expenses,incomes,countedExpenses:expenses,countedIncomes:incomes,totalInKeys:totals,monthLabel:k=>k,safeNum:Number})(4);
    const context={useMemo,periodMonths:keys,expenses,incomes,countedExpenses:expenses,countedIncomes:incomes,effectiveStatsView:mode,effectiveStatMode:'year',accountingPeriod,rateMonth:accountingPeriod.amount,monthKeyLabel:k=>k};
    const allRows=new Function(...Object.keys(context),code+';return result;')(...Object.values(context));
    assert.deepEqual(rows,allRows.filter(r=>r.exp||r.inc),'Home and Statistics must agree for the same mode and period');
    const expected=settings.mode==='calendar'?(mode==='reale'?[120,0,0,0]:[40,40,40,0]):(mode==='reale'?[0,120,0,0]:[0,40,40,40]);
    assert.deepEqual(allRows.map(r=>r.exp),expected);
    assert.equal(allRows.reduce((sum,r)=>sum+r.inc,0),300);
    assert.equal(allRows.reduce((sum,r)=>sum+r.exp,0),120);
    assert.equal(allRows[settings.mode==='calendar'?1:2].inc,300,'Income on the 27th moves to the next financial period');
    signatures.add(JSON.stringify(allRows));
    const groups=call('sumBy',{totalInKeys:totals})(expenses,['2026-06'],()=>1,()=> 'Category',()=> '#123');
    assert.equal(groups[0]?.value||0,expected[1],'Home category worklets must follow the same view');
  }
}
assert.equal(signatures.size,4,'Each mode/period combination must visibly produce distinct chart data');
// Income distribution must use the selected view too, rather than always cash.
{
  const node=find(stats,n=>ts.isVariableDeclaration(n)&&n.name.getText(stats)==='incByType');
  const incomeCode=ts.transpileModule('const result='+node.initializer.getText(stats),{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
  for(const mode of ['reale','rateizzato']) {
    const rows=new Function('exports','require','incomeTypes','incomes','countedIncomes','fInc','effectiveStatsView','rateInPeriod','CatalogLabel','L','plainOrCatalogLabel','incomeColor',incomeCode+';return result;')(
      {},()=>({jsx:()=>null}),[{id:'salary',name:'Salary'}],[{type:'salary',amount:120}],[{type:'salary',amount:120}],[],mode,()=>40,()=>null,x=>x,()=>null,'#123');
    assert.equal(rows[0]?.value||0,mode==='reale'?0:40);
  }
}
// Missing and uploaded icons both go through the real shared label component.
{
  const source=fs.readFileSync('src/icons/CatalogLabel.tsx','utf8');
  const root=ts.createSourceFile('icons.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const node=find(root,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='CatalogLabel');
  const iconCode=ts.transpileModule(node.getText(root).replace('export ',''),{compilerOptions:{target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
  const jsx=(type,props)=>({type,props});const Icon=()=>null;
  const label=new Function('exports','require','FainanceIcon',iconCode+';return CatalogLabel;')({},()=>({jsx,jsxs:jsx}),Icon);
  for(const [item,expected] of [[{},'🏷️'],[{icon:'  '},'🏷️'],[{icon:'🏠'},'🏠'],[{icon:'fai-icon:owner:id'},'fai-icon:owner:id']]){
    const result=label({item,name:'Category'});
    assert.equal(result.props.children[0].type,Icon);
    assert.equal(result.props.children[0].props.value,expected);
  }
}
console.log('Actual Home and Statistics charts: all 4 mode/period combinations, memo refresh, monthly balances and category totals passed');

// A single August salary must not be confused with an equal September salary.
for(const [settings,expected] of [[{mode:'calendar',startDay:1},'2026-08'],[{mode:'financial',startDay:27},'2026-09'],[{mode:'financial',startDay:28},'2026-08']]) {
  const accountingPeriod=createAccountingPeriod(settings);
  const salary={date:'2026-08-27',amount:1850,rateizzato:false};
  const dates=['2026-08','2026-09','2026-10'];
  const node=find(stats,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='exportAmountForMonth');
  const exportCode=ts.transpileModule(node.getText(stats),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const exported=new Function('accountingPeriod','rateMonth',exportCode+';return exportAmountForMonth;')(accountingPeriod,accountingPeriod.amount);
  for(const mode of ['reale','rateizzato']) {
    for(const key of dates) {
      assert.equal(accountingPeriod.total([salary],key,mode),key===expected?1850:0);
      assert.equal(exported(salary,key,mode),key===expected?1850:0,'Exports must use the same period as the screen');
    }
    const context={useMemo:fn=>fn(),periodMonths:dates,expenses:[],incomes:[salary],countedExpenses:[],countedIncomes:[salary],effectiveStatsView:mode,effectiveStatMode:'year',accountingPeriod,rateMonth:accountingPeriod.amount,monthKeyLabel:k=>k};
    const rows=new Function(...Object.keys(context),code+';return result;')(...Object.values(context));
    assert.deepEqual(rows.filter(row=>row.inc).map(row=>row.label),[expected]);
    const totals=call('totalInKeys',{accountingPeriod,homeBalanceView:mode});
    assert.deepEqual(call('monthlyChart',{lastMonthKeys:()=>dates,expenses:[],incomes:[salary],countedExpenses:[],countedIncomes:[salary],totalInKeys:totals,monthLabel:k=>k,safeNum:Number})(3).map(row=>row.label),[expected]);
  }
}
console.log('August 27 salary: calendar August, financial day 27 September, day 28 August; both views, Home, Statistics and exports passed');

const monthNames=['Gen','Feb','Mar','Apr','Mag','Giu','Lug','Ago','Set','Ott','Nov','Dic'];
const labelNode=find(stats,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='monthKeyLabel');
const labelCode=ts.transpileModule(labelNode.getText(stats),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const statsLabel=new Function('MONTHS_SHORT','effectiveStatMode',labelCode+';return monthKeyLabel;')(monthNames,'last12');
const homeLabel=call('monthLabel',{MONTHS_SHORT:monthNames,monthShortName:index=>monthNames[index]});
for(const [key,label] of [['2026-08','Ago 26'],['2026-09','Set 26'],['2026-10','Ott 26']]){assert.equal(statsLabel(key),label);assert.equal(homeLabel(key),label);}
console.log('Actual month label formatters: August, September and October have no extra offset');
