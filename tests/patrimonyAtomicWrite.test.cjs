const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),vm=require('vm');
const A='C:/Users/Davide/Documents/Progetti/01 - fAInance/App',ts=require(A+'/node_modules/typescript');
test('actual Test account writer retries atomically and preserves the latest remote Patrimonio',async()=>{
 const {preserveNewerPatrimony}=await import('../src/finance/patrimonyWriteConflict.js');
 const source=fs.readFileSync(A+'/src/app.tsx','utf8'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);let fn;
 function walk(n){if(ts.isFunctionDeclaration(n)&&n.name?.text==='writeCompactAccountDocument')fn=n.getText(ast);ts.forEachChild(n,walk)}walk(ast);assert.ok(fn);
 let attempts=0,committed;
 const context={preserveNewerPatrimony,userId:'uid',financeSchemaCompatibleRef:{current:true},userStateAuthorityV6ValidatedUidRef:{current:'uid'},assertFinanceWriteReady:()=>{},lastCloudExpandedDataRef:{current:{}},lastCloudRawKeysRef:{current:[]},movementSyncV2ActiveRef:{current:false},fbDb:{app:{options:{projectId:'fainance-test-20260823195207'}}},fainanceExpandAccountCloudDataV5:async x=>x,fainanceCompressAccountDataV5:async x=>({value:JSON.stringify(x),encoding:'test',rawBytes:1,compressedBytes:1}),deleteField:()=>null,setDoc:()=>{throw Error('Test write must use transaction')},notifyGrowthSourceCommitted:()=>{},setFinanceCloudReceipt:()=>{},runTransaction:async(db,callback)=>{
  for(const stamp of [20,30]){attempts++;await callback({get:async()=>({exists:()=>true,data:()=>({patrimonioDataUpdatedAt:stamp,patrimonioValues:{a:stamp===30?0:20},patrimonioHistory:{nov:{a:stamp===30?0:20}}})}),set:(ref,write)=>{committed=JSON.parse(write.accountDataCompressedV5)}})};
 }};
 vm.createContext(context);vm.runInContext(ts.transpileModule(fn,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
 await context.writeCompactAccountDocument({id:'uid'},{patrimonioDataUpdatedAt:10,patrimonioValues:{a:99},expenses:[{id:'preserve'}]});
 assert.equal(attempts,2);assert.equal(committed.patrimonioDataUpdatedAt,30);assert.equal(committed.patrimonioValues.a,0);assert.equal(committed.patrimonioHistory.nov.a,0);assert.equal(committed.expenses[0].id,'preserve');
});
