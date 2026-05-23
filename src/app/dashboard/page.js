'use client';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import MetricCard from '@/components/MetricCard';
import OrderProgressBar from '@/components/OrderProgressBar';
import Link from 'next/link';
import {
  Plus,
  ClipboardList,
  Clock,
  Plane,
  AlertCircle,
  Package,
  Settings,
  BarChart3,
  Zap,
  FilePen,
} from 'lucide-react';

export default function DashboardHome() {
  const { user } = useAuth();
  const { orders, events, workers } = useData();

  // ─── CALCULATE METRICS ───
  const totalOrders = orders.length;
  const airRiskOrders = orders.filter((o) => o.freight_mode && o.freight_mode.includes('RISK')).length;
  
  // Calculate average order progress
  const averageProgress = totalOrders > 0
    ? Math.round(orders.reduce((acc, curr) => acc + curr.progress, 0) / totalOrders)
    : 0;

  // Find delayed orders count
  const delayedOrders = orders.filter((o) => o.delay_days > 0).length;

  // Get recent 5 events in reverse order
  const recentEvents = [...events].reverse().slice(0, 5);

  // Helper to find worker name
  const getWorkerName = (workerId) => {
    return workers.find((w) => w.id === workerId)?.name || workerId;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* ─── TITLE SECTION ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Intelligence Dashboard</h1>
          <p className="text-slate-500 font-medium">Real-time status of shop floor stages, air freight triggers, and operator metrics.</p>
        </div>
        <Link href="/dashboard/entry" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> Log Shop Floor Event
        </Link>
      </div>

      {/* ─── KPI METRIC CARDS ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <MetricCard
          title="Active Client Orders"
          value={totalOrders}
          icon={<ClipboardList className="w-6 h-6 text-blue-600" />}
          trend={`${averageProgress}% avg progress`}
          description="Orders actively tracked in system"
          trendColor="text-blue-600"
        />
        <MetricCard
          title="Delayed Production Runs"
          value={delayedOrders}
          icon={<Clock className="w-6 h-6 text-amber-600" />}
          trend={delayedOrders > 0 ? `${delayedOrders} runs lagging` : 'Perfect Timing'}
          description="Delayed past internal sea-cutoff"
          trendColor={delayedOrders > 0 ? 'text-amber-600' : 'text-green-600'}
        />
        <MetricCard
          title="Air Freight Risk Alerts"
          value={airRiskOrders}
          icon={<Plane className="w-6 h-6 text-red-500" />}
          trend={airRiskOrders > 0 ? <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3" /> HIGH COST RISK</span> : 'Safe by Sea'}
          description="Over 2-day delay past deadline"
          trendColor={airRiskOrders > 0 ? 'text-red-600' : 'text-green-600'}
        />
      </div>

      {/* ─── DOUBLE SECTION ROW ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: ACTIVE ORDERS SPREAD (2 Cols wide) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" /> Order Batch Statuses
            </h2>
            <span className="text-xs font-bold text-blue-600 hover:underline">
              <Link href="/dashboard/orders">View SKU Tree →</Link>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6">
            {orders.map((order) => {
              const hasAirRisk = order.freight_mode && order.freight_mode.includes('RISK');
              const isDelayed = order.delay_days > 0;

              return (
                <div key={order.id} className="card p-6 bg-white border border-blue-100 flex flex-col md:flex-row justify-between gap-6">
                  
                  {/* Left Side: Order Meta */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between sm:justify-start sm:gap-3">
                      <div>
                        <span className="text-xs font-bold text-slate-400 tracking-wider block uppercase">{order.type}</span>
                        <h3 className="text-lg font-extrabold text-slate-900 mt-1">{order.id} — {order.client}</h3>
                      </div>
                      <span className={`badge ${hasAirRisk ? 'badge-danger' : isDelayed ? 'badge-warning' : 'badge-info'}`}>
                        {order.freight_mode}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-slate-500">
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Style SKU</span>
                        <span className="text-slate-800">{order.style} ({order.colorway})</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Order Qty</span>
                        <span className="text-slate-800">{order.quantity} pcs</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Ship Cutoff</span>
                        <span className="text-slate-800">{order.sea_cutoff}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] text-slate-400 uppercase tracking-wider">Lag Delay</span>
                        <span className={`font-black ${isDelayed ? 'text-amber-600' : 'text-green-600'}`}>
                          {order.delay_days} Days
                        </span>
                      </div>
                    </div>

                    <OrderProgressBar progress={order.progress} status={order.freight_mode} />
                  </div>

                  {/* Right Side: Operational Stage Badge & Action Link */}
                  <div className="md:w-48 flex flex-col justify-between items-stretch md:items-end border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                    <div className="text-left md:text-right">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Stage</span>
                      <p className="text-sm font-extrabold text-blue-700 mt-1 flex items-center gap-1.5 justify-start md:justify-end">
                        <Settings className="w-3.5 h-3.5" /> {order.status}
                      </p>
                    </div>

                    <div className="mt-4 md:mt-0">
                      <Link
                        href={`/dashboard/progress?order=${order.id}`}
                        className="w-full text-center block btn-secondary h-11 py-2 px-4 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5"
                      >
                        <BarChart3 className="w-3.5 h-3.5" /> View Flow Card
                      </Link>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT SHOP FLOOR FEED (1 Col wide) */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <Zap className="w-5 h-5 text-blue-600" /> Shop Floor Stream
            </h2>
            <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 text-[10px] font-black uppercase animate-pulse">
              Live
            </span>
          </div>

          <div className="card p-6 bg-white border border-blue-100 space-y-6">
            <p className="text-xs font-semibold text-slate-400">
              Latest operations logged directly by floor supervisors:
            </p>

            <div className="relative border-l-2 border-blue-100 pl-4 space-y-6 ml-2">
              {recentEvents.map((evt) => (
                <div key={evt.id} className="relative text-xs">
                  {/* Bullet */}
                  <span className="absolute -left-[23px] top-1.5 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-blue-500 ring-4 ring-white" />
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-slate-900">{evt.operation}</span>
                      <span className="text-[10px] text-slate-400 font-bold">{evt.date}</span>
                    </div>
                    <p className="text-slate-600 font-medium leading-relaxed">
                      Worker <strong className="text-slate-800">{getWorkerName(evt.worker_id)}</strong> registered{' '}
                      <strong className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded font-black">{evt.qty} pcs</strong> for style{' '}
                      <strong className="text-slate-800">{evt.style}</strong> ({evt.colorway}).
                    </p>
                    <p className="text-[10px] text-slate-400 font-bold">
                      Order ID: {evt.order_id} • Size: {evt.size}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-slate-100">
              <Link
                href="/dashboard/entry"
                className="w-full text-center block btn-primary h-12 py-3 text-sm font-bold rounded-xl flex items-center justify-center gap-2"
              >
                <FilePen className="w-4 h-4" /> Log New Event
              </Link>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
