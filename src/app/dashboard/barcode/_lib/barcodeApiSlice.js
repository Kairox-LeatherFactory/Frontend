import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { normalizeEmployee } from './helpers';

/**
 * ============================================================================
 * BARCODE RTK QUERY API SLICE
 * ============================================================================
 * 6 endpoints replacing 21 individual useState fields for server-fetched data.
 * Each endpoint auto-manages loading, error, and caching.
 *
 * Auth token is injected via prepareHeaders reading from localStorage
 * (same source as AuthContext).
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const barcodeApi = createApi({
  reducerPath: 'barcodeApi',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE_URL,
    prepareHeaders: (headers) => {
      const token = typeof window !== 'undefined'
        ? localStorage.getItem('kairox_token')
        : null;
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Employees', 'Drawers', 'Materials', 'BarcodeOrders', 'OrderMeta', 'OrderBarcodes'],
  endpoints: (builder) => ({
    // ────────────────────────────────────────────────────────────────────
    // 1. GET /api/v1/employees
    // Replaces: employeeDirectory, employeesLoading, employeesError, employeesReloadKey
    // ────────────────────────────────────────────────────────────────────
    getEmployees: builder.query({
      query: () => '/api/v1/employees',
      transformResponse: (response) => {
        const rows = Array.isArray(response) ? response : [];
        return rows.map(normalizeEmployee);
      },
      providesTags: ['Employees'],
    }),

    // ────────────────────────────────────────────────────────────────────
    // 2. GET /api/v1/drawers
    // Replaces: drawerDirectory, drawerTotal, drawerLoading, drawerError, drawerReloadKey
    // ────────────────────────────────────────────────────────────────────
    listDrawers: builder.query({
      query: ({ state, seqFrom, seqTo } = {}) => {
        const params = new URLSearchParams();
        params.set('limit', '500');
        if (state && state !== 'ALL') params.set('state', state);
        if (seqFrom) params.set('seq_from', parseInt(seqFrom, 10));
        if (seqTo) params.set('seq_to', parseInt(seqTo, 10));
        return `/api/v1/drawers?${params.toString()}`;
      },
      transformResponse: (response) => {
        if (response && Array.isArray(response.items)) {
          return { items: response.items, total: response.total ?? response.items.length };
        }
        if (Array.isArray(response)) {
          return { items: response, total: response.length };
        }
        return { items: [], total: 0 };
      },
      providesTags: ['Drawers'],
    }),

    // ────────────────────────────────────────────────────────────────────
    // 3. GET /api/v1/barcode/materials
    // Replaces: materialDirectory, materialsLoading, materialsError, materialsReloadKey
    // Fallback to /api/v1/materials/lots handled in queryFn
    // ────────────────────────────────────────────────────────────────────
    getBarcodeMaterials: builder.query({
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        // Try primary endpoint first
        const primary = await fetchWithBQ('/api/v1/barcode/materials?active_only=false');
        if (!primary.error) {
          const res = primary.data;
          const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
          return { data: items };
        }
        // Fallback to /materials/lots
        const fallback = await fetchWithBQ('/api/v1/materials/lots');
        if (!fallback.error) {
          const res = fallback.data;
          const items = Array.isArray(res?.items) ? res.items : Array.isArray(res) ? res : [];
          return { data: items };
        }
        return { error: fallback.error };
      },
      providesTags: ['Materials'],
    }),

    // ────────────────────────────────────────────────────────────────────
    // 4. GET /api/v1/barcode/orders
    // Replaces: orders, ordersLoading, ordersError
    // ────────────────────────────────────────────────────────────────────
    getBarcodeOrders: builder.query({
      query: () => '/api/v1/barcode/orders',
      transformResponse: (response) => Array.isArray(response) ? response : [],
      providesTags: ['BarcodeOrders'],
    }),

    // ────────────────────────────────────────────────────────────────────
    // 5. GET /api/v1/barcode/orders/:id/skus + /analytics (combined)
    // Replaces: skuOptions, analytics, orderMetaLoading, orderMetaError
    // ────────────────────────────────────────────────────────────────────
    getOrderMeta: builder.query({
      async queryFn(orderId, _queryApi, _extraOptions, fetchWithBQ) {
        const [skusResult, analyticsResult] = await Promise.all([
          fetchWithBQ(`/api/v1/barcode/orders/${encodeURIComponent(orderId)}/skus`),
          fetchWithBQ(`/api/v1/barcode/orders/${encodeURIComponent(orderId)}/analytics`),
        ]);
        if (skusResult.error) return { error: skusResult.error };
        if (analyticsResult.error) return { error: analyticsResult.error };
        return {
          data: {
            skuOptions: Array.isArray(skusResult.data) ? skusResult.data : [],
            analytics: analyticsResult.data,
          },
        };
      },
      providesTags: (_result, _error, orderId) => [{ type: 'OrderMeta', id: orderId }],
    }),

    // ────────────────────────────────────────────────────────────────────
    // 6. GET /api/v1/barcode/orders/:id/barcodes
    // Replaces: historyData, historyLoading, historyError
    // ────────────────────────────────────────────────────────────────────
    getOrderBarcodes: builder.query({
      query: ({ orderId, styleId, size, page, pageSize }) => {
        const params = new URLSearchParams();
        if (styleId && styleId !== 'ALL') params.set('style_id', styleId);
        if (size && size !== 'ALL') params.set('size', size);
        if (page) params.set('page', page);
        if (pageSize) params.set('page_size', pageSize);
        const qs = params.toString();
        return `/api/v1/barcode/orders/${encodeURIComponent(orderId)}/barcodes${qs ? `?${qs}` : ''}`;
      },
      providesTags: (_result, _error, arg) => [{ type: 'OrderBarcodes', id: arg.orderId }],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useListDrawersQuery,
  useGetBarcodeMaterialsQuery,
  useGetBarcodeOrdersQuery,
  useGetOrderMetaQuery,
  useGetOrderBarcodesQuery,
} = barcodeApi;
