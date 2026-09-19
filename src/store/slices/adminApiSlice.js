import { apiSlice } from './apiSlice';

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => '/api/v1/users',
      providesTags: ['Users'],
    }),
    getEmployees: builder.query({
      query: () => '/api/v1/employees',
      providesTags: ['Employees'],
    }),
    createUser: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/users',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Users'],
    }),
    createEmployee: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/employees',
        method: 'POST',
        body: payload,
      }),
      invalidatesTags: ['Employees'],
    }),
    patchEmployeeBarcode: builder.mutation({
      query: ({ employeeId, action }) => ({
        url: `/api/v1/employees/${employeeId}/barcode`,
        method: 'PATCH',
        body: { action },
      }),
      invalidatesTags: ['Employees'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetUsersQuery,
  useGetEmployeesQuery,
  useCreateUserMutation,
  useCreateEmployeeMutation,
  usePatchEmployeeBarcodeMutation,
} = adminApiSlice;
