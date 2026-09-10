'use client';
import { useState,useMemo } from 'react';
import { CheckCircle2, Loader2, PackagePlus, Printer, Boxes } from 'lucide-react';
import { useGetMaterialSpecQuery, useGetMaterialLotsQuery, useLazyGetMaterialLotsQuery, useCreateMaterialLotMutation } 
from '@/store/slices/materialApiSlice';
import { errMsg,SelectableFilterCombobox, CategoryPicker } from './shared';

export function AddMaterialScreen({showToast, onDuplicate }) {

  const [triggerGetLots] = useLazyGetMaterialLotsQuery();
  const [createMaterialLot] = useCreateMaterialLotMutation();
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');

  const [article, setArticle] = useState('');
  const [colour, setColour] = useState('');
  const [attrs, setAttrs] = useState({});
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
const { data: spec } = useGetMaterialSpecQuery({ category, subtype }, { skip: !category });
const { data: lotsRes } = useGetMaterialLotsQuery({ category, subtype: subtype || undefined }, { skip: !category });
const availableLots = lotsRes?.lots || [];

  // Derive unique article options with lot details
  const articleOptions = useMemo(() => {
    if (!availableLots.length) return [];
    const map = new Map();
    availableLots.forEach((l) => {
      if (!l.article) return;
      if (!map.has(l.article)) {
        map.set(l.article, { count: 0, avail: 0, uom: l.uom || '', colours: new Set(), lot: l });
      }
      const item = map.get(l.article);
      item.count += 1;
      item.avail += (Number(l.available) || 0);
      if (l.colour) item.colours.add(l.colour);
    });
    return Array.from(map.entries()).map(([art, info]) => ({
      value: art,
      label: art,
      sub: `${info.count} lot(s) · ${info.avail.toFixed(1)} ${info.uom} · Colours: ${Array.from(info.colours).slice(0, 3).join(', ')}`,
      lot: info.lot,
    }));
  }, [availableLots]);

  // Derive unique colour options for selected article
  const colourOptions = useMemo(() => {
    const filtered = article
      ? availableLots.filter((l) => l.article?.toLowerCase() === article.toLowerCase())
      : availableLots;
    const set = new Set(filtered.map((l) => l.colour).filter(Boolean));
    return Array.from(set).sort().map((c) => ({ value: c, label: c }));
  }, [availableLots, article]);

  // Derive attribute options (thickness, size)
  const getAttrOptions = (attrKey) => {
    const set = new Set(availableLots.map((l) => l[attrKey] || l.attributes?.[attrKey]).filter(Boolean));
    return Array.from(set).sort().map((v) => ({ value: v, label: String(v) }));
  };

  // Quick Lot auto-population
  const handleQuickPickLot = (lot) => {
    if (!lot) return;
    if (lot.article) setArticle(lot.article);
    if (lot.colour) setColour(lot.colour);
    const newAttrs = { ...attrs };
    if (lot.thickness) newAttrs.thickness = lot.thickness;
    if (lot.size) newAttrs.size = lot.size;
    setAttrs(newAttrs);
    if (lot.supplier_id) setSupplierId(lot.supplier_id);
    if (lot.supplier_name) setSupplierName(lot.supplier_name);
  };

  const canSubmit = spec && spec.required_to_add.length >= 0 && article.trim() && colour.trim()
    && spec.required_to_add.every((k) => attrs[k] !== undefined && attrs[k] !== '');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await createMaterialLot({
        category, subtype: subtype || undefined, article: article.trim(), colour: colour.trim(),
        attributes: attrs, supplier_id: supplierId || undefined,
        supplier_name: supplierName || undefined,
      });
      setResult(res);
    } catch (e) {
      showToast(errMsg(e), 'error');
      if (e.status === 409 && onDuplicate) {
        try {
          const params = { category, subtype: subtype || undefined, article: article.trim(), colour: colour.trim(), thickness: attrs.thickness || undefined, size: attrs.size || undefined };
          Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
        const res = await triggerGetLots(params).unwrap();
          const existing = res.lots?.[0];
          if (existing) onDuplicate({ lotId: existing.lot_id, article: existing.article });
        } catch {
          // Lookup failed
        }
      }
    } finally { setSubmitting(false); }
  };

  if (result) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-sm border text-center space-y-4 max-w-md mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto" />
        <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>Lot Created</h3>
        <div className="p-4 rounded-2xl bg-slate-50 border font-mono text-2xl font-black tracking-wider" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>{result.lot_barcode}</div>
        <p className="text-xs font-bold text-slate-500">{result.article} · {result.colour} — {result.on_hand} {result.uom} on hand</p>
        <div className="flex gap-2 justify-center">
          <button onClick={() => window.print()} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-white flex items-center gap-2" style={{ background: '#c8834a' }}><Printer className="w-4 h-4" /> Print Label</button>
          <button onClick={() => { setResult(null); setCategory(''); setSubtype(''); setArticle(''); setColour(''); setAttrs({}); setSupplierId(''); setSupplierName(''); }} className="h-10 px-5 rounded-xl font-black text-xs uppercase text-slate-600 bg-slate-100">Add Another</button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-5 max-w-xl mx-auto" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Step 1 — Class</div>
        <CategoryPicker category={category} subtype={subtype} onCategory={(c) => { setCategory(c); setSubtype(''); setAttrs({}); setArticle(''); setColour(''); }} onSubtype={(s) => { setSubtype(s); setAttrs({}); setArticle(''); setColour(''); }} subtypeRequired={category === 'ACCESSORY'} />
      </div>

      {spec && (
        <div className="space-y-4 pt-4 border-t" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          {availableLots.length > 0 && (
            <div className="p-3 rounded-2xl bg-[#faf6f0] border border-[#c8834a]/25 space-y-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-[#a86022] flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5" /> Quick Autofill from Existing Lot on File
              </span>
              <SelectableFilterCombobox
                placeholder="Choose existing Lot barcode / Material to autofill spec…"
                value=""
                onChange={() => {}}
                onSelectLot={handleQuickPickLot}
                options={availableLots.map((l) => ({
                  value: l.lot_id,
                  label: `${l.barcode} — ${l.article} · ${l.colour}`,
                  sub: `${l.thickness ? `${l.thickness} · ` : ''}${l.size ? `${l.size} · ` : ''}${l.available} ${l.uom} on hand`,
                  lot: l,
                }))}
                className="bg-white"
              />
            </div>
          )}

          <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">Step 2 — Fields</div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400">Article / Material Name *</label>
              <SelectableFilterCombobox
                value={article}
                onChange={setArticle}
                placeholder="Select or type material…"
                options={articleOptions}
                onSelectLot={handleQuickPickLot}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400">Colour *</label>
              <SelectableFilterCombobox
                value={colour}
                onChange={setColour}
                placeholder="Select or type colour…"
                options={colourOptions}
                className="mt-1"
              />
            </div>
            {spec.required_to_add.map((k) => (
              <div key={k}>
                <label className="text-[10px] font-bold text-slate-400 capitalize">
                  {k}{k === spec.quantity_field ? ` (${spec.uom}) *` : ' *'}
                </label>
                {k === spec.quantity_field ? (
                  <input
                    type="number"
                    value={attrs[k] ?? ''}
                    onChange={(e) => setAttrs((p) => ({ ...p, [k]: e.target.value }))}
                    placeholder={`Enter ${spec.uom}…`}
                    className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1 bg-slate-50 focus:bg-white outline-none focus:border-[#c8834a]"
                    style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                  />
                ) : (
                  <SelectableFilterCombobox
                    value={attrs[k] ?? ''}
                    onChange={(val) => setAttrs((p) => ({ ...p, [k]: val }))}
                    placeholder={`Select or type ${k}…`}
                    options={getAttrOptions(k)}
                    className="mt-1"
                  />
                )}
              </div>
            ))}
            <div>
              <label className="text-[10px] font-bold text-slate-400">Supplier ID (optional)</label>
              <input value={supplierId} onChange={(e) => setSupplierId(e.target.value)} placeholder="leave blank if unknown" className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1 bg-slate-50 focus:bg-white outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400">Supplier Name (optional)</label>
              <input value={supplierName} onChange={(e) => setSupplierName(e.target.value)} placeholder="e.g. Kanpur Leather Works" className="w-full h-9 px-3 border rounded-lg text-xs font-bold mt-1 bg-slate-50 focus:bg-white outline-none focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.2)' }} />
            </div>
          </div>
          {spec.required_to_add.length === 0 && (
            <p className="text-[11px] font-bold text-amber-600">This category/subtype combination isn&apos;t configured yet — submit is blocked.</p>
          )}
          <button onClick={handleSubmit} disabled={!canSubmit || submitting} className="w-full h-11 rounded-xl font-black text-xs uppercase text-white disabled:opacity-40 flex items-center justify-center gap-2 cursor-pointer shadow-md" style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} Create Lot
          </button>
        </div>
      )}
    </div>
  );
}
