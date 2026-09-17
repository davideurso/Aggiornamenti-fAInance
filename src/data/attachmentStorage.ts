// FIX 2.0.5 — Livello di accesso a Cloud Storage per gli allegati.
//
// Prima ogni documento veniva codificato in base64 e salvato dentro il documento
// Firestore userData/{uid}, che ha un limite RIGIDO di 1 MiB: un solo PDF grande
// bloccava la sincronizzazione dell'intero account. Questo modulo rimuove la causa,
// portando i file su Storage e lasciando nel documento solo il riferimento.
//
// I record vecchi con dataUrl continuano a funzionare: si leggono entrambe le forme
// finche' la migrazione non e' completa. Nessuna migrazione forzata.
//
// FIX 2.0.7 — Risoluzione automatica del bucket.
//
// Firebase assegna il dominio ".firebasestorage.app" solo ai bucket creati da fine
// 2024; i progetti precedenti hanno "<progetto>.appspot.com". La configurazione
// dell'app indica ".firebasestorage.app", ma Storage non era mai stato usato, quindi
// nessuno aveva mai verificato che quel bucket esistesse davvero. Se il progetto e'
// anteriore, il bucket non esiste e l'SDK risponde storage/retry-limit-exceeded dopo
// aver riprovato fino allo scadere del timeout.
//
// Invece di indovinare quale sia la forma giusta, il modulo prova entrambe e ricorda
// quella che funziona in localStorage. Se anche la seconda fallisce, il messaggio
// elenca i bucket tentati, cosi' la diagnosi e' immediata.

import {
  deleteObject,
  getBlob,
  getDownloadURL,
  getStorage,
  listAll,
  ref,
  uploadBytesResumable,
  type FirebaseStorage,
} from "firebase/storage";
import { fbAuth, firebaseApp } from "../firebase/client";
import { firebaseConfig } from "../config/env";

export const FAINANCE_ATTACHMENT_MAX_BYTES = 10 * 1024 * 1024;

const REMEMBERED_BUCKET_KEY = "fainance_storage_bucket_v1";

/** Codici che indicano "questo bucket non e' raggiungibile": vale la pena provare l'altro. */
const BUCKET_UNREACHABLE_CODES = [
  "storage/retry-limit-exceeded",
  "storage/unknown",
  "storage/bucket-not-found",
  "storage/project-not-found",
];

export interface AttachmentUploadResult {
  storagePath: string;
  sizeBytes: number;
  contentType: string;
  bucket: string;
}

export class AttachmentStorageError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "AttachmentStorageError";
    this.code = code;
  }
}

// ── Risoluzione del bucket ──────────────────────────────────────────────────

function configuredBucket(): string {
  return String((firebaseConfig as any).storageBucket || "").replace(
    /^gs:\/\//,
    "",
  );
}

/** Converte fra le due forme storiche del nome bucket. */
function alternateBucket(bucket: string): string {
  if (bucket.endsWith(".firebasestorage.app")) {
    return bucket.slice(0, -".firebasestorage.app".length) + ".appspot.com";
  }
  if (bucket.endsWith(".appspot.com")) {
    return bucket.slice(0, -".appspot.com".length) + ".firebasestorage.app";
  }
  return "";
}

function rememberedBucket(): string {
  try {
    return String(localStorage.getItem(REMEMBERED_BUCKET_KEY) || "");
  } catch (_error) {
    return "";
  }
}

function rememberBucket(bucket: string): void {
  try {
    if (bucket) localStorage.setItem(REMEMBERED_BUCKET_KEY, bucket);
  } catch (_error) {}
}

/** Bucket da provare, nell'ordine: prima quello che ha funzionato l'ultima volta. */
export function bucketCandidates(): Array<string> {
  const primary = configuredBucket();
  const list = [rememberedBucket(), primary, alternateBucket(primary)];
  const seen: Record<string, boolean> = {};
  const out: Array<string> = [];
  for (const item of list) {
    if (item && !seen[item]) {
      seen[item] = true;
      out.push(item);
    }
  }
  return out;
}

const storageCache: Record<string, FirebaseStorage> = {};

function storageFor(bucket: string): FirebaseStorage {
  if (storageCache[bucket]) return storageCache[bucket];
  const instance = getStorage(firebaseApp, "gs://" + bucket);
  // Vedi la nota in firebase/client.ts: i valori predefiniti sono 600 e 120 secondi,
  // e trasformano un bucket inesistente in un'attesa di dieci minuti.
  try {
    (instance as any).maxUploadRetryTime = 30000;
    (instance as any).maxOperationRetryTime = 20000;
  } catch (_error) {}
  storageCache[bucket] = instance;
  return instance;
}

function isBucketUnreachable(code: string): boolean {
  return BUCKET_UNREACHABLE_CODES.indexOf(code) >= 0;
}

// ── Utilita' ────────────────────────────────────────────────────────────────

function currentUid(): string {
  try {
    const user = fbAuth.currentUser;
    return user && user.uid ? String(user.uid) : "";
  } catch (_error) {
    return "";
  }
}

