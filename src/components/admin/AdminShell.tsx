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
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import type { AdminSession } from '@/lib/admin-session';
import { ADMIN_AUTH_EXPIRED_EVENT } from '@/lib/api';
import { normalizeSearchText, withSearchQuery } from '@/lib/admin-search';

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
  const searchParams = useSearchParams();
  const activeSearch = searchParams.get('q') ?? '';
  const [search, setSearch] = useState(activeSearch);

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

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearch(activeSearch), 0);
    return () => window.clearTimeout(timeoutId);
  }, [activeSearch]);

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
      setSearch(new URL(target, window.location.origin).searchParams.get('q') ?? '');
    }
  }

  function handleClearSearch() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('q');
    const queryString = params.toString();

    setSearch('');
    router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
      scroll: false,
    });
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
            <button
              aria-label="Executar pesquisa"
              className={styles.searchButton}
              title="Pesquisar"
              type="submit"
            >
              <Search aria-hidden size={17} strokeWidth={1.7} />
            </button>
            <input
              autoComplete="off"
              aria-label="Pesquisar no painel"
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pesquisar no painel"
              spellCheck={false}
              type="search"
              value={search}
            />
            {search ? (
              <button
                aria-label="Limpar pesquisa"
                className={styles.searchButton}
                onClick={handleClearSearch}
                title="Limpar"
                type="button"
              >
                <X aria-hidden size={15} strokeWidth={1.8} />
              </button>
            ) : (
              <span aria-hidden className={styles.searchSpacer} />
            )}
          </form>
        </header>

        {children}
      </section>
    </main>
  );
}

function getSearchTarget(query: string) {
  const trimmedQuery = query.trim();
  const value = normalizeSearchText(trimmedQuery);

  if (!value) {
    return null;
  }

  const directTarget = searchTargets.find(({ aliases }) =>
    aliases.some((alias) => value === alias || value.startsWith(`${alias} `)),
  );

  if (directTarget) {
    const hasPrefix = directTarget.aliases.some((alias) => value.startsWith(`${alias} `));
    const remainingQuery = hasPrefix
      ? trimmedQuery.split(/\s+/).slice(1).join(' ')
      : '';

    return withSearchQuery(directTarget.href, remainingQuery);
  }

  return withSearchQuery('/dashboard/pesquisa', trimmedQuery);
}

const searchTargets = [
  { aliases: ['dashboard', 'inicio', 'resumo'], href: '/dashboard' },
  { aliases: ['loja', 'lojas'], href: '/dashboard/lojas' },
  { aliases: ['agenda', 'evento', 'eventos'], href: '/dashboard/eventos' },
  { aliases: ['campanha', 'carrossel', 'slide', 'slides'], href: '/dashboard/carrossel' },
  {
    aliases: ['comprovativo', 'comprovativos', 'factura', 'facturas', 'fatura', 'faturas', 'talao', 'taloes'],
    href: '/dashboard/comprovativos',
  },
  {
    aliases: ['admin', 'cliente', 'clientes', 'utilizador', 'utilizadores', 'usuario', 'usuarios'],
    href: '/dashboard/utilizadores',
  },
  { aliases: ['aviso', 'avisos', 'notificacao', 'notificacoes'], href: '/dashboard/notificacoes' },
  { aliases: ['analytics', 'desempenho'], href: '/dashboard/analytics' },
  { aliases: ['conta', 'perfil'], href: '/dashboard/perfil' },
  { aliases: ['configuracao', 'configuracoes'], href: '/dashboard/configuracoes' },
] as const;
