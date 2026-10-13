'use client';
import { useState, useRef } from "react";
import { normalizeRosterArray } from "../shared";

export function useWorkerVerification({
  workers = [],
  token,
  triggerBarcodeResolve,
  setBarcodeWorker,
  setErrorMsg,
  setSuccessMsg,
}) {
  const [barcodeWorkerInput, setBarcodeWorkerInput] = useState("");
  const [barcodeWorkerChecking, setBarcodeWorkerChecking] = useState(false);
  const [barcodeNotCheckedInModal, setBarcodeNotCheckedInModal] = useState(null);
  const workerInputRef = useRef(null);

  const handleVerifyBarcodeWorker = async (inputCode) => {
    const rawCode = typeof inputCode === "string" ? inputCode : barcodeWorkerInput;
    const query = (rawCode || "").trim();
    if (!query) return;

    setBarcodeWorkerChecking(true);
    setBarcodeNotCheckedInModal(null);
    setErrorMsg("");

    try {
      const queryLower = query.toLowerCase();
      let matchedWorker = workers.find(
        (w) =>
          String(w.id) === query ||
          String(w.employee_barcode || "").toLowerCase() === queryLower ||
          String(w.name || "").toLowerCase().includes(queryLower)
      );

      if (!matchedWorker) {
        try {
          const resolved = await triggerBarcodeResolve(query).unwrap();
          if (resolved?.type === "EMPLOYEE" && resolved.employee?.id) {
            const byId = workers.find(
              (w) => String(w.id) === String(resolved.employee.id)
            );
            matchedWorker = byId || {
              id: resolved.employee.id,
              name: resolved.employee.name || `Worker (${query})`,
              designation: resolved.employee.designation || "Production Worker",
              employee_barcode: resolved.code || query,
            };
          }
        } catch (resolveErr) {
          console.warn("Barcode resolve fallback warning:", resolveErr.message);
        }
      }

      const targetWorker = matchedWorker || {
        id: query,
        name: `Worker (${query})`,
        designation: "Production Worker",
        employee_barcode: query,
      };

      // Check Attendance Check-In Status
      try {
        const response = await fetch(
          `/api/v1/attendance/today?t=${Date.now()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const rosterData = await response.json();
        const rosterArray = normalizeRosterArray(rosterData);
        const workerRoster =
          rosterArray.find(
            (r) =>
              String(r.employee_id) === String(targetWorker.id) ||
              (r.employee_barcode &&
                String(r.employee_barcode).toLowerCase() === query.toLowerCase()) ||
              (r.barcode &&
                String(r.barcode).toLowerCase() === query.toLowerCase())
          ) || null;

        if (!workerRoster || workerRoster.check_out_at) {
          setBarcodeNotCheckedInModal({
            workerName: targetWorker.name,
            workerId: targetWorker.id,
            barcode: targetWorker.employee_barcode || query,
          });
          setBarcodeWorkerInput("");
          setBarcodeWorkerChecking(false);
          setTimeout(() => workerInputRef.current?.focus(), 100);
          return;
        }
      } catch (attErr) {
        console.warn("Attendance check fallback warning:", attErr);
      }

      setBarcodeWorker(targetWorker);
      setBarcodeWorkerInput("");
      if (setSuccessMsg) setSuccessMsg(`Worker verified: ${targetWorker.name}`);
    } catch (err) {
      setErrorMsg(err.message || "Failed to verify worker barcode");
    } finally {
      setBarcodeWorkerChecking(false);
    }
  };

  return {
    barcodeWorkerInput,
    setBarcodeWorkerInput,
    barcodeWorkerChecking,
    barcodeNotCheckedInModal,
    setBarcodeNotCheckedInModal,
    workerInputRef,
    handleVerifyBarcodeWorker,
  };
}
