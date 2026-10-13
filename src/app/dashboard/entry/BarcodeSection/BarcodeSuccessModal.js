'use client';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

export default function BarcodeSuccessModal({ barcodeSuccessModal, setBarcodeSuccessModal }) {
  if (!barcodeSuccessModal) return null;

  const stageName = barcodeSuccessModal.stage || 'Stage';

  return createPortal(
    <div
      onClick={() => setBarcodeSuccessModal(null)}
      className="fixed inset-0 z-[999999] flex flex-col items-center justify-center bg-[#faf7f2]/95 backdrop-blur-md p-6 select-none cursor-pointer overflow-hidden animate-fade-in"
    >
      {/* Background Soft Ripple Animation */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <motion.div
          initial={{ scale: 0.8, opacity: 0.5 }}
          animate={{ scale: [0.8, 1.8, 2.5], opacity: [0.4, 0.15, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut' }}
          className="w-72 h-72 rounded-full bg-amber-400/10 absolute"
        />
        <motion.div
          initial={{ scale: 0.8, opacity: 0.6 }}
          animate={{ scale: [0.8, 1.4, 2], opacity: [0.5, 0.2, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: 'easeOut', delay: 0.4 }}
          className="w-56 h-56 rounded-full bg-[#c8834a]/10 absolute"
        />
      </div>

      <div
        onClick={(e) => e.stopPropagation()}
        className="relative z-10 flex flex-col items-center text-center max-w-md w-full space-y-6 px-4"
      >
        {/* Animated Checkmark Circle */}
        <motion.div
          initial={{ scale: 0, rotate: -45 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            type: 'spring',
            stiffness: 300,
            damping: 20,
            delay: 0.1,
          }}
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-full bg-white border-2 border-[#c8834a]/30 flex items-center justify-center shadow-[0_8px_30px_rgba(200,131,74,0.18)] relative"
        >
          <motion.div
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Check className="w-16 h-16 sm:w-20 sm:h-20 text-[#c8834a] stroke-[3.5]" />
          </motion.div>
        </motion.div>

        {/* Stage Name Announcement */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="space-y-2"
        >
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-[#2d1f0e]">
            {stageName} Successful!
          </h2>
          <p className="text-sm sm:text-base font-bold text-[#8c6b4a]">
            Production Stage Event Logged Successfully
          </p>
        </motion.div>

        {/* Action Button */}
        <motion.button
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.3 }}
          type="button"
          onClick={() => setBarcodeSuccessModal(null)}
          className="w-full sm:w-auto min-w-[160px] h-13 px-8 rounded-2xl bg-[#c8834a] text-white font-black text-sm uppercase tracking-wider shadow-lg hover:bg-[#b5733c] active:scale-95 transition-all cursor-pointer"
        >
          Done
        </motion.button>
      </div>
    </div>,
    document.body
  );
}
