'use client';
import { useRef, useEffect } from 'react';

/**
 * ============================================================================
 * BarcodeCanvas Component
 * ============================================================================
 * WHAT IT IS:
 * Low-level HTML5 `<canvas>` renderer that draws scannable 1D Code-128 barcodes.
 *
 * WHY IT EXISTS:
 * Replaces unreliable SVG/DOM barcodes with sharp, hardware-scanner-compliant
 * vector canvas drawings using the industry-standard `jsbarcode` engine.
 *
 * PROPS:
 * - code: String data to encode in the barcode bars.
 * - height: Height of the black/white bars in pixels (default 45).
 * - moduleWidth: Thickness of individual barcode lines (default 1.2).
 * - showText: Whether to print alphanumeric text underneath (default true).
 * - displayWidth: Optional fixed width in pixels.
 * - margin: Quiet zone whitespace padding in pixels around the barcode (default 0).
 */
export default function BarcodeCanvas({
  code,
  height = 45,
  moduleWidth = 1.2,
  showText = true,
  displayWidth,
  margin = 0,
}) {
  // --------------------------------------------------------------------------
  // 1. CANVAS REFERENCE
  // --------------------------------------------------------------------------
  const ref = useRef(null);

  // --------------------------------------------------------------------------
  // 2. DYNAMIC JSBARCODE RENDERING EFFECT
  // --------------------------------------------------------------------------
  // Dynamically imports `jsbarcode` on client side to keep bundle lightweight
  // and re-draws the canvas whenever the barcode string or dimensions change.
  useEffect(() => {
    if (ref.current && code) {
      import('jsbarcode').then(({ default: JsBarcode }) => {
        try {
          JsBarcode(ref.current, code, {
            format: 'CODE128',
            width: moduleWidth,
            height: height,
            displayValue: showText,
            margin,
          });
        } catch (err) {
          console.error('Failed to render barcode canvas:', err);
        }
      });
    }
  }, [code, height, moduleWidth, showText, margin]);

  // --------------------------------------------------------------------------
  // 3. CANVAS ELEMENT
  // --------------------------------------------------------------------------
  return (
    <canvas
      ref={ref}
      style={{
        maxWidth: '100%',
        height: 'auto',
        display: 'block',
        width: displayWidth ? `${displayWidth}px` : undefined,
      }}
    />
  );
}
