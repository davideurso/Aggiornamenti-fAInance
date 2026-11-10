const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(root+'/node_modules/typescript'),source=fs.readFileSync(root+'/src/app.tsx','utf8'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function actual(name){let found;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n.getText(ast);ts.forEachChild(n,visit)}visit(ast);assert(found,name);return ts.transpileModule(found,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
let effect;function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes('Catalog realtime listener unavailable'))effect=n.arguments[0].getText(ast);ts.forEachChild(n,visit)}visit(ast);assert(effect);
let receive,unsubscribed=false,depth=0,calls=[];
const context={legacyCatalogWritePending:()=>false,preserveLegacyCatalogIntent:()=>{},userId:'fixture',catalogRealtimeRefreshRef:{current:null},catalogAnchorV1Ref:{current:null},catalogAnchorLoadedRef:{current:false},financeSchemaCompatibleRef:{current:true},firestoreHydratedRef:{current:true},catalogAnchorDocRefV1:()=>({path:'fixture-anchor'}),onSnapshot:(ref,options,fn)=>{receive=fn;return()=>{unsubscribed=true}},beginRemoteApply:()=>depth++,endRemoteApply:()=>depth--,console};
for(const name of ['setCats','setMethods','setExpenseGroups','setMethodGroups','setIncomeGroups','setCustomIncomeTypes','setIncomeTypeOverrides'])context[name]=value=>calls.push({name,value});
vm.createContext(context);for(const name of ['validCatalogSyncV4','mergeCatalogSyncV4WithAnchor'])vm.runInContext(actual(name),context);
vm.runInContext(ts.transpileModule('var start='+effect,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,context);
const cleanup=context.start();let cases=0;
function anchor(stamp,categories){return{kind:'catalog-sync-anchor-v1',uid:'fixture',catalogSyncV4:{schemaVersion:4,expenseCatalog:{updatedAtMs:stamp,data:{categories,groups:[]}}}}}
function deliver(value,metadata={fromCache:false,hasPendingWrites:false}){receive({exists:()=>true,data:()=>value,metadata})}
deliver(anchor(10,[{id:'a',icon:'💰',group:'new'}]));assert.equal(calls[0].name,'setCats');assert.equal(calls[0].value[0].icon,'💰');assert.equal(depth,0);cases++;
deliver(anchor(20,[{id:'a',icon:'🎯'}]));deliver(anchor(10,[{id:'a',icon:'old'}]));assert.equal(calls.filter(c=>c.name==='setCats').at(-1).value[0].icon,'🎯');cases++;
// Intentional empty catalog and default-looking catalogs are valid newer data.
deliver(anchor(30,[]));assert.equal(calls.filter(c=>c.name==='setCats').at(-1).value.length,0);cases++;
let before=calls.length;deliver({...anchor(40,[]),uid:'different'});assert.equal(calls.length,before);cases++;
deliver(anchor(40,[]),{fromCache:false,hasPendingWrites:true});assert.equal(calls.length,before);cases++;
deliver(anchor(40,'malformed'));assert.equal(calls.length,before);assert.equal(depth,0);cases++;
context.financeSchemaCompatibleRef.current=false;deliver(anchor(50,[{id:'buffered'}]));assert.equal(calls.length,before);assert.equal(context.catalogAnchorV1Ref.current.catalogSyncV4.expenseCatalog.data.categories[0].id,'buffered');cases++;
context.financeSchemaCompatibleRef.current=true;context.catalogRealtimeRefreshRef.current();assert.equal(calls.filter(c=>c.name==='setCats').at(-1).value[0].id,'buffered');cases++;
before=calls.length;cleanup();deliver(anchor(60,[]));assert.equal(calls.length,before);assert(unsubscribed);assert.equal(context.catalogRealtimeRefreshRef.current,null);cases++;
console.log('PASS '+cases+' actual realtime-catalog listener regressions; stale/empty/invalid/pending/UID/hydration/unsubscribe');
