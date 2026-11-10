import { roundCurrency, toolCurrencyAllowed } from '../finance/tools';

export function findImportCurrencyColumn(columns: string[]): string {
  return columns.find(column => /^(valuta|codicevaluta|divisa|currency|currencycode|originalcurrency|devise|wahrung|moneda|moeda|waluta|munteenheid|νομισμα)$/.test(String(column).normalize('NFD').replace(/[\u0300-\u036f\s_.()/-]/g, '').toLowerCase())) || '';
}

export function normalizeImportCurrency(value: unknown, base: string, definitions: any[]): string {
  const raw = String(value == null ? '' : value).trim();
  if (!raw) return base;
  const code = definitions.find(item => item.code === raw.toUpperCase());
  if (code) return code.code;
  const matches = definitions.filter(item => String(item.name).toLowerCase() === raw.toLowerCase() || item.symbol === raw);
  if (matches.length === 1) return matches[0].code;
  throw new Error('IMPORT_CURRENCY_INVALID');
}

export async function convertImportedCurrencyRows(rows: any[], baseCurrency: string, definitions: any[], fetchRate: (from: string, to: string) => Promise<number>, options: { plan: string; secondary: string }) {
  const base = String(baseCurrency || 'EUR').toUpperCase();
  if (!definitions.some(item => item.code === base)) throw new Error('IMPORT_CURRENCY_INVALID');
  const plan = ['complete', 'completo'].includes(options.plan) ? 'premium' : options.plan;
  const normalized = rows.map(row => {
    const currency = normalizeImportCurrency(row.currency, base, definitions);
    if (!toolCurrencyAllowed(currency, base, options.secondary.toUpperCase(), plan)) throw new Error('IMPORT_CURRENCY_PLAN');
    return { ...row, currency };
  });
  const rates = new Map<string, number>([[base, 1]]);
  const date = new Date().toISOString().slice(0, 10);
  // Resolve all quotes before returning a preview or allowing any data writes.
  await Promise.all([...new Set(normalized.map(row => row.currency))].filter(code => code !== base).map(async code => {
    const rate = Number(await fetchRate(code, base));
    if (!Number.isFinite(rate) || rate <= 0) throw new Error('IMPORT_CURRENCY_RATE');
    rates.set(code, rate);
  }));
  return normalized.map(row => {
    const original = Number(row.amount), foreign = row.currency !== base, rate = rates.get(row.currency)!;
    const amount = foreign ? roundCurrency(original * rate, base) : original;
    if (!Number.isFinite(amount) || amount < 0) throw new Error('IMPORT_CURRENCY_RATE');
    if (original > 0 && amount === 0) throw new Error('IMPORT_CURRENCY_AMOUNT');
    return { ...row, amount, currency: row.currency, originalAmount: foreign ? original : null, baseCurrency: base, baseAmount: amount, exchangeRate: rate, exchangeRateDate: date, exchangeRateSource: foreign ? 'tool-fx' : 'base' };
  });
}

export function importedCurrencyFields(row: any) {
  return { currency: row.currency, originalAmount: row.originalAmount, baseCurrency: row.baseCurrency, baseAmount: row.baseAmount, exchangeRate: row.exchangeRate, exchangeRateDate: row.exchangeRateDate, exchangeRateSource: row.exchangeRateSource };
}

export function assertImportCurrencyContext(rows: any[], baseCurrency: string, options: { plan: string; secondary: string }) {
  const base = String(baseCurrency || 'EUR').toUpperCase();
  const plan = ['complete', 'completo'].includes(options.plan) ? 'premium' : options.plan;
  for (const row of rows) {
    if (row.baseCurrency !== base) throw new Error('IMPORT_CURRENCY_BASE_CHANGED');
    if (!toolCurrencyAllowed(row.currency, base, options.secondary.toUpperCase(), plan)) throw new Error('IMPORT_CURRENCY_PLAN');
  }
}
