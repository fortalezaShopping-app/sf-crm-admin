'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, Download } from 'lucide-react';
import Link from 'next/link';

import {
  ApiError,
  getDashboardSummary,
  type DashboardSummary,
} from '@/lib/api';

import styles from './dashboard.module.css';

type DashboardState = {
  error: string | null;
  isLoading: boolean;
  summary: DashboardSummary | null;
};

export function DashboardClient() {
  const [state, setState] = useState<DashboardState>({
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
          setState({
            error: getErrorMessage(error),
            isLoading: false,
            summary: null,
          });
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const metrics = [
    { label: 'Lojas ativas', value: state.summary?.activeStores },
    { label: 'Transações pendentes', value: state.summary?.pendingInvoices },
    { label: 'Recompensas', value: state.summary?.rewardsTotal },
    { label: 'Utilizadores', value: state.summary?.usersTotal },
  ];

  return (
    <div className={styles.page}>
      <header className={styles.heading}>
        <div className={styles.headingCopy}>
          <h1>Visão geral</h1>
          <p>Resumo de operações e performance do programa de fidelidade</p>
        </div>

        <div className={styles.headingActions}>
          <button className={styles.periodButton} type="button">
            <CalendarDays aria-hidden size={17} strokeWidth={1.6} />
            Últimos 30 dias
          </button>
          <button
            className={styles.exportButton}
            disabled={!state.summary}
            onClick={() => state.summary && exportDashboardReport(state.summary)}
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

      <section className={styles.metricsGrid} aria-label="Indicadores principais">
        {metrics.map((metric) => (
          <article className={styles.metricCard} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{state.isLoading ? '...' : formatCount(metric.value ?? 0)}</strong>
          </article>
        ))}
      </section>

      <section className={styles.chartsGrid}>
        <VolumeChart
          data={state.summary?.volumeByPeriod ?? []}
          isLoading={state.isLoading}
        />
        <ReceiptChart
          data={state.summary?.receiptStatus}
          isLoading={state.isLoading}
        />
      </section>

      <section className={styles.activityCard}>
        <header className={styles.activityHeader}>
          <h2>Lojas com maior atividade</h2>
          <Link href="/dashboard/comprovativos">Ver atividade completa</Link>
        </header>

        <div className={styles.tableScroll}>
          <table className={styles.activityTable}>
            <thead>
              <tr>
                <th>Lojas</th>
                <th>Categoria</th>
                <th>Nº de Talões</th>
                <th>Pontos totais</th>
              </tr>
            </thead>
            <tbody>
              {state.isLoading ? (
                <tr>
                  <td colSpan={4}>A carregar atividade...</td>
                </tr>
              ) : state.summary?.topStores.length ? (
                state.summary.topStores.map((store) => (
                  <tr key={store.storeId ?? store.name}>
                    <td>{store.name}</td>
                    <td>{store.category}</td>
                    <td>{formatCount(store.receiptCount)}</td>
                    <td
                      title={
                        store.pointsTotal === undefined
                          ? 'A API ainda não associa os pontos administrativos à loja.'
                          : undefined
                      }
                    >
                      {store.pointsTotal === undefined
                        ? '—'
                        : `${formatCount(store.pointsTotal)} pts`}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>Sem atividade registada nos últimos 30 dias.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
    <article className={`${styles.chartCard} ${styles.volumeCard}`}>
      <header className={styles.chartHeader}>
        <h2>Volume de transações</h2>
        <span>Últimos 30 dias</span>
      </header>

      <div className={styles.barChart} aria-label="Volume de transações por período">
        {isLoading ? (
          <p className={styles.chartMessage}>A carregar...</p>
        ) : hasData ? (
          data.map((item) => (
            <div className={styles.barColumn} key={item.label}>
              <span className={styles.barValue}>{formatCount(item.transactions)}</span>
              <span
                className={styles.bar}
                style={{ height: `${Math.max(8, (item.transactions / maxValue) * 100)}%` }}
              />
              <span className={styles.barLabel}>{item.label}</span>
            </div>
          ))
        ) : (
          <p className={styles.chartMessage}>Sem transações no período.</p>
        )}
      </div>
    </article>
  );
}

function ReceiptChart({
  data,
  isLoading,
}: {
  data?: DashboardSummary['receiptStatus'];
  isLoading: boolean;
}) {
  const total = data?.total ?? 0;
  const approved = percentage(data?.approved ?? 0, total);
  const pending = percentage(data?.pending ?? 0, total);
  const rejected = percentage(data?.rejected ?? 0, total);
  const approvedEnd = approved;
  const pendingEnd = approved + pending;
  const rejectedEnd = pendingEnd + rejected;

  return (
    <article className={`${styles.chartCard} ${styles.receiptCard}`}>
      <header className={styles.chartHeader}>
        <h2>Talões</h2>
      </header>

      {isLoading ? (
        <p className={styles.chartMessage}>A carregar...</p>
      ) : total > 0 ? (
        <>
          <div
            aria-label={`${formatCount(total)} talões no total`}
            className={styles.donut}
            style={{
              background: `conic-gradient(#2f8f57 0 ${approvedEnd}%, #e1b420 ${approvedEnd}% ${pendingEnd}%, #b42318 ${pendingEnd}% ${rejectedEnd}%, #d8cbc5 ${rejectedEnd}% 100%)`,
            }}
          >
            <span>
              <strong>{formatCount(total)}</strong>
              <small>Total</small>
            </span>
          </div>
          <div className={styles.legend}>
            <LegendItem color="#2f8f57" label="Aprovados" value={data?.approved ?? 0} />
            <LegendItem color="#e1b420" label="Pendentes" value={data?.pending ?? 0} />
            <LegendItem color="#b42318" label="Rejeitados" value={data?.rejected ?? 0} />
            {data?.other ? (
              <LegendItem color="#d8cbc5" label="Outros" value={data.other} />
            ) : null}
          </div>
        </>
      ) : (
        <p className={styles.chartMessage}>Sem talões registados.</p>
      )}
    </article>
  );
}

function LegendItem({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <span className={styles.legendItem}>
      <span className={styles.legendDot} style={{ background: color }} />
      <span>{label}</span>
      <strong>{formatCount(value)}</strong>
    </span>
  );
}

function exportDashboardReport(summary: DashboardSummary) {
  const rows: Array<Array<string | number>> = [
    ['Relatório', 'Visão geral - últimos 30 dias'],
    ['Indicador', 'Valor'],
    ['Lojas ativas', summary.activeStores],
    ['Transações pendentes', summary.pendingInvoices],
    ['Recompensas', summary.rewardsTotal],
    ['Utilizadores', summary.usersTotal],
    [],
    ['Loja', 'Categoria', 'Nº de Talões', 'Pontos totais'],
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
  anchor.download = `shopping-fortaleza-visao-geral-${new Date().toISOString().slice(0, 10)}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function toCsvCell(value: string | number) {
  const text = String(value).replaceAll('"', '""');
  return `"${text}"`;
}

function percentage(value: number, total: number) {
  return total > 0 ? (value / total) * 100 : 0;
}

function formatCount(value: number) {
  return new Intl.NumberFormat('pt-AO', { maximumFractionDigits: 0 }).format(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Não foi possível carregar os dados.';
}
