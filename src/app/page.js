'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ShieldCheck,
  Scissors,
  Layers,
  Eye,
  ArrowUpRight,
  ArrowRight,
} from 'lucide-react';
import { apiLogin } from '@/lib/api';

/* ─── Panel Data ──────────────────────────────────── */
const PANELS = [
  {
    role: 'direct_manager',
    title: 'Direct\nManager',
    subtitle: 'Full factory oversight & production control',
    accent: '#d4915a',
    icon: ShieldCheck,
    img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80',
  },
  {
    role: 'cutting_manager',
    title: 'Cutting\nManager',
    subtitle: 'Cutting floor operations & patterns',
    accent: '#7b9fc8',
    icon: Scissors,
    img: 'https://images.unsplash.com/photo-1542744173-8e7e53415bb0?w=1200&q=80',
  },
  {
    role: 'stitching_manager',
    title: 'Stitching\nManager',
    subtitle: 'Assembly floor & quality control',
    accent: '#b07bc8',
    icon: Layers,
    img: 'https://images.unsplash.com/photo-1521737852567-6949f3f9f2b5?w=1200&q=80',
  },
  {
    role: 'viewer',
    title: 'Auditor\nViewer',
    subtitle: 'Read-only access for compliance & auditing',
    accent: '#a0a0a0',
    icon: Eye,
    img: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80',
  },
];

/* ─── Preloader ───────────────────────────────────── */
function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 12) + 4;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setTimeout(onComplete, 600);
      }
      setProgress(current);
    }, 80);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ y: 0 }}
      exit={{ y: '-100%' }}
      transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden"
    >
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
        className="text-4xl font-serif tracking-[0.3em] text-white mb-10"
      >
        KAIROX
      </motion.h1>
      <div className="w-48 h-[1px] bg-[#222] relative overflow-hidden">
        <motion.div
          className="absolute top-0 left-0 h-full bg-[#c8b09b]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ ease: 'easeOut', duration: 0.1 }}
        />
      </div>
      <p className="text-[#555] mt-4 font-mono text-xs tracking-widest">{progress}%</p>
    </motion.div>
  );
}

