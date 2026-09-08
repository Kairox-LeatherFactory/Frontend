'use client';
import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Search, Zap, Send, Printer, RotateCcw, Package, Plus, Layers, Truck, PackageSearch } from 'lucide-react';
import { BRAND, selectCls, inputCls, fieldStyle } from '../_lib/constants';
import { statusBadgeClass } from '../_lib/helpers';
import BarcodeCanvas from './BarcodeCanvas';
import CreateMaterialLotModal from './modals/CreateMaterialLotModal';
import MaterialStockModal from './modals/MaterialStockModal';
import MaterialReceiveModal from './modals/MaterialReceiveModal';
import SupplierOrderModal from './modals/SupplierOrderModal';

/**
 * ============================================================================
 * MaterialGenerationTab Master Component
 * ============================================================================
 * WHAT IT IS:
 * Operations & batch barcode generation center for Raw Materials
 * (Leather hides, Lining rolls, Accessories).
 *
 * WORKFLOW CAPABILITIES:
 * 1. Create Lot: Register new material inventory batches and mint Code-128 tracking barcodes (`POST /api/v1/materials/lots`).
 * 2. Stock Check: Compute live availability and deficit shortfalls (`GET /api/v1/materials/stock`).
 * 3. Receive: Record incoming shipments with approved/rejected quality checks (`POST /api/v1/materials/receive`).
 * 4. Supplier Orders: Raise purchase orders directly to suppliers on shortfall (`POST /api/v1/suppliers/orders`).
 * 5. Batch Print: Queue material lot barcodes for thermal label printing.
 */
