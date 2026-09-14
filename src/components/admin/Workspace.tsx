'use client';

import { useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Download, Inbox, X } from 'lucide-react';
import { downloadCsv } from '@/lib/admin-models';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { IconButton } from '@/components/ui/icon-button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import styles from './Workspace.module.css';

export function Modal({
  title,
  children,
  onClose,
  busy = false,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
  wide?: boolean;
}) {
  const opener = useRef<HTMLElement | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className={`${styles.modal} ${wide ? styles.modalWide : ''}`}
        onOpenAutoFocus={(event) => {
          opener.current = document.activeElement as HTMLElement | null;
          event.preventDefault();
          titleRef.current?.focus();
        }}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          opener.current?.focus();
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault();
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <header className={styles.modalHeader}>
          <DialogTitle ref={titleRef} tabIndex={-1} className="outline-none">
            {title}
          </DialogTitle>
          <IconButton
            title="Fechar"
            aria-label="Fechar"
            type="button"
            onClick={onClose}
            disabled={busy}
          >
            <X size={18} />
          </IconButton>
        </header>
        <div className={styles.modalBody}>{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function Notice({
  children,
  tone = 'warning',
}: {
  children: ReactNode;
  tone?: 'warning' | 'error' | 'success';
}) {
  return (
    <Alert
      className={styles.notice}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <AlertDescription className="text-inherit text-[13px]">
        {children}
      </AlertDescription>
    </Alert>
  );
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className={styles.empty}>
      <Inbox size={26} strokeWidth={1.4} />
      <span>{children}</span>
    </div>
  );
}

export function Avatar({
  name = '',
  src,
  large = false,
}: {
  name?: string;
  src?: string;
  large?: boolean;
}) {
  const [failed, setFailed] = useState<string | null>(null);
  const safe = src && (/^https?:\/\//.test(src) || /^\/(?!\/)/.test(src));
  return (
    <span className={`${styles.avatar} ${large ? styles.avatarLarge : ''}`}>
      {safe && failed !== src ? (
        <Image
          src={src}
          alt=""
          fill
          sizes={large ? '88px' : '36px'}
          unoptimized
          onError={() => setFailed(src)}
        />
      ) : (
        name
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((word) => word[0])
          .join('')
          .toUpperCase() || '?'
      )}
    </span>
  );
}

export function ExportButton({
  name,
  rows,
  disabled = false,
}: {
  name: string;
  rows: unknown[][];
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      disabled={disabled || rows.length < 2}
      onClick={() => downloadCsv(name, rows)}
      type="button"
    >
      <Download size={16} />
      Exportar CSV
    </Button>
  );
}

export function Unavailable({ children }: { children: ReactNode }) {
  return <Notice>{children} indisponível no contrato atual da API.</Notice>;
}
