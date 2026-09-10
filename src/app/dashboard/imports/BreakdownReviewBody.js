'use client';
import { useState, useEffect, useCallback } from 'react';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Toast, StatusBadge, SkuRow } from './shared';

import { 
  useGetBreakdownQuery, 
  useGetDrawerPoolQuery,
  useCancelBreakdownStylesMutation,
  useReleaseBreakdownStylesMutation,
  useGrowDrawerPoolMutation,
  useAllocateWaitingDrawersMutation
} from '@/store/slices/importsApiSlice';
import { StyleAccessoriesPanel } from '../entry/AccessorySection/AccessoriesSpec';
import {
  Search, Lock, Loader2, Package, CheckCircle2, XCircle, AlertTriangle,
  Trash2, Save, Rocket, Ban, Boxes, RefreshCw, X, Barcode as BarcodeIcon, ArrowLeft,
  ChevronDown, CheckSquare,
} from 'lucide-react';
import { LiningPromptModal, ReleaseResultModal } from './ReleaseModals';

export default function BreakdownReviewBody({ initialOrderNumber = '', onBack, backLabel = 'Back to Breakdown Review', onBackToProduction }) {
  const router = useRouter();
  const { user, token } = useAuth();
  const canRelease = user === 'direct_manager' || user === 'managing_director';

  const [orderNumberInput, setOrderNumberInput] = useState(initialOrderNumber);
  const [activeOrderNumber, setActiveOrderNumber] = useState(initialOrderNumber);
  const [selectedStyleIds, setSelectedStyleIds] = useState([]);
  const [expandedStyleIds, setExpandedStyleIds] = useState([]);
  const [releasing, setReleasing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [releaseResult, setReleaseResult] = useState(null);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [growAmount, setGrowAmount] = useState('');
  const [growing, setGrowing] = useState(false);
  const [allocating, setAllocating] = useState(false);

  // Release now needs a needs_lining answer up front — one boolean for the
  // whole batch being released, asked via a popup rather than guessed.
  const [showLiningPrompt, setShowLiningPrompt] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(null), 3500);
  };

  const { data: breakdown, isLoading: loading, error } = useGetBreakdownQuery(activeOrderNumber, { 
    skip: !activeOrderNumber 
  });
  
  const { data: drawerPool, isLoading: poolLoading } = useGetDrawerPoolQuery();
  const [cancelBreakdownStyles] = useCancelBreakdownStylesMutation();
  const [releaseBreakdownStyles] = useReleaseBreakdownStylesMutation();
  const [growDrawerPoolMutation] = useGrowDrawerPoolMutation();
  const [allocateWaitingDrawers] = useAllocateWaitingDrawersMutation();

  const handleSearch = () => {
    const v = orderNumberInput.trim();
    if (!v) return;
    setActiveOrderNumber(v);
  };

  const toggleStyleSelect = (styleId) => {
    setSelectedStyleIds((prev) => prev.includes(styleId) ? prev.filter((id) => id !== styleId) : [...prev, styleId]);
  };

  const toggleStyleExpand = (styleId) => {
    setExpandedStyleIds((prev) => prev.includes(styleId) ? prev.filter((id) => id !== styleId) : [...prev, styleId]);
  };

  const selectAllDraft = () => {
    setSelectedStyleIds(draftStyles.map((s) => s.style_id));
  };

  const unselectAll = () => {
    setSelectedStyleIds([]);
  };

  const handleRelease = () => {
    if (selectedStyleIds.length === 0) return;
    setShowLiningPrompt(true);
  };

  const confirmRelease = async (needsLining) => {
    setShowLiningPrompt(false);
    setReleasing(true);
    try {
    const result = await releaseBreakdownStyles({ orderNumber: activeOrderNumber, styleIds: selectedStyleIds, needsLining }).unwrap();

      setReleaseResult(result);
      showToast(result.message || 'Styles released to production.', 'success');
      setSelectedStyleIds([]);
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
const result = await cancelBreakdownStyles({ orderNumber: activeOrderNumber, styleIds: selectedStyleIds }).unwrap();
      showToast(`${result.cancelled?.length || 0} style(s) cancelled.`, 'success');
      setSelectedStyleIds([]);
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
    const result = await growDrawerPoolMutation({ add }).unwrap();
      showToast(`Added ${result.added} drawers. Pool is now ${result.pool_size}.`, 'success');
      setGrowAmount('');
    } catch (e) {
      showToast(e.message || 'Failed to grow drawer pool.', 'error');
    } finally {
      setGrowing(false);
    }
  };

  const handleAllocateWaiting = async () => {
    setAllocating(true);
    try {
    const result = await allocateWaitingDrawers().unwrap();
      showToast(`Allocated ${result.allocated} piece(s) into free drawers. ${result.still_waiting} still waiting.`, 'success');
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
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="flex items-center gap-1.5 text-xs font-bold mb-2 hover:underline cursor-pointer"
            style={{ color: '#c8834a' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
          </button>
        )}
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
            {canRelease && draftStyles.length > 0 && (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={selectAllDraft}
                  disabled={selectedStyleIds.length === draftStyles.length}
                  className="h-10 px-4 rounded-xl font-black text-[11px] uppercase bg-white border shadow-sm flex items-center gap-1.5 disabled:opacity-40"
                  style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}
                >
                  <CheckSquare className="w-3.5 h-3.5" /> Select All ({draftStyles.length})
                </button>
                <button
                  type="button"
                  onClick={unselectAll}
                  disabled={selectedStyleIds.length === 0}
                  className="h-10 px-4 rounded-xl font-black text-[11px] uppercase bg-white border shadow-sm flex items-center gap-1.5 disabled:opacity-40"
                  style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}
                >
                  <XCircle className="w-3.5 h-3.5" /> Unselect All
                </button>
              </div>
            )}
          </div>

          {(breakdown.styles || []).map((style) => {
            const isDraft = style.production_status === 'DRAFT';
            const isSelected = selectedStyleIds.includes(style.style_id);
            const isExpanded = expandedStyleIds.includes(style.style_id);
            return (
              <div key={style.style_id} className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: isSelected ? '#c8834a' : 'rgba(200,131,74,0.15)' }}>
                <div className="p-5 flex flex-wrap items-start justify-between gap-3 cursor-pointer" style={{ background: isSelected ? 'rgba(200,131,74,0.05)' : 'transparent' }} onClick={() => toggleStyleExpand(style.style_id)}>
                  <div className="flex items-start gap-3">
                    {isDraft && canRelease && (
                      <input type="checkbox" checked={isSelected} onChange={() => toggleStyleSelect(style.style_id)} onClick={(e) => e.stopPropagation()} className="w-4 h-4 mt-1 accent-[#c8834a] cursor-pointer" />
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
                  <div className="flex items-center gap-2 shrink-0">
                    {style.minted_pieces > 0 && (
                      <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                        <BarcodeIcon className="w-3 h-3" /> {style.minted_pieces} minted
                      </span>
                    )}
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </div>
                {isExpanded && (
                  <div className="px-5 pb-5 space-y-1.5">
                    {(style.skus || []).map((sku) => (
                      <SkuRow
                        key={sku.sku_id}
                        sku={sku}
                        editable={isDraft && style.editable !== false}
                        token={token}
                        showToast={showToast}
                      />
                    ))}

                    <StyleAccessoriesPanel
                      styleId={style.style_id}
                      canEdit={canRelease && isDraft && style.editable !== false}
                      token={token}
                      showToast={showToast}
                      pieceCount={(style.skus || []).reduce((sum, s) => sum + (Number(s.qty_ordered) || 0), 0) || style.qty_ordered}
                    />

                    {/* Total Piece Count Summary at bottom of Style details */}
                    <div className="mt-3 pt-3 border-t border-slate-200/80 flex items-center justify-between px-4 py-3 rounded-xl bg-gradient-to-r from-[#faf6f0] to-[#fdfbf7] border border-[#c8834a]/25 shadow-xs">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wider text-[#4a3a2a]">
                          {style.style_name || style.style_code} Total
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#c8834a]/10 text-[#a86022]">
                          {(style.skus || []).length} SKUs
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Total Pieces:
                        </span>
                        <span className="font-mono font-black text-sm px-3 py-1 rounded-lg bg-white border border-[#c8834a]/30 shadow-sm" style={{ color: '#a86022' }}>
                          {(style.skus || []).reduce((sum, s) => sum + (Number(s.qty_ordered) || 0), 0) || style.qty_ordered || 0} pcs
                        </span>
                      </div>
                    </div>
                  </div>
                )}
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
      <LiningPromptModal
        show={showLiningPrompt}
        count={selectedStyleIds.length}
        onClose={() => setShowLiningPrompt(false)}
        onConfirm={confirmRelease}
      />
      <ReleaseResultModal
        result={releaseResult}
        onClose={() => setReleaseResult(null)}
        onBackToProduction={onBackToProduction}
      />

    </div>
  );
}
