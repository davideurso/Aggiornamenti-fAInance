import {parseMoneyValue} from '../financeCalculations.js';
import {validCalendarDate} from './financialCalendar.js';

// The visible submit control and save handler share the same validation.
export function recurringMissingFields(form, currency) {
  const missing = [];
  if (!String(form.name || '').trim()) missing.push('name');
  if (!(parseMoneyValue(form.amount) > 0)) missing.push('amount');
  if (String(form.currency || currency) !== String(currency) &&
      !(Number(form.exchangeRate) > 0 && Number(form.baseAmount) > 0)) missing.push('exchange');
  if (form.rtype === 'income') {
    if (!String(form.incomeType || '').trim()) missing.push('incomeType');
  } else {
    if (!String(form.catId || '').trim()) missing.push('category');
    if (!String(form.methodId || '').trim()) missing.push('payment');
  }
  if (!String(form.dayOfMonth ?? '').trim() || !Number.isInteger(Number(form.dayOfMonth)) ||
      Number(form.dayOfMonth) < (form.frequency === 'annual' ? 1 : 0) || Number(form.dayOfMonth) > 31)
    missing.push('day');
  if (form.frequency === 'annual' && (!validCalendarDate(form.effectiveFrom) ||
      Number(form.annualMonth) < 1 || Number(form.annualMonth) > 12)) missing.push('date');
  if (form.rateizzato && (!Number.isInteger(Number(form.rate)) || Number(form.rate) < 1 || Number(form.rate) > 240)) missing.push('installments');
  return missing;
}
