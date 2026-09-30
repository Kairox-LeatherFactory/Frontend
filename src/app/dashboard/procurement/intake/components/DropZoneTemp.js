import { useCallback, useRef, useState } from 'react';
import { CheckCircle2, X } from 'lucide-react';
export default function DropZone({
  label,
  accept,
  icon: Icon,
  file,
  onFile,
  onClear,
  description,
  disabled,
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const drop = useCallback(
    (e) => {
      e.preventDefault();

      if (disabled) return;

      setDragging(false);

      const file = e.dataTransfer.files?.[0];

      if (file) {
        onFile(file);
      }
    },
    [disabled, onFile]
  );

  return (
    <div>
      <p className="text-xs font-black uppercase tracking-wider mb-2 text-[#c8834a]">
        {label}
      </p>

      {file ? (
        <div className="flex items-center justify-between p-4 rounded-2xl bg-[#f0fdf4] border border-emerald-300">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" />

            <div>
              <p className="text-sm font-black text-[#c8834a]">
                {file.name}
              </p>

              <p className="text-[10px] font-bold text-slate-500">
                {(file.size / 1024).toFixed(1)} KB · Ready for parsing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="p-1.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div
          onClick={() =>
            !disabled && inputRef.current?.click()
          }
          onDrop={drop}
          onDragOver={(e) => {
            e.preventDefault();

            if (!disabled) {
              setDragging(true);
            }
          }}
          onDragLeave={() => setDragging(false)}
          className={`flex flex-col items-center justify-center gap-2.5 p-8 rounded-2xl border-2 border-dashed transition-all ${
            disabled
              ? 'opacity-50 cursor-not-allowed bg-slate-50 border-slate-200'
              : 'cursor-pointer hover:border-[#c8834a] bg-[#faf6f0]'
          }`}
          style={{
            borderColor: dragging
              ? '#c8834a'
              : 'rgba(45, 31, 14, 0.2)',
          }}
        >
          <div className="w-12 h-12 rounded-2xl bg-[#c8834a] text-white flex items-center justify-center shadow-sm">
            <Icon className="w-6 h-6" />
          </div>

          <div className="text-center">
            <p className="text-sm font-black text-[#c8834a]">
              Upload {label}
            </p>

            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {description}
            </p>

            <span className="inline-block mt-2 px-3 py-1 rounded-lg bg-[#c8834a] text-white text-[10px] font-black uppercase tracking-wider">
              Browse Files (.xlsx, .pdf, .csv)
            </span>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept={accept || '*/*'}
            className="hidden"
            disabled={disabled}
            onChange={(e) => {
              const file = e.target.files?.[0];

              if (file) {
                onFile(file);
              }

              e.target.value = '';
            }}
          />
        </div>
      )}
    </div>
  );
}

