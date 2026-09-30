'use client';
import { motion } from 'framer-motion';
import { Layers, Package } from 'lucide-react';
import { formatSqft } from '../../_lib/helpers';

/**
 * ============================================================================
 * LeatherLotTab Component (Cutting)
 * ============================================================================
 */
export default function LeatherLotTab({
  leatherLots = [],
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full space-y-6"
    >
      <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-blue-600" />
              Leather Lot Stock &amp; Raw Material Inventory
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Available skin square footage, issued batches &amp; cutting yields
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-blue-50 text-blue-700">
            {leatherLots.length} Leather Lots
          </span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200/60">
          <table className="w-full text-xs md:text-sm text-left">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-3 px-4">Lot Code</th>
                <th className="py-3 px-4">Article</th>
                <th className="py-3 px-4">Colour</th>
                <th className="py-3 px-4 text-right">Received Sqft</th>
                <th className="py-3 px-4 text-right">Consumed Sqft</th>
                <th className="py-3 px-4 text-right">Balance Sqft</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {leatherLots.map((lot, idx) => (
                <tr key={`lot-${lot.lot_code || idx}`} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{lot.lot_code}</td>
                  <td className="py-3.5 px-4 font-bold text-slate-800">{lot.article}</td>
                  <td className="py-3.5 px-4 text-slate-600">{lot.colour}</td>
                  <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-900">
                    {formatSqft(lot.received_sqft)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-blue-700 font-bold">
                    {formatSqft(lot.consumed_sqft)}
                  </td>
                  <td className="py-3.5 px-4 text-right font-mono text-emerald-700 font-black">
                    {formatSqft(lot.balance_sqft)}
                  </td>
                </tr>
              ))}
              {leatherLots.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                    No leather lot records available.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
}
