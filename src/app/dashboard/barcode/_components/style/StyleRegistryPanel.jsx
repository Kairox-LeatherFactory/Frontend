'use client';
import { useState, useMemo, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { PackageSearch, Loader2, Barcode, RotateCcw } from 'lucide-react';
import {
  apiGetBarcodeDetail, apiPrintBarcodes,
} from '@/lib/api';
import { BRAND, STYLE_HISTORY_PAGE_SIZE, DEFAULT_STYLE_FILTERS } from '../../_lib/constants';
import {
  setStyleSelectedOrder,
  setStyleFilter,
  resetStyleFilters,
  setStylePage,
  togglePrintSelected,
  setPrintSelected,
  addPrintSelected,
  clearPrintSelected,
  setActiveTab,
} from '../../_lib/barcodeSlice';
import {
  useGetBarcodeOrdersQuery,
  useGetOrderMetaQuery,
  useGetOrderBarcodesQuery,
} from '../../_lib/barcodeApiSlice';
import ScreenSafeSelect from '../ScreenSafeSelect';
import LiveBarcodeDetailModal from '../modals/LiveBarcodeDetailModal';
import StyleGenerationGrid from './StyleGenerationGrid';
import StylePrintQueue from './StylePrintQueue';
import StyleHistoryTable from './StyleHistoryTable';

/**
 * ============================================================================
 * StyleRegistryPanel Master Component
 * ============================================================================
 * WHAT IT IS:
 * Master controller component managing piece-level production order barcodes.
 *
 * WHY IT EXISTS:
 * Stays mounted across Batch Generation, Print Center, and Batch History tabs
 * to retain active order selection, filter states, and queued print selections
 * without refetching or losing state on tab switches.
 *
 * WORKFLOW:
 * 1. Loads list of production orders with minted barcodes (`GET /api/v1/barcode/orders`).
 * 2. Fetches order summary analytics and SKUs (`GET /api/v1/barcode/orders/:id/analytics`).
 * 3. Fetches paginated barcodes (`GET /api/v1/barcode/orders/:id/barcodes`).
 * 4. Submits print payloads to `POST /api/v1/barcode/print`.
 */
export default function StyleRegistryPanel({ activeTab, token, showToast, setPrintSheetItems }) {
  const dispatch = useDispatch();

  // --------------------------------------------------------------------------
  // 1. REDUX GLOBAL STATE (replaces 6 useState fields)
  // --------------------------------------------------------------------------
  const selectedOrderId = useSelector((s) => s.barcode.byCategory.style.selectedOrderId);
  const filters = useSelector((s) => s.barcode.byCategory.style.filters);
  const page = useSelector((s) => s.barcode.byCategory.style.page);
  const selectedCodes = useSelector((s) => s.barcode.selection.printSelected.style);

  // --------------------------------------------------------------------------
  // 2. RTK QUERY HOOKS (replaces 3 useEffect blocks + 9 useState fields)
  // --------------------------------------------------------------------------

  // --- Orders roster ---
  const {
    data: orders = [],
    isLoading: ordersLoading,
    error: ordersErrorObj,
  } = useGetBarcodeOrdersQuery(undefined, { skip: !token });
  const ordersError = ordersErrorObj?.data?.detail || ordersErrorObj?.error || null;

  // --- Order analytics & SKUs ---
  const {
    data: orderMeta,
    isLoading: orderMetaLoading,
    error: orderMetaErrorObj,
  } = useGetOrderMetaQuery(selectedOrderId, {
    skip: !token || !selectedOrderId,
  });
  const skuOptions = orderMeta?.skuOptions ?? [];
  const analytics = orderMeta?.analytics ?? null;
  const orderMetaError = orderMetaErrorObj?.data?.detail || orderMetaErrorObj?.error || null;

  // --- Paginated barcodes ---
  const {
    data: historyData,
    isLoading: historyLoading,
    error: historyErrorObj,
  } = useGetOrderBarcodesQuery(
    {
      orderId: selectedOrderId,
      styleId: filters.styleId,
      size: filters.size,
      page,
      pageSize: STYLE_HISTORY_PAGE_SIZE,
    },
    { skip: !token || !selectedOrderId },
  );
  const historyError = historyErrorObj?.data?.detail || historyErrorObj?.error || null;

  // --------------------------------------------------------------------------
  // 3. LOCAL-ONLY STATE (confirmed local, untouched)
  // --------------------------------------------------------------------------
  const [search, setSearch] = useState('');
  const [printing, setPrinting] = useState(false);

  // Inspection modal state
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailData, setDetailData] = useState(null);

  // --------------------------------------------------------------------------
  // 4. ORDER SELECTION & FILTER HELPERS
  // --------------------------------------------------------------------------
  const handleSelectOrder = (id) => {
    dispatch(setStyleSelectedOrder(id));
    setSearch('');
  };

  const setFilter = (field, value) => {
    dispatch(setStyleFilter({ field, value }));
  };

  const handleResetFilters = () => {
    dispatch(resetStyleFilters());
  };

  // Colour has no server-side filter, so it's applied client-side over the fetched page
  const rows = useMemo(() => {
    const items = historyData?.items || [];
    if (!filters.color || filters.color === 'ALL') return items;
    return items.filter((r) => r.colour === filters.color);
  }, [historyData, filters.color]);

  // --------------------------------------------------------------------------
  // 5. CHECKBOX SELECTION HELPERS (using Redux arrays instead of local Sets)
  // --------------------------------------------------------------------------
  const toggleCode = (code) => {
    dispatch(togglePrintSelected({ category: 'style', code }));
  };

  const clearSelection = () => dispatch(clearPrintSelected('style'));

  const addCodes = (codes) => {
    dispatch(addPrintSelected({ category: 'style', codes }));
  };

  // --------------------------------------------------------------------------
  // 6. INSPECT BARCODE DETAILS (GET /api/v1/barcode/detail)
  // --------------------------------------------------------------------------
  const openDetail = useCallback(async (code) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailError(null);
    setDetailData(null);
    try {
      const data = await apiGetBarcodeDetail(token, code);
      setDetailData(data);
    } catch (err) {
      setDetailError(err.message || 'Failed to load barcode detail.');
    } finally {
      setDetailLoading(false);
    }
  }, [token]);

  const currentOrder = useMemo(() => orders.find((o) => o.order_id === selectedOrderId), [orders, selectedOrderId]);
  const rowByCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows]);

  // Wrap selectedCodes array into a Set-like for backward compat with child components
  const selectedCodesSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  // --------------------------------------------------------------------------
  // 7. PRINT NORMALIZATION & SUBMISSION HANDLERS
  // --------------------------------------------------------------------------
  const buildPrintCards = useCallback((labels) => labels.map((l) => {
    const row = rowByCode.get(l.code);
    return {
      pieceCode: l.code,
      orderId: currentOrder?.order_number || '—',
      client: currentOrder?.client_name || '—',
      style: row?.style_name || l.caption || '—',
      article: row?.article || '—',
      color: row?.colour || '—',
      size: row?.size || '—',
      serialStr: row?.seq != null ? String(row.seq).padStart(3, '0') : '—',
      batchNo: currentOrder?.order_number || '—',
      printStatus: row?.status === 'retired' ? 'PARTIAL' : 'PENDING',
    };
  }), [rowByCode, currentOrder]);

  const handlePrint = useCallback(async (args) => {
    setPrinting(true);
    try {
      const labels = await apiPrintBarcodes(token, args);
      const cards = buildPrintCards(labels);
      if (cards.length === 0) {
        showToast('No labels returned for this selection.', 'info');
        return;
      }
      setPrintSheetItems(cards);
      showToast(`Sending ${cards.length} label${cards.length === 1 ? '' : 's'} to printer (4 per page)…`, 'success');
    } catch (err) {
      showToast(err.message || 'Failed to generate print labels.', 'error');
    } finally {
      setPrinting(false);
    }
  }, [token, buildPrintCards, setPrintSheetItems, showToast]);

  const handlePrintSelected = () => {
    if (selectedCodes.length === 0) {
      showToast('Select at least one barcode to print!', 'error');
      return;
    }
    handlePrint({ codes: Array.from(selectedCodes) });
  };

  const handlePrintSingleCode = (code) => handlePrint({ codes: [code] });

  const handlePrintEntireOrder = () => {
    if (!selectedOrderId) return;
    handlePrint({ order_id: selectedOrderId });
  };

  const handleSendToPrintCenter = () => {
    if (selectedCodes.length === 0) {
      showToast('Select at least one barcode to send to Print Center!', 'error');
      return;
    }
    dispatch(setActiveTab('print'));
    showToast(`${selectedCodes.length} barcode${selectedCodes.length === 1 ? '' : 's'} queued in Print Center!`, 'success');
  };

  // --------------------------------------------------------------------------
  // 8. CSV AUDIT EXPORT HANDLER
  // --------------------------------------------------------------------------
  const handleExportCSV = () => {
    const header = ['Code', 'Status', 'SKU', 'Style', 'Colour', 'Size', 'Seq', 'Current Stage', 'Generated At'];
    const csvRows = [header, ...rows.map((r) => [r.code, r.status, r.sku_code, r.style_name, r.colour, r.size, r.seq, r.current_stage, r.generated_at])];
    const csv = csvRows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode-history-${currentOrder?.order_number || selectedOrderId}-page${page}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Distinct filter options extracted from order SKUs
  const styleFilterOptions = useMemo(() => {
    const map = new Map();
    skuOptions.forEach((s) => { if (!map.has(s.style_id)) map.set(s.style_id, s.style_name || s.style_id); });
    return Array.from(map.entries());
  }, [skuOptions]);
  const sizeFilterOptions = useMemo(() => Array.from(new Set(skuOptions.map((s) => s.size).filter(Boolean))), [skuOptions]);
  const colorFilterOptions = useMemo(() => Array.from(new Set(skuOptions.map((s) => s.colour).filter(Boolean))), [skuOptions]);

  // --------------------------------------------------------------------------
  // 9. RENDER REGISTRY PANEL
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* --- Section 1: Production Order Picker Card --- */}
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <h3 className="text-base font-black flex items-center gap-2" style={{ color: BRAND.text }}>
          <PackageSearch className="w-4 h-4" style={{ color: BRAND.accent }} /> Live Barcode Registry
        </h3>
        <p className="text-xs mt-0.5" style={{ color: BRAND.textMuted }}>
          Piece barcodes are minted automatically during Cutting — this screen browses, audits, and prints what&apos;s already registered.
        </p>
        <div className="mt-4">
          <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>
            Production Order
          </label>
          {ordersLoading ? (
            <div className="flex items-center gap-2 text-sm py-2.5" style={{ color: BRAND.textMuted }}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading orders…
            </div>
          ) : ordersError ? (
            <p className="text-sm" style={{ color: '#b91c1c' }}>{ordersError}</p>
          ) : orders.length === 0 ? (
            <p className="text-sm" style={{ color: BRAND.textMuted }}>No orders have generated barcodes yet.</p>
          ) : (
            <div className="sm:!w-[420px]">
              <ScreenSafeSelect
                value={selectedOrderId}
                onChange={handleSelectOrder}
                placeholder="-- Select an order --"
                options={orders.map((o) => ({
                  value: o.order_id,
                  label: `${o.order_number} — ${o.client_name} (${o.minted} pcs)`,
                }))}
              />
            </div>
          )}
        </div>
      </div>

      {/* --- Section 2: Order Analytics & Sub-Tabs Content --- */}
      {!selectedOrderId ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
          <Barcode className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: BRAND.textMuted }} />
          <p className="font-bold" style={{ color: BRAND.textMuted }}>Select an order above to browse its barcode registry.</p>
        </div>
      ) : (
        <>
          {/* Order Metrics & Statistics Bar */}
          <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
            {orderMetaLoading ? (
              <div className="flex items-center gap-2 text-sm py-4" style={{ color: BRAND.textMuted }}>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…
              </div>
            ) : orderMetaError ? (
              <p className="text-sm" style={{ color: '#b91c1c' }}>{orderMetaError}</p>
            ) : analytics ? (
              <div className="flex items-center gap-6 flex-wrap">
                <div>
                  <p className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: BRAND.textMuted }}>
                    Total Count
                  </p>
                  <p className="text-xl font-black mt-0.5" style={{ color: BRAND.text }}>
                    {analytics.order_total?.generated ?? historyData?.total ?? 0} pcs
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Filtering Controls Toolbar */}
          <div className="rounded-2xl p-5 shadow-sm grid gap-4 items-end" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}`, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
            <div>
              <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Style</label>
              <ScreenSafeSelect
                value={filters.styleId}
                onChange={(v) => setFilter('styleId', v)}
                placeholder="All Styles"
                options={[{ value: 'ALL', label: 'All Styles' }, ...styleFilterOptions.map(([id, name]) => ({ value: id, label: name }))]}
              />
            </div>
            <div>
              <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Size</label>
              <ScreenSafeSelect
                value={filters.size}
                onChange={(v) => setFilter('size', v)}
                placeholder="All Sizes"
                options={[{ value: 'ALL', label: 'All Sizes' }, ...sizeFilterOptions.map((sz) => ({ value: sz, label: sz }))]}
              />
            </div>
            <div>
              <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Color</label>
              <ScreenSafeSelect
                value={filters.color}
                onChange={(v) => setFilter('color', v)}
                placeholder="All Colors"
                options={[{ value: 'ALL', label: 'All Colors' }, ...colorFilterOptions.map((c) => ({ value: c, label: c }))]}
              />
            </div>
            <button onClick={handleResetFilters} className="btn-warm-secondary !min-h-0 !py-2.5">
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>

          {/* Sub-Tab Dynamic Switcher (Generation Grid, Print Queue, History Table) */}
          <div key={activeTab}>
            {activeTab === 'generation' && (
              <StyleGenerationGrid
                rows={rows}
                historyLoading={historyLoading}
                historyError={historyError}
                search={search}
                setSearch={setSearch}
                selectedCodes={selectedCodesSet}
                toggleCode={toggleCode}
                clearSelection={clearSelection}
                addCodes={addCodes}
                page={page}
                setPage={(p) => dispatch(setStylePage(p))}
                pages={historyData?.pages || 1}
                total={historyData?.total || 0}
                onOpenDetail={openDetail}
                onPrintSingle={handlePrintSingleCode}
                onSendToPrintCenter={handleSendToPrintCenter}
                onPrintOrder={handlePrintEntireOrder}
                printing={printing}
              />
            )}
            {activeTab === 'print' && (
              <StylePrintQueue
                selectedCodes={selectedCodesSet}
                rowByCode={rowByCode}
                rows={rows}
                addCodes={addCodes}
                onRemove={toggleCode}
                onClear={clearSelection}
                onPrintSelected={handlePrintSelected}
                onPrintOrder={handlePrintEntireOrder}
                onPrintCodes={(codes) => handlePrint({ codes })}
                onOpenDetail={openDetail}
                printing={printing}
              />
            )}
            {activeTab === 'history' && (
              <StyleHistoryTable
                rows={rows}
                historyLoading={historyLoading}
                historyError={historyError}
                page={page}
                setPage={(p) => dispatch(setStylePage(p))}
                pages={historyData?.pages || 1}
                total={historyData?.total || 0}
                onOpenDetail={openDetail}
                onPrintSingle={handlePrintSingleCode}
                onExportCSV={handleExportCSV}
              />
            )}
          </div>
        </>
      )}

      {/* Pop-up Live Barcode Detail Inspection Modal */}
      <LiveBarcodeDetailModal
        open={detailOpen}
        loading={detailLoading}
        error={detailError}
        data={detailData}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}
