import { apiSlice } from './apiSlice';
export const attendanceApiSlice = 
apiSlice.injectEndpoints({
    endpoints:(builder)=>({
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
      invalidatesTags: ['Attendance'],
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
    updateAttendanceConfig: builder.mutation({
      query: (body) => ({
        url: '/api/v1/attendance/config',
        method: 'PATCH',
        body,
      }),
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
    }),
    })
})
export const {
     useGetMyStatusQuery, 
  useGetMyHistoryQuery, 
  useCheckInMutation, 
  useCheckOutMutation,
  useGetEmployeesQuery,
  useGetAttendanceTodayQuery,
  useLazyGetAttendanceTodayQuery,
  useGetAttendanceConfigQuery,
  useUpdateAttendanceConfigMutation,
  useScanCheckInMutation,
  useAddEmployeeMutation,
  useProxyCheckInMutation,
  useProxyCheckOutMutation,
}=attendanceApiSlice