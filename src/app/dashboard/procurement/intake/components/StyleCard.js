import { Loader2 } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
export default function StyleCard({
  style,
  onLiningChange,
  onConfirm,
  onOpenDxf,
  onGenerate,
  generating,
}) {
  const needsLining = style.needs_lining;

  return (
    <SpotlightCard
      className="p-6 bg-white rounded-3xl shadow-sm"
      spotlightColor="rgba(45,31,14,.03)"
      style={{
        border: '1px solid rgba(45,31,14,.12)',
      }}
    >
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">

        <div>
          <div className="flex items-center gap-3">
            <h3 className="font-black text-xl text-[#c8834a]">
              {style.style_name}
            </h3>

            <span className="text-xs font-black px-3 py-1 rounded-xl bg-[#faf6f0] text-[#c8834a] border border-amber-900/10">
              {style.qty || 60} pcs
            </span>

            <span
              className={`text-[10px] font-black px-2.5 py-1 rounded-full ${
                style.production_status === 'RELEASED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {style.production_status || 'DRAFT'}
            </span>
          </div>

          <p className="text-xs font-semibold text-slate-500 mt-1">
            Article:{' '}
            <b className="text-[#c8834a]">
              {style.article}
            </b>{' '}
            · Thickness:{' '}
            <b>
              {style.thickness || '0.7mm'}
            </b>{' '}
            · Code:{' '}
            <span className="font-mono text-xs">
              {style.code ||
                style.style_signature}
            </span>
          </p>
        </div>

        {/* Needs Lining */}
        <div className="p-3.5 rounded-2xl bg-[#faf6f0] border border-amber-900/15 flex items-center gap-4">
          <span className="text-xs font-black text-[#c8834a]">
            Needs Lining?
          </span>

          <div className="flex items-center gap-3 text-xs font-extrabold">

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`lining-${style.id}`}
                checked={needsLining === true}
                onChange={() =>
                  onLiningChange(
                    style.id,
                    true
                  )
                }
                className="w-4 h-4 accent-[#c8834a] cursor-pointer"
              />

              <span
                className={
                  needsLining === true
                    ? 'text-[#c8834a] font-black'
                    : 'text-slate-600'
                }
              >
                Yes (Lined)
              </span>
            </label>

            <label className="inline-flex items-center gap-1.5 cursor-pointer">
              <input
                type="radio"
                name={`lining-${style.id}`}
                checked={needsLining === false}
                onChange={() =>
                  onLiningChange(
                    style.id,
                    false
                  )
                }
                className="w-4 h-4 accent-[#c8834a] cursor-pointer"
              />

              <span
                className={
                  needsLining === false
                    ? 'text-[#c8834a] font-black'
                    : 'text-slate-600'
                }
              >
                No (Unlined)
              </span>
            </label>
          </div>

          {needsLining === null && (
            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-red-100 text-red-700 animate-pulse">
              ⚠ Answer Required
            </span>
          )}
        </div>
      </div>

      {/* SKU Breakdown */}
      <div className="mt-4 border border-slate-200 rounded-2xl overflow-hidden bg-white">
        <table className="w-full text-xs text-left font-semibold">
          <thead className="bg-[#faf6f0] text-[#c8834a] font-black uppercase text-[10px] tracking-wider border-b border-slate-200">
            <tr>
              <th className="p-3">
                Color
              </th>

              <th className="p-3">
                Qty
              </th>

              <th className="p-3">
                Per Size Breakdown
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {style.colors?.map((color) => (
              <tr
                key={
                  color.color_key ||
                  color.color_label
                }
              >
                <td className="p-3 font-bold text-[#c8834a]">
                  {color.color_label}
                </td>

                <td className="p-3 font-mono font-black">
                  {color.qty}
                </td>

                <td className="p-3 font-mono text-slate-600">
                  {Object.entries(
                    color.per_size_qty || {}
                  )
                    .map(
                      ([key, value]) =>
                        `${key}: ${value}`
                    )
                    .join(' · ')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="mt-4 flex justify-end gap-3">
        {style.spec_match_status !== 'suggested' &&
          !style.bom_id && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating}
              className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#c8834a] hover:bg-[#b0703c] disabled:opacity-50 shadow-sm"
            >
              {generating ? (
                <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
              ) : null}

              Generate BOM
            </button>
          )}

        {style.bom_id && (
          <span className="px-3 py-2 rounded-xl text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-200">
            BOM generated
          </span>
        )}
      </div>
    </SpotlightCard>
  );
}

