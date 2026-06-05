'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { apiLogin } from '@/lib/api';
import { Loader2, ArrowRight, Factory } from 'lucide-react';

const PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  left: Math.round(Math.random() * 100),
  duration: Math.round(8 + Math.random() * 14),
  delay: Math.round(Math.random() * 10),
  size: Math.round(1 + Math.random() * 3),
}));

export default function Login() {
  const { login } = useAuth();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [focused, setFocused] = useState('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // useCallback: stabilizes the function reference across renders.
  // Without this, every username/password keystroke creates a brand-new function object,
  // causing React to see onSubmit as "changed" and trigger unnecessary reconciliation.
  const handleBackendLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const data = await apiLogin(username.trim(), password.trim());
      login(data.role || 'direct_manager', data.access_token);
      router.push('/dashboard');
      console.log("data ",data);
    } catch (err) {
      setLoginError('Invalid credentials. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }, [username, password, login, router]);

  return (
    <div className="flex min-h-screen bg-white">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes kenBurns {
          0%   { transform: scale(1.0) translate(0px, 0px); }
          50%  { transform: scale(1.12) translate(-15px, -8px); }
          100% { transform: scale(1.0) translate(0px, 0px); }
        }
        @keyframes orbDrift1 {
          0%   { transform: translate(0px, 0px) scale(1); opacity: 0.15; }
          33%  { transform: translate(5vw, -5vh) scale(1.2); opacity: 0.3; }
          66%  { transform: translate(-3vw, 4vh) scale(0.85); opacity: 0.1; }
          100% { transform: translate(0px, 0px) scale(1); opacity: 0.15; }
        }
        @keyframes orbDrift2 {
          0%   { transform: translate(0px, 0px) scale(1); opacity: 0.1; }
          50%  { transform: translate(-4vw, -6vh) scale(1.3); opacity: 0.25; }
          100% { transform: translate(0px, 0px) scale(1); opacity: 0.1; }
        }
        @keyframes dustRise {
          0%   { transform: translateY(0px); opacity: 0; }
          10%  { opacity: 1; }
          90%  { opacity: 0.6; }
          100% { transform: translateY(-100vh); opacity: 0; }
        }
        @keyframes slideUp {
          0%   { opacity: 0; transform: translateY(24px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeIn {
          0%   { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes lineGrow {
          0%   { width: 0; }
          100% { width: 3rem; }
        }
        @keyframes floatAurora {
          0% { transform: translate(0, 0) scale(1); opacity: 0.7; }
          33% { transform: translate(4vw, -6vh) scale(1.1); opacity: 1; }
          66% { transform: translate(-3vw, 4vh) scale(0.9); opacity: 0.6; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.7; }
        }
        @keyframes floatAurora2 {
          0% { transform: translate(0, 0) scale(1); opacity: 0.6; }
          50% { transform: translate(-5vw, 5vh) scale(1.2); opacity: 0.9; }
          100% { transform: translate(0, 0) scale(1); opacity: 0.6; }
        }
        @keyframes dotPan {
          0% { background-position: 0px 0px; }
          100% { background-position: 24px 24px; }
        }
        .react-bits-dots {
          background-color: #ffffff;
          background-image: radial-gradient(#e5e7eb 1.5px, transparent 1.5px);
          background-size: 24px 24px;
          animation: dotPan 10s linear infinite;
        }
        .leather-bg {
          background-image: url('https://images.unsplash.com/photo-1533621412959-15994f1fc4d2?q=80&w=2070&auto=format&fit=crop');
          background-size: cover;
          background-position: center;
          animation: kenBurns 28s ease-in-out infinite;
        }
        .slide-up { animation: slideUp 0.7s ease forwards; }
        .slide-up-2 { animation: slideUp 0.7s ease 0.15s forwards; opacity: 0; }
        .slide-up-3 { animation: slideUp 0.7s ease 0.3s forwards; opacity: 0; }
        .slide-up-4 { animation: slideUp 0.7s ease 0.45s forwards; opacity: 0; }
        .fade-in    { animation: fadeIn 0.5s ease forwards; }
        .line-grow  { animation: lineGrow 0.8s ease 0.5s forwards; width: 0; display: block; }
      `}} />

      {/* ─── LEFT PANEL — Leather Showcase ─── */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden flex-col justify-between p-14">
        {/* Background image */}
        <div className="absolute inset-0 leather-bg" />
        
        {/* Animated Glow Orbs (Factory Warm Lights) */}
        <div
          className="absolute z-[1] w-[45vw] h-[45vw] top-[5%] left-[-10%] rounded-full bg-amber-600/30 blur-[100px] pointer-events-none mix-blend-screen"
          style={{ animation: 'orbDrift1 18s ease-in-out infinite' }}
        />
        <div
          className="absolute z-[1] w-[50vw] h-[50vw] bottom-[-10%] right-[-10%] rounded-full bg-orange-700/25 blur-[120px] pointer-events-none mix-blend-screen"
          style={{ animation: 'orbDrift2 24s ease-in-out infinite reverse' }}
        />
        <div
          className="absolute z-[1] w-[30vw] h-[30vw] top-[30%] left-[20%] rounded-full bg-yellow-500/20 blur-[90px] pointer-events-none mix-blend-screen"
          style={{ animation: 'orbDrift1 20s ease-in-out infinite 6s' }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 z-[2] bg-gradient-to-br from-black/85 via-black/60 to-black/80" />

        {/* Floating dust particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-[3]">
          {mounted && PARTICLES.map((p) => (
            <div key={p.id} style={{
              position: 'absolute',
              left: p.left + '%',
              bottom: '-5%',
              width: p.size + 'px',
              height: p.size + 'px',
              borderRadius: '50%',
              background: 'rgba(251, 191, 36, 0.5)',
              filter: 'blur(0.5px)',
              animation: `dustRise ${p.duration}s linear ${p.delay}s infinite`,
            }} />
          ))}
        </div>

        {/* Top branding */}
        <div className="relative z-10 slide-up">
          <div className="flex items-center gap-2.5 mb-2">
            <Factory className="w-4 h-4 text-amber-400" />
            <span className="text-amber-400 text-xs font-bold tracking-[0.25em] uppercase">Leather Operations</span>
          </div>
          <h1 className="text-5xl xl:text-6xl font-black text-white tracking-tight leading-none" style={{ fontFamily: 'Georgia, serif' }}>
            KAIROX
          </h1>
          <div className="h-px bg-amber-500 line-grow mt-4 mb-4" />
          <p className="text-stone-300 text-sm font-medium tracking-wide max-w-xs leading-relaxed">
            Real-time intelligence platform for leather manufacturing operations.
          </p>
        </div>

        {/* Bottom stats */}
        <div className="relative z-10 grid grid-cols-3 gap-6 slide-up-2">
          {[
            { label: 'Operations', value: '360°' },
            { label: 'Traceability', value: '100%' },
            { label: 'Real-time', value: '24/7' },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-2xl font-black text-white mb-1">{stat.value}</div>
              <div className="text-stone-400 text-xs font-semibold tracking-widest uppercase">{stat.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ─── RIGHT PANEL — Login Form ─── */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 sm:px-16 relative overflow-hidden react-bits-dots">
        
        {/* React Bits inspired Soft Aurora / Blob Shapes (Increased Opacity) */}
        <div 
          className="absolute top-[0%] right-[-5%] w-[45vw] h-[45vw] rounded-full bg-amber-400/40 blur-[80px] pointer-events-none mix-blend-multiply" 
          style={{ animation: 'floatAurora 12s ease-in-out infinite' }} 
        />
        <div 
          className="absolute bottom-[-5%] left-[-10%] w-[55vw] h-[55vw] rounded-full bg-orange-400/30 blur-[90px] pointer-events-none mix-blend-multiply" 
          style={{ animation: 'floatAurora2 18s ease-in-out infinite' }} 
        />

        <div className="w-full max-w-sm relative z-10">

          {/* Mobile logo */}
          <div className="lg:hidden mb-10 text-center">
            <h1 className="text-3xl font-black text-gray-900 tracking-widest" style={{ fontFamily: 'Georgia, serif' }}>KAIROX</h1>
            <p className="text-xs text-gray-500 tracking-widest uppercase mt-1 font-semibold">Operations Portal</p>
          </div>

          {/* Heading */}
          <div className="mb-10 slide-up">
            <h2 className="text-2xl font-black text-gray-900 mb-2 tracking-tight">Welcome back</h2>
            <p className="text-sm text-gray-500 font-medium">Sign in to access your dashboard</p>
          </div>

          {/* Error */}
          {loginError && (
            <div className="mb-6 py-3 px-4 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-semibold fade-in">
              {loginError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleBackendLogin} className="space-y-6 slide-up-3">
            <div className="space-y-2">
              <label htmlFor="username" className="text-[10px] font-bold text-gray-400 tracking-[0.15em] uppercase block ml-1">Username</label>
              <input
                type="text"
                required
                placeholder="Enter username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loginLoading}
                className="w-full px-5 py-4 bg-white/60 backdrop-blur-md border border-gray-200 hover:border-gray-300 focus:border-amber-500 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-medium disabled:opacity-50 text-sm shadow-sm"
                id="username"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-[10px] font-bold text-gray-400 tracking-[0.15em] uppercase block ml-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loginLoading}
                className="w-full px-5 py-4 bg-white/60 backdrop-blur-md border border-gray-200 hover:border-gray-300 focus:border-amber-500 rounded-xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all font-medium disabled:opacity-50 text-sm tracking-widest shadow-sm"
                id="password"
              />
            </div>

            <button
              type="submit"
              disabled={loginLoading || !username.trim() || !password.trim()}
              className="w-full py-4 bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs uppercase tracking-[0.2em] rounded-xl transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-3 mt-4 shadow-lg shadow-gray-200"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-10 text-center text-[10px] text-gray-400 font-bold tracking-[0.2em] uppercase slide-up-4">
            Kairox Traceability &copy; {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
