import { useLayoutEffect } from 'react';
import { PremiumProfileIcon } from './release215';
import './summaryLayer.css';

export function AppViewport() {
  useLayoutEffect(() => {
    const root = document.documentElement;
    let restingHeight = 0;
    let viewportWidth = 0;
    let frame = 0;
    let appliedHeight = -1;
    let appliedTop = -1;
    const editable = 'textarea:not([readonly]), input:not([readonly]):is(:not([type]), [type="text"], [type="number"], [type="search"], [type="email"], [type="url"], [type="tel"], [type="password"]), [contenteditable]:not([contenteditable="false"])';
    const update = () => {
      const vv = window.visualViewport;
      const height = vv?.height || window.innerHeight;
      const width = window.innerWidth;
      const editing = document.activeElement?.matches(editable);
      if (width !== viewportWidth) {
        viewportWidth = width;
        restingHeight = 0;
      }
      const keyboard = Math.abs((vv?.scale ?? 1) - 1) < 0.01 &&
        (editing || root.hasAttribute('data-app-keyboard')) && restingHeight - height > 120;
      if (!keyboard && (!editing || !restingHeight || height > restingHeight)) restingHeight = height;
      if (root.hasAttribute('data-app-keyboard') !== keyboard) root.toggleAttribute('data-app-keyboard', keyboard);
      if (height !== appliedHeight) {
        appliedHeight = height;
        root.style.setProperty('--app-viewport-height', height + 'px');
      }
      const top = vv?.offsetTop || 0;
      if (top !== appliedTop) {
        appliedTop = top;
        root.style.setProperty('--app-viewport-top', top + 'px');
      }
    };
    const afterFocus = (event: FocusEvent) => {
      if (!(event.target instanceof Element && event.target.matches(editable)) && !root.hasAttribute('data-app-keyboard')) return;
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('resize', update);
    window.visualViewport?.addEventListener('resize', update);
    window.visualViewport?.addEventListener('scroll', update);
    document.addEventListener('focusin', afterFocus);
    document.addEventListener('focusout', afterFocus);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('resize', update);
      window.visualViewport?.removeEventListener('scroll', update);
      document.removeEventListener('focusin', afterFocus);
      document.removeEventListener('focusout', afterFocus);
      root.removeAttribute('data-app-keyboard');
      root.style.removeProperty('--app-viewport-height');
      root.style.removeProperty('--app-viewport-top');
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
