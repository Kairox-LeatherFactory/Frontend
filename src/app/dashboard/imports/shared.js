'use client';
import { useState } from 'react';
import { CheckCircle2, XCircle, Loader2, Save, Trash2 } from 'lucide-react';
import { usePatchBreakdownSkuMutation, useDeleteBreakdownSkuMutation } from '@/store/slices/importsApiSlice';

export function Toast({ msg, type }) {
  if (!msg) return null;
  const isSuccess = type === 'success';
  return (
    <div className="fixed bottom-6 right-6 z-[999999] animate-fade-in">
      <div className={`px-6 py-4 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-3 border max-w-sm ${isSuccess ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-red-50 border-red-200 text-red-900'}`}>
        {isSuccess ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <XCircle className="w-5 h-5 text-red-500 shrink-0" />}
        {msg}
      </div>
    </div>
  );
}

export function StatusBadge({ status }) {
  const map = {
    DRAFT: { bg: '#fffbeb', color: '#a86022', border: '#fde68a', text: 'DRAFT' },
    RELEASED: { bg: '#f0fdf4', color: '#10b981', border: '#bbf7d0', text: 'RELEASED' },
    CANCELLED: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'CANCELLED' },
  };
  const s = map[status] || map.DRAFT;
  return (
    <span className="px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider shrink-0" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.text}
    </span>
  );
}

// One editable SKU row inside a DRAFT style card.
export function SkuRow({ sku, editable, onSaved, onDeleted, token, showToast }) {
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(sku.qty_ordered ?? '');
  const [size, setSize] = useState(sku.size ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
    const [patchBreakdownSku] = usePatchBreakdownSkuMutation();
  const [deleteBreakdownSku] = useDeleteBreakdownSkuMutation();

  const handleSave = async () => {
    setSaving(true);
    try {
    await patchBreakdownSku({ 
      skuId: sku.sku_id, 
      qty_ordered: qty === '' ? undefined : Number(qty),
      size: size || undefined
    }).unwrap();
      showToast('SKU updated.', 'success');
      setEditing(false);
    } catch (e) {
      showToast(e.message || 'Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
    await deleteBreakdownSku({ skuId: sku.sku_id }).unwrap();
      showToast('SKU line removed.', 'success');
      onDeleted();
    } catch (e) {
      showToast(e.message || 'Delete failed — pieces may already be minted for this line.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs">
      <span className="font-mono font-bold text-slate-700 flex-1 min-w-0 truncate">{sku.sku_code}</span>
      <span className="text-slate-500">{sku.colour || sku.color_code || '—'}</span>
      {editing ? (
        <input value={size} onChange={(e) => setSize(e.target.value)} className="w-14 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
      ) : (
        <span className="text-slate-500 w-14 text-center">{sku.size || '—'}</span>
      )}
      {editing ? (
        <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-16 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
      ) : (
        <span className="font-black w-16 text-center" style={{ color: '#c8834a' }}>{sku.qty_ordered} pcs</span>
      )}
      {editable && (
        editing ? (
          <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500 text-white shrink-0 disabled:opacity-50">
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          </button>
        ) : (
          <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-white border shrink-0" style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#c8834a' }}>
            Edit
          </button>
        )
      )}
      {editable && (
        <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg bg-red-50 text-red-500 shrink-0 disabled:opacity-50" title="Delete this line (only if no pieces minted yet)">
          {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
        </button>
      )}
    </div>
  );
}
