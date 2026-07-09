'use client';

import { FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import {
  Bell,
  Gift,
  History,
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Search,
  Settings,
  Store,
  Trophy,
  UserCog,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import {
  ADMIN_AUTH_EXPIRED_EVENT,
  ApiError,
  getMe,
} from '@/lib/api';
import {
  clearAdminSession,
  createAdminSession,
  getAdminSessionSnapshot,
  saveAdminSession,
  subscribeAdminSession,
  type AdminSession,
} from '@/lib/auth';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type AdminShellProps = {
  children: React.ReactNode;
};

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/lojas', icon: Store, label: 'Lojas' },
  { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { href: '/dashboard/comprovativos', icon: ReceiptText, label: 'Faturas' },
  { href: '/dashboard/recompensas', icon: Gift, label: 'Recompensas' },
  { href: '/dashboard/regras', icon: Trophy, label: 'Regras' },
  { href: '/dashboard/utilizadores', icon: UserCog, label: 'Utilizadores' },
  { href: '/dashboard/configuracoes', icon: Settings, label: 'Configuracoes' },
  { href: '/dashboard/auditoria', icon: History, label: 'Auditoria' },
];

export function AdminShell({ children }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const session = useSyncExternalStore(
    subscribeAdminSession,
    getAdminSessionSnapshot,
    getServerSessionSnapshot,
  );

  useEffect(() => {
    const currentSession = getAdminSessionSnapshot();

    if (!currentSession) {
      router.replace('/login');
      return;
    }

    let isMounted = true;

    getMe(currentSession.token)
      .then((currentUser) => {
        if (!isMounted) {
          return;
        }

        saveAdminSession(createAdminSession(currentSession, currentUser));
      })
      .catch((error: unknown) => {
        if (!isMounted) {
          return;
        }

        if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
          clearAdminSession();
          router.replace('/login');
        }
      });

    return () => {
      isMounted = false;
    };
  }, [router, session?.token]);

  useEffect(() => {
    function handleAuthExpired() {
      clearAdminSession();
      router.replace('/login');
    }

    window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [router]);

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

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const target = getSearchTarget(search);

    if (target) {
      router.push(target);
      setSearch('');
    }
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
            const isActive =
              item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);

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
              <strong>{session.nome ?? 'Administrador'}</strong>
              <span>{session.role ?? session.tipo ?? 'Admin'}</span>
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
          <form
            aria-label="Pesquisar no backoffice"
            className="search-shell"
            onSubmit={handleSearch}
          >
            <Search aria-hidden size={18} strokeWidth={2.2} />
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar no backoffice"
              type="search"
              value={search}
            />
          </form>

          <div className="topbar-actions">
            <a aria-label="Auditoria" className="icon-button" href="/dashboard/auditoria">
              <Bell aria-hidden size={18} strokeWidth={2.2} />
            </a>
            <a className="ghost-button" href="/dashboard/lojas">
              Novo cadastro
            </a>
          </div>
        </header>

        {children}
      </section>
    </main>
  );
}

function getSearchTarget(query: string) {
  const value = query.trim().toLowerCase();

  if (!value) {
    return null;
  }

  if (value.includes('loja')) {
    return '/dashboard/lojas';
  }

  if (value.includes('cliente')) {
    return '/dashboard/clientes';
  }

  if (value.includes('fatura') || value.includes('comprov')) {
    return '/dashboard/comprovativos';
  }

  if (value.includes('recompensa') || value.includes('benef')) {
    return '/dashboard/recompensas';
  }

  if (value.includes('regra') || value.includes('ponto')) {
    return '/dashboard/regras';
  }

  if (value.includes('utilizador') || value.includes('admin')) {
    return '/dashboard/utilizadores';
  }

  if (value.includes('config')) {
    return '/dashboard/configuracoes';
  }

  if (value.includes('auditoria') || value.includes('log')) {
    return '/dashboard/auditoria';
  }

  return '/dashboard';
}

function getServerSessionSnapshot(): AdminSession | null {
  return null;
}
