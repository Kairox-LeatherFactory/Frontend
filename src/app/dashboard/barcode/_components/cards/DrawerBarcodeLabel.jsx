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
    // --- 98mm x 65.5mm Sheet Label Container (8 per A4 sheet) ---
    <div
      ref={cardRef}
      className="bucket-label flex flex-col items-center justify-between p-3.5 bg-white text-center"
      style={{ boxSizing: 'border-box' }}
    >
      <div className="w-full flex items-center justify-between border-b pb-1 mb-1" style={{ borderColor: 'rgba(200,131,74,0.3)' }}>
        <span className="text-[11px] font-black uppercase tracking-wider text-[#5a3518] truncate">
          {barcode.style || barcode.client || 'CUTTING SHEET'}
        </span>
        <span className="text-[10px] font-bold text-[#c8834a]">
          {barcode.orderId ? `PO: ${barcode.orderId}` : 'SHEET'}
        </span>
      </div>

      <div className="my-auto flex justify-center w-full">
        <BarcodeCanvas
          code={barcode.pieceCode}
          height={65}
          moduleWidth={2.3}
          margin={2}
          showText={true}
        />
      </div>

      <div className="w-full flex items-center justify-between text-[9px] text-gray-500 font-medium pt-1 border-t mt-1" style={{ borderColor: 'rgba(200,131,74,0.2)' }}>
        <span>{barcode.color ? `Lot: ${barcode.color}` : `Seq #${barcode.serial || 1}`}</span>
        <span>{barcode.createdDate?.split(',')[0] || ''}</span>
      </div>
    </div>
  );
}
