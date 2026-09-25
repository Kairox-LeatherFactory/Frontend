import { apiSlice } from './apiSlice';

export const adminApiSlice = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getUsers: builder.query({
      query: () => '/api/v1/users',
      providesTags: ['Users'],
    }),
    getEmployees: builder.query({
      query: () => '/api/v1/employees',
      // Backend wraps the list as { items: [...] } — always hand back a plain array
      transformResponse: (res) => (Array.isArray(res) ? res : res?.items || []),
      providesTags: ['Employees'],
    }),
    getEmployee: builder.query({
      query: (id) => `/api/v1/employees/${id}`,
      providesTags: (result, error, id) => [{ type: 'Employees', id }],
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
    updateEmployee: builder.mutation({
      query: ({ id, ...patch }) => ({
        url: `/api/v1/employees/${id}`,
        method: 'PATCH',
        body: patch,
      }),
      invalidatesTags: ['Employees'],
    }),
    deleteEmployee: builder.mutation({
      query: (id) => ({
        url: `/api/v1/employees/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Employees'],
    }),
  }),
  overrideExisting: true,
});

export const {
  useGetUsersQuery,
  useGetEmployeesQuery,
  useLazyGetEmployeesQuery,
  useGetEmployeeQuery,
  useLazyGetEmployeeQuery,
  useCreateUserMutation,
  useCreateEmployeeMutation,
  usePatchEmployeeBarcodeMutation,
  useUpdateEmployeeMutation,
  useDeleteEmployeeMutation,
} = adminApiSlice;
