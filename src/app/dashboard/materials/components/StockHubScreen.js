'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, CheckCircle2, AlertTriangle, ChevronRight, Truck, Shirt, ChevronDown, PackageCheck, AlertCircle } from 'lucide-react';
import {
    useGetMaterialSpecQuery,
    useGetMaterialLotsQuery,
    useLazyGetMaterialLotsQuery,
    useLazyGetMaterialLotQuery,
    useLazyGetMaterialsStockQuery,
    useGetLeatherByStyleQuery,
} from '@/store/slices/materialApiSlice';
import { useGetClientStylesQuery } from '@/store/slices/apiSlice';
import { errMsg, Tile, SelectableFilterCombobox, CategoryPicker } from './shared';
import { LotDetail } from './LotDetailModal';

export function StockHubScreen({ showToast, canOrder, onOpenOrder, canEdit, canAdjust, onReceive }) {
    const [triggerGetLots] = useLazyGetMaterialLotsQuery();
    const [triggerGetLot] = useLazyGetMaterialLotQuery();
    const [triggerGetStock] = useLazyGetMaterialsStockQuery();

    const [category, setCategory] = useState('LEATHER');
    const [subtype, setSubtype] = useState('');
    const [filters, setFilters] = useState({ article: '', colour: '', thickness: '', size: '' });
    const [stock, setStock] = useState(null);
    const [required, setRequired] = useState('');
    const [loading, setLoading] = useState(false);
    const [lots, setLots] = useState([]);
    const [detailLot, setDetailLot] = useState(null);
    const [styleOpen, setStyleOpen] = useState(false);

    // Leather by style: pick a style (GET /clients/styles), then GET /materials/leather-by-style?style_id=
    const [styleId, setStyleId] = useState('');
    const { data: stylesRes, isLoading: stylesLoading } = useGetClientStylesQuery({ limit: 200 }, { skip: !styleOpen });
    const styleOptions = Array.isArray(stylesRes) ? stylesRes : stylesRes?.items || [];
    const { data: styleRes, isFetching: styleLoading } = useGetLeatherByStyleQuery(
        { style_id: styleId },
        { skip: !styleOpen || !styleId }
    );
    const styleData = Array.isArray(styleRes) ? styleRes : styleRes?.items || [];
    const fmtQty = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
    const { data: spec } = useGetMaterialSpecQuery({ category, subtype }, { skip: !category });
    const { data: lotsRes } = useGetMaterialLotsQuery({ category, subtype: subtype || undefined }, { skip: !category });
    const availableLots = lotsRes?.lots || [];

    const openDetail = async (lotId) => {
        try {
            const full = await triggerGetLot(lotId).unwrap();
            setDetailLot(full);
        } catch (e) {
            showToast(errMsg(e), 'error');
        }
    };

    const getFilterOptions = (field) => {
        if (!availableLots.length) return [];
        if (field === 'article') {
            const map = new Map();
            availableLots.forEach((l) => {
                if (!l.article) return;
                if (!map.has(l.article)) {
                    map.set(l.article, { count: 0, avail: 0, uom: l.uom || '' });
                }
                const item = map.get(l.article);
                item.count += 1;
                item.avail += (Number(l.available) || 0);
            });
            return Array.from(map.entries()).map(([art, info]) => ({
                value: art,
                label: art,
                sub: `${info.count} lot(s) · ${info.avail.toFixed(1)} ${info.uom} available`,
            }));
        }
        if (field === 'colour') {
            const filtered = filters.article
                ? availableLots.filter((l) => l.article?.toLowerCase() === filters.article.toLowerCase())
                : availableLots;
            const set = new Set(filtered.map((l) => l.colour).filter(Boolean));
            return Array.from(set).sort().map((c) => ({ value: c, label: c }));
        }
        if (field === 'thickness') {
            const set = new Set(availableLots.map((l) => l.thickness).filter(Boolean));
            return Array.from(set).sort().map((t) => ({ value: t, label: t }));
        }
        if (field === 'size') {
            const set = new Set(availableLots.map((l) => l.size).filter(Boolean));
            return Array.from(set).sort().map((s) => ({ value: s, label: s }));
        }
        return [];
    };

    const runCheck = useCallback(async () => {
        if (!category) return;
        setLoading(true);
        try {
            const params = { category, subtype: subtype || undefined, ...filters };
            if (required !== '') params.required = required;
            Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
            const [stockRes, lotsRes] = await Promise.all([
                triggerGetStock(params).unwrap(),
                triggerGetLots(params).unwrap(),
            ]);
            setStock(stockRes);
            setLots(lotsRes.lots || []);
        } catch (e) {
            showToast(errMsg(e), 'error');
        } finally {
            setLoading(false);
        }
    }, [category, subtype, filters, required, showToast, triggerGetLots, triggerGetStock]);

    useEffect(() => {
        runCheck();
    }, [category, subtype]); // eslint-disable-line react-hooks/exhaustive-deps

    const shortBy = stock?.short_by ?? 0;

    return (
        <div className="space-y-6">
            {/* Filter & Category Card */}
            <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                    <div>
                        <h2 className="text-sm font-black text-slate-800">Stock Availability &amp; Shortage Check</h2>
                        <p className="text-[11px] font-medium text-slate-400">Select material category and filter to check stock balance</p>
                    </div>
                </div>

                <CategoryPicker
                    category={category}
                    subtype={subtype}
                    onCategory={(c) => {
                        setCategory(c);
                        setSubtype('');
                        setFilters({ article: '', colour: '', thickness: '', size: '' });
                    }}
                    onSubtype={(s) => {
                        setSubtype(s);
                        setFilters({ article: '', colour: '', thickness: '', size: '' });
                    }}
                    subtypeRequired={category === 'ACCESSORY'}
                />

                {spec && spec.filters && spec.filters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2.5 pt-2">
                        {spec.filters.map((f) => (
                            <SelectableFilterCombobox
                                key={f}
                                placeholder={`Filter ${f[0].toUpperCase() + f.slice(1)}…`}
                                value={filters[f] || ''}
                                onChange={(val) => setFilters((p) => ({ ...p, [f]: val }))}
                                options={getFilterOptions(f)}
                            />
                        ))}
                        <button
                            onClick={runCheck}
                            className="h-9 px-4 rounded-xl font-black text-xs uppercase text-white flex items-center gap-1.5 shrink-0 shadow-sm transition-all active:scale-95"
                            style={{ background: '#c8834a' }}
                        >
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Filter Stock
                        </button>
                    </div>
                )}
            </div>

            {/* Stock Summary Numbers */}
            {stock && (
                <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-5" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Tile label="Arrived" value={stock.arrived} uom={stock.uom} />
                        <Tile label="Used" value={stock.used} uom={stock.uom} />
                        <Tile label="Balance" value={stock.balance} uom={stock.uom} primary />
                    </div>

                    {/* Shortfall Calculator */}
                    <div className="pt-3 border-t flex flex-wrap items-center gap-3" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        <div className="flex items-center gap-2">
                            <input
                                type="number"
                                placeholder="Enter required quantity…"
                                value={required}
                                onChange={(e) => setRequired(e.target.value)}
                                className="h-10 w-52 px-3 bg-slate-50 border rounded-xl text-xs font-bold outline-none focus:bg-white focus:ring-2 focus:ring-amber-500/20"
                                style={{ borderColor: 'rgba(200,131,74,0.25)' }}
                            />
                            <button
                                onClick={runCheck}
                                className="h-10 px-4 rounded-xl font-black text-xs uppercase text-white shadow-sm"
                                style={{ background: '#c8834a' }}
                            >
                                Calculate Shortage
                            </button>
                        </div>

                        {stock.required !== undefined && stock.required !== null && (
                            shortBy > 0 ? (
                                <div className="flex items-center gap-3 ml-auto p-2.5 px-3 rounded-2xl bg-rose-50 border border-rose-200">
                                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                    <span className="text-xs font-black text-rose-700">
                                        Shortage: {shortBy.toFixed(1)} {stock.uom} needed
                                    </span>
                                    {canOrder && (
                                        <button
                                            onClick={() => onOpenOrder({
                                                category,
                                                subtype,
                                                article: filters.article,
                                                colour: filters.colour,
                                                thickness: filters.thickness,
                                                qty: shortBy,
                                                supplier_id: stock.suggested_supplier?.id,
                                            })}
                                            className="h-8 px-3 rounded-xl font-black text-xs uppercase text-white flex items-center gap-1 shadow-sm bg-rose-600 hover:bg-rose-700"
                                        >
                                            <Truck className="w-3.5 h-3.5" /> Order from Supplier
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="ml-auto text-xs font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-2 rounded-2xl flex items-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Sufficient Stock (Covers requirement)
                                </div>
                            )
                        )}
                    </div>
                </div>
            )}

            {/* Needs Attention / Stock Alerts */}
            {(() => {
                const attention = lots
                    .filter((l) => Number(l.available) === 0 || l.covers_required === false)
                    .sort((a, b) => Number(a.available) - Number(b.available))
                    .slice(0, 5);

                const hasShortfall = stock?.required !== undefined && stock?.required !== null && shortBy > 0;
                const trulyHealthy = attention.length === 0 && !hasShortfall;

                return (
                    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-amber-600" />
                                <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">Stock Alerts &amp; Critical Lots</h3>
                            </div>
                            <span className="text-[11px] font-semibold text-slate-400">Lots requiring stock top-up</span>
                        </div>

                        {attention.length > 0 ? (
                            <div className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
                                {attention.map((l) => {
                                    const isOutOfStock = Number(l.available) === 0;
                                    return (
                                        <div
                                            key={l.lot_id}
                                            onClick={() => openDetail(l.lot_id)}
                                            className={`p-3.5 px-4 flex items-center gap-3 text-xs cursor-pointer hover:brightness-95 transition-all ${
                                                isOutOfStock ? 'bg-rose-50/40' : 'bg-amber-50/40'
                                            }`}
                                        >
                                            <span className="font-mono font-bold text-slate-600 w-28 shrink-0">{l.barcode}</span>
                                            <span className="font-black text-slate-900 flex-1 min-w-0 truncate">
                                                {l.article} · {l.colour}{l.thickness ? ` · ${l.thickness}` : ''}{l.size ? ` · ${l.size}` : ''}
                                            </span>
                                            <span className={`font-black w-32 text-right ${isOutOfStock ? 'text-rose-600' : 'text-amber-700'}`}>
                                                {Number(l.available || 0).toFixed(1)} {l.uom} available
                                            </span>
                                            {isOutOfStock ? (
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 shrink-0">
                                                    Out of Stock
                                                </span>
                                            ) : (
                                                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-800 shrink-0">
                                                    Low Stock
                                                </span>
                                            )}
                                            <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                                        </div>
                                    );
                                })}
                            </div>
                        ) : trulyHealthy ? (
                            <div className="p-6 text-center text-xs font-bold text-emerald-700 flex items-center justify-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                All lots in this specification have a healthy stock balance.
                            </div>
                        ) : (
                            <div className="p-4 text-xs font-bold text-rose-700 bg-rose-50/40 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                No lots found for this specification — shortage of {shortBy.toFixed(1)} {stock?.uom || 'units'}. Use "Add Material" or raise a Supplier Order.
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Leather by Style Accordion */}
            <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                <button
                    onClick={() => setStyleOpen((o) => !o)}
                    className="w-full p-4 px-5 flex items-center justify-between text-left hover:bg-slate-50/60 transition-colors"
                >
                    <span className="font-black text-xs uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <Shirt className="w-4 h-4 text-amber-600" /> Leather Consumption by Style
                    </span>
                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${styleOpen ? 'rotate-180' : ''}`} />
                </button>
                {styleOpen && (
                    <div className="p-4 border-t space-y-4" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        {/* Style picker */}
                        <div className="flex flex-wrap items-center gap-2.5">
                            <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 shrink-0">Style</label>
                            <select
                                value={styleId}
                                onChange={(e) => setStyleId(e.target.value)}
                                disabled={stylesLoading}
                                className="flex-1 min-w-[240px] h-10 px-3 rounded-xl border bg-white text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 disabled:opacity-60"
                                style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                            >
                                <option value="">{stylesLoading ? 'Loading styles…' : '-- Select a style --'}</option>
                                {styleOptions.map((s) => (
                                    <option key={s.style_id} value={s.style_id}>
                                        {s.style_name}{s.article ? ` · ${s.article}` : ''}{s.order_number ? ` — Order ${s.order_number}` : ''}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {!styleId ? (
                            <div className="text-center py-6 text-xs font-semibold text-slate-400">
                                {!stylesLoading && styleOptions.length === 0
                                    ? 'No styles found.'
                                    : 'Select a style to see its leather consumption.'}
                            </div>
                        ) : styleLoading ? (
                            <div className="flex justify-center py-6">
                                <Loader2 className="w-5 h-5 animate-spin text-amber-600" />
                            </div>
                        ) : styleData.length > 0 ? (
                            <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                                <table className="w-full text-xs text-left">
                                    <thead>
                                        <tr className="font-black uppercase tracking-wider text-[10px]" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.1)', color: '#9a7a5a' }}>
                                            <th className="p-3">Style</th>
                                            <th className="p-3">Leather</th>
                                            <th className="p-3 text-right">Pieces</th>
                                            <th className="p-3 text-right">Arrived</th>
                                            <th className="p-3 text-right">Consumed</th>
                                            <th className="p-3 text-right">On Hand</th>
                                            <th className="p-3 text-right">Reserved</th>
                                            <th className="p-3 text-right">Available</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
                                        {styleData.map((row, i) => (
                                            <tr key={`${row.style_id}-${row.article}-${row.colour}-${i}`} className="hover:bg-[#fcfaf8] transition-colors">
                                                <td className="p-3">
                                                    <div className="font-black text-slate-900">{row.style_name || '—'}</div>
                                                    {row.style_article && <div className="text-[10px] font-bold text-slate-400">{row.style_article}</div>}
                                                </td>
                                                <td className="p-3 font-bold text-slate-600">
                                                    {row.article || '—'}{row.colour ? ` · ${row.colour}` : ''}
                                                </td>
                                                <td className="p-3 text-right font-bold text-slate-700">{row.pieces ?? 0}</td>
                                                <td className="p-3 text-right font-bold text-slate-700">{fmtQty(row.arrived)}</td>
                                                <td className="p-3 text-right">
                                                    <div className="font-black text-slate-800">{fmtQty(row.consumed)}</div>
                                                    {Number(row.consumed_rework) > 0 && (
                                                        <div className="text-[10px] font-bold text-rose-600">
                                                            incl. {fmtQty(row.consumed_rework)} rework
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-bold text-slate-700">{fmtQty(row.on_hand)}</td>
                                                <td className="p-3 text-right font-bold text-slate-500">{fmtQty(row.reserved)}</td>
                                                <td className="p-3 text-right font-black" style={{ color: '#c8834a' }}>
                                                    {fmtQty(row.available)} <span className="text-[10px] text-slate-400">{row.uom || ''}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-6 text-xs font-semibold text-slate-400">
                                No leather consumption recorded for this style yet.
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Lot Detail Modal */}
            {detailLot && (
                <LotDetail
                    lot={detailLot}
                    onClose={() => setDetailLot(null)}
                    showToast={showToast}
                    canEdit={canEdit}
                    canAdjust={canAdjust}
                    onReceive={onReceive ? (lot) => { onReceive({ lotId: lot.lot_id, article: lot.article }); } : null}
                    onChanged={() => { runCheck(); openDetail(detailLot.lot_id); }}
                />
            )}
        </div>
    );
}