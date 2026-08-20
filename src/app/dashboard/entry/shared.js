'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/context/AuthContext';
import { Camera, X, AlertTriangle } from 'lucide-react';

// Mobile camera barcode scanner — a shared modal used by all three doors
// (Barcode Gun's SKU/piece scan, Store Hub's drawer/piece scan, and the
// shared Worker Verify step). Each caller renders its own instance, gated by
// its own relevant `cameraScanTarget` value, since the onScan callback needs
// to reach into that caller's own local state — a single shared instance in
// page.js can't do that once the doors are split into separate components.
export function CameraScannerModal({ onClose, onScan, title = "Scan Barcode" }) {
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    let scanner;
    let isStopped = false;
    let started = false;

    // Mobile devices sometimes never resolve or reject scanner.start() at
    // all (camera driver hang, permission dialog dismissed without a clear
    // signal, etc.) — without a timeout the reader box just sits on its
    // bg-black placeholder forever with no error and no way to retry.
    const startTimeout = setTimeout(() => {
      if (started || isStopped) return;
      setCameraError("Camera didn't respond. Please try again or type the barcode manually.");
      if (scanner && scanner.isScanning) scanner.stop().catch(() => {});
    }, 7000);

    import('html5-qrcode').then(({ Html5Qrcode, Html5QrcodeSupportedFormats }) => {
      if (isStopped) return;

      scanner = new Html5Qrcode("entry-camera-reader");

      // Printed CODE128 SKU tags are thin, dense barcodes — without an explicit
      // resolution request the browser can hand back a low-res stream that
      // looks fine to the eye but is too blurry for the decoder to ever
      // resolve the bars, so the camera runs but nothing is ever detected.
      const buildConfig = (facingMode) => ({
        fps: 20,
        qrbox: (viewfinderWidth, viewfinderHeight) => ({
          width: Math.min(320, Math.floor(viewfinderWidth * 0.9)),
          height: Math.min(180, Math.floor(viewfinderHeight * 0.5))
        }),
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODABAR,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
          Html5QrcodeSupportedFormats.DATA_MATRIX,
        ],
        videoConstraints: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      const startScanner = (facingMode) => {
        return scanner.start(
          { facingMode },
          buildConfig(facingMode),
          (text) => {
            if (scanner && scanner.isScanning) {
              scanner.stop().then(() => {
                onScan(text);
                onClose();
              }).catch(() => {
                onScan(text);
                onClose();
              });
            } else {
              onScan(text);
              onClose();
            }
          },
          (err) => { }
        );
      };

      startScanner("environment").then(() => {
        started = true;
        clearTimeout(startTimeout);
      }).catch(() => {
        startScanner("user").then(() => {
          started = true;
          clearTimeout(startTimeout);
        }).catch((err) => {
          clearTimeout(startTimeout);
          console.warn("Camera start warning:", err);
          const msg = String(err?.message || err || '');
          if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
            setCameraError("Camera permission denied. Please click the lock icon 🔒 in browser address bar to allow camera access.");
          } else {
            setCameraError("Unable to start camera on this device. Please type barcode manually.");
          }
        });
      });
    }).catch(err => {
      clearTimeout(startTimeout);
      console.warn("Error loading html5-qrcode:", err);
      setCameraError("Camera scanner module failed to load.");
    });

    return () => {
      isStopped = true;
      clearTimeout(startTimeout);
      if (scanner && scanner.isScanning) {
        scanner.stop().catch(e => console.warn(e));
      }
    };
  }, [onScan, onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[999999] flex items-center justify-center bg-slate-900/85 backdrop-blur-md p-4 animate-fade-in">
      <div className="bg-white rounded-3xl p-5 max-w-sm w-full space-y-4 text-center relative shadow-2xl border-2 border-[#c8834a]">
        <div className="flex items-center justify-between border-b pb-3 border-slate-100">
          <h3 className="font-extrabold text-sm text-[#2d1f0e] flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#c8834a]" /> {title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {cameraError ? (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl space-y-3 animate-fade-in text-left">
            <div className="flex items-center gap-2 text-rose-700 font-extrabold text-xs uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              Camera Permission Blocked
            </div>
            <p className="text-xs font-semibold text-rose-900 leading-relaxed">
              {cameraError}
            </p>
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                window.location.reload();
              }}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm"
            >
              Retry Camera Permission
            </button>
          </div>
        ) : (
          <div id="entry-camera-reader" className="w-full h-64 rounded-2xl overflow-hidden border-2 border-[#c8834a]/30 bg-black shadow-inner" />
        )}

        <p className="text-xs text-slate-500 font-bold">
          Point camera at Barcode / QR Code
        </p>

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 bg-slate-100 text-slate-700 font-black text-xs rounded-xl hover:bg-slate-200 cursor-pointer"
        >
          Close Scanner
        </button>
      </div>
    </div>,
    document.body
  );
}

