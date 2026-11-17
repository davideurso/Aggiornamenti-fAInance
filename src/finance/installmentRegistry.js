import {parseMoneyValue} from '../financeCalculations.js';
import {installmentDate} from './periodEngine.js';

const list = value => Array.isArray(value) ? value : [];
const inactive = row => !row || row.deleted || row.deletedAt || row.archived ||
  ['deleted', 'archived', 'cancelled', 'canceled', 'void'].includes(String(row.status || '').toLowerCase());
const stableId = row => row?.id === undefined || row?.id === null || String(row.id) === '' ? null : String(row.id);
const normalize = value => String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  try { return installmentDate(value, 0) === value; } catch { return false; }
}

function labelFor(catalog, id, fallbacks = []) {
  const entry = list(catalog).find(item => item && String(item.id) === String(id));
  const usable = value => typeof value === 'string' && value.trim() &&
    !/^(categoria recuperata|recovered category)\b/i.test(value.trim());
  // Archived catalog entries remain valid historical classifications.
  if (entry && !entry.recovered && usable(entry.name)) return entry.name.trim();
  return fallbacks.find(usable)?.trim() || null;
}

// Four decimal places cover the existing supported minorUnitDigits (0..4).
// Integer accumulation avoids drift across many plans while preserving their currency precision.
export function sumInstallmentAmounts(rows, field = 'amount') {
  let units = 0;
  for (const row of list(rows)) {
    const next = Math.round(Number(row?.[field] ?? 0) * 10000);
    if (!Number.isSafeInteger(next) || !Number.isSafeInteger(units + next)) throw Error('UNSAFE_INSTALLMENT_TOTAL');
    units += next;
  }
  return units / 10000;
}

/**
 * Derive accounting allocations from current, already-resolved movement rows.
 * No records are created, mutated or cached. Shared analytical rows must already
 * contain the current user's amount (the caller reuses buildExpensesForAnalysis).
 */
export function collectInstallmentPlans(movements, {
  type = 'expense', currency = 'EUR', categories = [], methods = [], incomeTypes = [], exclude,
} = {}) {
  const source = list(movements), plans = [], seen = new Set();
  const coverage = {sourceCount:source.length, installmentSourceCount:0, invalidCount:0,
    duplicateCount:0, inactiveCount:0, legacyIdCount:0, conflictCount:0, omittedCount:0};
  // An inactive copy of an ID must not be resurrected by a stale duplicate.
  const inactiveIds = new Set(source.filter(row => inactive(row) && stableId(row) !== null).map(stableId));
  const byId = new Map();
  const signature = row => JSON.stringify([row?.amount, row?.date, row?.rateizzato, row?.rate,
    row?.rateDirection || 'forward', row?.minorUnitDigits ?? 2, row?.catId, row?.type, row?.methodId,
    row?.receivedInMethodId, row?.currency, row?.baseCurrency]);
  const conflictingIds = new Set();
  for (const row of source) {
    const id = stableId(row);
    if (id === null || inactive(row)) continue;
    if (byId.has(id) && signature(byId.get(id)) !== signature(row)) conflictingIds.add(id);
    else byId.set(id, row);
  }
  for (let index = 0; index < source.length; index++) {
    const row = source[index], sourceId = stableId(row);
    if (sourceId !== null && seen.has(sourceId)) { coverage.duplicateCount++; continue; }
    if (sourceId !== null) seen.add(sourceId);
    if (inactive(row) || (sourceId !== null && inactiveIds.has(sourceId))) { coverage.inactiveCount++; continue; }
    if (!row.rateizzato) continue;
    coverage.installmentSourceCount++;
    if (sourceId !== null && conflictingIds.has(sourceId)) {
      coverage.invalidCount++; coverage.conflictCount++; continue;
    }
    const count = Number(row.rate), amount = parseMoneyValue(row.amount);
    const direction = row.rateDirection === 'backward' ? 'backward' : 'forward';
    const digits = Number.isInteger(row.minorUnitDigits) && row.minorUnitDigits >= 0 && row.minorUnitDigits <= 4
      ? row.minorUnitDigits : 2;
    const scale = 10 ** digits, units = Math.round(amount * scale);
    if (!validDate(row.date) || !Number.isSafeInteger(count) || count < 1 || count > 240 ||
      !(amount > 0) || !Number.isSafeInteger(units) || units < 1 ||
      (row.rateDirection && !['forward','backward'].includes(row.rateDirection))) {
      coverage.invalidCount++; continue;
    }
    let installments;
    try {
      const base = Math.floor(units / count);
      installments = Array.from({length:count}, (_, index) => ({
        number:index + 1,
        date:installmentDate(row.date, direction === 'backward' ? -index : index),
        amount:(index === count - 1 ? units - base * (count - 1) : base) / scale,
      }));
    } catch { coverage.invalidCount++; continue; }
    if (sourceId === null) coverage.legacyIdCount++;
    const dates = installments.map(item => item.date).sort();
    plans.push({
      id:type + ':' + (sourceId === null ? 'legacy-' + index : sourceId),
      movement:row, type, description:String(row.desc || row.description || row.name || ''),
      categoryName:type === 'expense' ? labelFor(categories, row.catId,
        [row.categoryNameSnapshot, row.categoryName, row.catName]) : null,
      paymentMethod:labelFor(methods, type === 'expense' ? row.methodId : row.receivedInMethodId,
        [row.methodNameSnapshot, type === 'expense' ? row.methodName : row.receivedInMethodName]),
      incomeType:type === 'income' ? labelFor(incomeTypes, row.type ?? row.incomeType,
        [row.incomeTypeName, row.typeName]) : null,
      excludedFromTotals:typeof exclude === 'function' ? !!exclude(row) : false,
      totalAmount:units / scale, currency, originalCurrency:row.currency || currency,
      originalAmount:row.originalAmount ?? null, count, direction, minorUnitDigits:digits,
      actualDate:row.date, startDate:dates[0], endDate:dates[dates.length - 1], installments,
    });
  }
  return {plans, coverage};
}

