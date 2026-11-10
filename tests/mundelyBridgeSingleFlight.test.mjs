import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as nodeModule from 'node:module';

// Existing harness pattern: App/tests/syncTimeouts.test.mjs. All dependencies,
// network calls and Firestore operations are isolated synthetic fixtures.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = nodeModule.createRequire(import.meta.url);
let ts;
try { ts = require('typescript'); } catch {}
function transpile(input) {
  if (ts) return ts.transpileModule(input, { compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2020 } }).outputText;
  if (typeof nodeModule.stripTypeScriptTypes === 'function') return nodeModule.stripTypeScriptTypes(input, { mode: 'strip' });
  throw Error('Install the existing project TypeScript dependencies before running this test');
}
const tree = path.join(root, process.env.BRIDGE_TEST_BASELINE === '1' ? 'baseline/src' : 'src');
const source = fs.readFileSync(path.join(tree, 'integrations/mundelyBridge.ts'), 'utf8');
const center = fs.readFileSync(path.join(tree, 'notifications/NotificationCenter.tsx'), 'utf8');
const singleFlightSource = fs.readFileSync(path.join(tree, 'data/singleFlightWrite.js'), 'utf8');
const createSingleFlightWriter = new Function(singleFlightSource.replace(/^export /gm, '') + '\nreturn createSingleFlightWriter;')();
const names = [...source.matchAll(/^export (?:async )?function (\w+)/gm)].map(x => x[1]);
const js = transpile(source)
  .replace(/^import\s+\{([^\n]+)\}\s+from\s+"([^"]+)";\r?$/gm, (_, bindings, specifier) => `const {${bindings}}=deps[${JSON.stringify(specifier)}];`)
  .replace(/^export /gm, '');
assert(!/^import /m.test(js), 'No unstubbed dependencies');
const load = new Function('deps', 'fetch', js + '\nreturn {' + names.join(',') + '};');
const deferred = () => { let resolve, reject; const promise = new Promise((a, b) => { resolve = a; reject = b; }); return { promise, resolve, reject }; };
const tick = () => new Promise(resolve => setImmediate(resolve));
const empty = () => ({ linkRequests: [], tripSyncs: [], expenseSyncs: [], linkedTrips: [] });
const reply = (extra = {}) => ({ ok: true, json: async () => ({ ok: true, environment: 'test', targetProjectId: 'fainance-test-20260823195207', bridgeVersion: 13, ...empty(), ...extra }) });
const fixtureUser = uid => ({ uid, getIdToken: async () => 'fixture-' + uid });

function fixture({ project, fetch: fetchOverride, read, environment = 'test', firebaseProject = 'fainance-test-20260823195207', authenticated = true } = {}) {
  const state = { project: project || { ownerUid: 'u', memberUids: ['u'], activities: [], categories: [], deletedActivityIds: [] }, writes: 0, calls: [], reads: 0 };
  const auth = { currentUser: authenticated ? fixtureUser('u') : null };
  const snapshot = () => ({ exists: () => true, data: () => structuredClone(state.project) });
  const update = (_ref, patch) => { state.writes++; state.project = { ...state.project, ...structuredClone(patch) }; };
  const deps = {
    'firebase/firestore': { doc: (...args) => ({ id: args.at(-1) }), getDoc: async () => { state.reads++; if (read) await read(state); return snapshot(); }, runTransaction: async (_db, fn) => fn({ get: async () => snapshot(), update }), setDoc: async (ref, patch) => update(ref, patch) },
    '../config/env': { appEnvironment: environment, firebaseConfig: { projectId: firebaseProject }, functionsRegion: 'europe-west1' },
    '../firebase/client': { fbDb: {}, fbAuth: auth },
    '../data/singleFlightWrite.js': { createSingleFlightWriter },
    '../firebase/shareActivityCommit': { useNativeShareCommit: () => false },
    '@capacitor/core': { CapacitorHttp: {} },
  };
  const api = load(deps, async (_url, options) => {
    const body = JSON.parse(options.body);
    state.calls.push(body);
    return fetchOverride ? fetchOverride(body, state, options) : reply();
  });
  return { api, state, auth, linked: [{ tripId: 't', mundelyUid: 'm', targetShareProjectId: 'p' }] };
}

test('one flight per UID, one trailing fresh pull for 24 requests arriving during a cycle', async () => {
  const gate = deferred(); let active = 0, max = 0, pulls = 0;
  const f = fixture({ fetch: async body => { assert.equal(body.action, 'pull'); const n = ++pulls; active++; max = Math.max(max, active); await gate.promise; active--; return reply({ linkRequests: [{ id: String(n) }] }); } });
  const first = f.api.syncMundelyBridgeNow();
  await tick();
  const others = Array.from({ length: 24 }, () => f.api.syncMundelyBridgeNow());
  await tick();
  try { assert.equal(max, 1); assert.equal(pulls, 1); }
  finally { gate.resolve(); await Promise.allSettled([first, ...others]); }
  assert.equal(pulls, 2);
  assert.equal(max, 1);
  for (const op of [first, ...others]) assert.equal((await op).linkRequests[0].id, '2');
});

