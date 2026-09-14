'use client';

import { IconButton } from '@/components/ui/icon-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import {
  Check,
  ExternalLink,
  ImageOff,
  RefreshCw,
  RotateCw,
  Search,
  X,
  ZoomIn,
} from 'lucide-react';
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
} from '@/lib/api';
import { matchesSearchQuery } from '@/lib/admin-search';
import { formatAdminDate, formatNumber } from '@/lib/admin-models';
import {
  EmptyState,
  ExportButton,
  Modal,
  Notice,
} from '@/components/admin/Workspace';
import { Pagination } from '@/components/admin/Pagination';
import { useAdminSearchQuery } from '@/components/admin/useAdminSearchQuery';
import s from '@/components/admin/Workspace.module.css';
import styles from './invoice-workspace.module.css';

const statusNames: Record<string, string> = {
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  PENDING_VALIDATION: 'Pendente',
  PENDING: 'Pendente',
  PROCESSING: 'Em processamento',
  UPLOADED: 'Submetida',
};
const money = (value?: number) =>
  typeof value === 'number' ? `${formatNumber(value)} AOA` : 'Indisponível';
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Não foi possível concluir a operação.';
async function optional<T>(request: Promise<T>) {
  try {
    return await request;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export function ComprovativosClient() {
  const [invoices, setInvoices] = useState<FaturaAdmin[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [id, setId] = useState<number>();
  const [detail, setDetail] = useState<FaturaAdmin | null>(null);
  const [ocr, setOcr] = useState<OcrFatura | null>(null);
  const [validation, setValidation] = useState<ValidacaoFatura | null>(null);
  const [detailError, setDetailError] = useState('');
  const [note, setNote] = useState('');
  const [decision, setDecision] = useState<'APPROVED' | 'REJECTED' | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [decisionInvoiceId, setDecisionInvoiceId] = useState<number>();
  const detailRef = useRef<HTMLDivElement>(null);
  const [actionError, setActionError] = useState('');
  const [zoom, setZoom] = useState(false);
  const { query, deferredQuery, setQuery } = useAdminSearchQuery();
  useEffect(() => {
    let active = true;
    listAllFaturas({ status: filter === 'all' ? undefined : filter })
      .then((data) => {
        if (active) {
          setInvoices(data);
          setError('');
        }
      })
      .catch((e) => {
        if (active) {
          setError(errorText(e));
          setInvoices([]);
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [filter, version]);
  const filtered = invoices.filter((i) =>
    matchesSearchQuery(deferredQuery, [
      i.id,
      i.invoiceNumber,
      i.storeName,
      i.customerTaxId,
      i.issuerTaxId,
      i.totalAmount,
      i.status,
      i.note,
      i.invoiceDate,
    ]),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const current = Math.min(page, pages - 1);
  const visible = filtered.slice(current * 8, current * 8 + 8);
  const selected = filtered.find((i) => i.id === id) ?? visible[0];
  const selectedId = selected?.id;
  useEffect(() => {
    let active = true;
    if (!selectedId) return;
    Promise.all([
      getFatura(selectedId),
      optional(getFaturaOcr(selectedId)),
      optional(getFaturaValidacao(selectedId)),
    ])
      .then(([invoice, ocrData, validationData]) => {
        if (active) {
          setDetail(invoice);
          setOcr(ocrData);
          setValidation(validationData);
          setDetailError('');
        }
      })
      .catch((e) => {
        if (active) setDetailError(errorText(e));
      });
    return () => {
      active = false;
    };
  }, [selectedId, version]);
  const loaded = detail?.id === selectedId;
  const invoice = loaded ? detail : selected;
  const canValidate =
    loaded &&
    !detailError &&
    !validation &&
    ['PENDING_VALIDATION', 'PENDING'].includes(invoice?.status ?? '') &&
    !loading;
  function refresh() {
    clearAdminApiCache();
    setLoading(true);
    setVersion((v) => v + 1);
  }
  async function confirmValidation() {
    if (
      !selectedId ||
      selectedId !== decisionInvoiceId ||
      !decision ||
      !canValidate ||
      busy
    )
      return;
    if (decision === 'REJECTED' && !note.trim()) {
      setActionError('Indique o motivo da rejeição.');
      return;
    }
    setBusy(true);
    setActionError('');
    try {
      await validarFatura(String(selectedId), {
        decision,
        note: note.trim() || undefined,
      });
      setDecision(null);
      setDetail(null);
      setMessage(
        decision === 'APPROVED' ? 'Fatura aprovada.' : 'Fatura rejeitada.',
      );
      setNote('');
      refresh();
    } catch (e) {
      setActionError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>Talões</h1>
        <div className={s.actions}>
          <ExportButton
            name="taloes"
            disabled={loading}
            rows={[
              ['Loja', 'Número', 'Estado', 'Data', 'Valor AOA', 'NIF cliente'],
              ...filtered.map((i) => [
                i.storeName,
                i.invoiceNumber,
                i.status,
                i.invoiceDate,
                i.totalAmount,
                i.customerTaxId,
              ]),
            ]}
          />
          <IconButton
            title="Atualizar talões"
            aria-label="Atualizar talões"
            disabled={loading || busy}
            onClick={refresh}
          >
            <RefreshCw size={16} />
          </IconButton>
        </div>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <div className={styles.workspace}>
        <section
          className={s.panel}
          aria-label="Fila de faturas"
          aria-busy={loading}
        >
          <div className={`${s.padding} ${s.stack}`}>
            <div className={s.segments}>
              {[
                ['all', 'Todas'],
                ['APPROVED', 'Aprovadas'],
                ['PENDING_VALIDATION', 'Pendentes'],
                ['REJECTED', 'Rejeitadas'],
              ].map(([value, label]) => (
                <Button
                  variant="plain"
                  size="plain"
                  key={value}
                  className={s.segment}
                  aria-pressed={filter === value}
                  disabled={busy}
                  onClick={() => {
                    setFilter(value);
                    setLoading(true);
                    setId(undefined);
                    setDetail(null);
                    setPage(0);
                    setNote('');
                  }}
                >
                  {label}
                </Button>
              ))}
            </div>
            <label className={s.search}>
              <Search size={16} />
              <Input
                aria-label="Pesquisar faturas"
                placeholder="Loja, número, NIF ou valor"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
          </div>
          {loading ? (
            <EmptyState>A carregar faturas...</EmptyState>
          ) : !filtered.length ? (
            <EmptyState>Nenhuma fatura encontrada.</EmptyState>
          ) : (
            <div className={s.tableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Loja</th>
                    <th>Estado</th>
                    <th>Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((i) => (
                    <tr
                      key={i.id}
                      className={i.id === selectedId ? s.selected : undefined}
                    >
                      <td>
                        <Button
                          variant="plain"
                          size="plain"
                          className={s.nameButton}
                          aria-pressed={i.id === selectedId}
                          disabled={busy}
                          onClick={() => {
                            setId(i.id);
                            setNote('');
                            setDetailError('');
                            if (window.innerWidth < 760)
                              detailRef.current?.scrollIntoView({
                                block: 'start',
                              });
                          }}
                        >
                          <span>
                            <strong>
                              {i.storeName || 'Loja não identificada'}
                            </strong>
                            <small>{i.invoiceNumber || `#${i.id}`}</small>
                            <small>{formatAdminDate(i.invoiceDate)}</small>
                          </span>
                        </Button>
                      </td>
                      <td>
                        <InvoiceStatus status={i.status} />
                      </td>
                      <td>{money(i.totalAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={current}
            totalPages={pages}
            totalItems={filtered.length}
            isLoading={loading || busy}
            onPageChange={setPage}
          />
        </section>
        <div
          className={s.stack}
          ref={detailRef}
          style={{ scrollMarginTop: 120 }}
        >
          <section className={s.panel}>
            <header className={s.panelHeader}>
              <h2>Informações do cliente</h2>
            </header>
            <div className={s.padding}>
              {invoice ? (
                <dl className={s.details}>
                  <div>
                    <dt>NIF do cliente</dt>
                    <dd>{invoice.customerTaxId || 'Não disponibilizado'}</dd>
                  </div>
                </dl>
              ) : (
                <EmptyState>Selecione uma fatura.</EmptyState>
              )}
            </div>
          </section>
          <section className={s.panel} aria-label="Detalhes da fatura">
            <header className={s.panelHeader}>
              <h2>Dados da fatura</h2>
            </header>
            <div className={`${s.padding} ${s.stack}`}>
              {detailError && <Notice tone="error">{detailError}</Notice>}
              {!invoice ? (
                <EmptyState>Selecione uma fatura.</EmptyState>
              ) : (
                <>
                  <dl className={`${s.details} ${s.detailGrid}`}>
                    {[
                      ['Loja', invoice.storeName],
                      ['Data', formatAdminDate(invoice.invoiceDate)],
                      ['Número', invoice.invoiceNumber],
                      ['NIF do emissor', invoice.issuerTaxId],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{label}</dt>
                        <dd>{value || '-'}</dd>
                      </div>
                    ))}
                  </dl>
                  <InvoiceStatus status={invoice.status} />
                  <strong className={styles.total}>
                    {money(invoice.totalAmount)}
                  </strong>
                  {invoice.note && <p className={s.muted}>{invoice.note}</p>}
                  {!loaded && !detailError && (
                    <p className={s.muted}>A carregar detalhes...</p>
                  )}
                  {canValidate && (
                    <>
                      <label className={s.form}>
                        Nota da validação
                        <Textarea
                          aria-label="Nota da validação"
                          rows={3}
                          value={note}
                          onChange={(e) => setNote(e.target.value)}
                          placeholder="Motivo obrigatório em caso de rejeição"
                        />
                      </label>
                      <div className={s.actions}>
                        <Button
                          variant="success"
                          disabled={busy}
                          onClick={() => {
                            setActionError('');
                            setDecision('APPROVED');
                            setDecisionInvoiceId(selectedId);
                          }}
                        >
                          <Check size={16} />
                          Aprovar
                        </Button>
                        <Button
                          variant="destructive"
                          disabled={busy}
                          onClick={() => {
                            setActionError('');
                            setDecision('REJECTED');
                            setDecisionInvoiceId(selectedId);
                          }}
                        >
                          <X size={16} />
                          Rejeitar
                        </Button>
                      </div>
                    </>
                  )}
                  {loaded && validation && (
                    <dl className={s.details}>
                      <div>
                        <dt>Decisão</dt>
                        <dd>
                          {statusNames[validation.decision ?? ''] ??
                            validation.decision}
                        </dd>
                      </div>
                      <div>
                        <dt>Validada em</dt>
                        <dd>{formatAdminDate(validation.validatedAt, true)}</dd>
                      </div>
                      {validation.note && (
                        <div>
                          <dt>Nota</dt>
                          <dd>{validation.note}</dd>
                        </div>
                      )}
                    </dl>
                  )}
                  <Button
                    variant="outline"
                    disabled
                    title="Pedido de informação à loja indisponível na API"
                  >
                    Solicitar informação à loja
                  </Button>
                  <details>
                    <summary>Dados OCR</summary>
                    {loaded && ocr ? (
                      <dl className={s.details}>
                        <div>
                          <dt>Número reconhecido</dt>
                          <dd>{ocr.extractedInvoiceNumber || '-'}</dd>
                        </div>
                        <div>
                          <dt>NIF do emissor</dt>
                          <dd>{ocr.extractedIssuerTaxId || '-'}</dd>
                        </div>
                        <div>
                          <dt>Data</dt>
                          <dd>{formatAdminDate(ocr.extractedInvoiceDate)}</dd>
                        </div>
                        <div>
                          <dt>Total reconhecido</dt>
                          <dd>{money(ocr.extractedTotalAmount)}</dd>
                        </div>
                        {typeof ocr.confidence === 'number' && (
                          <div>
                            <dt>Confiança</dt>
                            <dd>
                              {formatNumber(
                                ocr.confidence <= 1
                                  ? ocr.confidence * 100
                                  : ocr.confidence,
                              )}
                              %
                            </dd>
                          </div>
                        )}
                        {ocr.extractedText && (
                          <div>
                            <dt>Texto extraído</dt>
                            <dd className={styles.ocr}>{ocr.extractedText}</dd>
                          </div>
                        )}
                      </dl>
                    ) : (
                      <p className={s.muted}>Leitura OCR indisponível.</p>
                    )}
                  </details>
                </>
              )}
            </div>
          </section>
        </div>
        <section className={s.panel}>
          <header className={s.panelHeader}>
            <h2>Imagem da fatura</h2>
            <IconButton
              title="Ampliar fatura"
              aria-label="Ampliar fatura"
              disabled={!selectedId}
              onClick={() => setZoom(true)}
            >
              <ZoomIn size={16} />
            </IconButton>
          </header>
          {selectedId ? (
            <InvoicePreview
              key={`${selectedId}-${version}`}
              id={selectedId}
              version={version}
              name={invoice?.storeName}
            />
          ) : (
            <EmptyState>Sem fatura selecionada.</EmptyState>
          )}
        </section>
      </div>
      {zoom && selectedId && (
        <Modal title="Imagem da fatura" onClose={() => setZoom(false)}>
          <InvoicePreview
            id={selectedId}
            version={version}
            name={invoice?.storeName}
            large
          />
        </Modal>
      )}
      {decision && (
        <Modal
          title={decision === 'APPROVED' ? 'Aprovar fatura' : 'Rejeitar fatura'}
          busy={busy}
          onClose={() => setDecision(null)}
        >
          <div className={s.stack}>
            <p>
              {invoice?.storeName} · {invoice?.invoiceNumber} ·{' '}
              {money(invoice?.totalAmount)}
            </p>
            <p>Confirma esta decisão? A alteração será registada no sistema.</p>
            {decision === 'REJECTED' && (
              <label className={s.form}>
                Motivo da rejeição
                <Textarea
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </label>
            )}
            {actionError && <Notice tone="error">{actionError}</Notice>}
            <div className={s.footer}>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setDecision(null)}
              >
                Cancelar
              </Button>
              <Button
                variant={decision === 'APPROVED' ? 'success' : 'destructive'}
                disabled={
                  busy || !canValidate || selectedId !== decisionInvoiceId
                }
                onClick={confirmValidation}
              >
                {busy ? 'A guardar...' : 'Confirmar decisão'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function InvoiceStatus({ status }: { status?: string }) {
  return (
    <Badge
      variant="secondary"
      data-tone={
        status === 'APPROVED'
          ? 'success'
          : status === 'REJECTED'
            ? 'danger'
            : 'warning'
      }
    >
      {statusNames[status ?? ''] ?? status ?? 'Indisponível'}
    </Badge>
  );
}
function InvoicePreview({
  id,
  name,
  version,
  large = false,
}: {
  id: number;
  name?: string;
  version: number;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [rotation, setRotation] = useState(0);
  return (
    <div className={styles.preview} data-large={large}>
      <div className={styles.image}>
        {failed ? (
          <div className={styles.fallback}>
            <ImageOff size={28} />
            <span>Imagem indisponível</span>
          </div>
        ) : (
          <Image
            fill
            src={getFaturaImagePath(id, version)}
            alt={`Fatura de ${name || 'loja'}`}
            unoptimized
            loading="eager"
            sizes="(max-width: 760px) 90vw, 600px"
            style={{
              transform: `rotate(${rotation}deg)`,
              scale: rotation % 180 ? '0.7' : '1',
            }}
            onError={() => setFailed(true)}
          />
        )}
      </div>
      <div className={s.actions}>
        <IconButton
          title="Rodar imagem"
          aria-label="Rodar imagem"
          disabled={failed}
          onClick={() => setRotation((r) => (r + 90) % 360)}
        >
          <RotateCw size={16} />
        </IconButton>
        <Button asChild variant="outline">
          <a
            href={getFaturaImagePath(id, version)}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink size={16} />
            Abrir original
          </a>
        </Button>
      </div>
    </div>
  );
}
