import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import { getSessionDestination } from '@/lib/admin-session';
import { getAuthenticatedAdminSession } from '@/lib/server-auth';

import { LoginForm } from './login-form';
import styles from './login.module.css';

export default async function LoginPage() {
  const session = await getAuthenticatedAdminSession();

  if (session) {
    redirect(getSessionDestination(session));
  }

  return (
    <main className={styles.page}>
      <div className={styles.loginShell}>
        <h1 className={styles.panelTitle}>Painel de gestão</h1>

        <section className={styles.card} aria-labelledby="login-title">
          <div className={styles.logo}>
            <ShoppingLogo size="sm" />
          </div>

          <header className={styles.header}>
            <h2 id="login-title">Seja bem-vindo</h2>
            <p>Insira os seus dados para iniciar sessão</p>
          </header>

          <LoginForm />

          <nav aria-label="Links institucionais" className={styles.legalLinks}>
            <Link href="/politica-de-privacidade">Política de privacidade</Link>
            <span aria-hidden>•</span>
            <a
              href="https://shoppingfortaleza.co.ao/"
              rel="noopener noreferrer"
              target="_blank"
            >
              Site oficial
              <ExternalLink aria-hidden size={11} strokeWidth={1.8} />
            </a>
          </nav>
        </section>
      </div>
    </main>
  );
}
