import {itemAmountForMonth, parseMoneyValue} from '../financeCalculations.js';
import {installmentDate, periodForDate, periodForKey, shiftPeriodKey} from './periodEngine.js';
import {validCalendarDate} from './financialCalendar.js';
import {resolveInsightRange} from './financialInsights.js';
import {recurringEffectiveFrom, recurringOccurrencesInPeriod, recurringOccurrenceAlreadyGenerated} from './recurringOccurrences.js';

const list = value => Array.isArray(value) ? value : [];
const active = row => row && !row.deleted && !row.deletedAt && !row.archived &&
  !['deleted','archived','cancelled'].includes(String(row.status || '').toLowerCase());
const money = value => Math.round(value * 100) / 100;
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const nameOf = (rows, id) => list(rows).find(x => String(x.id) === String(id))?.name || null;
function periodKeys(start, end, settings) {
  let key = periodForDate(start, settings).key;
  const last = periodForDate(end, settings).key, keys = [];
  while (key <= last && keys.length < 240) { keys.push(key); key = shiftPeriodKey(key, 1); }
  if (key <= last) throw Error('REQUESTED_RANGE_TOO_LONG');
  return keys;
}
function totals(rows, field = 'amount') {
  return {expense: money(rows.filter(x => x.type === 'expense').reduce((sum,x) => sum + x[field], 0)),
    income: money(rows.filter(x => x.type === 'income').reduce((sum,x) => sum + x[field], 0)), count: rows.length};
}
function bounded(rows, question, limit = 80) {
  const text = normalize(question), matches = rows.filter(row => row.name && text.includes(normalize(row.name)));
  const chosen = [...new Set([...matches, ...rows])].slice(0, limit);
  return {rows: chosen, totalCount: rows.length, omittedCount: rows.length - chosen.length};
}

