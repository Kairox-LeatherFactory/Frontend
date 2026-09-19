'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, CheckCircle2, AlertCircle, Lock, Unlock, Search, ChevronDown } from 'lucide-react';

export function Toast({ msg, type }) {
  if (!msg) return null;
  const isSuccess = type === 'success';
  return createPortal(
    <div className="fixed bottom-4 right-4 left-4 sm:bottom-8 sm:right-8 sm:left-auto flex justify-center z-[999999] animate-fade-in pointer-events-none">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 backdrop-blur-md border max-w-sm w-full sm:w-auto ${isSuccess
        ? 'bg-emerald-50/90 border-emerald-200/50 text-emerald-900 shadow-emerald-500/10'
        : 'bg-red-50/90 border-red-200/50 text-red-900 shadow-red-500/10'
        }`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <AlertCircle className="w-5 h-5 text-red-500" />}
        {msg}
      </div>
    </div>,
    document.body
  );
}

export function StatusBadge({ status }) {
  const isClosed = String(status || '').toUpperCase() === 'CLOSED';
  return (
    <span className={`px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border shadow-sm flex items-center gap-1 shrink-0 ${isClosed ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}`}>
      {isClosed ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
      {isClosed ? 'Frozen' : 'Draft'}
    </span>
  );
}

// Money value that renders "Not priced" instead of a lying 0 — the
// backend explicitly returns amount:null (never 0) for unpriced cells.
export function Money({ value }) {
  if (value == null) return <span className="italic text-slate-400 font-bold text-xs">Not priced</span>;
  return <>₹{Number(value).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</>;
}

// Searchable dropdown for picking an order/style by browsing instead of
// typing an exact code from memory.
export function SearchCombobox({ placeholder, value, options, getKey, getLabel, getSub, onSelect, disabled, loading, allowClear }) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setIsOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase().trim();
    return options.filter((o) => `${getLabel(o)} ${getSub(o) || ''}`.toLowerCase().includes(q));
  }, [options, query, getLabel, getSub]);

  const selectedOption = options.find((o) => getKey(o) === value);

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className="w-full h-12 px-4 bg-slate-50 font-bold border rounded-xl text-xs outline-none transition-all flex items-center justify-between text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: 'rgba(200,131,74,0.15)' }}
      >
        <span className={selectedOption ? 'truncate' : 'text-slate-400'} style={selectedOption ? { color: '#2d1f0e' } : {}}>
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" style={{ color: '#c8834a' }} /> : <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: '#c8834a' }} />}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-full min-w-[260px] bg-white border-2 rounded-2xl shadow-2xl p-2.5 space-y-2" style={{ borderColor: '#c8834a' }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9a7a5a' }} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="w-full h-10 pl-9 pr-3 bg-[#faf6f0] border rounded-lg text-xs font-bold outline-none"
              style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            />
          </div>
          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {allowClear && (
              <button
                type="button"
                onClick={() => { onSelect(null); setIsOpen(false); setQuery(''); }}
                className="w-full p-2 text-left rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-50 cursor-pointer"
              >
                — Clear selection —
              </button>
            )}
            {filtered.length === 0 && (
              <div className="p-3 text-center text-xs font-bold text-slate-400">No matches</div>
            )}
            {filtered.map((o) => {
              const key = getKey(o);
              const isSelected = key === value;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => { onSelect(o); setIsOpen(false); setQuery(''); }}
                  className={`w-full p-2.5 text-left rounded-lg flex flex-col cursor-pointer transition-colors ${isSelected ? 'bg-[#c8834a] text-white' : 'hover:bg-amber-50 text-slate-800'}`}
                >
                  <span className="text-xs font-black truncate">{getLabel(o)}</span>
                  {getSub(o) && <span className={`text-[10px] font-bold truncate ${isSelected ? 'text-amber-100' : 'text-slate-400'}`}>{getSub(o)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Native <select> option popups size themselves to their widest option text,
// independent of the closed control's own (responsive) width, and can render
// past the viewport edge on a tablet. A fully custom dropdown instead: the
// open panel is pinned left:0/right:0 against its own button, so its width
// always matches the button's own (already on-screen) width.
export function SimpleSelect({ value, options, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div className="relative flex-1" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full h-12 px-3 bg-slate-50 font-bold border rounded-xl text-xs outline-none transition-all flex items-center justify-between gap-1 text-left cursor-pointer"
        style={{ borderColor: 'rgba(200,131,74,0.15)' }}
      >
        <span className="truncate" style={{ color: '#2d1f0e' }}>{selected ? selected.label : ''}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} style={{ color: '#c8834a' }} />
      </button>
      {open && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 right-0 bg-white border-2 rounded-2xl shadow-2xl p-1.5 space-y-0.5" style={{ borderColor: '#c8834a' }}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full p-2 text-left rounded-lg text-xs font-bold truncate cursor-pointer transition-colors ${value === opt.value ? 'bg-[#c8834a] text-white' : 'hover:bg-amber-50 text-slate-800'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Same screen-safe custom dropdown idea as SimpleSelect, but portaled to
// document.body: the Run Detail modal that hosts this select has
// `overflow-hidden` on its outer card (rounds its corners), which would clip
// an in-place absolutely-positioned panel — so this one renders on
// document.body instead, positioned at the button's live screen coordinates.
export function PortalPillSelect({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const updateRect = () => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: Math.max(r.width, 160) });
  };

  useEffect(() => {
    if (!open) return;
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (buttonRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="h-9 px-3 bg-white border rounded-full font-bold text-xs outline-none focus:border-[#c8834a] flex items-center gap-1.5 cursor-pointer max-w-[180px]"
        style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#4a3a2a' }}
      >
        <span className="truncate">{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3 h-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && rect && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[999999] max-h-64 overflow-y-auto rounded-xl border-2 bg-white shadow-2xl p-1.5 space-y-0.5"
          style={{ top: rect.top, left: rect.left, width: rect.width, borderColor: '#c8834a' }}
        >
          <button
            type="button"
            onClick={() => { onChange(''); setOpen(false); }}
            className={`w-full p-2 text-left rounded-lg text-xs font-bold truncate cursor-pointer transition-colors ${value === '' ? 'bg-[#c8834a] text-white' : 'hover:bg-amber-50 text-slate-800'}`}
          >
            {placeholder}
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full p-2 text-left rounded-lg text-xs font-bold truncate cursor-pointer transition-colors ${value === opt.value ? 'bg-[#c8834a] text-white' : 'hover:bg-amber-50 text-slate-800'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}
