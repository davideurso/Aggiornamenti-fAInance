import {
  collection,
  doc,
  deleteDoc,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { fbDb } from "../firebase/client";


export interface AppNotificationRecord {
  id: string;
  targetUid: string;
  type: string;
  title: string;
  message: string;
  severity?: "info" | "success" | "warning" | "critical";
  projectId?: string;
  inviteId?: string;
  actionType?: string;
  actionValue?: string;
  source?: string;
  sourceUid?: string;
  campaignId?: string;
  language?: string;
  messageArgs?: Record<string, string>;
  createdAt?: string;
  createdAtMs?: number;
  expiresAtMs?: number;
  read?: boolean;
  readAt?: string;
  status?: string;
}

export function watchAppNotifications(
  uid: string,
  onChange: (items: AppNotificationRecord[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const targetUid = String(uid || "").trim();
  if (!targetUid) {
    onChange([]);
    return () => undefined;
  }
  const q = query(
    collection(fbDb, "appNotifications"),
    where("targetUid", "==", targetUid),
    limit(100),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const items = snapshot.docs
        .map((row) => ({ id: row.id, ...row.data() }) as AppNotificationRecord)
        .filter((item) => item.status !== "deleted" && (!item.expiresAtMs || item.expiresAtMs > now))
        .sort((a, b) => Number(b.createdAtMs || 0) - Number(a.createdAtMs || 0));
      onChange(items);
    },
    (error) => onError?.(error),
  );
}

export async function markAppNotificationRead(
  uid: string,
  notificationId: string,
  read = true,
): Promise<void> {
  const targetUid = String(uid || "").trim();
  const id = String(notificationId || "").trim();
  if (!targetUid || !id) return;
  await setDoc(
    doc(fbDb, "appNotifications", id),
    {
      targetUid,
      read,
      readAt: read ? new Date().toISOString() : "",
      updatedAt: new Date().toISOString(),
    },
    { merge: true },
  );
}

export async function deleteAppNotification(
  uid: string,
  notificationId: string,
): Promise<void> {
  const targetUid = String(uid || "").trim();
  const id = String(notificationId || "").trim();
  if (!targetUid || !id) return;

  // FAINANCE V113 NOTIFICATION DELETE: use the rule-authorized physical delete.
  // appNotifications rules allow the owner to physically delete the document.
  // A soft-delete update is intentionally forbidden because owner updates are
  // limited to read/readAt/updatedAt.
  await deleteDoc(doc(fbDb, "appNotifications", id));
}
