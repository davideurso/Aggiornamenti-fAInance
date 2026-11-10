import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { loadTypeScript } from './loadTypeScript.mjs';
const {readExistingCachedDocument,serializeSnapshotHandler,restoreResumeTab}=loadTypeScript('src/utils/resumeCache.ts');
const {needsCategoryRecovery}=loadTypeScript('src/utils/resumeCache.ts');
const {writeResumeCheckpoint,hasResumeCheckpoint}=loadTypeScript('src/utils/resumeCache.ts');
const disk=new Map([['user_a_exp_v10','[{"id":"pending-local"}]'],['user_a_cats_v10','[]']]);
const local={getItem:key=>disk.get(key)??null,setItem:(key,value)=>disk.set(key,value)};
assert.equal(hasResumeCheckpoint(local,'a'),false,'First install must fully initialize');
writeResumeCheckpoint(local,'a',['exp_v10','cats_v10']);
assert.equal(hasResumeCheckpoint(local,'a'),true);
assert.equal(hasResumeCheckpoint(local,'b'),false,'Never restore another account');
disk.set('user_a_exp_v10','[{"id":"later-offline-edit"}]');
assert.equal(hasResumeCheckpoint(local,'a'),true,'Valid later edits remain resumable');
disk.delete('user_a_cats_v10');assert.equal(hasResumeCheckpoint(local,'a'),false,'Partial cache must not be shown');
disk.set('user_a_cats_v10','broken');assert.equal(hasResumeCheckpoint(local,'a'),false,'Corrupt cache must not be shown');
disk.set('user_a_cats_v10','[]');disk.set('user_a_resume_checkpoint_v1','{"version":2,"uid":"a","keys":["exp_v10"]}');
assert.equal(hasResumeCheckpoint(local,'a'),false,'Unknown checkpoint versions must take the full path');
const recovered=category=>!!category?.recovered;
assert.equal(needsCategoryRecovery([{id:1}],[{catId:'1'}],recovered),false,'Complete catalogs must not download backups');
assert.equal(needsCategoryRecovery([{id:1}],[{catId:2}],recovered),true,'Missing referenced categories must retain cloud recovery');
assert.equal(needsCategoryRecovery([{id:1,recovered:true}],[],recovered),true,'Placeholder names must still be recovered');
assert.equal(needsCategoryRecovery([],[],recovered),false);
const cached={exists:()=>true,data:()=>({version:1})};
let liveReads=0;
const live=async()=>{liveReads++;return {exists:()=>true,data:()=>({version:2})};};
assert.equal(await readExistingCachedDocument(async()=>cached,live),cached);
assert.equal(liveReads,0,'Reopening with a cached document must not wait for the network');
await readExistingCachedDocument(async()=>({exists:()=>false}),live);
await readExistingCachedDocument(async()=>{throw Error('cache unavailable');},live);
assert.equal(liveReads,2,'Missing/unavailable cache must use the live read');
await assert.rejects(readExistingCachedDocument(async()=>({exists:()=>false}),async()=>{throw Error('permission-denied');}),/permission-denied/);
let release;
const delayed=new Promise(resolve=>release=resolve), applied=[];
const consume=serializeSnapshotHandler(async value=>{if(value==='cache')await delayed;applied.push(value);});
const first=consume('cache'),second=consume('server');
await Promise.resolve();assert.deepEqual(applied,[]);
release();await Promise.all([first,second]);assert.deepEqual(applied,['cache','server']);
const failureQueue=serializeSnapshotHandler(async value=>{if(value==='bad')throw Error('bad');applied.push(value);});
await assert.rejects(failureQueue('bad'));await failureQueue('recovered');assert.equal(applied.at(-1),'recovered');
const storage={getItem:key=>({'user1:tab':'stats','user2:tab':'spese','invalid:tab':'debtCredits'})[key]};
assert.equal(restoreResumeTab(storage,'user1:tab'),'stats');
assert.equal(restoreResumeTab(storage,'user2:tab'),'spese');
assert.equal(restoreResumeTab(storage,'invalid:tab'),'home','Restricted/unknown routes must not bypass access gates');
assert.equal(restoreResumeTab({getItem:()=>{throw Error('storage disabled');}},'key'),'home');

