'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, Pencil, Loader2, PackagePlus, Trash2 } from 'lucide-react';
import { usePatchMaterialLotMutation, useRetireMaterialLotMutation, useGetMaterialLotHistoryQuery, useGetSuppliersQuery }
 from '@/store/slices/materialApiSlice';
import { errMsg, Tile } from './shared';
export function LotDetail({lot, onClose, onChanged, showToast, canEdit, canAdjust, onReceive }) {
   const [patchMaterialLot] = usePatchMaterialLotMutation();
  const [retireMaterialLot] = useRetireMaterialLotMutation();

  const { data: historyRes, isLoading: historyLoading } = useGetMaterialLotHistoryQuery(lot?.lot_id, { skip: !lot?.lot_id });

  const historyEvents = Array.isArray(historyRes)
    ? historyRes
    : (historyRes?.events || historyRes?.history || historyRes?.items || []);

    const [editing, setEditing] = useState(false);

  // Show the supplier by name — the lot itself only carries supplier_id (the edit form picks by name too)
  const { data: suppliers = [] } = useGetSuppliersQuery(undefined, {
    skip: !(editing || (lot?.supplier_id && !lot?.supplier_name)),
  });
  const supplierIdOf = (s) => s.id || s.supplier_id;
  const supplierName = lot.supplier_name
    || suppliers.find((s) => supplierIdOf(s) === lot.supplier_id)?.name
    || null;
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [retiring, setRetiring] = useState(false);

  useEffect(() => {
    setForm(Object.fromEntries((lot.editable_fields || []).map((f) => [f, lot[f] ?? ''])));
    setEditing(false); setConfirmRetire(false);
  }, [lot.lot_id]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true);
    try {
      const changed = Object.fromEntries(Object.entries(form).filter(([k, v]) => v !== (lot[k] ?? '')));
  await patchMaterialLot({ lotId: lot.lot_id, ...changed }).unwrap();
      showToast('Lot updated.', 'success');
      setEditing(false);
      onChanged();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setSaving(false); }
  };

  const handleRetire = async () => {
    setRetiring(true);
    try {
        const res = await retireMaterialLot(lot.lot_id).unwrap();
       showToast(res.message, 'success');
      onChanged();
      onClose();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setRetiring(false); }
  };

  // Rendered inline, `fixed inset-0` was resolving against the nearest
  // ancestor with a transform (the page's own animate-fade-in wrapper),
  // not the viewport — so the modal opened off-screen, below the fold.
  // Porting straight to document.body escapes that and centers it for real.
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div>
            <div className="font-mono text-[10px] font-bold text-slate-400">{lot.barcode}</div>
            <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{lot.article} · {lot.colour}</h3>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100"><X className="w-4 h-4" /></button>
        </div>

        <div className="p-5 space-y-4 overflow-y-auto">
          {!lot.is_active && (
            <div className="p-3 rounded-xl bg-slate-100 border border-slate-300 text-xs font-black text-slate-500 flex items-center gap-2">
              <Lock className="w-4 h-4" /> RETIRED / DEACTIVATED — Read-only. Barcode no longer scans; cut history is preserved.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Tile label="In Factory" value={lot.on_hand} uom={lot.uom} />
            <Tile label="Reserved" value={lot.reserved} uom={lot.uom} />
            <Tile label="Ready to Use" value={lot.available} uom={lot.uom} primary />
          </div>

          <div className="text-xs font-bold text-slate-500">
            {lot.category}{lot.subtype ? ` / ${lot.subtype}` : ''}{lot.thickness ? ` · ${lot.thickness}` : ''}{lot.size ? ` · ${lot.size}` : ''}
          </div>

          {lot.is_active && canEdit && (
            <div className="p-3 rounded-xl bg-slate-50 border space-y-2" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Material Details & Supplier</span>
                {!editing && <button onClick={() => setEditing(true)} className="text-[10px] font-black uppercase flex items-center gap-1" style={{ color: '#c8834a' }}><Pencil className="w-3 h-3" /> Edit Details</button>}
              </div>
              {editing ? (
                <>
                  {(lot.editable_fields || []).map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-24 shrink-0 capitalize">{f === 'supplier_id' ? 'Supplier' : f.replace('_', ' ')}</span>
                      {f === 'supplier_id' && suppliers.length > 0 ? (
                        // Pick the supplier by name; the id is what gets saved
                        <select value={form[f] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} className="flex-1 h-8 px-2 border rounded-lg text-xs font-bold bg-white" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
                          <option value="">— No supplier —</option>
                          {form[f] && !suppliers.some((s) => supplierIdOf(s) === form[f]) && (
                            <option value={form[f]}>{supplierName || 'Current supplier'}</option>
                          )}
                          {suppliers.map((s) => (
                            <option key={supplierIdOf(s)} value={supplierIdOf(s)}>{s.name}</option>
                          ))}
                        </select>
                      ) : (
                        <input value={form[f] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} className="flex-1 h-8 px-2 border rounded-lg text-xs font-bold bg-white" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                      )}
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white disabled:opacity-50" style={{ background: '#c8834a' }}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Details'}</button>
                    <button onClick={() => setEditing(false)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                  </div>
                </>
              ) : (
                <div className="text-xs font-bold text-slate-600">Supplier: {supplierName || '—'}</div>
              )}
            </div>
          )}

          {lot.is_active && canAdjust && onReceive && (
            <button
              onClick={() => {
                onClose();
                onReceive(lot);
              }}
              className="w-full h-11 rounded-2xl font-black text-xs uppercase text-white shadow-md shadow-amber-900/10 flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-[0.99]"
              style={{ background: '#c8834a' }}
            >
              <PackagePlus className="w-4 h-4" /> Receive More Stock / Top-up
            </button>
          )}

          {lot.is_active && canAdjust && (
            confirmRetire ? (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 space-y-2">
                <p className="text-xs font-bold text-red-700">Retire this lot? Its barcode will be deactivated, but cutting and consumption history will be preserved.</p>
                <div className="flex gap-2">
                  <button onClick={handleRetire} disabled={retiring} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white bg-red-600 disabled:opacity-50">{retiring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Yes, Retire Lot'}</button>
                  <button onClick={() => setConfirmRetire(false)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmRetire(true)} className="w-full h-9 rounded-xl font-black text-[10px] uppercase text-red-600 bg-red-50 border border-red-200 hover:bg-red-100/80 transition-colors flex items-center justify-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Deactivate / Retire Lot
              </button>
            )
          )}

          {/* History Section */}
          <div className="pt-4 border-t mt-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
            <h4 className="text-[11px] font-black uppercase tracking-wider text-slate-500 mb-3">Stock Movement Ledger</h4>
            {historyLoading ? (
              <div className="flex justify-center p-4">
                <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#c8834a' }} />
              </div>
            ) : historyEvents.length === 0 ? (
              <div className="text-center text-xs font-bold text-slate-400 p-4">No movement events recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {historyEvents.map((evt, idx) => (
                  <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start gap-3 text-xs">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-[10px] font-black text-slate-500">
                      {(evt.event_type || '?').substring(0,2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="font-bold text-slate-700 flex items-center justify-between">
                        <span>{evt.event_type}</span>
                        <span className="text-[10px] text-slate-400">{new Date(evt.timestamp).toLocaleString()}</span>
                      </div>
                      {evt.delta && <div className="text-[10px] font-black mt-0.5" style={{ color: '#c8834a' }}>Movement: {evt.delta > 0 ? `+${evt.delta}` : evt.delta}</div>}
                      {evt.reason && <div className="text-slate-500 mt-0.5">{evt.reason}</div>}
                      {evt.worker_name && <div className="text-[10px] font-bold text-slate-400 mt-0.5">By: {evt.worker_name}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
