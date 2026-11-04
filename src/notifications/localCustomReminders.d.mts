export interface LocalCustomReminder {
  id: string;
  targetUid?: string;
  type: 'custom_reminder' | 'salary_reminder';
  title: string;
  message: string;
  createdAt: string;
  createdAtMs: number;
  severity: string;
  source: 'local_custom';
  read: boolean;
}
export function monthEndDay(year: number, monthIndex: number): number;
export function salaryDayInMonth(value: unknown, year: number, monthIndex: number): number;
export function dueCustomReminders(records: unknown[], timestamp?: number, withinMinutes?: number): LocalCustomReminder[];
export function dueSalaryReminder(prefs: Record<string, any>, timestamp?: number, withinMinutes?: number): LocalCustomReminder[];
export function readLocalReminders(userId: string): LocalCustomReminder[];
export function collectDueLocalReminders(userId: string, records: unknown[], timestamp?: number, prefs?: Record<string, any>): LocalCustomReminder[];
export function markLocalReminderRead(userId: string, id: string): void;
export function markAllLocalRemindersRead(userId: string): void;
export function removeLocalReminder(userId: string, id: string): void;
export function clearLocalReminders(userId: string): void;
