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
  
  // State for the clicked card expanding to full screen
  const [activePanel, setActivePanel] = useState(null);
  
  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  // Handle panel click -> expand animation
  const handlePanelClick = (panel) => {
    if (activePanel) return; // prevent double click
    setActivePanel(panel);
    // Notice: We removed the automatic router.push('/login'). 
    // Now the user must submit the form inside the overlay.
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

      <div className="min-h-screen bg-[#050505] text-white overflow-hidden relative selection:bg-[#c8b09b]/30">
        
        {/* KAIROX wordmark top-left */}
        <motion.div
          className="absolute top-10 left-12 z-40"
          initial={{ opacity: 0 }}
          animate={loadingComplete && !activePanel ? { opacity: 1 } : { opacity: 0 }}
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
            className="absolute top-10 right-12 z-40"
            initial={{ opacity: 0 }}
            animate={loadingComplete && !activePanel ? { opacity: 1 } : { opacity: 0 }}
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
          className="absolute top-32 left-0 w-full text-center z-30 pointer-events-none"
          initial={{ opacity: 0, y: 20 }}
          animate={loadingComplete && !activePanel ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <p className="text-[#666] font-mono text-[10px] tracking-[0.4em] uppercase mb-4">Select Workspace</p>
          <h2 className="text-3xl md:text-5xl font-serif text-white/90 tracking-wide">Enter your role</h2>
        </motion.div>

        {/* ─── 4 Centered Cards Container ─── */}
        <div className="absolute inset-0 flex items-center justify-center pt-20 px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 w-full max-w-[1200px]">
            {PANELS.map((panel, i) => {
              const Icon = panel.icon;
              // If this is the active panel, we hide the original card so the layoutId animation takes over
              const isHidden = activePanel?.role === panel.role;

              return (
                <motion.div
                  key={panel.role}
                  layoutId={`panel-${panel.role}`}
                  onClick={() => handlePanelClick(panel)}
                  initial={{ opacity: 0, y: 50 }}
                  animate={loadingComplete ? { opacity: isHidden ? 0 : 1, y: 0 } : {}}
                  transition={{ duration: 0.8, delay: loadingComplete ? 0.4 + (i * 0.1) : 0, ease: [0.16, 1, 0.3, 1] }}
                  className="group relative h-[450px] w-full rounded-2xl overflow-hidden cursor-pointer"
                >
                  {/* Card Background Image with zoom on hover */}
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 ease-out group-hover:scale-110"
                    style={{ backgroundImage: `url(${panel.img})` }}
                  />
                  
                  {/* Card Dark Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10 group-hover:from-black/80 transition-colors duration-700" />
                  
                  {/* Accent Line Top */}
                  <div 
                    className="absolute top-0 left-0 w-full h-1 opacity-0 group-hover:opacity-100 transition-opacity duration-500" 
                    style={{ backgroundColor: panel.accent }} 
                  />

                  {/* Card Content */}
                  <div className="absolute inset-0 p-8 flex flex-col justify-end">
                    <div className="mb-4 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
                      <Icon className="w-8 h-8 mb-6" style={{ color: panel.accent }} strokeWidth={1.5} />
                      <h3 className="text-2xl font-serif text-white whitespace-pre-line leading-tight">
                        {panel.title}
                      </h3>
                    </div>
                    
                    <div className="overflow-hidden h-0 group-hover:h-20 transition-all duration-500 ease-in-out">
                      <p className="text-sm font-light text-white/60 pt-4 leading-relaxed">
                        {panel.subtitle}
                      </p>
                    </div>

                    <div className="mt-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100">
                      <span className="text-[10px] uppercase tracking-[0.2em]" style={{ color: panel.accent }}>Access</span>
                      <ArrowRight className="w-3 h-3" style={{ color: panel.accent }} />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* ─── Full Screen Expansion Overlay ─── */}
        <AnimatePresence>
          {activePanel && (
            <motion.div
              layoutId={`panel-${activePanel.role}`}
              initial={{ borderRadius: 16 }}
              animate={{ borderRadius: 0 }}
              transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
              className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden"
            >
              {/* The expanded background image */}
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${activePanel.img})` }}
              />
              <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />

              {/* The Login Card inside the expanded panel */}
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={isSuccess ? { opacity: 0, y: -100, transition: { duration: 0.6, ease: 'easeIn' } } : { opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="relative z-10 w-full max-w-md bg-[#0a0a0a] border border-[#222] p-10 shadow-2xl flex flex-col items-center"
              >
                <activePanel.icon className="w-12 h-12 mb-6" style={{ color: activePanel.accent }} strokeWidth={1} />
                <h2 className="text-3xl font-serif text-white mb-2 text-center">
                  {activePanel.title.replace('\n', ' ')}
                </h2>
                <p className="text-white/40 text-xs tracking-widest uppercase mb-6">Workspace Authentication</p>
                
                {loginError && (
                  <div className="w-full bg-red-950/50 border border-red-500/50 text-red-200 text-xs p-3 mb-6 rounded text-center">
                    {loginError}
                  </div>
                )}
                
                <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-6">
                  <div className="flex flex-col gap-2">
                    <label className="text-[10px] text-white/50 tracking-[0.2em] uppercase">Username</label>
                    <input 
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      required
                      placeholder="Enter username"
                      className="w-full bg-black border border-[#333] text-white p-4 focus:outline-none focus:border-[#c8b09b] transition-colors font-mono tracking-widest text-sm"
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
                      className="w-full bg-black border border-[#333] text-white p-4 focus:outline-none focus:border-[#c8b09b] transition-colors font-mono tracking-widest text-sm"
                    />
                  </div>
                  
                  <button 
                    type="submit"
                    disabled={isSubmitting || isSuccess}
                    className="w-full py-4 mt-4 font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group disabled:opacity-70"
                    style={{ backgroundColor: activePanel.accent, color: '#000' }}
                  >
                    <span className="relative z-10">{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                    <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                  </button>
                </form>

                <button 
                  type="button"
                  onClick={() => { setActivePanel(null); setUsername(''); setPassword(''); setLoginError(''); setIsSubmitting(false); setIsSuccess(false); }}
                  className="mt-8 text-[10px] uppercase tracking-[0.2em] text-white/30 hover:text-white/80 transition-colors"
                >
                  ← Go Back
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </>
  );
}
