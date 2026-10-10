'use client';

// The production line's stages, shared by the role dashboards (DM,
// Stitching, …): names, icons, the queue in front of each stage, and the
// stage card + grid.

import { useEffect, useRef, useState } from 'react';
import {
  ChevronRight,
  CircleDot,
  Flame,
  Layers,
  Loader2,
  Package,
  PackageCheck,
  PenTool,
  Scissors,
  SearchCheck,
  Sparkles,
  SquarePen,
} from 'lucide-react';

export function stageName(stage) {
  return String(stage || '')
    .toLowerCase()
    .split('_')
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(' ');
}

export function StageIcon({ stageKey, ...props }) {
  const k = String(stageKey).toUpperCase();
  if (k.includes('LINING')) return <Layers {...props} />;
  if (k.includes('CUT')) return <Scissors {...props} />;
  if (k.includes('FUS')) return <Flame {...props} />;
  if (k.includes('PAST')) return <SquarePen {...props} />;
  if (k.includes('STORE')) return <Package {...props} />;
  if (k.includes('STITCH')) return <PenTool {...props} />;
  if (k.includes('FINISH')) return <Sparkles {...props} />;
  if (k.includes('INSPECT') || k.includes('QC')) return <SearchCheck {...props} />;
  if (k.includes('PACK')) return <PackageCheck {...props} />;
  return <CircleDot {...props} />;
}

// Lining cutting runs beside the line (into the store), not in it.
export function isSideStage(stage) {
  return stage.kind === 'PARALLEL' || String(stage.key).toUpperCase().includes('LINING');
}

// Each stage's waiting from how far pieces have got, not from subtracting
// counts. The backend's waiting is the previous stage's done minus this
// one's, skipping the Store, so it counts pieces still in the store as
// waiting at Line Stitching, and goes to 0 when pieces skip a stage (an
// outside factory can shell-stitch pieces that were never line-stitched).
// A piece has "reached" a stage if it was done there or at any later stage:
// at least the most done at it or after it. Then
//   waiting = reached the stage before (the Store counts) − reached this one
//   skipped = reached this one − done here
// so each cut piece is counted once: done further on, waiting, or skipped.
// The first stage keeps its own waiting (against the whole order), as does
// lining cutting. `list` is in line order: [{ key, kind, done, waiting }].
export function withFlowQueues(list) {
  const chain = list.filter((s) => !isSideStage(s));
  const reached = new Map();
  let furthest = 0;
  for (let i = chain.length - 1; i >= 0; i -= 1) {
    furthest = Math.max(furthest, chain[i].done ?? 0);
    reached.set(chain[i].key, furthest);
  }
  return list.map((s) => {
    const idx = chain.indexOf(s);
    if (idx <= 0) return { ...s, skipped: 0 };
    const here = reached.get(s.key);
    return {
      ...s,
      waiting: Math.max(reached.get(chain[idx - 1].key) - here, 0),
      skipped: here - (s.done ?? 0),
    };
  });
}

