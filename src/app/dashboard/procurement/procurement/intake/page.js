'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, CheckCircle2, X, Loader2, ArrowRight, AlertCircle, ShieldCheck, Brain, GitBranch, RefreshCw } from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import { apiOpenSubmission, apiUploadSlot, apiGetSubmission, apiStartOrderBreakdown, apiGetOrderBreakdown, apiAttachStyle, apiGenerateBom } from '../../lib/api';

function DropZone({ label, accept, icon: Icon, file, onFile, onClear, description, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const drop = useCallback(e => { e.preventDefault(); if (disabled) return; setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onFile(f) }, [disabled, onFile]);
  return <div>
    <p className="text-[11px] font-black uppercase tracking-wider mb-2" style={{ color: '#9a7a5a' }}>{label}</p>
    {file ? <div className="flex items-center justify-between p-4 rounded-2xl" style={{ background: '#f0fdf4', border: '1px solid rgba(22,163,74,.25)' }}>
      <div className="flex items-center gap-3"><CheckCircle2 className="w-5 h-5 text-green-600" /><div><p className="text-sm font-black" style={{ color: '#2d1f0e' }}>{file.name}</p><p className="text-[10px] font-semibold" style={{ color: '#9a7a5a' }}>{(file.size / 1024).toFixed(1)} KB</p></div></div>
      <button onClick={onClear} className="p-1.5 rounded-lg hover:bg-red-50"><X className="w-4 h-4 text-red-600" /></button>
    </div> : <div onClick={() => !disabled && inputRef.current?.click()} onDrop={drop} onDragOver={e => { e.preventDefault(); if (!disabled) setDragging(true) }} onDragLeave={() => setDragging(false)} className={`flex flex-col items-center justify-center gap-3 p-8 rounded-2xl transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`} style={{ background: dragging ? '#fff9f0' : '#faf6f0', border: `2px dashed ${dragging ? '#c8834a' : 'rgba(200,131,74,.3)'}` }}>
      <Icon className="w-8 h-8" style={{ color: '#c8834a' }} /><div className="text-center"><p className="text-sm font-black" style={{ color: '#2d1f0e' }}>Drop your {label} here</p><p className="text-[11px] font-semibold mt-1" style={{ color: '#9a7a5a' }}>{description}</p><p className="text-[10px] mt-1" style={{ color: '#c8834a' }}>CSV, PDF, XLSX supported · Click to browse</p></div>
      <input ref={inputRef} type="file" accept={accept || '*/*'} className="hidden" disabled={disabled} onChange={e => e.target.files?.[0] && onFile(e.target.files[0])} />
    </div>}
  </div>
}

function ValidationCard({ title, data, error, onForce }) {
  if (!data && !error) return null;
  const v = data?.document?.validation || error?.body?.validation;
  const rejected = !!error || v?.status === 'rejected' || v?.reason_code === 'needs_manual_review';
  return <div className="mt-4 p-4 rounded-2xl" style={{ background: rejected ? '#fff7ed' : '#f8fafc', border: `1px solid ${rejected ? 'rgba(234,88,12,.25)' : 'rgba(22,163,74,.2)'}` }}>
    <div className="flex items-center gap-2 mb-3">{rejected ? <AlertCircle className="w-4 h-4 text-orange-600" /> : <CheckCircle2 className="w-4 h-4 text-green-600" />}<span className="text-xs font-black">{title} · {v?.status || 'processed'}</span></div>
    {v && <div className="grid md:grid-cols-2 gap-3 text-[10px]">
      <div className="rounded-xl bg-white border p-3"><p className="font-black text-slate-500 uppercase mb-2">Classification</p><p><b>Method:</b> {v.method}</p><p><b>Confidence:</b> {v.confidence}</p><p><b>Kind:</b> {v.classified_as || v.expected_kind}</p><p><b>Client:</b> {v.client_match || v.closest_client_profile || '—'}</p></div>
      <div className="rounded-xl bg-white border p-3"><p className="font-black text-slate-500 uppercase mb-2">Signals</p><p><b>Expected:</b> {(v.signals_expected || []).join(', ') || '—'}</p><p><b>Found:</b> {(v.signals_found || []).join(', ') || '—'}</p></div>
    </div>}
    {v?.suggested_fix && <div className="mt-3 rounded-xl bg-yellow-50 border border-yellow-200 p-3 text-xs text-yellow-900"><b>Suggested fix:</b> {v.suggested_fix}</div>}
    {v?.reason_code === 'needs_manual_review' && <button onClick={onForce} className="mt-3 px-3 py-2 rounded-xl bg-orange-600 text-white text-xs font-black">Force accept (manual review)</button>}
    {error && !v && <p className="text-xs text-red-700">{error.message}</p>}
  </div>
}

function StyleCard({ style, onConfirm, onGenerate, generating }) {
  return <SpotlightCard className="p-5 bg-white rounded-2xl" spotlightColor="rgba(200,131,74,.05)" style={{ border: '1px solid rgba(200,131,74,.14)' }}>
    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
      <div><div className="flex items-center gap-2"><h3 className="font-black text-lg" style={{ color: '#2d1f0e' }}>{style.style_name}</h3><span className="text-[10px] font-black px-2 py-1 rounded-full bg-slate-100">{style.qty} pcs</span></div><p className="text-xs font-semibold mt-1" style={{ color: '#9a7a5a' }}>Material: {style.material} · Signature: {style.style_signature}</p>
        {style.warnings?.length > 0 && <div className="mt-2 text-[10px] font-bold text-amber-700">⚠ {style.warnings.join(', ')}</div>}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${style.spec_match_status === 'confirmed' ? 'bg-green-100 text-green-700' : style.spec_match_status === 'suggested' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>Spec: {style.spec_match_status}</span>
        <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${style.dxf_match_status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>DXF: {style.dxf_match_status}</span>
      </div>
    </div>
    <div className="mt-4 overflow-x-auto"><table className="min-w-full text-xs"><thead><tr className="text-left text-[10px] uppercase text-slate-400 border-b"><th className="py-2">Color</th><th>Qty</th><th>Sizes</th></tr></thead><tbody>{style.colors.map(c => <tr key={c.color_key} className="border-b last:border-0"><td className="py-2 font-black">{c.color_label}</td><td>{c.qty}</td><td>{Object.entries(c.per_size_qty).map(([k, v]) => `${k}: ${v}`).join(' · ')}</td></tr>)}</tbody></table></div>
    <div className="mt-4 flex gap-2 justify-end">
      {style.spec_match_status === 'suggested' && <button onClick={onConfirm} className="px-3 py-2 rounded-xl text-xs font-black bg-amber-100 text-amber-800 hover:bg-amber-200">Confirm suggested spec</button>}
      {style.spec_match_status !== 'suggested' && !style.bom_id && <button onClick={onGenerate} disabled={generating} className="px-4 py-2 rounded-xl text-xs font-black text-white bg-[#c8834a] disabled:opacity-50">{generating ? <Loader2 className="w-3 h-3 animate-spin inline mr-1" /> : null} Generate BOM</button>}
      {style.bom_id && <span className="px-3 py-2 rounded-xl text-xs font-black bg-green-100 text-green-700">BOM generated</span>}
    </div>
  </SpotlightCard>
}

export default function ProcurementIntakePage() {
  const router = useRouter(); const { user, token } = useAuth(); const allowed = ['direct_manager', 'managing_director', 'cutting_manager'].includes(user);
  const [submissionId, setSubmissionId] = useState(null); const [loading, setLoading] = useState(true); const [orderFile, setOrderFile] = useState(null); const [specFile, setSpecFile] = useState(null); const [orderResult, setOrderResult] = useState(null); const [specResult, setSpecResult] = useState(null); const [orderError, setOrderError] = useState(null); const [specError, setSpecError] = useState(null); const [gate, setGate] = useState(null); const [breakdown, setBreakdown] = useState(null); const [breaking, setBreaking] = useState(false); const [generating, setGenerating] = useState({});
  useEffect(() => { if (!allowed) return; (async () => { try { const r = await apiOpenSubmission(token); setSubmissionId(r.submission_id); setGate(await apiGetSubmission(token, r.submission_id)); } finally { setLoading(false) } })() }, [allowed, token]);
  const refreshGate = async () => submissionId && setGate(await apiGetSubmission(token, submissionId));
  const upload = async (slot, file, force = false) => { if (slot === 'order') { setOrderFile(file); setOrderError(null); setOrderResult(null) } else { setSpecFile(file); setSpecError(null); setSpecResult(null) }; try { const r = await apiUploadSlot(token, submissionId, slot, file, force); slot === 'order' ? setOrderResult(r) : setSpecResult(r); await refreshGate() } catch (e) { slot === 'order' ? setOrderError(e) : setSpecError(e) } };
  const startBreakdown = async () => { if (!gate?.ready_for_stage_2) return; setBreaking(true); try { await apiStartOrderBreakdown(token, submissionId); for (let i = 0; i < 5; i++) { await new Promise(r => setTimeout(r, 1100)); const b = await apiGetOrderBreakdown(token, submissionId); if (b.status === 'ready') { setBreakdown(b); break } } } catch (e) { alert(e.message) } finally { setBreaking(false) } };
  const confirmStyle = async style => { const updated = await apiAttachStyle(token, style.id, {}); setBreakdown(b => ({ ...b, styles: b.styles.map(s => s.id === style.id ? updated : s) })) };
  const generate = async style => { setGenerating(g => ({ ...g, [style.id]: true })); try { await apiGenerateBom(token, style.id); const b = await apiGetOrderBreakdown(token, submissionId); setBreakdown(b); const updated = b.styles.find(s => s.id === style.id); if (updated?.bom_id) router.push(`/dashboard/procurement/procurement/bom/${updated.bom_id}`) } catch (e) { alert(e.message) } finally { setGenerating(g => ({ ...g, [style.id]: false })) } };;
  if (!allowed) return <SpotlightCard className="p-12 text-center rounded-3xl"><AlertCircle className="w-12 h-12 mx-auto mb-3 text-orange-600" /><h3 className="font-black">Access Restricted</h3><p className="text-xs mt-1 text-slate-500">Only DM / MD / Cutting Manager can submit procurement intake.</p></SpotlightCard>;
  if (loading) return <div className="p-12 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-[#c8834a]" /></div>;
  return <div className="space-y-7 max-w-5xl mx-auto pb-12">
    <div><p className="text-xs font-black uppercase tracking-widest" style={{ color: '#c8834a' }}>Procurement · Stage 1</p><h1 className="text-3xl font-black mt-1" style={{ color: '#2d1f0e' }}>Submission Workspace</h1><p className="text-sm font-medium mt-1" style={{ color: '#9a7a5a' }}>Validate both documents first. The mock follows the API contract: heuristic → LLM fallback → human review.</p></div>
    <div className="grid lg:grid-cols-2 gap-5">
      <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}><div className="flex items-center gap-2 mb-4"><ShieldCheck className="w-5 h-5 text-[#c8834a]" /><div><p className="font-black">Order Sheet</p><p className="text-[10px] text-slate-400">Classification + virus/MIME gate</p></div></div><DropZone label="Order Sheet" icon={FileText} file={orderFile} onFile={f => upload('order_sheet', f)} onClear={() => { setOrderFile(null); setOrderResult(null) }} description="Try ORDER BOGGI SS27.xlsx for heuristic acceptance" /><ValidationCard title="Order validation" data={orderResult} error={orderError} onForce={() => upload('order_sheet', orderFile, true)} /></SpotlightCard>
      <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}><div className="flex items-center gap-2 mb-4"><FileText className="w-5 h-5 text-[#c8834a]" /><div><p className="font-black">Spec Sheet</p><p className="text-[10px] text-slate-400">Technical specification validation</p></div></div><DropZone label="Spec Sheet" icon={UploadCloud} file={specFile} onFile={f => upload('spec_sheet', f)} onClear={() => { setSpecFile(null); setSpecResult(null) }} description="Try SPEC CLERMONT.pdf for heuristic acceptance" /><ValidationCard title="Spec validation" data={specResult} error={specError} onForce={() => upload('spec_sheet', specFile, true)} /></SpotlightCard>
    </div>
    {gate && <SpotlightCard className="p-5 rounded-3xl bg-white" spotlightColor="rgba(200,131,74,.04)" style={{ border: '1px solid rgba(200,131,74,.15)' }}><div className="flex items-center justify-between gap-4"><div><p className="text-[10px] font-black uppercase text-slate-400">Readiness gate</p><p className="font-black mt-1">{gate.ready_for_stage_2 ? 'Ready for Stage 2' : 'Waiting for required documents'}</p><div className="flex gap-2 mt-2 text-[10px] font-bold"><span className="px-2 py-1 rounded bg-slate-100">Order: {gate.order_sheet.validation_status || 'missing'}</span><span className="px-2 py-1 rounded bg-slate-100">Spec: {gate.spec_sheet.validation_status || 'missing'}</span></div></div><button disabled={!gate.ready_for_stage_2 || breaking} onClick={startBreakdown} className="px-5 py-3 rounded-xl bg-[#2d1f0e] text-white text-xs font-black disabled:opacity-40">{breaking ? <><Loader2 className="w-3 h-3 animate-spin inline mr-2" />Extracting…</> : <><GitBranch className="w-3 h-3 inline mr-2" />Start Order Breakdown</>}</button></div>{gate.blocking?.length > 0 && <div className="mt-3 text-[10px] text-amber-700 font-bold">Blocking: {gate.blocking.join(' · ')}</div>}</SpotlightCard>}
    {breaking && !breakdown && <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 text-sm font-bold text-amber-800 flex items-center gap-3"><Brain className="w-5 h-5" /> AI order extraction is running (mock 3 polls, 3–5s cadence)…</div>}
    {breakdown?.status === 'ready' && <div className="space-y-4"><div className="flex items-center justify-between"><div><p className="text-xs font-black uppercase tracking-widest text-[#c8834a]">Stage 2</p><h2 className="text-2xl font-black" style={{ color: '#2d1f0e' }}>Style Breakdown</h2></div><button onClick={async () => setBreakdown(await apiGetOrderBreakdown(token, submissionId))} className="p-2 rounded-xl border"><RefreshCw className="w-4 h-4" /></button></div>{breakdown.styles.map(s => <StyleCard key={s.id} style={s} onConfirm={() => confirmStyle(s)} onGenerate={() => generate(s)} generating={generating[s.id]} />)}</div>}
  </div>
}
