'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Lock, Pencil, Loader2, ArrowUpRight, ArrowDownRight, PackagePlus, Trash2 } from 'lucide-react';
import { usePatchMaterialLotMutation, useAdjustMaterialLotMutation, useRetireMaterialLotMutation }
 from '@/store/slices/materialApiSlice';
import { errMsg, Tile } from './shared';
export function LotDetail({lot, onClose, onChanged, showToast, canEdit, canAdjust, onReceive }) {
   const [patchMaterialLot] = usePatchMaterialLotMutation();
  const [adjustMaterialLot] = useAdjustMaterialLotMutation();
  const [retireMaterialLot] = useRetireMaterialLotMutation();

    const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [confirmRetire, setConfirmRetire] = useState(false);
  const [retiring, setRetiring] = useState(false);

  useEffect(() => {
    setForm(Object.fromEntries((lot.editable_fields || []).map((f) => [f, lot[f] ?? ''])));
    setEditing(false); setAdjusting(false); setDelta(''); setReason(''); setConfirmRetire(false);
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

  const handleAdjust = async (sign) => {
    const n = Number(delta);
    if (!n) { showToast('Enter a non-zero amount.', 'error'); return; }
    setAdjusting(true);
    try {
     await adjustMaterialLot({ lotId: lot.lot_id, delta: sign * Math.abs(n), reason }).unwrap();
      showToast('Stock adjusted.', 'success');
      setDelta(''); setReason('');
      onChanged();
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setAdjusting(false); }
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
              <Lock className="w-4 h-4" /> RETIRED — read-only. Barcode no longer scans; cut history is preserved.
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Tile label="On Hand" value={lot.on_hand} uom={lot.uom} />
            <Tile label="Reserved" value={lot.reserved} uom={lot.uom} />
            <Tile label="Available" value={lot.available} uom={lot.uom} primary />
          </div>

          <div className="text-xs font-bold text-slate-500">
            {lot.category}{lot.subtype ? ` / ${lot.subtype}` : ''}{lot.thickness ? ` · ${lot.thickness}` : ''}{lot.size ? ` · ${lot.size}` : ''}
          </div>

          {lot.is_active && canEdit && (
            <div className="p-3 rounded-xl bg-slate-50 border space-y-2" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Identity</span>
                {!editing && <button onClick={() => setEditing(true)} className="text-[10px] font-black uppercase flex items-center gap-1" style={{ color: '#c8834a' }}><Pencil className="w-3 h-3" /> Edit</button>}
              </div>
              {editing ? (
                <>
                  {(lot.editable_fields || []).map((f) => (
                    <div key={f} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-400 w-20 shrink-0 capitalize">{f.replace('_', ' ')}</span>
                      <input value={form[f] ?? ''} onChange={(e) => setForm((p) => ({ ...p, [f]: e.target.value }))} className="flex-1 h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                    </div>
                  ))}
                  <div className="flex gap-2 pt-1">
                    <button onClick={handleSave} disabled={saving} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white disabled:opacity-50" style={{ background: '#c8834a' }}>{saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save'}</button>
                    <button onClick={() => setEditing(false)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                  </div>
                </>
              ) : (
                <div className="text-xs font-bold text-slate-600">Supplier: {lot.supplier_name || lot.supplier_id || '—'}{lot.supplier_name && lot.supplier_id ? ` (${lot.supplier_id})` : ''}</div>
              )}
            </div>
          )}

          {lot.is_active && canAdjust && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700">Adjust Stock — not a total, a movement</span>
              <div className="flex items-center gap-2">
                <input type="number" placeholder="Amount" value={delta} onChange={(e) => setDelta(e.target.value)} className="w-24 h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
                <button onClick={() => handleAdjust(1)} disabled={adjusting || !delta || !reason.trim()} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-emerald-500 disabled:opacity-40 flex items-center gap-1"><ArrowUpRight className="w-3.5 h-3.5" /> Add</button>
                <button onClick={() => handleAdjust(-1)} disabled={adjusting || !delta || !reason.trim()} className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white bg-red-500 disabled:opacity-40 flex items-center gap-1"><ArrowDownRight className="w-3.5 h-3.5" /> Remove</button>
              </div>
              <input placeholder="Reason (required, 3–300 chars)…" value={reason} onChange={(e) => setReason(e.target.value)} className="w-full h-8 px-2 border rounded-lg text-xs font-bold" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
          )}

          {lot.is_active && canAdjust && onReceive && (
            <button onClick={() => onReceive(lot)} className="w-full h-9 rounded-xl font-black text-[10px] uppercase text-white flex items-center justify-center gap-1.5" style={{ background: '#c8834a' }}>
              <PackagePlus className="w-3.5 h-3.5" /> Receive More Stock
            </button>
          )}

          {lot.is_active && canAdjust && (
            confirmRetire ? (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
                <p className="text-xs font-bold text-red-700">Retire this lot? Its barcode stops scanning; cut history stays. This is not a delete.</p>
                <div className="flex gap-2">
                  <button onClick={handleRetire} disabled={retiring} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-white bg-red-600 disabled:opacity-50">{retiring ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Confirm Retire'}</button>
                  <button onClick={() => setConfirmRetire(false)} className="h-8 px-4 rounded-lg font-black text-[10px] uppercase text-slate-500 bg-slate-100">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setConfirmRetire(true)} className="w-full h-9 rounded-xl font-black text-[10px] uppercase text-red-600 bg-red-50 border border-red-200 flex items-center justify-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> Retire Lot
              </button>
            )
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
