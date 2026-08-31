import type { Unsubscribe } from "firebase/firestore";
import { mergeRecord, readRecord, watchRecord, type FirestoreRecord } from "./firestoreRepository";

export type FainanceUserDataDocument = FirestoreRecord & {
  accountSyncSchemaVersion?: number;
  updatedAt?: string;
  updatedAtMs?: number;
};

const COLLECTION = "userData";

export async function readUserData(uid: string): Promise<FainanceUserDataDocument> {
  return (await readRecord<FainanceUserDataDocument>(COLLECTION, uid)) || {};
}

export async function mergeUserData(
  uid: string,
  patch: Partial<FainanceUserDataDocument>,
): Promise<void> {
  await mergeRecord<FainanceUserDataDocument>(COLLECTION, uid, patch);
}

export function watchUserData(
  uid: string,
  listener: (value: FainanceUserDataDocument) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return watchRecord<FainanceUserDataDocument>(
    COLLECTION,
    uid,
    (value) => listener(value || {}),
    onError,
  );
}
