'use client';
import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function LiningPromptModal({ show, onClose, onConfirm, count }) {
  if (!show || typeof document === 'undefined') return null;
  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden mx-4">
        <div className="p-6 sm:p-8 space-y-4">
          <h3 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>Does this need lining?</h3>
          <p className="text-xs font-bold text-slate-500">
            {count} style(s) selected for release. This answer applies to all of them.
          </p>
          <div className="flex gap-3 justify-end pt-2">
            <button onClick={onClose} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600">Cancel</button>
            <button onClick={() => onConfirm(false)} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-white border text-slate-700" style={{ borderColor: 'rgba(200,131,74,0.3)' }}>No</button>
            <button onClick={() => onConfirm(true)} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>Yes</button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function ReleaseResultModal({ result, onClose, onBackToProduction }) {
  const router = useRouter();
  if (!result || typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <div>
            <h3 className="font-black text-xl" style={{ color: '#2d1f0e' }}>Release Complete</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">{result.message}</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
              <p className="text-[10px] font-black uppercase text-emerald-700">Pieces Minted</p>
              <p className="text-xl font-black text-emerald-800">{result.minted?.pieces_minted ?? 0}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-black uppercase text-slate-500">Drawers Reused / Minted</p>
              <p className="text-xl font-black text-slate-800">{result.minted?.drawers_reused ?? 0} / {result.minted?.drawers_minted ?? 0}</p>
            </div>
          </div>
          {result.minted?.pieces_waiting_for_drawer > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <div>
                <p className="font-black text-sm text-rose-800">{result.minted.pieces_waiting_for_drawer} piece(s) waiting for a drawer</p>
                <p className="text-xs text-rose-600 mt-0.5">These pieces have barcodes but no drawer yet — grow the drawer pool above, or wait for drawers to free up.</p>
              </div>
            </div>
          )}
          {result.rejected?.length > 0 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
              <p className="text-xs font-black text-amber-800 mb-1">{result.rejected.length} style(s) rejected</p>
              {result.rejected.map((r, i) => (
                <div key={i} className="text-[11px] text-amber-700 mb-1 last:mb-0">
                  <p className="font-bold">{r.style_code}: {r.reason}</p>
                  {r.blockers?.length > 0 && (
                    <ul className="list-disc list-inside pl-1 mt-0.5 space-y-0.5">
                      {r.blockers.map((b, j) => <li key={j}>{b}</li>)}
                    </ul>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-6 pt-0 flex gap-3">
          <button onClick={onClose} className="flex-1 h-12 rounded-xl font-black text-xs uppercase bg-slate-100 text-slate-600">
            Stay Here
          </button>
          <button
            onClick={() => {
              if (onBackToProduction) onBackToProduction();
              else router.push('/dashboard/entry');
            }}
            className="flex-1 h-12 rounded-xl font-black text-xs uppercase text-white"
            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
          >
            Back to Production
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
