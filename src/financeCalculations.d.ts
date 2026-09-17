// FIX 2.2.0 — Dichiarazioni di tipo per financeCalculations.js.
//
// Prima esistevano DUE file: financeCalculations.ts e financeCalculations.js, con la
// stessa logica scritta due volte. Non era una ridondanza innocua:
//
//   - Vite risolve ".js" prima di ".ts", quindi l'app eseguiva il .js
//   - tests/financeCalculations.test.mjs importa esplicitamente "../src/financeCalculations.js"
//   - tsconfig.json NON ha "allowJs", quindi TypeScript resolveva il .ts
//
// Risultato: si controllavano i tipi di un file e se ne eseguiva un altro. Le due
// copie erano infatti divergenti — il .ts gestiva rateDirection "backward", il .js no —
// e una spesa a rate a ritroso veniva conteggiata in mesi diversi a seconda di quale
// parte dell'app faceva il calcolo.
//
// Ora l'implementazione e' una sola, financeCalculations.js, e questo file le da' i
// tipi. TypeScript risolve i .d.ts anche senza allowJs, quindi app.tsx continua a
// essere controllato, e Vite e i test caricano lo stesso codice che viene verificato.

import type { PeriodSettings } from './finance/periodEngine';
export interface ExpenseItem {
  id?: string;
  amount: number;
  date: string;
  rateizzato?: boolean;
  rate?: number;
  /** "backward" distribuisce le rate a ritroso a partire dal mese della spesa. */
  rateDirection?: "forward" | "backward";
  [key: string]: any;
}

export interface MonthlyTotal {
  label: string;
  exp: number;
  inc: number;
  value: number;
}

export interface PatrimonioEntry {
  id: string;
  [key: string]: any;
}

/**
 * "reale" considera solo il mese della data. Gli altri due distribuiscono le rate.
 * "rateizzato" e' il valore usato da app.tsx; "competenza" e' mantenuto per
 * compatibilita' con le chiamate esistenti.
 */
export type ViewMode = "reale" | "rateizzato" | "competenza";

/**
 * Converte in numero un importo scritto a mano, gestendo separatore di migliaia e
 * decimale come parseMoney di core.tsx. "1.500,00" restituisce 1500, non 1,5.
 */
export declare function parseMoneyValue(value: unknown): number;

/**
 * Quota di un movimento imputata a un mese. Per i movimenti rateizzati arrotonda a
 * due decimali e assegna il resto all'ultima rata, cosi' la somma delle rate torna
 * esattamente all'importo.
 */
export declare function itemAmountForMonth(
  item: ExpenseItem,
  monthKey: string,
  settings?: PeriodSettings,
): number;

export declare function totalForMonth(
  items: ExpenseItem[],
  monthKey: string,
  mode: ViewMode,
  settings?: PeriodSettings,
): number;

export declare function last12MonthKeys(referenceDate?: string | Date, settings?: PeriodSettings): string[];

export declare function balanceForMonths(
  expenses: ExpenseItem[],
  incomes: ExpenseItem[],
  monthKeys: string[],
  mode?: ViewMode,
  settings?: PeriodSettings,
): number;

export declare function monthlyTotalsForYear(
  expenses: ExpenseItem[],
  incomes: ExpenseItem[],
  year: number,
  mode: ViewMode,
  monthLabels: string[],
  settings?: PeriodSettings,
): MonthlyTotal[];

export declare function patrimonioSnapshotTotal(
  entries: PatrimonioEntry[],
  snapshot: Record<string, any>,
): number;
