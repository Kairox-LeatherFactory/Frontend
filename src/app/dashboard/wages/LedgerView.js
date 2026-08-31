// wages page ledger view code
'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { apiGetWageLedger, apiGetWageOrders, apiGetWageStyles, apiGetWageRunBreakdown, apiGetWageRunPieces } from '@/lib/api';
import { Loader2, History, Warehouse, Calendar, ChevronRight, RefreshCw, Search, Download, X, Barcode as BarcodeIcon } from 'lucide-react';
import * as XLSX from 'xlsx';
import SpotlightCard from '@/components/SpotlightCard';
import { SearchCombobox, SimpleSelect, StatusBadge, Money, PortalPillSelect } from './shared';

export default function LedgerView({ token, isActive }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [orderSearch, setOrderSearch] = useState('');
  const [styleSearch, setStyleSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const [orderOptions, setOrderOptions] = useState([]);
  const [orderOptionsLoading, setOrderOptionsLoading] = useState(true);
  const [styleOptions, setStyleOptions] = useState([]);
  const [styleOptionsLoading, setStyleOptionsLoading] = useState(true);

  const [selectedRun, setSelectedRun] = useState(null);
  const [runBreakdown, setRunBreakdown] = useState(null);
  const [runPieces, setRunPieces] = useState(null);
  const [detailTab, setDetailTab] = useState('style'); // style | stage | employee | pieces
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailSearch, setDetailSearch] = useState(''); // filters whichever tab is active; cleared on tab switch
  // Per Piece tab only: column-wise filters, on top of the free-text search above.
  const [pieceFilterStage, setPieceFilterStage] = useState('');
  const [pieceFilterEmployee, setPieceFilterEmployee] = useState('');

  // `background` skips the full-page spinner so the auto-refresh-on-tab-switch
  // below doesn't flash the whole list to a loading state — only the manual
  // Refresh button and the initial mount show that.
  const loadLedger = (background = false) => {
    if (background) setIsRefreshing(true); else setLoading(true);
    apiGetWageLedger(token, {
      orderNumber: orderSearch || undefined,
      styleCode: styleSearch || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      status: statusFilter || undefined,
      limit: 100,
    })
      .then((data) => setRuns(Array.isArray(data?.items) ? data.items : []))
      .catch(() => setRuns([]))
      .finally(() => { setLoading(false); setIsRefreshing(false); });
  };

  useEffect(() => {
    loadLedger();
    apiGetWageOrders(token)
      .then((data) => setOrderOptions(Array.isArray(data) ? data : []))
      .catch(() => setOrderOptions([]))
      .finally(() => setOrderOptionsLoading(false));
    apiGetWageStyles(token, {})
      .then((data) => setStyleOptions(Array.isArray(data) ? data : []))
      .catch(() => setStyleOptions([]))
      .finally(() => setStyleOptionsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Ledger stays mounted (just hidden) when another Payroll tab is active, so
  // a run computed while on Run Engine never shows up here until this fires —
  // re-pull the list every time the operator switches back into this tab.
  const isFirstActivate = useRef(true);
  useEffect(() => {
    if (!isActive) return;
    if (isFirstActivate.current) { isFirstActivate.current = false; return; }
    loadLedger(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  // Group latest-first ledger rows by scope (order / style / whole
  // factory) for the "order card -> date -> style" nesting the spec asks
  // for — the backend already returns latest-computed-first, we only group.
  const grouped = useMemo(() => {
    const groups = new Map();
    runs.forEach((r) => {
      const key = r.scope_order_number || r.scope_style_code || 'Whole Factory';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });
    return Array.from(groups.entries());
  }, [runs]);

  const handleOpenRun = async (run) => {
    setSelectedRun(run);
    setDetailTab('style');
    setDetailSearch('');
    setPieceFilterStage('');
    setPieceFilterEmployee('');
    setDetailsLoading(true);
    setRunBreakdown(null);
    setRunPieces(null);
    try {
      const [bd, pieces] = await Promise.all([
        apiGetWageRunBreakdown(token, run.run_id),
        apiGetWageRunPieces(token, run.run_id, { limit: 200 }),
      ]);
      setRunBreakdown(bd);
      setRunPieces(pieces);
    } catch (err) {
      console.warn('Failed to load run details', err);
    } finally {
      setDetailsLoading(false);
    }
  };

  // One workbook, 4 sheets — matches the 4 detail tabs above exactly, so the
  // download is never missing something the screen shows (or vice versa).
  const handleDownloadWorkbook = () => {
    if (!selectedRun) return;
    const fmtAmount = (v) => (v === null || v === undefined ? 'Not priced' : v);

    const styleRows = (runBreakdown?.by_style || []).map((s) => ({
      Style: s.style_name || s.style_code, 'Style Code': s.style_code,
      Pieces: s.pieces ?? 0, Amount: fmtAmount(s.amount),
    }));
    const stageRows = (runBreakdown?.by_stage || []).map((s) => ({
      Stage: s.operation_label || s.operation_code, Sequence: s.sequence,
      Pieces: s.pieces ?? 0, Amount: fmtAmount(s.amount),
    }));
    const employeeRows = (runBreakdown?.by_employee || []).map((e) => ({
      Employee: e.employee_name || 'Worker', Designation: e.designation || '',
      Pieces: e.pieces ?? 0, Amount: fmtAmount(e.amount),
    }));
    const pieceRows = (runPieces?.items || []).map((p) => ({
      'Piece Code': p.piece_code, Style: p.style_name || p.style_code,
      Colour: p.colour || '', Size: p.size || '',
      Stage: p.operation_label || p.operation_code,
      Employee: p.employee_name || '', 'Employee Barcode': p.employee_barcode || '',
      Designation: p.designation || '', 'Work Date': p.work_date || '',
      Qty: p.qty ?? '', Rate: fmtAmount(p.rate), Amount: fmtAmount(p.amount),
      Note: p.note || '',
    }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(styleRows.length ? styleRows : [{ Info: 'No data' }]), 'Per Style');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(stageRows.length ? stageRows : [{ Info: 'No data' }]), 'Per Stage');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(employeeRows.length ? employeeRows : [{ Info: 'No data' }]), 'Per Employee');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(pieceRows.length ? pieceRows : [{ Info: 'No data' }]), 'Per Piece');

    const scopeName = (selectedRun.scope_order_number || selectedRun.scope_style_code || 'Whole_Factory').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Payroll_${scopeName}_${selectedRun.period_start}_to_${selectedRun.period_end}.xlsx`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 opacity-60">
        <Loader2 className="w-10 h-10 animate-spin text-[#c8834a] mb-4" />
      </div>
    );
  }

  // Team request: a search box per detail tab, filtering that tab's rows,
  // plus a "download what's filtered" button next to it — separate from
  // the existing "download everything" workbook button above.
  const searchNorm = detailSearch.trim().toLowerCase();
  const filteredByStyle = (runBreakdown?.by_style || []).filter((s) => !searchNorm || `${s.style_name || ''} ${s.style_code || ''}`.toLowerCase().includes(searchNorm));
  const filteredByStage = (runBreakdown?.by_stage || []).filter((s) => !searchNorm || `${s.operation_label || ''} ${s.operation_code || ''}`.toLowerCase().includes(searchNorm));
  const filteredByEmployee = (runBreakdown?.by_employee || []).filter((e) => !searchNorm || `${e.employee_name || ''} ${e.designation || ''}`.toLowerCase().includes(searchNorm));
  const pieceStageOptions = Array.from(new Set((runPieces?.items || []).map((p) => p.operation_label || p.operation_code).filter(Boolean)));
  const pieceEmployeeOptions = Array.from(new Set((runPieces?.items || []).map((p) => p.employee_name).filter(Boolean)));
  const filteredPieces = (runPieces?.items || []).filter((p) =>
    (!searchNorm || `${p.piece_code || ''} ${p.employee_name || ''} ${p.employee_barcode || ''} ${p.operation_label || ''}`.toLowerCase().includes(searchNorm)) &&
    (!pieceFilterStage || (p.operation_label || p.operation_code) === pieceFilterStage) &&
    (!pieceFilterEmployee || p.employee_name === pieceFilterEmployee)
  );

  const handleDownloadFiltered = () => {
    if (!selectedRun) return;
    const fmtAmount = (v) => (v === null || v === undefined ? 'Not priced' : v);
    let rows = []; let sheetName = '';
    if (detailTab === 'style') {
      sheetName = 'Per Style';
      rows = filteredByStyle.map((s) => ({ Style: s.style_name || s.style_code, 'Style Code': s.style_code, Pieces: s.pieces ?? 0, Amount: fmtAmount(s.amount) }));
    } else if (detailTab === 'stage') {
      sheetName = 'Per Stage';
      rows = filteredByStage.map((s) => ({ Stage: s.operation_label || s.operation_code, Pieces: s.pieces ?? 0, Amount: fmtAmount(s.amount) }));
    } else if (detailTab === 'employee') {
      sheetName = 'Per Employee';
      rows = filteredByEmployee.map((e) => ({ Employee: e.employee_name || 'Worker', Designation: e.designation || '', Pieces: e.pieces ?? 0, Amount: fmtAmount(e.amount) }));
    } else {
      sheetName = 'Per Piece';
      rows = filteredPieces.map((p) => ({
        'Piece Code': p.piece_code, Stage: p.operation_label || p.operation_code,
        Employee: p.employee_name || '', 'Employee Barcode': p.employee_barcode || '', Amount: fmtAmount(p.amount),
      }));
    }
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows.length ? rows : [{ Info: 'No matching rows' }]), sheetName);
    const scopeName = (selectedRun.scope_order_number || selectedRun.scope_style_code || 'Whole_Factory').replace(/\s+/g, '_');
    XLSX.writeFile(wb, `Payroll_${scopeName}_${sheetName.replace(/\s+/g, '_')}_filtered.xlsx`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── SEARCH BAR ── */}
      <div className="bg-white p-5 rounded-3xl shadow-sm border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3" style={{ borderColor: 'rgba(200,131,74,0.15)' }}>
        <SearchCombobox
          placeholder="Order number..."
          value={orderSearch}
          options={orderOptions}
          getKey={(o) => o.order_number}
          getLabel={(o) => `PO ${o.order_number}`}
          getSub={(o) => `${o.styles} styles`}
          onSelect={(o) => setOrderSearch(o ? o.order_number : '')}
          loading={orderOptionsLoading}
          allowClear
        />
        <SearchCombobox
          placeholder="Style code..."
          value={styleSearch}
          options={styleOptions}
          getKey={(s) => s.style_code}
          getLabel={(s) => s.style_code}
          getSub={(s) => s.style_name}
          onSelect={(s) => setStyleSearch(s ? s.style_code : '')}
          loading={styleOptionsLoading}
          allowClear
        />
        <input type="date" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
        <input type="date" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-12 px-4 bg-slate-50 rounded-xl font-bold text-xs outline-none border focus:border-[#c8834a]" style={{ borderColor: 'rgba(200,131,74,0.15)' }} />
        <div className="flex gap-2">
          <SimpleSelect
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { value: '', label: 'All Status' },
              { value: 'open', label: 'Draft' },
              { value: 'closed', label: 'Frozen' },
            ]}
          />
          <button onClick={() => loadLedger()} className="h-12 px-4 rounded-xl font-black text-xs uppercase text-white shrink-0" style={{ background: '#c8834a' }}>
            <Search className="w-4 h-4" />
          </button>
          <button
            onClick={() => loadLedger(true)}
            disabled={isRefreshing}
            title="Refresh ledger"
            className="h-12 px-4 rounded-xl font-black text-xs uppercase shrink-0 bg-white border disabled:opacity-50"
            style={{ borderColor: 'rgba(200,131,74,0.2)', color: '#c8834a' }}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {runs.length === 0 ? (
        <div className="py-24 text-center bg-white/50 backdrop-blur-sm rounded-3xl border border-dashed border-slate-300">
          <History className="w-12 h-12 mx-auto text-slate-300 mb-4" />
          <p className="font-bold text-slate-400">No wage runs match this search.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {grouped.map(([scopeKey, groupRuns]) => (
            <div key={scopeKey} className="space-y-3">
              <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 pl-1" style={{ color: '#9a7a5a' }}>
                <Warehouse className="w-4 h-4" style={{ color: '#c8834a' }} /> {scopeKey}
                <span className="font-bold normal-case text-slate-400">({groupRuns.length} run{groupRuns.length !== 1 ? 's' : ''})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {groupRuns.map((run) => (
                  <SpotlightCard
                    key={run.run_id}
                    onClick={() => handleOpenRun(run)}
                    className="bg-white p-5 rounded-3xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border flex flex-col justify-between cursor-pointer group"
                    style={{ borderColor: 'rgba(200,131,74,0.15)' }}
                    spotlightColor="rgba(200,131,74,0.06)"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="bg-[#faf6f0] p-2.5 rounded-xl border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        <Calendar className="w-5 h-5" style={{ color: '#c8834a' }} />
                      </div>
                      <StatusBadge status={run.status} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Pay Cycle</p>
                    <h4 className="font-black text-sm" style={{ color: '#2d1f0e' }}>{run.period_start} <span className="opacity-40 px-1">to</span> {run.period_end}</h4>
                    <p
                      className="font-mono text-[9px] font-bold text-slate-300 mt-1 truncate"
                      title={run.run_id}
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(run.run_id || ''); }}
                    >
                      {run.run_id}
                    </p>
                    <div className="mt-4 pt-4 flex items-center justify-between" style={{ borderTop: '1px solid rgba(200,131,74,0.1)' }}>
                      {/* <div>
                        <p className="text-[10px] font-bold text-slate-400">Total</p>
                        <p className="font-black" style={{ color: '#10b981' }}><Money value={run.total_amount} /></p>
                      </div> */}
                      <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-[#c8834a] group-hover:translate-x-1 transition-all" />
                    </div>
                  </SpotlightCard>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── RUN DETAIL MODAL: style / stage / employee / pieces ── */}
      {selectedRun && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 flex items-center justify-center p-4 z-[99999] bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-50 rounded-[2.5rem] w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] mx-4">
            <div className="p-6 sm:p-8 pb-4 bg-white relative shrink-0">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-black text-2xl" style={{ color: '#2d1f0e' }}>{selectedRun.scope_order_number || selectedRun.scope_style_code || 'Whole Factory'}</h3>
                  <div className="flex gap-3 mt-2 flex-wrap items-center">
                    <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-md">{selectedRun.period_start} to {selectedRun.period_end}</span>
                    <StatusBadge status={selectedRun.status} />
                    {/* Team asked "where do I get a run id" for Run Actions
                        (Recompute/Close/Reopen) — it was never shown
                        anywhere in the UI. Copyable here now. */}
                    <button
                      type="button"
                      onClick={() => { navigator.clipboard?.writeText(selectedRun.run_id || ''); }}
                      title="Click to copy run id"
                      className="font-mono text-[10px] font-bold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-md hover:bg-slate-100 cursor-pointer"
                    >
                      {selectedRun.run_id}
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={handleDownloadWorkbook} disabled={detailsLoading} title="Download as Excel — Per Style / Per Stage / Per Employee / Per Piece, one sheet each"
                    className="h-11 px-4 rounded-full font-black text-xs uppercase text-white flex items-center gap-2 disabled:opacity-40" style={{ background: '#c8834a' }}>
                    <Download className="w-4 h-4" /> Download
                  </button>
                  <button onClick={() => setSelectedRun(null)} className="p-3 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                    <X className="w-5 h-5 text-slate-600" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
                <div className="flex gap-1 p-1 rounded-full bg-slate-100 w-fit">
                  {[
                    { id: 'style', label: 'Per Style' },
                    { id: 'stage', label: 'Per Stage' },
                    { id: 'employee', label: 'Per Employee' },
                    { id: 'pieces', label: 'Per Piece' },
                  ].map((t) => (
                    <button key={t.id} onClick={() => { setDetailTab(t.id); setDetailSearch(''); setPieceFilterStage(''); setPieceFilterEmployee(''); }} className={`px-4 py-2 rounded-full font-bold text-[11px] transition-all ${detailTab === t.id ? 'bg-white shadow-sm' : 'text-slate-500'}`} style={detailTab === t.id ? { color: '#c8834a' } : {}}>
                      {t.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    <input
                      type="text"
                      value={detailSearch}
                      onChange={(e) => setDetailSearch(e.target.value)}
                      placeholder={detailTab === 'pieces' ? 'Search piece code, employee…' : 'Search this tab…'}
                      className="h-9 pl-8 pr-3 w-48 sm:w-64 bg-slate-50 border rounded-full font-bold text-xs outline-none focus:border-[#c8834a]"
                      style={{ borderColor: 'rgba(200,131,74,0.2)' }}
                    />
                  </div>
                  <button onClick={handleDownloadFiltered} disabled={detailsLoading} title="Download only what's shown in this tab right now"
                    className="h-9 px-3 rounded-full font-black text-[10px] uppercase bg-white border shadow-sm flex items-center gap-1.5 disabled:opacity-40" style={{ color: '#4a3a2a', borderColor: 'rgba(200,131,74,0.2)' }}>
                    <Download className="w-3.5 h-3.5" /> Download filtered
                  </button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 sm:p-8">
              {detailsLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} /></div>
              ) : (
                <>
                  {detailTab === 'style' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredByStyle.map((s, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="font-black text-base text-slate-800">{s.style_name || s.style_code}</h5>
                              <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{s.pieces ?? 0} pieces</p>
                            </div>
                            <p className="font-black text-lg text-emerald-600"><Money value={s.amount} /></p>
                          </div>
                        </div>
                      ))}
                      {filteredByStyle.length === 0 && <p className="text-sm font-bold text-slate-400 col-span-full text-center py-6">{searchNorm ? 'No matches.' : 'No data.'}</p>}
                    </div>
                  )}

                  {detailTab === 'stage' && (
                    <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="font-bold uppercase tracking-wider text-xs" style={{ color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.15)' }}>
                            <th className="py-3 px-4">Stage</th><th className="py-3 px-4">Pieces</th><th className="py-3 px-4">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredByStage.map((s, i) => (
                            <tr key={i}>
                              <td className="py-3 px-4 font-bold text-slate-800">{s.operation_label || s.operation_code}</td>
                              <td className="py-3 px-4 font-bold" style={{ color: '#c8834a' }}>{s.pieces ?? 0}</td>
                              <td className="py-3 px-4 font-black text-emerald-600"><Money value={s.amount} /></td>
                            </tr>
                          ))}
                          {filteredByStage.length === 0 && <tr><td colSpan="3" className="py-8 text-center text-slate-400 font-bold">{searchNorm ? 'No matches.' : 'No data.'}</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {detailTab === 'employee' && (
                    <div className="space-y-3">
                      {filteredByEmployee.map((e, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center">
                          <div>
                            <h5 className="font-black text-base text-slate-800">{e.employee_name || 'Worker'}</h5>
                            <p className="text-[10px] font-black uppercase text-slate-400 mt-1">{e.designation || 'Piece Rate'} · {e.pieces ?? 0} pieces</p>
                          </div>
                          <p className="font-black text-lg text-emerald-600"><Money value={e.amount} /></p>
                        </div>
                      ))}
                      {filteredByEmployee.length === 0 && <p className="text-sm font-bold text-slate-400 text-center py-6">{searchNorm ? 'No matches.' : 'No data.'}</p>}
                    </div>
                  )}

                  {detailTab === 'pieces' && (
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <PortalPillSelect
                          value={pieceFilterStage}
                          onChange={setPieceFilterStage}
                          placeholder="All Stages"
                          options={pieceStageOptions.map((s) => ({ value: s, label: s }))}
                        />
                        <PortalPillSelect
                          value={pieceFilterEmployee}
                          onChange={setPieceFilterEmployee}
                          placeholder="All Employees"
                          options={pieceEmployeeOptions.map((e) => ({ value: e, label: e }))}
                        />
                        {(pieceFilterStage || pieceFilterEmployee) && (
                          <button onClick={() => { setPieceFilterStage(''); setPieceFilterEmployee(''); }} className="text-[10px] font-black uppercase text-slate-400 hover:text-slate-600">Clear column filters</button>
                        )}
                      </div>
                      <div className="bg-white rounded-2xl shadow-sm border overflow-hidden" style={{ borderColor: 'rgba(200,131,74,0.1)' }}>
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="font-bold uppercase tracking-wider" style={{ color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.15)' }}>
                              <th className="py-3 px-3">Piece</th>
                              <th className="py-3 px-3">Stage</th>
                              <th className="py-3 px-3">Employee</th>
                              <th className="py-3 px-3 flex items-center gap-1"><BarcodeIcon className="w-3 h-3" /> Barcode</th>
                              <th className="py-3 px-3">Amount</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {filteredPieces.map((p, i) => (
                              <tr key={i}>
                                <td className="py-2.5 px-3 font-mono font-bold text-slate-700">{p.piece_code}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-500">{p.operation_label || p.operation_code}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-700">{p.employee_name || '—'}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-400">{p.employee_barcode || '—'}</td>
                                <td className="py-2.5 px-3 font-black text-emerald-600"><Money value={p.amount} /></td>
                              </tr>
                            ))}
                            {filteredPieces.length === 0 && <tr><td colSpan="5" className="py-8 text-center text-slate-400 font-bold">{searchNorm ? 'No matches.' : 'No piece-level data.'}</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}