export interface ExpenseItem {
  id?: string; amount: number; date: string;
  rateizzato?: boolean; rate?: number; [key: string]: any;
}
export interface MonthlyTotal { label: string; exp: number; inc: number; value: number; }
export interface PatrimonioEntry { id: string; [key: string]: any; }
export type ViewMode = "reale" | "competenza";

export function itemAmountForMonth(item: ExpenseItem, monthKey: string): number {
  if (!item || !monthKey) return 0;
  const amount = Number(item.amount || 0);
  if (!item.rateizzato) return String(item.date || "").startsWith(monthKey) ? amount : 0;
  const rate = Number(item.rate || 0);
  if (!rate || rate < 1) return 0;
  const start = new Date(item.date);
  if (Number.isNaN(start.getTime())) return 0;
  const p = String(monthKey).split("-");
  const year = parseInt(p[0], 10); const month = parseInt(p[1], 10);
  if (!year || !month) return 0;
  const index = (year - start.getFullYear()) * 12 + (month - 1 - start.getMonth());
  if (index < 0 || index >= rate) return 0;
  return amount / rate;
}
export function totalForMonth(items: ExpenseItem[], monthKey: string, mode: ViewMode): number {
  const list = Array.isArray(items) ? items : [];
  if (mode === "reale") return list.filter(i => String(i?.date||"").startsWith(monthKey)).reduce((s,i) => s+Number(i.amount||0), 0);
  return list.reduce((s, i) => s + itemAmountForMonth(i, monthKey), 0);
}
export function last12MonthKeys(referenceDate?: string): string[] {
  const now = referenceDate ? new Date(referenceDate) : new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  return Array.from({length:12}, (_,i) => { const d = new Date(start.getFullYear(), start.getMonth()+i, 1); return d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0"); });
}
export function balanceForMonths(expenses: ExpenseItem[], incomes: ExpenseItem[], monthKeys: string[]): number {
  const keys = Array.isArray(monthKeys) ? monthKeys : [];
  return keys.reduce((s,k) => s+totalForMonth(incomes,k,"reale"), 0) - keys.reduce((s,k) => s+totalForMonth(expenses,k,"reale"), 0);
}
export function monthlyTotalsForYear(expenses: ExpenseItem[], incomes: ExpenseItem[], year: number, mode: ViewMode, monthLabels: string[]): MonthlyTotal[] {
  return Array.from({length:12}, (_,i) => {
    const key = String(year)+"-"+String(i+1).padStart(2,"0");
    const exp = totalForMonth(expenses,key,mode); const inc = totalForMonth(incomes,key,mode);
    return {label:(monthLabels||[])[i]||key.slice(5), exp, inc, value:inc-exp};
  });
}
export function patrimonioSnapshotTotal(entries: PatrimonioEntry[], snapshot: Record<string,any>): number {
  const list = Array.isArray(entries) ? entries : []; const snap = snapshot || {};
  if (snap._total !== undefined && snap._total !== null && snap._total !== "") return Number(snap._total)||0;
  return list.reduce((s,i) => s+(parseFloat(String(snap[i.id]||"").replace(",","."))||0), 0);
}
