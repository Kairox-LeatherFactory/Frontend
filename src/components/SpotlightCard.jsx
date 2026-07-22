'use client';
import { useRef, useState } from 'react';

export default function SpotlightCard({ children, className = '', spotlightColor = 'rgba(200, 131, 74, 0.15)', style, ...props }) {
  const divRef = useRef(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = (e) => {
    if (!divRef.current) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setOpacity(1)}
      onMouseLeave={() => setOpacity(0)}
      className={`relative transition-all duration-300 ${className}`}
      style={style}
      {...props}
    >
      {/* Background spotlight layer that clips to the card's border radius */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit] z-0">
        <div
          className="absolute -inset-px transition-opacity duration-300"
          style={{
            opacity,
            background: `radial-gradient(600px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 40%)`,
          }}
        />
      </div>
      <div className="relative z-10 h-full">
        {children}
      </div>
    </div>
  );
}
