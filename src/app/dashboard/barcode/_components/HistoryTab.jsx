'use client';
import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { RotateCcw, FileDown, ChevronRight } from 'lucide-react';
import { BRAND, CATEGORY_LABELS } from '../_lib/constants';
import { statusBadgeClass } from '../_lib/helpers';
import ScreenSafeSelect from './ScreenSafeSelect';

/**
 * ============================================================================
 * HistoryTab Master Component
 * ============================================================================
 * WHAT IT IS:
 * Universal Batch History & Audit trail tab for inspecting past barcode generations.
 *
 * CAPABILITIES:
 * - Multi-criteria filters: Order ID, Style, Client, Size, Operator, Print Status, Sort Order.
 * - Accordion order summary grouping with total piece counts.
 * - Tabular view with 1-click batch reprinting and detail inspection.
 * - Page-level CSV export.
 */
export default function HistoryTab({
  batchHistoryStore,
  filters,
  setFilter,
  resetFilters,
  options,
  onView,
  onReprint,
  onExportCSV,
  expandedOrders,
  onToggleOrderExpand,
  labels = CATEGORY_LABELS.style,
}) {
  // --------------------------------------------------------------------------
  // 1. FILTERING & SORTING LOGIC
  // --------------------------------------------------------------------------
  const filtered = useMemo(() => {
    let list = batchHistoryStore.filter((b) =>
      (filters.orderId === 'ALL' || b.orderId === filters.orderId) &&
      (filters.style === 'ALL' || b.style === filters.style) &&
      (filters.client === 'ALL' || b.client === filters.client) &&
      (filters.size === 'ALL' || b.size.includes(filters.size)) &&
      (filters.operator === 'ALL' || b.generatedBy === filters.operator) &&
      (filters.status === 'ALL' || b.printStatus === filters.status)
    );
    if (filters.sort === 'OLDEST') list = [...list].reverse();
    else if (filters.sort === 'QTY_HIGH') list = [...list].sort((a, b) => b.qty - a.qty);
    return list;
  }, [batchHistoryStore, filters]);

  // Group filtered batch rows by Order ID
  const orderGroups = useMemo(() => {
    const map = new Map();
    filtered.forEach((b) => {
      if (!map.has(b.orderId)) map.set(b.orderId, { orderId: b.orderId, client: b.client, batches: [] });
      map.get(b.orderId).batches.push(b);
    });
    return Array.from(map.values());
  }, [filtered]);

  // --------------------------------------------------------------------------
  // 2. HELPER: LABELED FILTER DROPDOWN
  // --------------------------------------------------------------------------
  const FilterSelect = ({ label, field, opts }) => (
    <div>
      <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>
        {label}
      </label>
      <ScreenSafeSelect
        value={filters[field]}
        onChange={(v) => setFilter(field, v)}
        options={[{ value: 'ALL', label: `All ${label}` }, ...opts.map((o) => ({ value: o, label: o }))]}
      />
    </div>
  );

  // --------------------------------------------------------------------------
  // 3. RENDER HISTORY VIEW
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* --- Section 1: History Multi-Filter Toolbar --- */}
      <div
        className="rounded-2xl p-5 shadow-sm grid gap-4 items-end"
        style={{ background: '#fff', border: `1.5px solid ${BRAND.border}`, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}
      >
        <FilterSelect label={labels.orderIdLabel} field="orderId" opts={options.orderIds} />
        <FilterSelect label={labels.styleLabel} field="style" opts={options.styles} />
        <FilterSelect label={labels.clientLabel} field="client" opts={options.clients} />
        <FilterSelect label={labels.sizeLabel} field="size" opts={options.sizes} />
        <FilterSelect label="Operator" field="operator" opts={options.operators} />
        <div>
          <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Print Status</label>
          <ScreenSafeSelect
            value={filters.status}
            onChange={(v) => setFilter('status', v)}
            options={[
              { value: 'ALL', label: 'All Statuses' },
              { value: 'PRINTED', label: 'Printed' },
              { value: 'PENDING', label: 'Pending' },
              { value: 'PARTIAL', label: 'Partial' },
            ]}
          />
        </div>
        <div>
          <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Sort By</label>
          <ScreenSafeSelect
            value={filters.sort}
            onChange={(v) => setFilter('sort', v)}
            options={[
              { value: 'NEWEST', label: 'Date (Newest First)' },
              { value: 'OLDEST', label: 'Date (Oldest First)' },
              { value: 'QTY_HIGH', label: 'Qty (High to Low)' },
            ]}
          />
        </div>
        <button onClick={resetFilters} className="btn-warm-secondary !min-h-0 !py-2.5">
          <RotateCcw className="w-4 h-4" /> Reset
        </button>
      </div>

      {/* --- Section 2: Order Batch Accordion Groups --- */}
      <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Barcode Batch Records</h3>
          <button onClick={onExportCSV} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
            <FileDown className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {orderGroups.length === 0 ? (
          <div className="text-center py-8" style={{ color: BRAND.textMuted }}>
            No batch history records match the selected filters.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {orderGroups.map((og) => {
              const totalQty = og.batches.reduce((sum, b) => sum + b.qty, 0);
              const statuses = new Set(og.batches.map((b) => b.printStatus));
              const groupStatus = statuses.size === 1 ? og.batches[0].printStatus : 'PARTIAL';
              const expanded = expandedOrders.has(og.orderId);

              return (
                <div key={og.orderId} className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${BRAND.border}` }}>
                  {/* Order Accordion Header */}
                  <div
                    className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer"
                    style={{ background: BRAND.bg }}
                    onClick={() => onToggleOrderExpand(og.orderId)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="px-3 py-1.5 rounded-lg font-mono font-black text-sm text-white" style={{ background: '#3d2b1a' }}>
                        {og.orderId}
                      </div>
                      <div>
                        <div className="font-black text-sm" style={{ color: '#5a3518' }}>{og.client}</div>
                        <div className="text-xs" style={{ color: BRAND.textMuted }}>
                          {og.batches.length} batches • {totalQty} pcs total
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={statusBadgeClass(groupStatus)}>{groupStatus}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleOrderExpand(og.orderId);
                        }}
                        className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs"
                      >
                        <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} /> View Batches ({og.batches.length})
                      </button>
                    </div>
                  </div>

                  {/* Batches Table Body */}
                  {expanded && (
                    <div style={{ overflow: 'hidden' }}>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr style={{ background: '#fff' }}>
                              {['Batch No', `${labels.styleLabel} & ${labels.colorLabel}`, labels.sizeLabel, 'Qty', 'Generated By', 'Created', 'Status', 'Actions'].map((h) => (
                                <th
                                  key={h}
                                  className="text-left px-3 py-2.5 text-[0.7rem] font-bold uppercase tracking-wide"
                                  style={{ color: BRAND.textMuted, borderBottom: `1.5px solid ${BRAND.border}` }}
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <motion.tbody>
                            {og.batches.map((b) => (
                              <motion.tr key={b.batchNo} className="hover:bg-[#fdf6ee]">
                                <td className="px-3 py-2.5 font-mono font-bold" style={{ color: '#5a3518', borderBottom: '1px solid #f0e8d7' }}>
                                  {b.batchNo}
                                </td>
                                <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                                  {b.style}{b.color ? ` (${b.color})` : ''}
                                </td>
                                <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                                  {b.size}
                                </td>
                                <td className="px-3 py-2.5 font-bold" style={{ borderBottom: '1px solid #f0e8d7' }}>
                                  {b.qty} pcs
                                </td>
                                <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                                  {b.generatedBy}
                                </td>
                                <td className="px-3 py-2.5 text-xs" style={{ borderBottom: '1px solid #f0e8d7' }}>
                                  {b.createdDate}
                                </td>
                                <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                                  <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
                                </td>
                                <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
                                  <div className="flex gap-1.5">
                                    <button onClick={() => onView(b.orderId, b.style)} className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-xs">
                                      View
                                    </button>
                                    <button onClick={() => onReprint(b)} className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-xs">
                                      Reprint
                                    </button>
                                  </div>
                                </td>
                              </motion.tr>
                            ))}
                          </motion.tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
