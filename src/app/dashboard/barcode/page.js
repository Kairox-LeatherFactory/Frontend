'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
 Barcode, Printer, History, Search, X, Download, Zap, Send, Eye,
 RotateCcw, FileDown, ChevronRight, ChevronLeft, ChevronDown, Users, Box, FileImage, FileText,
 Loader2, ScanLine, PackageSearch, Package, Plus, Truck, CheckCircle2, AlertTriangle, Layers,
} from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import { useAuth } from '@/context/AuthContext';
import {
 apiGetEmployees, apiResolveBarcode, apiGetBarcodeDetail, apiPrintBarcodes,
 apiGetBarcodeOrders, apiGetOrderBarcodeSkus, apiGetOrderBarcodeAnalytics, apiGetOrderBarcodes,
 apiListDrawers,
 apiGetMaterialSpec, apiCreateMaterialLot, apiGetMaterialLots, apiGetMaterialsStock,
 apiReceiveMaterials, apiCreateSupplierOrder, apiPatchSupplierOrder, apiGetBarcodeMaterials,
} from '@/lib/api';
import { staggerContainer, fadeUpItem, tabFade } from '@/lib/motionVariants';

// The employee roster comes from GET /api/v1/employees (apiGetEmployees).
// That row is { id, name, designation, wage_type, is_active, employee_barcode }
// — this screen groups by department, so designation doubles as the department
// bucket until the roster carries one of its own.
function normalizeEmployee(row) {
 const empId = row.employee_barcode || `EMP-${String(row.id).slice(0, 8).toUpperCase()}`;
 return {
 id: row.id,
 empId,
 name: row.name || 'Unnamed',
 designation: row.designation || 'Unassigned',
 department: row.department || row.designation || 'Unassigned',
 };
}

// ─── CODE 128 RENDERING ──────────────────────────────────────────────────────
// Symbols are produced by the `jsbarcode` library rather than a local encoder.
// A hand-typed pattern table used to live here, and one of its 107 entries was
// wrong (value 48 / 'P' carried the bars for value 23 / '7'), which silently
// broke the check digit on every "EMP-" badge. Same library, same options as
// the Admin employee badge — see EmployeeIdCardModal in dashboard/admin/page.js.

// Bug #19 correction: this used to hash the piece code into a fake "BC-XXXXX"
// ID client-side. The backend has never heard of that code — scanning it
// returns 404 from /barcode/resolve, which is exactly why mobile scans were
// failing. The backend already returns the correct code to encode (its own
// short_code / PC-XXXXXX when backfilled, otherwise the full piece code) as
// `code` in the POST /barcode/print response — there is nothing to invent
// here, just encode whatever the backend gave us.
function getCompactBarcodeId(pieceCode) {
 return pieceCode;
}

// ─── ID CARD EXPORT (full card, not just the barcode) ────────────────────────
// The same field set the "View" modal shows — shared so the on-screen card,
// the single-card export, and the bulk export all render identically.
function buildCardFields(barcode, labels) {
  if (!barcode) return [];
  const entries = [
    [labels.orderIdLabel || 'Order ID', barcode.orderId],
    [labels.clientLabel || 'Client', barcode.client],
    [labels.styleLabel || 'Style', barcode.style],
  ];
  if (labels.styleLabel !== 'Article' && barcode.article) {
    entries.push(['Article', barcode.article]);
  }
  entries.push(
    [labels.colorLabel || 'Color', barcode.color],
    [labels.sizeLabel || 'Size', barcode.size],
    ['Serial', barcode.serialStr],
    ['Batch', barcode.batchNo],
    ['Status', barcode.printStatus]
  );
  return entries;
}

function chunkArray(arr, size) {
 const out = [];
 for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
 return out;
}

// ─── EXPORT DPI SPEC ──────────────────────────────────────────────────────────
const CSS_DPI = 96; // what a browser assumes 1 CSS px is worth
const BARCODE_SPEC = { dpi: 400 }; // target print density for exported cards

// ─── PNG DENSITY METADATA ────────────────────────────────────────────────────
// A canvas has no notion of DPI, so the PNG it hands back is implicitly 96 DPI.
// Word, Illustrator and most label software would then place a 560 px barcode
// at ~5.8 inches wide. Writing a pHYs chunk stamps the real density on the file
// so it lands at its intended physical size.
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
 for (let i = 0; i < bytes.length; i++) crc = PNG_CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
 return (crc ^ 0xFFFFFFFF) >>> 0;
}

function stampPngDpi(buffer, dpi = BARCODE_SPEC.dpi) {
 const src = new Uint8Array(buffer);
 const perMetre = Math.round(dpi / 0.0254); // 400 DPI → 15748 px/m

 const chunk = new Uint8Array(21);
 const cv = new DataView(chunk.buffer);
 cv.setUint32(0, 9); // data length
 chunk.set([0x70, 0x48, 0x59, 0x73], 4); // "pHYs"
 cv.setUint32(8, perMetre); // x axis
 cv.setUint32(12, perMetre); // y axis
 chunk[16] = 1; // unit specifier: metre
 cv.setUint32(17, pngCrc32(chunk.subarray(4, 17)));

 // Walk the chunk list so an existing pHYs is replaced, not duplicated.
 const dv = new DataView(src.buffer, src.byteOffset, src.byteLength);
 let pos = 8; // past the PNG signature
 while (pos + 12 <= src.length) {
 const len = dv.getUint32(pos);
 const type = String.fromCharCode(src[pos + 4], src[pos + 5], src[pos + 6], src[pos + 7]);
 if (type === 'pHYs') {
 const out = src.slice();
 out.set(chunk, pos);
 return out;
 }
 if (type === 'IDAT' || type === 'IEND') break; // pHYs has to precede IDAT
 pos += 12 + len;
 }
 if (pos + 12 > src.length) pos = 33; // signature + IHDR, if the walk ran off

 const out = new Uint8Array(src.length + chunk.length);
 out.set(src.subarray(0, pos), 0);
 out.set(chunk, pos);
 out.set(src.subarray(pos), pos + chunk.length);
 return out;
}

// scale 2 gave ~192 DPI, which is soft once printed. Capturing at dpi/96
// (4.167x for 400 DPI) means the exported card is genuinely 400 DPI.
async function captureNodeToCanvas(node, { dpi = BARCODE_SPEC.dpi } = {}) {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(node, {
    backgroundColor: '#ffffff',
    scale: dpi / CSS_DPI,
    useCORS: true,
    logging: false,
    onclone: (clonedDoc, clonedNode) => {
      // 1. Sanitize all stylesheet rules in the cloned document that use modern color spaces (lab, oklch, oklab)
      try {
        const styles = clonedDoc.querySelectorAll('style');
        styles.forEach((styleTag) => {
          if (styleTag.textContent && (styleTag.textContent.includes('lab(') || styleTag.textContent.includes('oklch(') || styleTag.textContent.includes('oklab('))) {
            styleTag.textContent = styleTag.textContent.replace(/(?:oklch|oklab|lab)\([^)]+\)/gi, '#4a5568');
          }
        });
      } catch (e) {}

      // 2. Sanitize computed color properties on the cloned DOM tree
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

// Lets the user pick a destination folder + filename before saving (Chromium's
// File System Access API). Falls back to the classic silent-download link for
// browsers that don't support it (Firefox, Safari) or if the user's activation
// window has already lapsed by the time we're ready to write.
async function saveBlob(blob, suggestedName, { description, accept } = {}) {
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
 if (err && err.name === 'AbortError') return; // user cancelled the picker — respect it
 // any other failure (unsupported context, activation expired, etc.) falls through below
 }
 }
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
 return raw; // density metadata is a nicety — never lose the image over it
 }
}

async function saveCanvasAsPng(canvas, filename, dpi) {
 const blob = await canvasToBlob(canvas, dpi);
 await saveBlob(blob, `${filename}.png`, { description: 'PNG Image', accept: { 'image/png': ['.png'] } });
}

async function saveCanvasAsPdf(canvas, filename, dpi) {
 // Size the page in inches from the pixel count and the density, so the PDF
 // prints at physical size instead of being treated as 72 px-per-inch art.
 const density = canvasDpi(canvas, dpi);
 const wIn = canvas.width / density;
 const hIn = canvas.height / density;
 const orientation = wIn >= hIn ? 'landscape' : 'portrait';
 const { default: jsPDF } = await import('jspdf');
 const pdf = new jsPDF({ orientation, unit: 'in', format: [wIn, hIn] });
 pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, wIn, hIn);
 await saveBlob(pdf.output('blob'), `${filename}.pdf`, { description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } });
}

async function savePdfBlob(pdf, filename) {
 await saveBlob(pdf.output('blob'), `${filename}.pdf`, { description: 'PDF Document', accept: { 'application/pdf': ['.pdf'] } });
}

