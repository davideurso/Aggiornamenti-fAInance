export function participantForUser(project, userId) {
  if (!userId) return null;
  const rows = Array.isArray(project?.participants) ? project.participants : [];
  const matches = rows.filter(row => String(row?.uid || '') === String(userId));
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return null;
  if (String(project?.ownerUid || '') !== String(userId)) return null;
  return rows.find(row => row?.role === 'owner' || String(row?.id) === 'me') || null;
}

export function shareAmountForUser(project, activity, userId) {
  const participant = participantForUser(project, userId);
  if (!participant || !activity || activity.kind === 'settlement') return 0;
  const id = String(participant.id);
  const shares = activity.shares;
  if (shares && typeof shares === 'object' && Object.keys(shares).length) {
    const amount = Number(shares[id]);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }
  const ids = Array.isArray(activity.sharedWith) && activity.sharedWith.length
    ? activity.sharedWith.map(String)
    : (project.participants || []).filter(row => row.status !== 'archived').map(row => String(row.id));
  if (!ids.includes(id)) return 0;
  const amount = Number(activity.baseAmount ?? activity.amount);
  return Number.isFinite(amount) && amount > 0 ? amount / ids.length : 0;
}
