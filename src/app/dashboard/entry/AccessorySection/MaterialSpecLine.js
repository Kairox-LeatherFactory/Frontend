import { useState } from 'react';
import { usePatchStyleMaterialSpecLineMutation, useDeleteStyleMaterialSpecLineMutation } from '@/store/slices/apiSlice';
import { Loader2, Save, Trash2 } from 'lucide-react';
import { apiPatchStyleMaterialSpecLine, apiDeleteStyleMaterialSpecLine } from '@/lib/api';
export default function MaterialSpecLine({ line, styleId, token, showToast, canEdit, onChanged, pieceCount }) {
    const [editing, setEditing] = useState(false);
    const [article, setArticle] = useState(line.article || '');
    const [colour, setColour] = useState(line.colour || '');
    const [size, setSize] = useState(line.size || '');
    const [thickness, setThickness] = useState(line.thickness || '');
    const [qty, setQty] = useState(line.qty_per_piece ?? '');
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);


    const usesThickness = line.category === 'LEATHER' || line.category === 'LINING';
    const noun = line.category === 'LEATHER' ? 'Leather' : line.category === 'LINING' ? 'Lining' : 'Accessory';

    const handleSave = async () => {
        setSaving(true);
        try {
            await patchStyleMaterialSpecLine({
                styleId: styleId, lineId: line.line_id, patch: {
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

    return (
        <div className={`flex flex-wrap items-center gap-2 p-2.5 rounded-lg border text-xs ${unresolved ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
            {line.subtype && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white border border-slate-200 text-slate-500 shrink-0">{line.subtype}</span>}
            {isOverride && <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0">SKU override</span>}
            {editing ? (
                <input value={article} onChange={(e) => setArticle(e.target.value)} className="w-24 h-7 px-1.5 border rounded font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} placeholder="Article" />
            ) : (
                <span className="font-mono font-bold text-slate-700">{line.article}</span>
            )}
            {editing ? (
                <input value={colour} onChange={(e) => setColour(e.target.value)} className="w-20 h-7 px-1.5 border rounded font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} placeholder="Colour" />
            ) : (
                <span className="text-slate-500">{line.colour || '—'}</span>
            )}
            {usesThickness && (
                editing ? (
                    <input value={thickness} onChange={(e) => setThickness(e.target.value)} className="w-16 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} placeholder="Thickness" />
                ) : (
                    <span className="text-slate-500 w-16 text-center">{line.thickness || '—'}</span>
                )
            )}
            {!usesThickness && (
                editing ? (
                    <input value={size} onChange={(e) => setSize(e.target.value)} className="w-16 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} placeholder="Size" />
                ) : (
                    <span className="text-slate-500 w-14 text-center">{line.size || '—'}</span>
                )
            )}
            {editing ? (
                <input type="number" value={qty} onChange={(e) => setQty(e.target.value)} className="w-16 h-7 px-1.5 border rounded text-center font-bold" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
            ) : (
                <span className="font-black" style={{ color: '#c8834a' }}>{line.qty_per_piece} {line.uom || 'pcs'} / piece</span>
            )}
            {!editing && Number(pieceCount) > 0 && (
                <span className="text-[10px] font-black text-violet-700 bg-violet-50 border border-violet-200 px-1.5 py-0.5 rounded" title={`${line.qty_per_piece} ${line.uom || 'pcs'}/piece × ${pieceCount} pieces ordered`}>
                    = {(Number(line.qty_per_piece) || 0) * Number(pieceCount)} {line.uom || 'pcs'} total for this style
                </span>
            )}
            {lot && <span className="text-[10px] font-bold text-slate-400">on hand {lot.on_hand ?? '—'} · avail {lot.available ?? '—'}</span>}
            {unresolved && <span className="text-[10px] font-black text-rose-600">⚠ no stock lot resolves this line</span>}
            {canEdit && (
                <div className="flex items-center gap-1.5 ml-auto shrink-0">
                    {editing ? (
                        <button onClick={handleSave} disabled={saving} className="p-1.5 rounded-lg bg-emerald-500 text-white disabled:opacity-50">
                            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                        </button>
                    ) : (
                        <button onClick={() => setEditing(true)} className="p-1.5 rounded-lg bg-white border" style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#c8834a' }}>Edit</button>
                    )}
                    <button onClick={handleDelete} disabled={deleting} className="p-1.5 rounded-lg bg-red-50 text-red-500 disabled:opacity-50">
                        {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                </div>
            )}
        </div>
    );
}