export type AccountLoadStage = 'A1' | 'A2' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7';

// The deadline covers processing the snapshot, not only receiving it.
// Expiry never grants readiness or substitutes empty financial data.
export function createAccountLoadGuard(onFailure: (stage: AccountLoadStage) => void, timeoutMs = 20000, observe?: (stage: AccountLoadStage) => (() => void)) {
  let stage: AccountLoadStage = 'A1';
  let aborted = false;
  let finished = false;
  let rejectAbort!: (reason: Error) => void;
  const abort = new Promise<never>((_resolve, reject) => { rejectAbort = reject; });
  void abort.catch(() => undefined);
  const timer = setTimeout(() => fail(), timeoutMs);
  function fail() {
    if (aborted) return;
    aborted = true;
    clearTimeout(timer);
    rejectAbort(new Error('ACCOUNT_LOAD_ABORTED'));
    onFailure(stage);
  }
  return {
    stage(next: AccountLoadStage) { if (!aborted) stage = next; },
    async wait<T>(promise: PromiseLike<T>, next: AccountLoadStage): Promise<T> {
      if (aborted) throw new Error('ACCOUNT_LOAD_ABORTED');
      stage = next;
      let end: (() => void) | undefined;
      try { end = observe?.(next); } catch {}
      try {
        const value = await Promise.race([Promise.resolve(promise), abort]);
        if (aborted) throw new Error('ACCOUNT_LOAD_ABORTED');
        return value;
      } finally { try { end?.(); } catch {} }
    },
    complete() {
      if (aborted) return false;
      finished = true;
      clearTimeout(timer);
      return true;
    },
    fail,
    cancel() {
      aborted = true;
      clearTimeout(timer);
      rejectAbort(new Error('ACCOUNT_LOAD_CANCELLED'));
    },
    get finished() { return finished; },
    get aborted() { return aborted; },
  };
}

const messages: Record<string, [string, string]> = {
  it: ['Il caricamento non è stato completato. Riprova senza cancellare i dati dell’app.', 'Riprova'],
  en: ['Loading could not be completed. Try again without clearing app data.', 'Try again'],
  es: ['No se ha completado la carga. Vuelve a intentarlo sin borrar los datos de la aplicación.', 'Reintentar'],
  fr: ['Le chargement n’a pas abouti. Réessayez sans effacer les données de l’application.', 'Réessayer'],
  de: ['Das Laden wurde nicht abgeschlossen. Versuche es erneut, ohne die App-Daten zu löschen.', 'Erneut versuchen'],
  pt: ['Não foi possível concluir o carregamento. Tenta novamente sem apagar os dados da aplicação.', 'Tentar novamente'],
  pl: ['Nie udało się zakończyć ładowania. Spróbuj ponownie bez usuwania danych aplikacji.', 'Spróbuj ponownie'],
  nl: ['Het laden is niet voltooid. Probeer het opnieuw zonder appgegevens te wissen.', 'Opnieuw proberen'],
  ro: ['Încărcarea nu s-a finalizat. Încearcă din nou fără a șterge datele aplicației.', 'Încearcă din nou'],
  el: ['Η φόρτωση δεν ολοκληρώθηκε. Δοκιμάστε ξανά χωρίς να διαγράψετε τα δεδομένα της εφαρμογής.', 'Δοκιμάστε ξανά'],
};
export function accountLoadMessage(lang: string) { return messages[lang] || messages.en; }
