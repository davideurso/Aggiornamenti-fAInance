export const AUTOMATIC_RULE_SYNC_SCHEMA_VERSION = 1;

const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const positiveTimestamp = value => {
  const n = Number(value || 0);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};
const jsonEqual = (a, b) => {
  try { return JSON.stringify(a) === JSON.stringify(b); } catch (_error) { return false; }
};
const automaticRules = finance => Array.isArray(finance?.rules)
  ? finance.rules.filter(rule => rule && rule.kind === 'automatic-v1' && typeof rule.id === 'string' && rule.id)
  : [];
const byId = rows => new Map(rows.map(row => [row.id, row]));
const ruleRevision = rule => Number.isSafeInteger(rule?.revision) && rule.revision >= 0 ? rule.revision : -1;

function readMeta(finance) {
  const raw = isRecord(finance?.automaticRulesSyncV1) ? finance.automaticRulesSyncV1 : {};
  const updatedRaw = isRecord(raw.updatedAtById) ? raw.updatedAtById : {};
  const deletedRaw = isRecord(raw.deletedAtById) ? raw.deletedAtById : {};
  const updatedAtById = {};
  const deletedAtById = {};
  for (const [id, value] of Object.entries(updatedRaw)) {
    const ts = positiveTimestamp(value);
    if (id && ts) updatedAtById[id] = ts;
  }
  for (const [id, value] of Object.entries(deletedRaw)) {
    const ts = positiveTimestamp(value);
    if (id && ts) deletedAtById[id] = ts;
  }
  return { updatedAtById, deletedAtById };
}

function writeMeta(finance, meta) {
  return {
    ...finance,
    automaticRulesSyncV1: {
      schemaVersion: AUTOMATIC_RULE_SYNC_SCHEMA_VERSION,
      updatedAtById: meta.updatedAtById,
      deletedAtById: meta.deletedAtById,
    },
  };
}

export function trackAutomaticRuleLocalChange(previousFinance, nextFinance, timestamp = Date.now()) {
  if (!isRecord(nextFinance)) return nextFinance;
  const now = positiveTimestamp(timestamp) || Date.now();
  const previous = byId(automaticRules(previousFinance));
  const next = byId(automaticRules(nextFinance));
  const previousMeta = readMeta(previousFinance);
  const nextMeta = readMeta(nextFinance);
  const updatedAtById = { ...previousMeta.updatedAtById, ...nextMeta.updatedAtById };
  const deletedAtById = { ...previousMeta.deletedAtById, ...nextMeta.deletedAtById };
  const ids = new Set([...previous.keys(), ...next.keys()]);

  for (const id of ids) {
    const before = previous.get(id);
    const after = next.get(id);
    if (before && !after) {
      deletedAtById[id] = now;
      delete updatedAtById[id];
      continue;
    }
    if (after && (!before || !jsonEqual(before, after))) {
      updatedAtById[id] = now;
      delete deletedAtById[id];
    }
  }

  return writeMeta(nextFinance, { updatedAtById, deletedAtById });
}

function comparePresentRules(localRule, cloudRule, localUpdatedAt, cloudUpdatedAt, preferLocal) {
  if (!localRule) return cloudRule ? 'cloud' : null;
  if (!cloudRule) return 'local';
  if (jsonEqual(localRule, cloudRule)) return preferLocal ? 'local' : 'cloud';

  const localRevision = ruleRevision(localRule);
  const cloudRevision = ruleRevision(cloudRule);
  if (localRevision !== cloudRevision) return localRevision > cloudRevision ? 'local' : 'cloud';
  if (localUpdatedAt !== cloudUpdatedAt) return localUpdatedAt > cloudUpdatedAt ? 'local' : 'cloud';
  return preferLocal ? 'local' : 'cloud';
}

export function mergeAutomaticRulesIntoFinanceEvolution(
  selectedFinance,
  localFinance,
  cloudFinance,
  localFinanceUpdatedAt = 0,
  cloudFinanceUpdatedAt = 0,
  preferLocal = false,
) {
  const base = isRecord(selectedFinance) ? selectedFinance : {};
  const localRules = byId(automaticRules(localFinance));
  const cloudRules = byId(automaticRules(cloudFinance));
  const localMeta = readMeta(localFinance);
  const cloudMeta = readMeta(cloudFinance);
  const localDocTs = positiveTimestamp(localFinanceUpdatedAt);
  const cloudDocTs = positiveTimestamp(cloudFinanceUpdatedAt);
  const ids = new Set([
    ...localRules.keys(),
    ...cloudRules.keys(),
    ...Object.keys(localMeta.updatedAtById),
    ...Object.keys(localMeta.deletedAtById),
    ...Object.keys(cloudMeta.updatedAtById),
    ...Object.keys(cloudMeta.deletedAtById),
  ]);
  const mergedRules = [];
  const updatedAtById = {};
  const deletedAtById = {};

  for (const id of ids) {
    const localRule = localRules.get(id);
    const cloudRule = cloudRules.get(id);
    const localUpdatedAt = localRule
      ? positiveTimestamp(localMeta.updatedAtById[id]) || localDocTs
      : 0;
    const cloudUpdatedAt = cloudRule
      ? positiveTimestamp(cloudMeta.updatedAtById[id]) || cloudDocTs
      : 0;
    const localDeletedAt = positiveTimestamp(localMeta.deletedAtById[id]);
    const cloudDeletedAt = positiveTimestamp(cloudMeta.deletedAtById[id]);
    const newestDeletion = Math.max(localDeletedAt, cloudDeletedAt);
    const newestUpdate = Math.max(localUpdatedAt, cloudUpdatedAt);

    // An explicit tombstone is the only valid evidence of deletion. Mere absence
    // on a device must never erase a rule that exists on another device.
    if (newestDeletion && newestDeletion >= newestUpdate) {
      deletedAtById[id] = newestDeletion;
      continue;
    }

    const source = comparePresentRules(localRule, cloudRule, localUpdatedAt, cloudUpdatedAt, preferLocal);
    const chosen = source === 'local' ? localRule : source === 'cloud' ? cloudRule : null;
    if (!chosen) {
      if (newestDeletion) deletedAtById[id] = newestDeletion;
      continue;
    }

    mergedRules.push(chosen);
    const chosenTs = source === 'local' ? localUpdatedAt : cloudUpdatedAt;
    updatedAtById[id] = chosenTs || newestUpdate || Math.max(localDocTs, cloudDocTs) || Date.now();
  }

  mergedRules.sort((a, b) => {
    const pa = Number.isSafeInteger(a?.priority) ? a.priority : Number.MAX_SAFE_INTEGER;
    const pb = Number.isSafeInteger(b?.priority) ? b.priority : Number.MAX_SAFE_INTEGER;
    return pa - pb || String(a?.id || '').localeCompare(String(b?.id || ''));
  });

  const nonAutomaticBaseRules = Array.isArray(base.rules)
    ? base.rules.filter(rule => !rule || rule.kind !== 'automatic-v1')
    : [];

  return writeMeta({ ...base, rules: [...nonAutomaticBaseRules, ...mergedRules] }, {
    updatedAtById,
    deletedAtById,
  });
}
