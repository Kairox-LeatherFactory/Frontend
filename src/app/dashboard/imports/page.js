'use client';
import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetBreakdown as realApiGetBreakdown,
  apiPatchBreakdownSku as realApiPatchBreakdownSku,
  apiDeleteBreakdownSku as realApiDeleteBreakdownSku,
  apiCancelBreakdownStyles as realApiCancelBreakdownStyles,
  apiReleaseBreakdownStyles as realApiReleaseBreakdownStyles,
  apiGetDrawerPool as realApiGetDrawerPool,
  apiGrowDrawerPool as realApiGrowDrawerPool,
  apiAllocateWaitingDrawers as realApiAllocateWaitingDrawers,
} from '@/lib/api';

/**
 * TEMPORARY MOCK LAYER — the two-phase breakdown/release endpoints
 * (Item 9, 17-Aug change set) aren't deployed yet, and `POST
 * /imports/commit` still mints real barcodes+drawers immediately on the
 * live backend (confirmed: one test upload minted 1425 real drawers).
 * Mock the whole review/CRUD/release/drawer-pool surface here so this
 * screen can be built and tested without burning real permanent data.
 * Delete this block (and switch the `real*` imports above back to their
 * plain names) once the real endpoints are live and mint-on-commit is
 * gone.
 */
const MOCK_BREAKDOWN = false;

const _mockBreakdowns = new Map(); // order_number -> breakdown object
const _mockDrawerPool = { pool_size: 200, initial_pool_size: 200, free_drawers: 200, occupied_drawers: 0, pieces_waiting_for_drawer: 0, shortfall: 0 };
let _mockSeq = 0;

function _makeMockStyle(orderId, styleName, sizes) {
  const styleId = `mock-style-${++_mockSeq}`;
  const skus = Object.entries(sizes).map(([size, qty]) => ({
    sku_id: `mock-sku-${++_mockSeq}`,
    sku_code: `${orderId}-${styleName.replace(/\s+/g, '_')}-${size}`,
    colour: 'DARK BROWN',
    color_code: 'DARK BROWN',
    size,
    qty_ordered: qty,
    knit_color: null,
    nylon_color: null,
  }));
  const qtyOrdered = skus.reduce((a, s) => a + s.qty_ordered, 0);
  return {
    style_id: styleId,
    style_code: `${orderId}-${styleName.replace(/\s+/g, '_')}`,
    style_name: styleName,
    article: 'GOAT SUEDE',
    production_status: 'DRAFT',
    released_at: null,
    released_by: null,
    editable: true,
    needs_lining: /KNIT|DETACH|WOOL|MIX/i.test(styleName),
    sku_count: skus.length,
    qty_ordered: qtyOrdered,
    minted_pieces: 0,
    skus,
  };
}

function _getOrCreateMockBreakdown(orderNumber) {
  if (_mockBreakdowns.has(orderNumber)) return _mockBreakdowns.get(orderNumber);
  const styles = [
    _makeMockStyle(orderNumber, 'ADELE KNIT', { '38': 8, '40': 15, '42': 17 }),
    _makeMockStyle(orderNumber, 'CARNABY', { S: 24, M: 53, L: 52 }),
    _makeMockStyle(orderNumber, 'CLERMONT', { '48': 9, '50': 14, '52': 15 }),
  ];
  const breakdown = { order_id: `mock-order-${orderNumber}`, order_number: orderNumber, styles };
  _mockBreakdowns.set(orderNumber, breakdown);
  return breakdown;
}

function _recomputeTotals(breakdown) {
  const styles = breakdown.styles;
  return {
    styles: styles.length,
    styles_draft: styles.filter((s) => s.production_status === 'DRAFT').length,
    styles_released: styles.filter((s) => s.production_status === 'RELEASED').length,
    qty_ordered: styles.reduce((a, s) => a + s.qty_ordered, 0),
    qty_draft: styles.filter((s) => s.production_status === 'DRAFT').reduce((a, s) => a + s.qty_ordered, 0),
    minted_pieces: styles.reduce((a, s) => a + s.minted_pieces, 0),
  };
}

