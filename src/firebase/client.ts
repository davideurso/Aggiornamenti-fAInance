import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  indexedDBLocalPersistence,
  inMemoryPersistence,
  initializeAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { firebaseConfig } from "../config/env";

function isNativePlatform(): boolean {
  try {
    const capacitor = typeof window !== "undefined" ? (window as any).Capacitor : null;
    if (capacitor && typeof capacitor.isNativePlatform === "function") {
      return !!capacitor.isNativePlatform();
    }
    if (capacitor && typeof capacitor.getPlatform === "function") {
      const platform = String(capacitor.getPlatform() || "").toLowerCase();
      return platform === "ios" || platform === "android";
    }
  } catch (_error) {}
  return false;
}

export const firebaseApp = initializeApp(firebaseConfig);
const nativeRuntime = isNativePlatform();

function createFainanceAuth() {
  try {
    if (!nativeRuntime) {
      // Preserve the existing web authentication behaviour and popup dependencies.
      return getAuth(firebaseApp);
    }
    // Native WebViews previously persisted Firebase Auth in localStorage. fAInance
    // also stores sizeable app datasets there, so an otherwise valid Google login
    // could fail with QuotaExceededError while writing firebase:authUser:* .
    // Bootstrap with the legacy fallback only long enough to recover an existing
    // session, then migrate it to IndexedDB below.
    return initializeAuth(firebaseApp, {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence],
    });
  } catch (_error) {
    return getAuth(firebaseApp);
  }
}

export const fbAuth = createFainanceAuth();
export const fbDb = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();

function cleanupLegacyFirebaseAuthStorage(): void {
  try {
    if (typeof localStorage === "undefined") return;
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && key.indexOf("firebase:authUser:") === 0) keys.push(key);
    }
    keys.forEach((key) => {
      try { localStorage.removeItem(key); } catch (_error) {}
    });
  } catch (_error) {}
}

async function moveNativeAuthOffLocalStorage(waitForInitialState: boolean): Promise<void> {
  if (!nativeRuntime) return;

  if (waitForInitialState) {
    try {
      const authStateReady = (fbAuth as any).authStateReady;
      if (typeof authStateReady === "function") await authStateReady.call(fbAuth);
    } catch (_error) {}
  }

  try {
    await setPersistence(fbAuth, indexedDBLocalPersistence);
    cleanupLegacyFirebaseAuthStorage();
    return;
  } catch (_indexedDbError) {}

  // If a particular WebView cannot use IndexedDB, do not fall back to localStorage:
  // an in-memory session is preferable to making login impossible when localStorage
  // is full. The next launch can attempt IndexedDB again.
  try {
    await setPersistence(fbAuth, inMemoryPersistence);
    cleanupLegacyFirebaseAuthStorage();
  } catch (_memoryError) {}
}

// Starts immediately at module load so existing installations are migrated without
// requiring an uninstall or a manual cache clear. Login entry points await it.
export const authPersistenceReady: Promise<void> =
  moveNativeAuthOffLocalStorage(true);

export async function recoverAuthPersistenceFromStorageQuota(): Promise<void> {
  await moveNativeAuthOffLocalStorage(false);
}

export function isFirebaseStorageQuotaError(error: unknown): boolean {
  const value: any = error as any;
  const message = String(value?.message || value || "").toLowerCase();
  const name = String(value?.name || "").toLowerCase();
  return (
    name.indexOf("quotaexceeded") >= 0 ||
    message.indexOf("exceeded the quota") >= 0 ||
    message.indexOf("quota exceeded") >= 0 ||
    (message.indexOf("firebase:authuser:") >= 0 && message.indexOf("storage") >= 0)
  );
}
