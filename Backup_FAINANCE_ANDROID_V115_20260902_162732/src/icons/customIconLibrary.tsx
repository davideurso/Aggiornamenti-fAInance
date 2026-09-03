import { useEffect, useMemo, useState } from "react";
import { collection, deleteDoc, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { fbAuth, fbDb } from "../firebase/client";
import { writeTechnicalLog } from "../observability/technicalLogs";

export const CUSTOM_ICON_PREFIX = "fai-icon:";
export const CUSTOM_ICON_MAX_ITEMS = 40;
export const CUSTOM_ICON_MAX_DATA_URL_LENGTH = 120000;

export interface CustomIconRecord {
  id: string;
  ownerUid: string;
  label: string;
  dataUrl: string;
  createdAt: string;
  updatedAt: string;
}

type Listener = () => void;
const cache = new Map<string, CustomIconRecord>();
const loadedOwners = new Set<string>();
const loadingRefs = new Set<string>();
const listeners = new Set<Listener>();

function localIconStorageKey(uid: string): string {
  return "fainance_custom_icons_v1_" + String(uid || "");
}
function loadLocalIconRows(uid: string): CustomIconRecord[] {
  if (!uid || typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(localIconStorageKey(uid)) || "[]");
    return (Array.isArray(raw) ? raw : []).filter((row: any) =>
      row &&
      String(row.ownerUid || "") === uid &&
      String(row.id || "") &&
      String(row.dataUrl || "").startsWith("data:image/")
    );
  } catch {
    return [];
  }
}
function saveLocalIconRows(uid: string, rows: CustomIconRecord[]): void {
  if (!uid || typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(
      localIconStorageKey(uid),
      JSON.stringify((rows || []).slice(0, CUSTOM_ICON_MAX_ITEMS))
    );
  } catch {}
}
function upsertLocalIconRow(row: CustomIconRecord): void {
  const rows = loadLocalIconRows(row.ownerUid).filter((item) => item.id !== row.id);
  saveLocalIconRows(row.ownerUid, [row, ...rows]);
}
function removeLocalIconRow(uid: string, id: string): void {
  saveLocalIconRows(uid, loadLocalIconRows(uid).filter((item) => item.id !== id));
}

function emit(): void { listeners.forEach((fn) => { try { fn(); } catch {} }); }

export function customIconValue(ownerUid: string, id: string): string {
  return CUSTOM_ICON_PREFIX + encodeURIComponent(String(ownerUid || "")) + ":" + encodeURIComponent(String(id || ""));
}

export function parseCustomIconValue(value: unknown): { ownerUid: string; id: string } | null {
  const raw = String(value || "");
  if (!raw.startsWith(CUSTOM_ICON_PREFIX)) return null;
  const rest = raw.slice(CUSTOM_ICON_PREFIX.length);
  const split = rest.indexOf(":");
  if (split <= 0) return null;
  try {
    const ownerUid = decodeURIComponent(rest.slice(0, split));
    const id = decodeURIComponent(rest.slice(split + 1));
    return ownerUid && id ? { ownerUid, id } : null;
  } catch {
    return null;
  }
}

export function isCustomIconValue(value: unknown): boolean { return !!parseCustomIconValue(value); }

function cacheKey(ownerUid: string, id: string): string { return ownerUid + "/" + id; }

function recordFromSnapshot(ownerUid: string, id: string, data: any): CustomIconRecord | null {
  const dataUrl = String(data?.dataUrl || "");
  if (!dataUrl.startsWith("data:image/")) return null;
  return {
    id,
    ownerUid,
    label: String(data?.label || ""),
    dataUrl,
    createdAt: String(data?.createdAt || ""),
    updatedAt: String(data?.updatedAt || ""),
  };
}

