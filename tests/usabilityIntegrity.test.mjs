import test from 'node:test';import assert from 'node:assert/strict';import {budgetEnvelope} from '../src/ui/workletIntegrity.js';
test('Budget overview counts only allocated categories and explains individual overruns',()=>{
 const r=budgetEnvelope({items:[{catId:'food',amount:400},{catId:'rent',amount:1000}]},id=>id==='food'?450:900);
 assert.equal(r.limit,1400);assert.equal(r.spent,1350);assert.equal(r.remaining,50);assert.equal(r.exceeded,1);assert.deepEqual(r.categoryIds,['food','rent']);
});
test('Budget overview preserves zero limits, refunds, cents and overspending',()=>{
 const r=budgetEnvelope({items:[{catId:1,amount:0},{catId:2,amount:12.30}]},id=>id==='1'?5:12.31);
 assert.equal(r.remaining,-5.01);assert.equal(r.exceeded,2);
 assert.equal(budgetEnvelope({items:[{catId:1,amount:10}]},()=>-2).remaining,12);
 assert.equal(budgetEnvelope(null,()=>0).configured,false);
});
test('duplicated category allocations are consolidated before comparing spending',()=>{
 const r=budgetEnvelope({items:[{catId:1,amount:10},{catId:'1',amount:15}]},()=>20);
 assert.equal(r.limit,25);assert.equal(r.spent,20);assert.equal(r.exceeded,0);
});
