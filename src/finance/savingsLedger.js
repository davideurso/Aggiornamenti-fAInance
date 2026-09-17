import { migrateFinanceEvolution } from '../data/financeEvolution.js';
import { validateSavingsDate } from '../data/savingsLedgerValidation.js';

export function savingsAmountMinor(raw) {
  const value = String(raw ?? '').trim().replace(',', '.');
  if (!/^\d+(?:\.\d{1,2})?$/.test(value)) throw new Error('INVALID_SAVINGS_AMOUNT');
  const [whole, fraction = ''] = value.split('.');
  const result = Number(whole)*100 + Number(fraction.padEnd(2,'0'));
  if (!Number.isSafeInteger(result) || result <= 0) throw new Error('INVALID_SAVINGS_AMOUNT');
  return result;
}

function snapshot(entry) {
  return {date:entry.date,amountMinor:entry.amountMinor,source:entry.source,status:entry.status,revision:entry.revision};
}

function commit(data, bucket, entries) {
  const openingBalanceMinor = bucket.ledgerVersion === 1 ? bucket.openingBalanceMinor : bucket.balanceMinor;
  const balanceMinor = entries.filter(entry=>entry.bucketId===bucket.id && ['manual','closure'].includes(entry.kind) && entry.status==='active')
    .reduce((total,entry)=>total+entry.amountMinor,openingBalanceMinor) - data.savings.coverageEntries.filter(e=>e.kind==='period-v1'&&e.bucketId===bucket.id).reduce((n,e)=>n+e.amountMinor,0);
  return migrateFinanceEvolution({...data,savings:{...data.savings,entries,buckets:data.savings.buckets.map(item=>item.id===bucket.id?{...item,ledgerVersion:1,openingBalanceMinor,balanceMinor}:item)}});
}

export function saveSavingsEntry(finance, input, now = new Date().toISOString()) {
  const data = migrateFinanceEvolution(finance);
  const bucket = data.savings.buckets.find(item=>item.id===input.bucketId);
  if (!bucket) throw new Error('BUCKET_NOT_FOUND');
  if (typeof input.id !== 'string' || !input.id.trim()) throw new Error('INVALID_SAVINGS_ENTRY');
  const old = data.savings.entries.find(entry=>entry.id===input.id);
  if (old && (old.kind !== 'manual' || old.bucketId !== bucket.id || old.status === 'cancelled')) throw new Error('SAVINGS_ENTRY_UNAVAILABLE');
  if (old ? old.revision !== input.expectedRevision : input.expectedRevision != null) throw new Error('SAVINGS_ENTRY_CONFLICT');
  if (!old && bucket.active === false) throw new Error('INACTIVE_SAVINGS_BUCKET');
  if (input.currency !== bucket.currency) throw new Error('SAVINGS_ENTRY_CURRENCY');
  validateSavingsDate(input.date);
  if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor <= 0) throw new Error('INVALID_SAVINGS_AMOUNT');
  if (!['planned','extra'].includes(input.source)) throw new Error('INVALID_SAVINGS_SOURCE');
  if (old && old.date===input.date && old.amountMinor===input.amountMinor && old.source===input.source) return finance;
  if (!old && input.expectedGoalId !== undefined && (input.expectedGoalId || null) !== (bucket.goalId || null)) throw new Error('SAVINGS_ENTRY_CONFLICT');
  const goalId = old ? (old.goalId || null) : input.source === 'extra' && input.includeGoal === false ? null : (bucket.goalId || null);
  const entry = {...old,id:input.id,kind:'manual',bucketId:bucket.id,currency:bucket.currency,goalId,date:input.date,amountMinor:input.amountMinor,source:input.source,status:'active',revision:old?old.revision+1:0,createdAt:old?.createdAt||now,updatedAt:now,history:old?[...old.history,snapshot(old)]:[]};
  return commit(data,bucket,old?data.savings.entries.map(item=>item.id===entry.id?entry:item):[...data.savings.entries,entry]);
}

export function cancelSavingsEntry(finance, id, expectedRevision, now = new Date().toISOString()) {
  const data = migrateFinanceEvolution(finance);
  const old = data.savings.entries.find(entry=>entry.id===id);
  if (!old || old.kind !== 'manual') throw new Error('SAVINGS_ENTRY_UNAVAILABLE');
  if (old.status === 'cancelled') return finance;
  if (old.revision !== expectedRevision) throw new Error('SAVINGS_ENTRY_CONFLICT');
  const bucket = data.savings.buckets.find(item=>item.id===old.bucketId);
  const entry = {...old,status:'cancelled',revision:old.revision+1,updatedAt:now,history:[...old.history,snapshot(old)]};
  return commit(data,bucket,data.savings.entries.map(item=>item.id===id?entry:item));
}