export async function loadCustomIconReference(value: unknown): Promise<CustomIconRecord | null> {
  const parsed = parseCustomIconValue(value);
  if (!parsed) return null;
  const key = cacheKey(parsed.ownerUid, parsed.id);
  if (cache.has(key)) return cache.get(key) || null;
  if (loadingRefs.has(key)) return null;
  loadingRefs.add(key);
  try {
    const snapshot = await getDoc(doc(fbDb, "users", parsed.ownerUid, "customIcons", parsed.id));
    if (!snapshot.exists()) return null;
    const row = recordFromSnapshot(parsed.ownerUid, parsed.id, snapshot.data());
    if (row) { cache.set(key, row); emit(); }
    return row;
  } catch {
    return null;
  } finally {
    loadingRefs.delete(key);
  }
}

export async function loadCurrentUserCustomIcons(force = false): Promise<CustomIconRecord[]> {
  const uid = String(fbAuth.currentUser?.uid || "");
  if (!uid) return [];
  const localRows = loadLocalIconRows(uid);
  localRows.forEach((row) => cache.set(cacheKey(uid, row.id), row));
  if (!force && loadedOwners.has(uid)) {
    return Array.from(cache.values()).filter((row) => row.ownerUid === uid).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }
  try {
    const snapshot = await getDocs(collection(fbDb, "users", uid, "customIcons"));
    snapshot.docs.forEach((row) => {
      const parsed = recordFromSnapshot(uid, row.id, row.data());
      if (parsed) cache.set(cacheKey(uid, row.id), parsed);
    });
    const merged = Array.from(cache.values()).filter((row) => row.ownerUid === uid).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    saveLocalIconRows(uid, merged);
  } catch {
    // The local library remains fully usable even when the Firestore subcollection
    // is temporarily unavailable or an older ruleset blocks it.
  }
  loadedOwners.add(uid);
  emit();
  return Array.from(cache.values()).filter((row) => row.ownerUid === uid).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

function fileExtension(file: File): string {
  const name = String(file?.name || "").toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot >= 0 ? name.slice(dot + 1) : "";
}

function looksLikeImage(file: File): boolean {
  const type = String(file?.type || "").toLowerCase();
  if (type.startsWith("image/")) return true;
  return ["jpg","jpeg","png","webp","gif","bmp","jfif","avif","heic","heif"].includes(fileExtension(file));
}

function nativePickCancelled(error: any): boolean {
  const raw = String(error?.message || error?.code || error || "").toLowerCase();
  return raw.includes("cancel") || raw.includes("canceled") || raw.includes("cancelled") || raw.includes("user cancelled") || raw.includes("user canceled");
}

function mimeExtension(type: string): string {
  const clean = String(type || "").toLowerCase();
  if (clean.includes("png")) return "png";
  if (clean.includes("webp")) return "webp";
  if (clean.includes("gif")) return "gif";
  if (clean.includes("avif")) return "avif";
  return "jpg";
}

export async function pickNativeCustomIconFile(): Promise<File | null> {
  try {
    const module: any = await import("@capacitor/camera");
    const Camera = module?.Camera;
    if (!Camera?.pickImages) throw new Error("CUSTOM_ICON_NATIVE_PICKER_UNAVAILABLE");
    const selection: any = await Camera.pickImages({ limit: 1, quality: 100 });
    const photo = selection?.photos?.[0];
    const webPath = String(photo?.webPath || "");
    if (!webPath) return null;
    const response = await fetch(webPath);
    if (!response.ok) throw new Error("CUSTOM_ICON_NATIVE_READ_ERROR");
    const blob = await response.blob();
    if (!blob || !Number(blob.size || 0)) throw new Error("CUSTOM_ICON_NATIVE_READ_ERROR");
    const type = String(blob.type || photo?.format || "image/jpeg").startsWith("image/")
      ? String(blob.type || "image/jpeg")
      : "image/jpeg";
    const name = `fainance-icon-${Date.now()}.${mimeExtension(type)}`;
    return new File([blob], name, { type, lastModified: Date.now() });
  } catch (error: any) {
    if (nativePickCancelled(error)) throw new Error("CUSTOM_ICON_CANCELLED");
    if (String(error?.message || "").startsWith("CUSTOM_ICON_")) throw error;
    throw new Error("CUSTOM_ICON_NATIVE_PICKER_ERROR");
  }
}

async function normalizeImageFileForDecode(file: File): Promise<File> {
  const existingType = String(file?.type || "").toLowerCase();
  if (existingType.startsWith("image/")) return file;
  try {
    const head = new Uint8Array(await file.slice(0, 32).arrayBuffer());
    let mime = "";
    if (head.length >= 8 && head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) mime = "image/png";
    else if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) mime = "image/jpeg";
    else if (head.length >= 6 && String.fromCharCode(...Array.from(head.slice(0,6))) === "GIF89a") mime = "image/gif";
    else if (head.length >= 12 && String.fromCharCode(...Array.from(head.slice(0,4))) === "RIFF" && String.fromCharCode(...Array.from(head.slice(8,12))) === "WEBP") mime = "image/webp";
    else if (head.length >= 12 && String.fromCharCode(...Array.from(head.slice(4,8))) === "ftyp") {
      const brand = String.fromCharCode(...Array.from(head.slice(8,12))).toLowerCase();
      if (brand.indexOf("heic") >= 0 || brand.indexOf("heix") >= 0 || brand.indexOf("hevc") >= 0 || brand.indexOf("mif1") >= 0) mime = "image/heic";
      else if (brand.indexOf("avif") >= 0 || brand.indexOf("avis") >= 0) mime = "image/avif";
    }
    if (mime) return new File([file], file.name || ("fainance-icon." + mimeExtension(mime)), { type: mime, lastModified: file.lastModified || Date.now() });
  } catch {}
  return file;
}

