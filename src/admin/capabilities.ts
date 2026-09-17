import type { AdminIdentity, AdminRole } from "./types";

export type AdminCapability =
  | "users.read_metadata"
  | "subscriptions.read"
  | "diagnostics.read"
  | "config.read"
  | "config.write"
  | "announcements.write"
  | "audit.read"
  | "admins.manage";

const capabilitiesByRole: Record<AdminRole, ReadonlySet<AdminCapability>> = {
  support: new Set(["users.read_metadata", "diagnostics.read"]),
  analyst: new Set(["users.read_metadata", "subscriptions.read", "diagnostics.read", "config.read", "audit.read"]),
  admin: new Set([
    "users.read_metadata",
    "subscriptions.read",
    "diagnostics.read",
    "config.read",
    "config.write",
    "announcements.write",
    "audit.read",
  ]),
  superadmin: new Set([
    "users.read_metadata",
    "subscriptions.read",
    "diagnostics.read",
    "config.read",
    "config.write",
    "announcements.write",
    "audit.read",
    "admins.manage",
  ]),
};

export function adminHasCapability(
  identity: AdminIdentity | null | undefined,
  capability: AdminCapability,
): boolean {
  if (!identity) return false;
  return capabilitiesByRole[identity.role].has(capability);
}
