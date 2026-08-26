'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { Check, Search, Send } from 'lucide-react';

import { useAdminSearchQuery } from '@/components/admin/useAdminSearchQuery';
import { matchesSearchQuery } from '@/lib/admin-search';

import {
  ApiError,
  listAllLojas,
  listAllNotificacoes,
  marcarNotificacaoComoLida,
  type Loja,
  type Notificacao,
} from '@/lib/api';

import styles from './notificacoes.module.css';

type ReadFilter = 'all' | 'unread';
type Period = 'today' | '7d' | '30d' | 'custom';

const periodOptions: Array<{ label: string; value: Period }> = [
  { label: 'Hoje', value: 'today' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: 'Personalizado', value: 'custom' },
];

export function NotificacoesClient() {
  const [category, setCategory] = useState('');
  const [composerMessage, setComposerMessage] = useState('');
  const [composerNotice, setComposerNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [markingId, setMarkingId] = useState<number | null>(null);
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [period, setPeriod] = useState<Period>('7d');
  const { deferredQuery, query, setQuery } = useAdminSearchQuery();
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sendToAllStores, setSendToAllStores] = useState(true);

  async function loadNotifications() {
    setIsLoading(true);
    setError(null);

    try {
      const result = await listAllNotificacoes();
      setNotifications(result);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isActive = true;

    void listAllNotificacoes()
      .then((result) => {
        if (isActive) {
          setNotifications(result);
        }
      })
      .catch((requestError: unknown) => {
        if (isActive) {
          setError(getErrorMessage(requestError));
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    void listAllLojas()
      .then((items) => {
        if (isActive) {
          setLojas(items);
        }
      })
      .catch(() => {
        if (isActive) {
          setLojas([]);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  const categories = useMemo(
    () =>
      [
        ...new Set(
          lojas
            .map((loja) => loja.categoria)
            .filter((value): value is string => Boolean(value)),
        ),
      ].sort((first, second) => first.localeCompare(second, 'pt')),
    [lojas],
  );

  const selectedStores = useMemo(() => {
    return lojas.filter((loja) => {
      const matchesSearch = matchesSearchQuery(searchTerm, [
        loja.nome,
        loja.razaoSocial,
        loja.nif,
        loja.categoria,
        loja.piso,
        loja.email,
        loja.telefone,
        loja.estado,
      ]);
      const matchesCategory = !category || loja.categoria === category;

      return matchesSearch && matchesCategory;
    });
  }, [category, lojas, searchTerm]);

  const visibleNotifications = useMemo(
    () =>
      notifications.filter((notification) => {
        const matchesReadFilter = readFilter === 'all' || !notification.lida;
        const matchesQuery = matchesSearchQuery(deferredQuery, [
          notification.id,
          notification.titulo,
          notification.mensagem,
          notification.tipo,
          notification.createdAt,
          notification.lida ? 'lida' : 'nao lida',
        ]);

        return (
          matchesReadFilter &&
          matchesPeriod(notification.createdAt, period) &&
          matchesQuery
        );
      }),
    [deferredQuery, notifications, period, readFilter],
  );

  async function handleMarkAsRead(notification: Notificacao) {
    if (notification.lida || !notification.id) {
      return;
    }

    setMarkingId(notification.id);
    setError(null);

    try {
      const updated = await marcarNotificacaoComoLida(notification.id);
      setNotifications((current) =>
        current.map((item) =>
          item.id === notification.id ? { ...item, ...updated, lida: true } : item,
        ),
      );
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setMarkingId(null);
    }
  }

  function handleSend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!composerMessage.trim()) {
      setComposerNotice('Escreva a mensagem da notificação antes de continuar.');
      return;
    }

    setComposerNotice(
      'A API ainda não disponibiliza o envio administrativo de notificações. A seleção ficou pronta para esta integração.',
    );
  }

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div>
          <h1>Notificações</h1>
          <p>Acompanhe avisos do programa e prepare comunicações para as lojas.</p>
        </div>

        <div className={styles.adminIdentity} aria-label="Sessão administrativa">
          <span>Admin</span>
          <i aria-hidden>A</i>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div aria-label="Estado das notificações" className={styles.filterTabs} role="group">
          <button
            aria-pressed={readFilter === 'all'}
            className={readFilter === 'all' ? styles.filterActive : styles.filterTab}
            onClick={() => setReadFilter('all')}
            type="button"
          >
            Todas
          </button>
          <button
            aria-pressed={readFilter === 'unread'}
            className={readFilter === 'unread' ? styles.filterActive : styles.filterTab}
            onClick={() => setReadFilter('unread')}
            type="button"
          >
            Não lidas
          </button>
        </div>

        <div aria-label="Período das notificações" className={styles.periodTabs} role="group">
          {periodOptions.map((option) => (
            <button
              aria-pressed={period === option.value}
              className={period === option.value ? styles.periodActive : styles.periodTab}
              key={option.value}
              onClick={() => setPeriod(option.value)}
              type="button"
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p className={styles.errorNotice} role="alert">
          {error}
        </p>
      ) : null}

      <div className={styles.contentGrid}>
        <section aria-label="Lista de notificações" className={styles.notificationCard}>
          <div className={styles.listHeader}>
            <span className={styles.listTitle}>
              {readFilter === 'unread' ? 'Não lidas' : 'Todas as notificações'}
              <small>{visibleNotifications.length}</small>
            </span>
            <label className={styles.listSearch}>
              <Search aria-hidden size={14} strokeWidth={1.7} />
              <input
                aria-label="Pesquisar notificações"
                autoComplete="off"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Titulo ou mensagem"
                spellCheck={false}
                type="search"
                value={query}
              />
            </label>
            <button onClick={() => void loadNotifications()} type="button">
              Atualizar
            </button>
          </div>

          <div className={styles.notificationList}>
            {isLoading ? (
              <p className={styles.emptyState}>A carregar notificações...</p>
            ) : visibleNotifications.length ? (
              visibleNotifications.map((notification) => (
                <article
                  className={notification.lida ? styles.notificationRead : styles.notification}
                  key={notification.id ?? `${notification.titulo}-${notification.createdAt}`}
                >
                  <span className={styles.notificationAvatar} aria-hidden />
                  <div className={styles.notificationCopy}>
                    <strong>{notification.titulo || 'Nova notificação'}</strong>
                    <p>{notification.mensagem || 'Sem detalhe adicional.'}</p>
                    <time dateTime={notification.createdAt}>
                      {formatNotificationDate(notification.createdAt)}
                    </time>
                  </div>
                  {notification.lida ? (
                    <Check
                      aria-label="Notificação lida"
                      className={styles.readIcon}
                      size={15}
                      strokeWidth={2}
                    />
                  ) : (
                    <button
                      aria-label={`Marcar ${notification.titulo || 'notificação'} como lida`}
                      className={styles.unreadButton}
                      disabled={markingId === notification.id}
                      onClick={() => void handleMarkAsRead(notification)}
                      title="Marcar como lida"
                      type="button"
                    />
                  )}
                </article>
              ))
            ) : (
              <p
                className={
                  query.trim()
                    ? `${styles.emptyState} ${styles.searchEmptyState}`
                    : styles.emptyState
                }
              >
                {query.trim()
                  ? 'Nenhuma notificação corresponde à pesquisa.'
                  : 'Não existem notificações neste período.'}
              </p>
            )}
          </div>
        </section>

        <aside className={styles.composerCard}>
          <div>
            <h2>Envio de notificações</h2>
            <p>para lojas</p>
          </div>

          <form className={styles.composerForm} onSubmit={handleSend}>
            <label>
              Pesquisar lojas
              <input
                autoComplete="off"
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Nome da loja"
                spellCheck={false}
                type="search"
                value={searchTerm}
              />
            </label>

            <div className={styles.targetControls}>
              <label className={styles.checkboxLabel}>
                <input
                  checked={sendToAllStores}
                  onChange={(event) => setSendToAllStores(event.target.checked)}
                  type="checkbox"
                />
                Todas as lojas
              </label>
              <label className={styles.categoryLabel}>
                Categoria
                <select onChange={(event) => setCategory(event.target.value)} value={category}>
                  <option value="">Todas</option>
                  {categories.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <p className={styles.selectionSummary}>
              {sendToAllStores
                ? `${selectedStores.length} loja${selectedStores.length === 1 ? '' : 's'} selecionada${selectedStores.length === 1 ? '' : 's'}`
                : 'Selecione as lojas após a integração de envio.'}
            </p>

            <label className={styles.messageField}>
              Mensagem
              <textarea
                onChange={(event) => setComposerMessage(event.target.value)}
                placeholder="Escreva alguma coisa"
                value={composerMessage}
              />
            </label>

            {composerNotice ? <p className={styles.composerNotice}>{composerNotice}</p> : null}

            <button aria-label="Preparar envio da notificação" className={styles.sendButton} type="submit">
              <Send aria-hidden fill="currentColor" size={18} strokeWidth={1.8} />
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}

function matchesPeriod(createdAt: string | undefined, period: Period) {
  if (period === 'custom' || !createdAt) {
    return true;
  }

  const date = new Date(createdAt);
  const now = new Date();

  if (Number.isNaN(date.getTime())) {
    return true;
  }

  if (period === 'today') {
    return date.toDateString() === now.toDateString();
  }

  const days = period === '7d' ? 7 : 30;
  return date.getTime() >= now.getTime() - days * 24 * 60 * 60 * 1000;
}

function formatNotificationDate(value: string | undefined) {
  if (!value) {
    return 'Agora';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Agora';
  }

  return new Intl.DateTimeFormat('pt-PT', {
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
  }).format(date);
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  return 'Não foi possível carregar as notificações.';
}
