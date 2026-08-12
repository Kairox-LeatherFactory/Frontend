'use client';

import { useEffect } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

export default function DashboardError({ error, reset }) {
  useEffect(() => {
    console.error('Dashboard Error Caught:', error);
  }, [error]);

  return (
    <div className="w-full min-h-screen p-4 sm:p-8 bg-red-950 text-white flex flex-col items-center justify-center font-sans z-[99999] relative">
      <div className="max-w-3xl w-full bg-red-900/80 border-2 border-red-500 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 backdrop-blur-md">
        <div className="flex items-center gap-4 border-b border-red-700/60 pb-4">
          <div className="p-3 bg-red-600/30 rounded-2xl border border-red-400/40">
            <AlertTriangle className="w-8 h-8 text-red-300" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-wide text-red-100 uppercase">
              Dashboard Component Crash Detected
            </h1>
            <p className="text-xs sm:text-sm font-medium text-red-300">
              An uncaught runtime exception occurred inside this route.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-red-300">Error Message</h2>
          <div className="bg-black/70 p-4 rounded-xl border border-red-800 text-red-200 font-mono text-sm break-words overflow-x-auto">
            {error?.message || String(error) || 'Unknown runtime error'}
          </div>
        </div>

        {error?.stack && (
          <div className="space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-red-300">Stack Trace</h2>
            <pre className="bg-black/90 p-4 rounded-xl border border-red-900 text-red-400 font-mono text-xs overflow-x-auto max-h-60 whitespace-pre-wrap break-all">
              {error.stack}
            </pre>
          </div>
        )}

        <div className="pt-4 flex flex-wrap gap-4 items-center justify-between border-t border-red-800/80">
          <button
            onClick={() => reset()}
            className="px-6 py-3 bg-red-600 hover:bg-red-500 active:scale-95 text-white font-bold rounded-xl text-sm flex items-center gap-2 transition-all shadow-lg cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            Re-render Route
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white/10 hover:bg-white/20 active:scale-95 text-red-200 font-bold rounded-xl text-sm transition-all border border-red-500/30 cursor-pointer"
          >
            Hard Reload Page
          </button>
        </div>
      </div>
    </div>
  );
}
