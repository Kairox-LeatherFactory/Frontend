'use client';

import React from 'react';
import { X } from 'lucide-react';

export default function AssignSupplierModal({
  assignModalPo,
  setAssignModalPo,
  suppliers = [],
  handleAssignSupplier,
  actionLoading,
}) {
  if (!assignModalPo) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-6 bg-[#faf6f0] border-b border-amber-900/10 flex justify-between items-center">
          <div>
            <h3 className="text-xl font-black text-slate-900">
              Select Supplier
            </h3>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">
              Assign a registered supplier to unblock item shortfall
            </p>
          </div>
          <button
            onClick={() => setAssignModalPo(null)}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-3">
          {suppliers.map((sup) => (
            <div
              key={sup.id}
              className="p-4 rounded-2xl border border-slate-200 hover:border-amber-500 bg-white flex justify-between items-center transition-all"
            >
              <div>
                <h4 className="font-black text-sm text-slate-900">
                  {sup.name}
                </h4>
                <p className="text-xs text-slate-500 font-semibold">
                  {sup.service} · GSTIN: {sup.gstin}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-1">
                  Lead time: {sup.lead_time_days} days · Terms:{' '}
                  {sup.payment_terms_days} days
                </p>
              </div>
              <button
                onClick={() => handleAssignSupplier(assignModalPo.id, sup.id)}
                disabled={actionLoading}
                className="px-4 py-2 bg-[#2d1f0e] hover:bg-[#3d2b1a] text-white font-black text-xs rounded-xl"
              >
                Select
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
