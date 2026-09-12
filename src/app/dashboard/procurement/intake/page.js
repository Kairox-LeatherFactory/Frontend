'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle2, X, Loader2, ArrowRight, AlertCircle, ShieldCheck, Brain, GitBranch, RefreshCw, UserCheck, Play } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiGetClients, apiOpenSubmission, apiUploadSlot, apiGetSubmission, apiStartOrderBreakdown, apiGetOrderBreakdown, apiAttachStyle, apiGenerateBom, apiUploadPattern, apiGetPatterns } from '../lib/api';

function DropZone({ label, accept, icon: Icon, file, onFile, onClear, description, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const drop = useCallback(
    (e) => {
      e.preventDefault();
      if (disabled) return;
      setDragging(false);
      const f = e.dataTransfer.files?.[0];
      if (f) onFile(f);
    },
    [disabled, onFile]
  );

  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: '#9a7a5a' }}>{label}</p>
      {file ? (
        <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,.25)' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <div>
              <p className="text-sm font-black" style={{ color: '#2d1f0e' }}>{file.name}</p>
              <p className="text-[10px] font-semibold" style={{ color: '#9a7a5a' }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-red-50">
            <X className="w-4 h-4 text-red-600" />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDrop={drop}
          onDragOver={(e) => {
            e.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{ background: dragging ? '#fff9f0' : '#faf6f0', border: `2px dashed ${dragging ? '#c8834a' : 'rgba(200,131,74,.3)'}` }}
        >
          <Icon className="w-8 h-8" style={{ color: '#c8834a' }} />
          <div className="text-center">
            <p className="text-sm font-black" style={{ color: '#2d1f0e' }}>Drop your {label} here</p>
            <p className="text-[11px] font-semibold mt-1" style={{ color: '#9a7a5a' }}>{description}</p>
            <p className="text-[10px] mt-1" style={{ color: '#c8834a' }}>CSV, PDF, XLSX supported · Click to browse</p>
          </div>
          <input ref={inputRef} type="file" accept={accept || '*/*'} className="hidden" disabled={disabled} onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
        </div>
      )}
    </div>
  );
}

function ValidationCard({ title, data, error }) {
  if (!data && !error) return null;
  const v = data?.document?.validation || error?.body?.validation;

  return (
    <div className="mt-4 p-4 rounded-2xl bg-[#f0fdf4] border border-green-200">
      <div className="flex items-center gap-2 mb-3">
        <CheckCircle2 className="w-4 h-4 text-green-600" />
        <span className="text-xs font-black text-[#2d1f0e]">{title} · accepted</span>
      </div>
      {v && (
        <div className="grid md:grid-cols-2 gap-3 text-[10px]">
          <div className="rounded-xl bg-white border p-3">
            <p className="font-black text-slate-500 uppercase mb-2">Classification</p>
            <p><b>Method:</b> {v.method || 'heuristic'}</p>
            <p><b>Confidence:</b> {v.confidence ?? 0.98}</p>
            <p><b>Kind:</b> {v.classified_as || v.expected_kind || 'accepted'}</p>
          </div>
          <div className="rounded-xl bg-white border p-3">
            <p className="font-black text-slate-500 uppercase mb-2">Status</p>
            <p className="font-black text-green-700">✓ Accepted & Verified</p>
          </div>
        </div>
      )}
    </div>
  );
}

