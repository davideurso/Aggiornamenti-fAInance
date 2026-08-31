import admin from "firebase-admin";

const PROJECT_ID = "fainance-a7794";

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS non impostata.");
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });

const appProject = admin.app().options.credential?.projectId;
if (appProject && appProject !== PROJECT_ID) {
  throw new Error(`Service Account del progetto sbagliato: ${appProject}`);
}

const db = admin.firestore();
const auth = admin.auth();

const SAFE_USER_FIELDS = [
  "name",
  "email",
  "currentPlan",
  "subscriptionPlan",
  "plan",
  "country",
  "authProviders",
  "provider",
  "lastLoginProvider",
  "createdAt",
  "updatedAt",
  "username",
  "userName",
  "handle",
  "residenceCompleted",
  "deletionStatus",
  "deletionRequestedAt",
  "deletionScheduledAt",
  "deletionGraceDays"
];

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null && value !== "");
}

function normalizePlan(data) {
  const raw = firstDefined(data.currentPlan, data.subscriptionPlan, data.plan);
  const value = String(raw ?? "free").trim().toLowerCase();
  if (value.includes("premium")) return "premium";
  if (value.includes("free") || !value) return "free";
  return value;
}

function timestamp(value, fallback) {
  if (value && typeof value.toDate === "function") return value;
  const parsed = new Date(value || fallback || Date.now());
  const safeDate = Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  return admin.firestore.Timestamp.fromDate(safeDate);
}

function uniqueStrings(values) {
  return [...new Set(values.flat().filter((value) => typeof value === "string" && value.trim()).map((value) => value.trim()))];
}

async function listAllAuthUsers() {
  const result = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    result.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return result;
}

async function readSafeProfiles() {
  const snap = await db.collection("users").select(...SAFE_USER_FIELDS).get();
  return new Map(snap.docs.map((doc) => [doc.id, doc.data() || {}]));
}

async function main() {
  console.log("=== fAInance Admin - Refresh indice utenti ===");
  const [users, profiles] = await Promise.all([listAllAuthUsers(), readSafeProfiles()]);
  console.log(`Account Firebase Auth: ${users.length}`);
  console.log(`Profili /users letti con campi selezionati: ${profiles.size}`);

  let batch = db.batch();
  let batchCount = 0;
  let written = 0;
  let premium = 0;

  for (const user of users) {
    const data = profiles.get(user.uid) || {};
    const plan = normalizePlan(data);
    if (plan === "premium") premium += 1;

    const username = firstDefined(data.username, data.userName, data.handle);
    const providers = uniqueStrings([
      (user.providerData || []).map((item) => item.providerId),
      Array.isArray(data.authProviders) ? data.authProviders : [],
      data.provider ? [data.provider] : []
    ]);

    const patch = {
      uid: user.uid,
      email: user.email || data.email || null,
      emailVerified: !!user.emailVerified,
      disabled: !!user.disabled,
      accountStatus: user.disabled ? "disabled" : "active",
      displayName: firstDefined(data.name, user.displayName) || null,
      plan,
      country: data.country || null,
      providers,
      authProviders: Array.isArray(data.authProviders) ? data.authProviders : [],
      lastLoginProvider: data.lastLoginProvider || null,
      residenceCompleted: typeof data.residenceCompleted === "boolean" ? data.residenceCompleted : null,
      deletionStatus: data.deletionStatus || "active",
      deletionRequestedAt: data.deletionRequestedAt ? timestamp(data.deletionRequestedAt) : null,
      deletionScheduledAt: data.deletionScheduledAt ? timestamp(data.deletionScheduledAt) : null,
      deletionGraceDays: Number(data.deletionGraceDays || 15),
      createdAt: timestamp(data.createdAt, user.metadata.creationTime),
      lastSeenAt: timestamp(user.metadata.lastSignInTime, data.updatedAt || user.metadata.creationTime),
      profileUpdatedAt: data.updatedAt ? timestamp(data.updatedAt) : null,
      indexedAt: admin.firestore.FieldValue.serverTimestamp()
    };

    if (typeof username === "string" && username.trim()) {
      patch.username = username.trim();
      patch.usernameLower = username.trim().toLowerCase();
    }

    batch.set(db.collection("adminUserMetadata").doc(user.uid), patch, { merge: true });
    batchCount += 1;
    written += 1;

    if (batchCount >= 400) {
      await batch.commit();
      batch = db.batch();
      batchCount = 0;
    }
  }

  if (batchCount) await batch.commit();

  console.log(`[OK] Utenti indicizzati: ${written}`);
  console.log(`[INFO] Premium normalizzati: ${premium}`);
  console.log("[OK] /userData NON letto");
  console.log("[OK] Indirizzo, telefono, data di nascita e dati finanziari NON indicizzati");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
