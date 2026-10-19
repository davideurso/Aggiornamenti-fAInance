// Sort the complete collection before limiting it; never group by category.
export function homeRecentMovements<T extends { date?: unknown; id?: unknown; createdAt?: unknown }>(items: readonly T[] | null | undefined, count: number): T[] {
  const limit = Math.max(1, Math.floor(Number(count) || 5));
  return (items || []).map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const date = String(b.item.date || "").localeCompare(String(a.item.date || ""));
      if (date) return date;
      const created = String(b.item.createdAt || "").localeCompare(String(a.item.createdAt || ""));
      return created || a.index - b.index;
    })
    .slice(0, limit).map(row => row.item);
}
