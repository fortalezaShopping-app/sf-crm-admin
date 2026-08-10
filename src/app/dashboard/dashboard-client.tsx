'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImageIcon, Store, UserCog, Users, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';

import { StoreImage } from '@/components/admin/StoreImage';
import {
  ApiError,
  getDashboardSummary,
  type DashboardSummary,
  type Loja,
} from '@/lib/api';

type StatItem = {
  change: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

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
          setState({
            error: null,
            isLoading: false,
            summary,
          });
        }
      })
      .catch((error: unknown) => {
        if (isMounted) {
          setState((currentState) => ({
            ...currentState,
            error: getErrorMessage(error),
            isLoading: false,
          }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo<StatItem[]>(
    () => [
      {
        change: `${state.summary?.lojasAtivas ?? 0} ativas`,
        icon: Store,
        label: 'Lojas',
        value: formatCount(state.summary?.lojasTotal ?? 0),
      },
      {
        change: 'Registados no mobile',
        icon: Users,
        label: 'Clientes',
        value: formatCount(state.summary?.clientesTotal ?? 0),
      },
      {
        change: 'Equipa com acesso ao painel',
        icon: UserCog,
        label: 'Utilizadores internos',
        value: formatCount(state.summary?.utilizadoresInternosTotal ?? 0),
      },
      {
        change: 'Disponiveis no diretorio',
        icon: ImageIcon,
        label: 'Imagens de lojas',
        value: formatCount(state.summary?.lojasComImagem ?? 0),
      },
    ],
    [state],
  );

  const recentStores = state.summary?.lojasRecentes ?? [];

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Visao geral</p>
          <h1>Painel administrativo</h1>
          <p>Controle operacional do Shopping Fortaleza para o time interno.</p>
        </div>

        <span className={state.error ? 'status-pill status-pill--danger' : 'status-pill'}>
          <span className="status-dot" />
          {state.error ? 'API com aviso' : 'API configurada'}
        </span>
      </section>

      {state.error ? <p className="form-error">{state.error}</p> : null}

      <section className="stats-grid" aria-label="Indicadores principais">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className="stat-card" key={stat.label}>
              <div className="stat-card__top">
                <span>{stat.label}</span>
                <span className="stat-card__icon">
                  <Icon aria-hidden size={19} strokeWidth={2.2} />
                </span>
              </div>
              <strong>{state.isLoading ? '...' : stat.value}</strong>
              <small>{stat.change}</small>
            </article>
          );
        })}
      </section>

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Lojas recentes</h2>
            <Link href="/dashboard/lojas">Gerir lojas</Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Loja</th>
                <th>Categoria</th>
                <th>Piso</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentStores.length > 0 ? (
                recentStores.map((loja) => (
                  <tr key={loja.id ?? loja.nome}>
                    <td>
                      <span className="store-cell">
                        <StoreImage id={loja.id} name={loja.nome} />
                        <span className="table-title">
                          <strong>{loja.nome ?? 'Loja sem nome'}</strong>
                          <span>{loja.email ?? loja.endereco ?? 'Sem contacto'}</span>
                        </span>
                      </span>
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
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>{state.isLoading ? 'A carregar...' : 'Sem lojas registadas.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Acesso rapido</h2>
          </div>

          <div className="quick-list">
            <QuickAction
              href="/dashboard/lojas"
              icon={Store}
              label="Cadastrar loja"
              text="Criar ou atualizar informacoes comerciais."
            />
            <QuickAction
              href="/dashboard/utilizadores"
              icon={UserCog}
              label="Novo utilizador"
              text="Criar acessos para a equipa e para as lojas."
            />
            <QuickAction
              href="/dashboard/comprovativos"
              icon={WalletCards}
              label="Validar faturas"
              text="Aprovar ou rejeitar comprovativos por ID."
            />
          </div>
        </article>
      </section>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  label,
  text,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  text: string;
}) {
  return (
    <Link className="quick-action" href={href}>
      <span className="quick-action__icon">
        <Icon aria-hidden size={18} strokeWidth={2.2} />
      </span>
      <span>
        <strong>{label}</strong>
        <span>{text}</span>
      </span>
    </Link>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat('pt-AO').format(value);
}

function formatFloor(floor: Loja['piso']) {
  const labels: Record<NonNullable<Loja['piso']>, string> = {
    FLOOR_1: 'Piso 1',
    FLOOR_2: 'Piso 2',
    FLOOR_3: 'Piso 3',
    FLOOR_4: 'Piso 4',
    FLOOR_4_TERRACE: 'Terraco do piso 4',
    FLOORS_2_AND_4: 'Pisos 2 e 4',
    GROUND_FLOOR: 'Res do chao',
  };

  return floor ? labels[floor] : '-';
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar os dados.';
}
