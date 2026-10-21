import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const policyPath = new URL('../src/data/movementSyncCleanPolicy.ts', import.meta.url);
const policyTs = fs.readFileSync(policyPath, 'utf8');
const policyJs = ts.transpileModule(policyTs, {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText;
const moduleBox = { exports: {} };
new Function('exports', 'module', policyJs)(moduleBox.exports, moduleBox);
const { buildMovementDiffV2 } = moduleBox.exports;

const a = { id: 101, amount: 10, date: '2026-09-20', desc: 'A' };
let diff = buildMovementDiffV2('expense', [], [a]);
assert(diff.length === 1 && diff[0].deleted === false, 'create must produce one upsert');
assert(diff[0].recordId === 'expense:101', 'movement id must be stable');

diff = buildMovementDiffV2('expense', [a], [{ ...a }]);
assert(diff.length === 0, 'same movement must be idempotent');

diff = buildMovementDiffV2('expense', [a], [{ ...a, amount: 11 }]);
assert(diff.length === 1 && diff[0].recordId === 'expense:101', 'update must target same document');

diff = buildMovementDiffV2('expense', [a], []);
assert(diff.length === 1 && diff[0].deleted === true, 'delete must produce tombstone');

const b = { id: 102, amount: 2 };
const c = { id: 103, amount: 3 };
diff = buildMovementDiffV2('expense', [], [a, b, c]);
assert(diff.length === 3, 'three creates must produce exactly three writes');

diff = buildMovementDiffV2('expense', [a, b], [{ ...a, amount: 12 }, c]);
assert(diff.length === 3 && diff.filter((x) => x.deleted).length === 1, 'mixed create/update/delete diff invalid');

const corePath = new URL('../src/core.tsx', import.meta.url);
const core = fs.readFileSync(corePath, 'utf8');
const localDateFunction = core.match(/export function localDateKey\(d\)\{[^\n]+\}/);
assert(localDateFunction, 'localDateKey not found');
const context = { result: '', Date, String };
vm.createContext(context);
vm.runInContext(
  localDateFunction[0].replace('export ', '') + '; result=localDateKey(new Date("2026-09-19T22:16:00.000Z"));',
  context,
);
// This test is run with TZ=Europe/Rome by the installer script.
assert(context.result === '2026-09-20', `local midnight date is wrong: ${context.result}`);

const appPath = new URL('../src/app.tsx', import.meta.url);
const app = fs.readFileSync(appPath, 'utf8');
assert(app.includes('delete compactSource.expenses'), 'legacy cloud blob still carries expenses');
assert(app.includes('delete savePayload.expenses'), 'legacy save payload still carries expenses');
assert(app.includes('writeMovementDiffV2(userId, "expense"'), 'expense record sync not wired');
assert(app.includes('writeMovementDiffV2(userId, "income"'), 'income record sync not wired');
assert(!app.includes('enqueueMovementRecovery'), 'legacy recovery queue detected');


const enginePath = new URL('../src/data/movementSyncCleanV2.ts', import.meta.url);
const engine = fs.readFileSync(enginePath, 'utf8');
assert(engine.includes('LOCAL_ACTIVE_PREFIX'), 'offline V2 activation marker missing');
assert(engine.includes('isMovementSyncV2LocallyActive(uid)'), 'offline restart does not preserve V2 mode');
assert(engine.includes('saveLocalActiveMarker(uid)'), 'V2 activation is not persisted locally');
assert(app.includes('[userId, isOffline, firestoreReady, movementSyncV2MigrationRetryPulse]'), 'V2 status is not rechecked when connectivity changes');


assert(engine.includes('getDocFromCache(metaRef(uid))'), 'offline activation marker is not read from persistent Firestore cache');
assert(engine.includes('export function isMovementSyncV2LocallyActive'), 'synchronous V2 local activation helper missing');
assert(app.includes('movementSyncV2ActiveRef.current || isMovementSyncV2LocallyActive(userId)'), 'movement writes still wait for an async activation effect after offline restart');

console.log('Movement Sync V2 clean tests: OK');
