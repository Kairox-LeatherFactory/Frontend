'use client';
import { useState, useMemo } from 'react';
import { CheckCircle2, Loader2, PackagePlus, Boxes } from 'lucide-react';
import { 
  useGetMaterialSpecQuery, 
  useGetMaterialLotsQuery, 
  useLazyGetMaterialLotsQuery, 
  useCreateMaterialArrivalMutation 
} from '@/store/slices/materialApiSlice';
import { errMsg, SelectableFilterCombobox, CategoryPicker } from './shared';

export function AddMaterialScreen({ showToast, onDuplicate }) {
  const [triggerGetLots] = useLazyGetMaterialLotsQuery();
  const [createMaterialArrival] = useCreateMaterialArrivalMutation();
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');

  const [article, setArticle] = useState('');
  const [colour, setColour] = useState('');
  const [attrs, setAttrs] = useState({});
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');

  // Sheets are entered later on the Arrivals screen — only the count is captured here
  const [totalSheetsCount, setTotalSheetsCount] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const { data: spec } = useGetMaterialSpecQuery({ category, subtype }, { skip: !category });
  const { data: lotsRes } = useGetMaterialLotsQuery({ category, subtype: subtype || undefined }, { skip: !category });
  const availableLots = lotsRes?.lots || [];

  const isLeather = category === 'LEATHER' || spec?.uom === 'dcm';

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

  const targetDcm = Number(attrs.dcm) || 0;

  const requiredKeys = spec ? spec.required_to_add.filter((k) => !(isLeather && k === spec.quantity_field)) : [];
  const totalQtyVal = isLeather
    ? targetDcm
    : (Number(attrs[spec?.quantity_field]) || 0);

  const canSubmit = spec && article.trim() && colour.trim()
    && requiredKeys.every((k) => attrs[k] !== undefined && attrs[k] !== '')
    && (!isLeather || totalQtyVal > 0);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const arrivalPayload = {
        article: article.trim(),
        colour: colour.trim(),
        total_qty: totalQtyVal,
        sheet_count: totalSheetsCount ? parseInt(totalSheetsCount, 10) : null,
        category: category || 'LEATHER',
        subtype: subtype || null,
        thickness: attrs.thickness || null,
        size: attrs.size || null,
        supplier_id: supplierId || null,
        supplier_order_id: null,
        note: attrs.note || null,
      };

      const res = await createMaterialArrival(arrivalPayload).unwrap();
      const receiptId = res.receipt_id || res.id || 'RCV-CREATED';
      const lotBarcode = res.lot_barcode || res.barcode || (res.lot_id ? `LOT-${res.lot_id.slice(0, 8)}` : 'LOT-CREATED');

      setResult({
        ...res,
        receipt_id: receiptId,
        lot_barcode: lotBarcode,
      });
      showToast?.(`Arrival registered! Receipt ID: ${receiptId}`, 'success');
    } catch (e) {
      showToast?.(errMsg(e), 'error');
      if (e.status === 409 && onDuplicate) {
        try {
          const params = {
            category,
            subtype: subtype || undefined,
            article: article.trim(),
            colour: colour.trim(),
            thickness: attrs.thickness || undefined,
            size: attrs.size || undefined,
          };
          Object.keys(params).forEach((k) => { if (!params[k]) delete params[k]; });
          const res = await triggerGetLots(params).unwrap();
          const existing = res.lots?.[0];
          if (existing) onDuplicate({ lotId: existing.lot_id, article: existing.article });
        } catch {
          // Lookup failed
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="bg-white p-8 rounded-3xl shadow-xl border text-center space-y-5 max-w-2xl mx-auto animate-fade-in" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 shadow-sm">
          <CheckCircle2 className="w-9 h-9" />
        </div>
        <div>
          <h3 className="font-black text-2xl tracking-tight" style={{ color: '#2d1f0e' }}>New Lot Created</h3>
          <p className="text-xs font-bold text-slate-500 mt-1">{result.article} · {result.colour} — {result.on_hand} {result.uom} on hand</p>
        </div>

        <div className="p-4 rounded-2xl bg-slate-50 border font-mono text-2xl font-black tracking-wider text-slate-800" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
          {result.lot_barcode}
        </div>

        <div className="flex gap-2 justify-center pt-2">
          <button
            onClick={() => {
              setResult(null);
              setCategory('');
              setSubtype('');
              setArticle('');
              setColour('');
              setAttrs({});
              setSupplierId('');
              setSupplierName('');
              setTotalSheetsCount('');
            }}
            className="h-11 px-6 rounded-2xl font-black text-xs uppercase text-white shadow-md hover:brightness-105 transition-all"
            style={{ background: '#c8834a' }}
          >
            Add Another Material
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-3xl shadow-sm border space-y-6 max-w-4xl mx-auto" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
      <div>
        <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">Step 1 — Class</div>
        <CategoryPicker
          category={category}
          subtype={subtype}
          onCategory={(c) => {
            setCategory(c);
            setSubtype('');
            setAttrs({});
            setArticle('');
            setColour('');
          }}
          onSubtype={(s) => {
            setSubtype(s);
            setAttrs({});
            setArticle('');
            setColour('');
          }}
          subtypeRequired={category === 'ACCESSORY'}
        />
      </div>

      {spec && (
        <div className="space-y-5 pt-4 border-t" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          {availableLots.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-[#faf6f0] border border-[#c8834a]/25 space-y-1.5">
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-black text-slate-700 block mb-1">Article / Material Name *</label>
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
              <label className="text-xs font-black text-slate-700 block mb-1">Colour *</label>
              <SelectableFilterCombobox
                value={colour}
                // Colours are stored in capitals — uppercase as the user types
                onChange={(v) => setColour(v.toUpperCase())}
                placeholder="Select or type colour…"
                options={colourOptions}
                className="mt-1"
              />
            </div>

            {spec.required_to_add
              .filter((k) => !(isLeather && k === spec.quantity_field))
              .map((k) => (
              <div key={k}>
                <label className="text-xs font-black text-slate-700 capitalize block mb-1">
                  {k}{k === spec.quantity_field ? ` (${spec.uom}) *` : ' *'}
                </label>
                {k === spec.quantity_field ? (
                  <input
                    type="number"
                    value={attrs[k] ?? ''}
                    onChange={(e) => setAttrs((p) => ({ ...p, [k]: e.target.value }))}
                    placeholder={`Enter ${spec.uom} (e.g. 1240)`}
                    className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    style={{ borderColor: 'rgba(200,131,74,0.3)' }}
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
              <label className="text-xs font-bold text-slate-500 block mb-1">Supplier ID (optional)</label>
              <input
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                placeholder="leave blank if unknown"
                className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.2)' }}
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1">Supplier Name (optional)</label>
              <input
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                placeholder="e.g. Kanpur Leather Works"
                className="w-full h-10 px-3.5 border rounded-xl text-xs font-bold bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                style={{ borderColor: 'rgba(200,131,74,0.2)' }}
              />
            </div>
          </div>

          {/* Side-by-side: Total Sheets & Total DCM */}
          {isLeather && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">
                  Total Sheets <span className="font-semibold text-slate-500">(Sheet Count) *</span>
                </label>
                <input
                  type="number"
                  step="1"
                  placeholder="e.g. 8"
                  value={totalSheetsCount}
                  onChange={(e) => setTotalSheetsCount(e.target.value)}
                  className="w-full h-11 px-3.5 border rounded-xl text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-700 block mb-1.5">
                  Total DCM <span className="font-semibold text-slate-500">(DCM) *</span>
                </label>
                <input
                  type="number"
                  step="any"
                  placeholder="e.g. 1000"
                  value={attrs.dcm ?? ''}
                  onChange={(e) => setAttrs((p) => ({ ...p, dcm: e.target.value }))}
                  className="w-full h-11 px-3.5 border rounded-xl text-sm font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                  style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                />
              </div>
            </div>
          )}

          {spec.required_to_add.length === 0 && (
            <p className="text-[11px] font-bold text-amber-600">This category/subtype combination isn&apos;t configured yet — submit is blocked.</p>
          )}

          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full h-12 rounded-2xl font-black text-xs uppercase tracking-wider text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer shadow-md hover:brightness-105 active:scale-[0.99] transition-all"
            style={{ background: '#c8834a' }}
          >
            {submitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <PackagePlus className="w-4 h-4" />
            )}
            Create Lot {targetDcm > 0 ? `(${targetDcm} DCM${totalSheetsCount ? ` · ${totalSheetsCount} Sheets` : ''})` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
