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
  tagTypes: ['Attendance', 'Employee', 'SKU', 'Piece', 'Drawer', 'DrawerPool', 'DrawerList', 'AccessorySpec', 'AccessoryRequirement'], // Caching Labels
  
  endpoints: (builder) => ({
    // 1. Get My Status
    getMyStatus: builder.query({
      query: () => '/api/v1/attendance/me/status',
      providesTags: ['Attendance']
    }),

    // 2. Get My History
    getMyHistory: builder.query({
      query: ({ start, end }) => `/api/v1/attendance/me?start=${start}&end=${end}`,
      providesTags: ['Attendance']
    }),

    // 3. Self Check-In
    checkIn: builder.mutation({
      query: () => ({
        url: '/api/v1/attendance/check-in',
        method: 'POST',
        body: {}
      }),
      invalidatesTags: ['Attendance'] // Check-in aana udane mela ulla 1 & 2 ah thirumba fetch panna sollum (Auto-refresh)
    }),

    // 4. Self Check-Out
    checkOut: builder.mutation({
      query: () => ({
        url: '/api/v1/attendance/check-out',
        method: 'POST',
        body: {}
      }),
      invalidatesTags: ['Attendance']
    }),
  
// 5. Get All Employees (For Floor Command)
    getEmployees: builder.query({
      query: () => '/api/v1/employees',
      providesTags: ['Employee']
    }),
    // 6. Get Today's Overall Attendance (For Floor Command & HR)
    getAttendanceToday: builder.query({
      query: () => '/api/v1/attendance/today',
      providesTags: ['Attendance']
    }),
    // 7. Get Attendance Config
    getAttendanceConfig: builder.query({
      query: () => '/api/v1/attendance/config',
 
    }),
    // 8. Floor Command Barcode Scan Check-In
    scanCheckIn: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/attendance/scan-check-in',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Attendance']
    }),

    // 9. Add New Employee
    addEmployee: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/employees',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Employee']
    }),

    // 10. Proxy Check-In (Bulk)
    proxyCheckIn: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/attendance/proxy/check-in',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Attendance']
    }),

    // 11. Proxy Check-Out (Bulk)
    proxyCheckOut: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/attendance/proxy/check-out',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Attendance']
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
      query: (skuId) => `/api/v1/production/skus/${encodeURIComponent(skuId)}/pieces`,
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

    

    // --- STORE HUB APIs ---
    getDrawerPool: builder.query({
      query: () => '/api/v1/drawers/pool',
      providesTags: ['DrawerPool']
    }),
    storeDrawerScan: builder.mutation({
      query: (drawerData) => ({ url: '/api/v1/drawers/store-scan', method: 'POST', body: drawerData }),
      invalidatesTags: ['Drawer', 'DrawerList']
    }),
    sendDrawers: builder.mutation({
      query: ({ drawer_ids, destination }) => ({ url: '/api/v1/drawers/send', method: 'POST', body: { drawer_ids, destination } }),
      invalidatesTags: ['Drawer', 'DrawerPool', 'DrawerList']
    }),
    receiveDrawer: builder.mutation({
      query: ({ drawerId, transition }) => ({ url: `/api/v1/drawers/${encodeURIComponent(drawerId)}/receive`, method: 'POST', body: { transition } }),
      invalidatesTags: ['Drawer', 'DrawerList']
    }),
    listDrawers: builder.query({
      query: (params = {}) => {
        const qs = new URLSearchParams();
        qs.append('limit', params.limit || 500);
        if (params.code) qs.append('code', params.code);
        if (params.seq_from) qs.append('seq_from', params.seq_from);
        if (params.seq_to) qs.append('seq_to', params.seq_to);
        if (params.state) qs.append('state', params.state);
        if (params.offset) qs.append('offset', params.offset);
        if (params.has_piece !== undefined) qs.append('has_piece', params.has_piece);
        if (params.sendable !== undefined) qs.append('sendable', params.sendable);
        return `/api/v1/drawers?${qs.toString()}`;
      },
      providesTags: ['DrawerList']
    }),
    getDrawer: builder.query({
      query: (drawerId) => `/api/v1/drawers/${encodeURIComponent(drawerId)}`,
      providesTags: (result, error, id) => [{ type: 'Drawer', id }]
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
        if (payload.drawerId) body.drawer_id = payload.drawerId;
        else if (payload.drawerBarcode) body.drawer_barcode = payload.drawerBarcode;
        if (payload.pieceId) body.piece_id = payload.pieceId;
        else if (payload.pieceBarcode) body.piece_barcode = payload.pieceBarcode;
        if (Array.isArray(payload.lines) && payload.lines.length > 0) body.lines = payload.lines;
        return {
          url: '/api/v1/drawers/store-scan',
          method: 'POST',
          body
        };
      },
      invalidatesTags: ['Drawer', 'DrawerList', 'AccessoryRequirement']
    }),
    createSupplierOrder: builder.mutation({
      query: (orderData) => ({
        url: '/api/v1/suppliers/orders',
        method: 'POST',
        body: orderData
      })
    })

  })
});

// React Hooks auto-generated!
export const { 
  useGetMyStatusQuery, 
  useGetMyHistoryQuery, 
  useCheckInMutation, 
  useCheckOutMutation,
  useGetEmployeesQuery,
  useGetAttendanceTodayQuery,
  useGetAttendanceConfigQuery,
  useScanCheckInMutation,
  useAddEmployeeMutation,
  useProxyCheckInMutation,
  useProxyCheckOutMutation,
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
  useGetDrawerPoolQuery,
  useLazyGetDrawerPoolQuery,
  useStoreDrawerScanMutation,
  useSendDrawersMutation,
  useReceiveDrawerMutation,
  useListDrawersQuery,
  useLazyListDrawersQuery,
  useGetDrawerQuery,
  useLazyGetDrawerQuery,
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
} = apiSlice
