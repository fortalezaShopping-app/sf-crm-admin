import { redirect } from 'next/navigation';

import { ShoppingLogo } from '@/components/brand/ShoppingLogo';
import { getAuthenticatedAdminSession } from '@/lib/server-auth';

import { LoginForm } from './login-form';
import styles from './login.module.css';

export default async function LoginPage() {
  if (await getAuthenticatedAdminSession()) {
    redirect('/dashboard');
  }

  return (
    <main className={styles.page}>
      <div className={styles.loginShell}>
        <h1 className={styles.panelTitle}>Admin Panel</h1>

        <section className={styles.card} aria-labelledby="login-title">
          <div className={styles.logo}>
            <ShoppingLogo size="sm" />
          </div>

          <header className={styles.header}>
            <h2 id="login-title">Seja bem-vindo</h2>
            <p>Insira os seus dados para iniciar sessão</p>
          </header>

          <LoginForm />
        </section>
      </div>
    </main>
  );
}