async function decodeImage(file: File): Promise<{ source: CanvasImageSource; width: number; height: number; dispose: () => void }> {
  const decodeFile = await normalizeImageFileForDecode(file);
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(decodeFile);
      return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => { try { bitmap.close(); } catch {} } };
    } catch {}
  }
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("CUSTOM_ICON_READ_ERROR"));
    reader.readAsDataURL(decodeFile);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const node = new Image();
    node.onload = () => resolve(node);
    node.onerror = () => reject(new Error("CUSTOM_ICON_DECODE_ERROR"));
    node.src = dataUrl;
  });
  return { source: img, width: img.naturalWidth || img.width, height: img.naturalHeight || img.height, dispose: () => undefined };
}

export async function resizeCustomIcon(file: File, maxSide = 128, quality = 0.78): Promise<string> {
  if (!file) throw new Error("CUSTOM_ICON_INVALID");
  if (Number(file.size || 0) > 12 * 1024 * 1024) throw new Error("CUSTOM_ICON_TOO_LARGE");
  // Some mobile photo pickers expose screenshots with an empty/octet-stream MIME
  // type and a temporary filename. The decoder is the reliable format check.
  // Keep looksLikeImage only as a hint; do not reject a valid image before decode.
  const decoded = await decodeImage(file).catch((error) => {
    if (!looksLikeImage(file)) throw new Error("CUSTOM_ICON_INVALID");
    throw error;
  });
  try {
    if (!decoded.width || !decoded.height) throw new Error("CUSTOM_ICON_DECODE_ERROR");
    const side = Math.min(decoded.width, decoded.height);
    const sx = Math.max(0, (decoded.width - side) / 2);
    const sy = Math.max(0, (decoded.height - side) / 2);
    const outSide = Math.max(32, Math.min(maxSide, side));
    const canvas = document.createElement("canvas");
    canvas.width = outSide;
    canvas.height = outSide;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("CUSTOM_ICON_CANVAS_ERROR");
    ctx.clearRect(0, 0, outSide, outSide);
    ctx.drawImage(decoded.source, sx, sy, side, side, 0, 0, outSide, outSide);
    let dataUrl = canvas.toDataURL("image/webp", quality);
    if (!dataUrl.startsWith("data:image/webp")) dataUrl = canvas.toDataURL("image/png");
    if (dataUrl.length > CUSTOM_ICON_MAX_DATA_URL_LENGTH) dataUrl = canvas.toDataURL("image/webp", 0.58);
    if (dataUrl.length > CUSTOM_ICON_MAX_DATA_URL_LENGTH) throw new Error("CUSTOM_ICON_OUTPUT_TOO_LARGE");
    return dataUrl;
  } finally {
    decoded.dispose();
  }
}

