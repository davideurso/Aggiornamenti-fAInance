import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

function showBootError(error: unknown) {
  const root = document.getElementById('root')
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
  if (root) {
    root.innerHTML = `
      <div style="min-height:100vh;background:#f7f7f7;color:#222;font-family:-apple-system,BlinkMacSystemFont,system-ui,sans-serif;padding:24px;display:flex;align-items:center;justify-content:center;">
        <div style="max-width:420px;background:white;border:1px solid #eee;border-radius:18px;padding:20px;box-shadow:0 8px 28px rgba(0,0,0,.08);">
          <div style="font-size:18px;font-weight:800;margin-bottom:8px;color:#b00020;">Errore di avvio fAInance</div>
          <div style="font-size:13px;line-height:1.45;color:#555;margin-bottom:12px;">La schermata bianca è stata intercettata. Invia questo dettaglio tecnico.</div>
          <pre style="white-space:pre-wrap;word-break:break-word;background:#fafafa;border:1px solid #eee;border-radius:12px;padding:12px;font-size:12px;color:#333;">${message}</pre>
        </div>
      </div>
    `
  }
}

window.addEventListener('error', (event) => {
  showBootError(event.error || event.message)
})

window.addEventListener('unhandledrejection', (event) => {
  showBootError(event.reason)
})

async function boot() {
  try {
    const mod = await import('./app')
    const AppWithLogin = mod.default
    const rootEl = document.getElementById('root')
    if (!rootEl) throw new Error('Elemento root non trovato')
    createRoot(rootEl).render(
      <StrictMode>
        <AppWithLogin />
      </StrictMode>
    )
  } catch (error) {
    showBootError(error)
  }
}

void boot()
