'use client';
import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud, FileText, CheckCircle2, X, Loader2,
  ArrowRight, AlertCircle, Sheet, FileArchive, Info,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiOpenSubmission, apiUploadSlot, apiGetSubmission } from '@/lib/api';

function DropZone({ label, accept, icon: Icon, file, onFile, onClear, description, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    if (disabled) return;
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }, [onFile, disabled]);

  const handleDragOver = (e) => { 
    e.preventDefault(); 
    if (!disabled) setDragging(true); 
  };
  const handleDragLeave = () => setDragging(false);

  return (
    <div>
      <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: '#9a7a5a' }}>{label}</p>
      {file ? (
        <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.25)' }}>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" style={{ color: '#16a34a' }} />
            <div>
              <p className="text-sm font-black" style={{ color: '#2d1f0e' }}>{file.name}</p>
              <p className="text-[10px] font-semibold" style={{ color: '#9a7a5a' }}>{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          </div>
          <button onClick={onClear} className="p-1.5 rounded-lg transition-colors hover:bg-red-50">
            <X className="w-4 h-4" style={{ color: '#dc2626' }} />
          </button>
        </div>
      ) : (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          style={{
            background: dragging ? '#fff9f0' : '#faf6f0',
            border: `2px dashed ${dragging ? '#c8834a' : 'rgba(200,131,74,0.3)'}`,
            transform: dragging ? 'scale(1.01)' : 'scale(1)',
          }}
        >
          <Icon className="w-8 h-8" style={{ color: dragging ? '#c8834a' : '#9a7a5a' }} />
          <div className="text-center">
            <p className="text-sm font-black" style={{ color: '#2d1f0e' }}>Drop your {label} here</p>
            <p className="text-[11px] font-semibold mt-0.5" style={{ color: '#9a7a5a' }}>{description}</p>
            <p className="text-[10px] font-semibold mt-1" style={{ color: '#c8834a' }}>
              CSV, PDF, XLSX supported · Click to browse
            </p>
          </div>
          <input ref={inputRef} type="file" accept={accept || "*/*"} className="hidden"
            onChange={e => e.target.files[0] && onFile(e.target.files[0])} disabled={disabled} />
        </div>
      )}
    </div>
  );
}

// Component to neatly display JSON validation responses
function ValidationResponse({ title, data }) {
  if (!data) return null;
  const isAccepted = data.validation?.status === 'accepted' || data.scan_status === 'clean';
  const isRejected = data.validation?.status === 'rejected' || data.error;

  return (
    <div className="p-4 rounded-xl mt-4" style={{ background: '#faf6f0', border: `1px solid ${isRejected ? 'rgba(220,38,38,0.3)' : isAccepted ? 'rgba(22,163,74,0.3)' : 'rgba(200,131,74,0.2)'}` }}>
      <div className="flex items-center gap-2 mb-2">
        {isRejected ? <X className="w-4 h-4 text-red-600" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}
        <span className="text-xs font-bold" style={{ color: '#2d1f0e' }}>{title} Status: {data.validation?.status || data.error || 'Processed'}</span>
      </div>
      <pre className="text-[10px] p-3 rounded-lg overflow-x-auto whitespace-pre-wrap" style={{ background: '#2d1f0e', color: '#fff9f0' }}>
        {JSON.stringify(data, null, 2)}
      </pre>
      {data.validation?.suggested_fix && (
        <div className="mt-2 p-2 bg-yellow-50 text-yellow-800 text-xs rounded border border-yellow-200">
          <strong>Suggested Fix:</strong> {data.validation.suggested_fix}
        </div>
      )}
    </div>
  );
}

