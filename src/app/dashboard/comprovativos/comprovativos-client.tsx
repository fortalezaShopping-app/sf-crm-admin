'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  CheckCircle2,
  Clock3,
  FileSearch,
  ImageOff,
  ReceiptText,
  RefreshCw,
  RotateCw,
  Search,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import Image from 'next/image';

import { Pagination } from '@/components/admin/Pagination';
import { useAdminSearchQuery } from '@/components/admin/useAdminSearchQuery';
import { matchesSearchQuery } from '@/lib/admin-search';
import {
  ApiError,
  clearAdminApiCache,
  getFatura,
  getFaturaImagePath,
  getFaturaOcr,
  getFaturaValidacao,
  listAllFaturas,
  validarFatura,
  type FaturaAdmin,
  type OcrFatura,
  type ValidacaoFatura,
  type ValidarFaturaRequest,
} from '@/lib/api';

import styles from './comprovativos.module.css';

type StatusFilter = 'all' | 'APPROVED' | 'PENDING_VALIDATION' | 'REJECTED';

const ITEMS_PER_PAGE = 10;

const statusOptions: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendentes', value: 'PENDING_VALIDATION' },
  { label: 'Aprovadas', value: 'APPROVED' },
  { label: 'Rejeitadas', value: 'REJECTED' },
];

