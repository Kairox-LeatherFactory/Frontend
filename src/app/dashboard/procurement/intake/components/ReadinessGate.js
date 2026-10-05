import { CheckCircle2, Loader2, Play } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function ReadinessGate({
  gate,
  gateLoading,
  gateFetching,
  breaking,
  startBreakdown,
}) {
  if (!gate) return null;

  const isReady = gate.ready_for_stage_2 === true;

  return (
    <SpotlightCard
      className="p-5 rounded-3xl bg-white"
      spotlightColor="rgba(200,131,74,.04)"
      style={{
        border: '1px solid rgba(200,131,74,.15)',
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-black uppercase text-slate-400">
            Readiness gate
          </p>

          <p className="font-black mt-1">
            {isReady
              ? 'Ready for Stage 2'
              : 'Waiting for required documents'}
          </p>

          <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-bold">
            <span className="px-2 py-1 rounded bg-slate-100">
              Order:{' '}
              {gate.order_sheet?.validation_status || 'missing'}
            </span>

            <span className="px-2 py-1 rounded bg-slate-100">
              Spec:{' '}
              {gate.spec_sheet?.validation_status || 'missing'}
            </span>
          </div>

          {gate.blocking?.length > 0 && (
            <div className="mt-3 space-y-1">
              {gate.blocking.map((reason, index) => (
                <p
                  key={`${reason}-${index}`}
                  className="text-xs text-red-500 font-medium"
                >
                  • {reason}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="flex-shrink-0">
          {gateLoading || gateFetching ? (
            <Loader2 className="w-5 h-5 animate-spin text-[#c8834a]" />
          ) : (
            <CheckCircle2
              className={`w-6 h-6 ${
                isReady ? 'text-green-500' : 'text-slate-300'
              }`}
            />
          )}
        </div>
      </div>

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          disabled={!isReady || breaking || gateLoading || gateFetching}
          onClick={startBreakdown}
          className="px-5 py-3 rounded-xl bg-[#c8834a] text-white text-xs font-black inline-flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {breaking ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Starting...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-current" />
              Start Order Breakdown
            </>
          )}
        </button>
      </div>
    </SpotlightCard>
  );
}