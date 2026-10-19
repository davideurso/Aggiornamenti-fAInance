import { useEffect, useState } from 'react';
import { INTERNAL_DESTINATIONS, readNotificationMedia, safeMediaUrl } from '../../functions/notificationMedia.mjs';

export type NotificationMedia = { videoUrl?: string; screenshotUrl?: string; previewUrl?: string; destination?: string };

export function openNotificationDestination(value: unknown): boolean {
  const media = readNotificationMedia(value);
  if (!media?.destination) return false;
  window.dispatchEvent(new CustomEvent('fainance:notification-destination', { detail: { destination: media.destination } }));
  return true;
}

export function NotificationMediaView({ value, dark = false, onNavigate, L = (s: string) => s }: {
  value?: unknown; dark?: boolean; onNavigate?: () => void; L?: (s: string) => string;
}) {
  const media = readNotificationMedia(value);
  const preview = safeMediaUrl(media?.previewUrl || '');
  const [failed, setFailed] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => { setFailed(false); setShowPreview(false); }, [preview]);
  if (!media) return null;
  const link = { color: dark ? '#8CC6FF' : '#245B8E', fontSize: 12, overflowWrap: 'anywhere' as const };
  return <div className="notification-media" style={{ display: 'grid', gap: 8, marginTop: 10, flex: '1 0 100%', minWidth: 0 }}>
    {preview && !failed && (showPreview
      ? <img src={preview} alt={L('Anteprima della notifica')} referrerPolicy="no-referrer" loading="lazy" onError={() => setFailed(true)} style={{ maxWidth: '100%', maxHeight: 180, objectFit: 'contain', borderRadius: 12 }} />
      : <button type="button" style={{ ...link, background: dark ? '#031A3D' : '#EEF4FA', border: `1px solid ${dark ? '#29455F' : '#D8E1EA'}`, borderRadius: 10, padding: 9, cursor: 'pointer' }} onClick={() => setShowPreview(true)}>{L('Mostra anteprima')}</button>)}
    {failed && <span style={link}>{L('Anteprima non disponibile')}</span>}
    {(['videoUrl', 'screenshotUrl'] as const).map(key => media[key] && <a key={key} href={media[key]} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" style={link}>{L(key === 'videoUrl' ? 'Guarda il video tutorial' : 'Apri screenshot')} ↗ <small>({new URL(media[key]).hostname})</small></a>)}
    {media.destination && onNavigate && <button type="button" onClick={onNavigate} style={{ ...link, background: dark ? '#031A3D' : '#EEF4FA', border: `1px solid ${dark ? '#29455F' : '#D8E1EA'}`, borderRadius: 10, padding: 9, textAlign: 'left' }}>{L('Apri sezione')}: {L(INTERNAL_DESTINATIONS[media.destination])} →</button>}
  </div>;
}

export function NotificationMediaEditor({ value, onChange, dark = false, L = (s: string) => s }: {
  value: NotificationMedia; onChange: (value: NotificationMedia) => void; dark?: boolean; L?: (s: string) => string;
}) {
  const input = { width: '100%', minWidth: 0, boxSizing: 'border-box' as const, padding: 10, borderRadius: 10, border: `1px solid ${dark ? '#29455F' : '#D8E1EA'}`, color: dark ? '#F4F7FB' : '#14263D', background: dark ? '#10243A' : '#FFFFFF' };
  return <fieldset style={{ border: `1px solid ${dark ? '#29455F' : '#D8E1EA'}`, borderRadius: 12, margin: '12px 0', padding: 12, minWidth: 0, color: dark ? '#F4F7FB' : '#14263D' }}>
    <legend>{L('Video, screenshot e collegamenti (facoltativi)')}</legend>
    <div style={{ display: 'grid', gap: 10 }}>
      {(['videoUrl', 'screenshotUrl', 'previewUrl'] as const).map((key, index) => <label key={key} style={{ fontSize: 12 }}>{L(['Link video tutorial', 'Link screenshot', 'Link immagine di anteprima'][index])}<input type="url" value={value[key] || ''} maxLength={1500} placeholder="https://" onChange={e => onChange({ ...value, [key]: e.target.value })} style={input} /></label>)}
      <label style={{ fontSize: 12 }}>{L('Sezione interna')}<select aria-label={L('Sezione interna')} value={value.destination || ''} onChange={e => onChange({ ...value, destination: e.target.value })} style={input}><option value="">{L('Nessuna')}</option>{Object.entries(INTERNAL_DESTINATIONS).map(([key, label]) => <option key={key} value={key}>{L(String(label))}</option>)}</select></label>
      <small>{L('Link comuni a tutte le lingue. Le anteprime esterne si caricano solo su richiesta; usa un link diretto a una immagine.')}</small>
    </div>
    <NotificationMediaView value={value} dark={dark} L={L} onNavigate={value.destination ? () => undefined : undefined} />
  </fieldset>;
}
