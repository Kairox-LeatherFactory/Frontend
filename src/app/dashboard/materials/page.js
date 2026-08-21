'use client';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetMaterialSpec,
  apiGetMaterialLots,
  apiGetMaterialLot,
  apiCreateMaterialLot,
  apiPatchMaterialLot,
  apiAdjustMaterialLot,
  apiRetireMaterialLot,
  apiGetMaterialsStock,
  apiReceiveMaterials,
  apiCreateSupplierOrder,
  apiPatchSupplierOrder,
  apiPatchSupplierOrderSpec,
} from '@/lib/api';
import {
  Package, Search, Plus, Loader2, CheckCircle2, XCircle, AlertTriangle,
  ChevronRight, X, Truck, Pencil, Trash2, PackagePlus, Printer,
  Lock, ArrowUpRight, ArrowDownRight, Boxes, ChevronDown, Check,
} from 'lucide-react';

const CATEGORY_SUBTYPES = {
  LEATHER: [],
  LINING: ['PLAIN_LINING', 'RIBS', 'KNIT'],
  ACCESSORY: ['BUTTON', 'ZIP', 'THREAD', 'OTHER'],
};

// api-material.pdf §2 — the three permission tiers. Build every gate from these.
const STOCK_READERS = ['direct_manager', 'managing_director', 'hr', 'cutting_manager', 'stitching_manager', 'lining_manager', 'security', 'store_manager'];
const LOT_WRITERS = ['direct_manager', 'managing_director', 'cutting_manager', 'lining_manager'];
const DM_ONLY = ['direct_manager', 'managing_director'];

// The safe renderer the guide prescribes for the two 422 shapes.
function errMsg(e) {
  if (!e) return 'Something went wrong.';
  if (Array.isArray(e.detail)) return e.detail.map((d) => d.msg).join(', ');
  return e.message || 'Something went wrong.';
}

function Toast({ msg, type, onClose }) {
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [msg, onClose]);
  if (!msg) return null;
  const isSuccess = type !== 'error';
  return (
    <div className="fixed bottom-6 right-6 z-[999999] animate-fade-in max-w-sm">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-start gap-3 border ${isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
        <span>{msg}</span>
      </div>
    </div>
  );
}

function Tile({ label, value, uom, primary }) {
  return (
    <div className={`flex-1 min-w-[140px] p-4 rounded-2xl border ${primary ? 'bg-[#c8834a]/10' : 'bg-slate-50'}`} style={{ borderColor: primary ? '#c8834a' : 'rgba(200,131,74,0.15)' }}>
      <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: primary ? '#a86022' : '#9a7a5a' }}>{label}</div>
      <div className={`font-black mt-1 ${primary ? 'text-2xl' : 'text-xl'}`} style={{ color: '#2d1f0e' }}>
        {Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-bold" style={{ color: '#9a7a5a' }}>{uom}</span>
      </div>
    </div>
  );
}

