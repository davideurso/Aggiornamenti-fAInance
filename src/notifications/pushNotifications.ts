import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import { getApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import { normalizedNotificationChannels } from "./notificationChannels.mjs";

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
  await httpsCallable(functionsClient(), "fainanceSyncNotificationContext")({
    language: normalizeLanguage(language), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Rome",
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

export async function loadNotificationChannels(): Promise<{ channels: Record<string, string>; updatedAtMs: number }> {
  const callable = httpsCallable<void, { channels: Record<string, string>; updatedAtMs: number }>(
    functionsClient(), "fainanceGetNotificationChannels",
  );
  const result = await callable();
  return { channels: normalizedNotificationChannels(result.data?.channels), updatedAtMs: Number(result.data?.updatedAtMs || 0) };
}

// Never report a preference as synchronized when this call fails.
let channelWriteQueue: Promise<unknown> = Promise.resolve();
export function saveNotificationChannels(channels: unknown): Promise<void> {
  const next = normalizedNotificationChannels(channels);
  const task = channelWriteQueue.then(async () => {
    const callable = httpsCallable(functionsClient(), "fainanceSetNotificationChannels");
    // Temporary connectivity failures must not lose a preference change.
    // Permanent errors (e.g. missing Cloud Function) must still be reported.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        await callable({ channels: next });
        return;
      } catch (error) {
        const code = String((error as any)?.code || "").toLowerCase();
        const recoverable = /unavailable|deadline-exceeded|resource-exhausted|network/.test(code);
        if (!recoverable || attempt === 2) throw error;
        await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 650));
      }
    }
  });
  // User taps quickly must not race on the server; a failure must not block retry.
  channelWriteQueue = task.catch(() => undefined);
  return task;
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
      if (cached && (await PushNotifications.checkPermissions()).receive === "granted") await registerDevice(uid, cached, language).catch(() => undefined);
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

    async function acknowledge(id: unknown, state: string) {
      if (!id || disposed) return;
      await httpsCallable(functionsClient(), "fainanceNotificationDeviceReceipt")({ notificationId: String(id), state }).catch(() => undefined);
    }
    handles.push(await PushNotifications.addListener("pushNotificationReceived", (event) => {
      void acknowledge(event.data?.notificationId, "RECEIVED");
    }));

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
        void acknowledge(data.notificationId, "OPENED");
        options.onAction?.(data);
      }),
    );

    if (Capacitor.getPlatform() === "android") {
      await PushNotifications.createChannel({ id: "fainance_default", name: "fAInance", importance: 4, visibility: 1, sound: "default" });
    }
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
