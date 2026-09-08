'use client';
import { useState } from 'react';
import { ScanLine } from 'lucide-react';
import { apiResolveBarcode } from '@/lib/api';
import { BRAND } from '../_lib/constants';
import LiveBarcodeDetailModal from './modals/LiveBarcodeDetailModal';

/**
 * ============================================================================
 * ResolveBarcodeWidget Component
 * ============================================================================
 * WHAT IT IS:
 * Universal search & scan widget to lookup ANY physical barcode string
 * (Style Piece, Employee Badge, Drawer Bin, Material Lot).
 *
 * WHY IT EXISTS:
 * Factory operators can point a USB/Bluetooth barcode gun or type a code
 * into this box, and immediately view all live database info for that item.
 *
 * HOW IT WORKS:
 * 1. Takes user input or hardware scanner string.
 * 2. Calls `GET /api/v1/barcode/resolve` on submit.
 * 3. Opens `LiveBarcodeDetailModal` to show the decoded record.
 */
export default function ResolveBarcodeWidget({ token, showToast }) {
  // --------------------------------------------------------------------------
  // 1. STATE DEFINITIONS
  // --------------------------------------------------------------------------
  const [code, setCode] = useState('');          // Input text value
  const [open, setOpen] = useState(false);        // Modal visibility
  const [loading, setLoading] = useState(false);  // Network lookup in progress
  const [error, setError] = useState(null);       // Error message if not found
  const [data, setData] = useState(null);         // Resolved backend payload

  // --------------------------------------------------------------------------
  // 2. FORM SUBMIT / LOOKUP HANDLER
  // --------------------------------------------------------------------------
  const handleResolve = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    // Reset modal state and start loading
    setOpen(true);
    setLoading(true);
    setError(null);
    setData(null);

    try {
      // Call backend barcode resolution endpoint
      const result = await apiResolveBarcode(token, trimmed);
      setData(result);
    } catch (err) {
      setError(err.message || 'Failed to resolve barcode.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // 3. RENDER WIDGET & DETAIL MODAL
  // --------------------------------------------------------------------------
  return (
    <>
      {/* Scanner / Search Input Form */}
      <form
        onSubmit={handleResolve}
        className="flex items-center gap-2 rounded-2xl p-1.5 pl-4 w-fit"
        style={{ background: '#fff', border: `1px solid ${BRAND.border}` }}
      >
        <ScanLine className="w-4 h-4 flex-shrink-0" style={{ color: BRAND.textMuted }} />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Scan or type a barcode to look up…"
          className="text-sm font-medium outline-none bg-transparent w-52"
          style={{ color: BRAND.text }}
        />
        <button
          type="submit"
          className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs flex-shrink-0"
        >
          Resolve
        </button>
      </form>

      {/* Pop-up modal displaying the resolved barcode data */}
      <LiveBarcodeDetailModal
        open={open}
        loading={loading}
        error={error}
        data={data}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
