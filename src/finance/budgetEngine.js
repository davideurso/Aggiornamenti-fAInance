import { migrateFinanceEvolution } from '../data/financeEvolution.js';
import { periodForKey, comparisonPeriodKeys } from './periodEngine.js';
import { totalForMonth } from '../financeCalculations.js';
import { validateBudgetPlan } from '../data/budgetValidation.js';
export { validateBudgetPlan } from '../data/budgetValidation.js';

export function budgetReferenceIncome(plan, fallback = 0) {
  return Number(plan?.manualIncome ?? plan?.income ?? fallback) || 0;
}

export function budgetSourceForPeriod(finance, periodKey) {
  periodForKey(periodKey);
  if (finance?.budget?.overrides?.[periodKey]) return { kind: 'month', from: periodKey };
  const version = (finance?.budget?.standardVersions || []).filter(value => value.from <= periodKey)
    .reduce((latest, value) => !latest || value.from > latest.from ? value : latest, null);
  return { kind: 'standard', from: version?.from === '0001-01' ? null : version?.from || null };
}

export function resetBudgetForPeriod(finance, periodKey) {
  periodForKey(periodKey);
  const data = migrateFinanceEvolution(finance);
  const overrides = { ...data.budget.overrides };
  delete overrides[periodKey];
  return { ...data, budget: { ...data.budget, overrides } };
}

export function plannedSavings(plan) {
  return Math.max(0, (Number(plan?.manualIncome ?? plan?.income) || 0) -
    (plan?.items || []).reduce((sum, item) => sum + (Number(item.amount) || 0), 0));
}

// Existing monthly comparison views can consume this average while totals and
// saving trends retain each month's actual version and override.
export function averageBudgetForPeriods(getPlan, keys) {
  if (!keys.length) return null;
  const plans = keys.map(getPlan);
  if (!plans.some(Boolean)) return null;
  const items = new Map();
  let income = 0;
  for (const plan of plans) {
    income += Number(plan?.manualIncome ?? plan?.income) || 0;
    for (const item of plan?.items || []) {
      const key = String(item.catId);
      const previous = items.get(key) || { ...item, amount: 0 };
      items.set(key, { ...previous, amount: previous.amount + (Number(item.amount) || 0) / keys.length });
    }
  }
  return { income: income / keys.length, items: [...items.values()] };
}

export function budgetForPeriod(finance, legacyPlan, periodKey) {
  periodForKey(periodKey);
  const config = finance?.budget;
  const override = config?.overrides?.[periodKey];
  if (override) return override;
  const version = (config?.standardVersions || []).filter(value => value.from <= periodKey)
    .reduce((latest, value) => !latest || value.from > latest.from ? value : latest, null);
  return version ? version.plan : legacyPlan;
}

export function saveBudgetForPeriod(finance, legacyPlan, periodKey, plan, scope = 'future') {
  periodForKey(periodKey);
  validateBudgetPlan(plan);
  if (!['month','future'].includes(scope)) throw new Error('INVALID_BUDGET_SCOPE');
  const data = migrateFinanceEvolution(finance);
  const config = { ...data.budget, overrides: { ...data.budget.overrides }, standardVersions: [...data.budget.standardVersions] };
  if (!config.standardVersions.length) {
    // Preserve the legacy plan verbatim as the historical baseline, even when
    // only a single-month override is being introduced.
    config.standardVersions.push({ id: 'legacy-budget', from: '0001-01', plan: structuredClone(legacyPlan || { income: 0, items: [] }) });
  }
  if (scope === 'month') config.overrides[periodKey] = structuredClone(plan);
  else {
    config.standardVersions = config.standardVersions.filter(value => value.from < periodKey);
    config.standardVersions.push({ id: `budget:${periodKey}`, from: periodKey, plan: structuredClone(plan) });
    config.standardVersions.sort((a,b)=>a.from.localeCompare(b.from));
    delete config.overrides[periodKey];
  }
  return { ...data, budget: config };
}

export function budgetPeriodSummary(expenses, incomes, plan, periodKey, settings, comparison = 'previous') {
  const expense = totalForMonth(expenses,periodKey,'reale',settings);
  const income = totalForMonth(incomes,periodKey,'reale',settings);
  const realSaving = income-expense;
  const plannedIncome = Number(plan?.manualIncome ?? plan?.income) || 0;
  const plannedSpending = (plan?.items || []).reduce((sum,item)=>sum+(Number(item.amount)||0),0);
  const plannedSaving = Math.max(0,plannedIncome-plannedSpending);
  const comparisonKeys = comparisonPeriodKeys(periodKey,comparison);
  const comparisonSaving = comparisonKeys.reduce((sum,key)=>sum+totalForMonth(incomes,key,'reale',settings)-totalForMonth(expenses,key,'reale',settings),0)/comparisonKeys.length;
  return { income, expense, realSaving, plannedSaving,
    planAchievement: plannedSaving > 0 ? realSaving/plannedSaving : null,
    actualSavingsRate: income > 0 ? realSaving/income : null,
    comparisonKeys, comparisonSaving, difference: realSaving-comparisonSaving,
  };
}
