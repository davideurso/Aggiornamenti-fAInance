// Backups supplement an already selected account catalog; they are not account data.
export function needsCategoryBackup(categories: any[], expenses: any[], isRecovered: (category: any) => boolean) {
  if (categories.some(isRecovered)) return true;
  const ids = new Set(categories.filter(Boolean).map(category => String(category.id)));
  return expenses.some(row => row && row.catId !== undefined && row.catId !== null &&
    String(row.catId) !== '' && !ids.has(String(row.catId)));
}

export async function readOptionalCategoryBackups(
  needed: boolean,
  read: (signal: AbortSignal) => Promise<any[]>,
  timeoutMs = 1200,
): Promise<any[]> {
  if (!needed) return [];
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const deadline = new Promise<any[]>(resolve => {
      timer = setTimeout(() => { controller.abort(); resolve([]); }, timeoutMs);
    });
    const result = Promise.resolve().then(() => read(controller.signal)).catch(() => []);
    return await Promise.race([deadline, result]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
    controller.abort();
  }
}
