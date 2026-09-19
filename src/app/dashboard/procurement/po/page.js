'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft, ShoppingCart, Search, Plus, 
  Truck, CheckCircle2, Clock, AlertCircle,
  MoreHorizontal, Calendar, FileText, UserCheck,
  Building2, Phone, Mail, MapPin, Send, AlertTriangle,
  X, Check, ShieldCheck, Download, ExternalLink, RefreshCw, Loader2, Sparkles, Filter
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetPOs, apiGetSuppliers, apiGetProductionTracking,
  apiPatchPOItems, apiSubmitPO, apiApprovePO, apiRejectPO,
  apiSendPO, apiAcknowledgePO, apiTransitionTracking, IDS, MOCK_IDS
} from '../lib/api';
import { MOCK_SUPPLIERS } from '../lib/mockDataPack';

const COLUMNS = [
  { id: 'draft', title: 'Draft', icon: FileText, color: '#9a7a5a', bg: '#faf6f0', border: 'rgba(200,131,74,0.2)' },
  { id: 'pending_approval', title: 'Pending Approval', icon: Clock, color: '#d97706', bg: '#fffbeb', border: 'rgba(217,119,6,0.2)' },
  { id: 'approved', title: 'Approved', icon: ShieldCheck, color: '#059669', bg: '#ecfdf5', border: 'rgba(5,150,105,0.2)' },
  { id: 'sent', title: 'Sent to Supplier', icon: Truck, color: '#2563eb', bg: '#eff6ff', border: 'rgba(37,99,235,0.2)' },
  { id: 'confirmed', title: 'Confirmed / Active', icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.2)' },
  { id: 'rejected', title: 'Rejected', icon: AlertCircle, color: '#dc2626', bg: '#fef2f2', border: 'rgba(220,38,38,0.2)' },
];

