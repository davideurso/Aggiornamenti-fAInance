import type { PeriodSettings } from './periodEngine';
export function recurringOccurrenceAlreadyGenerated(rule: any, date: string, generatedMovements?: any[]): boolean;
export function recurringOccurrencesInPeriod(rule: any, key: string, settings?: PeriodSettings, generatedMovements?: any[]): any[];
export function recurringEffectiveFrom(rule: any, today: string | Date, settings?: PeriodSettings): string;
export function recurringDueOccurrences(rule: any, today: string | Date, settings?: PeriodSettings, generatedMovements?: any[]): any[];
export function recurringOccurrenceForDate(rule: any, date: string, today: string | Date, settings?: PeriodSettings, generatedMovements?: any[]): any | null;
