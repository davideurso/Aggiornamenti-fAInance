export const financeMessageRows: Record<string, string[]> = {
  it: ['Impossibile leggere i dati cloud. La sincronizzazione è sospesa. Aggiorna l’app e riprova.', 'Il backup contiene dati in conflitto con quelli presenti. Nessuna modifica applicata. Per sostituirli, scegli Sostituisci.'],
  en: ['Cloud data could not be read. Sync is paused. Update the app and try again.', 'The backup conflicts with existing data. No changes were applied. To replace them, choose Replace.'],
  es: ['No se han podido leer los datos de la nube. La sincronización está pausada. Actualiza la app e inténtalo de nuevo.', 'La copia de seguridad entra en conflicto con los datos existentes. No se aplicaron cambios. Para sustituirlos, elige Sustituir.'],
  fr: ['Impossible de lire les données cloud. La synchronisation est suspendue. Mettez l’app à jour et réessayez.', 'La sauvegarde est en conflit avec les données existantes. Aucune modification appliquée. Pour les remplacer, choisissez Remplacer.'],
  de: ['Die Cloud-Daten konnten nicht gelesen werden. Die Synchronisierung ist pausiert. Aktualisiere die App und versuche es erneut.', 'Die Sicherung steht im Konflikt mit vorhandenen Daten. Es wurden keine Änderungen angewendet. Wähle Ersetzen, um sie zu ersetzen.'],
  pt: ['Não foi possível ler os dados da nuvem. A sincronização está suspensa. Atualiza a app e tenta novamente.', 'A cópia de segurança entra em conflito com os dados existentes. Nenhuma alteração foi aplicada. Para os substituir, escolhe Substituir.'],
  pl: ['Nie można odczytać danych w chmurze. Synchronizacja jest wstrzymana. Zaktualizuj aplikację i spróbuj ponownie.', 'Kopia zapasowa jest sprzeczna z istniejącymi danymi. Nie zastosowano zmian. Aby je zastąpić, wybierz Zastąp.'],
  nl: ['De cloudgegevens konden niet worden gelezen. Synchronisatie is gepauzeerd. Werk de app bij en probeer opnieuw.', 'De back-up conflicteert met bestaande gegevens. Er zijn geen wijzigingen toegepast. Kies Vervangen om ze te vervangen.'],
  ro: ['Datele din cloud nu au putut fi citite. Sincronizarea este suspendată. Actualizează aplicația și încearcă din nou.', 'Copia de siguranță intră în conflict cu datele existente. Nu s-au aplicat modificări. Pentru a le înlocui, alege Înlocuiește.'],
  el: ['Δεν ήταν δυνατή η ανάγνωση των δεδομένων cloud. Ο συγχρονισμός έχει διακοπεί προσωρινά. Ενημέρωσε την εφαρμογή και δοκίμασε ξανά.', 'Το αντίγραφο ασφαλείας συγκρούεται με τα υπάρχοντα δεδομένα. Δεν εφαρμόστηκαν αλλαγές. Για να τα αντικαταστήσεις, επίλεξε Αντικατάσταση.'],
};
export function financeMessage(language: string, kind: 'sync' | 'conflict') {
  return (financeMessageRows[language] || financeMessageRows.en)[kind === 'sync' ? 0 : 1];
}
