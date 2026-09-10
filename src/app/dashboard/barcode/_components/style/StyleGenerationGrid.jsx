'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Loader2, Printer, Send } from 'lucide-react';
import { BRAND, inputCls, fieldStyle } from '../../_lib/constants';
import { statusBadgeClass, buildFullBarcodeCode } from '../../_lib/helpers';
import BarcodeCanvas from '../BarcodeCanvas';
import BarcodePagination from '../BarcodePagination';

/**
 * ============================================================================
 * StyleGenerationGrid Component
 * ============================================================================
 * WHAT IT IS:
 * Interactive visual grid showing scannable barcode cards for individual pieces
 * in the active production order.
 *
 * KEY FEATURES:
 * - Search filter for barcode code strings.
 * - Single / multi-select checkboxes for batch queueing.
 * - Positional range selector (e.g. select cards 1 to 24 on current page).
 * - 1-click single-label printing and full order batch printing.
 * - Responsive pagination.
 */
export default function StyleGenerationGrid({
  rows,
  historyLoading,
  historyError,
  search,
  setSearch,
  selectedCodes,
  toggleCode,
  clearSelection,
  addCodes,
  page,
  setPage,
  pages,
  total,
  onOpenDetail,
  onPrintSingle,
  onSendToPrintCenter,
  onPrintOrder,
  printing,
}) {
  // --------------------------------------------------------------------------
  // 1. LOCAL STATE & SEARCH FILTERING
  // --------------------------------------------------------------------------
  const [rangeFrom, setRangeFrom] = useState('');
  const [rangeTo, setRangeTo] = useState('');

  // Filter rows by user search input query
  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.code.toLowerCase().includes(q));
  }, [rows, search]);

  // Only selects codes currently visible under the active search/filter — never the whole page/order
  const selectAllVisible = () => {
    addCodes(filteredRows.map((r) => r.code));
  };

  // --------------------------------------------------------------------------
  // 2. RANGE SELECTION HANDLER (e.g. CARDS 1 TO 10)
  // --------------------------------------------------------------------------
  const handleSelectRange = () => {
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (isNaN(from) || isNaN(to)) return;
    const lo = Math.max(1, Math.min(from, to));
    const hi = Math.min(filteredRows.length, Math.max(from, to));
    const codes = filteredRows.slice(lo - 1, hi).map((r) => r.code);
    addCodes(codes);
  };

  // --------------------------------------------------------------------------
  // 3. RENDER GRID & CONTROLS
  // --------------------------------------------------------------------------
  return (
    <div>
      {/* --- Section 1: Toolbar with Title, Search, Range Selector & Print Actions --- */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-black" style={{ color: BRAND.text }}>Registered Barcodes</h3>
          <p className="text-xs" style={{ color: BRAND.textMuted }}>
            {total} total on this order • page {page} of {pages || 1}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter code..."
              className={`${inputCls} !pl-8 !w-44 !py-2`}
              style={fieldStyle}
            />
          </div>

          {/* Quick Selection Buttons */}
          <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">
            Select Page
          </button>
          <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">
            Clear
          </button>

          {/* Numeric Position Range Selector */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="From"
              value={rangeFrom}
              onChange={(e) => setRangeFrom(e.target.value)}
              className={`${inputCls} !w-16 !py-1.5 text-xs`}
              style={fieldStyle}
            />
            <span className="text-xs font-bold" style={{ color: BRAND.textMuted }}>to</span>
            <input
              type="number"
              min="1"
              inputMode="numeric"
              placeholder="To"
              value={rangeTo}
              onChange={(e) => setRangeTo(e.target.value)}
              className={`${inputCls} !w-16 !py-1.5 text-xs`}
              style={fieldStyle}
            />
            <button
              onClick={handleSelectRange}
              disabled={rangeFrom === '' || rangeTo === ''}
              className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-50"
            >
              Select Range
            </button>
          </div>

          {/* Send Selected Items to Print Center (actual printing happens in the Print Center tab) */}
          <button
            onClick={onSendToPrintCenter}
            disabled={printing || selectedCodes.size === 0}
            className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" /> Send to Print Center ({selectedCodes.size})
          </button>

          {/* Print Entire Production Order Button */}
          <button
            onClick={onPrintOrder}
            disabled={printing}
            className="btn-warm-primary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" /> Print Entire Order
          </button>
        </div>
      </div>

      {/* --- Section 2: Barcode Cards Grid View --- */}
      {historyLoading ? (
        <div
          className="text-center py-12 rounded-xl flex items-center justify-center gap-2"
          style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)', color: BRAND.textMuted }}
        >
          <Loader2 className="w-4 h-4 animate-spin" /> Loading barcodes…
        </div>
      ) : historyError ? (
        <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
          <p className="font-bold" style={{ color: '#b91c1c' }}>{historyError}</p>
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
          <p className="font-bold" style={{ color: BRAND.textMuted }}>No barcodes match this filter.</p>
        </div>
      ) : (
        <motion.div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {filteredRows.map((r) => {
            const checked = selectedCodes.has(r.code);
            return (
              <motion.div
                key={r.code}
                onClick={() => toggleCode(r.code)}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                className="rounded-xl p-4 flex flex-col items-center gap-3 relative cursor-pointer"
                style={{
                  background: checked ? '#faf3ea' : '#fff',
                  border: `1.5px solid ${checked ? BRAND.accent : BRAND.border}`,
                }}
              >
                {/* Selection Checkbox */}
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleCode(r.code)}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute top-3 left-3 w-4 h-4 accent-[#c8834a] cursor-pointer"
                />

                {/* Scannable Barcode Canvas */}
                <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  <BarcodeCanvas code={r.code} displayWidth={190} />
                </div>

                {/* Card Piece Attributes */}
                <div className="text-center w-full">
                  <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>
                    {buildFullBarcodeCode(r)}
                  </div>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    {r.style_name && (
                      <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>
                        {r.style_name}
                      </span>
                    )}
                    {r.size && (
                      <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>
                        Size {r.size}
                      </span>
                    )}
                    <span className={statusBadgeClass(r.status === 'active' ? 'PRINTED' : 'PENDING')}>
                      {r.status === 'active' ? 'Active' : 'Retired'}
                    </span>
                  </div>
                </div>

                {/* Card Quick Action Buttons */}
                <div className="flex gap-2 w-full">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenDetail(r.code);
                    }}
                    className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs"
                  >
                    View
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPrintSingle(r.code);
                    }}
                    className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs"
                  >
                    Print
                  </button>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* --- Section 3: Bottom Pagination --- */}
      <BarcodePagination page={page} pages={pages} setPage={setPage} />
    </div>
  );
}
