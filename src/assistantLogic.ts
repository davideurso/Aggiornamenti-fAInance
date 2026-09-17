/**
 * Regole centrali dell'assistente fAInance.
 *
 * Questo file è l'unico punto nel quale modificare:
 * - la lingua usata dall'assistente;
 * - le richieste esplicite di cambio lingua;
 * - le istruzioni inviate ai modelli AI;
 * - la modalità di risposta della conversazione Realtime;
 * - i messaggi operativi dell'assistente;
 * - il controllo e l'eventuale correzione di risposte nella lingua sbagliata.
 *
 * La lingua dell'interfaccia non deve mai imporre la lingua della risposta.
 */

export const ASSISTANT_LANGUAGE_POLICY = {
  followLastUserTurn: true,
  explicitLanguageRequestHasPriority: true,
  preserveLockedLanguage: true,
  ignoreInterfaceLanguage: true,
  neverAskToChangeAppLanguage: true,
  neverClaimLanguageLimitation: true,
  translateWrongLanguageAnswers: true,
  realtimeManualResponse: true,
} as const;


export const FAINANCE_PRODUCT_GUIDE = {
  appName:"fAInance",
  reliabilityRules:[
    "For questions about fAInance, use only this product guide, the live financeContext and the available actions/tools.",
    "Never invent a screen, button, path, setting, plan feature or capability.",
    "If the exact procedure is not present in the guide or current context, say that it cannot be verified from the available app information and offer to open the most relevant section.",
    "When the user asks how to do something, provide every required step in order, with short wording.",
    "When an available action can perform the request, explicitly say that the assistant can do it directly and ask only for the missing required values. A write action must still be shown for confirmation before saving."
  ],
  responseStyle:{
    default:"Maximum 3 short sentences or 5 concise bullets. Do not repeat the question and do not add generic introductions.",
    procedures:"Use at most 7 numbered steps, one short sentence per step. Include all required fields and the final save/confirm action.",
    voice:"Keep spoken replies short. For procedures, read only the essential numbered steps and the direct-action offer."
  },
  procedures:{
    createAlert:[
      "Open the Alert section from the bottom navigation, the menu or the Alert quick button on Home.",
      "Tap + New alert.",
      "Enter the alert name and budget amount.",
      "Choose Monthly or Annual.",
      "Optionally enter a custom message.",
      "Choose Single category or Area, select the target, then choose Immediate threshold or After % exceeded; if using percentage, enter the percentage.",
      "Tap Create alert."
    ],
    createAlertWithAssistant:"The assistant can create the alert directly. It needs: name, category or area, budget amount, monthly or annual period, threshold mode and optional custom text. It must present the action for confirmation before saving."
  }
} as const;

export function assistantProductKnowledgeInstruction(){
  return [
    "fAInance product accuracy is mandatory.",
    "Use only FAINANCE_PRODUCT_GUIDE, the supplied live financeContext and available tools/actions.",
    "Never invent UI paths, button names, settings, plan availability or app behavior.",
    "If an exact app procedure is not documented in the supplied guide/context, state that you cannot verify the exact sequence and offer to open the relevant section.",
    "For a how-to request, give all required steps in order and mention that you can perform it directly when an available action supports it.",
    "Be concise: normally no more than 3 short sentences or 5 bullets; procedures may use up to 7 short numbered steps. Avoid introductions, repetition and long conclusions.",
    "Verified Alert procedure: open Alert from the bottom bar, menu or Home quick button; tap + New alert; enter name and budget; choose Monthly or Annual and optional custom text; choose Single category or Area and the target; choose Immediate threshold or After % exceeded and enter the percentage when needed; tap Create alert.",
    "The assistant can create an Alert directly through the create_alert action after collecting name, category or area, amount, period, threshold mode, percentage when needed and optional text; the action must be shown for confirmation before saving."
  ].join(" ");
}

const FAINANCE_ALERT_HELP:Record<string,string> = {
  it:"Per creare un Alert:\n1. Apri Alert dalla barra inferiore, dal menu o dal tasto rapido in Home.\n2. Tocca + Nuovo alert.\n3. Inserisci nome e budget.\n4. Scegli Mensile o Annuale e, se vuoi, un testo personalizzato.\n5. Scegli Singola categoria o Area e seleziona la voce.\n6. Scegli Superamento immediato oppure Dopo % superamento; nel secondo caso inserisci la percentuale.\n7. Tocca Crea alert.\nPosso impostarlo direttamente io: indicami nome, categoria o area, importo, periodo, soglia ed eventuale testo; ti mostrerò la conferma prima di salvarlo.",
  en:"To create an Alert:\n1. Open Alerts from the bottom bar, the menu or the Home quick button.\n2. Tap + New alert.\n3. Enter the name and budget.\n4. Choose Monthly or Annual and optionally add custom text.\n5. Choose Single category or Area and select the item.\n6. Choose Immediate threshold or After % exceeded; for the second option, enter the percentage.\n7. Tap Create alert.\nI can set it up directly: tell me the name, category or area, amount, period, threshold and optional text; I will show you the confirmation before saving.",
  es:"Para crear una Alerta:\n1. Abre Alertas desde la barra inferior, el menú o el acceso rápido de Inicio.\n2. Pulsa + Nueva alerta.\n3. Introduce el nombre y el presupuesto.\n4. Elige Mensual o Anual y, si quieres, añade un texto personalizado.\n5. Elige Categoría individual o Área y selecciona el elemento.\n6. Elige Superación inmediata o Después de superar un %; en el segundo caso, introduce el porcentaje.\n7. Pulsa Crear alerta.\nPuedo configurarla directamente: dime nombre, categoría o área, importe, periodo, umbral y texto opcional; te mostraré la confirmación antes de guardarla.",
  fr:"Pour créer une Alerte :\n1. Ouvrez Alertes depuis la barre inférieure, le menu ou le raccourci de l’accueil.\n2. Touchez + Nouvelle alerte.\n3. Saisissez le nom et le budget.\n4. Choisissez Mensuelle ou Annuelle et ajoutez éventuellement un texte personnalisé.\n5. Choisissez Catégorie unique ou Zone, puis sélectionnez l’élément.\n6. Choisissez Dépassement immédiat ou Après un dépassement en % ; dans le second cas, saisissez le pourcentage.\n7. Touchez Créer l’alerte.\nJe peux la configurer directement : indiquez-moi le nom, la catégorie ou la zone, le montant, la période, le seuil et le texte éventuel ; je vous montrerai la confirmation avant l’enregistrement.",
  de:"So erstellst du einen Alert:\n1. Öffne Alerts über die untere Leiste, das Menü oder die Schnellaktion auf der Startseite.\n2. Tippe auf + Neuer Alert.\n3. Gib Name und Budget ein.\n4. Wähle Monatlich oder Jährlich und optional einen eigenen Text.\n5. Wähle Einzelne Kategorie oder Bereich und anschließend den Eintrag.\n6. Wähle Sofortige Überschreitung oder Nach Überschreitung um %; bei der zweiten Option gib den Prozentsatz ein.\n7. Tippe auf Alert erstellen.\nIch kann ihn direkt einrichten: Nenne mir Name, Kategorie oder Bereich, Betrag, Zeitraum, Schwelle und optionalen Text; vor dem Speichern zeige ich dir die Bestätigung.",
  pt:"Para criar um Alerta:\n1. Abre Alertas pela barra inferior, pelo menu ou pelo atalho na Home.\n2. Toca em + Novo alerta.\n3. Introduz o nome e o orçamento.\n4. Escolhe Mensal ou Anual e, se quiseres, adiciona um texto personalizado.\n5. Escolhe Categoria individual ou Área e seleciona o elemento.\n6. Escolhe Ultrapassagem imediata ou Depois de ultrapassar %; na segunda opção, introduz a percentagem.\n7. Toca em Criar alerta.\nPosso configurá-lo diretamente: indica-me nome, categoria ou área, valor, período, limite e texto opcional; mostrarei a confirmação antes de guardar.",
  pl:"Aby utworzyć Alert:\n1. Otwórz Alerty z dolnego paska, menu lub skrótu na ekranie głównym.\n2. Naciśnij + Nowy alert.\n3. Wpisz nazwę i budżet.\n4. Wybierz Miesięczny lub Roczny i opcjonalnie dodaj własny tekst.\n5. Wybierz Pojedynczą kategorię lub Obszar, a następnie pozycję.\n6. Wybierz Natychmiastowe przekroczenie lub Po przekroczeniu o %; w drugim przypadku wpisz procent.\n7. Naciśnij Utwórz alert.\nMogę ustawić go bezpośrednio: podaj nazwę, kategorię lub obszar, kwotę, okres, próg i opcjonalny tekst; przed zapisaniem pokażę potwierdzenie.",
  nl:"Zo maak je een melding:\n1. Open Meldingen via de onderste balk, het menu of de snelknop op Home.\n2. Tik op + Nieuwe melding.\n3. Vul de naam en het budget in.\n4. Kies Maandelijks of Jaarlijks en voeg eventueel aangepaste tekst toe.\n5. Kies Eén categorie of Gebied en selecteer het item.\n6. Kies Directe overschrijding of Na % overschrijding; vul bij de tweede optie het percentage in.\n7. Tik op Melding maken.\nIk kan dit rechtstreeks instellen: geef naam, categorie of gebied, bedrag, periode, drempel en optionele tekst door; vóór het opslaan toon ik de bevestiging.",
  ro:"Pentru a crea o Alertă:\n1. Deschide Alerte din bara de jos, din meniu sau din butonul rapid de pe Home.\n2. Apasă + Alertă nouă.\n3. Introdu numele și bugetul.\n4. Alege Lunar sau Anual și, opțional, adaugă un text personalizat.\n5. Alege Categorie individuală sau Zonă și selectează elementul.\n6. Alege Depășire imediată sau După depășirea cu %; pentru a doua opțiune, introdu procentul.\n7. Apasă Creează alerta.\nO pot configura direct: spune-mi numele, categoria sau zona, suma, perioada, pragul și textul opțional; îți voi arăta confirmarea înainte de salvare.",
  el:"Για να δημιουργήσετε μια Ειδοποίηση:\n1. Ανοίξτε τις Ειδοποιήσεις από την κάτω μπάρα, το μενού ή τη γρήγορη ενέργεια στην Αρχική.\n2. Πατήστε + Νέα ειδοποίηση.\n3. Εισαγάγετε όνομα και προϋπολογισμό.\n4. Επιλέξτε Μηνιαία ή Ετήσια και προαιρετικά προσθέστε προσαρμοσμένο κείμενο.\n5. Επιλέξτε Μεμονωμένη κατηγορία ή Περιοχή και το αντίστοιχο στοιχείο.\n6. Επιλέξτε Άμεση υπέρβαση ή Μετά από υπέρβαση %· στη δεύτερη επιλογή εισαγάγετε το ποσοστό.\n7. Πατήστε Δημιουργία ειδοποίησης.\nΜπορώ να τη ρυθμίσω απευθείας: πείτε μου όνομα, κατηγορία ή περιοχή, ποσό, περίοδο, όριο και προαιρετικό κείμενο· θα σας δείξω την επιβεβαίωση πριν από την αποθήκευση."
};

