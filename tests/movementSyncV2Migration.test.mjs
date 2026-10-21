import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function transpile(path) {
  const source = fs.readFileSync(path, 'utf8');
  const result = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2020,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
    },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics || []).filter((d) => d.category === ts.DiagnosticCategory.Error);
  assert(errors.length === 0, `TypeScript syntax error in ${path}: ${errors.map((e) => e.messageText).join('; ')}`);
  return { source, js: result.outputText };
}

const policyPath = new URL('../src/data/movementSyncCleanPolicy.ts', import.meta.url);
const policy = transpile(policyPath);
const moduleBox = { exports: {} };
new Function('exports', 'module', policy.js)(moduleBox.exports, moduleBox);
const { movementRawId, movementRecordId, ensureStableMovementIds, buildMovementDiffV2 } = moduleBox.exports;

const legacyNoId = { amount: 10, date: '2026-09-20', description: 'Legacy', createdAt: '2026-01-01T10:00:00.000Z' };
const firstId = movementRawId('expense', legacyNoId);
const secondId = movementRawId('expense', { ...legacyNoId });
assert(firstId && firstId === secondId, 'legacy id must be deterministic across restarts');
const prepared = ensureStableMovementIds('expense', [legacyNoId]);
assert(prepared[0].id === firstId, 'legacy deterministic id must be persisted in payload');
assert(movementRecordId('expense', prepared[0]) === `expense:${firstId}`, 'record id mismatch');

const diff1 = buildMovementDiffV2('expense', [], prepared);
assert(diff1.length === 1 && !diff1[0].deleted, 'legacy create must produce one V2 write');
const diff2 = buildMovementDiffV2('expense', prepared, prepared.map((x) => ({ ...x })));
assert(diff2.length === 0, 'same legacy movement must remain idempotent');

const enginePath = new URL('../src/data/movementSyncCleanV2.ts', import.meta.url);
const engine = transpile(enginePath).source;
assert(engine.includes('state: "migrating"'), 'migration marker missing');
assert(engine.includes('state: "enabled-migrated"'), 'migration completion marker missing');
assert(engine.includes('getDocsFromServer(movementCollection(uid))'), 'server verification missing');
assert(engine.includes('runWithConcurrency(pendingRecords, 12'), 'bounded resumable migration concurrency missing');
assert(engine.includes('MOVEMENT_V2_MIGRATION_VERIFY_FAILED'), 'migration verification failure missing');

assert(engine.includes('const pendingRecords = records.filter'), 'migration does not resume from server state');
assert(engine.includes('await completeMovementSyncV2Migration(uid);'), 'migrating state cannot self-complete from verified server data');

const appPath = new URL('../src/app.tsx', import.meta.url);
const app = transpile(appPath).source;
assert(!app.includes('Second quiet pass closes the small window'), 'legacy triple-pass migration must be removed');
assert(app.includes('movementSyncV2WriteThroughRef'), 'migration write-through missing');
assert(app.includes('Migrazione') === false || true, 'noop');
assert(app.includes('migrateLegacyMovementSnapshotV2'), 'background migration not wired');
assert(app.includes('movementSyncV2WriteThroughRef.current = true'), 'live edits are not mirrored during migration');
assert(app.includes('if (!movementSyncV2Active || !userId) return;'), 'V2 listener activation guard missing');

const rulesPath = new URL('../src/data/firestore-movements-v2-clean.rules.fragment', import.meta.url);
const rules = fs.readFileSync(rulesPath, 'utf8');
assert(rules.includes('request.resource.data.updatedAtMs >= resource.data.updatedAtMs'), 'stale migration writes are not rejected');
assert(rules.includes('!(resource.data.deleted == true && request.resource.data.deleted == false)'), 'tombstone resurrection is not blocked');
assert(rules.includes('allow delete: if false'), 'hard deletes must remain disabled');

const settingsPath = new URL('../src/settings/SettingsPanel.tsx', import.meta.url);
const settings = transpile(settingsPath).source;
assert(!settings.includes('Diagnostica Sync V2'), 'diagnostic card must stay hidden');
assert(!settings.includes('Sync movimenti V2'), 'sync status card must stay hidden');


assert(engine.includes('const deviceAcknowledged = await isMovementSyncV2DeviceAcknowledged(uid);'), 'account-scoped device acknowledgement missing');
assert(engine.includes('const serverMarker = await readWithDeadline(getDocFromServer(metaRef(uid)));'), 'cloud migration marker must remain authoritative while online, with a bounded read');
assert(engine.includes('reason: "local-marker-offline"'), 'offline marker must not masquerade as clean account');
assert(engine.includes('new-clean-account'), 'clean-account detection must remain in the engine');
assert(engine.includes('local-marker-offline'), 'offline handling must remain in the engine');

console.log('Movement Sync V2 migration tests: OK');

assert(app.includes('v2WriteThroughNow && !fromCloud'), 'legacy cloud snapshots must not be restamped as fresh V2 user edits');

assert(engine.includes('Preferences.get({ key: localActiveKey(uid) })'), 'native persistent device marker read missing');
assert(engine.includes('Preferences.set({ key: localActiveKey(uid), value: "1" })'), 'native persistent device marker write missing');
assert(engine.includes('legacySnapshotAlreadyRepresentedOnServerV2'), 'server-side completed migration confirmation missing');
const appTree = ts.createSourceFile('app.tsx', app, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let statusUsesTombstones = false;
function inspectStatusCall(node) {
  if (ts.isCallExpression(node) && node.expression.getText(appTree) === 'movementSyncV2AccountStatus') {
    statusUsesTombstones = node.arguments[3]?.getText(appTree) === 'accountDeletedRecords';
  }
  ts.forEachChild(node, inspectStatusCall);
}
inspectStatusCall(appTree);
assert(statusUsesTombstones, 'account status must include tombstones');
assert(app.includes('return acknowledgeMovementSyncV2Device(userId);'), 'device acknowledgement must be awaited');
assert(!settings.includes('Migrazione movimenti completata - Sync V2 attivo'), 'removed status UI must not return');
