import {validateToolData} from '../finance/tools.js';
import { CALENDAR_PERIOD, validatePeriodSettings, periodForKey } from '../finance/periodEngine.js';
import { validateBudgetPlan } from './budgetValidation.js';
import { validateSavingsLedger } from './savingsLedgerValidation.js';
import { validateAutomaticRule } from '../finance/automaticRules.js';

export const FINANCE_EVOLUTION_VERSION = 1;
const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function record(value, name) {
  if (!isRecord(value)) throw new Error(`INVALID_FINANCE_${name}`);
  return value;
}
function rows(value, name) {
  if (!Array.isArray(value)) throw new Error(`INVALID_FINANCE_${name}`);
  const ids = new Set();
  for (const row of value) {
    record(row, name);
    if (typeof row.id !== 'string' || !row.id || ids.has(row.id)) throw new Error(`INVALID_FINANCE_${name}_ID`);
    ids.add(row.id);
  }
  return value;
}

export function createFinanceEvolution() {
  return {
    schemaVersion: FINANCE_EVOLUTION_VERSION,
    period: { ...CALENDAR_PERIOD },
    periodIntroductionSeen: false,
    budget: { comparison: 'previous', standardVersions: [], overrides: {} },
    savings: { buckets: [], entries: [], closures: [], deficits: [], coverageEntries: [] },
    rules: [],
    tools: { calculator: [], converter: [], lastCurrencyPair: null, recentCurrencies: [] },
    advice: [],
  };
}

// Additive, deterministic and idempotent. The original Budget and all user records
// remain outside this document; no historical balances or allocations are invented.
export function migrateFinanceEvolution(input) {
  if (input === undefined || input === null) return createFinanceEvolution();
  record(input, 'DOCUMENT');
  const version = input.schemaVersion === undefined ? 0 : input.schemaVersion;
  if (!Number.isInteger(version) || version < 0 || version > FINANCE_EVOLUTION_VERSION) throw new Error('UNSUPPORTED_FINANCE_SCHEMA');
  const defaults = createFinanceEvolution();
  const value = {
    ...defaults, ...input,
    schemaVersion: FINANCE_EVOLUTION_VERSION,
    period: validatePeriodSettings(input.period === undefined ? defaults.period : input.period),
    budget: { ...defaults.budget, ...record(input.budget ?? {}, 'BUDGET') },
    savings: { ...defaults.savings, ...record(input.savings ?? {}, 'SAVINGS') },
    tools: { ...defaults.tools, ...record(input.tools ?? {}, 'TOOLS') },
  };
  if (!['previous', 'previousYear', 'average6', 'average12'].includes(value.budget.comparison)) throw new Error('INVALID_FINANCE_COMPARISON');
  rows(value.budget.standardVersions, 'BUDGET_VERSIONS');
  const versionDates = new Set();
  for (const version of value.budget.standardVersions) {
    periodForKey(version.from);
    if (versionDates.has(version.from)) throw new Error('DUPLICATE_BUDGET_VERSION');
    versionDates.add(version.from);
    validateBudgetPlan(version.plan);
  }
  record(value.budget.overrides, 'BUDGET_OVERRIDES');
  for (const key of Object.keys(value.budget.overrides)) { periodForKey(key); validateBudgetPlan(value.budget.overrides[key]); }
  for (const name of ['buckets', 'entries', 'closures', 'deficits', 'coverageEntries']) rows(value.savings[name], name.toUpperCase());
  for (const bucket of value.savings.buckets) {
    if (!Number.isSafeInteger(bucket.balanceMinor) || bucket.balanceMinor < 0) throw new Error('INVALID_SAVINGS_BALANCE');
    if (bucket.goalId != null && typeof bucket.goalId !== 'string') throw new Error('INVALID_SAVINGS_GOAL');
  }
  for (const entry of value.savings.entries) {
    if (!['planned', 'residual', 'extra'].includes(entry.source)) throw new Error('INVALID_SAVINGS_SOURCE');
    if (!Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0) throw new Error('INVALID_SAVINGS_AMOUNT');
  }
  validateSavingsLedger(value.savings);
  rows(value.rules, 'RULES');
  value.rules.forEach(validateAutomaticRule);
  rows(value.advice, 'ADVICE');
  rows(value.tools.calculator, 'CALCULATOR');
  rows(value.tools.converter, 'CONVERTER');
  validateToolData(value.tools);
  if (!Array.isArray(value.tools.recentCurrencies)) throw new Error('INVALID_RECENT_CURRENCIES');
  return value;
}

// Backup merge must never add two copies of a money movement or overwrite a
// conflicting ledger silently. Validate the entire result before any setter runs.
export function mergeFinanceEvolution(current, incoming) {
  const left = migrateFinanceEvolution(current), right = migrateFinanceEvolution(incoming);
  function mergeRows(a, b) {
    const merged = new Map(a.map(row => [row.id, row]));
    for (const row of b) {
      if (merged.has(row.id) && JSON.stringify(merged.get(row.id)) !== JSON.stringify(row)) throw new Error('FINANCE_BACKUP_CONFLICT');
      merged.set(row.id, row);
    }
    return [...merged.values()];
  }
  // A settings conflict is explicit: users can choose the existing replace flow.
  if (JSON.stringify(left.period) !== JSON.stringify(right.period)) throw new Error('FINANCE_BACKUP_PERIOD_CONFLICT');
  const savings = { ...left.savings, ...right.savings };
  for (const name of ['buckets', 'entries', 'closures', 'deficits', 'coverageEntries']) savings[name] = mergeRows(left.savings[name], right.savings[name]);
  const overrides = { ...left.budget.overrides };
  for (const [key, value] of Object.entries(right.budget.overrides)) {
    if (key in overrides && JSON.stringify(overrides[key]) !== JSON.stringify(value)) throw new Error('FINANCE_BACKUP_CONFLICT');
    overrides[key] = value;
  }
  return migrateFinanceEvolution({
    ...left, ...right, savings,
    budget: { ...left.budget, ...right.budget, overrides, standardVersions: mergeRows(left.budget.standardVersions, right.budget.standardVersions) },
    rules: mergeRows(left.rules, right.rules), advice: mergeRows(left.advice, right.advice),
    tools: { ...left.tools, ...right.tools, calculator: mergeRows(left.tools.calculator, right.tools.calculator), converter: mergeRows(left.tools.converter, right.tools.converter) },
  });
}

export function selectFinanceEvolution(local, cloud, localTimestamp, cloudTimestamp, preferLocal = false) {
  if (cloud === undefined || (local !== undefined && (preferLocal || Number(localTimestamp || 0) > Number(cloudTimestamp || 0)))) return migrateFinanceEvolution(local);
  return migrateFinanceEvolution(cloud);
}