export function getFainanceHelpAnswer(question:any,language:any){
  var text=normalizeLanguageText(question);
  if(!text)return "";
  var hasAlert=/(^|\s)(alert|alerts|alerta|alertas|alerte|alertes|avviso|avvisi|warning|warnung|meldingen|melding|powiadomienie|powiadomienia|ειδοποιηση|ειδοποιησεις)(\s|$)/i.test(text);
  var asksHow=/(come|crea|creare|imposta|impostare|configura|configurare|how|create|set|configure|add|como|crear|configurar|comment|creer|créer|configurer|wie|erstellen|einrichten|como|criar|configurar|jak|utworzyc|utworzyć|ustawic|ustawić|hoe|maken|instellen|cum|crea|configurez|πως|πώς|δημιουργ)/i.test(text);
  if(hasAlert&&asksHow){var code=normalizeAssistantLanguageCode(language,"it");return FAINANCE_ALERT_HELP[code]||FAINANCE_ALERT_HELP.en;}
  return "";
}

export function compactAssistantAnswer(answer:any,language?:any,maxChars?:number){
  var text=String(answer||"").replace(/\r\n/g,"\n").replace(/\n{3,}/g,"\n\n").trim();
  if(!text)return text;
  var lines=text.split("\n").map(function(x){return x.trim();}).filter(Boolean);
  if(lines.length>10)text=lines.slice(0,10).join("\n");
  var limit=Math.max(900,Number(maxChars)||1400);
  if(text.length<=limit)return text;
  var slice=text.slice(0,limit);
  var cut=Math.max(slice.lastIndexOf(". "),slice.lastIndexOf("! "),slice.lastIndexOf("? "),slice.lastIndexOf("\n"));
  if(cut<Math.floor(limit*0.65))cut=limit;
  return slice.slice(0,cut).trim().replace(/[,:;\-–—]+$/g,"")+"…";
}

export const ASSISTANT_SUPPORTED_LANGUAGES = [
  "it","en","es","fr","de","pt","pl","nl","ro","el",
  "ja","zh","ko","ar","ru","tr","sv","da","no","fi","cs","hu","uk","hi","id","fil","vi","th","he"
] as const;
export type AssistantLanguage = typeof ASSISTANT_SUPPORTED_LANGUAGES[number];
export type AssistantLanguageMode = "auto" | "locked";
export type AssistantLanguageRequestMode = "auto" | "locked" | "one_turn";

export type AssistantConversationLanguageState = {
  mode: AssistantLanguageMode;
  activeLanguage: string;
  activeLanguageName: string;
  lastDetectedUserLanguage: string;
  lastDetectedUserLanguageName: string;
  explicitLanguageRequest: boolean;
};

export type AssistantLanguageTurnResolution = {
  language: string;
  languageName: string;
  detectedUserLanguage: string;
  detectedUserLanguageName: string;
  confidence: number;
  reason: "explicit_language_request" | "auto_mode_request" | "locked_language" | "detected_user_language" | "ambiguous_fallback";
  requestMode: AssistantLanguageRequestMode | null;
  isLanguageControlOnly: boolean;
  state: AssistantConversationLanguageState;
};

type LanguageDescriptor = {code:string;name:string;locale:string;aliases:string[]};

const LANGUAGE_CATALOG:Record<string,LanguageDescriptor> = {
  it:{code:"it",name:"Italian",locale:"it-IT",aliases:["italiano","italiana","italian","italien","italiano lingua"]},
  en:{code:"en",name:"English",locale:"en-US",aliases:["inglese","english","anglais","englisch","ingles","inglês","angielski","engels","engleza","αγγλικα"]},
  es:{code:"es",name:"Spanish",locale:"es-ES",aliases:["spagnolo","spagnola","spanish","espanol","español","espagnol","spanisch","espanhol","hiszpanski","spaans","spaniola","ισπανικα"]},
  fr:{code:"fr",name:"French",locale:"fr-FR",aliases:["francese","french","francais","français","franzosisch","französisch","frances","francês","francuski","frans","franceza","γαλλικα"]},
  de:{code:"de",name:"German",locale:"de-DE",aliases:["tedesco","german","allemand","deutsch","aleman","alemán","alemao","alemão","niemiecki","duits","germana","γερμανικα"]},
  pt:{code:"pt",name:"Portuguese",locale:"pt-PT",aliases:["portoghese","portuguese","portugais","portugues","português","portugiesisch","portugalski","portugees","portugheza","πορτογαλικα"]},
  pl:{code:"pl",name:"Polish",locale:"pl-PL",aliases:["polacco","polish","polonais","polnisch","polaco","polski","pools","poloneza","πολωνικα"]},
  nl:{code:"nl",name:"Dutch",locale:"nl-NL",aliases:["olandese","dutch","neerlandais","niederlandisch","niederländisch","holandes","holandês","niderlandzki","nederlands","olandeza","ολλανδικα"]},
  ro:{code:"ro",name:"Romanian",locale:"ro-RO",aliases:["rumeno","rumena","romanian","roumain","rumanisch","rumano","romeno","rumunski","roemeens","romana","română","ρουμανικα"]},
  el:{code:"el",name:"Greek",locale:"el-GR",aliases:["greco","greca","greek","grec","griechisch","griego","grego","grecki","grieks","greaca","ελληνικα","ελληνικά"]},
  ja:{code:"ja",name:"Japanese",locale:"ja-JP",aliases:["giapponese","japanese","japonais","japanisch","japones","japonês","japonski","japans","japoneza","ιαπωνικα","日本語"]},
  zh:{code:"zh",name:"Chinese",locale:"zh-CN",aliases:["cinese","chinese","chinois","chinesisch","chino","chines","chinês","chinski","chiński","chinees","chineza","κινεζικα","中文","mandarino","mandarin"]},
  ko:{code:"ko",name:"Korean",locale:"ko-KR",aliases:["coreano","korean","coreen","coréen","koreanisch","coreano","koreanski","koreaans","coreeana","κορεατικα","한국어"]},
  ar:{code:"ar",name:"Arabic",locale:"ar-SA",aliases:["arabo","arabic","arabe","arabisch","arabe","arabski","arabisch taal","araba","αραβικα","العربية"]},
  ru:{code:"ru",name:"Russian",locale:"ru-RU",aliases:["russo","russa","russian","russe","russisch","ruso","rosyjski","russisch taal","rusa","ρωσικα","русский"]},
  tr:{code:"tr",name:"Turkish",locale:"tr-TR",aliases:["turco","turkish","turc","turkisch","turco","turecki","turks","turca","τουρκικα","türkçe"]},
  sv:{code:"sv",name:"Swedish",locale:"sv-SE",aliases:["svedese","swedish","suedois","suédois","schwedisch","sueco","szwedzki","zweeds","suedeza","σουηδικα","svenska"]},
  da:{code:"da",name:"Danish",locale:"da-DK",aliases:["danese","danish","danois","danisch","danes","duński","deens","daneza","δανικα","dansk"]},
  no:{code:"no",name:"Norwegian",locale:"nb-NO",aliases:["norvegese","norwegian","norvegien","norwegisch","noruego","norweski","noors","norvegiana","νορβηγικα","norsk"]},
  fi:{code:"fi",name:"Finnish",locale:"fi-FI",aliases:["finlandese","finnish","finnois","finnisch","finlandes","finski","fins","finlandeza","φινλανδικα","suomi"]},
  cs:{code:"cs",name:"Czech",locale:"cs-CZ",aliases:["ceco","ceca","czech","tcheque","tschechisch","checo","czeski","tsjechisch","ceha","τσεχικα","čeština"]},
  hu:{code:"hu",name:"Hungarian",locale:"hu-HU",aliases:["ungherese","hungarian","hongrois","ungarisch","hungaro","húngaro","wegierski","hongaars","maghiara","ουγγρικα","magyar"]},
  uk:{code:"uk",name:"Ukrainian",locale:"uk-UA",aliases:["ucraino","ucraina","ukrainian","ukrainien","ukrainisch","ucraniano","ukrainski","oekraiens","ucraineana","ουκρανικα","українська"]},
  hi:{code:"hi",name:"Hindi",locale:"hi-IN",aliases:["hindi","indiano hindi","हिन्दी","हिंदी"]},
  id:{code:"id",name:"Indonesian",locale:"id-ID",aliases:["indonesiano","indonesian","indonesien","indonesisch","indonesio","indonezyjski","indonesisch taal","indoneziana","ινδονησιακα","bahasa indonesia"]},
  fil:{code:"fil",name:"Filipino",locale:"fil-PH",aliases:["filippino","filipino","tagalog","pilipino"]},
  vi:{code:"vi",name:"Vietnamese",locale:"vi-VN",aliases:["vietnamita","vietnamese","vietnamien","vietnamesisch","wietnamski","vietnamees","vietnameza","βιετναμεζικα","tiếng việt"]},
  th:{code:"th",name:"Thai",locale:"th-TH",aliases:["thailandese","thai","thailandais","thailändisch","tailandes","tajski","thais","tailandeza","ταϊλανδικα","ภาษาไทย"]},
  he:{code:"he",name:"Hebrew",locale:"he-IL",aliases:["ebraico","hebrew","hebreu","hebräisch","hebreo","hebrajski","hebreeuws","ebraica","εβραϊκα","עברית"]},
};