/** Annual expense register. The year is a civil calendar year, independent of the monthly budget start day. */
export function buildInstallmentRegistry({
  expenses = [], year, currency = 'EUR', categories = [], methods = [], excludeExpense,
} = {}) {
  const numericYear = Number(year);
  if (!Number.isInteger(numericYear) || numericYear < 1 || numericYear > 9999 ||
    !/^\d{1,4}$/.test(String(year))) return {status:'N_D', reason:'INVALID_INSTALLMENT_YEAR', records:[], availableYears:[]};
  const yearKey = String(numericYear).padStart(4, '0');
  const period = {start:yearKey + '-01-01', end:yearKey + '-12-31', basis:'calendar_year'};
  try {
    const {plans, coverage} = collectInstallmentPlans(expenses, {currency, categories, methods, exclude:excludeExpense});
    const years = new Set([numericYear]), records = [];
    for (const plan of plans) {
      for (const item of plan.installments) years.add(Number(item.date.slice(0,4)));
      const annualInstallments = plan.installments.filter(item => item.date >= period.start && item.date <= period.end);
      if (!annualInstallments.length) continue;
      const monthlyAmounts = Array.from({length:12}, (_, index) => sumInstallmentAmounts(
        annualInstallments.filter(item => Number(item.date.slice(5,7)) === index + 1)));
      const {installments, ...record} = plan;
      records.push({...record, annualAmount:sumInstallmentAmounts(annualInstallments),
        annualInstallmentCount:annualInstallments.length, annualInstallments, monthlyAmounts});
    }
    records.sort((a,b) => b.actualDate.localeCompare(a.actualDate) || a.id.localeCompare(b.id));
    const counted = records.filter(row => !row.excludedFromTotals), excluded = records.filter(row => row.excludedFromTotals);
    const monthly = (rows, index) => sumInstallmentAmounts(rows.map(row => ({amount:row.monthlyAmounts[index]})));
    return {schema:1, status:'LOADED_DATA', year:numericYear, currency, period, records,
      availableYears:[...years].sort((a,b) => b - a),
      summary:{recordCount:records.length, countedRecordCount:counted.length, excludedRecordCount:excluded.length,
        totalAmount:sumInstallmentAmounts(records, 'totalAmount'), countedTotalAmount:sumInstallmentAmounts(counted, 'totalAmount'),
        excludedTotalAmount:sumInstallmentAmounts(excluded, 'totalAmount'),
        annualAmount:sumInstallmentAmounts(records, 'annualAmount'), countedAnnualAmount:sumInstallmentAmounts(counted, 'annualAmount'),
        excludedAnnualAmount:sumInstallmentAmounts(excluded, 'annualAmount'),
        installmentCount:records.reduce((sum,row) => sum + row.annualInstallmentCount, 0),
        monthlyAmounts:Array.from({length:12}, (_, index) => monthly(records,index)),
        countedMonthlyAmounts:Array.from({length:12}, (_, index) => monthly(counted,index)),
        excludedMonthlyAmounts:Array.from({length:12}, (_, index) => monthly(excluded,index))},
      coverage:{...coverage, validPlanCount:plans.length, relevantRecordCount:records.length,
        basis:'active_loaded_expenses', includesExcluded:true, accountCompletenessCertified:false},
      basis:'ACCOUNTING_ALLOCATION_NOT_BANK_PAYMENTS'};
  } catch (error) {
    return {status:'N_D', reason:error?.message || 'INSTALLMENT_REGISTRY_UNAVAILABLE', year:numericYear,
      currency, period, records:[], availableYears:[numericYear]};
  }
}

export function filterInstallmentRegistryRecords(registry, query = '') {
  const words = normalize(query).split(/\s+/).filter(Boolean);
  return list(registry?.records).filter(record => {
    const text = normalize([record.description, record.categoryName, record.paymentMethod,
      record.totalAmount, record.annualAmount, String(record.totalAmount).replace('.',','),
      String(record.annualAmount).replace('.',','), record.actualDate].join(' '));
    return words.every(word => text.includes(word));
  });
}
