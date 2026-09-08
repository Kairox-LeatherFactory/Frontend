'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Send, Printer, RotateCcw } from 'lucide-react';
import { BRAND, inputCls, fieldStyle, BUCKET_LABEL, BUCKET_LABELS_PER_PAGE } from '../_lib/constants';
import { statusBadgeClass } from '../_lib/helpers';
import ScreenSafeSelect from './ScreenSafeSelect';
import BarcodeCanvas from './BarcodeCanvas';

/**
 * ============================================================================
 * DrawerGenerationTab Component
 * ============================================================================
 * WHAT IT IS:
 * Dedicated batch generation & print interface for Factory Drawer/Bucket Barcodes.
 *
 * WHY IT EXISTS:
 * Pulls the live physical drawer pool from `GET /api/v1/drawers`.
 * Formats barcodes strictly to the 98mm × 65.5mm bucket sticker spec
 * (packing exactly 8 labels per single A4 sheet, 2 across × 4 down).
 *
 * FEATURES:
 * - Live drawer state filtering (`waiting`, `ready`, `released`, `merged`).
 * - Sequence range filters (`seqFrom`, `seqTo`).
 * - Quick batch printing of the entire 200+ drawer pool.
 */
export default function DrawerGenerationTab({
  drawers,
  drawersLoading,
  drawersError,
  onRetryDrawers,
  drawerGenerated,
  onGenerateSelected,
  onGenerateAllRemaining,
  onPrintAll,
  onSendToPrintCenter,
  onOpenDetail,
  onPrintSingle,
  stateFilter,
  setStateFilter,
  seqFrom,
  setSeqFrom,
  seqTo,
  setSeqTo,
  drawerTotal,
}) {
  // --------------------------------------------------------------------------
  // 1. LOCAL STATE & SEARCH
  // --------------------------------------------------------------------------
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [search, setSearch] = useState('');

  // Track already-generated drawer barcodes to prevent duplicates
  const generatedCodes = useMemo(() => new Set(drawerGenerated.map((r) => r.pieceCode)), [drawerGenerated]);
  const generatedDrawerIds = useMemo(() => new Set(drawerGenerated.map((r) => r.size)), [drawerGenerated]);

  // Filter drawer list based on search term
  const filteredDrawers = useMemo(() => {
    let list = drawers || [];
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((d) =>
        (d.code && d.code.toLowerCase().includes(q)) ||
        (d.drawer_id && d.drawer_id.toLowerCase().includes(q)) ||
        (d.barcode && d.barcode.toLowerCase().includes(q)) ||
        String(d.seq).includes(q)
      );
    }
    return list;
  }, [drawers, search]);

  // --------------------------------------------------------------------------
  // 2. SELECTION HANDLERS
  // --------------------------------------------------------------------------
  const toggleSelect = (drawerId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(drawerId) ? next.delete(drawerId) : next.add(drawerId);
      return next;
    });
  };

  const selectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      filteredDrawers.forEach((d) => {
        if (!d.barcode) return; // Ignore unprintable drawers without registry barcodes
        next.add(d.drawer_id || d.code || String(d.seq));
      });
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  // --------------------------------------------------------------------------
  // 3. STATS & STATE OPTIONS
  // --------------------------------------------------------------------------
  const printableCount = useMemo(() => (drawers || []).filter((d) => d.barcode).length, [drawers]);
  const missingCount = (drawers ? drawers.length : 0) - printableCount;

  const stateOptions = useMemo(() => {
    const seen = new Set((drawers || []).map((d) => d.state).filter(Boolean));
    if (stateFilter !== 'ALL') seen.add(stateFilter);
    return Array.from(seen).sort();
  }, [drawers, stateFilter]);

  // --------------------------------------------------------------------------
  // 4. GENERATE BARCODES HANDLER
  // --------------------------------------------------------------------------
  const handleGenerateClick = () => {
    const chosen = (drawers || []).filter((d) => selectedIds.has(d.drawer_id || d.code || String(d.seq)));
    onGenerateSelected(chosen);
    setSelectedIds(new Set());
  };

  // --------------------------------------------------------------------------
  // 5. RENDER TAB INTERFACE
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* --- Section 1: Overview Metric Stat Cards --- */}
      <div className="rounded-2xl p-6 shadow-sm flex items-center gap-6 flex-wrap" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Total in Database</p><p className="font-bold" style={{ color: BRAND.text }}>{drawerTotal || (drawers ? drawers.length : 0)}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Loaded in View</p><p className="font-bold" style={{ color: BRAND.text }}>{drawers ? drawers.length : 0}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Printable Labels</p><p className="font-bold" style={{ color: BRAND.text }}>{printableCount}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Missing Barcode</p><p className="font-bold" style={{ color: missingCount > 0 ? '#b91c1c' : BRAND.text }}>{missingCount}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Queued / Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{drawerGenerated.length}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Remaining</p><p className="font-bold" style={{ color: '#d97706' }}>{Math.max(0, printableCount - drawerGenerated.length)}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Selected</p><p className="font-bold" style={{ color: BRAND.accent }}>{selectedIds.size}</p></div>
      </div>

      {/* --- Section 2: Controls, Action Buttons & Filters --- */}
      <div className="rounded-2xl p-6 shadow-sm space-y-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-black" style={{ color: BRAND.text }}>Live Drawers &amp; Barcode Labels</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>
              The label sheet straight off <code className="font-mono font-bold text-xs bg-amber-50 px-1 py-0.5 rounded text-[#a86530]">GET /api/v1/drawers</code>, ordered by drawer seq. Print the whole pool in one pass, or filter by state / seq range first.
            </p>
            <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>
              Labels print bare — barcode only — at <span className="font-bold">{BUCKET_LABEL.widthMm} × {BUCKET_LABEL.heightMm}mm</span> to paste on the bucket, {BUCKET_LABELS_PER_PAGE} per A4 sheet.
              Set the print dialog to <span className="font-bold">100% scale</span> (not &quot;fit to page&quot;) or they come out undersized.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={onPrintAll} disabled={printableCount === 0} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50 disabled:cursor-default">
              <Printer className="w-4 h-4" /> Print All {printableCount} Labels
            </button>
            <button onClick={handleGenerateClick} disabled={selectedIds.size === 0} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50 disabled:cursor-default">
              <Zap className="w-4 h-4" /> Generate Selected ({selectedIds.size})
            </button>
            <button onClick={onGenerateAllRemaining} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Generate All Remaining</button>
            <button onClick={onSendToPrintCenter} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><Send className="w-4 h-4" /> Send All to Print Center</button>
            <button onClick={onRetryDrawers} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><RotateCcw className="w-4 h-4" /> Refresh</button>
          </div>
        </div>

        {/* State & Sequence Range Filter Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>1. Drawer State Filter</label>
            <ScreenSafeSelect
              value={stateFilter}
              onChange={setStateFilter}
              placeholder="All States (All Drawers)"
              options={[{ value: 'ALL', label: 'All States (All Drawers)' }, ...stateOptions.map((s) => ({ value: s, label: s }))]}
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>2. Seq From (Optional)</label>
            <input
              type="number"
              placeholder="e.g. 1"
              value={seqFrom}
              onChange={(e) => setSeqFrom(e.target.value)}
              className={inputCls}
              style={fieldStyle}
              min="1"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>3. Seq To (Optional)</label>
            <input
              type="number"
              placeholder="e.g. 50"
              value={seqTo}
              onChange={(e) => setSeqTo(e.target.value)}
              className={inputCls}
              style={fieldStyle}
              min="1"
            />
          </div>
        </div>

        {/* Filter Count & Selection Quick Buttons */}
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs" style={{ color: BRAND.textMuted }}>{filteredDrawers.length} drawer{filteredDrawers.length === 1 ? '' : 's'} loaded for current filter</p>
          <div className="flex gap-2">
            <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Select All Visible</button>
            <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Clear</button>
          </div>
        </div>

        {/* --- Section 3: Drawer Roster List Table --- */}
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
          {drawersLoading ? (
            <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>Loading drawers from server…</div>
          ) : drawersError ? (
            <div className="text-center py-8 text-sm space-y-2" style={{ color: BRAND.textMuted }}>
              <p style={{ color: '#b91c1c' }}>{drawersError}</p>
              <button onClick={onRetryDrawers} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Retry</button>
            </div>
          ) : filteredDrawers.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>
              {drawers && drawers.length === 0 ? 'No drawers found matching the filter.' : 'No drawers match your search.'}
            </div>
          ) : (
            <div className="divide-y divide-[rgba(200,131,74,0.15)] max-h-96 overflow-y-auto">
              {filteredDrawers.map((drw) => {
                const uniqueKey = drw.drawer_id || drw.code || String(drw.seq);
                const unprintable = !drw.barcode;
                const isGenerated = !unprintable && (generatedCodes.has(drw.barcode) || generatedDrawerIds.has(drw.drawer_id));
                const isChecked = selectedIds.has(uniqueKey);

                return (
                  <label
                    key={uniqueKey}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fdfaf5] transition-colors"
                    style={{ background: isChecked ? '#faf3ea' : '#fff' }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        disabled={isGenerated || unprintable}
                        checked={isChecked}
                        onChange={() => toggleSelect(uniqueKey)}
                        className="w-4 h-4 accent-[#c8834a] cursor-pointer disabled:cursor-default"
                      />
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2" style={{ color: '#5a3518' }}>
                          <span>{drw.code || `Drawer #${drw.seq}`}</span>
                          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
                            Seq #{drw.seq}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            drw.state === 'ready' ? 'bg-emerald-100 text-emerald-800' :
                            drw.state === 'waiting' ? 'bg-amber-100 text-amber-800' :
                            drw.state === 'released' ? 'bg-purple-100 text-purple-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {drw.state || 'active'}
                          </span>
                        </div>
                        {drw.state === 'merged' && drw.piece_code && (
                          <div className="mt-0.5 font-mono font-bold text-xs break-all" style={{ color: '#a86530' }}>
                            Piece: {drw.piece_code}
                            {drw.piece_serial && (
                              <span className="ml-2 font-sans font-semibold" style={{ color: BRAND.textMuted }}>(Serial #{drw.piece_serial})</span>
                            )}
                            {drw.needs_lining && (
                              <span className="ml-2 font-sans font-bold" style={{ color: '#b45309' }}>· needs lining</span>
                            )}
                            {drw.complete && (
                              <span className="ml-2 font-sans font-bold" style={{ color: '#047857' }}>· complete</span>
                            )}
                          </div>
                        )}
                        <div className="text-xs font-mono mt-0.5" style={{ color: BRAND.textMuted }}>
                          {drw.barcode ? (
                            <span>Barcode: <span className="text-[#a86530] font-bold">{drw.barcode}</span></span>
                          ) : (
                            <span className="font-sans font-semibold" style={{ color: '#b91c1c' }}>no registry barcode — cannot be printed</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={unprintable ? 'badge badge-danger' : statusBadgeClass(isGenerated ? 'PRINTED' : 'PENDING')}>
                        {unprintable ? 'No Barcode' : isGenerated ? 'Queued / Ready' : (drw.barcode_status || 'Unqueued')}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- Section 4: Generated Drawer Barcodes Grid --- */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Drawer Barcodes &amp; Labels</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {drawerGenerated.length} barcodes</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter code/ID..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
          </div>
        </div>

        {drawerGenerated.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
            <p className="font-bold" style={{ color: BRAND.textMuted }}>No drawer barcodes generated yet.</p>
            <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Select drawers above and click &quot;Generate Selected&quot;.</p>
          </div>
        ) : (
          <motion.div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {drawerGenerated.map((b) => (
              <motion.div
                key={b.pieceCode}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                onClick={() => onOpenDetail(b.pieceCode)}
                className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer"
                style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
              >
                <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  <BarcodeCanvas code={b.pieceCode} displayWidth={200} />
                </div>
                <div className="text-center w-full">
                  <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.style}</span>
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold uppercase" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.color}</span>
                    <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
                  </div>
                  <div className="font-mono text-[9px] text-slate-400 mt-1 truncate max-w-full" title={b.size}>
                    UUID: {b.size}
                  </div>
                </div>
                <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
                  <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
