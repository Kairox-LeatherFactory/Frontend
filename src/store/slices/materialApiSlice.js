import { apiSlice } from './apiSlice';

export const materialApiSlice = apiSlice.injectEndpoints({
    endpoints: (builder) => ({

        // GET /api/v1/materials/spec?category=&subtype=
        getMaterialSpec: builder.query({
            query: ({ category, subtype } = {}) => {
                const qs = new URLSearchParams();
                if (category) qs.append('category', category);
                if (subtype) qs.append('subtype', subtype);
                return `/api/v1/materials/spec?${qs.toString()}`;
            },
            providesTags: ['MaterialSpec'],
        }),

        // GET /api/v1/materials/lots?...
        getMaterialLots: builder.query({
            query: (params = {}) => {
                const qs = new URLSearchParams();
                for (const [key, value] of Object.entries(params)) {
                    if (value) qs.append(key, value);
                }
                return `/api/v1/materials/lots?${qs.toString()}`;
            },
            providesTags: ['MaterialLot'],
        }),

        // GET /api/v1/materials/lots/{lot_id}
        getMaterialLot: builder.query({
            query: (lotId) => `/api/v1/materials/lots/${encodeURIComponent(lotId)}`,
            providesTags: (result, error, id) => [{ type: 'MaterialLot', id }],
        }),

        // GET /api/v1/materials/stock?...
        getMaterialsStock: builder.query({
            query: (params = {}) => `/api/v1/materials/stock?${new URLSearchParams(params).toString()}`,
            providesTags: ['MaterialStock'],
        }),

        // POST /api/v1/materials/lots
        createMaterialLot: builder.mutation({
            query: (lotData) => ({ url: '/api/v1/materials/lots', method: 'POST', body: lotData }),
            invalidatesTags: ['MaterialLot', 'MaterialStock'],
        }),

        // PATCH /api/v1/materials/lots/{lot_id}
        patchMaterialLot: builder.mutation({
            query: ({ lotId, ...payload }) => ({
                url: `/api/v1/materials/lots/${encodeURIComponent(lotId)}`,
                method: 'PATCH',
                body: payload,
            }),
            invalidatesTags: (result, error, { lotId }) => [{ type: 'MaterialLot', id: lotId }, 'MaterialStock'],
        }),

        // PATCH /api/v1/materials/lots/{lot_id}/adjust
        adjustMaterialLot: builder.mutation({
            query: ({ lotId, delta, reason }) => ({
                url: `/api/v1/materials/lots/${encodeURIComponent(lotId)}/adjust`,
                method: 'PATCH',
                body: { delta, reason },
            }),
            invalidatesTags: (result, error, { lotId }) => [{ type: 'MaterialLot', id: lotId }, 'MaterialStock'],
        }),

        // DELETE /api/v1/materials/lots/{lot_id}
        retireMaterialLot: builder.mutation({
            query: (lotId) => ({
                url: `/api/v1/materials/lots/${encodeURIComponent(lotId)}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['MaterialLot', 'MaterialStock'],
        }),

        // POST /api/v1/materials/receive
        receiveMaterials: builder.mutation({
            query: (receiveData) => ({ url: '/api/v1/materials/receive', method: 'POST', body: receiveData }),
            invalidatesTags: ['MaterialLot', 'MaterialStock'],
        }),

        // POST /api/v1/suppliers/orders
        createSupplierOrder: builder.mutation({
            query: (orderData) => ({
                url: '/api/v1/suppliers/orders',
                method: 'POST',
                body: orderData,
            }),
            invalidatesTags: ['SupplierOrder'],
        }),

        // PATCH /api/v1/suppliers/orders/{id}
        patchSupplierOrder: builder.mutation({
            query: ({ orderId, status = 'arrived' }) => ({
                url: `/api/v1/suppliers/orders/${encodeURIComponent(orderId)}`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: ['SupplierOrder'],
        }),

        // PATCH /api/v1/suppliers/orders/{id}/spec
        patchSupplierOrderSpec: builder.mutation({
            query: ({ orderId, ...payload }) => ({
                url: `/api/v1/suppliers/orders/${encodeURIComponent(orderId)}/spec`,
                method: 'PATCH',
                body: payload,
            }),
            invalidatesTags: ['SupplierOrder'],
        }),

        // GET /api/v1/materials/lots/{id}/history
        getMaterialLotHistory: builder.query({
            query: (lotId) => `/api/v1/materials/lots/${encodeURIComponent(lotId)}/history`,
            providesTags: (result, error, id) => [{ type: 'MaterialLot', id }],
        }),

        // GET /api/v1/procurement/suppliers — lots only carry supplier_id, so names are looked up here
        getSuppliers: builder.query({
            query: () => '/api/v1/procurement/suppliers',
            transformResponse: (res) => (Array.isArray(res) ? res : res?.suppliers || res?.items || []),
            keepUnusedDataFor: 600,
        }),

        // GET /api/v1/materials/leather-by-style
        getLeatherByStyle: builder.query({
            query: (params = {}) => `/api/v1/materials/leather-by-style?${new URLSearchParams(params).toString()}`,
            providesTags: ['MaterialStock'],
        }),

        // GET /api/v1/materials/pieces/{piece_id}/consumption
        getPieceConsumption: builder.query({
            query: (pieceId) => `/api/v1/materials/pieces/${encodeURIComponent(pieceId)}/consumption`,
            providesTags: (result, error, id) => [{ type: 'MaterialLot', id }],
        }),

        // POST /api/v1/materials/arrivals
        createMaterialArrival: builder.mutation({
            query: (arrivalData) => ({
                url: '/api/v1/materials/arrivals',
                method: 'POST',
                body: arrivalData,
            }),
            invalidatesTags: ['MaterialArrival', 'MaterialLot', 'MaterialStock'],
        }),

        // GET /api/v1/materials/arrivals
        getMaterialArrivals: builder.query({
            query: (params = {}) => {
                const qs = new URLSearchParams();
                for (const [key, value] of Object.entries(params)) {
                    if (value !== undefined && value !== null && value !== '') qs.append(key, value);
                }
                return `/api/v1/materials/arrivals${qs.toString() ? `?${qs.toString()}` : ''}`;
            },
            providesTags: ['MaterialArrival'],
        }),

        // GET /api/v1/materials/lots/{lot_id}/sheets
        getLotSheets: builder.query({
            query: (lotId) => `/api/v1/materials/lots/${encodeURIComponent(lotId)}/sheets`,
            transformResponse: (res) => (Array.isArray(res) ? res : res?.sheets || []),
            providesTags: (result, error, lotId) => [{ type: 'MaterialLot', id: lotId }],
        }),

        // POST /api/v1/materials/lots/{lot_id}/sheets
        createLotSheet: builder.mutation({
            query: ({ lotId, sheets, ...sheetData }) => {
                const bodyPayload = sheets 
                    ? { sheets } 
                    : (sheetData.dcm !== undefined ? { sheets: [{ dcm: Number(sheetData.dcm), note: sheetData.note || null }] } : sheetData);
                return {
                    url: `/api/v1/materials/lots/${encodeURIComponent(lotId)}/sheets`,
                    method: 'POST',
                    body: bodyPayload,
                };
            },
            invalidatesTags: (result, error, { lotId }) => [{ type: 'MaterialLot', id: lotId }, 'MaterialStock'],
        }),

        // PATCH /api/v1/materials/sheets/{sheet_id}  (lotId only used to refresh that lot's sheets)
        patchLotSheet: builder.mutation({
            query: ({ sheetId, lotId, ...payload }) => ({
                url: `/api/v1/materials/sheets/${encodeURIComponent(sheetId)}`,
                method: 'PATCH',
                body: payload,
            }),
            invalidatesTags: (result, error, { lotId }) => [{ type: 'MaterialLot', id: lotId }, 'MaterialStock'],
        }),

        // DELETE /api/v1/materials/sheets/{sheet_id}
        deleteLotSheet: builder.mutation({
            query: ({ sheetId }) => ({
                url: `/api/v1/materials/sheets/${encodeURIComponent(sheetId)}`,
                method: 'DELETE',
            }),
            invalidatesTags: (result, error, { lotId }) => [{ type: 'MaterialLot', id: lotId }, 'MaterialStock'],
        }),

        // POST /api/v1/materials/arrivals/{receipt_id}/complete
        completeMaterialArrival: builder.mutation({
            query: ({ receiptId, ...payload }) => ({
                url: `/api/v1/materials/arrivals/${encodeURIComponent(receiptId)}/complete`,
                method: 'POST',
                body: payload,
            }),
            invalidatesTags: ['MaterialArrival', 'MaterialLot', 'MaterialStock'],
        }),
    }),
    overrideExisting: true,
});

export const {
    useGetMaterialSpecQuery,
    useLazyGetMaterialSpecQuery,
    useGetMaterialLotsQuery,
    useLazyGetMaterialLotsQuery,
    useGetMaterialLotQuery,
    useLazyGetMaterialLotQuery,
    useGetMaterialsStockQuery,
    useLazyGetMaterialsStockQuery,
    useCreateMaterialLotMutation,
    usePatchMaterialLotMutation,
    useAdjustMaterialLotMutation,
    useRetireMaterialLotMutation,
    useReceiveMaterialsMutation,
    useCreateSupplierOrderMutation,
    usePatchSupplierOrderMutation,
    usePatchSupplierOrderSpecMutation,
    useGetMaterialLotHistoryQuery,
    useGetSuppliersQuery,
    useGetLeatherByStyleQuery,
    useGetPieceConsumptionQuery,
    useLazyGetPieceConsumptionQuery,
    useCreateMaterialArrivalMutation,
    useGetMaterialArrivalsQuery,
    useLazyGetMaterialArrivalsQuery,
    useGetLotSheetsQuery,
    useCreateLotSheetMutation,
    usePatchLotSheetMutation,
    useDeleteLotSheetMutation,
    useCompleteMaterialArrivalMutation,
} = materialApiSlice;
