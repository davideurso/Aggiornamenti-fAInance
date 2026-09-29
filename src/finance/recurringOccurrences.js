import { periodForDate, periodForKey, installmentDate, shiftPeriodKey } from './periodEngine.js';

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

function isCivilDate(value) {
  const raw = String(value || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return false;
  try {
    periodForDate(raw);
    return true;
  } catch (_error) {
    return false;
  }
}

function localCivilDate(value = new Date()) {
  if (typeof value === 'string' && isCivilDate(value.slice(0, 10))) return value.slice(0, 10);
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return [
    String(date.getFullYear()).padStart(4, '0'),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

function ruleSchedule(rule) {
  const annual = String(rule && rule.frequency) === 'annual';
  const legacyAnnual =
    annual &&
    rule.annualMonth == null &&
    rule.monthOfYear == null &&
    rule.month == null;
  const annualMonth =
    Number(rule.annualMonth ?? rule.monthOfYear ?? rule.month ?? rule.dayOfMonth) || 1;
  const rawDay = legacyAnnual ? 1 : Number(rule.dayOfMonth ?? 1);
  const day = rawDay === 0 ? 31 : Math.max(1, Math.min(31, rawDay));
  return { annual, annualMonth, day };
}

function occurrenceDateForMonth(rule, month) {
  if (!rule || !/^\d{4}-\d{2}$/.test(String(month || ''))) return '';
  const schedule = ruleSchedule(rule);
  if (schedule.annual && Number(String(month).slice(5)) !== schedule.annualMonth) return '';
  const year = String(month).slice(0, 4);
  return installmentDate(
    `${year}-01-${String(schedule.day).padStart(2, '0')}`,
    Number(String(month).slice(5)) - 1
  );
}

function occurrenceIsOpen(rule, date, generatedMovements) {
  const month = String(date || '').slice(0, 7);
  const confirmedMonths = asStringSet(rule.confirmed);
  const skippedMonths = asStringSet(rule.skipped);
  const confirmedDates = asStringSet(rule.confirmedOccurrences || rule.confirmedOccurrenceDates);
  const skippedDates = asStringSet(rule.skippedOccurrences || rule.skippedOccurrenceDates);
  if (confirmedMonths.has(month) || skippedMonths.has(month)) return false;
  if (confirmedDates.has(date) || skippedDates.has(date)) return false;
  if (recurringOccurrenceAlreadyGenerated(rule, date, generatedMovements)) return false;
  return true;
}

function asOccurrence(rule, date) {
  const month = String(date).slice(0, 7);
  return {
    ...rule,
    _occurrenceKey: month,
    _occurrenceDate: date,
    _occurrenceId: occurrenceId(rule, date),
  };
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

  return months.flatMap(month => {
    const date = occurrenceDateForMonth(rule, month);
    if (!date) return [];
    if (date < period.start || date >= period.endExclusive) return [];
    if (!occurrenceIsOpen(rule, date, generatedMovements)) return [];
    return [asOccurrence(rule, date)];
  });
}

// Data di attivazione canonica della regola.
// Per le regole nuove effectiveFrom viene salvata in fase di creazione.
// Per le regole legacy non ancora migrate usiamo solo l'inizio del periodo
// contabile corrente: cosi' non inventiamo arretrati storici.
export function recurringEffectiveFrom(rule, today, settings) {
  const explicit = String(rule && rule.effectiveFrom || '').slice(0, 10);
  if (isCivilDate(explicit)) return explicit;
  const civilToday = localCivilDate(today);
  if (!civilToday) return '';
  try {
    return periodForDate(civilToday, settings).start;
  } catch (_error) {
    return civilToday;
  }
}

// Occorrenze realmente da gestire: soltanto date gia' maturate (<= oggi),
// ancora aperte. La scansione parte da effectiveFrom e non dal periodo
// visualizzato, quindi un arretrato resta aperto anche dopo il cambio periodo.
export function recurringDueOccurrences(rule, today, settings, generatedMovements = []) {
  if (!rule) return [];
  const civilToday = localCivilDate(today);
  if (!civilToday) return [];
  const effectiveFrom = recurringEffectiveFrom(rule, civilToday, settings);
  if (!effectiveFrom || effectiveFrom > civilToday) return [];

  let month = effectiveFrom.slice(0, 7);
  const lastMonth = civilToday.slice(0, 7);
  const rows = [];
  let guard = 0;

  while (month <= lastMonth && guard < 1200) {
    const date = occurrenceDateForMonth(rule, month);
    if (
      date &&
      date >= effectiveFrom &&
      date <= civilToday &&
      occurrenceIsOpen(rule, date, generatedMovements)
    ) {
      rows.push(asOccurrence(rule, date));
    }
    if (month === lastMonth) break;
    month = shiftPeriodKey(month, 1);
    guard += 1;
  }

  return rows.sort((a, b) => String(a._occurrenceDate).localeCompare(String(b._occurrenceDate)));
}

// Risolve una specifica occorrenza anche quando appartiene a un periodo
// precedente. Serve per conferme tardive da pagina Ricorrenti o notifica.
export function recurringOccurrenceForDate(rule, date, today, settings, generatedMovements = []) {
  const target = String(date || '').slice(0, 10);
  if (!isCivilDate(target)) return null;
  return (
    recurringDueOccurrences(rule, today, settings, generatedMovements).find(
      occurrence => String(occurrence._occurrenceDate) === target
    ) || null
  );
}
