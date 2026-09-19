import { createSlice } from '@reduxjs/toolkit';

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    workers: [],
    activeTab: null,
  },
  reducers: {
    setWorkers: (state, action) => {
      state.workers = action.payload;
    },
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    }
  }
});

export const { setWorkers, setActiveTab } = attendanceSlice.actions;
export default attendanceSlice.reducer;
