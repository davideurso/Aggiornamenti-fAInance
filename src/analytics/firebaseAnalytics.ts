import { Capacitor } from "@capacitor/core";
import { App } from "@capacitor/app";
import { FirebaseAnalytics } from "@capacitor-community/firebase-analytics";
import { appEnvironment } from "../config/env";

const ANALYTICS_DIAGNOSTIC_KEY = "fainance_analytics_diagnostic_v1";
const OPEN_EVENT_NAME = "fainance_app_open";
const OPEN_EVENT_DEDUPE_MS = 2500;

let analyticsBootPromise: Promise<void> | null = null;
let analyticsReady = false;
let appStateListenerInstalled = false;
let lastOpenLoggedAt = 0;

function writeDiagnostic(status: "ok" | "error", details: Record<string, unknown>) {
  try {
    localStorage.setItem(
      ANALYTICS_DIAGNOSTIC_KEY,
      JSON.stringify({ status, at: new Date().toISOString(), ...details }),
    );
  } catch (_error) {}
}

async function getNativeAppId(): Promise<string> {
  const info = await App.getInfo();
  return String(info?.id || "").trim().toLowerCase();
}

function assertExpectedNativeIdentity(nativeAppId: string) {
  if (appEnvironment === "test" && nativeAppId !== "it.fainanceapp.app.test") {
    throw new Error(`FAINANCE_TEST_NATIVE_APP_ID_MISMATCH:${nativeAppId || "missing"}`);
  }
}

async function logAppOpen(nativeAppId: string, reason: "cold_start" | "foreground") {
  const now = Date.now();
  if (now - lastOpenLoggedAt < OPEN_EVENT_DEDUPE_MS) return;

  await FirebaseAnalytics.logEvent({
    name: OPEN_EVENT_NAME,
    params: {
      environment: String(appEnvironment || "production"),
      platform: String(Capacitor.getPlatform() || "native"),
      native_app_id: nativeAppId || "unknown",
      open_reason: reason,
    },
  });

  lastOpenLoggedAt = now;
  writeDiagnostic("ok", {
    event: OPEN_EVENT_NAME,
    environment: appEnvironment,
    nativeAppId,
    reason,
  });
}

/**
 * Starts native Firebase Analytics only after the Capacitor runtime is ready.
 *
 * Important: do not use window.Capacitor as the startup gate. On some native
 * launches the global bridge can be observed before it is fully populated;
 * an early return would permanently skip our custom event while Firebase's
 * native automatic events continue to work. Using Capacitor/App imports gives
 * us the authoritative native runtime and app id.
 */
export function initializeFainanceAnalytics(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return Promise.resolve();
  if (analyticsReady) return Promise.resolve();
  if (analyticsBootPromise) return analyticsBootPromise;

  analyticsBootPromise = (async () => {
    try {
      const nativeAppId = await getNativeAppId();
      assertExpectedNativeIdentity(nativeAppId);

      await FirebaseAnalytics.setCollectionEnabled({ enabled: true });
      await logAppOpen(nativeAppId, "cold_start");
      analyticsReady = true;

      if (!appStateListenerInstalled) {
        appStateListenerInstalled = true;
        await App.addListener("appStateChange", ({ isActive }) => {
          if (!isActive) return;
          logAppOpen(nativeAppId, "foreground").catch((error) => {
            writeDiagnostic("error", {
              stage: "foreground_event",
              message: String((error as any)?.message || error),
              nativeAppId,
            });
            console.warn("Firebase Analytics foreground event failed", error);
          });
        });
      }
    } catch (error) {
      analyticsBootPromise = null;
      writeDiagnostic("error", {
        stage: "initialize",
        message: String((error as any)?.message || error),
        environment: appEnvironment,
      });
      console.warn("Firebase Analytics initialization failed", error);
      throw error;
    }
  })();

  return analyticsBootPromise;
}
