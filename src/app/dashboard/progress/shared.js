'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { Search, ChevronDown, Loader2 } from 'lucide-react';
export function SearchCombobox({ label, icon: Icon, placeholder, value, options, getKey, getLabel, getSub, onSelect, disabled, loading }) {
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
    <div className="flex-1 relative" ref={ref}>
      <label className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 mb-1.5" style={{ color: '#9a7a5a' }}>
        <Icon className="w-3.5 h-3.5" /> {label}
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((o) => !o)}
        className="w-full h-12 px-3.5 bg-white font-bold border-2 rounded-xl shadow-sm text-sm transition-all flex items-center justify-between text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{ borderColor: 'rgba(200,131,74,0.3)' }}
      >
        <span className={selectedOption ? 'truncate' : 'text-slate-400'} style={selectedOption ? { color: '#2d1f0e' } : {}}>
          {selectedOption ? getLabel(selectedOption) : placeholder}
        </span>
        {loading ? <Loader2 className="w-4 h-4 animate-spin shrink-0" style={{ color: '#c8834a' }} /> : <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} style={{ color: '#c8834a' }} />}
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-50 top-[calc(100%+6px)] left-0 w-full bg-white border-2 rounded-2xl shadow-2xl p-2.5 space-y-2" style={{ borderColor: '#c8834a' }}>
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: '#9a7a5a' }} />
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}...`}
              className="w-full h-10 pl-9 pr-3 bg-[#faf6f0] border rounded-lg text-xs font-bold outline-none"
              style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#2d1f0e' }}
            />
          </div>
          <div className="max-h-64 overflow-y-auto space-y-0.5">
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
export function StageBadge({ state }) {
  const s = String(state || '').toLowerCase();
  const map = {
    completed: { bg: '#f0fff4', color: '#38a169', border: '#c6f6d5', text: 'DONE' },
    done: { bg: '#f0fff4', color: '#38a169', border: '#c6f6d5', text: 'DONE' },
    next: { bg: 'rgba(200,131,74,0.15)', color: '#a86022', border: 'rgba(200,131,74,0.3)', text: 'NEXT' },
    in_progress: { bg: 'rgba(200,131,74,0.15)', color: '#a86022', border: 'rgba(200,131,74,0.3)', text: 'IN-PROGRESS' },
    locked: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'LOCKED' },
    not_applicable: { bg: '#f5f5f5', color: '#aaa', border: '#e2e2e2', text: 'N/A' },
    not_started: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'NOT STARTED' },
    pending: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'PENDING' },
  };
  const style = map[s] || { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: (state || 'PENDING').toUpperCase() };
  return (
    <span className="px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider shrink-0" style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}` }}>
      {style.text}
    </span>
  );
}
