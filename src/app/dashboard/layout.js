'use client';
import { useEffect, useRef, useState, useMemo, Suspense } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
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
  Boxes,
  ChevronDown,
} from 'lucide-react';

// Raw hide → cut pattern pieces → stitched seam → finished jacket
const JACKET_BUILD_STAGES = [Layers, ScissorsLineDashed, Waypoints, Shirt];

// Sub-branches for Cutting Floor (DCM)
const CUTTING_SUB_BRANCHES = [
  { name: "Today's Priority", tabId: 'tab-today', icon: '📌' },
  { name: 'Per-Style Leather (DCM)', tabId: 'tab-styles', icon: '👗' },
  { name: 'Leather Stock & Lots (DCM)', tabId: 'tab-inventory', icon: '🧵' },
  { name: 'Cutter Performance', tabId: 'tab-cutters', icon: '✂️' },
  { name: 'Piece-Level Master Tracker', tabId: 'tab-pieces', icon: '🏷️' },
  { name: 'Damage & Rework Station', tabId: 'tab-damage', icon: '⚠️' },
  { name: 'Loss & Waste Analytics', tabId: 'tab-analytics', icon: '📉' },
  { name: 'Traceability Flow', tabId: 'tab-flow', icon: '🔄' },
];

// Sub-branches for Lining Floor
const LINING_SUB_BRANCHES = [
  { name: "Today's Priority", tabId: 'tab-today', icon: '📌' },
  { name: 'Lining Material Stock', tabId: 'tab-inventory', icon: '🧵' },
  { name: 'Per-Style Lining', tabId: 'tab-styles', icon: '👗' },
  { name: 'Operator Performance', tabId: 'tab-employees', icon: '👷' },
  { name: 'Piece-Level Tracker', tabId: 'tab-pieces', icon: '🏷️' },
  { name: 'Damage & Rework', tabId: 'tab-damage', icon: '⚠️' },
  { name: 'Upcoming Production', tabId: 'tab-upcoming', icon: '⏳' },
  { name: 'Loss & Waste Analytics', tabId: 'tab-analytics', icon: '📉' },
  { name: 'Traceability Flow', tabId: 'tab-flow', icon: '🔄' },
];

// Sub-branches for Stitching Floor
const STITCHING_SUB_BRANCHES = [
  { name: "Today's Priority", tabId: 'tab-today', icon: '📌' },
  { name: 'Stage-Wise & Bottlenecks', tabId: 'tab-stages', icon: '🪡' },
  { name: 'Store Handoff & Drawers', tabId: 'tab-store', icon: '🏬' },
  { name: 'Per-Style Progress', tabId: 'tab-styles', icon: '👗' },
  { name: 'Employee by Stage', tabId: 'tab-employees', icon: '👷' },
  { name: 'Piece Tracker', tabId: 'tab-pieces', icon: '🏷️' },
  { name: 'Damage & Rework', tabId: 'tab-damage', icon: '⚠️' },
  { name: 'Stage Analytics', tabId: 'tab-analytics', icon: '📉' },
  { name: 'Traceability Flow', tabId: 'tab-flow', icon: '🔄' },
];

// Sub-branches for Store Floor
const STORE_SUB_BRANCHES = [
  { name: "Today's Priority", tabId: 'tab-today', icon: '📌' },
  { name: 'Drawer Master', tabId: 'tab-drawers', icon: '🗄️' },
  { name: 'Styles in Store', tabId: 'tab-styles', icon: '📦' },
  { name: 'Leather & Lining', tabId: 'tab-materials', icon: '🧵' },
  { name: 'Hold Management', tabId: 'tab-holds', icon: '🛑' },
  { name: 'Empty Drawers', tabId: 'tab-empty', icon: '♻️' },
  { name: 'Cutter Traceability', tabId: 'tab-employees', icon: '👷' },
  { name: 'Store Analytics', tabId: 'tab-analytics', icon: '📉' },
  { name: 'Traceability Flow', tabId: 'tab-flow', icon: '🔄' },
];

