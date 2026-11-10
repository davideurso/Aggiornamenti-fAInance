import test from 'node:test';
import assert from 'node:assert/strict';
import {validateAutomaticRule,ruleConditionsMatch,MAX_RULE_CONDITIONS} from '../src/finance/automaticRules.js';
const base={id:'a',kind:'automatic-v1',name:'Test',enabled:true,priority:0,revision:0,trigger:'expense',match:'all',actions:[{field:'description',value:'OK'}]};
const conditions=(joins)=>joins.map((join,i)=>({field:'description',operator:'contains',value:String.fromCharCode(97+i),...(i?{join}:{})}));
const rule=(joins,groups=[])=>({...base,conditions:conditions(joins),conditionGroups:groups});
const check=(r,value)=>ruleConditionsMatch(r,{description:value});
test('six conditions are accepted; seventh is rejected',()=>{
 assert.equal(MAX_RULE_CONDITIONS,6);assert.doesNotThrow(()=>validateAutomaticRule(rule(['all','all','all','all','all','all'])));
 assert.throws(()=>validateAutomaticRule(rule(['all','all','all','all','all','all','all'])),/RULE_CONDITION_LIMIT/);
});
test('legacy 20-condition rule is still readable with flag',()=>{
 const r=rule(Array(12).fill('all'));
 assert.doesNotThrow(()=>validateAutomaticRule(r,{allowLegacyConditions:true}));
 assert.throws(()=>validateAutomaticRule(r),/RULE_CONDITION_LIMIT/);
});
test('(A OR B) AND C vs A OR (B AND C)',()=>{
 const first=rule(['all','any','all'],[{start:0,end:1}]);
 assert.equal(check(first,'ac'),true);assert.equal(check(first,'bc'),true);assert.equal(check(first,'a'),false);
 const second=rule(['all','any','all'],[{start:1,end:2}]);
 assert.equal(check(second,'a'),true);assert.equal(check(second,'bc'),true);assert.equal(check(second,'b'),false);
});
test('nested ( (A OR B) AND (C OR D) ) with E outside',()=>{
 const r=rule(['all','any','all','any','all'],[{start:0,end:3},{start:0,end:1},{start:2,end:3}]);
 assert.doesNotThrow(()=>validateAutomaticRule(r));
 assert.equal(check(r,'ace'),true);assert.equal(check(r,'bde'),true);
 assert.equal(check(r,'ace'.replace('e','')),false);assert.equal(check(r,'ade'),true);
 assert.equal(check(r,'ab'),false);
});
test('crossed groups and duplicates rejected',()=>{
 assert.throws(()=>validateAutomaticRule(rule(['all','any','all','any'],[{start:0,end:2},{start:1,end:3}])),/INVALID_RULE_GROUP/);
 assert.throws(()=>validateAutomaticRule(rule(['all','any','all'],[{start:0,end:2},{start:0,end:2}])),/INVALID_RULE_GROUP/);
});
test('original all/any behavior without parentheses remains stable',()=>{
 const r=rule(['all','any','all']);
 assert.equal(check(r,'a'),false);assert.equal(check(r,'ac'),true);assert.equal(check(r,'bc'),true);
});
