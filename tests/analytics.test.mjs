import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

function load(file, modules = {}, globals = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  const exports = {};
  vm.runInNewContext(code, { exports, require: name => { assert(name in modules, name); return modules[name]; }, console, setTimeout, clearTimeout, Date, URLSearchParams, ...globals });
  return exports;
}
const policy = load('src/analytics/analyticsPolicy.ts');
const settle = () => new Promise(resolve => setImmediate(resolve));
function runtime({ platform = 'android', environment = 'test', project, nativeProject, nativeId, supported = true, failLog = false, failGuard = false, search = '' } = {}) {
  const expected = policy.analyticsProjects[environment];
  const events = [], collection = [], listeners = {}, configs = [], apps = [], diagnostics = [];
  const firebase = { getApps: () => apps, initializeApp: (options, name) => { const app = { name, options }; apps.push(app); return app; } };
  const api = load('src/analytics/firebaseAnalytics.ts', {
    '@capacitor/core': { Capacitor: { isNativePlatform: () => platform !== 'web', getPlatform: () => platform }, registerPlugin: () => ({ getConfiguration: async () => { if (failGuard) throw Error('native unavailable'); return { projectId: nativeProject || expected.projectId, appId: nativeId || expected.nativeAppId }; } }) },
    '@capacitor/app': { App: { addListener: async (name, fn) => { listeners[name] = fn; } } },
    '@capacitor-community/firebase-analytics': { FirebaseAnalytics: { setCollectionEnabled: async ({ enabled }) => collection.push(enabled), logEvent: async event => { if (failLog) throw Error('network/private error'); events.push(event); } } },
    '../config/env': { appEnvironment: environment, firebaseConfig: { projectId: project || expected.projectId, apiKey: 'synthetic-key', appId: 'deliberately-wrong-auth-app-id' } },
    './analyticsPolicy': policy,
    'firebase/app': firebase,
    'firebase/analytics': { isSupported: async () => supported, initializeAnalytics: (app, config) => { configs.push({ app, config }); return {}; }, logEvent: (_, name, params) => events.push({ name, params }) },
  }, {
    localStorage: { setItem: (_, value) => diagnostics.push(JSON.parse(value)) },
    document: { visibilityState: 'visible', addEventListener: (name, fn) => { listeners[name] = fn; } },
    window: { location: { origin: 'https://example.invalid', search }, addEventListener: (name, fn) => { listeners[name] = fn; } },
  });
  return { api, events, collection, listeners, configs, diagnostics };
}

test('privacy: arbitrary fields, names, amounts, text, identifiers and errors cannot be sent', () => {
  const event = policy.sanitizeAnalyticsEvent('fainance_flow', { flow: 'movement', step: 'completed', method: 'manual', amount: 9000, email: 'private@example.invalid', description: 'private', uid: '123', balance: 99, reason: 'private error', environment: 'production' });
  assert.deepEqual(JSON.parse(JSON.stringify(event.params)), { flow: 'movement', step: 'completed', method: 'manual' });
  assert.equal(policy.sanitizeAnalyticsEvent('private@example.invalid', {}), null);
  assert.equal(policy.sanitizeAnalyticsEvent('fainance_section_view', { section: 'private account name' }), null);
  assert.equal(policy.sanitizeAnalyticsEvent('fainance_ai_action', { action: 'private request', result: 'completed' }), null);
});

for (const platform of ['android', 'ios', 'web']) for (const environment of ['test', 'production']) {
  test(`${platform}/${environment}: opens, sections, funnel and safe platform routing`, async () => {
    const r = runtime({ platform, environment });
    r.api.startAnalyticsFlow('registration', { method: 'email', email: 'private' });
    r.api.startAnalyticsFlow('registration', { method: 'email' });
    r.api.finishAnalyticsFlow('registration', 'completed');
    r.api.finishAnalyticsFlow('registration', 'abandoned');
    r.api.trackAnalyticsSection('share'); r.api.trackAnalyticsSection('share');
    await r.api.initializeFainanceAnalytics(); await settle();
    assert.equal(r.events.filter(e => e.name === 'fainance_flow').length, 2);
    assert.equal(r.events.filter(e => e.name === 'fainance_section_view').length, 1);
    assert.equal(r.events.filter(e => e.name === 'fainance_app_open').length, 1);
    assert(r.events.every(e => e.params.environment === environment && e.params.platform === platform));
    assert(!JSON.stringify(r.events).includes('private'));
    if (platform === 'web') {
      assert.equal(r.configs[0].app.options.measurementId, policy.analyticsProjects[environment].measurementId);
      assert.equal(r.configs[0].app.options.appId, policy.analyticsProjects[environment].webAppId);
      assert.equal(r.configs[0].config.config.send_page_view, false);
      assert.equal(r.configs[0].config.config.page_location, 'https://example.invalid/');
      assert.equal(r.configs[0].config.config.page_referrer, '');
      assert.equal(r.collection.length, 0);
    } else assert.deepEqual(r.collection, [false, true]);
  });
}

