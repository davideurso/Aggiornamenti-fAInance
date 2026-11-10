import { useEffect, useRef } from 'react';
import { createPendingVoiceLaunch } from './pendingVoiceLaunch';

export function usePendingVoiceLaunch(isReady: () => boolean, open: () => void) {
  const latest = useRef({ isReady, open });
  latest.current = { isReady, open };
  const controller = useRef<ReturnType<typeof createPendingVoiceLaunch> | null>(null);
  if (!controller.current) controller.current = createPendingVoiceLaunch({
    isReady: () => !document.hidden && latest.current.isReady(),
    open: () => latest.current.open(),
    schedule: callback => requestAnimationFrame(callback),
    cancel: handle => cancelAnimationFrame(handle),
  });
  useEffect(() => { controller.current!.notify(); });
  useEffect(() => {
    const notify = () => controller.current!.notify();
    document.addEventListener('visibilitychange', notify);
    return () => {
      document.removeEventListener('visibilitychange', notify);
      controller.current!.dispose();
    };
  }, []);
  return controller.current.request;
}