const LANGUAGE_NAMES_EN:Record<string,string> = Object.keys(LANGUAGE_CATALOG).reduce(function(out:any,code){out[code]=LANGUAGE_CATALOG[code].name;return out;},{});

const HEARING_REPLIES:Record<string,string> = {
  it:"Sì, ti sento.", en:"Yes, I can hear you.", es:"Sí, te escucho.", fr:"Oui, je vous entends.", de:"Ja, ich höre dich.",
  pt:"Sim, consigo ouvir-te.", pl:"Tak, słyszę Cię.", nl:"Ja, ik hoor je.", ro:"Da, te aud.", el:"Ναι, σας ακούω.",
  ja:"はい、聞こえます。", zh:"是的，我能听到你。", ko:"네, 잘 들립니다.", ar:"نعم، أستطيع سماعك.", ru:"Да, я вас слышу.",
  tr:"Evet, seni duyabiliyorum.", sv:"Ja, jag hör dig.", da:"Ja, jeg kan høre dig.", no:"Ja, jeg hører deg.", fi:"Kyllä, kuulen sinut.",
  cs:"Ano, slyším vás.", hu:"Igen, hallom.", uk:"Так, я вас чую.", hi:"हाँ, मैं आपको सुन सकता हूँ।", id:"Ya, saya bisa mendengar Anda.",
  fil:"Oo, naririnig kita.", vi:"Vâng, tôi nghe thấy bạn.", th:"ได้ยินคุณครับ/ค่ะ", he:"כן, אני שומע אותך."
};

type RuntimeKey = "done"|"cancelled"|"error"|"noAnswer"|"sectionOpened"|"noValidAction"|"invalidArguments"|"toolUnavailable"|"notReady"|"offline"|"sessionExpired"|"rateLimited"|"timeout"|"interrupted"|"unavailable"|"repeatCloser"|"audioFailed"|"unsupportedDevice"|"permissionDenied";

