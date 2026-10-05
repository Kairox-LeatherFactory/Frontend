'use client';

import React from 'react';
import { Loader2, Layers } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function ProductionReleaseCard({
  breaking,
  styles = [],
  handleReleaseBreakdown,
}) {
  const isReleaseDisabled =
    breaking ||
    styles.some(
      (style) =>
        style.needs_lining === null || style.needs_lining === undefined
    );

  return (
    <SpotlightCard className="p-6 bg-white rounded-3xl border border-amber-900/15 shadow-md">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-[#c8834a]">
            Release Gate · Mint Garment Barcodes
          </span>
          <h3 className="text-xl font-black text-[#c8834a] mt-0.5">
            Release Order into Production
          </h3>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            This action mints permanent <code>PC-XXXXXX</code> barcodes for all
            garments in this order.
            <br />
            <b>Requirement:</b> Every style must have an explicit{' '}
            <b>Needs Lining (Yes/No)</b> answer before release.
          </p>
        </div>

        <button
          type="button"
          onClick={handleReleaseBreakdown}
          disabled={isReleaseDisabled}
          className="px-6 py-3.5 bg-[#c8834a] hover:bg-[#b0703c] text-white font-black text-xs rounded-2xl disabled:opacity-40 shadow-lg flex items-center gap-2 shrink-0 transition-all"
        >
          {breaking ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Layers className="w-4 h-4" />
          )}
          <span>Release Styles & Mint Barcodes</span>
        </button>
      </div>
    </SpotlightCard>
  );
}
