'use client';
import { getCompactBarcodeId } from '../../_lib/helpers';
import BarcodeCanvas from '../BarcodeCanvas';

/**
 * ============================================================================
 * BarcodeStickerLabel Component
 * ============================================================================
 * WHAT IT IS:
 * Thermal piece/material sticker label layout.
 *
 * WHY IT EXISTS:
 * Used for printing adhesive barcodes to stick onto garments, leather bundles,
 * cartons, or polybags during production.
 *
 * CONTENTS:
 * - Scannable Code-128 canvas barcode.
 * - Human readable text printed underneath.
 */
export default function BarcodeStickerLabel({ barcode, cardRef, width }) {
  // Extract clean piece code string
  const compactId = getCompactBarcodeId(barcode.pieceCode);

  return (
    // --- Sticker Container Card ---
    <div
      ref={cardRef}
      className="barcode-sticker-label"
      style={{
        width: width || 380,
        maxWidth: '100%',
        background: '#ffffff',
        border: '1.5px solid #cbd5e1',
        borderRadius: 8,
        padding: '16px 20px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
    >
      {/* Centered Barcode Canvas */}
      <div className="w-full flex justify-center items-center overflow-hidden">
        <BarcodeCanvas
          code={compactId}
          displayWidth={width ? Math.min(width - 40, 320) : 320}
          height={65}
          moduleWidth={2.0}
          showText={true}
          margin={8}
        />
      </div>
    </div>
  );
}