// `stage.done`: number, undefined = still loading, null = no count (the
// reason is in `stage.missing`). `stage.waiting`: number, or null = hidden.
// The bar only shows unfiltered, where done and waiting share a time frame.
// `stage.selectLabel` overrides the "Show … workers" hint.
export function StageCard({ stage, selected, onSelect }) {
  // Skipped pieces have moved on, so they fill the bar like done ones.
  const skipped = stage.skipped ?? 0;
  const total = (stage.done ?? 0) + (stage.waiting ?? 0) + skipped;
  const donePct = total > 0 ? Math.round((((stage.done ?? 0) + skipped) / total) * 100) : 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      title={selected ? 'Hide details' : (stage.selectLabel ?? `Show ${stage.name} workers`)}
      className={`relative block w-full h-full text-left rounded-2xl border p-3.5 cursor-pointer transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8834a] ${
        stage.stuck
          ? 'border-[#f4cf7a] bg-[#fff6df] shadow-[0_10px_24px_-10px_rgba(245,165,36,0.45)]'
          : 'border-[#efe6d6] bg-white hover:shadow-[0_8px_20px_-12px_rgba(160,110,40,0.35)]'
      } ${selected ? 'ring-2 ring-[#c8834a] ring-offset-2 ring-offset-[#fffdf9]' : ''}`}
    >
      {stage.stuck && (
        <span
          aria-hidden="true"
          className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-[#f5a524] ring-2 ring-[#fffdf9] text-white text-[10px] font-bold flex items-center justify-center"
        >
          !
        </span>
      )}

      <span className="flex items-center gap-2.5">
        <span
          className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${
            stage.stuck ? 'bg-[#ffe9b0] text-[#e08a12]' : 'bg-[#e6f4ec] text-[#3f9a74]'
          }`}
        >
          <StageIcon stageKey={stage.key} className="w-[18px] h-[18px]" strokeWidth={1.8} />
        </span>
        <span className="min-w-0 text-[13px] font-semibold leading-tight text-[#2b2118]">{stage.name}</span>
      </span>

      {stage.done === undefined ? (
        <span className="flex items-center mt-4 h-7 text-[#a89c8a]">
          <Loader2 aria-label="Loading" className="w-4 h-4 animate-spin" />
        </span>
      ) : stage.done === null ? (
        <span className="block mt-4 text-sm text-[#a89c8a]">
          <span className="text-lg font-semibold">—</span>
          <span className="block text-[11px] leading-snug">{stage.missing}</span>
        </span>
      ) : (
        <span className="block mt-4 text-sm text-[#2f8f6b]">
          <span className="text-lg font-semibold tabular-nums">{stage.done.toLocaleString()}</span> done
        </span>
      )}
      {stage.waiting !== null && (
        <span className="block text-sm text-[#df8d1c]">
          <span className="text-lg font-semibold tabular-nums">{stage.waiting.toLocaleString()}</span>{' '}
          {stage.waitingLabel}
        </span>
      )}
      {skipped > 0 && (
        <span className="block text-[13px] text-[#8b7f6e]">
          <span className="font-semibold tabular-nums">{skipped.toLocaleString()}</span> skipped
        </span>
      )}

      {stage.showBar && (
        <span className="block mt-3 h-2 rounded-full bg-[#ece6db] overflow-hidden">
          <span
            className={`block h-full rounded-full ${stage.stuck ? 'bg-[#f5b335]' : 'bg-[#4caf8a]'}`}
            style={{ width: `${donePct}%` }}
          />
        </span>
      )}

      {stage.stuck && (
        <span className="absolute left-1/2 -translate-x-1/2 -bottom-4 whitespace-nowrap rounded-full border border-[#f4cf7a] bg-[#ffe9b0] px-3 py-1 text-[11px] font-semibold text-[#7a4b06] shadow-sm">
          Most work stuck here
        </span>
      )}
    </button>
  );
}

export const STAGE_MIN_WIDTH = 136;
export const STAGE_GAP = 14;

// All stages always visible — no sideways scrolling. Uses the fewest rows that
// fit the card and spreads the stages evenly across them (e.g. 10 stages →
// one row of 10, or two rows of 5). Arrows only between cards in the same row.
export function StageGrid({ stages, selectedKey, onSelect }) {
  const gridRef = useRef(null);
  const [cols, setCols] = useState(null);
  const count = stages.length;

  useEffect(() => {
    const el = gridRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const fit = Math.max(1, Math.floor((entry.contentRect.width + STAGE_GAP) / (STAGE_MIN_WIDTH + STAGE_GAP)));
      const rows = Math.ceil(count / fit);
      setCols(Math.ceil(count / rows));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [count]);

  return (
    <div
      ref={gridRef}
      className="grid"
      style={{
        columnGap: STAGE_GAP,
        rowGap: 28,
        gridTemplateColumns: cols
          ? `repeat(${cols}, minmax(0, 1fr))`
          : `repeat(auto-fill, minmax(${STAGE_MIN_WIDTH}px, 1fr))`,
      }}
    >
      {stages.map((stage, idx) => (
        <div key={`${stage.key}-${idx}`} className="relative min-w-0">
          {cols !== null && idx % cols !== 0 && (
            <ChevronRight
              aria-hidden="true"
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 text-[#c2b6a3]"
              style={{ left: -(STAGE_GAP / 2) - 6 }}
            />
          )}
          <StageCard stage={stage} selected={stage.key === selectedKey} onSelect={() => onSelect(stage.key)} />
        </div>
      ))}
    </div>
  );
}
