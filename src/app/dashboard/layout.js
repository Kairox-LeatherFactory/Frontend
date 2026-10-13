'use client';
import { Fragment, useEffect, useMemo, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Link, { useLinkStatus } from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useGetMeQuery } from '@/store/slices/apiSlice';
import { PageTrailProvider } from '@/context/PageTrailContext';
import DashboardLoading from './loading';
import {
  ChevronRight,
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
  Boxes,
  Package,
  Scissors,
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
  '/dashboard': ScissorsLineDashed,
  '/dashboard/dashboards/dm': Factory,
  '/dashboard/dashboards/cutting': ScissorsLineDashed,
  '/dashboard/dashboards/lining': Shirt,
  '/dashboard/dashboards/stitching': Waypoints,
  '/dashboard/dashboards/store': Boxes,
  '/dashboard/analytics': BarChart3,
  '/dashboard/entry': ClipboardPen,
  '/dashboard/progress': BarChart3,
  '/dashboard/orders': TreePine,
  '/dashboard/wages': Wallet,
  '/dashboard/materials': Package,
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
  '/dashboard/procurement/chat': ShoppingCart,
  '/dashboard/procurement/production': ShoppingCart,
  '/dashboard/procurement/notifications': ShoppingCart,
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
    <div className="fixed top-0 left-0 right-0 z-50 h-1 overflow-hidden pointer-events-none">
      <div className="h-full w-full" style={{ background: 'linear-gradient(90deg, #c8834a, #e8a06a)' }} />
    </div>
  );
}

// Header title per route (longest prefix wins). Pages don't repeat their title
// in the body — this is the one place it is shown.
const PAGE_TITLES = {
  '/dashboard/analytics': 'Analytics & Operations',
  '/dashboard/entry': 'Production Logger',
  '/dashboard/progress': 'Stage-Spread Progress',
  '/dashboard/orders': 'Client Directory',
  '/dashboard/wages': 'Payroll Command',
  '/dashboard/materials': 'Material Stock',
  '/dashboard/attendance': 'Attendance',
  '/dashboard/barcode': 'Barcode Management',
  '/dashboard/procurement': 'Procurement Overview',
  '/dashboard/procurement/intake': 'Submission Workspace',
  '/dashboard/procurement/inventory': 'Inventory Control',
  '/dashboard/procurement/po': 'Purchase Orders & Suppliers',
  '/dashboard/procurement/bom': 'Material Breakdown (BOM)',
  '/dashboard/procurement/chat': 'Factory Chat',
  '/dashboard/procurement/notifications': 'Procurement Inbox',
  '/dashboard/procurement/production': 'Production Board',
  '/dashboard/admin': 'Admin & User Management',
  '/dashboard/imports': 'Breakdown Review & Release',
  '/dashboard/cutting': 'Cutting Grid Engine',
  '/dashboard/chat': 'AI Operations Assistant',
  '/dashboard/settings': 'Security Settings',
  '/dashboard/simulator': 'Delay Impact Simulator',
  '/dashboard/tracer': 'Garment QC Tracer',
  '/dashboard/dashboards/dm': 'Direct Manager Operations Dashboard',
  '/dashboard/dashboards/cutting': 'Cutting Floor Operations Dashboard',
  '/dashboard/dashboards/lining': 'Lining Floor Operations Dashboard',
  '/dashboard/dashboards/stitching': 'Stitching Floor Operations Dashboard',
  '/dashboard/dashboards/store': 'Store Manager Operations Dashboard',
};

// /dashboard itself renders the signed-in role's own dashboard (see dashboard/page.js)
const HOME_TITLES = {
  direct_manager: 'Direct Manager Operations Dashboard',
  managing_director: 'Direct Manager Operations Dashboard',
  hr: 'Direct Manager Operations Dashboard',
  cutting_manager: 'Cutting Floor Operations Dashboard',
  lining_manager: 'Lining Floor Operations Dashboard',
  stitching_manager: 'Stitching Floor Operations Dashboard',
  store_manager: 'Store Manager Operations Dashboard',
  store_scan: 'Store Manager Operations Dashboard',
};

