
'use client';

import { motion } from 'framer-motion';
import OrdersExplorer from './OrdersExplorer';
import { TrendingUp,Warehouse } from 'lucide-react';
const tabFade = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] } },
};
export default function AnalyticsDashboard() {
  return (
    <div
      className="relative min-h-screen -m-6 p-4 sm:p-8 pb-16 overflow-hidden"
      style={{ background: 'linear-gradient(135deg, #fdfbf7 0%, #f4efe6 45%, #ecdec7 100%)' }}
    >
      {/* ambient depth blobs */}
      <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(200,131,74,0.14), transparent)' }} />
      <div className="absolute top-[40%] -left-32 w-[380px] h-[380px] rounded-full blur-3xl pointer-events-none" style={{ background: 'radial-gradient(closest-side, rgba(37,99,235,0.08), transparent)' }} />

      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 relative z-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md shadow-[#c8834a]/20"
              style={{ background: 'linear-gradient(135deg, #c8834a, #a0622e)' }}>
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Live</span>
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#2d1f0e] mb-1">
            Analytics &amp; Operations
          </h1>
          <p className="text-slate-500 font-medium text-sm">Live factory intelligence and order exploration.</p>
        </div>
      </div>

      <motion.div variants={tabFade} initial="hidden" animate="show" className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100">
            <Warehouse className="w-5 h-5 text-[#c8834a]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#2d1f0e]">Orders Explorer</h2>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">Drill down into order quantities and view structured data.</p>
          </div>
        </div>

        <OrdersExplorer />
      </motion.div>
    </div>
  );
}
