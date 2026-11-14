export function validInstallmentCount(value) {
  return String(value ?? '').trim() !== '' && Number.isInteger(Number(value)) && Number(value) >= 1 && Number(value) <= 240;
}

export function validateInstallmentInput(form, ctx) {
  if (!form.rateizzato || validInstallmentCount(form.rate)) return true;
  const messages = {
    it: 'Inserisci un numero intero di mesi da 1 a 240.',
    en: 'Enter a whole number of months from 1 to 240.',
    es: 'Introduce un número entero de meses entre 1 y 240.',
    fr: 'Saisissez un nombre entier de mois entre 1 et 240.',
    de: 'Gib eine ganze Anzahl von Monaten zwischen 1 und 240 ein.',
    pt: 'Insere um número inteiro de meses entre 1 e 240.',
    pl: 'Wpisz całkowitą liczbę miesięcy od 1 do 240.',
    nl: 'Voer een geheel aantal maanden van 1 tot 240 in.',
    ro: 'Introdu un număr întreg de luni între 1 și 240.',
    ru: 'Введите целое число месяцев от 1 до 240.',
    el: 'Εισαγάγετε ακέραιο αριθμό μηνών από 1 έως 240.',
  };
  ctx.setToast?.({ text: messages[ctx.lang] || messages.it, type: 'error', duration: 6000 });
  return false;
}
