'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetWageOrders,
  apiGetWageStyles,
  apiComputeWageRun,
  apiCloseWageRun,
  apiReopenWageRun,
  apiRecomputeWageRun,
  apiGetWageRunBreakdown,
  apiGetWageRunPieces,
  apiGetWageLedger,
  apiGetRateSheet,
  apiSetWageRatesBulk,
  apiSetWageRateSingle,
  apiGetRateHistory,
} from '@/lib/api';
import {
  Loader2, History, Eye, X, Save, Activity, Search,
  Briefcase, Scissors, CheckCircle2, AlertCircle, Coins,
  Calendar, FileText, Filter, Users, TrendingUp, ChevronRight, ChevronDown,
  Warehouse, Package, Lock, Unlock, RefreshCw, Barcode as BarcodeIcon, Download,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import SpotlightCard from '@/components/SpotlightCard';

export default function PieceRatesAndWages() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('styles');

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* ─── PREMIUM HEADER & NAVIGATION ─── */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 relative z-10">
        <div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
            Payroll Command
          </h1>
          <p className="font-medium mt-2 text-sm max-w-xl" style={{ color: '#9a7a5a' }}>
            Manage piece-rate logic, execute shop floor audits, and process automated wage runs with high precision.
          </p>
        </div>

        {/* ─── PILL NAVIGATION ─── */}
        <div className="flex items-center gap-1 p-1.5 rounded-full bg-white/60 backdrop-blur-md shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          {[
            { id: 'styles', icon: Scissors, label: 'Piece Rates' },
            { id: 'computation', icon: Activity, label: 'Run Engine' },
            { id: 'ledger', icon: FileText, label: 'Ledger' }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs sm:text-sm transition-all duration-300 ${isActive
                  ? 'bg-white shadow-md'
                  : 'hover:bg-white/40 opacity-70 hover:opacity-100'
                  }`}
                style={isActive ? { color: '#c8834a' } : { color: '#4a3a2a' }}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'scale-110' : 'scale-100'} transition-transform`} />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ─── ACTIVE VIEW RENDERER ─── */}
      <div className="relative z-0">
        <div className={`transition-all duration-500 ${activeTab === 'styles' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <OrdersStylesView token={token} />
        </div>
        <div className={`transition-all duration-500 ${activeTab === 'computation' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <ComputationView token={token} />
        </div>
        <div className={`transition-all duration-500 ${activeTab === 'ledger' ? 'opacity-100 translate-y-0 relative' : 'opacity-0 translate-y-4 absolute inset-x-0 pointer-events-none'}`}>
          <LedgerView token={token} />
        </div>
      </div>
    </div>
  );
}

