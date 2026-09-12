'use client';
import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, PackageSearch, ShoppingCart, Loader2 } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiGetBom, apiGetInventoryCheck, apiRunInventoryCheck, apiGeneratePOs } from '../../lib/api';

const badge = { sufficient: 'bg-green-100 text-green-700', partial: 'bg-amber-100 text-amber-700', out_of_stock: 'bg-red-100 text-red-700' };

export default function InventoryPage() {
  const params = useSearchParams();
  const router = useRouter();
  const { token } = useAuth();
  const bomId = params.get('bom_id');
  const [bom, setBom] = useState(null);
  const [check, setCheck] = useState(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [msg, setMsg] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const id = bomId || '11223344-5566-7788-99aa-bbccddeeff00';
        setBom(await apiGetBom(token, id));
        try {
          setCheck(await apiGetInventoryCheck(token, 'cc001122-3344-5566-7788-99aabbccddee'));
        } catch {}
      } catch (e) {
        setMsg(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [bomId, token]);

  const run = async () => {
    setRunning(true);
    try {
      const c = await apiRunInventoryCheck(token, bom.id);
      setCheck(c);
      setMsg('Inventory check completed. Reservations and shortfalls are now visible.');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setRunning(false);
    }
  };

  const generate = async () => {
    setGenerating(true);
    try {
      await apiGeneratePOs(token, bom.id);
      router.push('/dashboard/procurement/procurement/po');
    } catch (e) {
      setMsg(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) return <div className="p-12 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-[#c8834a]" /></div>;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-black text-slate-500">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Procurement · Stage 4</p>
          <h1 className="text-3xl font-black mt-1">Inventory Check</h1>
          <p className="text-xs text-slate-500 mt-1">{bom?.id} · {bom?.status} · order qty {bom?.order_qty}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={run} disabled={running || !['approved', 'locked', 'exported'].includes(bom?.status)} className="px-4 py-2.5 rounded-xl border text-xs font-black disabled:opacity-40">
            <RefreshCw className={`w-4 h-4 inline mr-2 ${running ? 'animate-spin' : ''}`} />
            Run / Re-run
          </button>
          {check && (
            <button onClick={generate} disabled={generating || check.summary?.badge === 'sufficient'} className="px-4 py-2.5 rounded-xl bg-[#2d1f0e] text-white text-xs font-black disabled:opacity-40">
              {generating ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <ShoppingCart className="w-4 h-4 inline mr-2" />}
              Generate POs
            </button>
          )}
        </div>
      </div>

      {msg && <div className="p-3 rounded-xl bg-slate-100 text-xs font-bold">{msg}</div>}

      {!check ? (
        <SpotlightCard className="p-8 text-center bg-white rounded-3xl">
          <PackageSearch className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <p className="font-black">No stored inventory check yet</p>
          <p className="text-xs text-slate-500 mt-1">Approve the BOM, then run the check.</p>
        </SpotlightCard>
      ) : (
        <>
          <div className="grid md:grid-cols-4 gap-4">
            <Metric title="Badge" value={check.summary.badge} />
            <Metric title="Sufficient" value={check.summary.sufficient} />
            <Metric title="Partial" value={check.summary.partial} />
            <Metric title="Out of stock" value={check.summary.out_of_stock} />
          </div>

          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-xs text-red-800 flex gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0" />
            <div>
              <b>Shortfall value: INR {Number(check.summary.shortfall_value).toFixed(2)}</b>
              <br />Shortfall quantity is exactly what Stage 5 will order. Fuzzy suggestions are advisory only.
            </div>
          </div>

          <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-black">Stockable lines</h2>
              <span className="text-[10px] text-slate-400">Run at {new Date(check.run_at).toLocaleString()}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-[10px] uppercase text-slate-400 border-b">
                    <th className="py-3">Material</th>
                    <th>Required</th>
                    <th>Available</th>
                    <th>Reserved</th>
                    <th>Shortfall</th>
                    <th>Status</th>
                    <th>Match</th>
                  </tr>
                </thead>
                <tbody>
                  {check.lines.map((l) => (
                    <tr key={l.bom_item_id} className="border-b last:border-0">
                      <td className="py-3">
                        <b>{l.name}</b>
                        <div className="text-[10px] text-slate-400">{l.material_color || ''} · {l.uom || '—'}</div>
                        {l.suggestion && <div className="text-[10px] text-blue-700 mt-1">Suggestion: {l.suggestion.description} ({Math.round(l.suggestion.score * 100)}%)</div>}
                      </td>
                      <td>{l.required_qty}</td>
                      <td>{l.available_qty}</td>
                      <td>{l.reserved_for_this_bom}</td>
                      <td className="font-black">{l.shortfall_qty}</td>
                      <td>
                        <span className={`px-2 py-1 rounded-full text-[9px] font-black ${badge[l.status] || 'bg-slate-100'}`}>{l.status}</span>
                      </td>
                      <td>{l.matched?.method || 'unmatched'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <p className="text-[10px] font-black uppercase text-slate-400 mb-2">Excluded from stock check</p>
              {check.excluded.map((x) => (
                <span key={x.bom_item_id} className="inline-block mr-2 mb-2 px-2 py-1 rounded-lg bg-slate-100 text-[10px] font-bold text-slate-500">
                  {x.name} · {x.category}
                </span>
              ))}
            </div>
          </SpotlightCard>
        </>
      )}
    </div>
  );
}

function Metric({ title, value }) {
  return (
    <div className="p-4 rounded-2xl bg-white border border-slate-200">
      <p className="text-[10px] font-black uppercase text-slate-400">{title}</p>
      <p className="text-xl font-black mt-1 capitalize">{value}</p>
    </div>
  );
}
