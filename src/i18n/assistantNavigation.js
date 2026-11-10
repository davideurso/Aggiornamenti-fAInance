const copy = {
  it: {
    adviceAndAnomalies: 'Consigli e anomalie',
    leavePending: 'Tornare a Consigli e anomalie? Il testo non inviato, le proposte non confermate e gli allegati in sospeso saranno scartati. Le richieste in corso saranno interrotte. La cronologia della conversazione sarà conservata.',
  },
  en: {
    adviceAndAnomalies: 'Advice and anomalies',
    leavePending: 'Return to Advice and anomalies? Unsent text, unconfirmed proposals and pending attachments will be discarded. Requests in progress will be stopped. Your conversation history will be kept.',
  },
  es: {
    adviceAndAnomalies: 'Consejos y anomalías',
    leavePending: '¿Volver a Consejos y anomalías? Se descartarán el texto no enviado, las propuestas sin confirmar y los archivos adjuntos pendientes. Se interrumpirán las solicitudes en curso. Se conservará el historial de la conversación.',
  },
  fr: {
    adviceAndAnomalies: 'Conseils et anomalies',
    leavePending: 'Revenir à Conseils et anomalies ? Le texte non envoyé, les propositions non confirmées et les pièces jointes en attente seront supprimés. Les demandes en cours seront interrompues. L’historique de la conversation sera conservé.',
  },
  de: {
    adviceAndAnomalies: 'Tipps und Auffälligkeiten',
    leavePending: 'Zu Tipps und Auffälligkeiten zurückkehren? Nicht gesendeter Text, unbestätigte Vorschläge und ausstehende Anhänge werden verworfen. Laufende Anfragen werden beendet. Der Gesprächsverlauf bleibt erhalten.',
  },
  pt: {
    adviceAndAnomalies: 'Conselhos e anomalias',
    leavePending: 'Voltar a Conselhos e anomalias? O texto não enviado, as propostas não confirmadas e os anexos pendentes serão descartados. Os pedidos em curso serão interrompidos. O histórico da conversa será mantido.',
  },
  pl: {
    adviceAndAnomalies: 'Wskazówki i anomalie',
    leavePending: 'Wrócić do wskazówek i anomalii? Niewysłany tekst, niepotwierdzone propozycje i oczekujące załączniki zostaną odrzucone. Trwające zapytania zostaną przerwane. Historia rozmowy zostanie zachowana.',
  },
  nl: {
    adviceAndAnomalies: 'Advies en afwijkingen',
    leavePending: 'Terug naar Advies en afwijkingen? Niet-verzonden tekst, onbevestigde voorstellen en bijlagen in behandeling worden verwijderd. Lopende verzoeken worden gestopt. Je gespreksgeschiedenis blijft bewaard.',
  },
  ro: {
    adviceAndAnomalies: 'Sfaturi și anomalii',
    leavePending: 'Revii la Sfaturi și anomalii? Textul netrimis, propunerile neconfirmate și atașamentele în așteptare vor fi eliminate. Cererile în curs vor fi întrerupte. Istoricul conversației va fi păstrat.',
  },
  el: {
    adviceAndAnomalies: 'Συμβουλές και ανωμαλίες',
    leavePending: 'Επιστροφή στις Συμβουλές και ανωμαλίες; Το μη απεσταλμένο κείμενο, οι μη επιβεβαιωμένες προτάσεις και τα εκκρεμή συνημμένα θα απορριφθούν. Τα αιτήματα σε εξέλιξη θα διακοπούν. Το ιστορικό της συνομιλίας θα διατηρηθεί.',
  },
};

export function assistantNavigationText(language, key) {
  const locale = String(language || 'en').toLowerCase().split(/[-_]/)[0];
  return (copy[locale] || copy.en)[key] || '';
}
