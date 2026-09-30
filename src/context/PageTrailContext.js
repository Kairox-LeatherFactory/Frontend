'use client';
import { createContext, useContext, useEffect } from 'react';

// The app header shows "<page title> › <sub-level> › …" like a folder path.
// The layout owns the trail; a page reports where the user is inside it.
const PageTrailContext = createContext(() => {});

export const PageTrailProvider = PageTrailContext.Provider;

/**
 * Report the levels below the page's header title, e.g.
 * usePageTrail(['Breakdown Review', 'PO 123456']) on the Production Logger →
 * "Production Logger › Breakdown Review › PO 123456". Falsy entries are skipped;
 * the trail clears when the page unmounts.
 */
export function usePageTrail(crumbs) {
  const setTrail = useContext(PageTrailContext);
  const key = crumbs.filter(Boolean).join('\u0000');
  useEffect(() => {
    setTrail(key ? key.split('\u0000') : []);
    return () => setTrail([]);
  }, [key, setTrail]);
}
