import {
  collection,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  setDoc,
  where,
  updateDoc,
} from "firebase/firestore";
import { fbDb } from "../firebase/client";
import { isSystemCommunication } from "./notificationChannels.mjs";


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
  richContent?: unknown;
  media?: import("./NotificationMedia").NotificationMedia;
  language?: string;
  messageArgs?: Record<string, string>;
  createdAt?: string;
  createdAtMs?: number;
  expiresAtMs?: number;
  inboxDismissedAt?: string;
  read?: boolean;
  readAt?: string;
  status?: string;
  recurringRuleId?: string;
  recurringOccurrenceKey?: string;
  recurringOccurrenceDate?: string;
  virtual?: boolean;
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
        .map((row) => ({ ...row.data(), id: row.id }) as AppNotificationRecord)
        .filter((item) => !item.inboxDismissedAt && item.status !== "deleted" && (!item.expiresAtMs || item.expiresAtMs > now))
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

  const ref = doc(fbDb, "appNotifications", id);
  const snapshot = await getDoc(ref);
  if (!snapshot.exists()) return;
  const notice = snapshot.data();
  if (notice.targetUid !== targetUid) throw new Error("Recipient mismatch.");
  if (notice.type === "share_project_deleted") {
    // The separate decision about keeping personal expenses must remain actionable.
    if (!notice.inboxDismissedAt) await updateDoc(ref, { inboxDismissedAt: new Date().toISOString() });
    return;
  }
  if (isSystemCommunication(notice.type)) {
    throw new Error("System communications cannot be deleted.");
  }
  // The authenticated callable keeps a tombstone for dismissible personal notices.
  const { getApp } = await import("firebase/app");
  const { getFunctions, httpsCallable } = await import("firebase/functions");
  const result = await httpsCallable(getFunctions(getApp(), "europe-west1"), "fainanceDeleteAppNotification")({ notificationId: id });
  const occurrenceId = String((result.data as any)?.occurrenceId || "");
  if (occurrenceId) {
    const { removeLocalReminder } = await import("./localCustomReminders.mjs");
    removeLocalReminder(targetUid, occurrenceId);
  }
}
