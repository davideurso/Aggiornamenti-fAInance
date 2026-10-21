import fs from 'node:fs';import ts from 'typescript';
import test from 'node:test';import assert from 'node:assert/strict';
import {spendingAlertSnapshot,triggeredSpendingAlerts,spendingAlertNotices,suggestedAlertBudget} from '../src/finance/spendingAlerts.js';
import {loadTypeScript} from './loadTypeScript.mjs';
const {createAccountingPeriod}=loadTypeScript('src/finance/accountingPeriod.ts');
const settings=createAccountingPeriod({mode:'calendar',startDay:1});
const base={periodKey:'2026-10',accountingPeriod:settings,categories:[{id:1,group:'home'}],expenses:[{catId:'1',date:'2026-10-10',amount:101}],format:v=>v.toFixed(2)};
const rule={id:10,name:'Casa',type:'cat',catId:1,budget:100,period:'monthly',triggerMode:'immediate'};
test('numeric and string category identifiers trigger the same popup and notification',()=>{
 const rows=triggeredSpendingAlerts({...base,alerts:[rule]});assert.equal(rows.length,1);assert.equal(rows[0]._spent,101);assert.equal(rows[0].spentFmt,'101.00');
 const notices=spendingAlertNotices({rows,userId:'synthetic'});assert.equal(notices.length,1);assert.equal(notices[0].read,false);assert.equal(notices[0].actionValue,'spending:v3:10:2026-10');
});
test('group alerts match mixed identifier types and non-numeric category ids',()=>{
 assert.equal(spendingAlertSnapshot({...rule,type:'group',groupId:'7'},{...base,categories:[{id:'custom-food',group:7}],expenses:[{catId:'custom-food',date:'2026-10-20',amount:101}]}).triggered,true);
 assert.equal(spendingAlertSnapshot({...rule,catId:'custom-food'},{...base,expenses:[{catId:'custom-food',date:'2026-10-20',amount:101}]}).triggered,true);
});
test('threshold percentage, exact cents and refunds use numeric money amounts',()=>{
 const r={...rule,triggerMode:'percent',triggerPct:10};
 const at=spendingAlertSnapshot(r,{...base,expenses:[{catId:1,date:'2026-10-10',amount:100},{catId:1,date:'2026-10-11',amount:'10'}]});assert(at.triggered);assert.equal(at._spent,110);
 assert(!spendingAlertSnapshot(r,{...base,expenses:[{catId:1,date:'2026-10-10',amount:109.99}]}).triggered);
 assert(!spendingAlertSnapshot(rule,{...base,expenses:[{catId:1,date:'2026-10-10',amount:110},{catId:1,date:'2026-10-11',amount:-20}]}).triggered);
});
test('monthly and annual alerts follow the selected fiscal period',()=>{
 const fiscal=createAccountingPeriod({mode:'financial',startDay:25});
 const expenses=[{catId:1,date:'2026-09-24',amount:1000},{catId:1,date:'2026-09-25',amount:60},{catId:1,date:'2026-10-24',amount:40},{catId:1,date:'2026-10-25',amount:500}];
 const r=spendingAlertSnapshot(rule,{...base,accountingPeriod:fiscal,expenses});assert.equal(r._spent,100);assert(r.triggered);
 const annual=spendingAlertSnapshot({...rule,period:'annual'},{...base,periodKey:'2025-10',expenses:[{catId:1,date:'2025-02-01',amount:110},{catId:1,date:'2026-02-01',amount:1000}]});assert.equal(annual._spent,110);assert.equal(annual._alertKey,'spending:v3:10:2025');
});
test('read and dismissed notices remain distinct, and new periods are unread',()=>{
 const rows=triggeredSpendingAlerts({...base,alerts:[rule]});
 assert.equal(spendingAlertNotices({rows,userId:'u',seen:['spending:v3:10:2026-10']})[0].read,true);
 assert.equal(spendingAlertNotices({rows,userId:'u',dismissed:['spending:v3:10:2026-10']}).length,0);
 const next=triggeredSpendingAlerts({...base,periodKey:'2026-11',expenses:[{catId:1,date:'2026-11-01',amount:101}],alerts:[rule]});
 assert.equal(spendingAlertNotices({rows:next,userId:'u',seen:['spending:v3:10:2026-10']})[0].read,false);
 assert.equal(spendingAlertNotices({rows,userId:''}).length,0);
});
test('evaluation never mutates persisted rules or triggers invalid empty limits',()=>{
 const frozen=Object.freeze({...rule});assert(spendingAlertSnapshot(frozen,base).triggered);assert.equal(frozen._spent,undefined);
 assert(!spendingAlertSnapshot({...rule,budget:0},base).triggered);assert(!spendingAlertSnapshot({...rule,budget:NaN},base).triggered);
});

test('legacy page-visit acknowledgements cannot suppress the repaired alert once',()=>{const rows=triggeredSpendingAlerts({...base,alerts:[rule]});assert.equal(spendingAlertNotices({rows,userId:'u',seen:['10:2026-10']})[0].read,false);});

test('actual delivery hook waits for hydration, avoids duplicates and preserves pending alerts',()=>{
 const filename='src/notifications/useSpendingAlertDispatch.ts',source=fs.readFileSync(filename,'utf8');
 const persistent={current:{account:'',keys:[]}},effects={useRef:()=>persistent,useEffect:callback=>callback()};
 const module={exports:{}},code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(name=>{assert.equal(name,'react');return effects;},module,module.exports);
 let popup=null,calls=0;const onPopup=value=>{calls++;popup=typeof value==='function'?value(popup):value;},run=(ready,rows,accountKey='u')=>module.exports.useSpendingAlertDispatch({ready,rows,accountKey,onPopup});
 const first={_alertKey:'spending:v3:1:2026-10'},second={_alertKey:'spending:v3:2:2026-10'};
 run(false,[first]);assert.equal(calls,0);run(true,[first]);assert.equal(popup.length,1);run(true,[first]);assert.equal(calls,1);
 run(true,[first,second]);assert.equal(popup.length,2);run(true,[],'other-user');assert.equal(popup,null);
});
test('visiting the Alert page cannot automatically acknowledge new thresholds',()=>{
 const ast=ts.createSourceFile('app.tsx',fs.readFileSync('src/app.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 let accidental=0;function walk(node){if(ts.isCallExpression(node)&&node.expression.getText(ast)==='useEffect'&&node.arguments[0]){const body=node.arguments[0].getText(ast);if(body.includes('markAlertsSeen('))accidental++;}ts.forEachChild(node,walk);}walk(ast);assert.equal(accidental,0);
});

test('monthly and annual category suggestions use the same monthly Budget with factor twelve',()=>{
 const options={plan:{items:[{catId:1,amount:50}]},categories:[{id:'1',group:'home'}],catId:'1'};
 assert.equal(suggestedAlertBudget(options),50);assert.equal(suggestedAlertBudget({...options,period:'annual'}),600);
 assert.equal(suggestedAlertBudget({...options,period:'monthly'}),50);
});
test('annual area suggestions sum its monthly categories and missing budgets stay unavailable',()=>{
 const options={plan:{items:[{catId:1,amount:50},{catId:2,amount:10.25},{catId:3,amount:99}]},categories:[{id:'1',group:7},{id:2,group:'7'},{id:3,group:'other'}],type:'group',groupId:'7',period:'annual'};
 assert.equal(suggestedAlertBudget(options),723);assert.equal(suggestedAlertBudget({...options,groupId:'absent'}),null);assert.equal(suggestedAlertBudget({...options,plan:null}),null);
});