export default function MaterialGenerationTab({
  materials,
  materialsLoading,
  materialsError,
  onRetryMaterials,
  materialGenerated,
  onGenerateSelected,
  onGenerateAllRemaining,
  onSendToPrintCenter,
  onOpenDetail,
  onPrintSingle,
  token,
  showToast,
  onRefreshAll,
}) {
  // --------------------------------------------------------------------------
  // 1. STATE & MODAL VISIBILITY
  // --------------------------------------------------------------------------
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveTargetLot, setReceiveTargetLot] = useState(null);
  const [supplierOrderModalOpen, setSupplierOrderModalOpen] = useState(false);
  const [supplierOrderInitialData, setSupplierOrderInitialData] = useState(null);

  // Track already-queued material barcode codes
  const generatedCodes = useMemo(() => new Set(materialGenerated.map((r) => r.pieceCode || r.lotId)), [materialGenerated]);

  // --------------------------------------------------------------------------
  // 2. SEARCH & CATEGORY FILTERING
  // --------------------------------------------------------------------------
  const filteredMaterials = useMemo(() => {
    let list = materials || [];
    if (categoryFilter !== 'ALL') {
      list = list.filter((m) => (m.category || '').toUpperCase() === categoryFilter.toUpperCase());
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) =>
        (m.article || '').toLowerCase().includes(q) ||
        (m.colour || '').toLowerCase().includes(q) ||
        (m.barcode || '').toLowerCase().includes(q) ||
        (m.lot_id || '').toLowerCase().includes(q) ||
        (m.supplier_name || m.supplier_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [materials, categoryFilter, search]);

  // Summary statistics across Leather, Lining, Accessories
  const stats = useMemo(() => {
    const list = materials || [];
    const leather = list.filter((m) => (m.category || '').toUpperCase() === 'LEATHER').length;
    const lining = list.filter((m) => (m.category || '').toUpperCase() === 'LINING').length;
    const acc = list.filter((m) => (m.category || '').toUpperCase().startsWith('ACCESSOR')).length;
    return { total: list.length, leather, lining, acc, generated: materialGenerated.length };
  }, [materials, materialGenerated]);

  // --------------------------------------------------------------------------
  // 3. SELECTION & QUEUE HANDLERS
  // --------------------------------------------------------------------------
  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAllVisible = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    filteredMaterials.forEach((m) => {
      const key = m.lot_id || m.barcode;
      if (key) next.add(key);
    });
    return next;
  });

  const clearSelection = () => setSelectedIds(new Set());

  const handleGenerateClick = () => {
    const chosen = (materials || []).filter((m) => selectedIds.has(m.lot_id || m.barcode));
    onGenerateSelected(chosen);
    setSelectedIds(new Set());
  };

  const handleOpenReceive = (lot) => {
    setReceiveTargetLot(lot);
    setReceiveModalOpen(true);
  };

  // --------------------------------------------------------------------------
  // 4. RENDER TAB INTERFACE
  // --------------------------------------------------------------------------
  return (
    <div className="space-y-6 animate-fade-in">
      {/* --- Section 1: Overview Summary Cards --- */}
      <div className="rounded-2xl p-6 shadow-sm flex items-center gap-6 flex-wrap" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Total Material Lots</p><p className="font-bold text-lg" style={{ color: BRAND.text }}>{stats.total}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Leather Lots</p><p className="font-bold text-lg" style={{ color: BRAND.text }}>{stats.leather}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Lining Lots</p><p className="font-bold text-lg" style={{ color: BRAND.text }}>{stats.lining}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Accessories</p><p className="font-bold text-lg" style={{ color: BRAND.text }}>{stats.acc}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Queued / Generated</p><p className="font-bold text-lg" style={{ color: BRAND.accent }}>{stats.generated}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Selected</p><p className="font-bold text-lg" style={{ color: '#d97706' }}>{selectedIds.size}</p></div>
      </div>

      {/* --- Section 2: Operations Action Bar --- */}
      <div className="rounded-2xl p-6 shadow-sm space-y-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2" style={{ color: BRAND.text }}>
              <Package className="w-5 h-5 text-[#c8834a]" /> Material Barcode &amp; Lot Operations
            </h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>
              Create material lots with child barcodes (<code className="font-mono text-xs font-bold text-[#a86530]">POST /materials/lots</code>), check live stock &amp; shortfalls, record receiving, and raise supplier orders.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCreateModalOpen(true)} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs shadow-md">
              <Plus className="w-4 h-4" /> Create Material Lot &amp; Barcode
            </button>
            <button onClick={() => setStockModalOpen(true)} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
              <Layers className="w-4 h-4" /> Check Stock &amp; Shortfall
            </button>
            <button onClick={() => { setReceiveTargetLot(null); setReceiveModalOpen(true); }} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
              <Truck className="w-4 h-4" /> Receive Material
            </button>
            <button onClick={() => { setSupplierOrderInitialData(null); setSupplierOrderModalOpen(true); }} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
              <PackageSearch className="w-4 h-4" /> Raise Supplier Order
            </button>
          </div>
        </div>

        {/* Multi-Selection & Controls Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-[rgba(200,131,74,0.15)]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] font-bold uppercase whitespace-nowrap" style={{ color: BRAND.textMuted }}>Category:</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${selectCls} !w-44`} style={fieldStyle}>
                <option value="ALL">All Categories</option>
                <option value="LEATHER">LEATHER</option>
                <option value="LINING">LINING</option>
                <option value="ACCESSORIES">ACCESSORIES</option>
              </select>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search article, color, barcode..." className={`${inputCls} !pl-8 !w-60 !py-2`} style={fieldStyle} />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={handleGenerateClick} disabled={selectedIds.size === 0} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs disabled:opacity-50">
              <Zap className="w-3.5 h-3.5" /> Queue Selected ({selectedIds.size})
            </button>
            <button onClick={onGenerateAllRemaining} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">Queue All</button>
            <button onClick={onSendToPrintCenter} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
              <Send className="w-3.5 h-3.5" /> Send All to Print Center
            </button>
            <button onClick={onRetryMaterials} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs" style={{ color: BRAND.textMuted }}>{filteredMaterials.length} material lot{filteredMaterials.length === 1 ? '' : 's'} found</p>
          <div className="flex gap-2">
            <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Select All Visible</button>
            <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Clear</button>
          </div>
        </div>

        {/* --- Section 3: Material Lots Roster List --- */}
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
          {materialsLoading ? (
            <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>Loading material lots from server…</div>
          ) : materialsError ? (
            <div className="text-center py-8 text-sm space-y-2" style={{ color: BRAND.textMuted }}>
              <p style={{ color: '#b91c1c' }}>{materialsError}</p>
              <button onClick={onRetryMaterials} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Retry</button>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>
              {materials && materials.length === 0 ? 'No material lots registered in database yet. Click "Create Material Lot & Barcode" above.' : 'No materials match your search/filter.'}
            </div>
          ) : (
            <div className="divide-y divide-[rgba(200,131,74,0.15)] max-h-96 overflow-y-auto">
              {filteredMaterials.map((lot) => {
                const uniqueKey = lot.lot_id || lot.barcode || `${lot.category}-${lot.article}`;
                const hasBarcode = !!lot.barcode;
                const isGenerated = generatedCodes.has(lot.barcode) || generatedCodes.has(lot.lot_id);
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
                        checked={isChecked}
                        onChange={() => toggleSelect(uniqueKey)}
                        className="w-4 h-4 accent-[#c8834a] cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2" style={{ color: '#5a3518' }}>
                          <span>{lot.article || 'Unnamed Article'}</span>
                          {lot.colour && <span className="text-xs text-slate-600 font-semibold">({lot.colour})</span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            (lot.category || '').toUpperCase() === 'LEATHER' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                            (lot.category || '').toUpperCase() === 'LINING' ? 'bg-rose-100 text-rose-900 border border-rose-200' :
                            'bg-purple-100 text-purple-900 border border-purple-200'
                          }`}>
                            {lot.category}{lot.subtype ? ` · ${lot.subtype}` : ''}
                          </span>
                        </div>
                        <div className="text-xs font-mono mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: BRAND.textMuted }}>
                          {hasBarcode ? (
                            <span>Barcode: <strong className="text-[#a86530] font-mono">{lot.barcode}</strong></span>
                          ) : (
                            <span className="text-red-600 font-sans">No barcode registered</span>
                          )}
                          <span>· Stock: <strong className="text-emerald-700 font-mono">{lot.on_hand ?? lot.available ?? 0} {lot.uom || ''}</strong></span>
                          {lot.reserved ? <span className="text-amber-700">(Reserved: {lot.reserved})</span> : null}
                          {lot.supplier_name && <span>· Supplier: <span className="text-slate-700 font-sans">{lot.supplier_name}</span></span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenReceive(lot)}
                        className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-[11px]"
                        title="Receive more material into this lot"
                      >
                        <Truck className="w-3 h-3" /> Receive
                      </button>
                      <button
                        type="button"
                        onClick={() => onPrintSingle(lot.barcode || lot.lot_id)}
                        className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-[11px]"
                        title="Print single label"
                      >
                        <Printer className="w-3 h-3" /> Print
                      </button>
                      <span className={statusBadgeClass(isGenerated ? 'PRINTED' : 'PENDING')}>
                        {isGenerated ? 'Queued / Ready' : 'Unqueued'}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- Section 4: Generated Material Barcodes Grid --- */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Material Barcodes &amp; Labels</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {materialGenerated.length} barcodes in queue</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter barcode/article..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
          </div>
        </div>

        {materialGenerated.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
            <p className="font-bold" style={{ color: BRAND.textMuted }}>No material barcodes queued yet.</p>
            <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Select material lots above or click &quot;Create Material Lot &amp; Barcode&quot; to mint one.</p>
          </div>
        ) : (
          <motion.div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {materialGenerated.map((b) => (
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
                    {b.color && <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold uppercase" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.color}</span>}
                    <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-800 mt-1 font-mono">
                    Stock: {b.size}
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

      {/* --- Section 5: Operation Modals --- */}
      <CreateMaterialLotModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        token={token}
        showToast={showToast}
        onSuccess={(res, payload) => {
          onRetryMaterials();
          if (res?.barcode) {
            onGenerateSelected([{ ...payload, barcode: res.barcode, lot_id: res.lot_id }]);
          }
        }}
      />

      <MaterialStockModal
        open={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        token={token}
        showToast={showToast}
        onOpenSupplierOrder={(data) => {
          setSupplierOrderInitialData(data);
          setSupplierOrderModalOpen(true);
        }}
      />

      <MaterialReceiveModal
        open={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        lot={receiveTargetLot}
        token={token}
        showToast={showToast}
        onSuccess={() => onRetryMaterials()}
      />

      <SupplierOrderModal
        open={supplierOrderModalOpen}
        onClose={() => setSupplierOrderModalOpen(false)}
        initialData={supplierOrderInitialData}
        token={token}
        showToast={showToast}
        onSuccess={() => onRetryMaterials()}
      />
    </div>
  );
}
