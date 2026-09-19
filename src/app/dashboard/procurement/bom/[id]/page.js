'use client';
import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, CheckCircle2, XCircle, Save, Loader2, AlertTriangle, FileDown, Lock, RotateCcw, PackageCheck, Info, AlertCircle } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiGetBom, apiPatchBomItems, apiConfirmCutting, apiApproveBom, apiRejectBom, apiReopenBom, apiExportBom } from '../../lib/api';

const CATEGORY_MAP = {
  'All': 'All Materials',
  main_material: 'Leather & Main',
  sub_material: 'Sub Materials',
  lining: 'Lining & Inner',
  thread: 'Threads',
  accessory: 'Hardware & Metals',
  manufacturing: 'Labor & Mfg',
  packaging: 'Packaging',
  fob_charge: 'Other Charges'
};

const getCategoryLabel = (key) => CATEGORY_MAP[key] || key;
const categories = ['All', 'main_material', 'sub_material', 'lining', 'thread', 'accessory', 'manufacturing', 'packaging', 'fob_charge'];

export default function BOMReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { token, user } = useAuth();
  const [bom, setBom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState('All');
  const [expandedItems, setExpandedItems] = useState({});
  const [drafts, setDrafts] = useState({});
  const [toast, setToast] = useState(null);
  const [reason, setReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState(false);

  const md = user === 'managing_director' || user === 'direct_manager';
  const cutting = ['cutting_manager', 'direct_manager', 'managing_director'].includes(user);

  const normalizeBom = (res, styleId) => {
    if (!res) return null;
    if (res.bom) {
      return {
        order_style_id: res.order_style_id || styleId,
        status: res.bom.status || res.status || 'ready',
        ...res.bom,
        items: res.bom.items || []
      };
    }
    if (Array.isArray(res)) {
      const totalCost = res.reduce((acc, item) => acc + Number(item.total_cost || 0), 0);
      return {
        order_style_id: styleId,
        items: res,
        status: 'ready_for_review',
        revision: 1,
        order_qty: 500,
        currency: 'USD',
        garment_fob_price: totalCost,
        bulk_total: totalCost
      };
    }
    if (res.data && Array.isArray(res.data)) return normalizeBom(res.data, styleId);
    return { ...res, items: res.items || res.bom_items || [] };
  };

  const load = async () => {
    setLoading(true);
    try {
      const raw = await apiGetBom(token, id);
      setBom(normalizeBom(raw, id));
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
          const raw = await apiGetBom(token, id);
          const fresh = normalizeBom(raw, id);
          if (fresh) {
            setBom(fresh);
            if (fresh.items?.length > 0 && fresh.status !== 'queued' && fresh.status !== 'processing') clearInterval(timer);
          }
        } catch (e) {}
      }, 5000);
    }
    return () => { if (timer) clearInterval(timer); };
  }, [id]);

  const rows = useMemo(() => bom?.items?.filter((i) => filter === 'All' || i.category === filter) || [], [bom, filter]);
  const toggleExpand = (itemId) => setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  const edit = (item, field, value) => setDrafts((d) => ({ ...d, [item.id]: { ...(d[item.id] || {}), [field]: value } }));

  const save = async () => {
    const edits = [];
    Object.entries(drafts).forEach(([itemId, d]) => Object.entries(d).forEach(([field, value]) => edits.push({ bom_item_id: itemId, field, value: Number(value) })));
    if (!edits.length) return;
    setSaving(true);
    try {
      const r = await apiPatchBomItems(token, id, { base_revision: bom.revision, edits });
      setBom(r.recomputed);
      setDrafts({});
      setToast({ type: r.reconfirm_required ? 'warn' : 'success', msg: r.reconfirm_required ? 'Usage changed after cutting confirmation. Re-confirm cutting required.' : 'Changes saved successfully!' });
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

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-[#c8834a]" /></div>;
  if (!bom) return <div className="p-12 text-center font-bold text-[#c8834a]">BOM not found.</div>;

  const hasDrafts = Object.keys(drafts).length > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-32">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-black text-amber-900/60 hover:text-[#c8834a] transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Intake
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Procurement · Phase 3</p>
          <h1 className="text-3xl font-black mt-1 text-[#2d1f0e]">Material Breakdown (BOM)</h1>
          <p className="text-xs text-amber-900/60 mt-1 font-medium">
            Order Style ID: <span className="font-mono text-amber-800 bg-amber-50 px-1 rounded">{bom.order_style_id || id}</span> · Revision {bom.revision || 1} · Order Qty: {bom.order_qty || 500} items
          </p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider ${bom.status === 'approved' ? 'bg-[#f0faeb] text-[#347526]' : bom.status === 'rejected' ? 'bg-[#faebeb] text-[#752626]' : 'bg-[#faf6f0] text-[#c8834a] border border-[#c8834a]/20'}`}>
            Status: {bom.status?.replace(/_/g, ' ')}
          </span>
          {bom.cutting_confirmed_at && <span className="px-4 py-2 rounded-xl bg-[#f0faeb] text-[#347526] text-xs font-black border border-[#347526]/20">Cutting Confirmed</span>}
        </div>
      </div>

      {toast && (
        <div className={`p-4 rounded-2xl text-xs font-black flex items-center justify-between ${toast.type === 'error' ? 'bg-[#faebeb] text-[#752626] border border-[#752626]/20' : toast.type === 'warn' ? 'bg-[#faf6f0] text-[#c8834a] border border-[#c8834a]/20' : 'bg-[#f0faeb] text-[#347526] border border-[#347526]/20'}`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast(null)} className="opacity-50 hover:opacity-100 transition-opacity">✕</button>
        </div>
      )}

      {bom.status === 'draft' && (
        <div className="p-4 rounded-2xl bg-[#faf6f0] border border-[#c8834a]/30 flex gap-3 text-xs text-[#c8834a]">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div><b className="font-black">Review Required.</b> Please verify the "Usage per Item" and "Unit Price" for all materials before sending to purchasing. Click any item card to edit its details.</div>
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-amber-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-2xl bg-[#faebeb] text-[#752626]">
                <XCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#752626]">Reject Bill of Materials</h3>
                <p className="text-xs text-slate-500 font-medium">Please provide a reason for rejection.</p>
              </div>
            </div>

            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="E.g., Leather usage is too high, please check again."
              className="w-full p-4 rounded-2xl bg-[#faf6f0] border border-amber-200/60 text-xs font-bold text-[#2d1f0e] outline-none focus:border-[#c8834a] min-h-[100px] resize-none"
            />

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (!reason.trim()) {
                    setToast({ type: 'error', msg: 'Please enter a rejection reason.' });
                    return;
                  }
                  setShowRejectModal(false);
                  action(() => apiRejectBom(token, id, reason), 'BOM rejected.');
                }}
                className="px-5 py-2.5 rounded-xl bg-[#752626] text-white text-xs font-black hover:bg-[#5a1c1c] transition-all shadow-md flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" /> Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top Metric Cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <Metric title="Cost per Item" value={`${bom.currency || 'USD'} ${Number(bom.garment_fob_price || 0).toFixed(2)}`} />
        <Metric title="Total Production Cost" value={`${bom.currency || 'USD'} ${Number(bom.bulk_total || 0).toFixed(2)}`} />
        <Metric title="Revision Version" value={bom.revision || 1} />
      </div>

      {/* Container matching old UI style but with cream aesthetics */}
      <SpotlightCard className="p-5 rounded-3xl bg-white border border-[#c8834a]/15" spotlightColor="rgba(200,131,74,.05)">
        
        {/* Category Filters */}
        <div className="flex flex-wrap gap-1.5 mb-6 pb-4 border-b border-[#c8834a]/10">
          {categories.map((c) => (
            <button 
              key={c} 
              onClick={() => setFilter(c)} 
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wide transition-all ${filter === c ? 'bg-[#c8834a] text-white shadow-md' : 'bg-[#faf6f0] text-[#c8834a]/70 hover:bg-[#c8834a]/10'}`}
            >
              {getCategoryLabel(c)}
            </button>
          ))}
        </div>

        {/* Grid of Items */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((item) => {
            const d = drafts[item.id] || {};
            const expanded = !!expandedItems[item.id];
            
            return (
              <div
                key={item.id}
                className={`p-4 rounded-2xl border transition-all ${expanded ? 'bg-[#faf6f0] border-[#c8834a]/40 shadow-sm' : 'bg-white border-[#c8834a]/15 hover:border-[#c8834a]/30 cursor-pointer'}`}
              >
                <div onClick={() => toggleExpand(item.id)} className="flex items-start justify-between gap-2 cursor-pointer">
                  <div>
                    <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-white text-[#c8834a] border border-[#c8834a]/20">
                      {getCategoryLabel(item.category)}
                    </span>
                    <h4 className="font-black text-sm text-[#2d1f0e] mt-2 leading-tight">{item.name}</h4>
                    <p className="text-[11px] font-medium text-amber-900/50 mt-0.5">{item.material_color || 'Standard Color'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-[#c8834a]">{bom.currency || 'USD'} {Number(d.unit_price ?? item.total_cost ?? 0).toFixed(2)}</p>
                    <button className="text-[9px] font-black uppercase tracking-wider text-[#c8834a]/60 hover:text-[#c8834a] mt-2 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-100">
                      {expanded ? '▲ Close' : '▼ Edit'}
                    </button>
                  </div>
                </div>

                {/* Expanded Content Details */}
                {expanded && (
                  <div className="mt-4 pt-3 border-t border-[#c8834a]/10 space-y-3 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                    <div className="grid grid-cols-2 gap-2 bg-white p-2.5 rounded-xl border border-[#c8834a]/10">
                      <div>
                        <label className="text-[9px] font-black uppercase text-amber-900/60 block mb-1">Usage per Item</label>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.001"
                            value={d.dcm ?? item.qty_per_garment}
                            disabled={['approved', 'locked'].includes(bom.status)}
                            onChange={(e) => edit(item, 'dcm', e.target.value)}
                            className="w-full pl-2 pr-6 py-1.5 rounded-lg border border-[#c8834a]/30 bg-[#faf6f0] font-black text-xs text-[#2d1f0e] outline-none focus:border-[#c8834a]"
                          />
                          <span className="absolute right-2 top-1.5 text-[9px] font-black text-amber-900/40">{item.uom || 'pcs'}</span>
                        </div>
                      </div>
                      <div>
                        <label className="text-[9px] font-black uppercase text-amber-900/60 block mb-1">Unit Price</label>
                        <div className="relative">
                          <span className="absolute left-2 top-1.5 text-[9px] font-black text-amber-900/40">{bom.currency || '$'}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={d.unit_price ?? item.unit_price}
                            disabled={['approved', 'locked'].includes(bom.status)}
                            onChange={(e) => edit(item, 'unit_price', e.target.value)}
                            className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-[#c8834a]/30 bg-[#faf6f0] font-black text-xs text-[#2d1f0e] outline-none focus:border-[#c8834a]"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-medium text-amber-900/70 bg-white/50 p-2 rounded-lg border border-[#c8834a]/5">
                      <span><b>Unit:</b> {item.uom || 'pcs'}</span>
                      <span><b>Total Required:</b> <span className="font-black text-[#c8834a]">{Number(item.bulk_qty || 0).toFixed(2)} {item.uom}</span></span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </SpotlightCard>

      {/* Sticky Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/90 backdrop-blur-xl border-t border-[#c8834a]/15 shadow-[0_-10px_40px_rgba(200,131,74,0.05)] z-40">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex-1 w-full sm:w-auto">
            {hasDrafts && (
              <p className="text-xs font-black text-[#c8834a] flex items-center gap-2">
                <AlertCircle className="w-4 h-4"/> You have unsaved changes.
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 w-full sm:w-auto">
            {hasDrafts && (
              <button onClick={save} disabled={saving} className="px-6 py-3 rounded-2xl bg-[#2d1f0e] text-white text-xs font-black shadow-lg hover:bg-[#1a1208] transition-all flex items-center gap-2">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Changes
              </button>
            )}

            {!hasDrafts && cutting && ['draft', 'ready_for_review'].includes(bom.status) && (
              <button onClick={() => action(() => apiConfirmCutting(token, id), 'Cutting confirmed!')} className="px-6 py-3 rounded-2xl bg-[#c8834a] text-white text-xs font-black hover:bg-[#b0703c] transition-all flex items-center gap-2 shadow-lg shadow-[#c8834a]/20">
                <PackageCheck className="w-4 h-4" /> Confirm Cutting
              </button>
            )}

            {!hasDrafts && md && (bom.status === 'ready_for_review' || bom.status === 'draft') && (
              <>
                <button
                  onClick={() => setShowRejectModal(true)}
                  className="px-5 py-3 rounded-2xl bg-[#faebeb] text-[#752626] border border-[#752626]/20 hover:bg-[#f5dada] text-xs font-black transition-all"
                >
                  Reject BOM
                </button>
                <button
                  onClick={() => action(() => apiApproveBom(token, id, false), 'BOM approved successfully!')}
                  className="px-6 py-3 rounded-2xl bg-[#c8834a] text-white text-xs font-black hover:bg-[#b0703c] shadow-lg shadow-[#c8834a]/20 transition-all flex items-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" /> Approve BOM
                </button>
              </>
            )}

            {!hasDrafts && bom.status === 'rejected' && md && (
              <button onClick={() => action(() => apiReopenBom(token, id), 'BOM reopened.')} className="px-6 py-3 rounded-2xl bg-[#faf6f0] text-[#c8834a] border border-[#c8834a]/30 text-xs font-black hover:bg-amber-50 transition-all flex items-center gap-2">
                <RotateCcw className="w-4 h-4" /> Reopen BOM
              </button>
            )}
            
            {!hasDrafts && md && (
              <button onClick={() => action(() => apiExportBom(token, id), 'Exporting...')} className="px-6 py-3 rounded-2xl bg-[#faf6f0] text-[#c8834a] border border-[#c8834a]/30 hover:bg-amber-50 transition-all text-xs font-black flex items-center gap-2">
                <FileDown className="w-4 h-4" /> Download PDF
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-[#c8834a]/15">
      <p className="text-[10px] font-black uppercase text-amber-900/50">{title}</p>
      <p className="text-xl font-black mt-1 text-[#2d1f0e]">{value}</p>
    </div>
  );
}
