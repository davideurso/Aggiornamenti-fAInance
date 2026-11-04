import { activeShareActivities } from '../finance/shareCashMovements.js';

export function homeShareProjectOptions(projects) {
  return (Array.isArray(projects) ? projects : []).filter(p => p && p.id != null &&
    !p.deleted && !p.deletedAt && !['deleted', 'pending'].includes(p.status) && !p.pending);
}

// A missing saved project must never display another project's finances while
// cache/server snapshots arrive in a different order.
export function homeShareProject(projects, projectId) {
  if (projectId == null || String(projectId) === '') return null;
  return homeShareProjectOptions(projects).find(p => String(p.id) === String(projectId)) || null;
}

export function homeShareActivities(project, count) {
  return activeShareActivities(project).slice().sort((a,b) =>
    String(b.date || '').localeCompare(String(a.date || '')) ||
    String(b.time || '').localeCompare(String(a.time || '')) ||
    String(a.id).localeCompare(String(b.id))
  ).slice(0,Math.max(1,Number(count)||5));
}
