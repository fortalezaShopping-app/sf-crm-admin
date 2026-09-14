'use client';

import type { ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export function IconButton({
  title,
  'aria-label': label,
  size = 'icon',
  variant = 'outline',
  ...props
}: ComponentProps<typeof Button> & { 'aria-label': string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button {...props} aria-label={label} size={size} variant={variant} />
      </TooltipTrigger>
      <TooltipContent>{title || label}</TooltipContent>
    </Tooltip>
  );
}
