import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import AppWithLogin from './app'

type BootErrorBoundaryProps = { children: React.ReactNode }
type BootErrorBoundaryState = { hasError: boolean; message: string }

function clearHiddenUiFlag() {
  try { document.documentElement.removeAttribute('data-fainance-i18n') } catch (e) {}
  try { document.body.style.opacity = '1' } catch (e) {}
}

function renderBootError(error: unknown) {
  clearHiddenUiFlag()
  const root = document.getElementById('root')
  if (!root) return
  const message = error instanceof Error ? error.message : String(error || 'Errore sconosciuto')
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%);font-family:system-ui,-apple-system,sans-serif;padding:24px;text-align:center;color:#333;">
      <div style="max-width:360px;background:#fff;border-radius:22px;padding:24px;box-shadow:0 8px 32px rgba(0,0,0,.12);">
        <div style="font-size:22px;font-weight:800;margin-bottom:8px;">fAInance</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:8px;color:#E24B4A;">Errore di avvio</div>
        <div style="font-size:13px;line-height:1.45;color:#666;">Chiudi completamente l’app e riaprila. Se il problema continua, invia questo dettaglio al supporto:</div>
        <div style="margin-top:12px;font-size:11px;line-height:1.35;color:#999;word-break:break-word;">${message.replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c] || c))}</div>
      </div>
    </div>`
}

class BootErrorBoundary extends Component<BootErrorBoundaryProps, BootErrorBoundaryState> {
  constructor(props: BootErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, message: '' }
  }
  static getDerivedStateFromError(error: unknown): BootErrorBoundaryState {
    return { hasError: true, message: error instanceof Error ? error.message : String(error || 'Errore sconosciuto') }
  }
  componentDidCatch(error: unknown) {
    clearHiddenUiFlag()
    console.error('fAInance boot render error', error)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'linear-gradient(160deg,#f0edff 0%,#e8f4ff 100%)',fontFamily:'system-ui,-apple-system,sans-serif',padding:24,textAlign:'center',color:'#333'}}>
          <div style={{maxWidth:360,background:'#fff',borderRadius:22,padding:24,boxShadow:'0 8px 32px rgba(0,0,0,.12)'}}>
            <div style={{fontSize:22,fontWeight:800,marginBottom:8}}>fAInance</div>
            <div style={{fontSize:15,fontWeight:700,marginBottom:8,color:'#E24B4A'}}>Errore di avvio</div>
            <div style={{fontSize:13,lineHeight:1.45,color:'#666'}}>Chiudi completamente l’app e riaprila. Se il problema continua, invia questo dettaglio al supporto:</div>
            <div style={{marginTop:12,fontSize:11,lineHeight:1.35,color:'#999',wordBreak:'break-word'}}>{this.state.message}</div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

clearHiddenUiFlag()
window.addEventListener('error', function(event) {
  console.error('fAInance global error', event.error || event.message)
})
window.addEventListener('unhandledrejection', function(event) {
  console.error('fAInance unhandled rejection', event.reason)
})

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) throw new Error('Elemento root non trovato')
  createRoot(rootElement).render(
    <StrictMode>
      <BootErrorBoundary>
        <AppWithLogin />
      </BootErrorBoundary>
    </StrictMode>
  )
} catch (error) {
  renderBootError(error)
}
