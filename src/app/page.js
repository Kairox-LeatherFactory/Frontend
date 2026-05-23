'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Home() {
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!user) {
      router.replace('/login');
    } else {
      router.replace('/dashboard');
    }
  }, [user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-brand">
      <div className="text-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="font-semibold text-lg">Loading Kairox Intelligence...</p>
      </div>
    </div>
  );
}
