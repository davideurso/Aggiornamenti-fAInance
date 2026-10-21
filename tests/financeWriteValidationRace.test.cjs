const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root='C:/Users/Davide/Documents/Progetti/01 - fAInance/App',ts=require(root+'/node_modules/typescript');
const staged=process.argv.includes('--virtual')?new Map(JSON.parse(fs.readFileSync(path.join(__dirname,'staged-files.json'),'utf8'))):new Map();
const read=p=>staged.get(p)??fs.readFileSync(path.join(root,p),'utf8');
const emit=s=>ts.transpileModule(s,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
const gateModule={exports:{}};new Function('module','exports',emit(read('src/data/financeWriteGate.ts')))(gateModule,gateModule.exports);
const syncModule={exports:{}};new Function('module','exports',emit(read('src/data/syncAlgorithms.ts')))(syncModule,syncModule.exports);
const source=read('src/app.tsx'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function node(name){const found=[];function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found.push(n);ts.forEachChild(n,walk)}walk(ast);assert.equal(found.length,1);return found[0];}
function context(){let writes=[],compressed=[],logs=[],toasts=[];
 const c=vm.createContext({...gateModule.exports,...syncModule.exports,Date,Math,Object,Array,Set,JSON,userId:'account-A',financeSchemaCompatibleRef:{current:true},userStateAuthorityV6ValidatedUidRef:{current:'account-A'},lastCloudExpandedDataRef:{current:{financeEvolution:{schemaVersion:1,period:{mode:'calendar'}},recurring:[{id:'r1'}]}},movementSyncV2ActiveRef:{current:false},lastCloudRawKeysRef:{current:[]},setFinanceCloudReceipt:v=>{c.receipt=v},deleteField:()=>({deleted:true}),setDoc:async(ref,data,opts)=>{writes.push({ref,data,opts})},fainanceCompressAccountDataV5:async data=>{compressed.push(data);return {value:'encoded',encoding:'test',rawBytes:100,compressedBytes:50}},pendingAccountSyncRef:{current:{revision:7,token:'write'}},capturedRevision:7,writeToken:'write',accountSyncErrorToastAtRef:{current:0},localStorage:{getItem:()=>null,setItem:()=>{}},userKey:k=>'user_A_'+k,console:{error:(...v)=>logs.push(v)},persistAccountSyncError:(...v)=>logs.push(v),markAccountSyncPendingOnDevice:()=>{c.pendingMarked=true},L:x=>x,setToast:v=>toasts.push(v),accountSyncRetryRequestedRef:{current:false},accountSyncRetryDelay:180});
 vm.runInContext(emit(node('writeCompactAccountDocument').getText(ast)),c);
 let catchNode;function walk(n){if(ts.isCatchClause(n)&&n.block.getText(ast).includes('var validationPending ='))catchNode=n;ts.forEachChild(n,walk)}walk(node('saveToFirestore'));assert(catchNode);
 vm.runInContext(emit('function testActualSaveCatch(e) '+catchNode.block.getText(ast)),c);return {c,writes,compressed,logs,toasts};
}
(async()=>{
 let cases=0,x=context();x.c.financeSchemaCompatibleRef.current=false;
 await assert.rejects(x.c.writeCompactAccountDocument({id:'account-A'},{cats:[{id:'new'}]}),e=>e.message==='FINANCE_SCHEMA_VALIDATION_PENDING'&&e.code==='aborted');assert.equal(x.writes.length,0);cases++;
 x.c.userStateAuthorityV6ValidatedUidRef.current='';await assert.rejects(x.c.writeCompactAccountDocument({id:'account-A'},{}),/UNSUPPORTED_FINANCE_SCHEMA/);assert.equal(x.writes.length,0);cases++;
 x.c.userStateAuthorityV6ValidatedUidRef.current='another-account';await assert.rejects(x.c.writeCompactAccountDocument({id:'account-A'},{}),/UNSUPPORTED_FINANCE_SCHEMA/);cases++;
 x.c.financeSchemaCompatibleRef.current=true;await assert.rejects(x.c.writeCompactAccountDocument({id:'account-A'},{}),/UNSUPPORTED_FINANCE_SCHEMA/);assert.equal(x.writes.length,0);cases++;
 x=context();let finishCompression;x.c.fainanceCompressAccountDataV5=()=>new Promise(resolve=>{finishCompression=resolve});const write=x.c.writeCompactAccountDocument({id:'account-A'},{cats:[{id:'new'}]});
 x.c.financeSchemaCompatibleRef.current=false;finishCompression({value:'encoded',encoding:'test',rawBytes:100,compressedBytes:50});await assert.rejects(write,e=>e.message==='FINANCE_SCHEMA_VALIDATION_PENDING'&&e.code==='aborted');assert.equal(x.writes.length,0);cases++;
 x.c.financeSchemaCompatibleRef.current=true;x.c.fainanceCompressAccountDataV5=async()=>({value:'encoded',encoding:'test',rawBytes:100,compressedBytes:50});await x.c.writeCompactAccountDocument({id:'account-A'},{cats:[{id:'new'}]});assert.equal(x.writes.length,1);assert.equal(x.c.receipt.uid,'account-A');assert.equal(x.c.lastCloudExpandedDataRef.current.recurring[0].id,'r1');cases++;
 x=context();x.c.testActualSaveCatch(Object.assign(new Error('FINANCE_SCHEMA_VALIDATION_PENDING'),{code:'aborted'}));assert.equal(x.logs.length,0);assert.equal(x.toasts.length,0);assert.equal(x.c.accountSyncRetryDelay,350);assert.equal(x.c.pendingAccountSyncRef.current.revision,7);assert.equal(x.c.pendingAccountSyncRef.current.token,'');assert.equal(x.c.pendingMarked,true);assert.equal(x.c.accountSyncRetryRequestedRef.current,true);cases++;
 x=context();x.c.pendingAccountSyncRef.current.revision=11;x.c.testActualSaveCatch(Object.assign(new Error('FINANCE_SCHEMA_VALIDATION_PENDING'),{code:'aborted'}));assert.equal(x.c.pendingAccountSyncRef.current.revision,11,'Newer edits survive the deferred write');cases++;
 x=context();x.c.testActualSaveCatch(new Error('UNSUPPORTED_FINANCE_SCHEMA'));assert(x.logs.length>0);assert.equal(x.toasts.length,1);assert.equal(x.c.accountSyncRetryDelay,30000);assert.equal(x.c.pendingAccountSyncRef.current.revision,7);cases++;
 const {migrateFinanceEvolution}=await import(require('url').pathToFileURL(path.join(root,'src/data/financeEvolution.js')).href);assert.throws(()=>migrateFinanceEvolution({schemaVersion:2}),/UNSUPPORTED_FINANCE_SCHEMA/);cases++;
 console.log('PASS '+cases+' actual financial-writer race cases: pending snapshot retries, compression race, account isolation, pending revision retained, future schema blocked; no cloud writes.');
})().catch(e=>{console.error(e.stack);process.exitCode=1});
