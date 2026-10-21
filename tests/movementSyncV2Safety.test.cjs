// Executes the actual TypeScript engine against an isolated Firestore model.
// Never imports the real Firebase client, accesses credentials, or opens sockets.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const root = path.join(__dirname, '..');
function compile(file) {
  const result = ts.transpileModule(fs.readFileSync(path.join(root, file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }, reportDiagnostics: true,
  });
  assert.equal((result.diagnostics || []).filter(d => d.category === ts.DiagnosticCategory.Error).length, 0, file);
  return result.outputText;
}
function plainModule(file) {
  const box = { exports: {} };
  new Function('exports', 'module', compile(file))(box.exports, box);
  return box.exports;
}
const policy = plainModule('src/data/movementSyncCleanPolicy.ts');
const algorithms = plainModule('src/data/syncAlgorithms.ts');
const { readWithDeadline } = plainModule('src/utils/readDeadline.ts');
const source = fs.readFileSync(path.join(root, 'src/data/movementSyncCleanV2.ts'), 'utf8');
assert(!source.includes('authoritativeReplaceAtMs'), 'Global recovery suppression must be absent');
assert(!source.includes('writeBatch'), 'Bulk replacement must not use unguarded multi-batch writes');

function harness(options = {}) {
  const documentPaths = new Map();
  const records = new Map(), localMarkers = new Map(), prefs = new Map(), listeners = [];
  const marker = { schemaVersion: 2, state: 'enabled-migrated' };
  const pending = [];
  let transactions = 0, writes = 0, failAfter = Infinity, transactionHook, verifyHook, stalled = false;
  const online = { onLine: true };
  const key = (uid, id) => uid + '/' + id;
  const snapshot = value => ({ exists: () => !!value, data: () => value && structuredClone(value) });
  const collectionSnapshot = uid => ({ docs: [...records.values()].filter(r => r.uid === uid).map(r => ({ ...snapshot(r), ref: { path: documentPath(r) } })) });
  const uidFor = ref => ref.path.split('/')[1];
  function emit(uid = 'one', metadata = { fromCache: false, hasPendingWrites: false }) {
    const data = collectionSnapshot(uid);
    listeners.filter(l => l.uid === uid && !l.closed).forEach(l => l.fn({ ...data, metadata }));
  }
  const fake = {
    collection: (_db, ...parts) => ({ path: parts.join('/') }),
    doc: (base, ...parts) => ({ path: [base.path, ...parts].filter(Boolean).join('/') }),
    getDocFromCache: async () => options.noCachedMarker ? snapshot(null) : snapshot(marker),
    getDocFromServer: async () => {
      if (stalled) return new Promise(() => {});
      if (!online.onLine) throw Error('offline'); return snapshot(marker);
    },
    getDocsFromServer: async ref => {
      if (!online.onLine) throw Error('offline');
      if (verifyHook && transactions) { const hook = verifyHook; verifyHook = null; hook(); }
      return collectionSnapshot(uidFor(ref));
    },
    onSnapshot: (ref, _options, fn) => {
      const listener = { uid: uidFor(ref), fn, closed: false }; listeners.push(listener);
      queueMicrotask(() => { if (!listener.closed) fn({ ...collectionSnapshot(listener.uid), metadata: options.pendingMetadata || { fromCache: false, hasPendingWrites: false } }); });
      return () => { listener.closed = true; };
    },
    setDoc: (ref, value) => new Promise((resolve, reject) => {
      if (ref.path.includes('/syncMeta/')) { Object.assign(marker, value); resolve(); return; }
      const intent = { ref, value: structuredClone(value), resolve, reject };
      pending.push(intent);
      // Adversarial snapshot before the whole loop has enqueued its requests.
      emit(uidFor(ref), { fromCache: false, hasPendingWrites: true });
    }),
    waitForPendingWrites: async () => { if (options.unrelatedPending) return new Promise(() => {}); },
    runTransaction: async (_db, callback) => {
      transactions++;
      if (transactionHook) { const hook = transactionHook; transactionHook = null; hook(); }
      const proposed = [];
      const transaction = {
        get: async ref => {
          assert.equal(proposed.length, 0, 'All reads must precede every write');
          const uid = uidFor(ref);
          // Locate by the engine's generated document path for this fixture.
          const found = [...records.values()].find(r => r.uid === uid &&
            documentPath(r) === ref.path);
          return snapshot(found);
        },
        set: (ref, record) => { proposed.push([ref, structuredClone(record)]); },
      };
      await callback(transaction);
      if (writes + proposed.length > failAfter) throw Error('permission-denied');
      // Validate the whole transaction before publishing any record.
      for (const [,record] of proposed) {
        const old = records.get(key(record.uid,record.recordId));
        assert(!old?.deleted || record.deleted, 'Actual rules forbid tombstone resurrection');
        assert(!old || record.updatedAtMs >= (old.updatedAtMs ?? Math.max(old.clientUpdatedAtMs || 0, old.writtenAtMs || 0)), 'Actual rules forbid stale versions');
      }
      for (const [,record] of proposed) { records.set(key(record.uid,record.recordId),record);writes++; }
      if (proposed.length) emit(proposed[0][1].uid);
    },
  };
  function documentPath(record) {
    const historical = documentPaths.get(key(record.uid, record.recordId));
    if (historical) return historical;
    let h = 2166136261;
    for (let i = 0; i < record.recordId.length; i++) { h ^= record.recordId.charCodeAt(i); h = Math.imul(h, 16777619); }
    const readable = encodeURIComponent(record.recordId).replace(/%/g, '_').replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 120);
    return `users/${record.uid}/movementsV2/${record.kind}_${readable}_${(h >>> 0).toString(36)}`;
  }
  const dependencies = {
    'firebase/firestore': fake,
    '@capacitor/preferences': { Preferences: { get: async ({ key }) => ({ value: prefs.get(key) || null }), set: async ({ key, value }) => prefs.set(key, value) } },
    '../firebase/client': { fbDb: {} }, './accountCloudCodec': {},
    '../utils/readDeadline': { readWithDeadline: p => readWithDeadline(p, options.fastDeadlines ? 15 : 15000) },
    './movementSyncCleanPolicy': policy, './syncAlgorithms': algorithms,
  };
  const box = { exports: {} };
  vm.runInNewContext(compile('src/data/movementSyncCleanV2.ts'), {
    module: box, exports: box.exports, require: name => {
      assert(name in dependencies, 'Unexpected import: ' + name); return dependencies[name];
    }, navigator: online, localStorage: { getItem: k => localMarkers.get(k) || null, setItem: (k, v) => localMarkers.set(k, v) },
    crypto: { randomUUID: () => require('node:crypto').randomUUID() }, console, Date, Math, Map, Set,
    setInterval, clearInterval,
    setTimeout: (fn, ms) => setTimeout(fn, options.fastDeadlines ? Math.min(ms, 15) : ms), clearTimeout,
  });
  function seed(uid, kind, id, payload = {}, deleted = false) {
    const record = { schemaVersion: 2, uid, kind, recordId: `${kind}:${id}`, deleted,
      payload: deleted ? null : { id, amount: 10, ...payload }, updatedAtMs: 1, deletedAtMs: deleted ? 1 : 0, mutationId: 'seed' };
    records.set(key(uid, record.recordId), record); return record;
  }
  return { api: box.exports, records, marker, online, pending, seed, emit, key,
    emitChanges: (uid, changes, metadata = { fromCache: false, hasPendingWrites: false }) => {
      listeners.filter(l => l.uid === uid && !l.closed).forEach(l => l.fn({
        get docs() { throw Error('Incremental listener must not decode the full collection'); },
        docChanges: () => changes, metadata,
      }));
    },
    alias: (uid, id, value) => documentPaths.set(key(uid, id), value),
    stall: value => { stalled = value; },
    failAfter: value => { failAfter = value; }, hook: value => { transactionHook = value; }, verifyHook: value => { verifyHook = value; },
    get writes() { return writes; }, get transactions() { return transactions; },
    active: (uid = 'one', kind = 'expense') => [...records.values()].filter(r => r.uid === uid && r.kind === kind && !r.deleted),
  };
}
const tick = () => new Promise(resolve => setImmediate(resolve));
function callable(file, name, context) {
  const text = fs.readFileSync(path.join(root, file), 'utf8');
  const tree = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let node;
  function visit(n) { if (ts.isFunctionDeclaration(n) && n.name?.text === name) node = n; else ts.forEachChild(n, visit); }
  visit(tree); assert(node, name);
  const code = ts.transpileModule(node.getText(tree), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return new Function(...Object.keys(context), code + '; return ' + name + ';')(...Object.values(context));
}
async function run() {
  // Ordinary local V2 writes: all 631 intents precede the first intermediate echo.
  {
    const h = harness(), rows = [];
    for (let i = 0; i < 631; i++) { h.seed('one', 'expense', String(i)); rows.push({ id: String(i), amount: 10 }); }
    let seen, other;
    const off = h.api.watchMovementSyncV2('one', records => { seen = h.api.movementStateFromV2(records); });
    h.api.watchMovementSyncV2('two', records => { other = h.api.movementStateFromV2(records); });
    h.seed('two', 'expense', 'different'); h.emit('two');
    assert.equal(h.api.writeMovementDiffV2('one', 'expense', rows, []), 631);
    assert.equal(seen.expenses.length, 0, 'Partial local echoes must not resurrect pending deletions');
    h.emit('one', { fromCache: true, hasPendingWrites: true });
    assert.equal(seen.expenses.length, 0, 'Offline cache must retain local intents');
    assert.equal(other.expenses.length, 1, 'Other account must remain untouched');
    for (const p of h.pending) { h.records.set(h.key('one', p.value.recordId), p.value); p.resolve(); }
    await tick(); h.emit();
    assert.equal(seen.expenses.length, 0);
    h.seed('one', 'expense', 'other-device-new'); h.emit();
    assert.equal(seen.expenses.length, 1, 'New movements from another device must still arrive'); off();
  }
  // One rejected write must remove its optimistic overlay and report the error.
  {
    const h = harness(); h.seed('one', 'expense', 'a'); let seen, errors = 0;
    h.api.watchMovementSyncV2('one', r => { seen = h.api.movementStateFromV2(r); });
    h.api.writeMovementDiffV2('one', 'expense', [{ id: 'a', amount: 10 }], [], () => errors++);
    assert.equal(seen.expenses.length, 0);
    h.pending[0].reject(Error('permission-denied')); await tick();
    assert.equal(errors, 1); assert.equal(seen.expenses.length, 1, 'Rejected deletion must reconcile to actual state');
  }
  // Two rapid edits: an older acknowledgement must not retire the newer intent.
  {
    const h = harness(); h.seed('one', 'expense', 'a'); let seen;
    h.api.watchMovementSyncV2('one', r => { seen = h.api.movementStateFromV2(r); });
    h.api.writeMovementDiffV2('one', 'expense', [{ id: 'a', amount: 10 }], [{ id: 'a', amount: 20 }]);
    h.api.writeMovementDiffV2('one', 'expense', [{ id: 'a', amount: 20 }], [{ id: 'a', amount: 30 }]);
    h.records.set(h.key('one', 'expense:a'), h.pending[0].value); h.pending[0].resolve(); await tick(); h.emit();
    assert.equal(seen.expenses[0].amount, 30);
    h.records.set(h.key('one', 'expense:a'), h.pending[1].value); h.pending[1].resolve(); await tick(); h.emit();
    assert.equal(seen.expenses[0].amount, 30);
  }
  // 631 remote records, even when no rows are loaded in the React state.
  {
    const h = harness(); for (let i = 0; i < 631; i++) h.seed('one', 'expense', String(i));
    h.seed('one', 'income', 'keep'); h.seed('two', 'expense', 'keep');
    const originalMarker = JSON.stringify(h.marker), progress = [];
    await h.api.replaceMovementSetsV2('one', { expense: [] }, (n, total) => progress.push([n, total]));
    assert.equal(h.active().length, 0); assert.equal(h.writes, 631);
    assert.equal(h.active('one', 'income').length, 1); assert.equal(h.active('two').length, 1);
    assert.equal(JSON.stringify(h.marker), originalMarker, 'Migration marker must never be rewritten');
    assert.equal(progress.at(-1)[0], 631);
    await h.api.replaceMovementSetsV2('one', { expense: [{ id: 'fresh', amount: 8 }] });
    assert.equal(h.active().length, 1);
  }
  // Fail AFTER real progress, settle every started request, then retry remaining work.
  {
    const h = harness(); for (let i = 0; i < 631; i++) h.seed('one', 'expense', String(i));
    h.failAfter(351);
    await assert.rejects(h.api.replaceMovementSetsV2('one', { expense: [] }), /PARTIAL_OPERATION/);
    assert(h.writes > 0 && h.writes <= 351); assert.equal(h.active().length, 631-h.writes);
    const count = h.writes; await tick(); assert.equal(h.writes, count, 'No abandoned writes may commit after rejection');
    h.failAfter(Infinity);
    await h.api.replaceMovementSetsV2('one', { expense: [] });
    assert.equal(h.active().length, 0); assert.equal(h.writes, 631, 'Retry must not rewrite committed tombstones');
  }
  // Preflight validates ALL requested kinds before changing even one row.
  {
    const h = harness(); h.seed('one', 'expense', 'keep'); h.seed('one', 'income', 'deleted', {}, true);
    await assert.rejects(h.api.replaceMovementSetsV2('one', { expense: [], income: [{ id: 'deleted', amount: 1 }, { id: 'deleted', amount: 2 }] }), /DUPLICATE/);
    assert.equal(h.writes, 0);
    await assert.rejects(h.api.replaceMovementSetsV2('one', { expense: [{ id: 'dup' }, { id: 'dup' }] }), /DUPLICATE/);
    assert.equal(h.writes, 0);
    h.online.onLine = false;
    await assert.rejects(h.api.replaceMovementSetsV2('one', { expense: [] }), /ONLINE_REQUIRED/);
    assert.equal(h.writes, 0);
  }
  // Explicit restore keeps the old tombstone, restores business fields under a
  // new stable identity, and reuses that identity when retrying the same backup.
  {
    const h = harness(); h.seed('one', 'expense', 'old', {}, true);
    const row = { id: 'old', amount: 25, date: '2026-10-01', catId: 'cat', methodId: 'card',
      recurringOccurrenceId: 'rent@2026-10-01', attachments: [{ url: 'storage://existing-document' }],
      shareProjectId: 'project', mundelyExpenseId: 'external-id' };
    const restored = await h.api.replaceMovementSetsV2('one', { expense: [row] });
    const next = restored.expense[0]; assert.notEqual(next.id, 'old');
    assert.equal(h.records.get(h.key('one','expense:old')).deleted, true);
    for(const key of ['amount','date','catId','methodId','recurringOccurrenceId','shareProjectId','mundelyExpenseId'])assert.equal(next[key],row[key],key);
    assert.equal(JSON.stringify(next.attachments),JSON.stringify(row.attachments));
    const count=h.writes;
    const retried=await h.api.replaceMovementSetsV2('one',{expense:[row]});
    assert.equal(retried.expense[0].id,next.id);assert.equal(h.writes,count);assert.equal(h.active().length,1);
    await h.api.replaceMovementSetsV2('one',{expense:[]});
    const again=await h.api.replaceMovementSetsV2('one',{expense:[row]});
    assert.notEqual(again.expense[0].id,next.id,'A deleted restoration must remain tombstoned too');
    assert.equal(h.active().length,1);
  }
  // A partial restore must reuse committed new IDs, never import them twice.
  {
    const h=harness(),rows=[];
    for(let i=0;i<20;i++){h.seed('one','expense',String(i),{},true);rows.push({id:String(i),amount:i+1});}
    h.failAfter(9);
    await assert.rejects(h.api.replaceMovementSetsV2('one',{expense:rows}),/PARTIAL_OPERATION/);
    assert(h.writes > 0 && h.writes <= 9);
    const committed=new Set(h.active().map(r=>r.payload.id));
    h.failAfter(Infinity);await h.api.replaceMovementSetsV2('one',{expense:rows});
    assert.equal(h.active().length,20);assert.equal(h.writes,20);
    for(const id of committed)assert(h.active().some(r=>r.payload.id===id));
    assert.equal([...h.records.values()].filter(r=>r.deleted).length,20);
  }
  // A stale initial server read must never overwrite a newer remote edit.
  {
    const h = harness(); h.seed('one', 'expense', 'a');
    h.hook(() => { h.records.get(h.key('one', 'expense:a')).payload.amount = 99; });
    await assert.rejects(h.api.replaceMovementSetsV2('one', { expense: [] }), /PARTIAL_OPERATION/);
    assert.equal(h.active()[0].payload.amount, 99); assert.equal(h.writes, 0);
  }
  // Newly created concurrent rows survive; verification must report the mismatch.
  {
    const h = harness(); h.seed('one', 'expense', 'a');
    h.verifyHook(() => h.seed('one', 'expense', 'new-from-other-device'));
    await assert.rejects(h.api.replaceMovementSetsV2('one', { expense: [] }), /CONCURRENT_EDIT_OR_VERIFY_FAILED/);
    assert.equal(h.active()[0].payload.id, 'new-from-other-device');
  }
  // A device with a slow clock can still tombstone a newer stored timestamp.
  {
    const h = harness(); const row = h.seed('one', 'expense', 'future'); row.updatedAtMs = Date.now() + 999999;
    await h.api.replaceMovementSetsV2('one', { expense: [] });
    assert.equal(h.active().length, 0);
    assert(h.records.get(h.key('one', 'expense:future')).updatedAtMs > row.updatedAtMs);
  }
  // Device catch-up MUST remain enabled: an unrelated global field cannot bypass it.
  {
    const h = harness(); h.marker.authoritativeReplaceAtMs = Date.now();
    const status = await h.api.movementSyncV2AccountStatus('one', [{ id: 'unsynced', amount: 11 }], [], {});
    assert.equal(status.active, false); assert.equal(status.reason, 'device-catchup-required');
    await h.api.acknowledgeMovementSyncV2Device('one'); h.online.onLine = false;
    const offline = await h.api.movementSyncV2AccountStatus('one', [{ id: 'unsynced' }], [], {});
    assert.equal(offline.active, true, 'Previously acknowledged account must keep offline V2 active');
    const other = await h.api.movementSyncV2AccountStatus('two', [{ id: 'unsynced' }], [], {});
    assert.equal(other.active, false, 'Device marker must remain scoped to UID');
  }
  // Firestore map key order must not turn a successful replacement into failure.
  {
    const h = harness({ noCachedMarker: true, fastDeadlines: true }); h.stall(true);
    const marker = JSON.stringify(h.marker);
    const unavailable = await h.api.movementSyncV2AccountStatus('one', [], [], {});
    assert.equal(unavailable.active, false); assert.equal(unavailable.reason, 'status-check-unavailable');
    assert.equal(JSON.stringify(h.marker), marker, 'Stalled read must never initialize a clean marker');
    h.stall(false);
    const recovered = await h.api.movementSyncV2AccountStatus('one', [], [], {});
    assert.equal(recovered.active, true, 'Retry after metadata timeout must recover normally');
  }
  {
    const h = harness(); h.seed('one', 'expense', 'a', { nested: { z: 1, a: 2 } });
    await h.api.replaceMovementSetsV2('one', { expense: [{ nested: { a: 2, z: 1 }, amount: 10, id: 'a' }] });
    assert.equal(h.writes, 0, 'Equivalent unordered maps must remain idempotent');
  }
  // A telemetry/backup backlog must not block movement-only bulk operations.
  {
    const h = harness({ unrelatedPending: true });
    h.seed('one', 'expense', 'a');
    await h.api.replaceMovementSetsV2('one', { expense: [] });
    assert.equal(h.active().length, 0);
  }
  // Cached/pending movement snapshots cannot authorize a destructive write;
  // user cancellation releases the preflight and never submits a transaction.
  {
    const h = harness({ pendingMetadata: { fromCache: false, hasPendingWrites: true } });
    h.seed('one', 'expense', 'a');
    const controller = new AbortController();
    const task = h.api.replaceMovementSetsV2('one', { expense: [] }, undefined, () => true, controller.signal);
    await tick();
    assert.equal(h.transactions, 0);
    controller.abort();
    await assert.rejects(task, /CANCELLED_BEFORE_WRITES/);
    assert.equal(h.active().length, 1);
  }
  // A backlog may take longer than a read deadline. Keep waiting safely, then
  // proceed only on the authoritative snapshot that acknowledges all writes.
  {
    const h = harness({ fastDeadlines: true, pendingMetadata: { fromCache: true, hasPendingWrites: true } });
    h.seed('one', 'expense', 'a');
    const task = h.api.replaceMovementSetsV2('one', { expense: [] });
    await new Promise(r => setTimeout(r, 35));
    assert.equal(h.transactions, 0);
    h.emit('one', { fromCache: false, hasPendingWrites: false });
    await task;
    assert.equal(h.active().length, 0);
  }
  // Invalid identities must fail before waiting on a potentially slow queue.
  {
    const h = harness({ pendingMetadata: { fromCache: true, hasPendingWrites: true } });
    await assert.rejects(h.api.replaceMovementSetsV2('one', { expense: [{ id: 'dup', amount: 1 }, { id: 'dup', amount: 2 }] }), /DUPLICATE_OR_MISSING_ID/);
    assert.equal(h.transactions, 0);
  }
  // Real legacy documents can use a path that predates current ID encoding.
  // Delete and update that exact document under the same version guard; do not
  // invent a canonical-path twin or leave the historical record alive.
  {
    const h = harness();
    h.seed('one', 'expense', 'historical');
    h.alias('one', 'expense:historical', 'users/one/movementsV2/old-document-path');
    await h.api.replaceMovementSetsV2('one', { expense: [{ id: 'historical', amount: 20 }] });
    assert.equal(h.active()[0].payload.amount, 20);
    assert.equal(h.records.size, 1);
    await h.api.replaceMovementSetsV2('one', { expense: [] });
    assert.equal(h.active().length, 0);
    assert.equal(h.records.size, 1);
    assert.equal(h.records.get(h.key('one','expense:historical')).deleted, true);
  }
  // Legacy V2 timestamps must remain part of conflict/version protection.
  {
    const h = harness();
    const legacy = h.seed('one','expense','legacy-version');
    delete legacy.updatedAtMs;
    legacy.clientUpdatedAtMs = Date.now() + 10000;
    legacy.writtenAtMs = Date.now() + 20000;
    h.alias('one','expense:legacy-version','users/one/movementsV2/historical-version-path');
    await h.api.replaceMovementSetsV2('one',{expense:[]});
    const result=h.records.get(h.key('one','expense:legacy-version'));
    assert.equal(result.deleted,true);
    assert(result.updatedAtMs > legacy.writtenAtMs);
  }
  // Incremental snapshots must preserve unrelated documents, apply updates
  // and removals, and avoid reading/decompressing the full collection again.
  {
    const h = harness(); h.seed('one','expense','first'); h.seed('one','expense','second');
    let seen; const off=h.api.watchMovementSyncV2('one', r => { seen=h.api.movementStateFromV2(r); });
    await tick();
    // The fake initial snapshot has no document IDs; its authoritative keys
    // are document refs, which are also valid physical-document identifiers.
    const first=h.records.get(h.key('one','expense:first'));
    const firstPath='users/one/movementsV2/expense_expense_3Afirst_'+(()=>{let h=2166136261;for(const c of 'expense:first'){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)})();
    const secondPath='users/one/movementsV2/expense_expense_3Asecond_'+(()=>{let h=2166136261;for(const c of 'expense:second'){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return(h>>>0).toString(36)})();
    h.emitChanges('one',[{type:'modified',doc:{id:firstPath,data:()=>({...first,payload:{...first.payload,amount:42}})}}]);
    assert.equal(seen.expenses.length,2);
    assert.equal(seen.expenses.find(r=>r.id==='first').amount,42);
    h.emitChanges('one',[{type:'removed',doc:{id:secondPath,data:()=>{throw Error('Removed doc must not be decoded')}}}]);
    assert.equal(seen.expenses.length,1);
    assert.equal(seen.expenses[0].id,'first');off();
  }
  // The full realtime target must be detached while bulk transactions run,
  // then attached again after the wrapper has refreshed the authoritative state.
  {
    const text=fs.readFileSync(path.join(root,'src/app.tsx'),'utf8');
    const tree=ts.createSourceFile('app.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
    let effect;
    function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='useEffect'&&n.arguments[0]?.getText(tree).includes('return watchMovementSyncV2('))effect=n.arguments[0];else ts.forEachChild(n,visit)}
    visit(tree);assert(effect);
    for(const busy of [false,true]){
      let attached=0,detached=0;
      const body='return ('+effect.getText(tree)+');';
      const fn=new Function('movementSyncV2Active','userId','movementBulkBusy','watchMovementSyncV2',body)(true,'one',busy,()=>{attached++;return()=>detached++});
      const off=fn();
      assert.equal(attached,busy?0:1);
      if(off)off();assert.equal(detached,busy?0:1);
    }
  }
  // Commit storms must not force one full app render per acknowledged record.
  {
    const updates=[],progressRef={current:{}};
    const wrapper=callable('src/app.tsx','replaceAccountMovementsV2',{
      userId:'one',movementBulkProgressRef:progressRef,movementBulkCancelRef:{current:null},movementBulkInProgressRef:{current:false},
      movementSyncV2ActiveRef:{current:true},movementSyncV2MigrationRunningRef:{current:false},
      movementBulkLatestSnapshotRef:{current:null},movementBulkSnapshotSequenceRef:{current:0},movementAccountUidRef:{current:'one'},
      setMovementBulkBusy:()=>{},Date:{now:()=>1000},
      window:{dispatchEvent:()=>updates.push(progressRef.current)},CustomEvent:class{},
      replaceMovementSetsV2:async(_uid,_rows,progress)=>{for(let i=0;i<=100;i++)progress(i,100,'writing')},
      readMovementSetsV2:async()=>({expenses:[],incomes:[]}),setExpenses:()=>{},setIncomes:()=>{},
    });
    await wrapper({expense:[]});
    assert(updates.length<10);
    assert.equal(updates.at(-1).done,100);
  }
  // The obscured Settings screen must not repeat its expensive calculations
  // on every write acknowledgement; diagnostic progress still stays current.
  {
    const text=fs.readFileSync(path.join(root,'src/settings/SettingsPanel.tsx'),'utf8');
    const tree=ts.createSourceFile('settings.tsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX),callbacks=[];
    function visit(n){if(ts.isCallExpression(n)&&n.expression.getText(tree)==='replaceAccountMovementsV2'&&n.arguments[1]?.getText(tree).includes('setMovementDataProgress'))callbacks.push(n.arguments[1]);ts.forEachChild(n,visit)}
    visit(tree);assert.equal(callbacks.length,2);
    for(const callback of callbacks){
      let renders=0;const ref={current:''};
      const code=ts.transpileModule('const callback = '+callback.getText(tree),{compilerOptions:{target:ts.ScriptTarget.ES2020}}).outputText;
      const fn=new Function('L','movementDataLastProgressRef','setMovementDataProgress',code+';return callback;')(s=>s,ref,()=>renders++);
      fn(10,100,'writing');assert.equal(renders,0);assert.equal(ref.current,'10/100');
      fn(20,0,'pending');assert.equal(renders,1);assert.equal(ref.current,'pending:20');
    }
  }
  // A conflict in one member must prevent the entire guarded group from being
  // committed, including otherwise unchanged members of that transaction.
  {
    const h=harness();h.seed('one','expense','first');h.seed('one','expense','second');
    h.hook(()=>{const row=h.records.get(h.key('one','expense:second'));row.updatedAtMs=100;row.payload.amount=99;});
    await assert.rejects(h.api.replaceMovementSetsV2('one',{expense:[]}),/PARTIAL_OPERATION/);
    assert.equal(h.writes,0);assert.equal(h.active().length,2);
    assert.equal(h.records.get(h.key('one','expense:second')).payload.amount,99);
  }
  // The actual app wrapper refreshes the server even on partial failure; it
  // never restores pre-operation arrays, drops a later snapshot, or writes into
  // a newly selected account.
  for (const scenario of ['success', 'partial', 'later-snapshot', 'refresh-offline', 'account-switch']) {
    const lock = { current: false }, uid = { current: 'one' }, buffer = { current: null }, seq = { current: 0 };
    const applied = [];
    const wrapper = callable('src/app.tsx', 'replaceAccountMovementsV2', {
      userId: 'one', movementBulkProgressRef: { current: {} }, movementBulkCancelRef: { current: null }, movementBulkInProgressRef: lock,
      window: { dispatchEvent: () => {} }, CustomEvent: class {}, movementSyncV2ActiveRef: { current: true },
      setMovementBulkBusy:()=>{}, setMovementBulkProgress:()=>{},
      movementSyncV2MigrationRunningRef: { current: false }, movementBulkLatestSnapshotRef: buffer,
      movementBulkSnapshotSequenceRef: seq, movementAccountUidRef: uid,
      replaceMovementSetsV2: async () => {
        buffer.current = [{ payload: { id: 'actual' }, kind: 'expense', deleted: false }]; seq.current++;
        if (scenario === 'partial') throw Error('SYNC_V2_PARTIAL_OPERATION:1/2');
        if (scenario === 'account-switch') uid.current = 'two';
        return { expense: [] };
      },
      readMovementSetsV2: async () => {
        if (scenario === 'refresh-offline') throw Error('offline');
        if (scenario === 'later-snapshot') {
          buffer.current = [{ payload: { id: 'newest' }, kind: 'expense', deleted: false }]; seq.current++;
        }
        return { expenses: [{ id: 'server' }], incomes: [] };
      },
      movementStateFromV2: records => ({ expenses: records.filter(r => r.kind === 'expense').map(r => r.payload), incomes: [] }),
      setExpenses: (rows, remote) => { assert.equal(remote, true); applied.push(rows); },
      setIncomes: (_rows, remote) => assert.equal(remote, true),
      console: { error: () => {} },
    });
    if (scenario === 'partial') await assert.rejects(wrapper({ expense: [] }), /PARTIAL_OPERATION/);
    else await wrapper({ expense: [] });
    assert.equal(lock.current, false, scenario + ': lock must always release');
    if (scenario === 'account-switch') assert.equal(applied.length, 0);
    else assert.equal(applied[0][0].id,
      scenario === 'later-snapshot' ? 'newest' : scenario === 'refresh-offline' ? 'actual' : 'server');
  }
  // Backup validation must happen before movement writes or unrelated fields.
  {
    let calls = 0;
    const apply = callable('src/settings/SettingsPanel.tsx', 'applyBackupData', {
      migrateFinanceEvolution: () => { throw Error('invalid-schema'); },
      replaceAccountMovementsV2: () => { calls++; },
    });
    await assert.rejects(apply({ financeEvolution: { schemaVersion: 999 }, expenses: [] }, 'replace'), /invalid-schema/);
    assert.equal(calls, 0, 'Invalid backup must not delete movements before validation');
  }
  console.log('[OK] V2 safety: 631 pending echoes; offline; UID isolation; rejection; rapid edits; 631 remote deletes; partial guarded groups + retry; restore preflight; concurrent edits/additions; clock skew; device catch-up.');
}
run().catch(error => { console.error(error); process.exitCode = 1; });
