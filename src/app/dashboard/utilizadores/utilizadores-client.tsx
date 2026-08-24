'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Ban, CircleCheck, Pencil, Plus, RefreshCcw, Save, UserCog, X } from 'lucide-react';

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
type RoleFilter = UserRole | 'ALL';

type FormState = {
  cargo: string;
  email: string;
  lojaId: string;
  nome: string;
  password: string;
  role: UserRole;
  telefone: string;
};

const internalRoleOptions: Array<{ label: string; value: InternalRole }> = [
  { label: 'Administrador', value: 'ADMIN' },
  { label: 'Gestor', value: 'MANAGER' },
  { label: 'Utilizador de loja', value: 'STORE_USER' },
];

const roleFilterOptions: Array<{ label: string; value: RoleFilter }> = [
  { label: 'Todos os utilizadores', value: 'ALL' },
  { label: 'Clientes', value: 'CUSTOMER' },
  ...internalRoleOptions,
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
  const [editingUser, setEditingUser] = useState<Utilizador | null>(null);
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [selectedRole, setSelectedRole] = useState<RoleFilter>('ALL');
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

        const role = selectedRole === 'ALL' ? undefined : selectedRole;
        const result = await listUtilizadores(role, { page: targetPage, size: 10 });
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
        if (!isInternalRole(form.role)) {
          throw new Error('Clientes devem criar a conta através da aplicação mobile.');
        }

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
    setEditingUser(utilizador);
    setForm({
      cargo: '',
      email: utilizador.email ?? '',
      lojaId: '',
      nome: utilizador.nome ?? '',
      password: '',
      role: utilizador.role ?? 'CUSTOMER',
      telefone: utilizador.telefone ?? '',
    });
    setMessage(null);
  }

  function resetForm() {
    setEditingUserId(null);
    setEditingUser(null);
    setForm({ ...initialFormState, role: getCreationRole(selectedRole) });
  }

  function handleRoleFilter(role: RoleFilter) {
    setSelectedRole(role);
    setPage(0);
    setEditingUserId(null);
    setEditingUser(null);
    setForm({ ...initialFormState, role: getCreationRole(role) });
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Gestão de contas</p>
          <h1>Utilizadores</h1>
          <p>Consulte clientes e contas internas, atualize dados e controle o acesso ao sistema.</p>
        </div>

        <div className="topbar-actions">
          <select
            aria-label="Filtrar por role"
            className="table-select"
            onChange={(event) => handleRoleFilter(event.target.value as RoleFilter)}
            value={selectedRole}
          >
            {roleFilterOptions.map((role) => (
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
            <div>
              <h2>{roleFilterOptions.find((role) => role.value === selectedRole)?.label}</h2>
              <p className="panel-subtitle">Contas registadas na API do Shopping Fortaleza</p>
            </div>
            <span className="count-pill">{totalItems}</span>
          </div>

          <div className="table-scroll">
            <table className="admin-table users-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Role</th>
                  <th>Estado</th>
                  <th>Acoes</th>
                </tr>
              </thead>
              <tbody>
                {utilizadores.length > 0 ? (
                  utilizadores.map((utilizador) => (
                    <tr key={utilizador.id ?? utilizador.email}>
                      <td>
                        <span className="user-cell">
                          <span className="user-avatar" aria-hidden>
                            {getInitials(utilizador.nome, utilizador.email)}
                          </span>
                          <span className="table-title">
                            <strong>{utilizador.nome ?? 'Sem nome'}</strong>
                            <span>{utilizador.email ?? 'Sem email'}</span>
                          </span>
                        </span>
                      </td>
                      <td>{formatRoles(utilizador.roles, utilizador.role)}</td>
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
                    <td colSpan={4}>
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

          {editingUser ? (
            <div className="user-account-details">
              <dl className="detail-list">
                <div>
                  <dt>ID da conta</dt>
                  <dd>#{editingUser.id}</dd>
                </div>
                <div>
                  <dt>Tipo de conta</dt>
                  <dd>{formatRoles(editingUser.roles, editingUser.role)}</dd>
                </div>
                <div>
                  <dt>Autenticação em dois passos</dt>
                  <dd>{editingUser.twoFactorEnabled ? 'Ativa' : 'Inativa'}</dd>
                </div>
                <div>
                  <dt>Foto de perfil</dt>
                  <dd>{editingUser.photoUrl ? 'Configurada' : 'Não configurada'}</dd>
                </div>
                <div>
                  <dt>Último acesso</dt>
                  <dd>{formatDate(editingUser.ultimoLogin)}</dd>
                </div>
                <div>
                  <dt>Conta criada</dt>
                  <dd>{formatDate(editingUser.createdAt)}</dd>
                </div>
                <div>
                  <dt>Última atualização</dt>
                  <dd>{formatDate(editingUser.updatedAt)}</dd>
                </div>
              </dl>
            </div>
          ) : null}

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
                  setForm({ ...form, role: event.target.value as UserRole })
                }
                value={form.role}
              >
                {(editingUserId ? roleFilterOptions.filter((role) => role.value !== 'ALL') : internalRoleOptions).map((role) => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
              {editingUserId ? (
                <span className="form-hint">O papel da conta não pode ser alterado pela API atual.</span>
              ) : null}
            </label>

            {form.role === 'STORE_USER' ? (
              <>
                <label>
                  Loja
                  <select
                    onChange={(event) => setForm({ ...form, lojaId: event.target.value })}
                    required={!editingUserId}
                    value={form.lojaId}
                  >
                    <option value="">
                      {editingUserId ? 'Manter associação atual' : 'Selecione uma loja'}
                    </option>
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
              {editingUserId ? <Save aria-hidden size={16} /> : <Plus aria-hidden size={16} />}
              {isSubmitting
                ? 'A guardar...'
                : editingUserId
                  ? 'Guardar alterações'
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

function formatRole(role: UserRole) {
  return roleFilterOptions.find((option) => option.value === role)?.label ?? role;
}

function formatRoles(roles?: UserRole[], fallback?: UserRole) {
  const values = roles?.length ? roles : fallback ? [fallback] : [];
  return values.length ? values.map(formatRole).join(', ') : 'Sem papel';
}

function isInternalRole(role: UserRole): role is InternalRole {
  return role === 'ADMIN' || role === 'MANAGER' || role === 'STORE_USER';
}

function getCreationRole(filter: RoleFilter): InternalRole {
  return filter !== 'ALL' && isInternalRole(filter) ? filter : 'ADMIN';
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-AO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function getInitials(name?: string, email?: string) {
  const source = name?.trim() || email?.trim() || 'U';
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts.at(-1)?.[0] ?? ''}`.toUpperCase();
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
