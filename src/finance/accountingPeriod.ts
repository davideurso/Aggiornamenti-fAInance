import { CALENDAR_PERIOD, periodForDate, periodForKey, lastPeriodKeys, shiftPeriodKey, validatePeriodSettings, type PeriodSettings } from './periodEngine';
import { itemAmountForMonth, totalForMonth } from '../financeCalculations';

// One engine instance per account context. No shared mutable period or storage reads
// in calculation helpers, so switching accounts cannot leak another user's setting.
export function createAccountingPeriod(settings: PeriodSettings = CALENDAR_PERIOD) {
  const config = validatePeriodSettings(settings);
  function keyForDate(value: string | Date) {
    try { return periodForDate(value, config).key; } catch { return ''; }
  }
  return {
    settings: config,
    keyForDate,
    matches(value: string, prefix: string) {
      const periodKey = keyForDate(value);
      return /^\d{4}(?:-\d{2})?$/.test(String(prefix)) && !!periodKey && periodKey.startsWith(String(prefix));
    },
    forKey: (key: string) => periodForKey(key, config),
    forDate: (value: string | Date = new Date()) => periodForDate(value, config),
    lastKeys: (count: number, reference: string | Date = new Date(), includeCurrent = true) => lastPeriodKeys(count, reference, config, includeCurrent),
    shiftKey: shiftPeriodKey,
    amount: (item: any, key: string) => itemAmountForMonth(item, key, config),
    total: (items: any[], key: string, mode: 'reale' | 'rateizzato' = 'reale') => totalForMonth(items, key, mode, config),
  };
}
