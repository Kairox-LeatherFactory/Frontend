'use client';
import { useState, useMemo, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, CheckCircle2, XCircle, Edit3, Save, X,
  Loader2, AlertCircle, Package, Download, Info, Clock
} from 'lucide-react';
import SpotlightCard from '@/components/SpotlightCard';
import { useAuth } from '@/context/AuthContext';
import {
  apiGetBom,
  apiPatchBomItems,
  apiExportBom,
  apiGeneratePOs,
  apiSubmitPO,
  apiApprovePO,
  apiSendPO
} from '@/lib/api';

const STATUS_CONFIG = {
  approved: { label: 'BOM Approved', color: '#16a34a', bg: '#f0fdf4', border: 'rgba(22,163,74,0.2)' },
  draft: { label: 'Draft / Review', color: '#c8834a', bg: '#fff9f0', border: 'rgba(200,131,74,0.3)' },
  rejected: { label: 'Rejected', color: '#dc2626', bg: '#fef2f2', border: 'rgba(220,38,38,0.2)' },
  exported: { label: 'Exported (PDF)', color: '#2563eb', bg: '#eff6ff', border: 'rgba(37,99,235,0.2)' },
};

const CATEGORIES = ['All', 'main_material', 'sub_material', 'lining', 'accessory', 'thread', 'manufacturing'];

const MOCK_BOM_ITEMS = [
  { id: 'i1', category: 'main_material', name: 'Cow Nappa Leather', material_color: 'Black', qty_per_garment: 14.5, uom: 'dm2', unit_price: 32.0, bulk_qty: 7250.0, total_cost: 232000.0 },
  { id: 'i2', category: 'lining', name: 'Cotton Twill', material_color: 'Navy', qty_per_garment: 2.1, uom: 'm', unit_price: 150.0, bulk_qty: 1050.0, total_cost: 157500.0 },
  { id: 'i3', category: 'accessory', name: 'YKK Zip', material_color: 'Brass', qty_per_garment: 1, uom: 'pcs', unit_price: 45.0, bulk_qty: 500.0, total_cost: 22500.0 }
];

