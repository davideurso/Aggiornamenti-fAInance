import { validatePeriodSettings } from '../finance/periodEngine.js';

export const PERIOD_CONFIRMATION_KEY = 'pref_balance_period_confirmation_v1';
export function readPeriodConfirmation(raw) {
  try {
    const value = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!value || value.confirmed !== true || !Number.isFinite(value.updatedAt) || value.updatedAt <= 0) return null;
    return { confirmed: true, period: validatePeriodSettings(value.period), updatedAt: value.updatedAt };
  } catch { return null; }
}

// Confirmation is monotonic. Absence in a pre-feature backup cannot undo it.
// Only the caller's account-scoped storage is supplied; no other owner is read.
export function keepPeriodConfirmation(values, localRaw, financeRaw, financeTimestamp) {
  let local = readPeriodConfirmation(localRaw);
  try {
    const finance = typeof financeRaw === 'string' ? JSON.parse(financeRaw) : financeRaw;
    if (finance?.periodIntroductionSeen === true && (!local || financeTimestamp > local.updatedAt)) {
      local = readPeriodConfirmation({ confirmed: true, period: finance.period, updatedAt: Math.max(1, Number(financeTimestamp) || 1) }) || local;
    }
  } catch {}
  const incoming = readPeriodConfirmation(values?.[PERIOD_CONFIRMATION_KEY]);
  const selected = local && (!incoming || local.updatedAt > incoming.updatedAt) ? local : incoming;
  const result = { ...values };
  if (selected) result[PERIOD_CONFIRMATION_KEY] = JSON.stringify(selected);
  else delete result[PERIOD_CONFIRMATION_KEY];
  return result;
}
