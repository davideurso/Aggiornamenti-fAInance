import assert from 'node:assert/strict';
import {createFinanceEvolution,migrateFinanceEvolution} from '../src/data/financeEvolution.js';
import {TOOL_HISTORY_MS,addToolHistory,pruneToolHistory,fetchToolRate,invertToolQuote,orderedToolCurrencies,toolCurrencyAllowed,roundCurrency} from '../src/finance/tools.js';
import {loadTypeScript} from './loadTypeScript.mjs';
const now=Date.parse('2026-09-15T12:00:00Z');let tools=createFinanceEvolution().tools;
tools=addToolHistory(tools,'calculator',{id:'calc',result:42},now-TOOL_HISTORY_MS);tools=addToolHistory(tools,'calculator',{id:'negative',result:-12},now-1);assert.equal(pruneToolHistory(tools,now).calculator.length,1);
const quote={id:'fx',from:'EUR',to:'USD',amount:100,result:117,rate:1.17};tools=addToolHistory(tools,'converter',quote,now);assert.deepEqual(tools.lastCurrencyPair,['EUR','USD']);assert(!('lastAmount' in tools));assert.equal(invertToolQuote(quote).amount,117);assert.equal(invertToolQuote(quote).result,100);
assert.equal(roundCurrency(15000.8,'JPY'),15001);assert.equal(roundCurrency(12.345,'EUR'),12.35);
assert.throws(()=>addToolHistory(tools,'converter',{...quote,id:'bad',rate:0},now));assert.throws(()=>addToolHistory(tools,'calculator',{id:'bad',result:Infinity},now));
const backup={...createFinanceEvolution(),tools};assert.deepEqual(migrateFinanceEvolution(JSON.parse(JSON.stringify(backup))),backup);
assert.deepEqual(orderedToolCurrencies(['JPY','USD','CHF','EUR','GBP'].map(code=>({code})),'EUR','USD',['JPY']).map(c=>c.code),['EUR','USD','JPY','CHF','GBP']);
assert.equal(await fetchToolRate('EUR','EUR',()=>{throw new Error('No network needed')}),1);assert.equal(await fetchToolRate('USD','JPY',async url=>{assert(url.endsWith('/USD'));return{ok:true,json:async()=>({rates:{JPY:150}})}}),150);await assert.rejects(()=>fetchToolRate('EUR','USD',async()=>({ok:true,json:async()=>({rates:{}})})));
assert(toolCurrencyAllowed('EUR','EUR','USD','free'));assert(!toolCurrencyAllowed('USD','EUR','USD','free'));assert(toolCurrencyAllowed('USD','EUR','USD','base'));assert(!toolCurrencyAllowed('JPY','EUR','USD','base'));assert(toolCurrencyAllowed('JPY','EUR','USD','premium'));
const rows=loadTypeScript('src/i18n/toolsTranslations.ts').toolsRows;assert.equal(Object.keys(rows).length,10);for(const row of Object.values(rows)){assert.equal(row.length,rows.it.length);assert(row.every(v=>typeof v==='string'&&v.trim()));}
console.log('Tools: seven-day retention, separate histories, negative calculator values, currency precision, swap, FX failures, currency limits, backup and 10 languages passed');
