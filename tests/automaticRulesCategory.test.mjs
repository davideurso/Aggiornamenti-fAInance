import assert from 'node:assert/strict';
import {evaluateAutomaticRules,validateAutomaticRule,automaticRuleForEditor} from '../src/finance/automaticRules.js';
import {createFinanceEvolution,migrateFinanceEvolution} from '../src/data/financeEvolution.js';
import {saveAutomaticRule} from '../src/finance/automaticRuleStore.js';
import {loadTypeScript} from './loadTypeScript.mjs';
const rule={id:'salary-check',kind:'automatic-v1',name:'Controllo stipendio',enabled:true,revision:0,priority:0,trigger:'income',categoryFilter:{direction:'income',value:'salary'},match:'any',conditions:[{field:'amount',operator:'less',value:1000},{field:'amount',operator:'greater',value:10000}],actions:[{field:'alert',kind:'confirmation',text:'Confermi lo stipendio?'}],alert:null};
const opts={plan:'premium',incomeTypes:[{id:'salary'},{id:'gift'}],cats:[{id:'salary'}]};
const run=(amount,type='salary',direction='income',r=rule)=>evaluateAutomaticRules([r],{amount,type,catId:type,desc:'Movimento'},direction,'manual',opts);
for(const amount of [0,999.99,10000.01,15000])assert.equal(run(amount).alerts.length,1,String(amount));
for(const amount of [1000,1850,10000])assert.equal(run(amount).alerts.length,0,String(amount));
for(const amount of [900,15000]){assert.equal(run(amount,'gift').alerts.length,0,'Other income category');assert.equal(run(amount,'salary','expense').alerts.length,0,'Same ID in expense category');}
const both={...rule,trigger:'movement'};assert.equal(run(900,'salary','expense',both).alerts.length,0,'Category scope includes direction');
const expense={...rule,trigger:'expense',categoryFilter:{direction:'expense',value:'salary'}};assert.equal(run(900,'salary','expense',expense).alerts.length,1);
assert.equal(run(900,'salary','income',{...rule,match:'all'}).alerts.length,0,'All/any remain distinct');
const legacy={...rule,categoryFilter:undefined,actions:[],alert:{kind:'information',text:'Legacy'}};
const edited=automaticRuleForEditor(legacy);assert.equal(legacy.actions.length,0);assert.equal(edited.alert,null);assert.equal(edited.actions[0].field,'alert');assert.equal(run(900,'salary','income',legacy).alerts[0].text,run(900,'salary','income',edited).alerts[0].text);
assert.throws(()=>validateAutomaticRule({...rule,alert:legacy.alert}),/DUPLICATE_RULE_ALERT/);
assert.throws(()=>validateAutomaticRule({...rule,actions:[...rule.actions,...rule.actions]}),/DUPLICATE/);
assert.throws(()=>validateAutomaticRule({...rule,actions:[{field:'alert',kind:'bad',text:'x'}]}),/INVALID_RULE_ALERT/);
assert.throws(()=>validateAutomaticRule({...rule,categoryFilter:{direction:'expense',value:'salary'}}),/INVALID_RULE_CATEGORY/);
const saved=saveAutomaticRule(createFinanceEvolution(),rule,'premium');assert.deepEqual(migrateFinanceEvolution(JSON.parse(JSON.stringify(saved))),saved);
assert.equal(run(900,'salary','income',saved.rules[0]).alerts.length,1);
const rows=loadTypeScript('src/i18n/ruleEditorTranslations.ts').ruleEditorRows;assert.equal(Object.keys(rows).length,10);for(const values of Object.values(rows)){assert.equal(values.length,rows.it.length);assert(values.every(v=>typeof v==='string'&&v.trim()));}
console.log('Salary bounds, mandatory category, expense/income scope, alert actions, legacy compatibility, backup and 10 languages passed');
