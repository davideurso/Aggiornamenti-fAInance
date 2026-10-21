import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createFinanceEvolution, migrateFinanceEvolution, mergeFinanceEvolution } from '../src/data/financeEvolution.js';
import { saveSavingsEntry, cancelSavingsEntry } from '../src/finance/savingsLedger.js';
import { saveBudgetForPeriod } from '../src/finance/budgetEngine.js';
import { createSavingsBucket, updateSavingsBucket } from '../src/finance/savingsBuckets.js';
const source=fs.readFileSync('src/settings/SettingsPanel.tsx','utf8');
const tree=ts.createSourceFile('SettingsPanel.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function find(name) {
  let found;
  function visit(node) { if(ts.isFunctionDeclaration(node)&&node.name?.text===name) found=node; else ts.forEachChild(node,visit); }
  visit(tree); assert(found,'Missing actual backup function '+name); return found;
}
function callable(name,context) {
  const code=ts.transpileModule(find(name).getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
  return new Function(...Object.keys(context),`${code}; return ${name};`)(...Object.values(context));
}
const legacy={income:3000,items:[{catId:1,amount:200}]};
let finance=updateSavingsBucket(createSavingsBucket(saveBudgetForPeriod(createFinanceEvolution(),legacy,'2026-08',{...legacy,items:[{catId:1,amount:350}]},'month'),{id:'travel',name:'Viaggio',currency:'EUR'}),'travel',{active:false});
finance.period={mode:'financial',startDay:27};
finance.budget.overrides['2026-08'].savingsPlannedAmounts={travel:250};
finance.budget.overrides['2026-08'].savingsPlanCurrency='EUR';
finance=updateSavingsBucket(finance,'travel',{active:true});
const entry={id:'deposit',bucketId:'travel',currency:'EUR',date:'2026-08-27',amountMinor:15000,source:'planned'};
finance=saveSavingsEntry(finance,entry,'2026-09-14T08:00:00Z');
finance=saveSavingsEntry(finance,{...entry,id:'extra',amountMinor:3000,source:'extra'},'2026-09-14T08:00:00Z');
finance=saveSavingsEntry(finance,{...entry,amountMinor:14000,expectedRevision:0},'2026-09-14T08:01:00Z');
finance=cancelSavingsEntry(finance,'extra',0,'2026-09-14T08:02:00Z');
finance=updateSavingsBucket(finance,'travel',{active:false});
const context={shareDefaultCategoryId:undefined};
function collectDefaults(node){if(ts.isShorthandPropertyAssignment(node)) context[node.name.text]=undefined;ts.forEachChild(node,collectDefaults);}
collectDefaults(find('buildBackupPayload'));
Object.assign(context,{financeEvolution:finance,migrateFinanceEvolution,budgetPlan:legacy,
  expenses:[{id:'expense',date:'2026-06-26',amount:12.34}],incomes:[{id:'income',date:'2026-05-27',amount:3000}],
  bankCoords:[],creditCards:[],userId:'synthetic-test-user',incomeTypeOrder:[],catOrder:[],methodOrder:[],
  fainanceEncryptSensitiveData:async value=>({testFixture:value}),AI_CONSENT_TEXT_VERSION:1,
});
const backup=await callable('buildBackupPayload',context)();
assert.deepEqual(backup.financeEvolution,finance);
assert.deepEqual(backup.budgetPlan,legacy);
assert.equal(backup.backupSchemaVersion,5);
const data=JSON.parse(JSON.stringify(backup));
const writes=[];
const restored={};
const applyContext={financeEvolution:createFinanceEvolution(),migrateFinanceEvolution,mergeFinanceEvolution,
  writeTechnicalLog:async()=>{},L:value=>value,applyBackupDataIntegrated:()=>{throw new Error('Unexpected merge application');},
};
function collectSetters(node){if(ts.isIdentifier(node)&&/^set[A-Z]/.test(node.text))applyContext[node.text]=value=>{writes.push(node.text);restored[node.text]=value;};ts.forEachChild(node,collectSetters);}
collectSetters(find('applyBackupData'));
applyContext.replaceAccountMovementsV2=async replacements=>{
  for(const kind of ['expense','income']){
    if(Object.prototype.hasOwnProperty.call(replacements,kind)){
      writes.push('movement:'+kind);
      restored[kind==='expense'?'setExpenses':'setIncomes']=replacements[kind];
    }
  }
};
const apply=callable('applyBackupData',applyContext);
await apply(data,'replace');
assert.deepEqual(restored.setFinanceEvolution,finance);
assert.deepEqual(restored.setExpenses,context.expenses);
assert.deepEqual(restored.setIncomes,context.incomes);
assert.deepEqual(restored.setBudgetPlan,legacy);
writes.length=0;
await apply({expenses:context.expenses,budgetPlan:legacy},'replace');
assert(!writes.includes('setFinanceEvolution'),'Old backups must not clear new account data');
writes.length=0;
await assert.rejects(apply({...data,financeEvolution:{schemaVersion:999}},'replace'),/UNSUPPORTED/);
assert.equal(writes.length,0,'Invalid finance data must fail before any backup setter');
await assert.rejects(apply(data,'merge'),/PERIOD_CONFLICT/);
assert.equal(writes.length,0,'A merge conflict must leave every field unchanged');
console.log('Actual backup handlers: new export/restore, old import preservation, atomic rejection of future schemas and conflicts passed');
