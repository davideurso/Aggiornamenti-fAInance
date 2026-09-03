import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";

const FUNCTIONS_REGION = "europe-west1";
const PUSH_TOKEN_CACHE_KEY = "fainance_push_token_v1";
const SUPPORTED_LANGUAGES = new Set(["it", "en", "es", "fr", "de", "pt", "pl", "nl", "ro", "el"]);

function normalizeLanguage(language: string): string {
  const code = String(language || "en").toLowerCase().split(/[-_]/)[0];
  return SUPPORTED_LANGUAGES.has(code) ? code : "en";
}

function functionsClient() {
  return getFunctions(getApp(), FUNCTIONS_REGION);
}

async function syncProfile(uid: string, language: string): Promise<void> {
  if (!uid) return;
  const callable = httpsCallable(functionsClient(), "fainanceSyncNotificationProfile");
  await callable({
    language: normalizeLanguage(language),
    platform: Capacitor.getPlatform() || "web",
  });
}

async function registerDevice(uid: string, token: string, language: string): Promise<void> {
  if (!uid || !token) return;
  const callable = httpsCallable(functionsClient(), "fainanceRegisterPushDevice");
  await callable({
    token,
    language: normalizeLanguage(language),
    platform: Capacitor.getPlatform() || "unknown",
  });
}

export async function syncNotificationProfile(uid: string, language: string): Promise<void> {
  await syncProfile(String(uid || ""), language);
}

export interface NativePushAction {
  notificationId?: string;
  type?: string;
  projectId?: string;
  inviteId?: string;
  actionType?: string;
  actionValue?: string;
  campaignId?: string;
  [key: string]: unknown;
}

export async function startNativePushNotifications(options: {
  uid: string;
  language: string;
  onAction?: (data: NativePushAction) => void;
}): Promise<() => void> {
  const uid = String(options.uid || "").trim();
  const language = normalizeLanguage(options.language);
  if (!uid || !Capacitor.isNativePlatform()) return () => undefined;

  const handles: Array<{ remove: () => Promise<void> }> = [];
  let disposed = false;

  try {
    await syncProfile(uid, language).catch(() => undefined);

    try {
      const cached = String(localStorage.getItem(PUSH_TOKEN_CACHE_KEY) || "").trim();
      if (cached) await registerDevice(uid, cached, language).catch(() => undefined);
    } catch (_cacheError) {}

    handles.push(
      await PushNotifications.addListener("registration", async (token) => {
        if (disposed) return;
        const value = String(token && token.value ? token.value : "").trim();
        if (!value) return;
        try {
          localStorage.setItem(PUSH_TOKEN_CACHE_KEY, value);
        } catch (_cacheWriteError) {}
        await registerDevice(uid, value, language).catch((error) => {
          try {
            console.warn("Push token registration failed", error);
          } catch (_logError) {}
        });
      }),
    );

    handles.push(
      await PushNotifications.addListener("registrationError", (error) => {
        try {
          console.warn("Push registration error", error);
        } catch (_logError) {}
      }),
    );

    handles.push(
      await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
        if (disposed) return;
        const raw = (event && event.notification && event.notification.data) || {};
        const data: NativePushAction = {};
        Object.keys(raw || {}).forEach((key) => {
          const value = (raw as any)[key];
          data[key] = value == null ? "" : String(value);
        });
        options.onAction?.(data);
      }),
    );

    let permissions = await PushNotifications.checkPermissions();
    if (permissions.receive === "prompt" || permissions.receive === "prompt-with-rationale") {
      permissions = await PushNotifications.requestPermissions();
    }
    if (permissions.receive === "granted") {
      await PushNotifications.register();
    }
  } catch (error) {
    try {
      console.warn("Native push initialization failed", error);
    } catch (_logError) {}
  }

  return function cleanup() {
    disposed = true;
    handles.forEach((handle) => {
      try {
        handle.remove().catch(() => undefined);
      } catch (_removeError) {}
    });
  };
}
