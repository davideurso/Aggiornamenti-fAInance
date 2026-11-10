import { useEffect, useMemo, useState } from 'react';

type Signal = {
  id: string;
  kind?: 'income' | 'expense';
  type: 'category_spike' | 'recurring_change' | 'possible_duplicate' | 'unusual_expense' | 'missing_recurring';
  date: string;
  priority: 'high' | 'medium';
  facts: Record<string, any>;
  transactionIds: string[];
};

type TransactionItem = {
  id?: string | number;
  _stableId?: string;
  amount?: number | string;
  date?: string;
  desc?: string;
  categoryName?: string;
  methodName?: string;
  _sourceEditable?: boolean;
  _sourceKind?: 'income' | 'expense';
};

type Copy = Record<string, string>;
const IT: Copy = {
  title: 'Anomalie',
  back: 'Torna ai consigli',
  subtitle:
    'Segnalazioni ricavate automaticamente dalle tue operazioni. Non indicano necessariamente un errore.',
  all: 'Tutte',
  category_spike: 'Aumenti',
  recurring_change: 'Ricorrenze',
  possible_duplicate: 'Duplicati',
  unusual_expense: 'Fuori norma',
  missing_recurring: 'Ricorrenze mancanti',
  empty: 'Nessuna anomalia rilevata',
  emptyDesc:
    'Non ci sono segnalazioni per questo filtro. I controlli si aggiornano quando cambiano i movimenti.',
  count: 'segnalazioni',
  high: 'Da verificare',
  medium: 'Da controllare',
  categoryTitle: 'Spese in aumento: {category}',
  categoryDetail:
    'Nel periodo {period} hai speso {current}, il {percent}% in più rispetto alla media di {baseline} calcolata su {n} periodi precedenti con spese.',
  recurringTitle: 'Importo ricorrente variato: {merchant}',
  recurringDetail:
    'L’ultima spesa del {date} è di {current}, contro {baseline} come valore mediano di {n} mesi precedenti: variazione del {percent}%. Verifica se è cambiata la tariffa.',
  duplicateTitle: 'Possibili movimenti duplicati: {merchant}',
  exactDuplicateTitle: 'Due registrazioni identiche: {merchant}',
  missingTitle: '{movement} ricorrente non registrata: {merchant}',
  missingDetail: 'Di solito registri questo movimento ogni {frequency}. Era atteso intorno al {expectedDate} (circa {baseline}), ma non risulta nei tuoi movimenti. Ritardo stimato: {daysOverdue} giorni.',
  missingIncome: 'Entrata',
  missingExpense: 'Uscita',
  weekly: 'settimana',
  monthly: 'mese',
  matched: 'Coincidono',
  different: 'Differiscono',
  noneKnown: 'nessuno dei campi confrontati',
  sourceExternal: 'Movimento derivato o condiviso: per modificarlo apri la sezione originale.',
  historical: 'Movimenti precedenti (per il confronto)',
  duplicateDetail:
    'Due operazioni di {current}, con la stessa descrizione e categoria, risultano registrate il {date1} e il {date2}. Verifica nello Storico se sono entrambe corrette.',
  unusualTitle: 'Spesa insolita: {category}',
  unusualDetail:
    'La spesa di {current} del {date} è superiore del {percent}% al valore tipico ({baseline}), calcolato su {n} precedenti operazioni della stessa categoria.',
  note:
    'Analisi statistica locale, non un giudizio di frode. Importi e confronti usano solo i tuoi dati registrati.',
  why: 'Perché?',
  next: 'Cosa devo controllare?',
  action: 'Come risolvo?',
  dismiss: 'Non è un’anomalia',
  dismissDone: 'Anomalia esclusa',
  askTitle: 'Chiedi all’Agente in questa anomalia',
  askPlaceholder: 'Scrivi qui',
  send: 'Invia',
  transactions: 'Transazioni collegate',
  noTransactions: 'Nessuna transazione collegata disponibile.',
  edit: 'Modifica',
  remove: 'Elimina',
  confirmRemove: 'Eliminare?',
  cancel: 'Annulla',
};
const EN: Copy = {
  title: 'Anomalies',
  back: 'Back to advice',
  subtitle:
    'Automatically detected signals from your transactions. They do not necessarily mean an error.',
  all: 'All',
  category_spike: 'Increases',
  recurring_change: 'Recurring',
  possible_duplicate: 'Duplicates',
  unusual_expense: 'Outliers',
  missing_recurring: 'Missing recurring items',
  empty: 'No anomalies detected',
  emptyDesc: 'No signals match this filter. Checks update when transactions change.',
  count: 'signals',
  high: 'Review',
  medium: 'Check',
  categoryTitle: 'Spending increase: {category}',
  categoryDetail:
    'In {period} you spent {current}, {percent}% above the average of {baseline} across {n} earlier periods with spending.',
  recurringTitle: 'Recurring amount changed: {merchant}',
  recurringDetail:
    'The latest transaction on {date} is {current}, compared with a median of {baseline} from {n} previous months: a {percent}% change. Check whether the tariff has changed.',
  duplicateTitle: 'Possibly duplicated transactions: {merchant}',
  exactDuplicateTitle: 'Two identical entries: {merchant}',
  missingTitle: 'Missing recurring {movement}: {merchant}',
  missingDetail: 'You normally record this item every {frequency}. It was expected around {expectedDate} (approx. {baseline}), but no matching transaction is recorded. Estimated delay: {daysOverdue} days.',
  missingIncome: 'income',
  missingExpense: 'expense',
  weekly: 'week',
  monthly: 'month',
  matched: 'Match',
  different: 'Differ',
  noneKnown: 'none of the compared fields',
  sourceExternal: 'Derived or shared transaction: edit it in its original section.',
  historical: 'Previous transactions (for comparison)',
  duplicateDetail:
    'Two transactions for {current}, with the same description and category, appear on {date1} and {date2}. Check your transaction history.',
  unusualTitle: 'Unusual expense: {category}',
  unusualDetail:
    'The {current} expense on {date} is {percent}% above the typical amount of {baseline}, calculated from {n} earlier transactions in the category.',
  note:
    'Local statistical signals, not proof of fraud. Figures use only your recorded transactions.',
  why: 'Why?',
  next: 'What should I check?',
  action: 'How do I fix it?',
  dismiss: 'Not an anomaly',
  dismissDone: 'Excluded anomaly',
  askTitle: 'Ask the Agent inside this anomaly',
  askPlaceholder: 'Write here',
  send: 'Send',
  transactions: 'Related transactions',
  noTransactions: 'No related transactions available.',
  edit: 'Edit',
  remove: 'Delete',
  confirmRemove: 'Delete?',
  cancel: 'Cancel',
};
const EXTRA: Record<string, Partial<Copy>> = {
  es: { title: 'Anomalías', back: 'Volver a los consejos', count: 'avisos' },
  fr: { title: 'Anomalies', back: 'Retour aux conseils', count: 'signalements' },
  de: { title: 'Auffälligkeiten', back: 'Zurück zu Tipps', count: 'Hinweise' },
  pt: { title: 'Anomalias', back: 'Voltar às sugestões', count: 'alertas' },
  pl: { title: 'Anomalie', back: 'Powrót do porad', count: 'sygnałów' },
  nl: { title: 'Afwijkingen', back: 'Terug naar advies', count: 'signalen' },
  ro: { title: 'Anomalii', back: 'Înapoi la sfaturi', count: 'semnale' },
  el: { title: 'Ανωμαλίες', back: 'Πίσω στις συμβουλές', count: 'ενδείξεις' },
};

