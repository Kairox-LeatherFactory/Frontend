'use client';
import { useState,useCallback} from 'react';
import { useAuth } from '@/context/AuthContext';
import { usePageTrail } from '@/context/PageTrailContext';
import { Toast, STOCK_READERS, LOT_WRITERS, DM_ONLY} from './components/shared';
import {LotListScreen }from './components/LotListScreen';
import { AddMaterialScreen } from './components/AddMaterialScreen';
import { StockHubScreen } from './components/StockHubScreen';
import { ReceivingScreen } from './components/ReceivingScreen';
import { SupplierOrdersScreen } from './components/SupplierOrdersScreen';
import { LeatherByStyleScreen } from './components/LeatherByStyleScreen';
import { ArrivalsScreen } from './components/ArrivalsScreen';

import { Package, Lock, Boxes, PackagePlus, Truck, Shirt, PackageCheck } from 'lucide-react';
// ── Page shell ─────────────────────────────────────────────────────────
const SCREENS = [
  { id: 'hub', label: 'Overview & Alerts', icon: Boxes },
  { id: 'lots', label: 'Lot Directory', icon: Package },
  { id: 'style', label: 'Style Recipe (BOM)', icon: Shirt },
  { id: 'intake', label: 'Add Material', icon: PackagePlus, writersOnly: true },
  { id: 'arrivals', label: 'Arrivals', icon: PackageCheck, writersOnly: true },
  { id: 'orders', label: 'Supplier Orders', dmOnly: true, icon: Truck },
];
export default function MaterialsPage() {
  const { user } = useAuth();
  const [screen, setScreen] = useState('hub');
  const [toast, setToast] = useState(null);
  const [receivePrefill, setReceivePrefill] = useState(null);
  const [orderPrefill, setOrderPrefill] = useState(null);

  const showToast = useCallback((msg, type) => setToast({ msg, type }), []);

  // Header path: Material Stock › <tab>
  usePageTrail([SCREENS.find((s) => s.id === screen)?.label]);

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
          onReceive={isWriter ? (p) => { setReceivePrefill(p); setScreen('intake'); } : null} />
      )}
      {screen === 'lots' && (
        <LotListScreen showToast={showToast} canEdit={isWriter} canAdjust={isDmOnly}
          onReceive={isWriter ? (p) => { setReceivePrefill(p); setScreen('intake'); } : null} />
      )}
      {screen === 'style' && (
        <LeatherByStyleScreen showToast={showToast} onOpenOrder={isDmOnly ? (p) => { setOrderPrefill(p); setScreen('orders'); } : null} />
      )}
      {screen === 'intake' && isWriter && (
        // Side by side on wide screens (existing | OR | new), stacked below xl
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-5 items-start">
          <ReceivingScreen showToast={showToast} prefill={receivePrefill} />
          <div className="flex xl:flex-col items-center gap-3 xl:self-stretch" aria-hidden="true">
            <div className="flex-1 h-px xl:h-auto xl:w-px" style={{ background: 'rgba(200,131,74,0.3)' }} />
            <span className="w-10 h-10 rounded-full bg-white border-2 flex items-center justify-center text-[11px] font-black text-[#a86022] shadow-sm" style={{ borderColor: 'rgba(200,131,74,0.35)' }}>OR</span>
            <div className="flex-1 h-px xl:h-auto xl:w-px" style={{ background: 'rgba(200,131,74,0.3)' }} />
          </div>
          <AddMaterialScreen showToast={showToast}
            onDuplicate={(p) => { setReceivePrefill(p); document.getElementById('app-main')?.scrollTo({ top: 0, behavior: 'smooth' }); showToast('Already exists — "Add Existing Material" is pre-filled with it.', 'success'); }} />
        </div>
      )}
      {screen === 'arrivals' && isWriter && (
        <ArrivalsScreen showToast={showToast} />
      )}
      {screen === 'orders' && isDmOnly && (
        <SupplierOrdersScreen showToast={showToast} prefill={orderPrefill}
          onArrived={(p) => { setReceivePrefill(p); setScreen('intake'); }} />
      )}
    </div>
  );
}
