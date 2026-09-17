import { addMonthsSafe, bulkMovementCooldownMonths } from './movementRules';

export function nextBulkMovementAllowedAt(plan: any, lastAt: any): number {
  const months = Number(bulkMovementCooldownMonths(plan) || 0);
  const last = Number(lastAt || 0);
  if (!months || !last) return 0;
  return addMonthsSafe(last, months);
}

export function isBulkMovementLocked(plan: any, lastAt: any, nowMs: any): boolean {
  const next = nextBulkMovementAllowedAt(plan, lastAt);
  const now = Number(nowMs || 0);
  return !!next && now < next;
}
