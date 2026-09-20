export type MovementKind = "expense" | "income";

export type MovementDiffEntry = {
  kind: MovementKind;
  recordId: string;
  deleted: boolean;
  payload: any | null;
};

function stableStringify(value: any): string {
  if (value === null || value === undefined) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (typeof value !== "object") return JSON.stringify(value);
  const keys = Object.keys(value).sort();
  return `{${keys.map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
}

function hash(value: string): string {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

export function movementRawId(kind: MovementKind, item: any): string {
  if (!item || typeof item !== "object") return "";
  const explicit = item.id !== undefined && item.id !== null && String(item.id)
    ? String(item.id)
    : item.syncRecordId
      ? String(item.syncRecordId)
      : item.uuid
        ? String(item.uuid)
        : "";
  if (explicit) return explicit;

  // Legacy records did not always have an id. Use a deterministic fallback so
  // the same old movement can never receive a different V2 document after a
  // restart or during migration.
  const identity = {
    kind,
    date: item.date ?? item.data ?? "",
    amount: item.amount ?? item.importo ?? "",
    description: item.description ?? item.desc ?? item.title ?? item.name ?? "",
    createdAt: item.createdAt ?? item.created_at ?? "",
    type: item.type ?? item.tipo ?? "",
    categoryId: item.categoryId ?? item.catId ?? item.category ?? "",
    methodId: item.methodId ?? item.paymentMethodId ?? item.method ?? "",
    original: item,
  };
  return `legacy_${hash(stableStringify(identity))}`;
}

export function movementRecordId(kind: MovementKind, item: any): string {
  const raw = movementRawId(kind, item);
  return raw ? `${kind}:${raw}` : "";
}

export function ensureStableMovementIds(kind: MovementKind, value: any[]): any[] {
  const source = Array.isArray(value) ? value : [];
  return source.map((item) => {
    if (!item || typeof item !== "object") return item;
    if (item.id !== undefined && item.id !== null && String(item.id)) return item;
    const id = movementRawId(kind, item);
    return id ? { ...item, id } : item;
  });
}

function comparable(value: any): string {
  try {
    const clone = value && typeof value === "object" ? { ...value } : value;
    if (clone && typeof clone === "object") {
      delete clone.syncUpdatedAtMs;
      delete clone.updatedAtMs;
    }
    return stableStringify(clone);
  } catch (_error) {
    return "";
  }
}

export function buildMovementDiffV2(
  kind: MovementKind,
  currentValue: any[],
  nextValue: any[],
): MovementDiffEntry[] {
  const current = ensureStableMovementIds(kind, currentValue);
  const next = ensureStableMovementIds(kind, nextValue);
  const before: Record<string, any> = {};
  const after: Record<string, any> = {};

  current.forEach((item) => {
    const id = movementRecordId(kind, item);
    if (id) before[id] = item;
  });
  next.forEach((item) => {
    const id = movementRecordId(kind, item);
    if (id) after[id] = item;
  });

  const diff: MovementDiffEntry[] = [];
  Object.keys(after).forEach((id) => {
    if (before[id] && comparable(before[id]) === comparable(after[id])) return;
    diff.push({ kind, recordId: id, deleted: false, payload: after[id] });
  });
  Object.keys(before).forEach((id) => {
    if (!after[id]) diff.push({ kind, recordId: id, deleted: true, payload: null });
  });
  return diff;
}
