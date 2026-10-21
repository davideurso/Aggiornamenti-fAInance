const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(root+'/node_modules/typescript');
const src=fs.readFileSync(path.join(root,'src/app.tsx'),'utf8');
const ast=ts.createSourceFile('app.tsx',src,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function actual(name){let out;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)out=n.getText(ast);ts.forEachChild(n,visit)}visit(ast);assert(out,name);return ts.transpileModule(out,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;}
const mod={exports:{}};new Function('module','exports',ts.transpileModule(fs.readFileSync(path.join(root,'src/data/currentCatalogAuthority.ts'),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText)(mod,mod.exports);
const reconcile=mod.exports.reconcileAuthorityCatalogs;
const context={userId:'test-account',console,Date};vm.createContext(context);
for(const name of ['validUserStateAuthorityV5','validUserStateAuthorityV6','parseAuthorityStorageValue','applyUserStateAuthorityV5ToCloudData','applyUserStateAuthorityV6ToCloudData'])vm.runInContext(actual(name),context);
const oldCats=Array.from({length:23},(_,i)=>({id:String(i),name:'Categoria '+i})),investment={id:'1792393927258',name:'Investimenti',group:'casa',archived:false,deleted:false};
const currentCats=[...oldCats,investment];
const makeAuthority=cats=>({kind:'user-state-authority-v6',schemaVersion:6,scope:'complete-user-config-backup-v1',uid:'test-account',revision:10,updatedAtMs:10,values:{cats_v10:JSON.stringify(cats),expense_groups_v1:JSON.stringify([{id:'casa'}]),meth_v10:JSON.stringify([{id:'old-method'}]),pref_currency:'"EUR"'}});
const cat=(cats,ts=10)=>({schemaVersion:4,expenseCatalog:{updatedAtMs:ts,data:{categories:cats,groups:[{id:'casa'}]}}});
function hydrate(authority,main,anchor){const effective=reconcile(authority,main,anchor);return context.applyUserStateAuthorityV6ToCloudData({cats:main?.expenseCatalog?.data.categories||[],catalogSyncV4:main},effective);}
let cases=0;
// Exact observed topology: main and anchor 24, private-settings snapshot 23,
// equal timestamps. Exercise the real production overlay functions.
const stale=makeAuthority(oldCats),main=cat(currentCats),anchor=cat(currentCats);
assert.equal(context.applyUserStateAuthorityV6ToCloudData({cats:currentCats,catalogSyncV4:main},stale).cats.length,23);cases++;
const received=hydrate(stale,main,anchor);assert.equal(received.cats.length,24);assert.equal(received.cats.at(-1).name,'Investimenti');cases++;
// PC and phone independently hydrate the same server state, without mutation.
const before=JSON.stringify({stale,main,anchor});const pc=hydrate(stale,main,anchor),phone=hydrate(stale,main,anchor);assert.equal(JSON.stringify(pc.cats),JSON.stringify(phone.cats));assert.equal(JSON.stringify({stale,main,anchor}),before);cases++;
// Removal is a whole catalog, never a union or a greatest-count choice.
assert.equal(hydrate(makeAuthority(currentCats),cat(oldCats,20),cat(currentCats,10)).cats.length,23);cases++;
assert.equal(hydrate(makeAuthority(currentCats),cat([],30),cat(currentCats,20)).cats.length,0);cases++;
const archived=currentCats.map(c=>c.name==='Investimenti'?{...c,archived:true}:c);assert.equal(hydrate(stale,cat(archived,30),cat(currentCats,20)).cats.at(-1).archived,true);cases++;
assert.equal(hydrate(stale,cat(oldCats,10),cat(currentCats,30)).cats.length,24);cases++;
assert.equal(hydrate(stale,cat(currentCats,20),cat(oldCats,20)).cats.length,24);cases++;
assert.equal(hydrate(stale,null,null).cats.length,23);cases++;
const independent={...cat(currentCats),paymentCatalog:{updatedAtMs:100,data:{methods:[{id:'new-method'}],groups:[]}}};
let merged=reconcile(stale,independent,anchor);assert.equal(JSON.parse(merged.values.meth_v10)[0].id,'new-method');assert.equal(merged.values.pref_currency,'"EUR"');cases++;
// Fresh committed server snapshots must re-read a previously loaded backup.
const start=src.indexOf('                if (!userStateAuthorityV6AnchorRef.current ||');const end=src.indexOf('                cloudUserStateAuthorityV6 =',start);assert(start>0&&end>start);
const prefetchStart=src.indexOf('                var catalogAnchorRead =');const prefetchEnd=src.indexOf('              if (!catalogAnchorLoadedRef.current',prefetchStart);assert(prefetchStart>0&&prefetchEnd>prefetchStart);const branch=src.slice(prefetchStart,prefetchEnd)+src.slice(start,end);let reads=0;const refs={current:stale};const live={catalogAnchorLoadedRef:{current:true},readCatalogAnchorV1:async()=>null,snap:{metadata:{fromCache:false,hasPendingWrites:false}},userStateAuthorityV6AnchorRef:refs,readLatestUserStateAuthorityV6:async()=>{reads++;return makeAuthority(currentCats)}};
(async()=>{
 const run=vm.runInNewContext('(async()=>{'+branch+'})',live);await run();assert.equal(reads,1);assert.equal(JSON.parse(refs.current.values.cats_v10).length,24);cases++;
 live.snap.metadata={fromCache:true,hasPendingWrites:false};await run();assert.equal(reads,1);cases++;
 // A late guard cannot revert an actual local user edit.
 let guard;function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='setTimeout'&&n.arguments[0]?.getText(ast).includes('USER STATE V6 LATE OVERRIDE RESTORED'))guard=n.arguments[0].getText(ast);ts.forEachChild(n,visit)}visit(ast);assert(guard);
 let restored=0;const guarded={...stale,__backupId:'old'};const guardContext={cancelled:false,validUserStateAuthorityV6:()=>true,userStateAuthorityV6AnchorRef:{current:guarded},guardedAuthorityV6:guarded,pendingAccountSyncRef:{current:{revision:1}},currentUserStateAuthorityV3Values:()=>({}),userStateAuthorityV3ValuesEqual:()=>false,userStateAuthorityStorageValueEqual:()=>false,restoreUserStateAuthorityV6:()=>restored++,localStorage:{setItem:()=>{}},userKey:x=>x,console};
 const guardCode=ts.transpileModule('var runGuard='+guard,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText+'\nrunGuard();';vm.runInNewContext(guardCode,guardContext);assert.equal(restored,0);cases++;
 guardContext.pendingAccountSyncRef.current.revision=0;guardContext.userStateAuthorityV6AnchorRef.current={...guarded,__backupId:'newer'};vm.runInNewContext(guardCode,guardContext);assert.equal(restored,0);cases++;
 console.log('PASS '+cases+' catalog regressions; reproduced BEFORE=23 / AFTER=24; removal/empty/archive, two simulated sessions, fresh server refresh, pending-local protection');
})().catch(e=>{console.error(e);process.exit(1)});
