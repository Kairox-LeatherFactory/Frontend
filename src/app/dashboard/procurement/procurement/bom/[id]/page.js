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
    if (id) load();
  }, [id]);

  const rows = useMemo(() => bom?.items?.filter((i) => filter === 'All' || i.category === filter) || [], [bom, filter]);
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
      <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-black text-slate-500">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Procurement · Stage 2/3</p>
          <h1 className="text-3xl font-black mt-1" style={{ color: '#2d1f0e' }}>BOM Review</h1>
          <p className="text-xs text-slate-500 mt-1">Revision {bom.revision} · Order qty {bom.order_qty} · Currency {bom.currency}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <span className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-black uppercase">{bom.status}</span>
          {bom.cutting_confirmed_at && <span className="px-3 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-black">Cutting confirmed</span>}
        </div>
      </div>

      {toast && (
        <div className={`p-3 rounded-xl text-xs font-bold ${toast.type === 'error' ? 'bg-red-50 text-red-700' : toast.type === 'warn' ? 'bg-amber-50 text-amber-800' : 'bg-green-50 text-green-700'}`}>
          {toast.msg}
        </div>
      )}

      {bom.status === 'draft' && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex gap-3 text-xs text-amber-900">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div><b>Human-in-the-loop gate.</b> Low-confidence DCM values should be checked at cutting. Editing a quantity stamps <b>manual · 100%</b> and server-recomputes the BOM.</div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        <Metric title="Garment FOB" value={`${bom.currency} ${Number(bom.garment_fob_price).toFixed(2)}`} />
        <Metric title="Bulk total" value={`${bom.currency} ${Number(bom.bulk_total).toFixed(2)}`} />
        <Metric title="Revision" value={bom.revision} />
      </div>

      <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}>
        <div className="flex flex-wrap gap-2 mb-4">
          {categories.map((c) => (
            <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black ${filter === c ? 'bg-[#2d1f0e] text-white' : 'bg-slate-100 text-slate-600'}`}>
              {c}
            </button>
          ))}
        </div>

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
                    <td>{Number(item.bulk_qty).toFixed(3)}</td>
                    <td>{Number(item.total_cost).toFixed(2)}</td>
                    <td>
                      <span className={`px-2 py-1 rounded-full text-[9px] font-black ${item.dcm_confidence != null && item.dcm_confidence < 0.7 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-600'}`}>{sourceLabel(item)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {Object.keys(drafts).length > 0 && (
          <div className="mt-4 flex justify-end">
            <button onClick={save} disabled={saving} className="px-4 py-2 rounded-xl bg-[#2d1f0e] text-white text-xs font-black">
              {saving ? <Loader2 className="w-3 h-3 animate-spin inline mr-2" /> : <Save className="w-3 h-3 inline mr-2" />}
              Save changes
            </button>
          </div>
        )}
      </SpotlightCard>

      <div className="flex flex-wrap gap-2 justify-end">
        {cutting && ['draft', 'ready_for_review'].includes(bom.status) && (
          <button onClick={() => action(() => apiConfirmCutting(token, id), 'Cutting confirmed; MD review is now enabled.')} className="px-4 py-2.5 rounded-xl bg-[#c8834a] text-white text-xs font-black">
            <PackageCheck className="w-4 h-4 inline mr-2" />
            Confirm Cutting
          </button>
        )}
        {md && bom.status === 'ready_for_review' && (
          <>
            <button onClick={() => { if (!reason.trim()) { setToast({ type: 'error', msg: 'Enter a rejection reason first.' }); return; } action(() => apiRejectBom(token, id, reason), 'BOM rejected.'); }} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 text-xs font-black">
              <XCircle className="w-4 h-4 inline mr-2" />
              Reject
            </button>
            <button onClick={() => action(() => apiApproveBom(token, id, false), 'BOM approved; inventory check is available.')} className="px-4 py-2.5 rounded-xl bg-green-600 text-white text-xs font-black">
              <CheckCircle2 className="w-4 h-4 inline mr-2" />
              Approve BOM
            </button>
          </>
        )}
        {bom.status === 'rejected' && md && (
          <button onClick={() => action(() => apiReopenBom(token, id), 'BOM reopened. Cutting confirmation must be repeated.')} className="px-4 py-2.5 rounded-xl bg-amber-100 text-amber-800 text-xs font-black">
            <RotateCcw className="w-4 h-4 inline mr-2" />
            Reopen
          </button>
        )}
        {md && (
          <button onClick={() => action(() => apiExportBom(token, id), 'BOM PDF export created.')} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-black">
            <FileDown className="w-4 h-4 inline mr-2" />
            Export PDF
          </button>
        )}
        {['approved', 'locked'].includes(bom.status) && (
          <button onClick={() => router.push(`/dashboard/procurement/procurement/inventory?bom_id=${id}`)} className="px-4 py-2.5 rounded-xl border text-xs font-black">
            Inventory Check →
          </button>
        )}
      </div>

      {bom.status === 'ready_for_review' && md && (
        <div className="flex items-center gap-2">
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Rejection reason (only needed for Reject)" className="flex-1 px-3 py-2 rounded-xl border text-xs" />
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
