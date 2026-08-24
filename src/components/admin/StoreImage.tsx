'use client';

import { useState } from 'react';
import { FileText, ImageIcon, Store } from 'lucide-react';
import Image from 'next/image';

import {
  getLojaImagePath,
  getLojaInvoiceTemplatePath,
  getLojaLogoPath,
} from '@/lib/api';

type StoreImageProps = {
  available?: boolean;
  id?: number;
  kind?: 'image' | 'invoice-template' | 'logo';
  name?: string;
  previewUrl?: string | null;
  size?: 'form' | 'table';
  version?: number;
};

export function StoreImage({
  available = true,
  id,
  kind = 'image',
  name,
  previewUrl,
  size = 'table',
  version = 0,
}: StoreImageProps) {
  const apiSrc = id && available
    ? kind === 'logo'
      ? getLojaLogoPath(id, version)
      : kind === 'invoice-template'
        ? getLojaInvoiceTemplatePath(id, version)
        : getLojaImagePath(id, version)
    : null;
  const src = previewUrl ?? apiSrc;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = !src || failedSrc === src;
  const FallbackIcon =
    kind === 'logo' ? Store : kind === 'invoice-template' ? FileText : ImageIcon;
  const label =
    kind === 'logo'
      ? 'Logotipo'
      : kind === 'invoice-template'
        ? 'Modelo de fatura'
        : 'Imagem';

  return (
    <span className={`store-image store-image--${size} store-image--${kind}`}>
      {!hasError ? (
        <Image
          alt={`${label} da loja ${name ?? id}`}
          fill
          onError={() => setFailedSrc(src)}
          sizes={size === 'table' ? '52px' : '320px'}
          src={src}
          unoptimized
        />
      ) : (
        <FallbackIcon aria-hidden size={size === 'table' ? 20 : 32} strokeWidth={1.8} />
      )}
    </span>
  );
}
