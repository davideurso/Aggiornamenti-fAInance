import { createRoot } from 'react-dom/client'

declare global {
  interface Window {
    __FAINANCE_BOOT_ERROR__?: (title: string, detail: string) => void
    __FAINANCE_DISABLE_DOM_TRANSLATION__?: boolean
    __FAINANCE_DOM_GUARD_INSTALLED__?: boolean
  }
}

function isIOSCapacitorRuntime() {
  try {
    const href = String(window.location?.href || '')
    const protocol = String(window.location?.protocol || '')
    const ua = String(navigator.userAgent || '')
    const cap = (window as any).Capacitor
    const platform = cap && cap.getPlatform ? String(cap.getPlatform() || '') : ''
    return protocol === 'capacitor:' || /^capacitor:\/\//i.test(href) || platform === 'ios' || /iPad|iPhone|iPod/i.test(ua)
  } catch (_) {
    return false
  }
}

function installIOSDomGuard() {
  if (!isIOSCapacitorRuntime()) return
  window.__FAINANCE_DISABLE_DOM_TRANSLATION__ = true
  if (window.__FAINANCE_DOM_GUARD_INSTALLED__) return
  window.__FAINANCE_DOM_GUARD_INSTALLED__ = true

  try {
    const proto = Node && Node.prototype
    if (!proto) return

    const originalRemoveChild = proto.removeChild
    const originalInsertBefore = proto.insertBefore
    const originalReplaceChild = proto.replaceChild

    proto.removeChild = function<T extends Node>(child: T): T {
      try {
        if (child && child.parentNode !== this) return child
        return originalRemoveChild.call(this, child) as T
      } catch (error: any) {
        if (error && error.name === 'NotFoundError') return child
        throw error
      }
    }

    proto.insertBefore = function<T extends Node>(newChild: T, refChild: Node | null): T {
      try {
        if (refChild && refChild.parentNode !== this) return this.appendChild(newChild) as T
        return originalInsertBefore.call(this, newChild, refChild) as T
      } catch (error: any) {
        if (error && error.name === 'NotFoundError') return this.appendChild(newChild) as T
        throw error
      }
    }

    proto.replaceChild = function<T extends Node>(newChild: Node, oldChild: T): T {
      try {
        if (oldChild && oldChild.parentNode !== this) {
          this.appendChild(newChild)
          return oldChild
        }
        return originalReplaceChild.call(this, newChild, oldChild) as T
      } catch (error: any) {
        if (error && error.name === 'NotFoundError') {
          this.appendChild(newChild)
          return oldChild
        }
        throw error
      }
    }
  } catch (_) {}
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
    installIOSDomGuard()
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
