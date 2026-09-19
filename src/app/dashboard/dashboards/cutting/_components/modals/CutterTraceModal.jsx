'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Scissors } from 'lucide-react';
import { initials, formatDCM } from '../../_lib/helpers';

/**
 * ============================================================================
 * CutterTraceModal Component
 * ============================================================================
 */
export default function CutterTraceModal({
  selectedCutter,
  onClose,
  cutterDetail,
  loading,
  error,
}) {
  if (!selectedCutter) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border border-slate-100"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-black shrink-0">
                {initials(selectedCutter.name)}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900 truncate">{selectedCutter.name}</h3>
                <p className="text-xs text-slate-500 truncate">{selectedCutter.designation || 'Leather Cutter'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loading / Error States */}
          {loading && (
            <div className="text-center py-6 text-xs text-slate-400 font-semibold animate-pulse">
              Loading cutter piece records...
            </div>
          )}
          {error && !loading && (
            <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              Error: {error}
            </div>
          )}

          {/* Body */}
          {cutterDetail && !loading && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Pieces Cut</span>
                  <span className="font-bold text-slate-900 text-sm">{cutterDetail.total_cut ?? selectedCutter.completed_pieces ?? 0}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Total Consumption</span>
                  <span className="font-bold text-blue-700 text-sm">{formatDCM(cutterDetail.total_consumption ?? selectedCutter.total_consumption)}</span>
                </div>
              </div>

              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider pt-2">Recent Cut Pieces</h4>
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {(cutterDetail.pieces || []).map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 text-xs">
                    <span className="font-mono font-bold text-slate-800">{p.piece_code}</span>
                    <span className="font-mono text-blue-700 font-semibold">{formatDCM(p.consumption)}</span>
                  </div>
                ))}
                {(!cutterDetail.pieces || cutterDetail.pieces.length === 0) && (
                  <p className="text-xs text-slate-400 text-center py-4">No recent cut pieces logged.</p>
                )}
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Close Cutter Details
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
