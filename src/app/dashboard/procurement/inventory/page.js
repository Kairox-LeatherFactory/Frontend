'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, Package, AlertTriangle, CheckCircle2,
  AlertCircle, ShoppingCart, TrendingDown, Warehouse,
  ArrowRight, FileSpreadsheet, Loader2, XCircle, Search, RefreshCw, Scissors, Paperclip, Ruler, Box
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiInventoryPreview, apiInventoryCommit,
  apiGetInventoryChecks,
  apiRunInventoryCheck, apiGetInventoryItems, apiGeneratePOs, IDS
} from '../lib/api';

const CATEGORY_MAP = {
  main_material: { label: 'Leather & Main', icon: Scissors },
  sub_material: { label: 'Sub Materials', icon: Paperclip },
  lining: { label: 'Lining & Inner', icon: Scissors },
  thread: { label: 'Threads', icon: Ruler },
  accessory: { label: 'Hardware', icon: Paperclip },
  manufacturing: { label: 'Labor & Mfg', icon: Box },
  packaging: { label: 'Packaging', icon: Box },
  fob_charge: { label: 'Other', icon: Box }
};
const getCategoryIcon = (key) => CATEGORY_MAP[key]?.icon || Box;

function InventoryPreviewViewer({ data }) {
  const [showDropped, setShowDropped] = useState(false);
  const [showWarnings, setShowWarnings] = useState(false);
  if (!data) return null;

  const dropped = Array.isArray(data.dropped) ? data.dropped : [];
  const keptRows = Array.isArray(data.rows) ? data.rows : [];
  const warnings = Array.isArray(data.warnings) ? data.warnings : [];
  
  const droppedCount = dropped.length;
  const keptCount = keptRows.length > 0 ? keptRows.length : (data.kept ?? 0);
  const rawCount = data.raw_count ?? (droppedCount + keptCount);
  const keptPct = rawCount > 0 ? Math.round((keptCount / rawCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#faf6f0] rounded-2xl border border-amber-900/10 p-4 text-center">
          <p className="text-2xl font-black text-[#2d1f0e]">{rawCount.toLocaleString()}</p>
          <p className="text-[10px] font-black text-amber-900/50 uppercase tracking-wider mt-1">Total Rows</p>
        </div>
        <div className="bg-[#f0faeb] rounded-2xl border border-[#347526]/20 p-4 text-center">
          <p className="text-2xl font-black text-[#347526]">{keptCount.toLocaleString()}</p>
          <p className="text-[10px] font-black text-[#347526]/70 uppercase tracking-wider mt-1">✓ Kept ({keptPct}%)</p>
        </div>
        <div className="bg-[#faebeb] rounded-2xl border border-[#752626]/20 p-4 text-center">
          <p className="text-2xl font-black text-[#752626]">{droppedCount.toLocaleString()}</p>
          <p className="text-[10px] font-black text-[#752626]/70 uppercase tracking-wider mt-1">⚠ Dropped</p>
        </div>
      </div>

      <div>
        <div className="flex justify-between text-[10px] font-black text-amber-900/50 uppercase mb-2">
          <span>Import Coverage</span>
          <span>{keptPct}% valid stock</span>
        </div>
        <div className="h-3 bg-[#faf6f0] rounded-full overflow-hidden border border-amber-900/10">
          <div className="h-full bg-[#347526] transition-all duration-500" style={{ width: `${keptPct}%` }} />
        </div>
      </div>

      {droppedCount > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowDropped(v => !v)}
            className="flex items-center gap-2 text-xs font-black text-[#752626] bg-[#faebeb] px-4 py-2 rounded-xl hover:bg-[#f5dada] transition-colors cursor-pointer w-full justify-center"
          >
            {showDropped ? '▲ Hide' : '▼ Show'} {droppedCount} Dropped Rows
          </button>

          {showDropped && (
            <div className="mt-3 overflow-y-auto max-h-48 space-y-2 pr-2">
              {dropped.map((d, i) => (
                <div key={i} className="p-3 bg-[#faebeb]/50 rounded-xl border border-[#752626]/10 flex justify-between items-center text-xs">
                  <div>
                    <span className="font-mono text-[#752626]/50 mr-3 text-[10px]">Row {d.row}</span>
                    <span className="font-bold text-[#752626]">{d.description || 'Empty Row'}</span>
                  </div>
                  <span className="text-[10px] font-black px-2 py-1 rounded bg-white text-[#752626] shadow-sm">
                    {d.reason}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function InventoryPage() {
  const router = useRouter();
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('check');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [inventoryCheck, setInventoryCheck] = useState(null);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [genLoading, setGenLoading] = useState(false);

  // Excel Upload
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState('');
  const [uploadLoading, setUploadLoading] = useState(false);
  const [commitLoading, setCommitLoading] = useState(false);
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
      setToast({ type: 'error', msg: 'Failed to load inventory data.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setSelectedFile(file);
    setUploadLoading(true);
    try {
      const preview = await apiInventoryPreview(token, file);
      setPreviewData(preview);
      setShowPreviewModal(true);
    } catch (err) {
      setToast({ type: 'error', msg: `Upload failed: ${err.message}` });
    } finally {
      setUploadLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCommit = async () => {
    if (!selectedFile) return;
    setCommitLoading(true);
    try {
      await apiInventoryCommit(token, selectedFile);
      setToast({ type: 'success', msg: 'Inventory imported successfully!' });
      setShowPreviewModal(false);
      await loadData();
    } catch (err) {
      setToast({ type: 'error', msg: `Commit failed: ${err.message}` });
    } finally {
      setCommitLoading(false);
    }
  };

  const handleGeneratePOs = async () => {
    setGenLoading(true);
    try {
      await apiGeneratePOs(token, IDS.bom_clermont);
      setToast({ type: 'success', msg: 'Purchase Orders auto-generated successfully!' });
      setTimeout(() => router.push('/dashboard/procurement/po'), 1000);
    } catch (err) {
      setToast({ type: 'error', msg: `PO Generation failed: ${err.message}` });
    } finally {
      setGenLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return inventoryItems.filter(item => {
      const q = searchQuery.toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const key = (item.normalized_key || '').toLowerCase();
      return desc.includes(q) || key.includes(q);
    });
  }, [inventoryItems, searchQuery]);

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#c8834a]" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-32 animate-fade-in">

      {toast && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center justify-between ${toast.type === 'error' ? 'bg-[#faebeb] text-[#752626] border border-[#752626]/20' : 'bg-[#f0faeb] text-[#347526] border border-[#347526]/20'}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <Link href="/dashboard/procurement" className="flex items-center gap-2 text-xs font-black text-amber-900/60 hover:text-[#c8834a] transition-colors mb-4 w-fit">
            <ArrowLeft className="w-4 h-4" /> Back to Orders
          </Link>
          <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Procurement · Phase 4</p>
          <h1 className="text-3xl font-black mt-1 text-[#2d1f0e]">Inventory Control</h1>
          <p className="text-xs text-amber-900/60 mt-1 font-medium max-w-xl">
            Check missing materials against warehouse stock before purchasing. Upload stock reports from external systems.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={loadData} className="p-3 rounded-2xl bg-[#faf6f0] text-[#c8834a] hover:bg-amber-50 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadLoading}
            className="px-5 py-3 rounded-2xl bg-white border border-[#c8834a]/30 text-[#c8834a] text-xs font-black flex items-center gap-2 hover:bg-amber-50 transition-all shadow-sm"
          >
            {uploadLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            Import Stock List
          </button>
        </div>
      </div>

      {/* TABS */}
      <div className="flex items-center gap-2 border-b border-[#c8834a]/10 pb-2 mt-4">
        <button
          onClick={() => setActiveTab('check')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all ${
            activeTab === 'check' ? 'bg-[#c8834a] text-white shadow-md shadow-[#c8834a]/20' : 'text-amber-900/60 hover:bg-[#faf6f0]'
          }`}
        >
          <Warehouse className="w-4 h-4" /> Material Check
        </button>
        <button
          onClick={() => setActiveTab('master')}
          className={`px-5 py-2.5 rounded-2xl font-black text-xs flex items-center gap-2 transition-all ${
            activeTab === 'master' ? 'bg-[#c8834a] text-white shadow-md shadow-[#c8834a]/20' : 'text-amber-900/60 hover:bg-[#faf6f0]'
          }`}
        >
          <Package className="w-4 h-4" /> Warehouse Stock
        </button>
      </div>

      {/* TAB 1: MATERIAL CHECK */}
      {activeTab === 'check' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Metric title="Total Lines" value={inventoryCheck?.summary?.lines_total || 6} icon={Package} />
            <Metric title="In Stock" value={inventoryCheck?.summary?.sufficient || 3} icon={CheckCircle2} />
            <Metric title="Partial" value={inventoryCheck?.summary?.partial || 1} icon={TrendingDown} />
            <Metric title="Missing" value={inventoryCheck?.summary?.out_of_stock || 2} icon={AlertCircle} />
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-5 rounded-3xl border border-[#c8834a]/20 shadow-sm">
            <div>
              <p className="text-[10px] font-black uppercase text-[#c8834a] mb-1">Target BOM: CLERMONT SS27</p>
              <h3 className="text-xl font-black text-[#2d1f0e]">Material Shortfalls</h3>
              <p className="text-xs font-bold text-amber-900/60 mt-0.5">Missing materials required for production</p>
            </div>
            <button
              onClick={handleGeneratePOs}
              disabled={genLoading}
              className="px-6 py-3 rounded-2xl bg-[#c8834a] text-white text-xs font-black flex items-center gap-2 hover:bg-[#b0703c] transition-all shadow-lg shadow-[#c8834a]/20 disabled:opacity-50"
            >
              {genLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
              Generate Supplier POs <ArrowRight className="w-4 h-4 ml-1" />
            </button>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {inventoryCheck?.lines?.map((line) => {
              const Icon = getCategoryIcon(line.category);
              const missing = line.shortfall_qty > 0;
              return (
                <SpotlightCard key={line.bom_item_id} className={`p-5 rounded-3xl border transition-all ${missing ? 'bg-white border-[#c8834a]/30 shadow-md shadow-[#c8834a]/5' : 'bg-[#faf6f0]/50 border-transparent opacity-75 hover:opacity-100'}`}>
                  <div className="flex justify-between items-start gap-3 mb-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2.5 rounded-xl ${missing ? 'bg-[#faebeb] text-[#752626]' : 'bg-white text-[#c8834a]'}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-[#2d1f0e] leading-snug">{line.name}</h4>
                        <p className="text-[11px] font-bold text-amber-900/50 mt-0.5">{line.material_color || 'Standard'}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div className="p-2.5 rounded-xl bg-[#faf6f0] border border-[#c8834a]/10">
                      <p className="text-[9px] font-black uppercase text-amber-900/40">Required</p>
                      <p className="font-black text-xs text-[#2d1f0e]">{line.required_qty} {line.uom}</p>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#faf6f0] border border-[#c8834a]/10">
                      <p className="text-[9px] font-black uppercase text-amber-900/40">In Stock</p>
                      <p className="font-black text-xs text-[#2d1f0e]">{line.available_qty} {line.uom}</p>
                    </div>
                  </div>

                  <div className={`flex items-center justify-between p-3 rounded-xl border ${missing ? 'bg-[#faebeb]/50 border-[#752626]/20' : 'bg-[#f0faeb]/50 border-[#347526]/20'}`}>
                    <span className={`text-[10px] font-black uppercase ${missing ? 'text-[#752626]' : 'text-[#347526]'}`}>
                      {missing ? 'Missing Amount' : 'Fully Covered'}
                    </span>
                    <span className={`font-black ${missing ? 'text-[#752626] text-lg' : 'text-[#347526]'}`}>
                      {missing ? `${line.shortfall_qty} ${line.uom}` : '✓'}
                    </span>
                  </div>
                </SpotlightCard>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 2: WAREHOUSE STOCK */}
      {activeTab === 'master' && (
        <div className="space-y-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#c8834a]/50" />
            <input
              type="text"
              placeholder="Search warehouse stock by name or item code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-3xl border border-[#c8834a]/20 bg-white font-bold text-sm text-[#2d1f0e] outline-none focus:border-[#c8834a] shadow-sm"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-[#c8834a] bg-[#faf6f0] px-3 py-1.5 rounded-xl">
              {filteredItems.length} items
            </span>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <SpotlightCard key={item.id} className="p-5 rounded-3xl bg-white border border-[#c8834a]/15 hover:border-[#c8834a]/40 transition-all cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <h4 className="font-black text-sm text-[#2d1f0e] leading-snug">{item.description}</h4>
                </div>
                <div className="space-y-2 text-xs font-medium text-amber-900/70 mb-4">
                  <p className="flex justify-between"><span>Code:</span> <span className="font-mono text-[#2d1f0e]">{item.normalized_key}</span></p>
                  <p className="flex justify-between"><span>Color:</span> <span className="text-[#2d1f0e]">{item.color}</span></p>
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-[#c8834a]/10">
                  <p className="text-[10px] font-black uppercase text-amber-900/50">Stock</p>
                  <p className={`font-black ${item.qty_on_hand > 0 ? 'text-[#347526]' : 'text-[#752626]'}`}>
                    {item.qty_on_hand?.toLocaleString()} <span className="text-[10px] uppercase ml-0.5">{item.uom}</span>
                  </p>
                </div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      )}

      {/* EXCEL UPLOAD MODAL */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-amber-100">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#c8834a]/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-[#faf6f0] text-[#c8834a]">
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#2d1f0e]">Import Preview</h3>
                  <p className="text-xs text-amber-900/60 font-bold max-w-[200px] truncate">{fileName}</p>
                </div>
              </div>
              <button onClick={() => setShowPreviewModal(false)} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <InventoryPreviewViewer data={previewData} />

            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setShowPreviewModal(false)}
                className="px-5 py-3 rounded-xl border border-amber-900/10 text-xs font-bold text-amber-900/60 hover:bg-[#faf6f0]"
              >
                Cancel
              </button>
              <button
                onClick={handleCommit}
                disabled={commitLoading}
                className="px-6 py-3 rounded-xl bg-[#c8834a] text-white text-xs font-black hover:bg-[#b0703c] transition-all shadow-md flex items-center gap-2"
              >
                {commitLoading && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm Import
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Metric({ title, value, icon: Icon }) {
  return (
    <div className="p-5 rounded-3xl bg-white border border-[#c8834a]/15 flex items-center justify-between">
      <div>
        <p className="text-[10px] font-black uppercase text-amber-900/50">{title}</p>
        <p className="text-2xl font-black mt-1 text-[#2d1f0e]">{value}</p>
      </div>
      <div className="p-3 bg-[#faf6f0] rounded-2xl text-[#c8834a]"><Icon className="w-5 h-5" /></div>
    </div>
  );
}
