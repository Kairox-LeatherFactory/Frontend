'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Barcode, Printer, History, Search, X, Download, Zap, Send, Eye,
  RotateCcw, FileDown, ChevronRight, Users, Box,
} from 'lucide-react';
import { buildInitialState } from './data';
import { EMPLOYEE_DIRECTORY } from './employeeData';
import { drawBarcodeCanvas, downloadBarcodePNG } from './barcodeUtils';

const BRAND = {
  darkGrad: 'linear-gradient(180deg, #3d2b1a 0%, #2a1d11 100%)',
  accent: '#c8834a',
  border: 'rgba(200,131,74,0.25)',
  text: '#2d1f0e',
  textMuted: '#9a7a5a',
  bg: '#faf6f0',
};

const TABS = [
  { id: 'generation', label: 'Batch Generation', icon: Barcode },
  { id: 'print', label: 'Print Center', icon: Printer },
  { id: 'history', label: 'Batch History', icon: History },
];

const CATEGORIES = [
  { id: 'style', label: 'Style Barcodes', icon: Barcode },
  { id: 'employee', label: 'Employee Barcodes', icon: Users },
  { id: 'bucket', label: 'Bucket Barcodes', icon: Box },
];

const CATEGORY_SUBTITLES = {
  style: 'Generate, print, and audit piece-level Code128 barcodes across production orders.',
  employee: 'Generate, print, and audit employee ID badge barcodes across departments.',
  bucket: 'Generate, print, and audit production bucket/lot barcodes across manufacturing stages.',
};

const CATEGORY_LABELS = {
  style: {
    orderIdLabel: 'Order ID', clientLabel: 'Client', styleLabel: 'Style', colorLabel: 'Color', sizeLabel: 'Size',
    groupHint: 'Grouped by Production Order — click a card to drill into its styles',
    subGroupNounPlural: 'Styles',
  },
  employee: {
    orderIdLabel: 'Dept. Code', clientLabel: 'Department', styleLabel: 'Employee', colorLabel: 'Designation', sizeLabel: 'Employee ID',
    groupHint: 'Grouped by Department — click a card to view employee ID badges',
    subGroupNounPlural: 'Employees',
  },
  bucket: {
    orderIdLabel: 'Batch Group', clientLabel: 'Category', styleLabel: 'Bucket Range', colorLabel: 'Notes', sizeLabel: 'Bucket No.',
    groupHint: 'Grouped by Batch — click a card to view generated ranges',
    subGroupNounPlural: 'Ranges',
  },
};

const DEFAULT_HISTORY_FILTERS = { orderId: 'ALL', style: 'ALL', client: 'ALL', size: 'ALL', operator: 'ALL', status: 'ALL', sort: 'NEWEST' };

const selectCls = 'w-full px-3 py-2.5 rounded-lg text-sm font-semibold outline-none border transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]';
const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm font-medium outline-none border transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]';
const fieldStyle = { background: '#faf6f0', borderColor: 'rgba(200,131,74,0.3)', color: '#2d1f0e' };

function statusBadgeClass(status) {
  if (status === 'PRINTED') return 'badge badge-success';
  if (status === 'PARTIAL') return 'badge badge-info';
  return 'badge badge-warning';
}

// ─── SHARED CANVAS RENDERER ───────────────────────────────────────────────────
function BarcodeCanvas({ code, height = 45, moduleWidth = 1.2, showText = true }) {
  const ref = useRef(null);
  useEffect(() => {
    drawBarcodeCanvas(ref.current, code, { height, moduleWidth, showText });
  }, [code, height, moduleWidth, showText]);
  return <canvas ref={ref} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />;
}

// ─── TOASTS ────────────────────────────────────────────────────────────────────
function ToastStack({ toasts }) {
  const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };
  return createPortal(
    <div className="fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none w-[300px]">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg animate-fade-in"
          style={{ background: '#2a1d11', borderLeft: `4px solid ${colors[t.type] || colors.success}` }}
        >
          {t.message}
        </div>
      ))}
    </div>,
    document.body
  );
}

// ─── SIZE / SUB-GROUP CARD (reused for style sizes and employee departments) ──
function SizeCard({ sizeKey, sizeData, active, onSelect, onGenerate, generateLabel = 'Generate Barcode' }) {
  const isDone = sizeData.remaining === 0;
  return (
    <div
      onClick={onSelect}
      className="rounded-xl p-4 flex flex-col gap-3 cursor-pointer transition-all hover:-translate-y-1"
      style={{
        background: active ? 'linear-gradient(180deg, #fff 0%, #fdf0e0 100%)' : '#ffffff',
        border: `1.8px solid ${active ? BRAND.accent : 'rgba(200,131,74,0.25)'}`,
        boxShadow: active ? '0 6px 20px rgba(200,131,74,0.22)' : '0 2px 8px rgba(90,56,37,0.05)',
      }}
    >
      <div className="flex items-center justify-between">
        <div
          className="px-3 h-11 min-w-11 rounded-lg flex items-center justify-center font-black text-sm text-white text-center"
          style={{ background: '#3d2b1a' }}
        >
          {sizeKey}
        </div>
        <span className={statusBadgeClass(isDone ? 'PRINTED' : 'PENDING')}>{isDone ? 'Generated' : 'Pending'}</span>
      </div>
      <div className="rounded-lg p-3 text-xs space-y-1.5" style={{ background: BRAND.bg, border: '1px solid rgba(200,131,74,0.15)' }}>
        <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Ordered:</span><strong>{sizeData.ordered} pcs</strong></div>
        <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Generated:</span><strong>{sizeData.generated} pcs</strong></div>
        <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Remaining:</span><strong style={{ color: '#c8834a' }}>{sizeData.remaining} pcs</strong></div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onGenerate(); }}
        disabled={isDone}
        className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-1.5 transition-all disabled:cursor-default"
        style={isDone
          ? { background: '#dcfce7', color: '#166534' }
          : { background: 'linear-gradient(135deg, #c8834a, #a86530)', color: '#fff' }}
      >
        <Zap className="w-3.5 h-3.5" /> {isDone ? 'Barcodes Ready' : generateLabel}
      </button>
    </div>
  );
}

