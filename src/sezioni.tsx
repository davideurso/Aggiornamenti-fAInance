import { useState, useEffect, useRef, useMemo } from "react";
import { registerPlugin } from "@capacitor/core";
import {
  useApp,
  useStorage,
  MONTHS_FULL,
  MONTHS_SHORT,
  BALANCE_COLOR,
  COLORS,
  DEFAULT_EXPENSE_GROUPS,
  DEFAULT_PATRIMONIO_AREAS,
  DEFAULT_PATRIMONIO_ENTRIES,
  DEFAULT_GOALS,
  DEFAULT_BUDGET_PLAN,
  DEFAULT_CATS,
  DEFAULT_METHODS,
  getAllIncomeTypes,
  rateMonth,
  fmtDate,
  fmtAmt,
  parseMoney,
  todayStr,
  dateOffset,
  androidDownload,
  fbAuth,
  fbDb,
  doc,
  setDoc,
  getDoc,
  getDocs,
  addDoc,
  collection,
  query,
  where,
  limit,
  AI_AGENT_ENDPOINT,
  AI_OUT_OF_SCOPE_MESSAGE,
  AI_AGENT_SCOPE_INSTRUCTION,
  CURRENCIES,
  INCOME_TYPES,
  exportToCSV,
  exportToXLSX,
  parseCSVText,
  parseDateWithFormat,
  IMPORT_DATE_FORMATS,
  DATE_FORMATS,
  fmtAmt as fmtAmtFn,
  GOAL_ICONS,
  EMOJI_LIST,
  BG_THEMES,
  aiGrilloMascot,
} from "./core";
import { TRANSLATIONS } from "./traduzioni";
import { parseFainanceSingleVoiceCommon } from "./voiceParser";
import {
  detectAssistantTurnLanguage,
  assistantAnswerNeedsTranslation,
  assistantHearingReply,
  assistantRuntimeText,
  assistantLanguageName,
  createAssistantConversationLanguageState,
  resolveAssistantLanguageTurn,
  assistantLanguageControlReply,
  assistantSpeechLocale,
  buildAssistantRequestPayload,
  buildAssistantTranslationPayload,
  buildFinanceAdviceRequestPayload,
  buildFinanceAdviceTranslationPayload,
  buildRealtimeSessionRequest,
  buildRealtimeManualResponseSessionUpdate,
  getFainanceHelpAnswer,
  compactAssistantAnswer,
} from "./assistantLogic";
import {
  Btn,
  Badge,
  Toggle,
  StatCard,
  Toast,
  DonutChart,
  BarChart,
  LineChart,
  SortableRows,
  EmojiPicker,
  AppIconSelector,
  AppColorSelector,
  FainanceIcon,
  DatePickerField,
  GoalsPanel,
  AlertsPanel,
  AIGrilloIcon,
  FAInanceLogo,
  EditModal,
  PatrimonioSettingsPanel,
  AreasEditor,
  ExpenseForm,
  BulkEntry,
  ReceiptScanPanel,
  RecurringManager,
  PopupCloseButton,
} from "./widget";

function iconTextForInline(value: any) {
  var raw = String(value || "");
  return raw.indexOf("fai-icon:") === 0 ? "▧" : raw;
}

function normalizeAssistantDataAccessLevelLocal(value:any){
  var raw=String(value||"summary").toLowerCase();
  return raw==="full"?"full":raw==="areas"?"areas":"summary";
}
function assistantDataAccessPolicy(value:any){
  var level=normalizeAssistantDataAccessLevelLocal(value);
  var readScope=level==="full"
    ? "Detailed fAInance data supplied in context plus analysis-relevant user profile fields."
    : level==="areas"
    ? "Expense rows limited to date, amount, category and area, plus aggregated expense summaries. No descriptions, payment methods or profile data."
    : "Aggregated expense summaries only. No individual transactions, income details, balances, assets, profile data, descriptions, payment methods, notes or other detailed finance data.";
  return {
    level:level,
    readScope:readScope,
    actionsIndependentOfReadScope:true,
    allAvailableAppActionsRemainUsable:true,
    writeActionsRequireConfirmation:true,
    operationalContextRule:"Catalogs, defaults, settings and action metadata may be used only to resolve and execute a user-requested app action. They must never be used to infer finance data hidden by the selected read scope."
  };
}
function buildAssistantProfileContext(user:any){
  var src=user||{},out:any={};
  ["name","firstName","lastName","birthDate","gender","nationality","country","province","city","jobType","appUseReason"].forEach(function(key){
    var value=src[key];
    if(value!==undefined&&value!==null&&String(value).trim()!=="")out[key]=value;
  });
  return out;
}

const AI_VOICE_ENDPOINT = AI_AGENT_ENDPOINT.replace(
  /askFinanceAI(?:\?.*)?$/,
  "synthesizeFinanceVoice"
);
const AI_REALTIME_ENDPOINT = AI_AGENT_ENDPOINT.replace(
  /askFinanceAI(?:\?.*)?$/,
  "createFinanceRealtimeSession"
);
const FainanceAudioNative: any = registerPlugin("FainanceAudio");

import { L, PL } from "./utils/translationFallback";
import { pickFainanceContact } from "./native/contacts";

// ═══════════════════════════════════════════════════════════════════════════════
// SEZIONI.TSX — Pannelli principali dell'app
// HomePanel, SpesePanel, HistoryPanel, ConsulenteAIPanel, FloatingAIButton,
// Home, Movimenti, Storico, AI e voce.
// I pannelli Patrimonio/Share/Spesa/Debiti/Appunti/More sono in src/sections/*.
// ═══════════════════════════════════════════════════════════════════════════════

export function HomePanel() {
  var ctx: any = useApp();
  var {
    lang,
    expenses,
    incomes,
    recurring,
    goals,
    budgetPlan,
    shareProjects,
    shoppingCards,
    shoppingItems,
    setShoppingItems,
    appuntiNotes,
    bankCoords,
    creditCards,
    homeWorklets,
    setHomeWorklets,
    currentPlan,
    setTab,
    setSettingsPage,
    setSpeseSubTab,
    setAddType,
    setAddSubTab,
    setToast,
    fmt,
    fmtSec,
    secRate,
    secondaryCurrency,
    secRateLoading,
    currency,
    sym,
    secSym,
    curMonthKey,
    homeBalanceView,
    monthShortName,
    monthFullName,
    cats,
    expenseGroups,
    incomeTypes,
    isMobile,
    btnRadius,
    expenseColor,
    incomeColor,
    textC,
    subC,
    borderC,
    cardBg,
    dark,
    dateFmt,
    getCat,
    getIT,
    curMonthExp,
    curMonthInc,
    last12Balance,
    pendingCount,
    alertTriggered,
    markAlertsSeen,
    userKey,
    setVoiceModal,
    setVoiceText,
    setVoiceParsed,
    setVoiceError,
    setVoiceListening,
    openVoiceModal,
    setAiTab,
    setAiAdviceFilter,
      aiDismissed,
    setAiDismissed,
  }: any = ctx;
  var t = TRANSLATIONS[lang] || TRANSLATIONS.it;
  // Traduzioni esatte della Home: evitano frasi ibride quando il traduttore generico
  // prova a tradurre separatamente parti della stessa etichetta.
  var HOME_WORKLET_I18N: any = {
    en: {
      "Ultimo mese": "Last month",
      "Ultimi 3 mesi": "Last 3 months",
      "Ultimi 6 mesi": "Last 6 months",
      "Ultimi 12 mesi": "Last 12 months",
      "Tasti rapidi Entrate / Uscite": "Quick actions Income / Expenses",
      Riassunto: "Summary",
      "Distribuzione Uscite": "Expense distribution",
      "Entrate vs Uscite": "Income vs Expenses",
      "Saldo Mensile": "Monthly balance",
      "Ultime Uscite": "Recent expenses",
      "Ultime Entrate": "Recent income",
      "Share - Ultime transazioni": "Share - Recent transactions",
      "Share - Saldo": "Share - Balance",
      "Risparmio Pianificato": "Planned savings",
      "Fidelity Card": "Loyalty card",
      Obiettivo: "Goal",
      "Uscite per Area": "Expenses by area",
      "Uscite per Categoria": "Expenses by category",
      "Entrate per Tipo": "Income by type",
      "Budget - Riepilogo": "Budget - Summary",
      "Budget - Categorie": "Budget - Categories",
      "Risparmio - Andamento": "Savings - Trend",
      Note: "Notes",
      "Coordinata bancaria": "Bank details",
      "Carta di Credito": "Credit card",
      "Lista della spesa": "Shopping list",
      Voce: "Voice",
      Scontrino: "Receipt",
      Impostazioni: "Settings",
      Share: "Share",
      "Consigli AI": "AI tips",
      "Chat AI": "AI chat",
      Statistiche: "Statistics",
      Patrimonio: "Assets",
      Budget: "Budget",
      Spesa: "Shopping",
      Obiettivi: "Goals",
      Alert: "Alerts",
      Appunti: "Notes",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Quick buttons to add income and expenses",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Monthly expenses, monthly income, monthly balance and balance over the last 12 months",
      "Grafico per aree di uscita con intervallo temporale":
        "Expense-area chart with a selectable time range",
      "Confronto mensile tra entrate e uscite":
        "Monthly comparison between income and expenses",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Balance trend over the last 6 or 12 months",
      "Lista delle ultime uscite con numero configurabile":
        "List of recent expenses with a configurable item count",
      "Lista delle ultime entrate con numero configurabile":
        "List of recent income with a configurable item count",
      "Ultime transazioni di un progetto Share scelto":
        "Recent transactions from a selected Share project",
      "Saldo personale di un progetto Share scelto":
        "Personal balance for a selected Share project",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Planned savings from the Budget compared with actual savings",
      "Mostra una carta fidelity o prepagata scelta":
        "Shows a selected loyalty or prepaid card",
      "Avanzamento di un obiettivo scelto": "Progress of a selected goal",
      "Uscite raggruppate per area": "Expenses grouped by area",
      "Uscite raggruppate per categoria": "Expenses grouped by category",
      "Entrate raggruppate per tipo": "Income grouped by type",
      "Riepilogo budget, spesa reale e risparmio":
        "Summary of budget, actual spending and savings",
      "Categorie di budget con consumo del mese":
        "Budget categories with monthly usage",
      "Andamento sintetico del risparmio": "Summary of the savings trend",
      "Mostra una nota scelta dagli Appunti":
        "Shows a note selected from Notes",
      "Mostra una coordinata bancaria scelta": "Shows selected bank details",
      "Mostra una carta di credito salvata": "Shows a saved credit card",
      "Mostra gli elementi della lista della spesa scelta":
        "Shows the items in the selected shopping list",
      "Bottone rapido per aprire Voce": "Quick button to open Voice",
      "Bottone rapido per aprire Scontrino": "Quick button to open Receipt",
      "Bottone rapido per aprire Impostazioni": "Quick button to open Settings",
      "Bottone rapido per aprire Share": "Quick button to open Share",
      "Bottone rapido per aprire i consigli AI": "Quick button to open AI tips",
      "Bottone rapido per aprire la chat AI": "Quick button to open AI chat",
      "Bottone rapido per aprire Statistiche":
        "Quick button to open Statistics",
      "Bottone rapido per aprire Patrimonio": "Quick button to open Assets",
      "Bottone rapido per aprire Budget": "Quick button to open Budget",
      "Bottone rapido per aprire Spesa": "Quick button to open Shopping",
      "Bottone rapido per aprire Obiettivi": "Quick button to open Goals",
      "Bottone rapido per aprire Alert": "Quick button to open Alerts",
      "Bottone rapido per aprire Appunti": "Quick button to open Notes",
    },
    es: {
      "Ultimo mese": "Último mes",
      "Ultimi 3 mesi": "Últimos 3 meses",
      "Ultimi 6 mesi": "Últimos 6 meses",
      "Ultimi 12 mesi": "Últimos 12 meses",
      "Tasti rapidi Entrate / Uscite": "Acciones rápidas Ingresos / Gastos",
      Riassunto: "Resumen",
      "Distribuzione Uscite": "Distribución de gastos",
      "Entrate vs Uscite": "Ingresos vs Gastos",
      "Saldo Mensile": "Saldo mensual",
      "Ultime Uscite": "Últimos gastos",
      "Ultime Entrate": "Últimos ingresos",
      "Share - Ultime transazioni": "Share - Últimas transacciones",
      "Share - Saldo": "Share - Saldo",
      "Risparmio Pianificato": "Ahorro planificado",
      "Fidelity Card": "Tarjeta de fidelización",
      Obiettivo: "Objetivo",
      "Uscite per Area": "Gastos por área",
      "Uscite per Categoria": "Gastos por categoría",
      "Entrate per Tipo": "Ingresos por tipo",
      "Budget - Riepilogo": "Presupuesto - Resumen",
      "Budget - Categorie": "Presupuesto - Categorías",
      "Risparmio - Andamento": "Ahorro - Evolución",
      Note: "Notas",
      "Coordinata bancaria": "Datos bancarios",
      "Carta di Credito": "Tarjeta de crédito",
      "Lista della spesa": "Lista de la compra",
      Voce: "Voz",
      Scontrino: "Recibo",
      Impostazioni: "Ajustes",
      Share: "Share",
      "Consigli AI": "Consejos de IA",
      "Chat AI": "Chat de IA",
      Statistiche: "Estadísticas",
      Patrimonio: "Patrimonio",
      Budget: "Presupuesto",
      Spesa: "Compras",
      Obiettivi: "Objetivos",
      Alert: "Alertas",
      Appunti: "Notas",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Botones rápidos para añadir ingresos y gastos",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Gastos del mes, ingresos del mes, saldo del mes y saldo de los últimos 12 meses",
      "Grafico per aree di uscita con intervallo temporale":
        "Gráfico de gastos por área con intervalo temporal seleccionable",
      "Confronto mensile tra entrate e uscite":
        "Comparación mensual entre ingresos y gastos",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Evolución del saldo durante los últimos 6 o 12 meses",
      "Lista delle ultime uscite con numero configurabile":
        "Lista de los últimos gastos con cantidad configurable",
      "Lista delle ultime entrate con numero configurabile":
        "Lista de los últimos ingresos con cantidad configurable",
      "Ultime transazioni di un progetto Share scelto":
        "Últimas transacciones de un proyecto Share seleccionado",
      "Saldo personale di un progetto Share scelto":
        "Saldo personal de un proyecto Share seleccionado",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Ahorro planificado en el Presupuesto comparado con el ahorro real",
      "Mostra una carta fidelity o prepagata scelta":
        "Muestra una tarjeta de fidelización o prepago seleccionada",
      "Avanzamento di un obiettivo scelto":
        "Progreso de un objetivo seleccionado",
      "Uscite raggruppate per area": "Gastos agrupados por área",
      "Uscite raggruppate per categoria": "Gastos agrupados por categoría",
      "Entrate raggruppate per tipo": "Ingresos agrupados por tipo",
      "Riepilogo budget, spesa reale e risparmio":
        "Resumen de presupuesto, gasto real y ahorro",
      "Categorie di budget con consumo del mese":
        "Categorías de presupuesto con consumo del mes",
      "Andamento sintetico del risparmio": "Resumen de la evolución del ahorro",
      "Mostra una nota scelta dagli Appunti":
        "Muestra una nota seleccionada en Notas",
      "Mostra una coordinata bancaria scelta":
        "Muestra los datos bancarios seleccionados",
      "Mostra una carta di credito salvata":
        "Muestra una tarjeta de crédito guardada",
      "Mostra gli elementi della lista della spesa scelta":
        "Muestra los elementos de la lista de la compra seleccionada",
      "Bottone rapido per aprire Voce": "Botón rápido para abrir Voz",
      "Bottone rapido per aprire Scontrino": "Botón rápido para abrir Recibo",
      "Bottone rapido per aprire Impostazioni":
        "Botón rápido para abrir Ajustes",
      "Bottone rapido per aprire Share": "Botón rápido para abrir Share",
      "Bottone rapido per aprire i consigli AI":
        "Botón rápido para abrir los consejos de IA",
      "Bottone rapido per aprire la chat AI":
        "Botón rápido para abrir el chat de IA",
      "Bottone rapido per aprire Statistiche":
        "Botón rápido para abrir Estadísticas",
      "Bottone rapido per aprire Patrimonio":
        "Botón rápido para abrir Patrimonio",
      "Bottone rapido per aprire Budget": "Botón rápido para abrir Presupuesto",
      "Bottone rapido per aprire Spesa": "Botón rápido para abrir Compras",
      "Bottone rapido per aprire Obiettivi":
        "Botón rápido para abrir Objetivos",
      "Bottone rapido per aprire Alert": "Botón rápido para abrir Alertas",
      "Bottone rapido per aprire Appunti": "Botón rápido para abrir Notas",
    },
    fr: {
      "Ultimo mese": "Dernier mois",
      "Ultimi 3 mesi": "3 derniers mois",
      "Ultimi 6 mesi": "6 derniers mois",
      "Ultimi 12 mesi": "12 derniers mois",
      "Tasti rapidi Entrate / Uscite": "Actions rapides Revenus / Dépenses",
      Riassunto: "Résumé",
      "Distribuzione Uscite": "Répartition des dépenses",
      "Entrate vs Uscite": "Revenus vs Dépenses",
      "Saldo Mensile": "Solde mensuel",
      "Ultime Uscite": "Dernières dépenses",
      "Ultime Entrate": "Derniers revenus",
      "Share - Ultime transazioni": "Share - Dernières transactions",
      "Share - Saldo": "Share - Solde",
      "Risparmio Pianificato": "Épargne planifiée",
      "Fidelity Card": "Carte de fidélité",
      Obiettivo: "Objectif",
      "Uscite per Area": "Dépenses par zone",
      "Uscite per Categoria": "Dépenses par catégorie",
      "Entrate per Tipo": "Revenus par type",
      "Budget - Riepilogo": "Budget - Résumé",
      "Budget - Categorie": "Budget - Catégories",
      "Risparmio - Andamento": "Épargne - Évolution",
      Note: "Notes",
      "Coordinata bancaria": "Coordonnées bancaires",
      "Carta di Credito": "Carte de crédit",
      "Lista della spesa": "Liste de courses",
      Voce: "Voix",
      Scontrino: "Ticket de caisse",
      Impostazioni: "Paramètres",
      Share: "Share",
      "Consigli AI": "Conseils IA",
      "Chat AI": "Chat IA",
      Statistiche: "Statistiques",
      Patrimonio: "Patrimoine",
      Budget: "Budget",
      Spesa: "Courses",
      Obiettivi: "Objectifs",
      Alert: "Alertes",
      Appunti: "Notes",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Boutons rapides pour ajouter des revenus et des dépenses",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Dépenses du mois, revenus du mois, solde du mois et solde des 12 derniers mois",
      "Grafico per aree di uscita con intervallo temporale":
        "Graphique des dépenses par zone avec période sélectionnable",
      "Confronto mensile tra entrate e uscite":
        "Comparaison mensuelle entre revenus et dépenses",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Évolution du solde sur les 6 ou 12 derniers mois",
      "Lista delle ultime uscite con numero configurabile":
        "Liste des dernières dépenses avec nombre d’éléments configurable",
      "Lista delle ultime entrate con numero configurabile":
        "Liste des derniers revenus avec nombre d’éléments configurable",
      "Ultime transazioni di un progetto Share scelto":
        "Dernières transactions d’un projet Share sélectionné",
      "Saldo personale di un progetto Share scelto":
        "Solde personnel d’un projet Share sélectionné",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Épargne planifiée dans le Budget comparée à l’épargne réelle",
      "Mostra una carta fidelity o prepagata scelta":
        "Affiche une carte de fidélité ou prépayée sélectionnée",
      "Avanzamento di un obiettivo scelto":
        "Progression d’un objectif sélectionné",
      "Uscite raggruppate per area": "Dépenses regroupées par zone",
      "Uscite raggruppate per categoria": "Dépenses regroupées par catégorie",
      "Entrate raggruppate per tipo": "Revenus regroupés par type",
      "Riepilogo budget, spesa reale e risparmio":
        "Résumé du budget, des dépenses réelles et de l’épargne",
      "Categorie di budget con consumo del mese":
        "Catégories de budget avec consommation du mois",
      "Andamento sintetico del risparmio":
        "Synthèse de l’évolution de l’épargne",
      "Mostra una nota scelta dagli Appunti":
        "Affiche une note sélectionnée dans Notes",
      "Mostra una coordinata bancaria scelta":
        "Affiche les coordonnées bancaires sélectionnées",
      "Mostra una carta di credito salvata":
        "Affiche une carte de crédit enregistrée",
      "Mostra gli elementi della lista della spesa scelta":
        "Affiche les éléments de la liste de courses sélectionnée",
      "Bottone rapido per aprire Voce": "Bouton rapide pour ouvrir Voix",
      "Bottone rapido per aprire Scontrino":
        "Bouton rapide pour ouvrir Ticket de caisse",
      "Bottone rapido per aprire Impostazioni":
        "Bouton rapide pour ouvrir Paramètres",
      "Bottone rapido per aprire Share": "Bouton rapide pour ouvrir Share",
      "Bottone rapido per aprire i consigli AI":
        "Bouton rapide pour ouvrir les conseils IA",
      "Bottone rapido per aprire la chat AI":
        "Bouton rapide pour ouvrir le chat IA",
      "Bottone rapido per aprire Statistiche":
        "Bouton rapide pour ouvrir Statistiques",
      "Bottone rapido per aprire Patrimonio":
        "Bouton rapide pour ouvrir Patrimoine",
      "Bottone rapido per aprire Budget": "Bouton rapide pour ouvrir Budget",
      "Bottone rapido per aprire Spesa": "Bouton rapide pour ouvrir Courses",
      "Bottone rapido per aprire Obiettivi":
        "Bouton rapide pour ouvrir Objectifs",
      "Bottone rapido per aprire Alert": "Bouton rapide pour ouvrir Alertes",
      "Bottone rapido per aprire Appunti": "Bouton rapide pour ouvrir Notes",
    },
    de: {
      "Ultimo mese": "Letzter Monat",
      "Ultimi 3 mesi": "Letzte 3 Monate",
      "Ultimi 6 mesi": "Letzte 6 Monate",
      "Ultimi 12 mesi": "Letzte 12 Monate",
      "Tasti rapidi Entrate / Uscite": "Schnellaktionen Einnahmen / Ausgaben",
      Riassunto: "Übersicht",
      "Distribuzione Uscite": "Ausgabenverteilung",
      "Entrate vs Uscite": "Einnahmen vs Ausgaben",
      "Saldo Mensile": "Monatlicher Saldo",
      "Ultime Uscite": "Letzte Ausgaben",
      "Ultime Entrate": "Letzte Einnahmen",
      "Share - Ultime transazioni": "Share - Letzte Transaktionen",
      "Share - Saldo": "Share - Saldo",
      "Risparmio Pianificato": "Geplantes Sparen",
      "Fidelity Card": "Kundenkarte",
      Obiettivo: "Ziel",
      "Uscite per Area": "Ausgaben nach Bereich",
      "Uscite per Categoria": "Ausgaben nach Kategorie",
      "Entrate per Tipo": "Einnahmen nach Typ",
      "Budget - Riepilogo": "Budget - Übersicht",
      "Budget - Categorie": "Budget - Kategorien",
      "Risparmio - Andamento": "Sparen - Entwicklung",
      Note: "Notizen",
      "Coordinata bancaria": "Bankverbindung",
      "Carta di Credito": "Kreditkarte",
      "Lista della spesa": "Einkaufsliste",
      Voce: "Spracheingabe",
      Scontrino: "Beleg",
      Impostazioni: "Einstellungen",
      Share: "Share",
      "Consigli AI": "KI-Tipps",
      "Chat AI": "KI-Chat",
      Statistiche: "Statistiken",
      Patrimonio: "Vermögen",
      Budget: "Budget",
      Spesa: "Einkauf",
      Obiettivi: "Ziele",
      Alert: "Warnungen",
      Appunti: "Notizen",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Schnellschaltflächen zum Hinzufügen von Einnahmen und Ausgaben",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Monatliche Ausgaben, monatliche Einnahmen, Monatssaldo und Saldo der letzten 12 Monate",
      "Grafico per aree di uscita con intervallo temporale":
        "Ausgabendiagramm nach Bereichen mit auswählbarem Zeitraum",
      "Confronto mensile tra entrate e uscite":
        "Monatlicher Vergleich von Einnahmen und Ausgaben",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Saldoentwicklung der letzten 6 oder 12 Monate",
      "Lista delle ultime uscite con numero configurabile":
        "Liste der letzten Ausgaben mit einstellbarer Anzahl",
      "Lista delle ultime entrate con numero configurabile":
        "Liste der letzten Einnahmen mit einstellbarer Anzahl",
      "Ultime transazioni di un progetto Share scelto":
        "Letzte Transaktionen eines ausgewählten Share-Projekts",
      "Saldo personale di un progetto Share scelto":
        "Persönlicher Saldo eines ausgewählten Share-Projekts",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Geplantes Sparen aus dem Budget im Vergleich zum tatsächlichen Sparen",
      "Mostra una carta fidelity o prepagata scelta":
        "Zeigt eine ausgewählte Kunden- oder Prepaidkarte",
      "Avanzamento di un obiettivo scelto":
        "Fortschritt eines ausgewählten Ziels",
      "Uscite raggruppate per area": "Ausgaben nach Bereich gruppiert",
      "Uscite raggruppate per categoria": "Ausgaben nach Kategorie gruppiert",
      "Entrate raggruppate per tipo": "Einnahmen nach Typ gruppiert",
      "Riepilogo budget, spesa reale e risparmio":
        "Übersicht über Budget, tatsächliche Ausgaben und Ersparnis",
      "Categorie di budget con consumo del mese":
        "Budgetkategorien mit Verbrauch im aktuellen Monat",
      "Andamento sintetico del risparmio":
        "Zusammenfassung der Sparentwicklung",
      "Mostra una nota scelta dagli Appunti":
        "Zeigt eine aus den Notizen ausgewählte Notiz",
      "Mostra una coordinata bancaria scelta":
        "Zeigt die ausgewählte Bankverbindung",
      "Mostra una carta di credito salvata":
        "Zeigt eine gespeicherte Kreditkarte",
      "Mostra gli elementi della lista della spesa scelta":
        "Zeigt die Einträge der ausgewählten Einkaufsliste",
      "Bottone rapido per aprire Voce":
        "Schnellschaltfläche zum Öffnen der Spracheingabe",
      "Bottone rapido per aprire Scontrino":
        "Schnellschaltfläche zum Öffnen von Beleg",
      "Bottone rapido per aprire Impostazioni":
        "Schnellschaltfläche zum Öffnen der Einstellungen",
      "Bottone rapido per aprire Share":
        "Schnellschaltfläche zum Öffnen von Share",
      "Bottone rapido per aprire i consigli AI":
        "Schnellschaltfläche zum Öffnen der KI-Tipps",
      "Bottone rapido per aprire la chat AI":
        "Schnellschaltfläche zum Öffnen des KI-Chats",
      "Bottone rapido per aprire Statistiche":
        "Schnellschaltfläche zum Öffnen der Statistiken",
      "Bottone rapido per aprire Patrimonio":
        "Schnellschaltfläche zum Öffnen von Vermögen",
      "Bottone rapido per aprire Budget":
        "Schnellschaltfläche zum Öffnen des Budgets",
      "Bottone rapido per aprire Spesa":
        "Schnellschaltfläche zum Öffnen von Einkauf",
      "Bottone rapido per aprire Obiettivi":
        "Schnellschaltfläche zum Öffnen der Ziele",
      "Bottone rapido per aprire Alert":
        "Schnellschaltfläche zum Öffnen der Warnungen",
      "Bottone rapido per aprire Appunti":
        "Schnellschaltfläche zum Öffnen der Notizen",
    },
    pt: {
      "Ultimo mese": "Último mês",
      "Ultimi 3 mesi": "Últimos 3 meses",
      "Ultimi 6 mesi": "Últimos 6 meses",
      "Ultimi 12 mesi": "Últimos 12 meses",
      "Tasti rapidi Entrate / Uscite": "Ações rápidas Receitas / Despesas",
      Riassunto: "Resumo",
      "Distribuzione Uscite": "Distribuição de despesas",
      "Entrate vs Uscite": "Receitas vs Despesas",
      "Saldo Mensile": "Saldo mensal",
      "Ultime Uscite": "Últimas despesas",
      "Ultime Entrate": "Últimas receitas",
      "Share - Ultime transazioni": "Share - Últimas transações",
      "Share - Saldo": "Share - Saldo",
      "Risparmio Pianificato": "Poupança planeada",
      "Fidelity Card": "Cartão de fidelização",
      Obiettivo: "Objetivo",
      "Uscite per Area": "Despesas por área",
      "Uscite per Categoria": "Despesas por categoria",
      "Entrate per Tipo": "Receitas por tipo",
      "Budget - Riepilogo": "Orçamento - Resumo",
      "Budget - Categorie": "Orçamento - Categorias",
      "Risparmio - Andamento": "Poupança - Evolução",
      Note: "Notas",
      "Coordinata bancaria": "Dados bancários",
      "Carta di Credito": "Cartão de crédito",
      "Lista della spesa": "Lista de compras",
      Voce: "Voz",
      Scontrino: "Recibo",
      Impostazioni: "Definições",
      Share: "Share",
      "Consigli AI": "Dicas de IA",
      "Chat AI": "Chat de IA",
      Statistiche: "Estatísticas",
      Patrimonio: "Património",
      Budget: "Orçamento",
      Spesa: "Compras",
      Obiettivi: "Objetivos",
      Alert: "Alertas",
      Appunti: "Notas",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Botões rápidos para adicionar receitas e despesas",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Despesas do mês, receitas do mês, saldo do mês e saldo dos últimos 12 meses",
      "Grafico per aree di uscita con intervallo temporale":
        "Gráfico de despesas por área com intervalo de tempo selecionável",
      "Confronto mensile tra entrate e uscite":
        "Comparação mensal entre receitas e despesas",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Evolução do saldo nos últimos 6 ou 12 meses",
      "Lista delle ultime uscite con numero configurabile":
        "Lista das últimas despesas com quantidade configurável",
      "Lista delle ultime entrate con numero configurabile":
        "Lista das últimas receitas com quantidade configurável",
      "Ultime transazioni di un progetto Share scelto":
        "Últimas transações de um projeto Share selecionado",
      "Saldo personale di un progetto Share scelto":
        "Saldo pessoal de um projeto Share selecionado",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Poupança planeada no Orçamento comparada com a poupança real",
      "Mostra una carta fidelity o prepagata scelta":
        "Mostra um cartão de fidelização ou pré-pago selecionado",
      "Avanzamento di un obiettivo scelto":
        "Progresso de um objetivo selecionado",
      "Uscite raggruppate per area": "Despesas agrupadas por área",
      "Uscite raggruppate per categoria": "Despesas agrupadas por categoria",
      "Entrate raggruppate per tipo": "Receitas agrupadas por tipo",
      "Riepilogo budget, spesa reale e risparmio":
        "Resumo do orçamento, despesa real e poupança",
      "Categorie di budget con consumo del mese":
        "Categorias de orçamento com utilização do mês",
      "Andamento sintetico del risparmio": "Resumo da evolução da poupança",
      "Mostra una nota scelta dagli Appunti":
        "Mostra uma nota selecionada nas Notas",
      "Mostra una coordinata bancaria scelta":
        "Mostra os dados bancários selecionados",
      "Mostra una carta di credito salvata":
        "Mostra um cartão de crédito guardado",
      "Mostra gli elementi della lista della spesa scelta":
        "Mostra os itens da lista de compras selecionada",
      "Bottone rapido per aprire Voce": "Botão rápido para abrir Voz",
      "Bottone rapido per aprire Scontrino": "Botão rápido para abrir Recibo",
      "Bottone rapido per aprire Impostazioni":
        "Botão rápido para abrir Definições",
      "Bottone rapido per aprire Share": "Botão rápido para abrir Share",
      "Bottone rapido per aprire i consigli AI":
        "Botão rápido para abrir as dicas de IA",
      "Bottone rapido per aprire la chat AI":
        "Botão rápido para abrir o chat de IA",
      "Bottone rapido per aprire Statistiche":
        "Botão rápido para abrir Estatísticas",
      "Bottone rapido per aprire Patrimonio":
        "Botão rápido para abrir Património",
      "Bottone rapido per aprire Budget": "Botão rápido para abrir Orçamento",
      "Bottone rapido per aprire Spesa": "Botão rápido para abrir Compras",
      "Bottone rapido per aprire Obiettivi":
        "Botão rápido para abrir Objetivos",
      "Bottone rapido per aprire Alert": "Botão rápido para abrir Alertas",
      "Bottone rapido per aprire Appunti": "Botão rápido para abrir Notas",
    },
    pl: {
      "Ultimo mese": "Ostatni miesiąc",
      "Ultimi 3 mesi": "Ostatnie 3 miesiące",
      "Ultimi 6 mesi": "Ostatnie 6 miesięcy",
      "Ultimi 12 mesi": "Ostatnie 12 miesięcy",
      "Tasti rapidi Entrate / Uscite": "Szybkie akcje Przychody / Wydatki",
      Riassunto: "Podsumowanie",
      "Distribuzione Uscite": "Rozkład wydatków",
      "Entrate vs Uscite": "Przychody vs Wydatki",
      "Saldo Mensile": "Saldo miesięczne",
      "Ultime Uscite": "Ostatnie wydatki",
      "Ultime Entrate": "Ostatnie przychody",
      "Share - Ultime transazioni": "Share - Ostatnie transakcje",
      "Share - Saldo": "Share - Saldo",
      "Risparmio Pianificato": "Planowane oszczędności",
      "Fidelity Card": "Karta lojalnościowa",
      Obiettivo: "Cel",
      "Uscite per Area": "Wydatki według obszaru",
      "Uscite per Categoria": "Wydatki według kategorii",
      "Entrate per Tipo": "Przychody według typu",
      "Budget - Riepilogo": "Budżet - Podsumowanie",
      "Budget - Categorie": "Budżet - Kategorie",
      "Risparmio - Andamento": "Oszczędności - Trend",
      Note: "Notatki",
      "Coordinata bancaria": "Dane bankowe",
      "Carta di Credito": "Karta kredytowa",
      "Lista della spesa": "Lista zakupów",
      Voce: "Głos",
      Scontrino: "Paragon",
      Impostazioni: "Ustawienia",
      Share: "Share",
      "Consigli AI": "Porady AI",
      "Chat AI": "Czat AI",
      Statistiche: "Statystyki",
      Patrimonio: "Majątek",
      Budget: "Budżet",
      Spesa: "Zakupy",
      Obiettivi: "Cele",
      Alert: "Alerty",
      Appunti: "Notatki",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Szybkie przyciski do dodawania przychodów i wydatków",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Miesięczne wydatki, miesięczne przychody, saldo miesiąca i saldo z ostatnich 12 miesięcy",
      "Grafico per aree di uscita con intervallo temporale":
        "Wykres wydatków według obszaru z wybieranym zakresem czasu",
      "Confronto mensile tra entrate e uscite":
        "Miesięczne porównanie przychodów i wydatków",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Trend salda z ostatnich 6 lub 12 miesięcy",
      "Lista delle ultime uscite con numero configurabile":
        "Lista ostatnich wydatków z konfigurowalną liczbą pozycji",
      "Lista delle ultime entrate con numero configurabile":
        "Lista ostatnich przychodów z konfigurowalną liczbą pozycji",
      "Ultime transazioni di un progetto Share scelto":
        "Ostatnie transakcje z wybranego projektu Share",
      "Saldo personale di un progetto Share scelto":
        "Osobiste saldo wybranego projektu Share",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Planowane oszczędności z Budżetu w porównaniu z rzeczywistymi",
      "Mostra una carta fidelity o prepagata scelta":
        "Pokazuje wybraną kartę lojalnościową lub przedpłaconą",
      "Avanzamento di un obiettivo scelto": "Postęp wybranego celu",
      "Uscite raggruppate per area": "Wydatki pogrupowane według obszaru",
      "Uscite raggruppate per categoria":
        "Wydatki pogrupowane według kategorii",
      "Entrate raggruppate per tipo": "Przychody pogrupowane według typu",
      "Riepilogo budget, spesa reale e risparmio":
        "Podsumowanie budżetu, rzeczywistych wydatków i oszczędności",
      "Categorie di budget con consumo del mese":
        "Kategorie budżetu z wykorzystaniem w danym miesiącu",
      "Andamento sintetico del risparmio": "Podsumowanie trendu oszczędności",
      "Mostra una nota scelta dagli Appunti":
        "Pokazuje notatkę wybraną z Notatek",
      "Mostra una coordinata bancaria scelta": "Pokazuje wybrane dane bankowe",
      "Mostra una carta di credito salvata":
        "Pokazuje zapisaną kartę kredytową",
      "Mostra gli elementi della lista della spesa scelta":
        "Pokazuje pozycje z wybranej listy zakupów",
      "Bottone rapido per aprire Voce": "Szybki przycisk otwierający Głos",
      "Bottone rapido per aprire Scontrino":
        "Szybki przycisk otwierający Paragon",
      "Bottone rapido per aprire Impostazioni":
        "Szybki przycisk otwierający Ustawienia",
      "Bottone rapido per aprire Share": "Szybki przycisk otwierający Share",
      "Bottone rapido per aprire i consigli AI":
        "Szybki przycisk otwierający porady AI",
      "Bottone rapido per aprire la chat AI":
        "Szybki przycisk otwierający czat AI",
      "Bottone rapido per aprire Statistiche":
        "Szybki przycisk otwierający Statystyki",
      "Bottone rapido per aprire Patrimonio":
        "Szybki przycisk otwierający Majątek",
      "Bottone rapido per aprire Budget": "Szybki przycisk otwierający Budżet",
      "Bottone rapido per aprire Spesa": "Szybki przycisk otwierający Zakupy",
      "Bottone rapido per aprire Obiettivi": "Szybki przycisk otwierający Cele",
      "Bottone rapido per aprire Alert": "Szybki przycisk otwierający Alerty",
      "Bottone rapido per aprire Appunti":
        "Szybki przycisk otwierający Notatki",
    },
    nl: {
      "Ultimo mese": "Laatste maand",
      "Ultimi 3 mesi": "Laatste 3 maanden",
      "Ultimi 6 mesi": "Laatste 6 maanden",
      "Ultimi 12 mesi": "Laatste 12 maanden",
      "Tasti rapidi Entrate / Uscite": "Snelle acties Inkomsten / Uitgaven",
      Riassunto: "Samenvatting",
      "Distribuzione Uscite": "Uitgavenverdeling",
      "Entrate vs Uscite": "Inkomsten vs Uitgaven",
      "Saldo Mensile": "Maandelijks saldo",
      "Ultime Uscite": "Recente uitgaven",
      "Ultime Entrate": "Recente inkomsten",
      "Share - Ultime transazioni": "Share - Recente transacties",
      "Share - Saldo": "Share - Saldo",
      "Risparmio Pianificato": "Geplande besparing",
      "Fidelity Card": "Klantenkaart",
      Obiettivo: "Doel",
      "Uscite per Area": "Uitgaven per gebied",
      "Uscite per Categoria": "Uitgaven per categorie",
      "Entrate per Tipo": "Inkomsten per type",
      "Budget - Riepilogo": "Budget - Samenvatting",
      "Budget - Categorie": "Budget - Categorieën",
      "Risparmio - Andamento": "Besparing - Verloop",
      Note: "Notities",
      "Coordinata bancaria": "Bankgegevens",
      "Carta di Credito": "Creditcard",
      "Lista della spesa": "Boodschappenlijst",
      Voce: "Spraak",
      Scontrino: "Bon",
      Impostazioni: "Instellingen",
      Share: "Share",
      "Consigli AI": "AI-advies",
      "Chat AI": "AI-chat",
      Statistiche: "Statistieken",
      Patrimonio: "Vermogen",
      Budget: "Budget",
      Spesa: "Boodschappen",
      Obiettivi: "Doelen",
      Alert: "Waarschuwingen",
      Appunti: "Notities",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Snelknoppen om inkomsten en uitgaven toe te voegen",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Maandelijkse uitgaven, maandelijkse inkomsten, maandsaldo en saldo van de laatste 12 maanden",
      "Grafico per aree di uscita con intervallo temporale":
        "Uitgavengrafiek per gebied met instelbare periode",
      "Confronto mensile tra entrate e uscite":
        "Maandelijkse vergelijking van inkomsten en uitgaven",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Saldoverloop over de laatste 6 of 12 maanden",
      "Lista delle ultime uscite con numero configurabile":
        "Lijst met recente uitgaven en instelbaar aantal items",
      "Lista delle ultime entrate con numero configurabile":
        "Lijst met recente inkomsten en instelbaar aantal items",
      "Ultime transazioni di un progetto Share scelto":
        "Recente transacties van een geselecteerd Share-project",
      "Saldo personale di un progetto Share scelto":
        "Persoonlijk saldo van een geselecteerd Share-project",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Geplande besparing uit het Budget vergeleken met de werkelijke besparing",
      "Mostra una carta fidelity o prepagata scelta":
        "Toont een geselecteerde klantenkaart of prepaidkaart",
      "Avanzamento di un obiettivo scelto":
        "Voortgang van een geselecteerd doel",
      "Uscite raggruppate per area": "Uitgaven gegroepeerd per gebied",
      "Uscite raggruppate per categoria": "Uitgaven gegroepeerd per categorie",
      "Entrate raggruppate per tipo": "Inkomsten gegroepeerd per type",
      "Riepilogo budget, spesa reale e risparmio":
        "Samenvatting van budget, werkelijke uitgaven en besparing",
      "Categorie di budget con consumo del mese":
        "Budgetcategorieën met verbruik van de maand",
      "Andamento sintetico del risparmio": "Samenvatting van het spaarverloop",
      "Mostra una nota scelta dagli Appunti":
        "Toont een notitie die bij Notities is geselecteerd",
      "Mostra una coordinata bancaria scelta":
        "Toont de geselecteerde bankgegevens",
      "Mostra una carta di credito salvata": "Toont een opgeslagen creditcard",
      "Mostra gli elementi della lista della spesa scelta":
        "Toont de items van de geselecteerde boodschappenlijst",
      "Bottone rapido per aprire Voce": "Snelknop om Spraak te openen",
      "Bottone rapido per aprire Scontrino": "Snelknop om Bon te openen",
      "Bottone rapido per aprire Impostazioni":
        "Snelknop om Instellingen te openen",
      "Bottone rapido per aprire Share": "Snelknop om Share te openen",
      "Bottone rapido per aprire i consigli AI":
        "Snelknop om AI-advies te openen",
      "Bottone rapido per aprire la chat AI": "Snelknop om AI-chat te openen",
      "Bottone rapido per aprire Statistiche":
        "Snelknop om Statistieken te openen",
      "Bottone rapido per aprire Patrimonio": "Snelknop om Vermogen te openen",
      "Bottone rapido per aprire Budget": "Snelknop om Budget te openen",
      "Bottone rapido per aprire Spesa": "Snelknop om Boodschappen te openen",
      "Bottone rapido per aprire Obiettivi": "Snelknop om Doelen te openen",
      "Bottone rapido per aprire Alert": "Snelknop om Waarschuwingen te openen",
      "Bottone rapido per aprire Appunti": "Snelknop om Notities te openen",
    },
    ro: {
      "Ultimo mese": "Ultima lună",
      "Ultimi 3 mesi": "Ultimele 3 luni",
      "Ultimi 6 mesi": "Ultimele 6 luni",
      "Ultimi 12 mesi": "Ultimele 12 luni",
      "Tasti rapidi Entrate / Uscite": "Acțiuni rapide Venituri / Cheltuieli",
      Riassunto: "Rezumat",
      "Distribuzione Uscite": "Distribuția cheltuielilor",
      "Entrate vs Uscite": "Venituri vs Cheltuieli",
      "Saldo Mensile": "Sold lunar",
      "Ultime Uscite": "Ultimele cheltuieli",
      "Ultime Entrate": "Ultimele venituri",
      "Share - Ultime transazioni": "Share - Ultimele tranzacții",
      "Share - Saldo": "Share - Sold",
      "Risparmio Pianificato": "Economii planificate",
      "Fidelity Card": "Card de fidelitate",
      Obiettivo: "Obiectiv",
      "Uscite per Area": "Cheltuieli pe zonă",
      "Uscite per Categoria": "Cheltuieli pe categorie",
      "Entrate per Tipo": "Venituri pe tip",
      "Budget - Riepilogo": "Buget - Rezumat",
      "Budget - Categorie": "Buget - Categorii",
      "Risparmio - Andamento": "Economii - Evoluție",
      Note: "Notițe",
      "Coordinata bancaria": "Date bancare",
      "Carta di Credito": "Card de credit",
      "Lista della spesa": "Listă de cumpărături",
      Voce: "Voce",
      Scontrino: "Bon",
      Impostazioni: "Setări",
      Share: "Share",
      "Consigli AI": "Sfaturi AI",
      "Chat AI": "Chat AI",
      Statistiche: "Statistici",
      Patrimonio: "Patrimoniu",
      Budget: "Buget",
      Spesa: "Cumpărături",
      Obiettivi: "Obiective",
      Alert: "Alerte",
      Appunti: "Notițe",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Butoane rapide pentru adăugarea veniturilor și cheltuielilor",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Cheltuieli lunare, venituri lunare, sold lunar și soldul ultimelor 12 luni",
      "Grafico per aree di uscita con intervallo temporale":
        "Grafic al cheltuielilor pe zone cu interval de timp selectabil",
      "Confronto mensile tra entrate e uscite":
        "Comparație lunară între venituri și cheltuieli",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Evoluția soldului în ultimele 6 sau 12 luni",
      "Lista delle ultime uscite con numero configurabile":
        "Lista ultimelor cheltuieli cu număr configurabil de elemente",
      "Lista delle ultime entrate con numero configurabile":
        "Lista ultimelor venituri cu număr configurabil de elemente",
      "Ultime transazioni di un progetto Share scelto":
        "Ultimele tranzacții dintr-un proiect Share selectat",
      "Saldo personale di un progetto Share scelto":
        "Soldul personal al unui proiect Share selectat",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Economiile planificate în Buget comparate cu cele reale",
      "Mostra una carta fidelity o prepagata scelta":
        "Afișează un card de fidelitate sau preplătit selectat",
      "Avanzamento di un obiettivo scelto": "Progresul unui obiectiv selectat",
      "Uscite raggruppate per area": "Cheltuieli grupate pe zonă",
      "Uscite raggruppate per categoria": "Cheltuieli grupate pe categorie",
      "Entrate raggruppate per tipo": "Venituri grupate pe tip",
      "Riepilogo budget, spesa reale e risparmio":
        "Rezumatul bugetului, cheltuielilor reale și economiilor",
      "Categorie di budget con consumo del mese":
        "Categorii de buget cu consumul lunii",
      "Andamento sintetico del risparmio": "Rezumatul evoluției economiilor",
      "Mostra una nota scelta dagli Appunti":
        "Afișează o notiță selectată din Notițe",
      "Mostra una coordinata bancaria scelta":
        "Afișează datele bancare selectate",
      "Mostra una carta di credito salvata":
        "Afișează un card de credit salvat",
      "Mostra gli elementi della lista della spesa scelta":
        "Afișează elementele din lista de cumpărături selectată",
      "Bottone rapido per aprire Voce": "Buton rapid pentru a deschide Voce",
      "Bottone rapido per aprire Scontrino":
        "Buton rapid pentru a deschide Bon",
      "Bottone rapido per aprire Impostazioni":
        "Buton rapid pentru a deschide Setări",
      "Bottone rapido per aprire Share": "Buton rapid pentru a deschide Share",
      "Bottone rapido per aprire i consigli AI":
        "Buton rapid pentru a deschide sfaturile AI",
      "Bottone rapido per aprire la chat AI":
        "Buton rapid pentru a deschide chatul AI",
      "Bottone rapido per aprire Statistiche":
        "Buton rapid pentru a deschide Statistici",
      "Bottone rapido per aprire Patrimonio":
        "Buton rapid pentru a deschide Patrimoniu",
      "Bottone rapido per aprire Budget": "Buton rapid pentru a deschide Buget",
      "Bottone rapido per aprire Spesa":
        "Buton rapid pentru a deschide Cumpărături",
      "Bottone rapido per aprire Obiettivi":
        "Buton rapid pentru a deschide Obiective",
      "Bottone rapido per aprire Alert": "Buton rapid pentru a deschide Alerte",
      "Bottone rapido per aprire Appunti":
        "Buton rapid pentru a deschide Notițe",
    },
    el: {
      "Ultimo mese": "Τελευταίος μήνας",
      "Ultimi 3 mesi": "Τελευταίοι 3 μήνες",
      "Ultimi 6 mesi": "Τελευταίοι 6 μήνες",
      "Ultimi 12 mesi": "Τελευταίοι 12 μήνες",
      "Tasti rapidi Entrate / Uscite": "Γρήγορες ενέργειες Έσοδα / Έξοδα",
      Riassunto: "Σύνοψη",
      "Distribuzione Uscite": "Κατανομή εξόδων",
      "Entrate vs Uscite": "Έσοδα vs Έξοδα",
      "Saldo Mensile": "Μηνιαίο υπόλοιπο",
      "Ultime Uscite": "Τελευταία έξοδα",
      "Ultime Entrate": "Τελευταία έσοδα",
      "Share - Ultime transazioni": "Share - Τελευταίες συναλλαγές",
      "Share - Saldo": "Share - Υπόλοιπο",
      "Risparmio Pianificato": "Προγραμματισμένη αποταμίευση",
      "Fidelity Card": "Κάρτα επιβράβευσης",
      Obiettivo: "Στόχος",
      "Uscite per Area": "Έξοδα ανά περιοχή",
      "Uscite per Categoria": "Έξοδα ανά κατηγορία",
      "Entrate per Tipo": "Έσοδα ανά τύπο",
      "Budget - Riepilogo": "Προϋπολογισμός - Σύνοψη",
      "Budget - Categorie": "Προϋπολογισμός - Κατηγορίες",
      "Risparmio - Andamento": "Αποταμίευση - Εξέλιξη",
      Note: "Σημειώσεις",
      "Coordinata bancaria": "Τραπεζικά στοιχεία",
      "Carta di Credito": "Πιστωτική κάρτα",
      "Lista della spesa": "Λίστα αγορών",
      Voce: "Φωνή",
      Scontrino: "Απόδειξη",
      Impostazioni: "Ρυθμίσεις",
      Share: "Share",
      "Consigli AI": "Συμβουλές AI",
      "Chat AI": "Συνομιλία AI",
      Statistiche: "Στατιστικά",
      Patrimonio: "Περιουσία",
      Budget: "Προϋπολογισμός",
      Spesa: "Αγορές",
      Obiettivi: "Στόχοι",
      Alert: "Ειδοποιήσεις",
      Appunti: "Σημειώσεις",
      "Pulsanti rapidi per inserire entrate e uscite":
        "Γρήγορα κουμπιά για προσθήκη εσόδων και εξόδων",
      "Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi":
        "Μηνιαία έξοδα, μηνιαία έσοδα, μηνιαίο υπόλοιπο και υπόλοιπο τελευταίων 12 μηνών",
      "Grafico per aree di uscita con intervallo temporale":
        "Γράφημα εξόδων ανά περιοχή με επιλέξιμο χρονικό διάστημα",
      "Confronto mensile tra entrate e uscite":
        "Μηνιαία σύγκριση εσόδων και εξόδων",
      "Andamento del saldo negli ultimi 6 o 12 mesi":
        "Εξέλιξη υπολοίπου τους τελευταίους 6 ή 12 μήνες",
      "Lista delle ultime uscite con numero configurabile":
        "Λίστα τελευταίων εξόδων με ρυθμιζόμενο αριθμό στοιχείων",
      "Lista delle ultime entrate con numero configurabile":
        "Λίστα τελευταίων εσόδων με ρυθμιζόμενο αριθμό στοιχείων",
      "Ultime transazioni di un progetto Share scelto":
        "Τελευταίες συναλλαγές επιλεγμένου έργου Share",
      "Saldo personale di un progetto Share scelto":
        "Προσωπικό υπόλοιπο επιλεγμένου έργου Share",
      "Risparmio pianificato dal Budget e confronto con il reale":
        "Προγραμματισμένη αποταμίευση από τον Προϋπολογισμό σε σύγκριση με την πραγματική",
      "Mostra una carta fidelity o prepagata scelta":
        "Εμφανίζει επιλεγμένη κάρτα επιβράβευσης ή προπληρωμένη κάρτα",
      "Avanzamento di un obiettivo scelto": "Πρόοδος επιλεγμένου στόχου",
      "Uscite raggruppate per area": "Έξοδα ομαδοποιημένα ανά περιοχή",
      "Uscite raggruppate per categoria": "Έξοδα ομαδοποιημένα ανά κατηγορία",
      "Entrate raggruppate per tipo": "Έσοδα ομαδοποιημένα ανά τύπο",
      "Riepilogo budget, spesa reale e risparmio":
        "Σύνοψη προϋπολογισμού, πραγματικών εξόδων και αποταμίευσης",
      "Categorie di budget con consumo del mese":
        "Κατηγορίες προϋπολογισμού με κατανάλωση του μήνα",
      "Andamento sintetico del risparmio": "Σύνοψη της εξέλιξης αποταμίευσης",
      "Mostra una nota scelta dagli Appunti":
        "Εμφανίζει μια σημείωση επιλεγμένη από τις Σημειώσεις",
      "Mostra una coordinata bancaria scelta":
        "Εμφανίζει τα επιλεγμένα τραπεζικά στοιχεία",
      "Mostra una carta di credito salvata":
        "Εμφανίζει μια αποθηκευμένη πιστωτική κάρτα",
      "Mostra gli elementi della lista della spesa scelta":
        "Εμφανίζει τα στοιχεία της επιλεγμένης λίστας αγορών",
      "Bottone rapido per aprire Voce": "Γρήγορο κουμπί για άνοιγμα της Φωνής",
      "Bottone rapido per aprire Scontrino":
        "Γρήγορο κουμπί για άνοιγμα της Απόδειξης",
      "Bottone rapido per aprire Impostazioni":
        "Γρήγορο κουμπί για άνοιγμα των Ρυθμίσεων",
      "Bottone rapido per aprire Share": "Γρήγορο κουμπί για άνοιγμα του Share",
      "Bottone rapido per aprire i consigli AI":
        "Γρήγορο κουμπί για άνοιγμα των συμβουλών AI",
      "Bottone rapido per aprire la chat AI":
        "Γρήγορο κουμπί για άνοιγμα της συνομιλίας AI",
      "Bottone rapido per aprire Statistiche":
        "Γρήγορο κουμπί για άνοιγμα των Στατιστικών",
      "Bottone rapido per aprire Patrimonio":
        "Γρήγορο κουμπί για άνοιγμα της Περιουσίας",
      "Bottone rapido per aprire Budget":
        "Γρήγορο κουμπί για άνοιγμα του Προϋπολογισμού",
      "Bottone rapido per aprire Spesa":
        "Γρήγορο κουμπί για άνοιγμα των Αγορών",
      "Bottone rapido per aprire Obiettivi":
        "Γρήγορο κουμπί για άνοιγμα των Στόχων",
      "Bottone rapido per aprire Alert":
        "Γρήγορο κουμπί για άνοιγμα των Ειδοποιήσεων",
      "Bottone rapido per aprire Appunti":
        "Γρήγορο κουμπί για άνοιγμα των Σημειώσεων",
    },
  };
  function H(value: any) {
    var key = String(value == null ? "" : value);
    if (!key || lang === "it") return key;
    var table = HOME_WORKLET_I18N[lang] || HOME_WORKLET_I18N.en || {};
    return table[key] !== undefined ? table[key] : L(key);
  }
  var HOME_LIBRARY = [
    {
      type: "assistant_voice_widget",
      icon: "🦗",
      label: assistantVoiceUiText(lang || "it").title,
      desc: assistantVoiceUiText(lang || "it").sub,
    },
    {
      type: "quick_actions",
      icon: "⚡",
      label: H("Tasti rapidi Entrate / Uscite"),
      desc: H("Pulsanti rapidi per inserire entrate e uscite"),
    },
    {
      type: "summary",
      icon: "📌",
      label: H("Riassunto"),
      desc: H("Uscite mese, entrate mese, saldo mese e saldo ultimi 12 mesi"),
    },
    {
      type: "distribution_expenses",
      icon: "🥧",
      label: H("Distribuzione Uscite"),
      desc: H("Grafico per aree di uscita con intervallo temporale"),
    },
    {
      type: "income_vs_expense",
      icon: "📊",
      label: H("Entrate vs Uscite"),
      desc: H("Confronto mensile tra entrate e uscite"),
    },
    {
      type: "monthly_balance",
      icon: "📈",
      label: H("Saldo Mensile"),
      desc: H("Andamento del saldo negli ultimi 6 o 12 mesi"),
    },
    {
      type: "latest_expenses",
      icon: "🧾",
      label: H("Ultime Uscite"),
      desc: H("Lista delle ultime uscite con numero configurabile"),
    },
    {
      type: "latest_incomes",
      icon: "💰",
      label: H("Ultime Entrate"),
      desc: H("Lista delle ultime entrate con numero configurabile"),
    },
    {
      type: "share_recent",
      icon: "🤝",
      label: H("Share - Ultime transazioni"),
      desc: H("Ultime transazioni di un progetto Share scelto"),
    },
    {
      type: "share_balance",
      icon: "⚖️",
      label: H("Share - Saldo"),
      desc: H("Saldo personale di un progetto Share scelto"),
    },
    {
      type: "planned_saving",
      icon: "🌱",
      label: H("Risparmio Pianificato"),
      desc: H("Risparmio pianificato dal Budget e confronto con il reale"),
    },
    {
      type: "fidelity_card",
      icon: "💳",
      label: H("Fidelity Card"),
      desc: H("Mostra una carta fidelity o prepagata scelta"),
    },
    {
      type: "goal",
      icon: "🎯",
      label: H("Obiettivo"),
      desc: H("Avanzamento di un obiettivo scelto"),
    },
    {
      type: "expenses_by_area",
      icon: "🗂️",
      label: H("Uscite per Area"),
      desc: H("Uscite raggruppate per area"),
    },
    {
      type: "expenses_by_category",
      icon: "🏷️",
      label: H("Uscite per Categoria"),
      desc: H("Uscite raggruppate per categoria"),
    },
    {
      type: "incomes_by_type",
      icon: "💵",
      label: H("Entrate per Tipo"),
      desc: H("Entrate raggruppate per tipo"),
    },
    {
      type: "budget_overview",
      icon: "📋",
      label: H("Budget - Riepilogo"),
      desc: H("Riepilogo budget, spesa reale e risparmio"),
    },
    {
      type: "budget_by_category",
      icon: "🧮",
      label: H("Budget - Categorie"),
      desc: H("Categorie di budget con consumo del mese"),
    },
    {
      type: "savings_progress",
      icon: "📈",
      label: H("Risparmio - Andamento"),
      desc: H("Andamento sintetico del risparmio"),
    },
    {
      type: "upcoming_scheduled_expenses",
      icon: "🗓️",
      label: H("Prossime spese programmate"),
      desc: H("Mostra le prossime uscite ricorrenti programmate"),
    },
    {
      type: "note_widget",
      icon: "📝",
      label: H("Note"),
      desc: H("Mostra una nota scelta dagli Appunti"),
    },
    {
      type: "bank_coord_widget",
      icon: "🏦",
      label: H("Coordinata bancaria"),
      desc: H("Mostra una coordinata bancaria scelta"),
    },
    {
      type: "credit_card_widget",
      icon: "💳",
      label: H("Carta di Credito"),
      desc: H("Mostra una carta di credito salvata"),
    },
    {
      type: "shopping_list_widget",
      icon: "🧺",
      label: H("Lista della spesa"),
      desc: H("Mostra gli elementi della lista della spesa scelta"),
    },
    {
      type: "button_voice",
      icon: currentPlan === "base" || currentPlan === "premium" ? "🦗" : "🎙️",
      label:
        currentPlan === "base" || currentPlan === "premium"
          ? assistantVoiceUiText(lang || "it").title
          : H("Voce"),
      desc:
        currentPlan === "base" || currentPlan === "premium"
          ? assistantVoiceUiText(lang || "it").sub
          : H("Bottone rapido per aprire Voce"),
    },
    {
      type: "button_receipt",
      icon: "📷",
      label: H("Scontrino"),
      desc: H("Bottone rapido per aprire Scontrino"),
    },
    {
      type: "button_settings",
      icon: "⚙",
      label: H("Impostazioni"),
      desc: H("Bottone rapido per aprire Impostazioni"),
    },
    {
      type: "button_share",
      icon: "🤝",
      label: H("Share"),
      desc: H("Bottone rapido per aprire Share"),
    },
    {
      type: "button_ai_advice",
      icon: "🦗",
      label: H("Consigli AI"),
      desc: H("Bottone rapido per aprire i consigli AI"),
    },
    {
      type: "button_ai_chat",
      icon: "💬",
      label: H("Conversa con l'Assistente"),
      desc: H("Bottone rapido per aprire l'assistente completo"),
    },
    {
      type: "button_stats",
      icon: "📊",
      label: H("Statistiche"),
      desc: H("Bottone rapido per aprire Statistiche"),
    },
    {
      type: "button_patrimonio",
      icon: "💎",
      label: H("Patrimonio"),
      desc: H("Bottone rapido per aprire Patrimonio"),
    },
    {
      type: "button_budget",
      icon: "💰",
      label: H("Budget"),
      desc: H("Bottone rapido per aprire Budget"),
    },
    {
      type: "button_shopping",
      icon: "🛒",
      label: H("Spesa"),
      desc: H("Bottone rapido per aprire Spesa"),
    },
    {
      type: "button_goals",
      icon: "🎯",
      label: H("Obiettivi"),
      desc: H("Bottone rapido per aprire Obiettivi"),
    },
    {
      type: "button_alerts",
      icon: "🔔",
      label: H("Alert"),
      desc: H("Bottone rapido per aprire Alert"),
    },
    {
      type: "button_appunti",
      icon: "🗂",
      label: H("Appunti"),
      desc: H("Bottone rapido per aprire Appunti"),
    },
  ];
  var WORKLET_LABELS: any = {};
  HOME_LIBRARY.forEach(function (x) {
    WORKLET_LABELS[x.type] = x.label;
  });
  var HOME_DEFAULT_WORKLETS = [
    {
      id: "home_quick_actions",
      type: "quick_actions",
      size: "1x",
      color: "#F8FAFF",
      params: { showTitle: false },
    },
    {
      id: "home_summary",
      type: "summary",
      size: "1x",
      color: "#FFFFFF",
      params: { showTitle: false },
    },
    {
      id: "home_distribution_expenses",
      type: "distribution_expenses",
      size: "1x",
      color: "#FFFFFF",
      params: { range: 6 },
    },
    {
      id: "home_income_vs_expense",
      type: "income_vs_expense",
      size: "1x",
      color: "#FFFFFF",
      params: { range: 6 },
    },
    {
      id: "home_monthly_balance",
      type: "monthly_balance",
      size: "2x",
      color: "#FFFFFF",
      params: { range: 6 },
    },
    {
      id: "home_latest_expenses",
      type: "latest_expenses",
      size: "1x",
      color: "#FFFFFF",
      params: { count: 5 },
    },
    {
      id: "home_latest_incomes",
      type: "latest_incomes",
      size: "1x",
      color: "#FFFFFF",
      params: { count: 5 },
    },
  ];
  var HOME_BASE_SCHEDULED_WORKLET = {
    id: "home_upcoming_scheduled_expenses",
    type: "upcoming_scheduled_expenses",
    size: "1x",
    color: "#FFFFFF",
    params: { showTitle: true },
  };
  var HOME_COLORS = [
    "#FFFFFF",
    "#F8FAFF",
    "#F0EDFF",
    "#E8F4FF",
    "#EAF7EE",
    "#FFF8E1",
    "#FFF0F0",
    "#FDF2F8",
    "#EEF2FF",
    "#F1F5F9",
    "#E0F2FE",
    "#DCFCE7",
    "#FEF3C7",
    "#FFE4E6",
    "#EDE9FE",
    "#E0E7FF",
    "#CCFBF1",
    "#F3E8FF",
    "#111827",
    "#1E1E30",
  ];
  var RANGE_LABELS: any = {
    1: H("Ultimo mese"),
    3: H("Ultimi 3 mesi"),
    6: H("Ultimi 6 mesi"),
    12: H("Ultimi 12 mesi"),
  };
  var premiumHome = String(currentPlan || "free") === "premium";
  var [homeEditMode, setHomeEditMode] = useState(false);
  var [editDraft, setEditDraft] = useState<any>(null);
  var [dragPayload, setDragPayload] = useState<any>(null);
  var [homeDropIndex, setHomeDropIndex] = useState<any>(null);
  var [homeDragging, setHomeDragging] = useState<any>(null);
  var homePointerDragRef: any = useRef(null);
  var homeCountDraftRef: any = useRef({});
  var homeTitleDraftRef: any = useRef({});
  var [homeDonePos, setHomeDonePos] = useState<any>({ right: 14, bottom: 78 });
  var homeDoneDragRef: any = useRef(null);
  var secondaryC = ctx.secondaryButtonColor || "#5FAFE5";
  var [homeShoppingLists] = useStorage(userKey("shopping_lists_v2"), [
    {
      id: "main",
      title: "Lista principale",
      icon: "🧺",
      createdAt: new Date().toISOString(),
    },
  ]);
  var [homeActiveShoppingListId] = useStorage(
    userKey("shopping_active_list_id_v2"),
    "main"
  );
  useEffect(
    function () {
      try {
        var key = userKey
          ? userKey("home_edit_request_v1")
          : "home_edit_request_v1";
        if (localStorage.getItem(key) === "1") {
          localStorage.removeItem(key);
          if (premiumHome) setHomeEditMode(true);
        }
      } catch (e) {}
    },
    [premiumHome, userKey]
  );
  function lib(type) {
    return (
      HOME_LIBRARY.find(function (x) {
        return x.type === type;
      }) || { type: type, icon: "🧩", label: type, desc: "" }
    );
  }
  function safeNum(v) {
    var n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }
  // fAInance Test - consigli Home: la chiusura deve essere immediata e persistente.
  function dismissHomeAdvice(id: any) {
    if (!id) return;
    setAiDismissed(function (current: any) {
      var list = Array.isArray(current) ? current : [];
      return list.indexOf(id) >= 0 ? list : list.concat([id]);
    });
  }

  function lastMonthKeys(n) {
    var count = Math.max(1, Number(n) || 1);
    var now = new Date();
    var arr = [];
    for (var i = count - 1; i >= 0; i--) {
      var d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      arr.push(
        d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0")
      );
    }
    return arr;
  }
  function monthLabel(k) {
    var m = parseInt(String(k).slice(5, 7), 10) - 1;
    var yy = String(k).slice(2, 4);
    var base = monthShortName
      ? monthShortName(m)
      : MONTHS_SHORT[m] || String(k).slice(5, 7);
    return base + " " + yy;
  }
  function totalInKeys(list, keys) {
    return (list || []).reduce(function (a, e) {
      return (
        a +
        keys.reduce(function (s, k) {
          return s + safeNum(rateMonth(e, k));
        }, 0)
      );
    }, 0);
  }
  function sumBy(list, keys, getKey, getLabel, getColor) {
    var map: any = {};
    (list || []).forEach(function (e) {
      var val = keys.reduce(function (s, k) {
        return s + safeNum(rateMonth(e, k));
      }, 0);
      if (!val) return;
      var key = getKey(e) || "altro";
      if (!map[key])
        map[key] = {
          key: key,
          label: getLabel(e, key),
          value: 0,
          color: getColor(e, key),
        };
      map[key].value += val;
    });
    return Object.keys(map)
      .map(function (k) {
        return map[k];
      })
      .sort(function (a, b) {
        return b.value - a.value;
      });
  }
  function allGroups() {
    var base =
      Array.isArray(expenseGroups) && expenseGroups.length
        ? expenseGroups
        : DEFAULT_EXPENSE_GROUPS;
    var out = base.slice();
    if (
      !out.some(function (g) {
        return String(g.id) === "altro";
      })
    ) {
      var alt = (DEFAULT_EXPENSE_GROUPS || []).find(function (g) {
        return String(g.id) === "altro";
      }) || { id: "altro", name: "Altro", icon: "📦", color: "#D3D1C7" };
      out.push(alt);
    }
    return out;
  }
  function groupForExpense(e) {
    var cat = getCat
      ? getCat(e.catId)
      : (cats || []).find(function (c) {
          return String(c.id) === String(e.catId);
        });
    var groups = allGroups();
    var g = (groups || []).find(function (x) {
      return cat && String(x.id) === String(cat.group);
    });
    return (
      g ||
      (groups || []).find(function (x) {
        return String(x.id) === "altro";
      }) || { id: "altro", name: "Altro", icon: "📦", color: "#D3D1C7" }
    );
  }
  function monthlyChart(n) {
    var keys = lastMonthKeys(n);
    return keys
      .map(function (k) {
        var exp = totalInKeys(expenses, [k]);
        var inc = totalInKeys(incomes, [k]);
        return { label: monthLabel(k), exp: exp, inc: inc, value: inc - exp };
      })
      .filter(function (row) {
        // Empty months are not shown: charts contain only months with at least
        // one income or expense, while preserving chronological order.
        return (
          Math.abs(safeNum(row.exp)) > 0.000001 ||
          Math.abs(safeNum(row.inc)) > 0.000001
        );
      });
  }
  function recurringAnnualMonth(r) {
    var raw =
      r && r.annualMonth != null
        ? r.annualMonth
        : r && r.monthOfYear != null
        ? r.monthOfYear
        : r && r.month != null
        ? r.month
        : r && r.dayOfMonth;
    var n = parseInt(raw, 10);
    if (isNaN(n) || n < 1 || n > 12) n = 1;
    return n;
  }
  function recurringDueDay(r) {
    var annualLegacy =
      String((r && r.frequency) || "monthly") === "annual" &&
      r &&
      r.annualMonth == null &&
      r.month == null &&
      r.monthOfYear == null;
    var raw = annualLegacy ? 1 : r && r.dayOfMonth;
    var n = parseInt(raw, 10);
    if (isNaN(n)) n = 1;
    if (n < 0) n = 1;
    if (n > 31) n = 31;
    return n;
  }
  function recurringNextDate(r) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var freq = String((r && r.frequency) || "monthly");
    var handledConfirmed = r && Array.isArray(r.confirmed) ? r.confirmed : [];
    var handledSkipped = r && Array.isArray(r.skipped) ? r.skipped : [];
    for (var off = 0; off < 30; off++) {
      var first = new Date(today.getFullYear(), today.getMonth() + off, 1);
      var y = first.getFullYear(),
        m = first.getMonth();
      if (freq === "annual" && recurringAnnualMonth(r) !== m + 1) continue;
      var mk = String(y) + "-" + String(m + 1).padStart(2, "0");
      if (handledConfirmed.indexOf(mk) >= 0 || handledSkipped.indexOf(mk) >= 0)
        continue;
      var rawDay = recurringDueDay(r);
      var lastDay = new Date(y, m + 1, 0).getDate();
      var day = rawDay === 0 ? lastDay : Math.min(lastDay, Math.max(1, rawDay));
      var due = new Date(y, m, day);
      due.setHours(0, 0, 0, 0);
      if (due >= today) return due;
    }
    return null;
  }
  function upcomingScheduledExpenses() {
    return (recurring || [])
      .filter(function (r) {
        return String((r && r.rtype) || "expense") !== "income";
      })
      .map(function (r) {
        return { item: r, date: recurringNextDate(r) };
      })
      .filter(function (x) {
        return !!x.date;
      })
      .sort(function (a, b) {
        return a.date.getTime() - b.date.getTime();
      });
  }
  function recurringDateLabel(d) {
    if (!d) return "";
    var month = monthShortName
      ? monthShortName(d.getMonth())
      : MONTHS_SHORT[d.getMonth()];
    return String(d.getDate()) + " " + String(month || "");
  }
  function rangeTitle(w) {
    var n = (w.params && w.params.range) || 12;
    return RANGE_LABELS[n] || RANGE_LABELS[12];
  }
  function workletColor(w) {
    var raw = String((w && w.color) || "#FFFFFF");
    if (!dark) return raw;
    var h = raw.replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    if (!/^[0-9a-fA-F]{6}$/.test(h)) return "#202033";
    var r = parseInt(h.slice(0, 2), 16),
      g = parseInt(h.slice(2, 4), 16),
      b = parseInt(h.slice(4, 6), 16);
    var luminance = (r * 299 + g * 587 + b * 114) / 1000;
    if (luminance < 90) return raw;
    // In dark mode preserve the selected hue, but blend light worklet colors
    // into the app's dark surface so titles, values and graphs keep contrast.
    var mix = 0.15, baseR = 24, baseG = 24, baseB = 36;
    var rr = Math.round(r * mix + baseR * (1 - mix));
    var gg = Math.round(g * mix + baseG * (1 - mix));
    var bb = Math.round(b * mix + baseB * (1 - mix));
    function hx(v) { return Math.max(0, Math.min(255, v)).toString(16).padStart(2, "0"); }
    return "#" + hx(rr) + hx(gg) + hx(bb);
  }
  function isHomeNavButton(type) {
    return String(type || "").indexOf("button_") === 0;
  }
  function maskHomeCardNumber(n) {
    var clean = String(n || "").replace(/\D/g, "");
    if (!clean) return "—";
    if (clean.length <= 4) return clean;
    return "•••• •••• •••• " + clean.slice(-4);
  }
  function maskHomeIban(v) {
    var s = String(v || "")
      .replace(/\s+/g, "")
      .toUpperCase();
    if (!s) return "—";
    return s.length > 8 ? s.slice(0, 4) + " •••• " + s.slice(-4) : s;
  }
  function textOnBg(hex) {
    var h = String(hex || "#FFFFFF").replace("#", "");
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    var r = parseInt(h.slice(0, 2), 16) || 255,
      g = parseInt(h.slice(2, 4), 16) || 255,
      b = parseInt(h.slice(4, 6), 16) || 255;
    return (r * 299 + g * 587 + b * 114) / 1000 < 145 ? "#FFFFFF" : "#222222";
  }
  function defaultParams(type) {
    return (
      {
        quick_actions: { showTitle: false },
        summary: { showTitle: false },
        distribution_expenses: { range: 6 },
        income_vs_expense: { range: 6 },
        monthly_balance: { range: 6 },
        latest_expenses: { count: 5 },
        latest_incomes: { count: 5 },
        share_recent: {
          count: 5,
          projectId:
            (shareProjects && shareProjects[0] && shareProjects[0].id) || "",
        },
        share_balance: {
          projectId:
            (shareProjects && shareProjects[0] && shareProjects[0].id) || "",
        },
        planned_saving: { range: 12 },
        fidelity_card: {
          cardId:
            (shoppingCards && shoppingCards[0] && shoppingCards[0].id) || "",
        },
        goal: { goalId: (goals && goals[0] && goals[0].id) || "" },
        expenses_by_area: { range: 12 },
        expenses_by_category: { range: 12 },
        incomes_by_type: { range: 12 },
        budget_overview: { range: 12 },
        budget_by_category: { range: 12 },
        savings_progress: { range: 12 },
        upcoming_scheduled_expenses: { showTitle: true },
        note_widget: {
          noteId: (appuntiNotes && appuntiNotes[0] && appuntiNotes[0].id) || "",
        },
        bank_coord_widget: {
          bankId: (bankCoords && bankCoords[0] && bankCoords[0].id) || "",
        },
        credit_card_widget: {
          creditCardId:
            (creditCards && creditCards[0] && creditCards[0].id) || "",
        },
        shopping_list_widget: {
          listId:
            homeActiveShoppingListId ||
            (homeShoppingLists &&
              homeShoppingLists[0] &&
              homeShoppingLists[0].id) ||
            "main",
        },
        assistant_voice_widget: { showTitle: true },
        button_voice: {},
        button_receipt: {},
        button_settings: {},
        button_share: {},
        button_ai_advice: {},
        button_ai_chat: {},
        button_stats: {},
        button_patrimonio: {},
        button_budget: {},
        button_shopping: {},
        button_goals: {},
        button_alerts: {},
        button_appunti: {},
      }[type] || {}
    );
  }
  function defaultSize(type) {
    if (type === "assistant_voice_widget") return "1x1";
    if (isHomeNavButton(type)) return "1x";
    return ["monthly_balance", "savings_progress"].indexOf(type) >= 0
      ? "2x"
      : "1x";
  }
  function makeWorklet(type) {
    return {
      id:
        "home_" +
        type +
        "_" +
        Date.now() +
        "_" +
        Math.floor(Math.random() * 1000),
      type: type,
      size: defaultSize(type),
      color: HOME_COLORS[(activeWorklets.length + 1) % HOME_COLORS.length],
      params: { showTitle: true, customTitle: "", ...defaultParams(type) },
    };
  }
  function normalizeWorkletSize(type, size) {
    var raw = String(size || "");
    if (type === "assistant_voice_widget")
      return ["1x1", "1x2", "2x1", "2x2"].indexOf(raw) >= 0 ? raw : "1x1";
    return raw === "0.5x" ? "0.5x" : raw === "1x" ? "1x" : "2x";
  }
  function normalizeWorklets(list, allowDefault) {
    var arr = Array.isArray(list) ? list : [];
    if (!arr.length && allowDefault) arr = HOME_DEFAULT_WORKLETS;
    var seen: any = {};
    return arr
      .map(function (w) {
        var raw = String((w && w.type) || "");
        var canonical =
          raw === "button_ai"
            ? "button_ai_advice"
            : [
                "assistant_voice",
                "voice_assistant",
                "voice_assistant_widget",
                "assistant_widget",
              ].indexOf(raw) >= 0
            ? "assistant_voice_widget"
            : raw;
        return { ...(w || {}), type: canonical };
      })
      .filter(function (w) {
        return (
          w && WORKLET_LABELS[w.type] && !seen[w.type] && (seen[w.type] = true)
        );
      })
      .map(function (w, i) {
        var p = w.params || {};
        return {
          ...w,
          id: w.id || "home_w_" + i + "_" + w.type,
          size: normalizeWorkletSize(w.type, w.size),
          color: w.color || "#FFFFFF",
          params: {
            showTitle: p.showTitle !== false,
            ...defaultParams(w.type),
            ...p,
            customTitle: cleanHomeWorkletTitle(String(p.customTitle || "")),
          },
        };
      });
  }
  function saveWorklets(arr, msg) {
    if (setHomeWorklets) setHomeWorklets(arr);
  }
  function sanitizeWorkletParams(type, params) {
    var p = { ...(params || {}) };
    p.showTitle = p.showTitle !== false;
    p.customTitle = cleanHomeWorkletTitle(String(p.customTitle || ""));
    if (p.countInput !== undefined) delete p.countInput;
    if (
      ["latest_expenses", "latest_incomes", "share_recent"].indexOf(type) >= 0
    ) {
      p.count = Math.max(1, Math.min(20, Number(p.count) || 5));
    }
    return p;
  }
  function startHomeEdit() {
    if (!premiumHome) {
      if (setToast)
        setToast({
          text: L(
            "La Home personalizzata è disponibile solo nel piano Completo."
          ),
          type: "warning",
          icon: "🔒",
          color: "#FFF8E1",
          textColor: "#856404",
        });
      setTab("settings");
      setSettingsPage("plans_settings");
      return;
    }
    setHomeEditMode(true);
  }
  function emptyBox(text) {
    return (
      <div
        style={{
          fontSize: 13,
          color: subC,
          textAlign: "center",
          padding: "18px 0",
        }}
      >
        {L(text)}
      </div>
    );
  }
  function listMovement(items, isExp, compact) {
    var sorted = (items || []).slice().sort(function (a, b) {
      return String(b.date || "").localeCompare(String(a.date || ""));
    });
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          minWidth: 0,
        }}
      >
        {(!sorted || !sorted.length) &&
          emptyBox(isExp ? "Nessuna spesa" : "Nessuna entrata")}
        {sorted.map(function (e) {
          var c = isExp ? (getCat ? getCat(e.catId) : null) : null;
          var it = !isExp ? (getIT ? getIT(e.type) : null) : null;
          return (
            <div
              key={e.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: compact ? 5 : 8,
                padding: compact ? "6px 0" : "7px 0",
                borderBottom: "1px solid " + borderC,
                minWidth: 0,
              }}
            >
              <span style={{ flexShrink: 0, display: "inline-flex" }}>
                <FainanceIcon
                  value={isExp ? (c ? c.icon : "📦") : it ? it.icon : "💰"}
                  size={compact ? 16 : 19}
                />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: compact ? 12 : 13,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    color: textC,
                    fontWeight: compact ? 750 : undefined,
                  }}
                >
                  {e.desc || (c ? c.name : it ? it.name : "") || "-"}
                </div>
                <div
                  style={{
                    fontSize: compact ? 10 : 11,
                    color: subC,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmtDate(e.date, dateFmt)}
                </div>
              </div>
              <div
                style={{
                  textAlign: "right",
                  flexShrink: 0,
                  maxWidth: compact ? 76 : 132,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    fontSize: compact ? 12 : 13,
                    fontWeight: 700,
                    color: isExp ? expenseColor : incomeColor,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {fmt(safeNum(e.amount))}
                </div>
                {!compact && secRate && fmtSec && (
                  <div
                    style={{
                      fontSize: 10,
                      color: subC,
                      lineHeight: 1.15,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {fmtSec(safeNum(e.amount))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }
  function legendChart(data, compact, doubleSize) {
    var total = (data || []).reduce(function (a, d) {
      return a + safeNum(d.value);
    }, 0);
    if (!total) return emptyBox("Nessun dato disponibile");
    if (compact) {
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "center",
            minWidth: 0,
          }}
        >
          <DonutChart data={data.slice(0, 5)} size={78} />
          <div style={{ width: "100%", minWidth: 0 }}>
            {data.slice(0, 4).map(function (d, i) {
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    marginBottom: 4,
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: d.color,
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontSize: 10,
                      flex: 1,
                      color: subC,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return (
      <div
        style={{ display: "flex", gap: 14, alignItems: "center", minWidth: 0 }}
      >
        <DonutChart data={data.slice(0, 7)} size={doubleSize ? 142 : 104} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {data.slice(0, 7).map(function (d, i) {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 5,
                  minWidth: 0,
                }}
              >
                <div
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: d.color,
                    flexShrink: 0,
                  }}
                />
                <span
                  style={{
                    fontSize: 11,
                    flex: 1,
                    color: subC,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {d.label}
                </span>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: textC,
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmt(d.value)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  function budgetNumbers(range) {
    var keys = lastMonthKeys(range || 12);
    var items =
      budgetPlan && Array.isArray(budgetPlan.items) ? budgetPlan.items : [];
    var plannedMonthly = items.reduce(function (a, i) {
      return a + safeNum(i.amount);
    }, 0);
    var incomeMonthly = safeNum(
      budgetPlan && budgetPlan.manualIncome != null
        ? budgetPlan.manualIncome
        : budgetPlan && budgetPlan.income
    );
    var factor = Math.max(1, keys.length);
    var planned = plannedMonthly * factor;
    var income = incomeMonthly * factor;
    var saving = Math.max(0, income - planned);
    var spent = totalInKeys(expenses, keys);
    var real = totalInKeys(incomes, keys) - spent;
    return {
      items: items,
      keys: keys,
      planned: planned,
      income: income,
      saving: saving,
      spent: spent,
      real: real,
      diff: real - saving,
    };
  }
  function selectedShareProject(w) {
    var id = w.params && w.params.projectId;
    return (
      (shareProjects || []).find(function (p) {
        return String(p.id) === String(id);
      }) || (shareProjects || [])[0]
    );
  }
  function selectedGoal(w) {
    var id = w.params && w.params.goalId;
    return (
      (goals || []).find(function (g) {
        return String(g.id) === String(id);
      }) || (goals || [])[0]
    );
  }
  function selectedCard(w) {
    var id = w.params && w.params.cardId;
    return (
      (shoppingCards || []).find(function (c) {
        return String(c.id) === String(id);
      }) || (shoppingCards || [])[0]
    );
  }
  function selectedNote(w) {
    var id = w.params && w.params.noteId;
    return (
      (appuntiNotes || []).find(function (n) {
        return String(n.id) === String(id);
      }) || (appuntiNotes || [])[0]
    );
  }
  function safeHomeNoteHtml(value) {
    return String(value || "")
      .replace(
        /<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*>[\s\S]*?<\/\s*\1\s*>/gi,
        ""
      )
      .replace(
        /<\s*(script|style|iframe|object|embed|link|meta)\b[^>]*\/?>/gi,
        ""
      )
      .replace(/\son[a-z]+\s*=\s*(["']).*?\1/gi, "")
      .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, "")
      .replace(/javascript\s*:/gi, "");
  }
  function selectedBank(w) {
    var id = w.params && w.params.bankId;
    return (
      (bankCoords || []).find(function (b) {
        return String(b.id) === String(id);
      }) || (bankCoords || [])[0]
    );
  }
  function selectedCreditCard(w) {
    var id = w.params && w.params.creditCardId;
    return (
      (creditCards || []).find(function (c) {
        return String(c.id) === String(id);
      }) || (creditCards || [])[0]
    );
  }
  function selectedShoppingList(w) {
    var lists =
      homeShoppingLists && homeShoppingLists.length
        ? homeShoppingLists
        : [{ id: "main", title: "Lista principale", icon: "🧺" }];
    var id =
      (w.params && w.params.listId) || homeActiveShoppingListId || "main";
    return (
      lists.find(function (l) {
        return String(l.id) === String(id);
      }) || lists[0]
    );
  }
  function shoppingItemsForList(list) {
    var id = list ? list.id : "main";
    return (shoppingItems || [])
      .filter(function (x) {
        return !x.archived && String(x.listId || "main") === String(id);
      })
      .slice()
      .sort(function (a, b) {
        if (!!a.bought !== !!b.bought) return a.bought ? 1 : -1;
        return (a.order || 0) - (b.order || 0);
      });
  }
  function shareBalance(p) {
    if (!p) return 0;
    var me = String(
      (ctx.currentUser && ctx.currentUser.email) || ctx.userId || ""
    ).toLowerCase();
    return (p.activities || []).reduce(function (a, x) {
      var amt = safeNum(x.amount);
      var paid = String(x.paidBy || "").toLowerCase();
      var shares = x.shares || {};
      var myShare = safeNum(
        shares[me] !== undefined ? shares[me] : shares[ctx.userId]
      );
      return a + (paid === me ? amt : 0) - myShare;
    }, 0);
  }
  function homeEan13CheckDigit(first12) {
    var sum = 0;
    String(first12 || "")
      .slice(0, 12)
      .split("")
      .forEach(function (ch, i) {
        sum += (Number(ch) || 0) * (i % 2 === 0 ? 1 : 3);
      });
    return String((10 - (sum % 10)) % 10);
  }
  function homeEncodeEan13Bits(raw) {
    var code = String(raw || "").replace(/\D/g, "");
    if (code.length === 12) code += homeEan13CheckDigit(code);
    if (code.length !== 13) return "";
    var Lp = [
      "0001101",
      "0011001",
      "0010011",
      "0111101",
      "0100011",
      "0110001",
      "0101111",
      "0111011",
      "0110111",
      "0001011",
    ];
    var Gp = [
      "0100111",
      "0110011",
      "0011011",
      "0100001",
      "0011101",
      "0111001",
      "0000101",
      "0010001",
      "0001001",
      "0010111",
    ];
    var Rp = [
      "1110010",
      "1100110",
      "1101100",
      "1000010",
      "1011100",
      "1001110",
      "1010000",
      "1000100",
      "1001000",
      "1110100",
    ];
    var parity = [
      "LLLLLL",
      "LLGLGG",
      "LLGGLG",
      "LLGGGL",
      "LGLLGG",
      "LGGLLG",
      "LGGGLL",
      "LGLGLG",
      "LGLGGL",
      "LGGLGL",
    ][Number(code[0]) || 0];
    var bits = "101";
    for (var i = 1; i <= 6; i++) {
      var d = Number(code[i]) || 0;
      bits += parity[i - 1] === "L" ? Lp[d] : Gp[d];
    }
    bits += "01010";
    for (var j = 7; j <= 12; j++) {
      bits += Rp[Number(code[j]) || 0];
    }
    bits += "101";
    return bits;
  }
  function homeCode128Bits(raw) {
    var value = String(raw || "")
      .trim()
      .replace(/[^ -~]/g, "");
    if (!value) return "";
    var patterns = [
      "212222",
      "222122",
      "222221",
      "121223",
      "121322",
      "131222",
      "122213",
      "122312",
      "132212",
      "221213",
      "221312",
      "231212",
      "112232",
      "122132",
      "122231",
      "113222",
      "123122",
      "123221",
      "223211",
      "221132",
      "221231",
      "213212",
      "223112",
      "312131",
      "311222",
      "321122",
      "321221",
      "312212",
      "322112",
      "322211",
      "212123",
      "212321",
      "232121",
      "111323",
      "131123",
      "131321",
      "112313",
      "132113",
      "132311",
      "211313",
      "231113",
      "231311",
      "112133",
      "112331",
      "132131",
      "113123",
      "113321",
      "133121",
      "313121",
      "211331",
      "231131",
      "213113",
      "213311",
      "213131",
      "311123",
      "311321",
      "331121",
      "312113",
      "312311",
      "332111",
      "314111",
      "221411",
      "431111",
      "111224",
      "111422",
      "121124",
      "121421",
      "141122",
      "141221",
      "112214",
      "112412",
      "122114",
      "122411",
      "142112",
      "142211",
      "241211",
      "221114",
      "413111",
      "241112",
      "134111",
      "111242",
      "121142",
      "121241",
      "114212",
      "124112",
      "124211",
      "411212",
      "421112",
      "421211",
      "212141",
      "214121",
      "412121",
      "111143",
      "111341",
      "131141",
      "114113",
      "114311",
      "411113",
      "411311",
      "113141",
      "114131",
      "311141",
      "411131",
      "211412",
      "211214",
      "211232",
      "2331112",
    ];
    var vals = [];
    if (/^\d{2,}$/.test(value)) {
      if (value.length % 2 === 0) {
        vals = [105];
        for (var i = 0; i < value.length; i += 2)
          vals.push(Number(value.slice(i, i + 2)));
      } else {
        vals = [104, Math.max(0, Math.min(94, value.charCodeAt(0) - 32)), 99];
        for (var j = 1; j < value.length; j += 2)
          vals.push(Number(value.slice(j, j + 2)));
      }
    } else {
      vals = [104];
      for (var k = 0; k < value.length; k++) {
        var code = value.charCodeAt(k);
        vals.push(Math.max(0, Math.min(94, code - 32)));
      }
    }
    var checksum = vals[0];
    for (var n = 1; n < vals.length; n++) checksum += vals[n] * n;
    vals.push(checksum % 103);
    vals.push(106);
    var bits = "";
    vals.forEach(function (v) {
      var pat = patterns[v] || patterns[0];
      for (var x = 0; x < pat.length; x++) {
        bits += (x % 2 === 0 ? "1" : "0").repeat(Number(pat[x]) || 1);
      }
    });
    return bits;
  }
  function homeBarcodeBars(code) {
    var raw = String(code || "")
      .replace(/[^0-9A-Za-z \.\-_$%\/+]/g, "")
      .trim();
    var bits = homeCode128Bits(raw);
    if (!bits) {
      var clean = String(code || "").replace(/\D/g, "");
      bits = homeEncodeEan13Bits(clean);
    }
    if (!bits) return [];
    bits = "0000000000" + bits + "0000000000";
    return bits.split("").map(function (x) {
      return { on: x === "1" };
    });
  }
  function homeQrCells(code) {
    var seed = String(code || "");
    var cells = [];
    for (var y = 0; y < 17; y++) {
      for (var x = 0; x < 17; x++) {
        var finder = (x < 5 && y < 5) || (x > 11 && y < 5) || (x < 5 && y > 11);
        var v = finder
          ? x === 0 ||
            x === 4 ||
            y === 0 ||
            y === 4 ||
            (x > 1 && x < 3 && y > 1 && y < 3)
          : (x * 7 +
              y * 11 +
              seed.charCodeAt((x + y) % Math.max(seed.length, 1))) %
              5 <
            2;
        cells.push({ on: v });
      }
    }
    return cells;
  }
  function homeCardCodePreview(c) {
    var type = (c && c.codeType) || "barcode";
    if (type === "qr") {
      var cells = homeQrCells(c && c.code);
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(17,1fr)",
            gap: 1,
            width: "min(160px,100%)",
            aspectRatio: "1 / 1",
            margin: "10px auto 0",
            background: "#fff",
            padding: 10,
            borderRadius: 12,
            boxSizing: "border-box",
          }}
        >
          {cells.map(function (cell, i) {
            return (
              <div key={i} style={{ background: cell.on ? "#111" : "#fff" }} />
            );
          })}
        </div>
      );
    }
    var bars = homeBarcodeBars(c && c.code);
    return (
      <div
        style={{
          marginTop: 12,
          background: "#fff",
          borderRadius: 12,
          padding: "12px 10px 8px",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "stretch",
            height: 68,
            gap: 0,
            width: "100%",
            justifyContent: "center",
          }}
        >
          {bars.map(function (b, i) {
            return (
              <div
                key={i}
                style={{
                  background: b.on ? "#050505" : "transparent",
                  height: "100%",
                  flex: "1 1 0",
                  minWidth: 0,
                }}
              />
            );
          })}
        </div>
        <div
          style={{
            color: "#111827",
            textAlign: "center",
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1.2,
            marginTop: 6,
            wordBreak: "break-all",
          }}
        >
          {String((c && c.code) || "")}
        </div>
      </div>
    );
  }
  function homeButtonDef(type) {
    var map: any = {
      button_voice:
        currentPlan === "base" || currentPlan === "premium"
          ? {
              icon: "ai",
              label: assistantVoiceUiText(lang || "it").title,
              tab: "consulenteAI",
              aiTab: "chat",
            }
          : { icon: "🎙️", label: "Voce", tab: "voice" },
      button_receipt: { icon: "📷", label: "Scontrino", tab: "receipt" },
      button_settings: { icon: "⚙", label: "Impostazioni", tab: "settings" },
      button_share: { icon: "🤝", label: "Share", tab: "share" },
      button_ai_advice: {
        icon: "ai",
        label: "Consigli AI",
        tab: "consulenteAI",
        aiTab: "consigli",
      },
      button_ai_chat: {
        icon: "💬",
        label: "Conversa con l'Assistente",
        tab: "consulenteAI",
        aiTab: "chat",
      },
      button_ai: {
        icon: "ai",
        label: "Consigli AI",
        tab: "consulenteAI",
        aiTab: "consigli",
      },
      button_stats: { icon: "📊", label: "Statistiche", tab: "stats" },
      button_patrimonio: { icon: "💎", label: "Patrimonio", tab: "patrimonio" },
      button_budget: { icon: "💰", label: "Budget", tab: "budget" },
      button_shopping: { icon: "🛒", label: "Spesa", tab: "shopping" },
      button_goals: { icon: "🎯", label: "Obiettivi", tab: "goals" },
      button_alerts: { icon: "🔔", label: "Alert", tab: "alerts" },
      button_appunti: { icon: "🗂", label: "Appunti", tab: "appunti" },
    };
    return map[type] || { icon: "🧩", label: type, tab: "home" };
  }
  function homeScrollTop() {
    function run() {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
        var nodes = document.querySelectorAll("div");
        for (var i = 0; i < nodes.length; i++) {
          var el: any = nodes[i];
          var st = getComputedStyle(el);
          if (
            (st.overflowY === "auto" || st.overflowY === "scroll") &&
            el.scrollHeight > el.clientHeight
          ) {
            el.scrollTop = 0;
          }
        }
      } catch (_e) {}
    }
    [0, 80, 220, 500].forEach(function (ms) {
      setTimeout(run, ms);
    });
  }
  function openHomeButton(type) {
    var d = homeButtonDef(type);
    if (d.tab === "voice") {
      if (openVoiceModal) openVoiceModal();
      else {
        if (setVoiceText) setVoiceText("");
        if (setVoiceParsed) setVoiceParsed(null);
        if (setVoiceError) setVoiceError("");
        if (setVoiceListening) setVoiceListening(false);
        if (setVoiceModal) setVoiceModal(true);
      }
      homeScrollTop();
      return;
    }
    if (d.tab === "receipt") {
      var aiReceiptAllowed =
        currentPlan === "base" || currentPlan === "premium";
      if (aiReceiptAllowed && openVoiceModal) {
        openVoiceModal(false, true, "receipt");
        homeScrollTop();
        return;
      }
      setTab("spese");
      setSpeseSubTab("add");
      setAddType("expense");
      setAddSubTab("receipt");
      homeScrollTop();
      return;
    }
    setTab(d.tab);
    if (d.tab === "settings" && setSettingsPage) setSettingsPage(null);
    if (d.tab === "consulenteAI" && setAiTab) {
      if (d.aiTab === "chat") {
        setAiTab("chat");
        if (openVoiceModal) openVoiceModal(true, true);
        homeScrollTop();
        return;
      }
      setAiTab(d.aiTab || "consigli");
      if (d.aiTab === "consigli" && setAiAdviceFilter) setAiAdviceFilter("all");
    }
    homeScrollTop();
  }
  function homeButtonIcon(type, sz) {
    var d = homeButtonDef(type);
    if (d.icon === "ai") return <AIGrilloIcon size={sz || 28} />;
    return <span style={{ fontSize: sz || 28, lineHeight: 1 }}>{d.icon}</span>;
  }
  function homeTitleText(w) {
    var custom = w && w.params
      ? cleanHomeWorkletTitle(String(w.params.customTitle || ""))
      : "";
    return cleanHomeWorkletTitle(custom || lib(w.type).label || w.type);
  }
  function homeShowTitle(w) {
    return !(w && w.params && w.params.showTitle === false);
  }
  function draftCountKey(d) {
    return String((d && d.id) || (d && d.type) || "home_count");
  }
  function draftTitleKey(d) {
    return String((d && d.id) || (d && d.type) || "home_title") + "_title";
  }
  function toggleHomeShoppingItem(id) {
    if (!setShoppingItems) return;
    setShoppingItems(function (list) {
      return (list || []).map(function (x) {
        return String(x.id) === String(id)
          ? {
              ...x,
              bought: !x.bought,
              boughtAt: !x.bought ? new Date().toISOString() : "",
              updatedAt: new Date().toISOString(),
            }
          : x;
      });
    });
  }
  function renderWorklet(w) {
    var range = Number((w.params && w.params.range) || 12);
    var keys = lastMonthKeys(range);
    var compact = String(w.size || "") === "0.5x";
    var doubleSize = String(w.size || "") === "2x";
    if (w.type === "assistant_voice_widget") {
      var av = assistantVoiceUiText(lang || "it");
      var avSize = String(w.size || "1x1"),
        avTall = avSize === "1x2" || avSize === "2x2",
        avWide = avSize === "2x1" || avSize === "2x2";
      return (
        <button
          type="button"
          onClick={function () {
            if (openVoiceModal) openVoiceModal();
            else if (setVoiceModal) setVoiceModal(true);
          }}
          style={{
            width: "100%",
            height: "100%",
            minHeight: avTall ? 172 : 78,
            border: "none",
            borderRadius: 14,
            background:
              "linear-gradient(135deg,rgba(127,119,221,.18),rgba(55,138,221,.13))",
            color: textC,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: avWide ? 16 : 8,
            flexDirection: avWide ? "row" : "column",
            padding: avTall ? 16 : 10,
            cursor: "pointer",
            textAlign: avWide ? "left" : "center",
            overflow: "hidden",
          }}
        >
          <AIGrilloIcon size={avTall ? (avWide ? 84 : 76) : avWide ? 58 : 46} />
          <div style={{ minWidth: 0, maxWidth: avWide ? 280 : "100%" }}>
            {homeShowTitle(w) && (
              <div
                style={{
                  fontSize: avTall ? 17 : 14,
                  fontWeight: 950,
                  color: textC,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {homeTitleText(w)}
              </div>
            )}
            <div
              style={{
                fontSize: avTall ? 12 : 10,
                color: subC,
                lineHeight: 1.35,
                marginTop: homeShowTitle(w) ? 4 : 0,
                display: "-webkit-box",
                WebkitLineClamp: avTall ? 3 : 1,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {av.sub}
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                marginTop: avTall ? 10 : 5,
                padding: avTall ? "7px 10px" : "4px 8px",
                borderRadius: 999,
                background: "#7F77DD",
                color: "#fff",
                fontSize: avTall ? 12 : 10,
                fontWeight: 900,
              }}
            >
              🎙️ {av.speak}
            </div>
          </div>
        </button>
      );
    }
    if (isHomeNavButton(w.type)) {
      var bd = homeButtonDef(w.type);
      var showLabel = homeShowTitle(w);
      var lbl = homeTitleText(w);
      return (
        <button
          type="button"
          onClick={function () {
            openHomeButton(w.type);
          }}
          style={{
            width: "100%",
            height: doubleSize ? "100%" : undefined,
            minHeight: doubleSize ? 88 : 56,
            border: "none",
            borderRadius: 14,
            background: secondaryC,
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: compact ? 4 : 8,
            flexDirection: compact ? "column" : "row",
            fontSize: compact ? 10 : 13,
            fontWeight: 950,
            cursor: "pointer",
            boxShadow: dark ? "none" : "0 8px 18px rgba(0,0,0,.12)",
            padding: compact ? "8px 4px" : "10px 10px",
            textAlign: "center",
            lineHeight: 1.12,
            overflow: "hidden",
          }}
        >
          {homeButtonIcon(w.type, compact ? 22 : 28)}
          {showLabel && (
            <span
              style={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: compact ? 2 : 1,
                WebkitBoxOrient: "vertical",
              }}
            >
              {lbl}
            </span>
          )}
        </button>
      );
    }
    if (w.type === "quick_actions")
      return (
        <div
          style={{
            display: "flex",
            gap: compact ? 8 : 10,
            flexDirection: compact ? "column" : "row",
            flexWrap: "wrap",
            height: doubleSize ? "100%" : undefined,
            alignItems: doubleSize ? "stretch" : undefined,
          }}
        >
          <Btn
            onClick={function () {
              setTab("spese");
              setSpeseSubTab("add");
              setAddType("expense");
              setAddSubTab("single");
            }}
            bg={expenseColor}
            style={{
              flex: 1,
              minWidth: compact ? 0 : 130,
              padding: compact ? "10px 8px" : "12px 16px",
              minHeight: doubleSize ? 72 : undefined,
              fontWeight: 900,
              fontSize: compact ? 12 : undefined,
            }}
          >
            − {L(t.expense || "Uscita")}
          </Btn>
          <Btn
            onClick={function () {
              setTab("spese");
              setSpeseSubTab("add");
              setAddType("income");
              setAddSubTab("single");
            }}
            bg={incomeColor}
            style={{
              flex: 1,
              minWidth: compact ? 0 : 130,
              padding: compact ? "10px 8px" : "12px 16px",
              minHeight: doubleSize ? 72 : undefined,
              fontWeight: 900,
              fontSize: compact ? 12 : undefined,
            }}
          >
            + {L(t.income || "Entrata")}
          </Btn>
        </div>
      );
    if (w.type === "summary") {
      var secBal = fmtSec && fmtSec(curMonthInc - curMonthExp);
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: compact
              ? "1fr"
              : isMobile
              ? "1fr 1fr"
              : "repeat(4,1fr)",
            gap: compact ? 8 : 12,
          }}
        >
          <StatCard
            title={L("Uscite mese")}
            value={fmt(curMonthExp)}
            color={expenseColor}
            bg={expenseColor + "22"}
            sub={
              (fmtSec &&
                fmtSec(curMonthExp) &&
                (secRateLoading ? "..." : fmtSec(curMonthExp))) ||
              undefined
            }
          />
          <StatCard
            title={L("Entrate mese")}
            value={fmt(curMonthInc)}
            color={incomeColor}
            bg={incomeColor + "22"}
            sub={
              (fmtSec &&
                fmtSec(curMonthInc) &&
                (secRateLoading ? "..." : fmtSec(curMonthInc))) ||
              undefined
            }
          />
          <StatCard
            title={L("Saldo mese")}
            value={fmt(curMonthInc - curMonthExp)}
            color="#378ADD"
            bg="#e8f4ff"
            sub={(secBal && (secRateLoading ? "..." : secBal)) || undefined}
          />
          <StatCard
            title={L("Saldo ultimi 12 mesi")}
            value={fmt(last12Balance)}
            color={BALANCE_COLOR}
            bg="#e8f4ff"
            sub={
              (fmtSec &&
                fmtSec(last12Balance) &&
                (secRateLoading ? "..." : fmtSec(last12Balance))) ||
              undefined
            }
          />
        </div>
      );
    }
    if (w.type === "distribution_expenses") {
      var distributionData = sumBy(
        expenses,
        keys,
        function (e) {
          var g = groupForExpense(e);
          var c = getCat ? getCat(e.catId) : null;
          return String(g.id) === "altro" && c ? "cat:" + String(c.id) : "group:" + String(g.id);
        },
        function (e) {
          var g = groupForExpense(e);
          var c = getCat ? getCat(e.catId) : null;
          if (String(g.id) === "altro" && c)
            return (c.icon ? iconTextForInline(c.icon) + " " : "") + (c.name || L("Altro"));
          return (g.icon ? iconTextForInline(g.icon) + " " : "") + (g.name || L("Altro"));
        },
        function (e) {
          var g = groupForExpense(e);
          var c = getCat ? getCat(e.catId) : null;
          return (String(g.id) === "altro" && c && c.color) || g.color || expenseColor;
        }
      );
      return legendChart(distributionData, compact, doubleSize);
    }
    if (w.type === "expenses_by_area") {
      var data = sumBy(
        expenses,
        keys,
        function (e) {
          return groupForExpense(e).id;
        },
        function (e) {
          var g = groupForExpense(e);
          return (
            (g.icon ? iconTextForInline(g.icon) + " " : "") +
            (g.name || "Altro")
          );
        },
        function (e) {
          return groupForExpense(e).color || expenseColor;
        }
      );
      return legendChart(data, compact, doubleSize);
    }
    if (w.type === "expenses_by_category") {
      var data2 = sumBy(
        expenses,
        keys,
        function (e) {
          return e.catId || "altro";
        },
        function (e) {
          var c = getCat ? getCat(e.catId) : null;
          return (
            (c && c.icon ? iconTextForInline(c.icon) + " " : "") +
            (c && c.name ? c.name : L("Altro"))
          );
        },
        function (e) {
          var c = getCat ? getCat(e.catId) : null;
          return (c && c.color) || expenseColor;
        }
      );
      return legendChart(data2, compact, doubleSize);
    }
    if (w.type === "incomes_by_type") {
      var data3 = sumBy(
        incomes,
        keys,
        function (e) {
          return e.type || "other";
        },
        function (e) {
          var it = getIT ? getIT(e.type) : null;
          return (
            (it && it.icon ? iconTextForInline(it.icon) + " " : "") +
            (it && it.name ? it.name : L("Altro"))
          );
        },
        function (e) {
          var it = getIT ? getIT(e.type) : null;
          return (it && it.color) || incomeColor;
        }
      );
      return legendChart(data3, compact, doubleSize);
    }
    if (w.type === "income_vs_expense")
      return (
        <div style={{ overflow: "hidden", width: "100%" }}>
          <BarChart
            data={monthlyChart(range)}
            width={compact ? 150 : isMobile ? 420 : 640}
            height={compact ? 132 : doubleSize ? 300 : 170}
          />
        </div>
      );
    if (w.type === "monthly_balance")
      return (
        <div style={{ overflow: "hidden", width: "100%" }}>
          <LineChart
            data={monthlyChart(range).map(function (m) {
              return { label: m.label, value: m.value };
            })}
            width={compact ? 150 : isMobile ? 360 : 560}
            height={compact ? 128 : doubleSize ? 300 : 170}
            color={BALANCE_COLOR}
          />
        </div>
      );
    if (w.type === "upcoming_scheduled_expenses") {
      var nextRows = upcomingScheduledExpenses().slice(
        0,
        doubleSize ? 10 : compact ? 3 : 5
      );
      var maxUpcomingH = doubleSize ? 300 : compact ? 112 : 154;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            height: "100%",
          }}
        >
          {!nextRows.length && emptyBox("Nessuna spesa programmata in arrivo")}
          <div
            style={{
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              paddingRight: 2,
              maxHeight: maxUpcomingH,
            }}
          >
            {nextRows.map(function (row, i) {
              var r = row.item || {};
              var cat = getCat ? getCat(r.catId) : null;
              return (
                <div
                  key={String(r.id || i) + "_" + row.date.getTime()}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: compact ? 6 : 8,
                    padding: compact ? "6px 0" : "7px 0",
                    borderBottom: "1px solid " + borderC,
                    minWidth: 0,
                  }}
                >
                  <span style={{ flexShrink: 0, display: "inline-flex" }}>
                    <FainanceIcon
                      value={r.icon || (cat && cat.icon) || "💸"}
                      size={compact ? 17 : 20}
                    />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: compact ? 11 : 13,
                        fontWeight: 850,
                        color: textC,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.name || (cat && cat.name) || L("Spesa programmata")}
                    </div>
                    <div
                      style={{
                        fontSize: compact ? 9 : 11,
                        color: subC,
                        whiteSpace: "nowrap",
                      }}
                    >
                      🗓️ {recurringDateLabel(row.date)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: compact ? 11 : 13,
                      fontWeight: 900,
                      color: expenseColor,
                      whiteSpace: "nowrap",
                      flexShrink: 0,
                    }}
                  >
                    {fmt(safeNum(r.amount))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (w.type === "latest_expenses") {
      var n = Math.max(1, Number(w.params && w.params.count) || 5);
      return listMovement((expenses || []).slice(0, n), true, compact);
    }
    if (w.type === "latest_incomes") {
      var n2 = Math.max(1, Number(w.params && w.params.count) || 5);
      return listMovement((incomes || []).slice(0, n2), false, compact);
    }
    if (w.type === "share_recent") {
      var p = selectedShareProject(w);
      var acts = p
        ? (p.activities || [])
            .slice()
            .sort(function (a, b) {
              return String(b.date || "").localeCompare(String(a.date || ""));
            })
            .slice(0, Math.max(1, Number(w.params && w.params.count) || 5))
        : [];
      var maxH = doubleSize ? 260 : compact ? 112 : 118;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            minWidth: 0,
            height: "100%",
          }}
        >
          {!p && emptyBox("Nessun progetto Share")}
          {p && (
            <div
              style={{
                fontSize: compact ? 11 : 12,
                color: subC,
                marginBottom: 6,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {p.name}
            </div>
          )}
          <div
            style={{
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              paddingRight: 2,
              maxHeight: maxH,
            }}
          >
            {acts.map(function (a, i) {
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    padding: compact ? "5px 0" : "7px 0",
                    borderBottom: "1px solid " + borderC,
                    minWidth: 0,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: compact ? 12 : 13,
                        color: textC,
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.desc || a.note || L("Transazione")}
                    </div>
                    <div style={{ fontSize: compact ? 10 : 11, color: subC }}>
                      {fmtDate(a.date, dateFmt)}
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: compact ? 12 : 13,
                      fontWeight: 900,
                      color: expenseColor,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {fmt(safeNum(a.amount))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    if (w.type === "share_balance") {
      var sp = selectedShareProject(w);
      var bal = shareBalance(sp);
      return (
        <div>
          {!sp && emptyBox("Nessun progetto Share")}{" "}
          {sp && (
            <>
              <div style={{ fontSize: 13, color: subC, marginBottom: 6 }}>
                {sp.name}
              </div>
              <div
                style={{
                  fontSize: 26,
                  fontWeight: 950,
                  color: bal >= 0 ? incomeColor : expenseColor,
                }}
              >
                {fmt(bal)}
              </div>
              <div style={{ fontSize: 12, color: subC, marginTop: 4 }}>
                {bal >= 0 ? L("Credito stimato") : L("Quota da saldare")}
              </div>
            </>
          )}
        </div>
      );
    }
    if (w.type === "planned_saving") {
      var b = budgetNumbers(range);
      var realPositive = b.real >= 0;
      var diffPositive = b.diff >= 0;
      var plannedBase = Math.abs(Number(b.saving) || 0);
      var realForProgress = Math.max(0, Number(b.real) || 0);
      var savingProgress =
        plannedBase > 0
          ? Math.max(0, Math.min(100, (realForProgress / plannedBase) * 100))
          : realForProgress > 0
          ? 100
          : 0;
      var savingSurface = dark
        ? "rgba(255,255,255,.055)"
        : "rgba(255,255,255,.76)";
      var savingBorder = dark ? "rgba(255,255,255,.10)" : "rgba(15,23,42,.07)";
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: compact ? 8 : 10,
            height: "100%",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,minmax(0,1fr))",
              gap: compact ? 7 : 10,
            }}
          >
            <div
              style={{
                background: savingSurface,
                border: "1px solid " + savingBorder,
                borderRadius: 12,
                padding: compact ? "9px 10px" : "11px 12px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: compact ? 9 : 10,
                  fontWeight: 850,
                  color: subC,
                  lineHeight: 1.15,
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: compact ? 12 : 14 }}>🌱</span>
                <span style={{ minWidth: 0 }}>
                  {L("Risparmio pianificato")}
                </span>
              </div>
              <div
                style={{
                  fontSize: compact ? 15 : 18,
                  fontWeight: 950,
                  color: "#1D9E75",
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {fmt(b.saving)}
              </div>
            </div>
            <div
              style={{
                background: savingSurface,
                border: "1px solid " + savingBorder,
                borderRadius: 12,
                padding: compact ? "9px 10px" : "11px 12px",
                minWidth: 0,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  fontSize: compact ? 9 : 10,
                  fontWeight: 850,
                  color: subC,
                  lineHeight: 1.15,
                  marginBottom: 5,
                }}
              >
                <span style={{ fontSize: compact ? 12 : 14 }}>
                  {realPositive ? "✓" : "!"}
                </span>
                <span style={{ minWidth: 0 }}>{L("Risparmio reale")}</span>
              </div>
              <div
                style={{
                  fontSize: compact ? 15 : 18,
                  fontWeight: 950,
                  color: realPositive ? "#1D9E75" : "#E24B4A",
                  lineHeight: 1.05,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {fmt(b.real)}
              </div>
            </div>
          </div>
          <div
            style={{
              background: savingSurface,
              border: "1px solid " + savingBorder,
              borderRadius: 12,
              padding: compact ? "9px 10px" : "10px 12px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 8,
                marginBottom: 7,
              }}
            >
              <span
                style={{
                  fontSize: compact ? 9 : 10,
                  fontWeight: 850,
                  color: subC,
                }}
              >
                {L("Scostamento")}
              </span>
              <span
                style={{
                  fontSize: compact ? 11 : 12,
                  fontWeight: 950,
                  color: diffPositive ? incomeColor : expenseColor,
                  whiteSpace: "nowrap",
                }}
              >
                {b.diff >= 0 ? "+" : ""}
                {fmt(b.diff)}
              </span>
            </div>
            <div
              style={{
                height: compact ? 6 : 7,
                borderRadius: 999,
                background: dark
                  ? "rgba(255,255,255,.10)"
                  : "rgba(15,23,42,.08)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  height: "100%",
                  width: savingProgress + "%",
                  maxWidth: "100%",
                  borderRadius: 999,
                  background: realPositive
                    ? "linear-gradient(90deg,#1D9E75,#4BC18F)"
                    : "linear-gradient(90deg,#E24B4A,#F29F3D)",
                  transition: "width .25s ease",
                }}
              />
            </div>
          </div>
        </div>
      );
    }
    if (w.type === "budget_overview") {
      var b2 = budgetNumbers(range);
      return (
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}
        >
          <StatCard
            title={L("Risparmio pianificato")}
            value={fmt(b2.saving)}
            color="#1D9E75"
            bg="#E8F8F0"
          />
          <StatCard
            title={L("Risparmio reale")}
            value={fmt(b2.real)}
            color={b2.real >= 0 ? "#1D9E75" : "#E24B4A"}
            bg={b2.real >= 0 ? "#E8F8F0" : "#FFF0F0"}
          />
          <div style={{ gridColumn: "1/-1", fontSize: 12, color: subC }}>
            {L("Scostamento")}:{" "}
            <b style={{ color: b2.diff >= 0 ? incomeColor : expenseColor }}>
              {b2.diff >= 0 ? "+" : ""}
              {fmt(b2.diff)}
            </b>
          </div>
        </div>
      );
    }
    if (w.type === "savings_progress") {
      var rows = monthlyChart(range).map(function (m) {
        return { label: m.label, value: m.value };
      });
      return (
        <div style={{ overflow: "hidden", width: "100%" }}>
          <LineChart
            data={rows}
            width={compact ? 150 : isMobile ? 360 : 560}
            height={compact ? 110 : doubleSize ? 240 : 108}
            color="#1D9E75"
          />
        </div>
      );
    }
    if (w.type === "budget_by_category") {
      var b2 = budgetNumbers(range);
      if (!b2.items.length) return emptyBox("Nessun budget configurato");
      return (
        <div>
          {b2.items.slice(0, 6).map(function (it, i) {
            var c = getCat ? getCat(it.catId) : null;
            var spent = (expenses || []).reduce(function (a, e) {
              return String(e.catId) === String(it.catId)
                ? a +
                    b2.keys.reduce(function (s, k) {
                      return s + safeNum(rateMonth(e, k));
                    }, 0)
                : a;
            }, 0);
            var lim = safeNum(it.amount) * Math.max(1, b2.keys.length);
            var pct = lim > 0 ? Math.min(100, (spent / lim) * 100) : 0;
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 8,
                    fontSize: 12,
                    color: textC,
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                    }}
                  >
                    <FainanceIcon value={(c && c.icon) || "📦"} size={16} />
                    <span>{c ? c.name : L("Categoria")}</span>
                  </span>
                  <b>
                    {fmt(spent)} / {fmt(lim)}
                  </b>
                </div>
                <div
                  style={{
                    height: 7,
                    borderRadius: 999,
                    background: dark ? "#333" : "#eef",
                    overflow: "hidden",
                    marginTop: 4,
                  }}
                >
                  <div
                    style={{
                      height: 7,
                      width: pct + "%",
                      background: pct >= 100 ? expenseColor : "#7F77DD",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      );
    }
    if (w.type === "note_widget") {
      var note = selectedNote(w);
      if (!note) return emptyBox("Nessuna nota inserita");
      var richNoteHtml = safeHomeNoteHtml(note.html || "");
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 8,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: compact ? 14 : 17,
              fontWeight: 950,
              color: textC,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {note.title || L("Nota")}
          </div>
          {richNoteHtml ? (
            <div
              data-no-translate="true"
              style={{
                fontSize: compact ? 12 : 13,
                color: subC,
                lineHeight: 1.35,
                overflow: "hidden",
                maxHeight: doubleSize ? 190 : compact ? 76 : 96,
                overflowWrap: "anywhere",
              }}
              dangerouslySetInnerHTML={{ __html: richNoteHtml }}
            />
          ) : (
            <div
              style={{
                fontSize: compact ? 12 : 13,
                color: subC,
                lineHeight: 1.35,
                overflow: "hidden",
                display: "-webkit-box",
                WebkitLineClamp: doubleSize ? 8 : compact ? 4 : 5,
                WebkitBoxOrient: "vertical",
                whiteSpace: "pre-wrap",
              }}
            >
              {note.text || note.title || ""}
            </div>
          )}
        </div>
      );
    }
    if (w.type === "bank_coord_widget") {
      var bank = selectedBank(w);
      if (!bank) return emptyBox("Nessuna coordinata bancaria");
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontSize: compact ? 14 : 17,
              fontWeight: 950,
              color: textC,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {bank.bank || L("Coordinata bancaria")}
          </div>
          {bank.holder && (
            <div
              style={{
                fontSize: 12,
                color: subC,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {bank.holder}
            </div>
          )}
          <div
            style={{
              fontSize: compact ? 13 : 15,
              fontWeight: 950,
              color: textC,
              letterSpacing: 0.4,
              wordBreak: "break-all",
            }}
          >
            {maskHomeIban(bank.iban)}
          </div>
          {!compact && bank.bic && (
            <div style={{ fontSize: 12, color: subC }}>BIC: {bank.bic}</div>
          )}
        </div>
      );
    }
    if (w.type === "credit_card_widget") {
      var cc = selectedCreditCard(w);
      if (!cc) return emptyBox("Nessuna carta di credito");
      return (
        <div
          style={{
            background: "linear-gradient(135deg,#334155,#111827 82%)",
            borderRadius: 18,
            padding: compact ? 12 : 16,
            color: "#fff",
            minHeight: doubleSize ? 230 : compact ? 110 : 145,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            boxSizing: "border-box",
          }}
        >
          <div>
            <div
              style={{
                fontSize: compact ? 14 : 18,
                fontWeight: 950,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {cc.name || cc.issuer || L("Carta di Credito")}
            </div>
            {cc.holder && (
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.76,
                  marginTop: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {cc.holder}
              </div>
            )}
          </div>
          <div>
            <div
              style={{
                fontSize: compact ? 14 : 18,
                fontWeight: 950,
                letterSpacing: 1.2,
              }}
            >
              {maskHomeCardNumber(cc.number)}
            </div>
            {cc.expiry && (
              <div style={{ fontSize: 11, opacity: 0.76, marginTop: 4 }}>
                {L("Scadenza")}: {cc.expiry}
              </div>
            )}
          </div>
        </div>
      );
    }
    if (w.type === "shopping_list_widget") {
      var sl = selectedShoppingList(w);
      var rows = shoppingItemsForList(sl);
      var openRows = rows.filter(function (x) {
        return !x.bought;
      });
      var maxH2 = doubleSize ? 300 : compact ? 118 : 150;
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 7,
            minWidth: 0,
            height: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              minWidth: 0,
              flexShrink: 0,
            }}
          >
            <span style={{ display: "inline-flex" }}>
              <FainanceIcon
                value={(sl && sl.icon) || "🧺"}
                size={compact ? 20 : 24}
              />
            </span>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: compact ? 14 : 17,
                  fontWeight: 950,
                  color: textC,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {(sl && sl.title) || L("Lista della spesa")}
              </div>
              <div style={{ fontSize: 11, color: subC }}>
                {openRows.length} {L("da comprare")}
              </div>
            </div>
          </div>
          <div
            style={{
              overflowY: "auto",
              WebkitOverflowScrolling: "touch",
              paddingRight: 2,
              maxHeight: maxH2,
            }}
          >
            {rows.map(function (x) {
              var bought = !!x.bought;
              return (
                <button
                  type="button"
                  key={x.id}
                  onClick={function (e) {
                    e.stopPropagation();
                    toggleHomeShoppingItem(x.id);
                  }}
                  style={{
                    width: "100%",
                    border: "none",
                    background: bought
                      ? ctx.shoppingBoughtColor || "#EAF7EE"
                      : "transparent",
                    borderRadius: 10,
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    minWidth: 0,
                    fontSize: compact ? 12 : 13,
                    color: bought ? subC : textC,
                    padding: "6px 4px",
                    borderBottom: "1px solid " + borderC,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 15, flexShrink: 0 }}>
                    {bought ? "☑" : "☐"}
                  </span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textDecoration: bought ? "line-through" : "none",
                    }}
                  >
                    {x.name}
                  </span>
                  {x.qty && String(x.qty) !== "1" && (
                    <span style={{ fontSize: 11, color: subC, flexShrink: 0 }}>
                      {x.qty} {x.unit || ""}
                    </span>
                  )}
                </button>
              );
            })}
            {!rows.length && emptyBox("Lista vuota")}
          </div>
        </div>
      );
    }
    if (w.type === "fidelity_card") {
      var card = selectedCard(w);
      if (!card) return emptyBox("Nessuna carta Fidelity");
      var bg = card.color || "#0F9F76";
      return (
        <div
          style={{
            background: "linear-gradient(135deg," + bg + ",#101828 82%)",
            borderRadius: 18,
            padding: 16,
            color: "#fff",
            minHeight: doubleSize ? 260 : compact ? 150 : 170,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 950 }}>
            {card.name || L("Carta")}
          </div>
          {homeCardCodePreview(card)}
        </div>
      );
    }
    if (w.type === "goal") {
      var g = selectedGoal(w);
      if (!g) return emptyBox("Nessun obiettivo");
      var target = safeNum(g.target),
        saved = safeNum(g.saved),
        pct2 = target > 0 ? Math.min(100, (saved / target) * 100) : 0;
      return (
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ fontSize: 26 }}>
              <FainanceIcon value={g.icon || "🎯"} size={24} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 950, color: textC }}>
                {g.name}
              </div>
              <div style={{ fontSize: 12, color: subC }}>
                {Math.round(pct2)}% · {fmt(saved)} / {fmt(target)}
              </div>
            </div>
          </div>
          <div
            style={{
              height: 10,
              borderRadius: 999,
              background: dark ? "#333" : "#eef",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: 10,
                width: pct2 + "%",
                background: g.color || "#7F77DD",
              }}
            />
          </div>
        </div>
      );
    }
    return emptyBox("Worklet non disponibile");
  }
  var baseHome = String(currentPlan || "free") === "base";
  var activeWorklets = premiumHome
    ? normalizeWorklets(homeWorklets, true)
    : baseHome
    ? HOME_DEFAULT_WORKLETS.concat([HOME_BASE_SCHEDULED_WORKLET])
    : HOME_DEFAULT_WORKLETS;
  function insertedTypes() {
    var m: any = {};
    activeWorklets.forEach(function (w) {
      m[w.type] = true;
    });
    return m;
  }
  function availableItems() {
    var m = insertedTypes();
    return HOME_LIBRARY.filter(function (x) {
      return x.type !== "assistant_voice_widget" && !m[x.type];
    });
  }
  function applyDraft() {
    if (!editDraft) return;
    var rawCount = homeCountDraftRef.current
      ? homeCountDraftRef.current[draftCountKey(editDraft)]
      : undefined;
    var rawTitle = homeTitleDraftRef.current
      ? homeTitleDraftRef.current[draftTitleKey(editDraft)]
      : undefined;
    var mergedParams = { ...(editDraft.params || {}) };
    if (rawTitle !== undefined) mergedParams.customTitle = rawTitle;
    if (
      rawCount !== undefined &&
      ["latest_expenses", "latest_incomes", "share_recent"].indexOf(
        editDraft.type
      ) >= 0
    ) {
      mergedParams.count = Math.max(1, Math.min(20, Number(rawCount) || 1));
    }
    var draft = {
      ...editDraft,
      params: sanitizeWorkletParams(editDraft.type, mergedParams),
    };
    if (homeCountDraftRef.current)
      delete homeCountDraftRef.current[draftCountKey(editDraft)];
    if (homeTitleDraftRef.current)
      delete homeTitleDraftRef.current[draftTitleKey(editDraft)];
    if (draft.mode === "add") {
      var w = {
        id: draft.id || "home_" + draft.type + "_" + Date.now(),
        type: draft.type,
        size: draft.size || defaultSize(draft.type),
        color: draft.color || "#FFFFFF",
        params: draft.params || {},
      };
      saveWorklets(activeWorklets.concat([w]));
      setEditDraft(null);
      return;
    }
    saveWorklets(
      activeWorklets.map(function (w) {
        return String(w.id) === String(draft.id)
          ? {
              id: w.id,
              type: w.type,
              size: draft.size || w.size,
              color: draft.color || w.color,
              params: draft.params || {},
            }
          : w;
      })
    );
    setEditDraft(null);
  }
  function removeDraft() {
    if (!editDraft || editDraft.mode === "add") return;
    saveWorklets(
      activeWorklets.filter(function (w) {
        return String(w.id) !== String(editDraft.id);
      })
    );
    setEditDraft(null);
  }
  function removeActive(id) {
    saveWorklets(
      activeWorklets.filter(function (w) {
        return String(w.id) !== String(id);
      })
    );
    if (editDraft && String(editDraft.id) === String(id)) setEditDraft(null);
  }
  function openActiveSettings(w) {
    setEditDraft({ ...w, mode: "edit", params: { ...(w.params || {}) } });
  }
  function openLibrarySettings(type) {
    var w = makeWorklet(type);
    setEditDraft({ ...w, mode: "add" });
  }
  function insertAtFromLibrary(type, index, openPopup) {
    if (insertedTypes()[type]) return;
    var w = makeWorklet(type);
    var arr = activeWorklets.slice();
    var to = Math.max(0, Math.min(index, arr.length));
    arr.splice(to, 0, w);
    saveWorklets(arr);
    if (openPopup) setEditDraft({ ...w, mode: "edit" });
    else setEditDraft(null);
  }
  function moveActive(from, to) {
    if (
      from === undefined ||
      from === null ||
      from < 0 ||
      from >= activeWorklets.length ||
      to < 0 ||
      from === to
    )
      return;
    var arr = activeWorklets.slice();
    var item = arr.splice(from, 1)[0];
    var target = Math.max(0, Math.min(Number(to), arr.length));
    arr.splice(target, 0, item);
    saveWorklets(arr);
    setEditDraft(null);
    setHomeDropIndex(null);
  }
  function readDrag(e) {
    try {
      var raw =
        e.dataTransfer &&
        e.dataTransfer.getData("application/x-fainance-home-worklet");
      if (raw) return JSON.parse(raw);
    } catch (_e) {}
    return dragPayload;
  }
  function getDropIndexFromPoint(x, y) {
    var index = activeWorklets.length;
    try {
      var el = document.elementFromPoint(x, y);
      var node =
        el && el.closest ? el.closest("[data-home-worklet-index]") : null;
      if (node) {
        var raw = node.getAttribute("data-home-worklet-index");
        if (raw !== null && raw !== "") {
          var idx = Number(raw);
          var r = node.getBoundingClientRect();
          var midY = r.top + r.height / 2;
          var midX = r.left + r.width / 2;
          if (Math.abs(y - midY) < Math.max(22, r.height * 0.32))
            index = idx + (x > midX ? 1 : 0);
          else index = idx + (y > midY ? 1 : 0);
        }
      }
    } catch (_e) {}
    return Math.max(0, Math.min(index, activeWorklets.length));
  }
  function applyActiveDrop(from, dropIndex) {
    if (
      from === undefined ||
      from === null ||
      from < 0 ||
      from >= activeWorklets.length
    )
      return;
    var di = Math.max(0, Math.min(Number(dropIndex), activeWorklets.length));
    if (di === from || di === from + 1) {
      setEditDraft(null);
      setHomeDropIndex(null);
      return;
    }
    var arr = activeWorklets.slice();
    var item = arr.splice(from, 1)[0];
    var target = Math.max(0, Math.min(di, arr.length));
    if (from < di) target = Math.max(0, target - 1);
    arr.splice(target, 0, item);
    saveWorklets(arr);
    setEditDraft(null);
    setHomeDropIndex(null);
  }
  function completeHomeDrag(payload, dropIndex) {
    setDragPayload(null);
    setHomeDragging(null);
    setHomeDropIndex(null);
    if (!payload) return;
    if (payload.source === "library")
      insertAtFromLibrary(payload.type, dropIndex, true);
    if (payload.source === "active")
      applyActiveDrop(Number(payload.index), dropIndex);
  }
  function dropAt(e, index) {
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_e) {}
    var payload = readDrag(e);
    completeHomeDrag(payload, index);
  }
  function isInteractiveTarget(target) {
    try {
      return !!(
        target &&
        target.closest &&
        target.closest("button,input,select,textarea,label")
      );
    } catch (_e) {
      return false;
    }
  }
  function clearHomeDragTimer(state) {
    try {
      if (state && state.timer) clearTimeout(state.timer);
    } catch (_e) {}
  }
  function armHomeDrag(state, target, pointerId) {
    var cur = homePointerDragRef.current;
    if (!cur || cur !== state) return;
    cur.armed = true;
    cur.moved = false;
    setDragPayload(state.payload);
    setHomeDragging(state.payload);
    setHomeDropIndex(
      state.payload && state.payload.source === "active"
        ? Number(state.payload.index)
        : activeWorklets.length
    );
    try {
      if (target && target.setPointerCapture && pointerId !== undefined)
        target.setPointerCapture(pointerId);
    } catch (_e) {}
  }
  function startPointerDrag(e, payload) {
    if (!homeEditMode || !premiumHome || isInteractiveTarget(e.target)) return;
    if (e.pointerType === "touch") return;
    if (e.button !== undefined && e.button !== 0) return;
    var target = e.currentTarget;
    var pointerId = e.pointerId;
    var state: any = {
      payload: payload,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      moved: false,
      armed: false,
      timer: null,
    };
    state.timer = setTimeout(function () {
      armHomeDrag(state, target, pointerId);
    }, 2000);
    homePointerDragRef.current = state;
  }
  function movePointerDrag(e) {
    var s = homePointerDragRef.current;
    if (!s || e.pointerType === "touch") return;
    var dx = Math.abs(e.clientX - s.startX),
      dy = Math.abs(e.clientY - s.startY);
    if (!s.armed) {
      if (dx > 10 || dy > 10) {
        clearHomeDragTimer(s);
        homePointerDragRef.current = null;
      }
      return;
    }
    s.lastX = e.clientX;
    s.lastY = e.clientY;
    if (dx > 7 || dy > 7) s.moved = true;
    var di = getDropIndexFromPoint(e.clientX, e.clientY);
    setHomeDropIndex(di);
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_e) {}
  }
  function endPointerDrag(e) {
    var s = homePointerDragRef.current;
    if (!s || e.pointerType === "touch") return;
    clearHomeDragTimer(s);
    homePointerDragRef.current = null;
    if (!s.armed || !s.moved) {
      setHomeDragging(null);
      setHomeDropIndex(null);
      return;
    }
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_e) {}
    var x = e.clientX || s.lastX,
      y = e.clientY || s.lastY;
    completeHomeDrag(s.payload, getDropIndexFromPoint(x, y));
  }
  function cancelHomePointerDrag() {
    var s = homePointerDragRef.current;
    clearHomeDragTimer(s);
    homePointerDragRef.current = null;
    setHomeDragging(null);
    setHomeDropIndex(null);
    setDragPayload(null);
  }
  function touchPoint(e, end) {
    var list = end ? e.changedTouches : e.touches;
    var t = list && list[0];
    return t ? { x: t.clientX, y: t.clientY } : null;
  }
  function startTouchDrag(e, payload) {
    if (!homeEditMode || !premiumHome || isInteractiveTarget(e.target)) return;
    if (!e.touches || e.touches.length !== 1) return;
    var p = touchPoint(e, false);
    if (!p) return;
    var target = e.currentTarget;
    var state: any = {
      payload: payload,
      startX: p.x,
      startY: p.y,
      lastX: p.x,
      lastY: p.y,
      moved: false,
      armed: false,
      timer: null,
      touch: true,
    };
    state.timer = setTimeout(function () {
      armHomeDrag(state, target, undefined);
    }, 2000);
    homePointerDragRef.current = state;
  }
  function moveTouchDrag(e) {
    var s = homePointerDragRef.current;
    if (!s || !s.touch) return;
    var p = touchPoint(e, false);
    if (!p) return;
    var dx = Math.abs(p.x - s.startX),
      dy = Math.abs(p.y - s.startY);
    if (!s.armed) {
      if (dx > 10 || dy > 10) {
        clearHomeDragTimer(s);
        homePointerDragRef.current = null;
      }
      return;
    }
    s.lastX = p.x;
    s.lastY = p.y;
    if (dx > 7 || dy > 7) s.moved = true;
    setHomeDropIndex(getDropIndexFromPoint(p.x, p.y));
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_e) {}
  }
  function endTouchDrag(e) {
    var s = homePointerDragRef.current;
    if (!s || !s.touch) return;
    clearHomeDragTimer(s);
    homePointerDragRef.current = null;
    if (!s.armed || !s.moved) {
      setHomeDragging(null);
      setHomeDropIndex(null);
      setDragPayload(null);
      return;
    }
    var p = touchPoint(e, true) || { x: s.lastX, y: s.lastY };
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_e) {}
    completeHomeDrag(s.payload, getDropIndexFromPoint(p.x, p.y));
  }
  function cancelTouchDrag() {
    cancelHomePointerDrag();
  }
  function cleanHomeWorkletTitle(v) {
    var value = String(v == null ? "" : v)
      .replace(/[\u200B\u200C\u200D\u2060\uFEFF]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    return value.replace(/(?:\s*[\-‐‑‒–—―−﹘﹣－:·•]+\s*)+$/g, "").trim();
  }
  function cardTitle(w) {
    var item = lib(w.type);
    var rawTitle = homeTitleText(w);
    var cleanTitle = cleanHomeWorkletTitle(rawTitle);
    if (w && w.type === "distribution_expenses") {
      var customTitle = String((w.params && w.params.customTitle) || "").trim();
      cleanTitle = customTitle
        ? cleanHomeWorkletTitle(customTitle)
            .replace(/(?:\s*[-‐‑‒–—―−﹘﹣－:·•]+\s*)+$/g, "")
            .trim()
        : H("Distribuzione Uscite");
    }
    return (item.icon ? item.icon + " " : "") + cleanTitle;
  }
  function rangeBadge(w) {
    var txt = "";
    if (
      [
        "distribution_expenses",
        "income_vs_expense",
        "expenses_by_area",
        "expenses_by_category",
        "incomes_by_type",
        "planned_saving",
        "budget_overview",
        "budget_by_category",
        "savings_progress",
      ].indexOf(w.type) >= 0
    )
      txt = rangeTitle(w);
    else if (w.type === "monthly_balance")
      txt =
        (w.params && w.params.range) == 6
          ? H("Ultimi 6 mesi")
          : H("Ultimi 12 mesi");
    return cleanHomeWorkletTitle(txt);
  }
  function isGraphWorklet(type) {
    return (
      [
        "distribution_expenses",
        "expenses_by_area",
        "expenses_by_category",
        "incomes_by_type",
        "income_vs_expense",
        "monthly_balance",
        "savings_progress",
      ].indexOf(String(type || "")) >= 0
    );
  }
  function workletCard(w, index, available) {
    var bg = workletColor(w),
      fg = textOnBg(bg),
      size = String(w.size || "2x"),
      assistantType = w.type === "assistant_voice_widget",
      assistantWide = size === "2x1" || size === "2x2",
      assistantTall = size === "1x2" || size === "2x2",
      compact = size === "0.5x",
      buttonType = isHomeNavButton(w.type);
    var spanUnits = assistantType
      ? assistantWide
        ? 4
        : 2
      : buttonType
      ? size === "0.5x"
        ? 1
        : size === "1x"
        ? 2
        : 4
      : compact
      ? 2
      : isMobile
      ? 4
      : size === "2x"
      ? 4
      : 2;
    var span = "span " + spanUnits;
    var title = cardTitle(w),
      badge = compact || buttonType || assistantType ? "" : rangeBadge(w),
      isEditing = homeEditMode && premiumHome,
      showHeader =
        available || (!buttonType && !assistantType && homeShowTitle(w));
    var countN = Math.max(1, Number(w.params && w.params.count) || 5);
    function homeWorkletBaseHeight(type, size, countN) {
      var compact = size === "0.5x";
      if (type === "assistant_voice_widget") return assistantTall ? 196 : 100;
      if (isHomeNavButton(type)) return 72;
      if (compact) {
        if (type === "quick_actions") return 106;
        if (type === "summary") return 218;
        if (type === "fidelity_card") return 220;
        if (type === "share_balance") return 120;
        if (type === "share_recent") return 136;
        if (type === "shopping_list_widget") return 172;
        if (type === "upcoming_scheduled_expenses") return 168;
        if (type === "latest_expenses" || type === "latest_incomes")
          return Math.min(260, 70 + countN * 38);
        if (type === "income_vs_expense" || type === "monthly_balance")
          return 168;
        if (type === "savings_progress") return 148;
        if (
          type === "distribution_expenses" ||
          type === "expenses_by_area" ||
          type === "expenses_by_category" ||
          type === "incomes_by_type"
        )
          return 172;
        if (type === "goal") return 112;
        return 145;
      }
      if (type === "quick_actions") return 84;
      if (type === "summary") return secondaryCurrency && secRate ? 226 : 166;
      if (type === "fidelity_card") return 210;
      if (type === "credit_card_widget") return 160;
      if (
        type === "note_widget" ||
        type === "bank_coord_widget" ||
        type === "shopping_list_widget"
      )
        return 170;
      if (type === "upcoming_scheduled_expenses") return 184;
      if (type === "share_recent") return 140;
      if (type === "latest_expenses" || type === "latest_incomes")
        return Math.min(
          390,
          72 + countN * (secondaryCurrency && secRate ? 50 : 42)
        );
      if (type === "income_vs_expense" || type === "monthly_balance")
        return 216;
      if (type === "savings_progress") return 164;
      if (type === "distribution_expenses") return 150;
      if (
        type === "expenses_by_area" ||
        type === "expenses_by_category" ||
        type === "incomes_by_type"
      )
        return 166;
      if (type === "goal") return 106;
      return 160;
    }
    var normalH = homeWorkletBaseHeight(w.type, size, countN);
    var doubleHeightTypes = [
      "quick_actions",
      "summary",
      "distribution_expenses",
      "income_vs_expense",
      "monthly_balance",
      "latest_expenses",
      "latest_incomes",
      "share_recent",
      "share_balance",
      "planned_saving",
      "fidelity_card",
      "goal",
      "expenses_by_area",
      "expenses_by_category",
      "incomes_by_type",
      "budget_overview",
      "budget_by_category",
      "savings_progress",
      "upcoming_scheduled_expenses",
      "note_widget",
      "bank_coord_widget",
      "credit_card_widget",
      "shopping_list_widget",
    ];
    var targetH = available
      ? 118
      : assistantType
      ? assistantTall
        ? 196
        : 100
      : buttonType
      ? size === "2x"
        ? 112
        : 72
      : size === "2x" && doubleHeightTypes.indexOf(w.type) >= 0
      ? normalH * 2
      : normalH;
    if (!available && !buttonType && !homeShowTitle(w)) {
      if (w.type === "quick_actions")
        targetH = compact ? 94 : size === "2x" ? 128 : 66;
      else if (w.type === "summary")
        targetH = compact
          ? secondaryCurrency && secRate
            ? 232
            : 174
          : size === "2x"
          ? secondaryCurrency && secRate
            ? 350
            : 286
          : secondaryCurrency && secRate
          ? 218
          : 150;
      else if (w.type === "distribution_expenses")
        targetH = compact ? 150 : size === "2x" ? 280 : 136;
      else if (
        w.type === "expenses_by_area" ||
        w.type === "expenses_by_category" ||
        w.type === "incomes_by_type"
      )
        targetH = compact ? 164 : size === "2x" ? 318 : 154;
      else if (w.type === "income_vs_expense" || w.type === "monthly_balance")
        targetH = compact ? 158 : size === "2x" ? 350 : 204;
      else if (w.type === "savings_progress")
        targetH = compact ? 142 : size === "2x" ? 300 : 142;
      else if (w.type === "goal")
        targetH = compact ? 102 : size === "2x" ? 150 : 92;
      else if (w.type === "upcoming_scheduled_expenses")
        targetH = compact ? 154 : size === "2x" ? 330 : 172;
      else targetH = Math.max(72, targetH - 30);
    }
    if (isEditing && !available && compact) targetH += 22;
    // Il riepilogo contiene quattro StatCard. La sua altezza minima deve dipendere
    // dal numero reale di righe e dalla presenza della valuta secondaria; in caso
    // contrario l’ultima riga viene tagliata dal contenitore del worklet.
    if (!available && !buttonType && w.type === "summary") {
      var summaryHasSecondary = !!(secondaryCurrency && secRate);
      var summaryCardHeight = summaryHasSecondary ? 88 : 70;
      var summaryColumns = compact ? 1 : isMobile ? 2 : 4;
      var summaryRows = Math.ceil(4 / summaryColumns);
      var summaryGap = compact ? 8 : 12;
      var summaryPadding = compact ? 20 : 32;
      var summaryHeaderHeight = homeShowTitle(w) ? 30 : 0;
      var summaryRequiredHeight =
        summaryRows * summaryCardHeight +
        Math.max(0, summaryRows - 1) * summaryGap +
        summaryPadding +
        summaryHeaderHeight;
      targetH = Math.max(targetH, summaryRequiredHeight);
    }
    var rowSpan = Math.max(3, Math.ceil((targetH + 14) / (8 + 14)));
    var payload = available
      ? { source: "library", type: w.type }
      : { source: "active", index: index, id: w.id };
    var common = {
      gridColumn: span,
      gridRowEnd: "span " + rowSpan,
      background: bg,
      borderRadius: 16,
      border:
        "1px solid " +
        (available
          ? assistantType
            ? "#7F77DD"
            : dark
            ? "#38384a"
            : "#d7d8e4"
          : borderC),
      padding: buttonType ? (compact ? 8 : 10) : compact ? 10 : 16,
      paddingTop:
        isEditing && !available && compact
          ? 70
          : buttonType
          ? compact
            ? 8
            : 10
          : compact
          ? 10
          : 16,
      overflow: "hidden",
      boxShadow: available
        ? "none"
        : dark
        ? "none"
        : "0 4px 18px rgba(0,0,0,0.04)",
      color: fg,
      opacity: available ? (assistantType ? 0.96 : 0.52) : 1,
      position: "relative",
      cursor: isEditing ? (homeDragging ? "grabbing" : "grab") : "default",
      minHeight: targetH,
      boxSizing: "border-box",
      display: "flex",
      flexDirection: "column",
      justifyContent: available ? "center" : "flex-start",
      touchAction: isEditing ? "pan-y" : "auto",
      userSelect: isEditing ? "none" : "auto",
      minWidth: 0,
      height: "100%",
    };
    var headerStyle = {
      display: showHeader ? "flex" : "none",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: compact ? 5 : 10,
      marginBottom: available ? 0 : 8,
      paddingRight:
        isEditing && !available && !compact
          ? 152
          : isEditing && !available
          ? 0
          : 0,
      minHeight: isEditing && !available && !compact ? 32 : 0,
      minWidth: 0,
    };
    var titleStyle: any = {
      fontSize: compact ? 11 : 13,
      fontWeight: 950,
      color: available ? fg : textC,
      lineHeight: 1.15,
      minWidth: 0,
      overflow: "hidden",
      textOverflow: "ellipsis",
      display: "-webkit-box",
      WebkitLineClamp: compact ? 2 : 1,
      WebkitBoxOrient: "vertical",
    };
    var ctl = function (disabled) {
      return {
        position: "absolute",
        border: "1px solid " + borderC,
        borderRadius: 999,
        background: cardBg,
        color: textC,
        width: compact ? 28 : 32,
        height: compact ? 28 : 32,
        padding: 0,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.35 : 1,
        fontSize: compact ? 18 : 20,
        fontWeight: 950,
        lineHeight: 1,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,.12)",
        zIndex: 3,
      };
    };
    var upStyle = {
      ...ctl(index <= 0),
      ...(compact ? { left: 8, top: 8 } : { right: 116, top: 8 }),
    };
    var downStyle = {
      ...ctl(index >= activeWorklets.length - 1),
      ...(compact ? { left: 8, top: 42 } : { right: 80, top: 8 }),
    };
    var gearStyle = {
      position: "absolute",
      right: compact ? 8 : 44,
      top: compact ? 8 : 8,
      width: compact ? 28 : 32,
      height: compact ? 28 : 32,
      borderRadius: 999,
      border: "1px solid " + borderC,
      background: dark ? "#252535" : "#FFFFFF",
      color: textC,
      cursor: "pointer",
      fontSize: compact ? 15 : 16,
      fontWeight: 900,
      boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,.12)",
      zIndex: 3,
    };
    var closeStyle = {
      position: "absolute",
      right: compact ? 8 : 8,
      top: compact ? 42 : 8,
      width: compact ? 28 : 32,
      height: compact ? 28 : 32,
      borderRadius: 999,
      border: "1px solid #ef4444",
      background: "#E24B4A",
      color: "#fff",
      cursor: "pointer",
      fontSize: compact ? 16 : 18,
      fontWeight: 950,
      boxShadow: dark ? "none" : "0 2px 8px rgba(226,75,74,.24)",
      lineHeight: 1,
      zIndex: 3,
    };
    return (
      <div
        key={(available ? "available_" : "active_") + w.id}
        data-home-worklet-index={available ? undefined : index}
        draggable={false}
        onPointerDown={function (e) {
          startPointerDrag(e, payload);
        }}
        onPointerMove={movePointerDrag}
        onPointerUp={endPointerDrag}
        onPointerCancel={cancelHomePointerDrag}
        onTouchStart={function (e) {
          startTouchDrag(e, payload);
        }}
        onTouchMove={moveTouchDrag}
        onTouchEnd={endTouchDrag}
        onTouchCancel={cancelTouchDrag}
        onContextMenu={function (e) {
          if (isEditing) {
            try {
              e.preventDefault();
            } catch (_e) {}
          }
        }}
        onDragStart={function (e) {
          try {
            e.preventDefault();
          } catch (_e) {}
        }}
        onDragOver={function (e) {
          if (isEditing) {
            try {
              e.preventDefault();
            } catch (_e) {}
          }
        }}
        onDrop={function (e) {
          if (isEditing && !available) dropAt(e, index);
        }}
        onClick={function () {
          if (isEditing && available) openLibrarySettings(w.type);
        }}
        style={common as any}
      >
        <div style={headerStyle as any}>
          <div style={titleStyle}>{title}</div>
          {available && assistantType && (
            <div
              style={{
                fontSize: 10,
                color: "#7F77DD",
                fontWeight: 950,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {L("Nuovo")}
            </div>
          )}
          {badge && (
            <div
              style={{
                fontSize: 11,
                color: available ? fg : subC,
                fontWeight: 800,
                opacity: available ? 0.8 : 1,
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {badge}
            </div>
          )}
        </div>
        {isEditing && !available && (
          <button
            type="button"
            onPointerDown={function (e) {
              e.stopPropagation();
            }}
            onClick={function (e) {
              e.stopPropagation();
              moveActive(index, index - 1);
            }}
            disabled={index <= 0}
            title={L("Sposta su")}
            style={upStyle as any}
          >
            ↑
          </button>
        )}
        {isEditing && !available && (
          <button
            type="button"
            onPointerDown={function (e) {
              e.stopPropagation();
            }}
            onClick={function (e) {
              e.stopPropagation();
              moveActive(index, index + 1);
            }}
            disabled={index >= activeWorklets.length - 1}
            title={L("Sposta giù")}
            style={downStyle as any}
          >
            ↓
          </button>
        )}
        {isEditing && !available && (
          <button
            type="button"
            onPointerDown={function (e) {
              e.stopPropagation();
            }}
            onClick={function (e) {
              e.stopPropagation();
              openActiveSettings(w);
            }}
            title={L("Impostazioni worklet")}
            style={gearStyle as any}
          >
            ⚙
          </button>
        )}
        {isEditing && !available && (
          <button
            type="button"
            onPointerDown={function (e) {
              e.stopPropagation();
            }}
            onClick={function (e) {
              e.stopPropagation();
              removeActive(w.id);
            }}
            title={L("Rimuovi dalla Home")}
            style={closeStyle as any}
          >
            ×
          </button>
        )}
        {available ? (
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginTop: 12,
            }}
          >
            <button
              type="button"
              onPointerDown={function (e) {
                e.stopPropagation();
              }}
              onClick={function (e) {
                e.stopPropagation();
                openLibrarySettings(w.type);
              }}
              style={{
                border: "none",
                background: secondaryC,
                color: "#fff",
                borderRadius: 12,
                padding: "9px 12px",
                fontSize: 12,
                fontWeight: 950,
                cursor: "pointer",
                boxShadow: dark ? "none" : "0 5px 14px rgba(0,0,0,.12)",
                opacity: 0.65,
              }}
            >
              ＋{" "}
              {assistantType
                ? assistantVoiceUiText(lang || "it").title
                : L("Aggiungi worklet")}
            </button>
          </div>
        ) : (
          <div
            style={{
              pointerEvents: "auto",
              flex:
                homeShowTitle(w) ||
                !(w.type === "quick_actions" || w.type === "summary")
                  ? 1
                  : "0 0 auto",
              minWidth: 0,
              overflowY:
                isGraphWorklet(w.type) ||
                w.type === "quick_actions" ||
                assistantType
                  ? "hidden"
                  : "auto",
              overflowX: "hidden",
              WebkitOverflowScrolling: "touch",
              boxSizing: "border-box",
              paddingRight: 2,
              paddingBottom: isGraphWorklet(w.type) ? 0 : 0,
              overscrollBehavior: "auto",
              touchAction: "pan-y",
            }}
          >
            {renderWorklet(w)}
          </div>
        )}
      </div>
    );
  }
  function updateDraft(patch) {
    setEditDraft(function (d) {
      return d ? { ...d, ...patch } : d;
    });
  }
  function updateDraftParams(patch) {
    setEditDraft(function (d) {
      return d ? { ...d, params: { ...(d.params || {}), ...patch } } : d;
    });
  }
  function seg(items, value, onChange) {
    return (
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {items.map(function (it) {
          var active = String(value) === String(it.id);
          return (
            <button
              key={it.id}
              type="button"
              onClick={function () {
                onChange(it.id);
              }}
              style={{
                border: "1px solid " + (active ? "#7F77DD" : borderC),
                background: active ? (dark ? "#24213a" : "#F0EDFF") : cardBg,
                color: active ? "#7F77DD" : textC,
                borderRadius: 12,
                padding: "8px 10px",
                fontSize: 12,
                fontWeight: active ? 900 : 700,
                cursor: "pointer",
              }}
            >
              {H(it.label)}
            </button>
          );
        })}
      </div>
    );
  }
  function countField(label, w) {
    var k = draftCountKey(editDraft || w);
    var initial =
      homeCountDraftRef.current && homeCountDraftRef.current[k] !== undefined
        ? homeCountDraftRef.current[k]
        : String((w.params && w.params.count) || 5);
    return (
      <Field label={label}>
        <input
          type="text"
          inputMode="numeric"
          defaultValue={initial}
          onChange={function (e) {
            var raw = String(e.target.value || "")
              .replace(/\D/g, "")
              .slice(0, 2);
            if (homeCountDraftRef.current) homeCountDraftRef.current[k] = raw;
          }}
          onBlur={function (e) {
            var raw = String(e.target.value || "")
              .replace(/\D/g, "")
              .slice(0, 2);
            var n = Math.max(1, Math.min(20, Number(raw) || 1));
            if (homeCountDraftRef.current)
              homeCountDraftRef.current[k] = String(n);
            updateDraftParams({ count: n });
          }}
          style={{ ...inputStyle, width: "100%" }}
        />
      </Field>
    );
  }
  function popupParams(w) {
    var type = w.type;
    var rangeTypes = [
      "distribution_expenses",
      "income_vs_expense",
      "expenses_by_area",
      "expenses_by_category",
      "incomes_by_type",
      "planned_saving",
      "budget_overview",
      "budget_by_category",
      "savings_progress",
    ];
    if (rangeTypes.indexOf(type) >= 0)
      return (
        <Field label="Intervallo">
          {seg(
            [1, 3, 6, 12].map(function (n) {
              return {
                id: n,
                label: n === 1 ? "Ultimo mese" : "Ultimi " + n + " mesi",
              };
            }),
            Number((w.params && w.params.range) || 12),
            function (v) {
              updateDraftParams({ range: Number(v) });
            }
          )}
        </Field>
      );
    if (type === "monthly_balance")
      return (
        <Field label="Intervallo">
          {seg(
            [
              { id: 6, label: "Ultimi 6 mesi" },
              { id: 12, label: "Ultimi 12 mesi" },
            ],
            Number((w.params && w.params.range) || 12),
            function (v) {
              updateDraftParams({ range: Number(v) });
            }
          )}
        </Field>
      );
    if (type === "latest_expenses" || type === "latest_incomes")
      return countField("Numero elementi", w);
    if (type === "share_recent")
      return (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 150px",
            gap: 10,
          }}
        >
          <Field label="Progetto Share">
            <select
              value={(w.params && w.params.projectId) || ""}
              onChange={function (e) {
                updateDraftParams({ projectId: e.target.value });
              }}
              style={{ ...inputStyle, width: "100%" }}
            >
              {(shareProjects || []).length === 0 && (
                <option value="">{L("Nessun progetto Share")}</option>
              )}
              {(shareProjects || []).map(function (p) {
                return (
                  <option key={p.id} value={p.id}>
                    {p.icon || "🤝"} {p.name}
                  </option>
                );
              })}
            </select>
          </Field>
          {countField("Numero transazioni", w)}
        </div>
      );
    if (type === "share_balance")
      return (
        <Field label="Progetto Share">
          <select
            value={(w.params && w.params.projectId) || ""}
            onChange={function (e) {
              updateDraftParams({ projectId: e.target.value });
            }}
            style={{ ...inputStyle, width: "100%" }}
          >
            {(shareProjects || []).length === 0 && (
              <option value="">{L("Nessun progetto Share")}</option>
            )}
            {(shareProjects || []).map(function (p) {
              return (
                <option key={p.id} value={p.id}>
                  {p.icon || "🤝"} {p.name}
                </option>
              );
            })}
          </select>
        </Field>
      );
    if (type === "fidelity_card")
      return (
        <Field label="Carta">
          <select
            value={(w.params && w.params.cardId) || ""}
            onChange={function (e) {
              updateDraftParams({ cardId: e.target.value });
            }}
            style={{ ...inputStyle, width: "100%" }}
          >
            {(shoppingCards || []).length === 0 && (
              <option value="">{L("Nessuna carta")}</option>
            )}
            {(shoppingCards || []).map(function (c) {
              return (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              );
            })}
          </select>
        </Field>
      );
    if (type === "goal")
      return (
        <Field label="Obiettivo">
          <select
            value={(w.params && w.params.goalId) || ""}
            onChange={function (e) {
              updateDraftParams({ goalId: e.target.value });
            }}
            style={{ ...inputStyle, width: "100%" }}
          >
            {(goals || []).length === 0 && (
              <option value="">{L("Nessun obiettivo")}</option>
            )}
            {(goals || []).map(function (g) {
              return (
                <option key={g.id} value={g.id}>
                  <FainanceIcon value={g.icon || "🎯"} size={24} /> {g.name}
                </option>
              );
            })}
          </select>
        </Field>
      );
    if (type === "note_widget")
      return (
        <Field label="Nota">
          <select
            value={(w.params && w.params.noteId) || ""}
            onChange={function (e) {
              updateDraftParams({ noteId: e.target.value });
            }}
            style={{ ...inputStyle, width: "100%" }}
          >
            {(appuntiNotes || []).length === 0 && (
              <option value="">{L("Nessuna nota")}</option>
            )}
            {(appuntiNotes || []).map(function (n) {
              return (
                <option key={n.id} value={n.id}>
                  {n.title || L("Nota")}
                </option>
              );
            })}
          </select>
        </Field>
      );
    if (type === "bank_coord_widget")
      return (
        <Field label="Coordinata bancaria">
          <select
            value={(w.params && w.params.bankId) || ""}
            onChange={function (e) {
              updateDraftParams({ bankId: e.target.value });
            }}
            style={{ ...inputStyle, width: "100%" }}
          >
            {(bankCoords || []).length === 0 && (
              <option value="">{L("Nessuna coordinata bancaria")}</option>
            )}
            {(bankCoords || []).map(function (b) {
              return (
                <option key={b.id} value={b.id}>
                  {b.bank || b.holder || L("Coordinata bancaria")}
                </option>
              );
            })}
          </select>
        </Field>
      );
    if (type === "credit_card_widget")
      return (
        <Field label="Carta di Credito">
          <select
            value={(w.params && w.params.creditCardId) || ""}
            onChange={function (e) {
              updateDraftParams({ creditCardId: e.target.value });
            }}
            style={{ ...inputStyle, width: "100%" }}
          >
            {(creditCards || []).length === 0 && (
              <option value="">{L("Nessuna carta di credito")}</option>
            )}
            {(creditCards || []).map(function (c) {
              return (
                <option key={c.id} value={c.id}>
                  {c.name || c.issuer || L("Carta di Credito")}
                </option>
              );
            })}
          </select>
        </Field>
      );
    if (type === "shopping_list_widget")
      return (
        <Field label="Lista della spesa">
          <select
            value={
              (w.params && w.params.listId) ||
              homeActiveShoppingListId ||
              "main"
            }
            onChange={function (e) {
              updateDraftParams({ listId: e.target.value });
            }}
            style={{ ...inputStyle, width: "100%" }}
          >
            {(homeShoppingLists && homeShoppingLists.length
              ? homeShoppingLists
              : [{ id: "main", title: "Lista principale", icon: "🧺" }]
            ).map(function (l) {
              return (
                <option key={l.id} value={l.id}>
                  {l.icon || "🧺"} {l.title || L("Lista della spesa")}
                </option>
              );
            })}
          </select>
        </Field>
      );
    return (
      <div style={{ fontSize: 12, color: subC }}>
        {L("Questo worklet non richiede parametri specifici.")}
      </div>
    );
  }
  function Field(props) {
    return (
      <label
        style={{ display: "block", fontSize: 12, fontWeight: 900, color: subC }}
      >
        {L(props.label)}
        <div style={{ marginTop: 7 }}>{props.children}</div>
      </label>
    );
  }
  var inputStyle = {
    border: "1px solid " + borderC,
    borderRadius: 12,
    padding: "10px 12px",
    background: dark ? "#1e1e30" : "#fff",
    color: textC,
    fontSize: 13,
    boxSizing: "border-box",
  };
  function closeHomeEdit() {
    setHomeEditMode(false);
    setEditDraft(null);
    setHomeDragging(null);
    setHomeDropIndex(null);
    setDragPayload(null);
  }
  function editHelpBox(bottom) {
    return (
      <div
        style={{
          background: dark ? "#24213a" : "#F0EDFF",
          border: "1px solid " + (dark ? "#3d376a" : "#D8D2FF"),
          borderRadius: 16,
          padding: 14,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 950,
              color: dark ? "#BEB8FF" : "#534AB7",
            }}
          >
            🧩 {L("Modifica Home")}
          </div>
          <div
            style={{ fontSize: 12, color: subC, marginTop: 3, lineHeight: 1.4 }}
          >
            {L(
              "Sposta i widget con le frecce, entra nella configurazione per modificare il titolo, lo sfondo e la grandezza."
            )}
            {bottom && (
              <>
                <br />
                {L("I widget disponibili sono in fondo alla pagina.")}
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={closeHomeEdit}
          style={{
            border: "none",
            background: "#7F77DD",
            color: "#fff",
            borderRadius: 12,
            padding: "10px 14px",
            fontSize: 13,
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          {L("Fine modifica")}
        </button>
      </div>
    );
  }
  function startHomeDoneButtonDrag(e) {
    if (!homeEditMode || !premiumHome) return;
    var p = { x: e.clientX, y: e.clientY };
    homeDoneDragRef.current = {
      startX: p.x,
      startY: p.y,
      right: homeDonePos.right,
      bottom: homeDonePos.bottom,
      moved: false,
    };
    try {
      if (e.currentTarget && e.currentTarget.setPointerCapture)
        e.currentTarget.setPointerCapture(e.pointerId);
    } catch (_e) {}
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_e) {}
  }
  function moveHomeDoneButtonDrag(e) {
    var s = homeDoneDragRef.current;
    if (!s) return;
    var dx = e.clientX - s.startX,
      dy = e.clientY - s.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) s.moved = true;
    var w = typeof window !== "undefined" ? window.innerWidth : 390,
      h = typeof window !== "undefined" ? window.innerHeight : 760;
    var maxRight = Math.max(8, w - 150),
      maxBottom = Math.max(12, h - 56);
    setHomeDonePos({
      right: Math.min(maxRight, Math.max(8, s.right - dx)),
      bottom: Math.min(maxBottom, Math.max(12, s.bottom - dy)),
    });
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_e) {}
  }
  function endHomeDoneButtonDrag(e) {
    var s = homeDoneDragRef.current;
    homeDoneDragRef.current = null;
    if (!s || !s.moved) closeHomeEdit();
    try {
      e.preventDefault();
      e.stopPropagation();
    } catch (_e) {}
  }
  function floatingDoneButton() {
    return (
      <button
        type="button"
        onClick={function (e) {
          try {
            e.preventDefault();
            e.stopPropagation();
          } catch (_e) {}
          closeHomeEdit();
        }}
        onTouchEnd={function (e) {
          try {
            e.preventDefault();
            e.stopPropagation();
          } catch (_e) {}
          closeHomeEdit();
        }}
        style={{
          position: "fixed",
          right: homeDonePos.right,
          bottom: homeDonePos.bottom,
          zIndex: 9998,
          border: "none",
          background: "#7F77DD",
          color: "#fff",
          borderRadius: 999,
          padding: "12px 16px",
          fontSize: 13,
          fontWeight: 950,
          cursor: "pointer",
          boxShadow: "0 8px 26px rgba(0,0,0,.24)",
          touchAction: "manipulation",
          userSelect: "none",
        }}
      >
        ✓ {L("Fine modifica")}
      </button>
    );
  }
  function settingsPopup() {
    if (!editDraft) return null;
    var item = lib(editDraft.type);
    var params = editDraft.params || {};
    return (
      <div
        onClick={function () {
          setEditDraft(null);
        }}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.48)",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "10vh 14px 2vh",
          boxSizing: "border-box",
          overflowY: "auto",
        }}
      >
        <div
          onClick={function (e) {
            e.stopPropagation();
          }}
          style={{
            width: "min(560px,100%)",
            maxHeight: "88vh",
            overflow: "auto",
            WebkitOverflowScrolling: "touch",
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 22,
            padding: 18,
            boxShadow: "0 22px 70px rgba(0,0,0,.32)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 14,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 950, color: textC }}>
                {item.icon} {item.label}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: subC,
                  lineHeight: 1.45,
                  marginTop: 4,
                }}
              >
                {item.desc || ""}
              </div>
            </div>
            <PopupCloseButton onClick={function () { setEditDraft(null); }} dark={dark} label={L("Chiudi")} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Field label="Titolo">
              {seg(
                [
                  { id: "show", label: "Mostra titolo" },
                  { id: "hide", label: "Nascondi titolo" },
                ],
                params.showTitle === false ? "hide" : "show",
                function (v) {
                  updateDraftParams({ showTitle: v !== "hide" });
                }
              )}
            </Field>
            <Field label="Titolo personalizzato">
              <input
                key={draftTitleKey(editDraft)}
                type="text"
                defaultValue={
                  homeTitleDraftRef.current &&
                  homeTitleDraftRef.current[draftTitleKey(editDraft)] !==
                    undefined
                    ? homeTitleDraftRef.current[draftTitleKey(editDraft)]
                    : params.customTitle || ""
                }
                onChange={function (e) {
                  if (homeTitleDraftRef.current)
                    homeTitleDraftRef.current[draftTitleKey(editDraft)] =
                      e.target.value;
                }}
                onBlur={function (e) {
                  if (homeTitleDraftRef.current)
                    homeTitleDraftRef.current[draftTitleKey(editDraft)] =
                      e.target.value;
                  updateDraftParams({ customTitle: e.target.value });
                }}
                placeholder={item.label}
                style={{ ...inputStyle, width: "100%" }}
              />
            </Field>
            {popupParams(editDraft)}
            <Field label="Grandezza del worklet">
              {seg(
                editDraft.type === "assistant_voice_widget"
                  ? [
                      { id: "1x1", label: "1x1" },
                      { id: "1x2", label: "1x2" },
                      { id: "2x1", label: "2x1" },
                      { id: "2x2", label: "2x2" },
                    ]
                  : [
                      { id: "0.5x", label: "0.5x" },
                      { id: "1x", label: "1x" },
                      { id: "2x", label: "2x" },
                    ],
                editDraft.size || defaultSize(editDraft.type),
                function (v) {
                  updateDraft({ size: v });
                }
              )}
            </Field>
            <Field label="Colore di sfondo">
              <AppColorSelector
                value={editDraft.color || "#FFFFFF"}
                onChange={function (color) {
                  updateDraft({ color: color });
                }}
              />
            </Field>
            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                marginTop: 2,
              }}
            >
              {editDraft.mode !== "add" ? (
                <button
                  type="button"
                  onClick={removeDraft}
                  style={{
                    border: "1px solid #fecaca",
                    background: "#FFF0F0",
                    color: "#E24B4A",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {L("Rimuovi dalla Home")}
                </button>
              ) : (
                <div />
              )}
              <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
                <button
                  type="button"
                  onClick={function () {
                    setEditDraft(null);
                  }}
                  style={{
                    border: "1px solid " + borderC,
                    background: dark ? "#252535" : "#f5f5f5",
                    color: textC,
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  {L("Annulla")}
                </button>
                <button
                  type="button"
                  onClick={applyDraft}
                  style={{
                    border: "none",
                    background: "#7F77DD",
                    color: "#fff",
                    borderRadius: 12,
                    padding: "10px 14px",
                    fontSize: 13,
                    fontWeight: 950,
                    cursor: "pointer",
                  }}
                >
                  {L(
                    editDraft.mode === "add"
                      ? "Aggiungi alla Home"
                      : "Salva impostazioni"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  var now = new Date();
  var quickCards = [
    {
      show: (incomes || []).length === 0,
      icon: "💰",
      id: "quick-income",
      title: L("Registra la tua prima entrata"),
      tab: "spese",
      type: "income",
    },
    {
      show: !(
        budgetPlan &&
        (safeNum(budgetPlan.manualIncome) > 0 ||
          safeNum(budgetPlan.income) > 0 ||
          (budgetPlan.items || []).some(function (i) {
            return safeNum(i.amount) > 0;
          }))
      ),
      icon: "📊",
      id: "quick-budget",
      title: L("Imposta il tuo budget mensile"),
      tab: "budget",
    },
    {
      show: !(goals || []).some(function (g) {
        var d = DEFAULT_GOALS.find(function (x) {
          return x.id === g.id;
        });
        return (
          safeNum(g.saved) > 0 ||
          !!g.deadline ||
          !d ||
          d.name !== g.name ||
          safeNum(d.target) !== safeNum(g.target)
        );
      }),
      icon: "🎯",
      id: "quick-goals",
      title: L("Configura i tuoi obiettivi"),
      tab: "goals",
    },
  ].filter(function (card) {
    return card.show && !(Array.isArray(aiDismissed) ? aiDismissed : []).includes(card.id);
  });
  var available = availableItems();
  var assistantVoiceAlreadyActive = !!insertedTypes()["assistant_voice_widget"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {pendingCount > 0 && (
        <div
          onClick={function () {
            setTab("spese");
            setSpeseSubTab("ricorrenti");
          }}
          style={{
            background: "#fff3cd",
            border: "1px solid #ffeeba",
            borderRadius: 12,
            padding: "12px 16px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: "#856404" }}>
            🔄{" "}
            {String(
              (t && t.recurringPendingHome) ||
                L("{count} ricorrenti da confermare per {month}")
            )
              .replace("{count}", String(pendingCount))
              .replace(
                "{month}",
                monthFullName
                  ? monthFullName(now.getMonth())
                  : MONTHS_FULL[now.getMonth()]
              )}
          </span>
          <span style={{ color: "#856404" }}>›</span>
        </div>
      )}
      {alertTriggered > 0 && (
        <div
          onClick={function () {
            if (markAlertsSeen) markAlertsSeen();
            setTab("alerts");
          }}
          style={{
            background: "#fff0f0",
            border: "1px solid #fcc",
            borderRadius: 12,
            padding: "12px 16px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: 13, color: expenseColor }}>
            🔔 {alertTriggered} {L("alert di spesa superati")}
          </span>
          <span style={{ color: expenseColor }}>›</span>
        </div>
      )}
      {quickCards.length > 0 && !homeEditMode && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr",
            gap: 10,
          }}
        >
          {quickCards.map(function (card) {
            return (
              <div
                key={card.id}
                role="button"
                tabIndex={0}
                onClick={function () {
                  setTab(card.tab);
                  if (card.tab === "spese") {
                    setSpeseSubTab("add");
                    setAddType(card.type);
                    setAddSubTab("single");
                  }
                }}
                onKeyDown={function (e) {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setTab(card.tab);
                    if (card.tab === "spese") {
                      setSpeseSubTab("add");
                      setAddType(card.type);
                      setAddSubTab("single");
                    }
                  }
                }}
                style={{
                  background: cardBg,
                  border: "1px solid " + borderC,
                  borderRadius: 14,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  cursor: "pointer",
                  textAlign: "left",
                  color: textC,
                  boxShadow: dark ? "none" : "0 3px 14px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{ fontSize: 24 }}>{card.icon}</span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>
                  {card.title}
                </span>
                <button
                  type="button"
                  aria-label={L("Nascondi consiglio")}
                  title={L("Nascondi consiglio")}
                  onPointerDown={function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onClick={function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                    dismissHomeAdvice(card.id);
                  }}
                  style={{
                    marginLeft: "auto",
                    width: 26,
                    height: 26,
                    minWidth: 26,
                    borderRadius: 999,
                    border: 0,
                    padding: 0,
                    background: "#FEE2E2",
                    color: "#E24B4A",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: "pointer",
                    position: "relative",
                    zIndex: 2,
                  }}
                >
                  ×
                </button>
                <span style={{ color: subC }}>›</span>
              </div>
            );
          })}
        </div>
      )}
      {secondaryCurrency && secRate && (
        <div
          style={{
            background: dark ? "#252535" : "#f0f8ff",
            borderRadius: 10,
            padding: "8px 14px",
            border: "1px solid " + (dark ? "#334" : "#c8e0ff"),
            fontSize: 12,
            color: dark ? "#8bf" : "#1a5fa8",
          }}
        >
          💱 {L("Conversione")} {currency} → {secondaryCurrency}: 1 {sym} ={" "}
          {secSym}
          {secRate.toFixed(4)} · {L("Tasso aggiornato in tempo reale")}
        </div>
      )}
      {secondaryCurrency && !secRate && !secRateLoading && (
        <div
          style={{
            background: "#FFF8E1",
            borderRadius: 10,
            padding: "8px 14px",
            border: "1px solid #FFD54F",
            fontSize: 12,
            color: "#856404",
          }}
        >
          ⚠️ {L("Impossibile recuperare il tasso")} {currency}/
          {secondaryCurrency}. {L("Controlla la connessione.")}
        </div>
      )}
      {homeEditMode && premiumHome && editHelpBox(false)}
      <div
        onDragOver={function (e) {
          if (homeEditMode && premiumHome) {
            try {
              e.preventDefault();
            } catch (_e) {}
          }
        }}
        onDrop={function (e) {
          if (homeEditMode && premiumHome) dropAt(e, activeWorklets.length);
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,minmax(0,1fr))",
          gridAutoRows: 8,
          gridAutoFlow: "row",
          gap: 14,
        }}
      >
        {activeWorklets.map(function (w, i) {
          return (
            <>
              {homeEditMode && homeDragging && homeDropIndex === i && (
                <div
                  key={"drop_" + i}
                  style={{
                    gridColumn: "1 / -1",
                    height: 8,
                    borderRadius: 999,
                    background: "#7F77DD",
                    opacity: 0.65,
                  }}
                />
              )}
              {workletCard(w, i, false)}
            </>
          );
        })}
        {homeEditMode &&
          homeDragging &&
          homeDropIndex === activeWorklets.length && (
            <div
              style={{
                gridColumn: "1 / -1",
                height: 8,
                borderRadius: 999,
                background: "#7F77DD",
                opacity: 0.65,
              }}
            />
          )}
      </div>
      {homeEditMode && premiumHome && !assistantVoiceAlreadyActive && (
        <button
          type="button"
          onClick={function () {
            openLibrarySettings("assistant_voice_widget");
          }}
          style={{
            width: "100%",
            border: "2px solid #7F77DD",
            background: dark
              ? "linear-gradient(135deg,#29243D,#1D2A3A)"
              : "linear-gradient(135deg,#F0EDFF,#EAF5FF)",
            borderRadius: 18,
            padding: "14px 16px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            cursor: "pointer",
            textAlign: "left",
            boxShadow: dark ? "none" : "0 8px 24px rgba(127,119,221,.16)",
          }}
        >
          <AIGrilloIcon size={52} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 950, color: textC }}>
              {L("Assistente vocale")}
            </div>
            <div
              style={{
                fontSize: 12,
                color: subC,
                lineHeight: 1.4,
                marginTop: 3,
              }}
            >
              {L(
                "Aggiungi il worklet dedicato alla conversazione vocale. Dimensioni: 1x1, 1x2, 2x1 e 2x2."
              )}
            </div>
          </div>
          <span
            style={{
              background: "#7F77DD",
              color: "#fff",
              borderRadius: 999,
              padding: "8px 11px",
              fontSize: 12,
              fontWeight: 950,
              whiteSpace: "nowrap",
            }}
          >
            ＋ {L("Aggiungi")}
          </span>
        </button>
      )}
      {homeEditMode && premiumHome && available.length > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            marginTop: 4,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 950, color: subC }}>
              ＋ {L("Worklet disponibili")}
            </div>
            <div style={{ fontSize: 11, color: subC }}>
              {L(
                "Clicca per configurare o trascina nella posizione desiderata"
              )}
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,minmax(0,1fr))",
              gridAutoRows: 8,
              gridAutoFlow: "row dense",
              gap: 14,
            }}
          >
            {available.map(function (item) {
              var w = {
                id: "available_" + item.type,
                type: item.type,
                size: defaultSize(item.type),
                color: "#FFFFFF",
                params: defaultParams(item.type),
              };
              return workletCard(w, -1, true);
            })}
          </div>
        </div>
      )}
      {homeEditMode &&
        premiumHome &&
        available.length === 0 &&
        assistantVoiceAlreadyActive && (
          <div
            style={{
              fontSize: 12,
              color: subC,
              textAlign: "center",
              padding: "8px 0",
            }}
          >
            {L("Tutti i worklet disponibili sono già presenti nella Home.")}
          </div>
        )}
      {homeEditMode && premiumHome ? (
        editHelpBox(true)
      ) : (
        <button
          type="button"
          onClick={startHomeEdit}
          style={{
            width: "100%",
            border: "1px dashed " + (premiumHome ? "#7F77DD" : "#D6B24B"),
            background: premiumHome
              ? dark
                ? "#24213a"
                : "#F0EDFF"
              : dark
              ? "#2d2514"
              : "#FFF8E1",
            color: premiumHome
              ? dark
                ? "#BEB8FF"
                : "#534AB7"
              : dark
              ? "#ffd58a"
              : "#856404",
            borderRadius: 16,
            padding: "14px 16px",
            fontSize: 14,
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          {premiumHome
            ? "🧩 " + L("Personalizza Home")
            : "🔒 " + L("Personalizza Home") + " · " + L("Piano Completo")}
        </button>
      )}
      {homeEditMode && premiumHome && floatingDoneButton()}
      {settingsPopup()}
    </div>
  );
}

export function SpesePanel() {
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c: any = useApp();
  var {
    lang,
    cats,
    setCats,
    methods,
    setMethods,
    methodGroups,
    setMethodGroups,
    expenseGroups,
  }: any = _c;
  var {
    setExpenseGroups,
    incomeGroups,
    setIncomeGroups,
    incomeTypes,
    customIncomeTypes,
    setCustomIncomeTypes,
    incomeTypeOverrides,
    setIncomeTypeOverrides,
  }: any = _c;
  var {
    recurring,
    setRecurring,
    goals,
    setGoals,
    alerts,
    setAlerts,
    expenses,
    setExpenses,
  }: any = _c;
  var {
    incomes,
    setIncomes,
    sym,
    fmt,
    dark,
    dateFmt,
    curMonthKey,
    addExpenses,
  }: any = _c;
  var {
    addIncomes,
    confirmRecurring,
    catOrder,
    setCatOrder,
    methodOrder,
    setMethodOrder,
    catSortMode,
    setCatSortMode,
  }: any = _c;
  var {
    methodSortMode,
    setMethodSortMode,
    budgetPlan,
    setBudgetPlan,
    btnRadius,
    expenseColor,
    incomeColor,
    isMobile,
  }: any = _c;
  var {
    patrimonioAreas,
    setPatrimonioAreas,
    patrimonioEntries,
    setPatrimonioEntries,
    patrimonioValues,
    setPatrimonioValues,
    patrimonioMode,
    setPatrimonioMode,
  }: any = _c;
  var {
    patrimonioHistory,
    setPatrimonioHistory,
    patrimonioNotes,
    setPatrimonioNotes,
    historyFutureMode,
    setHistoryFutureMode,
    historySortDate,
    setHistorySortDate,
  }: any = _c;
  var {
    historySortDirection,
    setHistorySortDirection,
    appuntiDocuments,
    setAppuntiDocuments,
    appuntiNotes,
    setAppuntiNotes,
    bankCoords,
    setBankCoords,
  }: any = _c;
  var {
    notifPrefs,
    setNotifPrefs,
    customNotifs,
    setCustomNotifs,
    aiDismissed,
    setAiDismissed,
    aiChat,
    setAiChat,
  }: any = _c;
  var {
    aiDataAccess,
    setAiDataAccess,
    aiFloatingEnabled,
    setAiFloatingEnabled,
    secondaryCurrency,
    secRate,
    fmtSec,
    secSym,
  }: any = _c;
  var {
    secRateLoading,
    currency,
    showSecInHistory,
    setShowSecInHistory,
    showSecInStats,
    setShowSecInStats,
    showSecInBudget,
    setShowSecInBudget,
  }: any = _c;
  var {
    showSecInPatrimonio,
    setShowSecInPatrimonio,
    textC,
    subC,
    borderC,
    cardBg,
    inp,
    sb,
  }: any = _c;
  var {
    bgColor,
    tab,
    setTab,
    settingsPage,
    setSettingsPage,
    speseSubTab,
    setSpeseSubTab,
    addType,
  }: any = _c;
  var {
    setAddType,
    addSubTab,
    setAddSubTab,
    historyTab,
    setHistoryTab,
    editingItem,
    setEditingItem,
    mobileMenu,
  }: any = _c;
  var {
    setMobileMenu,
    toast,
    setToast,
    alertPopup,
    setAlertPopup,
    statsView,
    setStatsView,
    curYear,
  }: any = _c;
  var {
    yearExp,
    yearInc,
    monthlyTotals,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filterYear,
  }: any = _c;
  var {
    setFilterYear,
    filterMonth,
    setFilterMonth,
    filterMonths,
    setFilterMonths,
    filterCat,
    setFilterCat,
    filterCats,
  }: any = _c;
  var {
    setFilterCats,
    filterCatExclude,
    setFilterCatExclude,
    filterGroup,
    setFilterGroup,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
  }: any = _c;
  var {
    setFilterDateTo,
    filterAmtMin,
    setFilterAmtMin,
    filterAmtMax,
    setFilterAmtMax,
    filteredExpenses,
    filteredIncomes,
    shareProjects,
  }: any = _c;
  var {
    setShareProjects,
    shareSelectedProjectId,
    setShareSelectedProjectId,
    shareProjectTab,
    setShareProjectTab,
    shareReceivedInvites,
    shareInviteLoading,
    showShareInHistory,
  }: any = _c;
  var {
    setShowShareInHistory,
    confirmButtonColor,
    setConfirmButtonColor,
    secondaryButtonColor,
    firestoreReady,
    userKey,
    userId,
    currentUser,
    pendingCount,
  }: any = _c;
  var {
    alertTriggered,
    getCat,
    getMethod,
    getIT,
    curMonthExp,
    curMonthInc,
    last12Balance,
    aiTab,
  }: any = _c;
  var {
    setAiTab,
    aiLoading,
    setAiLoading,
    aiAdviceFilter,
    setAiAdviceFilter,
    voiceModal,
    setVoiceModal,
    voiceListening,
    openVoiceModal,
  }: any = _c;
  var {
    setVoiceListening,
    voiceText,
    setVoiceText,
    voiceError,
    setVoiceError,
    voiceConfirm,
    setVoiceConfirm,
    voiceSaving,
  }: any = _c;
  var {
    setVoiceSaving,
    voiceParsed,
    setVoiceParsed,
    defaultExpenseCat,
    setDefaultExpenseCat,
    defaultExpenseMethod,
    setDefaultExpenseMethod,
    defaultExpenseArea,
  }: any = _c;
  var {
    setDefaultExpenseArea,
    defaultIncomeType,
    setDefaultIncomeType,
    defaultIncomeArea,
    setDefaultIncomeArea,
    defaultMethodArea,
    setDefaultMethodArea,
    incomeTypeOrder,
  }: any = _c;
  var {
    setIncomeTypeOrder,
    deleteConfirmId,
    setDeleteConfirmId,
    mergeFrom,
    setMergeFrom,
    mergeTo,
    setMergeTo,
    homeBalanceView,
  }: any = _c;
  var {
    setHomeBalanceView,
    firstDayOfWeek,
    setFirstDayOfWeek,
    aiFloatingPos,
    setAiFloatingPos,
    aiFloatingDrag,
    setAiFloatingDrag,
    widgetBgColor,
  }: any = _c;
  var {
    setWidgetBgColor,
    widgetBgAlpha,
    setWidgetBgAlpha,
    widgetExpenseColor,
    setWidgetExpenseColor,
    widgetIncomeColor,
    setWidgetIncomeColor,
    widgetTitle,
  }: any = _c;
  var {
    setWidgetTitle,
    widgetSubtitle,
    setWidgetSubtitle,
    widgetExpenseLabel,
    setWidgetExpenseLabel,
    widgetIncomeLabel,
    setWidgetIncomeLabel,
    widgetShowHeader,
  }: any = _c;
  var {
    setWidgetShowHeader,
    widgetButtonStyle,
    setWidgetButtonStyle,
    widgetVoiceEnabled,
    setWidgetVoiceEnabled,
    widget2Enabled,
    setWidget2Enabled,
    widget2Type,
  }: any = _c;
  var {
    setWidget2Type,
    widget2TitleColor,
    setWidget2TitleColor,
    widget2BodyColor,
    setWidget2BodyColor,
    widget2AccentColor,
    setWidget2AccentColor,
    widget2BgAlpha,
  }: any = _c;
  var {
    setWidget2BgAlpha,
    widget2TextSize,
    setWidget2TextSize,
    widget2MaxChars,
    setWidget2MaxChars,
    widget2AutoUpdate,
    setWidget2AutoUpdate,
    widget2SelectedNoteId,
  }: any = _c;
  var {
    setWidget2SelectedNoteId,
    widget2SelectedBankId,
    setWidget2SelectedBankId,
    widget3Enabled,
    setWidget3Enabled,
    widget3TextColor,
    setWidget3TextColor,
    widget3AccentColor,
  }: any = _c;
  var {
    setWidget3AccentColor,
    widget3PercentColor,
    setWidget3PercentColor,
    widget3BgAlpha,
    setWidget3BgAlpha,
    widget3ShowPercent,
    setWidget3ShowPercent,
    widget3ShowAmounts,
  }: any = _c;
  var {
    setWidget3ShowAmounts,
    widget3AutoUpdate,
    setWidget3AutoUpdate,
    widget3SelectedGoalId,
    setWidget3SelectedGoalId,
    bgTheme,
    setBgTheme,
    btnStyle,
  }: any = _c;
  var {
    setBtnStyle,
    shownAlertIds,
    setShownAlertIds,
    settingsValuesTab,
    setSettingsValuesTab,
  }: any = _c;
  var {
    normalizeEmail,
    loadShareCollaboration,
    acceptShareInvite,
    declineShareInvite,
    createShareInvite,
    createShareProject,
    updateShareProject,
    deleteShareProject,
    canAddPlanItem,
  }: any = _c;
  // ─────────────────────────────────────────────────────────────────────────
  var t = TRANSLATIONS[lang] || TRANSLATIONS.it;
  function L(s) {
    return _c.translateUiRuntimeText ? _c.translateUiRuntimeText(s) : s;
  }
  var now = new Date();
  var sinp: any = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid " + (dark ? "#444" : "#ddd"),
    padding: "8px 10px",
    fontSize: 14,
    background: dark ? "#2a2a3e" : "#fff",
    color: dark ? "#eee" : "#333",
    boxSizing: "border-box",
  };
  function handleAddType(tp) {
    setAddType(tp);
    if (tp === "income" && addSubTab === "receipt") setAddSubTab("single");
  }
  var confirmC = confirmButtonColor || "#7F77DD";
  var secondaryC = secondaryButtonColor || "#5FAFE5";
  function segBtnStyle(active, color, opts) {
    opts = opts || {};
    var c = color || secondaryC;
    return {
      flex: 1,
      padding: isMobile ? "7px 6px" : "8px 9px",
      border: "1px solid " + (active ? c : borderC),
      borderRadius: Math.max(9, Math.min(btnRadius || 10, 11)),
      background: active
        ? dark
          ? c + "33"
          : c + "1f"
        : dark
        ? "rgba(255,255,255,0.035)"
        : "linear-gradient(180deg,#ffffff 0%,#f7f7f7 100%)",
      color: active ? c : subC,
      fontSize: opts.fontSize || (isMobile ? 12 : 13),
      cursor: "pointer",
      fontWeight: active ? 850 : 700,
      boxShadow: dark ? "none" : "0 2px 8px rgba(0,0,0,0.035)",
      position: opts.position || "relative",
      transition: "all .18s ease",
      minHeight: isMobile ? 36 : 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      lineHeight: 1.08,
    };
  }
  function typeBtnStyle(active, color, opts) {
    opts = opts || {};
    var c = color || confirmC;
    return {
      flex: 1,
      padding: isMobile ? "7px 6px" : "8px 9px",
      border: "none",
      borderRadius: Math.max(9, Math.min(btnRadius || 10, 11)),
      background: active
        ? "linear-gradient(135deg," + c + ", " + c + "dd)"
        : dark
        ? "rgba(255,255,255,0.06)"
        : "linear-gradient(180deg,#ffffff 0%,#f7f7f7 100%)",
      color: active ? "#fff" : subC,
      fontSize: opts.fontSize || (isMobile ? 12 : 13),
      cursor: "pointer",
      fontWeight: active ? 850 : 700,
      boxShadow: active
        ? "0 5px 13px " + c + "28"
        : dark
        ? "none"
        : "0 2px 8px rgba(0,0,0,0.045)",
      position: opts.position || "relative",
      transition: "all .18s ease",
      minHeight: isMobile ? 36 : 40,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 4,
      lineHeight: 1.08,
    };
  }
  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 8,
          background: dark ? "#252535" : "#f5f5f5",
          borderRadius: 12,
          padding: 4,
        }}
      >
        <button
          onClick={function () {
            handleAddType("expense");
          }}
          style={typeBtnStyle(addType === "expense", expenseColor)}
        >
          💸 {L(t.expenses)}
        </button>
        <button
          onClick={function () {
            handleAddType("income");
          }}
          style={typeBtnStyle(addType === "income", incomeColor)}
        >
          💰 {L(t.incomes)}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 8,
          background: dark ? "#252535" : "#f5f5f5",
          borderRadius: 12,
          padding: 4,
        }}
      >
        <button
          onClick={function () {
            setSpeseSubTab("add");
          }}
          style={segBtnStyle(speseSubTab === "add", secondaryC)}
        >
          ⚡ {L("Semplice")}
        </button>
        <button
          onClick={function () {
            setSpeseSubTab("recurring");
          }}
          style={segBtnStyle(speseSubTab === "recurring", secondaryC, {
            position: "relative",
          })}
        >
          🔁 {L("Ricorrente")}
          {pendingCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: 4,
                right: 10,
                background: expenseColor,
                color: "#fff",
                borderRadius: "50%",
                width: 16,
                height: 16,
                fontSize: 10,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {pendingCount}
            </span>
          )}
        </button>
      </div>
      {speseSubTab === "add" && (
        <div>
          <div
            style={{
              display: "flex",
              gap: 5,
              marginBottom: 8,
              background: dark ? "#252535" : "#f5f5f5",
              borderRadius: 10,
              padding: 4,
            }}
          >
            <button
              onClick={function () {
                setAddSubTab("single");
              }}
              style={segBtnStyle(addSubTab === "single", secondaryC, {
                fontSize: 12,
              })}
            >
              ⚡ {L(t.single)}
            </button>
            <button
              onClick={function () {
                setAddSubTab("bulk");
              }}
              style={segBtnStyle(addSubTab === "bulk", secondaryC, {
                fontSize: 12,
              })}
            >
              📋 {L(t.multiple)}
            </button>
            {addType === "expense" && (
              <button
                onClick={function () {
                  if (
                    _c.canUsePlanFeature &&
                    !_c.canUsePlanFeature("receiptScan", 1)
                  ) {
                    setToast &&
                      setToast(
                        _c.upgradeMessage
                          ? _c.upgradeMessage("receiptScan")
                          : "Limite scontrini raggiunto"
                      );
                    return;
                  }
                  setAddSubTab("receipt");
                }}
                style={segBtnStyle(addSubTab === "receipt", secondaryC, {
                  fontSize: 12,
                })}
              >
                📷 {L("Scontrino")}
              </button>
            )}
          </div>
          <div
            style={{
              background: dark
                ? "#1e1e30"
                : "linear-gradient(180deg,#ffffff 0%,#f7f6ff 100%)",
              borderRadius: 16,
              border: "1px solid " + borderC,
              padding: isMobile ? 12 : 16,
              boxShadow: dark ? "none" : "0 4px 18px rgba(83,74,183,0.08)",
            }}
          >
            {addSubTab === "single" && (
              <ExpenseForm
                type={addType}
                onSave={function (item) {
                  if (addType === "expense") {
                    addExpenses([item], "manual");
                  } else {
                    addIncomes([item], "manual");
                  }
                }}
              />
            )}{" "}
            {addSubTab === "bulk" && (
              <BulkEntry
                type={addType}
                maxRows={
                  _c.bulkMovementRowLimit
                    ? _c.bulkMovementRowLimit(_c.currentPlan)
                    : undefined
                }
                limitMessage={
                  _c.bulkMovementRowLimit &&
                  _c.bulkMovementRowLimit(_c.currentPlan) !== Infinity
                    ? L(
                        "Il limite delle righe multiple, con il piano attuale, è di "
                      ) + _c.bulkMovementRowLimit(_c.currentPlan)
                    : ""
                }
                onSave={function (items) {
                  if (addType === "expense") {
                    addExpenses(items, "bulk");
                  } else {
                    addIncomes(items, "bulk");
                  }
                }}
              />
            )}{" "}
            {addSubTab === "receipt" && addType === "expense" && (
              <ReceiptScanPanel
                onSave={function (item) {
                  return addExpenses([item], "receipt");
                }}
              />
            )}
          </div>
        </div>
      )}
      {speseSubTab === "recurring" && <RecurringManager />}
    </div>
  );
}

export function HistoryPanel() {
  var _c: any = useApp();
  var {
    lang,
    cats,
    methods,
    expenseGroups,
    incomeTypes,
    expenses,
    setExpenses,
    incomes,
    setIncomes,
    fmt,
    dark,
    dateFmt,
    curMonthKey,
    btnRadius,
    expenseColor,
    incomeColor,
    isMobile,
  }: any = _c;
  var {
    textC,
    subC,
    borderC,
    cardBg,
    inp,
    historyTab,
    setHistoryTab,
    editingItem,
    setEditingItem,
    setToast,
    curYear,
  }: any = _c;
  var {
    searchQuery,
    setSearchQuery,
    filterYear,
    setFilterYear,
    filterMonth,
    setFilterMonth,
    filterMonths,
    setFilterMonths,
    filterCat,
    setFilterCat,
    filterCats,
    setFilterCats,
    filterCatExclude,
    setFilterCatExclude,
    filterMethods,
    setFilterMethods,
    filterAreaPersonal,
    setFilterAreaPersonal,
    filterAreaShare,
    setFilterAreaShare,
    filterGroup,
    setFilterGroup,
  }: any = _c;
  var {
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
    setFilterDateTo,
    filterAmtMin,
    setFilterAmtMin,
    filterAmtMax,
    setFilterAmtMax,
    filteredExpenses,
    filteredIncomes,
  }: any = _c;
  var {
    showShareInHistory,
    setShowShareInHistory,
    confirmButtonColor,
    secondaryButtonColor,
    setNativeBannerSuppressed,
    getCat,
    getMethod,
    getIT,
    secRate,
    showSecInHistory,
    fmtSec,
    historySearchDraftRef,
    deleteConfirmId,
    setDeleteConfirmId,
  }: any = _c;
  var firestoreReady = !!_c.firestoreReady;
  var userKey: any = _c.userKey;
  var [historyCurrencyPriority] = useStorage(
    userKey ? userKey("history_currency_priority_v1") : "history_currency_priority_v1",
    "paid"
  );
  var {
    historySortDate,
    setHistorySortDate,
    historySortDirection,
    setHistorySortDirection,
    historySortSecondary,
    setHistorySortSecondary,
    historySortSecondaryDirection,
    setHistorySortSecondaryDirection,
  }: any = _c;
  var translateUiRuntimeText: any = _c.translateUiRuntimeText;
  var monthShortName: any = _c.monthShortName;
  var monthFullName: any = _c.monthFullName;
  function L(s) {
    return translateUiRuntimeText ? translateUiRuntimeText(s) : s;
  }
  function historyFxView(item) {
    var baseCode = String(item.baseCurrency || _c.currency || "EUR");
    var paidCode = String(item.currency || baseCode);
    var isForeign = paidCode !== baseCode && Number(item.originalAmount) > 0;
    if (!isForeign) return { main: fmt(item.amount), sub: "" };
    var paid = Number(item.originalAmount).toLocaleString(lang || "it", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " " + paidCode;
    var base = fmt(Number(item.baseAmount || item.amount));
    return String(historyCurrencyPriority) === "default"
      ? { main: base, sub: paid }
      : { main: paid, sub: base };
  }
  var t = TRANSLATIONS[lang] || TRANSLATIONS.it;
  var V = t;
  var confirmC = confirmButtonColor || "#378ADD";
  var secondaryC = secondaryButtonColor || "#5FAFE5";
  var fieldOptions = [
    { id: "date", label: "Data Movimento" },
    { id: "created", label: "Data Immissione" },
    { id: "amount", label: "Importo" },
    { id: "category", label: "Categorie" },
  ];
  var dirOptions = [
    { id: "asc", label: "Crescente" },
    { id: "desc", label: "Decrescente" },
  ];
  var [historyVisibleCount, setHistoryVisibleCount] = useState(80);
  var [showSortModal, setShowSortModal] = useState(false);
  var [showFilterModal, setShowFilterModal] = useState(false);
  var [filterSectionsOpen, setFilterSectionsOpen] = useState<any>({
    period: false,
    amount: false,
    category: false,
    methods: false,
    area: false,
  });
  var [sortDraftPrimary, setSortDraftPrimary] = useState(
    normSortField(historySortDate)
  );
  var [sortDraftPrimaryDir, setSortDraftPrimaryDir] = useState(
    historySortDirection || "desc"
  );
  var [sortDraftSecondary, setSortDraftSecondary] = useState(
    normSortField(historySortSecondary || "amount")
  );
  var [sortDraftSecondaryDir, setSortDraftSecondaryDir] = useState(
    historySortSecondaryDirection || "desc"
  );
  var [showMonthSelector, setShowMonthSelector] = useState(false);
  var historyRootRef: any = useRef(null);
  var historyLastScrollRef: any = useRef(0);
  var historyScrollRafRef: any = useRef(0);
  var historyActionsVisibleRef: any = useRef(true);
  var historyScrollQuietUntilRef: any = useRef(0);
  var [historyActionsVisible, setHistoryActionsVisible] = useState(true);

  function historySavedFilterKey() {
    try {
      return userKey
        ? userKey("history_saved_filter_v1")
        : "history_saved_filter_v1";
    } catch (e) {
      return "history_saved_filter_v1";
    }
  }
  function setHistoryDefaultFilters() {
    setSearchQuery("");
    if (historySearchDraftRef) historySearchDraftRef.current = "";
    setFilterYear("all");
    setFilterMonth("");
    setFilterMonths([]);
    setFilterCat("all");
    setFilterCats([]);
    setFilterCatExclude(false);
    setFilterMethods([]);
    setFilterAreaPersonal(true);
    setFilterAreaShare(true);
    if (setShowShareInHistory) setShowShareInHistory(true);
    setFilterGroup("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setFilterAmtMin("");
    setFilterAmtMax("");
    setHistoryTab("all");
    setShowMonthSelector(false);
  }
  function currentHistoryFilterPayload() {
    return {
      searchQuery: searchQuery || "",
      filterYear: filterYear || "all",
      filterMonth: filterMonth || "",
      filterMonths: filterMonths || [],
      filterCat: filterCat || "all",
      filterCats: filterCats || [],
      filterCatExclude: !!filterCatExclude,
      filterMethods: filterMethods || [],
      filterAreaPersonal: !!filterAreaPersonal,
      filterAreaShare: !!filterAreaShare,
      showShareInHistory: !!showShareInHistory,
      filterGroup: filterGroup || "all",
      filterDateFrom: filterDateFrom || "",
      filterDateTo: filterDateTo || "",
      filterAmtMin: filterAmtMin || "",
      filterAmtMax: filterAmtMax || "",
      historyTab: historyTab || "all",
    };
  }
  function applyHistoryFilterPayload(saved) {
    if (!saved || typeof saved !== "object") {
      setHistoryDefaultFilters();
      return;
    }
    setSearchQuery(String(saved.searchQuery || ""));
    if (historySearchDraftRef)
      historySearchDraftRef.current = String(saved.searchQuery || "");
    setFilterYear(saved.filterYear || "all");
    setFilterMonth(saved.filterMonth || "");
    setFilterMonths(
      Array.isArray(saved.filterMonths) ? saved.filterMonths : []
    );
    setFilterCat(saved.filterCat || "all");
    setFilterCats(Array.isArray(saved.filterCats) ? saved.filterCats : []);
    setFilterCatExclude(!!saved.filterCatExclude);
    setFilterMethods(
      Array.isArray(saved.filterMethods) ? saved.filterMethods : []
    );
    setFilterAreaPersonal(
      saved.filterAreaPersonal !== undefined ? !!saved.filterAreaPersonal : true
    );
    setFilterAreaShare(
      saved.filterAreaShare !== undefined ? !!saved.filterAreaShare : true
    );
    if (setShowShareInHistory)
      setShowShareInHistory(
        saved.showShareInHistory !== undefined
          ? !!saved.showShareInHistory
          : true
      );
    setFilterGroup(saved.filterGroup || "all");
    setFilterDateFrom(saved.filterDateFrom || "");
    setFilterDateTo(saved.filterDateTo || "");
    setFilterAmtMin(saved.filterAmtMin || "");
    setFilterAmtMax(saved.filterAmtMax || "");
    setHistoryTab(saved.historyTab || "all");
    setShowMonthSelector(false);
  }
  function saveHistoryFilter() {
    try {
      localStorage.setItem(
        historySavedFilterKey(),
        JSON.stringify({
          ...currentHistoryFilterPayload(),
          savedAt: new Date().toISOString(),
        })
      );
      if (setToast)
        setToast({
          text: L("Filtro salvato"),
          type: "success",
          color: confirmC,
          icon: "✅",
        });
    } catch (e) {
      if (setToast)
        setToast({
          text: L("Errore salvataggio filtro"),
          type: "error",
          color: "#E24B4A",
          icon: "🚫",
        });
    }
  }
  useEffect(function () {
    try {
      var raw = localStorage.getItem(historySavedFilterKey());
      if (raw) {
        applyHistoryFilterPayload(JSON.parse(raw));
      } else {
        setHistoryDefaultFilters();
      }
    } catch (e) {
      setHistoryDefaultFilters();
    }
  }, []);

  useEffect(
    function () {
      historyActionsVisibleRef.current = historyActionsVisible;
    },
    [historyActionsVisible]
  );

  useEffect(
    function () {
      var open = showSortModal || showFilterModal;
      if (setNativeBannerSuppressed) setNativeBannerSuppressed(!!open);
      if (open) {
        try {
          var cap = (window as any).Capacitor;
          var ads = cap && cap.Plugins && cap.Plugins.FainanceAds;
          if (ads && ads.hideBanner) ads.hideBanner({});
        } catch (e) {}
      }
      return function () {
        if (setNativeBannerSuppressed) setNativeBannerSuppressed(false);
      };
    },
    [showSortModal, showFilterModal]
  );

  useEffect(
    function () {
      setHistoryVisibleCount(80);
      historyActionsVisibleRef.current = true;
      historyScrollQuietUntilRef.current = Date.now() + 120;
      setHistoryActionsVisible(true);
    },
    [
      historyTab,
      filterYear,
      filterMonth,
      JSON.stringify(filterMonths || []),
      searchQuery,
      filterCat,
      JSON.stringify(filterCats || []),
      filterCatExclude,
      JSON.stringify(filterMethods || []),
      filterAreaPersonal,
      filterAreaShare,
      filterGroup,
      filterDateFrom,
      filterDateTo,
      filterAmtMin,
      filterAmtMax,
      historySortDate,
      historySortDirection,
      historySortSecondary,
      historySortSecondaryDirection,
    ]
  );

  useEffect(function () {
    function scrollTopOf(target) {
      return target === window
        ? window.pageYOffset ||
            document.documentElement.scrollTop ||
            document.body.scrollTop ||
            0
        : target.scrollTop || 0;
    }
    function findScrollTarget() {
      var node: any = historyRootRef.current;
      var p = node && node.parentElement;
      while (p && p !== document.body) {
        try {
          var st = window.getComputedStyle ? window.getComputedStyle(p) : null;
          var oy = st ? String(st.overflowY || "") : "";
          if (oy === "auto" || oy === "scroll" || oy === "overlay") return p;
        } catch (e) {}
        if (p.scrollHeight > p.clientHeight + 40) return p;
        p = p.parentElement;
      }
      return window;
    }
    var target: any = findScrollTarget();
    historyLastScrollRef.current = scrollTopOf(target);
    function setHistoryActionsVisibleStable(next, y) {
      if (historyActionsVisibleRef.current === next) {
        historyLastScrollRef.current = y;
        return;
      }
      historyActionsVisibleRef.current = next;
      setHistoryActionsVisible(next);
      historyScrollQuietUntilRef.current = Date.now() + 220;
      historyLastScrollRef.current = y;
    }
    function onScroll() {
      if (historyScrollRafRef.current) return;
      historyScrollRafRef.current = requestAnimationFrame(function () {
        historyScrollRafRef.current = 0;
        var y = scrollTopOf(target);
        var nowMs = Date.now();
        if (nowMs < historyScrollQuietUntilRef.current) {
          historyLastScrollRef.current = y;
          return;
        }
        var diff = y - historyLastScrollRef.current;
        if (y <= 6) {
          setHistoryActionsVisibleStable(true, y);
          return;
        }
        if (diff <= -3) {
          setHistoryActionsVisibleStable(true, y);
          return;
        }
        if (diff >= 12) {
          setHistoryActionsVisibleStable(false, y);
          return;
        }
      });
    }
    try {
      target.addEventListener("scroll", onScroll, { passive: true });
    } catch (e) {}
    return function () {
      try {
        target.removeEventListener("scroll", onScroll);
      } catch (e) {}
      try {
        if (historyScrollRafRef.current)
          cancelAnimationFrame(historyScrollRafRef.current);
      } catch (e) {}
    };
  }, []);

  var availableYears = useMemo(
    function () {
      var yrs: any = new Set(
        [...(expenses || []), ...(incomes || [])]
          .map(function (e: any) {
            return e.date ? String(e.date).slice(0, 4) : null;
          })
          .filter(Boolean)
      );
      return [
        "all",
        ...Array.from(yrs).sort(function (a: any, b: any) {
          return String(b).localeCompare(String(a));
        }),
      ];
    },
    [expenses, incomes]
  );
  var grps = expenseGroups || DEFAULT_EXPENSE_GROUPS;
  var expenseFilterActive =
    (filterCat && filterCat !== "all") ||
    (filterCats && filterCats.length > 0) ||
    (filterGroup && filterGroup !== "all") ||
    (filterMethods && filterMethods.length > 0) ||
    filterAreaShare === false;

  function normSortField(v) {
    if (v === "operation") return "date";
    if (v === "immission") return "created";
    if (v === "created") return "created";
    if (v === "amount") return "amount";
    if (v === "category") return "category";
    return "date";
  }
  function categorySortLabel(item) {
    if (item && item._historyKind === "income") {
      var it = getIT ? getIT(item.type) : null;
      return String((it && it.name) || item.type || "");
    }
    var c = getCat ? getCat(item.catId) : null;
    return String((c && c.name) || item.catName || item.catId || "");
  }
  function sortValue(item, field) {
    var f = normSortField(field);
    if (f === "amount") return Number(item.amount) || 0;
    if (f === "created")
      return item.createdAt
        ? String(item.createdAt)
        : item.id
        ? String(item.id)
        : "";
    if (f === "category") return categorySortLabel(item).toLowerCase();
    return item.date || "";
  }
  function compareField(a, b, field, dir) {
    var f = normSortField(field);
    var av = sortValue(a, f),
      bv = sortValue(b, f);
    if (av === bv) return 0;
    var res =
      f === "amount"
        ? Number(av) > Number(bv)
          ? 1
          : -1
        : String(av) > String(bv)
        ? 1
        : -1;
    return dir === "asc" ? res : -res;
  }
  function sortLocal(list) {
    return list.slice().sort(function (a, b) {
      var first = compareField(a, b, historySortDate, historySortDirection);
      if (first !== 0) return first;
      return compareField(
        a,
        b,
        historySortSecondary || "amount",
        historySortSecondaryDirection || "desc"
      );
    });
  }
  function displaySortLabel(field, dir) {
    var f = normSortField(field);
    var lab = fieldOptions.find(function (x) {
      return x.id === f;
    });
    var d = dirOptions.find(function (x) {
      return x.id === (dir || "desc");
    });
    return (
      L(lab ? lab.label : "Data Movimento") +
      " · " +
      L(d ? d.label : "Decrescente")
    );
  }
  function openSort() {
    setSortDraftPrimary(normSortField(historySortDate));
    setSortDraftPrimaryDir(historySortDirection || "desc");
    setSortDraftSecondary(normSortField(historySortSecondary || "amount"));
    setSortDraftSecondaryDir(historySortSecondaryDirection || "desc");
    setShowSortModal(true);
  }
  function applySort() {
    setHistorySortDate(sortDraftPrimary);
    setHistorySortDirection(sortDraftPrimaryDir);
    setHistorySortSecondary(sortDraftSecondary);
    setHistorySortSecondaryDirection(sortDraftSecondaryDir);
    setShowSortModal(false);
  }
  function clearFilters() {
    setHistoryDefaultFilters();
  }
  function activeTypeLabel() {
    return historyTab === "incomes"
      ? L("Entrate")
      : historyTab === "expenses"
      ? L("Uscite")
      : L("Entrate") + " + " + L("Uscite");
  }
  function historyKindActive(kind) {
    return kind === "expenses"
      ? historyTab !== "incomes"
      : historyTab !== "expenses";
  }
  function toggleHistoryKind(kind) {
    var ex = historyTab !== "incomes";
    var inc = historyTab !== "expenses";
    if (kind === "expenses") ex = !ex;
    else inc = !inc;
    if (!ex && !inc) {
      ex = true;
      inc = true;
    }
    setHistoryTab(ex && inc ? "all" : ex ? "expenses" : "incomes");
  }

  var historyRows = useMemo(
    function () {
      var ex = (filteredExpenses || []).map(function (x: any) {
        return { ...x, _historyKind: "expense" };
      });
      var incAll = (filteredIncomes || []).map(function (x: any) {
        return { ...x, _historyKind: "income" };
      });
      if (historyTab === "expenses") return ex;
      if (historyTab === "incomes") return incAll;
      return sortLocal(ex.concat(incAll));
    },
    [
      filteredExpenses,
      filteredIncomes,
      historyTab,
      expenseFilterActive,
      historySortDate,
      historySortDirection,
      historySortSecondary,
      historySortSecondaryDirection,
      cats,
    ]
  );
  var visibleRows = historyRows.slice(0, historyVisibleCount);

  function appButton(active, customColor) {
    var c = customColor || secondaryC;
    return {
      border: "1px solid " + (active ? c : borderC),
      background: active ? c : dark ? "#252535" : "#fff",
      color: active ? "#fff" : textC,
      borderRadius: btnRadius,
      padding: "9px 12px",
      fontSize: 13,
      fontWeight: 850,
      cursor: "pointer",
      boxShadow: active ? "0 5px 14px " + c + "28" : "none",
    };
  }
  function primaryButton() {
    return {
      border: "1px solid " + confirmC,
      background: confirmC,
      color: "#fff",
      borderRadius: btnRadius,
      padding: "9px 12px",
      fontSize: 13,
      fontWeight: 900,
      cursor: "pointer",
      boxShadow: "0 5px 14px " + confirmC + "28",
    };
  }
  function modalBase() {
    return {
      position: "fixed",
      zIndex: 9999,
      inset: 0,
      background: dark ? "#171724" : "#F7F8FF",
      color: textC,
      overflowY: "auto",
      boxSizing: "border-box",
      padding: isMobile
        ? "calc(env(safe-area-inset-top, 0px) + 22px) 16px calc(env(safe-area-inset-bottom, 0px) + 26px)"
        : "28px max(24px,calc((100vw - 760px)/2)) 34px",
    };
  }
  function sectionStyle() {
    return {
      background: cardBg,
      border: "1px solid " + borderC,
      borderRadius: 18,
      padding: isMobile ? 14 : 18,
      boxShadow: dark ? "none" : "0 8px 26px rgba(15,23,42,.07)",
      marginBottom: 14,
    };
  }
  function modalHeader(title, closeFn) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 22, fontWeight: 950, color: textC }}>
            {title}
          </div>
          <div style={{ fontSize: 12, color: subC, marginTop: 3 }}>
            {L("Storico movimenti")}
          </div>
        </div>
        <PopupCloseButton onClick={closeFn} dark={dark} label={L("Chiudi")} />
      </div>
    );
  }
  function selectableLabel(label, active) {
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          width: "100%",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 950 }}>
          {active ? "✓" : "○"}
        </span>
        <span>{label}</span>
      </span>
    );
  }
  function toggleButton(label, active, onClick, color) {
    return (
      <button type="button" onClick={onClick} style={appButton(active, color)}>
        {selectableLabel(L(label), active)}
      </button>
    );
  }
  function choiceGrid(value, setter, items, cols) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile
            ? "1fr 1fr"
            : "repeat(" + (cols || items.length) + ",1fr)",
          gap: 8,
        }}
      >
        {items.map(function (it) {
          var active = value === it.id;
          return (
            <button
              key={it.id}
              onClick={function () {
                setter(it.id);
              }}
              style={appButton(active)}
            >
              {selectableLabel(L(it.label), active)}
            </button>
          );
        })}
      </div>
    );
  }
  function sortSection(title, value, setValue, dir, setDir) {
    return (
      <div style={sectionStyle()}>
        <div
          style={{
            fontSize: 16,
            fontWeight: 950,
            color: textC,
            marginBottom: 12,
          }}
        >
          {title}
        </div>
        <div style={{ marginBottom: 10 }}>
          {choiceGrid(dir, setDir, dirOptions, 2)}
        </div>
        {choiceGrid(value, setValue, fieldOptions, 2)}
      </div>
    );
  }
  function searchBox() {
    return (
      <div style={{ position: "relative" }}>
        <span
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            fontSize: 14,
            color: "#aaa",
          }}
        >
          🔍
        </span>
        <input
          type="text"
          placeholder={t.search}
          value={searchQuery}
          onChange={function (e) {
            if (historySearchDraftRef)
              historySearchDraftRef.current = e.target.value;
            setSearchQuery(e.target.value);
          }}
          style={{
            ...inp,
            width: "100%",
            paddingLeft: 34,
            paddingRight: searchQuery ? 34 : 10,
            boxSizing: "border-box",
          }}
        />
        {searchQuery && (
          <button
            onClick={function () {
              if (historySearchDraftRef) historySearchDraftRef.current = "";
              setSearchQuery("");
            }}
            style={{
              position: "absolute",
              right: 8,
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              cursor: "pointer",
              color: confirmC,
              fontSize: 16,
              fontWeight: 950,
            }}
          >
            ×
          </button>
        )}
      </div>
    );
  }
  function monthButtons() {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4,1fr)",
          gap: 7,
        }}
      >
        {Array.from({ length: 12 }, function (_, i) {
          var mk =
            (filterYear && filterYear !== "all"
              ? filterYear
              : String(curYear)) +
            "-" +
            String(i + 1).padStart(2, "0");
          var active = (filterMonths || []).includes(mk);
          return (
            <button
              key={mk}
              onClick={function () {
                setFilterMonth("");
                setFilterMonths(function (list) {
                  return (list || []).includes(mk)
                    ? list.filter(function (x) {
                        return x !== mk;
                      })
                    : (list || []).concat([mk]);
                });
              }}
              style={{ ...appButton(active), padding: "8px 6px", fontSize: 11 }}
            >
              {selectableLabel(
                monthShortName ? monthShortName(i) : MONTHS_SHORT[i],
                active
              )}
            </button>
          );
        })}
      </div>
    );
  }
  function prefixedCatId(kind, id) {
    return kind + ":" + String(id);
  }
  function isCatActive(kind, id) {
    var key = prefixedCatId(kind, id);
    return (
      (filterCats || []).map(String).includes(key) ||
      (kind === "expense" &&
        (filterCats || []).map(String).includes(String(id)))
    );
  }
  function togglePrefixedCat(kind, id) {
    var key = prefixedCatId(kind, id);
    setFilterCat("all");
    setFilterCats(function (list) {
      var base = (list || []).map(String).filter(function (x) {
        return !(kind === "expense" && x === String(id));
      });
      return base.includes(key)
        ? base.filter(function (x) {
            return x !== key;
          })
        : base.concat([key]);
    });
  }
  function isMethodActive(id) {
    return (filterMethods || []).map(String).includes(String(id));
  }
  function toggleMethod(id) {
    setFilterMethods(function (list) {
      var key = String(id);
      var base = (list || []).map(String);
      return base.includes(key)
        ? base.filter(function (x) {
            return x !== key;
          })
        : base.concat([key]);
    });
  }
  function exactAmountValue() {
    return filterAmtMin &&
      filterAmtMax &&
      String(filterAmtMin) === String(filterAmtMax)
      ? String(filterAmtMin)
      : "";
  }
  function setExactAmountValue(v) {
    setFilterAmtMin(v);
    setFilterAmtMax(v);
  }
  function incomeTypeItems() {
    return (incomeTypes || []).filter(function (x) {
      return x && x.id && !x.deleted && !x.archived;
    });
  }
  function activeExpenseFilterCats() {
    return (cats || []).filter(function (c) {
      return c && c.id && !c.deleted && !c.archived;
    });
  }
  function activeFilterMethods() {
    return (methods || []).filter(function (m) {
      return m && m.id && !m.deleted && !m.archived;
    });
  }
  function categoryButtons(items, kind) {
    return (
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {(items || [])
          .filter(function (c) {
            return c && c.id && !c.deleted && !c.archived;
          })
          .map(function (c) {
            var id = String(c.id);
            var active = isCatActive(kind, id);
            var col = c.color || confirmC;
            return (
              <button
                type="button"
                key={kind + id}
                onClick={function () {
                  togglePrefixedCat(kind, id);
                }}
                style={{
                  padding: "8px 11px",
                  borderRadius: 999,
                  border:
                    "1px solid " +
                    (active ? col : dark ? "#46465d" : "#D7DEEA"),
                  background: active ? col : dark ? "#242438" : "#FFFFFF",
                  color: active ? "#fff" : textC,
                  fontSize: 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  boxShadow: active
                    ? "0 5px 14px " + col + "30"
                    : dark
                    ? "none"
                    : "0 2px 8px rgba(15,23,42,.05)",
                }}
              >
                {active ? "✓ " : ""}
                {c.icon || "🏷️"} {L(c.name)}
              </button>
            );
          })}
      </div>
    );
  }
  function toggleFilterSection(id) {
    setFilterSectionsOpen(function (prev) {
      return { ...(prev || {}), [id]: !(prev && prev[id]) };
    });
  }
  function fixedHistoryLabel(key) {
    var code = String(lang || "it").split("-")[0];
    var labels: any = {
      exactAmount: {
        it: "Importo esatto",
        en: "Exact amount",
        es: "Importe exacto",
        fr: "Montant exact",
        de: "Exakter Betrag",
        pt: "Valor exato",
        pl: "Dokładna kwota",
        nl: "Exact bedrag",
        ro: "Sumă exactă",
        el: "Ακριβές ποσό",
      },
      from: {
        it: "Da",
        en: "From",
        es: "Desde",
        fr: "De",
        de: "Von",
        pt: "De",
        pl: "Od",
        nl: "Van",
        ro: "De la",
        el: "Από",
      },
      to: {
        it: "A",
        en: "To",
        es: "Hasta",
        fr: "À",
        de: "Bis",
        pt: "Até",
        pl: "Do",
        nl: "Tot",
        ro: "Până la",
        el: "Έως",
      },
    };
    return (
      (labels[key] && labels[key][code]) ||
      (labels[key] && labels[key].it) ||
      key
    );
  }
  function filterSectionSummary(id) {
    if (id === "period") {
      if (filterDateFrom || filterDateTo)
        return [filterDateFrom || "…", filterDateTo || "…"].join(" → ");
      if ((filterMonths || []).length)
        return (
          String((filterMonths || []).length) + " " + L("mesi selezionati")
        );
      if (filterMonth) return L("Mese selezionato");
      if (filterYear && filterYear !== "all") return String(filterYear);
      return L("Tutto il periodo");
    }
    if (id === "amount") {
      var exact = exactAmountValue();
      if (exact) return fixedHistoryLabel("exactAmount") + ": " + exact;
      if (filterAmtMin || filterAmtMax)
        return (filterAmtMin || "0") + " – " + (filterAmtMax || "∞");
      return L("Qualsiasi importo");
    }
    if (id === "category") {
      var count = (filterCats || []).length;
      return count
        ? String(count) + " " + L("selezionate")
        : L("Tutte le categorie");
    }
    if (id === "methods") {
      var count = (filterMethods || []).length;
      return count
        ? String(count) + " " + L("selezionati")
        : L("Tutti i metodi");
    }
    if (id === "area") {
      if (filterAreaPersonal && filterAreaShare) return L("Personale e Share");
      if (filterAreaPersonal) return L("Personale");
      if (filterAreaShare) return "Share";
      return L("Nessuna area");
    }
    return "";
  }
  function accordionSection(id, title, children, accent) {
    var open = !!(filterSectionsOpen && filterSectionsOpen[id]);
    return (
      <div
        style={{
          background: cardBg,
          border: "1px solid " + borderC,
          borderRadius: 14,
          marginBottom: 10,
          overflow: "hidden",
          boxShadow: dark ? "none" : "0 3px 12px rgba(15,23,42,.045)",
        }}
      >
        <button
          type="button"
          onClick={function () {
            toggleFilterSection(id);
          }}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "12px 14px",
            border: "none",
            background: open ? (dark ? "#232337" : "#FBFCFF") : "transparent",
            color: textC,
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 9,
              minWidth: 0,
            }}
          >
            <span
              style={{
                width: 4,
                height: 28,
                borderRadius: 4,
                background: accent || confirmC,
                flexShrink: 0,
              }}
            />
            <span style={{ minWidth: 0 }}>
              <span style={{ display: "block", fontSize: 14, fontWeight: 950 }}>
                {title}
              </span>
              <span
                style={{
                  display: "block",
                  fontSize: 11,
                  color: subC,
                  marginTop: 2,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {filterSectionSummary(id)}
              </span>
            </span>
          </span>
          <span
            style={{
              fontSize: 18,
              color: subC,
              transform: open ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform .16s ease",
              flexShrink: 0,
            }}
          >
            ⌄
          </span>
        </button>
        {open && (
          <div
            style={{
              padding: "4px 14px 14px",
              borderTop: "1px solid " + borderC,
            }}
          >
            {children}
          </div>
        )}
      </div>
    );
  }
  function renderFilterModal() {
    return (
      <div style={modalBase()}>
        {modalHeader(L("Filtra"), function () {
          setShowFilterModal(false);
        })}
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 950,
              color: textC,
              marginBottom: 9,
            }}
          >
            {L("Filtra per")}
          </div>
          <div
            style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}
          >
            {toggleButton(
              "Entrate",
              historyKindActive("incomes"),
              function () {
                toggleHistoryKind("incomes");
              },
              incomeColor
            )}
            {toggleButton(
              "Uscite",
              historyKindActive("expenses"),
              function () {
                toggleHistoryKind("expenses");
              },
              expenseColor
            )}
          </div>
        </div>
        <div
          style={{
            background: cardBg,
            border: "1px solid " + borderC,
            borderRadius: 14,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 950,
              color: textC,
              marginBottom: 9,
            }}
          >
            {L("Parola chiave")}
          </div>
          {searchBox()}
        </div>
        {accordionSection(
          "period",
          L("Periodo"),
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                alignItems: "end",
                paddingTop: 10,
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 850, color: subC }}>
                {L("Anno")}
                <select
                  value={filterYear}
                  onChange={function (e) {
                    setFilterYear(e.target.value);
                    setFilterMonth("");
                  }}
                  style={{ ...inp, width: "100%", marginTop: 5 }}
                >
                  {availableYears.map(function (y: any) {
                    return (
                      <option key={y} value={y}>
                        {y === "all" ? L("Tutti gli anni") : y}
                      </option>
                    );
                  })}
                </select>
              </label>
              <label style={{ fontSize: 11, fontWeight: 850, color: subC }}>
                {L("Mese")}
                <select
                  value={filterMonth}
                  onChange={function (e) {
                    setFilterMonth(e.target.value);
                    setFilterMonths([]);
                  }}
                  style={{ ...inp, width: "100%", marginTop: 5 }}
                >
                  <option value="">{L("Tutti i mesi")}</option>
                  {Array.from({ length: 12 }, function (_, i) {
                    var m = String(i + 1).padStart(2, "0");
                    var key =
                      (filterYear && filterYear !== "all"
                        ? filterYear
                        : String(curYear)) +
                      "-" +
                      m;
                    return (
                      <option key={m} value={key}>
                        {monthFullName ? monthFullName(i) : MONTHS_FULL[i]}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                marginTop: 10,
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 850, color: subC }}>
                {L("Data da")}
                <input
                  type="date"
                  value={filterDateFrom}
                  onChange={function (e) {
                    setFilterDateFrom(e.target.value);
                  }}
                  style={{ ...inp, width: "100%", marginTop: 5 }}
                />
              </label>
              <label style={{ fontSize: 11, fontWeight: 850, color: subC }}>
                {L("Data a")}
                <input
                  type="date"
                  value={filterDateTo}
                  onChange={function (e) {
                    setFilterDateTo(e.target.value);
                  }}
                  style={{ ...inp, width: "100%", marginTop: 5 }}
                />
              </label>
            </div>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={function () {
                  setFilterDateFrom("");
                  setFilterDateTo("");
                  setFilterMonth(curMonthKey);
                  setFilterMonths([]);
                }}
                style={appButton(false)}
              >
                {L("Mese corrente")}
              </button>
              <button
                type="button"
                onClick={function () {
                  setFilterMonth("");
                  setFilterMonths([]);
                  setFilterDateFrom(dateOffset(30));
                  setFilterDateTo(todayStr());
                }}
                style={appButton(false)}
              >
                {L("Ultimi 30 giorni")}
              </button>
            </div>
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={function () {
                  setShowMonthSelector(!showMonthSelector);
                }}
                style={{ ...appButton(showMonthSelector), width: "100%" }}
              >
                {showMonthSelector ? "✓ " : ""}
                {L("Seleziona Mesi")}
              </button>
              {showMonthSelector && (
                <div style={{ marginTop: 10 }}>{monthButtons()}</div>
              )}
            </div>
          </>,
          "#7F77DD"
        )}
        {accordionSection(
          "amount",
          L("Importo"),
          <>
            <label
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: subC,
                display: "block",
                paddingTop: 10,
                marginBottom: 10,
              }}
            >
              {fixedHistoryLabel("exactAmount")}
              <input
                value={exactAmountValue()}
                onChange={function (e) {
                  setExactAmountValue(e.target.value);
                }}
                inputMode="decimal"
                placeholder="0"
                style={{ ...inp, width: "100%", marginTop: 5 }}
              />
            </label>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 10,
                alignItems: "end",
              }}
            >
              <label style={{ fontSize: 11, fontWeight: 900, color: subC }}>
                {fixedHistoryLabel("from")}
                <input
                  value={filterAmtMin}
                  onChange={function (e) {
                    setFilterAmtMin(e.target.value);
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  style={{ ...inp, width: "100%", marginTop: 5 }}
                />
              </label>
              <label style={{ fontSize: 11, fontWeight: 900, color: subC }}>
                {fixedHistoryLabel("to")}
                <input
                  value={filterAmtMax}
                  onChange={function (e) {
                    setFilterAmtMax(e.target.value);
                  }}
                  inputMode="decimal"
                  placeholder="0"
                  style={{ ...inp, width: "100%", marginTop: 5 }}
                />
              </label>
            </div>
          </>,
          "#F59E0B"
        )}
        {accordionSection(
          "category",
          L("Categoria"),
          <>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                paddingTop: 10,
                marginBottom: 12,
              }}
            >
              {toggleButton(
                "Includi Categorie",
                !filterCatExclude,
                function () {
                  setFilterCatExclude(false);
                }
              )}
              {toggleButton(
                "Escludi Categorie",
                !!filterCatExclude,
                function () {
                  setFilterCatExclude(true);
                }
              )}
            </div>
            {historyKindActive("expenses") && (
              <div
                style={{
                  background: dark ? "#2B2024" : "#FFF7F7",
                  border: "1px solid " + (dark ? "#59343C" : "#FFD7D7"),
                  borderRadius: 12,
                  padding: 11,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 13,
                    fontWeight: 950,
                    color: expenseColor,
                    marginBottom: 9,
                  }}
                >
                  <span>🔴</span>
                  {L("Categorie Uscite")}
                </div>
                {categoryButtons(activeExpenseFilterCats(), "expense")}
              </div>
            )}
            {historyKindActive("incomes") && (
              <div
                style={{
                  background: dark ? "#172D28" : "#F1FCF8",
                  border: "1px solid " + (dark ? "#285449" : "#BDEDDD"),
                  borderRadius: 12,
                  padding: 11,
                  marginBottom: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                    fontSize: 13,
                    fontWeight: 950,
                    color: incomeColor,
                    marginBottom: 9,
                  }}
                >
                  <span>🟢</span>
                  {L("Categorie Entrate")}
                </div>
                {categoryButtons(incomeTypeItems(), "income")}
              </div>
            )}
            {historyKindActive("expenses") &&
              showShareInHistory &&
              filterAreaShare && (
                <div
                  style={{
                    background: dark ? "#252239" : "#F5F3FF",
                    border: "1px solid " + (dark ? "#4C456B" : "#DDD6FE"),
                    borderRadius: 12,
                    padding: 11,
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 950,
                      color: confirmC,
                      marginBottom: 8,
                    }}
                  >
                    🤝 Share
                  </div>
                  <button
                    type="button"
                    onClick={function () {
                      setFilterCat("all");
                      setFilterCats(function (list) {
                        var base = (list || []).map(String);
                        return base.includes("share")
                          ? base.filter(function (x) {
                              return x !== "share";
                            })
                          : base.concat(["share"]);
                      });
                    }}
                    style={{
                      padding: "8px 11px",
                      borderRadius: 999,
                      border:
                        "1px solid " +
                        ((filterCats || []).includes("share")
                          ? confirmC
                          : borderC),
                      background: (filterCats || []).includes("share")
                        ? confirmC
                        : dark
                        ? "#242438"
                        : "#fff",
                      color: (filterCats || []).includes("share")
                        ? "#fff"
                        : textC,
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    {(filterCats || []).includes("share") ? "✓ " : ""}🤝 Share
                  </button>
                </div>
              )}
            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                marginTop: 12,
              }}
            >
              <button
                type="button"
                onClick={function () {
                  var all: any[] = [];
                  if (historyKindActive("expenses")) {
                    activeExpenseFilterCats().forEach(function (c) {
                      all.push("expense:" + String(c.id));
                    });
                    if (showShareInHistory && filterAreaShare)
                      all.push("share");
                  }
                  if (historyKindActive("incomes")) {
                    incomeTypeItems().forEach(function (c) {
                      all.push("income:" + String(c.id));
                    });
                  }
                  setFilterCats(all);
                  setFilterCat("all");
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: confirmC,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {L("Seleziona tutte")}
              </button>
              <button
                type="button"
                onClick={function () {
                  setFilterCats([]);
                  setFilterCat("all");
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  color: subC,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                {L("Pulisci")}
              </button>
            </div>
          </>,
          "#10B981"
        )}
        {historyKindActive("expenses") &&
          accordionSection(
            "methods",
            L("Metodi di pagamento"),
            <>
              <div
                style={{
                  display: "flex",
                  gap: 7,
                  flexWrap: "wrap",
                  paddingTop: 10,
                }}
              >
                {activeFilterMethods().map(function (m) {
                  var active = isMethodActive(m.id);
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={function () {
                        toggleMethod(m.id);
                      }}
                      style={{
                        padding: "8px 11px",
                        borderRadius: 999,
                        border:
                          "1px solid " +
                          (active
                            ? m.color || confirmC
                            : dark
                            ? "#46465d"
                            : "#D7DEEA"),
                        background: active
                          ? m.color || confirmC
                          : dark
                          ? "#242438"
                          : "#fff",
                        color: active ? "#fff" : textC,
                        fontSize: 12,
                        fontWeight: 900,
                        cursor: "pointer",
                        boxShadow: active
                          ? "0 5px 14px " + (m.color || confirmC) + "30"
                          : "none",
                      }}
                    >
                      {active ? "✓ " : ""}
                      {m.icon || "💳"} {L(m.name)}
                    </button>
                  );
                })}
              </div>
              <div style={{ marginTop: 10 }}>
                <button
                  type="button"
                  onClick={function () {
                    setFilterMethods([]);
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: subC,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 900,
                  }}
                >
                  {L("Pulisci metodi")}
                </button>
              </div>
            </>,
            "#3B82F6"
          )}
        {accordionSection(
          "area",
          L("Area"),
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              paddingTop: 10,
            }}
          >
            {toggleButton(
              "Personale",
              !!filterAreaPersonal,
              function () {
                if (filterAreaPersonal && filterAreaShare) {
                  setFilterAreaPersonal(false);
                } else {
                  setFilterAreaPersonal(true);
                }
              },
              secondaryC
            )}
            {toggleButton(
              "Share",
              !!filterAreaShare,
              function () {
                if (filterAreaShare && filterAreaPersonal) {
                  setFilterAreaShare(false);
                } else {
                  setFilterAreaShare(true);
                }
              },
              secondaryC
            )}
          </div>,
          "#8B5CF6"
        )}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            position: "sticky",
            bottom: 0,
            background: dark ? "#171724" : "#F7F8FF",
            paddingTop: 10,
          }}
        >
          <button
            type="button"
            onClick={function () {
              setShowFilterModal(false);
            }}
            style={{
              ...primaryButton(),
              gridColumn: "1 / -1",
              padding: "16px 18px",
              fontSize: 16,
              minHeight: 52,
            }}
          >
            {L("Filtra")}
          </button>
          <button
            type="button"
            onClick={clearFilters}
            style={{
              ...appButton(true, secondaryC),
              padding: "13px 16px",
              fontWeight: 900,
            }}
          >
            {L("Pulisci filtri")}
          </button>
          <button
            type="button"
            onClick={saveHistoryFilter}
            style={{
              ...appButton(true, secondaryC),
              padding: "13px 16px",
              fontWeight: 900,
            }}
          >
            {L("Salva filtro")}
          </button>
        </div>
      </div>
    );
  }
  function renderSortModal() {
    return (
      <div style={modalBase()}>
        {modalHeader(L("Ordina"), function () {
          setShowSortModal(false);
        })}
        {sortSection(
          L("Filtra per"),
          sortDraftPrimary,
          setSortDraftPrimary,
          sortDraftPrimaryDir,
          setSortDraftPrimaryDir
        )}
        {sortSection(
          L("E poi per"),
          sortDraftSecondary,
          setSortDraftSecondary,
          sortDraftSecondaryDir,
          setSortDraftSecondaryDir
        )}
        <div
          style={{
            position: "sticky",
            bottom: 0,
            background: dark ? "#171724" : "#F7F8FF",
            paddingTop: 10,
          }}
        >
          <button
            onClick={applySort}
            style={{
              ...primaryButton(),
              width: "100%",
              padding: "14px 16px",
              fontSize: 15,
            }}
          >
            {L("Ordina")}
          </button>
        </div>
      </div>
    );
  }

  function renderExpense(e) {
    var shareColor = e._share ? e._shareProjectColor || confirmC : null;
    var c = e._share
      ? {
          icon: e._shareProjectIcon || "🤝",
          name: e._shareProjectName || "Share",
          color: shareColor || confirmC,
        }
      : getCat(e.catId);
    var m = e._share
      ? null
      : getMethod(e.methodId) ||
        (e.methodName
          ? {
              id: e.methodId,
              name: e.methodName,
              color: "#B4B2A9",
              archived: true,
            }
          : null);
    var eid = "exp_" + e.id;
    var ecopy = {
      ...e,
      id: e.id,
      amount: e.originalAmount || e.amount,
      catId: e.catId,
      methodId: e.methodId,
      methodName: e.methodName,
      desc: e.desc,
      date: e.date,
      rateizzato: e.rateizzato,
      rate: e.rate,
    };
    return (
      <div
        key={eid}
        style={{
          background: e._share ? shareColor + "18" : cardBg,
          borderRadius: 12,
          border: "1px solid " + (e._share ? shareColor + "55" : borderC),
          padding: "10px 14px",
          marginBottom: 8,
          boxShadow: e._share
            ? dark
              ? "none"
              : "0 5px 14px " + shareColor + "18"
            : "none",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ flexShrink: 0, display: "inline-flex" }}>
            <FainanceIcon value={c ? c.icon : "📦"} size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: textC,
              }}
            >
              {e.desc || "-"}
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginTop: 3,
              }}
            >
              {c && <Badge color={c.color} name={L(c.name)} small />}
              {e._share && e._sharePaidBy && (
                <span style={{ fontSize: 11, color: subC }}>
                  {L("Pagata da")}{" "}
                  <strong style={{ fontWeight: 800, color: textC }}>
                    {e._sharePaidBy}
                  </strong>
                </span>
              )}
              {m && (
                <Badge
                  color={m.color}
                  name={m.name + (m.archived ? " [A]" : "")}
                  small
                />
              )}
              {e.rateizzato && (
                <Badge color="#7F77DD" name={"÷" + e.rate + "m"} small />
              )}
              <span style={{ fontSize: 11, color: subC }}>
                {fmtDate(e.date, dateFmt)}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 850, color: expenseColor }}>
              {historyFxView(e).main}
              {historyFxView(e).sub ? (
                <div style={{ fontSize: 10, color: subC, fontWeight: 400 }}>
                  {historyFxView(e).sub}
                </div>
              ) : secRate && showSecInHistory && fmtSec(e.amount) ? (
                <div style={{ fontSize: 10, color: subC, fontWeight: 400 }}>
                  {fmtSec(e.amount)}
                </div>
              ) : null}
            </div>
            {!e._share && (
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  title={L("Modifica")}
                  onClick={function () {
                    setEditingItem({ item: ecopy, isExp: true });
                  }}
                  style={{
                    background: "#EEF4FF",
                    border: "1px solid #BFD7FF",
                    cursor: "pointer",
                    color: "#378ADD",
                    fontSize: 14,
                    padding: "5px 8px",
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  ✏️
                </button>
                <button
                  title={L("Elimina")}
                  onClick={function () {
                    setDeleteConfirmId(eid);
                  }}
                  style={{
                    background: "#FFF0F0",
                    border: "1px solid #FFD0D0",
                    cursor: "pointer",
                    color: expenseColor,
                    fontSize: 14,
                    padding: "5px 8px",
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  🗑️
                </button>
              </div>
            )}
          </div>
        </div>
        {deleteConfirmId === eid && !e._share && (
          <div
            style={{
              marginTop: 10,
              background: "#fff0f0",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 13, color: expenseColor }}>
              {L("Eliminare?")}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={function () {
                  setExpenses(function (prev) {
                    return prev.filter(function (x) {
                      return x.id !== e.id;
                    });
                  });
                  setDeleteConfirmId(null);
                  setToast &&
                    setToast({ text: "Uscita eliminata", type: "success" });
                }}
                style={{
                  ...appButton(true),
                  background: expenseColor,
                  borderColor: expenseColor,
                  padding: "6px 12px",
                }}
              >
                {L("Elimina")}
              </button>
              <button
                onClick={function () {
                  setDeleteConfirmId(null);
                }}
                style={{ ...appButton(false), padding: "6px 12px" }}
              >
                {V.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
  function renderIncome(inc) {
    var it = getIT(inc.type);
    var iid = "inc_" + inc.id;
    var icopy = {
      ...inc,
      id: inc.id,
      amount: inc.originalAmount || inc.amount,
      type: inc.type,
      desc: inc.desc,
      date: inc.date,
      rateizzato: inc.rateizzato,
      rate: inc.rate,
    };
    return (
      <div
        key={iid}
        style={{
          background: cardBg,
          borderRadius: 12,
          border: "1px solid " + borderC,
          padding: "10px 14px",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <span style={{ flexShrink: 0, display: "inline-flex" }}>
            <FainanceIcon value={it ? it.icon : "💰"} size={20} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: textC,
              }}
            >
              {inc.desc || "-"}
            </div>
            <div
              style={{
                display: "flex",
                gap: 6,
                flexWrap: "wrap",
                marginTop: 3,
              }}
            >
              {it && <Badge color={it.color} name={L(it.name)} small />}
              {inc.rateizzato && (
                <Badge color="#7F77DD" name={"÷" + inc.rate + "m"} small />
              )}
              <span style={{ fontSize: 11, color: subC }}>
                {fmtDate(inc.date, dateFmt)}
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 850, color: incomeColor }}>
              +{historyFxView(inc).main}
              {historyFxView(inc).sub ? (
                <div style={{ fontSize: 10, color: subC, fontWeight: 400 }}>
                  {historyFxView(inc).sub}
                </div>
              ) : secRate && showSecInHistory && fmtSec(inc.amount) ? (
                <div style={{ fontSize: 10, color: subC, fontWeight: 400 }}>
                  {fmtSec(inc.amount)}
                </div>
              ) : null}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                title={L("Modifica")}
                onClick={function () {
                  setEditingItem({ item: icopy, isExp: false });
                }}
                style={{
                  background: "#EEF4FF",
                  border: "1px solid #BFD7FF",
                  cursor: "pointer",
                  color: "#378ADD",
                  fontSize: 14,
                  padding: "5px 8px",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                ✏️
              </button>
              <button
                title={L("Elimina")}
                onClick={function () {
                  setDeleteConfirmId(iid);
                }}
                style={{
                  background: "#FFF0F0",
                  border: "1px solid #FFD0D0",
                  cursor: "pointer",
                  color: expenseColor,
                  fontSize: 14,
                  padding: "5px 8px",
                  borderRadius: 8,
                  fontWeight: 700,
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        </div>
        {deleteConfirmId === iid && (
          <div
            style={{
              marginTop: 10,
              background: "#fff0f0",
              borderRadius: 8,
              padding: "10px 12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 13, color: expenseColor }}>
              {L("Eliminare?")}
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={function () {
                  setIncomes(function (prev) {
                    return prev.filter(function (x) {
                      return x.id !== inc.id;
                    });
                  });
                  setDeleteConfirmId(null);
                  setToast &&
                    setToast({ text: "Entrata eliminata", type: "success" });
                }}
                style={{
                  ...appButton(true),
                  background: expenseColor,
                  borderColor: expenseColor,
                  padding: "6px 12px",
                }}
              >
                {L("Elimina")}
              </button>
              <button
                onClick={function () {
                  setDeleteConfirmId(null);
                }}
                style={{ ...appButton(false), padding: "6px 12px" }}
              >
                {V.cancel}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  var totalExpenses = (filteredExpenses || []).reduce(function (a, e) {
    return a + (Number(e.amount) || 0);
  }, 0);
  var totalIncomes = (filteredIncomes || []).reduce(function (a, i) {
    return a + (Number(i.amount) || 0);
  }, 0);
  var historyActionsStyle: any = {
    position: "sticky",
    top: -14,
    zIndex: 20,
    display: "flex",
    gap: 8,
    marginTop: historyActionsVisible ? -14 : 0,
    marginBottom: historyActionsVisible ? 8 : 0,
    alignItems: "center",
    background: dark ? "#171724" : "#F7F8FF",
    padding: historyActionsVisible ? "0 0 8px" : "0",
    boxShadow: historyActionsVisible
      ? dark
        ? "0 -22px 0 #171724, 0 8px 14px rgba(23,23,36,.96)"
        : "0 -22px 0 #F7F8FF, 0 8px 14px rgba(247,248,255,.98)"
      : "none",
    maxHeight: historyActionsVisible ? 72 : 0,
    opacity: historyActionsVisible ? 1 : 0,
    transform: historyActionsVisible ? "translateY(0)" : "translateY(-12px)",
    overflow: "hidden",
    pointerEvents: historyActionsVisible ? "auto" : "none",
    transition:
      "max-height .14s ease, opacity .10s ease, transform .10s ease, margin-top .10s ease, margin-bottom .10s ease, padding .10s ease",
  };
  return (
    <div ref={historyRootRef}>
      {showFilterModal && renderFilterModal()}
      {showSortModal && renderSortModal()}
      <div style={historyActionsStyle}>
        <button
          onClick={function () {
            setShowFilterModal(true);
          }}
          style={{ ...primaryButton(), flex: 1, padding: "11px 12px" }}
        >
          ☰ {L("Filtra")}
        </button>
        <button
          onClick={openSort}
          style={{ ...primaryButton(), flex: 1, padding: "11px 12px" }}
        >
          ↕ {L("Ordina")}
        </button>
      </div>
      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          background: dark ? "#252535" : "#f8f8ff",
          border: "1px solid " + borderC,
          borderRadius: 14,
          padding: "9px 11px",
        }}
      >
        <div style={{ fontSize: 12, color: subC }}>
          {L("Vista")}: <b style={{ color: textC }}>{activeTypeLabel()}</b>
        </div>
        <div style={{ fontSize: 12, color: subC, textAlign: "right" }}>
          {L("Ordine")}:{" "}
          <b style={{ color: textC }}>
            {displaySortLabel(historySortDate, historySortDirection)}
          </b>
          <span style={{ display: "block", fontSize: 11 }}>
            {L("E poi per")}:{" "}
            {displaySortLabel(
              historySortSecondary,
              historySortSecondaryDirection
            )}
          </span>
        </div>
      </div>
      <div style={{ marginBottom: 10 }}>{searchBox()}</div>
      <div style={{ fontSize: 12, color: subC, marginBottom: 8 }}>
        {!firestoreReady
          ? L("Sincronizzazione in corso...")
          : L("Mostrate") +
            " " +
            visibleRows.length +
            " " +
            L("di") +
            " " +
            historyRows.length +
            " " +
            L("voci")}
        {historyTab !== "incomes" &&
          " · " + L("Uscite") + ": " + fmt(totalExpenses)}
        {historyTab !== "expenses" &&
          " · " + L("Entrate") + ": " + fmt(totalIncomes)}
      </div>
      {historyRows.length === 0 && (
        <div style={{ textAlign: "center", color: "#ccc", padding: "32px 0" }}>
          {historyTab === "incomes" ? t.noIncomes : t.noExpenses}
        </div>
      )}
      {visibleRows.map(function (row: any) {
        return row._historyKind === "income"
          ? renderIncome(row)
          : renderExpense(row);
      })}
      {historyRows.length > visibleRows.length && (
        <button
          onClick={function () {
            setHistoryVisibleCount(historyVisibleCount + 80);
          }}
          style={{
            ...appButton(false),
            width: "100%",
            padding: "10px 12px",
            marginBottom: 8,
          }}
        >
          {L("Mostra altri")} ({visibleRows.length}/{historyRows.length})
        </button>
      )}
    </div>
  );
}

export function ConsulenteAIPanel() {
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c: any = useApp();
  var translateUiRuntimeText: any = _c.translateUiRuntimeText;
  function L(s) {
    return translateUiRuntimeText ? translateUiRuntimeText(s) : s;
  }
  var {
    lang,
    cats,
    setCats,
    methods,
    setMethods,
    methodGroups,
    setMethodGroups,
    expenseGroups,
  }: any = _c;
  var {
    setExpenseGroups,
    incomeGroups,
    setIncomeGroups,
    incomeTypes,
    customIncomeTypes,
    setCustomIncomeTypes,
    incomeTypeOverrides,
    setIncomeTypeOverrides,
  }: any = _c;
  var {
    recurring,
    setRecurring,
    goals,
    setGoals,
    alerts,
    setAlerts,
    expenses,
    setExpenses,
  }: any = _c;
  var {
    incomes,
    setIncomes,
    sym,
    fmt,
    dark,
    dateFmt,
    curMonthKey,
    addExpenses,
  }: any = _c;
  var {
    addIncomes,
    confirmRecurring,
    catOrder,
    setCatOrder,
    methodOrder,
    setMethodOrder,
    catSortMode,
    setCatSortMode,
  }: any = _c;
  var {
    methodSortMode,
    setMethodSortMode,
    budgetPlan,
    setBudgetPlan,
    btnRadius,
    expenseColor,
    incomeColor,
    isMobile,
  }: any = _c;
  var {
    patrimonioAreas,
    setPatrimonioAreas,
    patrimonioEntries,
    setPatrimonioEntries,
    patrimonioValues,
    setPatrimonioValues,
    patrimonioMode,
    setPatrimonioMode,
  }: any = _c;
  var {
    patrimonioHistory,
    setPatrimonioHistory,
    patrimonioNotes,
    setPatrimonioNotes,
    historyFutureMode,
    setHistoryFutureMode,
    historySortDate,
    setHistorySortDate,
  }: any = _c;
  var {
    historySortDirection,
    setHistorySortDirection,
    appuntiDocuments,
    setAppuntiDocuments,
    appuntiNotes,
    setAppuntiNotes,
    bankCoords,
    setBankCoords,
  }: any = _c;
  var {
    notifPrefs,
    setNotifPrefs,
    customNotifs,
    setCustomNotifs,
    aiDismissed,
    setAiDismissed,
    aiChat,
    setAiChat,
    aiExternalConsent,
    setAiExternalConsent,
  }: any = _c;
  var {
    aiDataAccess,
    setAiDataAccess,
    aiFloatingEnabled,
    setAiFloatingEnabled,
    secondaryCurrency,
    secRate,
    fmtSec,
    secSym,
  }: any = _c;
  var {
    secRateLoading,
    currency,
    showSecInHistory,
    setShowSecInHistory,
    showSecInStats,
    setShowSecInStats,
    showSecInBudget,
    setShowSecInBudget,
  }: any = _c;
  var {
    showSecInPatrimonio,
    setShowSecInPatrimonio,
    textC,
    subC,
    borderC,
    cardBg,
    inp,
    sb,
  }: any = _c;
  var {
    bgColor,
    tab,
    setTab,
    settingsPage,
    setSettingsPage,
    speseSubTab,
    setSpeseSubTab,
    addType,
  }: any = _c;
  var {
    setAddType,
    addSubTab,
    setAddSubTab,
    historyTab,
    setHistoryTab,
    editingItem,
    setEditingItem,
    mobileMenu,
  }: any = _c;
  var {
    setMobileMenu,
    toast,
    setToast,
    alertPopup,
    setAlertPopup,
    statsView,
    setStatsView,
    curYear,
  }: any = _c;
  var {
    yearExp,
    yearInc,
    monthlyTotals,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filterYear,
  }: any = _c;
  var {
    setFilterYear,
    filterMonth,
    setFilterMonth,
    filterMonths,
    setFilterMonths,
    filterCat,
    setFilterCat,
    filterCats,
  }: any = _c;
  var {
    setFilterCats,
    filterCatExclude,
    setFilterCatExclude,
    filterGroup,
    setFilterGroup,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
  }: any = _c;
  var {
    setFilterDateTo,
    filterAmtMin,
    setFilterAmtMin,
    filterAmtMax,
    setFilterAmtMax,
    filteredExpenses,
    filteredIncomes,
    shareProjects,
  }: any = _c;
  var {
    setShareProjects,
    shareSelectedProjectId,
    setShareSelectedProjectId,
    shareProjectTab,
    setShareProjectTab,
    shareReceivedInvites,
    shareInviteLoading,
    showShareInHistory,
  }: any = _c;
  var {
    setShowShareInHistory,
    confirmButtonColor,
    setConfirmButtonColor,
    secondaryButtonColor,
    firestoreReady,
    userKey,
    userId,
    currentUser,
    pendingCount,
  }: any = _c;
  var {
    alertTriggered,
    getCat,
    getMethod,
    getIT,
    curMonthExp,
    curMonthInc,
    last12Balance,
    aiTab,
  }: any = _c;
  var {
    setAiTab,
    aiLoading,
    setAiLoading,
    aiAdviceFilter,
    setAiAdviceFilter,
    voiceModal,
    setVoiceModal,
    voiceListening,
    openVoiceModal,
  }: any = _c;
  var {
    setVoiceListening,
    voiceText,
    setVoiceText,
    voiceError,
    setVoiceError,
    voiceConfirm,
    setVoiceConfirm,
    voiceSaving,
  }: any = _c;
  var {
    setVoiceSaving,
    voiceParsed,
    setVoiceParsed,
    defaultExpenseCat,
    setDefaultExpenseCat,
    defaultExpenseMethod,
    setDefaultExpenseMethod,
    defaultExpenseArea,
  }: any = _c;
  var {
    setDefaultExpenseArea,
    defaultIncomeType,
    setDefaultIncomeType,
    defaultIncomeArea,
    setDefaultIncomeArea,
    defaultMethodArea,
    setDefaultMethodArea,
    incomeTypeOrder,
  }: any = _c;
  var {
    setIncomeTypeOrder,
    deleteConfirmId,
    setDeleteConfirmId,
    mergeFrom,
    setMergeFrom,
    mergeTo,
    setMergeTo,
    homeBalanceView,
  }: any = _c;
  var {
    setHomeBalanceView,
    firstDayOfWeek,
    setFirstDayOfWeek,
    aiFloatingPos,
    setAiFloatingPos,
    aiFloatingDrag,
    setAiFloatingDrag,
    widgetBgColor,
  }: any = _c;
  var {
    setWidgetBgColor,
    widgetBgAlpha,
    setWidgetBgAlpha,
    widgetExpenseColor,
    setWidgetExpenseColor,
    widgetIncomeColor,
    setWidgetIncomeColor,
    widgetTitle,
  }: any = _c;
  var {
    setWidgetTitle,
    widgetSubtitle,
    setWidgetSubtitle,
    widgetExpenseLabel,
    setWidgetExpenseLabel,
    widgetIncomeLabel,
    setWidgetIncomeLabel,
    widgetShowHeader,
  }: any = _c;
  var {
    setWidgetShowHeader,
    widgetButtonStyle,
    setWidgetButtonStyle,
    widgetVoiceEnabled,
    setWidgetVoiceEnabled,
    widget2Enabled,
    setWidget2Enabled,
    widget2Type,
  }: any = _c;
  var {
    setWidget2Type,
    widget2TitleColor,
    setWidget2TitleColor,
    widget2BodyColor,
    setWidget2BodyColor,
    widget2AccentColor,
    setWidget2AccentColor,
    widget2BgAlpha,
  }: any = _c;
  var {
    setWidget2BgAlpha,
    widget2TextSize,
    setWidget2TextSize,
    widget2MaxChars,
    setWidget2MaxChars,
    widget2AutoUpdate,
    setWidget2AutoUpdate,
    widget2SelectedNoteId,
  }: any = _c;
  var {
    setWidget2SelectedNoteId,
    widget2SelectedBankId,
    setWidget2SelectedBankId,
    widget3Enabled,
    setWidget3Enabled,
    widget3TextColor,
    setWidget3TextColor,
    widget3AccentColor,
  }: any = _c;
  var {
    setWidget3AccentColor,
    widget3PercentColor,
    setWidget3PercentColor,
    widget3BgAlpha,
    setWidget3BgAlpha,
    widget3ShowPercent,
    setWidget3ShowPercent,
    widget3ShowAmounts,
  }: any = _c;
  var {
    setWidget3ShowAmounts,
    widget3AutoUpdate,
    setWidget3AutoUpdate,
    widget3SelectedGoalId,
    setWidget3SelectedGoalId,
    bgTheme,
    setBgTheme,
    btnStyle,
  }: any = _c;
  var {
    setBtnStyle,
    shownAlertIds,
    setShownAlertIds,
    settingsValuesTab,
    setSettingsValuesTab,
  }: any = _c;
  var {
    canUsePlanFeature,
    consumePlanFeature,
    upgradeMessage,
    handleRewardedFeature,
  }: any = _c;
  var {
    normalizeEmail,
    loadShareCollaboration,
    acceptShareInvite,
    declineShareInvite,
    createShareInvite,
    createShareProject,
    updateShareProject,
    deleteShareProject,
    canAddPlanItem,
  }: any = _c;
  // ─────────────────────────────────────────────────────────────────────────
  var now = new Date();
  var quickNativeSpeechRef = useRef<any>(null);
  var quickNativeTextRef = useRef("");
  var quickNativeDoneRef = useRef(false);
  var quickVoiceStartingRef = useRef(false);
  var quickVoiceAutoStartRef = useRef(true);
  var quickNativeTimeoutRef = useRef<any>(null);
  var quickNativeListenerHandlesRef = useRef<any[]>([]);
  var sinp: any = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid " + (dark ? "#444" : "#ddd"),
    padding: "8px 10px",
    fontSize: 14,
    background: dark ? "#2a2a3e" : "#fff",
    color: dark ? "#eee" : "#333",
    boxSizing: "border-box",
  };
  var aiChatSectionRef = useRef(null);
  var chatInputRef = useRef(null);
  var aiSuggestionLangRef = useRef(null);
  var aiConversationLanguageRef = useRef(
    createAssistantConversationLanguageState(lang || "it")
  );
  var [aiConsentPrompt, setAiConsentPrompt] = useState<any>(null);
  function acceptAIExternalConsent() {
    var cb = aiConsentPrompt && aiConsentPrompt.onAccept;
    setAiExternalConsent(true, new Date().toISOString());
    setAiConsentPrompt(null);
    try {
      if (cb) cb();
    } catch (e) {}
  }
  function declineAIExternalConsent() {
    setAiConsentPrompt(null);
    setToast({
      text: L(
        "Per usare il Consulente AI esterno devi autorizzare l’invio dei dati indicati. Puoi continuare a usare l’app senza questa funzione."
      ),
      type: "warning",
      color: "#EF9F27",
      icon: "⚠️",
    });
  }
  function requireAIExternalConsent(next) {
    if (aiExternalConsent) {
      next();
      return;
    }
    setAiConsentPrompt({ onAccept: next });
  }
  var grps = expenseGroups || DEFAULT_EXPENSE_GROUPS;
  var textC2 = textC,
    subC2 = subC,
    borderC2 = borderC,
    cardBg2 = cardBg;
  function monthKeyOffset(offset) {
    var d = new Date(curYear, now.getMonth() + offset, 1);
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
  }
  function sumExpMonth(mk, filterFn) {
    return expenses
      .filter(function (e) {
        return e.date && e.date.startsWith(mk) && (!filterFn || filterFn(e));
      })
      .reduce(function (a, e) {
        return a + (parseFloat(e.amount) || 0);
      }, 0);
  }
  function sumIncMonth(mk, filterFn) {
    return incomes
      .filter(function (i) {
        return i.date && i.date.startsWith(mk) && (!filterFn || filterFn(i));
      })
      .reduce(function (a, i) {
        return a + (parseFloat(i.amount) || 0);
      }, 0);
  }
  function catName(e) {
    var c = getCat(e.catId);
    return c ? c.name : "";
  }
  function catGroup(e) {
    var c = getCat(e.catId);
    return c ? c.group : "";
  }
  function isFood(e) {
    var n = catName(e).toLowerCase();
    return (
      n.includes("supermerc") ||
      n.includes("aliment") ||
      n.includes("spesa") ||
      n.includes("cibo")
    );
  }
  function isUtility(e) {
    var n = (catName(e) + " " + (e.desc || "")).toLowerCase();
    return (
      n.includes("uten") ||
      n.includes("bollett") ||
      n.includes("elettric") ||
      n.includes("luce") ||
      n.includes("gas") ||
      n.includes("internet") ||
      n.includes("telefono") ||
      n.includes("acqua")
    );
  }
  function isSalary(i) {
    var n = ((i.desc || "") + " " + (i.type || "")).toLowerCase();
    return (
      n.includes("stipend") ||
      n.includes("salario") ||
      n.includes("busta") ||
      i.type === "salario" ||
      i.type === "stipendio"
    );
  }
  function isWeekend(iso) {
    var d = new Date(iso + "T12:00:00");
    var day = d.getDay();
    return day === 0 || day === 6;
  }
  function isExtra(e) {
    var g = catGroup(e);
    var n = catName(e).toLowerCase();
    return (
      g !== "casa" &&
      !n.includes("mutuo") &&
      !n.includes("uten") &&
      !n.includes("medicina")
    );
  }
  function isEntertainmentRecurring(r) {
    var n = (r.name || "").toLowerCase();
    return (
      r.rtype === "expense" &&
      (n.includes("netflix") ||
        n.includes("spotify") ||
        n.includes("prime") ||
        n.includes("disney") ||
        n.includes("dazn") ||
        n.includes("now") ||
        n.includes("youtube") ||
        n.includes("apple") ||
        n.includes("streaming"))
    );
  }
  function addAdvice(arr, item) {
    if (!aiDismissed.includes(item.id)) arr.push(item);
  }

  var aiAdvices = useMemo(
    function () {
      var arr = [];
      var visibleMonth = curMonthKey;
      var currentExp = sumExpMonth(visibleMonth);
      var currentInc = sumIncMonth(visibleMonth);
      var prevKeys = [
        monthKeyOffset(-1),
        monthKeyOffset(-2),
        monthKeyOffset(-3),
      ];

      var entSubs = recurring.filter(isEntertainmentRecurring);
      if (entSubs.length >= 2) {
        var total = entSubs.reduce(function (a, r) {
          return a + (parseFloat(r.amount) || 0);
        }, 0);
        var minSave = Math.max(1, Math.round(total * 0.18));
        var maxSave = Math.max(minSave, Math.round(total * 0.25));
        addAdvice(arr, {
          id: "subs-entertainment",
          type: "risparmio",
          priority: "Media",
          icon: "🎬",
          title: L("Abbonamenti intrattenimento"),
          savingMonthly: maxSave,
          text:
            L("Hai") +
            " " +
            entSubs.length +
            " " +
            L("abbonamenti attivi per intrattenimento") +
            ": " +
            entSubs
              .map(function (r) {
                return r.name;
              })
              .join(", ") +
            ". " +
            L("Totale") +
            ": " +
            fmt(total) +
            "/" +
            L("mese") +
            ". " +
            L("Valuta se sospenderne uno") +
            ": " +
            L("risparmio stimato") +
            " " +
            fmt(minSave) +
            "–" +
            fmt(maxSave) +
            "/" +
            L("mese") +
            ", " +
            L("cioè") +
            " " +
            fmt(minSave * 12) +
            "–" +
            fmt(maxSave * 12) +
            " " +
            L("all’anno") +
            ".",
          question: L(
            "Vuoi prendere in considerazione questa opzione a breve termine o queste spese non sono negoziabili?"
          ),
        });
      }

      var foodNow = sumExpMonth(visibleMonth, isFood);
      var foodPrevAvg =
        prevKeys.reduce(function (a, mk) {
          return a + sumExpMonth(mk, isFood);
        }, 0) / 3;
      if (foodNow > 0 && foodPrevAvg > 0 && foodNow > foodPrevAvg * 1.1) {
        var pct = ((foodNow - foodPrevAvg) / foodPrevAvg) * 100;
        var saveFood = Math.round(foodNow * 0.03);
        addAdvice(arr, {
          id: "food-increase",
          type: "ottimizzazione",
          priority: pct >= 20 ? "Alta" : "Media",
          icon: "🛒",
          title: L("Spese alimentari in aumento"),
          savingMonthly: saveFood,
          text:
            L("Le spese alimentari sono aumentate del") +
            " " +
            pct.toFixed(1).replace(".", ",") +
            "% " +
            L("rispetto alla media degli ultimi 3 mesi") +
            ". " +
            L("Questo mese hai speso") +
            " " +
            fmt(foodNow) +
            ", " +
            L("contro una media di") +
            " " +
            fmt(foodPrevAvg) +
            ".",
          question:
            L("Vogliamo analizzarle nello specifico?") +
            " " +
            L("Riducendole anche solo del 3%, puoi risparmiare circa") +
            " " +
            fmt(saveFood) +
            " " +
            L("al mese") +
            ". ",
        });
      }

      var weekendExtra = expenses
        .filter(function (e) {
          return (
            e.date &&
            e.date.startsWith(visibleMonth) &&
            isWeekend(e.date) &&
            isExtra(e)
          );
        })
        .reduce(function (a, e) {
          return a + (parseFloat(e.amount) || 0);
        }, 0);
      var extraTotal = expenses
        .filter(function (e) {
          return e.date && e.date.startsWith(visibleMonth) && isExtra(e);
        })
        .reduce(function (a, e) {
          return a + (parseFloat(e.amount) || 0);
        }, 0);
      if (extraTotal > 0 && weekendExtra / extraTotal >= 0.3) {
        var pctW = (weekendExtra / extraTotal) * 100;
        var saveW = Math.round(weekendExtra * 0.05);
        addAdvice(arr, {
          id: "weekend-extra",
          type: "abitudine",
          priority: "Media",
          icon: "🌙",
          title: L("Spese extra concentrate nel weekend"),
          savingMonthly: saveW,
          text:
            L("Il") +
            " " +
            pctW.toFixed(1).replace(".", ",") +
            "% " +
            L("delle spese extra del mese avviene nel weekend") +
            ". " +
            L("Spese weekend extra") +
            ": " +
            fmt(weekendExtra) +
            " " +
            L("su") +
            " " +
            fmt(extraTotal) +
            ".",
          question:
            L("Vuoi impostare un limite weekend o analizzare il dettaglio?") +
            " " +
            L("Riducendole del 5%, risparmi circa") +
            " " +
            fmt(saveW) +
            " " +
            L("al mese") +
            ". ",
        });
      }

      var salaryNow = sumIncMonth(visibleMonth, isSalary);
      var salaryPrevAvg =
        prevKeys.reduce(function (a, mk) {
          return a + sumIncMonth(mk, isSalary);
        }, 0) / 3;
      if (salaryNow === 0 && salaryPrevAvg > 0) {
        addAdvice(arr, {
          id: "missing-salary",
          type: "controllo",
          priority: "Alta",
          icon: "💼",
          title: L("Possibile stipendio mancante"),
          savingMonthly: 0,
          text:
            L(
              "Nel mese corrente non risulta registrata un’entrata assimilabile allo stipendio, mentre negli ultimi 3 mesi la media era"
            ) +
            " " +
            fmt(salaryPrevAvg) +
            ".",
          question: L("Ti sei dimenticato di inserirla o è corretto così?"),
        });
      }

      var utilNow = sumExpMonth(visibleMonth, isUtility);
      var utilPrevAvg =
        prevKeys.reduce(function (a, mk) {
          return a + sumExpMonth(mk, isUtility);
        }, 0) / 3;
      if (utilNow === 0 && utilPrevAvg > 0) {
        addAdvice(arr, {
          id: "missing-utilities",
          type: "controllo",
          priority: "Alta",
          icon: "💡",
          title: L("Possibile bolletta mancante"),
          savingMonthly: 0,
          text:
            L(
              "Nel mese corrente non risultano uscite riconducibili a utenze o bollette"
            ) +
            ". " +
            L("Negli ultimi 3 mesi la media era") +
            " " +
            fmt(utilPrevAvg) +
            ".",
          question: L("Ti sei dimenticato di inserirla o è giusto così?"),
        });
      }

      recurring.forEach(function (r) {
        if (
          (r.confirmed || []).includes(visibleMonth) ||
          (r.skipped || []).includes(visibleMonth)
        )
          return;
        var amount = parseFloat(r.amount) || 0;
        if (!amount) return;
        var isPresent = (r.rtype === "expense" ? expenses : incomes).some(
          function (x) {
            return (
              x.date &&
              x.date.startsWith(visibleMonth) &&
              Math.abs((parseFloat(x.amount) || 0) - amount) <= 1 &&
              String(x.desc || "")
                .toLowerCase()
                .includes(
                  String(r.name || "")
                    .toLowerCase()
                    .slice(0, 8)
                )
            );
          }
        );
        if (!isPresent) {
          addAdvice(arr, {
            id: "missing-recurring-" + r.id,
            type: "controllo",
            priority: "Alta",
            icon: r.rtype === "expense" ? "🔄" : "💰",
            title: L("Ricorrente non registrata"),
            savingMonthly: 0,
            text:
              L("Non trovo nel mese corrente la voce ricorrente") +
              " “" +
              r.name +
              "” " +
              L("da") +
              " " +
              fmt(amount) +
              ".",
            question: L("Va confermata, saltata o inserita manualmente?"),
          });
        }
      });

      if (budgetPlan && budgetPlan.items) {
        budgetPlan.items.forEach(function (b) {
          var c = cats.find(function (x) {
            return x.id === b.catId;
          });
          if (!c || !b.amount) return;
          var spent = sumExpMonth(visibleMonth, function (e) {
            return e.catId === c.id;
          });
          var pct = b.amount > 0 ? (spent / b.amount) * 100 : 0;
          if (pct >= 90) {
            var over = Math.max(0, spent - b.amount);
            addAdvice(arr, {
              id: "budget-risk-" + c.id,
              type: "budget",
              priority: pct >= 100 ? "Alta" : "Media",
              icon: c.icon || "💰",
              title:
                (pct >= 100 ? L("Budget superato") : L("Budget a rischio")) +
                ": " +
                c.name,
              savingMonthly: Math.round(Math.max(0, spent - b.amount * 0.95)),
              text:
                L("Hai usato il") +
                " " +
                pct.toFixed(1).replace(".", ",") +
                "% " +
                L("del budget") +
                " “" +
                c.name +
                "”: " +
                fmt(spent) +
                " " +
                L("su") +
                " " +
                fmt(b.amount) +
                ".",
              question:
                pct >= 100
                  ? L(
                      "Vuoi analizzare le singole uscite per capire dove intervenire?"
                    )
                  : L(
                      "Vuoi impostare un limite più stretto per il resto del mese?"
                    ),
            });
          }
        });
      }

      if (!arr.length) {
        arr.push({
          id: "ai-empty",
          type: "info",
          priority: "Bassa",
          icon: "✅",
          title: L("Nessuna criticità evidente"),
          savingMonthly: 0,
          text:
            currentExp === 0 && currentInc === 0
              ? L(
                  "Non ci sono ancora abbastanza dati nel mese corrente per generare consigli affidabili."
                )
              : L(
                  "Al momento non emergono anomalie forti dai dati disponibili. Continua a registrare entrate, uscite e ricorrenze per migliorare la precisione del Consulente AI."
                ),
          question: L(
            "Puoi iniziare chiedendo: “Come posso risparmiare questo mese?”"
          ),
        });
      }
      return arr.sort(function (a, b) {
        var pr = { Alta: 0, Media: 1, Bassa: 2 };
        return (
          (pr[a.priority] || 9) - (pr[b.priority] || 9) ||
          (b.savingMonthly || 0) - (a.savingMonthly || 0)
        );
      });
    },
    [
      expenses,
      incomes,
      recurring,
      budgetPlan,
      cats,
      aiDismissed,
      curMonthKey,
      statsView,
      lang,
    ]
  );

  var totalSaving = aiAdvices.reduce(function (a, x) {
    return a + (x.savingMonthly || 0);
  }, 0);
  var highCount = aiAdvices.filter(function (x) {
    return x.priority === "Alta";
  }).length;
  var controlCount = aiAdvices.filter(function (x) {
    return x.type === "controllo";
  }).length;
  var filteredAiAdvices = aiAdvices.filter(function (x) {
    if (aiAdviceFilter === "high") return x.priority === "Alta";
    if (aiAdviceFilter === "control") return x.type === "controllo";
    return true;
  });
  function dismissAdvice(id) {
    setAiDismissed(function (p) {
      return p.includes(id) ? p : [...p, id];
    });
  }
  function openAIChat(prefill) {
    var q = prefill !== undefined && prefill !== null ? String(prefill) : "";
    if (q.trim()) aiSuggestionLangRef.current = lang || "it";
    try {
      if (q.trim())
        localStorage.setItem("fainance_voice_assistant_prefill_once", q);
      else localStorage.removeItem("fainance_voice_assistant_prefill_once");
    } catch (_e) {}
    setAiTab("chat");
    if (openVoiceModal) openVoiceModal(true, true);
    else setVoiceModal(true);
  }
  function askAI(text) {
    var q = String(text || "").trim();
    openAIChat(q);
  }
  function buildAIContext() {
    var mk = curMonthKey;
    var expMonth = sumExpMonth(mk);
    var incMonth = sumIncMonth(mk);
    var prevMonth = monthKeyOffset(-1);
    var expPrev = sumExpMonth(prevMonth);
    var incPrev = sumIncMonth(prevMonth);
    var expYear = expenses
      .filter(function (e) {
        return e.date && e.date.startsWith(String(curYear));
      })
      .reduce(function (a, e) {
        return a + (parseFloat(e.amount) || 0);
      }, 0);
    var incYear = incomes
      .filter(function (i) {
        return i.date && i.date.startsWith(String(curYear));
      })
      .reduce(function (a, i) {
        return a + (parseFloat(i.amount) || 0);
      }, 0);
    var byCat = {};
    expenses
      .filter(function (e) {
        return e.date && e.date.startsWith(mk);
      })
      .forEach(function (e) {
        var c = getCat(e.catId);
        var name = c ? c.name : "Altro";
        byCat[name] = (byCat[name] || 0) + (parseFloat(e.amount) || 0);
      });
    var topCats = Object.keys(byCat)
      .map(function (k) {
        return { name: k, amount: byCat[k] };
      })
      .sort(function (a, b) {
        return b.amount - a.amount;
      })
      .slice(0, 8);
    var byIncome = {};
    incomes
      .filter(function (i) {
        return i.date && i.date.startsWith(mk);
      })
      .forEach(function (i) {
        var it = incomeTypes.find(function (x) {
          return x.id === i.type;
        });
        var name = it ? it.name : i.type || "Entrata";
        byIncome[name] = (byIncome[name] || 0) + (parseFloat(i.amount) || 0);
      });
    var topIncome = Object.keys(byIncome)
      .map(function (k) {
        return { name: k, amount: byIncome[k] };
      })
      .sort(function (a, b) {
        return b.amount - a.amount;
      })
      .slice(0, 6);
    var dataQuality = {
      expensesCount: expenses.length,
      incomesCount: incomes.length,
      recurringCount: recurring.length,
      currentMonthExpenses: expenses.filter(function (e) {
        return e.date && e.date.startsWith(mk);
      }).length,
      currentMonthIncomes: incomes.filter(function (i) {
        return i.date && i.date.startsWith(mk);
      }).length,
      missingRecurringHints: aiAdvices
        .filter(function (a) {
          return a.type === "controllo";
        })
        .map(function (a) {
          return a.title;
        })
        .slice(0, 8),
    };
    var recurringSummary = recurring.slice(0, 20).map(function (r) {
      return {
        name: r.name,
        type: r.rtype,
        amount: parseFloat(r.amount) || 0,
        dayOfMonth: r.dayOfMonth || null,
      };
    });
    var budgetSummary = (budgetPlan && budgetPlan.items ? budgetPlan.items : [])
      .map(function (b) {
        var c = getCat(b.catId);
        var spent = sumExpMonth(mk, function (e) {
          return e.catId === b.catId;
        });
        return {
          category: c ? c.name : String(b.catId),
          area: c
            ? (
                grps.find(function (g) {
                  return g.id === c.group;
                }) || {}
              ).name || c.group
            : "",
          budget: parseFloat(b.amount) || 0,
          spent: spent,
        };
      })
      .filter(function (x) {
        return x.budget || x.spent;
      });
    var budgetRisks = budgetSummary
      .map(function (b) {
        var pct = b.budget > 0 ? (b.spent / b.budget) * 100 : 0;
        return {
          category: b.category,
          area: b.area,
          budget: b.budget,
          spent: b.spent,
          usedPct: pct,
          remaining: b.budget - b.spent,
        };
      })
      .filter(function (b) {
        return b.usedPct >= 80;
      })
      .sort(function (a, b) {
        return b.usedPct - a.usedPct;
      });
    var patrimonioTotal = 0;
    try {
      patrimonioTotal = Object.keys(patrimonioValues || {}).reduce(function (
        a,
        k
      ) {
        return a + (parseFloat(patrimonioValues[k]) || 0);
      },
      0);
    } catch (e) {}
    var accessPolicy = assistantDataAccessPolicy(aiDataAccess);
    var ctx: any = {
      app: "fAInance",
      language: lang,
      currency: currency,
      month: mk,
      dataAccessLevel: accessPolicy.level,
      dataAccessLabel:
        accessPolicy.level === "full"
          ? "analisi completa - profilo e dati dettagliati"
          : accessPolicy.level === "areas"
          ? "analisi media - spese e aree senza descrizioni"
          : "analisi limitata - solo riepilogo delle spese",
      dataAccessPolicy: accessPolicy,
      totals: {
        expenseMonth: expMonth,
        expenseYear: expYear,
      },
      trend: {
        previousMonth: prevMonth,
        expensePreviousMonth: expPrev,
        expenseDeltaVsPrevious: expMonth - expPrev,
      },
      dataQuality: {
        expensesCount: expenses.length,
        currentMonthExpenses: expenses.filter(function (e) {
          return e.date && e.date.startsWith(mk);
        }).length,
      },
      topExpenseCategories: topCats,
    };
    if (aiDataAccess === "full") {
      ctx.userProfile = buildAssistantProfileContext(currentUser);
      ctx.totals = {
        incomeMonth: incMonth,
        expenseMonth: expMonth,
        balanceMonth: incMonth - expMonth,
        incomeYear: incYear,
        expenseYear: expYear,
        balanceYear: incYear - expYear,
        patrimonioTotal: patrimonioTotal,
      };
      ctx.trend = {
        previousMonth: prevMonth,
        incomePreviousMonth: incPrev,
        expensePreviousMonth: expPrev,
        balancePreviousMonth: incPrev - expPrev,
        expenseDeltaVsPrevious: expMonth - expPrev,
        incomeDeltaVsPrevious: incMonth - incPrev,
      };
      ctx.dataQuality = dataQuality;
      ctx.topIncomeTypes = topIncome;
      ctx.recurring = recurringSummary;
      ctx.budget = budgetSummary;
      ctx.budgetRisks = budgetRisks;
      ctx.activeAdvice = aiAdvices.slice(0, 10).map(function (a) {
        return {
          title: a.title,
          priority: a.priority,
          type: a.type,
          savingMonthly: a.savingMonthly || 0,
          text: a.text,
          question: a.question,
        };
      });
    }
    if (aiDataAccess === "areas" || aiDataAccess === "full") {
      var byArea = {};
      expenses
        .filter(function (e) {
          return e.date && e.date.startsWith(mk);
        })
        .forEach(function (e) {
          var c = getCat(e.catId);
          var areaId = c ? c.group : "altro";
          var g = grps.find(function (x) {
            return x.id === areaId;
          });
          var areaName = g ? g.name : areaId || "Altro";
          if (!byArea[areaName])
            byArea[areaName] = {
              area: areaName,
              amount: 0,
              count: 0,
              categories: {},
            };
          var amt = parseFloat(e.amount) || 0;
          byArea[areaName].amount += amt;
          byArea[areaName].count += 1;
          var cn = c ? c.name : "Altro";
          byArea[areaName].categories[cn] =
            (byArea[areaName].categories[cn] || 0) + amt;
        });
      ctx.expenseAreas = Object.keys(byArea)
        .map(function (k) {
          var a = byArea[k];
          return {
            area: a.area,
            amount: a.amount,
            count: a.count,
            categories: Object.keys(a.categories)
              .map(function (cn) {
                return { name: cn, amount: a.categories[cn] };
              })
              .sort(function (x, y) {
                return y.amount - x.amount;
              })
              .slice(0, 8),
          };
        })
        .sort(function (x, y) {
          return y.amount - x.amount;
        });
    }
    if (aiDataAccess === "areas") {
      ctx.expenses = expenses
        .slice()
        .sort(function (a, b) {
          return String(b.date || "").localeCompare(String(a.date || ""));
        })
        .slice(0, 500)
        .map(function (e) {
          var c = getCat(e.catId);
          var g = c
            ? grps.find(function (x) {
                return x.id === c.group;
              })
            : null;
          return {
            date: e.date,
            amount: parseFloat(e.amount) || 0,
            category: c ? c.name : "Altro",
            area: g ? g.name : c ? c.group : "",
          };
        });
    }
    if (aiDataAccess === "full") {
      ctx.transactions = {
        expenses: expenses
          .slice()
          .sort(function (a, b) {
            return String(b.date || "").localeCompare(String(a.date || ""));
          })
          .slice(0, 500)
          .map(function (e) {
            var c = getCat(e.catId);
            var m = methods.find(function (x) {
              return x.id === e.methodId;
            });
            var g = c
              ? grps.find(function (x) {
                  return x.id === c.group;
                })
              : null;
            return {
              date: e.date,
              amount: parseFloat(e.amount) || 0,
              category: c ? c.name : "Altro",
              area: g ? g.name : c ? c.group : "",
              method: m ? m.name : "",
              description: e.desc || "",
              instalment: !!e.rateizzato,
              months: e.rate || null,
            };
          }),
        incomes: incomes
          .slice()
          .sort(function (a, b) {
            return String(b.date || "").localeCompare(String(a.date || ""));
          })
          .slice(0, 300)
          .map(function (i) {
            var it = incomeTypes.find(function (x) {
              return x.id === i.type;
            });
            return {
              date: i.date,
              amount: parseFloat(i.amount) || 0,
              type: it ? it.name : i.type || "Entrata",
              description: i.desc || "",
              instalment: !!i.rateizzato,
              months: i.rate || null,
            };
          }),
      };
    }
    return ctx;
  }
  function isAIQuestionInScope(q) {
    return !!String(q || "").trim();
  }
  function localizedOutOfScope(code) {
    return (
      {
        it: AI_OUT_OF_SCOPE_MESSAGE,
        es: "Solo puedo ayudarte con finanzas personales, presupuesto, gastos, ingresos, ahorro y funciones de la app fAInance.",
        en: "I can only help with personal finance, budget, expenses, income, savings and fAInance app features.",
        fr: "Je peux seulement aider avec les finances personnelles, le budget, les dépenses, les revenus, l’épargne et les fonctions de l’app fAInance.",
        de: "Ich kann nur bei persönlichen Finanzen, Budget, Ausgaben, Einnahmen, Sparen und Funktionen der fAInance-App helfen.",
        pt: "Só posso ajudar com finanças pessoais, orçamento, despesas, receitas, poupança e funções da app fAInance.",
        pl: "Mogę pomóc tylko w finansach osobistych, budżecie, wydatkach, przychodach, oszczędzaniu i funkcjach aplikacji fAInance.",
        nl: "Ik kan alleen helpen met persoonlijke financiën, budget, uitgaven, inkomsten, sparen en functies van de fAInance-app.",
        ro: "Te pot ajuta doar cu finanțe personale, buget, cheltuieli, venituri, economii și funcțiile aplicației fAInance.",
        el: "Μπορώ να βοηθήσω μόνο με προσωπικά οικονομικά, προϋπολογισμό, έξοδα, έσοδα, αποταμίευση και λειτουργίες της εφαρμογής fAInance.",
      }[code] || localizedOutOfScope("en")
    );
  }
  function buildAIRequest(q) {
    var forced = aiSuggestionLangRef.current;
    aiSuggestionLangRef.current = null;
    var req: any = buildFinanceAdviceRequestPayload({
      question: q,
      forcedLanguage: forced || undefined,
      fallbackLanguage: lang || "it",
      languageState: aiConversationLanguageRef.current,
      interfaceLanguage: lang || "it",
      context: buildAIContext(),
      chatHistory: (aiChat || [])
        .filter(function (m) {
          return m && (m.role === "user" || m.role === "assistant");
        })
        .slice(-12)
        .map(function (m) {
          return { role: m.role, text: m.rawText || m.text };
        }),
      scopeInstruction: AI_AGENT_SCOPE_INSTRUCTION,
      financialInstruction:
        "Respect dataAccessPolicy exactly: summary may use only aggregated expense summaries; areas may also use expense rows limited to date, amount, category and area plus area aggregates, but never descriptions, payment methods or profile data; full may use the supplied detailed fAInance data and userProfile. Use trend, budgetRisks, dataQuality and activeAdvice only when those fields are actually present. Use estimated amounts only when they derive from supplied data. Never invent hidden or missing personal data. The privacy level restricts reads only and must never restrict available app actions. Present scenarios, risks and assumptions rather than absolute certainty.",
    });
    if (req && req.languageState)
      aiConversationLanguageRef.current = req.languageState;
    return req;
  }
  async function callFinanceAgent(q, preparedRequest?: any) {
    var req = preparedRequest || buildAIRequest(q);
    var token = "";
    try {
      if (fbAuth.currentUser) token = await fbAuth.currentUser.getIdToken();
    } catch (e) {}
    var aiHeaders: any = { "Content-Type": "application/json" };
    if (token) aiHeaders.Authorization = "Bearer " + token;
    var aiCtrl = new AbortController();
    var aiTimeout = setTimeout(function () {
      aiCtrl.abort();
    }, 15000);
    var res = await fetch(AI_AGENT_ENDPOINT, {
      method: "POST",
      headers: aiHeaders,
      signal: aiCtrl.signal,
      body: JSON.stringify(req),
    }).finally(function () {
      clearTimeout(aiTimeout);
    });
    var data = null;
    try {
      data = await res.json();
    } catch (e) {}
    if (!res.ok) {
      throw new Error(
        (data && data.error) || "Errore agente AI: " + res.status
      );
    }
    var answer = (data && (data.answer || data.message || data.text)) || "";
    if (!answer)
      throw new Error("L’agente AI non ha restituito una risposta valida.");
    answer = String(answer)
      .replace(/\*\*/g, "")
      .replace(/^\s*#{1,6}\s*/gm, "")
      .replace(/`/g, "");
    if (assistantAnswerNeedsTranslation(answer, req.language)) {
      try {
        var tRes = await fetch(AI_AGENT_ENDPOINT, {
          method: "POST",
          headers: aiHeaders,
          body: JSON.stringify(
            buildFinanceAdviceTranslationPayload(answer, req.language)
          ),
        });
        var td = await tRes.json();
        var translated = (td && (td.answer || td.message || td.text)) || "";
        if (translated)
          answer = String(translated)
            .replace(/\*\*/g, "")
            .replace(/^\s*#{1,6}\s*/gm, "")
            .replace(/`/g, "");
      } catch (e) {}
    }
    return compactAssistantAnswer(answer, req.language, 1400);
  }
  function botAnswer(q) {
    var query = (q || "").toLowerCase();
    if (!expenses.length && !incomes.length)
      return "Non ci sono ancora dati sufficienti. Inserisci almeno qualche uscita, entrata e ricorrenza: altrimenti il consiglio sarebbe inventato.";
    if (
      query.includes("rispar") ||
      query.includes("taglia") ||
      query.includes("ottim")
    ) {
      var top = aiAdvices
        .filter(function (a) {
          return a.savingMonthly > 0;
        })
        .slice(0, 3);
      if (!top.length)
        return "Non vedo tagli evidenti con i dati attuali. I controlli più utili ora sono ricorrenze mancanti, bollette e budget a rischio.";
      return (
        "Le prime 3 azioni ad alto impatto sono: " +
        top
          .map(function (a, i) {
            return (
              i +
              1 +
              ") " +
              a.title +
              " — circa " +
              fmt(a.savingMonthly) +
              "/mese"
            );
          })
          .join("; ") +
        ". Potenziale annuo stimato: " +
        fmt(
          top.reduce(function (s, a) {
            return s + a.savingMonthly;
          }, 0) * 12
        ) +
        "."
      );
    }
    if (query.includes("budget")) {
      var bud = aiAdvices.filter(function (a) {
        return a.type === "budget";
      });
      if (!bud.length)
        return "Non risultano budget superati o vicini al limite. Se vuoi più precisione, configura un budget per ogni categoria principale.";
      return bud
        .map(function (a) {
          return a.title + ": " + a.text;
        })
        .join("\n");
    }
    if (query.includes("abbon")) {
      var sub = aiAdvices.find(function (a) {
        return a.id === "subs-entertainment";
      });
      return sub
        ? sub.text + " " + sub.question
        : "Non trovo abbastanza abbonamenti ricorrenti riconoscibili. Registra gli abbonamenti nella sezione Ricorrenti per farmeli analizzare meglio.";
    }
    if (
      query.includes("manc") ||
      query.includes("diment") ||
      query.includes("bollett") ||
      query.includes("stipend")
    ) {
      var checks = aiAdvices.filter(function (a) {
        return a.type === "controllo";
      });
      if (!checks.length)
        return "Non vedo entrate o uscite ricorrenti mancanti nel mese corrente.";
      return checks
        .map(function (a) {
          return a.title + ": " + a.text + " " + a.question;
        })
        .join("\n");
    }
    return (
      "Posso aiutarti su risparmio mensile, budget, abbonamenti, spese weekend, bollette o possibili entrate/uscite mancanti. Dai dati attuali vedo " +
      aiAdvices.length +
      " indicazioni, di cui " +
      highCount +
      " ad alta priorità."
    );
  }
  async function sendChat() {
    var q = (
      chatInputRef.current && chatInputRef.current.value
        ? chatInputRef.current.value
        : ""
    ).trim();
    if (!q || aiLoading) return;
    var preparedRequest: any = buildAIRequest(q);
    var languageControlReply = assistantLanguageControlReply(
      preparedRequest && preparedRequest.languageResolution
    );
    if (languageControlReply) {
      setAiChat(function (p) {
        return [
          ...p,
          { id: Date.now(), role: "user", text: q },
          { id: Date.now() + 1, role: "assistant", text: languageControlReply },
        ].slice(-50);
      });
      if (chatInputRef.current) chatInputRef.current.value = "";
      return;
    }
    var localHelpAnswer = getFainanceHelpAnswer(
      q,
      (preparedRequest && preparedRequest.language) || lang || "it"
    );
    if (localHelpAnswer) {
      setAiChat(function (p) {
        return [
          ...p,
          { id: Date.now(), role: "user", text: q },
          { id: Date.now() + 1, role: "assistant", text: localHelpAnswer },
        ].slice(-50);
      });
      if (chatInputRef.current) chatInputRef.current.value = "";
      return;
    }
    function runAllowed() {
      var userMsg = { id: Date.now(), role: "user", text: q };
      setAiChat(function (p) {
        return [...p, userMsg].slice(-50);
      });
      if (chatInputRef.current) chatInputRef.current.value = "";
      if (consumePlanFeature) consumePlanFeature("aiReply", 1);
      if (!isAIQuestionInScope(q)) {
        setAiChat(function (p) {
          return [
            ...p,
            {
              id: Date.now() + 1,
              role: "assistant",
              text: localizedOutOfScope(
                preparedRequest.language ||
                  detectAssistantTurnLanguage(q, lang || "it")
              ),
            },
          ].slice(-50);
        });
        return;
      }
      function callExternalAI() {
        setAiLoading(true);
        callFinanceAgent(q, preparedRequest)
          .then(function (ans) {
            setAiChat(function (p) {
              return [
                ...p,
                { id: Date.now() + 1, role: "assistant", text: ans },
              ].slice(-50);
            });
          })
          .catch(function (err) {
            var rawErr =
              err && err.message ? err.message : "errore sconosciuto";
            var local = botAnswer(q);
            var errMsg =
              (rawErr.indexOf("429") >= 0
                ? "Il motore AI remoto non ha quota disponibile."
                : "Il motore AI remoto non è disponibile ora.") +
              " Intanto posso darti una lettura locale dei dati:\n" +
              local;
            setAiChat(function (p) {
              return [
                ...p,
                { id: Date.now() + 2, role: "assistant", text: errMsg },
              ].slice(-50);
            });
          })
          .finally(function () {
            setAiLoading(false);
          });
      }
      requireAIExternalConsent(callExternalAI);
    }
    if (handleRewardedFeature) {
      handleRewardedFeature("aiReply", 1, function () {
        runAllowed();
      });
      return;
    }
    if (canUsePlanFeature && !canUsePlanFeature("aiReply", 1)) {
      setToast({
        text: upgradeMessage
          ? upgradeMessage("aiReply")
          : L("Hai raggiunto il limite giornaliero di risposte AI."),
        type: "warning",
        color: "#EF9F27",
        icon: "⚠️",
      });
      return;
    }
    runAllowed();
  }
  var sinp = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid " + borderC2,
    padding: "9px 11px",
    fontSize: 14,
    background: dark ? "#2a2a3e" : "#fff",
    color: textC2,
    boxSizing: "border-box",
  };
  var aiAccessLabel =
    aiDataAccess === "full"
      ? L("analisi completa: profilo + dati dettagliati")
      : aiDataAccess === "areas"
      ? L("analisi media: spese + aree, senza descrizioni")
      : L("analisi limitata: solo riepilogo delle spese");
  var chatMenuText = assistantChatMenuText(lang || "it");
  var aiChatSectionActive = aiTab === "chat";
  if (aiChatSectionActive)
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          height: "100%",
          flex: 1,
          overflow: "hidden",
        }}
      >
        <VoiceEntryModal embedded />
      </div>
    );
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          background: dark ? "#252535" : "#fff",
          border: "1px solid " + borderC2,
          borderRadius: 16,
          padding: 8,
          position: "sticky",
          top: 0,
          zIndex: 25,
        }}
      >
        <button
          type="button"
          aria-label={L("Consigli")}
          title={L("Consigli")}
          onClick={function () {
            setAiAdviceFilter("all");
            setAiTab("consigli");
          }}
          style={{
            width: 40,
            height: 40,
            border: "none",
            borderRadius: 12,
            background: dark ? "#2A2A3E" : "#F5F6FB",
            color: textC2,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          📌
        </button>
        <button
          type="button"
          aria-label={L("Conversazione")}
          title={L("Conversazione")}
          onClick={function () {
            openAIChat("");
          }}
          style={{
            width: 40,
            height: 40,
            border: "none",
            borderRadius: 12,
            background: dark ? "#2A2A3E" : "#F5F6FB",
            color: textC2,
            fontSize: 18,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          💬
        </button>
      </div>
      <div
        style={{
          position: "relative",
          overflow: "hidden",
          background: dark
            ? "#252535"
            : "linear-gradient(135deg,#ffffff,#f4f1ff)",
          border: "1px solid " + borderC2,
          borderRadius: 18,
          padding: isMobile ? 18 : 22,
          minHeight: isMobile ? 132 : 150,
          boxShadow: dark ? "none" : "0 8px 28px rgba(127,119,221,0.12)",
        }}
      >
        <div style={{ position: "relative", zIndex: 2, maxWidth: 620 }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 900,
              color: textC2,
              marginBottom: 6,
            }}
          >
            {L("Consulente AI")}
          </div>
          <div
            style={{
              fontSize: 12,
              color: subC2,
              lineHeight: 1.5,
              marginBottom: 14,
            }}
          >
            {L(
              "Agente AI dedicato alla gestione delle tue finanze dentro fAInance: analisi dati, budget, risparmio, alert, obiettivi e uso dell’app."
            )}
          </div>
          <div style={{ display: "flex", gap: 9, flexWrap: "wrap" }}>
            <button
              onClick={function () {
                if (openVoiceModal) openVoiceModal(true, true);
                else setVoiceModal(true);
              }}
              style={{
                background: secondaryButtonColor || "#5FAFE5",
                color: "#fff",
                border: "1px solid " + (secondaryButtonColor || "#5FAFE5"),
                borderRadius: btnRadius,
                padding: "10px 14px",
                fontSize: 13,
                fontWeight: 850,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 5px 15px rgba(55,138,221,.18)",
              }}
            >
              💬 {L("Conversa con l'Assistente")}
            </button>
          </div>
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)",
          gap: 12,
        }}
      >
        <button
          onClick={function () {
            setAiAdviceFilter("all");
            setAiTab("consigli");
          }}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <StatCard
            title={L("Risparmio potenziale")}
            value={fmt(totalSaving)}
            color="#1D9E75"
            bg="#e8f8f0"
            sub={fmt(totalSaving * 12) + "/anno"}
          />
        </button>
        <button
          onClick={function () {
            setAiAdviceFilter("all");
            setAiTab("consigli");
          }}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <StatCard
            title={L("Consigli attivi")}
            value={String(aiAdvices.length)}
            color="#7F77DD"
            bg="#f0f0ff"
          />
        </button>
        <button
          onClick={function () {
            setAiAdviceFilter("high");
            setAiTab("consigli");
          }}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <StatCard
            title={L("Priorità alta")}
            value={String(highCount)}
            color={highCount ? "#E24B4A" : "#1D9E75"}
            bg={highCount ? "#fff0f0" : "#e8f8f0"}
          />
        </button>
        <button
          onClick={function () {
            setAiAdviceFilter("control");
            setAiTab("consigli");
          }}
          style={{
            border: "none",
            background: "transparent",
            padding: 0,
            textAlign: "left",
            cursor: "pointer",
          }}
        >
          <StatCard
            title={L("Controlli dati")}
            value={String(controlCount)}
            color="#EF9F27"
            bg="#fff8e1"
          />
        </button>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "10px 12px",
          borderRadius: 14,
          border: "1px solid " + borderC2,
          background: dark ? "#252535" : "#fff",
          boxShadow: dark ? "none" : "0 3px 12px rgba(35,40,60,.06)",
        }}
      >
        <span
          style={{
            width: 30,
            height: 30,
            borderRadius: 10,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: (secondaryButtonColor || "#5FAFE5") + "18",
          }}
        >
          📌
        </span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 850, color: textC2 }}>
            {L("Consigli e metriche")}
          </div>
          <div style={{ fontSize: 11, color: subC2, marginTop: 2 }}>
            {L("Analisi automatiche")}
          </div>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {filteredAiAdvices.map(function (a) {
          var pc =
            a.priority === "Alta"
              ? "#E24B4A"
              : a.priority === "Media"
              ? "#EF9F27"
              : "#1D9E75";
          return (
            <div
              key={a.id}
              style={{
                background: cardBg2,
                borderRadius: 14,
                border: "1px solid " + borderC2,
                padding: 16,
                position: "relative",
              }}
            >
              {a.id !== "ai-empty" && (
                <button
                  onClick={function () { dismissAdvice(a.id); }}
                  aria-label={L("Elimina")}
                  title={L("Elimina")}
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    border: "1px solid #FECACA",
                    background: "#FFF0F0",
                    color: "#F87171",
                    fontSize: 20,
                    fontWeight: 900,
                    lineHeight: 1,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 2,
                  }}
                >
                  ×
                </button>
              )}
              <div
                style={{ display: "flex", alignItems: "flex-start", gap: 12 }}
              >
                <div
                  style={{
                    width: 34,
                    display: "flex",
                    justifyContent: "center",
                  }}
                >
                  <FainanceIcon value={a.icon} size={26} />
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      alignItems: "center",
                      flexWrap: "wrap",
                      marginBottom: 5,
                    }}
                  >
                    <div
                      style={{ fontSize: 15, fontWeight: 800, color: textC2 }}
                    >
                      {a.title}
                    </div>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: pc,
                        background: pc + "22",
                        borderRadius: 10,
                        padding: "2px 7px",
                      }}
                    >
                      {L(a.priority)}
                    </span>
                    {a.savingMonthly > 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          color: "#1D9E75",
                          background: "#1D9E7522",
                          borderRadius: 10,
                          padding: "2px 7px",
                        }}
                      >
                        +{fmt(a.savingMonthly)}/{L("mese")}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: subC2,
                      lineHeight: 1.5,
                      whiteSpace: "pre-line",
                    }}
                  >
                    {a.text}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: textC2,
                      fontWeight: 600,
                      marginTop: 8,
                    }}
                  >
                    {a.question}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      marginTop: 12,
                    }}
                  >
                    <Btn
                      onClick={function () {
                        askAI(a.title);
                      }}
                      bg="#7F77DD"
                      style={{ padding: "7px 12px", fontSize: 12 }}
                    >
                      {L("Analizza")}
                    </Btn>

                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {aiConsentPrompt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.58)",
            zIndex: 950,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "10vh 16px 2vh",
            boxSizing: "border-box",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 560,
              background: cardBg2,
              border: "1px solid " + borderC2,
              borderRadius: 22,
              boxShadow: "0 18px 60px rgba(0,0,0,.34)",
              padding: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <AIGrilloIcon size={42} />
              <div>
                <div style={{ fontSize: 17, fontWeight: 950, color: textC2 }}>
                  {L("Consenso per l’uso dell’Agente AI esterno")}
                </div>
                <div style={{ fontSize: 12, color: subC2, marginTop: 3 }}>
                  {L(
                    "Prima di inviare dati al servizio AI esterno devi autorizzare il trattamento."
                  )}
                </div>
              </div>
            </div>
            <div
              style={{
                fontSize: 13,
                color: textC2,
                lineHeight: 1.5,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div>
                {L(
                  "Per generare le risposte del Consulente AI, fAInance invia alcuni dati a servizi esterni di intelligenza artificiale."
                )}
              </div>
              <div>
                <b>{L("Dati inviati")}:</b>
                <br />• {L("la domanda che scrivi nella chat")}
                <br />•{" "}
                {L("la lingua selezionata e il livello di analisi scelto")}
                <br />•{" "}
                {L(
                  "con Analisi limitata: solo riepiloghi aggregati delle spese"
                )}
                <br />•{" "}
                {L(
                  "con Analisi media: spese con data, importo, categoria e area, senza descrizione o metodo di pagamento"
                )}
                <br />•{" "}
                {L(
                  "con Analisi completa: dati fAInance dettagliati e informazioni del profilo utili all’analisi, come data di nascita, località, professione e finalità d’uso"
                )}
              </div>
              <div>
                <b>{L("Destinatari")}:</b>
                <br />• {L("backend sicuro fAInance")}
                <br />• OpenAI
              </div>
              <div style={{ color: subC2 }}>
                {L(
                  "Non vengono inviati CVV, dati biometrici, password, documenti caricati, immagini, fidelity card, dati completi delle carte di credito, email, numero di telefono o indirizzo completo."
                )}
              </div>
              <div>
                {L(
                  "Puoi non accettare e continuare a usare l’app senza inviare dati all’Agente AI esterno."
                )}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 10,
                marginTop: 16,
                flexDirection: isMobile ? "column" : "row",
              }}
            >
              <button
                onClick={acceptAIExternalConsent}
                style={{
                  flex: 1,
                  border: "none",
                  borderRadius: btnRadius,
                  padding: "12px 14px",
                  background:
                    "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {L("Accetto e continuo")}
              </button>
              <button
                onClick={declineAIExternalConsent}
                style={{
                  flex: 1,
                  border: "1px solid " + borderC2,
                  borderRadius: btnRadius,
                  padding: "12px 14px",
                  background: dark ? "#252535" : "#fff",
                  color: subC2,
                  fontSize: 14,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {L("Non accetto")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function normalizeVoiceText(v) {
  return String(v || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/€(\d+)[,\.](\d{1,2})/g, "$1.$2 euro ")
    .replace(/(\d+)[,\.](\d{1,2})€/g, "$1.$2 euro ")
    .replace(/(\d+)€(\d{1,2})/g, "$1.$2 euro ")
    .replace(/€(\d+)/g, "$1 euro ")
    .replace(/(\d+)€/g, "$1 euro ")
    .replace(/€/g, " euro ")
    .replace(/[^0-9a-zA-Z\u00C0-\u024F\u0370-\u03FF\s,.]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
export function escapeVoiceRegex(v) {
  return String(v || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var VOICE_LANGS = {
  it: "it-IT",
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-PT",
  pl: "pl-PL",
  nl: "nl-NL",
  ro: "ro-RO",
  el: "el-GR",
};
var VOICE_JOINERS = [
  "e",
  "ed",
  "and",
  "y",
  "con",
  "et",
  "und",
  "mit",
  "com",
  "i",
  "z",
  "en",
  "si",
  "și",
  "και",
  "me",
  "de",
  "di",
  "del",
  "da",
  "of",
  "van",
  "cent",
  "cents",
  "centimo",
  "centimos",
  "centesimo",
  "centesimi",
  "centime",
  "centimes",
  "centavo",
  "centavos",
  "grosz",
  "grosze",
  "groszy",
  "centi",
  "lei",
  "ban",
  "bani",
  "λεπτα",
  "λεπτο",
  "euro",
  "euros",
  "eur",
];
var VOICE_NUMBERS = {
  zero: 0,
  zer0: 0,
  μηδεν: 0,
  uno: 1,
  una: 1,
  un: 1,
  one: 1,
  a: 1,
  ein: 1,
  eine: 1,
  einen: 1,
  uno_es: 1,
  um: 1,
  uma: 1,
  jeden: 1,
  jedna: 1,
  jedno: 1,
  een: 1,
  unu: 1,
  una_ro: 1,
  ένα: 1,
  ενα: 1,
  μια: 1,
  μία: 1,
  due: 2,
  two: 2,
  dos: 2,
  deux: 2,
  zwei: 2,
  dois: 2,
  duas: 2,
  dwa: 2,
  dwie: 2,
  twee: 2,
  doi: 2,
  doua: 2,
  două: 2,
  δυο: 2,
  δύο: 2,
  δυο_gr: 2,
  tre: 3,
  three: 3,
  tres: 3,
  trois: 3,
  drei: 3,
  três: 3,
  tres_pt: 3,
  trzy: 3,
  drie: 3,
  trei: 3,
  τρια: 3,
  τρία: 3,
  quattro: 4,
  four: 4,
  cuatro: 4,
  quatre: 4,
  vier: 4,
  quatro: 4,
  cztery: 4,
  patru: 4,
  τεσσερα: 4,
  τέσσερα: 4,
  cinque: 5,
  five: 5,
  cinco: 5,
  cinq: 5,
  fünf: 5,
  funf: 5,
  pięć: 5,
  piec: 5,
  vijf: 5,
  cinci: 5,
  πεντε: 5,
  πέντε: 5,
  sei: 6,
  six: 6,
  seis: 6,
  sechs: 6,
  sześć: 6,
  szesc: 6,
  zes: 6,
  sase: 6,
  șase: 6,
  έξι: 6,
  εξι: 6,
  sette: 7,
  seven: 7,
  siete: 7,
  sept: 7,
  sieben: 7,
  sete: 7,
  siedem: 7,
  zeven: 7,
  sapte: 7,
  șapte: 7,
  επτα: 7,
  επτά: 7,
  otto: 8,
  eight: 8,
  ocho: 8,
  huit: 8,
  acht: 8,
  oito: 8,
  osiem: 8,
  opt: 8,
  οκτω: 8,
  οκτώ: 8,
  nove: 9,
  nine: 9,
  nueve: 9,
  neuf: 9,
  neun: 9,
  nove_pt: 9,
  dziewięć: 9,
  dziewiec: 9,
  negen: 9,
  noua: 9,
  nouă: 9,
  εννεα: 9,
  εννέα: 9,
  dieci: 10,
  ten: 10,
  diez: 10,
  dix: 10,
  zehn: 10,
  dez: 10,
  dziesięć: 10,
  dziesiec: 10,
  tien: 10,
  zece: 10,
  δεκα: 10,
  δέκα: 10,
  undici: 11,
  eleven: 11,
  once: 11,
  onze: 11,
  elf: 11,
  jedenaście: 11,
  jedenascie: 11,
  unsprezece: 11,
  εντεκα: 11,
  έντεκα: 11,
  dodici: 12,
  twelve: 12,
  doce: 12,
  douze: 12,
  zwolf: 12,
  zwölf: 12,
  dwanaście: 12,
  dwanascie: 12,
  twaalf: 12,
  doisprezece: 12,
  douasprezece: 12,
  δωδεκα: 12,
  δώδεκα: 12,
  tredici: 13,
  thirteen: 13,
  trece: 13,
  treize: 13,
  dreizehn: 13,
  treze: 13,
  trzynaście: 13,
  trzynascie: 13,
  dertien: 13,
  treisprezece: 13,
  quattordici: 14,
  fourteen: 14,
  catorce: 14,
  quatorze: 14,
  vierzehn: 14,
  catorze: 14,
  czternaście: 14,
  czternascie: 14,
  veertien: 14,
  paisprezece: 14,
  quindici: 15,
  fifteen: 15,
  quince: 15,
  quinze: 15,
  fünfzehn: 15,
  funfzehn: 15,
  quinze_pt: 15,
  piętnaście: 15,
  pietnascie: 15,
  vijftien: 15,
  cincisprezece: 15,
  sedici: 16,
  sixteen: 16,
  dieciseis: 16,
  seize: 16,
  sechzehn: 16,
  dezesseis: 16,
  szesnaście: 16,
  szesnascie: 16,
  zestien: 16,
  saisprezece: 16,
  șaisprezece: 16,
  diciassette: 17,
  seventeen: 17,
  diecisiete: 17,
  dix_sept: 17,
  dixsept: 17,
  siebzehn: 17,
  dezessete: 17,
  siedemnaście: 17,
  siedemnascie: 17,
  zeventien: 17,
  saptesprezece: 17,
  șaptesprezece: 17,
  diciotto: 18,
  eighteen: 18,
  dieciocho: 18,
  dix_huit: 18,
  dixhuit: 18,
  achtzehn: 18,
  dezoito: 18,
  osiemnaście: 18,
  osiemnascie: 18,
  achttien: 18,
  optsprezece: 18,
  diciannove: 19,
  nineteen: 19,
  diecinueve: 19,
  dix_neuf: 19,
  dixneuf: 19,
  neunzehn: 19,
  dezenove: 19,
  dziewiętnaście: 19,
  dziewietnascie: 19,
  negentien: 19,
  nouasprezece: 19,
  venti: 20,
  twenty: 20,
  veinte: 20,
  vingt: 20,
  zwanzig: 20,
  vinte: 20,
  dwadzieścia: 20,
  dwadziescia: 20,
  twintig: 20,
  douazeci: 20,
  είκοσι: 20,
  εικοσι: 20,
  trenta: 30,
  thirty: 30,
  treinta: 30,
  trente: 30,
  dreissig: 30,
  dreißig: 30,
  trinta: 30,
  trzydzieści: 30,
  trzydziesci: 30,
  dertig: 30,
  treizeci: 30,
  τριαντα: 30,
  τριάντα: 30,
  quaranta: 40,
  forty: 40,
  cuarenta: 40,
  quarante: 40,
  vierzig: 40,
  quarenta: 40,
  czterdzieści: 40,
  czterdziesci: 40,
  veertig: 40,
  patruzeci: 40,
  σαραντα: 40,
  σαράντα: 40,
  cinquanta: 50,
  fifty: 50,
  cincuenta: 50,
  cinquante: 50,
  fünfzig: 50,
  funfzig: 50,
  cinquenta: 50,
  pięćdziesiąt: 50,
  piecdziesiat: 50,
  vijftig: 50,
  cincizeci: 50,
  πενηντα: 50,
  πενήντα: 50,
  sessanta: 60,
  sixty: 60,
  sesenta: 60,
  soixante: 60,
  sechzig: 60,
  sessenta: 60,
  sześćdziesiąt: 60,
  szescdziesiat: 60,
  zestig: 60,
  saizeci: 60,
  εξηντα: 60,
  εξήντα: 60,
  settanta: 70,
  seventy: 70,
  setenta: 70,
  soixante_dix: 70,
  siebzig: 70,
  setenta_pt: 70,
  siedemdziesiąt: 70,
  siedemdziesiat: 70,
  zeventig: 70,
  saptezeci: 70,
  εβδομηντα: 70,
  εβδομήντα: 70,
  ottanta: 80,
  eighty: 80,
  ochenta: 80,
  quatre_vingts: 80,
  quatrevingts: 80,
  achtzig: 80,
  oitenta: 80,
  osiemdziesiąt: 80,
  osiemdziesiat: 80,
  tachtig: 80,
  optzeci: 80,
  ογδοντα: 80,
  ογδόντα: 80,
  novanta: 90,
  ninety: 90,
  noventa: 90,
  quatre_vingt_dix: 90,
  quatrevingtdix: 90,
  neunzig: 90,
  noventa_pt: 90,
  dziewięćdziesiąt: 90,
  dziewiecdziesiat: 90,
  negentig: 90,
  nouazeci: 90,
  ενενηντα: 90,
  ενενήντα: 90,
};
export function normalizeVoiceNumberToken(v) {
  return normalizeVoiceText(v).replace(/-/g, "_").replace(/\s+/g, "_");
}
export function voiceNumberToInt(v) {
  return voiceNumberPhraseValue(v);
}
export function voiceNumberPhraseValue(v) {
  var s = normalizeVoiceText(v).replace(/-/g, " ").trim();
  if (!s) return 0;
  if (/^\d+$/.test(s)) return parseInt(s, 10);
  var key = normalizeVoiceNumberToken(s);
  if (VOICE_NUMBERS[key] !== undefined) return VOICE_NUMBERS[key];
  var tokens = s.split(/\s+/).filter(function (x) {
    return x && !VOICE_JOINERS.includes(x);
  });
  var total = 0,
    current = 0;
  for (var i = 0; i < tokens.length; i++) {
    var tk = tokens[i],
      nk = normalizeVoiceNumberToken(tk);
    if (VOICE_NUMBERS[nk] !== undefined) {
      current += VOICE_NUMBERS[nk];
      continue;
    }
    if (
      [
        "hundred",
        "cento",
        "cien",
        "ciento",
        "cent",
        "hundert",
        "cem",
        "sto",
        "honderd",
        "suta",
        "sută",
        "εκατο",
      ].includes(nk)
    ) {
      current = (current || 1) * 100;
      continue;
    }
    if (
      [
        "thousand",
        "mille",
        "mil",
        "tausend",
        "tysiac",
        "tysiąc",
        "duizend",
        "mie",
        "χιλια",
      ].includes(nk)
    ) {
      total += (current || 1) * 1000;
      current = 0;
      continue;
    }
  }
  return total + current;
}
export function allVoiceNumberWords() {
  return Object.keys(VOICE_NUMBERS)
    .map(function (k) {
      return k.replace(/_/g, " ");
    })
    .sort(function (a, b) {
      return b.length - a.length;
    });
}
export function firstVoiceNumberFromText(v) {
  var s = normalizeVoiceText(v),
    m = s.match(/\b(\d{1,4})\b/);
  if (m) return parseInt(m[1], 10);
  var words = allVoiceNumberWords();
  for (var i = 0; i < words.length; i++) {
    if (new RegExp("\\b" + escapeVoiceRegex(words[i]) + "\\b", "i").test(s))
      return voiceNumberPhraseValue(words[i]);
  }
  return 0;
}
export function parseVoiceAmount(n) {
  var s = normalizeVoiceText(n);
  // Corregge trascrizioni tipiche del riconoscimento vocale: "4 4 euro" => "44 euro".
  // Il bug visto nello screenshot nasceva proprio da questo caso: 44 veniva letto come 4,04.
  for (var mergePass = 0; mergePass < 3; mergePass++) {
    s = s.replace(/\b(\d)\s+(\d)(?=\s*(?:euros|euro|eur)\b)/g, "$1$2");
    s = s.replace(
      /\b(\d)\s+(\d)(?=\s+(?:con|e|ed|and|y|cent|cents|centesimi|centimos)\b)/g,
      "$1$2"
    );
  }
  var decimalMatch = s.match(/\b(\d{1,6})[\.,](\d{1,2})\b/);
  if (decimalMatch)
    return parseFloat(decimalMatch[1] + "." + decimalMatch[2].padEnd(2, "0"));
  var connectors = "con|y|e|ed|and|et|und|mit|com|i|z|en|si|și|και|me";
  var centWords =
    "cent|cents|centimo|centimos|centesimo|centesimi|centime|centimes|centavo|centavos|grosz|grosze|groszy|lei|ban|bani|λεπτα|λεπτο";
  var explicitEuroCents = s.match(
    new RegExp(
      "\\b(\\d{1,6})\\s*(?:euros|euro|eur)\\s*(?:(?:" +
        connectors +
        ")\\s*)?(\\d{1,2})\\s*(?:" +
        centWords +
        ")?\\b",
      "i"
    )
  );
  if (explicitEuroCents) {
    var ew = parseInt(explicitEuroCents[1], 10),
      ec = parseInt(explicitEuroCents[2], 10);
    if (!isNaN(ew) && !isNaN(ec) && ec >= 0 && ec < 100) return ew + ec / 100;
  }
  var numericEuro = s.match(/\b(\d{1,6})\s*(?:euros|euro|eur)\b/);
  if (numericEuro) return parseFloat(numericEuro[1]);
  var numericWithCents = s.match(
    new RegExp(
      "\\b(\\d{1,6})\\s+(?:(?:" +
        connectors +
        ")\\s+)(\\d{1,2})\\s*(?:" +
        centWords +
        ")?\\b",
      "i"
    )
  );
  if (numericWithCents) {
    var nw = parseInt(numericWithCents[1], 10),
      nc = parseInt(numericWithCents[2], 10);
    if (!isNaN(nw) && !isNaN(nc) && nc >= 0 && nc < 100) return nw + nc / 100;
  }
  var numericWithExplicitCent = s.match(
    new RegExp("\\b(\\d{1,6})\\s+(\\d{1,2})\\s*(?:" + centWords + ")\\b", "i")
  );
  if (numericWithExplicitCent) {
    var cw = parseInt(numericWithExplicitCent[1], 10),
      cc = parseInt(numericWithExplicitCent[2], 10);
    if (!isNaN(cw) && !isNaN(cc) && cc >= 0 && cc < 100) return cw + cc / 100;
  }
  var wordList = allVoiceNumberWords().map(escapeVoiceRegex).join("|");
  var wordSeq =
    "(?:" +
    wordList +
    ")(?:\\s+(?:(?:" +
    connectors +
    ")\\s+)?(?:" +
    wordList +
    ")){0,4}";
  var wordEuro = new RegExp(
    "\\b(" +
      wordSeq +
      ")\\s*(?:euros|euro|eur)\\b(?:\\s*(?:(?:" +
      connectors +
      ")\\s*)?(" +
      wordSeq +
      "|\\d{1,2})(?:\\s*(?:" +
      centWords +
      "))?)?",
    "i"
  );
  var wm = s.match(wordEuro);
  if (wm) {
    var whole = voiceNumberPhraseValue(wm[1]);
    var cents = 0;
    if (wm[2]) {
      cents = /^\d+$/.test(wm[2].trim())
        ? parseInt(wm[2].trim(), 10)
        : voiceNumberPhraseValue(wm[2]);
      if (cents > 99) cents = 0;
    }
    return whole + (cents > 0 ? cents / 100 : 0);
  }
  var wordWithCentsNoEuro = new RegExp(
    "\\b(" +
      wordSeq +
      ")\\s+(?:" +
      connectors +
      ")\\s+(" +
      wordSeq +
      "|\\d{1,2})\\b",
    "i"
  );
  var wcn = s.match(wordWithCentsNoEuro);
  if (wcn) {
    var whole2 = voiceNumberPhraseValue(wcn[1]);
    var cents2 = /^\d+$/.test(wcn[2].trim())
      ? parseInt(wcn[2].trim(), 10)
      : voiceNumberPhraseValue(wcn[2]);
    if (whole2 > 0 && cents2 >= 0 && cents2 < 100) return whole2 + cents2 / 100;
  }
  var genericNumber = s.match(/\b(\d{1,6})\b/);
  if (genericNumber) return parseFloat(genericNumber[1]);
  var anyWord = s.match(new RegExp("\\b(" + wordSeq + ")\\b", "i"));
  return anyWord ? voiceNumberPhraseValue(anyWord[1]) : 0;
}
export function findByVoiceName(list, text) {
  var nt = normalizeVoiceText(text);
  var found = null;
  (list || []).forEach(function (item) {
    var nn = normalizeVoiceText(item.name || "");
    if (nn && new RegExp("\\b" + escapeVoiceRegex(nn) + "\\b", "i").test(nt)) {
      if (!found || nn.length > normalizeVoiceText(found.name || "").length)
        found = item;
    }
  });
  return found;
}
export function voiceContainsAny(n, words) {
  return words.some(function (w) {
    return new RegExp(
      "\\b" + escapeVoiceRegex(normalizeVoiceText(w)) + "\\b",
      "i"
    ).test(n);
  });
}
export function scoreVoiceCategory(c, n, rule) {
  var cn = normalizeVoiceText((c && c.name) || "");
  var score = 0;
  if (
    rule.names.some(function (name) {
      var nn = normalizeVoiceText(name);
      return cn === nn;
    })
  )
    score += 100;
  if (
    rule.names.some(function (name) {
      var nn = normalizeVoiceText(name);
      return cn.indexOf(nn) >= 0 || nn.indexOf(cn) >= 0;
    })
  )
    score += 55;
  if (
    rule.area &&
    normalizeVoiceText(c.group || "") === normalizeVoiceText(rule.area)
  )
    score += 18;
  if (
    rule.avoid &&
    rule.avoid.some(function (a) {
      return cn.indexOf(normalizeVoiceText(a)) >= 0;
    })
  )
    score -= 80;
  if (
    rule.words.some(function (w) {
      return cn.indexOf(normalizeVoiceText(w)) >= 0;
    })
  )
    score += 12;
  return score;
}
export function cleanVoiceDescription(txt, kind, cat, method, incomeType) {
  var raw = String(txt || ""),
    n = normalizeVoiceText(raw);
  function title(v) {
    return String(v || "")
      .trim()
      .replace(/\s+/g, " ")
      .replace(/^./, function (ch) {
        return ch.toUpperCase();
      });
  }
  var semantic = [
    {
      desc: "Supermercato",
      words: [
        "supermercato",
        "supermarket",
        "supermercado",
        "supermarche",
        "supermarkt",
        "sklep",
        "alimentari",
        "groceries",
        "compra",
        "compras",
        "zakupy",
        "boodschappen",
      ],
    },
    { desc: "Pizze", words: ["pizze", "pizzas"] },
    { desc: "Pizza", words: ["pizza", "pizzeria"] },
    {
      desc: "Ristorante",
      words: [
        "ristorante",
        "restaurant",
        "restaurante",
        "restauracja",
        "cena",
        "pranzo",
        "dinner",
        "lunch",
        "sushi",
        "kebab",
        "hamburger",
      ],
    },
    { desc: "Bar", words: ["bar", "caffe", "cafe", "coffee", "cappuccino"] },
    {
      desc: "Caramelle",
      words: ["caramella", "caramelle", "candy", "candies"],
    },
    {
      desc: "Carburante",
      words: [
        "benzina",
        "diesel",
        "gasolio",
        "carburante",
        "fuel",
        "gasolina",
        "paliwo",
      ],
    },
    {
      desc: "Farmacia",
      words: ["farmacia", "pharmacy", "pharmacie", "apotheke", "apteka"],
    },
    {
      desc: "Stipendio",
      words: ["stipendio", "salario", "salary", "payroll", "sueldo"],
    },
    {
      desc: "Latte",
      words: ["latte", "milk", "lait", "milch", "mleko", "melk", "lapte"],
    },
    {
      desc: "Pane",
      words: ["pane", "bread", "pain", "brot", "chleb", "brood"],
    },
    { desc: "Caffè", words: ["caffe", "espresso", "cappuccino", "macchiato"] },
    {
      desc: "Abbonamento",
      words: [
        "abbonamento",
        "subscription",
        "abonnement",
        "abonnement",
        "abonnierung",
      ],
    },
    {
      desc: "Affitto",
      words: ["affitto", "rent", "loyer", "miete", "czynsz", "huur"],
    },
    {
      desc: "Mutuo",
      words: ["mutuo", "mortgage", "hypotheque", "hypothek", "hipoteka"],
    },
    {
      desc: "Assicurazione",
      words: [
        "assicurazione",
        "insurance",
        "assurance",
        "versicherung",
        "ubezpieczenie",
      ],
    },
    {
      desc: "Bolletta",
      words: [
        "bolletta",
        "bollette",
        "utenza",
        "luce",
        "gas",
        "acqua",
        "electricity",
        "internet",
      ],
    },
    { desc: "Taxi", words: ["taxi", "uber", "cab", "cabify"] },
    { desc: "Palestra", words: ["palestra", "gym", "fitness", "salle"] },
    { desc: "Cinema", words: ["cinema", "film", "movie", "teatro", "theatre"] },
    { desc: "Aereo", words: ["aereo", "volo", "flight", "avion", "flug"] },
    {
      desc: "Hotel",
      words: ["hotel", "albergo", "ostello", "motel", "hostel"],
    },
    { desc: "Treno", words: ["treno", "train", "zug", "pociag"] },
    {
      desc: "Medicine",
      words: [
        "medicina",
        "medicine",
        "farmaco",
        "pillola",
        "compressa",
        "aspirina",
        "antibiotico",
      ],
    },
  ];
  // Find ALL semantic matches in order of appearance in the string
  var firstSemanticIdx = 9999,
    firstSemanticDesc = null;
  for (var i = 0; i < semantic.length; i++) {
    for (var j = 0; j < semantic[i].words.length; j++) {
      var ww = semantic[i].words[j];
      var wm = n.search(new RegExp("\\b" + escapeVoiceRegex(ww) + "\\b"));
      if (wm >= 0 && wm < firstSemanticIdx) {
        firstSemanticIdx = wm;
        firstSemanticDesc = semantic[i].desc;
      }
    }
  }
  // Strip noise words to find the "real" description
  var s = n;
  [
    "aggiungi",
    "aggiungere",
    "anadir",
    "add",
    "ajouter",
    "hinzufugen",
    "adicionar",
    "dodaj",
    "voeg",
    "adauga",
    "una",
    "un",
    "uscita",
    "uscite",
    "spesa",
    "spese",
    "expense",
    "expenses",
    "gasto",
    "gastos",
    "depense",
    "despesa",
    "ausgabe",
    "wydatek",
    "uitgave",
    "cheltuiala",
    "entrata",
    "entrate",
    "income",
    "ingreso",
    "ingresos",
    "revenu",
    "receita",
    "einnahme",
    "przychod",
    "inkomst",
    "venit",
    "ho",
    "hai",
    "pagato",
    "pagata",
    "pagati",
    "pagate",
    "paid",
    "paye",
    "bezahlt",
    "speso",
    "spesa",
    "spesi",
    "spese",
    "ricevuto",
    "ricevuta",
    "ricevuti",
    "ricevute",
    "received",
    "carta",
    "credito",
    "debito",
    "contanti",
    "cash",
    "bancomat",
    "paypal",
    "satispay",
    "bonifico",
    "pagamento",
    "metodo",
    "assegno",
    "transfer",
    "wire",
    "card",
    "debit",
    "credit",
    "ho",
    "hai",
    "abbiamo",
    "avete",
    "hanno",
    "di",
    "da",
    "per",
    "con",
    "in",
    "il",
    "la",
    "lo",
    "le",
    "gli",
    "al",
    "allo",
    "alla",
    "alle",
    "ai",
    "del",
    "della",
    "delle",
    "dei",
    "euro",
    "eur",
    "euros",
    "cent",
    "centesimi",
    "centesimo",
    "centavo",
    "oggi",
    "hoy",
    "today",
    "aujourd",
    "hui",
    "heute",
    "hoje",
    "dzis",
    "vandaag",
    "azi",
    "ieri",
    "ayer",
    "yesterday",
    "hier",
    "gestern",
    "ontem",
    "wczoraj",
    "gisteren",
    "fa",
    "hace",
    "ago",
    "vor",
    "dias",
    "dia",
    "giorni",
    "giorno",
    "days",
    "day",
    "tage",
    "mois",
    "mesi",
    "months",
    "meses",
    "rateizza",
    "rateizzata",
    "split",
    "dividi",
    "ricorrente",
    "mensile",
    "mese",
    "tre",
    "due",
    "uno",
    "uno",
    "una",
    "quattro",
    "cinque",
    "sei",
    "sette",
    "otto",
    "nove",
    "dieci",
    "venti",
    "trenta",
    "forty",
    "fifty",
    "three",
    "two",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
  ].forEach(function (w) {
    s = s.replace(
      new RegExp("\\b" + escapeVoiceRegex(normalizeVoiceText(w)) + "\\b", "ig"),
      " "
    );
  });
  s = s.replace(/\d+(?:[.,]\d+)?/g, " ");
  if (cat && cat.name)
    s = s.replace(
      new RegExp(
        "\\b" + escapeVoiceRegex(normalizeVoiceText(cat.name)) + "\\b",
        "ig"
      ),
      " "
    );
  if (method && method.name)
    s = s.replace(
      new RegExp(
        "\\b" + escapeVoiceRegex(normalizeVoiceText(method.name)) + "\\b",
        "ig"
      ),
      " "
    );
  s = s.replace(/\s+/g, " ").trim();
  // Prefer non-noise words as description (more specific than category name)
  if (s) return title(s);
  // Fall back to semantic match
  if (firstSemanticDesc) return firstSemanticDesc;
  if (kind === "income" && incomeType && incomeType.name)
    return incomeType.name;
  if (cat && cat.name) return cat.name;
  return kind === "income" ? "Entrata" : "Spesa";
}

export function parseVoiceDate(n) {
  var date = todayStr();
  if (
    /\b(ieri|ayer|yesterday|hier|gestern|ontem|wczoraj|gisteren|ieri|χθες)\b/.test(
      n
    )
  )
    return dateOffset(1);
  if (
    /\b(avantieri|altro ieri|anteayer|day before yesterday|vorgestern|anteontem|przedwczoraj|eergisteren|alaltaieri|προχθες)\b/.test(
      n
    )
  )
    return dateOffset(2);
  var dayWords =
    "giorni|giorno|days|day|dias|dia|jours|jour|tage|tag|dias|dzien|dni|dagen|zi|ημερες|ημερα";
  var numericDays = n.match(
    new RegExp(
      "\\b(?:hace|il y a|vor|ha|há|temu|acum)?\\s*(\\d{1,2})\\s*(?:" +
        dayWords +
        ")\\s*(?:fa|ago|temu)?\\b",
      "i"
    )
  );
  var wordList = allVoiceNumberWords().map(escapeVoiceRegex).join("|");
  var wordDays = n.match(
    new RegExp(
      "\\b(?:hace|il y a|vor|ha|há|temu|acum)?\\s*(" +
        wordList +
        ")\\s*(?:" +
        dayWords +
        ")\\s*(?:fa|ago|temu)?\\b",
      "i"
    )
  );
  var days = numericDays
    ? parseInt(numericDays[1], 10)
    : wordDays
    ? voiceNumberToInt(wordDays[1])
    : 0;
  if (days > 0) return dateOffset(days);
  return date;
}
export function parseVoiceRate(n) {
  var hasRateWord =
    /\b(rateizza|rateizzare|rateizzata|rateizzato|dividi|divisa|diviso|split|amort|riparti|distribuisci|spalma|reparte|dividir|dividido|mensual|mensile|monthly|monatlich|mensuel|mensal|rata|installment|instalment|parcelar|raty|rate)\b/.test(
      n
    );
  var hasRecurringWord =
    /\b(ricorrente|ricorrenti|recurring|mensile|mensili|ogni mese|every month|cada mes|chaque mois|jeden monat|todo mes|co miesiac|elke maand|lunar)\b/.test(
      n
    );
  var rateMatch =
    n.match(
      /(?:rateizz\w*|dividi|divisa|diviso|split|amort|riparti|distribuisci|spalma|reparte|dividir|dividido|parcelar|raty|rate)[^0-9]{0,30}(\d{1,2})/
    ) ||
    n.match(
      /(\d{1,2})\s*(?:mesi|months|meses|mois|monate|meses|miesiecy|maanden|luni)\b/
    );
  var rate = rateMatch
    ? Math.max(2, Math.min(60, parseInt(rateMatch[1], 10)))
    : 12;
  return {
    rateizzato: !!(rateMatch || hasRateWord || hasRecurringWord),
    rate: rate,
  };
}
export function voiceUiText(code) {
  var dict = {
    it: {
      title: "Aggiunta vocale",
      sub: "Spese o entrate con anteprima obbligatoria",
      listening: "Sto ascoltando...",
      retry: "🎙️ Riprova ascolto",
      hint: "La registrazione parte automaticamente quando apri questa schermata. Usa il pulsante solo se vuoi riprovare.",
      examples:
        "Esempi: “Aggiungi uscita 12 euro supermercato oggi”, “Aggiungi entrata 1500 euro stipendio”, “Spesa 240 euro assicurazione rateizzata in 12 mesi”.",
      placeholder: "Oppure scrivi qui il comando vocale...",
      analyze: "Analizza comando",
      cancel: "Annulla",
      save: "Salva",
      exp: "Uscita",
      inc: "Entrata",
      recognized: " riconosciuta",
      amount: "Importo",
      date: "Data",
      cat: "Categoria",
      method: "Metodo",
      type: "Tipo",
      desc: "Descrizione",
      inst: "Rateizzazione",
      no: "No",
      months: "mesi",
      invalid:
        "Non ho trovato un importo valido. Esempio: Aggiungi uscita 12 euro supermercato oggi",
      savedExp: "Uscita aggiunta con la voce",
      savedInc: "Entrata aggiunta con la voce",
      speak: "Parla ora",
    },
    en: {
      title: "Voice entry",
      sub: "Expenses or income with mandatory preview",
      listening: "Listening...",
      retry: "🎙️ Retry listening",
      hint: "Recording starts automatically when you open this screen. Use the button only to retry.",
      examples:
        "Examples: “Add expense 12 euro supermarket today”, “Add income 1500 euro salary”, “Expense 240 euro insurance split over 12 months”.",
      placeholder: "Or type the voice command here...",
      analyze: "Analyze command",
      cancel: "Cancel",
      save: "Save",
      exp: "Expense",
      inc: "Income",
      recognized: " recognized",
      amount: "Amount",
      date: "Date",
      cat: "Category",
      method: "Method",
      type: "Type",
      desc: "Description",
      inst: "Instalment",
      no: "No",
      months: "months",
      invalid:
        "I did not find a valid amount. Example: Add expense 12 euro supermarket today",
      savedExp: "Expense added by voice",
      savedInc: "Income added by voice",
      speak: "Speak now",
    },
    es: {
      title: "Añadido por voz",
      sub: "Gastos o ingresos con vista previa obligatoria",
      listening: "Estoy escuchando...",
      retry: "🎙️ Reintentar escucha",
      hint: "La grabación empieza automáticamente al abrir esta pantalla. Usa el botón solo si quieres intentarlo de nuevo.",
      examples:
        "Ejemplos: “Añadir gasto 12 euro supermercado hoy”, “Añadir ingreso 1500 euro salario”, “Gasto 240 euro seguro dividido en 12 meses”.",
      placeholder: "O escribe aquí el comando de voz...",
      analyze: "Analizar comando",
      cancel: "Cancelar",
      save: "Guardar",
      exp: "Gasto",
      inc: "Ingreso",
      recognized: " reconocido",
      amount: "Importe",
      date: "Fecha",
      cat: "Categoría",
      method: "Método",
      type: "Tipo",
      desc: "Descripción",
      inst: "División",
      no: "No",
      months: "meses",
      invalid:
        "No he encontrado un importe válido. Ejemplo: Añadir gasto 12 euro supermercado hoy",
      savedExp: "Gasto añadido por voz",
      savedInc: "Ingreso añadido por voz",
      speak: "Habla ahora",
    },
    fr: {
      title: "Ajout vocal",
      sub: "Dépenses ou revenus avec aperçu obligatoire",
      listening: "J’écoute...",
      retry: "🎙️ Réessayer l’écoute",
      hint: "L’enregistrement démarre automatiquement à l’ouverture de cet écran. Utilisez le bouton seulement pour réessayer.",
      examples:
        "Exemples : “Ajouter dépense 12 euro supermarché aujourd’hui”, “Ajouter revenu 1500 euro salaire”, “Dépense 240 euro assurance répartie sur 12 mois”.",
      placeholder: "Ou écrivez ici la commande vocale...",
      analyze: "Analyser la commande",
      cancel: "Annuler",
      save: "Enregistrer",
      exp: "Dépense",
      inc: "Revenu",
      recognized: " reconnu",
      amount: "Montant",
      date: "Date",
      cat: "Catégorie",
      method: "Méthode",
      type: "Type",
      desc: "Description",
      inst: "Échelonnement",
      no: "Non",
      months: "mois",
      invalid:
        "Je n’ai pas trouvé de montant valide. Exemple : Ajouter dépense 12 euro supermarché aujourd’hui",
      savedExp: "Dépense ajoutée par la voix",
      savedInc: "Revenu ajouté par la voix",
      speak: "Parlez maintenant",
    },
    de: {
      title: "Spracheingabe",
      sub: "Ausgaben oder Einnahmen mit Pflichtvorschau",
      listening: "Ich höre zu...",
      retry: "🎙️ Erneut anhören",
      hint: "Die Aufnahme startet automatisch beim Öffnen dieses Bildschirms. Verwende die Taste nur zum Wiederholen.",
      examples:
        "Beispiele: „Ausgabe 12 Euro Supermarkt heute hinzufügen“, „Einnahme 1500 Euro Gehalt hinzufügen“, „Ausgabe 240 Euro Versicherung auf 12 Monate aufteilen“.",
      placeholder: "Oder Sprachbefehl hier eingeben...",
      analyze: "Befehl analysieren",
      cancel: "Abbrechen",
      save: "Speichern",
      exp: "Ausgabe",
      inc: "Einnahme",
      recognized: " erkannt",
      amount: "Betrag",
      date: "Datum",
      cat: "Kategorie",
      method: "Methode",
      type: "Typ",
      desc: "Beschreibung",
      inst: "Ratenaufteilung",
      no: "Nein",
      months: "Monate",
      invalid:
        "Ich habe keinen gültigen Betrag gefunden. Beispiel: Ausgabe 12 Euro Supermarkt heute hinzufügen",
      savedExp: "Ausgabe per Sprache hinzugefügt",
      savedInc: "Einnahme per Sprache hinzugefügt",
      speak: "Jetzt sprechen",
    },
    pt: {
      title: "Entrada por voz",
      sub: "Despesas ou receitas com pré-visualização obrigatória",
      listening: "A ouvir...",
      retry: "🎙️ Tentar ouvir novamente",
      hint: "A gravação começa automaticamente ao abrir este ecrã. Use o botão apenas para tentar novamente.",
      examples:
        "Exemplos: “Adicionar despesa 12 euro supermercado hoje”, “Adicionar receita 1500 euro salário”, “Despesa 240 euro seguro dividido em 12 meses”.",
      placeholder: "Ou escreva aqui o comando de voz...",
      analyze: "Analisar comando",
      cancel: "Cancelar",
      save: "Guardar",
      exp: "Despesa",
      inc: "Receita",
      recognized: " reconhecida",
      amount: "Valor",
      date: "Data",
      cat: "Categoria",
      method: "Método",
      type: "Tipo",
      desc: "Descrição",
      inst: "Parcelamento",
      no: "Não",
      months: "meses",
      invalid:
        "Não encontrei um valor válido. Exemplo: Adicionar despesa 12 euro supermercado hoje",
      savedExp: "Despesa adicionada por voz",
      savedInc: "Receita adicionada por voz",
      speak: "Fale agora",
    },
    pl: {
      title: "Dodawanie głosowe",
      sub: "Wydatki lub przychody z obowiązkowym podglądem",
      listening: "Słucham...",
      retry: "🎙️ Spróbuj ponownie",
      hint: "Nagrywanie zaczyna się automatycznie po otwarciu tego ekranu. Użyj przycisku tylko, aby spróbować ponownie.",
      examples:
        "Przykłady: „Dodaj wydatek 12 euro supermarket dziś”, „Dodaj przychód 1500 euro pensja”, „Wydatek 240 euro ubezpieczenie podzielone na 12 miesięcy”.",
      placeholder: "Albo wpisz tutaj polecenie głosowe...",
      analyze: "Analizuj polecenie",
      cancel: "Anuluj",
      save: "Zapisz",
      exp: "Wydatek",
      inc: "Przychód",
      recognized: " rozpoznany",
      amount: "Kwota",
      date: "Data",
      cat: "Kategoria",
      method: "Metoda",
      type: "Typ",
      desc: "Opis",
      inst: "Raty",
      no: "Nie",
      months: "miesięcy",
      invalid:
        "Nie znaleziono prawidłowej kwoty. Przykład: Dodaj wydatek 12 euro supermarket dziś",
      savedExp: "Wydatek dodany głosowo",
      savedInc: "Przychód dodany głosowo",
      speak: "Mów teraz",
    },
    nl: {
      title: "Spraakinvoer",
      sub: "Uitgaven of inkomsten met verplichte preview",
      listening: "Ik luister...",
      retry: "🎙️ Opnieuw luisteren",
      hint: "De opname start automatisch wanneer je dit scherm opent. Gebruik de knop alleen om opnieuw te proberen.",
      examples:
        "Voorbeelden: “Voeg uitgave 12 euro supermarkt vandaag toe”, “Voeg inkomen 1500 euro salaris toe”, “Uitgave 240 euro verzekering verdeeld over 12 maanden”.",
      placeholder: "Of typ hier de spraakopdracht...",
      analyze: "Opdracht analyseren",
      cancel: "Annuleren",
      save: "Opslaan",
      exp: "Uitgave",
      inc: "Inkomst",
      recognized: " herkend",
      amount: "Bedrag",
      date: "Datum",
      cat: "Categorie",
      method: "Methode",
      type: "Type",
      desc: "Beschrijving",
      inst: "Gespreid",
      no: "Nee",
      months: "maanden",
      invalid:
        "Geen geldig bedrag gevonden. Voorbeeld: Voeg uitgave 12 euro supermarkt vandaag toe",
      savedExp: "Uitgave via stem toegevoegd",
      savedInc: "Inkomst via stem toegevoegd",
      speak: "Spreek nu",
    },
    ro: {
      title: "Introducere vocală",
      sub: "Cheltuieli sau venituri cu previzualizare obligatorie",
      listening: "Ascult...",
      retry: "🎙️ Reîncearcă ascultarea",
      hint: "Înregistrarea pornește automat când deschizi acest ecran. Folosește butonul doar pentru a încerca din nou.",
      examples:
        "Exemple: „Adaugă cheltuială 12 euro supermarket azi”, „Adaugă venit 1500 euro salariu”, „Cheltuială 240 euro asigurare împărțită în 12 luni”.",
      placeholder: "Sau scrie aici comanda vocală...",
      analyze: "Analizează comanda",
      cancel: "Anulează",
      save: "Salvează",
      exp: "Cheltuială",
      inc: "Venit",
      recognized: " recunoscută",
      amount: "Sumă",
      date: "Dată",
      cat: "Categorie",
      method: "Metodă",
      type: "Tip",
      desc: "Descriere",
      inst: "Eșalonare",
      no: "Nu",
      months: "luni",
      invalid:
        "Nu am găsit o sumă validă. Exemplu: Adaugă cheltuială 12 euro supermarket azi",
      savedExp: "Cheltuială adăugată vocal",
      savedInc: "Venit adăugat vocal",
      speak: "Vorbește acum",
    },
    el: {
      title: "Φωνητική εισαγωγή",
      sub: "Έξοδα ή έσοδα με υποχρεωτική προεπισκόπηση",
      listening: "Ακούω...",
      retry: "🎙️ Δοκιμή ξανά",
      hint: "Η εγγραφή ξεκινά αυτόματα όταν ανοίγετε αυτή την οθόνη. Χρησιμοποιήστε το κουμπί μόνο για νέα προσπάθεια.",
      examples:
        "Παραδείγματα: “Προσθήκη εξόδου 12 ευρώ σούπερ μάρκετ σήμερα”, “Προσθήκη εσόδου 1500 ευρώ μισθός”, “Έξοδο 240 ευρώ ασφάλεια σε 12 μήνες”.",
      placeholder: "Ή γράψτε εδώ τη φωνητική εντολή...",
      analyze: "Ανάλυση εντολής",
      cancel: "Άκυρο",
      save: "Αποθήκευση",
      exp: "Έξοδο",
      inc: "Έσοδο",
      recognized: " αναγνωρίστηκε",
      amount: "Ποσό",
      date: "Ημερομηνία",
      cat: "Κατηγορία",
      method: "Μέθοδος",
      type: "Τύπος",
      desc: "Περιγραφή",
      inst: "Δόσεις",
      no: "Όχι",
      months: "μήνες",
      invalid:
        "Δεν βρήκα έγκυρο ποσό. Παράδειγμα: Προσθήκη εξόδου 12 ευρώ σούπερ μάρκετ σήμερα",
      savedExp: "Το έξοδο προστέθηκε φωνητικά",
      savedInc: "Το έσοδο προστέθηκε φωνητικά",
      speak: "Μιλήστε τώρα",
    },
  };
  return dict[code] || dict.en;
}
export function VoiceEntryModal(props?: any) {
  var embedded = !!(props && props.embedded);
  var c: any = useApp();
  var currentPlan = String((c && c.currentPlan) || "free");
  var quickRequested = false,
    assistantRequested = false;
  try {
    quickRequested =
      localStorage.getItem("fainance_voice_quick_mode_once") === "1";
    assistantRequested =
      localStorage.getItem("fainance_voice_assistant_mode_once") === "1";
    localStorage.removeItem("fainance_voice_quick_mode_once");
    localStorage.removeItem("fainance_voice_assistant_mode_once");
  } catch (e) {}
  var [mode, setMode] = useState(
    assistantRequested
      ? "assistant"
      : (currentPlan === "base" || currentPlan === "premium") && !quickRequested
      ? "assistant"
      : "quick"
  );
  if (embedded)
    return (
      <VoiceAssistantModal
        embedded
        onQuick={function () {}}
      />
    );
  if (mode === "quick") return <QuickVoiceEntryModal />;
  return (
    <VoiceAssistantModal
      onQuick={function () {
        setMode("quick");
      }}
    />
  );
}

function assistantVoiceUiText(code) {
  var dict: any = {
    it: {
      title: "Agente AI",
      sub: "Parla con fAInance, fai domande e chiedi di eseguire operazioni",
      listening: "Sto ascoltando...",
      speak: "Parla",
      stop: "Interrompi e parla",
      continuous: "Conversazione continua",
      placeholder: "Scrivi o pronuncia una richiesta...",
      send: "Invia",
      close: "Chiudi",
      quick: "Inserimento rapido",
      thinking: "Sto analizzando...",
      empty:
        "Parlami delle tue finanze, chiedimi qualsiasi argomento finanziario oppure dimmi di creare e modificare movimenti, ricorrenti, obiettivi, budget, alert, debiti, patrimonio, liste, appunti, Share e impostazioni dell’app.",
      confirm: "Operazione pronta",
      execute: "Esegui",
      cancel: "Annulla",
      consentTitle: "Autorizza l’assistente AI",
      consentText:
        "Per rispondere e interpretare le operazioni, fAInance invia a OpenAI la tua richiesta e i dati finanziari consentiti nelle impostazioni. Non vengono inviati password, dati biometrici o dati completi delle carte.",
      accept: "Accetto e continuo",
      cancelled: "Operazione annullata.",
      done: "Operazione completata.",
      unavailable:
        "Il riconoscimento vocale non è disponibile. Puoi comunque scrivere la richiesta.",
      error: "Non riesco a contattare l’assistente in questo momento.",
    },
    en: {
      title: "AI Agent",
      sub: "Talk to fAInance, ask questions and request actions",
      listening: "Listening...",
      speak: "Speak",
      stop: "Stop",
      continuous: "Continuous conversation",
      placeholder: "Type or say a request...",
      send: "Send",
      close: "Close",
      quick: "Quick entry",
      thinking: "Analysing...",
      empty:
        "Ask about your finances or the app, or tell me to add an expense, income, goal or shopping list.",
      confirm: "Action ready",
      execute: "Run",
      cancel: "Cancel",
      consentTitle: "Authorise the AI assistant",
      consentText:
        "To answer and interpret actions, fAInance sends OpenAI your request and the financial data allowed in settings. Passwords, biometric data and full card details are not sent.",
      accept: "Accept and continue",
      cancelled: "Action cancelled.",
      done: "Action completed.",
      unavailable:
        "Voice recognition is unavailable. You can still type your request.",
      error: "I cannot contact the assistant right now.",
    },
    es: {
      title: "Agente IA",
      sub: "Habla con fAInance, haz preguntas y solicita acciones",
      listening: "Escuchando...",
      speak: "Hablar",
      stop: "Interrumpir",
      continuous: "Conversación continua",
      placeholder: "Escribe o di una solicitud...",
      send: "Enviar",
      close: "Cerrar",
      quick: "Entrada rápida",
      thinking: "Analizando...",
      empty:
        "Pregunta por tus finanzas o la app, o pide añadir un gasto, ingreso, objetivo o lista de la compra.",
      confirm: "Operación lista",
      execute: "Ejecutar",
      cancel: "Cancelar",
      consentTitle: "Autoriza el asistente de IA",
      consentText:
        "Para responder e interpretar operaciones, fAInance envía a OpenAI tu solicitud y los datos financieros permitidos en los ajustes. No se envían contraseñas, datos biométricos ni datos completos de tarjetas.",
      accept: "Acepto y continúo",
      cancelled: "Operación cancelada.",
      done: "Operación completada.",
      unavailable:
        "El reconocimiento de voz no está disponible. Puedes escribir la solicitud.",
      error: "No puedo contactar con el asistente ahora.",
    },
    fr: {
      title: "Agent IA",
      sub: "Parlez à fAInance, posez des questions et demandez des actions",
      listening: "J’écoute...",
      speak: "Parler",
      stop: "Interrompre",
      continuous: "Conversation continue",
      placeholder: "Écrivez ou prononcez une demande...",
      send: "Envoyer",
      close: "Fermer",
      quick: "Saisie rapide",
      thinking: "Analyse en cours...",
      empty:
        "Posez une question sur vos finances ou l’app, ou demandez d’ajouter une dépense, un revenu, un objectif ou une liste de courses.",
      confirm: "Opération prête",
      execute: "Exécuter",
      cancel: "Annuler",
      consentTitle: "Autoriser l’assistant IA",
      consentText:
        "Pour répondre et interpréter les actions, fAInance envoie à OpenAI votre demande et les données financières autorisées dans les réglages. Les mots de passe, données biométriques et données complètes des cartes ne sont pas envoyés.",
      accept: "J’accepte et je continue",
      cancelled: "Opération annulée.",
      done: "Opération terminée.",
      unavailable:
        "La reconnaissance vocale n’est pas disponible. Vous pouvez écrire votre demande.",
      error: "Impossible de contacter l’assistant actuellement.",
    },
    de: {
      title: "KI-Agent",
      sub: "Sprich mit fAInance, stelle Fragen und fordere Aktionen an",
      listening: "Ich höre zu...",
      speak: "Sprechen",
      stop: "Unterbrechen",
      continuous: "Fortlaufendes Gespräch",
      placeholder: "Anfrage schreiben oder sprechen...",
      send: "Senden",
      close: "Schließen",
      quick: "Schnelleingabe",
      thinking: "Analyse läuft...",
      empty:
        "Frage nach deinen Finanzen oder der App oder bitte darum, eine Ausgabe, Einnahme, ein Ziel oder eine Einkaufsliste hinzuzufügen.",
      confirm: "Aktion bereit",
      execute: "Ausführen",
      cancel: "Abbrechen",
      consentTitle: "KI-Assistenten autorisieren",
      consentText:
        "Für Antworten und Aktionen sendet fAInance deine Anfrage und die in den Einstellungen erlaubten Finanzdaten an OpenAI. Passwörter, biometrische Daten und vollständige Kartendaten werden nicht gesendet.",
      accept: "Akzeptieren und fortfahren",
      cancelled: "Aktion abgebrochen.",
      done: "Aktion abgeschlossen.",
      unavailable:
        "Spracherkennung ist nicht verfügbar. Du kannst die Anfrage schreiben.",
      error: "Der Assistent ist derzeit nicht erreichbar.",
    },
    pt: {
      title: "Agente de IA",
      sub: "Fale com o fAInance, faça perguntas e peça ações",
      listening: "A ouvir...",
      speak: "Falar",
      stop: "Interromper",
      continuous: "Conversa contínua",
      placeholder: "Escreva ou diga um pedido...",
      send: "Enviar",
      close: "Fechar",
      quick: "Entrada rápida",
      thinking: "A analisar...",
      empty:
        "Pergunte sobre as suas finanças ou a app, ou peça para adicionar uma despesa, receita, objetivo ou lista de compras.",
      confirm: "Operação pronta",
      execute: "Executar",
      cancel: "Cancelar",
      consentTitle: "Autorizar o assistente de IA",
      consentText:
        "Para responder e interpretar ações, o fAInance envia à OpenAI o seu pedido e os dados financeiros permitidos nas definições. Não são enviados dados biométricos, palavras-passe ou dados completos de cartões.",
      accept: "Aceito e continuo",
      cancelled: "Operação cancelada.",
      done: "Operação concluída.",
      unavailable:
        "O reconhecimento de voz não está disponível. Pode escrever o pedido.",
      error: "Não consigo contactar o assistente agora.",
    },
    pl: {
      title: "Agent AI",
      sub: "Rozmawiaj z fAInance, zadawaj pytania i zlecaj działania",
      listening: "Słucham...",
      speak: "Mów",
      stop: "Przerwij",
      continuous: "Ciągła rozmowa",
      placeholder: "Wpisz lub wypowiedz polecenie...",
      send: "Wyślij",
      close: "Zamknij",
      quick: "Szybkie dodawanie",
      thinking: "Analizuję...",
      empty:
        "Zapytaj o finanse lub aplikację albo poproś o dodanie wydatku, przychodu, celu lub listy zakupów.",
      confirm: "Działanie gotowe",
      execute: "Wykonaj",
      cancel: "Anuluj",
      consentTitle: "Zezwól na asystenta AI",
      consentText:
        "Aby odpowiadać i interpretować działania, fAInance wysyła do OpenAI Twoje polecenie i dane finansowe dozwolone w ustawieniach. Hasła, dane biometryczne i pełne dane kart nie są wysyłane.",
      accept: "Akceptuję i kontynuuję",
      cancelled: "Działanie anulowane.",
      done: "Działanie zakończone.",
      unavailable:
        "Rozpoznawanie mowy jest niedostępne. Możesz wpisać polecenie.",
      error: "Nie można teraz połączyć się z asystentem.",
    },
    nl: {
      title: "AI-agent",
      sub: "Praat met fAInance, stel vragen en vraag acties",
      listening: "Ik luister...",
      speak: "Spreken",
      stop: "Onderbreken",
      continuous: "Doorlopend gesprek",
      placeholder: "Typ of spreek een verzoek...",
      send: "Verzenden",
      close: "Sluiten",
      quick: "Snelle invoer",
      thinking: "Bezig met analyseren...",
      empty:
        "Vraag naar je financiën of de app, of vraag om een uitgave, inkomen, doel of boodschappenlijst toe te voegen.",
      confirm: "Actie klaar",
      execute: "Uitvoeren",
      cancel: "Annuleren",
      consentTitle: "AI-assistent toestaan",
      consentText:
        "Om antwoorden en acties te verwerken stuurt fAInance je verzoek en de in de instellingen toegestane financiële gegevens naar OpenAI. Wachtwoorden, biometrische gegevens en volledige kaartgegevens worden niet verzonden.",
      accept: "Accepteren en doorgaan",
      cancelled: "Actie geannuleerd.",
      done: "Actie voltooid.",
      unavailable:
        "Spraakherkenning is niet beschikbaar. Je kunt het verzoek typen.",
      error: "De assistent is nu niet bereikbaar.",
    },
    ro: {
      title: "Agent AI",
      sub: "Vorbește cu fAInance, pune întrebări și solicită acțiuni",
      listening: "Ascult...",
      speak: "Vorbește",
      stop: "Întrerupe",
      continuous: "Conversație continuă",
      placeholder: "Scrie sau spune o solicitare...",
      send: "Trimite",
      close: "Închide",
      quick: "Introducere rapidă",
      thinking: "Analizez...",
      empty:
        "Întreabă despre finanțele tale sau aplicație ori cere adăugarea unei cheltuieli, unui venit, obiectiv sau liste de cumpărături.",
      confirm: "Operațiune pregătită",
      execute: "Execută",
      cancel: "Anulează",
      consentTitle: "Autorizează asistentul AI",
      consentText:
        "Pentru răspunsuri și acțiuni, fAInance trimite către OpenAI solicitarea și datele financiare permise în setări. Nu sunt trimise parole, date biometrice sau date complete ale cardurilor.",
      accept: "Accept și continui",
      cancelled: "Operațiune anulată.",
      done: "Operațiune finalizată.",
      unavailable:
        "Recunoașterea vocală nu este disponibilă. Poți scrie solicitarea.",
      error: "Asistentul nu poate fi contactat acum.",
    },
    el: {
      title: "Πράκτορας AI",
      sub: "Μιλήστε με το fAInance, κάντε ερωτήσεις και ζητήστε ενέργειες",
      listening: "Ακούω...",
      speak: "Μιλήστε",
      stop: "Διακοπή",
      continuous: "Συνεχής συνομιλία",
      placeholder: "Γράψτε ή πείτε ένα αίτημα...",
      send: "Αποστολή",
      close: "Κλείσιμο",
      quick: "Γρήγορη εισαγωγή",
      thinking: "Ανάλυση...",
      empty:
        "Ρωτήστε για τα οικονομικά σας ή την εφαρμογή ή ζητήστε να προστεθεί έξοδο, έσοδο, στόχος ή λίστα αγορών.",
      confirm: "Η ενέργεια είναι έτοιμη",
      execute: "Εκτέλεση",
      cancel: "Ακύρωση",
      consentTitle: "Εξουσιοδότηση βοηθού AI",
      consentText:
        "Για απαντήσεις και ενέργειες, το fAInance στέλνει στην OpenAI το αίτημά σας και τα οικονομικά δεδομένα που επιτρέπονται στις ρυθμίσεις. Δεν αποστέλλονται κωδικοί, βιομετρικά ή πλήρη στοιχεία καρτών.",
      accept: "Αποδοχή και συνέχεια",
      cancelled: "Η ενέργεια ακυρώθηκε.",
      done: "Η ενέργεια ολοκληρώθηκε.",
      unavailable:
        "Η αναγνώριση φωνής δεν είναι διαθέσιμη. Μπορείτε να γράψετε το αίτημα.",
      error: "Δεν είναι δυνατή η σύνδεση με τον βοηθό τώρα.",
    },
  };
  return dict[code] || dict.en;
}

function assistantVoiceReadyPlaceholder(code) {
  var d: any = {
    it: "Scrivi qui",
    en: "Type here",
    es: "Escribe aquí",
    fr: "Écrivez ici",
    de: "Hier schreiben",
    pt: "Escreva aqui",
    pl: "Napisz tutaj",
    nl: "Schrijf hier",
    ro: "Scrie aici",
    el: "Γράψτε εδώ",
  };
  return d[code] || d.en;
}

function assistantChatMenuText(code) {
  var d: any = {
    it: { clear: "Pulisci chat", confirm: "Vuoi cancellare tutta la conversazione?", cleared: "Chat pulita" },
    en: { clear: "Clear chat", confirm: "Do you want to delete the entire conversation?", cleared: "Chat cleared" },
    es: { clear: "Limpiar chat", confirm: "¿Quieres borrar toda la conversación?", cleared: "Chat borrado" },
    fr: { clear: "Effacer le chat", confirm: "Voulez-vous supprimer toute la conversation ?", cleared: "Chat effacé" },
    de: { clear: "Chat leeren", confirm: "Möchtest du die gesamte Unterhaltung löschen?", cleared: "Chat geleert" },
    pt: { clear: "Limpar chat", confirm: "Queres apagar toda a conversa?", cleared: "Chat limpo" },
    pl: { clear: "Wyczyść czat", confirm: "Czy chcesz usunąć całą rozmowę?", cleared: "Czat wyczyszczony" },
    nl: { clear: "Chat wissen", confirm: "Wil je het hele gesprek verwijderen?", cleared: "Chat gewist" },
    ro: { clear: "Șterge chatul", confirm: "Vrei să ștergi întreaga conversație?", cleared: "Chat șters" },
    el: { clear: "Καθαρισμός συνομιλίας", confirm: "Θέλετε να διαγράψετε ολόκληρη τη συνομιλία;", cleared: "Η συνομιλία καθαρίστηκε" },
  };
  return d[code] || d.en;
}

function assistantRealtimeUiText(code) {
  var d: any = {
    it: {
      connectingTitle: "Attendi: connessione vocale in corso",
      connectingSub:
        "Non parlare ancora. Ti avviso appena il microfono è pronto.",
      readyTitle: "Microfono pronto: ora puoi parlare",
      readySub: "Parla liberamente. Puoi interrompermi iniziando a parlare.",
      listeningTitle: "Ti sto ascoltando…",
      listeningSub: "Continua a parlare e concludi la frase normalmente.",
      speakingTitle: "Sto rispondendo",
      speakingSub: "Puoi interrompermi semplicemente iniziando a parlare.",
      inactiveTitle: "Conversazione vocale non attiva",
      inactiveSub: "Premi Avvia per collegare il microfono.",
      camera: "Scatta foto",
      attach: "Allega foto",
      documentReading: "Sto interpretando il documento…",
      documentAttached: "Foto allegata",
      volume: "Volume assistente",
    },
    en: {
      connectingTitle: "Wait: voice connection in progress",
      connectingSub:
        "Do not speak yet. I will tell you when the microphone is ready.",
      readyTitle: "Microphone ready: you can speak now",
      readySub: "Speak freely. You can interrupt me by starting to talk.",
      listeningTitle: "I’m listening…",
      listeningSub: "Keep speaking and finish your sentence normally.",
      speakingTitle: "I’m replying",
      speakingSub: "You can interrupt me simply by starting to speak.",
      inactiveTitle: "Voice conversation is not active",
      inactiveSub: "Tap Start to connect the microphone.",
      camera: "Take photo",
      attach: "Attach photo",
      documentReading: "I’m interpreting the document…",
      documentAttached: "Photo attached",
      volume: "Assistant volume",
    },
    es: {
      connectingTitle: "Espera: conectando la voz",
      connectingSub:
        "No hables todavía. Te avisaré cuando el micrófono esté listo.",
      readyTitle: "Micrófono listo: ya puedes hablar",
      readySub: "Habla libremente. Puedes interrumpirme empezando a hablar.",
      listeningTitle: "Te escucho…",
      listeningSub: "Sigue hablando y termina la frase con normalidad.",
      speakingTitle: "Estoy respondiendo",
      speakingSub: "Puedes interrumpirme simplemente empezando a hablar.",
      inactiveTitle: "Conversación de voz no activa",
      inactiveSub: "Pulsa Iniciar para conectar el micrófono.",
      camera: "Hacer foto",
      attach: "Adjuntar foto",
      documentReading: "Estoy interpretando el documento…",
      documentAttached: "Foto adjunta",
      volume: "Volumen del asistente",
    },
    fr: {
      connectingTitle: "Patientez : connexion vocale en cours",
      connectingSub:
        "Ne parlez pas encore. Je vous préviens dès que le micro est prêt.",
      readyTitle: "Micro prêt : vous pouvez parler",
      readySub:
        "Parlez librement. Vous pouvez m’interrompre en commençant à parler.",
      listeningTitle: "Je vous écoute…",
      listeningSub: "Continuez et terminez votre phrase normalement.",
      speakingTitle: "Je réponds",
      speakingSub: "Vous pouvez m’interrompre simplement en parlant.",
      inactiveTitle: "Conversation vocale inactive",
      inactiveSub: "Appuyez sur Démarrer pour connecter le micro.",
      camera: "Prendre une photo",
      attach: "Joindre une photo",
      documentReading: "J’interprète le document…",
      documentAttached: "Photo jointe",
      volume: "Volume de l’assistant",
    },
    de: {
      connectingTitle: "Bitte warten: Sprachverbindung wird hergestellt",
      connectingSub:
        "Noch nicht sprechen. Ich melde mich, sobald das Mikrofon bereit ist.",
      readyTitle: "Mikrofon bereit: Du kannst jetzt sprechen",
      readySub:
        "Sprich frei. Du kannst mich unterbrechen, indem du zu sprechen beginnst.",
      listeningTitle: "Ich höre zu…",
      listeningSub: "Sprich weiter und beende den Satz normal.",
      speakingTitle: "Ich antworte",
      speakingSub: "Du kannst mich einfach durch Sprechen unterbrechen.",
      inactiveTitle: "Sprachgespräch nicht aktiv",
      inactiveSub: "Tippe auf Start, um das Mikrofon zu verbinden.",
      camera: "Foto aufnehmen",
      attach: "Foto anhängen",
      documentReading: "Dokument wird interpretiert…",
      documentAttached: "Foto angehängt",
      volume: "Assistentenlautstärke",
    },
    pt: {
      connectingTitle: "Aguarde: ligação de voz em curso",
      connectingSub: "Ainda não fale. Aviso quando o microfone estiver pronto.",
      readyTitle: "Microfone pronto: já pode falar",
      readySub: "Fale livremente. Pode interromper-me começando a falar.",
      listeningTitle: "Estou a ouvir…",
      listeningSub: "Continue e termine a frase normalmente.",
      speakingTitle: "Estou a responder",
      speakingSub: "Pode interromper-me simplesmente começando a falar.",
      inactiveTitle: "Conversa por voz inativa",
      inactiveSub: "Toque em Iniciar para ligar o microfone.",
      camera: "Tirar foto",
      attach: "Anexar foto",
      documentReading: "Estou a interpretar o documento…",
      documentAttached: "Foto anexada",
      volume: "Volume do assistente",
    },
    pl: {
      connectingTitle: "Poczekaj: trwa łączenie głosowe",
      connectingSub: "Jeszcze nie mów. Dam znać, gdy mikrofon będzie gotowy.",
      readyTitle: "Mikrofon gotowy: możesz mówić",
      readySub: "Mów swobodnie. Możesz mi przerwać, zaczynając mówić.",
      listeningTitle: "Słucham…",
      listeningSub: "Mów dalej i zakończ zdanie normalnie.",
      speakingTitle: "Odpowiadam",
      speakingSub: "Możesz mi przerwać, po prostu zaczynając mówić.",
      inactiveTitle: "Rozmowa głosowa nieaktywna",
      inactiveSub: "Naciśnij Start, aby połączyć mikrofon.",
      camera: "Zrób zdjęcie",
      attach: "Dołącz zdjęcie",
      documentReading: "Interpretuję dokument…",
      documentAttached: "Dołączono zdjęcie",
      volume: "Głośność asystenta",
    },
    nl: {
      connectingTitle: "Wacht: spraakverbinding wordt gemaakt",
      connectingSub:
        "Praat nog niet. Ik laat weten wanneer de microfoon klaar is.",
      readyTitle: "Microfoon klaar: je kunt nu praten",
      readySub:
        "Praat vrijuit. Je kunt mij onderbreken door te beginnen met praten.",
      listeningTitle: "Ik luister…",
      listeningSub: "Praat verder en maak je zin normaal af.",
      speakingTitle: "Ik antwoord",
      speakingSub:
        "Je kunt mij onderbreken door gewoon te beginnen met praten.",
      inactiveTitle: "Spraakgesprek niet actief",
      inactiveSub: "Tik op Start om de microfoon te verbinden.",
      camera: "Foto maken",
      attach: "Foto bijvoegen",
      documentReading: "Ik interpreteer het document…",
      documentAttached: "Foto bijgevoegd",
      volume: "Assistentvolume",
    },
    ro: {
      connectingTitle: "Așteaptă: conexiunea vocală este în curs",
      connectingSub: "Nu vorbi încă. Te anunț când microfonul este pregătit.",
      readyTitle: "Microfon pregătit: poți vorbi acum",
      readySub: "Vorbește liber. Mă poți întrerupe începând să vorbești.",
      listeningTitle: "Te ascult…",
      listeningSub: "Continuă și încheie fraza normal.",
      speakingTitle: "Răspund",
      speakingSub: "Mă poți întrerupe pur și simplu începând să vorbești.",
      inactiveTitle: "Conversația vocală nu este activă",
      inactiveSub: "Apasă Pornire pentru a conecta microfonul.",
      camera: "Fă o fotografie",
      attach: "Atașează fotografie",
      documentReading: "Interpretez documentul…",
      documentAttached: "Fotografie atașată",
      volume: "Volumul asistentului",
    },
    el: {
      connectingTitle: "Περιμένετε: γίνεται φωνητική σύνδεση",
      connectingSub:
        "Μην μιλήσετε ακόμη. Θα σας ενημερώσω όταν το μικρόφωνο είναι έτοιμο.",
      readyTitle: "Το μικρόφωνο είναι έτοιμο: μιλήστε τώρα",
      readySub:
        "Μιλήστε ελεύθερα. Μπορείτε να με διακόψετε αρχίζοντας να μιλάτε.",
      listeningTitle: "Σας ακούω…",
      listeningSub: "Συνεχίστε και ολοκληρώστε κανονικά τη φράση.",
      speakingTitle: "Απαντώ",
      speakingSub: "Μπορείτε να με διακόψετε απλώς αρχίζοντας να μιλάτε.",
      inactiveTitle: "Η φωνητική συνομιλία δεν είναι ενεργή",
      inactiveSub: "Πατήστε Έναρξη για σύνδεση του μικροφώνου.",
      camera: "Λήψη φωτογραφίας",
      attach: "Επισύναψη φωτογραφίας",
      documentReading: "Ερμηνεύω το έγγραφο…",
      documentAttached: "Η φωτογραφία επισυνάφθηκε",
      volume: "Ένταση βοηθού",
    },
  };
  return d[code] || d.en;
}

function FinanceMicIcon({
  size = 24,
  muted = false,
  active = false,
}: {
  size?: number;
  muted?: boolean;
  active?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      aria-hidden="true"
    >
      <rect x="11" y="4" width="10" height="16" rx="5" fill="currentColor" />
      <path
        d="M7.5 15.5c0 4.7 3.8 8.5 8.5 8.5s8.5-3.8 8.5-8.5"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <path
        d="M16 24v4M11.5 28h9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {active && (
        <>
          <path
            d="M4.5 11.5c-1.4 2.8-1.4 6.2 0 9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity=".65"
          />
          <path
            d="M27.5 11.5c1.4 2.8 1.4 6.2 0 9"
            stroke="currentColor"
            strokeWidth="1.7"
            strokeLinecap="round"
            opacity=".65"
          />
        </>
      )}
      {muted && (
        <path
          d="M6 6l20 20"
          stroke="#fff"
          strokeWidth="3"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

function isIgnorableSpeechRecognitionErrorGlobal(data:any){
  var code=String((data&&data.code)||"").toLowerCase();
  var message=String((data&&data.message)||"").toLowerCase();
  return code==="no-match"||code==="no-speech"||message.indexOf("no match")>=0||message.indexOf("no-match")>=0||message.indexOf("no speech")>=0||message.indexOf("no-speech")>=0;
}

function VoiceAssistantModal({ onQuick, embedded }: any) {
  var c: any = useApp();
  var {
    lang,
    dark,
    textC,
    subC,
    borderC,
    cardBg,
    btnRadius,
    isMobile,
    voiceModal,
    setVoiceModal,
    voiceListening,
    setVoiceListening,
    voiceError,
    setVoiceError,
  }: any = c;
  var {
    aiChat,
    setAiChat,
    aiExternalConsent,
    setAiExternalConsent,
    aiDataAccess,
    aiLoading,
    setAiLoading,
  }: any = c;
  var {
    expenses,
    incomes,
    cats,
    setCats,
    methods,
    setMethods,
    incomeTypes,
    expenseGroups,
    methodGroups,
    recurring,
    setRecurring,
    budgetPlan,
    setBudgetPlan,
    goals,
    setGoals,
    alerts,
    setAlerts,
  }: any = c;
  var {
    patrimonioValues,
    setPatrimonioValues,
    patrimonioEntries,
    setPatrimonioEntries,
    patrimonioAreas,
    curMonthKey,
    debtCredits,
    setDebtCredits,
    appuntiNotes,
    setAppuntiNotes,
    shareProjects,
    createShareProject,
    updateShareProject,
    userId,
    currentUser,
  }: any = c;
  var {
    addExpenses,
    addIncomes,
    setTab,
    setAiTab,
    setSettingsPage,
    setSpeseSubTab,
    setAddType,
    setAddSubTab,
    setHistoryTab,
    setMobileMenu,
    setToast,
  }: any = c;
  var {
    shoppingItems,
    setShoppingItems,
    shoppingAreas,
    shoppingDefaultArea,
    shoppingUnits,
    setShoppingUnits,
    shoppingDefaultUnit,
    setShoppingDefaultUnit,
    shoppingLists,
    setShoppingLists,
    activeShoppingListId,
    setActiveShoppingListId,
  }: any = c;
  var {
    currentPlan,
    PLAN_LIMITS,
    canUsePlanFeature,
    consumePlanFeature,
    handleRewardedFeature,
    upgradeMessage,
    canAddPlanItem,
    defaultExpenseCat,
    setDefaultExpenseCat,
    defaultExpenseMethod,
    setDefaultExpenseMethod,
    defaultIncomeType,
    setDefaultIncomeType,
  }: any = c;
  var {
    bgTheme,
    setBgTheme,
    btnStyle,
    setBtnStyle,
    showAppSummaryHeader,
    setShowAppSummaryHeader,
    mobileNavIconCount,
    setMobileNavIconCount,
    mobileNavOrder,
    setMobileNavOrder,
    mobileMenuOrder,
    setMobileMenuOrder,
    homeBalanceView,
    setHomeBalanceView,
    homeWorklets,
    setHomeWorklets,
    statsView,
    setStatsView,
    dateFmt,
    setDateFmt,
    firstDayOfWeek,
    setFirstDayOfWeek,
  }: any = c;
  var {
    showSecInHistory,
    setShowSecInHistory,
    showSecInStats,
    setShowSecInStats,
    showSecInBudget,
    setShowSecInBudget,
    showSecInPatrimonio,
    setShowSecInPatrimonio,
    historyFutureMode,
    setHistoryFutureMode,
    historySortDate,
    setHistorySortDate,
    historySortDirection,
    setHistorySortDirection,
    historySortSecondary,
    setHistorySortSecondary,
    historySortSecondaryDirection,
    setHistorySortSecondaryDirection,
  }: any = c;
  var {
    showShareInHistory,
    setShowShareInHistory,
    showDebtCreditsInPatrimonio,
    setShowDebtCreditsInPatrimonio,
    showDebtCreditsInExpenses,
    setShowDebtCreditsInExpenses,
    shoppingProductSort,
    setShoppingProductSort,
    shoppingBoughtColor,
    setShoppingBoughtColor,
    setShoppingDefaultArea,
    patrimonioMode,
    setPatrimonioMode,
    aiDataAccess: setAiAccess,
    setAiDataAccess,
    aiFloatingEnabled,
    setAiFloatingEnabled,
    confirmButtonColor,
    setConfirmButtonColor,
    secondaryButtonColor,
    setSecondaryButtonColor,
  }: any = c;
  var embeddedView = !!embedded;
  var V = assistantVoiceUiText(lang || "it");
  var RT = assistantRealtimeUiText(lang || "it");
  var readyPlaceholder = assistantVoiceReadyPlaceholder(lang || "it");
  var [input, setInput] = useState("");
  useEffect(function () {
    var prefill = "";
    try {
      prefill =
        localStorage.getItem("fainance_voice_assistant_prefill_once") || "";
      localStorage.removeItem("fainance_voice_assistant_prefill_once");
    } catch (e) {}
    if (prefill) setInput(prefill);
  }, []);
  var [busy, setBusy] = useState(false);
  var [speaking, setSpeaking] = useState(false);
  var [continuous, setContinuous] = useState(true);
  var [pendingActions, setPendingActions] = useState<any[]>([]);
  var [realtimeStatus, setRealtimeStatus] = useState("idle");
  var [realtimeMicEnabled, setRealtimeMicEnabled] = useState(true);
  var [realtimeAssistantDraft, setRealtimeAssistantDraft] = useState("");
  var [realtimeUserDraft, setRealtimeUserDraft] = useState("");
  var [volumeNotice, setVolumeNotice] = useState("");
  var [documentLoading, setDocumentLoading] = useState(false);
  var [attachmentMenuOpen, setAttachmentMenuOpen] = useState(false);
  var endRef = useRef<any>(null);
  var webRecognitionRef = useRef<any>(null);
  var nativeSpeechRef = useRef<any>(null);
  var nativeTtsRef = useRef<any>(null);
  var nativeAudioRef = useRef<any>(null);
  var speechAbortRef = useRef<any>(null);
  var assistantRequestAbortRef = useRef<any>(null);
  var speechCycleRef = useRef(0);
  var realtimePeerRef = useRef<any>(null);
  var realtimeChannelRef = useRef<any>(null);
  var realtimeStreamRef = useRef<any>(null);
  var realtimeAudioRef = useRef<any>(null);
  var realtimeAudioContextRef = useRef<any>(null);
  var realtimeAudioSourceRef = useRef<any>(null);
  var realtimeGainRef = useRef<any>(null);
  var assistantVolumeRef = useRef<number>(1);
  var volumeNoticeTimerRef = useRef<any>(null);
  var voiceErrorTimerRef = useRef<any>(null);
  var cameraInputRef = useRef<any>(null);
  var galleryInputRef = useRef<any>(null);
  var documentInputRef = useRef<any>(null);
  var realtimeConnectionAbortRef = useRef<any>(null);
  var realtimeAssistantDraftRef = useRef("");
  var realtimeUserDraftRef = useRef("");
  var realtimeHandledCallsRef = useRef<any>(new Set());
  var realtimeManualResponseConfiguredRef = useRef(false);
  var lastVoiceUserRequestRef = useRef("");
  var lastAssistantUserLanguageRef = useRef(String(lang || "it"));
  var assistantLanguageStateRef = useRef(
    createAssistantConversationLanguageState(lang || "it")
  );
  var lastAssistantLanguageResolutionRef = useRef<any>(null);
  var lastRealtimeAssistantTranscriptRef = useRef("");
  var pendingActionsRef = useRef<any[]>([]);
  var nativeTextRef = useRef("");
  var nativeSessionDoneRef = useRef(false);
  var mountedRef = useRef(true);
  var realtimeAutoStartAttemptedRef = useRef(false);
  var receiptAutoOpenAttemptedRef = useRef(false);
  var activeAttachmentRef = useRef<any>(null);
  var systemMediaMutedRef = useRef(false);
  var microphoneProcessingContextRef = useRef<any>(null);
  var microphoneProcessingSourceRef = useRef<any>(null);
  var microphoneProcessingGateRef = useRef<any>(null);
  var microphoneProcessingDestinationRef = useRef<any>(null);
  var microphoneProcessingTimerRef = useRef<any>(null);
  var microphoneProcessedStreamRef = useRef<any>(null);
  var sinp: any = {
    width: "100%",
    borderRadius: 12,
    border: "1px solid " + borderC,
    padding: "11px 12px",
    fontSize: 14,
    background: dark ? "#202033" : "#fff",
    color: textC,
    boxSizing: "border-box",
  };
  function resolveVoiceAssistantTurn(text:any){var resolution:any=resolveAssistantLanguageTurn(text,assistantLanguageStateRef.current,lastAssistantUserLanguageRef.current||String(lang||"it"));assistantLanguageStateRef.current=resolution.state;lastAssistantUserLanguageRef.current=resolution.language;lastAssistantLanguageResolutionRef.current=resolution;return resolution;}
  function currentVoiceLanguageResolution(){if(lastAssistantLanguageResolutionRef.current)return lastAssistantLanguageResolutionRef.current;var state:any=assistantLanguageStateRef.current||createAssistantConversationLanguageState(lastAssistantUserLanguageRef.current||String(lang||"it"));var active=lastAssistantUserLanguageRef.current||state.activeLanguage||String(lang||"it");return {language:active,languageName:assistantLanguageName(active),state:state,requestMode:state.mode,reason:state.mode==="locked"?"locked_language":"detected_user_language"};}
  function assistantDisplayText(text) {
    return String(text || "")
      .replace(/^\s*[\-*]\s+/gm, "• ")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
  }
  function appendMessage(role, text) {
    var clean = String(text || "")
      .replace(/^\s*[\-*]\s+/gm, "• ")
      .replace(/\*\*(.*?)\*\*/g, "$1")
      .replace(/\*(.*?)\*/g, "$1")
      .replace(/`([^`]+)`/g, "$1")
      .trim();
    if (!clean) return;
    setAiChat(function (p) {
      return [
        ...(p || []),
        {
          id: Date.now() + Math.random(),
          role: role,
          text: clean,
          source: "voice-assistant",
        },
      ].slice(-80);
    });
  }
  function appendVoiceMessage(transcript,confidence){
    var raw=String(transcript||"").replace(/\s+/g," ").trim();
    if(!raw)return;
    // Mostra esclusivamente la trascrizione definitiva restituita dal motore
    // di riconoscimento: niente etichette generiche e niente testo provvisorio.
    setAiChat(function(p){return [...(p||[]),{id:Date.now()+Math.random(),role:"user",text:raw,rawText:raw,transcriptionConfidence:confidence,source:"voice-input-final"}].slice(-80);});
  }
  function clearVoiceErrorTimer(){try{if(voiceErrorTimerRef.current)clearTimeout(voiceErrorTimerRef.current);}catch(e){}voiceErrorTimerRef.current=null;}
  function clearVoiceNotice(){clearVoiceErrorTimer();setVoiceError("");}
  function showTemporaryVoiceNotice(text,delay){var clean=String(text||"").trim();clearVoiceErrorTimer();setVoiceError(clean);if(!clean)return;voiceErrorTimerRef.current=setTimeout(function(){if(mountedRef.current)setVoiceError("");voiceErrorTimerRef.current=null;},Math.max(1800,Number(delay)||4500));}
  function cleanSpeechText(text){return String(text||"").replace(/https?:\/\/\S+/g,"").replace(/[•*_#`]/g," ").replace(/\s+/g," ").trim();}
  async function authenticatedAiFetch(endpoint:any, options:any){
    var base:any={...(options||{})};
    async function once(forceRefresh:boolean){
      var token="";
      if(fbAuth.currentUser&&fbAuth.currentUser.getIdToken)token=await fbAuth.currentUser.getIdToken(forceRefresh);
      var headers:any={...((base&&base.headers)||{})};
      if(token)headers.Authorization="Bearer "+token;
      return await fetch(endpoint,{...base,headers:headers});
    }
    var response=await once(false);
    if(response.status===401&&fbAuth.currentUser)response=await once(true);
    return response;
  }
  function nativePlatform(){try{var cap:any=(window as any).Capacitor;return !!(cap&&((typeof cap.isNativePlatform==="function"&&cap.isNativePlatform())||(typeof cap.getPlatform==="function"&&["android","ios"].indexOf(String(cap.getPlatform()).toLowerCase())>=0)));}catch(e){return false;}}
  function clampAssistantVolume(value:any){var parsed=Number(value);return Math.max(0,Math.min(1,Number.isFinite(parsed)?parsed:1));}
  function applyAssistantSystemVolume(value:any,muted?:any){
    var ratio=muted===true?0:clampAssistantVolume(value);
    assistantVolumeRef.current=ratio;
    systemMediaMutedRef.current=ratio<=0;
    try{var gain=realtimeGainRef.current,ctx=realtimeAudioContextRef.current;if(gain&&gain.gain){var now=ctx&&Number.isFinite(ctx.currentTime)?ctx.currentTime:0;gain.gain.cancelScheduledValues(now);gain.gain.setValueAtTime(ratio,now);}}catch(e){try{if(realtimeGainRef.current)realtimeGainRef.current.gain.value=ratio;}catch(e2){}}
    try{var audio=realtimeAudioRef.current;if(audio){audio.volume=ratio;audio.muted=ratio<=0;}}catch(e){}
    try{var fallback=nativeAudioRef.current;if(fallback){fallback.volume=ratio;fallback.muted=ratio<=0;}}catch(e){}
  }
  async function syncSystemMediaVolume(){
    if(!nativePlatform()){applyAssistantSystemVolume(1,false);return 1;}
    try{
      var result:any=FainanceAudioNative&&FainanceAudioNative.getMediaVolume?await FainanceAudioNative.getMediaVolume():null;
      var current=Number(result&&result.current),maximum=Math.max(1,Number(result&&result.max)||1),ratio=Number(result&&result.ratio);
      if(!Number.isFinite(ratio))ratio=Number.isFinite(current)?current/maximum:1;
      applyAssistantSystemVolume(ratio,(result&&result.muted===true)||current<=0);
      return assistantVolumeRef.current;
    }catch(e){applyAssistantSystemVolume(1,false);return 1;}
  }
  function setNativeAssistantAudio(active){if(!nativePlatform())return;try{var fn=active?FainanceAudioNative.activateAssistantAudio:FainanceAudioNative.releaseAssistantAudio;if(fn)Promise.resolve(fn.call(FainanceAudioNative)).then(function(){if(active)syncSystemMediaVolume();}).catch(function(){});return;}catch(e){}try{var cap:any=(window as any).Capacitor,plugin=cap&&cap.Plugins&&cap.Plugins.FainanceAudio,legacyFn=active&&plugin?plugin.activateAssistantAudio:(plugin&&plugin.releaseAssistantAudio);if(legacyFn)Promise.resolve(legacyFn.call(plugin)).then(function(){if(active)syncSystemMediaVolume();}).catch(function(){});}catch(e){}}
  async function attachRealtimeAudioStream(remoteStream:any){
    // Riproduzione stabile tramite elemento audio nativo della WebView.
    // Il volume viene applicato direttamente all'elemento ad ogni singola
    // tacca Android, evitando l'AudioContext che poteva restare sospeso e
    // rendere completamente muta la risposta Realtime.
    try{
      var previous=realtimeAudioRef.current;
      if(previous){
        try{previous.pause();}catch(e){}
        try{previous.srcObject=null;}catch(e){}
        try{if(previous.parentNode)previous.parentNode.removeChild(previous);}catch(e){}
      }
    }catch(e){}
    realtimeAudioRef.current=null;
    try{var oldSource=realtimeAudioSourceRef.current;if(oldSource)oldSource.disconnect();}catch(e){}
    realtimeAudioSourceRef.current=null;
    try{var oldGain=realtimeGainRef.current;if(oldGain)oldGain.disconnect();}catch(e){}
    realtimeGainRef.current=null;
    try{var oldCtx=realtimeAudioContextRef.current;if(oldCtx&&oldCtx.state!=="closed")await oldCtx.close();}catch(e){}
    realtimeAudioContextRef.current=null;

    await syncSystemMediaVolume();
    var audio=document.createElement("audio");
    audio.autoplay=true;
    audio.controls=false;
    audio.preload="auto";
    (audio as any).playsInline=true;
    audio.setAttribute("playsinline","true");
    audio.style.display="none";
    audio.srcObject=remoteStream;
    audio.volume=assistantVolumeRef.current;
    audio.muted=assistantVolumeRef.current<=0;
    document.body.appendChild(audio);
    realtimeAudioRef.current=audio;

    // Applica nuovamente il livello dopo l'aggancio dello stream, perché su
    // alcune WebView Android il valore può essere inizializzato solo dopo
    // l'assegnazione di srcObject.
    applyAssistantSystemVolume(assistantVolumeRef.current,assistantVolumeRef.current<=0);
    await audio.play();
    await syncSystemMediaVolume();
    return true;
  }
  async function prepareNoiseFilteredMicrophone(acquired:any){
    // iOS already applies echo cancellation and noise suppression. A custom WebAudio
    // gate can keep the gain at zero and make the assistant hear nothing.
    try{if(acquired&&acquired.getAudioTracks)acquired.getAudioTracks().forEach(function(track:any){track.enabled=true;try{track.contentHint="speech";}catch(e){}});}catch(e){}
    microphoneProcessedStreamRef.current=acquired;
    return acquired;
  }
  function conciseTechnicalMessage(raw:any){var text=String(raw||"").replace(/\s+/g," ").trim();if(!text)return "";if(text.length>180)text=text.slice(0,177)+"…";return text;}
  function realtimeFailureMessage(error:any,phase?:string,status?:number,serverMessage?:string){
    var raw=conciseTechnicalMessage(serverMessage||((error&&error.message)||error)||"");
    var name=String((error&&error.name)||"").toLowerCase();
    var activeLanguage=lastAssistantUserLanguageRef.current||String(lang||"it");
    try{if(typeof navigator!=="undefined"&&navigator.onLine===false)return assistantRuntimeText(activeLanguage,"offline");}catch(e){}
    if(/permission|notallowed|denied/i.test(raw))return realtimePermissionDeniedMessage();
    if(status===401)return assistantRuntimeText(activeLanguage,"sessionExpired");
    if(status===403)return raw||assistantRuntimeText(activeLanguage,"unavailable");
    if(status===429)return assistantRuntimeText(activeLanguage,"rateLimited");
    if(name==="aborterror")return assistantRuntimeText(activeLanguage,"timeout");
    if(String(phase||"")==="datachannel")return assistantRuntimeText(activeLanguage,"interrupted");
    return assistantRuntimeText(activeLanguage,"unavailable");
  }
  function realtimeServerFailure(error:any){
    var code=String((error&&error.code)||"").toLowerCase(),type=String((error&&error.type)||"").toLowerCase();
    var activeLanguage=lastAssistantUserLanguageRef.current||String(lang||"it");
    if(code==="no_match"||code==="no-match"||type==="no_match"||type==="no-match")return "";
    if(code.indexOf("rate")>=0||type.indexOf("rate")>=0)return assistantRuntimeText(activeLanguage,"rateLimited");
    return assistantRuntimeText(activeLanguage,"repeatCloser");
  }
  function sendRealtimeEvent(event:any){var dc=realtimeChannelRef.current;if(!dc||dc.readyState!=="open")return false;try{dc.send(JSON.stringify(event));return true;}catch(e){return false;}}
  function realtimeTurnDirective(resolution:any,extraInstruction?:string){
    var language=resolution&&resolution.language?String(resolution.language):String(lastAssistantUserLanguageRef.current||lang||"it");
    var languageName=resolution&&resolution.languageName?String(resolution.languageName):assistantLanguageName(language);
    return [
      "This is a per-turn directive only. Keep the existing Realtime session instructions, finance context, privacy rules and fAInance tools authoritative.",
      "Reply exclusively in "+languageName+" for this turn.",
      "If the user asks to create, change, delete, update, open or configure something in fAInance and a supplied tool can do it, use the tool. Do not answer with a how-to, do not say the internal setting name is missing, and do not claim the app action cannot be performed.",
      String(extraInstruction||"").trim()
    ].filter(Boolean).join(" ");
  }
  function sendRealtimeModelResponse(resolution:any,extraInstruction?:string){
    var directive=realtimeTurnDirective(resolution,extraInstruction);
    var systemSent=sendRealtimeEvent({type:"conversation.item.create",item:{type:"message",role:"system",content:[{type:"input_text",text:directive}]}});
    if(!systemSent)return false;
    return sendRealtimeEvent({type:"response.create",response:{}});
  }
  function looksLikeDirectAppAction(text:any){
    var n=normalized(text);
    if(!n)return false;
    var verb=/(^| )(imposta|attiva|disattiva|cambia|modifica|crea|aggiungi|registra|inserisci|elimina|cancella|rimuovi|apri|vai|aggiorna|salva|set|enable|disable|change|modify|create|add|record|insert|delete|remove|open|update|save|configura|configure|activar|desactivar|cambiar|crear|anadir|eliminar|abrir|actualizar|activer|desactiver|changer|creer|ajouter|supprimer|ouvrir|modifier|aktiviere|deaktiviere|andere|erstelle|hinzufuge|losche|offne|atualiza|cria|adiciona|remove|abre)( |$)/i.test(n);
    if(!verb)return false;
    return /(modalita|tema|scur|dark|light|chiara|aspetto|appearance|impostaz|setting|spesa|uscita|expense|entrata|income|ricorrent|recurring|obiettiv|goal|alert|budget|patrimonio|asset|debito|credito|debt|credit|nota|appunto|note|lista|shopping|share|categoria|category|metodo|payment|storico|history|statistic|barra|valuta|currency|data|date|settimana|week|pulsante|button|sezione|section)/i.test(n);
  }
  function realtimeActionsFrom(value:any){var allowed=["open_section","create_expense","create_income","create_recurring","create_goal","update_goal_saved","create_alert","set_category_budget","create_debt_credit","update_debt_credit","delete_debt_credit","set_patrimonio_value","create_note","add_shopping_items","create_shopping_list","create_shopping_unit","create_share_project","create_share_expense","create_share_settlement","create_expense_category","create_payment_method","set_setting"];return (Array.isArray(value)?value:[]).map(function(raw){var a={...(raw||{})},signal=[lastVoiceUserRequestRef.current,a.summary,a.description,a.projectName,a.holder,a.entityName].join(" ").toLowerCase();if(a.action==="create_expense"&&/(spesa condivisa|spesa share|share expense|shared expense|split expense|divid|nel progetto|progetto share)/i.test(signal))a.action="create_share_expense";if(a.action==="update_debt_credit"&&/(elimina|cancella|rimuovi|chiudi definitivamente|delete|remove|erase)/i.test(signal)){a.action="delete_debt_credit";a.amount=null;a.initialAmount=null;}return a;}).filter(function(a){return a&&allowed.indexOf(String(a.action||""))>=0;}).slice(0,16).map(function(a){return {...a,action:String(a.action||""),summary:String(a.summary||"").slice(0,500),items:Array.isArray(a.items)?a.items.slice(0,100):[],shareParticipants:Array.isArray(a.shareParticipants)?a.shareParticipants.slice(0,50):[]};});}
  function updatePendingActions(next:any[]){pendingActionsRef.current=Array.isArray(next)?next:[];setPendingActions(pendingActionsRef.current);}
  function sendRealtimeToolResult(callId:string,payload:any,createResponse?:boolean){var sent=sendRealtimeEvent({type:"conversation.item.create",item:{type:"function_call_output",call_id:callId,output:JSON.stringify(payload||{})}});if(sent&&createResponse!==false)setTimeout(function(){sendRealtimeModelResponse(currentVoiceLanguageResolution());},20);}
  async function handleRealtimeFunctionCall(event:any){var callId=String(event&&event.call_id||"");if(!callId||realtimeHandledCallsRef.current.has(callId))return;realtimeHandledCallsRef.current.add(callId);var args:any={};try{args=JSON.parse(String(event.arguments||"{}"));}catch(e){sendRealtimeToolResult(callId,{status:"error",error:assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"invalidArguments")});return;}var name=String(event.name||"");
    if(name==="propose_fainance_actions"){var actions=realtimeActionsFrom(args.actions),opens=actions.filter(function(a){return a.action==="open_section";}),writes=actions.filter(function(a){return a.action!=="open_section";});if(writes.length){sendRealtimeEvent({type:"response.cancel"});sendRealtimeEvent({type:"output_audio_buffer.clear"});var preamble=lastRealtimeAssistantTranscriptRef.current;lastRealtimeAssistantTranscriptRef.current="";if(preamble)setAiChat(function(p){var list=[...(p||[])];var last=list[list.length-1];if(last&&last.role==="assistant"&&last.source==="voice-assistant"&&String(last.text||"").trim()===preamble)list.pop();return list;});realtimeAssistantDraftRef.current="";setRealtimeAssistantDraft("");setSpeaking(false);setBusy(false);updatePendingActions(writes);sendRealtimeToolResult(callId,{status:"confirmation_required",summaries:writes.map(actionSummary),uiConfirmation:true},false);return;}if(opens.length){sendRealtimeToolResult(callId,{status:"completed",result:assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"sectionOpened")},false);setTimeout(function(){openSection(opens[0]);},80);return;}sendRealtimeToolResult(callId,{status:"error",error:assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"noValidAction")});return;}
    if(name==="confirm_pending_actions"){var pending=pendingActionsRef.current.slice();if(!pending.length){sendRealtimeToolResult(callId,{status:"nothing_to_confirm"});return;}var results:any[]=[];try{pending.forEach(function(a){var r=executeAction(a);if(r)results.push(r);});updatePendingActions([]);sendRealtimeToolResult(callId,{status:"completed",results:results});}catch(e){sendRealtimeToolResult(callId,{status:"error",error:assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"error")});}return;}
    if(name==="cancel_pending_actions"){updatePendingActions([]);sendRealtimeToolResult(callId,{status:"cancelled"});return;}
    sendRealtimeToolResult(callId,{status:"error",error:assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"toolUnavailable")});
  }
  function handleRealtimeEvent(raw:any){var event:any=raw;try{if(typeof raw==="string")event=JSON.parse(raw);}catch(e){return;}if(!event||!event.type)return;var type=String(event.type);
    if(type==="session.created"){setRealtimeStatus("connected");clearVoiceNotice();if(!realtimeManualResponseConfiguredRef.current){realtimeManualResponseConfiguredRef.current=true;sendRealtimeEvent(buildRealtimeManualResponseSessionUpdate());}return;}
    if(type==="session.updated"){setRealtimeStatus("connected");clearVoiceNotice();return;}
    if(type==="input_audio_buffer.speech_started"){clearVoiceNotice();realtimeUserDraftRef.current="";setRealtimeUserDraft("");setVoiceListening(true);setSpeaking(false);setBusy(false);return;}
    if(type==="input_audio_buffer.speech_stopped"){setVoiceListening(false);setBusy(true);return;}
    if(type==="conversation.item.input_audio_transcription.delta"){var ud=String(event.delta||"");realtimeUserDraftRef.current+=ud;return;}
    if(type==="conversation.item.input_audio_transcription.completed"){var ut=String(event.transcript||realtimeUserDraftRef.current||"").trim();realtimeUserDraftRef.current="";setRealtimeUserDraft("");clearVoiceNotice();if(ut){var probs=Array.isArray(event.logprobs)?event.logprobs:[];var avgLogProb=probs.length?probs.reduce(function(sum,p){var lp=Number(p&&p.logprob);return sum+(Number.isFinite(lp)?lp:-4);},0)/probs.length:null;var confidence=avgLogProb===null?null:Math.exp(Math.max(-12,Math.min(0,avgLogProb)));var turnResolution:any=resolveVoiceAssistantTurn(ut);var turnLanguage=turnResolution.language;lastVoiceUserRequestRef.current=ut;appendVoiceMessage(ut,confidence);if(pendingActionsRef.current.length&&isYes(ut)){confirmPending("");return;}if(pendingActionsRef.current.length&&isNo(ut)){cancelPending("");return;}var languageControlReply=assistantLanguageControlReply(turnResolution);var localHelpAnswer=getFainanceHelpAnswer(ut,turnLanguage);var check=normalized(ut);var hearingCheck=/^(mi senti|mi stai sentendo|riesci a sentirmi|mi ascolti|ci sei|can you hear me|do you hear me|tu m'entends|vous m'entendez|me escuchas|puedes oirme|kannst du mich horen|consegues ouvir-me|slyszysz mnie|hoor je mij|ma auzi|με ακους)[?.! ]*$/.test(check);if(languageControlReply)sendRealtimeModelResponse(turnResolution,"Reply exactly and only with this text: "+languageControlReply);else if(localHelpAnswer)sendRealtimeModelResponse(turnResolution,"Reply exactly and only with the following verified fAInance help text, without adding anything:\n"+localHelpAnswer);else{if(consumePlanFeature)consumePlanFeature("aiReply",1);if(hearingCheck)sendRealtimeModelResponse(turnResolution,"Reply exactly and only: "+assistantHearingReply(turnLanguage));else if(activeAttachmentRef.current||looksLikeDirectAppAction(ut)){sendRealtimeEvent({type:"response.cancel"});sendRealtimeEvent({type:"output_audio_buffer.clear"});callAssistant(ut,turnResolution);}else sendRealtimeModelResponse(turnResolution);}}return;}
    if(type==="response.output_audio_transcript.delta"){var ad=String(event.delta||"");realtimeAssistantDraftRef.current+=ad;setRealtimeAssistantDraft(realtimeAssistantDraftRef.current);return;}
    if(type==="response.output_audio_transcript.done"){clearVoiceNotice();var at=String(event.transcript||realtimeAssistantDraftRef.current||"").trim();realtimeAssistantDraftRef.current="";setRealtimeAssistantDraft("");if(at){lastRealtimeAssistantTranscriptRef.current=at;appendMessage("assistant",at);}return;}
    if(type==="output_audio_buffer.started"){setSpeaking(true);setBusy(false);return;}
    if(type==="output_audio_buffer.stopped"||type==="output_audio_buffer.cleared"){setSpeaking(false);setBusy(false);return;}
    if(type==="response.created"){clearVoiceNotice();setBusy(true);return;}
    if(type==="response.function_call_arguments.done"){handleRealtimeFunctionCall(event);return;}
    if(type==="response.done"){setBusy(false);clearVoiceNotice();return;}
    if(type==="error"){setBusy(false);var realtimeMessage=realtimeServerFailure(event.error||{});if(realtimeMessage)showTemporaryVoiceNotice(realtimeMessage,/^Non ho capito bene/i.test(realtimeMessage)?4200:6200);return;}
  }
  function realtimePermissionDeniedMessage(){return assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"permissionDenied");}
  async function ensureRealtimeMicrophonePermission(){if(!nativePlatform())return true;var mod:any=await import("@capgo/capacitor-speech-recognition");var speech:any=mod.SpeechRecognition||mod.default||mod;if(!speech)throw new Error(realtimePermissionDeniedMessage());var permission:any=speech.checkPermissions?await speech.checkPermissions():{};function granted(p:any){var speechState=String((p&&p.speechRecognition)||"").toLowerCase(),micState=String((p&&p.microphone)||"").toLowerCase();return speechState==="granted"&&(micState===""||micState==="granted");}if(!granted(permission)&&speech.requestPermissions)permission=await speech.requestPermissions();if(!granted(permission))throw new Error(realtimePermissionDeniedMessage());return true;}
  function disconnectRealtime(nextStatus?:string){
    setNativeAssistantAudio(false);
    try{if(realtimeConnectionAbortRef.current)realtimeConnectionAbortRef.current.abort();}catch(e){}
    realtimeConnectionAbortRef.current=null;
    try{var dc=realtimeChannelRef.current;if(dc)dc.close();}catch(e){}realtimeChannelRef.current=null;
    try{var pc=realtimePeerRef.current;if(pc)pc.close();}catch(e){}realtimePeerRef.current=null;
    try{var stream=realtimeStreamRef.current;if(stream)stream.getTracks().forEach(function(t){t.stop();});}catch(e){}realtimeStreamRef.current=null;
    try{var processed=microphoneProcessedStreamRef.current;if(processed)processed.getTracks().forEach(function(t){t.stop();});}catch(e){}microphoneProcessedStreamRef.current=null;
    try{if(microphoneProcessingTimerRef.current)clearInterval(microphoneProcessingTimerRef.current);}catch(e){}microphoneProcessingTimerRef.current=null;
    try{var micSource=microphoneProcessingSourceRef.current;if(micSource)micSource.disconnect();}catch(e){}microphoneProcessingSourceRef.current=null;
    try{var micGate=microphoneProcessingGateRef.current;if(micGate)micGate.disconnect();}catch(e){}microphoneProcessingGateRef.current=null;
    microphoneProcessingDestinationRef.current=null;
    try{var micCtx=microphoneProcessingContextRef.current;if(micCtx&&micCtx.state!=="closed")Promise.resolve(micCtx.close()).catch(function(){});}catch(e){}microphoneProcessingContextRef.current=null;
    try{var audio=realtimeAudioRef.current;if(audio){audio.pause();audio.srcObject=null;if(audio.parentNode)audio.parentNode.removeChild(audio);}}catch(e){}realtimeAudioRef.current=null;
    try{var outSource=realtimeAudioSourceRef.current;if(outSource)outSource.disconnect();}catch(e){}realtimeAudioSourceRef.current=null;
    try{var outGain=realtimeGainRef.current;if(outGain)outGain.disconnect();}catch(e){}realtimeGainRef.current=null;
    try{var outCtx=realtimeAudioContextRef.current;if(outCtx&&outCtx.state!=="closed")Promise.resolve(outCtx.close()).catch(function(){});}catch(e){}realtimeAudioContextRef.current=null;
    realtimeAssistantDraftRef.current="";realtimeUserDraftRef.current="";realtimeManualResponseConfiguredRef.current=false;setRealtimeAssistantDraft("");setRealtimeUserDraft("");setRealtimeStatus(nextStatus||"idle");setRealtimeMicEnabled(true);setVoiceListening(false);setSpeaking(false);setBusy(false);
  }
  
  async function connectRealtime(){
    if(realtimeStatus==="connecting"||realtimeStatus==="connected")return;
    if(!(currentPlan==="base"||currentPlan==="premium")){setVoiceError((c.translateUiRuntimeText||function(x){return x;})("L’assistente vocale AI è disponibile dal piano Base."));return;}
    if(!aiExternalConsent){setVoiceError(V.consentTitle);return;}
    setVoiceError("");setBusy(true);stopListening(false);stopSpeaking();disconnectRealtime();setRealtimeStatus("connecting");setNativeAssistantAudio(true);
    var phase="initialisation",statusCode=0,serverMessage="",connectionTimer:any=null;
    try{
      if(typeof RTCPeerConnection==="undefined"||!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia)throw new Error(assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"unsupportedDevice"));
      var contextForRealtime=buildContext();
      if(contextForRealtime&&contextForRealtime.transactions){contextForRealtime.transactions={expenses:(contextForRealtime.transactions.expenses||[]).slice(0,80),incomes:(contextForRealtime.transactions.incomes||[]).slice(0,50)};}
      var controller=new AbortController();realtimeConnectionAbortRef.current=controller;connectionTimer=setTimeout(function(){try{controller.abort();}catch(e){}},18000);
      phase="microphone";
      var mediaPromise=(async function(){await ensureRealtimeMicrophonePermission();try{var supported:any=navigator.mediaDevices.getSupportedConstraints?navigator.mediaDevices.getSupportedConstraints():{};var audioConstraints:any={echoCancellation:{ideal:true},noiseSuppression:{ideal:true},autoGainControl:{ideal:true},channelCount:{ideal:1},sampleRate:{ideal:48000},sampleSize:{ideal:16},googEchoCancellation:true,googNoiseSuppression:true,googHighpassFilter:true,googTypingNoiseDetection:true,googAutoGainControl:true};if(supported.voiceIsolation)audioConstraints.voiceIsolation={ideal:true};var acquired=await navigator.mediaDevices.getUserMedia({audio:audioConstraints,video:false});try{acquired.getAudioTracks().forEach(function(track:any){try{track.contentHint="speech";}catch(e){}try{var extra:any={echoCancellation:true,noiseSuppression:true,autoGainControl:true,channelCount:1};if(supported.voiceIsolation)extra.voiceIsolation=true;Promise.resolve(track.applyConstraints(extra)).catch(function(){});}catch(e){}});}catch(e){}realtimeStreamRef.current=acquired;return await prepareNoiseFilteredMicrophone(acquired);}catch(mediaError){var mediaName=String((mediaError&&mediaError.name)||"").toLowerCase(),mediaMessage=String((mediaError&&mediaError.message)||"").toLowerCase();if(mediaName.indexOf("notallowed")>=0||mediaName.indexOf("permission")>=0||mediaMessage.indexOf("permission")>=0||mediaMessage.indexOf("denied")>=0)throw new Error(realtimePermissionDeniedMessage());throw mediaError;}})();
      phase="session";
      var sessionPromise=(async function(){var realtimeSessionPayload=buildRealtimeSessionRequest({interfaceLanguage:lang||"it",languageState:assistantLanguageStateRef.current,aiDataAccess:aiDataAccess||"summary",financeContext:contextForRealtime,chatHistory:(aiChat||[]).slice(-8).map(function(m){return{role:m.role,text:m.rawText||m.text};})});var response=await authenticatedAiFetch(AI_REALTIME_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify(realtimeSessionPayload)});var payload:any={};try{payload=await response.json();}catch(e){}if(response.ok&&payload.value)return payload;statusCode=response.status;serverMessage=String((payload&&payload.error)||"");var err:any=new Error(serverMessage||("Errore sessione "+response.status));err.httpStatus=response.status;err.serverMessage=serverMessage;throw err;})();
      var peerPromise=(async function(){var stream=await mediaPromise;phase="webrtc";var pc=new RTCPeerConnection();realtimePeerRef.current=pc;pc.ontrack=function(e){var remote=(e.streams&&e.streams[0])?e.streams[0]:new MediaStream([e.track]);attachRealtimeAudioStream(remote).catch(function(){showTemporaryVoiceNotice(assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"audioFailed"),6200);});};pc.onconnectionstatechange=function(){var st=String(pc.connectionState||"");if(st==="connected"){setRealtimeStatus("connected");setBusy(false);setVoiceError("");}else if(st==="failed"){setRealtimeStatus("error");showTemporaryVoiceNotice(assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"unavailable"),6200);}else if(st==="disconnected"){showTemporaryVoiceNotice(assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"interrupted"),5200);}};stream.getAudioTracks().forEach(function(track){pc.addTrack(track,stream);});var dc=pc.createDataChannel("oai-events");realtimeChannelRef.current=dc;realtimeHandledCallsRef.current=new Set();dc.onopen=function(){if(connectionTimer)clearTimeout(connectionTimer);realtimeConnectionAbortRef.current=null;setRealtimeStatus("connected");setBusy(false);setVoiceError("");};dc.onmessage=function(ev){handleRealtimeEvent(ev.data);};dc.onerror=function(ev:any){setRealtimeStatus("error");showTemporaryVoiceNotice(realtimeFailureMessage(new Error(conciseTechnicalMessage(ev&&ev.message)||"Data channel error"),"datachannel"),6200);};dc.onclose=function(){if(mountedRef.current&&voiceModal)setRealtimeStatus(function(current){return current==="error"?current:"idle";});};var offer=await pc.createOffer();await pc.setLocalDescription(offer);return{pc:pc,offer:offer};})();
      var pair=await Promise.all([peerPromise,sessionPromise]),peerData:any=pair[0],tokenData:any=pair[1];
      phase="webrtc";
      var sdpRes=await fetch("https://api.openai.com/v1/realtime/calls",{method:"POST",headers:{Authorization:"Bearer "+tokenData.value,"Content-Type":"application/sdp"},signal:controller.signal,body:peerData.offer.sdp||""});
      if(!sdpRes.ok){statusCode=sdpRes.status;serverMessage=await sdpRes.text();var sdpError:any=new Error(serverMessage||("Errore OpenAI "+sdpRes.status));sdpError.httpStatus=sdpRes.status;throw sdpError;}
      await peerData.pc.setRemoteDescription({type:"answer",sdp:await sdpRes.text()});setRealtimeMicEnabled(true);
    }catch(e){
      if(connectionTimer)clearTimeout(connectionTimer);statusCode=Number((e&&e.httpStatus)||statusCode)||0;serverMessage=String((e&&e.serverMessage)||serverMessage||"");
      disconnectRealtime("error");showTemporaryVoiceNotice(realtimeFailureMessage(e,phase,statusCode,serverMessage),6200);setBusy(false);
    }
  }
  function toggleRealtimeMicrophone(){var stream=realtimeStreamRef.current;if(!stream)return;var next=!realtimeMicEnabled;stream.getAudioTracks().forEach(function(t){t.enabled=next;});try{var processed=microphoneProcessedStreamRef.current;if(processed)processed.getAudioTracks().forEach(function(t){t.enabled=next;});}catch(e){}setRealtimeMicEnabled(next);setVoiceListening(false);}
  function sendRealtimeText(q:string,providedResolution?:any){var clean=String(q||"");var turnResolution:any=providedResolution||resolveVoiceAssistantTurn(clean);lastVoiceUserRequestRef.current=clean;if(looksLikeDirectAppAction(clean)){callAssistant(clean,turnResolution);return true;}if(!sendRealtimeEvent({type:"conversation.item.create",item:{type:"message",role:"user",content:[{type:"input_text",text:clean}]}}))return false;var languageControlReply=assistantLanguageControlReply(turnResolution);if(languageControlReply)sendRealtimeModelResponse(turnResolution,"Reply exactly and only with this text: "+languageControlReply);else sendRealtimeModelResponse(turnResolution);setBusy(true);return true;}
  function stopSpeaking(){
    speechCycleRef.current+=1;
    try{if(speechAbortRef.current)speechAbortRef.current.abort();}catch(e){}speechAbortRef.current=null;
    try{var audio=nativeAudioRef.current;if(audio){audio.onended=null;audio.onerror=null;audio.pause();if(audio.src&&String(audio.src).startsWith("blob:"))URL.revokeObjectURL(audio.src);}}catch(e){}nativeAudioRef.current=null;
    try{var tts=nativeTtsRef.current;if(tts&&tts.stop)Promise.resolve(tts.stop()).catch(function(){});}catch(e){}
    try{if(typeof window!=="undefined"&&window.speechSynthesis)window.speechSynthesis.cancel();}catch(e){}
    if(mountedRef.current)setSpeaking(false);
  }
  function resumeListeningAfterSpeech(resume,cycle){if(resume&&continuous&&voiceModal&&mountedRef.current&&cycle===speechCycleRef.current)setTimeout(function(){if(cycle===speechCycleRef.current)startListening();},280);}
  async function speakFallback(clean,resume,cycle){
    if(!mountedRef.current||cycle!==speechCycleRef.current)return;
    setSpeaking(false);
    resumeListeningAfterSpeech(resume,cycle);
  }
  async function speak(text,resume){
    var clean=cleanSpeechText(text);if(!clean)return;
    stopSpeaking();var cycle=++speechCycleRef.current;
    try{
      if(cycle!==speechCycleRef.current)return;
      var ctrl=new AbortController();speechAbortRef.current=ctrl;if(mountedRef.current)setSpeaking(true);
      var timer=setTimeout(function(){ctrl.abort();},30000);
      var res=await authenticatedAiFetch(AI_VOICE_ENDPOINT,{method:"POST",headers:{"Content-Type":"application/json"},signal:ctrl.signal,body:JSON.stringify({text:clean,language:lastAssistantUserLanguageRef.current||String(lang||"it")})}).finally(function(){clearTimeout(timer);});
      if(cycle!==speechCycleRef.current)return;if(!res.ok)throw new Error("Natural voice unavailable");
      var blob=await res.blob();if(cycle!==speechCycleRef.current)return;if(!blob||!blob.size)throw new Error("Empty voice response");
      var url=URL.createObjectURL(blob);var audio=new Audio(url);nativeAudioRef.current=audio;audio.preload="auto";audio.volume=assistantVolumeRef.current;audio.muted=assistantVolumeRef.current<=0;
      audio.onended=function(){try{URL.revokeObjectURL(url);}catch(e){}if(nativeAudioRef.current===audio)nativeAudioRef.current=null;if(!mountedRef.current||cycle!==speechCycleRef.current)return;setSpeaking(false);resumeListeningAfterSpeech(resume,cycle);};
      audio.onerror=function(){try{URL.revokeObjectURL(url);}catch(e){}if(nativeAudioRef.current===audio)nativeAudioRef.current=null;if(!mountedRef.current||cycle!==speechCycleRef.current)return;setSpeaking(false);speakFallback(clean,resume,cycle);};
      await audio.play();
    }catch(e){speechAbortRef.current=null;if(!mountedRef.current||cycle!==speechCycleRef.current)return;setSpeaking(false);await speakFallback(clean,resume,cycle);}
  }
  function finishListening(text){var q=String(text||"").trim();setVoiceListening(false);if(q){setInput(q);setTimeout(function(){sendMessage(q);},60);}}
  function isIgnorableSpeechRecognitionError(data: any) {
    var raw = [
      data && data.code,
      data && data.error,
      data && data.message,
      data && data.reason,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase()
      .replace(/[_\s]+/g, "-");
    return (
      raw.indexOf("no-match") >= 0 ||
      raw.indexOf("nomatch") >= 0 ||
      raw.indexOf("no-speech") >= 0 ||
      raw.indexOf("speech-timeout") >= 0 ||
      raw.indexOf("aborted") >= 0
    );
  }
  async function finishNativeListening(){if(nativeSessionDoneRef.current)return;nativeSessionDoneRef.current=true;var q=String(nativeTextRef.current||"").trim();try{var p=nativeSpeechRef.current;if(p&&p.getLastPartialResult){var last=await p.getLastPartialResult();q=String((last&&last.text)||((last&&last.matches&&last.matches[0])||q)||"").trim();}}catch(e){}finishListening(q);}
  
  function stopListening(submitPartial){setVoiceListening(false);try{var p=nativeSpeechRef.current;if(p){if(submitPartial&&p.forceStop)Promise.resolve(p.forceStop({timeout:1200})).then(finishNativeListening).catch(finishNativeListening);else if(p.stop)Promise.resolve(p.stop()).catch(function(){});}}catch(e){}try{if(webRecognitionRef.current)webRecognitionRef.current.stop();}catch(e){}webRecognitionRef.current=null;}
  async function startNativeListening(){
    var mod:any=await import("@capgo/capacitor-speech-recognition");var SpeechRecognition:any=mod.SpeechRecognition||mod.default||mod;if(!SpeechRecognition||!SpeechRecognition.start)throw new Error("SpeechRecognition unavailable");
    nativeSpeechRef.current=SpeechRecognition;nativeTextRef.current="";nativeSessionDoneRef.current=false;
    var available=SpeechRecognition.available?await SpeechRecognition.available():{available:true};if(available&&available.available===false)throw new Error("SpeechRecognition unavailable");
    var permission=SpeechRecognition.checkPermissions?await SpeechRecognition.checkPermissions():{};var state=String((permission&&permission.speechRecognition)||"").toLowerCase();if(state!=="granted"){permission=SpeechRecognition.requestPermissions?await SpeechRecognition.requestPermissions():permission;state=String((permission&&permission.speechRecognition)||"").toLowerCase();}if(state&&state!=="granted")throw new Error("Microphone permission denied");
    try{if(SpeechRecognition.removeAllListeners)await SpeechRecognition.removeAllListeners();}catch(e){}
    if(SpeechRecognition.addListener){
      await SpeechRecognition.addListener("partialResults",function(data:any){var matches=(data&&data.matches)||[];var t=String((data&&data.accumulatedText)||matches[0]||(data&&data.accumulated)||"").trim();if(t){nativeTextRef.current=t;setInput(t);}});
      await SpeechRecognition.addListener("listeningState",function(data:any){var stopped=(data&&data.status==="stopped")||(data&&data.state==="stopped");if(stopped)setTimeout(finishNativeListening,100);});
      await SpeechRecognition.addListener("error",function(data:any){var code=String((data&&data.code)||"");if(code&&code!=="no-match")setVoiceError(code==="permission-denied"?V.unavailable:String((data&&data.message)||V.unavailable));setTimeout(finishNativeListening,80);});
    }
    var recognitionLocale=String((typeof navigator!=="undefined"&&navigator.language)||assistantSpeechLocale(lang||"it"));var res:any=await SpeechRecognition.start({language:recognitionLocale,maxResults:3,partialResults:true,popup:false,prompt:V.speak,addPunctuation:true,allowForSilence:1300});var matches=(res&&res.matches)||[];if(matches[0]){nativeTextRef.current=String(matches[0]);setInput(String(matches[0]));}
  }
  function startWebListening(){var SR:any=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;if(!SR)throw new Error("SpeechRecognition unavailable");var rec=new SR();webRecognitionRef.current=rec;rec.lang=String((typeof navigator!=="undefined"&&navigator.language)||assistantSpeechLocale(lang||"it"));rec.continuous=false;rec.interimResults=true;rec.maxAlternatives=3;var last="";rec.onresult=function(ev:any){var out="";for(var i=ev.resultIndex;i<ev.results.length;i++)out+=ev.results[i][0].transcript;last=out.trim();if(last)setInput(last);};rec.onerror=function(ev:any){setVoiceListening(false);if(ev&&ev.error!=="no-speech"&&ev.error!=="aborted")setVoiceError(V.unavailable);};rec.onend=function(){webRecognitionRef.current=null;finishListening(last);};rec.start();}
  async function startListening(){if(busy||aiLoading||voiceListening)return;stopSpeaking();setVoiceError("");setInput("");setVoiceListening(true);try{if(nativePlatform())await startNativeListening();else startWebListening();}catch(e){setVoiceListening(false);setVoiceError(V.unavailable);}}
  function interruptAndListen(){stopSpeaking();setVoiceError("");setTimeout(function(){if(mountedRef.current)startListening();},90);}
  function compressFinanceImage(dataUrl:string){return new Promise<string>(function(resolve,reject){try{var img=new Image();img.onload=function(){try{var maxSide=1800,w=img.width||1,h=img.height||1,scale=Math.min(1,maxSide/Math.max(w,h)),canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(w*scale));canvas.height=Math.max(1,Math.round(h*scale));var ctx2=canvas.getContext("2d");if(!ctx2)throw new Error("Canvas non disponibile.");ctx2.drawImage(img,0,0,canvas.width,canvas.height);resolve(canvas.toDataURL("image/jpeg",0.84));}catch(e){reject(e);}};img.onerror=function(){reject(new Error("Immagine non leggibile."));};img.src=dataUrl;}catch(e){reject(e);}});}
  function readFinanceFile(file:any){return new Promise<string>(function(resolve,reject){if(!file){reject(new Error("Nessuna foto selezionata."));return;}if(file.size&&file.size>18*1024*1024){reject(new Error("La foto supera 18 MB. Riducila e riprova."));return;}var reader=new FileReader();reader.onload=function(){compressFinanceImage(String(reader.result||"")).then(resolve).catch(reject);};reader.onerror=function(){reject(new Error("Non riesco a leggere la foto selezionata."));};reader.readAsDataURL(file);});}
  function readFinanceDocumentFile(file:any){return new Promise<any>(function(resolve,reject){if(!file){reject(new Error("Nessun documento selezionato."));return;}if(file.size&&file.size>12*1024*1024){reject(new Error("Il documento supera 12 MB."));return;}var allowed=/\.(pdf|doc|docx|rtf|txt|csv|xls|xlsx|json|xml|ods|odt)$/i.test(String(file.name||""))||/pdf|word|officedocument|spreadsheet|excel|csv|text|json|xml|rtf|opendocument/i.test(String(file.type||""));if(!allowed){reject(new Error("Formato non supportato. Usa PDF, Word, Excel, CSV o un file di testo."));return;}var reader=new FileReader();reader.onload=function(){resolve({dataUrl:String(reader.result||""),name:String(file.name||"documento"),mimeType:String(file.type||"application/octet-stream")});};reader.onerror=function(){reject(new Error("Non riesco a leggere il documento selezionato."));};reader.readAsDataURL(file);});}
  async function analyzeFinanceDocument(fileDataUrl:string,fileName?:string,fileMimeType?:string,isImage?:boolean){
    if(documentLoading||busy||aiLoading)return;
    if(!aiExternalConsent){setVoiceError(V.consentTitle);return;}
    if(canUsePlanFeature&&!canUsePlanFeature("receiptScan",1)){setVoiceError(upgradeMessage?upgradeMessage("receiptScan"):"Hai raggiunto il limite di scansione documenti.");return;}
    activeAttachmentRef.current={dataUrl:fileDataUrl,name:fileName||"documento",mimeType:fileMimeType||(isImage!==false?"image/jpeg":"application/octet-stream"),isImage:isImage!==false,createdAt:Date.now()};
    var wasMicEnabled=realtimeMicEnabled,stream=realtimeStreamRef.current;
    if(stream&&wasMicEnabled)try{stream.getAudioTracks().forEach(function(t){t.enabled=false;});setRealtimeMicEnabled(false);}catch(e){}
    sendRealtimeEvent({type:"response.cancel"});sendRealtimeEvent({type:"output_audio_buffer.clear"});
    setAttachmentMenuOpen(false);setDocumentLoading(true);setBusy(true);setAiLoading(true);setVoiceError("");
    appendMessage("user","📎 Allegato"+(fileName?" · "+fileName:""));
    try{
      var headers:any={"Content-Type":"application/json"};
      var ctrl=new AbortController();assistantRequestAbortRef.current=ctrl;var timer=setTimeout(function(){ctrl.abort();},70000);
      var documentLanguage=lastAssistantUserLanguageRef.current||String(lang||"it");
      var documentRequest=buildAssistantRequestPayload({question:"Read and interpret the attached document.",forcedLanguage:documentLanguage,fallbackLanguage:documentLanguage,interfaceLanguage:lang||"it",aiDataAccess:aiDataAccess||"summary",financeContext:buildContext(),chatHistory:(aiChat||[]).filter(function(m){return m&&m.role==="user";}).slice(-8).map(function(m){return{role:"user",text:m.rawText||m.text};})});
      var payload:any=documentRequest.payload;
      payload.instruction+=" Read the attached content directly. If it contains an expense, receipt, bill or invoice, do not return only a summary: prepare a create_expense proposal ready for confirmation, using only amount, document date, description, suggested category and default payment method. Do not add technical notes, tax data, document number, address, VAT number, taxable amount or VAT. If it contains multiple income or transaction rows, extract all rows and propose a separate action for each. Never say that you cannot read the attached file.";
      if(isImage!==false){payload.imageDataUrl=fileDataUrl;payload.imageName=fileName||"documento.jpg";}
      else{payload.fileDataUrl=fileDataUrl;payload.fileName=fileName||"documento";payload.fileMimeType=fileMimeType||"application/octet-stream";}
      var res=await fetch(AI_AGENT_ENDPOINT,{method:"POST",headers:headers,signal:ctrl.signal,body:JSON.stringify(payload)}).finally(function(){clearTimeout(timer);if(assistantRequestAbortRef.current===ctrl)assistantRequestAbortRef.current=null;});
      var data:any={};try{data=await res.json();}catch(e){}
      if(!res.ok)throw Object.assign(new Error((data&&data.error)||("Errore "+res.status)),{httpStatus:res.status});
      var answer=String((data&&data.answer)||"").trim(),actions=realtimeActionsFrom((data&&data.actions)||[]),opens=actions.filter(function(a){return a.action==="open_section";}),writes=actions.filter(function(a){return a.action!=="open_section";}).map(function(a){if(a.action==="create_expense"||a.action==="create_income"){return {...a,note:""};}return a;});
      if(consumePlanFeature){consumePlanFeature("receiptScan",1);consumePlanFeature("aiReply",1);}
      if(writes.length){updatePendingActions(writes);}
      else{
        if(answer){appendMessage("assistant",answer);speak(answer,false);}
        if(opens.length)setTimeout(function(){openSection(opens[0]);},80);
      }
    }catch(e){
      var msg=realtimeFailureMessage(e,"document",Number((e&&e.httpStatus)||0));setVoiceError(msg);appendMessage("assistant",msg);
    }finally{
      setDocumentLoading(false);setBusy(false);setAiLoading(false);
      if(stream&&wasMicEnabled)try{stream.getAudioTracks().forEach(function(t){t.enabled=true;});setRealtimeMicEnabled(true);}catch(e){}
    }
  }
  async function takeFinancePhoto(){setAttachmentMenuOpen(false);try{if(nativePlatform()){var mod:any=await import("@capacitor/camera");var photo=await mod.Camera.getPhoto({quality:84,allowEditing:false,resultType:mod.CameraResultType.DataUrl,source:mod.CameraSource.Camera,direction:mod.CameraDirection.Rear,saveToGallery:false,correctOrientation:true,promptLabelHeader:"Documento",promptLabelPhoto:"Scatta foto",promptLabelPicture:"Scatta foto"});if(photo&&photo.dataUrl){var compressed=await compressFinanceImage(String(photo.dataUrl));await analyzeFinanceDocument(compressed,"foto_"+Date.now()+".jpg","image/jpeg",true);return;}}if(cameraInputRef.current)cameraInputRef.current.click();}catch(e){var raw=String((e&&e.message)||"");if(!/cancel|cancell|user/i.test(raw))setVoiceError("Non riesco ad aprire la fotocamera.");}}
  async function chooseFinancePhoto(){setAttachmentMenuOpen(false);try{if(nativePlatform()){var mod:any=await import("@capacitor/camera");var photo=await mod.Camera.getPhoto({quality:84,allowEditing:false,resultType:mod.CameraResultType.DataUrl,source:mod.CameraSource.Photos,saveToGallery:false,correctOrientation:true,promptLabelHeader:"Foto",promptLabelPhoto:"Carica foto",promptLabelPicture:"Carica foto"});if(photo&&photo.dataUrl){var compressed=await compressFinanceImage(String(photo.dataUrl));await analyzeFinanceDocument(compressed,"foto_"+Date.now()+".jpg","image/jpeg",true);return;}}if(galleryInputRef.current)galleryInputRef.current.click();}catch(e){var raw=String((e&&e.message)||"");if(!/cancel|cancell|user/i.test(raw))setVoiceError("Non riesco a caricare la foto.");}}
  function chooseFinanceDocument(){setAttachmentMenuOpen(false);if(documentInputRef.current)documentInputRef.current.click();}
  async function onFinanceFileSelected(event:any){var file=event&&event.target&&event.target.files&&event.target.files[0];try{if(file){var dataUrl=await readFinanceFile(file);await analyzeFinanceDocument(dataUrl,file.name||"documento.jpg",file.type||"image/jpeg",true);}}catch(e){setVoiceError(String((e&&e.message)||"Non riesco a leggere la foto."));}finally{try{event.target.value="";}catch(e){}}}
  async function onFinanceDocumentSelected(event:any){var file=event&&event.target&&event.target.files&&event.target.files[0];try{if(file){var data=await readFinanceDocumentFile(file);await analyzeFinanceDocument(data.dataUrl,data.name,data.mimeType,false);}}catch(e){setVoiceError(String((e&&e.message)||"Non riesco a leggere il documento."));}finally{try{event.target.value="";}catch(e){}}}
  function monthKey(){return String(curMonthKey||todayStr().slice(0,7));}
  function debtBalance(d){var total=Number(d&&d.initialAmount)||0;(d&&d.transactions||[]).forEach(function(t){var n=Number(t.amount)||0;total+=t.action==="increase"?n:-n;});return Math.max(0,total);}
  function buildContext() {
    var mk = monthKey();
    var monthExpenses = (expenses || []).filter(function (x) {
      return String(x.date || "").slice(0, 7) === mk;
    });
    var monthIncomes = (incomes || []).filter(function (x) {
      return String(x.date || "").slice(0, 7) === mk;
    });
    var expM = monthExpenses.reduce(function (a, x) {
        return a + (Number(x.amount) || 0);
      }, 0),
      incM = monthIncomes.reduce(function (a, x) {
        return a + (Number(x.amount) || 0);
      }, 0);
    var pv = (patrimonioValues && patrimonioValues[mk]) || {};
    var patrimonioTotal = Object.keys(pv || {}).reduce(function (a, k) {
      return a + (Number(pv[k]) || 0);
    }, 0);
    var summaryByCat: any = {};
    monthExpenses.forEach(function (x) {
      var cat = (cats || []).find(function (y) {
        return String(y.id) === String(x.catId);
      });
      var cn = cat ? cat.name : "Altro";
      summaryByCat[cn] = (summaryByCat[cn] || 0) + (Number(x.amount) || 0);
    });
    var expenseCategorySummary = Object.keys(summaryByCat)
      .map(function (k) {
        return { name: k, amount: summaryByCat[k] };
      })
      .sort(function (a, b) {
        return b.amount - a.amount;
      })
      .slice(0, 12);
    var accessPolicy = assistantDataAccessPolicy(aiDataAccess);
    var ctx: any = {
      app: "fAInance",
      today: todayStr(),
      language: lang || "it",
      dataAccessLevel: accessPolicy.level,
      dataAccessPolicy: accessPolicy,
      plan: currentPlan || "free",
      defaults: {
        date: todayStr(),
        expenseCategory:
          (cats || []).find(function (x) {
            return String(x.id) === String(defaultExpenseCat);
          })?.name || "",
        expenseMethod:
          (methods || []).find(function (x) {
            return String(x.id) === String(defaultExpenseMethod);
          })?.name || "",
        incomeType:
          (incomeTypes || []).find(function (x) {
            return String(x.id) === String(defaultIncomeType);
          })?.name || "",
        shoppingArea: shoppingDefaultArea || "",
        shoppingUnit: shoppingDefaultUnit || "Unità",
      },
      settings: {
        appearance: bgTheme || "default",
        buttonStyle: btnStyle || "soft",
        topBar: showAppSummaryHeader !== false,
        bottomBarIcons: Math.max(
          3,
          Math.min(7, Number(mobileNavIconCount) || 5)
        ),
        bottomBarOrder: mobileNavOrder || [],
        menuOrder: mobileMenuOrder || [],
        homeBalanceView: homeBalanceView || "rateizzato",
        statisticsView: statsView || "rateizzato",
        dateFormat: dateFmt || "dmy",
        firstDayOfWeek: firstDayOfWeek || "mon",
        secondaryCurrency: {
          history: !!showSecInHistory,
          statistics: !!showSecInStats,
          budget: !!showSecInBudget,
          patrimonio: !!showSecInPatrimonio,
        },
        history: {
          futureMode: historyFutureMode,
          sortDate: historySortDate,
          sortDirection: historySortDirection,
          secondary: historySortSecondary,
          secondaryDirection: historySortSecondaryDirection,
        },
        showShareInHistory: !!showShareInHistory,
        showDebtCreditsInPatrimonio: !!showDebtCreditsInPatrimonio,
        showDebtCreditsInExpenses: !!showDebtCreditsInExpenses,
        shoppingProductSort: shoppingProductSort || "custom",
        shoppingDefaultArea: shoppingDefaultArea || "",
        shoppingDefaultUnit: shoppingDefaultUnit || "Unità",
        patrimonioMode: patrimonioMode || "manuale",
        aiDataAccess: aiDataAccess || "summary",
        aiFloatingEnabled: !!aiFloatingEnabled,
      },
      totals: {
        month: mk,
        expenses: expM,
      },
      dataQuality: {
        expensesCount: (expenses || []).length,
        currentMonthExpenses: monthExpenses.length,
      },
      topExpenseCategories: expenseCategorySummary,
      catalogs: {
        categories: (cats || [])
          .filter(function (x) {
            return !x.archived;
          })
          .map(function (x) {
            return {
              id: String(x.id),
              name: x.name,
              groupId: String(x.group || ""),
            };
          }),
        expenseGroups: (expenseGroups || []).map(function (x) {
          return { id: String(x.id), name: x.name };
        }),
        methods: (methods || [])
          .filter(function (x) {
            return !x.archived;
          })
          .map(function (x) {
            return {
              id: String(x.id),
              name: x.name,
              groupId: String(x.group || ""),
            };
          }),
        methodGroups: (methodGroups || []).map(function (x) {
          return { id: String(x.id), name: x.name };
        }),
        incomeTypes: (incomeTypes || []).map(function (x) {
          return { id: String(x.id), name: x.name };
        }),
        shoppingAreas: (shoppingAreas || []).slice(0, 50),
        shoppingUnits: (shoppingUnits || []).slice(0, 50),
        patrimonioAreas: (patrimonioAreas || []).map(function (x) {
          return { id: String(x.id), name: x.name };
        }),
        patrimonioEntries: (patrimonioEntries || []).map(function (x) {
          return {
            id: String(x.id),
            name: x.name,
            areaId: String(x.areaId || ""),
          };
        }),
        sections: [
          "home",
          "expenses",
          "incomes",
          "recurring",
          "history",
          "statistics",
          "budget",
          "goals",
          "alerts",
          "patrimonio",
          "debtCredits",
          "shopping",
          "share",
          "appunti",
          "settings",
          "ai",
        ],
      },
      shoppingRules: {
        allowedUnits: (shoppingUnits || []).slice(0, 50),
        defaultUnit: shoppingDefaultUnit || "Unità",
        neverCreateUnitsWhileAddingProducts: true,
        createUnitOnlyWhenExplicitlyRequested: true,
      },
    };
    if (aiDataAccess === "areas" || aiDataAccess === "full") {
      var byCat: any = {},
        byArea: any = {};
      monthExpenses.forEach(function (x) {
        var cat = (cats || []).find(function (y) {
          return String(y.id) === String(x.catId);
        });
        var cn = cat ? cat.name : "Altro",
          gid = cat ? String(cat.group || "altro") : "altro",
          grp = (expenseGroups || []).find(function (g) {
            return String(g.id) === gid;
          });
        var gn = grp ? grp.name : gid,
          n = Number(x.amount) || 0;
        byCat[cn] = (byCat[cn] || 0) + n;
        byArea[gn] = (byArea[gn] || 0) + n;
      });
      ctx.expenseAreas = Object.keys(byArea)
        .map(function (k) {
          return { name: k, amount: byArea[k] };
        })
        .sort(function (a, b) {
          return b.amount - a.amount;
        });
      if (aiDataAccess === "areas") {
        ctx.expenses = (expenses || [])
          .slice()
          .sort(function (a, b) {
            return String(b.date || "").localeCompare(String(a.date || ""));
          })
          .slice(0, 500)
          .map(function (x) {
            var cat = (cats || []).find(function (y) {
              return String(y.id) === String(x.catId);
            });
            var gid = cat ? String(cat.group || "") : "";
            var grp = (expenseGroups || []).find(function (g) {
              return String(g.id) === gid;
            });
            return {
              date: x.date,
              amount: Number(x.amount) || 0,
              category: cat ? cat.name : "Altro",
              area: grp ? grp.name : gid,
            };
          });
      }
    }
    if (aiDataAccess === "full") {
      ctx.userProfile = buildAssistantProfileContext(currentUser);
      ctx.totals = {
        month: mk,
        expenses: expM,
        incomes: incM,
        balance: incM - expM,
        patrimonio: patrimonioTotal,
      };
      ctx.dataQuality = {
        expensesCount: (expenses || []).length,
        incomesCount: (incomes || []).length,
        recurringCount: (recurring || []).length,
        goalsCount: (goals || []).length,
        alertsCount: (alerts || []).length,
        debtCreditsCount: (debtCredits || []).length,
        shoppingOpenItems: (shoppingItems || []).filter(function (x) {
          return !x.archived && !x.bought;
        }).length,
      };
      ctx.goals = (goals || []).map(function (g) {
        return {
          name: g.name,
          target: Number(g.target) || 0,
          saved: Number(g.saved) || 0,
          deadline: g.deadline || "",
          period: g.period || "annual",
        };
      });
      ctx.alerts = (alerts || []).map(function (a) {
        var target =
          a.type === "cat"
            ? (cats || []).find(function (x) {
                return String(x.id) === String(a.catId);
              })
            : (expenseGroups || []).find(function (x) {
                return String(x.id) === String(a.groupId);
              });
        return {
          name: a.name,
          type: a.type,
          target: target ? target.name : "",
          budget: Number(a.budget) || 0,
          period: a.period || "monthly",
        };
      });
      ctx.debtCredits = (debtCredits || []).map(function (d) {
        return {
          kind: d.kind,
          holder: d.holder,
          balance: debtBalance(d),
          startDate: d.startDate || "",
          endDate: d.estimatedEndDate || "",
          note: d.note || "",
        };
      });
      ctx.shopping = {
        activeListId: activeShoppingListId || "main",
        lists: (shoppingLists || []).map(function (x) {
          return { id: String(x.id), title: x.title || "" };
        }),
        activeItems: (shoppingItems || [])
          .filter(function (x) {
            return !x.archived && !x.bought;
          })
          .slice(0, 100)
          .map(function (x) {
            return {
              name: x.name,
              area: x.area || "",
              quantity: x.qty || "1",
              unit: x.unit || "unità",
              listId: String(x.listId || "main"),
            };
          }),
      };
      ctx.budget = budgetPlan || {};
      ctx.recurring = (recurring || []).slice(0, 80).map(function (x) {
        return {
          name: x.name,
          type: x.rtype,
          amount: Number(x.amount) || 0,
          frequency: x.frequency || "monthly",
          dayOfMonth: x.dayOfMonth || 1,
        };
      });
      ctx.patrimonio = (patrimonioEntries || []).map(function (x) {
        return {
          name: x.name,
          areaId: x.areaId,
          value: Number(pv[String(x.id)]) || 0,
        };
      });
      ctx.notes = (appuntiNotes || []).slice(0, 40).map(function (x) {
        return {
          title: x.title || "",
          text: String(x.text || "").slice(0, 500),
        };
      });
      ctx.shareProjects = (shareProjects || []).slice(0, 40).map(function (x) {
        var activeParticipants = (x.participants || []).filter(function (p) {
          return String(p.status || "active") !== "archived";
        });
        return {
          id: String(x.id || ""),
          name: x.name,
          description: x.description || "",
          participants: activeParticipants.map(function (p) {
            return {
              id: String(p.id || ""),
              name: p.name || p.displayName || p.email || "",
              role: p.role || "member",
              status: p.status || "active",
              kind: p.kind || p.type || "",
              isCurrent:
                String(p.uid || "") === String(userId || "") ||
                String(p.id || "") === "me",
            };
          }),
          expensesCount: (x.activities || []).filter(function (a) {
            return a && a.kind !== "settlement";
          }).length,
          settlementsCount: (x.activities || []).filter(function (a) {
            return a && a.kind === "settlement";
          }).length,
        };
      });
      ctx.transactions = {
        expenses: (expenses || []).slice(0, 500).map(function (x) {
          var cat = (cats || []).find(function (y) {
            return String(y.id) === String(x.catId);
          });
          var met = (methods || []).find(function (y) {
            return String(y.id) === String(x.methodId);
          });
          return {
            date: x.date,
            amount: Number(x.amount) || 0,
            description: x.desc || "",
            category: cat ? cat.name : "",
            method: met ? met.name : "",
          };
        }),
        incomes: (incomes || []).slice(0, 300).map(function (x) {
          var it = (incomeTypes || []).find(function (y) {
            return String(y.id) === String(x.type);
          });
          return {
            date: x.date,
            amount: Number(x.amount) || 0,
            description: x.desc || "",
            type: it ? it.name : String(x.type || ""),
          };
        }),
      };
    }
    return ctx;
  }
  function normalized(v){return String(v||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").trim();}
  function booleanValue(v,def){var n=normalized(v);if(["true","1","si","sì","yes","on","show","mostra","visible","attiva","attivo"].indexOf(n)>=0)return true;if(["false","0","no","off","hide","nascondi","hidden","disattiva","disattivo"].indexOf(n)>=0)return false;return def;}
  function validISODate(value,allowEmpty){var raw=String(value||"").trim();if(!raw)return allowEmpty?"":todayStr();if(!/^\d{4}-\d{2}-\d{2}$/.test(raw))throw new Error("Data non valida.");var p=raw.split("-").map(Number),d=new Date(p[0],p[1]-1,p[2]);if(d.getFullYear()!==p[0]||d.getMonth()!==p[1]-1||d.getDate()!==p[2])throw new Error("Data non valida.");return raw;}
  function findNamed(list,name,fallbackId){var active=(list||[]).filter(function(x){return !x.archived;}),n=normalized(name);if(n){var exact=active.find(function(x){return normalized(x.name)===n;});if(exact)return exact;var fuzzy=active.filter(function(x){var xn=normalized(x.name);return xn&&(xn.indexOf(n)>=0||n.indexOf(xn)>=0);});return fuzzy.length===1?fuzzy[0]:null;}var fallback=active.find(function(x){return fallbackId!==undefined&&String(x.id)===String(fallbackId);});return fallback||active[0]||null;}
  function findUniqueByName(list,name,key){var n=normalized(name),field=key||"name";if(!n)return null;var exact=(list||[]).find(function(x){return normalized(x[field])===n;});if(exact)return exact;var fuzzy=(list||[]).filter(function(x){var xn=normalized(x[field]);return xn&&(xn.indexOf(n)>=0||n.indexOf(xn)>=0);});return fuzzy.length===1?fuzzy[0]:null;}
  function shareRound(value){return Math.round((Number(value)||0)*100)/100;}
  function shareParticipantLabel(p){return String((p&&(p.name||p.displayName||p.email||p.phone))||"").trim();}
  function resolveShareProject(name){var active=(shareProjects||[]).filter(function(x){return x&&!x.archived;});var requested=String(name||"").trim();if(requested){var found=findUniqueByName(active,requested,"name");if(!found)throw new Error("Progetto Share non trovato o nome ambiguo.");return found;}if(active.length===1)return active[0];throw new Error(active.length?"Specifica il progetto Share.":"Non ci sono progetti Share disponibili.");}
  function activeShareParticipants(project){return (project&&project.participants||[]).filter(function(p){return p&&String(p.status||"active")!=="archived";});}
  function resolveShareParticipant(participants,name,allowCurrent){var requested=String(name||"").trim(),current=(participants||[]).find(function(p){return String(p.uid||"")===String(userId||"")||String(p.id||"")==="me";});if(requested){var n=normalized(requested);if(["io","me","myself","utente corrente","current user","moi","yo","ich","eu"].indexOf(n)>=0&&current)return current;var exact=(participants||[]).find(function(p){return normalized(shareParticipantLabel(p))===n;});if(exact)return exact;var fuzzy=(participants||[]).filter(function(p){var pn=normalized(shareParticipantLabel(p));return pn&&(pn.indexOf(n)>=0||n.indexOf(pn)>=0);});if(fuzzy.length===1)return fuzzy[0];throw new Error("Partecipante Share non trovato o nome ambiguo: "+requested);}if(allowCurrent&&current)return current;return null;}
  function buildShareSplits(total,participants,specs,mode){var amount=shareRound(total),selected:any[]=[];(specs||[]).forEach(function(spec){var p=resolveShareParticipant(participants,spec&&spec.name,false);if(p&&!selected.some(function(x){return String(x.p.id)===String(p.id);}))selected.push({p:p,spec:spec});});if(!selected.length)selected=(participants||[]).map(function(p){return{p:p,spec:{}};});if(!selected.length)throw new Error("Il progetto Share non ha partecipanti attivi.");var shares:any={},current=resolveShareParticipant(participants,"",true);var splitMode=mode==="amount"||mode==="percent"?mode:"equal";if(splitMode==="amount"){var sum=0,missing:any[]=[];selected.forEach(function(x){var raw=x.spec&&x.spec.amount;if(raw===null||raw===undefined||raw===""){missing.push(x);return;}var n=shareRound(raw);if(!(n>=0))throw new Error("Quota Share non valida per "+shareParticipantLabel(x.p)+".");shares[String(x.p.id)]=n;sum=shareRound(sum+n);});if(!missing.length&&sum<amount-0.01&&current&&!selected.some(function(x){return String(x.p.id)===String(current.id);})){selected.push({p:current,spec:{}});missing.push(selected[selected.length-1]);}if(missing.length===1){var remainder=shareRound(amount-sum);if(remainder<0)throw new Error("Le quote Share superano l’importo totale.");shares[String(missing[0].p.id)]=remainder;sum=shareRound(sum+remainder);}else if(missing.length>1)throw new Error("Specifica una sola quota mancante oppure tutte le quote Share.");if(Math.abs(sum-amount)>0.01)throw new Error("Le quote Share devono sommare all’importo totale.");return{shares:shares,mode:"amount"};}if(splitMode==="percent"){var pctSum=0,missingPct:any[]=[];selected.forEach(function(x){var raw=x.spec&&x.spec.percent;if(raw===null||raw===undefined||raw===""){missingPct.push(x);return;}var pct=Number(raw);if(!Number.isFinite(pct)||pct<0)throw new Error("Percentuale Share non valida per "+shareParticipantLabel(x.p)+".");x.pct=pct;pctSum+=pct;});if(!missingPct.length&&pctSum<99.99&&current&&!selected.some(function(x){return String(x.p.id)===String(current.id);})){var added={p:current,spec:{},pct:100-pctSum};selected.push(added);missingPct.push(added);}if(missingPct.length===1){missingPct[0].pct=100-pctSum;pctSum=100;}else if(missingPct.length>1)throw new Error("Specifica una sola percentuale mancante oppure tutte le percentuali Share.");if(Math.abs(pctSum-100)>0.01)throw new Error("Le percentuali Share devono sommare a 100.");var assigned=0;selected.forEach(function(x,i){var pct=Number(x.pct!==undefined?x.pct:(x.spec&&x.spec.percent))||0,n=i===selected.length-1?shareRound(amount-assigned):shareRound(amount*pct/100);shares[String(x.p.id)]=n;assigned=shareRound(assigned+n);});return{shares:shares,mode:"percent"};}var base=Math.floor((amount/selected.length)*100)/100,assigned2=0;selected.forEach(function(x,i){var n=i===selected.length-1?shareRound(amount-assigned2):base;shares[String(x.p.id)]=n;assigned2=shareRound(assigned2+n);});return{shares:shares,mode:"equal"};}
  function resolveArea(name){var n=normalized(name);return (shoppingAreas||[]).find(function(x){return normalized(x)===n;})||(shoppingAreas||[]).find(function(x){return n&&(normalized(x).indexOf(n)>=0||n.indexOf(normalized(x))>=0);})||shoppingDefaultArea||(shoppingAreas||[])[0]||"Altro";}
  function configuredShoppingUnits(){var source=Array.isArray(shoppingUnits)&&shoppingUnits.length?shoppingUnits:["Grammi","Litri","Unità","Altro"];var out:any[]=[];source.forEach(function(unit){var clean=String(unit||"").trim();if(clean&&!out.some(function(x){return normalized(x)===normalized(clean);}))out.push(clean);});return out.length?out:["Unità"];}
  function findConfiguredShoppingUnit(value){var n=normalized(value);if(!n)return null;return configuredShoppingUnits().find(function(unit){return normalized(unit)===n;})||null;}
  function resolveShoppingUnit(value,catalogValue){var units=configuredShoppingUnits(),requested=findConfiguredShoppingUnit(value);if(requested)return requested;var n=normalized(value),aliases:any={g:["grammi","grammo","g"],gr:["grammi","grammo","g"],grammo:["grammi","grammo","g"],grammi:["grammi","grammo","g"],l:["litri","litro","l"],litro:["litri","litro","l"],litri:["litri","litro","l"],pz:["unita","pezzi","pezzo","pz","pcs"],pezzo:["unita","pezzi","pezzo","pz","pcs"],pezzi:["unita","pezzi","pezzo","pz","pcs"],pcs:["unita","pezzi","pezzo","pz","pcs"],unit:["unita","pezzi","pezzo","pz","pcs"],unita:["unita","pezzi","pezzo","pz","pcs"]};var aliasList=aliases[n]||[];for(var i=0;i<aliasList.length;i++){var aliasUnit=units.find(function(unit){return normalized(unit)===aliasList[i];});if(aliasUnit)return aliasUnit;}var catalog=findConfiguredShoppingUnit(catalogValue);if(catalog)return catalog;var def=findConfiguredShoppingUnit(shoppingDefaultUnit);if(def)return def;return units.find(function(unit){return normalized(unit)==="unita";})||units[0]||"Unità";}
  function explicitShoppingUnitCreationRequested(){var raw=String(lastVoiceUserRequestRef.current||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");var hasUnit=/(unita\s+di\s+misura|measurement\s+unit|unit\s+of\s+measure|unidad\s+de\s+medida|unite\s+de\s+mesure|masseinheit|unidade\s+de\s+medida|jednostk[a-z]*\s+miar|meeteenheid|unitate\s+de\s+masura)/i.test(raw);var hasCreate=/(crea|creare|aggiungi|aggiungere|nuov[oa]|create|add|new|crear|anad|ajout|creer|hinzuf|neu|criar|adicion|utworz|dodaj|maak|toevoeg|creeaz|adaug)/i.test(raw);return hasUnit&&hasCreate;}
  function createShoppingUnitExplicit(value){var clean=String(value||"").trim();if(!clean)throw new Error("Nome dell’unità di misura non valido.");var existing=findConfiguredShoppingUnit(clean);if(existing)return existing;if(!explicitShoppingUnitCreationRequested())throw new Error("Una nuova unità di misura può essere creata solo su richiesta esplicita.");setShoppingUnits(function(current){var base=Array.isArray(current)&&current.length?current:configuredShoppingUnits();if(base.some(function(unit){return normalized(unit)===normalized(clean);}))return base;return base.concat([clean]);});if(!String(shoppingDefaultUnit||"").trim()&&setShoppingDefaultUnit)setShoppingDefaultUnit(clean);return clean;}
  function actionSummary(a){
    if(a&&a.action==="create_expense"){
      var expenseCat=String(a.categoryName||((cats||[]).find(function(x){return String(x.id)===String(defaultExpenseCat);})||{}).name||"Predefinita");
      var expenseMethod=String(a.methodName||((methods||[]).find(function(x){return String(x.id)===String(defaultExpenseMethod);})||{}).name||"Predefinito");
      return ["Importo: € "+Number(a.amount||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}),"Data: "+String(a.date||todayStr()),"Descrizione: "+String(a.description||"Spesa"),"Categoria: "+expenseCat,"Metodo: "+expenseMethod,a.note?"Dettagli: "+String(a.note):""].filter(Boolean).join("\n");
    }
    if(a&&a.action==="create_income"){
      var incomeType=String(a.incomeTypeName||((incomeTypes||[]).find(function(x){return String(x.id)===String(defaultIncomeType);})||{}).name||"Predefinita");
      return ["Importo: € "+Number(a.amount||0).toLocaleString("it-IT",{minimumFractionDigits:2,maximumFractionDigits:2}),"Data: "+String(a.date||todayStr()),"Descrizione: "+String(a.description||"Entrata"),"Tipo: "+incomeType,a.note?"Dettagli: "+String(a.note):""].filter(Boolean).join("\n");
    }
    if(a&&a.summary)return a.summary;
    var m:any={create_recurring:"Ricorrente",create_goal:"Obiettivo",update_goal_saved:"Aggiornamento obiettivo",create_alert:"Alert",set_category_budget:"Budget",create_debt_credit:"Debito / Credito",update_debt_credit:"Transazione Debito / Credito",delete_debt_credit:"Elimina Debito / Credito",set_patrimonio_value:"Patrimonio",create_note:"Appunto",add_shopping_items:"Lista della spesa",create_shopping_list:"Nuova lista",create_shopping_unit:"Nuova unità di misura",create_share_project:"Progetto Share",create_share_expense:"Spesa Share",create_share_settlement:"Saldo Share",create_expense_category:"Categoria",create_payment_method:"Metodo",set_setting:"Impostazione"};
    return (m[a.action]||a.action||"Operazione")+(a.entityName||a.goalName||a.alertName||a.holder||a.assetName||a.listTitle||a.projectName||a.settingName?" · "+(a.entityName||a.goalName||a.alertName||a.holder||a.assetName||a.listTitle||a.projectName||a.settingName):"")+(a.amount!=null?" · "+a.amount:"");
  }
  function addShoppingRecords(specs,listId){var items=(specs||[]).filter(function(x){return String(x.name||"").trim();});if(!items.length)throw new Error("Nessun prodotto valido.");var activeCount=(shoppingItems||[]).filter(function(x){return !x.archived&&String(x.listId||"main")===String(listId);}).length;var lim=PLAN_LIMITS&&PLAN_LIMITS[currentPlan]?PLAN_LIMITS[currentPlan].shoppingListItems:Infinity;if(lim!==Infinity&&activeCount+items.length>Number(lim))throw new Error(upgradeMessage?upgradeMessage("shoppingListItems"):"Limite della lista della spesa raggiunto.");setShoppingItems(function(source){var next=Array.isArray(source)?source.slice():[],added:any[]=[];items.forEach(function(spec,idx){var name=String(spec.name||"").trim(),area=resolveArea(spec.area),catalog=next.find(function(x){return x.archived&&normalized(x.name)===normalized(name)&&normalized(x.area)===normalized(area);}),catalogId=catalog?String(catalog.productId||catalog.id):("prod_"+Date.now()+"_"+idx+"_"+Math.floor(Math.random()*9999)),unit=resolveShoppingUnit(spec.unit,catalog&&catalog.unit);if(!catalog)next.push({id:catalogId,productId:catalogId,name:name,area:area,note:spec.note||"",qty:String(spec.quantity||"1"),unit:unit,bought:false,archived:true,listId:"",order:Date.now()+idx,createdAt:new Date().toISOString(),catalogOnly:true,usageCount:1});added.push({id:"shop_"+Date.now()+"_"+idx+"_"+Math.floor(Math.random()*9999),productId:catalogId,name:name,area:area,note:spec.note||"",qty:String(spec.quantity||"1"),unit:unit,bought:false,archived:false,listId:String(listId||"main"),order:Date.now()+idx,createdAt:new Date().toISOString(),catalogOnly:false});});return added.concat(next);});}
  function executeAction(a){
    var shareSignal=[a&&a.summary,a&&a.description,a&&a.projectName].join(" ").toLowerCase();if(a&&a.action==="create_expense"&&/(spesa condivisa|spesa share|share expense|shared expense|split expense|divid|nel progetto|progetto share)/i.test(shareSignal))return executeAction({...a,action:"create_share_expense"});
    if(a.action==="create_expense"){var amount=Number(a.amount)||0;if(amount<=0)throw new Error("Importo non valido.");var cat=findNamed(cats,a.categoryName,defaultExpenseCat),method=findNamed(methods,a.methodName,defaultExpenseMethod);if(!cat)throw new Error("Categoria non trovata o ambigua.");if(!method)throw new Error("Metodo di pagamento non trovato o ambiguo.");var ok=addExpenses([{id:Date.now()+Math.random(),amount:amount,catId:cat.id,methodId:method.id,methodName:method.name,desc:a.description||cat.name,date:validISODate(a.date,false),rateizzato:!!a.rateizzato,rate:Math.max(1,Number(a.rate)||1)}],"assistant");if(ok===false)throw new Error("Non è stato possibile aggiungere l’uscita.");return actionSummary(a);}
    if(a.action==="create_income"){var amount2=Number(a.amount)||0;if(amount2<=0)throw new Error("Importo non valido.");var it=findNamed(incomeTypes,a.incomeTypeName,defaultIncomeType);if(!it)throw new Error("Tipo di entrata non trovato o ambiguo.");var ok2=addIncomes([{id:Date.now()+Math.random(),amount:amount2,type:it.id,desc:a.description||it.name,date:validISODate(a.date,false),rateizzato:!!a.rateizzato,rate:Math.max(1,Number(a.rate)||1)}],"assistant");if(ok2===false)throw new Error("Non è stato possibile aggiungere l’entrata.");return actionSummary(a);}
    if(a.action==="create_recurring"){var ar=Number(a.amount)||0,nameR=String(a.recurringName||a.description||"").trim(),rtype=a.recurringType==="income"?"income":"expense";if(ar<=0||!nameR)throw new Error("Nome o importo della ricorrente non valido.");var rc=findNamed(cats,a.categoryName,defaultExpenseCat),rm=findNamed(methods,a.methodName,defaultExpenseMethod),ri=findNamed(incomeTypes,a.incomeTypeName,defaultIncomeType);if(rtype==="expense"&&(!rc||!rm))throw new Error("Categoria o metodo della ricorrente non valido.");if(rtype==="income"&&!ri)throw new Error("Tipo di entrata della ricorrente non valido.");setRecurring(function(p){return [{id:Date.now()+Math.random(),name:nameR,icon:a.icon||(rtype==="income"?"💰":"🔁"),rtype:rtype,amount:ar,catId:rc?rc.id:null,methodId:rm?rm.id:null,incomeType:ri?ri.id:null,dayOfMonth:Math.max(0,Math.min(31,Number(a.dayOfMonth)||1)),annualMonth:Math.max(1,Math.min(12,Number(a.annualMonth)||new Date().getMonth()+1)),rateizzato:!!a.rateizzato,rate:Math.max(1,Number(a.rate)||1),frequency:a.frequency==="annual"?"annual":"monthly",confirmed:[],skipped:[]}].concat(p||[]);});return actionSummary(a);}
    if(a.action==="create_goal"){var target=Number(a.target)||0,goalName=String(a.goalName||"").trim();if(!goalName||target<=0)throw new Error("Nome o importo dell’obiettivo non valido.");if(findUniqueByName(goals,goalName,"name"))throw new Error("Esiste già un obiettivo con questo nome.");if(canAddPlanItem&&!canAddPlanItem("goals",(goals||[]).length,1))throw new Error(upgradeMessage?upgradeMessage("goals"):"Limite obiettivi raggiunto.");setGoals(function(p){return [...(p||[]),{id:Date.now()+Math.random(),name:goalName,target:target,saved:Math.max(0,Number(a.saved)||0),deadline:validISODate(a.deadline,true),period:a.period==="monthly"?"monthly":"annual",icon:a.icon||"🎯",color:a.color||"#7F77DD"}];});return actionSummary(a);}
    if(a.action==="update_goal_saved"){var goal=findUniqueByName(goals,a.goalName,"name"),delta=Number(a.savedDelta)||0;if(!goal)throw new Error("Obiettivo non trovato o nome ambiguo.");if(!delta)throw new Error("Importo non valido.");setGoals(function(p){return (p||[]).map(function(g){return String(g.id)===String(goal.id)?{...g,saved:Math.max(0,(Number(g.saved)||0)+delta)}:g;});});return actionSummary(a);}
    if(a.action==="create_alert"){var ba=Number(a.budgetAmount)||Number(a.amount)||0;if(ba<=0)throw new Error("Budget dell’alert non valido.");var isGroup=a.alertScope==="group",targetA=isGroup?findNamed(expenseGroups,a.alertTargetName,null):findNamed(cats,a.alertTargetName,defaultExpenseCat);if(!targetA)throw new Error("Categoria o area dell’alert non trovata.");setAlerts(function(p){return [{id:Date.now()+Math.random(),name:String(a.alertName||("Alert "+targetA.name)).trim(),type:isGroup?"group":"cat",catId:isGroup?null:targetA.id,groupId:isGroup?targetA.id:null,budget:ba,triggerMode:a.triggerMode==="pct"?"pct":"immediate",triggerPct:Math.max(0,Math.min(200,Number(a.triggerPct)||0)),customText:a.customText||"",period:a.period==="annual"?"annual":"monthly"}].concat(p||[]);});return actionSummary(a);}
    if(a.action==="set_category_budget"){var bc=Number(a.budgetAmount)||Number(a.amount)||0,catB=findNamed(cats,a.categoryName||a.alertTargetName,defaultExpenseCat);if(!catB||bc<=0)throw new Error("Categoria o importo del budget non valido.");setBudgetPlan(function(prev){var base=prev&&typeof prev==="object"?prev:DEFAULT_BUDGET_PLAN,items=Array.isArray(base.items)?base.items.slice():[];var found=false;items=items.map(function(x){if(String(x.catId)===String(catB.id)){found=true;return{...x,amount:bc};}return x;});if(!found)items.push({catId:catB.id,amount:bc,pct:0});return{...base,items:items};});return actionSummary(a);}
    if(a.action==="create_debt_credit"){var da=Number(a.initialAmount)||Number(a.amount)||0,holder=String(a.holder||a.entityName||"").trim();if(da<=0||!holder)throw new Error("Persona o importo del Debito / Credito non valido.");if(canAddPlanItem&&!canAddPlanItem("debtCredits",(debtCredits||[]).length,1))throw new Error(upgradeMessage?upgradeMessage("debtCredits"):"Limite Debiti / Crediti raggiunto.");setDebtCredits(function(p){return [{id:"dc_"+Date.now(),kind:a.debtKind==="credit"?"credit":"debt",holder:holder,initialAmount:da,startDate:validISODate(a.startDate||a.date,false),estimatedEndDate:validISODate(a.endDate,true),note:a.note||a.description||"",transactions:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()}].concat(p||[]);});return actionSummary(a);}
    if(a.action==="update_debt_credit"){var debt=findUniqueByName(debtCredits,a.holder||a.entityName,"holder"),txa=Number(a.amount)||0;if(!debt)throw new Error("Debito / Credito non trovato o nome ambiguo.");if(txa<=0)throw new Error("Importo non valido.");var tx={id:"tx_"+Date.now(),action:a.transactionMode==="increase"?"increase":"reduction",amount:txa,date:validISODate(a.date,false),startDate:debt.startDate||todayStr(),estimatedEndDate:a.endDate||debt.estimatedEndDate||"",note:a.note||a.description||"",createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};setDebtCredits(function(p){return (p||[]).map(function(x){return String(x.id)===String(debt.id)?{...x,transactions:[tx].concat(x.transactions||[]),updatedAt:new Date().toISOString()}:x;});});return actionSummary(a);}
    if(a.action==="delete_debt_credit"){var debtToDelete=findUniqueByName(debtCredits,a.holder||a.entityName,"holder");if(!debtToDelete)throw new Error("Debito / Credito non trovato o nome ambiguo.");setDebtCredits(function(p){return (p||[]).filter(function(x){return String(x.id)!==String(debtToDelete.id);});});a.holder=debtToDelete.holder;return actionSummary(a);}
    if(a.action==="set_patrimonio_value"){var value=Number(a.value);if(!Number.isFinite(value))throw new Error("Valore del patrimonio non valido.");var asset=findUniqueByName(patrimonioEntries,a.assetName||a.entityName,"name"),assetId=asset&&asset.id;if(!asset){var area=findNamed(patrimonioAreas,a.assetGroup,null)||(patrimonioAreas||[])[0];assetId="asset_"+Date.now();setPatrimonioEntries(function(p){return [...(p||[]),{id:assetId,name:String(a.assetName||a.entityName||"Patrimonio"),icon:a.icon||"📦",areaId:area?area.id:"altro"}];});}setPatrimonioValues(function(prev){var next={...(prev||{})},mk=monthKey();next[mk]={...(next[mk]||{}),[String(assetId)]:value};return next;});return actionSummary(a);}
    if(a.action==="create_note"){var title=String(a.noteTitle||a.entityName||"").trim(),text=String(a.noteText||a.note||a.description||"").trim();if(!title&&!text)throw new Error("Appunto vuoto.");setAppuntiNotes(function(p){return [{id:"note_"+Date.now(),title:title||text.slice(0,50),text:text,createdAt:new Date().toISOString()}].concat(p||[]);});return actionSummary(a);}
    if(a.action==="add_shopping_items"){var requested=String(a.listTitle||"").trim(),targetList=requested?findUniqueByName(shoppingLists,requested,"title"):((shoppingLists||[]).find(function(x){return String(x.id)===String(activeShoppingListId);})||(shoppingLists||[])[0]||{id:"main"});if(!targetList)throw new Error("Lista della spesa non trovata.");addShoppingRecords(a.items||[],targetList.id);return actionSummary(a);}
    if(a.action==="create_shopping_unit"){var createdUnit=createShoppingUnitExplicit(a.unitName||a.entityName||a.settingValue);a.entityName=createdUnit;return actionSummary(a);}
    if(a.action==="create_shopping_list"){var title=String(a.listTitle||a.entityName||"").trim();if(!title)throw new Error("Titolo della lista non valido.");var existing=findUniqueByName(shoppingLists,title,"title"),listId=existing?existing.id:("list_"+Date.now()+"_"+Math.floor(Math.random()*9999));if(!existing){var lim=PLAN_LIMITS&&PLAN_LIMITS[currentPlan]?PLAN_LIMITS[currentPlan].shoppingLists:Infinity;if(lim!==Infinity&&(shoppingLists||[]).length+1>Number(lim))throw new Error(upgradeMessage?upgradeMessage("shoppingLists"):"Limite liste della spesa raggiunto.");setShoppingLists(function(p){return [...(p||[]),{id:listId,title:title,icon:a.listIcon||a.icon||"🧺",createdAt:new Date().toISOString()}];});}setActiveShoppingListId(String(listId));if((a.items||[]).length)addShoppingRecords(a.items,listId);return actionSummary(a);}
    if(a.action==="create_share_project"){var pn=String(a.projectName||a.entityName||"").trim();if(!pn)throw new Error("Nome del progetto Share non valido.");var project=createShareProject(pn,a.projectDescription||a.description||"",a.projectIcon||a.icon||"🤝",a.projectColor||a.color||"#4F8FF7");if(!project)throw new Error("Non è stato possibile creare il progetto Share.");return actionSummary(a);}
    if(a.action==="create_share_expense"){var shareAmount=Number(a.amount)||0;if(shareAmount<=0)throw new Error("Importo della spesa Share non valido.");var shareProject=resolveShareProject(a.projectName),participants=activeShareParticipants(shareProject);if(!participants.length)throw new Error("Il progetto Share non ha partecipanti attivi.");var payer=resolveShareParticipant(participants,a.paidByName,true)||participants[0];var split=buildShareSplits(shareAmount,participants,a.shareParticipants||[],a.splitMode);var shareToday=(shareProject.activities||[]).filter(function(x){return x&&x.kind!=="settlement"&&String(x.createdAt||"").slice(0,10)===todayStr();}).length;if(canAddPlanItem&&!canAddPlanItem("shareDailyExpenses",shareToday,1))throw new Error(upgradeMessage?upgradeMessage("shareDailyExpenses",shareToday):"Limite giornaliero Share raggiunto.");var activity={id:Date.now()+Math.random(),kind:"expense",amount:shareRound(shareAmount),desc:String(a.description||"Spesa condivisa").trim()||"Spesa condivisa",paidBy:String(payer.id),date:validISODate(a.date,false),time:new Date().toTimeString().slice(0,5),shares:split.shares,splitMode:split.mode,sharedWith:Object.keys(split.shares),createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};if(!updateShareProject)throw new Error("Aggiornamento del progetto Share non disponibile.");updateShareProject(shareProject.id,function(p){return{...p,activities:[activity].concat(p.activities||[])};});if(consumePlanFeature)consumePlanFeature("shareDailyExpenses",1);a.projectName=shareProject.name;return actionSummary(a);}
    if(a.action==="create_share_settlement"){var settlementAmount=Number(a.amount)||0;if(settlementAmount<=0)throw new Error("Importo del saldo Share non valido.");var settlementProject=resolveShareProject(a.projectName),settlementParticipants=activeShareParticipants(settlementProject);var fromP=resolveShareParticipant(settlementParticipants,a.fromParticipantName,true),toP=resolveShareParticipant(settlementParticipants,a.toParticipantName,false);if(!fromP||!toP)throw new Error("Indica chi paga e chi riceve il saldo Share.");if(String(fromP.id)===String(toP.id))throw new Error("Il saldo Share richiede due partecipanti diversi.");var settlement={id:Date.now()+Math.random(),kind:"settlement",amount:shareRound(settlementAmount),from:String(fromP.id),to:String(toP.id),date:validISODate(a.date,false),time:new Date().toTimeString().slice(0,5),desc:a.description||"Saldo tra partecipanti",createdAt:new Date().toISOString()};if(!updateShareProject)throw new Error("Aggiornamento del progetto Share non disponibile.");updateShareProject(settlementProject.id,function(p){return{...p,activities:[settlement].concat(p.activities||[])};});a.projectName=settlementProject.name;return actionSummary(a);}
    if(a.action==="create_expense_category"){var cn=String(a.entityName||a.categoryName||"").trim();if(!cn)throw new Error("Nome della categoria non valido.");if(findUniqueByName(cats,cn,"name"))throw new Error("La categoria esiste già.");var cg=findNamed(expenseGroups,a.categoryGroup,null)||(expenseGroups||[])[0],maxId=(cats||[]).reduce(function(m,x){var n=Number(x.id);return Number.isFinite(n)?Math.max(m,n):m;},0)+1;setCats(function(p){return [...(p||[]),{id:maxId,name:cn,icon:a.icon||"📌",group:cg?cg.id:"altro",color:a.color||"#7F77DD",archived:false}];});return actionSummary(a);}
    if(a.action==="create_payment_method"){var mn=String(a.entityName||a.methodName||"").trim();if(!mn)throw new Error("Nome del metodo non valido.");if(findUniqueByName(methods,mn,"name"))throw new Error("Il metodo esiste già.");var mg=findNamed(methodGroups,a.methodGroup,null)||(methodGroups||[])[0],maxM=(methods||[]).reduce(function(m,x){var n=Number(x.id);return Number.isFinite(n)?Math.max(m,n):m;},0)+1;setMethods(function(p){return [...(p||[]),{id:maxM,name:mn,icon:a.icon||"💳",group:mg?mg.id:"altro",color:a.color||"#378ADD",archived:false}];});return actionSummary(a);}
    if(a.action==="set_setting"){var sn=normalized(a.settingName),sv=String(a.settingValue||"").trim(),nv=normalized(sv),compact=sn.replace(/ /g,"");var truth=booleanValue(sv,true);
      if(["appearance","theme","modalita scura","aspetto"].indexOf(sn)>=0){setBgTheme(nv.indexOf("dark")>=0||nv.indexOf("scur")>=0?"dark":(nv.indexOf("slate")>=0?"slate":"default"));}
      else if(["button style","button_style","stile pulsanti"].indexOf(sn)>=0){setBtnStyle(["rounded","soft","square","sharp"].indexOf(nv)>=0?nv:(nv.indexOf("quadr")>=0?"square":"soft"));}
      else if(compact==="topbar"||sn.indexOf("barra superiore")>=0||sn.indexOf("riepilogo in alto")>=0||sn.indexOf("intestazione home")>=0){setShowAppSummaryHeader(truth);}
      else if(compact==="bottombaricons"||sn.indexOf("numero icone")>=0||sn.indexOf("icone barra inferiore")>=0){setMobileNavIconCount(Math.max(3,Math.min(7,Number(sv)||5)));}
      else if(compact==="homebalanceview"||sn.indexOf("saldo home")>=0||sn.indexOf("visualizzazione home")>=0){setHomeBalanceView(nv.indexOf("real")>=0?"reale":"rateizzato");}
      else if(compact==="statisticsview"||sn.indexOf("statistiche")>=0&&sn.indexOf("second")<0){setStatsView(nv.indexOf("real")>=0?"reale":"rateizzato");}
      else if(compact==="dateformat"||sn.indexOf("formato data")>=0){setDateFmt(nv.indexOf("mdy")>=0?"mdy":(nv.indexOf("ymd")>=0?"ymd":"dmy"));}
      else if(compact==="firstdayofweek"||sn.indexOf("primo giorno")>=0){setFirstDayOfWeek(nv.indexOf("sun")>=0||nv.indexOf("domen")>=0?"sun":"mon");}
      else if(compact==="defaultexpensecategory"||sn.indexOf("categoria predefinita")>=0){var dc=findNamed(cats,sv,null);if(!dc)throw new Error("Categoria predefinita non trovata.");setDefaultExpenseCat(String(dc.id));}
      else if(compact==="defaultpaymentmethod"||sn.indexOf("metodo predefinito")>=0){var dm=findNamed(methods,sv,null);if(!dm)throw new Error("Metodo predefinito non trovato.");setDefaultExpenseMethod(String(dm.id));}
      else if(compact==="defaultincometype"||sn.indexOf("tipo entrata predefinito")>=0){var di=findNamed(incomeTypes,sv,null);if(!di)throw new Error("Tipo di entrata predefinito non trovato.");setDefaultIncomeType(String(di.id));}
      else if(compact==="secondarycurrencyhistory"||sn.indexOf("seconda valuta storico")>=0){setShowSecInHistory(truth);}
      else if(compact==="secondarycurrencystatistics"||sn.indexOf("seconda valuta statistiche")>=0){setShowSecInStats(truth);}
      else if(compact==="secondarycurrencybudget"||sn.indexOf("seconda valuta budget")>=0){setShowSecInBudget(truth);}
      else if(compact==="secondarycurrencypatrimonio"||sn.indexOf("seconda valuta patrimonio")>=0){setShowSecInPatrimonio(truth);}
      else if(compact==="historyfuturemode"||sn.indexOf("movimenti futuri")>=0){setHistoryFutureMode(nv.indexOf("future")>=0||nv.indexOf("futur")>=0?"all":"untilToday");}
      else if(compact==="historysortdate"||sn.indexOf("ordinamento storico data")>=0){setHistorySortDate(nv.indexOf("creaz")>=0?"createdAt":"date");}
      else if(compact==="historysortdirection"||sn.indexOf("direzione storico")>=0){setHistorySortDirection(nv.indexOf("asc")>=0||nv.indexOf("crescent")>=0?"asc":"desc");}
      else if(compact==="historysecondarysort"||sn.indexOf("secondo ordinamento storico")>=0){setHistorySortSecondary(nv.indexOf("descr")>=0?"description":(nv.indexOf("categor")>=0?"category":"amount"));}
      else if(compact==="historysecondarydirection"||sn.indexOf("direzione secondo ordinamento")>=0){setHistorySortSecondaryDirection(nv.indexOf("asc")>=0||nv.indexOf("crescent")>=0?"asc":"desc");}
      else if(compact==="showshareinhistory"||sn.indexOf("share nello storico")>=0){setShowShareInHistory(truth);}
      else if(compact==="showdebtcreditsinpatrimonio"||sn.indexOf("debiti")>=0&&sn.indexOf("patrimonio")>=0){setShowDebtCreditsInPatrimonio(truth);}
      else if(compact==="showdebtcreditsinexpenses"||sn.indexOf("debiti")>=0&&(sn.indexOf("uscite")>=0||sn.indexOf("spese")>=0)){setShowDebtCreditsInExpenses(truth);}
      else if(compact==="shoppingproductsort"||sn.indexOf("ordinamento prodotti")>=0){setShoppingProductSort(nv.indexOf("alpha")>=0||nv.indexOf("alfabet")>=0?"alphabetical":"custom");}
      else if(compact==="shoppingunit"||compact==="shoppingmeasurementunit"||sn.indexOf("unita di misura")>=0){createShoppingUnitExplicit(sv);}
      else if(compact==="shoppingdefaultarea"||sn.indexOf("area predefinita spesa")>=0){setShoppingDefaultArea(resolveArea(sv));}
      else if(compact==="patrimoniomode"||sn.indexOf("modalita patrimonio")>=0){setPatrimonioMode(nv.indexOf("auto")>=0?"automatica":"manuale");}
      else if(compact==="aidataaccess"||sn.indexOf("accesso dati ai")>=0){setAiDataAccess(nv.indexOf("full")>=0||nv.indexOf("complet")>=0?"full":(nv.indexOf("area")>=0?"areas":"summary"));}
      else if(compact==="aifloatingbutton"||sn.indexOf("pulsante ai")>=0){setAiFloatingEnabled(truth);}
      else if(compact==="confirmbuttoncolor"||sn.indexOf("colore conferma")>=0){if(!/^#[0-9a-f]{6}$/i.test(sv))throw new Error("Usa un colore esadecimale, per esempio #378ADD.");setConfirmButtonColor(sv);}
      else if(compact==="secondarybuttoncolor"||sn.indexOf("colore secondario")>=0){if(!/^#[0-9a-f]{6}$/i.test(sv))throw new Error("Usa un colore esadecimale, per esempio #5FAFE5.");setSecondaryButtonColor(sv);}
      else throw new Error("Questa impostazione è sensibile o non è modificabile dall’assistente.");return actionSummary(a);}
    return "";
  }
  function openSection(a){var sec=normalized(a.section||"").replace(/ /g,"");var map:any={home:"home",expenses:"spese",expense:"spese",uscite:"spese",incomes:"spese",income:"spese",entrate:"spese",recurring:"spese",ricorrenti:"spese",history:"history",storico:"history",statistics:"stats",statistiche:"stats",budget:"budget",goals:"goals",obiettivi:"goals",alerts:"alerts",alert:"alerts",patrimonio:"patrimonio",assets:"patrimonio",debtcredits:"debtCredits",debiti:"debtCredits",crediti:"debtCredits",shopping:"shopping",spesa:"shopping",share:"share",appunti:"appunti",notes:"appunti",settings:"settings",impostazioni:"settings",ai:"consulenteAI",assistant:"voice"};var target=map[sec]||"home";if(target==="voice")return;setTab(target);setSettingsPage(null);setMobileMenu(false);if(target==="spese"){setSpeseSubTab(sec==="recurring"||sec==="ricorrenti"?"recurring":"add");setAddType(sec==="incomes"||sec==="income"||sec==="entrate"?"income":"expense");setAddSubTab("single");}if(target==="history")setHistoryTab("expenses");setVoiceModal(false);}
  function isYes(q){return /^(si|sì|ok|okay|confermo|conferma|vai|procedi|yes|confirm|dale|vale|oui|ja|sim|tak|da|ναι)\b/i.test(String(q||"").trim());}
  function isNo(q){return /^(no|annulla|annullo|cancel|cancelar|non|nein|não|nie|nu|όχι)\b/i.test(String(q||"").trim());}
  function confirmPending(userText){if(String(userText||"").trim())appendMessage("user",userText);try{pendingActions.forEach(function(a){executeAction(a);});updatePendingActions([]);var msg=assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"done");appendMessage("assistant",msg);speak(msg,true);}catch(e){var msg2=assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"error");appendMessage("assistant",msg2);speak(msg2,true);}}
  function cancelPending(userText){appendMessage("user",userText||V.cancel);updatePendingActions([]);var msg=assistantRuntimeText(lastAssistantUserLanguageRef.current||lang,"cancelled");appendMessage("assistant",msg);speak(msg,true);}
  async function callAssistant(q,providedResolution?:any){
    lastVoiceUserRequestRef.current=String(q||"");
    setBusy(true);setAiLoading(true);setVoiceError("");
    try{
      var token="";if(fbAuth.currentUser)token=await fbAuth.currentUser.getIdToken();
      var headers:any={"Content-Type":"application/json"};if(token)headers.Authorization="Bearer "+token;
      var ctrl=new AbortController();assistantRequestAbortRef.current=ctrl;var timer=setTimeout(function(){ctrl.abort();},70000);
      var assistantRequest=buildAssistantRequestPayload({question:q,languageResolution:providedResolution||undefined,languageState:assistantLanguageStateRef.current,fallbackLanguage:lastAssistantUserLanguageRef.current||String(lang||"it"),interfaceLanguage:lang||"it",aiDataAccess:aiDataAccess||"summary",financeContext:buildContext(),chatHistory:(aiChat||[]).filter(function(m){return m&&(m.role==="user"||m.role==="assistant");}).slice(-16).map(function(m){return{role:m.role,text:m.rawText||m.text};})});var assistantLang=assistantRequest.language;lastAssistantUserLanguageRef.current=assistantLang;if(assistantRequest.languageState)assistantLanguageStateRef.current=assistantRequest.languageState;var requestPayload:any=assistantRequest.payload;requestPayload.instruction=String(requestPayload.instruction||"")+" Shopping-list rule: when adding products, use only financeContext.catalogs.shoppingUnits. Never invent or create a measurement unit as a side effect of adding products; if the requested unit is unavailable, use the product’s configured unit or financeContext.defaults.shoppingUnit. Create a new measurement unit only when the user explicitly asks to create one.";var verifiedHelpAnswer=getFainanceHelpAnswer(q,assistantLang);if(verifiedHelpAnswer){appendMessage("assistant",verifiedHelpAnswer);speak(verifiedHelpAnswer,true);return;}
      var attachment=activeAttachmentRef.current;
      if(attachment){
        if(attachment.isImage){requestPayload.imageDataUrl=attachment.dataUrl;requestPayload.imageName=attachment.name||"allegato.jpg";}
        else{requestPayload.fileDataUrl=attachment.dataUrl;requestPayload.fileName=attachment.name||"documento";requestPayload.fileMimeType=attachment.mimeType||"application/octet-stream";}
        requestPayload.question="[TURN_LANGUAGE="+assistantLang+"] The following user request also refers to the attached file, which must be read directly. User request: "+q;
      }
      var res=await authenticatedAiFetch(AI_AGENT_ENDPOINT,{method:"POST",headers:headers,signal:ctrl.signal,body:JSON.stringify(requestPayload)}).finally(function(){clearTimeout(timer);if(assistantRequestAbortRef.current===ctrl)assistantRequestAbortRef.current=null;});
      var data:any=null;try{data=await res.json();}catch(e){}
      if(!res.ok){var assistantHttpError:any=new Error((data&&data.error)||("Il servizio AI ha restituito l’errore "+res.status+"."));assistantHttpError.httpStatus=res.status;throw assistantHttpError;}
      var answer=String((data&&data.answer)||"").trim()||assistantRuntimeText(assistantLang,"noAnswer");
      if(assistantAnswerNeedsTranslation(answer,assistantLang)){try{var translateResponse=await authenticatedAiFetch(AI_AGENT_ENDPOINT,{method:"POST",headers:headers,body:JSON.stringify(buildAssistantTranslationPayload(answer,assistantLang))});var translateData:any=await translateResponse.json();var corrected=String((translateData&&translateData.answer)||"").trim();if(corrected)answer=corrected;}catch(e){}}answer=compactAssistantAnswer(answer,assistantLang,1400);
      var actions=realtimeActionsFrom(data&&data.actions).filter(function(a){return a&&a.action&&a.action!=="none";}),openActions=actions.filter(function(a){return a.action==="open_section";}),writeActions=actions.filter(function(a){return a.action!=="open_section";});
      if(writeActions.length){updatePendingActions(writeActions);return;}
      appendMessage("assistant",answer);
      if(openActions.length){setToast({text:answer,type:"success",icon:"✨"});openSection(openActions[0]);return;}
      speak(answer,true);
    }catch(e){
      if(e&&e.name==="AbortError"&&!mountedRef.current)return;
      var msg=realtimeFailureMessage(e,"assistant",Number((e&&e.httpStatus)||0));setVoiceError(msg);appendMessage("assistant",msg);
    }finally{if(mountedRef.current){setBusy(false);setAiLoading(false);}}
  }
  function sendMessage(forced){var q=String(forced!==undefined?forced:input||"").trim();if(!q||busy||aiLoading)return;setInput("");stopListening(false);if(pendingActions.length&&isYes(q)){confirmPending(q);return;}if(pendingActions.length&&isNo(q)){cancelPending(q);return;}var turnResolution:any=resolveVoiceAssistantTurn(q);var languageControlReply=assistantLanguageControlReply(turnResolution);var localHelpAnswer=getFainanceHelpAnswer(q,turnResolution.language);if(localHelpAnswer){appendMessage("user",q);appendMessage("assistant",localHelpAnswer);speak(localHelpAnswer,true);return;}if(realtimeStatus==="connected"){appendMessage("user",q);if(!languageControlReply&&consumePlanFeature)consumePlanFeature("aiReply",1);if(!sendRealtimeText(q,turnResolution))setVoiceError(assistantRuntimeText(turnResolution.language,"notReady"));return;}if(languageControlReply){appendMessage("user",q);appendMessage("assistant",languageControlReply);speak(languageControlReply,true);return;}if(!aiExternalConsent){setVoiceError(V.consentTitle);return;}function run(){appendMessage("user",q);if(consumePlanFeature)consumePlanFeature("aiReply",1);callAssistant(q,turnResolution);}if(activeAttachmentRef.current){if(handleRewardedFeature){handleRewardedFeature("aiReply",1,run);return;}if(canUsePlanFeature&&!canUsePlanFeature("aiReply",1)){setToast({text:upgradeMessage?upgradeMessage("aiReply"):"Limite AI raggiunto",type:"warning",color:"#EF9F27",icon:"⚠️"});return;}run();return;}if(handleRewardedFeature){handleRewardedFeature("aiReply",1,run);return;}if(canUsePlanFeature&&!canUsePlanFeature("aiReply",1)){setToast({text:upgradeMessage?upgradeMessage("aiReply"):"Limite AI raggiunto",type:"warning",color:"#EF9F27",icon:"⚠️"});return;}run();}
  useEffect(function () {
    mountedRef.current = true;
    return function () {
      mountedRef.current = false;
      clearVoiceErrorTimer();
      try {
        if (assistantRequestAbortRef.current)
          assistantRequestAbortRef.current.abort();
      } catch (e) {}
      stopListening(false);
      stopSpeaking();
      disconnectRealtime();
      try {
        var p = nativeSpeechRef.current;
        if (p && p.removeAllListeners) p.removeAllListeners();
      } catch (e) {}
    };
  }, []);
  useEffect(
    function () {
      pendingActionsRef.current = pendingActions;
    },
    [pendingActions]
  );
  useEffect(function () {
    function onSystemVolume(event: any) {
      var detail = (event && event.detail) || {};
      var current = Number(detail.current),
        maximum = Math.max(1, Number(detail.max) || 1),
        ratio = Number(detail.ratio);
      if (!Number.isFinite(ratio))
        ratio = Number.isFinite(current) ? current / maximum : 1;
      applyAssistantSystemVolume(ratio, detail.muted === true || current <= 0);
    }
    try {
      window.addEventListener(
        "fainance-assistant-system-volume",
        onSystemVolume as any
      );
    } catch (e) {}
    return function () {
      try {
        window.removeEventListener(
          "fainance-assistant-system-volume",
          onSystemVolume as any
        );
      } catch (e) {}
    };
  }, []);
  useEffect(
    function () {
      if (realtimeAutoStartAttemptedRef.current || !aiExternalConsent) return;
      var requested =
        embeddedView && (currentPlan === "base" || currentPlan === "premium");
      try {
        requested =
          requested ||
          localStorage.getItem("fainance_voice_realtime_autostart_once") ===
            "1";
      } catch (e) {}
      if (!requested) return;
      realtimeAutoStartAttemptedRef.current = true;
      try {
        localStorage.removeItem("fainance_voice_realtime_autostart_once");
      } catch (e) {}
      var timer = setTimeout(function () {
        if (mountedRef.current) connectRealtime();
      }, 60);
      return function () {
        clearTimeout(timer);
      };
    },
    [aiExternalConsent]
  );
  useEffect(
    function () {
      if (receiptAutoOpenAttemptedRef.current || !aiExternalConsent) return;
      var requested = "";
      try {
        requested = String(
          localStorage.getItem("fainance_voice_assistant_receipt_once") || ""
        );
      } catch (e) {}
      if (!requested) return;
      receiptAutoOpenAttemptedRef.current = true;
      try {
        localStorage.removeItem("fainance_voice_assistant_receipt_once");
      } catch (e) {}
      var timer = setTimeout(function () {
        if (!mountedRef.current) return;
        if (requested === "gallery") chooseFinancePhoto();
        else takeFinancePhoto();
      }, 140);
      return function () {
        clearTimeout(timer);
      };
    },
    [aiExternalConsent]
  );
  useEffect(
    function () {
      try {
        if (endRef.current)
          endRef.current.scrollIntoView({ behavior: "smooth", block: "end" });
      } catch (e) {}
    },
    [aiChat, busy, pendingActions.length]
  );
  function close() {
    clearVoiceErrorTimer();
    try {
      if (assistantRequestAbortRef.current)
        assistantRequestAbortRef.current.abort();
    } catch (e) {}
    activeAttachmentRef.current = null;
    stopListening(false);
    stopSpeaking();
    disconnectRealtime();
    setVoiceModal(false);
    if (embeddedView && setAiTab) setAiTab("consigli");
    setVoiceError("");
  }
  var messages = (aiChat || []).slice(-40);
  var statusTitle =
    realtimeStatus === "connecting"
      ? RT.connectingTitle
      : realtimeStatus === "connected"
      ? voiceListening
        ? RT.listeningTitle
        : speaking
        ? RT.speakingTitle
        : RT.readyTitle
      : RT.inactiveTitle;
  var statusSub =
    realtimeStatus === "connecting"
      ? RT.connectingSub
      : realtimeStatus === "connected"
      ? voiceListening
        ? RT.listeningSub
        : speaking
        ? RT.speakingSub
        : RT.readySub
      : RT.inactiveSub;
  var statusAccent =
    realtimeStatus === "connecting"
      ? "#378ADD"
      : realtimeStatus === "connected"
      ? voiceListening
        ? "#EF9F27"
        : "#1D9E75"
      : "#7F77DD";
  return (
    <div
      style={{
        position: embeddedView ? "relative" : "fixed",
        top: embeddedView
          ? "auto"
          : isMobile
          ? "max(84px,calc(env(safe-area-inset-top,0px) + 72px))"
          : 0,
        right: embeddedView ? "auto" : 0,
        bottom: embeddedView ? "auto" : 0,
        left: embeddedView ? "auto" : 0,
        zIndex: embeddedView ? "auto" : 1000,
        background: embeddedView ? "transparent" : "rgba(0,0,0,.62)",
        display: "flex",
        alignItems: embeddedView ? "stretch" : isMobile ? "stretch" : "center",
        justifyContent: "center",
        padding: embeddedView
          ? 0
          : isMobile
          ? "0 0 max(env(safe-area-inset-bottom, 0px), 8px)"
          : 18,
        boxSizing: "border-box",
        width: "100%",
        flex: embeddedView ? 1 : undefined,
        minHeight: embeddedView ? 0 : undefined,
      }}
      onClick={embeddedView ? undefined : close}
    >
      <div
        onClick={function (e) {
          e.stopPropagation();
        }}
        style={{
          width: "100%",
          maxWidth: embeddedView ? "100%" : 760,
          height: embeddedView
            ? "100%"
            : isMobile
            ? "auto"
            : "min(820px,94vh)",
          flex: embeddedView || isMobile ? 1 : undefined,
          minHeight: 0,
          background: dark ? "#171724" : "#F8F9FF",
          border: embeddedView ? "1px solid " + borderC : isMobile ? "none" : "1px solid " + borderC,
          borderRadius: embeddedView ? 22 : isMobile ? 0 : 24,
          boxShadow: embeddedView ? (dark ? "none" : "0 10px 28px rgba(15,23,42,.08)") : "0 22px 70px rgba(0,0,0,.38)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {!embeddedView && (
        <div
          style={{
            padding: isMobile ? "10px 10px" : "10px 14px",
            background: dark
              ? "#202033"
              : "linear-gradient(135deg,#F0EDFF,#EAF5FF)",
            borderBottom: "1px solid " + borderC,
            display: "flex",
            alignItems: "center",
            gap: isMobile ? 8 : 10,
            minHeight: isMobile ? 60 : 68,
            boxSizing: "border-box",
          }}
        >
          <AIGrilloIcon size={isMobile ? 34 : 40} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: isMobile ? 15 : 17,
                fontWeight: 950,
                color: textC,
                lineHeight: 1.12,
              }}
            >
              {V.title}
            </div>
            {!isMobile && (
              <div
                style={{
                  fontSize: 11,
                  color: subC,
                  marginTop: 2,
                  lineHeight: 1.25,
                }}
              >
                {V.sub}
              </div>
            )}
          </div>
          {!embeddedView && (
            <button
              onClick={onQuick}
              style={{
                border: "1px solid " + borderC,
                background: dark ? "#2A2A3E" : "#fff",
                color: textC,
                borderRadius: 9,
                padding: isMobile ? "7px 8px" : "8px 10px",
                fontSize: isMobile ? 10 : 11,
                fontWeight: 850,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              ⚡ {isMobile ? "Rapido" : V.quick}
            </button>
          )}
          <PopupCloseButton onClick={close} dark={dark} label={L("Chiudi")} />
        </div>
        )}
        {!aiExternalConsent ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
            }}
          >
            <div
              style={{
                maxWidth: 560,
                background: cardBg,
                border: "1px solid " + borderC,
                borderRadius: 18,
                padding: 20,
              }}
            >
              <div
                style={{
                  fontSize: 17,
                  fontWeight: 950,
                  color: textC,
                  marginBottom: 8,
                }}
              >
                {V.consentTitle}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: subC,
                  lineHeight: 1.55,
                  marginBottom: 16,
                }}
              >
                {V.consentText}
              </div>
              <button
                onClick={function () {
                  setAiExternalConsent(true, new Date().toISOString());
                  setVoiceError("");
                }}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: btnRadius,
                  padding: "12px 14px",
                  background:
                    "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                {V.accept}
              </button>
            </div>
          </div>
        ) : (
          <>
            {!embeddedView && (
            <div
              style={{
                margin: "12px 14px 8px",
                padding: "13px 14px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                border: "2px solid " + statusAccent,
                borderRadius: 15,
                background:
                  realtimeStatus === "connecting"
                    ? dark
                      ? "#17263A"
                      : "#EDF6FF"
                    : realtimeStatus === "connected"
                    ? dark
                      ? "#153229"
                      : "#ECFFF7"
                    : dark
                    ? "#28233B"
                    : "#F3F0FF",
                boxShadow: "0 7px 20px " + statusAccent + "26",
              }}
            >
              <span
                style={{
                  width: 13,
                  height: 13,
                  borderRadius: "50%",
                  background: statusAccent,
                  boxShadow: "0 0 0 6px " + statusAccent + "22",
                  flexShrink: 0,
                  animation:
                    realtimeStatus === "connecting"
                      ? "pulse 1.2s infinite"
                      : "none",
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 950,
                    color: textC,
                    lineHeight: 1.25,
                  }}
                >
                  {statusTitle}
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: subC,
                    lineHeight: 1.4,
                    marginTop: 3,
                    fontWeight: realtimeStatus === "connecting" ? 750 : 500,
                  }}
                >
                  {statusSub}
                </div>
              </div>
              {realtimeStatus !== "connected" &&
                realtimeStatus !== "connecting" && (
                  <button
                    onClick={connectRealtime}
                    style={{
                      border: "none",
                      background:
                        "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                      color: "#fff",
                      borderRadius: 10,
                      padding: "9px 12px",
                      fontSize: 12,
                      fontWeight: 900,
                      cursor: "pointer",
                    }}
                  >
                    <span
                      style={{
                        display: "inline-flex",
                        verticalAlign: "middle",
                        marginRight: 5,
                      }}
                    >
                      <FinanceMicIcon size={17} />
                    </span>
                    Avvia
                  </button>
                )}
            </div>
            )}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 10,
                WebkitOverflowScrolling: "touch",
              }}
            >
              {messages.length === 0 &&
                !realtimeAssistantDraft &&
                !(busy || aiLoading) &&
                pendingActions.length === 0 && (
                  <div
                    style={{
                      flex: 1,
                      minHeight: isMobile ? 250 : 300,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      textAlign: "center",
                      padding: "30px 22px",
                      boxSizing: "border-box",
                      color: subC,
                    }}
                  >
                    <AIGrilloIcon size={isMobile ? 84 : 96} />
                    <div
                      style={{
                        maxWidth: 520,
                        marginTop: 18,
                        fontSize: 13,
                        lineHeight: 1.6,
                      }}
                    >
                      {V.empty}
                    </div>
                  </div>
                )}
              {messages.map(function (m) {
                var mine = m.role === "user";
                return (
                  <div
                    key={m.id}
                    style={{
                      alignSelf: mine ? "flex-end" : "flex-start",
                      maxWidth: "86%",
                      background: mine
                        ? dark
                          ? "rgba(127,119,221,.24)"
                          : "#ECE9FF"
                        : cardBg,
                      color: mine ? (dark ? "#E7E2FF" : "#514B8F") : textC,
                      border: mine
                        ? "1px solid " +
                          (dark ? "rgba(151,142,235,.38)" : "#D8D2FF")
                        : "1px solid " + borderC,
                      borderRadius: 16,
                      padding: "10px 12px",
                      fontSize: 13,
                      lineHeight: 1.48,
                      whiteSpace: "pre-line",
                      boxShadow: mine
                        ? "none"
                        : dark
                        ? "none"
                        : "0 3px 12px rgba(0,0,0,.05)",
                    }}
                  >
                    {mine ? String(m.text || "") : assistantDisplayText(m.text)}
                  </div>
                );
              })}{" "}
              {realtimeAssistantDraft && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    maxWidth: "86%",
                    background: cardBg,
                    color: textC,
                    border: "1px solid " + borderC,
                    borderRadius: 16,
                    padding: "10px 12px",
                    fontSize: 13,
                    lineHeight: 1.48,
                  }}
                >
                  {assistantDisplayText(realtimeAssistantDraft)}
                </div>
              )}
              {(busy || aiLoading) && !realtimeAssistantDraft && (
                <div
                  style={{
                    alignSelf: "flex-start",
                    background: cardBg,
                    color: subC,
                    border: "1px solid " + borderC,
                    borderRadius: 16,
                    padding: "10px 12px",
                    fontSize: 13,
                  }}
                >
                  {documentLoading ? RT.documentReading : V.thinking}
                </div>
              )}
              {pendingActions.length > 0 && (
                <div
                  style={{
                    background: dark
                      ? "linear-gradient(135deg,#28233B,#222235)"
                      : "linear-gradient(135deg,#F4FFF9,#F7F6FF)",
                    border: "2px solid " + (dark ? "#4E9E82" : "#79C9AA"),
                    borderRadius: 18,
                    padding: 16,
                    boxShadow: dark
                      ? "none"
                      : "0 8px 24px rgba(29,158,117,.12)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 9,
                      marginBottom: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "#1D9E75",
                        color: "#fff",
                        fontWeight: 950,
                      }}
                    >
                      ✓
                    </span>
                    <div
                      style={{ fontSize: 15, fontWeight: 950, color: textC }}
                    >
                      {V.confirm}
                    </div>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 7 }}
                  >
                    {pendingActions.map(function (a, idx) {
                      return (
                        <div
                          key={idx}
                          style={{
                            fontSize: 13,
                            color: textC,
                            lineHeight: 1.4,
                            background: dark
                              ? "rgba(255,255,255,.04)"
                              : "rgba(255,255,255,.8)",
                            border: "1px solid " + borderC,
                            borderRadius: 11,
                            padding: "9px 10px",
                            whiteSpace: "pre-line",
                          }}
                        >
                          {actionSummary(a)}
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    <button
                      onClick={function () {
                        confirmPending("");
                      }}
                      style={{
                        flex: 1,
                        border: "none",
                        borderRadius: 11,
                        padding: "12px",
                        background: "#1D9E75",
                        color: "#fff",
                        fontWeight: 950,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      ✓ {V.execute || "Esegui"}
                    </button>
                    <button
                      onClick={function () {
                        cancelPending("");
                      }}
                      style={{
                        flex: 0.72,
                        border: "1px solid " + borderC,
                        borderRadius: 11,
                        padding: "12px",
                        background: cardBg,
                        color: textC,
                        fontWeight: 900,
                        cursor: "pointer",
                        fontSize: 13,
                      }}
                    >
                      {V.cancel}
                    </button>
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>
            {voiceError && (
              <div
                style={{
                  margin: "0 14px 10px",
                  background: dark ? "#3A1F25" : "#FFF0F0",
                  border: "1px solid #E24B4A55",
                  borderRadius: 12,
                  padding: "10px 12px",
                  fontSize: 12,
                  color: "#E24B4A",
                  lineHeight: 1.45,
                  fontWeight: 700,
                }}
              >
                ⚠️ {voiceError}
              </div>
            )}
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={onFinanceFileSelected}
              style={{ display: "none" }}
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*"
              onChange={onFinanceFileSelected}
              style={{ display: "none" }}
            />
            <input
              ref={documentInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.rtf,.txt,.csv,.xls,.xlsx,.json,.xml,.ods,.odt,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv,text/plain"
              onChange={onFinanceDocumentSelected}
              style={{ display: "none" }}
            />
            {attachmentMenuOpen && (
              <div
                style={{
                  position: "absolute",
                  left: 54,
                  bottom: 58,
                  zIndex: 40,
                  minWidth: 205,
                  background: dark ? "#27273A" : "#fff",
                  border: "1px solid " + borderC,
                  borderRadius: 14,
                  boxShadow: "0 14px 35px rgba(0,0,0,.24)",
                  padding: 7,
                }}
              >
                <button
                  type="button"
                  onClick={function () {
                    setAttachmentMenuOpen(false);
                    setAiTab("consigli");
                    setVoiceModal(false);
                  }}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: textC,
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  📌 {L("Consigli")}
                </button>
                <button
                  type="button"
                  onClick={function () {
                    var confirmed =
                      typeof window === "undefined" ||
                      !window.confirm ||
                      window.confirm(assistantChatMenuText(lang || "it").confirm);
                    if (!confirmed) return;
                    setAiChat([]);
                    setAttachmentMenuOpen(false);
                    setToast({
                      text: assistantChatMenuText(lang || "it").cleared,
                      type: "success",
                      color: "#1D9E75",
                      icon: "🗑️",
                    });
                  }}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: textC,
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  🗑️ {assistantChatMenuText(lang || "it").clear}
                </button>
                <div style={{ height: 1, background: borderC, margin: "4px 6px" }} />
                <button
                  onClick={takeFinancePhoto}
                  disabled={documentLoading || busy}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: textC,
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  📷 {L("Scatta foto")}
                </button>
                <button
                  onClick={chooseFinancePhoto}
                  disabled={documentLoading || busy}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: textC,
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  🖼️ {L("Carica foto")}
                </button>
                <button
                  onClick={chooseFinanceDocument}
                  disabled={documentLoading || busy}
                  style={{
                    width: "100%",
                    border: "none",
                    background: "transparent",
                    color: textC,
                    textAlign: "left",
                    padding: "10px 12px",
                    borderRadius: 10,
                    fontWeight: 850,
                    cursor: "pointer",
                  }}
                >
                  📄 {L("Carica documento")}
                </button>
              </div>
            )}
            <div
              style={{
                padding: "5px 8px 7px",
                background: dark ? "#202033" : "#fff",
                display: "grid",
                gridTemplateColumns: "auto auto minmax(0,1fr) auto",
                gap: 6,
                alignItems: "center",
                borderTop: "1px solid " + borderC,
                position: "sticky",
                bottom: 0,
                zIndex: 35,
                flexShrink: 0,
              }}
            >
              <button
                onClick={
                  realtimeStatus === "connected"
                    ? toggleRealtimeMicrophone
                    : realtimeStatus === "legacy"
                    ? function () {
                        if (voiceListening) stopListening(true);
                        else startListening();
                      }
                    : connectRealtime
                }
                disabled={realtimeStatus === "connecting"}
                title={
                  realtimeStatus === "connected"
                    ? realtimeMicEnabled
                      ? "Disattiva microfono"
                      : "Attiva microfono"
                    : realtimeStatus === "legacy"
                    ? voiceListening
                      ? V.stop
                      : V.speak
                    : "Avvia conversazione"
                }
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "none",
                  background:
                    realtimeStatus === "connected"
                      ? realtimeMicEnabled
                        ? voiceListening
                          ? "#EF9F27"
                          : "#1D9E75"
                        : "#777"
                      : realtimeStatus === "legacy"
                      ? voiceListening
                        ? "#EF9F27"
                        : "#1D9E75"
                      : realtimeStatus === "connecting"
                      ? "#A8A8A8"
                      : "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
                  color: "#fff",
                  fontSize: 20,
                  fontWeight: 900,
                  cursor: realtimeStatus === "connecting" ? "wait" : "pointer",
                  boxShadow: "0 5px 16px rgba(127,119,221,.3)",
                }}
              >
                <FinanceMicIcon
                  size={23}
                  muted={realtimeStatus === "connected" && !realtimeMicEnabled}
                  active={
                    (realtimeStatus === "connected" &&
                      realtimeMicEnabled &&
                      voiceListening) ||
                    (realtimeStatus === "legacy" && voiceListening)
                  }
                />
              </button>
              <button
                type="button"
                onClick={function () {
                  setAttachmentMenuOpen(function (v) {
                    return !v;
                  });
                }}
                disabled={documentLoading || busy}
                aria-label={L("Azioni")}
                title={L("Azioni")}
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  border: "1px solid " + borderC,
                  background: dark ? "#2A2A3E" : "#F5F6FB",
                  color: textC,
                  fontSize: 22,
                  fontWeight: 800,
                  lineHeight: 1,
                  cursor: documentLoading || busy ? "wait" : "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ↑
              </button>
              <textarea
                value={input}
                onChange={function (e) {
                  setInput(e.target.value);
                }}
                onKeyDown={function (e) {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={readyPlaceholder}
                style={{
                  ...sinp,
                  height: 38,
                  minHeight: 38,
                  maxHeight: 72,
                  padding: "7px 9px",
                  fontSize: 13,
                  lineHeight: "22px",
                  resize: "none",
                  overflowY: "auto",
                  boxSizing: "border-box",
                }}
              />
              <button
                onClick={function () {
                  sendMessage();
                }}
                disabled={
                  !input.trim() ||
                  busy ||
                  aiLoading ||
                  realtimeStatus === "connecting"
                }
                style={{
                  height: 38,
                  border: "none",
                  borderRadius: 10,
                  padding: "0 12px",
                  background: input.trim() && !busy ? "#7F77DD" : "#A8A8A8",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: input.trim() && !busy ? "pointer" : "not-allowed",
                }}
              >
                {V.send}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function QuickVoiceEntryModal() {
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c: any = useApp();
  var {
    lang,
    cats,
    setCats,
    methods,
    setMethods,
    methodGroups,
    setMethodGroups,
    expenseGroups,
  }: any = _c;
  var {
    setExpenseGroups,
    incomeGroups,
    setIncomeGroups,
    incomeTypes,
    customIncomeTypes,
    setCustomIncomeTypes,
    incomeTypeOverrides,
    setIncomeTypeOverrides,
  }: any = _c;
  var {
    recurring,
    setRecurring,
    goals,
    setGoals,
    alerts,
    setAlerts,
    expenses,
    setExpenses,
  }: any = _c;
  var {
    incomes,
    setIncomes,
    sym,
    fmt,
    dark,
    dateFmt,
    curMonthKey,
    addExpenses,
  }: any = _c;
  var {
    addIncomes,
    confirmRecurring,
    catOrder,
    setCatOrder,
    methodOrder,
    setMethodOrder,
    catSortMode,
    setCatSortMode,
  }: any = _c;
  var {
    methodSortMode,
    setMethodSortMode,
    budgetPlan,
    setBudgetPlan,
    btnRadius,
    expenseColor,
    incomeColor,
    isMobile,
  }: any = _c;
  var {
    patrimonioAreas,
    setPatrimonioAreas,
    patrimonioEntries,
    setPatrimonioEntries,
    patrimonioValues,
    setPatrimonioValues,
    patrimonioMode,
    setPatrimonioMode,
  }: any = _c;
  var {
    patrimonioHistory,
    setPatrimonioHistory,
    patrimonioNotes,
    setPatrimonioNotes,
    historyFutureMode,
    setHistoryFutureMode,
    historySortDate,
    setHistorySortDate,
  }: any = _c;
  var {
    historySortDirection,
    setHistorySortDirection,
    appuntiDocuments,
    setAppuntiDocuments,
    appuntiNotes,
    setAppuntiNotes,
    bankCoords,
    setBankCoords,
  }: any = _c;
  var {
    notifPrefs,
    setNotifPrefs,
    customNotifs,
    setCustomNotifs,
    aiDismissed,
    setAiDismissed,
    aiChat,
    setAiChat,
  }: any = _c;
  var {
    aiDataAccess,
    setAiDataAccess,
    aiFloatingEnabled,
    setAiFloatingEnabled,
    secondaryCurrency,
    secRate,
    fmtSec,
    secSym,
  }: any = _c;
  var {
    secRateLoading,
    currency,
    showSecInHistory,
    setShowSecInHistory,
    showSecInStats,
    setShowSecInStats,
    showSecInBudget,
    setShowSecInBudget,
  }: any = _c;
  var {
    showSecInPatrimonio,
    setShowSecInPatrimonio,
    textC,
    subC,
    borderC,
    cardBg,
    inp,
    sb,
  }: any = _c;
  var {
    bgColor,
    tab,
    setTab,
    settingsPage,
    setSettingsPage,
    speseSubTab,
    setSpeseSubTab,
    addType,
  }: any = _c;
  var {
    setAddType,
    addSubTab,
    setAddSubTab,
    historyTab,
    setHistoryTab,
    editingItem,
    setEditingItem,
    mobileMenu,
  }: any = _c;
  var {
    setMobileMenu,
    toast,
    setToast,
    alertPopup,
    setAlertPopup,
    statsView,
    setStatsView,
    curYear,
  }: any = _c;
  var {
    yearExp,
    yearInc,
    monthlyTotals,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filterYear,
  }: any = _c;
  var {
    setFilterYear,
    filterMonth,
    setFilterMonth,
    filterMonths,
    setFilterMonths,
    filterCat,
    setFilterCat,
    filterCats,
  }: any = _c;
  var {
    setFilterCats,
    filterCatExclude,
    setFilterCatExclude,
    filterGroup,
    setFilterGroup,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
  }: any = _c;
  var {
    setFilterDateTo,
    filterAmtMin,
    setFilterAmtMin,
    filterAmtMax,
    setFilterAmtMax,
    filteredExpenses,
    filteredIncomes,
    shareProjects,
  }: any = _c;
  var {
    setShareProjects,
    shareSelectedProjectId,
    setShareSelectedProjectId,
    shareProjectTab,
    setShareProjectTab,
    shareReceivedInvites,
    shareInviteLoading,
    showShareInHistory,
  }: any = _c;
  var {
    setShowShareInHistory,
    confirmButtonColor,
    setConfirmButtonColor,
    secondaryButtonColor,
    firestoreReady,
    userKey,
    userId,
    currentUser,
    pendingCount,
  }: any = _c;
  var {
    alertTriggered,
    getCat,
    getMethod,
    getIT,
    curMonthExp,
    curMonthInc,
    last12Balance,
    aiTab,
  }: any = _c;
  var {
    setAiTab,
    aiLoading,
    setAiLoading,
    aiAdviceFilter,
    setAiAdviceFilter,
    voiceModal,
    setVoiceModal,
    voiceListening,
  }: any = _c;
  var {
    setVoiceListening,
    voiceText,
    setVoiceText,
    voiceError,
    setVoiceError,
    voiceConfirm,
    setVoiceConfirm,
    voiceSaving,
  }: any = _c;
  var {
    setVoiceSaving,
    voiceParsed,
    setVoiceParsed,
    defaultExpenseCat,
    setDefaultExpenseCat,
    defaultExpenseMethod,
    setDefaultExpenseMethod,
    defaultExpenseArea,
  }: any = _c;
  var {
    setDefaultExpenseArea,
    defaultIncomeType,
    setDefaultIncomeType,
    defaultIncomeArea,
    setDefaultIncomeArea,
    defaultMethodArea,
    setDefaultMethodArea,
    incomeTypeOrder,
  }: any = _c;
  var {
    setIncomeTypeOrder,
    deleteConfirmId,
    setDeleteConfirmId,
    mergeFrom,
    setMergeFrom,
    mergeTo,
    setMergeTo,
    homeBalanceView,
  }: any = _c;
  var {
    setHomeBalanceView,
    firstDayOfWeek,
    setFirstDayOfWeek,
    aiFloatingPos,
    setAiFloatingPos,
    aiFloatingDrag,
    setAiFloatingDrag,
    widgetBgColor,
  }: any = _c;
  var {
    setWidgetBgColor,
    widgetBgAlpha,
    setWidgetBgAlpha,
    widgetExpenseColor,
    setWidgetExpenseColor,
    widgetIncomeColor,
    setWidgetIncomeColor,
    widgetTitle,
  }: any = _c;
  var {
    setWidgetTitle,
    widgetSubtitle,
    setWidgetSubtitle,
    widgetExpenseLabel,
    setWidgetExpenseLabel,
    widgetIncomeLabel,
    setWidgetIncomeLabel,
    widgetShowHeader,
  }: any = _c;
  var {
    setWidgetShowHeader,
    widgetButtonStyle,
    setWidgetButtonStyle,
    widgetVoiceEnabled,
    setWidgetVoiceEnabled,
    widget2Enabled,
    setWidget2Enabled,
    widget2Type,
  }: any = _c;
  var {
    setWidget2Type,
    widget2TitleColor,
    setWidget2TitleColor,
    widget2BodyColor,
    setWidget2BodyColor,
    widget2AccentColor,
    setWidget2AccentColor,
    widget2BgAlpha,
  }: any = _c;
  var {
    setWidget2BgAlpha,
    widget2TextSize,
    setWidget2TextSize,
    widget2MaxChars,
    setWidget2MaxChars,
    widget2AutoUpdate,
    setWidget2AutoUpdate,
    widget2SelectedNoteId,
  }: any = _c;
  var {
    setWidget2SelectedNoteId,
    widget2SelectedBankId,
    setWidget2SelectedBankId,
    widget3Enabled,
    setWidget3Enabled,
    widget3TextColor,
    setWidget3TextColor,
    widget3AccentColor,
  }: any = _c;
  var {
    setWidget3AccentColor,
    widget3PercentColor,
    setWidget3PercentColor,
    widget3BgAlpha,
    setWidget3BgAlpha,
    widget3ShowPercent,
    setWidget3ShowPercent,
    widget3ShowAmounts,
  }: any = _c;
  var {
    setWidget3ShowAmounts,
    widget3AutoUpdate,
    setWidget3AutoUpdate,
    widget3SelectedGoalId,
    setWidget3SelectedGoalId,
    bgTheme,
    setBgTheme,
    btnStyle,
  }: any = _c;
  var {
    setBtnStyle,
    shownAlertIds,
    setShownAlertIds,
    settingsValuesTab,
    setSettingsValuesTab,
  }: any = _c;
  var {
    normalizeEmail,
    loadShareCollaboration,
    acceptShareInvite,
    declineShareInvite,
    createShareInvite,
    createShareProject,
    updateShareProject,
    deleteShareProject,
    canAddPlanItem,
  }: any = _c;
  // ─────────────────────────────────────────────────────────────────────────
  var now = new Date();
  var sinp: any = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid " + (dark ? "#444" : "#ddd"),
    padding: "8px 10px",
    fontSize: 14,
    background: dark ? "#2a2a3e" : "#fff",
    color: dark ? "#eee" : "#333",
    boxSizing: "border-box",
  };

  function getDefaultVoiceExpenseCategory() {
    return (
      cats.find(function (c) {
        return String(c.id) === String(defaultExpenseCat);
      }) ||
      cats.find(function (c) {
        return normalizeVoiceText(c.name) === "spesa";
      }) ||
      cats[0]
    );
  }
  function getDefaultVoiceExpenseMethod() {
    var active = methods.filter(function (x) {
      return !x.archived;
    });
    return (
      active.find(function (m) {
        return String(m.id) === String(defaultExpenseMethod);
      }) ||
      active[0] ||
      methods[0]
    );
  }
  function categoryBySemanticVoice(n) {
    function pickCat(names, group) {
      var best = null;
      (cats || []).forEach(function (c) {
        var cn = normalizeVoiceText(c.name || "");
        var cg = normalizeVoiceText(c.group || "");
        names.forEach(function (name) {
          var nn = normalizeVoiceText(name);
          if (cn === nn || cn.indexOf(nn) >= 0 || nn.indexOf(cn) >= 0) {
            if (!best || cg === normalizeVoiceText(group || "")) best = c;
          }
        });
      });
      return best;
    }
    if (
      /\b(farmacia|farmacie|pharmacy|pharmacie|apotheke|apteka|farmaco|farmaci|medicina|medicine|medicinali|medicinale|pillola|pillole|compressa|compresse|aspirina|antibiotico|tachipirina|brufen|oki|medico|doctor|dentista|dentist|visita|analisi)\b/.test(
        n
      )
    )
      return (
        pickCat(["Salute", "Farmacia", "Medicine", "Medicina"], "vita") ||
        getDefaultVoiceExpenseCategory()
      );
    if (
      /\b(supermercato|spesa alimentare|alimentari|grocery|groceries|supermarket|supermercado|esselunga|coop|conad|lidl|aldi|eurospin|carrefour|pane|latte|frutta|verdura)\b/.test(
        n
      )
    )
      return (
        pickCat(["Spesa", "Supermercato", "Alimentari"], "vita") ||
        getDefaultVoiceExpenseCategory()
      );
    if (
      /\b(pizza|pizzeria|ristorante|restaurant|restaurante|sushi|kebab|hamburger|pranzo|cena|delivery|deliveroo|glovo|just eat)\b/.test(
        n
      )
    )
      return (
        pickCat(["Ristoranti", "Ristorante", "Restaurant"], "tempo") ||
        getDefaultVoiceExpenseCategory()
      );
    if (
      /\b(bar|caffe|caffè|cafe|coffee|cappuccino|colazione|brioche)\b/.test(n)
    )
      return (
        pickCat(["Bar", "Caffè", "Cafe"], "tempo") ||
        getDefaultVoiceExpenseCategory()
      );
    if (
      /\b(benzina|diesel|gasolio|carburante|fuel|gasolina|rifornimento)\b/.test(
        n
      )
    )
      return (
        pickCat(["Carburante", "Benzina", "Fuel"], "trasporti") ||
        getDefaultVoiceExpenseCategory()
      );
    if (
      /\b(treno|metro|bus|autobus|tram|taxi|uber|bolt|biglietto|ticket)\b/.test(
        n
      )
    )
      return (
        pickCat(["Trasporti", "Transport", "Taxi"], "trasporti") ||
        getDefaultVoiceExpenseCategory()
      );
    if (
      /\b(luce|gas|acqua|internet|telefono|bolletta|bollette|utenza|utenze)\b/.test(
        n
      )
    )
      return (
        pickCat(["Utenze", "Bollette", "Utilities"], "casa") ||
        getDefaultVoiceExpenseCategory()
      );
    var rules = [
      {
        names: [
          "supermercato",
          "supermarket",
          "supermercado",
          "supermarche",
          "supermarkt",
          "sklep",
          "magazin",
          "alimentari",
          "grocery",
        ],
        area: "vita",
        words: [
          "supermercato",
          "supermarket",
          "supermercado",
          "supermarche",
          "supermarkt",
          "sklep",
          "magazin",
          "alimentari",
          "alimentacion",
          "groceries",
          "comida",
          "food",
          "spesa",
          "compra",
          "compras",
          "zakupy",
          "boodschappen",
          "cumparaturi",
          "alimente",
          "caramella",
          "caramelle",
          "dolci",
          "bread",
          "pane",
          "pan",
          "pain",
          "brot",
          "chleb",
          "paine",
          "latte",
          "milk",
          "leche",
          "lait",
          "milch",
          "mleko",
          "lapte",
          "frutta",
          "verdura",
          "esselunga",
          "coop",
          "conad",
          "lidl",
          "aldi",
          "eurospin",
          "carrefour",
        ],
        avoid: ["mutuo", "affitto", "rent", "mortgage", "miete"],
      },
      {
        names: [
          "ristorante",
          "restaurant",
          "restaurante",
          "restauracja",
          "pizzeria",
          "pizza",
          "pizze",
        ],
        area: "svago",
        words: [
          "pizza",
          "pizze",
          "pizzas",
          "pizzeria",
          "restaurant",
          "restaurante",
          "ristorante",
          "restauracja",
          "restaurant",
          "cena",
          "pranzo",
          "dinner",
          "lunch",
          "sushi",
          "kebab",
          "hamburger",
          "delivery",
          "deliveroo",
          "glovo",
          "just eat",
        ],
        avoid: ["mutuo", "affitto", "rent", "mortgage"],
      },
      {
        names: ["bar", "caffe", "cafe", "coffee"],
        area: "svago",
        words: [
          "bar",
          "caffe",
          "cafe",
          "coffee",
          "cappuccino",
          "brioche",
          "colazione",
          "breakfast",
          "desayuno",
          "petit dejeuner",
          "fruhstuck",
        ],
        avoid: ["mutuo", "affitto"],
      },
      {
        names: [
          "carburante",
          "benzina",
          "fuel",
          "gasolina",
          "essence",
          "kraftstoff",
          "combustivel",
          "paliwo",
        ],
        area: "trasporti",
        words: [
          "benzina",
          "diesel",
          "gasolio",
          "carburante",
          "fuel",
          "gasoline",
          "gasolina",
          "essence",
          "kraftstoff",
          "combustivel",
          "paliwo",
          "rifornimento",
        ],
      },
      {
        names: ["trasporti", "transport", "taxi", "metro", "treno", "bus"],
        area: "trasporti",
        words: [
          "metro",
          "treno",
          "train",
          "bus",
          "autobus",
          "biglietto",
          "ticket",
          "tram",
          "taxi",
          "uber",
          "bolt",
        ],
      },
      {
        names: [
          "salute",
          "health",
          "medicina",
          "farmacia",
          "pharmacy",
          "pharmacie",
          "apotheke",
          "farmacia",
          "apteka",
        ],
        area: "vita",
        words: [
          "salute",
          "health",
          "sanita",
          "farmacia",
          "pharmacy",
          "pharmacie",
          "apotheke",
          "apteka",
          "farmaco",
          "farmaci",
          "medicine",
          "medicina",
          "medicinali",
          "medicinale",
          "medico",
          "doctor",
          "dentista",
          "dentist",
          "visita",
          "analisi",
        ],
      },
      {
        names: ["utenze", "bollette", "utilities", "bills", "servizi"],
        area: "casa",
        words: [
          "luce",
          "gas",
          "acqua",
          "water",
          "electricity",
          "internet",
          "telefono",
          "bolletta",
          "bollette",
          "bill",
          "bills",
          "netflix",
          "spotify",
        ],
      },
      {
        names: [
          "viaggi",
          "travel",
          "viaje",
          "voyage",
          "reise",
          "podroz",
          "vacanza",
        ],
        area: "svago",
        words: [
          "volo",
          "flight",
          "hotel",
          "albergo",
          "booking",
          "airbnb",
          "viaggio",
          "travel",
          "viaje",
          "voyage",
          "reise",
          "vacanza",
          "holiday",
        ],
      },
      {
        names: ["sport", "tempo libero", "hobby", "esperienze"],
        area: "svago",
        words: [
          "biliardo",
          "cinema",
          "teatro",
          "concerto",
          "libro",
          "books",
          "hobby",
          "sport",
          "tennis",
        ],
      },
    ];
    var best = null,
      bestScore = 0;
    for (var i = 0; i < rules.length; i++) {
      if (voiceContainsAny(n, rules[i].words)) {
        (cats || []).forEach(function (c) {
          var sc = scoreVoiceCategory(c, n, rules[i]);
          if (sc > bestScore) {
            bestScore = sc;
            best = c;
          }
        });
      }
    }
    if (best && bestScore > 0) return best;
    var exact = findByVoiceName(cats, n);
    if (exact) return exact;
    return getDefaultVoiceExpenseCategory();
  }
  function parseVoiceCommand(txt) {
    var raw = String(txt || "").trim();
    var common = parseFainanceSingleVoiceCommon(raw);
    var n = normalizeVoiceText(common.converted || raw);
    if (!n) return null;
    var amount = common.amount || parseVoiceAmount(n);
    if (!amount || amount <= 0) {
      setVoiceError(voiceUiText(lang).invalid);
      return null;
    }
    var isIncome =
      /\b(entrata|entrate|incasso|incassato|ricevuto|ricevuta|stipendio|salario|salary|payroll|income|revenue|ingreso|ingresos|sueldo|revenu|recette|receita|einnahme|gehalt|przychod|pensja|inkomst|venit|salariu|\u03ad\u03c3\u03bf\u03b4\u03bf|\u03b5\u03c3\u03bf\u03b4\u03bf|\u03bc\u03b9\u03c3\u03b8\u03bf\u03c2|\u03bc\u03b9\u03c3\u03b8\u03cc\u03c2)\b/.test(
        n
      );
    var isExpense =
      /\b(uscita|uscite|spesa|spese|speso|pagato|pagata|expense|expenses|paid|gasto|gastos|depense|d\u00e9pense|despesa|ausgabe|bezahlt|wydatek|uitgave|cheltuiala|cheltuial\u0103|\u03ad\u03be\u03bf\u03b4\u03bf|\u03b5\u03be\u03bf\u03b4\u03bf)\b/.test(
        n
      );
    var type = isIncome && !isExpense ? "income" : common.type || "expense";
    var date = common.date || parseVoiceDate(n);
    var rateInfo = parseVoiceRate(n);
    var rate = rateInfo.rate,
      rateizzato = rateInfo.rateizzato;
    if (type === "income") {
      var it = findByVoiceName(incomeTypes, n) || incomeTypes[0];
      if (
        /\b(stipendio|salario|salary|payroll|sueldo|gehalt|pensja|salariu|\u03bc\u03b9\u03c3\u03b8\u03bf\u03c2|\u03bc\u03b9\u03c3\u03b8\u03cc\u03c2)\b/.test(
          n
        )
      )
        it =
          incomeTypes.find(function (x) {
            return x.id === "salario";
          }) || it;
      if (/\b(bonus|premio|tredicesima|quattordicesima)\b/.test(n))
        it =
          incomeTypes.find(function (x) {
            return x.id === "bonus";
          }) || it;
      return {
        type: "income",
        amount: amount,
        date: date,
        desc:
          common.description ||
          cleanVoiceDescription(raw, "income", null, null, it),
        incomeType: it ? it.id : "salario",
        incomeTypeName: it ? it.name : "Entrata",
        rateizzato: rateizzato,
        rate: rate,
      };
    }
    var c = categoryBySemanticVoice(n);
    var activeMethods = methods.filter(function (x) {
      return !x.archived;
    });
    var mentionedMethod = findByVoiceName(activeMethods, n);
    var m = mentionedMethod || getDefaultVoiceExpenseMethod();
    return {
      type: "expense",
      amount: amount,
      date: date,
      desc:
        common.description || cleanVoiceDescription(raw, "expense", c, m, null),
      catId: c ? c.id : 1,
      catName: c ? c.name : "Categoria",
      methodId: m ? m.id : 1,
      methodName: m ? m.name : "Metodo",
      rateizzato: rateizzato,
      rate: rate,
    };
  }
  function updateVoiceParsed(patch) {
    setVoiceParsed(function (p) {
      return p ? { ...p, ...patch } : p;
    });
  }
  function changeVoiceCat(id) {
    var c = (cats || []).find(function (x) {
      return String(x.id) === String(id);
    });
    if (c) updateVoiceParsed({ catId: c.id, catName: c.name });
  }
  function changeVoiceMethod(id) {
    var m = (methods || []).find(function (x) {
      return String(x.id) === String(id);
    });
    if (m) updateVoiceParsed({ methodId: m.id, methodName: m.name });
  }
  function changeVoiceIncomeType(id) {
    var it = (incomeTypes || []).find(function (x) {
      return String(x.id) === String(id);
    });
    if (it) updateVoiceParsed({ incomeType: it.id, incomeTypeName: it.name });
  }
  function analyzeVoiceText() {
    setVoiceError("");
    var parsed = parseVoiceCommand(voiceText);
    setVoiceParsed(parsed);
  }
  // FAINANCE V114 QUICK VOICE: iOS streaming transcription with owned listeners.
  // With partialResults enabled the native start promise is not treated as a final transcript:
  // text arrives through partialResults and is finalized when listening stops or the watchdog fires.
  var quickSpeechRef = useRef<any>(null);
  var quickSpeechRunRef = useRef(0);
  var quickSpeechTimeoutRef = useRef<any>(null);
  var quickSpeechTextRef = useRef("");
  var quickSpeechFinalizingRef = useRef(false);
  var quickSpeechListenersRef = useRef<any[]>([]);

  function clearQuickSpeechTimeout() {
    if (quickSpeechTimeoutRef.current) {
      clearTimeout(quickSpeechTimeoutRef.current);
      quickSpeechTimeoutRef.current = null;
    }
  }
  function quickSpeechDelay(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }
  function quickSpeechBounded(task, timeoutMs) {
    return Promise.race([
      Promise.resolve(task),
      new Promise(function (_resolve, reject) {
        setTimeout(function () {
          reject(new Error("VOICE_NATIVE_TIMEOUT"));
        }, timeoutMs);
      }),
    ]);
  }
  async function removeQuickSpeechListeners() {
    var handles = quickSpeechListenersRef.current || [];
    quickSpeechListenersRef.current = [];
    for (var i = 0; i < handles.length; i++) {
      try {
        if (handles[i] && handles[i].remove) await handles[i].remove();
      } catch (_quickListenerRemoveError) {}
    }
  }
  async function stopQuickNativeSpeech(force) {
    var speech = quickSpeechRef.current;
    if (!speech) return;
    try {
      if (force && speech.forceStop)
        await quickSpeechBounded(speech.forceStop({ timeout: 700 }), 1600);
      else if (speech.stop)
        await quickSpeechBounded(speech.stop(), 1600);
    } catch (_quickStopError) {}
  }
  function quickSpeechResultText(data) {
    var matches = (data && data.matches) || [];
    return String(
      (data && data.accumulatedText) ||
        (matches && matches[0]) ||
        (data && data.text) ||
        (data && data.accumulated) ||
        ""
    ).trim();
  }
  async function finalizeQuickSpeech(runId, forceStopFirst) {
    if (runId !== quickSpeechRunRef.current || quickSpeechFinalizingRef.current)
      return;
    quickSpeechFinalizingRef.current = true;
    clearQuickSpeechTimeout();
    var nativeSpeech = quickSpeechRef.current;
    var finalText = String(quickSpeechTextRef.current || "").trim();
    try {
      if (forceStopFirst) await stopQuickNativeSpeech(true);
      if (nativeSpeech && nativeSpeech.getLastPartialResult) {
        var last: any = await quickSpeechBounded(
          nativeSpeech.getLastPartialResult(),
          1200
        );
        var cached = quickSpeechResultText(last);
        if (cached) finalText = cached;
      }
    } catch (_quickLastResultError) {}
    if (runId !== quickSpeechRunRef.current) {
      quickSpeechFinalizingRef.current = false;
      return;
    }
    await removeQuickSpeechListeners();
    setVoiceListening(false);
    quickSpeechRef.current = null;
    quickSpeechFinalizingRef.current = false;
    if (finalText) {
      setVoiceText(finalText);
      setVoiceError("");
      setVoiceParsed(parseVoiceCommand(finalText));
    } else {
      setVoiceError(
        L(
          "Nessun testo riconosciuto. Riprova e parla dopo il segnale, oppure scrivi il comando nel campo testo."
        )
      );
    }
  }
  function openVoiceModal(autoStart) {
    setVoiceModal(true);
    setVoiceText("");
    setVoiceParsed(null);
    setVoiceError("");
    setVoiceListening(false);
  }
  function closeVoiceModal() {
    quickSpeechRunRef.current += 1;
    clearQuickSpeechTimeout();
    void stopQuickNativeSpeech(true);
    void removeQuickSpeechListeners();
    quickSpeechRef.current = null;
    quickSpeechTextRef.current = "";
    quickSpeechFinalizingRef.current = false;
    setVoiceModal(false);
    setVoiceListening(false);
    setVoiceText("");
    setVoiceParsed(null);
    setVoiceError("");
  }
  function startVoiceListening() {
    setVoiceError("");
    setVoiceParsed(null);
    var win: any = window;
    var language =
      String(
        (typeof navigator !== "undefined" && navigator.language) ||
          VOICE_LANGS[lang] ||
          "en-US"
      ) || "en-US";
    var cap = win.Capacitor;
    var isNative = cap && cap.isNativePlatform && cap.isNativePlatform();
    var platform = cap && cap.getPlatform ? cap.getPlatform() : "";
    if (isNative) {
      if (voiceListening) return;
      setVoiceListening(true);
      quickSpeechTextRef.current = "";
      quickSpeechFinalizingRef.current = false;
      var runId = ++quickSpeechRunRef.current;
      (async function () {
        var mod: any = await import("@capgo/capacitor-speech-recognition");
        var nativeSpeech: any = mod.SpeechRecognition || mod.default || mod;
        if (!nativeSpeech || !nativeSpeech.start)
          throw new Error(L("Riconoscimento vocale nativo non disponibile"));
        quickSpeechRef.current = nativeSpeech;

        var av: any = nativeSpeech.available
          ? await quickSpeechBounded(nativeSpeech.available(), 1800)
          : { available: true };
        if (av && av.available === false)
          throw new Error(L("Riconoscimento vocale non disponibile sul dispositivo"));

        var perm: any = nativeSpeech.checkPermissions
          ? await quickSpeechBounded(nativeSpeech.checkPermissions(), 2200)
          : {};
        var state = String((perm && perm.speechRecognition) || "").toLowerCase();
        if (state !== "granted") {
          perm = nativeSpeech.requestPermissions
            ? await quickSpeechBounded(nativeSpeech.requestPermissions(), 15000)
            : perm;
          state = String((perm && perm.speechRecognition) || "").toLowerCase();
        }
        if (state && state !== "granted")
          throw new Error(
            L(
              platform === "ios"
                ? "Permesso microfono o riconoscimento vocale non concesso."
                : "Permesso microfono non concesso."
            )
          );

        // Stop only a stale session that the plugin reports as active.
        try {
          if (nativeSpeech.isListening) {
            var listeningInfo: any = await quickSpeechBounded(
              nativeSpeech.isListening(),
              1200
            );
            var alreadyListening = !!(
              listeningInfo === true ||
              (listeningInfo && listeningInfo.listening === true) ||
              (listeningInfo && listeningInfo.value === true)
            );
            if (alreadyListening) {
              await stopQuickNativeSpeech(true);
              await quickSpeechDelay(250);
            }
          }
        } catch (_staleRecognitionError) {}

        await removeQuickSpeechListeners();
        if (nativeSpeech.addListener) {
          var partialHandle = await nativeSpeech.addListener(
            "partialResults",
            function (data: any) {
              if (runId !== quickSpeechRunRef.current) return;
              var text = quickSpeechResultText(data);
              if (!text) return;
              quickSpeechTextRef.current = text;
              setVoiceText(text);
              setVoiceError("");
            }
          );
          quickSpeechListenersRef.current.push(partialHandle);

          var stateHandle = await nativeSpeech.addListener(
            "listeningState",
            function (data: any) {
              if (runId !== quickSpeechRunRef.current) return;
              var stopped = !!(
                data &&
                (data.status === "stopped" ||
                  data.state === "stopped" ||
                  data.state === "idle")
              );
              if (stopped) {
                setTimeout(function () {
                  void finalizeQuickSpeech(runId, false);
                }, 120);
              }
            }
          );
          quickSpeechListenersRef.current.push(stateHandle);

          var errorHandle = await nativeSpeech.addListener(
            "error",
            function (data: any) {
              if (runId !== quickSpeechRunRef.current) return;
              var code = String((data && data.code) || "").toLowerCase();
              if (!isIgnorableSpeechRecognitionErrorGlobal(data) && code) {
                setVoiceError(L("Riconoscimento vocale non disponibile."));
              } else {
                setVoiceError("");
              }
              setTimeout(function () {
                void finalizeQuickSpeech(runId, false);
              }, 100);
            }
          );
          quickSpeechListenersRef.current.push(errorHandle);
        }

        clearQuickSpeechTimeout();
        quickSpeechTimeoutRef.current = setTimeout(function () {
          if (runId !== quickSpeechRunRef.current) return;
          // Force-stop only to close the session; the cached partial transcript is read afterwards.
          void finalizeQuickSpeech(runId, true);
        }, 18000);

        var res: any = await nativeSpeech.start({
          language: language,
          maxResults: 3,
          prompt: "Parla ora",
          partialResults: true,
          popup: false,
          addPunctuation: true,
        });
        if (runId !== quickSpeechRunRef.current) return;
        var immediateText = quickSpeechResultText(res);
        if (immediateText) {
          quickSpeechTextRef.current = immediateText;
          setVoiceText(immediateText);
        }
        // With partialResults=true start() may resolve immediately. Do not finalize here:
        // the iOS transcript continues through the partialResults listener.
      })()
        .catch(function (err) {
          if (runId !== quickSpeechRunRef.current) return;
          clearQuickSpeechTimeout();
          void removeQuickSpeechListeners();
          quickSpeechRef.current = null;
          setVoiceListening(false);
          var msg = err && err.message ? err.message : String(err || "");
          setVoiceError(msg || L("Errore riconoscimento vocale nativo"));
        });
      return;
    }
    var SpeechRecognition =
      win.SpeechRecognition || win.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setVoiceError(
        "Riconoscimento vocale non disponibile su questo dispositivo. Puoi scrivere il comando nel campo testo e premere Analizza."
      );
      return;
    }
    try {
      var rec = new SpeechRecognition();
      rec.lang = language;
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      rec.continuous = false;
      setVoiceListening(true);
      rec.onresult = function (ev) {
        var txt2 = "";
        for (var ri = 0; ri < ev.results.length; ri++) {
          if (
            ev.results[ri] &&
            ev.results[ri][0] &&
            ev.results[ri][0].transcript
          ) {
            txt2 += (txt2 ? " " : "") + ev.results[ri][0].transcript;
          }
        }
        if (txt2) {
          setVoiceText(txt2);
          if (ev.results[ev.results.length - 1].isFinal) {
            setVoiceParsed(parseVoiceCommand(txt2));
          }
        }
      };
      rec.onerror = function (ev) {
        var errCode = ev && ev.error ? ev.error : "non disponibile";
        var errMsg =
          errCode === "not-allowed"
            ? "Permesso microfono negato dal browser. Su Android usa il plugin nativo SpeechRecognition oppure scrivi il comando nel campo testo."
            : "Errore riconoscimento vocale: " + errCode;
        setVoiceError(errMsg);
        setVoiceListening(false);
      };
      rec.onend = function () {
        setVoiceListening(false);
      };
      rec.start();
    } catch (err) {
      setVoiceListening(false);
      setVoiceError(
        "Impossibile avviare il microfono. Verifica i permessi audio."
      );
    }
  }

  function saveVoiceEntry() {
    if (!voiceParsed) return;
    if (voiceParsed.type === "income") {
      if (
        addIncomes(
          [
            {
              id: Date.now(),
              amount: Number(voiceParsed.amount) || 0,
              type: voiceParsed.incomeType,
              desc: voiceParsed.desc,
              date: voiceParsed.date,
              rateizzato: !!voiceParsed.rateizzato,
              rate: Number(voiceParsed.rate) || 1,
            },
          ],
          "voice"
        )
      ) {
        closeVoiceModal();
      }
    } else {
      if (
        addExpenses(
          [
            {
              id: Date.now(),
              amount: Number(voiceParsed.amount) || 0,
              catId: Number(voiceParsed.catId),
              methodId: Number(voiceParsed.methodId),
              methodName: voiceParsed.methodName,
              desc: voiceParsed.desc,
              date: voiceParsed.date,
              rateizzato: !!voiceParsed.rateizzato,
              rate: Number(voiceParsed.rate) || 1,
            },
          ],
          "voice"
        )
      ) {
        closeVoiceModal();
      }
    }
  }
  var parsed = voiceParsed;
  var V = voiceUiText(lang);
  var voiceAutoStartedRef = useRef(false);
  useEffect(function () {
    if (voiceAutoStartedRef.current) return;
    voiceAutoStartedRef.current = true;
    var t1 = setTimeout(function () {
      startVoiceListening();
    }, 450);
    return function () {
      clearTimeout(t1);
      quickSpeechRunRef.current += 1;
      clearQuickSpeechTimeout();
      void stopQuickNativeSpeech(true);
    };
  }, []);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        zIndex: 520,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10vh 16px 2vh",
        boxSizing: "border-box",
        overflowY: "auto",
      }}
      onClick={function (e) {
        if (e.target === e.currentTarget) closeVoiceModal();
      }}
    >
      <div
        style={{
          background: cardBg,
          borderRadius: 20,
          border: "1px solid " + borderC,
          width: "100%",
          maxWidth: 430,
          maxHeight: "92vh",
          boxShadow: "0 10px 40px rgba(0,0,0,0.28)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            background:
              "linear-gradient(135deg,var(--fainance-primary,#378ADD),var(--fainance-secondary,#5FAFE5))",
            color: "#fff",
            padding: "18px 20px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 30 }}>🎙️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 17, fontWeight: 900 }}>{V.title}</div>
            <div style={{ fontSize: 12, opacity: 0.85 }}>{V.sub}</div>
          </div>
          <PopupCloseButton onClick={closeVoiceModal} dark={dark} label={V.cancel} />
        </div>
        <div
          style={{
            padding: 18,
            display: "flex",
            flexDirection: "column",
            gap: 12,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
          }}
        >
          <button
            onClick={startVoiceListening}
            disabled={voiceListening}
            style={{
              background: voiceListening ? "#EF9F27" : "#7F77DD",
              color: "#fff",
              border: "none",
              borderRadius: btnRadius,
              padding: "13px 14px",
              fontSize: 15,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            {voiceListening ? V.listening : V.retry}
          </button>
          <div style={{ fontSize: 12, color: subC, lineHeight: 1.45 }}>
            {V.hint}
          </div>
          <div style={{ fontSize: 12, color: subC, lineHeight: 1.45 }}>
            {V.examples}
          </div>
          <textarea
            value={voiceText}
            onChange={function (e) {
              setVoiceText(e.target.value);
              setVoiceParsed(null);
              setVoiceError("");
            }}
            placeholder={V.placeholder}
            style={{
              minHeight: 74,
              borderRadius: 12,
              border: "1px solid " + borderC,
              padding: "10px 12px",
              fontSize: 13,
              background: dark ? "#2a2a3e" : "#fff",
              color: textC,
              resize: "vertical",
            }}
          />
          <button
            onClick={analyzeVoiceText}
            style={{
              background: dark ? "#333" : "#f0f0f0",
              color: textC,
              border: "none",
              borderRadius: btnRadius,
              padding: "10px 12px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {V.analyze}
          </button>
          {voiceError && (
            <div
              style={{
                background: dark ? "#3a1d1d" : "#fff0f0",
                border: "1px solid #E24B4A55",
                borderRadius: 12,
                padding: "10px 12px",
                fontSize: 12,
                color: "#E24B4A",
              }}
            >
              ⚠️ {voiceError}
            </div>
          )}
          {parsed && (
            <div
              style={{
                background: dark ? "#1e1e30" : "#f7f6ff",
                border:
                  "1px solid " +
                  (parsed.type === "expense" ? expenseColor : incomeColor) +
                  "55",
                borderRadius: 14,
                padding: 14,
              }}
            >
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 900,
                  color: parsed.type === "expense" ? expenseColor : incomeColor,
                  marginBottom: 8,
                }}
              >
                {parsed.type === "expense" ? V.exp : V.inc}
                {V.recognized} · Modifica prima di salvare
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 10,
                  fontSize: 12,
                  color: textC,
                }}
              >
                <div>
                  <label
                    style={{
                      fontWeight: 800,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {V.amount}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={parsed.amount}
                    onChange={function (e) {
                      updateVoiceParsed({ amount: e.target.value });
                    }}
                    style={sinp}
                  />
                </div>
                <div>
                  <label
                    style={{
                      fontWeight: 800,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {V.date}
                  </label>
                  <input
                    type="date"
                    value={parsed.date}
                    onChange={function (e) {
                      updateVoiceParsed({ date: e.target.value });
                    }}
                    style={sinp}
                  />
                </div>
                {parsed.type === "expense" ? (
                  <>
                    <div>
                      <label
                        style={{
                          fontWeight: 800,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        {V.cat}
                      </label>
                      <select
                        value={parsed.catId}
                        onChange={function (e) {
                          changeVoiceCat(e.target.value);
                        }}
                        style={sinp}
                      >
                        {(cats || [])
                          .filter(function (c) {
                            return !c.archived;
                          })
                          .map(function (c) {
                            return (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                    <div>
                      <label
                        style={{
                          fontWeight: 800,
                          display: "block",
                          marginBottom: 4,
                        }}
                      >
                        {V.method}
                      </label>
                      <select
                        value={parsed.methodId}
                        onChange={function (e) {
                          changeVoiceMethod(e.target.value);
                        }}
                        style={sinp}
                      >
                        {(methods || [])
                          .filter(function (m) {
                            return !m.archived;
                          })
                          .map(function (m) {
                            return (
                              <option key={m.id} value={m.id}>
                                {m.name}
                              </option>
                            );
                          })}
                      </select>
                    </div>
                  </>
                ) : (
                  <div style={{ gridColumn: "1/-1" }}>
                    <label
                      style={{
                        fontWeight: 800,
                        display: "block",
                        marginBottom: 4,
                      }}
                    >
                      {V.type}
                    </label>
                    <select
                      value={parsed.incomeType}
                      onChange={function (e) {
                        changeVoiceIncomeType(e.target.value);
                      }}
                      style={sinp}
                    >
                      {(incomeTypes || []).map(function (it) {
                        return (
                          <option key={it.id} value={it.id}>
                            {it.name}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}
                <div style={{ gridColumn: "1/-1" }}>
                  <label
                    style={{
                      fontWeight: 800,
                      display: "block",
                      marginBottom: 4,
                    }}
                  >
                    {V.desc}
                  </label>
                  <input
                    value={parsed.desc || ""}
                    onChange={function (e) {
                      updateVoiceParsed({ desc: e.target.value });
                    }}
                    style={sinp}
                  />
                </div>
                <div
                  style={{
                    gridColumn: "1/-1",
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    alignItems: "end",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      fontWeight: 800,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!parsed.rateizzato}
                      onChange={function (e) {
                        updateVoiceParsed({ rateizzato: e.target.checked });
                      }}
                    />{" "}
                    {V.inst}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="60"
                    disabled={!parsed.rateizzato}
                    value={parsed.rate || 1}
                    onChange={function (e) {
                      updateVoiceParsed({ rate: e.target.value });
                    }}
                    style={{ ...sinp, opacity: parsed.rateizzato ? 1 : 0.45 }}
                  />
                </div>
              </div>
            </div>
          )}
          <div style={{ display: "flex", gap: 10 }}>
            <Btn
              onClick={closeVoiceModal}
              bg={dark ? "#333" : "#f0f0f0"}
              color={textC}
              style={{ flex: 1, padding: 12 }}
            >
              {V.cancel}
            </Btn>
            <Btn
              onClick={saveVoiceEntry}
              disabled={!parsed}
              bg={parsed ? "#1D9E75" : "#999"}
              style={{ flex: 1, padding: 12, fontWeight: 900 }}
            >
              {V.save}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

export function FloatingAIButton({ desktop }) {
  // ── Destructure completo dal context ─────────────────────────────────────
  var _c: any = useApp();
  var {
    lang,
    cats,
    setCats,
    methods,
    setMethods,
    methodGroups,
    setMethodGroups,
    expenseGroups,
  }: any = _c;
  var {
    setExpenseGroups,
    incomeGroups,
    setIncomeGroups,
    incomeTypes,
    customIncomeTypes,
    setCustomIncomeTypes,
    incomeTypeOverrides,
    setIncomeTypeOverrides,
  }: any = _c;
  var {
    recurring,
    setRecurring,
    goals,
    setGoals,
    alerts,
    setAlerts,
    expenses,
    setExpenses,
  }: any = _c;
  var {
    incomes,
    setIncomes,
    sym,
    fmt,
    dark,
    dateFmt,
    curMonthKey,
    addExpenses,
  }: any = _c;
  var {
    addIncomes,
    confirmRecurring,
    catOrder,
    setCatOrder,
    methodOrder,
    setMethodOrder,
    catSortMode,
    setCatSortMode,
  }: any = _c;
  var {
    methodSortMode,
    setMethodSortMode,
    budgetPlan,
    setBudgetPlan,
    btnRadius,
    expenseColor,
    incomeColor,
    isMobile,
  }: any = _c;
  var {
    patrimonioAreas,
    setPatrimonioAreas,
    patrimonioEntries,
    setPatrimonioEntries,
    patrimonioValues,
    setPatrimonioValues,
    patrimonioMode,
    setPatrimonioMode,
  }: any = _c;
  var {
    patrimonioHistory,
    setPatrimonioHistory,
    patrimonioNotes,
    setPatrimonioNotes,
    historyFutureMode,
    setHistoryFutureMode,
    historySortDate,
    setHistorySortDate,
  }: any = _c;
  var {
    historySortDirection,
    setHistorySortDirection,
    appuntiDocuments,
    setAppuntiDocuments,
    appuntiNotes,
    setAppuntiNotes,
    bankCoords,
    setBankCoords,
  }: any = _c;
  var {
    notifPrefs,
    setNotifPrefs,
    customNotifs,
    setCustomNotifs,
    aiDismissed,
    setAiDismissed,
    aiChat,
    setAiChat,
  }: any = _c;
  var {
    aiDataAccess,
    setAiDataAccess,
    aiFloatingEnabled,
    setAiFloatingEnabled,
    secondaryCurrency,
    secRate,
    fmtSec,
    secSym,
  }: any = _c;
  var {
    secRateLoading,
    currency,
    showSecInHistory,
    setShowSecInHistory,
    showSecInStats,
    setShowSecInStats,
    showSecInBudget,
    setShowSecInBudget,
  }: any = _c;
  var {
    showSecInPatrimonio,
    setShowSecInPatrimonio,
    textC,
    subC,
    borderC,
    cardBg,
    inp,
    sb,
  }: any = _c;
  var {
    bgColor,
    tab,
    setTab,
    settingsPage,
    setSettingsPage,
    speseSubTab,
    setSpeseSubTab,
    addType,
  }: any = _c;
  var {
    setAddType,
    addSubTab,
    setAddSubTab,
    historyTab,
    setHistoryTab,
    editingItem,
    setEditingItem,
    mobileMenu,
  }: any = _c;
  var {
    setMobileMenu,
    toast,
    setToast,
    alertPopup,
    setAlertPopup,
    statsView,
    setStatsView,
    curYear,
  }: any = _c;
  var {
    yearExp,
    yearInc,
    monthlyTotals,
    searchQuery,
    setSearchQuery,
    showFilters,
    setShowFilters,
    filterYear,
  }: any = _c;
  var {
    setFilterYear,
    filterMonth,
    setFilterMonth,
    filterMonths,
    setFilterMonths,
    filterCat,
    setFilterCat,
    filterCats,
  }: any = _c;
  var {
    setFilterCats,
    filterCatExclude,
    setFilterCatExclude,
    filterGroup,
    setFilterGroup,
    filterDateFrom,
    setFilterDateFrom,
    filterDateTo,
  }: any = _c;
  var {
    setFilterDateTo,
    filterAmtMin,
    setFilterAmtMin,
    filterAmtMax,
    setFilterAmtMax,
    filteredExpenses,
    filteredIncomes,
    shareProjects,
  }: any = _c;
  var {
    setShareProjects,
    shareSelectedProjectId,
    setShareSelectedProjectId,
    shareProjectTab,
    setShareProjectTab,
    shareReceivedInvites,
    shareInviteLoading,
    showShareInHistory,
  }: any = _c;
  var {
    setShowShareInHistory,
    confirmButtonColor,
    setConfirmButtonColor,
    secondaryButtonColor,
    firestoreReady,
    userKey,
    userId,
    currentUser,
    pendingCount,
  }: any = _c;
  var {
    alertTriggered,
    getCat,
    getMethod,
    getIT,
    curMonthExp,
    curMonthInc,
    last12Balance,
    aiTab,
  }: any = _c;
  var {
    setAiTab,
    aiLoading,
    setAiLoading,
    aiAdviceFilter,
    setAiAdviceFilter,
    voiceModal,
    setVoiceModal,
    voiceListening,
    openVoiceModal,
  }: any = _c;
  var {
    setVoiceListening,
    voiceText,
    setVoiceText,
    voiceError,
    setVoiceError,
    voiceConfirm,
    setVoiceConfirm,
    voiceSaving,
  }: any = _c;
  var {
    setVoiceSaving,
    voiceParsed,
    setVoiceParsed,
    defaultExpenseCat,
    setDefaultExpenseCat,
    defaultExpenseMethod,
    setDefaultExpenseMethod,
    defaultExpenseArea,
  }: any = _c;
  var {
    setDefaultExpenseArea,
    defaultIncomeType,
    setDefaultIncomeType,
    defaultIncomeArea,
    setDefaultIncomeArea,
    defaultMethodArea,
    setDefaultMethodArea,
    incomeTypeOrder,
  }: any = _c;
  var {
    setIncomeTypeOrder,
    deleteConfirmId,
    setDeleteConfirmId,
    mergeFrom,
    setMergeFrom,
    mergeTo,
    setMergeTo,
    homeBalanceView,
  }: any = _c;
  var {
    setHomeBalanceView,
    firstDayOfWeek,
    setFirstDayOfWeek,
    aiFloatingPos,
    setAiFloatingPos,
    aiFloatingDrag,
    setAiFloatingDrag,
    widgetBgColor,
  }: any = _c;
  var {
    setWidgetBgColor,
    widgetBgAlpha,
    setWidgetBgAlpha,
    widgetExpenseColor,
    setWidgetExpenseColor,
    widgetIncomeColor,
    setWidgetIncomeColor,
    widgetTitle,
  }: any = _c;
  var {
    setWidgetTitle,
    widgetSubtitle,
    setWidgetSubtitle,
    widgetExpenseLabel,
    setWidgetExpenseLabel,
    widgetIncomeLabel,
    setWidgetIncomeLabel,
    widgetShowHeader,
  }: any = _c;
  var {
    setWidgetShowHeader,
    widgetButtonStyle,
    setWidgetButtonStyle,
    widgetVoiceEnabled,
    setWidgetVoiceEnabled,
    widget2Enabled,
    setWidget2Enabled,
    widget2Type,
  }: any = _c;
  var {
    setWidget2Type,
    widget2TitleColor,
    setWidget2TitleColor,
    widget2BodyColor,
    setWidget2BodyColor,
    widget2AccentColor,
    setWidget2AccentColor,
    widget2BgAlpha,
  }: any = _c;
  var {
    setWidget2BgAlpha,
    widget2TextSize,
    setWidget2TextSize,
    widget2MaxChars,
    setWidget2MaxChars,
    widget2AutoUpdate,
    setWidget2AutoUpdate,
    widget2SelectedNoteId,
  }: any = _c;
  var {
    setWidget2SelectedNoteId,
    widget2SelectedBankId,
    setWidget2SelectedBankId,
    widget3Enabled,
    setWidget3Enabled,
    widget3TextColor,
    setWidget3TextColor,
    widget3AccentColor,
  }: any = _c;
  var {
    setWidget3AccentColor,
    widget3PercentColor,
    setWidget3PercentColor,
    widget3BgAlpha,
    setWidget3BgAlpha,
    widget3ShowPercent,
    setWidget3ShowPercent,
    widget3ShowAmounts,
  }: any = _c;
  var {
    setWidget3ShowAmounts,
    widget3AutoUpdate,
    setWidget3AutoUpdate,
    widget3SelectedGoalId,
    setWidget3SelectedGoalId,
    bgTheme,
    setBgTheme,
    btnStyle,
  }: any = _c;
  var {
    setBtnStyle,
    shownAlertIds,
    setShownAlertIds,
    settingsValuesTab,
    setSettingsValuesTab,
  }: any = _c;
  var {
    normalizeEmail,
    loadShareCollaboration,
    acceptShareInvite,
    declineShareInvite,
    createShareInvite,
    createShareProject,
    updateShareProject,
    deleteShareProject,
    canAddPlanItem,
  }: any = _c;
  // ─────────────────────────────────────────────────────────────────────────
  var now = new Date();
  var sinp: any = {
    width: "100%",
    borderRadius: 8,
    border: "1px solid " + (dark ? "#444" : "#ddd"),
    padding: "8px 10px",
    fontSize: 14,
    background: dark ? "#2a2a3e" : "#fff",
    color: dark ? "#eee" : "#333",
    boxSizing: "border-box",
  };
  var buttonWidth = desktop ? 82 : 78;
  var buttonHeight = desktop ? 108 : 102;
  var bottom = Math.max(
    12,
    Number(aiFloatingPos && aiFloatingPos.bottom) || 78
  );
  var right = Math.max(8, Number(aiFloatingPos && aiFloatingPos.right) || 18);
  var dragState = aiFloatingDrag;
  var aiFloatingPointerRef: any = useRef(null);
  function getPoint(e) {
    return e;
  }
  function startDrag(e) {
    var point = getPoint(e);
    if (!point || point.clientX === undefined || point.clientY === undefined)
      return;
    if (
      e.currentTarget &&
      e.currentTarget.setPointerCapture &&
      e.pointerId !== undefined
    ) {
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch (err) {}
    }
    var state = {
      pointerId: e.pointerId,
      startX: point.clientX,
      startY: point.clientY,
      right: right,
      bottom: bottom,
      moved: false,
    };
    aiFloatingPointerRef.current = state;
    setAiFloatingDrag(state);
    if (e.cancelable) e.preventDefault();
  }
  function applyDrag(e) {
    var state = aiFloatingPointerRef.current;
    if (!state) return;
    if (
      state.pointerId !== undefined &&
      e.pointerId !== undefined &&
      state.pointerId !== e.pointerId
    )
      return;
    var point = getPoint(e);
    var dx = point.clientX - state.startX;
    var dy = point.clientY - state.startY;
    var moved =
      !!state.moved ||
      Math.sqrt(dx * dx + dy * dy) >= 7;
    if (!moved) return;
    state.moved = true;
    var maxRight = Math.max(8, (window.innerWidth || 390) - buttonWidth - 8);
    var maxBottom = Math.max(
      12,
      (window.innerHeight || 760) - buttonHeight - 12
    );
    var next = {
      right: Math.min(maxRight, Math.max(8, state.right - dx)),
      bottom: Math.min(maxBottom, Math.max(12, state.bottom - dy)),
    };
    aiFloatingPointerRef.current = state;
    setAiFloatingDrag({ ...state });
    setAiFloatingPos(next);
    if (e.cancelable) e.preventDefault();
  }
  function endDrag(e) {
    var state = aiFloatingPointerRef.current;
    if (
      state &&
      state.pointerId !== undefined &&
      e.pointerId !== undefined &&
      state.pointerId !== e.pointerId
    )
      return;
    var moved = !!(state && state.moved);
    aiFloatingPointerRef.current = null;
    setAiFloatingDrag(null);
    if (!moved) {
      setTab("consulenteAI");
      setAiTab("chat");
      setSettingsPage(null);
      setMobileMenu(false);
      if (openVoiceModal) openVoiceModal(true, true);
    }
    if (e && e.cancelable) e.preventDefault();
  }
  function cancelDrag(e) {
    var state = aiFloatingPointerRef.current;
    if (
      state &&
      state.pointerId !== undefined &&
      e.pointerId !== undefined &&
      state.pointerId !== e.pointerId
    )
      return;
    aiFloatingPointerRef.current = null;
    setAiFloatingDrag(null);
    if (e && e.cancelable) e.preventDefault();
  }
  return (
    <div
      style={{
        position: "fixed",
        right: right,
        bottom: bottom,
        zIndex: 250,
        width: buttonWidth,
        height: buttonHeight,
        overflow: "visible",
      }}
    >
      <button
        onClick={function (e) {
          e.stopPropagation();
          setAiFloatingEnabled(false);
        }}
        title="Nascondi icona AI"
        style={{
          position: "absolute",
          left: -2,
          top: -2,
          zIndex: 2,
          width: 22,
          height: 22,
          borderRadius: "50%",
          border: "1px solid rgba(0,0,0,0.12)",
          background: "rgba(255,255,255,0.92)",
          color: "#555",
          fontSize: 14,
          fontWeight: 900,
          lineHeight: "18px",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        ×
      </button>
      <button
        onPointerDown={startDrag}
        onPointerMove={applyDrag}
        onPointerUp={endDrag}
        onPointerCancel={cancelDrag}
        title="Grillo parlante AI"
        style={{
          width: buttonWidth,
          height: buttonHeight,
          borderRadius: 0,
          border: "none",
          background: "transparent",
          padding: 0,
          color: "#fff",
          boxShadow: "none",
          fontSize: desktop ? 27 : 25,
          cursor: dragState ? "grabbing" : "grab",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          touchAction: "none",
          userSelect: "none",
          overflow: "visible",
        }}
      >
        <img
          src={aiGrilloMascot}
          alt="Consulente AI"
          draggable={false}
          style={{
            width: "100%",
            height: "100%",
            display: "block",
            objectFit: "contain",
            pointerEvents: "none",
            background: "transparent",
            transform: "none",
          }}
        />
      </button>
    </div>
  );
}
// CopyMonthWidget moved to src/sections/CopyMonthWidget.tsx

// PatrimonioPanel moved to src/sections/PatrimonioPanel.tsx

// SharePanel moved to src/sections/SharePanel.tsx

// MorePanel moved to src/sections/MorePanel.tsx

// panelContent is defined in app.tsx (accede a AppuntiPanel e SettingsPanel nested)

export function ConfirmDialog() {
  var _c: any = useApp();
  var confirmState = _c.confirmState,
    setConfirmState = _c.setConfirmState,
    dark = _c.dark,
    textC = _c.textC,
    btnRadius = _c.btnRadius;
  function L(s) {
    return _c.translateUiRuntimeText ? _c.translateUiRuntimeText(s) : s;
  }
  if (!confirmState) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "10vh 16px 2vh",
        boxSizing: "border-box",
        overflowY: "auto",
        background: "rgba(0,0,0,0.45)",
      }}
      onClick={function (e) {
        if (e.target === e.currentTarget) setConfirmState(null);
      }}
    >
      <div
        style={{
          background: dark ? "#1e1e30" : "#fff",
          borderRadius: 18,
          padding: "24px 28px",
          maxWidth: 320,
          width: "90%",
          boxShadow: "0 8px 32px rgba(0,0,0,0.22)",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: textC,
            marginBottom: 20,
            lineHeight: 1.5,
          }}
        >
          {confirmState.msg}
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button
            onClick={function () {
              var cb = confirmState.onOk;
              setConfirmState(null);
              cb();
            }}
            style={{
              flex: 1,
              background: "#E24B4A",
              color: "#fff",
              border: "none",
              borderRadius: btnRadius || 12,
              padding: "10px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {L("✓ Conferma")}
          </button>
          <button
            onClick={function () {
              setConfirmState(null);
            }}
            style={{
              flex: 1,
              background: dark ? "#333" : "#f0f0f0",
              color: dark ? "#eee" : "#555",
              border: "none",
              borderRadius: btnRadius || 12,
              padding: "10px",
              fontSize: 14,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {L("Annulla")}
          </button>
        </div>
      </div>
    </div>
  );
}
// DebtCreditsPanel moved to src/sections/DebtCreditsPanel.tsx

// ShoppingPanel moved to src/sections/ShoppingPanel.tsx
