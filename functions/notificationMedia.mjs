// Shared by the callable and clients. Never fetch arbitrary URLs on the server.
export const INTERNAL_DESTINATIONS = Object.freeze({
  home: 'Home', spese: 'Movimenti', history: 'Storico', budget: 'Budget',
  tools: 'Tool', share: 'Share', settings: 'Impostazioni',
});

export function safeMediaUrl(value) {
  if (typeof value !== 'string' || !value || value.length > 1500 || value !== value.trim()) return '';
  if (/[\s\\\u0000-\u001f\u007f]/.test(value)) return '';
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    // Public HTTPS only: exclude credentials, custom ports, IPs and local names.
    if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) return '';
    if (!/^(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,63}$/.test(host)) return '';
    if (/\.(localhost|local|internal|test|invalid|example)$/.test(host) || host === 'localhost') return '';
    return url.href;
  } catch { return ''; }
}

export function normalizeNotificationMedia(raw) {
  if (raw == null) return undefined;
  if (typeof raw !== 'object' || Array.isArray(raw)) throw new Error('Contenuti multimediali non validi.');
  const out = {};
  for (const key of ['videoUrl', 'screenshotUrl', 'previewUrl']) {
    if (raw[key] == null || raw[key] === '') continue;
    const url = safeMediaUrl(raw[key]);
    if (!url) throw new Error('Usa link HTTPS pubblici validi, senza credenziali o porte personalizzate.');
    out[key] = url;
  }
  if (raw.destination != null && raw.destination !== '') {
    if (typeof raw.destination !== 'string' || !Object.prototype.hasOwnProperty.call(INTERNAL_DESTINATIONS, raw.destination)) {
      throw new Error('Destinazione interna non valida.');
    }
    out.destination = raw.destination;
  }
  return Object.keys(out).length ? out : undefined;
}

export function readNotificationMedia(value) {
  try { return normalizeNotificationMedia(typeof value === 'string' ? JSON.parse(value) : value); }
  catch { return undefined; }
}
