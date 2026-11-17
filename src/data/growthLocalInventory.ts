import { GROWTH_COUNT_KEYS } from './growthLocalCounts';
import { isExplicitSyncTombstone, syncRecordTime, syncTombstoneTime } from './syncAlgorithms';

// Technical identities only. This is evidence from one installation, never a
// certified total, an acquisition event or a copy of the financial payload.
type Family = typeof GROWTH_COUNT_KEYS[number];
type Entry = { key: string; changedAtMs: number | null; deleted: boolean };
type Revision = { changedAtMs: number; deleted: boolean };
type Revisions = Record<string, Revision>;
const financeFamilies = ['budgetVersions', 'budgetOverrides', 'rules'] as const;
const namespaces: Partial<Record<Family, string>> = {
  expenseCount: 'expense', incomeCount: 'income', goals: 'goal',
  alerts: 'alert', shareProjects: 'shareProject',
};
const identity = (id: unknown): string | null =>
  (typeof id === 'string' && id.trim() && id.length <= 256) ||
  (typeof id === 'number' && Number.isFinite(id) && Math.abs(id) <= Number.MAX_SAFE_INTEGER) ? String(id) : null;
const timestamp = (value: unknown): number | null =>
  Number.isSafeInteger(value) && Number(value) > 0 ? Number(value) : null;

function financeRows(finance: any, family: typeof financeFamilies[number]): any[] | null {
  if (family === 'budgetOverrides') {
    const overrides = finance?.budget?.overrides;
    return overrides && typeof overrides === 'object' && !Array.isArray(overrides)
      ? Object.entries(overrides).map(([id, value]) => ({ id, value })) : null;
  }
  const value = family === 'rules' ? finance?.rules : finance?.budget?.standardVersions;
  return Array.isArray(value) ? value : null;
}

// Called only by the existing successful local finance save. Unknown or absent
// source arrays cannot manufacture deletion events. Import/restore is stock too.
export function trackGrowthFinanceChanges(previous: any, next: any, now: number) {
  if (!timestamp(now)) return next;
  const metadata: Record<string, Revisions> = {};
  for (const family of financeFamilies) {
    const revisions: Revisions = Object.create(null);
    for (const source of [previous?.growthIdentityChangesV1?.[family], next?.growthIdentityChangesV1?.[family]]) {
      for (const [id, raw] of Object.entries(source || {})) {
        const r = raw as Revision;
        if (identity(id) && timestamp(r?.changedAtMs) && typeof r.deleted === 'boolean' &&
            (!revisions[id] || revisions[id].changedAtMs <= r.changedAtMs)) {
          revisions[id] = { changedAtMs: r.changedAtMs, deleted: r.deleted };
        }
      }
    }
    const before = financeRows(previous, family), after = financeRows(next, family);
    if (before && after) {
      const old = new Map(before.map(row => [identity(row?.id), row]));
      const current = new Map(after.map(row => [identity(row?.id), row]));
      for (const [id, row] of current) if (id &&
          (!old.has(id) || JSON.stringify(old.get(id)) !== JSON.stringify(row))) {
        revisions[id] = { changedAtMs: now, deleted: false };
      }
      for (const id of old.keys()) if (id && !current.has(id)) {
        revisions[id] = { changedAtMs: now, deleted: true };
      }
    }
    metadata[family] = { ...revisions };
  }
  return { ...next, growthIdentityChangesV1: metadata };
}

export type GrowthMovementEvidence = {
  uid: string; confirmed: boolean;
  rows: { kind: string; recordId: string; deleted: boolean; updatedAtMs: number; deletedAtMs: number }[];
};
type Options = {
  projectId: string; owner: string; hydrated: boolean; movementReady: boolean;
  movementV2: boolean; movementEvidence?: GrowthMovementEvidence | null;
  creationIntents?: {family:string;entityId:string;nonce:string}[];
  observedAt?: string; storage?: Pick<Storage, 'getItem' | 'setItem'>;
};

async function digest(value: string) {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
}

