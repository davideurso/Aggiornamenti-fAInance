// ═══════════════════════════════════════════════════════════════════════════════
// CORE.TSX — Costanti, utilità, hook, contesto Firebase
// Base di tutti gli altri moduli.
// ═══════════════════════════════════════════════════════════════════════════════

import { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext } from "react";
export { useState, useEffect, useRef, useCallback, useMemo, createContext, useContext };
import appLogo from "../assets/logo.png";
import appBanner from "../assets/splash.png";
import aiGrilloMascot from "../assets/ai_grillo_mascot_transparent.png";
export { appLogo, appBanner, aiGrilloMascot };
import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential, deleteUser } from "firebase/auth";
export { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithRedirect, getRedirectResult, signInWithCredential, deleteUser };
import { getFirestore, doc, setDoc, getDoc, onSnapshot, deleteDoc, collection, query, where, limit, getDocs, addDoc } from "firebase/firestore";
export { getFirestore, doc, setDoc, getDoc, onSnapshot, deleteDoc, collection, query, where, limit, getDocs, addDoc };

// ── FIREBASE CONFIG ───────────────────────────────────────────────────────────
// Firebase web config.
// Codemagic builds from GitHub and does not read Davide's local .env file.
// Use the production Firebase Web/Auth-compatible key from google-services.json, not the iOS plist key, because the JS Firebase SDK runs inside the Capacitor WebView.
const FIREBASE_FALLBACK_CONFIG = {
  apiKey: "AIzaSyB6AQpz2MWphyc2RGmELZUfb2AUhzfi1To",
  authDomain: "fainance-a7794.firebaseapp.com",
  projectId: "fainance-a7794",
  storageBucket: "fainance-a7794.firebasestorage.app",
  messagingSenderId: "739607555867",
  appId: "1:739607555867:android:16aa0add0a289fb3cd6dbe"
};

function envOrFallback(key:string,fallback:string){
  try{
    var value=(import.meta as any).env&&((import.meta as any).env[key]);
    return value||fallback;
  }catch(e){
    return fallback;
  }
}

export const firebaseConfig = {
  apiKey: envOrFallback("VITE_FIREBASE_API_KEY",FIREBASE_FALLBACK_CONFIG.apiKey),
  authDomain: envOrFallback("VITE_FIREBASE_AUTH_DOMAIN",FIREBASE_FALLBACK_CONFIG.authDomain),
  projectId: envOrFallback("VITE_FIREBASE_PROJECT_ID",FIREBASE_FALLBACK_CONFIG.projectId),
  storageBucket: envOrFallback("VITE_FIREBASE_STORAGE_BUCKET",FIREBASE_FALLBACK_CONFIG.storageBucket),
  messagingSenderId: envOrFallback("VITE_FIREBASE_MESSAGING_SENDER_ID",FIREBASE_FALLBACK_CONFIG.messagingSenderId),
  appId: envOrFallback("VITE_FIREBASE_APP_ID",FIREBASE_FALLBACK_CONFIG.appId)
};
export const firebaseApp = initializeApp(firebaseConfig);
export const fbAuth = getAuth(firebaseApp);
export const fbDb = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
export const AI_AGENT_ENDPOINT = "https://europe-west1-fainance-a7794.cloudfunctions.net/askFinanceAI";
export const RECEIPT_OCR_ENDPOINT = "https://europe-west1-fainance-a7794.cloudfunctions.net/scanReceiptOCR";
export const AI_OUT_OF_SCOPE_MESSAGE = "Posso aiutarti con finanza personale, budget, spese, entrate, risparmio, prestiti, mutui, debiti, patrimonio e funzioni dell’app fAInance.";
export const AI_AGENT_SCOPE_INSTRUCTION = "Sei il Consulente AI integrato nell’app fAInance. Il tuo compito è aiutare l’utente su temi collegati alla finanza personale e alle funzionalità dell’app fAInance. Puoi rispondere a domande relative a: analisi di entrate, uscite, saldo e patrimonio; budget, categorie di spesa, metodi di pagamento e ricorrenze; obiettivi di risparmio; alert, notifiche e promemoria finanziari; importazione, esportazione, backup e qualità dei dati; statistiche mostrate nell’app; consigli pratici per ottimizzare spese, risparmio, abbonamenti, bollette, ricorrenze e gestione finanziaria personale; prestiti, mutui, debiti, rate, sostenibilità di una rata, scenari di indebitamento, anticipo, durata, interessi e capacità di rimborso; spiegazioni su come usare le funzionalità dell’app fAInance. Puoi anche rispondere a brevi frasi interlocutorie come ciao, come stai, mi puoi aiutare, cosa puoi fare, purché riporti gentilmente l’utente verso la gestione finanziaria o l’uso dell’app. Non devi rispondere a domande chiaramente non collegate alla finanza personale o all’app, come argomenti medici, politici, sportivi, di viaggio, intrattenimento o lavoro tecnico non pertinente. Se la domanda è fuori perimetro, rispondi solo con: “"+AI_OUT_OF_SCOPE_MESSAGE+"”. Mantieni le risposte brevi, pratiche e orientate all’azione. Non usare Markdown: niente asterischi, grassetti, titoli Markdown, elenchi complessi o formattazioni speciali. Scrivi in testo semplice, adatto a essere mostrato direttamente dentro l’app. Rispondi sempre nella lingua dell’ultimo messaggio dell’utente. Usa i dati disponibili solo se pertinenti. Se i dati non sono sufficienti, dichiaralo chiaramente e indica quale informazione manca nell’app.";