async function mockApiGetBreakdown(token, orderNumber) {
  const breakdown = _getOrCreateMockBreakdown(orderNumber);
  return { ...breakdown, totals: _recomputeTotals(breakdown) };
}

async function mockApiPatchBreakdownSku(token, skuId, payload) {
  for (const breakdown of _mockBreakdowns.values()) {
    for (const style of breakdown.styles) {
      const sku = style.skus.find((s) => s.sku_id === skuId);
      if (sku) {
        if (payload.qty_ordered !== undefined) sku.qty_ordered = payload.qty_ordered;
        if (payload.size !== undefined) sku.size = payload.size;
        if (payload.color_name !== undefined) sku.colour = payload.color_name;
        if (payload.color_code !== undefined) sku.color_code = payload.color_code;
        style.qty_ordered = style.skus.reduce((a, s) => a + s.qty_ordered, 0);
        return { sku_id: sku.sku_id, sku_code: sku.sku_code, qty_ordered: sku.qty_ordered, colour: sku.colour, size: sku.size, changed: payload };
      }
    }
  }
  throw new Error('SKU not found (mock).');
}

async function mockApiDeleteBreakdownSku(token, skuId) {
  for (const breakdown of _mockBreakdowns.values()) {
    for (const style of breakdown.styles) {
      const idx = style.skus.findIndex((s) => s.sku_id === skuId);
      if (idx !== -1) {
        const [removed] = style.skus.splice(idx, 1);
        style.sku_count = style.skus.length;
        style.qty_ordered = style.skus.reduce((a, s) => a + s.qty_ordered, 0);
        return { deleted: true, sku_id: removed.sku_id, sku_code: removed.sku_code };
      }
    }
  }
  throw new Error('SKU not found (mock).');
}

async function mockApiCancelBreakdownStyles(token, orderNumber, styleIds) {
  const breakdown = _getOrCreateMockBreakdown(orderNumber);
  const cancelled = [];
  const rejected = [];
  styleIds.forEach((id) => {
    const style = breakdown.styles.find((s) => s.style_id === id);
    if (!style) return;
    if (style.production_status !== 'DRAFT') {
      rejected.push({ style_id: id, style_code: style.style_code, reason: `Already ${style.production_status}` });
      return;
    }
    style.production_status = 'CANCELLED';
    cancelled.push({ style_id: id, style_code: style.style_code });
  });
  return { cancelled, rejected };
}

async function mockApiReleaseBreakdownStyles(token, orderNumber, styleIds, growDrawerPool) {
  const breakdown = _getOrCreateMockBreakdown(orderNumber);
  const released = [];
  const rejected = [];
  let piecesMinted = 0, drawersReused = 0, drawersMinted = 0, piecesWaiting = 0, piecesNeedingLining = 0;

  styleIds.forEach((id) => {
    const style = breakdown.styles.find((s) => s.style_id === id);
    if (!style) return;
    if (style.production_status !== 'DRAFT') {
      rejected.push({ style_id: id, style_code: style.style_code, reason: `Already ${style.production_status}` });
      return;
    }
    style.production_status = 'RELEASED';
    style.released_at = new Date().toISOString();
    style.released_by = 'Mock DM';
    style.editable = false;
    style.minted_pieces = style.qty_ordered;
    piecesMinted += style.qty_ordered;
    if (style.needs_lining) piecesNeedingLining += style.qty_ordered;

    // Simulate the finite 200-drawer pool + waiting list.
    for (let i = 0; i < style.qty_ordered; i++) {
      if (_mockDrawerPool.free_drawers > 0) {
        _mockDrawerPool.free_drawers -= 1;
        _mockDrawerPool.occupied_drawers += 1;
        drawersMinted += 1;
      } else if (growDrawerPool) {
        _mockDrawerPool.pool_size += 1;
        _mockDrawerPool.occupied_drawers += 1;
        drawersMinted += 1;
      } else {
        piecesWaiting += 1;
      }
    }
    released.push({ style_id: id, style_code: style.style_code, style_name: style.style_name, production_status: style.production_status });
  });
  _mockDrawerPool.pieces_waiting_for_drawer += piecesWaiting;
  _mockDrawerPool.shortfall = _mockDrawerPool.pieces_waiting_for_drawer;

  return {
    order_number: orderNumber,
    released, rejected,
    minted: {
      pieces_minted: piecesMinted,
      drawers_reused: drawersReused,
      drawers_minted: drawersMinted,
      pieces_waiting_for_drawer: piecesWaiting,
      pieces_needing_lining: piecesNeedingLining,
      sample_barcodes: Array.from({ length: Math.min(5, piecesMinted) }, (_, i) => `PC-MOCK${(i + 1).toString().padStart(2, '0')}`),
    },
    message: `Released ${released.length} style(s) — ${piecesMinted} piece(s) minted${piecesWaiting > 0 ? `, ${piecesWaiting} waiting for a drawer` : ''}.`,
  };
}

