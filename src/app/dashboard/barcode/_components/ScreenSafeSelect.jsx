'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { selectCls, fieldStyle } from '../_lib/constants';

/**
 * ============================================================================
 * ScreenSafeSelect Component
 * ============================================================================
 * WHAT IT IS:
 * Custom dropdown select component replacing native browser `<select>` boxes.
 *
 * WHY IT EXISTS:
 * Native HTML select dropdowns often get cut off or overflow on mobile/tablet screens.
 * This component keeps the dropdown popup perfectly aligned and safely visible,
 * with optional React Portal support to escape `overflow: hidden` parent boxes.
 *
 * PROPS:
 * - value: Currently selected option value.
 * - options: Array of `{ value, label, title }` objects.
 * - onChange: Callback fired when an option is selected `(val) => void`.
 * - placeholder: Fallback text when no option is chosen.
 * - portal: When true, mounts dropdown options into `document.body`.
 */
export default function ScreenSafeSelect({
  value,
  options,
  onChange,
  placeholder,
  className = selectCls,
  style = fieldStyle,
  portal = false,
}) {
  // --------------------------------------------------------------------------
  // 1. STATE & REFERENCES
  // --------------------------------------------------------------------------
  const [open, setOpen] = useState(false);  // Dropdown open/closed
  const [rect, setRect] = useState(null);   // Button position for portal alignment
  const buttonRef = useRef(null);           // Ref for trigger button
  const panelRef = useRef(null);            // Ref for options list menu

  // --------------------------------------------------------------------------
  // 2. POSITION RECALCULATION FOR PORTAL MODE
  // --------------------------------------------------------------------------
  // Calculates exact top/left coordinates when scrolling or resizing
  const updateRect = useCallback(() => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!portal || !open) return;
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [portal, open, updateRect]);

  // --------------------------------------------------------------------------
  // 3. OUTSIDE CLICK HANDLER (CLOSES DROPDOWN)
  // --------------------------------------------------------------------------
  useEffect(() => {
    function handleClickOutside(e) {
      if (buttonRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // --------------------------------------------------------------------------
  // 4. SELECTED LABEL RESOLUTION
  // --------------------------------------------------------------------------
  const selected = options.find((o) => String(o.value) === String(value));
  const label = selected ? selected.label : (placeholder ?? '');

  // --------------------------------------------------------------------------
  // 5. DROPDOWN OPTIONS PANEL
  // --------------------------------------------------------------------------
  const panel = (
    <div
      ref={panelRef}
      className={
        portal
          ? 'fixed z-[999999] max-h-64 overflow-y-auto rounded-lg border shadow-2xl py-1 bg-white'
          : 'absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border shadow-lg py-1 bg-white'
      }
      style={
        portal
          ? { top: rect?.top, left: rect?.left, width: rect?.width, borderColor: 'rgba(200,131,74,0.3)' }
          : { borderColor: 'rgba(200,131,74,0.3)' }
      }
    >
      {options.map((opt, idx) => (
        <button
          key={`${opt.value}-${idx}`}
          type="button"
          title={opt.title || opt.label}
          onClick={() => {
            onChange(opt.value);
            setOpen(false);
          }}
          className={`w-full text-left px-3 py-1.5 text-sm font-semibold truncate cursor-pointer hover:bg-[#faf6f0] ${
            String(value) === String(opt.value)
              ? 'text-[#c8834a] bg-[#fff3e8]'
              : 'text-[#2d1f0e]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  // --------------------------------------------------------------------------
  // 6. RENDER TRIGGER BUTTON + ATTACHED PANEL
  // --------------------------------------------------------------------------
  return (
    <div className="relative">
      {/* Dropdown toggle button */}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${className} flex items-center justify-between gap-2 text-left cursor-pointer`}
        style={style}
      >
        <span className="truncate">{label}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Render options menu either directly or through body portal */}
      {open && (portal ? (rect && createPortal(panel, document.body)) : panel)}
    </div>
  );
}
