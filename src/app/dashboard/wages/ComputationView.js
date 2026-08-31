// wages page run engine code
'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  apiGetWageOrders, apiGetWageStyles, apiComputeWageRun, apiCloseWageRun,
  apiReopenWageRun, apiRecomputeWageRun, apiGetWageRunBreakdown, apiGetWageLedger,
} from '@/lib/api';
import {
  Loader2, Activity, Calendar, Search, ChevronRight, RefreshCw, Lock, Unlock,
  Coins, Package, Scissors, Users,
} from 'lucide-react';
import { Toast, StatusBadge, Money, SearchCombobox } from './shared';
export default function ComputationView({ token }) {
  const [scopeType, setScopeType] = useState('factory'); // 'factory' | 'order' | 'style'
  const [orderNumber, setOrderNumber] = useState('');
  const [styleCode, setStyleCode] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Picker options — browse instead of typing an exact code from memory.
  const [orderOptions, setOrderOptions] = useState([]);
  const [orderOptionsLoading, setOrderOptionsLoading] = useState(false);
  const [styleOptions, setStyleOptions] = useState([]);
  const [styleOptionsLoading, setStyleOptionsLoading] = useState(false);

  const [isComputing, setIsComputing] = useState(false);
  const [run, setRun] = useState(null); // { run_id, status, reopen_count, ... }
  const [breakdown, setBreakdown] = useState(null);
  const [breakdownTab, setBreakdownTab] = useState('style'); // style | stage | employee
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');
  const [isReopening, setIsReopening] = useState(false);
  const [reopenReason, setReopenReason] = useState('');
  const [showReopenModal, setShowReopenModal] = useState(false);
  const [reopenTargetId, setReopenTargetId] = useState(null);

  // Team request: Recompute/Close/Reopen shouldn't require having just
  // computed a draft in this same session — a single "Run Actions" area,
  // keyed off a typed run id, works on any run at any time. When a
  // recompute target turns out to be CLOSED, offer the confirm_closed
  // escape hatch (no reason, stays closed) as a follow-up popup rather
  // than just failing.
  const [runActionId, setRunActionId] = useState('');
  const [isRecomputingStandalone, setIsRecomputingStandalone] = useState(false);
  const [isClosingById, setIsClosingById] = useState(false);
  const [showRecomputeAreYouSure, setShowRecomputeAreYouSure] = useState(false); // general "are you sure?" before every recompute attempt

  // Pick the run by the style code the operator actually remembers instead
  // of a raw run id — selecting a style looks up its runs via the ledger and
  // either auto-fills runActionId (single match) or lists candidates to
  // choose from (multiple runs computed for that style over time).
  const [runActionStyleCode, setRunActionStyleCode] = useState('');
  const [runActionStyleSearching, setRunActionStyleSearching] = useState(false);
  const [runActionStyleMatches, setRunActionStyleMatches] = useState([]);

  // "Find a run" picker — team asked why the operator needs to know a raw
  // run_id at all. They still do (the recompute/close/reopen endpoints are
  // keyed on it), but this lets them search by order/style/date instead of
  // copy-pasting one from the Ledger tab; picking a result just fills
  // runActionId for them.
  const [showRunFinder, setShowRunFinder] = useState(false);
  const [finderOrderNumber, setFinderOrderNumber] = useState('');
  const [finderStyleCode, setFinderStyleCode] = useState('');
  const [finderDateFrom, setFinderDateFrom] = useState('');
  const [finderDateTo, setFinderDateTo] = useState('');
  const [finderResults, setFinderResults] = useState([]);
  const [finderLoading, setFinderLoading] = useState(false);
  const [finderSearched, setFinderSearched] = useState(false);

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    setStartDate(firstDay.toISOString().split('T')[0]);
    setEndDate(today.toISOString().split('T')[0]);
  }, []);

  // Load the picker's options lazily, only once the operator actually
  // switches to that scope — no point fetching both lists up front.
  useEffect(() => {
    if ((scopeType === 'order' || showRunFinder) && orderOptions.length === 0) {
      setOrderOptionsLoading(true);
      apiGetWageOrders(token)
        .then((data) => setOrderOptions(Array.isArray(data) ? data : []))
        .catch(() => setOrderOptions([]))
        .finally(() => setOrderOptionsLoading(false));
    }
    // Style options are always needed now — the Run Actions style picker
    // below is visible up front, not gated behind a scope choice or the
    // Find a Run toggle.
    if (styleOptions.length === 0) {
      setStyleOptionsLoading(true);
      apiGetWageStyles(token, {})
        .then((data) => setStyleOptions(Array.isArray(data) ? data : []))
        .catch(() => setStyleOptions([]))
        .finally(() => setStyleOptionsLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scopeType, showRunFinder, token]);

  const loadBreakdown = async (runId) => {
    const data = await apiGetWageRunBreakdown(token, runId);
    setBreakdown(data);
  };

  const handleCompute = async () => {
    setIsComputing(true);
    setBreakdown(null);
    try {
      // Always compute as a DRAFT (freeze:false) — this screen is a review
      // step; the operator explicitly closes/freezes below once satisfied.
      const runData = await apiComputeWageRun(token, {
        periodStart: startDate,
        periodEnd: endDate,
        freeze: false,
        orderNumber: scopeType === 'order' ? orderNumber : undefined,
        styleCode: scopeType === 'style' ? styleCode : undefined,
      });
      setRun(runData);
      // Convenience only — Run Actions below never require this to have
      // happened, but pre-filling saves a copy/paste for the common case
      // of immediately closing what you just computed.
      setRunActionId(runData.id || runData.run_id || '');
      await loadBreakdown(runData.id || runData.run_id);
      showToast('Draft run computed — review, then close to freeze.', 'success');
    } catch (e) {
      showToast(e.message || 'Computation failed.', 'error');
    } finally {
      setIsComputing(false);
    }
  };

  // All three run actions below (Recompute/Close/Reopen) target whichever
  // run id is typed into the "Run Actions" section — they never require
  // having just computed a fresh draft in this session. `run` itself stays
  // reserved for "the run this session's Compute Draft Run produced" (used
  // to load its breakdown below); actions update it too when the ids match,
  // purely so the status badge there stays in sync, not as a dependency.
  const handleCloseById = async (runId) => {
    if (!runId) { showToast('Enter a run id to close.', 'error'); return; }
    setIsClosingById(true);
    try {
      const updated = await apiCloseWageRun(token, runId);
      if (run && (run.id || run.run_id) === runId) setRun((prev) => ({ ...prev, ...updated }));
      showToast('Run closed and frozen. Recompute now requires a reopen.', 'success');
    } catch (e) {
      showToast(e.message || 'Failed to close run.', 'error');
    } finally {
      setIsClosingById(false);
    }
  };

  const handleReopen = async () => {
    if (reopenReason.trim().length < 5) {
      showToast('Reason must be at least 5 characters.', 'error');
      return;
    }
    const runId = reopenTargetId;
    setIsReopening(true);
    try {
      const updated = await apiReopenWageRun(token, runId, reopenReason.trim());
      if (run && (run.id || run.run_id) === runId) setRun((prev) => ({ ...prev, ...updated }));
      setShowReopenModal(false);
      setReopenReason('');
      showToast(`Run reopened (reopen #${updated.reopen_count}). You can recompute now.`, 'success');
    } catch (e) {
      showToast(e.message || 'Failed to reopen run.', 'error');
    } finally {
      setIsReopening(false);
    }
  };

  // Team request: every Recompute click sends confirm_closed:true straight
  // away — no separate try-false-then-escalate dance. OPEN or CLOSED, one
  // click recomputes it; Reopen (above) is still the route for attaching an
  // audit reason to unfreezing a run, but recompute itself no longer waits
  // on that.
  const runRecompute = async (runId) => {
    setIsRecomputingStandalone(true);
    try {
      const updated = await apiRecomputeWageRun(token, runId, true);
      if (run && (run.id || run.run_id) === runId) setRun((prev) => ({ ...prev, ...updated }));
      await loadBreakdown(runId);
      showToast('Run recomputed.', 'success');
    } catch (e) {
      showToast(e.message || 'Recompute failed.', 'error');
    } finally {
      setIsRecomputingStandalone(false);
    }
  };

  // Team request: every recompute click asks "are you sure?" first — this
  // is separate from (and comes before) the closed-run escape-hatch popup.
  const handleRecomputeClick = () => {
    if (!runActionId.trim()) { showToast('Enter a run id to recompute.', 'error'); return; }
    setShowRecomputeAreYouSure(true);
  };

  const handleFindRuns = async () => {
    setFinderLoading(true);
    setFinderSearched(true);
    try {
      const data = await apiGetWageLedger(token, {
        orderNumber: finderOrderNumber || undefined,
        styleCode: finderStyleCode || undefined,
        dateFrom: finderDateFrom || undefined,
        dateTo: finderDateTo || undefined,
        limit: 20,
      });
      setFinderResults(Array.isArray(data?.items) ? data.items : []);
    } catch (e) {
      showToast(e.message || 'Search failed.', 'error');
      setFinderResults([]);
    } finally {
      setFinderLoading(false);
    }
  };

  const handlePickRun = (r) => {
    setRunActionId(r.run_id);
    setRun(r);
    setShowRunFinder(false);
    setFinderResults([]);
    setFinderSearched(false);
    setFinderOrderNumber('');
    setFinderStyleCode('');
    setFinderDateFrom('');
    setFinderDateTo('');
  };

  // Style select for Run Actions: look up that style's runs and either
  // auto-fill runActionId (one match) or list candidates to pick from.
  const handleSelectRunActionStyle = async (s) => {
    setRunActionStyleCode(s ? s.style_code : '');
    setRunActionId('');
    setRun(null);
    setRunActionStyleMatches([]);
    if (!s) return;
    setRunActionStyleSearching(true);
    try {
      const data = await apiGetWageLedger(token, { styleCode: s.style_code, limit: 20 });
      const items = Array.isArray(data?.items) ? data.items : [];
      if (items.length === 1) {
        setRunActionId(items[0].run_id);
        setRun(items[0]);
      } else if (items.length > 1) {
        setRunActionStyleMatches(items);
      } else {
        showToast(`No runs found for style ${s.style_code}.`, 'error');
      }
    } catch (e) {
      showToast(e.message || 'Failed to search runs for this style.', 'error');
    } finally {
      setRunActionStyleSearching(false);
    }
  };

  const handlePickRunActionMatch = (r) => {
    setRunActionId(r.run_id);
    setRun(r);
    setRunActionStyleMatches([]);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <Toast msg={toastMsg} type={toastType} />

      {/* ── ACTION CENTER ── */}
      {/* No overflow-hidden here: the scope-picker dropdown below renders
          absolutely-positioned options outside the card's box, and this
          card used to clip them — clicks landed on nothing. The decorative
          blur circle is clipped on its own instead. */}
      <div className="bg-white rounded-3xl shadow-xl p-6 sm:p-8 border relative" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-[#c8834a]/10 to-transparent rounded-full blur-3xl pointer-events-none translate-x-1/2 -translate-y-1/2"></div>

        <h3 className="text-xl font-black mb-6 flex items-center gap-2" style={{ color: '#2d1f0e' }}>
          <Activity className="w-6 h-6" style={{ color: '#c8834a' }} /> Engine Configuration
        </h3>

        {/* Scope picker — Order and Style are mutually exclusive (backend 422s both) */}
        <div className="flex gap-2 mb-6 relative z-10">
          {[
            { id: 'factory', label: 'Whole Factory' },
            { id: 'order', label: 'By Order' },
            { id: 'style', label: 'By Style' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setScopeType(opt.id)}
              className={`px-5 py-2.5 rounded-full font-black text-xs uppercase tracking-widest transition-all cursor-pointer border ${scopeType === opt.id ? 'text-white shadow-md' : 'bg-white text-slate-500'}`}
              style={scopeType === opt.id ? { background: '#c8834a', borderColor: '#c8834a' } : { borderColor: 'rgba(200,131,74,0.2)' }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border focus:border-[#c8834a] focus:bg-white transition-all shadow-inner"
                style={{ borderColor: 'rgba(200,131,74,0.1)' }}
              />
            </div>
          </div>

          <div className="space-y-2 relative z-10">
            <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>End Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-xl font-bold text-sm outline-none border focus:border-[#c8834a] focus:bg-white transition-all shadow-inner"
                style={{ borderColor: 'rgba(200,131,74,0.1)' }}
              />
            </div>
          </div>

          {scopeType !== 'factory' && (
            // z-30, not z-10: this wrapper is a sibling stacking context to
            // the "Compute Draft Run" button section below (also z-10) — at
            // equal z-index, later DOM order wins, so the button was
            // painting over the dropdown's options regardless of the
            // dropdown's own internal z-50. Needs to outrank that sibling.
            <div className="space-y-2 relative z-30">
              <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>
                {scopeType === 'order' ? 'Order Number' : 'Style Code'}
              </label>
              {scopeType === 'order' ? (
                <SearchCombobox
                  placeholder="Search and select an order..."
                  value={orderNumber}
                  options={orderOptions}
                  getKey={(o) => o.order_number}
                  getLabel={(o) => `PO ${o.order_number}`}
                  getSub={(o) => `${o.styles} styles · ${o.qty_ordered ?? '—'} pcs`}
                  onSelect={(o) => setOrderNumber(o ? o.order_number : '')}
                  loading={orderOptionsLoading}
                  allowClear
                />
              ) : (
                <SearchCombobox
                  placeholder="Search and select a style..."
                  value={styleCode}
                  options={styleOptions}
                  getKey={(s) => s.style_code}
                  getLabel={(s) => s.style_code}
                  getSub={(s) => s.style_name}
                  onSelect={(s) => setStyleCode(s ? s.style_code : '')}
                  loading={styleOptionsLoading}
                  allowClear
                />
              )}
            </div>
          )}
        </div>

        {scopeType !== 'factory' && (
          <p className="text-[10px] font-bold mt-3 text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 w-fit">
            Scoped runs pay PIECE-RATE work only — monthly-salary staff are not included (they&apos;d otherwise get paid again on the next scoped run).
          </p>
        )}

        <div className="mt-8 flex justify-end relative z-10 pt-6" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
          <button
            onClick={handleCompute}
            disabled={isComputing || (scopeType === 'order' && !orderNumber) || (scopeType === 'style' && !styleCode)}
            className="h-14 px-10 rounded-full font-black text-sm text-white shadow-xl transition-all hover:shadow-orange-500/30 hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center gap-3"
            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
          >
            {isComputing ? <><Loader2 className="w-5 h-5 animate-spin" /> Computing...</> : <><Activity className="w-5 h-5" /> Compute Draft Run</>}
          </button>
        </div>
      </div>

      {/* ── RUN ACTIONS ── */}
      {/* Team request: Recompute/Close/Reopen must not depend on having
          just computed a fresh draft in this session — they live in their
          own always-visible area below Compute Draft Run, keyed off a
          typed run id (auto-filled after a fresh compute, purely as a
          convenience). */}
      <div className="bg-white rounded-3xl shadow-sm p-5 sm:p-6 border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>Run Actions</p>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">Works on any run — use the one just computed above, or find one by order/style/date.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowRunFinder((v) => !v)}
            className="shrink-0 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest bg-white border shadow-sm hover:shadow-md transition-all flex items-center gap-1.5"
            style={{ color: '#c8834a', borderColor: 'rgba(200,131,74,0.25)' }}
          >
            <Search className="w-3.5 h-3.5" /> {showRunFinder ? 'Hide' : 'Find a Run'}
          </button>
        </div>

        {showRunFinder && (
          <div className="rounded-2xl border p-4 space-y-3 bg-[#faf6f0]" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <SearchCombobox
                placeholder="Any order..."
                value={finderOrderNumber}
                options={orderOptions}
                getKey={(o) => o.order_number}
                getLabel={(o) => `PO ${o.order_number}`}
                getSub={(o) => `${o.styles} styles`}
                onSelect={(o) => setFinderOrderNumber(o ? o.order_number : '')}
                loading={orderOptionsLoading}
                allowClear
              />
              <SearchCombobox
                placeholder="Any style..."
                value={finderStyleCode}
                options={styleOptions}
                getKey={(s) => s.style_code}
                getLabel={(s) => s.style_code}
                getSub={(s) => s.style_name}
                onSelect={(s) => setFinderStyleCode(s ? s.style_code : '')}
                loading={styleOptionsLoading}
                allowClear
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input type="date" value={finderDateFrom} onChange={(e) => setFinderDateFrom(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-white border rounded-xl text-xs font-bold outline-none focus:border-[#c8834a]"
                  style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <input type="date" value={finderDateTo} onChange={(e) => setFinderDateTo(e.target.value)}
                  className="w-full h-11 pl-9 pr-3 bg-white border rounded-xl text-xs font-bold outline-none focus:border-[#c8834a]"
                  style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
              </div>
            </div>
            <button
              type="button"
              onClick={handleFindRuns}
              disabled={finderLoading}
              className="px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              style={{ background: '#c8834a' }}
            >
              {finderLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
            </button>

            {finderSearched && !finderLoading && (
              <div className="space-y-1.5 pt-1">
                {finderResults.length === 0 ? (
                  <p className="text-xs font-bold text-slate-400 text-center py-3">No runs match this search.</p>
                ) : (
                  finderResults.map((r) => (
                    <button
                      key={r.run_id}
                      type="button"
                      onClick={() => handlePickRun(r)}
                      className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white border hover:border-[#c8834a] transition-all text-left"
                      style={{ borderColor: 'rgba(200,131,74,0.15)' }}
                    >
                      <div className="min-w-0">
                        <p className="font-black text-xs truncate" style={{ color: '#2d1f0e' }}>
                          {r.scope_order_number || r.scope_style_code || 'Whole Factory'}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400">{r.period_start} → {r.period_end}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <StatusBadge status={r.status} />
                        <ChevronRight className="w-4 h-4 text-slate-300" />
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest block" style={{ color: '#9a7a5a' }}>Style Code</label>
          <SearchCombobox
            placeholder="Search and select a style..."
            value={runActionStyleCode}
            options={styleOptions}
            getKey={(s) => s.style_code}
            getLabel={(s) => s.style_code}
            getSub={(s) => s.style_name}
            onSelect={handleSelectRunActionStyle}
            loading={styleOptionsLoading || runActionStyleSearching}
            allowClear
          />
        </div>

        {runActionStyleMatches.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-[10px] font-bold text-slate-400">Multiple runs found for this style — pick one:</p>
            {runActionStyleMatches.map((r) => (
              <button
                key={r.run_id}
                type="button"
                onClick={() => handlePickRunActionMatch(r)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-xl bg-white border hover:border-[#c8834a] transition-all text-left"
                style={{ borderColor: 'rgba(200,131,74,0.15)' }}
              >
                <div className="min-w-0">
                  <p className="font-black text-xs truncate" style={{ color: '#2d1f0e' }}>
                    {r.scope_order_number || r.scope_style_code || 'Whole Factory'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400">{r.period_start} → {r.period_end}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={r.status} />
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </button>
            ))}
          </div>
        )}

        {runActionId && (
          <p className="text-[10px] font-mono font-bold text-slate-400 truncate">Run ID: {runActionId}</p>
        )}
        {run && (run.id || run.run_id) === runActionId.trim() && (
          <div className="flex items-center gap-3">
            <StatusBadge status={run.status} />
            <p className="text-[10px] font-bold text-slate-400">
              {run.reopen_count > 0 && `Reopened ${run.reopen_count}x · `}
              {run.recompute_count > 0 && `Recomputed ${run.recompute_count}x`}
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-3">
          <button onClick={handleRecomputeClick} disabled={isRecomputingStandalone || !runActionId.trim()} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-white border shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50" style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}>
            {isRecomputingStandalone ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Recompute
          </button>
          <button onClick={() => handleCloseById(runActionId.trim())} disabled={isClosingById || !runActionId.trim()} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50" style={{ background: '#10b981' }}>
            {isClosingById ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />} Close &amp; Freeze
          </button>
          <button
            onClick={() => { if (!runActionId.trim()) { showToast('Enter a run id to reopen.', 'error'); return; } setReopenTargetId(runActionId.trim()); setShowReopenModal(true); }}
            disabled={!runActionId.trim()}
            className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-white border shadow-sm hover:shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            style={{ color: '#a86022', borderColor: 'rgba(200,131,74,0.2)' }}
          >
            <Unlock className="w-4 h-4" /> Reopen to Edit
          </button>
        </div>
      </div>

      {/* ── 3-WAY BREAKDOWN: by style / by stage / by employee ── */}
      {breakdown && (
        <div className="space-y-6 animate-fade-in-up">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-900 rounded-[2rem] p-8 shadow-2xl relative overflow-hidden border border-slate-800">
              <div className="absolute top-0 right-0 p-8 opacity-10"><Coins className="w-32 h-32 text-white" /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Total Amount</p>
              <h2 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-200">
                <Money value={breakdown.total_amount} />
              </h2>
            </div>
            <div className="bg-white rounded-[2rem] p-8 shadow-xl border flex flex-col justify-center" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color: '#9a7a5a' }}>Total Pieces</p>
              <h3 className="text-4xl font-black" style={{ color: '#2d1f0e' }}>{breakdown.total_pieces ?? 0}</h3>
            </div>
          </div>

          <div className="flex gap-1 p-1.5 rounded-full bg-white w-fit shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            {[
              { id: 'style', label: 'Per Style', icon: Package },
              { id: 'stage', label: 'Per Stage', icon: Scissors },
              { id: 'employee', label: 'Per Employee', icon: Users },
            ].map((t) => {
              const Icon = t.icon;
              const isActive = breakdownTab === t.id;
              return (
                <button key={t.id} onClick={() => setBreakdownTab(t.id)} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs transition-all ${isActive ? 'text-white shadow-md' : 'text-slate-500'}`} style={isActive ? { background: '#c8834a' } : {}}>
                  <Icon className="w-4 h-4" /> {t.label}
                </button>
              );
            })}
          </div>

          {breakdownTab === 'style' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(breakdown.by_style || []).map((s, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h5 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{s.style_name || s.style_code}</h5>
                      <p className="text-[10px] font-black uppercase text-slate-400">{s.style_code} · {s.pieces ?? 0} pieces</p>
                    </div>
                    <p className="font-black text-xl text-emerald-600"><Money value={s.amount} /></p>
                  </div>
                  {Array.isArray(s.stages) && s.stages.length > 0 && (
                    <div className="pt-3 mt-3 border-t border-slate-100 space-y-1.5">
                      {s.stages.map((st, si) => (
                        <div key={si} className="flex justify-between text-xs">
                          <span className="font-bold text-slate-500">{st.operation_label || st.operation_code}</span>
                          <span className="font-black" style={{ color: '#c8834a' }}><Money value={st.amount} /></span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {(!breakdown.by_style || breakdown.by_style.length === 0) && <p className="text-sm font-bold text-slate-400 col-span-full text-center py-6">No per-style data.</p>}
            </div>
          )}

          {breakdownTab === 'stage' && (
            <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="font-bold uppercase tracking-wider text-xs" style={{ color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.15)' }}>
                    <th className="py-3 px-4">Stage</th>
                    <th className="py-3 px-4">Rate</th>
                    <th className="py-3 px-4">Pieces</th>
                    <th className="py-3 px-4">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(breakdown.by_stage || []).map((s, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4 font-bold" style={{ color: '#2d1f0e' }}>{s.operation_label || s.operation_code}</td>
                      <td className="py-3 px-4 text-slate-500 font-bold">{s.rate != null ? `₹${s.rate}` : '—'}</td>
                      <td className="py-3 px-4 font-bold" style={{ color: '#c8834a' }}>{s.pieces ?? 0}</td>
                      <td className="py-3 px-4 font-black text-emerald-600"><Money value={s.amount} /></td>
                    </tr>
                  ))}
                  {(!breakdown.by_stage || breakdown.by_stage.length === 0) && (
                    <tr><td colSpan="4" className="py-8 text-center text-slate-400 font-bold">No per-stage data.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {breakdownTab === 'employee' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(breakdown.by_employee || []).map((e, i) => (
                <div key={i} className="bg-white p-6 rounded-2xl shadow-sm border flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-100">
                      <Users className="w-5 h-5" />
                    </div>
                    <div>
                      <h5 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{e.employee_name || 'Worker'}</h5>
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{e.designation || 'Piece Rate'} · {e.pieces ?? 0} pieces</p>
                    </div>
                  </div>
                  <p className="font-black text-xl text-emerald-600"><Money value={e.amount} /></p>
                </div>
              ))}
              {(!breakdown.by_employee || breakdown.by_employee.length === 0) && <p className="text-sm font-bold text-slate-400 col-span-full text-center py-6">No per-employee data.</p>}
            </div>
          )}
        </div>
      )}

      {/* Reopen reason modal */}
      {showReopenModal && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden mx-4">
            <div className="p-6 sm:p-8 space-y-4">
              <h3 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>Reopen Frozen Run</h3>
              <p className="text-xs font-bold text-slate-500">This run is closed. Reopening requires a reason (audited, shown on reissued payslips).</p>
              <textarea
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                placeholder="Why does this run need to be reopened? (min. 5 characters)"
                className="w-full h-24 p-4 bg-slate-50 rounded-xl font-medium text-sm outline-none border focus:border-[#c8834a] focus:bg-white transition-all resize-none"
                style={{ borderColor: 'rgba(200,131,74,0.2)' }}
              />
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => { setShowReopenModal(false); setReopenReason(''); }} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600">Cancel</button>
                <button onClick={handleReopen} disabled={isReopening || reopenReason.trim().length < 5} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white disabled:opacity-50 flex items-center gap-2" style={{ background: '#c8834a' }}>
                  {isReopening ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />} Reopen Run
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* General "are you sure?" — every Recompute click asks this first,
          before the request is even sent. */}
      {showRecomputeAreYouSure && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden mx-4">
            <div className="p-6 sm:p-8 space-y-4">
              <h3 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>Recompute This Run?</h3>
              <p className="text-xs font-bold text-slate-500">
                Run <span className="font-mono">{runActionId.trim()}</span> will be recomputed against the current rate sheet and production events. Are you sure you want to recompute?
              </p>
              <div className="flex gap-3 justify-end pt-2">
                <button onClick={() => setShowRecomputeAreYouSure(false)} className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest bg-slate-100 text-slate-600">Cancel</button>
                <button
                  onClick={() => { setShowRecomputeAreYouSure(false); runRecompute(runActionId.trim()); }}
                  disabled={isRecomputingStandalone}
                  className="px-5 py-3 rounded-xl font-black text-xs uppercase tracking-widest text-white disabled:opacity-50 flex items-center gap-2"
                  style={{ background: '#c8834a' }}
                >
                  {isRecomputingStandalone ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Yes, Recompute
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}