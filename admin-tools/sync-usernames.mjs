import admin from "firebase-admin";

const PROJECT_ID = "fainance-a7794";
const MIN = 3;
const MAX = 24;

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error("GOOGLE_APPLICATION_CREDENTIALS non impostata.");
}

admin.initializeApp({ credential: admin.credential.applicationDefault() });

const appProject = admin.app().options.credential?.projectId;
if (appProject && appProject !== PROJECT_ID) {
  throw new Error(`Service Account del progetto sbagliato: ${appProject}`);
}

const db = admin.firestore();

function normalize(value) {
  return String(value ?? "").trim();
}

function key(value) {
  return normalize(value).toLocaleLowerCase("en-US");
}

function valid(value) {
  const username = normalize(value);
  if (username.length < MIN || username.length > MAX) return false;
  if (!/^[A-Za-z0-9._-]+$/.test(username)) return false;
  return /[A-Za-z0-9]/.test(username);
}

async function main() {
  console.log("=== fAInance Username Registry Sync ===");

  const profiles = await db.collection("users").select("username", "usernameLower").get();
  const candidates = [];
  const owners = new Map();

  for (const doc of profiles.docs) {
    const data = doc.data() || {};
    const username = normalize(data.username);
    if (!username) continue;
    if (!valid(username)) {
      throw new Error(`Username esistente non valido per UID ${doc.id}: ${username}`);
    }
    const usernameLower = key(data.usernameLower || username);
    const previousOwner = owners.get(usernameLower);
    if (previousOwner && previousOwner !== doc.id) {
      throw new Error(`Conflitto username case-insensitive: ${usernameLower} appartiene a ${previousOwner} e ${doc.id}`);
    }
    owners.set(usernameLower, doc.id);
    candidates.push({ uid: doc.id, username, usernameLower });
  }

  console.log(`Profili con username valido: ${candidates.length}`);

  let batch = db.batch();
  let count = 0;
  let written = 0;

  for (const item of candidates) {
    const ref = db.collection("usernames").doc(item.usernameLower);
    batch.set(ref, {
      uid: item.uid,
      username: item.username,
      usernameLower: item.usernameLower,
      source: "registry-sync",
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    count += 1;
    written += 1;

    if (count >= 400) {
      await batch.commit();
      batch = db.batch();
      count = 0;
    }
  }

  if (count) await batch.commit();

  console.log(`[OK] Username registry sincronizzato: ${written}`);
  console.log("[OK] Nessun dato finanziario letto");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
