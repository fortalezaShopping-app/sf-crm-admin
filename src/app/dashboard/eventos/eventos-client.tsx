'use client';

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Ban,
  CalendarDays,
  CircleCheck,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { EventImage } from '@/components/admin/EventImage';
import { Pagination } from '@/components/admin/Pagination';
import { useAdminSearchQuery } from '@/components/admin/useAdminSearchQuery';
import { matchesSearchQuery } from '@/lib/admin-search';
import {
  activateEvento,
  ApiError,
  cancelEvento,
  clearAdminApiCache,
  createEvento,
  deactivateEvento,
  deleteEvento,
  getEvento,
  listAllEventos,
  replaceEventoImage,
  updateEvento,
  type Evento,
  type EventoRequest,
} from '@/lib/api';

import styles from './eventos.module.css';

type FormState = {
  dataFim: string;
  dataInicio: string;
  descricao: string;
  local: string;
  titulo: string;
};

type StatusFilter = 'all' | EventStatusKind;
type EventStatusKind = 'ACTIVE' | 'CANCELED' | 'INACTIVE' | 'UNKNOWN';
type StatusAction = 'activate' | 'cancel' | 'deactivate' | 'delete';

const ITEMS_PER_PAGE = 8;

const statusFilters: Array<{ label: string; value: StatusFilter }> = [
  { label: 'Todos', value: 'all' },
  { label: 'Ativos', value: 'ACTIVE' },
  { label: 'Inativos', value: 'INACTIVE' },
  { label: 'Cancelados', value: 'CANCELED' },
];

