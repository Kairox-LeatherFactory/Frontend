'use client';
import { useState } from 'react';
import { AlertTriangle, Loader2, Trash2, X } from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import {
  useDeleteProductionEventMutation,
  useLazyGetPieceStateQuery,
  useLazyGetProductionEventsQuery,
} from '@/store/slices/apiSlice';
import { useLazyGetOperationsQuery } from '@/store/slices/clientApiSlice';

// DELETE /production/events/{id} is DM · MD only.
export const STAGE_DELETE_ROLES = ['direct_manager', 'managing_director'];

// Derived rows (the STORE overlay) are not production events and can never be deleted.
export function isDeletableStage(entry) {
  return !!entry && !entry.derived && !entry.is_store_overlay;
}

// The event id, when the history read happens to carry one.
export function stageEventId(entry) {
  if (!isDeletableStage(entry)) return null;
  return entry.event_id || entry.production_event_id || entry.id || null;
}

// "Leather Cutting", "leather cutting", "LEATHER_CUTTING", "Package & export" → one form.
const normStage = (s) => String(s || '').trim().toLowerCase().replace(/[\s&_-]+/g, '_');
const asList = (res) => (Array.isArray(res) ? res : res?.items || []);

function deleteErrText(err) {
  if (err?.status === 409) {
    return 'This entry is inside a closed payroll run and cannot be deleted. Fix it with a payroll adjustment instead.';
  }
  if (err?.status === 403) return 'Only the Direct Manager or Managing Director can delete a stage entry.';
  const d = err?.data?.detail ?? err?.data?.message;
  if (Array.isArray(d)) return d.map((x) => x.msg).join(', ');
  return (typeof d === 'string' && d) || err?.message || 'Failed to delete the stage entry.';
}

/**
 * Confirm + reason dialog for removing one wrongly-logged production stage.
 * Deleting erases the record and returns any consumed stock, so it asks for a
 * reason (required by the API) and says plainly what will happen.
 *
 * Stage-history reads don't expose event ids, so when the row has none the id
 * is looked up from GET /production/events by piece + stage + work date — and
 * the delete only goes ahead when exactly one event matches.
 *
 * @param {Object|null} props.target - `{ eventId?, stageCode?, stageLabel, employee?, workDate, pieceCode?, pieceId?, skuId? }`, or null when closed.
 * @param {Function} props.onClose - Dismiss without deleting.
 * @param {Function} props.onDeleted - Called after a successful delete (refetch here).
 */
export default function DeleteStageEventModal({ target, onClose, onDeleted }) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [step, setStep] = useState(null); // null | 'finding' | 'deleting'

  const [deleteEvent] = useDeleteProductionEventMutation();
  const [getPieceState] = useLazyGetPieceStateQuery();
  const [getOperations] = useLazyGetOperationsQuery();
  const [getEvents] = useLazyGetProductionEventsQuery();
  const busy = step !== null;

  const resolveEventId = async () => {
    if (target.eventId) return target.eventId;

    const workDate = String(target.workDate || '').slice(0, 10);
    if (!workDate) throw new Error('This entry has no work date, so it cannot be matched to a production event.');

    let pieceId = target.pieceId || null;
    let skuId = target.skuId || null;
    if ((!pieceId || !skuId) && target.pieceCode) {
      try {
        const ps = await getPieceState({ code: target.pieceCode }).unwrap();
        const p = ps?.piece || {};
        pieceId = pieceId || p.piece_id || p.id || ps?.piece_id || null;
        skuId = skuId || p.sku_id || ps?.sku?.sku_id || ps?.sku?.id || ps?.sku_id || null;
      } catch {
        // fall through — pieceId stays unknown and is reported below
      }
    }
    if (!pieceId) throw new Error('Could not identify this piece, so the entry was not deleted.');

    const ops = asList(await getOperations().unwrap());
    const wanted = [target.stageCode, target.stageLabel].filter(Boolean).map(normStage);
    const op = ops.find((o) => wanted.includes(normStage(o.code)) || wanted.includes(normStage(o.label)));
    if (!op) throw new Error(`Could not match the stage "${target.stageLabel}" to a production operation.`);

    const events = asList(await getEvents({ sku_id: skuId || undefined, start: workDate, end: workDate }).unwrap());
    const matches = events.filter((e) =>
      String(e.work_date || '').slice(0, 10) === workDate
      && String(e.operation_id) === String(op.id)
      && String(e.piece_id) === String(pieceId)
    );
    if (matches.length === 0) throw new Error('No matching production event was found for this entry.');
    if (matches.length > 1) {
      throw new Error(`Found ${matches.length} ${target.stageLabel} entries for this piece on ${workDate}, so none were deleted. Ask the backend to include event_id in the stage history.`);
    }
    return matches[0].id;
  };

  const close = () => {
    if (busy) return;
    setReason('');
    setError('');
    onClose();
  };

  const confirm = async () => {
    if (!reason.trim()) {
      setError('A reason is required to delete a stage entry.');
      return;
    }
    setError('');
    try {
      setStep('finding');
      const id = await resolveEventId();
      setStep('deleting');
      await deleteEvent({ id, reason: reason.trim() }).unwrap();
      setStep(null);
      setReason('');
      onDeleted?.();
    } catch (err) {
      setStep(null);
      setError(deleteErrText(err));
    }
  };

  return (
    <AnimatedModal
      isOpen={!!target}
      onClose={close}
      zIndex={999999}
      panelClassName="w-full max-w-md"
      panelStyle={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)', border: '1px solid #e2e8f0', overflow: 'hidden' }}
    >
      {target && (
        <>
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-black text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Delete Stage Entry
              </h3>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-1">
                Irreversible action
              </p>
            </div>
            <button type="button" onClick={close} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-full transition-colors self-start cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-5 space-y-4 bg-slate-50/50 text-left">
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl">
              <p className="text-[11px] font-bold text-red-700">
                You are about to permanently delete the{' '}
                <span className="font-black">{target.stageLabel}</span> entry
                {target.employee ? <> logged for <span className="font-black uppercase">{target.employee}</span></> : null}
                {target.workDate ? <> on <span className="font-black">{target.workDate}</span></> : null}.
                Any stock it consumed is returned. Only do this if the entry should never have been logged.
              </p>
            </div>

            <div>
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block mb-1">Reason for deletion *</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Logged against the wrong piece"
                className="w-full h-11 px-3 text-xs font-bold rounded-xl border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                value={reason}
                onChange={(e) => { setReason(e.target.value); setError(''); }}
                disabled={busy}
              />
            </div>

            {error && (
              <p className="text-[11px] font-bold text-red-600">{error}</p>
            )}
          </div>

          <div className="p-5 bg-white border-t border-slate-100 flex gap-3">
            <button
              type="button"
              onClick={close}
              disabled={busy}
              className="flex-1 py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={busy || !reason.trim()}
              className="flex-1 py-3 px-4 text-white font-extrabold text-xs rounded-xl transition-all cursor-pointer text-center shadow-md active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #e11d48, #9f1239)' }}
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {step === 'finding' ? 'Finding entry…' : step === 'deleting' ? 'Deleting…' : 'Confirm Delete'}
            </button>
          </div>
        </>
      )}
    </AnimatedModal>
  );
}
