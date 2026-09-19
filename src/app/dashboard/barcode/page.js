'use client';
import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import { Barcode } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import {
  BRAND, TABS, CATEGORIES, CATEGORY_SUBTITLES, CATEGORY_LABELS,
  DEFAULT_HISTORY_FILTERS, EMPTY_LIST,
  BUCKET_LABEL, BUCKET_LABELS_PER_PAGE, STYLE_LABELS_PER_PAGE,
} from './_lib/constants';
import { getCompactBarcodeId, chunkArray } from './_lib/helpers';
import { captureNodeToCanvas, saveCanvasAsPng, savePdfBlob } from './_lib/exporters';
import {
  setCategory as setReduxCategory,
  setActiveTab as setReduxActiveTab,
  addGenerated,
  addHistory,
  markPrinted as markPrintedAction,
  setDrawerStateFilter,
  setDrawerSeqFrom,
  setDrawerSeqTo,
  togglePrintSelected,
  setPrintSelected,
  addPrintSelected,
  clearPrintSelected,
  selectAllPrint,
  toggleGroupPrint,
  toggleExpandedOrder,
  toggleExpandedGroup,
  toggleExpandedHistoryOrder,
  setHistoryFilter,
  resetHistoryFilters,
  setDetailCode,
  setPreviewOpen,
} from './_lib/barcodeSlice';
import {
  useGetEmployeesQuery,
  useListDrawersQuery,
  useGetBarcodeMaterialsQuery,
} from './_lib/barcodeApiSlice';
import ToastStack from './_components/ToastStack';
import ResolveBarcodeWidget from './_components/ResolveBarcodeWidget';
import StyleRegistryPanel from './_components/style/StyleRegistryPanel';
import EmployeeGenerationTab from './_components/EmployeeGenerationTab';
import DrawerGenerationTab from './_components/DrawerGenerationTab';
import MaterialGenerationTab from './_components/MaterialGenerationTab';
import PrintTab from './_components/PrintTab';
import HistoryTab from './_components/HistoryTab';
import DetailModal from './_components/modals/DetailModal';
import PrintPreviewModal from './_components/modals/PrintPreviewModal';
import EmployeeTicketCard from './_components/cards/EmployeeTicketCard';
import DrawerBarcodeLabel from './_components/cards/DrawerBarcodeLabel';
import BarcodeStickerLabel from './_components/cards/BarcodeStickerLabel';
import BarcodeCanvas from './_components/BarcodeCanvas';

/**
 * ============================================================================
 * BarcodeManagementPage Master Dashboard Component
 * ============================================================================
 * WHAT IT IS:
 * The primary dashboard module for all factory barcode lifecycle management.
 *
 * UNIFIED CATEGORIES:
 * 1. Style Barcodes: Piece-level production order barcodes from live registry (`StyleRegistryPanel`).
 * 2. Employee Barcodes: ID badge receipt tickets grouped by department.
 * 3. Bucket / Drawer Barcodes: Physical 98mm × 65.5mm bin tracking stickers from `/api/v1/drawers`.
 * 4. Material Barcodes: Raw material lot creation, stock checking, receiving, and supplier ordering.
 *
 * SUB-TABS:
 * - Batch Generation: Select entities and mint barcodes into the print queue.
 * - Print Center: Expandable order/dept hierarchies with preview and bulk export.
 * - Batch History: Audit logs with date/operator/status filters, reprint, and CSV export.
 */
