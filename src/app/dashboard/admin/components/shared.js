'use client';
import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Barcode, Printer, X,ShieldCheck } from 'lucide-react';
import JsBarcode from 'jsbarcode';
// ─── Shared styled input ─────────────────────────────────────────────────────
export function Field({ label, children }) {
  return (
    <div>
      <label className="text-[11px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>{label}</label>
      {children}
    </div>
  );
}

export const inputCls = "w-full h-11 px-4 rounded-xl text-sm font-semibold outline-none transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a] hover:border-[#c8834a]/50 bg-[#faf6f0] text-[#2d1f0e] border-[1.5px] border-[#c8834a]/20";

export function AdminSelect({ value, options, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const updateRect = () => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
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
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${inputCls} flex items-center justify-between gap-2 text-left cursor-pointer`}
      >
        <span className={`truncate ${selected ? '' : 'text-[#9a7a5a]/70'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-[#9a7a5a] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && rect && createPortal(
        <div
          ref={panelRef}
          className="fixed z-[999999] max-h-64 overflow-y-auto rounded-xl border-[1.5px] border-[#c8834a]/20 bg-white shadow-2xl py-1"
          style={{ top: rect.top, left: rect.left, width: rect.width }}
        >
          {options.map((opt, idx) => (
            <button
              key={`${opt.value}-${idx}`}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm font-semibold truncate cursor-pointer hover:bg-[#faf6f0] ${value === opt.value ? 'text-[#c8834a] bg-[#fff9f0]' : 'text-[#2d1f0e]'}`}
            >
              {opt.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

export const ROLE_COLORS = {
  direct_manager: { bg: '#fff9f0', color: '#c8834a', border: 'rgba(200,131,74,0.3)', label: 'Direct Manager' },
  cutting_manager: { bg: '#eff6ff', color: '#2563eb', border: 'rgba(37,99,235,0.2)', label: 'Cutting Manager' },
  lining_manager: { bg: '#fff1f2', color: '#e11d48', border: 'rgba(225,29,72,0.2)', label: 'Lining Manager' },
  stitching_manager: { bg: '#f5f3ff', color: '#7c3aed', border: 'rgba(124,58,237,0.2)', label: 'Stitching Manager' },
  hr_admin: { bg: '#f0fdf4', color: '#16a34a', border: 'rgba(22,163,74,0.2)', label: 'HR Admin' },
  client_viewer: { bg: '#faf6f0', color: '#9a7a5a', border: 'rgba(200,131,74,0.15)', label: 'Client Viewer' },
  viewer: { bg: '#f1f5f9', color: '#64748b', border: 'rgba(100,116,139,0.15)', label: 'Viewer' },
  employee: { bg: '#ecfdf5', color: '#059669', border: 'rgba(5,150,105,0.15)', label: 'Employee' },
};

export function EmployeeIdCardModal({ employee, onClose }) {
  const svgRef = useRef(null);
  const [mounted, setMounted] = useState(false);
  const barcodeCode = employee?.employee_barcode || `EMP-${String(employee?.id || '000000').padStart(6, '0')}`;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && svgRef.current && barcodeCode) {
      try {
        JsBarcode(svgRef.current, barcodeCode, {
          format: 'CODE128',
          width: 1.8,
          height: 48,
          displayValue: true,
          fontSize: 12,
          fontOptions: 'bold',
          margin: 6,
        });
      } catch (err) {
        console.error('JsBarcode error:', err);
      }
    }
  }, [mounted, barcodeCode]);

  if (!mounted || typeof document === 'undefined' || !document.body) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-sm overflow-hidden relative">
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-[#2d1f0e] to-[#3a2817] p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c8834a]/20 border border-[#c8834a]/40 flex items-center justify-center">
              <Barcode className="w-5 h-5 text-[#f5d4a4]" />
            </div>
            <div>
              <h3 className="text-sm font-black">Employee ID Badge Tag</h3>
              <p className="text-[10px] text-[#e2d5c3]">Official Factory Scanner Tag</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Badge Body */}
        <div className="p-6 bg-[#faf6f0] flex flex-col items-center gap-4 text-center">
          <div className="w-full bg-white border-2 border-[#c8834a]/30 rounded-2xl p-5 shadow-lg space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="text-[10px] font-black uppercase text-[#9a7a5a] tracking-widest">PTE Leather ERP</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">ACTIVE</span>
            </div>
            <div className="space-y-0.5">
              <h4 className="text-lg font-black text-[#2d1f0e]">{employee?.name}</h4>
              <p className="text-xs font-bold text-[#c8834a]">{employee?.designation || 'Floor Operator'}</p>
            </div>
            <div className="py-2 bg-slate-50 rounded-xl flex items-center justify-center border border-slate-100">
              <svg ref={svgRef} className="max-w-full" />
            </div>
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 pt-1">
              <span>ID: #{employee?.id}</span>
              <span>Type: {employee?.wage_type === 'monthly' ? 'Monthly Salary' : 'Piece Rate'}</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl text-xs font-extrabold bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">
            Close
          </button>
          <button onClick={() => window.print()} className="flex-1 py-3 rounded-xl text-xs font-extrabold text-white shadow-md flex items-center justify-center gap-2 cursor-pointer" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
            <Printer className="w-4 h-4" /> Print Badge
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
