/**
 * Constants and Styling Configurations for Analytics Dashboard
 *
 * Defines design tokens, animation transitions, color schemes,
 * and glassmorphism panel styles.
 */

// Brand color palette matching the luxury leather factory theme
export const BRAND = {
  accent: '#c8834a',
  accentDark: '#a0622e',
  accentLight: 'rgba(200, 131, 74, 0.1)',
  accentBorder: 'rgba(200, 131, 74, 0.2)',
  textDark: '#2d1f0e',
  textMuted: '#9a7a5a',
  bgLight: '#faf6f0',
};

// Smooth fade-in animation variant for dashboard tabs and views
export const tabFade = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
  },
};

// Glassmorphism translucent container styling with backdrop blur
export const glassPanelStyle = {
  background: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(20px)',
  border: '1px solid rgba(255, 255, 255, 0.8)',
  boxShadow: '0 8px 32px rgba(139, 107, 74, 0.08)',
};
