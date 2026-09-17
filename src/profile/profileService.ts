import type { User } from "firebase/auth";
import { deleteDoc, doc, runTransaction, setDoc } from "firebase/firestore";
import { fbDb } from "../firebase/client";
import { normalizeAccountEmail } from "../auth/authService";
import { mergeRecord, readRecord } from "../data/firestoreRepository";
import type { FainanceUserProfile } from "./types";
import { normalizeUsername, usernameLookupKey, validateUsername } from "./username";

const COLLECTION = "users";
const USERNAMES = "usernames";
const USERNAME_LOGIN = "usernameLogin";

export function splitDisplayName(value: unknown): { firstName: string; lastName: string; name: string } {
  const clean = String(value || "").trim().replace(/\s+/g, " ");
  if (!clean) return { firstName: "", lastName: "", name: "" };
  const parts = clean.split(" ");
  const firstName = parts.shift() || "";
  const lastName = parts.join(" ");
  return { firstName, lastName, name: [firstName, lastName].filter(Boolean).join(" ") };
}

function usernameToken(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .replace(/\.{2,}/g, ".");
}

export function defaultUsernameFromName(firstName: unknown, lastName: unknown, fallback?: string): string {
  const first = usernameToken(firstName);
  const last = usernameToken(lastName);
  // Existing users with only one name keep exactly that token as their username.
  let candidate = first && !last ? first : [first, last].filter(Boolean).join(".");
  if (!candidate) candidate = usernameToken(fallback || "utente");
  if (candidate.length < 3) candidate = (candidate + ".user").slice(0, 24);
  return candidate.slice(0, 24);
}

export async function loadUserProfile(uid: string): Promise<FainanceUserProfile> {
  return (await readRecord<FainanceUserProfile>(COLLECTION, uid)) || {};
}

export async function mergeUserProfile(uid: string, patch: Partial<FainanceUserProfile>): Promise<void> {
  await mergeRecord<FainanceUserProfile>(COLLECTION, uid, patch);
}

export function buildBaseProfilePatch(user: Pick<User, "email" | "displayName">, name?: string): Partial<FainanceUserProfile> {
  const split = splitDisplayName(name || user.displayName || "Utente");
  return {
    name: split.name || "Utente",
    firstName: split.firstName,
    lastName: split.lastName,
    email: normalizeAccountEmail(user.email),
    updatedAt: new Date().toISOString(),
  };
}

export async function ensureBaseUserProfile(user: User, name?: string): Promise<void> {
  const patch = buildBaseProfilePatch(user, name);
  await mergeUserProfile(user.uid, patch);
}

export async function isUsernameAvailable(username: string, excludeUid?: string): Promise<boolean> {
  const clean = normalizeUsername(username);
  if (!clean) return false;
  const error = validateUsername(clean);
  if (error) return false;
  const existing = await readRecord<{ uid?: string }>(USERNAMES, usernameLookupKey(clean));
  if (!existing) return true;
  return !!excludeUid && existing.uid === excludeUid;
}

export async function ensureUsernameLoginAlias(uid: string, username: string, email: string): Promise<void> {
  const clean = normalizeUsername(username);
  const key = usernameLookupKey(clean);
  const normalizedEmail = normalizeAccountEmail(email);
  if (!uid || !clean || !key || !normalizedEmail.includes("@")) return;
  await setDoc(
    doc(fbDb, USERNAME_LOGIN, key),
    { uid, email: normalizedEmail, usernameLower: key, updatedAt: new Date().toISOString() },
    { merge: true },
  );
}

