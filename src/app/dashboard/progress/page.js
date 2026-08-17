'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetBarcodeOrders,
  apiGetOrderBarcodeSkus,
  apiGetOrderBarcodes,
  apiGetOrderTree,
  apiGetDirectManagerOrderDetail,
  apiGetDirectManagerStyleDetail,
  apiGetDirectManagerPieceDetail,
} from '@/lib/api';
import {
  Search, ChevronDown, Loader2, Warehouse, Package, Activity,
  AlertTriangle, User, Calendar, Boxes, Layers,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

// Generic searchable dropdown used for all 3 levels (Order / Style / Piece).
// Kept as one component instead of 3 near-identical ones per the task doc's
// "three searchable horizontal inputs" spec.
function SearchCombobox({ label, icon: Icon, placeholder, value, options, getKey, getLabel, getSub, onSelect, disabled, loading }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter((o) => `${getLabel(o)} ${getSub(o) || ''}`.toLowerCase().includes(q));
  }, [options, query, getLabel, getSub]);

  const selectedOption = options.find((o) => getKey(o) === value);

  return (
    <div className="flex-1 relative" ref={ref}>
      <label className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 mb-1.5" style={{ color: '#9a7a5a' }}>
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className="w-full h-12 px-3.5 bg-white font-bold border-2 rounded-xl shadow-sm text-sm transition-all flex items-center justify-between text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: 'rgba(200,131,74,0.3)' }}
      >
        <span className={selectedOption ? 'truncate' : 'text-slate-400'} style={selectedOption ? { color: '#2d1f0e' } : {}}>
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: '#c8834a' }} /> : <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: '#c8834a' }} />}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-full bg-white border-2 rounded-2xl shadow-2xl p-2.5 space-y-2" style={{ borderColor: '#c8834a' }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9a7a5a' }} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full h-10 pl-9 pr-3 bg-[#faf6f0] border rounded-lg text-xs font-bold outline-none"
              style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
            {filtered.length === 0 && (
              <div className="p-3 text-center text-xs font-bold text-slate-400">No matches</div>
            )}
            {filtered.map((o) => {
              const key = getKey(o);
              const isSelected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { onSelect(o); setIsOpen(false); setQuery(''); }}
                  className={`w-full p-2.5 text-left rounded-lg flex flex-col cursor-pointer transition-colors ${isSelected ? 'bg-[#c8834a] text-white' : 'hover:bg-amber-50 text-slate-800'}`}
                >
                  <span className="text-xs font-black truncate">{getLabel(o)}</span>
                  {getSub(o) && <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>{getSub(o)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StageBadge({ state }) {
  const s = String(state || '').toLowerCase();
  const map = {
    completed: { bg: '#f0fff4', color: '#38a169', border: '#c6f6d5', text: 'DONE' },
    done: { bg: '#f0fff4', color: '#38a169', border: '#c6f6d5', text: 'DONE' },
    next: { bg: 'rgba(200,131,74,0.15)', color: '#a86022', border: 'rgba(200,131,74,0.3)', text: 'NEXT' },
    in_progress: { bg: 'rgba(200,131,74,0.15)', color: '#a86022', border: 'rgba(200,131,74,0.3)', text: 'IN-PROGRESS' },
    locked: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'LOCKED' },
    not_applicable: { bg: '#f5f5f5', color: '#aaa', border: '#e2e2e2', text: 'N/A' },
    not_started: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'NOT STARTED' },
    pending: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'PENDING' },
  };
  const style = map[s] || { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: (state || 'PENDING').toUpperCase() };
  return (
    <span className="px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider shrink-0" style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
      {style.text}
    </span>
  );
}

export default function StyleStageProgress() {
  const { token } = useAuth();

  // ── Level 1: Orders ──
  const [orderOptions, setOrderOptions] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [orderDetail, setOrderDetail] = useState(null);
  const [orderDetailLoading, setOrderDetailLoading] = useState(false);
  // Per-style progress summary shown at Order level ("Order = overall
  // analytics + per-style progress" per spec) — one call for the whole
  // order's styles, not one call per style, to stay N+1-free.
  const [orderStyleTree, setOrderStyleTree] = useState(null);
  const [orderStyleTreeLoading, setOrderStyleTreeLoading] = useState(false);

  // ── Level 2: Styles (within selected order) ──
  const [styleOptions, setStyleOptions] = useState([]);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [selectedStyleId, setSelectedStyleId] = useState('');
  const [styleDetail, setStyleDetail] = useState(null);
  const [styleDetailLoading, setStyleDetailLoading] = useState(false);

  // ── Level 3: Pieces (within selected style) ──
  const [pieceOptions, setPieceOptions] = useState([]);
  const [piecesLoading, setPiecesLoading] = useState(false);
  const [selectedPieceCode, setSelectedPieceCode] = useState('');
  const [pieceDetail, setPieceDetail] = useState(null);
  const [pieceDetailLoading, setPieceDetailLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    setOrdersLoading(true);
    apiGetBarcodeOrders(token)
      .then((data) => setOrderOptions(Array.isArray(data) ? data : []))
      .catch(() => setOrderOptions([]))
      .finally(() => setOrdersLoading(false));
  }, [token]);

  // Order selected -> order-level analytics + the style options for it
  useEffect(() => {
    if (!token || !selectedOrderId) { setOrderDetail(null); setStyleOptions([]); setOrderStyleTree(null); return; }
    setSelectedStyleId('');
    setSelectedPieceCode('');
    setStyleDetail(null);
    setPieceDetail(null);
    setPieceOptions([]);

    setOrderDetailLoading(true);
    apiGetDirectManagerOrderDetail(token, selectedOrderId)
      .then((data) => setOrderDetail(data))
      .catch(() => setOrderDetail(null))
      .finally(() => setOrderDetailLoading(false));

    // Per-style progress summary — one call for every style in this order.
    setOrderStyleTreeLoading(true);
    apiGetOrderTree(token, selectedOrderId)
      .then((data) => setOrderStyleTree(data))
      .catch(() => setOrderStyleTree(null))
      .finally(() => setOrderStyleTreeLoading(false));

    setStylesLoading(true);
    apiGetOrderBarcodeSkus(token, selectedOrderId)
      .then((skus) => {
        const arr = Array.isArray(skus) ? skus : [];
        const byStyle = new Map();
        arr.forEach((s) => {
          if (!s.style_id) return;
          if (!byStyle.has(s.style_id)) byStyle.set(s.style_id, { style_id: s.style_id, style_name: s.style_name || 'Unnamed Style' });
        });
        setStyleOptions(Array.from(byStyle.values()));
      })
      .catch(() => setStyleOptions([]))
      .finally(() => setStylesLoading(false));
  }, [token, selectedOrderId]);

  // Style selected -> style-level progress + the piece options for it
  useEffect(() => {
    if (!token || !selectedStyleId) { setStyleDetail(null); setPieceOptions([]); return; }
    setSelectedPieceCode('');
    setPieceDetail(null);

    setStyleDetailLoading(true);
    apiGetDirectManagerStyleDetail(token, selectedStyleId)
      .then((data) => setStyleDetail(data))
      .catch(() => setStyleDetail(null))
      .finally(() => setStyleDetailLoading(false));

    if (selectedOrderId) {
      setPiecesLoading(true);
      apiGetOrderBarcodes(token, selectedOrderId, { styleId: selectedStyleId, pageSize: 200 })
        .then((data) => setPieceOptions(Array.isArray(data?.items) ? data.items : []))
        .catch(() => setPieceOptions([]))
        .finally(() => setPiecesLoading(false));
    }
  }, [token, selectedStyleId, selectedOrderId]);

  // Piece selected -> full piece stage history
  useEffect(() => {
    if (!token || !selectedPieceCode) { setPieceDetail(null); return; }
    setPieceDetailLoading(true);
    apiGetDirectManagerPieceDetail(token, selectedPieceCode)
      .then((data) => setPieceDetail(data))
      .catch(() => setPieceDetail(null))
      .finally(() => setPieceDetailLoading(false));
  }, [token, selectedPieceCode]);

  const selectedOrder = orderOptions.find((o) => o.order_id === selectedOrderId);
  const selectedStyle = styleOptions.find((s) => s.style_id === selectedStyleId);

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ─── TITLE SECTION ─── */}
      <div>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Stage-Spread Progress</h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>Drill down Order → Style → Piece to see stage-by-stage progress and full piece history.</p>
      </div>

      {/* ─── 3 SEARCHABLE DROPDOWNS ─── */}
      <div className="flex flex-col sm:flex-row gap-4">
        <SearchCombobox
          label="Order"
          icon={Warehouse}
          placeholder="Select an order..."
          value={selectedOrderId}
          options={orderOptions}
          getKey={(o) => o.order_id}
          getLabel={(o) => `PO ${o.order_number}`}
          getSub={(o) => o.client_name}
          onSelect={(o) => setSelectedOrderId(o.order_id)}
          loading={ordersLoading}
        />
        <SearchCombobox
          label="Style"
          icon={Package}
          placeholder={selectedOrderId ? 'Select a style...' : 'Select an order first'}
          value={selectedStyleId}
          options={styleOptions}
          getKey={(s) => s.style_id}
          getLabel={(s) => s.style_name}
          getSub={() => null}
          onSelect={(s) => setSelectedStyleId(s.style_id)}
          disabled={!selectedOrderId}
          loading={stylesLoading}
        />
        <SearchCombobox
          label="Piece"
          icon={Boxes}
          placeholder={selectedStyleId ? 'Select a piece...' : 'Select a style first'}
          value={selectedPieceCode}
          options={pieceOptions}
          getKey={(p) => p.code || p.piece_code || p.barcode}
          getLabel={(p) => p.code || p.piece_code || p.barcode}
          getSub={(p) => [p.colour, p.size, p.current_stage].filter(Boolean).join(' · ')}
          onSelect={(p) => setSelectedPieceCode(p.code || p.piece_code || p.barcode)}
          disabled={!selectedStyleId}
          loading={piecesLoading}
        />
      </div>

      {!selectedOrderId && (
        <div className="p-10 rounded-2xl text-center" style={{ background: '#faf6f0', border: '1px dashed rgba(200,131,74,0.3)' }}>
          <Warehouse className="w-8 h-8 mx-auto mb-2" style={{ color: '#c8834a' }} />
          <p className="font-bold" style={{ color: '#9a7a5a' }}>Select an order above to begin.</p>
        </div>
      )}

      {/* ─── LEVEL 1: ORDER ANALYTICS ─── */}
      {selectedOrderId && (
        <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
            <Warehouse className="w-5 h-5" style={{ color: '#c8834a' }} /> Order Overview — PO {selectedOrder?.order_number}
          </h3>

          {orderDetailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#c8834a' }} /></div>
          ) : orderDetail ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div className="p-4 rounded-2xl bg-[#faf6f0] border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                  <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Total Qty</span>
                  <p className="text-xl font-black mt-1" style={{ color: '#2d1f0e' }}>{orderDetail.total_quantity ?? '—'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700">Completion</span>
                  <p className="text-xl font-black mt-1 text-emerald-800">{orderDetail.completion_pct != null ? `${Math.round(orderDetail.completion_pct)}%` : '—'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100 col-span-2 sm:col-span-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Bottleneck Stage</span>
                  <p className="text-xl font-black mt-1 text-rose-800 truncate">{orderDetail.blocked_stage || 'None — flowing freely'}</p>
                </div>
              </div>

              {Array.isArray(orderDetail.stages) && orderDetail.stages.length > 0 && (
                <div className="overflow-x-auto pt-2">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="font-bold uppercase tracking-wider" style={{ color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.15)' }}>
                        <th className="py-3 px-2">Stage</th>
                        <th className="py-3 px-2">Pieces Completed</th>
                        <th className="py-3 px-2">% of Order</th>
                        <th className="py-3 px-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
                      {orderDetail.stages.map((s, i) => (
                        <tr key={i}>
                          <td className="py-3 px-2 font-bold" style={{ color: '#2d1f0e' }}>{s.label || s.stage_label || s.stage || s.stage_code}</td>
                          <td className="py-3 px-2 font-black" style={{ color: '#c8834a' }}>{s.completed ?? s.count ?? s.qty ?? s.pieces ?? s.pending ?? 0}</td>
                          <td className="py-3 px-2 font-bold text-slate-500">{s.pct != null ? `${s.pct}%` : '—'}</td>
                          <td className="py-3 px-2"><StageBadge state={s.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Per-style progress summary — click a style to drill into its
                  full per-stage breakdown below. One apiGetOrderTree call for
                  the whole order, not one per style. */}
              <div className="pt-4 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                <p className="text-xs font-black uppercase tracking-wider mb-3" style={{ color: '#9a7a5a' }}>Per-Style Progress</p>
                {orderStyleTreeLoading ? (
                  <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin" style={{ color: '#c8834a' }} /></div>
                ) : Array.isArray(orderStyleTree?.styles) && orderStyleTree.styles.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {orderStyleTree.styles.map((st, i) => {
                      const styleId = st.style_id || st.id;
                      const styleName = st.style_name || st.style || st.style_code || 'Unknown Style';
                      const pieceCount = st.piece_count ?? st.total_quantity ?? st.quantity ?? null;
                      const completedCount = st.completed ?? st.completed_pieces ?? null;
                      const isActive = styleId === selectedStyleId;
                      return (
                        <button
                          key={styleId || i}
                          type="button"
                          onClick={() => styleId && setSelectedStyleId(styleId)}
                          className="text-left p-4 rounded-xl border transition-all cursor-pointer hover:-translate-y-0.5"
                          style={{ background: isActive ? '#c8834a' : '#faf6f0', borderColor: isActive ? '#c8834a' : 'rgba(200,131,74,0.2)' }}
                        >
                          <p className="text-xs font-black truncate" style={{ color: isActive ? '#fff' : '#2d1f0e' }}>{styleName}</p>
                          <p className="text-[10px] font-bold mt-1" style={{ color: isActive ? 'rgba(255,255,255,0.85)' : '#9a7a5a' }}>
                            {pieceCount != null ? `${pieceCount} pcs` : 'View progress →'}
                            {completedCount != null && pieceCount ? ` · ${Math.round((completedCount / pieceCount) * 100)}% done` : ''}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs font-bold text-slate-400">No styles found for this order.</p>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm font-bold text-center py-6 text-slate-400">No analytics available for this order.</p>
          )}
        </SpotlightCard>
      )}

      {/* ─── LEVEL 2: STYLE PROGRESS ─── */}
      {selectedStyleId && (
        <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
          <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
            <Package className="w-5 h-5" style={{ color: '#c8834a' }} /> Style Progress — {selectedStyle?.style_name}
          </h3>

          {styleDetailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin" style={{ color: '#c8834a' }} /></div>
          ) : styleDetail ? (
            <>
              <div className="p-4 rounded-2xl bg-[#faf6f0] border w-fit" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Total Quantity</span>
                <p className="text-xl font-black mt-1" style={{ color: '#c8834a' }}>{styleDetail.total_quantity ?? '—'} pcs</p>
              </div>

              {Array.isArray(styleDetail.stages) && styleDetail.stages.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs sm:text-sm">
                    <thead>
                      <tr className="font-bold uppercase tracking-wider" style={{ color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.15)' }}>
                        <th className="py-3 px-2">Stage</th>
                        <th className="py-3 px-2">Pieces Completed</th>
                        <th className="py-3 px-2">% of Style</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.1)' }}>
                      {styleDetail.stages.map((s, i) => {
                        const completed = s.completed ?? s.count ?? s.qty ?? s.pieces ?? s.pending ?? 0;
                        const total = styleDetail.total_quantity || 0;
                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;
                        return (
                          <tr key={i}>
                            <td className="py-3 px-2 font-bold" style={{ color: '#2d1f0e' }}>{s.label || s.stage_label || s.stage || s.stage_code}</td>
                            <td className="py-3 px-2 font-black" style={{ color: '#c8834a' }}>{completed}</td>
                            <td className="py-3 px-2 font-bold text-slate-500">{pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm font-bold text-center py-6 text-slate-400">No per-stage breakdown available.</p>
              )}
            </>
          ) : (
            <p className="text-sm font-bold text-center py-6 text-slate-400">No progress data available for this style.</p>
          )}
        </SpotlightCard>
      )}

      {/* ─── LEVEL 3: PIECE FULL HISTORY ─── */}
      {selectedPieceCode && (
        <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl space-y-5 rounded-3xl" style={{ border: '1px solid rgba(16,185,129,0.25)' }} spotlightColor="rgba(16,185,129,0.06)">
          <h3 className="text-lg font-extrabold pb-4 flex items-center gap-2" style={{ color: '#2d1f0e', borderBottom: '1px solid rgba(16,185,129,0.15)' }}>
            <Activity className="w-5 h-5 text-emerald-600" /> Piece Timeline — <span className="font-mono">{selectedPieceCode}</span>
          </h3>

          {pieceDetailLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-emerald-600" /></div>
          ) : pieceDetail ? (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black uppercase text-slate-400">Style / Colour / Size</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{pieceDetail.style} · {pieceDetail.colour} · {pieceDetail.size}</p>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] font-black uppercase text-slate-400">Order</p>
                  <p className="text-sm font-bold text-slate-800 mt-0.5 truncate">{pieceDetail.order_number || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                  <p className="text-[10px] font-black uppercase text-emerald-700">Current Stage</p>
                  <p className="text-sm font-black text-emerald-800 mt-0.5 truncate">{pieceDetail.display_stage || '—'}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                  <p className="text-[10px] font-black uppercase text-blue-700">Store Status</p>
                  <p className="text-sm font-black text-blue-800 mt-0.5 truncate">{pieceDetail.in_store ? (pieceDetail.drawer_holding || pieceDetail.store_label || 'In Store') : 'Not in Store'}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
                <p className="text-xs font-black uppercase text-slate-400 mb-4 tracking-widest flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Stage History (Cutting → Package Export)
                </p>
                <div className="space-y-2.5">
                  {Array.isArray(pieceDetail.history) && pieceDetail.history.length > 0 ? (
                    pieceDetail.history.map((h, i) => (
                      <div
                        key={i}
                        className={`p-4 rounded-xl border flex justify-between items-center shadow-sm gap-3 ${h.is_store_overlay ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-200'}`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-black text-sm" style={{ color: h.is_store_overlay ? '#1d4ed8' : '#2d1f0e' }}>
                              {h.label || h.stage}
                            </span>
                            {h.is_store_overlay && (
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-md font-bold text-[9px]">
                                {h.store_status || 'STORE'}
                              </span>
                            )}
                          </div>
                          <div className="text-slate-500 mt-1 font-medium text-xs flex items-center gap-1.5">
                            {!h.is_store_overlay && <><User className="w-3 h-3" /> {h.employee || 'N/A'}</>}
                          </div>
                          {h.consumption != null && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Consumed {h.consumption} {h.lot_article ? `· ${h.lot_article}` : ''} {h.lot_colour ? `(${h.lot_colour})` : ''}
                            </div>
                          )}
                        </div>
                        <div className="text-right text-slate-400 shrink-0 flex items-center gap-1.5">
                          <Calendar className="w-3 h-3" />
                          <span className="text-xs font-bold">{h.work_date || '—'}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-slate-400 italic text-sm">No stage history logged yet.</div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-sm font-bold text-center py-6 text-slate-400">No history found for this piece.</p>
          )}
        </SpotlightCard>
      )}

    </div>
  );
}
