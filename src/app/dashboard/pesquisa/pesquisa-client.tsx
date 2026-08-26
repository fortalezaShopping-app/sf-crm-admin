'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  FileText,
  Images,
  Search,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react';
import Link from 'next/link';

import { useAdminSearchQuery } from '@/components/admin/useAdminSearchQuery';
import { matchesSearchQuery, withSearchQuery } from '@/lib/admin-search';
import {
  listAllCarouselSlides,
  listAllEventos,
  listAllFaturas,
  listAllLojas,
  listAllNotificacoes,
  listAllUtilizadores,
  type CarouselSlide,
  type Evento,
  type FaturaAdmin,
  type Loja,
  type Notificacao,
  type Utilizador,
} from '@/lib/api';

import styles from './pesquisa.module.css';

type SearchData = {
  eventos: Evento[];
  faturas: FaturaAdmin[];
  lojas: Loja[];
  notificacoes: Notificacao[];
  slides: CarouselSlide[];
  utilizadores: Utilizador[];
};

type SearchResult = {
  description: string;
  href: string;
  key: string;
  meta?: string;
  title: string;
};

type ResultSection = {
  href: string;
  icon: LucideIcon;
  label: string;
  results: SearchResult[];
};

const emptyData: SearchData = {
  eventos: [],
  faturas: [],
  lojas: [],
  notificacoes: [],
  slides: [],
  utilizadores: [],
};

const MAX_VISIBLE_RESULTS = 6;

export function PesquisaClient() {
  const { deferredQuery, query } = useAdminSearchQuery();
  const [data, setData] = useState<SearchData>(emptyData);
  const [failedSources, setFailedSources] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    void Promise.allSettled([
      listAllLojas(),
      listAllEventos(),
      listAllCarouselSlides(),
      listAllUtilizadores(),
      listAllFaturas(),
      listAllNotificacoes(),
    ]).then((results) => {
      if (!isActive) {
        return;
      }

      const [lojas, eventos, slides, utilizadores, faturas, notificacoes] = results;
      setData({
        eventos: getSettledValue(eventos),
        faturas: getSettledValue(faturas),
        lojas: getSettledValue(lojas),
        notificacoes: getSettledValue(notificacoes),
        slides: getSettledValue(slides),
        utilizadores: getSettledValue(utilizadores),
      });
      setFailedSources(results.filter((result) => result.status === 'rejected').length);
      setIsLoading(false);
    });

    return () => {
      isActive = false;
    };
  }, []);

  const sections = useMemo(
    () => createResultSections(data, deferredQuery),
    [data, deferredQuery],
  );
  const totalResults = sections.reduce(
    (total, section) => total + section.results.length,
    0,
  );

  return (
    <div className="dashboard-content">
      <header className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Pesquisa global</p>
          <h1>Resultados</h1>
          <p>
            {query.trim()
              ? `Resultados encontrados para “${query.trim()}”.`
              : 'Pesquise lojas, utilizadores, eventos, faturas e comunicações.'}
          </p>
        </div>
        {query.trim() ? (
          <span className="count-pill">
            <Search aria-hidden size={14} />
            {isLoading ? 'A pesquisar' : totalResults}
          </span>
        ) : null}
      </header>

      {failedSources > 0 ? (
        <p className="form-error" role="alert">
          {failedSources === 1
            ? 'Uma área não respondeu. Os restantes resultados continuam disponíveis.'
            : `${failedSources} áreas não responderam. Os restantes resultados continuam disponíveis.`}
        </p>
      ) : null}

      <section className={styles.resultsPanel}>
        {!query.trim() ? (
          <EmptySearch />
        ) : isLoading ? (
          <p className={styles.emptyState}>A pesquisar em todo o painel...</p>
        ) : totalResults === 0 ? (
          <div className={styles.emptyState}>
            <Search aria-hidden size={28} strokeWidth={1.5} />
            <strong>Nenhum resultado encontrado</strong>
            <span>Experimente o nome, email, NIF ou número da fatura.</span>
          </div>
        ) : (
          sections
            .filter((section) => section.results.length > 0)
            .map((section) => (
              <ResultGroup key={section.href} query={query} section={section} />
            ))
        )}
      </section>
    </div>
  );
}

function ResultGroup({ query, section }: { query: string; section: ResultSection }) {
  const Icon = section.icon;
  const visibleResults = section.results.slice(0, MAX_VISIBLE_RESULTS);

  return (
    <section className={styles.resultGroup}>
      <header className={styles.groupHeader}>
        <span>
          <Icon aria-hidden size={17} strokeWidth={1.7} />
          <strong>{section.label}</strong>
          <small>{section.results.length}</small>
        </span>
        <Link href={withSearchQuery(section.href, query)}>Ver todos</Link>
      </header>
      <div className={styles.resultList}>
        {visibleResults.map((result) => (
          <Link className={styles.resultItem} href={result.href} key={result.key}>
            <span>
              <strong>{result.title}</strong>
              <small>{result.description}</small>
            </span>
            {result.meta ? <b>{result.meta}</b> : null}
          </Link>
        ))}
      </div>
    </section>
  );
}

