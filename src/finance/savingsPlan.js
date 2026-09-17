import { budgetForPeriod, plannedSavings, saveBudgetForPeriod } from './budgetEngine.js';
import { validateBudgetPlan } from '../data/budgetValidation.js';

export function savingsPlanSummary(plan) {
  const assignments = plan?.savingsPlannedAmounts || {};
  const allocated = Object.values(assignments).reduce((sum, amount) => sum + Number(amount), 0);
  const available = plannedSavings(plan);
  return { allocated, available, remaining: available - allocated };
}

// Amounts here are planned whole currency units, not ledger entries or balances.
// They belong to a versioned Budget plan, so monthly exceptions preserve history.
export function setSavingsPlanAmount(finance, legacyPlan, periodKey, bucketId, amount, currency, scope = 'month') {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('INVALID_SAVINGS_PLAN_AMOUNT');
  const bucket = finance.savings.buckets.find(item => item.id === bucketId);
  if (!bucket) throw new Error('BUCKET_NOT_FOUND');
  if (bucket.active === false) throw new Error('INACTIVE_SAVINGS_BUCKET');
  const plan = budgetForPeriod(finance, legacyPlan, periodKey) || { income: 0, items: [] };
  if (bucket.currency !== currency || (plan.savingsPlanCurrency && plan.savingsPlanCurrency !== currency)) throw new Error('SAVINGS_PLAN_CURRENCY');
  const next = { ...plan, savingsPlanCurrency: currency, savingsPlannedAmounts: { ...plan.savingsPlannedAmounts, [bucketId]: amount } };
  validateBudgetPlan(next);
  if (savingsPlanSummary(next).remaining < -0.000001 && savingsPlanSummary(next).allocated >= savingsPlanSummary(plan).allocated) throw new Error('SAVINGS_PLAN_EXCEEDED');
  return saveBudgetForPeriod(finance, legacyPlan, periodKey, next, scope);
}
