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
  tagTypes: ['Employees', /* 'Drawers' — DEPRECATED: drawer system removed (store migration) */ 'Materials', 'BarcodeOrders', 'OrderMeta', 'OrderBarcodes', 'LeatherLots', 'LotSheets'],
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
    // 3. GET /api/v1/barcode/materials
    // Replaces: materialDirectory, materialsLoading, materialsError, materialsReloadKey
    // Fallback to /api/v1/materials/lots handled in queryFn
    // ────────────────────────────────────────────────────────────────────
    getBarcodeMaterials: builder.query({
      async queryFn(arg, _queryApi, _extraOptions, fetchWithBQ) {
        const cat = (typeof arg === 'string' ? arg : arg?.category) || 'ACCESSORY';
        // Try with category=ACCESSORY first (official MaterialCategory enum in OpenAPI spec)
        let primary = await fetchWithBQ(`/api/v1/barcode/materials?category=${encodeURIComponent(cat)}&active_only=false`);
        // If error or 0 results and cat was ACCESSORY, retry with plural ACCESSORIES
        if (primary.error || (Array.isArray(primary.data?.items || primary.data?.lots) && (primary.data.items || primary.data.lots).length === 0)) {
          const altCat = cat === 'ACCESSORY' ? 'ACCESSORIES' : 'ACCESSORY';
          const alt = await fetchWithBQ(`/api/v1/barcode/materials?category=${encodeURIComponent(altCat)}&active_only=false`);
          if (!alt.error && (alt.data?.items?.length > 0 || alt.data?.lots?.length > 0 || (Array.isArray(alt.data) && alt.data.length > 0))) {
            primary = alt;
          }
        }
        if (!primary.error) {
          const res = primary.data;
          const rawItems = Array.isArray(res?.lots)
            ? res.lots
            : Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res)
            ? res
            : [];
          // Ensure only accessories are returned
          const items = rawItems.filter(
            (m) => !m.category || m.category.toUpperCase().startsWith('ACCESSOR')
          );
          return { data: items };
        }
        // Fallback to /materials/lots
        let fallback = await fetchWithBQ(`/api/v1/materials/lots?category=${encodeURIComponent(cat)}`);
        if (fallback.error) {
          fallback = await fetchWithBQ('/api/v1/materials/lots?category=ACCESSORIES');
        }
        if (!fallback.error) {
          const res = fallback.data;
          const rawItems = Array.isArray(res?.lots)
            ? res.lots
            : Array.isArray(res?.items)
            ? res.items
            : Array.isArray(res)
            ? res
            : [];
          const items = rawItems.filter(
            (m) => !m.category || m.category.toUpperCase().startsWith('ACCESSOR')
          );
          return { data: items };
        }
        return { error: primary.error || fallback.error };
      },
      providesTags: ['Materials'],
    }),

    // ────────────────────────────────────────────────────────────────────
    // 4. GET /api/v1/barcode/orders
    // Replaces: orders, ordersLoading, ordersError
    // ────────────────────────────────────────────────────────────────────
    // Response shape (paginated):
    //   { items: [{ order_id, order_number, client_name, minted,
    //     first_generated_at, last_generated_at }], total, limit, offset,
    //   count, has_more }
    // Walks every page (while has_more) and returns the flat items array.
    getBarcodeOrders: builder.query({
      async queryFn(_arg, _queryApi, _extraOptions, fetchWithBQ) {
        const limit = 50;
        const all = [];
        let offset = 0;
        // Hard cap on pages as a guard against a backend that never clears has_more
        for (let page = 0; page < 100; page += 1) {
          const result = await fetchWithBQ(`/api/v1/barcode/orders?limit=${limit}&offset=${offset}`);
          if (result.error) return { error: result.error };
          const res = result.data;
          if (Array.isArray(res)) return { data: res };
          const items = Array.isArray(res?.items) ? res.items : [];
          all.push(...items);
          if (!res?.has_more || items.length === 0) break;
          offset += items.length;
        }
        return { data: all };
      },
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

    // ────────────────────────────────────────────────────────────────────
    // 7. GET /api/v1/materials/lots?category=LEATHER
    // Leather lots offered in the Sheet Barcode generator (called once an
    // order is selected). Response shape:
    //   { count, lots: [{ lot_id, barcode, article, colour, thickness, uom,
    //     available, sheets_balance, ... }], options: { article, colour,
    //     thickness, size }, suggested_lot_id, required }
    // ────────────────────────────────────────────────────────────────────
    getLeatherLots: builder.query({
      query: () => '/api/v1/materials/lots?category=LEATHER',
      transformResponse: (response) => {
        const lots = Array.isArray(response)
          ? response
          : Array.isArray(response?.lots)
          ? response.lots
          : Array.isArray(response?.items)
          ? response.items
          : [];
        return {
          count: response?.count ?? lots.length,
          lots,
          options: response?.options ?? {},
          suggested_lot_id: response?.suggested_lot_id ?? null,
          required: response?.required ?? null,
        };
      },
      providesTags: ['LeatherLots'],
    }),

    // ────────────────────────────────────────────────────────────────────
    // 8. GET /api/v1/materials/lots/:lotId/sheets
    // Individual leather sheets of a lot — each sheet's `code` is its barcode
    // ────────────────────────────────────────────────────────────────────
    getLotSheets: builder.query({
      query: (lotId) => `/api/v1/materials/lots/${encodeURIComponent(lotId)}/sheets`,
      providesTags: (_result, _error, lotId) => [{ type: 'LotSheets', id: lotId }],
    }),
  }),
});

export const {
  useGetEmployeesQuery,
  useGetBarcodeMaterialsQuery,
  useGetBarcodeOrdersQuery,
  useGetOrderMetaQuery,
  useGetOrderBarcodesQuery,
  useGetLeatherLotsQuery,
  useGetLotSheetsQuery,
} = barcodeApi;
