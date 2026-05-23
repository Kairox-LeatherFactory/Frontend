'use client';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { Building2, Scissors, PenTool, ScanSearch, Factory } from 'lucide-react';

export default function Login() {
  const { login, ROLES, ROLE_OPERATIONS } = useAuth();
  const router = useRouter();

  const handleSelectRole = (roleKey) => {
    login(roleKey);
    router.push('/dashboard');
  };

  const roleIcons = {
    direct_manager: Building2,
    cutting_manager: Scissors,
    stitching_manager: PenTool,
    viewer: ScanSearch,
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-brand px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-4xl space-y-8 text-center">
        
        {/* Header Block */}
        <div className="space-y-4 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-900/40 border border-blue-500/30 text-blue-200 text-sm font-semibold tracking-wide">
            <Factory className="w-4 h-4" /> Factory Operations Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white sm:leading-none">
            KAIROX
          </h1>
          <p className="text-xl sm:text-2xl font-bold text-blue-100">
            Leather Intelligence &amp; Traceability Platform
          </p>
          <p className="mx-auto max-w-xl text-base text-blue-200">
            Select your operational role profile card to access the real-time shop floor logging system, pieces calculation, and freight dashboards.
          </p>
        </div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 pt-6">
          {Object.entries(ROLES).map(([key, info], index) => {
            const allowedOps = ROLE_OPERATIONS[key];
            const IconComp = roleIcons[key] || ScanSearch;
            return (
              <button
                key={key}
                onClick={() => handleSelectRole(key)}
                style={{ animationDelay: `${index * 75}ms` }}
                className="card flex flex-col justify-between items-center text-center p-6 bg-white hover:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/40 text-slate-800 transition-all cursor-pointer min-h-[300px] border border-blue-100 shadow-xl select-none animate-fade-in hover:-translate-y-2"
              >
                {/* Icon & Label */}
                <div className="w-full flex flex-col items-center space-y-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 shadow-inner border border-blue-100">
                    <IconComp className="w-8 h-8 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight">
                      {info.label}
                    </h3>
                    <span className={`badge mt-2 ${info.color}`}>
                      {key === 'direct_manager' ? 'Admin Access' : key === 'viewer' ? 'Read-only' : 'Floor Logger'}
                    </span>
                  </div>
                </div>

                {/* Operations Gated Text */}
                <div className="w-full mt-6 pt-4 border-t border-slate-100 text-left">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Access Scope
                  </p>
                  {allowedOps.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {allowedOps.map((op) => (
                        <span
                          key={op}
                          className="px-2 py-0.5 rounded bg-blue-50 border border-blue-100 text-blue-700 text-[10px] font-semibold"
                        >
                          {op}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs italic text-slate-500">
                      Audit viewer only. No shop floor logging allowed.
                    </p>
                  )}
                </div>

                {/* Enter Button Simulation */}
                <div className="w-full mt-6">
                  <span className="w-full flex items-center justify-center bg-blue-600 text-white rounded-lg text-sm font-bold min-h-[48px] hover:bg-blue-700 active:scale-95 transition-all">
                    Sign In as {key === 'direct_manager' ? 'MD' : key === 'viewer' ? 'Auditor' : 'Manager'}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Footer info banner */}
        <div className="pt-8 text-xs text-blue-300 font-medium">
          Kairox Traceability Platform v1.2 • English Only Operations • Touch Optimized
        </div>
      </div>
    </div>
  );
}