// Read-only evidence for text and voice. Totals are computed BEFORE limiting details.
// It never writes movements or counts an unconfirmed recurring rule as paid income/expense.
export function assistantSchedulesForApp(c, question = '') {
  if (c.aiDataAccess !== 'full') return {status:'N_D', reason:'FULL_DATA_ACCESS_REQUIRED'};
  try {
    const today = c.today, settings = c.accountingPeriod?.settings;
    if (!validCalendarDate(today)) throw Error('INVALID_TODAY');
    const current = periodForDate(today, settings), selected = periodForKey(c.curMonthKey || current.key, settings);
    const requested = resolveInsightRange(question, today, selected.key, settings);
    if (requested.status !== 'VALID') return {status:'N_D', requestedPeriod:requested};
    const expenses = list(c.countedExpensesForAnalysis || c.expensesForAnalysis || c.expenses).filter(active);
    const incomes = list(c.countedIncomes || c.incomes).filter(active);
    const seen = new Set(), installmentRows = [], invalid = [];
    for (const [type, source, exclude] of [['expense',expenses,c.isExpenseExcludedFromTotals],['income',incomes,c.isIncomeExcludedFromTotals]]) {
      for (const row of source) {
        if (!row.rateizzato || (typeof exclude === 'function' && exclude(row))) continue;
        const id = type + ':' + String(row.id || ''), count = Number(row.rate), amount = parseMoneyValue(row.amount);
        if (row.id != null && seen.has(id)) continue;
        if (row.id != null) seen.add(id);
        if (!validCalendarDate(row.date) || !Number.isInteger(count) || count < 1 || count > 240 || !(amount > 0)) { invalid.push(id); continue; }
        const digits = Number.isInteger(row.minorUnitDigits) && row.minorUnitDigits >= 0 && row.minorUnitDigits <= 4 ? row.minorUnitDigits : 2;
        const scale = 10 ** digits, cents = Math.round(amount * scale), base = Math.floor(cents / count);
        const installments = Array.from({length:count},(_,i) => ({number:i+1,
          date:installmentDate(row.date, row.rateDirection === 'backward' ? -i : i),
          amount:(i === count - 1 ? cents - base * (count - 1) : base) / scale}));
        const inRequested = installments.filter(x => x.date >= requested.start && x.date <= requested.end);
        const future = installments.filter(x => x.date >= today).sort((a,b) => a.date.localeCompare(b.date));
        installmentRows.push({id, type, name:String(row.desc || row.description || ''), actualDate:row.date,
          totalAmount:amount, currency:c.currency, originalCurrency:row.currency || c.currency,
          originalAmount:row.originalAmount ?? null, category:nameOf(c.cats,row.catId) || row.categoryNameSnapshot || null,
          paymentMethod:nameOf(c.methods,type === 'expense' ? row.methodId : row.receivedInMethodId) || row.methodNameSnapshot || null,
          incomeType:type === 'income' ? nameOf(c.incomeTypes,row.type || row.incomeType) : null,
          count, direction:row.rateDirection === 'backward' ? 'backward' : 'forward',
          requestedAmount:money(inRequested.reduce((sum,x) => sum+x.amount,0)), requestedInstallments:inRequested.slice(0,24),
          requestedInstallmentsOmitted:Math.max(0,inRequested.length-24),
          currentPeriodAmount:itemAmountForMonth({...row,amount},current.key,settings),
          nextAccountingInstallment:future[0] || null, remainingAccountingAmount:money(future.reduce((sum,x) => sum+x.amount,0)),
          startDate:installments.map(x=>x.date).sort()[0], endDate:installments.map(x=>x.date).sort().at(-1)});
      }
    }
    installmentRows.sort((a,b) => Number(b.requestedAmount > 0) - Number(a.requestedAmount > 0) || a.name.localeCompare(b.name));
    const rules = list(c.recurring).filter(active), occurrences = [], ruleDetails = [], upcoming = [];
    const requestedKeys = periodKeys(requested.start,requested.end,settings);
    for (const rule of rules) {
      const type = rule.rtype === 'income' ? 'income' : 'expense', generated = type === 'income' ? incomes : expenses;
      const effective = recurringEffectiveFrom(rule,today,settings);
      // Enumerate all scheduled dates, then mark their actual state using the original rule.
      const unconfirmed = {...rule,confirmed:[],skipped:[],confirmedOccurrences:[],confirmedOccurrenceDates:[],skippedOccurrences:[],skippedOccurrenceDates:[]};
      function occurrence(date) {
        const key=date.slice(0,7);
        const includes=(fields,value)=>fields.some(field=>list(rule[field]).map(String).includes(value));
        const status=recurringOccurrenceAlreadyGenerated(rule,date,generated) || includes(['confirmed'],key) || includes(['confirmedOccurrences','confirmedOccurrenceDates'],date) ? 'confirmed'
          : includes(['skipped'],key) || includes(['skippedOccurrences','skippedOccurrenceDates'],date) ? 'skipped'
          : date <= today ? 'due' : 'upcoming';
        return {ruleId:String(rule.id),name:String(rule.name || ''),type,date,amount:parseMoneyValue(rule.amount),status};
      }
      const datesFor = key => recurringOccurrencesInPeriod(unconfirmed,key,settings,[]).map(x=>x._occurrenceDate).filter(date=>date >= effective);
      for (const key of requestedKeys) for (const date of datesFor(key)) {
        if (date >= requested.start && date <= requested.end) occurrences.push(occurrence(date));
      }
      // Thirteen periods include the next occurrence even for an annual rule.
      const future = [];
      const futureStart = periodForDate(effective > today ? effective : today, settings).key;
      for (let i=0;i<13;i++) for (const date of datesFor(shiftPeriodKey(futureStart,i))) {
        const entry=occurrence(date);
        if (date >= today && (entry.status === 'upcoming' || entry.status === 'due')) future.push(entry);
      }
      future.sort((a,b)=>a.date.localeCompare(b.date));
      upcoming.push(...future);
      ruleDetails.push({id:String(rule.id),name:String(rule.name || ''),type,amount:parseMoneyValue(rule.amount),
        frequency:rule.frequency || 'monthly', dayOfMonth:rule.dayOfMonth ?? 1,
        annualMonth:rule.annualMonth ?? rule.monthOfYear ?? rule.month ?? (rule.frequency === 'annual' ? rule.dayOfMonth : null),
        effectiveFrom:effective, activationDateKnown:!!rule.effectiveFrom,
        paymentMethod:nameOf(c.methods,type === 'expense' ? rule.methodId : rule.receivedInMethodId),
        category:type === 'expense' ? nameOf(c.cats,rule.catId) : nameOf(c.incomeTypes,rule.incomeType),
        installmentCount:rule.rateizzato ? Number(rule.rate) : null, nextOccurrence:future[0] || null});
    }
    occurrences.sort((a,b)=>a.date.localeCompare(b.date));upcoming.sort((a,b)=>a.date.localeCompare(b.date));
    return {schema:1,status:'LOADED_DATA',currency:c.currency,today,accountingPeriod:{...settings,...current},requestedPeriod:requested,
      installments:{basis:'ACCOUNTING_ALLOCATION_NOT_BANK_PAYMENTS',...bounded(installmentRows,question),
        requestedTotals:totals(installmentRows,'requestedAmount'),currentPeriodTotals:totals(installmentRows,'currentPeriodAmount'),invalidCount:invalid.length},
      recurring:{rules:bounded(ruleDetails,question),requestedOccurrences:bounded(occurrences,question),
        requestedTotals:{scheduled:totals(occurrences),confirmed:totals(occurrences.filter(x=>x.status==='confirmed')),
          skipped:totals(occurrences.filter(x=>x.status==='skipped')),pending:totals(occurrences.filter(x=>['due','upcoming'].includes(x.status)))},
        upcoming:bounded(upcoming,question)},
      limitations:['Totals cover all active loaded records before limiting displayed details; account completeness is not certified.',
        'Installments allocate a recorded total over months in its saved direction; they do not prove separate bank payments or debt still owed.',
        'Recurring amounts are per occurrence, with pending, confirmed and skipped totals separate. Never add confirmed occurrences to their generated movements again.',
        'Upcoming recurrences cover thirteen periods from today or a later activation. Legacy activation defaults to current period start; do not infer older dates.',
        'Omitted details cannot be invented. Return N/D when missing records or an unsupported scope prevent a complete answer.']};
  } catch(error) { return {status:'N_D',reason:error?.message || 'SCHEDULE_DATA_UNAVAILABLE'}; }
}