for (const platform of ['android', 'ios']) {
  test(`${platform}: a Test app pointing at Production sends nothing and stays disabled`, async () => {
    const r = runtime({ platform, nativeProject: 'fainance-a7794' });
    r.api.trackAnalyticsSection('home');
    await r.api.initializeFainanceAnalytics(); await settle();
    assert.equal(r.events.length, 0); assert.deepEqual(r.collection, [false]);
    assert.equal(r.diagnostics.at(-1).status, 'error');
  });
  test(`${platform}: Production bundle cannot use a Test app identity`, async () => {
    const r = runtime({ platform, environment: 'production', nativeId: 'it.fainanceapp.app.test' });
    await r.api.initializeFainanceAnalytics(); assert.equal(r.events.length, 0); assert(!r.collection.includes(true));
  });
}

test('web: incorrect backend project fails closed', async () => {
  const r = runtime({ platform: 'web', project: 'fainance-a7794' });
  await r.api.initializeFainanceAnalytics(); assert.equal(r.configs.length, 0); assert.equal(r.events.length, 0);
});
test('web: verification/reset links never initialize Analytics', async () => {
  const r = runtime({ platform: 'web', search: '?oobCode=secret&email=private' });
  await r.api.initializeFainanceAnalytics(); assert.equal(r.configs.length, 0); assert.equal(r.events.length, 0);
});
test('unsupported browser and missing native plugin do not break app operations', async () => {
  for (const options of [{ platform: 'web', supported: false }, { failGuard: true }]) {
    const r = runtime(options); await assert.doesNotReject(r.api.initializeFainanceAnalytics());
    assert.equal(r.events.length, 0);
  }
});
test('delivery failure stays internal and diagnostics contain no raw error', async () => {
  const r = runtime({ failLog: true }); await r.api.initializeFainanceAnalytics();
  r.api.startAnalyticsFlow('goal'); r.api.finishAnalyticsFlow('goal', 'completed'); await settle();
  assert(!JSON.stringify(r.diagnostics).includes('private'));
});
test('web: abandonment emitted once, bfcache is not abandonment, completed flows excluded', async () => {
  const r = runtime({ platform: 'web' }); await r.api.initializeFainanceAnalytics();
  r.api.startAnalyticsFlow('goal'); r.api.startAnalyticsFlow('budget'); r.api.finishAnalyticsFlow('goal', 'completed');
  r.listeners.pagehide({ persisted: true }); await settle();
  assert.equal(r.events.filter(e => e.params.step === 'abandoned').length, 0);
  r.listeners.pagehide({ persisted: false }); r.listeners.pagehide({ persisted: false }); await settle();
  assert.equal(r.events.filter(e => e.params.step === 'abandoned').length, 1);
});

for (const native of [false, true]) for (const provider of ['google', 'apple']) for (const isNewUser of [false, true]) {
  test(`${provider}/${native ? 'native' : 'web'}: count only newly created accounts`, async () => {
    const events = [];
    const user = { uid: 'private-id', email: 'private@example.invalid' };
    const signed = { user };
    class Provider { static credential() { return {}; } credential() { return {}; } addScope() {} setCustomParameters() {} }
    const auth = load('src/auth/loginRuntime.ts', {
      'firebase/auth': { GoogleAuthProvider: Provider, OAuthProvider: Provider, getAdditionalUserInfo: () => ({ isNewUser }), signInWithCredential: async () => signed, signInWithPopup: async () => signed },
      '../analytics/firebaseAnalytics': { trackAnalyticsEvent: (name, params) => events.push({ name, params }) },
      'firebase/firestore': { doc: () => ({}), getDoc: async () => ({ exists: () => true }) },
      '../firebase/client': { authPersistenceReady: Promise.resolve(), fbAuth: {}, fbDb: {}, isFirebaseStorageQuotaError: () => false },
      '../native/platform': { fainanceIsNativePlatform: () => native },
      '../utils/appRuntime': { fainancePromiseTimeout: promise => promise },
      '@capacitor-firebase/authentication': { FirebaseAuthentication: { signInWithGoogle: async () => ({ credential: { idToken: 'synthetic' } }), signInWithApple: async () => ({ credential: { idToken: 'synthetic' } }) } },
    });
    const result = await (provider === 'google' ? auth.performGoogleAccountLogin() : auth.performAppleAccountLogin('it'));
    assert.equal(result, user);
    assert.equal(events.length, isNewUser ? 1 : 0);
    if (isNewUser) assert.equal(events[0].params.method, provider);
    assert(!JSON.stringify(events).includes('private'));
  });
}

