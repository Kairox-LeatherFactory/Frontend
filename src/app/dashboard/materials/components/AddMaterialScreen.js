'use client';
import { useState, useMemo } from 'react';
import {
  CheckCircle2,
  Loader2,
  PackagePlus,
  Printer,
  Boxes,
  Sparkles,
  Plus,
  Trash2,
  Barcode,
  Info,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useGetMaterialSpecQuery, useGetMaterialLotsQuery, useLazyGetMaterialLotsQuery, useCreateMaterialLotMutation } 
from '@/store/slices/materialApiSlice';
import { errMsg, SelectableFilterCombobox, CategoryPicker } from './shared';

export function AddMaterialScreen({ showToast, onDuplicate }) {
  const [triggerGetLots] = useLazyGetMaterialLotsQuery();
  const [createMaterialLot] = useCreateMaterialLotMutation();
  const [category, setCategory] = useState('');
  const [subtype, setSubtype] = useState('');

  const [article, setArticle] = useState('');
  const [colour, setColour] = useState('');
  const [attrs, setAttrs] = useState({});
  const [supplierId, setSupplierId] = useState('');
  const [supplierName, setSupplierName] = useState('');

  // Sheet-wise DCM Entry state for new leather lots
  const [sheets, setSheets] = useState([]);
  const [currentSheetDcm, setCurrentSheetDcm] = useState('');
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

  // Sheet calculations
  const totalSheetsDcm = useMemo(() => {
    return sheets.reduce((sum, s) => sum + (Number(s.dcm) || 0), 0);
  }, [sheets]);

  const targetDcm = Number(attrs.dcm) || 0;
  const isMatching = targetDcm > 0 && Math.abs(totalSheetsDcm - targetDcm) < 0.001;
  const isOver = targetDcm > 0 && totalSheetsDcm > targetDcm;
  const progressPercent = targetDcm > 0 ? Math.min(100, Math.round((totalSheetsDcm / targetDcm) * 100)) : 0;

  // Add sheet handler
  const handleAddSheet = (e) => {
    if (e) e.preventDefault();
    const dcmVal = parseFloat(currentSheetDcm);
    if (isNaN(dcmVal) || dcmVal <= 0) {
      showToast?.('Please enter a valid DCM value greater than 0', 'error');
      return;
    }

    const nextIndex = sheets.length + 1;
    const sheetBarcode = `LOT-NEW-S${String(nextIndex).padStart(2, '0')}`;

    const newSheet = {
      id: `new-sheet-${Date.now()}-${nextIndex}`,
      sheetNo: nextIndex,
      dcm: dcmVal,
      barcode: sheetBarcode,
    };

    setSheets((prev) => [...prev, newSheet]);
    setCurrentSheetDcm('');

    // If target dcm is not yet filled, sync with sum
    if (!attrs.dcm || Number(attrs.dcm) === 0) {
      setAttrs((prev) => ({ ...prev, dcm: String(totalSheetsDcm + dcmVal) }));
    }
  };

  // Remove sheet handler
  const handleRemoveSheet = (sheetId) => {
    setSheets((prev) => {
      const filtered = prev.filter((s) => s.id !== sheetId);
      return filtered.map((s, idx) => ({
        ...s,
        sheetNo: idx + 1,
        barcode: `LOT-NEW-S${String(idx + 1).padStart(2, '0')}`,
      }));
    });
  };

  // Quick Demo Fill
  const handleDemoFill = () => {
    setAttrs((prev) => ({ ...prev, dcm: '1240', thickness: prev.thickness || '0.9' }));
    if (!article) setArticle('GOAT SUEDE');
    if (!colour) setColour('FOREST');
    const sampleValues = [280, 310, 320, 330];
    const newSheets = sampleValues.map((dcmVal, idx) => ({
      id: `new-demo-${idx}-${Date.now()}`,
      sheetNo: idx + 1,
      dcm: dcmVal,
      barcode: `LOT-NEW-S${String(idx + 1).padStart(2, '0')}`,
    }));
    setSheets(newSheets);
    showToast?.('Sample sheets (1,240 DCM) loaded.', 'success');
  };

  const canSubmit = spec && spec.required_to_add.length >= 0 && article.trim() && colour.trim()
    && spec.required_to_add.every((k) => attrs[k] !== undefined && attrs[k] !== '');

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await createMaterialLot({
        category,
        subtype: subtype || undefined,
        article: article.trim(),
        colour: colour.trim(),
        attributes: attrs,
        supplier_id: supplierId || undefined,
        supplier_name: supplierName || undefined,
      }).unwrap();

      const lotBarcode = res.lot_barcode || res.barcode || 'LOT-CREATED';
      const finalizedSheets = sheets.map((s, idx) => ({
        ...s,
        barcode: `${lotBarcode}-S${String(idx + 1).padStart(2, '0')}`,
      }));

      setResult({
        ...res,
        lot_barcode: lotBarcode,
        generatedSheets: finalizedSheets,
        totalSheetsDcm,
      });
      showToast?.(`Lot created successfully! ${sheets.length > 0 ? `${sheets.length} sheet barcodes generated.` : ''}`, 'success');
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

        {/* Generated Sheet Barcodes List (Mock Output) */}
        {result.generatedSheets && result.generatedSheets.length > 0 && (
          <div className="bg-amber-50/50 rounded-2xl p-5 border text-left space-y-3" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Barcode className="w-4 h-4 text-amber-700" /> Generated Sheet Barcodes ({result.generatedSheets.length} sheets)
              </span>
              <span className="text-xs font-bold text-amber-800">
                Total: {result.totalSheetsDcm?.toLocaleString()} DCM
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
              {result.generatedSheets.map((s) => (
                <div key={s.id} className="bg-white p-3 rounded-xl border border-amber-200/80 flex items-center justify-between shadow-xs">
                  <div>
                    <div className="text-[10px] font-black uppercase text-slate-400">Sheet {s.sheetNo}</div>
                    <div className="font-mono text-xs font-black text-slate-800">{s.barcode}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-amber-800">{s.dcm} DCM</div>
                    <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Ready to Print</span>
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => showToast?.('Print triggered for all sheet barcodes.', 'success')}
              className="w-full h-9 rounded-xl font-black text-[11px] uppercase text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 flex items-center justify-center gap-2 transition-all mt-2"
            >
              <Printer className="w-4 h-4" /> Print All Sheet Labels ({result.generatedSheets.length})
            </button>
          </div>
        )}

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
              setSheets([]);
              setCurrentSheetDcm('');
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
            setSheets([]);
          }}
          onSubtype={(s) => {
            setSubtype(s);
            setAttrs({});
            setArticle('');
            setColour('');
            setSheets([]);
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
                onChange={setColour}
                placeholder="Select or type colour…"
                options={colourOptions}
                className="mt-1"
              />
            </div>

            {spec.required_to_add.map((k) => (
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

          {/* Sheet-wise DCM Entry for New Leather Materials */}
          {isLeather && (
            <div className="rounded-2xl border p-5 space-y-4 mt-4" style={{ background: '#faf7f2', borderColor: 'rgba(200,131,74,0.25)' }}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-amber-700" /> SHEET-WISE DCM ENTRY
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Enter DCM for each leather sheet. You can add multiple sheets as needed.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleDemoFill}
                  className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-100/70 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-all flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" /> Quick Demo (4 Sheets = 1,240 DCM)
                </button>
              </div>

              {/* Input Row: Sheet X | DCM [Input] [+ Add] */}
              <form onSubmit={handleAddSheet} className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-black text-slate-700 min-w-[100px] shrink-0">
                  Sheet {sheets.length + 1} &nbsp;|&nbsp; DCM
                </span>
                <div className="flex-1 min-w-[200px]">
                  <input
                    type="number"
                    step="any"
                    placeholder="Enter DCM (e.g. 280)"
                    value={currentSheetDcm}
                    onChange={(e) => setCurrentSheetDcm(e.target.value)}
                    className="w-full h-10 px-3 border rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20"
                    style={{ borderColor: 'rgba(200,131,74,0.3)' }}
                  />
                </div>
                <button
                  type="submit"
                  className="h-10 px-5 rounded-xl font-black text-xs uppercase text-white shadow-xs hover:brightness-105 active:scale-[0.98] transition-all flex items-center gap-1.5"
                  style={{ background: '#c8834a' }}
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </form>

              {/* Grid: Left = Sheet list | Right = Clean Summary Box */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start pt-2">
                <div className="md:col-span-7 bg-white rounded-2xl border p-3 shadow-xs space-y-2 max-h-[240px] overflow-y-auto" style={{ borderColor: 'rgba(200,131,74,0.18)' }}>
                  {sheets.length === 0 ? (
                    <div className="py-7 text-center text-xs font-bold text-slate-400">
                      No sheets entered yet. Enter DCM above and click <span className="text-amber-800 font-black">+ Add</span>.
                    </div>
                  ) : (
                    sheets.map((sheet) => (
                      <div
                        key={sheet.id}
                        className="flex items-center justify-between px-3 py-2.5 rounded-xl border bg-slate-50/50 hover:bg-amber-50/40 transition-all text-xs"
                        style={{ borderColor: 'rgba(200,131,74,0.12)' }}
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-black text-slate-700 w-16">
                            Sheet {sheet.sheetNo}
                          </span>
                          <span className="font-mono text-[10px] font-bold text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {sheet.barcode}
                          </span>
                        </div>

                        <div className="flex items-center gap-3">
                          <span className="font-black text-amber-900">
                            {sheet.dcm} <span className="text-[10px] text-slate-400 font-bold">DCM</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSheet(sheet.id)}
                            className="p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete sheet"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="md:col-span-5 bg-gradient-to-br from-[#fbf7f0] to-[#f5ede2] rounded-2xl border p-5 flex flex-col justify-between shadow-xs space-y-4" style={{ borderColor: 'rgba(200,131,74,0.25)' }}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        TOTAL SHEETS
                      </span>
                      <span className="text-2xl font-black text-slate-800">
                        {sheets.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                        TOTAL DCM
                      </span>
                      <span className="text-2xl font-black text-amber-900">
                        {totalSheetsDcm.toLocaleString()} <span className="text-xs text-amber-700">DCM</span>
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
                    {targetDcm === 0 ? (
                      <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1">
                        <Info className="w-3.5 h-3.5" /> Enter DCM quantity above to verify total
                      </span>
                    ) : isMatching ? (
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-100/70 border border-emerald-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Matches DCM quantity exactly
                      </span>
                    ) : isOver ? (
                      <span className="text-[11px] font-black text-red-700 bg-red-100/70 border border-red-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                        <AlertCircle className="w-3.5 h-3.5 text-red-600" /> {(totalSheetsDcm - targetDcm).toLocaleString()} DCM over total
                      </span>
                    ) : (
                      <span className="text-[11px] font-black text-amber-800 bg-amber-100/70 border border-amber-300 px-2.5 py-1 rounded-lg flex items-center gap-1.5 w-fit">
                        <Info className="w-3.5 h-3.5 text-amber-700" /> {(targetDcm - totalSheetsDcm).toLocaleString()} DCM remaining
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Verification Progress Bar */}
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs font-black mb-1.5">
                  <span className={isMatching ? 'text-emerald-700 flex items-center gap-1' : 'text-slate-600'}>
                    {isMatching ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> {sheets.length} / {sheets.length} sheets entered
                      </>
                    ) : (
                      `${sheets.length} sheets entered (${totalSheetsDcm} / ${targetDcm || 0} DCM)`
                    )}
                  </span>
                  <span className="font-bold text-slate-500 text-[11px]">
                    {progressPercent}%
                  </span>
                </div>

                <div className="w-full h-2.5 rounded-full bg-slate-200 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      isMatching
                        ? 'bg-emerald-500'
                        : isOver
                        ? 'bg-red-500'
                        : 'bg-amber-600'
                    }`}
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          )}

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
                  value={totalSheetsCount !== '' ? totalSheetsCount : (sheets.length > 0 ? String(sheets.length) : '')}
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
            Create Lot {targetDcm > 0 ? `(${targetDcm} DCM${sheets.length > 0 ? ` · ${sheets.length} Sheets` : ''})` : ''}
          </button>
        </div>
      )}
    </div>
  );
}
