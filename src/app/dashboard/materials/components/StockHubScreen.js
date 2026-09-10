'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, CheckCircle2, AlertTriangle, ChevronRight, Truck } from 'lucide-react';
import { useGetMaterialSpecQuery, useGetMaterialLotsQuery, useLazyGetMaterialLotsQuery, useLazyGetMaterialLotQuery, useLazyGetMaterialsStockQuery }
    from '@/store/slices/materialApiSlice';
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
const { data: spec } = useGetMaterialSpecQuery({ category, subtype }, { skip: !category });
const { data: lotsRes } = useGetMaterialLotsQuery({ category, subtype: subtype || undefined }, { skip: !category });
const availableLots = lotsRes?.lots || [];
    const openDetail = async (lotId) => {
        try {
            const full = await triggerGetLot(lotId).unwrap();
            setDetailLot(full);
        } catch (e) { showToast(errMsg(e), 'error'); }
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
                sub: `${info.count} lot(s) · ${info.avail.toFixed(1)} ${info.uom} avail`,
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
    }, [category, subtype, filters, required, showToast]);

    useEffect(() => { runCheck(); }, [category, subtype]); // eslint-disable-line react-hooks/exhaustive-deps

    const shortBy = stock?.short_by ?? 0;

    return (
        <div className="space-y-5">
            <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                <CategoryPicker
                    category={category}
                    subtype={subtype}
                    onCategory={(c) => { setCategory(c); setSubtype(''); setFilters({ article: '', colour: '', thickness: '', size: '' }); }}
                    onSubtype={(s) => { setSubtype(s); setFilters({ article: '', colour: '', thickness: '', size: '' }); }}
                    subtypeRequired={category === 'ACCESSORY'}
                />
                {spec && spec.filters.length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                        {spec.filters.map((f) => (
                            <SelectableFilterCombobox
                                key={f}
                                placeholder={`Filter ${f[0].toUpperCase() + f.slice(1)}…`}
                                value={filters[f] || ''}
                                onChange={(val) => setFilters((p) => ({ ...p, [f]: val }))}
                                options={getFilterOptions(f)}
                            />
                        ))}
                        <button onClick={runCheck} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1.5 shrink-0" style={{ background: '#c8834a' }}>
                            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Check
                        </button>
                    </div>
                )}
            </div>

            {stock && (
                <div className="bg-white p-5 rounded-3xl shadow-sm border space-y-4" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                    <div className="flex flex-wrap gap-3">
                        <Tile label="On Hand" value={stock.on_hand} uom={stock.uom} />
                        <Tile label="Reserved" value={stock.reserved} uom={stock.uom} />
                        <Tile label="Available" value={stock.available} uom={stock.uom} primary />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        <input type="number" placeholder="Required qty…" value={required} onChange={(e) => setRequired(e.target.value)}
                            className="h-9 w-40 px-3 bg-slate-50 border rounded-lg text-xs font-bold outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
                        <button onClick={runCheck} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white" style={{ background: '#c8834a' }}>Check Shortfall</button>
                        {stock.required !== undefined && stock.required !== null && (
                            shortBy > 0 ? (
                                <div className="flex items-center gap-2 ml-auto p-2.5 rounded-xl bg-red-50 border border-red-200">
                                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                    <span className="text-xs font-bold text-red-700">Short by {shortBy.toFixed(1)} {stock.uom}</span>
                                    {canOrder && (
                                        <button onClick={() => onOpenOrder({ category, subtype, article: filters.article, colour: filters.colour, thickness: filters.thickness, qty: shortBy, supplier_id: stock.suggested_supplier?.id })}
                                            className="h-8 px-3 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1" style={{ background: '#dc2626' }}>
                                            <Truck className="w-3.5 h-3.5" /> Order {stock.suggested_supplier ? `via ${stock.suggested_supplier.name}` : ''}
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <span className="ml-auto text-xs font-bold text-emerald-600 flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Covers requirement</span>
                            )
                        )}
                    </div>
                </div>
            )}

            {(() => {
                // Hub's job is "glance and alert", not "browse" — that's the Lots
                // screen. Only surface the lots that actually need a look: zero
                // available, or can't cover the typed requirement.
                const attention = lots
                    .filter((l) => l.available === 0 || l.covers_required === false)
                    .sort((a, b) => a.available - b.available)
                    .slice(0, 5);
                // A spec with ZERO lots at all is the worst case, not a healthy
                // one — an empty `lots` array can't produce any per-lot attention
                // rows, so without this the panel wrongly said "healthy" right
                // under a red "short by 99999999999999 mtrs" banner above it.
                const hasShortfall = stock?.required !== undefined && stock?.required !== null && shortBy > 0;
                const trulyHealthy = attention.length === 0 && !hasShortfall;
                return (
                    <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                        <div className="p-4 border-b font-black text-xs uppercase tracking-wider text-slate-500 flex items-center gap-2" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Needs Attention
                        </div>
                        {attention.length > 0 ? (
                            <div className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
                                {attention.map((l) => (
                                    <div key={l.lot_id} onClick={() => openDetail(l.lot_id)}
                                        className={`p-3 flex items-center gap-3 text-xs cursor-pointer hover:brightness-95 ${l.available === 0 ? 'bg-red-50/40' : 'bg-amber-50/40'}`}>
                                        <span className="font-mono font-bold text-slate-500 w-24 shrink-0">{l.barcode}</span>
                                        <span className="font-black text-slate-800 flex-1 min-w-0 truncate">{l.article} · {l.colour}{l.thickness ? ` · ${l.thickness}` : ''}{l.size ? ` · ${l.size}` : ''}</span>
                                        <span className={`font-black w-28 text-right ${l.available === 0 ? 'text-red-500' : 'text-amber-600'}`}>{l.available.toFixed(1)} {l.uom} avail</span>
                                        {l.covers_required === false && <span className="text-[9px] font-black uppercase text-amber-600 shrink-0">Short</span>}
                                        <ChevronRight className="w-3.5 h-3.5 text-slate-300 shrink-0" />
                                    </div>
                                ))}
                            </div>
                        ) : trulyHealthy ? (
                            <div className="p-6 text-center text-xs font-bold text-emerald-600 flex items-center justify-center gap-1.5"><CheckCircle2 className="w-4 h-4" /> Every lot in this spec looks healthy.</div>
                        ) : (
                            <div className="p-4 text-xs font-bold text-red-700 bg-red-50/40 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
                                No lots exist for this spec at all — short by {shortBy.toFixed(1)} {stock.uom}. Use Add Material to create one, or widen the filters above.
                            </div>
                        )}
                    </div>
                );
            })()}

            {detailLot && (
                <LotDetail lot={detailLot} onClose={() => setDetailLot(null)} showToast={showToast}
                    canEdit={canEdit} canAdjust={canAdjust}
                    onReceive={onReceive ? (lot) => { onReceive({ lotId: lot.lot_id, article: lot.article }); } : null}
                    onChanged={() => { runCheck(); openDetail(detailLot.lot_id); }} />
            )}
        </div>
    );
}