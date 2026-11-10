import test from 'node:test';
import assert from 'node:assert/strict';
import {derivePatrimony} from '../src/finance/patrimonyAutoBalance.js';
import {buildExpensesForAnalysis} from '../src/finance/shareAnalytics.js';
import {shareCashMovementsForUser,shareCashMovementKey,shareProjectsForRead} from '../src/finance/shareCashMovements.js';
import {totalForMonth,monthlyTotalsForYear} from '../src/financeCalculations.js';

const period={mode:'financial',startDay:26};
const uid='owner';
const project={id:'trip',ownerUid:uid,participants:[{id:'me',uid},{id:'other',uid:'guest'}]};
const row={id:'payment',kind:'expense',date:'2026-11-04',createdAt:'2026-11-04T16:32:49Z',amount:200000,paidBy:'me',shares:{me:100000,other:100000}};
const entry={id:'cash',balanceLink:{enabled:true,version:1,checkpoints:[{date:'2026-11-04',savedAt:'2026-11-04T11:59:00Z',amount:900,baselineCents:0,methodIds:['cash'],shareBaselineIds:[]}]}};
const options={entries:[entry],values:{cash:900},history:{'2026-10':{cash:145,_savedAt:'2026-10-14T08:00:00Z'}},today:'2026-11-04',mode:'entrambe',periodSettings:period};
const method={[shareCashMovementKey(project.id,row.id)]:{methodId:'cash',direction:'expense'}};
const cash=p=>shareCashMovementsForUser([p],method,uid,'EUR');
const analysis=(p,expenses=[])=>buildExpensesForAnalysis({projects:[p],expenses,userId:uid,personalCategories:[{id:17,name:'Altro'}],baseCurrency:'EUR'});
const months=rows=>['2026-10','2026-11'].map(key=>totalForMonth(rows,key,'reale',period));

test('retrodated Share payment leaves the later independent opening balance and appears only in its destination period',()=>{
 const initial={...project,activities:[row]};
 const nov=derivePatrimony({...options,shareCashMovements:cash(initial)});
 assert.deepEqual([nov.history['2026-10'].cash,nov.history['2026-11'].cash],[145,-199100]);
 const moved={...project,activities:[{...row,date:'2026-10-05',updatedAt:'2026-11-04T16:34:00Z'}]};
 const oct=derivePatrimony({...options,history:nov.history,shareCashMovements:cash(moved)});
 assert.deepEqual(months(analysis(moved)),[100000,0]);
 assert.deepEqual([oct.history['2026-10'].cash,oct.history['2026-11'].cash],[-199855,900]);
 const returned=derivePatrimony({...options,history:oct.history,shareCashMovements:cash(initial)});
 assert.deepEqual([returned.history['2026-10'].cash,returned.history['2026-11'].cash],[145,-199100]);
 const removed={...project,activities:[],deletedActivityIds:[row.id]};
 const restored=derivePatrimony({...options,history:oct.history,shareCashMovements:cash(removed)});
 assert.deepEqual([restored.history['2026-10'].cash,restored.history['2026-11'].cash],[145,900]);
 assert.deepEqual(months(analysis(removed)),[0,0]);
});

test('an exported quota removed from an available canonical project cannot survive in charts or monthly totals',()=>{
 const shadow={id:'exported',source:'share_project_history',shareProjectId:project.id,shareActivityId:row.id,date:'2026-11-04',amount:100000};
 const deleted={...project,activities:[]}; // older clients removed rows without recording a tombstone
 const rows=analysis(deleted,[shadow]);
 assert.deepEqual(rows,[]);
 assert.deepEqual(months(rows),[0,0]);
 assert.ok(monthlyTotalsForYear(rows,[],2026,'reale',[],period).every(x=>x.value===0));
});

test('ordinary income and expense follow their date across the same independently saved balances',()=>{
 for(const [key,field,sign] of [['expenses','methodId',-1],['incomes','receivedInMethodId',1]]){
  const item={id:'personal',amount:80,date:row.date,createdAt:row.createdAt,[field]:'cash'};
  const old=derivePatrimony({...options,[key]:[item]});
  const moved=derivePatrimony({...options,history:old.history,[key]:[{...item,date:'2026-10-05'}]});
  assert.deepEqual([moved.history['2026-10'].cash,moved.history['2026-11'].cash],[145+sign*80,900]);
  const deleted=derivePatrimony({...options,history:moved.history,[key]:[{...item,deleted:true}]});
  assert.deepEqual([deleted.history['2026-10'].cash,deleted.history['2026-11'].cash],[145,900]);
 }
});

test('without a newer independent opening balance earlier movements still carry forward exactly once',()=>{
 const entries=[{...entry,balanceLink:{...entry.balanceLink,checkpoints:[{...entry.balanceLink.checkpoints[0],date:'2026-10-01',savedAt:'2026-10-01T10:00:00Z',amount:900}]}}];
 const p={...project,activities:[{...row,date:'2026-10-05'}]};
 const r=derivePatrimony({...options,history:{},entries,shareCashMovements:cash(p)});
 assert.deepEqual([r.history['2026-10'].cash,r.history['2026-11'].cash],[-199100,-199100]);
 assert.deepEqual(months(analysis(p)),[100000,0]);
});

test('fresh server dates and deletions win stale profile copies for every financial consumer, including after serialization',()=>{
 const stale={...project,activities:[row,{...row,id:'removed',amount:200000,shares:{me:200000}}]};
 const server={...project,activities:[{...row,date:'2026-10-05'}]};
 const shadow={id:'exported',source:'share_project_history',shareProjectId:project.id,shareActivityId:'removed',amount:200000,date:'2026-11-04'};
 let cache=[stale];
 for(let n=0;n<3;n++){
  const resolved=shareProjectsForRead(cache,[server]);
  const rows=analysis(resolved[0],[shadow]);
  assert.equal(resolved[0].activities.length,1);
  assert.deepEqual(months(rows),[100000,0]);
  assert.equal(monthlyTotalsForYear(rows,[],2026,'reale',[],period)[10].value,0);
  assert.equal(cash(resolved[0]).length,1);
  assert.equal(cash(resolved[0])[0].date,'2026-10-05');
  cache=JSON.parse(JSON.stringify(resolved));
 }
 const removed=shareProjectsForRead(cache,[{...server,activities:[],deletedActivityIds:[row.id]}]);
 assert.deepEqual(analysis(removed[0],[shadow]),[]);
 assert.deepEqual(cash(removed[0]),[]);
 assert.equal(shareProjectsForRead([stale],null)[0],stale);
});
