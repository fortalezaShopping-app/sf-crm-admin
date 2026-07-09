'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Ban, Pencil, Plus, RefreshCcw, UserCog, X } from 'lucide-react';

import {
  ApiError,
  createUtilizador,
  deactivateUtilizador,
  listUtilizadores,
  updateUtilizador,
  type Utilizador,
  type UtilizadorRequest,
} from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

type FormState = {
  email: string;
  nome: string;
  password: string;
  role: NonNullable<UtilizadorRequest['role']>;
  telefone: string;
};

const initialFormState: FormState = {
  email: '',
  nome: '',
  password: '',
  role: 'ADMIN',
  telefone: '',
};

export function UtilizadoresClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);

  useEffect(() => {
    void loadUtilizadores();
  }, []);

  async function loadUtilizadores() {
    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      setUtilizadores(await listUtilizadores(session.token));
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      if (editingUserId) {
        await updateUtilizador(session.token, editingUserId, {
          email: form.email,
          nome: form.nome,
          telefone: form.telefone || undefined,
        });
      } else {
        await createUtilizador(session.token, {
          email: form.email,
          nome: form.nome,
          password: form.password,
          role: form.role,
          telefone: form.telefone || undefined,
        });
      }
      setForm(initialFormState);
      setEditingUserId(null);
      setMessage(editingUserId ? 'Utilizador atualizado com sucesso.' : 'Utilizador criado com sucesso.');
      await loadUtilizadores();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(utilizador: Utilizador) {
    const session = getAdminSessionSnapshot();

    if (!session?.token || !utilizador.id) {
      return;
    }

    if (!window.confirm(`Desativar o utilizador ${utilizador.nome ?? utilizador.email ?? utilizador.id}?`)) {
      return;
    }

    setActionId(`deactivate-${utilizador.id}`);
    setMessage(null);

    try {
      await deactivateUtilizador(session.token, utilizador.id);
      setMessage('Utilizador desativado com sucesso.');
      await loadUtilizadores();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  function startEditing(utilizador: Utilizador) {
    if (!utilizador.id) {
      return;
    }

    setEditingUserId(utilizador.id);
    setForm({
      email: utilizador.email ?? '',
      nome: utilizador.nome ?? '',
      password: '',
      role: getFormRole(utilizador.role ?? utilizador.tipo),
      telefone: utilizador.telefone ?? '',
    });
    setMessage(null);
  }

  function cancelEditing() {
    setEditingUserId(null);
    setForm(initialFormState);
    setMessage(null);
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Backoffice</p>
          <h1>Utilizadores</h1>
          <p>Contas administrativas para equipa interna, gestores e lojistas.</p>
        </div>

        <button className="ghost-button" onClick={() => void loadUtilizadores()} type="button">
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="management-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Utilizadores registados</h2>
            <span className="count-pill">{utilizadores.length}</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Role</th>
                <th>Telefone</th>
                <th>Estado</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {utilizadores.length > 0 ? (
                utilizadores.map((utilizador) => (
                  <tr key={utilizador.id ?? utilizador.email}>
                    <td>
                      <span className="table-title">
                        <strong>{utilizador.nome ?? 'Sem nome'}</strong>
                        <span>{utilizador.email ?? 'Sem email'}</span>
                      </span>
                    </td>
                    <td>{utilizador.role ?? utilizador.tipo ?? '-'}</td>
                    <td>{utilizador.telefone ?? '-'}</td>
                    <td>
                      <span
                        className={
                          utilizador.estado === 'ATIVO'
                            ? 'badge badge--success'
                            : 'badge badge--warning'
                        }
                      >
                        {utilizador.estado ?? 'Sem estado'}
                      </span>
                    </td>
                    <td>
                      <span className="table-actions">
                        <button
                          className="table-action"
                          disabled={!utilizador.id}
                          onClick={() => startEditing(utilizador)}
                          type="button"
                        >
                          <Pencil aria-hidden size={14} />
                          Editar
                        </button>
                        <button
                          className="table-action table-action--danger"
                          disabled={!utilizador.id || actionId === `deactivate-${utilizador.id}`}
                          onClick={() => void handleDeactivate(utilizador)}
                          type="button"
                        >
                          <Ban aria-hidden size={14} />
                          Desativar
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>
                    {isLoading ? 'A carregar...' : 'Sem utilizadores registados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>{editingUserId ? 'Editar utilizador' : 'Novo utilizador'}</h2>
            <UserCog aria-hidden size={18} />
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Nome
              <input
                onChange={(event) => setForm({ ...form, nome: event.target.value })}
                required
                value={form.nome}
              />
            </label>
            <label>
              Email
              <input
                onChange={(event) => setForm({ ...form, email: event.target.value })}
                required
                type="email"
                value={form.email}
              />
            </label>
            <label>
              Telefone
              <input
                onChange={(event) => setForm({ ...form, telefone: event.target.value })}
                value={form.telefone}
              />
            </label>
            <label>
              Role
              <select
                disabled={Boolean(editingUserId)}
                onChange={(event) =>
                  setForm({
                    ...form,
                    role: event.target.value as FormState['role'],
                  })
                }
                value={form.role}
              >
                <option value="ADMIN">Admin</option>
                <option value="SUPER_ADMIN">Super admin</option>
                <option value="GESTOR">Gestor</option>
                <option value="LOJISTA">Lojista</option>
              </select>
            </label>
            {editingUserId ? null : (
              <label>
                Senha
                <input
                  minLength={8}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  required
                  type="password"
                  value={form.password}
                />
              </label>
            )}

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Plus aria-hidden size={16} />
              {isSubmitting
                ? 'A guardar...'
                : editingUserId
                  ? 'Guardar alteracoes'
                  : 'Criar utilizador'}
            </button>

            {editingUserId ? (
              <button className="ghost-button" onClick={cancelEditing} type="button">
                <X aria-hidden size={16} />
                Cancelar edicao
              </button>
            ) : null}
          </form>
        </article>
      </section>
    </div>
  );
}

function getFormRole(value: string | undefined): NonNullable<UtilizadorRequest['role']> {
  const normalized = `${value ?? ''}`.toUpperCase();

  if (normalized === 'SUPER_ADMIN' || normalized === 'GESTOR' || normalized === 'LOJISTA') {
    return normalized;
  }

  return 'ADMIN';
}

function getMessageClassName(message: string) {
  return message.includes('sucesso') ? 'form-success' : 'form-error';
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar utilizadores.';
}
