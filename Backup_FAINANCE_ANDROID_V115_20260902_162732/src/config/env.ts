// Centralized environment configuration for fAInance.
// Production remains the default to preserve the behaviour of existing builds.

export type AppEnvironment = "test" | "production";

export type FirebaseConfigShape = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
};

function clean(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .replace(/^(["'])(.*)\1$/, "$2")
    .trim();
}

function env(name: string): string {
  return clean(import.meta.env[name]);
}

const productionDefaults: FirebaseConfigShape = {
  apiKey: "AIzaSyB6AQpz2MWphyc2RGmELZUfb2AUhzfi1To",
  authDomain: "fainance-a7794.firebaseapp.com",
  projectId: "fainance-a7794",
  storageBucket: "fainance-a7794.firebasestorage.app",
  messagingSenderId: "739607555867",
  appId: "1:739607555867:web:fainanceweb"
};

const requestedEnvironment: AppEnvironment =
  env("VITE_APP_ENV").toLowerCase() === "test" ? "test" : "production";

function productionConfig(): FirebaseConfigShape {
  return {
    apiKey: env("VITE_FIREBASE_API_KEY") || productionDefaults.apiKey,
    authDomain: env("VITE_FIREBASE_AUTH_DOMAIN") || productionDefaults.authDomain,
    projectId: env("VITE_FIREBASE_PROJECT_ID") || productionDefaults.projectId,
    storageBucket: env("VITE_FIREBASE_STORAGE_BUCKET") || productionDefaults.storageBucket,
    messagingSenderId: env("VITE_FIREBASE_MESSAGING_SENDER_ID") || productionDefaults.messagingSenderId,
    appId: env("VITE_FIREBASE_APP_ID") || productionDefaults.appId
  };
}

function testConfig(): FirebaseConfigShape | null {
  const config: FirebaseConfigShape = {
    apiKey: env("VITE_FIREBASE_TEST_API_KEY"),
    authDomain: env("VITE_FIREBASE_TEST_AUTH_DOMAIN"),
    projectId: env("VITE_FIREBASE_TEST_PROJECT_ID"),
    storageBucket: env("VITE_FIREBASE_TEST_STORAGE_BUCKET"),
    messagingSenderId: env("VITE_FIREBASE_TEST_MESSAGING_SENDER_ID"),
    appId: env("VITE_FIREBASE_TEST_APP_ID")
  };
  return Object.values(config).every(Boolean) ? config : null;
}

const configuredTestFirebase = testConfig();

// Test builds are fail-closed: an incomplete Test configuration must never
// fall back to the Production Firebase project.
if (requestedEnvironment === "test" && !configuredTestFirebase) {
  throw new Error("FAINANCE_TEST_FIREBASE_CONFIGURATION_INCOMPLETE");
}
if (
  requestedEnvironment === "test" &&
  configuredTestFirebase &&
  configuredTestFirebase.projectId === productionDefaults.projectId
) {
  throw new Error("FAINANCE_TEST_FIREBASE_PRODUCTION_PROJECT_FORBIDDEN");
}

export const appEnvironment: AppEnvironment = requestedEnvironment;

export const firebaseConfig: FirebaseConfigShape =
  requestedEnvironment === "test"
    ? (configuredTestFirebase as FirebaseConfigShape)
    : productionConfig();

export const functionsRegion = env("VITE_FIREBASE_FUNCTIONS_REGION") || "europe-west1";

export const environmentWarnings: string[] = [];

export function cloudFunctionUrl(functionName: string): string {
  return `https://${functionsRegion}-${firebaseConfig.projectId}.cloudfunctions.net/${functionName}`;
}
