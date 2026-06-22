'use client';
import { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    // Disable on touch devices
    if (typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches) {
      return;
    }

    const dot = dotRef.current;
    const ring = ringRef.current;
    if (!dot || !ring) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    let ringX = mouseX;
    let ringY = mouseY;

    // Hide default cursor
    document.body.classList.add('custom-cursor-active');

    const handleMouseMove = (e) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      
      // Dot follows instantly
      dot.style.left = `${mouseX}px`;
      dot.style.top = `${mouseY}px`;
    };

    const animateRing = () => {
      // Ring follows with slight lag (lerp)
      ringX += (mouseX - ringX) * 0.4;
      ringY += (mouseY - ringY) * 0.4;
      
      ring.style.left = `${ringX}px`;
      ring.style.top = `${ringY}px`;
      
      requestAnimationFrame(animateRing);
    };

    const handleMouseOver = (e) => {
      const target = e.target;
      const isInteractive = target.closest('a, button, input, textarea, select, [role="button"], .interactive');
      if (isInteractive) {
        dot.classList.add('hovering');
        ring.classList.add('hovering');
      } else {
        dot.classList.remove('hovering');
        ring.classList.remove('hovering');
      }
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseover', handleMouseOver);
    const rafId = requestAnimationFrame(animateRing);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseover', handleMouseOver);
      cancelAnimationFrame(rafId);
      document.body.classList.remove('custom-cursor-active');
    };
  }, []);

  return (
    <>
      <div 
        ref={dotRef}
        className="cursor-dot pointer-events-none fixed w-2 h-2 -ml-1 -mt-1 rounded-full z-[9999] transition-transform duration-200"
        style={{ left: '-20px', top: '-20px', background: '#c8834a' }}
      />
      <div 
        ref={ringRef}
        className="cursor-ring pointer-events-none fixed w-10 h-10 -ml-5 -mt-5 rounded-full z-[9998] transition-[transform,background-color,border-color] duration-300"
        style={{ left: '-20px', top: '-20px', border: '1.5px solid rgba(200,131,74,0.6)' }}
      />
      <style jsx global>{`
        /* Hide default cursor */
        body.custom-cursor-active, 
        body.custom-cursor-active * {
          cursor: none !important;
        }

        /* Hover states */
        .cursor-dot.hovering {
          transform: scale(0.2);
          opacity: 0;
        }
        
        .cursor-ring.hovering {
          transform: scale(1.5);
          background: rgba(200,131,74,0.08);
          border-color: #c8834a;
        }
      `}</style>
    </>
  );
}