const RUNTIME_REPLIES:Record<string,Record<RuntimeKey,string>> = {
  it:{done:"Operazione completata.",cancelled:"Operazione annullata.",error:"Si è verificato un errore.",noAnswer:"Non ho ricevuto una risposta. Riprova.",sectionOpened:"Sezione aperta.",noValidAction:"Nessuna azione valida.",invalidArguments:"Argomenti non validi.",toolUnavailable:"Strumento non disponibile.",notReady:"La conversazione non è ancora pronta. Attendi il messaggio “Microfono pronto” e riprova.",offline:"Sei offline. Controlla la connessione e riprova.",sessionExpired:"La sessione è scaduta. Accedi di nuovo e riapri l’assistente.",rateLimited:"L’assistente è molto richiesto in questo momento. Attendi qualche secondo e riprova.",timeout:"La connessione sta impiegando troppo tempo. Tocca Avvia per riprovare.",interrupted:"La conversazione si è interrotta. Tocca Avvia per riprovare.",unavailable:"La conversazione vocale non è disponibile in questo momento. Tocca Avvia per riprovare.",repeatCloser:"Non ho capito bene. Prova a ripetere più vicino al telefono.",audioFailed:"L’audio dell’assistente non è partito. Tocca Avvia per riprovare.",unsupportedDevice:"La conversazione vocale non è supportata su questo dispositivo.",permissionDenied:"Permesso microfono negato. Apri le impostazioni del dispositivo, seleziona fAInance e consenti l’accesso al microfono, poi premi di nuovo Avvia."},
  en:{done:"Operation completed.",cancelled:"Operation cancelled.",error:"An error occurred.",noAnswer:"I did not receive a response. Please try again.",sectionOpened:"Section opened.",noValidAction:"No valid action was found.",invalidArguments:"Invalid arguments.",toolUnavailable:"This tool is not available.",notReady:"The conversation is not ready yet. Wait for “Microphone ready” and try again.",offline:"You are offline. Check your connection and try again.",sessionExpired:"The session has expired. Sign in again and reopen the assistant.",rateLimited:"The assistant is very busy right now. Wait a few seconds and try again.",timeout:"The connection is taking too long. Tap Start to try again.",interrupted:"The conversation was interrupted. Tap Start to try again.",unavailable:"Voice conversation is unavailable right now. Tap Start to try again.",repeatCloser:"I did not understand clearly. Please repeat closer to the phone.",audioFailed:"The assistant audio did not start. Tap Start to try again.",unsupportedDevice:"Voice conversation is not supported on this device.",permissionDenied:"Microphone permission denied. Open the device settings, select fAInance, allow microphone access, then tap Start again."},
  es:{done:"Operación completada.",cancelled:"Operación cancelada.",error:"Se ha producido un error.",noAnswer:"No he recibido una respuesta. Inténtalo de nuevo.",sectionOpened:"Sección abierta.",noValidAction:"No se ha encontrado ninguna acción válida.",invalidArguments:"Argumentos no válidos.",toolUnavailable:"Esta herramienta no está disponible.",notReady:"La conversación aún no está lista. Espera el mensaje “Micrófono listo” e inténtalo de nuevo.",offline:"No tienes conexión. Comprueba la conexión e inténtalo de nuevo.",sessionExpired:"La sesión ha caducado. Inicia sesión de nuevo y vuelve a abrir el asistente.",rateLimited:"El asistente tiene mucha demanda en este momento. Espera unos segundos e inténtalo de nuevo.",timeout:"La conexión está tardando demasiado. Pulsa Iniciar para volver a intentarlo.",interrupted:"La conversación se ha interrumpido. Pulsa Iniciar para volver a intentarlo.",unavailable:"La conversación por voz no está disponible en este momento. Pulsa Iniciar para volver a intentarlo.",repeatCloser:"No lo he entendido bien. Repite más cerca del teléfono.",audioFailed:"El audio del asistente no se ha iniciado. Pulsa Iniciar para volver a intentarlo.",unsupportedDevice:"La conversación por voz no es compatible con este dispositivo.",permissionDenied:"Permiso de micrófono denegado. Abre los ajustes del dispositivo, selecciona fAInance, permite el acceso al micrófono y pulsa de nuevo Iniciar."},
  fr:{done:"Opération terminée.",cancelled:"Opération annulée.",error:"Une erreur s’est produite.",noAnswer:"Je n’ai reçu aucune réponse. Réessayez.",sectionOpened:"Section ouverte.",noValidAction:"Aucune action valide n’a été trouvée.",invalidArguments:"Arguments non valides.",toolUnavailable:"Cet outil n’est pas disponible.",notReady:"La conversation n’est pas encore prête. Attendez le message « Microphone prêt » et réessayez.",offline:"Vous êtes hors ligne. Vérifiez votre connexion et réessayez.",sessionExpired:"La session a expiré. Reconnectez-vous et rouvrez l’assistant.",rateLimited:"L’assistant est très sollicité en ce moment. Attendez quelques secondes et réessayez.",timeout:"La connexion prend trop de temps. Appuyez sur Démarrer pour réessayer.",interrupted:"La conversation a été interrompue. Appuyez sur Démarrer pour réessayer.",unavailable:"La conversation vocale n’est pas disponible pour le moment. Appuyez sur Démarrer pour réessayer.",repeatCloser:"Je n’ai pas bien compris. Répétez plus près du téléphone.",audioFailed:"Le son de l’assistant n’a pas démarré. Appuyez sur Démarrer pour réessayer.",unsupportedDevice:"La conversation vocale n’est pas prise en charge sur cet appareil.",permissionDenied:"Autorisation du microphone refusée. Ouvrez les réglages de l’appareil, sélectionnez fAInance, autorisez le microphone, puis appuyez de nouveau sur Démarrer."},
  de:{done:"Vorgang abgeschlossen.",cancelled:"Vorgang abgebrochen.",error:"Ein Fehler ist aufgetreten.",noAnswer:"Ich habe keine Antwort erhalten. Bitte versuche es erneut.",sectionOpened:"Bereich geöffnet.",noValidAction:"Keine gültige Aktion gefunden.",invalidArguments:"Ungültige Argumente.",toolUnavailable:"Dieses Werkzeug ist nicht verfügbar.",notReady:"Die Unterhaltung ist noch nicht bereit. Warte auf „Mikrofon bereit“ und versuche es erneut.",offline:"Du bist offline. Prüfe die Verbindung und versuche es erneut.",sessionExpired:"Die Sitzung ist abgelaufen. Melde dich erneut an und öffne den Assistenten noch einmal.",rateLimited:"Der Assistent ist gerade stark ausgelastet. Warte einige Sekunden und versuche es erneut.",timeout:"Die Verbindung dauert zu lange. Tippe auf Start, um es erneut zu versuchen.",interrupted:"Die Unterhaltung wurde unterbrochen. Tippe auf Start, um es erneut zu versuchen.",unavailable:"Die Sprachunterhaltung ist derzeit nicht verfügbar. Tippe auf Start, um es erneut zu versuchen.",repeatCloser:"Ich habe dich nicht gut verstanden. Sprich bitte näher am Telefon.",audioFailed:"Die Audioausgabe des Assistenten wurde nicht gestartet. Tippe auf Start, um es erneut zu versuchen.",unsupportedDevice:"Sprachunterhaltung wird auf diesem Gerät nicht unterstützt.",permissionDenied:"Mikrofonzugriff verweigert. Öffne die Geräteeinstellungen, wähle fAInance, erlaube den Mikrofonzugriff und tippe erneut auf Start."},
  pt:{done:"Operação concluída.",cancelled:"Operação cancelada.",error:"Ocorreu um erro.",noAnswer:"Não recebi uma resposta. Tenta novamente.",sectionOpened:"Secção aberta.",noValidAction:"Não foi encontrada nenhuma ação válida.",invalidArguments:"Argumentos inválidos.",toolUnavailable:"Esta ferramenta não está disponível.",notReady:"A conversa ainda não está pronta. Aguarda a mensagem “Microfone pronto” e tenta novamente.",offline:"Estás offline. Verifica a ligação e tenta novamente.",sessionExpired:"A sessão expirou. Inicia sessão novamente e volta a abrir o assistente.",rateLimited:"O assistente está muito solicitado neste momento. Aguarda alguns segundos e tenta novamente.",timeout:"A ligação está a demorar demasiado. Toca em Iniciar para tentar novamente.",interrupted:"A conversa foi interrompida. Toca em Iniciar para tentar novamente.",unavailable:"A conversa por voz não está disponível neste momento. Toca em Iniciar para tentar novamente.",repeatCloser:"Não percebi bem. Repete mais perto do telefone.",audioFailed:"O áudio do assistente não iniciou. Toca em Iniciar para tentar novamente.",unsupportedDevice:"A conversa por voz não é suportada neste dispositivo.",permissionDenied:"Permissão do microfone negada. Abre as definições do dispositivo, seleciona fAInance, permite o acesso ao microfone e toca novamente em Iniciar."},
  pl:{done:"Operacja zakończona.",cancelled:"Operacja anulowana.",error:"Wystąpił błąd.",noAnswer:"Nie otrzymałem odpowiedzi. Spróbuj ponownie.",sectionOpened:"Sekcja została otwarta.",noValidAction:"Nie znaleziono prawidłowej akcji.",invalidArguments:"Nieprawidłowe argumenty.",toolUnavailable:"To narzędzie jest niedostępne.",notReady:"Rozmowa nie jest jeszcze gotowa. Poczekaj na komunikat „Mikrofon gotowy” i spróbuj ponownie.",offline:"Jesteś offline. Sprawdź połączenie i spróbuj ponownie.",sessionExpired:"Sesja wygasła. Zaloguj się ponownie i otwórz asystenta.",rateLimited:"Asystent jest teraz bardzo obciążony. Poczekaj kilka sekund i spróbuj ponownie.",timeout:"Połączenie trwa zbyt długo. Dotknij Start, aby spróbować ponownie.",interrupted:"Rozmowa została przerwana. Dotknij Start, aby spróbować ponownie.",unavailable:"Rozmowa głosowa jest teraz niedostępna. Dotknij Start, aby spróbować ponownie.",repeatCloser:"Nie zrozumiałem wyraźnie. Powtórz bliżej telefonu.",audioFailed:"Dźwięk asystenta nie uruchomił się. Dotknij Start, aby spróbować ponownie.",unsupportedDevice:"Rozmowa głosowa nie jest obsługiwana na tym urządzeniu.",permissionDenied:"Odmówiono dostępu do mikrofonu. Otwórz ustawienia urządzenia, wybierz fAInance, zezwól na dostęp do mikrofonu i ponownie naciśnij Start."},
  nl:{done:"Bewerking voltooid.",cancelled:"Bewerking geannuleerd.",error:"Er is een fout opgetreden.",noAnswer:"Ik heb geen antwoord ontvangen. Probeer het opnieuw.",sectionOpened:"Sectie geopend.",noValidAction:"Geen geldige actie gevonden.",invalidArguments:"Ongeldige argumenten.",toolUnavailable:"Deze functie is niet beschikbaar.",notReady:"Het gesprek is nog niet klaar. Wacht op “Microfoon gereed” en probeer opnieuw.",offline:"Je bent offline. Controleer de verbinding en probeer opnieuw.",sessionExpired:"De sessie is verlopen. Meld je opnieuw aan en open de assistent opnieuw.",rateLimited:"De assistent is momenteel erg druk. Wacht een paar seconden en probeer opnieuw.",timeout:"De verbinding duurt te lang. Tik op Start om opnieuw te proberen.",interrupted:"Het gesprek is onderbroken. Tik op Start om opnieuw te proberen.",unavailable:"Spraakgesprek is momenteel niet beschikbaar. Tik op Start om opnieuw te proberen.",repeatCloser:"Ik heb je niet goed verstaan. Herhaal het dichter bij de telefoon.",audioFailed:"De audio van de assistent is niet gestart. Tik op Start om opnieuw te proberen.",unsupportedDevice:"Spraakgesprek wordt niet ondersteund op dit apparaat.",permissionDenied:"Microfoontoegang geweigerd. Open de apparaatinstellingen, selecteer fAInance, sta microfoontoegang toe en tik opnieuw op Start."},
  ro:{done:"Operațiune finalizată.",cancelled:"Operațiune anulată.",error:"A apărut o eroare.",noAnswer:"Nu am primit niciun răspuns. Încearcă din nou.",sectionOpened:"Secțiune deschisă.",noValidAction:"Nu a fost găsită nicio acțiune validă.",invalidArguments:"Argumente nevalide.",toolUnavailable:"Acest instrument nu este disponibil.",notReady:"Conversația nu este încă pregătită. Așteaptă mesajul „Microfon pregătit” și încearcă din nou.",offline:"Ești offline. Verifică conexiunea și încearcă din nou.",sessionExpired:"Sesiunea a expirat. Autentifică-te din nou și redeschide asistentul.",rateLimited:"Asistentul este foarte solicitat în acest moment. Așteaptă câteva secunde și încearcă din nou.",timeout:"Conexiunea durează prea mult. Apasă Pornire pentru a încerca din nou.",interrupted:"Conversația a fost întreruptă. Apasă Pornire pentru a încerca din nou.",unavailable:"Conversația vocală nu este disponibilă momentan. Apasă Pornire pentru a încerca din nou.",repeatCloser:"Nu am înțeles bine. Repetă mai aproape de telefon.",audioFailed:"Sunetul asistentului nu a pornit. Apasă Pornire pentru a încerca din nou.",unsupportedDevice:"Conversația vocală nu este acceptată pe acest dispozitiv.",permissionDenied:"Permisiunea pentru microfon a fost refuzată. Deschide setările dispozitivului, selectează fAInance, permite accesul la microfon și apasă din nou Pornire."},
  el:{done:"Η ενέργεια ολοκληρώθηκε.",cancelled:"Η ενέργεια ακυρώθηκε.",error:"Παρουσιάστηκε σφάλμα.",noAnswer:"Δεν έλαβα απάντηση. Δοκιμάστε ξανά.",sectionOpened:"Η ενότητα άνοιξε.",noValidAction:"Δεν βρέθηκε έγκυρη ενέργεια.",invalidArguments:"Μη έγκυρα ορίσματα.",toolUnavailable:"Αυτό το εργαλείο δεν είναι διαθέσιμο.",notReady:"Η συνομιλία δεν είναι ακόμη έτοιμη. Περιμένετε το μήνυμα «Το μικρόφωνο είναι έτοιμο» και δοκιμάστε ξανά.",offline:"Είστε εκτός σύνδεσης. Ελέγξτε τη σύνδεση και δοκιμάστε ξανά.",sessionExpired:"Η συνεδρία έληξε. Συνδεθείτε ξανά και ανοίξτε τον βοηθό.",rateLimited:"Ο βοηθός έχει μεγάλη ζήτηση αυτή τη στιγμή. Περιμένετε λίγα δευτερόλεπτα και δοκιμάστε ξανά.",timeout:"Η σύνδεση καθυστερεί πολύ. Πατήστε Έναρξη για να δοκιμάσετε ξανά.",interrupted:"Η συνομιλία διακόπηκε. Πατήστε Έναρξη για να δοκιμάσετε ξανά.",unavailable:"Η φωνητική συνομιλία δεν είναι διαθέσιμη αυτή τη στιγμή. Πατήστε Έναρξη για να δοκιμάσετε ξανά.",repeatCloser:"Δεν κατάλαβα καθαρά. Επαναλάβετε πιο κοντά στο τηλέφωνο.",audioFailed:"Ο ήχος του βοηθού δεν ξεκίνησε. Πατήστε Έναρξη για να δοκιμάσετε ξανά.",unsupportedDevice:"Η φωνητική συνομιλία δεν υποστηρίζεται σε αυτή τη συσκευή.",permissionDenied:"Η άδεια μικροφώνου απορρίφθηκε. Ανοίξτε τις ρυθμίσεις της συσκευής, επιλέξτε fAInance, επιτρέψτε την πρόσβαση στο μικρόφωνο και πατήστε ξανά Έναρξη."}
};

