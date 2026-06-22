'use client';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import Link from 'next/link';
import {
  Plus, ClipboardList, Clock, Plane, AlertCircle, Package,
  Settings, BarChart3, Zap, FilePen, TrendingUp, TrendingDown,
  Users, CheckCircle2, AlertTriangle, ArrowUpRight, Activity,
  Scissors, Layers,
} from 'lucide-react';

/* ── Stat Card ─────────────────────────────────────────────────────── */
function StatCard({ title, value, sub, icon: Icon, accent = '#c8834a', danger = false, glow = false }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 flex flex-col gap-3 border transition-all duration-300 hover:-translate-y-0.5"
      style={{
        background: '#ffffff',
        borderColor: danger ? 'rgba(239,68,68,0.3)' : 'rgba(180,130,80,0.2)',
        boxShadow: glow
          ? `0 4px 20px ${danger ? 'rgba(239,68,68,0.1)' : 'rgba(200,131,74,0.12)'}`
          : '0 1px 6px rgba(180,130,80,0.08)',
      }}
    >
      {/* Ambient top accent */}
      <div
        className="absolute top-0 left-0 w-full h-[3px] rounded-t-2xl"
        style={{ background: danger ? '#ef4444' : accent }}
      />

      <div className="flex items-start justify-between">
        <div
          className="p-2.5 rounded-xl"
          style={{ background: danger ? 'rgba(239,68,68,0.12)' : 'rgba(200,131,74,0.12)' }}
        >
          <Icon className="w-5 h-5" style={{ color: danger ? '#ef4444' : accent }} />
        </div>
        <span
          className="text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-full border"
          style={{
            color: danger ? '#ef4444' : accent,
            borderColor: danger ? 'rgba(239,68,68,0.3)' : 'rgba(200,131,74,0.3)',
            background: danger ? 'rgba(239,68,68,0.08)' : 'rgba(200,131,74,0.08)',
          }}
        >
          Live
        </span>
      </div>

      <div>
        <p className="text-[11px] text-[#8a7a6a] font-bold uppercase tracking-widest mb-1">{title}</p>
        <p className="text-4xl font-black text-white leading-none">{value}</p>
        {sub && <p className="text-xs mt-2 font-semibold" style={{ color: danger ? '#f87171' : '#c8834a' }}>{sub}</p>}
      </div>
    </div>
  );
}

/* ── Order Row ─────────────────────────────────────────────────────── */
function OrderRow({ order }) {
  const hasRisk = order.freight_mode?.includes('RISK');
  const isDelayed = order.delay_days > 0;
  const prog = Math.min(order.progress, 100);

  return (
    <div
      className="rounded-2xl p-5 border flex flex-col md:flex-row gap-5 transition-all duration-200 hover:border-[#c8834a]/40 group"
      style={{
        background: '#ffffff',
        borderColor: hasRisk ? 'rgba(239,68,68,0.25)' : 'rgba(180,130,80,0.18)',
        boxShadow: '0 1px 6px rgba(180,130,80,0.07)',
      }}
    >
      {/* Left: meta */}
      <div className="flex-1 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] text-[#9a7a5a] font-bold uppercase tracking-widest">{order.type}</span>
            <h3 className="text-base font-black mt-0.5" style={{ color: '#2d1f0e' }}>{order.id} — {order.client}</h3>
          </div>
          <span
            className="text-[10px] font-black px-2.5 py-1 rounded-full shrink-0"
            style={{
              background: hasRisk ? 'rgba(239,68,68,0.15)' : isDelayed ? 'rgba(217,119,6,0.15)' : 'rgba(34,197,94,0.12)',
              color: hasRisk ? '#f87171' : isDelayed ? '#fbbf24' : '#4ade80',
              border: `1px solid ${hasRisk ? 'rgba(239,68,68,0.3)' : isDelayed ? 'rgba(217,119,6,0.3)' : 'rgba(34,197,94,0.2)'}`,
            }}
          >
            {order.freight_mode}
          </span>
        </div>

        {/* Grid of meta values */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Style SKU', val: `${order.style} (${order.colorway})` },
            { label: 'Qty', val: `${order.quantity} pcs` },
            { label: 'Ship Cutoff', val: order.sea_cutoff },
            { label: 'Lag', val: `${order.delay_days}d`, danger: isDelayed },
          ].map(({ label, val, danger: d }) => (
            <div key={label}>
              <span className="block text-[9px] text-[#b09070] font-bold uppercase tracking-wider">{label}</span>
              <span className={`text-xs font-black ${d ? 'text-amber-600' : 'text-[#3d2b1a]'}`}>{val}</span>
            </div>
          ))}
        </div>

        {/* Progress bar */}
        <div>
          <div className="flex justify-between text-[10px] font-bold mb-1">
            <span className="text-[#9a8070]">{order.status}</span>
            <span style={{ color: '#c8834a' }}>{prog}%</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#f0e6d8' }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${prog}%`,
                background: hasRisk
                  ? 'linear-gradient(90deg, #ef4444, #f97316)'
                  : 'linear-gradient(90deg, #c8834a, #e8a06a)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Right: stage & action */}
      <div className="md:w-44 flex flex-col justify-between gap-3 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-5" style={{ borderColor: 'rgba(180,130,80,0.2)' }}>
        <div>
          <span className="text-[9px] text-[#b09070] font-bold uppercase tracking-wider block">Active Stage</span>
          <p className="text-sm font-black mt-1 flex items-center gap-1.5" style={{ color: '#c8834a' }}>
            <Settings className="w-3.5 h-3.5" />
            {order.status}
          </p>
        </div>
        <Link
          href={`/dashboard/progress?order=${order.id}`}
          className="flex items-center justify-center gap-1.5 text-xs font-black rounded-xl py-2.5 px-3 transition-all duration-200 border group-hover:border-[#c8834a]/60"
          style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a', border: '1px solid rgba(200,131,74,0.2)' }}
        >
          <BarChart3 className="w-3.5 h-3.5" /> Flow Card
          <ArrowUpRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}

