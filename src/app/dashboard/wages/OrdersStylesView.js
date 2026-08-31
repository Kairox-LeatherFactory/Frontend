// wages page piece_rates code
'use client';
import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  apiGetWageOrders, apiGetWageStyles, apiGetRateSheet, apiGetRateHistory,
  apiSetWageRateSingle, apiSetWageRatesBulk,
} from '@/lib/api';
import { Loader2, Save, History, X, Search, Briefcase, Filter, Warehouse } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { Toast } from './shared';
export default function OrdersStylesView({ token }) {
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
                      onWheel={(e) => e.target.blur()}
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
