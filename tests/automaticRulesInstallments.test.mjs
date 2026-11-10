import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {evaluateAutomaticRules,validateAutomaticRule,automaticRuleForEditor} from '../src/finance/automaticRules.js';
import {saveAutomaticRule} from '../src/finance/automaticRuleStore.js';
import {createFinanceEvolution,migrateFinanceEvolution,mergeFinanceEvolution} from '../src/data/financeEvolution.js';
import {itemAmountForMonth,totalForMonth} from '../src/financeCalculations.js';
import {buildFinancialCalendar} from '../src/finance/financialCalendar.js';
import {buildSavingsForecast} from '../src/finance/savingsForecast.js';
import {loadTypeScript} from './loadTypeScript.mjs';
const make=(direction='expense',n=3,way='forward')=>({id:'rate',kind:'automatic-v1',name:'Acquisto',enabled:true,revision:0,priority:0,trigger:direction,match:'all',conditions:[{field:'description',operator:'contains',value:'acquisto'}],actions:[{field:'installments',value:n,direction:way}],alert:null});
const input={id:123,desc:'Acquisto',amount:100,date:'2026-01-31',catId:1,methodId:2,type:'gift',rateizzato:false,rate:12,rateDirection:'forward'};
const opts={plan:'premium'};
test('expense and income share the exact manual installment fields, total, date and ID',()=>{
 for(const d of ['expense','income']){
  const before=structuredClone(input),r=evaluateAutomaticRules([make(d)],input,d,'manual',opts);
  assert.deepEqual(r.item,{...input,rateizzato:true,rate:3,rateDirection:'forward'});
  assert.deepEqual(r.changed,['rateizzato','rate','rateDirection']);
  assert.deepEqual(input,before);assert.equal(r.item.amount,100);assert.equal(r.item.id,123);
 }
});
test('existing manual installments always win, including opted-in edits',()=>{
 for(const event of ['create','edit']){
  const manual={...input,rateizzato:true,rate:6,rateDirection:'backward',_ruleDefaultFields:['installments']};
  const r=evaluateAutomaticRules([{...make(),applyOnEdit:true}],manual,'expense','manual',{...opts,event});
  assert.equal(r.item.rate,6);assert.equal(r.item.rateDirection,'backward');assert.deepEqual(r.changed,[]);
  assert.equal(r.skipped[0].reason,'explicit');
 }
});
test('first matching installment action is atomic and direction conflicts are reported',()=>{
 const first=make(),second={...make('expense',3,'backward'),id:'second',priority:1,name:'Seconda'};
 const r=evaluateAutomaticRules([second,first],input,'expense','manual',opts);
 assert.equal(r.item.rate,3);assert.equal(r.item.rateDirection,'forward');assert.equal(r.conflicts.length,1);
 assert.equal(r.conflicts[0].field,'installments');assert.equal(r.skipped[0].reason,'priority');
 const same=evaluateAutomaticRules([first,{...second,actions:first.actions}],input,'expense','manual',opts);
 assert.equal(same.conflicts.length,0);
});
test('an installment result never cascades to another rule',()=>{
 const second={...make(),id:'cascade',priority:1,conditions:[{field:'transactionType',operator:'equals',value:'installment'}],actions:[{field:'description',value:'Changed'}]};
 assert.deepEqual(evaluateAutomaticRules([make(),second],input,'expense','manual',opts).matched,['rate']);
});
test('invalid or duplicate installment settings are rejected before persistence',()=>{
 for(const n of [0,-1,241,1.5,NaN,Infinity,'3',null]){
  assert.throws(()=>validateAutomaticRule(make('expense',n)),/INVALID_RULE_INSTALLMENTS/);
 }
 for(const direction of [undefined,'weekly',''])assert.throws(()=>validateAutomaticRule(make('expense',3,direction==='weekly'?'weekly':direction===undefined?null:'')),/INVALID_RULE_INSTALLMENTS/);
 for(const n of [1,240])validateAutomaticRule(make('expense',n));
 const dup=make();dup.actions.push({...dup.actions[0]});assert.throws(()=>validateAutomaticRule(dup),/DUPLICATE_RULE_ACTION/);
});
test('current movement plan options are enforced without changing a movement on downgrade',()=>{
 const r=evaluateAutomaticRules([make()],input,'expense','manual',{plan:'free',instalmentOptions:[6,12]});
 assert.equal(r.item.rateizzato,false);assert.equal(r.skipped[0].reason,'plan');
 assert.equal(evaluateAutomaticRules([make('expense',6)],input,'expense','manual',{plan:'free',instalmentOptions:[6,12]}).item.rate,6);
});
test('edit rules require opt-in and leave an explicit change to installment controls intact',()=>{
 assert.equal(evaluateAutomaticRules([make()],input,'expense','manual',{...opts,event:'edit'}).item.rateizzato,false);
 const rule={...make(),applyOnEdit:true};
 assert.equal(evaluateAutomaticRules([rule],input,'expense','manual',{...opts,event:'edit'}).item.rateizzato,false);
 const r=evaluateAutomaticRules([rule],{...input,_ruleDefaultFields:['installments']},'expense','manual',{...opts,event:'edit'});
 assert.equal(r.item.rate,3);assert(!('_ruleDefaultFields' in r.item));
});
test('all normal ingress sources retain one movement, with scope and disabled rules respected',()=>{
 for(const source of ['manual','bulk','receipt','voice','assistant','tool','recurring']){
  assert.equal(evaluateAutomaticRules([make()],input,'expense',source,opts).item.rate,3);
 }
 assert.equal(evaluateAutomaticRules([{...make(),enabled:false}],input,'expense','manual',opts).item.rateizzato,false);
 assert.equal(evaluateAutomaticRules([make('income')],input,'expense','manual',opts).item.rateizzato,false);
});
test('backup, merge, duplicate/editor copy and rule revision retain the action exactly',()=>{
 let f=saveAutomaticRule(createFinanceEvolution(),make(),'premium');
 const encoded=JSON.parse(JSON.stringify(f));assert.deepEqual(migrateFinanceEvolution(encoded),f);assert.deepEqual(mergeFinanceEvolution(f,encoded),f);
 const copy=automaticRuleForEditor(f.rules[0]);copy.actions[0].value=6;assert.equal(f.rules[0].actions[0].value,3);
 f=saveAutomaticRule(f,{...copy,expectedRevision:0},'premium');assert.equal(f.rules[0].revision,1);assert.equal(f.rules[0].actions[0].value,6);
});
test('calendar, forward/backward accounting, real totals and cent remainder match manual movements',()=>{
 for(const way of ['forward','backward']){
  const automatic=evaluateAutomaticRules([make('expense',3,way)],input,'expense','manual',opts).item;
  const manual={...input,rateizzato:true,rate:3,rateDirection:way};
  for(const key of ['2025-11','2025-12','2026-01','2026-02','2026-03']){
   for(const settings of [{mode:'calendar',startDay:1},{mode:'financial',startDay:27}]){
    assert.equal(itemAmountForMonth(automatic,key,settings),itemAmountForMonth(manual,key,settings));
    assert.equal(totalForMonth([automatic],key,'reale',settings),totalForMonth([manual],key,'reale',settings));
   }
   const params={month:key,today:'2026-01-01',incomes:[],recurring:[]};
   assert.deepEqual(buildFinancialCalendar({...params,expenses:[automatic]}),buildFinancialCalendar({...params,expenses:[manual]}));
  }
  const keys=way==='forward'?['2026-01','2026-02','2026-03']:['2026-01','2025-12','2025-11'];
  assert.deepEqual(keys.map(k=>itemAmountForMonth(automatic,k)),[33.33,33.33,33.34]);
 }
});
test('savings forecast keeps existing real-transaction behavior with no parent/child double count',()=>{
 const auto=evaluateAutomaticRules([make()],input,'expense','manual',opts).item;
 const params={today:'2026-01-01',expenses:[10,11,12].map(m=>({date:'2025-'+m+'-02',amount:500,catId:2})),incomes:[10,11,12].map(m=>({date:'2025-'+m+'-01',amount:1000,type:'salary'})),recurring:[]};
 assert.deepEqual(buildSavingsForecast({...params,expenses:[...params.expenses,auto]}),buildSavingsForecast({...params,expenses:[...params.expenses,{...input,rateizzato:true,rate:3,rateDirection:'forward'}]}));
});
test('all ten languages have nonempty installment labels',()=>{
 const {installmentRuleRows}=loadTypeScript('src/i18n/installmentRuleTranslations.ts');
 assert.equal(Object.keys(installmentRuleRows).length,10);
 for(const values of Object.values(installmentRuleRows)){assert.equal(values.length,7);assert(values.every(v=>typeof v==='string'&&v.trim()));}
});
