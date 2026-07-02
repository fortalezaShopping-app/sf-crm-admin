import type { Metadata } from 'next';

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
    <html lang="pt-AO">
      <body>{children}</body>
    </html>
  );
}
