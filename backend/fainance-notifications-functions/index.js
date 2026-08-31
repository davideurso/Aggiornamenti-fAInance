"use strict";

const crypto = require("crypto");
const { onCall, HttpsError, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

const db = getFirestore();
const REGION = "europe-west1";
const SUPPORTED = new Set(["it", "en", "es", "fr", "de", "pt", "pl", "nl", "ro", "el"]);
const ADMIN_ROLES = new Set(["admin", "superadmin"]);
const VALID_SEVERITIES = new Set(["info", "success", "warning", "critical"]);
const VERIFICATION_TEST_PROJECT_ID = "fainance-test-20260823195207";
const verificationEmailRateLimits = new Map();

const SYSTEM_TEXT = {
  share_invite: {
    it: ["Invito Share", "{name} ti ha invitato nel progetto {project}"],
    en: ["Share invitation", "{name} invited you to the project {project}"],
    es: ["Invitación Share", "{name} te ha invitado al proyecto {project}"],
    fr: ["Invitation Share", "{name} vous a invité au projet {project}"],
    de: ["Share-Einladung", "{name} hat dich zum Projekt {project} eingeladen"],
    pt: ["Convite Share", "{name} convidou-te para o projeto {project}"],
    pl: ["Zaproszenie Share", "{name} zaprosił(a) Cię do projektu {project}"],
    nl: ["Share-uitnodiging", "{name} heeft je uitgenodigd voor het project {project}"],
    ro: ["Invitație Share", "{name} te-a invitat în proiectul {project}"],
    el: ["Πρόσκληση Share", "Ο/Η {name} σας προσκάλεσε στο έργο {project}"],
  },
  share_invite_accepted: {
    it: ["Invito Share accettato", "{name} ha accettato l'invito al progetto {project}"],
    en: ["Share invitation accepted", "{name} accepted the invitation to the project {project}"],
    es: ["Invitación Share aceptada", "{name} ha aceptado la invitación al proyecto {project}"],
    fr: ["Invitation Share acceptée", "{name} a accepté l’invitation au projet {project}"],
    de: ["Share-Einladung angenommen", "{name} hat die Einladung zum Projekt {project} angenommen"],
    pt: ["Convite Share aceite", "{name} aceitou o convite para o projeto {project}"],
    pl: ["Zaproszenie Share zaakceptowane", "{name} zaakceptował(a) zaproszenie do projektu {project}"],
    nl: ["Share-uitnodiging geaccepteerd", "{name} heeft de uitnodiging voor het project {project} geaccepteerd"],
    ro: ["Invitație Share acceptată", "{name} a acceptat invitația la proiectul {project}"],
    el: ["Η πρόσκληση Share έγινε αποδεκτή", "Ο/Η {name} αποδέχτηκε την πρόσκληση στο έργο {project}"],
  },
  share_project_deleted: {
    it: ["Progetto Share eliminato", "{name} ha eliminato il progetto {project}. Scegli se conservare le tue spese nello storico personale."],
    en: ["Share project deleted", "{name} deleted the project {project}. Choose whether to keep your expenses in your personal history."],
    es: ["Proyecto Share eliminado", "{name} eliminó el proyecto {project}. Elige si quieres conservar tus gastos en tu historial personal."],
    fr: ["Projet Share supprimé", "{name} a supprimé le projet {project}. Choisissez si vous souhaitez conserver vos dépenses dans votre historique personnel."],
    de: ["Share-Projekt gelöscht", "{name} hat das Projekt {project} gelöscht. Wähle, ob du deine Ausgaben im persönlichen Verlauf behalten möchtest."],
    pt: ["Projeto Share eliminado", "{name} eliminou o projeto {project}. Escolhe se queres guardar as tuas despesas no histórico pessoal."],
    pl: ["Projekt Share usunięty", "{name} usunął/usunęła projekt {project}. Wybierz, czy chcesz zachować swoje wydatki w historii osobistej."],
    nl: ["Share-project verwijderd", "{name} heeft het project {project} verwijderd. Kies of je jouw uitgaven in je persoonlijke geschiedenis wilt bewaren."],
    ro: ["Proiect Share șters", "{name} a șters proiectul {project}. Alege dacă vrei să păstrezi cheltuielile în istoricul personal."],
    el: ["Το έργο Share διαγράφηκε", "Ο/Η {name} διέγραψε το έργο {project}. Επιλέξτε αν θέλετε να κρατήσετε τα έξοδά σας στο προσωπικό ιστορικό."],
  },
};

function normalizeLanguage(value) {
  const code = String(value || "en").toLowerCase().split(/[-_]/)[0];
  return SUPPORTED.has(code) ? code : "en";
}

function cleanText(value, maxLength) {
  return String(value == null ? "" : value).trim().slice(0, maxLength);
}

function interpolate(template, args) {
  return String(template || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key) =>
    String(args && args[key] != null ? args[key] : ""),
  );
}

