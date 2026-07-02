'use client';

import { useEffect, useMemo, useSyncExternalStore } from 'react';
import {
  Bell,
  Gift,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Search,
  Store,
  Trophy,
  UserCog,
  Users,
  WalletCards,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import {
  clearAdminSession,
  getAdminSessionSnapshot,
  subscribeAdminSession,
  type AdminSession,
} from '@/lib/auth';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type StatItem = {
  change: string;
  icon: LucideIcon;
  label: string;
  value: string;
};

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/lojas', icon: Store, label: 'Lojas' },
  { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { href: '/dashboard/comprovativos', icon: ReceiptText, label: 'Comprovativos' },
  { href: '/dashboard/recompensas', icon: Gift, label: 'Recompensas' },
  { href: '/dashboard/utilizadores', icon: UserCog, label: 'Utilizadores' },
];

const stats: StatItem[] = [
  { change: '+12% esta semana', icon: ReceiptText, label: 'Comprovativos', value: '128' },
  { change: '42 lojas ativas', icon: Store, label: 'Lojas', value: '42' },
  { change: '+8 novos clientes', icon: Users, label: 'Clientes', value: '1.284' },
  { change: '18 disponiveis', icon: Gift, label: 'Recompensas', value: '18' },
];

const pendingReceipts = [
  {
    client: 'Adilson Manuel',
    store: 'KFC Fortaleza',
    total: 'AOA 18.400',
    status: 'Pendente',
  },
  {
    client: 'Marta Silva',
    store: 'Zara',
    total: 'AOA 96.900',
    status: 'Pendente',
  },
  {
    client: 'Carlos Domingos',
    store: 'Cinema X',
    total: 'AOA 7.500',
    status: 'Aprovado',
  },
];

const quickActions = [
  {
    icon: Store,
    label: 'Cadastrar loja',
    text: 'Criar ou atualizar informacoes comerciais.',
  },
  {
    icon: Trophy,
    label: 'Regras de pontos',
    text: 'Configurar campanhas e pontuacao.',
  },
  {
    icon: WalletCards,
    label: 'Validar comprovativos',
    text: 'Acompanhar compras enviadas no mobile.',
  },
];

export function DashboardClient() {
  const router = useRouter();
  const session = useSyncExternalStore(
    subscribeAdminSession,
    getAdminSessionSnapshot,
    getServerSessionSnapshot,
  );

  useEffect(() => {
    if (!session) {
      router.replace('/login');
    }
  }, [router, session]);

  const initials = useMemo(() => {
    const source = session?.nome ?? session?.email ?? 'Admin';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [session]);

  function handleSignOut() {
    clearAdminSession();
    router.replace('/login');
  }

  if (!session) {
    return <main className="dashboard-loading">A validar sessao...</main>;
  }

  return (
    <main className="dashboard-shell">
      <aside className="sidebar">
        <ShoppingLogo size="sm" />

        <nav className="sidebar-nav" aria-label="Navegacao principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/dashboard';

            return (
              <a
                className={isActive ? 'nav-link nav-link--active' : 'nav-link'}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden size={19} strokeWidth={2.2} />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <span className="avatar">{initials}</span>
            <span>
              <strong>{session?.nome ?? 'Administrador'}</strong>
              <span>{session?.role ?? session?.tipo ?? 'Admin'}</span>
            </span>
          </div>

          <button className="ghost-button" onClick={handleSignOut} type="button">
            <LogOut aria-hidden size={17} strokeWidth={2.2} />
            Sair
          </button>
        </div>
      </aside>

      <section className="main-panel">
        <header className="topbar">
          <label className="search-shell">
            <Search aria-hidden size={18} strokeWidth={2.2} />
            <input placeholder="Pesquisar lojas, clientes ou comprovativos" type="search" />
          </label>

          <div className="topbar-actions">
            <button aria-label="Notificacoes" className="icon-button" type="button">
              <Bell aria-hidden size={18} strokeWidth={2.2} />
            </button>
            <button className="ghost-button" type="button">
              Novo cadastro
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          <section className="dashboard-heading">
            <div className="heading-copy">
              <p className="eyebrow">Visao geral</p>
              <h1>Painel administrativo</h1>
              <p>Controle operacional do Shopping Fortaleza para o time interno.</p>
            </div>

            <span className="status-pill">
              <span className="status-dot" />
              API configurada
            </span>
          </section>

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
                  <strong>{stat.value}</strong>
                  <small>{stat.change}</small>
                </article>
              );
            })}
          </section>

          <section className="workspace-grid">
            <article className="panel">
              <div className="panel-header">
                <h2>Comprovativos recentes</h2>
                <a href="/dashboard/comprovativos">Ver todos</a>
              </div>

              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Loja</th>
                    <th>Valor</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingReceipts.map((receipt) => (
                    <tr key={`${receipt.client}-${receipt.store}`}>
                      <td>
                        <span className="table-title">
                          <strong>{receipt.client}</strong>
                          <span>Compra enviada pelo app</span>
                        </span>
                      </td>
                      <td>{receipt.store}</td>
                      <td>{receipt.total}</td>
                      <td>
                        <span
                          className={
                            receipt.status === 'Aprovado'
                              ? 'badge badge--success'
                              : 'badge badge--warning'
                          }
                        >
                          {receipt.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>

            <article className="panel">
              <div className="panel-header">
                <h2>Acesso rapido</h2>
              </div>

              <div className="quick-list">
                {quickActions.map((action) => {
                  const Icon = action.icon;

                  return (
                    <a className="quick-action" href="/dashboard" key={action.label}>
                      <span className="quick-action__icon">
                        <Icon aria-hidden size={18} strokeWidth={2.2} />
                      </span>
                      <span>
                        <strong>{action.label}</strong>
                        <span>{action.text}</span>
                      </span>
                    </a>
                  );
                })}
              </div>
            </article>
          </section>
        </div>
      </section>
    </main>
  );
}

function getServerSessionSnapshot(): AdminSession | null {
  return null;
}
