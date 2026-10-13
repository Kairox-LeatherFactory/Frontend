'use client';
import { useEffect } from 'react';
import { log } from '@/lib/logger';

// Catches render errors in any page and reports them to Better Stack.
export default function Error({ error, reset }) {
  useEffect(() => {
    log.error('Page render error', {
      message: error?.message,
      digest: error?.digest,
      stack: error?.stack,
      page: window.location.pathname,
    });
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-10 text-center">
      <h2 className="text-xl font-bold">Something went wrong.</h2>
      <button onClick={() => reset()} className="rounded bg-[#0f172a] px-4 py-2 text-white">
        Try again
      </button>
    </div>
  );
}
