'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bell,
  CalendarDays,
  FileText,
  Gift,
  Images,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Store,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import type { AdminSession } from '@/lib/admin-session';
import { ADMIN_AUTH_EXPIRED_EVENT } from '@/lib/api';

import styles from './AdminShell.module.css';

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
  { href: '/dashboard/eventos', icon: CalendarDays, label: 'Eventos' },
  { href: '/dashboard/carrossel', icon: Images, label: 'Carrossel' },
  { href: '/dashboard/comprovativos', icon: FileText, label: 'Talões' },
  { href: '/dashboard/recompensas', icon: Gift, label: 'Recompensas' },
  { href: '/dashboard/analytics', icon: BarChart3, label: 'Analytics' },
  { href: '/dashboard/notificacoes', icon: Bell, label: 'Notificações' },
  { href: '/dashboard/utilizadores', icon: Users, label: 'Utilizadores' },
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

  const adminLabel = useMemo(
    () => session.nome ?? session.email ?? 'Administrador',
    [session.email, session.nome],
  );

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
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <Link aria-label="Visão geral" className={styles.logoLink} href="/dashboard">
          <ShoppingLogo size="sm" />
        </Link>

        <nav className={styles.navigation} aria-label="Navegação principal">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/dashboard' ? pathname === item.href : pathname.startsWith(item.href);

            return (
              <Link
                className={isActive ? `${styles.navLink} ${styles.navLinkActive}` : styles.navLink}
                href={item.href}
                key={item.href}
                title={item.label}
              >
                <Icon aria-hidden size={18} strokeWidth={1.6} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <Link
            aria-label="Abrir configurações"
            className={styles.footerLink}
            href="/dashboard/configuracoes"
            title="Configurações"
          >
            <Settings aria-hidden size={18} strokeWidth={1.6} />
            <span>Configurações</span>
          </Link>
          <button
            aria-label={`Sair da sessão de ${adminLabel}`}
            className={styles.footerLink}
            onClick={() => void handleSignOut()}
            title="Sair"
            type="button"
          >
            <LogOut aria-hidden size={18} strokeWidth={1.6} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <section className={styles.mainPanel}>
        <header className={styles.topbar}>
          <form
            aria-label="Pesquisar no backoffice"
            className={styles.searchShell}
            onSubmit={handleSearch}
          >
            <Search aria-hidden size={17} strokeWidth={1.7} />
            <input
              aria-label="Pesquisar no painel"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar"
              type="search"
              value={search}
            />
          </form>
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

  if (value.includes('evento') || value.includes('agenda')) {
    return '/dashboard/eventos';
  }

  if (value.includes('carrossel') || value.includes('campanha')) {
    return '/dashboard/carrossel';
  }

  if (value.includes('analytics') || value.includes('desempenho')) {
    return '/dashboard/analytics';
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