const LANGUAGE_CHANGED_REPLIES:Record<string,string> = {
  it:"Va bene. Da ora continuerò in italiano.", en:"Of course. I’ll continue in English from now on.", es:"De acuerdo. A partir de ahora continuaré en español.", fr:"D’accord. Je continuerai désormais en français.", de:"Natürlich. Ich werde ab jetzt auf Deutsch weitermachen.", pt:"Claro. A partir de agora continuarei em português.", pl:"Oczywiście. Od teraz będę kontynuować po polsku.", nl:"Natuurlijk. Vanaf nu ga ik verder in het Nederlands.", ro:"Desigur. De acum înainte voi continua în română.", el:"Βεβαίως. Από εδώ και πέρα θα συνεχίσω στα ελληνικά.",
  ja:"もちろんです。これから日本語で続けます。", zh:"当然可以。从现在起我会用中文继续。", ko:"물론입니다. 이제부터 한국어로 계속하겠습니다.", ar:"بالطبع. سأتابع باللغة العربية من الآن فصاعدًا.", ru:"Конечно. С этого момента я буду продолжать на русском языке.", tr:"Elbette. Bundan sonra Türkçe devam edeceğim.", sv:"Självklart. Från och med nu fortsätter jag på svenska.", da:"Selvfølgelig. Fra nu af fortsætter jeg på dansk.", no:"Selvfølgelig. Fra nå av fortsetter jeg på norsk.", fi:"Totta kai. Jatkan tästä lähtien suomeksi.", cs:"Samozřejmě. Odteď budu pokračovat česky.", hu:"Természetesen. Mostantól magyarul folytatom.", uk:"Звичайно. Відтепер я продовжуватиму українською.", hi:"बिल्कुल। अब से मैं हिंदी में जारी रखूँगा।", id:"Tentu. Mulai sekarang saya akan melanjutkan dalam bahasa Indonesia.", fil:"Siyempre. Mula ngayon, magpapatuloy ako sa Filipino.", vi:"Tất nhiên. Từ bây giờ tôi sẽ tiếp tục bằng tiếng Việt.", th:"ได้เลย ต่อจากนี้ฉันจะใช้ภาษาไทย", he:"כמובן. מעכשיו אמשיך בעברית."
};

const ONE_TURN_LANGUAGE_REPLIES:Record<string,string> = {
  it:"Va bene. Userò l’italiano solo per questa risposta.", en:"Of course. I’ll use English for this response only.", es:"De acuerdo. Usaré el español solo para esta respuesta.", fr:"D’accord. J’utiliserai le français uniquement pour cette réponse.", de:"Natürlich. Ich verwende Deutsch nur für diese Antwort.", pt:"Claro. Usarei português apenas nesta resposta.", pl:"Oczywiście. Użyję polskiego tylko w tej odpowiedzi.", nl:"Natuurlijk. Ik gebruik Nederlands alleen voor dit antwoord.", ro:"Desigur. Voi folosi româna doar pentru acest răspuns.", el:"Βεβαίως. Θα χρησιμοποιήσω τα ελληνικά μόνο για αυτή την απάντηση."
};

const AUTO_LANGUAGE_REPLIES:Record<string,string> = {
  it:"Va bene. Risponderò nella lingua che usi di volta in volta.", en:"Of course. I’ll reply in whichever language you use each time.", es:"De acuerdo. Responderé en el idioma que utilices en cada momento.", fr:"D’accord. Je répondrai dans la langue que vous utiliserez à chaque fois.", de:"Natürlich. Ich antworte jeweils in der Sprache, die du verwendest.", pt:"Claro. Responderei no idioma que usares em cada momento.", pl:"Oczywiście. Za każdym razem odpowiem w języku, którego użyjesz.", nl:"Natuurlijk. Ik antwoord telkens in de taal die je gebruikt.", ro:"Desigur. Voi răspunde de fiecare dată în limba pe care o folosești.", el:"Βεβαίως. Θα απαντώ κάθε φορά στη γλώσσα που χρησιμοποιείτε."
};

const LANGUAGE_WORDS:Record<string,string[]> = {
  it:["ciao","voglio","vorrei","puoi","potresti","devo","sono","parlo","parlato","rispondi","rispondermi","lingua","italiano","oggi","ieri","spesa","entrata","obiettivo","perche","quanto","come","dove","quando","questo","questa","non","con","della","nelle","allora","che","mi","ti","ho","hai","fatto","fammi"],
  en:["hello","hi","please","want","would","can","could","should","speak","spoken","reply","answer","language","english","today","yesterday","expense","income","goal","why","what","where","when","this","that","the","and","with","have","has","make","show"],
  es:["hola","quiero","quisiera","puedes","podrias","debo","hablo","hablado","responde","idioma","espanol","hoy","ayer","gasto","ingreso","objetivo","porque","cuanto","como","donde","cuando","esto","esta","que","con","para","haz","dime"],
  fr:["bonjour","salut","veux","voudrais","pouvez","pourriez","dois","parle","reponds","repondre","langue","francais","aujourd'hui","hier","depense","revenu","objectif","pourquoi","combien","comment","ou","quand","avec","pour","faites"],
  de:["hallo","mochte","will","kannst","konnten","muss","spreche","gesprochen","antworte","sprache","deutsch","heute","gestern","ausgabe","einnahme","ziel","warum","wieviel","wie","wo","wann","mit","fur","zeige","sag"],
  pt:["ola","quero","gostaria","podes","poderia","devo","falo","falado","responde","idioma","portugues","hoje","ontem","despesa","receita","objetivo","porque","quanto","como","onde","quando","com","para","mostra","diz"],
  pl:["czesc","chce","moge","mozesz","musze","mowie","odpowiedz","jezyk","polski","dzisiaj","wczoraj","wydatek","przychod","cel","dlaczego","ile","jak","gdzie","kiedy","dla","pokaz","powiedz"],
  nl:["hallo","wil","zou","kan","kunt","moet","spreek","gesproken","antwoord","taal","nederlands","vandaag","gisteren","uitgave","inkomen","doel","waarom","hoeveel","hoe","waar","wanneer","met","voor","toon","zeg"],
  ro:["salut","vreau","poti","trebuie","vorbesc","vorbit","raspunde","limba","romana","azi","ieri","cheltuiala","venit","obiectiv","de ce","cat","cum","unde","cand","cu","pentru","arata","spune"],
  el:["γεια","θελω","μπορεις","πρεπει","μιλαω","απαντησε","γλωσσα","ελληνικα","σημερα","χθες","εξοδο","εσοδο","στοχος","γιατι","ποσο","πως","που","ποτε","με","για","δειξε"]
};

