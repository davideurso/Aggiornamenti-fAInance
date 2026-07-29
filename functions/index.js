const { onRequest } = require("firebase-functions/v2/https");
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
