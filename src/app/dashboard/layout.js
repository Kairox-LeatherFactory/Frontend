'use client';
import { useEffect, useRef, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useData } from '@/context/DataContext';
import {
  Factory,
  LayoutDashboard,
  ClipboardPen,
  BarChart3,
  TreePine,
  Wallet,
  Gamepad2,
  ScanSearch,
  X,
  Menu,
  LogOut,
  TriangleAlert,
  BotMessageSquare,
  ShieldCheck,
  Settings,
  ShoppingCart,
  UploadCloud,
  Layers,
  Barcode,
  ScissorsLineDashed,
  Waypoints,
  Shirt,
} from 'lucide-react';

// Raw hide → cut pattern pieces → stitched seam → finished jacket
const JACKET_BUILD_STAGES = [Layers, ScissorsLineDashed, Waypoints, Shirt];

/* Plays the leather→jacket build sequence in a nav icon's slot each time it becomes the active page */
function AnimatedNavIcon({ isActive, Icon, className }) {
  const [stage, setStage] = useState(-1); // -1 = settled on the page's real icon
  const wasActive = useRef(false);

  useEffect(() => {
    if (isActive && !wasActive.current) {
      setStage(0);
      const timers = JACKET_BUILD_STAGES.map((_, i) =>
        setTimeout(() => setStage(i + 1 < JACKET_BUILD_STAGES.length ? i + 1 : -1), 130 * (i + 1))
      );
      wasActive.current = true;
      return () => timers.forEach(clearTimeout);
    }
    wasActive.current = isActive;
  }, [isActive]);

  const FrameIcon = stage >= 0 ? JACKET_BUILD_STAGES[stage] : Icon;

  return (
    <span className="relative inline-flex w-[18px] h-[18px] shrink-0 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={stage >= 0 ? `stage-${stage}` : 'settled'}
          initial={{ opacity: 0, scale: 0.55, rotate: -10 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.55, rotate: 10 }}
          transition={{ duration: 0.15, ease: 'easeOut' }}
          className="absolute inset-0 flex items-center justify-center"
        >
          <FrameIcon className={className} />
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

const NAV_ICONS = {
  '/dashboard': LayoutDashboard,
  '/dashboard/analytics': BarChart3,
  '/dashboard/entry': ClipboardPen,
  '/dashboard/store': Layers,
  '/dashboard/progress': BarChart3,
  '/dashboard/orders': TreePine,
  '/dashboard/wages': Wallet,
  '/dashboard/simulator': Gamepad2,
  '/dashboard/tracer': ScanSearch,
  '/dashboard/chat': BotMessageSquare,
  '/dashboard/attendance': ClipboardPen,
  '/dashboard/barcode': Barcode,
  '/dashboard/admin': ShieldCheck,
  '/dashboard/settings': Settings,
  '/dashboard/procurement': ShoppingCart,
  '/dashboard/procurement/intake': UploadCloud,
  '/dashboard/procurement/inventory': Layers,
  '/dashboard/procurement/po': ShoppingCart,
};

const navStagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.045, delayChildren: 0.1 } },
};
const navItemAnim = {
  hidden: { opacity: 0, x: -14 },
  show: { opacity: 1, x: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// Subtle warm-toned grain, generated inline so the active nav patch reads as leather, not flat color
const LEATHER_GRAIN_SVG = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 0.92  0 0 0 0 0.78  0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>"
)}`;

export default function DashboardLayout({ children }) {
                        background: 'linear-gradient(135deg, #a8703f 0%, #8a5a2e 45%, #6b4423 100%)',
                        boxShadow: 'inset 0 0 0 1px rgba(255,232,204,0.14), inset 0 2px 4px rgba(0,0,0,0.35), 0 3px 10px rgba(0,0,0,0.25)',
                      }}
                      transition={{ type: 'spring', stiffness: 460, damping: 28, mass: 0.9 }}
                    >
                      {/* leather grain */}
                      <span
                        className="absolute inset-0 opacity-70"
                        style={{ backgroundImage: `url("${LEATHER_GRAIN_SVG}")`, backgroundSize: '80px 80px', mixBlendMode: 'overlay' }}
                      />
                      {/* saddle-stitched seam */}
                      <span
                        className="absolute inset-[3px] rounded-[7px] pointer-events-none"
                        style={{ border: '1.5px dashed rgba(255,238,214,0.45)' }}
                      />
                      {/* sheen that sweeps across as the patch settles into its new stage */}
                      <motion.span
                        className="absolute inset-y-0 w-8 pointer-events-none"
                        style={{ background: 'linear-gradient(115deg, transparent, rgba(255,255,255,0.35), transparent)' }}
                        initial={{ left: '-20%' }}
                        animate={{ left: '120%' }}
                        transition={{ duration: 0.7, delay: 0.12, ease: 'easeInOut' }}
                      />
                    </motion.span>
                  )}
                  <div className="relative z-10 flex items-center gap-3">
                    <AnimatedNavIcon
                      isActive={isActive}
                      Icon={IconComp}
                      className="w-[18px] h-[18px] transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110"
                    />
                    <span>{link.name}</span>
                  </div>
                  {link.name === 'New Intake' && (user === 'cutting_manager' || user === 'direct_manager') && pendingPoCount > 0 && (
                    <span className="relative z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                      {pendingPoCount}
                    </span>
                  )}
                </Link>
              </motion.div>
            );
          })}
        </motion.nav>

        {/* Sidebar Footer Info */}
        <div className="p-6 border-t text-xs text-center" style={{ borderColor: 'rgba(200,131,74,0.15)', color: '#a88a6a' }}>
          <p className="font-bold">Kairox Leather Platform</p>
          <p className="mt-1 opacity-70">Touch-Optimized Operations</p>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            key="mobile-overlay"
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">

        {/* ─── TOP BAR HEADER ─── */}
        <motion.header
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="h-20 flex items-center justify-between px-6 sticky top-0 z-30" style={{ background: '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.15)', boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          <div className="flex items-center gap-4">
            {/* Mobile hamburger menu toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-2xl p-2 rounded-lg" style={{ color: '#2d1f0e', background: 'rgba(200,131,74,0.1)' }}>
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-xl font-bold" style={{ color: '#3d2b1a' }}>Shop Floor Command</h2>
              <p className="text-xs" style={{ color: '#9a8a7a' }}>Production, wages, and compliance tracking</p>
            </div>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold tracking-wide uppercase" style={{ color: '#9a8a7a' }}>Active Persona</p>
              <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                <span className={`badge ${roleInfo.color}`}>{roleInfo.label}</span>
              </div>
            </div>

            {/* Logout button (at least 48px high/wide click targets) */}
            <button
              onClick={() => logout()}
              className="h-12 py-0 px-4 min-h-[48px] rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
              style={{ border: '1px solid rgba(200,131,74,0.4)', color: '#a86022', background: 'transparent' }}
              title="Logout session"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </motion.header>

        {/* ─── WARNING BANNER (Air Freight Cutoff Watch) ─── */}
        <AnimatePresence>
          {airRiskOrders.length > 0 && (
            <motion.div
              key="air-freight-warning"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="overflow-hidden border-b border-red-700"
            >
              <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white p-4 font-bold text-sm shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <TriangleAlert className="w-6 h-6 animate-pulse flex-shrink-0" />
                  <div>
                    <p className="text-sm font-black tracking-wide">
                      AIR FREIGHT PENALTY WARNING DETECTED!
                    </p>
                    <p className="text-xs text-red-100 font-medium">
                      {airRiskOrders.map((o) => `${o.client} (${o.style} - ${o.colorway}) is delayed by ${o.delay_days} days!`).join(', ')}
                    </p>
                  </div>
                </div>
                <div className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-xs font-black uppercase text-center sm:text-right">
                  Air Mode Triggers Over 2-Day Delay • Margins Shrink ~35%
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ─── PAGE ROUTER CONTENT ─── */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto overflow-y-auto relative" style={{ background: '#faf6f0', transform: 'translateZ(0)' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