test('real Share mutation handler coalesces its five scheduled requests into one trailing run', async () => {
  const gate = deferred(); let pulls = 0;
  const f = fixture({ fetch: async () => { pulls++; await gate.promise; return reply(); } });
  const pending = [], timers = [];
  const refresh = () => { const op = f.api.syncMundelyBridgeNow(); pending.push(op); void op.catch(() => {}); };
  const start = center.indexOf('    const onShareMutation = () => {');
  const end = center.indexOf('    window.addEventListener("focus"', start);
  assert(start >= 0 && end > start);
  const handler = new Function('refreshBridgeOnly', 'window', center.slice(start, end) + '\nreturn onShareMutation;')(refresh, { setTimeout: fn => timers.push(fn) });
  handler(); await tick();
  for (const callback of timers) { callback(); await tick(); }
  try { assert.equal(pulls, 1); }
  finally { gate.resolve(); await Promise.allSettled(pending); }
  assert.equal(pulls, 2);
});

test('periodic refresh and link approval both execute the central coordinator', async () => {
  const calls = [];
  const deps = {
    syncMundelyBridgeNow: async () => { calls.push('central'); return empty(); },
    pullMundelyBridge: async () => { calls.push('bypass'); return empty(); },
    syncMundelyTripsToShare: async () => {}, syncMundelyCategoryCatalogToShare: async () => {},
    syncMundelyExpensesToShare: async () => {}, reconcileFainanceShareExpensesToMundely: async () => {},
    setMundelyRequests: () => {}, respondMundelyLink: async () => {}, setMundelyBusyId: () => {}, mundelyBusyId: '',
  };
  const refreshStart = center.indexOf('    const refresh = async () => {');
  const refreshEnd = center.indexOf('    const refreshBridgeOnly', refreshStart);
  const approvalStart = center.indexOf('  async function decideMundelyLink(');
  const approvalEnd = center.indexOf('  async function markAllRead()', approvalStart);
  assert(refreshStart >= 0 && refreshEnd > refreshStart && approvalEnd > approvalStart);
  const extracted = 'let cancelled=false,running=false;\n' + center.slice(refreshStart, refreshEnd) + center.slice(approvalStart, approvalEnd);
  const apis = new Function(...Object.keys(deps), transpile(extracted) + '\nreturn {refresh,decideMundelyLink};')(...Object.values(deps));
  await apis.refresh();
  await apis.decideMundelyLink({ id: 'synthetic-request' }, 'approve');
  assert.deepEqual(calls, ['central', 'central']);
});

test('real overlapping flow cannot tombstone a newer expense or ACK an ignored replay', async () => {
  const firstRead = deferred(), releaseRead = deferred(); let pulls = 0;
  const linked = { tripId: 't', mundelyUid: 'm', targetShareProjectId: 'p', deletedShareActivityKeys: [] };
  const sync = { id: 'new-sync', targetShareProjectId: 'p', targetShareActivityKey: 'new-key', tripId: 't', expenseId: 'new-expense', amount: 10, currency: 'EUR', category: 'food', deleted: false };
  const f = fixture({
    read: async state => { if (state.reads === 1) { firstRead.resolve(); await releaseRead.promise; } },
    fetch: async body => {
      if (body.action !== 'pull') return reply();
      pulls++;
      return reply({ linkedTrips: [{ ...linked, activeExpenseIds: pulls === 1 ? [] : ['new-expense'] }], expenseSyncs: pulls === 1 ? [] : [sync] });
    },
  });
  const a = f.api.syncMundelyBridgeNow(); await firstRead.promise;
  const b = f.api.syncMundelyBridgeNow();
  for (let i = 0; i < 4; i++) await tick();
  releaseRead.resolve(); await Promise.all([a, b]);
  assert.equal(f.state.project.activities.filter(x => x.mundelyExpenseId === 'new-expense').length, 1);
  assert(!f.state.project.deletedActivityIds.includes('new-key'));
  assert.equal(pulls, 2);
});

