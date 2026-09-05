import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  sendEmailVerification,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import {
  authPersistenceReady,
  fbAuth,
  fbDb,
  isFirebaseStorageQuotaError,
  recoverAuthPersistenceFromStorageQuota,
} from "../firebase/client";
import { normalizeUsername, usernameLookupKey } from "../profile/username";

export function normalizeAccountEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export async function signInWithEmailAccount(email: string, password: string): Promise<User> {
  await authPersistenceReady;
  const normalizedEmail = normalizeAccountEmail(email);
  try {
    const credential = await signInWithEmailAndPassword(fbAuth, normalizedEmail, password);
    return credential.user;
  } catch (error) {
    if (!isFirebaseStorageQuotaError(error)) throw error;
    await recoverAuthPersistenceFromStorageQuota();
    const credential = await signInWithEmailAndPassword(fbAuth, normalizedEmail, password);
    return credential.user;
  }
}

export const EMAIL_VERIFICATION_POLICY_VERSION = 2;

export async function accountRequiresEmailVerification(user: User): Promise<boolean> {
  if (!user || user.emailVerified) return false;
  const providers: any[] = Array.isArray((user as any).providerData)
    ? ((user as any).providerData as any[])
    : [];
  return providers.some(function (provider: any) {
    return provider && provider.providerId === "password";
  });
}
export async function signInWithUsernameAccount(username: string, password: string): Promise<User> {
  const clean = normalizeUsername(username);
  const key = usernameLookupKey(clean);
  if (!clean || !key) {
    const error: any = new Error("USERNAME_REQUIRED");
    error.code = "auth/username-not-found";
    throw error;
  }

  const aliasSnap = await getDoc(doc(fbDb, "usernameLogin", key));
  if (!aliasSnap.exists()) {
    const error: any = new Error("USERNAME_NOT_FOUND");
    error.code = "auth/username-not-found";
    throw error;
  }

  const email = normalizeAccountEmail(aliasSnap.data()?.email);
  if (!email || !email.includes("@")) {
    const error: any = new Error("USERNAME_ALIAS_INVALID");
    error.code = "auth/username-not-found";
    throw error;
  }

  return signInWithEmailAccount(email, password);
}

export async function signInWithAccountIdentifier(identifier: string, password: string): Promise<User> {
  const clean = String(identifier || "").trim();
  if (clean.includes("@")) return signInWithEmailAccount(clean, password);
  return signInWithUsernameAccount(clean, password);
}


// FAINANCE_V68_REGISTRATION_AUTH_READY
async function fainanceCreateUserWithReadyToken(
  auth: Parameters<typeof createUserWithEmailAndPassword>[0],
  email: string,
  password: string
) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);

  // createUserWithEmailAndPassword autentica l'utente, ma su alcuni WebView nativi
  // Firestore puo osservare l'Auth provider qualche istante dopo. Aspettiamo che
  // currentUser e ID token siano realmente pronti prima di avviare le scritture profilo.
  for (let attempt = 0; attempt < 10 && auth.currentUser?.uid !== credential.user.uid; attempt += 1) {
    await new Promise<void>((resolve) => setTimeout(resolve, 50));
  }

  if (auth.currentUser?.uid !== credential.user.uid) {
    const error = new Error("Firebase Auth session not ready after registration.") as Error & { code?: string };
    error.code = "auth/session-not-ready";
    throw error;
  }

  await credential.user.getIdToken(true);
  await new Promise<void>((resolve) => setTimeout(resolve, 120));
  return credential;
}

export async function registerEmailAccount(email: string, password: string): Promise<User> {
  await authPersistenceReady;
  const credential = await fainanceCreateUserWithReadyToken(fbAuth, normalizeAccountEmail(email), password);
  return credential.user;
}

export async function sendAccountEmailVerification(user: User, languageCode?: string): Promise<void> {
  try {
    if (languageCode) fbAuth.languageCode = languageCode;
  } catch {
    // best effort
  }

  // FAINANCE_V95_FIREBASE_STANDARD_VERIFICATION
  await sendEmailVerification(user);
}

export async function reloadAccountUser(user: User): Promise<User> {
  await user.reload();
  return user;
}

export function currentAuthUser(): User | null {
  return fbAuth.currentUser;
}

export function watchAuthState(
  onUser: (user: User | null) => void,
  onError?: (error: unknown) => void,
): () => void {
  return onAuthStateChanged(fbAuth, onUser, onError);
}

export async function signOutAccount(): Promise<void> {
  try {
    if (typeof window !== "undefined") {
      const capacitor = (window as any).Capacitor;
      if (capacitor?.isNativePlatform?.()) {
        try {
          const mod = await import("@capacitor-firebase/authentication");
          if (mod?.FirebaseAuthentication?.signOut) {
            await mod.FirebaseAuthentication.signOut();
          }
        } catch {
          // Firebase web auth remains the source of truth; native cleanup is best effort.
        }
      }
    }
  } finally {
    await signOut(fbAuth).catch(() => undefined);
  }
}