export async function prepareGrowthInventory(state: any, options: Options) {
  if (!['fainance-a7794', 'fainance-test-20260823195207'].includes(options.projectId) ||
      !options.owner || !options.hydrated) return null;
  // Analytics metadata must never prevent a financial save.
  try {
    const observedAt = options.observedAt || new Date().toISOString();
    if (!Number.isFinite(Date.parse(observedAt))) return null;
    const scopeKey = await digest(JSON.stringify([options.projectId, options.owner]));
    const storage = options.storage || localStorage;
    const storageKey = 'fainance_growth_device_v1:' + scopeKey;
    let installation = storage.getItem(storageKey);
    if (!installation || !/^[0-9a-f-]{36}$/i.test(installation)) {
      installation = crypto.randomUUID();
      storage.setItem(storageKey, installation);
      if (storage.getItem(storageKey) !== installation) return null;
    }
    const families: Record<string, { status: string; reason: string | null; entries: Entry[] }> = {};
    const finance = state?.financeEvolution;
    for (const family of GROWTH_COUNT_KEYS) {
      const byId = new Map<string, { changedAtMs: number | null; deleted: boolean }>();
      let reason: string | null = null;
      const add = (rawId: unknown, changedAt: unknown, deleted: boolean) => {
        const id = identity(rawId), changedAtMs = timestamp(changedAt);
        if (id === null) { reason = 'IDENTITY_MISSING'; return; }
        if (changedAtMs === null) reason ||= 'REVISION_MISSING';
        if (changedAtMs !== null && changedAtMs > Date.parse(observedAt)) reason = 'FUTURE_REVISION';
        const previous = byId.get(id);
        if (!previous || (changedAtMs || 0) > (previous.changedAtMs || 0) ||
            (changedAtMs === previous.changedAtMs && deleted)) byId.set(id, { changedAtMs, deleted });
      };
      const movement = family === 'expenseCount' || family === 'incomeCount';
      if (movement && options.movementV2) {
        const evidence = options.movementEvidence, kind = namespaces[family]!;
        if (!options.movementReady || evidence?.uid !== options.owner) reason = 'SOURCE_NOT_READY';
        else {
          if (!evidence.confirmed) reason = 'MOVEMENTS_NOT_CONFIRMED';
          for (const row of evidence.rows) if (row.kind === kind) {
            if (!row.recordId.startsWith(kind + ':')) { reason = 'IDENTITY_MISSING'; continue; }
            add(row.recordId.slice(kind.length + 1), row.deleted ? row.deletedAtMs : row.updatedAtMs, row.deleted);
          }
        }
      } else {
        const rows = movement ? (options.movementReady ? state?.[family === 'expenseCount' ? 'expenses' : 'incomes'] : null)
          : financeFamilies.includes(family as any) ? financeRows(finance, family as any) : state?.[family];
        if (!Array.isArray(rows)) reason = 'SOURCE_NOT_READY';
        else {
          const seen = new Set<string>();
          for (const row of rows) {
            if (family === 'shareProjects') {
              if (!row?.ownerUid) { reason = 'OWNER_MISSING'; continue; }
              if (row.ownerUid !== options.owner) continue;
            }
            const id = identity(row?.id);
            if (id !== null && seen.has(id)) reason = 'DUPLICATE_IDENTITY';
            if (id !== null) seen.add(id);
            const tracked = id !== null ? finance?.growthIdentityChangesV1?.[family]?.[id] : null;
            const ruleRevision = family === 'rules' && id !== null ? finance?.automaticRulesSyncV1?.updatedAtById?.[id] : null;
            const deleted = row?.deleted === true || row?.deletedAt != null;
            add(id, deleted ? Number(row?.deletedAt) : tracked?.deleted === false ? tracked.changedAtMs : ruleRevision || syncRecordTime(row), deleted);
          }
        }
        for (const [id, r] of Object.entries(finance?.growthIdentityChangesV1?.[family] || {}) as [string, Revision][]) {
          if (r.deleted === true) add(id, r.changedAtMs, true);
        }
        if (family === 'rules') for (const [id, at] of Object.entries(finance?.automaticRulesSyncV1?.deletedAtById || {})) add(id, at, true);
        const prefix = namespaces[family];
        if (prefix) for (const [key, tombstone] of Object.entries(state?.accountDeletedRecords || {})) {
          if (key.startsWith(prefix + ':') && isExplicitSyncTombstone(tombstone)) add(key.slice(prefix.length + 1), syncTombstoneTime(tombstone), true);
        }
      }
      const entries: Entry[] = [];
      // Bounded hashing concurrency keeps large archives from starving the UI.
      const source = [...byId.entries()].sort(([a], [b]) => a.localeCompare(b));
      for (let i = 0; i < source.length; i += 64) {
        entries.push(...await Promise.all(source.slice(i, i + 64).map(async ([id, revision]) => ({
          key: await digest(JSON.stringify([scopeKey, family, id])), ...revision,
        }))));
      }
      families[family] = { status: reason ? 'N_D' : 'OBSERVED', reason, entries };
    }
    const data = {
      schema: 'fainance-local-inventory-v1', release: '2.2.1', scopeKey, observedAt,
      environment: options.projectId === 'fainance-a7794' ? 'production' : 'test',
      source: 'MERGED_LOCAL_STATE', authority: 'CLIENT_OBSERVED', families,
      stockOnly: true, wholeAppPopulationQualified: false, numericExportAllowed: false,
    };
    // Never silently truncate an archive or overflow the Firestore document.
    if (new TextEncoder().encode(JSON.stringify(data)).length > 650000) {
      for (const family of GROWTH_COUNT_KEYS) families[family] = { status: 'N_D', reason: 'INVENTORY_CAPACITY', entries: [] };
    }
    const creationReceipts:{documentId:string;data:any;nonce:string}[]=[];
    for(const claim of options.creationIntents||[]){
      if(!['goals','rules','budgetVersions','budgetOverrides','alerts','shareProjects'].includes(claim.family)||typeof claim.entityId!=='string'||!claim.entityId||claim.entityId.length>128||typeof claim.nonce!=='string'||!/^[0-9a-f-]{36}$/i.test(claim.nonce)||creationReceipts.length>=100)continue;
      const key=await digest(JSON.stringify([scopeKey,claim.family,claim.entityId]));
      const family=families[claim.family as Family];
      // Only an explicitly created item still present in the qualified local inventory.
      // Hydration, imports and restores do not create intents in the existing setters.
      if(family?.status!=='OBSERVED'||!family.entries.some((entry:Entry)=>entry.key===key&&!entry.deleted))continue;
      creationReceipts.push({documentId:'growthCreationV1_'+key,nonce:claim.nonce,data:{schema:'fainance-creation-receipt-v1',environment:data.environment,scopeKey,key,family:claim.family,source:'EXPLICIT_CREATE',authority:'CLIENT_OBSERVED',release:'2.2.1',numericExportAllowed:false}});
    }
    return { documentId: 'growthInventoryV1_' + installation, data, creationReceipts };
  } catch {
    return null;
  }
}

// Shares the existing commit/transaction. No new collector, timer or retry.
export async function commitAccountWithGrowth(db: any, accountRef: any, write: any, inventory: any,
  transaction: any, firestore: { doc: Function; setDoc: Function; writeBatch: Function }) {
  const metadataRef = inventory ? firestore.doc(db, 'users', accountRef.id, 'syncMeta', inventory.documentId) : null;
  const receipts=(inventory?.creationReceipts||[]).map((r:any)=>({ref:firestore.doc(db,'users',accountRef.id,'syncMeta',r.documentId),data:r.data}));
  // Deterministic document identity preserves Firestore createTime across replays.
  // No client date is used as first server confirmation; no extra request or timer.
  if (transaction) {
    for(const r of receipts)transaction.set(r.ref,r.data);
    transaction.set(accountRef, write, { merge: true });
    if (metadataRef) transaction.set(metadataRef, inventory.data);
  } else if (metadataRef) {
    const batch = firestore.writeBatch(db);
    batch.set(accountRef, write, { merge: true });
    batch.set(metadataRef, inventory.data);
    for(const r of receipts)batch.set(r.ref,r.data);
    await batch.commit();
  } else await firestore.setDoc(accountRef, write, { merge: true });
}
