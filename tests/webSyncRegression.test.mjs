import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import ts from 'typescript';
import { loadTypeScript } from './loadTypeScript.mjs';
import { createFinanceEvolution, selectFinanceEvolution } from '../src/data/financeEvolution.js';
const {readWithDeadline}=loadTypeScript('src/utils/readDeadline.ts');
const {mergeIncomingMovements}=loadTypeScript('src/data/incomingMovements.ts');

test('A new browser with newer default state keeps the period already chosen on the phone',()=>{
  const phone={...createFinanceEvolution(),period:{mode:'financial',startDay:27},periodIntroductionSeen:true};
  const browser=createFinanceEvolution();browser.extraField='newer unrelated browser state';
  const merged=selectFinanceEvolution(browser,phone,200,100);
  assert.deepEqual(merged.period,phone.period);assert.equal(merged.periodIntroductionSeen,true);
  assert.equal(merged.extraField,browser.extraField);
  assert.equal(browser.periodIntroductionSeen,false);
  const calendar={...phone,period:{mode:'calendar',startDay:1}};
  assert.equal(selectFinanceEvolution(createFinanceEvolution(),calendar,200,100).periodIntroductionSeen,true);
  assert.deepEqual(selectFinanceEvolution(phone,browser,100,200).period,phone.period);
  const anotherChoice={...phone,period:{mode:'financial',startDay:5}};
  assert.deepEqual(selectFinanceEvolution(phone,anotherChoice,100,200).period,anotherChoice.period);
  assert.equal(selectFinanceEvolution(undefined,undefined,0,0).periodIntroductionSeen,false);
});

test('Phone income is received while the web has an unacknowledged edit; local income and explicit deletions survive',()=>{
  const localIncome={id:'local',amount:600,date:'2026-09-01',syncUpdatedAtMs:200};
  const oldIncome={id:'local',amount:400,date:'2026-09-01',syncUpdatedAtMs:100};
  const newIncome={id:'phone',amount:900,date:'2026-09-28',syncUpdatedAtMs:300};
  const deletedIncome={id:'removed',amount:50,syncUpdatedAtMs:100};
  const deleted={'income:removed':{deletedAt:400,source:'user',explicit:true}};
  const merged=mergeIncomingMovements({incomes:[localIncome],expenses:[],deleted},
    {incomes:[oldIncome,newIncome,deletedIncome],expenses:[],accountDeletedRecords:{}});
  assert.deepEqual(merged.incomes.map(x=>x.id).sort(),['local','phone']);
  assert.equal(merged.incomes.find(x=>x.id==='local').amount,600);
  const replay=mergeIncomingMovements({...merged},{incomes:[oldIncome,newIncome,deletedIncome]});
  assert.deepEqual(replay,merged);
  assert.equal(mergeIncomingMovements({incomes:[localIncome]},{}).incomes[0].id,'local');
});

test('A read that never replies times out and a late result cannot change the outcome',async()=>{
  let release;const network=new Promise(resolve=>release=resolve);
  await assert.rejects(readWithDeadline(network,15),error=>error.code==='deadline-exceeded');
  release({exists:true});
  assert.deepEqual(await readWithDeadline(Promise.resolve({exists:false}),100),{exists:false});
  await assert.rejects(readWithDeadline(Promise.reject(new Error('offline')),100),/offline/);
});