export function anomalySectionTitle(language: string) {
  const code = String(language || 'it').toLowerCase().split('-')[0];
  return ({ ...(code === 'it' ? IT : EN), ...(EXTRA[code] || {}) }).title;
}

function template(source: string, params: Record<string, unknown>) {
  return String(source || '').replace(/\{(\w+)\}/g, (_match, key) => String(params[key] ?? ''));
}
function dayLabel(s: string, language: string) {
  const [y, m, d] = String(s || '').split('-').map(Number);
  const date = new Date(y, (m || 1) - 1, d || 1);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(language, { day: '2-digit', month: '2-digit', year: 'numeric' })
    : s;
}

function autoGrow(el: HTMLTextAreaElement | null) {
  if (!el) return;
  el.style.height = '0px';
  el.style.height = `${Math.min(Math.max(el.scrollHeight, 44), 150)}px`;
}

type Props = {
  anomalies: Signal[];
  language: string;
  fmt: (amount: number) => string;
  dark: boolean;
  onBack: () => void;
  onAsk: (signal: Signal, question?: string) => Promise<string> | string;
  getTransactions?: (signal: Signal) => TransactionItem[];
  onEditTransaction?: (tx: TransactionItem, signal: Signal) => void;
  onDeleteTransaction?: (tx: TransactionItem, signal: Signal) => void;
  onDismiss?: (signal: Signal) => void;
};

