import assert from 'node:assert/strict';
import { periodForDate, periodForKey, shiftPeriodKey, lastPeriodKeys, comparisonPeriodKeys, dateInPeriod, installmentDate } from '../src/finance/periodEngine.js';
const financial = startDay => ({ mode: 'financial', startDay });
assert.deepEqual(periodForKey('2026-06', financial(27)), { key: '2026-06', start: '2026-05-27', end: '2026-06-26', endExclusive: '2026-06-27' });
assert.equal(periodForDate('2026-05-26', financial(27)).key, '2026-05');
assert.equal(periodForDate('2026-05-27', financial(27)).key, '2026-06');
assert.equal(periodForDate('2026-06-27', financial(27)).key, '2026-07');
assert.equal(periodForDate('2026-12-27', financial(27)).key, '2027-01');
assert.equal(periodForKey('2026-03', financial(31)).start, '2026-02-28');
assert.equal(periodForKey('2024-03', financial(31)).start, '2024-02-29');
assert.equal(periodForKey('2026-02', financial(31)).end, '2026-02-27');
assert.equal(periodForDate('2026-02-28', financial(31)).key, '2026-03');
assert.equal(periodForDate('2026-05-15', financial(15)).key, '2026-05');
assert.equal(periodForDate('2026-05-16', financial(16)).key, '2026-06');
assert.equal(shiftPeriodKey('2026-01', -1), '2025-12');
assert.deepEqual(comparisonPeriodKeys('2026-06', 'previousYear'), ['2025-06']);
assert.deepEqual(comparisonPeriodKeys('2026-06', 'average6'), ['2025-12', '2026-01', '2026-02', '2026-03', '2026-04', '2026-05']);
assert.equal(lastPeriodKeys(12, '2026-05-27', financial(27)).at(-1), '2026-06');
assert.equal(lastPeriodKeys(6, '2026-05-27', financial(27), false).at(-1), '2026-05');
assert.equal(installmentDate('2024-01-31', 1), '2024-02-29');
assert.equal(installmentDate('2026-03-31', -1), '2026-02-28');
assert.throws(() => periodForDate('2026-02-30'));
assert.throws(() => periodForKey('2026-13'));
assert.throws(() => periodForDate('2026-01-01', financial(0)));
assert.throws(() => periodForDate('2026-01-01', financial(32)));
assert.equal(dateInPeriod('invalid', '2026-06'), false);
// Every civil day belongs to exactly one adjacent period, for all supported days,
// including DST transitions, leap years and December/January naming.
let count = 0;
for (const year of [2024, 2025, 2026]) for (let day = 1; day <= 31; day++) {
  const settings = financial(day);
  for (let month = 1; month <= 12; month++) {
    const key = `${year}-${String(month).padStart(2, '0')}`;
    const p = periodForKey(key, settings), next = periodForKey(shiftPeriodKey(key, 1), settings);
    assert.equal(p.endExclusive, next.start);
    assert.equal(periodForDate(p.start, settings).key, key);
    assert.equal(periodForDate(p.end, settings).key, key);
    assert.equal(periodForDate(p.endExclusive, settings).key, next.key);
    assert.ok(p.start <= p.end && p.end < p.endExclusive);
    count++;
  }
}
console.log(`Period engine: ${count} boundary scenarios and specific cases passed`);
