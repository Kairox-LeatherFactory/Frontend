import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import attendanccReducer from './slices/attendanceSlice'
export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance:attendanccReducer
  },
});
