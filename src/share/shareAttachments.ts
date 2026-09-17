import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from "firebase/firestore";
import { fbAuth, fbDb } from "../firebase/client";

export const SHARE_ATTACHMENT_RETENTION_MONTHS = 6;
export const SHARE_ATTACHMENT_MAX_DATA_URL_CHARS = 700000;

export interface ShareAttachmentRecord {
  id: string;
  projectId: string;
  activityId: string;
  ownerUid: string;
  name: string;
  mimeType: string;
  dataUrl: string;
  sizeBytes: number;
  uploadedAt: string;
  expiresAt: string;
  expiresAtMs: number;
  retentionMonths: number;
  status: "active";
}

function cleanId(value: unknown): string {
  return String(value || "").trim();
}

function estimateDataUrlBytes(value: string): number {
  const body = String(value || "").split(",").pop() || "";
  return Math.max(0, Math.floor((body.length * 3) / 4));
}

export async function saveShareAttachment(
  input: Partial<ShareAttachmentRecord>,
): Promise<ShareAttachmentRecord> {
  const ownerUid = cleanId(fbAuth.currentUser?.uid);
  const id = cleanId(input.id);
  const projectId = cleanId(input.projectId);
  const activityId = cleanId(input.activityId);
  const dataUrl = String(input.dataUrl || "");
  if (!ownerUid) throw new Error("SHARE_ATTACHMENT_AUTH_REQUIRED");
  if (!id || !projectId || !activityId) throw new Error("SHARE_ATTACHMENT_ID_REQUIRED");
  if (!/^data:image\/[a-z0-9.+-]+;base64,/i.test(dataUrl)) {
    throw new Error("SHARE_ATTACHMENT_IMAGE_REQUIRED");
  }
  if (dataUrl.length > SHARE_ATTACHMENT_MAX_DATA_URL_CHARS) {
    throw new Error("SHARE_ATTACHMENT_TOO_LARGE");
  }

  const uploadedAt = String(input.uploadedAt || (input as any).createdAt || new Date().toISOString());
  const expiresDate = new Date(uploadedAt);
  if (!Number.isFinite(expiresDate.getTime())) expiresDate.setTime(Date.now());
  expiresDate.setMonth(expiresDate.getMonth() + SHARE_ATTACHMENT_RETENTION_MONTHS);
  const expiresAt = expiresDate.toISOString();
  const record: ShareAttachmentRecord = {
    id,
    projectId,
    activityId,
    ownerUid,
    name: String(input.name || "ricevuta.jpg").slice(0, 120),
    mimeType: String(input.mimeType || "image/jpeg").slice(0, 60),
    dataUrl,
    sizeBytes: estimateDataUrlBytes(dataUrl),
    uploadedAt,
    expiresAt,
    expiresAtMs: expiresDate.getTime(),
    retentionMonths: SHARE_ATTACHMENT_RETENTION_MONTHS,
    status: "active",
  };
  await setDoc(doc(fbDb, "shareAttachments", id), record, { merge: false });
  return record;
}

export function watchShareAttachments(
  projectId: string,
  onChange: (items: ShareAttachmentRecord[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  const cleanProjectId = cleanId(projectId);
  if (!cleanProjectId) {
    onChange([]);
    return () => undefined;
  }
  const q = query(
    collection(fbDb, "shareAttachments"),
    where("projectId", "==", cleanProjectId),
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const now = Date.now();
      const items = snapshot.docs
        .map((row) => ({ id: row.id, ...row.data() }) as ShareAttachmentRecord)
        .filter((item) => item.status === "active" && Number(item.expiresAtMs || 0) > now)
        .sort((a, b) => Number(b.expiresAtMs || 0) - Number(a.expiresAtMs || 0));
      onChange(items);
    },
    (error) => {
      onError?.(error);
    },
  );
}

export async function deleteShareAttachment(attachmentId: string): Promise<void> {
  const id = cleanId(attachmentId);
  if (!id) return;
  await deleteDoc(doc(fbDb, "shareAttachments", id));
}
