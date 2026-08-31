import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import AppWithLogin from './app'
import fainanceTestIcon from './assets/fainance-test-icon.png'
import { EmailActionScreen, isFainanceEmailActionUrl } from './auth/EmailActionScreen'

const bootWindow = window as any
const isFainanceTestRuntime = import.meta.env.MODE === 'test' || String(import.meta.env.VITE_APP_ENV || '').toLowerCase() === 'test'
if (isFainanceTestRuntime) {
  document.title = 'fAInance Test'
  document.documentElement.setAttribute('data-fainance-environment', 'test')
  let icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]')
  if (!icon) { icon = document.createElement('link'); icon.rel = 'icon'; document.head.appendChild(icon) }
  icon.href = fainanceTestIcon
  let touch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]')
  if (!touch) { touch = document.createElement('link'); touch.rel = 'apple-touch-icon'; document.head.appendChild(touch) }
  touch.href = fainanceTestIcon
}
bootWindow.__FAINANCE_BUNDLE_STARTED__ = true
bootWindow.__FAINANCE_BOOT_FATAL__ = null

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('FAINANCE_ROOT_NOT_FOUND')

  createRoot(rootElement).render(
    <StrictMode>
      {isFainanceTestRuntime && isFainanceEmailActionUrl() ? <EmailActionScreen /> : <AppWithLogin />}
    </StrictMode>,
  )

  requestAnimationFrame(() => {
    bootWindow.__FAINANCE_REACT_MOUNTED__ = true
    try { window.dispatchEvent(new CustomEvent('fainance-react-mounted')) } catch (_e) {}
  })
} catch (error) {
  bootWindow.__FAINANCE_BOOT_FATAL__ = error
  throw error
}
