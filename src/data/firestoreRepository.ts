import {
  doc,
  getDoc,
  onSnapshot,
  setDoc,
  type DocumentData,
  type Unsubscribe,
} from "firebase/firestore";
import { fbDb } from "../firebase/client";

export type FirestoreRecord = Record<string, unknown>;

export function recordRef(collectionName: string, documentId: string) {
  return doc(fbDb, collectionName, documentId);
}

export async function readRecord<T extends DocumentData = FirestoreRecord>(
  collectionName: string,
  documentId: string,
): Promise<T | null> {
  const snapshot = await getDoc(recordRef(collectionName, documentId));
  return snapshot.exists() ? (snapshot.data() as T) : null;
}

export async function mergeRecord<T extends DocumentData>(
  collectionName: string,
  documentId: string,
  patch: Partial<T>,
): Promise<void> {
  await setDoc(recordRef(collectionName, documentId), patch, { merge: true });
}

export function watchRecord<T extends DocumentData = FirestoreRecord>(
  collectionName: string,
  documentId: string,
  listener: (value: T | null) => void,
  onError?: (error: unknown) => void,
): Unsubscribe {
  return onSnapshot(
    recordRef(collectionName, documentId),
    (snapshot) => listener(snapshot.exists() ? (snapshot.data() as T) : null),
    onError,
  );
}
