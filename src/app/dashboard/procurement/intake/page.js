'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  UploadCloud, FileText, CheckCircle2, X, Loader2,
  ArrowRight, AlertCircle, Sheet, FileArchive, Info,
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';

// ─── MOCK API — Replace with POST /api/v1/procurement/submissions ─────────────
async function mockSubmitIntake(orderFile, specFile, onProgress) {
  // Simulate upload delay with progress callbacks
  for (let p = 10; p <= 100; p += 15) {
    await new Promise(r => setTimeout(r, 300));
    onProgress(p);
  }
  // Return a mock submission object
  return {
    id: `SUB-${String(Math.floor(Math.random() * 900) + 100)}`,
    status: 'processing',
    message: 'Files uploaded. Backend is parsing your order sheet and spec PDF. BOM will be ready shortly.',
  };
}

function DropZone({ label, accept, icon: Icon, file, onFile, onClear, description }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFile(dropped);
  }, [onFile]);

  const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
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
          onClick={() => inputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className="cursor-pointer flex flex-col items-center justify-center gap-3 p-8 rounded-2xl transition-all"
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
              {accept.toUpperCase().replace('.', '')} supported · Click to browse
            </p>
          </div>
          <input ref={inputRef} type="file" accept={accept} className="hidden"
            onChange={e => e.target.files[0] && onFile(e.target.files[0])} />
        </div>
      )}
    </div>
  );
}

