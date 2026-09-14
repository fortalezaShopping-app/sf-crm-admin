'use client';

import { RefreshCw } from 'lucide-react';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import { Button } from '@/components/ui/button';

export default function PageError({ retry }: { retry: () => void }) {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-xl flex-col items-start justify-center gap-5 px-6 py-12">
      <ShoppingLogo size="sm" />
      <h1 className="text-2xl font-semibold text-primary">
        Não foi possível carregar a página
      </h1>
      <p className="text-sm text-muted-foreground" role="alert">
        Volte a tentar dentro de instantes.
      </p>
      <Button onClick={retry} type="button">
        <RefreshCw aria-hidden size={16} />
        Tentar novamente
      </Button>
    </main>
  );
}
