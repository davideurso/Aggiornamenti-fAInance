import assert from 'node:assert/strict';
import {normalizeDirectRuleProposal,proposalsFromAiResponse} from '../src/finance/directRuleProposal.js';
const sample={action:'create_automatic_rule',ruleName:'Bar e caffè',ruleTrigger:'expense',ruleConditions:[
 {field:'amount',operator:'greater_than',value:10},{field:'description',operator:'contains',value:'Bar'},
 {field:'amount',operator:'less_than',value:4},{field:'description',operator:'contains',value:'caffè'}
],ruleActions:[{field:'payment',value:'Contanti'}],ruleLogicTokens:['(','1','E','2',')','O','(','3','E','4',')']};
const normalized=normalizeDirectRuleProposal(sample,'Se > 10 e Bar oppure < 4 e caffè');
assert.deepEqual(normalized.ruleLogicTokens,['(','1','all','2',')','any','(','3','all','4',')']);
const alternative=normalizeDirectRuleProposal({...sample,ruleLogicTokens:'(1 AND 2) OR (3 AND 4)'},'oppure');
assert.deepEqual(normalized.ruleLogicTokens,alternative.ruleLogicTokens);
const nested=normalizeDirectRuleProposal({...sample,ruleLogicTokens:['(','1','E','(','2','O','3',')',')','E','4']});
assert.equal(nested.ruleLogicTokens.length,11);
assert.deepEqual(proposalsFromAiResponse({answer:JSON.stringify({actions:[sample]})},'oppure')[0].ruleLogicTokens,normalized.ruleLogicTokens);
assert.deepEqual(proposalsFromAiResponse({result:{actions:[sample]}},'oppure')[0].ruleLogicTokens,normalized.ruleLogicTokens);
assert.throws(()=>proposalsFromAiResponse({answer:'Ti suggerisco una regola'}),{message:'AI_NO_STRUCTURED_ACTION'});
assert.throws(()=>normalizeDirectRuleProposal({...sample,ruleLogicTokens:['1','E','2','E','3','E','4']},'oppure'),{message:'AI_MISSING_ALTERNATIVE'});
assert.throws(()=>normalizeDirectRuleProposal({...sample,ruleLogicTokens:'(1 E 2 O 3'},'oppure'),{message:'INVALID_RULE_FORMULA'});
assert.throws(()=>normalizeDirectRuleProposal({...sample,ruleLogicTokens:'(1 E 7) O (3 E 4)'},'oppure'),{message:'AI_INVALID_FORMULA_TOKEN'});
assert.throws(()=>proposalsFromAiResponse({actions:[{action:'create_expense'}]},'caffè'),{message:'AI_INVALID_ACTION'});
console.log('[OK] normalization, nested formulas, E/O aliases, JSON replies, invalid rules rejected');
