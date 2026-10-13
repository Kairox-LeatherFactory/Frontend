import { apiSlice } from './apiSlice';

export const intakeApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({

    // ============================================================
    // INTAKE — GET CLIENTS
    // ============================================================
    getIntakeClients: builder.query({
      query: () => '/api/v1/clients',

      // Normalize the different possible response shapes
      // so the Intake page always receives an array.
      transformResponse: (response) => {
        if (Array.isArray(response)) {
          return response;
        }

        return (
          response?.items ||
          response?.clients ||
          response?.data ||
          []
        );
      },

      providesTags: ['Clients'],
    }),

    // ============================================================
    // INTAKE — CREATE SUBMISSION
    // ============================================================
    openIntakeSubmission: builder.mutation({
      query: (clientId) => ({
        url: '/api/v1/procurement/submissions',
        method: 'POST',
        body: {
          client_id: clientId,
        },
      }),
    }),

    // ============================================================
    // INTAKE — UPLOAD ORDER SHEET
    // ============================================================
    uploadOrderSheet: builder.mutation({
      query: ({ submissionId, file, force = false }) => {
        const formData = new FormData();

        formData.append('file', file);

        const queryString = force ? '?force=true' : '';

        return {
          url: `/api/v1/procurement/submissions/${encodeURIComponent(
            submissionId
          )}/order-sheet${queryString}`,
          method: 'POST',
          body: formData,
        };
      },
    }),

    // ============================================================
    // INTAKE — UPLOAD SPEC SHEET
    // ============================================================
    uploadSpecSheet: builder.mutation({
      query: ({ submissionId, file, force = false }) => {
        const formData = new FormData();

        formData.append('file', file);

        const queryString = force ? '?force=true' : '';

        return {
          url: `/api/v1/procurement/submissions/${encodeURIComponent(
            submissionId
          )}/spec-sheet${queryString}`,
          method: 'POST',
          body: formData,
        };
      },
    }),

    // ============================================================
    // INTAKE — GET SUBMISSION STATUS
    // ============================================================
    getIntakeSubmission: builder.query({
      query: (submissionId) =>
        `/api/v1/procurement/submissions/${encodeURIComponent(
          submissionId
        )}`,
    }),
  }),

  // Keep the existing API architecture.
  // Do not create duplicate endpoints if this file is imported more than once.
  overrideExisting: false,
});

// ============================================================
// GENERATED RTK QUERY HOOKS
// ============================================================

export const {
  useGetIntakeClientsQuery,
  useLazyGetIntakeClientsQuery,

  useOpenIntakeSubmissionMutation,

  useUploadOrderSheetMutation,

  useUploadSpecSheetMutation,

  useGetIntakeSubmissionQuery,
  useLazyGetIntakeSubmissionQuery,
} = intakeApiSlice;