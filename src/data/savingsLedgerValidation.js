import { periodForDate } from '../finance/periodEngine.js';
import { validateSavingsClosures } from './savingsClosureValidation.js';

export function validateSavingsDate(date) {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error('INVALID_SAVINGS_DATE');
  try { periodForDate(date); } catch { throw new Error('INVALID_SAVINGS_DATE'); }
  return date;
}

function validateSnapshot(entry) {
  validateSavingsDate(entry.date);
  if (!['planned','extra'].includes(entry.source)) throw new Error('INVALID_SAVINGS_SOURCE');
  if (!Number.isSafeInteger(entry.amountMinor) || entry.amountMinor <= 0) throw new Error('INVALID_SAVINGS_AMOUNT');
  if (!['active','cancelled'].includes(entry.status) || !Number.isSafeInteger(entry.revision) || entry.revision < 0) throw new Error('INVALID_SAVINGS_ENTRY');
}

// Legacy entries and balances are preserved. New managed ledgers keep their
// opening balance separate, so importing a backup cannot silently double funds.
export function validateSavingsLedger(savings) {
  validateSavingsClosures(savings);
  const totals = new Map();
  for (const entry of savings.entries.filter(e=>e.kind==='closure')) totals.set(entry.bucketId,(totals.get(entry.bucketId)||0)+entry.amountMinor);
  for (const entry of savings.coverageEntries.filter(e=>e.kind==='period-v1')) totals.set(entry.bucketId,(totals.get(entry.bucketId)||0)-entry.amountMinor);
  for (const entry of savings.entries) {
    if (entry.kind !== 'manual') continue;
    if (entry.goalId != null && (typeof entry.goalId !== 'string' || !entry.goalId.trim())) throw new Error('INVALID_SAVINGS_GOAL');
    validateSnapshot(entry);
    const bucket = savings.buckets.find(item => item.id === entry.bucketId);
    if (!bucket || bucket.ledgerVersion !== 1 || entry.currency !== bucket.currency) throw new Error('INVALID_SAVINGS_ENTRY_BUCKET');
    if (!Array.isArray(entry.history) || entry.history.length !== entry.revision) throw new Error('INVALID_SAVINGS_HISTORY');
    entry.history.forEach((snapshot,index)=>{validateSnapshot(snapshot);if(snapshot.revision!==index || snapshot.status!=='active')throw new Error('INVALID_SAVINGS_HISTORY');});
    for (const stamp of [entry.createdAt,entry.updatedAt]) if (typeof stamp !== 'string' || !Number.isFinite(Date.parse(stamp))) throw new Error('INVALID_SAVINGS_TIMESTAMP');
    if (entry.status !== 'cancelled') totals.set(bucket.id,(totals.get(bucket.id)||0)+entry.amountMinor);
  }
  for (const bucket of savings.buckets) {
    if (bucket.ledgerVersion == null) continue;
    if (bucket.ledgerVersion !== 1 || !Number.isSafeInteger(bucket.openingBalanceMinor) || bucket.openingBalanceMinor < 0) throw new Error('INVALID_SAVINGS_OPENING_BALANCE');
    const total = bucket.openingBalanceMinor + (totals.get(bucket.id)||0);
    if (!Number.isSafeInteger(total) || total !== bucket.balanceMinor) throw new Error('INVALID_SAVINGS_LEDGER_BALANCE');
  }
}
