'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),crypto=require('node:crypto');
const {plan,identity}=require('../functions/growthCreationEvidence.cjs');
const nonce='00000000-0000-4000-8000-000000000001';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
const fixture=n=>({state:{goals:Array.from({length:n},(_,i)=>({id:'g'+i}))},stock:{goals:n}});
const registry=(n,tokens=[])=>({schema:'first-server-confirmation-v1',baselinedFamilies:['goals','rules','budgetVersions','budgetOverrides'],seen:Array.from({length:n},(_,i)=>identity('goals','g'+i)),tokens});
const intent=(id='g0',token=nonce)=>({family:'goals',entityId:id,nonce:token});
const fullTokens=()=>[hash(nonce),...Array.from({length:1999},(_,i)=>hash('previous-'+i))];
test('replay 1001 existing identities fits the unique-identity capacity',()=>{
 const f=fixture(1001),reg=registry(1001),before=JSON.stringify(reg);
 const r=plan({...f,registry:reg,intents:[]});
 assert.equal(r.registry.seen.length,1001);assert.equal(r.events.length,0);assert.equal(JSON.stringify(reg),before);
});
test('2000 unique identities are accepted in baseline and replay',()=>{
 const f=fixture(2000),base=plan({...f,intents:[]});
 assert.equal(base.events.length,0);assert.equal(base.registry.seen.length,2000);
 assert.equal(plan({...f,registry:base.registry,intents:[]}).registry.seen.length,2000);
});
test('2001 genuinely distinct identities fail without mutating the registry',()=>{
 const f=fixture(1);f.state.goals[0].id='new';const reg=registry(2000),before=JSON.stringify(reg);
 assert.throws(()=>plan({...f,registry:reg,intents:[]}),/CREATION_REGISTRY_CAPACITY/);assert.equal(JSON.stringify(reg),before);
});
test('known nonce can be acknowledged at full token capacity',()=>{
 const r=plan({...fixture(1),registry:registry(0,fullTokens()),intents:[intent()]});
 assert.deepEqual(r.acknowledged,[nonce]);assert.equal(r.events.length,0);assert.equal(r.registry.tokens.length,2000);
});
test('already seen identity needs no new token even at full capacity',()=>{
 const n='00000000-0000-4000-8000-000000000002';
 const r=plan({...fixture(1),registry:registry(1,fullTokens()),intents:[intent('g0',n)]});
 assert.deepEqual(r.acknowledged,[n]);assert.equal(r.events.length,0);assert.equal(r.registry.tokens.length,2000);
});
test('an intent absent from saved source does not consume capacity',()=>{
 const r=plan({...fixture(0),registry:registry(0,fullTokens()),intents:[intent()]});
 assert.equal(r.events.length,0);assert.equal(r.acknowledged.length,0);assert.equal(r.registry.tokens.length,2000);
});
test('one genuinely new token fits slot 2000 and replay stays idempotent',()=>{
 const reg=registry(0,Array.from({length:1999},(_,i)=>hash('previous-'+i)));
 const r=plan({...fixture(1),registry:reg,intents:[intent()]});
 assert.equal(r.events.length,1);assert.equal(r.registry.tokens.length,2000);
 assert.equal(r.registry.numericExportAllowed,false);assert.equal(r.registry.wholeAppPopulationQualified,false);
 const replay=plan({...fixture(1),registry:r.registry,intents:[intent()]});assert.equal(replay.events.length,0);
});
test('a new token beyond capacity is rejected atomically',()=>{
 const n='00000000-0000-4000-8000-000000000002',reg=registry(0,fullTokens()),before=JSON.stringify(reg);
 assert.throws(()=>plan({...fixture(1),registry:reg,intents:[intent('g0',n)]}),/CREATION_REGISTRY_CAPACITY/);
 assert.equal(JSON.stringify(reg),before);
});
test('oversized existing token registry remains invalid',()=>{
 assert.throws(()=>plan({...fixture(0),registry:registry(0,[...fullTokens(),hash('overflow')]),intents:[]}),/CREATION_REGISTRY_CAPACITY/);
});
test('duplicate intents remain rejected and baseline does not invent births',()=>{
 assert.throws(()=>plan({...fixture(1),registry:registry(0),intents:[intent(),intent()]}),/CREATION_INTENTS_DUPLICATE/);
 assert.equal(plan({...fixture(1),intents:[intent()]}).events.length,0);
});
