import assert from 'node:assert/strict';
import {parseRuleLogic,evaluateRuleLogic,stripRedundantOuterParentheses} from '../src/finance/automaticRuleFormula.js';
const doubled=['(','(','1','all','2',')','any','(','3','all','4',')',')'];
const simple=stripRedundantOuterParentheses(doubled);
assert.deepEqual(simple,['(','1','all','2',')','any','(','3','all','4',')']);
const a=parseRuleLogic(doubled,4),b=parseRuleLogic(simple,4);
for(let mask=0;mask<16;mask++){const bits=Array.from({length:4},(_,i)=>!!(mask&(1<<i)));assert.equal(evaluateRuleLogic(a,bits),evaluateRuleLogic(b,bits));}
const nested=['(','1','all','(','2','any','3',')',')','any','4'];
assert.deepEqual(stripRedundantOuterParentheses(nested),nested);
const trulyNested=['(','(','1','all','(','2','any','3',')',')','any','4',')'];
assert.deepEqual(stripRedundantOuterParentheses(trulyNested),nested);
console.log('[OK] Redundant parentheses removed; meaningful nesting preserved');
