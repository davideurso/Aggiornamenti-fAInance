export function validateBudgetPlan(plan) {
  if (!plan || typeof plan !== 'object' || Array.isArray(plan) || !Array.isArray(plan.items)) throw new Error('INVALID_BUDGET_PLAN');
  for (const value of [plan.income, plan.manualIncome]) {
    if (value != null && (!Number.isFinite(value) || value < 0)) throw new Error('INVALID_BUDGET_INCOME');
  }
  const ids = new Set();
  for (const item of plan.items) {
    if (!item || item.catId == null || !Number.isFinite(item.amount) || item.amount < 0 || ids.has(String(item.catId))) throw new Error('INVALID_BUDGET_ITEM');
    ids.add(String(item.catId));
    if (item.allocationMode != null && !['amount','percent'].includes(item.allocationMode)) throw new Error('INVALID_BUDGET_ALLOCATION_MODE');
    if (item.allocationMode === 'percent' && (!Number.isFinite(item.pct) || item.pct < 0)) throw new Error('INVALID_BUDGET_PERCENTAGE');
  }
  if (plan.savingsPlannedAmounts != null) {
    if (typeof plan.savingsPlannedAmounts !== 'object' || Array.isArray(plan.savingsPlannedAmounts) || !/^[A-Z]{3}$/.test(plan.savingsPlanCurrency || '')) throw new Error('INVALID_SAVINGS_PLAN');
    let total = 0;
    for (const [id, amount] of Object.entries(plan.savingsPlannedAmounts)) {
      if (!id || !Number.isSafeInteger(amount) || amount < 0) throw new Error('INVALID_SAVINGS_PLAN_AMOUNT');
      total += amount;
      if (!Number.isSafeInteger(total)) throw new Error('INVALID_SAVINGS_PLAN_AMOUNT');
    }
  }
  return plan;
}
