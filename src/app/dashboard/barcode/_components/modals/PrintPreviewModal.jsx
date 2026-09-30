'use client';
import { X, Printer } from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import { BRAND } from '../../_lib/constants';
import BarcodeCanvas from '../BarcodeCanvas';

/**
 * ============================================================================
 * PrintPreviewModal Component
 * ============================================================================
 * WHAT IT IS:
 * Multi-item thermal sticker preview dialog.
 *
 * WHY IT EXISTS:
 * Lets operators visually inspect all selected barcodes on a simulated print layout
 * before sending the print job to the physical printer.
 *
 * PROPS:
 * - open: Whether modal dialog is visible.
 * - codes: Array of barcode string codes to preview.
 * - onClose: Dismiss callback `() => void`.
 * - onConfirm: Confirm and send to printer callback `() => void`.
 */
export default function PrintPreviewModal({ open, codes, onClose, onConfirm }) {
  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      {/* --- Section 1: Modal Header Bar --- */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}
      >
        <h3 className="font-bold" style={{ color: '#5a3518' }}>
          Thermal Sticker Print Preview ({codes.length})
        </h3>
        <button onClick={onClose} aria-label="Close modal">
          <X className="w-5 h-5" style={{ color: BRAND.textMuted }} />
        </button>
      </div>

      {/* --- Section 2: Printable Stickers Grid Preview --- */}
      <div
        className="p-6 max-h-[480px] overflow-y-auto flex flex-wrap gap-3 justify-center"
        style={{ background: '#e5e5e5' }}
      >
        {codes.map((code) => (
          <div
            key={code}
            className="bg-white border border-dashed border-gray-500 rounded-md flex flex-col items-center justify-center overflow-hidden"
            style={{ width: 200, height: 100, padding: 10 }}
          >
            <BarcodeCanvas code={code} displayWidth={170} showText={false} />
            <div className="font-mono font-bold text-[0.65rem] mt-1">{code}</div>
          </div>
        ))}
      </div>

      {/* --- Section 3: Action Buttons Footer --- */}
      <div
        className="flex justify-end gap-2 px-6 py-4"
        style={{ background: BRAND.bg, borderTop: `1.5px solid ${BRAND.border}` }}
      >
        <button onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">
          Cancel
        </button>
        <button onClick={onConfirm} className="btn-warm-primary !min-h-0 !py-2.5">
          <Printer className="w-4 h-4" /> Confirm &amp; Send to Printer
        </button>
      </div>
    </AnimatedModal>
  );
}
