'use client';
import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ============================================================================
 * ToastStack Component
 * ============================================================================
 * WHAT IT IS:
 * Floating notification alert stack positioned at the top-right corner of the screen.
 *
 * WHY IT EXISTS:
 * Gives immediate visual feedback to the user when actions succeed or fail
 * (e.g. "Barcode copied", "Material received", "Print job sent").
 *
 * HOW IT WORKS:
 * - Uses React Portal (`createPortal`) to attach to `document.body` so parent overflow cannot clip it.
 * - Uses Framer Motion for smooth slide-in and fade-out animations.
 */
export default function ToastStack({ toasts }) {
  // --------------------------------------------------------------------------
  // 1. STATE & MOUNT CHECK
  // --------------------------------------------------------------------------
  // Tracks client hydration so portal is only mounted in browser (not SSR)
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  // --------------------------------------------------------------------------
  // 2. TOAST COLOR THEMES
  // --------------------------------------------------------------------------
  // Left border colors corresponding to notification severity
  const colors = {
    success: '#16a34a', // Green for success
    error: '#dc2626',   // Red for error
    info: '#2563eb'     // Blue for informative tips
  };

  // Wait until mounted in browser before rendering portal
  if (!mounted) return null;

  // --------------------------------------------------------------------------
  // 3. RENDER TOAST STACK (PORTAL INTO BODY)
  // --------------------------------------------------------------------------
  return createPortal(
    <div className="toast-stack fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none w-[300px]">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 24, scale: 0.96 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.96 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
            style={{
              background: '#2a1d11',
              borderLeft: `4px solid ${colors[t.type] || colors.success}`,
            }}
          >
            {/* Toast message text */}
            {t.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>,
    document.body
  );
}
