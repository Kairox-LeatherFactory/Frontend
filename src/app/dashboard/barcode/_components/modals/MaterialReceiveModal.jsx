'use client';
import { useState, useEffect } from 'react';
import { X, Truck, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import { apiReceiveMaterials } from '@/lib/api';
import { BRAND, inputCls, fieldStyle } from '../../_lib/constants';

/**
 * ============================================================================
 * MaterialReceiveModal Component
 * ============================================================================
 * WHAT IT IS:
 * Modal form for logging incoming raw material shipments into factory inventory.
 *
 * WHY IT EXISTS:
 * Handles quality-checked warehouse receiving (`POST /api/v1/materials/receive`).
 * - Approved quantity is added directly to active on-hand inventory.
 * - Rejected quantity is recorded for vendor quality audit trails.
 */
export default function MaterialReceiveModal({ open, onClose, lot, token, showToast, onSuccess }) {
  // --------------------------------------------------------------------------
  // 1. STATE VARIABLES
  // --------------------------------------------------------------------------
  const [materialLotId, setMaterialLotId] = useState(lot?.lot_id || '');
  const [supplierOrderId, setSupplierOrderId] = useState('');
  const [approvedQty, setApprovedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Sync lot identifier when target lot changes
  useEffect(() => {
    if (lot) {
      setMaterialLotId(lot.lot_id || lot.pieceCode || '');
    }
  }, [lot]);

  // --------------------------------------------------------------------------
  // 2. FORM SUBMIT HANDLER
  // --------------------------------------------------------------------------
  const handleReceive = async (e) => {
    e.preventDefault();

    const appNum = parseFloat(approvedQty);
    if (isNaN(appNum) || appNum < 0) {
      setError('Approved quantity must be a non-negative number.');
      return;
    }
    const rejNum = rejectedQty ? parseFloat(rejectedQty) : 0;

    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        material_lot_id: materialLotId,
        approved_qty: appNum,
        rejected_qty: rejNum,
      };
      if (supplierOrderId.trim()) payload.supplier_order_id = supplierOrderId.trim();

      const res = await apiReceiveMaterials(token, payload);
      showToast(`Material received successfully! Added ${appNum} to stock.`, 'success');
      onSuccess?.(res);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to record material receiving.');
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. RENDER MODAL FORM
  // --------------------------------------------------------------------------
  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      {/* --- Modal Header Bar --- */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}
      >
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" style={{ color: BRAND.accent }} />
          <h3 className="font-bold text-base" style={{ color: '#5a3518' }}>
            Record Material Receiving
          </h3>
        </div>
        <button onClick={onClose} aria-label="Close modal">
          <X className="w-5 h-5" style={{ color: BRAND.textMuted }} />
        </button>
      </div>

      {/* --- Receiving Form Content --- */}
      <form onSubmit={handleReceive} className="p-6 space-y-4">
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Approved quantity is added to the lot; rejected quantity is logged for supplier quality tracking (
          <code className="font-mono text-xs font-bold text-[#a86530]">POST /api/v1/materials/receive</code>).
        </p>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Material Lot Identifier Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
            Material Lot ID / Barcode *
          </label>
          <input
            type="text"
            value={materialLotId}
            onChange={(e) => setMaterialLotId(e.target.value)}
            placeholder="e.g. LOT-UUID or LOT-BARCODE"
            className={inputCls}
            style={fieldStyle}
            required
          />
        </div>

        {/* Supplier Purchase Order ID Input */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
            Supplier Order ID (Optional)
          </label>
          <input
            type="text"
            value={supplierOrderId}
            onChange={(e) => setSupplierOrderId(e.target.value)}
            placeholder="e.g. ORD-SUP-202608"
            className={inputCls}
            style={fieldStyle}
          />
        </div>

        {/* Approved vs. Rejected Quantities */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-emerald-800">
              Approved Qty (Stocked) *
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 200"
              value={approvedQty}
              onChange={(e) => setApprovedQty(e.target.value)}
              className={inputCls}
              style={fieldStyle}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-rose-800">
              Rejected Qty (Quality Log)
            </label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 5"
              value={rejectedQty}
              onChange={(e) => setRejectedQty(e.target.value)}
              className={inputCls}
              style={fieldStyle}
            />
          </div>
        </div>

        {/* --- Form Buttons --- */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-warm-primary !min-h-0 !py-2.5 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Record Receiving</span>
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}
