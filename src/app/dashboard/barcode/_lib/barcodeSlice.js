import { createSlice } from '@reduxjs/toolkit';
import { DEFAULT_HISTORY_FILTERS, DEFAULT_STYLE_FILTERS } from './constants';

/**
 * ============================================================================
 * BARCODE REDUX SLICE
 * ============================================================================
 * Manages the 18 global/cross-cutting fields that persist across tab and
 * category switches or are read by multiple top-level sections.
 *
 * NOTE: Redux cannot store Set objects — all collections that were previously
 * Sets (printSelections, expandedOrders, etc.) are stored as plain arrays.
 * Components should use .includes() instead of .has().
 */

const makeCategoryMap = (val) => ({
  style: typeof val === 'function' ? val() : JSON.parse(JSON.stringify(val)),
  employee: typeof val === 'function' ? val() : JSON.parse(JSON.stringify(val)),
  bucket: typeof val === 'function' ? val() : JSON.parse(JSON.stringify(val)),
  material: typeof val === 'function' ? val() : JSON.parse(JSON.stringify(val)),
});

const initialState = {
  // ── UI: Active navigation ──────────────────────────────────────────────
  ui: {
    activeCategory: 'style',    // 'style' | 'employee' | 'bucket' | 'material'
    activeTab: 'generation',    // 'generation' | 'print' | 'history'
  },

  // ── Per-category stores (generated barcodes + batch history) ───────────
  byCategory: {
    employee: { generated: [], history: [] },
    bucket: { generated: [], history: [], stateFilter: 'ALL', seqFrom: '', seqTo: '' },
    material: { generated: [], history: [] },
    style: {
      selectedOrderId: '',
      filters: { ...DEFAULT_STYLE_FILTERS },
      page: 1,
    },
  },

  // ── Cross-cutting selections & expansions (arrays, not Sets) ──────────
  selection: {
    printSelected: makeCategoryMap([]),
    expandedOrders: makeCategoryMap([]),
    expandedGroups: makeCategoryMap([]),
    expandedHistoryOrders: makeCategoryMap([]),
    historyFilters: {
      style: { ...DEFAULT_HISTORY_FILTERS },
      employee: { ...DEFAULT_HISTORY_FILTERS },
      bucket: { ...DEFAULT_HISTORY_FILTERS },
      material: { ...DEFAULT_HISTORY_FILTERS },
    },
  },

  // ── Modals ─────────────────────────────────────────────────────────────
  modals: {
    detailCode: null,
    previewOpen: false,
  },
};

// ── Helper: toggle a value in an array (add if missing, remove if present) ──
function toggleInArray(arr, value) {
  const idx = arr.indexOf(value);
  if (idx === -1) return [...arr, value];
  return arr.filter((_, i) => i !== idx);
}

