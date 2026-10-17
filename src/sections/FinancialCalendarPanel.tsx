import { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../core';
import { buildFinancialCalendar, calendarMonthDays, summarizeFinancialCalendarEntries, calendarPayerName } from '../finance/financialCalendar.js';
import './financialCalendar.css';

type CalendarWords = {
  title: string; subtitle: string; previous: string; next: string; today: string;
  income: string; expense: string; monthlyNet: string; dailyNet: string;
  dailyIncome: string; dailyExpense: string; noItems: string;
  recorded: string; recurring: string; installment: string; fromRecorded: string;
  infoTitle: string; note: string; movementLegend: string;
  balance: string; expenseType: string; shareType: string; recurringType: string; incomeType: string;
  expand: string; collapse: string; status: string; effectiveDate: string; category: string; method: string; project: string; paidBy: string; notes: string; selectMonth: string;
};

type CalendarLanguage = 'it' | 'en' | 'es' | 'fr' | 'de' | 'pt' | 'pl' | 'nl' | 'ro' | 'el';

// Dizionario dedicato al Calendario: nessun fallback in inglese per le 10 lingue dell'app.
const TEXT: Record<CalendarLanguage, CalendarWords> = {
  it: {
    title: 'Calendario finanziario', subtitle: 'Quanto entra e quanto esce, giorno per giorno',
    previous: 'Mese precedente', next: 'Mese successivo', today: 'Oggi',
    income: 'Entrate', expense: 'Uscite', monthlyNet: 'Bilancio del mese', dailyNet: 'Bilancio del giorno',
    dailyIncome: 'Entrate del giorno', dailyExpense: 'Uscite del giorno', noItems: 'Nessun movimento in questo giorno',
    recorded: 'Movimento registrato', recurring: 'Ricorrenza in programma', installment: 'Rata',
    fromRecorded: 'Da movimento registrato', infoTitle: 'Come vengono calcolati gli importi?',
    note: 'Il bilancio è la differenza tra entrate e uscite del periodo. Include i movimenti registrati, le relative rate e le ricorrenze future ancora da confermare. Non rappresenta il saldo del conto bancario e non comprende spese impreviste. Le ricorrenze scadute e non confermate non vengono conteggiate automaticamente.',
    movementLegend: 'Giorni con entrate e uscite',
    balance: 'Saldo',
    expenseType: 'Spesa',
    shareType: 'Share',
    recurringType: 'Ricorrente',
    incomeType: 'Entrata',
    expand: 'Mostra dettagli',
    collapse: 'Nascondi dettagli',
    status: 'Stato',
    effectiveDate: 'Data operazione',
    category: 'Categoria',
    method: 'Metodo',
    project: 'Progetto',
    paidBy: 'Pagata da',
    notes: 'Note',
    selectMonth: 'Seleziona mese',
  },
  en: {
    title: 'Financial calendar', subtitle: 'Money in and money out, day by day',
    previous: 'Previous month', next: 'Next month', today: 'Today',
    income: 'Income', expense: 'Expenses', monthlyNet: 'Monthly net', dailyNet: 'Daily net',
    dailyIncome: 'Income today', dailyExpense: 'Expenses today', noItems: 'No transactions on this day',
    recorded: 'Recorded transaction', recurring: 'Upcoming recurring payment', installment: 'Installment',
    fromRecorded: 'From a recorded transaction', infoTitle: 'How are these amounts calculated?',
    note: 'Net is income minus expenses for the selected period. It includes recorded transactions, their installments and upcoming recurring items that still need confirmation. It is not a bank balance and excludes unplanned expenses. Overdue, unconfirmed recurring items are not counted automatically.',
    movementLegend: 'Days with income and expenses',
    balance: 'Balance',
    expenseType: 'Expense',
    shareType: 'Share',
    recurringType: 'Recurring',
    incomeType: 'Income',
    expand: 'Show details',
    collapse: 'Hide details',
    status: 'Status',
    effectiveDate: 'Transaction date',
    category: 'Category',
    method: 'Payment method',
    project: 'Project',
    paidBy: 'Paid by',
    notes: 'Notes',
    selectMonth: 'Choose month',
  },
  es: {
    title: 'Calendario financiero', subtitle: 'Ingresos y gastos, día a día',
    previous: 'Mes anterior', next: 'Mes siguiente', today: 'Hoy',
    income: 'Ingresos', expense: 'Gastos', monthlyNet: 'Balance del mes', dailyNet: 'Balance del día',
    dailyIncome: 'Ingresos del día', dailyExpense: 'Gastos del día', noItems: 'Sin movimientos este día',
    recorded: 'Movimiento registrado', recurring: 'Movimiento recurrente programado', installment: 'Cuota',
    fromRecorded: 'De un movimiento registrado', infoTitle: '¿Cómo se calculan los importes?',
    note: 'El balance es la diferencia entre ingresos y gastos del período. Incluye movimientos registrados, sus cuotas y movimientos recurrentes futuros pendientes de confirmar. No es el saldo bancario ni incluye gastos imprevistos. Los movimientos recurrentes vencidos sin confirmar no se contabilizan automáticamente.',
    movementLegend: 'Días con ingresos y gastos',
    balance: 'Saldo',
    expenseType: 'Gasto',
    shareType: 'Share',
    recurringType: 'Recurrente',
    incomeType: 'Ingreso',
    expand: 'Mostrar detalles',
    collapse: 'Ocultar detalles',
    status: 'Estado',
    effectiveDate: 'Fecha de operación',
    category: 'Categoría',
    method: 'Método de pago',
    project: 'Proyecto',
    paidBy: 'Pagado por',
    notes: 'Notas',
    selectMonth: 'Elegir mes',
  },
  fr: {
    title: 'Calendrier financier', subtitle: 'Entrées et dépenses, jour après jour',
    previous: 'Mois précédent', next: 'Mois suivant', today: 'Aujourd’hui',
    income: 'Entrées', expense: 'Dépenses', monthlyNet: 'Bilan du mois', dailyNet: 'Bilan du jour',
    dailyIncome: 'Entrées du jour', dailyExpense: 'Dépenses du jour', noItems: 'Aucune opération ce jour',
    recorded: 'Opération enregistrée', recurring: 'Opération récurrente prévue', installment: 'Échéance',
    fromRecorded: 'Issue d’une opération enregistrée', infoTitle: 'Comment ces montants sont-ils calculés ?',
    note: 'Le bilan correspond aux entrées moins les dépenses de la période. Il inclut les opérations enregistrées, leurs échéances et les opérations récurrentes futures à confirmer. Ce n’est pas un solde bancaire et les dépenses imprévues sont exclues. Les opérations récurrentes échues non confirmées ne sont pas comptées automatiquement.',
    movementLegend: 'Jours avec entrées et dépenses',
    balance: 'Solde',
    expenseType: 'Dépense',
    shareType: 'Share',
    recurringType: 'Récurrent',
    incomeType: 'Revenu',
    expand: 'Afficher les détails',
    collapse: 'Masquer les détails',
    status: 'Statut',
    effectiveDate: 'Date de l’opération',
    category: 'Catégorie',
    method: 'Moyen de paiement',
    project: 'Projet',
    paidBy: 'Payé par',
    notes: 'Notes',
    selectMonth: 'Choisir un mois',
  },
  de: {
    title: 'Finanzkalender', subtitle: 'Einnahmen und Ausgaben Tag für Tag',
    previous: 'Vorheriger Monat', next: 'Nächster Monat', today: 'Heute',
    income: 'Einnahmen', expense: 'Ausgaben', monthlyNet: 'Monatsbilanz', dailyNet: 'Tagesbilanz',
    dailyIncome: 'Einnahmen des Tages', dailyExpense: 'Ausgaben des Tages', noItems: 'Keine Buchungen an diesem Tag',
    recorded: 'Erfasste Buchung', recurring: 'Geplante wiederkehrende Buchung', installment: 'Rate',
    fromRecorded: 'Aus erfasster Buchung', infoTitle: 'Wie werden die Beträge berechnet?',
    note: 'Die Bilanz ist die Differenz zwischen Einnahmen und Ausgaben im gewählten Zeitraum. Enthalten sind erfasste Buchungen, deren Raten und noch zu bestätigende zukünftige Wiederholungen. Sie ist kein Bankkontostand; ungeplante Ausgaben fehlen. Überfällige, unbestätigte Wiederholungen werden nicht automatisch berücksichtigt.',
    movementLegend: 'Tage mit Einnahmen und Ausgaben',
    balance: 'Saldo',
    expenseType: 'Ausgabe',
    shareType: 'Share',
    recurringType: 'Wiederkehrend',
    incomeType: 'Einnahme',
    expand: 'Details anzeigen',
    collapse: 'Details ausblenden',
    status: 'Status',
    effectiveDate: 'Buchungsdatum',
    category: 'Kategorie',
    method: 'Zahlungsart',
    project: 'Projekt',
    paidBy: 'Bezahlt von',
    notes: 'Notizen',
    selectMonth: 'Monat wählen',
  },
  pt: {
    title: 'Calendário financeiro', subtitle: 'Entradas e saídas, dia a dia',
    previous: 'Mês anterior', next: 'Mês seguinte', today: 'Hoje',
    income: 'Entradas', expense: 'Saídas', monthlyNet: 'Balanço do mês', dailyNet: 'Balanço do dia',
    dailyIncome: 'Entradas do dia', dailyExpense: 'Saídas do dia', noItems: 'Sem movimentos neste dia',
    recorded: 'Movimento registado', recurring: 'Movimento recorrente previsto', installment: 'Prestação',
    fromRecorded: 'De um movimento registado', infoTitle: 'Como são calculados os valores?',
    note: 'O balanço é a diferença entre entradas e saídas do período. Inclui movimentos registados, respetivas prestações e movimentos recorrentes futuros por confirmar. Não é o saldo bancário e exclui despesas imprevistas. Movimentos recorrentes vencidos e não confirmados não são contabilizados automaticamente.',
    movementLegend: 'Dias com entradas e saídas',
    balance: 'Saldo',
    expenseType: 'Despesa',
    shareType: 'Share',
    recurringType: 'Recorrente',
    incomeType: 'Entrada',
    expand: 'Mostrar detalhes',
    collapse: 'Ocultar detalhes',
    status: 'Estado',
    effectiveDate: 'Data da operação',
    category: 'Categoria',
    method: 'Método de pagamento',
    project: 'Projeto',
    paidBy: 'Pago por',
    notes: 'Notas',
    selectMonth: 'Selecionar mês',
  },
  pl: {
    title: 'Kalendarz finansowy', subtitle: 'Przychody i wydatki dzień po dniu',
    previous: 'Poprzedni miesiąc', next: 'Następny miesiąc', today: 'Dzisiaj',
    income: 'Przychody', expense: 'Wydatki', monthlyNet: 'Bilans miesiąca', dailyNet: 'Bilans dnia',
    dailyIncome: 'Przychody dnia', dailyExpense: 'Wydatki dnia', noItems: 'Brak operacji w tym dniu',
    recorded: 'Zapisana operacja', recurring: 'Planowana operacja cykliczna', installment: 'Rata',
    fromRecorded: 'Z zapisanej operacji', infoTitle: 'Jak obliczamy kwoty?',
    note: 'Bilans to przychody minus wydatki w wybranym okresie. Uwzględnia zapisane operacje, ich raty oraz przyszłe operacje cykliczne oczekujące na potwierdzenie. Nie jest to saldo bankowe i nie obejmuje nieplanowanych wydatków. Zaległe, niepotwierdzone operacje cykliczne nie są liczone automatycznie.',
    movementLegend: 'Dni z przychodami i wydatkami',
    balance: 'Saldo',
    expenseType: 'Wydatek',
    shareType: 'Share',
    recurringType: 'Cykliczna',
    incomeType: 'Przychód',
    expand: 'Pokaż szczegóły',
    collapse: 'Ukryj szczegóły',
    status: 'Status',
    effectiveDate: 'Data operacji',
    category: 'Kategoria',
    method: 'Metoda płatności',
    project: 'Projekt',
    paidBy: 'Zapłacone przez',
    notes: 'Notatki',
    selectMonth: 'Wybierz miesiąc',
  },
  nl: {
    title: 'Financiële kalender', subtitle: 'Inkomsten en uitgaven, dag voor dag',
    previous: 'Vorige maand', next: 'Volgende maand', today: 'Vandaag',
    income: 'Inkomsten', expense: 'Uitgaven', monthlyNet: 'Maandbalans', dailyNet: 'Dagbalans',
    dailyIncome: 'Inkomsten van de dag', dailyExpense: 'Uitgaven van de dag', noItems: 'Geen transacties op deze dag',
    recorded: 'Geregistreerde transactie', recurring: 'Geplande terugkerende transactie', installment: 'Termijn',
    fromRecorded: 'Uit een geregistreerde transactie', infoTitle: 'Hoe worden de bedragen berekend?',
    note: 'De balans is inkomsten min uitgaven over de gekozen periode. Ze bevat geregistreerde transacties, hun termijnen en toekomstige terugkerende transacties die nog bevestigd moeten worden. Het is geen banksaldo en onvoorziene uitgaven tellen niet mee. Achterstallige, onbevestigde herhalingen worden niet automatisch meegeteld.',
    movementLegend: 'Dagen met inkomsten en uitgaven',
    balance: 'Saldo',
    expenseType: 'Uitgave',
    shareType: 'Share',
    recurringType: 'Terugkerend',
    incomeType: 'Inkomsten',
    expand: 'Details tonen',
    collapse: 'Details verbergen',
    status: 'Status',
    effectiveDate: 'Transactiedatum',
    category: 'Categorie',
    method: 'Betaalmethode',
    project: 'Project',
    paidBy: 'Betaald door',
    notes: 'Notities',
    selectMonth: 'Kies maand',
  },
  ro: {
    title: 'Calendar financiar', subtitle: 'Venituri și cheltuieli, zi de zi',
    previous: 'Luna precedentă', next: 'Luna următoare', today: 'Astăzi',
    income: 'Venituri', expense: 'Cheltuieli', monthlyNet: 'Bilanțul lunii', dailyNet: 'Bilanțul zilei',
    dailyIncome: 'Veniturile zilei', dailyExpense: 'Cheltuielile zilei', noItems: 'Nicio tranzacție în această zi',
    recorded: 'Tranzacție înregistrată', recurring: 'Tranzacție recurentă programată', installment: 'Rată',
    fromRecorded: 'Dintr-o tranzacție înregistrată', infoTitle: 'Cum sunt calculate sumele?',
    note: 'Bilanțul reprezintă veniturile minus cheltuielile perioadei. Include tranzacțiile înregistrate, ratele acestora și tranzacțiile recurente viitoare încă neconfirmate. Nu este soldul bancar și nu include cheltuieli neprevăzute. Tranzacțiile recurente restante neconfirmate nu sunt incluse automat.',
    movementLegend: 'Zile cu venituri și cheltuieli',
    balance: 'Sold',
    expenseType: 'Cheltuială',
    shareType: 'Share',
    recurringType: 'Recurentă',
    incomeType: 'Venit',
    expand: 'Afișează detalii',
    collapse: 'Ascunde detalii',
    status: 'Stare',
    effectiveDate: 'Data tranzacției',
    category: 'Categorie',
    method: 'Metodă de plată',
    project: 'Proiect',
    paidBy: 'Plătită de',
    notes: 'Note',
    selectMonth: 'Alege luna',
  },
  el: {
    title: 'Οικονομικό ημερολόγιο', subtitle: 'Έσοδα και έξοδα, μέρα με τη μέρα',
    previous: 'Προηγούμενος μήνας', next: 'Επόμενος μήνας', today: 'Σήμερα',
    income: 'Έσοδα', expense: 'Έξοδα', monthlyNet: 'Ισοζύγιο μήνα', dailyNet: 'Ισοζύγιο ημέρας',
    dailyIncome: 'Έσοδα ημέρας', dailyExpense: 'Έξοδα ημέρας', noItems: 'Καμία κίνηση αυτή την ημέρα',
    recorded: 'Καταχωρισμένη κίνηση', recurring: 'Προγραμματισμένη επαναλαμβανόμενη κίνηση', installment: 'Δόση',
    fromRecorded: 'Από καταχωρισμένη κίνηση', infoTitle: 'Πώς υπολογίζονται τα ποσά;',
    note: 'Το ισοζύγιο είναι τα έσοδα μείον τα έξοδα της περιόδου. Περιλαμβάνει καταχωρισμένες κινήσεις, τις δόσεις τους και μελλοντικές επαναλαμβανόμενες κινήσεις που δεν έχουν ακόμη επιβεβαιωθεί. Δεν είναι τραπεζικό υπόλοιπο και δεν περιλαμβάνει απρόβλεπτα έξοδα. Οι ληξιπρόθεσμες μη επιβεβαιωμένες κινήσεις δεν υπολογίζονται αυτόματα.',
    movementLegend: 'Ημέρες με έσοδα και έξοδα',
    balance: 'Υπόλοιπο',
    expenseType: 'Δαπάνη',
    shareType: 'Share',
    recurringType: 'Επαναλαμβανόμενη',
    incomeType: 'Έσοδο',
    expand: 'Εμφάνιση λεπτομερειών',
    collapse: 'Απόκρυψη λεπτομερειών',
    status: 'Κατάσταση',
    effectiveDate: 'Ημερομηνία κίνησης',
    category: 'Κατηγορία',
    method: 'Τρόπος πληρωμής',
    project: 'Έργο',
    paidBy: 'Πληρώθηκε από',
    notes: 'Σημειώσεις',
    selectMonth: 'Επιλογή μήνα',
  },
};

const LOCALES: Record<CalendarLanguage, string> = {
  it: 'it-IT', en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE',
  pt: 'pt-PT', pl: 'pl-PL', nl: 'nl-NL', ro: 'ro-RO', el: 'el-GR',
};

function localDate(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function moveMonth(month: string, offset: number): string {
  const [year, m] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, m - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function friendlyDay(date: string, locale: string): string {
  const [year, month, day] = date.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, { weekday: 'long', day: 'numeric', month: 'long' })
    .format(new Date(Date.UTC(year, month - 1, day, 12)));
}

export function FinancialCalendarPanel() {
  const c: any = useApp();
  const rawLanguage = String(c.lang || 'it').toLowerCase().split('-')[0];
  const language: CalendarLanguage = Object.prototype.hasOwnProperty.call(TEXT, rawLanguage)
    ? rawLanguage as CalendarLanguage : 'it';
  const words = TEXT[language];
  const locale = LOCALES[language];
  const today = localDate();
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [selected, setSelected] = useState(() => localDate());
  const [expandedEntry, setExpandedEntry] = useState<string | null>(null);
  const detailRef = useRef<HTMLDivElement>(null);
  const [payerNames, setPayerNames] = useState<Record<string, string>>({});
  // Resolve display names with the same account lookup as Share, without writing projects.
  useEffect(() => {
    let cancelled = false;
    setPayerNames({});
    const lookup = c.findRegisteredUserForShare;
    if (typeof lookup !== 'function') return;
    const people = new Map<string, any>();
    for (const project of c.shareProjects || []) {
      for (const activity of project.activities || []) {
        const person = (project.participants || []).find((p: any) => String(p.id) === String(activity.paidBy));
        if (!person || calendarPayerName(person, c.currentUser, c.userId)) continue;
        if (person.uid || person.email || person.username) people.set(JSON.stringify([String(project.id), String(person.id)]), person);
      }
    }
    (async () => {
      const names: Record<string, string> = {};
      for (const [key, person] of people) {
        if (cancelled) return;
        try {
          const found = await lookup(person.email || '', person.phone || '', person.username || '', person.uid || '');
          const name = calendarPayerName(found);
          if (name) names[key] = name;
        } catch { /* Offline: keep the stored name, never substitute an account identifier. */ }
      }
      if (!cancelled) setPayerNames(names);
    })();
    return () => { cancelled = true; };
  }, [c.shareProjects, c.currentUser, c.userId, c.findRegisteredUserForShare]);
  const dates = calendarMonthDays(month);
  const min = moveMonth(today.slice(0, 7), -36);
  const max = moveMonth(today.slice(0, 7), 36);

  const data = useMemo(() => buildFinancialCalendar({
    month, today,
    expenses: c.expenses || [], incomes: c.incomes || [], recurring: c.recurring || [],
    shareProjects: c.shareProjects || [], userId: c.userId || '', currentUser: c.currentUser, payerNames,
    excludeExpense: c.isExpenseExcludedFromTotals || (() => false),
    excludeIncome: c.isIncomeExcludedFromTotals || (() => false),
  }), [month, today, c.expenses, c.incomes, c.recurring, c.shareProjects, c.userId, c.currentUser, payerNames, c.isExpenseExcludedFromTotals, c.isIncomeExcludedFromTotals]);

  // One identical list for the grid, daily totals, and expanded detail.
  // Reconciliation also protects against stale rows after changing month.
  const visibleDays = useMemo(() => data.days.map(item => {
    const summary = summarizeFinancialCalendarEntries(item.date, item.entries);
    return { ...item, entries: summary.entries,
      income: summary.incomeCents / 100, expense: summary.expenseCents / 100,
      change: summary.changeCents / 100 };
  }), [data]);
  const monthTotals = useMemo(() => visibleDays.reduce((totals, item) => ({
    income: totals.income + Math.round(item.income * 100),
    expense: totals.expense + Math.round(item.expense * 100),
  }), { income: 0, expense: 0 }), [visibleDays]);
  const monthIncome = monthTotals.income / 100;
  const monthExpense = monthTotals.expense / 100;
  const monthBalance = (monthTotals.income - monthTotals.expense) / 100;
  const day = visibleDays.find(item => item.date === selected) || visibleDays[0];
  const firstWeekday = dates.length
    ? (new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 1)).getUTCDay() + 6) % 7
    : 0;
  const monthTitle = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
    .format(new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)) - 1, 12)));
  const currencySymbol = String(c.sym || '€');

  function money(amount: number): string {
    return overviewMoney(amount);
  }

  // Outside expanded detail: whole currency units, no arithmetic signs.
  // Exact cents remain in the underlying data; display only is rounded.
  function overviewMoney(amount: number): string {
    const rounded = Math.round(Math.abs(amount));
    return `${currencySymbol} ${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(rounded)}`;
  }

  function miniMoney(amount: number): string {
    if (Math.abs(amount) < 0.005) return '—';
    return overviewMoney(amount);
  }

  function move(offset: number) {
    const next = moveMonth(month, offset);
    if (next < min || next > max) return;
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
    setExpandedEntry(null);
  }

  function goToday() {
    setMonth(today.slice(0, 7));
    setSelected(today);
    setExpandedEntry(null);
  }

  function selectDay(date: string) {
    setSelected(date);
    setExpandedEntry(null);
    // Il dettaglio rimane collegato alla selezione senza spostare bruscamente la schermata.
    detailRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function chooseMonth(next: string) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(next) || next < min || next > max) return;
    setMonth(next);
    setSelected(next === today.slice(0, 7) ? today : `${next}-01`);
    setExpandedEntry(null);
  }

  function entryType(entry: { kind: string; provenance?: string }): string {
    if (entry.provenance === 'share') return words.shareType;
    if (entry.provenance === 'recurring') return words.recurringType;
    return entry.kind === 'income' ? words.incomeType : words.expenseType;
  }

  function entryDetails(entry: any): Array<[string, string]> {
    const m = entry.metadata || {};
    const category = m.shareCategory || m.categoryName ||
      (m.categoryId != null && typeof c.getCat === 'function' ? c.getCat(m.categoryId)?.name : '');
    const method = m.methodName || (m.methodId != null && typeof c.getMethod === 'function' ? c.getMethod(m.methodId)?.name : '');
    const income = (m.incomeType != null && typeof c.getIT === 'function' ? c.getIT(m.incomeType)?.name : '');
    const rows: Array<[string, string]> = [[words.effectiveDate, friendlyDay(entry.date, locale)], [words.status, entryCaption(entry)]];
    if (category || income) rows.push([words.category, String(category || income)]);
    if (method && entry.provenance !== 'share') rows.push([words.method, String(method)]);
    if (m.projectName) rows.push([words.project, String(m.projectName)]);
    if (m.paidBy) rows.push([words.paidBy, String(m.paidBy)]);
    if (m.note) rows.push([words.notes, String(m.note)]);
    return rows;
  }

  function entryCaption(entry: { source: string; installment?: { number: number; of: number } | null }): string {
    const recurring = entry.source.startsWith('planned');
    const segment = entry.installment ? `${words.installment} ${entry.installment.number}/${entry.installment.of}` : '';
    if (segment) return recurring ? `${words.recurring} · ${segment}` : `${segment} · ${words.fromRecorded}`;
    return recurring ? words.recurring : words.recorded;
  }

  return <section className={'fc-panel' + (c.dark ? ' fc-dark' : '')} aria-label={words.title}>
    <header className="fc-heading">
      <h2>{words.title}</h2>
      <p>{words.subtitle}</p>
    </header>

    <div className="fc-month-navigation" role="group" aria-label={monthTitle}>
      <button className="fc-month-arrow" type="button" aria-label={words.previous} disabled={month <= min} onClick={() => move(-1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 4.5 7.5 12l7 7.5"/></svg>
      </button>
      <label className="fc-month-picker" title={words.selectMonth}>
        <strong aria-hidden="true">{monthTitle.charAt(0).toUpperCase() + monthTitle.slice(1)}</strong>
        <span className="fc-picker-chevron" aria-hidden="true">▾</span>
        <select value={month} aria-label={words.selectMonth}
          onChange={event => chooseMonth(event.target.value)}>
          {Array.from({ length: 73 }, (_, index) => {
            const value = moveMonth(min, index);
            const title = new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' })
              .format(new Date(Date.UTC(Number(value.slice(0, 4)), Number(value.slice(5, 7)) - 1, 12)));
            return <option key={value} value={value}>{title.charAt(0).toUpperCase() + title.slice(1)}</option>;
          })}
        </select>
      </label>
      <button className="fc-month-arrow" type="button" aria-label={words.next} disabled={month >= max} onClick={() => move(1)}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 4.5 7 7.5-7 7.5"/></svg>
      </button>
      <button type="button" className="fc-today" onClick={goToday}>{words.today}</button>
    </div>

    <div className="fc-kpis" role="group" aria-label={words.monthlyNet}>
      <div className="fc-kpi-flow fc-kpi-expense"><span>{words.expense}</span><strong className="fc-negative">{overviewMoney(monthExpense)}</strong></div>
      <div className="fc-kpi-net"><span>{words.balance}</span><strong className="fc-balance">{overviewMoney(monthBalance)}</strong></div>
      <div className="fc-kpi-flow fc-kpi-income"><span>{words.income}</span><strong className="fc-positive">{overviewMoney(monthIncome)}</strong></div>
    </div>

    <div className="fc-legend" role="group" aria-label={words.movementLegend}>
      <span><i className="fc-dot-in" aria-hidden="true" />{words.income}</span>
      <span><i className="fc-dot-out" aria-hidden="true" />{words.expense}</span>
    </div>
    <div className="fc-weekdays" aria-hidden="true">
      {Array.from({ length: 7 }, (_, index) => <span key={index}>
        {new Intl.DateTimeFormat(locale, { weekday: 'short' })
          .format(new Date(Date.UTC(2026, 9, 12 + index))).replace('.', '').slice(0, 2)}
      </span>)}
    </div>
    <div className="fc-days" role="group" aria-label={monthTitle}>
      {Array.from({ length: firstWeekday }, (_, index) => <span className="fc-blank" aria-hidden="true" key={`blank-${index}`} />)}
      {visibleDays.map(item => {
        const active = selected === item.date;
        const hasFlow = item.entries.length > 0;
        return <button
          key={item.date} type="button" onClick={() => selectDay(item.date)}
          className={'fc-day' + (active ? ' fc-selected' : '') + (item.date === today ? ' fc-is-today' : '')}
          aria-pressed={active}
          aria-label={`${friendlyDay(item.date, locale)}. ${words.dailyNet}: ${money(Math.abs(item.change))}`}
        >
          <span className="fc-day-number">{Number(item.date.slice(-2))}</span>
          <span className="fc-day-dots" aria-hidden="true">
            {item.income > 0 && <i className="fc-dot-in" />}
            {item.expense > 0 && <i className="fc-dot-out" />}
          </span>
          <span className={'fc-day-amount' + (!hasFlow ? ' fc-muted' : '') + (item.change > 0 ? ' fc-positive' : item.change < 0 ? ' fc-negative' : '')}>
            {miniMoney(item.change)}
          </span>
        </button>;
      })}
    </div>

    <div className="fc-selected-summary" ref={detailRef}>
      <h3>{friendlyDay(day.date, locale)}</h3>
      <div className="fc-day-balance">
        <span>{words.dailyNet}</span>
        <strong className="fc-balance">{money(Math.abs(day.change))}</strong>
      </div>
      <div className="fc-day-flows" role="group" aria-label={words.dailyNet}>
        <span><i className="fc-dot-in" aria-hidden="true" />{words.dailyIncome} <strong className="fc-positive">{money(day.income)}</strong></span>
        <span><i className="fc-dot-out" aria-hidden="true" />{words.dailyExpense} <strong className="fc-negative">{money(day.expense)}</strong></span>
      </div>
      {day.entries.length === 0 ? <p className="fc-empty">{words.noItems}</p> :
        <div className="fc-entries">{day.entries.map(entry => {
          const open = expandedEntry === entry.id;
          return <div className="fc-entry-wrap" key={entry.id}>
            <div className="fc-entry">
              <span className={'fc-entry-icon ' + (entry.kind === 'income' ? 'fc-entry-in' : 'fc-entry-out')} aria-hidden="true">
                {entry.kind === 'income' ? '↗' : '↘'}
              </span>
              <div className="fc-entry-copy">
                <strong>{entry.title}</strong>
                <small><span className="fc-kind-label">{entryType(entry)}</span>{entry.installment ? ` · ${words.installment} ${entry.installment.number}/${entry.installment.of}` : ''}</small>
              </div>
              <strong className={entry.kind === 'income' ? 'fc-positive' : 'fc-negative'}>
                {money(Math.abs(entry.cents) / 100)}
              </strong>
              <button type="button" className="fc-entry-toggle" aria-expanded={open}
                aria-label={open ? words.collapse : words.expand} aria-controls={`fc-detail-${entry.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`}
                onClick={() => setExpandedEntry(open ? null : entry.id)}>
                {open ? '▴' : '▾'}
              </button>
            </div>
            {open && <div className="fc-entry-detail" id={`fc-detail-${entry.id.replace(/[^a-zA-Z0-9_-]/g, '_')}`}>
              {entryDetails(entry).map(([label, value]) => <div className="fc-detail-row" key={label}><span>{label}</span><strong>{value}</strong></div>)}
            </div>}
          </div>;
        })}</div>}

    </div>

    <details className="fc-info">
      <summary><span aria-hidden="true">ⓘ</span> {words.infoTitle}</summary>
      <p>{words.note}</p>
    </details>
  </section>;
}
