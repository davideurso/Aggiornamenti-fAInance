// Stato per la notifica mensile di chiusura del periodo, salvato nelle preferenze account.
export function periodClosureNoticeId(periodKey, currency) {
  const key = String(periodKey || "");
  const code = String(currency || "");
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(key) || !/^[A-Z]{3}$/.test(code)) {
    throw new Error("INVALID_PERIOD_CLOSURE_NOTICE");
  }
  return "period_closure:" + code + ":" + key;
}

export function periodClosureNoticeEnabled(preferences) {
  return !preferences || preferences.periodClosureActive !== false;
}

export function periodClosureNoticeVisible(preferences, id) {
  return periodClosureNoticeEnabled(preferences)
    && !(preferences && preferences.periodClosureDismissed && preferences.periodClosureDismissed[id]);
}

export function periodClosureNoticeRead(preferences, id) {
  return !!(preferences && preferences.periodClosureRead && preferences.periodClosureRead[id]);
}

const NOTICE_TEXT = {
  it: { settingTitle: "Chiusura del periodo", settingDescription: "Avviso mensile quando si conclude il periodo. Puoi eliminarlo dal Centro notifiche.", open: "Rivedi ripartizione" },
  en: { settingTitle: "Period closing", settingDescription: "Monthly alert when a period ends. You can delete it from Notifications.", open: "Review allocation" },
  es: { settingTitle: "Cierre del período", settingDescription: "Aviso mensual al finalizar el período. Puedes eliminarlo de Notificaciones.", open: "Revisar distribución" },
  fr: { settingTitle: "Clôture de la période", settingDescription: "Alerte mensuelle à la fin de la période. Vous pouvez la supprimer des notifications.", open: "Revoir la répartition" },
  de: { settingTitle: "Periodenabschluss", settingDescription: "Monatliche Benachrichtigung zum Periodenende. Du kannst sie in den Mitteilungen löschen.", open: "Verteilung prüfen" },
  pt: { settingTitle: "Fecho do período", settingDescription: "Aviso mensal quando o período termina. Podes eliminá-lo das notificações.", open: "Rever distribuição" },
  pl: { settingTitle: "Zamknięcie okresu", settingDescription: "Comiesięczne powiadomienie po zakończeniu okresu. Możesz je usunąć z powiadomień.", open: "Sprawdź podział" },
  nl: { settingTitle: "Periodeafsluiting", settingDescription: "Maandelijkse melding zodra een periode eindigt. Je kunt deze verwijderen bij Meldingen.", open: "Verdeling bekijken" },
  ro: { settingTitle: "Închiderea perioadei", settingDescription: "Notificare lunară la încheierea perioadei. O poți șterge din Notificări.", open: "Verifică distribuirea" },
  el: { settingTitle: "Κλείσιμο περιόδου", settingDescription: "Μηνιαία ειδοποίηση όταν λήγει η περίοδος. Μπορείς να τη διαγράψεις από τις ειδοποιήσεις.", open: "Έλεγχος κατανομής" },
};
export function periodClosureNoticeText(lang, key) {
  const locale = String(lang || "it").split("-")[0].toLowerCase();
  return (NOTICE_TEXT[locale] || NOTICE_TEXT.it)[key] || NOTICE_TEXT.it[key] || "";
}

export function updatePeriodClosureNotice(preferences, id, action) {
  if (action !== "read" && action !== "dismiss") throw new Error("INVALID_NOTICE_ACTION");
  const previous = preferences || {};
  const field = action === "read" ? "periodClosureRead" : "periodClosureDismissed";
  return {
    ...previous,
    [field]: { ...(previous[field] || {}), [id]: true },
  };
}
