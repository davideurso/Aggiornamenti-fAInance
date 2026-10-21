import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import AppWithLogin from './app'
import { EmailActionScreen, isFainanceEmailActionUrl } from './auth/EmailActionScreen'
import { initializeFainanceAnalytics } from './analytics/firebaseAnalytics'
import { appEnvironment } from './config/env'
import { initializeRecoverySnapshots } from "./data/recoverySnapshots";
import { markStartupPhase } from './utils/startupDiagnostics'


function runtimeFault(error: unknown) {
  const candidate = error instanceof Error ? error : new Error('RuntimeError');
  const name = /^(?:QuotaExceededError|SecurityError|TypeError|ReferenceError|RangeError|SyntaxError|Error)$/.test(candidate.name) ? candidate.name : 'RuntimeError';
  const site = String(candidate.stack || '').match(/(?:index|main)-[A-Za-z0-9_-]+\.js:\d+:\d+/)?.[0] || '';
  return { name, site };
}
class RuntimeErrorBoundary extends Component<{ children: ReactNode }, { fault: ReturnType<typeof runtimeFault> | null }> {
  state = { fault: null as ReturnType<typeof runtimeFault> | null };
  static getDerivedStateFromError(error: unknown) { return { fault: runtimeFault(error) }; }
  componentDidCatch(error: Error) {
    // No account identifiers, values or arbitrary exception messages are logged.
    (window as any).__FAINANCE_RUNTIME_FAULT__ = runtimeFault(error);
    console.error('FAINANCE_RUNTIME_FAULT', JSON.stringify(runtimeFault(error)));
  }
  render() {
    if (!this.state.fault) return this.props.children;
    return <main role="alert" style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 'max(24px, env(safe-area-inset-top)) 24px max(24px, env(safe-area-inset-bottom))', background: '#f7f7f7', color: '#222', fontFamily: 'system-ui, sans-serif' }}>
      <section style={{ maxWidth: 380, padding: 24, background: 'white', borderRadius: 18 }}>
        <h1 style={{ fontSize: 20 }}>Schermata non disponibile</h1>
        <p style={{ marginTop: 12 }}>Si è verificato un errore durante l’uso dell’app. Chiudi e riapri fAInance.</p>
        <p style={{ marginTop: 12, fontSize: 13 }}>Codice: {this.state.fault.name} {this.state.fault.site}</p>
      </section>
    </main>;
  }
}

const bootWindow = window as any
markStartupPhase('bundle_ready')
document.title = appEnvironment === 'test' ? 'fAInance Test' : 'fAInance'
document.documentElement.setAttribute('data-fainance-environment', appEnvironment)
bootWindow.__FAINANCE_BUNDLE_STARTED__ = true
bootWindow.__FAINANCE_BOOT_FATAL__ = null


initializeRecoverySnapshots().then(() => {
try {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('FAINANCE_ROOT_NOT_FOUND')

  createRoot(rootElement).render(
    <StrictMode>
      <RuntimeErrorBoundary>
        {isFainanceEmailActionUrl() ? <EmailActionScreen /> : <AppWithLogin />}
      </RuntimeErrorBoundary>
    </StrictMode>,
  )

  requestAnimationFrame(() => {
    bootWindow.__FAINANCE_REACT_MOUNTED__ = true
    try { window.dispatchEvent(new CustomEvent('fainance-react-mounted')) } catch (_e) {}

    // Start Analytics after the UI/runtime has mounted on native and Web.
    // This avoids a one-shot early return before the native bridge is ready.
    window.setTimeout(() => {
      initializeFainanceAnalytics().catch((error) => {
        console.warn('Firebase Analytics startup failed', error)
      })
    }, 250)
  })
} catch (error) {
  bootWindow.__FAINANCE_BOOT_FATAL__ = error
  throw error
}
});
