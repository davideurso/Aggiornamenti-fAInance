import { Capacitor, registerPlugin } from '@capacitor/core';
import { App } from '@capacitor/app';
import { FirebaseAnalytics } from '@capacitor-community/firebase-analytics';
import { appEnvironment, firebaseConfig } from '../config/env';
import { assertAnalyticsIdentity, sanitizeAnalyticsEvent } from './analyticsPolicy';

const guard = registerPlugin<{ getConfiguration(): Promise<{ projectId: string; appId: string }> }>('FainanceAnalyticsGuard');
type Event = NonNullable<ReturnType<typeof sanitizeAnalyticsEvent>>;
type Sink = (event: Event) => Promise<void>;
let sink: Sink | null = null;
let boot: Promise<void> | null = null;
let retryAfter = 0;
let queue: Event[] = [];
let draining = false;
let listenersInstalled = false;
let lastOpen = 0;
let lastSection = '';
const flows = new Map<string, Record<string, unknown>>();

function diagnostic(status: 'ok' | 'error', stage: string) {
  if (appEnvironment === 'test') console.debug('[fAInance Analytics]', status, stage);
  try { localStorage.setItem('fainance_analytics_diagnostic_v1', JSON.stringify({ status, stage, environment: appEnvironment, at: new Date().toISOString() })); } catch {}
}

async function drain() {
  if (draining || !sink) return;
  draining = true;
  try {
    while (queue.length && sink) {
      const event = queue.shift()!;
      try { await sink(event); diagnostic('ok', event.name); }
      catch { diagnostic('error', 'event_delivery'); }
    }
  } finally { draining = false; }
}

export function trackAnalyticsEvent(name: string, params: Record<string, unknown> = {}): void {
  const event = sanitizeAnalyticsEvent(name, params);
  if (!event) return;
  if (queue.length >= 100) queue.shift();
  queue.push(event);
  if (sink) void drain();
  else if (Date.now() >= retryAfter) void initializeFainanceAnalytics();
}

export function startAnalyticsFlow(flow: string, params: Record<string, unknown> = {}): void {
  if (flows.has(flow)) return;
  const safe = sanitizeAnalyticsEvent('fainance_flow', { ...params, flow, step: 'started' });
  if (!safe) return;
  flows.set(flow, safe.params);
  trackAnalyticsEvent(safe.name, safe.params);
}

export function finishAnalyticsFlow(flow: string, step: 'completed' | 'failed' | 'cancelled' | 'abandoned', params: Record<string, unknown> = {}): void {
  const started = flows.get(flow);
  if (!started) return;
  flows.delete(flow);
  trackAnalyticsEvent('fainance_flow', { ...started, ...params, flow, step });
}

export function trackAnalyticsSection(section: string): void {
  if (!sanitizeAnalyticsEvent('fainance_section_view', { section }) || lastSection === section) return;
  lastSection = section;
  trackAnalyticsEvent('fainance_section_view', { section });
}

function opened(reason: 'cold_start' | 'foreground') {
  if (Date.now() - lastOpen < 2500) return;
  lastOpen = Date.now();
  trackAnalyticsEvent('fainance_app_open', { open_reason: reason });
}

function installListeners() {
  if (listenersInstalled) return;
  listenersInstalled = true;
  if (Capacitor.isNativePlatform()) {
    void App.addListener('appStateChange', ({ isActive }) => { if (isActive) opened('foreground'); })
      .catch(() => { listenersInstalled = false; diagnostic('error', 'lifecycle_listener'); });
  } else {
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') opened('foreground'); });
    window.addEventListener('pagehide', (event) => {
      if (event.persisted) return;
      for (const flow of [...flows.keys()]) finishAnalyticsFlow(flow, 'abandoned', { reason: 'page_exit' });
    });
  }
}

export function initializeFainanceAnalytics(): Promise<void> {
  if (sink) return Promise.resolve();
  if (boot) return boot;
  if (Date.now() < retryAfter) return Promise.resolve();
  boot = (async () => {
    try {
      const expected = assertAnalyticsIdentity(appEnvironment, firebaseConfig.projectId);
      const common = { environment: appEnvironment, platform: Capacitor.getPlatform(), analytics_schema: '1' };
      if (Capacitor.isNativePlatform()) {
        await FirebaseAnalytics.setCollectionEnabled({ enabled: false });
        // Verify the real native Firebase project before enabling collection.
        const configuration = await guard.getConfiguration();
        assertAnalyticsIdentity(appEnvironment, firebaseConfig.projectId, configuration);
        await FirebaseAnalytics.setCollectionEnabled({ enabled: true });
        sink = async event => { await FirebaseAnalytics.logEvent({ name: event.name, params: { ...event.params, ...common } }); };
      } else {
        if (new URLSearchParams(window.location.search).has('oobCode')) {
          queue = []; retryAfter = Infinity; return;
        }
        const [firebase, analytics] = await Promise.all([import('firebase/app'), import('firebase/analytics')]);
        if (!await analytics.isSupported()) { queue = []; retryAfter = Infinity; diagnostic('error', 'browser_unsupported'); return; }
        const app = firebase.getApps().find(item => item.name === 'fainance-analytics') || firebase.initializeApp({
          ...firebaseConfig, appId: expected.webAppId, measurementId: expected.measurementId,
        }, 'fainance-analytics');
        const web = analytics.initializeAnalytics(app, { config: {
          send_page_view: false, page_location: window.location.origin + '/', page_referrer: '', page_title: 'fAInance',
          allow_google_signals: false, allow_ad_personalization_signals: false,
        } });
        sink = async event => { analytics.logEvent(web, event.name, { ...event.params, ...common, page_location: window.location.origin + '/', page_referrer: '', page_title: 'fAInance' }); };
      }
      opened('cold_start');
      installListeners();
      await drain();
    } catch {
      queue = []; retryAfter = Date.now() + 30000;
      diagnostic('error', 'initialize');
    }
  })().finally(() => { boot = null; });
  return boot;
}
