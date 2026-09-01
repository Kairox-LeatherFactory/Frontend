import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: process.env.NEXT_PUBLIC_API_BASE_URL || '',
    prepareHeaders: (headers, { getState }) => {
    
      const token = getState().auth?.token || localStorage.getItem('kairox_token');
      if (token) {
        headers.set('authorization', `Bearer ${token}`);
      }
      return headers;
    },
  }),
  tagTypes: ['Attendance', 'Employee'], // Caching Labels
  
  endpoints: (builder) => ({
    // 1. Get My Status
    getMyStatus: builder.query({
      query: () => '/api/v1/attendance/me/status',
      providesTags: ['Attendance']
    }),

    // 2. Get My History
    getMyHistory: builder.query({
      query: ({ start, end }) => `/api/v1/attendance/me?start=${start}&end=${end}`,
      providesTags: ['Attendance']
    }),

    // 3. Self Check-In
    checkIn: builder.mutation({
      query: () => ({
        url: '/api/v1/attendance/check-in',
        method: 'POST',
        body: {}
      }),
      invalidatesTags: ['Attendance'] // Check-in aana udane mela ulla 1 & 2 ah thirumba fetch panna sollum (Auto-refresh)
    }),

    // 4. Self Check-Out
    checkOut: builder.mutation({
      query: () => ({
        url: '/api/v1/attendance/check-out',
        method: 'POST',
        body: {}
      }),
      invalidatesTags: ['Attendance']
    }),
  
// 5. Get All Employees (For Floor Command)
    getEmployees: builder.query({
      query: () => '/api/v1/employees',
      providesTags: ['Employee']
    }),
    // 6. Get Today's Overall Attendance (For Floor Command & HR)
    getAttendanceToday: builder.query({
      query: () => '/api/v1/attendance/today',
      providesTags: ['Attendance']
    }),
    // 7. Get Attendance Config
    getAttendanceConfig: builder.query({
      query: () => '/api/v1/attendance/config',
 
    }),
    // 8. Floor Command Barcode Scan Check-In
    scanCheckIn: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/attendance/scan-check-in',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Attendance']
    }),

    // 9. Add New Employee
    addEmployee: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/employees',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Employee']
    }),

    // 10. Proxy Check-In (Bulk)
    proxyCheckIn: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/attendance/proxy/check-in',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Attendance']
    }),

    // 11. Proxy Check-Out (Bulk)
    proxyCheckOut: builder.mutation({
      query: (payload) => ({
        url: '/api/v1/attendance/proxy/check-out',
        method: 'POST',
        body: payload
      }),
      invalidatesTags: ['Attendance']
    })
  })
});

// React Hooks auto-generated!
export const { 
  useGetMyStatusQuery, 
  useGetMyHistoryQuery, 
  useCheckInMutation, 
  useCheckOutMutation,
   useGetEmployeesQuery,
  useGetAttendanceTodayQuery,
  useGetAttendanceConfigQuery,
  useScanCheckInMutation,
    useAddEmployeeMutation,
  useProxyCheckInMutation,
  useProxyCheckOutMutation
} = apiSlice;
