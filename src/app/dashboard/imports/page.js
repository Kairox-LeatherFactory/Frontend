'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import BreakdownReviewBody from './BreakdownReviewBody';

// Standalone route wrapper — the actual screen lives in BreakdownReviewBody,
// shared with the "Breakdown Review" tab embedded in the Production Logger
// (src/app/dashboard/entry/page.js). This wrapper just reads ?order= from
// the URL and points "back" at that tab.
export default function BreakdownReviewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <BreakdownReviewBody
      initialOrderNumber={searchParams.get('order') || ''}
      onBack={() => router.push('/dashboard/entry?door=breakdown')}
    />
  );
}
