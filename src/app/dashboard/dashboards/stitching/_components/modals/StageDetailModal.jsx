'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Layers } from 'lucide-react';
import { formatStage } from '../../_lib/helpers';

/**
 * ============================================================================
 * StageDetailModal Component
 * ============================================================================
 * WHAT IT IS:
 * Modal dialog showing in-depth production counts (received, assigned, completed,
 * pending, damage, and rework) for a selected stitching pipeline stage.
 */
export default function StageDetailModal({ selectedStage, onClose }) {
  if (!selectedStage) return null;

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
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-100"
        >
          {/* Header Division */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 truncate min-w-0">
                {selectedStage.label || formatStage(selectedStage.stage)}
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metric Details List */}
          <div className="space-y-2 text-xs">
            {[
              ['Floor Section', selectedStage.section || 'Stitching Floor'],
              ['Total Received', `${selectedStage.total_received ?? 0} pcs`],
              ['Assigned Pieces', `${selectedStage.assigned_pieces ?? 0} pcs`],
              ['Completed Pieces', `${selectedStage.completed_pieces ?? 0} pcs`],
              ['Pending in Queue', `${selectedStage.pending_pieces ?? 0} pcs`],
              ['Damage Pieces', `${selectedStage.damage_pieces ?? 0} pcs`],
              ['Rework Pieces', `${selectedStage.rework_pieces ?? 0} pcs`],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">{label}:</span>
                <span className="font-bold text-slate-800">{val}</span>
              </div>
            ))}
          </div>

          {/* Close Action Button */}
          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Close Stage Details
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
