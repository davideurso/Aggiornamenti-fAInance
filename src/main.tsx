import { createRoot } from 'react-dom/client'

declare global {
  interface Window {
    __FAINANCE_BOOT_ERROR__?: (title: string, detail: string) => void
  }
}

function showBootError(error: unknown) {
  const detail = error instanceof Error ? `${error.name}: ${error.message}\n${error.stack || ''}` : String(error)
  if (window.__FAINANCE_BOOT_ERROR__) {
    window.__FAINANCE_BOOT_ERROR__('Errore di avvio fAInance', detail)
    return
  }
  const root = document.getElementById('root')
  if (root) root.textContent = detail
}

async function boot() {
  try {
    const mod = await import('./app')
    const AppWithLogin = mod.default
    const rootEl = document.getElementById('root')
    if (!rootEl) throw new Error('Elemento root non trovato')
    createRoot(rootEl).render(<AppWithLogin />)
  } catch (error) {
    showBootError(error)
  }
}

void boot()
