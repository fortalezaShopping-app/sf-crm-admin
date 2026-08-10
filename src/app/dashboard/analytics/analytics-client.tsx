'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';

import { ApiError, getDashboardSummary, type DashboardSummary } from '@/lib/api';

import styles from './analytics.module.css';

type AnalyticsState = {
  error: string | null;
  isLoading: boolean;
  summary: DashboardSummary | null;
};

type Period = 'today' | '3d' | '7d' | '30d' | 'custom';

const periodOptions: Array<{ label: string; value: Period }> = [
  { label: 'Hoje', value: 'today' },
  { label: '3d', value: '3d' },
  { label: '7d', value: '7d' },
  { label: '30d', value: '30d' },
  { label: 'Personalizado', value: 'custom' },
];

export function AnalyticsClient() {
  const [period, setPeriod] = useState<Period>('7d');
  const [state, setState] = useState<AnalyticsState>({
    error: null,
    isLoading: true,
    summary: null,
  });

  useEffect(() => {
    let isMounted = true;

    getDashboardSummary()
      .then((summary) => {
        if (isMounted) {
          setState({ error: null, isLoading: false, summary });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState({ error: getErrorMessage(error), isLoading: false, summary: null });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const volumeData = useMemo(
    () => filterVolumeByPeriod(state.summary?.volumeByPeriod ?? [], period),
    [period, state.summary?.volumeByPeriod],
  );
  const pointsIssued = state.summary?.topStores.reduce(
    (total, store) => total + (store.pointsTotal ?? 0),
    0,
  );
  const metrics = [
    { label: 'Volume de transações', value: state.summary?.receiptStatus.total },
    { label: 'Utilizadores ativos', value: state.summary?.usersTotal },
    { label: 'Pontos emitidos', value: pointsIssued },
    { label: 'Pontos resgatados', value: undefined },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <h1>Análise do desempenho</h1>
          <p>Visão analítica de transações, parceiros e retenção.</p>
        </div>

        <div className={styles.headingActions}>
          <div aria-label="Período da análise" className={styles.periodTabs} role="group">
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

          <button
            className={styles.exportButton}
            disabled={!state.summary}
            onClick={() => state.summary && exportAnalyticsReport(state.summary)}
            type="button"
          >
            <Download aria-hidden size={17} strokeWidth={1.7} />
            Exportar relatório
          </button>
        </div>
      </header>

      {state.error ? (
        <p className={styles.errorNotice} role="alert">
          {state.error}
        </p>
      ) : null}

      <section className={styles.metricsGrid} aria-label="Indicadores de desempenho">
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{state.isLoading ? '...' : formatMetric(metric.value)}</strong>
          </article>
        ))}
      </section>

      <section className={styles.primaryGrid}>
        <VolumeChart data={volumeData} isLoading={state.isLoading} />
        <TopStores stores={state.summary?.topStores ?? []} isLoading={state.isLoading} />
      </section>

      <section className={styles.secondaryGrid}>
        <article className={styles.insightCard}>
          <h2>Taxas de retenção</h2>
          <div className={styles.insightContent}>
            <strong>—</strong>
            <span>A API ainda não disponibiliza dados de retenção.</span>
          </div>
        </article>

        <article className={styles.insightCard}>
          <h2>Recompensas</h2>
          <div className={styles.insightContent}>
            <strong>
              {state.isLoading ? '...' : formatMetric(state.summary?.rewardsTotal)}
            </strong>
            <span>Recompensas registadas no programa.</span>
          </div>
        </article>
      </section>
    </div>
  );
}

function VolumeChart({
  data,
  isLoading,
}: {
  data: DashboardSummary['volumeByPeriod'];
  isLoading: boolean;
}) {
  const maxValue = Math.max(1, ...data.map((item) => item.transactions));
  const hasData = data.some((item) => item.transactions > 0);

  return (
    <article className={styles.chartCard}>
      <h2>Volume de transações</h2>
      <div className={styles.barChart}>
        {isLoading ? (
          <p className={styles.emptyState}>A carregar...</p>
        ) : hasData ? (
          data.map((item) => (
            <div className={styles.barColumn} key={item.label}>
              <span>{formatMetric(item.transactions)}</span>
              <i style={{ height: `${Math.max(8, (item.transactions / maxValue) * 100)}%` }} />
              <small>{item.label}</small>
            </div>
          ))
        ) : (
          <p className={styles.emptyState}>Sem transações neste período.</p>
        )}
      </div>
    </article>
  );
}

function TopStores({
  stores,
  isLoading,
}: {
  stores: DashboardSummary['topStores'];
  isLoading: boolean;
}) {
  const topStores = stores.slice(0, 5);
  const values = topStores.map((store) => store.pointsTotal ?? store.receiptCount);
  const maxValue = Math.max(1, ...values);

  return (
    <article className={`${styles.chartCard} ${styles.rankingCard}`}>
      <h2>Top 5 lojas</h2>
      <p>Por volume de emissão de pontos</p>

      {isLoading ? (
        <p className={styles.emptyState}>A carregar...</p>
      ) : topStores.length ? (
        <div className={styles.rankingList}>
          {topStores.map((store) => {
            const value = store.pointsTotal ?? store.receiptCount;

            return (
              <div className={styles.rankingItem} key={store.storeId ?? store.name}>
                <span>
                  <strong>{store.name}</strong>
                  <small>{formatMetric(value)} pts</small>
                </span>
                <i style={{ width: `${Math.max(8, (value / maxValue) * 100)}%` }} />
              </div>
            );
          })}
        </div>
      ) : (
        <p className={styles.emptyState}>Sem atividade por loja.</p>
      )}
    </article>
  );
}

function filterVolumeByPeriod(
  data: DashboardSummary['volumeByPeriod'],
  period: Period,
) {
  const visibleItems = period === 'today' ? 1 : period === '3d' ? 3 : period === '7d' ? 7 : 30;

  return period === 'custom' ? data : data.slice(-visibleItems);
}

function exportAnalyticsReport(summary: DashboardSummary) {
  const rows: Array<Array<string | number>> = [
    ['Relatório', 'Análise do desempenho'],
    ['Volume de transações', summary.receiptStatus.total],
    ['Utilizadores ativos', summary.usersTotal],
    ['Recompensas', summary.rewardsTotal],
    [],
    ['Loja', 'Categoria', 'Talões', 'Pontos'],
    ...summary.topStores.map((store) => [
      store.name,
      store.category,
      store.receiptCount,
      store.pointsTotal ?? '',
    ]),
  ];
  const csv = rows.map((row) => row.map(toCsvCell).join(';')).join('\n');
  const url = URL.createObjectURL(
    new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }),
  );
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `shopping-fortaleza-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsvCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function formatMetric(value: number | undefined) {
  return value === undefined
    ? '—'
    : new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Não foi possível carregar os dados analíticos.';
}
