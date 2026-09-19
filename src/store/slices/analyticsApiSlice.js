import { apiSlice } from './apiSlice';

export const analyticsApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getAnalyticsExplore: builder.query({
      query: () => '/api/v1/analytics/explorer',
    }),
    getStyleDetail: builder.query({
      query: (styleId) => `/api/v1/analytics/styles/${encodeURIComponent(styleId)}/detail`,
    }),
    getPieceDetail: builder.query({
      query: ({ pieceCode, skuCode, seq }) => {
        const params = new URLSearchParams();
        if (pieceCode) params.append('piece_code', pieceCode);
        if (skuCode) params.append('sku_code', skuCode);
        if (seq !== undefined && seq !== null) params.append('seq', seq);
        const qs = params.toString();
        return `/api/v1/analytics/pieces/detail${qs ? '?' + qs : ''}`;
      },
    }),
  }),
  overrideExisting: false,
});

export const {
  useGetAnalyticsExploreQuery,
  useLazyGetAnalyticsExploreQuery,
  useGetStyleDetailQuery,
  useLazyGetStyleDetailQuery,
  useGetPieceDetailQuery,
  useLazyGetPieceDetailQuery,
} = analyticsApiSlice;
