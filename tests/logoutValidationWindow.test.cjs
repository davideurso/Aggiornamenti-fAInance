const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict'),{pathToFileURL}=require('url');
const {scenario,source}=require('./logoutCloudConfirmation.test.cjs'),ts=require(process.cwd()+'/node_modules/typescript');
(async()=>{
 const before=process.argv.includes('--reproduce-window-before');
 {const s=scenario('valid');s.context.financeSchemaCompatibleRef.current=false;const ok=await s.context.flushUserStateAndLogout();if(before){assert.equal(ok,false);assert.equal(s.counts().writes,0);assert.equal(s.counts().logout,0);console.log('REPRODUCED DEVICE STATE: schema=false, hydrated=true, online=true blocks old logout despite previously validated account');return;}assert.equal(ok,true);assert.equal(s.context.financeSchemaCompatibleRef.current,false,'financial writes must remain blocked');assert.equal(s.counts().logout,1);}
 let cases=1;
 {const s=scenario('missing');s.context.financeSchemaCompatibleRef.current=false;assert.equal(await s.context.flushUserStateAndLogout(),true);assert.equal(s.counts().writes,1);assert.equal(s.context.financeSchemaCompatibleRef.current,false);cases++;}
 for(const owner of ['', 'different-account']){const s=scenario('valid');s.context.userStateAuthorityV6ValidatedUidRef.current=owner;assert.equal(await s.context.flushUserStateAndLogout(),false);assert.equal(s.counts().writes,0);assert.equal(s.counts().logout,0);cases++;}
 for(const mode of ['valid','missing']){const s=scenario(mode),read=s.context.readUserStateAuthorityBackupV6ById;s.context.readUserStateAuthorityBackupV6ById=async(uid,id)=>{const result=await read(uid,id);if(id!=='previous'||mode==='valid')s.context.userStateAuthorityV6ValidatedUidRef.current='';return result};assert.equal(await s.context.flushUserStateAndLogout(),false);assert.equal(s.counts().logout,0);cases++;}
 const {migrateFinanceEvolution}=await import(pathToFileURL(path.resolve('src/data/financeEvolution.js')).href);
 const start=source.indexOf('var rawCloud: any = snap.data() || {};');assert(start>0);const tail=source.slice(start);const end=tail.search(/\r?\n              if \(!snap.metadata.fromCache && !snap.metadata.hasPendingWrites\)\r?\n                confirmCatalogEdits/);assert(end>0);const prefix=tail.slice(0,end);const code=ts.transpileModule('async function validateActualIncomingSnapshot(){'+prefix+';return true;}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 for(const mode of ['valid-background','invalid-schema','decode-error','first-load']){
  const s=scenario('valid');if(mode==='first-load')s.context.userStateAuthorityV6ValidatedUidRef.current='';let release;const gate=new Promise(r=>release=r);
  Object.assign(s.context,{snap:{data:()=>({financeEvolution:mode==='invalid-schema'?{schemaVersion:999}:undefined}),metadata:{fromCache:false,hasPendingWrites:false}},cancelled:false,lastCloudRawKeysRef:{current:[]},fainanceExpandAccountCloudDataV5:async x=>{if(mode==='decode-error')throw Error('CLOUD_DATA_UNREADABLE');return x},catalogAnchorLoadedRef:{current:true},catalogAnchorV1Ref:{current:null},readCatalogAnchorV1:()=>gate,readLatestUserStateAuthorityV6:async()=>s.context.userStateAuthorityV6AnchorRef.current,catalogReadFromCache:false,mergeCatalogSyncV4WithAnchor:(a,b)=>b,reconcileAuthorityCatalogs:x=>x,applyUserStateAuthorityV6ToCloudData:d=>d,userStateAuthorityV5AnchorRef:{current:null},validUserStateAuthorityV4:()=>false,validUserStateAuthorityV3:()=>false,migrateFinanceEvolution,setFinanceCloudReceipt:()=>{},setAccountCacheReady:()=>{},setFirestoreReady:()=>{},financeMessage:()=> 'sync',lang:'it'});
  vm.runInContext(code,s.context);const work=s.context.validateActualIncomingSnapshot();await Promise.resolve();await Promise.resolve();
  assert.equal(s.context.financeSchemaCompatibleRef.current,false);
  if(mode==='valid-background'){assert.equal(s.context.userStateAuthorityV6ValidatedUidRef.current,'fixture');assert.equal(await s.context.flushUserStateAndLogout(),true);}
  if(mode==='first-load'){assert.equal(s.context.userStateAuthorityV6ValidatedUidRef.current,'');assert.equal(await s.context.flushUserStateAndLogout(),false);}
  release(null);await work;
  assert.equal(s.context.userStateAuthorityV6ValidatedUidRef.current,['valid-background','first-load'].includes(mode)?'fixture':'');
  if(['invalid-schema','decode-error'].includes(mode)){assert.equal(await s.context.flushUserStateAndLogout(),false);assert.equal(s.counts().logout,0);}
  cases++;
 }
 console.log('PASS '+cases+' actual validation-window regressions: reproduced A55 flags; valid background reads allow verified preference logout; first-load, corrupt/future schema, owner changes remain blocked');
})().catch(e=>{console.error(e);process.exit(1)});
