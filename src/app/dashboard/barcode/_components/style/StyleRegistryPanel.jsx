'use client';
import { useState, useMemo, useEffect, useCallback } from 'react';
import { PackageSearch, Loader2, Barcode, RotateCcw } from 'lucide-react';
import {
  apiGetBarcodeDetail, apiPrintBarcodes,
  apiGetBarcodeOrders, apiGetOrderBarcodeSkus, apiGetOrderBarcodeAnalytics, apiGetOrderBarcodes,
} from '@/lib/api';
import { BRAND, STYLE_HISTORY_PAGE_SIZE, DEFAULT_STYLE_FILTERS } from '../../_lib/constants';
import { statusBadgeClass } from '../../_lib/helpers';
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
  // --------------------------------------------------------------------------
  // 1. ORDER SELECTION & DATA STATE
  // --------------------------------------------------------------------------
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState(null);
  const [selectedOrderId, setSelectedOrderId] = useState('');

  // --------------------------------------------------------------------------
  // 2. ORDER METADATA & ANALYTICS STATE
  // --------------------------------------------------------------------------
  const [skuOptions, setSkuOptions] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [orderMetaLoading, setOrderMetaLoading] = useState(false);
  const [orderMetaError, setOrderMetaError] = useState(null);

  // --------------------------------------------------------------------------
  // 3. BARCODE PAGINATION & FILTER STATE
  // --------------------------------------------------------------------------
  const [filters, setFiltersState] = useState(DEFAULT_STYLE_FILTERS);
  const [page, setPage] = useState(1);
  const [historyData, setHistoryData] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // --------------------------------------------------------------------------
  // 4. PRINT QUEUE & SELECTION STATE
  // --------------------------------------------------------------------------
  const [selectedCodes, setSelectedCodes] = useState(() => new Set());
  const [search, setSearch] = useState('');
  const [printing, setPrinting] = useState(false);

  // --------------------------------------------------------------------------
  // 5. INSPECTION MODAL STATE
  // --------------------------------------------------------------------------
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);
  const [detailData, setDetailData] = useState(null);

  // --------------------------------------------------------------------------
  // 6. EFFECT: LOAD ORDERS ROSTER (GET /api/v1/barcode/orders)
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      setOrdersLoading(true);
      setOrdersError(null);
      try {
        const rows = await apiGetBarcodeOrders(token);
        if (!cancelled) setOrders(Array.isArray(rows) ? rows : []);
      } catch (err) {
        if (!cancelled) setOrdersError(err.message || 'Failed to load orders.');
      } finally {
        if (!cancelled) setOrdersLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // --------------------------------------------------------------------------
  // 7. EFFECT: LOAD ORDER ANALYTICS & SKUs
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!token || !selectedOrderId) return;
    let cancelled = false;
    (async () => {
      setOrderMetaLoading(true);
      setOrderMetaError(null);
      try {
        const [skus, an] = await Promise.all([
          apiGetOrderBarcodeSkus(token, selectedOrderId),
          apiGetOrderBarcodeAnalytics(token, selectedOrderId),
        ]);
        if (cancelled) return;
        setSkuOptions(Array.isArray(skus) ? skus : []);
        setAnalytics(an);
      } catch (err) {
        if (!cancelled) setOrderMetaError(err.message || 'Failed to load order analytics.');
      } finally {
        if (!cancelled) setOrderMetaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, selectedOrderId]);

  // --------------------------------------------------------------------------
  // 8. EFFECT: LOAD PAGINATED BARCODES FOR ORDER
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!token || !selectedOrderId) return;
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      setHistoryError(null);
      try {
        const data = await apiGetOrderBarcodes(token, selectedOrderId, {
          styleId: filters.styleId !== 'ALL' ? filters.styleId : undefined,
          size: filters.size !== 'ALL' ? filters.size : undefined,
          status: filters.status !== 'ALL' ? filters.status : undefined,
          page,
          pageSize: STYLE_HISTORY_PAGE_SIZE,
        });
        if (!cancelled) setHistoryData(data);
      } catch (err) {
        if (!cancelled) setHistoryError(err.message || 'Failed to load barcode history.');
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token, selectedOrderId, filters, page]);

  // --------------------------------------------------------------------------
  // 9. ORDER SELECTION & FILTER HELPERS
  // --------------------------------------------------------------------------
  const handleSelectOrder = (id) => {
    setSelectedOrderId(id);
    setFiltersState(DEFAULT_STYLE_FILTERS);
    setPage(1);
    setSelectedCodes(new Set());
    setSearch('');
    setSkuOptions([]);
    setAnalytics(null);
    setHistoryData(null);
  };

  const setFilter = (field, value) => {
    setFiltersState((prev) => ({ ...prev, [field]: value }));
    setPage(1);
  };

  const resetFilters = () => {
    setFiltersState(DEFAULT_STYLE_FILTERS);
    setPage(1);
  };

  const rows = useMemo(() => historyData?.items || [], [historyData]);

  // --------------------------------------------------------------------------
  // 10. CHECKBOX SELECTION HELPERS
  // --------------------------------------------------------------------------
  const toggleCode = (code) => setSelectedCodes((prev) => {
    const next = new Set(prev);
    next.has(code) ? next.delete(code) : next.add(code);
    return next;
  });

  const selectAllVisible = () => setSelectedCodes((prev) => {
    const next = new Set(prev);
    rows.forEach((r) => next.add(r.code));
    return next;
  });

  const clearSelection = () => setSelectedCodes(new Set());

  const addCodes = (codes) => setSelectedCodes((prev) => {
    const next = new Set(prev);
    codes.forEach((c) => next.add(c));
    return next;
  });

  // --------------------------------------------------------------------------
  // 11. INSPECT BARCODE DETAILS (GET /api/v1/barcode/detail)
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

  // --------------------------------------------------------------------------
  // 12. PRINT NORMALIZATION & SUBMISSION HANDLERS
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
    if (selectedCodes.size === 0) {
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

  // --------------------------------------------------------------------------
  // 13. CSV AUDIT EXPORT HANDLER
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

  // --------------------------------------------------------------------------
  // 14. RENDER REGISTRY PANEL
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
              <>
                <div className="flex items-center gap-6 flex-wrap">
                  <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Planned</p><p className="font-bold" style={{ color: BRAND.text }}>{analytics.order_total.planned} pcs</p></div>
                  <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{analytics.order_total.generated} pcs</p></div>
                  <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Balance</p><p className="font-bold" style={{ color: '#d97706' }}>{analytics.order_total.balance} pcs</p></div>
                  <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Active</p><p className="font-bold" style={{ color: '#16a34a' }}>{analytics.order_total.active}</p></div>
                  <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Retired</p><p className="font-bold" style={{ color: BRAND.textMuted }}>{analytics.order_total.retired}</p></div>
                  <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Duplicates</p><p className="font-bold" style={{ color: analytics.order_total.duplicates > 0 ? '#b91c1c' : '#16a34a' }}>{analytics.order_total.duplicates}</p></div>
                  <span className={statusBadgeClass(analytics.order_total.fully_generated ? 'PRINTED' : 'PARTIAL')}>
                    {analytics.order_total.fully_generated ? 'Fully Generated' : analytics.order_total.half_minted ? 'Partially Minted' : 'Pending Cutting'}
                  </span>
                </div>

                {/* Per-Style Breakdown Cards */}
                {analytics.by_style.length > 0 && (
                  <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
                    {analytics.by_style.map((st) => (
                      <div key={st.style_id} className="rounded-lg p-3 text-xs space-y-1.5" style={{ background: BRAND.bg, border: '1px solid rgba(200,131,74,0.15)' }}>
                        <div className="font-bold text-sm truncate" style={{ color: '#5a3518' }}>{st.style_name}</div>
                        <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Planned:</span><strong>{st.planned}</strong></div>
                        <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Minted:</span><strong>{st.minted}</strong></div>
                        <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Balance:</span><strong style={{ color: '#c8834a' }}>{st.balance}</strong></div>
                      </div>
                    ))}
                  </div>
                )}
              </>
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
              <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Status</label>
              <ScreenSafeSelect
                value={filters.status}
                onChange={(v) => setFilter('status', v)}
                placeholder="All Statuses"
                options={[
                  { value: 'ALL', label: 'All Statuses' },
                  { value: 'active', label: 'Active' },
                  { value: 'retired', label: 'Retired' },
                ]}
              />
            </div>
            <button onClick={resetFilters} className="btn-warm-secondary !min-h-0 !py-2.5">
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
                selectedCodes={selectedCodes}
                toggleCode={toggleCode}
                selectAllVisible={selectAllVisible}
                clearSelection={clearSelection}
                addCodes={addCodes}
                page={page}
                setPage={setPage}
                pages={historyData?.pages || 1}
                total={historyData?.total || 0}
                onOpenDetail={openDetail}
                onPrintSingle={handlePrintSingleCode}
                onPrintSelected={handlePrintSelected}
                onPrintOrder={handlePrintEntireOrder}
                printing={printing}
              />
            )}
            {activeTab === 'print' && (
              <StylePrintQueue
                selectedCodes={selectedCodes}
                rowByCode={rowByCode}
                onRemove={toggleCode}
                onClear={clearSelection}
                onPrintSelected={handlePrintSelected}
                onPrintOrder={handlePrintEntireOrder}
                printing={printing}
              />
            )}
            {activeTab === 'history' && (
              <StyleHistoryTable
                rows={rows}
                historyLoading={historyLoading}
                historyError={historyError}
                page={page}
                setPage={setPage}
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
