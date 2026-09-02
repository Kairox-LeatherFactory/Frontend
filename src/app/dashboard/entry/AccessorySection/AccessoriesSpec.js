'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle2, XCircle, AlertTriangle, Loader2, ChevronDown, ChevronRight,
  Plus, Trash2, Save, Copy, Truck, PackageCheck,
} from 'lucide-react';
import {
  useLazyGetStyleMaterialSpecQuery,
  usePutStyleMaterialSpecMutation,
  useAddStyleMaterialSpecLineMutation,
  usePatchStyleMaterialSpecLineMutation,
  useDeleteStyleMaterialSpecLineMutation,
  useConfirmStyleMaterialSpecMutation,
  useCopyStyleMaterialSpecMutation,
  useLazyGetStyleMaterialRequirementQuery,
  useRecordMaterialIssueMutation,
  useIssueAccessoryKitMutation,
  useCreateSupplierOrderMutation,
  useLazyBarcodeResolveQuery
} from "@/store/slices/apiSlice";
import MaterialCategorySection from './MaterialCategorySection';
export const ACCESSORY_SUBTYPES = ['BUTTON', 'ZIP', 'THREAD', 'OTHER'];
export const LINING_SUBTYPES = ['PLAIN_LINING', 'RIBS', 'KNIT'];

