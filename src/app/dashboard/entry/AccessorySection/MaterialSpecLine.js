import { useState } from 'react';
import { usePatchStyleMaterialSpecLineMutation, useDeleteStyleMaterialSpecLineMutation } from '@/store/slices/apiSlice';
import { Loader2, Save, Trash2, X } from 'lucide-react';

export default function MaterialSpecLine({ line, styleId, token, showToast, canEdit, onChanged, pieceCount }) {
    const [editing, setEditing] = useState(false);
    const [article, setArticle] = useState(line.article || '');
    const [colour, setColour] = useState(line.colour || '');
    const [size, setSize] = useState(line.size || '');
    const [thickness, setThickness] = useState(line.thickness || '');
    const [qty, setQty] = useState(line.qty_per_piece ?? '');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [patchStyleMaterialSpecLine] = usePatchStyleMaterialSpecLineMutation();
    const [deleteStyleMaterialSpecLine] = useDeleteStyleMaterialSpecLineMutation();

    const usesThickness = line.category === 'LEATHER' || line.category === 'LINING';
    const noun = line.category === 'LEATHER' ? 'Leather' : line.category === 'LINING' ? 'Lining' : 'Accessory';

    const handleSave = async () => {
        setSaving(true);
        try {
            await patchStyleMaterialSpecLine({
                styleId: styleId,
                lineId: line.line_id,
                patch: {
                    article: article.trim() || undefined,
                    colour: colour.trim() || undefined,
                    size: size.trim() || undefined,
                    thickness: usesThickness ? (thickness.trim() || undefined) : undefined,
                    qty_per_piece: qty === '' ? undefined : Number(qty),
                }
            }).unwrap();
            showToast(`${noun} line updated.`, 'success');
            setEditing(false);
            onChanged();
        } catch (e) {
            showToast(e.message || 'Update failed.', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        setDeleting(true);
        try {
            await deleteStyleMaterialSpecLine({ styleId: styleId, lineId: line.line_id }).unwrap();
            showToast(`${noun} line removed.`, 'success');
            onChanged();
        } catch (e) {
            showToast(e.message || 'Delete failed.', 'error');
        } finally {
            setDeleting(false);
        }
    };

    const lot = line.lot;
    const isOverride = line.scope === 'SKU';
    const unresolved = line.resolution === 'NONE' || line.resolution === 'AMBIGUOUS';

    if (editing) {
        return (
            <div className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 space-y-2.5 animate-fade-in text-xs">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#8a4e1d]">
                        Edit {noun} Line
                    </span>
                    <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
                    >
                        <X className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Article</label>
                        <input
                            value={article}
                            onChange={(e) => setArticle(e.target.value)}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-[#c8834a]"
                            placeholder="Article"
                        />
                    </div>
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Colour</label>
                        <input
                            value={colour}
                            onChange={(e) => setColour(e.target.value.toUpperCase())}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-[#c8834a]"
                            placeholder="Colour"
                        />
                    </div>
                    {usesThickness ? (
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Thickness</label>
                            <input
                                value={thickness}
                                onChange={(e) => setThickness(e.target.value)}
                                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-[#c8834a]"
                                placeholder="Thickness"
                            />
                        </div>
                    ) : (
                        <div>
                            <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Size</label>
                            <input
                                value={size}
                                onChange={(e) => setSize(e.target.value)}
                                className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-[#c8834a]"
                                placeholder="Size"
                            />
                        </div>
                    )}
                    <div>
                        <label className="text-[9px] font-black uppercase text-slate-500 block mb-0.5">Qty / Piece</label>
                        <input
                            type="number"
                            step="any"
                            value={qty}
                            onChange={(e) => setQty(e.target.value)}
                            className="w-full h-8 px-2.5 bg-white border border-slate-200 rounded-lg font-bold text-xs outline-none focus:border-[#c8834a]"
                            placeholder="Qty"
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-2 pt-1 border-t border-slate-200">
                    <button
                        type="button"
                        onClick={() => setEditing(false)}
                        className="h-7 px-3 rounded-lg font-bold text-[11px] uppercase bg-white border border-slate-300 text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="h-7 px-4 rounded-lg font-bold text-[11px] uppercase text-white bg-[#c8834a] hover:brightness-105 transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5 shadow-2xs"
                    >
                        {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        Save
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-2.5 sm:p-3 rounded-xl border border-slate-200 bg-slate-50/80 hover:bg-slate-50 transition-all flex flex-wrap sm:flex-nowrap items-center justify-between gap-2.5 text-xs">
            {/* Left / Info */}
            <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center gap-1.5 flex-wrap">
                    {line.subtype ? (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-[#8a4e1d] border border-amber-200/60">
                            {line.subtype}
                        </span>
                    ) : (
                        <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-100 text-[#8a4e1d] border border-amber-200/60">
                            {line.category || noun}
                        </span>
                    )}

                    {isOverride && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-200/80 text-slate-700">
                            SKU Override
                        </span>
                    )}

                    <span className="font-bold text-slate-800 truncate">{line.article}</span>

                    {line.colour && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            {line.colour}
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 font-semibold">
                    {usesThickness && line.thickness && (
                        <span>Thickness: <strong className="text-slate-700">{line.thickness}</strong></span>
                    )}
                    {!usesThickness && line.size && (
                        <span>Size: <strong className="text-slate-700">{line.size}</strong></span>
                    )}
                    <span>
                        Consumption: <strong className="text-[#c8834a] font-black">{line.qty_per_piece} {line.uom || 'pcs'} / piece</strong>
                    </span>

                    {Number(pieceCount) > 0 && (
                        <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded bg-white border border-[#c8834a]/25 text-[#8a4e1d]"
                            title={`${line.qty_per_piece} ${line.uom || 'pcs'}/piece × ${pieceCount} pieces ordered`}
                        >
                            = {(Number(line.qty_per_piece) || 0) * Number(pieceCount)} {line.uom || 'pcs'} total for this style
                        </span>
                    )}

                    {lot && (
                        <span className="text-[10px] text-slate-400">
                            (on hand: {lot.on_hand ?? '—'} · avail: {lot.available ?? '—'})
                        </span>
                    )}

                    {unresolved && (
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                            ⚠️ No stock lot resolves this line
                        </span>
                    )}
                </div>
            </div>

            {/* Right / Actions */}
            {canEdit && (
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                    <button
                        type="button"
                        onClick={() => setEditing(true)}
                        className="h-7 px-2.5 rounded-lg bg-white border border-[#c8834a]/30 text-[#c8834a] font-bold text-[11px] hover:bg-[#faf6f0] transition-colors cursor-pointer shadow-2xs"
                    >
                        Edit
                    </button>
                    <button
                        type="button"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-40 cursor-pointer"
                        title="Delete this line"
                    >
                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            )}
        </div>
    );
}