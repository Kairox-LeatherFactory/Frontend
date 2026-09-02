import { useState, useEffect } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { apiGetMaterialLots,  } from '@/lib/api';
import MaterialSpecLine from './MaterialSpecLine';
import ScreenSafeSelect from './ScreenSafeSelect';
export default function MaterialCategorySection({
  category, label, accentColor, lines, styleId, token, showToast, canEdit, onChanged, pieceCount,
  subtypes, showThickness, defaultForm, minimalFields,
}) {
  const [showForm, setShowForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [lots, setLots] = useState([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState('__custom__');

  const resetForm = () => { setForm(defaultForm); setSelectedLotId('__custom__'); };

  const activeSubtype = subtypes ? form.subtype : undefined;

  useEffect(() => {
    if (!showForm || !token || minimalFields) return;
    setLotsLoading(true);
    apiGetMaterialLots(token, { category, subtype: activeSubtype })
      .then((res) => setLots(res?.lots || []))
      .catch(() => setLots([]))
      .finally(() => setLotsLoading(false));
  }, [showForm, token, category, activeSubtype, minimalFields]);

  const handleLotPick = (lotId) => {
    setSelectedLotId(lotId);
    if (lotId === '__custom__') return;
    const lot = lots.find((l) => l.lot_id === lotId);
    if (!lot) return;
    setForm((f) => ({
      ...f,
      article: lot.article || '',
      colour: lot.colour || '',
      thickness: lot.thickness || '',
      size: lot.size || '',
      material_lot_id: lot.lot_id,
    }));
  };

  const handleAdd = async () => {
    const sizeOrThickness = showThickness ? form.thickness.trim() : form.size.trim();
    if ((!minimalFields && !form.article.trim()) || (minimalFields && !sizeOrThickness) || form.qty_per_piece === '') {
      showToast(minimalFields ? `${showThickness ? 'Thickness' : 'Size'} and per-piece quantity are required.` : 'Article and per-piece quantity are required.', 'error');
      return;
    }
    setAdding(true);
    try {
      await addStyleMaterialSpecLine({ styleId: styleId, line: {
        sku_id: minimalFields ? undefined : (form.sku_id.trim() || null),
        category,
        subtype: subtypes ? form.subtype : undefined,
       
        article: minimalFields ? category : form.article.trim(),
        colour: minimalFields ? undefined : (form.colour.trim() || undefined),
        thickness: showThickness ? (form.thickness.trim() || undefined) : undefined,
        size: !showThickness ? (form.size.trim() || undefined) : undefined,
        qty_per_piece: Number(form.qty_per_piece),
        material_lot_id: minimalFields ? undefined : (form.material_lot_id.trim() || undefined),
      } }).unwrap();
      showToast(`${label} line added.`, 'success');
      resetForm();
      setShowForm(false);
      await onChanged();
    } catch (e) {
      showToast(e.message || `Failed to add ${label.toLowerCase()} line.`, 'error');
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: accentColor }}>{label}</span>
        <span className="text-[10px] font-bold text-slate-400">{lines.length} line(s)</span>
      </div>
      {lines.length === 0 ? (
        <p className="text-xs font-bold text-slate-400 italic">No {label.toLowerCase()} line declared yet.</p>
      ) : (
        lines.map((line) => (
          <MaterialSpecLine key={line.line_id} line={line} styleId={styleId} token={token} showToast={showToast} canEdit={canEdit} onChanged={onChanged} pieceCount={pieceCount} />
        ))
      )}
      {canEdit && (
        showForm ? (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            {!minimalFields && (
              <div className="flex flex-wrap gap-2">
                {subtypes && (
                  <ScreenSafeSelect
                    value={form.subtype}
                    onChange={(val) => setForm((f) => ({ ...f, subtype: val }))}
                    options={subtypes.map((s) => ({ value: s, label: s }))}
                    className="h-8 px-2 border rounded-lg font-bold text-xs bg-white min-w-[9rem]"
                  />
                )}
                <ScreenSafeSelect
                  value={selectedLotId}
                  onChange={handleLotPick}
                  placeholder="— Pick a stock lot (or type a new article below) —"
                  emptyLabel={lotsLoading ? 'Loading stock lots…' : 'No stock lots found.'}
                  options={lots.map((l) => ({
                    value: l.lot_id,
                    label: `${l.article} · ${l.colour || '—'}${l.thickness ? ` · ${l.thickness}` : l.size ? ` · ${l.size}` : ''} — ${l.available ?? l.on_hand ?? 0} ${l.uom || ''} available`,
                  }))}
                  className="h-8 px-2 border rounded-lg font-bold text-xs bg-white flex-1 min-w-[12rem]"
                />
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {!minimalFields && (
                <>
                  <input value={form.article} onChange={(e) => { setForm((f) => ({ ...f, article: e.target.value })); setSelectedLotId('__custom__'); }} placeholder={category === 'LEATHER' ? 'Article (e.g. SUEDE-A32)' : 'Article'} className="h-8 px-2 border rounded-lg font-bold text-xs flex-1 min-w-[8rem]" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
                  <input value={form.colour} onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value }))} placeholder="Colour" className="h-8 px-2 border rounded-lg font-bold text-xs w-24" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
                </>
              )}
              {showThickness ? (
                <input value={form.thickness} onChange={(e) => setForm((f) => ({ ...f, thickness: e.target.value }))} placeholder="Thickness (e.g. 1.2mm)" className="h-8 px-2 border rounded-lg font-bold text-xs w-32" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
              ) : (
                <input value={form.size} onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))} placeholder="Size" className="h-8 px-2 border rounded-lg font-bold text-xs w-20" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
              )}
              <input type="number" value={form.qty_per_piece} onChange={(e) => setForm((f) => ({ ...f, qty_per_piece: e.target.value }))} placeholder={showThickness ? 'Qty / piece (dcm)' : 'Qty / piece'} className="h-8 px-2 border rounded-lg font-bold text-xs w-28" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
            </div>
            {!minimalFields && (
              <div className="flex flex-wrap gap-2">
                <input value={form.sku_id} onChange={(e) => setForm((f) => ({ ...f, sku_id: e.target.value }))} placeholder="SKU override ID (optional)" className="h-8 px-2 border rounded-lg font-bold text-xs flex-1 min-w-[10rem]" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
                <input value={form.material_lot_id} onChange={(e) => setForm((f) => ({ ...f, material_lot_id: e.target.value }))} placeholder="Lot barcode/ID (optional)" className="h-8 px-2 border rounded-lg font-bold text-xs flex-1 min-w-[10rem]" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button onClick={() => { setShowForm(false); resetForm(); }} className="h-8 px-3 rounded-lg font-black text-[11px] uppercase bg-white border text-slate-500" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>Cancel</button>
              <button onClick={handleAdd} disabled={adding} className="h-8 px-3 rounded-lg font-black text-[11px] uppercase text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: accentColor }}>
                {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />} Add
              </button>
            </div>
          </div>
        ) : (
          <button onClick={() => setShowForm(true)} className="h-8 px-3 rounded-lg font-black text-[11px] uppercase bg-white border flex items-center gap-1.5" style={{ borderColor: accentColor, color: accentColor }}>
            <Plus className="w-3.5 h-3.5" /> Add {label.toLowerCase()}
          </button>
        )
      )}
    </div>
  );
}