// Native <select> option popups size themselves to their widest option text,
// independent of the closed control's own (responsive) width, and can render
// past the viewport edge on a tablet — this is a fully custom dropdown
// instead: the open panel is pinned left:0/right:0 against its own button,
// so its width always matches the button's own (already on-screen) width.
function ScreenSafeSelect({ value, options, onChange, placeholder, className }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${className} flex items-center justify-between gap-2 text-left cursor-pointer`}
        style={{ borderColor: 'rgba(200,131,74,0.2)' }}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-white shadow-lg py-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
          {options.map((opt, idx) => (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold truncate cursor-pointer hover:bg-[#faf6f0] ${value === opt.value ? 'text-[#c8834a] bg-[#fff3e8]' : 'text-slate-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Selectable Filter Combobox — a rich selectable dropdown and searchable filter
// populated with live data on file (articles, colours, thicknesses, sizes, lots).
// Supports one-click selection from dropdown, search filtering, clear button (X),
// and typing custom values.
function SelectableFilterCombobox({
  value,
  onChange,
  options = [],
  placeholder = 'Select or type…',
  className = '',
  onSelectLot,
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const q = search.toLowerCase().trim();
  const filtered = useMemo(() => {
    if (!q) return options;
    return options.filter((opt) => {
      const text = typeof opt === 'string' ? opt : `${opt.label || ''} ${opt.value || ''} ${opt.sub || ''}`;
      return text.toLowerCase().includes(q);
    });
  }, [options, q]);

  return (
    <div className="relative min-w-[140px] flex-1" ref={ref}>
      <div className="relative flex items-center">
        <input
          value={value || ''}
          onChange={(e) => {
            onChange(e.target.value);
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => {
            setSearch('');
            setOpen(true);
          }}
          placeholder={placeholder}
          autoComplete="off"
          className={`w-full h-9 pl-3 pr-14 bg-slate-50 border rounded-lg text-xs font-bold outline-none transition-colors focus:border-[#c8834a] focus:bg-white ${className}`}
          style={{ borderColor: 'rgba(200,131,74,0.2)' }}
        />
        <div className="absolute right-1 flex items-center gap-0.5">
          {value ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
                setSearch('');
              }}
              className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              title="Clear"
            >
              <X className="w-3 h-3" />
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="p-1 rounded-md text-slate-400 hover:text-[#c8834a] cursor-pointer"
            tabIndex={-1}
          >
            <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-150 ${open ? 'rotate-180 text-[#c8834a]' : ''}`} />
          </button>
        </div>
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 z-[100] mt-1 max-h-64 overflow-y-auto rounded-xl border bg-white shadow-xl py-1 divide-y divide-slate-100 min-w-[190px]"
          style={{ borderColor: 'rgba(200,131,74,0.25)' }}
        >
          {filtered.length > 0 ? (
            filtered.map((opt, idx) => {
              const val = typeof opt === 'string' ? opt : opt.value;
              const lbl = typeof opt === 'string' ? opt : (opt.label || opt.value);
              const sub = typeof opt === 'object' ? opt.sub : null;
              const isSelected = value === val;
              return (
                <button
                  key={`${val}-${idx}`}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange(val);
                    if (onSelectLot && opt.lot) onSelectLot(opt.lot);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-3 py-2 text-xs font-bold transition-colors cursor-pointer flex items-center justify-between gap-2 hover:bg-[#faf6f0] ${
                    isSelected ? 'text-[#c8834a] bg-[#fff3e8]' : 'text-slate-700'
                  }`}
                >
                  <div className="min-w-0 flex-1 truncate">
                    <span className="block truncate">{lbl}</span>
                    {sub && <span className="block text-[10px] font-medium text-slate-400 truncate">{sub}</span>}
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#c8834a] shrink-0" />}
                </button>
              );
            })
          ) : (
            <div className="px-3 py-2 text-[11px] font-bold text-slate-400 text-center">
              {q ? `Use custom: "${q}"` : 'No items on file'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Strict lot picker — must resolve to a real existing lot (Receiving posts
// against a specific lot_id, unlike Article/Colour above which can
// legitimately be brand new). Typing filters the list by barcode / article /
// colour / thickness / size; only clicking a listed row actually selects one.
function LotPickerCombobox({ value, lots, selectedLabel, onSelect, placeholder }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = lots.find((l) => l.lot_id === value);
  const q = query.toLowerCase().trim();
  const filtered = !q ? lots : lots.filter((l) =>
    `${l.barcode || ''} ${l.article || ''} ${l.colour || ''} ${l.thickness || ''} ${l.size || ''}`.toLowerCase().includes(q)
  );
  const closedLabel = selected
    ? `${selected.barcode} — ${selected.article} · ${selected.colour}`
    : (value ? (selectedLabel || value) : null);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-9 px-3 bg-white border rounded-lg text-xs font-bold outline-none flex items-center justify-between gap-2 text-left cursor-pointer"
        style={{ borderColor: 'rgba(200,131,74,0.2)' }}
      >
        <span className={`truncate ${closedLabel ? '' : 'text-slate-400'}`}>{closedLabel || placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 rounded-xl border bg-white shadow-lg p-2 space-y-1" style={{ borderColor: '#c8834a' }}>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search barcode, article, colour…"
            className="w-full h-8 px-2 bg-[#faf6f0] border rounded-lg text-xs font-bold outline-none"
            style={{ borderColor: 'rgba(200,131,74,0.2)' }}
          />
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filtered.length === 0 && <div className="p-2 text-center text-[11px] font-bold text-slate-400">No lots match.</div>}
            {filtered.slice(0, 100).map((l) => (
              <button
                key={l.lot_id}
                type="button"
                onClick={() => { onSelect(l); setOpen(false); setQuery(''); }}
                className={`w-full p-2 text-left rounded-lg text-xs cursor-pointer transition-colors ${value === l.lot_id ? 'bg-[#c8834a] text-white' : 'hover:bg-amber-50 text-slate-800'}`}
              >
                <div className="font-mono font-black">{l.barcode}</div>
                <div className={`text-[10px] font-bold ${value === l.lot_id ? 'text-amber-100' : 'text-slate-400'}`}>
                  {l.article} · {l.colour}{l.thickness ? ` · ${l.thickness}` : ''}{l.size ? ` · ${l.size}` : ''} — {l.available} {l.uom} avail
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CategoryPicker({ category, subtype, onCategory, onSubtype, subtypeRequired }) {
  const subs = CATEGORY_SUBTYPES[category] || [];
  return (
    <div className="flex flex-wrap gap-2">
      <div className="w-36">
        <ScreenSafeSelect
          value={category}
          onChange={onCategory}
          placeholder="Category…"
          className="w-full h-10 px-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
          options={[
            { value: 'LEATHER', label: 'LEATHER' },
            { value: 'LINING', label: 'LINING' },
            { value: 'ACCESSORY', label: 'ACCESSORY' },
          ]}
        />
      </div>
      {subs.length > 0 && (
        <div className="w-64">
          <ScreenSafeSelect
            value={subtype}
            onChange={onSubtype}
            placeholder={subtypeRequired ? 'Subtype (required)…' : 'Subtype (optional → PLAIN_LINING)…'}
            className="w-full h-10 px-3 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
            options={subs.map((s) => ({ value: s, label: s }))}
          />
        </div>
      )}
    </div>
  );
}

// ── Screen A — Stock Hub ──────────────────────────────────────────────
function StockHubScreen({ token, showToast, canOrder, onOpenOrder, canEdit, canAdjust, onReceive }) {
  const [category, setCategory] = useState('LEATHER');
  const [subtype, setSubtype] = useState('');
  const [spec, setSpec] = useState(null);
  const [filters, setFilters] = useState({ article: '', colour: '', thickness: '', size: '' });
  const [stock, setStock] = useState(null);
  const [required, setRequired] = useState('');
  const [loading, setLoading] = useState(false);
  const [lots, setLots] = useState([]);
  const [availableLots, setAvailableLots] = useState([]);
  const [detailLot, setDetailLot] = useState(null);

  const openDetail = async (lotId) => {
    try {
      const full = await apiGetMaterialLot(token, lotId);
      setDetailLot(full);
    } catch (e) { showToast(errMsg(e), 'error'); }
  };

  useEffect(() => {
    if (!category) return;
    apiGetMaterialSpec(token, { category, subtype }).then(setSpec).catch(() => setSpec(null));
  }, [token, category, subtype]);

  // Load all available lots for this category/subtype to feed filter dropdowns
  useEffect(() => {
    if (!category) { setAvailableLots([]); return; }
    apiGetMaterialLots(token, { category, subtype: subtype || undefined })
      .then((res) => setAvailableLots(res?.lots || []))
      .catch(() => setAvailableLots([]));
  }, [token, category, subtype]);

  const getFilterOptions = (field) => {
    if (!availableLots.length) return [];
    if (field === 'article') {
      const map = new Map();
      availableLots.forEach((l) => {
        if (!l.article) return;
        if (!map.has(l.article)) {
          map.set(l.article, { count: 0, avail: 0, uom: l.uom || '' });
        }
        const item = map.get(l.article);
        item.count += 1;
        item.avail += (Number(l.available) || 0);
      });
      return Array.from(map.entries()).map(([art, info]) => ({
        value: art,
        label: art,
        sub: `${info.count} lot(s) · ${info.avail.toFixed(1)} ${info.uom} avail`,
      }));
    }
    if (field === 'colour') {
      const filtered = filters.article
        ? availableLots.filter((l) => l.article?.toLowerCase() === filters.article.toLowerCase())
        : availableLots;
      const set = new Set(filtered.map((l) => l.colour).filter(Boolean));
      return Array.from(set).sort().map((c) => ({ value: c, label: c }));
    }
    if (field === 'thickness') {
      const set = new Set(availableLots.map((l) => l.thickness).filter(Boolean));
      return Array.from(set).sort().map((t) => ({ value: t, label: t }));
    }
    if (field === 'size') {
      const set = new Set(availableLots.map((l) => l.size).filter(Boolean));
      return Array.from(set).sort().map((s) => ({ value: s, label: s }));
    }
    return [];
  };

  const runCheck = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const params = { category, subtype: subtype || undefined, ...filters };
      if (required !== '') params.required = required;
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const [stockRes, lotsRes] = await Promise.all([
        apiGetMaterialsStock(token, params),
        apiGetMaterialLots(token, params),
      ]);
      setStock(stockRes);
      setLots(lotsRes.lots || []);
    } catch (e) {
      showToast(errMsg(e), 'error');
    } finally {
      setLoading(false);
    }
  }, [token, category, subtype, filters, required, showToast]);

  useEffect(() => { runCheck(); }, [category, subtype]); // eslint-disable-line react-hooks/exhaustive-deps

  const shortBy = stock?.short_by ?? 0;

  return (
    <div className="space-y-5">
      <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <CategoryPicker
          category={category}
          subtype={subtype}
          onCategory={(c) => { setCategory(c); setSubtype(''); setFilters({ article: '', colour: '', thickness: '', size: '' }); }}
          onSubtype={(s) => { setSubtype(s); setFilters({ article: '', colour: '', thickness: '', size: '' }); }}
          subtypeRequired={category === 'ACCESSORY'}
        />
        {spec && spec.filters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {spec.filters.map((f) => (
              <SelectableFilterCombobox
                key={f}
                placeholder={`Filter ${f[0].toUpperCase() + f.slice(1)}…`}
                value={filters[f] || ''}
                onChange={(val) => setFilters((p) => ({ ...p, [f]: val }))}
                options={getFilterOptions(f)}
              />
            ))}
            <button onClick={runCheck} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1.5 shrink-0" style={{ background: '#c8834a' }}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Check
            </button>
          </div>
        )}
      </div>

      {stock && (
        <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div className="flex flex-wrap gap-3">
            <Tile label="On Hand" value={stock.on_hand} uom={stock.uom} />
            <Tile label="Reserved" value={stock.reserved} uom={stock.uom} />
            <Tile label="Available" value={stock.available} uom={stock.uom} primary />
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
            <input type="number" placeholder="Required qty…" value={required} onChange={(e) => setRequired(e.target.value)}
              className="h-9 w-40 px-3 bg-slate-50 border rounded-lg text-xs font-bold outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
            <button onClick={runCheck} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white" style={{ background: '#c8834a' }}>Check Shortfall</button>
            {stock.required !== undefined && stock.required !== null && (
              shortBy > 0 ? (
                <div className="flex items-center gap-2 ml-auto p-2.5 rounded-xl bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="text-xs font-bold text-red-700">Short by {shortBy.toFixed(1)} {stock.uom}</span>
                  {canOrder && (
                    <button onClick={() => onOpenOrder({ category, subtype, article: filters.article, colour: filters.colour, thickness: filters.thickness, qty: shortBy, supplier_id: stock.suggested_supplier?.id })}
                      className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1" style={{ background: '#dc2626' }}>
                      <Truck className="w-3.5 h-3.5" /> Order {stock.suggested_supplier ? `via ${stock.suggested_supplier.name}` : ''}
                    </button>
                  )}
                </div>
              ) : (
                <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Covers requirement</span>
              )
            )}
          </div>
        </div>
      )}

      {(() => {
        // Hub's job is "glance and alert", not "browse" — that's the Lots
        // screen. Only surface the lots that actually need a look: zero
        // available, or can't cover the typed requirement.
        const attention = lots
          .filter((l) => l.available === 0 || l.covers_required === false)
          .sort((a, b) => a.available - b.available)
          .slice(0, 5);
        // A spec with ZERO lots at all is the worst case, not a healthy
        // one — an empty `lots` array can't produce any per-lot attention
        // rows, so without this the panel wrongly said "healthy" right
        // under a red "short by 99999999999999 mtrs" banner above it.
        const hasShortfall = stock?.required !== undefined && stock?.required !== null && shortBy > 0;
        const trulyHealthy = attention.length === 0 && !hasShortfall;
        return (
          <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <div className="p-4 border-b font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Needs Attention
            </div>
            {attention.length > 0 ? (
              <div className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
                {attention.map((l) => (
                  <div key={l.lot_id} onClick={() => openDetail(l.lot_id)}
                    className={`p-3 flex items-center gap-3 text-xs cursor-pointer hover:brightness-95 ${l.available === 0 ? 'bg-red-50/40' : 'bg-amber-50/40'}`}>
                    <span className="font-mono font-bold text-slate-500 w-24 shrink-0">{l.barcode}</span>
                    <span className="font-black text-slate-800 flex-1 min-w-0 truncate">{l.article} · {l.colour}{l.thickness ? ` · ${l.thickness}` : ''}{l.size ? ` · ${l.size}` : ''}</span>
                    <span className={`font-black w-28 text-right ${l.available === 0 ? 'text-red-500' : 'text-amber-600'}`}>{l.available.toFixed(1)} {l.uom} avail</span>
                    {l.covers_required === false && <span className="text-[9px] font-black uppercase text-amber-600 shrink-0">Short</span>}
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                  </div>
                ))}
              </div>
            ) : trulyHealthy ? (
              <div className="p-6 text-center text-xs font-bold text-emerald-600 flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Every lot in this spec looks healthy.</div>
            ) : (
              <div className="p-4 text-xs font-bold text-red-700 bg-red-50/40 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                No lots exist for this spec at all — short by {shortBy.toFixed(1)} {stock.uom}. Use Add Material to create one, or widen the filters above.
              </div>
            )}
          </div>
        );
      })()}

      {detailLot && (
        <LotDetail token={token} lot={detailLot} onClose={() => setDetailLot(null)} showToast={showToast}
          canEdit={canEdit} canAdjust={canAdjust}
          onReceive={onReceive ? (lot) => { onReceive({ lotId: lot.lot_id, article: lot.article }); } : null}
          onChanged={() => { runCheck(); openDetail(detailLot.lot_id); }} />
      )}
    </div>
  );
}

// ── Screen B — Lot List & Detail ──────────────────────────────────────
function LotDetail({ token, lot, onClose, onChanged, showToast, canEdit, canAdjust, onReceive }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [retiring, setRetiring] = useState(false);

  useEffect(() => {
    setForm(Object.fromEntries((lot.editable_fields || []).map((f) => [f, lot[f] ?? ''])));
    setEditing(false); setAdjusting(false); setDelta(''); setReason(''); setConfirmRetire(false);
  }, [lot.lot_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== (lot[k] ?? '')));
      await apiPatchMaterialLot(token, lot.lot_id, changed);
      showToast('Lot updated.', 'success');
      setEditing(false);
      onChanged();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setSaving(false); }
  };

  const handleAdjust = async (sign) => {
    const n = Number(delta);
    if (!n) { showToast('Enter a non-zero amount.', 'error'); return; }
    setAdjusting(true);
    try {
      await apiAdjustMaterialLot(token, lot.lot_id, { delta: sign * Math.abs(n), reason });
      showToast('Stock adjusted.', 'success');
      setDelta(''); setReason('');
      onChanged();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setAdjusting(false); }
  };

  const handleRetire = async () => {
    setRetiring(true);
    try {
      const res = await apiRetireMaterialLot(token, lot.lot_id);
      showToast(res.message, 'success');
      onChanged();
      onClose();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setRetiring(false); }
  };

  // Rendered inline, `fixed inset-0` was resolving against the nearest
  // ancestor with a transform (the page's own animate-fade-in wrapper),
  // not the viewport — so the modal opened off-screen, below the fold.
  // Porting straight to document.body escapes that and centers it for real.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div>
            <div className="font-mono text-[10px] font-bold text-slate-400">{lot.barcode}</div>
            <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{lot.article} · {lot.colour}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {!lot.is_active && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-xs font-black text-slate-500 flex items-center gap-2">
              <Lock className="w-4 h-4" /> RETIRED — read-only. Barcode no longer scans; cut history is preserved.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Tile label="On Hand" value={lot.on_hand} uom={lot.uom} />
            <Tile label="Reserved" value={lot.reserved} uom={lot.uom} />
            <Tile label="Available" value={lot.available} uom={lot.uom} primary />
          </div>

          <div className="text-xs font-bold text-slate-500">
            {lot.category}{lot.subtype ? ` / ${lot.subtype}` : ''}{lot.thickness ? ` · ${lot.thickness}` : ''}{lot.size ? ` · ${lot.size}` : ''}
          </div>

          {lot.is_active && canEdit && (
            <div className="p-3 rounded-xl bg-slate-50 border space-y-2" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Identity</span>
                {!editing && <button onClick={() => setEditing(true)} className="text-[10px] font-black uppercase flex items-center gap-1" style={{ color: '#c8834a' }}><Pencil className="w-3 h-3" /> Edit</button>}
              </div>
              {editing ? (
                <>
                  {(lot.editable_fields || []).map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-20 shrink-0 capitalize">{f.replace('_', ' ')}</span>
                      <input value={form[f] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} className="flex-1 h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white disabled:opacity-50" style={{ background: '#c8834a' }}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}</button>
                    <button onClick={() => setEditing(false)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                  </div>
                </>
              ) : (
                <div className="text-xs font-bold text-slate-600">Supplier: {lot.supplier_name || lot.supplier_id || '—'}{lot.supplier_name && lot.supplier_id ? ` (${lot.supplier_id})` : ''}</div>
              )}
            </div>
          )}

          {lot.is_active && canAdjust && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Adjust Stock — not a total, a movement</span>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Amount" value={delta} onChange={(e) => setDelta(e.target.value)} className="w-24 h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                <button onClick={() => handleAdjust(1)} disabled={adjusting || !delta || !reason.trim()} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-emerald-500 disabled:opacity-40 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> Add</button>
                <button onClick={() => handleAdjust(-1)} disabled={adjusting || !delta || !reason.trim()} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-red-500 disabled:opacity-40 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5" /> Remove</button>
              </div>
              <input placeholder="Reason (required, 3–300 chars)…" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
          )}

          {lot.is_active && canAdjust && onReceive && (
            <button onClick={() => onReceive(lot)} className="w-full h-9 rounded-xl font-black text-[10px] uppercase text-white flex items-center justify-center gap-1.5" style={{ background: '#c8834a' }}>
              <PackagePlus className="w-3.5 h-3.5" /> Receive More Stock
            </button>
          )}

          {lot.is_active && canAdjust && (
            confirmRetire ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <p className="text-xs font-bold text-red-700">Retire this lot? Its barcode stops scanning; cut history stays. This is not a delete.</p>
                <div className="flex gap-2">
                  <button onClick={handleRetire} disabled={retiring} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white bg-red-600 disabled:opacity-50">{retiring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Retire'}</button>
                  <button onClick={() => setConfirmRetire(false)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmRetire(true)} className="w-full h-9 rounded-xl font-black text-[10px] uppercase text-red-600 bg-red-50 border border-red-200 flex items-center justify-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Retire Lot
              </button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

function LotListScreen({ token, showToast, canEdit, canAdjust, onReceive }) {
  const [category, setCategory] = useState('LEATHER');
  const [subtype, setSubtype] = useState('');
  const [spec, setSpec] = useState(null);
  const [filters, setFilters] = useState({ article: '', colour: '', thickness: '', size: '' });
  const [lots, setLots] = useState([]);
  const [availableLots, setAvailableLots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    if (!category) return;
    apiGetMaterialSpec(token, { category, subtype }).then(setSpec).catch(() => setSpec(null));
  }, [token, category, subtype]);

  useEffect(() => {
    if (!category) { setAvailableLots([]); return; }
    apiGetMaterialLots(token, { category, subtype: subtype || undefined })
      .then((res) => setAvailableLots(res?.lots || []))
      .catch(() => setAvailableLots([]));
  }, [token, category, subtype]);

  const getFilterOptions = (field) => {
    if (!availableLots.length) return [];
    if (field === 'article') {
      const set = new Set(availableLots.map((l) => l.article).filter(Boolean));
      return Array.from(set).sort().map((a) => ({ value: a, label: a }));
    }
    if (field === 'colour') {
      const filtered = filters.article
        ? availableLots.filter((l) => l.article?.toLowerCase() === filters.article.toLowerCase())
        : availableLots;
      const set = new Set(filtered.map((l) => l.colour).filter(Boolean));
      return Array.from(set).sort().map((c) => ({ value: c, label: c }));
    }
    if (field === 'thickness') {
      const set = new Set(availableLots.map((l) => l.thickness).filter(Boolean));
      return Array.from(set).sort().map((t) => ({ value: t, label: t }));
    }
    if (field === 'size') {
      const set = new Set(availableLots.map((l) => l.size).filter(Boolean));
      return Array.from(set).sort().map((s) => ({ value: s, label: s }));
    }
    return [];
  };

  const load = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const params = { category, subtype: subtype || undefined, ...filters };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await apiGetMaterialLots(token, params);
      setLots(res.lots || []);
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [token, category, subtype, filters, showToast]);

  useEffect(() => { load(); }, [category, subtype]); // eslint-disable-line react-hooks/exhaustive-deps

  const [detailLot, setDetailLot] = useState(null);
  const openDetail = async (lotId) => {
    setSelectedId(lotId);
    try {
      const full = await apiGetMaterialLot(token, lotId);
      setDetailLot(full);
    } catch (e) { showToast(errMsg(e), 'error'); }
  };

  return (
    <div className="space-y-5">
      {/* Pill-based browsing, not a form — this screen is "look through
          everything", Stock Hub is "check one spec". */}
      <div className="flex flex-wrap gap-2">
        {['LEATHER', 'LINING', 'ACCESSORY'].map((c) => (
          <button key={c} onClick={() => { setCategory(c); setSubtype(''); setFilters({ article: '', colour: '', thickness: '', size: '' }); }}
            className={`h-9 px-4 rounded-full font-black text-xs uppercase transition-all ${category === c ? 'text-white shadow-sm' : 'text-slate-500 bg-white border'}`}
            style={category === c ? { background: '#c8834a' } : { borderColor: 'rgba(200,131,74,0.2)' }}>
            {c}
          </button>
        ))}
        {(CATEGORY_SUBTYPES[category] || []).map((s) => (
          <button key={s} onClick={() => { setSubtype(subtype === s ? '' : s); setFilters({ article: '', colour: '', thickness: '', size: '' }); }}
            className={`h-9 px-3 rounded-full font-bold text-[11px] transition-all ${subtype === s ? 'text-white' : 'text-slate-400 bg-slate-50'}`}
            style={subtype === s ? { background: '#a86022' } : {}}>
            {s}
          </button>
        ))}
      </div>

      {spec && spec.filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-2xl border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          {spec.filters.map((f) => (
            <SelectableFilterCombobox
              key={f}
              placeholder={`Filter ${f[0].toUpperCase() + f.slice(1)}…`}
              value={filters[f] || ''}
              onChange={(val) => setFilters((p) => ({ ...p, [f]: val }))}
              options={getFilterOptions(f)}
              className="bg-white"
            />
          ))}
          <button onClick={load} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1.5 ml-auto" style={{ background: '#c8834a' }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Refine'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-[10px] font-black uppercase tracking-wider text-slate-400" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <th className="p-3">Barcode</th><th className="p-3">Article</th><th className="p-3">Colour</th><th className="p-3">Spec</th>
              <th className="p-3 text-right">On Hand</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Available</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
            {lots.map((l) => (
              <tr key={l.lot_id} onClick={() => openDetail(l.lot_id)} className={`cursor-pointer hover:bg-amber-50/40 ${selectedId === l.lot_id ? 'bg-amber-50/60' : ''}`}>
                <td className="p-3 font-mono font-bold text-slate-500">{l.barcode}</td>
                <td className="p-3 font-black text-slate-800">{l.article}</td>
                <td className="p-3 text-slate-600">{l.colour}</td>
                <td className="p-3 text-slate-500">{l.thickness || l.size || '—'}</td>
                <td className="p-3 text-right font-bold">{l.on_hand.toFixed(1)}</td>
                <td className="p-3 text-right font-bold text-amber-600">{l.reserved.toFixed(1)}</td>
                <td className={`p-3 text-right font-black ${l.available === 0 ? 'text-red-500' : 'text-emerald-600'}`}>{l.available.toFixed(1)} {l.uom}</td>
                <td className="p-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
              </tr>
            ))}
            {lots.length === 0 && !loading && (
              <tr><td colSpan={8} className="p-6 text-center text-xs font-bold text-slate-400">No lots match. Available:0 rows are shown normally here, not hidden.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detailLot && (
        <LotDetail token={token} lot={detailLot} onClose={() => setDetailLot(null)} showToast={showToast}
          canEdit={canEdit} canAdjust={canAdjust}
          onReceive={onReceive ? (lot) => { onReceive({ lotId: lot.lot_id, article: lot.article }); } : null}
          onChanged={() => { load(); openDetail(detailLot.lot_id); }} />
      )}
    </div>
  );
}

// ── Screen C — Add New Material ───────────────────────────────────────
function AddMaterialScreen({ token, showToast, onDuplicate }) {
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');
  const [spec, setSpec] = useState(null);
  const [article, setArticle] = useState('');
  const [colour, setColour] = useState('');
  const [attrs, setAttrs] = useState({});
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [availableLots, setAvailableLots] = useState([]);

  useEffect(() => {
    if (!category) { setSpec(null); setAvailableLots([]); return; }
    if (category === 'ACCESSORY' && !subtype) { setSpec(null); setAvailableLots([]); return; }
    apiGetMaterialSpec(token, { category, subtype }).then(setSpec).catch(() => setSpec(null));
    apiGetMaterialLots(token, { category, subtype: subtype || undefined })
      .then((res) => setAvailableLots(res?.lots || []))
      .catch(() => setAvailableLots([]));
  }, [token, category, subtype]);

  // Derive unique article options with lot details
  const articleOptions = useMemo(() => {
    if (!availableLots.length) return [];
    const map = new Map();
    availableLots.forEach((l) => {
      if (!l.article) return;
      if (!map.has(l.article)) {
        map.set(l.article, { count: 0, avail: 0, uom: l.uom || '', colours: new Set(), lot: l });
      }
      const item = map.get(l.article);
      item.count += 1;
      item.avail += (Number(l.available) || 0);
      if (l.colour) item.colours.add(l.colour);
    });
    return Array.from(map.entries()).map(([art, info]) => ({
      value: art,
      label: art,
      sub: `${info.count} lot(s) · ${info.avail.toFixed(1)} ${info.uom} · Colours: ${Array.from(info.colours).slice(0, 3).join(', ')}`,
      lot: info.lot,
    }));
  }, [availableLots]);

  // Derive unique colour options for selected article
  const colourOptions = useMemo(() => {
    const filtered = article
      ? availableLots.filter((l) => l.article?.toLowerCase() === article.toLowerCase())
      : availableLots;
    const set = new Set(filtered.map((l) => l.colour).filter(Boolean));
    return Array.from(set).sort().map((c) => ({ value: c, label: c }));
  }, [availableLots, article]);

  // Derive attribute options (thickness, size)
  const getAttrOptions = (attrKey) => {
    const set = new Set(availableLots.map((l) => l[attrKey] || l.attributes?.[attrKey]).filter(Boolean));
    return Array.from(set).sort().map((v) => ({ value: v, label: String(v) }));
  };

  // Quick Lot auto-population
  const handleQuickPickLot = (lot) => {
    if (!lot) return;
    if (lot.article) setArticle(lot.article);
    if (lot.colour) setColour(lot.colour);
    const newAttrs = { ...attrs };
    if (lot.thickness) newAttrs.thickness = lot.thickness;
    if (lot.size) newAttrs.size = lot.size;
    setAttrs(newAttrs);
    if (lot.supplier_id) setSupplierId(lot.supplier_id);
    if (lot.supplier_name) setSupplierName(lot.supplier_name);
  };

  const canSubmit = spec && spec.required_to_add.length >= 0 && article.trim() && colour.trim()
    && spec.required_to_add.every((k) => attrs[k] !== undefined && attrs[k] !== '');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await apiCreateMaterialLot(token, {
        category, subtype: subtype || undefined, article: article.trim(), colour: colour.trim(),
        attributes: attrs, supplier_id: supplierId || undefined,
        supplier_name: supplierName || undefined,
      });
      setResult(res);
    } catch (e) {
      showToast(errMsg(e), 'error');
      if (e.status === 409 && onDuplicate) {
        try {
          const params = { category, subtype: subtype || undefined, article: article.trim(), colour: colour.trim(), thickness: attrs.thickness || undefined, size: attrs.size || undefined };
          Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
          const res = await apiGetMaterialLots(token, params);
          const existing = res.lots?.[0];
          if (existing) onDuplicate({ lotId: existing.lot_id, article: existing.article });
        } catch {
          // Lookup failed
        }
      }
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border text-center space-y-4 max-w-md mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>Lot Created</h3>
        <div className="p-4 rounded-2xl bg-slate-50 border font-mono text-2xl font-black tracking-wider" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>{result.lot_barcode}</div>
        <p className="text-xs font-bold text-slate-500">{result.article} · {result.colour} — {result.on_hand} {result.uom} on hand</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => window.print()} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-white flex items-center gap-2" style={{ background: '#c8834a' }}><Printer className="w-4 h-4" /> Print Label</button>
          <button onClick={() => { setResult(null); setCategory(''); setSubtype(''); setArticle(''); setColour(''); setAttrs({}); setSupplierId(''); setSupplierName(''); }} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-slate-600 bg-slate-100">Add Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-5 max-w-xl mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Step 1 — Class</div>
        <CategoryPicker category={category} subtype={subtype} onCategory={(c) => { setCategory(c); setSubtype(''); setAttrs({}); setArticle(''); setColour(''); }} onSubtype={(s) => { setSubtype(s); setAttrs({}); setArticle(''); setColour(''); }} subtypeRequired={category === 'ACCESSORY'} />
      </div>

      {spec && (
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          {availableLots.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#faf6f0] border border-[#c8834a]/25 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#a86022] flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" /> Quick Autofill from Existing Lot on File
              </span>
              <SelectableFilterCombobox
                placeholder="Choose existing Lot barcode / Material to autofill spec…"
                value=""
                onChange={() => {}}
                onSelectLot={handleQuickPickLot}
                options={availableLots.map((l) => ({
                  value: l.lot_id,
                  label: `${l.barcode} — ${l.article} · ${l.colour}`,
                  sub: `${l.thickness ? `${l.thickness} · ` : ''}${l.size ? `${l.size} · ` : ''}${l.available} ${l.uom} on hand`,
                  lot: l,
                }))}
                className="bg-white"
              />
            </div>
          )}

          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step 2 — Fields</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400">Article / Material Name *</label>
              <SelectableFilterCombobox
                value={article}
                onChange={setArticle}
                placeholder="Select or type material…"
                options={articleOptions}
                onSelectLot={handleQuickPickLot}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400">Colour *</label>
              <SelectableFilterCombobox
                value={colour}
                onChange={setColour}
                placeholder="Select or type colour…"
                options={colourOptions}
                className="mt-1"
              />
            </div>
            {spec.required_to_add.map((k) => (
              <div key={k}>
                <label className="text-[10px] font-bold text-slate-400 capitalize">
                  {k}{k === spec.quantity_field ? ` (${spec.uom}) *` : ' *'}
                </label>
                {k === spec.quantity_field ? (
                  <input
                    type="number"
                    value={attrs[k] ?? ''}
                    onChange={(e) => setAttrs((p) => ({ ...p, [k]: e.target.value }))}
                    placeholder={`Enter ${spec.uom}…`}
                    className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1 bg-slate-50 focus:bg-white outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                  />
                ) : (
                  <SelectableFilterCombobox
                    value={attrs[k] ?? ''}
                    onChange={(val) => setAttrs((p) => ({ ...p, [k]: val }))}
                    placeholder={`Select or type ${k}…`}
                    options={getAttrOptions(k)}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-slate-400">Supplier ID (optional)</label>
              <input value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="leave blank if unknown" className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1 bg-slate-50 focus:bg-white outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400">Supplier Name (optional)</label>
              <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. Kanpur Leather Works" className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1 bg-slate-50 focus:bg-white outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
          </div>
          {spec.required_to_add.length === 0 && (
            <p className="text-[11px] font-bold text-amber-600">This category/subtype combination isn&apos;t configured yet — submit is blocked.</p>
          )}
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-md" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} Create Lot
          </button>
        </div>
      )}
    </div>
  );
}

// ── Screen D — Receiving ──────────────────────────────────────────────
function ReceivingScreen({ token, showToast, prefill }) {
  const [lotId, setLotId] = useState(prefill?.lotId || '');
  const [lot, setLot] = useState(null);
  const [approvedQty, setApprovedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [reserveFor, setReserveFor] = useState('');
  const [supplierOrderId, setSupplierOrderId] = useState(prefill?.orderId || '');
  const [submitting, setSubmitting] = useState(false);
  const [mismatch, setMismatch] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (prefill?.lotId) setLotId(prefill.lotId);
    if (prefill?.orderId) setSupplierOrderId(prefill.orderId);
  }, [prefill]);

  useEffect(() => {
    if (!lotId) { setLot(null); return; }
    apiGetMaterialLot(token, lotId).then(setLot).catch(() => setLot(null));
  }, [token, lotId]);

  const submit = async (approveMismatch = false) => {
    setSubmitting(true);
    try {
      const payload = { lot_id: lotId, approved_qty: Number(approvedQty), rejected_qty: Number(rejectedQty) || 0 };
      if (supplierOrderId) payload.supplier_order_id = supplierOrderId;
      if (reserveFor) payload.reserve_for_required = Number(reserveFor);
      if (approveMismatch) payload.approve_mismatch = true;
      const res = await apiReceiveMaterials(token, payload);
      setMismatch(null);
      setResult(res);
      if (res.lot_id !== lotId) {
        const fresh = await apiGetMaterialLot(token, res.lot_id);
        setLot(fresh);
      }
      showToast(res.substituted ? 'Received into a substitute lot.' : 'Stock received.', 'success');
    } catch (e) {
      if (e.status === 409 && e.mismatchFields) {
        setMismatch(e);
      } else {
        showToast(errMsg(e), 'error');
      }
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border text-center space-y-3 max-w-md mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        {result.substituted ? (
          <>
            <h3 className="font-black text-lg text-amber-700">Received Into a Substitute Lot</h3>
            <p className="text-xs font-bold text-slate-500">The delivery didn&apos;t match the original lot&apos;s spec on {result.mismatch_fields?.join(', ')}. A new lot ({result.lot_id}) now holds it.</p>
          </>
        ) : (
          <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>Stock Received</h3>
        )}
        <p className="text-xs font-bold text-slate-600">On hand: {result.on_hand} · Available: {result.available}{result.rejected_logged > 0 ? ` · Rejected logged: ${result.rejected_logged}` : ''}</p>
        <button onClick={() => { setResult(null); setLotId(''); setApprovedQty(''); setRejectedQty(''); setSupplierOrderId(''); }} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-white" style={{ background: '#c8834a' }}>Receive Another</button>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4 max-w-xl mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
      <div>
        <label className="text-[10px] font-bold text-slate-400">Target Lot (lot_id, or paste one from the Lot List)</label>
        <input value={lotId} onChange={(e) => setLotId(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold font-mono mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        {lot && <p className="text-[11px] font-bold text-slate-500 mt-1">{lot.article} · {lot.colour} — currently {lot.on_hand} {lot.uom} on hand, {lot.available} available</p>}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-emerald-600">Approved Qty (adds to stock)</label>
          <input type="number" value={approvedQty} onChange={(e) => setApprovedQty(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
        <div>
          <label className="text-[10px] font-bold text-red-500">Rejected Qty (logged only, never stock)</label>
          <input type="number" value={rejectedQty} onChange={(e) => setRejectedQty(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-400">Supplier Order ID (optional — matches against a PO)</label>
        <input value={supplierOrderId} onChange={(e) => setSupplierOrderId(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold font-mono mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
      </div>

      <button onClick={() => setShowAdvanced((s) => !s)} className="text-[10px] font-black uppercase text-slate-400">{showAdvanced ? '− Hide' : '+'} Advanced</button>
      {showAdvanced && (
        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
          <label className="text-[10px] font-bold text-amber-700">Reserve for requirement (no release endpoint yet — use sparingly, a reserved lot can&apos;t be adjusted or retired until it&apos;s released)</label>
          <input type="number" value={reserveFor} onChange={(e) => setReserveFor(e.target.value)} className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
      )}

      {mismatch && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-2">
          <p className="text-xs font-bold text-red-700">{mismatch.message}</p>
          <div className="flex gap-2">
            <button onClick={() => submit(true)} disabled={submitting} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white bg-red-600">Accept as Substitution</button>
            <button onClick={() => setMismatch(null)} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
          </div>
        </div>
      )}

      <button onClick={() => submit(false)} disabled={submitting || !lotId || !approvedQty} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} Receive Stock
      </button>
    </div>
  );
}

// ── Screen E — Supplier Orders ────────────────────────────────────────
function SupplierOrdersScreen({ token, showToast, prefill, onArrived }) {
  const [orders, setOrders] = useState([]);
  const [category, setCategory] = useState(prefill?.category || 'LEATHER');
  const [subtype, setSubtype] = useState(prefill?.subtype || '');
  const [article, setArticle] = useState(prefill?.article || '');
  const [colour, setColour] = useState(prefill?.colour || '');
  const [thickness, setThickness] = useState(prefill?.thickness || '');
  const [dcm, setDcm] = useState('');
  const [qty, setQty] = useState(prefill?.qty || '');
  const [supplierId, setSupplierId] = useState(prefill?.supplier_id || '');
  const [supplierName, setSupplierName] = useState(prefill?.supplier_name || '');
  const [submitting, setSubmitting] = useState(false);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [editForm, setEditForm] = useState({ article: '', colour: '', thickness: '', dcm: '', qty: '' });
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!prefill) return;
    setCategory(prefill.category || 'LEATHER'); setSubtype(prefill.subtype || ''); setArticle(prefill.article || '');
    setColour(prefill.colour || ''); setThickness(prefill.thickness || ''); setQty(prefill.qty || ''); setSupplierId(prefill.supplier_id || '');
    setSupplierName(prefill.supplier_name || '');
  }, [prefill]);

  const handleCreate = async () => {
    setSubmitting(true);
    try {
      const res = await apiCreateSupplierOrder(token, {
        category, subtype: subtype || undefined, article, colour: colour || undefined,
        thickness: thickness || undefined, dcm: dcm || undefined, qty: Number(qty), supplier_id: supplierId || undefined,
        // supplier_name isn't in the API guide yet — backend team said they'll
        // add it later. Sent alongside supplier_id so it's captured now.
        supplier_name: supplierName || undefined,
      });
      showToast(`Order raised for ${res.article}${res.supplier ? ` via ${res.supplier.name}` : ' — no supplier assigned yet'}.`, 'success');
      setOrders((prev) => [{ ...res, status: 'ordered', arrived_at: null }, ...prev]);
      setArticle(''); setColour(''); setThickness(''); setDcm(''); setQty(''); setSupplierId(''); setSupplierName('');
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setSubmitting(false); }
  };

  const markArrived = async (order) => {
    try {
      const res = await apiPatchSupplierOrder(token, order.order_id, 'ARRIVED');
      setOrders((prev) => prev.map((o) => (o.order_id === order.order_id ? { ...o, status: 'arrived', arrived_at: res.arrived_at } : o)));
      showToast('Marked arrived.', 'success');
    } catch (e) { showToast(errMsg(e), 'error'); }
  };

  const startEdit = (order) => {
    setEditingOrderId(order.order_id);
    setEditForm({ article: order.article || '', colour: order.colour || '', thickness: order.thickness || '', dcm: order.dcm || '', qty: order.qty ?? '' });
  };

  const saveEdit = async (order) => {
    setSavingEdit(true);
    try {
      const payload = {};
      if (editForm.article !== (order.article || '')) payload.article = editForm.article;
      if (editForm.colour !== (order.colour || '')) payload.colour = editForm.colour;
      if (editForm.thickness !== (order.thickness || '')) payload.thickness = editForm.thickness;
      if (String(editForm.dcm) !== String(order.dcm ?? '')) payload.dcm = editForm.dcm || undefined;
      if (String(editForm.qty) !== String(order.qty ?? '')) payload.qty = Number(editForm.qty);
      const res = await apiPatchSupplierOrderSpec(token, order.order_id, payload);
      setOrders((prev) => prev.map((o) => (o.order_id === order.order_id ? { ...o, ...editForm, qty: Number(editForm.qty), status: res.status } : o)));
      showToast('Order spec updated.', 'success');
      setEditingOrderId(null);
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setSavingEdit(false); }
  };

  return (
    <div className="space-y-5">
      <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4 max-w-xl" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Raise Supplier Order</div>
        <CategoryPicker category={category} subtype={subtype} onCategory={(c) => { setCategory(c); setSubtype(''); }} onSubtype={setSubtype} subtypeRequired={false} />
        <div className="grid grid-cols-2 gap-3">
          <input placeholder="Article *" value={article} onChange={(e) => setArticle(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Colour (leave blank = any)" value={colour} onChange={(e) => setColour(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Thickness (leave blank = any)" value={thickness} onChange={(e) => setThickness(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input type="number" placeholder="dcm (leave blank = any)" value={dcm} onChange={(e) => setDcm(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input type="number" placeholder="Qty *" value={qty} onChange={(e) => setQty(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Supplier ID (optional)" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
          <input placeholder="Supplier Name (optional)" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} className="h-9 px-3 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
        </div>
        <p className="text-[11px] font-bold text-amber-600">Fields you fill here are checked against the delivery. Leave a field blank if any value is acceptable.</p>
        <p className="text-[11px] font-bold text-slate-400">No supplier directory yet — leave Supplier ID/Name blank to let the backend suggest one from the article, or a DM/MD assigns it later. Supplier Name isn&apos;t in the API guide yet; the backend team said they&apos;ll add it.</p>
        <button onClick={handleCreate} disabled={submitting || !article || !qty} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />} Raise Order
        </button>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="p-4 border-b font-black text-xs uppercase tracking-wider text-slate-500 flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <span>This Session&apos;s Orders</span>
          <span className="text-[10px] font-bold text-slate-400 normal-case">No list endpoint exists yet — orders raised elsewhere won&apos;t appear here until the backend adds one.</span>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
          {orders.map((o) => (
            <div key={o.order_id} className="p-3 text-xs">
              {editingOrderId === o.order_id ? (
                <div className="space-y-2 p-2 rounded-xl bg-amber-50/60 border border-amber-200">
                  <div className="grid grid-cols-2 gap-2">
                    <input placeholder="Article" value={editForm.article} onChange={(e) => setEditForm((p) => ({ ...p, article: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    <input placeholder="Colour" value={editForm.colour} onChange={(e) => setEditForm((p) => ({ ...p, colour: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    <input placeholder="Thickness" value={editForm.thickness} onChange={(e) => setEditForm((p) => ({ ...p, thickness: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    <input type="number" placeholder="dcm" value={editForm.dcm} onChange={(e) => setEditForm((p) => ({ ...p, dcm: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    <input type="number" placeholder="Qty" value={editForm.qty} onChange={(e) => setEditForm((p) => ({ ...p, qty: e.target.value }))} className="h-8 px-2 border rounded-lg text-xs font-bold col-span-2" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => saveEdit(o)} disabled={savingEdit} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white disabled:opacity-50" style={{ background: '#c8834a' }}>{savingEdit ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}</button>
                    <button onClick={() => setEditingOrderId(null)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black shrink-0 ${o.status === 'arrived' ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>{o.status.toUpperCase()}</span>
                  <span className="font-black text-slate-800 flex-1 min-w-0 truncate">{o.article} · {o.qty} {o.uom}{(o.supplier_name || o.supplier?.name) ? ` · ${o.supplier_name || o.supplier.name}` : ' · no supplier'}</span>
                  {o.status === 'ordered' ? (
                    <>
                      <button onClick={() => startEdit(o)} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100 flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
                      <button onClick={() => markArrived(o)} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white" style={{ background: '#c8834a' }}>Mark Arrived</button>
                    </>
                  ) : (
                    <button onClick={() => onArrived({ orderId: o.order_id, article: o.article })} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-emerald-500">Receive</button>
                  )}
                </div>
              )}
            </div>
          ))}
          {orders.length === 0 && <div className="p-6 text-center text-xs font-bold text-slate-400">No orders raised this session yet.</div>}
        </div>
      </div>
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────
const SCREENS = [
  { id: 'hub', label: 'Overview & Alerts', icon: Boxes },
  { id: 'lots', label: 'Lot Directory', icon: Package },
  { id: 'intake', label: 'Add Material', icon: PackagePlus, writersOnly: true },
  { id: 'orders', label: 'Supplier Orders', dmOnly: true, icon: Truck },
];

export default function MaterialsPage() {
  const { user, token } = useAuth();
  const [screen, setScreen] = useState('hub');
  const [toast, setToast] = useState(null);
  const [receivePrefill, setReceivePrefill] = useState(null);
  const [orderPrefill, setOrderPrefill] = useState(null);

  const showToast = useCallback((msg, type) => setToast({ msg, type }), []);

  const isReader = STOCK_READERS.includes(user);
  const isWriter = LOT_WRITERS.includes(user);
  const isDmOnly = DM_ONLY.includes(user);

  if (!token) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="p-8 bg-white border border-amber-100 shadow-xl rounded-3xl space-y-4">
          <Lock className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Login Required</h1>
        </div>
      </div>
    );
  }

  if (!isReader) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="p-8 bg-white border border-amber-100 shadow-xl rounded-3xl space-y-4">
          <Lock className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Access Restricted</h1>
          <p className="text-sm font-bold text-slate-400">Material stock is visible to DM, MD, HR, Cutting, Lining, Stitching, Store and Security roles.</p>
        </div>
      </div>
    );
  }

  const visibleScreens = SCREENS.filter((s) => (!s.writersOnly || isWriter) && (!s.dmOnly || isDmOnly));

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: '#2d1f0e' }}><Package className="w-7 h-7" style={{ color: '#c8834a' }} /> Material Stock</h1>
          <p className="font-medium mt-1 text-sm" style={{ color: '#9a7a5a' }}>Lots, receiving and supplier orders — the human-driven stock system, not the BOM-driven inventory module.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        {visibleScreens.map((s) => {
          const Icon = s.icon;
          const active = screen === s.id;
          return (
            <button key={s.id} onClick={() => setScreen(s.id)}
              className={`h-10 px-4 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-all ${active ? 'text-white shadow-sm' : 'text-slate-500 bg-slate-50'}`}
              style={active ? { background: '#c8834a' } : {}}>
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {screen === 'hub' && (
        <StockHubScreen token={token} showToast={showToast} canOrder={isDmOnly} canEdit={isWriter} canAdjust={isDmOnly}
          onOpenOrder={(prefill) => { setOrderPrefill(prefill); setScreen('orders'); }}
          onReceive={isDmOnly ? (p) => { setReceivePrefill(p); setScreen('intake'); } : null} />
      )}
      {screen === 'lots' && (
        <LotListScreen token={token} showToast={showToast} canEdit={isWriter} canAdjust={isDmOnly}
          onReceive={isDmOnly ? (p) => { setReceivePrefill(p); setScreen('intake'); } : null} />
      )}
      {screen === 'intake' && isWriter && (
        <div className="space-y-8">
          {/* Team call: this is one physical event on the floor — material
              arrived. DM/MD check first whether it tops up a lot that
              already exists (Receiving); only if nothing matches does it
              become a brand-new spec (Add Material) below. */}
          {isDmOnly && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">Step 1 — Receive Against an Existing Lot</div>
              <ReceivingScreen token={token} showToast={showToast} prefill={receivePrefill} />
            </div>
          )}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">{isDmOnly ? 'Step 2 — ' : ''}No Matching Lot? Add a New Material</div>
            <AddMaterialScreen token={token} showToast={showToast}
              onDuplicate={(p) => { setReceivePrefill(p); window.scrollTo({ top: 0, behavior: 'smooth' }); showToast('Already exists — Receiving above is pre-filled with it.', 'success'); }} />
          </div>
        </div>
      )}
      {screen === 'orders' && isDmOnly && (
        <SupplierOrdersScreen token={token} showToast={showToast} prefill={orderPrefill}
          onArrived={(p) => { setReceivePrefill(p); setScreen('intake'); }} />
      )}
    </div>
  );
}
