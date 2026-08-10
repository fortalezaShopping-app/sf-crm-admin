'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Save, UserRound } from 'lucide-react';

import { ApiError, getProfile, updateProfile, type Profile } from '@/lib/api';

type FormState = {
  email: string;
  name: string;
  phone: string;
};

const initialFormState: FormState = { email: '', name: '', phone: '' };

export function PerfilClient() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    getProfile()
      .then((data) => {
        setProfile(data);
        setForm({ email: data.email ?? '', name: data.name ?? '', phone: data.phone ?? '' });
      })
      .catch((error) => setMessage(getErrorMessage(error)))
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const updated = await updateProfile({
        email: form.email,
        name: form.name,
        phone: form.phone || undefined,
      });
      setProfile(updated);
      setMessage('Perfil atualizado com sucesso.');
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Conta administrativa</p>
          <h1>Perfil</h1>
          <p>Mantenha os dados de contacto da sua conta atualizados.</p>
        </div>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Dados pessoais</h2>
            <UserRound aria-hidden size={18} />
          </div>
          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Nome
              <input
                disabled={isLoading}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
                value={form.name}
              />
            </label>
            <label>
              Email
              <input
                disabled={isLoading}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                type="email"
                value={form.email}
              />
            </label>
            <label>
              Telefone
              <input
                disabled={isLoading}
                onChange={(event) => setForm({ ...form, phone: event.target.value })}
                value={form.phone}
              />
            </label>
            <button className="primary-button" disabled={isLoading || isSubmitting} type="submit">
              <Save aria-hidden size={16} />
              {isSubmitting ? 'A guardar...' : 'Guardar perfil'}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Estado da conta</h2>
          </div>
          <div className="helper-panel">
            <dl className="detail-list">
              <div>
                <dt>Estado</dt>
                <dd>{profile?.status ?? '-'}</dd>
              </div>
              <div>
                <dt>Ultimo acesso</dt>
                <dd>{formatDate(profile?.lastLogin)}</dd>
              </div>
              <div>
                <dt>Conta criada</dt>
                <dd>{formatDate(profile?.createdAt)}</dd>
              </div>
            </dl>
          </div>
        </article>
      </section>
    </div>
  );
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('pt-AO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
}

function getMessageClassName(message: string) {
  return message.includes('sucesso') ? 'form-success' : 'form-error';
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar o perfil.';
}
