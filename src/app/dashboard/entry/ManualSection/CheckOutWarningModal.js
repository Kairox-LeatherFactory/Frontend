// manual logger checkout warning modal
'use client';
import { createPortal } from 'react-dom';
import { XCircle } from 'lucide-react';

export default function CheckOutWarningModal({ mounted, show, workerName }) {
  if (!mounted || !show) return null;
  return createPortal(
    <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in p-4">
      <div className="bg-white/95 backdrop-blur-xl border border-white/60 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] rounded-3xl p-8 w-full max-w-xs text-center flex flex-col items-center gap-4 animate-slide-up-fade">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center shadow-inner border border-red-100/50">
          <XCircle className="w-8 h-8 text-red-500 drop-shadow-sm" />
        </div>
        <div>
          <h3 className="text-slate-800 font-black text-lg tracking-tight">Checked Out</h3>
          <p className="text-slate-500 text-xs font-medium mt-1.5 leading-relaxed">
            <span className="font-bold text-slate-800">{workerName}</span> is no longer active today.
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
