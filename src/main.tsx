import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppWithLogin from './app'
import { EmailActionScreen, isFainanceEmailActionUrl } from './auth/EmailActionScreen'
import { initializeFainanceAnalytics } from './analytics/firebaseAnalytics'
import { appEnvironment } from './config/env'
import { markStartupPhase } from './utils/startupDiagnostics'

const bootWindow = window as any
markStartupPhase('bundle_ready')
document.title = appEnvironment === 'test' ? 'fAInance Test' : 'fAInance'
document.documentElement.setAttribute('data-fainance-environment', appEnvironment)
bootWindow.__FAINANCE_BUNDLE_STARTED__ = true
bootWindow.__FAINANCE_BOOT_FATAL__ = null


try {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('FAINANCE_ROOT_NOT_FOUND')

  createRoot(rootElement).render(
    <StrictMode>
      {isFainanceEmailActionUrl() ? <EmailActionScreen /> : <AppWithLogin />}
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
