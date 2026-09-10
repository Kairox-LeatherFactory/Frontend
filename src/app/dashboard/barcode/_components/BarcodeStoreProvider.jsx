'use client';
import { Provider } from 'react-redux';
import barcodeStore from '../_lib/store';

/**
 * ============================================================================
 * BARCODE STORE PROVIDER
 * ============================================================================
 * Client component wrapper that provides the barcode-scoped Redux store
 * to all barcode page children. Used in the barcode layout.
 */
export default function BarcodeStoreProvider({ children }) {
  return <Provider store={barcodeStore}>{children}</Provider>;
}
