import { CSS_DPI, BARCODE_SPEC } from './constants';

/**
 * ============================================================================
 * BARCODE IMAGE & PDF EXPORT UTILITIES
 * ============================================================================
 * Contains rendering and file-saving engines:
 * 1. PNG DPI Stamping: Injects physical `pHYs` density chunks into raw PNG byte streams.
 * 2. DOM-to-Canvas Capture: Safely renders HTML elements into canvas using `html2canvas`
 *    with automatic modern CSS color space sanitization (lab, oklch, oklab).
 * 3. File System Saving: Uses native File System Access API or browser downloads.
 * 4. PDF Generation: Uses `jsPDF` for true physical inch-scale documents.
 */

// ============================================================================
// 1. PNG DENSITY & CRC32 METADATA INJECTION
// ============================================================================
// Standard canvases hand back 96 DPI PNGs. Stamping a physical pHYs chunk ensures
// external label printers (Zebra, Brady, Brother) print at actual physical dimensions.
const PNG_CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function pngCrc32(bytes) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < bytes.length; i++) {
    crc = PNG_CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

/**
 * Embeds physical pixel density (`pHYs` chunk) into an existing PNG binary buffer.
 *
 * @param {ArrayBuffer} buffer - Raw PNG ArrayBuffer.
 * @param {number} [dpi=BARCODE_SPEC.dpi] - Target DPI (e.g. 400 DPI).
 * @returns {Uint8Array} Modified PNG byte array with embedded DPI metadata.
 */
export function stampPngDpi(buffer, dpi = BARCODE_SPEC.dpi) {
  const src = new Uint8Array(buffer);
  const perMetre = Math.round(dpi / 0.0254); // Convert DPI to pixels per meter

  const chunk = new Uint8Array(21);
  const cv = new DataView(chunk.buffer);
  cv.setUint32(0, 9); // Data length
  chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
  cv.setUint32(8, perMetre); // X axis density
  cv.setUint32(12, perMetre); // Y axis density
  chunk[16] = 1; // Unit specifier: meter
  cv.setUint32(17, pngCrc32(chunk.subarray(4, 17)));

  // Replace existing pHYs chunk or insert before IDAT
  const dv = new DataView(src.buffer, src.byteOffset, src.byteLength);
  let pos = 8;
  while (pos + 12 <= src.length) {
    const len = dv.getUint32(pos);
    const type = String.fromCharCode(src[pos + 4], src[pos + 5], src[pos + 6], src[pos + 7]);
    if (type === 'pHYs') {
      const out = src.slice();
      out.set(chunk, pos);
      return out;
    }
    if (type === 'IDAT' || type === 'IEND') break;
    pos += 12 + len;
  }
  if (pos + 12 > src.length) pos = 33;

  const out = new Uint8Array(src.length + chunk.length);
  out.set(src.subarray(0, pos), 0);
  out.set(chunk, pos);
  out.set(src.subarray(pos), pos + chunk.length);
  return out;
}

// ============================================================================
// 2. DOM-TO-CANVAS CAPTURE ENGINE
// ============================================================================
/**
 * Captures an on-screen or off-screen DOM element and renders it into a high-DPI HTML5 canvas.
 * Automatically converts modern Tailwind CSS color spaces (oklch, lab) to safe sRGB hex codes
 * to prevent `html2canvas` crashes.
 *
 * @param {HTMLElement} node - DOM element to capture.
 * @param {Object} [options]
 * @param {number} [options.dpi=BARCODE_SPEC.dpi] - Resolution in DPI (defaults to 400).
 * @returns {Promise<HTMLCanvasElement>}
 */
export async function captureNodeToCanvas(node, { dpi = BARCODE_SPEC.dpi } = {}) {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(node, {
    backgroundColor: '#ffffff',
    scale: dpi / CSS_DPI,
    useCORS: true,
    logging: false,
    onclone: (clonedDoc, clonedNode) => {
      // 1. Sanitize stylesheets in cloned doc that use oklch/lab colors
      try {
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach((styleTag) => {
          if (
            styleTag.textContent &&
            (styleTag.textContent.includes('lab(') ||
              styleTag.textContent.includes('oklch(') ||
              styleTag.textContent.includes('oklab('))
          ) {
            styleTag.textContent = styleTag.textContent.replace(/(?:oklch|oklab|lab)\([^)]+\)/gi, '#4a5568');
          }
        });
      } catch (e) {}

      // 2. Sanitize computed color properties on the cloned DOM elements
      try {
        const helper = clonedDoc.createElement('canvas');
        const ctx = helper.getContext('2d');
        const sanitizeColor = (val) => {
          if (!val || typeof val !== 'string') return val;
          if (!val.includes('lab') && !val.includes('oklch') && !val.includes('color(') && !val.includes('oklab')) return val;
          if (ctx) {
            try {
              ctx.fillStyle = '#000000';
              ctx.fillStyle = val;
              return ctx.fillStyle;
            } catch {
              return '#4a5568';
            }
          }
          return '#4a5568';
        };

        const allEls = [clonedNode, ...clonedNode.querySelectorAll('*')];
        const colorProps = ['color', 'backgroundColor', 'borderColor', 'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'outlineColor', 'fill', 'stroke'];
        allEls.forEach((el) => {
          try {
            const comp = window.getComputedStyle(el);
            colorProps.forEach((prop) => {
              const val = comp[prop];
              if (val && (val.includes('lab') || val.includes('oklch') || val.includes('color(') || val.includes('oklab'))) {
                el.style[prop] = sanitizeColor(val);
              }
            });
            if (el.getAttribute('style')) {
              const s = el.getAttribute('style');
              if (s.includes('lab') || s.includes('oklch') || s.includes('oklab')) {
                el.setAttribute('style', s.replace(/(?:oklch|oklab|lab)\([^)]+\)/gi, '#4a5568'));
              }
            }
          } catch (e) {}
        });
      } catch (e) {}
    },
  });
  if (canvas?.dataset) canvas.dataset.dpi = String(dpi);
  return canvas;
}

