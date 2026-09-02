import { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
export default function ScreenSafeSelect({ value, options, onChange, placeholder, emptyLabel, className }) {
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
        style={{ borderColor: 'rgba(200,131,74,0.3)' }}
      >
        <span className={`truncate ${selected ? '' : 'text-slate-400'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-xl border bg-white shadow-lg py-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
          {options.length === 0 && emptyLabel && (
            <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400">{emptyLabel}</div>
          )}
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