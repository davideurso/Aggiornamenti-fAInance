export type AdminRole = "support" | "analyst" | "admin" | "superadmin";

export interface AdminIdentity {
  uid: string;
  role: AdminRole;
}

export interface AdminAuditEntry {
  id: string;
  actorUid: string;
  action: string;
  targetType: string;
  targetId?: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}
