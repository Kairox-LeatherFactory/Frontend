'use client';

export default function OrderProgressBar({ progress, status }) {
  const isAirRisk = status && (status.includes('RISK') || status.includes('Air'));
  const isDelayed = status && (status.includes('Delayed') || status.includes('Delay') || status.includes('Bottleneck'));

  let fillColor = 'bg-gradient-to-r from-blue-600 to-blue-400';
  let trackColor = 'bg-blue-100';

  if (isAirRisk) {
    fillColor = 'bg-gradient-to-r from-red-600 to-amber-500';
    trackColor = 'bg-red-100';
  } else if (isDelayed) {
    fillColor = 'bg-gradient-to-r from-amber-500 to-yellow-400';
    trackColor = 'bg-amber-100';
  }

  return (
    <div className="w-full">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1.5">
        <span>Operations Progress</span>
        <span className={`font-black ${isAirRisk ? 'text-red-600' : isDelayed ? 'text-amber-600' : 'text-blue-600'}`}>
          {progress}%
        </span>
      </div>
      <div className={`progress-bar-track ${trackColor} h-2.5`}>
        <div
          className={`progress-bar-fill ${fillColor}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
