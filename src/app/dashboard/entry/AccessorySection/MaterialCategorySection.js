import { useState, useEffect } from 'react';
import { Loader2, Plus, Save, Palette, X } from 'lucide-react';
import {
  useLazyGetMaterialLotsQuery,
  useAddStyleMaterialSpecLineMutation,
  usePatchStyleMaterialSpecLineMutation
} from '@/store/slices/apiSlice';

import MaterialSpecLine from './MaterialSpecLine';
import ScreenSafeSelect from './ScreenSafeSelect';

export default function MaterialCategorySection({
  category, label, accentColor, lines, styleId, token, showToast, canEdit, onChanged, pieceCount,
  subtypes, showThickness, defaultForm, minimalFields,
  allowColour = true, // Accessories have no "+ Add Colour" shortcut
}) {
  const [showForm, setShowForm] = useState(false);
  const [showColourForm, setShowColourForm] = useState(false);
  const [colourInput, setColourInput] = useState('');
  const [savingColour, setSavingColour] = useState(false);

  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [lots, setLots] = useState([]);
  const [lotsLoading, setLotsLoading] = useState(false);
  const [selectedLotId, setSelectedLotId] = useState('__custom__');

  const [triggerGetMaterialLots] = useLazyGetMaterialLotsQuery();
  const [addStyleMaterialSpecLine] = useAddStyleMaterialSpecLineMutation();
  const [patchStyleMaterialSpecLine] = usePatchStyleMaterialSpecLineMutation();

  const resetForm = () => { setForm(defaultForm); setSelectedLotId('__custom__'); };

  const activeSubtype = subtypes ? form.subtype : undefined;

  useEffect(() => {
    if (!showForm || !token || minimalFields) return;
    setLotsLoading(true);
    triggerGetMaterialLots({ category, subtype: activeSubtype }).unwrap()
      .then((res) => setLots(res?.lots || []))
      .catch(() => setLots([]))
      .finally(() => setLotsLoading(false));
  }, [showForm, category, activeSubtype, minimalFields, token, triggerGetMaterialLots]);

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
      await addStyleMaterialSpecLine({
        styleId: styleId,
        line: {
          sku_id: minimalFields ? undefined : (form.sku_id.trim() || null),
          category,
          subtype: subtypes ? form.subtype : undefined,
          article: minimalFields ? category : form.article.trim(),
          colour: form.colour ? form.colour.trim() : undefined,
          thickness: showThickness ? (form.thickness.trim() || undefined) : undefined,
          size: !showThickness ? (form.size.trim() || undefined) : undefined,
          qty_per_piece: Number(form.qty_per_piece),
          material_lot_id: minimalFields ? undefined : (form.material_lot_id.trim() || undefined),
        }
      }).unwrap();
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

  const handleSaveColour = async () => {
    const trimmedColour = colourInput.trim();
    if (!trimmedColour) {
      showToast('Please enter a valid colour', 'error');
      return;
    }
    setSavingColour(true);
    try {
      if (lines && lines.length > 0) {
        const lineToUpdate = lines[0];
        await patchStyleMaterialSpecLine({
          styleId,
          lineId: lineToUpdate.line_id,
          patch: { colour: trimmedColour }
        }).unwrap();
        showToast(`${label} line colour updated to ${trimmedColour}.`, 'success');
      } else {
        await addStyleMaterialSpecLine({
          styleId,
          line: {
            category,
            article: category === 'LEATHER' ? 'LEATHER' : category,
            colour: trimmedColour,
            thickness: showThickness ? '1' : undefined,
            qty_per_piece: 1,
          }
        }).unwrap();
        showToast(`${label} line created with colour ${trimmedColour}.`, 'success');
      }
      setShowColourForm(false);
      setColourInput('');
      await onChanged();
    } catch (e) {
      showToast(e.message || 'Failed to save colour.', 'error');
    } finally {
      setSavingColour(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-black uppercase tracking-wider text-[#8a4e1d]">{label}</span>
        <span className="text-[10px] font-bold text-slate-400">{lines.length} line(s)</span>
      </div>
      {lines.length === 0 ? (
        <p className="text-xs font-bold text-slate-400 italic py-1">No {label.toLowerCase()} line declared yet.</p>
      ) : (
        <div className="space-y-1.5">
          {lines.map((line) => (
            <MaterialSpecLine key={line.line_id} line={line} styleId={styleId} token={token} showToast={showToast} canEdit={canEdit} onChanged={onChanged} pieceCount={pieceCount} />
          ))}
        </div>
      )}
      {canEdit && (
        showForm ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8a4e1d]">
                New {label} Line
              </span>
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {!minimalFields && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {subtypes && (
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Subtype</label>
                    <ScreenSafeSelect
                      value={form.subtype}
                      onChange={(val) => setForm((f) => ({ ...f, subtype: val }))}
                      options={subtypes.map((s) => ({ value: s, label: s }))}
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                    />
                  </div>
                )}
                <div className={subtypes ? '' : 'sm:col-span-2'}>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                    Pick Stock Lot <span className="normal-case text-slate-400">(optional)</span>
                  </label>
                  <ScreenSafeSelect
                    value={selectedLotId}
                    onChange={handleLotPick}
                    placeholder="— Manual / Custom Article —"
                    emptyLabel={lotsLoading ? 'Loading stock lots…' : 'No stock lots found.'}
                    options={lots.map((l) => ({
                      value: l.lot_id,
                      label: `${l.article} · ${l.colour || '—'}${l.thickness ? ` · ${l.thickness}` : l.size ? ` · ${l.size}` : ''} — ${l.available ?? l.on_hand ?? 0} ${l.uom || ''} available`,
                    }))}
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {!minimalFields && (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Article *</label>
                    <input
                      value={form.article}
                      onChange={(e) => { setForm((f) => ({ ...f, article: e.target.value })); setSelectedLotId('__custom__'); }}
                      placeholder={category === 'LEATHER' ? 'Article (e.g. SUEDE-A32)' : 'Article'}
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Colour</label>
                    <input
                      value={form.colour}
                      onChange={(e) => setForm((f) => ({ ...f, colour: e.target.value.toUpperCase() }))}
                      placeholder="Colour"
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    />
                  </div>
                </>
              )}

              {showThickness ? (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Thickness *</label>
                  <input
                    value={form.thickness}
                    onChange={(e) => setForm((f) => ({ ...f, thickness: e.target.value }))}
                    placeholder="Thickness (e.g. 1.2mm)"
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">Size *</label>
                  <input
                    value={form.size}
                    onChange={(e) => setForm((f) => ({ ...f, size: e.target.value }))}
                    placeholder="Size"
                    className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                  />
                </div>
              )}

              <div>
                <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                  Qty / Piece {showThickness ? '(dcm)' : ''} *
                </label>
                <input
                  type="number"
                  step="any"
                  value={form.qty_per_piece}
                  onChange={(e) => setForm((f) => ({ ...f, qty_per_piece: e.target.value }))}
                  placeholder={showThickness ? 'Qty / piece (dcm)' : 'Qty / piece'}
                  className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                />
              </div>

              {!minimalFields && (
                <>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      SKU Override ID <span className="normal-case text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={form.sku_id}
                      onChange={(e) => setForm((f) => ({ ...f, sku_id: e.target.value }))}
                      placeholder="SKU override ID"
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                      Lot Barcode / ID <span className="normal-case text-slate-400">(optional)</span>
                    </label>
                    <input
                      value={form.material_lot_id}
                      onChange={(e) => setForm((f) => ({ ...f, material_lot_id: e.target.value }))}
                      placeholder="Lot barcode or ID"
                      className="w-full h-9 px-2.5 bg-white border border-slate-200 rounded-xl font-bold text-xs outline-none focus:border-[#c8834a]"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
              <button
                type="button"
                onClick={() => { setShowForm(false); resetForm(); }}
                className="h-8 px-3 rounded-xl font-black text-[11px] uppercase bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                disabled={adding}
                className="h-8 px-5 rounded-xl font-black text-[11px] uppercase text-white shadow-xs hover:brightness-105 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                style={{ background: '#c8834a' }}
              >
                {adding && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Add
              </button>
            </div>
          </div>
        ) : showColourForm ? (
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 animate-fade-in text-xs">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
              <span className="text-[11px] font-black uppercase tracking-wider text-[#8a4e1d] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#c8834a]" /> Set {label} Colour
              </span>
              <button
                type="button"
                onClick={() => { setShowColourForm(false); setColourInput(''); }}
                className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <input
                type="text"
                value={colourInput}
                onChange={(e) => setColourInput(e.target.value.toUpperCase())}
                placeholder="Enter Colour (e.g. BLACK, BEIGE, TAUPE)"
                className="h-9 px-3 bg-white border border-slate-200 rounded-xl font-bold text-xs text-slate-800 flex-1 outline-none focus:border-[#c8834a]"
                autoFocus
              />
              <div className="flex items-center gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => { setShowColourForm(false); setColourInput(''); }}
                  className="h-9 px-3 rounded-xl font-black text-[11px] uppercase bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveColour}
                  disabled={savingColour}
                  className="h-9 px-4 rounded-xl font-black text-[11px] uppercase text-white shadow-xs hover:brightness-105 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  style={{ background: '#c8834a' }}
                >
                  {savingColour ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  Save Colour
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 pt-0.5">
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="h-7 px-3 rounded-xl font-bold text-[11px] uppercase bg-white border border-[#c8834a]/30 text-[#8a4e1d] hover:bg-[#faf6f0] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#c8834a]" /> Add {label.toLowerCase()}
            </button>
            {allowColour && (
              <button
                type="button"
                onClick={() => {
                  const currentColour = (lines && lines[0]?.colour) || '';
                  setColourInput(currentColour);
                  setShowColourForm(true);
                }}
                className="h-7 px-3 rounded-xl font-bold text-[11px] uppercase bg-white border border-[#c8834a]/30 text-[#8a4e1d] hover:bg-[#faf6f0] shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5 text-[#c8834a]" /> Add Colour
              </button>
            )}
          </div>
        )
      )}
    </div>
  );
}