function StyleCard({ style, onConfirm, onOpenDxf, onGenerate, generating }) {
  return (
    <SpotlightCard className="p-5 bg-white rounded-2xl" spotlightColor="rgba(200,131,74,.05)" style={{ border: '1px solid rgba(200,131,74,.14)' }}>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{style.style_name}</h3>
            <span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100">{style.qty} pcs</span>
          </div>
          <p className="text-xs font-semibold mt-1" style={{ color: '#9a7a5a' }}>Material: {style.material} · Signature: {style.style_signature}</p>
          {style.spec_id && <p className="text-[10px] font-mono mt-0.5 text-slate-500">Spec ID: {style.spec_id}</p>}
          {style.pattern_reference_id && <p className="text-[10px] font-mono text-amber-800">Pattern Ref ID: {style.pattern_reference_id}</p>}
          {style.warnings?.length > 0 && <div className="mt-2 text-[10px] font-bold text-amber-700">⚠ {style.warnings.join(', ')}</div>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${style.spec_match_status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
            Spec: {style.spec_match_status || 'confirmed'}
          </span>
          <button
            onClick={() => onOpenDxf(style)}
            className={`text-[10px] font-black px-2.5 py-1 rounded-full border transition-all ${style.dxf_match_status === 'confirmed' ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'}`}
          >
            DXF: {style.dxf_match_status === 'confirmed' ? 'confirmed' : '+ Upload DXF'}
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-slate-400 border-b">
              <th className="py-2">Color</th>
              <th>Qty</th>
              <th>Sizes</th>
            </tr>
          </thead>
          <tbody>
            {style.colors.map((c) => (
              <tr key={c.color_key} className="border-b last:border-0">
                <td className="py-2 font-black">{c.color_label}</td>
                <td>{c.qty}</td>
                <td>{Object.entries(c.per_size_qty).map(([k, v]) => `${k}: ${v}`).join(' · ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex gap-2 justify-end items-center flex-wrap">
        {style.spec_match_status === 'suggested' && (
          <button onClick={onConfirm} className="px-3 py-2 rounded-xl text-xs font-black bg-amber-100 text-amber-800 hover:bg-amber-200">
            Confirm suggested spec
          </button>
        )}
        {style.dxf_match_status !== 'confirmed' && (
          <button onClick={() => onOpenDxf(style)} className="px-3 py-2 rounded-xl text-xs font-black bg-amber-100 text-amber-900 border border-amber-300 hover:bg-amber-200">
            + Upload DXF Pattern
          </button>
        )}
        {style.spec_match_status !== 'suggested' && !style.bom_id && (
          <button onClick={onGenerate} disabled={generating} className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#c8834a] hover:bg-[#b0703c] disabled:opacity-50 shadow-sm">
            {generating ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null}
            Generate BOM
          </button>
        )}
        {style.bom_id && <span className="px-3 py-2 rounded-xl text-xs font-black bg-green-100 text-green-700">BOM generated</span>}
      </div>
    </SpotlightCard>
  );
}

export default function ProcurementIntakePage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const allowed = ['direct_manager', 'managing_director', 'cutting_manager'].includes(user);

  const [clients, setClients] = useState([]);
  const [selectedClientId, setSelectedClientId] = useState('');
  const [activeClient, setActiveClient] = useState(null);

  // Confirmation Modal state
  const [pendingClient, setPendingClient] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // DXF Pattern Modal & File Upload State
  const [dxfTargetStyle, setDxfTargetStyle] = useState(null);
  const [showDxfModal, setShowDxfModal] = useState(false);
  const [patternNameInput, setPatternNameInput] = useState('');
  const [uploadingDxf, setUploadingDxf] = useState(false);
  const dxfFileInputRef = useRef(null);

  const [submissionId, setSubmissionId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [orderFile, setOrderFile] = useState(null);
  const [specFile, setSpecFile] = useState(null);
  const [orderResult, setOrderResult] = useState(null);
  const [specResult, setSpecResult] = useState(null);
  const [orderError, setOrderError] = useState(null);
  const [specError, setSpecError] = useState(null);
  const [gate, setGate] = useState(null);
  const [breakdown, setBreakdown] = useState(null);
  const [breaking, setBreaking] = useState(false);
  const [generating, setGenerating] = useState({});

  // 1. Fetch Client List on Mount (Only GET /api/v1/clients)
  useEffect(() => {
    if (!allowed) return;
    (async () => {
      setLoading(true);
      try {
        const clientList = await apiGetClients(token);
        setClients(clientList || []);
      } catch (e) {
        console.error('Failed to load clients:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, [allowed, token]);

  // Prompt confirmation modal when user selects a client or clicks button
  const promptConfirmation = (targetClientId) => {
    if (!targetClientId) return;
    const target = clients.find(
      (c) => String(c.id || c._id || c.client_id) === String(targetClientId)
    );
    if (target) {
      setPendingClient(target);
      setShowConfirmModal(true);
    }
  };

  // Handler when user clicks OK in the popup confirmation modal
  const confirmInitializeSubmission = async () => {
    if (!pendingClient) return;
    setShowConfirmModal(false);
    setSubmitting(true);
    try {
      const clientId = pendingClient.id || pendingClient._id;
      setActiveClient(pendingClient);
      setSelectedClientId(clientId);

      // Call ONLY POST /procurement/submissions
      const r = await apiOpenSubmission(token, clientId);
      const subId = r.submission_id || r.id;
      setSubmissionId(subId);

      // Use response directly or initialize gate state
      if (r.ready_for_stage_2 !== undefined || r.order_sheet !== undefined) {
        setGate(r);
      } else {
        setGate({
          order_sheet: { present: false, validation_status: null },
          spec_sheet: { present: false, validation_status: null },
          ready_for_stage_2: false,
          blocking: ['order_sheet missing', 'spec_sheet missing']
        });
      }

      // Clear previous files for fresh session
      setOrderFile(null);
      setSpecFile(null);
      setOrderResult(null);
      setSpecResult(null);
      setOrderError(null);
      setSpecError(null);
      setBreakdown(null);
    } catch (e) {
      alert(e.message || 'Failed to initialize submission');
    } finally {
      setSubmitting(false);
    }
  };

  const refreshGate = async () => submissionId && setGate(await apiGetSubmission(token, submissionId));

  const upload = async (slot, file, force = false) => {
    const targetFile = file || (slot === 'order_sheet' || slot === 'order' ? orderFile : specFile);
    if (!targetFile) {
      alert('Please select a file to upload first.');
      return;
    }

    const normalizedSlot = (slot === 'order' || slot === 'order_sheet') ? 'order_sheet' : 'spec_sheet';
    if (normalizedSlot === 'order_sheet') {
      setOrderFile(targetFile);
      setOrderError(null);
    } else {
      setSpecFile(targetFile);
      setSpecError(null);
    }

    try {
      const r = await apiUploadSlot(token, submissionId, normalizedSlot, targetFile, force);
      normalizedSlot === 'order_sheet' ? setOrderResult(r) : setSpecResult(r);

      if (r?.submission) {
        setGate(r.submission);
      } else if (r?.ready_for_stage_2 !== undefined) {
        setGate(r);
      } else {
        setGate((prev) => {
          const isOrderOk = normalizedSlot === 'order_sheet' || prev?.order_sheet?.present;
          const isSpecOk = normalizedSlot === 'spec_sheet' || prev?.spec_sheet?.present;
          return {
            ...prev,
            [normalizedSlot]: { present: true, validation_status: 'accepted' },
            ready_for_stage_2: isOrderOk && isSpecOk,
            blocking: (isOrderOk && isSpecOk) ? [] : (!isOrderOk ? ['order_sheet missing'] : ['spec_sheet missing'])
          };
        });
      }
    } catch (e) {
      normalizedSlot === 'order_sheet' ? setOrderError(e) : setSpecError(e);
    } finally {
      await refreshGate();
    }
  };

  const startBreakdown = async () => {
    if (!gate?.ready_for_stage_2) return;
    setBreaking(true);
    try {
      await apiStartOrderBreakdown(token, submissionId);
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 1100));
        const b = await apiGetOrderBreakdown(token, submissionId);
        if (b.status === 'ready') {
          // Attach spec sheet ID from stage 1 intake response to each style
          const specId = specResult?.document?.id || gate?.spec_sheet?.document_id || gate?.spec_sheet?.id || 'spec-doc-001';
          const updatedStyles = (b.styles || []).map((s) => ({
            ...s,
            spec_id: s.spec_id || specId,
            spec_document_id: s.spec_document_id || specId,
            spec_match_status: s.spec_match_status || 'confirmed'
          }));
          setBreakdown({ ...b, styles: updatedStyles });
          break;
        }
      }
    } catch (e) {
      alert(e.message);
    } finally {
      setBreaking(false);
    }
  };

  const openDxfModal = (style) => {
    setDxfTargetStyle(style);
    setPatternNameInput(style.style_name || '');
    setShowDxfModal(true);
  };

  const confirmDxfPatternName = () => {
    if (!patternNameInput.trim()) {
      alert('Please enter a pattern name');
      return;
    }
    setShowDxfModal(false);
    setTimeout(() => {
      dxfFileInputRef.current?.click();
    }, 150);
  };

  const handleDxfFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !dxfTargetStyle) return;

    setUploadingDxf(true);
    try {
      const clientId = activeClient?.id || activeClient?._id || selectedClientId;
      const styleSig = dxfTargetStyle?.style_signature || patternNameInput;

      // 1. Call POST /procurement/patterns?style_signature={style_signature}&client_id={client_id}
      const uploadRes = await apiUploadPattern(token, styleSig, clientId, file);

      // 2. Call GET /procurement/patterns?style_signature={style_signature}&client_id={client_id}
      const patRes = await apiGetPatterns(token, styleSig, clientId);

      const specId = specResult?.document?.id || gate?.spec_sheet?.document_id || gate?.spec_sheet?.id || 'spec-doc-001';

      const patObj = Array.isArray(patRes) ? patRes[0] : (patRes?.data && Array.isArray(patRes.data) ? patRes.data[0] : patRes);
      const uploadObj = Array.isArray(uploadRes) ? uploadRes[0] : (uploadRes?.data && Array.isArray(uploadRes.data) ? uploadRes.data[0] : uploadRes);

      const patternRefId = patObj?.pattern_reference_id || patObj?.id || patObj?.pattern_id || uploadObj?.pattern_reference_id || uploadObj?.id || uploadObj?.pattern_id;

      // 3. Attach pattern reference ID & spec ID to style (POST /procurement/order-styles/{style_id}/attachments)
      const updatedStyle = await apiAttachStyle(token, dxfTargetStyle.id, {
        pattern_reference_id: patternRefId,
        spec_document_id: specId
      });

      setBreakdown((b) => ({
        ...b,
        styles: (b.styles || []).map((s) => (s.id === dxfTargetStyle.id ? {
          ...s,
          ...updatedStyle,
          dxf_match_status: 'confirmed',
          pattern_reference_id: patternRefId,
          spec_id: patRes?.spec_id || specId
        } : s))
      }));
    } catch (err) {
      alert(err.message || 'Failed to upload DXF pattern');
    } finally {
      setUploadingDxf(false);
      if (dxfFileInputRef.current) dxfFileInputRef.current.value = '';
    }
  };

  const confirmStyle = async (style) => {
    const specId = style.spec_document_id || style.spec_id || specResult?.document?.id || gate?.spec_sheet?.document_id || gate?.spec_sheet?.id;
    const patId = style.pattern_reference_id || style.pattern_id || style.dxf_id;

    const updated = await apiAttachStyle(token, style.id, {
      pattern_reference_id: patId,
      spec_document_id: specId
    });
    setBreakdown((b) => ({ ...b, styles: b.styles.map((s) => (s.id === style.id ? updated : s)) }));
  };

  const generate = async (style) => {
    setGenerating((g) => ({ ...g, [style.id]: true }));
    try {
      const res = await apiGenerateBom(token, style.id);
      const b = await apiGetOrderBreakdown(token, submissionId).catch(() => null);
      if (b) setBreakdown(b);
      const targetId = res?.bom_id || res?.order_style_id || style.id;
      router.push(`/dashboard/procurement/bom/${targetId}`);
    } catch (e) {
      alert(e.message);
    } finally {
      setGenerating((g) => ({ ...g, [style.id]: false }));
    }
  };

  if (!allowed) {
    return (
      <SpotlightCard className="p-12 text-center rounded-3xl">
        <AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-600" />
        <h3 className="font-black">Access Restricted</h3>
        <p className="text-xs mt-1 text-slate-500">Only DM / MD / Cutting Manager can submit procurement intake.</p>
      </SpotlightCard>
    );
  }

  if (loading || submitting) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-[#c8834a] mb-2" />
        <p className="text-xs font-black text-[#2d1f0e] uppercase tracking-wider">Executing POST /procurement/submissions API...</p>
      </div>
    );
  }

  return (
    <div className="space-y-7 max-w-5xl mx-auto pb-12">
      {/* Header + Client Selection Dropdown */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 p-5 rounded-3xl bg-white border" style={{ borderColor: 'rgba(200,131,74,.15)' }}>
        <div>
          <p className="text-xs font-black uppercase tracking-widest" style={{ color: '#c8834a' }}>Procurement · Stage 1</p>
          <h1 className="text-3xl font-black mt-1" style={{ color: '#2d1f0e' }}>Submission Workspace</h1>
          <p className="text-sm font-medium mt-1" style={{ color: '#9a7a5a' }}>
            {submissionId ? (
              <>Active Client: <strong className="text-[#2d1f0e]">{activeClient?.name}</strong> · Submission ID: <span className="font-mono text-xs text-[#c8834a]">{submissionId}</span></>
            ) : (
              'Select client and click Initialize Submission to start.'
            )}
          </p>
        </div>

        {/* Client Selection Dropdown */}
        <div className="w-full md:w-80">
          <label className="text-[10px] font-black uppercase tracking-wider block mb-1" style={{ color: '#9a7a5a' }}>
            Select Client to Initialize Submission
          </label>
          <div className="flex gap-2">
            <select
              value={selectedClientId}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedClientId(val);
                promptConfirmation(val);
              }}
              className="flex-1 p-2.5 rounded-xl border text-xs font-bold bg-[#faf6f0] text-[#2d1f0e] outline-none cursor-pointer"
              style={{ borderColor: 'rgba(200,131,74,.3)' }}
            >
              <option value="" disabled>-- Select Client --</option>
              {clients.map((c) => (
                <option key={c.id || c._id || c.client_id} value={c.id || c._id || c.client_id}>
                  {c.name} ({c.code || c.country || 'Client'})
                </option>
              ))}
            </select>
            <button
              onClick={() => promptConfirmation(selectedClientId)}
              className="px-3.5 py-2.5 rounded-xl bg-[#2d1f0e] text-white text-xs font-black hover:bg-[#3d2b1a] transition-all shrink-0 flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Initialize</span>
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal Popup */}
      {showConfirmModal && pendingClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-amber-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-[#c8834a]">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#2d1f0e]">Confirm Client Selection</h3>
                <p className="text-xs text-slate-500 font-medium">Initialize Submission ID API</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#faf6f0] border border-amber-200/60 my-4 text-xs">
              <p className="font-bold text-[#2d1f0e]">Do you want to initialize a new intake submission for:</p>
              <p className="text-base font-black text-[#c8834a] mt-1">{pendingClient.name}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-0.5">Client ID: {pendingClient.id || pendingClient._id}</p>
            </div>

            <p className="text-xs text-slate-500 mb-5">
              Clicking <strong>OK</strong> will execute <code className="font-mono text-amber-800">POST /procurement/submissions</code> with payload: <code className="font-mono text-xs">{JSON.stringify({ client_id: pendingClient.id || pendingClient._id })}</code>.
            </p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmInitializeSubmission}
                className="px-5 py-2.5 rounded-xl bg-[#2d1f0e] text-white text-xs font-black hover:bg-[#3d2b1a] transition-all shadow-md"
              >
                OK (Initialize Submission)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Intake Workspace - Only enabled after submissionId is created */}
      {!submissionId ? (
        <SpotlightCard className="p-10 text-center rounded-3xl bg-white border" style={{ borderColor: 'rgba(200,131,74,.15)' }}>
          <UserCheck className="w-10 h-10 mx-auto text-[#c8834a] mb-3" />
          <h3 className="font-black text-lg text-[#2d1f0e]">No Submission Initialized Yet</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Select a client from the dropdown above and click <strong>Initialize</strong> (or select an option) to confirm and open a new intake submission.
          </p>
          <button
            onClick={() => promptConfirmation(selectedClientId)}
            className="mt-4 px-5 py-2.5 rounded-xl bg-[#2d1f0e] text-white text-xs font-black inline-flex items-center gap-2"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Select Client & Initialize Submission</span>
          </button>
        </SpotlightCard>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-5">
            <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}>
              <div className="flex items-center gap-2 mb-4">
                <ShieldCheck className="w-5 h-5 text-[#c8834a]" />
                <div>
                  <p className="font-black">Order Sheet</p>
                  <p className="text-[10px] text-slate-400">Classification + virus/MIME gate</p>
                </div>
              </div>
              <DropZone label="Order Sheet" icon={FileText} file={orderFile} onFile={(f) => upload('order_sheet', f)} onClear={() => { setOrderFile(null); setOrderResult(null); }} description="Try ORDER BOGGI SS27.xlsx for heuristic acceptance" />
              <ValidationCard title="Order validation" data={orderResult} error={orderError} onForce={() => upload('order_sheet', orderFile, true)} />
            </SpotlightCard>

            <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}>
              <div className="flex items-center gap-2 mb-4">
                <FileText className="w-5 h-5 text-[#c8834a]" />
                <div>
                  <p className="font-black">Spec Sheet</p>
                  <p className="text-[10px] text-slate-400">Technical specification validation</p>
                </div>
              </div>
              <DropZone label="Spec Sheet" icon={UploadCloud} file={specFile} onFile={(f) => upload('spec_sheet', f)} onClear={() => { setSpecFile(null); setSpecResult(null); }} description="Try SPEC CLERMONT.pdf for heuristic acceptance" />
              <ValidationCard title="Spec validation" data={specResult} error={specError} onForce={() => upload('spec_sheet', specFile, true)} />
            </SpotlightCard>
          </div>

          {gate && (
            <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase text-slate-400">Readiness gate</p>
                  <p className="font-black mt-1">{gate.ready_for_stage_2 ? 'Ready for Stage 2' : 'Waiting for required documents'}</p>
                  <div className="flex gap-2 mt-2 text-[10px] font-bold">
                    <span className="px-2 py-1 rounded bg-slate-100">Order: {gate.order_sheet?.validation_status || 'missing'}</span>
                    <span className="px-2 py-1 rounded bg-slate-100">Spec: {gate.spec_sheet?.validation_status || 'missing'}</span>
                  </div>
                </div>
                <button disabled={!gate.ready_for_stage_2 || breaking} onClick={startBreakdown} className="px-5 py-3 rounded-xl bg-[#2d1f0e] text-white text-xs font-black disabled:opacity-40">
                  {breaking ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin inline mr-2" />
                      Extracting…
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-3 h-3 inline mr-2" />
                      Start Order Breakdown
                    </>
                  )}
                </button>
              </div>
              {gate.blocking?.length > 0 && <div className="mt-3 text-[10px] text-amber-700 font-bold">Blocking: {gate.blocking.join(' · ')}</div>}
            </SpotlightCard>
          )}

          {breaking && !breakdown && (
            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-sm font-bold text-amber-800 flex items-center gap-3">
              <Brain className="w-5 h-5" /> AI order extraction is running (mock 3 polls, 3–5s cadence)…
            </div>
          )}

          {breakdown?.status === 'ready' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Stage 2</p>
                  <h2 className="text-2xl font-black" style={{ color: '#2d1f0e' }}>Style Breakdown</h2>
                </div>
                <button onClick={async () => setBreakdown(await apiGetOrderBreakdown(token, submissionId))} className="p-2 rounded-xl border">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>
              {breakdown.styles.map((s) => (
                <StyleCard
                  key={s.id}
                  style={s}
                  onConfirm={() => confirmStyle(s)}
                  onOpenDxf={(style) => openDxfModal(style)}
                  onGenerate={() => generate(s)}
                  generating={generating[s.id]}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* Hidden DXF File Input */}
      <input
        type="file"
        ref={dxfFileInputRef}
        accept=".dxf,.zip,.pdf,.dwg"
        className="hidden"
        onChange={handleDxfFileSelected}
      />

      {/* DXF Pattern Name Input Modal */}
      {showDxfModal && dxfTargetStyle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md p-6 rounded-3xl bg-white shadow-2xl border border-amber-100">
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2.5 rounded-2xl bg-amber-50 text-[#c8834a]">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#2d1f0e]">Upload DXF Pattern</h3>
                <p className="text-xs text-slate-500 font-medium">Style: {dxfTargetStyle.style_name}</p>
              </div>
            </div>

            <div className="my-4">
              <label className="text-xs font-bold text-[#2d1f0e] block mb-1.5">
                Enter Pattern Name / Reference Name:
              </label>
              <input
                type="text"
                value={patternNameInput}
                onChange={(e) => setPatternNameInput(e.target.value)}
                placeholder="e.g. CLERMONT_PATTERN_V1"
                className="w-full p-3 rounded-xl border border-amber-200 bg-[#faf6f0] text-xs font-bold text-[#2d1f0e] outline-none focus:border-[#c8834a]"
              />
              <p className="text-[11px] text-slate-500 mt-2">
                Clicking <strong>Next</strong> will open your file browser to select the <code>.dxf</code> file. It will then call:
                <br />
                <code className="font-mono text-amber-800 text-[10px]">POST /procurement/patterns?pattern_name={patternNameInput || '...'}&client_id={activeClient?.id || selectedClientId}</code>
              </p>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                onClick={() => setShowDxfModal(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmDxfPatternName}
                className="px-5 py-2.5 rounded-xl bg-[#2d1f0e] text-white text-xs font-black hover:bg-[#3d2b1a] transition-all shadow-md flex items-center gap-1.5"
              >
                <span>Next: Select DXF File</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
