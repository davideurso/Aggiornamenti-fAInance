import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { fbDb } from "../firebase/client";
import type { AdminAuditEntry } from "./types";

export interface WriteAdminAuditInput {
  actorUid: string;
  action: string;
  targetType: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

export async function writeAdminAudit(input: WriteAdminAuditInput): Promise<string> {
  const payload: Omit<AdminAuditEntry, "id" | "createdAt"> & { createdAt: unknown } = {
    actorUid: input.actorUid,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId,
    metadata: input.metadata,
    createdAt: serverTimestamp(),
  };
  const result = await addDoc(collection(fbDb, "adminAudit"), payload);
  return result.id;
}
