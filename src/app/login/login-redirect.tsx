'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

import { getAdminSessionSnapshot } from '@/lib/auth';

export function LoginRedirect() {
  const router = useRouter();

  useEffect(() => {
    if (getAdminSessionSnapshot()) {
      router.replace('/dashboard');
    }
  }, [router]);

  return null;
}
