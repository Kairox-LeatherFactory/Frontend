// barcode worker not checked in modal
'use client';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

export default function BarcodeNotCheckedInModal({ barcodeNotCheckedInModal, setBarcodeNotCheckedInModal, workerInputRef }) {
  const router = useRouter();
  if (!barcodeNotCheckedInModal) return null;

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/80 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-gradient-to-b from-slate-900 to-rose-950 text-white rounded-3xl shadow-2xl border-2 border-rose-500/50 w-full max-w-md p-6 space-y-5 text-center relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8 text-rose-400" />
        </div>

        <div className="space-y-2">
          <h3 className="text-xl font-black text-rose-400 uppercase tracking-wide">Worker Not Checked-In!</h3>
          <p className="text-xs font-semibold text-slate-200">
            Worker <strong className="text-white text-sm font-black">{barcodeNotCheckedInModal.workerName}</strong> has not completed Attendance Check-In for today.
          </p>
          <p className="text-[11px] text-rose-200/80">
            Factory Rule: Production logging is restricted to active checked-in workers.
          </p>
        </div>

        <div className="pt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => router.push('/dashboard/attendance')}
            className="w-full py-3.5 rounded-xl font-black text-xs text-white bg-rose-600 hover:bg-rose-500 transition-all shadow-lg cursor-pointer"
          >
            Go to Attendance Check-In Page
          </button>
          <button
            type="button"
            onClick={() => {
              setBarcodeNotCheckedInModal(null);
              setTimeout(() => workerInputRef.current?.focus(), 100);
            }}
            className="w-full py-3 rounded-xl font-bold text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            Close &amp; Dismiss
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
