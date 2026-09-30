'use client';
import { useMemo, useState } from 'react';
import { Printer, ChevronRight, X } from 'lucide-react';
import { BRAND } from '../../_lib/constants';
import { statusBadgeClass, buildFullBarcodeCode } from '../../_lib/helpers';
import BarcodeCanvas from '../BarcodeCanvas';

/**
 * ============================================================================
 * StylePrintQueue Component
 * ============================================================================
 * WHAT IT IS:
 * Dedicated print queue tray for Style category piece barcodes.
 *
 * WHY IT EXISTS:
 * Groups every queued barcode by Style + Colour + Size (mirroring the
 * Employee/Material/Drawer Print Center layout), showing a real barcode
 * preview card per piece instead of a flat list of pill chips.
 */
export default function StylePrintQueue({
  selectedCodes,
  rowByCode,
  rows,
  addCodes,
  onRemove,
  onClear,
  onPrintSelected,
  onPrintOrder,
  onPrintCodes,
  onOpenDetail,
  printing,
}) {
  const [expandedGroups, setExpandedGroups] = useState(() => new Set());

  const codes = useMemo(() => Array.from(selectedCodes), [selectedCodes]);

  // Group queued codes by Style + Colour + Size, same shape as the other categories' Print Center
  const groups = useMemo(() => {
    const map = new Map();
    codes.forEach((code) => {
      const row = rowByCode.get(code);
      const style = row?.style_name || 'Unknown Style';
      const colour = row?.colour || '—';
      const size = row?.size || '—';
      const key = `${style}__${colour}__${size}`;
      if (!map.has(key)) map.set(key, { key, style, colour, size, items: [] });
      map.get(key).items.push({ code, row });
    });
    return Array.from(map.values());
  }, [codes, rowByCode]);

  const toggleGroupExpand = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const removeGroup = (items) => items.forEach(({ code }) => onRemove(code));

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
            Grouped by Style, Colour &amp; Size — click a group to view its barcodes.
          </p>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => addCodes(rows.map((r) => r.code))}
            className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"
          >
            Select Page
          </button>
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

      {/* --- Section 2: Grouped Barcode Cards --- */}
      {groups.length === 0 ? (
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
        <div className="flex flex-col gap-3">
          {groups.map((g) => {
            const expanded = expandedGroups.has(g.key);
            const printedAll = g.items.every(({ row }) => row?.status === 'active');

            return (
              <div
                key={g.key}
                className="rounded-xl shadow-sm overflow-hidden"
                style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
              >
                {/* Group Summary Bar */}
                <div
                  className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer"
                  onClick={() => toggleGroupExpand(g.key)}
                >
                  <div className="flex items-center gap-4">
                    <button
                      onClick={(e) => { e.stopPropagation(); removeGroup(g.items); }}
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }}
                      aria-label={`Remove ${g.style} group from queue`}
                    >
                      <X className="w-3.5 h-3.5" style={{ color: BRAND.textMuted }} />
                    </button>
                    <div>
                      <div className="font-black text-sm" style={{ color: '#5a3518' }}>
                        {g.style} — {g.colour} · Size {g.size}
                      </div>
                      <div className="text-xs" style={{ color: BRAND.textMuted }}>
                        {g.items.length} barcode{g.items.length === 1 ? '' : 's'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className={statusBadgeClass(printedAll ? 'PRINTED' : 'PENDING')}>
                      {printedAll ? 'Active' : 'Ready'}
                    </span>
                    <button
                      onClick={() => toggleGroupExpand(g.key)}
                      className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs"
                    >
                      <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} /> View ({g.items.length})
                    </button>
                    <button
                      onClick={() => onPrintCodes(g.items.map((i) => i.code))}
                      disabled={printing}
                      className="btn-warm-primary !min-h-0 !py-2 !px-3 text-xs disabled:opacity-50"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print All
                    </button>
                  </div>
                </div>

                {/* Individual Barcode Cards Grid */}
                {expanded && (
                  <div
                    className="p-4 grid gap-3"
                    style={{ background: BRAND.bg, borderTop: '1px solid rgba(200,131,74,0.15)', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
                  >
                    {g.items.map(({ code, row }) => (
                      <div
                        key={code}
                        className="rounded-lg p-2.5 flex flex-col items-center gap-2 relative"
                        style={{ background: '#fff', border: '1.5px solid rgba(200,131,74,0.2)' }}
                      >
                        <button
                          onClick={() => onRemove(code)}
                          className="absolute top-2 left-2 w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: BRAND.bg }}
                          aria-label={`Remove ${code} from print queue`}
                        >
                          <X className="w-2.5 h-2.5" style={{ color: BRAND.textMuted }} />
                        </button>
                        <div className="w-full bg-white rounded p-1.5 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                          <BarcodeCanvas code={code} displayWidth={150} showText={false} />
                        </div>
                        <div className="text-center w-full">
                          <div className="font-mono font-bold text-[0.65rem] break-all" style={{ color: '#5a3518' }}>
                            {row ? buildFullBarcodeCode(row) : code}
                          </div>
                          <span className={`${statusBadgeClass(row?.status === 'active' ? 'PRINTED' : 'PENDING')} mt-1`}>
                            {row?.status === 'active' ? 'Active' : 'Retired'}
                          </span>
                        </div>
                        <button
                          onClick={() => onOpenDetail(code)}
                          className="w-full btn-warm-secondary !min-h-0 !py-1 !px-1 text-[0.65rem]"
                        >
                          View
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
