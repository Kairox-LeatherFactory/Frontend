'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Tag } from 'lucide-react';
import { formatDCM } from '../../_lib/helpers';

/**
 * ============================================================================
 * PieceDetailModal Component (Cutting)
 * ============================================================================
 */
export default function PieceDetailModal({
  selectedPiece,
  onClose,
}) {
  if (!selectedPiece) return null;

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
          {/* Header */}
          <div className="flex items-center justify-between gap-3 mb-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Tag className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 truncate min-w-0">
                  {selectedPiece.piece_code}
                </h3>
                <p className="text-[11px] font-mono text-slate-500">PO: {selectedPiece.order_number}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Details */}
          <div className="space-y-2 text-xs">
            {[
              ['Piece Code', selectedPiece.piece_code],
              ['Cutter Operator', selectedPiece.cutter_name || selectedPiece.employee_name || '—'],
              ['Style Name', selectedPiece.style_name || '—'],
              ['Article', selectedPiece.article || '—'],
              ['Order Number', selectedPiece.order_number || '—'],
              ['DCM Consumption', formatDCM(selectedPiece.consumption_dcm ?? selectedPiece.consumption)],
              ['Leather Lot', selectedPiece.lot_article || selectedPiece.leather_lot || '—'],
              ['Cut Work Date', selectedPiece.cut_date || selectedPiece.work_date || '—'],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between py-2 border-b border-slate-100">
                <span className="text-slate-500 font-medium">{label}:</span>
                <span className="font-bold text-slate-800">{val}</span>
              </div>
            ))}
          </div>

          <button
            onClick={onClose}
            className="mt-5 w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
          >
            Close Details
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
