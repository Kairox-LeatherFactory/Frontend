'use client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { BRAND } from '../_lib/constants';

/**
 * ============================================================================
 * BarcodePagination Component
 * ============================================================================
 * WHAT IT IS:
 * Reusable pagination bar with Previous/Next buttons and page numbers.
 *
 * WHY IT EXISTS:
 * Keeps tables and grid views manageable when hundreds of barcodes are loaded.
 *
 * HOW IT WORKS:
 * - Automatically hides itself if there is only 1 page or no data.
 * - Disables Prev on page 1, and Next on the last page.
 */
export default function BarcodePagination({ page, pages, setPage }) {
  // If there's 1 page or fewer, do not show pagination controls
  if (!pages || pages <= 1) return null;

  return (
    // --- Pagination Toolbar Container ---
    <div className="flex items-center justify-center gap-3 mt-5">
      {/* Previous Page Button */}
      <button
        onClick={() => setPage((p) => Math.max(1, p - 1))}
        disabled={page <= 1}
        className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-40"
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Prev
      </button>

      {/* Page Counter Display (e.g. Page 2 of 10) */}
      <span className="text-xs font-bold" style={{ color: BRAND.textMuted }}>
        Page {page} of {pages}
      </span>

      {/* Next Page Button */}
      <button
        onClick={() => setPage((p) => Math.min(pages, p + 1))}
        disabled={page >= pages}
        className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-40"
      >
        Next <ChevronRight className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
