'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';
import { Download, Inbox, X } from 'lucide-react';
import { downloadCsv } from '@/lib/admin-models';
import styles from './Workspace.module.css';

export function Modal({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const id = useId();
  useEffect(() => {
    const dialog = ref.current;
    const opener = document.activeElement as HTMLElement | null;
    dialog?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      dialog?.close();
      document.body.style.overflow = overflow;
      opener?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-labelledby={id}
      className={styles.modal}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <header className={styles.modalHeader}>
        <h2 id={id}>{title}</h2>
        <button
          className={styles.iconButton}
          title="Fechar"
          aria-label="Fechar"
          type="button"
          onClick={onClose}
          disabled={busy}
        >
          <X size={18} />
        </button>
      </header>
      <div className={styles.modalBody}>{children}</div>
    </dialog>
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
    <p
      className={styles.notice}
      data-tone={tone}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      {children}
    </p>
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
    <button
      className={styles.secondary}
      disabled={disabled || rows.length < 2}
      onClick={() => downloadCsv(name, rows)}
      type="button"
    >
      <Download size={16} />
      Exportar CSV
    </button>
  );
}

export function Unavailable({ children }: { children: ReactNode }) {
  return <Notice>{children} indisponível no contrato atual da API.</Notice>;
}
