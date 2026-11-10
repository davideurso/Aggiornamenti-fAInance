import { useEffect } from 'react';
import { startAnalyticsFlow, finishAnalyticsFlow } from './firebaseAnalytics';

// Deferral prevents false funnel events during React StrictMode's mount replay.
export function useAnalyticsFlow(active: boolean, flow: string, method: string, operation = 'create') {
  useEffect(() => {
    if (!active) return;
    let started = false;
    const timer = setTimeout(() => {
      started = true;
      startAnalyticsFlow(flow, { method, operation });
    }, 0);
    return () => {
      clearTimeout(timer);
      if (started) finishAnalyticsFlow(flow, 'abandoned', { reason: 'navigation' });
    };
  }, [active, flow, method, operation]);
}
