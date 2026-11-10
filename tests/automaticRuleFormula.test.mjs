import assert from 'node:assert/strict';
import {parseRuleLogic,evaluateRuleLogic,legacyRuleLogicTokens,defaultRuleLogic,suggestedNextLogicTokens} from '../src/finance/automaticRuleFormula.js';
import {ruleConditionsMatch,validateAutomaticRule} from '../src/finance/automaticRules.js';
const valid=(tokens,n)=>parseRuleLogic(tokens,n);
const fail=(tokens,n)=>assert.throws(()=>valid(tokens,n),/INVALID_RULE_FORMULA/);
const nested=['(','1','all','2','all','3',')','any','(','4','all','(','5','any','6',')',')'];
const ast=valid(nested,6);
for(let mask=0;mask<64;mask++){
 const bits=Array.from({length:6},(_,i)=>!!(mask&(1<<i)));
 assert.equal(evaluateRuleLogic(ast,bits),(bits[0]&&bits[1]&&bits[2])||(bits[3]&&(bits[4]||bits[5])),'mask '+mask);
}
for(let n=1;n<=6;n++)assert.ok(valid(defaultRuleLogic(n),n));
assert.ok(valid(['(','(','1','all','2',')','any','3',')'],3));
assert.ok(valid(['2','any','(','3','all','1',')'],3)); // any order allowed
fail(['1','all','1'],2); // missing condition 2, duplicates otherwise allowed
fail(['(','1','all','2'],2); // unmatched (
fail(['1','all','2',')'],2); // unmatched )
fail(['1','any'],2); // incomplete
fail(['1','all','7'],2); // beyond count
fail(['1','all','2'],3); // missing condition 3
fail(['1','1'],2); // missing E/O
fail(['1','bad','2'],2); // invalid operator
assert.equal(suggestedNextLogicTokens(['(','1'],2).canClose,true);
assert.equal(suggestedNextLogicTokens(['(','1'],2).canCondition(1),false); // only while an operator is missing
assert.equal(suggestedNextLogicTokens(['(','1','all'],2).canCondition(1),true);
assert.ok(valid(['(','1','all','1',')','any','2'],2));
assert.equal(suggestedNextLogicTokens(['(','1','all','2',')'],2).complete,true);

const rule={id:'r',kind:'automatic-v1',name:'Test',enabled:true,priority:0,revision:0,trigger:'expense',match:'any',conditions:[
 {field:'amount',operator:'greater',value:'10'},
 {field:'description',operator:'contains',value:'Bar',join:'all'},
 {field:'amount',operator:'less',value:'4',join:'any'},
 {field:'description',operator:'contains',value:'caffè',join:'all'}
],conditionGroups:[{start:0,end:1},{start:2,end:3}],actions:[{field:'description',value:'test'}],alert:null};
const oldTokens=legacyRuleLogicTokens(rule);
const astOld=valid(oldTokens,4);
const original=x=>({amount:x.amount,description:x.description});
for(const amt of [1,3,5,11,15])for(const description of ['Bar','caffè','xxx','Bar caffè']){
 const x=original({amount:amt,description});
 const a=ruleConditionsMatch(rule,x);
 const b=ruleConditionsMatch({...rule,logicTokens:oldTokens,conditionGroups:[]},x);
 assert.equal(a,b,JSON.stringify(x));
}
assert.deepEqual(oldTokens,['(','(','1','all','2',')','any','(','3','all','4',')',')']);
const updated={...rule,logicTokens:nested,conditions:[...rule.conditions,
 {field:'amount',operator:'greater',value:'1'},
 {field:'amount',operator:'less',value:'100'}]};
assert.doesNotThrow(()=>validateAutomaticRule(updated));
assert.throws(()=>validateAutomaticRule({...updated,logicTokens:['1','any','2']}),/INVALID_RULE_FORMULA/);
assert.throws(()=>validateAutomaticRule({...updated,conditions:[...updated.conditions,{field:'amount',operator:'equals',value:'1'}]}),/RULE_CONDITION_LIMIT/);
console.log('[OK] Formula keypad: nested, arbitrary groups, repeated references, validation, legacy equivalence');

const mk=(i,values)=>({field:'description',operator:'contains',value:values[i]});
// Real engine comparison for nested, reordered conditions.
const named=['one','two','three','four','five','six'];
const nestedRule={...updated,conditions:named.map((_,i)=>mk(i,named)),logicTokens:nested,conditionGroups:[]};
for(const string of ['one two three','four five','four six','one two','five six','one two three four']){
 const bits=named.map(w=>string.includes(w));
 assert.equal(ruleConditionsMatch(nestedRule,{description:string,amount:1}),evaluateRuleLogic(ast,bits));
}
console.log('[OK] Engine and saved rule integration');
