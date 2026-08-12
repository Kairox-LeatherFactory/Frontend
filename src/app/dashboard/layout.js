'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link, { useLinkStatus } from 'next/link';
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
const JACKET_BUILD_STAGES = [
  Layers,
  ScissorsLineDashed,
  Waypoints,
  Shirt,
];

/* Plays the leather→jacket build sequence in a nav icon's slot
   each time it becomes the active page */
function AnimatedNavIcon({ isActive, Icon, className }) {
  const [stage, setStage] = useState(-1);
  const [wasActive, setWasActive] = useState(false);

  useEffect(() => {
    if (isActive && !wasActive) {
      setStage(0);

      const timers = JACKET_BUILD_STAGES.map((_, i) =>
        setTimeout(
          () =>
            setStage(
              i + 1 < JACKET_BUILD_STAGES.length ? i + 1 : -1
            ),
          130 * (i + 1)
        )
      );

      setWasActive(true);

      return () => {
        timers.forEach(clearTimeout);
      };
    }

    if (!isActive) {
      setWasActive(false);
    }
  }, [isActive, wasActive]);

  const FrameIcon =
    stage >= 0 ? JACKET_BUILD_STAGES[stage] : Icon;

  return (
    <span className="relative inline-flex w-[18px] h-[18px] shrink-0 items-center justify-center">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={stage >= 0 ? `stage-${stage}` : 'settled'}
          initial={{
            opacity: 0,
            scale: 0.55,
            rotate: -10,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            rotate: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.55,
            rotate: 10,
          }}
          transition={{
            duration: 0.15,
            ease: 'easeOut',
          }}
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
  show: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.1,
    },
  },
};

const navItemAnim = {
  hidden: {
    opacity: 0,
    x: -14,
  },
  show: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.35,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};

// Subtle warm-toned grain for active navigation
const LEATHER_GRAIN_SVG = `data:image/svg+xml,${encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='80' height='80'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix type='matrix' values='0 0 0 0 1  0 0 0 0 0.92  0 0 0 0 0.78  0 0 0 0.08 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>"
)}`;

// Renders nothing until its parent <Link>'s navigation is actually pending,
// then paints a full-width progress bar fixed to the top of the viewport.
// Heavy pages like Attendance/Barcode can take a moment to render on a slow
// mobile connection — this gives instant visual feedback the moment you tap,
// instead of the screen looking dead while it loads.
function NavPendingBar() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <div className="fixed top-0 left-0 right-0 z-[100000] h-1 overflow-hidden pointer-events-none">
      <div className="h-full w-full" style={{ background: 'linear-gradient(90deg, #c8834a, #e8a06a)' }} />
    </div>
  );
}

