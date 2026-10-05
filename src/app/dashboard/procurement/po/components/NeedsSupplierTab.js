'use client';

import React from 'react';
import { AlertTriangle, Sparkles, UserCheck } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';

export default function NeedsSupplierTab({
  needsSupplierPos,
  handleAssignSupplier,
  actionLoading,
  setAssignModalPo,
}) {
  return (
    <div className="space-y-4">
      <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
          <div>
            <h3 className="font-black text-sm text-red-900">Blocking PO Queue</h3>
            <p className="text-xs text-red-700 font-semibold">
              These purchase orders have shortfalls but no matching supplier in the ledger. Select a supplier to unblock production.
            </p>
          </div>
        </div>
        <span className="px-3 py-1 bg-red-600 text-white font-black text-xs rounded-full">
          {needsSupplierPos.length} Pending
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {needsSupplierPos.map((po) => (
          <SpotlightCard
            key={po.id}
            className="p-5 bg-white rounded-3xl shadow-md border border-red-200"
            spotlightColor="rgba(239,68,68,0.04)"
          >
            <div className="flex justify-between items-start mb-3">
              <div>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-800">
                  Unassigned PO · {po.buyer_ref}
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1">
                  {po.items?.[0]?.description || 'Required Material Shortfall'}
                </h3>
              </div>
              <span className="text-lg font-black text-slate-900">
                ₹{po.total?.toLocaleString()}
              </span>
            </div>

            <p className="text-xs text-slate-600 font-semibold mb-4">
              Required Qty:{' '}
              <b className="text-slate-900">
                {po.items?.[0]?.qty} {po.items?.[0]?.uom}
              </b>{' '}
              · GST Mode: {po.gst_mode}
            </p>

            {/* Candidate Suggestions */}
            {po.candidates?.ranked && (
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3 mb-4 space-y-2">
                <p className="text-[10px] font-black text-amber-900 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-600" /> AI Matched Supplier Recommendations
                </p>
                {po.candidates.ranked.map((c) => (
                  <div
                    key={c.supplier_id}
                    className="flex items-center justify-between bg-white p-2 rounded-xl border border-amber-200 text-xs"
                  >
                    <div>
                      <p className="font-black text-slate-900">{c.supplier_name}</p>
                      <p className="text-[10px] text-slate-500 font-bold">
                        Score: {Math.round(c.score * 100)}% · Last Rate: ₹{c.last_rate} ({c.txn_count} txns)
                      </p>
                    </div>
                    <button
                      onClick={() => handleAssignSupplier(po.id, c.supplier_id)}
                      disabled={actionLoading}
                      className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded-lg text-xs font-extrabold transition-all"
                    >
                      Select
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={() => setAssignModalPo(po)}
              className="w-full py-2.5 bg-[#2d1f0e] hover:bg-[#3d2b1a] text-white font-black text-xs rounded-xl flex items-center justify-center gap-2 transition-all"
            >
              <UserCheck className="w-4 h-4" /> Pick Custom Supplier from Directory
            </button>
          </SpotlightCard>
        ))}

        {needsSupplierPos.length === 0 && (
          <div className="col-span-2 text-center py-16 bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500 font-bold">
            🎉 All Purchase Orders have assigned suppliers! No blocking items.
          </div>
        )}
      </div>
    </div>
  );
}