// ─── BARCODE STICKER LABEL (Base barcode with ID below it) ───────────────────
function BarcodeStickerLabel({ barcode, cardRef, width }) {
  const compactId = getCompactBarcodeId(barcode.pieceCode);

  return (
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

// Renders one printable ID card — barcode + code + the same fields grid as the
// "View" modal.
function IdCard({ barcode, labels, cardRef, width, showOnlyFields = false }) {
  const fields = buildCardFields(barcode, labels);
  const compactId = getCompactBarcodeId(barcode.pieceCode);

  if (showOnlyFields) {
    return (
      <div className="w-full">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 text-left text-xs p-3 rounded-lg" style={{ background: BRAND.bg }}>
          {fields.map(([label, value], idx) => (
            <div key={`${label}-${idx}`} className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[0.62rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted }}>{label}</span>
              <span className="font-semibold break-words" style={{ color: BRAND.text }}>{value || '—'}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
  <div ref={cardRef} className="p-5 text-center" style={{ background: '#ffffff', ...(width ? { width } : null) }}>
    <div className="p-3 rounded-lg mb-3 flex justify-center overflow-hidden" style={{ background: '#ffffff', border: `1px solid ${BRAND.border}` }}>
      <BarcodeCanvas code={compactId} displayWidth={260} />
    </div>
    <div className="font-mono font-black text-sm mb-1" style={{ color: '#5a3518' }}>{compactId}</div>
    <div className="flex flex-wrap justify-center gap-1.5 mb-3">
      {barcode.orderId && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fff1f2', color: '#be123c', border: '1px solid #fecdd3' }}>#{barcode.orderId}</span>}
      {barcode.client && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a' }}>{barcode.client}</span>}
      {barcode.style && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>{barcode.style}</span>}
      {barcode.article && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa' }}>{barcode.article}</span>}
      {barcode.color && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0' }}>{barcode.color}</span>}
      {barcode.size && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#faf5ff', color: '#7e22ce', border: '1px solid #e9d5ff' }}>Sz: {barcode.size}</span>}
      {barcode.serialStr && <span className="text-[9px] font-black px-2 py-0.5 rounded-full" style={{ backgroundColor: '#ecfdf5', color: '#047857', border: '1px solid #a7f3d0' }}>#{barcode.serialStr}</span>}
    </div>
    <div className="text-[8px] text-slate-400 font-mono truncate mb-3">{barcode.pieceCode}</div>
  <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-left text-sm p-3 rounded-lg" style={{ background: BRAND.bg }}>
  {fields.map(([label, value], idx) => (
  <div key={`${label}-${idx}`} className="flex flex-col gap-0.5">
  <span className="text-[0.68rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted }}>{label}</span>
  <span className="font-semibold" style={{ color: BRAND.text }}>{value || '—'}</span>
  </div>
  ))}
  </div>
  </div>
  );
}

// ─── EMPLOYEE ID TICKET (black & white, receipt-style) ───────────────────────
const TICKET = { black: '#000000', gray: '#6b6b6b', line: '#d8d8d8', bg: '#ffffff' };

// Company logo — public/images/company-logo.svg. Vector, so it stays sharp
// at any size (no more raster blur from a PNG being scaled up/down).
// The asset isn't in the repo yet; falls back to an initials badge instead
// of a broken-image icon (and a console error on every render) until it is.
function CompanyMark({ size = 56 }) {
 const [failed, setFailed] = useState(false);
 if (failed) {
 return (
 <div
 style={{
 width: size, height: size, flexShrink: 0, borderRadius: '50%',
 display: 'flex', alignItems: 'center', justifyContent: 'center',
 background: 'rgba(255,255,255,0.12)', color: '#fff',
 fontSize: size * 0.36, fontWeight: 800, letterSpacing: '0.02em',
 }}
 >
 PT
 </div>
 );
 }
 return (
 <div style={{ width: size, height: size, flexShrink: 0 }}>
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src="/images/company-logo.svg"
 alt="Company logo"
 onError={() => setFailed(true)}
 style={{ width: '100%', height: '100%', objectFit: 'contain' }}
 />
 </div>
 );
}

// Ticket-stub perforation: dashed rule with a notch cut out of each side.
// The card always sits directly on a white surface (modal panel, export page,
// print paper), so the notches are plain white to read as cutouts.
function TicketPerforation() {
 return (
 <div style={{ position: 'relative', margin: '6px -24px 22px' }}>
 <div style={{ borderTop: `2px dashed ${TICKET.line}` }} />
 <div style={{ position: 'absolute', left: -12, top: -12, width: 24, height: 24, borderRadius: '50%', background: '#fff' }} />
 <div style={{ position: 'absolute', right: -12, top: -12, width: 24, height: 24, borderRadius: '50%', background: '#fff' }} />
 </div>
 );
}

function TicketRow({ label, value }) {
 return (
 <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${TICKET.line}` }}>
 <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: TICKET.gray }}>{label}</span>
 <span className="text-lg font-bold" style={{ color: TICKET.black }}>{value || '—'}</span>
 </div>
 );
}

// Employee badge, receipt/ticket styled: logo header, Name / Employee ID /
// Designation, perforated tear line, barcode. Used for the "employee" category
// in the View modal, bulk export, and the printed sheet.
function EmployeeTicketCard({ barcode, cardRef, width }) {
 // The wordmark's size/tracking is tuned for the 440px default (single-card
 // view, print sheet). Bulk export renders this same card at 340px — at that
 // width the untouched sizing overflows past the card edge and gets clipped
 // by overflow-hidden below. Scale it down instead for narrower cards.
 const compact = (width || 440) < 400;
 return (
 <div
 ref={cardRef}
 className="overflow-hidden"
 style={{ width: width || 440, maxWidth: '100%', background: '#ffffff', border: `1px solid ${TICKET.line}`, borderRadius: 0, boxShadow: '0 8px 24px rgba(0,0,0,0.08)' }}
 >
 <div className="px-6 py-4 flex items-center gap-3" style={{ background: TICKET.black }}>
 <CompanyMark size={compact ? 40 : 56} />
 <div className="flex-1 min-w-0">
 <span className={`font-serif font-normal uppercase whitespace-nowrap ${compact ? 'text-sm tracking-[0.04em]' : 'text-xl tracking-[0.15em]'}`} style={{ color: '#ffffff' }}>Pakkar Tanveer Exports</span>
 <div className="mt-1 text-right">
 <span className={`font-bold uppercase ${compact ? 'text-[9px] tracking-wide' : 'text-xs tracking-widest'}`} style={{ color: 'rgba(255,255,255,0.7)' }}>Employee ID</span>
 </div>
 </div>
 </div>
 <div className="px-7 pt-7">
 <TicketRow label="Name" value={barcode.style} />
 <TicketRow label="Employee ID" value={barcode.size} />
 <TicketRow label="Designation" value={barcode.color} />
 </div>
 <div className="px-7">
 <TicketPerforation />
 </div>
 <div className="px-7 pb-8 flex flex-col items-center">
 <BarcodeCanvas code={barcode.pieceCode} height={90} moduleWidth={3} />
 </div>
 </div>
 );
}

// ─── BUCKET / DRAWER LABEL — 98mm × 65.5mm, barcode and nothing else ──────────
// Sized so exactly 8 labels (2 across × 4 down = 262mm height) fit completely
// within 1 single A4 or Letter printed sheet with safe printer hardware margins.
const BUCKET_LABEL = { widthMm: 98, heightMm: 65.5 };
// 2 across × 4 down on A4 at a 5mm page margin — the full arithmetic max
// (280mm of a 287mm printable area) is safe again now that each label is
// absolutely positioned rather than flowed/wrapped by the browser; see the
// .print-label-page comment below for why flow-based layouts kept failing.
const BUCKET_LABELS_PER_PAGE = 8;
// Style print sheet carries barcode + code only (no field grid), so it packs
// 2 across × 4 down like the bucket sheet instead of the 2×2 card layout
// employee badges use.
const STYLE_LABELS_PER_PAGE = 8;

function DrawerBarcodeLabel({ barcode, cardRef }) {
 return (
 <div ref={cardRef} className="bucket-label">
  <BarcodeCanvas code={barcode.pieceCode} height={80} moduleWidth={2.4} margin={4} />
 </div>
 );
}

const BRAND = {
 darkGrad: 'linear-gradient(180deg, #3d2b1a 0%, #2a1d11 100%)',
 accent: '#c8834a',
 border: 'rgba(200,131,74,0.25)',
 text: '#2d1f0e',
 textMuted: '#9a7a5a',
 bg: '#faf6f0',
};

const TABS = [
 { id: 'generation', label: 'Batch Generation', icon: Barcode },
 { id: 'print', label: 'Print Center', icon: Printer },
 { id: 'history', label: 'Batch History', icon: History },
];

const CATEGORIES = [
 { id: 'style', label: 'Style Barcodes', icon: Barcode },
 { id: 'employee', label: 'Employee Barcodes', icon: Users },
 { id: 'bucket', label: 'Bucket Barcodes', icon: Box },
 { id: 'material', label: 'Material Barcodes', icon: Package },
];

const CATEGORY_SUBTITLES = {
 style: 'Generate, print, and audit piece-level Code128 barcodes across production orders.',
 employee: 'Generate, print, and audit employee ID badge barcodes across departments.',
 // The bucket a piece travels in *is* a drawer server-side, so this category is
 // the live drawer pool off GET /api/v1/drawers — not a locally invented range.
 bucket: 'Print the live drawer/bucket label sheet straight off GET /api/v1/drawers — the whole 200-drawer pool in one pass.',
 material: 'Create and print material lot barcodes (Leather, Lining, Accessories) with real-time stock & spec validation.',
};

const CATEGORY_LABELS = {
 style: {
 orderIdLabel: 'Order ID', clientLabel: 'Client', styleLabel: 'Style', colorLabel: 'Color', sizeLabel: 'Size',
 groupHint: 'Grouped by Production Order — click a card to drill into its styles',
 subGroupNounPlural: 'Styles',
 },
 employee: {
 orderIdLabel: 'Dept. Code', clientLabel: 'Department', styleLabel: 'Employee', colorLabel: 'Designation', sizeLabel: 'Employee ID',
 groupHint: 'Grouped by Department — click a card to view employee ID badges',
 subGroupNounPlural: 'Employees',
 },
 bucket: {
 orderIdLabel: 'Drawer State', clientLabel: 'Drawer Code', styleLabel: 'Drawer / Code', colorLabel: 'State', sizeLabel: 'Drawer ID / UUID',
 groupHint: 'Grouped by Drawer State — click a card to view drawer barcodes',
 subGroupNounPlural: 'Drawers',
 },
 material: {
 orderIdLabel: 'Lot Barcode', clientLabel: 'Category / Subtype', styleLabel: 'Article', colorLabel: 'Colour', sizeLabel: 'Quantity & UOM',
 groupHint: 'Grouped by Material Category — click a card to view material lot barcodes',
 subGroupNounPlural: 'Lots',
 },
};

const DEFAULT_HISTORY_FILTERS = { orderId: 'ALL', style: 'ALL', client: 'ALL', size: 'ALL', operator: 'ALL', status: 'ALL', sort: 'NEWEST' };
const EMPTY_LIST = [];

const selectCls = 'w-full px-3 py-2.5 rounded-lg text-sm font-semibold outline-none border transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]';
const inputCls = 'w-full px-3 py-2.5 rounded-lg text-sm font-medium outline-none border transition-all focus:ring-2 focus:ring-[#c8834a]/30 focus:border-[#c8834a]';
const fieldStyle = { background: '#faf6f0', borderColor: 'rgba(200,131,74,0.3)', color: '#2d1f0e' };

// Native <select> option popups size themselves to their widest option text,
// independent of the closed control's own (responsive) width, and can render
// past the viewport edge on a tablet — every filter dropdown across the 4
// Barcode Management tabs (Style/Employee/Bucket/Material) used a plain
// <select>. This is a fully custom dropdown instead: the open panel is
// pinned left:0/right:0 against its own button, so its width always matches
// the button's own (already on-screen) width, and every row truncates with
// real CSS ellipsis rather than relying on the browser's native popup.
// `portal`: set true when an ancestor card clips overflow (rounded corners
// etc.) — renders the panel on document.body at the button's live screen
// coordinates instead of in place, so it can't get clipped.
function ScreenSafeSelect({ value, options, onChange, placeholder, className = selectCls, style = fieldStyle, portal = false }) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState(null);
  const buttonRef = useRef(null);
  const panelRef = useRef(null);

  const updateRect = useCallback(() => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    setRect({ top: r.bottom + 4, left: r.left, width: r.width });
  }, []);

  useEffect(() => {
    if (!portal || !open) return;
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [portal, open, updateRect]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (buttonRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selected = options.find((o) => String(o.value) === String(value));
  const label = selected ? selected.label : (placeholder ?? '');

  const panel = (
    <div
      ref={panelRef}
      className={portal
        ? 'fixed z-[999999] max-h-64 overflow-y-auto rounded-lg border shadow-2xl py-1 bg-white'
        : 'absolute left-0 right-0 z-50 mt-1 max-h-64 overflow-y-auto rounded-lg border shadow-lg py-1 bg-white'}
      style={portal ? { top: rect?.top, left: rect?.left, width: rect?.width, borderColor: 'rgba(200,131,74,0.3)' } : { borderColor: 'rgba(200,131,74,0.3)' }}
    >
      {options.map((opt, idx) => (
        <button
          key={`${opt.value}-${idx}`}
          type="button"
          title={opt.title || opt.label}
          onClick={() => { onChange(opt.value); setOpen(false); }}
          className={`w-full text-left px-3 py-1.5 text-sm font-semibold truncate cursor-pointer hover:bg-[#faf6f0] ${String(value) === String(opt.value) ? 'text-[#c8834a] bg-[#fff3e8]' : 'text-[#2d1f0e]'}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`${className} flex items-center justify-between gap-2 text-left cursor-pointer`}
        style={style}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (portal ? (rect && createPortal(panel, document.body)) : panel)}
    </div>
  );
}

function statusBadgeClass(status) {
 if (status === 'PRINTED') return 'badge badge-success';
 if (status === 'PARTIAL') return 'badge badge-info';
 return 'badge badge-warning';
}

// ─── SHARED CANVAS RENDERER ───────────────────────────────────────────────────
function BarcodeCanvas({ code, height = 45, moduleWidth = 1.2, showText = true, displayWidth, margin = 0 }) {
 const ref = useRef(null);

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
 console.error(err);
 }
 });
 }
 }, [code, height, moduleWidth, showText]);
 return <canvas ref={ref} style={{ maxWidth: '100%', height: 'auto', display: 'block', width: displayWidth ? `${displayWidth}px` : undefined }} />;
}

// ─── TOASTS ────────────────────────────────────────────────────────────────────
function ToastStack({ toasts }) {
 const [mounted, setMounted] = useState(false);
 useEffect(() => {
 setMounted(true);
 }, []);

 const colors = { success: '#16a34a', error: '#dc2626', info: '#2563eb' };

 if (!mounted) return null;

 return createPortal(
 <div className="toast-stack fixed top-5 right-5 z-[999] flex flex-col gap-2 pointer-events-none w-[300px]">
 <AnimatePresence>
 {toasts.map((t) => (
 <motion.div
 key={t.id}
 initial={{ opacity: 0, x: 24, scale: 0.96 }} animate={{ opacity: 1, x: 0, scale: 1 }} exit={{ opacity: 0, x: 24, scale: 0.96 }}
 transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
 className="pointer-events-auto rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg"
 style={{ background: '#2a1d11', borderLeft: `4px solid ${colors[t.type] || colors.success}` }}
 >
 {t.message}
 </motion.div>
 ))}
 </AnimatePresence>
 </div>,
 document.body
 );
}

// ─── LIVE BARCODE REGISTRY (mounted at /api/v1/barcode) ─────────────────────
// Piece barcodes are pre-minted during Cutting — this backend surface has no
// "generate" endpoint, only resolve / print / browse-by-order / audit. Style
// category is powered entirely by these live calls; Employee/Bucket keep
// their own local flows below, untouched.

const BARCODE_TYPE_LABELS = { PIECE: 'Piece', EMPLOYEE: 'Employee', DRAWER: 'Drawer', MATERIAL_LOT: 'Material Lot' };

function humanizeKey(key) {
 return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatRegistryValue(value) {
 if (value === null || value === undefined || value === '') return '—';
 if (typeof value === 'boolean') return value ? 'Yes' : 'No';
 if (typeof value === 'object') return JSON.stringify(value);
 return String(value);
}

// Shared renderer for a GET /barcode/resolve or /barcode/detail payload.
// The sub-object (piece/employee/drawer/lot) is an intentionally loose
// passthrough dict server-side, so this dumps whatever keys are present
// instead of hard-coding fields that might not exist for every code type.
function LiveBarcodeDetailModal({ open, loading, error, data, onClose }) {
  const barcodeRef = useRef(null);
  const [exporting, setExporting] = useState(null);
  const payload = data ? (data.piece || data.employee || data.drawer || data.lot) : null;

  // Downloads only the barcode symbol itself — not the surrounding card/field
  // grid — since this lookup modal is used for style barcodes, which only
  // ever need the printable symbol.
  const handleDownload = async (format) => {
    if (!barcodeRef.current || exporting || !data) return;
    setExporting(format);
    try {
      const canvas = await captureNodeToCanvas(barcodeRef.current);
      if (format === 'png') await saveCanvasAsPng(canvas, data.code);
      else await saveCanvasAsPdf(canvas, data.code);
    } finally {
      setExporting(null);
    }
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
        <h3 className="font-bold flex items-center gap-2" style={{ color: '#5a3518' }}>
          <ScanLine className="w-4 h-4" style={{ color: BRAND.accent }} /> Barcode Registry Lookup
        </h3>
        <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" style={{ color: BRAND.accent }} />
          <p className="text-sm" style={{ color: BRAND.textMuted }}>Resolving…</p>
        </div>
      ) : error ? (
        <div className="py-16 text-center px-6">
          <p className="font-bold" style={{ color: '#b91c1c' }}>{error}</p>
        </div>
      ) : data ? (
        <>
          <div className="p-6 flex-1 min-h-0 overflow-y-auto" style={{ background: '#ffffff' }}>
            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-6 items-start">
              {/* Left column: Barcode visual badge & status */}
              <div className="flex flex-col items-center text-center p-4 rounded-xl border border-amber-100 bg-amber-50/30">
                <div ref={barcodeRef} className="p-3 rounded-lg mb-3 flex justify-center overflow-hidden bg-white w-full" style={{ border: `1px solid ${BRAND.border}` }}>
                  <BarcodeCanvas code={data.code} displayWidth={240} />
                </div>
                <div className="font-mono font-bold text-sm mb-1.5 break-all" style={{ color: '#5a3518' }}>{data.code}</div>
                <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                  <span className="text-[0.65rem] px-2.5 py-1 rounded-full font-black uppercase tracking-wide" style={{ background: BRAND.bg, color: BRAND.accent, border: `1px solid ${BRAND.border}` }}>
                    {BARCODE_TYPE_LABELS[data.type] || data.type}
                  </span>
                  <span className={statusBadgeClass(data.active ? 'PRINTED' : 'PENDING')}>{data.active ? 'Active' : 'Retired'}</span>
                </div>
                {data.caption && <div className="text-xs font-semibold text-slate-600 mt-1">{data.caption}</div>}
              </div>

              {/* Right column: Detailed specifications grid in multi-column layout */}
              <div className="w-full min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-[#9a7a5a] mb-2.5">
                  Piece &amp; Production Details
                </div>
                {payload && Object.keys(payload).length > 0 ? (
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-2.5 text-left text-xs p-4 rounded-xl" style={{ background: BRAND.bg }}>
                    {Object.entries(payload).map(([key, value]) => (
                      <div key={key} className="flex flex-col gap-0.5 min-w-0">
                        <span className="text-[0.62rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted }}>{humanizeKey(key)}</span>
                        <span className="font-semibold break-words text-slate-900" style={{ color: BRAND.text }}>{formatRegistryValue(value)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-6 text-center text-xs rounded-xl" style={{ background: BRAND.bg, color: BRAND.textMuted }}>
                    No additional detail on record for this code.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 flex-wrap shrink-0" style={{ background: BRAND.bg, borderTop: `1.5px solid ${BRAND.border}` }}>
            <button onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Close</button>
            <button onClick={() => handleDownload('png')} disabled={!!exporting} className="btn-warm-secondary !min-h-0 !py-2.5 disabled:opacity-60">
              <FileImage className="w-4 h-4" /> {exporting === 'png' ? 'Preparing…' : 'Download PNG'}
            </button>
            <button onClick={() => handleDownload('pdf')} disabled={!!exporting} className="btn-warm-secondary !min-h-0 !py-2.5 disabled:opacity-60">
              <FileText className="w-4 h-4" /> {exporting === 'pdf' ? 'Preparing…' : 'Download PDF'}
            </button>
          </div>
        </>
      ) : null}
    </AnimatedModal>
  );
}

// Page-level "scan or type a code" lookup — GET /barcode/resolve. Available
// regardless of which category tab is active, since a code can be any type.
function ResolveBarcodeWidget({ token, showToast }) {
 const [code, setCode] = useState('');
 const [open, setOpen] = useState(false);
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState(null);
 const [data, setData] = useState(null);

 const handleResolve = async (e) => {
 e.preventDefault();
 const trimmed = code.trim();
 if (!trimmed) return;
 setOpen(true);
 setLoading(true);
 setError(null);
 setData(null);
 try {
 const result = await apiResolveBarcode(token, trimmed);
 setData(result);
 } catch (err) {
 setError(err.message || 'Failed to resolve barcode.');
 } finally {
 setLoading(false);
 }
 };

 return (
 <>
 <form onSubmit={handleResolve} className="flex items-center gap-2 rounded-2xl p-1.5 pl-4 w-fit" style={{ background: '#fff', border: `1px solid ${BRAND.border}` }}>
 <ScanLine className="w-4 h-4 flex-shrink-0" style={{ color: BRAND.textMuted }} />
 <input
 value={code}
 onChange={(e) => setCode(e.target.value)}
 placeholder="Scan or type a barcode to look up…"
 className="text-sm font-medium outline-none bg-transparent w-52"
 style={{ color: BRAND.text }}
 />
 <button type="submit" className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs flex-shrink-0">Resolve</button>
 </form>
 <LiveBarcodeDetailModal open={open} loading={loading} error={error} data={data} onClose={() => setOpen(false)} />
 </>
 );
}

function BarcodePagination({ page, pages, setPage }) {
 if (!pages || pages <= 1) return null;
 return (
 <div className="flex items-center justify-center gap-3 mt-5">
 <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-40">
 <ChevronLeft className="w-3.5 h-3.5" /> Prev
 </button>
 <span className="text-xs font-bold" style={{ color: BRAND.textMuted }}>Page {page} of {pages}</span>
 <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page >= pages} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-40">
 Next <ChevronRight className="w-3.5 h-3.5" />
 </button>
 </div>
 );
}

// ─── STYLE: Batch Generation sub-view — card grid of the order's registered barcodes ──
function StyleGenerationGrid({
 rows, historyLoading, historyError, search, setSearch,
 selectedCodes, toggleCode, selectAllVisible, clearSelection, addCodes,
 page, setPage, pages, total, onOpenDetail, onPrintSingle, onPrintSelected, onPrintOrder, printing,
}) {
 const [rangeFrom, setRangeFrom] = useState('');
 const [rangeTo, setRangeTo] = useState('');
 const filteredRows = useMemo(() => {
 const q = search.trim().toLowerCase();
 if (!q) return rows;
 return rows.filter((r) => r.code.toLowerCase().includes(q));
 }, [rows, search]);

 // Range select picks by POSITION in this displayed grid (1st card, 2nd
 // card, ...), not by the `seq` field — seq restarts at 1 for every
 // style/size group, so a seq-based "1 to 8" match could span multiple
 // groups and select more cards than the range implies.
 const handleSelectRange = () => {
 const from = parseInt(rangeFrom, 10);
 const to = parseInt(rangeTo, 10);
 if (isNaN(from) || isNaN(to)) return;
 const lo = Math.max(1, Math.min(from, to));
 const hi = Math.min(filteredRows.length, Math.max(from, to));
 const codes = filteredRows.slice(lo - 1, hi).map((r) => r.code);
 addCodes(codes);
 };

 return (
 <div>
 <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
 <div>
 <h3 className="text-base font-black" style={{ color: BRAND.text }}>Registered Barcodes</h3>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>{total} total on this order • page {page} of {pages || 1}</p>
 </div>
 <div className="flex items-center gap-2 flex-wrap">
 <div className="relative">
 <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
 <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter code..." className={`${inputCls} !pl-8 !w-44 !py-2`} style={fieldStyle} />
 </div>
 <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Select Page</button>
 <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Clear</button>
 <div className="flex items-center gap-1.5">
 <input
 type="number"
 min="1"
 inputMode="numeric"
 placeholder="From"
 value={rangeFrom}
 onChange={(e) => setRangeFrom(e.target.value)}
 className={`${inputCls} !w-16 !py-1.5 text-xs`}
 style={fieldStyle}
 />
 <span className="text-xs font-bold" style={{ color: BRAND.textMuted }}>to</span>
 <input
 type="number"
 min="1"
 inputMode="numeric"
 placeholder="To"
 value={rangeTo}
 onChange={(e) => setRangeTo(e.target.value)}
 className={`${inputCls} !w-16 !py-1.5 text-xs`}
 style={fieldStyle}
 />
 <button onClick={handleSelectRange} disabled={rangeFrom === '' || rangeTo === ''} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-50">Select Range</button>
 </div>
 <button onClick={onPrintSelected} disabled={printing || selectedCodes.size === 0} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-50">
 <Printer className="w-3.5 h-3.5" /> Print Selected ({selectedCodes.size})
 </button>
 <button onClick={onPrintOrder} disabled={printing} className="btn-warm-primary !min-h-0 !py-1.5 !px-3 text-xs disabled:opacity-50">
 <Printer className="w-3.5 h-3.5" /> Print Entire Order
 </button>
 </div>
 </div>

 {historyLoading ? (
 <div className="text-center py-12 rounded-xl flex items-center justify-center gap-2" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)', color: BRAND.textMuted }}>
 <Loader2 className="w-4 h-4 animate-spin" /> Loading barcodes…
 </div>
 ) : historyError ? (
 <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
 <p className="font-bold" style={{ color: '#b91c1c' }}>{historyError}</p>
 </div>
 ) : filteredRows.length === 0 ? (
 <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
 <p className="font-bold" style={{ color: BRAND.textMuted }}>No barcodes match this filter.</p>
 </div>
 ) : (
 <motion.div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }} >
 {filteredRows.map((r) => {
 const checked = selectedCodes.has(r.code);
 return (
 <motion.div
 key={r.code}
 onClick={() => toggleCode(r.code)}
 whileHover={{ y: -6, scale: 1.02 }}
 transition={{ type: 'spring', stiffness: 320, damping: 22 }}
 className="rounded-xl p-4 flex flex-col items-center gap-3 relative cursor-pointer"
 style={{ background: checked ? '#faf3ea' : '#fff', border: `1.5px solid ${checked ? BRAND.accent : BRAND.border}` }}
 >
 {/* Checkbox mirrors the card's own toggle — stopPropagation so tapping it
 directly doesn't also fire the card's onClick and toggle twice (net no-op). */}
 <input type="checkbox" checked={checked} onChange={() => toggleCode(r.code)} onClick={(e) => e.stopPropagation()} className="absolute top-3 left-3 w-4 h-4 accent-[#c8834a] cursor-pointer" />
 <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
 <BarcodeCanvas code={r.code} displayWidth={190} />
 </div>
 <div className="text-center w-full">
 <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{r.code}</div>
 <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
 {r.style_name && <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{r.style_name}</span>}
 {r.size && <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>Size {r.size}</span>}
 <span className={statusBadgeClass(r.status === 'active' ? 'PRINTED' : 'PENDING')}>{r.status === 'active' ? 'Active' : 'Retired'}</span>
 </div>
 </div>
 <div className="flex gap-2 w-full">
 <button onClick={(e) => { e.stopPropagation(); onOpenDetail(r.code); }} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
 <button onClick={(e) => { e.stopPropagation(); onPrintSingle(r.code); }} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
 </div>
 </motion.div>
 );
 })}
 </motion.div>
 )}

 <BarcodePagination page={page} pages={pages} setPage={setPage} />
 </div>
 );
}

// ─── STYLE: Print Center sub-view — the codes queued from the grid above ──────
function StylePrintQueue({ selectedCodes, rowByCode, onRemove, onClear, onPrintSelected, onPrintOrder, printing }) {
 const codes = Array.from(selectedCodes);
 return (
 <div className="space-y-4">
 <div className="rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div>
 <h3 className="text-base font-black" style={{ color: BRAND.text }}>Print Queue ({codes.length} selected)</h3>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>Check codes in the Batch Generation grid, then send them to the label printer.</p>
 </div>
 <div className="flex gap-2 flex-wrap">
 <button onClick={onClear} disabled={codes.length === 0} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50">Clear Queue</button>
 <button onClick={onPrintSelected} disabled={printing || codes.length === 0} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50">
 <Printer className="w-4 h-4" /> Print Selected
 </button>
 <button onClick={onPrintOrder} disabled={printing} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50">
 <Printer className="w-4 h-4" /> Print Entire Order
 </button>
 </div>
 </div>

 {codes.length === 0 ? (
 <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
 <p className="font-bold" style={{ color: BRAND.textMuted }}>No barcodes queued for printing yet.</p>
 <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Check codes in the Batch Generation grid to queue them here.</p>
 </div>
 ) : (
 <div className="flex flex-wrap gap-2">
 {codes.map((code) => {
 const row = rowByCode.get(code);
 return (
 <div key={code} className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-full text-xs font-mono font-bold" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}`, color: '#5a3518' }}>
 {code}{row?.size ? ` · ${row.size}` : ''}
 <button onClick={() => onRemove(code)} className="w-4 h-4 rounded-full flex items-center justify-center" style={{ background: BRAND.bg }}>
 <X className="w-3 h-3" style={{ color: BRAND.textMuted }} />
 </button>
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}

// ─── STYLE: Batch History sub-view — dense table over the same live page ─────
function StyleHistoryTable({ rows, historyLoading, historyError, page, setPage, pages, total, onOpenDetail, onPrintSingle, onExportCSV }) {
 return (
 <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
 <div>
 <h3 className="text-base font-black" style={{ color: BRAND.text }}>Barcode History</h3>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>{total} total • page {page} of {pages || 1}</p>
 </div>
 <button onClick={onExportCSV} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs"><FileDown className="w-4 h-4" /> Export CSV (this page)</button>
 </div>

 {historyLoading ? (
 <div className="text-center py-8 flex items-center justify-center gap-2" style={{ color: BRAND.textMuted }}><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
 ) : historyError ? (
 <div className="text-center py-8" style={{ color: '#b91c1c' }}>{historyError}</div>
 ) : rows.length === 0 ? (
 <div className="text-center py-8" style={{ color: BRAND.textMuted }}>No barcode history records match the selected filters.</div>
 ) : (
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr style={{ background: '#fff' }}>
 {['Code', 'SKU', 'Style', 'Colour', 'Size', 'Seq', 'Current Stage', 'Status', 'Generated At', 'Actions'].map((h) => (
 <th key={h} className="text-left px-3 py-2.5 text-[0.7rem] font-bold uppercase tracking-wide whitespace-nowrap" style={{ color: BRAND.textMuted, borderBottom: `1.5px solid ${BRAND.border}` }}>{h}</th>
 ))}
 </tr>
 </thead>
 <motion.tbody >
 {rows.map((r) => (
 <motion.tr key={r.code} className="hover:bg-[#fdf6ee]">
 <td className="px-3 py-2.5 font-mono font-bold whitespace-nowrap" style={{ color: '#5a3518', borderBottom: '1px solid #f0e8d7' }}>{r.code}</td>
 <td className="px-3 py-2.5 whitespace-nowrap" style={{ borderBottom: '1px solid #f0e8d7' }}>{r.sku_code || '—'}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{r.style_name || '—'}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{r.colour || '—'}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{r.size || '—'}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{r.seq ?? '—'}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{r.current_stage || '—'}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}><span className={statusBadgeClass(r.status === 'active' ? 'PRINTED' : 'PENDING')}>{r.status === 'active' ? 'Active' : 'Retired'}</span></td>
 <td className="px-3 py-2.5 text-xs whitespace-nowrap" style={{ borderBottom: '1px solid #f0e8d7' }}>{r.generated_at ? new Date(r.generated_at).toLocaleString() : '—'}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
 <div className="flex gap-1.5">
 <button onClick={() => onOpenDetail(r.code)} className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-xs">View</button>
 <button onClick={() => onPrintSingle(r.code)} className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-xs">Print</button>
 </div>
 </td>
 </motion.tr>
 ))}
 </motion.tbody>
 </table>
 </div>
 )}
 <BarcodePagination page={page} pages={pages} setPage={setPage} />
 </div>
 );
}

const STYLE_HISTORY_PAGE_SIZE = 24;
const DEFAULT_STYLE_FILTERS = { styleId: 'ALL', size: 'ALL', status: 'ALL' };

// ─── STYLE: Registry Panel — one always-mounted component covering all three
// tabs (Batch Generation / Print Center / Batch History) so the selected
// order, filters and print queue survive switching between them. ───────────
function StyleRegistryPanel({ activeTab, token, showToast, setPrintSheetItems }) {
 const [orders, setOrders] = useState([]);
 const [ordersLoading, setOrdersLoading] = useState(false);
 const [ordersError, setOrdersError] = useState(null);
 const [selectedOrderId, setSelectedOrderId] = useState('');

 const [skuOptions, setSkuOptions] = useState([]);
 const [analytics, setAnalytics] = useState(null);
 const [orderMetaLoading, setOrderMetaLoading] = useState(false);
 const [orderMetaError, setOrderMetaError] = useState(null);

 const [filters, setFiltersState] = useState(DEFAULT_STYLE_FILTERS);
 const [page, setPage] = useState(1);
 const [historyData, setHistoryData] = useState(null);
 const [historyLoading, setHistoryLoading] = useState(false);
 const [historyError, setHistoryError] = useState(null);

 const [selectedCodes, setSelectedCodes] = useState(() => new Set());
 const [search, setSearch] = useState('');
 const [printing, setPrinting] = useState(false);

 const [detailOpen, setDetailOpen] = useState(false);
 const [detailLoading, setDetailLoading] = useState(false);
 const [detailError, setDetailError] = useState(null);
 const [detailData, setDetailData] = useState(null);

 // GET /barcode/orders — the order picker.
 useEffect(() => {
 if (!token) return;
 let cancelled = false;
 (async () => {
 setOrdersLoading(true);
 setOrdersError(null);
 try {
 const rows = await apiGetBarcodeOrders(token);
 if (!cancelled) setOrders(Array.isArray(rows) ? rows : []);
 } catch (err) {
 if (!cancelled) setOrdersError(err.message || 'Failed to load orders.');
 } finally {
 if (!cancelled) setOrdersLoading(false);
 }
 })();
 return () => { cancelled = true; };
 }, [token]);

 // GET /barcode/orders/{id}/skus + GET /barcode/orders/{id}/analytics — order metadata.
 useEffect(() => {
 if (!token || !selectedOrderId) return;
 let cancelled = false;
 (async () => {
 setOrderMetaLoading(true);
 setOrderMetaError(null);
 try {
 const [skus, an] = await Promise.all([
 apiGetOrderBarcodeSkus(token, selectedOrderId),
 apiGetOrderBarcodeAnalytics(token, selectedOrderId),
 ]);
 if (cancelled) return;
 setSkuOptions(Array.isArray(skus) ? skus : []);
 setAnalytics(an);
 } catch (err) {
 if (!cancelled) setOrderMetaError(err.message || 'Failed to load order analytics.');
 } finally {
 if (!cancelled) setOrderMetaLoading(false);
 }
 })();
 return () => { cancelled = true; };
 }, [token, selectedOrderId]);

 // GET /barcode/orders/{id}/barcodes — the filterable, paginated history page.
 useEffect(() => {
 if (!token || !selectedOrderId) return;
 let cancelled = false;
 (async () => {
 setHistoryLoading(true);
 setHistoryError(null);
 try {
 const data = await apiGetOrderBarcodes(token, selectedOrderId, {
 styleId: filters.styleId !== 'ALL' ? filters.styleId : undefined,
 size: filters.size !== 'ALL' ? filters.size : undefined,
 status: filters.status !== 'ALL' ? filters.status : undefined,
 page,
 pageSize: STYLE_HISTORY_PAGE_SIZE,
 });
 if (!cancelled) setHistoryData(data);
 } catch (err) {
 if (!cancelled) setHistoryError(err.message || 'Failed to load barcode history.');
 } finally {
 if (!cancelled) setHistoryLoading(false);
 }
 })();
 return () => { cancelled = true; };
 }, [token, selectedOrderId, filters, page]);

 const handleSelectOrder = (id) => {
 setSelectedOrderId(id);
 setFiltersState(DEFAULT_STYLE_FILTERS);
 setPage(1);
 setSelectedCodes(new Set());
 setSearch('');
 setSkuOptions([]);
 setAnalytics(null);
 setHistoryData(null);
 };

 const setFilter = (field, value) => { setFiltersState((prev) => ({ ...prev, [field]: value })); setPage(1); };
 const resetFilters = () => { setFiltersState(DEFAULT_STYLE_FILTERS); setPage(1); };

 const rows = useMemo(() => historyData?.items || [], [historyData]);

 const toggleCode = (code) => setSelectedCodes((prev) => { const next = new Set(prev); next.has(code) ? next.delete(code) : next.add(code); return next; });
 const selectAllVisible = () => setSelectedCodes((prev) => { const next = new Set(prev); rows.forEach((r) => next.add(r.code)); return next; });
 const clearSelection = () => setSelectedCodes(new Set());
 // Bulk-add codes to the selection (used by range select) without disturbing
 // codes already checked elsewhere (e.g. from a previous page/range).
 const addCodes = (codes) => setSelectedCodes((prev) => { const next = new Set(prev); codes.forEach((c) => next.add(c)); return next; });

 const openDetail = useCallback(async (code) => {
 setDetailOpen(true);
 setDetailLoading(true);
 setDetailError(null);
 setDetailData(null);
 try {
 const data = await apiGetBarcodeDetail(token, code);
 setDetailData(data);
 } catch (err) {
 setDetailError(err.message || 'Failed to load barcode detail.');
 } finally {
 setDetailLoading(false);
 }
 }, [token]);

 const currentOrder = useMemo(() => orders.find((o) => o.order_id === selectedOrderId), [orders, selectedOrderId]);
 const rowByCode = useMemo(() => new Map(rows.map((r) => [r.code, r])), [rows]);

 const buildPrintCards = useCallback((labels) => labels.map((l) => {
 const row = rowByCode.get(l.code);
 return {
 pieceCode: l.code,
 orderId: currentOrder?.order_number || '—',
 client: currentOrder?.client_name || '—',
 style: row?.style_name || l.caption || '—',
 article: row?.article || '—',
 color: row?.colour || '—',
 size: row?.size || '—',
 serialStr: row?.seq != null ? String(row.seq).padStart(3, '0') : '—',
 batchNo: currentOrder?.order_number || '—',
 printStatus: row?.status === 'retired' ? 'PARTIAL' : 'PENDING',
 };
 }), [rowByCode, currentOrder]);

 // POST /barcode/print — provide exactly one of { codes, sku_id, order_id }.
 const handlePrint = useCallback(async (args) => {
 setPrinting(true);
 try {
 const labels = await apiPrintBarcodes(token, args);
 const cards = buildPrintCards(labels);
 if (cards.length === 0) { showToast('No labels returned for this selection.', 'info'); return; }
 setPrintSheetItems(cards);
 showToast(`Sending ${cards.length} label${cards.length === 1 ? '' : 's'} to printer (4 per page)…`, 'success');
 } catch (err) {
 showToast(err.message || 'Failed to generate print labels.', 'error');
 } finally {
 setPrinting(false);
 }
 }, [token, buildPrintCards, setPrintSheetItems, showToast]);

 const handlePrintSelected = () => {
 if (selectedCodes.size === 0) { showToast('Select at least one barcode to print!', 'error'); return; }
 handlePrint({ codes: Array.from(selectedCodes) });
 };
 const handlePrintSingleCode = (code) => handlePrint({ codes: [code] });
 const handlePrintEntireOrder = () => {
 if (!selectedOrderId) return;
 handlePrint({ order_id: selectedOrderId });
 };

 const handleExportCSV = () => {
 const header = ['Code', 'Status', 'SKU', 'Style', 'Colour', 'Size', 'Seq', 'Current Stage', 'Generated At'];
 const csvRows = [header, ...rows.map((r) => [r.code, r.status, r.sku_code, r.style_name, r.colour, r.size, r.seq, r.current_stage, r.generated_at])];
 const csv = csvRows.map((r) => r.map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
 const blob = new Blob([csv], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url; link.download = `barcode-history-${currentOrder?.order_number || selectedOrderId}-page${page}.csv`;
 document.body.appendChild(link); link.click(); document.body.removeChild(link);
 URL.revokeObjectURL(url);
 };

 const styleFilterOptions = useMemo(() => {
 const map = new Map();
 skuOptions.forEach((s) => { if (!map.has(s.style_id)) map.set(s.style_id, s.style_name || s.style_id); });
 return Array.from(map.entries());
 }, [skuOptions]);
 const sizeFilterOptions = useMemo(() => Array.from(new Set(skuOptions.map((s) => s.size).filter(Boolean))), [skuOptions]);

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <h3 className="text-base font-black flex items-center gap-2" style={{ color: BRAND.text }}>
 <PackageSearch className="w-4 h-4" style={{ color: BRAND.accent }} /> Live Barcode Registry
 </h3>
 <p className="text-xs mt-0.5" style={{ color: BRAND.textMuted }}>Piece barcodes are minted automatically during Cutting — this screen browses, audits, and prints what&apos;s already registered.</p>
 <div className="mt-4">
 <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Production Order</label>
 {ordersLoading ? (
 <div className="flex items-center gap-2 text-sm py-2.5" style={{ color: BRAND.textMuted }}><Loader2 className="w-4 h-4 animate-spin" /> Loading orders…</div>
 ) : ordersError ? (
 <p className="text-sm" style={{ color: '#b91c1c' }}>{ordersError}</p>
 ) : orders.length === 0 ? (
 <p className="text-sm" style={{ color: BRAND.textMuted }}>No orders have generated barcodes yet.</p>
 ) : (
 <div className="sm:!w-[420px]">
 <ScreenSafeSelect
 value={selectedOrderId}
 onChange={handleSelectOrder}
 placeholder="-- Select an order --"
 options={orders.map((o) => ({ value: o.order_id, label: `${o.order_number} — ${o.client_name} (${o.minted} pcs)` }))}
 />
 </div>
 )}
 </div>
 </div>

 {!selectedOrderId ? (
 <div className="text-center py-16 rounded-2xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
 <Barcode className="w-10 h-10 mx-auto mb-2 opacity-30" style={{ color: BRAND.textMuted }} />
 <p className="font-bold" style={{ color: BRAND.textMuted }}>Select an order above to browse its barcode registry.</p>
 </div>
 ) : (
 <>
 <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 {orderMetaLoading ? (
 <div className="flex items-center gap-2 text-sm py-4" style={{ color: BRAND.textMuted }}><Loader2 className="w-4 h-4 animate-spin" /> Loading analytics…</div>
 ) : orderMetaError ? (
 <p className="text-sm" style={{ color: '#b91c1c' }}>{orderMetaError}</p>
 ) : analytics ? (
 <>
 <div className="flex items-center gap-6 flex-wrap">
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Planned</p><p className="font-bold" style={{ color: BRAND.text }}>{analytics.order_total.planned} pcs</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{analytics.order_total.generated} pcs</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Balance</p><p className="font-bold" style={{ color: '#d97706' }}>{analytics.order_total.balance} pcs</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Active</p><p className="font-bold" style={{ color: '#16a34a' }}>{analytics.order_total.active}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Retired</p><p className="font-bold" style={{ color: BRAND.textMuted }}>{analytics.order_total.retired}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Duplicates</p><p className="font-bold" style={{ color: analytics.order_total.duplicates > 0 ? '#b91c1c' : '#16a34a' }}>{analytics.order_total.duplicates}</p></div>
 <span className={statusBadgeClass(analytics.order_total.fully_generated ? 'PRINTED' : 'PARTIAL')}>
 {analytics.order_total.fully_generated ? 'Fully Generated' : analytics.order_total.half_minted ? 'Partially Minted' : 'Pending Cutting'}
 </span>
 </div>
 {analytics.by_style.length > 0 && (
 <div className="grid gap-3 mt-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
 {analytics.by_style.map((st) => (
 <div key={st.style_id} className="rounded-lg p-3 text-xs space-y-1.5" style={{ background: BRAND.bg, border: '1px solid rgba(200,131,74,0.15)' }}>
 <div className="font-bold text-sm truncate" style={{ color: '#5a3518' }}>{st.style_name}</div>
 <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Planned:</span><strong>{st.planned}</strong></div>
 <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Minted:</span><strong>{st.minted}</strong></div>
 <div className="flex justify-between"><span style={{ color: BRAND.textMuted }}>Balance:</span><strong style={{ color: '#c8834a' }}>{st.balance}</strong></div>
 </div>
 ))}
 </div>
 )}
 </>
 ) : null}
 </div>

 <div className="rounded-2xl p-5 shadow-sm grid gap-4 items-end" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}`, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
 <div>
 <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Style</label>
 <ScreenSafeSelect
 value={filters.styleId}
 onChange={(v) => setFilter('styleId', v)}
 placeholder="All Styles"
 options={[{ value: 'ALL', label: 'All Styles' }, ...styleFilterOptions.map(([id, name]) => ({ value: id, label: name }))]}
 />
 </div>
 <div>
 <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Size</label>
 <ScreenSafeSelect
 value={filters.size}
 onChange={(v) => setFilter('size', v)}
 placeholder="All Sizes"
 options={[{ value: 'ALL', label: 'All Sizes' }, ...sizeFilterOptions.map((sz) => ({ value: sz, label: sz }))]}
 />
 </div>
 <div>
 <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Status</label>
 <ScreenSafeSelect
 value={filters.status}
 onChange={(v) => setFilter('status', v)}
 placeholder="All Statuses"
 options={[
 { value: 'ALL', label: 'All Statuses' },
 { value: 'active', label: 'Active' },
 { value: 'retired', label: 'Retired' },
 ]}
 />
 </div>
 <button onClick={resetFilters} className="btn-warm-secondary !min-h-0 !py-2.5"><RotateCcw className="w-4 h-4" /> Reset</button>
 </div>

 <div key={activeTab} >
 {activeTab === 'generation' && (
 <StyleGenerationGrid
 rows={rows} historyLoading={historyLoading} historyError={historyError}
 search={search} setSearch={setSearch}
 selectedCodes={selectedCodes} toggleCode={toggleCode} selectAllVisible={selectAllVisible} clearSelection={clearSelection} addCodes={addCodes}
 page={page} setPage={setPage} pages={historyData?.pages || 1} total={historyData?.total || 0}
 onOpenDetail={openDetail} onPrintSingle={handlePrintSingleCode}
 onPrintSelected={handlePrintSelected} onPrintOrder={handlePrintEntireOrder} printing={printing}
 />
 )}
 {activeTab === 'print' && (
 <StylePrintQueue
 selectedCodes={selectedCodes} rowByCode={rowByCode} onRemove={toggleCode} onClear={clearSelection}
 onPrintSelected={handlePrintSelected} onPrintOrder={handlePrintEntireOrder} printing={printing}
 />
 )}
 {activeTab === 'history' && (
 <StyleHistoryTable
 rows={rows} historyLoading={historyLoading} historyError={historyError}
 page={page} setPage={setPage} pages={historyData?.pages || 1} total={historyData?.total || 0}
 onOpenDetail={openDetail} onPrintSingle={handlePrintSingleCode} onExportCSV={handleExportCSV}
 />
 )}
 </div>
 </>
 )}

 <LiveBarcodeDetailModal open={detailOpen} loading={detailLoading} error={detailError} data={detailData} onClose={() => setDetailOpen(false)} />
 </div>
 );
}

// ─── EMPLOYEE: BATCH GENERATION TAB ────────────────────────────────────────────
function EmployeeGenerationTab({ employees, employeesLoading, employeesError, onRetryEmployees, employeeGenerated, onGenerateSelected, onGenerateAllRemaining, onSendToPrintCenter, onOpenDetail, onPrintSingle }) {
 const designations = useMemo(() => Array.from(new Set(employees.map((e) => e.designation))), [employees]);
 const [designationFilter, setDesignationFilter] = useState('ALL');
 const [selectedIds, setSelectedIds] = useState(() => new Set());
 const [search, setSearch] = useState('');

 const generatedIds = useMemo(() => new Set(employeeGenerated.map((r) => r.size)), [employeeGenerated]);

 const filteredEmployees = useMemo(() => {
 let list = employees;
 if (designationFilter !== 'ALL') list = list.filter((e) => e.designation === designationFilter);
 const q = search.trim().toLowerCase();
 if (q) list = list.filter((e) => e.name.toLowerCase().includes(q) || e.empId.toLowerCase().includes(q));
 return list;
 }, [employees, designationFilter, search]);

 const totals = useMemo(() => ({ ordered: employees.length, generated: employeeGenerated.length }), [employees, employeeGenerated]);

 const toggleSelect = (empId) => setSelectedIds((prev) => { const next = new Set(prev); next.has(empId) ? next.delete(empId) : next.add(empId); return next; });
 const selectAllVisible = () => setSelectedIds((prev) => {
 const next = new Set(prev);
 filteredEmployees.forEach((e) => { if (!generatedIds.has(e.empId)) next.add(e.empId); });
 return next;
 });
 const clearSelection = () => setSelectedIds(new Set());

 const handleGenerateClick = () => {
 const chosen = employees.filter((e) => selectedIds.has(e.empId));
 onGenerateSelected(chosen);
 setSelectedIds(new Set());
 };

 const generatedBarcodes = useMemo(() => {
 let list = employeeGenerated;
 const q = search.trim().toLowerCase();
 if (q) list = list.filter((b) => b.pieceCode.toLowerCase().includes(q) || b.style.toLowerCase().includes(q));
 return list;
 }, [employeeGenerated, search]);

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="rounded-2xl p-6 shadow-sm flex items-center gap-6 flex-wrap" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Total Employees</p><p className="font-bold" style={{ color: BRAND.text }}>{totals.ordered}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{totals.generated}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Remaining</p><p className="font-bold" style={{ color: '#d97706' }}>{totals.ordered - totals.generated}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Selected</p><p className="font-bold" style={{ color: BRAND.accent }}>{selectedIds.size}</p></div>
 </div>

 <div className="rounded-2xl p-6 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
 <div>
 <h3 className="text-lg font-black" style={{ color: BRAND.text }}>Select Employees to Generate</h3>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>Filter by designation, check employees, then generate.</p>
 </div>
 <div className="flex gap-2 flex-wrap">
 <button onClick={handleGenerateClick} disabled={selectedIds.size === 0} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50 disabled:cursor-default">
 <Zap className="w-4 h-4" /> Generate Selected ({selectedIds.size})
 </button>
 <button onClick={onGenerateAllRemaining} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Generate All Remaining</button>
 <button onClick={onSendToPrintCenter} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><Send className="w-4 h-4" /> Send All to Print Center</button>
 </div>
 </div>

 <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
 <div className="flex items-center gap-2">
 <span className="text-[0.68rem] font-bold uppercase whitespace-nowrap" style={{ color: BRAND.textMuted }}>Designation:</span>
 <ScreenSafeSelect
 value={designationFilter}
 onChange={setDesignationFilter}
 placeholder="All Designations"
 className={`${selectCls} !w-56`}
 options={[{ value: 'ALL', label: 'All Designations' }, ...designations.map((d) => ({ value: d, label: d }))]}
 />
 </div>
 <div className="relative">
 <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
 <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name or employee ID..." className={`${inputCls} !pl-8 !w-56 !py-2`} style={fieldStyle} />
 </div>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>{filteredEmployees.length} employee{filteredEmployees.length === 1 ? '' : 's'} match this filter</p>
 <div className="flex gap-2">
 <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Select All Visible</button>
 <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Clear</button>
 </div>
 </div>

 {employeesLoading ? (
 <div className="text-center py-8 text-sm rounded-lg" style={{ color: BRAND.textMuted, border: `1px solid ${BRAND.border}` }}>Loading employee roster…</div>
 ) : employeesError ? (
 <div className="text-center py-8 text-sm space-y-2 rounded-lg" style={{ color: BRAND.textMuted, border: `1px solid ${BRAND.border}` }}>
 <p style={{ color: '#b91c1c' }}>{employeesError}</p>
 <button onClick={onRetryEmployees} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Retry</button>
 </div>
 ) : filteredEmployees.length === 0 ? (
 <div className="text-center py-8 text-sm rounded-lg" style={{ color: BRAND.textMuted, border: `1px solid ${BRAND.border}` }}>
 {employees.length === 0 ? 'No employees on the roster yet.' : 'No employees match this filter.'}
 </div>
 ) : (
 <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))' }}>
 {filteredEmployees.map((e) => {
 const isGenerated = generatedIds.has(e.empId);
 const isChecked = selectedIds.has(e.empId);
 return (
 <label
 key={e.empId}
 className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg cursor-pointer"
 style={{ background: isChecked ? '#faf3ea' : '#fff', border: `1.5px solid ${isChecked ? BRAND.accent : BRAND.border}` }}
 >
 <input type="checkbox" disabled={isGenerated} checked={isChecked} onChange={() => toggleSelect(e.empId)} className="w-4 h-4 accent-[#c8834a] cursor-pointer disabled:cursor-default flex-shrink-0" />
 <div className="flex-1 min-w-0">
 <div className="font-bold text-sm truncate" style={{ color: '#5a3518' }}>{e.name}</div>
 <div className="text-xs truncate" style={{ color: BRAND.textMuted }}>{e.designation} • {e.empId}</div>
 </div>
 <span className={`${statusBadgeClass(isGenerated ? 'PRINTED' : 'PENDING')} flex-shrink-0`}>{isGenerated ? 'Done' : 'Pending'}</span>
 </label>
 );
 })}
 </div>
 )}
 </div>

 <div>
 <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
 <div>
 <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Employee ID Barcodes</h3>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {generatedBarcodes.length} badges</p>
 </div>
 <div className="relative">
 <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
 <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter name/code..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
 </div>
 </div>

 {generatedBarcodes.length === 0 ? (
 <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
 <p className="font-bold" style={{ color: BRAND.textMuted }}>No employee ID barcodes generated yet.</p>
 <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Check employees above and click &quot;Generate Selected&quot;.</p>
 </div>
 ) : (
 <motion.div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }} >
 {generatedBarcodes.map((b) => (
 <motion.div
 key={b.pieceCode}
 
 whileHover={{ y: -6, scale: 1.02 }}
 transition={{ type: 'spring', stiffness: 320, damping: 22 }}
 onClick={() => onOpenDetail(b.pieceCode)}
 className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer"
 style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
 >
 <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
 <BarcodeCanvas code={b.pieceCode} displayWidth={200} />
 </div>
 <div className="text-center w-full">
 <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
 <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
 <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.style}</span>
 <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.color}</span>
 <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
 </div>
 </div>
 <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
 <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
 <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
 </div>
 </motion.div>
 ))}
 </motion.div>
 )}
 </div>
 </div>
 );
}

// ─── DRAWER: BATCH GENERATION TAB (Live GET /api/v1/drawers) ─────────────────
function DrawerGenerationTab({
 drawers,
 drawersLoading,
 drawersError,
 onRetryDrawers,
 drawerGenerated,
 onGenerateSelected,
 onGenerateAllRemaining,
 onPrintAll,
 onSendToPrintCenter,
 onOpenDetail,
 onPrintSingle,
 stateFilter,
 setStateFilter,
 seqFrom,
 setSeqFrom,
 seqTo,
 setSeqTo,
 drawerTotal,
}) {
 const [selectedIds, setSelectedIds] = useState(() => new Set());
 const [search, setSearch] = useState('');

 const generatedCodes = useMemo(() => new Set(drawerGenerated.map((r) => r.pieceCode)), [drawerGenerated]);
 const generatedDrawerIds = useMemo(() => new Set(drawerGenerated.map((r) => r.size)), [drawerGenerated]);

 const filteredDrawers = useMemo(() => {
 let list = drawers || [];
 const q = search.trim().toLowerCase();
 if (q) {
 list = list.filter((d) =>
 (d.code && d.code.toLowerCase().includes(q)) ||
 (d.drawer_id && d.drawer_id.toLowerCase().includes(q)) ||
 (d.barcode && d.barcode.toLowerCase().includes(q)) ||
 String(d.seq).includes(q)
 );
 }
 return list;
 }, [drawers, search]);

 const toggleSelect = (drawerId) => {
 setSelectedIds((prev) => {
 const next = new Set(prev);
 next.has(drawerId) ? next.delete(drawerId) : next.add(drawerId);
 return next;
 });
 };

 const selectAllVisible = () => {
 setSelectedIds((prev) => {
 const next = new Set(prev);
 filteredDrawers.forEach((d) => {
 if (!d.barcode) return; // nothing to encode — never select it
 next.add(d.drawer_id || d.code || String(d.seq));
 });
 return next;
 });
 };

 const clearSelection = () => setSelectedIds(new Set());

 // A drawer with barcode: null has no registry code, so it can be listed but
 // never encoded — these two counts make that visible instead of letting the
 // operator believe a blank label is a label.
 const printableCount = useMemo(() => (drawers || []).filter((d) => d.barcode).length, [drawers]);
 const missingCount = (drawers ? drawers.length : 0) - printableCount;

 // The state vocabulary is the backend's DrawerState enum, and only `waiting`
 // is documented — so the dropdown is built from the states the API actually
 // returned rather than a hard-coded guess that would 422 on filter.
 const stateOptions = useMemo(() => {
 const seen = new Set((drawers || []).map((d) => d.state).filter(Boolean));
 if (stateFilter !== 'ALL') seen.add(stateFilter);
 return Array.from(seen).sort();
 }, [drawers, stateFilter]);

 const handleGenerateClick = () => {
 const chosen = (drawers || []).filter((d) => selectedIds.has(d.drawer_id || d.code || String(d.seq)));
 onGenerateSelected(chosen);
 setSelectedIds(new Set());
 };

 return (
 <div className="space-y-6 animate-fade-in">
 {/* Overview Stat Cards */}
 <div className="rounded-2xl p-6 shadow-sm flex items-center gap-6 flex-wrap" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Total in Database</p><p className="font-bold" style={{ color: BRAND.text }}>{drawerTotal || (drawers ? drawers.length : 0)}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Loaded in View</p><p className="font-bold" style={{ color: BRAND.text }}>{drawers ? drawers.length : 0}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Printable Labels</p><p className="font-bold" style={{ color: BRAND.text }}>{printableCount}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Missing Barcode</p><p className="font-bold" style={{ color: missingCount > 0 ? '#b91c1c' : BRAND.text }}>{missingCount}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Queued / Generated</p><p className="font-bold" style={{ color: BRAND.text }}>{drawerGenerated.length}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Remaining</p><p className="font-bold" style={{ color: '#d97706' }}>{Math.max(0, printableCount - drawerGenerated.length)}</p></div>
 <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Selected</p><p className="font-bold" style={{ color: BRAND.accent }}>{selectedIds.size}</p></div>
 </div>

 {/* Backend Controls & Filter Box */}
 <div className="rounded-2xl p-6 shadow-sm space-y-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div className="flex items-center justify-between flex-wrap gap-3">
 <div>
 <h3 className="text-lg font-black" style={{ color: BRAND.text }}>Live Drawers &amp; Barcode Labels</h3>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>
 The label sheet straight off <code className="font-mono font-bold text-xs bg-amber-50 px-1 py-0.5 rounded text-[#a86530]">GET /api/v1/drawers</code>, ordered by drawer seq. Print the whole pool in one pass, or filter by state / seq range first.
 </p>
 <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>
 Labels print bare — barcode only — at <span className="font-bold">{BUCKET_LABEL.widthMm} × {BUCKET_LABEL.heightMm}mm</span> to paste on the bucket, {BUCKET_LABELS_PER_PAGE} per A4 sheet.
 Set the print dialog to <span className="font-bold">100% scale</span> (not &quot;fit to page&quot;) or they come out undersized.
 </p>
 </div>
 <div className="flex gap-2 flex-wrap">
 <button onClick={onPrintAll} disabled={printableCount === 0} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50 disabled:cursor-default">
 <Printer className="w-4 h-4" /> Print All {printableCount} Labels
 </button>
 <button onClick={handleGenerateClick} disabled={selectedIds.size === 0} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50 disabled:cursor-default">
 <Zap className="w-4 h-4" /> Generate Selected ({selectedIds.size})
 </button>
 <button onClick={onGenerateAllRemaining} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Generate All Remaining</button>
 <button onClick={onSendToPrintCenter} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><Send className="w-4 h-4" /> Send All to Print Center</button>
 <button onClick={onRetryDrawers} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><RotateCcw className="w-4 h-4" /> Refresh</button>
 </div>
 </div>

 {/* State & Range Filters */}
 <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
 <div>
 <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>1. Drawer State Filter</label>
 <ScreenSafeSelect
 value={stateFilter}
 onChange={setStateFilter}
 placeholder="All States (All Drawers)"
 options={[{ value: 'ALL', label: 'All States (All Drawers)' }, ...stateOptions.map((s) => ({ value: s, label: s }))]}
 />
 </div>

 <div>
 <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>2. Seq From (Optional)</label>
 <input
 type="number"
 placeholder="e.g. 1"
 value={seqFrom}
 onChange={(e) => setSeqFrom(e.target.value)}
 className={inputCls}
 style={fieldStyle}
 min="1"
 />
 </div>

 <div>
 <label className="block text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>3. Seq To (Optional)</label>
 <input
 type="number"
 placeholder="e.g. 50"
 value={seqTo}
 onChange={(e) => setSeqTo(e.target.value)}
 className={inputCls}
 style={fieldStyle}
 min="1"
 />
 </div>
 </div>

 <div className="flex items-center justify-between pt-2">
 <p className="text-xs" style={{ color: BRAND.textMuted }}>{filteredDrawers.length} drawer{filteredDrawers.length === 1 ? '' : 's'} loaded for current filter</p>
 <div className="flex gap-2">
 <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Select All Visible</button>
 <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Clear</button>
 </div>
 </div>

 {/* Drawer Roster Table / List */}
 <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
 {drawersLoading ? (
 <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>Loading drawers from server…</div>
 ) : drawersError ? (
 <div className="text-center py-8 text-sm space-y-2" style={{ color: BRAND.textMuted }}>
 <p style={{ color: '#b91c1c' }}>{drawersError}</p>
 <button onClick={onRetryDrawers} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Retry</button>
 </div>
 ) : filteredDrawers.length === 0 ? (
 <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>
 {drawers && drawers.length === 0 ? 'No drawers found matching the filter.' : 'No drawers match your search.'}
 </div>
 ) : (
 <div className="divide-y divide-[rgba(200,131,74,0.15)] max-h-96 overflow-y-auto">
 {filteredDrawers.map((drw) => {
 const uniqueKey = drw.drawer_id || drw.code || String(drw.seq);
 // Only the registry's own code is printable. Deriving one from
 // `seq` would produce a label no scanner can resolve, so a row
 // without `barcode` stays visible but unselectable.
 const unprintable = !drw.barcode;
 const isGenerated = !unprintable && (generatedCodes.has(drw.barcode) || generatedDrawerIds.has(drw.drawer_id));
 const isChecked = selectedIds.has(uniqueKey);

 return (
 <label
 key={uniqueKey}
 className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fdfaf5] transition-colors"
 style={{ background: isChecked ? '#faf3ea' : '#fff' }}
 >
 <div className="flex items-center gap-3">
 <input
 type="checkbox"
 disabled={isGenerated || unprintable}
 checked={isChecked}
 onChange={() => toggleSelect(uniqueKey)}
 className="w-4 h-4 accent-[#c8834a] cursor-pointer disabled:cursor-default"
 />
 <div>
 <div className="font-bold text-sm flex items-center gap-2" style={{ color: '#5a3518' }}>
 <span>{drw.code || `Drawer #${drw.seq}`}</span>
 <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-semibold">
 Seq #{drw.seq}
 </span>
 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
 drw.state === 'ready' ? 'bg-emerald-100 text-emerald-800' :
 drw.state === 'waiting' ? 'bg-amber-100 text-amber-800' :
 drw.state === 'released' ? 'bg-purple-100 text-purple-800' :
 'bg-blue-100 text-blue-800'
 }`}>
 {drw.state || 'active'}
 </span>
 </div>
 {drw.state === 'merged' && drw.piece_code && (
 <div className="mt-0.5 font-mono font-bold text-xs break-all" style={{ color: '#a86530' }}>
 Piece: {drw.piece_code}
 {drw.piece_serial && (
 <span className="ml-2 font-sans font-semibold" style={{ color: BRAND.textMuted }}>(Serial #{drw.piece_serial})</span>
 )}
 {drw.needs_lining && (
 <span className="ml-2 font-sans font-bold" style={{ color: '#b45309' }}>· needs lining</span>
 )}
 {drw.complete && (
 <span className="ml-2 font-sans font-bold" style={{ color: '#047857' }}>· complete</span>
 )}
 </div>
 )}
 <div className="text-xs font-mono mt-0.5" style={{ color: BRAND.textMuted }}>
 {drw.barcode ? (
 <span>Barcode: <span className="text-[#a86530] font-bold">{drw.barcode}</span></span>
 ) : (
 <span className="font-sans font-semibold" style={{ color: '#b91c1c' }}>no registry barcode — cannot be printed</span>
 )}
 </div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={unprintable ? 'badge badge-danger' : statusBadgeClass(isGenerated ? 'PRINTED' : 'PENDING')}>
 {unprintable ? 'No Barcode' : isGenerated ? 'Queued / Ready' : (drw.barcode_status || 'Unqueued')}
 </span>
 </div>
 </label>
 );
 })}
 </div>
 )}
 </div>
 </div>

 {/* Generated Drawer Barcodes Grid */}
 <div>
 <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
 <div>
 <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Drawer Barcodes &amp; Labels</h3>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {drawerGenerated.length} barcodes</p>
 </div>
 <div className="relative">
 <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
 <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter code/ID..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
 </div>
 </div>

 {drawerGenerated.length === 0 ? (
 <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
 <p className="font-bold" style={{ color: BRAND.textMuted }}>No drawer barcodes generated yet.</p>
 <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Select drawers above and click &quot;Generate Selected&quot;.</p>
 </div>
 ) : (
 <motion.div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }} >
 {drawerGenerated.map((b) => (
 <motion.div
 key={b.pieceCode}
 
 whileHover={{ y: -6, scale: 1.02 }}
 transition={{ type: 'spring', stiffness: 320, damping: 22 }}
 onClick={() => onOpenDetail(b.pieceCode)}
 className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer"
 style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
 >
 <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
 <BarcodeCanvas code={b.pieceCode} displayWidth={200} />
 </div>
 <div className="text-center w-full">
 <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
 <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
 <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.style}</span>
 <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold uppercase" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.color}</span>
 <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
 </div>
 <div className="font-mono text-[9px] text-slate-400 mt-1 truncate max-w-full" title={b.size}>
 UUID: {b.size}
 </div>
 </div>
 <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
 <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
 <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
 </div>
 </motion.div>
 ))}
 </motion.div>
 )}
 </div>
 </div>
 );
}

// ─── MATERIAL LOT CREATION MODAL ─────────────────────────────────────────────
function CreateMaterialLotModal({ open, onClose, token, showToast, onSuccess }) {
  const [category, setCategory] = useState('LEATHER');
  const [subtype, setSubtype] = useState('');
  const [article, setArticle] = useState('');
  const [colour, setColour] = useState('');
  const [thickness, setThickness] = useState('');
  const [size, setSize] = useState('');
  const [uom, setUom] = useState('DCM');
  const [onHand, setOnHand] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [spec, setSpec] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const subtypes = useMemo(() => {
    if (category === 'LINING') return ['PLAIN_LINING', 'RIBS', 'KNIT'];
    if (category === 'ACCESSORIES' || category === 'ACCESSORY') return ['BUTTON', 'ZIP', 'THREAD', 'OTHER'];
    return [];
  }, [category]);

  useEffect(() => {
    if (!open || !token) return;
    let isCurrent = true;
    setError(null);
    apiGetMaterialSpec(token, { category, subtype: subtype || undefined })
      .then((data) => {
        if (!isCurrent) return;
        setSpec(data);
        if (data?.uom) setUom(data.uom);
        else if (category === 'LEATHER') setUom('DCM');
        else if (category === 'LINING') setUom('MTRS');
        else setUom('PCS');
      })
      .catch(() => {
        if (!isCurrent) return;
        setSpec(null);
        if (category === 'LEATHER') setUom('DCM');
        else if (category === 'LINING') setUom('MTRS');
        else setUom('PCS');
      });
    return () => { isCurrent = false; };
  }, [open, token, category, subtype]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!article.trim()) {
      setError('Article name is required.');
      return;
    }
    const qtyNum = parseFloat(onHand);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Opening quantity (on_hand) must be a positive number.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        category,
        article: article.trim(),
        on_hand: qtyNum,
        uom: uom || (category === 'LEATHER' ? 'DCM' : category === 'LINING' ? 'MTRS' : 'PCS'),
      };
      if (subtype) payload.subtype = subtype;
      if (colour.trim()) payload.colour = colour.trim();
      if (category === 'LEATHER' && thickness.trim()) payload.thickness = thickness.trim();
      if (category !== 'LEATHER' && size.trim()) payload.size = size.trim();
      if (supplierId.trim()) payload.supplier_id = supplierId.trim();

      const res = await apiCreateMaterialLot(token, payload);
      showToast(`Material Lot created! Barcode: ${res?.barcode || res?.lot_id}`, 'success');
      onSuccess?.(res, payload);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create material lot.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" style={{ color: BRAND.accent }} />
          <h3 className="font-bold text-base" style={{ color: '#5a3518' }}>Create Material Lot &amp; Barcode</h3>
        </div>
        <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Registers a child barcode in the registry and adds opening stock in one transaction (<code className="font-mono text-xs font-bold text-[#a86530]">POST /api/v1/materials/lots</code>).
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Category *</label>
            <select
              value={category}
              onChange={(e) => { setCategory(e.target.value); setSubtype(''); }}
              className={selectCls}
              style={fieldStyle}
            >
              <option value="LEATHER">LEATHER</option>
              <option value="LINING">LINING</option>
              <option value="ACCESSORIES">ACCESSORIES</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
              Subtype {subtypes.length > 0 ? '(Optional)' : ''}
            </label>
            {subtypes.length > 0 ? (
              <select
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                className={selectCls}
                style={fieldStyle}
              >
                <option value="">Standard / None</option>
                {subtypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. COW_HIDE"
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                className={inputCls}
                style={fieldStyle}
              />
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Article Name *</label>
            <input
              type="text"
              placeholder="e.g. VINTAGE BROWN COWHIDE"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              className={inputCls}
              style={fieldStyle}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Colour</label>
            <input
              type="text"
              placeholder="e.g. DARK BROWN / #4A2E18"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              className={inputCls}
              style={fieldStyle}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {category === 'LEATHER' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Thickness</label>
              <input
                type="text"
                placeholder="e.g. 1.2 - 1.4 mm"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                className={inputCls}
                style={fieldStyle}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Size / Dimension</label>
              <input
                type="text"
                placeholder="e.g. 5# / 32 / Medium"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={inputCls}
                style={fieldStyle}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Opening Qty (on_hand) *</label>
            <input
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 250"
              value={onHand}
              onChange={(e) => setOnHand(e.target.value)}
              className={inputCls}
              style={fieldStyle}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Unit of Measure (UOM)</label>
            <select
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              className={selectCls}
              style={fieldStyle}
            >
              <option value="DCM">DCM (Decimeters)</option>
              <option value="MTRS">MTRS (Meters)</option>
              <option value="PCS">PCS (Pieces)</option>
              <option value="CONES">CONES (Thread Cones)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Supplier (Optional UUID or Reference)</label>
          <input
            type="text"
            placeholder="e.g. SUP-TANNERY-01"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </div>

        {spec && (
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] space-y-1 text-amber-900">
            <div className="font-bold flex items-center gap-1.5"><Layers className="w-3.5 h-3.5 text-amber-700" /> Category Spec Active</div>
            <p className="text-amber-800">Standard UOM: <span className="font-mono font-bold">{spec.uom || uom}</span> · Required fields: <span className="font-bold">{Array.isArray(spec.required_to_add) ? spec.required_to_add.join(', ') : 'article, on_hand'}</span></p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-warm-primary !min-h-0 !py-2.5 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Create Lot &amp; Mint Barcode</span>
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}

// ─── LIVE MATERIAL STOCK & SHORTFALL MODAL ────────────────────────────────────
function MaterialStockModal({ open, onClose, token, showToast, onOpenSupplierOrder }) {
  const [category, setCategory] = useState('LEATHER');
  const [subtype, setSubtype] = useState('');
  const [article, setArticle] = useState('');
  const [colour, setColour] = useState('');
  const [required, setRequired] = useState('');
  const [stockResult, setStockResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleCheckStock = async (e) => {
    if (e) e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const params = { category };
      if (subtype) params.subtype = subtype;
      if (article.trim()) params.article = article.trim();
      if (colour.trim()) params.colour = colour.trim();
      if (required) params.required = parseFloat(required);

      const res = await apiGetMaterialsStock(token, params);
      setStockResult(res);
    } catch (err) {
      setError(err?.message || 'Failed to fetch stock.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5" style={{ color: BRAND.accent }} />
          <h3 className="font-bold text-base" style={{ color: '#5a3518' }}>Material Stock &amp; Shortfall Calculator</h3>
        </div>
        <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
      </div>

      <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Stock equation: <span className="font-mono font-bold text-slate-800">Available = On Hand - Reserved</span>. Query live stock with shortfall computation (<code className="font-mono text-xs font-bold text-[#a86530]">GET /api/v1/materials/stock</code>).
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleCheckStock} className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-[#faf6f0] p-4 rounded-xl border border-[rgba(200,131,74,0.2)]">
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-600">Category</label>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls} style={fieldStyle}>
              <option value="LEATHER">LEATHER</option>
              <option value="LINING">LINING</option>
              <option value="ACCESSORIES">ACCESSORIES</option>
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-600">Article Filter</label>
            <input type="text" placeholder="e.g. GOAT SUEDE" value={article} onChange={(e) => setArticle(e.target.value)} className={inputCls} style={fieldStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-600">Colour</label>
            <input type="text" placeholder="e.g. BLACK" value={colour} onChange={(e) => setColour(e.target.value)} className={inputCls} style={fieldStyle} />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase mb-1 text-slate-600">Required Quantity</label>
            <input type="number" step="any" placeholder="e.g. 500" value={required} onChange={(e) => setRequired(e.target.value)} className={inputCls} style={fieldStyle} />
          </div>
          <div className="sm:col-span-2 flex justify-end">
            <button type="submit" disabled={loading} className="btn-warm-primary !min-h-0 !py-2 !px-4 text-xs">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Check Live Stock</span>
            </button>
          </div>
        </form>

        {stockResult && (
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <div className="text-[10px] font-bold text-slate-500 uppercase">On Hand</div>
                <div className="text-xl font-black text-slate-900 font-mono mt-0.5">{stockResult.on_hand ?? 0}</div>
                <div className="text-[9px] text-slate-400">Physically Present</div>
              </div>
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                <div className="text-[10px] font-bold text-amber-700 uppercase">Reserved</div>
                <div className="text-xl font-black text-amber-900 font-mono mt-0.5">{stockResult.reserved ?? 0}</div>
                <div className="text-[9px] text-amber-600">Committed</div>
              </div>
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                <div className="text-[10px] font-bold text-emerald-700 uppercase">Available</div>
                <div className="text-xl font-black text-emerald-900 font-mono mt-0.5">
                  {stockResult.available ?? (stockResult.on_hand - (stockResult.reserved || 0))}
                </div>
                <div className="text-[9px] text-emerald-600">Derived Read</div>
              </div>
            </div>

            {stockResult.short_by !== undefined && stockResult.short_by !== null && (
              <div className={`p-4 rounded-xl border flex items-center justify-between flex-wrap gap-3 ${
                stockResult.short_by > 0 ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}>
                <div>
                  <div className="text-xs font-extrabold flex items-center gap-1.5">
                    {stockResult.short_by > 0 ? <AlertTriangle className="w-4 h-4 text-rose-600" /> : <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                    <span>{stockResult.short_by > 0 ? `Shortfall of ${stockResult.short_by} units detected` : 'Sufficient stock available for requirement'}</span>
                  </div>
                  {stockResult.suggested_supplier && (
                    <div className="text-[11px] text-slate-600 mt-1">
                      Suggested Supplier: <strong className="text-slate-900">{stockResult.suggested_supplier.name || stockResult.suggested_supplier.id || JSON.stringify(stockResult.suggested_supplier)}</strong>
                    </div>
                  )}
                </div>
                {stockResult.short_by > 0 && (
                  <button
                    onClick={() => {
                      onOpenSupplierOrder?.({
                        category,
                        article,
                        colour,
                        qty: stockResult.short_by,
                        supplier_id: stockResult.suggested_supplier?.id,
                      });
                      onClose();
                    }}
                    className="btn-warm-primary !min-h-0 !py-2 !px-3 text-xs"
                  >
                    <Truck className="w-3.5 h-3.5" /> Order Shortfall ({stockResult.short_by})
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Close</button>
        </div>
      </div>
    </AnimatedModal>
  );
}

// ─── MATERIAL RECEIVING MODAL ────────────────────────────────────────────────
function MaterialReceiveModal({ open, onClose, lot, token, showToast, onSuccess }) {
  const [materialLotId, setMaterialLotId] = useState(lot?.lot_id || '');
  const [supplierOrderId, setSupplierOrderId] = useState('');
  const [approvedQty, setApprovedQty] = useState('');
  const [rejectedQty, setRejectedQty] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (lot) {
      setMaterialLotId(lot.lot_id || lot.pieceCode || '');
    }
  }, [lot]);

  const handleReceive = async (e) => {
    e.preventDefault();
    const appNum = parseFloat(approvedQty);
    if (isNaN(appNum) || appNum < 0) {
      setError('Approved quantity must be a non-negative number.');
      return;
    }
    const rejNum = rejectedQty ? parseFloat(rejectedQty) : 0;

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        material_lot_id: materialLotId,
        approved_qty: appNum,
        rejected_qty: rejNum,
      };
      if (supplierOrderId.trim()) payload.supplier_order_id = supplierOrderId.trim();

      const res = await apiReceiveMaterials(token, payload);
      showToast(`Material received successfully! Added ${appNum} to stock.`, 'success');
      onSuccess?.(res);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to record material receiving.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" style={{ color: BRAND.accent }} />
          <h3 className="font-bold text-base" style={{ color: '#5a3518' }}>Record Material Receiving</h3>
        </div>
        <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
      </div>

      <form onSubmit={handleReceive} className="p-6 space-y-4">
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Approved quantity is added to the lot; rejected quantity is logged for supplier quality tracking (<code className="font-mono text-xs font-bold text-[#a86530]">POST /api/v1/materials/receive</code>).
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Material Lot ID / Barcode *</label>
          <input
            type="text"
            value={materialLotId}
            onChange={(e) => setMaterialLotId(e.target.value)}
            placeholder="e.g. LOT-UUID or LOT-BARCODE"
            className={inputCls}
            style={fieldStyle}
            required
          />
        </div>

        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Supplier Order ID (Optional)</label>
          <input
            type="text"
            value={supplierOrderId}
            onChange={(e) => setSupplierOrderId(e.target.value)}
            placeholder="e.g. ORD-SUP-202608"
            className={inputCls}
            style={fieldStyle}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-emerald-800">Approved Qty (Stocked) *</label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 200"
              value={approvedQty}
              onChange={(e) => setApprovedQty(e.target.value)}
              className={inputCls}
              style={fieldStyle}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1 text-rose-800">Rejected Qty (Quality Log)</label>
            <input
              type="number"
              step="any"
              min="0"
              placeholder="e.g. 5"
              value={rejectedQty}
              onChange={(e) => setRejectedQty(e.target.value)}
              className={inputCls}
              style={fieldStyle}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-warm-primary !min-h-0 !py-2.5 disabled:opacity-50">
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>Record Receiving</span>
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}

// ─── MANUAL SUPPLIER ORDER MODAL ─────────────────────────────────────────────
function SupplierOrderModal({ open, onClose, initialData, token, showToast, onSuccess }) {
  const [category, setCategory] = useState(initialData?.category || 'LEATHER');
  const [article, setArticle] = useState(initialData?.article || '');
  const [colour, setColour] = useState(initialData?.colour || '');
  const [qty, setQty] = useState(initialData?.qty || '');
  const [uom, setUom] = useState(initialData?.uom || 'DCM');
  const [supplierId, setSupplierId] = useState(initialData?.supplier_id || '');
  const [submitting, setSubmitting] = useState(false);
  const [createdOrder, setCreatedOrder] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (initialData) {
      if (initialData.category) setCategory(initialData.category);
      if (initialData.article) setArticle(initialData.article);
      if (initialData.colour) setColour(initialData.colour);
      if (initialData.qty) setQty(initialData.qty);
      if (initialData.supplier_id) setSupplierId(initialData.supplier_id);
    }
  }, [initialData]);

  const handleCreateOrder = async (e) => {
    e.preventDefault();
    const qtyNum = parseFloat(qty);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Order quantity must be greater than 0.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      const payload = {
        category,
        article: article.trim(),
        qty: qtyNum,
        uom: uom || 'DCM',
      };
      if (colour.trim()) payload.colour = colour.trim();
      if (supplierId.trim()) payload.supplier_id = supplierId.trim();

      const res = await apiCreateSupplierOrder(token, payload);
      setCreatedOrder(res);
      showToast(`Supplier order raised! Status: ORDERED`, 'success');
      onSuccess?.(res);
    } catch (err) {
      setError(err?.message || 'Failed to raise supplier order.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkArrived = async (orderId) => {
    try {
      setSubmitting(true);
      const res = await apiPatchSupplierOrder(token, orderId, 'arrived');
      setCreatedOrder(res);
      showToast(`Order marked as ARRIVED at gate!`, 'success');
    } catch (err) {
      showToast(err?.message || 'Failed to mark as arrived.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center gap-2">
          <Truck className="w-5 h-5" style={{ color: BRAND.accent }} />
          <h3 className="font-bold text-base" style={{ color: '#5a3518' }}>Raise Supplier Order on Shortfall</h3>
        </div>
        <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
      </div>

      <div className="p-6 space-y-4">
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Raise a manual supplier order (<code className="font-mono text-xs font-bold text-[#a86530]">POST /api/v1/suppliers/orders</code>). State machine supports two states only: <strong className="text-amber-800">ORDERED &rarr; ARRIVED</strong>.
        </p>

        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {createdOrder ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-3 text-emerald-950">
            <div className="font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Supplier Order Active</span>
            </div>
            <div className="text-xs space-y-1 font-mono">
              <div>Order ID: <strong className="text-emerald-900">{createdOrder.id || createdOrder.order_id}</strong></div>
              <div>Status: <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black uppercase text-[10px]">{createdOrder.status || 'ORDERED'}</span></div>
              {createdOrder.arrived_at && <div>Arrived At: {new Date(createdOrder.arrived_at).toLocaleString()}</div>}
            </div>

            {createdOrder.status !== 'arrived' && (
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleMarkArrived(createdOrder.id || createdOrder.order_id)}
                className="btn-warm-primary !min-h-0 !py-2 !px-4 text-xs w-full mt-2"
              >
                <Truck className="w-3.5 h-3.5" /> Mark Order as ARRIVED (Goods at Gate)
              </button>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateOrder} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Category *</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectCls} style={fieldStyle}>
                  <option value="LEATHER">LEATHER</option>
                  <option value="LINING">LINING</option>
                  <option value="ACCESSORIES">ACCESSORIES</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Article *</label>
                <input type="text" placeholder="e.g. GOAT SUEDE" value={article} onChange={(e) => setArticle(e.target.value)} className={inputCls} style={fieldStyle} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Colour</label>
                <input type="text" placeholder="e.g. BLACK" value={colour} onChange={(e) => setColour(e.target.value)} className={inputCls} style={fieldStyle} />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Quantity *</label>
                <input type="number" step="any" min="0.01" placeholder="e.g. 500" value={qty} onChange={(e) => setQty(e.target.value)} className={inputCls} style={fieldStyle} required />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>UOM</label>
                <select value={uom} onChange={(e) => setUom(e.target.value)} className={selectCls} style={fieldStyle}>
                  <option value="DCM">DCM</option>
                  <option value="MTRS">MTRS</option>
                  <option value="PCS">PCS</option>
                  <option value="CONES">CONES</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>Supplier UUID / Name</label>
              <input type="text" placeholder="e.g. SUP-TANNERY-01" value={supplierId} onChange={(e) => setSupplierId(e.target.value)} className={inputCls} style={fieldStyle} />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button type="button" onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Cancel</button>
              <button type="submit" disabled={submitting} className="btn-warm-primary !min-h-0 !py-2.5 disabled:opacity-50">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Truck className="w-4 h-4" />}
                <span>Raise Supplier Order</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </AnimatedModal>
  );
}

// ─── MATERIAL LOTS: BATCH GENERATION TAB ──────────────────────────────────────
function MaterialGenerationTab({
  materials,
  materialsLoading,
  materialsError,
  onRetryMaterials,
  materialGenerated,
  onGenerateSelected,
  onGenerateAllRemaining,
  onSendToPrintCenter,
  onOpenDetail,
  onPrintSingle,
  token,
  showToast,
  onRefreshAll,
}) {
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [stockModalOpen, setStockModalOpen] = useState(false);
  const [receiveModalOpen, setReceiveModalOpen] = useState(false);
  const [receiveTargetLot, setReceiveTargetLot] = useState(null);
  const [supplierOrderModalOpen, setSupplierOrderModalOpen] = useState(false);
  const [supplierOrderInitialData, setSupplierOrderInitialData] = useState(null);

  const generatedCodes = useMemo(() => new Set(materialGenerated.map((r) => r.pieceCode || r.lotId)), [materialGenerated]);

  const filteredMaterials = useMemo(() => {
    let list = materials || [];
    if (categoryFilter !== 'ALL') {
      list = list.filter((m) => (m.category || '').toUpperCase() === categoryFilter.toUpperCase());
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((m) =>
        (m.article || '').toLowerCase().includes(q) ||
        (m.colour || '').toLowerCase().includes(q) ||
        (m.barcode || '').toLowerCase().includes(q) ||
        (m.lot_id || '').toLowerCase().includes(q) ||
        (m.supplier_name || m.supplier_id || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [materials, categoryFilter, search]);

  const stats = useMemo(() => {
    const list = materials || [];
    const leather = list.filter((m) => (m.category || '').toUpperCase() === 'LEATHER').length;
    const lining = list.filter((m) => (m.category || '').toUpperCase() === 'LINING').length;
    const acc = list.filter((m) => (m.category || '').toUpperCase().startsWith('ACCESSOR')).length;
    return { total: list.length, leather, lining, acc, generated: materialGenerated.length };
  }, [materials, materialGenerated]);

  const toggleSelect = (id) => setSelectedIds((prev) => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  const selectAllVisible = () => setSelectedIds((prev) => {
    const next = new Set(prev);
    filteredMaterials.forEach((m) => {
      const key = m.lot_id || m.barcode;
      if (key) next.add(key);
    });
    return next;
  });

  const clearSelection = () => setSelectedIds(new Set());

  const handleGenerateClick = () => {
    const chosen = (materials || []).filter((m) => selectedIds.has(m.lot_id || m.barcode));
    onGenerateSelected(chosen);
    setSelectedIds(new Set());
  };

  const handleOpenReceive = (lot) => {
    setReceiveTargetLot(lot);
    setReceiveModalOpen(true);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Overview Stat Cards */}
      <div className="rounded-2xl p-6 shadow-sm flex items-center gap-6 flex-wrap" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Total Material Lots</p><p className="font-bold text-lg" style={{ color: BRAND.text }}>{stats.total}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Leather Lots</p><p className="font-bold text-lg" style={{ color: BRAND.text }}>{stats.leather}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Lining Lots</p><p className="font-bold text-lg" style={{ color: BRAND.text }}>{stats.lining}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Accessories</p><p className="font-bold text-lg" style={{ color: BRAND.text }}>{stats.acc}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Queued / Generated</p><p className="font-bold text-lg" style={{ color: BRAND.accent }}>{stats.generated}</p></div>
        <div><p className="text-[0.68rem] font-bold uppercase" style={{ color: BRAND.textMuted }}>Selected</p><p className="font-bold text-lg" style={{ color: '#d97706' }}>{selectedIds.size}</p></div>
      </div>

      {/* Action Header & Tools */}
      <div className="rounded-2xl p-6 shadow-sm space-y-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2" style={{ color: BRAND.text }}>
              <Package className="w-5 h-5 text-[#c8834a]" /> Material Barcode &amp; Lot Operations
            </h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>
              Create material lots with child barcodes (<code className="font-mono text-xs font-bold text-[#a86530]">POST /materials/lots</code>), check live stock &amp; shortfalls, record receiving, and raise supplier orders.
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setCreateModalOpen(true)} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs shadow-md">
              <Plus className="w-4 h-4" /> Create Material Lot &amp; Barcode
            </button>
            <button onClick={() => setStockModalOpen(true)} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
              <Layers className="w-4 h-4" /> Check Stock &amp; Shortfall
            </button>
            <button onClick={() => { setReceiveTargetLot(null); setReceiveModalOpen(true); }} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
              <Truck className="w-4 h-4" /> Receive Material
            </button>
            <button onClick={() => { setSupplierOrderInitialData(null); setSupplierOrderModalOpen(true); }} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">
              <PackageSearch className="w-4 h-4" /> Raise Supplier Order
            </button>
          </div>
        </div>

        {/* Multi-Selection & Controls Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3 pt-2 border-t border-[rgba(200,131,74,0.15)]">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-[0.68rem] font-bold uppercase whitespace-nowrap" style={{ color: BRAND.textMuted }}>Category:</span>
              <select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} className={`${selectCls} !w-44`} style={fieldStyle}>
                <option value="ALL">All Categories</option>
                <option value="LEATHER">LEATHER</option>
                <option value="LINING">LINING</option>
                <option value="ACCESSORIES">ACCESSORIES</option>
              </select>
            </div>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
              <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search article, color, barcode..." className={`${inputCls} !pl-8 !w-60 !py-2`} style={fieldStyle} />
            </div>
          </div>

          <div className="flex gap-2 flex-wrap items-center">
            <button onClick={handleGenerateClick} disabled={selectedIds.size === 0} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs disabled:opacity-50">
              <Zap className="w-3.5 h-3.5" /> Queue Selected ({selectedIds.size})
            </button>
            <button onClick={onGenerateAllRemaining} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">Queue All</button>
            <button onClick={onSendToPrintCenter} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
              <Send className="w-3.5 h-3.5" /> Send All to Print Center
            </button>
            <button onClick={onRetryMaterials} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
              <RotateCcw className="w-3.5 h-3.5" /> Refresh
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <p className="text-xs" style={{ color: BRAND.textMuted }}>{filteredMaterials.length} material lot{filteredMaterials.length === 1 ? '' : 's'} found</p>
          <div className="flex gap-2">
            <button onClick={selectAllVisible} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Select All Visible</button>
            <button onClick={clearSelection} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Clear</button>
          </div>
        </div>

        {/* Material Lots Table List */}
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
          {materialsLoading ? (
            <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>Loading material lots from server…</div>
          ) : materialsError ? (
            <div className="text-center py-8 text-sm space-y-2" style={{ color: BRAND.textMuted }}>
              <p style={{ color: '#b91c1c' }}>{materialsError}</p>
              <button onClick={onRetryMaterials} className="btn-warm-secondary !min-h-0 !py-1.5 !px-3 text-xs">Retry</button>
            </div>
          ) : filteredMaterials.length === 0 ? (
            <div className="text-center py-8 text-sm" style={{ color: BRAND.textMuted }}>
              {materials && materials.length === 0 ? 'No material lots registered in database yet. Click "Create Material Lot & Barcode" above.' : 'No materials match your search/filter.'}
            </div>
          ) : (
            <div className="divide-y divide-[rgba(200,131,74,0.15)] max-h-96 overflow-y-auto">
              {filteredMaterials.map((lot) => {
                const uniqueKey = lot.lot_id || lot.barcode || `${lot.category}-${lot.article}`;
                const hasBarcode = !!lot.barcode;
                const isGenerated = generatedCodes.has(lot.barcode) || generatedCodes.has(lot.lot_id);
                const isChecked = selectedIds.has(uniqueKey);

                return (
                  <label
                    key={uniqueKey}
                    className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#fdfaf5] transition-colors"
                    style={{ background: isChecked ? '#faf3ea' : '#fff' }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(uniqueKey)}
                        className="w-4 h-4 accent-[#c8834a] cursor-pointer"
                      />
                      <div>
                        <div className="font-bold text-sm flex items-center gap-2" style={{ color: '#5a3518' }}>
                          <span>{lot.article || 'Unnamed Article'}</span>
                          {lot.colour && <span className="text-xs text-slate-600 font-semibold">({lot.colour})</span>}
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                            (lot.category || '').toUpperCase() === 'LEATHER' ? 'bg-amber-100 text-amber-900 border border-amber-200' :
                            (lot.category || '').toUpperCase() === 'LINING' ? 'bg-rose-100 text-rose-900 border border-rose-200' :
                            'bg-purple-100 text-purple-900 border border-purple-200'
                          }`}>
                            {lot.category}{lot.subtype ? ` · ${lot.subtype}` : ''}
                          </span>
                        </div>
                        <div className="text-xs font-mono mt-0.5 flex items-center gap-2 flex-wrap" style={{ color: BRAND.textMuted }}>
                          {hasBarcode ? (
                            <span>Barcode: <strong className="text-[#a86530] font-mono">{lot.barcode}</strong></span>
                          ) : (
                            <span className="text-red-600 font-sans">No barcode registered</span>
                          )}
                          <span>· Stock: <strong className="text-emerald-700 font-mono">{lot.on_hand ?? lot.available ?? 0} {lot.uom || ''}</strong></span>
                          {lot.reserved ? <span className="text-amber-700">(Reserved: {lot.reserved})</span> : null}
                          {lot.supplier_name && <span>· Supplier: <span className="text-slate-700 font-sans">{lot.supplier_name}</span></span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => handleOpenReceive(lot)}
                        className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-[11px]"
                        title="Receive more material into this lot"
                      >
                        <Truck className="w-3 h-3" /> Receive
                      </button>
                      <button
                        type="button"
                        onClick={() => onPrintSingle(lot.barcode || lot.lot_id)}
                        className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-[11px]"
                        title="Print single label"
                      >
                        <Printer className="w-3 h-3" /> Print
                      </button>
                      <span className={statusBadgeClass(isGenerated ? 'PRINTED' : 'PENDING')}>
                        {isGenerated ? 'Queued / Ready' : 'Unqueued'}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Generated Material Lot Barcodes Grid */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-3">
          <div>
            <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Material Barcodes &amp; Labels</h3>
            <p className="text-xs" style={{ color: BRAND.textMuted }}>Showing {materialGenerated.length} barcodes in queue</p>
          </div>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2" style={{ color: BRAND.textMuted }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter barcode/article..." className={`${inputCls} !pl-8 !w-52 !py-2`} style={fieldStyle} />
          </div>
        </div>

        {materialGenerated.length === 0 ? (
          <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
            <p className="font-bold" style={{ color: BRAND.textMuted }}>No material barcodes queued yet.</p>
            <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Select material lots above or click &quot;Create Material Lot &amp; Barcode&quot; to mint one.</p>
          </div>
        ) : (
          <motion.div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {materialGenerated.map((b) => (
              <motion.div
                key={b.pieceCode}
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: 'spring', stiffness: 320, damping: 22 }}
                onClick={() => onOpenDetail(b.pieceCode)}
                className="rounded-xl p-4 flex flex-col items-center gap-3 cursor-pointer"
                style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}
              >
                <div className="w-full bg-white rounded-lg p-2 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
                  <BarcodeCanvas code={b.pieceCode} displayWidth={200} />
                </div>
                <div className="text-center w-full">
                  <div className="font-mono font-bold text-xs break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
                  <div className="flex items-center justify-center gap-1.5 mt-1.5 flex-wrap">
                    <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.style}</span>
                    {b.color && <span className="text-[0.65rem] px-2 py-0.5 rounded font-semibold uppercase" style={{ background: BRAND.bg, color: BRAND.textMuted, border: '1px solid rgba(200,131,74,0.2)' }}>{b.color}</span>}
                    <span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span>
                  </div>
                  <div className="text-[10px] font-bold text-emerald-800 mt-1 font-mono">
                    Stock: {b.size}
                  </div>
                </div>
                <div className="flex gap-2 w-full" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1.5 text-xs">View</button>
                  <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1.5 text-xs">Print</button>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Modals */}
      <CreateMaterialLotModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        token={token}
        showToast={showToast}
        onSuccess={(res, payload) => {
          onRetryMaterials();
          if (res?.barcode) {
            onGenerateSelected([{ ...payload, barcode: res.barcode, lot_id: res.lot_id }]);
          }
        }}
      />

      <MaterialStockModal
        open={stockModalOpen}
        onClose={() => setStockModalOpen(false)}
        token={token}
        showToast={showToast}
        onOpenSupplierOrder={(data) => {
          setSupplierOrderInitialData(data);
          setSupplierOrderModalOpen(true);
        }}
      />

      <MaterialReceiveModal
        open={receiveModalOpen}
        onClose={() => setReceiveModalOpen(false)}
        lot={receiveTargetLot}
        token={token}
        showToast={showToast}
        onSuccess={() => onRetryMaterials()}
      />

      <SupplierOrderModal
        open={supplierOrderModalOpen}
        onClose={() => setSupplierOrderModalOpen(false)}
        initialData={supplierOrderInitialData}
        token={token}
        showToast={showToast}
        onSuccess={() => onRetryMaterials()}
      />
    </div>
  );
}


// ─── PRINT CENTER TAB (generic across categories) ──────────────────────────────
function PrintTab({
 generatedBarcodesStore, selectedPrintBarcodes,
 expandedOrders, onToggleOrderExpand, expandedGroups, onToggleExpand,
 onToggleGroup, onTogglePiece, onSelectAll, onClearAll, onOpenPreview, onPrintGroupDirect, onOpenDetail, onPrintSingle,
 onDownloadAll, bulkExporting = false,
 labels = CATEGORY_LABELS.style,
}) {
 const [downloadFormat, setDownloadFormat] = useState('png');
 const orderGroups = useMemo(() => {
 const orderMap = new Map();
 generatedBarcodesStore.forEach((b) => {
 if (!orderMap.has(b.orderId)) orderMap.set(b.orderId, { orderId: b.orderId, client: b.client, items: [], styleMap: new Map() });
 const og = orderMap.get(b.orderId);
 og.items.push(b);
 const sKey = `${b.orderId}__${b.style}`;
 if (!og.styleMap.has(sKey)) og.styleMap.set(sKey, { key: sKey, orderId: b.orderId, style: b.style, color: b.color, items: [] });
 og.styleMap.get(sKey).items.push(b);
 });
 return Array.from(orderMap.values()).map((og) => ({ ...og, styles: Array.from(og.styleMap.values()) }));
 }, [generatedBarcodesStore]);

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="rounded-2xl p-5 shadow-sm flex items-center justify-between flex-wrap gap-4" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div>
 <h3 className="text-base font-black" style={{ color: BRAND.text }}>Print Queue ({selectedPrintBarcodes.size} selected)</h3>
 <p className="text-xs" style={{ color: BRAND.textMuted }}>{labels.groupHint}</p>
 </div>
 <div className="flex gap-2 flex-wrap items-center">
 <button onClick={onSelectAll} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Select All</button>
 <button onClick={onClearAll} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs">Clear Selection</button>
 <button onClick={onOpenPreview} className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs"><Eye className="w-4 h-4" /> Preview</button>
 <ScreenSafeSelect
 value={downloadFormat}
 onChange={setDownloadFormat}
 className="h-[42px] px-3 rounded-lg text-xs font-bold outline-none border cursor-pointer !w-24"
 options={[
 { value: 'png', label: 'PNG' },
 { value: 'pdf', label: 'PDF' },
 ]}
 />
 <button
 onClick={() => onDownloadAll?.(downloadFormat)}
 disabled={bulkExporting || selectedPrintBarcodes.size === 0}
 className="btn-warm-secondary !min-h-0 !py-2.5 !px-4 text-xs disabled:opacity-50"
 >
 <Download className="w-4 h-4" /> {bulkExporting ? 'Preparing…' : `Download All (${selectedPrintBarcodes.size})`}
 </button>
 <button onClick={onOpenPreview} className="btn-warm-primary !min-h-0 !py-2.5 !px-4 text-xs"><Printer className="w-4 h-4" /> Print Selected</button>
 </div>
 </div>

 {orderGroups.length === 0 ? (
 <div className="text-center py-12 rounded-xl" style={{ background: '#fff', border: '1.5px dashed rgba(200,131,74,0.3)' }}>
 <p className="font-bold" style={{ color: BRAND.textMuted }}>No barcode batches in the print queue yet.</p>
 <p className="text-xs mt-1" style={{ color: BRAND.textMuted }}>Generate barcodes in Batch Generation first.</p>
 </div>
 ) : (
 <div className="flex flex-col gap-3">
 {orderGroups.map((og) => {
 const selectedCount = og.items.filter((i) => selectedPrintBarcodes.has(i.pieceCode)).length;
 const allSelected = selectedCount === og.items.length;
 const isPrintedAll = og.items.every((i) => i.printStatus === 'PRINTED');
 const expanded = expandedOrders.has(og.orderId);
 return (
 <div key={og.orderId} className="rounded-xl shadow-sm overflow-hidden" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer" onClick={() => onToggleOrderExpand(og.orderId)}>
 <div className="flex items-center gap-4">
 <input type="checkbox" checked={allSelected} onClick={(e) => e.stopPropagation()} onChange={(e) => onToggleGroup(og.items, e.target.checked)} className="w-4 h-4 accent-[#c8834a] cursor-pointer" />
 <div className="px-3 py-1.5 rounded-lg font-mono font-black text-sm text-white" style={{ background: '#3d2b1a' }}>{og.orderId}</div>
 <div>
 <div className="font-black text-sm" style={{ color: '#5a3518' }}>{og.client}</div>
 <div className="text-xs" style={{ color: BRAND.textMuted }}>{og.styles.length} {labels.subGroupNounPlural.toLowerCase()} • {og.items.length} barcodes</div>
 </div>
 </div>
 <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
 <span className={statusBadgeClass(isPrintedAll ? 'PRINTED' : 'PENDING')}>{isPrintedAll ? 'Printed' : 'Ready'}</span>
 <button onClick={() => onToggleOrderExpand(og.orderId)} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
 <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} /> View {labels.subGroupNounPlural} ({og.styles.length})
 </button>
 <button onClick={() => onPrintGroupDirect(og.items)} className="btn-warm-primary !min-h-0 !py-2 !px-3 text-xs"><Printer className="w-3.5 h-3.5" /> Print All</button>
 </div>
 </div>
 {expanded && (<div style={{ overflow: "hidden" }}>
 <div className="p-4 flex flex-col gap-3" style={{ background: BRAND.bg, borderTop: '1px solid rgba(200,131,74,0.15)' }}>
 {og.styles.map((g) => {
 const sSelectedCount = g.items.filter((i) => selectedPrintBarcodes.has(i.pieceCode)).length;
 const sAllSelected = sSelectedCount === g.items.length;
 const sPrintedAll = g.items.every((i) => i.printStatus === 'PRINTED');
 const sExpanded = expandedGroups.has(g.key);
 return (
 <div key={g.key} className="rounded-lg overflow-hidden" style={{ background: '#fff', border: '1.5px solid rgba(200,131,74,0.2)' }}>
 <div className="p-3 flex items-center justify-between flex-wrap gap-3">
 <div className="flex items-center gap-3">
 <input type="checkbox" checked={sAllSelected} onChange={(e) => onToggleGroup(g.items, e.target.checked)} className="w-4 h-4 accent-[#c8834a] cursor-pointer" />
 <div>
 <div className="font-bold text-sm" style={{ color: '#5a3518' }}>{g.style}{g.color ? ` — ${g.color}` : ''}</div>
 <div className="text-xs" style={{ color: BRAND.textMuted }}>{g.items.length} barcodes</div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={statusBadgeClass(sPrintedAll ? 'PRINTED' : 'PENDING')}>{sPrintedAll ? 'Printed' : 'Ready'}</span>
 <button onClick={() => onToggleExpand(g.key)} className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-xs">
 <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: sExpanded ? 'rotate(90deg)' : 'none' }} /> View ({g.items.length})
 </button>
 <button onClick={() => onPrintGroupDirect(g.items)} className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-xs"><Printer className="w-3.5 h-3.5" /> Print All</button>
 </div>
 </div>
 {sExpanded && (<div style={{ overflow: "hidden" }}>
 <div className="p-3 grid gap-3" style={{ background: '#fff', borderTop: '1px solid rgba(200,131,74,0.15)', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))' }}>
 {g.items.map((b) => {
 const checked = selectedPrintBarcodes.has(b.pieceCode);
 return (
 <div key={b.pieceCode} className="rounded-lg p-2.5 flex flex-col items-center gap-2 relative" style={{ background: checked ? '#faf3ea' : BRAND.bg, border: `1.5px solid ${checked ? BRAND.accent : 'rgba(200,131,74,0.2)'}` }}>
 <input type="checkbox" checked={checked} onChange={(e) => onTogglePiece(b.pieceCode, e.target.checked)} className="absolute top-2 left-2 w-3.5 h-3.5 accent-[#c8834a] cursor-pointer" />
 <div className="w-full bg-white rounded p-1.5 flex justify-center" style={{ border: '1px solid rgba(200,131,74,0.2)' }}>
 <BarcodeCanvas code={b.pieceCode} displayWidth={150} showText={false} />
 </div>
 <div className="text-center w-full">
 <div className="font-mono font-bold text-[0.65rem] break-all" style={{ color: '#5a3518' }}>{b.pieceCode}</div>
 <span className={`${statusBadgeClass(b.printStatus)} mt-1`}>{b.printStatus}</span>
 </div>
 <div className="flex gap-1 w-full">
 <button onClick={() => onOpenDetail(b.pieceCode)} className="flex-1 btn-warm-secondary !min-h-0 !py-1 !px-1 text-[0.65rem]">View</button>
 <button onClick={() => onPrintSingle(b.pieceCode)} className="flex-1 btn-warm-primary !min-h-0 !py-1 !px-1 text-[0.65rem]">Print</button>
 </div>
 </div>
 );
 })}
 </div>
 </div>)}
 </div>
 );
 })}
 </div>
 </div>)}
 </div>
 );
 })}
 </div>
 )}
 </div>
 );
}

// ─── BATCH HISTORY TAB (generic across categories) ─────────────────────────────
function HistoryTab({ batchHistoryStore, filters, setFilter, resetFilters, options, onView, onReprint, onExportCSV, expandedOrders, onToggleOrderExpand, labels = CATEGORY_LABELS.style }) {
 const filtered = useMemo(() => {
 let list = batchHistoryStore.filter((b) =>
 (filters.orderId === 'ALL' || b.orderId === filters.orderId) &&
 (filters.style === 'ALL' || b.style === filters.style) &&
 (filters.client === 'ALL' || b.client === filters.client) &&
 (filters.size === 'ALL' || b.size.includes(filters.size)) &&
 (filters.operator === 'ALL' || b.generatedBy === filters.operator) &&
 (filters.status === 'ALL' || b.printStatus === filters.status)
 );
 if (filters.sort === 'OLDEST') list = [...list].reverse();
 else if (filters.sort === 'QTY_HIGH') list = [...list].sort((a, b) => b.qty - a.qty);
 return list;
 }, [batchHistoryStore, filters]);

 const orderGroups = useMemo(() => {
 const map = new Map();
 filtered.forEach((b) => {
 if (!map.has(b.orderId)) map.set(b.orderId, { orderId: b.orderId, client: b.client, batches: [] });
 map.get(b.orderId).batches.push(b);
 });
 return Array.from(map.values());
 }, [filtered]);

 const FilterSelect = ({ label, field, opts }) => (
 <div>
 <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>{label}</label>
 <ScreenSafeSelect
 value={filters[field]}
 onChange={(v) => setFilter(field, v)}
 options={[{ value: 'ALL', label: `All ${label}` }, ...opts.map((o) => ({ value: o, label: o }))]}
 />
 </div>
 );

 return (
 <div className="space-y-6 animate-fade-in">
 <div className="rounded-2xl p-5 shadow-sm grid gap-4 items-end" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}`, gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
 <FilterSelect label={labels.orderIdLabel} field="orderId" opts={options.orderIds} />
 <FilterSelect label={labels.styleLabel} field="style" opts={options.styles} />
 <FilterSelect label={labels.clientLabel} field="client" opts={options.clients} />
 <FilterSelect label={labels.sizeLabel} field="size" opts={options.sizes} />
 <FilterSelect label="Operator" field="operator" opts={options.operators} />
 <div>
 <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Print Status</label>
 <ScreenSafeSelect
 value={filters.status}
 onChange={(v) => setFilter('status', v)}
 options={[
 { value: 'ALL', label: 'All Statuses' },
 { value: 'PRINTED', label: 'Printed' },
 { value: 'PENDING', label: 'Pending' },
 { value: 'PARTIAL', label: 'Partial' },
 ]}
 />
 </div>
 <div>
 <label className="block text-[0.7rem] font-bold uppercase tracking-wide mb-1.5" style={{ color: BRAND.textMuted }}>Sort By</label>
 <ScreenSafeSelect
 value={filters.sort}
 onChange={(v) => setFilter('sort', v)}
 options={[
 { value: 'NEWEST', label: 'Date (Newest First)' },
 { value: 'OLDEST', label: 'Date (Oldest First)' },
 { value: 'QTY_HIGH', label: 'Qty (High to Low)' },
 ]}
 />
 </div>
 <button onClick={resetFilters} className="btn-warm-secondary !min-h-0 !py-2.5"><RotateCcw className="w-4 h-4" /> Reset</button>
 </div>

 <div className="rounded-2xl p-5 shadow-sm" style={{ background: '#fff', border: `1.5px solid ${BRAND.border}` }}>
 <div className="flex items-center justify-between mb-4">
 <h3 className="text-base font-black" style={{ color: BRAND.text }}>Generated Barcode Batch Records</h3>
 <button onClick={onExportCSV} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs"><FileDown className="w-4 h-4" /> Export CSV</button>
 </div>

 {orderGroups.length === 0 ? (
 <div className="text-center py-8" style={{ color: BRAND.textMuted }}>No batch history records match the selected filters.</div>
 ) : (
 <div className="flex flex-col gap-3">
 {orderGroups.map((og) => {
 const totalQty = og.batches.reduce((sum, b) => sum + b.qty, 0);
 const statuses = new Set(og.batches.map((b) => b.printStatus));
 const groupStatus = statuses.size === 1 ? og.batches[0].printStatus : 'PARTIAL';
 const expanded = expandedOrders.has(og.orderId);
 return (
 <div key={og.orderId} className="rounded-xl overflow-hidden" style={{ border: `1.5px solid ${BRAND.border}` }}>
 <div
 className="p-4 flex items-center justify-between flex-wrap gap-3 cursor-pointer"
 style={{ background: BRAND.bg }}
 onClick={() => onToggleOrderExpand(og.orderId)}
 >
 <div className="flex items-center gap-4">
 <div className="px-3 py-1.5 rounded-lg font-mono font-black text-sm text-white" style={{ background: '#3d2b1a' }}>{og.orderId}</div>
 <div>
 <div className="font-black text-sm" style={{ color: '#5a3518' }}>{og.client}</div>
 <div className="text-xs" style={{ color: BRAND.textMuted }}>{og.batches.length} batches • {totalQty} pcs total</div>
 </div>
 </div>
 <div className="flex items-center gap-2">
 <span className={statusBadgeClass(groupStatus)}>{groupStatus}</span>
 <button onClick={(e) => { e.stopPropagation(); onToggleOrderExpand(og.orderId); }} className="btn-warm-secondary !min-h-0 !py-2 !px-3 text-xs">
 <ChevronRight className="w-3.5 h-3.5 transition-transform" style={{ transform: expanded ? 'rotate(90deg)' : 'none' }} /> View Batches ({og.batches.length})
 </button>
 </div>
 </div>
 {expanded && (<div style={{ overflow: "hidden" }}>
 <div className="overflow-x-auto">
 <table className="w-full text-sm">
 <thead>
 <tr style={{ background: '#fff' }}>
 {['Batch No', `${labels.styleLabel} & ${labels.colorLabel}`, labels.sizeLabel, 'Qty', 'Generated By', 'Created', 'Status', 'Actions'].map((h) => (
 <th key={h} className="text-left px-3 py-2.5 text-[0.7rem] font-bold uppercase tracking-wide" style={{ color: BRAND.textMuted, borderBottom: `1.5px solid ${BRAND.border}` }}>{h}</th>
 ))}
 </tr>
 </thead>
 <motion.tbody >
 {og.batches.map((b) => (
 <motion.tr key={b.batchNo} className="hover:bg-[#fdf6ee]">
 <td className="px-3 py-2.5 font-mono font-bold" style={{ color: '#5a3518', borderBottom: '1px solid #f0e8d7' }}>{b.batchNo}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.style}{b.color ? ` (${b.color})` : ''}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.size}</td>
 <td className="px-3 py-2.5 font-bold" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.qty} pcs</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.generatedBy}</td>
 <td className="px-3 py-2.5 text-xs" style={{ borderBottom: '1px solid #f0e8d7' }}>{b.createdDate}</td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}><span className={statusBadgeClass(b.printStatus)}>{b.printStatus}</span></td>
 <td className="px-3 py-2.5" style={{ borderBottom: '1px solid #f0e8d7' }}>
 <div className="flex gap-1.5">
 <button onClick={() => onView(b.orderId, b.style)} className="btn-warm-secondary !min-h-0 !py-1.5 !px-2.5 text-xs">View</button>
 <button onClick={() => onReprint(b)} className="btn-warm-primary !min-h-0 !py-1.5 !px-2.5 text-xs">Reprint</button>
 </div>
 </td>
 </motion.tr>
 ))}
 </motion.tbody>
 </table>
 </div>
 </div>)}
 </div>
 );
 })}
 </div>
 )}
 </div>
 </div>
 );
}

// ─── MODALS ─────────────────────────────────────────────────────────────────────
function DetailModal({ barcode, onClose, onPrint, labels = CATEGORY_LABELS.style, category = 'style' }) {
  const cardRef = useRef(null);
  const [exporting, setExporting] = useState(null); // 'png' | 'pdf' | null
  const isEmployee = category === 'employee';
  const isDrawer = category === 'bucket';

  const handleDownload = async (format) => {
    if (!cardRef.current || exporting || !barcode) return;
    setExporting(format);
    try {
      const canvas = await captureNodeToCanvas(cardRef.current);
      if (format === 'png') await saveCanvasAsPng(canvas, barcode.pieceCode);
      else await saveCanvasAsPdf(canvas, barcode.pieceCode);
    } finally {
      setExporting(null);
    }
  };

  return (
    <AnimatedModal
      isOpen={!!barcode}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      {barcode && (
        <>
          <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
            <h3 className="font-bold" style={{ color: '#5a3518' }}>Barcode Specification</h3>
            <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
          </div>

          <div className="p-5 grid gap-4 sm:grid-cols-[minmax(0,260px)_1fr] items-start flex-1 min-h-0 overflow-y-auto">
            <div className="flex justify-center sm:sticky sm:top-0">
              {isEmployee ? (
                <EmployeeTicketCard barcode={barcode} cardRef={cardRef} />
              ) : isDrawer ? (
                <DrawerBarcodeLabel barcode={barcode} cardRef={cardRef} />
              ) : (
                <BarcodeStickerLabel barcode={barcode} cardRef={cardRef} width={260} />
              )}
            </div>

            {!isEmployee && !isDrawer && (
              <div className="w-full min-w-0">
                <div className="text-xs font-black uppercase tracking-wider text-[#9a7a5a] mb-2 px-1">Lot & Specification Details</div>
                <IdCard barcode={barcode} labels={labels} showOnlyFields={true} />
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 px-6 py-4 flex-wrap shrink-0" style={{ background: BRAND.bg, borderTop: `1.5px solid ${BRAND.border}` }}>
            <button onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Close</button>
            <button onClick={() => handleDownload('png')} disabled={!!exporting} className="btn-warm-secondary !min-h-0 !py-2.5 disabled:opacity-60">
              <FileImage className="w-4 h-4" /> {exporting === 'png' ? 'Preparing…' : 'Download PNG'}
            </button>
            <button onClick={() => handleDownload('pdf')} disabled={!!exporting} className="btn-warm-secondary !min-h-0 !py-2.5 disabled:opacity-60">
              <FileText className="w-4 h-4" /> {exporting === 'pdf' ? 'Preparing…' : 'Download PDF'}
            </button>
            <button onClick={() => onPrint(barcode.pieceCode)} className="btn-warm-primary !min-h-0 !py-2.5"><Printer className="w-4 h-4" /> Print Label</button>
          </div>
        </>
      )}
    </AnimatedModal>
  );
}

function PrintPreviewModal({ open, codes, onClose, onConfirm }) {
 return (
 <AnimatedModal
 isOpen={open}
 onClose={onClose}
 zIndex={2000}
 panelClassName="rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden"
 panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
 >
 <div className="flex items-center justify-between px-6 py-4" style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}>
 <h3 className="font-bold" style={{ color: '#5a3518' }}>Thermal Sticker Print Preview ({codes.length})</h3>
 <button onClick={onClose}><X className="w-5 h-5" style={{ color: BRAND.textMuted }} /></button>
 </div>
 <div className="p-6 max-h-[480px] overflow-y-auto flex flex-wrap gap-3 justify-center" style={{ background: '#e5e5e5' }}>
 {codes.map((code) => (
 <div key={code} className="bg-white border border-dashed border-gray-500 rounded-md flex flex-col items-center justify-center overflow-hidden" style={{ width: 200, height: 100, padding: 10 }}>
 <BarcodeCanvas code={code} displayWidth={170} showText={false} />
 <div className="font-mono font-bold text-[0.65rem] mt-1">{code}</div>
 </div>
 ))}
 </div>
 <div className="flex justify-end gap-2 px-6 py-4" style={{ background: BRAND.bg, borderTop: `1.5px solid ${BRAND.border}` }}>
 <button onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">Cancel</button>
 <button onClick={onConfirm} className="btn-warm-primary !min-h-0 !py-2.5"><Printer className="w-4 h-4" /> Confirm &amp; Send to Printer</button>
 </div>
 </AnimatedModal>
 );
}

// ─── PAGE ROOT ──────────────────────────────────────────────────────────────────
export default function BarcodeManagementPage() {
 const [hasMounted, setHasMounted] = useState(false);

 useEffect(() => {
 setHasMounted(true);
 }, []);

 const { user, token } = useAuth();
 const operatorLabel = user ? user.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';

 const [category, setCategory] = useState('style');
 const [activeTab, setActiveTab] = useState('generation');

 // Style category is powered live by the /barcode registry — see
 // StyleRegistryPanel, which owns its own order/analytics/history state.

 // Employee category data — fully separate store
 const [employeeStore, setEmployeeStore] = useState(() => ({ generated: [], history: [] }));

 // Employee roster straight off GET /api/v1/employees — the source for every
 // department/designation pill and every badge this category generates.
 const [employeeDirectory, setEmployeeDirectory] = useState([]);
 const [employeesLoading, setEmployeesLoading] = useState(false);
 const [employeesError, setEmployeesError] = useState(null);
 const [employeesReloadKey, setEmployeesReloadKey] = useState(0);
 const reloadEmployees = useCallback(() => setEmployeesReloadKey((k) => k + 1), []);

 // Bucket / Drawer category data — fully separate store
 const [bucketStore, setBucketStore] = useState(() => ({ generated: [], history: [] }));

 // Material category data — fully separate store
 const [materialStore, setMaterialStore] = useState(() => ({ generated: [], history: [] }));
 const [materialDirectory, setMaterialDirectory] = useState([]);
 const [materialsLoading, setMaterialsLoading] = useState(false);
 const [materialsError, setMaterialsError] = useState(null);
 const [materialsReloadKey, setMaterialsReloadKey] = useState(0);
 const reloadMaterials = useCallback(() => setMaterialsReloadKey((k) => k + 1), []);

 // Live Drawer roster from GET /api/v1/drawers
 const [drawerDirectory, setDrawerDirectory] = useState([]);
 const [drawerTotal, setDrawerTotal] = useState(0);
 const [drawerLoading, setDrawerLoading] = useState(false);
 const [drawerError, setDrawerError] = useState(null);
 const [drawerReloadKey, setDrawerReloadKey] = useState(0);
 const [drawerStateFilter, setDrawerStateFilter] = useState('ALL');
 const [drawerSeqFrom, setDrawerSeqFrom] = useState('');
 const [drawerSeqTo, setDrawerSeqTo] = useState('');
 const reloadDrawers = useCallback(() => setDrawerReloadKey((k) => k + 1), []);

 // Per-category UI state (selection/expansion/filters never bleed across categories)
 const [printSelections, setPrintSelections] = useState(() => ({ style: new Set(), employee: new Set(), bucket: new Set(), material: new Set() }));
 const [expandedOrdersByCat, setExpandedOrdersByCat] = useState(() => ({ style: new Set(), employee: new Set(), bucket: new Set(), material: new Set() }));
 const [expandedGroupsByCat, setExpandedGroupsByCat] = useState(() => ({ style: new Set(), employee: new Set(), bucket: new Set(), material: new Set() }));
 const [expandedHistoryOrdersByCat, setExpandedHistoryOrdersByCat] = useState(() => ({ style: new Set(), employee: new Set(), bucket: new Set(), material: new Set() }));
 const [historyFiltersByCat, setHistoryFiltersByCat] = useState(() => ({
 style: { ...DEFAULT_HISTORY_FILTERS }, employee: { ...DEFAULT_HISTORY_FILTERS }, bucket: { ...DEFAULT_HISTORY_FILTERS }, material: { ...DEFAULT_HISTORY_FILTERS },
 }));

 const [detailCode, setDetailCode] = useState(null);
 const [previewOpen, setPreviewOpen] = useState(false);
 const [printSheetItems, setPrintSheetItems] = useState([]);
 const printSheetRef = useRef(null);

 // Bulk PNG/PDF export — renders the selected cards off-screen, captures them,
 // then tears the off-screen container down again.
 const [bulkExportItems, setBulkExportItems] = useState(null);
 const [bulkExporting, setBulkExporting] = useState(false);
 const bulkExportRef = useRef(null);

 const [toasts, setToasts] = useState([]);
 const showToast = useCallback((message, type = 'success') => {
 const id = `${Date.now()}-${Math.random()}`;
 setToasts((t) => [...t, { id, message, type }]);
 setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
 }, []);

 // ─── Derived: whichever category is active right now (style is live-fetched
 // by StyleRegistryPanel itself and never touches these local stores) ───
 const activeGenerated = category === 'employee' ? employeeStore.generated : category === 'bucket' ? bucketStore.generated : category === 'material' ? materialStore.generated : EMPTY_LIST;
 const activeHistory = category === 'employee' ? employeeStore.history : category === 'bucket' ? bucketStore.history : category === 'material' ? materialStore.history : EMPTY_LIST;
 const activeSelectedPrint = printSelections[category];
 const activeExpandedOrders = expandedOrdersByCat[category];
 const activeExpandedGroups = expandedGroupsByCat[category];
 const activeExpandedHistoryOrders = expandedHistoryOrdersByCat[category];
 const activeHistoryFilters = historyFiltersByCat[category];
 const activeLabels = CATEGORY_LABELS[category];

 const switchCategory = useCallback((cat) => {
 setCategory(cat);
 setActiveTab('generation');
 }, []);

 // ─── Live Drawer roster fetch: GET /api/v1/drawers ───
 // limit 500 on purpose: the endpoint's own default is 500 and a 200-drawer
 // pool has to come back in ONE page for "print all" to mean all of them.
 useEffect(() => {
 if (!hasMounted || category !== 'bucket' || !token) return;
 let cancelled = false;
 const timer = setTimeout(async () => {
 setDrawerLoading(true);
 setDrawerError(null);
 try {
 const params = { limit: 500 };
 if (drawerStateFilter !== 'ALL') params.state = drawerStateFilter;
 if (drawerSeqFrom) params.seq_from = parseInt(drawerSeqFrom, 10);
 if (drawerSeqTo) params.seq_to = parseInt(drawerSeqTo, 10);

 const res = await apiListDrawers(token, params);
 if (cancelled) return;
 if (res && Array.isArray(res.items)) {
 setDrawerDirectory(res.items);
 setDrawerTotal(res.total ?? res.items.length);
 } else if (Array.isArray(res)) {
 setDrawerDirectory(res);
 setDrawerTotal(res.length);
 } else {
 setDrawerDirectory([]);
 setDrawerTotal(0);
 }
 } catch (err) {
 if (cancelled) return;
 setDrawerDirectory([]);
 setDrawerError(err?.message || 'Failed to load drawers from server.');
 } finally {
 if (!cancelled) setDrawerLoading(false);
 }
 }, 100);
 return () => { cancelled = true; clearTimeout(timer); };
 }, [category, token, drawerReloadKey, drawerStateFilter, drawerSeqFrom, drawerSeqTo, hasMounted]);

 // ─── Live Material lots fetch: GET /api/v1/barcode/materials or /api/v1/materials/lots ───
 useEffect(() => {
 if (!hasMounted || category !== 'material' || !token) return;
 let cancelled = false;
 const timer = setTimeout(async () => {
 setMaterialsLoading(true);
 setMaterialsError(null);
 try {
 let res;
 try {
 res = await apiGetBarcodeMaterials(token, { active_only: false });
 } catch (e) {
 res = await apiGetMaterialLots(token);
 }
 if (cancelled) return;
 const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
 setMaterialDirectory(items);
 } catch (err) {
 if (cancelled) return;
 setMaterialDirectory([]);
 setMaterialsError(err?.message || 'Failed to load materials from server.');
 } finally {
 if (!cancelled) setMaterialsLoading(false);
 }
 }, 100);
 return () => { cancelled = true; clearTimeout(timer); };
 }, [category, token, materialsReloadKey, hasMounted]);

 // ─── Employee roster fetch: GET /api/v1/employees (active roster only) ───
 useEffect(() => {
 if (!hasMounted || category !== 'employee' || !token) return;
 let cancelled = false;
 const timer = setTimeout(async () => {
 setEmployeesLoading(true);
 setEmployeesError(null);
 try {
 const rows = await apiGetEmployees(token);
 if (cancelled) return;
 setEmployeeDirectory((Array.isArray(rows) ? rows : []).map(normalizeEmployee));
 } catch (err) {
 if (cancelled) return;
 setEmployeeDirectory([]);
 setEmployeesError(err?.message || 'Failed to load the employee roster.');
 } finally {
 if (!cancelled) setEmployeesLoading(false);
 }
 }, 100);
 return () => { cancelled = true; clearTimeout(timer); };
 }, [category, token, employeesReloadKey, hasMounted]);

 // ─── Print-side-effect: render the hidden sheet then trigger the browser print dialog ───
 useEffect(() => {
 if (printSheetItems.length === 0) return;
 const sheet = printSheetRef.current;
 if (sheet) sheet.style.display = 'block';
 const t = setTimeout(() => {
 window.print();
 if (sheet) sheet.style.display = 'none';
 setPrintSheetItems([]);
 }, 80);
 return () => clearTimeout(t);
 }, [printSheetItems]);

 // ─── EMPLOYEE generation handlers ───
 const generateEmployeeDept = useCallback((departmentName, employees) => {
 const alreadyGenIds = new Set(employeeStore.generated.filter((r) => r.client === departmentName).map((r) => r.size));
 const pending = employees.filter((e) => !alreadyGenIds.has(e.empId));
 if (pending.length === 0) { showToast(`${employees.length === 1 ? employees[0].name : 'These employees'} already ${employees.length === 1 ? 'has' : 'have'} a barcode!`, 'info'); return; }
 const batchId = `EMP-BATCH-${Date.now().toString().slice(-6)}`;
 const deptCode = departmentName.replace(/\s+/g, '_').toUpperCase();
 const newRecords = pending.map((emp, idx) => ({
 // empId is already the backend card code (EMP-000123) — don't re-prefix it.
 // The barcode itself only encodes the Employee ID, not the name — empId
 // is already unique per employee, so this stays a safe key/print target.
 pieceCode: emp.empId.startsWith('EMP-') ? emp.empId : `EMP-${emp.empId}`,
 orderId: deptCode, client: departmentName, style: emp.name, color: emp.designation, size: emp.empId,
 serial: idx + 1, serialStr: String(idx + 1).padStart(3, '0'), batchNo: batchId,
 createdDate: new Date().toLocaleString(), generatedBy: operatorLabel, printStatus: 'PENDING', printCount: 0,
 }));
 const historyEntry = { batchNo: batchId, orderId: deptCode, client: departmentName, style: pending.length === 1 ? pending[0].name : `${pending.length} Employees`, color: pending.length === 1 ? pending[0].designation : '', size: pending.length === 1 ? pending[0].empId : '—', qty: pending.length, generatedBy: operatorLabel, createdDate: new Date().toLocaleString(), printStatus: 'PENDING' };
 setEmployeeStore((prev) => ({ generated: [...prev.generated, ...newRecords], history: [historyEntry, ...prev.history] }));
 showToast(pending.length === 1 ? `Generated barcode for ${pending[0].name}!` : `Generated ${pending.length} employee ID barcodes for ${departmentName}!`, 'success');
 }, [employeeStore, showToast, operatorLabel]);

 const generateSelectedEmployees = useCallback((employees) => {
 if (employees.length === 0) { showToast('Check at least one employee to generate!', 'error'); return; }
 const byDept = new Map();
 employees.forEach((emp) => {
 if (!byDept.has(emp.department)) byDept.set(emp.department, []);
 byDept.get(emp.department).push(emp);
 });
 byDept.forEach((emps, dept) => generateEmployeeDept(dept, emps));
 }, [generateEmployeeDept, showToast]);

 const generateAllRemainingEmployees = useCallback(() => {
 if (employeeDirectory.length === 0) { showToast('No employees on the roster to generate barcodes for!', 'error'); return; }
 const deptMap = new Map();
 employeeDirectory.forEach((emp) => {
 if (!deptMap.has(emp.department)) deptMap.set(emp.department, []);
 deptMap.get(emp.department).push(emp);
 });
 let any = false;
 deptMap.forEach((employees, dept) => {
 const alreadyGenIds = new Set(employeeStore.generated.filter((r) => r.client === dept).map((r) => r.size));
 if (employees.some((e) => !alreadyGenIds.has(e.empId))) { generateEmployeeDept(dept, employees); any = true; }
 });
 if (!any) showToast('All employee ID barcodes have already been generated!', 'info');
 }, [employeeDirectory, employeeStore, generateEmployeeDept, showToast]);

 const sendEmployeesToPrintCenter = useCallback(() => {
 const codes = employeeStore.generated;
 if (codes.length === 0) { showToast('No employee barcodes available to send to Print Center!', 'error'); return; }
 setPrintSelections((prev) => { const next = new Set(prev.employee); codes.forEach((b) => next.add(b.pieceCode)); return { ...prev, employee: next }; });
 showToast(`Queued ${codes.length} employee barcodes to Print Center!`, 'success');
 setActiveTab('print');
 }, [employeeStore, showToast]);

 // ─── MATERIAL generation handlers ───
 const generateMaterialLots = useCallback((lots) => {
 const alreadyGenCodes = new Set(materialStore.generated.map((r) => r.pieceCode));
 const pending = lots.filter((l) => !alreadyGenCodes.has(l.barcode || l.lot_id));
 if (pending.length === 0) {
 showToast(`${lots.length === 1 ? 'This material lot' : 'These material lots'} already ${lots.length === 1 ? 'has' : 'have'} a barcode queued!`, 'info');
 return;
 }
 const batchId = `MAT-BATCH-${Date.now().toString().slice(-6)}`;
 const newRecords = pending.map((lot, idx) => ({
 pieceCode: lot.barcode || `LOT-${(lot.category || 'MAT').slice(0, 3)}-${String(lot.lot_id || idx + 1).slice(0, 8).toUpperCase()}`,
 orderId: lot.category || 'MATERIAL',
 client: `${lot.category || 'MATERIAL'}${lot.subtype ? ` / ${lot.subtype}` : ''}`,
 style: lot.article || 'Unnamed Article',
 color: lot.colour || '—',
 size: `${lot.on_hand ?? lot.available ?? 0} ${lot.uom || ''}`,
 serial: idx + 1,
 serialStr: String(idx + 1).padStart(3, '0'),
 batchNo: batchId,
 createdDate: new Date().toLocaleString(),
 generatedBy: operatorLabel,
 printStatus: 'PENDING',
 printCount: 0,
 lotId: lot.lot_id,
 thickness: lot.thickness || lot.size,
 onHand: lot.on_hand,
 available: lot.available,
 reserved: lot.reserved,
 uom: lot.uom,
 supplierName: lot.supplier_name || lot.supplier_id || '—',
 }));

 const historyEntry = {
 batchNo: batchId,
 orderId: pending[0].category || 'MATERIAL',
 client: pending[0].category || 'MATERIAL',
 style: pending.length === 1 ? pending[0].article : `${pending.length} Material Lots`,
 color: pending.length === 1 ? (pending[0].colour || '—') : '',
 size: pending.length === 1 ? `${pending[0].on_hand ?? 0} ${pending[0].uom || ''}` : '—',
 qty: pending.length,
 generatedBy: operatorLabel,
 createdDate: new Date().toLocaleString(),
 printStatus: 'PENDING',
 };

 setMaterialStore((prev) => ({
 generated: [...prev.generated, ...newRecords],
 history: [historyEntry, ...prev.history],
 }));

 showToast(pending.length === 1 ? `Generated barcode for Lot ${pending[0].barcode || pending[0].article}!` : `Generated ${pending.length} Material Lot barcodes!`, 'success');
 }, [materialStore, showToast, operatorLabel]);

 const generateAllRemainingMaterials = useCallback(() => {
 if (materialDirectory.length === 0) {
 showToast('No material lots available to generate barcodes for!', 'error');
 return;
 }
 generateMaterialLots(materialDirectory);
 }, [materialDirectory, generateMaterialLots, showToast]);

 const sendMaterialsToPrintCenter = useCallback(() => {
 if (materialStore.generated.length === 0) {
 showToast('No generated material barcodes to send to Print Center!', 'error');
 return;
 }
 const allCodes = new Set(materialStore.generated.map((b) => b.pieceCode));
 setPrintSelections((prev) => ({ ...prev, material: allCodes }));
 setActiveTab('print');
 showToast(`Loaded ${allCodes.size} material barcodes into Print Center!`, 'info');
 }, [materialStore.generated, showToast]);

 // ─── BUCKET / DRAWER generation handlers (live GET /api/v1/drawers) ───
 // Nothing is minted client-side here: `barcode` is the code the registry
 // already owns, and it is the only thing safe to encode. A drawer row with
 // barcode: null has no registry code — the roster still shows it, but it is
 // counted out of every print path instead of putting a blank label on paper.
 const buildDrawerRecords = useCallback((rows, batchId) => rows.map((drw) => {
 const seq = drw.seq ?? 0;
 const label = drw.code || `Drawer #${seq}`;
 return {
 pieceCode: drw.barcode,
 orderId: drw.state || 'unknown',
 client: label,
 style: label,
 color: drw.state || '',
 size: drw.drawer_id || '',
 serial: seq,
 serialStr: String(seq).padStart(4, '0'),
 batchNo: batchId,
 createdDate: new Date().toLocaleString(),
 generatedBy: operatorLabel,
 printStatus: 'PENDING',
 printCount: 0,
 };
 }), [operatorLabel]);

 const drawerBatchHistoryEntry = useCallback((batchId, records) => ({
 batchNo: batchId, orderId: 'DRAWERS', client: 'Drawer / Bucket Pool',
 style: records.length === 1 ? records[0].style : `${records.length} Drawers`,
 color: records.length === 1 ? records[0].color : '',
 size: records.length === 1 ? records[0].size : `${records.length} labels`,
 qty: records.length, generatedBy: operatorLabel,
 createdDate: new Date().toLocaleString(), printStatus: 'PENDING',
 }), [operatorLabel]);

 const generateDrawerLabels = useCallback((rows) => {
 if (!rows || rows.length === 0) { showToast('Check at least one drawer to generate!', 'error'); return; }
 const printable = rows.filter((d) => d.barcode);
 const skipped = rows.length - printable.length;
 const already = new Set(bucketStore.generated.map((r) => r.pieceCode));
 const pending = printable.filter((d) => !already.has(d.barcode));
 if (pending.length === 0) {
 showToast(printable.length === 0
 ? `${skipped} drawer${skipped === 1 ? ' has' : 's have'} no registry barcode — re-run gen_drawer_barcodes on the backend.`
 : 'Those drawers already have generated labels!', printable.length === 0 ? 'error' : 'info');
 return;
 }
 const batchId = `DRW-BATCH-${Date.now().toString().slice(-6)}`;
 const newRecords = buildDrawerRecords(pending, batchId);
 setBucketStore((prev) => ({
 generated: [...prev.generated, ...newRecords],
 history: [drawerBatchHistoryEntry(batchId, newRecords), ...prev.history],
 }));
 showToast(`Generated ${newRecords.length} drawer barcode label${newRecords.length === 1 ? '' : 's'}!`, 'success');
 if (skipped > 0) showToast(`${skipped} drawer${skipped === 1 ? '' : 's'} skipped — no registry barcode to encode.`, 'info');
 }, [bucketStore, buildDrawerRecords, drawerBatchHistoryEntry, showToast]);

 const generateAllRemainingDrawers = useCallback(() => {
 if (drawerDirectory.length === 0) { showToast('No drawers loaded from the server to generate labels for!', 'error'); return; }
 generateDrawerLabels(drawerDirectory);
 }, [drawerDirectory, generateDrawerLabels, showToast]);

 const sendDrawersToPrintCenter = useCallback(() => {
 const codes = bucketStore.generated;
 if (codes.length === 0) { showToast('Generate drawer labels first — nothing to send to Print Center!', 'error'); return; }
 setPrintSelections((prev) => { const next = new Set(prev.bucket); codes.forEach((b) => next.add(b.pieceCode)); return { ...prev, bucket: next }; });
 showToast(`Queued ${codes.length} drawer barcodes to Print Center!`, 'success');
 setActiveTab('print');
 }, [bucketStore, showToast]);

 // ─── Shared print/preview machinery (Employee/Bucket only — Style's live
 // registry has its own print flow via StyleRegistryPanel/POST /barcode/print) ───
 const markPrinted = useCallback((codes) => {
 if (category === 'employee') {
 setEmployeeStore((prev) => ({ ...prev, generated: prev.generated.map((b) => codes.includes(b.pieceCode) ? { ...b, printStatus: 'PRINTED', printCount: b.printCount + 1 } : b) }));
 } else if (category === 'bucket') {
 setBucketStore((prev) => ({ ...prev, generated: prev.generated.map((b) => codes.includes(b.pieceCode) ? { ...b, printStatus: 'PRINTED', printCount: b.printCount + 1 } : b) }));
 }
 }, [category]);

 const executeThermalPrint = useCallback((codes) => {
 if (!codes || codes.length === 0) { showToast('Please select barcodes to print!', 'error'); return; }
 const items = codes.map((c) => activeGenerated.find((b) => b.pieceCode === c)).filter(Boolean);
 markPrinted(codes);
 setPreviewOpen(false);
 showToast(`Sending ${items.length} ID card${items.length === 1 ? '' : 's'} to printer (4 per page)...`, 'success');
 setPrintSheetItems(items);
 }, [markPrinted, showToast, activeGenerated]);

 const handlePrintSingle = useCallback((pieceCode) => {
 executeThermalPrint([pieceCode]);
 }, [executeThermalPrint]);

 // ─── "Print every drawer label" — the whole 200-drawer sheet in one click ───
 // Deliberately does NOT route through executeThermalPrint: that one reads the
 // store, and drawers the operator has not generated yet are not in it. This
 // mints whatever is missing and prints the full roster in the same pass, so
 // the paper always matches what /api/v1/drawers just returned.
 const printAllDrawerLabels = useCallback(() => {
 const printable = (drawerDirectory || []).filter((d) => d.barcode);
 const skipped = (drawerDirectory || []).length - printable.length;
 if (printable.length === 0) {
 showToast(skipped > 0
 ? `None of the ${skipped} loaded drawers has a registry barcode yet — nothing can be printed.`
 : 'No drawers loaded from the server to print!', 'error');
 return;
 }
 const batchId = `DRW-BATCH-${Date.now().toString().slice(-6)}`;
 const existingByCode = new Map(bucketStore.generated.map((r) => [r.pieceCode, r]));
 const fresh = buildDrawerRecords(printable.filter((d) => !existingByCode.has(d.barcode)), batchId);
 const freshByCode = new Map(fresh.map((r) => [r.pieceCode, r]));
 const items = printable
 .map((d) => existingByCode.get(d.barcode) || freshByCode.get(d.barcode))
 .filter(Boolean);
 const printedCodes = new Set(items.map((r) => r.pieceCode));

 setBucketStore((prev) => ({
 generated: [...prev.generated, ...fresh].map((r) => printedCodes.has(r.pieceCode)
 ? { ...r, printStatus: 'PRINTED', printCount: r.printCount + 1 } : r),
 history: fresh.length > 0 ? [drawerBatchHistoryEntry(batchId, fresh), ...prev.history] : prev.history,
 }));
 setPrintSheetItems(items);
 showToast(`Printing all ${items.length} drawer labels (4 per page)...`, 'success');
 if (skipped > 0) showToast(`${skipped} drawer${skipped === 1 ? '' : 's'} skipped — no registry barcode to encode.`, 'info');
 }, [drawerDirectory, bucketStore, buildDrawerRecords, drawerBatchHistoryEntry, showToast]);

 // ─── Bulk PNG/PDF export ───
 const handleDownloadAll = useCallback(async (format) => {
 const codes = Array.from(activeSelectedPrint);
 if (codes.length === 0) { showToast('Please select barcodes to download!', 'error'); return; }
 const items = codes.map((c) => activeGenerated.find((b) => b.pieceCode === c)).filter(Boolean);
 if (items.length === 0) return;

 setBulkExporting(true);
 setBulkExportItems(items);
 // Let the off-screen cards mount and their barcode canvases paint before capturing.
 await new Promise((resolve) => setTimeout(resolve, 150));

 try {
 const container = bulkExportRef.current;
 if (!container) return;

 if (format === 'pdf') {
 const { default: jsPDF } = await import('jspdf');
 const pages = container.querySelectorAll('.export-page');
 const pdf = new jsPDF({ unit: 'px', format: 'a4' });
 const pageW = pdf.internal.pageSize.getWidth();
 for (let i = 0; i < pages.length; i++) {
 const canvas = await captureNodeToCanvas(pages[i]);
 if (i > 0) pdf.addPage();
 // Draw at the page's width but the image's own aspect ratio — a
 // trailing page with fewer cards (e.g. 1 instead of 4) is shorter
 // than a full page, and forcing it to the full page height (as
 // before) stretched that last row of cards taller than the rest.
 const imgH = pageW * (canvas.height / canvas.width);
 pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);
 }
 await savePdfBlob(pdf, `barcode-cards-${category}-${Date.now()}`);
 } else {
 const canvas = await captureNodeToCanvas(container);
 await saveCanvasAsPng(canvas, `barcode-cards-${category}-${Date.now()}`);
 }
 showToast(`Downloaded ${items.length} card${items.length === 1 ? '' : 's'} as ${format.toUpperCase()}!`, 'success');
 } catch (err) {
 showToast('Bulk download failed — please try again.', 'error');
 } finally {
 setBulkExportItems(null);
 setBulkExporting(false);
 }
 }, [activeSelectedPrint, activeGenerated, category, showToast]);

 const handleOpenPreview = useCallback(() => {
 if (activeSelectedPrint.size === 0) { showToast('Please select at least one barcode to preview/print!', 'error'); return; }
 setPreviewOpen(true);
 }, [activeSelectedPrint, showToast]);

 const handlePrintGroupDirect = useCallback((items) => {
 const codes = items.map((i) => i.pieceCode);
 setPrintSelections((prev) => { const next = new Set(prev[category]); codes.forEach((c) => next.add(c)); return { ...prev, [category]: next }; });
 setPreviewOpen(true);
 }, [category]);

 const handleExportCSV = useCallback((rows) => {
 const header = ['Batch No', 'Order ID', 'Client', 'Style', 'Color', 'Size', 'Qty', 'Generated By', 'Created Date', 'Print Status'];
 const csvRows = [header, ...rows.map((b) => [b.batchNo, b.orderId, b.client, b.style, b.color, b.size, b.qty, b.generatedBy, b.createdDate, b.printStatus])];
 const csv = csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
 const blob = new Blob([csv], { type: 'text/csv' });
 const url = URL.createObjectURL(blob);
 const link = document.createElement('a');
 link.href = url; link.download = `barcode-batch-history-${category}.csv`;
 document.body.appendChild(link); link.click(); document.body.removeChild(link);
 URL.revokeObjectURL(url);
 }, [category]);

 // ─── History filter helpers (per category) ───
 const setHistoryFilter = useCallback((field, value) => setHistoryFiltersByCat((prev) => ({ ...prev, [category]: { ...prev[category], [field]: value } })), [category]);
 const resetHistoryFilters = useCallback(() => setHistoryFiltersByCat((prev) => ({ ...prev, [category]: { ...DEFAULT_HISTORY_FILTERS } })), [category]);

 const toggleExpandedOrder = useCallback((id) => setExpandedOrdersByCat((prev) => { const s = new Set(prev[category]); s.has(id) ? s.delete(id) : s.add(id); return { ...prev, [category]: s }; }), [category]);
 const toggleExpandedGroup = useCallback((key) => setExpandedGroupsByCat((prev) => { const s = new Set(prev[category]); s.has(key) ? s.delete(key) : s.add(key); return { ...prev, [category]: s }; }), [category]);
 const toggleExpandedHistoryOrder = useCallback((id) => setExpandedHistoryOrdersByCat((prev) => { const s = new Set(prev[category]); s.has(id) ? s.delete(id) : s.add(id); return { ...prev, [category]: s }; }), [category]);

 const employeeHistoryOptions = useMemo(() => {
 const depts = Array.from(new Set(employeeDirectory.map((e) => e.department)));
 return {
 orderIds: depts.map((d) => d.replace(/\s+/g, '_').toUpperCase()),
 clients: depts,
 styles: Array.from(new Set(employeeDirectory.map((e) => e.name))),
 sizes: Array.from(new Set(employeeDirectory.map((e) => e.empId))),
 operators: Array.from(new Set(employeeStore.history.map((b) => b.generatedBy))),
 };
 }, [employeeDirectory, employeeStore.history]);
const bucketHistoryOptions = useMemo(() => ({
		orderIds: Array.from(new Set(bucketStore.history.map((b) => b.orderId))),
		clients: Array.from(new Set(bucketStore.history.map((b) => b.client))),
		styles: Array.from(new Set(bucketStore.history.map((b) => b.style))),
		sizes: Array.from(new Set(bucketStore.history.map((b) => b.size))),
		operators: Array.from(new Set(bucketStore.history.map((b) => b.generatedBy))),
	}), [bucketStore.history]);

  const materialHistoryOptions = useMemo(() => ({
    orderIds: Array.from(new Set(materialStore.history.map((b) => b.orderId))),
    clients: Array.from(new Set(materialStore.history.map((b) => b.client))),
    styles: Array.from(new Set(materialStore.history.map((b) => b.style))),
    sizes: Array.from(new Set(materialStore.history.map((b) => b.size))),
    operators: Array.from(new Set(materialStore.history.map((b) => b.generatedBy))),
  }), [materialStore.history]);

 const activeHistoryOptions = category === 'employee' ? employeeHistoryOptions : category === 'bucket' ? bucketHistoryOptions : category === 'material' ? materialHistoryOptions : [];

 const handleViewFromHistory = useCallback(() => {
 setActiveTab('generation');
 }, []);

 const handleReprintFromHistory = useCallback((b) => {
 setPrintSelections((prev) => { const next = new Set(activeGenerated.filter((x) => x.batchNo === b.batchNo).map((x) => x.pieceCode)); return { ...prev, [category]: next }; });
 setActiveTab('print');
 showToast(`Loaded batch ${b.batchNo} into Print Center!`, 'info');
 }, [activeGenerated, category, showToast]);

 const detailBarcode = detailCode ? activeGenerated.find((b) => b.pieceCode === detailCode) : null;

 const isBucketSheet = category === 'bucket';

 if (!hasMounted) {
 return (
 <div className="w-full py-20 flex items-center justify-center bg-[#faf6f0]">
 <div className="flex flex-col items-center text-[#c8834a] animate-pulse">
 <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c8834a] mb-2" />
 <span className="text-xs font-bold tracking-widest uppercase">Loading Barcode Management...</span>
 </div>
 </div>
 );
 }

 return (
 <div className="w-full space-y-6 pb-12" >
 <style jsx global>{`
 .btn-warm-primary {
 display: inline-flex; align-items: center; justify-content: center; gap: 8px;
 padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700;
 background: linear-gradient(135deg, #c8834a, #a86530); color: #fff; border: none;
 cursor: pointer; min-height: 48px; transition: all 0.2s ease;
 box-shadow: 0 2px 8px rgba(200,131,74,0.25);
 }
 .btn-warm-primary:hover { background: linear-gradient(135deg, #a86530, #854d22); box-shadow: 0 4px 16px rgba(200,131,74,0.35); transform: translateY(-1px); }
 .btn-warm-secondary {
 display: inline-flex; align-items: center; justify-content: center; gap: 8px;
 padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;
 background: #ffffff; color: #5a3518; border: 1.5px solid rgba(200,131,74,0.3);
 cursor: pointer; min-height: 48px; transition: all 0.2s ease;
 }
 .btn-warm-secondary:hover { background: #fdf6ee; border-color: #c8834a; }
 .bucket-label {
 width: 360px; height: 240px;
 box-sizing: border-box; background: #fff; border: 1px dashed #999;
 display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 4px;
 }
 .bucket-label canvas, .bucket-label svg { max-width: 95%; max-height: 95%; width: auto; height: auto; object-fit: contain; }
 @media print {
 /* 4mm margins so two 98mm labels fit across A4 (210mm) and Letter (215.9mm) */
 @page { size: A4 portrait; margin: 4mm; }
 /* #app-shell (the sidebar/header/dashboard content) is hidden with
 display:none, not visibility:hidden — visibility keeps an
 element's layout box (and its scroll-height) intact even while
 invisible, so the browser paginated the whole hidden dashboard into
 blank pages after the real label sheet. display:none removes it
 from the flow entirely, so only #thermalPrintSheet's own pages print. */
 #app-shell { display: none !important; }
 /* The toast stack is portaled straight to <body> (position: fixed),
 same as the print sheet, so hiding #app-shell alone doesn't touch it —
 without this it prints as a floating message box in the corner. */
 .toast-stack { display: none !important; }
 #thermalPrintSheet { display: block !important; position: static; width: 100%; margin: 0; padding: 0; background: #fff !important; }
 .print-page {
 display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
 gap: 8mm; width: 100%; height: 280mm; page-break-after: always; box-sizing: border-box;
 }
 .print-page:last-child { page-break-after: auto; }
 .print-page-barcodes {
 display: flex; flex-direction: column;
 gap: 3mm; width: 100%; page-break-after: always; box-sizing: border-box;
 }
 .print-page-barcodes:last-child { page-break-after: auto; }
 .print-page-barcodes .print-card { width: 100%; }
 /* Bucket labels: 2 across × 4 down = 8 exact 98×65.5mm labels per page.
 Total page height is 262mm, fitting reliably within A4 (289mm printable)
 and US Letter (271.4mm printable) without spilling to page 2. */
 .print-label-page {
 position: relative; width: 196mm; height: 262mm; max-height: 262mm;
 page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;
 box-sizing: border-box; overflow: hidden; margin: 0 auto;
 }
 .print-label-page:last-child { page-break-after: auto; break-after: auto; }
 .print-label-slot { position: absolute; width: 98mm; height: 65.5mm; box-sizing: border-box; }
 .print-label-page .bucket-label {
		width: 98mm;
		height: 65.5mm;
		border: 1px dashed #bbb;
		box-sizing: border-box;
		display: flex;
		align-items: center;
		justify-content: center;
		overflow: hidden;
		padding: 2mm;
	}
	.print-label-page .bucket-label canvas,
	.print-label-page .bucket-label svg {
		max-width: 92mm;
		max-height: 58mm;
		width: auto;
		height: auto;
		object-fit: contain;
		display: block;
	}
 .print-card {
 border: 1px dashed #999; border-radius: 6px; padding: 2mm; box-sizing: border-box;
 display: flex; flex-direction: column; align-items: center; justify-content: center;
 break-inside: avoid; overflow: hidden;
 }
 /* Capped only as a safety net for unusually long codes — at the
 sizing set on BarcodeCanvas below, the barcode renders at its
 true native resolution and never actually hits this cap, so the
 browser never has to downscale (blur) or upscale (pixelate) it.
 Trimmed from 20mm/3mm padding to make room for the Bug #19 spec
 line without changing the 8-per-page row math. */
 .print-card canvas { max-width: 94%; max-height: 16mm; }
 .print-card .card-code { font-family: monospace; font-weight: bold; font-size: 8pt; margin: 0.5mm 0; color: #000; }
 .print-card .card-spec { font-size: 6pt; line-height: 1.2; color: #444; text-align: center; max-width: 96%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
 .print-ticket-cell {
 display: flex; align-items: center; justify-content: center;
 break-inside: avoid; overflow: hidden;
 }
 .print-ticket-cell > div { width: 100% !important; max-width: 82mm; box-shadow: none !important; }
 }
 `}</style>

 <ToastStack toasts={toasts} />

 <motion.div className="flex items-start justify-between flex-wrap gap-4">
 <div>
 <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: BRAND.accent }}>Production · Piece-Level Traceability</p>
 <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: BRAND.text }}>
 <Barcode className="w-8 h-8" style={{ color: BRAND.accent }} /> Barcode Management
 </h1>
 <p className="font-medium mt-0.5" style={{ color: BRAND.textMuted }}>{CATEGORY_SUBTITLES[category]}</p>
 </div>
 <ResolveBarcodeWidget token={token} showToast={showToast} />
 </motion.div>

 {/* ─── Category slider: Style / Employee / Bucket — each keeps its own data, never merged ─── */}
 <motion.div className="flex items-center gap-1.5 p-1.5 rounded-2xl w-fit flex-wrap" style={{ background: '#fff', border: `1px solid ${BRAND.border}` }}>
 {CATEGORIES.map((c) => {
 const Icon = c.icon;
 const isActive = category === c.id;
 return (
 <button
 key={c.id}
 onClick={() => switchCategory(c.id)}
 className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
 style={{ color: isActive ? '#fff' : BRAND.textMuted }}
 >
 {isActive && (
 <motion.span
 layoutId="barcodeCategoryPill"
 className="absolute inset-0 rounded-xl"
 style={{ background: BRAND.accent, boxShadow: '0 4px 14px rgba(200,131,74,0.3)' }}
 transition={{ type: 'spring', stiffness: 450, damping: 32 }}
 />
 )}
 <Icon className="w-4 h-4 relative" /> <span className="relative">{c.label}</span>
 </button>
 );
 })}
 </motion.div>

 <motion.div className="flex items-center gap-1.5 p-1.5 rounded-2xl w-fit" style={{ background: '#fff', border: `1px solid ${BRAND.border}` }}>
 {TABS.map((t) => {
 const Icon = t.icon;
 const isActive = activeTab === t.id;
 return (
 <button
 key={t.id}
 onClick={() => setActiveTab(t.id)}
 className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
 style={{ color: isActive ? '#fff' : BRAND.textMuted }}
 >
 {isActive && (
 <motion.span
 layoutId="barcodeTabPill"
 className="absolute inset-0 rounded-xl"
 style={{ background: BRAND.darkGrad, boxShadow: '0 4px 14px rgba(61,43,26,0.25)' }}
 transition={{ type: 'spring', stiffness: 450, damping: 32 }}
 />
 )}
 <Icon className="w-4 h-4 relative" /> <span className="relative">{t.label}</span>
 </button>
 );
 })}
 </motion.div>

 {category === 'style' && (
 <StyleRegistryPanel activeTab={activeTab} token={token} showToast={showToast} setPrintSheetItems={setPrintSheetItems} />
 )}

 {category !== 'style' && (
 <div key={`${category}-${activeTab}`} >
 {activeTab === 'generation' && category === 'employee' && (
 <EmployeeGenerationTab
 employees={employeeDirectory}
 employeesLoading={employeesLoading}
 employeesError={token ? employeesError : 'Sign in to load the employee roster.'}
 onRetryEmployees={reloadEmployees}
 employeeGenerated={employeeStore.generated}
 onGenerateSelected={generateSelectedEmployees}
 onGenerateAllRemaining={generateAllRemainingEmployees}
 onSendToPrintCenter={sendEmployeesToPrintCenter}
 onOpenDetail={setDetailCode}
 onPrintSingle={handlePrintSingle}
 />
 )}

 {activeTab === 'generation' && category === 'bucket' && (
 <DrawerGenerationTab
 drawers={drawerDirectory}
 drawersLoading={drawerLoading}
 drawersError={token ? drawerError : 'Sign in to load the drawer pool.'}
 onRetryDrawers={reloadDrawers}
 drawerTotal={drawerTotal}
 drawerGenerated={bucketStore.generated}
 onGenerateSelected={generateDrawerLabels}
 onGenerateAllRemaining={generateAllRemainingDrawers}
 onPrintAll={printAllDrawerLabels}
 onSendToPrintCenter={sendDrawersToPrintCenter}
 onOpenDetail={setDetailCode}
 onPrintSingle={handlePrintSingle}
 stateFilter={drawerStateFilter}
 setStateFilter={setDrawerStateFilter}
 seqFrom={drawerSeqFrom}
 setSeqFrom={setDrawerSeqFrom}
 seqTo={drawerSeqTo}
 setSeqTo={setDrawerSeqTo}
 />
 )}

 {activeTab === 'generation' && category === 'material' && (
 <MaterialGenerationTab
 materials={materialDirectory}
 materialsLoading={materialsLoading}
 materialsError={token ? materialsError : 'Sign in to load material lots.'}
 onRetryMaterials={reloadMaterials}
 materialGenerated={materialStore.generated}
 onGenerateSelected={generateMaterialLots}
 onGenerateAllRemaining={generateAllRemainingMaterials}
 onSendToPrintCenter={sendMaterialsToPrintCenter}
 onOpenDetail={setDetailCode}
 onPrintSingle={handlePrintSingle}
 token={token}
 showToast={showToast}
 onRefreshAll={reloadMaterials}
 />
 )}

 {activeTab === 'print' && (
 <PrintTab
 generatedBarcodesStore={activeGenerated}
 selectedPrintBarcodes={activeSelectedPrint}
 expandedOrders={activeExpandedOrders}
 onToggleOrderExpand={toggleExpandedOrder}
 expandedGroups={activeExpandedGroups}
 onToggleExpand={toggleExpandedGroup}
 onToggleGroup={(items, checked) => setPrintSelections((prev) => { const next = new Set(prev[category]); items.forEach((i) => checked ? next.add(i.pieceCode) : next.delete(i.pieceCode)); return { ...prev, [category]: next }; })}
 onTogglePiece={(code, checked) => setPrintSelections((prev) => { const next = new Set(prev[category]); checked ? next.add(code) : next.delete(code); return { ...prev, [category]: next }; })}
 onSelectAll={() => setPrintSelections((prev) => ({ ...prev, [category]: new Set(activeGenerated.map((b) => b.pieceCode)) }))}
 onClearAll={() => setPrintSelections((prev) => ({ ...prev, [category]: new Set() }))}
 onOpenPreview={handleOpenPreview}
 onPrintGroupDirect={handlePrintGroupDirect}
 onOpenDetail={setDetailCode}
 onPrintSingle={handlePrintSingle}
 onDownloadAll={handleDownloadAll}
 bulkExporting={bulkExporting}
 labels={activeLabels}
 />
 )}

 {activeTab === 'history' && (
 <HistoryTab
 batchHistoryStore={activeHistory}
 filters={activeHistoryFilters}
 setFilter={setHistoryFilter}
 resetFilters={resetHistoryFilters}
 options={activeHistoryOptions}
 onView={handleViewFromHistory}
 onReprint={handleReprintFromHistory}
 onExportCSV={() => handleExportCSV(activeHistory)}
 expandedOrders={activeExpandedHistoryOrders}
 onToggleOrderExpand={toggleExpandedHistoryOrder}
 labels={activeLabels}
 />
 )}
 </div>
 )}

 <DetailModal barcode={detailBarcode} onClose={() => setDetailCode(null)} onPrint={handlePrintSingle} labels={activeLabels} category={category} />
 <PrintPreviewModal
 open={previewOpen}
 codes={Array.from(activeSelectedPrint)}
 onClose={() => setPreviewOpen(false)}
 onConfirm={() => executeThermalPrint(Array.from(activeSelectedPrint))}
 />

 {/* Print sheet — 4 employee ID cards per page, 8 style barcodes per
 page (1 column, full page width), or 8 bucket labels at 100×70mm.
 Portaled straight onto <body>, outside #app-shell, so the print
 media query can hard-hide the rest of the dashboard (sidebar, header,
 the drawer list, every other tab) with `display: none`. Hiding it
 the old way — `visibility: hidden` on the whole app — kept every
 hidden element's layout box intact, so the browser still paginated
 the app's full scroll height into blank pages after this sheet. */}
 {createPortal(
 <div id="thermalPrintSheet" ref={printSheetRef} style={{ display: 'none' }}>
 {isBucketSheet
 ? chunkArray(printSheetItems, BUCKET_LABELS_PER_PAGE).map((group, pageIdx) => (
 <div className="print-label-page" key={pageIdx}>
 {/* Every label gets a pre-computed absolute coordinate instead of
 flowing/wrapping — see .print-label-page comment below for why. */}
 {group.map((b, i) => (
 <div
 key={b.pieceCode}
 className="print-label-slot"
 style={{ left: `${(i % 2) * BUCKET_LABEL.widthMm}mm`, top: `${Math.floor(i / 2) * BUCKET_LABEL.heightMm}mm` }}
 >
 <DrawerBarcodeLabel barcode={b} />
 </div>
 ))}
 </div>
 ))
 : category === 'material'
 ? chunkArray(printSheetItems, 8).map((group, pageIdx) => (
 <div className="print-label-page" key={pageIdx}>
 {group.map((b, i) => (
 <div
 key={b.pieceCode}
 className="print-label-slot"
 style={{ left: `${(i % 2) * BUCKET_LABEL.widthMm}mm`, top: `${Math.floor(i / 2) * BUCKET_LABEL.heightMm}mm` }}
 >
 <div className="bucket-label flex flex-col items-center justify-center p-2 text-center">
 <BarcodeCanvas code={b.pieceCode} height={50} moduleWidth={1.8} margin={2} />
 <div className="text-[10px] font-black font-mono mt-1">{b.pieceCode}</div>
 <div className="text-[8px] font-bold text-slate-800">{b.client} · {b.style}</div>
 {b.color && <div className="text-[7px] text-slate-600">{b.color} · Qty: {b.size}</div>}
 </div>
 </div>
 ))}
 </div>
 ))
 : category === 'employee'
 ? chunkArray(printSheetItems, 4).map((group, pageIdx) => (
 <div className="print-page" key={pageIdx}>
 {group.map((b) => (
 <div className="print-ticket-cell" key={b.pieceCode}>
 <EmployeeTicketCard barcode={b} />
 </div>
 ))}
 </div>
 ))
 : chunkArray(printSheetItems, STYLE_LABELS_PER_PAGE).map((group, pageIdx) => (
 <div className="print-page-barcodes" key={pageIdx}>
 {group.map((b) => {
 // Bug #19: scan the small compact ID, not the ~30+ char piece code —
 // reference the same hash IdCard uses so the printed label and the
 // on-screen card always agree on one code per garment.
 const compactId = getCompactBarcodeId(b.pieceCode);
 const specLine = [b.orderId, b.article, b.style, b.color, b.size, b.serialStr]
 .filter((v) => v && v !== '—')
 .join(' · ');
 return (
 <div className="print-card" key={b.pieceCode}>
 <BarcodeCanvas code={compactId} height={42} moduleWidth={1.5} margin={8} showText={false} />
 <div className="card-code">{compactId}</div>
 {specLine && <div className="card-spec">{specLine}</div>}
 </div>
 );
 })}
 </div>
 ))}
 </div>,
 document.body
 )}

 {/* Off-screen renderer used only to capture the bulk PNG/PDF export */}
 {bulkExportItems && (
 <div style={{ position: 'fixed', top: 0, left: '-99999px', background: '#fff' }}>
 <div ref={bulkExportRef}>
 {chunkArray(bulkExportItems, 8).map((group, pageIdx) => (
 <div
 key={pageIdx}
 className="export-page"
 style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: 'repeat(4, auto)', gap: 16, width: isBucketSheet ? 828 : 794, minHeight: 1123, padding: 24, boxSizing: 'border-box', background: '#fff', alignContent: 'start' }}
 >
 {group.map((b) => (
 category === 'employee'
 ? <EmployeeTicketCard key={b.pieceCode} barcode={b} width={340} />
 : isBucketSheet
 ? <DrawerBarcodeLabel key={b.pieceCode} barcode={b} />
 : <BarcodeStickerLabel key={b.pieceCode} barcode={b} width={360} />
 ))}
 </div>
 ))}
 </div>
 </div>
 )}
 </div>
 );
}