export default function DashboardLayout({ children }) {
  const { user, logout, ROLES } = useAuth();
  const { orders } = useData();

  const router = useRouter();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingPoCount, setPendingPoCount] = useState(0);

  // --------------------------------------------------
  // Session gate
  // --------------------------------------------------

  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);

  // --------------------------------------------------
  // Close mobile menu whenever route changes
  // --------------------------------------------------

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  // --------------------------------------------------
  // Pending PO notification
  // --------------------------------------------------

  useEffect(() => {
    const checkPendingPOs = () => {
      try {
        const savedPO = localStorage.getItem(
          'po_state_SUB-MOCK-101'
        );

        if (!savedPO) {
          setPendingPoCount(0);
          return;
        }

        const { status } = JSON.parse(savedPO);

        if (
          user === 'cutting_manager' &&
          status === 'pending_approval'
        ) {
          setPendingPoCount(1);
        } else if (
          user === 'direct_manager' &&
          status === 'approved'
        ) {
          setPendingPoCount(1);
        } else {
          setPendingPoCount(0);
        }
      } catch (error) {
        setPendingPoCount(0);
      }
    };

    checkPendingPOs();

    const interval = setInterval(
      checkPendingPOs,
      2000
    );

    return () => clearInterval(interval);
  }, [user]);

  // --------------------------------------------------
  // Air freight risk orders
  // --------------------------------------------------

  const airRiskOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          o.freight_mode &&
          o.freight_mode.includes('RISK')
      ),
    [orders]
  );

  // --------------------------------------------------
  // Navigation links
  // --------------------------------------------------

  const navLinks = useMemo(() => {
    const links = [
      {
        name: 'Dashboard Home',
        href: '/dashboard',
      },
      {
        name: 'Analytics & Alerts',
        href: '/dashboard/analytics',
      },
      {
        name: 'Production Logger',
        href: '/dashboard/entry',
      },
      {
        name: 'Stage-Spread Progress',
        href: '/dashboard/progress',
      },
      {
        name: 'Client SKU Tree',
        href: '/dashboard/orders',
      },
      {
        name: 'Payroll & Rates',
        href: '/dashboard/wages',
      },
      {
        name: 'Attendance',
        href: '/dashboard/attendance',
      },
      {
        name: 'Barcode Management',
        href: '/dashboard/barcode',
      },

      // Procurement Suite
      {
        name: 'Procurement',
        href: '/dashboard/procurement',
        divider: true,
      },
      {
        name: 'New Intake',
        href: '/dashboard/procurement/intake',
      },
      {
        name: 'Inventory Check',
        href: '/dashboard/procurement/inventory',
      },
      {
        name: 'PO Tracker',
        href: '/dashboard/procurement/po',
      },

      // Admin
      {
        name: 'Admin & Users',
        href: '/dashboard/admin',
        divider: true,
      },
    ];

    if (user === 'security') {
      return links.filter(
        (link) => link.name === 'Attendance'
      );
    }

    return links;
  }, [user]);

  // --------------------------------------------------
  // Role information
  // --------------------------------------------------

  const roleInfo =
    ROLES[user] || {
      label: 'Viewer',
      color: 'bg-slate-100 text-slate-700',
    };

  // --------------------------------------------------
  // Loading state while auth is resolving
  // --------------------------------------------------

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-center text-[#c8834a]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c8834a] mx-auto mb-4" />

          <p className="font-semibold text-xs tracking-widest uppercase">
            Securing Session...
          </p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------
  // Main layout
  // --------------------------------------------------

  // Rendered independently for desktop and mobile — the desktop <aside> stays
  // mounted (just CSS-hidden below the `md` breakpoint) while the mobile
  // <motion.aside> mounts on top of it whenever the menu is open, so on a
  // narrow viewport both copies can be in the DOM at once. Each needs its own
  // `layoutId` namespace (see below) or Framer Motion's shared-layout
  // animation gets two simultaneously-mounted elements claiming the same id.
  const renderSidebar = (idPrefix) => (
    <>
      {/* Sidebar Brand */}
      <div className="h-20 flex items-center justify-between px-6 border-b" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <div className="flex items-center gap-2">
          <Factory className="w-7 h-7" style={{ color: '#c8834a' }} />
          <div>
            <span className="text-xl font-black tracking-widest text-white">KAIROX</span>
            <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: '#c8834a' }}>Leather Intelligence</p>
          </div>
        </div>
        <button type="button" onClick={() => setMobileMenuOpen(false)} className="md:hidden p-2 focus:outline-none" style={{ color: '#ffffff' }} aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      <motion.nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto" variants={navStagger} initial="hidden" animate="show">
        {navLinks.map((link) => {
          const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'));
          const IconComp = NAV_ICONS[link.href] || LayoutDashboard;
          return (
            <motion.div key={link.href} variants={navItemAnim}>
              {link.divider && (
                <div className="pt-4 pb-2 px-2">
                  <div className="h-px" style={{ background: 'rgba(200,131,74,0.15)' }} />
                </div>
              )}
              <Link href={link.href} onClick={() => setMobileMenuOpen(false)} className={`nav-item group ${isActive ? 'active' : ''} relative flex items-center justify-between w-full`}>
                <NavPendingBar />
                {isActive && (
                  <motion.span className="absolute inset-0 rounded-[10px] overflow-hidden" style={{ background: 'linear-gradient(135deg, #a8703f 0%, #8a5a2e 45%, #6b4423 100%)', boxShadow: 'inset 0 0 0 1px rgba(255,232,204,0.14), inset 0 2px 4px rgba(0,0,0,0.35), 0 3px 10px rgba(0,0,0,0.25)' }} transition={{ type: 'spring', stiffness: 460, damping: 28, mass: 0.9 }}>
                    <span className="absolute inset-0 opacity-70" style={{ backgroundImage: `url("${LEATHER_GRAIN_SVG}")`, backgroundSize: '80px 80px', mixBlendMode: 'overlay' }} />
                    <span className="absolute inset-[3px] rounded-[7px] pointer-events-none" style={{ border: '1.5px dashed rgba(255,238,214,0.45)' }} />
                    <motion.span className="absolute inset-y-0 w-8 pointer-events-none" style={{ background: 'linear-gradient(115deg, transparent, rgba(255,255,255,0.35), transparent)' }} initial={{ left: '-20%' }} animate={{ left: '120%' }} transition={{ duration: 0.7, delay: 0.12, ease: 'easeInOut' }} />
                  </motion.span>
                )}
                <div className="relative z-10 flex items-center gap-3">
                  <AnimatedNavIcon isActive={isActive} Icon={IconComp} className="w-[18px] h-[18px] transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-110" />
                  <span>{link.name}</span>
                </div>
                {link.name === 'New Intake' && (user === 'cutting_manager' || user === 'direct_manager') && pendingPoCount > 0 && (
                  <span className="relative z-10 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">{pendingPoCount}</span>
                )}
              </Link>
            </motion.div>
          );
        })}
      </motion.nav>

      {/* Sidebar Footer */}
      <div className="p-6 border-t text-xs text-center" style={{ borderColor: 'rgba(200,131,74,0.15)', color: '#a88a6a' }}>
        <p className="font-bold">Kairox Leather Platform</p>
        <p className="mt-1 opacity-70">Touch-Optimized Operations</p>
      </div>
    </>
  );

  const desktopSidebar = renderSidebar('desktop');
  const mobileSidebar = renderSidebar('mobile');

  return (
    <div
      className="min-h-screen flex flex-col md:flex-row"
      style={{
        background: '#faf6f0',
      }}
    >
      {/* ================================================
          DESKTOP SIDEBAR
          ================================================ */}
      <aside className="hidden md:flex flex-col static inset-auto z-auto w-72 shadow-2xl" style={{ background: 'linear-gradient(180deg, #3d2b1a 0%, #2a1d11 100%)', borderRight: '1px solid rgba(200,131,74,0.2)', color: '#ffffff' }}>
        {desktopSidebar}
      </aside>

      {/* ================================================
          MOBILE SIDEBAR (Instant Unmount)
          ================================================ */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-hidden="true"
          />
          <aside
            className="md:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col shadow-2xl"
            style={{ background: 'linear-gradient(180deg, #3d2b1a 0%, #2a1d11 100%)', borderRight: '1px solid rgba(200,131,74,0.2)', color: '#ffffff' }}
          >
            {mobileSidebar}
          </aside>
        </>
      )}

      {/* ================================================
          MAIN CONTENT
          ================================================ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen md:min-h-0">
        {/* Header */}

        <motion.header
          initial={{
            opacity: 0,
            y: -12,
          }}
          animate={{
            opacity: 1,
            y: 0,
          }}
          transition={{
            duration: 0.4,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="h-20 flex items-center justify-between px-6 sticky top-0 z-30"
          style={{
            background: '#faf6f0',
            borderBottom:
              '1px solid rgba(200,131,74,0.15)',
            boxShadow:
              '0 4px 20px rgba(0,0,0,0.02)',
          }}
        >
          {/* Left */}

          <div className="flex items-center gap-4">
            {/* Mobile hamburger */}

            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(
                  (previous) => !previous
                )
              }
              className="md:hidden text-2xl p-2 rounded-lg"
              style={{
                color: '#2d1f0e',
                background:
                  'rgba(200,131,74,0.1)',
              }}
              aria-label="Open menu"
              aria-expanded={
                mobileMenuOpen
              }
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="hidden sm:block">
              <h2
                className="text-xl font-bold"
                style={{
                  color: '#3d2b1a',
                }}
              >
                Shop Floor Command
              </h2>

              <p
                className="text-xs"
                style={{
                  color: '#9a8a7a',
                }}
              >
                Production, wages, and
                compliance tracking
              </p>
            </div>
          </div>

          {/* User section */}

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p
                className="text-xs font-bold tracking-wide uppercase"
                style={{
                  color: '#9a8a7a',
                }}
              >
                Active Persona
              </p>

              <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                <span
                  className={`badge ${roleInfo.color}`}
                >
                  {roleInfo.label}
                </span>
              </div>
            </div>

            {/* Logout */}

            <button
              type="button"
              onClick={() => logout()}
              className="h-12 py-0 px-4 min-h-[48px] rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
              style={{
                border:
                  '1px solid rgba(200,131,74,0.4)',
                color: '#a86022',
                background: 'transparent',
              }}
              title="Logout session"
            >
              <LogOut className="w-4 h-4" />

              <span className="hidden md:inline">
                Sign Out
              </span>
            </button>
          </div>
        </motion.header>

        {/* ================================================
            AIR FREIGHT WARNING
            ================================================ */}

        <AnimatePresence>
          {airRiskOrders.length > 0 && (
            <motion.div
              key="air-freight-warning"
              initial={{
                opacity: 0,
                height: 0,
              }}
              animate={{
                opacity: 1,
                height: 'auto',
              }}
              exit={{
                opacity: 0,
                height: 0,
              }}
              transition={{
                duration: 0.35,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="overflow-hidden border-b border-red-700"
            >
              <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white p-4 font-bold text-sm shadow-md flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <TriangleAlert className="w-6 h-6 animate-pulse flex-shrink-0" />

                  <div>
                    <p className="text-sm font-black tracking-wide">
                      AIR FREIGHT PENALTY WARNING
                      DETECTED!
                    </p>

                    <p className="text-xs text-red-100 font-medium">
                      {airRiskOrders
                        .map(
                          (o) =>
                            `${o.client} (${o.style} - ${o.colorway}) is delayed by ${o.delay_days} days!`
                        )
                        .join(', ')}
                    </p>
                  </div>
                </div>

                <div className="px-4 py-2 bg-white/20 border border-white/30 rounded-lg text-xs font-black uppercase text-center sm:text-right">
                  Air Mode Triggers Over 2-Day
                  Delay • Margins Shrink ~35%
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================================================
            PAGE CONTENT

            IMPORTANT:
            No artificial loading state.
            No MutationObserver.
            No forced repaint.
            No display:none.
            No translateZ hack — `transform-gpu` does the same GPU-layer
            promotion under a different name and was the original suspect
            for the mobile stuck-paint bug, so it stays off too.
            ================================================ */}

        <main
          className="flex-1 p-6 md:p-8 max-w-7xl w-full min-h-screen overflow-y-auto z-0 mx-auto relative transition-opacity duration-200"
          style={{
            background: '#faf6f0',
            isolation: 'isolate',
            transform: 'translateZ(0)',
            WebkitTransform: 'translateZ(0)',
            willChange: 'transform',
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
}
