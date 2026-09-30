import { AlertCircle, CheckCircle2 } from 'lucide-react';
export default function ValidationCard({
  title,
  data,
  error,
}) {
  if (!data && !error) {
    return null;
  }

  const validation =
    data?.document?.validation ||
    error?.body?.validation ||
    error?.data?.validation;

  const isError = !!error && !data;

  return (
    <div className="mt-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 mb-2">

        {isError ? (
          <AlertCircle className="w-4 h-4 text-red-600" />
        ) : (
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
        )}

        <span
          className={`text-xs font-black ${
            isError
              ? 'text-red-700'
              : 'text-[#c8834a]'
          }`}
        >
          {title} · {isError ? 'Rejected' : 'Accepted'}
        </span>
      </div>

      {validation && (
        <div className="p-3 rounded-xl bg-[#faf6f0] border border-amber-900/10 text-xs font-semibold space-y-1">
          <p>
            <span className="text-slate-500 font-bold uppercase text-[10px]">
              Classification:
            </span>{' '}
            {validation.classified_as ||
              validation.expected_kind ||
              'Document'}
          </p>

          <p>
            <span className="text-slate-500 font-bold uppercase text-[10px]">
              Status:
            </span>{' '}

            <b
              className={
                isError
                  ? 'text-red-700'
                  : 'text-emerald-700'
              }
            >
              {validation.status ||
                (isError
                  ? 'Validation Failed'
                  : 'Verified & Ready')}
            </b>
          </p>
        </div>
      )}

      {isError && (
        <p className="mt-2 text-[10px] font-bold text-red-600">
          {error?.data?.detail ||
            error?.data?.message ||
            error?.message ||
            'Document upload failed.'}
        </p>
      )}
    </div>
  );
}

