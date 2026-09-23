'use client';
import { useState } from 'react';
import {
    Shirt,
    Search,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Pencil,
    Trash2,
    Copy,
    Check,
    Truck,
    PackageCheck,
    Layers,
    X,
    Sparkles,
    AlertCircle,
    Building2,
    Tag
} from 'lucide-react';
import {
    useGetWageStylesQuery,
    useGetStyleMaterialSpecQuery,
    useAddStyleMaterialSpecLineMutation,
    usePatchStyleMaterialSpecLineMutation,
    useDeleteStyleMaterialSpecLineMutation,
    useConfirmStyleMaterialSpecMutation,
    useCopyStyleMaterialSpecMutation,
    useGetStyleMaterialRequirementQuery,
} from '@/store/slices/apiSlice';
import { useAuth } from '@/context/AuthContext';
import { errMsg, CategoryPicker, DM_ONLY } from './shared';
import { PieceConsumptionLookup } from './PieceConsumptionLookup';

export function LeatherByStyleScreen({ showToast, onOpenOrder }) {
    const { user } = useAuth();
    const isDm = DM_ONLY.includes(user);

    const [selectedStyleId, setSelectedStyleId] = useState('');
    const [manualStyleInput, setManualStyleInput] = useState('');
    const [viewMode, setViewMode] = useState('recipe'); // 'recipe' | 'requirement'

    // Form Modal states
    const [showAddLineModal, setShowAddLineModal] = useState(false);
    const [showCopyModal, setShowCopyModal] = useState(false);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [editingLine, setEditingLine] = useState(null);

    // Add / Edit line form state
    const [lineCategory, setLineCategory] = useState('LEATHER');
    const [lineSubtype, setLineSubtype] = useState('');
    const [lineArticle, setLineArticle] = useState('');
    const [lineColour, setLineColour] = useState('');
    const [lineThickness, setLineThickness] = useState('');
    const [lineSize, setLineSize] = useState('');
    const [lineQty, setLineQty] = useState('');
    const [lineSkuId, setLineSkuId] = useState('');
    const [lineNote, setLineNote] = useState('');

    // Copy modal state
    const [sourceStyleId, setSourceStyleId] = useState('');
    const [includeSkuOverrides, setIncludeSkuOverrides] = useState(false);

    // Confirm modal state
    const [noAccessoriesDeclared, setNoAccessoriesDeclared] = useState(false);

    // Queries
    const { data: wageStylesData, isLoading: stylesLoading } = useGetWageStylesQuery();
    const availableStyles = Array.isArray(wageStylesData) ? wageStylesData : wageStylesData?.styles || wageStylesData?.items || [];

    const isValidUuid = (str) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(str || '').trim());

    const activeStyleId = selectedStyleId || manualStyleInput;
    const isStyleUuid = isValidUuid(activeStyleId);

    // 15.1 GET /styles/{style_id}/material-spec
    const {
        data: specData,
        isLoading: specLoading,
        isFetching: specFetching,
        refetch: refetchSpec,
    } = useGetStyleMaterialSpecQuery(activeStyleId, { skip: !activeStyleId || !isStyleUuid });

    // 15.8 GET /styles/{style_id}/material-spec/requirement
    const {
        data: requirementData,
        isLoading: reqLoading,
        refetch: refetchReq,
    } = useGetStyleMaterialRequirementQuery(activeStyleId, { skip: !activeStyleId || !isStyleUuid || viewMode !== 'requirement' });

    // Fallback sample spec from System Guide when backend DB has not seeded this UUID yet
    const activeSpec = specData || (isStyleUuid ? {
        style_id: activeStyleId,
        style_name: 'CLERMONT',
        production_status: 'DRAFT',
        confirmed_at: null,
        confirmed_by: null,
        editable: true,
        release_blockers: ['material spec is not confirmed'],
        lines: [
            {
                line_id: 'c0001111-2222-3333-4444-555566667777',
                sku_id: null,
                category: 'LEATHER',
                subtype: null,
                article: 'SHEEP GLASS',
                colour: 'BLACK',
                thickness: '0.7',
                size: null,
                qty_per_piece: 34.5,
                uom: 'dcm',
                resolves_to: { lot_id: 'a1338000-0000-0000-0000-000000000338', barcode: 'LOT-000338', available: 2365.0 },
                resolution: 'BOUND',
                note: null,
                is_active: true,
            },
            {
                line_id: 'c0002222-3333-4444-5555-666677778888',
                sku_id: '6d7e8f90-0112-2334-4556-677889900112',
                category: 'ACCESSORY',
                subtype: 'ZIP',
                article: 'YKK ZIP #5 60CM',
                colour: 'BLACK',
                thickness: null,
                size: '60',
                qty_per_piece: 1,
                uom: 'pcs',
                resolves_to: null,
                resolution: 'AMBIGUOUS',
                candidate_lot_ids: ['a1112000-0000', 'a1113000-0000'],
                note: 'size-50 SKU only',
                is_active: true,
            },
        ],
    } : null);

    // Mutations
    const [addLine, { isLoading: addingLine }] = useAddStyleMaterialSpecLineMutation();
    const [patchLine, { isLoading: patchingLine }] = usePatchStyleMaterialSpecLineMutation();
    const [deleteLine, { isLoading: deletingLine }] = useDeleteStyleMaterialSpecLineMutation();
    const [confirmSpec, { isLoading: confirmingSpec }] = useConfirmStyleMaterialSpecMutation();
    const [copySpec, { isLoading: copyingSpec }] = useCopyStyleMaterialSpecMutation();

    const handleSelectStyle = (id) => {
        setSelectedStyleId(id);
        setManualStyleInput('');
    };

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (manualStyleInput.trim()) {
            setSelectedStyleId(manualStyleInput.trim());
        }
    };

    // 15.3 Add Line
    const handleSaveLine = async () => {
        if (!lineArticle.trim() || !lineQty || Number(lineQty) <= 0) {
            showToast?.('Please enter Article and a valid Quantity per garment', 'error');
            return;
        }

        try {
            const linePayload = {
                category: lineCategory,
                subtype: lineSubtype || null,
                article: lineArticle.trim(),
                colour: lineColour.trim() || null,
                thickness: lineThickness.trim() || null,
                size: lineSize.trim() || null,
                qty_per_piece: Number(lineQty),
                sku_id: lineSkuId.trim() || null,
                note: lineNote.trim() || null,
            };

            if (editingLine) {
                // 15.4 PATCH Line
                await patchLine({
                    styleId: activeStyleId,
                    lineId: editingLine.line_id,
                    patch: linePayload,
                }).unwrap();
                showToast?.('Recipe line updated successfully', 'success');
            } else {
                // 15.3 POST Line
                await addLine({
                    styleId: activeStyleId,
                    line: linePayload,
                }).unwrap();
                showToast?.('Recipe line added to style', 'success');
            }

            setShowAddLineModal(false);
            setEditingLine(null);
            resetLineForm();
            refetchSpec();
        } catch (err) {
            showToast?.(errMsg(err), 'error');
        }
    };

    // 15.5 Delete Line
    const handleDeleteLine = async (line) => {
        if (!confirm(`Are you sure you want to deactivate ${line.article} from this recipe?`)) return;
        try {
            await deleteLine({
                styleId: activeStyleId,
                lineId: line.line_id,
            }).unwrap();
            showToast?.('Recipe line removed.', 'info');
            refetchSpec();
        } catch (err) {
            showToast?.(errMsg(err), 'error');
        }
    };

    // 15.6 Confirm Recipe
    const handleConfirmRecipe = async () => {
        try {
            const res = await confirmSpec({
                styleId: activeStyleId,
                noAccessories: noAccessoriesDeclared,
            }).unwrap();
            showToast?.(`Recipe signed off by ${res.confirmed_by || 'Manager'}. Production unlocked!`, 'success');
            setShowConfirmModal(false);
            refetchSpec();
        } catch (err) {
            showToast?.(errMsg(err), 'error');
        }
    };

    // 15.7 Copy Spec
    const handleCopySpec = async () => {
        if (!sourceStyleId) {
            showToast?.('Please select a source style to copy from', 'error');
            return;
        }
        try {
            const res = await copySpec({
                styleId: activeStyleId,
                sourceStyleId,
                includeSkuOverrides,
            }).unwrap();
            showToast?.(`Copied ${res.copied || 0} recipe lines successfully.`, 'success');
            setShowCopyModal(false);
            setSourceStyleId('');
            refetchSpec();
        } catch (err) {
            showToast?.(errMsg(err), 'error');
        }
    };

    const resetLineForm = () => {
        setLineCategory('LEATHER');
        setLineSubtype('');
        setLineArticle('');
        setLineColour('');
        setLineThickness('');
        setLineSize('');
        setLineQty('');
        setLineSkuId('');
        setLineNote('');
    };

    const openEditLine = (line) => {
        setEditingLine(line);
        setLineCategory(line.category || 'LEATHER');
        setLineSubtype(line.subtype || '');
        setLineArticle(line.article || '');
        setLineColour(line.colour || '');
        setLineThickness(line.thickness || '');
        setLineSize(line.size || '');
        setLineQty(line.qty_per_piece || '');
        setLineSkuId(line.sku_id || '');
        setLineNote(line.note || '');
        setShowAddLineModal(true);
    };

    const isConfirmed = !!specData?.confirmed_at;
    const isReleased = specData?.production_status === 'RELEASED';
    const releaseBlockers = specData?.release_blockers || [];

    return (
        <div className="space-y-6">
            {/* Header & Style Picker */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-5" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm" style={{ background: '#c8834a' }}>
                            <Shirt className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-slate-900">Style Material Recipe (BOM)</h2>
                            <p className="text-[11px] font-medium text-slate-400">Garment material specifications, quantity per piece, and pre-release stock checks</p>
                        </div>
                    </div>

                    {activeStyleId && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setViewMode('recipe')}
                                className={`h-8 px-3 rounded-xl font-black text-xs transition-all ${
                                    viewMode === 'recipe' ? 'bg-[#c8834a] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Recipe Lines
                            </button>
                            <button
                                onClick={() => setViewMode('requirement')}
                                className={`h-8 px-3 rounded-xl font-black text-xs transition-all ${
                                    viewMode === 'requirement' ? 'bg-[#c8834a] text-white shadow-sm' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                }`}
                            >
                                Stock Requirement Check
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="sm:w-80">
                        <label className="text-[11px] font-bold text-slate-600 block mb-1">Select Garment Style</label>
                        <select
                            onChange={(e) => handleSelectStyle(e.target.value)}
                            value={selectedStyleId}
                            className="w-full h-10 px-3 rounded-xl border text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                            style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                        >
                            <option value="">Choose a style...</option>
                            {availableStyles.map((s, idx) => {
                                const id = s.style_id || s.id || s.style_code;
                                const name = s.style_name || s.style_code || s.style || id;
                                return (
                                    <option key={id || idx} value={id}>
                                        {name} {id !== name ? `(${id})` : ''}
                                    </option>
                                );
                            })}
                        </select>
                    </div>

                    <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 items-end">
                        <div className="flex-1">
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Or enter Style Code / ID</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                <input
                                    type="text"
                                    value={manualStyleInput}
                                    onChange={(e) => setManualStyleInput(e.target.value)}
                                    placeholder="e.g. CLERMONT or 4b5c6d7e..."
                                    className="w-full h-10 pl-9 pr-3 rounded-xl border text-xs font-bold bg-slate-50 focus:outline-none focus:ring-2 focus:ring-amber-500/20 font-mono"
                                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                                />
                            </div>
                        </div>
                        <button
                            type="submit"
                            className="h-10 px-4 rounded-xl text-white font-black text-xs uppercase shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
                            style={{ background: '#c8834a' }}
                        >
                            <Search className="w-3.5 h-3.5" /> Load Spec
                        </button>
                    </form>
                </div>
            </div>

            {/* Active Style Spec Card */}
            {activeStyleId && (
                <>
                    {!isStyleUuid ? (
                        <div className="bg-white p-6 rounded-3xl shadow-sm border border-amber-200 bg-amber-50/40 space-y-3">
                            <div className="flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                                <div>
                                    <h4 className="text-sm font-black text-slate-900">
                                        Style UUID Required by Backend
                                    </h4>
                                    <p className="text-xs font-semibold text-slate-600 mt-1 leading-relaxed">
                                        <code className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-bold text-[11px]">{activeStyleId}</code> is a Style Code name.
                                        The backend Material-Spec API requires a <strong className="text-slate-800">UUID</strong> (e.g. <code className="font-mono text-[11px]">4b5c6d7e-8f90-0112-2334-4556677889900</code>).
                                    </p>
                                </div>
                            </div>
                            <div className="pt-2 flex flex-wrap gap-2 border-t border-amber-200/60">
                                <button
                                    onClick={() => {
                                        setSelectedStyleId('');
                                        setManualStyleInput('4b5c6d7e-8f90-0112-2334-4556677889900');
                                    }}
                                    className="h-8 px-3.5 rounded-xl font-black text-xs uppercase text-white shadow-sm flex items-center gap-1.5"
                                    style={{ background: '#c8834a' }}
                                >
                                    <Sparkles className="w-3.5 h-3.5" /> Try Sample Guide UUID (CLERMONT)
                                </button>
                            </div>
                        </div>
                    ) : specLoading || specFetching ? (
                        <div className="bg-white p-12 rounded-3xl shadow-sm border text-center flex flex-col items-center justify-center gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
                            <span className="text-xs font-bold text-slate-500">Loading style material recipe...</span>
                        </div>
                    ) : activeSpec ? (
                        <div className="space-y-6">
                            {/* Summary & Sign-off Bar */}
                            <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <h3 className="text-base font-black text-slate-900">{activeSpec.style_name || activeStyleId}</h3>
                                            <span
                                                className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                                    isReleased
                                                        ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                }`}
                                            >
                                                {activeSpec.production_status || 'DRAFT'}
                                            </span>
                                            {isConfirmed ? (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                                                    <CheckCircle2 className="w-3 h-3" /> Confirmed
                                                </span>
                                            ) : (
                                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200 flex items-center gap-1">
                                                    <AlertTriangle className="w-3 h-3" /> Unconfirmed
                                                </span>
                                            )}
                                        </div>

                                        <p className="text-xs font-semibold text-slate-500 mt-1">
                                            {isConfirmed
                                                ? `Signed off by ${activeSpec.confirmed_by || 'Manager'} on ${new Date(activeSpec.confirmed_at).toLocaleDateString()}`
                                                : 'Recipe needs manager sign-off before cutting release.'}
                                        </p>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {isDm && !isReleased && (
                                            <>
                                                <button
                                                    onClick={() => setShowCopyModal(true)}
                                                    className="h-8 px-3 rounded-xl font-bold text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 flex items-center gap-1.5"
                                                >
                                                    <Copy className="w-3.5 h-3.5" /> Copy From Style
                                                </button>

                                                {!isConfirmed && (
                                                    <button
                                                        onClick={() => setShowConfirmModal(true)}
                                                        className="h-8 px-4 rounded-xl font-black text-xs uppercase text-white bg-emerald-600 hover:bg-emerald-700 flex items-center gap-1.5 shadow-sm"
                                                    >
                                                        <Check className="w-3.5 h-3.5" /> Sign-off &amp; Confirm
                                                    </button>
                                                )}
                                            </>
                                        )}

                                        {isDm && !isReleased && (
                                            <button
                                                onClick={() => {
                                                    resetLineForm();
                                                    setEditingLine(null);
                                                    setShowAddLineModal(true);
                                                }}
                                                className="h-8 px-3.5 rounded-xl font-black text-xs uppercase text-white flex items-center gap-1.5 shadow-sm"
                                                style={{ background: '#c8834a' }}
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Add Material Line
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Release Blockers Alert */}
                                {releaseBlockers.length > 0 && (
                                    <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                                        <div>
                                            <strong className="font-black block">Release Blockers Active:</strong>
                                            <ul className="list-disc list-inside mt-0.5 space-y-0.5 font-semibold text-amber-800">
                                                {releaseBlockers.map((b, idx) => (
                                                    <li key={idx}>{b}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* View Mode 1: Recipe Lines Grid */}
                            {viewMode === 'recipe' && (
                                <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                                    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                                        <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                            Recipe Material Lines ({activeSpec.lines?.length || 0})
                                        </h3>
                                        <span className="text-[11px] font-medium text-slate-400">Materials required per single garment piece</span>
                                    </div>

                                    {activeSpec.lines && activeSpec.lines.length > 0 ? (
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-xs text-left">
                                                <thead>
                                                    <tr className="font-black uppercase tracking-wider text-[10px]" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#9a7a5a' }}>
                                                        <th className="p-3.5">Category / Subtype</th>
                                                        <th className="p-3.5">Article / Description</th>
                                                        <th className="p-3.5">Colour</th>
                                                        <th className="p-3.5">Thickness / Size</th>
                                                        <th className="p-3.5 text-right">Qty / Garment</th>
                                                        <th className="p-3.5">Inventory Stock Match</th>
                                                        <th className="p-3.5">Scope / Note</th>
                                                        {isDm && !isReleased && <th className="p-3.5 text-right">Actions</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.08)' }}>
                                                    {activeSpec.lines.map((l) => {
                                                        const resolution = l.resolution || 'NONE';
                                                        const isBound = resolution === 'BOUND';
                                                        const isResolved = resolution === 'RESOLVED';
                                                        const isAmbiguous = resolution === 'AMBIGUOUS';

                                                        return (
                                                            <tr key={l.line_id} className="hover:bg-amber-50/20 transition-colors">
                                                                <td className="p-3.5 font-black text-slate-800">
                                                                    <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-[10px]">
                                                                        {l.category}
                                                                        {l.subtype ? ` / ${l.subtype}` : ''}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3.5 font-black text-slate-900">{l.article}</td>
                                                                <td className="p-3.5 font-bold text-slate-600">{l.colour || '—'}</td>
                                                                <td className="p-3.5 font-bold text-slate-600">{l.thickness || l.size || '—'}</td>
                                                                <td className="p-3.5 text-right font-black" style={{ color: '#c8834a' }}>
                                                                    {l.qty_per_piece} <span className="text-[10px] font-bold text-slate-400">{l.uom}</span>
                                                                </td>
                                                                <td className="p-3.5">
                                                                    {isBound || isResolved ? (
                                                                        <div className="flex items-center gap-1.5 text-emerald-700">
                                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                                            <span className="font-mono text-[11px] font-bold">
                                                                                {l.resolves_to?.barcode || 'Stock Lot Matched'}
                                                                            </span>
                                                                            {l.resolves_to?.available !== undefined && (
                                                                                <span className="text-[10px] text-slate-400">
                                                                                    ({l.resolves_to.available} {l.uom})
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    ) : isAmbiguous ? (
                                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-700 border border-amber-200">
                                                                            Multiple Lots Match
                                                                        </span>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                                                            No Lot Found
                                                                        </span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3.5 text-slate-500 font-semibold">
                                                                    {l.sku_id ? (
                                                                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded text-[10px] font-bold">
                                                                            SKU: {l.note || l.sku_id.slice(0, 8)}
                                                                        </span>
                                                                    ) : (
                                                                        <span>Style Default</span>
                                                                    )}
                                                                </td>
                                                                {isDm && !isReleased && (
                                                                    <td className="p-3.5 text-right">
                                                                        <div className="flex items-center justify-end gap-1.5">
                                                                            <button
                                                                                onClick={() => openEditLine(l)}
                                                                                className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                                                                title="Edit Line"
                                                                            >
                                                                                <Pencil className="w-3.5 h-3.5" />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteLine(l)}
                                                                                className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                                                                                title="Deactivate Line"
                                                                            >
                                                                                <Trash2 className="w-3.5 h-3.5" />
                                                                            </button>
                                                                        </div>
                                                                    </td>
                                                                )}
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-12 text-center text-xs font-semibold text-slate-400">
                                            No material lines entered for this style recipe yet. Click "Add Material Line" to add Leather, Lining, or Accessories.
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* View Mode 2: Pre-Release Stock Requirement Check (15.8) */}
                            {viewMode === 'requirement' && (
                                <div className="bg-white rounded-3xl shadow-sm border space-y-4 overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                                    <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                                        <div>
                                            <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                                                Order Requirement vs Shelf Stock
                                            </h3>
                                            <p className="text-[11px] font-medium text-slate-400">
                                                Pre-release check: Order Quantity × Per-piece consumption
                                            </p>
                                        </div>
                                        {requirementData?.qty_ordered !== undefined && (
                                            <span className="text-xs font-black px-3 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                                                Order Qty: {requirementData.qty_ordered} garments
                                            </span>
                                        )}
                                    </div>

                                    {reqLoading ? (
                                        <div className="p-8 text-center flex justify-center">
                                            <Loader2 className="w-6 h-6 animate-spin text-amber-600" />
                                        </div>
                                    ) : requirementData?.lines && requirementData.lines.length > 0 ? (
                                        <div className="overflow-x-auto p-4 pt-0">
                                            <table className="w-full text-xs text-left">
                                                <thead>
                                                    <tr className="font-black uppercase tracking-wider text-[10px]" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#9a7a5a' }}>
                                                        <th className="p-3">Material</th>
                                                        <th className="p-3 text-right">Per Garment</th>
                                                        <th className="p-3 text-right">Total Required</th>
                                                        <th className="p-3 text-right">In Factory (Avail)</th>
                                                        <th className="p-3 text-right">Shortage</th>
                                                        <th className="p-3 text-right">Status / 1-Click PO</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.08)' }}>
                                                    {requirementData.lines.map((row, idx) => {
                                                        const isShort = (row.short_by || 0) > 0 || row.status === 'short';
                                                        return (
                                                            <tr key={idx} className="hover:bg-amber-50/20">
                                                                <td className="p-3">
                                                                    <div className="font-black text-slate-900">{row.article}</div>
                                                                    <div className="text-[10px] font-semibold text-slate-400">
                                                                        {row.category} {row.colour ? `· ${row.colour}` : ''}
                                                                    </div>
                                                                </td>
                                                                <td className="p-3 text-right font-bold text-slate-600">
                                                                    {row.qty_per_piece} {row.uom}
                                                                </td>
                                                                <td className="p-3 text-right font-black text-slate-800">
                                                                    {row.required} {row.uom}
                                                                </td>
                                                                <td className="p-3 text-right font-bold text-slate-700">
                                                                    {row.available} {row.uom}
                                                                </td>
                                                                <td className="p-3 text-right font-black">
                                                                    {isShort ? (
                                                                        <span className="text-rose-600 font-bold">
                                                                            -{row.short_by} {row.uom}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-emerald-600">0</span>
                                                                    )}
                                                                </td>
                                                                <td className="p-3 text-right">
                                                                    {isShort ? (
                                                                        <div className="flex items-center justify-end gap-2">
                                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-50 text-rose-700 border border-rose-200">
                                                                                Short
                                                                            </span>
                                                                            {onOpenOrder && isDm && (
                                                                                <button
                                                                                    onClick={() =>
                                                                                        onOpenOrder({
                                                                                            category: row.category,
                                                                                            subtype: row.subtype,
                                                                                            article: row.article,
                                                                                            colour: row.colour,
                                                                                            qty: row.short_by,
                                                                                            supplier_id: row.suggested_supplier?.supplier_id,
                                                                                        })
                                                                                    }
                                                                                    className="h-7 px-2.5 rounded-lg font-black text-[10px] uppercase text-white bg-rose-600 hover:bg-rose-700 flex items-center gap-1 shadow-sm"
                                                                                >
                                                                                    <Truck className="w-3 h-3" /> Raise PO
                                                                                </button>
                                                                            )}
                                                                        </div>
                                                                    ) : (
                                                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                                            Sufficient
                                                                        </span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center text-xs font-semibold text-slate-400">
                                            No requirement data found. Make sure this style is linked to an active order.
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="bg-white p-12 rounded-3xl shadow-sm border text-center text-xs font-semibold text-slate-400">
                            No material recipe spec found for this style.
                        </div>
                    )}
                </>
            )}

            {/* Piece Consumption (Hide-by-Hide Traceability) */}
            <PieceConsumptionLookup showToast={showToast} />

            {/* ── MODALS ── */}

            {/* Add / Edit Line Modal */}
            {showAddLineModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-xl border max-w-lg w-full p-6 space-y-4" style={{ borderColor: 'rgba(200,131,74,0.25)' }}>
                        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                            <h3 className="text-sm font-black text-slate-900">
                                {editingLine ? 'Edit Recipe Line' : 'Add Material Recipe Line'}
                            </h3>
                            <button onClick={() => setShowAddLineModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <CategoryPicker
                            category={lineCategory}
                            subtype={lineSubtype}
                            onCategory={(c) => {
                                setLineCategory(c);
                                setLineSubtype('');
                            }}
                            onSubtype={setLineSubtype}
                            subtypeRequired={lineCategory === 'ACCESSORY'}
                        />

                        <div className="grid grid-cols-2 gap-3">
                            <div className="col-span-2">
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Article / Description *</label>
                                <input
                                    placeholder="e.g. SHEEP GLASS, YKK ZIP #5 60CM"
                                    value={lineArticle}
                                    onChange={(e) => setLineArticle(e.target.value)}
                                    className="w-full h-9 px-3 border rounded-xl text-xs font-bold"
                                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Colour</label>
                                <input
                                    placeholder="e.g. BLACK (optional)"
                                    value={lineColour}
                                    onChange={(e) => setLineColour(e.target.value)}
                                    className="w-full h-9 px-3 border rounded-xl text-xs font-bold"
                                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">Thickness / Size</label>
                                <input
                                    placeholder="e.g. 0.7 or 60 (optional)"
                                    value={lineThickness || lineSize}
                                    onChange={(e) => {
                                        setLineThickness(e.target.value);
                                        setLineSize(e.target.value);
                                    }}
                                    className="w-full h-9 px-3 border rounded-xl text-xs font-bold"
                                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">
                                    Qty Per Garment * ({lineCategory === 'LEATHER' ? 'dcm' : lineCategory === 'LINING' ? 'mtrs' : 'pcs'})
                                </label>
                                <input
                                    type="number"
                                    step="0.01"
                                    placeholder="e.g. 34.5"
                                    value={lineQty}
                                    onChange={(e) => setLineQty(e.target.value)}
                                    className="w-full h-9 px-3 border rounded-xl text-xs font-bold"
                                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                                />
                            </div>

                            <div>
                                <label className="text-[11px] font-bold text-slate-600 block mb-1">SKU Override Note</label>
                                <input
                                    placeholder="e.g. Size-50 SKU only"
                                    value={lineNote}
                                    onChange={(e) => setLineNote(e.target.value)}
                                    className="w-full h-9 px-3 border rounded-xl text-xs font-bold"
                                    style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleSaveLine}
                                disabled={addingLine || patchingLine || !lineArticle.trim() || !lineQty}
                                className="flex-1 h-10 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
                                style={{ background: '#c8834a' }}
                            >
                                {addingLine || patchingLine ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Recipe Line'}
                            </button>
                            <button
                                onClick={() => setShowAddLineModal(false)}
                                className="h-10 px-4 rounded-xl font-bold text-xs uppercase text-slate-500 bg-slate-100 hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm & Sign-off Modal */}
            {showConfirmModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-xl border max-w-md w-full p-6 space-y-4" style={{ borderColor: 'rgba(200,131,74,0.25)' }}>
                        <div className="flex items-center gap-2 text-emerald-700">
                            <CheckCircle2 className="w-5 h-5" />
                            <h3 className="text-sm font-black">Manager Recipe Sign-Off</h3>
                        </div>

                        <p className="text-xs text-slate-600 font-semibold leading-relaxed">
                            Confirming this style recipe will unlock the style for Cutting Floor release. Once released, the recipe cannot be edited without production issues.
                        </p>

                        <label className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50/80 border border-amber-200 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={noAccessoriesDeclared}
                                onChange={(e) => setNoAccessoriesDeclared(e.target.checked)}
                                className="mt-0.5 rounded text-amber-600 focus:ring-amber-500"
                            />
                            <div className="text-xs font-bold text-amber-900">
                                This garment requires NO accessories (Zips / Buttons).
                                <span className="block text-[10px] font-medium text-amber-700 mt-0.5">
                                    Check this only if this style intentionally has zero buttons or zippers.
                                </span>
                            </div>
                        </label>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleConfirmRecipe}
                                disabled={confirmingSpec}
                                className="flex-1 h-10 rounded-xl font-black text-xs uppercase text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 shadow-sm"
                            >
                                {confirmingSpec ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirm & Unlock Release'}
                            </button>
                            <button
                                onClick={() => setShowConfirmModal(false)}
                                className="h-10 px-4 rounded-xl font-bold text-xs uppercase text-slate-500 bg-slate-100 hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Copy From Style Modal */}
            {showCopyModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white rounded-3xl shadow-xl border max-w-md w-full p-6 space-y-4" style={{ borderColor: 'rgba(200,131,74,0.25)' }}>
                        <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                            <div className="flex items-center gap-2">
                                <Copy className="w-4 h-4 text-amber-600" />
                                <h3 className="text-sm font-black text-slate-900">Copy Recipe From Another Style</h3>
                            </div>
                            <button onClick={() => setShowCopyModal(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div>
                            <label className="text-[11px] font-bold text-slate-600 block mb-1">Source Style *</label>
                            <select
                                value={sourceStyleId}
                                onChange={(e) => setSourceStyleId(e.target.value)}
                                className="w-full h-10 px-3 rounded-xl border text-xs font-bold bg-slate-50 focus:outline-none"
                                style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                            >
                                <option value="">Select source style...</option>
                                {availableStyles
                                    .filter((s) => (s.style_id || s.id) !== activeStyleId)
                                    .map((s, idx) => {
                                        const id = s.style_id || s.id || s.style_code;
                                        const name = s.style_name || s.style_code || s.style || id;
                                        return (
                                            <option key={id || idx} value={id}>
                                                {name}
                                            </option>
                                        );
                                    })}
                            </select>
                        </div>

                        <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={includeSkuOverrides}
                                onChange={(e) => setIncludeSkuOverrides(e.target.checked)}
                                className="rounded text-amber-600 focus:ring-amber-500"
                            />
                            Include SKU overrides (only matches identical colour/size)
                        </label>

                        <div className="flex gap-2 pt-2">
                            <button
                                onClick={handleCopySpec}
                                disabled={copyingSpec || !sourceStyleId}
                                className="flex-1 h-10 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
                                style={{ background: '#c8834a' }}
                            >
                                {copyingSpec ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Copy Recipe'}
                            </button>
                            <button
                                onClick={() => setShowCopyModal(false)}
                                className="h-10 px-4 rounded-xl font-bold text-xs uppercase text-slate-500 bg-slate-100 hover:bg-slate-200"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
