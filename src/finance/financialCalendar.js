// Calendario finanziario (2.1.12): proiezione locale di sola lettura.
// Non scrive su movimenti/ricorrenze, non ricostruisce saldi bancari.
import { installmentDate, shiftPeriodKey } from './periodEngine.js';
import { recurringOccurrencesInPeriod } from './recurringOccurrences.js';
import { parseMoneyValue } from '../financeCalculations.js';
import { shareAmountForUser } from './shareUserAmount.js';

// Share paidBy is a participant ID, never a display name or the signed-in viewer.
export function calendarPayerName(person, currentUser, userId) {
  if (!person || typeof person !== 'object') return '';
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();
  const usable = (value, record) => {
    const text = clean(value), lower = text.replace(/^@+/, '').toLowerCase();
    if (!text) return false;
    if (record.kind === 'fake' || record.type === 'fake') return true;
    return !text.includes('@') && !['user', 'utente', 'participant', 'partecipante'].includes(lower) &&
      lower !== clean(record.username).replace(/^@+/, '').toLowerCase() &&
      lower !== clean(record.email).split('@')[0].toLowerCase() && lower !== clean(record.uid).toLowerCase();
  };
  const own = userId && String(person.uid || '') === String(userId) ? currentUser : null;
  for (const record of [own, person]) {
    if (!record) continue;
    const first = clean(record.firstName || record.givenName), last = clean(record.lastName || record.familyName);
    for (const value of [first && last ? first + ' ' + last : '', record.name, record.displayName, record.fullName, first || last]) {
      if (usable(value, record)) return clean(value);
    }
  }
  return '';
}

const CIVIL = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const CALENDAR = { mode: 'calendar', startDay: 1 };

