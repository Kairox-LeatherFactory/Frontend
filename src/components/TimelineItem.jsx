'use client';
import { Check, AlertTriangle, Settings } from 'lucide-react';

export default function TimelineItem({ stage, operator, status, note, time, isLast }) {
  const isPass = status === 'PASS';
  const isRework = status === 'REWORK';

  let statusBadge = <span className="badge badge-info">{status}</span>;
  if (isPass) {
    statusBadge = <span className="badge badge-success flex items-center gap-1"><Check className="w-3 h-3" /> PASS</span>;
  } else if (isRework) {
    statusBadge = <span className="badge badge-danger flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> REWORK</span>;
  }

  return (
    <div className="relative flex gap-4 text-xs sm:text-sm font-semibold">
      
      {/* Node indicator */}
      <div className="flex flex-col items-center">
        <div className={`flex h-8 w-8 items-center justify-center rounded-full border shadow-sm font-bold text-sm ${
          isPass ? 'bg-emerald-50 border-emerald-200 text-emerald-600' : 
          isRework ? 'bg-red-50 border-red-200 text-red-600' : 
          'bg-blue-50 border-blue-200 text-blue-600'
        }`}>
          {isPass ? <Check className="w-4 h-4" /> : isRework ? <AlertTriangle className="w-4 h-4" /> : <Settings className="w-4 h-4" />}
        </div>
        {!isLast && <div className="w-0.5 flex-1 bg-slate-200 my-2" />}
      </div>

      {/* Content panel */}
      <div className="flex-1 pb-6 pt-1 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="font-extrabold text-slate-800 text-sm sm:text-base">{stage}</span>
          <span className="text-[10px] text-slate-400 font-bold">{time}</span>
        </div>
        <p className="text-slate-500 font-medium">
          Logged by <strong className="text-slate-800">{operator}</strong>
        </p>
        <div className="flex items-center gap-2 mt-1">
          {statusBadge}
          <span className="text-xs text-slate-600 font-medium leading-relaxed">{note}</span>
        </div>
      </div>

    </div>
  );
}