function isOnline(): boolean {
  try {
    return typeof navigator === "undefined" ? true : navigator.onLine !== false;
  } catch (_error) {
    return true;
  }
}

/**
 * Identificatore opaco per il file su Storage. Non contiene il nome originale: i nomi
 * possono contenere caratteri che complicano il percorso, e il nome visibile
 * all'utente vive comunque nel record Firestore.
 */
export function newAttachmentId(): string {
  try {
    if (typeof crypto !== "undefined" && (crypto as any).randomUUID) {
      return String((crypto as any).randomUUID());
    }
  } catch (_error) {}
  return Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 12);
}

export function userDocumentPath(uid: string, attachmentId: string): string {
  return "userDocuments/" + uid + "/" + attachmentId;
}

export function shareAttachmentPath(
  projectId: string,
  attachmentId: string,
): string {
  return "shareAttachments/" + projectId + "/" + attachmentId;
}

/** Un record e' "remoto" quando il contenuto sta su Storage e non in base64. */
export function attachmentIsRemote(record: any): boolean {
  return !!(record && record.storagePath && !record.dataUrl);
}

/** Percorso per un nuovo documento della sezione Appunti dell'utente corrente. */
export function newUserDocumentPath(): string {
  const uid = currentUid();
  if (!uid) {
    throw new AttachmentStorageError("no-user", "Sessione non disponibile.");
  }
  return userDocumentPath(uid, newAttachmentId());
}

/**
 * Copia il contenuto in memoria prima di caricarlo.
 *
 * FIX 2.0.6 — Passare il File di un <input type="file"> direttamente all'SDK non e'
 * sicuro: la lettura del body avviene in modo asincrono, mentre handleFiles azzera
 * ev.target.value nello stesso giro di eventi. Su WebView Android questo rilascia il
 * content URI e la lettura fallisce senza errore utile. FileReader invece acquisisce
 * il contenuto immediatamente, ed e' il motivo per cui la versione con base64
 * funzionava.
 */
export function snapshotFileForUpload(file: any): Promise<Blob> {
  return new Promise(function (resolve, reject) {
    try {
      const reader = new FileReader();
      reader.onload = function () {
        const buffer = reader.result as ArrayBuffer;
        if (!buffer || !(buffer as any).byteLength) {
          reject(
            new AttachmentStorageError("read-failed", "File vuoto o illeggibile."),
          );
          return;
        }
        resolve(
          new Blob([buffer], {
            type:
              String((file && file.type) || "") || "application/octet-stream",
          }),
        );
      };
      reader.onerror = function () {
        reject(
          new AttachmentStorageError(
            "read-failed",
            "Lettura del file non riuscita.",
          ),
        );
      };
      reader.readAsArrayBuffer(file);
    } catch (error) {
      reject(error);
    }
  });
}

// ── Caricamento ─────────────────────────────────────────────────────────────

function uploadToBucket(
  bucket: string,
  storagePath: string,
  file: Blob,
  contentType: string,
  originalName?: string,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const task = uploadBytesResumable(
    ref(storageFor(bucket), storagePath),
    file,
    {
      contentType,
      customMetadata: originalName
        ? { originalName: String(originalName).slice(0, 200) }
        : undefined,
    },
  );
  return new Promise<void>(function (resolve, reject) {
    task.on(
      "state_changed",
      function (snapshot: any) {
        if (!onProgress) return;
        const total = Number(snapshot.totalBytes || 0);
        const sent = Number(snapshot.bytesTransferred || 0);
        onProgress(
          total > 0 ? Math.min(100, Math.round((sent / total) * 100)) : 0,
        );
      },
      function (error: any) {
        reject(
          new AttachmentStorageError(
            String((error && error.code) || "storage/unknown"),
            String((error && error.message) || "Caricamento non riuscito."),
          ),
        );
      },
      function () {
        resolve();
      },
    );
  });
}

/**
 * Carica un file su Storage, provando in sequenza i bucket candidati. Non intercetta
 * l'errore finale: chi chiama deve mostrare un messaggio, perche' senza rete o con una
 * configurazione errata il caricamento non puo' riuscire e l'utente deve saperlo
 * invece di ritrovarsi un allegato vuoto.
 */
