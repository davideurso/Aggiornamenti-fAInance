import type { AdminIdentity, AdminRole } from "./types";

const roleLevel: Record<AdminRole, number> = {
  support: 1,
  analyst: 2,
  admin: 3,
  superadmin: 4
};

export function adminHasRole(identity: AdminIdentity | null | undefined, minimum: AdminRole): boolean {
  if (!identity) return false;
  return roleLevel[identity.role] >= roleLevel[minimum];
}

// Financial user data must not become readable merely because a user has Admin access.
// Specific diagnostic capabilities will be explicitly allow-listed in later phases.
export function adminCanReadPrivateFinanceData(): false {
  return false;
}
