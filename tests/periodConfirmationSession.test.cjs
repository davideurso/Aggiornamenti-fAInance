const fs=require('fs'),path=require('path'),vm=require('vm'),assert=require('node:assert/strict');
const root=process.cwd(),arg=process.argv.indexOf('--source'),file=arg<0?root+'/src/app.tsx':process.argv[arg+1];
const ts=require(root+'/node_modules/typescript'),source=fs.readFileSync(file,'utf8'),ast=ts.createSourceFile('app.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const candidateRoot=path.dirname(file);
const helperFile=candidateRoot+'/data/periodConfirmation.js';
let helperSource=fs.readFileSync(helperFile,'utf8').replace("'../finance/periodEngine.js'",JSON.stringify(root+'/src/finance/periodEngine.js'));
const helper={exports:{}};new Function('exports','module','require',ts.transpileModule(helperSource,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText)(helper.exports,helper,require);
const {PERIOD_CONFIRMATION_KEY,readPeriodConfirmation,keepPeriodConfirmation}=helper.exports;
const finance=require(root+'/src/data/financeEvolution.js');
function actual(name){let node;function visit(n){if(ts.isFunctionDeclaration(n)&&n.name?.text===name)node=n;ts.forEachChild(n,visit)}visit(ast);assert(node,name);return ts.transpileModule(node.getText(ast),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;}
function preferenceKeys(){let text;function visit(n){if(ts.isVariableDeclaration(n)&&n.name.getText(ast)==='USER_STATE_AUTHORITY_PREFERENCE_KEYS_V2')text=n.initializer.getText(ast);ts.forEachChild(n,visit)}visit(ast);return vm.runInNewContext('('+text+')');}
const {scenario}=require(root+'/tests/logoutCloudConfirmation.test.cjs');
const copy=x=>JSON.parse(JSON.stringify(x));
function owner(uid,store=new Map()){
 const base=scenario('valid'),c=base.context;c.userId=uid;c.userKey=k=>'user_'+uid+'_'+k;
 c.userStateAuthorityV6ValidatedUidRef.current=uid;c.localStorage={getItem:k=>store.get(k)||null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)};

 // Object.keys(localStorage) must enumerate persisted keys, as real Storage does.
 c.localStorage=new Proxy(c.localStorage,{ownKeys:()=>[...store.keys()],getOwnPropertyDescriptor:()=>({enumerable:true,configurable:true})});
 Object.assign(c,{PERIOD_CONFIRMATION_KEY,readPeriodConfirmation,keepPeriodConfirmation,USER_STATE_AUTHORITY_PREFERENCE_KEYS_V2:preferenceKeys(),migrateFinanceEvolution:finance.migrateFinanceEvolution,trackAutomaticRuleLocalChange:(_a,b)=>b,syncJsonEqual:(a,b)=>JSON.stringify(a)===JSON.stringify(b),financeEvolutionRef:{current:finance.createFinanceEvolution()},setFinanceEvolutionRaw:v=>c.financeEvolutionRef.current=v,setPeriodConfirmationRaw:()=>{},writeUserLocalUpdatedAt:(k,v)=>store.set(c.userKey(k+'_updated_at'),String(v)),readCatalogEdits:()=>({}),reconcileAuthorityCatalogs:v=>v,lastCloudExpandedDataRef:{current:{}},catalogAnchorV1Ref:{current:null},writeResumeCheckpoint:()=>{},dispatchUserStorageRestore:()=>{}});
 for(const name of ['preservePeriodConfirmation','userStateAuthorityPreferenceKeyAllowed','readUserPreferenceStorageSnapshotV2','currentUserStateAuthorityV3Values','setFinanceEvolution','restoreUserStateAuthorityV6'])vm.runInContext(actual(name),c);
 return {c,store,base};
}
function confirmation(c){return readPeriodConfirmation(c.localStorage.getItem(c.userKey(PERIOD_CONFIRMATION_KEY)));}
function hydrateConfirmedPeriod(c){let callback;function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(ast)==='useEffect'&&n.arguments[0]?.getText(ast).includes('if (!periodConfirmation) setFinanceEvolution'))callback=n.arguments[0].getText(ast);ts.forEachChild(n,visit)}visit(ast);assert(callback);Object.assign(c,{firestoreReady:true,financeCloudReceipt:{uid:c.userId},financeEvolution:c.financeEvolutionRef.current,periodConfirmation:confirmation(c)});vm.runInContext(ts.transpileModule('const hydrate='+callback+';hydrate();',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText,c);}
function prompt(c){let guard;function visit(n){if(ts.isJsxSelfClosingElement(n)&&n.tagName.getText(ast)==='PeriodPreferences'&&n.attributes.getText(ast).includes('introduction'))guard=n.parent.left.getText(ast);ts.forEachChild(n,visit)}visit(ast);assert(guard);const code=ts.transpileModule('function visible(){return '+guard+';}',{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
 Object.assign(c,{firestoreReady:true,financeCloudReceipt:{uid:c.userId,value:c.financeEvolutionRef.current},appLocked:false,termsAccepted:true,privacyAccepted:true,initialSetupOpen:false,onboardingGuideOpen:false,financeEvolution:c.financeEvolutionRef.current,periodConfirmation:confirmation(c)});vm.runInContext(code,c);return c.visible();}
(async()=>{
 let count=0;
 for(const settings of [{mode:'calendar',startDay:1},{mode:'financial',startDay:26}]){
  const session=owner('same-owner'),{c,store}=session;assert.equal(prompt(c),true);
  c.setFinanceEvolution(v=>({...v,period:settings,periodIntroductionSeen:true}));assert.equal(prompt(c),false);assert.deepEqual(confirmation(c).period,settings);
  let durable; c.saveUserStateAuthorityBackupV6=async({authority})=>{durable=copy(authority);return{id:'confirmed-period'}};
  c.readUserStateAuthorityBackupV6ById=async(_uid,id)=>id==='confirmed-period'?copy(durable):null;
  assert.equal(await c.flushUserStateAndLogout(),true);assert.equal(session.base.counts().logout,1);assert(durable.values[PERIOD_CONFIRMATION_KEY]);
  // Fresh login has no memory/cache. Only the server-confirmed V6 backup survives.
  const login=owner('same-owner');assert.equal(login.c.restoreUserStateAuthorityV6(durable),true);assert.deepEqual(confirmation(login.c).period,settings);hydrateConfirmedPeriod(login.c);assert.deepEqual(copy(login.c.financeEvolutionRef.current.period),settings);assert.equal(login.c.financeEvolutionRef.current.periodIntroductionSeen,true);assert.equal(prompt(login.c),false);
  // A delayed pre-feature snapshot must not erase the one-time confirmation.
  login.c.restoreUserStateAuthorityV6({...durable,values:{pref_cur:'"EUR"'}});assert.equal(prompt(login.c),false);
  // A second device restores the same owner; another account gets no marker.
  const second=owner('same-owner');second.c.restoreUserStateAuthorityV6(durable);assert.equal(prompt(second.c),false);
  const other=owner('another-owner',store);assert.equal(confirmation(other.c),null);assert.equal(prompt(other.c),true);
  count+=6;
 }
 {const {c}=owner('legacy');c.localStorage.setItem(c.userKey('finance_evolution_v1'),JSON.stringify({...finance.createFinanceEvolution(),periodIntroductionSeen:true,period:{mode:'financial',startDay:27}}));const values=c.readUserPreferenceStorageSnapshotV2();assert.equal(readPeriodConfirmation(values[PERIOD_CONFIRMATION_KEY]).period.startDay,27);count++;}
 {const v=keepPeriodConfirmation({[PERIOD_CONFIRMATION_KEY]:'{"confirmed":false}'},JSON.stringify({confirmed:true,period:{mode:'financial',startDay:26},updatedAt:10}),null,0);assert.equal(readPeriodConfirmation(v[PERIOD_CONFIRMATION_KEY]).period.startDay,26);count++;}
 {const v=keepPeriodConfirmation({[PERIOD_CONFIRMATION_KEY]:JSON.stringify({confirmed:true,period:{mode:'financial',startDay:15},updatedAt:20})},JSON.stringify({confirmed:true,period:{mode:'financial',startDay:26},updatedAt:10}),null,0);assert.equal(readPeriodConfirmation(v[PERIOD_CONFIRMATION_KEY]).period.startDay,15);count++;}
 console.log('PASS '+count+' period/session checks: real setter, verified V6 logout, fresh-login restore, second device, delayed legacy backup, owner isolation, existing confirmation migration');
})().catch(e=>{console.error(e);process.exit(1)});
