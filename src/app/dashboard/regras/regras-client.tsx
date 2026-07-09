'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Plus, RefreshCcw, Trash2, Trophy } from 'lucide-react';

import {
  ApiError,
  createRegraPontuacao,
  deleteRegraPontuacao,
  listRegrasPontuacao,
  type RegraPontuacao,
} from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

type FormState = {
  ativo: 'true' | 'false';
  multiplicador: string;
  nome: string;
  pontosPorValor: string;
  prazoSubmissaoDias: string;
  validadePontosMeses: string;
  valorMinimo: string;
  valorPorPonto: string;
};

const initialFormState: FormState = {
  ativo: 'true',
  multiplicador: '1',
  nome: '',
  pontosPorValor: '1',
  prazoSubmissaoDias: '7',
  validadePontosMeses: '12',
  valorMinimo: '0',
  valorPorPonto: '1000',
};

export function RegrasClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [regras, setRegras] = useState<RegraPontuacao[]>([]);

  useEffect(() => {
    void loadRegras();
  }, []);

  async function loadRegras() {
    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      setRegras(await listRegrasPontuacao(session.token));
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
      await createRegraPontuacao(session.token, {
        ativo: form.ativo === 'true',
        multiplicador: Number(form.multiplicador) || 1,
        nome: form.nome,
        pontosPorValor: Number(form.pontosPorValor) || 1,
        prazoSubmissaoDias: Number(form.prazoSubmissaoDias) || 7,
        validadePontosMeses: Number(form.validadePontosMeses) || 12,
        valorMinimo: Number(form.valorMinimo) || 0,
        valorPorPonto: Number(form.valorPorPonto) || 1000,
      });
      setForm(initialFormState);
      setMessage('Regra de pontuacao criada com sucesso.');
      await loadRegras();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(regra: RegraPontuacao) {
    const session = getAdminSessionSnapshot();

    if (!session?.token || !regra.id) {
      return;
    }

    if (!window.confirm(`Remover a regra ${regra.nome ?? regra.id}?`)) {
      return;
    }

    setActionId(`delete-${regra.id}`);
    setMessage(null);

    try {
      await deleteRegraPontuacao(session.token, regra.id);
      setMessage('Regra de pontuacao removida com sucesso.');
      await loadRegras();
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
          <p className="eyebrow">Pontos</p>
          <h1>Regras de pontuacao</h1>
          <p>Parametros que definem como os clientes acumulam pontos nas lojas aderentes.</p>
        </div>

        <button className="ghost-button" onClick={() => void loadRegras()} type="button">
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="management-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Regras ativas</h2>
            <span className="count-pill">{regras.length}</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Regra</th>
                <th>Valor por ponto</th>
                <th>Multiplicador</th>
                <th>Validade</th>
                <th>Estado</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {regras.length > 0 ? (
                regras.map((regra) => (
                  <tr key={regra.id ?? regra.nome}>
                    <td>
                      <span className="table-title">
                        <strong>{regra.nome ?? 'Regra sem nome'}</strong>
                        <span>Minimo: {formatCurrency(regra.valorMinimo ?? 0)}</span>
                      </span>
                    </td>
                    <td>{formatCurrency(regra.valorPorPonto ?? 0)}</td>
                    <td>{regra.multiplicador ?? 1}x</td>
                    <td>{regra.validadePontosMeses ?? 0} meses</td>
                    <td>
                      <span className={regra.ativo ? 'badge badge--success' : 'badge badge--warning'}>
                        {regra.ativo ? 'Ativa' : 'Inativa'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-action table-action--danger"
                        disabled={!regra.id || actionId === `delete-${regra.id}`}
                        onClick={() => void handleDelete(regra)}
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
                    {isLoading ? 'A carregar...' : 'Sem regras de pontuacao registadas.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Nova regra</h2>
            <Trophy aria-hidden size={18} />
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
              Valor minimo
              <input
                min="0"
                onChange={(event) => setForm({ ...form, valorMinimo: event.target.value })}
                step="0.01"
                type="number"
                value={form.valorMinimo}
              />
            </label>
            <label>
              Valor por ponto
              <input
                min="0"
                onChange={(event) => setForm({ ...form, valorPorPonto: event.target.value })}
                required
                step="0.01"
                type="number"
                value={form.valorPorPonto}
              />
            </label>
            <label>
              Pontos por valor
              <input
                min="1"
                onChange={(event) => setForm({ ...form, pontosPorValor: event.target.value })}
                required
                type="number"
                value={form.pontosPorValor}
              />
            </label>
            <label>
              Multiplicador
              <input
                min="1"
                onChange={(event) => setForm({ ...form, multiplicador: event.target.value })}
                required
                step="0.01"
                type="number"
                value={form.multiplicador}
              />
            </label>
            <label>
              Prazo de submissao em dias
              <input
                min="1"
                onChange={(event) =>
                  setForm({ ...form, prazoSubmissaoDias: event.target.value })
                }
                type="number"
                value={form.prazoSubmissaoDias}
              />
            </label>
            <label>
              Validade dos pontos em meses
              <input
                min="1"
                onChange={(event) =>
                  setForm({ ...form, validadePontosMeses: event.target.value })
                }
                type="number"
                value={form.validadePontosMeses}
              />
            </label>
            <label>
              Estado
              <select
                onChange={(event) =>
                  setForm({
                    ...form,
                    ativo: event.target.value as FormState['ativo'],
                  })
                }
                value={form.ativo}
              >
                <option value="true">Ativa</option>
                <option value="false">Inativa</option>
              </select>
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Plus aria-hidden size={16} />
              {isSubmitting ? 'A guardar...' : 'Criar regra'}
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

function formatCurrency(value: number) {
  return `${new Intl.NumberFormat('pt-AO').format(value)} Kz`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar regras de pontuacao.';
}
