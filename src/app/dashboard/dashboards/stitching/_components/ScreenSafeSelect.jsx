'use client';
import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

/**
 * ============================================================================
 * ScreenSafeSelect Component
 * ============================================================================
 * WHAT IT IS:
 * Dropdown select component preventing viewport overflow on tablets/mobile screens.
 */
export default function ScreenSafeSelect({ value, options, onChange, placeholder }) {
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
  const label = value === 'all' || !selected ? placeholder : selected.label;

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 bg-[#f8fafc] border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#4f46e5] cursor-pointer"
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg py-1">
          {placeholder && (
            <button
              type="button"
              onClick={() => { onChange('all'); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold truncate cursor-pointer hover:bg-slate-50 ${value === 'all' ? 'text-[#4f46e5] bg-indigo-50' : 'text-slate-700'}`}
            >
              {placeholder}
            </button>
          )}
          {options.map((opt, idx) => (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              title={opt.title || opt.label}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-1.5 text-xs font-bold truncate cursor-pointer hover:bg-slate-50 ${value === opt.value ? 'text-[#4f46e5] bg-indigo-50' : 'text-slate-700'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
