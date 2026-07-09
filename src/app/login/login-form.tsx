'use client';

import { FormEvent, useState } from 'react';
import { LockKeyhole, LogIn, Mail, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';

import {
  ApiError,
  adminLogin,
  findUtilizadorByEmail,
  getMe,
  resolveBackofficeRole,
} from '@/lib/api';
import { createAdminSession, saveAdminSession } from '@/lib/auth';

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
      const response = await adminLogin({ email, password });

      if (!response.token) {
        throw new Error('A API respondeu sem token.');
      }

      const currentUser = await getMe(response.token);
      const userDetails = currentUser.id
        ? currentUser
        : await findUtilizadorByEmail(response.token, currentUser.email ?? email).catch(
            () => currentUser,
          );
      const resolvedRole = await resolveBackofficeRole(response.token, userDetails.id);
      const session = createAdminSession(response, {
        ...userDetails,
        role: userDetails.role ?? resolvedRole,
      });

      saveAdminSession(session);
      router.replace('/dashboard');
      router.refresh();
    } catch (loginError) {
      setError(getLoginErrorMessage(loginError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="login-form" onSubmit={handleSubmit}>
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
        Sessao guardada no navegador para acelerar o desenvolvimento inicial.
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
