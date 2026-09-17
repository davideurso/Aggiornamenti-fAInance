import { migrateFinanceEvolution } from '../data/financeEvolution.js';

// Contributions belong to the goal captured when the entry was created, never
// to the bucket's current link. Old balances are not retroactively allocated.
export function goalSavingsMinor(finance, goal, currency) {
  if (!goal) return 0;
  const unit = goal.currency || currency;
  return (finance?.savings?.entries || []).reduce((total, entry) =>
    ['manual','closure'].includes(entry.kind) && entry.status === 'active' &&
    entry.goalId === String(goal.id) && entry.currency === unit
      ? total + entry.amountMinor : total, 0) - (finance?.savings?.coverageEntries || []).filter(e=>e.kind==='period-v1'&&e.currency===unit).reduce((n,e)=>n+(e.goalDebits||[]).filter(d=>d.goalId===String(goal.id)).reduce((sum,d)=>sum+d.amountMinor,0),0);
}

export function goalSavedAmount(finance, goal, currency) {
  return (Number(goal?.saved) || 0) + goalSavingsMinor(finance, goal, currency) / 100;
}

export function linkSavingsGoal(finance, bucketId, goalId, goals, currency, expectedGoalId) {
  const data = migrateFinanceEvolution(finance);
  const bucket = data.savings.buckets.find(item => item.id === bucketId);
  if (!bucket) throw new Error('BUCKET_NOT_FOUND');
  if ((bucket.goalId || null) !== (expectedGoalId || null)) throw new Error('SAVINGS_ENTRY_CONFLICT');
  const nextId = goalId == null || goalId === '' ? null : String(goalId);
  if (nextId) {
    const goal = (goals || []).find(item => String(item.id) === nextId);
    if (!goal) throw new Error('SAVINGS_GOAL_UNAVAILABLE');
    if ((goal.currency || currency) !== bucket.currency) throw new Error('SAVINGS_GOAL_CURRENCY');
    if (goalSavedAmount(data, goal, currency) >= Number(goal.target)) throw new Error('SAVINGS_GOAL_COMPLETE');
  }
  if ((bucket.goalId || null) === nextId) return finance;
  return migrateFinanceEvolution({...data,savings:{...data.savings,buckets:data.savings.buckets.map(item => item.id === bucketId ? {...item,goalId:nextId} : item)}});
}