function getPageTitle(pathname, role) {
  if (pathname === '/dashboard') return HOME_TITLES[role] || 'Cutting Floor Operations Dashboard';
  const match = Object.keys(PAGE_TITLES)
    .filter((path) => pathname === path || pathname.startsWith(path + '/'))
    .sort((a, b) => b.length - a.length)[0];
  return match ? PAGE_TITLES[match] : 'Dashboard';
}

export default function DashboardLayout({ children }) {
  const { user, userName: storedName, logout, ROLES } = useAuth();

  const router = useRouter();
  const pathname = usePathname();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pageTrail, setPageTrail] = useState([]);
  const [pendingPoCount, setPendingPoCount] = useState(0);
  const [isPageTransitioning, setIsPageTransitioning] = useState(false);
  const prevPathnameRef = useRef(pathname);
  const transitionTimerRef = useRef(null);

  const handleNavClick = (href) => {
    setMobileMenuOpen(false);
    if (pathname !== href) {
      setIsPageTransitioning(true);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setIsPageTransitioning(false);
      }, 850);
    }
  };

  // Trigger smooth leather loading transition on route switch
  useEffect(() => {
    if (prevPathnameRef.current !== pathname) {
      prevPathnameRef.current = pathname;
      setIsPageTransitioning(true);
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
      transitionTimerRef.current = setTimeout(() => {
        setIsPageTransitioning(false);
      }, 850);
    }
    return () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    };
  }, [pathname]);

  // --------------------------------------------------
  // Session gate
  // --------------------------------------------------

  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);
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
        name: 'Material Stock',
        href: '/dashboard/materials',
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

    // "Dashboard Home" (/dashboard) already routes Direct Manager/Managing
    // Director/HR straight to DirectManagerDashboard (see dashboard/page.js)
    // — the same component /dashboard/direct-manager rendered, so that
    // second sidebar entry was a duplicate and has been removed above.
    const scoped = links;

    if (user === 'security') {
      return scoped.filter(
        (link) => link.name === 'Attendance'
      );
    }

    return scoped;
  }, [user]);

  // --------------------------------------------------
  // Role information
  // --------------------------------------------------

  const roleInfo =
    ROLES[user] || {
      label: 'Viewer',
      color: 'bg-slate-100 text-slate-700',
    };

  // Sessions from before the name was stored at login fall back to /auth/me
  const { data: me } = useGetMeQuery(undefined, { skip: !user || !!storedName });
  const userName = storedName || me?.name || '';

  const pageTitle = getPageTitle(pathname, user);

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
            <span className="text-xl font-black tracking-widest text-white">PTE</span>
            <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: '#c8834a' }}>Leather Intelligence</p>
          </div>
        </div>
        <button type="button" onClick={() => setMobileMenuOpen(false)} className="lg:hidden p-2 focus:outline-none" style={{ color: '#ffffff' }} aria-label="Close menu">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Sidebar Navigation */}
      {/* Still scrolls on short screens, just without a visible scrollbar */}
      <motion.nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" variants={navStagger} initial="hidden" animate="show">
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
              <Link href={link.href} onClick={() => handleNavClick(link.href)} className={`nav-item group ${isActive ? 'active' : ''} relative flex items-center justify-between w-full`}>
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
        <p className="font-bold">PTE Leather Platform</p>
        <p className="mt-1 opacity-70">Touch-Optimized Operations</p>
      </div>
    </>
  );

  const desktopSidebar = renderSidebar('desktop');
  const mobileSidebar = renderSidebar('mobile');

  return (
    // Shell is pinned to the viewport: sidebar and header stay put and only
    // <main> scrolls (print falls back to normal flow so pages aren't clipped)
    <div
      id="app-shell"
      className="h-dvh overflow-hidden flex flex-col md:flex-row print:h-auto print:overflow-visible"
      style={{
        background: '#faf6f0',
      }}
    >
      {/* ================================================
          DESKTOP SIDEBAR (persistent, lg+ only — tablets get the
          collapsible overlay sidebar below, same as mobile)
          ================================================ */}
      <aside className="hidden lg:flex flex-col static inset-auto z-auto w-72 shrink-0 shadow-2xl" style={{ background: 'linear-gradient(180deg, #3d2b1a 0%, #2a1d11 100%)', borderRight: '1px solid rgba(200,131,74,0.2)', color: '#ffffff' }}>
        {desktopSidebar}
      </aside>

      {/* ================================================
          MOBILE / TABLET SIDEBAR (Instant Unmount, < lg)
          ================================================ */}
      {mobileMenuOpen && (
        <>
          <div
            onClick={() => setMobileMenuOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 lg:hidden"
            aria-hidden="true"
          />
          <aside
            className="lg:hidden fixed inset-y-0 left-0 z-50 w-72 flex flex-col shadow-2xl"
            style={{ background: 'linear-gradient(180deg, #3d2b1a 0%, #2a1d11 100%)', borderRight: '1px solid rgba(200,131,74,0.2)', color: '#ffffff' }}
          >
            {mobileSidebar}
          </aside>
        </>
      )}

      {/* ================================================
          MAIN CONTENT
          ================================================ */}
      <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden print:overflow-visible">
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
          className="h-20 shrink-0 flex items-center justify-between px-6 relative z-30"
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
              className="lg:hidden text-2xl p-2 rounded-lg"
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

            {/* The page title lives here — pages no longer repeat it in their body.
                Pages with tabs/sub-views append to it like a folder path
                (usePageTrail). Phones show only the deepest level. */}
            <h1 className="flex items-center gap-1.5 min-w-0 text-lg sm:text-xl font-bold">
              <span
                className={`truncate ${pageTrail.length ? 'hidden sm:inline' : ''}`}
                style={{ color: pageTrail.length ? '#9a8a7a' : '#3d2b1a' }}
              >
                {pageTitle}
              </span>
              {pageTrail.map((crumb, i) => {
                const isLast = i === pageTrail.length - 1;
                return (
                  <Fragment key={`${i}-${crumb}`}>
                    <ChevronRight className="hidden sm:block w-4 h-4 shrink-0" style={{ color: '#c8b8a8' }} />
                    <span
                      className={`truncate ${isLast ? '' : 'hidden sm:inline'}`}
                      style={{ color: isLast ? '#3d2b1a' : '#9a8a7a' }}
                    >
                      {crumb}
                    </span>
                  </Fragment>
                );
              })}
            </h1>
          </div>

          {/* User section */}

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              {userName && (
                <p
                  className="text-sm font-bold uppercase"
                  style={{
                    color: '#2d1f0e',
                  }}
                >
                  {userName}
                </p>
              )}

              <p
                className="text-xs font-semibold"
                style={{
                  color: '#9a8a7a',
                }}
              >
                {roleInfo.label}
              </p>
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
        {/* Full-width scroll area so the scrollbar sits at the window edge; content stays capped at 1920px */}
        <main
          id="app-main"
          className="flex-1 min-h-0 w-full overflow-y-auto z-0 print:overflow-visible"
          style={{ background: '#faf6f0' }}
        >
          <div className="p-3 sm:p-5 lg:p-7 max-w-[1920px] w-full mx-auto relative">
            <PageTrailProvider value={setPageTrail}>
              <AnimatePresence mode="wait">
                {isPageTransitioning ? (
                  <motion.div
                    key="page-transition-loader"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <DashboardLoading />
                  </motion.div>
                ) : (
                  <motion.div
                    key={pathname}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, ease: 'easeOut' }}
                  >
                    {children}
                  </motion.div>
                )}
              </AnimatePresence>
            </PageTrailProvider>
          </div>
        </main>
      </div>
    </div>
  );
}
