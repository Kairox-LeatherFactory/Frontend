'use client';
import { useState } from 'react';
import Link from 'next/link';
import {
  Package, UploadCloud, CheckCircle2, Clock, XCircle,
  ArrowRight, Plus, FileText, Layers, Eye,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';

// ─── MOCK DATA ────────────────────────────────────────────────────────────────
// TODO: Replace with GET /api/v1/procurement/submissions when API is live
export const MOCK_SUBMISSIONS = [
  {
    id: 'SUB-001',
    client: 'Marks & Spencer',
    style: 'Chelsea Boot',
    colorway: 'Cognac Tan',
    order_qty: 500,
    status: 'approved',
    stage: 3,
    created_at: '2026-06-08',
    delivery_deadline: '2026-07-20',
    order_file: 'MS_Chelsea_OrderSheet_v2.xlsx',
    spec_file: 'MS_Chelsea_TechSpec.pdf',
  },
  {
    id: 'SUB-002',
    client: 'Tata Cliq Luxury',
    style: 'Oxford Brogue',
    colorway: 'Midnight Black',
    order_qty: 300,
    status: 'ready_for_bom',
    stage: 2,
    created_at: '2026-06-10',
    delivery_deadline: '2026-07-15',
    order_file: 'TCL_Oxford_PO_Final.xlsx',
    spec_file: 'TCL_Oxford_Spec.pdf',
  },
  {
    id: 'SUB-003',
    client: 'Woodland India',
    style: 'Moccasin Loafer',
    colorway: 'Chestnut Brown',
    order_qty: 750,
    status: 'processing',
    stage: 1,
    created_at: '2026-06-12',
    delivery_deadline: '2026-08-01',
    order_file: 'Woodland_Loafer_PO.xlsx',
    spec_file: null,
  },
  {
    id: 'SUB-004',
    client: 'Hidesign',
    style: 'Derby Lace-Up',
    colorway: 'Burgundy Wine',
    order_qty: 200,
    status: 'rejected',
    stage: 3,
    created_at: '2026-06-05',
    delivery_deadline: '2026-07-10',
    order_file: 'Hidesign_Derby_PO.xlsx',
    spec_file: 'Hidesign_Derby_Spec.pdf',
  },
];

const STATUS_CONFIG = {
  processing:    { label: 'Processing',       color: '#c8834a', bg: '#fff9f0', border: 'rgba(200,131,74,0.3)', icon: Clock },
  ready_for_bom: { label: 'Ready for BOM',    color: '#2563eb', bg: '#eff6ff', border: 'rgba(37,99,235,0.2)', icon: Layers },
  approved:      { label: 'BOM Approved',     color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.2)', icon: CheckCircle2 },
  rejected:      { label: 'Rejected',         color: '#dc2626', bg: '#fef2f2', border: 'rgba(220,38,38,0.2)', icon: XCircle },
};

const STAGE_LABELS = ['', 'Intake & Upload', 'BOM Review', 'Approval'];

export default function ProcurementOverview() {
  const { user } = useAuth();
  const isManager = user === 'direct_manager';
  const isCuttingMgr = user === 'cutting_manager';
  const canIntake = isManager || isCuttingMgr;

  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? MOCK_SUBMISSIONS
    : MOCK_SUBMISSIONS.filter(s => s.status === filter);

  const stats = {
    total: MOCK_SUBMISSIONS.length,
    processing: MOCK_SUBMISSIONS.filter(s => s.status === 'processing').length,
    ready_for_bom: MOCK_SUBMISSIONS.filter(s => s.status === 'ready_for_bom').length,
    approved: MOCK_SUBMISSIONS.filter(s => s.status === 'approved').length,
  };

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ─── HEADER ─── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>
            Procurement Suite
          </p>
          <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
            Submissions Overview
          </h1>
          <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>
            Track all procurement submissions across intake, BOM review, and approval stages.
          </p>
        </div>
        {canIntake && (
          <Link
            href="/dashboard/procurement/intake"
            className="flex items-center gap-2 h-11 px-5 rounded-xl text-sm font-black text-white shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
          >
            <Plus className="w-4 h-4" /> New Submission
          </Link>
        )}
      </div>

      {/* ─── STATS CARDS ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Submissions', value: stats.total, icon: Package, color: '#c8834a', bg: '#fff9f0', border: 'rgba(200,131,74,0.2)' },
          { label: 'Processing',        value: stats.processing, icon: Clock, color: '#c8834a', bg: '#fff9f0', border: 'rgba(200,131,74,0.2)' },
          { label: 'Awaiting BOM',      value: stats.ready_for_bom, icon: Layers, color: '#2563eb', bg: '#eff6ff', border: 'rgba(37,99,235,0.15)' },
          { label: 'Approved',          value: stats.approved, icon: CheckCircle2, color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.15)' },
        ].map(({ label, value, icon: Icon, color, bg, border }) => (
          <SpotlightCard key={label} className="p-4 rounded-2xl" style={{ background: bg, border: `1px solid ${border}` }} spotlightColor={`${color}15`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider" style={{ color }}>{label}</span>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <p className="text-3xl font-black" style={{ color: '#2d1f0e' }}>{value}</p>
          </SpotlightCard>
        ))}
      </div>

      {/* ─── FILTER TABS ─── */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'processing', 'ready_for_bom', 'approved', 'rejected'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-full text-xs font-black transition-all"
            style={{
              background: filter === f ? '#c8834a' : '#faf6f0',
              color: filter === f ? 'white' : '#9a7a5a',
              border: `1px solid ${filter === f ? '#c8834a' : 'rgba(200,131,74,0.2)'}`,
            }}>
            {f === 'all' ? 'All' : STATUS_CONFIG[f]?.label ?? f}
          </button>
        ))}
      </div>

      {/* ─── SUBMISSIONS LIST ─── */}
      <SpotlightCard className="p-0 bg-white shadow-xl rounded-3xl overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.04)">
        <div className="p-6 border-b" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
          <h3 className="text-lg font-extrabold flex items-center gap-2" style={{ color: '#2d1f0e' }}>
            <Package className="w-5 h-5" style={{ color: '#c8834a' }} />
            Submissions
            <span className="text-xs font-black px-2 py-0.5 rounded-full" style={{ background: '#faf6f0', color: '#a86022', border: '1px solid rgba(200,131,74,0.2)' }}>
              {filtered.length}
            </span>
          </h3>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center" style={{ color: '#9a7a5a' }}>
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-semibold">No submissions found.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ divideColor: 'rgba(200,131,74,0.08)' }}>
            {filtered.map(sub => {
              const cfg = STATUS_CONFIG[sub.status] || STATUS_CONFIG.processing;
              const StatusIcon = cfg.icon;
              const canViewBOM = sub.stage >= 2;
              return (
                <div key={sub.id} className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 hover:bg-[#fcfaf8] transition-colors">

                  {/* Left: info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-[10px] font-black font-mono" style={{ color: '#9a7a5a' }}>{sub.id}</span>
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        <StatusIcon className="w-3 h-3" /> {cfg.label}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black" style={{ background: '#faf6f0', color: '#c8834a', border: '1px solid rgba(200,131,74,0.2)' }}>
                        Stage {sub.stage}: {STAGE_LABELS[sub.stage]}
                      </span>
                    </div>
                    <h4 className="font-black text-base" style={{ color: '#2d1f0e' }}>{sub.client}</h4>
                    <p className="text-sm font-semibold" style={{ color: '#9a7a5a' }}>{sub.style} · {sub.colorway} · {sub.order_qty} pairs</p>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {sub.order_file && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#9a7a5a' }}>
                          <FileText className="w-3 h-3" /> {sub.order_file}
                        </span>
                      )}
                      {sub.spec_file && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: '#9a7a5a' }}>
                          <FileText className="w-3 h-3" /> {sub.spec_file}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Right: deadline + CTA */}
                  <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                    <div className="text-right">
                      <p className="text-[10px] font-bold uppercase" style={{ color: '#9a7a5a' }}>Delivery Deadline</p>
                      <p className="text-sm font-black" style={{ color: '#2d1f0e' }}>{sub.delivery_deadline}</p>
                    </div>
                    {canViewBOM && (
                      <Link
                        href={`/dashboard/procurement/bom/${sub.id}`}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all hover:shadow-md hover:-translate-y-0.5"
                        style={{ background: '#faf6f0', color: '#c8834a', border: '1px solid rgba(200,131,74,0.25)' }}
                      >
                        <Eye className="w-3.5 h-3.5" />
                        {sub.status === 'approved' ? 'View BOM' : 'Review BOM'}
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {sub.stage === 1 && sub.status === 'processing' && (
                      <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold" style={{ background: '#fff9f0', color: '#9a7a5a', border: '1px solid rgba(200,131,74,0.15)' }}>
                        <Clock className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '2s' }} /> Processing files…
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SpotlightCard>
    </div>
  );
}