function systemLocalizedText(notification, language) {
  const type = String(notification.type || "");
  const table = SYSTEM_TEXT[type];
  if (!table) {
    return {
      title: cleanText(notification.title || "fAInance", 120),
      message: cleanText(notification.message || "", 1000),
    };
  }
  const lang = normalizeLanguage(language);
  const row = table[lang] || table.en;
  const args = notification.messageArgs || {};
  return {
    title: row[0],
    message: interpolate(row[1], args),
  };
}

function compactData(notificationId, notification) {
  const keys = ["type", "projectId", "inviteId", "actionType", "actionValue", "campaignId"];
  const out = { notificationId: String(notificationId || "") };
  keys.forEach((key) => {
    if (notification[key] != null && notification[key] !== "") out[key] = String(notification[key]);
  });
  return out;
}

function requireAuth(request) {
  if (!request.auth || !request.auth.uid) throw new HttpsError("unauthenticated", "Authentication required.");
  return request.auth;
}

function requireAdmin(request) {
  const auth = requireAuth(request);
  const role = String((auth.token && auth.token.fainanceAdminRole) || "").toLowerCase();
  if (!ADMIN_ROLES.has(role)) throw new HttpsError("permission-denied", "Admin role required.");
  return { uid: auth.uid, role };
}

exports.fainanceSyncNotificationProfile = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const language = normalizeLanguage(request.data && request.data.language);
  const platform = cleanText(request.data && request.data.platform, 40) || "unknown";
  await db.collection("adminUserMetadata").doc(auth.uid).set(
    {
      uid: auth.uid,
      language,
      platform,
      lastSeenAt: new Date().toISOString(),
      notificationProfileUpdatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );
  return { ok: true, language };
});

