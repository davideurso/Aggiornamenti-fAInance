import type { FinanceEvolution } from '../data/financeEvolution';
import type { PeriodSettings, PeriodComparison } from './periodEngine';
export type BudgetScope = 'month' | 'future';
export function budgetReferenceIncome(plan: any, fallback?: number): number;
export function budgetSourceForPeriod(finance: FinanceEvolution, key: string): {kind: 'month' | 'standard'; from: string | null};
export function resetBudgetForPeriod(finance: FinanceEvolution, key: string): FinanceEvolution;
export function validateBudgetPlan(plan: any): any;
export function plannedSavings(plan: any): number;
export function averageBudgetForPeriods(getPlan: (key: string) => any, keys: string[]): any;
export function budgetForPeriod(finance: FinanceEvolution, legacyPlan: any, key: string): any;
export function saveBudgetForPeriod(finance: FinanceEvolution, legacyPlan: any, key: string, plan: any, scope?: BudgetScope): FinanceEvolution;
export function budgetPeriodSummary(expenses: any[], incomes: any[], plan: any, key: string, settings: PeriodSettings, comparison?: PeriodComparison): {
  income: number; expense: number; realSaving: number; plannedSaving: number;
  planAchievement: number | null; actualSavingsRate: number | null;
  comparisonKeys: string[]; comparisonSaving: number; difference: number;
};
