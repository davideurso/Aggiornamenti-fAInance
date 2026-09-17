import { useEffect, useId, useRef, useState } from 'react';
import { useApp } from '../core';
import { periodForDate, periodLabel, type PeriodSettings } from '../finance/periodEngine';
import { periodText } from '../i18n/periodTranslations';
import { cloudSavedMessages } from '../i18n/financeMessages';

export function PeriodPreferences({ introduction = false, embedded = false }: { introduction?: boolean; embedded?: boolean }) {
  const ctx: any = useApp();
  const current = ctx.financeEvolution.period as PeriodSettings;
  const [draft, setDraft] = useState(current);
  const [saved, setSaved] = useState(false);
  const id = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!introduction) return;
    const previous = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLElement>('select,button')?.focus();
    return () => { if (previous?.isConnected) previous.focus(); };
  }, [introduction]);
  useEffect(() => { setDraft(current); }, [current.mode, current.startDay]);
  const T = (key: Parameters<typeof periodText>[1]) => periodText(ctx.lang || 'it', key);
  const preview = periodForDate(new Date(), draft);
  const color = ctx.confirmButtonColor || '#378ADD';
  function save(settings: PeriodSettings) {
    ctx.setFinanceEvolution(previous => ({ ...previous, period: settings, periodIntroductionSeen: true }));
    setSaved(true);
  }
  const card = <section aria-label={T('title')} style={{ background: ctx.cardBg, color: ctx.textC, border: embedded ? undefined : `1px solid ${ctx.borderC}`, borderRadius: 14, padding: embedded ? 0 : 18, maxWidth: embedded ? undefined : 600, width: '100%', boxSizing: 'border-box' }}>
    {!embedded && <h2 id={id} style={{ fontSize: 17, margin: '0 0 14px' }}>{T('title')}</h2>}
    <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:6}}>
      <label htmlFor={`${id}-mode`} style={{ fontSize:13,fontWeight:700 }}>{T('type')}</label>
      {embedded && <details style={{fontSize:12,color:ctx.subC}}><summary aria-label={T('title')} style={{cursor:'pointer'}}>ⓘ</summary><p>{T('hint')} {T('retroactive')}</p></details>}
    </div>
    <select id={`${id}-mode`} value={draft.mode} onChange={event => { setSaved(false); setDraft({ mode: event.target.value as PeriodSettings['mode'], startDay: event.target.value === 'calendar' ? 1 : 27 }); }} style={{ ...ctx.inp, width: '100%' }}>
      <option value="calendar">{T('calendar')}</option><option value="financial">{T('financial')}</option>
    </select>
    {draft.mode === 'financial' && <>
      <label htmlFor={`${id}-day`} style={{ display: 'block', margin: '12px 0 8px' }}>{T('day')}</label>
      <select id={`${id}-day`} value={draft.startDay} onChange={event => { setSaved(false); setDraft({ ...draft, startDay: Number(event.target.value) }); }} style={{ ...ctx.inp, width: '100%' }}>
        {Array.from({ length: 31 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </select>
      {!embedded && <p style={{ fontSize: 13, lineHeight: 1.5, color: ctx.subC }}>{T('hint')}</p>}
    </>}
    <div style={{marginTop:10,marginBottom:10,padding:'9px 11px',borderRadius:10,background:ctx.dark?'#252535':'#F7F7FA',border:`1px solid ${ctx.borderC}`}}><strong style={{fontSize:12,textTransform:'capitalize'}}>{periodLabel(preview.key, ctx.lang || 'it')}</strong><div style={{fontSize:11,color:ctx.subC,marginTop:2}}>{preview.start} → {preview.end}</div></div>
    {!embedded && <p style={{ fontSize: 13, lineHeight: 1.5, color: ctx.subC }}>{T('retroactive')}</p>}
    <button type="button" onClick={() => save(draft)} style={{ width: '100%', padding: 12, border: 0, borderRadius: ctx.btnRadius || 12, color: '#fff', background: color, cursor: 'pointer', fontWeight: 700 }}>{T('save')}</button>
    {introduction && <button type="button" onClick={() => save(current)} style={{ width: '100%', marginTop: 8, padding: 12, borderRadius: ctx.btnRadius || 12, border: `1px solid ${ctx.borderC}`, background: 'transparent', color: ctx.textC, cursor: 'pointer' }}>{T('keep')}</button>}
    {saved && <p role="status" style={{ marginBottom: 0 }}>{T('saved')}</p>}
    {ctx.financeCloudSynced && <p role="status" style={{ fontSize:12, color:ctx.subC, marginBottom:0 }}>{cloudSavedMessages[ctx.lang] || cloudSavedMessages.en}</p>}
  </section>;
  return introduction ? <div ref={dialog} role="dialog" aria-modal="true" aria-labelledby={id} onKeyDown={event => {
    if (event.key !== 'Tab') return;
    const nodes = Array.from(dialog.current?.querySelectorAll<HTMLElement>('select,button') || []);
    const first = nodes[0], last = nodes[nodes.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  }} style={{ position: 'fixed', inset: 0, zIndex: 12000, background: '#0008', display: 'flex', alignItems: 'safe center', justifyContent: 'center', padding: 20, overflowY: 'auto' }}>{card}</div> : card;
}
