'use client';
import { useEffect } from 'react';
import { log } from '@/lib/logger';

// Last-resort boundary for crashes in the root layout; reports to Better Stack.
export default function GlobalError({ error, reset }) {
  useEffect(() => {
    log.error('Root layout crashed', {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
    });
    log.flush();
  }, [error]);

  return (
    <html lang="en">
      <body style={{ fontFamily: 'sans-serif', padding: 40, textAlign: 'center' }}>
        <h2>Something went wrong.</h2>
        <button onClick={() => reset()} style={{ marginTop: 16, padding: '8px 16px' }}>
          Try again
        </button>
      </body>
    </html>
  );
}