test('The actual movement engine recovers after a stalled metadata read instead of remaining inactive',async()=>{
  let stalled=true;let watch;
  const snapshot=state=>({exists:()=>true,data:()=>({schemaVersion:2,state})});
  const firestore={
    doc:(db,...parts)=>parts.join('/'),collection:(db,...parts)=>parts.join('/'),
    getDocFromCache:async()=>({exists:()=>false}),
    getDocFromServer:()=>stalled?new Promise(()=>{}):Promise.resolve(snapshot('enabled-clean')),
    getDocsFromServer:async()=>({docs:[]}),setDoc:async()=>{},waitForPendingWrites:async()=>{},
    onSnapshot:(ref,options,listener)=>{watch=listener;return ()=>{};},
  };
  const source=fs.readFileSync('src/data/movementSyncCleanV2.ts','utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const box={exports:{}};
  const requireMock=name=>{
    if(name==='firebase/firestore')return firestore;
    if(name==='@capacitor/preferences')return {Preferences:{get:async()=>({value:null}),set:async()=>{}}};
    if(name==='../firebase/client')return {fbDb:{}};
    if(name==='../utils/readDeadline')return {readWithDeadline:promise=>readWithDeadline(promise,15)};
    return loadTypeScript('src/data/'+name+'.ts');
  };
  new Function('require','module','exports',code)(requireMock,box,box.exports);
  const engine=box.exports;
  const unavailable=await engine.movementSyncV2AccountStatus('test-user',[],[]);
  assert.equal(unavailable.reason,'status-check-unavailable');assert.equal(unavailable.active,false);
  stalled=false;
  const recovered=await engine.movementSyncV2AccountStatus('test-user',[],[]);
  assert.equal(recovered.active,true);
  let received;
  engine.watchMovementSyncV2('test-user',rows=>received=engine.movementStateFromV2(rows));
  watch({docs:[{data:()=>({uid:'test-user',kind:'income',recordId:'income:phone',payload:{id:'phone',amount:900,date:'2026-09-28'},updatedAtMs:300})}],metadata:{fromCache:false,hasPendingWrites:false}});
  assert.equal(received.incomes[0].amount,900);
});

test('Opening the period dialog requires applied server data; unavailable movement status schedules another check',()=>{
  const source=fs.readFileSync('src/app.tsx','utf8');
  const tree=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
  const nodes=[];const visit=n=>{nodes.push(n);ts.forEachChild(n,visit);};visit(tree);
  const retry=nodes.find(n=>ts.isIfStatement(n)&&n.expression.getText(tree).includes('migrationReason === "status-check-unavailable"'));
  assert(retry);
  let attempts=0;
  const code=ts.transpileModule(retry.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const run=new Function('migrationReason','isOffline','scheduleMigrationRetry',code);
  run('status-check-unavailable',false,()=>attempts++);assert.equal(attempts,1);
  run('status-check-unavailable',true,()=>attempts++);assert.equal(attempts,1);
  const dialog=nodes.find(n=>ts.isJsxSelfClosingElement(n)&&n.tagName.getText(tree)==='PeriodPreferences'&&n.attributes.getText(tree).includes('introduction'));
  assert(dialog);
  const expression=dialog.parent;
  assert(expression.getText(tree).includes('financeCloudReceipt?.uid === userId'));
  const transformed=ts.transform(expression,[context=>{
    const visit=node=>ts.isJsxSelfClosingElement(node)?ts.factory.createTrue():ts.visitEachChild(node,visit,context);
    return node=>ts.visitNode(node,visit);
  }]);
  const condition=ts.createPrinter().printNode(ts.EmitHint.Expression,transformed.transformed[0],tree);
  const js=ts.transpileModule('const result='+condition+';',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  const context={firestoreReady:true,firestoreHydratedRef:{current:true},financeCloudReceipt:null,userId:'web-user',appLocked:false,termsAccepted:true,privacyAccepted:true,initialSetupOpen:false,onboardingGuideOpen:false,financeEvolution:createFinanceEvolution()};
  const visible=overrides=>{const values={...context,...overrides};return new Function(...Object.keys(values),js+'return !!result;')(...Object.values(values));};
  assert.equal(visible({}),false,'Startup timeout or cached hydration cannot open the prompt');
  assert.equal(visible({financeCloudReceipt:{uid:'other-user'}}),false);
  assert.equal(visible({financeCloudReceipt:{uid:'web-user'}}),true,'A truly unconfigured confirmed account is still asked');
  assert.equal(visible({financeCloudReceipt:{uid:'web-user'},financeEvolution:{periodIntroductionSeen:true}}),false);
  transformed.dispose();
});
