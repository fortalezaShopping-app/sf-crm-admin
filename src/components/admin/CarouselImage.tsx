'use client';

import { useState } from 'react';
import { ImageIcon } from 'lucide-react';
import Image from 'next/image';

import { getCarouselSlideImagePath } from '@/lib/api';

type CarouselImageProps = {
  available?: boolean;
  id?: number;
  previewUrl?: string | null;
  size?: 'card' | 'form';
  title?: string;
  version?: number;
};

export function CarouselImage({
  available = true,
  id,
  previewUrl,
  size = 'card',
  title,
  version = 0,
}: CarouselImageProps) {
  const apiSrc = id && available ? getCarouselSlideImagePath(id, version) : null;
  const src = previewUrl ?? apiSrc;
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const hasError = !src || failedSrc === src;

  return (
    <span className={`carousel-image carousel-image--${size}`}>
      {!hasError ? (
        <Image
          alt={`Imagem do carrossel ${title ?? id ?? ''}`.trim()}
          fill
          onError={() => setFailedSrc(src)}
          sizes={size === 'card' ? '(max-width: 760px) 100vw, 33vw' : '180px'}
          src={src}
          unoptimized
        />
      ) : (
        <ImageIcon aria-hidden size={size === 'card' ? 28 : 40} strokeWidth={1.5} />
      )}
    </span>
  );
}
