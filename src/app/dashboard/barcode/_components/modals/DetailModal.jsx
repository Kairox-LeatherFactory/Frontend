'use client';
import { useRef, useState } from 'react';
import { X, FileImage, FileText, Printer } from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import { BRAND, CATEGORY_LABELS } from '../../_lib/constants';
import { captureNodeToCanvas, saveCanvasAsPng, saveCanvasAsPdf } from '../../_lib/exporters';
import EmployeeTicketCard from '../cards/EmployeeTicketCard';
import DrawerBarcodeLabel from '../cards/DrawerBarcodeLabel';
import BarcodeStickerLabel from '../cards/BarcodeStickerLabel';
import IdCard from '../cards/IdCard';

/**
 * ============================================================================
 * DetailModal Component
 * ============================================================================
 * WHAT IT IS:
 * Inspection dialog modal for viewing an individual barcode item in detail.
 *
 * WHY IT EXISTS:
 * Allows factory managers to preview the exact printable card for any item,
 * export it as a high-density PNG or PDF file, or send it straight to the printer.
 *
 * ADAPTIVE LAYOUT:
 * - Employee category: Renders `EmployeeTicketCard`
 * - Drawer category: Renders `DrawerBarcodeLabel` (98mm × 65.5mm)
 * - Style / Material category: Renders `BarcodeStickerLabel` + `IdCard` fields grid
 */
export default function DetailModal({
  barcode,
  onClose,
  onPrint,
  labels = CATEGORY_LABELS.style,
  category = 'style',
}) {
  // --------------------------------------------------------------------------
  // 1. STATE & REFS
  // --------------------------------------------------------------------------
  const cardRef = useRef(null);
  const [exporting, setExporting] = useState(null); // Tracks active export: 'png' | 'pdf' | null

  const isEmployee = category === 'employee';
  const isDrawer = category === 'bucket';
  const isCardOnly = isEmployee || isDrawer;

  // --------------------------------------------------------------------------
  // 2. EXPORT FILE HANDLER (PNG / PDF)
  // --------------------------------------------------------------------------
  const handleDownload = async (format) => {
    if (!cardRef.current || exporting || !barcode) return;
    setExporting(format);
    try {
      // Capture the DOM node of the card into a high-DPI canvas
      const canvas = await captureNodeToCanvas(cardRef.current);
      if (format === 'png') {
        await saveCanvasAsPng(canvas, barcode.pieceCode);
      } else {
        await saveCanvasAsPdf(canvas, barcode.pieceCode);
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
      isOpen={!!barcode}
      onClose={onClose}
      zIndex={2000}
      panelClassName={`rounded-2xl w-full ${isCardOnly ? 'max-w-md' : 'max-w-4xl'} max-h-[85vh] flex flex-col shadow-2xl overflow-hidden`}
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      {barcode && (
        <>
          {/* --- Modal Header Bar --- */}
          <div
            className="flex items-center justify-between px-6 py-4 shrink-0"
            style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}
          >
            <h3 className="font-bold" style={{ color: '#5a3518' }}>Barcode Specification</h3>
            <button onClick={onClose} aria-label="Close modal">
              <X className="w-5 h-5" style={{ color: BRAND.textMuted }} />
            </button>
          </div>

          {/* --- Modal Body Content --- */}
          <div
            className={
              isCardOnly
                ? 'p-5 flex justify-center items-start flex-1 min-h-0 overflow-y-auto'
                : 'p-5 grid gap-4 sm:grid-cols-[minmax(0,260px)_1fr] items-start flex-1 min-h-0 overflow-y-auto'
            }
          >
            {/* Left Column: Visual Printable Card */}
            <div className={isCardOnly ? 'flex justify-center' : 'flex justify-center sm:sticky sm:top-0'}>
              {isEmployee ? (
                <EmployeeTicketCard barcode={barcode} cardRef={cardRef} width={320} />
              ) : isDrawer ? (
                <DrawerBarcodeLabel barcode={barcode} cardRef={cardRef} />
              ) : (
                <BarcodeStickerLabel barcode={barcode} cardRef={cardRef} width={260} />
              )}
            </div>

            {/* Right Column: Specification & Lot Attributes Grid (Style & Material only) */}
            {!isCardOnly && (
              <div className="w-full min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-[#9a7a5a] mb-2 px-1">
                  Lot &amp; Specification Details
                </div>
                <IdCard barcode={barcode} labels={labels} showOnlyFields={true} />
              </div>
            )}
          </div>

          {/* --- Modal Action Buttons Footer --- */}
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
            <button
              onClick={() => onPrint(barcode.pieceCode)}
              className="btn-warm-primary !min-h-0 !py-2.5"
            >
              <Printer className="w-4 h-4" /> Print Label
            </button>
          </div>
        </>
      )}
    </AnimatedModal>
  );
}