export const AppCtx=createContext({});
export function useApp(){return useContext(AppCtx);}
export const MONTHS_FULL=["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno","Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
export const MONTHS_SHORT=["Gen","Feb","Mar","Apr","Mag","Giu","Lug","Ago","Set","Ott","Nov","Dic"];
export const CURRENCIES=[
  {code:"EUR",symbol:"€",name:"Euro"},{code:"USD",symbol:"$",name:"US Dollar"},{code:"GBP",symbol:"£",name:"British Pound"},{code:"CHF",symbol:"CHF",name:"Swiss Franc"},{code:"JPY",symbol:"¥",name:"Japanese Yen"},
  {code:"AED",symbol:"د.إ",name:"UAE Dirham"},{code:"AFN",symbol:"؋",name:"Afghan Afghani"},{code:"ALL",symbol:"L",name:"Albanian Lek"},{code:"AMD",symbol:"֏",name:"Armenian Dram"},{code:"ANG",symbol:"ƒ",name:"Netherlands Antillean Guilder"},{code:"AOA",symbol:"Kz",name:"Angolan Kwanza"},{code:"ARS",symbol:"$",name:"Argentine Peso"},{code:"AUD",symbol:"A$",name:"Australian Dollar"},{code:"AWG",symbol:"ƒ",name:"Aruban Florin"},{code:"AZN",symbol:"₼",name:"Azerbaijani Manat"},
  {code:"BAM",symbol:"KM",name:"Bosnia-Herzegovina Convertible Mark"},{code:"BBD",symbol:"$",name:"Barbadian Dollar"},{code:"BDT",symbol:"৳",name:"Bangladeshi Taka"},{code:"BGN",symbol:"лв",name:"Bulgarian Lev"},{code:"BHD",symbol:"BD",name:"Bahraini Dinar"},{code:"BIF",symbol:"FBu",name:"Burundian Franc"},{code:"BMD",symbol:"$",name:"Bermudian Dollar"},{code:"BND",symbol:"$",name:"Brunei Dollar"},{code:"BOB",symbol:"Bs",name:"Bolivian Boliviano"},{code:"BRL",symbol:"R$",name:"Brazilian Real"},{code:"BSD",symbol:"$",name:"Bahamian Dollar"},{code:"BTN",symbol:"Nu.",name:"Bhutanese Ngultrum"},{code:"BWP",symbol:"P",name:"Botswana Pula"},{code:"BYN",symbol:"Br",name:"Belarusian Ruble"},{code:"BZD",symbol:"$",name:"Belize Dollar"},
  {code:"CAD",symbol:"C$",name:"Canadian Dollar"},{code:"CDF",symbol:"FC",name:"Congolese Franc"},{code:"CLP",symbol:"$",name:"Chilean Peso"},{code:"CNY",symbol:"¥",name:"Chinese Yuan"},{code:"COP",symbol:"$",name:"Colombian Peso"},{code:"CRC",symbol:"₡",name:"Costa Rican Colón"},{code:"CUP",symbol:"$",name:"Cuban Peso"},{code:"CVE",symbol:"$",name:"Cape Verdean Escudo"},{code:"CZK",symbol:"Kč",name:"Czech Koruna"},
  {code:"DJF",symbol:"Fdj",name:"Djiboutian Franc"},{code:"DKK",symbol:"kr",name:"Danish Krone"},{code:"DOP",symbol:"RD$",name:"Dominican Peso"},{code:"DZD",symbol:"دج",name:"Algerian Dinar"},{code:"EGP",symbol:"£",name:"Egyptian Pound"},{code:"ERN",symbol:"Nfk",name:"Eritrean Nakfa"},{code:"ETB",symbol:"Br",name:"Ethiopian Birr"},
  {code:"FJD",symbol:"$",name:"Fijian Dollar"},{code:"FKP",symbol:"£",name:"Falkland Islands Pound"},{code:"GEL",symbol:"₾",name:"Georgian Lari"},{code:"GHS",symbol:"₵",name:"Ghanaian Cedi"},{code:"GIP",symbol:"£",name:"Gibraltar Pound"},{code:"GMD",symbol:"D",name:"Gambian Dalasi"},{code:"GNF",symbol:"FG",name:"Guinean Franc"},{code:"GTQ",symbol:"Q",name:"Guatemalan Quetzal"},{code:"GYD",symbol:"$",name:"Guyanese Dollar"},
  {code:"HKD",symbol:"HK$",name:"Hong Kong Dollar"},{code:"HNL",symbol:"L",name:"Honduran Lempira"},{code:"HRK",symbol:"kn",name:"Croatian Kuna"},{code:"HTG",symbol:"G",name:"Haitian Gourde"},{code:"HUF",symbol:"Ft",name:"Hungarian Forint"},{code:"IDR",symbol:"Rp",name:"Indonesian Rupiah"},{code:"ILS",symbol:"₪",name:"Israeli New Shekel"},{code:"INR",symbol:"₹",name:"Indian Rupee"},{code:"IQD",symbol:"ع.د",name:"Iraqi Dinar"},{code:"IRR",symbol:"﷼",name:"Iranian Rial"},{code:"ISK",symbol:"kr",name:"Icelandic Króna"},
  {code:"JMD",symbol:"J$",name:"Jamaican Dollar"},{code:"JOD",symbol:"JD",name:"Jordanian Dinar"},{code:"KES",symbol:"KSh",name:"Kenyan Shilling"},{code:"KGS",symbol:"с",name:"Kyrgyzstani Som"},{code:"KHR",symbol:"៛",name:"Cambodian Riel"},{code:"KMF",symbol:"CF",name:"Comorian Franc"},{code:"KRW",symbol:"₩",name:"South Korean Won"},{code:"KWD",symbol:"KD",name:"Kuwaiti Dinar"},{code:"KYD",symbol:"$",name:"Cayman Islands Dollar"},{code:"KZT",symbol:"₸",name:"Kazakhstani Tenge"},
  {code:"LAK",symbol:"₭",name:"Lao Kip"},{code:"LBP",symbol:"ل.ل",name:"Lebanese Pound"},{code:"LKR",symbol:"Rs",name:"Sri Lankan Rupee"},{code:"LRD",symbol:"$",name:"Liberian Dollar"},{code:"LSL",symbol:"L",name:"Lesotho Loti"},{code:"LYD",symbol:"LD",name:"Libyan Dinar"},{code:"MAD",symbol:"DH",name:"Moroccan Dirham"},{code:"MDL",symbol:"L",name:"Moldovan Leu"},{code:"MGA",symbol:"Ar",name:"Malagasy Ariary"},{code:"MKD",symbol:"ден",name:"Macedonian Denar"},{code:"MMK",symbol:"K",name:"Myanmar Kyat"},{code:"MNT",symbol:"₮",name:"Mongolian Tögrög"},{code:"MOP",symbol:"MOP$",name:"Macanese Pataca"},{code:"MRU",symbol:"UM",name:"Mauritanian Ouguiya"},{code:"MUR",symbol:"₨",name:"Mauritian Rupee"},{code:"MVR",symbol:"Rf",name:"Maldivian Rufiyaa"},{code:"MWK",symbol:"MK",name:"Malawian Kwacha"},{code:"MXN",symbol:"$",name:"Mexican Peso"},{code:"MYR",symbol:"RM",name:"Malaysian Ringgit"},{code:"MZN",symbol:"MT",name:"Mozambican Metical"},
  {code:"NAD",symbol:"$",name:"Namibian Dollar"},{code:"NGN",symbol:"₦",name:"Nigerian Naira"},{code:"NIO",symbol:"C$",name:"Nicaraguan Córdoba"},{code:"NOK",symbol:"kr",name:"Norwegian Krone"},{code:"NPR",symbol:"₨",name:"Nepalese Rupee"},{code:"NZD",symbol:"NZ$",name:"New Zealand Dollar"},{code:"OMR",symbol:"OMR",name:"Omani Rial"},{code:"PAB",symbol:"B/.",name:"Panamanian Balboa"},{code:"PEN",symbol:"S/",name:"Peruvian Sol"},{code:"PGK",symbol:"K",name:"Papua New Guinean Kina"},{code:"PHP",symbol:"₱",name:"Philippine Peso"},{code:"PKR",symbol:"₨",name:"Pakistani Rupee"},{code:"PLN",symbol:"zł",name:"Polish Złoty"},{code:"PYG",symbol:"₲",name:"Paraguayan Guaraní"},
  {code:"QAR",symbol:"QR",name:"Qatari Riyal"},{code:"RON",symbol:"lei",name:"Romanian Leu"},{code:"RSD",symbol:"дин",name:"Serbian Dinar"},{code:"RUB",symbol:"₽",name:"Russian Ruble"},{code:"RWF",symbol:"FRw",name:"Rwandan Franc"},{code:"SAR",symbol:"﷼",name:"Saudi Riyal"},{code:"SBD",symbol:"$",name:"Solomon Islands Dollar"},{code:"SCR",symbol:"₨",name:"Seychellois Rupee"},{code:"SDG",symbol:"ج.س.",name:"Sudanese Pound"},{code:"SEK",symbol:"kr",name:"Swedish Krona"},{code:"SGD",symbol:"S$",name:"Singapore Dollar"},{code:"SHP",symbol:"£",name:"Saint Helena Pound"},{code:"SLE",symbol:"Le",name:"Sierra Leonean Leone"},{code:"SOS",symbol:"Sh",name:"Somali Shilling"},{code:"SRD",symbol:"$",name:"Surinamese Dollar"},{code:"SSP",symbol:"£",name:"South Sudanese Pound"},{code:"STN",symbol:"Db",name:"São Tomé and Príncipe Dobra"},{code:"SYP",symbol:"£",name:"Syrian Pound"},{code:"SZL",symbol:"L",name:"Eswatini Lilangeni"},
  {code:"THB",symbol:"฿",name:"Thai Baht"},{code:"TJS",symbol:"ЅМ",name:"Tajikistani Somoni"},{code:"TMT",symbol:"m",name:"Turkmenistan Manat"},{code:"TND",symbol:"DT",name:"Tunisian Dinar"},{code:"TOP",symbol:"T$",name:"Tongan Paʻanga"},{code:"TRY",symbol:"₺",name:"Turkish Lira"},{code:"TTD",symbol:"TT$",name:"Trinidad and Tobago Dollar"},{code:"TWD",symbol:"NT$",name:"New Taiwan Dollar"},{code:"TZS",symbol:"TSh",name:"Tanzanian Shilling"},{code:"UAH",symbol:"₴",name:"Ukrainian Hryvnia"},{code:"UGX",symbol:"USh",name:"Ugandan Shilling"},{code:"UYU",symbol:"$",name:"Uruguayan Peso"},{code:"UZS",symbol:"so'm",name:"Uzbekistani Som"},
  {code:"VES",symbol:"Bs",name:"Venezuelan Bolívar"},{code:"VND",symbol:"₫",name:"Vietnamese Đồng"},{code:"VUV",symbol:"VT",name:"Vanuatu Vatu"},{code:"WST",symbol:"T",name:"Samoan Tālā"},{code:"XAF",symbol:"FCFA",name:"Central African CFA Franc"},{code:"XCD",symbol:"$",name:"East Caribbean Dollar"},{code:"XOF",symbol:"CFA",name:"West African CFA Franc"},{code:"XPF",symbol:"₣",name:"CFP Franc"},{code:"YER",symbol:"﷼",name:"Yemeni Rial"},{code:"ZAR",symbol:"R",name:"South African Rand"},{code:"ZMW",symbol:"ZK",name:"Zambian Kwacha"},{code:"ZWL",symbol:"Z$",name:"Zimbabwean Dollar"}
];
export const DATE_FORMATS=[{id:"dmy",label:"GG/MM/AAAA",example:"31/12/2025"},{id:"mdy",label:"MM/GG/AAAA",example:"12/31/2025"},{id:"ymd",label:"AAAA-MM-GG",example:"2025-12-31"}];
export const IMPORT_DATE_FORMATS=[{id:"dmy",label:"GG/MM/AAAA (es. 31/12/2025)"},{id:"mdy",label:"MM/GG/AAAA (es. 12/31/2025)"},{id:"ymd",label:"AAAA-MM-GG (es. 2025-12-31)"},{id:"dmyShort",label:"GG/MM/AA (es. 31/12/25)"},{id:"auto",label:"Automatico"}];
export const LANGUAGES=[
  {code:"it",label:"Italiano"},
  {code:"en",label:"English"},
  {code:"es",label:"Español"},
  {code:"fr",label:"Français"},
  {code:"de",label:"Deutsch"},
  {code:"pt",label:"Português"},
  {code:"pl",label:"Polski"},
  {code:"nl",label:"Nederlands"},
  {code:"ro",label:"Română"},
  {code:"el",label:"Ελληνικά"}
];

export const PLAN_IDS=["free","base","premium"];
export const PLAN_LABELS={
  it:{free:"Gratis",base:"Base",premium:"Completo"},
  en:{free:"Gratis",base:"Plus",premium:"Premium"},
  es:{free:"Gratis",base:"Base",premium:"Completo"},
  fr:{free:"Gratuit",base:"Plus",premium:"Premium"},
  de:{free:"Kostenlos",base:"Plus",premium:"Premium"},
  pt:{free:"Grátis",base:"Plus",premium:"Premium"},
  pl:{free:"Darmowy",base:"Plus",premium:"Premium"},
  nl:{free:"Gratis",base:"Plus",premium:"Premium"},
  ro:{free:"Gratuit",base:"Bază",premium:"Complet"},
  el:{free:"Δωρεάν",base:"Βασικό",premium:"Πλήρες"}
};
export const PLAN_PRICES={free:{monthly:0,yearly:0},base:{monthly:2.5,yearly:20},premium:{monthly:4.0,yearly:35}};
export const PLAN_LIMITS={
  free:{ads:true,dailySingleMovements:2,rewardedExtraMovements:2,dailyMultipleMovements:1,dailyReceiptScans:1,rewardedExtraReceiptScans:1,dailyVoiceEntries:1,rewardedExtraVoiceEntries:1,aiDailyReplies:4,rewardedExtraAiReplies:2,aiMonthlyReplies:4,aiMonthlyTips:2,recurringMovements:1,instalmentEnabled:true,dailyInstalments:2,rewardedExtraInstalments:0,instalmentOptions:[6,12],instalmentMonthsMin:6,instalmentMonthsMax:12,baseCategoriesOnly:true,categoryEdits:2,canEditAreas:false,canReorderCategories:false,basePaymentMethodsOnly:true,canCustomizePaymentMethods:false,historyLevel:"full",statsLevel:"base",budgetLevel:"full",widgets:3,goals:1,notes:1,bankNotes:1,documents:0,patrimonioLevel:"complete",patrimonioCopyMonthly:2,rewardedExtraPatrimonioCopy:2,alerts:1,shareProjects:1,shareDailyExpenses:2,rewardedExtraShareDailyExpenses:2,settingsLevel:"base",debtCredits:1,shoppingLists:1,shoppingCards:2,shoppingListItems:25,shareReceiptScans:1,shareReceiptRetentionMonths:0},
  base:{ads:false,dailySingleMovements:4,rewardedExtraMovements:2,dailyMultipleMovements:2,dailyReceiptScans:3,rewardedExtraReceiptScans:1,dailyVoiceEntries:3,rewardedExtraVoiceEntries:1,aiDailyReplies:10,rewardedExtraAiReplies:3,aiMonthlyReplies:10,aiMonthlyTips:4,recurringMovements:3,instalmentEnabled:true,dailyInstalments:4,rewardedExtraInstalments:0,instalmentOptions:[3,6,12,24],instalmentMonthsMin:3,instalmentMonthsMax:24,baseCategoriesOnly:false,categoryEdits:Infinity,canEditAreas:true,canReorderCategories:true,basePaymentMethodsOnly:false,canCustomizePaymentMethods:true,historyLevel:"full",statsLevel:"advanced",budgetLevel:"full",widgets:5,goals:2,notes:3,bankNotes:3,documents:1,patrimonioLevel:"complete",patrimonioCopyMonthly:5,rewardedExtraPatrimonioCopy:2,alerts:3,shareProjects:2,shareDailyExpenses:4,rewardedExtraShareDailyExpenses:2,settingsLevel:"advanced",debtCredits:3,shoppingLists:2,shoppingCards:10,shoppingListItems:100,shareReceiptScans:2,shareReceiptRetentionMonths:0},
  premium:{ads:false,dailySingleMovements:Infinity,rewardedExtraMovements:0,dailyMultipleMovements:Infinity,dailyReceiptScans:Infinity,rewardedExtraReceiptScans:0,dailyVoiceEntries:Infinity,rewardedExtraVoiceEntries:0,aiDailyReplies:Infinity,rewardedExtraAiReplies:0,aiMonthlyReplies:300,aiCommercialLabel:"unlimited",aiMonthlyTips:Infinity,recurringMovements:Infinity,instalmentEnabled:true,dailyInstalments:Infinity,rewardedExtraInstalments:0,instalmentOptions:null,instalmentMonthsMin:1,instalmentMonthsMax:Infinity,baseCategoriesOnly:false,categoryEdits:Infinity,canEditAreas:true,canReorderCategories:true,basePaymentMethodsOnly:false,canCustomizePaymentMethods:true,historyLevel:"full",statsLevel:"complete",budgetLevel:"full",widgets:7,goals:Infinity,notes:Infinity,bankNotes:Infinity,documents:Infinity,patrimonioLevel:"complete",patrimonioCopyMonthly:Infinity,rewardedExtraPatrimonioCopy:0,alerts:Infinity,shareProjects:Infinity,shareDailyExpenses:Infinity,rewardedExtraShareDailyExpenses:0,settingsLevel:"full",debtCredits:Infinity,shoppingLists:Infinity,shoppingCards:Infinity,shoppingListItems:Infinity,shareReceiptScans:Infinity,shareReceiptRetentionMonths:6}
};
export function planLabel(plan,lang){var dict=PLAN_LABELS[lang]||PLAN_LABELS.en;return dict[plan]||dict.free;}
export function planLimitLabel(v){return v===Infinity?"∞":String(v);}
export function todayUsageKey(){return new Date().toISOString().slice(0,10);}
export function monthUsageKey(){return new Date().toISOString().slice(0,7);}

export const DEFAULT_EXPENSE_GROUPS=[{id:"casa",name:"Casa",color:"#B5D4F4"},{id:"vita",name:"Vita quotidiana",color:"#9FE1CB"},{id:"trasporti",name:"Trasporti",color:"#F5C4B3"},{id:"tempo",name:"Tempo libero",color:"#D4A8F0"},{id:"altro",name:"Altro",color:"#D3D1C7"}];
export const DEFAULT_INCOME_GROUPS=[{id:"lavoro",name:"Lavoro",color:"#5DCAA5"},{id:"investimenti",name:"Investimenti",color:"#378ADD"},{id:"extra_inc",name:"Extra",color:"#D4A8F0"}];
export const DEFAULT_METHOD_GROUPS=[{id:"conti_carte",name:"Conti e carte",color:"#378ADD"},{id:"altri",name:"Altri metodi",color:"#EF9F27"}];
export const DEFAULT_CATS=[{id:1,name:"Mutuo / Affitto",icon:"🏠",color:"#B5D4F4",group:"casa"},{id:2,name:"Utenze",icon:"💡",color:"#FAC775",group:"casa"},{id:3,name:"Manutenzione",icon:"🔧",color:"#D3D1C7",group:"casa"},{id:4,name:"Spesa",icon:"🛒",color:"#9FE1CB",group:"vita"},{id:5,name:"Salute",icon:"💊",color:"#B5D4F4",group:"vita"},{id:6,name:"Moda",icon:"👗",color:"#D4A8F0",group:"vita"},{id:7,name:"Carburante",icon:"⛽",color:"#F5C4B3",group:"trasporti"},{id:8,name:"Trasporti",icon:"🚌",color:"#F5C4B3",group:"trasporti"},{id:9,name:"Meccanico",icon:"🔧",color:"#D85A30",group:"trasporti"},{id:10,name:"Ristoranti",icon:"🍽",color:"#9FE1CB",group:"tempo"},{id:11,name:"Bar",icon:"☕",color:"#FAC775",group:"tempo"},{id:12,name:"Hobby",icon:"🎱",color:"#9F77DD",group:"tempo"},{id:13,name:"Esperienze",icon:"🎟",color:"#D4A8F0",group:"tempo"},{id:14,name:"Viaggi",icon:"✈",color:"#378ADD",group:"tempo"},{id:15,name:"Regali",icon:"🎁",color:"#EF9F27",group:"tempo"},{id:16,name:"Imprevisti",icon:"⚠️",color:"#E24B4A",group:"altro"},{id:17,name:"Altro",icon:"📦",color:"#D3D1C7",group:"altro"}];
export const DEFAULT_EXPENSE_CATEGORY_NAMES={
  1:{it:"Mutuo / Affitto",en:"Mortgage / Rent",es:"Hipoteca / Alquiler",fr:"Crédit / Loyer",de:"Hypothek / Miete",pt:"Hipoteca / Aluguel",pl:"Kredyt / Czynsz",nl:"Hypotheek / Huur",ro:"Credit / Chirie",el:"Στεγαστικό / Ενοίκιο"},
  2:{it:"Utenze",en:"Utilities",es:"Servicios",fr:"Charges",de:"Nebenkosten",pt:"Serviços",pl:"Media",nl:"Nutsvoorzieningen",ro:"Utilități",el:"Λογαριασμοί"},
  3:{it:"Manutenzione",en:"Maintenance",es:"Mantenimiento",fr:"Entretien",de:"Wartung",pt:"Manutenção",pl:"Konserwacja",nl:"Onderhoud",ro:"Întreținere",el:"Συντήρηση"},
  4:{it:"Spesa",en:"Groceries",es:"Compra",fr:"Courses",de:"Lebensmittel",pt:"Compras",pl:"Zakupy spożywcze",nl:"Boodschappen",ro:"Cumpărături",el:"Ψώνια"},
  5:{it:"Salute",en:"Health",es:"Salud",fr:"Santé",de:"Gesundheit",pt:"Saúde",pl:"Zdrowie",nl:"Gezondheid",ro:"Sănătate",el:"Υγεία"},
  6:{it:"Moda",en:"Fashion",es:"Moda",fr:"Mode",de:"Mode",pt:"Moda",pl:"Moda",nl:"Mode",ro:"Modă",el:"Μόδα"},
  7:{it:"Carburante",en:"Fuel",es:"Combustible",fr:"Carburant",de:"Kraftstoff",pt:"Combustível",pl:"Paliwo",nl:"Brandstof",ro:"Combustibil",el:"Καύσιμα"},
  8:{it:"Trasporti",en:"Transport",es:"Transporte",fr:"Transport",de:"Transport",pt:"Transportes",pl:"Transport",nl:"Vervoer",ro:"Transport",el:"Μεταφορές"},
  9:{it:"Meccanico",en:"Mechanic",es:"Mecánico",fr:"Mécanicien",de:"Werkstatt",pt:"Mecânico",pl:"Mechanik",nl:"Monteur",ro:"Mecanic",el:"Συνεργείο"},
  10:{it:"Ristoranti",en:"Restaurants",es:"Restaurantes",fr:"Restaurants",de:"Restaurants",pt:"Restaurantes",pl:"Restauracje",nl:"Restaurants",ro:"Restaurante",el:"Εστιατόρια"},
  11:{it:"Bar",en:"Café / Bar",es:"Bar",fr:"Bar",de:"Café / Bar",pt:"Bar",pl:"Bar",nl:"Bar",ro:"Bar",el:"Μπαρ"},
  12:{it:"Hobby",en:"Hobbies",es:"Aficiones",fr:"Loisirs",de:"Hobbys",pt:"Hobbies",pl:"Hobby",nl:"Hobby's",ro:"Hobby-uri",el:"Χόμπι"},
  13:{it:"Esperienze",en:"Experiences",es:"Experiencias",fr:"Expériences",de:"Erlebnisse",pt:"Experiências",pl:"Doświadczenia",nl:"Ervaringen",ro:"Experiențe",el:"Εμπειρίες"},
  14:{it:"Viaggi",en:"Travel",es:"Viajes",fr:"Voyages",de:"Reisen",pt:"Viagens",pl:"Podróże",nl:"Reizen",ro:"Călătorii",el:"Ταξίδια"},
  15:{it:"Regali",en:"Gifts",es:"Regalos",fr:"Cadeaux",de:"Geschenke",pt:"Presentes",pl:"Prezenty",nl:"Cadeaus",ro:"Cadouri",el:"Δώρα"},
  16:{it:"Imprevisti",en:"Unexpected",es:"Imprevistos",fr:"Imprévus",de:"Unerwartetes",pt:"Imprevistos",pl:"Nieprzewidziane",nl:"Onverwacht",ro:"Neprevăzute",el:"Απρόβλεπτα"},
  17:{it:"Altro",en:"Other",es:"Otro",fr:"Autre",de:"Sonstiges",pt:"Outro",pl:"Inne",nl:"Overig",ro:"Altele",el:"Άλλο"}
};
export const DEFAULT_EXPENSE_GROUP_NAMES={
  casa:{it:"Casa",en:"Home",es:"Casa",fr:"Maison",de:"Zuhause",pt:"Casa",pl:"Dom",nl:"Huis",ro:"Casă",el:"Σπίτι"},
  vita:{it:"Vita quotidiana",en:"Daily life",es:"Vida diaria",fr:"Vie quotidienne",de:"Alltag",pt:"Vida diária",pl:"Codzienne życie",nl:"Dagelijks leven",ro:"Viață zilnică",el:"Καθημερινότητα"},
  trasporti:{it:"Trasporti",en:"Transport",es:"Transporte",fr:"Transport",de:"Transport",pt:"Transportes",pl:"Transport",nl:"Vervoer",ro:"Transport",el:"Μεταφορές"},
  tempo:{it:"Tempo libero",en:"Free time",es:"Tiempo libre",fr:"Temps libre",de:"Freizeit",pt:"Tempo livre",pl:"Czas wolny",nl:"Vrije tijd",ro:"Timp liber",el:"Ελεύθερος χρόνος"},
  altro:{it:"Altro",en:"Other",es:"Otro",fr:"Autre",de:"Sonstiges",pt:"Outro",pl:"Inne",nl:"Overig",ro:"Altele",el:"Άλλο"}
};
export const DEFAULT_METHOD_NAMES={
  1:{it:"Conto corrente",en:"Current account",es:"Cuenta corriente",fr:"Compte courant",de:"Girokonto",pt:"Conta corrente",pl:"Rachunek biezacy",nl:"Betaalrekening",ro:"Cont curent",el:"Τρεχουμενος λογαριασμος"},
  2:{it:"Carta di debito",en:"Debit card",es:"Tarjeta de debito",fr:"Carte de debit",de:"Debitkarte",pt:"Cartao de debito",pl:"Karta debetowa",nl:"Betaalpas",ro:"Card de debit",el:"Χρεωστικη καρτα"},
  3:{it:"Prepagata",en:"Prepaid card",es:"Tarjeta prepago",fr:"Carte prepayee",de:"Prepaid-Karte",pt:"Cartao pre-pago",pl:"Karta przedplacona",nl:"Prepaidkaart",ro:"Card preplatit",el:"Προπληρωμενη καρτα"},
  4:{it:"Contanti",en:"Cash",es:"Efectivo",fr:"Especes",de:"Bargeld",pt:"Dinheiro",pl:"Gotowka",nl:"Contant",ro:"Numerar",el:"Μετρητα"},
  5:{it:"PayPal",en:"PayPal",es:"PayPal",fr:"PayPal",de:"PayPal",pt:"PayPal",pl:"PayPal",nl:"PayPal",ro:"PayPal",el:"PayPal"},
  6:{it:"Buoni pasto",en:"Meal vouchers",es:"Vales de comida",fr:"Tickets restaurant",de:"Essensgutscheine",pt:"Vales refeicao",pl:"Bony obiadowe",nl:"Maaltijdbonnen",ro:"Tichete de masa",el:"Κουπονια γευματος"},
  7:{it:"Altro",en:"Other",es:"Otro",fr:"Autre",de:"Sonstiges",pt:"Outro",pl:"Inne",nl:"Overig",ro:"Altele",el:"Άλλο"}
};
export const DEFAULT_METHOD_GROUP_NAMES={
  conti_carte:{it:"Conti e carte",en:"Accounts and cards",es:"Cuentas y tarjetas",fr:"Comptes et cartes",de:"Konten und Karten",pt:"Contas e cartoes",pl:"Konta i karty",nl:"Rekeningen en kaarten",ro:"Conturi si carduri",el:"Λογαριασμοι και καρτες"},
  altri:{it:"Altri metodi",en:"Other methods",es:"Otros metodos",fr:"Autres moyens",de:"Andere Methoden",pt:"Outros metodos",pl:"Inne metody",nl:"Andere methoden",ro:"Alte metode",el:"Αλλες μεθοδοι"}
};
export function translateDefaultCollection(items,defaults,dict,lang){
  return (items||[]).map(function(item){
    var d=(defaults||[]).find(function(x){return String(x.id)===String(item.id);});
    var names=dict&&dict[item.id];
    if(!d||!names)return item;
    var known=Object.keys(names).map(function(k){return names[k];});
    if(known.indexOf(d.name)===-1)known.push(d.name);
    if(known.indexOf(item.name)===-1)return item;
    var translated=names[lang]||names.en||names.it||item.name;
    return item.name===translated?item:{...item,name:translated};
  });
}
export function sameNamedItems(a,b){return JSON.stringify((a||[]).map(function(x){return{x:x.id,n:x.name};}))===JSON.stringify((b||[]).map(function(x){return{x:x.id,n:x.name};}));}

export const DEFAULT_METHODS=[{id:1,name:"Conto corrente",icon:"🏦",color:"#378ADD",group:"conti_carte"},{id:2,name:"Carta di debito",icon:"💳",color:"#5DCAA5",group:"conti_carte"},{id:3,name:"Prepagata",icon:"💳",color:"#9F77DD",group:"conti_carte"},{id:4,name:"Contanti",icon:"💵",color:"#F0997B",group:"altri"},{id:5,name:"PayPal",icon:"💠",color:"#185FA5",group:"altri"},{id:6,name:"Buoni pasto",icon:"🍱",color:"#D3D1C7",group:"altri"},{id:7,name:"Altro",icon:"📦",color:"#B4B2A9",group:"altri"}];
export const INCOME_TYPES=[{id:"salario",icon:"💼",color:"#5DCAA5",name:"Stipendio",group:"lavoro"},{id:"bonus",icon:"🎯",color:"#EF9F27",name:"Bonus",group:"lavoro"},{id:"dividendi",icon:"📈",color:"#378ADD",name:"Dividendi",group:"investimenti"},{id:"interessi",icon:"💰",color:"#FAC775",name:"Interessi",group:"investimenti"},{id:"regali",icon:"🎁",color:"#D4A8F0",name:"Regali",group:"extra_inc"},{id:"rimborsi",icon:"↩️",color:"#9FE1CB",name:"Rimborsi",group:"extra_inc"},{id:"extra",icon:"⭐",color:"#D4A8F0",name:"Entrate extra",group:"extra_inc"},{id:"altro_inc",icon:"📦",color:"#D3D1C7",name:"Altro",group:"extra_inc"}];
export function getAllIncomeTypes(extra,overrides){
  var custom=Array.isArray(extra)?extra:null;
  if(!custom){
    try{
      if(typeof localStorage!=="undefined"){
        custom=JSON.parse(localStorage.getItem("custom_income_types_v1")||"[]");
      }
    }catch(e){custom=[];}
  }
  if(!overrides){
    try{
      if(typeof localStorage!=="undefined"){
        overrides=JSON.parse(localStorage.getItem("income_type_overrides_v1")||"{}");
      }
    }catch(e){overrides={};}
  }
  custom=Array.isArray(custom)?custom:[];
  overrides=overrides&&typeof overrides==="object"?overrides:{};
  var seen={};
  var base=INCOME_TYPES.map(function(x){
    seen[x.id]=true;
    return overrides[x.id]?{...x,...overrides[x.id],id:x.id,custom:false,base:true}:x;
  });
  return base.concat(custom.filter(function(x){
    if(!x||!x.id||seen[x.id])return false;
    seen[x.id]=true;
    return true;
  }));
}

export const EMOJI_LIST=["🏠","💡","🛋","🔧","🛒","💆","💊","🎱","🍽","☕","👗","🎟","🏋","🎁","❤","✈","🅿","🚖","⛽","📦","💳","💵","🏦","💰","🍱","📈","💼","🎯","⭐","💠","🏛","🎮","🎵","📚","🏖","🚗","🚌","🛵","🎬","🍕","🍷","💻","📱","🎓","👶","🐶","🌱","🔑","🏥","⚽","🎾","🌍","🎄","📦","🧾","🧮","📑","📌","📍","🧷","🗃️","🗄️","🧺","🛍️","🥩","🐟","🥬","🍎","🥕","🧀","🥛","🥚","🍞","🥐","🍝","🍚","🥫","🧃","🧴","🧼","🪥","🧻","🧽","🧹","🪣","🧊","🔥","❄️","☂️","👓","🧢","👟","💍","⌚","📷","🎧","🖨️","🖥️","🖱️","⌨️","🔌","🔋","🧯","🛠️","🪛","🔩","⚙️","🧰","🏗️","🏡","🏢","🏬","🏪","🏫","🏟️","🛏️","🚿","🛁","🚽","🪑","🚪","🪟","🪴","🌵","🌿","🌸","🍀","🐱","🐭","🐠","🦜","🐢","🚲","🛴","🚆","🚇","🚁","🛫","🛳️","🏕️","🧭","🗺️","🏔️","🏝️","🎭","🎨","🎤","🎹","🥁","🎲","♟️","🧩","🎯","🏆","🥇","🧘","🏊","🚴","🥾","🩺","🩹","🦷","👨‍⚕️","⚖️","📜","🧾","💹","📉","📊","🪙","💶","💷","💴","💲","🔐","🔔","🚨","✅","❌","➕","➖","🔄","📅","⏳"];
export const COLORS=["#9FE1CB","#5DCAA5","#B5D4F4","#378ADD","#F5C4B3","#D85A30","#FAC775","#EF9F27","#D4A8F0","#9F77DD","#F4C0D1","#D4537E","#C0DD97","#639922","#D3D1C7","#888780","#E24B4A","#1D9E75"];
export const GOAL_ICONS=["🎯","🏖","🚗","🏠","✈","🎓","💰","🏋","🎮","📱","💻","👶","🌍","🎄","🏆","🌱","🔑","❤"];
export const BG_THEMES=[{id:"default",label:"Default",bg:"#f7f7f7",dark:false},{id:"slate",label:"Slate",bg:"#e8ecf0",dark:false},{id:"warm",label:"Warm",bg:"#f5f0ea",dark:false},{id:"ocean",label:"Ocean",bg:"#e6f0f5",dark:false},{id:"forest",label:"Forest",bg:"#e8f2ec",dark:false},{id:"viola",label:"Viola",bg:"#f0ecf8",dark:false},{id:"dark",label:"Dark",bg:"#1a1a2e",dark:true},{id:"darkslate",label:"Dark Slate",bg:"#16213e",dark:true}];
export const BUTTON_STYLES=[{id:"rounded",label:"Arrotondati",r:20},{id:"soft",label:"Morbidi",r:10},{id:"square",label:"Squadrati",r:6},{id:"sharp",label:"Taglienti",r:2}];
export const BALANCE_COLOR="#378ADD";

export const DEFAULT_PATRIMONIO_AREAS=[
  {id:"conti",name:"Conti e liquidità",icon:"🏦",color:"#378ADD"},
  {id:"investimenti",name:"Investimenti",icon:"📈",color:"#9F77DD"},
  {id:"immobili",name:"Immobili",icon:"🏠",color:"#B5D4F4"},
  {id:"altro",name:"Altro",icon:"📋",color:"#D3D1C7"},
];
export const DEFAULT_PATRIMONIO_ENTRIES=[
  {id:"cc",name:"Conto corrente",icon:"🏦",areaId:"conti"},
  {id:"cd",name:"Conto deposito",icon:"💰",areaId:"conti"},
  {id:"cash",name:"Contanti",icon:"💵",areaId:"conti"},
  {id:"azioni",name:"Azioni / ETF",icon:"📈",areaId:"investimenti"},
  {id:"fondi",name:"Fondi",icon:"📊",areaId:"investimenti"},
  {id:"crypto",name:"Crypto",icon:"₿",areaId:"investimenti"},
  {id:"casa",name:"Casa",icon:"🏠",areaId:"immobili"},
  {id:"altri_immobili",name:"Altri immobili",icon:"🏢",areaId:"immobili"},
  {id:"crediti",name:"Crediti",icon:"📋",areaId:"altro"},
  {id:"altro",name:"Altro",icon:"📦",areaId:"altro"},
];
export const DEFAULT_PATRIMONIO_AREA_NAMES={
  conti:{it:"Conti e liquidità",en:"Accounts and cash",es:"Cuentas y liquidez",fr:"Comptes et liquidites",de:"Konten und Liquiditat",pt:"Contas e liquidez",pl:"Konta i plynnosc",nl:"Rekeningen en liquiditeit",ro:"Conturi si lichiditati",el:"Λογαριασμοι και ρευστοτητα"},
  investimenti:{it:"Investimenti",en:"Investments",es:"Inversiones",fr:"Investissements",de:"Investitionen",pt:"Investimentos",pl:"Inwestycje",nl:"Beleggingen",ro:"Investitii",el:"Επενδυσεις"},
  immobili:{it:"Immobili",en:"Real estate",es:"Inmuebles",fr:"Immobilier",de:"Immobilien",pt:"Imoveis",pl:"Nieruchomosci",nl:"Vastgoed",ro:"Imobiliare",el:"Ακινητα"},
  altro:{it:"Altro",en:"Other",es:"Otro",fr:"Autre",de:"Sonstiges",pt:"Outro",pl:"Inne",nl:"Overig",ro:"Altele",el:"Άλλο"}
};
export const DEFAULT_PATRIMONIO_ENTRY_NAMES={
  cc:{it:"Conto corrente",en:"Current account",es:"Cuenta corriente",fr:"Compte courant",de:"Girokonto",pt:"Conta corrente",pl:"Rachunek biezacy",nl:"Betaalrekening",ro:"Cont curent",el:"Τρεχουμενος λογαριασμος"},
  cd:{it:"Conto deposito",en:"Savings account",es:"Cuenta de ahorro",fr:"Compte epargne",de:"Sparkonto",pt:"Conta poupanca",pl:"Konto oszczednosciowe",nl:"Spaarrekening",ro:"Cont de economii",el:"Λογαριασμος ταμιευτηριου"},
  cash:{it:"Contanti",en:"Cash",es:"Efectivo",fr:"Especes",de:"Bargeld",pt:"Dinheiro",pl:"Gotowka",nl:"Contant",ro:"Numerar",el:"Μετρητα"},
  azioni:{it:"Azioni / ETF",en:"Stocks / ETFs",es:"Acciones / ETF",fr:"Actions / ETF",de:"Aktien / ETFs",pt:"Acoes / ETFs",pl:"Akcje / ETF",nl:"Aandelen / ETF's",ro:"Actiuni / ETF-uri",el:"Μετοχες / ETF"},
  fondi:{it:"Fondi",en:"Funds",es:"Fondos",fr:"Fonds",de:"Fonds",pt:"Fundos",pl:"Fundusze",nl:"Fondsen",ro:"Fonduri",el:"Αμοιβαια κεφαλαια"},
  crypto:{it:"Crypto",en:"Crypto",es:"Cripto",fr:"Crypto",de:"Krypto",pt:"Cripto",pl:"Krypto",nl:"Crypto",ro:"Crypto",el:"Κρυπτο"},
  casa:{it:"Casa",en:"Home",es:"Casa",fr:"Maison",de:"Haus",pt:"Casa",pl:"Dom",nl:"Woning",ro:"Casa",el:"Σπιτι"},
  altri_immobili:{it:"Altri immobili",en:"Other real estate",es:"Otros inmuebles",fr:"Autres biens immobiliers",de:"Weitere Immobilien",pt:"Outros imoveis",pl:"Inne nieruchomosci",nl:"Ander vastgoed",ro:"Alte imobile",el:"Αλλα ακινητα"},
  crediti:{it:"Crediti",en:"Receivables",es:"Creditos",fr:"Creances",de:"Forderungen",pt:"Creditos",pl:"Naleznosci",nl:"Vorderingen",ro:"Creante",el:"Απαιτησεις"},
  altro:{it:"Altro",en:"Other",es:"Otro",fr:"Autre",de:"Sonstiges",pt:"Outro",pl:"Inne",nl:"Overig",ro:"Altele",el:"Άλλο"}
};
export const DEFAULT_GOALS=[
  {id:"fondo_emergenza",name:"Fondo emergenza",target:2000,saved:0,deadline:"",icon:"💰",color:"#1D9E75",period:"annual"},
];
export const DEFAULT_BUDGET_PLAN={income:0,manualIncome:0,items:[
  {catId:1,amount:0,pct:28},{catId:2,amount:0,pct:6},{catId:3,amount:0,pct:2},
  {catId:4,amount:0,pct:15},{catId:5,amount:0,pct:4},{catId:6,amount:0,pct:4},
  {catId:7,amount:0,pct:5},{catId:8,amount:0,pct:4},{catId:9,amount:0,pct:3},
  {catId:10,amount:0,pct:5},{catId:11,amount:0,pct:2},{catId:12,amount:0,pct:3},{catId:13,amount:0,pct:3},{catId:14,amount:0,pct:5},{catId:15,amount:0,pct:2},
  {catId:16,amount:0,pct:3},{catId:17,amount:0,pct:1}
]};
export function getDeviceLocale(){try{return (navigator.languages&&navigator.languages[0])||navigator.language||"it-IT";}catch(e){return "it-IT";}}
export function getDefaultLang(){var l=getDeviceLocale().toLowerCase();var code=l.split("-")[0];return LANGUAGES.some(function(x){return x.code===code;})?code:"it";}
export function getDefaultCurrency(){var loc=getDeviceLocale().toUpperCase();var country=(loc.split("-")[1]||"");var map={US:"USD",GB:"GBP",CH:"CHF",JP:"JPY",IT:"EUR",FR:"EUR",DE:"EUR",ES:"EUR",PT:"EUR",NL:"EUR",BE:"EUR",AT:"EUR",IE:"EUR",FI:"EUR",GR:"EUR",SI:"EUR",SK:"EUR",EE:"EUR",LV:"EUR",LT:"EUR",LU:"EUR",MT:"EUR",CY:"EUR"};return map[country]||"EUR";}
export function getDefaultDateFormat(){var loc=getDeviceLocale().toUpperCase();var country=(loc.split("-")[1]||"");if(country==="US")return "mdy";if(country==="JP"||country==="CN"||country==="KR")return "ymd";return "dmy";}


export function useStorage(key,dv){
  var [v,setV]=useState(function(){try{var s=localStorage.getItem(key);return s?JSON.parse(s):dv;}catch(e){return dv;}});
  var save=useCallback(function(val){
    setV(function(prev){
      var next=typeof val==="function"?val(prev):val;
      try{localStorage.setItem(key,JSON.stringify(next));}catch(e){}
      return next;
    });
  },[key]);
  return [v,save];
}
export function clearFainanceLocalAccountData(){
  var keys=["ai_chat_v1","ai_data_access_v1","ai_dismissed_v1","ai_floating_enabled_v1","ai_floating_pos_v1","ai_tab_v1","alerts_v1","appunti_documents_v1","appunti_notes_v1","bank_coords_v1","budget_plan_v1","cat_order_v1","cat_sort_mode","cats_v10","custom_income_types_v1","custom_notifs_v1","default_expense_area_v1","default_expense_cat_v1","default_expense_method_v1","default_income_area_v1","default_income_type_v1","default_method_area_v1","exp_v10","expense_cats_settings_view_v1","expense_groups_v1","expense_methods_settings_view_v1","goals_v1","history_future_mode_v1","history_sort_date_v1","history_sort_direction_v1","inc_v10","income_cats_settings_view_v1","income_groups_v1","income_type_order_v1","income_type_overrides_v1","legal_acceptance_date_v1","meth_v10","method_groups_v1","method_order_v1","method_sort_mode","notif_prefs_v1","patrimonio_areas_v1","patrimonio_entries_v1","patrimonio_history_v1","patrimonio_mode_v1","patrimonio_notes_v1","patrimonio_settings_area_view","patrimonio_settings_entry_view","patrimonio_values_v1","pref_bg","pref_btn_style","pref_cur","pref_datefmt","pref_exp_color","pref_first_day_week","pref_home_balance","pref_inc_color","pref_sec_budget","pref_sec_cur","pref_sec_history","pref_sec_patrimonio","pref_sec_stats","pref_statsview","privacy_accepted_v1","rec_v10","stats_mode_v1","stats_month_v1","stats_range_from_v1","stats_range_to_v1","stats_year_v1","terms_accepted_v1","widget2_accent_color_v1","widget2_auto_update_v1","widget2_bank_id_v1","widget2_bg_alpha_v1","widget2_body_color_v1","widget2_enabled_v1","widget2_max_chars_v1","widget2_note_id_v1","widget2_text_size_v1","widget2_title_color_v1","widget2_type_v1","widget3_accent_color_v1","widget3_auto_update_v1","widget3_bg_alpha_v1","widget3_enabled_v1","widget3_goal_id_v1","widget3_percent_color_v1","widget3_show_amounts_v1","widget3_show_percent_v1","widget3_text_color_v1","widget_bg_alpha_v1","widget_bg_color_v1","widget_button_style_v1","widget_voice_enabled_v1","widget_expense_color_v1","widget_expense_label_v1","widget_income_color_v1","widget_income_label_v1","widget_show_header_v1","widget_subtitle_v1","widget_title_v1"];
  try{keys.forEach(function(k){localStorage.removeItem(k);});Object.keys(localStorage).forEach(function(k){if(k.indexOf("gsp_view_")===0||k.indexOf("user_")===0)localStorage.removeItem(k);});}catch(e){}
}
export function dateOffset(n){var d=new Date();d.setDate(d.getDate()-n);return d.toISOString().split("T")[0];}
export function todayStr(){return dateOffset(0);}
export function fmtDate(iso,fmt){if(!iso)return "";var p=iso.split("-");if(fmt==="mdy")return p[1]+"/"+p[2]+"/"+p[0];if(fmt==="ymd")return iso;return p[2]+"/"+p[1]+"/"+p[0];}
export function parseMoney(value){
  if(typeof value==="number")return isFinite(value)?value:0;
  var raw=String(value==null?"":value).trim();
  if(!raw)return 0;
  raw=raw.replace(/[^\d,.\-]/g,"");
  var lastComma=raw.lastIndexOf(",");
  var lastDot=raw.lastIndexOf(".");
  if(lastComma>=0&&lastDot>=0){
    raw=lastComma>lastDot?raw.replace(/\./g,"").replace(",","."):raw.replace(/,/g,"");
  }else if(lastComma>=0){
    raw=raw.replace(",",".");
  }
  var n=parseFloat(raw);
  return isNaN(n)?0:n;
}
export function fmtAmt(n,sym){return sym+"\u00A0"+Number(n).toFixed(2).replace(".",",");}
export function rateMonth(item,mk){
  if(!item.rateizzato)return item.date.startsWith(mk)?item.amount:0;
  var s=new Date(item.date);
  var p=mk.split("-");
  var forwardIdx=(parseInt(p[0])-s.getFullYear())*12+(parseInt(p[1])-1-s.getMonth());
  var idx=item.rateDirection==="backward"?-forwardIdx:forwardIdx;
  if(idx<0||idx>=item.rate)return 0;
  return item.amount/item.rate;
}

// ── DATE HELPERS (from working version) ──────────────────────────────────────
export const MONTH_NAMES_TO_NUM = {};
[["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"],
 ["january","february","march","april","may","june","july","august","september","october","november","december"],
 ["enero","febrero","marzo","abril","mayo","junio","julio","agosto","septiembre","octubre","noviembre","diciembre"],
 ["janvier","fevrier","mars","avril","mai","juin","juillet","aout","septembre","octobre","novembre","decembre"]
].forEach(function(arr){arr.forEach(function(n,i){MONTH_NAMES_TO_NUM[n.toLowerCase()]=i+1;});});
["jan","feb","mar","apr","may","jun","jul","aug","sep","oct","nov","dec"].forEach(function(m,i){MONTH_NAMES_TO_NUM[m]=i+1;});
["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"].forEach(function(m,i){MONTH_NAMES_TO_NUM[m]=i+1;});

export function excelSerialToISO(serial) {
  var d = new Date(Date.UTC(1899,11,30) + Math.round(serial)*86400000);
  return d.toISOString().split("T")[0];
}

// Exact replica of parseCellDate from working version
export function parseDateWithFormat(raw, fmt) {
  if (raw===null||raw===undefined||raw==="") return todayStr();
  if (typeof raw==="number") {
    if (raw>40000&&raw<80000) return excelSerialToISO(raw);
  }
  var s = String(raw).trim();
  if (!s) return todayStr();
  // ISO yyyy-mm-dd
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  // "12 gennaio 2026" or "12 Jan 2026"
  var tm = s.match(/^(\d{1,2})[\s\-\/]+([A-Za-zàèéìòùáéíóú]{3,})[\s\-\/,]+(\d{2,4})$/);
  if (tm) {
    var mNum = MONTH_NAMES_TO_NUM[tm[2].toLowerCase()];
    if (mNum) {
      var y = tm[3].length===2 ? "20"+tm[3] : tm[3];
      return y+"-"+String(mNum).padStart(2,"0")+"-"+tm[1].padStart(2,"0");
    }
  }
  var sep = s.includes("/") ? "/" : s.includes(".") ? "." : s.includes("-") ? "-" : null;
  if (sep) {
    var ps = s.split(sep);
    if (ps.length===3) {
      var a=ps[0].trim(),b=ps[1].trim(),c=ps[2].trim();
      // yyyy-mm-dd already caught above, but handle yyyy/mm/dd
      if (a.length===4) return a+"-"+b.padStart(2,"0")+"-"+c.padStart(2,"0");
      var yr = c.length===2 ? "20"+c : c;
      if (fmt==="mdy") return yr+"-"+a.padStart(2,"0")+"-"+b.padStart(2,"0");
      // dmy (default) and auto
      return yr+"-"+b.padStart(2,"0")+"-"+a.padStart(2,"0");
    }
  }
  return todayStr();
}

// ── ANDROID-SAFE DOWNLOAD ────────────────────────────────────────────────────
export function androidDownload(filename,blob,onDone){
  var cap=window.Capacitor;
  if(cap&&cap.Plugins&&cap.Plugins.Filesystem&&cap.Plugins.Share){
    var reader=new FileReader();
    reader.onloadend=function(){
      var b64=reader.result.split(",")[1];
      cap.Plugins.Filesystem.writeFile({path:filename,data:b64,directory:"CACHE",recursive:true})
        .then(function(res){
          return cap.Plugins.Share.share({title:filename,url:res.uri,dialogTitle:"Salva o condividi "+filename});
        })
        .then(function(){if(onDone)onDone();})
        .catch(function(e){console.error(e);if(onDone)onDone();});
    };
    reader.readAsDataURL(blob);
  } else {
    // Fallback web
    var url=URL.createObjectURL(blob);
    var a=document.createElement("a");
    a.href=url;a.download=filename;
    a.style.display="none";
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(url);if(onDone)onDone();},1000);
  }
}

