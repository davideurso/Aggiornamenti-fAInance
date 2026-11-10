const copy = {
  it: ['Rateizzazione', 'Tutti', 'Rateizzati', 'Non rateizzati'],
  en: ['Installments', 'All', 'In installments', 'No installments'],
  es: ['Pago en cuotas', 'Todos', 'En cuotas', 'Sin cuotas'],
  fr: ['Échelonnement', 'Tous', 'Échelonnés', 'Non échelonnés'],
  de: ['Ratenzahlung', 'Alle', 'In Raten', 'Ohne Raten'],
  pt: ['Prestações', 'Todos', 'Em prestações', 'Sem prestações'],
  pl: ['Podział na raty', 'Wszystkie', 'Na raty', 'Bez rat'],
  nl: ['Termijnen', 'Alle', 'In termijnen', 'Zonder termijnen'],
  ro: ['Rate', 'Toate', 'În rate', 'Fără rate'],
  el: ['Δόσεις', 'Όλες', 'Σε δόσεις', 'Χωρίς δόσεις'],
};
const keys = {filter: 0, all: 1, installments: 2, nonInstallments: 3};

export function installmentRegistryText(language, key) {
  const locale = String(language || 'en').toLowerCase().split(/[-_]/)[0];
  return (copy[locale] || copy.en)[keys[key]] || '';
}
