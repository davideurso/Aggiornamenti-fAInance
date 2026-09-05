const { onRequest } = require("firebase-functions/v2/https");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onDocumentCreated, onDocumentWritten } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const OpenAI = require("openai");
const vision = require("@google-cloud/vision");

if (!admin.apps.length) {
  admin.initializeApp();
}

const RESEND_API_KEY = defineSecret("RESEND_API_KEY");
const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function handleOptions(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }

  return false;
}

async function requireFirebaseUser(req, res) {
  const header = String(req.get("Authorization") || "");
  const match = header.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    res.status(401).json({
      ok: false,
      error: "Accesso richiesto.",
    });
    return null;
  }

  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch (error) {
    console.error("Auth verification error:", error);
    res.status(401).json({
      ok: false,
      error: "Sessione non valida. Accedi di nuovo.",
    });
    return null;
  }
}

exports.sendContactEmail = onRequest(
  {
    secrets: [RESEND_API_KEY],
    region: "europe-west1",
    cors: true,
  },
  async (req, res) => {
    setCors(res);

    if (handleOptions(req, res)) return;

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Metodo non consentito. Usa POST.",
      });
    }

    try {
      const data = req.body || {};

      const name = String(data.name || "").trim();
      const email = String(data.email || "").trim();
      const subject = String(data.subject || "").trim();
      const message = String(data.message || "").trim();

      if (!message) {
        return res.status(400).json({
          ok: false,
          error: "Il messaggio è obbligatorio.",
        });
      }

      const resend = new Resend(RESEND_API_KEY.value());

      const safeSubject = subject || "Nuovo messaggio da fAInance";

      const html = `
        <h2>Nuovo messaggio da fAInance</h2>
        <p><strong>Nome:</strong> ${escapeHtml(name || "Non indicato")}</p>
        <p><strong>Email:</strong> ${escapeHtml(email || "Non indicata")}</p>
        <p><strong>Oggetto:</strong> ${escapeHtml(safeSubject)}</p>
        <hr />
        <p style="white-space:pre-line;">${escapeHtml(message)}</p>
      `;

      const result = await resend.emails.send({
        from: "fAInance <onboarding@resend.dev>",
        to: ["davideurso87@gmail.com"],
        subject: safeSubject,
        html,
        reply_to: email || undefined,
      });

      if (result.error) {
        console.error("Resend error:", result.error);

        return res.status(500).json({
          ok: false,
          error: result.error.message || "Errore durante l'invio dell'email.",
        });
      }

      return res.status(200).json({
        ok: true,
      });
    } catch (error) {
      console.error("sendContactEmail error:", error);

      return res.status(500).json({
        ok: false,
        error: error.message || "Errore interno durante l'invio del messaggio.",
      });
    }
  }
);

exports.askFinanceAI = onRequest(
  {
    secrets: [OPENAI_API_KEY],
    region: "europe-west1",
    cors: true,
    timeoutSeconds: 60,
    memory: "512MiB",
  },
  async (req, res) => {
    setCors(res);

    if (handleOptions(req, res)) return;

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Metodo non consentito. Usa POST.",
      });
    }

    try {
      const authUser = await requireFirebaseUser(req, res);
      if (!authUser) return;

      const data = req.body || {};

      const question = String(
        data.question ||
        data.message ||
        data.prompt ||
        ""
      ).trim();

      if (!question) {
        return res.status(400).json({
          ok: false,
          error: "La domanda è obbligatoria.",
        });
      }

      const aiDataAccess = String(
        data.aiDataAccess ||
        data.dataAccess ||
        data.privacyLevel ||
        "summary"
      );

      const financeContext =
        data.financeContext ||
        data.dataContext ||
        data.context ||
        data.summary ||
        data.financeData ||
        {};

      const chatHistory = Array.isArray(data.chatHistory)
        ? data.chatHistory.slice(-8)
        : [];

      const client = new OpenAI({
        apiKey: OPENAI_API_KEY.value(),
      });

      const instructions = `
Sei il consulente AI dell'app fAInance.

Obiettivo:
- aiutare l'utente a capire le proprie finanze personali;
- analizzare spese, entrate, budget, ricorrenti e patrimonio quando i dati sono disponibili;
- rispondere anche a domande generali di economia e finanza personale.

Regole:
- rispondi in italiano;
- usa tono chiaro, pratico e diretto;
- non inventare dati che non sono presenti;
- se i dati sono insufficienti, dillo chiaramente;
- non dare consulenza finanziaria personalizzata come se fossi un consulente abilitato;
- quando proponi azioni, indica esempi numerici concreti se possibile;
- rispetta il livello dati autorizzato dall'utente.

Livello dati autorizzato:
${aiDataAccess}

Interpretazione livelli:
- summary: usa solo riepiloghi aggregati;
- areas: usa riepiloghi aggregati e spese per area;
- full: puoi usare anche le transazioni essenziali ricevute dal frontend.

Formato risposta:
- massimo 5 punti principali;
- se utile, usa importi, percentuali e priorità;
- chiudi senza frasi inutili.
      `.trim();

      const input = [
        {
          role: "developer",
          content: instructions,
        },
        {
          role: "user",
          content:
            "Dati finanziari disponibili:\n" +
            JSON.stringify(financeContext, null, 2),
        },
      ];

      if (chatHistory.length) {
        input.push({
          role: "user",
          content:
            "Storico recente della conversazione:\n" +
            JSON.stringify(chatHistory, null, 2),
        });
      }

      input.push({
        role: "user",
        content: question,
      });

      const response = await client.responses.create({
        model: "gpt-5.2",
        input,
        text: {
          verbosity: "medium",
        },
      });

      const answer =
        response.output_text ||
        "Non sono riuscito a generare una risposta.";

      return res.status(200).json({
        ok: true,
        answer,
        reply: answer,
        message: answer,
      });
    } catch (error) {
      console.error("askFinanceAI error:", error);

      return res.status(500).json({
        ok: false,
        error: error.message || "Errore interno durante la risposta AI.",
      });
    }
  }
);

