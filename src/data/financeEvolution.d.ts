import type { PeriodSettings, PeriodComparison } from '../finance/periodEngine';
export interface FinanceRecord { id: string; [key: string]: unknown }
export interface SavingsBucket extends FinanceRecord {
  name: string; active: boolean; currency: string; plannedMinor: number;
  balanceMinor: number; goalId: string | null;
}
export interface SavingsEntry extends FinanceRecord {
  bucketId: string; periodKey: string; date: string; amountMinor: number; currency: string;
  source: 'planned' | 'residual' | 'extra'; goalId: string | null; goalAmountMinor: number;
}
export interface Deficit extends FinanceRecord {
  periodKey: string; originalMinor: number; currency: string;
  status: 'uncovered' | 'partial' | 'covered';
}
export interface CoverageEntry extends FinanceRecord {
  deficitId: string; bucketId: string; date: string; periodKey: string; amountMinor: number; currency: string;
}
export interface AutomaticRule extends FinanceRecord {
  name: string; enabled: boolean; priority: number; trigger: 'expense' | 'income' | 'movement';
  match: 'all' | 'any'; conditions: Array<{ field: string; operator: string; value: string | number }>;
  actions: Array<{ field: string; value: string }>;
  alert: null | { kind: 'information' | 'confirmation'; text: string };
}
export interface FinanceEvolution {
  schemaVersion: number; period: PeriodSettings; periodIntroductionSeen: boolean;
  budget: { comparison: PeriodComparison; standardVersions: FinanceRecord[]; overrides: Record<string, unknown>; [key: string]: unknown };
  savings: { buckets: SavingsBucket[]; entries: SavingsEntry[]; closures: FinanceRecord[]; deficits: Deficit[]; coverageEntries: CoverageEntry[]; [key: string]: unknown };
  rules: AutomaticRule[];
  tools: { calculator: FinanceRecord[]; converter: FinanceRecord[]; lastCurrencyPair: [string, string] | null; recentCurrencies: string[]; [key: string]: unknown };
  advice: FinanceRecord[];
  [key: string]: unknown;
}
export const FINANCE_EVOLUTION_VERSION: number;
export function createFinanceEvolution(): FinanceEvolution;
export function migrateFinanceEvolution(input?: unknown): FinanceEvolution;
export function mergeFinanceEvolution(current: unknown, incoming: unknown): FinanceEvolution;
export function selectFinanceEvolution(local: unknown, cloud: unknown, localTimestamp: number, cloudTimestamp: number, preferLocal?: boolean): FinanceEvolution;
