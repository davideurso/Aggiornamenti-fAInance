import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

export type AdminEnvironment = "production" | "test";

type FirebaseShape = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function clean(value: unknown): string {
  return String(value ?? "").trim().replace(/^(\"|')(.*)\1$/, "$2").trim();
}

function env(name: string): string {
  return clean(import.meta.env[name]);
}

const productionDefaults: FirebaseShape = {
  apiKey: "AIzaSyB6AQpz2MWphyc2RGmELZUfb2AUhzfi1To",
  authDomain: "fainance-a7794.firebaseapp.com",
  projectId: "fainance-a7794",
  storageBucket: "fainance-a7794.firebasestorage.app",
  messagingSenderId: "739607555867",
  appId: "1:739607555867:web:fainanceweb"
};

function productionConfig(): FirebaseShape {
  return {
    apiKey: env("VITE_FIREBASE_API_KEY") || productionDefaults.apiKey,
    authDomain: env("VITE_FIREBASE_AUTH_DOMAIN") || productionDefaults.authDomain,
    projectId: env("VITE_FIREBASE_PROJECT_ID") || productionDefaults.projectId,
    storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET") || productionDefaults.storageBucket,
    messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID") || productionDefaults.messagingSenderId,
    appId: env("VITE_FIREBASE_APP_ID") || productionDefaults.appId
  };
}

function testConfig(): FirebaseShape | null {
  const config: FirebaseShape = {
    apiKey: env("VITE_FIREBASE_TEST_API_KEY"),
    authDomain: env("VITE_FIREBASE_TEST_AUTH_DOMAIN"),
    projectId: env("VITE_FIREBASE_TEST_PROJECT_ID"),
    storageBucket: env("VITE_FIREBASE_TEST_STORAGE_BUCKET"),
    messagingSenderId: env("VITE_FIREBASE_TEST_MESSAGING_SENDER_ID"),
    appId: env("VITE_FIREBASE_TEST_APP_ID")
  };
  return Object.values(config).every(Boolean) ? config : null;
}

const requested: AdminEnvironment = env("VITE_ADMIN_ENV").toLowerCase() === "test" ? "test" : "production";
const configuredTest = testConfig();

export const adminEnvironment: AdminEnvironment = requested === "test" && configuredTest ? "test" : "production";
export const adminFirebaseConfig = adminEnvironment === "test" && configuredTest ? configuredTest : productionConfig();

if (adminEnvironment === "test" && adminFirebaseConfig.projectId === productionDefaults.projectId) {
  throw new Error("SECURITY: fAInance Admin Test cannot use the Production Firebase project.");
}

const app = getApps().length ? getApp() : initializeApp(adminFirebaseConfig);
export const adminAuth = getAuth(app);
export const adminDb = getFirestore(app);
