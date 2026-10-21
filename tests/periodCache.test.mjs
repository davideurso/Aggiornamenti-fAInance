import assert from 'node:assert/strict';
import { periodForDate, periodForKey, shiftPeriodKey, installmentDate } from '../src/finance/periodEngine.js';

// Cache hits must not leak mutations of public objects or reuse a former
// configuration when the caller edits its settings or its Date object.
const settings={mode:'financial',startDay:27};
const first=periodForKey('2026-06',settings);
first.start='corrupted by caller';first.extra=true;
assert.deepEqual(periodForKey('2026-06',settings),{
 key:'2026-06',start:'2026-05-27',end:'2026-06-26',endExclusive:'2026-06-27'
});
settings.startDay=1;
assert.equal(periodForKey('2026-06',settings).start,'2026-06-01');
settings.startDay=0;
assert.throws(()=>periodForKey('2026-06',settings),/INVALID_PERIOD_START_DAY/);
settings.mode='unknown';settings.startDay=27;
assert.throws(()=>periodForKey('2026-06',settings),/INVALID_PERIOD_MODE/);
const mutable=new Date(2026,4,26);
assert.equal(periodForDate(mutable,{mode:'financial',startDay:27}).key,'2026-05');
mutable.setDate(27);
assert.equal(periodForDate(mutable,{mode:'financial',startDay:27}).key,'2026-06');
for(let i=0;i<1500;i++){
 const key=shiftPeriodKey('2020-01',i);
 assert.equal(periodForKey(key).start,key+'-01');
 assert.equal(periodForDate(key+'-01').key,key);
}
assert.equal(periodForKey('2020-01').end,'2020-01-31','Evicted entries must recalculate correctly');
for(const bad of ['2026-02-30','0000-01-01','2026-13-01','not-a-date']) {
 assert.throws(()=>periodForDate(bad));assert.throws(()=>periodForDate(bad));
}
assert.equal(installmentDate('2024-01-31',1),'2024-02-29');
assert.equal(periodForDate('2024-02-29T23:30:00-08:00').start,'2024-02-01');
console.log('Period cache: mutable inputs/outputs, invalid settings/dates, eviction and civil dates passed.');
