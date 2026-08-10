'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  ApiError,
  loginAdminSession,
} from '@/lib/api';

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
      await loginAdminSession({ email, password });
      router.replace('/dashboard');
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
      className="login-form"
      method="post"
      onSubmit={handleSubmit}
    >
      <div className="field">
        <label htmlFor="email">Email</label>
        <div className="input-shell">
          <Mail aria-hidden size={18} strokeWidth={2.2} />
          <input
            autoComplete="email"
            id="email"
            inputMode="email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="admin@shopping.co.ao"
            required
            type="email"
            value={email}
          />
        </div>
      </div>

      <div className="field">
        <label htmlFor="password">Senha</label>
        <div className="input-shell">
          <LockKeyhole aria-hidden size={18} strokeWidth={2.2} />
          <input
            autoComplete="current-password"
            id="password"
            name="password"
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Digite a senha"
            required
            type="password"
            value={password}
          />
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <button className="primary-button" disabled={isSubmitting} type="submit">
        <LogIn aria-hidden size={18} strokeWidth={2.4} />
        {isSubmitting ? 'A entrar...' : 'Entrar'}
      </button>

      <p className="security-note">
        <ShieldCheck aria-hidden size={18} strokeWidth={2.2} />
        Sessao protegida por cookie seguro e inacessivel ao JavaScript do navegador.
      </p>
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
