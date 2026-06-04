'use client';
import { useEffect, useState, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
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
} from 'lucide-react';

const NAV_ICONS = {
  '/dashboard': LayoutDashboard,
  '/dashboard/entry': ClipboardPen,
  '/dashboard/progress': BarChart3,
  '/dashboard/orders': TreePine,
  '/dashboard/wages': Wallet,
  '/dashboard/simulator': Gamepad2,
  '/dashboard/tracer': ScanSearch,
  '/dashboard/chat': BotMessageSquare,
  '/dashboard/attendance': ClipboardPen, // Or whatever icon they meant to use, fallback is LayoutDashboard
};

export default function DashboardLayout({ children }) {
  const { user, logout, ROLES } = useAuth();
  const { orders } = useData();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Session gate
  useEffect(() => {
    if (!user) {
      router.replace('/login');
    }
  }, [user, router]);

  const roleInfo = ROLES[user] || { label: 'Viewer', color: 'bg-slate-100 text-slate-700' };

  // Calculate if there are any air freight risk orders — memoized to avoid filter on every render
  const airRiskOrders = useMemo(
    () => orders.filter((o) => o.freight_mode && o.freight_mode.includes('RISK')),
    [orders]
  );

  // Static shape but kept inside component for ROLES/user access — memoized so the array
  // reference stays stable and avoids re-rendering nav items unnecessarily
  const navLinks = useMemo(
    () => [
      { name: 'Dashboard Home', href: '/dashboard' },
      { name: 'Production Logger', href: '/dashboard/entry' },
      { name: 'Stage-Spread Progress', href: '/dashboard/progress' },
      { name: 'Client SKU Tree', href: '/dashboard/orders' },
      { name: 'Payroll & Rates', href: '/dashboard/wages' },
      { name: 'Attendance', href: '/dashboard/attendance' }, // added by nihal
      { name: 'Delay Impact Simulator', href: '/dashboard/simulator' },
      { name: 'Garment QC Tracer', href: '/dashboard/tracer' },
      { name: 'AI Assistant', href: '/dashboard/chat' },
    ],
    [] // No dependencies — content is static
  );

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-brand">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="font-semibold">Securing Session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f0f4ff]">
      
      {/* ─── SIDEBAR (Desktop & Mobile) ─── */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-72 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static md:inset-auto md:z-auto transition-transform duration-300 ease-in-out bg-gradient-sidebar text-white flex flex-col shadow-2xl`}>
        
        {/* Sidebar Brand Logo */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <Factory className="w-7 h-7 text-blue-200" />
            <div>
              <span className="text-xl font-black tracking-widest text-white">KAIROX</span>
              <p className="text-[10px] text-blue-200 font-bold tracking-wider uppercase">Leather Intelligence</p>
            </div>
          </div>
          {/* Mobile close button */}
          <button onClick={() => setMobileMenuOpen(false)} className="md:hidden text-white p-2 focus:outline-none">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sidebar Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            const IconComp = NAV_ICONS[link.href] || LayoutDashboard;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <IconComp className="w-[18px] h-[18px]" />
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Sidebar Footer Info */}
        <div className="p-6 border-t border-blue-800 bg-blue-950/30 text-xs text-blue-200 text-center">
          <p className="font-bold">Kairox Leather Platform</p>
          <p className="mt-1 opacity-70">Touch-Optimized Operations</p>
        </div>
      </aside>

      {/* Overlay for mobile menu */}
      {mobileMenuOpen && (
        <div onClick={() => setMobileMenuOpen(false)} className="fixed inset-0 z-40 bg-black/40 md:hidden" />
      )}

      {/* ─── MAIN CONTENT CONTAINER ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        
        {/* ─── TOP BAR HEADER ─── */}
        <header className="bg-white h-20 shadow-sm border-b border-blue-100 flex items-center justify-between px-6 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            {/* Mobile hamburger menu toggle */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-blue-800 text-2xl p-2 hover:bg-blue-50 rounded-lg">
              <Menu className="w-6 h-6" />
            </button>
            <div className="hidden sm:block">
              <h2 className="text-xl font-bold text-slate-800">Shop Floor Command</h2>
              <p className="text-xs text-slate-400">Production, wages, and compliance tracking</p>
            </div>
          </div>

          {/* User Section */}
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-slate-400 tracking-wide uppercase">Active Persona</p>
              <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                <span className={`badge ${roleInfo.color}`}>{roleInfo.label}</span>
              </div>
            </div>

            {/* Logout button (at least 48px high/wide click targets) */}
            <button
              onClick={() => logout()}
              className="btn-secondary h-12 py-0 px-4 min-h-[48px] border border-red-200 hover:border-red-500 hover:bg-red-50 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2 cursor-pointer transition-all active:scale-95 shadow-sm"
              title="Logout session"
            >
              <LogOut className="w-4 h-4" /> <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </header>

        {/* ─── WARNING BANNER (Air Freight Cutoff Watch) ─── */}
        {airRiskOrders.length > 0 && (
          <div className="bg-gradient-to-r from-red-600 to-amber-600 text-white p-4 font-bold text-sm shadow-md animate-fade-in flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-red-700">
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
        )}

        {/* ─── PAGE ROUTER CONTENT ─── */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
