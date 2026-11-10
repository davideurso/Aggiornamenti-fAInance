import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantFinancialPositionForApp as position} from '../src/finance/assistantFinancialPosition.js';

const base=()=>({today:'2026-11-10',currency:'EUR',aiDataAccess:'full',
  patrimonioEntries:[{id:'cash',name:'Conto',areaId:'liquid'},{id:'house',name:'Casa',areaId:'property'}],
  patrimonioAreas:[{id:'liquid',name:'Liquidità'},{id:'property',name:'Immobili'}],
  patrimonioValues:{cash:1000,house:200000},goals:[]});

test('the current flat canonical patrimony map is read exactly once without inferring available cash',()=>{
 const c=base(),before=JSON.stringify(c),r=position(c);
 assert.equal(r.patrimony.total,201000);assert.equal(r.patrimony.knownTotal,201000);
 assert.equal(r.patrimony.items.find(x=>x.name==='Conto').value,1000);
 assert.equal(r.patrimony.items.find(x=>x.name==='Casa').area,'Immobili');
 assert.equal(r.patrimony.basis,'CURRENT_RECORDED_VALUES');
 assert.equal(r.liquidity.status,'N_D');assert.equal(r.liquidity.amount,null);
 assert.equal(JSON.stringify(c),before);
});

test('missing or invalid asset values are distinct from zero and do not silently complete the total',()=>{
 for(const value of [undefined,null,'','invalid',{},false,Infinity]) {
  const c=base();c.patrimonioValues={cash:0,house:value};
  const r=position(c);
  assert.equal(r.patrimony.total,null);assert.equal(r.patrimony.knownTotal,0);
  assert.equal(r.patrimony.missingValueCount,1);assert.equal(r.patrimony.status,'PARTIAL');
  assert.equal(r.patrimony.items[0].value,0);assert.equal(r.patrimony.items[1].value,null);
 }
 const c=base();c.patrimonioValues={cash:-100,house:'2.000,05'};
 assert.equal(position(c).patrimony.total,1900.05);
 const empty=position({...base(),patrimonioEntries:[],patrimonioValues:{}});
 assert.equal(empty.patrimony.total,null);assert.equal(empty.patrimony.status,'N_D');
});

test('deleted and archived assets and goals are excluded without altering surviving rows',()=>{
 const c=base();c.patrimonioEntries.push({id:'old',name:'Old',deletedAt:'2026-10-01'},{id:'archive',name:'Archive',archived:true});
 c.patrimonioValues.old=9000;c.patrimonioValues.archive=8000;
 c.goals=[{name:'Deleted goal',target:500,saved:0,status:'deleted'}];
 const r=position(c);assert.equal(r.patrimony.total,201000);assert.equal(r.patrimony.totalCount,2);assert.equal(r.goals.totalCount,0);
});

test('goal saved amounts reuse the canonical callback and contributions are arithmetic without adding them to wealth',()=>{
 const c=base();c.goals=[{id:'holiday',name:'Vacanza',target:1000,saved:100,deadline:'2026-12-31'}];
 let calls=0;c.goalSavedAmount=g=>{calls++;assert.equal(g.id,'holiday');return 300;};
 const r=position(c),g=r.goals.items[0];
 assert.equal(calls,1);assert.equal(g.saved,300);assert.equal(g.remaining,700);assert.equal(g.progressPercentage,30);
 assert.equal(g.monthsIncludingCurrent,2);assert.equal(g.monthlyContributionToDeadline,350);
 assert.equal(g.contributionBasis,'EQUAL_CONTRIBUTIONS_INCLUDING_CURRENT_MONTH');
 assert.equal(g.status,'OPEN');assert.equal(r.patrimony.total,201000);
});

test('standalone ledger evidence follows canonical contributions and reversal debits',()=>{
 const c=base();c.goals=[{id:'g',name:'Goal',currency:'EUR',target:100,saved:10,deadline:'2027-01-31'}];
 c.financeEvolution={savings:{entries:[{kind:'manual',status:'active',goalId:'g',currency:'EUR',amountMinor:3000},
  {kind:'closure',status:'active',goalId:'g',currency:'EUR',amountMinor:1000},
  {kind:'manual',status:'cancelled',goalId:'g',currency:'EUR',amountMinor:99999}],
  coverageEntries:[{kind:'period-v1',currency:'EUR',goalDebits:[{goalId:'g',amountMinor:500}]}]}};
 const g=position(c).goals.items[0];
 assert.equal(g.saved,45);assert.equal(g.remaining,55);assert.equal(g.monthsIncludingCurrent,3);
 assert.equal(g.monthlyContributionToDeadline,18.34);
});

test('goal uncertainty, deadlines, completion and currencies remain explicit',()=>{
 const c=base();c.goals=[
  {name:'Unknown',target:100},
  {name:'Done',target:100,saved:120,deadline:'2026-10-01'},
  {name:'Late',target:100,saved:20,deadline:'2026-10-01'},
  {name:'No date',target:100,saved:20},
  {name:'Bad date',target:100,saved:20,deadline:'2026-02-30'},
  {name:'Different currency',currency:'USD',target:100,saved:20,deadline:'2026-11-10'}];
 const rows=position(c).goals.items;
 assert.equal(rows[0].saved,null);assert.equal(rows[0].remaining,null);assert.equal(rows[0].status,'N_D');
 assert.equal(rows[1].status,'COMPLETE');assert.equal(rows[1].remaining,0);assert.equal(rows[1].monthlyContributionToDeadline,null);
 assert.equal(rows[2].status,'OVERDUE');assert.equal(rows[2].monthlyContributionToDeadline,null);
 assert.equal(rows[3].deadlineStatus,'NO_DEADLINE');assert.equal(rows[3].monthlyContributionToDeadline,null);
 assert.equal(rows[4].deadlineStatus,'INVALID_DATE');assert.equal(rows[4].deadline,null);
 assert.equal(rows[5].currency,'USD');assert.equal(rows[5].monthsIncludingCurrent,1);assert.equal(rows[5].monthlyContributionToDeadline,80);
});

test('privacy denies access before reading any protected source, including getters',()=>{
 for(const aiDataAccess of ['summary','areas',undefined]) {
  const c={aiDataAccess};
  for(const field of ['patrimonioEntries','patrimonioValues','patrimonioAreas','goals','goalSavedAmount','financeEvolution','currency','today'])
   Object.defineProperty(c,field,{get(){throw Error('Private source was accessed: '+field);}});
  assert.deepEqual(position(c),{schema:1,status:'N_D',reason:'FULL_DATA_ACCESS_REQUIRED'});
 }
});

test('bounded asset details preserve requested names while totals still cover all records',()=>{
 const c=base();c.patrimonioEntries=Array.from({length:110},(_,i)=>({id:String(i),name:'Asset '+i}));
 c.patrimonioValues=Object.fromEntries(c.patrimonioEntries.map(row=>[row.id,1]));
 const r=position(c,'Quanto vale Asset 109?');
 assert.equal(r.patrimony.total,110);assert.equal(r.patrimony.totalCount,110);assert.equal(r.patrimony.omittedCount,10);
 assert(r.patrimony.items.some(row=>row.name==='Asset 109'));
});
