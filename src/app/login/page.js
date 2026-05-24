'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiLogin } from '@/lib/api';
import { Building2, Scissors, PenTool, ScanSearch, Factory, X, LogIn, Loader2 } from 'lucide-react';

export default function Login() {
  const { login, ROLES, ROLE_OPERATIONS } = useAuth();
  const router = useRouter();

  // Login form modal state (for direct_manager)
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  const handleSelectRole = (roleKey) => {
    if (roleKey === 'direct_manager') {
      // Show login form for Direct Manager
      setShowLoginModal(true);
      setLoginError('');
      return;
    }
    // Other roles: direct local login (no backend auth)
    login(roleKey);
    router.push('/dashboard');
  };

  const handleBackendLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;

    setLoginLoading(true);
    setLoginError('');

    try {
      const data = await apiLogin(username.trim(), password.trim());
      // Store token and role
      login(data.role || 'direct_manager', data.access_token);
      setShowLoginModal(false);
      router.push('/dashboard');
    } catch (err) {
      setLoginError('Invalid credentials. Please try again.');
    } finally {
      setLoginLoading(false);
    }
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

      {/* ─── DIRECT MANAGER LOGIN MODAL ─── */}
      {showLoginModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-sm w-full p-6 sm:p-8 space-y-6 mx-4 relative animate-scale-up">
            
            {/* Modal Header */}
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-xl font-black text-slate-950 flex items-center gap-2">
                <LogIn className="w-5 h-5 text-blue-600" />
                Manager Login
              </h3>
              <button 
                onClick={() => {
                  setShowLoginModal(false);
                  setUsername('');
                  setPassword('');
                  setLoginError('');
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500 font-medium">
              Enter your Direct Manager credentials to access the platform.
            </p>

            {/* Error Message */}
            {loginError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
                {loginError}
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleBackendLogin} className="space-y-4 text-left">
              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Username <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={loginLoading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-800 disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loginLoading}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm font-semibold text-slate-800 disabled:opacity-50"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setUsername('');
                    setPassword('');
                    setLoginError('');
                  }}
                  disabled={loginLoading}
                  className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginLoading || !username.trim() || !password.trim()}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Signing In...
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
