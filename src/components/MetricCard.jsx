'use client';

export default function MetricCard({ title, value, icon, trend, description, trendColor = 'text-blue-600' }) {
  return (
    <div className="card p-6 flex flex-col justify-between border border-blue-100 bg-white relative overflow-hidden">
      {/* Decorative background shape */}
      <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-[0.04] pointer-events-none select-none">
        <div className="w-24 h-24">
          {icon}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{title}</p>
          <h3 className="text-3xl font-black text-slate-900 mt-2 tracking-tight">{value}</h3>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-100">
          {icon}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2">
        {trend && (
          <span className={`text-xs font-black px-2 py-0.5 rounded-full ${trendColor} bg-opacity-10 bg-current`}>
            {trend}
          </span>
        )}
        <span className="text-xs text-slate-500 font-medium">{description}</span>
      </div>
    </div>
  );
}