test('React StrictMode replay does not create a false funnel abandonment', async () => {
  const r = runtime(); const timers = new Map(); let next = 0, effect;
  const hook = load('src/analytics/useAnalyticsFlow.ts', {
    react: { useEffect: fn => { effect = fn; } }, './firebaseAnalytics': r.api,
  }, { setTimeout: fn => { timers.set(++next, fn); return next; }, clearTimeout: id => timers.delete(id) });
  hook.useAnalyticsFlow(true, 'goal', 'manual');
  const replayCleanup = effect(); replayCleanup();
  const realCleanup = effect(); for (const fn of timers.values()) fn();
  r.api.finishAnalyticsFlow('goal', 'completed'); realCleanup();
  await r.api.initializeFainanceAnalytics(); await settle();
  assert.equal(r.events.filter(e => e.params.step === 'started').length, 1);
  assert.equal(r.events.filter(e => e.params.step === 'completed').length, 1);
  assert.equal(r.events.filter(e => e.params.step === 'abandoned').length, 0);
});

// Execute actual save handlers with in-memory UI state: distinguish accepted
// saves from rejected operations and React's repeated updater evaluation.
function handler(file, functionName, globals) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  let found;
  function visit(node) { if (ts.isFunctionDeclaration(node) && node.name?.text === functionName) found = node; ts.forEachChild(node, visit); }
  visit(source); assert(found, functionName);
  const code = ts.transpileModule(found.getText(source), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText;
  return vm.runInNewContext(code + '\n' + functionName, globals);
}
test('real goal handler: one completion after save, invalid draft never completes', () => {
  const events = []; let saves = 0;
  const globals = { startAnalyticsFlow: (...x) => events.push(x), finishAnalyticsFlow: (...x) => events.push(x), goalFormValid: true, editingGoalId: null, goalsAllowed: () => true, form: { name: 'private', target: '100', saved: '0' }, normalizeIconGlyph: () => '', setGoals: fn => { fn([]); fn([]); saves++; }, setForm: () => {}, setShowAdd: () => {}, blank: {}, setToast: () => {}, L: x => x };
  handler('src/widget.tsx', 'addGoal', globals)();
  assert.equal(saves, 1); assert.equal(events.filter(e => e[1] === 'completed').length, 1); assert(!JSON.stringify(events).includes('private'));
  events.length = 0; handler('src/widget.tsx', 'addGoal', { ...globals, goalFormValid: false })();
  assert.equal(events.filter(e => e[1] === 'completed').length, 0);
});
for (const name of ['addExpenses', 'addIncomes']) {
  test(`real ${name}: local save vs plan rejection and cancellation`, () => {
    for (const outcome of ['saved', 'plan', 'cancelled']) {
      const events = []; let saves = 0;
      const globals = { startAnalyticsFlow: (...x) => events.push(x), finishAnalyticsFlow: (...x) => events.push(x), prepareAutomaticMovements: items => ({ items, alerts: [] }), canUsePlanFeature: () => outcome !== 'plan', approveAutomaticAlerts: () => outcome !== 'cancelled', currentPlan: 'premium', rewardedFeatureConfig: () => false, consumePlanFeature: () => {}, setExpenses: fn => { fn([]); fn([]); saves++; }, setIncomes: fn => { fn([]); fn([]); saves++; }, expenseWithMethodSnapshot: x => x, parseMoney: Number, setToast: () => {}, singleMovementSuccessToast: () => '', upgradeMessage: () => '' };
      handler('src/app.tsx', name, globals)([{ amount: 25, desc: 'private' }], 'manual');
      assert.equal(saves, outcome === 'saved' ? 1 : 0);
      assert.equal(events.filter(e => e[1] === 'completed').length, outcome === 'saved' ? 1 : 0);
      assert(!JSON.stringify(events).includes('private'));
    }
  });
}

for(const platform of ['ios','web','android'])test(platform+': calendar and anomaly navigation use safe section events',async()=>{
 const r=runtime({platform});await r.api.initializeFainanceAnalytics();
 r.api.trackAnalyticsSection('calendar');r.api.trackAnalyticsSection('calendar');r.api.trackAnalyticsSection('anomalies');await settle();
 assert.equal(r.events.filter(e=>e.name==='fainance_section_view'&&e.params.section==='calendar').length,1);
 assert.equal(r.events.filter(e=>e.name==='fainance_section_view'&&e.params.section==='anomalies').length,1);
 assert(r.events.every(e=>e.params.platform===platform&&e.params.environment==='test'));
});