exports.scanReceiptOCR = onRequest(
  {
    region: "europe-west1",
    cors: true,
    timeoutSeconds: 60,
    memory: "1GiB",
  },
  async (req, res) => {
    setCors(res);

    if (handleOptions(req, res)) return;

    if (req.method !== "POST") {
      return res.status(405).json({
        ok: false,
        error: "Metodo non consentito. Usa POST.",
      });
    }

    try {
      const authUser = await requireFirebaseUser(req, res);
      if (!authUser) return;

      const data = req.body || {};

      const rawImage =
        data.imageBase64 ||
        data.image ||
        data.photoBase64 ||
        data.receiptBase64 ||
        "";

      if (!rawImage) {
        return res.status(400).json({
          ok: false,
          error: "Immagine scontrino mancante.",
        });
      }

      const imageBase64 = String(rawImage)
        .replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "")
        .trim();

      if (!imageBase64) {
        return res.status(400).json({
          ok: false,
          error: "Formato immagine non valido.",
        });
      }

      const client = new vision.ImageAnnotatorClient();

      const [result] = await client.textDetection({
        image: {
          content: imageBase64,
        },
      });

      const detections = result.textAnnotations || [];
      const text = detections[0] && detections[0].description
        ? detections[0].description
        : "";

      if (!text.trim()) {
        return res.status(200).json({
          ok: true,
          text: "",
          amount: null,
          date: null,
          merchant: "",
          description: "",
          category: "",
          method: "",
          confidence: 0,
          warning: "Nessun testo riconosciuto nello scontrino.",
        });
      }

      const parsed = parseReceiptText(text);

      return res.status(200).json({
        ok: true,
        text,
        amount: parsed.amount,
        date: parsed.date,
        merchant: parsed.merchant,
        description: parsed.description,
        category: parsed.category,
        method: parsed.method,
        confidence: parsed.confidence,
        raw: parsed,
      });
    } catch (error) {
      console.error("scanReceiptOCR error:", error);

      return res.status(500).json({
        ok: false,
        error: error.message || "Errore interno durante la lettura dello scontrino.",
      });
    }
  }
);

function parseReceiptText(text) {
  const normalized = String(text || "")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  const lines = normalized
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const upperLines = lines.map((line) => line.toUpperCase());

  const merchant = detectMerchant(lines);
  const amount = detectTotalAmount(lines);
  const date = detectDate(lines);
  const method = detectPaymentMethod(upperLines);
  const category = detectCategory(upperLines, merchant);

  const description = merchant || "Scontrino";

  let confidence = 0.35;

  if (amount !== null) confidence += 0.3;
  if (date) confidence += 0.15;
  if (merchant) confidence += 0.1;
  if (category) confidence += 0.05;
  if (method) confidence += 0.05;

  confidence = Math.min(0.95, Math.round(confidence * 100) / 100);

  return {
    amount,
    date,
    merchant,
    description,
    category,
    method,
    confidence,
  };
}

function detectMerchant(lines) {
  if (!lines.length) return "";

  const ignored = [
    "SCONTRINO",
    "DOCUMENTO",
    "COMMERCIALE",
    "FISCALE",
    "PARTITA IVA",
    "P.IVA",
    "CODICE FISCALE",
    "TEL",
    "TELEFONO",
    "VIA",
    "PIAZZA",
    "CORSO",
    "EURO",
    "TOTALE",
    "IMPORTO",
    "PAGAMENTO",
    "TRANSAZIONE",
    "CASSA",
    "OPERATORE",
    "COPIA",
    "CLIENTE",
  ];

  for (let i = 0; i < Math.min(lines.length, 8); i += 1) {
    const candidate = cleanMerchant(lines[i]);

    if (!candidate) continue;

    const upper = candidate.toUpperCase();

    const isIgnored = ignored.some((word) => upper.includes(word));

    if (!isIgnored && candidate.length >= 3 && /[A-Za-zÀ-ÿ]/.test(candidate)) {
      return candidate;
    }
  }

  return cleanMerchant(lines[0] || "");
}