// ─── STYLE: BATCH GENERATION TAB ───────────────────────────────────────────────
function GenerationTab({
  ordersStore, selectedOrderId, setSelectedOrderId, selectedStyleName, setSelectedStyleName,
  selectedSizeFilter, setSelectedSizeFilter, generatedBarcodesStore, gridSearch, setGridSearch,
  onGenerateSize, onGenerateOverallSize, onGenerateAllSizes, onSendToPrintCenter, onOpenDetail, onPrintSingle,
}) {
  const order = ordersStore[selectedOrderId];

  const sizeMap = useMemo(() => {
    if (!order) return {};
    if (selectedStyleName === 'ALL_STYLES') {
      const map = {};
      Object.values(order.styles).forEach((st) => {
        Object.entries(st.sizes).forEach(([sz, data]) => {
          if (!map[sz]) map[sz] = { ordered: 0, generated: 0, remaining: 0 };
          map[sz].ordered += data.ordered;
          map[sz].generated += data.generated;
          map[sz].remaining += data.remaining;
        });
      });
      return map;
    }
    return order.styles[selectedStyleName]?.sizes || {};
  }, [order, selectedStyleName]);

  const totals = useMemo(() => {
    return Object.values(sizeMap).reduce((acc, s) => ({ ordered: acc.ordered + s.ordered, generated: acc.generated + s.generated }), { ordered: 0, generated: 0 });
  }, [sizeMap]);

  const barcodes = useMemo(() => {
    let list = generatedBarcodesStore.filter((b) => b.orderId === selectedOrderId);
    if (selectedStyleName !== 'ALL_STYLES') list = list.filter((b) => b.style === selectedStyleName);
    if (selectedSizeFilter !== 'ALL') list = list.filter((b) => b.size === selectedSizeFilter);
    const q = gridSearch.trim().toLowerCase();
    if (q) list = list.filter((b) => b.pieceCode.toLowerCase().includes(q) || b.serialStr.includes(q));
    return list;
  }, [generatedBarcodesStore, selectedOrderId, selectedStyleName, selectedSizeFilter, gridSearch]);

  if (!order) return null;

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="grid gap-5" style={{ gridTemplateColumns: '240px 260px 1fr' }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>1. Production Order (PO)</label>
            <select className={selectCls} style={fieldStyle} value={selectedOrderId} onChange={(e) => { setSelectedOrderId(e.target.value); setSelectedStyleName('ALL_STYLES'); setSelectedSizeFilter('ALL'); }}>
              {Object.values(ordersStore).map((o) => (
                <option key={o.orderId} value={o.orderId}>{o.orderId} — {o.client}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>2. Filter Style (Optional)</label>
            <select className={selectCls} style={fieldStyle} value={selectedStyleName} onChange={(e) => { setSelectedStyleName(e.target.value); setSelectedSizeFilter('ALL'); }}>
              <option value="ALL_STYLES">-- Overall PO Generation --</option>
              {Object.keys(order.styles).map((st) => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>
          <div className="rounded-lg flex items-center gap-6 px-5 flex-wrap" style={{ background: BRAND.bg, border: '1px solid rgba(200,131,74,0.2)' }}>
            <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Scope</p><p className="font-bold" style={{ color: BRAND.accent }}>{selectedStyleName === 'ALL_STYLES' ? `Overall PO (${order.orderId})` : selectedStyleName}</p></div>
            <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Client</p><p className="font-bold" style={{ color: BRAND.text }}>{order.client}</p></div>
            <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Ordered</p><p className="font-bold" style={{ color: BRAND.text }}>{totals.ordered} pcs</p></div>
            <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{totals.generated} pcs</p></div>
            <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Remaining</p><p className="font-bold" style={{ color: '#d97706' }}>{totals.ordered - totals.generated} pcs</p></div>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-black" style={{ color: BRAND.text }}>Size Breakdown & Generation</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Click a size card to filter barcodes below, or generate piece-level barcodes.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => onGenerateAllSizes(selectedOrderId, selectedStyleName)} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs">
              <Zap className="w-4 h-4" /> Generate All Sizes
            </button>
            <button onClick={() => onSendToPrintCenter(selectedOrderId, selectedStyleName, false)} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
              <Send className="w-4 h-4" /> Send All to Print Center
            </button>
          </div>
        </div>
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {Object.entries(sizeMap).map(([sz, data]) => (
            <SizeCard
              key={sz}
              sizeKey={sz}
              sizeData={data}
              active={selectedSizeFilter === sz}
              onSelect={() => setSelectedSizeFilter(selectedSizeFilter === sz ? 'ALL' : sz)}
              onGenerate={() => selectedStyleName === 'ALL_STYLES' ? onGenerateOverallSize(selectedOrderId, sz) : onGenerateSize(selectedOrderId, selectedStyleName, sz)}
            />
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Barcode Cards</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {barcodes.length} barcodes {selectedSizeFilter !== 'ALL' ? `for Size ${selectedSizeFilter}` : ''}</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setSelectedSizeFilter('ALL')} className="px-3 py-1.5 rounded-full text-xs font-bold transition-all" style={selectedSizeFilter === 'ALL' ? { background: BRAND.accent, color: '#fff' } : { background: '#fff', border: '1.5px solid rgba(200,131,74,0.3)', color: BRAND.textMuted }}>All Sizes</button>
            {Object.keys(sizeMap).map((sz) => (
              <button key={sz} onClick={() => setSelectedSizeFilter(selectedSizeFilter === sz ? 'ALL' : sz)} className="px-3 py-1.5 rounded-full text-xs font-bold transition-all" style={selectedSizeFilter === sz ? { background: BRAND.accent, color: '#fff' } : { background: '#fff', border: '1.5px solid rgba(200,131,74,0.3)', color: BRAND.textMuted }}>Size {sz}</button>
            ))}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
              <input value={gridSearch} onChange={(e) => setGridSearch(e.target.value)} placeholder="Filter serial/code..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
            </div>
          </div>
        </div>

        {barcodes.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
            <p className="font-bold" style={{ color: BRAND.textMuted }}>No generated barcodes found for this selection.</p>
            <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Click &quot;Generate Barcode&quot; on a size card above to create piece codes.</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {barcodes.slice(0, 60).map((b) => (
              <div key={b.pieceCode} onClick={() => onOpenDetail(b.pieceCode)} className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-all hover:-translate-y-1" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
                <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  <BarcodeCanvas code={b.pieceCode} height={40} moduleWidth={1.1} />
                </div>
                <div className="text-center w-full">
                  <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>Size {b.size}</span>
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>#{b.serialStr}</span>
                    <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
                  <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── EMPLOYEE: BATCH GENERATION TAB ────────────────────────────────────────────
function EmployeeGenerationTab({ employeeGenerated, onGenerateSelected, onGenerateAllRemaining, onSendToPrintCenter, onOpenDetail, onPrintSingle }) {
  const departments = useMemo(() => Array.from(new Set(EMPLOYEE_DIRECTORY.map((e) => e.department))), []);
  const designations = useMemo(() => Array.from(new Set(EMPLOYEE_DIRECTORY.map((e) => e.designation))), []);
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [designationFilter, setDesignationFilter] = useState('ALL');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [search, setSearch] = useState('');

  const generatedIds = useMemo(() => new Set(employeeGenerated.map((r) => r.size)), [employeeGenerated]);

  const filteredEmployees = useMemo(() => {
    let list = EMPLOYEE_DIRECTORY;
    if (deptFilter !== 'ALL') list = list.filter((e) => e.department === deptFilter);
    if (designationFilter !== 'ALL') list = list.filter((e) => e.designation === designationFilter);
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((e) => e.name.toLowerCase().includes(q) || e.empId.toLowerCase().includes(q));
    return list;
  }, [deptFilter, designationFilter, search]);

  const totals = useMemo(() => ({ ordered: EMPLOYEE_DIRECTORY.length, generated: employeeGenerated.length }), [employeeGenerated]);

  const toggleSelect = (empId) => setSelectedIds((prev) => { const next = new Set(prev); next.has(empId) ? next.delete(empId) : next.add(empId); return next; });
  const selectAllVisible = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    filteredEmployees.forEach((e) => { if (!generatedIds.has(e.empId)) next.add(e.empId); });
    return next;
  });
  const clearSelection = () => setSelectedIds(new Set());

  const handleGenerateClick = () => {
    const chosen = EMPLOYEE_DIRECTORY.filter((e) => selectedIds.has(e.empId));
    onGenerateSelected(chosen);
    setSelectedIds(new Set());
  };

  const generatedBarcodes = useMemo(() => {
    let list = employeeGenerated;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((b) => b.pieceCode.toLowerCase().includes(q) || b.style.toLowerCase().includes(q));
    return list;
  }, [employeeGenerated, search]);

  const pillStyle = (active) => active
    ? { background: BRAND.accent, color: '#fff' }
    : { background: '#fff', border: '1.5px solid rgba(200,131,74,0.3)', color: BRAND.textMuted };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl p-6 shadow-sm flex items-center gap-6 flex-wrap" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Total Employees</p><p className="font-bold" style={{ color: BRAND.text }}>{totals.ordered}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{totals.generated}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Remaining</p><p className="font-bold" style={{ color: '#d97706' }}>{totals.ordered - totals.generated}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Selected</p><p className="font-bold" style={{ color: BRAND.accent }}>{selectedIds.size}</p></div>
      </div>

      <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-black" style={{ color: BRAND.text }}>Select Employees to Generate</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Click a Department or Designation to filter the list, check employees, then generate.</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={handleGenerateClick} disabled={selectedIds.size === 0} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50 disabled:cursor-default">
              <Zap className="w-4 h-4" /> Generate Selected ({selectedIds.size})
            </button>
            <button onClick={onGenerateAllRemaining} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Generate All Remaining</button>
            <button onClick={onSendToPrintCenter} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><Send className="w-4 h-4" /> Send All to Print Center</button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap mb-2.5">
          <span className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Department:</span>
          <button onClick={() => setDeptFilter('ALL')} className="px-3 py-1 rounded-full text-xs font-bold transition-all" style={pillStyle(deptFilter === 'ALL')}>All</button>
          {departments.map((d) => (
            <button key={d} onClick={() => setDeptFilter(deptFilter === d ? 'ALL' : d)} className="px-3 py-1 rounded-full text-xs font-bold transition-all" style={pillStyle(deptFilter === d)}>{d}</button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Designation:</span>
          <button onClick={() => setDesignationFilter('ALL')} className="px-3 py-1 rounded-full text-xs font-bold transition-all" style={pillStyle(designationFilter === 'ALL')}>All</button>
          {designations.map((d) => (
            <button key={d} onClick={() => setDesignationFilter(designationFilter === d ? 'ALL' : d)} className="px-3 py-1 rounded-full text-xs font-bold transition-all" style={pillStyle(designationFilter === d)}>{d}</button>
          ))}
        </div>

        <div className="flex items-center justify-between mb-2">
          <p className="text-xs" style={{ color: BRAND.textMuted }}>{filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'} match this filter</p>
          <div className="flex gap-2">
            <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Select All Visible</button>
            <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Clear</button>
          </div>
        </div>

        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>No employees match this filter.</div>
          ) : filteredEmployees.map((e, idx) => {
            const isGenerated = generatedIds.has(e.empId);
            const isChecked = selectedIds.has(e.empId);
            return (
              <label
                key={e.empId}
                className="flex items-center justify-between px-4 py-3 cursor-pointer"
                style={{
                  background: isChecked ? '#faf3ea' : '#fff',
                  borderTop: idx === 0 ? 'none' : '1px solid rgba(200,131,74,0.15)',
                }}
              >
                <div className="flex items-center gap-3">
                  <input type="checkbox" disabled={isGenerated} checked={isChecked} onChange={() => toggleSelect(e.empId)} className="w-4 h-4 accent-[#c8834a] cursor-pointer disabled:cursor-default" />
                  <div>
                    <div className="font-bold text-sm" style={{ color: '#5a3518' }}>{e.name}</div>
                    <div className="text-xs" style={{ color: BRAND.textMuted }}>{e.department} • {e.designation} • {e.empId}</div>
                  </div>
                </div>
                <span className={statusBadgeClass(isGenerated ? 'PRINTED' : 'PENDING')}>{isGenerated ? 'Generated' : 'Pending'}</span>
              </label>
            );
          })}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Employee ID Barcodes</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {generatedBarcodes.length} badges</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter name/code..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
          </div>
        </div>

        {generatedBarcodes.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
            <p className="font-bold" style={{ color: BRAND.textMuted }}>No employee ID barcodes generated yet.</p>
            <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Check employees above and click &quot;Generate Selected&quot;.</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {generatedBarcodes.map((b) => (
              <div key={b.pieceCode} onClick={() => onOpenDetail(b.pieceCode)} className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-all hover:-translate-y-1" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
                <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  <BarcodeCanvas code={b.pieceCode} height={40} moduleWidth={1.1} />
                </div>
                <div className="text-center w-full">
                  <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.style}</span>
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.color}</span>
                    <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
                  <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── BUCKET: BATCH GENERATION TAB ──────────────────────────────────────────────
function BucketGenerationTab({ bucketGenerated, onGenerateRange, onSendToPrintCenter, onOpenDetail, onPrintSingle }) {
  const [startNo, setStartNo] = useState(1);
  const [endNo, setEndNo] = useState(10);
  const [search, setSearch] = useState('');

  const filteredBuckets = useMemo(() => {
    let list = bucketGenerated;
    const q = search.trim().toLowerCase();
    if (q) list = list.filter((b) => b.pieceCode.toLowerCase().includes(q));
    return list;
  }, [bucketGenerated, search]);

  const rangeCount = Math.max(0, endNo - startNo + 1);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="grid gap-5" style={{ gridTemplateColumns: '200px 200px 1fr' }}>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>1. Start Bucket No.</label>
            <input type="number" min="1" value={startNo} onChange={(e) => setStartNo(Math.max(1, parseInt(e.target.value, 10) || 1))} className={inputCls} style={fieldStyle} />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>2. End Bucket No.</label>
            <input type="number" min={startNo} value={endNo} onChange={(e) => setEndNo(Math.max(startNo, parseInt(e.target.value, 10) || startNo))} className={inputCls} style={fieldStyle} />
          </div>
          <div className="rounded-lg flex items-center gap-6 px-5 flex-wrap" style={{ background: BRAND.bg, border: '1px solid rgba(200,131,74,0.2)' }}>
            <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Total Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{bucketGenerated.length}</p></div>
            <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Range Selected</p><p className="font-bold" style={{ color: BRAND.accent }}>{rangeCount} buckets</p></div>
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button onClick={() => onGenerateRange(startNo, endNo)} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs"><Zap className="w-4 h-4" /> Generate Bucket Barcodes</button>
          <button onClick={onSendToPrintCenter} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><Send className="w-4 h-4" /> Send All to Print Center</button>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Bucket Barcodes</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {filteredBuckets.length} buckets</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter bucket code..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
          </div>
        </div>

        {filteredBuckets.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
            <p className="font-bold" style={{ color: BRAND.textMuted }}>No bucket barcodes generated yet.</p>
            <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Type a bucket number range above and click &quot;Generate Bucket Barcodes&quot;.</p>
          </div>
        ) : (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {filteredBuckets.map((b) => (
              <div key={b.pieceCode} onClick={() => onOpenDetail(b.pieceCode)} className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer transition-all hover:-translate-y-1" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
                <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  <BarcodeCanvas code={b.pieceCode} height={40} moduleWidth={1.1} />
                </div>
                <div className="text-center w-full">
                  <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.size}</span>
                    <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
                  </div>
                </div>
                <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
                  <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── PRINT CENTER TAB (generic across categories) ──────────────────────────────
function PrintTab({
  generatedBarcodesStore, selectedPrintBarcodes,
  expandedOrders, onToggleOrderExpand, expandedGroups, onToggleExpand,
  onToggleGroup, onTogglePiece, onSelectAll, onClearAll, onOpenPreview, onPrintGroupDirect, onOpenDetail, onPrintSingle,
  labels = CATEGORY_LABELS.style,
}) {
  const orderGroups = useMemo(() => {
    const orderMap = new Map();
    generatedBarcodesStore.forEach((b) => {
      if (!orderMap.has(b.orderId)) orderMap.set(b.orderId, { orderId: b.orderId, client: b.client, items: [], styleMap: new Map() });
      const og = orderMap.get(b.orderId);
      og.items.push(b);
      const sKey = `${b.orderId}__${b.style}`;
      if (!og.styleMap.has(sKey)) og.styleMap.set(sKey, { key: sKey, orderId: b.orderId, style: b.style, color: b.color, items: [] });
      og.styleMap.get(sKey).items.push(b);
    });
    return Array.from(orderMap.values()).map((og) => ({ ...og, styles: Array.from(og.styleMap.values()) }));
  }, [generatedBarcodesStore]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div>
          <h3 className="text-base font-black" style={{ color: BRAND.text }}>Print Queue ({selectedPrintBarcodes.size} selected)</h3>
          <p className="text-xs" style={{ color: BRAND.textMuted }}>{labels.groupHint}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={onSelectAll} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Select All</button>
          <button onClick={onClearAll} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Clear Selection</button>
          <button onClick={onOpenPreview} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><Eye className="w-4 h-4" /> Preview</button>
          <button onClick={onOpenPreview} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs"><Printer className="w-4 h-4" /> Print Selected</button>
        </div>
      </div>

      {orderGroups.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
          <p className="font-bold" style={{ color: BRAND.textMuted }}>No barcode batches in the print queue yet.</p>
          <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Generate barcodes in Batch Generation first.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orderGroups.map((og) => {
            const selectedCount = og.items.filter((i) => selectedPrintBarcodes.has(i.pieceCode)).length;
            const allSelected = selectedCount === og.items.length;
            const isPrintedAll = og.items.every((i) => i.printStatus === 'PRINTED');
            const expanded = expandedOrders.has(og.orderId);
            return (
              <div key={og.orderId} className="rounded-xl shadow-sm overflow-hidden" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
                <div className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer" onClick={() => onToggleOrderExpand(og.orderId)}>
                  <div className="flex items-center gap-4">
                    <input type="checkbox" checked={allSelected} onClick={(e) => e.stopPropagation()} onChange={(e) => onToggleGroup(og.items, e.target.checked)} className="w-4 h-4 accent-[#c8834a] cursor-pointer" />
                    <div className="px-3 py-1.5 rounded-lg font-mono font-black text-sm text-white" style={{ background: '#3d2b1a' }}>{og.orderId}</div>
                    <div>
                      <div className="font-black text-sm" style={{ color: '#5a3518' }}>{og.client}</div>
                      <div className="text-xs" style={{ color: BRAND.textMuted }}>{og.styles.length} {labels.subGroupNounPlural.toLowerCase()} • {og.items.length} barcodes</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className={statusBadgeClass(isPrintedAll ? 'PRINTED' : 'PENDING')}>{isPrintedAll ? 'Printed' : 'Ready'}</span>
                    <button onClick={() => onToggleOrderExpand(og.orderId)} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
                      <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} /> View {labels.subGroupNounPlural} ({og.styles.length})
                    </button>
                    <button onClick={() => onPrintGroupDirect(og.items)} className="btn-warm-primary !min-h-0 !py-2 !px-3 text-xs"><Printer className="w-3.5 h-3.5" /> Print All</button>
                  </div>
                </div>
                {expanded && (
                  <div className="p-4 flex flex-col gap-3" style={{ background: BRAND.bg, borderTop: '1px solid rgba(200,131,74,0.15)' }}>
                    {og.styles.map((g) => {
                      const sSelectedCount = g.items.filter((i) => selectedPrintBarcodes.has(i.pieceCode)).length;
                      const sAllSelected = sSelectedCount === g.items.length;
                      const sPrintedAll = g.items.every((i) => i.printStatus === 'PRINTED');
                      const sExpanded = expandedGroups.has(g.key);
                      return (
                        <div key={g.key} className="rounded-lg overflow-hidden" style={{ background: '#fff', border: '1.5px solid rgba(200,131,74,0.2)' }}>
                          <div className="p-3 flex items-center justify-between flex-wrap gap-3">
                            <div className="flex items-center gap-3">
                              <input type="checkbox" checked={sAllSelected} onChange={(e) => onToggleGroup(g.items, e.target.checked)} className="w-4 h-4 accent-[#c8834a] cursor-pointer" />
                              <div>
                                <div className="font-bold text-sm" style={{ color: '#5a3518' }}>{g.style}{g.color ? ` — ${g.color}` : ''}</div>
                                <div className="text-xs" style={{ color: BRAND.textMuted }}>{g.items.length} barcodes</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={statusBadgeClass(sPrintedAll ? 'PRINTED' : 'PENDING')}>{sPrintedAll ? 'Printed' : 'Ready'}</span>
                              <button onClick={() => onToggleExpand(g.key)} className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-xs">
                                <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: sExpanded ? 'rotate(90deg)' : 'none' }} /> View ({g.items.length})
                              </button>
                              <button onClick={() => onPrintGroupDirect(g.items)} className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-xs"><Printer className="w-3.5 h-3.5" /> Print All</button>
                            </div>
                          </div>
                          {sExpanded && (
                            <div className="p-3 grid gap-3" style={{ background: '#fff', borderTop: '1px solid rgba(200,131,74,0.15)', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
                              {g.items.map((b) => {
                                const checked = selectedPrintBarcodes.has(b.pieceCode);
                                return (
                                  <div key={b.pieceCode} className="rounded-lg p-2.5 flex flex-col items-center gap-2 relative" style={{ background: checked ? '#faf3ea' : BRAND.bg, border: `1.5px solid ${checked ? BRAND.accent : 'rgba(200,131,74,0.2)'}` }}>
                                    <input type="checkbox" checked={checked} onChange={(e) => onTogglePiece(b.pieceCode, e.target.checked)} className="absolute top-2 left-2 w-3.5 h-3.5 accent-[#c8834a] cursor-pointer" />
                                    <div className="w-full bg-white rounded p-1.5 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                                      <BarcodeCanvas code={b.pieceCode} height={30} moduleWidth={0.85} showText={false} />
                                    </div>
                                    <div className="text-center w-full">
                                      <div className="font-mono font-bold text-[0.65rem] break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
                                      <span className={`${statusBadgeClass(b.printStatus)} mt-1`}>{b.printStatus}</span>
                                    </div>
                                    <div className="flex gap-1 w-full">
                                      <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1 !px-1 text-[0.65rem]">View</button>
                                      <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1 !px-1 text-[0.65rem]">Print</button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── BATCH HISTORY TAB (generic across categories) ─────────────────────────────
function HistoryTab({ batchHistoryStore, filters, setFilter, resetFilters, options, onView, onReprint, onExportCSV, expandedOrders, onToggleOrderExpand, labels = CATEGORY_LABELS.style }) {
  const filtered = useMemo(() => {
    let list = batchHistoryStore.filter((b) =>
      (filters.orderId === 'ALL' || b.orderId === filters.orderId) &&
      (filters.style === 'ALL' || b.style === filters.style) &&
      (filters.client === 'ALL' || b.client === filters.client) &&
      (filters.size === 'ALL' || b.size.includes(filters.size)) &&
      (filters.operator === 'ALL' || b.generatedBy === filters.operator) &&
      (filters.status === 'ALL' || b.printStatus === filters.status)
    );
    if (filters.sort === 'OLDEST') list = [...list].reverse();
    else if (filters.sort === 'QTY_HIGH') list = [...list].sort((a, b) => b.qty - a.qty);
    return list;
  }, [batchHistoryStore, filters]);

  const orderGroups = useMemo(() => {
    const map = new Map();
    filtered.forEach((b) => {
      if (!map.has(b.orderId)) map.set(b.orderId, { orderId: b.orderId, client: b.client, batches: [] });
      map.get(b.orderId).batches.push(b);
    });
    return Array.from(map.values());
  }, [filtered]);

  const FilterSelect = ({ label, field, opts }) => (
    <div>
      <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>{label}</label>
      <select className={selectCls} style={fieldStyle} value={filters[field]} onChange={(e) => setFilter(field, e.target.value)}>
        <option value="ALL">All {label}</option>
        {opts.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="rounded-2xl p-5 shadow-sm grid gap-4 items-end" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}`, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
        <FilterSelect label={labels.orderIdLabel} field="orderId" opts={options.orderIds} />
        <FilterSelect label={labels.styleLabel} field="style" opts={options.styles} />
        <FilterSelect label={labels.clientLabel} field="client" opts={options.clients} />
        <FilterSelect label={labels.sizeLabel} field="size" opts={options.sizes} />
        <FilterSelect label="Operator" field="operator" opts={options.operators} />
        <div>
          <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Print Status</label>
          <select className={selectCls} style={fieldStyle} value={filters.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="ALL">All Statuses</option>
            <option value="PRINTED">Printed</option>
            <option value="PENDING">Pending</option>
            <option value="PARTIAL">Partial</option>
          </select>
        </div>
        <div>
          <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Sort By</label>
          <select className={selectCls} style={fieldStyle} value={filters.sort} onChange={(e) => setFilter('sort', e.target.value)}>
            <option value="NEWEST">Date (Newest First)</option>
            <option value="OLDEST">Date (Oldest First)</option>
            <option value="QTY_HIGH">Qty (High to Low)</option>
          </select>
        </div>
        <button onClick={resetFilters} className="btn-warm-secondary !min-h-0 !py-2.5"><RotateCcw className="w-4 h-4" /> Reset</button>
      </div>

      <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Barcode Batch Records</h3>
          <button onClick={onExportCSV} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs"><FileDown className="w-4 h-4" /> Export CSV</button>
        </div>

        {orderGroups.length === 0 ? (
          <div className="text-center py-8" style={{ color: BRAND.textMuted }}>No batch history records match the selected filters.</div>
        ) : (
          <div className="flex flex-col gap-3">
            {orderGroups.map((og) => {
              const totalQty = og.batches.reduce((sum, b) => sum + b.qty, 0);
              const statuses = new Set(og.batches.map((b) => b.printStatus));
              const groupStatus = statuses.size === 1 ? og.batches[0].printStatus : 'PARTIAL';
              const expanded = expandedOrders.has(og.orderId);
              return (
                <div key={og.orderId} className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${BRAND.border}` }}>
                  <div
                    className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer"
                    style={{ background: BRAND.bg }}
                    onClick={() => onToggleOrderExpand(og.orderId)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1.5 rounded-lg font-mono font-black text-sm text-white" style={{ background: '#3d2b1a' }}>{og.orderId}</div>
                      <div>
                        <div className="font-black text-sm" style={{ color: '#5a3518' }}>{og.client}</div>
                        <div className="text-xs" style={{ color: BRAND.textMuted }}>{og.batches.length} batches • {totalQty} pcs total</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusBadgeClass(groupStatus)}>{groupStatus}</span>
                      <button onClick={(e) => { e.stopPropagation(); onToggleOrderExpand(og.orderId); }} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
                        <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} /> View Batches ({og.batches.length})
                      </button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr style={{ background: '#fff' }}>
                            {['Batch No', `${labels.styleLabel} & ${labels.colorLabel}`, labels.sizeLabel, 'Qty', 'Generated By', 'Created', 'Status', 'Actions'].map((h) => (
                              <th key={h} className="text-left px-3 py-2.5 text-[0.7rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted, borderBottom: `1.5px solid ${BRAND.border}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {og.batches.map((b) => (
                            <tr key={b.batchNo} className="hover:bg-[#fdf6ee]">
                              <td className="px-3 py-2.5 font-mono font-bold" style={{ color: '#5a3518', borderBottom: '1px solid #f0e8d7' }}>{b.batchNo}</td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.style}{b.color ? ` (${b.color})` : ''}</td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.size}</td>
                              <td className="px-3 py-2.5 font-bold" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.qty} pcs</td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.generatedBy}</td>
                              <td className="px-3 py-2.5 text-xs" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.createdDate}</td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}><span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span></td>
                              <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                                <div className="flex gap-1.5">
                                  <button onClick={() => onView(b.orderId, b.style)} className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-xs">View</button>
                                  <button onClick={() => onReprint(b)} className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-xs">Reprint</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── MODALS ─────────────────────────────────────────────────────────────────────
function DetailModal({ barcode, onClose, onPrint, labels = CATEGORY_LABELS.style }) {
  const canvasRef = useRef(null);
  useEffect(() => {
    if (barcode) drawBarcodeCanvas(canvasRef.current, barcode.pieceCode, { height: 65, moduleWidth: 1.6 });
  }, [barcode]);
  if (!barcode) return null;
  const fields = [
    [labels.orderIdLabel, barcode.orderId], [labels.clientLabel, barcode.client],
    [labels.styleLabel, barcode.style], [labels.colorLabel, barcode.color],
    [labels.sizeLabel, barcode.size], ['Serial', barcode.serialStr],
    ['Batch', barcode.batchNo], ['Status', barcode.printStatus],
  ];
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6" style={{ background: 'rgba(44,34,30,0.65)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden" style={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
          <h3 className="font-bold" style={{ color: '#5a3518' }}>Barcode Specification</h3>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
        </div>
        <div className="p-6 text-center">
          <div className="bg-white p-4 rounded-lg mb-4 flex justify-center overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
            <canvas ref={canvasRef} style={{ maxWidth: '100%', height: 'auto', display: 'block' }} />
          </div>
          <div className="font-mono font-bold mb-4" style={{ color: '#5a3518' }}>{barcode.pieceCode}</div>
          <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-left text-sm p-4 rounded-lg" style={{ background: BRAND.bg }}>
            {fields.map(([label, value]) => (
              <div key={label} className="flex flex-col gap-0.5">
                <span className="text-[0.68rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted }}>{label}</span>
                <span className="font-semibold" style={{ color: BRAND.text }}>{value || '—'}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4" style={{ background: BRAND.bg, borderTop: `1.5px solid ${BRAND.border}` }}>
          <button onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Close</button>
          <button onClick={() => downloadBarcodePNG(canvasRef.current, barcode.pieceCode)} className="btn-warm-secondary !min-h-0 !py-2.5"><Download className="w-4 h-4" /> Download PNG</button>
          <button onClick={() => onPrint(barcode.pieceCode)} className="btn-warm-primary !min-h-0 !py-2.5"><Printer className="w-4 h-4" /> Print Label</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

function PrintPreviewModal({ open, codes, onClose, onConfirm }) {
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6" style={{ background: 'rgba(44,34,30,0.65)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden" style={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
          <h3 className="font-bold" style={{ color: '#5a3518' }}>Thermal Sticker Print Preview ({codes.length})</h3>
          <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
        </div>
        <div className="p-6 max-h-[480px] overflow-y-auto flex flex-wrap gap-3 justify-center" style={{ background: '#e5e5e5' }}>
          {codes.map((code) => (
            <div key={code} className="bg-white border border-dashed border-gray-500 rounded-md flex flex-col items-center justify-center overflow-hidden" style={{ width: 200, height: 100, padding: 10 }}>
              <BarcodeCanvas code={code} height={30} moduleWidth={0.8} showText={false} />
              <div className="font-mono font-bold text-[0.65rem] mt-1">{code}</div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4" style={{ background: BRAND.bg, borderTop: `1.5px solid ${BRAND.border}` }}>
          <button onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Cancel</button>
          <button onClick={onConfirm} className="btn-warm-primary !min-h-0 !py-2.5"><Printer className="w-4 h-4" /> Confirm &amp; Send to Printer</button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── PAGE ROOT ──────────────────────────────────────────────────────────────────
export default function BarcodeManagementPage() {
  const [category, setCategory] = useState('style');
  const [activeTab, setActiveTab] = useState('generation');

  // Style category data (own store, never touched by other categories)
  const [{ ordersStore, generatedBarcodesStore, batchHistoryStore }, setState] = useState(() => buildInitialState());
  const [selectedOrderId, setSelectedOrderId] = useState('KL_1');
  const [selectedStyleName, setSelectedStyleName] = useState('ALL_STYLES');
  const [selectedSizeFilter, setSelectedSizeFilter] = useState('ALL');
  const [gridSearch, setGridSearch] = useState('');

  // Employee category data — fully separate store
  const [employeeStore, setEmployeeStore] = useState(() => ({ generated: [], history: [] }));

  // Bucket category data — fully separate store
  const [bucketStore, setBucketStore] = useState(() => ({ generated: [], history: [] }));

  // Per-category UI state (selection/expansion/filters never bleed across categories)
  const [printSelections, setPrintSelections] = useState(() => ({ style: new Set(), employee: new Set(), bucket: new Set() }));
  const [expandedOrdersByCat, setExpandedOrdersByCat] = useState(() => ({ style: new Set(), employee: new Set(), bucket: new Set() }));
  const [expandedGroupsByCat, setExpandedGroupsByCat] = useState(() => ({ style: new Set(), employee: new Set(), bucket: new Set() }));
  const [expandedHistoryOrdersByCat, setExpandedHistoryOrdersByCat] = useState(() => ({ style: new Set(), employee: new Set(), bucket: new Set() }));
  const [historyFiltersByCat, setHistoryFiltersByCat] = useState(() => ({
    style: { ...DEFAULT_HISTORY_FILTERS }, employee: { ...DEFAULT_HISTORY_FILTERS }, bucket: { ...DEFAULT_HISTORY_FILTERS },
  }));

  const [detailCode, setDetailCode] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printSheetCodes, setPrintSheetCodes] = useState([]);
  const printSheetRef = useRef(null);

  const [toasts, setToasts] = useState([]);
  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ─── Derived: whichever category is active right now ───
  const activeGenerated = category === 'style' ? generatedBarcodesStore : category === 'employee' ? employeeStore.generated : bucketStore.generated;
  const activeHistory = category === 'style' ? batchHistoryStore : category === 'employee' ? employeeStore.history : bucketStore.history;
  const activeSelectedPrint = printSelections[category];
  const activeExpandedOrders = expandedOrdersByCat[category];
  const activeExpandedGroups = expandedGroupsByCat[category];
  const activeExpandedHistoryOrders = expandedHistoryOrdersByCat[category];
  const activeHistoryFilters = historyFiltersByCat[category];
  const activeLabels = CATEGORY_LABELS[category];

  const switchCategory = useCallback((cat) => {
    setCategory(cat);
    setActiveTab('generation');
  }, []);

  // ─── Print-side-effect: render the hidden sheet then trigger the browser print dialog ───
  useEffect(() => {
    if (printSheetCodes.length === 0) return;
    const sheet = printSheetRef.current;
    if (sheet) sheet.style.display = 'block';
    const t = setTimeout(() => {
      window.print();
      if (sheet) sheet.style.display = 'none';
      setPrintSheetCodes([]);
    }, 80);
    return () => clearTimeout(t);
  }, [printSheetCodes]);

  // ─── STYLE generation handlers ───
  const generateSizeBarcodes = useCallback((orderId, styleName, sizeKey) => {
    setState((prev) => {
      const ordersStore = structuredClone(prev.ordersStore);
      const ord = ordersStore[orderId];
      const styleData = ord?.styles[styleName];
      const sizeData = styleData?.sizes[sizeKey];
      if (!sizeData || sizeData.remaining <= 0) return prev;

      const generateCount = sizeData.remaining;
      const batchId = `BATCH-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.floor(1000 + Math.random() * 9000)}`;
      const newBarcodes = [];
      for (let i = 1; i <= generateCount; i++) {
        const serialStr = String(i).padStart(3, '0');
        const pieceCode = `${orderId}-${styleName.replace(/\s+/g, '_')}-${styleData.color.replace(/\s+/g, '_')}-${sizeKey}-${serialStr}`;
        newBarcodes.push({
          pieceCode, orderId, client: ord.client, style: styleName, color: styleData.color,
          size: sizeKey, serial: i, serialStr, batchNo: batchId,
          createdDate: new Date().toLocaleString(), generatedBy: 'AHMED KHAN', printStatus: 'PENDING', printCount: 0,
        });
      }
      sizeData.generated += generateCount;
      sizeData.remaining = 0;

      const historyEntry = {
        batchNo: batchId, orderId, client: ord.client, style: styleName, color: styleData.color,
        size: sizeKey, qty: generateCount, generatedBy: 'AHMED KHAN', createdDate: new Date().toLocaleString(), printStatus: 'PENDING',
      };

      return {
        ordersStore,
        generatedBarcodesStore: [...prev.generatedBarcodesStore, ...newBarcodes],
        batchHistoryStore: [historyEntry, ...prev.batchHistoryStore],
      };
    });
  }, []);

  const handleGenerateSize = useCallback((orderId, styleName, sizeKey) => {
    const sizeData = ordersStore[orderId]?.styles[styleName]?.sizes[sizeKey];
    if (!sizeData || sizeData.remaining <= 0) return;
    const qty = sizeData.remaining;
    generateSizeBarcodes(orderId, styleName, sizeKey);
    setSelectedSizeFilter(sizeKey);
    showToast(`Generated ${qty} barcodes for ${styleName} (Size ${sizeKey})!`, 'success');
  }, [ordersStore, generateSizeBarcodes, showToast]);

  const handleGenerateOverallSize = useCallback((orderId, sizeKey) => {
    const ord = ordersStore[orderId];
    let count = 0;
    Object.keys(ord.styles).forEach((st) => {
      if (ord.styles[st].sizes[sizeKey] && ord.styles[st].sizes[sizeKey].remaining > 0) {
        generateSizeBarcodes(orderId, st, sizeKey);
        count++;
      }
    });
    setSelectedSizeFilter(sizeKey);
    if (count > 0) showToast(`Generated Size ${sizeKey} barcodes across all styles!`, 'success');
    else showToast(`Size ${sizeKey} is already fully generated across all styles!`, 'info');
  }, [ordersStore, generateSizeBarcodes, showToast]);

  const handleGenerateAllSizes = useCallback((orderId, styleName) => {
    const ord = ordersStore[orderId];
    let count = 0;
    if (styleName === 'ALL_STYLES') {
      Object.keys(ord.styles).forEach((st) => {
        Object.keys(ord.styles[st].sizes).forEach((sz) => {
          if (ord.styles[st].sizes[sz].remaining > 0) { generateSizeBarcodes(orderId, st, sz); count++; }
        });
      });
    } else {
      const styleData = ord.styles[styleName];
      Object.keys(styleData.sizes).forEach((sz) => {
        if (styleData.sizes[sz].remaining > 0) { generateSizeBarcodes(orderId, styleName, sz); count++; }
      });
    }
    if (count > 0) showToast('Generated barcodes for all remaining sizes!', 'success');
    else showToast('All barcodes for this selection are already generated!', 'info');
  }, [ordersStore, generateSizeBarcodes, showToast]);

  // ─── EMPLOYEE generation handlers ───
  const generateEmployeeDept = useCallback((departmentName, employees) => {
    const alreadyGenIds = new Set(employeeStore.generated.filter((r) => r.client === departmentName).map((r) => r.size));
    const pending = employees.filter((e) => !alreadyGenIds.has(e.empId));
    if (pending.length === 0) { showToast(`${employees.length === 1 ? employees[0].name : 'These employees'} already ${employees.length === 1 ? 'has' : 'have'} a barcode!`, 'info'); return; }
    const batchId = `EMP-BATCH-${Date.now().toString().slice(-6)}`;
    const deptCode = departmentName.replace(/\s+/g, '_').toUpperCase();
    const newRecords = pending.map((emp, idx) => ({
      pieceCode: `EMP-${emp.empId}-${emp.name.replace(/\s+/g, '_').toUpperCase()}`,
      orderId: deptCode, client: departmentName, style: emp.name, color: emp.designation, size: emp.empId,
      serial: idx + 1, serialStr: String(idx + 1).padStart(3, '0'), batchNo: batchId,
      createdDate: new Date().toLocaleString(), generatedBy: 'AHMED KHAN', printStatus: 'PENDING', printCount: 0,
    }));
    const historyEntry = { batchNo: batchId, orderId: deptCode, client: departmentName, style: pending.length === 1 ? pending[0].name : `${pending.length} Employees`, color: pending.length === 1 ? pending[0].designation : '', size: pending.length === 1 ? pending[0].empId : '—', qty: pending.length, generatedBy: 'AHMED KHAN', createdDate: new Date().toLocaleString(), printStatus: 'PENDING' };
    setEmployeeStore((prev) => ({ generated: [...prev.generated, ...newRecords], history: [historyEntry, ...prev.history] }));
    showToast(pending.length === 1 ? `Generated barcode for ${pending[0].name}!` : `Generated ${pending.length} employee ID barcodes for ${departmentName}!`, 'success');
  }, [employeeStore, showToast]);

  const generateSelectedEmployees = useCallback((employees) => {
    if (employees.length === 0) { showToast('Check at least one employee to generate!', 'error'); return; }
    const byDept = new Map();
    employees.forEach((emp) => {
      if (!byDept.has(emp.department)) byDept.set(emp.department, []);
      byDept.get(emp.department).push(emp);
    });
    byDept.forEach((emps, dept) => generateEmployeeDept(dept, emps));
  }, [generateEmployeeDept, showToast]);

  const generateAllRemainingEmployees = useCallback(() => {
    const deptMap = new Map();
    EMPLOYEE_DIRECTORY.forEach((emp) => {
      if (!deptMap.has(emp.department)) deptMap.set(emp.department, []);
      deptMap.get(emp.department).push(emp);
    });
    let any = false;
    deptMap.forEach((employees, dept) => {
      const alreadyGenIds = new Set(employeeStore.generated.filter((r) => r.client === dept).map((r) => r.size));
      if (employees.some((e) => !alreadyGenIds.has(e.empId))) { generateEmployeeDept(dept, employees); any = true; }
    });
    if (!any) showToast('All employee ID barcodes have already been generated!', 'info');
  }, [employeeStore, generateEmployeeDept, showToast]);

  const sendEmployeesToPrintCenter = useCallback(() => {
    const codes = employeeStore.generated;
    if (codes.length === 0) { showToast('No employee barcodes available to send to Print Center!', 'error'); return; }
    setPrintSelections((prev) => { const next = new Set(prev.employee); codes.forEach((b) => next.add(b.pieceCode)); return { ...prev, employee: next }; });
    showToast(`Queued ${codes.length} employee barcodes to Print Center!`, 'success');
    setActiveTab('print');
  }, [employeeStore, showToast]);

  // ─── BUCKET generation handlers ───
  const generateBucketRange = useCallback((startNo, endNo) => {
    if (endNo < startNo) { showToast('End bucket number must be greater than or equal to the start!', 'error'); return; }
    const count = endNo - startNo + 1;
    const startStr = String(startNo).padStart(3, '0');
    const endStr = String(endNo).padStart(3, '0');
    const batchId = `BKT-BATCH-${Date.now().toString().slice(-6)}`;
    const rangeLabel = count === 1 ? `Bucket ${startStr}` : `Buckets ${startStr}–${endStr}`;
    const newRecords = [];
    for (let n = startNo; n <= endNo; n++) {
      const serialStr = String(n).padStart(3, '0');
      newRecords.push({
        pieceCode: `BKT-${serialStr}`,
        orderId: 'BUCKETS', client: 'Production Bucket Pool', style: rangeLabel, color: '', size: `Bucket #${serialStr}`,
        serial: n, serialStr, batchNo: batchId,
        createdDate: new Date().toLocaleString(), generatedBy: 'AHMED KHAN', printStatus: 'PENDING', printCount: 0,
      });
    }
    const historyEntry = { batchNo: batchId, orderId: 'BUCKETS', client: 'Production Bucket Pool', style: rangeLabel, color: '', size: `${count} buckets`, qty: count, generatedBy: 'AHMED KHAN', createdDate: new Date().toLocaleString(), printStatus: 'PENDING' };
    setBucketStore((prev) => ({ generated: [...prev.generated, ...newRecords], history: [historyEntry, ...prev.history] }));
    showToast(`Generated ${count} bucket barcodes (${rangeLabel})!`, 'success');
  }, [showToast]);

  const sendBucketsToPrintCenter = useCallback(() => {
    const codes = bucketStore.generated;
    if (codes.length === 0) { showToast('No bucket barcodes available to send to Print Center!', 'error'); return; }
    setPrintSelections((prev) => { const next = new Set(prev.bucket); codes.forEach((b) => next.add(b.pieceCode)); return { ...prev, bucket: next }; });
    showToast(`Queued ${codes.length} bucket barcodes to Print Center!`, 'success');
    setActiveTab('print');
  }, [bucketStore, showToast]);

  // ─── STYLE: send-to-print (order/style scoped) ───
  const handleSendToPrintCenter = useCallback((orderId, styleName, onlyVisible) => {
    let codes = generatedBarcodesStore.filter((b) => b.orderId === orderId && (styleName === 'ALL_STYLES' || b.style === styleName));
    if (onlyVisible && selectedSizeFilter !== 'ALL') codes = codes.filter((b) => b.size === selectedSizeFilter);
    if (codes.length === 0) { showToast('No barcodes available to send to Print Center!', 'error'); return; }
    setPrintSelections((prev) => { const next = new Set(prev.style); codes.forEach((b) => next.add(b.pieceCode)); return { ...prev, style: next }; });
    showToast(`Queued ${codes.length} barcodes to Print Center!`, 'success');
    setActiveTab('print');
  }, [generatedBarcodesStore, selectedSizeFilter, showToast]);

  // ─── Shared print/preview machinery (acts on whichever category is active) ───
  const markPrinted = useCallback((codes) => {
    if (category === 'style') {
      setState((prev) => ({ ...prev, generatedBarcodesStore: prev.generatedBarcodesStore.map((b) => codes.includes(b.pieceCode) ? { ...b, printStatus: 'PRINTED', printCount: b.printCount + 1 } : b) }));
    } else if (category === 'employee') {
      setEmployeeStore((prev) => ({ ...prev, generated: prev.generated.map((b) => codes.includes(b.pieceCode) ? { ...b, printStatus: 'PRINTED', printCount: b.printCount + 1 } : b) }));
    } else {
      setBucketStore((prev) => ({ ...prev, generated: prev.generated.map((b) => codes.includes(b.pieceCode) ? { ...b, printStatus: 'PRINTED', printCount: b.printCount + 1 } : b) }));
    }
  }, [category]);

  const executeThermalPrint = useCallback((codes) => {
    if (!codes || codes.length === 0) { showToast('Please select barcodes to print!', 'error'); return; }
    markPrinted(codes);
    setPreviewOpen(false);
    showToast(`Sending ${codes.length} thermal sticker labels to printer...`, 'success');
    setPrintSheetCodes(codes);
  }, [markPrinted, showToast]);

  const handlePrintSingle = useCallback((pieceCode) => {
    executeThermalPrint([pieceCode]);
  }, [executeThermalPrint]);

  const handleOpenPreview = useCallback(() => {
    if (activeSelectedPrint.size === 0) { showToast('Please select at least one barcode to preview/print!', 'error'); return; }
    setPreviewOpen(true);
  }, [activeSelectedPrint, showToast]);

  const handlePrintGroupDirect = useCallback((items) => {
    const codes = items.map((i) => i.pieceCode);
    setPrintSelections((prev) => { const next = new Set(prev[category]); codes.forEach((c) => next.add(c)); return { ...prev, [category]: next }; });
    setPreviewOpen(true);
  }, [category]);

  const handleExportCSV = useCallback((rows) => {
    const header = ['Batch No', 'Order ID', 'Client', 'Style', 'Color', 'Size', 'Qty', 'Generated By', 'Created Date', 'Print Status'];
    const csvRows = [header, ...rows.map((b) => [b.batchNo, b.orderId, b.client, b.style, b.color, b.size, b.qty, b.generatedBy, b.createdDate, b.printStatus])];
    const csv = csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `barcode-batch-history-${category}.csv`;
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [category]);

  // ─── History filter helpers (per category) ───
  const setHistoryFilter = useCallback((field, value) => setHistoryFiltersByCat((prev) => ({ ...prev, [category]: { ...prev[category], [field]: value } })), [category]);
  const resetHistoryFilters = useCallback(() => setHistoryFiltersByCat((prev) => ({ ...prev, [category]: { ...DEFAULT_HISTORY_FILTERS } })), [category]);

  const toggleExpandedOrder = useCallback((id) => setExpandedOrdersByCat((prev) => { const s = new Set(prev[category]); s.has(id) ? s.delete(id) : s.add(id); return { ...prev, [category]: s }; }), [category]);
  const toggleExpandedGroup = useCallback((key) => setExpandedGroupsByCat((prev) => { const s = new Set(prev[category]); s.has(key) ? s.delete(key) : s.add(key); return { ...prev, [category]: s }; }), [category]);
  const toggleExpandedHistoryOrder = useCallback((id) => setExpandedHistoryOrdersByCat((prev) => { const s = new Set(prev[category]); s.has(id) ? s.delete(id) : s.add(id); return { ...prev, [category]: s }; }), [category]);

  const styleHistoryOptions = useMemo(() => {
    const clients = new Set(); const styles = new Set(); const sizes = new Set();
    Object.values(ordersStore).forEach((o) => {
      clients.add(o.client);
      Object.entries(o.styles).forEach(([st, data]) => { styles.add(st); Object.keys(data.sizes).forEach((sz) => sizes.add(sz)); });
    });
    return {
      orderIds: Object.keys(ordersStore),
      clients: Array.from(clients),
      styles: Array.from(styles),
      sizes: Array.from(sizes).sort((a, b) => Number(a) - Number(b)),
      operators: Array.from(new Set(batchHistoryStore.map((b) => b.generatedBy))),
    };
  }, [ordersStore, batchHistoryStore]);

  const employeeHistoryOptions = useMemo(() => {
    const depts = Array.from(new Set(EMPLOYEE_DIRECTORY.map((e) => e.department)));
    return {
      orderIds: depts.map((d) => d.replace(/\s+/g, '_').toUpperCase()),
      clients: depts,
      styles: Array.from(new Set(EMPLOYEE_DIRECTORY.map((e) => e.name))),
      sizes: Array.from(new Set(EMPLOYEE_DIRECTORY.map((e) => e.empId))),
      operators: Array.from(new Set(employeeStore.history.map((b) => b.generatedBy))),
    };
  }, [employeeStore.history]);

  const bucketHistoryOptions = useMemo(() => ({
    orderIds: Array.from(new Set(bucketStore.history.map((b) => b.orderId))),
    clients: Array.from(new Set(bucketStore.history.map((b) => b.client))),
    styles: Array.from(new Set(bucketStore.history.map((b) => b.style))),
    sizes: Array.from(new Set(bucketStore.history.map((b) => b.size))),
    operators: Array.from(new Set(bucketStore.history.map((b) => b.generatedBy))),
  }), [bucketStore.history]);

  const activeHistoryOptions = category === 'style' ? styleHistoryOptions : category === 'employee' ? employeeHistoryOptions : bucketHistoryOptions;

  const handleViewFromHistory = useCallback((orderId, styleName) => {
    if (category === 'style') {
      setSelectedOrderId(orderId);
      setSelectedStyleName(styleName);
      setSelectedSizeFilter('ALL');
    }
    setActiveTab('generation');
  }, [category]);

  const handleReprintFromHistory = useCallback((b) => {
    setPrintSelections((prev) => { const next = new Set(activeGenerated.filter((x) => x.batchNo === b.batchNo).map((x) => x.pieceCode)); return { ...prev, [category]: next }; });
    setActiveTab('print');
    showToast(`Loaded batch ${b.batchNo} into Print Center!`, 'info');
  }, [activeGenerated, category, showToast]);

  const detailBarcode = detailCode ? activeGenerated.find((b) => b.pieceCode === detailCode) : null;

  return (
    <div className="space-y-6 animate-fade-in">
      <style jsx global>{`
        .btn-warm-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700;
          background: linear-gradient(135deg, #c8834a, #a86530); color: #fff; border: none;
          cursor: pointer; min-height: 48px; transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(200,131,74,0.25);
        }
        .btn-warm-primary:hover { background: linear-gradient(135deg, #a86530, #854d22); box-shadow: 0 4px 16px rgba(200,131,74,0.35); transform: translateY(-1px); }
        .btn-warm-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;
          background: #ffffff; color: #5a3518; border: 1.5px solid rgba(200,131,74,0.3);
          cursor: pointer; min-height: 48px; transition: all 0.2s ease;
        }
        .btn-warm-secondary:hover { background: #fdf6ee; border-color: #c8834a; }
        @media print {
          body * { visibility: hidden; }
          #thermalPrintSheet, #thermalPrintSheet * { visibility: visible; }
          #thermalPrintSheet { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 0; background: #fff !important; }
          .thermal-sticker-label { width: 50mm; height: 25mm; page-break-after: always; display: flex; flex-direction: column; align-items: center; justify-content: center; border: 1px dashed #ddd; margin: 0 auto 5mm auto; padding: 2mm; box-sizing: border-box; }
          .thermal-sticker-label canvas { max-width: 100%; max-height: 14mm; }
          .thermal-sticker-label .label-text { font-family: monospace; font-size: 7pt; font-weight: bold; color: #000; margin-top: 1mm; }
        }
      `}</style>

      <ToastStack toasts={toasts} />

      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: BRAND.accent }}>Production · Piece-Level Traceability</p>
        <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: BRAND.text }}>
          <Barcode className="w-8 h-8" style={{ color: BRAND.accent }} /> Barcode Management
        </h1>
        <p className="font-medium mt-0.5" style={{ color: BRAND.textMuted }}>{CATEGORY_SUBTITLES[category]}</p>
      </div>

      {/* ─── Category slider: Style / Employee / Bucket — each keeps its own data, never merged ─── */}
      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl w-fit flex-wrap" style={{ background: '#fff', border: `1px solid ${BRAND.border}` }}>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => switchCategory(c.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={isActive ? { background: BRAND.accent, color: '#fff', boxShadow: '0 4px 14px rgba(200,131,74,0.3)' } : { color: BRAND.textMuted }}
            >
              <Icon className="w-4 h-4" /> {c.label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-1.5 p-1.5 rounded-2xl w-fit" style={{ background: '#fff', border: `1px solid ${BRAND.border}` }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={isActive ? { background: BRAND.darkGrad, color: '#fff', boxShadow: '0 4px 14px rgba(61,43,26,0.25)' } : { color: BRAND.textMuted }}
            >
              <Icon className="w-4 h-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {activeTab === 'generation' && category === 'style' && (
        <GenerationTab
          ordersStore={ordersStore}
          selectedOrderId={selectedOrderId}
          setSelectedOrderId={setSelectedOrderId}
          selectedStyleName={selectedStyleName}
          setSelectedStyleName={setSelectedStyleName}
          selectedSizeFilter={selectedSizeFilter}
          setSelectedSizeFilter={setSelectedSizeFilter}
          generatedBarcodesStore={generatedBarcodesStore}
          gridSearch={gridSearch}
          setGridSearch={setGridSearch}
          onGenerateSize={handleGenerateSize}
          onGenerateOverallSize={handleGenerateOverallSize}
          onGenerateAllSizes={handleGenerateAllSizes}
          onSendToPrintCenter={handleSendToPrintCenter}
          onOpenDetail={setDetailCode}
          onPrintSingle={handlePrintSingle}
        />
      )}

      {activeTab === 'generation' && category === 'employee' && (
        <EmployeeGenerationTab
          employeeGenerated={employeeStore.generated}
          onGenerateSelected={generateSelectedEmployees}
          onGenerateAllRemaining={generateAllRemainingEmployees}
          onSendToPrintCenter={sendEmployeesToPrintCenter}
          onOpenDetail={setDetailCode}
          onPrintSingle={handlePrintSingle}
        />
      )}

      {activeTab === 'generation' && category === 'bucket' && (
        <BucketGenerationTab
          bucketGenerated={bucketStore.generated}
          onGenerateRange={generateBucketRange}
          onSendToPrintCenter={sendBucketsToPrintCenter}
          onOpenDetail={setDetailCode}
          onPrintSingle={handlePrintSingle}
        />
      )}

      {activeTab === 'print' && (
        <PrintTab
          generatedBarcodesStore={activeGenerated}
          selectedPrintBarcodes={activeSelectedPrint}
          expandedOrders={activeExpandedOrders}
          onToggleOrderExpand={toggleExpandedOrder}
          expandedGroups={activeExpandedGroups}
          onToggleExpand={toggleExpandedGroup}
          onToggleGroup={(items, checked) => setPrintSelections((prev) => { const next = new Set(prev[category]); items.forEach((i) => checked ? next.add(i.pieceCode) : next.delete(i.pieceCode)); return { ...prev, [category]: next }; })}
          onTogglePiece={(code, checked) => setPrintSelections((prev) => { const next = new Set(prev[category]); checked ? next.add(code) : next.delete(code); return { ...prev, [category]: next }; })}
          onSelectAll={() => setPrintSelections((prev) => ({ ...prev, [category]: new Set(activeGenerated.map((b) => b.pieceCode)) }))}
          onClearAll={() => setPrintSelections((prev) => ({ ...prev, [category]: new Set() }))}
          onOpenPreview={handleOpenPreview}
          onPrintGroupDirect={handlePrintGroupDirect}
          onOpenDetail={setDetailCode}
          onPrintSingle={handlePrintSingle}
          labels={activeLabels}
        />
      )}

      {activeTab === 'history' && (
        <HistoryTab
          batchHistoryStore={activeHistory}
          filters={activeHistoryFilters}
          setFilter={setHistoryFilter}
          resetFilters={resetHistoryFilters}
          options={activeHistoryOptions}
          onView={handleViewFromHistory}
          onReprint={handleReprintFromHistory}
          onExportCSV={() => handleExportCSV(activeHistory)}
          expandedOrders={activeExpandedHistoryOrders}
          onToggleOrderExpand={toggleExpandedHistoryOrder}
          labels={activeLabels}
        />
      )}

      <DetailModal barcode={detailBarcode} onClose={() => setDetailCode(null)} onPrint={handlePrintSingle} labels={activeLabels} />
      <PrintPreviewModal
        open={previewOpen}
        codes={Array.from(activeSelectedPrint)}
        onClose={() => setPreviewOpen(false)}
        onConfirm={() => executeThermalPrint(Array.from(activeSelectedPrint))}
      />

      <div id="thermalPrintSheet" ref={printSheetRef} style={{ display: 'none' }}>
        {printSheetCodes.map((code) => (
          <div className="thermal-sticker-label" key={code}>
            <BarcodeCanvas code={code} height={40} moduleWidth={1.1} showText={false} />
            <div className="label-text">{code}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
