'use client';
import { Warehouse } from 'lucide-react';

/**
 * OrderLevelCard Component (Level 1)
 *
 * Displays top-level information for a chosen Client and Production Order:
 * - Client Name and Order Identifier
 * - Purchase Order (PO) Number
 * - Total number of associated styles
 * - Total number of pieces in production
 *
 * @param {Object} props
 * @param {Object} props.group - The selected order group object (client, PO, raw ID).
 * @param {Object|null} props.treeData - Associated order tree hierarchy data from the API.
 * @returns {JSX.Element} Level 1 order summary card.
 */
export default function OrderLevelCard({ group, treeData }) {
  if (!group) return null;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      {/* Card Header */}
      <div className="bg-slate-50 border-b border-slate-200 px-5 py-3.5 flex items-center gap-2.5">
        <Warehouse className="w-4 h-4 text-slate-500" />
        <span className="text-xs font-black uppercase tracking-widest text-slate-500">
          Level 1 · Client / Order
        </span>
      </div>

      {/* Card Body */}
      <div className="p-6">
        <p className="text-2xl font-black" style={{ color: '#c8834a' }}>
          {group.client}
        </p>
        <p className="text-sm text-slate-400 font-mono mt-1 mb-5">{group.rawId}</p>

        {/* 3 Metric Pills: PO Number, Styles Count, Pieces Count */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              PO Number
            </p>
            <p className="text-lg font-black text-slate-800 truncate">{group.po}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Styles
            </p>
            <p className="text-lg font-black text-slate-800">{treeData?.style_count || 0}</p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Pieces
            </p>
            <p className="text-lg font-black text-slate-800">{treeData?.piece_count || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