// Execute the real session resolver with network/storage boundaries substituted.
const file=ts.createSourceFile('session.ts',fs.readFileSync('src/auth/accountSession.ts','utf8'),ts.ScriptTarget.Latest,true);
const fn=file.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name?.text==='resolveAccountSession');
const code=ts.transpileModule(fn.getText(file).replace('export ',''),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
const identity=loadTypeScript('src/auth/accountIdentity.ts');
async function sessionCase(profile,{failProfile=false,failAccount=false}={}) {
 let accountReads=0,writes=0,profileReads=0;
 const ctx={
  measureStartup:(_,promise)=>promise,fainancePromiseTimeout:promise=>promise,
  loadUserProfile:async()=>{profileReads++;if(failProfile)throw Error('offline');return profile;},
  sessionReadFailure:stage=>Error(stage),doc:()=>({}),fbDb:{},
  getDoc:async()=>{accountReads++;if(failAccount)throw Error('offline');return {exists:()=>true,data:()=>({termsAccepted:true,privacyAccepted:true})};},
  fainanceExpandAccountCloudDataV5:async value=>value,
  fainanceResolveLegalAcceptance:identity.fainanceResolveLegalAcceptance,
  splitDisplayName:()=>({firstName:'Test',lastName:''}),
  ensureUsernameLoginAlias:async()=>{},ensureDefaultUsernameForExistingUser:async()=>({username:'test',usernameLower:'test'}),
  buildSessionUserData:(_,value)=>value,mergeUserProfile:async()=>{writes++;},
 };
 const resolve=new Function(...Object.keys(ctx),code+';return resolveAccountSession;')(...Object.values(ctx));
 let result,error;try{result=await resolve({uid:'test-user',email:'test@example.invalid'});}catch(e){error=e;}
 return {result,error,accountReads,writes,profileReads};
}
const profile={username:'test',name:'Test',termsAccepted:true,privacyAccepted:true,deletionStatus:'pending',deletionScheduledAt:'2020-01-01'};
const ready=await sessionCase(profile);
assert.equal(ready.profileReads,1);assert.equal(ready.accountReads,0);
assert.equal(ready.result.deletionStatus,'pending','Fresh deletion state must reach the existing access gate');
const legacy=await sessionCase({username:'test',name:'Test'});assert.equal(legacy.accountReads,1);assert(legacy.result.legalAcceptanceV2);
const denied=await sessionCase(profile,{failProfile:true});assert(denied.error);assert.equal(denied.writes,0);assert.equal(denied.accountReads,0);
const missing=await sessionCase({username:'test'},{failAccount:true});assert(missing.error);assert.equal(missing.writes,0);
console.log('PASS: cache fallback, ordered refresh, account isolation, restored section, fresh access checks and legacy login.');

const app=ts.createSourceFile('app.tsx',fs.readFileSync('src/app.tsx','utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function actualFunction(name,ctx){
 let node;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)node=n;else ts.forEachChild(n,visit);}visit(app);assert(node);
 const js=ts.transpileModule(node.getText(app),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 return new Function(...Object.keys(ctx),js+`;return ${name};`)(...Object.values(ctx));
}
let durablePending=0,recoveryScheduled=0;
const pendingRef={current:{revision:0,token:''}};
const mark=actualFunction('markPendingAccountSync',{
 firestoreHydratedRef:{current:true},applyingFirestoreRef:{current:false},pendingAccountSyncRef:pendingRef,
 markAccountSyncPendingOnDevice:()=>durablePending++,scheduleCompleteAccountRecoverySnapshot:()=>recoveryScheduled++,
 accountSyncSavingRef:{current:false},accountSyncRetryRequestedRef:{current:false}
});
mark();assert.equal(durablePending,1);assert.equal(pendingRef.current.revision,1);assert.equal(recoveryScheduled,1);
// The actual save function must stop at its schema gate before it can construct
// a request, even though local edits are enabled while the cache is visible.
await actualFunction('saveToFirestore',{financeSchemaCompatibleRef:{current:false}})();
let backups=0;
const backupPending={current:false};
const background=actualFunction('deferCriticalAccountData',{accountRecoveryPendingRef:backupPending,persistCompleteAccountRecoverySnapshot:()=>{backups++;backupPending.current=false;}});
background();assert.equal(backups,0,'Unchanged background transitions must allocate no full-account backup');
backupPending.current=true;background();background();
assert.equal(backups,1);assert.equal(pendingRef.current.revision,1,'Backgrounding must not manufacture a new edit');
console.log('PASS: cache-visible edits remain durable; remote saves stay gated; backgrounding creates no new revision.');
