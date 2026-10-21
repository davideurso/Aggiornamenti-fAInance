import { trackAutomaticRuleLocalChange } from "../src/data/automaticRuleAccountSync.js";
import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { loadTypeScript } from './loadTypeScript.mjs';
import { createFinanceEvolution, migrateFinanceEvolution } from '../src/data/financeEvolution.js';
import { createSavingsBucket } from '../src/finance/savingsBuckets.js';
import { saveSavingsEntry, cancelSavingsEntry } from '../src/finance/savingsLedger.js';
import { saveBudgetForPeriod } from '../src/finance/budgetEngine.js';
const algorithms=loadTypeScript('src/data/syncAlgorithms.ts');
function tree(file){return ts.createSourceFile(file,fs.readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);}
const app=tree('src/app.tsx'), core=tree('src/core.tsx');
function find(root,predicate){let result;function visit(n){if(predicate(n))result=n;else ts.forEachChild(n,visit);}visit(root);assert(result,'Actual source node missing');return result;}
function callable(root,name,context){const node=find(root,n=>ts.isFunctionDeclaration(n)&&n.name?.text===name);const code=ts.transpileModule(node.getText(root).replace(/^export /,''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;return new Function(...Object.keys(context),code+`; return ${name};`)(...Object.values(context));}
const disk=new Map(), queue=[], events=[];
let remote=true, writes=0, state=[];
const storage={getItem:k=>disk.get(k)||null,setItem:(k,v)=>{writes++;disk.set(k,v);}};
const useStorage=callable(core,'useStorage',{
  useState:initial=>{state=initial();return [state,next=>queue.push(next)];},
  useRef:value=>({current:value}),useCallback:fn=>fn,useEffect:()=>{},
  readFainanceStorageValue:()=>[],localStorage:storage,
  window:{dispatchEvent:event=>events.push({remote,key:event.detail.key})},
  CustomEvent:class{constructor(type,options){this.detail=options.detail;}},
});
const [,save]=useStorage('expenses',[]);
save([{id:'cloud',amount:10}]);
assert.equal(JSON.parse(disk.get('expenses'))[0].id,'cloud','Cloud persistence must finish before remote apply ends');
remote=false;
let updaterRuns=0;
save(previous=>{updaterRuns++;return [...previous,{id:'new',amount:20}];});
save(previous=>[...previous,{id:'next',amount:30}]);
assert.equal(updaterRuns,1,'Updates with side effects must execute once, outside React updater replay');
assert.equal(JSON.parse(disk.get('expenses')).length,3,'Rapid insertions survive before any React render');
assert.deepEqual(events.map(e=>e.remote),[true,false,false],'Cloud changes must not emit local events after deferred rendering');
for(const queued of queue){assert.notEqual(typeof queued,'function');state=queued;}
assert.equal(writes,3,'React rendering must not repeat storage writes');
assert.equal(state.length,3);
save(previous=>previous);
assert.equal(writes,3,'Unchanged values must not create synchronization traffic');

for(const [name,key,refName,rawName,namespace] of [
  ['setExpenses','exp_v10','expensesRef','setExpensesRaw','expense'],
  ['setIncomes','inc_v10','incomesRef','setIncomesRaw','income'],
]){
  const pending={current:{revision:4,token:'in-flight'}}, ref={current:[]};
  let pendingOnDisk=false, retry=false, raw;
  const mark=callable(app,'markPendingAccountSync',{
    firestoreHydratedRef:{current:true},applyingFirestoreRef:{current:true},pendingAccountSyncRef:pending,
    markAccountSyncPendingOnDevice:()=>pendingOnDisk=true,scheduleCompleteAccountRecoverySnapshot:()=>{},
    accountSyncSavingRef:{current:true},accountSyncRetryRequestedRef:{set current(v){retry=v;}},
  });
  const set=callable(app,name,{[refName]:ref,[rawName]:value=>raw=value,localStorage:storage,userKey:x=>x,
    userId:'test', movementBulkInProgressRef:{current:false},
    movementSyncV2ActiveRef:{current:false}, movementSyncV2WriteThroughRef:{current:false},
    isMovementSyncV2LocallyActive:()=>false,
    markPendingAccountSync:mark,prepareAccountCollectionWrite:(ns,prev,next)=>algorithms.stampLocalSyncRecords(prev,next,item=>algorithms.accountSyncRecordKey(ns,item)),
  });
  set([{id:'user-during-cloud',amount:25}]);
  assert.equal(pending.current.revision,5);
  assert.equal(pending.current.token,'');
  assert(pendingOnDisk&&retry,'Insertion during cloud work must remain pending and request another save');
  assert(JSON.parse(disk.get(key))[0].syncUpdatedAtMs>0);
  assert.equal(raw[0].id,'user-during-cloud');
  const recovered=algorithms.mergeSyncRecords(JSON.parse(disk.get(key)),[],{},item=>algorithms.accountSyncRecordKey(namespace,item),true);
  assert.equal(recovered.length,1,'Reload after failed cloud write must preserve the insertion');
  set([{id:'remote',amount:10}],true);
  assert.equal(pending.current.revision,5,'Explicit cloud hydration must not create a local revision');
}

// Execute the actual acknowledgement guard after a simulated delayed write.
const ack=find(app,n=>ts.isIfStatement(n)&&n.expression.getText(app).includes('pendingAfterWrite.revision'));
const ackCode=ts.transpileModule(ack.getText(app),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
for(const newer of [false,true]){
  const pending={current:{revision:4,token:'write-4'}};let cleared=false;
  const confirm=new Function('pendingAfterWrite','capturedRevision','writeToken','pendingAccountSyncRef','clearAccountSyncPendingOnDevice',ackCode);
  let release;const write=new Promise(resolve=>release=resolve);
  const task=write.then(()=>confirm(pending.current,4,'write-4',pending,()=>cleared=true));
  assert.equal(cleared,false,'A local echo cannot acknowledge an unresolved backend write');
  if(newer)pending.current={revision:5,token:''};
  release();await task;
  assert.equal(cleared,!newer,'An older successful write must never acknowledge a newer insertion');
  assert.equal(pending.current.revision,newer?5:0);
}
const echo=find(app,n=>ts.isIfStatement(n)&&n.expression.getText(app).includes('incomingSyncToken ==='));
assert(!echo.thenStatement.getText(app).includes('clearAccountSyncPendingOnDevice('),'Unconfirmed Firestore echoes must retain pending edits');
{
  const ref={current:createFinanceEvolution()};let marked=0,raw;
  const set=callable(app,'setFinanceEvolution',{trackAutomaticRuleLocalChange,
    migrateFinanceEvolution,financeEvolutionRef:ref,syncJsonEqual:algorithms.syncJsonEqual,localStorage:storage,
    userKey:x=>x,writeUserLocalUpdatedAt:(key,time)=>storage.setItem(key+'_updated_at',String(time)),
    markPendingAccountSync:forced=>{assert.equal(forced,true);marked++;},setFinanceEvolutionRaw:next=>raw=next,
  });
  set(previous=>saveBudgetForPeriod(previous,{income:3000,items:[]},'2026-09',{income:3000,items:[{catId:1,amount:350}]},'month'));
  assert.equal(marked,1);
  assert.equal(raw.budget.overrides['2026-09'].items[0].amount,350);
  assert.deepEqual(migrateFinanceEvolution(JSON.parse(disk.get('finance_evolution_v1'))),raw,'Budget changes survive reload before the cloud responds');
  set(previous=>previous);
  assert.equal(marked,1,'Opening and saving unchanged settings must not add sync traffic');
  assert.throws(()=>set({schemaVersion:999}));
  assert.equal(marked,1,'Invalid budget documents must fail before marking or writing');
}
const snapshot=find(app,n=>ts.isFunctionExpression(n)&&n.parameters[0]?.name.getText(app)==='snap'&&n.body.getText(app).includes('beginRemoteApply()'));
const snapshotCode=ts.transpileModule('const callback = '+snapshot.getText(app),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
for(const unexpectedFailure of [false,true]){
  let release,depth=0,errors=0;
  const expanded=new Promise(resolve=>release=resolve);
  const context={cancelled:false,readyFallback:0,clearTimeout:()=>{},beginRemoteApply:()=>depth++,endRemoteApply:()=>depth--,
    applyingFirestoreRef:{get current(){return depth>0;}},pendingAccountSyncRef:{current:{revision:1}},setAccountSyncRetryPulse:()=>{},
    lastCloudRawKeysRef:{current:[]},financeSchemaCompatibleRef:{current:false},setAccountCacheReady:()=>{},
    fainanceExpandAccountCloudDataV5:()=>expanded,persistAccountSyncError:()=>errors++,setFirestoreReady:()=>{},
  };
  const callback=new Function('context','with(context){'+snapshotCode+';return callback;}')(context);
  const running=callback({exists:()=>true,data:()=>{if(unexpectedFailure)throw Error('unexpected read failure');return {};}});
  if(!unexpectedFailure){assert.equal(depth,1);context.cancelled=true;release({});}
  await running;
  assert.equal(depth,0,'Cancelled or failed cloud hydration must always release the autosave suspension');
  assert.equal(errors,unexpectedFailure?1:0);
}
// Order cleanup runs during rendering and must not masquerade as a user edit.
for(const name of ['CatOrder','MethodOrder','IncomeTypeOrder']){
  const field=name[0].toLowerCase()+name.slice(1);let marks=0,patches=0,saved;
  const set=callable(app,'set'+name,{[field]:['1','2'],syncJsonEqual:algorithms.syncJsonEqual,
    markCategoryPreferencesChange:()=>marks++,queueWebCategoryPreferencePatch:()=>patches++,
    ['set'+name+'Raw']:value=>saved=value});
  set(previous=>previous.filter(id=>['1','2'].includes(id)));
  assert.equal(marks,0,'Unchanged order cleanup must not keep the cloud queue pending');
  assert.equal(patches,0);
  set(['2','1']);assert.equal(marks,1);assert.equal(patches,1);assert.deepEqual(saved,['2','1']);
}
// Exercise the real effect with fake time and React-style dependency comparison.
{
  const effect=find(app,n=>ts.isCallExpression(n)&&n.expression.getText(app)==='useEffect'&&n.arguments[0]?.getText(app).includes('latestAccountSaveRef.current()'));
  const code=ts.transpileModule(effect.getText(app),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  let clock=0,timerId=0,previousDeps,cleanup,calls=0;const timers=new Map();
  const context={userId:'test',firestoreReady:false,isOffline:false,accountSyncRetryPulse:0,
    applyingFirestoreRef:{current:false},pendingAccountSyncRef:{current:{revision:1}},latestAccountSaveRef:{current:()=>calls++},
    setTimeout:(fn,delay)=>{timers.set(++timerId,{fn,at:clock+delay});return timerId;},clearTimeout:id=>timers.delete(id),
    useEffect:(callback,deps)=>{if(!previousDeps||deps.some((value,index)=>!Object.is(value,previousDeps[index]))){cleanup?.();cleanup=callback();previousDeps=deps;}}};
  const render=()=>new Function('context','with(context){'+code+'}')(context);
  const advance=ms=>{clock+=ms;for(const [id,timer] of timers){if(timer.at<=clock){timers.delete(id);timer.fn();}}};
  render();advance(1000);assert.equal(calls,0,'Do not save before cloud hydration');
  context.firestoreReady=true;render();advance(400);render();advance(500);
  assert.equal(calls,1,'Unrelated renders must not postpone the save');
  context.pendingAccountSyncRef.current.revision++;render();advance(400);
  context.pendingAccountSyncRef.current.revision++;render();advance(500);assert.equal(calls,1);
  context.latestAccountSaveRef.current=()=>calls+=10;advance(400);assert.equal(calls,11,'Save the latest state after rapid edits');
  context.applyingFirestoreRef.current=true;context.pendingAccountSyncRef.current.revision++;render();advance(1000);assert.equal(calls,11);
  context.applyingFirestoreRef.current=false;context.accountSyncRetryPulse++;render();advance(900);assert.equal(calls,21,'Resume after async cloud merge');
  const end=callable(app,'endRemoteApply',{remoteApplyDepthRef:{current:1},applyingFirestoreRef:{current:true},setAccountSyncRetryPulse:()=>{throw Error('Synchronous translation must not restart autosave');},pendingAccountSyncRef:{current:{revision:3}}});
  end();
}
console.log('Actual storage and transaction handlers: deferred rendering, rapid inserts, edits during cloud apply, reload recovery, no-op traffic and delayed acknowledgements passed');

// Rapid actual contributions use the same immediate local write as Budget changes.
{
  const ref={current:createSavingsBucket(createFinanceEvolution(),{id:'travel',name:'Vacanze',currency:'EUR'})};let raw;
  const set=callable(app,'setFinanceEvolution',{trackAutomaticRuleLocalChange,migrateFinanceEvolution,financeEvolutionRef:ref,syncJsonEqual:algorithms.syncJsonEqual,localStorage:storage,userKey:x=>x,writeUserLocalUpdatedAt:()=>{},markPendingAccountSync:()=>{},setFinanceEvolutionRaw:next=>raw=next});
  const input={bucketId:'travel',currency:'EUR',date:'2026-09-14',source:'planned'};
  set(previous=>saveSavingsEntry(previous,{...input,id:'one',amountMinor:15000}));
  set(previous=>saveSavingsEntry(previous,{...input,id:'two',source:'extra',amountMinor:3000}));
  assert.equal(raw.savings.buckets[0].balanceMinor,18000);
  assert.equal(JSON.parse(disk.get('finance_evolution_v1')).savings.entries.length,2);
  set(previous=>cancelSavingsEntry(previous,'two',0));
  assert.equal(JSON.parse(disk.get('finance_evolution_v1')).savings.buckets[0].balanceMinor,15000);
  assert.deepEqual(migrateFinanceEvolution(JSON.parse(disk.get('finance_evolution_v1'))),raw);
}
console.log('Savings contributions: rapid writes and cancellations persist before cloud acknowledgement');
