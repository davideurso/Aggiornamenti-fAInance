import { appEnvironment, firebaseConfig } from "../config/env";
import { assertBackendIsolation } from "../config/backendIsolation";

export interface TestEnvironmentInfo {
  environment: "test";
  projectId: string;
}

export function requireTestEnvironment(): TestEnvironmentInfo {
  if (appEnvironment !== "test") {
    throw new Error("This operation is available only in the fAInance Test environment.");
  }
  assertBackendIsolation();
  return { environment: "test", projectId: firebaseConfig.projectId };
}
