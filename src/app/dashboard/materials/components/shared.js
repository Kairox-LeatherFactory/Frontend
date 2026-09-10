'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, XCircle, ChevronDown, X ,Check} from 'lucide-react';
// The safe renderer the guide prescribes for the two 422 shapes
export const STOCK_READERS = ['direct_manager', 'managing_director', 'hr', 'cutting_manager', 'stitching_manager', 'lining_manager', 'security', 'store_manager'];
export const LOT_WRITERS = ['direct_manager', 'managing_director', 'cutting_manager', 'lining_manager'];
export const DM_ONLY = ['direct_manager', 'managing_director'];
export const CATEGORY_SUBTYPES = {
  LEATHER: [],
  LINING: ['PLAIN_LINING', 'RIBS', 'KNIT'],
  ACCESSORY: ['BUTTON', 'ZIP', 'THREAD', 'OTHER'],
};

export function LotPickerCombobox({ value, lots, selectedLabel, onSelect, placeholder }) {
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
export function CategoryPicker({ category, subtype, onCategory, onSubtype, subtypeRequired }) {
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
export function errMsg(e) {
  if (!e) return 'Something went wrong.';
  if (Array.isArray(e.detail)) return e.detail.map((d) => d.msg).join(', ');
  return e.message || 'Something went wrong.';
}

export function Toast({ msg, type, onClose }) {
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

export function Tile({ label, value, uom, primary }) {
  return (
    <div className={`flex-1 min-w-[140px] p-4 rounded-2xl border ${primary ? 'bg-[#c8834a]/10' : 'bg-slate-50'}`} style={{ borderColor: primary ? '#c8834a' : 'rgba(200,131,74,0.15)' }}>
      <div className="text-[10px] font-black uppercase tracking-wider" style={{ color: primary ? '#a86022' : '#9a7a5a' }}>{label}</div>
      <div className={`font-black mt-1 ${primary ? 'text-2xl' : 'text-xl'}`} style={{ color: '#2d1f0e' }}>
        {Number(value ?? 0).toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-xs font-bold" style={{ color: '#9a7a5a' }}>{uom}</span>
      </div>
    </div>
  );
}

export function ScreenSafeSelect({ value, options, onChange, placeholder, className }) {
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
export function SelectableFilterCombobox({
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