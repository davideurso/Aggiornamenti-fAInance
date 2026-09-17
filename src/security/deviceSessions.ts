import { collection, doc, getDoc, getDocs, onSnapshot, setDoc, writeBatch } from "firebase/firestore";
import { fbDb } from "../firebase/client";

const DEVICE_ID_KEY = "fainance_device_id_v1";

export interface FainanceDeviceSession {
  id: string;
  uid: string;
  deviceName: string;
  platform: string;
  browser: string;
  appVersion: string;
  firstSeenAt: string;
  lastSeenAt: string;
  lastLoginAt: string;
  active: boolean;
  revokedAt?: string;
  signedOutAt?: string;
  current?: boolean;
}

function nowIso(): string { return new Date().toISOString(); }

function randomId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  } catch (_error) {}
  return "dev_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
}

export function currentFainanceDeviceId(): string {
  try {
    const existing = String(localStorage.getItem(DEVICE_ID_KEY) || "").trim();
    if (existing) return existing;
    const created = randomId();
    localStorage.setItem(DEVICE_ID_KEY, created);
    return created;
  } catch (_error) {
    return randomId();
  }
}

function detectBrowser(): string {
  try {
    const ua = String(navigator.userAgent || "");
    if (/Edg\//i.test(ua)) return "Edge";
    if (/OPR\//i.test(ua)) return "Opera";
    if (/Chrome\//i.test(ua) && !/Edg\//i.test(ua)) return "Chrome";
    if (/Firefox\//i.test(ua)) return "Firefox";
    if (/Safari\//i.test(ua) && !/Chrome\//i.test(ua)) return "Safari";
  } catch (_error) {}
  return "Browser";
}

function detectPlatform(): string {
  try {
    const capacitor = typeof window !== "undefined" ? (window as any).Capacitor : null;
    const platform = String(capacitor?.getPlatform?.() || "").toLowerCase();
    if (platform === "ios") return "iOS";
    if (platform === "android") return "Android";
    const ua = String(navigator.userAgent || "");
    if (/Windows/i.test(ua)) return "Windows";
    if (/Macintosh|Mac OS X/i.test(ua)) return "macOS";
    if (/Linux/i.test(ua)) return "Linux";
  } catch (_error) {}
  return "Web";
}

function detectDeviceName(): string {
  const platform = detectPlatform();
  const browser = detectBrowser();
  if (platform === "Android" || platform === "iOS") return platform + " · fAInance";
  return browser + " · " + platform;
}

function deviceRef(uid: string, deviceId: string) {
  return doc(fbDb, "users", uid, "devices", deviceId);
}

export async function registerCurrentDeviceSession(uid: string, appVersion = "2.0 Test"): Promise<string> {
  if (!uid) throw new Error("DEVICE_UID_REQUIRED");
  const id = currentFainanceDeviceId();
  const ref = deviceRef(uid, id);
  const now = nowIso();
  const existing = await getDoc(ref).catch(() => null);
  const existingData: any = existing && existing.exists() ? existing.data() : null;
  // A remotely revoked session must never reactivate just because the app reloads.
  // closeCurrentDeviceSession removes the local id, so a new explicit login creates a fresh session id.
  if (existingData && (existingData.active === false || existingData.revokedAt)) return id;
  await setDoc(ref, {
    id,
    uid,
    deviceName: detectDeviceName(),
    platform: detectPlatform(),
    browser: detectBrowser(),
    appVersion: String(appVersion || "2.0 Test"),
    firstSeenAt: String(existingData?.firstSeenAt || now),
    lastSeenAt: now,
    lastLoginAt: now,
    active: true,
    revokedAt: "",
    signedOutAt: "",
    updatedAt: now,
  }, { merge: true });
  return id;
}

async function heartbeat(uid: string, deviceId: string, appVersion = "2.0 Test"): Promise<void> {
  if (!uid || !deviceId) return;
  await setDoc(deviceRef(uid, deviceId), {
    lastSeenAt: nowIso(),
    appVersion: String(appVersion || "2.0 Test"),
    deviceName: detectDeviceName(),
    platform: detectPlatform(),
    browser: detectBrowser(),
    updatedAt: nowIso(),
  }, { merge: true });
}

export function startCurrentDeviceSession(uid: string, onRevoked: () => void, appVersion = "2.0 Test"): () => void {
  if (!uid) return () => undefined;
  let stopped = false;
  let unsubscribe: (() => void) | null = null;
  let timer: any = null;
  const id = currentFainanceDeviceId();

  registerCurrentDeviceSession(uid, appVersion).catch(() => undefined);
  try {
    unsubscribe = onSnapshot(deviceRef(uid, id), (snapshot) => {
      if (stopped || !snapshot.exists()) return;
      const data: any = snapshot.data() || {};
      if (data.active === false || data.revokedAt) onRevoked();
    }, () => undefined);
  } catch (_error) {}

  timer = setInterval(() => { if (!stopped) heartbeat(uid, id, appVersion).catch(() => undefined); }, 5 * 60 * 1000);
  const onFocus = () => { if (!stopped) heartbeat(uid, id, appVersion).catch(() => undefined); };
  try { window.addEventListener("focus", onFocus); } catch (_error) {}

  return () => {
    stopped = true;
    try { if (unsubscribe) unsubscribe(); } catch (_error) {}
    try { if (timer) clearInterval(timer); } catch (_error) {}
    try { window.removeEventListener("focus", onFocus); } catch (_error) {}
  };
}

export async function closeCurrentDeviceSession(uid: string): Promise<void> {
  if (!uid) return;
  const id = currentFainanceDeviceId();
  await setDoc(deviceRef(uid, id), { active: false, signedOutAt: nowIso(), updatedAt: nowIso() }, { merge: true }).catch(() => undefined);
  try { localStorage.removeItem(DEVICE_ID_KEY); } catch (_error) {}
}

export async function listDeviceSessions(uid: string): Promise<FainanceDeviceSession[]> {
  if (!uid) return [];
  const snapshot = await getDocs(collection(fbDb, "users", uid, "devices"));
  const currentId = currentFainanceDeviceId();
  const rows = snapshot.docs.map((row) => {
    const data: any = row.data() || {};
    return {
      id: row.id,
      uid,
      deviceName: String(data.deviceName || data.platform || "Dispositivo"),
      platform: String(data.platform || ""),
      browser: String(data.browser || ""),
      appVersion: String(data.appVersion || ""),
      firstSeenAt: String(data.firstSeenAt || ""),
      lastSeenAt: String(data.lastSeenAt || data.updatedAt || ""),
      lastLoginAt: String(data.lastLoginAt || ""),
      active: data.active !== false && !data.revokedAt,
      revokedAt: String(data.revokedAt || ""),
      signedOutAt: String(data.signedOutAt || ""),
      current: row.id === currentId,
    } as FainanceDeviceSession;
  });
  rows.sort((a, b) => String(b.lastSeenAt || "").localeCompare(String(a.lastSeenAt || "")));
  return rows;
}

export async function revokeDeviceSession(uid: string, deviceId: string): Promise<void> {
  if (!uid || !deviceId) throw new Error("DEVICE_REQUIRED");
  await setDoc(deviceRef(uid, deviceId), { active: false, revokedAt: nowIso(), updatedAt: nowIso() }, { merge: true });
}

export async function revokeAllOtherDeviceSessions(uid: string): Promise<number> {
  if (!uid) return 0;
  const currentId = currentFainanceDeviceId();
  const snapshot = await getDocs(collection(fbDb, "users", uid, "devices"));
  const batch = writeBatch(fbDb);
  let count = 0;
  const now = nowIso();
  snapshot.docs.forEach((row) => {
    if (row.id === currentId) return;
    const data: any = row.data() || {};
    if (data.active === false || data.revokedAt) return;
    batch.set(row.ref, { active: false, revokedAt: now, updatedAt: now }, { merge: true });
    count += 1;
  });
  if (count) await batch.commit();
  return count;
}
