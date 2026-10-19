const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),ts=require(root+'/node_modules/typescript'),source=fs.readFileSync(root+'/src/app.tsx','utf8'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function actual(name){let found;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)found=n.getText(ast);ts.forEachChild(n,visit)}visit(ast);assert(found);return ts.transpileModule(found,{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
const helper={exports:{}};new Function('exports','module',ts.transpileModule(fs.readFileSync(root+'/src/data/currentCatalogAuthority.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText)(helper.exports,helper);
let cases=0;
const period=require(root+'/src/data/periodConfirmation.js');
for(const version of [3,4,5,6]){
 const values=new Map();const catalog={schemaVersion:4,expenseCatalog:{updatedAtMs:100,data:{categories:[{id:'a',icon:'ðŸŽ¯',group:'new'}],groups:[{id:'new',name:'Area aggiornata'}]}}};
 const context={console,Date,userId:'fixture',readCatalogEdits:()=>({}),userKey:key=>'user_fixture_'+key,localStorage:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value),removeItem:key=>values.delete(key)},userStateAuthorityPreferenceKeyAllowed:()=>true,writeUserLocalUpdatedAt:()=>{},dispatchUserStorageRestore:()=>{},reconcileAuthorityCatalogs:helper.exports.reconcileAuthorityCatalogs,lastCloudExpandedDataRef:{current:{}},catalogAnchorV1Ref:{current:{catalogSyncV4:catalog}}};
 for(const v of [3,4,5,6]){context['validUserStateAuthorityV'+v]=()=>true;context['userStateAuthorityV'+v+'RevisionRef']={current:0};}
 context.PERIOD_CONFIRMATION_KEY=period.PERIOD_CONFIRMATION_KEY;context.keepPeriodConfirmation=period.keepPeriodConfirmation;
 vm.createContext(context);vm.runInContext(actual('preservePeriodConfirmation'),context);vm.runInContext(actual('restoreUserStateAuthorityV'+version),context);
 const backup={revision:1,updatedAtMs:1,values:{cats_v10:JSON.stringify([{id:'a',icon:'old',group:'old'}]),expense_groups_v1:JSON.stringify([{id:'old'}]),pref_currency:'"EUR"'}};
 context['restoreUserStateAuthorityV'+version](backup);
 const rows=JSON.parse(values.get('user_fixture_cats_v10'));assert.equal(rows[0].icon,'ðŸŽ¯','A delayed V'+version+' backup must not revert an already received live icon');assert.equal(rows[0].group,'new');assert.equal(values.get('user_fixture_pref_currency'),'"EUR"');cases++;
 catalog.expenseCatalog.data.categories=[];context['restoreUserStateAuthorityV'+version](backup);assert.equal(JSON.parse(values.get('user_fixture_cats_v10')).length,0);cases++;
}
console.log('PASS '+cases+' actual V3-V6 restore regressions; live icon/area/removal survive delayed backup restoration');
