import assert from 'node:assert/strict';
import {ruleConditionsMatch,validateAutomaticRule,evaluateAutomaticRules,MAX_RULE_CONDITIONS} from '../src/finance/automaticRules.js';
const cond=(value,join)=>({field:'description',operator:'contains',value, ...(join?{join}:{})});
const rule=(conditions,groups=undefined)=>({kind:'automatic-v1',id:'r',name:'Test',enabled:true,priority:0,revision:0,trigger:'expense',match:'all',categoryFilter:null,conditions,actions:[{field:'description',value:'Categorized'}],...(groups?{conditionGroups:groups}:{})});

assert.equal(MAX_RULE_CONDITIONS,6);
const c=[cond('a'),cond('b','any'),cond('c','all')];
const legacy=rule(c);
const bracketed=rule(c,[{start:1,end:2}]);
validateAutomaticRule(legacy);validateAutomaticRule(bracketed);
assert.equal(ruleConditionsMatch(legacy,{description:'a'}),false,'historical left-to-right: (A OR B) AND C');
assert.equal(ruleConditionsMatch(bracketed,{description:'a'}),true,'A OR (B AND C) should match A alone');
assert.equal(ruleConditionsMatch(bracketed,{description:'bc'}),true,'A OR (B AND C) should match both B and C');
assert.equal(ruleConditionsMatch(bracketed,{description:'b'}),false,'A OR (B AND C) should not match B alone');

const four=rule([cond('a'),cond('b','any'),cond('c','all'),cond('d','any')],[{start:0,end:1},{start:2,end:3}]);
validateAutomaticRule(four);
assert.equal(ruleConditionsMatch(four,{description:'a'}),false,'(A OR B) AND (C OR D)');
assert.equal(ruleConditionsMatch(four,{description:'ac'}),true,'(A OR B) AND (C OR D)');
assert.equal(ruleConditionsMatch(four,{description:'bd'}),true,'(A OR B) AND (C OR D)');
assert.equal(ruleConditionsMatch(four,{description:'d'}),false,'(A OR B) AND (C OR D)');
const result=evaluateAutomaticRules([four],{desc:'ac',amount:10,_ruleDefaultFields:['desc']},'expense','manual',{plan:'premium'});
assert.deepEqual(result.matched,['r']);
assert.equal(result.item.desc,'Categorized');

for (const groups of [[{start:0,end:0}],[{start:0,end:9}],[{start:0,end:2},{start:2,end:3}],[{start:1,end:2},{start:0,end:1}]]){
 assert.throws(()=>validateAutomaticRule({...four,conditionGroups:groups}),/INVALID_RULE_GROUP/);
}
assert.throws(()=>validateAutomaticRule(rule([...four.conditions,cond('e'),cond('f'),cond('g')])),/RULE_CONDITION_LIMIT/);
validateAutomaticRule(rule([...four.conditions,cond('e'),cond('f')]),{allowLegacyConditions:true});
console.log('OK: grouped AND/OR, legacy compatibility, two groups, invalid groups and limit 6');