export function ComprovativosClient() {
  const [actionDecision, setActionDecision] =
    useState<ValidarFaturaRequest['decision'] | null>(null);
  const [detail, setDetail] = useState<FaturaAdmin | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [detailVersion, setDetailVersion] = useState(0);
  const [invoices, setInvoices] = useState<FaturaAdmin[]>([]);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const [ocr, setOcr] = useState<OcrFatura | null>(null);
  const [page, setPage] = useState(0);
  const { deferredQuery, query, setQuery } = useAdminSearchQuery();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [validation, setValidation] = useState<ValidacaoFatura | null>(null);

  const loadInvoices = useCallback(
    async (bypassCache = false) => {
      setIsLoading(true);
      setListError(null);

      try {
        if (bypassCache) {
          clearAdminApiCache();
        }

        const result = await listAllFaturas({
          status: statusFilter === 'all' ? undefined : statusFilter,
        });

        setInvoices(result);
        setSelectedId((current) => {
          const stillVisible = result.some((invoice) => invoice.id === current);
          return stillVisible ? current : result[0]?.id ?? null;
        });
      } catch (error) {
        setInvoices([]);
        setSelectedId(null);
        setListError(getErrorMessage(error, 'Não foi possível carregar as faturas.'));
      } finally {
        setIsLoading(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadInvoices(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadInvoices]);

  useEffect(() => {
    let isActive = true;

    if (!selectedId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setIsDetailLoading(true);
      setDetailError(null);
      setNote('');

      void Promise.all([
        getFatura(selectedId),
        getOptionalResource(getFaturaOcr(selectedId)),
        getOptionalResource(getFaturaValidacao(selectedId)),
      ])
        .then(([invoice, ocrResult, validationResult]) => {
          if (!isActive) {
            return;
          }

          setDetail(invoice);
          setOcr(ocrResult);
          setValidation(validationResult);
        })
        .catch((error: unknown) => {
          if (isActive) {
            setDetailError(
              getErrorMessage(error, 'Não foi possível carregar os detalhes da fatura.'),
            );
          }
        })
        .finally(() => {
          if (isActive) {
            setIsDetailLoading(false);
          }
        });
    }, 0);

    return () => {
      isActive = false;
      window.clearTimeout(timeoutId);
    };
  }, [detailVersion, selectedId]);

  const filteredInvoices = useMemo(
    () =>
      invoices.filter((invoice) =>
        matchesSearchQuery(deferredQuery, [
          invoice.id,
          invoice.invoiceNumber,
          invoice.storeId,
          invoice.storeName,
          invoice.issuerTaxId,
          invoice.customerTaxId,
          invoice.invoiceDate,
          invoice.totalAmount,
          invoice.status,
          invoice.note,
        ]),
      ),
    [deferredQuery, invoices],
  );
  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(page, totalPages - 1);
  const visibleInvoices = filteredInvoices.slice(
    visiblePage * ITEMS_PER_PAGE,
    (visiblePage + 1) * ITEMS_PER_PAGE,
  );
  const selectedInvoice = useMemo(() => {
    if (!selectedId) {
      return null;
    }

    const listedInvoice = filteredInvoices.find((invoice) => invoice.id === selectedId);

    if (!listedInvoice) {
      return null;
    }

    return detail?.id === selectedId
      ? detail
      : listedInvoice;
  }, [detail, filteredInvoices, selectedId]);
  const selectedOcr = detail?.id === selectedId ? ocr : null;
  const selectedValidation = detail?.id === selectedId ? validation : null;

  useEffect(() => {
    if (isLoading || filteredInvoices.some((invoice) => invoice.id === selectedId)) {
      return;
    }

    const firstVisibleId = filteredInvoices[0]?.id ?? null;
    const timeoutId = window.setTimeout(() => setSelectedId(firstVisibleId), 0);
    return () => window.clearTimeout(timeoutId);
  }, [filteredInvoices, isLoading, selectedId]);

  function changeStatusFilter(nextStatus: StatusFilter) {
    setNotice(null);
    setStatusFilter(nextStatus);
    setPage(0);
    setSelectedId(null);
    setDetail(null);
  }

  function selectInvoice(id: number | null) {
    setNotice(null);
    setSelectedId(id);
  }

  async function handleValidation(
    decision: ValidarFaturaRequest['decision'],
  ) {
    if (!selectedInvoice?.id || actionDecision) {
      return;
    }

    if (decision === 'REJECTED' && !note.trim()) {
      setNotice('Indique o motivo da rejeição antes de continuar.');
      return;
    }

    setActionDecision(decision);
    setNotice(null);

    try {
      const result = await validarFatura(String(selectedInvoice.id), {
        decision,
        note: note.trim() || undefined,
      });

      setValidation(result);
      setNotice(
        decision === 'APPROVED'
          ? 'Fatura aprovada com sucesso.'
          : 'Fatura rejeitada com sucesso.',
      );
      setDetailVersion((current) => current + 1);
      await loadInvoices(true);
    } catch (error) {
      setNotice(getErrorMessage(error, 'Não foi possível validar a fatura.'));
    } finally {
      setActionDecision(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <h1>Talões</h1>
          <p>Consulte a imagem e os dados OCR antes de atribuir os pontos.</p>
        </div>

        <button
          className={styles.refreshButton}
          disabled={isLoading}
          onClick={() => void loadInvoices(true)}
          type="button"
        >
          <RefreshCw aria-hidden size={16} strokeWidth={1.7} />
          Atualizar
        </button>
      </header>

      <div className={styles.toolbar}>
        <div
          aria-label="Filtrar faturas por estado"
          className={styles.statusTabs}
          role="group"
        >
          {statusOptions.map((option) => (
            <button
              aria-pressed={statusFilter === option.value}
              className={
                statusFilter === option.value
                  ? styles.statusTabActive
                  : styles.statusTab
              }
              key={option.value}
              onClick={() => changeStatusFilter(option.value)}
              type="button"
            >
              {option.value === 'PENDING_VALIDATION' ? (
                <span className={styles.pendingDot} />
              ) : null}
              {option.label}
            </button>
          ))}
        </div>

        <label className={styles.invoiceSearch}>
          <Search aria-hidden size={15} strokeWidth={1.7} />
          <input
            aria-label="Pesquisar faturas"
            autoComplete="off"
            onChange={(event) => {
              setPage(0);
              setQuery(event.target.value);
            }}
            placeholder="Loja, número, NIF ou valor"
            spellCheck={false}
            type="search"
            value={query}
          />
        </label>

        <span className={styles.totalCount}>
          {filteredInvoices.length} fatura{filteredInvoices.length === 1 ? '' : 's'}
        </span>
      </div>

      {listError ? (
        <p className={styles.errorNotice} role="alert">
          {listError}
        </p>
      ) : null}

      {notice ? (
        <p
          className={
            notice.includes('sucesso') ? styles.successNotice : styles.actionError
          }
          role={notice.includes('sucesso') ? 'status' : 'alert'}
        >
          {notice}
        </p>
      ) : null}

      <div className={styles.workspace}>
        <section aria-label="Fila de faturas" className={styles.queueCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Fila de validação</h2>
              <p>Selecione uma fatura para conferir os dados.</p>
            </div>
            <ReceiptText aria-hidden size={19} strokeWidth={1.7} />
          </div>

          <div className={styles.queueList}>
            {isLoading ? (
              <div className={styles.emptyState}>
                <RefreshCw aria-hidden className={styles.spinning} size={22} />
                <span>A carregar faturas...</span>
              </div>
            ) : visibleInvoices.length ? (
              visibleInvoices.map((invoice) => (
                <button
                  aria-pressed={selectedId === invoice.id}
                  className={
                    selectedId === invoice.id
                      ? styles.queueItemActive
                      : styles.queueItem
                  }
                  key={invoice.id ?? invoice.invoiceNumber}
                  onClick={() => selectInvoice(invoice.id ?? null)}
                  type="button"
                >
                  <span className={styles.receiptIcon}>
                    <ReceiptText aria-hidden size={18} strokeWidth={1.6} />
                  </span>
                  <span className={styles.queueCopy}>
                    <strong>{invoice.storeName || 'Loja não identificada'}</strong>
                    <small>
                      {invoice.invoiceNumber || `Fatura #${invoice.id ?? '-'}`}
                      <span aria-hidden> · </span>
                      {formatDate(invoice.invoiceDate)}
                    </small>
                    <b>{formatCurrency(invoice.totalAmount)}</b>
                  </span>
                  <StatusBadge status={invoice.status} />
                </button>
              ))
            ) : (
              <div className={styles.emptyState}>
                <FileSearch aria-hidden size={28} strokeWidth={1.5} />
                <span>
                  {query.trim()
                    ? 'Nenhuma fatura corresponde à pesquisa.'
                    : 'Não existem faturas neste estado.'}
                </span>
              </div>
            )}
          </div>

          <Pagination
            isLoading={isLoading}
            onPageChange={setPage}
            page={visiblePage}
            totalItems={filteredInvoices.length}
            totalPages={totalPages}
          />
        </section>

        <section aria-label="Detalhes da fatura" className={styles.detailCard}>
          {!selectedInvoice ? (
            <div className={styles.detailEmpty}>
              <FileSearch aria-hidden size={34} strokeWidth={1.4} />
              <h2>Selecione uma fatura</h2>
              <p>A imagem, o OCR e a decisão aparecem aqui.</p>
            </div>
          ) : (
            <>
              <div className={styles.cardHeader}>
                <div>
                  <h2>{selectedInvoice.storeName || 'Detalhes da fatura'}</h2>
                  <p>
                    {selectedInvoice.invoiceNumber ||
                      `Fatura #${selectedInvoice.id ?? '-'}`}
                  </p>
                </div>
                <StatusBadge status={selectedInvoice.status} />
              </div>

              {detailError ? (
                <p className={styles.inlineError} role="alert">
                  {detailError}
                </p>
              ) : null}

              <div className={styles.detailContent}>
                <InvoicePreview
                  id={selectedInvoice.id}
                  key={`${selectedInvoice.id}-${detailVersion}`}
                  name={selectedInvoice.storeName}
                  version={detailVersion}
                />

                <div className={styles.invoiceSummary}>
                  {isDetailLoading ? (
                    <p className={styles.loadingDetail}>A carregar detalhes...</p>
                  ) : null}
                  <dl className={styles.detailGrid}>
                    <DetailItem
                      label="Loja"
                      value={selectedInvoice.storeName || '-'}
                    />
                    <DetailItem
                      label="Data"
                      value={formatDate(selectedInvoice.invoiceDate)}
                    />
                    <DetailItem
                      label="Número da fatura"
                      value={selectedInvoice.invoiceNumber || '-'}
                    />
                    <DetailItem
                      label="Valor total"
                      value={formatCurrency(selectedInvoice.totalAmount)}
                    />
                    <DetailItem
                      label="NIF do emissor"
                      value={selectedInvoice.issuerTaxId || '-'}
                    />
                    <DetailItem
                      label="NIF do cliente"
                      value={selectedInvoice.customerTaxId || '-'}
                    />
                  </dl>
                </div>
              </div>

              <section className={styles.dataSection}>
                <div className={styles.sectionTitle}>
                  <FileSearch aria-hidden size={18} strokeWidth={1.7} />
                  <div>
                    <h3>Leitura OCR</h3>
                    <p>Dados reconhecidos a partir da imagem submetida.</p>
                  </div>
                  {typeof selectedOcr?.confidence === 'number' ? (
                    <strong>{formatConfidence(selectedOcr.confidence)}</strong>
                  ) : null}
                </div>

                {selectedOcr ? (
                  <>
                    <dl className={styles.ocrGrid}>
                      <DetailItem
                        label="Número reconhecido"
                        value={selectedOcr.extractedInvoiceNumber || '-'}
                      />
                      <DetailItem
                        label="NIF reconhecido"
                        value={selectedOcr.extractedIssuerTaxId || '-'}
                      />
                      <DetailItem
                        label="Data reconhecida"
                        value={formatDate(selectedOcr.extractedInvoiceDate)}
                      />
                      <DetailItem
                        label="Valor reconhecido"
                        value={formatCurrency(selectedOcr.extractedTotalAmount)}
                      />
                    </dl>
                    {selectedOcr.extractedText ? (
                      <details className={styles.ocrText}>
                        <summary>Ver texto extraído</summary>
                        <pre>{selectedOcr.extractedText}</pre>
                      </details>
                    ) : null}
                  </>
                ) : (
                  <p className={styles.mutedMessage}>
                    Esta fatura não possui resultado OCR disponível.
                  </p>
                )}
              </section>

              <section className={styles.validationSection}>
                <div className={styles.sectionTitle}>
                  <ShieldCheck aria-hidden size={18} strokeWidth={1.7} />
                  <div>
                    <h3>Validação</h3>
                    <p>Confirme os dados antes de creditar ou rejeitar os pontos.</p>
                  </div>
                </div>

                {selectedValidation ? (
                  <div className={styles.validationResult}>
                    {selectedValidation.decision === 'APPROVED' ? (
                      <CheckCircle2 aria-hidden size={22} />
                    ) : (
                      <XCircle aria-hidden size={22} />
                    )}
                    <div>
                      <strong>{formatDecision(selectedValidation.decision)}</strong>
                      <span>{formatDateTime(selectedValidation.validatedAt)}</span>
                      {selectedValidation.note ? <p>{selectedValidation.note}</p> : null}
                    </div>
                  </div>
                ) : (
                  <div className={styles.validationForm}>
                    <label>
                      Nota da validação
                      <textarea
                        disabled={Boolean(actionDecision)}
                        onChange={(event) => setNote(event.target.value)}
                        placeholder="Obrigatória em caso de rejeição"
                        rows={3}
                        value={note}
                      />
                    </label>

                    <div className={styles.validationActions}>
                      <button
                        className={styles.rejectButton}
                        disabled={Boolean(actionDecision)}
                        onClick={() => void handleValidation('REJECTED')}
                        type="button"
                      >
                        <XCircle aria-hidden size={16} />
                        {actionDecision === 'REJECTED'
                          ? 'A rejeitar...'
                          : 'Rejeitar'}
                      </button>
                      <button
                        className={styles.approveButton}
                        disabled={Boolean(actionDecision)}
                        onClick={() => void handleValidation('APPROVED')}
                        type="button"
                      >
                        <CheckCircle2 aria-hidden size={16} />
                        {actionDecision === 'APPROVED'
                          ? 'A aprovar...'
                          : 'Aprovar fatura'}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

function InvoicePreview({
  id,
  name,
  version,
}: {
  id?: number;
  name?: string;
  version: number;
}) {
  const [hasError, setHasError] = useState(false);
  const [rotation, setRotation] = useState(0);

  return (
    <div className={styles.invoicePreview}>
      {id && !hasError ? (
        <>
          <Image
            alt={`Imagem da fatura de ${name || `loja #${id}`}`}
            fill
            loading="eager"
            onError={() => setHasError(true)}
            sizes="(max-width: 760px) 90vw, 340px"
            src={getFaturaImagePath(id, version)}
            style={{ transform: `rotate(${rotation}deg)` }}
            unoptimized
          />
          <button
            aria-label="Rodar imagem 90 graus"
            className={styles.rotateButton}
            onClick={() => setRotation((current) => (current + 90) % 360)}
            title="Rodar imagem"
            type="button"
          >
            <RotateCw aria-hidden size={16} strokeWidth={1.8} />
          </button>
        </>
      ) : (
        <div className={styles.imageFallback}>
          <ImageOff aria-hidden size={30} strokeWidth={1.4} />
          <span>Imagem indisponível</span>
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status?: string }) {
  const kind = getStatusKind(status);
  const Icon =
    kind === 'approved'
      ? CheckCircle2
      : kind === 'rejected'
        ? XCircle
        : Clock3;

  return (
    <span className={styles[`status_${kind}`]}>
      <Icon aria-hidden size={13} strokeWidth={2} />
      {formatStatus(status)}
    </span>
  );
}

async function getOptionalResource<T>(request: Promise<T>) {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && (error.status === 404 || error.status === 204)) {
      return null;
    }

    throw error;
  }
}

function getStatusKind(status?: string) {
  const normalized = status?.toUpperCase();

  if (normalized === 'APPROVED') {
    return 'approved' as const;
  }

  if (normalized === 'REJECTED') {
    return 'rejected' as const;
  }

  return 'pending' as const;
}

function formatStatus(status?: string) {
  const normalized = status?.toUpperCase();

  if (normalized === 'APPROVED') {
    return 'Aprovada';
  }

  if (normalized === 'REJECTED') {
    return 'Rejeitada';
  }

  if (normalized === 'PENDING_VALIDATION' || normalized === 'PENDING') {
    return 'Pendente';
  }

  return status || 'Sem estado';
}

function formatDecision(value?: string) {
  return value === 'APPROVED'
    ? 'Fatura aprovada'
    : value === 'REJECTED'
      ? 'Fatura rejeitada'
      : value || 'Validação concluída';
}

function formatCurrency(value?: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '-';
  }

  return new Intl.NumberFormat('pt-AO', {
    currency: 'AOA',
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
    style: 'currency',
  }).format(value);
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-AO', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function formatDateTime(value?: string) {
  if (!value) {
    return 'Data não disponível';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat('pt-AO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function formatConfidence(value: number) {
  const normalized = value <= 1 ? value * 100 : value;
  return `${Math.round(normalized)}% confiança`;
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return fallback;
}
