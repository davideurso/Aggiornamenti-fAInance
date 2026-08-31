import type { AdminRole, AdminSession } from "./types";

export type AdminCapability =
  | "users.read_metadata"
  | "config.read"
  | "config.write"
  | "diagnostics.read"
  | "audit.read"
  | "admins.manage"
  | "users.manage_username"
  | "technical_logs.read"
  | "backups.read"
  | "communications.write";

const capabilityMap: Record<AdminRole, ReadonlySet<AdminCapability>> = {
  support: new Set(["users.read_metadata", "diagnostics.read"]),
  analyst: new Set(["users.read_metadata", "config.read", "diagnostics.read", "audit.read", "technical_logs.read"]),
  admin: new Set(["users.read_metadata", "config.read", "config.write", "diagnostics.read", "audit.read", "technical_logs.read", "backups.read", "communications.write"]),
  superadmin: new Set(["users.read_metadata", "config.read", "config.write", "diagnostics.read", "audit.read", "admins.manage", "users.manage_username", "technical_logs.read", "backups.read", "communications.write"]),
};

export function hasCapability(session: AdminSession | null | undefined, capability: AdminCapability): boolean {
  if (!session) return false;
  return capabilityMap[session.role].has(capability);
}

export function assertCapability(session: AdminSession | null | undefined, capability: AdminCapability): void {
  if (!hasCapability(session, capability)) {
    throw new Error(`Permesso Admin insufficiente: ${capability}`);
  }
}
