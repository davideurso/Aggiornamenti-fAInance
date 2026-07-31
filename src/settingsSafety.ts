export const SETTINGS_SYNC_SCHEMA_VERSION = 10;

type SettingStamp = {
  value: any;
  updatedAtMs: number;
  deviceId: string;
  explicitReset?: boolean;
};

export type SettingsEnvelope = {
  schema: number;
  initialized: true;
  revision: number;
  updatedAtMs: number;
  deviceId: string;
  entries: Record<string, SettingStamp>;
  checksum: string;
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

function stableStringify(value: any): string {
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

function withoutChecksum(value: any): any {
  if (!value || typeof value !== "object") return value;
  const { checksum, ...rest } = value;
  return rest;
}

export function settingsEnvelopeChecksum(value: any): string {
  return hashString(stableStringify(withoutChecksum(value)));
}

function finalize(input: Omit<SettingsEnvelope, "checksum">): SettingsEnvelope {
  const envelope = {
    ...input,
    schema: SETTINGS_SYNC_SCHEMA_VERSION,
    initialized: true as const,
    revision: Math.max(1, Number(input.revision || 1)),
    updatedAtMs: Math.max(1, finiteTime(input.updatedAtMs) || Date.now()),
    deviceId: String(input.deviceId || "unknown"),
    entries: input.entries && typeof input.entries === "object" ? input.entries : {},
  } as SettingsEnvelope;
  envelope.checksum = settingsEnvelopeChecksum(envelope);
  return envelope;
}

export function isValidSettingsEnvelope(value: any): value is SettingsEnvelope {
  if (!value || typeof value !== "object") return false;
  if (Number(value.schema || 0) !== SETTINGS_SYNC_SCHEMA_VERSION) return false;
  if (!value.entries || typeof value.entries !== "object" || Array.isArray(value.entries)) return false;
  if (value.checksum && value.checksum !== settingsEnvelopeChecksum(value)) return false;
  return true;
}

function isDefaultValue(value: any, defaultValue: any): boolean {
  return stableStringify(value) === stableStringify(defaultValue);
}

function compareStamp(a: SettingStamp | undefined, b: SettingStamp | undefined): number {
  const at = finiteTime(a && a.updatedAtMs);
  const bt = finiteTime(b && b.updatedAtMs);
  if (at !== bt) return at - bt;
  return String((a && a.deviceId) || "").localeCompare(String((b && b.deviceId) || ""));
}

export function materializeSettingsEnvelope(envelope: SettingsEnvelope | null | undefined): Record<string, any> {
  if (!isValidSettingsEnvelope(envelope)) return {};
  const out: Record<string, any> = {};
  Object.keys(envelope.entries).forEach((key) => {
    out[key] = stableClone(envelope.entries[key].value);
  });
  return out;
}

export function createLegacySettingsEnvelope(options: {
  data: Record<string, any>;
  defaults: Record<string, any>;
  updatedAtMs?: number;
  updatedAtByField?: Record<string, number>;
  deviceId: string;
}): SettingsEnvelope {
  const now = finiteTime(options.updatedAtMs) || Date.now();
  const entries: Record<string, SettingStamp> = {};
  Object.keys(options.defaults || {}).forEach((key) => {
    const hasValue = Object.prototype.hasOwnProperty.call(options.data || {}, key);
    const value = hasValue ? options.data[key] : options.defaults[key];
    entries[key] = {
      value: stableClone(value),
      updatedAtMs: finiteTime(options.updatedAtByField && options.updatedAtByField[key]) || now,
      deviceId: String(options.deviceId || "legacy"),
    };
  });
  return finalize({
    schema: SETTINGS_SYNC_SCHEMA_VERSION,
    initialized: true,
    revision: 1,
    updatedAtMs: Math.max(now, ...Object.values(entries).map((entry) => entry.updatedAtMs)),
    deviceId: String(options.deviceId || "legacy"),
    entries,
  });
}

export function migrateLegacySettingsSafely(options: {
  localData: Record<string, any>;
  cloudData: Record<string, any>;
  defaults: Record<string, any>;
  localUpdatedAtByField?: Record<string, number>;
  cloudUpdatedAtByField?: Record<string, number>;
  deviceId: string;
}): SettingsEnvelope {
  const entries: Record<string, SettingStamp> = {};
  const now = Date.now();
  Object.keys(options.defaults || {}).forEach((key) => {
    const localHas = Object.prototype.hasOwnProperty.call(options.localData || {}, key);
    const cloudHas = Object.prototype.hasOwnProperty.call(options.cloudData || {}, key);
    const localValue = localHas ? options.localData[key] : options.defaults[key];
    const cloudValue = cloudHas ? options.cloudData[key] : options.defaults[key];
    const localCustom = !isDefaultValue(localValue, options.defaults[key]);
    const cloudCustom = !isDefaultValue(cloudValue, options.defaults[key]);
    const localTs = finiteTime(options.localUpdatedAtByField && options.localUpdatedAtByField[key]);
    const cloudTs = finiteTime(options.cloudUpdatedAtByField && options.cloudUpdatedAtByField[key]);
    let useLocal = false;
    if (localCustom && !cloudCustom) useLocal = true;
    else if (cloudCustom && !localCustom) useLocal = false;
    else if (!cloudHas && localHas) useLocal = true;
    else if (cloudHas && !localHas) useLocal = false;
    else useLocal = localTs >= cloudTs;
    entries[key] = {
      value: stableClone(useLocal ? localValue : cloudValue),
      updatedAtMs: Math.max(1, useLocal ? localTs || now : cloudTs || now),
      deviceId: useLocal ? String(options.deviceId || "local-legacy") : "cloud-legacy",
    };
  });
  return finalize({
    schema: SETTINGS_SYNC_SCHEMA_VERSION,
    initialized: true,
    revision: 1,
    updatedAtMs: Math.max(now, ...Object.values(entries).map((entry) => entry.updatedAtMs)),
    deviceId: String(options.deviceId || "legacy-merge"),
    entries,
  });
}

export function mergeSettingsEnvelopes(
  localEnvelope: SettingsEnvelope | null | undefined,
  cloudEnvelope: SettingsEnvelope | null | undefined,
  defaults: Record<string, any>,
): SettingsEnvelope | null {
  const local = isValidSettingsEnvelope(localEnvelope) ? localEnvelope : null;
  const cloud = isValidSettingsEnvelope(cloudEnvelope) ? cloudEnvelope : null;
  if (!local && !cloud) return null;
  if (!local) return finalize(withoutChecksum(cloud) as Omit<SettingsEnvelope, "checksum">);
  if (!cloud) return finalize(withoutChecksum(local) as Omit<SettingsEnvelope, "checksum">);
  const entries: Record<string, SettingStamp> = {};
  const keys = new Set([...Object.keys(defaults || {}), ...Object.keys(local.entries), ...Object.keys(cloud.entries)]);
  keys.forEach((key) => {
    const l = local.entries[key];
    const c = cloud.entries[key];
    if (!l) {
      if (c) entries[key] = stableClone(c);
      return;
    }
    if (!c) {
      entries[key] = stableClone(l);
      return;
    }
    let chosen = compareStamp(l, c) >= 0 ? l : c;
    const other = chosen === l ? c : l;
    const defaultValue = defaults[key];
    const chosenIsDefault = isDefaultValue(chosen.value, defaultValue);
    const otherIsCustom = !isDefaultValue(other.value, defaultValue);
    // A default value cannot wipe a customized value unless that reset was
    // explicitly produced by a user action on a v10 client.
    if (chosenIsDefault && otherIsCustom && !chosen.explicitReset) chosen = other;
    entries[key] = stableClone(chosen);
  });
  const merged = finalize({
    schema: SETTINGS_SYNC_SCHEMA_VERSION,
    initialized: true,
    revision: Math.max(Number(local.revision || 0), Number(cloud.revision || 0)),
    updatedAtMs: Math.max(local.updatedAtMs, cloud.updatedAtMs),
    deviceId: cloud.updatedAtMs > local.updatedAtMs ? cloud.deviceId : local.deviceId,
    entries,
  });
  return merged;
}

export function updateSettingsEnvelope(options: {
  previous: SettingsEnvelope | null | undefined;
  data: Record<string, any>;
  defaults: Record<string, any>;
  deviceId: string;
  now?: number;
  allowBulkReset?: boolean;
  explicitResetKeys?: string[];
}): { envelope: SettingsEnvelope; blocked: boolean; reason?: string } {
  const now = finiteTime(options.now) || Date.now();
  const previous = isValidSettingsEnvelope(options.previous)
    ? options.previous
    : createLegacySettingsEnvelope({ data: options.data, defaults: options.defaults, updatedAtMs: now, deviceId: options.deviceId });
  const entries: Record<string, SettingStamp> = { ...previous.entries };
  let changedCount = 0;
  let customToDefaultCount = 0;
  const explicitResetKeys = new Set((options.explicitResetKeys || []).map(String));
  const unauthorizedResetKeys: string[] = [];
  Object.keys(options.defaults || {}).forEach((key) => {
    const nextValue = Object.prototype.hasOwnProperty.call(options.data || {}, key)
      ? options.data[key]
      : options.defaults[key];
    const old = previous.entries[key];
    if (old && stableStringify(old.value) === stableStringify(nextValue)) return;
    changedCount += 1;
    const isResetToDefault = !!old && !isDefaultValue(old.value, options.defaults[key]) && isDefaultValue(nextValue, options.defaults[key]);
    const explicitReset = isResetToDefault && (options.allowBulkReset || explicitResetKeys.has(String(key)));
    if (isResetToDefault) {
      customToDefaultCount += 1;
      if (!explicitReset) unauthorizedResetKeys.push(String(key));
    }
    entries[key] = {
      value: stableClone(nextValue),
      updatedAtMs: now,
      deviceId: String(options.deviceId || "device"),
      explicitReset,
    };
  });
  if (!options.allowBulkReset && unauthorizedResetKeys.length > 0) {
    return {
      envelope: previous,
      blocked: true,
      reason: `Blocked non-explicit settings reset (${unauthorizedResetKeys.join(", ")}).`,
    };
  }
  if (!options.allowBulkReset && customToDefaultCount > 2) {
    return {
      envelope: previous,
      blocked: true,
      reason: `Blocked settings reset (${customToDefaultCount} customized fields).`,
    };
  }
  return {
    blocked: false,
    envelope: finalize({
      schema: SETTINGS_SYNC_SCHEMA_VERSION,
      initialized: true,
      revision: Number(previous.revision || 0) + (changedCount ? 1 : 0),
      updatedAtMs: changedCount ? now : previous.updatedAtMs,
      deviceId: String(options.deviceId || "device"),
      entries,
    }),
  };
}

export function readSettingsEnvelope(raw: any): SettingsEnvelope | null {
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (_error) {
      return null;
    }
  }
  return isValidSettingsEnvelope(parsed) ? parsed : null;
}
