export type AdminRole = "support" | "analyst" | "admin" | "superadmin";

export type AdminSection = "overview" | "users" | "communications" | "config" | "audit" | "technicalLogs" | "backups" | "diagnostics";

export interface AdminSession {
  uid: string;
  email: string;
  role: AdminRole;
}

export interface AdminUserMetadata {
  uid: string;
  email?: string | null;
  emailVerified?: boolean;
  disabled?: boolean;
  username?: string | null;
  usernameLower?: string | null;
  displayName?: string | null;
  plan?: string | null;
  accountStatus?: string | null;
  country?: string | null;
  providers?: string[];
  authProviders?: string[];
  lastLoginProvider?: string | null;
  residenceCompleted?: boolean | null;
  createdAt?: unknown;
  lastSeenAt?: unknown;
  profileUpdatedAt?: unknown;
  indexedAt?: unknown;
  platform?: string | null;
  appVersion?: string | null;
  language?: string | null;
  deletionStatus?: string | null;
  deletionRequestedAt?: unknown;
  deletionScheduledAt?: unknown;
  deletionGraceDays?: number | null;
}

export interface PublicAppConfig {
  minimumVersion?: string;
  recommendedVersion?: string;
  maintenanceMode?: boolean;
  announcementsEnabled?: boolean;
  updatedAt?: string;
  updatedBy?: string;
}

export interface AdminAuditEntry {
  id: string;
  actorUid?: string;
  actorEmail?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  createdAt?: unknown;
  metadata?: Record<string, unknown>;
}

export interface TechnicalLogEntry {
  id: string;
  uid?: string;
  deviceId?: string;
  category?: string;
  operation?: string;
  result?: string;
  severity?: string;
  errorCode?: string;
  environment?: string;
  appVersion?: string;
  createdAt?: unknown;
  createdAtIso?: string;
  createdAtMs?: number;
  metadata?: Record<string, unknown>;
}

export interface BackupMetadataEntry {
  id: string;
  uid?: string;
  reason?: string;
  appVersion?: string;
  rawBytes?: number;
  compressedBytes?: number;
  createdAt?: unknown;
  createdAtIso?: string;
  createdAtMs?: number;
}
