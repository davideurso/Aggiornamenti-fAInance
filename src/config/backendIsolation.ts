import { appEnvironment, firebaseConfig } from "./env";

export interface BackendIsolationDiagnostic {
  environment: "test" | "production";
  projectId: string;
  isolated: boolean;
  reason: string | null;
}

const PRODUCTION_PROJECT_ID = "fainance-a7794";

export function getBackendIsolationDiagnostic(): BackendIsolationDiagnostic {
  if (appEnvironment === "production") {
    const isolated = firebaseConfig.projectId === PRODUCTION_PROJECT_ID;
    return {
      environment: appEnvironment,
      projectId: firebaseConfig.projectId,
      isolated,
      reason: isolated ? null : "PRODUCTION_PROJECT_ID_MISMATCH",
    };
  }

  const isolated = firebaseConfig.projectId === 'fainance-test-20260823195207';
  return {
    environment: appEnvironment,
    projectId: firebaseConfig.projectId,
    isolated,
    reason: isolated ? null : "TEST_ENVIRONMENT_PROJECT_MISMATCH",
  };
}

export function assertBackendIsolation(): void {
  const diagnostic = getBackendIsolationDiagnostic();
  if (!diagnostic.isolated) {
    throw new Error(`fAInance backend isolation failed: ${diagnostic.reason ?? "UNKNOWN"}`);
  }
}
