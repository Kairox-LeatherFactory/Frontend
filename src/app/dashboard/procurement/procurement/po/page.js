'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, ShoppingCart, Search, CheckCircle2, Clock, AlertTriangle, Send, UserCheck, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiGetPOs, apiGetSuppliers, apiPatchPOItems, apiSubmitPO, apiApprovePO, apiSendPO, apiAcknowledgePO } from '../../lib/api';

const statusStyle = { draft: 'bg-slate-100 text-slate-700', pending_approval: 'bg-amber-100 text-amber-800', approved: 'bg-green-100 text-green-700', sent: 'bg-blue-100 text-blue-700', confirmed: 'bg-emerald-100 text-emerald-700', rejected: 'bg-red-100 text-red-700' };

export default function POPage() {
  const { token, user } = useAuth();
  const [pos, setPos] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(null);
  const [search, setSearch] = useState('');
  const [msg, setMsg] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await apiGetPOs(token, filter === 'needs' ? { needs_supplier: true } : {});
      setPos(r.purchase_orders);
      setSuppliers((await apiGetSuppliers(token)).suppliers);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filter, token]);

  const act = async (id, fn, success) => {
    setBusy(id);
    try {
      await fn();
      setMsg(success);
      await load();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setBusy(null);
    }
  };

  const assign = async (po, supplierId) => act(po.id, () => apiPatchPOItems(token, po.id, { base_revision: po.revision, po_edits: { supplier_id: supplierId } }), 'Supplier assigned. Approval route recalculated.');
  const visible = pos.filter((p) => !search || JSON.stringify(p).toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Link href="/dashboard/procurement/procurement/inventory" className="flex items-center gap-2 text-xs font-black text-slate-500">
        <ArrowLeft className="w-4 h-4" /> Back to Inventory
      </Link>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Procurement · Stage 5</p>
          <h1 className="text-3xl font-black mt-1">Supplier Purchase Orders</h1>
          <p className="text-xs text-slate-500 mt-1">API-contract mock with supplier matching, approval routing and confirmation.</p>
        </div>
        <div className="flex gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search POs..." className="h-10 pl-9 pr-3 rounded-xl border text-xs" />
          </div>
          <button onClick={load} className="h-10 px-3 rounded-xl border">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-2 rounded-xl text-xs font-black ${filter === 'all' ? 'bg-[#2d1f0e] text-white' : 'bg-slate-100'}`}>
          All
        </button>
        <button onClick={() => setFilter('needs')} className={`px-3 py-2 rounded-xl text-xs font-black ${filter === 'needs' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700'}`}>
          Needs supplier
        </button>
      </div>

      {msg && <div className="p-3 rounded-xl bg-slate-100 text-xs font-bold">{msg}</div>}

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#c8834a]" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-5">
          {visible.map((po) => (
            <POCard key={po.id} po={po} suppliers={suppliers} user={user} busy={busy === po.id} onAssign={assign} onAction={act} />
          ))}
        </div>
      )}
    </div>
  );
}

