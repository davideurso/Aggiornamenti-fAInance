// Device-local, account-scoped reminders. This foreground engine has no backend,
// push or email side effects. Native/background delivery is not implied.
const PREFIX = 'fainance_custom_reminder_inbox_v2_';
// Preserve dismissal independently from the visible inbox. A rule remains due
// for up to five minutes and would otherwise recreate a deleted occurrence.
const DISMISSED_PREFIX = 'fainance_custom_reminder_dismissed_v1_';
const MS_MINUTE = 60_000;

export function monthEndDay(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}
export function salaryDayInMonth(value, year, monthIndex) {
  const day = Number(value);
  const end = monthEndDay(year, monthIndex);
  if (!Number.isFinite(day) || day === 0) return end;
  return Math.min(end, Math.max(1, Math.trunc(day)));
}
function validTime(value) {
  const result = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ''));
  return result ? [Number(result[1]), Number(result[2])] : null;
}
function localDate(dateText, hour, minute) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateText || ''))) return null;
  const [year, month, day] = dateText.split('-').map(Number);
  const value = new Date(year, month - 1, day, hour, minute);
  if (value.getFullYear() !== year || value.getMonth() !== month - 1 || value.getDate() !== day) return null;
  return value;
}
function occurrenceForDay(rule, date) {
  const hm = validTime(rule.hour);
  if (!hm) return null;
  const [hour, minute] = hm;
  const year = date.getFullYear(), month = date.getMonth(), day = date.getDate();
  const frequency = String(rule.freq || 'monthly');
  if (frequency === 'once') return localDate(rule.date, hour, minute);
  if (frequency === 'daily') return new Date(year, month, day, hour, minute);
  if (frequency === 'weekly') return date.getDay() === Number(rule.dayOfWeek ?? 1) ? new Date(year, month, day, hour, minute) : null;
  if (frequency === 'monthly') {
    const requested = Number(rule.dayOfMonth ?? 1);
    if (!Number.isInteger(requested) || requested < 1 || requested > 31) return null;
    return day === Math.min(requested, monthEndDay(year, month)) ? new Date(year, month, day, hour, minute) : null;
  }
  if (frequency === 'yearly') {
    const raw = String(rule.date || '');
    const dateParts = /^\d{4}-(\d{2})-(\d{2})$/.exec(raw);
    if (!dateParts) return null;
    const requestedMonth = Number(dateParts[1]) - 1, requestedDay = Number(dateParts[2]);
    if (requestedMonth !== month || requestedDay < 1 || requestedDay > 31) return null;
    return day === Math.min(requestedDay, monthEndDay(year, month)) ? new Date(year, month, day, hour, minute) : null;
  }
  return null;
}
function occurrenceKey(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
export function dueCustomReminders(records, timestamp = Date.now(), withinMinutes = 24 * 60) {
  const now = new Date(timestamp);
  if (!Number.isFinite(now.getTime())) return [];
  const found = [];
  // Current day and preceding day cover midnight and late UI wake-up.
  for (const rule of Array.isArray(records) ? records : []) {
    if (!rule || rule.active === false || !String(rule.title || '').trim()) continue;
    for (let back = 0; back <= 1; back++) {
      const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - back);
      const occurrence = occurrenceForDay(rule, day);
      if (!occurrence) continue;
      const lag = timestamp - occurrence.getTime();
      if (lag < 0 || lag > withinMinutes * MS_MINUTE) continue;
      found.push({
        id: `local_custom_${String(rule.id).replace(/[^a-z0-9_-]/gi, '_')}_${occurrenceKey(occurrence)}`,
        type: 'custom_reminder',
        title: String(rule.title).trim().slice(0, 140),
        message: String(rule.text || '').trim().slice(0, 500),
        createdAt: occurrence.toISOString(),
        createdAtMs: occurrence.getTime(),
        severity: 'info',
        source: 'local_custom',
        read: false,
      });
      break;
    }
  }
  return found;
}
function storageKey(userId) { return PREFIX + String(userId || ''); }
function dismissedKey(userId) { return DISMISSED_PREFIX + String(userId || ''); }
function readDismissed(userId) {
  if (!userId || typeof localStorage === 'undefined') return {};
  try {
    const value = JSON.parse(localStorage.getItem(dismissedKey(userId)) || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch { return {}; }
}
function rememberDismissed(userId, ids) {
  if (!userId || typeof localStorage === 'undefined' || !ids.length) return;
  const now = Date.now();
  const retained = Object.fromEntries(Object.entries(readDismissed(userId))
    .filter(([id, ms]) => /^local_(?:custom|salary)_/.test(id) && Number(ms) >= now - 90 * 86400000));
  for (const id of ids) if (/^local_(?:custom|salary)_/.test(id)) retained[id] = now;
  // Bounded registry: IDs include the occurrence date, so 90 days suffices.
  const recent = Object.entries(retained).sort((a, b) => Number(b[1]) - Number(a[1])).slice(0, 1000);
  localStorage.setItem(dismissedKey(userId), JSON.stringify(Object.fromEntries(recent)));
}
export function readLocalReminders(userId) {
  if (!userId || typeof localStorage === 'undefined') return [];
  try {
    const value = JSON.parse(localStorage.getItem(storageKey(userId)) || '[]');
    return Array.isArray(value) ? value.filter((v) => v && (v.type === 'custom_reminder' || v.type === 'salary_reminder')).slice(0, 100) : [];
  } catch { return []; }
}
function writeLocalReminders(userId, items) {
  if (!userId || typeof localStorage === 'undefined') return [];
  const dismissed = readDismissed(userId);
  const next = items.filter((item) => !dismissed[item.id]).slice(0, 100);
  localStorage.setItem(storageKey(userId), JSON.stringify(next));
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('fainance:local-custom-reminders', { detail: { userId } }));
  return next;
}
export function dueSalaryReminder(prefs, timestamp = Date.now(), withinMinutes = 24 * 60) {
  if (!prefs || prefs.stipendioActive !== true) return [];
  const now = new Date(timestamp);
  const [hour, minute] = validTime(prefs.stipendioHour || '18:00') || [18, 0];
  // Include the previous month for a reminder set on its final day.
  for (let back = 0; back <= 1; back++) {
    const month = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const day = salaryDayInMonth(prefs.stipendioDay ?? 0, month.getFullYear(), month.getMonth());
    const at = new Date(month.getFullYear(), month.getMonth(), day, hour, minute);
    const lag = timestamp - at.getTime();
    if (lag < 0 || lag > withinMinutes * MS_MINUTE) continue;
    return [{ id: 'local_salary_' + occurrenceKey(at), type: 'salary_reminder', title: 'Stipendio', message: '',
      createdAt: at.toISOString(), createdAtMs: at.getTime(), severity: 'info', source: 'local_custom', read: false }];
  }
  return [];
}
export function collectDueLocalReminders(userId, records, timestamp = Date.now(), prefs = {}) {
  if (!userId || typeof localStorage === 'undefined') return [];
  const current = readLocalReminders(userId);
  const dismissed = readDismissed(userId);
  const known = new Set([...current.map((item) => item.id), ...Object.keys(dismissed)]);
  const added = [...dueCustomReminders(records, timestamp), ...dueSalaryReminder(prefs, timestamp)]
    .filter((item) => !known.has(item.id)).map((item) => ({ ...item, targetUid: userId }));
  if (added.length) writeLocalReminders(userId, [...added, ...current]);
  return added;
}
export function markLocalReminderRead(userId, id) {
  writeLocalReminders(userId, readLocalReminders(userId).map((item) => item.id === id ? { ...item, read: true } : item));
}
export function markAllLocalRemindersRead(userId) {
  writeLocalReminders(userId, readLocalReminders(userId).map((item) => ({ ...item, read: true })));
}
export function removeLocalReminder(userId, id) {
  if (!userId || !id) return;
  // Tombstone first: foreground timer must not resurrect an occurrence.
  rememberDismissed(userId, [String(id)]);
  writeLocalReminders(userId, readLocalReminders(userId).filter((item) => item.id !== id));
}
export function clearLocalReminders(userId) {
  if (!userId) return;
  rememberDismissed(userId, readLocalReminders(userId).map((item) => item.id));
  writeLocalReminders(userId, []);
}