// ============================================================================
// 3. FILE SYSTEM SAVING UTILITY
// ============================================================================
/**
 * Prompts user to save a Blob or triggers an invisible download link.
 *
 * @param {Blob} blob - Binary file data.
 * @param {string} suggestedName - Default filename.
 * @param {Object} [options]
 */
export async function saveBlob(blob, suggestedName, { description, accept } = {}) {
  // Use File System Access API if supported in browser
  if (typeof window !== 'undefined' && window.showSaveFilePicker) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: accept ? [{ description: description || 'File', accept }] : undefined,
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (err) {
      if (err && err.name === 'AbortError') return; // User cancelled save dialog
    }
  }

  // Fallback: Invisible anchor link download
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = suggestedName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function canvasDpi(canvas, override) {
  return override || Number(canvas?.dataset?.dpi) || BARCODE_SPEC.dpi;
}

async function canvasToBlob(canvas, dpi) {
  const raw = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!raw) return null;
  try {
    const stamped = stampPngDpi(await raw.arrayBuffer(), canvasDpi(canvas, dpi));
    return new Blob([stamped], { type: 'image/png' });
  } catch {
    return raw;
  }
}

// ============================================================================
// 4. EXPORT HIGH-DENSITY PNG IMAGE
// ============================================================================
/**
 * Saves HTML5 canvas as a high-density 400 DPI PNG file.
 */
export async function saveCanvasAsPng(canvas, filename, dpi) {
  const blob = await canvasToBlob(canvas, dpi);
  await saveBlob(blob, `${filename}.png`, { description: 'PNG Image', accept: { 'image/png': ['.png'] } });
}

// ============================================================================
// 5. EXPORT INCH-SCALED PDF DOCUMENT
// ============================================================================
/**
 * Converts HTML5 canvas into an exact physical-inch-sized PDF document.
 */
export async function saveCanvasAsPdf(canvas, filename, dpi) {
  const density = canvasDpi(canvas, dpi);
  const wIn = canvas.width / density;
  const hIn = canvas.height / density;
  const orientation = wIn >= hIn ? 'landscape' : 'portrait';
  const { default: jsPDF } = await import('jspdf');
  const pdf = new jsPDF({ orientation, unit: 'in', format: [wIn, hIn] });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, wIn, hIn);
  await saveBlob(pdf.output('blob'), `${filename}.pdf`, { description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } });
}

/**
 * Downloads a generated jsPDF instance as a PDF file.
 */
export async function savePdfBlob(pdf, filename) {
  await saveBlob(pdf.output('blob'), `${filename}.pdf`, { description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } });
}
