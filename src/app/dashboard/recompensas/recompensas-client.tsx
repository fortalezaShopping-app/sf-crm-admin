'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Gift, Plus, RefreshCcw, Trash2 } from 'lucide-react';

import {
  ApiError,
  createRecompensa,
  deleteRecompensa,
  listRecompensas,
  type Recompensa,
  type RecompensaRequest,
} from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

type FormState = {
  descricao: string;
  estado: NonNullable<RecompensaRequest['estado']>;
  nome: string;
  pontosNecessarios: string;
  stock: string;
  tipo: NonNullable<RecompensaRequest['tipo']>;
};

const initialFormState: FormState = {
  descricao: '',
  estado: 'ATIVA',
  nome: '',
  pontosNecessarios: '100',
  stock: '1',
  tipo: 'BRINDE',
};

export function RecompensasClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [recompensas, setRecompensas] = useState<Recompensa[]>([]);

  useEffect(() => {
    void loadRecompensas();
  }, []);

  async function loadRecompensas() {
    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      setRecompensas(await listRecompensas(session.token));
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
      await createRecompensa(session.token, {
        descricao: form.descricao || undefined,
        estado: form.estado,
        nome: form.nome,
        pontosNecessarios: Number(form.pontosNecessarios) || 0,
        stock: Number(form.stock) || 0,
        tipo: form.tipo,
      });
      setForm(initialFormState);
      setMessage('Recompensa criada com sucesso.');
      await loadRecompensas();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(recompensa: Recompensa) {
    const session = getAdminSessionSnapshot();

    if (!session?.token || !recompensa.id) {
      return;
    }

    if (!window.confirm(`Remover a recompensa ${recompensa.nome ?? recompensa.id}?`)) {
      return;
    }

    setActionId(`delete-${recompensa.id}`);
    setMessage(null);

    try {
      await deleteRecompensa(session.token, recompensa.id);
      setMessage('Recompensa removida com sucesso.');
      await loadRecompensas();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Fidelizacao</p>
          <h1>Recompensas</h1>
          <p>Beneficios disponiveis para resgate pelos clientes no app mobile.</p>
        </div>

        <button className="ghost-button" onClick={() => void loadRecompensas()} type="button">
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="management-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Catalogo de recompensas</h2>
            <span className="count-pill">{recompensas.length}</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Recompensa</th>
                <th>Tipo</th>
                <th>Pontos</th>
                <th>Stock</th>
                <th>Estado</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {recompensas.length > 0 ? (
                recompensas.map((recompensa) => (
                  <tr key={recompensa.id ?? recompensa.nome}>
                    <td>
                      <span className="table-title">
                        <strong>{recompensa.nome ?? 'Sem nome'}</strong>
                        <span>{recompensa.descricao ?? 'Sem descricao'}</span>
                      </span>
                    </td>
                    <td>{recompensa.tipo ?? '-'}</td>
                    <td>{recompensa.pontosNecessarios ?? 0}</td>
                    <td>{recompensa.stock ?? 0}</td>
                    <td>
                      <span
                        className={
                          recompensa.estado === 'ATIVA'
                            ? 'badge badge--success'
                            : 'badge badge--warning'
                        }
                      >
                        {recompensa.estado ?? 'Sem estado'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-action table-action--danger"
                        disabled={!recompensa.id || actionId === `delete-${recompensa.id}`}
                        onClick={() => void handleDelete(recompensa)}
                        type="button"
                      >
                        <Trash2 aria-hidden size={14} />
                        Remover
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6}>
                    {isLoading ? 'A carregar...' : 'Sem recompensas registadas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Nova recompensa</h2>
            <Gift aria-hidden size={18} />
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
              Descricao
              <textarea
                onChange={(event) => setForm({ ...form, descricao: event.target.value })}
                rows={3}
                value={form.descricao}
              />
            </label>
            <label>
              Tipo
              <select
                onChange={(event) =>
                  setForm({
                    ...form,
                    tipo: event.target.value as FormState['tipo'],
                  })
                }
                value={form.tipo}
              >
                <option value="BRINDE">Brinde</option>
                <option value="DESCONTO">Desconto</option>
                <option value="CUPAO">Cupao</option>
                <option value="SERVICO">Servico</option>
              </select>
            </label>
            <label>
              Pontos necessarios
              <input
                min="0"
                onChange={(event) => setForm({ ...form, pontosNecessarios: event.target.value })}
                required
                type="number"
                value={form.pontosNecessarios}
              />
            </label>
            <label>
              Stock
              <input
                min="0"
                onChange={(event) => setForm({ ...form, stock: event.target.value })}
                required
                type="number"
                value={form.stock}
              />
            </label>
            <label>
              Estado
              <select
                onChange={(event) =>
                  setForm({
                    ...form,
                    estado: event.target.value as FormState['estado'],
                  })
                }
                value={form.estado}
              >
                <option value="ATIVA">Ativa</option>
                <option value="INATIVA">Inativa</option>
                <option value="ESGOTADA">Esgotada</option>
              </select>
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Plus aria-hidden size={16} />
              {isSubmitting ? 'A guardar...' : 'Criar recompensa'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}

function getMessageClassName(message: string) {
  return message.includes('sucesso') ? 'form-success' : 'form-error';
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar recompensas.';
}
