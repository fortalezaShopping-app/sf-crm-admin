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
  Building2,
  FilePlus2,
  Pencil,
  Plus,
  Save,
  Search,
  Store,
  X,
} from 'lucide-react';

import { Pagination } from '@/components/admin/Pagination';
import { StoreImage } from '@/components/admin/StoreImage';
import {
  ApiError,
  clearAdminApiCache,
  createLoja,
  deactivateLoja,
  getLoja,
  listAllLojas,
  replaceLojaImage,
  replaceLojaLogo,
  updateLoja,
  type Loja,
  type LojaFloor,
  type LojaRequest,
} from '@/lib/api';

import styles from './lojas.module.css';

type FormState = {
  categoria: string;
  descricao: string;
  email: string;
  endereco: string;
  facebookUrl: string;
  horario: string;
  instagramUrl: string;
  nif: string;
  nome: string;
  piso: LojaFloor;
  razaoSocial: string;
  sourceUrl: string;
  telefone: string;
};

type StatusFilter = 'all' | 'ATIVA' | 'PENDENTE' | 'INATIVA';

const ITEMS_PER_PAGE = 10;

const initialFormState: FormState = {
  categoria: '',
  descricao: '',
  email: '',
  endereco: '',
  facebookUrl: '',
  horario: '',
  instagramUrl: '',
  nif: '',
  nome: '',
  piso: 'GROUND_FLOOR',
  razaoSocial: '',
  sourceUrl: '',
  telefone: '',
};

const defaultCategories = [
  'Alimentacao',
  'Cinema',
  'Electrodomesticos',
  'Financas',
  'Joalharia',
  'Moda',
  'Restauracao',
  'Saude & Beleza',
] as const;

const floorOptions: Array<{ label: string; value: LojaFloor }> = [
  { label: 'Rés do chão', value: 'GROUND_FLOOR' },
  { label: 'Piso 1', value: 'FLOOR_1' },
  { label: 'Piso 2', value: 'FLOOR_2' },
  { label: 'Pisos 2 e 4', value: 'FLOORS_2_AND_4' },
  { label: 'Piso 3', value: 'FLOOR_3' },
  { label: 'Piso 4', value: 'FLOOR_4' },
  { label: 'Terraço do piso 4', value: 'FLOOR_4_TERRACE' },
];