async function mockApiGetDrawerPool() { return { ..._mockDrawerPool }; }

async function mockApiGrowDrawerPool(token, add) {
  _mockDrawerPool.pool_size += add;
  const allocate = Math.min(add, _mockDrawerPool.pieces_waiting_for_drawer);
  _mockDrawerPool.pieces_waiting_for_drawer -= allocate;
  _mockDrawerPool.free_drawers += (add - allocate);
  _mockDrawerPool.shortfall = _mockDrawerPool.pieces_waiting_for_drawer;
  return { added: add, pool_size: _mockDrawerPool.pool_size, allocated: allocate, still_waiting: _mockDrawerPool.pieces_waiting_for_drawer, status: {}, by: 'Mock DM' };
}

async function mockApiAllocateWaitingDrawers() {
  const allocate = Math.min(_mockDrawerPool.free_drawers, _mockDrawerPool.pieces_waiting_for_drawer);
  _mockDrawerPool.free_drawers -= allocate;
  _mockDrawerPool.occupied_drawers += allocate;
  _mockDrawerPool.pieces_waiting_for_drawer -= allocate;
  _mockDrawerPool.shortfall = _mockDrawerPool.pieces_waiting_for_drawer;
  return { allocated: allocate, still_waiting: _mockDrawerPool.pieces_waiting_for_drawer, status: {} };
}

const apiGetBreakdown = MOCK_BREAKDOWN ? mockApiGetBreakdown : realApiGetBreakdown;
const apiPatchBreakdownSku = MOCK_BREAKDOWN ? mockApiPatchBreakdownSku : realApiPatchBreakdownSku;
const apiDeleteBreakdownSku = MOCK_BREAKDOWN ? mockApiDeleteBreakdownSku : realApiDeleteBreakdownSku;
const apiCancelBreakdownStyles = MOCK_BREAKDOWN ? mockApiCancelBreakdownStyles : realApiCancelBreakdownStyles;
const apiReleaseBreakdownStyles = MOCK_BREAKDOWN ? mockApiReleaseBreakdownStyles : realApiReleaseBreakdownStyles;
const apiGetDrawerPool = MOCK_BREAKDOWN ? mockApiGetDrawerPool : realApiGetDrawerPool;
const apiGrowDrawerPool = MOCK_BREAKDOWN ? mockApiGrowDrawerPool : realApiGrowDrawerPool;
const apiAllocateWaitingDrawers = MOCK_BREAKDOWN ? mockApiAllocateWaitingDrawers : realApiAllocateWaitingDrawers;
/** END TEMPORARY MOCK LAYER */
import {
  Search, Lock, Loader2, Package, CheckCircle2, XCircle, AlertTriangle,
  Trash2, Save, Rocket, Ban, Boxes, RefreshCw, X, Barcode as BarcodeIcon,
} from 'lucide-react';

