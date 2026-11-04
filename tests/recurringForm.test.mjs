import {recurringMissingFields} from '../src/finance/recurringValidation.js';
import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import test from 'node:test';
import ts from 'typescript';
import {recurringDueOccurrences} from '../src/finance/recurringOccurrences.js';
const source=readFileSync(new URL('../src/widget.tsx',import.meta.url),'utf8');
const tree=ts.createSourceFile('widget.tsx',source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const manager=tree.statements.find(n=>ts.isFunctionDeclaration(n)&&n.name.text==='RecurringManager');
function extract(name){let found;function walk(n){if((ts.isFunctionDeclaration(n)||ts.isVariableDeclaration(n))&&n.name?.getText(tree)===name)found=n;ts.forEachChild(n,walk);}walk(manager);assert(found,name);return ts.isFunctionDeclaration(found)?found.getText(tree):'const '+found.getText(tree)+';';}
function setup(patch={}){
 const form={name:'Bolletta',amount:'55',currency:'EUR',rtype:'expense',catId:'utilities',methodId:'card',incomeType:'salary',frequency:'monthly',dayOfMonth:1,annualMonth:11,rateizzato:false,...patch};
 const ctx={currency:'EUR'},sCats=[{id:'utilities',name:'Utenze'}],sMethods=[{id:'card',name:'Carta principale'}],incomeTypes=[{id:'salary',name:'Stipendio'}];
 const scope={form,ctx,recurringErrors:recurringMissingFields(form,ctx.currency),sCats,sMethods,incomeTypes,editingId:null,now:new Date(2026,10,4),recurringToday:'2026-11-04',parseMoney:v=>Number(String(v).replace(',','.')),autoIcon:()=>'',L:x=>x,incomeReceiptFields:row=>({receivedInMethodId:row.receivedInMethodId||''}),setForm:update=>Object.assign(form,update(form))};
 function run(name){scope.recurringErrors=recurringMissingFields(form,ctx.currency);const code=extract(name);const js=ts.transpileModule(code,{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;return new Function(...Object.keys(scope),js+';return '+name+(code.startsWith('function')?'(...args)':'')+';')(...Object.values(scope));}
 function invoke(name,...args){scope.args=args;return run(name);}
 return {form,valid:()=>run('recurringFormValid'),payload:()=>invoke('normalizePayload'),invoke};
}
for(const rtype of ['expense','income'])test(rtype+' monthly: valid required fields create a named recurring movement',()=>{
 const f=setup({rtype,receivedInMethodId:'card'});assert.equal(f.valid(),true);
 const rule=f.payload();assert.equal(rule.amount,55);assert.equal(rule.dayOfMonth,1);assert.equal(rule.name,'Bolletta');
 if(rtype==='income')assert.equal(rule.receivedInMethodId,'card');else assert.equal(rule.methodId,'card');
 assert.equal(recurringDueOccurrences(rule,'2026-12-01',{},[]).length,1);
});
test('explicit name and required financial validation remain intact',()=>{
 assert.equal(setup({name:'  Bolletta  '}).payload().name,'Bolletta');
 for(const patch of [{name:''},{name:'  '},{dayOfMonth:''},{amount:'0'},{amount:'-1'},{catId:''},{methodId:''},{rtype:'income',incomeType:''},{dayOfMonth:32}])assert.equal(setup(patch).valid(),false,JSON.stringify(patch));
});
test('annual calendar preserves the selected year, month and day and reopens the same date',()=>{
 const f=setup({frequency:'annual'});f.invoke('setAnnualDate','2027-04-16');
 assert.equal(f.invoke('annualDateValue'),'2027-04-16');assert.equal(f.valid(),true);
 const rule=f.payload();assert.equal(rule.effectiveFrom,'2027-04-16');assert.equal(rule.annualMonth,4);assert.equal(rule.dayOfMonth,16);
 assert.equal(recurringDueOccurrences(rule,'2026-04-16',{},[]).length,0);
 assert.deepEqual(recurringDueOccurrences(rule,'2027-04-16',{},[]).map(x=>x._occurrenceDate),['2027-04-16']);
 assert.equal(setup(JSON.parse(JSON.stringify(rule))).invoke('annualDateValue'),'2027-04-16');
});