/* ── Event Feed Item ────────────────────────────────────────────────── */
function FeedItem({ evt, workerName }) {
  return (
    <div className="relative pl-5">
      <span className="absolute left-0 top-1.5 w-2 h-2 rounded-full ring-4" style={{ background: '#c8834a', ringColor: '#f2ece4' }} />
      <div className="space-y-0.5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-black" style={{ color: '#2d1f0e' }}>{evt.operation}</span>
          <span className="text-[10px] font-bold shrink-0" style={{ color: '#b09070' }}>{evt.date}</span>
        </div>
        <p className="text-[11px] leading-relaxed" style={{ color: '#7a6050' }}>
          <span className="font-bold" style={{ color: '#c8834a' }}>{workerName}</span> logged{' '}
          <span className="font-black" style={{ color: '#3d2b1a' }}>{evt.qty} pcs</span> — {evt.style} ({evt.colorway})
        </p>
        <p className="text-[10px]" style={{ color: '#b09070' }}>Order {evt.order_id} · Size {evt.size}</p>
      </div>
    </div>
  );
}

/* ── Quick Nav Card ─────────────────────────────────────────────────── */
function QuickNav({ href, icon: Icon, label, sub, accent = '#c8834a' }) {
  return (
    <Link
      href={href}
      className="rounded-xl p-4 flex items-center gap-3 border transition-all duration-200 hover:-translate-y-0.5 group"
      style={{ background: '#fff8f2', borderColor: 'rgba(180,130,80,0.2)' }}
    >
      <div className="p-2 rounded-lg" style={{ background: 'rgba(200,131,74,0.1)' }}>
        <Icon className="w-4 h-4" style={{ color: accent }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black truncate" style={{ color: '#2d1f0e' }}>{label}</p>
        <p className="text-[10px] font-medium" style={{ color: '#b09070' }}>{sub}</p>
      </div>
      <ArrowUpRight className="w-3.5 h-3.5 transition-colors" style={{ color: '#c8834a' }} />
    </Link>
  );
}

/* ── Main Page ──────────────────────────────────────────────────────── */
export default function DashboardHome() {
  const { user } = useAuth();
  const { orders, events, workers } = useData();

  const totalOrders   = orders.length;
  const airRiskOrders = orders.filter(o => o.freight_mode?.includes('RISK')).length;
  const delayedOrders = orders.filter(o => o.delay_days > 0).length;
  const avgProgress   = totalOrders > 0
    ? Math.round(orders.reduce((a, c) => a + c.progress, 0) / totalOrders)
    : 0;
  const onTimeOrders  = totalOrders - delayedOrders;

  const recentEvents = [...events].reverse().slice(0, 6);
  const getWorkerName = id => workers.find(w => w.id === id)?.name || id;

  const today = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-8 animate-fade-in" style={{ color: '#d4c4b4' }}>

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
        <p className="text-[11px] font-bold tracking-widest uppercase mb-1" style={{ color: '#c8834a' }}>
          {today}
        </p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
          Intelligence Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: '#9a7a5a' }}>
          Real-time factory floor intelligence — orders, delays &amp; freight risk.
        </p>
      </div>
        <Link
          href="/dashboard/entry"
          className="inline-flex items-center gap-2 font-black text-sm px-5 py-3 rounded-xl transition-all duration-200 hover:-translate-y-0.5 shrink-0"
          style={{
            background: 'linear-gradient(135deg, #c8834a, #e8a06a)',
            color: '#0f0a06',
            boxShadow: '0 4px 20px rgba(200,131,74,0.35)',
          }}
        >
          <Plus className="w-4 h-4" />
          Log Shop Floor Event
        </Link>
      </div>

      {/* ── KPI STAT CARDS ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard title="Active Client Orders" value={totalOrders}   sub={`${avgProgress}% avg completion`} icon={ClipboardList} glow />
        <StatCard title="On Track"           value={onTimeOrders}  sub="Within sea cutoff window"        icon={CheckCircle2}  accent="#4ade80" />
        <StatCard title="Delayed Production Runs" value={delayedOrders} sub={delayedOrders > 0 ? 'Past internal deadline' : 'All on schedule'} icon={Clock} danger={delayedOrders > 0} glow={delayedOrders > 0} />
        <StatCard title="Air Freight Alerts" value={airRiskOrders} sub={airRiskOrders > 0 ? '~35% margin penalty risk' : 'No penalty risk'} icon={Plane} danger={airRiskOrders > 0} glow={airRiskOrders > 0} />
      </div>

      {/* ── MAIN GRID ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Order Cards */}
        <div className="lg:col-span-2 space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black flex items-center gap-2" style={{ color: '#2d1f0e' }}>
              <Package className="w-4 h-4" style={{ color: '#c8834a' }} />
              Order Batch Statuses
            </h2>
            <Link
              href="/dashboard/orders"
              className="text-xs font-bold flex items-center gap-1 hover:underline"
              style={{ color: '#c8834a' }}
            >
              SKU Tree <ArrowUpRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-4">
            {orders.map(order => <OrderRow key={order.id} order={order} />)}
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div className="space-y-5">

          {/* Live Feed */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(180,130,80,0.2)', boxShadow: '0 1px 6px rgba(180,130,80,0.08)' }}>
            <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'rgba(180,130,80,0.12)' }}>
              <h2 className="text-sm font-black flex items-center gap-2" style={{ color: '#2d1f0e' }}>
                <Activity className="w-4 h-4" style={{ color: '#c8834a' }} />
                Shop Floor Stream
              </h2>
              <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full animate-pulse"
                style={{ background: 'rgba(200,131,74,0.1)', color: '#c8834a', border: '1px solid rgba(200,131,74,0.25)' }}>
                Live
              </span>
            </div>

            <div className="p-5 space-y-5 border-l-2 ml-5" style={{ borderColor: 'rgba(200,131,74,0.3)' }}>
              {recentEvents.length === 0 ? (
                <p className="text-xs text-center py-4" style={{ color: '#b09070' }}>No events logged yet.</p>
              ) : (
                recentEvents.map(evt => (
                  <FeedItem key={evt.id} evt={evt} workerName={getWorkerName(evt.worker_id)} />
                ))
              )}
            </div>

            <div className="px-5 pb-5">
              <Link
                href="/dashboard/entry"
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-xs font-black transition-all border hover:bg-amber-50"
                style={{ background: 'rgba(200,131,74,0.06)', color: '#c8834a', borderColor: 'rgba(200,131,74,0.2)' }}
              >
                <FilePen className="w-3.5 h-3.5" /> Log New Event
              </Link>
            </div>
          </div>

          {/* Quick Navigation */}
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#ffffff', borderColor: 'rgba(180,130,80,0.2)', boxShadow: '0 1px 6px rgba(180,130,80,0.08)' }}>
            <div className="px-5 py-4 border-b" style={{ borderColor: 'rgba(180,130,80,0.12)' }}>
              <h2 className="text-sm font-black flex items-center gap-2" style={{ color: '#2d1f0e' }}>
                <Zap className="w-4 h-4" style={{ color: '#c8834a' }} />
                Quick Access
              </h2>
            </div>
            <div className="p-3 space-y-2">
              <QuickNav href="/dashboard/analytics"  icon={BarChart3}   label="Analytics & Alerts"     sub="Charts, trends, KPIs" />
              <QuickNav href="/dashboard/progress"   icon={TrendingUp}  label="Stage Progress"         sub="Spread & cut tracking" />
              <QuickNav href="/dashboard/wages"      icon={Users}       label="Payroll & Rates"        sub="Worker wage ledger" />
              <QuickNav href="/dashboard/attendance" icon={CheckCircle2} label="Attendance"            sub="Daily floor check-in" />
              <QuickNav href="/dashboard/simulator"  icon={Activity}    label="Delay Simulator"        sub="Freight impact model" />
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
