'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { initials } from '../../_lib/helpers';

/**
 * ============================================================================
 * EmployeeTraceModal Component
 * ============================================================================
 * WHAT IT IS:
 * Quick modal popup displaying operator details, currently assigned piece code,
 * and quick shortcut to the full piece traceability flow tab.
 */
export default function EmployeeTraceModal({
  selectedEmployee,
  onClose,
  employeeTrace,
  employeeTraceLoading,
  employeeTraceError,
  onOpenFullFlow,
}) {
  if (!selectedEmployee) return null;

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
          {/* Header Division: Operator Avatar & Close Button */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-black shrink-0">
                {initials(selectedEmployee.name)}
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900 truncate">{selectedEmployee.name}</h3>
                <p className="text-xs text-slate-500 truncate">{selectedEmployee.designation || 'Stitching Operator'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Loading & Error States */}
          {employeeTraceLoading && (
            <div className="text-center py-6 text-xs text-slate-400 font-semibold animate-pulse">
              Loading operator piece trace...
            </div>
          )}
          {employeeTraceError && !employeeTraceLoading && (
            <div className="text-xs text-red-600 font-semibold bg-red-50 border border-red-100 rounded-xl px-3 py-2">
              API Error: {employeeTraceError}
            </div>
          )}

          {/* Piece Trace Data Body */}
          {employeeTrace && !employeeTraceLoading && (
            employeeTrace.piece_code ? (
              <div className="text-xs space-y-2">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Piece Code:</span>
                  <span className="font-mono font-bold text-slate-800">{employeeTrace.piece_code}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Current Stage:</span>
                  <span className="font-bold text-slate-800">{employeeTrace.display_stage}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span className="text-slate-500">Style / Colour:</span>
                  <span className="font-bold text-slate-800">{employeeTrace.style} / {employeeTrace.colour}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-500 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                The backend returned no active piece for this operator right now.
              </div>
            )
          )}

          {/* Full Trace Navigation Button */}
          <button
            onClick={() => {
              if (onOpenFullFlow) onOpenFullFlow();
              onClose();
            }}
            className="mt-4 w-full px-4 py-2.5 rounded-xl bg-[#4f46e5] text-white text-xs font-bold hover:bg-[#4338ca] transition-all cursor-pointer shadow-sm shadow-indigo-200"
          >
            Open Full Traceability Flow &rarr;
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
