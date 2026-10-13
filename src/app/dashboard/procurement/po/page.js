'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ShoppingCart,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  Building2,
  AlertTriangle,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetPOs,
  apiGetSuppliers,
  apiGetProductionTracking,
  apiPatchPOItems,
  apiSubmitPO,
  apiApprovePO,
  apiRejectPO,
  apiSendPO,
  apiAcknowledgePO,
} from '../lib/api';

import PoKanbanBoard from './components/PoKanbanBoard';
import NeedsSupplierTab from './components/NeedsSupplierTab';
import SuppliersDirectoryTab from './components/SuppliersDirectoryTab';
import ProductionTrackersTab from './components/ProductionTrackersTab';
import PoDetailModal from './components/PoDetailModal';
import AssignSupplierModal from './components/AssignSupplierModal';

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
  const loadData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [poRes, supRes, trackRes] = await Promise.all([
        apiGetPOs(token),
        apiGetSuppliers(token),
        apiGetProductionTracking(token)
      ]);
      setPos(poRes?.purchase_orders || (Array.isArray(poRes) ? poRes : []));
      const sups = Array.isArray(supRes) ? supRes : (supRes?.suppliers || supRes?.items || []);
      setSuppliers(sups);
      setTrackers(trackRes?.trackers || (Array.isArray(trackRes) ? trackRes : []));
    } catch (err) {
      console.error('Failed to load PO data:', err);
      showToast('error', `Failed to load data: ${err.message}`);
    } finally {
      if (!silent) setLoading(false);
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

    // Optimistic UI update to prevent lag/loading screen
    setPos(prev => prev.map(p => p.id === draggedPoId ? { ...p, status: columnId } : p));
    const movedId = draggedPoId;
    setDraggedPoId(null);

    setActionLoading(true);
    try {
      if (columnId === 'pending_approval') await apiSubmitPO(token, movedId);
      else if (columnId === 'approved') await apiApprovePO(token, movedId);
      else if (columnId === 'sent') await apiSendPO(token, movedId);
      else if (columnId === 'confirmed') await apiAcknowledgePO(token, movedId, { channel: 'drag_drop' });
      
      showToast('success', `PO status updated to ${columnId.replace('_', ' ')}`);
      await loadData(true); // silent refresh
    } catch (err) {
      showToast('error', `Update failed: ${err.message}`);
      await loadData(true); // revert on failure
    } finally {
      setActionLoading(false);
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
        <div className="flex flex-col md:flex-row md:items-start md:justify-end gap-4">
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
        <PoKanbanBoard
          COLUMNS={COLUMNS}
          filteredPos={filteredPos}
          handleDragOver={handleDragOver}
          handleDrop={handleDrop}
          handleDragStart={handleDragStart}
          setSelectedPo={setSelectedPo}
          setAssignModalPo={setAssignModalPo}
        />
      )}

      {/* ─── TAB 2: NEEDS SUPPLIER (BLOCKING QUEUE) ─── */}
      {activeTab === 'needs_supplier' && (
        <NeedsSupplierTab
          needsSupplierPos={needsSupplierPos}
          handleAssignSupplier={handleAssignSupplier}
          actionLoading={actionLoading}
          setAssignModalPo={setAssignModalPo}
        />
      )}

      {/* ─── TAB 3: SUPPLIERS DIRECTORY ─── */}
      {activeTab === 'suppliers' && (
        <SuppliersDirectoryTab suppliers={suppliers} />
      )}

      {/* ─── TAB 4: PRODUCTION BOARD TRACKERS ─── */}
      {activeTab === 'board' && (
        <ProductionTrackersTab
          trackers={trackers}
          token={token}
          showToast={showToast}
          loadData={loadData}
        />
      )}

      {/* ─── PO DETAIL MODAL ─── */}
      <PoDetailModal
        selectedPo={selectedPo}
        setSelectedPo={setSelectedPo}
        setAssignModalPo={setAssignModalPo}
        handleStatusChange={handleStatusChange}
        actionLoading={actionLoading}
        setActionLoading={setActionLoading}
        showToast={showToast}
        loadData={loadData}
      />

      {/* ─── ASSIGN SUPPLIER PICKER MODAL ─── */}
      <AssignSupplierModal
        assignModalPo={assignModalPo}
        setAssignModalPo={setAssignModalPo}
        suppliers={suppliers}
        handleAssignSupplier={handleAssignSupplier}
        actionLoading={actionLoading}
      />

    </div>
  );
}
