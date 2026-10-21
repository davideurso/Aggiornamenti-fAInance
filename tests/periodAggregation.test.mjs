import assert from 'node:assert/strict';
import { itemAmountForMonth, totalForMonth, monthlyTotalsForYear } from '../src/financeCalculations.js';
import { recurringOccurrencesInPeriod } from '../src/finance/recurringOccurrences.js';
import { lastPeriodKeys } from '../src/finance/periodEngine.js';
const settings = { mode: 'financial', startDay: 27 };
const items = [{ amount: 100, date: '2026-05-27' }, { amount: 25, date: '2026-06-26' }, { amount: 50, date: '2026-06-27' }];
const original = JSON.stringify(items);
assert.equal(totalForMonth(items, '2026-06', 'reale', settings), 125);
assert.equal(totalForMonth(items, '2026-06', 'reale'), 75);
assert.equal(totalForMonth(items, '2026-06', 'reale', settings), 125);
assert.equal(JSON.stringify(items), original);
assert.equal(monthlyTotalsForYear(items, [], 2026, 'reale', [], settings)[5].value, -125);
for (const day of [1, 15, 16, 27, 28, 29, 30, 31]) {
  const config = { mode: 'financial', startDay: day };
  const keys = lastPeriodKeys(36, '2027-06-01', config);
  for (const direction of ['forward','backward']) for (const date of ['2026-01-31','2026-02-28','2026-03-30','2026-05-27']) {
    const item = { amount: 100, date, rateizzato: true, rate: 3, rateDirection: direction };
    const total = keys.reduce((sum,key)=>sum+Math.round(itemAmountForMonth(item,key,config)*100),0);
    assert.equal(total,10000,`${day}: ${date}, ${direction}`);
  }
}
const rule = { id: 'r', dayOfMonth: 30, amount: 100, confirmed: [], skipped: [] };
const march = recurringOccurrencesInPeriod(rule,'2026-03',{mode:'financial',startDay:31});
assert.deepEqual(march.map(x=>x._occurrenceDate),['2026-02-28','2026-03-30']);
assert.deepEqual(march.map(x=>x._occurrenceKey),['2026-02','2026-03']);
const confirmed={...rule,confirmed:['2026-02']};
assert.equal(recurringOccurrencesInPeriod(confirmed,'2026-02').length,0);
assert.deepEqual(recurringOccurrencesInPeriod(confirmed,'2026-03',{mode:'financial',startDay:31}).map(x=>x._occurrenceDate),['2026-03-30']);
assert.equal(recurringOccurrencesInPeriod({...rule,frequency:'annual',annualMonth:2},'2026-03',{mode:'financial',startDay:31}).length,1);
console.log('Period aggregation: mode switching, negative savings, 64 installment schedules and recurring deduplication passed');
