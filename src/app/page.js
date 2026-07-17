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
  Loader2,
} from 'lucide-react';

/* ─── Animated Gold Text Component ────────────────── */
function AnimatedGoldText({ text }) {
  const letters = text.split('');

  const container = {
    hidden: { opacity: 1 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    },
    hover: {
      transition: { staggerChildren: 0.05 }
    }
  };

  const child = {
    hidden: { color: 'rgba(255,255,255,0.4)', textShadow: '0px 0px 0px rgba(200,131,74,0)' },
    visible: {
      color: '#c8834a',
      textShadow: '0px 0px 15px rgba(200,131,74,0.4)',
      transition: { duration: 0.8, ease: "easeInOut" }
    },
    hover: {
      color: ['#c8834a', '#ffdfa0', '#c8834a'],
      textShadow: ['0px 0px 15px rgba(200,131,74,0.4)', '0px 0px 25px rgba(255,223,160,0.8)', '0px 0px 15px rgba(200,131,74,0.4)'],
      transition: { duration: 0.6, ease: "easeInOut" }
    }
  };

  return (
    <motion.span
      className="inline-block cursor-pointer"
      style={{ fontFamily: 'var(--font-playfair)' }}
      variants={container}
      initial="hidden"
      animate="visible"
      whileHover="hover"
    >
      {letters.map((char, i) => (
        <motion.span key={i} variants={child} className="inline-block">
          {char === ' ' ? '\u00A0' : char}
        </motion.span>
      ))}
    </motion.span>
  );
}

/* ─── Unified System Dynamic Panels Data Matrix ─────────────────── */
const PANELS = [
  {
    role: 'management_workspace',
    title: 'Management\nWorkspace',
    subtitle: 'Directors, Plant Managers, Supervisors & Line In-charge Control Console',
    accent: '#d4915a',
    icon: ShieldCheck,
    img: '/images/roles/manager.png',
    allowedRoles: ['direct_manager', 'managing_director', 'cutting_manager', 'stitching_manager', 'supervisor']
  },
  {
    role: 'employee_workspace',
    title: 'Employee\nWorkspace',
    subtitle: 'Factory Floor Staff, Operators, Fusers & Cutters Attendance Logs Portal',
    accent: '#7b9fc8',
    icon: Scissors,
    img: '/images/roles/cutting.png',
    allowedRoles: ['employee']
  },
  {
    role: 'hr_workspace',
    title: 'HR & Operations\nConsole',
    subtitle: 'Human Resource Management, Roster Provisions & Administrative Audits',
    accent: '#b07bc8',
    icon: Layers,
    img: '/images/roles/stitching.png',
    allowedRoles: ['hr']
  },
  {
    role: 'client_workspace',
    title: 'Client & Auditor\nDesk',
    subtitle: 'External Client Portals, Supply Chain Viewers & Read-only Auditors Access',
    accent: '#a0a0a0',
    icon: Eye,
    img: '/images/roles/auditor.png',
    allowedRoles: ['client', 'viewer']
  },
];

