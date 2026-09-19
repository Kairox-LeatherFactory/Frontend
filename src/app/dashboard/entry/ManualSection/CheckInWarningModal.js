// manual logger checkin warining modal
'use client';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

export default function CheckInWarningModal({ mounted, show, workerName }) {
  if (!mounted || !show) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-8 w-full max-w-xs text-center flex flex-col items-center gap-4 animate-slide-up-fade">
        <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center shadow-inner border border-amber-100/50">
          <AlertTriangle className="w-8 h-8 text-amber-500 drop-shadow-sm" />
        </div>
        <div>
          <h3 className="text-slate-800 font-black text-lg tracking-tight">Not Checked In</h3>
          <p className="text-slate-500 text-xs font-medium mt-1.5 leading-relaxed">
            <span className="font-bold text-slate-800">{workerName}</span> has not started their shift yet.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
