'use client';
import { createPortal } from "react-dom";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";

export default function BucketResultModal({
  mounted,
  showBucketModal,
  bucketResult,
  onClose,
}) {
  if (!mounted || !showBucketModal || !bucketResult) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md animate-fade-in p-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-lg overflow-hidden relative">
        <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base">Production Logging Response</h3>
              <p className="text-xs text-slate-400 font-semibold">
                Stage: {bucketResult.stage || bucketResult.stages?.[0] || "N/A"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Logged Bucket */}
          {bucketResult.logged && bucketResult.logged.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-black text-xs text-emerald-800 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Logged Successfully ({bucketResult.logged.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bucketResult.logged.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-1 rounded bg-white text-emerald-700 font-mono font-bold text-xs border border-emerald-200 shadow-sm"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Rework Bucket */}
          {bucketResult.rework && bucketResult.rework.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-black text-xs text-amber-800 uppercase tracking-wider">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Rework Flagged ({bucketResult.rework.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bucketResult.rework.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-1 rounded bg-white text-amber-700 font-mono font-bold text-xs border border-amber-200 shadow-sm"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Blocked Bucket */}
          {bucketResult.blocked && bucketResult.blocked.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 font-black text-xs text-red-800 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4 text-red-500" />
                Blocked Pieces ({bucketResult.blocked.length})
              </div>
              <div className="space-y-2">
                {bucketResult.blocked.map((b, i) => (
                  <div key={i} className="flex flex-col gap-1 p-3 bg-white rounded-xl border border-red-100 shadow-sm">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-slate-800">{b.piece}</span>
                      {b.gate && (
                        <span className="px-2 py-0.5 bg-red-100 text-red-700 text-[10px] font-black uppercase rounded-md">
                          {b.gate}
                        </span>
                      )}
                    </div>
                    {b.reason && (
                      <p className="text-xs text-red-600 font-medium leading-relaxed">
                        {b.reason}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not Found Bucket */}
          {bucketResult.not_found && bucketResult.not_found.length > 0 && (
            <div className="bg-slate-100 border border-slate-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 font-black text-xs text-slate-700 uppercase tracking-wider">
                <XCircle className="w-4 h-4 text-slate-400" />
                Not Found ({bucketResult.not_found.length})
              </div>
              <div className="flex flex-wrap gap-1.5">
                {bucketResult.not_found.map((code) => (
                  <span
                    key={code}
                    className="px-2 py-1 rounded bg-white text-slate-600 font-mono font-bold text-xs border border-slate-200"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl text-xs font-black text-white bg-slate-900 hover:bg-slate-800 transition-colors shadow-md cursor-pointer"
          >
            Close & Continue
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