exports.fainanceRegisterPushDevice = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const token = cleanText(request.data && request.data.token, 4096);
  if (!token || token.length < 20) throw new HttpsError("invalid-argument", "Invalid push token.");
  const language = normalizeLanguage(request.data && request.data.language);
  const platform = cleanText(request.data && request.data.platform, 40) || "unknown";
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex").slice(0, 40);
  const deviceId = auth.uid + "_" + tokenHash;
  await Promise.all([
    db.collection("pushDevices").doc(deviceId).set(
      {
        targetUid: auth.uid,
        token,
        tokenHash,
        language,
        platform,
        active: true,
        updatedAt: new Date().toISOString(),
        updatedAtServer: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
    db.collection("adminUserMetadata").doc(auth.uid).set(
      {
        uid: auth.uid,
        language,
        platform,
        lastSeenAt: new Date().toISOString(),
        pushEnabled: true,
        notificationProfileUpdatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    ),
  ]);
  return { ok: true };
});

exports.fainanceDeleteAppNotification = onCall({ region: REGION }, async (request) => {
  const auth = requireAuth(request);
  const notificationId = cleanText(request.data && request.data.notificationId, 220);
  if (!notificationId) throw new HttpsError("invalid-argument", "Notification id required.");
  const ref = db.collection("appNotifications").doc(notificationId);
  const snapshot = await ref.get();
  if (!snapshot.exists) return { ok: true, alreadyDeleted: true };
  const notification = snapshot.data() || {};
  if (String(notification.targetUid || "") !== auth.uid) {
    throw new HttpsError("permission-denied", "Only the recipient can delete this notification.");
  }
  await ref.set(
    {
      status: "deleted",
      deletedAt: new Date().toISOString(),
      deletedAtServer: FieldValue.serverTimestamp(),
      deletedByUid: auth.uid,
    },
    { merge: true },
  );
  return { ok: true };
});

exports.fainanceQueueAdminNotificationCampaign = onCall({ region: REGION }, async (request) => {
  const admin = requireAdmin(request);
  const rawTranslations = (request.data && request.data.translations) || {};
  const translations = {};
  SUPPORTED.forEach((language) => {
    const raw = rawTranslations[language] || {};
    const title = cleanText(raw.title, 120);
    const message = cleanText(raw.message, 1000);
    if (title && message) translations[language] = { title, message };
  });
  if (!translations.en || !translations.en.title || !translations.en.message) {
    throw new HttpsError("invalid-argument", "English title and message are required as fallback.");
  }
  const severity = VALID_SEVERITIES.has(String(request.data && request.data.severity))
    ? String(request.data.severity)
    : "info";
  const ref = db.collection("adminNotificationCampaigns").doc();
  await ref.set({
    actorUid: admin.uid,
    actorRole: admin.role,
    audience: { type: "all" },
    translations,
    severity,
    status: "queued",
    createdAt: new Date().toISOString(),
    createdAtServer: FieldValue.serverTimestamp(),
  });
  return { ok: true, campaignId: ref.id };
});

exports.fainanceAdminNotificationCampaign = onDocumentCreated(
  { region: REGION, document: "adminNotificationCampaigns/{campaignId}" },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const campaign = snapshot.data() || {};
    const campaignId = String(event.params.campaignId || snapshot.id);
    const translations = campaign.translations || {};
    const fallback = translations.en || {};
    if (!cleanText(fallback.title, 120) || !cleanText(fallback.message, 1000)) {
      await snapshot.ref.set({ status: "failed", error: "missing_english_fallback" }, { merge: true });
      return;
    }

    const metadataSnap = await db.collection("adminUserMetadata").get();
    const languageByUid = new Map();
    metadataSnap.forEach((row) => {
      const data = row.data() || {};
      languageByUid.set(row.id, normalizeLanguage(data.language));
    });

    let pageToken;
    let recipientCount = 0;
    let batch = db.batch();
    let writes = 0;
    async function flush() {
      if (!writes) return;
      await batch.commit();
      batch = db.batch();
      writes = 0;
    }

    do {
      const page = await getAuth().listUsers(1000, pageToken);
      for (const user of page.users) {
        const uid = String(user.uid || "");
        if (!uid) continue;
        const language = languageByUid.get(uid) || "en";
        const chosen = translations[language] || fallback;
        const title = cleanText(chosen.title || fallback.title, 120);
        const message = cleanText(chosen.message || fallback.message, 1000);
        const notificationRef = db.collection("appNotifications").doc("admin_" + campaignId + "_" + uid);
        batch.set(
          notificationRef,
          {
            targetUid: uid,
            type: "admin_broadcast",
            title,
            message,
            language,
            severity: VALID_SEVERITIES.has(String(campaign.severity)) ? String(campaign.severity) : "info",
            campaignId,
            source: "admin",
            read: false,
            status: "active",
            createdAt: new Date().toISOString(),
            createdAtMs: Date.now(),
          },
          { merge: true },
        );
        recipientCount += 1;
        writes += 1;
        if (writes >= 400) await flush();
      }
      pageToken = page.pageToken;
    } while (pageToken);
    await flush();

    await snapshot.ref.set(
      {
        status: "sent",
        recipientCount,
        sentAt: new Date().toISOString(),
        sentAtServer: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
  },
);

exports.fainancePushOnAppNotification = onDocumentCreated(
  { region: REGION, document: "appNotifications/{notificationId}" },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) return;
    const notification = snapshot.data() || {};
    const uid = cleanText(notification.targetUid, 160);
    if (!uid || notification.status === "deleted") return;

    const deviceSnap = await db.collection("pushDevices").where("targetUid", "==", uid).get();
    const devices = deviceSnap.docs
      .map((row) => ({ ref: row.ref, ...row.data() }))
      .filter((device) => device.active !== false && cleanText(device.token, 4096));
    if (!devices.length) return;

    const messages = devices.map((device) => {
      const content = systemLocalizedText(notification, device.language || notification.language || "en");
      return {
        token: String(device.token),
        notification: { title: content.title || "fAInance", body: content.message || "" },
        data: compactData(event.params.notificationId, notification),
        android: { priority: "high", notification: { sound: "default" } },
        apns: { payload: { aps: { sound: "default" } } },
      };
    });

    const response = await getMessaging().sendEach(messages);
    const invalidRefs = [];
    response.responses.forEach((result, index) => {
      if (result.success) return;
      const code = String(result.error && result.error.code ? result.error.code : "");
      if (code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token") {
        invalidRefs.push(devices[index].ref);
      }
    });
    if (invalidRefs.length) {
      const cleanupBatch = db.batch();
      invalidRefs.forEach((ref) => cleanupBatch.set(ref, { active: false, invalidatedAt: new Date().toISOString() }, { merge: true }));
      await cleanupBatch.commit();
    }
  },
);


