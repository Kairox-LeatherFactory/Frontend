'use client';
import { motion } from 'framer-motion';

export default function DashboardLoading() {
  const particles = [
    { size: 1.5, left: '16%', delay: 0.1, duration: 1.2 },
    { size: 2, left: '34%', delay: 0.25, duration: 1.4 },
    { size: 1.5, left: '52%', delay: 0.4, duration: 1.3 },
    { size: 2, left: '70%', delay: 0.55, duration: 1.5 },
    { size: 1.5, left: '86%', delay: 0.7, duration: 1.3 },
  ];

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center p-6 select-none animate-fade-in">
      <div className="flex flex-col items-center justify-center w-full max-w-[320px] sm:max-w-[360px] space-y-2.5">
        {/* Loading Text Above the Bar */}
        <div className="flex items-center justify-center text-[11px] sm:text-xs font-black uppercase tracking-[0.25em] text-[#8c6b4a]">
          Loading
        </div>

        {/* Hairline Ultra-Thin Progress Bar (3.5px) */}
        <div className="relative w-full h-[3.5px] rounded-full bg-[#ebdccb] overflow-hidden shadow-inner">
          {/* Fills smoothly from 0% -> 100% synchronously with page opening */}
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{
              duration: 0.85,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="relative h-full rounded-full overflow-hidden"
            style={{
              background: 'linear-gradient(90deg, #a86530 0%, #c8834a 50%, #e89554 100%)',
              boxShadow: '0 0 8px rgba(200, 131, 74, 0.5)',
            }}
          >
            {/* Soft Shimmer Wave */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '250%' }}
              transition={{
                duration: 0.85,
                ease: 'linear',
              }}
              className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
            />

            {/* Hairline Micro-Particles */}
            {particles.map((p, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 0.9, 0.4] }}
                transition={{
                  duration: p.duration,
                  delay: p.delay,
                  ease: 'easeInOut',
                }}
                className="absolute top-1/2 -translate-y-1/2 rounded-full bg-white shadow-sm"
                style={{
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                  left: p.left,
                }}
              />
            ))}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
