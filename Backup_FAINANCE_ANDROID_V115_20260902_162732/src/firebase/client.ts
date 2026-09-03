import { initializeApp } from "firebase/app";
import {
  browserLocalPersistence,
  getAuth,
  GoogleAuthProvider,
  initializeAuth
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

function createFainanceAuth() {
  try {
    if (!isNativePlatform()) {
      // Preserve the existing web authentication behaviour and popup dependencies.
      return getAuth(firebaseApp);
    }
    // Preserve the existing native persistence behaviour.
    return initializeAuth(firebaseApp, { persistence: browserLocalPersistence });
  } catch (_error) {
    return getAuth(firebaseApp);
  }
}

export const fbAuth = createFainanceAuth();
export const fbDb = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
