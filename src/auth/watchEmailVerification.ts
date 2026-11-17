import type { Auth, User } from 'firebase/auth';

// Same foreground/retry protocol as Mundely's approved VerifyEmailScreen.
export function watchEmailVerification(auth: Auth, user: User, onVerified: () => void, nativeApp?: any) {
  let disposed = false, foreground = true, inFlight = false, completed = false;
  let retries: number[] = [];
  async function check() {
    if (disposed || completed || !foreground || document.visibilityState !== 'visible' || inFlight || auth.currentUser?.uid !== user.uid) return;
    inFlight = true;
    try {
      await user.reload();
      if (!disposed && auth.currentUser?.uid === user.uid && user.emailVerified) {
        await user.getIdToken(true);
        if (!disposed && auth.currentUser?.uid === user.uid) { completed = true; onVerified(); }
      }
    } catch { /* A later foreground retry recovers transient failures. */ }
    finally { inFlight = false; }
  }
  function resume() {
    retries.forEach(window.clearTimeout); retries = [];
    if (disposed || !foreground || document.visibilityState !== 'visible') return;
    void check();
    retries = [1000, 2500, 5000].map(delay => window.setTimeout(check, delay));
  }
  const interval = window.setInterval(check, 10000);
  ['focus', 'pageshow', 'online'].forEach(event => window.addEventListener(event, resume));
  document.addEventListener('visibilitychange', resume);
  const native = nativeApp ? nativeApp.addListener('appStateChange', (state: {isActive: boolean}) => { foreground = state.isActive; resume(); }).catch(() => null) : null;
  resume();
  return () => {
    disposed = true; retries.forEach(window.clearTimeout); window.clearInterval(interval);
    ['focus', 'pageshow', 'online'].forEach(event => window.removeEventListener(event, resume));
    document.removeEventListener('visibilitychange', resume);
    void native?.then((handle: any) => handle?.remove());
  };
}
