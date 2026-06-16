import { Lato } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/context/AuthContext';
import { DataProvider } from '@/context/DataContext';
import CustomCursor from '@/components/CustomCursor';

const lato = Lato({
  subsets: ['latin'],
  weight: ['300', '400', '700', '900'],
  variable: '--font-lato',
  display: 'swap',
});

export const metadata = {
  title: 'Kairox Leather Intelligence Platform',
  description: 'Real-time leather factory production tracking, wage management, and traceability system.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={lato.variable} data-scroll-behavior="smooth">
      <body className="font-sans bg-[#faf6f0] text-[#0f172a] antialiased">
        <AuthProvider>
          <DataProvider>
            <CustomCursor />
            {children}
          </DataProvider>
        </AuthProvider>
      </body>
    </html>
  );
}

