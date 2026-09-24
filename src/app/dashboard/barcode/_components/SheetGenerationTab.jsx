'use client';
import { useState, useMemo } from 'react';
import { Layers, Plus, Printer, Send, Trash2, CheckCircle2, RotateCcw, Search, Barcode as BarcodeIcon, Sparkles, Loader2 } from 'lucide-react';
import { BRAND, inputCls, fieldStyle } from '../_lib/constants';
import { statusBadgeClass } from '../_lib/helpers';
import { useGetBarcodeOrdersQuery, useGetOrderMetaQuery } from '../_lib/barcodeApiSlice';
import BarcodeCanvas from './BarcodeCanvas';
import ScreenSafeSelect from './ScreenSafeSelect';

const DEFAULT_COLORS = [
  'BLACK',
  'BROWN',
  'DARK BROWN',
  'TAN',
  'COGNAC',
  'NAVY',
  'BURGUNDY',
  'CAMEL',
  'BEIGE',
  'OLIVE',
  'GREY',
  'WHITE',
  'RED',
  'BLUE',
  'GREEN',
  'CHARCOAL',
  'RUST',
];

/**
 * ============================================================================
 * SheetGenerationTab Component
 * ============================================================================
 * WHAT IT IS:
 * Dedicated interactive generator for cutting and production sheet barcodes.
 * 
 * FEATURES:
 * - Direct minting form: Order (dropdown from /api/v1/barcode/orders) and Color.
 * - Live preview of barcode codes to be generated.
 * - Stores minted sheet barcodes into Redux store + batch history.
 * - Printable on physical 98mm × 65.5mm sheet sticker labels (8 per A4 sheet).
 */
