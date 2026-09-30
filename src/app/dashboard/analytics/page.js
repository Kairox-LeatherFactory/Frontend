'use client';
import { motion } from 'framer-motion';
import { Warehouse } from 'lucide-react';
import { tabFade } from './_lib/constants';
import OrdersExplorer from './_components/OrdersExplorer';

/**
 * AnalyticsDashboard Component
 *
 * Primary entry page for the Analytics & Operations module.
 * Provides live factory intelligence, piece-level order exploration,
 * and stage traveler inspection.
 *
 * Structure:
 *   - Ambient gradient backdrop with glowing depth spheres
 *   - Header with real-time operational status indicator
 *   - `OrdersExplorer`: 3-tier hierarchical navigator (Client/Order -> Style Details -> Piece Traveler)
 *
 * @returns {JSX.Element} Analytics dashboard page.
 */
export default function AnalyticsDashboard() {
  return (
    <div
      className="relative min-h-screen -m-6 p-4 sm:p-8 pb-16 overflow-hidden"
      style={{
        background: 'linear-gradient(135deg, #fdfbf7 0%, #f4efe6 45%, #ecdec7 100%)',
      }}
    >
      {/* Ambient Depth Background Blobs */}
      <div
        className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(200,131,74,0.14), transparent)',
        }}
      />
      <div
        className="absolute top-[40%] -left-32 w-[380px] h-[380px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'radial-gradient(closest-side, rgba(37,99,235,0.08), transparent)',
        }}
      />

      {/* Main Content Area — page title is shown in the app header */}
      <motion.div
        variants={tabFade}
        initial="hidden"
        animate="show"
        className="relative z-10"
      >
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white shadow-sm border border-slate-100">
            <Warehouse className="w-5 h-5 text-[#c8834a]" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-[#2d1f0e]">
              Orders Explorer
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm font-medium">
              Drill down into order quantities and view structured data.
            </p>
          </div>
        </div>

        {/* Master Orders Explorer Component */}
        <OrdersExplorer />
      </motion.div>
    </div>
  );
}
