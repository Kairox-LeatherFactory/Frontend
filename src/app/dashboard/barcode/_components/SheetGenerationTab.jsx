'use client';
import { useState, useMemo } from 'react';
import { Layers, Plus, Printer, Send, Trash2, CheckCircle2, RotateCcw, Search, Barcode as BarcodeIcon, Sparkles, Loader2 } from 'lucide-react';
import { BRAND, inputCls, fieldStyle } from '../_lib/constants';
import { statusBadgeClass } from '../_lib/helpers';
import { useGetBarcodeOrdersQuery, useGetOrderMetaQuery, useGetLeatherLotsQuery, useGetLotSheetsQuery } from '../_lib/barcodeApiSlice';
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
 * - Minting form: Order (/api/v1/barcode/orders) → Lot (/api/v1/materials/lots)
 *   → Color. Choosing a lot loads its sheets from
 *   /api/v1/materials/lots/:lotId/sheets; each sheet's `code` (e.g. LS-000005)
 *   is used as the barcode value.
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

  // Form input state: Order → Lot → Color
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [selectedLotId, setSelectedLotId] = useState('');
  const [color, setColor] = useState('');
  // Sheets are selected by default; this tracks the ones the user unticked
  const [excludedSheetCodes, setExcludedSheetCodes] = useState(new Set());

  // Leather lots roster — fetched once an order is selected
  const {
    data: lotsData,
    isFetching: lotsLoading,
    error: lotsErrorObj,
  } = useGetLeatherLotsQuery(undefined, { skip: token === false || !selectedOrderId });
  const lots = useMemo(() => lotsData?.lots ?? [], [lotsData]);
  const suggestedLotId = lotsData?.suggested_lot_id ?? null;
  const lotsError = lotsErrorObj?.data?.detail || lotsErrorObj?.error || null;

  // Sheets of the selected lot — each sheet's `code` is the barcode to mint
  const {
    data: lotSheetsData,
    isFetching: sheetsLoading,
    error: sheetsErrorObj,
  } = useGetLotSheetsQuery(selectedLotId, { skip: !selectedLotId });
  // A 404 just means the lot has no sheets registered yet — show the empty state, not an error
  const sheetsError = sheetsErrorObj?.status === 404
    ? null
    : sheetsErrorObj?.data?.detail || sheetsErrorObj?.error || null;
  const lotSheets = useMemo(
    () => (selectedLotId && Array.isArray(lotSheetsData?.sheets) ? lotSheetsData.sheets : []),
    [selectedLotId, lotSheetsData]
  );

  const generatedCodes = useMemo(
    () => new Set((sheetGenerated || []).map((s) => s.pieceCode)),
    [sheetGenerated]
  );


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

  // Lot dropdown options, e.g. "GOAT SUEDE — D.BLUE (12099.5 dcm)"
  const lotOptions = useMemo(() => {
    return (lots || []).map((l) => {
      const qty = l.available ?? l.remaining ?? l.on_hand;
      const sheetCount = l.sheets_balance ?? l.sheets_arrived;
      const sheetPart = sheetCount !== undefined && sheetCount !== null ? ` · ${sheetCount} sheets` : '';
      const qtyPart = qty !== undefined && qty !== null ? ` (${qty} ${l.uom || 'dcm'}${sheetPart})` : '';
      const id = l.lot_id || l.id;
      const barcodePart = l.barcode ? `${l.barcode} · ` : '';
      const suggestedPart = suggestedLotId && id === suggestedLotId ? ' ★ Suggested' : '';
      return {
        value: id,
        label: `${barcodePart}${l.article || 'LOT'} — ${l.colour || '-'}${qtyPart}${suggestedPart}`,
      };
    });
  }, [lots, suggestedLotId]);

  const selectedLot = useMemo(
    () => (lots || []).find((l) => (l.lot_id || l.id) === selectedLotId),
    [lots, selectedLotId]
  );

  // Dynamic & standard color dropdown options (prioritizing selected lot & order's SKU colors)
  const colorOptions = useMemo(() => {
    const set = new Set();
    // 0. Selected lot colour first
    if (lotSheetsData?.colour) set.add(lotSheetsData.colour.toUpperCase());
    if (selectedLot?.colour) set.add(selectedLot.colour.toUpperCase());
    // 0b. Colours offered by the lots response
    (Array.isArray(lotsData?.options?.colour) ? lotsData.options.colour : []).forEach((c) => {
      if (c) set.add(String(c).toUpperCase());
    });
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
  }, [orderMeta, materials, sheetGenerated, lotSheetsData, selectedLot, lotsData]);

  // Search & Selection state
  const [search, setSearch] = useState('');
  const [selectedCodes, setSelectedCodes] = useState(new Set());

  // Sheets that will be minted: selected and not already generated
  const pendingSheets = useMemo(
    () => lotSheets.filter((sh) => !excludedSheetCodes.has(sh.code) && !generatedCodes.has(sh.code)),
    [lotSheets, excludedSheetCodes, generatedCodes]
  );

  const toggleSheet = (code) => {
    setExcludedSheetCodes((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  // Preview generated code(s) — the lot sheet codes themselves
  const previewCode = useMemo(() => {
    if (!selectedLotId) return 'Select a lot';
    if (pendingSheets.length === 0) return 'No sheets selected';
    const shown = pendingSheets.slice(0, 3).map((sh) => sh.code).join(', ');
    return pendingSheets.length > 3 ? `${shown} +${pendingSheets.length - 3} more` : shown;
  }, [selectedLotId, pendingSheets]);

  // Form submission handler — one barcode per selected lot sheet, using sheet.code
  const handleGenerate = (e) => {
    e.preventDefault();
    const ord = (selectedOrder?.order_number || selectedOrderId || '').trim();
    const col = color.trim().toUpperCase();
    if (!ord || !selectedLotId || !col || pendingSheets.length === 0) return;

    const clientName = selectedOrder?.client_name || ord;
    const article = lotSheetsData?.article || selectedLot?.article || '';
    const uom = lotSheetsData?.uom || 'dcm';
    const batchNo = `SHT-${Date.now().toString().slice(-6)}`;
    const createdDate = new Date().toLocaleString();

    const records = pendingSheets.map((sh, idx) => ({
      pieceCode: sh.code,
      sheetId: sh.sheet_id,
      lotId: selectedLotId,
      orderId: ord,
      orderNumber: ord,
      client: clientName,
      article,
      style: article ? `${article} · ${sh.dcm} ${uom}` : `Sheet ${sh.code}`,
      color: col,
      size: `${sh.dcm} ${uom}`,
      dcm: sh.dcm,
      serial: idx + 1,
      serialStr: String(idx + 1).padStart(3, '0'),
      batchNo,
      createdDate,
      generatedBy: operatorLabel || 'OPERATOR',
      printStatus: 'PENDING',
      printCount: 0,
    }));

    onGenerateSheets(records);
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
          Select the Order, then the Lot, then the Color. Each leather sheet in the lot is minted with its sheet code as the barcode.
        </p>

        <form onSubmit={handleGenerate} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    setSelectedLotId('');
                    setColor('');
                  }}
                  placeholder="-- Select an order --"
                  options={orderOptions}
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>
                Lot
              </label>
              {lotsLoading && lots.length === 0 ? (
                <div className="flex items-center gap-2 text-sm py-2.5" style={{ color: BRAND.textMuted }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading lots…
                </div>
              ) : lotsError && lots.length === 0 ? (
                <p className="text-sm" style={{ color: '#b91c1c' }}>{String(lotsError)}</p>
              ) : (
                <ScreenSafeSelect
                  value={selectedLotId}
                  onChange={(val) => {
                    setSelectedLotId(val);
                    setExcludedSheetCodes(new Set());
                    // Auto-fill Color from the chosen lot's colour
                    const lot = lots.find((l) => (l.lot_id || l.id) === val);
                    setColor(lot?.colour ? lot.colour.toUpperCase() : '');
                  }}
                  placeholder={selectedOrderId ? '-- Select Lot --' : 'Select an order first'}
                  options={lotOptions}
                  disabled={!selectedOrderId}
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

          {/* Sheets in the selected lot — their codes become the barcodes */}
          {selectedLotId && (
            <div className="rounded-xl p-3 space-y-2" style={{ background: BRAND.bg, border: '1px solid rgba(200,131,74,0.2)' }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-bold" style={{ color: BRAND.text }}>
                  Lot Sheets{lotSheetsData ? ` — ${lotSheetsData.article || ''} ${lotSheetsData.colour || ''} (${lotSheets.length})` : ''}
                </p>
                {lotSheets.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExcludedSheetCodes(new Set())}
                      className="btn-warm-secondary !min-h-0 !py-1 !px-2.5 text-[11px]"
                    >
                      Select All
                    </button>
                    <button
                      type="button"
                      onClick={() => setExcludedSheetCodes(new Set(lotSheets.map((sh) => sh.code)))}
                      className="btn-warm-secondary !min-h-0 !py-1 !px-2.5 text-[11px]"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
              {sheetsLoading ? (
                <div className="flex items-center gap-2 text-xs py-2" style={{ color: BRAND.textMuted }}>
                  <Loader2 className="w-4 h-4 animate-spin" /> Loading sheets…
                </div>
              ) : sheetsError ? (
                <p className="text-xs" style={{ color: '#b91c1c' }}>{String(sheetsError)}</p>
              ) : lotSheets.length === 0 ? (
                <p className="text-xs py-2" style={{ color: BRAND.textMuted }}>No sheets registered for this lot.</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 max-h-56 overflow-y-auto">
                  {lotSheets.map((sh) => {
                    const minted = generatedCodes.has(sh.code);
                    const checked = minted || !excludedSheetCodes.has(sh.code);
                    return (
                      <label
                        key={sh.sheet_id || sh.code}
                        className={`flex items-center gap-2 rounded-lg px-2.5 py-2 text-xs ${minted ? 'opacity-60 cursor-default' : 'cursor-pointer'}`}
                        style={{ background: '#fff', border: `1px solid ${checked && !minted ? BRAND.accent : 'rgba(200,131,74,0.2)'}` }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={minted}
                          onChange={() => toggleSheet(sh.code)}
                          className="w-3.5 h-3.5 accent-[#c8834a]"
                        />
                        <span className="min-w-0">
                          <span className="block font-mono font-bold truncate" style={{ color: '#5a3518' }}>{sh.code}</span>
                          <span className="block text-[10px] text-gray-500 truncate">
                            {sh.dcm} {lotSheetsData?.uom || 'dcm'} • {minted ? 'MINTED' : sh.status}
                          </span>
                        </span>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>
          )}

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
              disabled={!selectedOrderId || !selectedLotId || !color.trim() || pendingSheets.length === 0}
              className="btn-warm-primary !min-h-0 !py-2.5 !px-5 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-4 h-4" /> Generate Sheet Barcode{pendingSheets.length > 1 ? `s (${pendingSheets.length})` : ''}
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
