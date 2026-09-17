import { getEnvironmentDiagnostic } from "../security/environmentGuard";
import type { AdminSession } from "./session";

export interface AdminRuntimeDiagnostic {
  environment: ReturnType<typeof getEnvironmentDiagnostic>;
  adminAuthenticated: boolean;
  adminRole: string | null;
  privateFinanceDataAccessible: false;
}

export function getAdminRuntimeDiagnostic(session: AdminSession | null): AdminRuntimeDiagnostic {
  return {
    environment: getEnvironmentDiagnostic(),
    adminAuthenticated: Boolean(session?.isAdmin),
    adminRole: session?.role ?? null,
    privateFinanceDataAccessible: false,
  };
}
