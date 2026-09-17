import { appEnvironment, environmentWarnings, firebaseConfig } from "../config/env";
import { getBackendIsolationDiagnostic } from "../config/backendIsolation";

export interface EnvironmentDiagnostic {
  environment: "test" | "production";
  projectId: string;
  warnings: string[];
  backendIsolated: boolean;
  backendIsolationReason: string | null;
}

export function getEnvironmentDiagnostic(): EnvironmentDiagnostic {
  const isolation = getBackendIsolationDiagnostic();
  return {
    environment: appEnvironment,
    projectId: firebaseConfig.projectId,
    warnings: [...environmentWarnings],
    backendIsolated: isolation.isolated,
    backendIsolationReason: isolation.reason,
  };
}
