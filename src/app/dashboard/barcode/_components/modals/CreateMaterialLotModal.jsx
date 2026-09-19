'use client';
import { useState, useMemo, useEffect } from 'react';
import { X, Package, AlertTriangle, Layers, Loader2, Zap } from 'lucide-react';
import AnimatedModal from '@/components/AnimatedModal';
import { apiGetMaterialSpec, apiCreateMaterialLot } from '@/lib/api';
import { BRAND, selectCls, inputCls, fieldStyle } from '../../_lib/constants';

/**
 * ============================================================================
 * CreateMaterialLotModal Component
 * ============================================================================
 * WHAT IT IS:
 * Modal form for registering a new raw material inventory lot (Leather, Lining, Accessory)
 * and atomically minting its Code-128 tracking barcode.
 *
 * WHY IT EXISTS:
 * Automatically loads category specification rules from `GET /api/v1/materials/spec`
 * and creates both the lot and its opening stock in a single backend transaction
 * (`POST /api/v1/materials/lots`).
 */
export default function CreateMaterialLotModal({ open, onClose, token, showToast, onSuccess }) {
  // --------------------------------------------------------------------------
  // 1. FORM STATE VARIABLES
  // --------------------------------------------------------------------------
  const [category, setCategory] = useState('LEATHER');  // LEATHER | LINING | ACCESSORIES
  const [subtype, setSubtype] = useState('');            // Optional category subtype
  const [article, setArticle] = useState('');            // Article name (required)
  const [colour, setColour] = useState('');              // Color description / hex
  const [thickness, setThickness] = useState('');        // Leather thickness (e.g. 1.2-1.4 mm)
  const [size, setSize] = useState('');                  // Accessory/lining dimension
  const [uom, setUom] = useState('DCM');                 // Unit of measure (DCM, MTRS, PCS, CONES)
  const [onHand, setOnHand] = useState('');              // Opening stock quantity
  const [supplierId, setSupplierId] = useState('');      // Optional supplier reference
  const [spec, setSpec] = useState(null);                // Active category specification rules
  const [submitting, setSubmitting] = useState(false);    // Submission loader
  const [error, setError] = useState(null);               // Validation/API error message

  // --------------------------------------------------------------------------
  // 2. SUBTYPE OPTIONS BY CATEGORY
  // --------------------------------------------------------------------------
  const subtypes = useMemo(() => {
    if (category === 'LINING') return ['PLAIN_LINING', 'RIBS', 'KNIT'];
    if (category === 'ACCESSORIES' || category === 'ACCESSORY') return ['BUTTON', 'ZIP', 'THREAD', 'OTHER'];
    return [];
  }, [category]);

  // --------------------------------------------------------------------------
  // 3. FETCH SPECIFICATION RULES ON CATEGORY CHANGE
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!open || !token) return;
    let isCurrent = true;
    setError(null);

    apiGetMaterialSpec(token, { category, subtype: subtype || undefined })
      .then((data) => {
        if (!isCurrent) return;
        setSpec(data);
        if (data?.uom) setUom(data.uom);
        else if (category === 'LEATHER') setUom('DCM');
        else if (category === 'LINING') setUom('MTRS');
        else setUom('PCS');
      })
      .catch(() => {
        if (!isCurrent) return;
        setSpec(null);
        if (category === 'LEATHER') setUom('DCM');
        else if (category === 'LINING') setUom('MTRS');
        else setUom('PCS');
      });

    return () => { isCurrent = false; };
  }, [open, token, category, subtype]);

  // --------------------------------------------------------------------------
  // 4. FORM VALIDATION & SUBMISSION HANDLER
  // --------------------------------------------------------------------------
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate article name
    if (!article.trim()) {
      setError('Article name is required.');
      return;
    }

    // Validate opening quantity
    const qtyNum = parseFloat(onHand);
    if (isNaN(qtyNum) || qtyNum <= 0) {
      setError('Opening quantity (on_hand) must be a positive number.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      // Build payload matching backend POST /api/v1/materials/lots schema
      const payload = {
        category,
        article: article.trim(),
        on_hand: qtyNum,
        uom: uom || (category === 'LEATHER' ? 'DCM' : category === 'LINING' ? 'MTRS' : 'PCS'),
      };
      if (subtype) payload.subtype = subtype;
      if (colour.trim()) payload.colour = colour.trim();
      if (category === 'LEATHER' && thickness.trim()) payload.thickness = thickness.trim();
      if (category !== 'LEATHER' && size.trim()) payload.size = size.trim();
      if (supplierId.trim()) payload.supplier_id = supplierId.trim();

      const res = await apiCreateMaterialLot(token, payload);
      showToast(`Material Lot created! Barcode: ${res?.barcode || res?.lot_id}`, 'success');
      onSuccess?.(res, payload);
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to create material lot.');
    } finally {
      setSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // 5. RENDER MODAL FORM
  // --------------------------------------------------------------------------
  return (
    <AnimatedModal
      isOpen={open}
      onClose={onClose}
      zIndex={2000}
      panelClassName="rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden"
      panelStyle={{ background: '#fff', border: `1.8px solid ${BRAND.border}` }}
    >
      {/* --- Modal Header Bar --- */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ background: BRAND.bg, borderBottom: `1.5px solid ${BRAND.border}` }}
      >
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5" style={{ color: BRAND.accent }} />
          <h3 className="font-bold text-base" style={{ color: '#5a3518' }}>
            Create Material Lot &amp; Barcode
          </h3>
        </div>
        <button onClick={onClose} aria-label="Close modal">
          <X className="w-5 h-5" style={{ color: BRAND.textMuted }} />
        </button>
      </div>

      {/* --- Main Lot Creation Form --- */}
      <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
        <p className="text-xs" style={{ color: BRAND.textMuted }}>
          Registers a child barcode in the registry and adds opening stock in one transaction (
          <code className="font-mono text-xs font-bold text-[#a86530]">POST /api/v1/materials/lots</code>).
        </p>

        {/* Error Alert Box */}
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Row 1: Category & Subtype */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubtype('');
              }}
              className={selectCls}
              style={fieldStyle}
            >
              <option value="LEATHER">LEATHER</option>
              <option value="LINING">LINING</option>
              <option value="ACCESSORIES">ACCESSORIES</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
              Subtype {subtypes.length > 0 ? '(Optional)' : ''}
            </label>
            {subtypes.length > 0 ? (
              <select
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                className={selectCls}
                style={fieldStyle}
              >
                <option value="">Standard / None</option>
                {subtypes.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            ) : (
              <input
                type="text"
                placeholder="e.g. COW_HIDE"
                value={subtype}
                onChange={(e) => setSubtype(e.target.value)}
                className={inputCls}
                style={fieldStyle}
              />
            )}
          </div>
        </div>

        {/* Row 2: Article Name & Colour */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
              Article Name *
            </label>
            <input
              type="text"
              placeholder="e.g. VINTAGE BROWN COWHIDE"
              value={article}
              onChange={(e) => setArticle(e.target.value)}
              className={inputCls}
              style={fieldStyle}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
              Colour
            </label>
            <input
              type="text"
              placeholder="e.g. DARK BROWN / #4A2E18"
              value={colour}
              onChange={(e) => setColour(e.target.value)}
              className={inputCls}
              style={fieldStyle}
            />
          </div>
        </div>

        {/* Row 3: Thickness / Size, Opening Quantity, Unit of Measure */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {category === 'LEATHER' ? (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
                Thickness
              </label>
              <input
                type="text"
                placeholder="e.g. 1.2 - 1.4 mm"
                value={thickness}
                onChange={(e) => setThickness(e.target.value)}
                className={inputCls}
                style={fieldStyle}
              />
            </div>
          ) : (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
                Size / Dimension
              </label>
              <input
                type="text"
                placeholder="e.g. 5# / 32 / Medium"
                value={size}
                onChange={(e) => setSize(e.target.value)}
                className={inputCls}
                style={fieldStyle}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
              Opening Qty (on_hand) *
            </label>
            <input
              type="number"
              step="any"
              min="0.01"
              placeholder="e.g. 250"
              value={onHand}
              onChange={(e) => setOnHand(e.target.value)}
              className={inputCls}
              style={fieldStyle}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
              Unit of Measure (UOM)
            </label>
            <select
              value={uom}
              onChange={(e) => setUom(e.target.value)}
              className={selectCls}
              style={fieldStyle}
            >
              <option value="DCM">DCM (Decimeters)</option>
              <option value="MTRS">MTRS (Meters)</option>
              <option value="PCS">PCS (Pieces)</option>
              <option value="CONES">CONES (Thread Cones)</option>
            </select>
          </div>
        </div>

        {/* Row 4: Supplier Reference */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wide mb-1" style={{ color: BRAND.textMuted }}>
            Supplier (Optional UUID or Reference)
          </label>
          <input
            type="text"
            placeholder="e.g. SUP-TANNERY-01"
            value={supplierId}
            onChange={(e) => setSupplierId(e.target.value)}
            className={inputCls}
            style={fieldStyle}
          />
        </div>

        {/* Category Specification Active Banner */}
        {spec && (
          <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-[11px] space-y-1 text-amber-900">
            <div className="font-bold flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-amber-700" /> Category Spec Active
            </div>
            <p className="text-amber-800">
              Standard UOM: <span className="font-mono font-bold">{spec.uom || uom}</span> · Required fields:{' '}
              <span className="font-bold">
                {Array.isArray(spec.required_to_add) ? spec.required_to_add.join(', ') : 'article, on_hand'}
              </span>
            </p>
          </div>
        )}

        {/* --- Form Action Buttons --- */}
        <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
          <button type="button" onClick={onClose} className="btn-warm-secondary !min-h-0 !py-2.5">
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="btn-warm-primary !min-h-0 !py-2.5 disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>Create Lot &amp; Mint Barcode</span>
          </button>
        </div>
      </form>
    </AnimatedModal>
  );
}
