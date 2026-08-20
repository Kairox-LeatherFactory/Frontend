'use client';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

// Shared modal shell: backdrop fade + panel spring scale-in/out via AnimatePresence.
// Replaces the old `animate-fade-in` + `animate-scale-up` (the latter was never
// defined anywhere, so panels rendered with zero enter animation and no exit
// animation at all — conditional `{flag && createPortal(...)}` unmounts instantly).
// Callers must keep AnimatedModal mounted and toggle `isOpen` (not conditionally
// render it) so the exit transition can play.
export default function AnimatedModal({
  isOpen,
  onClose,
  children,
  panelClassName = '',
  panelStyle,
  overlayClassName = '',
  zIndex = 99999,
}) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={`fixed inset-0 flex items-center justify-center p-4 overflow-y-auto ${overlayClassName}`}
          style={{ background: 'rgba(15, 23, 42, 0.6)', zIndex }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
        >
          <motion.div
            className={panelClassName}
            style={panelStyle}
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 380, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
