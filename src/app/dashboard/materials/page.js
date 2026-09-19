'use client';
import { useState,useCallback} from 'react';
import { useAuth } from '@/context/AuthContext';
import { Toast, STOCK_READERS, LOT_WRITERS, DM_ONLY} from './components/shared';
import {LotListScreen }from './components/LotListScreen';
import { AddMaterialScreen } from './components/AddMaterialScreen';
import { StockHubScreen } from './components/StockHubScreen';
import { ReceivingScreen } from './components/ReceivingScreen';
import { SupplierOrdersScreen } from './components/SupplierOrdersScreen';

import {Package, Lock,Boxes,PackagePlus,Truck } from 'lucide-react';
// ── Page shell ─────────────────────────────────────────────────────────
const SCREENS = [
  { id: 'hub', label: 'Overview & Alerts', icon: Boxes },
  { id: 'lots', label: 'Lot Directory', icon: Package },
  { id: 'intake', label: 'Add Material', icon: PackagePlus, writersOnly: true },
  { id: 'orders', label: 'Supplier Orders', dmOnly: true, icon: Truck },
];
export default function MaterialsPage() {
  const { user } = useAuth();
  const [screen, setScreen] = useState('hub');
  const [toast, setToast] = useState(null);
  const [receivePrefill, setReceivePrefill] = useState(null);
  const [orderPrefill, setOrderPrefill] = useState(null);

  const showToast = useCallback((msg, type) => setToast({ msg, type }), []);

  const isReader = STOCK_READERS.includes(user);
  const isWriter = LOT_WRITERS.includes(user);
  const isDmOnly = DM_ONLY.includes(user);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="p-8 bg-white border border-amber-100 shadow-xl rounded-3xl space-y-4">
          <Lock className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Login Required</h1>
        </div>
      </div>
    );
  }

  if (!isReader) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="p-8 bg-white border border-amber-100 shadow-xl rounded-3xl space-y-4">
          <Lock className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Access Restricted</h1>
          <p className="text-sm font-bold text-slate-400">Material stock is visible to DM, MD, HR, Cutting, Lining, Stitching, Store and Security roles.</p>
        </div>
      </div>
    );
  }

  const visibleScreens = SCREENS.filter((s) => (!s.writersOnly || isWriter) && (!s.dmOnly || isDmOnly));

  return (
    <div className="space-y-6 animate-fade-in pb-16">
      <Toast msg={toast?.msg} type={toast?.type} onClose={() => setToast(null)} />

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2" style={{ color: '#2d1f0e' }}><Package className="w-7 h-7" style={{ color: '#c8834a' }} /> Material Stock</h1>
          <p className="font-medium mt-1 text-sm" style={{ color: '#9a7a5a' }}>Lots, receiving and supplier orders — the human-driven stock system, not the BOM-driven inventory module.</p>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap border-b pb-3" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        {visibleScreens.map((s) => {
          const Icon = s.icon;
          const active = screen === s.id;
          return (
            <button key={s.id} onClick={() => setScreen(s.id)}
              className={`h-10 px-4 rounded-xl font-black text-xs uppercase flex items-center gap-2 transition-all ${active ? 'text-white shadow-sm' : 'text-slate-500 bg-slate-50'}`}
              style={active ? { background: '#c8834a' } : {}}>
              <Icon className="w-4 h-4" /> {s.label}
            </button>
          );
        })}
      </div>

      {screen === 'hub' && (
        <StockHubScreen showToast={showToast} canOrder={isDmOnly} canEdit={isWriter} canAdjust={isDmOnly}
          onOpenOrder={(prefill) => { setOrderPrefill(prefill); setScreen('orders'); }}
          onReceive={isDmOnly ? (p) => { setReceivePrefill(p); setScreen('intake'); } : null} />
      )}
      {screen === 'lots' && (
        <LotListScreen showToast={showToast} canEdit={isWriter} canAdjust={isDmOnly}
          onReceive={isDmOnly ? (p) => { setReceivePrefill(p); setScreen('intake'); } : null} />
      )}
      {screen === 'intake' && isWriter && (
        <div className="space-y-8">
          {/* Team call: this is one physical event on the floor — material
              arrived. DM/MD check first whether it tops up a lot that
              already exists (Receiving); only if nothing matches does it
              become a brand-new spec (Add Material) below. */}
          {isDmOnly && (
            <div>
              <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">Step 1 — Receive Against an Existing Lot</div>
              <ReceivingScreen showToast={showToast} prefill={receivePrefill} />
            </div>
          )}
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2 px-1">{isDmOnly ? 'Step 2 — ' : ''}No Matching Lot? Add a New Material</div>
            <AddMaterialScreen showToast={showToast}
              onDuplicate={(p) => { setReceivePrefill(p); window.scrollTo({ top: 0, behavior: 'smooth' }); showToast('Already exists — Receiving above is pre-filled with it.', 'success'); }} />
          </div>
        </div>
      )}
      {screen === 'orders' && isDmOnly && (
        <SupplierOrdersScreen showToast={showToast} prefill={orderPrefill}
          onArrived={(p) => { setReceivePrefill(p); setScreen('intake'); }} />
      )}
    </div>
  );
}