export default function SheetGenerationTab({
  orders: propOrders = [],
  materials = [],
  sheetGenerated = [],
  onGenerateSheets,
  onSendToPrintCenter,
  onOpenDetail,
  onPrintSingle,
  onPrintAll,
  operatorLabel,
  token,
}) {
  // Query orders roster via the exact same endpoint as Bundle Barcode
  const {
    data: fetchedOrders = [],
    isLoading: ordersLoading,
    error: ordersErrorObj,
  } = useGetBarcodeOrdersQuery(undefined, { skip: token === false });
  const orders = propOrders && propOrders.length > 0 ? propOrders : fetchedOrders;
  const ordersError = ordersErrorObj?.data?.detail || ordersErrorObj?.error || null;

  // Form input state: ONLY Order and Color
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [color, setColor] = useState('');

  // Fetch order meta (SKUs and colors) for the selected order
  const {
    data: orderMeta,
  } = useGetOrderMetaQuery(selectedOrderId, {
    skip: !selectedOrderId,
  });
  const skuOptions = orderMeta?.skuOptions ?? [];

  // Find the selected order object
  const selectedOrder = useMemo(() => {
    return orders.find((o) => o.order_id === selectedOrderId || o.order_number === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Order dropdown options matching Bundle Barcode exactly:
  // e.g., "11111 — RIZwana (290 pcs)"
  const orderOptions = useMemo(() => {
    return orders.map((o) => {
      const clientPart = o.client_name ? ` — ${o.client_name}` : '';
      const mintedPart = o.minted !== undefined && o.minted !== null ? ` (${o.minted} pcs)` : '';
      return {
        value: o.order_id,
        label: `${o.order_number}${clientPart}${mintedPart}`,
      };
    });
  }, [orders]);

  // Dynamic & standard color dropdown options (prioritizing selected order's SKU colors)
  const colorOptions = useMemo(() => {
    const set = new Set();
    // 1. Order-specific SKU colors first
    const skus = Array.isArray(orderMeta?.skuOptions) ? orderMeta.skuOptions : [];
    skus.forEach((s) => {
      if (s.colour) set.add(s.colour.toUpperCase());
    });
    // 2. Material stock colors
    (materials || []).forEach((m) => {
      if (m.colour) set.add(m.colour.toUpperCase());
      if (m.attributes?.colour) set.add(m.attributes.colour.toUpperCase());
    });
    // 3. Standard palette colors
    DEFAULT_COLORS.forEach((c) => set.add(c));
    // 4. Any previously minted sheet colors
    (sheetGenerated || []).forEach((s) => {
      if (s.color) set.add(s.color.toUpperCase());
    });
    return Array.from(set).filter(Boolean).sort().map((c) => ({ value: c, label: c }));
  }, [orderMeta, materials, sheetGenerated]);

  // Search & Selection state
  const [search, setSearch] = useState('');
  const [selectedCodes, setSelectedCodes] = useState(new Set());

  // Preview generated code
  const previewCode = useMemo(() => {
    const ordNum = selectedOrder?.order_number || selectedOrderId;
    const ord = ordNum ? ordNum.trim().toUpperCase().replace(/[^a-zA-Z0-9_-]/g, '') : 'ORDER';
    const col = color.trim() ? color.trim().toUpperCase().replace(/[^a-zA-Z0-9_-]/g, '') : 'COLOR';
    const existing = sheetGenerated.filter(
      (s) => (s.orderId?.toUpperCase() === ord || s.orderNumber?.toUpperCase() === ord) && s.color?.toUpperCase() === col
    ).length;
    const seq = existing + 1;
    return `SHT-${ord}-${col}-${String(seq).padStart(3, '0')}`;
  }, [selectedOrder, selectedOrderId, color, sheetGenerated]);

  // Form submission handler
  const handleGenerate = (e) => {
    e.preventDefault();
    const ord = (selectedOrder?.order_number || selectedOrderId || '').trim();
    const col = color.trim().toUpperCase();
    if (!ord || !col) return;

    const cleanOrd = ord.toUpperCase().replace(/[^a-zA-Z0-9_-]/g, '');
    const cleanCol = col.replace(/[^a-zA-Z0-9_-]/g, '');
    const existing = sheetGenerated.filter(
      (s) => (s.orderId?.toUpperCase() === cleanOrd || s.orderNumber?.toUpperCase() === cleanOrd) && s.color?.toUpperCase() === cleanCol
    ).length;
    const seq = existing + 1;
    const seqStr = String(seq).padStart(3, '0');
    const code = `SHT-${cleanOrd}-${cleanCol}-${seqStr}`;

    const clientName = selectedOrder?.client_name || ord;

    const record = {
      pieceCode: code,
      orderId: ord,
      orderNumber: ord,
      client: clientName,
      style: `Sheet #${seq}`,
      color: col,
      size: `${col} Sheet`,
      serial: seq,
      serialStr: seqStr,
      batchNo: `SHT-${Date.now().toString().slice(-6)}`,
      createdDate: new Date().toLocaleString(),
      generatedBy: operatorLabel || 'OPERATOR',
      printStatus: 'PENDING',
      printCount: 0,
    };

    onGenerateSheets([record]);
  };

  // Filter generated sheets
  const filteredSheets = useMemo(() => {
    const list = Array.isArray(sheetGenerated) ? sheetGenerated : [];
    if (!search.trim()) return list;
    const term = search.toLowerCase();
    return list.filter((s) =>
      s.pieceCode?.toLowerCase().includes(term) ||
      (s.orderId && s.orderId.toLowerCase().includes(term)) ||
      (s.color && s.color.toLowerCase().includes(term)) ||
      (s.client && s.client.toLowerCase().includes(term)) ||
      (s.style && s.style.toLowerCase().includes(term))
    );
  }, [sheetGenerated, search]);

  // Selection helpers
  const toggleSelect = (code) => {
    setSelectedCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const selectAllVisible = () => {
    const all = new Set(filteredSheets.map((s) => s.pieceCode));
    setSelectedCodes(all);
  };

  const clearSelection = () => {
    setSelectedCodes(new Set());
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* --- Section 1: Sheet Barcode Minting Form (Order & Color only) --- */}
      <div className="rounded-2xl p-6 shadow-sm space-y-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" style={{ color: BRAND.accent }} />
          <h3 className="text-lg font-black" style={{ color: BRAND.text }}>Generate Sheet Barcodes</h3>
        </div>
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Select the Order and Color to mint a scannable sheet barcode.
        </p>

        <form onSubmit={handleGenerate} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>
                Production Order
              </label>
              {ordersLoading && orders.length === 0 ? (
                <div className="flex items-center gap-2 text-sm py-2.5" style={{ color: BRAND.textMuted }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading orders…
                </div>
              ) : ordersError && orders.length === 0 ? (
                <p className="text-sm" style={{ color: '#b91c1c' }}>{ordersError}</p>
              ) : (
                <ScreenSafeSelect
                  value={selectedOrderId}
                  onChange={(val) => {
                    setSelectedOrderId(val);
                    setColor('');
                  }}
                  placeholder="-- Select an order --"
                  options={orderOptions}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>
                Color
              </label>
              <ScreenSafeSelect
                value={color}
                onChange={(val) => setColor(val)}
                placeholder="-- Select Color --"
                options={colorOptions}
              />
            </div>
          </div>

          {/* Barcode Preview & Submit Button */}
          <div className="flex items-center justify-between flex-wrap gap-4 pt-2 border-t" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
            <div className="text-xs space-y-0.5">
              <span className="font-bold text-[#5a3518]">Code Preview:</span>{' '}
              <span className="font-mono text-xs px-2.5 py-1 rounded bg-amber-50 text-[#a86530] font-bold">
                {previewCode}
              </span>
            </div>

            <button
              type="submit"
              disabled={!selectedOrderId || !color.trim()}
              className="btn-warm-primary !min-h-0 !py-2.5 !px-5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" /> Generate Sheet Barcode
            </button>
          </div>
        </form>
      </div>

      {/* --- Section 3: Generated Sheets Inventory & Actions --- */}
      <div className="rounded-2xl p-6 shadow-sm space-y-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h4 className="text-base font-black" style={{ color: BRAND.text }}>Generated Sheet Barcodes</h4>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>
              Select barcodes below to print directly or send them into the Print Center queue.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => onPrintAll && onPrintAll(Array.from(selectedCodes))}
              disabled={selectedCodes.size === 0}
              className="btn-warm-primary !min-h-0 !py-2 !px-4 text-xs disabled:opacity-50 disabled:cursor-default"
            >
              <Printer className="w-4 h-4" /> Print Selected ({selectedCodes.size})
            </button>
            <button
              onClick={() => onSendToPrintCenter && onSendToPrintCenter(Array.from(selectedCodes))}
              disabled={selectedCodes.size === 0}
              className="btn-warm-secondary !min-h-0 !py-2 !px-4 text-xs disabled:opacity-50 disabled:cursor-default"
            >
              <Send className="w-4 h-4" /> Send to Print Center ({selectedCodes.size})
            </button>
          </div>
        </div>

        {/* Search bar & quick select */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-3 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search sheet barcodes…"
              className={`${inputCls} pl-9`}
              style={fieldStyle}
            />
          </div>

          <div className="flex items-center gap-2">
            <p className="text-xs" style={{ color: BRAND.textMuted }}>
              Showing {filteredSheets.length} of {sheetGenerated.length}
            </p>
            <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">
              Select All Visible
            </button>
            <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">
              Clear Selection
            </button>
          </div>
        </div>

        {/* Grid of Sheet Barcodes */}
        {filteredSheets.length === 0 ? (
          <div className="text-center py-12 rounded-xl border border-dashed" style={{ borderColor: 'rgba(200,131,74,0.3)' }}>
            <Layers className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: BRAND.textMuted }} />
            <p className="font-bold text-sm" style={{ color: BRAND.textMuted }}>
              {sheetGenerated.length === 0 ? 'No sheet barcodes minted yet. Use the form above to generate your first sheet!' : 'No sheets match your search query.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[550px] overflow-y-auto p-1">
            {filteredSheets.map((s) => {
              const isChecked = selectedCodes.has(s.pieceCode);
              return (
                <div
                  key={s.pieceCode}
                  className="rounded-xl p-3 flex flex-col justify-between transition-all cursor-pointer relative"
                  style={{
                    background: isChecked ? '#faf3ea' : BRAND.bg,
                    border: `1.5px solid ${isChecked ? BRAND.accent : 'rgba(200,131,74,0.2)'}`,
                    boxShadow: isChecked ? '0 2px 8px rgba(200,131,74,0.2)' : 'none',
                  }}
                  onClick={() => toggleSelect(s.pieceCode)}
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="w-4 h-4 accent-[#c8834a] cursor-pointer mt-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-xs truncate" style={{ color: '#5a3518' }}>
                          {s.style || 'Cutting Sheet'}
                        </p>
                        <p className="text-[10px] text-gray-500 truncate">
                          PO: {s.orderId || 'GENERAL'} {s.color ? `• ${s.color}` : ''}
                        </p>
                      </div>
                      <span className={`${statusBadgeClass(s.printStatus)} text-[9px] px-1.5 py-0.5`}>
                        {s.printStatus}
                      </span>
                    </div>

                    {/* Barcode graphic */}
                    <div className="bg-white rounded-lg p-2 flex justify-center border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                      <BarcodeCanvas code={s.pieceCode} displayWidth={140} showText={false} />
                    </div>

                    <div className="text-center mt-1.5 font-mono font-bold text-xs" style={{ color: '#5a3518' }}>
                      {s.pieceCode}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-3 pt-2 border-t" style={{ borderColor: 'rgba(200,131,74,0.15)' }} onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => onOpenDetail && onOpenDetail(s.pieceCode)}
                      className="flex-1 btn-warm-secondary !min-h-0 !py-1 text-[11px]"
                    >
                      Detail
                    </button>
                    <button
                      onClick={() => onPrintSingle && onPrintSingle(s.pieceCode)}
                      className="flex-1 btn-warm-primary !min-h-0 !py-1 text-[11px]"
                    >
                      Print
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
