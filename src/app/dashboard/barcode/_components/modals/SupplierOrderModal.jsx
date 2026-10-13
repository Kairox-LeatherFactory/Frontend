'use client';
import { useState, useEffect } from 'react';
import { X, Truck, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import { apiCreateSupplierOrder, apiPatchSupplierOrder } from '@/lib/api';
import { BRAND, selectCls, inputCls, fieldStyle } from '../../_lib/constants';

/**
 * ============================================================================
 * SupplierOrderModal Component
 * ============================================================================
 * WHAT IT IS:
 * Purchase order creation and tracking dialog for external raw material vendors.
 *
 * WHY IT EXISTS:
 * When raw materials run short, factory managers raise purchase orders directly
 * (`POST /api/v1/suppliers/orders`). Follows a clean 2-step lifecycle:
 *   1. `ORDERED` (Sent to supplier)
 *   2. `ARRIVED` (Delivered at factory gates)
 */
export default function SupplierOrderModal({ open, onClose, initialData, token, showToast, onSuccess }) {
  // --------------------------------------------------------------------------
  // 1. STATE VARIABLES
  // --------------------------------------------------------------------------
  const [category, setCategory] = useState(initialData?.category || 'LEATHER');
  const [article, setArticle] = useState(initialData?.article || '');
  const [colour, setColour] = useState(initialData?.colour || '');
  const [qty, setQty] = useState(initialData?.qty || '');
  const [uom, setUom] = useState(initialData?.uom || 'DCM');
  const [supplierId, setSupplierId] = useState(initialData?.supplier_id || '');
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [error, setError] = useState(null);

  // Sync initial prefilled data if launched from shortfall calculator
  useEffect(() => {
    if (initialData) {
      if (initialData.category) setCategory(initialData.category);
      if (initialData.article) setArticle(initialData.article);
      if (initialData.colour) setColour(initialData.colour);
      if (initialData.qty) setQty(initialData.qty);
      if (initialData.supplier_id) setSupplierId(initialData.supplier_id);
    }
  }, [initialData]);

  // --------------------------------------------------------------------------
  // 2. CREATE PURCHASE ORDER HANDLER
  // --------------------------------------------------------------------------
  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Order quantity must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        category,
        article: article.trim(),
        qty: qtyNum,
        uom: uom || 'DCM',
      };
      if (colour.trim()) payload.colour = colour.trim();
      if (supplierId.trim()) payload.supplier_id = supplierId.trim();

      const res = await apiCreateSupplierOrder(token, payload);
      setCreatedOrder(res);
      showToast(`Supplier order raised! Status: ORDERED`, 'success');
      onSuccess?.(res);
    } catch (err) {
      setError(err?.message || 'Failed to raise supplier order.');
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. MARK ORDER AS ARRIVED AT FACTORY GATE
  // --------------------------------------------------------------------------
  const handleMarkArrived = async (orderId) => {
    try {
      setSubmitting(true);
      const res = await apiPatchSupplierOrder(token, orderId, 'arrived');
      setCreatedOrder(res);
      showToast(`Order marked as ARRIVED at gate!`, 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to mark as arrived.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 4. RENDER MODAL
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
            Raise Supplier Order on Shortfall
          </h3>
        </div>
        <button onClick={onClose} aria-label="Close modal">
          <X className="w-5 h-5" style={{ color: BRAND.textMuted }} />
        </button>
      </div>

      {/* --- Form & Order State Content --- */}
      <div className="p-6 space-y-4">
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Raise a manual supplier order (
          <code className="font-mono text-xs font-bold text-[#a86530]">POST /api/v1/suppliers/orders</code>
          ). State machine supports two states only: <strong className="text-amber-800">ORDERED &rarr; ARRIVED</strong>.
        </p>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* --- View A: Created Order Active State --- */}
        {createdOrder ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 text-emerald-950">
            <div className="font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Supplier Order Active</span>
            </div>
            <div className="text-xs space-y-1 font-mono">
              <div>Order ID: <strong className="text-emerald-900">{createdOrder.id || createdOrder.order_id}</strong></div>
              <div>
                Status:{' '}
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black uppercase text-[10px]">
                  {createdOrder.status || 'ORDERED'}
                </span>
              </div>
              {createdOrder.arrived_at && <div>Arrived At: {new Date(createdOrder.arrived_at).toLocaleString()}</div>}
            </div>

            {/* Button to update status to ARRIVED */}
            {createdOrder.status !== 'arrived' && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleMarkArrived(createdOrder.id || createdOrder.order_id)}
                className="btn-warm-primary !min-h-0 !py-2 !px-4 text-xs w-full mt-2"
              >
                <Truck className="w-3.5 h-3.5" /> Mark Order as ARRIVED (Goods at Gate)
              </button>
            )}
          </div>
        ) : (
          /* --- View B: New Order Creation Form --- */
          <form onSubmit={handleCreateOrder} className="space-y-3">
            {/* Category & Article */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls} style={fieldStyle}>
                  <option value="LEATHER">LEATHER</option>
                  <option value="LINING">LINING</option>
                  <option value="ACCESSORIES">ACCESSORIES</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Article *</label>
                <input type="text" placeholder="e.g. GOAT SUEDE" value={article} onChange={(e) => setArticle(e.target.value)} className={inputCls} style={fieldStyle} required />
              </div>
            </div>

            {/* Colour, Quantity & Unit of Measure */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Colour</label>
                <input type="text" placeholder="e.g. BLACK" value={colour} onChange={(e) => setColour(e.target.value)} className={inputCls} style={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Quantity *</label>
                <input type="number" step="any" min="0.01" placeholder="e.g. 500" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} style={fieldStyle} required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>UOM</label>
                <select value={uom} onChange={(e) => setUom(e.target.value)} className={selectCls} style={fieldStyle}>
                  <option value="DCM">DCM</option>
                  <option value="MTRS">MTRS</option>
                  <option value="PCS">PCS</option>
                  <option value="CONES">CONES</option>
                </select>
              </div>
            </div>

            {/* Supplier Identifier */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Supplier UUID / Name</label>
              <input type="text" placeholder="e.g. SUP-TANNERY-01" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls} style={fieldStyle} />
            </div>

            {/* Form Submit Buttons */}
            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-warm-primary !min-h-0 !py-2.5 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                <span>Raise Supplier Order</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AnimatedModal>
  );
}