function normalizeLanguageText(value:any){
  return String(value||"")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .replace(/[^0-9a-zA-Z\u00C0-\u024F\u0370-\u03FF\u0400-\u04FF\u0590-\u05FF\u0600-\u06FF\u0900-\u097F\u0E00-\u0E7F\u3040-\u30FF\u3400-\u9FFF\uAC00-\uD7AF\s']/g," ")
    .replace(/\s+/g," ")
    .trim();
}

function escapeRegex(value:any){return String(value||"").replace(/[.*+?^${}()|[\]\\]/g,"\\$&");}
function exactWordPattern(value:string){return new RegExp("(?:^|\\s)"+escapeRegex(normalizeLanguageText(value))+"(?:$|\\s)","i");}

const ALIAS_INDEX:{alias:string;code:string;name:string}[] = Object.keys(LANGUAGE_CATALOG).reduce(function(all:any[],code){
  var d=LANGUAGE_CATALOG[code];
  [d.name].concat(d.aliases||[]).forEach(function(alias){var clean=normalizeLanguageText(alias);if(clean)all.push({alias:clean,code:d.code,name:d.name});});
  return all;
},[]).sort(function(a,b){return b.alias.length-a.alias.length;});

function languageDescriptor(value:any,fallback:any="it"):LanguageDescriptor{
  var raw=String(value||"").trim();
  var code=raw.toLowerCase().split(/[-_]/)[0];
  if(LANGUAGE_CATALOG[code])return LANGUAGE_CATALOG[code];
  var normalized=normalizeLanguageText(raw);
  var found=ALIAS_INDEX.find(function(x){return x.alias===normalized;});
  if(found&&LANGUAGE_CATALOG[found.code])return LANGUAGE_CATALOG[found.code];
  var fallbackCode=String(fallback||"it").toLowerCase().split(/[-_]/)[0];
  return LANGUAGE_CATALOG[fallbackCode]||LANGUAGE_CATALOG.it;
}

export function normalizeAssistantLanguageCode(value:any,fallback:any="it"):string{return languageDescriptor(value,fallback).code;}
export function assistantLanguageName(code:any){return languageDescriptor(code,"it").name;}
export function assistantSpeechLocale(code:any){return languageDescriptor(code,"it").locale;}

export function detectAssistantTurnLanguageDetailed(value:any,fallback?:string){
  var raw=String(value||"").trim();
  var base=languageDescriptor(fallback,"it");
  if(!raw)return {language:base.code,languageName:base.name,confidence:0.2,ambiguous:true};
  if(/[\u0370-\u03FF]/.test(raw))return {language:"el",languageName:"Greek",confidence:0.99,ambiguous:false};
  if(/[\u0400-\u04FF]/.test(raw)){var c=/[іїєґ]/i.test(raw)?"uk":"ru";return {language:c,languageName:assistantLanguageName(c),confidence:0.95,ambiguous:false};}
  if(/[\u0590-\u05FF]/.test(raw))return {language:"he",languageName:"Hebrew",confidence:0.99,ambiguous:false};
  if(/[\u0600-\u06FF]/.test(raw))return {language:"ar",languageName:"Arabic",confidence:0.99,ambiguous:false};
  if(/[\u0900-\u097F]/.test(raw))return {language:"hi",languageName:"Hindi",confidence:0.99,ambiguous:false};
  if(/[\u0E00-\u0E7F]/.test(raw))return {language:"th",languageName:"Thai",confidence:0.99,ambiguous:false};
  if(/[\u3040-\u30FF]/.test(raw))return {language:"ja",languageName:"Japanese",confidence:0.99,ambiguous:false};
  if(/[\u3400-\u9FFF]/.test(raw))return {language:"zh",languageName:"Chinese",confidence:0.99,ambiguous:false};
  if(/[\uAC00-\uD7AF]/.test(raw))return {language:"ko",languageName:"Korean",confidence:0.99,ambiguous:false};

  var text=normalizeLanguageText(raw);
  var scores:Record<string,number>={it:0,en:0,es:0,fr:0,de:0,pt:0,pl:0,nl:0,ro:0,el:0};
  Object.keys(LANGUAGE_WORDS).forEach(function(code){
    LANGUAGE_WORDS[code].forEach(function(word){var needle=normalizeLanguageText(word);if(exactWordPattern(needle).test(text))scores[code]+=needle.length<=3?1:2;});
  });
  if(/[¿¡ñ]/i.test(raw))scores.es+=5;
  if(/[çœâêîôûëïüÿæ]/i.test(raw))scores.fr+=5;
  if(/[äöüß]/i.test(raw))scores.de+=5;
  if(/[ãõ]/i.test(raw))scores.pt+=5;
  if(/[ąćęłńóśźż]/i.test(raw))scores.pl+=5;
  if(/[ăâîșşțţ]/i.test(raw))scores.ro+=5;
  if(/[àèìòù]/i.test(raw))scores.it+=2;

  var best=base.code,bestScore=0,secondScore=0;
  Object.keys(scores).forEach(function(code){var score=scores[code];if(score>bestScore){secondScore=bestScore;best=code;bestScore=score;}else if(score>secondScore)secondScore=score;});
  var words=raw.split(/\s+/).filter(Boolean).length;
  if(bestScore===0||bestScore===secondScore||(bestScore===1&&words<=2))return {language:base.code,languageName:base.name,confidence:0.25,ambiguous:true};
  var confidence=Math.max(0.55,Math.min(0.98,0.58+(bestScore-secondScore)*0.08+Math.min(words,8)*0.025));
  return {language:best,languageName:assistantLanguageName(best),confidence:confidence,ambiguous:false};
}

export function detectAssistantTurnLanguage(value:any,fallback?:string):string{return detectAssistantTurnLanguageDetailed(value,fallback).language;}

function findRequestedLanguages(raw:any){
  var text=" "+normalizeLanguageText(raw)+" ";
  var byCode:Record<string,{code:string;name:string;alias:string;index:number}>={};
  ALIAS_INDEX.forEach(function(item){var index=text.indexOf(" "+item.alias+" ");if(index<0)return;var previous=byCode[item.code];if(!previous||index<previous.index)byCode[item.code]={code:item.code,name:item.name,alias:item.alias,index:index};});
  return Object.keys(byCode).map(function(code){return byCode[code];}).sort(function(a,b){return a.index-b.index;});
}

function isAutoLanguageRequest(text:string){
  return /(lingua (?:in cui|che) (?:ti )?parlo|stessa lingua (?:che uso|del mio messaggio)|modalita automatica|rileva(?:re)? la lingua|segui la lingua|language i (?:use|speak)|same language (?:i use|as me)|automatic language|idioma (?:en el que|que) (?:te )?hablo|misma lengua|mode automatique|meme langue|même langue|sprache die ich verwende|gleiche sprache|mesma lingua|jezyk ktorego uzywam|de taal die ik gebruik|limba pe care o folosesc|γλωσσα που χρησιμοποιω)/i.test(text);
}

function languageControlIntent(text:string){
  return /(parlami|parla(?:re|mi)?|parli|rispondimi|rispondi|rispondere|rispondessi|scrivimi|continua (?:a parlare|in)|passa (?:a|all)|cambia (?:lingua|in|a)|usa (?:la lingua|l')|speak(?: to me)?|reply(?: to me)?|answer(?: me)?|continue in|switch to|change (?:the )?language|use (?:the )?language|hablame|habla(?:r)?|responde(?:me)?|continua en|cambia (?:el )?idioma|pasa al|parlez-moi|parle(?:r)?|repondez-moi|répondez-moi|continuez en|changez de langue|passez au|sprich(?: mit mir)?|sprechen|antworte(?: mir)?|weiter auf|wechsle zu|fale(?: comigo)?|falar|responda-me|continue em|mude para|mow do mnie|odpowiadaj mi|kontynuuj po|zmien jezyk|spreek(?: met mij)?|antwoord mij|ga verder in|wissel naar|vorbeste-mi|raspunde-mi|continuă în|schimba limba|μιλα(?: μου)?|απαντησε μου|συνεχισε στα|αλλαξε γλωσσα|traduci|translate|traduce|traduisez|ubersetze|übersetze|traduz|przetlumacz|przetłumacz|vertaal|tradu|μεταφρασε|spiegamelo|spiega(?:mi)?|explain|explicamelo|expliquez|erklar|erklär|explica|wyjasnij|wyjaśnij|leg uit|explica-mi|εξηγησε|dimmi|fammi|tell me|show me|dime|muestrame|montre-moi|dis-moi|sag mir|zeig mir|diz-me|mostra-me|powiedz mi|pokaz mi|vertel me|toon me|spune-mi|arata-mi|πες μου|δειξε μου)/i.test(text);
}

function oneTurnLanguageIntent(text:string){
  return /(solo (?:per )?questa risposta|solo questa volta|per questa volta|soltanto questa risposta|just (?:for )?this (?:answer|response|time)|only this (?:answer|response|time)|for this (?:answer|response) only|solo (?:para )?esta respuesta|solo esta vez|uniquement pour cette reponse|seulement cette fois|nur fur diese antwort|nur dieses mal|apenas nesta resposta|so desta vez|tylko w tej odpowiedzi|tylko tym razem|alleen voor dit antwoord|alleen deze keer|doar pentru acest raspuns|doar de data aceasta|μονο για αυτη την απαντηση|μονο αυτη τη φορα|traduci|translate|traduce|traduisez|ubersetze|übersetze|traduz|przetlumacz|przetłumacz|vertaal|tradu|μεταφρασε|spiegamelo|spiega(?:mi)?|explain|explicamelo|expliquez|erklar|erklär|explica|wyjasnij|wyjaśnij|leg uit|explica-mi|εξηγησε|dimmi|fammi|tell me|show me|dime|muestrame|montre-moi|dis-moi|sag mir|zeig mir|diz-me|mostra-me|powiedz mi|pokaz mi|vertel me|toon me|spune-mi|arata-mi|πες μου|δειξε μου)/i.test(text);
}


function explicitOneTurnLanguageIntent(text:string){
  return /(solo (?:per )?questa risposta|solo questa volta|per questa volta|soltanto questa risposta|just (?:for )?this (?:answer|response|time)|only this (?:answer|response|time)|for this (?:answer|response) only|solo (?:para )?esta respuesta|solo esta vez|uniquement pour cette reponse|seulement cette fois|nur fur diese antwort|nur dieses mal|apenas nesta resposta|so desta vez|tylko w tej odpowiedzi|tylko tym razem|alleen voor dit antwoord|alleen deze keer|doar pentru acest raspuns|doar de data aceasta|μονο για αυτη την απαντηση|μονο αυτη τη φορα)/i.test(text);
}

function hasThenLanguageTransition(text:string){
  return /(poi|dopodiche|dopo di che|then|after that|afterwards|despues|después|luego|ensuite|puis|danach|anschliessend|anschließend|depois|em seguida|potem|nastepnie|następnie|daarna|vervolgens|apoi|dupa aceea|după aceea|μετα|μετά)/i.test(text);
}

function persistentLanguageIntent(text:string){
  return /(da ora|d'ora in poi|da questo momento|sempre|continua (?:a parlare|in)|parlami|rispondimi|from now on|going forward|always|continue in|speak to me|reply to me|a partir de ahora|de ahora en adelante|siempre|hablame|respondeme|desormais|à partir de maintenant|toujours|parlez-moi|repondez-moi|ab jetzt|von nun an|immer|sprich mit mir|antworte mir|a partir de agora|daqui em diante|sempre|fale comigo|responda-me|od teraz|zawsze|mow do mnie|odpowiadaj mi|vanaf nu|voortaan|altijd|spreek met mij|antwoord mij|de acum inainte|mereu|vorbeste-mi|raspunde-mi|απο εδω και περα|παντα|μιλα μου|απαντησε μου)/i.test(text);
}

function isLanguageControlOnly(raw:any,requestMode:AssistantLanguageRequestMode){
  var text=normalizeLanguageText(raw);
  if(requestMode==="auto")return text.split(/\s+/).length<=14;
  if(/(traduci|translate|traduce|traduisez|ubersetze|übersetze|traduz|przetlumacz|przetłumacz|vertaal|tradu|μεταφρασε|spiegamelo|spiega(?:mi)?|explain|explicamelo|expliquez|erklar|erklär|explica|wyjasnij|wyjaśnij|leg uit|explica-mi|εξηγησε|dimmi|fammi|tell me|show me|dime|muestrame|montre-moi|dis-moi|sag mir|zeig mir|diz-me|mostra-me|powiedz mi|pokaz mi|vertel me|toon me|spune-mi|arata-mi|πες μου|δειξε μου)/i.test(text))return false;
  if(/\b(quanto|speso|spese|budget|saldo|entrate|uscite|obiettivo|debito|credito|what|how|expense|income|budget|balance|goal|gasto|ingreso|depense|revenu|ausgabe|einnahme|despesa|receita|wydatek|przychod|uitgave|inkomen|cheltuiala|venit|εξοδο|εσοδο)\b/i.test(text))return false;
  if(/\b(e dimmi|e spieg|and tell|and explain|y dime|y explica|et dis|et explique|und sag|und erklar|e diz|e explica|i powiedz|en vertel|si spune|και πες)\b/i.test(text))return false;
  return text.split(/\s+/).length<=16;
}

export function extractAssistantLanguageRequest(value:any){
  var raw=String(value||"").trim();
  var text=normalizeLanguageText(raw);
  if(!text)return null;
  if(isAutoLanguageRequest(text))return {mode:"auto" as AssistantLanguageRequestMode,target:null,isControlOnly:isLanguageControlOnly(raw,"auto")};
  if(!languageControlIntent(text))return null;
  var requestedLanguages=findRequestedLanguages(raw);
  if(!requestedLanguages.length)return null;
  var requested=requestedLanguages[0];
  var afterTarget=requestedLanguages.length>1&&hasThenLanguageTransition(text)?requestedLanguages[1]:null;
  var mode:AssistantLanguageRequestMode=afterTarget||explicitOneTurnLanguageIntent(text)?"one_turn":(persistentLanguageIntent(text)?"locked":(oneTurnLanguageIntent(text)?"one_turn":"locked"));
  return {mode:mode,target:requested,afterTarget:afterTarget,isControlOnly:isLanguageControlOnly(raw,mode)};
}

export function createAssistantConversationLanguageState(fallback:any="it"):AssistantConversationLanguageState{
  var d=languageDescriptor(fallback,"it");
  return {mode:"auto",activeLanguage:d.code,activeLanguageName:d.name,lastDetectedUserLanguage:d.code,lastDetectedUserLanguageName:d.name,explicitLanguageRequest:false};
}

function normalizeConversationState(value:any,fallback:any="it"):AssistantConversationLanguageState{
  var base=createAssistantConversationLanguageState(fallback);
  if(!value||typeof value!=="object")return base;
  var active=languageDescriptor(value.activeLanguage||fallback,fallback);
  var detected=languageDescriptor(value.lastDetectedUserLanguage||active.code,active.code);
  return {mode:value.mode==="locked"?"locked":"auto",activeLanguage:active.code,activeLanguageName:value.activeLanguageName||active.name,lastDetectedUserLanguage:detected.code,lastDetectedUserLanguageName:value.lastDetectedUserLanguageName||detected.name,explicitLanguageRequest:!!value.explicitLanguageRequest};
}

export function resolveAssistantLanguageTurn(value:any,currentState?:AssistantConversationLanguageState,fallback?:string):AssistantLanguageTurnResolution{
  var raw=String(value||"").trim();
  var state=normalizeConversationState(currentState,fallback||"it");
  var detected=detectAssistantTurnLanguageDetailed(raw,state.lastDetectedUserLanguage||fallback||"it");
  var request=extractAssistantLanguageRequest(raw);
  if(request&&request.mode==="auto"){
    var autoState:AssistantConversationLanguageState={mode:"auto",activeLanguage:detected.language,activeLanguageName:detected.languageName,lastDetectedUserLanguage:detected.language,lastDetectedUserLanguageName:detected.languageName,explicitLanguageRequest:true};
    return {language:detected.language,languageName:detected.languageName,detectedUserLanguage:detected.language,detectedUserLanguageName:detected.languageName,confidence:detected.confidence,reason:"auto_mode_request",requestMode:"auto",isLanguageControlOnly:!!request.isControlOnly,state:autoState};
  }
  if(request&&request.target){
    var target=languageDescriptor(request.target.code,state.activeLanguage);
    var nextState:AssistantConversationLanguageState;
    if(request.afterTarget){var after=languageDescriptor(request.afterTarget.code,state.activeLanguage);nextState={mode:"locked",activeLanguage:after.code,activeLanguageName:after.name,lastDetectedUserLanguage:detected.language,lastDetectedUserLanguageName:detected.languageName,explicitLanguageRequest:true};}
    else if(request.mode==="locked")nextState={mode:"locked",activeLanguage:target.code,activeLanguageName:target.name,lastDetectedUserLanguage:detected.language,lastDetectedUserLanguageName:detected.languageName,explicitLanguageRequest:true};
    else nextState={...state,lastDetectedUserLanguage:detected.language,lastDetectedUserLanguageName:detected.languageName,explicitLanguageRequest:true};
    return {language:target.code,languageName:target.name,detectedUserLanguage:detected.language,detectedUserLanguageName:detected.languageName,confidence:0.99,reason:"explicit_language_request",requestMode:request.mode,isLanguageControlOnly:!!request.isControlOnly,state:nextState};
  }
  if(state.mode==="locked"){
    return {language:state.activeLanguage,languageName:state.activeLanguageName,detectedUserLanguage:detected.language,detectedUserLanguageName:detected.languageName,confidence:detected.confidence,reason:"locked_language",requestMode:null,isLanguageControlOnly:false,state:{...state,lastDetectedUserLanguage:detected.language,lastDetectedUserLanguageName:detected.languageName,explicitLanguageRequest:false}};
  }
  var nextAuto={mode:"auto" as AssistantLanguageMode,activeLanguage:detected.language,activeLanguageName:detected.languageName,lastDetectedUserLanguage:detected.language,lastDetectedUserLanguageName:detected.languageName,explicitLanguageRequest:false};
  return {language:detected.language,languageName:detected.languageName,detectedUserLanguage:detected.language,detectedUserLanguageName:detected.languageName,confidence:detected.confidence,reason:detected.ambiguous?"ambiguous_fallback":"detected_user_language",requestMode:null,isLanguageControlOnly:false,state:nextAuto};
}

export function assistantLanguageControlReply(resolution:any){
  if(!resolution||!resolution.isLanguageControlOnly)return "";
  var code=normalizeAssistantLanguageCode(resolution.language,"en");
  if(resolution.requestMode==="auto")return AUTO_LANGUAGE_REPLIES[resolution.detectedUserLanguage]||AUTO_LANGUAGE_REPLIES[code]||AUTO_LANGUAGE_REPLIES.en;
  if(resolution.requestMode==="one_turn")return ONE_TURN_LANGUAGE_REPLIES[code]||"";
  return LANGUAGE_CHANGED_REPLIES[code]||"";
}

export function assistantAnswerNeedsTranslation(answer:any,target:any){
  var expected=normalizeAssistantLanguageCode(target,"it");
  if(!LANGUAGE_WORDS[expected]&&["el","ru","uk","he","ar","hi","th","ja","zh","ko"].indexOf(expected)<0)return false;
  return detectAssistantTurnLanguage(answer,expected)!==expected;
}

export function assistantTurnLanguageInstruction(code:any,options?:any){
  var lang=languageDescriptor(code,"it");
  var languageName=String(options&&options.languageName||lang.name);
  var mode=String(options&&options.mode||"auto");
  var explicit=!!(options&&options.explicitLanguageRequest);
  return [
    "Follow all existing session instructions, financial rules and available tools.",
    assistantProductKnowledgeInstruction(),
    "The language of the app interface is irrelevant and must never influence the answer.",
    "The required response language for this turn is "+languageName+" (language code "+lang.code+").",
    "Reply exclusively in "+languageName+", including confirmations, errors, summaries and tool-related messages.",
    "A user request to change language is always supported, is a conversation control command, and is never outside the assistant scope.",
    "Never claim that changing language is impossible, restricted or limited. Never tell the user to change the app language or Settings.",
    explicit?"The user explicitly requested this language. Comply immediately and do not debate or explain limitations.":"",
    mode==="locked"?"Keep using this language on later turns until the user explicitly selects another language or asks for automatic language detection.":"",
    mode==="one_turn"?"Use this language only for the current answer, then restore the previous conversation language state.":"",
    mode==="auto"?"For later turns, follow the client-provided language decision for each new user message.":""
  ].filter(Boolean).join(" ");
}

export function assistantHearingReply(code:any){return HEARING_REPLIES[normalizeAssistantLanguageCode(code,"en")]||HEARING_REPLIES.en;}
export function assistantRuntimeText(code:any,key:RuntimeKey){var normalized=normalizeAssistantLanguageCode(code,"en");return (RUNTIME_REPLIES[normalized]||RUNTIME_REPLIES.en)[key]||RUNTIME_REPLIES.en[key];}

function resolutionFromOptions(options:any){
  if(options&&options.languageResolution)return options.languageResolution as AssistantLanguageTurnResolution;
  if(options&&options.forcedLanguage){
    var forced=languageDescriptor(options.forcedLanguage,options&&options.fallbackLanguage||"it");
    var state=normalizeConversationState(options&&options.languageState,options&&options.fallbackLanguage||forced.code);
    return {language:forced.code,languageName:forced.name,detectedUserLanguage:detectAssistantTurnLanguage(options&&options.question,state.lastDetectedUserLanguage),detectedUserLanguageName:assistantLanguageName(detectAssistantTurnLanguage(options&&options.question,state.lastDetectedUserLanguage)),confidence:1,reason:"explicit_language_request",requestMode:"one_turn",isLanguageControlOnly:false,state:state} as AssistantLanguageTurnResolution;
  }
  return resolveAssistantLanguageTurn(options&&options.question,options&&options.languageState,options&&options.fallbackLanguage);
}

export function buildAssistantRequestPayload(options:any){
  var question=String(options&&options.question||"").trim();
  var resolution=resolutionFromOptions(options);
  var interfaceLanguage=normalizeAssistantLanguageCode(options&&options.interfaceLanguage,"it");
  var mode=resolution.requestMode||resolution.state.mode;
  return {
    language:resolution.language,
    languageName:resolution.languageName,
    languageState:resolution.state,
    languageResolution:resolution,
    languageControlOnly:resolution.isLanguageControlOnly,
    payload:{
      mode:"assistant",
      question:"[RESPONSE_LANGUAGE="+resolution.language+"; RESPONSE_LANGUAGE_NAME="+resolution.languageName+"; LANGUAGE_MODE="+mode+"] "+question,
      language:resolution.language,
      requestedLanguageName:resolution.languageName,
      languageMode:mode,
      interfaceLanguage:interfaceLanguage,
      aiDataAccess:(options&&options.aiDataAccess)||"summary",
      financeContext:{...((options&&options.financeContext)||{}),language:resolution.language,requestedLanguageName:resolution.languageName,interfaceLanguage:interfaceLanguage,conversationLanguageState:resolution.state,productGuide:FAINANCE_PRODUCT_GUIDE,responseStyle:FAINANCE_PRODUCT_GUIDE.responseStyle},
      chatHistory:Array.isArray(options&&options.chatHistory)?options.chatHistory:[],
      instruction:assistantTurnLanguageInstruction(resolution.language,{languageName:resolution.languageName,mode:mode,explicitLanguageRequest:resolution.reason==="explicit_language_request"}),
    }
  };
}

export function buildFinanceAdviceRequestPayload(options:any){
  var question=String(options&&options.question||"").trim();
  var resolution=resolutionFromOptions(options);
  var interfaceLanguage=normalizeAssistantLanguageCode(options&&options.interfaceLanguage,"it");
  var scopeInstruction=String(options&&options.scopeInstruction||"").trim();
  var financialInstruction=String(options&&options.financialInstruction||"").trim();
  var mode=resolution.requestMode||resolution.state.mode;
  return {
    question:"[RESPONSE_LANGUAGE="+resolution.language+"; RESPONSE_LANGUAGE_NAME="+resolution.languageName+"; LANGUAGE_MODE="+mode+"] "+question,
    language:resolution.language,
    requestedLanguageName:resolution.languageName,
    languageMode:mode,
    languageState:resolution.state,
    languageResolution:resolution,
    languageControlOnly:resolution.isLanguageControlOnly,
    interfaceLanguage:interfaceLanguage,
    context:{...((options&&options.context)||{}),language:resolution.language,requestedLanguageName:resolution.languageName,interfaceLanguage:interfaceLanguage,conversationLanguageState:resolution.state,productGuide:FAINANCE_PRODUCT_GUIDE,responseStyle:FAINANCE_PRODUCT_GUIDE.responseStyle},
    chatHistory:Array.isArray(options&&options.chatHistory)?options.chatHistory:[],
    instruction:[scopeInstruction,assistantTurnLanguageInstruction(resolution.language,{languageName:resolution.languageName,mode:mode,explicitLanguageRequest:resolution.reason==="explicit_language_request"}),financialInstruction].filter(Boolean).join(" ")
  };
}

export function buildFinanceAdviceTranslationPayload(answer:any,target:any){
  var language=normalizeAssistantLanguageCode(target,"it"),languageName=assistantLanguageName(language);
  return {question:"Translate the following answer into "+languageName+". Return only the translated answer, without notes:\n\n"+String(answer||""),language:language,requestedLanguageName:languageName,languageMode:"fixed_translation",context:{app:"fAInance",translationOnly:true,language:language},instruction:"Pure translation. Output exclusively in "+languageName+". Do not add explanations."};
}

export function buildAssistantTranslationPayload(answer:any,target:any){
  var language=normalizeAssistantLanguageCode(target,"it"),languageName=assistantLanguageName(language);
  return {mode:"assistant",question:"Translate the following text into "+languageName+". Return only the translation:\n\n"+String(answer||""),language:language,requestedLanguageName:languageName,languageMode:"fixed_translation",financeContext:{language:language},chatHistory:[],instruction:"Pure translation. Output exclusively in "+languageName+". Do not add explanations."};
}

export function buildRealtimeSessionRequest(options:any){
  var state=normalizeConversationState(options&&options.languageState,options&&options.interfaceLanguage||"it");
  return {languageMode:state.mode,activeLanguage:state.activeLanguage,activeLanguageName:state.activeLanguageName,interfaceLanguage:normalizeAssistantLanguageCode(options&&options.interfaceLanguage,"it"),aiDataAccess:(options&&options.aiDataAccess)||"summary",financeContext:{...((options&&options.financeContext)||{}),conversationLanguageState:state,productGuide:FAINANCE_PRODUCT_GUIDE,responseStyle:FAINANCE_PRODUCT_GUIDE.responseStyle},chatHistory:Array.isArray(options&&options.chatHistory)?options.chatHistory:[]};
}

export function buildRealtimeManualResponseSessionUpdate(){
  return {type:"session.update",session:{type:"realtime",audio:{input:{turn_detection:{type:"server_vad",threshold:0.5,prefix_padding_ms:300,silence_duration_ms:650,create_response:false,interrupt_response:true}}}}};
}

export function buildRealtimeResponseCreate(languageOrResolution:any,extraInstruction?:string){
  var resolution:any=languageOrResolution&&languageOrResolution.language?languageOrResolution:null;
  var language=resolution?resolution.language:languageOrResolution;
  var languageName=resolution?resolution.languageName:assistantLanguageName(language);
  var mode=resolution?(resolution.requestMode||resolution.state&&resolution.state.mode||"auto"):"auto";
  var instruction=[assistantTurnLanguageInstruction(language,{languageName:languageName,mode:mode,explicitLanguageRequest:resolution&&resolution.reason==="explicit_language_request"}),String(extraInstruction||"").trim()].filter(Boolean).join(" ");
  return {type:"response.create",response:{instructions:instruction}};
}