function EmptySearch() {
  return (
    <div className={styles.emptyState}>
      <Search aria-hidden size={30} strokeWidth={1.4} />
      <strong>O que procura?</strong>
      <span>Utilize o campo de pesquisa no topo do painel.</span>
    </div>
  );
}

function createResultSections(data: SearchData, query: string): ResultSection[] {
  if (!query.trim()) {
    return [];
  }

  return [
    {
      href: '/dashboard/lojas',
      icon: Store,
      label: 'Lojas',
      results: data.lojas
        .filter((loja) =>
          matchesSearchQuery(query, [
            loja.id,
            loja.nome,
            loja.razaoSocial,
            loja.nif,
            loja.categoria,
            loja.piso,
            loja.email,
            loja.telefone,
            loja.estado,
          ]),
        )
        .map((loja) => ({
          description: [loja.categoria, loja.piso, loja.nif].filter(Boolean).join(' · ') || 'Loja',
          href: withSearchQuery('/dashboard/lojas', loja.nome ?? query),
          key: `store-${loja.id ?? loja.nome}`,
          meta: loja.estado,
          title: loja.nome ?? 'Loja sem nome',
        })),
    },
    {
      href: '/dashboard/utilizadores',
      icon: Users,
      label: 'Utilizadores',
      results: data.utilizadores
        .filter((user) =>
          matchesSearchQuery(query, [
            user.id,
            user.nome,
            user.email,
            user.telefone,
            user.role,
            user.roles,
            user.estado,
          ]),
        )
        .map((user) => ({
          description: user.email ?? user.telefone ?? 'Sem contacto',
          href: withSearchQuery('/dashboard/utilizadores', user.email ?? user.nome ?? query),
          key: `user-${user.id ?? user.email}`,
          meta: user.estado,
          title: user.nome ?? 'Utilizador sem nome',
        })),
    },
    {
      href: '/dashboard/comprovativos',
      icon: FileText,
      label: 'Talões',
      results: data.faturas
        .filter((invoice) =>
          matchesSearchQuery(query, [
            invoice.id,
            invoice.invoiceNumber,
            invoice.storeName,
            invoice.issuerTaxId,
            invoice.customerTaxId,
            invoice.status,
            invoice.totalAmount,
          ]),
        )
        .map((invoice) => ({
          description: invoice.storeName ?? 'Loja não identificada',
          href: withSearchQuery(
            '/dashboard/comprovativos',
            invoice.invoiceNumber ?? String(invoice.id ?? query),
          ),
          key: `invoice-${invoice.id ?? invoice.invoiceNumber}`,
          meta: invoice.status,
          title: invoice.invoiceNumber ?? `Fatura #${invoice.id ?? '-'}`,
        })),
    },
    {
      href: '/dashboard/eventos',
      icon: CalendarDays,
      label: 'Eventos',
      results: data.eventos
        .filter((event) =>
          matchesSearchQuery(query, [
            event.id,
            event.titulo,
            event.descricao,
            event.local,
            event.estado,
            event.criadoPor,
          ]),
        )
        .map((event) => ({
          description: event.local ?? 'Local não definido',
          href: withSearchQuery('/dashboard/eventos', event.titulo ?? query),
          key: `event-${event.id ?? event.titulo}`,
          meta: formatDate(event.dataInicio),
          title: event.titulo ?? 'Evento sem título',
        })),
    },
    {
      href: '/dashboard/carrossel',
      icon: Images,
      label: 'Carrossel',
      results: data.slides
        .filter((slide) => matchesSearchQuery(query, [slide.id, slide.title]))
        .map((slide) => ({
          description: 'Slide da página inicial do aplicativo',
          href: withSearchQuery('/dashboard/carrossel', slide.title ?? query),
          key: `slide-${slide.id ?? slide.title}`,
          meta: formatDate(slide.updatedAt ?? slide.createdAt),
          title: slide.title ?? 'Slide sem título',
        })),
    },
    {
      href: '/dashboard/notificacoes',
      icon: Bell,
      label: 'Notificações',
      results: data.notificacoes
        .filter((notification) =>
          matchesSearchQuery(query, [
            notification.id,
            notification.titulo,
            notification.mensagem,
            notification.tipo,
          ]),
        )
        .map((notification) => ({
          description: notification.mensagem ?? 'Sem detalhe adicional',
          href: withSearchQuery('/dashboard/notificacoes', notification.titulo ?? query),
          key: `notification-${notification.id ?? notification.titulo}`,
          meta: formatDate(notification.createdAt),
          title: notification.titulo ?? 'Notificação sem título',
        })),
    },
  ];
}

function getSettledValue<T>(result: PromiseSettledResult<T[]>) {
  return result.status === 'fulfilled' ? result.value : [];
}

function formatDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? undefined
    : new Intl.DateTimeFormat('pt-AO', { dateStyle: 'medium' }).format(date);
}
