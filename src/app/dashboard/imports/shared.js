'use client';
import { useState, useEffect } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Save,
  Trash2,
  ChevronDown,
  Plus,
  X
} from 'lucide-react';
import { usePatchBreakdownSkuMutation, useDeleteBreakdownSkuMutation } from '@/store/slices/importsApiSlice';
import {
  useAddStyleMaterialSpecLineMutation,
  useLazyGetMaterialLotsQuery
} from '@/store/slices/apiSlice';

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
    DRAFT: { bg: '#fffbeb', color: '#a86022', border: '#fde68a', text: 'PENDING' },
    RELEASED: { bg: '#f0fdf4', color: '#10b981', border: '#bbf7d0', text: 'APPROVED' },
    CANCELLED: { bg: '#f5f5f5', color: '#888', border: '#e2e2e2', text: 'CANCELLED' },
  };
  const s = map[status] || map.DRAFT;
  return (
    <span className="px-2.5 py-1 rounded-md text-[9px] font-black tracking-wider shrink-0" style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.text}
    </span>
  );
}

const ACCESSORY_SUBTYPES = ['BUTTON', 'ZIP', 'THREAD', 'OTHER'];

// One editable SKU row inside a DRAFT style card with expandable + Add Accessory button.
export function SkuRow({ sku, styleId, editable, onSaved, onDeleted, token, showToast }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [qty, setQty] = useState(sku.qty_ordered ?? '');
  const [size, setSize] = useState(sku.size ?? '');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Add accessory form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [formSubtype, setFormSubtype] = useState('BUTTON');
  const [formArticle, setFormArticle] = useState('');
  const [formColour, setFormColour] = useState(sku.colour || sku.color_code || '');
  const [formSize, setFormSize] = useState(sku.size || '');
  const [formQty, setFormQty] = useState(1);
  const [formUom, setFormUom] = useState('pcs');
  const [formLotId, setFormLotId] = useState('');
  const [formNote, setFormNote] = useState('');
  const [addingAccessory, setAddingAccessory] = useState(false);

  // Available lots for quick pick
  const [lots, setLots] = useState([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [selectedLotPick, setSelectedLotPick] = useState('__custom__');

  const [patchBreakdownSku] = usePatchBreakdownSkuMutation();
  const [deleteBreakdownSku] = useDeleteBreakdownSkuMutation();
  const [addStyleMaterialSpecLine] = useAddStyleMaterialSpecLineMutation();
  const [triggerGetMaterialLots] = useLazyGetMaterialLotsQuery();

  // Fetch stock lots when form opens or subtype changes
  useEffect(() => {
    if (!showAddForm || !token) return;
    setLotsLoading(true);
    triggerGetMaterialLots({ category: 'ACCESSORY', subtype: formSubtype })
      .unwrap()
      .then((res) => setLots(res?.lots || []))
      .catch(() => setLots([]))
      .finally(() => setLotsLoading(false));
  }, [showAddForm, formSubtype, token, triggerGetMaterialLots]);

  const handleLotPick = (lotId) => {
    setSelectedLotPick(lotId);
    if (lotId === '__custom__') return;
    const lot = lots.find((l) => l.lot_id === lotId);
    if (!lot) return;
    if (lot.article) setFormArticle(lot.article);
    if (lot.colour) setFormColour(lot.colour);
    if (lot.size) setFormSize(lot.size);
    setFormLotId(lot.lot_id || '');
  };

  const handleSave = async (e) => {
    e?.stopPropagation();
    setSaving(true);
    try {
      await patchBreakdownSku({
        skuId: sku.sku_id,
        qty_ordered: qty === '' ? undefined : Number(qty),
        size: size || undefined
      }).unwrap();
      showToast?.('SKU updated.', 'success');
      setEditing(false);
      onSaved?.();
    } catch (err) {
      showToast?.(err.message || 'Update failed.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (e) => {
    e?.stopPropagation();
    setDeleting(true);
    try {
      await deleteBreakdownSku({ skuId: sku.sku_id }).unwrap();
      showToast?.('SKU line removed.', 'success');
      onDeleted?.();
    } catch (err) {
      showToast?.(err.message || 'Delete failed — pieces may already be minted for this line.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const handleAddAccessorySubmit = async (e) => {
    e?.preventDefault();
    if (!formArticle.trim()) {
      showToast?.('Article name is required.', 'error');
      return;
    }
    if (!formQty || Number(formQty) <= 0) {
      showToast?.('Valid quantity per piece is required.', 'error');
      return;
    }
    if (!styleId) {
      showToast?.('Style ID is missing.', 'error');
      return;
    }

    setAddingAccessory(true);
    try {
      const payload = {
        sku_id: sku.sku_id,
        category: 'ACCESSORY',
        subtype: formSubtype,
        article: formArticle.trim(),
        colour: formColour?.trim() || undefined,
        size: formSize?.trim() || sku.size || undefined,
        qty_per_piece: Number(formQty),
        uom: formUom || 'pcs',
        material_lot_id: formLotId?.trim() || undefined,
        note: formNote?.trim() || undefined,
      };

      await addStyleMaterialSpecLine({
        styleId: styleId,
        line: payload,
      }).unwrap();

      showToast?.(`Accessory "${formArticle.trim()}" added to SKU.`, 'success');
      setShowAddForm(false);
      setFormArticle('');
      setFormNote('');
      setFormLotId('');
      setSelectedLotPick('__custom__');
    } catch (err) {
      showToast?.(err.message || 'Failed to add accessory line.', 'error');
    } finally {
      setAddingAccessory(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 transition-all overflow-hidden shadow-2xs">
      {/* ── Main SKU Header Bar ── */}
      <div
        className="flex items-center gap-3 p-2.5 text-xs cursor-pointer hover:bg-amber-50/40 transition-colors"
        onClick={() => setIsExpanded((prev) => !prev)}
      >
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform shrink-0 ${isExpanded ? 'rotate-180 text-[#c8834a]' : ''}`}
        />
        <span className="font-mono font-bold text-slate-700 flex-1 min-w-0 truncate">{sku.sku_code}</span>
        <span className="text-slate-500 font-semibold">{sku.colour || sku.color_code || '—'}</span>

        {editing ? (
          <input
            value={size}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setSize(e.target.value)}
            className="w-14 h-7 px-1.5 border rounded text-center font-bold bg-white"
            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
          />
        ) : (
          <span className="text-slate-600 font-bold w-14 text-center">{sku.size || '—'}</span>
        )}

        {editing ? (
          <input
            type="number"
            value={qty}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => setQty(e.target.value)}
            className="w-16 h-7 px-1.5 border rounded text-center font-bold bg-white"
            style={{ borderColor: 'rgba(200,131,74,0.3)' }}
          />
        ) : (
          <span className="font-black w-16 text-center" style={{ color: '#c8834a' }}>
            {sku.qty_ordered} pcs
          </span>
        )}

        {editable && (
          editing ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="p-1.5 rounded-lg bg-emerald-500 text-white shrink-0 disabled:opacity-50 hover:bg-emerald-600 cursor-pointer"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
            </button>
          ) : (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setEditing(true);
              }}
              className="p-1.5 px-2.5 rounded-lg bg-white border shrink-0 text-xs font-bold hover:bg-slate-50 cursor-pointer"
              style={{ borderColor: 'rgba(200,131,74,0.25)', color: '#c8834a' }}
            >
              Edit
            </button>
          )
        )}

        {editable && (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg bg-red-50 text-red-500 shrink-0 disabled:opacity-50 hover:bg-red-100 cursor-pointer"
            title="Delete this line (only if no pieces minted yet)"
          >
            {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>

      {/* ── Expandable SKU Accessory Spec Section ── */}
      {isExpanded && (
        <div className="p-3 bg-white border-t border-slate-200/80 space-y-2.5 animate-fade-in text-xs">
          {!showAddForm ? (
            <div className="flex justify-end">
              {editable && (
                <button
                  type="button"
                  onClick={() => {
                    setShowAddForm(true);
                    setFormColour(sku.colour || sku.color_code || '');
                    setFormSize(sku.size || '');
                  }}
                  className="h-8 px-4 rounded-xl text-xs font-black uppercase text-white shadow-xs hover:brightness-105 transition-all cursor-pointer"
                  style={{ background: '#c8834a' }}
                >
                  Add Accessory
                </button>
              )}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-[#fdfbf7] border border-[#c8834a]/30 space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-[#c8834a]/15 pb-2">
                <span className="text-[11px] font-black uppercase tracking-wider text-[#8a4e1d]">
                  New Accessory for {sku.sku_code}
                </span>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {/* Subtype */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Subtype *</label>
                  <select
                    value={formSubtype}
                    onChange={(e) => setFormSubtype(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                  >
                    {ACCESSORY_SUBTYPES.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                {/* Stock lot picker */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Pick Stock Lot <span className="normal-case text-slate-400">(optional)</span>
                  </label>
                  <select
                    value={selectedLotPick}
                    onChange={(e) => handleLotPick(e.target.value)}
                    disabled={lotsLoading}
                    className="w-full h-9 px-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a] truncate"
                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                  >
                    <option value="__custom__">— Manual / Custom Article —</option>
                    {lots.map((l) => (
                      <option key={l.lot_id} value={l.lot_id}>
                        {l.article} {l.colour ? `(${l.colour})` : ''} {l.size ? `[${l.size}]` : ''} — {l.available ?? l.on_hand} {l.uom}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Article */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Article *</label>
                  <input
                    type="text"
                    placeholder="e.g. HORN TAUPE"
                    value={formArticle}
                    onChange={(e) => setFormArticle(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                  />
                </div>

                {/* Colour */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Colour</label>
                  <input
                    type="text"
                    placeholder="Colour"
                    value={formColour}
                    onChange={(e) => setFormColour(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                  />
                </div>

                {/* Size */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Size</label>
                  <input
                    type="text"
                    placeholder="e.g. 2XL"
                    value={formSize}
                    onChange={(e) => setFormSize(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                  />
                </div>

                {/* Qty per piece */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Qty / Piece *</label>
                  <input
                    type="number"
                    min="0.01"
                    step="any"
                    placeholder="1"
                    value={formQty}
                    onChange={(e) => setFormQty(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                  />
                </div>

                {/* Material Lot ID */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Lot ID <span className="normal-case text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Lot ID or Barcode"
                    value={formLotId}
                    onChange={(e) => setFormLotId(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                  />
                </div>

                {/* Note */}
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Note <span className="normal-case text-slate-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Front zipper"
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    className="w-full h-9 px-2.5 bg-white border rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                  />
                </div>
              </div>

              {/* Form Action Buttons */}
              <div className="flex justify-end gap-2 pt-1 border-t border-[#c8834a]/15">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="h-8 px-3 rounded-xl font-black text-[11px] uppercase bg-white border text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleAddAccessorySubmit}
                  disabled={addingAccessory}
                  className="h-8 px-5 rounded-xl font-black text-[11px] uppercase text-white shadow-xs hover:brightness-105 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  style={{ background: '#c8834a' }}
                >
                  {addingAccessory && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Add
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
