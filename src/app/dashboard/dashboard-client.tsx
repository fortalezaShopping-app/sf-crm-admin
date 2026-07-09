'use client';

import { useEffect, useMemo, useState } from 'react';
import { Gift, Store, Trophy, Users, WalletCards } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

import {
  ApiError,
  listLojas,
  listRecompensas,
  listRegrasPontuacao,
  listUtilizadores,
  type Loja,
  type Recompensa,
  type RegraPontuacao,
  type Utilizador,
} from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

type StatItem = {
  change: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

type DashboardState = {
  clientes: Utilizador[];
  error: string | null;
  isLoading: boolean;
  lojas: Loja[];
  recompensas: Recompensa[];
  regras: RegraPontuacao[];
};

export function DashboardClient() {
  const [state, setState] = useState<DashboardState>({
    clientes: [],
    error: null,
    isLoading: true,
    lojas: [],
    recompensas: [],
    regras: [],
  });

  useEffect(() => {
    let isMounted = true;
    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    Promise.all([
      listLojas(session.token),
      listUtilizadores(session.token, 'CLIENTE'),
      listRecompensas(session.token),
      listRegrasPontuacao(session.token),
    ])
      .then(([lojas, clientes, recompensas, regras]) => {
        if (isMounted) {
          setState({
            clientes,
            error: null,
            isLoading: false,
            lojas,
            recompensas,
            regras,
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
        change: `${state.lojas.filter((loja) => loja.estado === 'ATIVA').length} ativas`,
        icon: Store,
        label: 'Lojas',
        value: formatCount(state.lojas.length),
      },
      {
        change: 'Registados no mobile',
        icon: Users,
        label: 'Clientes',
        value: formatCount(state.clientes.length),
      },
      {
        change: `${state.recompensas.filter((item) => item.estado === 'ATIVA').length} ativas`,
        icon: Gift,
        label: 'Recompensas',
        value: formatCount(state.recompensas.length),
      },
      {
        change: `${state.regras.filter((regra) => regra.ativo).length} ativas`,
        icon: Trophy,
        label: 'Regras de pontos',
        value: formatCount(state.regras.length),
      },
    ],
    [state],
  );

  const recentStores = state.lojas.slice(0, 5);

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
            <a href="/dashboard/lojas">Gerir lojas</a>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Loja</th>
                <th>NIF</th>
                <th>Telefone</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {recentStores.length > 0 ? (
                recentStores.map((loja) => (
                  <tr key={loja.id ?? loja.nome}>
                    <td>
                      <span className="table-title">
                        <strong>{loja.nome ?? 'Loja sem nome'}</strong>
                        <span>{loja.email ?? loja.endereco ?? 'Sem contacto'}</span>
                      </span>
                    </td>
                    <td>{loja.nif ?? '-'}</td>
                    <td>{loja.telefone ?? '-'}</td>
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
              href="/dashboard/regras"
              icon={Trophy}
              label="Regras de pontos"
              text="Configurar campanhas e pontuacao."
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
    <a className="quick-action" href={href}>
      <span className="quick-action__icon">
        <Icon aria-hidden size={18} strokeWidth={2.2} />
      </span>
      <span>
        <strong>{label}</strong>
        <span>{text}</span>
      </span>
    </a>
  );
}

function formatCount(value: number) {
  return new Intl.NumberFormat('pt-AO').format(value);
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar os dados.';
}
