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
  Pencil,
  Plus,
  RefreshCcw,
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

type StatusFilter = 'all' | 'ATIVA' | 'INATIVA';
type FloorFilter = 'all' | LojaFloor;

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
  { label: 'Res do chao', value: 'GROUND_FLOOR' },
  { label: 'Piso 1', value: 'FLOOR_1' },
  { label: 'Piso 2', value: 'FLOOR_2' },
  { label: 'Pisos 2 e 4', value: 'FLOORS_2_AND_4' },
  { label: 'Piso 3', value: 'FLOOR_3' },
  { label: 'Piso 4', value: 'FLOOR_4' },
  { label: 'Terraco do piso 4', value: 'FLOOR_4_TERRACE' },
];

export function LojasClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [editingStoreId, setEditingStoreId] = useState<number | null>(null);
  const [floorFilter, setFloorFilter] = useState<FloorFilter>('all');
  const [form, setForm] = useState<FormState>(initialFormState);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [mediaVersion, setMediaVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
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
        (categoryFilter === 'all' || loja.categoria === categoryFilter) &&
        (floorFilter === 'all' || loja.piso === floorFilter) &&
        (statusFilter === 'all' || loja.estado === statusFilter)
      );
    });
  }, [categoryFilter, floorFilter, lojas, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredLojas.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(page, totalPages - 1);
  const visibleLojas = filteredLojas.slice(
    visiblePage * ITEMS_PER_PAGE,
    (visiblePage + 1) * ITEMS_PER_PAGE,
  );

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
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
    formRef.current?.reset();
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

  async function refreshStores() {
    setMessage(null);
    await loadLojas(true);
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Diretorio comercial</p>
          <h1>Lojas</h1>
          <p>Registe e mantenha o catalogo apresentado no aplicativo.</p>
        </div>

        <button
          className="ghost-button"
          disabled={isLoading}
          onClick={() => void refreshStores()}
          type="button"
        >
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="management-grid management-grid--stores">
        <article className="panel">
          <div className="panel-header">
            <div>
              <h2>Lojas registadas</h2>
              <p className="panel-subtitle">{filteredLojas.length} de {lojas.length} lojas</p>
            </div>
            <span className="count-pill">{lojas.length}</span>
          </div>

          <div className="store-filters">
            <label className="store-search">
              <Search aria-hidden size={16} />
              <input
                aria-label="Pesquisar lojas"
                onChange={(event) =>
                  updateFilters(() => setQuery(event.target.value))
                }
                placeholder="Pesquisar por nome, NIF ou contacto"
                type="search"
                value={query}
              />
            </label>

            <select
              aria-label="Filtrar por categoria"
              onChange={(event) =>
                updateFilters(() => setCategoryFilter(event.target.value))
              }
              value={categoryFilter}
            >
              <option value="all">Todas as categorias</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por piso"
              onChange={(event) =>
                updateFilters(() => setFloorFilter(event.target.value as FloorFilter))
              }
              value={floorFilter}
            >
              <option value="all">Todos os pisos</option>
              {floorOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <select
              aria-label="Filtrar por estado"
              onChange={(event) =>
                updateFilters(() => setStatusFilter(event.target.value as StatusFilter))
              }
              value={statusFilter}
            >
              <option value="all">Todos os estados</option>
              <option value="ATIVA">Ativas</option>
              <option value="INATIVA">Inativas</option>
            </select>
          </div>

          <div className="table-scroll">
            <table className="admin-table stores-table">
              <thead>
                <tr>
                  <th>Loja</th>
                  <th>Imagem</th>
                  <th>Categoria</th>
                  <th>Piso</th>
                  <th>Estado</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {visibleLojas.length > 0 ? (
                  visibleLojas.map((loja) => (
                    <tr key={loja.id ?? loja.nome}>
                      <td>
                        <span className="store-cell">
                          <StoreImage
                            id={loja.id}
                            kind="logo"
                            name={loja.nome}
                            version={mediaVersion}
                          />
                          <span className="table-title">
                            <strong>{loja.nome ?? 'Loja sem nome'}</strong>
                            <span>{loja.nif ? `NIF ${loja.nif}` : loja.telefone ?? 'Sem NIF'}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <StoreImage
                          id={loja.id}
                          kind="image"
                          name={loja.nome}
                          version={mediaVersion}
                        />
                      </td>
                      <td>{loja.categoria ?? '-'}</td>
                      <td>{formatFloor(loja.piso)}</td>
                      <td>
                        <span
                          className={
                            loja.estado === 'ATIVA'
                              ? 'badge badge--success'
                              : 'badge badge--warning'
                          }
                        >
                          {loja.estado ?? 'Sem estado'}
                        </span>
                      </td>
                      <td>
                        <span className="table-actions">
                          <button
                            aria-label={`Editar ${loja.nome ?? 'loja'}`}
                            className="table-action"
                            disabled={!loja.id || actionId === `edit-${loja.id}`}
                            onClick={() => void startEditing(loja)}
                            title="Editar loja"
                            type="button"
                          >
                            <Pencil aria-hidden size={15} />
                            <span>Editar</span>
                          </button>
                          <button
                            aria-label={`Desativar ${loja.nome ?? 'loja'}`}
                            className="table-action table-action--danger"
                            disabled={!loja.id || actionId === `deactivate-${loja.id}`}
                            onClick={() => void handleDeactivate(loja)}
                            title="Desativar loja"
                            type="button"
                          >
                            <Ban aria-hidden size={15} />
                            <span>Desativar</span>
                          </button>
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6}>
                      {isLoading
                        ? 'A carregar lojas...'
                        : 'Nenhuma loja corresponde aos filtros.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            isLoading={isLoading}
            onPageChange={setPage}
            page={visiblePage}
            totalItems={filteredLojas.length}
            totalPages={totalPages}
          />
        </article>

        <article className="panel store-editor">
          <div className="panel-header">
            <div>
              <h2>{editingStoreId ? 'Editar loja' : 'Nova loja'}</h2>
              <p className="panel-subtitle">
                {editingStoreId ? `Registo #${editingStoreId}` : 'Novo registo comercial'}
              </p>
            </div>
            {editingStoreId ? <Building2 aria-hidden size={18} /> : <Store aria-hidden size={18} />}
          </div>

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
            <div className="form-section-heading">Identificacao</div>

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
              Razao social
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
                Horario
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
              Endereco
              <input
                maxLength={500}
                onChange={(event) => setForm({ ...form, endereco: event.target.value })}
                value={form.endereco}
              />
            </label>

            <label>
              Descricao
              <textarea
                maxLength={1000}
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                rows={4}
                value={form.descricao}
              />
            </label>

            <div className="form-section-heading">Presenca digital</div>

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
                    ? 'Guardar alteracoes'
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
        </article>
      </section>
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

function getMessageClassName(message: string) {
  return message.includes('sucesso') ? 'form-success' : 'form-error';
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar as lojas.';
}
