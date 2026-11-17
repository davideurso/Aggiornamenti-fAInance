import { participantForUser } from './shareUserAmount.js';

const list = value => Array.isArray(value) ? value : [];

export function isActiveShareActivity(activity) {
  return !!activity && activity.id != null && !activity.deleted && !activity.deletedAt &&
    !['deleted', 'cancelled', 'void'].includes(String(activity.status || '').toLowerCase());
}

export function activeShareActivities(project) {
  if (!project || project.deleted || project.deletedAt || project.status === 'deleted') return [];
  const deleted = new Set(list(project.deletedActivityIds).map(String));
  return list(project.activities).filter(activity => isActiveShareActivity(activity) && !deleted.has(String(activity.id)));
}

// Confirmed project snapshots contain the entire activity collection. Unioning
// them with an old profile cache revives removed rows and stale movement dates.
// Local deletion markers still protect pending/legacy deletions from old echoes.
export function shareProjectsForRead(cached, confirmed) {
  if (!Array.isArray(confirmed)) return list(cached);
  const local = new Map(list(cached).filter(Boolean).map(p => [String(p.id), p]));
  for (const project of confirmed) {
    if (!project) continue;
    const previous = local.get(String(project.id));
    const deletedActivityIds = [...new Set([...list(previous?.deletedActivityIds), ...list(project.deletedActivityIds)].map(String))];
    const resolved = { ...previous, ...project, deletedActivityIds };
    local.set(String(project.id), { ...resolved, activities: activeShareActivities(resolved) });
  }
  return [...local.values()];
}

export function shareCashDirection(activity, participantId) {
  if (!participantId || !activity) return null;
  if (activity.kind !== 'settlement') {
    return String(activity.paidBy ?? '') === participantId ? 'expense' : null;
  }
  const from = String(activity.from ?? ''), to = String(activity.to ?? '');
  if (!from || !to || from === to) return null;
  return from === participantId ? 'expense' : to === participantId ? 'income' : null;
}

export function shareCashMovementKey(projectId, activityId) {
  return encodeURIComponent(JSON.stringify([String(projectId), String(activityId)]));
}

export function shareCashMovementsForUser(projects, assignments, uid, currency) {
  const result = [];
  for (const project of list(projects)) {
    if (!project || project.deleted || project.deletedAt || project.status === 'deleted') continue;
    const member = participantForUser(project, uid);
    if (!member) continue;
    for (const activity of activeShareActivities(project)) {
      const id = shareCashMovementKey(project.id, activity.id);
      const link = assignments?.[id];
      const direction = shareCashDirection(activity, String(member.id));
      if (!direction || !link?.methodId || link.direction !== direction) continue;
      const baseCurrency = activity.baseCurrency || activity.currency;
      if (baseCurrency && baseCurrency !== currency) continue;
      const amount = Number(activity.baseAmount ?? activity.amount);
      if (!Number.isFinite(amount) || amount <= 0) continue;
      result.push({
        ...activity, id, amount, direction, methodId: link.methodId,
      });
    }
  }
  return result;
}
