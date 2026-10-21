import { useMemo } from 'react';
import { useApp } from '../core';
import { buildFinancialForecast } from '../finance/financialInsights.js';

const TEXT: Record<string, string[]> = {
  "it": [
    "Previsione a 30/60/90 giorni",
    "giorni",
    "Bilancio dai movimenti",
    "Con spese medie",
    "Entrate previste",
    "Uscite previste",
    "Spese medie aggiuntive",
    "Dati insufficienti",
    "Proiezione dei soli dati caricati, non del saldo bancario. Le ricorrenze sono da confermare; le spese medie sono stime e richiedono almeno 28 giorni di storico.",
    "Ipotesi e dettaglio",
    "Lo storico può essere incompleto. Non vengono ipotizzate nuove entrate; Budget e patrimonio non sono liquidità disponibile.",
    "Bilancio cumulativo previsto"
  ],
  "en": [
    "30/60/90-day forecast",
    "days",
    "Ledger projection",
    "With average spending",
    "Expected income",
    "Expected expenses",
    "Additional average spending",
    "Insufficient data",
    "Projection of loaded data, not a bank balance. Recurring items need confirmation; average spending is an estimate requiring at least 28 days of history.",
    "Assumptions and detail",
    "History may be incomplete. No new income is inferred; Budgets and assets are not available cash.",
    "Projected cumulative net"
  ],
  "es": [
    "Previsión a 30/60/90 días",
    "días",
    "Balance de movimientos",
    "Con gastos medios",
    "Ingresos previstos",
    "Gastos previstos",
    "Gasto medio adicional",
    "Datos insuficientes",
    "Proyección de los datos cargados, no del saldo bancario. Las recurrencias requieren confirmación; el gasto medio es una estimación que necesita al menos 28 días de historial.",
    "Hipótesis y detalles",
    "El historial puede estar incompleto. No se suponen nuevos ingresos; los presupuestos y el patrimonio no son efectivo disponible.",
    "Balance acumulado previsto"
  ],
  "fr": [
    "Prévision à 30/60/90 jours",
    "jours",
    "Bilan des opérations",
    "Avec dépenses moyennes",
    "Entrées prévues",
    "Dépenses prévues",
    "Dépenses moyennes supplémentaires",
    "Données insuffisantes",
    "Projection des données chargées, pas du solde bancaire. Les récurrences restent à confirmer ; la moyenne est une estimation nécessitant au moins 28 jours d’historique.",
    "Hypothèses et détails",
    "L’historique peut être incomplet. Aucun nouveau revenu n’est supposé ; budgets et patrimoine ne sont pas des liquidités disponibles.",
    "Bilan cumulé prévu"
  ],
  "de": [
    "Prognose für 30/60/90 Tage",
    "Tage",
    "Bilanz der Buchungen",
    "Mit Durchschnittsausgaben",
    "Erwartete Einnahmen",
    "Erwartete Ausgaben",
    "Zusätzliche Durchschnittsausgaben",
    "Unzureichende Daten",
    "Projektion der geladenen Daten, kein Bankkontostand. Wiederholungen sind zu bestätigen; Durchschnittsausgaben sind Schätzungen mit mindestens 28 Tagen Verlauf.",
    "Annahmen und Details",
    "Der Verlauf kann unvollständig sein. Keine neuen Einnahmen werden angenommen; Budgets und Vermögen sind keine verfügbare Liquidität.",
    "Prognostizierte Gesamtbilanz"
  ],
  "pt": [
    "Previsão a 30/60/90 dias",
    "dias",
    "Balanço dos movimentos",
    "Com despesas médias",
    "Entradas previstas",
    "Despesas previstas",
    "Despesa média adicional",
    "Dados insuficientes",
    "Projeção dos dados carregados, não do saldo bancário. As recorrências precisam de confirmação; a média é uma estimativa que exige pelo menos 28 dias de histórico.",
    "Hipóteses e detalhes",
    "O histórico pode estar incompleto. Não se supõem novas entradas; orçamentos e património não são dinheiro disponível.",
    "Balanço acumulado previsto"
  ],
  "pl": [
    "Prognoza na 30/60/90 dni",
    "dni",
    "Bilans operacji",
    "Ze średnimi wydatkami",
    "Przewidywane przychody",
    "Przewidywane wydatki",
    "Dodatkowe średnie wydatki",
    "Za mało danych",
    "Prognoza załadowanych danych, nie salda bankowego. Operacje cykliczne wymagają potwierdzenia; średnie wydatki są szacunkiem wymagającym co najmniej 28 dni historii.",
    "Założenia i szczegóły",
    "Historia może być niepełna. Nie zakładamy nowych przychodów; budżet i majątek nie są dostępną gotówką.",
    "Prognozowany bilans łączny"
  ],
  "nl": [
    "Prognose voor 30/60/90 dagen",
    "dagen",
    "Saldo van transacties",
    "Met gemiddelde uitgaven",
    "Verwachte inkomsten",
    "Verwachte uitgaven",
    "Extra gemiddelde uitgaven",
    "Onvoldoende gegevens",
    "Prognose van geladen gegevens, geen banksaldo. Herhalingen moeten worden bevestigd; gemiddelde uitgaven zijn schattingen met minstens 28 dagen historie.",
    "Aannames en details",
    "De historie kan onvolledig zijn. Geen nieuwe inkomsten verondersteld; budgetten en vermogen zijn geen beschikbaar geld.",
    "Verwacht cumulatief saldo"
  ],
  "ro": [
    "Previziune la 30/60/90 de zile",
    "zile",
    "Bilanțul tranzacțiilor",
    "Cu cheltuieli medii",
    "Venituri prevăzute",
    "Cheltuieli prevăzute",
    "Cheltuieli medii suplimentare",
    "Date insuficiente",
    "Proiecția datelor încărcate, nu a soldului bancar. Recurențele necesită confirmare; media este o estimare bazată pe cel puțin 28 de zile de istoric.",
    "Ipoteze și detalii",
    "Istoricul poate fi incomplet. Nu presupunem venituri noi; bugetele și patrimoniul nu sunt numerar disponibil.",
    "Bilanț cumulat prevăzut"
  ],
  "el": [
    "Πρόβλεψη για 30/60/90 ημέρες",
    "ημέρες",
    "Ισοζύγιο κινήσεων",
    "Με μέσες δαπάνες",
    "Αναμενόμενα έσοδα",
    "Αναμενόμενα έξοδα",
    "Πρόσθετες μέσες δαπάνες",
    "Ανεπαρκή δεδομένα",
    "Προβολή των φορτωμένων δεδομένων, όχι τραπεζικό υπόλοιπο. Οι επαναλήψεις χρειάζονται επιβεβαίωση· ο μέσος όρος είναι εκτίμηση με τουλάχιστον 28 ημέρες ιστορικού.",
    "Παραδοχές και λεπτομέρειες",
    "Το ιστορικό μπορεί να είναι ελλιπές. Δεν υποθέτουμε νέα έσοδα· προϋπολογισμοί και περιουσία δεν είναι διαθέσιμα μετρητά.",
    "Προβλεπόμενο σωρευτικό ισοζύγιο"
  ]
};
const FLOW_TEXT: Record<string,string[]> = {"it":["Variazione dai movimenti previsti","Scenario abituale","Scenario prudente","Entrate ipotizzate dallo storico","Spese fisse ipotizzate","Variazione cumulata nel mese","Variazione futura, non saldo disponibile. Lo storico non è un saldo iniziale verificato. Le ricorrenze restano da confermare.","Le ipotesi abituali richiedono tre mesi completi e stabili. Lo scenario prudente esclude le entrate ipotizzate e considera la maggiore spesa variabile mensile osservata. A 60/90 giorni l’incertezza aumenta.","Stima indicativa; non è una garanzia."],"en":["Change from scheduled transactions","Usual scenario","Prudent scenario","Income inferred from history","Inferred fixed expenses","Cumulative change this month","Future change, not available balance. History is not a verified opening balance. Recurrences need confirmation.","Usual patterns require three complete stable months. The prudent scenario excludes inferred income and uses the highest observed monthly variable spending. Uncertainty increases at 60/90 days.","Indicative estimate; not a guarantee."],"es":["Variación de movimientos previstos","Escenario habitual","Escenario prudente","Ingresos estimados del historial","Gastos fijos estimados","Variación acumulada del mes","Variación futura, no saldo disponible. El historial no es un saldo inicial verificado. Las recurrencias requieren confirmación.","Los patrones requieren tres meses completos y estables. El escenario prudente excluye ingresos estimados y usa el mayor gasto variable mensual observado. A 60/90 días aumenta la incertidumbre.","Estimación orientativa; no es una garantía."],"fr":["Variation des opérations prévues","Scénario habituel","Scénario prudent","Revenus estimés selon l’historique","Charges fixes estimées","Variation cumulée du mois","Variation future, pas un solde disponible. L’historique n’est pas un solde initial vérifié. Les récurrences restent à confirmer.","Les habitudes nécessitent trois mois complets et stables. Le scénario prudent exclut les revenus estimés et utilise les dépenses variables mensuelles maximales observées. L’incertitude augmente à 60/90 jours.","Estimation indicative ; aucune garantie."],"de":["Änderung aus geplanten Buchungen","Übliches Szenario","Vorsichtiges Szenario","Aus Verlauf geschätzte Einnahmen","Geschätzte Fixkosten","Kumulierte Änderung im Monat","Künftige Änderung, kein verfügbarer Kontostand. Der Verlauf ist kein geprüfter Anfangssaldo. Wiederholungen sind zu bestätigen.","Muster erfordern drei vollständige stabile Monate. Das vorsichtige Szenario schließt geschätzte Einnahmen aus und nutzt die höchsten beobachteten monatlichen variablen Ausgaben. Nach 60/90 Tagen steigt die Unsicherheit.","Unverbindliche Schätzung; keine Garantie."],"pt":["Variação dos movimentos previstos","Cenário habitual","Cenário prudente","Entradas estimadas pelo histórico","Despesas fixas estimadas","Variação acumulada no mês","Variação futura, não saldo disponível. O histórico não é um saldo inicial verificado. As recorrências precisam de confirmação.","Os padrões exigem três meses completos e estáveis. O cenário prudente exclui entradas estimadas e usa a maior despesa variável mensal observada. A incerteza aumenta aos 60/90 dias.","Estimativa indicativa; não é uma garantia."],"pl":["Zmiana z planowanych operacji","Scenariusz zwykły","Scenariusz ostrożny","Przychody szacowane z historii","Szacowane koszty stałe","Łączna zmiana w miesiącu","Przyszła zmiana, nie dostępne saldo. Historia nie jest zweryfikowanym saldem początkowym. Operacje cykliczne wymagają potwierdzenia.","Wzorce wymagają trzech pełnych stabilnych miesięcy. Scenariusz ostrożny wyklucza szacowane przychody i uwzględnia najwyższe zaobserwowane miesięczne wydatki zmienne. Niepewność rośnie po 60/90 dniach.","Szacunek orientacyjny; bez gwarancji."],"nl":["Verandering door geplande transacties","Gebruikelijk scenario","Voorzichtig scenario","Inkomsten geschat uit historie","Geschatte vaste uitgaven","Cumulatieve verandering deze maand","Toekomstige verandering, geen beschikbaar saldo. Historie is geen geverifieerd beginsaldo. Herhalingen moeten worden bevestigd.","Patronen vereisen drie volledige stabiele maanden. Het voorzichtige scenario sluit geschatte inkomsten uit en gebruikt de hoogste waargenomen maandelijkse variabele uitgaven. De onzekerheid stijgt bij 60/90 dagen.","Indicatieve schatting; geen garantie."],"ro":["Variația tranzacțiilor prevăzute","Scenariu obișnuit","Scenariu prudent","Venituri estimate din istoric","Cheltuieli fixe estimate","Variația cumulată a lunii","Variație viitoare, nu sold disponibil. Istoricul nu este un sold inițial verificat. Recurențele necesită confirmare.","Tiparele necesită trei luni complete și stabile. Scenariul prudent exclude veniturile estimate și folosește cea mai mare cheltuială variabilă lunară observată. Incertitudinea crește la 60/90 de zile.","Estimare orientativă; fără garanție."],"el":["Μεταβολή προγραμματισμένων κινήσεων","Συνήθες σενάριο","Συντηρητικό σενάριο","Έσοδα εκτιμώμενα από το ιστορικό","Εκτιμώμενα πάγια έξοδα","Σωρευτική μεταβολή του μήνα","Μελλοντική μεταβολή, όχι διαθέσιμο υπόλοιπο. Το ιστορικό δεν είναι επαληθευμένο αρχικό υπόλοιπο. Οι επαναλήψεις χρειάζονται επιβεβαίωση.","Τα μοτίβα απαιτούν τρεις πλήρεις σταθερούς μήνες. Το συντηρητικό σενάριο εξαιρεί εκτιμώμενα έσοδα και χρησιμοποιεί τη μεγαλύτερη παρατηρημένη μηνιαία μεταβλητή δαπάνη. Η αβεβαιότητα αυξάνεται στις 60/90 ημέρες.","Ενδεικτική εκτίμηση· χωρίς εγγύηση."]};
export function forecastWords(language: string) { const words=[...(TEXT[language] || TEXT.en)], flow=FLOW_TEXT[language]||FLOW_TEXT.en;words[2]=flow[0];words[3]=flow[1];words[8]=flow[6];words[10]=flow[7];words[11]=flow[5];return words; }
export function FinancialForecastPanel() {
  const c: any = useApp();
  const now = new Date();
  const today = c.today || [now.getFullYear(), String(now.getMonth()+1).padStart(2,'0'), String(now.getDate()).padStart(2,'0')].join('-');
  const words = forecastWords(c.lang || 'it');
  const flow=FLOW_TEXT[c.lang || 'it'] || FLOW_TEXT.en;
  const data = useMemo(() => buildFinancialForecast({
    today, currency: c.currency,
    expenses: c.expenses || [], incomes: c.incomes || [], recurring: c.recurring || [],
    analysisExpenses: c.countedExpensesForAnalysis || c.expensesForAnalysis || c.expenses || [],
    shareProjects: c.shareProjects || [], userId: c.userId || '', categories: c.cats || [],
    excludeExpense: c.isExpenseExcludedFromTotals, excludeIncome: c.isIncomeExcludedFromTotals,
  }), [today,c.currency,c.expenses,c.incomes,c.recurring,c.countedExpensesForAnalysis,c.expensesForAnalysis,c.shareProjects,c.userId,c.cats,c.isExpenseExcludedFromTotals,c.isIncomeExcludedFromTotals]);
  function amount(value: number | null) {
    if(value === null) return '—';
    return new Intl.NumberFormat(c.lang || 'it', {style:'currency',currency:c.currency || 'EUR',maximumFractionDigits:2}).format(value);
  }
  return <section className="fc-forecast" aria-label={words[0]}>
    <h3>{words[0]}</h3>
    {data.status === 'N_D' ? <p role="status">{words[7]}</p> : <div className="fc-forecast-grid">
      {data.horizons.map(row => <article key={row.days}>
        <h4>{row.days} {words[1]}</h4>
        <time dateTime={row.date}>{new Intl.DateTimeFormat(c.lang || 'it',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(row.date+'T12:00:00Z'))}</time>
        <span>{words[2]}</span>
        <strong className={row.knownChange !== null && row.knownChange < 0 ? 'fc-negative' : 'fc-balance'}>{amount(row.knownChange)}</strong>
        <span>{words[3]}</span>
        <strong className={row.estimatedChange !== null && row.estimatedChange < 0 ? 'fc-negative' : 'fc-balance'}>{amount(row.estimatedChange)}</strong>
        <span>{flow[2]}</span>
        <strong className={row.prudentChange !== null && row.prudentChange < 0 ? "fc-negative" : "fc-balance"}>{amount(row.prudentChange)}</strong>
        <small className="fc-forecast-confidence">{flow[8]}</small>
        <details><summary>{words[9]}</summary>
          <dl><dt>{words[4]}</dt><dd>{amount(row.knownIncome)}</dd><dt>{words[5]}</dt><dd>{amount(row.knownExpense)}</dd><dt>{words[6]}</dt><dd>{amount(row.estimatedAdditionalExpense)}</dd><dt>{flow[3]}</dt><dd>{amount(row.inferredIncome)}</dd><dt>{flow[4]}</dt><dd>{amount(row.inferredExpense)}</dd></dl>
        </details>
      </article>)}
    </div>}
    <p>{words[8]}</p><p>{words[10]}</p>
  </section>;
}
