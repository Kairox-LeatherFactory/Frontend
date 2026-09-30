'use client';
import { motion } from 'framer-motion';
import { Loader2, FileDown } from 'lucide-react';
import { BRAND } from '../../_lib/constants';
import { statusBadgeClass } from '../../_lib/helpers';
import BarcodePagination from '../BarcodePagination';

/**
 * ============================================================================
 * StyleHistoryTable Component
 * ============================================================================
 * WHAT IT IS:
 * Tabular audit log view for all style barcodes registered to a production order.
 *
 * CONTENTS:
 * - Table Columns: Code, SKU, Style, Colour, Size, Seq, Manufacturing Stage, Status, Created Date, Actions.
 * - 1-Click CSV Export for the active page.
 * - View details & single-label print actions on every row.
 */
export default function StyleHistoryTable({
  rows,
  historyLoading,
  historyError,
  page,
  setPage,
  pages,
  total,
  onOpenDetail,
  onPrintSingle,
  onExportCSV,
}) {
  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
      {/* --- Section 1: Table Header with CSV Export Button --- */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div>
          <h3 className="text-base font-black" style={{ color: BRAND.text }}>Barcode History</h3>
          <p className="text-xs" style={{ color: BRAND.textMuted }}>
            {total} total • page {page} of {pages || 1}
          </p>
        </div>
        <button onClick={onExportCSV} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
          <FileDown className="w-4 h-4" /> Export CSV (this page)
        </button>
      </div>

      {/* --- Section 2: Table Data Content --- */}
      {historyLoading ? (
        <div className="text-center py-8 flex items-center justify-center gap-2" style={{ color: BRAND.textMuted }}>
          <Loader2 className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : historyError ? (
        <div className="text-center py-8" style={{ color: '#b91c1c' }}>
          {historyError}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-8" style={{ color: BRAND.textMuted }}>
          No barcode history records match the selected filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            {/* Table Column Titles */}
            <thead>
              <tr style={{ background: '#fff' }}>
                {['Code', 'SKU', 'Style', 'Colour', 'Size', 'Seq', 'Current Stage', 'Status', 'Generated At', 'Actions'].map((h) => (
                  <th
                    key={h}
                    className="text-left px-3 py-2.5 text-[0.7rem] font-bold uppercase tracking-wide whitespace-nowrap"
                    style={{ color: BRAND.textMuted, borderBottom: `1.5px solid ${BRAND.border}` }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>

            {/* Table Rows */}
            <motion.tbody>
              {rows.map((r) => (
                <motion.tr key={r.code} className="hover:bg-[#fdf6ee]">
                  <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap" style={{ color: '#5a3518', borderBottom: '1px solid #f0e8d7' }}>
                    {r.code}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    {r.sku_code || '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    {r.style_name || '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    {r.colour || '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    {r.size || '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    {r.seq ?? '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    {r.current_stage || '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    <span className={statusBadgeClass(r.status === 'active' ? 'PRINTED' : 'PENDING')}>
                      {r.status === 'active' ? 'Active' : 'Retired'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    {r.generated_at ? new Date(r.generated_at).toLocaleString() : '—'}
                  </td>
                  <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                    <div className="flex gap-1.5">
                      <button onClick={() => onOpenDetail(r.code)} className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-xs">
                        View
                      </button>
                      <button onClick={() => onPrintSingle(r.code)} className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-xs">
                        Print
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      )}

      {/* --- Section 3: Table Pagination --- */}
      <BarcodePagination page={page} pages={pages} setPage={setPage} />
    </div>
  );
}