// fAInance 2.0 V26 - verifica email server-side stabile, nessun fallback duplicato.
exports.sendCustomVerificationEmail = onRequest({ region: REGION }, async (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Cache-Control", "no-store");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({ ok: false, code: "verification/method-not-allowed" });
    return;
  }

  const runtimeProject = String(process.env.GCLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || "");
  if (runtimeProject && runtimeProject !== VERIFICATION_TEST_PROJECT_ID) {
    res.status(403).json({ ok: false, code: "verification/wrong-project" });
    return;
  }

  const authorization = String(req.get("authorization") || "");
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    res.status(401).json({ ok: false, code: "verification/unauthenticated" });
    return;
  }

  const idToken = String(match[1] || "").trim();
  let decoded;
  try {
    decoded = await getAuth().verifyIdToken(idToken, true);
  } catch (_error) {
    res.status(401).json({ ok: false, code: "verification/unauthenticated" });
    return;
  }
  if (!decoded || !decoded.uid) {
    res.status(401).json({ ok: false, code: "verification/unauthenticated" });
    return;
  }
  if (decoded.email_verified === true) {
    res.status(200).json({ ok: true, alreadyVerified: true });
    return;
  }

  const now = Date.now();
  const rateKey = String(decoded.uid);
  const lastRequest = Number(verificationEmailRateLimits.get(rateKey) || 0);
  if (lastRequest && now - lastRequest < 60000) {
    res.status(429).json({ ok: false, code: "verification/too-many-requests", retryAfterSeconds: Math.ceil((60000 - (now - lastRequest)) / 1000) });
    return;
  }
  verificationEmailRateLimits.set(rateKey, now);

  const apiKey = cleanText(req.body && req.body.apiKey, 256);
  const language = normalizeLanguage(req.body && req.body.language);
  const requestedContinueUrl = cleanText(req.body && req.body.continueUrl, 1000);
  const allowedPrefix = `https://${VERIFICATION_TEST_PROJECT_ID}.web.app/`;
  const continueUrl = requestedContinueUrl.startsWith(allowedPrefix)
    ? requestedContinueUrl
    : allowedPrefix + "?emailVerified=1";

  if (!apiKey) {
    verificationEmailRateLimits.delete(rateKey);
    res.status(400).json({ ok: false, code: "verification/backend-unavailable", error: "Missing Firebase API key" });
    return;
  }

  try {
    const endpoint = `https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${encodeURIComponent(apiKey)}`;
    const upstream = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Firebase-Locale": language,
      },
      body: JSON.stringify({
        requestType: "VERIFY_EMAIL",
        idToken,
        continueUrl,
      }),
    });
    const payload = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      verificationEmailRateLimits.delete(rateKey);
      const upstreamMessage = String(payload && payload.error && payload.error.message || "");
      if (/TOO_MANY|TRY_LATER|QUOTA/i.test(upstreamMessage)) {
        res.status(429).json({ ok: false, code: "verification/too-many-requests" });
        return;
      }
      console.error("sendCustomVerificationEmail upstream failure", upstream.status, upstreamMessage);
      res.status(502).json({ ok: false, code: "verification/backend-unavailable", error: upstreamMessage || "Identity Toolkit error" });
      return;
    }
    res.status(200).json({ ok: true });
  } catch (error) {
    verificationEmailRateLimits.delete(rateKey);
    console.error("sendCustomVerificationEmail failure", error && error.stack ? error.stack : error);
    res.status(503).json({ ok: false, code: "verification/backend-unavailable" });
  }
});