/* Tree Sub-Branch Links with branch connector line and active dot glow */
function SubBranchLinks({ link, setMobileMenuOpen }) {
  const searchParams = useSearchParams();
  const currentTab = searchParams.get('tab') || 'tab-today';

  return (
    <div className="overflow-hidden pl-5 pr-1 pt-1.5 pb-2.5 space-y-1 relative">
      {/* Main Vertical Tree Trunk Line */}
      <div
        className="absolute left-[18px] top-1 bottom-3 w-[1.5px] rounded-full"
        style={{
          background: 'linear-gradient(180deg, rgba(200,131,74,0.65) 0%, rgba(200,131,74,0.3) 70%, rgba(200,131,74,0.1) 100%)',
        }}
      />

      {link.subItems.map((sub) => {
        const isSubActive = currentTab === sub.tabId;
        return (
          <Link
            key={sub.tabId}
            href={`${link.href}?tab=${sub.tabId}`}
            onClick={() => setMobileMenuOpen(false)}
            className={`group/sub flex items-center gap-2 px-3 py-1.5 rounded-xl text-[11.5px] transition-all duration-200 relative cursor-pointer ${
              isSubActive
                ? 'font-bold text-white bg-gradient-to-r from-[rgba(200,131,74,0.35)] to-[rgba(200,131,74,0.1)] border border-[rgba(200,131,74,0.45)] shadow-sm translate-x-1'
                : 'font-medium text-amber-100/70 hover:text-white hover:bg-white/10 hover:translate-x-1'
            }`}
          >
            {/* Horizontal Branch Connector Line */}
            <span
              className={`absolute -left-[14px] top-1/2 -translate-y-1/2 w-3.5 h-[1.5px] transition-all duration-200 ${
                isSubActive ? 'bg-[#e89554]' : 'bg-[rgba(200,131,74,0.35)] group-hover/sub:bg-[rgba(200,131,74,0.75)]'
              }`}
            />
            {/* Node Dot */}
            <span
              className={`w-1.5 h-1.5 rounded-full shrink-0 transition-all duration-200 ${
                isSubActive
                  ? 'bg-[#e89554] ring-2 ring-[rgba(200,131,74,0.6)] scale-125'
                  : 'bg-[rgba(200,131,74,0.4)] group-hover/sub:bg-[rgba(200,131,74,0.85)]'
              }`}
            />
            <span className="text-xs shrink-0">{sub.icon}</span>
            <span className="truncate tracking-wide">{sub.name}</span>
          </Link>
        );
      })}
    </div>
  );
}

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
  '/dashboard': ScissorsLineDashed,
  '/dashboard/cutting': ScissorsLineDashed,
  '/dashboard/lining': Shirt,
  '/dashboard/stitching': Waypoints,
  '/dashboard/store': Boxes,
  '/dashboard/analytics': BarChart3,
  '/dashboard/entry': ClipboardPen,
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
  const { user, logout, ROLES } = useAuth();
  const { orders } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expandedBranches, setExpandedBranches] = useState({
    '/dashboard': true,
    '/dashboard/cutting': true,
  });

  // Session gate
  useEffect(() => {
    if (!user) {
      router.replace('/');
    }
  }, [user, router]);

  const roleInfo = ROLES[user] || { label: 'Viewer', color: 'bg-slate-100 text-slate-700' };

  // Notification state for Cutting Manager
  const [pendingPoCount, setPendingPoCount] = useState(0);

  useEffect(() => {
    const checkPendingPOs = () => {
      try {
        const savedPO = localStorage.getItem('po_state_SUB-MOCK-101');
        if (savedPO) {
          const { status } = JSON.parse(savedPO);
          if (user === 'cutting_manager' && status === 'pending_approval') {
            setPendingPoCount(1);
          } else if (user === 'direct_manager' && status === 'approved') {
            setPendingPoCount(1);
          } else {
            setPendingPoCount(0);
          }
        } else {
          setPendingPoCount(0);
        }
      } catch (e) { }
    };

    checkPendingPOs();
    const interval = setInterval(checkPendingPOs, 2000);
    return () => clearInterval(interval);
  }, [user]);

  // Calculate if there are any air freight risk orders — memoized to avoid filter on every render
  const airRiskOrders = useMemo(
    () => orders.filter((o) => o.freight_mode && o.freight_mode.includes('RISK')),
    [orders]
  );

  // Static shape but kept inside component for ROLES/user access — memoized so the array
  // reference stays stable and avoids re-rendering nav items unnecessarily
  const navLinks = useMemo(
    () => {
      let topDashboards = [];

      if (user === 'store_scan') {
        topDashboards = [
          {
            name: 'Store Floor Dashboard',
            href: '/dashboard',
            subItems: STORE_SUB_BRANCHES,
          },
        ];
      } else if (user === 'stitching_manager') {
        topDashboards = [
          {
            name: 'Stitching Floor Dashboard',
            href: '/dashboard',
            subItems: STITCHING_SUB_BRANCHES,
          },
        ];
      } else if (user === 'lining_manager') {
        topDashboards = [
          {
            name: 'Lining Floor Dashboard',
            href: '/dashboard',
            subItems: LINING_SUB_BRANCHES,
          },
        ];
      } else if (user === 'cutting_manager') {
        topDashboards = [
          {
            name: 'Cutting Floor Dashboard',
            href: '/dashboard',
            subItems: CUTTING_SUB_BRANCHES,
          },
        ];
      } else {
        topDashboards = [
          {
            name: 'Cutting Floor Dashboard',
            href: '/dashboard',
            subItems: CUTTING_SUB_BRANCHES,
          },
          {
            name: 'Lining Floor Dashboard',
            href: '/dashboard/lining',
            subItems: LINING_SUB_BRANCHES,
          },
          {
            name: 'Stitching Floor Dashboard',
            href: '/dashboard/stitching',
            subItems: STITCHING_SUB_BRANCHES,
          },
          {
            name: 'Store Floor Dashboard',
            href: '/dashboard/store',
            subItems: STORE_SUB_BRANCHES,
          },
        ];
      }

      const links = [
        ...topDashboards,
        { name: 'Analytics & Alerts', href: '/dashboard/analytics' },
        { name: 'Production Logger', href: '/dashboard/entry' },
        { name: 'Stage-Spread Progress', href: '/dashboard/progress' },
        { name: 'Client SKU Tree', href: '/dashboard/orders' },
        { name: 'Payroll & Rates', href: '/dashboard/wages' },
        { name: 'Attendance', href: '/dashboard/attendance' },
        { name: 'Barcode Management', href: '/dashboard/barcode' },
        // { name: 'Delay Impact Simulator', href: '/dashboard/simulator' },
        // { name: 'Garment QC Tracer', href: '/dashboard/tracer' },
        // { name: 'AI Assistant', href: '/dashboard/chat' },
        // ── Procurement Suite ──
        { name: 'Procurement', href: '/dashboard/procurement', divider: true },
        { name: 'New Intake', href: '/dashboard/procurement/intake' },
        { name: 'Inventory Check', href: '/dashboard/procurement/inventory' },
        { name: 'PO Tracker', href: '/dashboard/procurement/po' },
        // ──────────────────────
        { name: 'Admin & Users', href: '/dashboard/admin', divider: true },
       // { name: 'Security Settings', href: '/dashboard/settings' },
      ];

      if (user === 'security') {
        return links.filter(link => link.name === 'Attendance');
      }

      return links;
    },
    [user]
  );

  const toggleBranch = (href, e) => {
    e.preventDefault();
    e.stopPropagation();
    setExpandedBranches((prev) => ({
      ...prev,
      [href]: !prev[href],
    }));
  };

  const handleBranchParentClick = (link) => {
    if (link.subItems) {
      // Toggle branch expansion on click
      setExpandedBranches((prev) => ({
        ...prev,
        [link.href]: !prev[link.href],
      }));
    }
  };

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#050505]">
        <div className="text-center text-[#c8834a]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c8834a] mx-auto mb-4"></div>
          <p className="font-semibold text-xs tracking-widest uppercase">Securing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row" style={{ background: '#faf6f0' }}>

      {/* ─── SIDEBAR (Desktop & Mobile) ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-auto md:z-auto transition-transform duration-300 ease-in-out flex flex-col shadow-2xl`} style={{ background: 'linear-gradient(180deg, #3d2b1a 0%, #2a1d11 100%)', borderRight: '1px solid rgba(200,131,74,0.2)', color: '#ffffff' }}>

        {/* Sidebar Brand Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
          <div className="flex items-center gap-2">
            <Factory className="w-7 h-7" style={{ color: '#c8834a' }} />
            <div>
              <span className="text-xl font-black tracking-widest text-white">KAIROX</span>
              <p className="text-[10px] font-bold tracking-wider uppercase" style={{ color: '#c8834a' }}>Leather Intelligence</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden p-2 focus:outline-none" style={{ color: '#ffffff' }}>
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <motion.nav
          className="flex-1 px-4 py-6 space-y-1 overflow-y-auto"
          variants={navStagger}
          initial="hidden"
          animate="show"
        >
          {navLinks.map((link) => {
            const isActive = pathname === link.href || (link.href !== '/dashboard' && pathname.startsWith(link.href + '/'));
            const IconComp = NAV_ICONS[link.href] || LayoutDashboard;
            const hasSubItems = Boolean(link.subItems && link.subItems.length > 0);
            const isBranchExpanded = Boolean(expandedBranches[link.href]);

            return (
              <motion.div key={link.href} variants={navItemAnim}>
                {link.divider && (
                  <div className="pt-4 pb-2 px-2">
                    <div className="h-px" style={{ background: 'rgba(200,131,74,0.15)' }} />
                  </div>
                )}
                <div className="relative">
                  <Link
                    href={link.href}
                    onClick={() => {
                      handleBranchParentClick(link);
                      if (!hasSubItems) setMobileMenuOpen(false);
                    }}
                    className={`nav-item group ${isActive ? 'active' : ''} relative flex items-center justify-between w-full cursor-pointer`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="activeNavPill"
                        className="absolute inset-0 rounded-[10px] overflow-hidden"
                        style={{
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
                      <span className="font-semibold text-xs tracking-wide">{link.name}</span>
                    </div>

                    {/* Right side accessories */}
                    <div className="relative z-10 flex items-center gap-1.5">
                      {link.name === 'New Intake' && (user === 'cutting_manager' || user === 'direct_manager') && pendingPoCount > 0 && (
                        <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                          {pendingPoCount}
                        </span>
                      )}

                      {hasSubItems && (
                        <button
                          type="button"
                          onClick={(e) => toggleBranch(link.href, e)}
                          className="p-1 rounded-md text-amber-200/60 hover:text-amber-200 hover:bg-black/20 transition-all"
                        >
                          <ChevronDown
                            className={`w-3.5 h-3.5 transition-transform duration-300 ${
                              isBranchExpanded ? 'rotate-180 text-amber-400' : 'rotate-0'
                            }`}
                          />
                        </button>
                      )}
                    </div>
                  </Link>

                  {/* Expandable Sub-Branches Accordion */}
                  {hasSubItems && (
                    <AnimatePresence initial={false}>
                      {isBranchExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
                        >
                          <Suspense fallback={<div className="pl-6 py-2 text-[10px] text-amber-200/50">Loading branches...</div>}>
                            <SubBranchLinks link={link} setMobileMenuOpen={setMobileMenuOpen} />
                          </Suspense>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  )}
                </div>
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
              <h2 className="text-xl font-bold" style={{ color: '#3d2b1a' }}>
                {pathname === '/dashboard/store' || (pathname === '/dashboard' && user === 'store_scan')
                  ? 'Store Floor Operations'
                  : pathname === '/dashboard/stitching' || (pathname === '/dashboard' && user === 'stitching_manager')
                  ? 'Stitching Floor Operations'
                  : pathname === '/dashboard/lining' || (pathname === '/dashboard' && user === 'lining_manager')
                  ? 'Lining Floor Operations'
                  : pathname === '/dashboard' || pathname === '/dashboard/cutting'
                  ? 'Cutting Floor Operations (DCM)'
                  : 'Shop Floor Command'}
              </h2>
              <p className="text-xs" style={{ color: '#9a8a7a' }}>
                {pathname === '/dashboard/store' || (pathname === '/dashboard' && user === 'store_scan')
                  ? 'Drawer Movement, Intermediate Storage & Material Pairing Hub'
                  : pathname === '/dashboard/stitching' || (pathname === '/dashboard' && user === 'stitching_manager')
                  ? 'Pasting → Fusing → Line Stitching → Shell Stitching → Final Finish'
                  : pathname === '/dashboard/lining' || (pathname === '/dashboard' && user === 'lining_manager')
                  ? 'Lining Material Allocation, Piece Traceability & Consumption Tracking'
                  : pathname === '/dashboard' || pathname === '/dashboard/cutting'
                  ? 'Piece & Style Level Leather Traceability & DCM Analytics'
                  : 'Production, wages, and compliance tracking'}
              </p>
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

        {/* ─── PAGE ROUTER CONTENT (Full Dashboard Space) ─── */}
        <main className="flex-1 p-4 sm:p-6 lg:p-7 w-full min-w-0 overflow-y-auto" style={{ background: '#f6f8fb' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
