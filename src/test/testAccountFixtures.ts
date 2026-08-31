export type TestAccountScenario =
  | "new_user"
  | "free_user"
  | "premium_user"
  | "large_dataset"
  | "incomplete_profile"
  | "sync_error";

export interface TestAccountFixture {
  scenario: TestAccountScenario;
  displayName: string;
  description: string;
}

// No credentials are stored in source control. These are scenario descriptors only.
export const TEST_ACCOUNT_FIXTURES: readonly TestAccountFixture[] = [
  { scenario: "new_user", displayName: "Mario Rossi - Nuovo", description: "Account appena creato, senza dati finanziari." },
  { scenario: "free_user", displayName: "Mario Rossi - Free", description: "Account con piano gratuito e dataset minimo." },
  { scenario: "premium_user", displayName: "Mario Rossi - Premium", description: "Account Premium con funzionalità abilitate." },
  { scenario: "large_dataset", displayName: "Mario Rossi - Dati estesi", description: "Dataset ampio per test prestazioni e statistiche." },
  { scenario: "incomplete_profile", displayName: "Mario Rossi - Profilo incompleto", description: "Profilo volutamente incompleto per test migrazioni." },
  { scenario: "sync_error", displayName: "Mario Rossi - Sync", description: "Scenario riservato ai test di sincronizzazione e recovery." },
];