/* ─── Main Landing Page ───────────────────────────── */
export default function Home() {
  const { user, login } = useAuth();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loadingComplete, setLoadingComplete] = useState(false);
  
  // State for the accordion and transition
  const [activePanel, setActivePanel] = useState(null);
  const [transitionState, setTransitionState] = useState('idle'); // 'idle' | 'sweeping' | 'login'
  
  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  // Handle hover and click
  const handleMouseEnter = (panel) => {
    if (transitionState === 'idle') {
      setActivePanel(panel);
    }
  };

  const handleMouseLeave = () => {
    if (transitionState === 'idle') {
      setActivePanel(null);
    }
  };

  const startTransition = () => {
    if (transitionState !== 'idle' || !activePanel) return;
    setTransitionState('sweeping');
    setTimeout(() => {
      setTransitionState('login');
    }, 600); // 600ms for the lightning sweep
  };

  const resetToHome = () => {
    setTransitionState('idle');
    setActivePanel(null);
    setUsername('');
    setPassword('');
    setLoginError('');
    setIsSubmitting(false);
    setIsSuccess(false);
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!username || !password) return;
    
    setLoginError('');
    setIsSubmitting(true);
    
    try {
      // Call actual backend authentication API
      const data = await apiLogin(username, password);
      
      // On success, trigger the exit animation
      setIsSuccess(true);
      
      // Navigate immediately while the animation plays
      login(data.role || activePanel.role, data.access_token);
      router.push('/dashboard');
      
    } catch (err) {
      setIsSubmitting(false);
      setIsSuccess(false);
      setLoginError(err.message || 'Authentication Failed. Please check credentials.');
    }
  };

  return (
    <>
      <AnimatePresence>
        {!loadingComplete && <Preloader onComplete={() => setLoadingComplete(true)} />}
      </AnimatePresence>

      <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative selection:bg-[#c8b09b]/30 flex flex-col">
        
        {/* Lightning Sweep Animation (Upward) */}
        <AnimatePresence>
          {transitionState === 'sweeping' && (
            <motion.div
              initial={{ top: '100%', opacity: 1 }}
              animate={{ top: '-10%', opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="fixed left-0 right-0 h-[2px] bg-white z-[200] shadow-[0_0_30px_5px_rgba(255,255,255,0.6)]"
            />
          )}
        </AnimatePresence>

        {/* KAIROX wordmark top-left */}
        <motion.div
          className="absolute top-6 left-6 md:top-10 md:left-12 z-40"
          initial={{ opacity: 0 }}
          animate={loadingComplete && transitionState === 'idle' ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <span className="font-serif text-xl tracking-[0.3em] text-white/90">KAIROX</span>
          <p className="text-[9px] tracking-[0.2em] uppercase mt-1 text-white/40">
            Intelligence
          </p>
        </motion.div>

        {/* Dashboard Link top-right */}
        {user && (
          <motion.div
            className="absolute top-6 right-6 md:top-10 md:right-12 z-40"
            initial={{ opacity: 0 }}
            animate={loadingComplete && transitionState === 'idle' ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 1 }}
          >
            <button
              onClick={() => router.push('/dashboard')}
              className="text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white transition-colors flex items-center gap-2"
            >
              Go to Dashboard <ArrowUpRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* Center Text */}
        <motion.div 
          className="absolute top-24 md:top-28 left-0 w-full text-center z-30 pointer-events-none px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={loadingComplete && transitionState === 'idle' ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <p className="text-[#666] font-mono text-[10px] tracking-[0.4em] uppercase mb-4">Select Workspace</p>
          <h2 className="text-3xl md:text-5xl font-serif text-white/90 tracking-wide">Select your role</h2>
        </motion.div>

        {/* ─── Expanding Flex Accordion Container ─── */}
        <motion.div 
          className="relative z-20 w-full flex flex-col md:flex-row items-stretch md:items-center justify-center pt-[200px] md:pt-[220px] pb-20 px-6 md:px-12 gap-3 md:gap-4 max-w-[1200px] mx-auto md:min-h-screen"
          animate={{ opacity: transitionState === 'idle' ? 1 : 0 }}
          transition={{ duration: 0.4 }}
          style={{ pointerEvents: transitionState === 'idle' ? 'auto' : 'none' }}
        >
            {PANELS.map((panel, i) => {
              const Icon = panel.icon;
              const isActive = activePanel?.role === panel.role;
              const isAnyActive = activePanel !== null;

              return (
                <motion.div
                  key={panel.role}
                  layout
                  onMouseEnter={() => handleMouseEnter(panel)}
                  onMouseLeave={handleMouseLeave}
                  onClick={startTransition}
                  initial={{ opacity: 0, y: 50 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    flex: isActive ? 4 : (isAnyActive ? 1 : 2) // Expanded gets 4, others shrink to 1. Default all are 2.
                  }}
                  transition={{ 
                    opacity: { duration: 0.8, delay: loadingComplete ? 0.4 + (i * 0.1) : 0 },
                    y: { duration: 0.8, delay: loadingComplete ? 0.4 + (i * 0.1) : 0, ease: [0.16, 1, 0.3, 1] },
                    flex: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
                  }}
                  className={`group relative rounded-2xl overflow-hidden cursor-pointer ${isActive ? 'h-[400px] md:h-[500px]' : 'h-[80px] md:h-[500px]'}`}
                >
                  {/* Background Image */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-105"
                    style={{ backgroundImage: `url(${panel.img})` }}
                  />
                  
                  {/* Dark Overlay */}
                  <motion.div 
                    className="absolute inset-0 bg-black/60 transition-colors duration-700 group-hover:bg-black/40"
                    animate={{ backgroundColor: isActive ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.7)' }}
                  />
                  
                  {/* Gradient for Text */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80" />
                  
                  {/* Top Accent Line */}
                  <motion.div 
                    className="absolute top-0 left-0 w-full h-1 origin-left" 
                    style={{ backgroundColor: panel.accent }}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: isActive ? 1 : 0 }}
                    transition={{ duration: 0.5 }}
                  />

                  {/* Content */}
                  <motion.div layout className="absolute bottom-0 left-0 w-full p-6 md:p-8 flex flex-col justify-end h-full">
                    <motion.div layout className="flex flex-col h-full justify-end">
                      <Icon 
                        className={`mb-4 transition-all duration-500 ${isActive ? 'w-10 h-10' : 'w-6 h-6'}`} 
                        style={{ color: panel.accent }} 
                        strokeWidth={1.5} 
                      />
                      <motion.h3 
                        layout="position"
                        className={`font-serif text-white leading-tight whitespace-pre-line transition-all duration-500 ${isActive ? 'text-4xl md:text-5xl mb-4' : 'text-xl'}`}
                      >
                        {panel.title.replace('\n', isActive ? ' ' : '\n')}
                      </motion.h3>
                      
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.4 }}
                            className="overflow-hidden"
                          >
                            <p className="text-sm md:text-base font-light text-white/80 max-w-md mb-2">
                              {panel.subtitle}
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </motion.div>
                </motion.div>
              );
            })}
        </motion.div>

        {/* ─── Fullscreen Login Form Revealed After Wipe ─── */}
        <AnimatePresence>
          {transitionState === 'login' && activePanel && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="absolute inset-0 z-[150] flex items-center justify-center bg-[#050505]"
            >
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-20"
                style={{ backgroundImage: `url(${activePanel.img})` }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />

              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isSuccess ? { opacity: 0, scale: 0.95 } : { opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="relative z-10 w-full max-w-md bg-[#0a0a0a] overflow-hidden shadow-2xl border border-[#222]"
              >
                {/* Top Accent Line */}
                <div 
                  className="absolute top-0 left-0 w-full h-[3px]" 
                  style={{ backgroundColor: activePanel.accent }} 
                />
                
                {/* Close Button */}
                <button 
                  onClick={resetToHome}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/50 hover:text-white rounded-full transition-colors z-20"
                >
                  ✕
                </button>

                <div className="px-8 pb-8 pt-10">
                  <div className="flex flex-col items-center mb-8">
                    <activePanel.icon className="w-10 h-10 mb-4" style={{ color: activePanel.accent }} strokeWidth={1} />
                    <h2 className="text-3xl font-serif text-white leading-tight text-center">
                      {activePanel.title.replace('\n', ' ')}
                    </h2>
                    <p className="text-white/40 text-[10px] tracking-widest uppercase mt-2">
                      Workspace Authentication
                    </p>
                  </div>
                  
                  {loginError && (
                    <div className="w-full bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-3 mb-6 rounded text-center">
                      {loginError}
                    </div>
                  )}
                  
                  <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-5">
                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-white/50 tracking-[0.2em] uppercase">Username</label>
                      <input 
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        placeholder="Enter username"
                        className="w-full bg-[#111] border border-[#222] text-white p-4 focus:outline-none focus:border-[#c8b09b] transition-colors font-mono tracking-widest text-sm"
                      />
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-[10px] text-white/50 tracking-[0.2em] uppercase">Password</label>
                      <input 
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        placeholder="Enter password"
                        className="w-full bg-[#111] border border-[#222] text-white p-4 focus:outline-none focus:border-[#c8b09b] transition-colors font-mono tracking-widest text-sm"
                      />
                    </div>
                    
                    <button 
                      type="submit"
                      disabled={isSubmitting || isSuccess}
                      className="w-full py-4 mt-6 font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group disabled:opacity-70"
                      style={{ backgroundColor: activePanel.accent, color: '#000' }}
                    >
                      <span className="relative z-10">{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                      <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                    </button>
                  </form>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
