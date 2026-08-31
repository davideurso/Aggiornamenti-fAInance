import type { User } from "firebase/auth";
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { fbAuth, fbDb } from "../firebase/client";
import { appEnvironment, cloudFunctionUrl, firebaseConfig } from "../config/env";
import { normalizeUsername, usernameLookupKey } from "../profile/username";

export function normalizeAccountEmail(value: unknown): string {
  return String(value || "").trim().toLowerCase();
}

export async function signInWithEmailAccount(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(fbAuth, normalizeAccountEmail(email), password);
  return credential.user;
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

export async function registerEmailAccount(email: string, password: string): Promise<User> {
  const credential = await createUserWithEmailAndPassword(fbAuth, normalizeAccountEmail(email), password);
  return credential.user;
}

export async function sendAccountEmailVerification(user: User, languageCode?: string): Promise<void> {
  try {
    if (languageCode) fbAuth.languageCode = languageCode;
  } catch {
    // best effort
  }
  const authDomain = String(firebaseConfig.authDomain || "").trim();
  const continueUrl = appEnvironment === "test"
    ? `https://${firebaseConfig.projectId}.web.app/?emailVerified=1`
    : authDomain
    ? `https://${authDomain.replace(/^https?:\/\//i, "").replace(/\/$/, "")}`
    : "https://fainanceapp.it";

  if (appEnvironment === "test") {
    const token = await user.getIdToken(true);
    let response: Response;
    try {
      response = await fetch(cloudFunctionUrl("sendCustomVerificationEmail"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          apiKey: String(firebaseConfig.apiKey || ""),
          language: String(languageCode || "it").split("-")[0].toLowerCase(),
          continueUrl,
        }),
      });
    } catch (cause) {
      const error: any = new Error("Verification email backend unavailable");
      error.code = "verification/backend-unavailable";
      error.cause = cause;
      throw error;
    }

    const payload: any = await response.json().catch(() => ({}));
    if (response.status === 429 || payload?.code === "verification/too-many-requests") {
      const error: any = new Error("Too many verification requests");
      error.code = "verification/too-many-requests";
      throw error;
    }
    if (!response.ok || payload?.ok !== true) {
      const error: any = new Error(String(payload?.error || "Verification email backend unavailable"));
      error.code = payload?.code || "verification/backend-unavailable";
      throw error;
    }
    return;
  }

  await sendEmailVerification(user, {
    url: continueUrl,
    handleCodeInApp: false,
  });
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
