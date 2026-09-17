export interface PeriodSettings { mode: 'calendar' | 'financial'; startDay: number; [key: string]: unknown }
export interface FinancialPeriod { key: string; start: string; end: string; endExclusive: string }
export type PeriodComparison = 'previous' | 'previousYear' | 'average6' | 'average12';
export const CALENDAR_PERIOD: Readonly<PeriodSettings>;
export function validatePeriodSettings(settings?: PeriodSettings): PeriodSettings;
export function shiftPeriodKey(key: string, offset: number): string;
export function periodForKey(key: string, settings?: PeriodSettings): FinancialPeriod;
export function periodForDate(value?: string | Date, settings?: PeriodSettings): FinancialPeriod;
export function dateInPeriod(value: unknown, key: string, settings?: PeriodSettings): boolean;
export function lastPeriodKeys(count: number, reference?: string | Date, settings?: PeriodSettings, includeCurrent?: boolean): string[];
export function comparisonPeriodKeys(key: string, comparison?: PeriodComparison): string[];
export function periodLabel(key: string, locale?: string): string;
export function installmentDate(value: string, offset: number): string;
