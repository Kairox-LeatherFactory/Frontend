'use client';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { apiImportPreview, apiImportCommit } from '@/lib/api';
import {
  UploadCloud, FileSpreadsheet, CheckCircle2, XCircle, Loader2,
  TriangleAlert, Database, Eye, Lock,
} from 'lucide-react';

export default function ExcelImportPage() {
  const { user, token } = useAuth();
  const isManager = user === 'direct_manager';

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [committed, setCommitted] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setPreview(null); setCommitted(null); setError('');
  };

  const onPick = (f) => {
    if (!f) return;
    if (!/\.(xlsx|xlsm)$/i.test(f.name)) {
      setError('Please choose an .xlsx (or .xlsm) workbook.');
      return;
    }
    setFile(f); reset();
  };

  const doPreview = async () => {
    if (!file || !token) return;
    setLoading(true); setError(''); setCommitted(null);
    try {
      setPreview(await apiImportPreview(token, file));
    } catch (e) {
      setError(e.message || 'Preview failed.');
    } finally { setLoading(false); }
  };

  const doCommit = async () => {
    if (!file || !token) return;
    setLoading(true); setError('');
    try {
      setCommitted(await apiImportCommit(token, file));
    } catch (e) {
      setError(e.message || 'Commit failed.');
    } finally { setLoading(false); }
  };

  // ── Access gate: backend import is Direct-Manager + token only ───────────
  if (!isManager || !token) {
    return (
      <div className="max-w-2xl mx-auto pt-12 text-center">
        <div className="card p-8 bg-white border border-amber-100 shadow-xl space-y-4">
          <Lock className="w-14 h-14 text-amber-400 mx-auto" />
          <h1 className="text-2xl font-black text-slate-800">Manager Login Required</h1>
          <p className="text-slate-500 font-medium">
            Excel import writes to the live database, so it needs a{' '}
            <strong className="text-slate-700">Direct Manager</strong> session.
            Sign in via the Direct Manager card to upload workbooks.
          </p>
        </div>
      </div>
    );
  }

  const clientRows = preview ? Object.entries(preview.clients || {}) : [];
  const totalPieces = clientRows.reduce((s, [, c]) => s + (c.pieces_ordered || 0), 0);

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Excel Order Import</h1>
        <p className="text-slate-500 font-medium">
          Upload a garment order/production workbook. We parse and show a preview first —
          nothing is written until you confirm.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl font-bold text-sm flex items-start gap-2.5">
          <XCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div><p className="font-extrabold">Import error</p><p className="text-xs text-red-600 mt-0.5 break-all">{error}</p></div>
        </div>
      )}

      {/* ── Upload card ── */}
      <div className="card p-8 bg-white border border-blue-100 shadow-xl space-y-6">
        <label
          htmlFor="xlsx"
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-blue-200 rounded-2xl p-10 cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-all text-center"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); onPick(e.dataTransfer.files?.[0]); }}
        >
          <UploadCloud className="w-12 h-12 text-blue-400" />
          <div>
            <p className="font-black text-slate-700">Drop an .xlsx here or click to browse</p>
            <p className="text-xs text-slate-400 font-medium mt-1">Garment order + production workbooks</p>
          </div>
          <input id="xlsx" type="file" accept=".xlsx,.xlsm" className="hidden"
                 onChange={(e) => onPick(e.target.files?.[0])} />
        </label>

        {file && (
          <div className="flex items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="w-6 h-6 text-emerald-500 flex-shrink-0" />
              <span className="font-bold text-slate-700 text-sm truncate">{file.name}</span>
              <span className="text-xs text-slate-400">({Math.round(file.size / 1024)} KB)</span>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button onClick={doPreview} disabled={loading}
                className="btn-secondary h-11 px-4 rounded-xl text-sm font-bold border border-blue-200 hover:bg-blue-50 flex items-center gap-2 disabled:opacity-50">
                {loading && !committed ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />} Preview
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Preview result ── */}
      {preview && (
        <div className="card p-8 bg-white border border-blue-100 shadow-xl space-y-6 animate-fade-in">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" /> Dry-run preview
            </h2>
            <div className="flex items-center gap-3 text-sm">
              <span className="badge bg-blue-100 text-blue-800">{clientRows.length} clients</span>
              <span className="badge bg-emerald-100 text-emerald-800">{totalPieces} pieces</span>
              <span className={`badge ${preview.total_warnings ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'}`}>
                {preview.total_warnings || 0} warnings
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-400 border-b border-slate-100">
                  <th className="py-2 pr-4">Client</th>
                  <th className="py-2 pr-4">Order lines</th>
                  <th className="py-2 pr-4">Pieces</th>
                  <th className="py-2 pr-4">Styles</th>
                  <th className="py-2 pr-4">Prod. cards</th>
                  <th className="py-2">Warnings</th>
                </tr>
              </thead>
              <tbody>
                {clientRows.map(([key, c]) => (
                  <tr key={key} className="border-b border-slate-50">
                    <td className="py-2 pr-4 font-black text-slate-800">{key}</td>
                    <td className="py-2 pr-4">{c.order_lines}</td>
                    <td className="py-2 pr-4 font-bold">{c.pieces_ordered}</td>
                    <td className="py-2 pr-4">{(c.styles || []).length}</td>
                    <td className="py-2 pr-4">{c.production_cards}</td>
                    <td className="py-2 text-amber-600">{(c.warnings || []).length || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {preview.total_warnings > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-semibold flex items-start gap-2">
              <TriangleAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{preview.total_warnings} warning(s) found during parsing. Review before committing — rows with errors may be skipped.</span>
            </div>
          )}

          {!committed && (
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button onClick={doCommit} disabled={loading}
                className="btn-primary h-13 min-h-[48px] px-8 rounded-xl font-black bg-gradient-brand shadow-lg flex items-center gap-2 disabled:opacity-50">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Database className="w-5 h-5" />}
                Confirm &amp; Write to Database
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Commit result ── */}
      {committed && (
        <div className="card p-6 bg-emerald-50 border border-emerald-200 shadow-xl animate-fade-in flex items-start gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="font-black text-emerald-800">Import committed to the database.</p>
            <pre className="text-xs text-emerald-700 mt-2 bg-white/60 rounded-lg p-3 overflow-x-auto">
{JSON.stringify(committed.written ?? committed, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
