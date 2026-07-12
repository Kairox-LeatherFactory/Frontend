'use client';
import { useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, AlertTriangle, CheckCircle2,
  AlertCircle, ShoppingCart, TrendingDown, Warehouse,
  ArrowRight, ChevronDown, ChevronUp, FileSpreadsheet,
  Loader2, X, Upload
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiInventoryPreview, apiInventoryCommit } from '@/lib/api';

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
    const keptKeys = ['normalized_key', 'description', 'category', 'qty_on_hand', 'uom', 'rate', 'color', 'lots'];

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
                  <thead className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider sticky top-0 z-10 shadow-sm">
                    <tr>
                      {keptKeys.map(k => (
                        <th key={k} className="px-4 py-2 border-b border-slate-200">
                          {formatHeader(k)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {keptRows.map((row, i) => (
                      <tr key={i} className="hover:bg-slate-50 transition-colors">
                        {keptKeys.map(k => (
                          <td key={k} className="px-4 py-1.5 text-slate-700 whitespace-nowrap">
                            {k === 'qty_on_hand' ? (
                              <span className="font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                                {row[k] !== null ? row[k].toLocaleString() : '-'}
                              </span>
                            ) : k === 'rate' ? (
                              <span className="font-bold text-slate-900">
                                {row[k] ? `₹${Number(row[k]).toFixed(2)}` : '-'}
                              </span>
                            ) : (
                              <span className={k === 'normalized_key' ? 'font-mono text-[10px] text-slate-500' : 'truncate max-w-[200px] block'} title={String(row[k] ?? '-')}>
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

  // Fallback if data is not in raw_count format
  return (
    <div className="text-slate-700 bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap">
      <div className="text-red-500 font-bold mb-2">Unrecognized data format. Raw response:</div>
      {JSON.stringify(data, null, 2)}
    </div>
  );
}

// ─── MOCK INVENTORY DATA ────────────────────────────────────────────────────────
// TODO: Replace with GET /api/v1/procurement/inventory-checks
const MOCK_INVENTORY = [
  {
    id: 'INV-001',
    submission_id: 'SUB-001',
    client: 'Acne Studios',
    style: 'Chelsea Boot - Oxford',
    order_qty: 500,
    items: [
      { id: 1, component: 'Upper Leather', material: 'Full Grain Calf — Cognac', unit: 'sq.ft', required: 1250, available: 980, status: 'partial' },
      { id: 2, component: 'Lining Leather', material: 'Split Grain Lamb', unit: 'sq.ft', required: 900, available: 1200, status: 'sufficient' },
      { id: 3, component: 'Outsole', material: 'Rubber Compound — Black', unit: 'pairs', required: 500, available: 500, status: 'sufficient' },
      { id: 4, component: 'Insole Board', material: 'Cellulose Fibre', unit: 'pairs', required: 500, available: 0, status: 'out_of_stock' },
      { id: 5, component: 'Thread', material: 'Nylon 40s — Brown', unit: 'spools', required: 50, available: 22, status: 'partial' },
      { id: 6, component: 'Zip Puller', material: 'Antique Brass — 5mm', unit: 'pairs', required: 500, available: 600, status: 'sufficient' },
      { id: 7, component: 'Toe Stiffener', material: 'Thermoplastic', unit: 'pairs', required: 500, available: 120, status: 'partial' },
    ],
  },
  {
    id: 'INV-002',
    submission_id: 'SUB-002',
    client: 'Zara',
    style: 'Derby Shoe - Black Brogue',
    order_qty: 300,
    items: [
      { id: 1, component: 'Upper Leather', material: 'Corrected Grain — Black', unit: 'sq.ft', required: 660, available: 0, status: 'out_of_stock' },
      { id: 2, component: 'Sock Lining', material: 'Genuine Leather — Tan', unit: 'pairs', required: 300, available: 300, status: 'sufficient' },
      { id: 3, component: 'Leather Outsole', material: 'Vegtan Oak-Bark', unit: 'pairs', required: 300, available: 180, status: 'partial' },
      { id: 4, component: 'Brass Brogue Cap', material: 'Solid Brass — Burnished', unit: 'pairs', required: 300, available: 0, status: 'out_of_stock' },
      { id: 5, component: 'Wax Laces', material: 'Cotton Wax — Black 75cm', unit: 'pairs', required: 300, available: 300, status: 'sufficient' },
    ],
  },
];

const STATUS_BADGE = {
  sufficient: { label: 'Sufficient', color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.2)', icon: CheckCircle2 },
  partial: { label: 'Partial Stock', color: '#d97706', bg: '#fffbeb', border: 'rgba(217,119,6,0.2)', icon: AlertTriangle },
  out_of_stock: { label: 'Out of Stock', color: '#dc2626', bg: '#fef2f2', border: 'rgba(220,38,38,0.2)', icon: AlertCircle },
};

function StockBadge({ status }) {
  const cfg = STATUS_BADGE[status];
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black"
      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
      <Icon className="w-3 h-3" /> {cfg.label}
    </span>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const { token } = useAuth();

  const [expandedOrder, setExpandedOrder] = useState('INV-001');
  const [toast, setToast] = useState(null);

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
      setCommitSuccess('Import committed successfully! Data has been saved to the database.');
      showToast('success', 'Import committed successfully! Data has been saved.');
      setShowPreviewModal(false);
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

  const handleGeneratePOs = (inv) => {
    const shortfalls = inv.items.filter(i => i.status !== 'sufficient');
    if (shortfalls.length === 0) {
      showToast('info', 'All materials are sufficiently stocked!');
      return;
    }
    showToast('success', `Generating ${shortfalls.length} Purchase Orders for ${inv.client}…`);
    setTimeout(() => router.push('/dashboard/procurement/po'), 1200);
  };

  // Summary stats across all inventory checks
  const stats = useMemo(() => {
    let total = 0, sufficient = 0, partial = 0, outOfStock = 0;
    MOCK_INVENTORY.forEach(inv => {
      inv.items.forEach(item => {
        total++;
        if (item.status === 'sufficient') sufficient++;
        else if (item.status === 'partial') partial++;
        else outOfStock++;
      });
    });
    return { total, sufficient, partial, outOfStock };
  }, []);

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
            Procurement · Stage 4 — Inventory Check
          </p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>Stock vs. Demand</h1>
          <p className="font-medium mt-0.5" style={{ color: '#9a7a5a' }}>
            Compare BOM requirements against factory inventory and generate Purchase Orders for shortfalls.
          </p>
        </div>
        {/* ─── UPLOAD FILE BUTTON ─── */}
        <div>
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
            className="h-12 py-0 px-5 flex items-center gap-2 font-bold text-sm rounded-xl transition-all active:scale-95 disabled:opacity-50"
            style={{
              background: 'transparent',
              border: '1px solid #c8834a',
              color: '#c8834a'
            }}
          >
            {uploadLoading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Previewing...</>
            ) : (
              <><FileSpreadsheet className="w-4 h-4" /> Upload Excel</>
            )}
          </button>
        </div>
      </div>

      {/* ─── SUMMARY STATS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total BOM Lines', value: stats.total, icon: Package, color: '#9a7a5a' },
          { label: 'Sufficient', value: stats.sufficient, icon: CheckCircle2, color: '#16a34a' },
          { label: 'Partial Stock', value: stats.partial, icon: TrendingDown, color: '#d97706' },
          { label: 'Out of Stock', value: stats.outOfStock, icon: AlertCircle, color: '#dc2626' },
        ].map(({ label, value, icon: Icon, color }) => (
          <SpotlightCard key={label} className="p-4 bg-white rounded-2xl shadow-sm" style={{ border: '1px solid rgba(200,131,74,0.12)' }} spotlightColor="rgba(200,131,74,0.05)">
            <div className="flex items-center gap-2 mb-1">
              <Icon className="w-4 h-4" style={{ color }} />
              <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: '#9a7a5a' }}>{label}</p>
            </div>
            <p className="text-2xl font-black" style={{ color }}>{value}</p>
          </SpotlightCard>
        ))}
      </div>

      {/* ─── ORDER-LEVEL INVENTORY CARDS ─── */}
      <div className="space-y-4">
        {MOCK_INVENTORY.map((inv) => {
          const shortfalls = inv.items.filter(i => i.status !== 'sufficient');
          const isExpanded = expandedOrder === inv.id;
          return (
            <SpotlightCard
              key={inv.id}
              className="bg-white rounded-3xl shadow-xl overflow-hidden"
              style={{ border: '1px solid rgba(200,131,74,0.15)' }}
              spotlightColor="rgba(200,131,74,0.04)"
            >
              {/* Order Header */}
              <div
                className="p-5 flex items-center justify-between cursor-pointer"
                onClick={() => setExpandedOrder(isExpanded ? null : inv.id)}
                style={{ borderBottom: isExpanded ? '1px solid rgba(200,131,74,0.1)' : 'none' }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(200,131,74,0.1)' }}>
                    <Warehouse className="w-5 h-5" style={{ color: '#c8834a' }} />
                  </div>
                  <div>
                    <p className="font-black text-base" style={{ color: '#2d1f0e' }}>{inv.client}</p>
                    <p className="text-xs font-semibold" style={{ color: '#9a7a5a' }}>{inv.style} · {inv.order_qty} pairs · {inv.submission_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {shortfalls.length > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid rgba(220,38,38,0.2)' }}>
                      {shortfalls.length} shortfall{shortfalls.length > 1 ? 's' : ''}
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-black" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid rgba(22,163,74,0.2)' }}>
                      All Stocked
                    </span>
                  )}
                  {isExpanded ? <ChevronUp className="w-4 h-4" style={{ color: '#9a7a5a' }} /> : <ChevronDown className="w-4 h-4" style={{ color: '#9a7a5a' }} />}
                </div>
              </div>

              {/* Item Table */}
              {isExpanded && (
                <div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs font-semibold">
                      <thead>
                        <tr className="font-black uppercase tracking-wider" style={{ background: '#faf6f0', color: '#9a7a5a', borderBottom: '1px solid rgba(200,131,74,0.1)' }}>
                          <th className="p-3 pl-5">Component</th>
                          <th className="p-3">Material</th>
                          <th className="p-3">Unit</th>
                          <th className="p-3">Required</th>
                          <th className="p-3">Available</th>
                          <th className="p-3">Shortfall</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.items.map(item => {
                          const shortfall = Math.max(0, item.required - item.available);
                          return (
                            <tr key={item.id} className="border-b transition-colors hover:bg-[#fcfaf8]" style={{ borderColor: 'rgba(200,131,74,0.07)' }}>
                              <td className="p-3 pl-5 font-black" style={{ color: '#2d1f0e' }}>{item.component}</td>
                              <td className="p-3" style={{ color: '#9a7a5a' }}>{item.material}</td>
                              <td className="p-3" style={{ color: '#9a7a5a' }}>{item.unit}</td>
                              <td className="p-3 font-black" style={{ color: '#2d1f0e' }}>{item.required.toLocaleString()}</td>
                              <td className="p-3 font-black" style={{ color: item.available >= item.required ? '#16a34a' : '#dc2626' }}>{item.available.toLocaleString()}</td>
                              <td className="p-3 font-black" style={{ color: shortfall > 0 ? '#dc2626' : '#16a34a' }}>
                                {shortfall > 0 ? `−${shortfall.toLocaleString()}` : '—'}
                              </td>
                              <td className="p-3"><StockBadge status={item.status} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Action Footer */}
                  <div className="p-5 flex items-center justify-between" style={{ borderTop: '1px solid rgba(200,131,74,0.1)', background: '#faf6f0' }}>
                    <p className="text-xs font-semibold" style={{ color: '#9a7a5a' }}>
                      {shortfalls.length > 0
                        ? `${shortfalls.length} material(s) need to be procured from suppliers.`
                        : 'All materials are sufficiently stocked. Ready for production.'}
                    </p>
                    <button
                      onClick={() => handleGeneratePOs(inv)}
                      className="h-9 px-5 rounded-xl font-black text-xs text-white flex items-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5"
                      style={{ background: shortfalls.length > 0 ? 'linear-gradient(135deg, #c8834a, #e8a06a)' : 'linear-gradient(135deg, #16a34a, #22c55e)' }}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      {shortfalls.length > 0 ? `Generate ${shortfalls.length} PO(s)` : 'View Production'}
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </SpotlightCard>
          );
        })}
      </div>

      {/* ─── EXCEL PREVIEW MODAL ─── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm animate-fade-in p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-4xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <div>
                <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                  Excel Import Preview
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-1">
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

            <div className="p-6 overflow-auto bg-slate-50 flex-1 text-sm">
              {previewData ? (
                <InventoryPreviewViewer data={previewData} />
              ) : (
                <div className="text-center py-12 text-slate-500 font-bold">No preview data available.</div>
              )}
              {uploadError && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-bold rounded-xl">
                  {uploadError}
                </div>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t border-slate-100 bg-white rounded-b-2xl">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="py-3 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer"
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