function POCard({ po, suppliers, user, busy, onAssign, onAction }) {
  const [supplier, setSupplier] = useState(po.supplier_id || '');
  const [ack, setAck] = useState(false);
  const canApprove = ['managing_director', 'direct_manager', 'cutting_manager', 'hr'].includes(user);

  return (
    <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: `1px solid ${po.needs_supplier ? 'rgba(220,38,38,.25)' : 'rgba(200,131,74,.15)'}` }}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono text-slate-400">{po.id}</p>
          <h3 className="font-black text-lg mt-1">{po.po_number || 'Draft PO'}</h3>
          <p className="text-xs text-slate-500">{po.supplier?.name || 'No supplier assigned'} · {po.buyer_ref}</p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-[9px] font-black ${statusStyle[po.status] || 'bg-slate-100'}`}>{po.status}</span>
      </div>

      {po.needs_supplier && (
        <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200">
          <p className="text-xs font-black text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Too close to call — choose a supplier
          </p>
          <div className="mt-3 space-y-2">
            {po.candidates?.ranked?.map((c) => (
              <div key={c.supplier_id} className="flex items-center justify-between p-2 rounded-lg bg-white border text-[10px]">
                <div>
                  <b>{c.supplier_name}</b>
                  <div className="text-slate-400">Score {c.score} · {c.txn_count} transactions · last rate {c.last_rate}</div>
                </div>
                <button onClick={() => { setSupplier(c.supplier_id); onAssign(po, c.supplier_id); }} disabled={busy} className="px-2 py-1 rounded-lg bg-[#2d1f0e] text-white font-black">
                  Choose
                </button>
              </div>
            ))}
          </div>
          <select value={supplier} onChange={(e) => setSupplier(e.target.value)} className="mt-2 w-full p-2 rounded-lg border text-xs">
            <option value="">Select supplier…</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      )}

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400 border-b">
              <th className="py-2">Item</th>
              <th>Qty</th>
              <th>Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            {po.items.map((i) => (
              <tr key={i.id} className="border-b last:border-0">
                <td className="py-2 font-bold">
                  {i.description}
                  <div className="text-[9px] text-slate-400">{i.color} · {i.uom}</div>
                </td>
                <td>{i.qty}</td>
                <td>{i.unit_price}</td>
                <td className="font-black">{Number(i.amount).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-slate-50">
          <p className="text-[9px] text-slate-400">Subtotal</p>
          <b className="text-xs">₹{po.subtotal}</b>
        </div>
        <div className="p-2 rounded-lg bg-slate-50">
          <p className="text-[9px] text-slate-400">Tax</p>
          <b className="text-xs">₹{Number(po.cgst + po.sgst + po.igst).toFixed(2)}</b>
        </div>
        <div className="p-2 rounded-lg bg-slate-50">
          <p className="text-[9px] text-slate-400">Total</p>
          <b className="text-xs">₹{po.total}</b>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        {po.status === 'draft' && po.supplier_id && (
          <button onClick={() => onAction(po.id, () => apiSubmitPO(undefined, po.id), 'PO submitted for routed approval.')} disabled={busy} className="px-3 py-2 rounded-xl bg-amber-100 text-amber-800 text-xs font-black">
            Submit
          </button>
        )}
        {po.status === 'pending_approval' && canApprove && (
          <button onClick={() => onAction(po.id, () => apiApprovePO(undefined, po.id), 'PO approved.')} disabled={busy} className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-black">
            <CheckCircle2 className="w-3 h-3 inline mr-1" />
            Approve
          </button>
        )}
        {po.status === 'approved' && (
          <button onClick={() => onAction(po.id, () => apiSendPO(undefined, po.id), 'PO sent to supplier; escalation clock started.')} disabled={busy} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-xs font-black">
            <Send className="w-3 h-3 inline mr-1" />
            Send
          </button>
        )}
        {po.status === 'sent' && !ack && (
          <button onClick={() => setAck(true)} className="px-3 py-2 rounded-xl border text-xs font-black">
            <UserCheck className="w-3 h-3 inline mr-1" />
            Record confirmation
          </button>
        )}
        {ack && po.status === 'sent' && (
          <button onClick={() => onAction(po.id, () => apiAcknowledgePO(undefined, po.id, { channel: 'call', confirmed_qty: po.items.reduce((a, i) => a + i.qty, 0), notes: 'Confirmed manually in demo' }), 'Supplier confirmation recorded; escalation stopped.')} className="px-3 py-2 rounded-xl bg-green-600 text-white text-xs font-black">
            Confirm by call
          </button>
        )}
      </div>

      {po.status === 'sent' && (
        <div className="mt-3 text-[10px] text-slate-500 flex items-center gap-2">
          <Clock className="w-3 h-3" /> Current rung: {po.current_rung} · Next escalation: {po.next_escalation_at ? new Date(po.next_escalation_at).toLocaleString() : '—'}
        </div>
      )}
    </SpotlightCard>
  );
}