export default function ProcurementIntakePage() {
  const router = useRouter();
  const { user } = useAuth();

  // Role gate — only manager and cutting manager can submit intake
  const isAllowed = user === 'direct_manager' || user === 'cutting_manager';

  const [orderFile, setOrderFile] = useState(null);
  const [specFile, setSpecFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!orderFile) { setError('Order Sheet is required before submission.'); return; }
    setError(null);
    setUploading(true);
    setProgress(0);
    try {
      // TODO: Replace mockSubmitIntake with real API call:
      // const res = await fetch('/api/v1/procurement/submissions', { method:'POST', body: formData })
      const res = await mockSubmitIntake(orderFile, specFile, setProgress);
      setResult(res);
    } catch (e) {
      setError(e.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
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
    <div className="space-y-8 animate-fade-in max-w-3xl mx-auto">

      {/* ─── HEADER ─── */}
      <div>
        <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: '#c8834a' }}>
          Procurement · Stage 1
        </p>
        <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
          Intake & Upload
        </h1>
        <p className="font-medium mt-1" style={{ color: '#9a7a5a' }}>
          Upload the client's Order Sheet and Technical Spec. The backend will parse them and generate the Bill of Materials automatically.
        </p>
      </div>

      {/* ─── SUCCESS RESULT ─── */}
      {result && (
        <SpotlightCard className="p-6 rounded-3xl" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,0.25)' }} spotlightColor="rgba(22,163,74,0.06)">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="w-8 h-8 flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }} />
            <div className="flex-1">
              <h3 className="font-black text-lg" style={{ color: '#14532d' }}>Submission Accepted!</h3>
              <p className="text-sm font-semibold mt-1" style={{ color: '#166534' }}>{result.message}</p>
              <p className="text-xs font-black mt-2 font-mono" style={{ color: '#9a7a5a' }}>Reference: {result.id}</p>
            </div>
          </div>
          <div className="flex gap-3 mt-5">
            <button onClick={() => { setOrderFile(null); setSpecFile(null); setResult(null); setProgress(0); }}
              className="flex-1 h-10 rounded-xl text-xs font-black transition-all"
              style={{ background: '#faf6f0', color: '#9a7a5a', border: '1px solid rgba(200,131,74,0.2)' }}>
              New Submission
            </button>
            <button onClick={() => router.push('/dashboard/procurement')}
              className="flex-1 h-10 rounded-xl text-xs font-black text-white transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}>
              View All Submissions <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </SpotlightCard>
      )}

      {/* ─── UPLOAD FORM ─── */}
      {!result && (
        <SpotlightCard className="p-6 sm:p-8 bg-white shadow-xl rounded-3xl space-y-6" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.06)">

          {/* Info banner */}
          <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.15)' }}>
            <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#c8834a' }} />
            <div className="text-[11px] font-semibold space-y-1" style={{ color: '#9a7a5a' }}>
              <p><strong style={{ color: '#2d1f0e' }}>Order Sheet (.xlsx)</strong> — required. Must contain columns: Style, Colorway, Size Run, Quantity, Unit Price, Delivery Date.</p>
              <p><strong style={{ color: '#2d1f0e' }}>Tech Spec Sheet (.pdf)</strong> — recommended. Material breakdown, stitching specs, and hardware details help the BOM parser.</p>
            </div>
          </div>

          {/* Drop Zones */}
          <DropZone
            label="Order Sheet *"
            accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
            icon={Sheet}
            file={orderFile}
            onFile={setOrderFile}
            onClear={() => setOrderFile(null)}
            description="Excel order form from the buyer"
          />
          <DropZone
            label="Tech Spec Sheet (Optional)"
            accept=".xlsx,.xls,.csv,.pdf,.doc,.docx"
            icon={FileArchive}
            file={specFile}
            onFile={setSpecFile}
            onClear={() => setSpecFile(null)}
            description="PDF spec sheet with material & hardware details"
          />

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: '#fef2f2', border: '1px solid rgba(220,38,38,0.2)' }}>
              <AlertCircle className="w-4 h-4 flex-shrink-0" style={{ color: '#dc2626' }} />
              <p className="text-xs font-semibold" style={{ color: '#991b1b' }}>{error}</p>
            </div>
          )}

          {/* Upload progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold" style={{ color: '#9a7a5a' }}>Uploading & parsing files…</span>
                <span className="text-xs font-black" style={{ color: '#c8834a' }}>{progress}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(200,131,74,0.15)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${progress}%`, background: 'linear-gradient(to right, #c8834a, #e8a06a)' }}
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={uploading || !orderFile}
            className="w-full h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:translate-y-0"
            style={{ background: 'linear-gradient(135deg, #c8834a, #e8a06a)' }}
          >
            {uploading
              ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
              : <><UploadCloud className="w-5 h-5" /> Submit Intake</>}
          </button>

          <p className="text-[10px] font-semibold text-center" style={{ color: '#9a7a5a' }}>
            Files are processed securely on the factory server. No data leaves the Kairox environment.
          </p>
        </SpotlightCard>
      )}

      {/* ─── WHAT HAPPENS NEXT ─── */}
      {!result && (
        <SpotlightCard className="p-6 bg-white rounded-3xl shadow-md" style={{ border: '1px solid rgba(200,131,74,0.1)' }} spotlightColor="rgba(200,131,74,0.04)">
          <h4 className="text-sm font-black uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: '#9a7a5a' }}>
            <ArrowRight className="w-4 h-4" style={{ color: '#c8834a' }} /> What happens next?
          </h4>
          <div className="space-y-3">
            {[
              { step: '1', label: 'Intake', desc: 'Files are uploaded and parsed by the backend parser engine.' },
              { step: '2', label: 'BOM Generation', desc: 'A Bill of Materials is auto-generated from your order sheet.' },
              { step: '3', label: 'Cutting Manager Review', desc: 'The Cutting Manager edits and confirms the BOM line items.' },
              { step: '4', label: 'Manager Approval', desc: 'Direct Manager approves or rejects the finalised BOM.' },
            ].map(({ step, label, desc }) => (
              <div key={step} className="flex items-start gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black text-white" style={{ background: '#c8834a' }}>{step}</span>
                <div>
                  <p className="text-xs font-black" style={{ color: '#2d1f0e' }}>{label}</p>
                  <p className="text-[11px] font-semibold" style={{ color: '#9a7a5a' }}>{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </SpotlightCard>
      )}
    </div>
  );
}