export function StyleAccessoriesPanel({ styleId, canEdit, token, showToast, pieceCount }) {
  const [spec, setSpec] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [noAccessories, setNoAccessories] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmWarnings, setConfirmWarnings] = useState([]);
  const [copyFromInput, setCopyFromInput] = useState('');
  const [copying, setCopying] = useState(false);
  const [requirementOpen, setRequirementOpen] = useState(false);
  const [requirement, setRequirement] = useState(null);
  const [requirementLoading, setRequirementLoading] = useState(false);
  const [orderingKey, setOrderingKey] = useState(null);

  const [triggerGetStyleMaterialSpec] = useLazyGetStyleMaterialSpecQuery();
  const [putStyleMaterialSpec] = usePutStyleMaterialSpecMutation();
  const [addStyleMaterialSpecLine] = useAddStyleMaterialSpecLineMutation();
  const [patchStyleMaterialSpecLine] = usePatchStyleMaterialSpecLineMutation();
  const [deleteStyleMaterialSpecLine] = useDeleteStyleMaterialSpecLineMutation();
  const [confirmStyleMaterialSpec] = useConfirmStyleMaterialSpecMutation();
  const [copyStyleMaterialSpec] = useCopyStyleMaterialSpecMutation();
  const [triggerGetStyleMaterialRequirement] = useLazyGetStyleMaterialRequirementQuery();
  const [recordMaterialIssue] = useRecordMaterialIssueMutation();

  const [createSupplierOrder] = useCreateSupplierOrderMutation();

  const load = useCallback(async () => {
    if (!token || !styleId) return;
    setLoading(true); setError('');
    try {
      const data = await triggerGetStyleMaterialSpec(styleId).unwrap();
      setSpec(data);
      setNoAccessories(!!data.no_accessories_declared);
      setConfirmWarnings([]);
    } catch (e) {
      setError(e.message || 'Failed to load material spec.');
      setSpec(null);
    } finally {
      setLoading(false);
    }
  }, [styleId]);

  useEffect(() => { load(); }, [load]);

  const leatherLines = (spec?.lines || []).filter((l) => l.category === 'LEATHER' && l.is_active !== false);
  const liningLines = (spec?.lines || []).filter((l) => l.category === 'LINING' && l.is_active !== false);
  const accessoryLines = (spec?.lines || []).filter((l) => l.category === 'ACCESSORY' && l.is_active !== false);

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      const res = await confirmStyleMaterialSpec({ styleId: styleId, noAccessories: accessoryLines.length === 0 && noAccessories }).unwrap();
      showToast(res.message || 'Material spec confirmed.', 'success');
      setConfirmWarnings(res.warnings || []);
      await load();
    } catch (e) {
      showToast(e.message || 'Failed to confirm material spec.', 'error');
    } finally {
      setConfirming(false);
    }
  };

  const handleCopyFrom = async () => {
    if (!copyFromInput.trim()) return;
    setCopying(true);
    try {
      const res = await copyStyleMaterialSpec({ styleId: styleId, fromStyleId: copyFromInput.trim().unwrap() });
      showToast(res.message || 'Copied material spec from that style.', 'success');
      setCopyFromInput('');
      await load();
    } catch (e) {
      showToast(e.message || 'Copy failed.', 'error');
    } finally {
      setCopying(false);
    }
  };

  const toggleRequirement = async () => {
    const next = !requirementOpen;
    setRequirementOpen(next);
    if (next && !requirement) {
      setRequirementLoading(true);
      try {
        setRequirement(await triggerGetStyleMaterialRequirement(styleId).unwrap());
      } catch (e) {
        showToast(e.message || 'Failed to load requirement check.', 'error');
      } finally {
        setRequirementLoading(false);
      }
    }
  };

  const handleOrder = async (line) => {
    const key = line.spec_id || line.article;
    setOrderingKey(key);
    try {
      const res = await createSupplierOrder({
        category: line.category,
        subtype: line.subtype || undefined,
        article: line.article,
        thickness: line.thickness || undefined,
        colour: line.colour || undefined,
        qty: line.short_by,
      }).unwrap();
      showToast(`Supplier order raised for ${res.article || line.article}.`, 'success');
    } catch (e) {
      showToast(e.message || 'Failed to raise supplier order.', 'error');
    } finally {
      setOrderingKey(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-3 p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2 text-xs font-bold text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading material spec…
      </div>
    );
  }

  if (error) {
    return <div className="mt-3 p-4 rounded-xl bg-red-50 border border-red-200 text-xs font-bold text-red-700">{error}</div>;
  }

  if (!spec) return null;

  const requirementLines = requirement?.lines || [];

  return (
    <div className="mt-3 p-4 rounded-xl bg-white border space-y-4" style={{ borderColor: 'rgba(124,58,237,0.2)', background: 'linear-gradient(180deg, rgba(124,58,237,0.04), transparent)' }}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] font-black uppercase tracking-widest text-violet-600">Material Spec</span>
          {spec.confirmed ? (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Confirmed
            </span>
          ) : (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-amber-50 border border-amber-200 text-amber-700">Not confirmed</span>
          )}
          {spec.no_accessories_declared && (
            <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-500">No accessories needed</span>
          )}
        </div>
      </div>

      {spec.release_blockers?.length > 0 && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 space-y-0.5">
          {spec.release_blockers.map((b, i) => <p key={i} className="text-[11px] font-bold text-rose-700">⚠ {b}</p>)}
        </div>
      )}
      {confirmWarnings.length > 0 && (
        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 space-y-0.5">
          {confirmWarnings.map((w, i) => <p key={i} className="text-[11px] font-bold text-amber-700">ℹ {w}</p>)}
        </div>
      )}

      <MaterialCategorySection
        category="LEATHER" label="Leather" accentColor="#b45309"
        lines={leatherLines} styleId={styleId} token={token} showToast={showToast} canEdit={canEdit} onChanged={load} pieceCount={pieceCount}
        subtypes={null} showThickness minimalFields
        defaultForm={{ article: '', colour: '', thickness: '', qty_per_piece: '', sku_id: '', material_lot_id: '' }}
      />

      <MaterialCategorySection
        category="LINING" label="Lining" accentColor="#2563eb"
        lines={liningLines} styleId={styleId} token={token} showToast={showToast} canEdit={canEdit} onChanged={load} pieceCount={pieceCount}
        subtypes={LINING_SUBTYPES} showThickness minimalFields
        defaultForm={{ subtype: LINING_SUBTYPES[0], article: '', colour: '', thickness: '', size: '', qty_per_piece: '', sku_id: '', material_lot_id: '' }}
      />

      <MaterialCategorySection
        category="ACCESSORY" label="Accessories" accentColor="#7c3aed"
        lines={accessoryLines} styleId={styleId} token={token} showToast={showToast} canEdit={canEdit} onChanged={load} pieceCount={pieceCount}
        subtypes={ACCESSORY_SUBTYPES} showThickness={false}
        defaultForm={{ subtype: ACCESSORY_SUBTYPES[0], article: '', colour: '', size: '', qty_per_piece: '', sku_id: '', material_lot_id: '' }}
      />

      {canEdit && (
        <>
          <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
            <input value={copyFromInput} onChange={(e) => setCopyFromInput(e.target.value)} placeholder="Copy from style code/ID…" className="h-8 px-2 border rounded-lg font-bold text-xs flex-1 min-w-[10rem] mt-3" style={{ borderColor: 'rgba(200,131,74,0.3)' }} />
            <button onClick={handleCopyFrom} disabled={copying || !copyFromInput.trim()} className="h-8 px-3 rounded-lg font-black text-[11px] uppercase bg-white border text-slate-600 flex items-center gap-1.5 disabled:opacity-50 mt-3" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
              {copying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Copy className="w-3.5 h-3.5" />} Copy
            </button>
          </div>

          {accessoryLines.length === 0 && (
            <label className="flex items-center gap-2 text-[11px] font-bold text-slate-500 pt-1">
              <input type="checkbox" checked={noAccessories} onChange={(e) => setNoAccessories(e.target.checked)} className="w-3.5 h-3.5 accent-violet-600" />
              This style takes no accessories
            </label>
          )}

          <button onClick={handleConfirm} disabled={confirming || (accessoryLines.length === 0 && !noAccessories)} className="h-9 px-4 rounded-lg font-black text-[11px] uppercase text-white flex items-center gap-1.5 disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #7c3aed, #a78bfa)' }}>
            {confirming ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Confirm Material Spec
          </button>
        </>
      )}

      <div className="pt-2 border-t border-slate-100">
        <button onClick={toggleRequirement} className="flex items-center gap-1.5 text-[11px] font-black uppercase text-slate-500">
          {requirementOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />} Check Requirement vs Stock
        </button>
        {requirementOpen && (
          requirementLoading ? (
            <div className="pt-2 flex items-center gap-2 text-xs font-bold text-slate-400"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking stock…</div>
          ) : requirementLines.length === 0 ? (
            <p className="pt-2 text-xs font-bold text-slate-400 italic">No material lines to check yet.</p>
          ) : (
            <div className="pt-2 space-y-1.5">
              {requirementLines.map((l) => (
                <div key={l.spec_id || `${l.article}-${l.colour}-${l.size}`} className={`flex flex-wrap items-center gap-2 p-2 rounded-lg text-[11px] font-bold ${l.short_by > 0 ? 'bg-rose-50 border border-rose-200' : 'bg-emerald-50 border border-emerald-200'}`}>
                  <span className="font-mono text-slate-700">{l.article} {l.colour ? `· ${l.colour}` : ''} {l.size ? `· ${l.size}` : ''}</span>
                  <span className="text-slate-500">needs {l.total_required ?? l.pieces} {l.uom}</span>
                  <span className="text-slate-500">avail {l.available ?? l.lot?.available ?? 0}</span>
                  {l.short_by > 0 ? (
                    <>
                      <span className="text-rose-700">short {l.short_by}</span>
                      <button onClick={() => handleOrder(l)} disabled={orderingKey === (l.spec_id || l.article)} className="ml-auto h-7 px-2.5 rounded-lg font-black text-[10px] uppercase text-white flex items-center gap-1 disabled:opacity-50" style={{ background: '#c8834a' }}>
                        {orderingKey === (l.spec_id || l.article) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />} Order
                      </button>
                    </>
                  ) : (
                    <span className="ml-auto text-emerald-700">✓ covered</span>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Store Hub — item 2 ─────────────────────────

/**
 * Compact status readout reused inside Store Hub's post-scan panel — the
 * backend now returns a `kit` block on every LEATHER/LINING scan response
 * too, not just accessory scans, so the checklist rides every scan.
 */
export function KitStatusMini({ kit }) {
  if (!kit || kit.status === 'NOT_REQUIRED') return null;

  const style = {
    PENDING: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800', label: 'Accessory Kit — Pending' },
    PARTIAL: { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800', label: 'Accessory Kit — Partial' },
    ISSUED: { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-800', label: 'Accessory Kit — Issued' },
  }[kit.status] || { bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', label: 'Accessory Kit' };

  const unresolved = Array.isArray(kit.unresolved) ? kit.unresolved : [];
  const stockWarnings = Array.isArray(kit.stock_warnings) ? kit.stock_warnings : [];

  return (
    <div className={`mt-2 p-3 rounded-xl border ${style.bg} ${style.border} space-y-1`}>
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-black uppercase tracking-wider ${style.text}`}>{style.label}</span>
        {kit.status === 'ISSUED' && <CheckCircle2 className="w-4 h-4 text-violet-600" />}
      </div>
      {kit.summary_line && <p className="text-[11px] font-bold text-slate-600">{kit.summary_line}</p>}
      {unresolved.map((u, i) => (
        <p key={i} className="text-[10px] font-bold text-rose-700">⚠ {u.article ? `${u.article}: ` : ''}{u.reason || u.note || 'No stock lot resolves this line — issue it manually.'}</p>
      ))}
      {stockWarnings.map((w, i) => (
        <p key={i} className="text-[10px] font-bold text-amber-700">⚠ {typeof w === 'string' ? w : w.message}</p>
      ))}
    </div>
  );
}

/**
 * Third card in Store Hub's "Part Breakdown" grid, next to Leather/Lining.
 * Sourced from GET /barcode/resolve's `material_requirement` block (fetched
 * lazily when the drawer's own card is expanded) — self-hides when the
 * style needs no accessories (`kit_status: NOT_REQUIRED`) so existing
 * drawers render exactly as before.
 */
export function AccessoryKitCard({ drawer, token, employee, onIssued }) {
  const [issueAccessoryKit] = useIssueAccessoryKitMutation(); 
  const[loading, setLoading] = useState(true);
  const [requirement, setRequirement] = useState(null);
  const [issuing, setIssuing] = useState(false);
  const [error, setError] = useState('');
  const [triggerBarcodeResolve] = useLazyBarcodeResolveQuery();

  const load = useCallback(async () => {
    const code = drawer?.id || drawer?.drawer_code;
    if (!token || !code) { setLoading(false); return; }
    setLoading(true); setError('');
    try {
      const res = await triggerBarcodeResolve(code).unwrap();
      const req = res?.material_requirement || res?.drawer?.material_requirement || res?.piece?.material_requirement || null;
      setRequirement(req);
    } catch {
      // Not surfaced as an error — a failed lookup (e.g. a transient
      // network issue) should read the same as "no accessory kit for this
      // drawer," which is what the `!kitStatus` check below already
      // renders as nothing, keeping existing drawers looking unchanged.
      setRequirement(null);
    } finally {
      setLoading(false);
    }
  }, [token, drawer?.id, drawer?.drawer_code]);

  useEffect(() => { load(); }, [load]);

  const handleIssue = async (e) => {
    e.stopPropagation();
    setIssuing(true); setError('');
    try {
      await issueAccessoryKit({
        employee,
        drawerId: drawer.drawer_id || undefined,
        drawerBarcode: drawer.drawer_id ? undefined : drawer.id,
        pieceBarcode: drawer.piece_code || undefined,
      }).unwrap();
      await load();
      onIssued?.();
    } catch (e2) {
      setError(e2.message || 'Failed to issue kit.');
    } finally {
      setIssuing(false);
    }
  };

  if (loading) {
    return (
      <div className="p-3 rounded-xl border bg-slate-50 border-slate-200 flex items-center gap-2 text-[11px] font-bold text-slate-400">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking accessory kit…
      </div>
    );
  }

  const kitStatus = requirement?.kit_status;
  if (!kitStatus || kitStatus === 'NOT_REQUIRED') return null;

  const accessories = requirement?.accessories || [];
  const isIssued = kitStatus === 'ISSUED';
  const isPartial = kitStatus === 'PARTIAL';
  const cardClass = isIssued ? 'bg-violet-50 border-violet-300' : isPartial ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200';
  const StatusIcon = isIssued ? CheckCircle2 : isPartial ? AlertTriangle : XCircle;
  const statusColor = isIssued ? 'text-violet-600' : isPartial ? 'text-rose-600' : 'text-slate-300';
  const statusLabelColor = isIssued ? 'text-violet-700' : isPartial ? 'text-rose-700' : 'text-slate-400';

  return (
    <div className={`p-3 rounded-xl border space-y-1.5 ${cardClass}`}>
      <div className="flex items-center gap-2">
        <StatusIcon className={`w-4 h-4 shrink-0 ${statusColor}`} />
        <div className="text-[10px] font-black uppercase tracking-wider text-violet-700">Accessory Kit</div>
        <span className={`ml-auto text-[10px] font-black uppercase ${statusLabelColor}`}>{isIssued ? 'Issued' : isPartial ? 'Partial' : 'Pending'}</span>
      </div>
      {accessories.length > 0 ? (
        <div className="pl-6 overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="text-left text-slate-400 font-black uppercase text-[9px] tracking-wide">
                <th className="pb-1 pr-2 font-black">Item</th>
                <th className="pb-1 pr-2 font-black">Colour</th>
                <th className="pb-1 pr-2 font-black">Size</th>
                <th className="pb-1 pr-2 font-black text-right">Qty</th>
                <th className="pb-1 font-black text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {accessories.map((a, i) => {
                // Once issued, `outstanding` drops to 0 for every line — show
                // what was actually issued (or per-piece qty as a fallback)
                // instead of silently dropping the quantity from the row.
                const isOutstanding = a.outstanding > 0;
                const qty = isOutstanding ? a.outstanding : (a.issued_qty ?? a.qty_per_piece ?? 0);
                const unresolved = a.resolution === 'NONE' || a.resolution === 'AMBIGUOUS';
                return (
                  <tr key={a.spec_id || i} className={`border-t ${isIssued ? 'border-violet-200/70' : 'border-slate-200/70'} ${(a.short || unresolved) ? 'text-rose-700' : 'text-slate-600'}`}>
                    <td className="py-1 pr-2 font-bold">{a.subtype || a.article}{a.subtype && a.article !== a.subtype ? ` (${a.article})` : ''}</td>
                    <td className="py-1 pr-2">{a.colour || '—'}</td>
                    <td className="py-1 pr-2">{a.size || '—'}</td>
                    <td className="py-1 pr-2 text-right font-black">{qty} {a.uom || 'pcs'}</td>
                    <td className="py-1 text-right font-bold">{unresolved ? '⚠ no lot' : isOutstanding ? 'outstanding' : '✓ issued'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        requirement?.summary_line && <div className="text-[11px] font-bold text-slate-600 pl-6">{requirement.summary_line}</div>
      )}
      {error && <div className="text-[10px] font-black text-rose-600 pl-6">{error}</div>}
      <div className="pt-1">
        <button
          type="button"
          onClick={handleIssue}
          disabled={isIssued || issuing || !employee}
          title={!employee ? 'Scan & verify a worker ID above to unlock issuing the kit.' : ''}
          className="w-full h-8 rounded-lg font-black text-[11px] text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1.5 cursor-pointer"
        >
          {issuing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <PackageCheck className="w-3.5 h-3.5" />}
          {isIssued ? 'Kit Issued' : 'Issue Kit'}
        </button>
      </div>
    </div>
  );
}
