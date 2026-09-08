'use client';
import { Printer, X } from 'lucide-react';
import { BRAND } from '../../_lib/constants';

/**
 * ============================================================================
 * StylePrintQueue Component
 * ============================================================================
 * WHAT IT IS:
 * Dedicated print queue tray for Style category piece barcodes.
 *
 * WHY IT EXISTS:
 * Displays pill badges for all currently checked/queued barcodes.
 * Allows operators to inspect their selection, remove unwanted codes,
 * clear the queue, or trigger thermal printing.
 */
export default function StylePrintQueue({
  selectedCodes,
  rowByCode,
  onRemove,
  onClear,
  onPrintSelected,
  onPrintOrder,
  printing,
}) {
  const codes = Array.from(selectedCodes);

  return (
    <div className="space-y-4">
      {/* --- Section 1: Queue Header & Actions --- */}
      <div
        className="rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4"
        style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
      >
        <div>
          <h3 className="text-base font-black" style={{ color: BRAND.text }}>
            Print Queue ({codes.length} selected)
          </h3>
          <p className="text-xs" style={{ color: BRAND.textMuted }}>
            Check codes in the Batch Generation grid, then send them to the label printer.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={onClear}
            disabled={codes.length === 0}
            className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50"
          >
            Clear Queue
          </button>
          <button
            onClick={onPrintSelected}
            disabled={printing || codes.length === 0}
            className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Print Selected
          </button>
          <button
            onClick={onPrintOrder}
            disabled={printing}
            className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> Print Entire Order
          </button>
        </div>
      </div>

      {/* --- Section 2: Selected Barcode Pills Grid --- */}
      {codes.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}
        >
          <p className="font-bold" style={{ color: BRAND.textMuted }}>
            No barcodes queued for printing yet.
          </p>
          <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>
            Check codes in the Batch Generation grid to queue them here.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {codes.map((code) => {
            const row = rowByCode.get(code);
            return (
              <div
                key={code}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-mono font-bold"
                style={{ background: '#fff', border: `1.5px solid ${BRAND.border}`, color: '#5a3518' }}
              >
                <span>{code}{row?.size ? ` · ${row.size}` : ''}</span>
                {/* Remove button */}
                <button
                  onClick={() => onRemove(code)}
                  className="w-4 h-4 rounded-full flex items-center justify-center cursor-pointer"
                  style={{ background: BRAND.bg }}
                  aria-label={`Remove ${code} from print queue`}
                >
                  <X className="w-3 h-3" style={{ color: BRAND.textMuted }} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