export async function saveUsernameForUser(
  uid: string,
  username: string,
  previousUsername?: string | null,
  accountEmail?: string | null,
): Promise<{ username: string; usernameLower: string }> {
  const clean = normalizeUsername(username);
  if (!clean) throw new Error("USERNAME_REQUIRED");
  const validation = validateUsername(clean);
  if (validation) throw new Error(validation);
  const nextLower = usernameLookupKey(clean);
  const previousLower = usernameLookupKey(previousUsername || "");
  const now = new Date().toISOString();
  let resolvedEmail = normalizeAccountEmail(accountEmail);

  await runTransaction(fbDb, async (transaction) => {
    const userRef = doc(fbDb, COLLECTION, uid);
    const userSnap = await transaction.get(userRef);
    const currentUsername = userSnap.exists() ? String(userSnap.data()?.username || "") : "";
    const currentLower = usernameLookupKey(currentUsername);
    if (!resolvedEmail && userSnap.exists()) resolvedEmail = normalizeAccountEmail(userSnap.data()?.email);
    if (currentUsername && !previousLower && currentLower !== nextLower) throw new Error("USERNAME_ALREADY_SET");

    const usernameRef = doc(fbDb, USERNAMES, nextLower);
    const usernameSnap = await transaction.get(usernameRef);
    const loginRef = doc(fbDb, USERNAME_LOGIN, nextLower);
    const loginSnap = await transaction.get(loginRef);
    if (usernameSnap.exists()) {
      const existingUid = String(usernameSnap.data()?.uid || "");
      if (existingUid && existingUid !== uid) {
        const existingUserRef = doc(fbDb, COLLECTION, existingUid);
        const existingUserSnap = await transaction.get(existingUserRef);
        const existingEmail = existingUserSnap.exists() ? normalizeAccountEmail(existingUserSnap.data()?.email) : "";
        const aliasEmail = loginSnap.exists() ? normalizeAccountEmail(loginSnap.data()?.email) : "";
        const sameAccountEmail = !!resolvedEmail && (existingEmail === resolvedEmail || aliasEmail === resolvedEmail);
        const orphanedReservation = !existingUserSnap.exists() || (!existingEmail && !aliasEmail);
        // reclaim username orphaned by a failed registration
        if (!sameAccountEmail && !orphanedReservation) throw new Error("USERNAME_TAKEN");
      }
    }

    transaction.set(usernameRef,{ uid, username: clean, usernameLower: nextLower, active: true, updatedAt: now },{ merge: true });
    transaction.set(userRef,{ username: clean, usernameLower: nextLower, email: resolvedEmail || "", updatedAt: now },{ merge: true });
    if (resolvedEmail && resolvedEmail.includes("@")) {
      transaction.set(loginRef,{ uid, email: resolvedEmail, usernameLower: nextLower, updatedAt: now },{ merge: true });
    }
    if (previousLower && previousLower !== nextLower) {
      transaction.delete(doc(fbDb, USERNAMES, previousLower));
      transaction.delete(doc(fbDb, USERNAME_LOGIN, previousLower));
    }
  });
  return { username: clean, usernameLower: nextLower };
}

export async function removeUsernameLoginAlias(uid: string, username: string): Promise<void> {
  const key = usernameLookupKey(username);
  if (!uid || !key) return;
  const alias = await readRecord<{ uid?: string }>(USERNAME_LOGIN, key).catch(() => null);
  if (alias?.uid === uid) await deleteDoc(doc(fbDb, USERNAME_LOGIN, key));
}

export async function ensureDefaultUsernameForExistingUser(
  uid: string,
  firstName: string,
  lastName: string,
  fallbackName?: string,
  accountEmail?: string,
): Promise<{ username: string; usernameLower: string }> {
  const current = await loadUserProfile(uid);
  if (current.username) {
    const currentUsername = String(current.username);
    await ensureUsernameLoginAlias(uid, currentUsername, accountEmail || String(current.email || "")).catch(() => undefined);
    return { username: currentUsername, usernameLower: String(current.usernameLower || usernameLookupKey(currentUsername)) };
  }
  const base = defaultUsernameFromName(firstName, lastName, fallbackName || uid.slice(0, 6));
  for (let i = 0; i < 100; i++) {
    const suffix = i === 0 ? "" : "." + String(i + 1);
    const candidate = (base.slice(0, Math.max(3, 24 - suffix.length)) + suffix).slice(0, 24);
    try {
      return await saveUsernameForUser(uid, candidate, "", accountEmail || String(current.email || ""));
    } catch (error: any) {
      const code = String(error?.message || "");
      if (code === "USERNAME_ALREADY_SET") {
        const fresh = await loadUserProfile(uid);
        if (fresh.username) {
          await ensureUsernameLoginAlias(uid, String(fresh.username), accountEmail || String(fresh.email || "")).catch(() => undefined);
          return { username: String(fresh.username), usernameLower: String(fresh.usernameLower || usernameLookupKey(fresh.username)) };
        }
      }
      if (code !== "USERNAME_TAKEN") throw error;
    }
  }
  throw new Error("USERNAME_GENERATION_FAILED");
}
