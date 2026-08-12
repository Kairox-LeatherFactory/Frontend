'use client';
import { AlertCircle } from 'lucide-react';

export default function Error({ error, reset }) {
  return (
    <div className="flex h-[60vh] w-full flex-col items-center justify-center space-y-4 p-8">
      <AlertCircle className="w-12 h-12 text-red-500" />
      <div className="text-center">
        <h3 className="text-xl font-bold text-red-600 mb-2">ROUTE CRASH</h3>
        <p className="text-sm font-semibold text-red-400 max-w-md">{error?.message || 'An unexpected error occurred while loading this module.'}</p>
      </div>
      <button onClick={() => reset()} className="px-6 py-2 mt-4 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors">
        Try Again
      </button>
    </div>
  );
}
