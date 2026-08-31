'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole, Mail } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  ApiError,
  loginAdminSession,
} from '@/lib/api';

import styles from './login.module.css';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await loginAdminSession({ email, password });
      router.replace(result.redirectTo);
      router.refresh();
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      action="/api/session/login"
      className={styles.form}
      method="post"
      onSubmit={handleSubmit}
    >
      <div className={styles.field}>
        <label className={styles.srOnly} htmlFor="email">
          Email
        </label>
        <div className={styles.inputShell}>
          <Mail aria-hidden size={17} strokeWidth={1.7} />
          <input
            autoComplete="email"
            id="email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.srOnly} htmlFor="password">
          Senha
        </label>
        <div className={styles.inputShell}>
          <LockKeyhole aria-hidden size={17} strokeWidth={1.7} />
          <input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Senha"
            required
            type="password"
            value={password}
          />
        </div>
      </div>

      {error ? (
        <p className={styles.formError} role="alert">
          {error}
        </p>
      ) : null}

      <button
        className={styles.submitButton}
        disabled={isSubmitting}
        type="submit"
      >
        {isSubmitting ? 'A iniciar...' : 'Iniciar sessão'}
      </button>
    </form>
  );
}

function getLoginErrorMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel iniciar sessao.';
}
