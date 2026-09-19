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
              placeholder={`Filter ${f[0].toUpperCase() + f.slice(1)}…`}
              value={filters[f] || ''}
              onChange={(val) => setFilters((p) => ({ ...p, [f]: val }))}
              options={getFilterOptions(f)}
              className="bg-white"
            />
          ))}
          <button onClick={load} className="h-9 px-4 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1.5 ml-auto" style={{ background: '#c8834a' }}>
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Refine'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-3xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b text-left text-[10px] font-black uppercase tracking-wider text-slate-400" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
              <th className="p-3">Barcode</th><th className="p-3">Article</th><th className="p-3">Colour</th><th className="p-3">Spec</th>
              <th className="p-3 text-right">On Hand</th><th className="p-3 text-right">Reserved</th><th className="p-3 text-right">Available</th><th className="p-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y" style={{ borderColor: 'rgba(200,131,74,0.08)' }}>
            {lots.map((l) => (
              <tr key={l.lot_id} onClick={() => openDetail(l.lot_id)} className={`cursor-pointer hover:bg-amber-50/40 ${selectedId === l.lot_id ? 'bg-amber-50/60' : ''}`}>
                <td className="p-3 font-mono font-bold text-slate-500">{l.barcode}</td>
                <td className="p-3 font-black text-slate-800">{l.article}</td>
                <td className="p-3 text-slate-600">{l.colour}</td>
                <td className="p-3 text-slate-500">{l.thickness || l.size || '—'}</td>
                <td className="p-3 text-right font-bold">{l.on_hand.toFixed(1)}</td>
                <td className="p-3 text-right font-bold text-amber-600">{l.reserved.toFixed(1)}</td>
                <td className={`p-3 text-right font-black ${l.available === 0 ? 'text-red-500' : 'text-emerald-600'}`}>{l.available.toFixed(1)} {l.uom}</td>
                <td className="p-3"><ChevronRight className="w-4 h-4 text-slate-300" /></td>
              </tr>
            ))}
            {lots.length === 0 && !loading && (
              <tr><td colSpan={8} className="p-6 text-center text-xs font-bold text-slate-400">No lots match. Available:0 rows are shown normally here, not hidden.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detailLot && (
        <LotDetail lot={detailLot} onClose={() => setDetailLot(null)} showToast={showToast}
          canEdit={canEdit} canAdjust={canAdjust}
          onReceive={onReceive ? (lot) => { onReceive({ lotId: lot.lot_id, article: lot.article }); } : null}
          onChanged={() => { load(); openDetail(detailLot.lot_id); }} />
      )}
    </div>
  );
}