export function validCalendarDate(value) {
  const raw = String(value || '').slice(0, 10);
  if (!CIVIL.test(raw)) return false;
  const y = Number(raw.slice(0, 4));
  const m = Number(raw.slice(5, 7));
  const d = Number(raw.slice(8, 10));
  return y >= 1900 && d <= new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function calendarMonthDays(month) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month || ''))) return [];
  const y = Number(month.slice(0, 4));
  if (y < 1900 || y > 9998) return [];
  const count = new Date(Date.UTC(y, Number(month.slice(5)), 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, '0')}`);
}

function eligible(value) {
  if (!value || typeof value !== 'object') return false;
  const status = String(value.status || '').toLowerCase();
  return !value.deleted && !value.archived && status !== 'deleted' && status !== 'archived' && status !== 'cancelled';
}

function cents(value) {
  const number = parseMoneyValue(value);
  return Number.isFinite(number) ? Math.round(number * 100) : 0;
}

function movementRows(row, kind, source, idPrefix, until, sourceIndex = 0) {
  // row.date e' la data effettiva scelta dall'utente: mai usare createdAt/updatedAt.
  if (!eligible(row) || !validCalendarDate(row.date)) return [];
  const amount = cents(row.amount);
  if (amount === 0) return [];
  const date = String(row.date).slice(0, 10);
  // Unique even when legacy/backup rows have no ID (or reused IDs):
  // duplicate React keys could previously display a different day's row
  // alongside another day's totals after navigating months.
  const idValue = String(row.id ?? row._id ?? `legacy-${sourceIndex}`);
  const identifier = `${idPrefix}:${idValue}:${date}:${sourceIndex}`;
  const title = String(row.desc || row.description || row.name || (kind === 'income' ? 'Entrata' : 'Uscita'));
  const provenance = source === 'planned' || row.recurringOccurrenceId || row.recurringId || row.generatedFromRecurringId
    ? 'recurring'
    : (row._share || row.shareProjectId || row.shareActivityId || source === 'share')
      ? 'share' : kind === 'income' ? 'income' : 'expense';
  const metadata = {
    date,
    categoryId: row.catId ?? null,
    categoryName: String(row.categoryName || row.categoryNameSnapshot || ''),
    methodId: row.methodId ?? null,
    methodName: String(row.methodName || ''),
    incomeType: row.type ?? row.itype ?? null,
    projectName: String(row.shareProjectName || row._shareProjectName || ''),
    paidBy: String(row.paidByName || row._sharePaidBy || ''),
    shareCategory: String(row.shareCategoryName || ''),
    note: String(row.note || row.notes || ''),
    currency: String(row.currency || ''),
    originalAmount: row.originalAmount ?? null,
  };
  const n = row.rateizzato ? Number(row.rate) : 1;
  const accountingInstallments = Number.isInteger(n) && n > 1 && n <= 240 ? n : 1;
  // Il Calendario e' una proiezione delle quote mensili DALLA data
  // effettiva in avanti, indipendentemente dalla direzione CONTABILE
  // usata altrove (es. Rateizza -> Indietro). Un totale di 1200 EUR
  // in 12 rate dal primo agosto produce 100 EUR il primo di ogni mese.
  const total = accountingInstallments;
  const base = Math.floor(amount / total);
  const entries = [];
  for (let i = 0; i < total; i++) {
    let occurrence;
    try { occurrence = i === 0 ? date : installmentDate(date, i); } catch { continue; }
    if (occurrence > until) continue;
    const piece = i === total - 1 ? amount - base * (total - 1) : base;
    entries.push({
      id: `${identifier}:${i}`,
      date: occurrence,
      kind,
      title,
      cents: kind === 'income' ? piece : -piece,
      source: total > 1 ? `${source}-installment` : source,
      provenance,
      metadata,
      installment: total > 1 ? { number: i + 1, of: total } : null,
    });
  }
  return entries;
}

// Single authoritative summary: day rows and totals MUST describe the same entries.
// Reject accidental stale-day rows and non-integer cents from legacy data.
export function summarizeFinancialCalendarEntries(date, list = []) {
  const entries = (Array.isArray(list) ? list : []).filter(item =>
    item && item.date === date && Number.isSafeInteger(item.cents) && item.cents !== 0);
  const incomeCents = entries.reduce((sum, item) => sum + (item.cents > 0 ? item.cents : 0), 0);
  const expenseCents = entries.reduce((sum, item) => sum + (item.cents < 0 ? -item.cents : 0), 0);
  return { entries, incomeCents, expenseCents, changeCents: incomeCents - expenseCents };
}

// Saldo cumulativo dai soli movimenti registrati, incluse eventuali rate.
// Le ricorrenze future ancora non confermate sono incluse separatamente.
export function buildFinancialCalendar({
  expenses = [], incomes = [], recurring = [], shareProjects = [], userId = '', currentUser = null, payerNames = {},
  month, today,
  excludeExpense = () => false,
  excludeIncome = () => false,
} = {}) {
  const days = calendarMonthDays(month);
  if (!days.length || !validCalendarDate(today)) throw new Error('INVALID_CALENDAR_RANGE');
  const end = days[days.length - 1];
  const actual = [];
  const expenseList = Array.isArray(expenses) ? expenses.filter(eligible) : [];
  const incomeList = Array.isArray(incomes) ? incomes.filter(eligible) : [];
  const importedShare = new Set(expenseList.filter(row => row && (row.shareProjectId || row._shareProjectId) && row.shareActivityId)
    .map(row => `${String(row.shareProjectId || row._shareProjectId)}:${String(row.shareActivityId)}`));
  function payerName(project, activity) {
    const person = (project?.participants || []).find(p => String(p.id) === String(activity?.paidBy));
    return calendarPayerName(person, currentUser, userId) ||
      (person && payerNames[JSON.stringify([String(project.id), String(person.id)])]) || '';
  }
  expenseList.forEach((row, index) => {
    const project = shareProjects.find(p => String(p.id) === String(row.shareProjectId || row._shareProjectId));
    const activity = project?.activities?.find(a => String(a.id) === String(row.shareActivityId));
    if (activity) row = { ...row, paidByName: payerName(project, activity) || '—' };
    else if (row._share || row.shareProjectId || row._shareProjectId) {
      row = { ...row, paidByName: calendarPayerName({ name: row.paidByName || row._sharePaidBy }) || '—' };
    }
    if (!excludeExpense(row)) actual.push(...movementRows(row, 'expense', 'recorded', 'e', end, index));
  });
  // Le spese Share live non sono automaticamente incluse nell'array personale.
  // Inserire la sola quota corrente evitando duplicati importati nello Storico.
  for (const project of Array.isArray(shareProjects) ? shareProjects : []) {
    if (!eligible(project)) continue;
    for (const activity of Array.isArray(project.activities) ? project.activities : []) {
      if (!eligible(activity) || activity.kind === 'settlement') continue;
      const uniqueId = `${String(project.id)}:${String(activity.id)}`;
      if (importedShare.has(uniqueId) || !validCalendarDate(activity.date)) continue;
      const personalShare = shareAmountForUser(project, activity, userId);
      if (!(personalShare > 0)) continue;
      const shareRow = {
        id: `share_${uniqueId}`, date: activity.date, amount: personalShare,
        desc: activity.desc || 'Share', shareProjectId: project.id, shareActivityId: activity.id,
        shareProjectName: project.name || 'Share', shareCategoryName: (project.categories || []).find(x => String(x.id) === String(activity.shareCategoryId))?.name || '',
        paidByName: payerName(project, activity) || '—',
      };
      if (!excludeExpense(shareRow)) actual.push(...movementRows(shareRow, 'expense', 'share', 's', end));
    }
  }
  incomeList.forEach((row, index) => {
    if (!excludeIncome(row)) actual.push(...movementRows(row, 'income', 'recorded', 'i', end, index));
  });
  const planned = [];
  if (end >= today) {
    // Finestra non illimitata: il componente consente al massimo 36 mesi futuri.
    let cursor = today.slice(0, 7);
    let guard = 0;
    while (cursor <= month && guard < 48) {
      for (const rule of Array.isArray(recurring) ? recurring : []) {
        if (!eligible(rule)) continue;
        const kind = String(rule.rtype || 'expense') === 'income' ? 'income' : 'expense';
        if (kind === 'expense' ? excludeExpense({ catId: rule.catId, categoryName: rule.categoryNameSnapshot }) : excludeIncome({ type: rule.incomeType })) continue;
        const movementList = kind === 'income' ? incomeList : expenseList;
        let occurrences = [];
        try { occurrences = recurringOccurrencesInPeriod(rule, cursor, CALENDAR, movementList); } catch { continue; }
        for (const occ of occurrences) {
          const occurrenceDate = String(occ._occurrenceDate || '');
          if (occurrenceDate < today || occurrenceDate > end) continue;
          if (validCalendarDate(rule.effectiveFrom) && occurrenceDate < String(rule.effectiveFrom).slice(0, 10)) continue;
          const synthetic = { ...rule, date: occurrenceDate, desc: rule.name, id: String(rule.id ?? '') + '@' + occurrenceDate };
          planned.push(...movementRows(synthetic, kind, 'planned', 'r', end));
        }
      }
      if (cursor === month) break;
      cursor = shiftPeriodKey(cursor, 1);
      guard++;
    }
  }
  const entries = [...actual, ...planned].sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  let openingCents = 0;
  const byDay = {};
  for (const entry of entries) {
    if (entry.date < days[0]) {
      openingCents += entry.cents;
    } else if (entry.date <= end) {
      (byDay[entry.date] || (byDay[entry.date] = [])).push(entry);
    }
  }
  let cumulative = openingCents;
  let monthlyIncomeCents = 0;
  let monthlyExpenseCents = 0;
  const daily = days.map(date => {
    // Exactly one source of truth for day, list and money totals.
    // The original effective date is never inferred from createdAt or backup timestamps.
    const movementSummary = summarizeFinancialCalendarEntries(date, byDay[date]);
    const inc = movementSummary.incomeCents;
    const exp = movementSummary.expenseCents;
    monthlyIncomeCents += inc;
    monthlyExpenseCents += exp;
    cumulative += inc - exp;
    return { date, entries: movementSummary.entries, income: inc / 100, expense: exp / 100,
      change: (inc - exp) / 100, balance: cumulative / 100 };
  });
  return {
    month,
    today,
    days: daily,
    openingBalance: openingCents / 100,
    income: monthlyIncomeCents / 100,
    expense: monthlyExpenseCents / 100,
    change: (monthlyIncomeCents - monthlyExpenseCents) / 100,
    endBalance: cumulative / 100,
  };
}
