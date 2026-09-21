//  production logger,wages page and login page apislice
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
    prepareHeaders: (headers, { getState }) => {
    
      const token = getState().auth?.token || localStorage.getItem('kairox_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Attendance', 'Employee', 'SKU', 'Piece', 
    'Store', 'StoreList', 
    'AccessorySpec', 'AccessoryRequirement',
    'WageOrder', 'WageStyle', 'WageRate', 'WageRun', 
    'WageLedger','MaterialLot', 'MaterialSpec', 'MaterialStock', 'SupplierOrder','Users','Employees',
    'Breakdown', 'Clients', 'ClientOrders', 'Operations', 'Events','Inspections'
], // Caching Labels
  
  endpoints: (builder) => ({
    login:builder.mutation({
    query: (credentials) => ({
        url: '/api/v1/auth/login',
        method: 'POST',
        body: credentials,
      }),
    }),
    
    // --- BARCODE APIs ---
    barcodeResolve: builder.query({
      query: (code) => `/api/v1/barcode/resolve?code=${encodeURIComponent(code)}`
    }),
    getBarcodeOrders: builder.query({
      query: () => '/api/v1/barcode/orders'
    }),
    getPieceState: builder.query({
      query: (params) => {
        const qs = new URLSearchParams();
        if (params.code) qs.append('code', params.code);
        if (params.piece_id) qs.append('piece_id', params.piece_id);
        if (params.employee_barcode) qs.append('employee_barcode', params.employee_barcode);
        if (params.employee_id) qs.append('employee_id', params.employee_id);
        return `/api/v1/production/piece-state?${qs.toString()}`;
      }
    }),
    getSkus: builder.query({
      query: () => '/api/v1/production/skus',
      providesTags: ['SKU']
    }),
      getSkuPieces: builder.query({
      query: (arg) => {
        const skuId = typeof arg === 'object' ? arg.skuId : arg;
        const operationId = typeof arg === 'object' ? arg.operationId : null;
        let url = `/api/v1/production/skus/${encodeURIComponent(skuId)}/pieces`;
        if (operationId) url += `?operation_id=${encodeURIComponent(operationId)}`;
        return url;
      },
      providesTags: ['Piece']
    }),


    getMaterialLots: builder.query({
      query: (params = {}) => {
        const query = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (value) query.append(key, value);
        }
        return `/api/v1/materials/lots?${query.toString()}`;
      }
    }),
    productionCutting: builder.mutation({
      query: (payload) => ({ url: '/api/v1/production/log', method: 'POST', body: payload })
    }),
    productionLogTwoDoor: builder.mutation({
      query: (payload) => ({ url: '/api/v1/production/log', method: 'POST', body: payload })
    }),
    issueCuttingJobSheet: builder.mutation({
      query: (payload) => ({ url: '/api/v1/production/cutting/issue', method: 'POST', body: payload })
    }),
    reassignProductionEvent: builder.mutation({
      query: ({ id, employee_code, override_timestamp }) => ({ 
        url: `/api/v1/production/events/${id}/reassign`, 
        method: 'PATCH', 
        body: { employee_code, override_timestamp } 
      }),
      invalidatesTags: (result, error, { id }) => [{ type: 'Production', id }]
    }),
    deleteProductionEvent: builder.mutation({
      query: (id) => ({ url: `/api/v1/production/events/${id}`, method: 'DELETE' }),
      invalidatesTags: (result, error, id) => [{ type: 'Production', id }]
    }),
    

    // --- STORE HUB APIs ---
    storeScan: builder.mutation({
      query: (scanData) => ({ url: '/api/v1/store/scan', method: 'POST', body: scanData }),
      invalidatesTags: ['Store', 'StoreList']
    }),
    storeSend: builder.mutation({
      query: ({ piece_ids }) => ({ url: '/api/v1/store/send', method: 'POST', body: { piece_ids } }),
      invalidatesTags: ['Store', 'StoreList']
    }),
    listStorePieces: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams();
        qs.append('limit', params.limit || 500);
        if (params.code) qs.append('code', params.code);
        if (params.state) qs.append('state', params.state);
        if (params.offset) qs.append('offset', params.offset);
        return `/api/v1/store/pieces?${qs.toString()}`;
      },
      providesTags: ['StoreList']
    }),
    getStorePiece: builder.query({
      query: (pieceCode) => `/api/v1/store/pieces/${encodeURIComponent(pieceCode)}`,
      providesTags: (result, error, id) => [{ type: 'Store', id }]
    }),

    // --- ACCESSORY APIs ---
    getStyleMaterialSpec: builder.query({
      query: (styleId) => `/api/v1/styles/${encodeURIComponent(styleId)}/material-spec`,
      providesTags: (_result, _error, styleId) => [{ type: 'AccessorySpec', id: styleId }]
    }),
    putStyleMaterialSpec: builder.mutation({
      query: ({ styleId, lines }) => ({
        url: `/api/v1/styles/${encodeURIComponent(styleId)}/material-spec`,
        method: 'PUT',
        body: { lines }
      }),
      invalidatesTags: (_result, _error, { styleId }) => [{ type: 'AccessorySpec', id: styleId }]
    }),
    addStyleMaterialSpecLine: builder.mutation({
      query: ({ styleId, line }) => ({
        url: `/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/lines`,
        method: 'POST',
        body: line
      }),
      invalidatesTags: (_result, _error, { styleId }) => [{ type: 'AccessorySpec', id: styleId }]
    }),
    patchStyleMaterialSpecLine: builder.mutation({
      query: ({ styleId, lineId, patch }) => ({
        url: `/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/lines/${encodeURIComponent(lineId)}`,
        method: 'PATCH',
        body: patch
      }),
      invalidatesTags: (_result, _error, { styleId }) => [{ type: 'AccessorySpec', id: styleId }]
    }),
    deleteStyleMaterialSpecLine: builder.mutation({
      query: ({ styleId, lineId }) => ({
        url: `/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/lines/${encodeURIComponent(lineId)}`,
        method: 'DELETE'
      }),
      invalidatesTags: (_result, _error, { styleId }) => [{ type: 'AccessorySpec', id: styleId }]
    }),
    confirmStyleMaterialSpec: builder.mutation({
      query: ({ styleId, noAccessories }) => ({
        url: `/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/confirm`,
        method: 'POST',
        body: { no_accessories_declared: !!noAccessories }
      }),
      invalidatesTags: (_result, _error, { styleId }) => [{ type: 'AccessorySpec', id: styleId }]
    }),
    copyStyleMaterialSpec: builder.mutation({
      query: ({ styleId, fromStyleId }) => ({
        url: `/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/copy-from`,
        method: 'POST',
        body: { from_style_id: fromStyleId }
      }),
      invalidatesTags: (_result, _error, { styleId }) => [{ type: 'AccessorySpec', id: styleId }]
    }),
    getStyleMaterialRequirement: builder.query({
      query: (styleId) => `/api/v1/styles/${encodeURIComponent(styleId)}/material-spec/requirement`,
      providesTags: (_result, _error, styleId) => [{ type: 'AccessoryRequirement', id: styleId }]
    }),
    recordMaterialIssue: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/materials/issues',
        method: 'POST',
        body: payload
      })
    }),
    issueAccessoryKit: builder.mutation({
      query: (payload) => {
        const body = { part: 'ACCESSORY' };
        if (payload.employee) {
          if (payload.employee.employee_barcode || payload.employee.barcode) body.employee_barcode = payload.employee.employee_barcode || payload.employee.barcode;
          else if (payload.employee.id) body.employee_id = payload.employee.id;
        }
        if (payload.pieceId) body.piece_id = payload.pieceId;
        else if (payload.pieceBarcode) body.piece_barcode = payload.pieceBarcode;
        if (Array.isArray(payload.lines) && payload.lines.length > 0) body.lines = payload.lines;
        return {
          url: '/api/v1/store/scan',
          method: 'POST',
          body
        };
      },
      invalidatesTags: ['Store', 'StoreList', 'AccessoryRequirement']
    }),
    createSupplierOrder: builder.mutation({
      query: (orderData) => ({
        url: '/api/v1/suppliers/orders',
        method: 'POST',
        body: orderData
      })
    }),
 // ==========================================
    // WAGES APIs (Piece Rates, Run Engine, Ledger)
    // ==========================================
    
    // ─── 1. PIECE RATES & STYLES ───
    getWageOrders: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams();
        if (params.on) qs.append('on', params.on);
        if (params.unpricedOnly !== undefined) qs.append('unpriced_only', params.unpricedOnly);
        return `/api/v1/wages/orders${qs.toString() ? `?${qs.toString()}` : ''}`;
      },
      providesTags: ['WageOrder']
    }),
    getWageStyles: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams(params);
        return `/api/v1/wages/styles${qs.toString() ? `?${qs.toString()}` : ''}`;
      },
      providesTags: ['WageStyle']
    }),
    getRateSheet: builder.query({
      query: (styleCode) => `/api/v1/wages/rate-sheet?style_code=${encodeURIComponent(styleCode)}`,
      providesTags: ['WageRate']
    }),
    getRateHistory: builder.query({
      query: ({ styleCode, operationCode }) => 
        `/api/v1/wages/rate-history?style_code=${encodeURIComponent(styleCode)}&operation_code=${encodeURIComponent(operationCode)}`,
      providesTags: ['WageRate']
    }),
    setWageRateSingle: builder.mutation({
      query: (payload) => ({
        url: `/api/v1/wages/rates`,
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['WageRate']
    }),
    setWageRatesBulk: builder.mutation({
      query: (payload) => ({
        url: `/api/v1/wages/rates/bulk`,
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['WageRate']
    }),

    // ─── 2. RUN ENGINE (COMPUTATION) ───
    computeWageRun: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/wages/runs',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['WageRun', 'WageLedger']
    }),
    closeWageRun: builder.mutation({
      query: (runId) => ({
        url: `/api/v1/wages/runs/${encodeURIComponent(runId)}/close`,
        method: 'POST'
      }),
      invalidatesTags: ['WageRun', 'WageLedger']
    }),
    reopenWageRun: builder.mutation({
      query: ({ runId, reason }) => ({
        url: `/api/v1/wages/runs/${encodeURIComponent(runId)}/reopen`,
        method: 'POST',
        body: { reason }
      }),
      invalidatesTags: ['WageRun', 'WageLedger']
    }),
    recomputeWageRun: builder.mutation({
      query: ({ runId, confirmClosed = false }) => ({
        url: `/api/v1/wages/runs/${encodeURIComponent(runId)}/recompute`,
        method: 'POST',
        body: { confirm_closed: confirmClosed }
      }),
      invalidatesTags: ['WageRun', 'WageLedger']
    }),
    deleteWageRun: builder.mutation({
      query: (runId) => ({
        url: `/api/v1/wages/runs/${encodeURIComponent(runId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['WageRun', 'WageLedger']
    }),
    getWageRunBreakdown: builder.query({
      query: (runId) => `/api/v1/wages/runs/${encodeURIComponent(runId)}/breakdown`,
      providesTags: ['WageRun']
    }),
    getWageRunPieces: builder.query({
      query: ({ runId, styleCode, limit, offset }) => {
        const qs = new URLSearchParams();
        if (styleCode) qs.append('style_code', styleCode);
        if (limit) qs.append('limit', limit);
        if (offset) qs.append('offset', offset);
        return `/api/v1/wages/runs/${encodeURIComponent(runId)}/pieces${qs.toString() ? `?${qs.toString()}` : ''}`;
      },
      providesTags: ['WageRun']
    }),

    // ─── 3. LEDGER ───
    getWageLedger: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams();
        if (params.orderNumber) qs.append('order_number', params.orderNumber);
        if (params.styleCode) qs.append('style_code', params.styleCode);
        if (params.dateFrom) qs.append('date_from', params.dateFrom);
        if (params.dateTo) qs.append('date_to', params.dateTo);
        if (params.status) qs.append('status', params.status);
        if (params.limit) qs.append('limit', params.limit);
        if (params.offset) qs.append('offset', params.offset);
        return `/api/v1/wages/ledger${qs.toString() ? `?${qs.toString()}` : ''}`;
      }
    }),
})
});

// React Hooks auto-generated!
export const { 
  useLoginMutation,
  useBarcodeResolveQuery,
  useLazyBarcodeResolveQuery,
  useGetBarcodeOrdersQuery,
  useLazyGetBarcodeOrdersQuery,
  useGetPieceStateQuery,
  useLazyGetPieceStateQuery,
  useGetSkusQuery,
  useGetSkuPiecesQuery,
  useLazyGetSkuPiecesQuery,
  useGetMaterialLotsQuery,
  useLazyGetMaterialLotsQuery,
  useProductionCuttingMutation,
  useProductionLogTwoDoorMutation,
  useIssueCuttingJobSheetMutation,
  useReassignProductionEventMutation,
  useDeleteProductionEventMutation,
  useStoreScanMutation,
  useStoreSendMutation,
  useListStorePiecesQuery,
  useLazyListStorePiecesQuery,
  useGetStorePieceQuery,
  useLazyGetStorePieceQuery,
  useGetStyleMaterialSpecQuery,
  useLazyGetStyleMaterialSpecQuery,
  usePutStyleMaterialSpecMutation,
  useAddStyleMaterialSpecLineMutation,
  usePatchStyleMaterialSpecLineMutation,
  useDeleteStyleMaterialSpecLineMutation,
  useConfirmStyleMaterialSpecMutation,
  useCopyStyleMaterialSpecMutation,
  useGetStyleMaterialRequirementQuery,
  useLazyGetStyleMaterialRequirementQuery,
  useRecordMaterialIssueMutation,
  useIssueAccessoryKitMutation,
  useCreateSupplierOrderMutation,
    useGetWageOrdersQuery,
  useLazyGetWageOrdersQuery,
  useGetWageStylesQuery,
  useLazyGetWageStylesQuery,
  useGetRateSheetQuery,
  useLazyGetRateSheetQuery,
  useGetRateHistoryQuery,
  useLazyGetRateHistoryQuery,
  useSetWageRateSingleMutation,
  useSetWageRatesBulkMutation,
  useComputeWageRunMutation,
  useCloseWageRunMutation,
  useReopenWageRunMutation,
  useRecomputeWageRunMutation,
  useDeleteWageRunMutation,
  useGetWageRunBreakdownQuery,
  useLazyGetWageRunBreakdownQuery,
  useGetWageRunPiecesQuery,
  useLazyGetWageRunPiecesQuery,
  useGetWageLedgerQuery,
  useLazyGetWageLedgerQuery,

} = apiSlice
