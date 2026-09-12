'use client';
import { useEffect, useState } from 'react';
import { ArrowLeft, Factory, CheckCircle2, Play, Loader2, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiGetProductionTracking, apiTransitionTracking } from '../../lib/api';

const rungs = ['awaiting_bom', 'bom_approved', 'inventory_checked', 'po_raised', 'po_confirmed', 'material_ready', 'released_to_production', 'in_production', 'completed'];

export default function ProductionBoard() {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    setRows((await apiGetProductionTracking(token)).trackers);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, [token]);

  const release = async (t) => {
    setBusy(t.id);
    try {
      await apiTransitionTracking(token, t.id, 'released_to_production');
      await load();
    } catch (e) {
      alert(e.message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      <Link href="/dashboard/procurement" className="flex items-center gap-2 text-xs font-black text-slate-500">
        <ArrowLeft className="w-4 h-4" /> Procurement
      </Link>

      <div className="flex justify-between items-end">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Procurement · Production Bridge</p>
          <h1 className="text-3xl font-black mt-1 flex items-center gap-2">
            <Factory className="w-7 h-7 text-[#c8834a]" /> Production Board
          </h1>
          <p className="text-xs text-slate-500 mt-1">Nine-rung state machine. Release is a deliberate human go/no-go before Phase 1 takes over.</p>
        </div>
        <button onClick={load} className="p-2 rounded-xl border">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center">
          <Loader2 className="w-7 h-7 animate-spin mx-auto text-[#c8834a]" />
        </div>
      ) : (
        <div className="space-y-5">
          {rows.map((t) => {
            const idx = rungs.indexOf(t.status);
            return (
              <SpotlightCard key={t.id} className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}>
                <div className="flex flex-col xl:flex-row xl:items-center gap-5">
                  <div className="w-56 shrink-0">
                    <p className="text-[10px] text-slate-400 font-mono">{t.order_number}</p>
                    <h3 className="font-black text-lg">{t.style_name}</h3>
                    <p className="text-xs text-slate-500">{t.client_name}</p>
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-1">
                      {rungs.map((r, i) => (
                        <div key={r} title={r} className={`h-2 flex-1 rounded-full ${i <= idx ? 'bg-[#c8834a]' : 'bg-slate-100'}`} />
                      ))}
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] font-bold text-slate-400">
                      <span>{rungs[0]}</span>
                      <span className="text-[#c8834a] uppercase">{t.status}</span>
                      <span>{rungs[rungs.length - 1]}</span>
                    </div>
                  </div>
                  <div className="text-xs font-bold text-slate-500">POs {t.po_confirmed_count}/{t.po_count}</div>
                  {t.status === 'material_ready' && (
                    <button onClick={() => release(t)} disabled={busy === t.id} className="px-4 py-2.5 rounded-xl bg-[#2d1f0e] text-white text-xs font-black">
                      {busy === t.id ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : <Play className="w-4 h-4 inline mr-2" />}
                      Release to Production
                    </button>
                  )}
                  {t.status === 'released_to_production' && (
                    <span className="px-3 py-2 rounded-xl bg-green-100 text-green-700 text-xs font-black">
                      <CheckCircle2 className="w-4 h-4 inline mr-1" /> Released
                    </span>
                  )}
                </div>
              </SpotlightCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
