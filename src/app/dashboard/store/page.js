'use client';
import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiStoreScan, apiStoreRelease } from '@/lib/api';
import { Box, Search, CheckCircle2, AlertTriangle, Layers, Send, Package, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { fadeUpItem } from '@/lib/motionVariants';

export default function StoreVerificationPage() {
  const { user, token } = useAuth();
  const [drawerCode, setDrawerCode] = useState('');
  const [pieceCode, setPieceCode] = useState('');
  const [part, setPart] = useState('LEATHER'); // 'LEATHER' | 'LINING'
  
  const [scanStatus, setScanStatus] = useState(null); // success / error
  const [scanMessage, setScanMessage] = useState('');
  const [scanData, setScanData] = useState(null);
  
  const drawerInputRef = useRef(null);
  const pieceInputRef = useRef(null);
  
  // Manager Release State
  const [managerDrawer, setManagerDrawer] = useState('');
  const [releaseStatus, setReleaseStatus] = useState(null);
  const [releaseMessage, setReleaseMessage] = useState('');

  // Check role access
  const isManager = ['managing_director', 'direct_manager'].includes(user);
  const isScanner = ['store_scan', 'employee', 'supervisor', 'managing_director', 'direct_manager'].includes(user);
  
  // Handlers
  const handleScan = async (e) => {
    e.preventDefault();
    if (!drawerCode || !pieceCode) return;
    
    try {
      setScanStatus('loading');
      const data = await apiStoreScan(token, drawerCode, pieceCode, part);
      
      setScanStatus('success');
      setScanMessage('Part successfully logged to drawer!');
      setScanData(data);
      
      // Clear piece code for next scan
      setPieceCode('');
      pieceInputRef.current?.focus();
    } catch (err) {
      setScanStatus('error');
      // If 409 conflict, emphasize it
      setScanMessage(err.status === 409 ? '🛑 MISMATCH: This piece does not belong in this drawer! Or drawer is already processed.' : err.message);
      setScanData(null);
    }
  };

  const handleRelease = async (transition) => {
    if (!managerDrawer) return;
    try {
      setReleaseStatus('loading');
      const data = await apiStoreRelease(token, managerDrawer, transition);
      
      setReleaseStatus('success');
      setReleaseMessage(`Drawer successfully transitioned to ${transition}!`);
    } catch (err) {
      setReleaseStatus('error');
      setReleaseMessage(err.status === 409 ? `🛑 CANNOT TRANSITION: Drawer parts are missing or invalid state.` : err.message);
    }
  };

  if (!user) return <div className="p-8 font-bold">Please log in to access the Store Dashboard.</div>;
  if (!isScanner) return <div className="p-8 font-bold text-red-600">Access Denied. Store Scan role required.</div>;

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6 pb-24">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-800 flex items-center gap-2">
          <Layers className="w-7 h-7 text-[#c8834a]" /> Store & Drawer Verification
        </h1>
        <p className="text-slate-500 font-bold text-sm">Scan incoming Leather and Lining pieces to drawers, and authorize releases.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* SECTION A: WORKER SCANNER */}
        <motion.div variants={fadeUpItem} initial="hidden" animate="show" className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative">
          <div className="absolute top-0 left-0 w-full h-1 bg-[#c8834a]" />
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Box className="w-5 h-5 text-[#c8834a]" />
            <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider">Step 1: Drawer Deposit Scan</h2>
          </div>
          
          <form onSubmit={handleScan} className="p-6 space-y-6 bg-slate-50 flex-grow">
            
            <div className="flex gap-4 p-1 bg-white border border-slate-200 rounded-xl w-max shadow-sm">
              <button type="button" onClick={() => setPart('LEATHER')} className={`px-6 py-2 text-xs font-black rounded-lg transition-colors ${part === 'LEATHER' ? 'bg-amber-100 text-amber-800' : 'text-slate-400 hover:text-slate-700'}`}>LEATHER PART</button>
              <button type="button" onClick={() => setPart('LINING')} className={`px-6 py-2 text-xs font-black rounded-lg transition-colors ${part === 'LINING' ? 'bg-indigo-100 text-indigo-800' : 'text-slate-400 hover:text-slate-700'}`}>LINING PART</button>
            </div>

            <div className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">1. Scan Drawer Barcode</label>
                <div className="relative">
                  <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    ref={drawerInputRef}
                    value={drawerCode}
                    onChange={(e) => setDrawerCode(e.target.value.toUpperCase())}
                    placeholder="e.g. DRW-0007"
                    className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c8834a]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">2. Scan Garment Piece Barcode</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    ref={pieceInputRef}
                    value={pieceCode}
                    onChange={(e) => setPieceCode(e.target.value.toUpperCase())}
                    placeholder="e.g. JP-...-M-007"
                    className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#c8834a]"
                  />
                </div>
              </div>
            </div>

            <button type="submit" disabled={!drawerCode || !pieceCode || scanStatus === 'loading'} className="w-full h-12 bg-[#c8834a] hover:bg-[#b07340] text-white rounded-xl font-black text-sm uppercase tracking-wider transition-colors disabled:opacity-50">
              {scanStatus === 'loading' ? 'Processing...' : `Submit to Drawer`}
            </button>

            <AnimatePresence mode="wait">
              {scanStatus === 'error' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-100 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-black text-red-800 text-sm">Scan Failed</h4>
                    <p className="text-xs font-bold text-red-700 mt-1">{scanMessage}</p>
                  </div>
                </motion.div>
              )}
              {scanStatus === 'success' && scanData && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <h4 className="font-black text-emerald-800 text-sm">Drawer Updated: {scanData.drawer_code}</h4>
                  </div>
                  
                  <div className="bg-white p-3 rounded-lg border border-emerald-100 space-y-2">
                     <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">Current State:</span>
                        <span className="font-black text-slate-800 px-2 py-1 bg-slate-100 rounded uppercase">{scanData.state}</span>
                     </div>
                     <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500">Awaiting Parts:</span>
                        <div className="flex gap-1">
                           {(scanData.awaiting || []).length > 0 ? (
                             scanData.awaiting.map(a => <span key={a} className="font-black text-amber-700 bg-amber-100 px-2 py-1 rounded text-[10px] uppercase">{a}</span>)
                           ) : (
                             <span className="font-black text-emerald-700 bg-emerald-100 px-2 py-1 rounded text-[10px] uppercase">READY</span>
                           )}
                        </div>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </form>
        </motion.div>

        {/* SECTION B: MANAGER RELEASE */}
        <motion.div variants={fadeUpItem} initial="hidden" animate="show" className={`bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col relative ${!isManager ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
           {!isManager && (
             <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] z-20 flex flex-col items-center justify-center">
                <Lock className="w-10 h-10 text-slate-400 mb-2" />
                <span className="font-black text-slate-700 text-sm">Manager Access Required</span>
             </div>
           )}

          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500" />
          <div className="p-5 border-b border-slate-100 flex items-center gap-2">
            <Send className="w-5 h-5 text-indigo-500" />
            <h2 className="font-black text-slate-800 text-sm uppercase tracking-wider">Step 2: Manager Release</h2>
          </div>
          
          <div className="p-6 space-y-6 bg-slate-50 flex-grow">
            
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Scan Drawer Barcode</label>
              <div className="relative">
                <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={managerDrawer}
                  onChange={(e) => setManagerDrawer(e.target.value.toUpperCase())}
                  placeholder="e.g. DRW-0007"
                  className="w-full h-12 pl-10 pr-4 bg-white border border-slate-200 rounded-xl text-sm font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={() => handleRelease('RECEIVED')}
                disabled={!managerDrawer || releaseStatus === 'loading'}
                className="flex flex-col items-center justify-center p-4 bg-white border border-indigo-200 hover:border-indigo-400 rounded-xl transition-colors disabled:opacity-50 gap-2"
              >
                <CheckCircle2 className="w-6 h-6 text-indigo-600" />
                <span className="text-xs font-black text-indigo-900 uppercase">1. Mark Received</span>
              </button>

              <button 
                onClick={() => handleRelease('SENDED')}
                disabled={!managerDrawer || releaseStatus === 'loading'}
                className="flex flex-col items-center justify-center p-4 bg-white border border-emerald-200 hover:border-emerald-400 rounded-xl transition-colors disabled:opacity-50 gap-2"
              >
                <Send className="w-6 h-6 text-emerald-600" />
                <span className="text-xs font-black text-emerald-900 uppercase">2. Mark Sended</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {releaseStatus === 'error' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-red-100 border border-red-200 rounded-xl flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-black text-red-800 text-sm">Release Failed</h4>
                    <p className="text-xs font-bold text-red-700 mt-1">{releaseMessage}</p>
                  </div>
                </motion.div>
              )}
              {releaseStatus === 'success' && (
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-3">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
                  <div>
                    <h4 className="font-black text-emerald-800 text-sm">Success</h4>
                    <p className="text-xs font-bold text-emerald-700 mt-1">{releaseMessage}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

          </div>
        </motion.div>

      </div>
    </div>
  );
}
