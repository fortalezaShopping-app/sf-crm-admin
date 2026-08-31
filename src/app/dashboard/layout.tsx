import { redirect } from 'next/navigation';

import { AdminShell } from '@/components/admin/AdminShell';
import { getAuthenticatedAdminSession } from '@/lib/server-auth';

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getAuthenticatedAdminSession();

  if (!session) {
    redirect('/login');
  }

  if (session.role === 'STORE_USER') {
    redirect('/lojista');
  }

  return <AdminShell initialSession={session}>{children}</AdminShell>;
}