export function EventosClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingEventId, setEditingEventId] = useState<number | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [form, setForm] = useState<FormState>(() => createInitialForm());
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const { deferredQuery, query, setQuery } = useAdminSearchQuery();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const imagePreviewRef = useRef<string | null>(null);

  const loadEventos = useCallback(async (bypassCache = false) => {
    setIsLoading(true);

    try {
      if (bypassCache) {
        clearAdminApiCache();
      }

      const result = await listAllEventos();
      setEventos(
        [...result].sort((left, right) =>
          (right.dataInicio ?? '').localeCompare(left.dataInicio ?? ''),
        ),
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setImageFile = useCallback((file: File | null) => {
    revokePreview(imagePreviewRef);
    const previewUrl = file ? URL.createObjectURL(file) : null;
    imagePreviewRef.current = previewUrl;
    setImage(file);
    setImagePreviewUrl(previewUrl);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingEventId(null);
    setForm(createInitialForm());
    setImageFile(null);
    setIsEditorOpen(false);
  }, [setImageFile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadEventos(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadEventos]);

  useEffect(
    () => () => {
      revokePreview(imagePreviewRef);
    },
    [],
  );

  useEffect(() => {
    if (!isEditorOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !isSubmitting) {
        closeEditor();
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeEditor, isEditorOpen, isSubmitting]);

  const filteredEventos = useMemo(() => {
    return eventos.filter((evento) => {
      const status = getStatusKind(evento.estado);

      return (
        matchesSearchQuery(deferredQuery, [
          evento.id,
          evento.titulo,
          evento.descricao,
          evento.local,
          evento.criadoPor,
          evento.estado,
          evento.dataInicio,
          evento.dataFim,
        ]) &&
        (statusFilter === 'all' || statusFilter === status)
      );
    });
  }, [deferredQuery, eventos, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredEventos.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(page, totalPages - 1);
  const visibleEventos = filteredEventos.slice(
    visiblePage * ITEMS_PER_PAGE,
    (visiblePage + 1) * ITEMS_PER_PAGE,
  );

  function updateFilters(action: () => void) {
    setPage(0);
    action();
  }

  function openCreateEvent() {
    setEditingEventId(null);
    setForm(createInitialForm());
    setImageFile(null);
    setMessage(null);
    setIsEditorOpen(true);
  }

  async function startEditing(evento: Evento) {
    if (!evento.id) {
      return;
    }

    setActionId(`edit-${evento.id}`);
    setMessage(null);

    try {
      const detail = await getEvento(evento.id);
      setEditingEventId(evento.id);
      setForm(toFormState(detail));
      setImageFile(null);
      setIsEditorOpen(true);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = toRequest(form);

      if (editingEventId) {
        await updateEvento(editingEventId, payload);

        if (image) {
          await replaceEventoImage(editingEventId, image);
          setImageVersion((current) => current + 1);
        }

        closeEditor();
        await loadEventos(true);
        setMessage('Evento atualizado com sucesso.');
      } else {
        await createEvento(payload, image ?? undefined);
        closeEditor();
        setPage(0);
        await loadEventos(true);
        setMessage('Evento criado com sucesso.');
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusAction(evento: Evento, action: StatusAction) {
    if (!evento.id) {
      return;
    }

    const confirmation = getActionConfirmation(evento, action);
    if (!window.confirm(confirmation)) {
      return;
    }

    setActionId(`${action}-${evento.id}`);
    setMessage(null);

    try {
      if (action === 'activate') {
        await activateEvento(evento.id);
      } else if (action === 'deactivate') {
        await deactivateEvento(evento.id);
      } else if (action === 'cancel') {
        await cancelEvento(evento.id);
      } else {
        await deleteEvento(evento.id);
      }

      await loadEventos(true);
      setMessage(getActionSuccessMessage(action));
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <h1>Eventos</h1>
          <p>Crie e publique a agenda que será apresentada no aplicativo mobile.</p>
        </div>

        <button className={styles.createButton} onClick={openCreateEvent} type="button">
          <Plus aria-hidden size={17} strokeWidth={1.8} />
          Novo evento
        </button>
      </header>

      {message && !isEditorOpen ? (
        <p
          className={message.includes('sucesso') ? styles.successNotice : styles.errorNotice}
          role={message.includes('sucesso') ? 'status' : 'alert'}
        >
          {message}
        </p>
      ) : null}

      <section className={styles.tableCard}>
        <div className={styles.filters}>
          <div aria-label="Filtrar eventos por estado" className={styles.statusTabs}>
            {statusFilters.map((filter) => (
              <button
                aria-pressed={statusFilter === filter.value}
                className={
                  statusFilter === filter.value ? styles.statusTabActive : styles.statusTab
                }
                key={filter.value}
                onClick={() => updateFilters(() => setStatusFilter(filter.value))}
                type="button"
              >
                {filter.label}
              </button>
            ))}
          </div>

          <label className={styles.searchField}>
            <Search aria-hidden size={14} strokeWidth={1.7} />
            <input
              aria-label="Pesquisar eventos"
              autoComplete="off"
              onChange={(event) => updateFilters(() => setQuery(event.target.value))}
              placeholder="Pesquisar eventos"
              spellCheck={false}
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Evento</th>
                <th>Início</th>
                <th>Fim</th>
                <th>Local</th>
                <th>Estado</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {visibleEventos.length > 0 ? (
                visibleEventos.map((evento) => {
                  const status = getStatusKind(evento.estado);

                  return (
                    <tr key={evento.id ?? `${evento.titulo}-${evento.dataInicio}`}>
                      <td>
                        <span className={styles.eventIdentity}>
                          <EventImage
                            available={Boolean(evento.imageUrl)}
                            id={evento.id}
                            name={evento.titulo}
                            version={imageVersion}
                          />
                          <span>
                            <strong>{evento.titulo ?? 'Evento sem título'}</strong>
                            <small>{evento.descricao || 'Sem descrição'}</small>
                          </span>
                        </span>
                      </td>
                      <td>{formatDate(evento.dataInicio)}</td>
                      <td>{formatDate(evento.dataFim)}</td>
                      <td>{evento.local || '-'}</td>
                      <td>
                        <span className={getStatusClassName(status)}>
                          {formatStatus(evento.estado)}
                        </span>
                      </td>
                      <td>
                        <span className={styles.actions}>
                          <button
                            disabled={!evento.id || actionId === `edit-${evento.id}`}
                            onClick={() => void startEditing(evento)}
                            title="Editar evento"
                            type="button"
                          >
                            <Pencil aria-hidden size={12} />
                            Editar
                          </button>

                          {status === 'ACTIVE' ? (
                            <button
                              disabled={actionId === `deactivate-${evento.id}`}
                              onClick={() => void handleStatusAction(evento, 'deactivate')}
                              title="Desativar evento"
                              type="button"
                            >
                              <Ban aria-hidden size={12} />
                              Desativar
                            </button>
                          ) : (
                            <button
                              disabled={actionId === `activate-${evento.id}`}
                              onClick={() => void handleStatusAction(evento, 'activate')}
                              title="Ativar evento"
                              type="button"
                            >
                              <CircleCheck aria-hidden size={12} />
                              Ativar
                            </button>
                          )}

                          {status !== 'CANCELED' ? (
                            <button
                              className={styles.warningAction}
                              disabled={actionId === `cancel-${evento.id}`}
                              onClick={() => void handleStatusAction(evento, 'cancel')}
                              title="Cancelar evento"
                              type="button"
                            >
                              <X aria-hidden size={12} />
                              Cancelar
                            </button>
                          ) : null}

                          <button
                            aria-label={`Eliminar ${evento.titulo ?? 'evento'}`}
                            className={styles.dangerAction}
                            disabled={actionId === `delete-${evento.id}`}
                            onClick={() => void handleStatusAction(evento, 'delete')}
                            title="Eliminar permanentemente"
                            type="button"
                          >
                            <Trash2 aria-hidden size={12} />
                          </button>
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className={styles.emptyState} colSpan={6}>
                    {isLoading
                      ? 'A carregar eventos...'
                      : 'Nenhum evento corresponde aos filtros.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className={styles.pagination}>
          <Pagination
            isLoading={isLoading}
            onPageChange={setPage}
            page={visiblePage}
            totalItems={filteredEventos.length}
            totalPages={totalPages}
          />
        </div>
      </section>

      {isEditorOpen ? (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !isSubmitting) {
              closeEditor();
            }
          }}
          role="presentation"
        >
          <article
            aria-labelledby="event-editor-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <header className={styles.modalHeader}>
              <span className={styles.modalTitleIcon}>
                <CalendarDays aria-hidden size={19} />
              </span>
              <div>
                <h2 id="event-editor-title">
                  {editingEventId ? 'Editar evento' : 'Novo evento'}
                </h2>
                <p>
                  {editingEventId
                    ? `Registo #${editingEventId}`
                    : 'Publicação para o aplicativo mobile'}
                </p>
              </div>
              <button
                aria-label="Fechar formulário"
                className={styles.closeButton}
                disabled={isSubmitting}
                onClick={closeEditor}
                type="button"
              >
                <X aria-hidden size={19} />
              </button>
            </header>

            {message ? (
              <p className={styles.modalError} role="alert">
                {message}
              </p>
            ) : null}

            <div className={styles.modalBody}>
              <div className={styles.mediaPreview}>
                <EventImage
                  available={Boolean(
                    editingEventId &&
                      eventos.find((evento) => evento.id === editingEventId)?.imageUrl,
                  )}
                  id={editingEventId ?? undefined}
                  name={form.titulo}
                  previewUrl={imagePreviewUrl}
                  size="form"
                  version={imageVersion}
                />
                <div>
                  <strong>Imagem de capa</strong>
                  <p>JPEG, PNG ou WebP. A imagem é opcional e pode ser substituída depois.</p>
                </div>
              </div>

              <form className={`admin-form ${styles.form}`} onSubmit={handleSubmit}>
                <div className="form-section-heading">Informação principal</div>

                <label>
                  Título
                  <input
                    maxLength={200}
                    onChange={(event) => setForm({ ...form, titulo: event.target.value })}
                    required
                    value={form.titulo}
                  />
                </label>

                <label>
                  Local
                  <input
                    maxLength={300}
                    onChange={(event) => setForm({ ...form, local: event.target.value })}
                    placeholder="Shopping Fortaleza"
                    value={form.local}
                  />
                </label>

                <label className={styles.fullWidth}>
                  Descrição
                  <textarea
                    maxLength={2000}
                    onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                    rows={5}
                    value={form.descricao}
                  />
                </label>

                <div className="form-section-heading">Data e imagem</div>

                <label>
                  Início
                  <input
                    onChange={(event) => setForm({ ...form, dataInicio: event.target.value })}
                    required
                    type="datetime-local"
                    value={form.dataInicio}
                  />
                </label>

                <label>
                  Fim
                  <input
                    min={form.dataInicio}
                    onChange={(event) => setForm({ ...form, dataFim: event.target.value })}
                    required
                    type="datetime-local"
                    value={form.dataFim}
                  />
                </label>

                <label className={styles.fullWidth}>
                  {editingEventId ? 'Substituir imagem de capa' : 'Imagem de capa'}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                    type="file"
                  />
                  <span className="form-hint">
                    {image?.name ??
                      (editingEventId
                        ? 'Mantenha vazio para preservar a imagem atual.'
                        : 'Opcional.')}
                  </span>
                </label>

                <div className="form-actions">
                  <button className="primary-button" disabled={isSubmitting} type="submit">
                    {editingEventId ? (
                      <Save aria-hidden size={16} />
                    ) : (
                      <Plus aria-hidden size={16} />
                    )}
                    {isSubmitting
                      ? 'A guardar...'
                      : editingEventId
                        ? 'Guardar alterações'
                        : 'Criar evento'}
                  </button>
                  <button className="ghost-button" onClick={closeEditor} type="button">
                    <X aria-hidden size={16} />
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function createInitialForm(): FormState {
  const startDate = new Date();
  startDate.setSeconds(0, 0);
  startDate.setMinutes(0);
  startDate.setHours(startDate.getHours() + 1);

  const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

  return {
    dataFim: toDateTimeLocal(endDate),
    dataInicio: toDateTimeLocal(startDate),
    descricao: '',
    local: '',
    titulo: '',
  };
}

function toFormState(evento: Evento): FormState {
  return {
    dataFim: toDateTimeLocal(evento.dataFim),
    dataInicio: toDateTimeLocal(evento.dataInicio),
    descricao: evento.descricao ?? '',
    local: evento.local ?? '',
    titulo: evento.titulo ?? '',
  };
}

function toRequest(form: FormState): EventoRequest {
  const startDate = new Date(form.dataInicio);
  const endDate = new Date(form.dataFim);

  if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
    throw new Error('Indique datas válidas para o evento.');
  }

  if (endDate.getTime() <= startDate.getTime()) {
    throw new Error('A data de fim deve ser posterior à data de início.');
  }

  return {
    dataFim: endDate.toISOString(),
    dataInicio: startDate.toISOString(),
    descricao: form.descricao.trim() || undefined,
    local: form.local.trim() || undefined,
    titulo: form.titulo.trim(),
  };
}

function toDateTimeLocal(value: string | Date | undefined) {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();

  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-AO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getStatusKind(status?: string): EventStatusKind {
  const normalized = status?.trim().toUpperCase();

  if (normalized === 'ACTIVE' || normalized === 'ATIVO' || normalized === 'PUBLISHED') {
    return 'ACTIVE';
  }

  if (normalized?.includes('CANCEL')) {
    return 'CANCELED';
  }

  if (
    normalized === 'INACTIVE' ||
    normalized === 'INATIVO' ||
    normalized === 'DRAFT' ||
    normalized === 'PENDING'
  ) {
    return 'INACTIVE';
  }

  return 'UNKNOWN';
}

function formatStatus(status?: string) {
  const kind = getStatusKind(status);

  if (kind === 'ACTIVE') {
    return 'Ativo';
  }

  if (kind === 'CANCELED') {
    return 'Cancelado';
  }

  if (kind === 'INACTIVE') {
    return 'Inativo';
  }

  return status || 'Sem estado';
}

function getStatusClassName(status: EventStatusKind) {
  if (status === 'ACTIVE') {
    return `${styles.statusBadge} ${styles.statusBadgeActive}`;
  }

  if (status === 'CANCELED') {
    return `${styles.statusBadge} ${styles.statusBadgeCanceled}`;
  }

  return `${styles.statusBadge} ${styles.statusBadgeInactive}`;
}

function getActionConfirmation(evento: Evento, action: StatusAction) {
  const name = evento.titulo ?? `#${evento.id}`;

  if (action === 'activate') {
    return `Ativar o evento ${name}?`;
  }

  if (action === 'deactivate') {
    return `Desativar o evento ${name}?`;
  }

  if (action === 'cancel') {
    return `Cancelar o evento ${name}?`;
  }

  return `Eliminar permanentemente o evento ${name}? Esta ação não pode ser desfeita.`;
}

function getActionSuccessMessage(action: StatusAction) {
  if (action === 'activate') {
    return 'Evento ativado com sucesso.';
  }

  if (action === 'deactivate') {
    return 'Evento desativado com sucesso.';
  }

  if (action === 'cancel') {
    return 'Evento cancelado com sucesso.';
  }

  return 'Evento eliminado com sucesso.';
}

function revokePreview(reference: { current: string | null }) {
  if (reference.current) {
    URL.revokeObjectURL(reference.current);
    reference.current = null;
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Não foi possível carregar os eventos.';
}
