import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { getAuthenticatedBackofficeSession } from '@/lib/server-auth';

import { MerchantWorkspace } from './merchant-workspace';

export const metadata: Metadata = {
  title: 'Área do lojista | Shopping Fortaleza',
  description: 'Registo de compras do programa de fidelidade Shopping Fortaleza.',
};

export default async function MerchantPage() {
  const session = await getAuthenticatedBackofficeSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role !== 'STORE_USER') {
    redirect('/dashboard');
  }

  if (!session.storeId) {
    redirect('/login?error=store-association');
  }

  return (
    <MerchantWorkspace
      initialSession={{
        ...session,
        role: 'STORE_USER',
        storeId: session.storeId,
      }}
    />
  );
}