export async function uploadAttachment(
  file: Blob,
  storagePath: string,
  originalName?: string,
  onProgress?: (percent: number) => void,
): Promise<AttachmentUploadResult> {
  if (!file) throw new AttachmentStorageError("empty-file", "File assente.");
  const size = Number((file as any).size || 0);
  if (size > FAINANCE_ATTACHMENT_MAX_BYTES) {
    throw new AttachmentStorageError("too-large", "File troppo grande.");
  }
  if (!isOnline()) {
    throw new AttachmentStorageError(
      "offline",
      "Serve una connessione per caricare un allegato.",
    );
  }

  const contentType =
    String((file as any).type || "") || "application/octet-stream";
  const candidates = bucketCandidates();
  if (!candidates.length) {
    throw new AttachmentStorageError(
      "no-bucket",
      "Nessun bucket Storage configurato.",
    );
  }

  let lastError: AttachmentStorageError | null = null;
  const tried: Array<string> = [];

  for (let index = 0; index < candidates.length; index += 1) {
    const bucket = candidates[index];
    tried.push(bucket);
    try {
      await uploadToBucket(
        bucket,
        storagePath,
        file,
        contentType,
        originalName,
        onProgress,
      );
      rememberBucket(bucket);
      if (index > 0) {
        console.warn(
          "Storage: il bucket configurato non risponde, uso " +
            bucket +
            ". Aggiorna VITE_FIREBASE_STORAGE_BUCKET e config/env.ts.",
        );
      }
      return { storagePath, sizeBytes: size, contentType, bucket };
    } catch (error: any) {
      const code = String((error && error.code) || "storage/unknown");
      lastError = error;
      // Solo un bucket irraggiungibile giustifica un secondo tentativo. Un errore di
      // permessi o di quota si ripeterebbe identico e allungherebbe solo l'attesa.
      if (!isBucketUnreachable(code)) break;
      console.warn("Storage: bucket " + bucket + " non raggiungibile (" + code + ")");
    }
  }

  const finalCode = String((lastError && lastError.code) || "storage/unknown");
  throw new AttachmentStorageError(
    finalCode,
    "Bucket non raggiungibili: " + tried.join(", "),
  );
}

// ── Lettura ─────────────────────────────────────────────────────────────────

async function withBuckets<T>(
  operation: (storage: FirebaseStorage) => Promise<T>,
): Promise<T> {
  const candidates = bucketCandidates();
  let lastError: any = null;
  for (let index = 0; index < candidates.length; index += 1) {
    try {
      const value = await operation(storageFor(candidates[index]));
      rememberBucket(candidates[index]);
      return value;
    } catch (error: any) {
      lastError = error;
      if (!isBucketUnreachable(String((error && error.code) || ""))) break;
    }
  }
  throw new AttachmentStorageError(
    String((lastError && lastError.code) || "storage/unknown"),
    String((lastError && lastError.message) || "Allegato non raggiungibile."),
  );
}

/** URL diretto, adatto ad aprire il file in una scheda del browser. */
export async function attachmentDownloadUrl(
  storagePath: string,
): Promise<string> {
  return await withBuckets(function (storage) {
    return getDownloadURL(ref(storage, storagePath));
  });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise(function (resolve, reject) {
    try {
      const reader = new FileReader();
      reader.onload = function () {
        resolve(String(reader.result || ""));
      };
      reader.onerror = function () {
        reject(
          new AttachmentStorageError(
            "read-failed",
            "Lettura del file non riuscita.",
          ),
        );
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Restituisce il contenuto come data URL. Serve al plugin nativo FainanceFile, che
 * accetta solo quel formato. I record vecchi hanno gia' il dataUrl in memoria e non
 * passano da Storage.
 */
export async function readAttachmentDataUrl(record: any): Promise<string> {
  if (record && record.dataUrl) return String(record.dataUrl);
  if (!record || !record.storagePath) {
    throw new AttachmentStorageError("missing-path", "Allegato non disponibile.");
  }
  if (!isOnline()) {
    throw new AttachmentStorageError(
      "offline",
      "Serve una connessione per aprire questo allegato.",
    );
  }
  const blob = await withBuckets<Blob>(function (storage) {
    return getBlob(ref(storage, String(record.storagePath)));
  });
  return await blobToDataUrl(blob);
}

// ── Eliminazione ────────────────────────────────────────────────────────────

/**
 * Elimina il file. Non solleva: la cancellazione del record Firestore non deve
 * fallire perche' il file era gia' assente o la rete non c'e'. Un file orfano costa
 * qualche KB, un record orfano rende l'allegato irraggiungibile per sempre.
 */
export async function deleteAttachment(storagePath: string): Promise<boolean> {
  if (!storagePath) return false;
  try {
    await withBuckets(function (storage) {
      return deleteObject(ref(storage, storagePath));
    });
    return true;
  } catch (error: any) {
    const code = String((error && error.code) || "");
    if (code === "storage/object-not-found") return true;
    console.warn("Attachment delete failed", code || error);
    return false;
  }
}

/**
 * Elimina tutti i file dell'utente sotto userDocuments/{uid}. Serve alla cancellazione
 * dell'account: senza questo passaggio i file resterebbero nel bucket a tempo
 * indeterminato. Non solleva: la cancellazione dell'account non deve fermarsi qui.
 */
export async function deleteAllUserDocuments(uid: string): Promise<number> {
  if (!uid) return 0;
  let removed = 0;
  for (const bucket of bucketCandidates()) {
    try {
      const listing = await listAll(
        ref(storageFor(bucket), "userDocuments/" + uid),
      );
      const results = await Promise.all(
        listing.items.map(function (item: any) {
          return deleteObject(item).then(
            function () {
              return true;
            },
            function () {
              return false;
            },
          );
        }),
      );
      removed += results.filter(Boolean).length;
    } catch (error) {
      console.warn("User documents cleanup failed on " + bucket, error);
    }
  }
  return removed;
}
