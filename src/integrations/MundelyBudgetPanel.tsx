import { useEffect, useState, type CSSProperties } from 'react';
import { useApp, fbAuth } from '../core';
import { Btn, FainancePickerModal, MultiCurrencyField } from '../widget';
import { isMundelyBridgeEnabled, readMundelyTripFinance, saveMundelyTripFinance, mundelyBudgetConsumption, type MundelyTripFinance } from './mundelyBridge';
import { mundelyBudgetText } from '../i18n/mundelyBudgetText';

export function MundelyBudgetPanel({ tripId, inputStyle }: { tripId: string; inputStyle: CSSProperties }) {
  const ctx = useApp();
  const text = (key: string) => mundelyBudgetText(ctx.lang, key);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState<MundelyTripFinance | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [editor, setEditor] = useState<{ section: string; value: any; id?: string } | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [totals, setTotals] = useState<Record<string, number | null>>({});
  const uid = fbAuth.currentUser?.uid || '';
  useEffect(() => { setOpen(false); setSnapshot(null); setEditor(null); setDeleting(null); }, [tripId, uid]);
  useEffect(() => {
    if (!open) return;
    let live = true; setBusy(true); setError(false);
    void readMundelyTripFinance(tripId).then(value => { if (live) setSnapshot(value); }).catch(() => { if (live) setError(true); }).finally(() => { if (live) setBusy(false); });
    return () => { live = false; };
  }, [open, tripId, uid]);
  useEffect(() => {
    let live = true; setTotals({});
    if (snapshot) void Promise.all(['commonBudget', 'individualBudget'].map(async section => [section, await mundelyBudgetConsumption(snapshot, section)] as const)).then(values => { if (live) setTotals(Object.fromEntries(values)); });
    return () => { live = false; };
  }, [snapshot]);
  if (!isMundelyBridgeEnabled() || !tripId) return null;
  const personal = snapshot?.sections.personalExpenses.data || [];
  const money = (value: number | null | undefined, currency: string) => value == null ? text('unavailable') : new Intl.NumberFormat(ctx.lang, { style: 'currency', currency }).format(value);
  async function persist(section: string, data: unknown) {
    if (!snapshot || busy || snapshot.archived) return;
    const session = uid; setBusy(true); setError(false);
    try {
      const result = await saveMundelyTripFinance(snapshot, section, data);
      if (fbAuth.currentUser?.uid !== session) return;
      setSnapshot(result); setEditor(null); setDeleting(null);
    } catch { setError(true); } finally { if (fbAuth.currentUser?.uid === session) setBusy(false); }
  }
  function saveEditor() {
    if (!editor || !snapshot) return;
    const now = new Date().toISOString();
    if (editor.section !== 'personalExpenses') { void persist(editor.section, { ...editor.value, amount: Number(editor.value.amount), updatedAt: now }); return; }
    const decimals = new Intl.NumberFormat("en", { style: "currency", currency: editor.value.currency }).resolvedOptions().maximumFractionDigits || 0;
    const scale = 10 ** decimals;
    const amount = Math.round((Number(editor.value.amount) + Number.EPSILON) * scale) / scale;
    const row = { ...editor.value, id: editor.id || crypto.randomUUID(), scope: 'personal', ownerUid: snapshot.uid, payerId: snapshot.uid,
      amount, splitMode: 'equal', split: [{ participantId: snapshot.uid, participantName: editor.value.payer || snapshot.uid, value: 1, amount }], createdAt: editor.value.createdAt || now, updatedAt: now };
    void persist('personalExpenses', [row, ...personal.filter((item: any) => item.id !== row.id)]);
  }
  return <>
    <Btn onClick={() => setOpen(true)} bg={ctx.secondaryButtonColor}>{text('title')}</Btn>
    <FainancePickerModal open={open} title={text('title')} onClose={() => { if (!busy) setOpen(false); }}>
      <div style={{ color: ctx.dark ? '#eee' : '#333', display: 'grid', gap: 12 }}>
      {busy && <p role="status">{text('loading')}</p>}
      {error && <p role="alert">{text('error')}</p>}
      {snapshot && <>
        {['commonBudget', 'individualBudget'].map(section => {
          const budget = snapshot.sections[section].data;
          const currency = budget?.currency || ctx.currency || 'EUR';
          return <section key={section} style={{ marginBottom: 16 }}>
            <h3>{text(section)}</h3>
            <p>{text(section === 'commonBudget' ? 'commonBody' : 'privateBody')}</p>
            {budget ? <p>{text('planned')}: {money(budget.amount, currency)} · {text('used')}: {money(totals[section], currency)} · {text('remaining')}: {money(totals[section] == null ? null : budget.amount - Number(totals[section]), currency)}</p> : <p>{text('notSet')}</p>}
            {!snapshot.archived && (section !== 'commonBudget' || snapshot.organizer) && <Btn bg={ctx.secondaryButtonColor} onClick={() => setEditor({ section, value: budget || { amount: 0, currency, categories: {}, updatedAt: '' } })}>{text('edit')}</Btn>}
          </section>;
        })}
        <h3>{text('notebook')}</h3>
        {snapshot.commonExpenses.map(item => {
          const amount = Array.isArray(item.split) ? item.split.filter((row: any) => row.participantId === snapshot.uid).reduce((sum: number, row: any) => sum + Number(row.amount), 0) : null;
          return amount === 0 ? null : <p key={'group-'+item.id}>{item.title} · {text('ownShare')} · {money(amount, item.currency)}</p>;
        })}
        {personal.map((item: any) => <div key={item.id} style={{ marginBottom: 8 }}><p>{item.title} · {text('personal')} · {money(item.amount, item.currency)}</p>
          {!snapshot.archived && <><Btn bg={ctx.secondaryButtonColor} onClick={() => setEditor({ section: 'personalExpenses', value: item, id: item.id })}>{text('edit')}</Btn> <Btn bg={ctx.secondaryButtonColor} onClick={() => setDeleting(item.id)}>{text('delete')}</Btn></>}
        </div>)}
        {!snapshot.archived && <Btn bg={ctx.confirmButtonColor} onClick={() => setEditor({ section: 'personalExpenses', value: { title: '', amount: '', currency: ctx.currency || 'EUR', date: snapshot.startDate || new Date().toISOString().slice(0,10), category: 'other' } })}>{text('addPersonal')}</Btn>}
      </>}
      </div>
    </FainancePickerModal>
    <FainancePickerModal open={Boolean(editor)} title={text(editor?.section === 'personalExpenses' ? 'personal' : editor?.section || 'title')} onClose={() => { if (!busy) setEditor(null); }}>
      {editor && <div style={{ color: ctx.dark ? '#eee' : '#333', display: 'grid', gap: 12 }}>
        {editor.section === 'personalExpenses' && <label>{text('description')}<input style={inputStyle} value={editor.value.title} onChange={event => setEditor({ ...editor, value: { ...editor.value, title: event.target.value } })} /></label>}
        <label>{text('amount')}<input style={inputStyle} type="number" min="0" step="0.01" value={editor.value.amount} onChange={event => setEditor({ ...editor, value: { ...editor.value, amount: event.target.value } })} /></label>
        <MultiCurrencyField value={editor.value} amount={Number(editor.value.amount)} onChange={(patch: any) => setEditor({ ...editor, value: { ...editor.value, currency: patch.currency || editor.value.currency } })} compact />
        {editor.section === 'personalExpenses' && <label>{text('date')}<input style={inputStyle} type="date" min={snapshot?.startDate} max={snapshot?.endDate} value={editor.value.date} onChange={event => setEditor({ ...editor, value: { ...editor.value, date: event.target.value } })} /></label>}
        {error && <p role="alert">{text('error')}</p>}
        <Btn bg={ctx.confirmButtonColor} disabled={busy} onClick={saveEditor}>{text('save')}</Btn>
      </div>}
    </FainancePickerModal>
    <FainancePickerModal open={Boolean(deleting)} title={text('delete')} onClose={() => { if (!busy) setDeleting(null); }}>
      <p style={{ color: ctx.dark ? '#eee' : '#333' }}>{text('confirmDelete')}</p><Btn disabled={busy} bg={ctx.confirmButtonColor} onClick={() => void persist('personalExpenses', personal.filter((item: any) => item.id !== deleting))}>{text('delete')}</Btn>
    </FainancePickerModal>
  </>;
}
