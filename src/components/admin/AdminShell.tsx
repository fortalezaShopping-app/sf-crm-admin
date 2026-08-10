'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard,
  LogOut,
  ReceiptText,
  Search,
  Store,
  UserCog,
  UserRound,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import type { AdminSession } from '@/lib/admin-session';
import { ADMIN_AUTH_EXPIRED_EVENT } from '@/lib/api';

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

type AdminShellProps = {
  children: React.ReactNode;
  initialSession: AdminSession;
};

const navItems: NavItem[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/dashboard/lojas', icon: Store, label: 'Lojas' },
  { href: '/dashboard/clientes', icon: Users, label: 'Clientes' },
  { href: '/dashboard/utilizadores', icon: UserCog, label: 'Utilizadores' },
  { href: '/dashboard/comprovativos', icon: ReceiptText, label: 'Faturas' },
  { href: '/dashboard/perfil', icon: UserRound, label: 'Perfil' },
];

export function AdminShell({ children, initialSession: session }: AdminShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function handleAuthExpired() {
      await fetch('/api/session/logout', { method: 'POST' }).catch(() => undefined);
      router.replace('/login');
      router.refresh();
    }

    window.addEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);

    return () => {
      window.removeEventListener(ADMIN_AUTH_EXPIRED_EVENT, handleAuthExpired);
    };
  }, [router]);

  const initials = useMemo(() => {
    const source = session.nome ?? session.email ?? 'Admin';
    return source
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join('')
      .toUpperCase();
  }, [session.email, session.nome]);

  async function handleSignOut() {
    await fetch('/api/session/logout', { method: 'POST' }).catch(() => undefined);
    router.replace('/login');
    router.refresh();
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const target = getSearchTarget(search);

    if (target) {
      router.push(target);
      setSearch('');
    }
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
              <Link
                className={isActive ? 'nav-link nav-link--active' : 'nav-link'}
                href={item.href}
                key={item.href}
              >
                <Icon aria-hidden size={19} strokeWidth={2.2} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="profile-chip">
            <span className="avatar">{initials}</span>
            <span>
              <strong>{session.nome ?? 'Administrador'}</strong>
              <span>{session.role}</span>
            </span>
          </div>

          <button className="ghost-button" onClick={() => void handleSignOut()} type="button">
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
            <Link aria-label="Perfil" className="icon-button" href="/dashboard/perfil">
              <UserRound aria-hidden size={18} strokeWidth={2.2} />
            </Link>
            <Link className="ghost-button" href="/dashboard/lojas">
              Novo cadastro
            </Link>
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

  if (value.includes('utilizador') || value.includes('admin')) {
    return '/dashboard/utilizadores';
  }

  if (value.includes('perfil') || value.includes('conta')) {
    return '/dashboard/perfil';
  }

  return '/dashboard';
}
