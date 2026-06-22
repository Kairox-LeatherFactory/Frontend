'use client';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, Edit3, Save, X,
  Loader2, AlertCircle, Package, Download, Info
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiGetBom, apiPatchBomItems, apiExportBom } from '@/lib/api';

const STATUS_CONFIG = {
  approved: { label: 'BOM Approved', color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.2)' },
  draft: { label: 'Draft / Review', color: '#c8834a', bg: '#fff9f0', border: 'rgba(200,131,74,0.3)' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', border: 'rgba(220,38,38,0.2)' },
  exported: { label: 'Exported (PDF)', color: '#2563eb', bg: '#eff6ff', border: 'rgba(37,99,235,0.2)' },
};

const CATEGORIES = ['All', 'main_material', 'sub_material', 'lining', 'accessory', 'thread', 'manufacturing'];

export default function BOMReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const isCuttingMgr = user === 'cutting_manager' || user === 'direct_manager';

  const [bomData, setBomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Editing
  const [editingId, setEditingId] = useState(null);
  const [editBuf, setEditBuf] = useState({});
  const [saving, setSaving] = useState(false);
  
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch BOM on mount
  useEffect(() => {
    async function fetchBom() {
      try {
        setLoading(true);
        if (!token) throw new Error('No authentication token found.');
        const data = await apiGetBom(token, id);
        setBomData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchBom();
  }, [id]);

  const filteredItems = useMemo(() => {
    if (!bomData?.items) return [];
    if (categoryFilter === 'All') return bomData.items;
    return bomData.items.filter(i => i.category === categoryFilter);
  }, [bomData, categoryFilter]);

  // 2. Inline Edit Action
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditBuf({ qty_per_garment: item.qty_per_garment, unit_price: item.unit_price });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuf({});
  };

  const saveEdit = async () => {
    setSaving(true);
    try {
      const edits = [];
      if (editBuf.qty_per_garment) edits.push({ bom_item_id: editingId, field: 'qty_per_garment', value: Number(editBuf.qty_per_garment) });
      if (editBuf.unit_price) edits.push({ bom_item_id: editingId, field: 'unit_price', value: Number(editBuf.unit_price) });

      const res = await apiPatchBomItems(token, bomData.id, bomData.revision, edits);
      
      // Update local BOM with new revision and recomputed tree
      setBomData({ ...res.recomputed, revision: res.revision });
      
      setEditingId(null);
      setEditBuf({});
      showToast('success', 'BOM item updated successfully');
    } catch (e) {
      if (e.message === 'stale_revision') {
        showToast('error', 'Another user modified this BOM. Please refresh.');
      } else {
        showToast('error', e.message || 'Failed to save changes');
      }
    } finally {
      setSaving(false);
    }
  };

  // 3. Export BOM to PDF
  const handleExport = async () => {
    setExporting(true);
    try {
      if (!token) throw new Error('No authentication token found.');
      const res = await apiExportBom(token, bomData.id);
      showToast('success', 'BOM exported successfully as PDF!');
      // Update local state to reflect exported status
      setBomData(prev => ({ ...prev, status: 'exported', export_document_id: res.export_document_id }));
    } catch (err) {
      showToast('error', err.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
        <p className="mt-4 text-sm font-bold" style={{ color: '#9a7a5a' }}>Loading Bill of Materials...</p>
      </div>
    );
  }

  if (error || !bomData) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="font-black text-lg text-red-800">Failed to load BOM</h3>
        <p className="text-sm font-semibold text-red-600 mt-2">{error}</p>
        <button onClick={() => router.back()} className="mt-6 px-6 py-2 rounded-xl text-sm font-black bg-red-100 text-red-800">
          Go Back
        </button>
      </div>
    );
  }

  const conf = STATUS_CONFIG[bomData.status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <SpotlightCard className="px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3"
            style={{ background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}` }}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <p className="text-sm font-black" style={{ color: toast.type === 'success' ? '#14532d' : '#991b1b' }}>{toast.msg}</p>
          </SpotlightCard>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-3 hover:opacity-70 transition-opacity" style={{ color: '#c8834a' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Submissions
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
              BOM Sheet <span className="text-xl font-medium" style={{ color: '#9a7a5a' }}>#{bomData.id.split('-')[0]}</span>
            </h1>
            <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg" style={{ background: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}>
              {conf.label}
            </span>
          </div>
          <p className="text-sm font-bold mt-2 flex gap-4" style={{ color: '#9a7a5a' }}>
            <span>Order Qty: {bomData.order_qty} pcs</span>
            <span>Total Cost: {bomData.currency} {bomData.bulk_total?.toFixed(2)}</span>
            <span>Revision: v{bomData.revision}</span>
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 md:flex-none px-6 h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </button>
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.15)' }}>
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#c8834a' }} />
        <p className="text-[11px] font-semibold" style={{ color: '#9a7a5a' }}>
          This is the generated Bill of Materials sheet. Managers can click the pencil icon to edit line items. All changes are saved to the backend and the total cost is recomputed instantly.
        </p>
      </div>

      {/* FILTER TABS */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
              ${categoryFilter === cat ? 'shadow-md scale-105' : 'hover:bg-opacity-50'}
            `}
            style={{
              background: categoryFilter === cat ? 'linear-gradient(135deg, #c8834a, #e8a06a)' : '#faf6f0',
              color: categoryFilter === cat ? '#ffffff' : '#9a7a5a',
            }}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* BOM TABLE (EXCEL-LIKE) */}
      <SpotlightCard className="bg-white rounded-3xl shadow-xl overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.04)">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: '#faf6f0', color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.1)' }}>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Category</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Material Name</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Qty/Garment</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Bulk Qty</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Unit Price</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Total Cost</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, i) => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} className="transition-colors group hover:bg-opacity-50" style={{ background: i % 2 === 0 ? '#ffffff' : '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.05)' }}>
                    
                    <td className="p-4">
                      <span className="px-2 py-1 bg-white text-[10px] font-black uppercase tracking-wider rounded-lg text-gray-600 border border-gray-200 shadow-sm">
                        {item.category.replace('_', ' ')}
                      </span>
                    </td>
                    
                    <td className="p-4">
                      <p className="text-xs font-black text-gray-900">{item.name}</p>
                      <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{item.material_color}</p>
                    </td>

                    <td className="p-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={editBuf.qty_per_garment}
                            onChange={(e) => setEditBuf({ ...editBuf, qty_per_garment: e.target.value })}
                            className="w-20 text-right text-xs font-bold p-1 rounded border outline-none focus:ring-1 focus:ring-orange-400"
                            style={{ border: '1px solid rgba(200,131,74,0.3)', color: '#2d1f0e' }}
                          />
                          <span className="text-[10px] font-black text-gray-400">{item.uom}</span>
                        </div>
                      ) : (
                        <p className="text-xs font-black text-gray-900">{item.qty_per_garment} <span className="text-[10px] text-gray-400">{item.uom}</span></p>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <p className="text-xs font-bold text-gray-500">{item.bulk_qty?.toFixed(1)} {item.uom}</p>
                    </td>

                    <td className="p-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] font-black text-gray-400">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editBuf.unit_price}
                            onChange={(e) => setEditBuf({ ...editBuf, unit_price: e.target.value })}
                            className="w-20 text-right text-xs font-bold p-1 rounded border outline-none focus:ring-1 focus:ring-orange-400"
                            style={{ border: '1px solid rgba(200,131,74,0.3)', color: '#2d1f0e' }}
                          />
                        </div>
                      ) : (
                        <p className="text-xs font-black text-gray-900">₹{item.unit_price?.toFixed(2)}</p>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <p className="text-xs font-black" style={{ color: '#c8834a' }}>₹{item.total_cost?.toFixed(2)}</p>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} disabled={saving} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            </button>
                            <button onClick={cancelEdit} disabled={saving} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            disabled={!isCuttingMgr}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#c8834a] hover:bg-[#fff9f0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isCuttingMgr ? "Edit line" : "You do not have permission to edit"}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs font-bold text-gray-400">
                    No items found for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}
