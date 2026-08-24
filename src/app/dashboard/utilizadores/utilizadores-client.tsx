'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Ban, CircleCheck, Pencil, Plus, RefreshCcw, UserCog, X } from 'lucide-react';

import { Pagination } from '@/components/admin/Pagination';
import {
  ApiError,
  activateUtilizador,
  associateUtilizadorLoja,
  clearAdminApiCache,
  createUtilizador,
  deactivateUtilizador,
  listLojas,
  listUtilizadores,
  updateUtilizador,
  type Loja,
  type UserRole,
  type Utilizador,
} from '@/lib/api';

type InternalRole = Exclude<UserRole, 'CUSTOMER'>;

type FormState = {
  cargo: string;
  email: string;
  lojaId: string;
  nome: string;
  password: string;
  role: InternalRole;
  telefone: string;
};

const roleOptions: Array<{ label: string; value: InternalRole }> = [
  { label: 'Administrador', value: 'ADMIN' },
  { label: 'Gestor', value: 'MANAGER' },
  { label: 'Utilizador de loja', value: 'STORE_USER' },
];

const initialFormState: FormState = {
  cargo: '',
  email: '',
  lojaId: '',
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
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedRole, setSelectedRole] = useState<InternalRole>('ADMIN');
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [utilizadores, setUtilizadores] = useState<Utilizador[]>([]);

  const loadUtilizadores = useCallback(
    async (targetPage: number, bypassCache = false) => {
      setIsLoading(true);
      setMessage(null);

      try {
        if (bypassCache) {
          clearAdminApiCache();
        }

        const result = await listUtilizadores(selectedRole, { page: targetPage, size: 10 });
        setUtilizadores(result.items);
        setTotalItems(result.totalItems);
        setTotalPages(result.totalPages);
      } catch (error) {
        setMessage(getErrorMessage(error));
      } finally {
        setIsLoading(false);
      }
    },
    [selectedRole],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadUtilizadores(page), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadUtilizadores, page]);

  useEffect(() => {
    listLojas({ size: 100 })
      .then((result) => setLojas(result.items))
      .catch(() => setLojas([]));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      if (editingUserId) {
        await updateUtilizador(editingUserId, {
          email: form.email,
          nome: form.nome,
          telefone: form.telefone || undefined,
        });

        if (form.lojaId) {
          await associateUtilizadorLoja(editingUserId, Number(form.lojaId), form.cargo || undefined);
        }
      } else {
        await createUtilizador({
          cargo: form.cargo || undefined,
          email: form.email,
          lojaId: form.lojaId ? Number(form.lojaId) : undefined,
          nome: form.nome,
          password: form.password,
          role: form.role,
          telefone: form.telefone || undefined,
        });
      }

      setMessage(
        editingUserId ? 'Utilizador atualizado com sucesso.' : 'Utilizador criado com sucesso.',
      );
      resetForm();
      setPage(0);
      await loadUtilizadores(0, true);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeactivate(utilizador: Utilizador) {
    if (
      !utilizador.id ||
      !window.confirm(`Desativar o utilizador ${utilizador.nome ?? utilizador.email ?? utilizador.id}?`)
    ) {
      return;
    }

    setActionId(`deactivate-${utilizador.id}`);
    setMessage(null);

    try {
      await deactivateUtilizador(utilizador.id);
      setMessage('Utilizador desativado com sucesso.');
      await loadUtilizadores(page, true);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  async function handleActivate(utilizador: Utilizador) {
    if (
      !utilizador.id ||
      !window.confirm(`Ativar o utilizador ${utilizador.nome ?? utilizador.email ?? utilizador.id}?`)
    ) {
      return;
    }

    setActionId(`activate-${utilizador.id}`);
    setMessage(null);

    try {
      await activateUtilizador(utilizador.id);
      setMessage('Utilizador ativado com sucesso.');
      await loadUtilizadores(page, true);
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
      cargo: '',
      email: utilizador.email ?? '',
      lojaId: '',
      nome: utilizador.nome ?? '',
      password: '',
      role: toInternalRole(utilizador.role, selectedRole),
      telefone: utilizador.telefone ?? '',
    });
    setMessage(null);
  }

  function resetForm() {
    setEditingUserId(null);
    setForm({ ...initialFormState, role: selectedRole });
  }

  function handleRoleFilter(role: InternalRole) {
    setSelectedRole(role);
    setPage(0);
    setEditingUserId(null);
    setForm({ ...initialFormState, role });
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Acessos internos</p>
          <h1>Utilizadores</h1>
          <p>Administre contas da equipa e acessos associados a lojas.</p>
        </div>

        <div className="topbar-actions">
          <select
            aria-label="Filtrar por role"
            className="table-select"
            onChange={(event) => handleRoleFilter(event.target.value as InternalRole)}
            value={selectedRole}
          >
            {roleOptions.map((role) => (
              <option key={role.value} value={role.value}>
                {role.label}
              </option>
            ))}
          </select>
          <button
            className="ghost-button"
            onClick={() => void loadUtilizadores(page, true)}
            type="button"
          >
            <RefreshCcw aria-hidden size={16} />
            Atualizar
          </button>
        </div>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="management-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>{roleOptions.find((role) => role.value === selectedRole)?.label}</h2>
            <span className="count-pill">{totalItems}</span>
          </div>

          <div className="table-scroll">
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
                      <td>{formatRole(toInternalRole(utilizador.role, selectedRole))}</td>
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
                          {utilizador.estado === 'ATIVO' ? (
                            <button
                              className="table-action table-action--danger"
                              disabled={!utilizador.id || actionId === `deactivate-${utilizador.id}`}
                              onClick={() => void handleDeactivate(utilizador)}
                              type="button"
                            >
                              <Ban aria-hidden size={14} />
                              Desativar
                            </button>
                          ) : (
                            <button
                              className="table-action"
                              disabled={!utilizador.id || actionId === `activate-${utilizador.id}`}
                              onClick={() => void handleActivate(utilizador)}
                              type="button"
                            >
                              <CircleCheck aria-hidden size={14} />
                              Ativar
                            </button>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5}>
                      {isLoading ? 'A carregar...' : 'Sem utilizadores nesta categoria.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            isLoading={isLoading}
            onPageChange={setPage}
            page={page}
            totalItems={totalItems}
            totalPages={totalPages}
          />
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
                  setForm({ ...form, role: event.target.value as InternalRole })
                }
                value={form.role}
              >
                {roleOptions.map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </label>

            {form.role === 'STORE_USER' ? (
              <>
                <label>
                  Loja
                  <select
                    onChange={(event) => setForm({ ...form, lojaId: event.target.value })}
                    required
                    value={form.lojaId}
                  >
                    <option value="">Selecione uma loja</option>
                    {lojas.map((loja) => (
                      <option key={loja.id} value={loja.id}>
                        {loja.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Cargo
                  <input
                    onChange={(event) => setForm({ ...form, cargo: event.target.value })}
                    value={form.cargo}
                  />
                </label>
              </>
            ) : null}

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
              <button className="ghost-button" onClick={resetForm} type="button">
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

function formatRole(role: InternalRole) {
  return roleOptions.find((option) => option.value === role)?.label ?? role;
}

function toInternalRole(role: UserRole | undefined, fallback: InternalRole): InternalRole {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'STORE_USER' ? role : fallback;
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
