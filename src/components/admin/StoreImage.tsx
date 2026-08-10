'use client';

import { useState } from 'react';
import { ImageIcon, Store } from 'lucide-react';
import Image from 'next/image';

import { getLojaImagePath, getLojaLogoPath } from '@/lib/api';

type StoreImageProps = {
  id?: number;
  kind?: 'image' | 'logo';
  name?: string;
  previewUrl?: string | null;
  size?: 'form' | 'table';
  version?: number;
};

export function StoreImage({
  id,
  kind = 'image',
  name,
  previewUrl,
  size = 'table',
  version = 0,
}: StoreImageProps) {
  const apiSrc = id
    ? kind === 'logo'
      ? getLojaLogoPath(id, version)
      : getLojaImagePath(id, version)
    : null;
  const src = previewUrl ?? apiSrc;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = !src || failedSrc === src;
  const FallbackIcon = kind === 'logo' ? Store : ImageIcon;

  return (
    <span className={`store-image store-image--${size} store-image--${kind}`}>
      {!hasError ? (
        <Image
          alt={`${kind === 'logo' ? 'Logotipo' : 'Imagem'} da loja ${name ?? id}`}
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
