import BarcodeStoreProvider from './_components/BarcodeStoreProvider';

/**
 * Barcode section layout — wraps all /dashboard/barcode/* routes
 * with the barcode-scoped Redux store provider.
 */
export default function BarcodeLayout({ children }) {
  return <BarcodeStoreProvider>{children}</BarcodeStoreProvider>;
}
