import type { User } from "firebase/auth";
import type { AdminRole } from "./types";

export interface AdminSession {
  uid: string;
  role: AdminRole | null;
  isAdmin: boolean;
}

const KNOWN_ROLES: AdminRole[] = ["support", "analyst", "admin", "superadmin"];

export async function resolveAdminSession(user: User | null): Promise<AdminSession | null> {
  if (!user) return null;
  try {
    const token = await user.getIdTokenResult(true);
    const raw = String((token.claims as any)?.fainanceAdminRole || "").toLowerCase() as AdminRole;
    const role = KNOWN_ROLES.includes(raw) ? raw : null;
    return { uid: user.uid, role, isAdmin: role !== null };
  } catch {
    return { uid: user.uid, role: null, isAdmin: false };
  }
}
