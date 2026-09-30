'use client';
import {
  Shirt,
  Users,
  Layers,
  Activity,
  Filter,
  RotateCcw,
  CheckCircle2,
} from 'lucide-react';
import ScreenSafeSelect from './ScreenSafeSelect';
import CompleteDateCalendarPicker from './CompleteDateCalendarPicker';
import { LINING_TABS } from '../_lib/constants';

/**
 * ============================================================================
 * LiningHeader Component
 * ============================================================================
 */
export default function LiningHeader({
  selectedDate,
  onSelectDate,
  availableDates = [],
  selectedOrder,
  onSelectOrder,
  availableOrders = [],
  selectedStyle,
  onSelectStyle,
  availableStyles = [],
  selectedOperator,
  onSelectOperator,
  availableOperators = [],
  onResetFilters,
  kpis = {},
  activeTab,
  onSelectTab,
  onRefresh,
  loading,
}) {
  const activeFiltersCount =
    (selectedDate !== 'all' ? 1 : 0) +
    (selectedOrder !== 'all' ? 1 : 0) +
    (selectedStyle !== 'all' ? 1 : 0) +
    (selectedOperator !== 'all' ? 1 : 0);

  return (
    <div className="w-full space-y-6">
      {/* Title & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-linear-to-br from-rose-500 to-rose-700 text-white flex items-center justify-center shadow-md shadow-rose-200">
              <Shirt className="w-5 h-5" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Lining Department Command
            </h1>
            <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Lining cutting &bull; fabric rolls allocation &bull; piece output tracking
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'Syncing...' : 'Sync Floor'}</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-extrabold text-slate-700">
            <Filter className="w-4 h-4 text-rose-600" />
            <span>Lining Scope Filters</span>
            {activeFiltersCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 text-[10px] font-black">
                {activeFiltersCount} active
              </span>
            )}
          </div>
          {activeFiltersCount > 0 && (
            <button
              onClick={onResetFilters}
              className="text-[11px] font-bold text-slate-400 hover:text-rose-600 transition-colors cursor-pointer flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              Reset All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <CompleteDateCalendarPicker
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            availableDates={availableDates}
            themeColor="#e11d48"
          />

          <ScreenSafeSelect
            value={selectedOrder}
            options={availableOrders.map((o) => ({
              value: o.order_number,
              label: `PO: ${o.order_number} (${o.style_name || 'Style'})`,
            }))}
            onChange={onSelectOrder}
            placeholder="All Orders"
          />

          <ScreenSafeSelect
            value={selectedStyle}
            options={availableStyles.map((s) => ({
              value: s.style_code || s.style_name,
              label: s.style_name || s.style_code,
            }))}
            onChange={onSelectStyle}
            placeholder="All Product Styles"
          />

          <ScreenSafeSelect
            value={selectedOperator}
            options={availableOperators.map((op) => ({
              value: op.employee_id || op.id,
              label: op.name,
            }))}
            onChange={onSelectOperator}
            placeholder="All Lining Operators"
          />
        </div>
      </div>

      {/* Primary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-rose-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cut Today</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {(kpis.daily_completed ?? kpis.completed_today ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-slate-400 mt-1 block font-medium">Lining pieces cut today</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-emerald-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Active Operators</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {(kpis.active_employees ?? availableOperators.length ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-emerald-600 mt-1 block font-medium">On lining floor</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-purple-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Cut</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
              <Shirt className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {(kpis.total_cut ?? kpis.completed_pieces ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-purple-700 mt-1 block font-medium">Completed batch pieces</span>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs relative overflow-hidden group hover:border-amber-300 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Queue WIP</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            {(kpis.pending_pieces ?? kpis.total_pending ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-amber-700 mt-1 block font-medium">Pending cutting</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        {LINING_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-[#e11d48] text-white shadow-sm shadow-rose-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
