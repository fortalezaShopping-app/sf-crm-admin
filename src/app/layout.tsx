import type { Metadata } from 'next';

import { daxline } from '@/components/font';

import './globals.css';

export const metadata: Metadata = {
  title: 'SF Admin | Shopping Fortaleza',
  description: 'Painel administrativo do Shopping Fortaleza.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html className={daxline.variable} lang="pt-AO">
      <body className={daxline.className}>{children}</body>
    </html>
  );
}
