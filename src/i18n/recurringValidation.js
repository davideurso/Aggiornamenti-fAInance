const copy = {
  it: ['Impossibile salvare la ricorrente. Compila o correggi: {fields}.', 'nome', 'importo', 'cambio valuta', 'tipo di entrata', 'categoria', 'metodo di pagamento', 'giorno', 'data', 'numero di rate'],
  en: ['Cannot save the recurring transaction. Complete or correct: {fields}.', 'name', 'amount', 'exchange rate', 'income type', 'category', 'payment method', 'day', 'date', 'number of installments'],
  es: ['No se puede guardar la transacción recurrente. Completa o corrige: {fields}.', 'nombre', 'importe', 'tipo de cambio', 'tipo de ingreso', 'categoría', 'método de pago', 'día', 'fecha', 'número de cuotas'],
  fr: ['Impossible d’enregistrer la transaction récurrente. Complétez ou corrigez : {fields}.', 'nom', 'montant', 'taux de change', 'type de revenu', 'catégorie', 'moyen de paiement', 'jour', 'date', 'nombre de mensualités'],
  de: ['Die wiederkehrende Buchung kann nicht gespeichert werden. Ergänze oder korrigiere: {fields}.', 'Name', 'Betrag', 'Wechselkurs', 'Einnahmeart', 'Kategorie', 'Zahlungsmethode', 'Tag', 'Datum', 'Anzahl der Raten'],
  pt: ['Não é possível guardar a transação recorrente. Preenche ou corrige: {fields}.', 'nome', 'valor', 'taxa de câmbio', 'tipo de receita', 'categoria', 'método de pagamento', 'dia', 'data', 'número de prestações'],
  pl: ['Nie można zapisać transakcji cyklicznej. Uzupełnij lub popraw: {fields}.', 'nazwa', 'kwota', 'kurs wymiany', 'rodzaj przychodu', 'kategoria', 'metoda płatności', 'dzień', 'data', 'liczba rat'],
  nl: ['De terugkerende transactie kan niet worden opgeslagen. Vul in of corrigeer: {fields}.', 'naam', 'bedrag', 'wisselkoers', 'inkomstentype', 'categorie', 'betaalmethode', 'dag', 'datum', 'aantal termijnen'],
  ro: ['Tranzacția recurentă nu poate fi salvată. Completează sau corectează: {fields}.', 'nume', 'sumă', 'curs valutar', 'tip de venit', 'categorie', 'metodă de plată', 'zi', 'dată', 'număr de rate'],
  el: ['Δεν είναι δυνατή η αποθήκευση της επαναλαμβανόμενης συναλλαγής. Συμπληρώστε ή διορθώστε: {fields}.', 'όνομα', 'ποσό', 'συναλλαγματική ισοτιμία', 'τύπος εισοδήματος', 'κατηγορία', 'μέθοδος πληρωμής', 'ημέρα', 'ημερομηνία', 'αριθμός δόσεων'],
};
const keys = ['name','amount','exchange','incomeType','category','payment','day','date','installments'];
export function recurringValidationMessage(lang, fields) {
  const text = copy[lang] || copy.en;
  return text[0].replace('{fields}', fields.map(key => text[keys.indexOf(key) + 1]).join(', '));
}
