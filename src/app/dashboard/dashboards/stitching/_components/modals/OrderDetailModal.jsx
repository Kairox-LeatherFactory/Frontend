'use client';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Waypoints } from 'lucide-react';

/**
 * ============================================================================
 * OrderDetailModal Component
 * ============================================================================
 * WHAT IT IS:
 * Modal popup displaying order information, article codes, fulfillment metrics,
 * and delivery timeline status for a selected production order.
 */
export default function OrderDetailModal({ selectedOrder, onClose }) {
  if (!selectedOrder) return null;

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
                <Waypoints className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900 truncate min-w-0">
                  {selectedOrder.style_name || selectedOrder.article || 'Order Summary'}
                </h3>
                <p className="text-[11px] font-mono text-slate-500">PO: {selectedOrder.order_number}</p>
              </div>
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
              ['Order Number', selectedOrder.order_number || '—'],
              ['Article Name', selectedOrder.article || '—'],
              ['Order Date', selectedOrder.order_date || '—'],
              ['Delivery Deadline', selectedOrder.delivery_deadline || '—'],
              ['Total Ordered', `${selectedOrder.total_ordered ?? 0} pcs`],
              ['Minted / In Process', `${selectedOrder.minted ?? 0} pcs`],
              ['Completed Quantity', `${selectedOrder.completed ?? 0} pcs`],
              ['Pending Balance', `${selectedOrder.pending ?? 0} pcs`],
              ['Completion Progress', `${selectedOrder.completion_pct ?? 0}%`],
              ['Delivery Status', selectedOrder.delay_status || 'On Track'],
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
            Close Order Details
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
