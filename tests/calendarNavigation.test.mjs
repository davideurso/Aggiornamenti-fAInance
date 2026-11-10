import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import ts from 'typescript';
const base=process.argv[2]; assert(base,'Pass root path');
const app=readFileSync(join(base,'src/app.tsx'),'utf8');
const panel=readFileSync(join(base,'src/sections/FinancialCalendarPanel.tsx'),'utf8');
const css=readFileSync(join(base,'src/sections/financialCalendar.css'),'utf8');
assert.match(app,/if \(tab === "history"\) return <HistoryPanel \/>/);
assert.match(app,/if \(tab === "calendar"\) return <FinancialCalendarPanel \/>/);
assert.match(app,/calendar: \{ id: "calendar", icon:/);
// Calendar is in the configurable all-navigation list; no fixed adjacency is
// required because the app deliberately preserves the user's chosen ordering.
const tree=ts.createSourceFile('app.tsx',app,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
const nodes=[];function visit(n){nodes.push(n);ts.forEachChild(n,visit);}visit(tree);
const order=nodes.find(n=>ts.isVariableDeclaration(n)&&n.name.getText(tree)==='DEFAULT_MOBILE_ALL_NAV_ORDER');
assert(order&&ts.isArrayLiteralExpression(order.initializer));
const ids=order.initializer.elements.map(e=>e.text);
for(const id of ['home','spese','history','calendar','voice'])assert(ids.includes(id),id);
assert.equal(new Set(ids).size,ids.length);
// Exercise the actual current navigation functions. The removed six-icon source
// expression predates the configurable 3..7 icon implementation.
const navigationNames=['normalizeOrder','effectiveMobileNavigationOrder','getBottomNavIds','buildBottomNavItems','buildMobileMenuItems'];
const navigationNodes=[];
function navVisit(node){if(ts.isFunctionDeclaration(node)&&navigationNames.includes(node.name?.text))navigationNodes.push(node.getText(tree));ts.forEachChild(node,navVisit);}navVisit(tree);
assert.equal(navigationNodes.length,navigationNames.length);
const navigationCode=ts.transpileModule(navigationNodes.join('\n'),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText;
for(const plan of ['free','base','premium'])for(const count of [3,4,5,6,7]){
 const env={currentPlan:plan,mobileNavIconCount:count,mobileAllNavOrder:['calendar',...ids],mobileAllNavDefaultOrder:ids,allNavDefs:()=>Object.fromEntries([...ids,'more'].map(id=>[id,{id}]))};
 const api=new Function('env','with(env){'+navigationCode+';return {buildBottomNavItems,buildMobileMenuItems};}')(env);
 const bottom=api.buildBottomNavItems(),menu=api.buildMobileMenuItems();
 assert.equal(bottom.length,count);assert.equal(bottom.at(-1).id,'more');
 const all=[...bottom,...menu].map(x=>x.id);
 assert.equal(new Set(all).size,all.length);
 assert.equal(all.filter(id=>id==='calendar').length,1);
 assert.equal(all.filter(id=>id==='history').length,1);
}
assert(!panel.includes('FinancialHistoryPanel'));
for(const cls of ['fc-info','fc-day-flows','fc-legend'])assert(panel.includes(cls),cls);
for(const color of ['--fc-income:#18794E','--fc-income:#79D5A8','--fc-expense:#B63B45','--fc-expense:#FF9AA3'])assert(css.includes(color),color);
const panelTree=ts.createSourceFile('panel.tsx',panel,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
let dictionary;function find(n){if(ts.isVariableDeclaration(n)&&n.name.getText(panelTree)==='TEXT')dictionary=n.initializer;ts.forEachChild(n,find);}find(panelTree);
assert(dictionary&&ts.isObjectLiteralExpression(dictionary));
for(const lang of ['it','en','es','fr','de','pt','pl','nl','ro','el']){
 const entry=dictionary.properties.find(p=>p.name?.getText(panelTree)===lang);
 assert(entry&&ts.isObjectLiteralExpression(entry.initializer),lang);
 for(const key of ['title','infoTitle','movementLegend','dailyIncome','dailyExpense','dailyNet']){
  const value=entry.initializer.properties.find(p=>p.name?.getText(panelTree)===key);
  assert(value&&ts.isStringLiteral(value.initializer)&&value.initializer.text.length,lang+':'+key);
 }
 assert.match(app,new RegExp('\\b'+lang+': \\{[\\s\\S]*?calendar: "[^"\\n]+"'));
}
assert(!app.includes('FinancialHistoryPanel'));
console.log('[OK] Actual history/calendar routes, configurable navigation, 10 calendar dictionaries, corporate contrast.');