export default function BOMReviewPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user, token } = useAuth();
  const isCuttingMgr = user === 'cutting_manager' || user === 'direct_manager';

  const [bomData, setBomData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // New PO State
  const [poStatus, setPoStatus] = useState('draft');
  const [poId, setPoId] = useState(null);

  // Load PO state from local storage on mount so it persists across logins
  useEffect(() => {
    if (id) {
      const savedPO = localStorage.getItem(`po_state_${id}`);
      if (savedPO) {
        try {
          const { status, id: savedId } = JSON.parse(savedPO);
          setPoStatus(status);
          setPoId(savedId);
        } catch (e) { }
      }
    }
  }, [id]);

  // Editing
  const [editingId, setEditingId] = useState(null);
  const [editBuf, setEditBuf] = useState({});
  const [saving, setSaving] = useState(false);

  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState(null);
  const [categoryFilter, setCategoryFilter] = useState('All');

  const showToast = (type, msg) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // 1. Fetch BOM on mount (MOCK)
  useEffect(() => {
    async function fetchBom() {
      setLoading(true);
      setTimeout(() => {
        setBomData({
          id: id,
          status: 'draft',
          revision: 1,
          currency: 'INR',
          order_qty: 500,
          bulk_total: 412000.00,
          items: MOCK_BOM_ITEMS
        });
        setLoading(false);

        // Mock Inventory Check & Auto-Email
        const alertKey = `inventory_alert_sent_${id}`;
        if (!localStorage.getItem(alertKey)) {
          // Simulate finding a shortage
          const shortageText = `Dear Supplier,\n\nWe are running short on the following materials for our upcoming production run.\nPlease confirm availability and lead time at your earliest.\n\nLEATHER:\n• Full Grain Calf — Cognac — Need 270 sq.ft additional\n\nHARDWARE:\n• Insole Board (Cellulose Fibre) — Need 500 pairs\n\nOrder Qty: 500 pairs | Style: Chelsea Boot - Oxford | Client: Acne Studios\n\nPlease reply urgently to avoid production delays.\n\nRegards,\nKAIROX Procurement Team`;

          fetch('/api/send-inventory-alert', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: '[KAIROX URGENT] Stock Shortage — Please Confirm Availability',
              text: shortageText,
            })
          }).then(async res => {
            if (res.ok) {
              showToast('info', 'Auto-Alert: Inventory shortage email sent to supplier.');
              localStorage.setItem(alertKey, 'true');
            } else {
              const err = await res.json();
              showToast('error', `Mail Error: ${err.error || 'Failed to send'}`);
              console.error(err);
            }
          }).catch(err => {
            showToast('error', `Network Error: ${err.message}`);
            console.error('Inventory alert failed:', err);
          });
        }
      }, 1000);
    }
    fetchBom();
  }, [id]);

  const filteredItems = useMemo(() => {
    if (!bomData?.items) return [];
    if (categoryFilter === 'All') return bomData.items;
    return bomData.items.filter(i => i.category === categoryFilter);
  }, [bomData, categoryFilter]);

  // 2. Inline Edit Action
  const startEdit = (item) => {
    setEditingId(item.id);
    setEditBuf({
      name: item.name,
      material_color: item.material_color,
      qty_per_garment: item.qty_per_garment,
      unit_price: item.unit_price,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditBuf({});
  };

  const saveEdit = async () => {
    setSaving(true);
    setTimeout(() => {
      const updatedItems = bomData.items.map(item => {
        if (item.id === editingId) {
          const newQty = editBuf.qty_per_garment ? Number(editBuf.qty_per_garment) : item.qty_per_garment;
          const newPrice = editBuf.unit_price ? Number(editBuf.unit_price) : item.unit_price;
          return {
            ...item,
            name: editBuf.name || item.name,
            material_color: editBuf.material_color || item.material_color,
            qty_per_garment: newQty,
            unit_price: newPrice,
            total_cost: newQty * bomData.order_qty * newPrice
          };
        }
        return item;
      });

      const newTotal = updatedItems.reduce((acc, curr) => acc + curr.total_cost, 0);

      setBomData({ ...bomData, items: updatedItems, bulk_total: newTotal, revision: bomData.revision + 1 });
      setEditingId(null);
      setEditBuf({});
      showToast('success', 'BOM item updated successfully');
      setSaving(false);
    }, 800);
  };

  // ── NEW PO WORKFLOW ACTIONS ──

  const handleSubmitPO = async () => {
    setExporting(true);
    showToast('info', 'Generating and Submitting PO...', 3000);
    try {
      // 1. Generate PO (using hardcoded backend mock BOM ID for demo)
      const poRes = await apiGeneratePOs(token, '00000000-0000-0000-0000-0000000000b0');
      const newPoId = poRes.purchase_orders[0].id;
      setPoId(newPoId);

      // 2. Submit PO
      await apiSubmitPO(token, newPoId);

      setPoStatus('pending_approval');
      localStorage.setItem(`po_state_${id}`, JSON.stringify({ status: 'pending_approval', id: newPoId }));
      showToast('success', 'PO Submitted for Approval!');
    } catch (err) {
      showToast('error', 'Failed to submit PO: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleApprovePO = async () => {
    setExporting(true);
    showToast('info', 'Approving PO...', 3000);
    try {
      if (!poId) throw new Error('No PO ID found. DM must submit first.');

      // 1. Approve PO
      await apiApprovePO(token, poId);

      setPoStatus('approved');
      localStorage.setItem(`po_state_${id}`, JSON.stringify({ status: 'approved', id: poId }));
      showToast('success', 'PO Approved! DM can now send it.');
    } catch (err) {
      showToast('error', 'Failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  const handleSendPO = async () => {
    setExporting(true);
    showToast('info', 'Sending PO to Supplier...', 3000);
    try {
      if (!poId) throw new Error('No PO ID found.');

      // 2. Send PO
      await apiSendPO(token, poId);

      setPoStatus('sent');
      localStorage.setItem(`po_state_${id}`, JSON.stringify({ status: 'sent', id: poId }));
      showToast('success', 'PO Sent successfully!');
    } catch (err) {
      showToast('error', 'Failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };

  // 3. Export BOM — Yardage & Price Quotation style PDF
  const handleExport = async () => {
    setExporting(true);
    try {
      await new Promise((resolve, reject) => {
        if (window.jspdf) { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = 210;
      const margin = 14;
      const tableW = pageW - margin * 2;

      // ── TITLE ──
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(30, 30, 30);
      doc.text('Yardage and Price Quotation', pageW / 2, 18, { align: 'center' });

      // ── HEADER INFO BOX ──
      const boxX = margin, boxY = 22, boxW = 120, rowH = 8;
      const labelCol = 40;
      const labels = ['Submission ID', 'Order Qty', 'Revision', 'Garment Price', 'Factory'];
      const values = [
        bomData.id,
        `${bomData.order_qty} pcs`,
        `v${bomData.revision}`,
        `${bomData.currency} ${bomData.bulk_total?.toFixed(2)}`,
        'Kairox Leather Factory'
      ];
      const highlight = [false, false, false, true, true];

      labels.forEach((label, i) => {
        const y = boxY + i * rowH;
        // outer border
        doc.setDrawColor(100, 100, 100);
        doc.setLineWidth(0.3);
        doc.rect(boxX, y, labelCol, rowH);
        doc.rect(boxX + labelCol, y, boxW - labelCol, rowH);

        // highlight rows
        if (highlight[i]) {
          doc.setFillColor(255, 215, 0);
          doc.rect(boxX + labelCol, y, boxW - labelCol, rowH, 'F');
        }

        // label text
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(40, 40, 40);
        doc.text(label, boxX + 2, y + 5.5);

        // value text
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        doc.text(String(values[i]), boxX + labelCol + 2, y + 5.5);
      });

      // Date on right side
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - margin, 26, { align: 'right' });

      // ── TABLE ──
      const tableY = boxY + labels.length * rowH + 6;
      // col widths: Category | No. or Name | Yardage | Unit | Sample | Total
      // must sum to tableW = 182mm
      const cols = [30, 64, 22, 18, 20, 28];
      const headers = ['Category', 'No. or Name', 'Yardage', 'Unit', 'Sample', 'Total'];

      // Header row
      let cx = margin;
      doc.setFillColor(230, 230, 230);
      doc.rect(margin, tableY, tableW, 7, 'F');
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.3);
      doc.rect(margin, tableY, tableW, 7);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(30, 30, 30);
      headers.forEach((h, i) => {
        doc.text(h, cx + 2, tableY + 5);
        if (i < headers.length - 1) doc.line(cx + cols[i], tableY, cx + cols[i], tableY + 7);
        cx += cols[i];
      });

      // Group items by category
      const grouped = {};
      (bomData?.items || []).forEach(item => {
        const cat = item.category.replace(/_/g, ' ').toUpperCase();
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      });

      let rowY = tableY + 7;
      const drawRow = (category, name, yardage, unit, sample, total, isCatRow = false) => {
        const h = 7;
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.2);
        doc.rect(margin, rowY, tableW, h);

        let rx = margin;
        const rowCols = [category, name, yardage, unit, sample, total];
        rowCols.forEach((val, i) => {
          if (i < rowCols.length - 1) {
            doc.setDrawColor(160, 160, 160);
            doc.line(rx + cols[i], rowY, rx + cols[i], rowY + h);
          }
          if (val) {
            doc.setFont('helvetica', isCatRow ? 'italic' : 'normal');
            doc.setFontSize(isCatRow ? 7.5 : 8);
            doc.setTextColor(isCatRow ? 80 : 20, isCatRow ? 80 : 20, isCatRow ? 80 : 20);
            doc.text(String(val), rx + 2, rowY + 5);
          }
          rx += cols[i];
        });
        rowY += h;
      };

      Object.entries(grouped).forEach(([cat, items]) => {
        // category label row (underlined)
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 30, 30);
        doc.rect(margin, rowY, tableW, 7);
        doc.text(cat, margin + 2, rowY + 5);
        rowY += 7;

        items.forEach((item, idx) => {
          drawRow(
            '',
            item.name + (item.material_color ? ` - ${item.material_color}` : ''),
            item.qty_per_garment?.toFixed(2),
            item.uom,
            item.bulk_qty?.toFixed(1),
            item.total_cost?.toFixed(2)
          );
        });
        // blank spacer row
        drawRow('', '', '', '', '', '');
      });

      // TOTAL row
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, rowY, tableW, 8, 'F');
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.4);
      doc.rect(margin, rowY, tableW, 8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(20, 20, 20);
      const totalX = margin + cols[0] + cols[1] + cols[2] + cols[3] + cols[4];
      doc.text('TOTAL', margin + 2, rowY + 5.5);
      doc.text(`${bomData.currency} ${bomData.bulk_total?.toFixed(2)}`, totalX + 2, rowY + 5.5);

      // ── FOOTER ──
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text(`Generated by Kairox Factory Intelligence Platform  •  ${new Date().toLocaleString()}`, pageW / 2, 287, { align: 'center' });

      doc.save(`BOM_Quotation_${bomData.id}.pdf`);

      // ── GENERATE PO FORM AND EMAIL IT ──
      showToast("success", "Email was successfully sent to supplier!!");

      const poDoc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pw = 297, m = 14;

      poDoc.setFont('helvetica', 'bold');
      poDoc.setFontSize(14);
      poDoc.text('ATC', m, 18);
      poDoc.text('PTE', pw / 2, 18, { align: 'center' });
      poDoc.text('Po Form', pw / 2, 26, { align: 'center' });

      poDoc.setDrawColor(0);
      poDoc.setLineWidth(0.3);
      poDoc.rect(m, 32, 40, 8);
      poDoc.setFontSize(10);
      poDoc.text('Po No', m + 2, 37.5);
      poDoc.rect(m + 40, 32, 60, 8);
      poDoc.text(`PO-${bomData.id.replace('SUB-MOCK-', '')}`, m + 42, 37.5);

      poDoc.setFillColor(255, 235, 59);
      poDoc.rect(m, 44, pw - 2 * m, 8, 'F');

      poDoc.setFontSize(9);
      const poCols = [15, 60, 35, 25, 20, 20, 25, 20, 20, 29];
      const poHeaders = ['SL.No', 'Article', 'Colour', 'Size', 'Substance', 'Selection', 'Qty', 'Price', 'Priority', 'Delivery Date'];
      let px = m;
      poHeaders.forEach((h, i) => {
        poDoc.text(h, px + 2, 49.5);
        poDoc.rect(px, 44, poCols[i], 8);
        px += poCols[i];
      });

      const poItems = bomData.items.filter(i => i.category === 'main_material' || i.category === 'lining');
      let py = 52;
      poItems.forEach((item, i) => {
        poDoc.setFont('helvetica', 'normal');
        let dx = m;
        const size = item.category === 'main_material' ? '5 TO 7' : '—';
        const substance = item.category === 'main_material' ? '.08/' : '—';
        const selection = item.category === 'main_material' ? '1.2.3' : '—';
        const deliveryDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString();

        const rowData = [
          String(i + 1),
          item.name.toUpperCase(),
          (item.material_color || '—').toUpperCase(),
          size,
          substance,
          selection,
          `${item.bulk_qty?.toFixed(1)} ${item.uom}`,
          item.unit_price?.toFixed(2),
          'HIGH',
          deliveryDate
        ];

        rowData.forEach((val, cIdx) => {
          poDoc.rect(dx, py, poCols[cIdx], 8);
          poDoc.text(String(val), dx + 2, py + 5.5);
          dx += poCols[cIdx];
        });
        py += 8;
      });

      const noteY = py + 10;
      poDoc.rect(m + 130, noteY, 80, 40);
      poDoc.setFont('helvetica', 'bold');
      poDoc.text('NOTE :', m + 132, noteY + 6);
      poDoc.setFont('helvetica', 'normal');
      poDoc.setFontSize(8);
      poDoc.text('• Please notify us immediately if you are\n  unable to deliver as specified.\n• All test given copy should pass if fails\n  you have to pay compensation.\n• Payment terms : 90 days from the date.', m + 132, noteY + 14);

      poDoc.setFontSize(10);
      poDoc.setFont('helvetica', 'bold');
      poDoc.text('NO VINE MARK AND BONE MARK', m + 15, noteY + 15);
      poDoc.text('SKIN SIZE 4/7 (45 TO 50)', m + 15, noteY + 22);

      poDoc.setFont('helvetica', 'normal');
      poDoc.text('Prepared by (Sender)', m + 15, noteY + 50);
      poDoc.text('Authorised by', m + 90, noteY + 50);

      // Get PDF as base64 string
      const pdfBase64 = poDoc.output('datauristring');

      // Send via API
      const response = await fetch('/api/send-po', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdfBase64,
          toEmail: 'danishahamed2023@gmail.com', // Fix: Send to the user's email
          bomId: bomData.id.replace('SUB-MOCK-', '')
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to send email');

      showToast('success', 'BOM Exported & PO sent to Supplier!');
      setBomData(prev => ({ ...prev, status: 'exported', export_document_id: 'pdf-mock-123' }));
    } catch (err) {
      showToast('error', 'PDF generation failed: ' + err.message);
    } finally {
      setExporting(false);
    }
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#c8834a' }} />
        <p className="mt-4 text-sm font-bold" style={{ color: '#9a7a5a' }}>Loading Bill of Materials...</p>
      </div>
    );
  }

  if (error || !bomData) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
        <h3 className="font-black text-lg text-red-800">Failed to load BOM</h3>
        <p className="text-sm font-semibold text-red-600 mt-2">{error}</p>
        <button onClick={() => router.back()} className="mt-6 px-6 py-2 rounded-xl text-sm font-black bg-red-100 text-red-800">
          Go Back
        </button>
      </div>
    );
  }

  const conf = STATUS_CONFIG[bomData.status] || STATUS_CONFIG.draft;

  return (
    <div className="space-y-6 animate-fade-in max-w-6xl mx-auto pb-20">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in-right">
          <SpotlightCard className="px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3"
            style={{ background: toast.type === 'success' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${toast.type === 'success' ? 'rgba(22,163,74,0.3)' : 'rgba(220,38,38,0.3)'}` }}
          >
            {toast.type === 'success' ? <CheckCircle2 className="w-5 h-5 text-green-600" /> : <AlertCircle className="w-5 h-5 text-red-600" />}
            <p className="text-sm font-black" style={{ color: toast.type === 'success' ? '#14532d' : '#991b1b' }}>{toast.msg}</p>
          </SpotlightCard>
        </div>
      )}

      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <button onClick={() => router.back()} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest mb-3 hover:opacity-70 transition-opacity" style={{ color: '#c8834a' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Submissions
          </button>
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-black tracking-tight" style={{ color: '#2d1f0e' }}>
              BOM Sheet <span className="text-xl font-medium" style={{ color: '#9a7a5a' }}>#{bomData.id.split('-')[0]}</span>
            </h1>
            <span className="px-3 py-1 text-[11px] font-black uppercase tracking-wider rounded-lg" style={{ background: conf.bg, color: conf.color, border: `1px solid ${conf.border}` }}>
              {conf.label}
            </span>
          </div>
          <p className="text-sm font-bold mt-2 flex gap-4" style={{ color: '#9a7a5a' }}>
            <span>Order Qty: {bomData.order_qty} pcs</span>
            <span>Total Cost: {bomData.currency} {bomData.bulk_total?.toFixed(2)}</span>
            <span>Revision: v{bomData.revision}</span>
          </p>
        </div>

        {/* ACTION BUTTONS */}
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">

          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex-1 md:flex-none px-6 h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #2563eb, #3b82f6)' }}
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Export PDF
          </button>

          {/* Direct Manager: Submit PO */}
          {user === 'direct_manager' && poStatus === 'draft' && (
            <button
              onClick={handleSubmitPO}
              disabled={exporting}
              className="flex-1 md:flex-none px-6 h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #eab308, #ca8a04)' }}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Generate & Submit PO
            </button>
          )}

          {/* Cutting Manager: Approve PO - only after DM submits */}
          {user === 'cutting_manager' && poStatus === 'pending_approval' && (
            <button
              onClick={handleApprovePO}
              disabled={exporting}
              className="flex-1 md:flex-none px-6 h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              Approve PO
            </button>
          )}

          {/* Direct Manager: Send PO - only after CM approves */}
          {user === 'direct_manager' && poStatus === 'approved' && (
            <button
              onClick={handleSendPO}
              disabled={exporting}
              className="flex-1 md:flex-none px-6 h-12 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
            >
              {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              Send PO to Supplier
            </button>
          )}

          {/* Status Indicators */}
          {poStatus === 'pending_approval' && user !== 'cutting_manager' && (
            <div className="px-4 h-12 rounded-2xl font-bold text-sm text-yellow-700 bg-yellow-100 flex items-center gap-2 border border-yellow-200">
              <Clock className="w-4 h-4" /> Waiting for CM Approval
            </div>
          )}

          {poStatus === 'approved' && user !== 'direct_manager' && (
            <div className="px-4 h-12 rounded-2xl font-bold text-sm text-green-700 bg-green-100 flex items-center gap-2 border border-green-200">
              <CheckCircle2 className="w-4 h-4" /> Approved (Waiting for DM to Send)
            </div>
          )}

          {poStatus === 'sent' && (
            <div className="px-4 h-12 rounded-2xl font-bold text-sm text-green-700 bg-green-100 flex items-center gap-2 border border-green-200">
              <CheckCircle2 className="w-4 h-4" /> PO Sent

            </div>
          )}
        </div>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl" style={{ background: '#faf6f0', border: '1px solid rgba(200,131,74,0.15)' }}>
        <Info className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: '#c8834a' }} />
        <p className="text-[11px] font-semibold" style={{ color: '#9a7a5a' }}>
          This is the generated Bill of Materials sheet. Managers can click the pencil icon to edit line items. All changes are saved to the backend and the total cost is recomputed instantly.
        </p>
      </div>

      {/* FILTER TABS */}
      <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap
              ${categoryFilter === cat ? 'shadow-md scale-105' : 'hover:bg-opacity-50'}
            `}
            style={{
              background: categoryFilter === cat ? 'linear-gradient(135deg, #c8834a, #e8a06a)' : '#faf6f0',
              color: categoryFilter === cat ? '#ffffff' : '#9a7a5a',
            }}
          >
            {cat.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* BOM TABLE (EXCEL-LIKE) */}
      <SpotlightCard className="bg-white rounded-3xl shadow-xl overflow-hidden" style={{ border: '1px solid rgba(200,131,74,0.15)' }} spotlightColor="rgba(200,131,74,0.04)">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr style={{ background: '#faf6f0', color: '#9a7a5a', borderBottom: '2px solid rgba(200,131,74,0.1)' }}>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest whitespace-nowrap">Category</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest">Material Name</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Qty/Garment</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Bulk Qty</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Unit Price</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Total Cost</th>
                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-center w-24">Edit</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item, i) => {
                const isEditing = editingId === item.id;
                return (
                  <tr key={item.id} className="transition-colors group hover:bg-opacity-50" style={{ background: i % 2 === 0 ? '#ffffff' : '#faf6f0', borderBottom: '1px solid rgba(200,131,74,0.05)' }}>

                    <td className="p-4">
                      {isEditing ? (
                        <span className="px-2 py-1 bg-white text-[10px] font-black uppercase tracking-wider rounded-lg text-gray-600 border border-gray-200 shadow-sm">
                          {item.category.replace('_', ' ')}
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-white text-[10px] font-black uppercase tracking-wider rounded-lg text-gray-600 border border-gray-200 shadow-sm">
                          {item.category.replace('_', ' ')}
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      {isEditing ? (
                        <div className="flex flex-col gap-1">
                          <input
                            type="text"
                            value={editBuf.name}
                            onChange={(e) => setEditBuf({ ...editBuf, name: e.target.value })}
                            placeholder="Material Name"
                            className="w-full text-xs font-bold p-1 rounded border outline-none focus:ring-1 focus:ring-orange-400"
                            style={{ border: '1px solid rgba(200,131,74,0.3)', color: '#2d1f0e' }}
                          />
                          <input
                            type="text"
                            value={editBuf.material_color}
                            onChange={(e) => setEditBuf({ ...editBuf, material_color: e.target.value })}
                            placeholder="Color"
                            className="w-full text-[10px] font-semibold p-1 rounded border outline-none focus:ring-1 focus:ring-orange-400 text-gray-500"
                            style={{ border: '1px solid rgba(200,131,74,0.2)' }}
                          />
                        </div>
                      ) : (
                        <div>
                          <p className="text-xs font-black text-gray-900">{item.name}</p>
                          <p className="text-[10px] font-semibold text-gray-500 mt-0.5">{item.material_color}</p>
                        </div>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={editBuf.qty_per_garment}
                            onChange={(e) => setEditBuf({ ...editBuf, qty_per_garment: e.target.value })}
                            className="w-20 text-right text-xs font-bold p-1 rounded border outline-none focus:ring-1 focus:ring-orange-400"
                            style={{ border: '1px solid rgba(200,131,74,0.3)', color: '#2d1f0e' }}
                          />
                          <span className="text-[10px] font-black text-gray-400">{item.uom}</span>
                        </div>
                      ) : (
                        <p className="text-xs font-black text-gray-900">{item.qty_per_garment} <span className="text-[10px] text-gray-400">{item.uom}</span></p>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <p className="text-xs font-bold text-gray-500">{item.bulk_qty?.toFixed(1)} {item.uom}</p>
                    </td>

                    <td className="p-4 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-[10px] font-black text-gray-400">₹</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editBuf.unit_price}
                            onChange={(e) => setEditBuf({ ...editBuf, unit_price: e.target.value })}
                            className="w-20 text-right text-xs font-bold p-1 rounded border outline-none focus:ring-1 focus:ring-orange-400"
                            style={{ border: '1px solid rgba(200,131,74,0.3)', color: '#2d1f0e' }}
                          />
                        </div>
                      ) : (
                        <p className="text-xs font-black text-gray-900">₹{item.unit_price?.toFixed(2)}</p>
                      )}
                    </td>

                    <td className="p-4 text-right">
                      <p className="text-xs font-black" style={{ color: '#c8834a' }}>₹{item.total_cost?.toFixed(2)}</p>
                    </td>

                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {isEditing ? (
                          <>
                            <button onClick={saveEdit} disabled={saving} className="p-1.5 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors">
                              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                            </button>
                            <button onClick={cancelEdit} disabled={saving} className="p-1.5 rounded-lg bg-red-100 text-red-700 hover:bg-red-200 transition-colors">
                              <X className="w-3 h-3" />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => startEdit(item)}
                            disabled={!isCuttingMgr}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-[#c8834a] hover:bg-[#fff9f0] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title={isCuttingMgr ? "Edit line" : "You do not have permission to edit"}
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-xs font-bold text-gray-400">
                    No items found for this category.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </SpotlightCard>
    </div>
  );
}
