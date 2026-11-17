import { parseMoneyValue } from '../financeCalculations.js';
import { periodForDate, periodForKey, shiftPeriodKey, CALENDAR_PERIOD } from './periodEngine.js';
import { patrimonySnapshotValue } from './patrimonyMerge.js';

const list = x => Array.isArray(x) ? x : [];
const live = x => x && !x.deleted && !x.deletedAt && !['deleted', 'cancelled', 'void'].includes(String(x.status || '').toLowerCase());
const cents = x => Math.round(parseMoneyValue(x) * 100);
export function civilToday(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return false;
  try { periodForDate(value); return true; } catch { return false; }
}
function stamp(row) {
  return Math.max(Number(row.syncUpdatedAtMs)||0, Number(row.updatedAtMs)||0, Date.parse(row.updatedAt||'')||0);
}
// Resolve duplicate IDs before filtering tombstones, so a stale live copy cannot return.
function unique(rows, identity = row => String(row.id)) {
  const byId = new Map();
  for (const row of list(rows)) {
    if (!row || row.id == null || String(row.id).trim() === '') continue;
    const key = identity(row), old = byId.get(key);
    if (!old || stamp(row) > stamp(old) || (stamp(row) === stamp(old) && !live(row))) byId.set(key, row);
  }
  return [...byId.values()];
}
function recurringIdentity(row) {
  const occurrence = row.recurringOccurrenceId ||
    (row.recurringRuleId && row.recurringOccurrenceDate && `${row.recurringRuleId}@${row.recurringOccurrenceDate}`);
  return occurrence ? `recurring:${occurrence}` : `movement:${row.id}`;
}
function events(expenses, incomes, shareCashMovements) {
  const result = [];
  for (const [source, rows] of [['expense', expenses], ['income', incomes], ['share', shareCashMovements]]) {
    const records = source === 'share' ? unique(rows) : unique(unique(rows), recurringIdentity);
    for (const row of records) {
      const kind = source === 'share' ? row.direction : source;
      if (kind !== 'expense' && kind !== 'income') continue;
      const date = String(row.date || '').slice(0,10), amount = Number(parseMoneyValue(row.amount));
      if (row.amount == null || String(row.amount).trim() === '' || (typeof row.amount !== 'number' && !/^[-+]?\s*\d[\d.,\s]*$/.test(String(row.amount).trim())) || !live(row) || row.planned || row.isPlanned || ['planned','pending','scheduled'].includes(String(row.status||'').toLowerCase()) || !validDate(date) || !Number.isFinite(amount)) continue;
      // An old income.methodId is legacy expense metadata, never a receipt destination.
      const methodId = String((kind === 'income' && source !== 'share' ? row.receivedInMethodId : row.methodId) ?? '').trim();
      const transfer = !!(row.isTransfer || row.transferId || ['transfer','giroconto','trasferimento'].includes(String(row.kind||row.type||'').toLowerCase()));
      const statisticalShare = row.source === 'share_project_history' || row.source === 'share_analytics';
      result.push({ statisticalShare, recordedAt: stamp(row) || Date.parse(row.createdAt), id: `${source}:${row.id}`, date, kind, methodId, source, createdAt: row.createdAt, cents: (kind === 'income' ? 1 : -1) * cents(amount), transfer });
    }
  }
  return result;
}
function transferStamp(record) {
  return Date.parse(record.updatedAt || record.deletedAt || record.createdAt) || 0;
}
export function latestPatrimonyTransferVersions(records, before = Infinity) {
  const byId = new Map();
  for (const record of records) {
    if (!record?.id || transferStamp(record) > before) continue;
    const previous = byId.get(String(record.id));
    if (!previous || transferStamp(record) > transferStamp(previous) ||
        (transferStamp(record) === transferStamp(previous) && record.deletedAt)) byId.set(String(record.id), record);
  }
  return [...byId.values()].filter(record => !record.deletedAt);
}
function openingCheckpoints(entry, transfers) {
  const checkpoints = list(entry.balanceLink.checkpoints);
  const opening = checkpoints.filter((cp,index) => index === 0 || !transfers.some(record =>
    record.createdAt === cp.savedAt && cp.date >= record.date &&
    record.after?.[entry.id] != null && cents(record.after[entry.id]) === cents(cp.amount)));
  return opening;
}
export function createBalanceCheckpoint({ date, amount, methodIds, expenses, incomes, shareCashMovements = [], now = new Date().toISOString() }) {
  if (shareCashMovements === null) throw new Error('SHARE_CASH_NOT_READY');
  if (!validDate(date) || date > civilToday(new Date(now)) || String(amount).trim() === '' || !Number.isFinite(Number(amount))) throw new Error('INVALID_BALANCE_CHECKPOINT');
  const ids = [...new Set(list(methodIds).map(String).filter(Boolean))];
  if (!ids.length) throw new Error('MISSING_BALANCE_METHOD');
  const rows = events(expenses, incomes, shareCashMovements);
  const sameDay = rows.filter(e => e.date === date && !e.transfer && !e.statisticalShare);
  const baselineCents = sameDay.filter(e => ids.includes(e.methodId)).reduce((n,e) => n+e.cents,0);
  const shareBaselineIds = rows.filter(e => e.source === 'share' && e.date >= date && !e.transfer).map(e => e.id);
  const trackedIds = rows.filter(e => e.date >= date && !e.transfer && !e.statisticalShare).map(e => e.id);
  return { date, amount: cents(amount)/100, methodIds: ids, baselineCents, shareBaselineIds, trackedIds, savedAt: now };
}
export function derivePatrimony({ entries = [], values = {}, history = {}, expenses = [], incomes = [], shareCashMovements = [], mode = 'manuale', today = civilToday(), periodSettings = CALENDAR_PERIOD }) {
  const output = { values: { ...values }, history: { ...history }, details: {}, conflicts: [], unassigned: 0, excludedTransfers: 0 };
  if (mode === 'manuale' || !validDate(today)) return output;
  const touchedMonths = new Set();
  const datedTransfers = list(entries).flatMap(source => list(source.fundTransfersV1));
  const currentTransfers = latestPatrimonyTransferVersions(datedTransfers);
  const rows = events(expenses, incomes, shareCashMovements), owners = new Map(), currentKey = periodForDate(today, periodSettings).key;
  const linked = list(entries).filter(e => live(e) && e.balanceLink?.version === 1 && e.balanceLink?.enabled && list(e.balanceLink.checkpoints).length && e.balanceLink.checkpoints.every(c => c && validDate(c.date) && Number.isFinite(Number(c.amount)) && list(c.methodIds).length));
  const openings = new Map(linked.map(entry => [entry.id, openingCheckpoints(entry, datedTransfers)]));
  for (const entry of linked) {
    const checkpoint = openings.get(entry.id).at(-1);
    for (const id of list(checkpoint.methodIds).map(String)) {
      if (owners.has(id) && owners.get(id) !== String(entry.id)) output.conflicts.push(id);
      else owners.set(id, String(entry.id));
    }
  }
  output.conflicts = [...new Set(output.conflicts)];
  function balance(entry, date) {
    const cp = openings.get(entry.id).filter(c => c.date <= date).at(-1);
    if (!cp) return null;
    const baselineShare = new Set(list(cp.shareBaselineIds));
    const tracked = new Set(list(cp.trackedIds));
    // A manually confirmed opening already represents the balance at its date.
    // Backdating a later entry before that opening affects the older period,
    // not this independent balance. Creation time must never override its date.
    const selected = rows.filter(e => list(cp.methodIds).map(String).includes(e.methodId) && e.date <= date && (e.date >= cp.date || tracked.has(e.id) || baselineShare.has(e.id)) && !e.transfer &&
      // Older checkpoints could include exported Share quotas in the same-day baseline.
      (!e.statisticalShare || (!Array.isArray(cp.shareBaselineIds) && e.date === cp.date && e.recordedAt <= Date.parse(cp.savedAt))) &&
      // A later method assignment must not debit cash already included in an opening balance.
      (e.source !== 'share' || e.date > cp.date || baselineShare.has(e.id) || Date.parse(e.createdAt) > Date.parse(cp.savedAt)));
    const transferEffect = (records, through) => records.reduce((sum,t) => t.date > through ? sum : sum +
      (String(t.toId) === String(entry.id) ? cents(t.amount) : String(t.fromId) === String(entry.id) ? -cents(t.amount) : 0), 0);
    const transferDelta = transferEffect(currentTransfers,date) -
      transferEffect(latestPatrimonyTransferVersions(datedTransfers, (Date.parse(cp.savedAt) || 0)-1),cp.date);
    const delta = selected.reduce((n,e) => n+e.cents,0) - Number(cp.baselineCents || 0) + transferDelta;
    return { amount: (cents(cp.amount)+delta)/100, delta: delta/100, count: selected.length, checkpoint: cp, blocked: list(cp.methodIds).some(id => output.conflicts.includes(String(id))) };
  }
  for (const entry of linked) {
    const current = balance(entry,today);
    if (!current) continue;
    output.details[String(entry.id)] = current;
    if (current.blocked) continue; // Ambiguous synchronized mappings never move money twice.
    output.values[entry.id] = current.amount;
    const first = entry.balanceLink.checkpoints[0];
    let key = periodForDate(first.date,periodSettings).key;
    const projectedKeys = [];
    for (let guard=0; key <= currentKey && guard < 1200; guard++, key=shiftPeriodKey(key,1)) projectedKeys.push(key);
    const earlierSavedKeys = Object.keys(history).filter(savedKey =>
      /^\d{4}-(0[1-9]|1[0-2])$/.test(savedKey) && savedKey >= '0001-01' && savedKey < projectedKeys[0]);
    for (const key of [...earlierSavedKeys, ...projectedKeys]) {
      const saved = history[key];
      // A cached automatic projection remains live until the month is explicitly saved.
      const projected = saved?._automatic?.[entry.id] && !saved?._confirmedEntries?.[entry.id] && !saved.values && !saved.entries;
      if (key !== currentKey && saved && !projected) {
        const period = periodForKey(key,periodSettings);
        const closedAt = Date.parse(saved._entryConfirmedAt?.[entry.id] || saved._savedAt);
        const opening = openings.get(entry.id);
        const cp = opening.filter(c => c.date <= period.end).at(-1);
        const original = patrimonySnapshotValue(saved,entry);
        const stored = saved._postClosingBase?.[entry.id] ?? (original.found ? original.value : null);
        if (!Number.isFinite(closedAt) || stored == null || !Number.isFinite(Number(stored))) continue;
        // A late cash movement can belong to a confirmed period preceding the link's opening balance.
        // Use the current unambiguous assignment only for post-confirmation movements.
        const methods = new Set((cp || opening.at(-1)).methodIds.map(String));
        const overlay = rows.filter(e => !e.transfer && !e.statisticalShare && methods.has(e.methodId) &&
          (cp || owners.get(e.methodId) === String(entry.id)) &&
          e.date >= period.start && e.date <= period.end && Date.parse(e.createdAt) > closedAt);
        if (!overlay.length && saved._postClosingBase?.[entry.id] == null) continue;
        const snap = {...output.history[key]};
        snap._postClosingBase = {...snap._postClosingBase,[entry.id]:Number(stored)};
        snap[entry.id] = (cents(stored)+overlay.reduce((sum,row)=>sum+row.cents,0))/100;
        output.history[key] = snap;
        touchedMonths.add(key);
        continue;
      }
      const asOf = key === currentKey ? today : periodForKey(key,periodSettings).end;
      const value = balance(entry,asOf);
      if (!value || value.blocked) continue;
      const snap = { ...(key===currentKey?values:{}), ...(output.history[key]||{}), [entry.id]: value.amount };
      snap._automatic = { ...(snap._automatic||{}), [entry.id]: true };
      snap._entryTransactionCounts = { ...(snap._entryTransactionCounts||{}), [entry.id]: value.count || 1 };
      output.history[key] = snap;
      touchedMonths.add(key);
    }
  }
  for (const [key,snap] of Object.entries(output.history)) {
    if (!touchedMonths.has(key)) continue;
    const visible = list(entries).filter(e => live(e) && (!e.archived || Object.prototype.hasOwnProperty.call(snap,e.id)));
    output.history[key] = { ...snap, _total: visible.reduce((n,e) => {
      const entry = patrimonySnapshotValue(snap,e);
      return n+cents(entry.found ? entry.value : key===currentKey ? values[e.id] : 0);
    },0)/100 };
  }
  const earliest = linked.map(e=>e.balanceLink.checkpoints[0].date).sort()[0];
  output.unassigned = rows.filter(e => e.date>=earliest && e.date<=today && !e.transfer && !e.statisticalShare && !owners.has(e.methodId)).length;
  output.excludedTransfers = rows.filter(e=>e.date>=earliest && e.date<=today && e.transfer).length;
  return output;
}

export function balanceMethodOwner(entries, entryId, methodId) {
  return list(entries).find(e => live(e) && String(e.id) !== String(entryId) &&
    e.balanceLink?.enabled && list(e.balanceLink.checkpoints).at(-1)?.methodIds?.map(String).includes(String(methodId)));
}
export function initialBalanceMethods(entry, entries, methods) {
  if (!entry?.balanceLink?.enabled) return [];
  const ids = list(entry.balanceLink.checkpoints).at(-1)?.methodIds || [];
  return [...new Set(ids.map(String))].filter(id =>
    list(methods).some(m => live(m) && !m.archived && String(m.id) === id) &&
    !balanceMethodOwner(entries, entry.id, id));
}
