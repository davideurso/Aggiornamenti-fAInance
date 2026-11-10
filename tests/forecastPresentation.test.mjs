import {buildSavingsForecast} from '../src/finance/savingsForecast.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {buildFinancialForecast,shiftCivilDate} from '../src/finance/financialInsights.js';
import * as presentation from '../src/finance/forecastPresentation.js';
const require=createRequire(import.meta.url);
const fixture=()=>({today:'2026-10-22',currency:'EUR',lang:'it',cats:[{id:1,name:'Costi fissi'},{id:2,name:'Spesa'}],
 expenses:[{date:'2026-07-01',amount:1,catId:1,oneOff:true},...Array.from({length:30},(_,i)=>({date:shiftCivilDate('2026-09-01',i),amount:20.64,catId:2,desc:'Spesa '+i}))],
 incomes:[],recurring:[{id:'s',rtype:'income',name:'Stipendio',amount:2392.87,dayOfMonth:1},{id:'e',rtype:'expense',name:'Impegni mensili',amount:2755.11,catId:1,dayOfMonth:3}]});
function component(context){
 const source=fs.readFileSync('src/sections/FinancialForecastPanel.tsx','utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022},reportDiagnostics:true});
 assert.equal(js.diagnostics.filter(d=>d.category===ts.DiagnosticCategory.Error).length,0);
 const box={exports:{}};
 new Function('require','exports','module',js.outputText)(name=>name==='../core'?{useApp:()=>context}:name.includes('savingsForecast.js')?{buildSavingsForecast}:name.includes('financialInsights.js')?{buildFinancialForecast}:name.includes('forecastPresentation.js')?presentation:require(name),box.exports,box);
 return box.exports;
}
test('unsigned formatting preserves financial signs and unavailable values',()=>{
 const value=-568.64;
 for(const lang of ['it','en','es','fr','de','pt','pl','nl','ro','el']){
  assert(!/[-−]/.test(presentation.formatForecastAmount(value,lang,'EUR')));
  assert.equal(presentation.formatForecastAmount(value,lang,'EUR'),presentation.formatForecastAmount(-value,lang,'EUR'));
 }
 assert.equal(value,-568.64);
 for(const x of [null,undefined,NaN,Infinity])assert.equal(presentation.formatForecastAmount(x),'—');
 assert.notEqual(presentation.formatForecastAmount(0),'—');
});
test('prudent breakdown independently explains every cent of the illustrated 30-day case',()=>{
 const row={knownChange:-362.24,inferredExpense:0,estimatedAdditionalExpense:206.4,inferredIncome:0,estimatedChange:-568.64,prudentChange:-981.44};
 assert.deepEqual(presentation.forecastPrudentBreakdown(row),{variableExpense:619.2,extraExpense:412.8,excludedIncome:0,difference:412.8});
 assert.equal(presentation.forecastPrudentBreakdown({...row,prudentChange:null}),null);
 assert.equal(presentation.forecastPrudentBreakdown({...row,estimatedChange:-500}),null);
});
test('excluded inferred income is separate from extra prudent spending',()=>{
 const row={knownChange:1000,inferredExpense:100,estimatedAdditionalExpense:200,inferredIncome:500,estimatedChange:1200,prudentChange:500};
 const b=presentation.forecastPrudentBreakdown(row);
 assert.deepEqual(b,{variableExpense:400,extraExpense:200,excludedIncome:500,difference:700});
});
test('actual engine entries reconcile to each horizon and remain unchanged',()=>{
 const input=fixture(),before=JSON.stringify(input),data=buildFinancialForecast(input);
 for(const row of data.horizons){
  const b=presentation.forecastMovementBreakdown(data,row);
  assert.equal(b.reconciled,true);assert.equal(b.income,row.knownIncome);assert.equal(b.expense,row.knownExpense);
  assert(b.entries.every(e=>e.date>=data.today&&e.date<=row.date));
  const p=presentation.forecastPrudentBreakdown(row);
  assert.equal(Math.round(p.difference*100),Math.round(p.extraExpense*100)+Math.round(p.excludedIncome*100));
 }
 assert.equal(JSON.stringify(input),before);
 assert.equal(presentation.forecastMovementBreakdown(data,{...data.horizons[0],knownExpense:1}).reconciled,false);
});

test('savings component renders one forecast per horizon in all ten languages with unsigned semantic colors',()=>{
 const expenses=[7,8,9].map(m=>({date:'2026-0'+m+'-02',amount:2000,catId:1,desc:'Usual'}));
 const incomes=[7,8,9].map(m=>({date:'2026-0'+m+'-01',amount:2500,type:'salary',desc:'Salary '+m}));
 for(const lang of ['it','en','es','fr','de','pt','pl','nl','ro','el']){
  const ctx={today:'2026-10-23',currency:'EUR',lang,expenses:expenses.concat({date:'2026-11-03',amount:200,catId:1,desc:'Future repair',oneOff:true}),incomes};
  const before=JSON.stringify(ctx),mod=component(ctx),words=mod.savingsForecastWords(lang);
  assert.equal(words.length,26);
  const html=renderToStaticMarkup(React.createElement(mod.FinancialForecastPanel));
  assert.equal([...html.matchAll(/fc-savings-result/g)].length,3);
  assert(html.includes(words[2]));assert(html.includes(words[16]));assert(html.includes('Future repair'));
  assert(html.includes('fc-positive'));assert(html.includes('fc-negative'));
  const amounts=[...html.matchAll(/class="[^"]*fc-forecast-amount[^"]*"[^>]*>([^<]*)</g)].map(m=>m[1]);
  assert(amounts.length>=20);assert(amounts.every(x=>!/[−-]/.test(x)));
  assert.equal(JSON.stringify(ctx),before);
 }
});
test('missing savings history is unavailable and does not invent forecasts',()=>{
 const mod=component({today:'2026-10-23',lang:'it',currency:'EUR'});
 const html=renderToStaticMarkup(React.createElement(mod.FinancialForecastPanel));
 assert(html.includes('Servono tre mesi'));assert(!html.includes('fc-savings-result'));
});