export function exportToCSV(expenses,incomes,cats,methods,dateFmt,cb,filename){var rows=[["Tipo","Data","Importo","Categoria","Metodo","Descrizione","Rateizzato","Rate"]];for(var i=0;i<expenses.length;i++){var e=expenses[i];var c=cats.find(function(x){return x.id===e.catId;})||{name:""};var m=methods.find(function(x){return x.id===e.methodId;})||{name:""};rows.push(["Uscita",fmtDate(e.date,dateFmt),e.amount,c.name,m.name,e.desc||"",e.rateizzato?"SI":"NO",e.rateizzato?e.rate:""]);}for(var j=0;j<incomes.length;j++){var inc=incomes[j];var it=getAllIncomeTypes().find(function(x){return x.id===inc.type;})||{name:inc.type||""};rows.push(["Entrata",fmtDate(inc.date,dateFmt),inc.amount,it.name,"",inc.desc||"",inc.rateizzato?"SI":"NO",inc.rateizzato?inc.rate:""]);}var csv=rows.map(function(r){return r.map(function(c){return '"'+String(c==null?"":c).replace(/"/g,'""')+'"';}).join(",");}).join("\n");androidDownload(filename||"fainance.csv",new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"}),cb);}
export function exportToXLSX(expenses,incomes,cats,methods,dateFmt,cb,filename){function esc(s){return String(s==null?"":s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");}function mkSheet(rows){var x='<?xml version="1.0"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>';for(var ri=0;ri<rows.length;ri++){x+='<row r="'+(ri+1)+'">';for(var ci=0;ci<rows[ri].length;ci++){var cell=rows[ri][ci];var col=String.fromCharCode(65+ci);var addr=col+(ri+1);var v=esc(cell);if(typeof cell==="number"){x+='<c r="'+addr+'" t="n"><v>'+v+'</v></c>';}else{x+='<c r="'+addr+'" t="inlineStr"><is><t>'+v+'</t></is></c>';}}x+='</row>';}return x+'</sheetData></worksheet>';}var eRows=[["Data","Importo","Categoria","Metodo","Descrizione","Rateizzato","Rate"]];for(var ei=0;ei<expenses.length;ei++){var e=expenses[ei];var ec=cats.find(function(x){return x.id===e.catId;})||{name:""};var em=methods.find(function(x){return x.id===e.methodId;})||{name:""};eRows.push([fmtDate(e.date,dateFmt),e.amount,ec.name,em.name,e.desc||"",e.rateizzato?"SI":"NO",e.rateizzato?e.rate:""]);}var iRows=[["Data","Importo","Tipo","Descrizione","Rateizzato","Rate"]];for(var ii=0;ii<incomes.length;ii++){var inc2=incomes[ii];var iit=getAllIncomeTypes().find(function(x){return x.id===inc2.type;})||{name:inc2.type||""};iRows.push([fmtDate(inc2.date,dateFmt),inc2.amount,iit.name,inc2.desc||"",inc2.rateizzato?"SI":"NO",inc2.rateizzato?inc2.rate:""]);}var s1=mkSheet(eRows);var s2=mkSheet(iRows);var wbXml='<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Uscite" sheetId="1" r:id="rId1"/><sheet name="Entrate" sheetId="2" r:id="rId2"/></sheets></workbook>';var relsXml='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/></Relationships>';var ctXml='<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>';var rootRels='<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>';function strBytes(s){var b=new Uint8Array(s.length);for(var i=0;i<s.length;i++)b[i]=s.charCodeAt(i)&0xFF;return b;}function u16(n){return[n&0xFF,(n>>8)&0xFF];}function u32(n){return[n&0xFF,(n>>8)&0xFF,(n>>16)&0xFF,(n>>24)&0xFF];}function calcCrc(data){var tbl=[];for(var n=0;n<256;n++){var cv=n;for(var k=0;k<8;k++)cv=cv&1?(0xEDB88320^(cv>>>1)):cv>>>1;tbl[n]=cv;}var r=0xFFFFFFFF;for(var i=0;i<data.length;i++)r=tbl[(r^data[i])&0xFF]^(r>>>8);return(r^0xFFFFFFFF)>>>0;}function mkEntry(name,dataStr){var nb=strBytes(name);var db=strBytes(dataStr);var cr=calcCrc(db);var lh=[0x50,0x4B,0x03,0x04,20,0,0,0,0,0,0,0,0,0];lh=lh.concat(u32(cr),u32(db.length),u32(db.length),u16(nb.length),u16(0));return{lh:lh,nb:nb,db:db,cr:cr,off:0};}var entries=[mkEntry("[Content_Types].xml",ctXml),mkEntry("_rels/.rels",rootRels),mkEntry("xl/workbook.xml",wbXml),mkEntry("xl/_rels/workbook.xml.rels",relsXml),mkEntry("xl/worksheets/sheet1.xml",s1),mkEntry("xl/worksheets/sheet2.xml",s2)];var zip=[];var off=0;for(var j=0;j<entries.length;j++){entries[j].off=off;var rec=entries[j].lh.concat(Array.from(entries[j].nb),Array.from(entries[j].db));zip=zip.concat(rec);off+=rec.length;}var cdStart=off;var cd=[];for(var j2=0;j2<entries.length;j2++){var en=entries[j2];var cde=[0x50,0x4B,0x01,0x02,20,0,20,0,0,0,0,0,0,0,0,0];cde=cde.concat(u32(en.cr),u32(en.db.length),u32(en.db.length),u16(en.nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(en.off));cde=cde.concat(Array.from(en.nb));cd=cd.concat(cde);}zip=zip.concat(cd);var eocd=[0x50,0x4B,0x05,0x06,0,0,0,0].concat(u16(entries.length),u16(entries.length),u32(cd.length),u32(cdStart),u16(0));zip=zip.concat(eocd);var ua=new Uint8Array(zip);androidDownload(filename||"fainance.xlsx",new Blob([ua],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}),cb);}
export function parseCSVText(text){var lines=text.split(/\r?\n/).filter(function(l){return l.trim();});if(lines.length<2)return null;return lines.map(function(line){var cols=[],cur="",inQ=false;for(var i=0;i<line.length;i++){var ch=line[i];if(ch==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else inQ=!inQ;}else if((ch===','||ch===';')&&!inQ){cols.push(cur.trim());cur="";}else cur+=ch;}cols.push(cur.trim());return cols;});}
export function sortedCats(cats,catOrder,catSortMode,expGrps){var grps=expGrps||DEFAULT_EXPENSE_GROUPS;if(catSortMode==="custom"){return cats.slice().sort(function(a,b){var ia=catOrder.indexOf(a.id),ib=catOrder.indexOf(b.id);if(ia===-1&&ib===-1)return 0;if(ia===-1)return 1;if(ib===-1)return -1;return ia-ib;});}return cats.slice().sort(function(a,b){var gi=grps.findIndex(function(g){return g.id===a.group;});var gj=grps.findIndex(function(g){return g.id===b.group;});return gi-gj;});}
export function sortedMethods(methods,methodOrder,methodSortMode){var active=methods.filter(function(m){return !m.archived;});if(methodSortMode==="custom"){return active.slice().sort(function(a,b){var ia=methodOrder.indexOf(a.id),ib=methodOrder.indexOf(b.id);if(ia===-1&&ib===-1)return 0;if(ia===-1)return 1;if(ib===-1)return -1;return ia-ib;});}if(methodSortMode==="group"){return active.slice().sort(function(a,b){var gl=["conti","carte","altri"];return gl.indexOf(a.group||"altri")-gl.indexOf(b.group||"altri");});}return active;}

// ── CHARTS ───────────────────────────────────────────────────────────────────
