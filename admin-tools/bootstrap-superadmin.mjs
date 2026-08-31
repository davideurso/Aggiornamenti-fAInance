import fs from "node:fs";
import process from "node:process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const [, , keyPath, email, expectedProjectId = ""] = process.argv;
if (!keyPath || !email) {
  console.error("Usage: node bootstrap-superadmin.mjs <service-account.json> <email> [expected-project-id]");
  process.exit(2);
}

const credentials = JSON.parse(fs.readFileSync(keyPath, "utf8"));
const projectId = String(credentials.project_id || "").trim();
if (!projectId) throw new Error("Service account JSON non valido: project_id mancante");
if (expectedProjectId && projectId !== expectedProjectId) {
  throw new Error(`Project ID non corrispondente. Atteso ${expectedProjectId}, trovato ${projectId}`);
}

const app = getApps()[0] || initializeApp({ credential: cert(credentials), projectId });
const auth = getAuth(app);
const db = getFirestore(app);
const normalizedEmail = String(email).trim().toLowerCase();
const user = await auth.getUserByEmail(normalizedEmail);
const existing = user.customClaims || {};

await auth.setCustomUserClaims(user.uid, { ...existing, fainanceAdminRole: "superadmin" });

await db.doc(`adminUserMetadata/${user.uid}`).set({
  uid: user.uid,
  email: user.email || normalizedEmail,
  displayName: user.displayName || "",
  adminRole: "superadmin",
  accountStatus: user.disabled ? "disabled" : "active",
  updatedAt: new Date().toISOString(),
  lastSeenAt: new Date().toISOString()
}, { merge: true });

await db.doc("systemConfig/public").set({
  adminSecurityVersion: 1,
  adminBootstrapCompleted: true,
  updatedAt: new Date().toISOString(),
  updatedBy: user.uid
}, { merge: true });

await db.collection("adminAudit").add({
  actorUid: user.uid,
  actorEmail: user.email || normalizedEmail,
  action: "admin.bootstrap.superadmin",
  targetType: "authUser",
  targetId: user.uid,
  createdAt: FieldValue.serverTimestamp(),
  metadata: { projectId }
});

console.log(`[OK] Superadmin assegnato a ${user.email || normalizedEmail}`);
console.log(`[OK] UID: ${user.uid}`);
console.log(`[OK] Firebase project: ${projectId}`);
console.log("[INFO] Eseguire logout/login nell'Admin per aggiornare il token con il nuovo custom claim.");
