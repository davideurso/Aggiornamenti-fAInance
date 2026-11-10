// Local, bounded timing diagnostics only. No account data and no network calls.
export type StartupPhase = 'bundle_ready' | 'auth_role_ready' | 'account_session_ready' |
  'account_data_ready' | 'widget_voice_requested' | 'voice_screen_ready' |
  'auth_started' | 'account_load_started' | 'local_ready' | 'snapshot_received';

type Span = 'profile' | 'account' | 'session_decode' | 'catalog_fetch' | 'A3' | 'A4' | 'A5' | 'A6' | 'A7';
export function startStartupSpan(name: Span): () => void {
  try {
    if (typeof window === 'undefined') return () => {};
    const host = window as any;
    if (host.__FAINANCE_STARTUP_FINISHED__) return () => {};
    const start = performance.now();
    let ended = false;
    return () => {
      try {
        if (ended || host.__FAINANCE_STARTUP_FINISHED__) return;
        ended = true;
        const spans = host.__FAINANCE_STARTUP_SPANS__ || [];
        spans.push({ name, startMs: Math.round(start), durationMs: Math.round(performance.now() - start) });
        host.__FAINANCE_STARTUP_SPANS__ = spans.slice(-64);
      } catch {}
    };
  } catch { return () => {}; }
}
export async function measureStartup<T>(name: Span, promise: Promise<T>): Promise<T> {
  const end = startStartupSpan(name);
  try { return await promise; } finally { end(); }
}

export function markStartupPhase(phase: StartupPhase): void {
  try {
    if (typeof window === 'undefined' || typeof performance === 'undefined') return;
    const host = window as any;
    if (host.__FAINANCE_STARTUP_FINISHED__) return;
    const events = host.__FAINANCE_STARTUP_TIMINGS__ || [];
    events.push({ phase, elapsedMs: Math.round(performance.now()) });
    host.__FAINANCE_STARTUP_TIMINGS__ = events.slice(-64);
    if (phase === 'account_data_ready') host.__FAINANCE_STARTUP_FINISHED__ = true;
  } catch { /* Timing must never interfere with startup. */ }
}

export function startupReport(): { total: number | null; rows: { label: string; seconds: number | null }[] } {
  const host = typeof window === 'undefined' ? {} : window as any;
  const events = host.__FAINANCE_STARTUP_TIMINGS__ || [];
  const spans = host.__FAINANCE_STARTUP_SPANS__ || [];
  const at = (name: string): number | null => events.find((e: any) => e.phase === name)?.elapsedMs ?? null;
  const gap = (a: string, b: string) => at(a) === null || at(b) === null ? null : Math.max(0, (at(b)! - at(a)!) / 1000);
  const span = (name: string) => {
    const matches = spans.filter((s: any) => s.name === name);
    return matches.length ? matches.reduce((sum: number, s: any) => sum + s.durationMs, 0) / 1000 : null;
  };
  const start = at('snapshot_received'), finish = at('account_data_ready');
  let applying: number | null = null;
  if (start !== null && finish !== null) {
    const intervals = spans.filter((s: any) => /^A[3-7]$/.test(s.name))
      .map((s: any) => [Math.max(start, s.startMs), Math.min(finish, s.startMs + s.durationMs)])
      .filter((range: number[]) => range[1] > range[0]).sort((a: number[], b: number[]) => a[0] - b[0]);
    let end = start, waiting = 0;
    for (const range of intervals) { waiting += Math.max(0, range[1] - Math.max(end, range[0])); end = Math.max(end, range[1]); }
    applying = Math.max(0, finish - start - waiting) / 1000;
  }
  return { total: at('account_data_ready') === null ? null : at('account_data_ready')! / 1000, rows: [
    {label:'Preparazione iniziale',seconds:at('bundle_ready') === null ? null : at('bundle_ready')! / 1000},
    {label:'Ripristino accesso',seconds:gap('bundle_ready','auth_started')},
    {label:'Verifica accesso',seconds:gap('auth_started','auth_role_ready')},
    {label:'Profilo utente',seconds:span('profile')},
    {label:'Lettura account',seconds:span('account')},
    {label:'Preparazione sessione',seconds:gap('auth_role_ready','account_session_ready')},
    {label:'Dati locali',seconds:gap('account_load_started','local_ready')},
    {label:'Attesa dati account',seconds:gap('local_ready','snapshot_received')},
    {label:'Decodifica dati',seconds:span('A3')},
    {label:'Lettura categorie',seconds:span('catalog_fetch')},
    {label:'Attesa categorie',seconds:span('A4')},
    {label:'Recupero backup',seconds:span('A5')},
    {label:'Dati protetti',seconds:span('A6')},
    {label:'Applicazione dati e schermata',seconds:applying},
    {label:'Caricamento dati totale',seconds:gap('account_load_started','account_data_ready')},
  ]};
}
