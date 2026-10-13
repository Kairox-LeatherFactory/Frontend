'use client';
import { useRef, useState } from 'react';
import { ScanLine, X, Loader2, FileImage, FileText } from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import { BRAND, BARCODE_TYPE_LABELS } from '../../_lib/constants';
import { humanizeKey, formatRegistryValue, statusBadgeClass } from '../../_lib/helpers';
import { captureNodeToCanvas, saveCanvasAsPng, saveCanvasAsPdf } from '../../_lib/exporters';
import BarcodeCanvas from '../BarcodeCanvas';

/**
 * ============================================================================
 * LiveBarcodeDetailModal Component
 * ============================================================================
 * WHAT IT IS:
 * Live inspection modal rendered after looking up or scanning any barcode
 * via `ResolveBarcodeWidget` or clicking "View" on registry items.
 *
 * WHY IT EXISTS:
 * Displays all decoded entity details returned from `/api/v1/barcode/resolve`
 * (e.g. piece order, style, bundle, sequence, current manufacturing stage, etc.).
 */
export default function LiveBarcodeDetailModal({ open, loading, error, data, onClose }) {
  // --------------------------------------------------------------------------
  // 1. STATE & REFERENCES
  // --------------------------------------------------------------------------
  const barcodeRef = useRef(null);
  const [exporting, setExporting] = useState(null);

  // Extract nested entity payload (piece, employee, drawer, or material lot)
  const rawPayload = data ? (data.piece || data.employee || data.drawer || data.lot) : null;

  // Style/piece lookups hide internal production-routing fields not meant for this quick-view card
  const HIDDEN_PIECE_KEYS = ['drawer', 'material_requirement', 'needs_lining', 'leather_consumption_dcm'];
  const payload = rawPayload
    ? Object.fromEntries(Object.entries(rawPayload).filter(([key]) => !HIDDEN_PIECE_KEYS.includes(key)))
    : null;

  // --------------------------------------------------------------------------
  // 2. EXPORT SYMBOL TO PNG / PDF
  // --------------------------------------------------------------------------
  const handleDownload = async (format) => {
    if (!barcodeRef.current || exporting || !data) return;
    setExporting(format);
    try {
      const canvas = await captureNodeToCanvas(barcodeRef.current);
      if (format === 'png') {
        await saveCanvasAsPng(canvas, data.code);
      } else {
        await saveCanvasAsPdf(canvas, data.code);
      }
    } finally {
      setExporting(null);
    }
  };

  // --------------------------------------------------------------------------
  // 3. RENDER MODAL
  // --------------------------------------------------------------------------
  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      {/* --- Header Bar --- */}
      <div
        className="flex items-center justify-between px-6 py-4 shrink-0"
        style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}
      >
        <h3 className="font-bold flex items-center gap-2" style={{ color: '#5a3518' }}>
          <ScanLine className="w-4 h-4" style={{ color: BRAND.accent }} /> Barcode Registry Lookup
        </h3>
        <button onClick={onClose} aria-label="Close modal">
          <X className="w-5 h-5" style={{ color: BRAND.textMuted }} />
        </button>
      </div>

      {/* --- Body Section 1: Loading Spinner --- */}
      {loading ? (
        <div className="py-16 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: BRAND.accent }} />
          <p className="text-sm" style={{ color: BRAND.textMuted }}>Resolving barcode in registry…</p>
        </div>
      ) : error ? (
        /* --- Body Section 2: Error Alert --- */
        <div className="py-16 text-center px-6">
          <p className="font-bold" style={{ color: '#b91c1c' }}>{error}</p>
        </div>
      ) : data ? (
        /* --- Body Section 3: Data Inspection Grid --- */
        <>
          <div className="p-6 flex-1 min-h-0 overflow-y-auto" style={{ background: '#ffffff' }}>
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
              {/* Left Column: Barcode Symbol & Status Badge */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl border border-amber-100 bg-amber-50/30">
                <div
                  ref={barcodeRef}
                  className="p-3 rounded-lg mb-3 flex justify-center overflow-hidden bg-white w-full"
                  style={{ border: `1px solid ${BRAND.border}` }}
                >
                  <BarcodeCanvas code={data.code} displayWidth={240} />
                </div>
                <div className="font-mono font-bold text-sm mb-1.5 break-all" style={{ color: '#5a3518' }}>
                  {data.code}
                </div>
                <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                  <span
                    className="text-[0.65rem] px-2.5 py-1 rounded-full font-black uppercase tracking-wide"
                    style={{ background: BRAND.bg, color: BRAND.accent, border: `1px solid ${BRAND.border}` }}
                  >
                    {BARCODE_TYPE_LABELS[data.type] || data.type}
                  </span>
                  <span className={statusBadgeClass(data.active ? 'PRINTED' : 'PENDING')}>
                    {data.active ? 'Active' : 'Retired'}
                  </span>
                </div>
                {data.caption && <div className="text-xs font-semibold text-slate-600 mt-1">{data.caption}</div>}
              </div>

              {/* Right Column: Piece & Production Details Grid */}
              <div className="w-full min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-[#9a7a5a] mb-2.5">
                  Piece &amp; Production Details
                </div>
                {payload && Object.keys(payload).length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 text-left text-xs p-4 rounded-xl" style={{ background: BRAND.bg }}>
                    {Object.entries(payload).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[0.62rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted }}>
                          {humanizeKey(key)}
                        </span>
                        <span className="font-semibold break-words text-slate-900" style={{ color: BRAND.text }}>
                          {formatRegistryValue(value)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs rounded-xl" style={{ background: BRAND.bg, color: BRAND.textMuted }}>
                    No additional detail on record for this code.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* --- Modal Footer: Export Controls --- */}
          <div
            className="flex justify-end gap-2 px-6 py-4 flex-wrap shrink-0"
            style={{ background: BRAND.bg, borderTop: `1.5px solid ${BRAND.border}` }}
          >
            <button onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">
              Close
            </button>
            <button
              onClick={() => handleDownload('png')}
              disabled={!!exporting}
              className="btn-warm-secondary !min-h-0 !py-2.5 disabled:opacity-60"
            >
              <FileImage className="w-4 h-4" /> {exporting === 'png' ? 'Preparing…' : 'Download PNG'}
            </button>
            <button
              onClick={() => handleDownload('pdf')}
              disabled={!!exporting}
              className="btn-warm-secondary !min-h-0 !py-2.5 disabled:opacity-60"
            >
              <FileText className="w-4 h-4" /> {exporting === 'pdf' ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
        </>
      ) : null}
    </AnimatedModal>
  );
}
