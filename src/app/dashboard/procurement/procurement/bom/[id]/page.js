'use client';
import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function BOMLegacyRedirect() {
  const { id } = useParams();
  const router = useRouter();
  useEffect(() => {
    if (id) router.replace(`/dashboard/procurement/bom/${id}`);
  }, [id, router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Loader2 className="w-7 h-7 animate-spin text-[#c8834a]" />
    </div>
  );
}
