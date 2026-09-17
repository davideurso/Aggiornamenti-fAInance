// Amounts entered directly remain fixed. Only explicitly entered percentages
// follow income changes; a rounded display percentage is never a new amount.
export function budgetEditorItems(plan, categories) {
  return categories.map(category => {
    const saved = (plan?.items || []).find(item => String(item.catId) === String(category.id));
    return { ...saved, catId: category.id, amount: Number(saved?.amount) || 0,
      pct: Number(saved?.pct) || 0, allocationMode: saved?.allocationMode || 'amount' };
  });
}

export function repriceBudgetItems(items, income) {
  return items.map(item => item.allocationMode === 'percent'
    ? { ...item, amount: Math.round(income * item.pct / 100) }
    : { ...item, pct: income > 0 ? Math.round(item.amount / income * 100) : 0 });
}

export function updateBudgetItem(items, id, input, mode, income) {
  const value = Math.max(0, Math.round(Number(input) || 0));
  return items.map(item => String(item.catId) !== String(id) ? item : {
    ...item, allocationMode: mode,
    amount: mode === 'percent' ? Math.round(income * value / 100) : value,
    pct: mode === 'percent' ? value : income > 0 ? Math.round(value / income * 100) : 0,
  });
}

export function preserveHiddenBudgetItems(plan, editedItems) {
  const ids = new Set(editedItems.map(item => String(item.catId)));
  return editedItems.concat((plan?.items || []).filter(item => !ids.has(String(item.catId))));
}
