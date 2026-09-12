'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Save, Loader2, AlertTriangle, FileDown, Lock, RotateCcw, PackageCheck } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiGetBom, apiPatchBomItems, apiConfirmCutting, apiApproveBom, apiRejectBom, apiReopenBom, apiExportBom } from '../../../lib/api';

const categories = ['All', 'main_material', 'sub_material', 'lining', 'thread', 'accessory', 'manufacturing', 'packaging', 'fob_charge'];
const sourceLabel = (s) => (s ? `${s.dcm_source} · ${Math.round((s.dcm_confidence || 0) * 100)}%` : '—');

export default function BOMReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');
  const [viewMode, setViewMode] = useState('grid');
  const [expandedItems, setExpandedItems] = useState({});
  const [drafts, setDrafts] = useState({});
  const [toast, setToast] = useState(null);
  const [reason, setReason] = useState('');

  const md = user === 'managing_director' || user === 'direct_manager';
  const cutting = ['cutting_manager', 'direct_manager', 'managing_director'].includes(user);

  const load = async () => {
    setLoading(true);
    try {
      setBom(await apiGetBom(token, id));
    } catch (e) {
      setToast({ type: 'error', msg: e.message });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let timer = null;
    if (id) {
      load();
      timer = setInterval(async () => {
        try {
          const fresh = await apiGetBom(token, id);
          if (fresh) {
            setBom(fresh);
            if (fresh.items?.length > 0 && fresh.status !== 'queued' && fresh.status !== 'processing') {
              clearInterval(timer);
            }
          }
        } catch (e) {}
      }, 5000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [id]);

  const rows = useMemo(() => bom?.items?.filter((i) => filter === 'All' || i.category === filter) || [], [bom, filter]);
  const edit = (item, field, value) => setDrafts((d) => ({ ...d, [item.id]: { ...(d[item.id] || {}), [field]: value } }));

  const toggleExpand = (itemId) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  const save = async () => {
    const edits = [];
    Object.entries(drafts).forEach(([itemId, d]) => Object.entries(d).forEach(([field, value]) => edits.push({ bom_item_id: itemId, field, value: Number(value) })));
    if (!edits.length) return;
    setSaving(true);
    try {
      const r = await apiPatchBomItems(token, id, { base_revision: bom.revision, edits });
      setBom(r.recomputed);
      setDrafts({});
      setToast({ type: r.reconfirm_required ? 'warn' : 'success', msg: r.reconfirm_required ? 'Quantity changed after cutting confirmation. Re-confirm cutting.' : 'BOM updated; server recomputed totals.' });
    } catch (e) {
      setToast({ type: 'error', msg: e.message });
      if (e.status === 409) await load();
    } finally {
      setSaving(false);
    }
  };

  const action = async (fn, msg) => {
    try {
      const r = await fn();
      setToast({ type: 'success', msg });
      if (r?.status) await load();
      return r;
    } catch (e) {
      setToast({ type: 'error', msg: e.message });
      await load();
    }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-[#c8834a]" /></div>;
  if (!bom) return <div className="p-12 text-center font-bold">BOM not found.</div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-black text-slate-500 hover:text-[#2d1f0e]">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Procurement · Stage 2/3</p>
          <h1 className="text-3xl font-black mt-1" style={{ color: '#2d1f0e' }}>BOM Review & Approval</h1>
          <p className="text-xs text-slate-500 mt-1">
            Style / Order Style ID: <span className="font-mono text-amber-800">{bom.order_style_id || id}</span> · Revision {bom.revision} · Order Qty {bom.order_qty}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className={`px-3 py-2 rounded-xl text-xs font-black uppercase ${bom.status === 'approved' ? 'bg-green-100 text-green-700' : bom.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-800'}`}>
            Status: {bom.status}
          </span>
          {bom.cutting_confirmed_at && <span className="px-3 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-black">Cutting Confirmed</span>}
        </div>
      </div>

      {toast && (
        <div className={`p-3.5 rounded-xl text-xs font-bold flex items-center justify-between ${toast.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : toast.type === 'warn' ? 'bg-amber-50 text-amber-800 border border-amber-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 font-black ml-2">✕</button>
        </div>
      )}

      {bom.status === 'draft' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0 text-amber-600" />
          <div><b>Human-in-the-loop gate.</b> Check DCM values at cutting. Click any item card to expand and edit DCM / Unit Price values.</div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Metric title="Garment FOB" value={`${bom.currency} ${Number(bom.garment_fob_price || 0).toFixed(2)}`} />
        <Metric title="Bulk Total" value={`${bom.currency} ${Number(bom.bulk_total || 0).toFixed(2)}`} />
        <Metric title="Revision" value={bom.revision} />
      </div>

      <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}>
        {/* Header Controls: Filters + View Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${filter === c ? 'bg-[#2d1f0e] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                {c}
              </button>
            ))}
          </div>

          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${viewMode === 'grid' ? 'bg-white text-[#2d1f0e] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Grid View
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded-lg text-[10px] font-black transition-all ${viewMode === 'table' ? 'bg-white text-[#2d1f0e] shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
            >
              Table View
            </button>
          </div>
        </div>

        {/* View Mode 1: Grid Cards with Click to Expand */}
        {viewMode === 'grid' ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {rows.map((item) => {
              const d = drafts[item.id] || {};
              const expanded = !!expandedItems[item.id];
              return (
                <div
                  key={item.id}
                  className={`p-4 rounded-2xl border transition-all ${expanded ? 'bg-[#fff9f0] border-[#c8834a]/60 shadow-md' : 'bg-white border-slate-200 hover:border-[#c8834a]/40 cursor-pointer'}`}
                >
                  <div onClick={() => toggleExpand(item.id)} className="flex items-start justify-between gap-2 cursor-pointer">
                    <div>
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
                        {item.category}
                      </span>
                      <h4 className="font-black text-sm text-[#2d1f0e] mt-1.5">{item.name}</h4>
                      <p className="text-[11px] text-slate-500">{item.material_color || 'Standard Color'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-[#c8834a]">{bom.currency} {Number(d.unit_price ?? item.total_cost ?? 0).toFixed(2)}</p>
                      <button className="text-[10px] font-bold text-amber-800 underline mt-1">
                        {expanded ? '▲ Collapse' : '▼ Click to Expand'}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Content Details */}
                  {expanded && (
                    <div className="mt-4 pt-3 border-t border-amber-200/60 space-y-3 text-xs animate-fade-in" onClick={(e) => e.stopPropagation()}>
                      <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-slate-100">
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">DCM / Qty per garment</label>
                          <input
                            type="number"
                            step="0.001"
                            value={d.dcm ?? item.qty_per_garment}
                            disabled={['approved', 'locked'].includes(bom.status)}
                            onChange={(e) => edit(item, 'dcm', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-amber-200 bg-[#faf6f0] font-bold text-xs outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[9px] font-black uppercase text-slate-400 block mb-1">Unit Price ({bom.currency})</label>
                          <input
                            type="number"
                            step="0.01"
                            value={d.unit_price ?? item.unit_price}
                            disabled={['approved', 'locked'].includes(bom.status)}
                            onChange={(e) => edit(item, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1.5 rounded-lg border border-amber-200 bg-[#faf6f0] font-bold text-xs outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-600 bg-slate-50 p-2.5 rounded-xl">
                        <div><b>UOM:</b> {item.uom || 'pcs'}</div>
                        <div><b>Bulk Qty:</b> {Number(item.bulk_qty || 0).toFixed(3)}</div>
                        <div className="col-span-2 flex items-center justify-between mt-1">
                          <span>Confidence / Source:</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-black ${item.dcm_confidence != null && item.dcm_confidence < 0.7 ? 'bg-red-100 text-red-700' : 'bg-slate-200 text-slate-700'}`}>
                            {sourceLabel(item)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          /* View Mode 2: Table View */
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs">
              <thead>
                <tr className="text-left text-[10px] uppercase text-slate-400 border-b">
                  <th className="py-3 pr-4">Item</th>
                  <th>Category</th>
                  <th>DCM / Qty</th>
                  <th>UOM</th>
                  <th>Unit price</th>
                  <th>Bulk qty</th>
                  <th>Cost</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => {
                  const d = drafts[item.id] || {};
                  return (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <b>{item.name}</b>
                        <div className="text-[10px] text-slate-400">{item.material_color || '—'}</div>
                      </td>
                      <td>{item.category}</td>
                      <td>
                        <input type="number" step="0.001" value={d.dcm ?? item.qty_per_garment} disabled={['approved', 'locked'].includes(bom.status)} onChange={(e) => edit(item, 'dcm', e.target.value)} className="w-24 px-2 py-1.5 rounded-lg border font-bold" />
                      </td>
                      <td>{item.uom || '—'}</td>
                      <td>
                        <input type="number" step="0.01" value={d.unit_price ?? item.unit_price} disabled={['approved', 'locked'].includes(bom.status)} onChange={(e) => edit(item, 'unit_price', e.target.value)} className="w-24 px-2 py-1.5 rounded-lg border font-bold" />
                      </td>
                      <td>{Number(item.bulk_qty || 0).toFixed(3)}</td>
                      <td>{Number(item.total_cost || 0).toFixed(2)}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black ${item.dcm_confidence != null && item.dcm_confidence < 0.7 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{sourceLabel(item)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {Object.keys(drafts).length > 0 && (
          <div className="mt-5 flex justify-end">
            <button onClick={save} disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#2d1f0e] text-white text-xs font-black shadow-md hover:bg-[#3d2b1a] transition-all">
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-2" /> : <Save className="w-3.5 h-3.5 inline mr-2" />}
              Save changes
            </button>
          </div>
        )}
      </SpotlightCard>

      {/* Action Buttons: Confirm Cutting, Approve BOM, Reject BOM, Reopen BOM, Export */}
      <div className="flex flex-wrap gap-2 justify-end items-center">
        {cutting && ['draft', 'ready_for_review'].includes(bom.status) && (
          <button onClick={() => action(() => apiConfirmCutting(token, id), 'Cutting confirmed; MD review is now enabled.')} className="px-4 py-2.5 rounded-xl bg-[#c8834a] text-white text-xs font-black hover:bg-[#b0703c]">
            <PackageCheck className="w-4 h-4 inline mr-2" />
            Confirm Cutting
          </button>
        )}

        {md && (bom.status === 'ready_for_review' || bom.status === 'draft') && (
          <>
            <button
              onClick={() => {
                if (!reason.trim()) {
                  setToast({ type: 'error', msg: 'Please enter a rejection reason below.' });
                  return;
                }
                action(() => apiRejectBom(token, id, reason), 'BOM rejected.');
              }}
              className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 text-xs font-black"
            >
              <XCircle className="w-4 h-4 inline mr-2" />
              Reject BOM
            </button>
            <button
              onClick={() => action(() => apiApproveBom(token, id, false), 'BOM approved successfully!')}
              className="px-5 py-2.5 rounded-xl bg-green-600 text-white text-xs font-black hover:bg-green-700 shadow-md"
            >
              <CheckCircle2 className="w-4 h-4 inline mr-2" />
              Approve BOM (POST /procurement/boms/{id}/approve)
            </button>
          </>
        )}

        {bom.status === 'rejected' && md && (
          <button onClick={() => action(() => apiReopenBom(token, id), 'BOM reopened.')} className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-black hover:bg-amber-200">
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Reopen BOM (POST /procurement/boms/{id}/reopen)
          </button>
        )}

        {md && (
          <button onClick={() => action(() => apiExportBom(token, id), 'BOM PDF export created.')} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black hover:bg-slate-800">
            <FileDown className="w-4 h-4 inline mr-2" />
            Export PDF
          </button>
        )}
      </div>

      {(bom.status === 'ready_for_review' || bom.status === 'draft') && md && (
        <div className="flex items-center gap-2">
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Rejection reason (only required when clicking Reject BOM)"
            className="flex-1 px-3.5 py-2.5 rounded-xl border border-amber-200 text-xs font-bold text-[#2d1f0e] bg-white outline-none focus:border-[#c8834a]"
          />
          <Lock className="w-4 h-4 text-slate-300" />
        </div>
      )}
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200">
      <p className="text-[10px] font-black uppercase text-slate-400">{title}</p>
      <p className="text-xl font-black mt-1">{value}</p>
    </div>
  );
}
