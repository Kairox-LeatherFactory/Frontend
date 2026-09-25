import { createSlice } from '@reduxjs/toolkit';

function normalizeArray(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (data?.data && Array.isArray(data.data)) return data.data;
  if (data?.items && Array.isArray(data.items)) return data.items;
  if (data?.employees && Array.isArray(data.employees)) return data.employees;
  if (data?.workers && Array.isArray(data.workers)) return data.workers;
  if (data?.roster && Array.isArray(data.roster)) return data.roster;
  if (data?.employee_id || data?.id) return [data];
  return [];
}

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    workers: [],
    activeTab: null,
  },
  reducers: {
    setWorkers: (state, action) => {
      state.workers = normalizeArray(action.payload);
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    }
  }
});

export const { setWorkers, setActiveTab } = attendanceSlice.actions;
export default attendanceSlice.reducer;

