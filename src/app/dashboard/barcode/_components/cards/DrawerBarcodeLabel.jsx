'use client';
import BarcodeCanvas from '../BarcodeCanvas';

/**
 * ============================================================================
 * DrawerBarcodeLabel Component
 * ============================================================================
 * WHAT IT IS:
 * Standardized physical bin/drawer label formatted to exact 98mm × 65.5mm dimensions.
 *
 * WHY IT EXISTS:
 * Designed to pack exactly 8 labels per single A4 or US Letter sheet (2 columns × 4 rows)
 * for pasting directly onto physical factory parts storage buckets and drawers.
 */
export default function DrawerBarcodeLabel({ barcode, cardRef }) {
  return (
    // --- 98mm x 65.5mm Bucket Label Container ---
    <div ref={cardRef} className="bucket-label">
      {/* High-density scannable barcode for bin tracking */}
      <BarcodeCanvas
        code={barcode.pieceCode}
        height={80}
        moduleWidth={2.4}
        margin={4}
      />
    </div>
  );
}