// ─── TOAST NOTIFICATION COMPONENT ───
function Toast({ msg, type }) {
  if (!msg) return null;
  const isSuccess = type === 'success';
  return createPortal(
    <div className="fixed bottom-4 right-4 left-4 sm:bottom-8 sm:right-8 sm:left-auto flex justify-center z-[999999] animate-fade-in pointer-events-none">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 backdrop-blur-md border max-w-sm w-full sm:w-auto ${isSuccess
        ? 'bg-emerald-50/90 border-emerald-200/50 text-emerald-900 shadow-emerald-500/10'
        : 'bg-red-50/90 border-red-200/50 text-red-900 shadow-red-500/10'
        }`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
        {msg}
      </div>
    </div>,
    document.body
  );
}

function StatusBadge({ status }) {
  const isClosed = String(status || '').toUpperCase() === 'CLOSED';
  return (
    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm flex items-center gap-1 shrink-0 ${isClosed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
      {isClosed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      {isClosed ? 'Frozen' : 'Draft'}
    </span>
  );
}

// Money value that renders "Not priced" instead of a lying 0 — the
// backend explicitly returns amount:null (never 0) for unpriced cells.
function Money({ value }) {
  if (value == null) return <span className="italic text-slate-400 font-bold text-xs">Not priced</span>;
  return <>₹{Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>;
}

// Searchable dropdown for picking an order/style by browsing instead of
// typing an exact code from memory.
function SearchCombobox({ placeholder, value, options, getKey, getLabel, getSub, onSelect, disabled, loading, allowClear }) {
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
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className="w-full h-12 px-4 bg-slate-50 font-bold border rounded-xl text-xs outline-none transition-all flex items-center justify-between text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: 'rgba(200,131,74,0.15)' }}
      >
        <span className={selectedOption ? 'truncate' : 'text-slate-400'} style={selectedOption ? { color: '#2d1f0e' } : {}}>
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: '#c8834a' }} /> : <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: '#c8834a' }} />}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-full min-w-[260px] bg-white border-2 rounded-2xl shadow-2xl p-2.5 space-y-2" style={{ borderColor: '#c8834a' }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9a7a5a' }} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full h-10 pl-9 pr-3 bg-[#faf6f0] border rounded-lg text-xs font-bold outline-none"
              style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {allowClear && (
              <button
                type="button"
                onClick={() => { onSelect(null); setIsOpen(false); setQuery(''); }}
                className="w-full p-2 text-left rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                — Clear selection —
              </button>
            )}
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

// ─── 1. ORDERS -> STYLES -> RATE EDITOR ──────────────────────────────────────
function OrdersStylesView({ token }) {
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);

  const [styles, setStyles] = useState([]);
  const [stylesLoading, setStylesLoading] = useState(false);
  const [styleSearch, setStyleSearch] = useState('');
  const [selectedStyle, setSelectedStyle] = useState(null);

  const [rates, setRates] = useState([]);
  const [historyModal, setHistoryModal] = useState(null);
  const [savingOps, setSavingOps] = useState({});
  const [savingAll, setSavingAll] = useState(false);
  const [toastMsg, setToastMsg] = useState(null);
  const [toastType, setToastType] = useState('success');

  const showToast = (msg, type = 'success') => {
    setToastMsg(msg); setToastType(type);
    setTimeout(() => setToastMsg(null), 3000);
  };

  useEffect(() => {
    setOrdersLoading(true);
    apiGetWageOrders(token)
      .then((data) => setOrders(Array.isArray(data) ? data : []))
      .catch(() => setOrders([]))
      .finally(() => setOrdersLoading(false));
  }, [token]);

  const filteredOrders = useMemo(() => {
    if (!orderSearch.trim()) return orders;
    const q = orderSearch.toLowerCase().trim();
    return orders.filter((o) => String(o.order_number || '').toLowerCase().includes(q));
  }, [orders, orderSearch]);

  const handleSelectOrder = (order) => {
    setSelectedOrder(order);
    setStylesLoading(true);
    apiGetWageStyles(token, { order_number: order.order_number })
      .then((data) => setStyles(Array.isArray(data) ? data : []))
      .catch(() => setStyles([]))
      .finally(() => setStylesLoading(false));
  };

  const filteredStyles = useMemo(() => {
    if (!styleSearch.trim()) return styles;
    const q = styleSearch.toLowerCase().trim();
    return styles.filter((s) =>
      String(s.style_code || '').toLowerCase().includes(q) ||
      String(s.style_name || '').toLowerCase().includes(q)
    );
  }, [styles, styleSearch]);

  const handleSelectStyle = async (style) => {
    setSelectedStyle(style);
    const data = await apiGetRateSheet(token, style.style_code);
    setRates(data.operations);
  };

  const handleShowHistory = async (opCode) => {
    const data = await apiGetRateHistory(token, selectedStyle.style_code, opCode);
    setHistoryModal(data);
  };

  const handleSaveSingleRate = async (op) => {
    setSavingOps(prev => ({ ...prev, [op.operation_code]: true }));
    try {
      await apiSetWageRateSingle(token, {
        style_code: selectedStyle.style_code,
        operation_code: op.operation_code,
        rate: parseFloat(op.rate || 0),
        effective_from: new Date().toISOString().split('T')[0]
      });
      showToast(`${op.label} rate saved!`, 'success');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSavingOps(prev => ({ ...prev, [op.operation_code]: false }));
    }
  };

  const handleSaveAllRates = async () => {
    setSavingAll(true);
    try {
      await apiSetWageRatesBulk(token, {
        style_code: selectedStyle.style_code,
        effective_from: new Date().toISOString().split('T')[0],
        lines: rates.map(op => ({ operation_code: op.operation_code, rate: parseFloat(op.rate || 0) }))
      });
      showToast('All rates saved successfully!', 'success');
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setSavingAll(false);
    }
  };

  // ── LEVEL 3: RATE EDITOR ──
  if (selectedStyle) {
    return (
      <div className="space-y-6 animate-fade-in">
        <Toast msg={toastMsg} type={toastType} />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 md:p-8 rounded-[2rem] shadow-xl border relative overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div className="absolute top-0 left-0 w-1.5 h-full" style={{ background: 'linear-gradient(to bottom, #c8834a, #e8a06a)' }}></div>
          <div>
            <h2 className="font-black text-3xl" style={{ color: '#2d1f0e' }}>{selectedStyle.style_name}</h2>
            <div className="flex items-center gap-3 mt-2 text-xs font-bold uppercase tracking-widest flex-wrap" style={{ color: '#c8834a' }}>
              <span className="bg-[#faf6f0] px-3 py-1 rounded-md border" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>{selectedStyle.style_code}</span>
              <span>•</span>
              <span>Master Rate Config</span>
            </div>
          </div>
          <button
            onClick={() => setSelectedStyle(null)}
            className="px-6 py-3 bg-[#faf6f0] font-black text-xs uppercase tracking-widest rounded-2xl transition-all border shadow-sm hover:shadow-md hover:bg-white active:scale-95"
            style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}
          >
            ← Back to {selectedOrder?.order_number} Styles
          </button>
        </div>

        <div className="grid gap-4">
          {rates.map((op, idx) => {
            const isSaving = savingOps[op.operation_code];
            return (
              <div key={op.operation_code} className="bg-white p-5 md:p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row md:items-center gap-6 transition-all hover:shadow-md group" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                <div className="flex-1">
                  <h4 className="font-black text-lg flex items-center gap-2" style={{ color: '#2d1f0e' }}>
                    <div className="w-8 h-8 rounded-full bg-[#faf6f0] flex items-center justify-center text-[10px] text-[#c8834a] border" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
                      {(idx + 1).toString().padStart(2, '0')}
                    </div>
                    {op.label}
                  </h4>
                  <p className="text-[10px] font-bold text-slate-400 ml-10 mt-1 uppercase tracking-widest">{op.operation_code}</p>
                </div>

                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-48 group-focus-within:ring-4 rounded-xl transition-all" style={{ ringColor: 'rgba(200,131,74,0.1)' }}>
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">₹</span>
                    <input
                      type="number" step="0.01" min="0"
                      className="w-full h-14 pl-9 pr-4 bg-slate-50 hover:bg-white font-black text-lg border-2 rounded-xl outline-none transition-all shadow-inner focus:bg-white focus:border-[#c8834a] [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      style={{ color: '#c8834a', borderColor: 'transparent' }}
                      value={op.rate ?? ''}
                      onChange={(e) => {
                        const newRates = [...rates];
                        newRates[idx].rate = e.target.value;
                        setRates(newRates);
                      }}
                      placeholder="0.00"
                    />
                  </div>

                  <button
                    onClick={() => handleSaveSingleRate(op)}
                    disabled={isSaving}
                    className="w-14 h-14 rounded-xl font-bold text-white shadow-sm transition-all hover:shadow-lg hover:-translate-y-1 disabled:opacity-50 flex items-center justify-center active:scale-95 shrink-0"
                    style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
                    title="Save Rate"
                  >
                    {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => handleShowHistory(op.operation_code)}
                    className="w-14 h-14 rounded-xl bg-white shadow-sm border transition-all hover:shadow-md flex items-center justify-center shrink-0"
                    style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                    title="View Rate History"
                  >
                    <History className="w-5 h-5 text-slate-400 hover:text-[#c8834a] transition-colors" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="sticky bottom-6 z-50 flex justify-center mt-8 animate-fade-in-up">
          <button
            onClick={handleSaveAllRates}
            disabled={savingAll}
            className="h-14 px-10 rounded-full font-black text-base text-white shadow-2xl transition-all hover:shadow-emerald-500/20 hover:-translate-y-1 active:scale-95 disabled:opacity-50 flex items-center gap-3 border border-emerald-400/30 backdrop-blur-md"
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            {savingAll ? <><Loader2 className="w-5 h-5 animate-spin" /> Saving Grid...</> : <><Save className="w-5 h-5" /> Commit All Rates</>}
          </button>
        </div>

        {historyModal && typeof document !== 'undefined' && createPortal(
          <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-scale-up overflow-hidden mx-4">
              <div className="p-6 sm:p-8 pb-6 border-b" style={{ background: '#faf6f0', borderColor: 'rgba(200,131,74,0.1)' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>Audit Trail</h3>
                    <p className="text-xs font-bold uppercase tracking-widest mt-1" style={{ color: '#c8834a' }}>OP: {historyModal.operation_code}</p>
                  </div>
                  <button onClick={() => setHistoryModal(null)} className="p-2 bg-white rounded-full border shadow-sm text-slate-400 hover:text-slate-700 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="p-8 max-h-[60vh] overflow-y-auto bg-slate-50">
                {historyModal.history.length === 0 ? (
                  <div className="text-center py-10 opacity-60">
                    <History className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm font-bold text-slate-400">No revisions found.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyModal.history.map((h, i) => (
                      <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border flex justify-between items-center" style={{ borderColor: i === 0 ? '#10b981' : 'rgba(200,131,74,0.1)' }}>
                        <div>
                          {i === 0 && <span className="block text-[9px] font-black uppercase text-emerald-600 mb-1 tracking-widest">Active Rate</span>}
                          <p className="text-xs font-bold text-slate-400 mb-0.5">Effective From</p>
                          <p className="font-black text-sm" style={{ color: '#2d1f0e' }}>{h.effective_from}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-black text-2xl" style={{ color: i === 0 ? '#10b981' : '#c8834a' }}>₹{h.rate}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
      </div>
    );
  }

  // ── LEVEL 2: STYLE CARDS (within selected order) ──
  if (selectedOrder) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div>
            <h2 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>PO {selectedOrder.order_number}</h2>
            <p className="text-xs font-bold mt-1" style={{ color: '#9a7a5a' }}>{selectedOrder.styles} styles · {selectedOrder.qty_ordered ?? '—'} pieces ordered</p>
          </div>
          <button
            onClick={() => { setSelectedOrder(null); setStyleSearch(''); }}
            className="px-6 py-3 bg-[#faf6f0] font-black text-xs uppercase tracking-widest rounded-2xl transition-all border shadow-sm hover:shadow-md hover:bg-white active:scale-95"
            style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}
          >
            ← Back to Orders
          </button>
        </div>

        <div className="relative w-full bg-white/80 backdrop-blur-md p-2 rounded-3xl shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Style Code or Name..."
            value={styleSearch}
            onChange={(e) => setStyleSearch(e.target.value)}
            className="w-full h-12 pl-14 pr-4 bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none placeholder-slate-400"
          />
        </div>

        {stylesLoading ? (
          <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} /></div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
            {filteredStyles.length > 0 ? (
              filteredStyles.map((s) => {
                const progress = s.total_operations ? (s.rated_operations / s.total_operations) * 100 : 0;
                const isComplete = progress === 100;
                const totalPieces = s.qty_ordered ?? s.total_pieces ?? s.piece_count ?? s.quantity ?? null;
                return (
                  <SpotlightCard
                    key={s.style_code}
                    onClick={() => handleSelectStyle(s)}
                    className="p-5 sm:p-6 bg-white cursor-pointer transition-all rounded-3xl shadow-sm hover:shadow-xl group hover:-translate-y-1 flex flex-col justify-between h-full"
                    style={{ border: '1px solid rgba(200,131,74,0.15)' }}
                    spotlightColor="rgba(200,131,74,0.06)"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: isComplete ? '#f0fdf4' : '#faf6f0', color: isComplete ? '#10b981' : '#c8834a' }}>
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                          Edit Rates
                        </span>
                      </div>

                      <h3 className="font-black text-xl mb-1 truncate" style={{ color: '#2d1f0e' }}>{s.style_code}</h3>
                      <p className="text-xs font-bold text-[#9a7a5a] mb-2 line-clamp-1">{s.style_name}</p>
                      {totalPieces != null && (
                        <p className="text-[10px] font-black uppercase tracking-wider mb-6" style={{ color: '#c8834a' }}>{totalPieces} Total Pieces</p>
                      )}
                    </div>

                    <div className="space-y-3 mt-auto">
                      <div className="flex justify-between items-end">
                        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isComplete ? '#10b981' : '#c8834a' }}>
                          {isComplete ? 'Configuration Complete' : 'Pending Rates'}
                        </span>
                        <span className="font-black text-sm" style={{ color: '#2d1f0e' }}>{s.rated_operations}/{s.total_operations}</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-1000 ease-out"
                          style={{
                            width: `${progress}%`,
                            background: isComplete ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #e8a06a, #c8834a)'
                          }}
                        />
                      </div>
                    </div>
                  </SpotlightCard>
                );
              })
            ) : (
              <div className="col-span-full py-20 text-center bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300">
                <Filter className="w-10 h-10 mx-auto text-slate-300 mb-4" />
                <p className="font-bold text-slate-400">No styles found matching &quot;{styleSearch}&quot;</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── LEVEL 1: ORDER CARDS (Default View) ──
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="relative w-full bg-white/80 backdrop-blur-md p-2 rounded-3xl shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input
          type="text"
          placeholder="Search by Order Number..."
          value={orderSearch}
          onChange={(e) => setOrderSearch(e.target.value)}
          className="w-full h-12 pl-14 pr-4 bg-transparent border-none text-sm font-bold text-slate-800 focus:outline-none placeholder-slate-400"
        />
      </div>

      {ordersLoading ? (
        <div className="flex flex-col items-center justify-center p-20 opacity-60">
          <Loader2 className="w-10 h-10 animate-spin text-[#c8834a] mb-4" />
          <p className="font-bold text-sm tracking-widest uppercase" style={{ color: '#9a7a5a' }}>Loading Orders...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 items-stretch">
          {filteredOrders.length > 0 ? (
            filteredOrders.map((o) => {
              const isComplete = o.fully_priced;
              return (
                <SpotlightCard
                  key={o.order_number}
                  onClick={() => handleSelectOrder(o)}
                  className="p-5 sm:p-6 bg-white cursor-pointer transition-all rounded-3xl shadow-sm hover:shadow-xl group hover:-translate-y-1 flex flex-col justify-between h-full"
                  style={{ border: '1px solid rgba(200,131,74,0.15)' }}
                  spotlightColor="rgba(200,131,74,0.06)"
                >
                  <div>
                    <div className="flex justify-between items-start mb-6">
                      <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm" style={{ background: isComplete ? '#f0fdf4' : '#faf6f0', color: isComplete ? '#10b981' : '#c8834a' }}>
                        <Warehouse className="w-5 h-5" />
                      </div>
                      <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-slate-900 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
                        View Styles
                      </span>
                    </div>

                    <h3 className="font-black text-xl mb-1 truncate" style={{ color: '#2d1f0e' }}>PO {o.order_number}</h3>
                    <p className="text-xs font-bold text-[#9a7a5a] mb-1">{o.styles} styles · {o.qty_ordered ?? '—'} pieces</p>
                  </div>

                  <div className="space-y-3 mt-auto pt-4">
                    <div className="flex justify-between items-end">
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: isComplete ? '#10b981' : '#c8834a' }}>
                        {isComplete ? 'Fully Priced' : 'Rates Pending'}
                      </span>
                      <span className="font-black text-sm" style={{ color: '#2d1f0e' }}>{o.styles_priced}/{o.styles}</span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{
                          width: `${o.styles ? (o.styles_priced / o.styles) * 100 : 0}%`,
                          background: isComplete ? 'linear-gradient(90deg, #34d399, #10b981)' : 'linear-gradient(90deg, #e8a06a, #c8834a)'
                        }}
                      />
                    </div>
                  </div>
                </SpotlightCard>
              );
            })
          ) : (
            <div className="col-span-full py-20 text-center bg-white/50 backdrop-blur-sm rounded-[2rem] border border-dashed border-slate-300">
              <Filter className="w-10 h-10 mx-auto text-slate-300 mb-4" />
              <p className="font-bold text-slate-400">No orders found matching &quot;{orderSearch}&quot;</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── 2. RUN ENGINE — compute a draft, review 3-way breakdown, freeze ─────────
function ComputationView({ token }) {
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
    if ((scopeType === 'style' || showRunFinder) && styleOptions.length === 0) {
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

        <input
          value={runActionId}
          onChange={(e) => setRunActionId(e.target.value)}
          placeholder="Run id…"
          className="w-full h-11 px-4 bg-[#faf6f0] border rounded-xl font-mono text-xs font-bold outline-none focus:border-[#c8834a]"
          style={{ borderColor: 'rgba(200,131,74,0.2)' }}
        />
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

// ─── 3. LEDGER — searchable, latest-computed-first ───────────────────────────
function LedgerView({ token }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [orderSearch, setOrderSearch] = useState('');
  const [styleSearch, setStyleSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [orderOptions, setOrderOptions] = useState([]);
  const [orderOptionsLoading, setOrderOptionsLoading] = useState(true);
  const [styleOptions, setStyleOptions] = useState([]);
  const [styleOptionsLoading, setStyleOptionsLoading] = useState(true);

  const [selectedRun, setSelectedRun] = useState(null);
  const [runBreakdown, setRunBreakdown] = useState(null);
  const [runPieces, setRunPieces] = useState(null);
  const [detailTab, setDetailTab] = useState('style'); // style | stage | employee | pieces
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState(''); // filters whichever tab is active; cleared on tab switch
  // Per Piece tab only: column-wise filters, on top of the free-text search above.
  const [pieceFilterStage, setPieceFilterStage] = useState('');
  const [pieceFilterEmployee, setPieceFilterEmployee] = useState('');

  const loadLedger = () => {
    setLoading(true);
    apiGetWageLedger(token, {
      orderNumber: orderSearch || undefined,
      styleCode: styleSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter || undefined,
      limit: 100,
    })
      .then((data) => setRuns(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setRuns([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadLedger();
    apiGetWageOrders(token)
      .then((data) => setOrderOptions(Array.isArray(data) ? data : []))
      .catch(() => setOrderOptions([]))
      .finally(() => setOrderOptionsLoading(false));
    apiGetWageStyles(token, {})
      .then((data) => setStyleOptions(Array.isArray(data) ? data : []))
      .catch(() => setStyleOptions([]))
      .finally(() => setStyleOptionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Group latest-first ledger rows by scope (order / style / whole
  // factory) for the "order card -> date -> style" nesting the spec asks
  // for — the backend already returns latest-computed-first, we only group.
  const grouped = useMemo(() => {
    const groups = new Map();
    runs.forEach((r) => {
      const key = r.scope_order_number || r.scope_style_code || 'Whole Factory';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    return Array.from(groups.entries());
  }, [runs]);

  const handleOpenRun = async (run) => {
    setSelectedRun(run);
    setDetailTab('style');
    setDetailSearch('');
    setPieceFilterStage('');
    setPieceFilterEmployee('');
    setDetailsLoading(true);
    setRunBreakdown(null);
    setRunPieces(null);
    try {
      const [bd, pieces] = await Promise.all([
        apiGetWageRunBreakdown(token, run.run_id),
        apiGetWageRunPieces(token, run.run_id, { limit: 200 }),
      ]);
      setRunBreakdown(bd);
      setRunPieces(pieces);
    } catch (err) {
      console.warn('Failed to load run details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // One workbook, 4 sheets — matches the 4 detail tabs above exactly, so the
  // download is never missing something the screen shows (or vice versa).
  const handleDownloadWorkbook = () => {
    if (!selectedRun) return;
    const fmtAmount = (v) => (v === null || v === undefined ? 'Not priced' : v);

    const styleRows = (runBreakdown?.by_style || []).map((s) => ({
      Style: s.style_name || s.style_code, 'Style Code': s.style_code,
      Pieces: s.pieces ?? 0, Amount: fmtAmount(s.amount),
    }));
    const stageRows = (runBreakdown?.by_stage || []).map((s) => ({
      Stage: s.operation_label || s.operation_code, Sequence: s.sequence,
      Pieces: s.pieces ?? 0, Amount: fmtAmount(s.amount),
    }));
    const employeeRows = (runBreakdown?.by_employee || []).map((e) => ({
      Employee: e.employee_name || 'Worker', Designation: e.designation || '',
      Pieces: e.pieces ?? 0, Amount: fmtAmount(e.amount),
    }));
    const pieceRows = (runPieces?.items || []).map((p) => ({
      'Piece Code': p.piece_code, Style: p.style_name || p.style_code,
      Colour: p.colour || '', Size: p.size || '',
      Stage: p.operation_label || p.operation_code,
      Employee: p.employee_name || '', 'Employee Barcode': p.employee_barcode || '',
      Designation: p.designation || '', 'Work Date': p.work_date || '',
      Qty: p.qty ?? '', Rate: fmtAmount(p.rate), Amount: fmtAmount(p.amount),
      Note: p.note || '',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(styleRows.length ? styleRows : [{ Info: 'No data' }]), 'Per Style');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stageRows.length ? stageRows : [{ Info: 'No data' }]), 'Per Stage');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employeeRows.length ? employeeRows : [{ Info: 'No data' }]), 'Per Employee');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pieceRows.length ? pieceRows : [{ Info: 'No data' }]), 'Per Piece');

    const scopeName = (selectedRun.scope_order_number || selectedRun.scope_style_code || 'Whole_Factory').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Payroll_${scopeName}_${selectedRun.period_start}_to_${selectedRun.period_end}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-60">
        <Loader2 className="w-10 h-10 animate-spin text-[#c8834a] mb-4" />
      </div>
    );
  }

  // Team request: a search box per detail tab, filtering that tab's rows,
  // plus a "download what's filtered" button next to it — separate from
  // the existing "download everything" workbook button above.
  const searchNorm = detailSearch.trim().toLowerCase();
  const filteredByStyle = (runBreakdown?.by_style || []).filter((s) => !searchNorm || `${s.style_name || ''} ${s.style_code || ''}`.toLowerCase().includes(searchNorm));
  const filteredByStage = (runBreakdown?.by_stage || []).filter((s) => !searchNorm || `${s.operation_label || ''} ${s.operation_code || ''}`.toLowerCase().includes(searchNorm));
  const filteredByEmployee = (runBreakdown?.by_employee || []).filter((e) => !searchNorm || `${e.employee_name || ''} ${e.designation || ''}`.toLowerCase().includes(searchNorm));
  const pieceStageOptions = Array.from(new Set((runPieces?.items || []).map((p) => p.operation_label || p.operation_code).filter(Boolean)));
  const pieceEmployeeOptions = Array.from(new Set((runPieces?.items || []).map((p) => p.employee_name).filter(Boolean)));
  const filteredPieces = (runPieces?.items || []).filter((p) =>
    (!searchNorm || `${p.piece_code || ''} ${p.employee_name || ''} ${p.employee_barcode || ''} ${p.operation_label || ''}`.toLowerCase().includes(searchNorm)) &&
    (!pieceFilterStage || (p.operation_label || p.operation_code) === pieceFilterStage) &&
    (!pieceFilterEmployee || p.employee_name === pieceFilterEmployee)
  );

  const handleDownloadFiltered = () => {
    if (!selectedRun) return;
    const fmtAmount = (v) => (v === null || v === undefined ? 'Not priced' : v);
    let rows = []; let sheetName = '';
    if (detailTab === 'style') {
      sheetName = 'Per Style';
      rows = filteredByStyle.map((s) => ({ Style: s.style_name || s.style_code, 'Style Code': s.style_code, Pieces: s.pieces ?? 0, Amount: fmtAmount(s.amount) }));
    } else if (detailTab === 'stage') {
      sheetName = 'Per Stage';
      rows = filteredByStage.map((s) => ({ Stage: s.operation_label || s.operation_code, Pieces: s.pieces ?? 0, Amount: fmtAmount(s.amount) }));
    } else if (detailTab === 'employee') {
      sheetName = 'Per Employee';
      rows = filteredByEmployee.map((e) => ({ Employee: e.employee_name || 'Worker', Designation: e.designation || '', Pieces: e.pieces ?? 0, Amount: fmtAmount(e.amount) }));
    } else {
      sheetName = 'Per Piece';
      rows = filteredPieces.map((p) => ({
        'Piece Code': p.piece_code, Stage: p.operation_label || p.operation_code,
        Employee: p.employee_name || '', 'Employee Barcode': p.employee_barcode || '', Amount: fmtAmount(p.amount),
      }));
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'No matching rows' }]), sheetName);
    const scopeName = (selectedRun.scope_order_number || selectedRun.scope_style_code || 'Whole_Factory').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Payroll_${scopeName}_${sheetName.replace(/\s+/g, '_')}_filtered.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── SEARCH BAR ── */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <SearchCombobox
          placeholder="Order number..."
          value={orderSearch}
          options={orderOptions}
          getKey={(o) => o.order_number}
          getLabel={(o) => `PO ${o.order_number}`}
          getSub={(o) => `${o.styles} styles`}
          onSelect={(o) => setOrderSearch(o ? o.order_number : '')}
          loading={orderOptionsLoading}
          allowClear
        />
        <SearchCombobox
          placeholder="Style code..."
          value={styleSearch}
          options={styleOptions}
          getKey={(s) => s.style_code}
          getLabel={(s) => s.style_code}
          getSub={(s) => s.style_name}
          onSelect={(s) => setStyleSearch(s ? s.style_code : '')}
          loading={styleOptionsLoading}
          allowClear
        />
        <input type="date" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
        <input type="date" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
        <div className="flex gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="flex-1 h-12 px-3 bg-slate-50 rounded-xl font-bold text-xs outline-none border focus:border-[#c8834a] cursor-pointer" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <option value="">All Status</option>
            <option value="open">Draft</option>
            <option value="closed">Frozen</option>
          </select>
          <button onClick={loadLedger} className="h-12 px-4 rounded-xl font-black text-xs uppercase text-white shrink-0" style={{ background: '#c8834a' }}>
            <Search className="w-4 h-4" />
          </button>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="py-24 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
          <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="font-bold text-slate-400">No wage runs match this search.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([scopeKey, groupRuns]) => (
            <div key={scopeKey} className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 pl-1" style={{ color: '#9a7a5a' }}>
                <Warehouse className="w-4 h-4" style={{ color: '#c8834a' }} /> {scopeKey}
                <span className="font-bold normal-case text-slate-400">({groupRuns.length} run{groupRuns.length !== 1 ? 's' : ''})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {groupRuns.map((run) => (
                  <SpotlightCard
                    key={run.run_id}
                    onClick={() => handleOpenRun(run)}
                    className="bg-white p-5 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border flex flex-col justify-between cursor-pointer group"
                    style={{ borderColor: 'rgba(200,131,74,0.15)' }}
                    spotlightColor="rgba(200,131,74,0.06)"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-[#faf6f0] p-2.5 rounded-xl border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        <Calendar className="w-5 h-5" style={{ color: '#c8834a' }} />
                      </div>
                      <StatusBadge status={run.status} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pay Cycle</p>
                    <h4 className="font-black text-sm" style={{ color: '#2d1f0e' }}>{run.period_start} <span className="opacity-40 px-1">to</span> {run.period_end}</h4>
                    <p
                      className="font-mono text-[9px] font-bold text-slate-300 mt-1 truncate"
                      title={run.run_id}
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(run.run_id || ''); }}
                    >
                      {run.run_id}
                    </p>
                    <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                      <div>
                        <p className="text-[10px] font-bold text-slate-400">Total</p>
                        <p className="font-black" style={{ color: '#10b981' }}><Money value={run.total_amount} /></p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#c8834a] group-hover:translate-x-1 transition-all" />
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RUN DETAIL MODAL: style / stage / employee / pieces ── */}
      {selectedRun && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-50 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] mx-4">
            <div className="p-6 sm:p-8 pb-4 bg-white relative shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>{selectedRun.scope_order_number || selectedRun.scope_style_code || 'Whole Factory'}</h3>
                  <div className="flex gap-3 mt-2 flex-wrap items-center">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">{selectedRun.period_start} to {selectedRun.period_end}</span>
                    <StatusBadge status={selectedRun.status} />
                    {/* Team asked "where do I get a run id" for Run Actions
                        (Recompute/Close/Reopen) — it was never shown
                        anywhere in the UI. Copyable here now. */}
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(selectedRun.run_id || ''); }}
                      title="Click to copy run id"
                      className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer"
                    >
                      {selectedRun.run_id}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleDownloadWorkbook} disabled={detailsLoading} title="Download as Excel — Per Style / Per Stage / Per Employee / Per Piece, one sheet each"
                    className="h-11 px-4 rounded-full font-black text-xs uppercase text-white flex items-center gap-2 disabled:opacity-40" style={{ background: '#c8834a' }}>
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button onClick={() => setSelectedRun(null)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <div className="flex gap-1 p-1 rounded-full bg-slate-100 w-fit">
                  {[
                    { id: 'style', label: 'Per Style' },
                    { id: 'stage', label: 'Per Stage' },
                    { id: 'employee', label: 'Per Employee' },
                    { id: 'pieces', label: 'Per Piece' },
                  ].map((t) => (
                    <button key={t.id} onClick={() => { setDetailTab(t.id); setDetailSearch(''); setPieceFilterStage(''); setPieceFilterEmployee(''); }} className={`px-4 py-2 rounded-full font-bold text-[11px] transition-all ${detailTab === t.id ? 'bg-white shadow-sm' : 'text-slate-500'}`} style={detailTab === t.id ? { color: '#c8834a' } : {}}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      placeholder={detailTab === 'pieces' ? 'Search piece code, employee…' : 'Search this tab…'}
                      className="h-9 pl-8 pr-3 w-48 sm:w-64 bg-slate-50 border rounded-full font-bold text-xs outline-none focus:border-[#c8834a]"
                      style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                    />
                  </div>
                  <button onClick={handleDownloadFiltered} disabled={detailsLoading} title="Download only what's shown in this tab right now"
                    className="h-9 px-3 rounded-full font-black text-[10px] uppercase bg-white border shadow-sm flex items-center gap-1.5 disabled:opacity-40" style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}>
                    <Download className="w-3.5 h-3.5" /> Download filtered
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              {detailsLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} /></div>
              ) : (
                <>
                  {detailTab === 'style' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredByStyle.map((s, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-black text-base text-slate-800">{s.style_name || s.style_code}</h5>
                              <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{s.pieces ?? 0} pieces</p>
                            </div>
                            <p className="font-black text-lg text-emerald-600"><Money value={s.amount} /></p>
                          </div>
                        </div>
                      ))}
                      {filteredByStyle.length === 0 && <p className="text-sm font-bold text-slate-400 col-span-full text-center py-6">{searchNorm ? 'No matches.' : 'No data.'}</p>}
                    </div>
                  )}

                  {detailTab === 'stage' && (
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="font-bold uppercase tracking-wider text-xs" style={{ color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.15)' }}>
                            <th className="py-3 px-4">Stage</th><th className="py-3 px-4">Pieces</th><th className="py-3 px-4">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredByStage.map((s, i) => (
                            <tr key={i}>
                              <td className="py-3 px-4 font-bold text-slate-800">{s.operation_label || s.operation_code}</td>
                              <td className="py-3 px-4 font-bold" style={{ color: '#c8834a' }}>{s.pieces ?? 0}</td>
                              <td className="py-3 px-4 font-black text-emerald-600"><Money value={s.amount} /></td>
                            </tr>
                          ))}
                          {filteredByStage.length === 0 && <tr><td colSpan="3" className="py-8 text-center text-slate-400 font-bold">{searchNorm ? 'No matches.' : 'No data.'}</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {detailTab === 'employee' && (
                    <div className="space-y-3">
                      {filteredByEmployee.map((e, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                          <div>
                            <h5 className="font-black text-base text-slate-800">{e.employee_name || 'Worker'}</h5>
                            <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{e.designation || 'Piece Rate'} · {e.pieces ?? 0} pieces</p>
                          </div>
                          <p className="font-black text-lg text-emerald-600"><Money value={e.amount} /></p>
                        </div>
                      ))}
                      {filteredByEmployee.length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-6">{searchNorm ? 'No matches.' : 'No data.'}</p>}
                    </div>
                  )}

                  {detailTab === 'pieces' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select value={pieceFilterStage} onChange={(e) => setPieceFilterStage(e.target.value)} className="h-9 px-3 bg-white border rounded-full font-bold text-xs outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#4a3a2a' }}>
                          <option value="">All Stages</option>
                          {pieceStageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                        <select value={pieceFilterEmployee} onChange={(e) => setPieceFilterEmployee(e.target.value)} className="h-9 px-3 bg-white border rounded-full font-bold text-xs outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#4a3a2a' }}>
                          <option value="">All Employees</option>
                          {pieceEmployeeOptions.map((e) => <option key={e} value={e}>{e}</option>)}
                        </select>
                        {(pieceFilterStage || pieceFilterEmployee) && (
                          <button onClick={() => { setPieceFilterStage(''); setPieceFilterEmployee(''); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Clear column filters</button>
                        )}
                      </div>
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="font-bold uppercase tracking-wider" style={{ color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.15)' }}>
                            <th className="py-3 px-3">Piece</th>
                            <th className="py-3 px-3">Stage</th>
                            <th className="py-3 px-3">Employee</th>
                            <th className="py-3 px-3 flex items-center gap-1"><BarcodeIcon className="w-3 h-3" /> Barcode</th>
                            <th className="py-3 px-3">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredPieces.map((p, i) => (
                            <tr key={i}>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{p.piece_code}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-500">{p.operation_label || p.operation_code}</td>
                              <td className="py-2.5 px-3 font-bold text-slate-700">{p.employee_name || '—'}</td>
                              <td className="py-2.5 px-3 font-mono text-slate-400">{p.employee_barcode || '—'}</td>
                              <td className="py-2.5 px-3 font-black text-emerald-600"><Money value={p.amount} /></td>
                            </tr>
                          ))}
                          {filteredPieces.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-slate-400 font-bold">{searchNorm ? 'No matches.' : 'No piece-level data.'}</td></tr>}
                        </tbody>
                      </table>
                    </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