/* ─── Preloader ───────────────────────────────────── */
function Preloader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    let current = 0;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 12) + 4;
      if (current >= 100) {
        current = 100;
        clearInterval(interval);
        setIsComplete(true);
        setTimeout(onComplete, 800);
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
        className="text-4xl tracking-[0.3em] mb-10"
        style={{ fontFamily: 'var(--font-playfair)' }}
      >
        <motion.span
          animate={isComplete ? {
            color: '#c8834a',
            textShadow: '0px 0px 20px rgba(200,131,74,0.6)',
          } : {
            color: 'rgba(255,255,255,0.5)',
            textShadow: '0px 0px 0px rgba(200,131,74,0)',
          }}
          transition={{ duration: 0.8, ease: 'easeInOut' }}
        >
          KAIROX
        </motion.span>
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

  const [activePanel, setActivePanel] = useState(null);
  const [showLogin, setShowLogin] = useState(false);

  // Login Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return null;

  const handlePanelClick = (panel) => {
    setActivePanel(panel);
  };

  const handlePrev = (e) => {
    e.stopPropagation();
    const currentIndex = PANELS.findIndex(p => p.role === activePanel.role);
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : PANELS.length - 1;
    setActivePanel(PANELS[prevIndex]);
  };

  const handleNext = (e) => {
    e.stopPropagation();
    const currentIndex = PANELS.findIndex(p => p.role === activePanel.role);
    const nextIndex = currentIndex < PANELS.length - 1 ? currentIndex + 1 : 0;
    setActivePanel(PANELS[nextIndex]);
  };

  const handleClosePanel = () => {
    setActivePanel(null);
    setShowLogin(false);
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
      // ─── REVERTED TO JSON PAYLOAD ───
      // Backend STRICTLY expects a valid JSON dictionary as proven by the 422 error trace.
      const payload = {
        username: username.trim(),
        password: password
      };

      // Sending strictly as application/json via your Next.js local proxy route
      const res = await fetch(`/api/v1/auth/login`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        
        // Pydantic layer validation traces array parameters parsing elements tracking
        if (errData.detail && Array.isArray(errData.detail)) {
          const formattedTraceError = errData.detail.map(err => 
            `Validation error in [${err.loc ? err.loc.join('.') : 'unknown'}]: ${err.msg}`
          ).join(' | ');
          throw new Error(formattedTraceError);
        }

        const displayMsg = typeof errData.detail === 'object' 
          ? JSON.stringify(errData.detail) 
          : errData.detail;
          
        throw new Error(displayMsg || `Validation Processing Failure (${res.status})`);
      }

      const data = await res.json();
      const backendRole = (data.role || '').toLowerCase().trim();
      
      let isRoleMatched = false;
      let targetSessionRole = backendRole; 

      // ─── MATRIX VALIDATION CHECK OVERRIDE ───
      if (activePanel && activePanel.allowedRoles.includes(backendRole)) {
        isRoleMatched = true;
      }

      if (!isRoleMatched) {
        throw new Error(`Access Denied: Your account role "${backendRole}" does not have privileges to access this selected card partition layout console.`);
      }

      setIsSuccess(true);
      login(targetSessionRole, data.access_token);
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

      <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden overflow-y-auto relative selection:bg-[#c8b09b]/30">

        {/* KAIROX wordmark top-left */}
        <motion.div
          className="absolute top-6 left-6 md:top-10 md:left-12 z-40"
          initial={{ opacity: 0 }}
          animate={loadingComplete && !activePanel ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: 1 }}
        >
          <span className="text-xl tracking-[0.3em]"><AnimatedGoldText text="KAIROX" /></span>
          <p className="text-[9px] tracking-[0.2em] uppercase mt-1 text-white/40 font-sans">
            Intelligence
          </p>
        </motion.div>

        {/* Center Text */}
        <motion.div
          className="absolute top-28 md:top-32 left-0 w-full text-center z-30 px-4"
          initial={{ opacity: 0, y: 20 }}
          animate={loadingComplete && !activePanel ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 1, delay: 0.2 }}
        >
          <p className="text-[#666] font-mono text-[10px] tracking-[0.4em] uppercase mb-4">Select Workspace</p>
          <h2 className="text-3xl md:text-5xl tracking-wide" style={{ fontFamily: 'var(--font-playfair)' }}>
            <motion.span
              className="inline-block cursor-default"
              initial="rest"
              whileHover="hover"
              animate="rest"
            >
              {'Select your role'.split('').map((char, i) => (
                <motion.span
                  key={i}
                  className="inline-block"
                  variants={{
                    rest: { color: '#ffffff', y: 0, textShadow: 'none' },
                    hover: {
                      color: ['#ffffff', '#c8834a', '#ffffff'],
                      y: [0, -6, 0],
                      textShadow: ['none', '0px 0px 20px rgba(200,131,74,0.7)', 'none'],
                      transition: { duration: 0.5, delay: i * 0.04, ease: 'easeInOut' }
                    }
                  }}
                >
                  {char === ' ' ? '\u00A0' : char}
                </motion.span>
              ))}
            </motion.span>
          </h2>
        </motion.div>

        {/* ─── Aperture Style Landing Layout ─── */}
        <div className="relative z-20 w-full flex-1 flex items-center justify-center min-h-screen overflow-hidden">

          {/* State 1: All panels as vertical slices in the center */}
          <AnimatePresence>
            {!activePanel && (
              <motion.div
                className="flex items-center justify-center gap-2 md:gap-6 mt-32 md:mt-48 z-30"
                initial={{ opacity: 0 }}
                animate={loadingComplete ? { opacity: 1 } : { opacity: 0 }}
                exit={{ opacity: 0 }}
              >
                {PANELS.map((panel, i) => {
                  return (
                    <motion.div
                      key={panel.role}
                      layoutId={`panel-bg-${panel.role}`}
                      onClick={() => handlePanelClick(panel)}
                      className="relative w-[60px] md:w-[120px] h-[300px] md:h-[450px] cursor-pointer overflow-hidden grayscale hover:grayscale-0 transition-all duration-500 border border-white/10 hover:border-white/30"
                    >
                      <motion.div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url(${panel.img})` }}
                      />
                      <div className="absolute inset-0 bg-black/40 hover:bg-transparent transition-colors duration-500 pointer-events-none" />
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* State 2: Active panel expanded, others on the right */}
          <AnimatePresence>
            {activePanel && !showLogin && (
              <>
                {/* Center Expanded Active Panel */}
                <motion.div
                  key={activePanel.role}
                  layoutId={`panel-bg-${activePanel.role}`}
                  onClick={() => setShowLogin(true)}
                  className="group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[80vw] max-w-[1000px] h-[60vh] md:h-[70vh] z-30 overflow-hidden shadow-2xl border border-white/10 cursor-pointer bg-black"
                >
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                    style={{ backgroundImage: `url(${activePanel.img})` }}
                  />
                  <div className="absolute inset-0 bg-black/40 transition-colors duration-500 group-hover:bg-black/50" />

                  {/* Title centered inside */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3, duration: 0.6 }}
                    className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
                  >
                    <activePanel.icon className="w-12 h-12 mb-6" style={{ color: activePanel.accent }} strokeWidth={1} />
                    <h2 className="text-4xl md:text-7xl font-serif uppercase tracking-[0.2em] text-center whitespace-pre-line" style={{ color: activePanel.accent }}>
                      {activePanel.title}
                    </h2>
                  </motion.div>

                  {/* Corner Accents */}
                  <div className="absolute top-6 left-6 w-8 h-8 border-t-[1px] border-l-[1px]" style={{ borderColor: activePanel.accent }} />
                  <div className="absolute top-6 right-6 w-8 h-8 border-t-[1px] border-r-[1px]" style={{ borderColor: activePanel.accent }} />
                  <div className="absolute bottom-6 left-6 w-8 h-8 border-b-[1px] border-l-[1px]" style={{ borderColor: activePanel.accent }} />
                  <div className="absolute bottom-6 right-6 w-8 h-8 border-b-[1px] border-r-[1px]" style={{ borderColor: activePanel.accent }} />

                  {/* Hover Arrow Icon */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                      <ArrowUpRight className="w-6 h-6" style={{ color: activePanel.accent }} />
                    </div>
                  </div>

                  {/* Mobile Navigation Arrows */}
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:hidden z-50 pointer-events-none">
                    <button
                      onClick={handlePrev}
                      className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto"
                    >
                      <ArrowRight className="w-5 h-5 text-white rotate-180" />
                    </button>
                    <button
                      onClick={handleNext}
                      className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto"
                    >
                      <ArrowRight className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </motion.div>

                {/* Actions below the expanded panel */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4, duration: 0.4 }}
                  className="absolute top-[calc(50%+35vh+30px)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-6"
                >
                  <button
                    onClick={() => setActivePanel(null)}
                    className="w-10 h-10 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition-colors bg-black/40 backdrop-blur-md"
                  >
                    ✕
                  </button>
                  <button
                    onClick={() => setShowLogin(true)}
                    className="px-8 py-3 rounded-full border bg-black/40 backdrop-blur-md hover:bg-white/10 tracking-[0.2em] uppercase text-xs font-bold transition-colors"
                    style={{ borderColor: activePanel.accent, color: activePanel.accent }}
                  >
                    Sign In
                  </button>
                </motion.div>

                {/* Navigation Panels (Left and Right) */}
                {(() => {
                  const currentIndex = PANELS.findIndex(p => p.role === activePanel.role);
                  const prevPanels = PANELS.slice(0, currentIndex);
                  const nextPanels = PANELS.slice(currentIndex + 1);

                  return (
                    <>
                      {/* Previous Panels (Left Side) */}
                      <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 pl-2 md:pl-8 gap-2 md:gap-4 z-40">
                        {prevPanels.map(panel => (
                          <motion.div
                            key={panel.role}
                            layoutId={`panel-bg-${panel.role}`}
                            onClick={() => handlePanelClick(panel)}
                            className="group w-[40px] md:w-[100px] h-[30vh] md:h-[50vh] cursor-pointer overflow-hidden grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 border border-white/10 relative shadow-xl"
                          >
                            <div
                              className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                              style={{ backgroundImage: `url(${panel.img})` }}
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                                <ArrowRight className="w-4 h-4 text-white rotate-180" />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>

                      {/* Next Panels (Right Side) */}
                      <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 pr-2 md:pr-8 gap-2 md:gap-4 z-40">
                        {nextPanels.map(panel => (
                          <motion.div
                            key={panel.role}
                            layoutId={`panel-bg-${panel.role}`}
                            onClick={() => handlePanelClick(panel)}
                            className="group w-[40px] md:w-[100px] h-[30vh] md:h-[50vh] cursor-pointer overflow-hidden grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 border border-white/10 relative shadow-xl"
                          >
                            <div
                              className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
                              style={{ backgroundImage: `url(${panel.img})` }}
                            />
                            <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                                <ArrowRight className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            )}
          </AnimatePresence>
        </div>

        {/* ─── Fullscreen Login Form ─── */}
        <AnimatePresence>
          {showLogin && activePanel && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.6 }}
              className="fixed inset-0 z-[150] flex items-center justify-center bg-[#050505]"
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
                className="relative z-10 w-full max-w-md bg-[#0a0a0a] overflow-hidden shadow-2xl border border-[#222] rounded-2xl"
              >
                <div
                  className="absolute top-0 left-0 w-full h-[3px]"
                  style={{ backgroundColor: activePanel.accent }}
                />

                <button
                  onClick={handleClosePanel}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/50 hover:text-white rounded-full transition-colors z-20"
                >
                  ✕
                </button>

                <div className="px-8 pb-8 pt-10">
                  <div className="flex flex-col items-center mb-8">
                    <activePanel.icon className="w-10 h-10 mb-4" style={{ color: activePanel.accent }} strokeWidth={1} />
                    <h2 className="text-3xl font-serif text-white leading-tight text-center whitespace-pre-line">
                      {activePanel.title}
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
                      {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin relative z-10" />
                      ) : (
                        <>
                          <span className="relative z-10">Sign In</span>
                          <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
                        </>
                      )}
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
// 'use client';
// import { useEffect, useState } from 'react';
// import { useRouter } from 'next/navigation';
// import { useAuth } from '@/context/AuthContext';
// import { motion, AnimatePresence } from 'framer-motion';
// import {
//   ShieldCheck,
//   Scissors,
//   Layers,
//   Eye,
//   ArrowUpRight,
//   ArrowRight,
//   Loader2,
// } from 'lucide-react';
// import { apiLogin } from '@/lib/api';

// /* ─── Animated Gold Text Component ────────────────── */
// function AnimatedGoldText({ text }) {
//   const letters = text.split('');

//   const container = {
//     hidden: { opacity: 1 },
//     visible: {
//       opacity: 1,
//       transition: { staggerChildren: 0.1, delayChildren: 0.2 }
//     },
//     hover: {
//       transition: { staggerChildren: 0.05 }
//     }
//   };

//   const child = {
//     hidden: { color: 'rgba(255,255,255,0.4)', textShadow: '0px 0px 0px rgba(200,131,74,0)' },
//     visible: {
//       color: '#c8834a',
//       textShadow: '0px 0px 15px rgba(200,131,74,0.4)',
//       transition: { duration: 0.8, ease: "easeInOut" }
//     },
//     hover: {
//       color: ['#c8834a', '#ffdfa0', '#c8834a'],
//       textShadow: ['0px 0px 15px rgba(200,131,74,0.4)', '0px 0px 25px rgba(255,223,160,0.8)', '0px 0px 15px rgba(200,131,74,0.4)'],
//       transition: { duration: 0.6, ease: "easeInOut" }
//     }
//   };

//   return (
//     <motion.span
//       className="inline-block cursor-pointer"
//       style={{ fontFamily: 'var(--font-playfair)' }}
//       variants={container}
//       initial="hidden"
//       animate="visible"
//       whileHover="hover"
//     >
//       {letters.map((char, i) => (
//         <motion.span key={i} variants={child} className="inline-block">
//           {char === ' ' ? '\u00A0' : char}
//         </motion.span>
//       ))}
//     </motion.span>
//   );
// }

// /* ─── Panel Data ──────────────────────────────────── */
// const PANELS = [
//   {
//     role: 'direct_manager',
//     title: 'Direct\nManager',
//     subtitle: 'Full factory oversight & production control',
//     accent: '#d4915a',
//     icon: ShieldCheck,
//     img: '/images/roles/manager.png',
//   },
//   {
//     role: 'cutting_manager',
//     title: 'Cutting\nManager',
//     subtitle: 'Cutting floor operations & patterns',
//     accent: '#7b9fc8',
//     icon: Scissors,
//     img: '/images/roles/cutting.png',
//   },
//   {
//     role: 'stitching_manager',
//     title: 'Stitching\nManager',
//     subtitle: 'Assembly floor & quality control',
//     accent: '#b07bc8',
//     icon: Layers,
//     img: '/images/roles/stitching.png',
//   },
//   {
//     role: 'viewer',
//     title: 'Auditor\nViewer',
//     subtitle: 'Read-only access for compliance & auditing',
//     accent: '#a0a0a0',
//     icon: Eye,
//     img: '/images/roles/auditor.png',
//   },
// ];

// /* ─── Preloader ───────────────────────────────────── */
// function Preloader({ onComplete }) {
//   const [progress, setProgress] = useState(0);
//   const [isComplete, setIsComplete] = useState(false);

//   useEffect(() => {
//     let current = 0;
//     const interval = setInterval(() => {
//       current += Math.floor(Math.random() * 12) + 4;
//       if (current >= 100) {
//         current = 100;
//         clearInterval(interval);
//         setIsComplete(true);
//         setTimeout(onComplete, 800);
//       }
//       setProgress(current);
//     }, 80);
//     return () => clearInterval(interval);
//   }, [onComplete]);

//   return (
//     <motion.div
//       initial={{ y: 0 }}
//       exit={{ y: '-100%' }}
//       transition={{ duration: 1.2, ease: [0.76, 0, 0.24, 1] }}
//       className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-black overflow-hidden"
//     >
//       <motion.h1
//         initial={{ opacity: 0, y: 10 }}
//         animate={{ opacity: 1, y: 0 }}
//         transition={{ duration: 1 }}
//         className="text-4xl tracking-[0.3em] mb-10"
//         style={{ fontFamily: 'var(--font-playfair)' }}
//       >
//         <motion.span
//           animate={isComplete ? {
//             color: '#c8834a',
//             textShadow: '0px 0px 20px rgba(200,131,74,0.6)',
//           } : {
//             color: 'rgba(255,255,255,0.5)',
//             textShadow: '0px 0px 0px rgba(200,131,74,0)',
//           }}
//           transition={{ duration: 0.8, ease: 'easeInOut' }}
//         >
//           KAIROX
//         </motion.span>
//       </motion.h1>
//       <div className="w-48 h-[1px] bg-[#222] relative overflow-hidden">
//         <motion.div
//           className="absolute top-0 left-0 h-full bg-[#c8b09b]"
//           initial={{ width: 0 }}
//           animate={{ width: `${progress}%` }}
//           transition={{ ease: 'easeOut', duration: 0.1 }}
//         />
//       </div>
//       <p className="text-[#555] mt-4 font-mono text-xs tracking-widest">{progress}%</p>
//     </motion.div>
//   );
// }

// /* ─── Main Landing Page ───────────────────────────── */
// export default function Home() {
//   const { user, login } = useAuth();
//   const router = useRouter();
//   const [mounted, setMounted] = useState(false);
//   const [loadingComplete, setLoadingComplete] = useState(false);

//   const [activePanel, setActivePanel] = useState(null);
//   const [showLogin, setShowLogin] = useState(false);

//   // Login Form States
//   const [username, setUsername] = useState('');
//   const [password, setPassword] = useState('');
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [isSuccess, setIsSuccess] = useState(false);
//   const [loginError, setLoginError] = useState('');

//   useEffect(() => { setMounted(true); }, []);
//   if (!mounted) return null;

//   const handlePanelClick = (panel) => {
//     setActivePanel(panel);
//   };

//   const handlePrev = (e) => {
//     e.stopPropagation();
//     const currentIndex = PANELS.findIndex(p => p.role === activePanel.role);
//     const prevIndex = currentIndex > 0 ? currentIndex - 1 : PANELS.length - 1;
//     setActivePanel(PANELS[prevIndex]);
//   };

//   const handleNext = (e) => {
//     e.stopPropagation();
//     const currentIndex = PANELS.findIndex(p => p.role === activePanel.role);
//     const nextIndex = currentIndex < PANELS.length - 1 ? currentIndex + 1 : 0;
//     setActivePanel(PANELS[nextIndex]);
//   };

//   const handleClosePanel = () => {
//     setActivePanel(null);
//     setShowLogin(false);
//     setUsername('');
//     setPassword('');
//     setLoginError('');
//     setIsSubmitting(false);
//     setIsSuccess(false);
//   };

//   const handleLoginSubmit = async (e) => {
//     e.preventDefault();
//     if (!username || !password) return;

//     setLoginError('');
//     setIsSubmitting(true);

//     try {
//       // // Call actual backend authentication API
//       const data = await apiLogin(username, password);

//       // Enforce Role Matching (User must click the right card for their credentials)
//       if (data.role && activePanel && data.role !== activePanel.role) {
//         throw new Error('Access Denied: The credentials provided do not match the selected role. Please check your credentials.');
//       }

//       // // On success, trigger the exit animation
//        setIsSuccess(true);

//       // // Navigate immediately while the animation plays
//       login(data.role || activePanel.role, data.access_token);
//     // login(activePanel.role, 'temp_dummy_token');
//       router.push('/dashboard');

//     } catch (err) {
//       setIsSubmitting(false);
//       setIsSuccess(false);
//       setLoginError(err.message || 'Authentication Failed. Please check credentials.');
//     }
//   };

//   return (
//     <>
//       <AnimatePresence>
//         {!loadingComplete && <Preloader onComplete={() => setLoadingComplete(true)} />}
//       </AnimatePresence>

//       <div className="min-h-screen bg-[#050505] text-white overflow-x-hidden overflow-y-auto relative selection:bg-[#c8b09b]/30">

//         {/* KAIROX wordmark top-left */}
//         <motion.div
//           className="absolute top-6 left-6 md:top-10 md:left-12 z-40"
//           initial={{ opacity: 0 }}
//           animate={loadingComplete && !activePanel ? { opacity: 1 } : { opacity: 0 }}
//           transition={{ duration: 1 }}
//         >
//           <span className="text-xl tracking-[0.3em]"><AnimatedGoldText text="KAIROX" /></span>
//           <p className="text-[9px] tracking-[0.2em] uppercase mt-1 text-white/40 font-sans">
//             Intelligence
//           </p>
//         </motion.div>



//         {/* Center Text */}
//         <motion.div
//           className="absolute top-28 md:top-32 left-0 w-full text-center z-30 px-4"
//           initial={{ opacity: 0, y: 20 }}
//           animate={loadingComplete && !activePanel ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
//           transition={{ duration: 1, delay: 0.2 }}
//         >
//           <p className="text-[#666] font-mono text-[10px] tracking-[0.4em] uppercase mb-4">Select Workspace</p>
//           <h2 className="text-3xl md:text-5xl tracking-wide" style={{ fontFamily: 'var(--font-playfair)' }}>
//             <motion.span
//               className="inline-block cursor-default"
//               initial="rest"
//               whileHover="hover"
//               animate="rest"
//             >
//               {'Select your role'.split('').map((char, i) => (
//                 <motion.span
//                   key={i}
//                   className="inline-block"
//                   variants={{
//                     rest: { color: '#ffffff', y: 0, textShadow: 'none' },
//                     hover: {
//                       color: ['#ffffff', '#c8834a', '#ffffff'],
//                       y: [0, -6, 0],
//                       textShadow: ['none', '0px 0px 20px rgba(200,131,74,0.7)', 'none'],
//                       transition: { duration: 0.5, delay: i * 0.04, ease: 'easeInOut' }
//                     }
//                   }}
//                 >
//                   {char === ' ' ? '\u00A0' : char}
//                 </motion.span>
//               ))}
//             </motion.span>
//           </h2>
//         </motion.div>

//         {/* ─── Aperture Style Landing Layout ─── */}
//         <div className="relative z-20 w-full flex-1 flex items-center justify-center min-h-screen overflow-hidden">

//           {/* State 1: All panels as vertical slices in the center */}
//           <AnimatePresence>
//             {!activePanel && (
//               <motion.div
//                 className="flex items-center justify-center gap-2 md:gap-6 mt-32 md:mt-48 z-30"
//                 initial={{ opacity: 0 }}
//                 animate={loadingComplete ? { opacity: 1 } : { opacity: 0 }}
//                 exit={{ opacity: 0 }}
//               >
//                 {PANELS.map((panel, i) => {
//                   return (
//                     <motion.div
//                       key={panel.role}
//                       layoutId={`panel-bg-${panel.role}`}
//                       onClick={() => handlePanelClick(panel)}
//                       className="relative w-[60px] md:w-[120px] h-[300px] md:h-[450px] cursor-pointer overflow-hidden grayscale hover:grayscale-0 transition-all duration-500 border border-white/10 hover:border-white/30"
//                     >
//                       <motion.div
//                         className="absolute inset-0 bg-cover bg-center"
//                         style={{ backgroundImage: `url(${panel.img})` }}
//                       />
//                       <div className="absolute inset-0 bg-black/40 hover:bg-transparent transition-colors duration-500 pointer-events-none" />
//                     </motion.div>
//                   );
//                 })}
//               </motion.div>
//             )}
//           </AnimatePresence>

//           {/* State 2: Active panel expanded, others on the right */}
//           <AnimatePresence>
//             {activePanel && !showLogin && (
//               <>
//                 {/* Center Expanded Active Panel */}
//                 <motion.div
//                   key={activePanel.role}
//                   layoutId={`panel-bg-${activePanel.role}`}
//                   onClick={() => setShowLogin(true)}
//                   className="group absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90vw] md:w-[80vw] max-w-[1000px] h-[60vh] md:h-[70vh] z-30 overflow-hidden shadow-2xl border border-white/10 cursor-pointer bg-black"
//                 >
//                   <div
//                     className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
//                     style={{ backgroundImage: `url(${activePanel.img})` }}
//                   />
//                   <div className="absolute inset-0 bg-black/40 transition-colors duration-500 group-hover:bg-black/50" />

//                   {/* Title centered inside */}
//                   <motion.div
//                     initial={{ opacity: 0, scale: 0.9 }}
//                     animate={{ opacity: 1, scale: 1 }}
//                     transition={{ delay: 0.3, duration: 0.6 }}
//                     className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4"
//                   >
//                     <activePanel.icon className="w-12 h-12 mb-6" style={{ color: activePanel.accent }} strokeWidth={1} />
//                     <h2 className="text-4xl md:text-7xl font-serif uppercase tracking-[0.2em] text-center" style={{ color: activePanel.accent }}>
//                       {activePanel.title.split('\n').join(' ')}
//                     </h2>
//                   </motion.div>

//                   {/* Corner Accents (Aperture style) */}
//                   <div className="absolute top-6 left-6 w-8 h-8 border-t-[1px] border-l-[1px]" style={{ borderColor: activePanel.accent }} />
//                   <div className="absolute top-6 right-6 w-8 h-8 border-t-[1px] border-r-[1px]" style={{ borderColor: activePanel.accent }} />
//                   <div className="absolute bottom-6 left-6 w-8 h-8 border-b-[1px] border-l-[1px]" style={{ borderColor: activePanel.accent }} />
//                   <div className="absolute bottom-6 right-6 w-8 h-8 border-b-[1px] border-r-[1px]" style={{ borderColor: activePanel.accent }} />

//                   {/* Hover Arrow Icon (Up Right) */}
//                   <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//                     <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-md border border-white/20 flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
//                       <ArrowUpRight className="w-6 h-6" style={{ color: activePanel.accent }} />
//                     </div>
//                   </div>

//                   {/* Mobile Navigation Arrows */}
//                   <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-2 md:hidden z-50 pointer-events-none">
//                     <button
//                       onClick={handlePrev}
//                       className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto"
//                     >
//                       <ArrowRight className="w-5 h-5 text-white rotate-180" />
//                     </button>
//                     <button
//                       onClick={handleNext}
//                       className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-md border border-white/20 flex items-center justify-center pointer-events-auto"
//                     >
//                       <ArrowRight className="w-5 h-5 text-white" />
//                     </button>
//                   </div>
//                 </motion.div>

//                 {/* Actions below the expanded panel */}
//                 <motion.div
//                   initial={{ opacity: 0, y: 20 }}
//                   animate={{ opacity: 1, y: 0 }}
//                   transition={{ delay: 0.4, duration: 0.4 }}
//                   className="absolute top-[calc(50%+35vh+30px)] left-1/2 -translate-x-1/2 z-40 flex items-center gap-6"
//                 >
//                   <button
//                     onClick={() => setActivePanel(null)}
//                     className="w-10 h-10 flex items-center justify-center rounded-full border border-white/20 text-white/60 hover:text-white hover:border-white/50 transition-colors bg-black/40 backdrop-blur-md"
//                   >
//                     ✕
//                   </button>
//                   <button
//                     onClick={() => setShowLogin(true)}
//                     className="px-8 py-3 rounded-full border bg-black/40 backdrop-blur-md hover:bg-white/10 tracking-[0.2em] uppercase text-xs font-bold transition-colors"
//                     style={{ borderColor: activePanel.accent, color: activePanel.accent }}
//                   >
//                     Sign In
//                   </button>
//                 </motion.div>

//                 {/* Navigation Panels (Left and Right) */}
//                 {(() => {
//                   const currentIndex = PANELS.findIndex(p => p.role === activePanel.role);
//                   const prevPanels = PANELS.slice(0, currentIndex);
//                   const nextPanels = PANELS.slice(currentIndex + 1);

//                   return (
//                     <>
//                       {/* Previous Panels (Left Side) - Hidden on mobile */}
//                       <div className="hidden md:flex absolute left-0 top-1/2 -translate-y-1/2 pl-2 md:pl-8 gap-2 md:gap-4 z-40">
//                         {prevPanels.map(panel => (
//                           <motion.div
//                             key={panel.role}
//                             layoutId={`panel-bg-${panel.role}`}
//                             onClick={() => handlePanelClick(panel)}
//                             className="group w-[40px] md:w-[100px] h-[30vh] md:h-[50vh] cursor-pointer overflow-hidden grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 border border-white/10 relative shadow-xl"
//                           >
//                             <div
//                               className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
//                               style={{ backgroundImage: `url(${panel.img})` }}
//                             />
//                             <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
//                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//                               <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
//                                 <ArrowRight className="w-4 h-4 text-white rotate-180" />
//                               </div>
//                             </div>
//                           </motion.div>
//                         ))}
//                       </div>

//                       {/* Next Panels (Right Side) - Hidden on mobile */}
//                       <div className="hidden md:flex absolute right-0 top-1/2 -translate-y-1/2 pr-2 md:pr-8 gap-2 md:gap-4 z-40">
//                         {nextPanels.map(panel => (
//                           <motion.div
//                             key={panel.role}
//                             layoutId={`panel-bg-${panel.role}`}
//                             onClick={() => handlePanelClick(panel)}
//                             className="group w-[40px] md:w-[100px] h-[30vh] md:h-[50vh] cursor-pointer overflow-hidden grayscale hover:grayscale-0 transition-all duration-500 opacity-60 hover:opacity-100 border border-white/10 relative shadow-xl"
//                           >
//                             <div
//                               className="w-full h-full bg-cover bg-center transition-transform duration-700 group-hover:scale-110"
//                               style={{ backgroundImage: `url(${panel.img})` }}
//                             />
//                             <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent transition-colors duration-500" />
//                             <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
//                               <div className="w-8 h-8 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
//                                 <ArrowRight className="w-4 h-4 text-white" />
//                               </div>
//                             </div>
//                           </motion.div>
//                         ))}
//                       </div>
//                     </>
//                   );
//                 })()}
//               </>
//             )}
//           </AnimatePresence>
//         </div>

//         {/* ─── Fullscreen Login Form ─── */}
//         <AnimatePresence>
//           {showLogin && activePanel && (
//             <motion.div
//               initial={{ opacity: 0 }}
//               animate={{ opacity: 1 }}
//               exit={{ opacity: 0 }}
//               transition={{ duration: 0.6 }}
//               className="fixed inset-0 z-[150] flex items-center justify-center bg-[#050505]"
//             >
//               {/* Fullscreen background image from the active panel */}
//               <div
//                 className="absolute inset-0 bg-cover bg-center opacity-20"
//                 style={{ backgroundImage: `url(${activePanel.img})` }}
//               />
//               <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-[#050505]/80 to-transparent" />

//               <motion.div
//                 initial={{ opacity: 0, y: 30 }}
//                 animate={isSuccess ? { opacity: 0, scale: 0.95 } : { opacity: 1, y: 0 }}
//                 transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
//                 className="relative z-10 w-full max-w-md bg-[#0a0a0a] overflow-hidden shadow-2xl border border-[#222] rounded-2xl"
//               >
//                 {/* Top Accent Line */}
//                 <div
//                   className="absolute top-0 left-0 w-full h-[3px]"
//                   style={{ backgroundColor: activePanel.accent }}
//                 />

//                 {/* Close Button */}
//                 <button
//                   onClick={handleClosePanel}
//                   className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-white/50 hover:text-white rounded-full transition-colors z-20"
//                 >
//                   ✕
//                 </button>

//                 <div className="px-8 pb-8 pt-10">
//                   <div className="flex flex-col items-center mb-8">
//                     <activePanel.icon className="w-10 h-10 mb-4" style={{ color: activePanel.accent }} strokeWidth={1} />
//                     <h2 className="text-3xl font-serif text-white leading-tight text-center">
//                       {activePanel.title.replace('\n', ' ')}
//                     </h2>
//                     <p className="text-white/40 text-[10px] tracking-widest uppercase mt-2">
//                       Workspace Authentication
//                     </p>
//                   </div>

//                   {loginError && (
//                     <div className="w-full bg-red-950/30 border border-red-900/50 text-red-400 text-xs p-3 mb-6 rounded text-center">
//                       {loginError}
//                     </div>
//                   )}

//                   <form onSubmit={handleLoginSubmit} className="w-full flex flex-col gap-5">
//                     <div className="flex flex-col gap-2">
//                       <label className="text-[10px] text-white/50 tracking-[0.2em] uppercase">Username</label>
//                       <input
//                         type="text"
//                         value={username}
//                         onChange={(e) => setUsername(e.target.value)}
//                         required
//                         placeholder="Enter username"
//                         className="w-full bg-[#111] border border-[#222] text-white p-4 focus:outline-none focus:border-[#c8b09b] transition-colors font-mono tracking-widest text-sm"
//                       />
//                     </div>

//                     <div className="flex flex-col gap-2">
//                       <label className="text-[10px] text-white/50 tracking-[0.2em] uppercase">Password</label>
//                       <input
//                         type="password"
//                         value={password}
//                         onChange={(e) => setPassword(e.target.value)}
//                         required
//                         placeholder="Enter password"
//                         className="w-full bg-[#111] border border-[#222] text-white p-4 focus:outline-none focus:border-[#c8b09b] transition-colors font-mono tracking-widest text-sm"
//                       />
//                     </div>

//                     <button
//                       type="submit"
//                       disabled={isSubmitting || isSuccess}
//                       className="w-full py-4 mt-6 font-bold text-xs uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 relative overflow-hidden group disabled:opacity-70"
//                       style={{ backgroundColor: activePanel.accent, color: '#000' }}
//                     >
//                       {isSubmitting ? (
//                         <Loader2 className="w-5 h-5 animate-spin relative z-10" />
//                       ) : (
//                         <>
//                           <span className="relative z-10">Sign In</span>
//                           <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
//                         </>
//                       )}
//                     </button>
//                   </form>
//                 </div>
//               </motion.div>
//             </motion.div>
//           )}
//         </AnimatePresence>

//       </div>
//     </>
//   );
// }
