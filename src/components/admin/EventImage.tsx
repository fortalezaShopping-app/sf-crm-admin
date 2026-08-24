'use client';

import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import Image from 'next/image';

import { getEventoImagePath } from '@/lib/api';

type EventImageProps = {
  available?: boolean;
  id?: number;
  name?: string;
  previewUrl?: string | null;
  size?: 'form' | 'table';
  version?: number;
};

export function EventImage({
  available = true,
  id,
  name,
  previewUrl,
  size = 'table',
  version = 0,
}: EventImageProps) {
  const apiSrc = id && available ? getEventoImagePath(id, version) : null;
  const src = previewUrl ?? apiSrc;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = !src || failedSrc === src;

  return (
    <span className={`store-image store-image--${size} store-image--image`}>
      {!hasError ? (
        <Image
          alt={`Imagem do evento ${name ?? id}`}
          fill
          onError={() => setFailedSrc(src)}
          sizes={size === 'table' ? '52px' : '640px'}
          src={src}
          unoptimized
        />
      ) : (
        <CalendarDays aria-hidden size={size === 'table' ? 20 : 34} strokeWidth={1.6} />
      )}
    </span>
  );
}
