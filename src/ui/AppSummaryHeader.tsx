import { useLayoutEffect } from 'react';
import { PremiumProfileIcon } from './release215';
import './summaryLayer.css';

export function AppViewport() {
  useLayoutEffect(() => {
    const update = () => {
      const vv = window.visualViewport;
      document.documentElement.style.setProperty('--app-viewport-height', (vv?.height || window.innerHeight) + 'px');
      document.documentElement.style.setProperty('--app-viewport-top', (vv?.offsetTop || 0) + 'px');
    };
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    return () => {
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      document.documentElement.style.removeProperty('--app-viewport-height');
      document.documentElement.style.removeProperty('--app-viewport-top');
    };
  }, []);
  return null;
}

export function AppSummaryHeader({ values, actionsRef, background, border, subtle }: any) {
  return <header data-app-summary="true" className="fainance-summary-bar" style={{ background, borderBottom: '1px solid ' + border }}>
    {values.map(([label, value, color]: any) => <div key={label} data-summary-value="true" style={{ minWidth: 0, textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: subtle, whiteSpace: 'nowrap' }}>{label}</div>
      <div style={{ fontSize: 'clamp(14px,4.5vw,19px)', fontWeight: 600, color, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>)}
    <div ref={actionsRef} data-summary-slot="true" style={{ display: 'flex', alignItems: 'center', minWidth: 73 }} />
  </header>;
}

export function SummaryActions({ dark, style, count, translate, onProfile, onNotifications, background }: any) {
  return <div data-summary-actions="true" style={{ display: 'flex', gap: 5, alignItems: 'center', flexShrink: 0 }}>
    <button type="button" aria-label={translate('Apri profilo')} onClick={onProfile} style={style}><PremiumProfileIcon dark={dark} /></button>
    <button type="button" aria-label={translate('Apri centro notifiche')} onClick={onNotifications} style={{ ...style, fontSize: 17 }}>🔔
      {count > 0 && <span style={{ position: 'absolute', right: -3, top: -4, minWidth: 17, height: 17, padding: '0 3px', borderRadius: 999, background: '#B63B45', color: '#FFFFFF', border: '2px solid ' + background, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 950, boxSizing: 'border-box' }}>{count > 99 ? '99+' : count}</span>}
    </button>
  </div>;
}
