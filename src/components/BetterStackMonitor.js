'use client';
import { useEffect } from 'react';
import { log } from '@/lib/logger';

// Reports uncaught errors, unhandled promise rejections and failed backend
// calls to Better Stack. api.js makes hundreds of separate fetch calls, so
// failed `/api/v1` responses are caught here once instead of in each one.
export default function BetterStackMonitor() {
  useEffect(() => {
    function handleError(event) {
      log.error('Uncaught error', {
        message: event.message,
        source: event.filename,
        line: event.lineno,
        stack: event.error?.stack,
        page: window.location.pathname,
      });
    }

    function handleRejection(event) {
      const reason = event.reason;
      log.error('Unhandled promise rejection', {
        message: reason?.message ?? String(reason),
        stack: reason?.stack,
        page: window.location.pathname,
      });
    }

    const originalFetch = window.fetch;
    window.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url ?? String(input);
      const tracked = url.includes('/api/v1/');
      const startedAt = performance.now();
      try {
        const res = await originalFetch(input, init);
        if (tracked && !res.ok) {
          log.warn('API request failed', {
            url: url.split('?')[0],
            method: init?.method || 'GET',
            status: res.status,
            durationMs: Math.round(performance.now() - startedAt),
            page: window.location.pathname,
          });
        }
        return res;
      } catch (err) {
        if (tracked) {
          log.error('API request network error', {
            url: url.split('?')[0],
            method: init?.method || 'GET',
            message: err?.message,
            page: window.location.pathname,
          });
        }
        throw err;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);
    return () => {
      window.fetch = originalFetch;
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return null;
}