export function AnomaliesPanel({
  anomalies,
  language,
  fmt,
  dark,
  onBack,
  onAsk,
  getTransactions,
  onEditTransaction,
  onDeleteTransaction,
  onDismiss,
}: Props) {
  const [filter, setFilter] = useState('all');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [threads, setThreads] = useState<Record<string, Array<{ role: 'user' | 'assistant'; text: string }>>>({});
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [deleteConfirmKey, setDeleteConfirmKey] = useState<string | null>(null);
  const code = String(language || 'it').toLowerCase().split('-')[0];
  const copy: Copy = { ...(code === 'it' ? IT : EN), ...(EXTRA[code] || {}) };
  const items = useMemo(
    () => (anomalies || []).filter((a) => filter === 'all' || a.type === filter || (filter === 'recurring_change' && a.type === 'missing_recurring')),
    [anomalies, filter]
  );
  const palette = {
    bg: dark ? '#081522' : '#F7F9FC',
    surface: dark ? '#10243A' : '#FFFFFF',
    secondary: dark ? '#031A3D' : '#EEF4FA',
    text: dark ? '#F4F7FB' : '#14263D',
    sub: dark ? '#B3C0CE' : '#5D6B7C',
    border: dark ? '#29455F' : '#D8E1EA',
    primary: dark ? '#FAAE12' : '#052A5F',
    primaryText: dark ? '#031A3D' : '#FFFFFF',
    accent: dark ? '#031A3D' : '#FFF4D6',
    emphasis: dark ? '#FAAE12' : '#825700',
    destructive: dark ? '#A83C3C' : '#E24B4A',
    destructiveBg: dark ? '#3C1820' : '#FFF0F0',
    successBg: dark ? '#173327' : '#EEF8F2',
    successText: dark ? '#9FE0BE' : '#18794E',
  };

  useEffect(() => {
    setDeleteConfirmKey(null);
  }, [filter]);

  const format = (a: Signal) => {
    const f = a.facts || {};
    const params = {
      category: f.category || '',
      merchant: f.merchant || f.category || '',
      current: fmt(Number(f.current) || 0),
      baseline: fmt(Number(f.baseline) || 0),
      percent: String(f.percent || 0),
      n: String(f.previousPeriods || f.comparisonCount || 0),
      period: f.period || '',
      date: dayLabel(f.date || a.date, language),
      date1: dayLabel(f.firstDate || a.date, language),
      date2: dayLabel(f.secondDate || a.date, language),
      expectedDate: dayLabel(f.expectedDate || a.date, language),
      daysOverdue: String(f.daysOverdue ?? 0),
      frequency: f.frequency === 'weekly' ? copy.weekly : copy.monthly,
      movement: a.kind === 'income' ? copy.missingIncome : copy.missingExpense,
    };
    const titleKey = {
      category_spike: 'categoryTitle',
      recurring_change: 'recurringTitle',
      possible_duplicate: f.exact ? 'exactDuplicateTitle' : 'duplicateTitle',
      missing_recurring: 'missingTitle',
      unusual_expense: 'unusualTitle',
    }[a.type];
    const detailKey = {
      category_spike: 'categoryDetail',
      recurring_change: 'recurringDetail',
      possible_duplicate: 'duplicateDetail',
      missing_recurring: 'missingDetail',
      unusual_expense: 'unusualDetail',
    }[a.type];
    return {
      title: template(copy[titleKey], params),
      detail: template(copy[detailKey], params),
    };
  };

  async function ask(signal: Signal, question?: string) {
    const prompt = String(question || drafts[signal.id] || '').trim();
    if (!prompt) return;
    setLoadingId(signal.id);
    setThreads((prev) => ({
      ...prev,
      [signal.id]: [...(prev[signal.id] || []), { role: 'user', text: prompt }],
    }));
    setDrafts((prev) => ({ ...prev, [signal.id]: '' }));
    try {
      const answer = await onAsk(signal, prompt);
      setThreads((prev) => ({
        ...prev,
        [signal.id]: [...(prev[signal.id] || []), { role: 'assistant', text: String(answer || '') }],
      }));
    } catch (_err) {
      setThreads((prev) => ({
        ...prev,
        [signal.id]: [
          ...(prev[signal.id] || []),
          {
            role: 'assistant',
            text:
              code === 'it'
                ? 'Non riesco a rispondere in questo momento. Riprova.'
                : 'I cannot answer right now. Please try again.',
          },
        ],
      }));
    } finally {
      setLoadingId((current) => (current === signal.id ? null : current));
    }
  }

  return (
    <section aria-label={copy.title} style={{ display: 'flex', flexDirection: 'column', gap: 12, color: palette.text, minWidth: 0 }}>
      <button
        onClick={onBack}
        type="button"
        style={{
          alignSelf: 'flex-start',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          border: 0,
          background: 'transparent',
          color: dark ? '#8CC6FF' : '#245B8E',
          padding: '6px 0',
          fontSize: 13,
          fontWeight: 750,
          cursor: 'pointer',
        }}
      >
        ← {copy.back}
      </button>
      <div style={{ background: palette.surface, border: `1px solid ${palette.border}`, borderRadius: 16, padding: '16px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span aria-hidden="true" style={{ fontSize: 23 }}>🔎</span>
          <h2 style={{ margin: 0, fontSize: 21, color: palette.text }}>{copy.title}</h2>
          <span style={{ background: palette.accent, color: palette.emphasis, padding: '4px 9px', borderRadius: 9, fontWeight: 800, fontSize: 12 }}>
            {(anomalies || []).length} {copy.count}
          </span>
        </div>
        <p style={{ margin: '10px 0 0', color: palette.sub, lineHeight: 1.55, fontSize: 13 }}>{copy.subtitle}</p>
      </div>
      <div aria-label={copy.title} style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {(['all', 'category_spike', 'recurring_change', 'possible_duplicate', 'unusual_expense'] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setFilter(type)}
            aria-pressed={filter === type}
            style={{
              border: `1px solid ${filter === type ? palette.primary : palette.border}`,
              background: filter === type ? palette.primary : palette.surface,
              color: filter === type ? palette.primaryText : palette.text,
              borderRadius: 11,
              minHeight: 37,
              padding: '7px 10px',
              fontSize: 12,
              fontWeight: 750,
              cursor: 'pointer',
            }}
          >
            {copy[type]}
          </button>
        ))}
      </div>
      {!items.length ? (
        <div style={{ border: `1px solid ${palette.border}`, background: palette.surface, borderRadius: 14, padding: 24, textAlign: 'center' }}>
          <div style={{ fontSize: 27, marginBottom: 9 }}>✓</div>
          <div style={{ fontWeight: 800 }}>{copy.empty}</div>
          <p style={{ color: palette.sub, fontSize: 13, lineHeight: 1.5 }}>{copy.emptyDesc}</p>
        </div>
      ) : items.map((signal) => {
        const formatted = format(signal);
        const linkedTransactions = getTransactions ? getTransactions(signal) || [] : [];
        const thread = threads[signal.id] || [];
        const lastAssistantMessage = [...thread].reverse().find((message) => message.role === 'assistant');
        return (
          <article key={signal.id} style={{ border: `1px solid ${palette.border}`, background: palette.surface, borderRadius: 14, padding: 12 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span aria-hidden="true" style={{ background: palette.secondary, borderRadius: 10, padding: 8, fontSize: 18, flexShrink: 0 }}>
                {{ category_spike: '📈', recurring_change: '🔁', possible_duplicate: '📑', unusual_expense: '🔍', missing_recurring: '📅' }[signal.type]}
              </span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: palette.emphasis, background: palette.accent, borderRadius: 7, padding: '3px 7px' }}>
                    {copy[signal.priority]}
                  </span>
                  <span style={{ fontSize: 11, color: palette.sub }}>{dayLabel(signal.date, language)}</span>
                </div>
                <h3 style={{ margin: '0 0 7px', fontWeight: 850, fontSize: 15, color: palette.text, lineHeight: 1.35 }}>{formatted.title}</h3>
              </div>
            </div>
            <p style={{ margin: '9px 0 12px', fontSize: 13, lineHeight: 1.55, color: palette.sub, overflowWrap: 'anywhere' }}>{formatted.detail}</p>
            <div style={{ minWidth: 0, width: '100%' }}>
                {signal.type === 'possible_duplicate' && (
                  <div style={{ fontSize: 12, color: palette.text, background: palette.secondary, padding: '10px 12px', borderRadius: 11, lineHeight: 1.55, marginBottom: 10 }}>
                    <div><strong>{copy.matched}:</strong> {(signal.facts?.matchFields || ['amount']).map((f: string) => ({amount: language === 'it' ? 'importo' : 'amount', description: language === 'it' ? 'descrizione' : 'description', category: language === 'it' ? 'categoria' : 'category', payment_method: language === 'it' ? 'metodo di pagamento' : 'payment method', date: language === 'it' ? 'data' : 'date'}[f] || f)).join(', ')}</div>
                    <div><strong>{copy.different}:</strong> {(signal.facts?.differentFields || []).length ? (signal.facts.differentFields || []).map((f: string) => ({amount: language === 'it' ? 'importo' : 'amount', description: language === 'it' ? 'descrizione' : 'description', category: language === 'it' ? 'categoria' : 'category', payment_method: language === 'it' ? 'metodo di pagamento' : 'payment method', date: language === 'it' ? 'data' : 'date'}[f] || f)).join(', ') : copy.noneKnown}</div>
                  </div>
                )}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
                  <button type="button" onClick={() => ask(signal, copy.why)} style={{ background: palette.secondary, color: palette.text, border: `1px solid ${palette.border}`, borderRadius: 14, fontSize: 12, fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>{copy.why}</button>
                  <button type="button" onClick={() => ask(signal, copy.next)} style={{ background: palette.secondary, color: palette.text, border: `1px solid ${palette.border}`, borderRadius: 14, fontSize: 12, fontWeight: 800, padding: '10px 12px', cursor: 'pointer' }}>{copy.next}</button>
                  <button type="button" onClick={() => ask(signal, copy.action)} style={{ background: palette.primary, color: palette.primaryText, border: 0, borderRadius: 14, fontSize: 12, fontWeight: 800, padding: '10px 13px', cursor: 'pointer' }}>{copy.action}</button>
                  {onDismiss && (
                    <button type="button" onClick={() => onDismiss(signal)} style={{ background: palette.successBg, color: palette.successText, border: `1px solid ${palette.successBg}`, borderRadius: 14, fontSize: 12, fontWeight: 800, padding: '10px 13px', cursor: 'pointer' }}>{copy.dismiss}</button>
                  )}
                </div>

                {lastAssistantMessage && (
                  <div style={{ border: `1px solid ${palette.border}`, borderRadius: 16, padding: '14px 15px', background: palette.surface, marginBottom: 10, lineHeight: 1.65, whiteSpace: 'pre-wrap', fontSize: 14 }}>
                    {lastAssistantMessage.text}
                  </div>
                )}

                <div style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 10, background: dark ? '#0D1E30' : '#FAFBFD', marginBottom: 10, marginLeft: 0, marginRight: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: palette.text, marginBottom: 10 }}>{signal.type === 'missing_recurring' ? copy.historical : copy.transactions}</div>
                  {!linkedTransactions.length ? (
                    <div style={{ fontSize: 12, color: palette.sub }}>{copy.noTransactions}</div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                      {linkedTransactions.map((tx, index) => {
                        const txKey = String(tx._stableId || tx.id || `${signal.id}:${index}`);
                        return (
                          <div key={txKey} style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 10, background: palette.surface }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ fontSize: 13.5, fontWeight: 850, color: palette.text, overflowWrap: 'anywhere', lineHeight: 1.35 }}>{tx.desc || 'Transazione'}</div>
                                <div style={{ fontSize: 12, color: palette.sub, marginTop: 4, lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                                  {dayLabel(String(tx.date || ''), language)} · {tx.categoryName || (code === 'it' ? 'Categoria non indicata' : 'Category not provided')} · {tx.methodName || (code === 'it' ? 'Metodo non indicato' : 'Payment method not provided')}
                                </div>
                              </div>
                              <div style={{ fontSize: 13.5, fontWeight: 900, color: palette.text, whiteSpace: 'nowrap' }}>{fmt(Number(tx.amount) || 0)}</div>
                            </div>
                            {!tx._sourceEditable && <div style={{ fontSize: 11, color: palette.sub, marginTop: 6 }}>{copy.sourceExternal}</div>}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 10 }}>
                              {onEditTransaction && tx._sourceEditable && (
                                <button type="button" onClick={() => onEditTransaction(tx, signal)} style={{ background: '#EEF4FF', border: '1px solid #BFD7FF', color: '#245B8E', fontSize: 12, minHeight: 38, padding: '8px 12px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>✏️ {copy.edit}</button>
                              )}
                              {onDeleteTransaction && tx._sourceEditable && (
                                deleteConfirmKey === txKey ? (
                                  <>
                                    <span style={{ alignSelf: 'center', fontSize: 12, color: palette.sub }}>{copy.confirmRemove}</span>
                                    <button type="button" onClick={() => { onDeleteTransaction(tx, signal); setDeleteConfirmKey(null); }} style={{ background: palette.destructive, border: `1px solid ${palette.destructive}`, color: '#fff', fontSize: 12, minHeight: 38, padding: '8px 12px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>🗑️ {copy.remove}</button>
                                    <button type="button" onClick={() => setDeleteConfirmKey(null)} style={{ background: palette.surface, border: `1px solid ${palette.border}`, color: palette.text, fontSize: 12, minHeight: 38, padding: '8px 12px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>{copy.cancel}</button>
                                  </>
                                ) : (
                                  <button type="button" onClick={() => setDeleteConfirmKey(txKey)} style={{ background: palette.destructiveBg, border: `1px solid ${palette.destructiveBg}`, color: palette.destructive, fontSize: 12, minHeight: 38, padding: '8px 12px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }}>🗑️ {copy.remove}</button>
                                )
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div style={{ border: `1px solid ${palette.border}`, borderRadius: 12, padding: 12, background: dark ? '#0D1E30' : '#FAFBFD' }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: palette.text, marginBottom: 10 }}>{copy.askTitle}</div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                    <textarea
                      value={drafts[signal.id] || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setDrafts((prev) => ({ ...prev, [signal.id]: value }));
                        autoGrow(e.currentTarget);
                      }}
                      onInput={(e) => autoGrow(e.currentTarget)}
                      onFocus={(e) => autoGrow(e.currentTarget)}
                      placeholder={copy.askPlaceholder}
                      rows={1}
                      style={{
                        flex: 1,
                        minWidth: 0,
                        minHeight: 44,
                        resize: 'none',
                        overflow: 'hidden',
                        borderRadius: 14,
                        border: `1px solid ${palette.border}`,
                        padding: '11px 12px',
                        fontSize: 13,
                        lineHeight: 1.45,
                        background: palette.surface,
                        color: palette.text,
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => ask(signal)}
                      disabled={loadingId === signal.id}
                      style={{
                        background: palette.primary,
                        color: palette.primaryText,
                        border: 0,
                        borderRadius: 14,
                        minWidth: 110,
                        height: 50,
                        padding: '0 14px',
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: loadingId === signal.id ? 'default' : 'pointer',
                        opacity: loadingId === signal.id ? 0.75 : 1,
                        alignSelf: 'stretch',
                      }}
                    >
                      {loadingId === signal.id ? '...' : copy.send}
                    </button>
                  </div>
                </div>
              </div>
          </article>
        );
      })}
      <p style={{ margin: '0 2px 12px', color: palette.sub, fontSize: 11, lineHeight: 1.5 }}>{copy.note}</p>
    </section>
  );
}
