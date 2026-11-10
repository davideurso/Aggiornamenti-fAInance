'use strict';
// A06: regression guard for APP-OWNED deletion paths ONLY.
// Never accesses Firebase, actual accounts, the network, or private data.
// External admin-console / batch delete remains unqualified by this test.
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
function source(relative){return fs.readFileSync(path.join(root,relative),'utf8');}
function count(text,re){return [...text.matchAll(re)].length;}
function filesUnder(relative){
 const result=[],skip=new Set(['node_modules','dist','build','test','tests','.git','_backup','_release','assets','email-assets']);
 function walk(dir){
  for(const e of fs.readdirSync(dir,{withFileTypes:true})){
   if(e.isSymbolicLink()||skip.has(e.name))continue;
   const next=path.join(dir,e.name);
   if(e.isDirectory())walk(next);
   else if(/\.(?:js|cjs|mjs|ts|tsx)$/.test(e.name))result.push(next);
  }
 }
 walk(path.join(root,relative));return result;
}
test('A06 client direct deletion uses one Firebase Auth deleteUser after cleanup',()=>{
 const s=source('src/security/accountLifecycle.ts');
 assert.match(s,/await deleteUser\(user\)/);
 assert.equal(count(s,/\bdeleteUser\(user\)/g),1);
 assert(s.indexOf('await deleteAllUserDocuments(uid)')<s.indexOf('await deleteUser(user)'));
 assert(s.indexOf('await deleteDoc(doc(fbDb, "users", uid))')<s.indexOf('await deleteUser(user)'));
});
test('A06 scheduled worker uses one deleteUser, requires eligibility and blocks false success',()=>{
 const s=source('functions/fainanceMaintenance.cjs');
 assert.match(s,/await auth\.deleteUser\(uid\)/);
 assert.equal(count(s,/auth\.deleteUser\(uid\)/g),1);
 assert(s.indexOf('await stillClaimed();')<s.indexOf('await auth.deleteUser(uid)'));
 assert.match(s,/auth\/user-not-found/);
 assert.match(s,/needs_review/);
 assert.match(s,/scheduled-requested>=15\*DAY/);
});
test('A06 entire app source has no deleteUsers() bulk calls (external APIs not audited)',()=>{
 const paths=[...filesUnder('src'),...filesUnder('functions')];
 assert(paths.length>5,'Source directory too small for a meaningful audit');
 const offenders=[];
 for(const p of paths){
  const s=fs.readFileSync(p,'utf8');
  if(/\bdeleteUsers\s*\(/.test(s))offenders.push(path.relative(root,p));
 }
 assert.deepEqual(offenders,[],'Bulk deletion can bypass the Auth deletion observer');
});
test('A06 production observers are server-only and private reader is separate',()=>{
 const s=source('functions/index.js');
 assert.match(s,/exports\.fainanceDeletionAuthObservedProd/);
 assert.match(s,/\.auth\.user\(\)\.onDelete/);
 assert.match(s,/exports\.fainanceDeletionRequestObservedProd/);
 assert.match(s,/document:'accountDeletionRequests\/\{uid\}'/);
 assert.match(s,/exports\.fainanceDeletionWorkletProd/);
 assert.match(s,/invoker:\['growth-play-reader@fainance-mundely-admin\.iam\.gserviceaccount\.com'\]/);
});
test('A06 audit scope excludes console/API bulk deletes from any completeness claim',()=>{
 // Deliberately explicit: static source checks alone cannot certify
 // deletions through the Firebase Admin API outside this application.
 const scope={clientSingleDelete:true,serverSingleDelete:true,
  externalConsoleChecked:false,externalBatchDeleteCaptured:false,
  wholeAppPopulationQualified:false};
 assert.equal(scope.externalBatchDeleteCaptured,false);
 assert.equal(scope.wholeAppPopulationQualified,false);
});
