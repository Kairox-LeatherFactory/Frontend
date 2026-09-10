import { configureStore } from '@reduxjs/toolkit';
import barcodeReducer from './barcodeSlice';
import { barcodeApi } from './barcodeApiSlice';

/**
 * ============================================================================
 * BARCODE MODULE REDUX STORE
 * ============================================================================
 * Scoped store for the barcode management page.
 * Combines the barcodeSlice (18 global fields) with the RTK Query API
 * middleware for automatic cache management and refetching.
 */
const barcodeStore = configureStore({
  reducer: {
    barcode: barcodeReducer,
    [barcodeApi.reducerPath]: barcodeApi.reducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat(barcodeApi.middleware),
});

export default barcodeStore;