function Toast({ msg, type }) {
  if (!msg) return null;
  const isSuccess = type === 'success';
  return (
    <div className="fixed bottom-6 right-6 z-[999999] animate-fade-in">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 border max-w-sm ${isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
        {msg}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    DRAFT: { bg: '#fffbeb', color: '#a86022', border: '#fde68a', text: 'DRAFT' },
    RELEASED: { bg: '#f0fdf4', color: '#10b981', border: '#bbf7d0', text: 'RELEASED' },
    CANCELLED: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'CANCELLED' },
  };
  const s = map[status] || map.DRAFT;
  return (
    <span className="px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider shrink-0" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.text}
    </span>
  );
}

// One editable SKU row inside a DRAFT style card.
function SkuRow({ sku, editable, onSaved, onDeleted, token, showToast }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(sku.qty_ordered ?? '');
  const [size, setSize] = useState(sku.size ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPatchBreakdownSku(token, sku.sku_id, {
        qty_ordered: qty === '' ? undefined : Number(qty),
        size: size || undefined,
      });
      showToast('SKU updated.', 'success');
      setEditing(false);
      onSaved();
    } catch (e) {
      showToast(e.message || 'Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await apiDeleteBreakdownSku(token, sku.sku_id);
      showToast('SKU line removed.', 'success');
      onDeleted();
    } catch (e) {
      showToast(e.message || 'Delete failed — pieces may already be minted for this line.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
      <span className="font-mono font-bold text-slate-700 flex-1 min-w-0 truncate">{sku.sku_code}</span>
      <span className="text-slate-500">{sku.colour || sku.color_code || '—'}</span>
      {editing ? (
        <input value={size} onChange={(e) => setSize(e.target.value)} className="w-14 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
      ) : (
        <span className="text-slate-500 w-14 text-center">{sku.size || '—'}</span>
      )}
      {editing ? (
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-16 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
      ) : (
        <span className="font-black w-16 text-center" style={{ color: '#c8834a' }}>{sku.qty_ordered} pcs</span>
      )}
      {editable && (
        editing ? (
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500 text-white shrink-0 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-white border shrink-0" style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#c8834a' }}>
            Edit
          </button>
        )
      )}
      {editable && (
        <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg bg-red-50 text-red-500 shrink-0 disabled:opacity-50" title="Delete this line (only if no pieces minted yet)">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}

export default function BreakdownReviewPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const searchParams = useSearchParams();
  const canRelease = user === 'direct_manager' || user === 'managing_director';

  const [orderNumberInput, setOrderNumberInput] = useState(searchParams.get('order') || '');
  const [activeOrderNumber, setActiveOrderNumber] = useState(searchParams.get('order') || '');
  const [breakdown, setBreakdown] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedStyleIds, setSelectedStyleIds] = useState([]);
  const [releasing, setReleasing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [releaseResult, setReleaseResult] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const [drawerPool, setDrawerPool] = useState(null);
  const [poolLoading, setPoolLoading] = useState(false);
  const [growAmount, setGrowAmount] = useState('');
  const [growing, setGrowing] = useState(false);
  const [allocating, setAllocating] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const loadBreakdown = useCallback(async (orderNumber) => {
    if (!orderNumber || !token) return;
    setLoading(true); setError(''); setSelectedStyleIds([]);
    try {
      const data = await apiGetBreakdown(token, orderNumber);
      setBreakdown(data);
    } catch (e) {
      setError(e.message || 'Failed to load breakdown.');
      setBreakdown(null);
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadPool = useCallback(() => {
    if (!token) return;
    setPoolLoading(true);
    apiGetDrawerPool(token)
      .then(setDrawerPool)
      .catch(() => setDrawerPool(null))
      .finally(() => setPoolLoading(false));
  }, [token]);

  useEffect(() => {
    if (activeOrderNumber) loadBreakdown(activeOrderNumber);
    loadPool();
  }, [activeOrderNumber, loadBreakdown, loadPool]);

  const handleSearch = () => {
    const v = orderNumberInput.trim();
    if (!v) return;
    setActiveOrderNumber(v);
  };

  const toggleStyleSelect = (styleId) => {
    setSelectedStyleIds((prev) => prev.includes(styleId) ? prev.filter((id) => id !== styleId) : [...prev, styleId]);
  };

  const handleRelease = async () => {
    if (selectedStyleIds.length === 0) return;
    setReleasing(true);
    try {
      const result = await apiReleaseBreakdownStyles(token, activeOrderNumber, selectedStyleIds, false);
      setReleaseResult(result);
      showToast(result.message || 'Styles released to production.', 'success');
      setSelectedStyleIds([]);
      await loadBreakdown(activeOrderNumber);
      loadPool();
    } catch (e) {
      showToast(e.message || 'Release failed.', 'error');
    } finally {
      setReleasing(false);
    }
  };

  const handleCancel = async () => {
    if (selectedStyleIds.length === 0) return;
    setCancelling(true);
    try {
      const result = await apiCancelBreakdownStyles(token, activeOrderNumber, selectedStyleIds);
      showToast(`${result.cancelled?.length || 0} style(s) cancelled.`, 'success');
      setSelectedStyleIds([]);
      await loadBreakdown(activeOrderNumber);
    } catch (e) {
      showToast(e.message || 'Cancel failed.', 'error');
    } finally {
      setCancelling(false);
    }
  };

  const handleGrowPool = async () => {
    const add = parseInt(growAmount, 10);
    if (!add || add < 1) return;
    setGrowing(true);
    try {
      const result = await apiGrowDrawerPool(token, add);
      showToast(`Added ${result.added} drawers. Pool is now ${result.pool_size}.`, 'success');
      setGrowAmount('');
      loadPool();
    } catch (e) {
      showToast(e.message || 'Failed to grow drawer pool.', 'error');
    } finally {
      setGrowing(false);
    }
  };

  const handleAllocateWaiting = async () => {
    setAllocating(true);
    try {
      const result = await apiAllocateWaitingDrawers(token);
      showToast(`Allocated ${result.allocated} piece(s) into free drawers. ${result.still_waiting} still waiting.`, 'success');
      loadPool();
    } catch (e) {
      showToast(e.message || 'Allocation failed.', 'error');
    } finally {
      setAllocating(false);
    }
  };

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="p-8 bg-white border border-amber-100 shadow-xl rounded-3xl space-y-4">
          <Lock className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Login Required</h1>
        </div>
      </div>
    );
  }

  const draftStyles = (breakdown?.styles || []).filter((s) => s.production_status === 'DRAFT');
  const selectedAreDraft = selectedStyleIds.every((id) => draftStyles.some((s) => s.style_id === id));

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      <Toast msg={toastMsg} type={toastType} />

      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Breakdown Review &amp; Release</h1>
        <p className="font-medium mt-1 text-sm" style={{ color: '#9a7a5a' }}>
          Uploaded styles land here as DRAFT — nothing is barcoded or drawer-merged until you release them.
        </p>
      </div>

      {/* ── Order search ── */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex gap-3" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Order number (e.g. UM-1)..."
            value={orderNumberInput}
            onChange={(e) => setOrderNumberInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
            className="w-full h-12 pl-10 pr-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border focus:border-[#c8834a]"
            style={{ borderColor: 'rgba(200,131,74,0.15)' }}
          />
        </div>
        <button onClick={handleSearch} className="h-12 px-6 rounded-xl font-black text-xs uppercase text-white shrink-0" style={{ background: '#c8834a' }}>
          Load
        </button>
      </div>

      {/* ── Drawer Pool status ── */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border flex flex-wrap items-center gap-4 justify-between" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.1)' }}>
            <Boxes className="w-5 h-5" style={{ color: '#c8834a' }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#9a7a5a' }}>Drawer Pool</p>
            {poolLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" style={{ color: '#c8834a' }} />
            ) : drawerPool ? (
              <p className="text-sm font-bold" style={{ color: '#2d1f0e' }}>
                {drawerPool.free_drawers} free / {drawerPool.pool_size} total
                {drawerPool.pieces_waiting_for_drawer > 0 && (
                  <span className="text-rose-600 ml-2">· {drawerPool.pieces_waiting_for_drawer} pieces waiting</span>
                )}
              </p>
            ) : <p className="text-sm font-bold text-slate-400">—</p>}
          </div>
        </div>
        {canRelease && (
          <div className="flex items-center gap-2">
            {drawerPool?.pieces_waiting_for_drawer > 0 && (
              <button onClick={handleAllocateWaiting} disabled={allocating} className="h-10 px-4 rounded-xl font-black text-[11px] uppercase bg-white border shadow-sm flex items-center gap-1.5 disabled:opacity-50" style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}>
                {allocating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Allocate Waiting
              </button>
            )}
            <input type="number" min="1" placeholder="Add N drawers" value={growAmount} onChange={(e) => setGrowAmount(e.target.value)} className="w-32 h-10 px-3 bg-slate-50 rounded-xl font-bold text-xs outline-none border" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
            <button onClick={handleGrowPool} disabled={growing || !growAmount} className="h-10 px-4 rounded-xl font-black text-[11px] uppercase text-white disabled:opacity-50" style={{ background: '#c8834a' }}>
              {growing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Grow Pool'}
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl font-bold text-sm">{error}</div>
      )}

      {loading && (
        <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} /></div>
      )}

      {/* ── Styles table ── */}
      {breakdown && !loading && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl shadow-sm border flex flex-wrap gap-4 justify-between items-center" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <div>
              <h2 className="font-black text-xl" style={{ color: '#2d1f0e' }}>PO {breakdown.order_number}</h2>
              <p className="text-xs font-bold mt-1" style={{ color: '#9a7a5a' }}>
                {breakdown.totals?.styles} styles ({breakdown.totals?.styles_draft} draft, {breakdown.totals?.styles_released} released) · {breakdown.totals?.qty_ordered} pcs ordered · {breakdown.totals?.minted_pieces} pieces minted
              </p>
            </div>
          </div>

          {(breakdown.styles || []).map((style) => {
            const isDraft = style.production_status === 'DRAFT';
            const isSelected = selectedStyleIds.includes(style.style_id);
            return (
              <div key={style.style_id} className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: isSelected ? '#c8834a' : 'rgba(200,131,74,0.15)' }}>
                <div className="p-5 flex flex-wrap items-start justify-between gap-3" style={{ background: isSelected ? 'rgba(200,131,74,0.05)' : 'transparent' }}>
                  <div className="flex items-start gap-3">
                    {isDraft && canRelease && (
                      <input type="checkbox" checked={isSelected} onChange={() => toggleStyleSelect(style.style_id)} className="w-4 h-4 mt-1 accent-[#c8834a] cursor-pointer" />
                    )}
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-black text-base" style={{ color: '#2d1f0e' }}>{style.style_name || style.style_code}</h3>
                        <StatusBadge status={style.production_status} />
                        {style.needs_lining && <span className="text-[9px] font-black uppercase text-blue-600 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded">Needs Lining</span>}
                      </div>
                      <p className="text-[11px] font-bold text-slate-400 mt-0.5">{style.style_code} · {style.article} · {style.sku_count} SKUs · {style.qty_ordered} pcs</p>
                      {style.released_at && (
                        <p className="text-[10px] text-slate-400 mt-0.5">Released {style.released_at} by {style.released_by}</p>
                      )}
                    </div>
                  </div>
                  {style.minted_pieces > 0 && (
                    <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                      <BarcodeIcon className="w-3 h-3" /> {style.minted_pieces} minted
                    </span>
                  )}
                </div>
                <div className="px-5 pb-5 space-y-1.5">
                  {(style.skus || []).map((sku) => (
                    <SkuRow
                      key={sku.sku_id}
                      sku={sku}
                      editable={isDraft && style.editable !== false}
                      token={token}
                      showToast={showToast}
                      onSaved={() => loadBreakdown(activeOrderNumber)}
                      onDeleted={() => loadBreakdown(activeOrderNumber)}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {breakdown && !loading && (breakdown.styles || []).length === 0 && (
        <div className="py-16 text-center bg-white/50 rounded-3xl border border-dashed border-slate-300">
          <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-bold text-slate-400">No styles found for this order.</p>
        </div>
      )}

      {/* ── Floating action bar ── */}
      {selectedStyleIds.length > 0 && canRelease && selectedAreDraft && (
        <div className="sticky bottom-6 z-40 flex justify-center">
          <div className="bg-slate-900 rounded-full shadow-2xl px-6 py-3 flex items-center gap-4">
            <span className="text-white font-bold text-sm">{selectedStyleIds.length} style(s) selected</span>
            <button onClick={handleCancel} disabled={cancelling} className="h-10 px-4 rounded-full font-black text-xs uppercase bg-white/10 text-white flex items-center gap-1.5 disabled:opacity-50">
              {cancelling ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Ban className="w-3.5 h-3.5" />} Cancel
            </button>
            <button onClick={handleRelease} disabled={releasing} className="h-10 px-5 rounded-full font-black text-xs uppercase text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              {releasing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Rocket className="w-3.5 h-3.5" />} Release to Production
            </button>
          </div>
        </div>
      )}

      {/* ── Release result modal ── */}
      {releaseResult && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 border-b flex justify-between items-start" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <div>
                <h3 className="font-black text-xl" style={{ color: '#2d1f0e' }}>Release Complete</h3>
                <p className="text-xs text-slate-500 font-bold mt-1">{releaseResult.message}</p>
              </div>
              <button onClick={() => setReleaseResult(null)} className="p-2 bg-slate-100 rounded-full"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black uppercase text-emerald-700">Pieces Minted</p>
                  <p className="text-xl font-black text-emerald-800">{releaseResult.minted?.pieces_minted ?? 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black uppercase text-slate-500">Drawers Reused / Minted</p>
                  <p className="text-xl font-black text-slate-800">{releaseResult.minted?.drawers_reused ?? 0} / {releaseResult.minted?.drawers_minted ?? 0}</p>
                </div>
              </div>
              {releaseResult.minted?.pieces_waiting_for_drawer > 0 && (
                <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
                  <div>
                    <p className="font-black text-sm text-rose-800">{releaseResult.minted.pieces_waiting_for_drawer} piece(s) waiting for a drawer</p>
                    <p className="text-xs text-rose-600 mt-0.5">These pieces have barcodes but no drawer yet — grow the drawer pool above, or wait for drawers to free up.</p>
                  </div>
                </div>
              )}
              {releaseResult.rejected?.length > 0 && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <p className="text-xs font-black text-amber-800 mb-1">{releaseResult.rejected.length} style(s) rejected</p>
                  {releaseResult.rejected.map((r, i) => (
                    <p key={i} className="text-[11px] text-amber-700">{r.style_code}: {r.reason}</p>
                  ))}
                </div>
              )}
            </div>
            <div className="p-6 pt-0 flex gap-3">
              <button onClick={() => setReleaseResult(null)} className="flex-1 h-12 rounded-xl font-black text-xs uppercase bg-slate-100 text-slate-600">
                Stay Here
              </button>
              <button
                onClick={() => router.push('/dashboard/entry')}
                className="flex-1 h-12 rounded-xl font-black text-xs uppercase text-white"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
              >
                Back to Production
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
