import { migrateFinanceEvolution } from '../data/financeEvolution.js';

function checkedName(buckets, value, id) {
  const name = typeof value === 'string' ? value.trim().replace(/\s+/gu, ' ') : '';
  if (!name || [...name].length > 60) throw new Error('INVALID_BUCKET_NAME');
  const key = name.normalize('NFKC').toLowerCase();
  if (buckets.some(bucket => bucket.id !== id && String(bucket.name || '').trim().replace(/\s+/gu, ' ').normalize('NFKC').toLowerCase() === key)) {
    throw new Error('DUPLICATE_BUCKET_NAME');
  }
  return name;
}

// This package manages identities and availability only. It never assigns money,
// changes historical entries, or changes an existing bucket's currency or goal.
export function createSavingsBucket(finance, { id, name, currency }) {
  const value = migrateFinanceEvolution(finance);
  if (typeof id !== 'string' || !id.trim() || value.savings.buckets.some(bucket => bucket.id === id)) throw new Error('INVALID_BUCKET_ID');
  if (typeof currency !== 'string' || !/^[A-Z]{3}$/.test(currency)) throw new Error('INVALID_BUCKET_CURRENCY');
  const bucket = { id, name: checkedName(value.savings.buckets, name), active: true, currency, plannedMinor: 0, balanceMinor: 0, goalId: null };
  return migrateFinanceEvolution({ ...value, savings: { ...value.savings, buckets: [...value.savings.buckets, bucket] } });
}

export function updateSavingsBucket(finance, id, patch) {
  const value = migrateFinanceEvolution(finance);
  const bucket = value.savings.buckets.find(item => item.id === id);
  if (!bucket) throw new Error('BUCKET_NOT_FOUND');
  if (!patch || typeof patch !== 'object' || Object.keys(patch).some(key => !['name', 'active'].includes(key))) throw new Error('INVALID_BUCKET_PATCH');
  const next = { ...bucket };
  if ('name' in patch) next.name = checkedName(value.savings.buckets, patch.name, id);
  if ('active' in patch) {
    if (typeof patch.active !== 'boolean') throw new Error('INVALID_BUCKET_ACTIVE');
    next.active = patch.active;
  }
  if (JSON.stringify(next) === JSON.stringify(bucket)) return finance;
  return migrateFinanceEvolution({ ...value, savings: { ...value.savings, buckets: value.savings.buckets.map(item => item.id === id ? next : item) } });
}
