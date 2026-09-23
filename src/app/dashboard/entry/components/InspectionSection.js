"use client";
import React, { useState, useMemo } from "react";
import {
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  User,
  RotateCcw,
  Check,
  X,
  Search,
  History,
  Layers,
  FileText,
  Loader2,
  Sparkles,
  ClipboardList,
  Camera
} from "lucide-react";
import {
  useCreateInspectionMutation,
  useGetInspectionsQuery,
  useLazyGetPieceStateQuery,
  useApproveInspectionMutation,
  useDeclineInspectionMutation,
  useGetPieceInspectionHistoryQuery,
  useGetWorkerResponsibilityQuery,
} from "@/store/slices/inspectionApiSlice";
import { useGetEmployeesQuery } from "@/store/slices/adminApiSlice";
import { useGetOperationsQuery } from "@/store/slices/clientApiSlice";
import { CameraScannerModal } from "../shared";

const PRODUCTION_STAGES = [
  "LEATHER_CUTTING",
  "LINING_CUTTING",
  "FUSING",
  "PASTING",
  "LINE_STITCHING",
  "SHELL_STITCHING",
  "FINAL_FINISH",
  "FINAL_INSPECTION",
  "PACKING"
];

export default function InspectionSection({ onGoBack }) {
  const [activeTab, setActiveTab] = useState("raise"); // "raise" | "dm-queue" | "history" | "responsibility"

  // --------------------------------------------------
  // 1. RAISE INSPECTION FORM STATE
  // --------------------------------------------------
  const [pieceBarcode, setPieceBarcode] = useState("");
  const [foundAtStage, setFoundAtStage] = useState(PRODUCTION_STAGES[0]);
  const [verdict, setVerdict] = useState("REJECT"); // "REJECT" (Pass removed)
  const [defectType, setDefectType] = useState("WORKMANSHIP"); // "WORKMANSHIP" | "PRODUCT_DAMAGE"
  const [action, setAction] = useState("REDO"); // "REDO" | "FIX"
  const [returnToStage, setReturnToStage] = useState(PRODUCTION_STAGES[0]);
  const [responsibleEmpId, setResponsibleEmpId] = useState("");
  const [responsibleEmpInput, setResponsibleEmpInput] = useState("");
  const [responsibleEmpObj, setResponsibleEmpObj] = useState(null);
  const [responsibleStage, setResponsibleStage] = useState(PRODUCTION_STAGES[0]);
  const [reason, setReason] = useState("");

  const [formSuccess, setFormSuccess] = useState("");
  const [formError, setFormError] = useState("");
  const [cameraScanTarget, setCameraScanTarget] = useState(null);

  // RTK Queries & Mutations for Raise Form
  const { data: employeesData } = useGetEmployeesQuery();
  const workers = Array.isArray(employeesData) ? employeesData : (employeesData?.items || []);
  const { data: operations = [], isLoading: isOperationsLoading } = useGetOperationsQuery();
  const [triggerGetPieceState, { data: pieceState, isLoading: isPieceStateLoading }] = useLazyGetPieceStateQuery();
  const [createInspection, { isLoading: isSubmitting }] = useCreateInspectionMutation();

  // Extract all stages list from piece state API or fallback
  const allStages = useMemo(() => {
    if (pieceState?.stages && Array.isArray(pieceState.stages) && pieceState.stages.length > 0) {
      return pieceState.stages.map((s) => (typeof s === "string" ? s : s.stage || s.name)).filter(Boolean);
    }
    if (pieceState?.completed_stages && Array.isArray(pieceState.completed_stages) && pieceState.completed_stages.length > 0) {
      return pieceState.completed_stages;
    }
    if (pieceState?.valid_stages && Array.isArray(pieceState.valid_stages) && pieceState.valid_stages.length > 0) {
      return pieceState.valid_stages;
    }
    return PRODUCTION_STAGES;
  }, [pieceState]);

  // Completed stages list from piece state API or fallback
  const completedStages = useMemo(() => {
    if (pieceState?.completed_stages && Array.isArray(pieceState.completed_stages) && pieceState.completed_stages.length > 0) {
      return pieceState.completed_stages;
    }
    if (pieceState?.stages && Array.isArray(pieceState.stages)) {
      const done = pieceState.stages
        .filter((s) => typeof s === "object" && (s.state === "completed" || s.state === "done"))
        .map((s) => s.stage || s.name)
        .filter(Boolean);
      if (done.length > 0) return done;
    }
    return allStages;
  }, [pieceState, allStages]);

  // Handle Piece Barcode Blur or Lookup
  const handleLookupPiece = async (barcode) => {
    if (!barcode.trim()) return;
    try {
      const res = await triggerGetPieceState(barcode.trim()).unwrap();
      const current = res?.current_stage || res?.display_stage || res?.next_stage;
      if (current) {
        setFoundAtStage(current);
      } else if (res?.completed_stages && res.completed_stages.length > 0) {
        setFoundAtStage(res.completed_stages[res.completed_stages.length - 1]);
      }

      if (res?.completed_stages && res.completed_stages.length > 0) {
        const lastDone = res.completed_stages[res.completed_stages.length - 1];
        setReturnToStage(lastDone);
        setResponsibleStage(lastDone);
      } else if (res?.stages && Array.isArray(res.stages)) {
        const doneList = res.stages
          .filter((s) => typeof s === "object" && (s.state === "completed" || s.state === "done"))
          .map((s) => s.stage || s.name)
          .filter(Boolean);
        if (doneList.length > 0) {
          const lastDone = doneList[doneList.length - 1];
          setReturnToStage(lastDone);
          setResponsibleStage(lastDone);
        }
      }
    } catch (err) {
      console.log("Piece state lookup fallback:", err);
    }
  };

  // Submit Raise Inspection
  const handleSubmitRaise = async (e) => {
    e.preventDefault();
    setFormSuccess("");
    setFormError("");

    if (!pieceBarcode.trim()) {
      setFormError("Please enter or scan a valid piece barcode.");
      return;
    }

    let payload = {
      piece_barcode: pieceBarcode.trim(),
      found_at_stage: foundAtStage,
      verdict: verdict,
    };

    if (verdict === "REJECT") {
      if (!reason.trim()) {
        setFormError("Reason is required for rejections.");
        return;
      }
      payload.action = action;
      payload.return_to_stage = returnToStage;
      payload.defect_type = defectType;
      payload.reason = reason.trim();

      // RULE ENFORCEMENT:
      // WORKMANSHIP -> REQUIRES responsible_employee_id + responsible_stage
      // PRODUCT_DAMAGE -> MUST HIDE & OMIT employee & responsible stage (API 422 if sent!)
      if (defectType === "WORKMANSHIP") {
        if (!responsibleEmpId) {
          setFormError("Workmanship defects require choosing the responsible worker.");
          return;
        }
        if (!responsibleStage) {
          setFormError("Workmanship defects require choosing the responsible stage.");
          return;
        }
        payload.responsible_employee_id = responsibleEmpId;
        payload.responsible_stage = responsibleStage;
      }
    }

    try {
      await createInspection(payload).unwrap();
      setFormSuccess(
        verdict === "PASS"
          ? `✅ Pass inspection recorded for piece ${pieceBarcode}.`
          : `🚨 Rejection raised! Sent to Direct Manager (DM) queue for approval.`
      );
      // Reset form
      setPieceBarcode("");
      setReason("");
      setResponsibleEmpId("");
    } catch (err) {
      setFormError(err.data?.detail || err.message || "Failed to submit inspection.");
    }
  };

  // --------------------------------------------------
  // 2. DM / MD DECISION QUEUE STATE
  // --------------------------------------------------
  const [queueFilter, setQueueFilter] = useState("PENDING");
  const { data: queueItems = [], isLoading: isQueueLoading } = useGetInspectionsQuery({ status: queueFilter });

  const [approveInspection, { isLoading: isApproving }] = useApproveInspectionMutation();
  const [declineInspection, { isLoading: isDeclining }] = useDeclineInspectionMutation();

  const [actionModalItem, setActionModalItem] = useState(null); // item object
  const [actionModalType, setActionModalType] = useState(null); // 'approve' | 'decline'
  const [actionNote, setActionNote] = useState("");
  const [actionError, setActionError] = useState("");

  const handleConfirmAction = async () => {
    if (!actionModalItem || !actionModalType) return;
    setActionError("");

    try {
      if (actionModalType === "approve") {
        await approveInspection({ id: actionModalItem.id || actionModalItem.inspection_id, note: actionNote }).unwrap();
      } else {
        await declineInspection({ id: actionModalItem.id || actionModalItem.inspection_id, note: actionNote }).unwrap();
      }
      setActionModalItem(null);
      setActionNote("");
    } catch (err) {
      setActionError(err.data?.detail || err.message || "Operation failed");
    }
  };

  // --------------------------------------------------
  // 3. GARMENT PIECE HISTORY STATE
  // --------------------------------------------------
  const [searchPieceCode, setSearchPieceCode] = useState("");
  const { data: pieceHistory = [], isLoading: isHistoryLoading } = useGetPieceInspectionHistoryQuery(
    searchPieceCode,
    { skip: !searchPieceCode }
  );

  // --------------------------------------------------
  // 4. WORKER RESPONSIBILITY STATS STATE
  // --------------------------------------------------
  const { data: responsibilityList = [], isLoading: isRespLoading } = useGetWorkerResponsibilityQuery("");

  return (
    <div className="w-full space-y-6">
      {/* SECTION HEADER & SUB-TABS */}
      <div className="bg-white border border-amber-900/10 rounded-2xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20 text-amber-700">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Quality Inspection</h2>
          </div>
        </div>

        {/* SUB TABS */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl self-start md:self-auto overflow-x-auto max-w-full">
          <button
            onClick={() => setActiveTab("raise")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "raise"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Raise Inspection
          </button>

          <button
            onClick={() => setActiveTab("dm-queue")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap relative ${activeTab === "dm-queue"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <ClipboardList className="w-3.5 h-3.5" />
            DM / MD Queue
            {queueItems.length > 0 && queueFilter === "PENDING" && (
              <span className="ml-1 px-1.5 py-0.5 bg-rose-500 text-white rounded-full text-[10px] font-black">
                {queueItems.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("responsibility")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "responsibility"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <User className="w-3.5 h-3.5" />
            Worker Responsibility
          </button>

          <button
            onClick={() => setActiveTab("history")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${activeTab === "history"
                ? "bg-white text-amber-800 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
              }`}
          >
            <History className="w-3.5 h-3.5" />
            Piece History
          </button>
        </div>
      </div>

      {/* ======================================================================== */}
      {/* TAB 1: RAISE INSPECTION FORM                                             */}
      {/* ======================================================================== */}
      {activeTab === "raise" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-600" />
              New Floor Inspection Record
            </h3>
          </div>

          {cameraScanTarget === "worker" && (
            <CameraScannerModal
              title="Scan Worker Barcode"
              onClose={() => setCameraScanTarget(null)}
              onScan={(scannedCode) => {
                const cleanCode = String(scannedCode || "")
                  .replace(/[\r\n]+/g, "")
                  .trim();
                if (!cleanCode) return;
                const q = cleanCode.toLowerCase();
                const worker = workers.find((w) => 
                  String(w.id || "").toLowerCase() === q || 
                  String(w.employee_id || "").toLowerCase() === q ||
                  String(w.employee_barcode || "").toLowerCase() === q
                );
                if (worker) {
                  setResponsibleEmpObj(worker);
                  setResponsibleEmpId(worker.id || worker.employee_id);
                  setFormError("");
                } else {
                  setFormError("Worker ID not found in active roster.");
                }
                setCameraScanTarget(null);
              }}
            />
          )}

          {cameraScanTarget === "piece" && (
            <CameraScannerModal
              title="Scan Piece Barcode"
              onClose={() => setCameraScanTarget(null)}
              onScan={(scannedCode) => {
                const cleanCode = String(scannedCode || "").replace(/[\r\n]+/g, "").trim();
                if (!cleanCode) return;
                setPieceBarcode(cleanCode);
                handleLookupPiece(cleanCode);
                setCameraScanTarget(null);
              }}
            />
          )}

          {formSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-sm font-bold flex items-center gap-3 animate-fade-in">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <span>{formSuccess}</span>
            </div>
          )}

          {formError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-sm font-bold flex items-center gap-3 animate-fade-in">
              <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <form onSubmit={handleSubmitRaise} className="space-y-6">
            {/* ROW 1: BARCODE & FOUND AT STAGE */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                  Piece Barcode <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="e.g. 2222-BF27P010501-SUEDE_BOMBER-NAVY-S-008"
                    value={pieceBarcode}
                    onChange={(e) => setPieceBarcode(e.target.value)}
                    onBlur={(e) => handleLookupPiece(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setCameraScanTarget("piece");
                    }}
                    className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-100 text-amber-700 rounded-lg"
                  >
                    <Camera className="w-5 h-5" />
                  </button>
                  {isPieceStateLoading && (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-600 absolute right-12 top-3" />
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-black uppercase text-slate-600 mb-1.5">
                  Found At Stage <span className="text-rose-500">*</span>
                </label>
                <select
                  value={foundAtStage}
                  onChange={(e) => setFoundAtStage(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all"
                >
                  {isOperationsLoading ? (
                    <option value="">Loading stages...</option>
                  ) : (
                    operations.map((op) => (
                      <option key={op.code} value={op.code}>
                        {op.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* REJECTION REWORK DETAILS SECTION */}
            <div className="bg-red-50/40 border border-red-200/80 rounded-2xl p-5 space-y-5 animate-fade-in">
              {/* DEFECT TYPE DROPDOWN (DYNAMIC FORM DRIVER) */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">
                    Defect Type <span className="text-red-600">*</span>
                  </label>
                  <select
                    value={defectType}
                    onChange={(e) => setDefectType(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white border border-red-300 rounded-xl text-xs font-black text-slate-900 focus:border-red-600 focus:ring-1 focus:ring-red-600 outline-none transition-all"
                  >
                    <option value="WORKMANSHIP">Workmanship</option>
                    <option value="PRODUCT_DAMAGE">Product Damage</option>
                  </select>
                </div>

                {/* DYNAMIC FORM 1: WORKMANSHIP (OPERATOR + STAGE) */}
                {defectType === "WORKMANSHIP" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-red-200 shadow-sm animate-fade-in">
                    <div className="space-y-3">
                      <label className="block text-xs font-black uppercase text-slate-700">
                        Responsible Employee <span className="text-red-600">*</span>
                      </label>
                      
                      {!responsibleEmpObj ? (
                        <div className="space-y-3">
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Scan or type Worker ID..."
                              value={responsibleEmpInput}
                              onChange={(e) => setResponsibleEmpInput(e.target.value)}
                              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 focus:bg-white focus:border-amber-500 outline-none transition-all pr-10"
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const query = responsibleEmpInput.trim();
                                  const cleanCode = query;
                                  const q = cleanCode.toLowerCase();
                                  const w = workers.find((w) => 
                                    String(w.id || "").toLowerCase() === q || 
                                    String(w.employee_id || "").toLowerCase() === q ||
                                    String(w.employee_barcode || "").toLowerCase() === q
                                  );
                                  if (w) {
                                    setResponsibleEmpObj(w);
                                    setResponsibleEmpId(w.id || w.employee_id);
                                    setFormError("");
                                  } else {
                                    setFormError("Worker ID not found in active roster.");
                                  }
                                }
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => setCameraScanTarget("worker")}
                              className="md:hidden absolute right-2 top-1/2 -translate-y-1/2 p-1.5 bg-amber-100 text-amber-700 rounded-lg"
                            >
                              <Camera className="w-5 h-5" />
                            </button>
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => {
                              const query = responsibleEmpInput.trim();
                              const q = query.toLowerCase();
                              const w = workers.find((w) => 
                                String(w.id) === query || 
                                String(w.employee_id || "").toLowerCase() === q ||
                                String(w.employee_barcode || "").toLowerCase() === q
                              );
                              if (w) {
                                setResponsibleEmpObj(w);
                                setResponsibleEmpId(w.id || w.employee_id);
                                setFormError("");
                              } else {
                                setFormError("Worker ID not found in active roster.");
                              }
                            }}
                            disabled={!responsibleEmpInput.trim()}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            <Check className="w-4 h-4" /> Verify Worker ID
                          </button>

                          <div className="flex flex-col gap-1.5 text-xs text-slate-500 font-medium pt-2">
                            <span>Or select active worker:</span>
                            <select
                              value={responsibleEmpId}
                              onChange={(e) => {
                                const w = workers.find(worker => (worker.id || worker.employee_id) === e.target.value);
                                if (w) {
                                  setResponsibleEmpObj(w);
                                  setResponsibleEmpId(w.id || w.employee_id);
                                }
                              }}
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-red-600 outline-none"
                            >
                              <option value="">-- Choose Operator --</option>
                              {workers.map((w) => (
                                <option key={w.id || w.employee_id} value={w.id || w.employee_id}>
                                  {w.name ? w.name.toUpperCase() : w.employee_id}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-3 animate-fade-in">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-amber-200 flex items-center justify-center text-amber-800 font-black text-lg shadow-sm">
                              {responsibleEmpObj.name ? responsibleEmpObj.name[0] : "W"}
                            </div>
                            <div>
                              <h4 className="text-sm font-black text-slate-800 leading-tight">
                                {responsibleEmpObj.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                ID: <strong className="font-mono">{responsibleEmpObj.employee_id || responsibleEmpObj.id}</strong>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setResponsibleEmpObj(null);
                              setResponsibleEmpId("");
                              setResponsibleEmpInput("");
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg shadow-sm transition-all shrink-0"
                          >
                            Change
                          </button>
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                        Responsible Stage <span className="text-red-600">*</span>
                      </label>
                      <select
                        value={responsibleStage}
                        onChange={(e) => setResponsibleStage(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:border-red-600 outline-none"
                        required={defectType === "WORKMANSHIP"}
                      >
                        {isOperationsLoading ? (
                          <option value="">Loading stages...</option>
                        ) : (
                          operations.map((op) => (
                            <option key={op.code} value={op.code}>
                              {op.label}
                            </option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                )}

                {/* DYNAMIC FORM 2: PRODUCT_DAMAGE (MATERIAL/HIDE FLAW - WORKER PICKER OMITTED TO PREVENT 422) */}

                {/* ACTION & RETURN TO STAGE */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1.5">Action</label>
                    <div className="flex items-center gap-4">
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="action"
                          value="REDO"
                          checked={action === "REDO"}
                          onChange={() => setAction("REDO")}
                          className="text-red-700 focus:ring-red-600"
                        />
                        REDO
                      </label>
                      <label className="flex items-center gap-2 text-xs font-bold text-slate-800 cursor-pointer">
                        <input
                          type="radio"
                          name="action"
                          value="FIX"
                          checked={action === "FIX"}
                          onChange={() => setAction("FIX")}
                          className="text-red-700 focus:ring-red-600"
                        />
                        FIX
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                      Return To Stage <span className="text-red-600">*</span>
                    </label>
                    <select
                      value={returnToStage}
                      onChange={(e) => setReturnToStage(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-800 focus:border-red-600 outline-none"
                    >
                      {completedStages.map((stg) => {
                        const label = operations.find(o => o.code === stg)?.label || stg;
                        return (
                          <option key={stg} value={stg}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>

                {/* REASON NOTE */}
                <div>
                  <label className="block text-xs font-black uppercase text-slate-700 mb-1">
                    Defect Reason & Notes <span className="text-red-600">*</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe specific defect..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:border-red-600 outline-none"
                    required
                  />
                </div>
              </div>

            {/* SUBMIT BUTTON */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-6 rounded-2xl font-black text-sm text-white shadow-xl transition-all cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 via-rose-700 to-red-800 hover:from-red-800 hover:to-red-900 shadow-red-900/30 border border-red-900/40"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Submitting...
                </>
              ) : (
                <>
                  <ShieldAlert className="w-5 h-5" /> Submit Rejection to DM Queue
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ======================================================================== */}
      {/* TAB 2: DM / MD DECISION QUEUE                                            */}
      {/* ======================================================================== */}
      {activeTab === "dm-queue" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
                <ClipboardList className="w-5 h-5 text-amber-600" />
                Approval Queue
              </h3>
            </div>

            {/* QUEUE STATUS FILTER */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
              {["PENDING", "APPROVED", "DECLINED", "ALL"].map((st) => (
                <button
                  key={st}
                  onClick={() => setQueueFilter(st === "ALL" ? "" : st)}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${(queueFilter === "" && st === "ALL") || queueFilter === st
                      ? "bg-white text-slate-800 shadow-sm"
                      : "text-slate-500 hover:text-slate-800"
                    }`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          {/* QUEUE LIST */}
          {isQueueLoading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <span className="text-xs font-bold">Loading inspection queue...</span>
            </div>
          ) : queueItems.length === 0 ? (
            <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl p-8">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-2" />
              <h4 className="text-sm font-black text-slate-700">No Pending Rejections</h4>
              <p className="text-xs text-slate-500">All quality inspection requests have been processed.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {queueItems.map((item) => {
                const itemId = item.id || item.inspection_id;
                const isWorkmanship = item.defect_type === "WORKMANSHIP";

                return (
                  <div
                    key={itemId}
                    className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-300 transition-all shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-black text-xs font-mono bg-slate-900 text-amber-400 px-2.5 py-1 rounded-md">
                          {item.piece_barcode}
                        </span>

                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase border ${isWorkmanship
                              ? "bg-rose-50 text-rose-700 border-rose-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                            }`}
                        >
                          {item.defect_type || "WORKMANSHIP"}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full">
                          Stage: {item.found_at_stage}
                        </span>

                        <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded-full">
                          Action: {item.action} → {item.return_to_stage}
                        </span>
                      </div>

                      <p className="text-xs font-bold text-slate-800">
                        Reason: <span className="text-slate-600 font-medium">{item.reason || "N/A"}</span>
                      </p>

                      {isWorkmanship && item.responsible_employee_id && (
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 font-semibold">
                          <User className="w-3.5 h-3.5 text-rose-500" />
                          <span>Responsible Worker ID: <strong className="text-slate-800">{item.responsible_employee_id}</strong></span>
                          <span>(Stage: {item.responsible_stage})</span>
                        </div>
                      )}
                    </div>

                    {/* ACTION BUTTONS (Only for PENDING status) */}
                    {(item.status === "PENDING" || !item.status) && (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setActionModalItem(item);
                            setActionModalType("approve");
                            setActionNote("Solved / Approved for rework");
                          }}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" /> Approve (DM)
                        </button>

                        <button
                          onClick={() => {
                            setActionModalItem(item);
                            setActionModalType("decline");
                            setActionNote("Declined / Proceed as is");
                          }}
                          className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
                        >
                          <X className="w-4 h-4" /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* TAB 3: WORKER RESPONSIBILITY STATS                                      */}
      {/* ======================================================================== */}
      {activeTab === "responsibility" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <User className="w-5 h-5 text-amber-600" />
              Worker Responsibility
            </h3>
          </div>

          {isRespLoading ? (
            <div className="py-12 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600 mx-auto" />
            </div>
          ) : responsibilityList.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-xs font-semibold">
              No worker responsibility defect records found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-black uppercase text-slate-600">
                    <th className="p-3">Worker Name / ID</th>
                    <th className="p-3">Stage</th>
                    <th className="p-3 text-center">Total Rejections</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-800">
                  {responsibilityList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-3 font-mono">{row.employee || row.employee_id}</td>
                      <td className="p-3">{row.stage}</td>
                      <td className="p-3 text-center">
                        <span className="px-2.5 py-1 bg-rose-100 text-rose-800 rounded-full font-black">
                          {row.rejections}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* TAB 4: GARMENT PIECE HISTORY                                             */}
      {/* ======================================================================== */}
      {activeTab === "history" && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              <History className="w-5 h-5 text-amber-600" />
              Piece History
            </h3>
          </div>

          <div className="flex gap-3 max-w-xl">
            <input
              type="text"
              placeholder="Enter Piece Barcode (e.g. PC-2234)"
              value={searchPieceCode}
              onChange={(e) => setSearchPieceCode(e.target.value)}
              className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-800 outline-none focus:border-amber-500"
            />
          </div>

          {isHistoryLoading ? (
            <div className="py-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-amber-600 mx-auto" />
            </div>
          ) : pieceHistory.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-semibold">
              {searchPieceCode ? "No inspection history found for this piece code." : "Type a piece barcode above to view timeline."}
            </div>
          ) : (
            <div className="space-y-3">
              {pieceHistory.map((hist, idx) => (
                <div key={idx} className="p-4 border border-slate-200 rounded-xl bg-slate-50 flex items-start gap-4">
                  <div className={`p-2 rounded-lg text-white ${hist.verdict === 'PASS' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
                    {hist.verdict === 'PASS' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <h4 className="font-black text-xs text-slate-800">
                      Verdict: {hist.verdict} at Stage {hist.found_at_stage}
                    </h4>
                    {hist.reason && <p className="text-xs text-slate-600 mt-1">Reason: {hist.reason}</p>}
                    {hist.status && <p className="text-[11px] text-slate-500 font-semibold mt-0.5">Status: {hist.status}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================================== */}
      {/* APPROVE / DECLINE NOTE MODAL                                            */}
      {/* ======================================================================== */}
      {actionModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-fade-in border border-amber-900/10">
            <h3 className="text-base font-black text-slate-800 flex items-center gap-2">
              {actionModalType === "approve" ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  Approve Rejection (DM)
                </>
              ) : (
                <>
                  <XCircle className="w-5 h-5 text-rose-600" />
                  Decline Rejection
                </>
              )}
            </h3>

            <p className="text-xs text-slate-600 font-medium">
              Piece: <strong className="font-mono text-slate-900">{actionModalItem.piece_barcode}</strong>
            </p>

            {actionError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold">
                {actionError}
              </div>
            )}

            <div>
              <label className="block text-xs font-black uppercase text-slate-600 mb-1">
                Optional Decision Note
              </label>
              <textarea
                rows={3}
                placeholder="Enter note (e.g. Solved / Re-stitching approved / Declined)..."
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActionModalItem(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmAction}
                disabled={isApproving || isDeclining}
                className={`px-5 py-2 rounded-xl text-xs font-black text-white shadow-lg transition-all cursor-pointer flex items-center gap-2 ${actionModalType === "approve"
                    ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20"
                    : "bg-rose-600 hover:bg-rose-700 shadow-rose-600/20"
                  }`}
              >
                {(isApproving || isDeclining) && <Loader2 className="w-4 h-4 animate-spin" />}
                Confirm {actionModalType === "approve" ? "Approve" : "Decline"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
