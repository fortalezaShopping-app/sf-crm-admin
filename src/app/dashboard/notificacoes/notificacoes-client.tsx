'use client';

import { useEffect, useState, type FormEvent } from 'react';
import {
  Check,
  Megaphone,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  listAllLojas,
  clearAdminApiCache,
  listAllNotificacoes,
  marcarNotificacaoComoLida,
  type Loja,
  type Notificacao,
} from '@/lib/api';
import {
  listAllResources,
  listHighlights,
  saveHighlight,
  type Highlight,
} from '@/lib/admin-resources';
import { matchesSearchQuery } from '@/lib/admin-search';
import { formatAdminDate, matchesDateRange } from '@/lib/admin-models';
import {
  Avatar,
  EmptyState,
  Modal,
  Notice,
  Unavailable,
} from '@/components/admin/Workspace';
import { Pagination } from '@/components/admin/Pagination';
import { useAdminSearchQuery } from '@/components/admin/useAdminSearchQuery';
import { CampaignWizard } from './campaign-wizard';
import s from '@/components/admin/Workspace.module.css';

export function NotificacoesClient() {
  const [items, setItems] = useState<Notificacao[]>([]);
  const [highlights, setHighlights] = useState<Highlight[]>([]);
  const [stores, setStores] = useState<Loja[]>([]);
  const [error, setError] = useState('');
  const [contentError, setContentError] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingContent, setLoadingContent] = useState(true);
  const [version, setVersion] = useState(0);
  const [tab, setTab] = useState('campaigns');
  const [unread, setUnread] = useState(false);
  const [period, setPeriod] = useState('30');
  const [now, setNow] = useState(() => Date.now());
  const [range, setRange] = useState({ from: '', to: '' });
  const [page, setPage] = useState(0);
  const [contentPage, setContentPage] = useState(0);
  const [contentQuery, setContentQuery] = useState('');
  const [marking, setMarking] = useState<number>();
  const [wizard, setWizard] = useState(false);
  const [editor, setEditor] = useState<Highlight | 'new' | null>(null);
  const [message, setMessage] = useState('');
  const { query, deferredQuery, setQuery } = useAdminSearchQuery();
  useEffect(() => {
    let active = true;
    const timer = setInterval(() => setNow(Date.now()), 60000);
    listAllNotificacoes()
      .then((data) => {
        if (active) {
          setItems(data);
          setError('');
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    listAllResources(listHighlights)
      .then((data) => {
        if (active) {
          setHighlights(data);
          setContentError('');
        }
      })
      .catch((e: Error) => {
        if (active) setContentError(e.message);
      })
      .finally(() => {
        if (active) setLoadingContent(false);
      });
    listAllLojas()
      .then((data) => {
        if (active) setStores(data);
      })
      .catch(() => {});
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [version]);
  const filtered = items.filter(
    (n) =>
      (!unread || !n.lida) &&
      matchesSearchQuery(deferredQuery, [n.titulo, n.mensagem, n.tipo]) &&
      (period === 'all' ||
        (period === 'custom'
          ? matchesDateRange(n.createdAt, range.from, range.to)
          : !!n.createdAt &&
            Date.parse(n.createdAt) >= now - Number(period) * 86400000)),
  );
  const content = highlights.filter((h) =>
    matchesSearchQuery(contentQuery, [
      h.title,
      h.bodyText,
      h.storeName,
      h.status,
    ]),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 8));
  const contentPages = Math.max(1, Math.ceil(content.length / 10));
  const current = Math.min(page, pages - 1);
  const currentContent = Math.min(contentPage, contentPages - 1);
  async function markRead(item: Notificacao) {
    if (!item.id) return;
    setMarking(item.id);
    try {
      await marcarNotificacaoComoLida(item.id);
      setItems((all) =>
        all.map((n) => (n.id === item.id ? { ...n, lida: true } : n)),
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível marcar como lida.',
      );
    } finally {
      setMarking(undefined);
    }
  }
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>Notificações e campanhas</h1>
        <div className={s.actions}>
          <button className={s.secondary} onClick={() => setEditor('new')}>
            <Plus size={16} />
            Criar destaque
          </button>
          <button className={s.button} onClick={() => setWizard(true)}>
            <Megaphone size={16} />
            Criar campanha push
          </button>
        </div>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <div className={s.split}>
        <section className={s.stack} aria-label="Notificações recebidas">
          <div className={s.toolbar}>
            <div className={s.segments}>
              <button
                className={s.segment}
                aria-pressed={!unread}
                onClick={() => {
                  setUnread(false);
                  setPage(0);
                }}
              >
                Todas
              </button>
              <button
                className={s.segment}
                aria-pressed={unread}
                onClick={() => {
                  setUnread(true);
                  setPage(0);
                }}
              >
                Não lidas
              </button>
              <button
                className={s.segment}
                disabled
                title="A API não identifica o público destinatário"
              >
                Lojas
              </button>
              <button
                className={s.segment}
                disabled
                title="A API não identifica o público destinatário"
              >
                Utilizadores
              </button>
            </div>
            <select
              className={s.select}
              aria-label="Período das notificações"
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value);
                setPage(0);
              }}
            >
              <option value="all">Todo o período</option>
              <option value="1">Últimas 24 horas</option>
              <option value="7">7 dias</option>
              <option value="30">30 dias</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
          {period === 'custom' && (
            <div className={`${s.form} ${s.detailGrid}`}>
              <label>
                De
                <input
                  type="date"
                  value={range.from}
                  max={range.to || undefined}
                  onChange={(e) => {
                    setRange({ ...range, from: e.target.value });
                    setPage(0);
                  }}
                />
              </label>
              <label>
                Até
                <input
                  type="date"
                  value={range.to}
                  min={range.from || undefined}
                  onChange={(e) => {
                    setRange({ ...range, to: e.target.value });
                    setPage(0);
                  }}
                />
              </label>
            </div>
          )}
          <div className={s.toolbar}>
            <label className={s.search}>
              <Search size={16} />
              <input
                aria-label="Pesquisar notificações"
                placeholder="Pesquisar notificações"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <button
              className={s.iconButton}
              title="Atualizar notificações"
              aria-label="Atualizar notificações"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                clearAdminApiCache();
                setLoadingContent(true);
                setVersion((v) => v + 1);
              }}
            >
              <RefreshCw size={16} />
            </button>
          </div>
          <div className={s.panel} aria-busy={loading}>
            {loading ? (
              <EmptyState>A carregar notificações...</EmptyState>
            ) : !filtered.length ? (
              <EmptyState>Nenhuma notificação encontrada.</EmptyState>
            ) : (
              filtered.slice(current * 8, current * 8 + 8).map((n) => (
                <article className={s.notification} key={n.id}>
                  <Avatar name={n.titulo} />
                  <div>
                    <strong>{n.titulo || 'Notificação'}</strong>
                    <p>{n.mensagem}</p>
                    <time dateTime={n.createdAt}>
                      {formatAdminDate(n.createdAt, true)}
                    </time>
                  </div>
                  {!n.lida ? (
                    <button
                      className={s.unread}
                      title="Marcar como lida"
                      aria-label={`Marcar como lida: ${n.titulo}`}
                      disabled={marking === n.id}
                      onClick={() => markRead(n)}
                    />
                  ) : (
                    <Check size={16} aria-label="Lida" />
                  )}
                </article>
              ))
            )}
            <Pagination
              page={current}
              totalPages={pages}
              totalItems={filtered.length}
              onPageChange={setPage}
            />
          </div>
        </section>
        <section className={s.panel} aria-label="Campanhas e destaques">
          <div className={s.panelHeader}>
            <div className={s.segments}>
              <button
                className={s.segment}
                aria-pressed={tab === 'campaigns'}
                onClick={() => setTab('campaigns')}
              >
                Campanhas
              </button>
              <button
                className={s.segment}
                aria-pressed={tab === 'highlights'}
                onClick={() => setTab('highlights')}
              >
                Destaques
              </button>
            </div>
          </div>
          {tab === 'campaigns' ? (
            <div className={`${s.padding} ${s.stack}`}>
              <Unavailable>Consulta e gestão de campanhas push</Unavailable>
              <EmptyState>
                As campanhas ficarão disponíveis após a integração do serviço de
                envio.
              </EmptyState>
            </div>
          ) : (
            <>
              <div className={s.panelHeader}>
                <label className={s.search}>
                  <Search size={16} />
                  <input
                    aria-label="Pesquisar destaques"
                    placeholder="Pesquisar destaques"
                    value={contentQuery}
                    onChange={(e) => {
                      setContentQuery(e.target.value);
                      setContentPage(0);
                    }}
                  />
                </label>
              </div>
              {contentError && (
                <div className={s.padding}>
                  <Notice tone="error">{contentError}</Notice>
                </div>
              )}
              {loadingContent ? (
                <EmptyState>A carregar destaques...</EmptyState>
              ) : !content.length ? (
                <EmptyState>Nenhum destaque encontrado.</EmptyState>
              ) : (
                <div className={s.tableScroll}>
                  <table className={s.table}>
                    <thead>
                      <tr>
                        <th>Título</th>
                        <th>Data</th>
                        <th>Estado</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {content
                        .slice(currentContent * 10, currentContent * 10 + 10)
                        .map((h) => (
                          <tr key={h.id}>
                            <td>
                              {h.title}
                              <small className={s.muted}>
                                {h.storeName ? ` · ${h.storeName}` : ''}
                              </small>
                            </td>
                            <td>
                              {formatAdminDate(h.publishedAt ?? h.createdAt)}
                            </td>
                            <td>
                              <span className={s.badge}>
                                {h.status || 'Indisponível'}
                              </span>
                            </td>
                            <td>
                              <button
                                className={s.iconButton}
                                title={`Editar ${h.title}`}
                                aria-label={`Editar ${h.title}`}
                                onClick={() => setEditor(h)}
                              >
                                <Pencil size={15} />
                              </button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                page={currentContent}
                totalPages={contentPages}
                totalItems={content.length}
                onPageChange={setContentPage}
              />
            </>
          )}
        </section>
      </div>
      {wizard && (
        <CampaignWizard stores={stores} onClose={() => setWizard(false)} />
      )}
      {editor && (
        <HighlightEditor
          highlight={editor === 'new' ? undefined : editor}
          statuses={[
            ...new Set(
              highlights.map((h) => h.status).filter((v): v is string => !!v),
            ),
          ]}
          stores={stores}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setTab('highlights');
            setLoadingContent(true);
            setVersion((v) => v + 1);
            setMessage('Destaque guardado.');
          }}
        />
      )}
    </div>
  );
}

function HighlightEditor({
  highlight,
  statuses,
  stores,
  onClose,
  onSaved,
}: {
  highlight?: Highlight;
  statuses: string[];
  stores: Loja[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    title: highlight?.title ?? '',
    bodyText: highlight?.bodyText ?? '',
    status: highlight?.status ?? '',
    storeId: highlight?.storeId ? String(highlight.storeId) : '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!form.title.trim()) throw new Error('Indique um título.');
      await saveHighlight(
        { ...form, title: form.title.trim(), storeId: Number(form.storeId) },
        highlight?.id,
      );
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível guardar.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={highlight ? 'Editar destaque' : 'Criar destaque'}
      busy={busy}
      onClose={onClose}
    >
      <form className={s.form} onSubmit={submit}>
        <label>
          Título
          <input
            required
            maxLength={200}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label>
          Mensagem
          <textarea
            rows={4}
            maxLength={10000}
            value={form.bodyText}
            onChange={(e) => setForm({ ...form, bodyText: e.target.value })}
          />
        </label>
        <label>
          Loja
          <select
            required
            value={form.storeId}
            onChange={(e) => setForm({ ...form, storeId: e.target.value })}
          >
            <option value="">Selecionar loja</option>
            {stores.map((store) => (
              <option key={store.id} value={store.id}>
                {store.nome}
              </option>
            ))}
          </select>
        </label>
        <label>
          Estado
          <input
            required
            list="content-statuses"
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          />
          <datalist id="content-statuses">
            {statuses.map((status) => (
              <option key={status} value={status} />
            ))}
          </datalist>
        </label>
        <Notice>
          Os estados aceites não estão enumerados no contrato. Confirme o valor
          com a equipa responsável antes de publicar.
        </Notice>
        {error && <Notice tone="error">{error}</Notice>}
        <div className={s.footer}>
          <button
            className={s.secondary}
            type="button"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className={s.button} disabled={busy}>
            {busy ? 'A guardar...' : 'Guardar destaque'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