export default function BarcodeManagementPage() {
  // ==========================================================================
  // SECTION 1: HYDRATION & AUTHENTICATION
  // ==========================================================================
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    setHasMounted(true);
  }, []);

  const { user, token } = useAuth();
  const operatorLabel = user ? user.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
  const dispatch = useDispatch();

  // ==========================================================================
  // SECTION 2: REDUX GLOBAL STATE (replaces 18 useState calls)
  // ==========================================================================
  const category = useSelector((s) => s.barcode.ui.activeCategory);
  const activeTab = useSelector((s) => s.barcode.ui.activeTab);

  const employeeStore = useSelector((s) => s.barcode.byCategory.employee);
  const bucketStore = useSelector((s) => s.barcode.byCategory.bucket);
  const materialStore = useSelector((s) => s.barcode.byCategory.material);

  const drawerStateFilter = useSelector((s) => s.barcode.byCategory.bucket.stateFilter);
  const drawerSeqFrom = useSelector((s) => s.barcode.byCategory.bucket.seqFrom);
  const drawerSeqTo = useSelector((s) => s.barcode.byCategory.bucket.seqTo);

  const printSelections = useSelector((s) => s.barcode.selection.printSelected);
  const expandedOrdersByCat = useSelector((s) => s.barcode.selection.expandedOrders);
  const expandedGroupsByCat = useSelector((s) => s.barcode.selection.expandedGroups);
  const expandedHistoryOrdersByCat = useSelector((s) => s.barcode.selection.expandedHistoryOrders);
  const historyFiltersByCat = useSelector((s) => s.barcode.selection.historyFilters);

  const detailCode = useSelector((s) => s.barcode.modals.detailCode);
  const previewOpen = useSelector((s) => s.barcode.modals.previewOpen);

  // ==========================================================================
  // SECTION 3: RTK QUERY HOOKS (replaces 3 useEffect fetch blocks + 12 useState fields)
  // ==========================================================================
  const {
    data: employeeDirectory = [],
    isLoading: employeesLoading,
    error: employeesErrorObj,
    refetch: refetchEmployees,
  } = useGetEmployeesQuery(undefined, {
    skip: !hasMounted || category !== 'employee' || !token,
  });
  const employeesError = employeesErrorObj?.data?.detail || employeesErrorObj?.error || null;

  const {
    data: drawerData,
    isLoading: drawerLoading,
    error: drawerErrorObj,
    refetch: refetchDrawers,
  } = useListDrawersQuery(
    { state: drawerStateFilter, seqFrom: drawerSeqFrom, seqTo: drawerSeqTo },
    { skip: !hasMounted || category !== 'bucket' || !token },
  );
  const drawerDirectory = drawerData?.items ?? [];
  const drawerTotal = drawerData?.total ?? 0;
  const drawerError = drawerErrorObj?.data?.detail || drawerErrorObj?.error || null;

  const {
    data: materialDirectory = [],
    isLoading: materialsLoading,
    error: materialsErrorObj,
    refetch: refetchMaterials,
  } = useGetBarcodeMaterialsQuery(undefined, {
    skip: !hasMounted || category !== 'material' || !token,
  });
  const materialsError = materialsErrorObj?.data?.detail || materialsErrorObj?.error || null;

  // ==========================================================================
  // SECTION 4: LOCAL-ONLY STATE (confirmed local, untouched by RTK migration)
  // ==========================================================================
  const [printSheetItems, setPrintSheetItems] = useState([]);
  const printSheetRef = useRef(null);

  // Bulk off-screen PNG/PDF export state
  const [bulkExportItems, setBulkExportItems] = useState(null);
  const [bulkExporting, setBulkExporting] = useState(false);
  const bulkExportRef = useRef(null);

  // Floating notification alert toasts
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3500);
  }, []);

  // ==========================================================================
  // SECTION 5: ACTIVE CATEGORY DERIVED DATA
  // ==========================================================================
  const activeGenerated = category === 'employee' ? employeeStore.generated : category === 'bucket' ? bucketStore.generated : category === 'material' ? materialStore.generated : EMPTY_LIST;
  const activeHistory = category === 'employee' ? employeeStore.history : category === 'bucket' ? bucketStore.history : category === 'material' ? materialStore.history : EMPTY_LIST;
  // Convert Redux arrays → Sets for backward compatibility with child components
  // that use .has() and .size (PrintTab, HistoryTab)
  const activeSelectedPrint = useMemo(() => new Set(printSelections[category]), [printSelections, category]);
  const activeExpandedOrders = useMemo(() => new Set(expandedOrdersByCat[category]), [expandedOrdersByCat, category]);
  const activeExpandedGroups = useMemo(() => new Set(expandedGroupsByCat[category]), [expandedGroupsByCat, category]);
  const activeExpandedHistoryOrders = useMemo(() => new Set(expandedHistoryOrdersByCat[category]), [expandedHistoryOrdersByCat, category]);
  const activeHistoryFilters = historyFiltersByCat[category];
  const activeLabels = CATEGORY_LABELS[category];

  /** Switches the active category and defaults view to Generation tab. */
  const switchCategory = useCallback((cat) => {
    dispatch(setReduxCategory(cat));
  }, [dispatch]);

  // ==========================================================================
  // SECTION 6: PRINT TRIGGER SIDE-EFFECT
  // ==========================================================================
  useEffect(() => {
    if (printSheetItems.length === 0) return;
    const sheet = printSheetRef.current;
    if (sheet) sheet.style.display = 'block';
    const t = setTimeout(() => {
      window.print();
      if (sheet) sheet.style.display = 'none';
      setPrintSheetItems([]);
    }, 80);
    return () => clearTimeout(t);
  }, [printSheetItems]);

  // ==========================================================================
  // SECTION 7: EMPLOYEE BARCODE GENERATION LOGIC
  // ==========================================================================
  const generateEmployeeDept = useCallback((departmentName, employees) => {
    const alreadyGenIds = new Set(employeeStore.generated.filter((r) => r.client === departmentName).map((r) => r.size));
    const pending = employees.filter((e) => !alreadyGenIds.has(e.empId));
    if (pending.length === 0) {
      showToast(`${employees.length === 1 ? employees[0].name : 'These employees'} already ${employees.length === 1 ? 'has' : 'have'} a barcode!`, 'info');
      return;
    }
    const batchId = `EMP-BATCH-${Date.now().toString().slice(-6)}`;
    const deptCode = departmentName.replace(/\s+/g, '_').toUpperCase();
    const newRecords = pending.map((emp, idx) => ({
      pieceCode: emp.empId.startsWith('EMP-') ? emp.empId : `EMP-${emp.empId}`,
      orderId: deptCode,
      client: departmentName,
      style: emp.name,
      color: emp.designation,
      size: emp.empId,
      serial: idx + 1,
      serialStr: String(idx + 1).padStart(3, '0'),
      batchNo: batchId,
      createdDate: new Date().toLocaleString(),
      generatedBy: operatorLabel,
      printStatus: 'PENDING',
      printCount: 0,
    }));
    const historyEntry = {
      batchNo: batchId,
      orderId: deptCode,
      client: departmentName,
      style: pending.length === 1 ? pending[0].name : `${pending.length} Employees`,
      color: pending.length === 1 ? pending[0].designation : '',
      size: pending.length === 1 ? pending[0].empId : '—',
      qty: pending.length,
      generatedBy: operatorLabel,
      createdDate: new Date().toLocaleString(),
      printStatus: 'PENDING',
    };
    dispatch(addGenerated({ category: 'employee', records: newRecords }));
    dispatch(addHistory({ category: 'employee', entry: historyEntry }));
    showToast(pending.length === 1 ? `Generated barcode for ${pending[0].name}!` : `Generated ${pending.length} employee ID barcodes for ${departmentName}!`, 'success');
  }, [employeeStore, showToast, operatorLabel, dispatch]);

  const generateSelectedEmployees = useCallback((employees) => {
    if (employees.length === 0) {
      showToast('Check at least one employee to generate!', 'error');
      return;
    }
    const byDept = new Map();
    employees.forEach((emp) => {
      if (!byDept.has(emp.department)) byDept.set(emp.department, []);
      byDept.get(emp.department).push(emp);
    });
    byDept.forEach((emps, dept) => generateEmployeeDept(dept, emps));
  }, [generateEmployeeDept, showToast]);

  const generateAllRemainingEmployees = useCallback(() => {
    if (employeeDirectory.length === 0) {
      showToast('No employees on the roster to generate barcodes for!', 'error');
      return;
    }
    const deptMap = new Map();
    employeeDirectory.forEach((emp) => {
      if (!deptMap.has(emp.department)) deptMap.set(emp.department, []);
      deptMap.get(emp.department).push(emp);
    });
    let any = false;
    deptMap.forEach((employees, dept) => {
      const alreadyGenIds = new Set(employeeStore.generated.filter((r) => r.client === dept).map((r) => r.size));
      if (employees.some((e) => !alreadyGenIds.has(e.empId))) {
        generateEmployeeDept(dept, employees);
        any = true;
      }
    });
    if (!any) showToast('All employee ID barcodes have already been generated!', 'info');
  }, [employeeDirectory, employeeStore, generateEmployeeDept, showToast]);

  const sendEmployeesToPrintCenter = useCallback(() => {
    const codes = employeeStore.generated;
    if (codes.length === 0) {
      showToast('No employee barcodes available to send to Print Center!', 'error');
      return;
    }
    dispatch(addPrintSelected({ category: 'employee', codes: codes.map((b) => b.pieceCode) }));
    showToast(`Queued ${codes.length} employee barcodes to Print Center!`, 'success');
    dispatch(setReduxActiveTab('print'));
  }, [employeeStore, showToast, dispatch]);

  // ==========================================================================
  // SECTION 8: MATERIAL BARCODE GENERATION LOGIC
  // ==========================================================================
  const generateMaterialLots = useCallback((lots) => {
    const alreadyGenCodes = new Set(materialStore.generated.map((r) => r.pieceCode));
    const pending = lots.filter((l) => !alreadyGenCodes.has(l.barcode || l.lot_id));
    if (pending.length === 0) {
      showToast(`${lots.length === 1 ? 'This material lot' : 'These material lots'} already ${lots.length === 1 ? 'has' : 'have'} a barcode queued!`, 'info');
      return;
    }
    const batchId = `MAT-BATCH-${Date.now().toString().slice(-6)}`;
    const newRecords = pending.map((lot, idx) => ({
      pieceCode: lot.barcode || `LOT-${(lot.category || 'MAT').slice(0, 3)}-${String(lot.lot_id || idx + 1).slice(0, 8).toUpperCase()}`,
      orderId: lot.category || 'MATERIAL',
      client: `${lot.category || 'MATERIAL'}${lot.subtype ? ` / ${lot.subtype}` : ''}`,
      style: lot.article || 'Unnamed Article',
      color: lot.colour || '—',
      size: `${lot.on_hand ?? lot.available ?? 0} ${lot.uom || ''}`,
      serial: idx + 1,
      serialStr: String(idx + 1).padStart(3, '0'),
      batchNo: batchId,
      createdDate: new Date().toLocaleString(),
      generatedBy: operatorLabel,
      printStatus: 'PENDING',
      printCount: 0,
      lotId: lot.lot_id,
      thickness: lot.thickness || lot.size,
      onHand: lot.on_hand,
      available: lot.available,
      reserved: lot.reserved,
      uom: lot.uom,
      supplierName: lot.supplier_name || lot.supplier_id || '—',
    }));

    const historyEntry = {
      batchNo: batchId,
      orderId: pending[0].category || 'MATERIAL',
      client: pending[0].category || 'MATERIAL',
      style: pending.length === 1 ? pending[0].article : `${pending.length} Material Lots`,
      color: pending.length === 1 ? (pending[0].colour || '—') : '',
      size: pending.length === 1 ? `${pending[0].on_hand ?? 0} ${pending[0].uom || ''}` : '—',
      qty: pending.length,
      generatedBy: operatorLabel,
      createdDate: new Date().toLocaleString(),
      printStatus: 'PENDING',
    };

    dispatch(addGenerated({ category: 'material', records: newRecords }));
    dispatch(addHistory({ category: 'material', entry: historyEntry }));
    showToast(pending.length === 1 ? `Generated barcode for Lot ${pending[0].barcode || pending[0].article}!` : `Generated ${pending.length} Material Lot barcodes!`, 'success');
  }, [materialStore, showToast, operatorLabel, dispatch]);

  const generateAllRemainingMaterials = useCallback(() => {
    if (materialDirectory.length === 0) {
      showToast('No material lots available to generate barcodes for!', 'error');
      return;
    }
    generateMaterialLots(materialDirectory);
  }, [materialDirectory, generateMaterialLots, showToast]);

  const sendMaterialsToPrintCenter = useCallback(() => {
    if (materialStore.generated.length === 0) {
      showToast('No generated material barcodes to send to Print Center!', 'error');
      return;
    }
    const allCodes = materialStore.generated.map((b) => b.pieceCode);
    dispatch(setPrintSelected({ category: 'material', codes: allCodes }));
    dispatch(setReduxActiveTab('print'));
    showToast(`Loaded ${allCodes.length} material barcodes into Print Center!`, 'info');
  }, [materialStore.generated, showToast, dispatch]);

  // ==========================================================================
  // SECTION 9: DRAWER / BUCKET BARCODE GENERATION LOGIC
  // ==========================================================================
  const buildDrawerRecords = useCallback((rows, batchId) => rows.map((drw) => {
    const seq = drw.seq ?? 0;
    const label = drw.code || `Drawer #${seq}`;
    return {
      pieceCode: drw.barcode,
      orderId: drw.state || 'unknown',
      client: label,
      style: label,
      color: drw.state || '',
      size: drw.drawer_id || '',
      serial: seq,
      serialStr: String(seq).padStart(4, '0'),
      batchNo: batchId,
      createdDate: new Date().toLocaleString(),
      generatedBy: operatorLabel,
      printStatus: 'PENDING',
      printCount: 0,
    };
  }), [operatorLabel]);

  const drawerBatchHistoryEntry = useCallback((batchId, records) => ({
    batchNo: batchId,
    orderId: 'DRAWERS',
    client: 'Drawer / Bucket Pool',
    style: records.length === 1 ? records[0].style : `${records.length} Drawers`,
    color: records.length === 1 ? records[0].color : '',
    size: records.length === 1 ? records[0].size : `${records.length} labels`,
    qty: records.length,
    generatedBy: operatorLabel,
    createdDate: new Date().toLocaleString(),
    printStatus: 'PENDING',
  }), [operatorLabel]);

  const generateDrawerLabels = useCallback((rows) => {
    if (!rows || rows.length === 0) {
      showToast('Check at least one drawer to generate!', 'error');
      return;
    }
    const printable = rows.filter((d) => d.barcode);
    const skipped = rows.length - printable.length;
    const already = new Set(bucketStore.generated.map((r) => r.pieceCode));
    const pending = printable.filter((d) => !already.has(d.barcode));
    if (pending.length === 0) {
      showToast(printable.length === 0
        ? `${skipped} drawer${skipped === 1 ? ' has' : 's have'} no registry barcode — re-run gen_drawer_barcodes on the backend.`
        : 'Those drawers already have generated labels!', printable.length === 0 ? 'error' : 'info');
      return;
    }
    const batchId = `DRW-BATCH-${Date.now().toString().slice(-6)}`;
    const newRecords = buildDrawerRecords(pending, batchId);
    dispatch(addGenerated({ category: 'bucket', records: newRecords }));
    dispatch(addHistory({ category: 'bucket', entry: drawerBatchHistoryEntry(batchId, newRecords) }));
    showToast(`Generated ${newRecords.length} drawer barcode label${newRecords.length === 1 ? '' : 's'}!`, 'success');
    if (skipped > 0) showToast(`${skipped} drawer${skipped === 1 ? '' : 's'} skipped — no registry barcode to encode.`, 'info');
  }, [bucketStore, buildDrawerRecords, drawerBatchHistoryEntry, showToast, dispatch]);

  const generateAllRemainingDrawers = useCallback(() => {
    if (drawerDirectory.length === 0) {
      showToast('No drawers loaded from the server to generate labels for!', 'error');
      return;
    }
    generateDrawerLabels(drawerDirectory);
  }, [drawerDirectory, generateDrawerLabels, showToast]);

  const sendDrawersToPrintCenter = useCallback(() => {
    const codes = bucketStore.generated;
    if (codes.length === 0) {
      showToast('Generate drawer labels first — nothing to send to Print Center!', 'error');
      return;
    }
    dispatch(addPrintSelected({ category: 'bucket', codes: codes.map((b) => b.pieceCode) }));
    showToast(`Queued ${codes.length} drawer barcodes to Print Center!`, 'success');
    dispatch(setReduxActiveTab('print'));
  }, [bucketStore, showToast, dispatch]);

  // ==========================================================================
  // SECTION 10: PRINTING & BULK EXPORT ACTIONS
  // ==========================================================================
  const markPrinted = useCallback((codes) => {
    dispatch(markPrintedAction({ category, codes }));
  }, [category, dispatch]);

  const executeThermalPrint = useCallback((codes) => {
    if (!codes || codes.length === 0) {
      showToast('Please select barcodes to print!', 'error');
      return;
    }
    const items = codes.map((c) => activeGenerated.find((b) => b.pieceCode === c)).filter(Boolean);
    markPrinted(codes);
    dispatch(setPreviewOpen(false));
    showToast(`Sending ${items.length} ID card${items.length === 1 ? '' : 's'} to printer (4 per page)...`, 'success');
    setPrintSheetItems(items);
  }, [markPrinted, showToast, activeGenerated, dispatch]);

  const handlePrintSingle = useCallback((pieceCode) => {
    executeThermalPrint([pieceCode]);
  }, [executeThermalPrint]);

  const printAllDrawerLabels = useCallback(() => {
    const printable = (drawerDirectory || []).filter((d) => d.barcode);
    const skipped = (drawerDirectory || []).length - printable.length;
    if (printable.length === 0) {
      showToast(skipped > 0
        ? `None of the ${skipped} loaded drawers has a registry barcode yet — nothing can be printed.`
        : 'No drawers loaded from the server to print!', 'error');
      return;
    }
    const batchId = `DRW-BATCH-${Date.now().toString().slice(-6)}`;
    const existingByCode = new Map(bucketStore.generated.map((r) => [r.pieceCode, r]));
    const fresh = buildDrawerRecords(printable.filter((d) => !existingByCode.has(d.barcode)), batchId);
    const freshByCode = new Map(fresh.map((r) => [r.pieceCode, r]));
    const items = printable
      .map((d) => existingByCode.get(d.barcode) || freshByCode.get(d.barcode))
      .filter(Boolean);
    const printedCodes = items.map((r) => r.pieceCode);

    if (fresh.length > 0) {
      dispatch(addGenerated({ category: 'bucket', records: fresh }));
      dispatch(addHistory({ category: 'bucket', entry: drawerBatchHistoryEntry(batchId, fresh) }));
    }
    dispatch(markPrintedAction({ category: 'bucket', codes: printedCodes }));
    setPrintSheetItems(items);
    showToast(`Printing all ${items.length} drawer labels (4 per page)...`, 'success');
    if (skipped > 0) showToast(`${skipped} drawer${skipped === 1 ? '' : 's'} skipped — no registry barcode to encode.`, 'info');
  }, [drawerDirectory, bucketStore, buildDrawerRecords, drawerBatchHistoryEntry, showToast, dispatch]);

  const handleDownloadAll = useCallback(async (format) => {
    const codes = Array.from(activeSelectedPrint);
    if (codes.length === 0) {
      showToast('Please select barcodes to download!', 'error');
      return;
    }
    const items = codes.map((c) => activeGenerated.find((b) => b.pieceCode === c)).filter(Boolean);
    if (items.length === 0) return;

    setBulkExporting(true);
    setBulkExportItems(items);
    await new Promise((resolve) => setTimeout(resolve, 150));

    try {
      const container = bulkExportRef.current;
      if (!container) return;

      if (format === 'pdf') {
        const { default: jsPDF } = await import('jspdf');
        const pages = container.querySelectorAll('.export-page');
        const pdf = new jsPDF({ unit: 'px', format: 'a4' });
        const pageW = pdf.internal.pageSize.getWidth();
        for (let i = 0; i < pages.length; i++) {
          const canvas = await captureNodeToCanvas(pages[i]);
          if (i > 0) pdf.addPage();
          const imgH = pageW * (canvas.height / canvas.width);
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, pageW, imgH);
        }
        await savePdfBlob(pdf, `barcode-cards-${category}-${Date.now()}`);
      } else {
        const canvas = await captureNodeToCanvas(container);
        await saveCanvasAsPng(canvas, `barcode-cards-${category}-${Date.now()}`);
      }
      showToast(`Downloaded ${items.length} card${items.length === 1 ? '' : 's'} as ${format.toUpperCase()}!`, 'success');
    } catch (err) {
      showToast('Bulk download failed — please try again.', 'error');
    } finally {
      setBulkExportItems(null);
      setBulkExporting(false);
    }
  }, [activeSelectedPrint, activeGenerated, category, showToast]);

  const handleOpenPreview = useCallback(() => {
    if (activeSelectedPrint.length === 0) {
      showToast('Please select at least one barcode to preview/print!', 'error');
      return;
    }
    dispatch(setPreviewOpen(true));
  }, [activeSelectedPrint, showToast, dispatch]);

  const handlePrintGroupDirect = useCallback((items) => {
    const codes = items.map((i) => i.pieceCode);
    dispatch(addPrintSelected({ category, codes }));
    dispatch(setPreviewOpen(true));
  }, [category, dispatch]);

  const handleExportCSV = useCallback((rows) => {
    const header = ['Batch No', 'Order ID', 'Client', 'Style', 'Color', 'Size', 'Qty', 'Generated By', 'Created Date', 'Print Status'];
    const csvRows = [header, ...rows.map((b) => [b.batchNo, b.orderId, b.client, b.style, b.color, b.size, b.qty, b.generatedBy, b.createdDate, b.printStatus])];
    const csv = csvRows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `barcode-batch-history-${category}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [category]);

  // ==========================================================================
  // SECTION 11: HISTORY FILTER HANDLERS & OPTIONS LISTS
  // ==========================================================================
  const handleSetHistoryFilter = useCallback((field, value) => dispatch(setHistoryFilter({ category, field, value })), [category, dispatch]);
  const handleResetHistoryFilters = useCallback(() => dispatch(resetHistoryFilters(category)), [category, dispatch]);

  const handleToggleExpandedOrder = useCallback((id) => dispatch(toggleExpandedOrder({ category, id })), [category, dispatch]);
  const handleToggleExpandedGroup = useCallback((key) => dispatch(toggleExpandedGroup({ category, key })), [category, dispatch]);
  const handleToggleExpandedHistoryOrder = useCallback((id) => dispatch(toggleExpandedHistoryOrder({ category, id })), [category, dispatch]);

  const employeeHistoryOptions = useMemo(() => {
    const depts = Array.from(new Set(employeeDirectory.map((e) => e.department)));
    return {
      orderIds: depts.map((d) => d.replace(/\s+/g, '_').toUpperCase()),
      clients: depts,
      styles: Array.from(new Set(employeeDirectory.map((e) => e.name))),
      sizes: Array.from(new Set(employeeDirectory.map((e) => e.empId))),
      operators: Array.from(new Set(employeeStore.history.map((b) => b.generatedBy))),
    };
  }, [employeeDirectory, employeeStore.history]);

  const bucketHistoryOptions = useMemo(() => ({
    orderIds: Array.from(new Set(bucketStore.history.map((b) => b.orderId))),
    clients: Array.from(new Set(bucketStore.history.map((b) => b.client))),
    styles: Array.from(new Set(bucketStore.history.map((b) => b.style))),
    sizes: Array.from(new Set(bucketStore.history.map((b) => b.size))),
    operators: Array.from(new Set(bucketStore.history.map((b) => b.generatedBy))),
  }), [bucketStore.history]);

  const materialHistoryOptions = useMemo(() => ({
    orderIds: Array.from(new Set(materialStore.history.map((b) => b.orderId))),
    clients: Array.from(new Set(materialStore.history.map((b) => b.client))),
    styles: Array.from(new Set(materialStore.history.map((b) => b.style))),
    sizes: Array.from(new Set(materialStore.history.map((b) => b.size))),
    operators: Array.from(new Set(materialStore.history.map((b) => b.generatedBy))),
  }), [materialStore.history]);

  const activeHistoryOptions = category === 'employee' ? employeeHistoryOptions : category === 'bucket' ? bucketHistoryOptions : category === 'material' ? materialHistoryOptions : [];

  const handleViewFromHistory = useCallback(() => {
    dispatch(setReduxActiveTab('generation'));
  }, [dispatch]);

  const handleReprintFromHistory = useCallback((b) => {
    const codes = activeGenerated.filter((x) => x.batchNo === b.batchNo).map((x) => x.pieceCode);
    dispatch(setPrintSelected({ category, codes }));
    dispatch(setReduxActiveTab('print'));
    showToast(`Loaded batch ${b.batchNo} into Print Center!`, 'info');
  }, [activeGenerated, category, showToast, dispatch]);

  const detailBarcode = detailCode ? activeGenerated.find((b) => b.pieceCode === detailCode) : null;
  const isBucketSheet = category === 'bucket';

  // Loading state placeholder before client hydration
  if (!hasMounted) {
    return (
      <div className="w-full py-20 flex items-center justify-center bg-[#faf6f0]">
        <div className="flex flex-col items-center text-[#c8834a] animate-pulse">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#c8834a] mb-2" />
          <span className="text-xs font-bold tracking-widest uppercase">Loading Barcode Management...</span>
        </div>
      </div>
    );
  }

  // ==========================================================================
  // SECTION 12: RENDER MASTER DASHBOARD VIEW
  // ==========================================================================
  return (
    <div className="w-full space-y-6 pb-12">
      {/* Global Thermal Print CSS Stylesheet */}
      <style jsx global>{`
        .btn-warm-primary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 700;
          background: linear-gradient(135deg, #c8834a, #a86530); color: #fff; border: none;
          cursor: pointer; min-height: 48px; transition: all 0.2s ease;
          box-shadow: 0 2px 8px rgba(200,131,74,0.25);
        }
        .btn-warm-primary:hover { background: linear-gradient(135deg, #a86530, #854d22); box-shadow: 0 4px 16px rgba(200,131,74,0.35); transform: translateY(-1px); }
        .btn-warm-secondary {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 10px; font-size: 14px; font-weight: 600;
          background: #ffffff; color: #5a3518; border: 1.5px solid rgba(200,131,74,0.3);
          cursor: pointer; min-height: 48px; transition: all 0.2s ease;
        }
        .btn-warm-secondary:hover { background: #fdf6ee; border-color: #c8834a; }
        .bucket-label {
          width: 360px; height: 240px;
          box-sizing: border-box; background: #fff; border: 1px dashed #999;
          display: flex; align-items: center; justify-content: center; overflow: hidden; padding: 4px;
        }
        .bucket-label canvas, .bucket-label svg { max-width: 95%; max-height: 95%; width: auto; height: auto; object-fit: contain; }
        @media print {
          @page { size: A4 portrait; margin: 4mm; }
          #app-shell { display: none !important; }
          .toast-stack { display: none !important; }
          #thermalPrintSheet { display: block !important; position: static; width: 100%; margin: 0; padding: 0; background: #fff !important; }
          #thermalPrintSheet * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .print-page {
            display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr;
            gap: 8mm; width: 100%; height: 280mm; page-break-after: always; box-sizing: border-box;
          }
          .print-page:last-child { page-break-after: auto; }
          .print-page-barcodes {
            display: grid; grid-template-columns: 1fr 1fr; align-content: start;
            gap: 3mm; width: 100%; page-break-after: always; box-sizing: border-box;
          }
          .print-page-barcodes:last-child { page-break-after: auto; }
          .print-page-barcodes .print-card { width: 100%; }
          .print-label-page {
            position: relative; width: 196mm; height: 262mm; max-height: 262mm;
            page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid;
            box-sizing: border-box; overflow: hidden; margin: 0 auto;
          }
          .print-label-page:last-child { page-break-after: auto; break-after: auto; }
          .print-label-slot { position: absolute; width: 98mm; height: 65.5mm; box-sizing: border-box; }
          .print-label-page .bucket-label {
            width: 98mm; height: 65.5mm; border: 1px dashed #bbb;
            box-sizing: border-box; display: flex; align-items: center; justify-content: center;
            overflow: hidden; padding: 2mm;
          }
          .print-label-page .bucket-label canvas,
          .print-label-page .bucket-label svg {
            max-width: 92mm; max-height: 58mm; width: auto; height: auto;
            object-fit: contain; display: block;
          }
          .print-card {
            border: 1px dashed #999; border-radius: 6px; padding: 2mm; box-sizing: border-box;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            break-inside: avoid; overflow: hidden;
          }
          .print-card canvas { max-width: 94%; max-height: 16mm; }
          .print-card .card-code { font-family: monospace; font-weight: bold; font-size: 8pt; margin: 0.5mm 0; color: #000; }
          .print-card .card-spec { font-size: 6pt; line-height: 1.2; color: #444; text-align: center; max-width: 96%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
          .print-ticket-cell {
            display: flex; align-items: center; justify-content: center;
            break-inside: avoid; overflow: hidden;
          }
          .print-ticket-cell > div { width: 100% !important; max-width: 82mm; box-shadow: none !important; }
        }
      `}</style>

      {/* Floating Notification Toast Stack */}
      <ToastStack toasts={toasts} />

      {/* --- Section 12.1: Dashboard Top Header & Scanner Lookup Widget --- */}
      <motion.div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <p className="text-xs font-black uppercase tracking-widest mb-1" style={{ color: BRAND.accent }}>Production · Piece-Level Traceability</p>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3" style={{ color: BRAND.text }}>
            <Barcode className="w-8 h-8" style={{ color: BRAND.accent }} /> Barcode Management
          </h1>
          <p className="font-medium mt-0.5" style={{ color: BRAND.textMuted }}>{CATEGORY_SUBTITLES[category]}</p>
        </div>
        <ResolveBarcodeWidget token={token} showToast={showToast} />
      </motion.div>

      {/* --- Section 12.2: Category Switcher Pills (Style / Employee / Bucket / Material) --- */}
      <motion.div className="flex items-center gap-1.5 p-1.5 rounded-2xl w-fit flex-wrap" style={{ background: '#fff', border: `1px solid ${BRAND.border}` }}>
        {CATEGORIES.map((c) => {
          const Icon = c.icon;
          const isActive = category === c.id;
          return (
            <button
              key={c.id}
              onClick={() => switchCategory(c.id)}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{ color: isActive ? '#fff' : BRAND.textMuted }}
            >
              {isActive && (
                <motion.span
                  layoutId="barcodeCategoryPill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: BRAND.accent, boxShadow: '0 4px 14px rgba(200,131,74,0.3)' }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon className="w-4 h-4 relative" /> <span className="relative">{c.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* --- Section 12.3: Sub-Tab Switcher Pills (Batch Generation / Print Center / Batch History) --- */}
      <motion.div className="flex items-center gap-1.5 p-1.5 rounded-2xl w-fit" style={{ background: '#fff', border: `1px solid ${BRAND.border}` }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => dispatch(setReduxActiveTab(t.id))}
              className="relative flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-colors"
              style={{ color: isActive ? '#fff' : BRAND.textMuted }}
            >
              {isActive && (
                <motion.span
                  layoutId="barcodeTabPill"
                  className="absolute inset-0 rounded-xl"
                  style={{ background: BRAND.darkGrad, boxShadow: '0 4px 14px rgba(61,43,26,0.25)' }}
                  transition={{ type: 'spring', stiffness: 450, damping: 32 }}
                />
              )}
              <Icon className="w-4 h-4 relative" /> <span className="relative">{t.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* --- Section 12.4: Category Sub-View Renderer --- */}
      {category === 'style' && (
        <StyleRegistryPanel activeTab={activeTab} token={token} showToast={showToast} setPrintSheetItems={setPrintSheetItems} />
      )}

      {category !== 'style' && (
        <div key={`${category}-${activeTab}`}>
          {/* Employee Batch Generation Tab */}
          {activeTab === 'generation' && category === 'employee' && (
            <EmployeeGenerationTab
              employees={employeeDirectory}
              employeesLoading={employeesLoading}
              employeesError={token ? employeesError : 'Sign in to load the employee roster.'}
              onRetryEmployees={refetchEmployees}
              employeeGenerated={employeeStore.generated}
              onGenerateSelected={generateSelectedEmployees}
              onGenerateAllRemaining={generateAllRemainingEmployees}
              onSendToPrintCenter={sendEmployeesToPrintCenter}
              onOpenDetail={(code) => dispatch(setDetailCode(code))}
              onPrintSingle={handlePrintSingle}
            />
          )}

          {/* Drawer / Bucket Batch Generation Tab */}
          {activeTab === 'generation' && category === 'bucket' && (
            <DrawerGenerationTab
              drawers={drawerDirectory}
              drawersLoading={drawerLoading}
              drawersError={token ? drawerError : 'Sign in to load the drawer pool.'}
              onRetryDrawers={refetchDrawers}
              drawerTotal={drawerTotal}
              drawerGenerated={bucketStore.generated}
              onGenerateSelected={generateDrawerLabels}
              onGenerateAllRemaining={generateAllRemainingDrawers}
              onPrintAll={printAllDrawerLabels}
              onSendToPrintCenter={sendDrawersToPrintCenter}
              onOpenDetail={(code) => dispatch(setDetailCode(code))}
              onPrintSingle={handlePrintSingle}
              stateFilter={drawerStateFilter}
              setStateFilter={(v) => dispatch(setDrawerStateFilter(v))}
              seqFrom={drawerSeqFrom}
              setSeqFrom={(v) => dispatch(setDrawerSeqFrom(v))}
              seqTo={drawerSeqTo}
              setSeqTo={(v) => dispatch(setDrawerSeqTo(v))}
            />
          )}

          {/* Material Batch Generation & Operations Tab */}
          {activeTab === 'generation' && category === 'material' && (
            <MaterialGenerationTab
              materials={materialDirectory}
              materialsLoading={materialsLoading}
              materialsError={token ? materialsError : 'Sign in to load material lots.'}
              onRetryMaterials={refetchMaterials}
              materialGenerated={materialStore.generated}
              onGenerateSelected={generateMaterialLots}
              onGenerateAllRemaining={generateAllRemainingMaterials}
              onSendToPrintCenter={sendMaterialsToPrintCenter}
              onOpenDetail={(code) => dispatch(setDetailCode(code))}
              onPrintSingle={handlePrintSingle}
              token={token}
              showToast={showToast}
              onRefreshAll={refetchMaterials}
            />
          )}

          {/* Universal Print Center Tab */}
          {activeTab === 'print' && (
            <PrintTab
              generatedBarcodesStore={activeGenerated}
              selectedPrintBarcodes={activeSelectedPrint}
              expandedOrders={activeExpandedOrders}
              onToggleOrderExpand={handleToggleExpandedOrder}
              expandedGroups={activeExpandedGroups}
              onToggleExpand={handleToggleExpandedGroup}
              onToggleGroup={(items, checked) => dispatch(toggleGroupPrint({ category, codes: items.map((i) => i.pieceCode), checked }))}
              onTogglePiece={(code, checked) => {
                if (checked) {
                  dispatch(addPrintSelected({ category, codes: [code] }));
                } else {
                  const updated = activeSelectedPrint.filter((c) => c !== code);
                  dispatch(setPrintSelected({ category, codes: updated }));
                }
              }}
              onSelectAll={() => dispatch(selectAllPrint({ category, codes: activeGenerated.map((b) => b.pieceCode) }))}
              onClearAll={() => dispatch(clearPrintSelected(category))}
              onOpenPreview={handleOpenPreview}
              onPrintGroupDirect={handlePrintGroupDirect}
              onOpenDetail={(code) => dispatch(setDetailCode(code))}
              onPrintSingle={handlePrintSingle}
              onDownloadAll={handleDownloadAll}
              bulkExporting={bulkExporting}
              labels={activeLabels}
            />
          )}

          {/* Universal Batch History Tab */}
          {activeTab === 'history' && (
            <HistoryTab
              batchHistoryStore={activeHistory}
              filters={activeHistoryFilters}
              setFilter={handleSetHistoryFilter}
              resetFilters={handleResetHistoryFilters}
              options={activeHistoryOptions}
              onView={handleViewFromHistory}
              onReprint={handleReprintFromHistory}
              onExportCSV={() => handleExportCSV(activeHistory)}
              expandedOrders={activeExpandedHistoryOrders}
              onToggleOrderExpand={handleToggleExpandedHistoryOrder}
              labels={activeLabels}
            />
          )}
        </div>
      )}

      {/* --- Section 12.5: Global Modals --- */}
      <DetailModal
        barcode={detailBarcode}
        onClose={() => dispatch(setDetailCode(null))}
        onPrint={handlePrintSingle}
        labels={activeLabels}
        category={category}
      />

      <PrintPreviewModal
        open={previewOpen}
        codes={Array.from(activeSelectedPrint)}
        onClose={() => dispatch(setPreviewOpen(false))}
        onConfirm={() => executeThermalPrint(Array.from(activeSelectedPrint))}
      />

      {/* --- Section 12.6: Portal Printable Sheet --- */}
      {createPortal(
        <div id="thermalPrintSheet" ref={printSheetRef} style={{ display: 'none' }}>
          {isBucketSheet
            ? chunkArray(printSheetItems, BUCKET_LABELS_PER_PAGE).map((group, pageIdx) => (
              <div className="print-label-page" key={pageIdx}>
                {group.map((b, i) => (
                  <div
                    key={b.pieceCode}
                    className="print-label-slot"
                    style={{ left: `${(i % 2) * BUCKET_LABEL.widthMm}mm`, top: `${Math.floor(i / 2) * BUCKET_LABEL.heightMm}mm` }}
                  >
                    <DrawerBarcodeLabel barcode={b} />
                  </div>
                ))}
              </div>
            ))
            : category === 'material'
              ? chunkArray(printSheetItems, 8).map((group, pageIdx) => (
                <div className="print-label-page" key={pageIdx}>
                  {group.map((b, i) => (
                    <div
                      key={b.pieceCode}
                      className="print-label-slot"
                      style={{ left: `${(i % 2) * BUCKET_LABEL.widthMm}mm`, top: `${Math.floor(i / 2) * BUCKET_LABEL.heightMm}mm` }}
                    >
                      <div className="bucket-label flex flex-col items-center justify-center p-2 text-center">
                        <BarcodeCanvas code={b.pieceCode} height={50} moduleWidth={1.8} margin={2} />
                        <div className="text-[10px] font-black font-mono mt-1">{b.pieceCode}</div>
                        <div className="text-[8px] font-bold text-slate-800">{b.client} · {b.style}</div>
                        {b.color && <div className="text-[7px] text-slate-600">{b.color} · Qty: {b.size}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ))
              : category === 'employee'
                ? chunkArray(printSheetItems, 4).map((group, pageIdx) => (
                  <div className="print-page" key={pageIdx}>
                    {group.map((b) => (
                      <div className="print-ticket-cell" key={b.pieceCode}>
                        <EmployeeTicketCard barcode={b} width={300} />
                      </div>
                    ))}
                  </div>
                ))
                : chunkArray(printSheetItems, STYLE_LABELS_PER_PAGE).map((group, pageIdx) => (
                  <div className="print-page-barcodes" key={pageIdx}>
                    {group.map((b) => {
                      const compactId = getCompactBarcodeId(b.pieceCode);
                      const specLine = [b.orderId, b.article, b.style, b.color, b.size, b.serialStr]
                        .filter((v) => v && v !== '—')
                        .join(' · ');
                      return (
                        <div className="print-card" key={b.pieceCode}>
                          <BarcodeCanvas code={compactId} height={42} moduleWidth={1.5} margin={8} showText={false} />
                          <div className="card-code">{compactId}</div>
                          {specLine && <div className="card-spec">{specLine}</div>}
                        </div>
                      );
                    })}
                  </div>
                ))}
        </div>,
        document.body
      )}

      {/* --- Section 12.7: Off-Screen DOM Container for Bulk PNG/PDF Export --- */}
      {bulkExportItems && (
        <div style={{ position: 'fixed', top: 0, left: '-99999px', background: '#fff' }}>
          <div ref={bulkExportRef}>
            {chunkArray(bulkExportItems, 8).map((group, pageIdx) => (
              <div
                key={pageIdx}
                className="export-page"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gridTemplateRows: 'repeat(4, auto)',
                  gap: 16,
                  width: isBucketSheet ? 828 : 794,
                  minHeight: 1123,
                  padding: 24,
                  boxSizing: 'border-box',
                  background: '#fff',
                  alignContent: 'start',
                }}
              >
                {group.map((b) => (
                  category === 'employee'
                    ? <EmployeeTicketCard key={b.pieceCode} barcode={b} width={340} />
                    : isBucketSheet
                      ? <DrawerBarcodeLabel key={b.pieceCode} barcode={b} />
                      : <BarcodeStickerLabel key={b.pieceCode} barcode={b} width={360} />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