test('queued refresh survives a failed cycle; an unqueued failure releases the UID slot', async () => {
  const gate = deferred(); let pulls = 0;
  const f = fixture({ fetch: async () => { const n = ++pulls; if (n === 1) { await gate.promise; return { ok: false, json: async () => ({ ok: false, error: 'FIXTURE_FAILURE' }) }; } return reply(); } });
  const first = f.api.syncMundelyBridgeNow(); await tick();
  const second = f.api.syncMundelyBridgeNow(); gate.resolve();
  await Promise.all([first, second]); assert.equal(pulls, 2);
  let failure = true;
  const g = fixture({ fetch: async () => failure ? { ok: false, json: async () => ({ error: 'FIXTURE_FAILURE' }) } : reply() });
  await assert.rejects(g.api.syncMundelyBridgeNow(), /FIXTURE_FAILURE/);
  failure = false;
  await g.api.syncMundelyBridgeNow();
  assert.equal(g.state.calls.length, 2);
});

test('account switch stops old payload before writes and allows the new UID its own flight', async () => {
  const gate = deferred(); let pulls = 0;
  const f = fixture({ fetch: async body => {
    if (body.action !== 'pull') return reply();
    pulls++;
    if (pulls === 1) { await gate.promise; return reply({ tripSyncs: [{ id: 'old-sync', targetShareProjectId: 'old-project', tripId: 'old-trip', name: 'synthetic old trip' }] }); }
    return reply();
  } });
  const old = f.api.syncMundelyBridgeNow(); await tick();
  f.auth.currentUser = fixtureUser('new-user');
  await f.api.syncMundelyBridgeNow();
  gate.resolve(); await old;
  assert.equal(f.state.writes, 0);
  assert.equal(pulls, 2);
});

test('Test-only, unauthenticated and response identity/version guards stay fail-closed', async () => {
  for (const options of [{ environment: 'production' }, { firebaseProject: 'other-project' }, { authenticated: false }]) {
    const f = fixture(options); await f.api.syncMundelyBridgeNow(); assert.equal(f.state.calls.length, 0); assert.equal(f.state.writes, 0);
  }
  for (const mismatch of [{ environment: 'production' }, { targetProjectId: 'other-project' }, { bridgeVersion: 12 }]) {
    const f = fixture({ fetch: async () => reply(mismatch) });
    await assert.rejects(f.api.syncMundelyBridgeNow(), /MUNDELY_BRIDGE_ENVIRONMENT_MISMATCH/);
    assert.equal(f.state.writes, 0);
  }
});

test('existing tombstone/echo regression: no resurrection and no replacement of an edited date', async () => {
  const f = fixture({ project: { ownerUid: 'u', memberUids: ['u'], activities: [{ id: 123, kind: 'expense', amount: 10, date: '2026-10-05', desc: 'synthetic' }], categories: [], deletedActivityIds: [] } });
  const echo = { id: 'echo', targetShareProjectId: 'p', targetShareActivityKey: '123', tripId: 't', expenseId: 'e', amount: 10, date: '2026-11-04', origin: 'fainance', syncMode: 'create', deleted: false };
  await f.api.syncMundelyExpensesToShare([echo]);
  assert.equal(f.state.project.activities[0].date, '2026-10-05');
  f.state.project.activities = []; f.state.project.deletedActivityIds = ['123'];
  await f.api.syncMundelyExpensesToShare([{ ...echo, syncMode: 'update' }]);
  assert.deepEqual(f.state.project.activities, []);
  assert.deepEqual(f.state.project.deletedActivityIds, ['123']);
  assert.equal(f.state.writes, 1);
});

test('confirmed deletion is applied once and preserves unrelated Share activities', async () => {
  const keep = { id: 'keep', kind: 'expense', amount: 3, desc: 'synthetic kept row' };
  const f = fixture({ project: { ownerUid: 'u', memberUids: ['u'], activities: [{ id: 'remove', kind: 'expense', amount: 10 }, keep], categories: [], deletedActivityIds: [] }, fetch: async () => reply({ removeShareActivityKeys: ['remove'] }) });
  await f.api.reconcileFainanceShareExpensesToMundely(f.linked);
  assert.deepEqual(f.state.project.activities, [keep]); assert.equal(f.state.writes, 1);
  await f.api.reconcileFainanceShareExpensesToMundely(f.linked);
  assert.deepEqual(f.state.project.activities, [keep]); assert.equal(f.state.writes, 1);
});

test('link requests are published after pull even when reverse synchronization subsequently fails', async () => {
  const observed = [];
  const request = { id: 'synthetic-link-request' };
  const f = fixture({ fetch: async body => body.action === 'pull'
    ? reply({ linkRequests: [request], linkedTrips: [{ tripId: 't', mundelyUid: 'm', targetShareProjectId: 'p', activeExpenseIds: [] }] })
    : { ok: false, json: async () => ({ ok: false, error: 'FIXTURE_REVERSE_FAILURE' }) }
  });
  await assert.rejects(f.api.syncMundelyBridgeNow(payload => observed.push(payload.linkRequests)), /FIXTURE_REVERSE_FAILURE/);
  assert.deepEqual(observed, [[request]]);
});
