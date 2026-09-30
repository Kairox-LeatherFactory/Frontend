'use client';
import { buildCardFields, getCompactBarcodeId } from '../../_lib/helpers';
import { BRAND } from '../../_lib/constants';
import BarcodeCanvas from '../BarcodeCanvas';

/**
 * ============================================================================
 * IdCard Component
 * ============================================================================
 * WHAT IT IS:
 * Full printable specification card displaying:
 * - Scannable Code-128 canvas barcode
 * - Color-coded badge pills (Order #, Client, Style, Article, Color, Size, Serial)
 * - Multi-column key-value metadata field grid
 *
 * PROPS:
 * - barcode: Barcode record object with piece data.
 * - labels: Category-specific label mappings (e.g. orderIdLabel, styleLabel).
 * - showOnlyFields: If true, only renders the metadata fields grid (omitting barcode).
 */
export default function IdCard({
  barcode,
  labels,
  cardRef,
  width,
  showOnlyFields = false,
}) {
  // Extract key-value field entries and clean barcode code
  const fields = buildCardFields(barcode, labels);
  const compactId = getCompactBarcodeId(barcode.pieceCode);

  // --------------------------------------------------------------------------
  // 1. FIELDS-ONLY MODE (USED IN DETAIL MODAL SIDE PANEL)
  // --------------------------------------------------------------------------
  if (showOnlyFields) {
    return (
      <div className="w-full">
        <div
          className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 text-left text-xs p-3 rounded-lg"
          style={{ background: BRAND.bg }}
        >
          {fields.map(([label, value], idx) => (
            <div key={`${label}-${idx}`} className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[0.62rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted }}>
                {label}
              </span>
              <span className="font-semibold break-words" style={{ color: BRAND.text }}>
                {value || '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // 2. FULL CARD MODE (BARCODE + PILLS + FIELD GRID)
  // --------------------------------------------------------------------------
  return (
    <div
      ref={cardRef}
      className="p-5 text-center"
      style={{ background: '#ffffff', ...(width ? { width } : null) }}
    >
      {/* Barcode Canvas Box */}
      <div
        className="p-3 rounded-lg mb-3 flex justify-center overflow-hidden"
        style={{ background: '#ffffff', border: `1px solid ${BRAND.border}` }}
      >
        <BarcodeCanvas code={compactId} displayWidth={260} />
      </div>

      {/* Barcode Code Title */}
      <div className="font-mono font-black text-sm mb-1" style={{ color: '#5a3518' }}>
        {compactId}
      </div>

      {/* Color-Coded Detail Attribute Pills */}
      <div className="flex flex-wrap justify-center gap-1.5 mb-3">
        {barcode.orderId && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>#{barcode.orderId}</span>}
        {barcode.client && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>{barcode.client}</span>}
        {barcode.style && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{barcode.style}</span>}
        {barcode.article && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>{barcode.article}</span>}
        {barcode.color && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' }}>{barcode.color}</span>}
        {barcode.size && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>Sz: {barcode.size}</span>}
        {barcode.serialStr && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>#{barcode.serialStr}</span>}
      </div>

      {/* Full Alphanumeric Code */}
      <div className="text-[8px] text-slate-400 font-mono truncate mb-3">
        {barcode.pieceCode}
      </div>

      {/* Metadata Attributes Grid */}
      <div
        className="grid grid-cols-2 gap-x-6 gap-y-2 text-left text-sm p-3 rounded-lg"
        style={{ background: BRAND.bg }}
      >
        {fields.map(([label, value], idx) => (
          <div key={`${label}-${idx}`} className="flex flex-col gap-0.5">
            <span className="text-[0.68rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted }}>
              {label}
            </span>
            <span className="font-semibold" style={{ color: BRAND.text }}>
              {value || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
