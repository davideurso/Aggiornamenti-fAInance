/**
 * Regole centrali dell'assistente fAInance.
 *
 * Questo file ├¿ l'unico punto nel quale modificare:
 * - la lingua usata dall'assistente;
 * - le richieste esplicite di cambio lingua;
 * - le istruzioni inviate ai modelli AI;
 * - la modalit├á di risposta della conversazione Realtime;
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
  it:"Per creare un Alert:\n1. Apri Alert dalla barra inferiore, dal menu o dal tasto rapido in Home.\n2. Tocca + Nuovo alert.\n3. Inserisci nome e budget.\n4. Scegli Mensile o Annuale e, se vuoi, un testo personalizzato.\n5. Scegli Singola categoria o Area e seleziona la voce.\n6. Scegli Superamento immediato oppure Dopo % superamento; nel secondo caso inserisci la percentuale.\n7. Tocca Crea alert.\nPosso impostarlo direttamente io: indicami nome, categoria o area, importo, periodo, soglia ed eventuale testo; ti mostrer├▓ la conferma prima di salvarlo.",
  en:"To create an Alert:\n1. Open Alerts from the bottom bar, the menu or the Home quick button.\n2. Tap + New alert.\n3. Enter the name and budget.\n4. Choose Monthly or Annual and optionally add custom text.\n5. Choose Single category or Area and select the item.\n6. Choose Immediate threshold or After % exceeded; for the second option, enter the percentage.\n7. Tap Create alert.\nI can set it up directly: tell me the name, category or area, amount, period, threshold and optional text; I will show you the confirmation before saving.",
  es:"Para crear una Alerta:\n1. Abre Alertas desde la barra inferior, el men├║ o el acceso r├ípido de Inicio.\n2. Pulsa + Nueva alerta.\n3. Introduce el nombre y el presupuesto.\n4. Elige Mensual o Anual y, si quieres, a├▒ade un texto personalizado.\n5. Elige Categor├¡a individual o ├ürea y selecciona el elemento.\n6. Elige Superaci├│n inmediata o Despu├®s de superar un %; en el segundo caso, introduce el porcentaje.\n7. Pulsa Crear alerta.\nPuedo configurarla directamente: dime nombre, categor├¡a o ├írea, importe, periodo, umbral y texto opcional; te mostrar├® la confirmaci├│n antes de guardarla.",
  fr:"Pour cr├®er une Alerte :\n1. Ouvrez Alertes depuis la barre inf├®rieure, le menu ou le raccourci de lÔÇÖaccueil.\n2. Touchez + Nouvelle alerte.\n3. Saisissez le nom et le budget.\n4. Choisissez Mensuelle ou Annuelle et ajoutez ├®ventuellement un texte personnalis├®.\n5. Choisissez Cat├®gorie unique ou Zone, puis s├®lectionnez lÔÇÖ├®l├®ment.\n6. Choisissez D├®passement imm├®diat ou Apr├¿s un d├®passement en % ; dans le second cas, saisissez le pourcentage.\n7. Touchez Cr├®er lÔÇÖalerte.\nJe peux la configurer directement : indiquez-moi le nom, la cat├®gorie ou la zone, le montant, la p├®riode, le seuil et le texte ├®ventuel ; je vous montrerai la confirmation avant lÔÇÖenregistrement.",
  de:"So erstellst du einen Alert:\n1. ├ûffne Alerts ├╝ber die untere Leiste, das Men├╝ oder die Schnellaktion auf der Startseite.\n2. Tippe auf + Neuer Alert.\n3. Gib Name und Budget ein.\n4. W├ñhle Monatlich oder J├ñhrlich und optional einen eigenen Text.\n5. W├ñhle Einzelne Kategorie oder Bereich und anschlie├ƒend den Eintrag.\n6. W├ñhle Sofortige ├£berschreitung oder Nach ├£berschreitung um %; bei der zweiten Option gib den Prozentsatz ein.\n7. Tippe auf Alert erstellen.\nIch kann ihn direkt einrichten: Nenne mir Name, Kategorie oder Bereich, Betrag, Zeitraum, Schwelle und optionalen Text; vor dem Speichern zeige ich dir die Best├ñtigung.",
  pt:"Para criar um Alerta:\n1. Abre Alertas pela barra inferior, pelo menu ou pelo atalho na Home.\n2. Toca em + Novo alerta.\n3. Introduz o nome e o or├ºamento.\n4. Escolhe Mensal ou Anual e, se quiseres, adiciona um texto personalizado.\n5. Escolhe Categoria individual ou ├ürea e seleciona o elemento.\n6. Escolhe Ultrapassagem imediata ou Depois de ultrapassar %; na segunda op├º├úo, introduz a percentagem.\n7. Toca em Criar alerta.\nPosso configur├í-lo diretamente: indica-me nome, categoria ou ├írea, valor, per├¡odo, limite e texto opcional; mostrarei a confirma├º├úo antes de guardar.",
  pl:"Aby utworzy─ç Alert:\n1. Otw├│rz Alerty z dolnego paska, menu lub skr├│tu na ekranie g┼é├│wnym.\n2. Naci┼ønij + Nowy alert.\n3. Wpisz nazw─Ö i bud┼╝et.\n4. Wybierz Miesi─Öczny lub Roczny i opcjonalnie dodaj w┼éasny tekst.\n5. Wybierz Pojedyncz─à kategori─Ö lub Obszar, a nast─Öpnie pozycj─Ö.\n6. Wybierz Natychmiastowe przekroczenie lub Po przekroczeniu o %; w drugim przypadku wpisz procent.\n7. Naci┼ønij Utw├│rz alert.\nMog─Ö ustawi─ç go bezpo┼ørednio: podaj nazw─Ö, kategori─Ö lub obszar, kwot─Ö, okres, pr├│g i opcjonalny tekst; przed zapisaniem poka┼╝─Ö potwierdzenie.",
  nl:"Zo maak je een melding:\n1. Open Meldingen via de onderste balk, het menu of de snelknop op Home.\n2. Tik op + Nieuwe melding.\n3. Vul de naam en het budget in.\n4. Kies Maandelijks of Jaarlijks en voeg eventueel aangepaste tekst toe.\n5. Kies E├®n categorie of Gebied en selecteer het item.\n6. Kies Directe overschrijding of Na % overschrijding; vul bij de tweede optie het percentage in.\n7. Tik op Melding maken.\nIk kan dit rechtstreeks instellen: geef naam, categorie of gebied, bedrag, periode, drempel en optionele tekst door; v├│├│r het opslaan toon ik de bevestiging.",
  ro:"Pentru a crea o Alert─â:\n1. Deschide Alerte din bara de jos, din meniu sau din butonul rapid de pe Home.\n2. Apas─â + Alert─â nou─â.\n3. Introdu numele ╚Öi bugetul.\n4. Alege Lunar sau Anual ╚Öi, op╚øional, adaug─â un text personalizat.\n5. Alege Categorie individual─â sau Zon─â ╚Öi selecteaz─â elementul.\n6. Alege Dep─â╚Öire imediat─â sau Dup─â dep─â╚Öirea cu %; pentru a doua op╚øiune, introdu procentul.\n7. Apas─â Creeaz─â alerta.\nO pot configura direct: spune-mi numele, categoria sau zona, suma, perioada, pragul ╚Öi textul op╚øional; ├«╚øi voi ar─âta confirmarea ├«nainte de salvare.",
  el:"╬ô╬╣╬▒ ╬¢╬▒ ╬┤╬À╬╝╬╣╬┐¤à¤ü╬│╬«¤â╬Á¤ä╬Á ╬╝╬╣╬▒ ╬ò╬╣╬┤╬┐¤Ç╬┐╬»╬À¤â╬À:\n1. ╬æ╬¢╬┐╬»╬¥¤ä╬Á ¤ä╬╣¤é ╬ò╬╣╬┤╬┐¤Ç╬┐╬╣╬«¤â╬Á╬╣¤é ╬▒¤Ç¤î ¤ä╬À╬¢ ╬║╬¼¤ä¤ë ╬╝¤Ç╬¼¤ü╬▒, ¤ä╬┐ ╬╝╬Á╬¢╬┐¤ì ╬« ¤ä╬À ╬│¤ü╬«╬│╬┐¤ü╬À ╬Á╬¢╬¡¤ü╬│╬Á╬╣╬▒ ¤â¤ä╬À╬¢ ╬æ¤ü¤ç╬╣╬║╬«.\n2. ╬á╬▒¤ä╬«¤â¤ä╬Á + ╬Ø╬¡╬▒ ╬Á╬╣╬┤╬┐¤Ç╬┐╬»╬À¤â╬À.\n3. ╬ò╬╣¤â╬▒╬│╬¼╬│╬Á¤ä╬Á ¤î╬¢╬┐╬╝╬▒ ╬║╬▒╬╣ ¤Ç¤ü╬┐¤ï¤Ç╬┐╬╗╬┐╬│╬╣¤â╬╝¤î.\n4. ╬ò¤Ç╬╣╬╗╬¡╬¥¤ä╬Á ╬£╬À╬¢╬╣╬▒╬»╬▒ ╬« ╬ò¤ä╬«¤â╬╣╬▒ ╬║╬▒╬╣ ¤Ç¤ü╬┐╬▒╬╣¤ü╬Á¤ä╬╣╬║╬¼ ¤Ç¤ü╬┐¤â╬©╬¡¤â¤ä╬Á ¤Ç¤ü╬┐¤â╬▒¤ü╬╝╬┐¤â╬╝╬¡╬¢╬┐ ╬║╬Á╬»╬╝╬Á╬¢╬┐.\n5. ╬ò¤Ç╬╣╬╗╬¡╬¥¤ä╬Á ╬£╬Á╬╝╬┐╬¢¤ë╬╝╬¡╬¢╬À ╬║╬▒¤ä╬À╬│╬┐¤ü╬»╬▒ ╬« ╬á╬Á¤ü╬╣╬┐¤ç╬« ╬║╬▒╬╣ ¤ä╬┐ ╬▒╬¢¤ä╬»¤â¤ä╬┐╬╣¤ç╬┐ ¤â¤ä╬┐╬╣¤ç╬Á╬»╬┐.\n6. ╬ò¤Ç╬╣╬╗╬¡╬¥¤ä╬Á ╬å╬╝╬Á¤â╬À ¤à¤Ç╬¡¤ü╬▓╬▒¤â╬À ╬« ╬£╬Á¤ä╬¼ ╬▒¤Ç¤î ¤à¤Ç╬¡¤ü╬▓╬▒¤â╬À %┬À ¤â¤ä╬À ╬┤╬Á¤ì¤ä╬Á¤ü╬À ╬Á¤Ç╬╣╬╗╬┐╬│╬« ╬Á╬╣¤â╬▒╬│╬¼╬│╬Á¤ä╬Á ¤ä╬┐ ¤Ç╬┐¤â╬┐¤â¤ä¤î.\n7. ╬á╬▒¤ä╬«¤â¤ä╬Á ╬ö╬À╬╝╬╣╬┐¤à¤ü╬│╬»╬▒ ╬Á╬╣╬┤╬┐¤Ç╬┐╬»╬À¤â╬À¤é.\n╬£¤Ç╬┐¤ü¤Ä ╬¢╬▒ ¤ä╬À ¤ü¤à╬©╬╝╬»¤â¤ë ╬▒¤Ç╬Á¤à╬©╬Á╬»╬▒¤é: ¤Ç╬Á╬»¤ä╬Á ╬╝╬┐¤à ¤î╬¢╬┐╬╝╬▒, ╬║╬▒¤ä╬À╬│╬┐¤ü╬»╬▒ ╬« ¤Ç╬Á¤ü╬╣╬┐¤ç╬«, ¤Ç╬┐¤â¤î, ¤Ç╬Á¤ü╬»╬┐╬┤╬┐, ¤î¤ü╬╣╬┐ ╬║╬▒╬╣ ¤Ç¤ü╬┐╬▒╬╣¤ü╬Á¤ä╬╣╬║¤î ╬║╬Á╬»╬╝╬Á╬¢╬┐┬À ╬©╬▒ ¤â╬▒¤é ╬┤╬Á╬»╬¥¤ë ¤ä╬À╬¢ ╬Á¤Ç╬╣╬▓╬Á╬▓╬▒╬»¤ë¤â╬À ¤Ç¤ü╬╣╬¢ ╬▒¤Ç¤î ¤ä╬À╬¢ ╬▒¤Ç╬┐╬©╬«╬║╬Á¤à¤â╬À."
};

export function getFainanceHelpAnswer(question:any,language:any){
  var text=normalizeLanguageText(question);
  if(!text)return "";
  var hasAlert=/(^|\s)(alert|alerts|alerta|alertas|alerte|alertes|avviso|avvisi|warning|warnung|meldingen|melding|powiadomienie|powiadomienia|╬Á╬╣╬┤╬┐¤Ç╬┐╬╣╬À¤â╬À|╬Á╬╣╬┤╬┐¤Ç╬┐╬╣╬À¤â╬Á╬╣¤é)(\s|$)/i.test(text);
  var asksHow=/(come|crea|creare|imposta|impostare|configura|configurare|how|create|set|configure|add|como|crear|configurar|comment|creer|cr├®er|configurer|wie|erstellen|einrichten|como|criar|configurar|jak|utworzyc|utworzy─ç|ustawic|ustawi─ç|hoe|maken|instellen|cum|crea|configurez|¤Ç¤ë¤é|¤Ç¤Ä¤é|╬┤╬À╬╝╬╣╬┐¤à¤ü╬│)/i.test(text);
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
  return slice.slice(0,cut).trim().replace(/[,:;\-ÔÇôÔÇö]+$/g,"")+"ÔÇª";
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
  en:{code:"en",name:"English",locale:"en-US",aliases:["inglese","english","anglais","englisch","ingles","ingl├¬s","angielski","engels","engleza","╬▒╬│╬│╬╗╬╣╬║╬▒"]},
  es:{code:"es",name:"Spanish",locale:"es-ES",aliases:["spagnolo","spagnola","spanish","espanol","espa├▒ol","espagnol","spanisch","espanhol","hiszpanski","spaans","spaniola","╬╣¤â¤Ç╬▒╬¢╬╣╬║╬▒"]},
  fr:{code:"fr",name:"French",locale:"fr-FR",aliases:["francese","french","francais","fran├ºais","franzosisch","franz├Âsisch","frances","franc├¬s","francuski","frans","franceza","╬│╬▒╬╗╬╗╬╣╬║╬▒"]},
  de:{code:"de",name:"German",locale:"de-DE",aliases:["tedesco","german","allemand","deutsch","aleman","alem├ín","alemao","alem├úo","niemiecki","duits","germana","╬│╬Á¤ü╬╝╬▒╬¢╬╣╬║╬▒"]},
  pt:{code:"pt",name:"Portuguese",locale:"pt-PT",aliases:["portoghese","portuguese","portugais","portugues","portugu├¬s","portugiesisch","portugalski","portugees","portugheza","¤Ç╬┐¤ü¤ä╬┐╬│╬▒╬╗╬╣╬║╬▒"]},
  pl:{code:"pl",name:"Polish",locale:"pl-PL",aliases:["polacco","polish","polonais","polnisch","polaco","polski","pools","poloneza","¤Ç╬┐╬╗¤ë╬¢╬╣╬║╬▒"]},
  nl:{code:"nl",name:"Dutch",locale:"nl-NL",aliases:["olandese","dutch","neerlandais","niederlandisch","niederl├ñndisch","holandes","holand├¬s","niderlandzki","nederlands","olandeza","╬┐╬╗╬╗╬▒╬¢╬┤╬╣╬║╬▒"]},
  ro:{code:"ro",name:"Romanian",locale:"ro-RO",aliases:["rumeno","rumena","romanian","roumain","rumanisch","rumano","romeno","rumunski","roemeens","romana","rom├ón─â","¤ü╬┐¤à╬╝╬▒╬¢╬╣╬║╬▒"]},
  el:{code:"el",name:"Greek",locale:"el-GR",aliases:["greco","greca","greek","grec","griechisch","griego","grego","grecki","grieks","greaca","╬Á╬╗╬╗╬À╬¢╬╣╬║╬▒","╬Á╬╗╬╗╬À╬¢╬╣╬║╬¼"]},
  ja:{code:"ja",name:"Japanese",locale:"ja-JP",aliases:["giapponese","japanese","japonais","japanisch","japones","japon├¬s","japonski","japans","japoneza","╬╣╬▒¤Ç¤ë╬¢╬╣╬║╬▒","µùÑµ£¼Þ¬×"]},
  zh:{code:"zh",name:"Chinese",locale:"zh-CN",aliases:["cinese","chinese","chinois","chinesisch","chino","chines","chin├¬s","chinski","chi┼äski","chinees","chineza","╬║╬╣╬¢╬Á╬Â╬╣╬║╬▒","õ©¡µûç","mandarino","mandarin"]},
  ko:{code:"ko",name:"Korean",locale:"ko-KR",aliases:["coreano","korean","coreen","cor├®en","koreanisch","coreano","koreanski","koreaans","coreeana","╬║╬┐¤ü╬Á╬▒¤ä╬╣╬║╬▒","Ýò£ÛÁ¡ýû┤"]},
  ar:{code:"ar",name:"Arabic",locale:"ar-SA",aliases:["arabo","arabic","arabe","arabisch","arabe","arabski","arabisch taal","araba","╬▒¤ü╬▒╬▓╬╣╬║╬▒","Ïº┘äÏ╣Ï▒Ï¿┘èÏ®"]},
  ru:{code:"ru",name:"Russian",locale:"ru-RU",aliases:["russo","russa","russian","russe","russisch","ruso","rosyjski","russisch taal","rusa","¤ü¤ë¤â╬╣╬║╬▒","ÐÇÐâÐüÐüð║ð©ð╣"]},
  tr:{code:"tr",name:"Turkish",locale:"tr-TR",aliases:["turco","turkish","turc","turkisch","turco","turecki","turks","turca","¤ä╬┐¤à¤ü╬║╬╣╬║╬▒","t├╝rk├ºe"]},
  sv:{code:"sv",name:"Swedish",locale:"sv-SE",aliases:["svedese","swedish","suedois","su├®dois","schwedisch","sueco","szwedzki","zweeds","suedeza","¤â╬┐¤à╬À╬┤╬╣╬║╬▒","svenska"]},
  da:{code:"da",name:"Danish",locale:"da-DK",aliases:["danese","danish","danois","danisch","danes","du┼äski","deens","daneza","╬┤╬▒╬¢╬╣╬║╬▒","dansk"]},
  no:{code:"no",name:"Norwegian",locale:"nb-NO",aliases:["norvegese","norwegian","norvegien","norwegisch","noruego","norweski","noors","norvegiana","╬¢╬┐¤ü╬▓╬À╬│╬╣╬║╬▒","norsk"]},
  fi:{code:"fi",name:"Finnish",locale:"fi-FI",aliases:["finlandese","finnish","finnois","finnisch","finlandes","finski","fins","finlandeza","¤å╬╣╬¢╬╗╬▒╬¢╬┤╬╣╬║╬▒","suomi"]},
  cs:{code:"cs",name:"Czech",locale:"cs-CZ",aliases:["ceco","ceca","czech","tcheque","tschechisch","checo","czeski","tsjechisch","ceha","¤ä¤â╬Á¤ç╬╣╬║╬▒","─ìe┼ítina"]},
  hu:{code:"hu",name:"Hungarian",locale:"hu-HU",aliases:["ungherese","hungarian","hongrois","ungarisch","hungaro","h├║ngaro","wegierski","hongaars","maghiara","╬┐¤à╬│╬│¤ü╬╣╬║╬▒","magyar"]},
  uk:{code:"uk",name:"Ukrainian",locale:"uk-UA",aliases:["ucraino","ucraina","ukrainian","ukrainien","ukrainisch","ucraniano","ukrainski","oekraiens","ucraineana","╬┐¤à╬║¤ü╬▒╬¢╬╣╬║╬▒","Ðâð║ÐÇð░Ðùð¢ÐüÐîð║ð░"]},
  hi:{code:"hi",name:"Hindi",locale:"hi-IN",aliases:["hindi","indiano hindi","Óñ╣Óñ┐Óñ¿ÓÑìÓñªÓÑÇ","Óñ╣Óñ┐ÓñéÓñªÓÑÇ"]},
  id:{code:"id",name:"Indonesian",locale:"id-ID",aliases:["indonesiano","indonesian","indonesien","indonesisch","indonesio","indonezyjski","indonesisch taal","indoneziana","╬╣╬¢╬┤╬┐╬¢╬À¤â╬╣╬▒╬║╬▒","bahasa indonesia"]},
  fil:{code:"fil",name:"Filipino",locale:"fil-PH",aliases:["filippino","filipino","tagalog","pilipino"]},
  vi:{code:"vi",name:"Vietnamese",locale:"vi-VN",aliases:["vietnamita","vietnamese","vietnamien","vietnamesisch","wietnamski","vietnamees","vietnameza","╬▓╬╣╬Á¤ä╬¢╬▒╬╝╬Á╬Â╬╣╬║╬▒","tiß║┐ng viß╗çt"]},
  th:{code:"th",name:"Thai",locale:"th-TH",aliases:["thailandese","thai","thailandais","thail├ñndisch","tailandes","tajski","thais","tailandeza","¤ä╬▒¤è╬╗╬▒╬¢╬┤╬╣╬║╬▒","Ó©áÓ©▓Ó©®Ó©▓Ó╣äÓ©ùÓ©ó"]},
  he:{code:"he",name:"Hebrew",locale:"he-IL",aliases:["ebraico","hebrew","hebreu","hebr├ñisch","hebreo","hebrajski","hebreeuws","ebraica","╬Á╬▓¤ü╬▒¤è╬║╬▒","ÎóÎæÎ¿ÎÖÎ¬"]},
};

const LANGUAGE_NAMES_EN:Record<string,string> = Object.keys(LANGUAGE_CATALOG).reduce(function(out:any,code){out[code]=LANGUAGE_CATALOG[code].name;return out;},{});

const HEARING_REPLIES:Record<string,string> = {
  it:"S├¼, ti sento.", en:"Yes, I can hear you.", es:"S├¡, te escucho.", fr:"Oui, je vous entends.", de:"Ja, ich h├Âre dich.",
  pt:"Sim, consigo ouvir-te.", pl:"Tak, s┼éysz─Ö Ci─Ö.", nl:"Ja, ik hoor je.", ro:"Da, te aud.", el:"╬Ø╬▒╬╣, ¤â╬▒¤é ╬▒╬║╬┐¤ì¤ë.",
  ja:"Òü»ÒüäÒÇüÞü×ÒüôÒüêÒü¥ÒüÖÒÇé", zh:"µÿ»þÜä´╝îµêæÞâ¢ÕÉ¼Õê░õ¢áÒÇé", ko:"Ùäñ, ý×ÿ ÙôñÙª¢ÙïêÙïñ.", ar:"┘åÏ╣┘àÏî ÏúÏ│Ï¬ÏÀ┘èÏ╣ Ï│┘àÏºÏ╣┘â.", ru:"ðöð░, ÐÅ ð▓ð░Ðü Ðüð╗ÐïÐêÐâ.",
  tr:"Evet, seni duyabiliyorum.", sv:"Ja, jag h├Âr dig.", da:"Ja, jeg kan h├©re dig.", no:"Ja, jeg h├©rer deg.", fi:"Kyll├ñ, kuulen sinut.",
  cs:"Ano, sly┼í├¡m v├ís.", hu:"Igen, hallom.", uk:"ðóð░ð║, ÐÅ ð▓ð░Ðü ÐçÐâÐÄ.", hi:"Óñ╣Óñ¥Óñü, Óñ«ÓÑêÓñé ÓñåÓñ¬ÓñòÓÑï Óñ©ÓÑüÓñ¿ Óñ©ÓñòÓññÓñ¥ Óñ╣ÓÑéÓñüÓÑñ", id:"Ya, saya bisa mendengar Anda.",
  fil:"Oo, naririnig kita.", vi:"V├óng, t├┤i nghe thß║Ñy bß║ín.", th:"Ó╣äÓ©öÓ╣ëÓ©óÓ©┤Ó©ÖÓ©äÓ©©Ó©ôÓ©äÓ©úÓ©▒Ó©Ü/Ó©äÓ╣êÓ©░", he:"ÎøÎƒ, ÎÉÎáÎÖ Î®ÎòÎ×Îó ÎÉÎòÎ¬ÎÜ."
};

type RuntimeKey = "done"|"cancelled"|"error"|"noAnswer"|"sectionOpened"|"noValidAction"|"invalidArguments"|"toolUnavailable"|"notReady"|"offline"|"sessionExpired"|"rateLimited"|"timeout"|"interrupted"|"unavailable"|"repeatCloser"|"audioFailed"|"unsupportedDevice"|"permissionDenied";

const RUNTIME_REPLIES:Record<string,Record<RuntimeKey,string>> = {
  it:{done:"Operazione completata.",cancelled:"Operazione annullata.",error:"Si ├¿ verificato un errore.",noAnswer:"Non ho ricevuto una risposta. Riprova.",sectionOpened:"Sezione aperta.",noValidAction:"Nessuna azione valida.",invalidArguments:"Argomenti non validi.",toolUnavailable:"Strumento non disponibile.",notReady:"La conversazione non ├¿ ancora pronta. Attendi il messaggio ÔÇ£Microfono prontoÔÇØ e riprova.",offline:"Sei offline. Controlla la connessione e riprova.",sessionExpired:"La sessione ├¿ scaduta. Accedi di nuovo e riapri lÔÇÖassistente.",rateLimited:"LÔÇÖassistente ├¿ molto richiesto in questo momento. Attendi qualche secondo e riprova.",timeout:"La connessione sta impiegando troppo tempo. Tocca Avvia per riprovare.",interrupted:"La conversazione si ├¿ interrotta. Tocca Avvia per riprovare.",unavailable:"La conversazione vocale non ├¿ disponibile in questo momento. Tocca Avvia per riprovare.",repeatCloser:"Non ho capito bene. Prova a ripetere pi├╣ vicino al telefono.",audioFailed:"LÔÇÖaudio dellÔÇÖassistente non ├¿ partito. Tocca Avvia per riprovare.",unsupportedDevice:"La conversazione vocale non ├¿ supportata su questo dispositivo.",permissionDenied:"Permesso microfono negato. Apri le impostazioni del dispositivo, seleziona fAInance e consenti lÔÇÖaccesso al microfono, poi premi di nuovo Avvia."},
  en:{done:"Operation completed.",cancelled:"Operation cancelled.",error:"An error occurred.",noAnswer:"I did not receive a response. Please try again.",sectionOpened:"Section opened.",noValidAction:"No valid action was found.",invalidArguments:"Invalid arguments.",toolUnavailable:"This tool is not available.",notReady:"The conversation is not ready yet. Wait for ÔÇ£Microphone readyÔÇØ and try again.",offline:"You are offline. Check your connection and try again.",sessionExpired:"The session has expired. Sign in again and reopen the assistant.",rateLimited:"The assistant is very busy right now. Wait a few seconds and try again.",timeout:"The connection is taking too long. Tap Start to try again.",interrupted:"The conversation was interrupted. Tap Start to try again.",unavailable:"Voice conversation is unavailable right now. Tap Start to try again.",repeatCloser:"I did not understand clearly. Please repeat closer to the phone.",audioFailed:"The assistant audio did not start. Tap Start to try again.",unsupportedDevice:"Voice conversation is not supported on this device.",permissionDenied:"Microphone permission denied. Open the device settings, select fAInance, allow microphone access, then tap Start again."},
  es:{done:"Operaci├│n completada.",cancelled:"Operaci├│n cancelada.",error:"Se ha producido un error.",noAnswer:"No he recibido una respuesta. Int├®ntalo de nuevo.",sectionOpened:"Secci├│n abierta.",noValidAction:"No se ha encontrado ninguna acci├│n v├ílida.",invalidArguments:"Argumentos no v├ílidos.",toolUnavailable:"Esta herramienta no est├í disponible.",notReady:"La conversaci├│n a├║n no est├í lista. Espera el mensaje ÔÇ£Micr├│fono listoÔÇØ e int├®ntalo de nuevo.",offline:"No tienes conexi├│n. Comprueba la conexi├│n e int├®ntalo de nuevo.",sessionExpired:"La sesi├│n ha caducado. Inicia sesi├│n de nuevo y vuelve a abrir el asistente.",rateLimited:"El asistente tiene mucha demanda en este momento. Espera unos segundos e int├®ntalo de nuevo.",timeout:"La conexi├│n est├í tardando demasiado. Pulsa Iniciar para volver a intentarlo.",interrupted:"La conversaci├│n se ha interrumpido. Pulsa Iniciar para volver a intentarlo.",unavailable:"La conversaci├│n por voz no est├í disponible en este momento. Pulsa Iniciar para volver a intentarlo.",repeatCloser:"No lo he entendido bien. Repite m├ís cerca del tel├®fono.",audioFailed:"El audio del asistente no se ha iniciado. Pulsa Iniciar para volver a intentarlo.",unsupportedDevice:"La conversaci├│n por voz no es compatible con este dispositivo.",permissionDenied:"Permiso de micr├│fono denegado. Abre los ajustes del dispositivo, selecciona fAInance, permite el acceso al micr├│fono y pulsa de nuevo Iniciar."},
  fr:{done:"Op├®ration termin├®e.",cancelled:"Op├®ration annul├®e.",error:"Une erreur sÔÇÖest produite.",noAnswer:"Je nÔÇÖai re├ºu aucune r├®ponse. R├®essayez.",sectionOpened:"Section ouverte.",noValidAction:"Aucune action valide nÔÇÖa ├®t├® trouv├®e.",invalidArguments:"Arguments non valides.",toolUnavailable:"Cet outil nÔÇÖest pas disponible.",notReady:"La conversation nÔÇÖest pas encore pr├¬te. Attendez le message ┬½ Microphone pr├¬t ┬╗ et r├®essayez.",offline:"Vous ├¬tes hors ligne. V├®rifiez votre connexion et r├®essayez.",sessionExpired:"La session a expir├®. Reconnectez-vous et rouvrez lÔÇÖassistant.",rateLimited:"LÔÇÖassistant est tr├¿s sollicit├® en ce moment. Attendez quelques secondes et r├®essayez.",timeout:"La connexion prend trop de temps. Appuyez sur D├®marrer pour r├®essayer.",interrupted:"La conversation a ├®t├® interrompue. Appuyez sur D├®marrer pour r├®essayer.",unavailable:"La conversation vocale nÔÇÖest pas disponible pour le moment. Appuyez sur D├®marrer pour r├®essayer.",repeatCloser:"Je nÔÇÖai pas bien compris. R├®p├®tez plus pr├¿s du t├®l├®phone.",audioFailed:"Le son de lÔÇÖassistant nÔÇÖa pas d├®marr├®. Appuyez sur D├®marrer pour r├®essayer.",unsupportedDevice:"La conversation vocale nÔÇÖest pas prise en charge sur cet appareil.",permissionDenied:"Autorisation du microphone refus├®e. Ouvrez les r├®glages de lÔÇÖappareil, s├®lectionnez fAInance, autorisez le microphone, puis appuyez de nouveau sur D├®marrer."},
  de:{done:"Vorgang abgeschlossen.",cancelled:"Vorgang abgebrochen.",error:"Ein Fehler ist aufgetreten.",noAnswer:"Ich habe keine Antwort erhalten. Bitte versuche es erneut.",sectionOpened:"Bereich ge├Âffnet.",noValidAction:"Keine g├╝ltige Aktion gefunden.",invalidArguments:"Ung├╝ltige Argumente.",toolUnavailable:"Dieses Werkzeug ist nicht verf├╝gbar.",notReady:"Die Unterhaltung ist noch nicht bereit. Warte auf ÔÇ×Mikrofon bereitÔÇ£ und versuche es erneut.",offline:"Du bist offline. Pr├╝fe die Verbindung und versuche es erneut.",sessionExpired:"Die Sitzung ist abgelaufen. Melde dich erneut an und ├Âffne den Assistenten noch einmal.",rateLimited:"Der Assistent ist gerade stark ausgelastet. Warte einige Sekunden und versuche es erneut.",timeout:"Die Verbindung dauert zu lange. Tippe auf Start, um es erneut zu versuchen.",interrupted:"Die Unterhaltung wurde unterbrochen. Tippe auf Start, um es erneut zu versuchen.",unavailable:"Die Sprachunterhaltung ist derzeit nicht verf├╝gbar. Tippe auf Start, um es erneut zu versuchen.",repeatCloser:"Ich habe dich nicht gut verstanden. Sprich bitte n├ñher am Telefon.",audioFailed:"Die Audioausgabe des Assistenten wurde nicht gestartet. Tippe auf Start, um es erneut zu versuchen.",unsupportedDevice:"Sprachunterhaltung wird auf diesem Ger├ñt nicht unterst├╝tzt.",permissionDenied:"Mikrofonzugriff verweigert. ├ûffne die Ger├ñteeinstellungen, w├ñhle fAInance, erlaube den Mikrofonzugriff und tippe erneut auf Start."},
  pt:{done:"Opera├º├úo conclu├¡da.",cancelled:"Opera├º├úo cancelada.",error:"Ocorreu um erro.",noAnswer:"N├úo recebi uma resposta. Tenta novamente.",sectionOpened:"Sec├º├úo aberta.",noValidAction:"N├úo foi encontrada nenhuma a├º├úo v├ílida.",invalidArguments:"Argumentos inv├ílidos.",toolUnavailable:"Esta ferramenta n├úo est├í dispon├¡vel.",notReady:"A conversa ainda n├úo est├í pronta. Aguarda a mensagem ÔÇ£Microfone prontoÔÇØ e tenta novamente.",offline:"Est├ís offline. Verifica a liga├º├úo e tenta novamente.",sessionExpired:"A sess├úo expirou. Inicia sess├úo novamente e volta a abrir o assistente.",rateLimited:"O assistente est├í muito solicitado neste momento. Aguarda alguns segundos e tenta novamente.",timeout:"A liga├º├úo est├í a demorar demasiado. Toca em Iniciar para tentar novamente.",interrupted:"A conversa foi interrompida. Toca em Iniciar para tentar novamente.",unavailable:"A conversa por voz n├úo est├í dispon├¡vel neste momento. Toca em Iniciar para tentar novamente.",repeatCloser:"N├úo percebi bem. Repete mais perto do telefone.",audioFailed:"O ├íudio do assistente n├úo iniciou. Toca em Iniciar para tentar novamente.",unsupportedDevice:"A conversa por voz n├úo ├® suportada neste dispositivo.",permissionDenied:"Permiss├úo do microfone negada. Abre as defini├º├Áes do dispositivo, seleciona fAInance, permite o acesso ao microfone e toca novamente em Iniciar."},
  pl:{done:"Operacja zako┼äczona.",cancelled:"Operacja anulowana.",error:"Wyst─àpi┼é b┼é─àd.",noAnswer:"Nie otrzyma┼éem odpowiedzi. Spr├│buj ponownie.",sectionOpened:"Sekcja zosta┼éa otwarta.",noValidAction:"Nie znaleziono prawid┼éowej akcji.",invalidArguments:"Nieprawid┼éowe argumenty.",toolUnavailable:"To narz─Ödzie jest niedost─Öpne.",notReady:"Rozmowa nie jest jeszcze gotowa. Poczekaj na komunikat ÔÇ×Mikrofon gotowyÔÇØ i spr├│buj ponownie.",offline:"Jeste┼ø offline. Sprawd┼║ po┼é─àczenie i spr├│buj ponownie.",sessionExpired:"Sesja wygas┼éa. Zaloguj si─Ö ponownie i otw├│rz asystenta.",rateLimited:"Asystent jest teraz bardzo obci─à┼╝ony. Poczekaj kilka sekund i spr├│buj ponownie.",timeout:"Po┼é─àczenie trwa zbyt d┼éugo. Dotknij Start, aby spr├│bowa─ç ponownie.",interrupted:"Rozmowa zosta┼éa przerwana. Dotknij Start, aby spr├│bowa─ç ponownie.",unavailable:"Rozmowa g┼éosowa jest teraz niedost─Öpna. Dotknij Start, aby spr├│bowa─ç ponownie.",repeatCloser:"Nie zrozumia┼éem wyra┼║nie. Powt├│rz bli┼╝ej telefonu.",audioFailed:"D┼║wi─Ök asystenta nie uruchomi┼é si─Ö. Dotknij Start, aby spr├│bowa─ç ponownie.",unsupportedDevice:"Rozmowa g┼éosowa nie jest obs┼éugiwana na tym urz─àdzeniu.",permissionDenied:"Odm├│wiono dost─Öpu do mikrofonu. Otw├│rz ustawienia urz─àdzenia, wybierz fAInance, zezw├│l na dost─Öp do mikrofonu i ponownie naci┼ønij Start."},
  nl:{done:"Bewerking voltooid.",cancelled:"Bewerking geannuleerd.",error:"Er is een fout opgetreden.",noAnswer:"Ik heb geen antwoord ontvangen. Probeer het opnieuw.",sectionOpened:"Sectie geopend.",noValidAction:"Geen geldige actie gevonden.",invalidArguments:"Ongeldige argumenten.",toolUnavailable:"Deze functie is niet beschikbaar.",notReady:"Het gesprek is nog niet klaar. Wacht op ÔÇ£Microfoon gereedÔÇØ en probeer opnieuw.",offline:"Je bent offline. Controleer de verbinding en probeer opnieuw.",sessionExpired:"De sessie is verlopen. Meld je opnieuw aan en open de assistent opnieuw.",rateLimited:"De assistent is momenteel erg druk. Wacht een paar seconden en probeer opnieuw.",timeout:"De verbinding duurt te lang. Tik op Start om opnieuw te proberen.",interrupted:"Het gesprek is onderbroken. Tik op Start om opnieuw te proberen.",unavailable:"Spraakgesprek is momenteel niet beschikbaar. Tik op Start om opnieuw te proberen.",repeatCloser:"Ik heb je niet goed verstaan. Herhaal het dichter bij de telefoon.",audioFailed:"De audio van de assistent is niet gestart. Tik op Start om opnieuw te proberen.",unsupportedDevice:"Spraakgesprek wordt niet ondersteund op dit apparaat.",permissionDenied:"Microfoontoegang geweigerd. Open de apparaatinstellingen, selecteer fAInance, sta microfoontoegang toe en tik opnieuw op Start."},
  ro:{done:"Opera╚øiune finalizat─â.",cancelled:"Opera╚øiune anulat─â.",error:"A ap─ârut o eroare.",noAnswer:"Nu am primit niciun r─âspuns. ├Äncearc─â din nou.",sectionOpened:"Sec╚øiune deschis─â.",noValidAction:"Nu a fost g─âsit─â nicio ac╚øiune valid─â.",invalidArguments:"Argumente nevalide.",toolUnavailable:"Acest instrument nu este disponibil.",notReady:"Conversa╚øia nu este ├«nc─â preg─âtit─â. A╚Öteapt─â mesajul ÔÇ×Microfon preg─âtitÔÇØ ╚Öi ├«ncearc─â din nou.",offline:"E╚Öti offline. Verific─â conexiunea ╚Öi ├«ncearc─â din nou.",sessionExpired:"Sesiunea a expirat. Autentific─â-te din nou ╚Öi redeschide asistentul.",rateLimited:"Asistentul este foarte solicitat ├«n acest moment. A╚Öteapt─â c├óteva secunde ╚Öi ├«ncearc─â din nou.",timeout:"Conexiunea dureaz─â prea mult. Apas─â Pornire pentru a ├«ncerca din nou.",interrupted:"Conversa╚øia a fost ├«ntrerupt─â. Apas─â Pornire pentru a ├«ncerca din nou.",unavailable:"Conversa╚øia vocal─â nu este disponibil─â momentan. Apas─â Pornire pentru a ├«ncerca din nou.",repeatCloser:"Nu am ├«n╚øeles bine. Repet─â mai aproape de telefon.",audioFailed:"Sunetul asistentului nu a pornit. Apas─â Pornire pentru a ├«ncerca din nou.",unsupportedDevice:"Conversa╚øia vocal─â nu este acceptat─â pe acest dispozitiv.",permissionDenied:"Permisiunea pentru microfon a fost refuzat─â. Deschide set─ârile dispozitivului, selecteaz─â fAInance, permite accesul la microfon ╚Öi apas─â din nou Pornire."},
  el:{done:"╬ù ╬Á╬¢╬¡¤ü╬│╬Á╬╣╬▒ ╬┐╬╗╬┐╬║╬╗╬À¤ü¤Ä╬©╬À╬║╬Á.",cancelled:"╬ù ╬Á╬¢╬¡¤ü╬│╬Á╬╣╬▒ ╬▒╬║¤à¤ü¤Ä╬©╬À╬║╬Á.",error:"╬á╬▒¤ü╬┐¤à¤â╬╣╬¼¤â¤ä╬À╬║╬Á ¤â¤å╬¼╬╗╬╝╬▒.",noAnswer:"╬ö╬Á╬¢ ╬¡╬╗╬▒╬▓╬▒ ╬▒¤Ç╬¼╬¢¤ä╬À¤â╬À. ╬ö╬┐╬║╬╣╬╝╬¼¤â¤ä╬Á ╬¥╬▒╬¢╬¼.",sectionOpened:"╬ù ╬Á╬¢¤î¤ä╬À¤ä╬▒ ╬¼╬¢╬┐╬╣╬¥╬Á.",noValidAction:"╬ö╬Á╬¢ ╬▓¤ü╬¡╬©╬À╬║╬Á ╬¡╬│╬║¤à¤ü╬À ╬Á╬¢╬¡¤ü╬│╬Á╬╣╬▒.",invalidArguments:"╬£╬À ╬¡╬│╬║¤à¤ü╬▒ ╬┐¤ü╬»¤â╬╝╬▒¤ä╬▒.",toolUnavailable:"╬æ¤à¤ä¤î ¤ä╬┐ ╬Á¤ü╬│╬▒╬╗╬Á╬»╬┐ ╬┤╬Á╬¢ ╬Á╬»╬¢╬▒╬╣ ╬┤╬╣╬▒╬©╬¡¤â╬╣╬╝╬┐.",notReady:"╬ù ¤â¤à╬¢╬┐╬╝╬╣╬╗╬»╬▒ ╬┤╬Á╬¢ ╬Á╬»╬¢╬▒╬╣ ╬▒╬║¤î╬╝╬À ╬¡¤ä╬┐╬╣╬╝╬À. ╬á╬Á¤ü╬╣╬╝╬¡╬¢╬Á¤ä╬Á ¤ä╬┐ ╬╝╬«╬¢¤à╬╝╬▒ ┬½╬ñ╬┐ ╬╝╬╣╬║¤ü¤î¤å¤ë╬¢╬┐ ╬Á╬»╬¢╬▒╬╣ ╬¡¤ä╬┐╬╣╬╝╬┐┬╗ ╬║╬▒╬╣ ╬┤╬┐╬║╬╣╬╝╬¼¤â¤ä╬Á ╬¥╬▒╬¢╬¼.",offline:"╬ò╬»¤â¤ä╬Á ╬Á╬║¤ä¤î¤é ¤â¤ì╬¢╬┤╬Á¤â╬À¤é. ╬ò╬╗╬¡╬│╬¥¤ä╬Á ¤ä╬À ¤â¤ì╬¢╬┤╬Á¤â╬À ╬║╬▒╬╣ ╬┤╬┐╬║╬╣╬╝╬¼¤â¤ä╬Á ╬¥╬▒╬¢╬¼.",sessionExpired:"╬ù ¤â¤à╬¢╬Á╬┤¤ü╬»╬▒ ╬¡╬╗╬À╬¥╬Á. ╬ú¤à╬¢╬┤╬Á╬©╬Á╬»¤ä╬Á ╬¥╬▒╬¢╬¼ ╬║╬▒╬╣ ╬▒╬¢╬┐╬»╬¥¤ä╬Á ¤ä╬┐╬¢ ╬▓╬┐╬À╬©¤î.",rateLimited:"╬ƒ ╬▓╬┐╬À╬©¤î¤é ╬¡¤ç╬Á╬╣ ╬╝╬Á╬│╬¼╬╗╬À ╬Â╬«¤ä╬À¤â╬À ╬▒¤à¤ä╬« ¤ä╬À ¤â¤ä╬╣╬│╬╝╬«. ╬á╬Á¤ü╬╣╬╝╬¡╬¢╬Á¤ä╬Á ╬╗╬»╬│╬▒ ╬┤╬Á¤à¤ä╬Á¤ü¤î╬╗╬Á¤Ç¤ä╬▒ ╬║╬▒╬╣ ╬┤╬┐╬║╬╣╬╝╬¼¤â¤ä╬Á ╬¥╬▒╬¢╬¼.",timeout:"╬ù ¤â¤ì╬¢╬┤╬Á¤â╬À ╬║╬▒╬©¤à¤â¤ä╬Á¤ü╬Á╬» ¤Ç╬┐╬╗¤ì. ╬á╬▒¤ä╬«¤â¤ä╬Á ╬ê╬¢╬▒¤ü╬¥╬À ╬│╬╣╬▒ ╬¢╬▒ ╬┤╬┐╬║╬╣╬╝╬¼¤â╬Á¤ä╬Á ╬¥╬▒╬¢╬¼.",interrupted:"╬ù ¤â¤à╬¢╬┐╬╝╬╣╬╗╬»╬▒ ╬┤╬╣╬▒╬║¤î¤Ç╬À╬║╬Á. ╬á╬▒¤ä╬«¤â¤ä╬Á ╬ê╬¢╬▒¤ü╬¥╬À ╬│╬╣╬▒ ╬¢╬▒ ╬┤╬┐╬║╬╣╬╝╬¼¤â╬Á¤ä╬Á ╬¥╬▒╬¢╬¼.",unavailable:"╬ù ¤å¤ë╬¢╬À¤ä╬╣╬║╬« ¤â¤à╬¢╬┐╬╝╬╣╬╗╬»╬▒ ╬┤╬Á╬¢ ╬Á╬»╬¢╬▒╬╣ ╬┤╬╣╬▒╬©╬¡¤â╬╣╬╝╬À ╬▒¤à¤ä╬« ¤ä╬À ¤â¤ä╬╣╬│╬╝╬«. ╬á╬▒¤ä╬«¤â¤ä╬Á ╬ê╬¢╬▒¤ü╬¥╬À ╬│╬╣╬▒ ╬¢╬▒ ╬┤╬┐╬║╬╣╬╝╬¼¤â╬Á¤ä╬Á ╬¥╬▒╬¢╬¼.",repeatCloser:"╬ö╬Á╬¢ ╬║╬▒¤ä╬¼╬╗╬▒╬▓╬▒ ╬║╬▒╬©╬▒¤ü╬¼. ╬ò¤Ç╬▒╬¢╬▒╬╗╬¼╬▓╬Á¤ä╬Á ¤Ç╬╣╬┐ ╬║╬┐╬¢¤ä╬¼ ¤â¤ä╬┐ ¤ä╬À╬╗╬¡¤å¤ë╬¢╬┐.",audioFailed:"╬ƒ ╬«¤ç╬┐¤é ¤ä╬┐¤à ╬▓╬┐╬À╬©╬┐¤ì ╬┤╬Á╬¢ ╬¥╬Á╬║╬»╬¢╬À¤â╬Á. ╬á╬▒¤ä╬«¤â¤ä╬Á ╬ê╬¢╬▒¤ü╬¥╬À ╬│╬╣╬▒ ╬¢╬▒ ╬┤╬┐╬║╬╣╬╝╬¼¤â╬Á¤ä╬Á ╬¥╬▒╬¢╬¼.",unsupportedDevice:"╬ù ¤å¤ë╬¢╬À¤ä╬╣╬║╬« ¤â¤à╬¢╬┐╬╝╬╣╬╗╬»╬▒ ╬┤╬Á╬¢ ¤à¤Ç╬┐¤â¤ä╬À¤ü╬»╬Â╬Á¤ä╬▒╬╣ ¤â╬Á ╬▒¤à¤ä╬« ¤ä╬À ¤â¤à¤â╬║╬Á¤à╬«.",permissionDenied:"╬ù ╬¼╬┤╬Á╬╣╬▒ ╬╝╬╣╬║¤ü╬┐¤å¤Ä╬¢╬┐¤à ╬▒¤Ç╬┐¤ü¤ü╬»¤å╬©╬À╬║╬Á. ╬æ╬¢╬┐╬»╬¥¤ä╬Á ¤ä╬╣¤é ¤ü¤à╬©╬╝╬»¤â╬Á╬╣¤é ¤ä╬À¤é ¤â¤à¤â╬║╬Á¤à╬«¤é, ╬Á¤Ç╬╣╬╗╬¡╬¥¤ä╬Á fAInance, ╬Á¤Ç╬╣¤ä¤ü╬¡¤ê¤ä╬Á ¤ä╬À╬¢ ¤Ç¤ü¤î¤â╬▓╬▒¤â╬À ¤â¤ä╬┐ ╬╝╬╣╬║¤ü¤î¤å¤ë╬¢╬┐ ╬║╬▒╬╣ ¤Ç╬▒¤ä╬«¤â¤ä╬Á ╬¥╬▒╬¢╬¼ ╬ê╬¢╬▒¤ü╬¥╬À."}
};

const LANGUAGE_CHANGED_REPLIES:Record<string,string> = {
  it:"Va bene. Da ora continuer├▓ in italiano.", en:"Of course. IÔÇÖll continue in English from now on.", es:"De acuerdo. A partir de ahora continuar├® en espa├▒ol.", fr:"DÔÇÖaccord. Je continuerai d├®sormais en fran├ºais.", de:"Nat├╝rlich. Ich werde ab jetzt auf Deutsch weitermachen.", pt:"Claro. A partir de agora continuarei em portugu├¬s.", pl:"Oczywi┼øcie. Od teraz b─Öd─Ö kontynuowa─ç po polsku.", nl:"Natuurlijk. Vanaf nu ga ik verder in het Nederlands.", ro:"Desigur. De acum ├«nainte voi continua ├«n rom├ón─â.", el:"╬Æ╬Á╬▓╬▒╬»¤ë¤é. ╬æ¤Ç¤î ╬Á╬┤¤Ä ╬║╬▒╬╣ ¤Ç╬¡¤ü╬▒ ╬©╬▒ ¤â¤à╬¢╬Á¤ç╬»¤â¤ë ¤â¤ä╬▒ ╬Á╬╗╬╗╬À╬¢╬╣╬║╬¼.",
  ja:"ÒééÒüíÒéìÒéôÒüºÒüÖÒÇéÒüôÒéîÒüïÒéëµùÑµ£¼Þ¬×ÒüºþÂÜÒüæÒü¥ÒüÖÒÇé", zh:"Õ¢ôþäÂÕÅ»õ╗ÑÒÇéõ╗ÄþÄ░Õ£¿ÞÁÀµêæõ╝Üþö¿õ©¡µûçþ╗ºþ╗¡ÒÇé", ko:"Ù¼╝Ùíáý×àÙïêÙïñ. ýØ┤ýá£ÙÂÇÝä░ Ýò£ÛÁ¡ýû┤Ùí£ Û│äýåìÝòÿÛ▓áýèÁÙïêÙïñ.", ar:"Ï¿Ïº┘äÏÀÏ¿Ï╣. Ï│ÏúÏ¬ÏºÏ¿Ï╣ Ï¿Ïº┘ä┘äÏ║Ï® Ïº┘äÏ╣Ï▒Ï¿┘èÏ® ┘à┘å Ïº┘äÏó┘å ┘üÏÁÏºÏ╣Ï»┘ïÏº.", ru:"ðÜð¥ð¢ðÁÐçð¢ð¥. ðí ÐìÐéð¥ð│ð¥ ð╝ð¥ð╝ðÁð¢Ðéð░ ÐÅ ð▒Ðâð┤Ðâ ð┐ÐÇð¥ð┤ð¥ð╗ðÂð░ÐéÐî ð¢ð░ ÐÇÐâÐüÐüð║ð¥ð╝ ÐÅðÀÐïð║ðÁ.", tr:"Elbette. Bundan sonra T├╝rk├ºe devam edece─ƒim.", sv:"Sj├ñlvklart. Fr├Ñn och med nu forts├ñtter jag p├Ñ svenska.", da:"Selvf├©lgelig. Fra nu af forts├ªtter jeg p├Ñ dansk.", no:"Selvf├©lgelig. Fra n├Ñ av fortsetter jeg p├Ñ norsk.", fi:"Totta kai. Jatkan t├ñst├ñ l├ñhtien suomeksi.", cs:"Samoz┼Öejm─ø. Odte─Å budu pokra─ìovat ─ìesky.", hu:"Term├®szetesen. Mostant├│l magyarul folytatom.", uk:"ðùð▓ð©Ðçð░ð╣ð¢ð¥. ðÆÐûð┤ÐéðÁð┐ðÁÐÇ ÐÅ ð┐ÐÇð¥ð┤ð¥ð▓ðÂÐâð▓ð░Ðéð©ð╝Ðâ Ðâð║ÐÇð░Ðùð¢ÐüÐîð║ð¥ÐÄ.", hi:"Óñ¼Óñ┐Óñ▓ÓÑìÓñòÓÑüÓñ▓ÓÑñ ÓñàÓñ¼ Óñ©ÓÑç Óñ«ÓÑêÓñé Óñ╣Óñ┐ÓñéÓñªÓÑÇ Óñ«ÓÑçÓñé Óñ£Óñ¥Óñ░ÓÑÇ Óñ░ÓñûÓÑéÓñüÓñùÓñ¥ÓÑñ", id:"Tentu. Mulai sekarang saya akan melanjutkan dalam bahasa Indonesia.", fil:"Siyempre. Mula ngayon, magpapatuloy ako sa Filipino.", vi:"Tß║Ñt nhi├¬n. Tß╗½ b├óy giß╗Ø t├┤i sß║¢ tiß║┐p tß╗Ñc bß║▒ng tiß║┐ng Viß╗çt.", th:"Ó╣äÓ©öÓ╣ëÓ╣ÇÓ©ÑÓ©ó Ó©òÓ╣êÓ©¡Ó©êÓ©▓Ó©üÓ©ÖÓ©ÁÓ╣ëÓ©ëÓ©▒Ó©ÖÓ©êÓ©░Ó╣âÓ©èÓ╣ëÓ©áÓ©▓Ó©®Ó©▓Ó╣äÓ©ùÓ©ó", he:"ÎøÎ×ÎòÎæÎƒ. Î×ÎóÎøÎ®ÎÖÎò ÎÉÎ×Î®ÎÖÎÜ ÎæÎóÎæÎ¿ÎÖÎ¬."
};

const ONE_TURN_LANGUAGE_REPLIES:Record<string,string> = {
  it:"Va bene. User├▓ lÔÇÖitaliano solo per questa risposta.", en:"Of course. IÔÇÖll use English for this response only.", es:"De acuerdo. Usar├® el espa├▒ol solo para esta respuesta.", fr:"DÔÇÖaccord. JÔÇÖutiliserai le fran├ºais uniquement pour cette r├®ponse.", de:"Nat├╝rlich. Ich verwende Deutsch nur f├╝r diese Antwort.", pt:"Claro. Usarei portugu├¬s apenas nesta resposta.", pl:"Oczywi┼øcie. U┼╝yj─Ö polskiego tylko w tej odpowiedzi.", nl:"Natuurlijk. Ik gebruik Nederlands alleen voor dit antwoord.", ro:"Desigur. Voi folosi rom├óna doar pentru acest r─âspuns.", el:"╬Æ╬Á╬▓╬▒╬»¤ë¤é. ╬ÿ╬▒ ¤ç¤ü╬À¤â╬╣╬╝╬┐¤Ç╬┐╬╣╬«¤â¤ë ¤ä╬▒ ╬Á╬╗╬╗╬À╬¢╬╣╬║╬¼ ╬╝¤î╬¢╬┐ ╬│╬╣╬▒ ╬▒¤à¤ä╬« ¤ä╬À╬¢ ╬▒¤Ç╬¼╬¢¤ä╬À¤â╬À."
};

const AUTO_LANGUAGE_REPLIES:Record<string,string> = {
  it:"Va bene. Risponder├▓ nella lingua che usi di volta in volta.", en:"Of course. IÔÇÖll reply in whichever language you use each time.", es:"De acuerdo. Responder├® en el idioma que utilices en cada momento.", fr:"DÔÇÖaccord. Je r├®pondrai dans la langue que vous utiliserez ├á chaque fois.", de:"Nat├╝rlich. Ich antworte jeweils in der Sprache, die du verwendest.", pt:"Claro. Responderei no idioma que usares em cada momento.", pl:"Oczywi┼øcie. Za ka┼╝dym razem odpowiem w j─Özyku, kt├│rego u┼╝yjesz.", nl:"Natuurlijk. Ik antwoord telkens in de taal die je gebruikt.", ro:"Desigur. Voi r─âspunde de fiecare dat─â ├«n limba pe care o folose╚Öti.", el:"╬Æ╬Á╬▓╬▒╬»¤ë¤é. ╬ÿ╬▒ ╬▒¤Ç╬▒╬¢¤ä¤Ä ╬║╬¼╬©╬Á ¤å╬┐¤ü╬¼ ¤â¤ä╬À ╬│╬╗¤Ä¤â¤â╬▒ ¤Ç╬┐¤à ¤ç¤ü╬À¤â╬╣╬╝╬┐¤Ç╬┐╬╣╬Á╬»¤ä╬Á."
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
  el:["╬│╬Á╬╣╬▒","╬©╬Á╬╗¤ë","╬╝¤Ç╬┐¤ü╬Á╬╣¤é","¤Ç¤ü╬Á¤Ç╬Á╬╣","╬╝╬╣╬╗╬▒¤ë","╬▒¤Ç╬▒╬¢¤ä╬À¤â╬Á","╬│╬╗¤ë¤â¤â╬▒","╬Á╬╗╬╗╬À╬¢╬╣╬║╬▒","¤â╬À╬╝╬Á¤ü╬▒","¤ç╬©╬Á¤é","╬Á╬¥╬┐╬┤╬┐","╬Á¤â╬┐╬┤╬┐","¤â¤ä╬┐¤ç╬┐¤é","╬│╬╣╬▒¤ä╬╣","¤Ç╬┐¤â╬┐","¤Ç¤ë¤é","¤Ç╬┐¤à","¤Ç╬┐¤ä╬Á","╬╝╬Á","╬│╬╣╬▒","╬┤╬Á╬╣╬¥╬Á"]
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
  if(/[\u0400-\u04FF]/.test(raw)){var c=/[ÐûÐùÐöÊæ]/i.test(raw)?"uk":"ru";return {language:c,languageName:assistantLanguageName(c),confidence:0.95,ambiguous:false};}
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
  if(/[┬┐┬í├▒]/i.test(raw))scores.es+=5;
  if(/[├º┼ô├ó├¬├«├┤├╗├½├»├╝├┐├ª]/i.test(raw))scores.fr+=5;
  if(/[├ñ├Â├╝├ƒ]/i.test(raw))scores.de+=5;
  if(/[├ú├Á]/i.test(raw))scores.pt+=5;
  if(/[─à─ç─Ö┼é┼ä├│┼ø┼║┼╝]/i.test(raw))scores.pl+=5;
  if(/[─â├ó├«╚Ö┼ƒ╚ø┼ú]/i.test(raw))scores.ro+=5;
  if(/[├á├¿├¼├▓├╣]/i.test(raw))scores.it+=2;

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
  return /(lingua (?:in cui|che) (?:ti )?parlo|stessa lingua (?:che uso|del mio messaggio)|modalita automatica|rileva(?:re)? la lingua|segui la lingua|language i (?:use|speak)|same language (?:i use|as me)|automatic language|idioma (?:en el que|que) (?:te )?hablo|misma lengua|mode automatique|meme langue|m├¬me langue|sprache die ich verwende|gleiche sprache|mesma lingua|jezyk ktorego uzywam|de taal die ik gebruik|limba pe care o folosesc|╬│╬╗¤ë¤â¤â╬▒ ¤Ç╬┐¤à ¤ç¤ü╬À¤â╬╣╬╝╬┐¤Ç╬┐╬╣¤ë)/i.test(text);
}

function languageControlIntent(text:string){
  return /(parlami|parla(?:re|mi)?|parli|rispondimi|rispondi|rispondere|rispondessi|scrivimi|continua (?:a parlare|in)|passa (?:a|all)|cambia (?:lingua|in|a)|usa (?:la lingua|l')|speak(?: to me)?|reply(?: to me)?|answer(?: me)?|continue in|switch to|change (?:the )?language|use (?:the )?language|hablame|habla(?:r)?|responde(?:me)?|continua en|cambia (?:el )?idioma|pasa al|parlez-moi|parle(?:r)?|repondez-moi|r├®pondez-moi|continuez en|changez de langue|passez au|sprich(?: mit mir)?|sprechen|antworte(?: mir)?|weiter auf|wechsle zu|fale(?: comigo)?|falar|responda-me|continue em|mude para|mow do mnie|odpowiadaj mi|kontynuuj po|zmien jezyk|spreek(?: met mij)?|antwoord mij|ga verder in|wissel naar|vorbeste-mi|raspunde-mi|continu─â ├«n|schimba limba|╬╝╬╣╬╗╬▒(?: ╬╝╬┐¤à)?|╬▒¤Ç╬▒╬¢¤ä╬À¤â╬Á ╬╝╬┐¤à|¤â¤à╬¢╬Á¤ç╬╣¤â╬Á ¤â¤ä╬▒|╬▒╬╗╬╗╬▒╬¥╬Á ╬│╬╗¤ë¤â¤â╬▒|traduci|translate|traduce|traduisez|ubersetze|├╝bersetze|traduz|przetlumacz|przet┼éumacz|vertaal|tradu|╬╝╬Á¤ä╬▒¤å¤ü╬▒¤â╬Á|spiegamelo|spiega(?:mi)?|explain|explicamelo|expliquez|erklar|erkl├ñr|explica|wyjasnij|wyja┼ønij|leg uit|explica-mi|╬Á╬¥╬À╬│╬À¤â╬Á|dimmi|fammi|tell me|show me|dime|muestrame|montre-moi|dis-moi|sag mir|zeig mir|diz-me|mostra-me|powiedz mi|pokaz mi|vertel me|toon me|spune-mi|arata-mi|¤Ç╬Á¤é ╬╝╬┐¤à|╬┤╬Á╬╣╬¥╬Á ╬╝╬┐¤à)/i.test(text);
}

function oneTurnLanguageIntent(text:string){
  return /(solo (?:per )?questa risposta|solo questa volta|per questa volta|soltanto questa risposta|just (?:for )?this (?:answer|response|time)|only this (?:answer|response|time)|for this (?:answer|response) only|solo (?:para )?esta respuesta|solo esta vez|uniquement pour cette reponse|seulement cette fois|nur fur diese antwort|nur dieses mal|apenas nesta resposta|so desta vez|tylko w tej odpowiedzi|tylko tym razem|alleen voor dit antwoord|alleen deze keer|doar pentru acest raspuns|doar de data aceasta|╬╝╬┐╬¢╬┐ ╬│╬╣╬▒ ╬▒¤à¤ä╬À ¤ä╬À╬¢ ╬▒¤Ç╬▒╬¢¤ä╬À¤â╬À|╬╝╬┐╬¢╬┐ ╬▒¤à¤ä╬À ¤ä╬À ¤å╬┐¤ü╬▒|traduci|translate|traduce|traduisez|ubersetze|├╝bersetze|traduz|przetlumacz|przet┼éumacz|vertaal|tradu|╬╝╬Á¤ä╬▒¤å¤ü╬▒¤â╬Á|spiegamelo|spiega(?:mi)?|explain|explicamelo|expliquez|erklar|erkl├ñr|explica|wyjasnij|wyja┼ønij|leg uit|explica-mi|╬Á╬¥╬À╬│╬À¤â╬Á|dimmi|fammi|tell me|show me|dime|muestrame|montre-moi|dis-moi|sag mir|zeig mir|diz-me|mostra-me|powiedz mi|pokaz mi|vertel me|toon me|spune-mi|arata-mi|¤Ç╬Á¤é ╬╝╬┐¤à|╬┤╬Á╬╣╬¥╬Á ╬╝╬┐¤à)/i.test(text);
}


function explicitOneTurnLanguageIntent(text:string){
  return /(solo (?:per )?questa risposta|solo questa volta|per questa volta|soltanto questa risposta|just (?:for )?this (?:answer|response|time)|only this (?:answer|response|time)|for this (?:answer|response) only|solo (?:para )?esta respuesta|solo esta vez|uniquement pour cette reponse|seulement cette fois|nur fur diese antwort|nur dieses mal|apenas nesta resposta|so desta vez|tylko w tej odpowiedzi|tylko tym razem|alleen voor dit antwoord|alleen deze keer|doar pentru acest raspuns|doar de data aceasta|╬╝╬┐╬¢╬┐ ╬│╬╣╬▒ ╬▒¤à¤ä╬À ¤ä╬À╬¢ ╬▒¤Ç╬▒╬¢¤ä╬À¤â╬À|╬╝╬┐╬¢╬┐ ╬▒¤à¤ä╬À ¤ä╬À ¤å╬┐¤ü╬▒)/i.test(text);
}

function hasThenLanguageTransition(text:string){
  return /(poi|dopodiche|dopo di che|then|after that|afterwards|despues|despu├®s|luego|ensuite|puis|danach|anschliessend|anschlie├ƒend|depois|em seguida|potem|nastepnie|nast─Öpnie|daarna|vervolgens|apoi|dupa aceea|dup─â aceea|╬╝╬Á¤ä╬▒|╬╝╬Á¤ä╬¼)/i.test(text);
}

function persistentLanguageIntent(text:string){
  return /(da ora|d'ora in poi|da questo momento|sempre|continua (?:a parlare|in)|parlami|rispondimi|from now on|going forward|always|continue in|speak to me|reply to me|a partir de ahora|de ahora en adelante|siempre|hablame|respondeme|desormais|├á partir de maintenant|toujours|parlez-moi|repondez-moi|ab jetzt|von nun an|immer|sprich mit mir|antworte mir|a partir de agora|daqui em diante|sempre|fale comigo|responda-me|od teraz|zawsze|mow do mnie|odpowiadaj mi|vanaf nu|voortaan|altijd|spreek met mij|antwoord mij|de acum inainte|mereu|vorbeste-mi|raspunde-mi|╬▒¤Ç╬┐ ╬Á╬┤¤ë ╬║╬▒╬╣ ¤Ç╬Á¤ü╬▒|¤Ç╬▒╬¢¤ä╬▒|╬╝╬╣╬╗╬▒ ╬╝╬┐¤à|╬▒¤Ç╬▒╬¢¤ä╬À¤â╬Á ╬╝╬┐¤à)/i.test(text);
}

function isLanguageControlOnly(raw:any,requestMode:AssistantLanguageRequestMode){
  var text=normalizeLanguageText(raw);
  if(requestMode==="auto")return text.split(/\s+/).length<=14;
  if(/(traduci|translate|traduce|traduisez|ubersetze|├╝bersetze|traduz|przetlumacz|przet┼éumacz|vertaal|tradu|╬╝╬Á¤ä╬▒¤å¤ü╬▒¤â╬Á|spiegamelo|spiega(?:mi)?|explain|explicamelo|expliquez|erklar|erkl├ñr|explica|wyjasnij|wyja┼ønij|leg uit|explica-mi|╬Á╬¥╬À╬│╬À¤â╬Á|dimmi|fammi|tell me|show me|dime|muestrame|montre-moi|dis-moi|sag mir|zeig mir|diz-me|mostra-me|powiedz mi|pokaz mi|vertel me|toon me|spune-mi|arata-mi|¤Ç╬Á¤é ╬╝╬┐¤à|╬┤╬Á╬╣╬¥╬Á ╬╝╬┐¤à)/i.test(text))return false;
  if(/\b(quanto|speso|spese|budget|saldo|entrate|uscite|obiettivo|debito|credito|what|how|expense|income|budget|balance|goal|gasto|ingreso|depense|revenu|ausgabe|einnahme|despesa|receita|wydatek|przychod|uitgave|inkomen|cheltuiala|venit|╬Á╬¥╬┐╬┤╬┐|╬Á¤â╬┐╬┤╬┐)\b/i.test(text))return false;
  if(/\b(e dimmi|e spieg|and tell|and explain|y dime|y explica|et dis|et explique|und sag|und erklar|e diz|e explica|i powiedz|en vertel|si spune|╬║╬▒╬╣ ¤Ç╬Á¤é)\b/i.test(text))return false;
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
