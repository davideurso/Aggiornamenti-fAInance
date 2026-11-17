import { shiftCivilDate } from './financialInsights.js';
import { validCalendarDate } from './financialCalendar.js';

export function compareWhatIf({ today, forecast, savings, budget, monthlyPlanMargin = null, hypothesis }) {
  const { start, expense, installment, installments, income, fixedCost, openingBalance } = hypothesis;
  const end = shiftCivilDate(today, 90);
  if (!validCalendarDate(start) || start < today || start > end ||
      ![expense, installment, income, fixedCost, openingBalance ?? 0].every(value =>
        Number.isSafeInteger(Math.round(value * 100)) && Math.abs(value) <= 1e9) ||
      !Number.isInteger(installments) || installments < 1 || installments > 120) {
    throw new Error('INVALID_WHAT_IF');
  }

  const toCents = value => Math.round(value * 100);
  const changes = [{ date:start, income:0, expense:toCents(expense) }];
  for (let index = 1; index <= 3; index++) {
    const date = shiftCivilDate(start, index * 30);
    if (date > end) break;
    changes.push({
      date,
      income: toCents(income),
      expense: toCents(fixedCost) + (index <= installments ? toCents(installment) : 0),
    });
  }
  const horizons = forecast.horizons.map(row => {
    const delta = changes.filter(change => change.date <= row.date)
      .reduce((total, change) => total + change.income - change.expense, 0) / 100;
    const fromHistory = savings?.horizons.find(entry => entry.days === row.days)?.estimatedSavings ?? null;
    const known = row.knownIncome || row.knownExpense ? row.knownChange : null;
    const cashFlow = row.estimatedChange ?? known;
    const planned = monthlyPlanMargin === null ? null : toCents(monthlyPlanMargin) * (row.days / 30) / 100;
    const current = fromHistory ?? cashFlow ?? planned;
    const scenario = current === null ? null : (toCents(current) + toCents(delta)) / 100;
    const balance = value => value === null || openingBalance === null
      ? null : (toCents(openingBalance) + toCents(value)) / 100;
    return {
      days: row.days, date:row.date, delta,
      basis: fromHistory !== null ? 'history' : row.estimatedChange !== null ? 'forecast' : known !== null ? 'scheduled' : planned !== null ? 'plan' : 'unavailable',
      current, scenario, currentBalance: balance(current),
      scenarioBalance: balance(scenario),
    };
  });
  const budgetDelta = budget ? changes
    .filter(change => change.date >= budget.start && change.date <= budget.end)
    .reduce((total, change) => total + change.expense, 0) : 0;
  return {
    horizons,
    budget: budget ? {
      current: budget.remaining,
      scenario: (toCents(budget.remaining) - budgetDelta) / 100,
    } : null,
  };
}
