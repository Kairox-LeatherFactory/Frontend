'use client';
import { useState, useMemo } from 'react';
import { Eye, Download, Printer, ChevronRight } from 'lucide-react';
import { BRAND, CATEGORY_LABELS } from '../_lib/constants';
import { statusBadgeClass } from '../_lib/helpers';
import ScreenSafeSelect from './ScreenSafeSelect';
import BarcodeCanvas from './BarcodeCanvas';

/**
 * ============================================================================
 * PrintTab Master Component
 * ============================================================================
 * WHAT IT IS:
 * Universal Print Center management interface shared across Style, Employee,
 * Bucket/Drawer, and Material barcode categories.
 *
 * HIERARCHICAL STRUCTURE:
 * 1. Top Level (Order / Department / Category): Expandable container card.
 * 2. Sub Level (Style / Designation / Lot): Group containing individual barcodes.
 * 3. Barcode Cards: Compact cards with checkbox, barcode canvas, and print buttons.
 *
 * CAPABILITIES:
 * - Selective checkbox batching.
 * - Visual multi-card preview modal before physical printing.
 * - Bulk image (PNG) and multi-page document (PDF) downloading.
 */
export default function PrintTab({
  generatedBarcodesStore,
  selectedPrintBarcodes,
  expandedOrders,
  onToggleOrderExpand,
  expandedGroups,
  onToggleExpand,
  onToggleGroup,
  onTogglePiece,
  onSelectAll,
  onClearAll,
  onOpenPreview,
  onPrintGroupDirect,
  onOpenDetail,
  onPrintSingle,
  onDownloadAll,
  bulkExporting = false,
  labels = CATEGORY_LABELS.style,
}) {
  // --------------------------------------------------------------------------
  // 1. STATE & 2-LEVEL ORDER HIERARCHY COMPUTATION
  // --------------------------------------------------------------------------
  const [downloadFormat, setDownloadFormat] = useState('png');

  // Groups flat list of barcodes into Order -> Style/Dept groups
  const orderGroups = useMemo(() => {
    const orderMap = new Map();
    generatedBarcodesStore.forEach((b) => {
      if (!orderMap.has(b.orderId)) {
        orderMap.set(b.orderId, { orderId: b.orderId, client: b.client, items: [], styleMap: new Map() });
      }
      const og = orderMap.get(b.orderId);
      og.items.push(b);
      const sKey = `${b.orderId}__${b.style}`;
      if (!og.styleMap.has(sKey)) {
        og.styleMap.set(sKey, { key: sKey, orderId: b.orderId, style: b.style, color: b.color, items: [] });
      }
      og.styleMap.get(sKey).items.push(b);
    });
    return Array.from(orderMap.values()).map((og) => ({
      ...og,
      styles: Array.from(og.styleMap.values()),
    }));
  }, [generatedBarcodesStore]);

  // --------------------------------------------------------------------------
  // 2. RENDER PRINT CENTER VIEW
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* --- Section 1: Toolbar Header (Selection, Export, Preview, Print) --- */}
      <div
        className="rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4"
        style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
      >
        <div>
          <h3 className="text-base font-black" style={{ color: BRAND.text }}>
            Print Queue ({selectedPrintBarcodes.size} selected)
          </h3>
          <p className="text-xs" style={{ color: BRAND.textMuted }}>
            {labels.groupHint}
          </p>
        </div>

        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={onSelectAll} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
            Select All
          </button>
          <button onClick={onClearAll} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
            Clear Selection
          </button>
          <button onClick={onOpenPreview} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
            <Eye className="w-4 h-4" /> Preview
          </button>

          {/* Download Format Selector (PNG / PDF) */}
          <ScreenSafeSelect
            value={downloadFormat}
            onChange={setDownloadFormat}
            className="h-[42px] px-3 rounded-lg text-xs font-bold outline-none border cursor-pointer !w-24"
            options={[
              { value: 'png', label: 'PNG' },
              { value: 'pdf', label: 'PDF' },
            ]}
          />

          {/* Bulk Download Button */}
          <button
            onClick={() => onDownloadAll?.(downloadFormat)}
            disabled={bulkExporting || selectedPrintBarcodes.size === 0}
            className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50"
          >
            <Download className="w-4 h-4" /> {bulkExporting ? 'Preparing…' : `Download All (${selectedPrintBarcodes.size})`}
          </button>

          {/* Print Trigger Button */}
          <button onClick={onOpenPreview} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs">
            <Printer className="w-4 h-4" /> Print Selected
          </button>
        </div>
      </div>

      {/* --- Section 2: Expandable Hierarchy Cards --- */}
      {orderGroups.length === 0 ? (
        <div
          className="text-center py-12 rounded-xl"
          style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}
        >
          <p className="font-bold" style={{ color: BRAND.textMuted }}>No barcode batches in the print queue yet.</p>
          <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Generate barcodes in Batch Generation first.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {orderGroups.map((og) => {
            const selectedCount = og.items.filter((i) => selectedPrintBarcodes.has(i.pieceCode)).length;
            const allSelected = selectedCount === og.items.length;
            const isPrintedAll = og.items.every((i) => i.printStatus === 'PRINTED');
            const expanded = expandedOrders.has(og.orderId);

            return (
              /* Top-Level Order / Dept Accordion Card */
              <div
                key={og.orderId}
                className="rounded-xl shadow-sm overflow-hidden"
                style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
              >
                {/* Order Summary Bar */}
                <div
                  className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer"
                  onClick={() => onToggleOrderExpand(og.orderId)}
                >
                  <div className="flex items-center gap-4">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => onToggleGroup(og.items, e.target.checked)}
                      className="w-4 h-4 accent-[#c8834a] cursor-pointer"
                    />
                    <div className="px-3 py-1.5 rounded-lg font-mono font-black text-sm text-white" style={{ background: '#3d2b1a' }}>
                      {og.orderId}
                    </div>
                    <div>
                      <div className="font-black text-sm" style={{ color: '#5a3518' }}>{og.client}</div>
                      <div className="text-xs" style={{ color: BRAND.textMuted }}>
                        {og.styles.length} {labels.subGroupNounPlural.toLowerCase()} • {og.items.length} barcodes
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <span className={statusBadgeClass(isPrintedAll ? 'PRINTED' : 'PENDING')}>
                      {isPrintedAll ? 'Printed' : 'Ready'}
                    </span>
                    <button
                      onClick={() => onToggleOrderExpand(og.orderId)}
                      className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs"
                    >
                      <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} /> View {labels.subGroupNounPlural} ({og.styles.length})
                    </button>
                    <button
                      onClick={() => onPrintGroupDirect(og.items)}
                      className="btn-warm-primary !min-h-0 !py-2 !px-3 text-xs"
                    >
                      <Printer className="w-3.5 h-3.5" /> Print All
                    </button>
                  </div>
                </div>

                {/* Sub-Level Style / Sub-Group List */}
                {expanded && (
                  <div style={{ overflow: 'hidden' }}>
                    <div className="p-4 flex flex-col gap-3" style={{ background: BRAND.bg, borderTop: '1px solid rgba(200,131,74,0.15)' }}>
                      {og.styles.map((g) => {
                        const sSelectedCount = g.items.filter((i) => selectedPrintBarcodes.has(i.pieceCode)).length;
                        const sAllSelected = sSelectedCount === g.items.length;
                        const sPrintedAll = g.items.every((i) => i.printStatus === 'PRINTED');
                        const sExpanded = expandedGroups.has(g.key);

                        return (
                          <div
                            key={g.key}
                            className="rounded-lg overflow-hidden"
                            style={{ background: '#fff', border: '1.5px solid rgba(200,131,74,0.2)' }}
                          >
                            {/* Style Group Header */}
                            <div className="p-3 flex items-center justify-between flex-wrap gap-3">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={sAllSelected}
                                  onChange={(e) => onToggleGroup(g.items, e.target.checked)}
                                  className="w-4 h-4 accent-[#c8834a] cursor-pointer"
                                />
                                <div>
                                  <div className="font-bold text-sm" style={{ color: '#5a3518' }}>
                                    {g.style}{g.color ? ` — ${g.color}` : ''}
                                  </div>
                                  <div className="text-xs" style={{ color: BRAND.textMuted }}>
                                    {g.items.length} barcodes
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={statusBadgeClass(sPrintedAll ? 'PRINTED' : 'PENDING')}>
                                  {sPrintedAll ? 'Printed' : 'Ready'}
                                </span>
                                <button
                                  onClick={() => onToggleExpand(g.key)}
                                  className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-xs"
                                >
                                  <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: sExpanded ? 'rotate(90deg)' : 'none' }} /> View ({g.items.length})
                                </button>
                                <button
                                  onClick={() => onPrintGroupDirect(g.items)}
                                  className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-xs"
                                >
                                  <Printer className="w-3.5 h-3.5" /> Print All
                                </button>
                              </div>
                            </div>

                            {/* Individual Barcode Cards Grid */}
                            {sExpanded && (
                              <div style={{ overflow: 'hidden' }}>
                                <div
                                  className="p-3 grid gap-3"
                                  style={{ background: '#fff', borderTop: '1px solid rgba(200,131,74,0.15)', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}
                                >
                                  {g.items.map((b) => {
                                    const checked = selectedPrintBarcodes.has(b.pieceCode);
                                    return (
                                      <div
                                        key={b.pieceCode}
                                        className="rounded-lg p-2.5 flex flex-col items-center gap-2 relative"
                                        style={{ background: checked ? '#faf3ea' : BRAND.bg, border: `1.5px solid ${checked ? BRAND.accent : 'rgba(200,131,74,0.2)'}` }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={checked}
                                          onChange={(e) => onTogglePiece(b.pieceCode, e.target.checked)}
                                          className="absolute top-2 left-2 w-3.5 h-3.5 accent-[#c8834a] cursor-pointer"
                                        />
                                        <div className="w-full bg-white rounded p-1.5 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                                          <BarcodeCanvas code={b.pieceCode} displayWidth={150} showText={false} />
                                        </div>
                                        <div className="text-center w-full">
                                          <div className="font-mono font-bold text-[0.65rem] break-all" style={{ color: '#5a3518' }}>
                                            {b.pieceCode}
                                          </div>
                                          <span className={`${statusBadgeClass(b.printStatus)} mt-1`}>
                                            {b.printStatus}
                                          </span>
                                        </div>
                                        <div className="flex gap-1 w-full">
                                          <button
                                            onClick={() => onOpenDetail(b.pieceCode)}
                                            className="flex-1 btn-warm-secondary !min-h-0 !py-1 !px-1 text-[0.65rem]"
                                          >
                                            View
                                          </button>
                                          <button
                                            onClick={() => onPrintSingle(b.pieceCode)}
                                            className="flex-1 btn-warm-primary !min-h-0 !py-1 !px-1 text-[0.65rem]"
                                          >
                                            Print
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
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
