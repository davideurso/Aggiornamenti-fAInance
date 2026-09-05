import React from 'react'
import { createRoot } from 'react-dom/client'

declare global {
  interface Window {
    __FAINANCE_DISABLE_DOM_TRANSLATION__?: boolean
    __FAINANCE_APP_MOUNT_STARTED__?: boolean
  }
}

function isIOSCapacitorRuntime() {
  try {
    const href = String(window.location?.href || '')
    const protocol = String(window.location?.protocol || '')
    const ua = String(navigator.userAgent || '')
    const cap = (window as any).Capacitor
    const platform = cap && cap.getPlatform ? String(cap.getPlatform() || '') : ''
    const native = !!(cap && cap.isNativePlatform && cap.isNativePlatform())
    return protocol === 'capacitor:' || /^capacitor:\/\//i.test(href) || platform === 'ios' || (native && /iPad|iPhone|iPod/i.test(ua))
  } catch (_) {
    return false
  }
}

function prepareRuntime() {
  if (isIOSCapacitorRuntime()) {
    window.__FAINANCE_DISABLE_DOM_TRANSLATION__ = true
  }
}

function stringifyError(error: unknown) {
  if (error instanceof Error) {
    return `${error.name}: ${error.message}\n${error.stack || ''}`
  }
  try {
    return JSON.stringify(error, null, 2)
  } catch (_) {
    return String(error)
  }
}

function renderStartupError(title: string, error: unknown) {
  const root = document.getElementById('root')
  if (!root) return
  const detail = stringifyError(error)
  root.innerHTML = `
    <div style="min-height:100vh;background:#f7f7f7;color:#222;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:24px;display:flex;align-items:center;justify-content:center;">
      <div style="max-width:420px;background:white;border:1px solid #eee;border-radius:18px;padding:20px;box-shadow:0 8px 28px rgba(0,0,0,.08);">
        <div style="font-size:18px;font-weight:800;margin-bottom:8px;color:#b00020;">${escapeHtml(title)}</div>
        <div style="font-size:13px;line-height:1.45;color:#555;margin-bottom:12px;">Invia questo dettaglio tecnico.</div>
        <pre style="white-space:pre-wrap;word-break:break-word;background:#fafafa;border:1px solid #eee;border-radius:12px;padding:12px;font-size:12px;color:#333;max-height:55vh;overflow:auto;">${escapeHtml(detail)}</pre>
      </div>
    </div>
  `
}

function escapeHtml(value: string) {
  return String(value || '').replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[c] || c))
}

class BootErrorBoundary extends React.Component<{ children: React.ReactNode }, { error: unknown | null }> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error: unknown) {
    return { error }
  }

  componentDidCatch(error: unknown) {
    try { console.error('fAInance React boot error', error) } catch (_) {}
  }

  render() {
    if (this.state.error) {
      return React.createElement('div', {
        style: {
          minHeight: '100vh',
          background: '#f7f7f7',
          color: '#222',
          fontFamily: '-apple-system,BlinkMacSystemFont,system-ui,sans-serif',
          padding: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        },
      }, React.createElement('div', {
        style: {
          maxWidth: 420,
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: 18,
          padding: 20,
          boxShadow: '0 8px 28px rgba(0,0,0,.08)',
        },
      },
        React.createElement('div', { style: { fontSize: 18, fontWeight: 800, marginBottom: 8, color: '#b00020' } }, 'Errore React fAInance'),
        React.createElement('div', { style: { fontSize: 13, lineHeight: 1.45, color: '#555', marginBottom: 12 } }, 'Invia questo dettaglio tecnico.'),
        React.createElement('pre', { style: { whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fafafa', border: '1px solid #eee', borderRadius: 12, padding: 12, fontSize: 12, color: '#333', maxHeight: '55vh', overflow: 'auto' } }, stringifyError(this.state.error))
      ))
    }
    return this.props.children
  }
}

async function boot() {
  prepareRuntime()
  try {
    const mod = await import('./app')
    const AppWithLogin = mod.default
    const rootEl = document.getElementById('root')
    if (!rootEl) throw new Error('Elemento root non trovato')
    window.__FAINANCE_APP_MOUNT_STARTED__ = true
    createRoot(rootEl).render(
      React.createElement(BootErrorBoundary, null, React.createElement(AppWithLogin))
    )
  } catch (error) {
    renderStartupError('Errore avvio fAInance', error)
  }
}

void boot()
