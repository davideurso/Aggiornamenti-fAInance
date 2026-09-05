import type { User } from "firebase/auth";
import {
  GoogleAuthProvider,
  OAuthProvider,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithPopup,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import {
  authPersistenceReady,
  fbAuth,
  fbDb,
  isFirebaseStorageQuotaError,
  recoverAuthPersistenceFromStorageQuota,
} from "../firebase/client";
import { fainanceIsNativePlatform } from "../native/platform";
import { fainancePromiseTimeout } from "../utils/appRuntime";

export type LoginTranslator = (value: string) => string;

export function isAndroidLoginPlatform(): boolean {
  try {
    const cap = typeof window !== "undefined" ? (window as any).Capacitor : null;
    const platform = cap?.getPlatform ? String(cap.getPlatform()).toLowerCase() : "";
    return platform === "android";
  } catch {
    return false;
  }
}

function authActionSettings() {
  let origin = "https://fainanceapp.it";
  try {
    if (typeof window !== "undefined" && window.location?.origin) origin = window.location.origin;
  } catch {
    // Keep the public fallback used by the legacy runtime.
  }
  return { url: origin, handleCodeInApp: false };
}

async function signInWithCredentialAndQuotaRecovery(credential: any) {
  await authPersistenceReady;
  try {
    return await signInWithCredential(fbAuth, credential);
  } catch (error) {
    if (!isFirebaseStorageQuotaError(error)) throw error;
    await recoverAuthPersistenceFromStorageQuota();
    return await signInWithCredential(fbAuth, credential);
  }
}

export async function performGoogleAccountLogin(): Promise<User> {
  await authPersistenceReady;
  if (fainanceIsNativePlatform()) {
    const mod = await import("@capacitor-firebase/authentication");
    const FirebaseAuthentication = mod.FirebaseAuthentication;
    if (!FirebaseAuthentication?.signInWithGoogle) {
      throw new Error("Google login non disponibile nel plugin di autenticazione installato.");
    }

    async function nativeGoogleAttempt(resetFirst: boolean) {
      if (resetFirst && FirebaseAuthentication.signOut) {
        try { await FirebaseAuthentication.signOut(); } catch { /* best effort */ }
      }
      return FirebaseAuthentication.signInWithGoogle({
        scopes: ["email", "profile"],
        skipNativeAuth: true,
        customParameters: [{ key: "prompt", value: "select_account" }],
      });
    }

    let result: any;
    try {
      result = await nativeGoogleAttempt(false);
    } catch (firstError: any) {
      const message = String(firstError?.message || firstError || "").toLowerCase();
      if (
        message.includes("no credentials") ||
        message.includes("credential") ||
        message.includes("canceled") ||
        message.includes("cancelled")
      ) {
        result = await nativeGoogleAttempt(true);
      } else {
        throw firstError;
      }
    }

    const credentialData = result?.credential || result || {};
    const idToken = credentialData.idToken || credentialData.id_token || "";
    const accessToken = credentialData.accessToken || credentialData.access_token || "";
    if (!idToken && !accessToken) throw new Error("Google login non ha restituito token utilizzabili.");

    const credential = GoogleAuthProvider.credential(idToken || null, accessToken || null);
    const signed = await signInWithCredentialAndQuotaRecovery(credential);
    return signed.user;
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  const signed = await signInWithPopup(fbAuth, provider);
  return signed.user;
}

async function ensureAppleBaseProfile(user: User): Promise<void> {
  if (!user.uid) return;
  const reference = doc(fbDb, "users", user.uid);
  const snapshot: any = await fainancePromiseTimeout(
    getDoc(reference),
    7000,
    "Timeout lettura profilo Apple.",
  ).catch(() => null);

  if (!snapshot || !snapshot.exists || !snapshot.exists()) {
    await fainancePromiseTimeout(
      setDoc(reference, {
        name: String(user.displayName || "Utente").trim() || "Utente",
        email: String(user.email || "").toLowerCase(),
        provider: "apple",
        createdAt: new Date().toISOString(),
      }, { merge: true }),
      7000,
      "Timeout salvataggio profilo Apple.",
    ).catch(() => undefined);
  }
}

export async function performAppleAccountLogin(language: string): Promise<User> {
  await authPersistenceReady;
  let user: User;

  if (fainanceIsNativePlatform()) {
    const mod = await import("@capacitor-firebase/authentication");
    const FirebaseAuthentication = mod.FirebaseAuthentication;
    if (!FirebaseAuthentication?.signInWithApple) {
      throw new Error("Sign in with Apple non disponibile nel plugin di autenticazione installato.");
    }

    const result: any = await FirebaseAuthentication.signInWithApple({
      scopes: ["email", "name"],
      skipNativeAuth: true,
      customParameters: [{ key: "locale", value: language }],
    });

    const credentialData = result?.credential || result || {};
    const idToken = credentialData.idToken || credentialData.id_token || credentialData.identityToken || credentialData.identity_token || "";
    const accessToken = credentialData.accessToken || credentialData.access_token || "";
    const rawNonce = credentialData.rawNonce || credentialData.raw_nonce || credentialData.nonce || "";
    if (!idToken) {
      throw new Error("Apple login non ha restituito identity token utilizzabile. Verifica provider Apple in Firebase Authentication e configurazione Sign in with Apple.");
    }

    const provider = new OAuthProvider("apple.com");
    const credential = provider.credential(
      rawNonce
        ? { idToken, rawNonce, accessToken: accessToken || undefined }
        : { idToken, accessToken: accessToken || undefined },
    );
    const signed = await signInWithCredentialAndQuotaRecovery(credential);
    user = signed.user;
  } else {
    const provider = new OAuthProvider("apple.com");
    provider.addScope("email");
    provider.addScope("name");
    provider.setCustomParameters({ locale: language });
    const signed = await signInWithPopup(fbAuth, provider);
    user = signed.user;
  }

  try { await ensureAppleBaseProfile(user); } catch { /* keep login successful */ }
  return user;
}

export async function sendAccountPasswordReset(email: string, language: string): Promise<void> {
  try { fbAuth.languageCode = language; } catch { /* optional */ }
  await sendPasswordResetEmail(fbAuth, String(email || "").trim().toLowerCase(), authActionSettings());
}

export function googleLoginErrorMessage(error: any, tr: LoginTranslator): string {
  const message = String(error?.message || error || "");
  const code = error?.code || "unknown";
  const lower = message.toLowerCase();
  if (lower.includes("no credentials")) {
    return tr("Errore Google: nessuna credenziale Google disponibile sul dispositivo. Riprova dopo aver selezionato un account Google nel popup.");
  }
  if (lower.includes("cancel") || code === "auth/cancelled-popup-request" || code === "auth/popup-closed-by-user") {
    return tr("Accesso Google annullato.");
  }
  return tr("Errore Google: ") + code + " - " + message;
}

export function appleLoginErrorMessage(error: any, tr: LoginTranslator): string {
  const message = String(error?.message || error || "");
  const code = error?.code || "unknown";
  const lower = message.toLowerCase();
  if (code === "auth/operation-not-allowed" || (lower.includes("apple") && lower.includes("provider") && lower.includes("enable"))) {
    return tr("Errore Apple: il provider Apple non è abilitato in Firebase Authentication.");
  }
  if (code === "auth/account-exists-with-different-credential") {
    return tr("Esiste già un account con questa email. Accedi con il metodo usato in precedenza.");
  }
  if (lower.includes("cancel") || code === "auth/cancelled-popup-request" || code === "auth/popup-closed-by-user") {
    return tr("Accesso Apple annullato.");
  }
  return tr("Errore Apple: ") + code + " - " + message;
}
