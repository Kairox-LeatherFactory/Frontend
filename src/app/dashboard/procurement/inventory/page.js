'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, AlertTriangle, CheckCircle2,
  AlertCircle, ShoppingCart, TrendingDown, Warehouse,
  ArrowRight, ChevronDown, ChevronUp, FileSpreadsheet,
  Loader2, X, Upload, Search, RefreshCw, Layers
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiInventoryPreview, apiInventoryCommit,
  apiGetInventoryCheck, apiRunInventoryCheck, apiGetInventoryItems, apiGeneratePOs, IDS
} from '../lib/api';

function InventoryPreviewViewer({ data }) {
  const [showDropped, setShowDropped] = useState(false);
  const [showKept, setShowKept] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  if (!data) return null;

  if (data.raw_count !== undefined || data.kept !== undefined || data.dropped !== undefined || data.rows !== undefined) {
    const dropped = Array.isArray(data.dropped) ? data.dropped : [];
    const keptRows = Array.isArray(data.rows) ? data.rows : [];
    const warnings = Array.isArray(data.warnings) ? data.warnings : [];
    
    const droppedCount = dropped.length;
    const keptCount = keptRows.length > 0 ? keptRows.length : (data.kept ?? 0);
    const rawCount = data.raw_count ?? (droppedCount + keptCount);
    const keptPct = rawCount > 0 ? Math.round((keptCount / rawCount) * 100) : 0;
    
    const formatHeader = (key) => key.replace(/_/g, ' ').toUpperCase();

    return (
      <div className="space-y-5">
        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-slate-800">{rawCount.toLocaleString()}</p>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-1">Total Rows</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-emerald-700">{keptCount.toLocaleString()}</p>
            <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider mt-1">✓ Kept ({keptPct}%)</p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center shadow-sm">
            <p className="text-2xl font-black text-amber-700">{droppedCount.toLocaleString()}</p>
            <p className="text-xs font-bold text-amber-600 uppercase tracking-wider mt-1">⚠ Dropped</p>
          </div>
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-xs font-bold text-slate-500 mb-1">
            <span>Import Coverage</span>
            <span>{keptPct}% stock rows</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${keptPct}%` }} />
          </div>
        </div>

        {/* Dropped Rows Toggle */}
        {droppedCount > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowDropped(v => !v)}
              className="flex items-center gap-2 text-xs font-black text-amber-700 bg-amber-50 border border-amber-200 px-4 py-2 rounded-lg hover:bg-amber-100 transition-colors cursor-pointer"
            >
              {showDropped ? '▲ Hide' : '▼ Show'} {droppedCount} Dropped Rows (non-stock / empty)
            </button>

            {showDropped && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 max-h-64 overflow-y-auto">
                <table className="min-w-full text-left text-xs bg-white">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-2 border-b border-slate-200 w-16">Row #</th>
                      <th className="px-4 py-2 border-b border-slate-200">Description</th>
                      <th className="px-4 py-2 border-b border-slate-200 w-32">Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {dropped.map((d, i) => (
                      <tr key={i} className="hover:bg-amber-50">
                        <td className="px-4 py-1.5 text-slate-400 font-mono">{d.row}</td>
                        <td className="px-4 py-1.5 text-slate-600 truncate max-w-xs" title={d.description}>{d.description}</td>
                        <td className="px-4 py-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            {d.reason}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Kept Rows Toggle */}
        {keptRows.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowKept(v => !v)}
              className="flex items-center gap-2 text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              {showKept ? '▲ Hide' : '▼ Show'} {keptRows.length} Kept Rows (valid stock items)
            </button>

            {showKept && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 max-h-64 overflow-y-auto shadow-sm">
                <table className="min-w-full text-left text-xs bg-white">
                  <thead className="bg-slate-100 text-slate-900 font-extrabold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      {Object.keys(keptRows[0] || {}).map(k => (
                        <th key={k} className="px-4 py-2 border-b border-slate-300 whitespace-nowrap text-slate-800">
                          {formatHeader(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {keptRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-100 transition-colors">
                        {Object.keys(keptRows[0] || {}).map(k => (
                          <td key={k} className="px-4 py-1.5 text-slate-900 font-semibold whitespace-nowrap">
                            {k === 'qty_on_hand' || k === 'quantity' || k === 'qty' ? (
                              <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                                {row[k] !== null && row[k] !== undefined ? Number(row[k]).toLocaleString() : '-'}
                              </span>
                            ) : k === 'rate' || k === 'unit_price' || k === 'price' ? (
                              <span className="font-extrabold text-slate-900">
                                {row[k] ? `₹${Number(row[k]).toFixed(2)}` : '-'}
                              </span>
                            ) : k === 'normalized_key' ? (
                              <span className="font-mono text-[10px] text-slate-700 font-bold">
                                {String(row[k] ?? '-')}
                              </span>
                            ) : (
                              <span className="truncate max-w-[200px] block font-semibold text-slate-900" title={String(row[k] ?? '-')}>
                                {String(row[k] ?? '-')}
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Warnings Toggle */}
        {warnings.length > 0 && (
          <div>
            <button
              type="button"
              onClick={() => setShowWarnings(v => !v)}
              className="flex items-center gap-2 text-xs font-black text-blue-700 bg-blue-50 border border-blue-200 px-4 py-2 rounded-lg hover:bg-blue-100 transition-colors cursor-pointer"
            >
              {showWarnings ? '▲ Hide' : '▼ Show'} {warnings.length} Warnings
            </button>

            {showWarnings && (
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200 max-h-64 overflow-y-auto shadow-sm">
                <table className="min-w-full text-left text-xs bg-white">
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider sticky top-0">
                    <tr>
                      <th className="px-4 py-2 border-b border-slate-200">Warning Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {warnings.map((w, i) => (
                      <tr key={i} className="hover:bg-blue-50">
                        <td className="px-4 py-2 text-slate-700">{String(w)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">
      {JSON.stringify(data, null, 2)}
    </div>
  );
}

const STATUS_BADGE = {
  sufficient: { label: 'Sufficient', color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.2)', icon: CheckCircle2 },
  partial: { label: 'Partial Stock', color: '#d97706', bg: '#fffbeb', border: 'rgba(217,119,6,0.2)', icon: AlertTriangle },
  out_of_stock: { label: 'Out of Stock', color: '#dc2626', bg: '#fef2f2', border: 'rgba(220,38,38,0.2)', icon: AlertCircle },
};

function StockBadge({ status }) {
  const cfg = STATUS_BADGE[status] || STATUS_BADGE.out_of_stock;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const { token } = useAuth();

  // Active Tab: 'check' | 'master'
  const [activeTab, setActiveTab] = useState('check');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Stage 4 Data States
  const [inventoryCheck, setInventoryCheck] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genLoading, setGenLoading] = useState(false);

  // ─── Excel Upload States ───
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [commitSuccess, setCommitSuccess] = useState('');
  const fileInputRef = useRef(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [checkRes, itemsRes] = await Promise.all([
        apiRunInventoryCheck(token, IDS.bom_clermont),
        apiGetInventoryItems(token)
      ]);
      setInventoryCheck(checkRes);
      setInventoryItems(itemsRes.items || []);
    } catch (err) {
      console.error('Failed to load inventory check:', err);
      showToast('error', `Failed to load inventory: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setFileName(file.name);
    setSelectedFile(file);
    setUploadError('');
    setCommitSuccess('');
    setUploadLoading(true);

    try {
      const data = await apiInventoryPreview(token, file);
      setPreviewData(data);
      setShowPreviewModal(true);
    } catch (err) {
      setUploadError(`Preview failed: ${err.message}`);
    } finally {
      setUploadLoading(false);
      e.target.value = null;
    }
  };

  const handleCommit = async () => {
    if (!selectedFile) return;
    setCommitLoading(true);
    setUploadError('');
    try {
      await apiInventoryCommit(token, selectedFile);
      setCommitSuccess('Import committed successfully! Data saved to database.');
      showToast('success', 'Import committed successfully!');
      setShowPreviewModal(false);
      await loadData();
    } catch (err) {
      setUploadError(`Commit failed: ${err.message}`);
    } finally {
      setCommitLoading(false);
    }
  };

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const handleGeneratePOs = async () => {
    setGenLoading(true);
    try {
      await apiGeneratePOs(token, IDS.bom_clermont);
      showToast('success', 'Generated Supplier Purchase Orders successfully!');
      setTimeout(() => router.push('/dashboard/procurement/po'), 1000);
    } catch (err) {
      showToast('error', `PO Generation failed: ${err.message}`);
    } finally {
      setGenLoading(false);
    }
  };

  // Filtered Stock Master Items
  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const q = searchQuery.toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const key = (item.normalized_key || '').toLowerCase();
      const color = (item.color || '').toLowerCase();
      return desc.includes(q) || key.includes(q) || color.includes(q);
    });
  }, [inventoryItems, searchQuery]);

  return (
    <div className="space-y-6 animate-fade-in">

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
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/procurement" className="flex items-center gap-1.5 text-xs font-bold mb-3 w-fit transition-opacity hover:opacity-70" style={{ color: '#9a7a5a' }}>
            <ArrowLeft className="w-3.5 h-3.5" /> All Submissions
          </Link>
          <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>
            Procurement · Stage 4 — Inventory Check & Master
          </p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Stock vs. Demand Engine</h1>
          <p className="font-medium mt-0.5" style={{ color: '#9a7a5a' }}>
            Calculate BOM shortfalls against stock on hand. Generate Purchase Orders for missing raw materials.
          </p>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={loadData}
            className="p-2.5 rounded-xl bg-white border border-amber-200/60 text-[#2d1f0e] hover:bg-amber-50 transition-colors"
            title="Refresh Stock Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileUpload}
            className="hidden"
            id="inventory-file-upload"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
            className="h-11 py-0 px-4 flex items-center gap-2 font-bold text-xs rounded-xl transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'transparent',
              border: '1px solid #c8834a',
              color: '#c8834a'
            }}
          >
            {uploadLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Previewing...</>
            ) : (
              <><FileSpreadsheet className="w-4 h-4" /> Upload Excel Spreadsheet</>
            )}
          </button>
        </div>
      </div>

      {/* ─── TAB BAR ─── */}
      <div className="flex items-center gap-2 border-b border-amber-900/10 pb-2">
        <button
          onClick={() => setActiveTab('check')}
          className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
            activeTab === 'check'
              ? 'bg-[#2d1f0e] text-white shadow-sm'
              : 'text-slate-600 hover:bg-amber-100/50'
          }`}
        >
          <Warehouse className="w-3.5 h-3.5" /> Stock vs. Demand Check
        </button>
        <button
          onClick={() => setActiveTab('master')}
          className={`px-4 py-2 rounded-xl font-black text-xs flex items-center gap-2 transition-all ${
            activeTab === 'master'
              ? 'bg-[#2d1f0e] text-white shadow-sm'
              : 'text-slate-600 hover:bg-amber-100/50'
          }`}
        >
          <Package className="w-3.5 h-3.5" /> Stock Master Directory ({inventoryItems.length})
        </button>
      </div>

      {/* ─── TAB 1: STOCK VS DEMAND CHECK ─── */}
      {activeTab === 'check' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total BOM Lines', value: inventoryCheck?.summary?.lines_total || 6, icon: Package, color: '#9a7a5a' },
              { label: 'Sufficient Stock', value: inventoryCheck?.summary?.sufficient || 3, icon: CheckCircle2, color: '#16a34a' },
              { label: 'Partial Stock', value: inventoryCheck?.summary?.partial || 1, icon: TrendingDown, color: '#d97706' },
              { label: 'Out of Stock', value: inventoryCheck?.summary?.out_of_stock || 2, icon: AlertCircle, color: '#dc2626' },
            ].map(({ label, value, icon: Icon, color }) => (
              <SpotlightCard key={label} className="p-4 bg-white rounded-2xl shadow-sm border border-amber-900/10" spotlightColor="rgba(200,131,74,0.05)">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" style={{ color }} />
                  <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>{label}</p>
                </div>
                <p className="text-2xl font-black" style={{ color }}>{value}</p>
              </SpotlightCard>
            ))}
          </div>

          {/* BOM Stock Check Card */}
          <SpotlightCard className="bg-white rounded-3xl shadow-xl overflow-hidden border border-amber-900/15" spotlightColor="rgba(200,131,74,0.04)">
            <div className="p-5 border-b border-amber-900/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#faf6f0]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-200/60 text-amber-900">
                    BOGGI MILANO · #BOG-SS27-001
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-700">
                    Badge: {inventoryCheck?.summary?.badge || 'out_of_stock'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#2d1f0e] mt-1">CLERMONT BOM Inventory Audit</h3>
                <p className="text-xs text-slate-500 font-semibold">
                  Total Shortfall Value: <b className="text-red-700">₹{inventoryCheck?.summary?.shortfall_value?.toLocaleString() || '1,247.60'} INR</b>
                </p>
              </div>

              <button
                onClick={handleGeneratePOs}
                disabled={genLoading}
                className="h-10 px-5 rounded-xl font-black text-xs text-white flex items-center gap-2 transition-all hover:shadow-lg active:scale-95 disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
              >
                {genLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Generating POs...</>
                ) : (
                  <><ShoppingCart className="w-4 h-4" /> Auto-Generate Supplier POs <ArrowRight className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {/* Inventory Line Items Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold">
                <thead>
                  <tr className="font-black uppercase tracking-wider bg-[#faf6f0] text-slate-600 border-b border-amber-900/10">
                    <th className="p-3.5 pl-6">Category / Material</th>
                    <th className="p-3.5">Color</th>
                    <th className="p-3.5">Required</th>
                    <th className="p-3.5">Available (Stock)</th>
                    <th className="p-3.5">Reserved</th>
                    <th className="p-3.5">Shortfall Qty</th>
                    <th className="p-3.5">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {inventoryCheck?.lines?.map((line) => (
                    <tr key={line.bom_item_id} className="hover:bg-amber-50/30 transition-colors">
                      <td className="p-3.5 pl-6">
                        <p className="font-black text-[#2d1f0e]">{line.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">{line.category}</p>
                      </td>
                      <td className="p-3.5 text-slate-600">{line.material_color || 'BLACK'}</td>
                      <td className="p-3.5 font-mono font-bold text-slate-900">{line.required_qty} {line.uom}</td>
                      <td className="p-3.5 font-mono text-slate-700">{line.available_qty} {line.uom}</td>
                      <td className="p-3.5 font-mono text-slate-700">{line.reserved_for_this_bom} {line.uom}</td>
                      <td className="p-3.5 font-mono font-black" style={{ color: line.shortfall_qty > 0 ? '#dc2626' : '#16a34a' }}>
                        {line.shortfall_qty > 0 ? `−${line.shortfall_qty} ${line.uom}` : '✓ 0'}
                      </td>
                      <td className="p-3.5">
                        <StockBadge status={line.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Excluded Non-Material Charges */}
            {inventoryCheck?.excluded && (
              <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs font-semibold text-slate-600">
                <p className="font-black uppercase text-[10px] text-slate-400 mb-1">Excluded Non-Material Items</p>
                <div className="flex gap-4">
                  {inventoryCheck.excluded.map(ex => (
                    <span key={ex.bom_item_id} className="px-2 py-1 rounded bg-slate-200 text-slate-700 font-mono text-[10px]">
                      {ex.name} ({ex.category})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </SpotlightCard>
        </div>
      )}

      {/* ─── TAB 2: STOCK MASTER DIRECTORY ─── */}
      {activeTab === 'master' && (
        <div className="space-y-4">
          {/* Search bar */}
          <div className="flex items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-amber-900/10">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search inventory items by description, normalized key, or color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-9 pr-4 text-xs font-semibold rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#c8834a]/30"
              />
            </div>
            <span className="text-xs font-bold text-slate-500">
              Showing {filteredItems.length} of {inventoryItems.length} items
            </span>
          </div>

          {/* Master Table */}
          <div className="bg-white rounded-3xl shadow-sm border border-amber-900/10 overflow-hidden">
            <table className="w-full text-left text-xs font-semibold">
              <thead>
                <tr className="bg-[#faf6f0] text-slate-600 font-black uppercase border-b border-amber-900/10">
                  <th className="p-3.5 pl-6">Description</th>
                  <th className="p-3.5">Normalized Key</th>
                  <th className="p-3.5">Color</th>
                  <th className="p-3.5">UOM</th>
                  <th className="p-3.5">Qty on Hand</th>
                  <th className="p-3.5">Unit Rate (INR)</th>
                  <th className="p-3.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-amber-50/30 transition-colors">
                    <td className="p-3.5 pl-6 font-black text-[#2d1f0e]">{item.description}</td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">{item.normalized_key}</td>
                    <td className="p-3.5 text-slate-700">{item.color}</td>
                    <td className="p-3.5 font-mono text-slate-700">{item.uom}</td>
                    <td className="p-3.5 font-mono font-black" style={{ color: item.qty_on_hand > 0 ? '#16a34a' : '#dc2626' }}>
                      {item.qty_on_hand?.toLocaleString()}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">₹{item.rate?.toFixed(2)}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active Stock
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── EXCEL PREVIEW MODAL ─── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[90vh] flex flex-col text-slate-900">
            <div className="flex justify-between items-center p-6 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Excel Import Preview
                </h3>
                <p className="text-xs text-slate-700 font-bold mt-1">
                  File: {fileName} — Review before importing to database
                </p>
              </div>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-auto bg-white flex-1 text-sm text-slate-900">
              {previewData ? (
                <InventoryPreviewViewer data={previewData} />
              ) : (
                <div className="text-center py-12 text-slate-700 font-bold">No preview data available.</div>
              )}
              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-200 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-950 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={commitLoading}
                className="py-3 px-6 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                {commitLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Importing...</>
                ) : (
                  <><Upload className="w-4 h-4" /> Confirm & Import to Database</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