export default function SupplierPOPage() {
  const { token } = useAuth();
  
  // Data States
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pos'); // 'pos' | 'needs_supplier' | 'suppliers' | 'board'
  
  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPo, setSelectedPo] = useState(null);
  const [assignModalPo, setAssignModalPo] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Load all PO & Supplier data
  const loadData = async () => {
    setLoading(true);
    try {
      const [poRes, supRes, trackRes] = await Promise.all([
        apiGetPOs(token),
        apiGetSuppliers(token),
        apiGetProductionTracking(token)
      ]);
      setPos(poRes.purchase_orders || []);
      const sups = Array.isArray(supRes) ? supRes : (supRes?.suppliers || []);
      setSuppliers(sups.length > 0 ? sups : (MOCK_SUPPLIERS || []));
      setTrackers(trackRes.trackers || []);
    } catch (err) {
      console.error('Failed to load PO data:', err);
      showToast('error', `Failed to load data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Drag and Drop Handlers for Kanban
  const [draggedPoId, setDraggedPoId] = useState(null);

  const handleDragStart = (e, id) => {
    setDraggedPoId(id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e, columnId) => {
    e.preventDefault();
    if (!draggedPoId) return;

    const targetPo = pos.find(p => p.id === draggedPoId);
    if (!targetPo) return;
    if (targetPo.status === columnId) return;

    setActionLoading(true);
    try {
      if (columnId === 'pending_approval') await apiSubmitPO(token, targetPo.id);
      else if (columnId === 'approved') await apiApprovePO(token, targetPo.id);
      else if (columnId === 'sent') await apiSendPO(token, targetPo.id);
      else if (columnId === 'confirmed') await apiAcknowledgePO(token, targetPo.id, { channel: 'drag_drop' });
      
      showToast('success', `PO status updated to ${columnId.replace('_', ' ')}`);
      await loadData();
    } catch (err) {
      showToast('error', `Update failed: ${err.message}`);
    } finally {
      setActionLoading(false);
      setDraggedPoId(null);
    }
  };

  // Action Handlers
  const handleAssignSupplier = async (poId, supplierId) => {
    setActionLoading(true);
    try {
      await apiPatchPOItems(token, poId, { supplier_id: supplierId });
      showToast('success', 'Supplier assigned successfully!');
      setAssignModalPo(null);
      if (selectedPo?.id === poId) {
        const updated = await apiGetPOs(token);
        const match = updated.purchase_orders?.find(p => p.id === poId);
        if (match) setSelectedPo(match);
      }
      await loadData();
    } catch (err) {
      showToast('error', `Assign failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (poId, action) => {
    setActionLoading(true);
    try {
      if (action === 'submit') await apiSubmitPO(token, poId);
      else if (action === 'approve') await apiApprovePO(token, poId);
      else if (action === 'reject') await apiRejectPO(token, poId, 'Rejected during MD review');
      else if (action === 'send') await apiSendPO(token, poId);
      else if (action === 'acknowledge') await apiAcknowledgePO(token, poId, { channel: 'manual' });

      showToast('success', `PO ${action} action completed!`);
      const updated = await apiGetPOs(token);
      setPos(updated.purchase_orders || []);
      if (selectedPo?.id === poId) {
        const match = updated.purchase_orders?.find(p => p.id === poId);
        if (match) setSelectedPo(match);
      }
    } catch (err) {
      showToast('error', `Action failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered PO lists
  const filteredPos = useMemo(() => {
    return pos.filter(po => {
      const q = searchQuery.toLowerCase();
      const supName = (po.supplier?.name || po.supplier_name || '').toLowerCase();
      const poNum = (po.po_number || po.id || '').toLowerCase();
      const ref = (po.buyer_ref || '').toLowerCase();
      return supName.includes(q) || poNum.includes(q) || ref.includes(q);
    });
  }, [pos, searchQuery]);

  const needsSupplierPos = useMemo(() => {
    return pos.filter(p => p.needs_supplier);
  }, [pos]);

  return (
    <div className="space-y-6 animate-fade-in flex flex-col min-h-[calc(100vh-8rem)]">

      {/* ─── TOAST ─── */}
      {toast && (
        <div className="fixed top-6 right-6 z-[999] max-w-sm animate-fade-in">
          <div className="flex items-start gap-3 p-4 rounded-2xl shadow-xl font-semibold text-sm"
            style={{
              background: toast.type === 'success' ? '#f0fdf4' : toast.type === 'error' ? '#fef2f2' : '#fff9f0',
              border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.25)' : toast.type === 'error' ? 'rgba(220,38,38,0.2)' : 'rgba(200,131,74,0.3)'}`,
              color: toast.type === 'success' ? '#166534' : toast.type === 'error' ? '#991b1b' : '#92400e',
            }}>
            {toast.type === 'success' ? <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
            <p>{toast.msg}</p>
          </div>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <div className="flex-shrink-0">
        <Link href="/dashboard/procurement/inventory" className="flex items-center gap-1.5 text-xs font-bold mb-3 w-fit transition-opacity hover:opacity-70" style={{ color: '#9a7a5a' }}>
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Inventory Check
        </Link>
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>
              Procurement · Stage 5 — Supplier PO Workflow
            </p>
            <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: '#2d1f0e' }}>
              <ShoppingCart className="w-8 h-8" style={{ color: '#c8834a' }} /> Purchase Orders & Suppliers
            </h1>
            <p className="font-medium mt-0.5" style={{ color: '#9a7a5a' }}>
              Auto-generated POs, supplier candidate matching, tax calculations, and routed approval workflows.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              className="p-2.5 rounded-xl bg-white border border-amber-200/60 text-[#2d1f0e] hover:bg-amber-50 transition-colors"
              title="Refresh POs"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#9a7a5a' }} />
              <input
                type="text"
                placeholder="Search POs or Suppliers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 pl-9 pr-4 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30 transition-all"
                style={{ background: '#ffffff', border: '1px solid rgba(200,131,74,0.15)', color: '#2d1f0e' }}
              />
            </div>
          </div>
        </div>

        {/* ─── TAB NAVIGATION ─── */}
        <div className="flex items-center gap-2 mt-6 border-b border-amber-900/10 pb-2">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
              activeTab === 'pos'
                ? 'bg-[#2d1f0e] text-white shadow-sm'
                : 'text-slate-600 hover:bg-amber-100/50'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> All Purchase Orders ({pos.length})
          </button>
          <button
            onClick={() => setActiveTab('needs_supplier')}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
              activeTab === 'needs_supplier'
                ? 'bg-[#dc2626] text-white shadow-sm'
                : 'text-red-700 bg-red-50 hover:bg-red-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" /> 🚨 Needs Supplier ({needsSupplierPos.length})
          </button>
          <button
            onClick={() => setActiveTab('suppliers')}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
              activeTab === 'suppliers'
                ? 'bg-[#2d1f0e] text-white shadow-sm'
                : 'text-slate-600 hover:bg-amber-100/50'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" /> Suppliers Directory ({suppliers.length})
          </button>
          <button
            onClick={() => setActiveTab('board')}
            className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
              activeTab === 'board'
                ? 'bg-[#2d1f0e] text-white shadow-sm'
                : 'text-slate-600 hover:bg-amber-100/50'
            }`}
          >
            <Truck className="w-3.5 h-3.5" /> Production Board ({trackers.length})
          </button>
        </div>
      </div>

      {/* ─── TAB 1: ALL POS (KANBAN BOARD) ─── */}
      {activeTab === 'pos' && (
        <div className="flex-1 overflow-x-auto overflow-y-hidden pb-4">
          <div className="flex gap-4 h-full min-w-max">
            {COLUMNS.map(col => {
              const columnPos = filteredPos.filter(po => po.status === col.id);
              const ColIcon = col.icon;
              
              return (
                <div 
                  key={col.id} 
                  className="w-[300px] flex flex-col rounded-3xl overflow-hidden transition-colors"
                  style={{ background: col.bg, border: `1px solid ${col.border}` }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, col.id)}
                >
                  {/* Column Header */}
                  <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: col.border }}>
                    <div className="flex items-center gap-2">
                      <ColIcon className="w-4 h-4" style={{ color: col.color }} />
                      <h3 className="font-black text-xs uppercase tracking-wide" style={{ color: col.color }}>{col.title}</h3>
                    </div>
                    <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black" style={{ background: 'white', color: col.color, boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                      {columnPos.length}
                    </span>
                  </div>

                  {/* Column Cards Container */}
                  <div className="flex-1 overflow-y-auto p-3 space-y-3 max-h-[calc(100vh-18rem)]">
                    {columnPos.map(po => {
                      const supName = po.supplier?.name || 'Unassigned Supplier';
                      const firstItem = po.items?.[0];
                      return (
                        <SpotlightCard 
                          key={po.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, po.id)}
                          onClick={() => setSelectedPo(po)}
                          className="p-4 bg-white rounded-2xl shadow-sm cursor-pointer hover:shadow-md transition-shadow relative group"
                          style={{ border: po.needs_supplier ? '1.5px solid #ef4444' : '1px solid rgba(200,131,74,0.1)' }}
                          spotlightColor="rgba(200,131,74,0.04)"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <span className="text-[10px] font-black font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                              {po.po_number || 'NO-PO-ID'}
                            </span>
                            {po.needs_supplier ? (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700 animate-pulse">
                                Needs Supplier
                              </span>
                            ) : (
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                                Rev {po.revision || 1}
                              </span>
                            )}
                          </div>
                          
                          <h4 className="font-black text-sm mb-1 line-clamp-1" style={{ color: '#2d1f0e' }} title={supName}>
                            {supName}
                          </h4>
                          <p className="text-xs font-semibold mb-3 line-clamp-1" style={{ color: '#9a7a5a' }}>
                            {firstItem ? `${firstItem.description} (${firstItem.qty} ${firstItem.uom})` : 'Line item'}
                          </p>

                          <div className="flex items-center justify-between text-[11px] font-black pt-3 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                            <div className="flex items-center gap-1.5" style={{ color: '#c8834a' }}>
                              <Calendar className="w-3.5 h-3.5" /> {po.buyer_ref || 'Ref'}
                            </div>
                            <span style={{ color: '#2d1f0e' }}>₹{po.total?.toLocaleString() || '0'}</span>
                          </div>

                          {po.needs_supplier && (
                            <button
                              onClick={(e) => { e.stopPropagation(); setAssignModalPo(po); }}
                              className="w-full mt-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-all"
                            >
                              <UserCheck className="w-3.5 h-3.5" /> Assign Supplier
                            </button>
                          )}
                        </SpotlightCard>
                      );
                    })}
                    
                    {columnPos.length === 0 && (
                      <div className="h-24 border-2 border-dashed rounded-2xl flex items-center justify-center text-xs font-bold" style={{ borderColor: col.border, color: col.color, opacity: 0.5 }}>
                        No POs in {col.title}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── TAB 2: NEEDS SUPPLIER (BLOCKING QUEUE) ─── */}
      {activeTab === 'needs_supplier' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
              <div>
                <h3 className="font-black text-sm text-red-900">Blocking PO Queue</h3>
                <p className="text-xs text-red-700 font-semibold">
                  These purchase orders have shortfalls but no matching supplier in the ledger. Select a supplier to unblock production.
                </p>
              </div>
            </div>
            <span className="px-3 py-1 bg-red-600 text-white font-black text-xs rounded-full">
              {needsSupplierPos.length} Pending
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {needsSupplierPos.map(po => (
              <SpotlightCard key={po.id} className="p-5 bg-white rounded-3xl shadow-md border border-red-200" spotlightColor="rgba(239,68,68,0.04)">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-800">
                      Unassigned PO · {po.buyer_ref}
                    </span>
                    <h3 className="text-lg font-black text-slate-900 mt-1">
                      {po.items?.[0]?.description || 'Required Material Shortfall'}
                    </h3>
                  </div>
                  <span className="text-lg font-black text-slate-900">₹{po.total?.toLocaleString()}</span>
                </div>

                <p className="text-xs text-slate-600 font-semibold mb-4">
                  Required Qty: <b className="text-slate-900">{po.items?.[0]?.qty} {po.items?.[0]?.uom}</b> · GST Mode: {po.gst_mode}
                </p>

                {/* Candidate Suggestions */}
                {po.candidates?.ranked && (
                  <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 mb-4 space-y-2">
                    <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-600" /> AI Matched Supplier Recommendations
                    </p>
                    {po.candidates.ranked.map((c, i) => (
                      <div key={c.supplier_id} className="flex items-center justify-between bg-white p-2 rounded-xl border border-amber-200 text-xs">
                        <div>
                          <p className="font-black text-slate-900">{c.supplier_name}</p>
                          <p className="text-[10px] text-slate-500 font-bold">
                            Score: {Math.round(c.score * 100)}% · Last Rate: ₹{c.last_rate} ({c.txn_count} txns)
                          </p>
                        </div>
                        <button
                          onClick={() => handleAssignSupplier(po.id, c.supplier_id)}
                          disabled={actionLoading}
                          className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-extrabold transition-all"
                        >
                          Select
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  onClick={() => setAssignModalPo(po)}
                  className="w-full py-2.5 bg-[#2d1f0e] hover:bg-[#3d2b1a] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
                >
                  <UserCheck className="w-4 h-4" /> Pick Custom Supplier from Directory
                </button>
              </SpotlightCard>
            ))}

            {needsSupplierPos.length === 0 && (
              <div className="col-span-2 text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500 font-bold">
                🎉 All Purchase Orders have assigned suppliers! No blocking items.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── TAB 3: SUPPLIERS DIRECTORY ─── */}
      {activeTab === 'suppliers' && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliers.map(s => (
            <SpotlightCard key={s.id} className="p-5 bg-white rounded-3xl shadow-sm border border-amber-900/10" spotlightColor="rgba(200,131,74,0.04)">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-amber-900">
                    {s.supplier_type || 'Supplier'}
                  </span>
                  <h3 className="text-base font-black text-slate-900 mt-1 line-clamp-1">{s.name}</h3>
                </div>
                {s.email_status === 'valid' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    Verified
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                    No Contact
                  </span>
                )}
              </div>

              <div className="space-y-1.5 text-xs text-slate-600 font-semibold mb-4">
                <p className="flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-slate-400" /> GSTIN: <b className="font-mono text-slate-800">{s.gstin}</b> (State {s.state_code})</p>
                <p className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {s.address || 'Chennai'}</p>
                <p className="flex items-center gap-2"><Phone className="w-3.5 h-3.5 text-slate-400" /> {s.phone || s.whatsapp_phone || 'No Phone'}</p>
                <p className="flex items-center gap-2"><Mail className="w-3.5 h-3.5 text-slate-400" /> {s.email || 'No Email'}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] font-bold text-slate-500">
                <span>Terms: {s.payment_terms_days} days</span>
                <span>Lead time: {s.lead_time_days} days</span>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}

      {/* ─── TAB 4: PRODUCTION BOARD TRACKERS ─── */}
      {activeTab === 'board' && (
        <div className="space-y-4">
          {trackers.map(t => (
            <SpotlightCard key={t.id} className="p-5 bg-white rounded-3xl shadow-sm border border-amber-900/10" spotlightColor="rgba(200,131,74,0.04)">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Order #{t.order_number} · Client: {t.client_name}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{t.style_name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-extrabold px-3 py-1 rounded-xl bg-slate-100 text-slate-700 uppercase">
                    Rung: {t.status.replace(/_/g, ' ')}
                  </span>
                  {t.status === 'material_ready' && (
                    <button
                      onClick={async () => {
                        await apiTransitionTracking(token, t.id, 'released_to_production');
                        showToast('success', 'Released to Phase 1 Production Logger!');
                        loadData();
                      }}
                      className="px-4 py-2 bg-[#2d1f0e] hover:bg-[#3d2b1a] text-white font-black text-xs rounded-xl transition-all"
                    >
                      Release to Production
                    </button>
                  )}
                </div>
              </div>
            </SpotlightCard>
          ))}
        </div>
      )}

      {/* ─── PO DETAIL MODAL ─── */}
      {selectedPo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 bg-[#faf6f0] border-b border-amber-900/10 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#c8834a]">
                  Purchase Order Details
                </span>
                <h2 className="text-2xl font-black text-[#2d1f0e]">
                  {selectedPo.po_number || 'Draft Order (Unassigned)'}
                </h2>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Buyer Ref: {selectedPo.buyer_ref} · Status: <b className="uppercase text-amber-800">{selectedPo.status}</b>
                </p>
              </div>
              <button onClick={() => setSelectedPo(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200/50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Supplier info box */}
              <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/60 flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider mb-1">Supplier Info</p>
                  <h4 className="font-black text-slate-900 text-sm">{selectedPo.supplier?.name || 'No Supplier Assigned'}</h4>
                  <p className="text-xs text-slate-600 font-semibold mt-1">
                    GSTIN: {selectedPo.supplier?.gstin || 'N/A'} · GST Mode: <b>{selectedPo.gst_mode}</b>
                  </p>
                  <p className="text-xs text-slate-500 font-semibold">Address: {selectedPo.supplier?.address || 'Chennai'}</p>
                </div>
                {selectedPo.needs_supplier && (
                  <button
                    onClick={() => { const po = selectedPo; setSelectedPo(null); setAssignModalPo(po); }}
                    className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-extrabold"
                  >
                    Assign Supplier
                  </button>
                )}
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-black uppercase text-slate-500 mb-2">Order Line Items</h4>
                <div className="border border-slate-200 rounded-2xl overflow-hidden">
                  <table className="w-full text-xs text-left font-semibold">
                    <thead className="bg-slate-50 text-slate-700 font-black uppercase">
                      <tr>
                        <th className="p-3">#</th>
                        <th className="p-3">Description</th>
                        <th className="p-3">Color</th>
                        <th className="p-3">Qty</th>
                        <th className="p-3">Rate</th>
                        <th className="p-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPo.items?.map((item, idx) => (
                        <tr key={item.id || idx}>
                          <td className="p-3 text-slate-400 font-mono">{idx + 1}</td>
                          <td className="p-3 font-bold text-slate-900">{item.description}</td>
                          <td className="p-3 text-slate-600">{item.color || '-'}</td>
                          <td className="p-3 font-mono">{item.qty} {item.uom}</td>
                          <td className="p-3 font-mono">₹{item.unit_price}</td>
                          <td className="p-3 text-right font-black text-slate-900">₹{item.amount}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Calculation Breakdown */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs font-semibold">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono font-bold text-slate-900">₹{selectedPo.subtotal}</span>
                </div>
                {selectedPo.gst_mode === 'INTRA' ? (
                  <>
                    <div className="flex justify-between text-slate-600">
                      <span>CGST (6%):</span>
                      <span className="font-mono text-slate-900">₹{selectedPo.cgst}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>SGST (6%):</span>
                      <span className="font-mono text-slate-900">₹{selectedPo.sgst}</span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-slate-600">
                    <span>IGST (12%):</span>
                    <span className="font-mono text-slate-900">₹{selectedPo.igst}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>Round Off:</span>
                  <span className="font-mono text-slate-900">₹{selectedPo.round_off}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between text-sm font-black text-slate-950">
                  <span>Grand Total (INR):</span>
                  <span className="font-mono text-emerald-700">₹{selectedPo.total?.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-6 bg-slate-50 border-t border-slate-200 flex flex-wrap gap-2 justify-between">
              <button
                onClick={() => alert(`Exporting PO ${selectedPo.po_number || selectedPo.id} as PDF document...`)}
                className="px-4 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-slate-100"
              >
                <Download className="w-3.5 h-3.5" /> PDF Preview
              </button>

              <div className="flex gap-2">
                {selectedPo.status === 'draft' && (
                  <button
                    onClick={() => handleStatusChange(selectedPo.id, 'submit')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-black text-xs rounded-xl"
                  >
                    Submit for Approval
                  </button>
                )}
                {selectedPo.status === 'pending_approval' && (
                  <>
                    <button
                      onClick={() => handleStatusChange(selectedPo.id, 'reject')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-black text-xs rounded-xl"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleStatusChange(selectedPo.id, 'approve')}
                      disabled={actionLoading}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl"
                    >
                      Approve PO
                    </button>
                  </>
                )}
                {selectedPo.status === 'approved' && (
                  <button
                    onClick={() => handleStatusChange(selectedPo.id, 'send')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-black text-xs rounded-xl flex items-center gap-1"
                  >
                    <Send className="w-3.5 h-3.5" /> Dispatch to Supplier
                  </button>
                )}
                {selectedPo.status === 'sent' && (
                  <button
                    onClick={() => handleStatusChange(selectedPo.id, 'acknowledge')}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs rounded-xl"
                  >
                    Manual Acknowledge
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── ASSIGN SUPPLIER PICKER MODAL ─── */}
      {assignModalPo && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
            <div className="p-6 bg-[#faf6f0] border-b border-amber-900/10 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-slate-900">Select Supplier</h3>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Assign a registered supplier to unblock item shortfall
                </p>
              </div>
              <button onClick={() => setAssignModalPo(null)} className="p-2 rounded-xl text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
              {suppliers.map(sup => (
                <div key={sup.id} className="p-4 rounded-2xl border border-slate-200 hover:border-amber-500 bg-white flex justify-between items-center transition-all">
                  <div>
                    <h4 className="font-black text-sm text-slate-900">{sup.name}</h4>
                    <p className="text-xs text-slate-500 font-semibold">{sup.service} · GSTIN: {sup.gstin}</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">Lead time: {sup.lead_time_days} days · Terms: {sup.payment_terms_days} days</p>
                  </div>
                  <button
                    onClick={() => handleAssignSupplier(assignModalPo.id, sup.id)}
                    disabled={actionLoading}
                    className="px-4 py-2 bg-[#2d1f0e] hover:bg-[#3d2b1a] text-white font-black text-xs rounded-xl"
                  >
                    Select
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
