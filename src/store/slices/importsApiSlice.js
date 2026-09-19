import { apiSlice } from './apiSlice';

export const importsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getBreakdown: builder.query({
      query: (orderNumber) => `/api/v1/imports/breakdown/${encodeURIComponent(orderNumber)}`,
      providesTags: (result, error, arg) => [{ type: 'Breakdown', id: arg }],
    }),
    getDrawerPool: builder.query({
      query: () => '/api/v1/drawers/pool',
      providesTags: ['DrawerPool'],
    }),
    patchBreakdownSku: builder.mutation({
      query: ({ skuId, ...payload }) => ({
        url: `/api/v1/imports/breakdown/skus/${encodeURIComponent(skuId)}`,
        method: 'PATCH',
        body: payload,
      }),
     
      invalidatesTags: (result, error, { orderNumber }) => [{ type: 'Breakdown', id: orderNumber }],
    }),
    deleteBreakdownSku: builder.mutation({
      query: ({ skuId }) => ({
        url: `/api/v1/imports/breakdown/skus/${encodeURIComponent(skuId)}`,
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, { orderNumber }) => [{ type: 'Breakdown', id: orderNumber }],
    }),
    cancelBreakdownStyles: builder.mutation({
      query: ({ orderNumber, styleIds }) => ({
        url: `/api/v1/imports/breakdown/${encodeURIComponent(orderNumber)}/cancel`,
        method: 'POST',
        body: { style_ids: styleIds },
      }),
      invalidatesTags: (result, error, { orderNumber }) => [{ type: 'Breakdown', id: orderNumber }],
    }),
    releaseBreakdownStyles: builder.mutation({
      query: ({ orderNumber, styleIds, growDrawerPool = false, needsLining }) => {
        const payload = { style_ids: styleIds, grow_drawer_pool: growDrawerPool };
        if (needsLining !== undefined) payload.needs_lining = needsLining;
        return {
          url: `/api/v1/imports/breakdown/${encodeURIComponent(orderNumber)}/release`,
          method: 'POST',
          body: payload,
        };
      },
      
      invalidatesTags: (result, error, { orderNumber }) => [{ type: 'Breakdown', id: orderNumber }, 'DrawerPool'],
    }),
    growDrawerPool: builder.mutation({
      query: ({ add }) => ({
        url: '/api/v1/drawers/pool',
        method: 'POST',
        body: { add },
      }),
      invalidatesTags: ['DrawerPool'],
    }),
    allocateWaitingDrawers: builder.mutation({
      query: () => ({
        url: '/api/v1/drawers/allocate-waiting',
        method: 'POST',
      }),
      invalidatesTags: ['DrawerPool'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetBreakdownQuery,
  useGetDrawerPoolQuery,
  usePatchBreakdownSkuMutation,
  useDeleteBreakdownSkuMutation,
  useCancelBreakdownStylesMutation,
  useReleaseBreakdownStylesMutation,
  useGrowDrawerPoolMutation,
  useAllocateWaitingDrawersMutation,
} = importsApiSlice;
