'use client';
import { useState, useEffect, useCallback } from 'react';
import { Search, Loader2, ChevronRight } from 'lucide-react';
import { useGetMaterialSpecQuery, useGetMaterialLotsQuery, useLazyGetMaterialLotsQuery, useLazyGetMaterialLotQuery }
 from '@/store/slices/materialApiSlice';
import { errMsg, SelectableFilterCombobox,CATEGORY_SUBTYPES } from './shared';

import { LotDetail } from './LotDetailModal';
export  function LotListScreen({showToast, canEdit, canAdjust, onReceive }) {
  
const [triggerGetLots] = useLazyGetMaterialLotsQuery(); // For load() list
const [triggerGetLot] = useLazyGetMaterialLotQuery();   // For openDetail() click

    const [category, setCategory] = useState('LEATHER');
  const [subtype, setSubtype] = useState('');

  const [filters, setFilters] = useState({ article: '', colour: '', thickness: '', size: '' });
  const [lots, setLots] = useState([]);

  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
const { data: spec } = useGetMaterialSpecQuery({ category, subtype }, { skip: !category });
const { data: lotsRes } = useGetMaterialLotsQuery({ category, subtype: subtype || undefined }, { skip: !category });
const availableLots = lotsRes?.lots || [];
  const getFilterOptions = (field) => {
    if (!availableLots.length) return [];
    if (field === 'article') {
      const set = new Set(availableLots.map((l) => l.article).filter(Boolean));
      return Array.from(set).sort().map((a) => ({ value: a, label: a }));
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

  const load = useCallback(async () => {
    if (!category) return;
    setLoading(true);
    try {
      const params = { category, subtype: subtype || undefined, ...filters };
      Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
      const res = await triggerGetLots(params).unwrap();
      setLots(res.lots || []);
    } catch (e) { showToast(errMsg(e), 'error'); } finally { setLoading(false); }
  }, [category, subtype, filters, showToast]);

  useEffect(() => { load(); }, [category, subtype]); // eslint-disable-line react-hooks/exhaustive-deps

  const [detailLot, setDetailLot] = useState(null);
  const openDetail = async (lotId) => {
    setSelectedId(lotId);
    try {
     const full = await triggerGetLot(lotId).unwrap();
      setDetailLot(full);
    } catch (e) { showToast(errMsg(e), 'error'); }
  };

  return (
    <div className="space-y-5">
      {/* Pill-based browsing, not a form — this screen is "look through
          everything", Stock Hub is "check one spec". */}
      <div className="flex flex-wrap gap-2">
        {['LEATHER', 'LINING', 'ACCESSORY'].map((c) => (
          <button key={c} onClick={() => { setCategory(c); setSubtype(''); setFilters({ article: '', colour: '', thickness: '', size: '' }); }}
            className={`h-9 px-4 rounded-full font-black text-xs uppercase transition-all ${category === c ? 'text-white shadow-sm' : 'text-slate-500 bg-white border'}`}
            style={category === c ? { background: '#c8834a' } : { borderColor: 'rgba(200,131,74,0.2)' }}>
            {c}
          </button>
        ))}
        {(CATEGORY_SUBTYPES[category] || []).map((s) => (
          <button key={s} onClick={() => { setSubtype(subtype === s ? '' : s); setFilters({ article: '', colour: '', thickness: '', size: '' }); }}
            className={`h-9 px-3 rounded-full font-bold text-[11px] transition-all ${subtype === s ? 'text-white' : 'text-slate-400 bg-slate-50'}`}
            style={subtype === s ? { background: '#a86022' } : {}}>
            {s}
          </button>
        ))}
      </div>

      {spec && spec.filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center bg-slate-50 p-3 rounded-2xl border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-1" />
          {spec.filters.map((f) => (
            <SelectableFilterCombobox
              key={f}
              placeholder={`Search ${f === 'thickness' ? 'Thickness' : f === 'size' ? 'Size' : f[0].toUpperCase() + f.slice(1)}…`}
              value={filters[f] || ''}
              onChange={(val) => setFilters((p) => ({ ...p, [f]: val }))}
              options={getFilterOptions(f)}
              className="bg-white"
            />
          ))}
          <button onClick={load} className="h-9 px-4 rounded-xl font-black text-xs uppercase text-white flex items-center gap-1.5 ml-auto shadow-xs hover:brightness-105 active:scale-[0.98] transition-all" style={{ background: '#c8834a' }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />} Search / Filter
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-[11px] font-black uppercase tracking-wider text-slate-500 bg-slate-50/60" style={{ borderColor: 'rgba(200,131,74,0.12)' }}>
              <th className="p-3.5">Barcode</th>
              <th className="p-3.5">Material</th>
              <th className="p-3.5">Colour</th>
              <th className="p-3.5">Thickness / Size</th>
              <th className="p-3.5 text-right">In Factory</th>
              <th className="p-3.5 text-right">Reserved</th>
              <th className="p-3.5 text-right">Ready to Use</th>
              <th className="p-3.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
            {lots.map((l) => (
              <tr key={l.lot_id} onClick={() => openDetail(l.lot_id)} className={`cursor-pointer hover:bg-amber-50/40 transition-colors ${selectedId === l.lot_id ? 'bg-amber-50/60' : ''}`}>
                <td className="p-3.5 font-mono font-bold text-slate-500 flex items-center gap-1.5">
                  {l.barcode}
                  {l.last_used_for_sku && (
                    <span className="text-[9px] font-black text-amber-800 bg-amber-100 px-1.5 py-0.5 rounded uppercase">Last Used</span>
                  )}
                </td>
                <td className="p-3.5 font-black text-slate-800">{l.article}</td>
                <td className="p-3.5 text-slate-600 font-bold">{l.colour}</td>
                <td className="p-3.5 text-slate-500 font-medium">{l.thickness || l.size || '—'}</td>
                <td className="p-3.5 text-right font-bold text-slate-700">{l.on_hand.toFixed(1)} {l.uom}</td>
                <td className="p-3.5 text-right font-bold text-amber-600">{l.reserved > 0 ? `${l.reserved.toFixed(1)} ${l.uom}` : '0'}</td>
                <td className="p-3.5 text-right">
                  {l.available === 0 ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase text-red-700 bg-red-50 border border-red-200">
                      Out of Stock
                    </span>
                  ) : (
                    <span className="font-black text-emerald-600 text-xs">
                      {l.available.toFixed(1)} {l.uom}
                    </span>
                  )}
                </td>
                <td className="p-3.5 text-right"><ChevronRight className="w-4 h-4 text-slate-300 inline" /></td>
              </tr>
            ))}
            {lots.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-xs font-bold text-slate-400">
                  No materials found matching your filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {detailLot && (
        <LotDetail lot={detailLot} onClose={() => setDetailLot(null)} showToast={showToast}
          canEdit={canEdit} canAdjust={canAdjust}
          onReceive={onReceive ? (lot) => {
            setDetailLot(null);
            onReceive({
              lotId: lot.lot_id,
              barcode: lot.barcode,
              article: lot.article,
              colour: lot.colour,
              supplierId: lot.supplier_id || lot.supplier_name,
              supplierName: lot.supplier_name,
              category: lot.category,
              uom: lot.uom,
              thickness: lot.thickness,
              size: lot.size,
              on_hand: lot.on_hand,
              available: lot.available,
            });
          } : null}
          onChanged={() => { load(); openDetail(detailLot.lot_id); }} />
      )}
    </div>
  );
}