export default function ProcurementIntakePage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const isAllowed = user === 'direct_manager' || user === 'cutting_manager';

  const [submissionId, setSubmissionId] = useState(null);
  const [initLoading, setInitLoading] = useState(true);
  const [initError, setInitError] = useState(null);

  const [orderFile, setOrderFile] = useState(null);
  const [specFile, setSpecFile] = useState(null);
  const [uploadingOrder, setUploadingOrder] = useState(false);
  const [uploadingSpec, setUploadingSpec] = useState(false);

  const [orderValidation, setOrderValidation] = useState(null);
  const [specValidation, setSpecValidation] = useState(null);
  const [readyForStage2, setReadyForStage2] = useState(false);

  // MOCK LOGIC FOR DEMO
  useEffect(() => {
    if (!isAllowed) return;
    setInitLoading(true);
    setTimeout(() => {
      setSubmissionId('SUB-MOCK-101');
      setInitLoading(false);
    }, 800);
  }, [isAllowed]);

  const checkStatus = useCallback(async () => {
    // In mock, if both validations are present, we are ready
  }, [submissionId]);

  const handleOrderUpload = async (file) => {
    setOrderFile(file);
    setUploadingOrder(true);
    setOrderValidation(null);
    setTimeout(() => {
      setOrderValidation({ validation: { status: 'accepted' }, scan_status: 'clean', filename: file.name });
      setUploadingOrder(false);
      setReadyForStage2(true);
    }, 1500);
  };

  const handleSpecUpload = async (file) => {
    setSpecFile(file);
    setUploadingSpec(true);
    setSpecValidation(null);
    setTimeout(() => {
      setSpecValidation({ validation: { status: 'accepted' }, scan_status: 'clean', filename: file.name });
      setUploadingSpec(false);
    }, 1500);
  };

  const handleGenerateBom = () => {
    // Navigate to Stage 2 BOM view
    router.push(`/dashboard/procurement/bom/${submissionId}`);
  };

  if (!isAllowed) {
    return (
      <SpotlightCard className="p-12 text-center rounded-3xl" style={{ background: '#fff9f0', border: '1px solid rgba(200,131,74,0.3)' }} spotlightColor="rgba(200,131,74,0.1)">
        <AlertCircle className="w-12 h-12 mx-auto mb-3" style={{ color: '#c8834a' }} />
        <h3 className="font-black uppercase tracking-wide" style={{ color: '#9c4221' }}>Access Restricted</h3>
        <p className="text-xs font-semibold mt-1" style={{ color: '#a86022' }}>
          Only Cutting Managers and Direct Managers can submit new procurement intakes.
        </p>
      </SpotlightCard>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto pb-12">
      {/* ─── HEADER ─── */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>
          Procurement · Stage 1
        </p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
          Intake & Upload
        </h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>
          Uploading to Submission ID: {initLoading ? <span className="animate-pulse">Generating...</span> : <strong className="font-mono">{submissionId || 'Failed'}</strong>}
        </p>
      </div>

      {initError && (
        <div className="p-4 bg-red-50 text-red-800 rounded-xl border border-red-200 font-semibold text-sm">
          Failed to initialize submission: {initError}. Please ensure backend is running.
        </div>
      )}

      {/* ─── UPLOAD FORM ─── */}
      <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl rounded-3xl space-y-6" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">
        
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.15)' }}>
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#c8834a' }} />
          <div className="text-[11px] font-semibold space-y-1" style={{ color: '#9a7a5a' }}>
            <p><strong style={{ color: '#2d1f0e' }}>Order Sheet (.xlsx)</strong> — required. Must contain columns: Style, Colorway, Size Run, Quantity.</p>
            <p><strong style={{ color: '#2d1f0e' }}>Tech Spec Sheet (.pdf)</strong> — recommended. Material breakdown, stitching specs.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Order Sheet Zone */}
          <div>
            <DropZone
              label="Order Sheet *"
              accept=".csv,.pdf,.xlsx"
              icon={Sheet}
              file={orderFile}
              onFile={handleOrderUpload}
              onClear={() => { setOrderFile(null); setOrderValidation(null); }}
              description="Excel order form from the buyer"
              disabled={initLoading || !submissionId || uploadingOrder}
            />
            {uploadingOrder && <div className="mt-2 text-xs font-semibold flex items-center gap-2 text-blue-600"><Loader2 className="w-4 h-4 animate-spin"/> Validating Order Sheet...</div>}
            <ValidationResponse title="Order Sheet" data={orderValidation} />
          </div>

          {/* Spec Sheet Zone */}
          <div>
            <DropZone
              label="Tech Spec Sheet (Optional)"
              accept=".csv,.pdf,.xlsx"
              icon={FileArchive}
              file={specFile}
              onFile={handleSpecUpload}
              onClear={() => { setSpecFile(null); setSpecValidation(null); }}
              description="PDF spec sheet with material details"
              disabled={initLoading || !submissionId || uploadingSpec}
            />
            {uploadingSpec && <div className="mt-2 text-xs font-semibold flex items-center gap-2 text-blue-600"><Loader2 className="w-4 h-4 animate-spin"/> Validating Spec Sheet...</div>}
            <ValidationResponse title="Spec Sheet" data={specValidation} />
          </div>
        </div>
      </SpotlightCard>

      {/* ─── GENERATE BOM ─── */}
      {readyForStage2 && (
        <SpotlightCard className="p-8 text-center rounded-3xl animate-fade-in shadow-xl" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.3)' }} spotlightColor="rgba(22,163,74,0.1)">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4" style={{ color: '#16a34a' }} />
          <h2 className="text-2xl font-black mb-2" style={{ color: '#14532d' }}>Intake Complete!</h2>
          <p className="text-sm font-semibold mb-6" style={{ color: '#166534' }}>Files parsed successfully. The system is ready to generate the Bill of Materials.</p>
          <button
            onClick={handleGenerateBom}
            className="px-8 py-3 rounded-xl font-black text-white transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #16a34a, #22c55e)' }}
          >
            Generate BOM
          </button>
        </SpotlightCard>
      )}

    </div>
  );
}
