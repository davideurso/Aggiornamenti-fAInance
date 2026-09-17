// Civil dates, not elapsed milliseconds: period boundaries do not move with DST.
export const CALENDAR_PERIOD = Object.freeze({ mode: 'calendar', startDay: 1 });

export function validatePeriodSettings(settings = CALENDAR_PERIOD) {
  if (!settings || !['calendar', 'financial'].includes(settings.mode)) throw new Error('INVALID_PERIOD_MODE');
  const day = settings.startDay;
  if (!Number.isInteger(day) || day < 1 || day > 31) throw new Error('INVALID_PERIOD_START_DAY');
  return { ...settings, mode: settings.mode, startDay: settings.mode === 'calendar' ? 1 : day };
}

function civil(value) {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error('INVALID_PERIOD_DATE');
    return [value.getFullYear(), value.getMonth() + 1, value.getDate()];
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(String(value));
  if (!match) throw new Error('INVALID_PERIOD_DATE');
  const [year, month, day] = match.slice(1).map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) throw new Error('INVALID_PERIOD_DATE');
  return [year, month, day];
}

function daysInMonth(year, month) {
  return month === 2 ? (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0) ? 29 : 28) : ([4, 6, 9, 11].includes(month) ? 30 : 31);
}
function key(year, month) { return `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}`; }
function keyParts(value) {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(String(value));
  if (!match || Number(match[1]) < 1) throw new Error('INVALID_PERIOD_KEY');
  return [Number(match[1]), Number(match[2])];
}
export function shiftPeriodKey(value, offset) {
  const [year, month] = keyParts(value);
  if (!Number.isInteger(offset)) throw new Error('INVALID_PERIOD_OFFSET');
  const index = year * 12 + month - 1 + offset;
  const nextYear = Math.floor(index / 12);
  if (nextYear < 1 || nextYear > 9999) throw new Error('PERIOD_OUT_OF_RANGE');
  return key(nextYear, index - nextYear * 12 + 1);
}
function boundary(monthKey, day) {
  const [year, month] = keyParts(monthKey);
  return `${monthKey}-${String(Math.min(day, daysInMonth(year, month))).padStart(2, '0')}`;
}
function previousDay(value) {
  const [year, month, day] = civil(value);
  if (day > 1) return `${key(year, month)}-${String(day - 1).padStart(2, '0')}`;
  const prev = shiftPeriodKey(key(year, month), -1);
  const [py, pm] = keyParts(prev);
  return `${prev}-${daysInMonth(py, pm)}`;
}

export function periodForKey(periodKey, settings = CALENDAR_PERIOD) {
  const config = validatePeriodSettings(settings);
  keyParts(periodKey);
  // The agreed second-half naming rule is based on the chosen day, not its February clamp.
  const namingOffset = config.startDay > 15 ? 1 : 0;
  const startMonth = shiftPeriodKey(periodKey, -namingOffset);
  const start = boundary(startMonth, config.startDay);
  const endExclusive = boundary(shiftPeriodKey(startMonth, 1), config.startDay);
  return { key: periodKey, start, end: previousDay(endExclusive), endExclusive };
}

export function periodForDate(value = new Date(), settings = CALENDAR_PERIOD) {
  const config = validatePeriodSettings(settings);
  const [year, month, day] = civil(value);
  let startMonth = key(year, month);
  if (day < Math.min(config.startDay, daysInMonth(year, month))) startMonth = shiftPeriodKey(startMonth, -1);
  return periodForKey(shiftPeriodKey(startMonth, config.startDay > 15 ? 1 : 0), config);
}

export function dateInPeriod(value, periodKey, settings = CALENDAR_PERIOD) {
  try { return periodForDate(value, settings).key === periodKey; } catch { return false; }
}

export function lastPeriodKeys(count, reference = new Date(), settings = CALENDAR_PERIOD, includeCurrent = true) {
  if (!Number.isInteger(count) || count < 1 || count > 1200) throw new Error('INVALID_PERIOD_COUNT');
  const current = periodForDate(reference, settings).key;
  return Array.from({ length: count }, (_, i) => shiftPeriodKey(current, i - count + (includeCurrent ? 1 : 0)));
}

export function comparisonPeriodKeys(periodKey, comparison = 'previous') {
  keyParts(periodKey);
  if (comparison === 'previous') return [shiftPeriodKey(periodKey, -1)];
  if (comparison === 'previousYear') return [shiftPeriodKey(periodKey, -12)];
  const count = comparison === 'average6' ? 6 : comparison === 'average12' ? 12 : 0;
  if (!count) throw new Error('INVALID_PERIOD_COMPARISON');
  return Array.from({ length: count }, (_, i) => shiftPeriodKey(periodKey, i - count));
}

export function periodLabel(periodKey, locale = 'it-IT') {
  const [year, month] = keyParts(periodKey);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, 15);
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);
}

// Installment dates keep the original day and direction; only their aggregation changes.
export function installmentDate(value, offset) {
  const [year, month, day] = civil(value);
  return boundary(shiftPeriodKey(key(year, month), offset), day);
}