export function LojasClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [mediaVersion, setMediaVersion] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [selectedStoreIds, setSelectedStoreIds] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const formRef = useRef<HTMLFormElement>(null);
  const imagePreviewRef = useRef<string | null>(null);
  const logoPreviewRef = useRef<string | null>(null);

  const loadLojas = useCallback(async (bypassCache = false) => {
    setIsLoading(true);

    try {
      if (bypassCache) {
        clearAdminApiCache();
      }

      const result = await listAllLojas();
      setLojas(
        [...result].sort((left, right) =>
          (left.nome ?? '').localeCompare(right.nome ?? '', 'pt', {
            sensitivity: 'base',
          }),
        ),
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadLojas(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadLojas]);

  useEffect(
    () => () => {
      revokePreview(imagePreviewRef);
      revokePreview(logoPreviewRef);
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
        setIsEditorOpen(false);
      }
    }

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isEditorOpen, isSubmitting]);

  const categoryOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...defaultCategories,
          ...lojas.flatMap((loja) => (loja.categoria ? [loja.categoria] : [])),
        ]),
      ).sort((left, right) => left.localeCompare(right, 'pt')),
    [lojas],
  );

  const filteredLojas = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return lojas.filter((loja) => {
      const searchableText = normalizeText(
        [
          loja.nome,
          loja.razaoSocial,
          loja.nif,
          loja.categoria,
          loja.telefone,
          loja.email,
        ]
          .filter(Boolean)
          .join(' '),
      );

      return (
        (!normalizedQuery || searchableText.includes(normalizedQuery)) &&
        (statusFilter === 'all' || loja.estado === statusFilter)
      );
    });
  }, [lojas, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLojas.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(page, totalPages - 1);
  const visibleLojas = filteredLojas.slice(
    visiblePage * ITEMS_PER_PAGE,
    (visiblePage + 1) * ITEMS_PER_PAGE,
  );
  const visibleStoreIds = visibleLojas.flatMap((loja) =>
    loja.id === undefined ? [] : [loja.id],
  );
  const areAllVisibleSelected =
    visibleStoreIds.length > 0 &&
    visibleStoreIds.every((storeId) => selectedStoreIds.has(storeId));

  function updateFilters(action: () => void) {
    setPage(0);
    action();
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const payload = toRequest(form);

      if (editingStoreId) {
        await updateLoja(editingStoreId, payload);

        const mediaUpdates: Promise<Loja>[] = [];

        if (image) {
          mediaUpdates.push(replaceLojaImage(editingStoreId, image));
        }

        if (logo) {
          mediaUpdates.push(replaceLojaLogo(editingStoreId, logo));
        }

        if (mediaUpdates.length > 0) {
          await Promise.all(mediaUpdates);
          setMediaVersion((current) => current + 1);
        }

        resetForm();
        await loadLojas(true);
        setMessage('Loja atualizada com sucesso.');
      } else {
        if (!image) {
          throw new Error('Selecione a imagem principal da loja.');
        }

        await createLoja(payload, image, logo ?? undefined);
        resetForm();
        setPage(0);
        await loadLojas(true);
        setMessage('Loja criada com sucesso.');
      }
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function startEditing(loja: Loja) {
    if (!loja.id) {
      return;
    }

    setActionId(`edit-${loja.id}`);
    setMessage(null);

    try {
      const detail = await getLoja(loja.id);
      setEditingStoreId(loja.id);
      setForm(toFormState(detail));
      setImageFile(null);
      setLogoFile(null);
      setIsEditorOpen(true);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  function setImageFile(file: File | null) {
    revokePreview(imagePreviewRef);
    const previewUrl = file ? URL.createObjectURL(file) : null;
    imagePreviewRef.current = previewUrl;
    setImage(file);
    setImagePreviewUrl(previewUrl);
  }

  function setLogoFile(file: File | null) {
    revokePreview(logoPreviewRef);
    const previewUrl = file ? URL.createObjectURL(file) : null;
    logoPreviewRef.current = previewUrl;
    setLogo(file);
    setLogoPreviewUrl(previewUrl);
  }

  function resetForm() {
    setEditingStoreId(null);
    setForm(initialFormState);
    setImageFile(null);
    setLogoFile(null);
    setIsEditorOpen(false);
    formRef.current?.reset();
  }

  function openCreateStore() {
    resetForm();
    setMessage(null);
    setIsEditorOpen(true);
  }

  function toggleVisibleStores() {
    setSelectedStoreIds((current) => {
      const next = new Set(current);

      visibleStoreIds.forEach((storeId) => {
        if (areAllVisibleSelected) {
          next.delete(storeId);
        } else {
          next.add(storeId);
        }
      });

      return next;
    });
  }

  function toggleStore(storeId: number) {
    setSelectedStoreIds((current) => {
      const next = new Set(current);

      if (next.has(storeId)) {
        next.delete(storeId);
      } else {
        next.add(storeId);
      }

      return next;
    });
  }

  async function handleDeactivate(loja: Loja) {
    if (!loja.id || !window.confirm(`Desativar a loja ${loja.nome ?? loja.id}?`)) {
      return;
    }

    setActionId(`deactivate-${loja.id}`);
    setMessage(null);

    try {
      await deactivateLoja(loja.id);
      await loadLojas(true);
      setMessage('Loja desativada com sucesso.');
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
          <h1>Visão geral</h1>
          <p>Resumo de operações e performance do programa de fidelidade</p>
        </div>

        <button className={styles.inviteButton} onClick={openCreateStore} type="button">
          <FilePlus2 aria-hidden size={17} strokeWidth={1.7} />
          Convidar loja
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
          <div aria-label="Filtrar lojas por estado" className={styles.statusTabs}>
            {(
              [
                ['all', 'Todos'],
                ['ATIVA', 'Ativos'],
                ['PENDENTE', 'Pendentes'],
                ['INATIVA', 'Inativos'],
              ] as const
            ).map(([value, label]) => (
              <button
                aria-pressed={statusFilter === value}
                className={statusFilter === value ? styles.statusTabActive : styles.statusTab}
                key={value}
                onClick={() => updateFilters(() => setStatusFilter(value))}
                type="button"
              >
                {label}
                {value === 'PENDENTE' ? <span aria-hidden className={styles.pendingDot} /> : null}
              </button>
            ))}
          </div>

          <label className={styles.searchField}>
            <Search aria-hidden size={14} strokeWidth={1.7} />
            <input
              aria-label="Pesquisar lojas"
              onChange={(event) => updateFilters(() => setQuery(event.target.value))}
              placeholder="Pesquisar"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className={styles.tableScroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.checkboxColumn}>
                  <input
                    aria-label="Selecionar lojas desta página"
                    checked={areAllVisibleSelected}
                    disabled={visibleStoreIds.length === 0}
                    onChange={toggleVisibleStores}
                    type="checkbox"
                  />
                </th>
                <th>Loja</th>
                <th>Localização</th>
                <th>Status</th>
                <th>Descrição</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {visibleLojas.length > 0 ? (
                visibleLojas.map((loja) => (
                  <tr
                    className={loja.id && selectedStoreIds.has(loja.id) ? styles.selectedRow : undefined}
                    key={loja.id ?? loja.nome}
                  >
                    <td className={styles.checkboxColumn}>
                      <input
                        aria-label={`Selecionar ${loja.nome ?? 'loja'}`}
                        checked={loja.id ? selectedStoreIds.has(loja.id) : false}
                        disabled={!loja.id}
                        onChange={() => loja.id && toggleStore(loja.id)}
                        type="checkbox"
                      />
                    </td>
                    <td>
                      <span className={styles.storeIdentity}>
                        <StoreImage
                          id={loja.id}
                          kind="logo"
                          name={loja.nome}
                          version={mediaVersion}
                        />
                        <span>
                          <strong>{loja.nome ?? 'Loja sem nome'}</strong>
                          <small>{loja.categoria ?? 'Sem categoria'}</small>
                        </span>
                      </span>
                    </td>
                    <td>{formatFloor(loja.piso)}</td>
                    <td>
                      <span className={getStatusClassName(loja.estado)}>
                        {formatStatus(loja.estado)}
                      </span>
                    </td>
                    <td>
                      <p className={styles.description} title={loja.descricao}>
                        {loja.descricao || 'Sem descrição registada.'}
                      </p>
                    </td>
                    <td>
                      <span className={styles.actions}>
                        <button
                          disabled={!loja.id || actionId === `edit-${loja.id}`}
                          onClick={() => void startEditing(loja)}
                          type="button"
                        >
                          <Pencil aria-hidden size={12} />
                          Editar
                        </button>
                        <button
                          className={styles.dangerAction}
                          disabled={!loja.id || actionId === `deactivate-${loja.id}`}
                          onClick={() => void handleDeactivate(loja)}
                          title="Desativar loja"
                          type="button"
                        >
                          <Ban aria-hidden size={12} />
                          Eliminar
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td className={styles.emptyState} colSpan={6}>
                    {isLoading ? 'A carregar lojas...' : 'Nenhuma loja corresponde aos filtros.'}
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
            totalItems={filteredLojas.length}
            totalPages={totalPages}
          />
        </div>
      </section>

      {isEditorOpen ? (
        <div
          className={styles.modalBackdrop}
          onMouseDown={(event) => {
            if (event.currentTarget === event.target && !isSubmitting) {
              resetForm();
            }
          }}
          role="presentation"
        >
          <article
            aria-labelledby="store-editor-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <header className={styles.modalHeader}>
              <span className={styles.modalTitleIcon}>
                {editingStoreId ? <Building2 aria-hidden size={19} /> : <Store aria-hidden size={19} />}
              </span>
              <div>
                <h2 id="store-editor-title">
                  {editingStoreId ? 'Editar loja' : 'Convidar loja'}
                </h2>
                <p>{editingStoreId ? `Registo #${editingStoreId}` : 'Novo registo comercial'}</p>
              </div>
              <button
                aria-label="Fechar formulário"
                className={styles.closeButton}
                disabled={isSubmitting}
                onClick={resetForm}
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
              <div className="store-media-preview">
                <figure>
                  <StoreImage
                    id={editingStoreId ?? undefined}
                    kind="image"
                    name={form.nome}
                    previewUrl={imagePreviewUrl}
                    size="form"
                    version={mediaVersion}
                  />
                  <figcaption>Imagem principal</figcaption>
                </figure>
                <figure>
                  <StoreImage
                    id={editingStoreId ?? undefined}
                    kind="logo"
                    name={form.nome}
                    previewUrl={logoPreviewUrl}
                    size="form"
                    version={mediaVersion}
                  />
                  <figcaption>Logotipo</figcaption>
                </figure>
              </div>

              <form className="admin-form" onSubmit={handleSubmit} ref={formRef}>
            <div className="form-section-heading">Identificação</div>

            <label>
              Nome comercial
              <input
                maxLength={200}
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                required
                value={form.nome}
              />
            </label>

            <label>
              Razão social
              <input
                maxLength={200}
                onChange={(event) => setForm({ ...form, razaoSocial: event.target.value })}
                value={form.razaoSocial}
              />
            </label>

            <div className="form-row">
              <label>
                NIF
                <input
                  inputMode="numeric"
                  maxLength={15}
                  onChange={(event) =>
                    setForm({ ...form, nif: event.target.value.replace(/\D/g, '') })
                  }
                  pattern="[0-9]{9,15}"
                  placeholder="9 a 15 digitos"
                  value={form.nif}
                />
              </label>

              <label>
                Categoria
                <input
                  list="store-categories"
                  maxLength={120}
                  onChange={(event) => setForm({ ...form, categoria: event.target.value })}
                  required
                  value={form.categoria}
                />
                <datalist id="store-categories">
                  {categoryOptions.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </label>
            </div>

            <div className="form-row">
              <label>
                Piso
                <select
                  onChange={(event) =>
                    setForm({ ...form, piso: event.target.value as LojaFloor })
                  }
                  value={form.piso}
                >
                  {floorOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Horário
                <input
                  maxLength={120}
                  onChange={(event) => setForm({ ...form, horario: event.target.value })}
                  placeholder="08:00 - 22:00"
                  required
                  value={form.horario}
                />
              </label>
            </div>

            <div className="form-section-heading">Contacto</div>

            <div className="form-row">
              <label>
                Telefone
                <input
                  maxLength={30}
                  onChange={(event) => setForm({ ...form, telefone: event.target.value })}
                  required
                  value={form.telefone}
                />
              </label>

              <label>
                Email
                <input
                  maxLength={150}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  type="email"
                  value={form.email}
                />
              </label>
            </div>

            <label>
              Endereço
              <input
                maxLength={500}
                onChange={(event) => setForm({ ...form, endereco: event.target.value })}
                value={form.endereco}
              />
            </label>

            <label>
              Descrição
              <textarea
                maxLength={1000}
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                rows={4}
                value={form.descricao}
              />
            </label>

            <div className="form-section-heading">Presença digital</div>

            <label>
              Instagram
              <input
                maxLength={500}
                onChange={(event) => setForm({ ...form, instagramUrl: event.target.value })}
                placeholder="https://instagram.com/..."
                type="url"
                value={form.instagramUrl}
              />
            </label>

            <label>
              Facebook
              <input
                maxLength={500}
                onChange={(event) => setForm({ ...form, facebookUrl: event.target.value })}
                placeholder="https://facebook.com/..."
                type="url"
                value={form.facebookUrl}
              />
            </label>

            <label>
              Site ou fonte
              <input
                maxLength={500}
                onChange={(event) => setForm({ ...form, sourceUrl: event.target.value })}
                placeholder="https://..."
                type="url"
                value={form.sourceUrl}
              />
            </label>

            <div className="form-section-heading">Imagens</div>

            <label>
              {editingStoreId ? 'Substituir imagem principal' : 'Imagem principal'}
              <input
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                required={!editingStoreId}
                type="file"
              />
              <span className="form-hint">
                {image?.name ??
                  (editingStoreId ? 'Mantenha vazio para preservar a imagem atual.' : '')}
              </span>
            </label>

            <label>
              {editingStoreId ? 'Substituir logotipo' : 'Logotipo'}
              <input
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setLogoFile(event.target.files?.[0] ?? null)}
                type="file"
              />
              <span className="form-hint">
                {logo?.name ??
                  (editingStoreId ? 'Mantenha vazio para preservar o logotipo atual.' : 'Opcional.')}
              </span>
            </label>

            <div className="form-actions">
              <button className="primary-button" disabled={isSubmitting} type="submit">
                {editingStoreId ? <Save aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
                {isSubmitting
                  ? 'A guardar...'
                  : editingStoreId
                    ? 'Guardar alterações'
                    : 'Criar loja'}
              </button>

              {editingStoreId ? (
                <button className="ghost-button" onClick={resetForm} type="button">
                  <X aria-hidden size={16} />
                  Cancelar
                </button>
              ) : null}
            </div>
              </form>
            </div>
          </article>
        </div>
      ) : null}
    </div>
  );
}

function toFormState(loja: Loja): FormState {
  return {
    categoria: loja.categoria ?? '',
    descricao: loja.descricao ?? '',
    email: loja.email ?? '',
    endereco: loja.endereco ?? '',
    facebookUrl: loja.facebookUrl ?? '',
    horario: loja.horario ?? '',
    instagramUrl: loja.instagramUrl ?? '',
    nif: loja.nif ?? '',
    nome: loja.nome ?? '',
    piso: loja.piso ?? 'GROUND_FLOOR',
    razaoSocial: loja.razaoSocial ?? '',
    sourceUrl: loja.sourceUrl ?? '',
    telefone: loja.telefone ?? '',
  };
}

function toRequest(form: FormState): LojaRequest {
  return {
    categoria: form.categoria.trim(),
    descricao: form.descricao.trim() || undefined,
    email: form.email.trim() || undefined,
    endereco: form.endereco.trim() || undefined,
    facebookUrl: form.facebookUrl.trim() || undefined,
    horario: form.horario.trim(),
    instagramUrl: form.instagramUrl.trim() || undefined,
    nif: form.nif.trim() || undefined,
    nome: form.nome.trim(),
    piso: form.piso,
    razaoSocial: form.razaoSocial.trim() || undefined,
    sourceUrl: form.sourceUrl.trim() || undefined,
    telefone: form.telefone.trim(),
  };
}

function formatFloor(floor: LojaFloor | undefined) {
  return floorOptions.find((option) => option.value === floor)?.label ?? '-';
}

function formatStatus(status: Loja['estado']) {
  if (status === 'ATIVA') {
    return 'Ativo';
  }

  if (status === 'PENDENTE') {
    return 'Pendente';
  }

  if (status === 'INATIVA') {
    return 'Inativo';
  }

  return 'Sem estado';
}

function getStatusClassName(status: Loja['estado']) {
  if (status === 'ATIVA') {
    return `${styles.statusBadge} ${styles.statusBadgeActive}`;
  }

  if (status === 'PENDENTE') {
    return `${styles.statusBadge} ${styles.statusBadgePending}`;
  }

  return `${styles.statusBadge} ${styles.statusBadgeInactive}`;
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt')
    .trim();
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

  return 'Nao foi possivel carregar as lojas.';
}
