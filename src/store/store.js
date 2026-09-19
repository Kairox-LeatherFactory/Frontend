import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import attendanceReducer from './slices/attendanceSlice'
import entryReducer from './slices/entrySlice'
import storeHubReducer from './slices/storeHubSlice';
import manualReducer from './slices/manualSlice';
import { apiSlice } from './slices/apiSlice';
export const store = configureStore({
  reducer: {
    auth: authReducer,
    attendance:attendanceReducer,
    entry:entryReducer,
    storeHub: storeHubReducer,
    manual: manualReducer,
     [apiSlice.reducerPath]: apiSlice.reducer // RTK Query API slice
  },
   middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(apiSlice.middleware),
});