const barcodeSlice = createSlice({
  name: 'barcode',
  initialState,
  reducers: {
    // ── UI Navigation ──────────────────────────────────────────────────
    setCategory(state, action) {
      state.ui.activeCategory = action.payload;
      state.ui.activeTab = 'generation';
    },
    setActiveTab(state, action) {
      state.ui.activeTab = action.payload;
    },

    // ── Generated & History Store Mutations ─────────────────────────────
    addGenerated(state, action) {
      const { category, records } = action.payload;
      state.byCategory[category].generated.push(...records);
    },
    addHistory(state, action) {
      const { category, entry } = action.payload;
      state.byCategory[category].history.unshift(entry);
    },
    markPrinted(state, action) {
      const { category, codes } = action.payload;
      const gen = state.byCategory[category].generated;
      for (let i = 0; i < gen.length; i++) {
        if (codes.includes(gen[i].pieceCode)) {
          gen[i].printStatus = 'PRINTED';
          gen[i].printCount = (gen[i].printCount || 0) + 1;
        }
      }
    },

    // ── Drawer / Bucket Filters ────────────────────────────────────────
    setDrawerStateFilter(state, action) {
      state.byCategory.bucket.stateFilter = action.payload;
    },
    setDrawerSeqFrom(state, action) {
      state.byCategory.bucket.seqFrom = action.payload;
    },
    setDrawerSeqTo(state, action) {
      state.byCategory.bucket.seqTo = action.payload;
    },

    // ── Style Category Fields ──────────────────────────────────────────
    setStyleSelectedOrder(state, action) {
      state.byCategory.style.selectedOrderId = action.payload;
      state.byCategory.style.filters = { ...DEFAULT_STYLE_FILTERS };
      state.byCategory.style.page = 1;
    },
    setStyleFilter(state, action) {
      const { field, value } = action.payload;
      state.byCategory.style.filters[field] = value;
      state.byCategory.style.page = 1;
    },
    resetStyleFilters(state) {
      state.byCategory.style.filters = { ...DEFAULT_STYLE_FILTERS };
      state.byCategory.style.page = 1;
    },
    setStylePage(state, action) {
      state.byCategory.style.page = action.payload;
    },

    // ── Print Selection ────────────────────────────────────────────────
    togglePrintSelected(state, action) {
      const { category, code } = action.payload;
      state.selection.printSelected[category] = toggleInArray(
        state.selection.printSelected[category],
        code
      );
    },
    setPrintSelected(state, action) {
      const { category, codes } = action.payload;
      state.selection.printSelected[category] = codes;
    },
    addPrintSelected(state, action) {
      const { category, codes } = action.payload;
      const current = state.selection.printSelected[category];
      const merged = [...current];
      codes.forEach((c) => { if (!merged.includes(c)) merged.push(c); });
      state.selection.printSelected[category] = merged;
    },
    clearPrintSelected(state, action) {
      state.selection.printSelected[action.payload] = [];
    },
    selectAllPrint(state, action) {
      const { category, codes } = action.payload;
      state.selection.printSelected[category] = codes;
    },

    // ── Toggle group handler (for PrintTab checkbox groups) ────────────
    toggleGroupPrint(state, action) {
      const { category, codes, checked } = action.payload;
      const current = state.selection.printSelected[category];
      if (checked) {
        const merged = [...current];
        codes.forEach((c) => { if (!merged.includes(c)) merged.push(c); });
        state.selection.printSelected[category] = merged;
      } else {
        state.selection.printSelected[category] = current.filter(
          (c) => !codes.includes(c)
        );
      }
    },

    // ── Expansion Toggles ──────────────────────────────────────────────
    toggleExpandedOrder(state, action) {
      const { category, id } = action.payload;
      state.selection.expandedOrders[category] = toggleInArray(
        state.selection.expandedOrders[category],
        id
      );
    },
    toggleExpandedGroup(state, action) {
      const { category, key } = action.payload;
      state.selection.expandedGroups[category] = toggleInArray(
        state.selection.expandedGroups[category],
        key
      );
    },
    toggleExpandedHistoryOrder(state, action) {
      const { category, id } = action.payload;
      state.selection.expandedHistoryOrders[category] = toggleInArray(
        state.selection.expandedHistoryOrders[category],
        id
      );
    },

    // ── History Filters ────────────────────────────────────────────────
    setHistoryFilter(state, action) {
      const { category, field, value } = action.payload;
      state.selection.historyFilters[category][field] = value;
    },
    resetHistoryFilters(state, action) {
      state.selection.historyFilters[action.payload] = { ...DEFAULT_HISTORY_FILTERS };
    },

    // ── Modals ─────────────────────────────────────────────────────────
    setDetailCode(state, action) {
      state.modals.detailCode = action.payload;
    },
    setPreviewOpen(state, action) {
      state.modals.previewOpen = action.payload;
    },
  },
});

export const {
  setCategory,
  setActiveTab,
  addGenerated,
  addHistory,
  markPrinted,
  setDrawerStateFilter,
  setDrawerSeqFrom,
  setDrawerSeqTo,
  setStyleSelectedOrder,
  setStyleFilter,
  resetStyleFilters,
  setStylePage,
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
} = barcodeSlice.actions;

export default barcodeSlice.reducer;
