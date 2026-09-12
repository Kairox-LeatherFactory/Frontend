'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function ProcurementLegacyRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/procurement');
  }, [router]);
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-7 h-7 animate-spin text-[#c8834a]" />
    </div>
  );
}
