// Sort the complete collection before limiting it; never group by category.
export function homeRecentMovements<T extends { date?: unknown; id?: unknown; createdAt?: unknown }>(items: readonly T[] | null | undefined, count: number, throughDate?: string): T[] {
  const limit = Math.max(1, Math.floor(Number(count) || 5));
  return (items || []).filter(item => {
    if (throughDate === undefined) return true;
    const raw = String(item.date || ""), day = raw.slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}(?:$|T)/.test(raw) || day > throughDate) return false;
    const parsed = new Date(day + "T00:00:00.000Z");
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === day;
  }).map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const date = String(b.item.date || "").localeCompare(String(a.item.date || ""));
      if (date) return date;
      const created = String(b.item.createdAt || "").localeCompare(String(a.item.createdAt || ""));
      return created || a.index - b.index;
    })
    .slice(0, limit).map(row => row.item);
}
