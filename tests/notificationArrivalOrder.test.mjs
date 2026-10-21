import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import ts from 'typescript';
import {recordNotificationArrivals,sortNotificationsNewestFirst} from '../src/notifications/notificationArrivalOrder.mjs';
test('a newly received alert comes before an earlier alert regardless of catalogue order',()=>{
 const old={id:'old',virtual:true},latest={id:'latest',virtual:true};
 const before=recordNotificationArrivals({},[old],1000),after=recordNotificationArrivals(before,[old,latest],2000);
 assert.deepEqual(sortNotificationsNewestFirst([old,latest],after).map(x=>x.id),['latest','old']);assert.equal(before.old.at,1000);assert(!before.latest);
});
test('reading, rerendering, translations and reopening preserve arrival order and time',()=>{
 const rows=[{id:'a',virtual:true},{id:'b',virtual:true}];let state=recordNotificationArrivals({},[rows[0]],1000);state=recordNotificationArrivals(state,rows,2000);
 const restored=JSON.parse(JSON.stringify(state));assert.equal(recordNotificationArrivals(restored,[{...rows[1],read:true,title:'Translated'},rows[0]],9000),restored);
 assert.deepEqual(sortNotificationsNewestFirst(rows,restored).map(x=>x.id),['b','a']);assert.deepEqual(state,restored);
});
test('stored and virtual notices share descending chronology including ISO fallback',()=>{
 const rows=[{id:'server-old',createdAtMs:500},{id:'virtual-new',virtual:true},{id:'server-new',createdAt:new Date(2500).toISOString()}];
 const state=recordNotificationArrivals({},rows,2000);assert.deepEqual(sortNotificationsNewestFirst(rows,state).map(x=>x.id),['server-new','virtual-new','server-old']);
});
test('first observation ties are stable, account maps are isolated and source arrays are unchanged',()=>{
 const rows=[{id:'a',virtual:true},{id:'b',virtual:true}],copy=structuredClone(rows),state=recordNotificationArrivals({},rows,1000);
 assert.deepEqual(sortNotificationsNewestFirst(rows,state).map(x=>x.id),['b','a']);assert.deepEqual(rows,copy);
 const other=recordNotificationArrivals({},[rows[0]],5000);assert.equal(state.a.at,1000);assert.equal(other.a.at,5000);
});
const source=fs.readFileSync('src/sezioni.tsx','utf8');
function runWorklet(type){
 const start=source.indexOf('    if (w.type === "'+type+'") {'),end=source.indexOf('    if (w.type === "',start+10);assert(start>0&&end>start);
 const rows=[{cat:'one',amount:20},{cat:'two',amount:30},{cat:'home',amount:50}],cats={one:{id:'one',name:'Categoria A',group:'altro',color:'#aaa'},two:{id:'two',name:'Categoria B',group:'altro',color:'#bbb'},home:{id:'home',name:'Categoria C',group:'casa',color:'#ccc'}},areas={altro:{id:'altro',name:'Area Altro',color:'#ddd'},casa:{id:'casa',name:'Area Casa',color:'#eee'}};
 const sumBy=(expenses,keys,key,label,color)=>{const data=new Map();for(const row of expenses){const id=key(row),entry=data.get(id)||{id,name:label(row),color:color(row),value:0};entry.value+=row.amount;data.set(id,entry);}return [...data.values()];};
 const env={w:{type,params:{}},countedExpenses:rows,keys:[],sumBy,groupForExpense:e=>{assert.notEqual(type,'expenses_by_category','Category chart read areas');return areas[cats[e.cat].group];},homeCategoryForExpense:e=>{assert.notEqual(type,'distribution_expenses','Area chart read category labels');return cats[e.cat];},plainOrCatalogLabel:(_,__,label)=>label,L:x=>x,expenseColor:'#fff',softenChartColor:x=>x,legendChart:x=>x,compact:false,doubleSize:false};
 return new Function(...Object.keys(env),ts.transpileModule(source.slice(start,end),{compilerOptions:{target:ts.ScriptTarget.ES2022}}).outputText)(...Object.values(env));
}
test('actual distribution worklet consolidates every category in its area, including Altro',()=>{
 const rows=runWorklet('distribution_expenses');assert.equal(rows.length,2);assert.deepEqual(rows.map(x=>x.name),['Area Altro','Area Casa']);assert.equal(rows[0].value,50);assert.equal(rows.reduce((n,x)=>n+x.value,0),100);
});
test('actual category worklet contains categories only even when several share an area',()=>{
 const rows=runWorklet('expenses_by_category');assert.equal(rows.length,3);assert.deepEqual(rows.map(x=>x.name),['Categoria A','Categoria B','Categoria C']);assert.equal(rows.reduce((n,x)=>n+x.value,0),100);
});