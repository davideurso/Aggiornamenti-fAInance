import assert from 'node:assert/strict';
import {MAX_RULE_CONDITIONS,validateAutomaticRule,ruleConditionsMatch,evaluateAutomaticRules,ruleLimit} from '../src/finance/automaticRules.js';
const baseline={id:'r1',kind:'automatic-v1',name:'Rule A',enabled:true,revision:0,priority:0,trigger:'expense',categoryFilter:null,match:'all',conditions:[{field:'description',operator:'contains',value:'Netflix'}],actions:[{field:'category',value:'subs'}],alert:null};
const opts={plan:'premium',cats:[{id:'subs'},{id:'food'}],incomeTypes:[],methods:[]};
const item={desc:'Netflix September',amount:12,catId:'food',_ruleDefaultFields:['catId']};
assert.equal(MAX_RULE_CONDITIONS,6);assert.equal(ruleLimit('base'),2);
assert.doesNotThrow(()=>validateAutomaticRule(baseline));
assert.throws(()=>validateAutomaticRule({...baseline,conditions:Array(7).fill(baseline.conditions[0])}),/RULE_CONDITION_LIMIT/);
assert.doesNotThrow(()=>validateAutomaticRule({...baseline,conditions:Array(7).fill(baseline.conditions[0])},{allowLegacyConditions:true}));
assert.equal(ruleConditionsMatch({...baseline,conditions:[{field:'description',operator:'contains',value:'Netflix'},{field:'description',operator:'contains',value:'Spotify',join:'any'},{field:'amount',operator:'greater',value:10,join:'all'}]}, {description:'Spotify September',amount:12}),true);
assert.equal(ruleConditionsMatch({...baseline,conditions:[{field:'description',operator:'contains',value:'Netflix'},{field:'description',operator:'contains',value:'Spotify',join:'any'},{field:'amount',operator:'greater',value:10,join:'all'}]}, {description:'Spotify September',amount:9}),false);
for (const [operator,value,expected] of [['greaterOrEqual',12,true],['lessOrEqual',12,true],['between','10|14',true],['between','13|14',false]]) {
 const rule={...baseline,conditions:[{field:'amount',operator,value}]};
 assert.equal(evaluateAutomaticRules([rule],item,'expense','manual',opts).matched.length>0,expected);
}
assert.throws(()=>validateAutomaticRule({...baseline,conditions:[{field:'amount',operator:'between',value:'19|10'}]}),/INVALID_RULE_CONDITION/);
const edit=({...baseline,applyOnEdit:true});
assert.equal(evaluateAutomaticRules([baseline],item,'expense','manual',{...opts,event:'edit'}).matched.length,0);
assert.equal(evaluateAutomaticRules([edit],item,'expense','manual',{...opts,event:'edit'}).item.catId,'subs');
assert.equal(evaluateAutomaticRules([edit],{...item,_ruleDefaultFields:[]},'expense','manual',{...opts,event:'edit'}).item.catId,'food');
const conflict={...baseline,id:'r2',name:'Rule B',priority:1,actions:[{field:'category',value:'food'}]};
const r=evaluateAutomaticRules([baseline,conflict],item,'expense','manual',opts);
assert.equal(r.conflicts.length,1);assert.equal(r.conflicts[0].firstRule,'Rule A');assert.equal(r.item.catId,'subs');
const notes=evaluateAutomaticRules([{...baseline,actions:[{field:'tags',value:'work, meals'},{field:'note',value:'daily'}]}],item,'expense','manual',opts);
assert.deepEqual(notes.item.tags,['work','meals']);assert.equal(notes.item.note,'daily');
console.log('OK: max 6, legacy, mixed joins, ranges, conflicts, tags/notes, edit opt-in, explicit precedence');