// Stage & Operation Synchronization State
export const manualStages = [
  'Cutting', 'Lining', 'Fusing', 'Pasting', 'Line Stitching', 'Shell Stitching', 'Final Finish', 'Final Inspection', 'Package Export'
];

// PREREQUISITE_MAP reflects the REAL live backend sequence (confirmed via
// GET /production/piece-state on a live piece) — Cutting -> Fusing -> Pasting
// (not Pasting -> Fusing as the written spec says) — the backend is the
// source of truth here since it's what actually accepts or rejects a log,
// not the doc.
export const PREREQUISITE_MAP = {
  'Cutting': [],
  'Lining': [], // Independent parallel stream
  'Fusing': ['Cutting'],
  'Pasting': ['Fusing'], // Requires Fusing to be completed first!
  'Line Stitching': ['Lining','Pasting', 'Store'], // Requires Pasting completed AND Store Transfer release
  'Shell Stitching': ['Line Stitching'],
  'Final Finish': ['Shell Stitching'],
  'Final Inspection': ['Final Finish'],
  'Package Export': ['Final Inspection']
};

// Bug #4 + #6 + #12: maps between this UI's stage names and the piece-detail
// API's SCREAMING_SNAKE_CASE stage identifiers, used to auto-detect a
// scanned piece's correct stage and read its backend-verified sequence state.
export const UI_TO_API_STAGE = {
  'Cutting': 'LEATHER_CUTTING',
  'Lining': 'LINING_CUTTING',
  'Pasting': 'PASTING',
  'Fusing': 'FUSING',
  'Line Stitching': 'LINE_STITCHING',
  'Shell Stitching': 'SHELL_STITCHING',
  'Final Finish': 'FINAL_FINISH',
  'Final Inspection': 'FINAL_INSPECTION',
  'Package Export': 'PACKAGE_EXPORT',
};
export const API_TO_UI_STAGE = Object.fromEntries(
  Object.entries(UI_TO_API_STAGE).map(([ui, api]) => [api, ui])
);

// Multi-stage roles (stitching_manager, DM/MD/supervisor) batch-process many
// pieces through one stage, then move on as a batch — BarcodeDoorSection's
// advanceToNextPipelineStage() walks this order after a successful submit.
export const PIPELINE_STAGE_ORDER = ['Cutting', 'Fusing', 'Pasting', 'Line Stitching', 'Shell Stitching', 'Final Finish', 'Final Inspection', 'Package Export'];

// GET /attendance/today normally returns the full day's roster as an array,
// but some responses come back as a single attendance record object instead
// (e.g. when the backend narrows the result to one employee) — without this,
// `Array.isArray(rosterData)` is false, the `.data`/`.items` fallbacks don't
// exist on a bare record either, and the caller silently gets an empty
// roster, so a worker who really is checked in still gets blocked by the
// "not checked-in" gate. Wrap a bare record (recognizable by employee_id) in
// an array so callers can `.find()` over it the same way either way.
export function normalizeRosterArray(rosterData) {
  if (Array.isArray(rosterData)) return rosterData;
  if (rosterData?.data && Array.isArray(rosterData.data)) return rosterData.data;
  if (rosterData?.items && Array.isArray(rosterData.items)) return rosterData.items;
  if (rosterData?.employee_id) return [rosterData];
  return [];
}

// Role/permission helpers — shared by all three sections (Barcode door,
// Manual door, Store Hub) plus page.js's own tab-switch and toast logic.
export function useRoleAccess() {
  const { user, ROLE_OPERATIONS } = useAuth();
  const allowedOperations = useMemo(() => ROLE_OPERATIONS[user] || [], [user, ROLE_OPERATIONS]);
  const isReadOnly = useMemo(() => allowedOperations.length === 0, [allowedOperations]);
  const isFullAccess = user === 'managing_director' || user === 'direct_manager' || user === 'supervisor';
  const isStoreAccess = user === 'managing_director' || user === 'direct_manager' || user === 'store_manager' || user === 'store_scan';
  // Stage permission helper — allow `lining_manager` explicitly for Lining
  const isStageAllowedForRole = useCallback((stage) => {
    if (isFullAccess) return true;
    if (!stage) return false;
    if (stage === 'Lining' && user === 'lining_manager') return true;
    return allowedOperations.includes(stage);
  }, [isFullAccess, allowedOperations, user]);

  return { allowedOperations, isReadOnly, isFullAccess, isStoreAccess, isStageAllowedForRole };
}