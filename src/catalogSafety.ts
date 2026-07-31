export const CATALOG_SYNC_SCHEMA_VERSION = 10;

export type CatalogKind = "expense" | "payment" | "income";

type Stamp = { updatedAtMs: number; deviceId: string; value: any; explicitReset?: boolean };
type Tombstone = { deletedAtMs: number; deviceId: string; explicit: true };
type CollectionEnvelope = {
  entries: Record<string, Stamp>;
  tombstones: Record<string, Tombstone>;
  order: string[];
};

export type CatalogEnvelope = {
  schema: number;
  kind: CatalogKind;
  initialized: true;
  revision: number;
  updatedAtMs: number;
  deviceId: string;
  collections: Record<string, CollectionEnvelope>;
  checksum: string;
};

export type CatalogUpdateResult = {
  envelope: CatalogEnvelope;
  blocked: boolean;
  reason?: string;
};

const COLLECTIONS: Record<CatalogKind, string[]> = {
  expense: ["categories", "groups"],
  payment: ["methods", "groups"],
  income: ["groups", "customTypes", "overrides"],
};

function finiteTime(value: any): number {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function stableClone(value: any): any {
  if (Array.isArray(value)) return value.map(stableClone);
  if (value && typeof value === "object") {
    const out: any = {};
    Object.keys(value)
      .sort()
      .forEach((key) => {
        if (value[key] !== undefined) out[key] = stableClone(value[key]);
      });
    return out;
  }
  return value;
}

export function catalogStableStringify(value: any): string {
  return JSON.stringify(stableClone(value));
}

function hashString(value: string): string {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function envelopeWithoutChecksum(envelope: any): any {
  if (!envelope || typeof envelope !== "object") return envelope;
  const { checksum, ...rest } = envelope;
  return rest;
}

export function catalogEnvelopeChecksum(envelope: any): string {
  return hashString(catalogStableStringify(envelopeWithoutChecksum(envelope)));
}

function emptyCollection(): CollectionEnvelope {
  return { entries: {}, tombstones: {}, order: [] };
}

function itemId(item: any): string {
  if (!item || typeof item !== "object" || item.id === undefined || item.id === null) return "";
  return String(item.id);
}

function objectToItems(value: any): any[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.keys(value).map((id) => ({ id, ...value[id] }));
}

function itemsToObject(items: any[]): Record<string, any> {
  const out: Record<string, any> = {};
  items.forEach((item) => {
    const id = itemId(item);
    if (!id) return;
    const { id: _id, ...value } = item;
    out[id] = value;
  });
  return out;
}

function dataCollection(kind: CatalogKind, data: any, name: string): any[] {
  const value = data && data[name];
  if (kind === "income" && name === "overrides") return objectToItems(value);
  return Array.isArray(value) ? value.filter((item) => item && typeof item === "object") : [];
}

function compareStamp(a: any, b: any): number {
  const at = finiteTime(a && (a.updatedAtMs || a.deletedAtMs));
  const bt = finiteTime(b && (b.updatedAtMs || b.deletedAtMs));
  if (at !== bt) return at - bt;
  const ad = String((a && a.deviceId) || "");
  const bd = String((b && b.deviceId) || "");
  return ad.localeCompare(bd);
}

function newest<T>(a: T | undefined, b: T | undefined): T | undefined {
  if (!a) return b;
  if (!b) return a;
  return compareStamp(a, b) >= 0 ? a : b;
}

function normalizeOrder(order: any, entries: Record<string, Stamp>): string[] {
  const seen: Record<string, boolean> = {};
  const out: string[] = [];
  (Array.isArray(order) ? order : []).forEach((id) => {
    const key = String(id);
    if (entries[key] && !seen[key]) {
      seen[key] = true;
      out.push(key);
    }
  });
  Object.keys(entries)
    .sort()
    .forEach((key) => {
      if (!seen[key]) out.push(key);
    });
  return out;
}

function finalizeEnvelope(input: Omit<CatalogEnvelope, "checksum">): CatalogEnvelope {
  const normalized: Omit<CatalogEnvelope, "checksum"> = {
    ...input,
    schema: CATALOG_SYNC_SCHEMA_VERSION,
    initialized: true,
    revision: Math.max(1, Number(input.revision || 1)),
    updatedAtMs: Math.max(1, finiteTime(input.updatedAtMs) || Date.now()),
    deviceId: String(input.deviceId || "unknown"),
    collections: {},
  };
  COLLECTIONS[input.kind].forEach((name) => {
    const source = input.collections && input.collections[name] ? input.collections[name] : emptyCollection();
    const entries = source.entries && typeof source.entries === "object" ? source.entries : {};
    const tombstones = source.tombstones && typeof source.tombstones === "object" ? source.tombstones : {};
    normalized.collections[name] = {
      entries,
      tombstones,
      order: normalizeOrder(source.order, entries),
    };
  });
  const envelope = normalized as CatalogEnvelope;
  envelope.checksum = catalogEnvelopeChecksum(envelope);
  return envelope;
}

export function isValidCatalogEnvelope(value: any, expectedKind?: CatalogKind): value is CatalogEnvelope {
  if (!value || typeof value !== "object") return false;
  if (Number(value.schema || 0) !== CATALOG_SYNC_SCHEMA_VERSION) return false;
  if (expectedKind && value.kind !== expectedKind) return false;
  if (!COLLECTIONS[value.kind as CatalogKind]) return false;
  if (!value.collections || typeof value.collections !== "object") return false;
  for (const name of COLLECTIONS[value.kind as CatalogKind]) {
    const collection = value.collections[name];
    if (!collection || typeof collection !== "object") return false;
    if (!collection.entries || typeof collection.entries !== "object") return false;
    if (!collection.tombstones || typeof collection.tombstones !== "object") return false;
    if (!Array.isArray(collection.order)) return false;
  }
  if (value.checksum && value.checksum !== catalogEnvelopeChecksum(value)) return false;
  return true;
}

export function materializeCatalogEnvelope(envelope: CatalogEnvelope): any {
  if (!isValidCatalogEnvelope(envelope)) return null;
  const data: any = {};
  COLLECTIONS[envelope.kind].forEach((name) => {
    const collection = envelope.collections[name];
    const entries: Record<string, Stamp> = {};
    Object.keys(collection.entries).forEach((id) => {
      const entry = collection.entries[id];
      const tombstone = collection.tombstones[id];
      if (!tombstone || compareStamp(entry, tombstone) > 0) entries[id] = entry;
    });
    const items = normalizeOrder(collection.order, entries).map((id) => stableClone(entries[id].value));
    data[name] = envelope.kind === "income" && name === "overrides" ? itemsToObject(items) : items;
  });
  return data;
}

export function createLegacyCatalogEnvelope(
  kind: CatalogKind,
  data: any,
  updatedAtMs: number,
  deviceId: string,
  options?: {
    defaultData?: any;
    protectMissingDefaults?: boolean;
    missingDefaultsTimestampMs?: number;
  },
): CatalogEnvelope {
  const when = finiteTime(updatedAtMs) || Date.now();
  const collections: Record<string, CollectionEnvelope> = {};
  COLLECTIONS[kind].forEach((name) => {
    const entries: Record<string, Stamp> = {};
    const order: string[] = [];
    dataCollection(kind, data, name).forEach((item) => {
      const id = itemId(item);
      if (!id || entries[id]) return;
      entries[id] = { value: stableClone(item), updatedAtMs: when, deviceId: String(deviceId || "legacy") };
      order.push(id);
    });
    const tombstones: Record<string, Tombstone> = {};
    if (options && options.protectMissingDefaults) {
      const deletedAtMs = finiteTime(options.missingDefaultsTimestampMs) || when;
      dataCollection(kind, options.defaultData || {}, name).forEach((defaultItem) => {
        const id = itemId(defaultItem);
        if (!id || entries[id]) return;
        tombstones[id] = { deletedAtMs, deviceId: String(deviceId || "legacy"), explicit: true };
      });
    }
    collections[name] = { entries, tombstones, order };
  });
  return finalizeEnvelope({
    schema: CATALOG_SYNC_SCHEMA_VERSION,
    kind,
    initialized: true,
    revision: 1,
    updatedAtMs: when,
    deviceId: String(deviceId || "legacy"),
    collections,
  });
}

export function migrateLegacyCatalogsSafely(options: {
  kind: CatalogKind;
  localData: any;
  cloudData: any;
  localPresent: boolean;
  cloudPresent: boolean;
  localUpdatedAtMs?: number;
  cloudUpdatedAtMs?: number;
  deviceId: string;
  defaultData?: any;
  protectLocalMissingDefaults?: boolean;
  isDefaultValue?: (collection: string, id: string, value: any) => boolean;
}): CatalogEnvelope {
  const { kind, localPresent, cloudPresent } = options;
  const localWhen = finiteTime(options.localUpdatedAtMs) || Date.now();
  const cloudWhen = finiteTime(options.cloudUpdatedAtMs) || Date.now();
  const localEnvelope = localPresent
    ? createLegacyCatalogEnvelope(kind, options.localData, localWhen, options.deviceId, {
        defaultData: options.defaultData,
        protectMissingDefaults: !!options.protectLocalMissingDefaults,
        // During the one-time migration, an existing local catalog is the only
        // reliable evidence that a built-in item was intentionally removed.
        // Stamp these absences after the legacy snapshots so a newer default
        // snapshot cannot silently re-add them.
        missingDefaultsTimestampMs: Math.max(localWhen, cloudWhen, Date.now()),
      })
    : null;
  const cloudEnvelope = cloudPresent
    ? createLegacyCatalogEnvelope(kind, options.cloudData, cloudWhen, "cloud-legacy")
    : null;
  const merged = mergeCatalogEnvelopes(localEnvelope, cloudEnvelope, kind, options.isDefaultValue);
  if (merged) return merged;
  return createLegacyCatalogEnvelope(kind, options.defaultData || {}, Date.now(), options.deviceId);
}

export function mergeCatalogEnvelopes(
  localEnvelope: CatalogEnvelope | null | undefined,
  cloudEnvelope: CatalogEnvelope | null | undefined,
  kind: CatalogKind,
  isDefaultValue?: (collection: string, id: string, value: any) => boolean,
): CatalogEnvelope | null {
  const local = isValidCatalogEnvelope(localEnvelope, kind) ? localEnvelope : null;
  const cloud = isValidCatalogEnvelope(cloudEnvelope, kind) ? cloudEnvelope : null;
  if (!local && !cloud) return null;
  if (!local) return finalizeEnvelope(envelopeWithoutChecksum(cloud) as Omit<CatalogEnvelope, "checksum">);
  if (!cloud) return finalizeEnvelope(envelopeWithoutChecksum(local) as Omit<CatalogEnvelope, "checksum">);

  const collections: Record<string, CollectionEnvelope> = {};
  COLLECTIONS[kind].forEach((name) => {
    const lc = local.collections[name] || emptyCollection();
    const cc = cloud.collections[name] || emptyCollection();
    const entries: Record<string, Stamp> = {};
    const tombstones: Record<string, Tombstone> = {};
    const ids = new Set([
      ...Object.keys(lc.entries || {}),
      ...Object.keys(cc.entries || {}),
      ...Object.keys(lc.tombstones || {}),
      ...Object.keys(cc.tombstones || {}),
    ]);
    ids.forEach((id) => {
      const localEntry = lc.entries[id];
      const cloudEntry = cc.entries[id];
      let entry = newest(localEntry, cloudEntry);
      const otherEntry = entry === localEntry ? cloudEntry : localEntry;
      // A newer default value must never erase a customized value unless the
      // v10 client explicitly recorded that reset. This is the key migration
      // guard against legacy/default snapshots with a newer document date.
      if (entry && otherEntry && isDefaultValue) {
        const chosenIsDefault = isDefaultValue(name, id, entry.value);
        const otherIsCustom = !isDefaultValue(name, id, otherEntry.value);
        if (chosenIsDefault && otherIsCustom && !entry.explicitReset) entry = otherEntry;
      }
      const tombstone = newest(lc.tombstones[id], cc.tombstones[id]);
      if (entry && (!tombstone || compareStamp(entry, tombstone) > 0)) entries[id] = stableClone(entry);
      if (tombstone && (!entry || compareStamp(tombstone, entry) >= 0)) tombstones[id] = stableClone(tombstone);
    });
    const preferred = cloud.updatedAtMs > local.updatedAtMs ? cc.order : lc.order;
    const secondary = cloud.updatedAtMs > local.updatedAtMs ? lc.order : cc.order;
    collections[name] = {
      entries,
      tombstones,
      order: normalizeOrder([...(preferred || []), ...(secondary || [])], entries),
    };
  });

  return finalizeEnvelope({
    schema: CATALOG_SYNC_SCHEMA_VERSION,
    kind,
    initialized: true,
    revision: Math.max(Number(local.revision || 0), Number(cloud.revision || 0)),
    updatedAtMs: Math.max(local.updatedAtMs, cloud.updatedAtMs),
    deviceId: cloud.updatedAtMs > local.updatedAtMs ? cloud.deviceId : local.deviceId,
    collections,
  });
}

export function updateCatalogEnvelope(options: {
  previous: CatalogEnvelope | null | undefined;
  kind: CatalogKind;
  data: any;
  now?: number;
  deviceId: string;
  isDefaultValue?: (collection: string, id: string, value: any) => boolean;
  allowBulkReset?: boolean;
  allowDestructiveReset?: boolean;
}): CatalogUpdateResult {
  const now = finiteTime(options.now) || Date.now();
  const previous = isValidCatalogEnvelope(options.previous, options.kind)
    ? options.previous
    : createLegacyCatalogEnvelope(options.kind, {}, now, options.deviceId);
  const collections: Record<string, CollectionEnvelope> = {};
  let resetCount = 0;
  let changedCount = 0;
  let previousNonDefaultCount = 0;
  let incomingNonDefaultCount = 0;
  let removedNonDefaultCount = 0;
  let removedCount = 0;
  let restoredTombstoneCount = 0;

  COLLECTIONS[options.kind].forEach((name) => {
    const prev = previous.collections[name] || emptyCollection();
    const entries: Record<string, Stamp> = { ...prev.entries };
    const tombstones: Record<string, Tombstone> = { ...prev.tombstones };
    const incoming = dataCollection(options.kind, options.data, name);
    const present: Record<string, boolean> = {};
    Object.keys(prev.entries).forEach((id) => {
      const value = prev.entries[id] && prev.entries[id].value;
      const isDefault = options.isDefaultValue ? options.isDefaultValue(name, id, value) : false;
      if (!isDefault) previousNonDefaultCount += 1;
    });
    const order: string[] = [];

    incoming.forEach((item) => {
      const id = itemId(item);
      if (!id || present[id]) return;
      present[id] = true;
      order.push(id);
      const old = prev.entries[id];
      const incomingIsDefault = options.isDefaultValue ? options.isDefaultValue(name, id, item) : false;
      if (!incomingIsDefault) incomingNonDefaultCount += 1;
      if (!old && prev.tombstones[id] && incomingIsDefault) restoredTombstoneCount += 1;
      if (old && catalogStableStringify(old.value) === catalogStableStringify(item)) {
        entries[id] = old;
        if (tombstones[id] && compareStamp(old, tombstones[id]) > 0) delete tombstones[id];
        return;
      }
      changedCount += 1;
      const wasDefault = options.isDefaultValue ? options.isDefaultValue(name, id, old && old.value) : false;
      const isDefault = incomingIsDefault;
      const explicitReset = !!old && !wasDefault && isDefault;
      if (explicitReset) resetCount += 1;
      entries[id] = {
        value: stableClone(item),
        updatedAtMs: now,
        deviceId: String(options.deviceId || "device"),
        explicitReset,
      };
      delete tombstones[id];
    });

    Object.keys(prev.entries).forEach((id) => {
      if (present[id]) return;
      const removedValue = prev.entries[id] && prev.entries[id].value;
      const removedWasDefault = options.isDefaultValue ? options.isDefaultValue(name, id, removedValue) : false;
      removedCount += 1;
      if (!removedWasDefault) removedNonDefaultCount += 1;
      changedCount += 1;
      tombstones[id] = {
        deletedAtMs: now,
        deviceId: String(options.deviceId || "device"),
        explicit: true,
      };
      delete entries[id];
    });

    collections[name] = { entries, tombstones, order: normalizeOrder(order, entries) };
  });

  const destructiveCount = resetCount + removedCount + restoredTombstoneCount;
  const looksLikeWholeDefaultReset =
    changedCount > 0 &&
    incomingNonDefaultCount === 0 &&
    (previousNonDefaultCount > 0 || restoredTombstoneCount > 0);
  const massDestructiveChange =
    destructiveCount > 2 &&
    destructiveCount >= Math.max(3, Math.ceil(previousNonDefaultCount * 0.4));

  if (
    !options.allowBulkReset &&
    !options.allowDestructiveReset &&
    (destructiveCount > 0 || looksLikeWholeDefaultReset || massDestructiveChange)
  ) {
    return {
      envelope: previous,
      blocked: true,
      reason: `Blocked destructive catalog reset (${destructiveCount} protected values).`,
    };
  }

  const envelope = finalizeEnvelope({
    schema: CATALOG_SYNC_SCHEMA_VERSION,
    kind: options.kind,
    initialized: true,
    revision: Number(previous.revision || 0) + (changedCount > 0 ? 1 : 0),
    updatedAtMs: changedCount > 0 ? now : previous.updatedAtMs,
    deviceId: String(options.deviceId || "device"),
    collections,
  });
  return { envelope, blocked: false };
}

export function catalogEnvelopeHasUnsafeLoss(previous: CatalogEnvelope | null | undefined, next: CatalogEnvelope | null | undefined): boolean {
  if (!isValidCatalogEnvelope(previous) || !isValidCatalogEnvelope(next, previous.kind)) return true;
  for (const name of COLLECTIONS[previous.kind]) {
    const before = previous.collections[name];
    const after = next.collections[name];
    for (const id of Object.keys(before.entries)) {
      if (after.entries[id]) continue;
      const tombstone = after.tombstones[id];
      if (!tombstone || compareStamp(tombstone, before.entries[id]) < 0) return true;
    }
  }
  return false;
}

export function readCatalogEnvelope(raw: any, kind: CatalogKind): CatalogEnvelope | null {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }
  return isValidCatalogEnvelope(parsed, kind) ? parsed : null;
}
