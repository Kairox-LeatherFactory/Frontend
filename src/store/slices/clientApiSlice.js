import { apiSlice } from './apiSlice';

export const entryApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // --- CLIENTS & ORDERS ---
    getClients: builder.query({
      query: () => '/api/v1/clients',
      providesTags: ['Clients'],
    }),
    
    createClient: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/clients',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Clients'],
    }),

    getClientOrders: builder.query({
      query: (clientId) => `/api/v1/clients/${encodeURIComponent(clientId)}/orders`,
      providesTags: (_result, _error, clientId) => [{ type: 'ClientOrders', id: clientId }],
    }),

    addClientOrder: builder.mutation({
      query: ({ clientId, payload }) => ({
        url: `/api/v1/clients/${encodeURIComponent(clientId)}/orders`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: (_result, _error, { clientId }) => [{ type: 'ClientOrders', id: clientId }],
    }),

    // --- PRODUCTION ENTRY DATA ---
    getOperations: builder.query({
      query: () => '/api/v1/production/operations',
      providesTags: ['Operations'],
    }),

    getEvents: builder.query({
      query: () => '/api/v1/production/events',
      providesTags: ['Events'],
    }),

    addScanEvent: builder.mutation({
      query: (payload) => {
        const logPayload = {
          screen_context: 'PIPELINE',
          actor: {
            employee_id: payload.employee_id
          },
          targets: {
            sku_id: payload.sku_id,
            piece_seqs: payload.piece_seqs || []
          },
          work_date: payload.work_date
        };
        return {
          url: '/api/v1/production/log',
          method: 'POST',
          body: logPayload,
        };
      },
      invalidatesTags: ['Events', 'Piece'],
    }),
  }),
});

export const {
  useGetClientsQuery,
  useCreateClientMutation,
  useGetClientOrdersQuery,
  useAddClientOrderMutation,
  useGetOperationsQuery,
  useGetEventsQuery,
  useAddScanEventMutation,
} = entryApiSlice;
