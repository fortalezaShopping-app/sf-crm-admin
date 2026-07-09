'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Pencil, Plus, RefreshCcw, Settings, Trash2, X } from 'lucide-react';

import {
  ApiError,
  createConfiguracao,
  deleteConfiguracao,
  listConfiguracoes,
  updateConfiguracao,
  type Configuracao,
} from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

type FormState = {
  chave: string;
  descricao: string;
  valor: string;
};

const initialFormState: FormState = {
  chave: '',
  descricao: '',
  valor: '',
};

export function ConfiguracoesClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [configuracoes, setConfiguracoes] = useState<Configuracao[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadConfiguracoes();
  }, []);

  async function loadConfiguracoes() {
    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      setConfiguracoes(await listConfiguracoes(session.token));
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
      const payload = {
        chave: form.chave,
        descricao: form.descricao || undefined,
        valor: form.valor,
      };

      if (editingId) {
        await updateConfiguracao(session.token, editingId, payload);
      } else {
        await createConfiguracao(session.token, payload);
      }

      setEditingId(null);
      setForm(initialFormState);
      setMessage(
        editingId ? 'Configuracao atualizada com sucesso.' : 'Configuracao criada com sucesso.',
      );
      await loadConfiguracoes();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(configuracao: Configuracao) {
    const session = getAdminSessionSnapshot();

    if (!session?.token || !configuracao.id) {
      return;
    }

    if (!window.confirm(`Remover a configuracao ${configuracao.chave ?? configuracao.id}?`)) {
      return;
    }

    setActionId(`delete-${configuracao.id}`);
    setMessage(null);

    try {
      await deleteConfiguracao(session.token, configuracao.id);
      setMessage('Configuracao removida com sucesso.');
      await loadConfiguracoes();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  function startEditing(configuracao: Configuracao) {
    if (!configuracao.id) {
      return;
    }

    setEditingId(configuracao.id);
    setForm({
      chave: configuracao.chave ?? '',
      descricao: configuracao.descricao ?? '',
      valor: configuracao.valor ?? '',
    });
    setMessage(null);
  }

  function cancelEditing() {
    setEditingId(null);
    setForm(initialFormState);
    setMessage(null);
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Sistema</p>
          <h1>Configuracoes</h1>
          <p>Parametros operacionais para manter o backoffice alinhado com a API.</p>
        </div>

        <button className="ghost-button" onClick={() => void loadConfiguracoes()} type="button">
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="management-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Parametros registados</h2>
            <span className="count-pill">{configuracoes.length}</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Chave</th>
                <th>Valor</th>
                <th>Atualizado</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {configuracoes.length > 0 ? (
                configuracoes.map((configuracao) => (
                  <tr key={configuracao.id ?? configuracao.chave}>
                    <td>
                      <span className="table-title">
                        <strong>{configuracao.chave ?? 'Sem chave'}</strong>
                        <span>{configuracao.descricao ?? 'Sem descricao'}</span>
                      </span>
                    </td>
                    <td>{configuracao.valor ?? '-'}</td>
                    <td>{formatDate(configuracao.updatedAt)}</td>
                    <td>
                      <span className="table-actions">
                        <button
                          className="table-action"
                          disabled={!configuracao.id}
                          onClick={() => startEditing(configuracao)}
                          type="button"
                        >
                          <Pencil aria-hidden size={14} />
                          Editar
                        </button>
                        <button
                          className="table-action table-action--danger"
                          disabled={!configuracao.id || actionId === `delete-${configuracao.id}`}
                          onClick={() => void handleDelete(configuracao)}
                          type="button"
                        >
                          <Trash2 aria-hidden size={14} />
                          Remover
                        </button>
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4}>
                    {isLoading ? 'A carregar...' : 'Sem configuracoes registadas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>{editingId ? 'Editar configuracao' : 'Nova configuracao'}</h2>
            <Settings aria-hidden size={18} />
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              Chave
              <input
                onChange={(event) => setForm({ ...form, chave: event.target.value })}
                required
                value={form.chave}
              />
            </label>
            <label>
              Valor
              <input
                onChange={(event) => setForm({ ...form, valor: event.target.value })}
                required
                value={form.valor}
              />
            </label>
            <label>
              Descricao
              <textarea
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                rows={3}
                value={form.descricao}
              />
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Plus aria-hidden size={16} />
              {isSubmitting
                ? 'A guardar...'
                : editingId
                  ? 'Guardar alteracoes'
                  : 'Criar configuracao'}
            </button>

            {editingId ? (
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

function formatDate(value: string | undefined) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-AO', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getMessageClassName(message: string) {
  return message.includes('sucesso') ? 'form-success' : 'form-error';
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar configuracoes.';
}
