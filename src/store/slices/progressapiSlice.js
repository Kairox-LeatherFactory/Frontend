import { apiSlice } from './apiSlice';

export const progressApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getOrderTree: builder.query({
      query: (orderId) => `/api/v1/analytics/orders/${encodeURIComponent(orderId)}/tree`,
    }),
    getOrderBarcodeSkus: builder.query({
      query: (orderId) => `/api/v1/barcode/orders/${encodeURIComponent(orderId)}/skus`,
    }),
    getOrderBarcodes: builder.query({
      query: ({ orderId, styleId, pageSize }) => {
        const params = new URLSearchParams();
        if (styleId) params.append('style_id', styleId);
        if (pageSize) params.append('page_size', pageSize);
        const qs = params.toString();
        return `/api/v1/barcode/orders/${encodeURIComponent(orderId)}/barcodes${qs ? '?' + qs : ''}`;
      },
    }),
    getDirectManagerOrderDetail: builder.query({
      query: (orderId) => `/api/v1/dashboard/direct-manager/orders/${encodeURIComponent(orderId)}`,
    }),
    getDirectManagerStyleDetail: builder.query({
      query: (styleId) => `/api/v1/dashboard/direct-manager/styles/${encodeURIComponent(styleId)}`,
    }),
    getDirectManagerPieceDetail: builder.query({
      query: (pieceCode) => `/api/v1/dashboard/direct-manager/pieces/${encodeURIComponent(pieceCode)}`,
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetOrderTreeQuery,
  useLazyGetOrderTreeQuery,
  useGetOrderBarcodeSkusQuery,
  useLazyGetOrderBarcodeSkusQuery,
  useGetOrderBarcodesQuery,
  useLazyGetOrderBarcodesQuery,
  useGetDirectManagerOrderDetailQuery,
  useLazyGetDirectManagerOrderDetailQuery,
  useGetDirectManagerStyleDetailQuery,
  useLazyGetDirectManagerStyleDetailQuery,
  useGetDirectManagerPieceDetailQuery,
  useLazyGetDirectManagerPieceDetailQuery,
} = progressApiSlice;
