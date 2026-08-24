'use client';
import { useEffect } from 'react';

// Browsers change a focused <input type="number">'s value when the mouse
// wheel scrolls over it — surprising when the user is just scrolling the
// page past a numeric field. Blurring the input on wheel (before the
// browser applies its default scroll-to-change action, which requires
// focus) neutralizes that everywhere, so every number input in the app
// only changes by typing, without editing each one individually.
export default function NumberInputWheelGuard() {
  useEffect(() => {
    function handleWheel(e) {
      const target = e.target;
      if (target instanceof HTMLInputElement && target.type === 'number') {
        target.blur();
      }
    }
    // Capture phase: runs before the event reaches the input itself, so it
    // can't be skipped by some component's own onWheel handler further down.
    document.addEventListener('wheel', handleWheel, { capture: true, passive: true });
    return () => document.removeEventListener('wheel', handleWheel, { capture: true });
  }, []);

  return null;
}