function cleanLabel(file: File): string {
  const raw = String(file?.name || "Icona").replace(/\.[^.]+$/, "").trim();
  return (raw || "Icona").slice(0, 60);
}

export async function uploadCustomIcon(file: File): Promise<CustomIconRecord> {
  const user = fbAuth.currentUser;
  if (!user?.uid) throw new Error("CUSTOM_ICON_AUTH_REQUIRED");
  const existing = await loadCurrentUserCustomIcons();
  if (existing.length >= CUSTOM_ICON_MAX_ITEMS) throw new Error("CUSTOM_ICON_LIMIT");
  try {
    const dataUrl = await resizeCustomIcon(file);
    const id = (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2,10));
    const now = new Date().toISOString();
    const row: CustomIconRecord = { id, ownerUid: user.uid, label: cleanLabel(file), dataUrl, createdAt: now, updatedAt: now };
    // Save locally first so the upload works immediately on iOS/Android even if
    // Firestore rules for the optional customIcons subcollection are unavailable.
    cache.set(cacheKey(user.uid, id), row);
    upsertLocalIconRow(row);
    loadedOwners.add(user.uid);
    emit();
    await setDoc(doc(fbDb, "users", user.uid, "customIcons", id), row, { merge: false }).catch((cloudError: any) => {
      writeTechnicalLog({ category:"UPLOAD_ERROR", operation:"custom_icon_cloud_sync", result:"failure", severity:"warning", errorCode:String(cloudError?.code || cloudError?.message || "CUSTOM_ICON_CLOUD_SYNC") }).catch(() => undefined);
    });
    return row;
  } catch (error: any) {
    writeTechnicalLog({ category:"UPLOAD_ERROR", operation:"custom_icon_upload", result:"failure", severity:"warning", errorCode:String(error?.message || "CUSTOM_ICON_UPLOAD_ERROR") }).catch(() => undefined);
    throw error;
  }
}

export async function deleteCustomIconRecord(id: string): Promise<void> {
  const user = fbAuth.currentUser;
  if (!user?.uid || !id) throw new Error("CUSTOM_ICON_AUTH_REQUIRED");
  cache.delete(cacheKey(user.uid, id));
  removeLocalIconRow(user.uid, id);
  emit();
  await deleteDoc(doc(fbDb, "users", user.uid, "customIcons", id)).catch(() => undefined);
}

export function useCustomIconLibrary() {
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    setLoading(true);
    loadCurrentUserCustomIcons().catch((e:any) => setError(String(e?.message || "CUSTOM_ICON_LOAD_ERROR"))).finally(() => setLoading(false));
    return () => { listeners.delete(listener); };
  }, [String(fbAuth.currentUser?.uid || "")]);
  const items = useMemo(() => {
    const uid = String(fbAuth.currentUser?.uid || "");
    void version;
    return Array.from(cache.values()).filter((row) => row.ownerUid === uid).sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [version]);
  return { items, loading, error, refresh: () => loadCurrentUserCustomIcons(true) };
}

export function FainanceIcon({ value, size = 24, alt = "", style }: { value: unknown; size?: number; alt?: string; style?: any }) {
  const parsed = parseCustomIconValue(value);
  const [, setVersion] = useState(0);
  useEffect(() => {
    if (!parsed) return;
    const listener = () => setVersion((v) => v + 1);
    listeners.add(listener);
    void loadCustomIconReference(value);
    return () => { listeners.delete(listener); };
  }, [String(value || "")]);
  if (!parsed) return <span aria-hidden="true" style={{ fontSize:size, lineHeight:1, display:"inline-flex", alignItems:"center", justifyContent:"center", ...style }}>{String(value || "")}</span>;
  const row = cache.get(cacheKey(parsed.ownerUid, parsed.id));
  if (!row) return <span aria-hidden="true" style={{ fontSize:Math.max(14, Math.round(size * .72)), lineHeight:1, opacity:.55, ...style }}>▧</span>;
  return <img src={row.dataUrl} alt={alt || row.label || ""} draggable={false} style={{ width:size, height:size, objectFit:"cover", borderRadius:Math.max(4, Math.round(size * .22)), display:"block", ...style }}/>
}
