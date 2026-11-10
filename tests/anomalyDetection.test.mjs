import assert from 'node:assert/strict';
import { detectFinancialAnomalies, anomaliesForAssistant } from '../src/finance/anomalyDetection.mjs';
const cats = [{id:'b',name:'Bollette'},{id:'s',name:'Spesa'},{id:'t',name:'Trasporti'}];
const row = (id,date,amount,catId,desc,methodId='card')=>({id,date,amount,catId,desc,methodId});
const rows = [
  row('b1','2026-07-10',100,'b','Energia'),
  row('b2','2026-08-10',100,'b','Energia'),
  row('b3','2026-09-10',100,'b','Energia'),
  row('b4','2026-10-10',145,'b','Energia'),
  row('s1','2026-07-05',90,'s','Esselunga'),
  row('s2','2026-08-06',100,'s','Esselunga'),
  row('s3','2026-09-10',95,'s','Esselunga'),
  row('s4','2026-10-11',170,'s','Supermercato 1'),
  row('d1','2026-10-11',43,'t','Treno'),
  row('d2','2026-10-12',43,'t','Treno'),
];
const options={expenses:rows,categories:cats,today:'2026-10-13'};
let actual=detectFinancialAnomalies(options);
const recurring=actual.find(x=>x.type==='recurring_change'&&x.facts.merchant==='Energia');
assert.ok(recurring,'Recurring bill variation detected');
assert.equal(recurring.facts.percent,45);
assert.equal(recurring.facts.baseline,100);
assert.equal(recurring.facts.current,145);
assert.ok(actual.some(x=>x.type==='category_spike'&&x.facts.category==='Spesa'), 'Category spike detected');
assert.ok(actual.some(x=>x.type==='possible_duplicate'&&x.facts.merchant==='Treno'),'Possible duplicate detected');
assert.ok(!anomaliesForAssistant(actual,'summary').some(x=>x.type==='possible_duplicate'),'Summary hides individual rows');
assert.ok(!anomaliesForAssistant(actual,'areas').some(x=>x.merchant||x.transactionIds),'Areas hides merchant and ids');
assert.ok(anomaliesForAssistant(actual,'full').some(x=>x.merchant==='Treno'),'Full supplies merchant');
assert.equal(detectFinancialAnomalies({ expenses:[row('f','2026-11-01',9000,'s','Car')],categories:cats,today:'2026-10-13'}).length,0,'Future movement ignored');
assert.equal(detectFinancialAnomalies({expenses:[row('a','2026-10-11',50,'s','Market'),row('b','2026-10-12',50,'s','Market','cash')],categories:cats,today:'2026-10-13'}).length,0,'Different payment methods excluded from duplicate detection');
assert.equal(detectFinancialAnomalies({expenses:[row('a','2026-10-11',50,'s','Market'),row('b','2026-10-13',50,'s','Market')],categories:cats,today:'2026-10-13'}).length,0,'2-day gap excluded from duplicate detection');
assert.equal(detectFinancialAnomalies({expenses:[row('a','2026-10-11',50,'s','Market'),row('a','2026-10-11',50,'s','Market')],categories:cats,today:'2026-10-13'}).filter(x=>x.type==='possible_duplicate').length,1,'Two identical rows flagged, without data changes');
const outlierRows = [
  row('t1','2026-05-01',20,'t','Bus'), row('t2','2026-05-15',18,'t','Bus'),
  row('t3','2026-06-01',21,'t','Bus'), row('t4','2026-06-15',19,'t','Bus'),
  row('t5','2026-07-01',22,'t','Bus'), row('t6','2026-10-12',190,'t','Taxi'),
];
assert.ok(detectFinancialAnomalies({expenses:outlierRows,categories:cats,today:'2026-10-13'})
  .some(x=>x.type==='unusual_expense'&&x.facts.current===190),'Single outlier detected from 5 prior payments');
assert.ok(!detectFinancialAnomalies({ expenses: [row('x','2026-10-10',200,'s','New Category')], categories: cats, today: '2026-10-13' })
  .some(x=>x.type==='category_spike'),'Insufficient history does not cause alerts');
assert.deepEqual(detectFinancialAnomalies(options),actual,'Deterministic results');
assert.equal(rows.length,10,'Original data not mutated');
console.log('[OK] anomalyDetection: recurring +45%, category increase, duplicate, privacy, dates, determinism');
