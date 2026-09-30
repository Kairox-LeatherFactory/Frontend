'use client';
import { useState } from 'react';
import { TICKET } from '../../_lib/constants';
import BarcodeCanvas from '../BarcodeCanvas';

/**
 * ============================================================================
 * CompanyMark Sub-Component
 * ============================================================================
 * WHAT IT IS:
 * Company logo mark in the employee ticket header.
 * Falls back to an initials circle badge if the SVG image file fails to load.
 */
function CompanyMark({ size = 56 }) {
  const [failed, setFailed] = useState(false);

  // Fallback initials badge
  if (failed) {
    return (
      <div
        style={{
          width: size,
          height: size,
          flexShrink: 0,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255,255,255,0.12)',
          color: '#fff',
          fontSize: size * 0.36,
          fontWeight: 800,
          letterSpacing: '0.02em',
        }}
      >
        PT
      </div>
    );
  }

  // Official company logo image
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

/**
 * ============================================================================
 * TicketPerforation Sub-Component
 * ============================================================================
 * WHAT IT IS:
 * Receipt-style perforated tear line with side notch cutouts.
 */
function TicketPerforation() {
  return (
    <div style={{ position: 'relative', margin: '6px -24px 22px' }}>
      <div style={{ borderTop: `2px dashed ${TICKET.line}` }} />
      <div style={{ position: 'absolute', left: -12, top: -12, width: 24, height: 24, borderRadius: '50%', background: '#fff' }} />
      <div style={{ position: 'absolute', right: -12, top: -12, width: 24, height: 24, borderRadius: '50%', background: '#fff' }} />
    </div>
  );
}

/**
 * ============================================================================
 * TicketRow Sub-Component
 * ============================================================================
 * WHAT IT IS:
 * Key-value metadata row for Name, Employee ID, and Designation.
 */
function TicketRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-3" style={{ borderBottom: `1px solid ${TICKET.line}` }}>
      <span className="text-sm font-semibold uppercase tracking-wide" style={{ color: TICKET.gray }}>{label}</span>
      <span className="text-lg font-bold" style={{ color: TICKET.black }}>{value || '—'}</span>
    </div>
  );
}

/**
 * ============================================================================
 * EmployeeTicketCard Master Component
 * ============================================================================
 * WHAT IT IS:
 * Receipt-styled Employee ID badge ticket.
 *
 * WHY IT EXISTS:
 * Printed for factory floor workers as an authentic physical badge ticket
 * containing their photo/logo header, employee information, and scannable barcode.
 */
export default function EmployeeTicketCard({ barcode, cardRef, width }) {
  // Scale down typography for narrow/compact preview views
  const compact = (width || 440) < 400;

  return (
    <div
      ref={cardRef}
      className="overflow-hidden"
      style={{
        width: width || 440,
        maxWidth: '100%',
        background: '#ffffff',
        border: `1px solid ${TICKET.line}`,
        borderRadius: 0,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}
    >
      {/* --- Section 1: Black Header Banner with Company Logo --- */}
      <div className="px-6 py-4 flex items-center gap-3" style={{ background: TICKET.black }}>
        <CompanyMark size={compact ? 40 : 56} />
        <div className="flex-1 min-w-0">
          <span
            className={`font-serif font-normal uppercase whitespace-nowrap ${
              compact ? 'text-sm tracking-[0.04em]' : 'text-xl tracking-[0.15em]'
            }`}
            style={{ color: '#ffffff' }}
          >
            Pakkar Tanveer Exports
          </span>
          <div className="mt-1 text-right">
            <span
              className={`font-bold uppercase ${compact ? 'text-[9px] tracking-wide' : 'text-xs tracking-widest'}`}
              style={{ color: 'rgba(255,255,255,0.7)' }}
            >
              Employee ID
            </span>
          </div>
        </div>
      </div>

      {/* --- Section 2: Employee Details (Name, ID, Designation) --- */}
      <div className="px-7 pt-7">
        <TicketRow label="Name" value={barcode.style} />
        <TicketRow label="Employee ID" value={barcode.size} />
        <TicketRow label="Designation" value={barcode.color} />
      </div>

      {/* --- Section 3: Perforation Tear-Off Line --- */}
      <div className="px-7">
        <TicketPerforation />
      </div>

      {/* --- Section 4: Code-128 Employee Barcode Canvas --- */}
      <div className="px-7 pb-8 flex flex-col items-center">
        <BarcodeCanvas code={barcode.pieceCode} height={90} moduleWidth={3} />
      </div>
    </div>
  );
}
