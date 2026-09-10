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

        // PATCH /api/v1/suppliers/orders/{id}
        patchSupplierOrder: builder.mutation({
            query: ({ orderId, status = 'ARRIVED' }) => ({
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
    usePatchSupplierOrderMutation,
    usePatchSupplierOrderSpecMutation,
} = materialApiSlice;