function cleanMerchant(value) {
  return String(value || "")
    .replace(/[*#=_~]/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 60);
}

function detectTotalAmount(lines) {
  const priorityWords = [
    "TOTALE COMPLESSIVO",
    "TOTALE DOCUMENTO",
    "TOTALE EURO",
    "TOTALE EUR",
    "TOTALE",
    "IMPORTO TOTALE",
    "IMPORTO",
    "DA PAGARE",
    "PAGATO",
    "BANCOMAT",
    "CARTA",
    "CONTANTI",
  ];

  let best = null;
  let bestScore = -1;

  lines.forEach((line, index) => {
    const upper = line.toUpperCase();

    const amounts = extractAmounts(line);

    if (!amounts.length) return;

    let score = 0;

    priorityWords.forEach((word, wordIndex) => {
      if (upper.includes(word)) {
        score += 100 - wordIndex * 3;
      }
    });

    score += index > lines.length / 2 ? 10 : 0;

    amounts.forEach((amount) => {
      const amountScore = score + Math.min(amount, 9999) / 1000;

      if (amountScore > bestScore) {
        best = amount;
        bestScore = amountScore;
      }
    });
  });

  if (best !== null) return best;

  const allAmounts = [];

  lines.forEach((line) => {
    extractAmounts(line).forEach((amount) => {
      if (amount > 0 && amount < 10000) {
        allAmounts.push(amount);
      }
    });
  });

  if (!allAmounts.length) return null;

  return Math.max(...allAmounts);
}

function extractAmounts(line) {
  const matches = String(line || "").match(/(?:€|EUR)?\s*([0-9]{1,4}(?:[.,][0-9]{2}))/gi) || [];

  return matches
    .map((raw) => {
      const cleaned = raw
        .replace(/EUR/gi, "")
        .replace(/€/g, "")
        .replace(/\s/g, "")
        .replace(",", ".");

      const n = parseFloat(cleaned);

      if (Number.isNaN(n)) return null;

      return Math.round(n * 100) / 100;
    })
    .filter((n) => n !== null && n > 0);
}

function detectDate(lines) {
  const text = lines.join(" ");

  const patterns = [
    /\b([0-3]?\d)[\/.-]([01]?\d)[\/.-](20\d{2})\b/,
    /\b([0-3]?\d)[\/.-]([01]?\d)[\/.-](\d{2})\b/,
    /\b(20\d{2})[\/.-]([01]?\d)[\/.-]([0-3]?\d)\b/,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);

    if (!match) continue;

    let year;
    let month;
    let day;

    if (match[1] && match[1].length === 4) {
      year = match[1];
      month = match[2];
      day = match[3];
    } else {
      day = match[1];
      month = match[2];
      year = match[3];

      if (year.length === 2) {
        year = Number(year) > 70 ? `19${year}` : `20${year}`;
      }
    }

    const iso = [
      String(year).padStart(4, "0"),
      String(month).padStart(2, "0"),
      String(day).padStart(2, "0"),
    ].join("-");

    if (isValidISODate(iso)) return iso;
  }

  return null;
}

function isValidISODate(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;

  const d = new Date(`${iso}T00:00:00Z`);

  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === iso;
}

function detectPaymentMethod(upperLines) {
  const joined = upperLines.join(" ");

  if (
    joined.includes("BANCOMAT") ||
    joined.includes("CARTA") ||
    joined.includes("POS") ||
    joined.includes("MASTERCARD") ||
    joined.includes("VISA") ||
    joined.includes("AMEX") ||
    joined.includes("CONTACTLESS")
  ) {
    return "Carta";
  }

  if (
    joined.includes("CONTANTI") ||
    joined.includes("CASH") ||
    joined.includes("RESTO")
  ) {
    return "Contanti";
  }

  if (joined.includes("PAYPAL")) {
    return "PayPal";
  }

  return "";
}

function detectCategory(upperLines, merchant) {
  const joined = `${upperLines.join(" ")} ${String(merchant || "").toUpperCase()}`;

  if (
    joined.includes("ESSELUNGA") ||
    joined.includes("CONAD") ||
    joined.includes("CARREFOUR") ||
    joined.includes("COOP") ||
    joined.includes("LIDL") ||
    joined.includes("ALDI") ||
    joined.includes("EUROSPIN") ||
    joined.includes("PENNY") ||
    joined.includes("SUPERMERCATO") ||
    joined.includes("MARKET") ||
    joined.includes("ALIMENTARI")
  ) {
    return "Supermercato";
  }

  if (
    joined.includes("RISTORANTE") ||
    joined.includes("TRATTORIA") ||
    joined.includes("PIZZERIA") ||
    joined.includes("SUSHI") ||
    joined.includes("BURGER")
  ) {
    return "Ristorante";
  }

  if (
    joined.includes("BAR") ||
    joined.includes("CAFFE") ||
    joined.includes("CAFFÈ") ||
    joined.includes("PASTICCERIA")
  ) {
    return "Bar";
  }

  if (
    joined.includes("FARMACIA") ||
    joined.includes("PARAFARMACIA")
  ) {
    return "Medicina";
  }

  if (
    joined.includes("BENZINA") ||
    joined.includes("DIESEL") ||
    joined.includes("CARBURANTE") ||
    joined.includes("ENI") ||
    joined.includes("Q8") ||
    joined.includes("IP ") ||
    joined.includes("TAMOIL")
  ) {
    return "Carburante";
  }

  if (
    joined.includes("PARK") ||
    joined.includes("PARCHEGGIO") ||
    joined.includes("SOSTA")
  ) {
    return "Parcheggi";
  }

  if (
    joined.includes("IKEA") ||
    joined.includes("LEROY MERLIN") ||
    joined.includes("BRICO")
  ) {
    return "Arredamento";
  }

  return "";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================================
// fAInance 2.0 Phase 11 - Test-only account lifecycle, Share and notifications.
// These functions fail closed when accidentally deployed outside Firebase Test.
// ============================================================================

const FAINANCE_TEST_PROJECT_ID = "fainance-test-20260823195207";
const FAINANCE_PRODUCTION_PROJECT_ID = "fainance-a7794";
const FAINANCE_TEST_WEB_ORIGIN = "https://" + FAINANCE_TEST_PROJECT_ID + ".web.app";
const FAINANCE_PRODUCTION_WEB_ORIGIN = "https://" + FAINANCE_PRODUCTION_PROJECT_ID + ".web.app";
const FAINANCE_TEST_EMAIL_LOGO_URL = FAINANCE_TEST_WEB_ORIGIN + "/fainance-email/logo-512.png";
const FAINANCE_TEST_EMAIL_SPLASH_URL = FAINANCE_TEST_WEB_ORIGIN + "/fainance-email/splash.png";
const FAINANCE_PRODUCTION_EMAIL_LOGO_URL = FAINANCE_PRODUCTION_WEB_ORIGIN + "/fainance-email/logo-512.png";
const FAINANCE_PRODUCTION_EMAIL_SPLASH_URL = FAINANCE_PRODUCTION_WEB_ORIGIN + "/fainance-email/splash.png";

function activeProjectId() {
  try {
    return String(
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      (process.env.FIREBASE_CONFIG ? JSON.parse(process.env.FIREBASE_CONFIG).projectId : "") ||
      ""
    );
  } catch (_error) {
    return "";
  }
}

function requireTestBackend(response) {
  const projectId = activeProjectId();
  if (projectId !== FAINANCE_TEST_PROJECT_ID) {
    if (response) {
      response.status(412).json({
        ok: false,
        error: "Funzione disponibile esclusivamente nell'ambiente Test.",
      });
    }
    return false;
  }
  return true;
}

function verificationProjectConfig() {
  const projectId = activeProjectId();
  if (projectId === FAINANCE_TEST_PROJECT_ID) {
    return {
      projectId,
      webOrigin: FAINANCE_TEST_WEB_ORIGIN,
      logoUrl: FAINANCE_TEST_EMAIL_LOGO_URL,
      splashUrl: FAINANCE_TEST_EMAIL_SPLASH_URL,
      isTest: true,
    };
  }
  if (projectId === FAINANCE_PRODUCTION_PROJECT_ID) {
    return {
      projectId,
      webOrigin: FAINANCE_PRODUCTION_WEB_ORIGIN,
      logoUrl: FAINANCE_PRODUCTION_EMAIL_LOGO_URL,
      splashUrl: FAINANCE_PRODUCTION_EMAIL_SPLASH_URL,
      isTest: false,
    };
  }
  return null;
}

function requireVerificationBackend(response) {
  const config = verificationProjectConfig();
  if (!config) {
    if (response) {
      response.status(412).json({
        ok: false,
        error: "Ambiente fAInance non autorizzato per la verifica email.",
      });
    }
    return null;
  }
  return config;
}

function verificationCopy(language) {
  const rows = {
    it: { subject: "Conferma il tuo indirizzo email - fAInance Test", environment: "Ambiente di prova", eyebrow: "Sicurezza account", title: "Conferma il tuo indirizzo email", body: "Manca solo un passaggio per completare la registrazione. Premi il pulsante per verificare l'indirizzo associato al tuo account.", button: "Verifica il mio indirizzo email", alternate: "Link alternativo", ignore: "Se non hai creato tu questo account, puoi ignorare il messaggio.", footer: "Messaggio automatico inviato da fAInance Test." },
    en: { subject: "Confirm your email address - fAInance Test", environment: "Test environment", eyebrow: "Account security", title: "Confirm your email address", body: "Only one step remains to complete registration. Use the button to verify the address linked to your account.", button: "Verify my email address", alternate: "Alternative link", ignore: "If you did not create this account, you can ignore this message.", footer: "Automated message sent by fAInance Test." },
    es: { subject: "Confirma tu correo electrónico - fAInance Test", environment: "Entorno de prueba", eyebrow: "Seguridad de la cuenta", title: "Confirma tu correo electrónico", body: "Solo falta un paso para completar el registro. Pulsa el botón para verificar la dirección asociada a tu cuenta.", button: "Verificar mi correo", alternate: "Enlace alternativo", ignore: "Si no has creado esta cuenta, puedes ignorar este mensaje.", footer: "Mensaje automático enviado por fAInance Test." },
    fr: { subject: "Confirmez votre adresse e-mail - fAInance Test", environment: "Environnement de test", eyebrow: "Sécurité du compte", title: "Confirmez votre adresse e-mail", body: "Il ne reste qu'une étape pour terminer l'inscription. Utilisez le bouton pour vérifier l'adresse associée à votre compte.", button: "Vérifier mon adresse e-mail", alternate: "Lien alternatif", ignore: "Si vous n'avez pas créé ce compte, ignorez ce message.", footer: "Message automatique envoyé par fAInance Test." },
    de: { subject: "E-Mail-Adresse bestätigen - fAInance Test", environment: "Testumgebung", eyebrow: "Kontosicherheit", title: "E-Mail-Adresse bestätigen", body: "Nur noch ein Schritt bis zum Abschluss der Registrierung. Bestätige mit der Schaltfläche die Adresse deines Kontos.", button: "E-Mail-Adresse bestätigen", alternate: "Alternativer Link", ignore: "Wenn du dieses Konto nicht erstellt hast, kannst du diese Nachricht ignorieren.", footer: "Automatische Nachricht von fAInance Test." },
    pt: { subject: "Confirme o seu email - fAInance Test", environment: "Ambiente de teste", eyebrow: "Segurança da conta", title: "Confirme o seu email", body: "Falta apenas um passo para concluir o registo. Use o botão para verificar o endereço associado à sua conta.", button: "Verificar o meu email", alternate: "Ligação alternativa", ignore: "Se não criou esta conta, pode ignorar esta mensagem.", footer: "Mensagem automática enviada por fAInance Test." },
    pl: { subject: "Potwierdź adres e-mail - fAInance Test", environment: "Środowisko testowe", eyebrow: "Bezpieczeństwo konta", title: "Potwierdź adres e-mail", body: "Do zakończenia rejestracji pozostał jeden krok. Użyj przycisku, aby potwierdzić adres konta.", button: "Potwierdź adres e-mail", alternate: "Link alternatywny", ignore: "Jeśli nie utworzyłeś tego konta, zignoruj tę wiadomość.", footer: "Automatyczna wiadomość od fAInance Test." },
    nl: { subject: "Bevestig je e-mailadres - fAInance Test", environment: "Testomgeving", eyebrow: "Accountbeveiliging", title: "Bevestig je e-mailadres", body: "Er is nog een stap nodig om de registratie af te ronden. Gebruik de knop om het adres van je account te bevestigen.", button: "Mijn e-mailadres bevestigen", alternate: "Alternatieve link", ignore: "Als je dit account niet hebt gemaakt, kun je dit bericht negeren.", footer: "Automatisch bericht van fAInance Test." },
    ro: { subject: "Confirmă adresa de email - fAInance Test", environment: "Mediu de test", eyebrow: "Securitatea contului", title: "Confirmă adresa de email", body: "Mai este un singur pas pentru finalizarea înregistrării. Folosește butonul pentru a confirma adresa contului.", button: "Confirmă adresa de email", alternate: "Link alternativ", ignore: "Dacă nu ai creat acest cont, poți ignora mesajul.", footer: "Mesaj automat trimis de fAInance Test." },
    el: { subject: "Επιβεβαίωσε το email σου - fAInance Test", environment: "Περιβάλλον δοκιμών", eyebrow: "Ασφάλεια λογαριασμού", title: "Επιβεβαίωσε το email σου", body: "Απομένει μόνο ένα βήμα για να ολοκληρωθεί η εγγραφή. Πάτησε το κουμπί για να επιβεβαιώσεις τη διεύθυνση του λογαριασμού σου.", button: "Επιβεβαίωση email", alternate: "Εναλλακτικός σύνδεσμος", ignore: "Αν δεν δημιούργησες εσύ αυτόν τον λογαριασμό, μπορείς να αγνοήσεις το μήνυμα.", footer: "Αυτόματο μήνυμα από το fAInance Test." },
  };
  const selected = rows[String(language || "").toLowerCase()] || rows.en;
  const config = verificationProjectConfig();
  if (config && !config.isTest) {
    return {
      ...selected,
      subject: String(selected.subject || "").replace(/fAInance Test/g, "fAInance"),
      environment: "",
      footer: String(selected.footer || "").replace(/fAInance Test/g, "fAInance"),
    };
  }
  return selected;
}

function customEmailActionLink(firebaseLink, language, config) {
  const source = new URL(firebaseLink);
  // Keep the verification handler on the Hosting root. The Vite build uses
  // relative bundle assets, so a nested /auth/action URL can resolve JS/CSS
  // under /auth/assets and produce a blank page on mobile browsers.
  const target = new URL(config.webOrigin + "/");
  source.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  target.searchParams.set("fainanceEmailAction", "1");
  target.searchParams.set("lang", String(language || "it").split("-")[0].toLowerCase());
  return target.toString();
}

function verificationEmailHtml(copy, link, config) {
  const safeLink = escapeHtml(link);
  const logoUrl = escapeHtml(config.logoUrl);
  const splashUrl = escapeHtml(config.splashUrl);
  const environmentBadge = copy.environment
    ? '<div style="font-size:12px;line-height:1.2;font-weight:800;letter-spacing:.7px;text-transform:uppercase;color:#b17a00;margin-top:8px">' + escapeHtml(copy.environment) + '</div>'
    : "";
  return '<!doctype html><html><body style="margin:0;padding:0;background:#f3f7ff;font-family:Arial,Helvetica,sans-serif;color:#102f62">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f3f7ff;padding:28px 12px"><tr><td align="center">' +
    '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 18px 48px rgba(24,62,120,.14)">' +
    '<tr><td style="padding:0;background:#eef5ff"><img src="' + splashUrl + '" alt="fAInance" width="560" style="display:block;width:100%;height:auto;border:0"></td></tr>' +
    '<tr><td align="center" style="padding:28px 34px 8px"><img src="' + logoUrl + '" alt="fAInance" width="76" height="76" style="display:block;width:76px;height:76px;object-fit:contain;border:0">' + environmentBadge + '</td></tr>' +
    '<tr><td align="center" style="padding:14px 34px 2px"><div style="width:92px;height:92px;border-radius:50%;background:#f1f6ff;border:1px solid #e1ebfb;line-height:92px;text-align:center;font-size:42px;color:#245bc1">&#9993;</div></td></tr>' +
    '<tr><td style="padding:18px 34px 0"><div style="font-size:27px;line-height:1.2;font-weight:800;color:#0d2e63;text-align:center">' + escapeHtml(copy.title) + '</div><div style="width:38px;height:3px;border-radius:4px;background:#d9a52c;margin:16px auto 20px"></div><div style="font-size:15px;line-height:1.65;color:#596a82;text-align:left">' + escapeHtml(copy.body) + '</div></td></tr>' +
    '<tr><td align="center" style="padding:24px 34px 14px"><a href="' + safeLink + '" style="display:inline-block;box-sizing:border-box;min-width:290px;background:#1d59d1;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;line-height:1;padding:18px 28px;border-radius:15px;box-shadow:0 10px 24px rgba(29,89,209,.22)">' + escapeHtml(copy.button) + ' &nbsp;&#8594;</a></td></tr>' +
    '<tr><td style="padding:4px 34px 18px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td style="height:1px;background:#e8edf5"></td><td style="width:66px;text-align:center;font-size:11px;color:#9aa4b4">' + escapeHtml(copy.alternate) + '</td><td style="height:1px;background:#e8edf5"></td></tr></table></td></tr>' +
    '<tr><td style="padding:0 34px 20px"><div style="background:#f6f8fc;border:1px solid #e5eaf2;border-radius:14px;padding:13px 14px;font-size:12px;line-height:1.55;color:#7a8799;word-break:break-all"><a href="' + safeLink + '" style="color:#1d59d1;text-decoration:none">' + safeLink + '</a></div></td></tr>' +
    '<tr><td style="padding:0 34px 26px"><div style="background:#f8faff;border:1px solid #e7edf7;border-radius:14px;padding:14px 16px;font-size:12px;line-height:1.55;color:#68778c">&#128274;&nbsp; ' + escapeHtml(copy.ignore) + '</div></td></tr>' +
    '<tr><td style="padding:18px 34px;background:#0d2e63;color:#ffffff;font-size:11px;line-height:1.55;text-align:center">' + escapeHtml(copy.footer) + '</td></tr>' +
    '</table></td></tr></table></body></html>';
}

function configuredVerificationSender() {
  const sender = String(process.env.FAINANCE_EMAIL_FROM || "").trim();
  if (!sender || /@resend\.dev[>\s]*$/i.test(sender)) return "";
  return sender;
}

function extractResendDomainRows(result) {
  if (!result || result.error) return [];
  if (Array.isArray(result.data)) return result.data;
  if (result.data && Array.isArray(result.data.data)) return result.data.data;
  return [];
}

async function resolveVerificationSender(resend) {
  const configured = configuredVerificationSender();
  if (configured) return configured;

  try {
    const listed = await resend.domains.list();
    const rows = extractResendDomainRows(listed);
    const verified = rows.filter((row) => {
      const status = String((row && row.status) || "").toLowerCase();
      const name = String((row && row.name) || "").toLowerCase();
      const sending = String((row && row.capabilities && row.capabilities.sending) || "enabled").toLowerCase();
      return status === "verified" && sending !== "disabled" && (name === "fainanceapp.it" || name.endsWith(".fainanceapp.it"));
    });
    if (verified.length) {
      const preferred = verified.find((row) => String(row.name || "").toLowerCase() === "fainanceapp.it") || verified[0];
      return "fAInance <noreply@" + String(preferred.name).trim() + ">";
    }
  } catch (error) {
    console.warn("Resend domain lookup unavailable:", error && error.message ? error.message : error);
  }

  return "fAInance <noreply@fainanceapp.it>";
}

async function probeVerificationSender(resend, sender, config) {
  const label = config && config.isTest ? "fAInance Test" : "fAInance";
  const probe = await resend.emails.send({
    from: sender,
    to: ["delivered@resend.dev"],
    subject: label + " - verifica configurazione email",
    text: "Verifica tecnica del mittente email " + label + ".",
  });
  if (probe.error) {
    return {
      ok: false,
      error: String(probe.error.message || "RESEND_SENDER_NOT_READY"),
    };
  }
  return { ok: true, id: String((probe.data && probe.data.id) || "") };
}

exports.sendCustomVerificationEmail = onRequest(
  {
    secrets: [RESEND_API_KEY],
    region: "europe-west1",
    cors: true,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (req, res) => {
    setCors(res);
    if (handleOptions(req, res)) return;
    const verificationConfig = requireVerificationBackend(res);
    if (!verificationConfig) return;

    try {
      const resend = new Resend(RESEND_API_KEY.value());
      const sender = await resolveVerificationSender(resend);

      if (req.method === "GET" && String((req.query && req.query.health) || "") === "1") {
        const probe = await probeVerificationSender(resend, sender, verificationConfig);
        return res.status(probe.ok ? 200 : 503).json({
          ok: probe.ok,
          senderReady: probe.ok,
          projectId: activeProjectId(),
          sender,
          actionHandler: "root-query",
          code: probe.ok ? "verification/sender-ready" : "verification/sender-not-ready",
          error: probe.ok ? "" : probe.error,
        });
      }

      if (req.method !== "POST") {
        return res.status(405).json({ ok: false, error: "Metodo non consentito.", code: "verification/method-not-allowed" });
      }

      const authUser = await requireFirebaseUser(req, res);
      if (!authUser) return;
      const account = await admin.auth().getUser(authUser.uid);
      const email = String(account.email || "").trim().toLowerCase();
      if (!email || email !== String(authUser.email || "").trim().toLowerCase()) {
        return res.status(400).json({ ok: false, error: "Email account non disponibile.", code: "verification/account-email-unavailable" });
      }
      if (account.emailVerified) {
        return res.status(200).json({ ok: true, alreadyVerified: true });
      }

      const language = String((req.body && req.body.language) || "it").split("-")[0].toLowerCase();
      const continueUrl = String((req.body && req.body.continueUrl) || verificationConfig.webOrigin);
      let continueOrigin = "";
      try { continueOrigin = new URL(continueUrl).origin; } catch (_error) {}
      if (continueOrigin !== verificationConfig.webOrigin) {
        return res.status(400).json({ ok: false, error: "Destinazione email non valida.", code: "verification/continue-url-invalid" });
      }

      const db = admin.firestore();
      const rateRef = db.collection("verificationEmailRateLimits").doc(authUser.uid);
      const rateSnapshot = await rateRef.get();
      const lastSentAtMs = Number(rateSnapshot.exists ? rateSnapshot.data().lastSentAtMs : 0);
      if (lastSentAtMs && Date.now() - lastSentAtMs < 45000) {
        return res.status(429).json({ ok: false, error: "Attendi prima di richiedere una nuova email.", code: "verification/too-many-requests" });
      }

      const firebaseLink = await admin.auth().generateEmailVerificationLink(email);
  // FAINANCE_V83_CUSTOM_ACTION_AND_CID_IMAGES
  const fainanceV83FirebaseAction = new URL(firebaseLink);
  let fainanceV83ActionOrigin = 'https://fainance-a7794.web.app';
  try {
    const fainanceV83Continue = new URL(String((req.body && req.body.continueUrl) || ''));
    if (fainanceV83Continue.protocol === 'https:') fainanceV83ActionOrigin = fainanceV83Continue.origin;
  } catch (_fainanceV83OriginError) {}
  const fainanceV83ActionParams = new URLSearchParams();
  fainanceV83ActionParams.set('fainanceEmailAction','1');
  fainanceV83ActionParams.set('mode',fainanceV83FirebaseAction.searchParams.get('mode') || 'verifyEmail');
  fainanceV83ActionParams.set('oobCode',fainanceV83FirebaseAction.searchParams.get('oobCode') || '');
  const fainanceV83ApiKey = fainanceV83FirebaseAction.searchParams.get('apiKey');
  if (fainanceV83ApiKey) fainanceV83ActionParams.set('apiKey',fainanceV83ApiKey);
  fainanceV83ActionParams.set('lang',String((req.body && req.body.language) || 'it').split('-')[0].toLowerCase());
  const fainanceV83ActionUrl = fainanceV83ActionOrigin + '/?' + fainanceV83ActionParams.toString();

      const actionLink = fainanceV83ActionUrl;
      const copy = verificationCopy(language);
      
  let fainanceV83ImageIndex = 0;
  const fainanceV83EmailHtml = String(verificationEmailHtml(copy, actionLink, verificationConfig)).replace(/<img\b[^>]*>/gi,function(tag){
    const lower=tag.toLowerCase();
    let cid='';
    if(/logo/.test(lower) && !/(splash|banner|hero|cover)/.test(lower)) cid='fainance-email-logo-v83';
    else if(/splash|banner|hero|cover/.test(lower)) cid='fainance-email-hero-v83';
    else { cid = fainanceV83ImageIndex++ === 0 ? 'fainance-email-hero-v83' : 'fainance-email-logo-v83'; }
    return tag.replace(/\bsrc=(['"])[^'"]*\1/i,'src="cid:'+cid+'"');
  });
  const fainanceV83InlineAttachments = [
    { content: require('fs').readFileSync(require('path').join(__dirname,'email-assets','verification-hero.png')).toString('base64'), filename:'verification-hero.png', contentId:'fainance-email-hero-v83' },
    { content: require('fs').readFileSync(require('path').join(__dirname,'email-assets','verification-logo.png')).toString('base64'), filename:'verification-logo.png', contentId:'fainance-email-logo-v83' }
  ];

  // FAINANCE_V94_FULL_BRANDED_EMAIL_LAYOUT
  const fainanceV94Copies = {"it":{"eyebrow":"Sicurezza account","title":"Conferma il tuo indirizzo email","body":"Hai quasi finito. Conferma il tuo indirizzo email per attivare il tuo account fAInance e accedere in sicurezza.","button":"Conferma il mio indirizzo email","note":"Se non hai creato tu questo account, puoi ignorare questa email."},"en":{"eyebrow":"Account security","title":"Confirm your email address","body":"You're almost done. Confirm your email address to activate your fAInance account and sign in securely.","button":"Confirm my email address","note":"If you did not create this account, you can ignore this email."},"es":{"eyebrow":"Seguridad de la cuenta","title":"Confirma tu correo electrónico","body":"Ya casi está. Confirma tu correo para activar tu cuenta fAInance y acceder de forma segura.","button":"Confirmar mi correo","note":"Si no has creado esta cuenta, puedes ignorar este correo."},"fr":{"eyebrow":"Sécurité du compte","title":"Confirmez votre adresse e-mail","body":"Vous y êtes presque. Confirmez votre adresse e-mail pour activer votre compte fAInance et vous connecter en toute sécurité.","button":"Confirmer mon adresse e-mail","note":"Si vous n’avez pas créé ce compte, vous pouvez ignorer cet e-mail."},"de":{"eyebrow":"Kontosicherheit","title":"Bestätige deine E-Mail-Adresse","body":"Fast geschafft. Bestätige deine E-Mail-Adresse, um dein fAInance-Konto zu aktivieren und dich sicher anzumelden.","button":"E-Mail-Adresse bestätigen","note":"Wenn du dieses Konto nicht erstellt hast, kannst du diese E-Mail ignorieren."},"pt":{"eyebrow":"Segurança da conta","title":"Confirma o teu endereço de email","body":"Está quase. Confirma o teu email para ativar a conta fAInance e iniciar sessão em segurança.","button":"Confirmar o meu email","note":"Se não criaste esta conta, podes ignorar este email."},"pl":{"eyebrow":"Bezpieczeństwo konta","title":"Potwierdź swój adres e-mail","body":"Prawie gotowe. Potwierdź adres e-mail, aby aktywować konto fAInance i bezpiecznie się zalogować.","button":"Potwierdź mój adres e-mail","note":"Jeśli nie zakładałeś tego konta, możesz zignorować tę wiadomość."},"nl":{"eyebrow":"Accountbeveiliging","title":"Bevestig je e-mailadres","body":"Bijna klaar. Bevestig je e-mailadres om je fAInance-account te activeren en veilig in te loggen.","button":"Mijn e-mailadres bevestigen","note":"Als je dit account niet hebt aangemaakt, kun je deze e-mail negeren."},"ro":{"eyebrow":"Securitatea contului","title":"Confirmă adresa de email","body":"Aproape gata. Confirmă adresa de email pentru a activa contul fAInance și a te autentifica în siguranță.","button":"Confirmă adresa mea de email","note":"Dacă nu ai creat acest cont, poți ignora acest email."},"el":{"eyebrow":"Ασφάλεια λογαριασμού","title":"Επιβεβαιώστε τη διεύθυνση email","body":"Σχεδόν ολοκληρώθηκε. Επιβεβαιώστε το email σας για να ενεργοποιήσετε τον λογαριασμό fAInance και να συνδεθείτε με ασφάλεια.","button":"Επιβεβαίωση email","note":"Αν δεν δημιουργήσατε εσείς αυτόν τον λογαριασμό, αγνοήστε αυτό το email."}};
  const fainanceV94Lang = String((req.body && req.body.language) || 'it').split('-')[0].toLowerCase();
  const fainanceV94Copy = fainanceV94Copies[fainanceV94Lang] || fainanceV94Copies.en;
  const fainanceV94EmailHtml = `<!doctype html>
<html><body style="margin:0;padding:0;background:#eef3ff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;color:#102a56;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#eef3ff;padding:28px 12px;"><tr><td align="center">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dfe7f6;">
<tr><td style="padding:0;background:#eaf1ff;"><img src="cid:fainance-email-hero-v83" alt="fAInance" width="600" style="display:block;width:100%;height:auto;border:0;"></td></tr>
<tr><td align="center" style="padding:30px 36px 8px 36px;"><img src="cid:fainance-email-logo-v83" alt="fAInance" width="150" style="display:block;width:150px;max-width:70%;height:auto;border:0;"></td></tr>
<tr><td align="center" style="padding:10px 40px 0 40px;font-size:13px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#56709b;">${fainanceV94Copy.eyebrow}</td></tr>
<tr><td align="center" style="padding:12px 40px 0 40px;font-size:30px;line-height:1.18;font-weight:800;color:#102a56;">${fainanceV94Copy.title}</td></tr>
<tr><td align="center" style="padding:18px 44px 0 44px;font-size:16px;line-height:1.65;color:#52647f;">${fainanceV94Copy.body}</td></tr>
<tr><td align="center" style="padding:28px 40px 8px 40px;"><a href="${fainanceV83ActionUrl}" style="display:inline-block;background:#156ee8;color:#ffffff;text-decoration:none;font-size:16px;font-weight:800;padding:15px 28px;border-radius:12px;">${fainanceV94Copy.button}</a></td></tr>
<tr><td align="center" style="padding:18px 44px 30px 44px;font-size:13px;line-height:1.55;color:#8290a6;">${fainanceV94Copy.note}</td></tr>
<tr><td align="center" style="padding:18px 30px;background:#f8faff;border-top:1px solid #e8edf7;font-size:12px;color:#8c99ad;">© 2026 fAInance · Smart Finance</td></tr>
</table></td></tr></table></body></html>`;
const delivery = await resend.emails.send({
        from: sender,
        to: [email],
        subject: copy.subject,
        text: copy.title + "\n\n" + copy.body + "\n\n" + actionLink + "\n\n" + copy.ignore,
        html: fainanceV94EmailHtml,
       attachments: fainanceV83InlineAttachments});
      if (delivery.error) {
        console.error("Resend verification delivery error:", delivery.error);
        return res.status(502).json({
          ok: false,
          error: "Invio email di verifica non completato.",
          code: "verification/delivery-failed",
        });
      }

      await rateRef.set({
        uid: authUser.uid,
        lastSentAtMs: Date.now(),
        lastDeliveryId: String((delivery.data && delivery.data.id) || ""),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      return res.status(200).json({ ok: true, delivered: true });
    } catch (error) {
      console.error("sendCustomVerificationEmail error:", error);
      return res.status(500).json({ ok: false, error: "Invio email di verifica non completato.", code: "verification/backend-unavailable" });
    }
  }
);

exports.notifyShareInviteCreated = onDocumentCreated(
  {
    document: "shareInvites/{inviteId}",
    region: "europe-west1",
  },
  async (event) => {
    if (!requireTestBackend()) return;
    const invite = event.data ? event.data.data() : null;
    if (!invite || !invite.invitedUid || invite.status !== "pending") return;
    const inviteId = String(event.params.inviteId);
    await admin.firestore().collection("appNotifications").doc("share_invite_" + inviteId).set({
      targetUid: String(invite.invitedUid),
      type: "share_invite",
      title: "Invito Share",
      message: String(invite.invitedByName || "Un utente") + " ti ha invitato nel progetto " + String(invite.projectName || "Share"),
      projectId: String(invite.projectId || ""),
      inviteId,
      actionType: "open_share_invite",
      actionValue: inviteId,
      source: "share",
      sourceUid: String(invite.invitedByUid || ""),
      read: false,
      status: "active",
      createdAt: new Date().toISOString(),
      createdAtMs: Date.now(),
      expiresAtMs: Date.now() + 180 * 24 * 60 * 60 * 1000,
    }, { merge: true });
  }
);

exports.fanOutImportantCommunication = onDocumentCreated(
  {
    document: "adminCommunications/{communicationId}",
    region: "europe-west1",
    timeoutSeconds: 300,
    memory: "512MiB",
  },
  async (event) => {
    if (!requireTestBackend()) return;
    const communication = event.data ? event.data.data() : null;
    if (!communication || communication.status !== "published") return;
    const title = String(communication.title || "").trim().slice(0, 120);
    const message = String(communication.message || "").trim().slice(0, 1200);
    if (!title || !message || communication.environment !== "test") return;

    const db = admin.firestore();
    const targetPlan = String(communication.targetPlan || "all").toLowerCase();
    let cursor = null;
    let delivered = 0;
    do {
      let usersQuery = db.collection("users").orderBy(admin.firestore.FieldPath.documentId()).limit(400);
      if (cursor) usersQuery = usersQuery.startAfter(cursor);
      const users = await usersQuery.get();
      if (users.empty) break;
      const batch = db.batch();
      users.docs.forEach((userDoc) => {
        const profile = userDoc.data() || {};
        const plan = String(profile.plan || "free").toLowerCase();
        if (targetPlan !== "all" && plan !== targetPlan) return;
        if (String(profile.deletionStatus || "") === "pending") return;
        const notificationId = "broadcast_" + String(event.params.communicationId) + "_" + userDoc.id;
        batch.set(db.collection("appNotifications").doc(notificationId), {
          targetUid: userDoc.id,
          type: "important_communication",
          title,
          message,
          severity: String(communication.severity || "info"),
          actionType: String(communication.actionType || ""),
          actionValue: String(communication.actionValue || ""),
          source: "admin",
          sourceUid: String(communication.createdBy || ""),
          communicationId: String(event.params.communicationId),
          read: false,
          status: "active",
          createdAt: new Date().toISOString(),
          createdAtMs: Date.now(),
          expiresAtMs: Date.now() + 180 * 24 * 60 * 60 * 1000,
        });
        delivered += 1;
      });
      await batch.commit();
      cursor = users.docs[users.docs.length - 1];
      if (users.size < 400) break;
    } while (cursor);

    await event.data.ref.set({
      deliveryStatus: "completed",
      deliveredCount: delivered,
      deliveredAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
);

exports.cleanupExpiredShareAttachments = onSchedule(
  {
    schedule: "15 3 * * *",
    timeZone: "Europe/Rome",
    region: "europe-west1",
    timeoutSeconds: 300,
    memory: "256MiB",
  },
  async () => {
    if (!requireTestBackend()) return;
    const db = admin.firestore();
    const expired = await db.collection("shareAttachments")
      .where("expiresAtMs", "<=", Date.now())
      .limit(400)
      .get();
    if (expired.empty) return;
    const batch = db.batch();
    expired.docs.forEach((row) => batch.delete(row.ref));
    await batch.commit();
  }
);

async function deleteQueryRows(query, recursive) {
  const snapshot = await query.get();
  for (const row of snapshot.docs) {
    if (recursive && typeof admin.firestore().recursiveDelete === "function") {
      await admin.firestore().recursiveDelete(row.ref);
    } else {
      await row.ref.delete();
    }
  }
}

async function deleteAccountAfterGracePeriod(uid) {
  const db = admin.firestore();
  const userRef = db.collection("users").doc(uid);
  const profileSnapshot = await userRef.get();
  const profile = profileSnapshot.exists ? profileSnapshot.data() : {};
  const usernameLower = String((profile && profile.usernameLower) || "").trim().toLowerCase();
  const email = String((profile && profile.email) || "").trim().toLowerCase();

  const ownedProjects = await db.collection("shareProjects").where("ownerUid", "==", uid).get();
  for (const project of ownedProjects.docs) {
    await deleteQueryRows(db.collection("shareAttachments").where("projectId", "==", project.id), false);
    await project.ref.delete();
  }

  const memberProjects = await db.collection("shareProjects").where("memberUids", "array-contains", uid).get();
  for (const project of memberProjects.docs) {
    const data = project.data() || {};
    if (String(data.ownerUid || "") === uid) continue;
    const members = Array.isArray(data.memberUids) ? data.memberUids.filter((id) => String(id) !== uid) : [];
    const participants = Array.isArray(data.participants)
      ? data.participants.filter((participant) => String(participant.uid || "") !== uid)
      : [];
    await project.ref.set({
      memberUids: members,
      participants,
      updatedAt: new Date().toISOString(),
    }, { merge: true });
  }

  const cleanupQueries = [
    db.collection("shareInvites").where("invitedUid", "==", uid),
    db.collection("shareInvites").where("invitedByUid", "==", uid),
    db.collection("shareNotifications").where("userUid", "==", uid),
    db.collection("appNotifications").where("targetUid", "==", uid),
    db.collection("appNotifications").where("sourceUid", "==", uid),
    db.collection("shareAttachments").where("ownerUid", "==", uid),
    db.collection("accountBackupMetadata").where("uid", "==", uid),
    db.collection("technicalLogs").where("uid", "==", uid),
    db.collection("userLookup").where("uid", "==", uid),
    db.collection("mail").where("userUid", "==", uid),
  ];
  for (const cleanupQuery of cleanupQueries) {
    await deleteQueryRows(cleanupQuery, false);
  }

  if (usernameLower) {
    const usernameRef = db.collection("usernames").doc(usernameLower);
    const usernameSnapshot = await usernameRef.get();
    if (usernameSnapshot.exists && String(usernameSnapshot.data().uid || "") === uid) await usernameRef.delete();
    const loginRef = db.collection("usernameLogin").doc(usernameLower);
    const loginSnapshot = await loginRef.get();
    if (loginSnapshot.exists && String(loginSnapshot.data().uid || "") === uid) await loginRef.delete();
  }
  if (email) {
    const emailLookup = db.collection("userLookup").doc("email:" + email.replace(/\//g, "_"));
    const emailLookupSnapshot = await emailLookup.get();
    if (emailLookupSnapshot.exists && String(emailLookupSnapshot.data().uid || "") === uid) await emailLookup.delete();
  }

  const userDataRef = db.collection("userData").doc(uid);
  if (typeof db.recursiveDelete === "function") {
    await db.recursiveDelete(userDataRef).catch(() => userDataRef.delete());
    await db.recursiveDelete(userRef).catch(() => userRef.delete());
  } else {
    await userDataRef.delete().catch(() => undefined);
    await userRef.delete().catch(() => undefined);
  }
  await db.collection("adminUserMetadata").doc(uid).delete().catch(() => undefined);
  await db.collection("verificationEmailRateLimits").doc(uid).delete().catch(() => undefined);
  await admin.auth().deleteUser(uid).catch((error) => {
    if (error && error.code !== "auth/user-not-found") throw error;
  });
  await db.collection("accountDeletionRequests").doc(uid).delete();
}

exports.processDueAccountDeletions = onSchedule(
  {
    schedule: "30 3 * * *",
    timeZone: "Europe/Rome",
    region: "europe-west1",
    timeoutSeconds: 540,
    memory: "512MiB",
  },
  async () => {
    if (!requireTestBackend()) return;
    const db = admin.firestore();
    const nowIso = new Date().toISOString();
    const pending = await db.collection("accountDeletionRequests")
      .where("status", "==", "pending")
      .limit(200)
      .get();
    for (const request of pending.docs) {
      const data = request.data() || {};
      if (!data.scheduledAt || String(data.scheduledAt) > nowIso) continue;
      try {
        await request.ref.set({
          processingAt: admin.firestore.FieldValue.serverTimestamp(),
          lastError: "",
          attempts: admin.firestore.FieldValue.increment(1),
        }, { merge: true });
        await deleteAccountAfterGracePeriod(request.id);
      } catch (error) {
        console.error("Account deletion failed for", request.id, error);
        await request.ref.set({
          lastError: String((error && error.message) || "ACCOUNT_DELETION_FAILED").slice(0, 500),
          lastErrorAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
  }
);

exports.syncAccountDeletionAdminMetadata = onDocumentWritten(
  {
    document: "users/{userId}",
    region: "europe-west1",
  },
  async (event) => {
    if (!requireTestBackend()) return;
    const uid = String(event.params.userId);
    const adminRef = admin.firestore().collection("adminUserMetadata").doc(uid);
    if (!event.data || !event.data.after.exists) {
      await adminRef.delete().catch(() => undefined);
      return;
    }
    const profile = event.data.after.data() || {};
    await adminRef.set({
      deletionStatus: String(profile.deletionStatus || "active"),
      deletionRequestedAt: String(profile.deletionRequestedAt || ""),
      deletionScheduledAt: String(profile.deletionScheduledAt || ""),
      deletionGraceDays: Number(profile.deletionGraceDays || 15),
      profileUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
);

// FAINANCE_V79_EXISTING_FUNCTION_STANDARD_FIREBASE_LINK
