import { apiSlice } from './apiSlice';

export const inspectionApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // POST /api/v1/inspections
    createInspection: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/inspections',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Inspections', 'Production'],
    }),

    // GET /api/v1/inspections?status=&limit=
    getInspections: builder.query({
      query: ({ status = '', limit = 50 } = {}) => {
        let url = `/api/v1/inspections?limit=${limit}`;
        if (status) url += `&status=${status}`;
        return url;
      },
      providesTags: ['Inspections'],
    }),

    // GET /api/v1/production/piece-state?piece_barcode=
    getPieceState: builder.query({
      query: (pieceBarcode) => `/api/v1/production/piece-state?piece_barcode=${encodeURIComponent(pieceBarcode)}`,
    }),

    // POST /api/v1/inspections/{id}/approve
    approveInspection: builder.mutation({
      query: ({ id, note }) => ({
        url: `/api/v1/inspections/${id}/approve`,
        method: 'POST',
        body: note ? { note } : {},
      }),
      invalidatesTags: ['Inspections', 'Production'],
    }),

    // POST /api/v1/inspections/{id}/decline
    declineInspection: builder.mutation({
      query: ({ id, note }) => ({
        url: `/api/v1/inspections/${id}/decline`,
        method: 'POST',
        body: note ? { note } : {},
      }),
      invalidatesTags: ['Inspections', 'Production'],
    }),

    // GET /api/v1/inspections/pieces/{piece_code}
    getPieceInspectionHistory: builder.query({
      query: (pieceCode) => `/api/v1/inspections/pieces/${encodeURIComponent(pieceCode)}`,
      providesTags: ['Inspections'],
    }),

    // GET /api/v1/inspections/responsibility?employee_id=
    getWorkerResponsibility: builder.query({
      query: (employeeId = '') => {
        let url = '/api/v1/inspections/responsibility';
        if (employeeId) url += `?employee_id=${encodeURIComponent(employeeId)}`;
        return url;
      },
      providesTags: ['Inspections'],
    }),
  }),
});

export const {
  useCreateInspectionMutation,
  useGetInspectionsQuery,
  useLazyGetPieceStateQuery,
  useGetPieceStateQuery,
  useApproveInspectionMutation,
  useDeclineInspectionMutation,
  useGetPieceInspectionHistoryQuery,
  useLazyGetPieceInspectionHistoryQuery,
  useGetWorkerResponsibilityQuery,
} = inspectionApiSlice;
