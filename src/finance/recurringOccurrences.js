import { periodForKey, installmentDate } from './periodEngine.js';

function occurrenceId(rule, date) {
  return String(rule && rule.id != null ? rule.id : '') + '@' + String(date || '');
}

function asStringSet(value) {
  return new Set((Array.isArray(value) ? value : []).map(String));
}

function moneyNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  let raw = String(value == null ? '' : value).trim().replace(/[^\d,.\-]/g, '');
  if (!raw) return 0;
  const comma = raw.lastIndexOf(',');
  const dot = raw.lastIndexOf('.');
  if (comma >= 0 && dot >= 0) {
    raw = comma > dot ? raw.replace(/\./g, '').replace(',', '.') : raw.replace(/,/g, '');
  } else if (comma >= 0) {
    raw = raw.replace(',', '.');
  }
  const number = Number.parseFloat(raw);
  return Number.isFinite(number) ? number : 0;
}

function movementMatchesOccurrence(rule, date, movement) {
  if (!rule || !movement) return false;
  const id = occurrenceId(rule, date);
  if (String(movement.recurringOccurrenceId || '') === id) return true;
  if (
    String(movement.recurringRuleId || '') === String(rule.id ?? '') &&
    String(movement.recurringOccurrenceDate || '') === String(date)
  ) return true;

  // Retrocompatibilita: le vecchie transazioni ricorrenti non salvavano ancora
  // l'identita dell'occorrenza. Riconosciamo soltanto una corrispondenza completa
  // (data + importo + descrizione + classificazione), evitando deduzioni dal
  // periodo contabile visualizzato.
  if (String(movement.date || '') !== String(date)) return false;
  if (Math.abs(moneyNumber(movement.amount) - moneyNumber(rule.amount)) > 0.005) return false;
  if (String(movement.desc || movement.description || '') !== String(rule.name || '')) return false;
  if (String(rule.rtype) === 'expense') {
    if (String(movement.catId ?? '') !== String(rule.catId ?? '')) return false;
    if (String(movement.methodId ?? '') !== String(rule.methodId ?? '')) return false;
  } else {
    if (String(movement.type ?? movement.incomeType ?? '') !== String(rule.incomeType ?? '')) return false;
  }
  return true;
}

export function recurringOccurrenceAlreadyGenerated(rule, date, generatedMovements) {
  return (Array.isArray(generatedMovements) ? generatedMovements : []).some(movement =>
    movementMatchesOccurrence(rule, date, movement)
  );
}

// L'identita di una ricorrenza dipende esclusivamente dalla regola e dalla sua
// data civile prevista. Mese solare / finanziario stabiliscono soltanto in quale
// periodo visualizzarla e non possono creare una nuova occorrenza.
export function recurringOccurrencesInPeriod(rule, key, settings, generatedMovements = []) {
  if (!rule) return [];
  const period = periodForKey(key, settings);
  const months = [...new Set([period.start.slice(0, 7), period.end.slice(0, 7)])];
  const annual = String(rule.frequency) === 'annual';
  const legacyAnnual = annual && rule.annualMonth == null && rule.monthOfYear == null && rule.month == null;
  const annualMonth = Number(rule.annualMonth ?? rule.monthOfYear ?? rule.month ?? rule.dayOfMonth) || 1;
  const rawDay = legacyAnnual ? 1 : Number(rule.dayOfMonth ?? 1);
  const day = rawDay === 0 ? 31 : Math.max(1, Math.min(31, rawDay));
  const confirmedMonths = asStringSet(rule.confirmed);
  const skippedMonths = asStringSet(rule.skipped);
  const confirmedDates = asStringSet(rule.confirmedOccurrences || rule.confirmedOccurrenceDates);
  const skippedDates = asStringSet(rule.skippedOccurrences || rule.skippedOccurrenceDates);

  return months.flatMap(month => {
    if (annual && Number(month.slice(5)) !== annualMonth) return [];
    const year = month.slice(0, 4);
    const date = installmentDate(`${year}-01-${String(day).padStart(2, '0')}`, Number(month.slice(5)) - 1);
    if (date < period.start || date >= period.endExclusive) return [];
    if (confirmedMonths.has(month) || skippedMonths.has(month)) return [];
    if (confirmedDates.has(date) || skippedDates.has(date)) return [];
    if (recurringOccurrenceAlreadyGenerated(rule, date, generatedMovements)) return [];
    return [{ ...rule, _occurrenceKey: month, _occurrenceDate: date, _occurrenceId: occurrenceId(rule, date) }];
  });
}
