import { apiSlice } from './apiSlice';

export const jobWorkApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    // 1. Get Jobwork List
    getJobWorkList: builder.query({
      query: (params = {}) => {
        const queryParams = new URLSearchParams();
        if (params.status) queryParams.append('status', params.status);
        if (params.vendor_id) queryParams.append('vendor_id', params.vendor_id);
        if (typeof params.overdue === 'boolean') queryParams.append('overdue', params.overdue);
        if (params.limit !== undefined) queryParams.append('limit', params.limit);
        if (params.offset !== undefined) queryParams.append('offset', params.offset);

        const queryString = queryParams.toString();
        return `/api/v1/jobwork${queryString ? `?${queryString}` : ''}`;
      },
      transformResponse: (res) => (Array.isArray(res) ? res : res?.items || res?.jobs || []),
      providesTags: ['JobWork'],
    }),

    // 2. Dispatch Garments to Vendor
    dispatchJobWork: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/jobwork/dispatch',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['JobWork'],
    }),

    // 3. List Vendors
    getJobWorkVendors: builder.query({
      query: (params = {}) => {
        const activeOnly = params.active_only !== undefined ? params.active_only : true;
        return `/api/v1/jobwork/vendors?active_only=${activeOnly}`;
      },
      transformResponse: (res) => (Array.isArray(res) ? res : res?.vendors || res?.items || []),
      providesTags: ['JobWorkVendors'],
    }),

    // 4. Create Vendor
    createJobWorkVendor: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/jobwork/vendors',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['JobWorkVendors'],
    }),

    // 5. Receive Garments Back from Vendor
    receiveJobWork: builder.mutation({
      query: ({ job_id, payload }) => ({
        url: `/api/v1/jobwork/${job_id}/receive`,
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['JobWork'],
    }),
  }),
});

export const {
  useGetJobWorkListQuery,
  useLazyGetJobWorkListQuery,
  useDispatchJobWorkMutation,
  useGetJobWorkVendorsQuery,
  useLazyGetJobWorkVendorsQuery,
  useCreateJobWorkVendorMutation,
  useReceiveJobWorkMutation,
} = jobWorkApiSlice;
