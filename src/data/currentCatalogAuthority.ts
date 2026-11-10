// Current account catalogs are live account data. A full-settings backup may
// supply missing legacy fields, but cannot replace an existing live catalog.
export function reconcileAuthorityCatalogs(authority: any, main: any, anchor: any) {
  if (!authority || !authority.values || typeof authority.values !== 'object') return authority;
  const values = { ...authority.values };
  function section(name: string) {
    const a = Number(main?.schemaVersion) === 4 ? main[name] : null;
    const b = Number(anchor?.schemaVersion) === 4 ? anchor[name] : null;
    const usable = (v: any) => v && v.data && typeof v.data === 'object' && !Array.isArray(v.data);
    if (!usable(a)) return usable(b) ? b.data : null;
    if (!usable(b)) return a.data;
    return Number(b.updatedAtMs || 0) > Number(a.updatedAtMs || 0) ? b.data : a.data;
  }
  function put(data: any, field: string, key: string, kind: 'array' | 'object' | 'any' = 'array') {
    if (!data || !Object.prototype.hasOwnProperty.call(data, field)) return;
    const value = data[field];
    if (kind === 'array' && !Array.isArray(value)) return;
    if (kind === 'object' && (!value || typeof value !== 'object' || Array.isArray(value))) return;
    values[key] = JSON.stringify(value);
  }
  const expense = section('expenseCatalog');
  put(expense, 'categories', 'cats_v10'); put(expense, 'groups', 'expense_groups_v1');
  const payment = section('paymentCatalog');
  put(payment, 'methods', 'meth_v10'); put(payment, 'groups', 'method_groups_v1');
  const income = section('incomeCatalog');
  put(income, 'groups', 'income_groups_v1'); put(income, 'customTypes', 'custom_income_types_v1');
  put(income, 'overrides', 'income_type_overrides_v1', 'object');
  const prefs = section('categoryPreferences');
  const preferenceKeys: Record<string,string> = {
    catOrder: 'cat_order_v1', methodOrder: 'method_order_v1', incomeTypeOrder: 'income_type_order_v1',
    catSortMode: 'cat_sort_mode', methodSortMode: 'method_sort_mode',
    defaultExpenseCat: 'default_expense_cat_v1', defaultExpenseMethod: 'default_expense_method_v1',
    defaultIncomeType: 'default_income_type_v1', defaultExpenseArea: 'default_expense_area_v1',
    defaultIncomeArea: 'default_income_area_v1', defaultMethodArea: 'default_method_area_v1',
  };
  Object.entries(preferenceKeys).forEach(([field,key]) => put(prefs,field,key,'any'));
  return { ...authority, values };
}
