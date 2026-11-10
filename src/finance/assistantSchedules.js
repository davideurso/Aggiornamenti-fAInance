import {itemAmountForMonth, parseMoneyValue} from '../financeCalculations.js';
import {periodForDate, periodForKey, shiftPeriodKey} from './periodEngine.js';
import {collectInstallmentPlans, sumInstallmentAmounts} from './installmentRegistry.js';
import {validCalendarDate} from './financialCalendar.js';
import {resolveInsightRange} from './financialInsights.js';
import {recurringEffectiveFrom, recurringOccurrencesInPeriod, recurringOccurrenceAlreadyGenerated} from './recurringOccurrences.js';

const list = value => Array.isArray(value) ? value : [];
const active = row => row && !row.deleted && !row.deletedAt && !row.archived &&
  !['deleted','archived','cancelled','canceled','void'].includes(String(row.status || '').toLowerCase());
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
  return {expense:sumInstallmentAmounts(rows.filter(x => x.type === 'expense'),field),
    income:sumInstallmentAmounts(rows.filter(x => x.type === 'income'),field),count:rows.length};
}
function bounded(rows, question, limit = 80) {
  const text = normalize(question), matches = rows.filter(row => row.name && text.includes(normalize(row.name)));
  const chosen = [...new Set([...matches, ...rows])].slice(0, limit);
  return {rows: chosen, totalCount: rows.length, omittedCount: rows.length - chosen.length};
}
function monthlyInstallmentTotals(plans, startDate, endDate) {
  const monthKeys = periodKeys(startDate,endDate);
  const monthPieces = new Map(monthKeys.map(month => [month,[]]));
  for (const plan of plans) for (const item of plan.installments) {
    if (item.date < startDate || item.date > endDate) continue;
    monthPieces.get(item.date.slice(0,7))?.push({...item,type:plan.type,
      excludedFromTotals:plan.excludedFromTotals,planId:plan.id});
  }
  return monthKeys.map(month => {
    const civilMonth = periodForKey(month);
    const start = civilMonth.start < startDate ? startDate : civilMonth.start;
    const end = civilMonth.end > endDate ? endDate : civilMonth.end;
    const pieces = monthPieces.get(month);
    const counted = pieces.filter(item => !item.excludedFromTotals), excluded = pieces.filter(item => item.excludedFromTotals);
    const sums = totals(counted), excludedSums = totals(excluded);
    return {month,start,end,expense:sums.expense,income:sums.income,
      installmentCount:counted.length,recordCount:new Set(counted.map(item => item.planId)).size,
      excludedExpense:excludedSums.expense,excludedIncome:excludedSums.income,excludedInstallmentCount:excluded.length};
  });
}
const amountDelta = (requested, comparison) => sumInstallmentAmounts([{amount:requested},{amount:-comparison}]);

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
    // Use the resolved analytical source before category exclusions so the register
    // can disclose excluded rows without counting them in the app's financial totals.
    const rawExpenses = list(c.expensesForAnalysis || c.expenses || c.countedExpensesForAnalysis);
    const rawIncomes = list(c.incomes || c.countedIncomes);
    const expenses = rawExpenses.filter(active), incomes = rawIncomes.filter(active);
    const expensePlans = collectInstallmentPlans(rawExpenses, {currency:c.currency, categories:c.cats,
      methods:c.methods, exclude:c.isExpenseExcludedFromTotals});
    const incomePlans = collectInstallmentPlans(rawIncomes, {type:'income', currency:c.currency,
      categories:c.cats, methods:c.methods, incomeTypes:c.incomeTypes, exclude:c.isIncomeExcludedFromTotals});
    const plans = expensePlans.plans.concat(incomePlans.plans);
    const fullRows = plans.map(plan => {
      const inRequested = plan.installments.filter(x => x.date >= requested.start && x.date <= requested.end);
      const future = plan.installments.filter(x => x.date >= today).sort((a,b) => a.date.localeCompare(b.date));
      return {id:plan.id, type:plan.type, name:plan.description, actualDate:plan.actualDate,
        totalAmount:plan.totalAmount, currency:plan.currency, originalCurrency:plan.originalCurrency,
        originalAmount:plan.originalAmount, category:plan.categoryName, paymentMethod:plan.paymentMethod,
        incomeType:plan.incomeType, excludedFromTotals:plan.excludedFromTotals,
        count:plan.count, direction:plan.direction,
        requestedAmount:sumInstallmentAmounts(inRequested), requestedInstallmentCount:inRequested.length,
        requestedInstallments:inRequested.slice(0,24), requestedInstallmentsOmitted:Math.max(0,inRequested.length-24),
        currentPeriodAmount:itemAmountForMonth({...plan.movement,amount:plan.totalAmount},current.key,settings),
        nextAccountingInstallment:future[0] || null, remainingAccountingAmount:sumInstallmentAmounts(future),
        startDate:plan.startDate, endDate:plan.endDate};
    });
    const requestedRows = fullRows.filter(row => row.requestedInstallmentCount > 0);
    // A named year/month/range returns only its relevant records. Without an
    // explicit period the existing inventory remains available to answer a name query.
    const detailRows = requested.basis === 'selected_period' ? fullRows : requestedRows;
    detailRows.sort((a,b) => Number(b.requestedInstallmentCount > 0) - Number(a.requestedInstallmentCount > 0) || a.name.localeCompare(b.name));
    const details = bounded(detailRows,question), visibleIds = new Set(details.rows.map(row => row.id));
    const countedRequested = requestedRows.filter(row => !row.excludedFromTotals);
    const excludedRequested = requestedRows.filter(row => row.excludedFromTotals);
    const currentRows = fullRows.filter(row => row.currentPeriodAmount !== 0);
    const requestedTotals = totals(countedRequested,'requestedAmount');
    const requestedExcludedTotals = totals(excludedRequested,'requestedAmount');
    const requestedInstallmentCount = requestedRows.reduce((sum,row) => sum + row.requestedInstallmentCount,0);
    const requestedMonthlyTotals = monthlyInstallmentTotals(plans,requested.start,requested.end);
    // Scheduling comparisons retain both complete requested windows, including
    // future allocations. Movement-date insights may use elapsed windows instead.
    const comparisonPeriod = requested.comparisonStart && requested.comparisonEnd
      ? {start:requested.comparisonStart,end:requested.comparisonEnd} : null;
    const comparisonRows = comparisonPeriod ? plans.map(plan => {
      const pieces = plan.installments.filter(item => item.date >= comparisonPeriod.start && item.date <= comparisonPeriod.end);
      return {type:plan.type,excludedFromTotals:plan.excludedFromTotals,
        amount:sumInstallmentAmounts(pieces),installmentCount:pieces.length};
    }).filter(row => row.installmentCount > 0) : null;
    const comparisonTotals = comparisonRows ? totals(comparisonRows.filter(row => !row.excludedFromTotals)) : null;
    const comparisonExcludedTotals = comparisonRows ? totals(comparisonRows.filter(row => row.excludedFromTotals)) : null;
    const comparisonInstallmentCount = comparisonRows ? comparisonRows.reduce((sum,row) => sum + row.installmentCount,0) : null;
    const comparisonMonthlyTotals = comparisonPeriod
      ? monthlyInstallmentTotals(plans,comparisonPeriod.start,comparisonPeriod.end) : null;
    const comparisonDelta = comparisonPeriod ? {basis:'REQUESTED_MINUS_COMPARISON',
      expense:amountDelta(requestedTotals.expense,comparisonTotals.expense),
      income:amountDelta(requestedTotals.income,comparisonTotals.income),
      countedRecordCount:requestedTotals.count-comparisonTotals.count,
      recordCount:requestedRows.length-comparisonRows.length,
      installmentCount:requestedInstallmentCount-comparisonInstallmentCount,
      excludedExpense:amountDelta(requestedExcludedTotals.expense,comparisonExcludedTotals.expense),
      excludedIncome:amountDelta(requestedExcludedTotals.income,comparisonExcludedTotals.income),
      excludedRecordCount:requestedExcludedTotals.count-comparisonExcludedTotals.count} : null;
    const invalidCount = expensePlans.coverage.invalidCount + incomePlans.coverage.invalidCount;
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
      installments:{basis:'ACCOUNTING_ALLOCATION_NOT_BANK_PAYMENTS',...details,
        detailScope:requested.basis === 'selected_period' ? 'all_active_loaded_plans' : 'requested_period',
        knownRecordCount:fullRows.length,requestedRecordCount:requestedRows.length,
        requestedExpenseCount:requestedRows.filter(row => row.type === 'expense').length,
        requestedIncomeCount:requestedRows.filter(row => row.type === 'income').length,
        requestedInstallmentCount,
        requestedOmittedCount:requestedRows.filter(row => !visibleIds.has(row.id)).length,
        requestedInstallmentsOmittedCount:requestedRows.reduce((sum,row) => sum +
          (visibleIds.has(row.id) ? row.requestedInstallmentsOmitted : row.requestedInstallmentCount),0),
        requestedTotals,requestedExcludedTotals,
        comparisonPeriod,comparisonTotals,comparisonExcludedTotals,
        comparisonRecordCount:comparisonRows?.length ?? null,
        comparisonExpenseCount:comparisonRows ? comparisonRows.filter(row => row.type === 'expense').length : null,
        comparisonIncomeCount:comparisonRows ? comparisonRows.filter(row => row.type === 'income').length : null,
        comparisonInstallmentCount,comparisonMonthlyTotals,comparisonDelta,
        comparisonDetailScope:comparisonPeriod ? 'summary_only' : null,
        comparisonOmittedCount:comparisonRows?.length ?? null,
        comparisonInstallmentsOmittedCount:comparisonInstallmentCount,
        currentPeriodTotals:totals(currentRows.filter(row => !row.excludedFromTotals),'currentPeriodAmount'),
        currentPeriodExcludedTotals:totals(currentRows.filter(row => row.excludedFromTotals),'currentPeriodAmount'),
        requestedMonthlyTotals, invalidCount,
        duplicateCount:expensePlans.coverage.duplicateCount + incomePlans.coverage.duplicateCount,
        conflictCount:expensePlans.coverage.conflictCount + incomePlans.coverage.conflictCount,
        accountCompletenessCertified:false},
      recurring:{rules:bounded(ruleDetails,question),requestedOccurrences:bounded(occurrences,question),
        requestedTotals:{scheduled:totals(occurrences),confirmed:totals(occurrences.filter(x=>x.status==='confirmed')),
          skipped:totals(occurrences.filter(x=>x.status==='skipped')),pending:totals(occurrences.filter(x=>['due','upcoming'].includes(x.status)))},
        upcoming:bounded(upcoming,question)},
      limitations:['Totals cover valid active loaded records before limiting displayed details; account completeness is not certified. Invalid or conflicting records make coverage partial, not zero.',
        'Requested totals exclude excludedFromTotals rows; their amounts are reported separately. Requested record counts and installment counts are different. Monthly totals cover every civil month in the requested range, including zero months.',
        'Comparison fields are null without a resolved comparison. Otherwise both complete windows use accounting allocations, including future months; comparisonDelta is requested minus comparison, never the movement-date financialInsights delta. Top-level period record and installment counts include exclusions; totals.count and monthly recordCount/installmentCount cover counted plans only. Excluded amounts are separate.',
        'Comparison details are summary-only: rows and requestedInstallments describe the primary range. comparisonOmittedCount and comparisonInstallmentsOmittedCount count comparison details not supplied; never present primary rows as a complete comparison item list.',
        'Installments allocate a recorded total over months in its saved direction; they do not prove separate bank payments or debt still owed.',
        'Recurring amounts are per occurrence, with pending, confirmed and skipped totals separate. Never add confirmed occurrences to their generated movements again.',
        'Upcoming recurrences cover thirteen periods from today or a later activation. Legacy activation defaults to current period start; do not infer older dates.',
        'Omitted records or installment details cannot be invented; disclose requestedOmittedCount and requestedInstallmentsOmittedCount for an incomplete list. Return N/D when missing records or an unsupported scope prevent a complete answer.']};
  } catch(error) { return {status:'N_D',reason:error?.message || 'SCHEDULE_DATA_UNAVAILABLE'}; }
}
