'use client';
import { useState } from 'react';
import { X, Layers, AlertTriangle, Search, Loader2, CheckCircle2, Truck } from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import { apiGetMaterialsStock } from '@/lib/api';
import { BRAND, selectCls, inputCls, fieldStyle } from '../../_lib/constants';

/**
 * ============================================================================
 * MaterialStockModal Component
 * ============================================================================
 * WHAT IT IS:
 * Real-time material inventory balance checker and shortfall calculator.
 *
 * WHY IT EXISTS:
 * Evaluates `Available = On Hand - Reserved` across Leather, Lining, and Accessories (`GET /api/v1/materials/stock`).
 * If required quantities exceed available stock, automatically computes the shortfall deficit
 * and allows 1-click dispatching to raise a supplier purchase order.
 */
export default function MaterialStockModal({ open, onClose, token, showToast, onOpenSupplierOrder }) {
  // --------------------------------------------------------------------------
  // 1. FORM & SEARCH STATE
  // --------------------------------------------------------------------------
  const [category, setCategory] = useState('LEATHER');
  const [subtype, setSubtype] = useState('');
  const [article, setArticle] = useState('');
  const [colour, setColour] = useState('');
  const [required, setRequired] = useState('');
  const [stockResult, setStockResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // --------------------------------------------------------------------------
  // 2. CHECK STOCK QUERY HANDLER
  // --------------------------------------------------------------------------
  const handleCheckStock = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const params = { category };
      if (subtype) params.subtype = subtype;
      if (article.trim()) params.article = article.trim();
      if (colour.trim()) params.colour = colour.trim();
      if (required) params.required = parseFloat(required);

      const res = await apiGetMaterialsStock(token, params);
      setStockResult(res);
    } catch (err) {
      setError(err?.message || 'Failed to fetch stock.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. RENDER MODAL
  // --------------------------------------------------------------------------
  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      {/* --- Modal Header --- */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}
      >
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" style={{ color: BRAND.accent }} />
          <h3 className="font-bold text-base" style={{ color: '#5a3518' }}>
            Material Stock &amp; Shortfall Calculator
          </h3>
        </div>
        <button onClick={onClose} aria-label="Close modal">
          <X className="w-5 h-5" style={{ color: BRAND.textMuted }} />
        </button>
      </div>

      {/* --- Main Body --- */}
      <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Stock equation:{' '}
          <span className="font-mono font-bold text-slate-800">Available = On Hand - Reserved</span>. Query live stock with shortfall computation (
          <code className="font-mono text-xs font-bold text-[#a86530]">GET /api/v1/materials/stock</code>).
        </p>

        {/* Error Alert */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* --- Stock Query Form --- */}
        <form
          onSubmit={handleCheckStock}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#faf6f0] p-4 rounded-xl border border-[rgba(200,131,74,0.2)]"
        >
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-600">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={selectCls}
              style={fieldStyle}
            >
              <option value="LEATHER">LEATHER</option>
              <option value="LINING">LINING</option>
              <option value="ACCESSORIES">ACCESSORIES</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-600">Article Filter</label>
            <input
              type="text"
              placeholder="e.g. GOAT SUEDE"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              className={inputCls}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-600">Colour</label>
            <input
              type="text"
              placeholder="e.g. BLACK"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              className={inputCls}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-600">Required Quantity</label>
            <input
              type="number"
              step="any"
              placeholder="e.g. 500"
              value={required}
              onChange={(e) => setRequired(e.target.value)}
              className={inputCls}
              style={fieldStyle}
            />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="btn-warm-primary !min-h-0 !py-2 !px-4 text-xs"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Check Live Stock</span>
            </button>
          </div>
        </form>

        {/* --- Stock Results & Shortfall Metrics --- */}
        {stockResult && (
          <div className="space-y-3 pt-2">
            {/* 3 Metric Cards: On Hand, Reserved, Available */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">On Hand</div>
                <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{stockResult.on_hand ?? 0}</div>
                <div className="text-[9px] text-slate-400">Physically Present</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Reserved</div>
                <div className="text-xl font-black text-amber-900 font-mono mt-0.5">{stockResult.reserved ?? 0}</div>
                <div className="text-[9px] text-amber-600">Committed</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Available</div>
                <div className="text-xl font-black text-emerald-900 font-mono mt-0.5">
                  {stockResult.available ?? (stockResult.on_hand - (stockResult.reserved || 0))}
                </div>
                <div className="text-[9px] text-emerald-600">Derived Read</div>
              </div>
            </div>

            {/* Shortfall Alert & Order Button */}
            {stockResult.short_by !== undefined && stockResult.short_by !== null && (
              <div
                className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
                  stockResult.short_by > 0
                    ? 'bg-rose-50 border-rose-200 text-rose-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div>
                  <div className="text-xs font-extrabold flex items-center gap-1.5">
                    {stockResult.short_by > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>
                      {stockResult.short_by > 0
                        ? `Shortfall of ${stockResult.short_by} units detected`
                        : 'Sufficient stock available for requirement'}
                    </span>
                  </div>
                  {stockResult.suggested_supplier && (
                    <div className="text-[11px] text-slate-600 mt-1">
                      Suggested Supplier:{' '}
                      <strong className="text-slate-900">
                        {stockResult.suggested_supplier.name ||
                          stockResult.suggested_supplier.id ||
                          JSON.stringify(stockResult.suggested_supplier)}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Direct Order Button for Shortfalls */}
                {stockResult.short_by > 0 && (
                  <button
                    onClick={() => {
                      onOpenSupplierOrder?.({
                        category,
                        article,
                        colour,
                        qty: stockResult.short_by,
                        supplier_id: stockResult.suggested_supplier?.id,
                      });
                      onClose();
                    }}
                    className="btn-warm-primary !min-h-0 !py-2 !px-3 text-xs"
                  >
                    <Truck className="w-3.5 h-3.5" /> Order Shortfall ({stockResult.short_by})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Modal Close Footer */}
        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">
            Close
          </button>
        </div>
      </div>
    </AnimatedModal>
  );
}
