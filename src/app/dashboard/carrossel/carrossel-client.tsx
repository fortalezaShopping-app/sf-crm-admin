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
  ExternalLink,
  Images,
  Pencil,
  Plus,
  Save,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { CarouselImage } from '@/components/admin/CarouselImage';
import { Pagination } from '@/components/admin/Pagination';
import {
  ApiError,
  clearAdminApiCache,
  createCarouselSlide,
  deleteCarouselSlide,
  getCarouselSlide,
  getCarouselSlideImagePath,
  listAllCarouselSlides,
  updateCarouselSlide,
  type CarouselSlide,
} from '@/lib/api';

import styles from './carrossel.module.css';

const ITEMS_PER_PAGE = 6;

export function CarrosselClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingSlideId, setEditingSlideId] = useState<number | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [imageVersion, setImageVersion] = useState(0);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const [title, setTitle] = useState('');
  const imagePreviewRef = useRef<string | null>(null);

  const loadSlides = useCallback(async (bypassCache = false) => {
    setIsLoading(true);

    try {
      if (bypassCache) {
        clearAdminApiCache();
      }

      const result = await listAllCarouselSlides();
      setSlides(
        [...result].sort((left, right) =>
          (right.updatedAt ?? right.createdAt ?? '').localeCompare(
            left.updatedAt ?? left.createdAt ?? '',
          ),
        ),
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setImageFile = useCallback((file: File | null) => {
    if (imagePreviewRef.current) {
      URL.revokeObjectURL(imagePreviewRef.current);
    }

    const previewUrl = file ? URL.createObjectURL(file) : null;
    imagePreviewRef.current = previewUrl;
    setImage(file);
    setImagePreviewUrl(previewUrl);
  }, []);

  const closeEditor = useCallback(() => {
    setEditingSlideId(null);
    setImageFile(null);
    setIsEditorOpen(false);
    setTitle('');
  }, [setImageFile]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadSlides(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadSlides]);

  useEffect(
    () => () => {
      if (imagePreviewRef.current) {
        URL.revokeObjectURL(imagePreviewRef.current);
      }
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

  const filteredSlides = useMemo(() => {
    const normalizedQuery = normalizeText(query);

    return slides.filter((slide) =>
      normalizeText(slide.title ?? '').includes(normalizedQuery),
    );
  }, [query, slides]);
  const totalPages = Math.max(1, Math.ceil(filteredSlides.length / ITEMS_PER_PAGE));
  const visiblePage = Math.min(page, totalPages - 1);
  const visibleSlides = filteredSlides.slice(
    visiblePage * ITEMS_PER_PAGE,
    (visiblePage + 1) * ITEMS_PER_PAGE,
  );

  function openCreateSlide() {
    setEditingSlideId(null);
    setImageFile(null);
    setMessage(null);
    setTitle('');
    setIsEditorOpen(true);
  }

  async function startEditing(slide: CarouselSlide) {
    if (!slide.id) {
      return;
    }

    setActionId(`edit-${slide.id}`);
    setMessage(null);

    try {
      const detail = await getCarouselSlide(slide.id);
      setEditingSlideId(slide.id);
      setImageFile(null);
      setTitle(detail.title ?? '');
      setIsEditorOpen(true);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedTitle = title.trim();

    if (!normalizedTitle) {
      setMessage('Indique um título para identificar o slide.');
      return;
    }

    if (!editingSlideId && !image) {
      setMessage('Selecione a imagem do carrossel.');
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      if (editingSlideId) {
        await updateCarouselSlide(
          editingSlideId,
          { title: normalizedTitle },
          image ?? undefined,
        );
      } else {
        await createCarouselSlide({ title: normalizedTitle }, image as File);
      }

      if (image) {
        setImageVersion((current) => current + 1);
      }

      closeEditor();
      setPage(0);
      await loadSlides(true);
      setMessage(
        editingSlideId
          ? 'Slide atualizado com sucesso.'
          : 'Slide publicado com sucesso.',
      );
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(slide: CarouselSlide) {
    if (!slide.id) {
      return;
    }

    if (!window.confirm(`Eliminar o slide “${slide.title ?? `#${slide.id}`}”?`)) {
      return;
    }

    setActionId(`delete-${slide.id}`);
    setMessage(null);

    try {
      await deleteCarouselSlide(slide.id);
      await loadSlides(true);
      setMessage('Slide eliminado com sucesso.');
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
          <h1>Carrossel da Home</h1>
          <p>Gira as imagens principais apresentadas no aplicativo mobile.</p>
        </div>
        <button className={styles.createButton} onClick={openCreateSlide} type="button">
          <Plus aria-hidden size={17} />
          Novo slide
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

      <section className={styles.contentCard}>
        <div className={styles.toolbar}>
          <div>
            <strong>{filteredSlides.length}</strong>
            <span>{filteredSlides.length === 1 ? ' slide publicado' : ' slides publicados'}</span>
          </div>
          <label className={styles.searchField}>
            <Search aria-hidden size={14} />
            <input
              aria-label="Pesquisar slides"
              onChange={(event) => {
                setPage(0);
                setQuery(event.target.value);
              }}
              placeholder="Pesquisar slides"
              type="search"
              value={query}
            />
          </label>
        </div>

        <div className={styles.slidesGrid}>
          {visibleSlides.length > 0 ? (
            visibleSlides.map((slide) => (
              <article className={styles.slideCard} key={slide.id ?? slide.title}>
                <CarouselImage
                  available={Boolean(slide.imageUrl)}
                  id={slide.id}
                  title={slide.title}
                  version={imageVersion}
                />
                <div className={styles.slideBody}>
                  <div>
                    <h2>{slide.title || 'Slide sem título'}</h2>
                    <p>Atualizado {formatDate(slide.updatedAt ?? slide.createdAt)}</p>
                  </div>
                  <div className={styles.actions}>
                    {slide.id && slide.imageUrl ? (
                      <a
                        aria-label={`Abrir imagem de ${slide.title ?? 'slide'}`}
                        href={getCarouselSlideImagePath(slide.id, imageVersion)}
                        rel="noreferrer"
                        target="_blank"
                        title="Abrir imagem"
                      >
                        <ExternalLink aria-hidden size={15} />
                      </a>
                    ) : null}
                    <button
                      aria-label={`Editar ${slide.title ?? 'slide'}`}
                      disabled={!slide.id || actionId === `edit-${slide.id}`}
                      onClick={() => void startEditing(slide)}
                      title="Editar slide"
                      type="button"
                    >
                      <Pencil aria-hidden size={15} />
                    </button>
                    <button
                      aria-label={`Eliminar ${slide.title ?? 'slide'}`}
                      className={styles.deleteAction}
                      disabled={!slide.id || actionId === `delete-${slide.id}`}
                      onClick={() => void handleDelete(slide)}
                      title="Eliminar slide"
                      type="button"
                    >
                      <Trash2 aria-hidden size={15} />
                    </button>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className={styles.emptyState}>
              <Images aria-hidden size={34} strokeWidth={1.4} />
              <strong>{isLoading ? 'A carregar carrossel...' : 'Ainda não existem slides'}</strong>
              {!isLoading ? <span>Publique a primeira imagem para a Home do aplicativo.</span> : null}
            </div>
          )}
        </div>

        <div className={styles.pagination}>
          <Pagination
            isLoading={isLoading}
            onPageChange={setPage}
            page={visiblePage}
            totalItems={filteredSlides.length}
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
            aria-labelledby="carousel-editor-title"
            aria-modal="true"
            className={styles.modal}
            role="dialog"
          >
            <header className={styles.modalHeader}>
              <span className={styles.modalTitleIcon}>
                <Images aria-hidden size={19} />
              </span>
              <div>
                <h2 id="carousel-editor-title">
                  {editingSlideId ? 'Editar slide' : 'Novo slide'}
                </h2>
                <p>Imagem principal da Home mobile</p>
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
              <CarouselImage
                available={Boolean(
                  editingSlideId &&
                    slides.find((slide) => slide.id === editingSlideId)?.imageUrl
                )}
                id={editingSlideId ?? undefined}
                previewUrl={imagePreviewUrl}
                size="form"
                title={title}
                version={imageVersion}
              />

              <form className={styles.form} onSubmit={handleSubmit}>
                <label>
                  Título interno
                  <input
                    maxLength={200}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ex.: Campanha de agosto"
                    required
                    value={title}
                  />
                </label>
                <label>
                  {editingSlideId ? 'Substituir imagem' : 'Imagem do carrossel'}
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setImageFile(event.target.files?.[0] ?? null)}
                    required={!editingSlideId}
                    type="file"
                  />
                  <span>
                    {image?.name ??
                      (editingSlideId
                        ? 'Mantenha vazio para preservar a imagem atual.'
                        : 'Use uma imagem vertical otimizada para mobile.')}
                  </span>
                </label>
                <div className={styles.formActions}>
                  <button className={styles.primaryButton} disabled={isSubmitting} type="submit">
                    {editingSlideId ? <Save aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
                    {isSubmitting ? 'A guardar...' : editingSlideId ? 'Guardar alterações' : 'Publicar slide'}
                  </button>
                  <button className={styles.secondaryButton} onClick={closeEditor} type="button">
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

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt');
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? '-'
    : new Intl.DateTimeFormat('pt-AO', { dateStyle: 'medium' }).format(date);
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Não foi possível carregar o carrossel.';
}
