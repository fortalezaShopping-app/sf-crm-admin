'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Ban, Plus, RefreshCcw, Store } from 'lucide-react';

import { ApiError, createLoja, deactivateLoja, listLojas, updateLojaNivel, type Loja } from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

type FormState = {
  email: string;
  endereco: string;
  nivelAdesao: string;
  nif: string;
  nome: string;
  telefone: string;
};

const initialFormState: FormState = {
  email: '',
  endereco: '',
  nivelAdesao: '1',
  nif: '',
  nome: '',
  telefone: '',
};

export function LojasClient() {
  const [actionId, setActionId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadLojas();
  }, []);

  async function loadLojas() {
    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      setLojas(await listLojas(session.token));
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
      await createLoja(session.token, {
        email: form.email || undefined,
        endereco: form.endereco || undefined,
        nivelAdesao: Number(form.nivelAdesao) || 1,
        nif: form.nif,
        nome: form.nome,
        telefone: form.telefone || undefined,
      });
      setForm(initialFormState);
      setMessage('Loja criada com sucesso.');
      await loadLojas();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleNivelChange(loja: Loja, nivelAdesao: number) {
    const session = getAdminSessionSnapshot();

    if (!session?.token || !loja.id) {
      return;
    }

    setActionId(`nivel-${loja.id}`);
    setMessage(null);

    try {
      await updateLojaNivel(session.token, loja.id, { nivelAdesao });
      setMessage('Nivel da loja atualizado com sucesso.');
      await loadLojas();
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  async function handleDeactivate(loja: Loja) {
    const session = getAdminSessionSnapshot();

    if (!session?.token || !loja.id) {
      return;
    }

    if (!window.confirm(`Desativar a loja ${loja.nome ?? loja.id}?`)) {
      return;
    }

    setActionId(`deactivate-${loja.id}`);
    setMessage(null);

    try {
      await deactivateLoja(session.token, loja.id);
      setMessage('Loja desativada com sucesso.');
      await loadLojas();
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
          <p className="eyebrow">Gestao comercial</p>
          <h1>Lojas</h1>
          <p>Cadastro e acompanhamento das lojas aderentes ao programa de pontos.</p>
        </div>

        <button className="ghost-button" onClick={() => void loadLojas()} type="button">
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="management-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Lojas registadas</h2>
            <span className="count-pill">{lojas.length}</span>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>Loja</th>
                <th>NIF</th>
                <th>Nivel</th>
                <th>Estado</th>
                <th>Acoes</th>
              </tr>
            </thead>
            <tbody>
              {lojas.length > 0 ? (
                lojas.map((loja) => (
                  <tr key={loja.id ?? loja.nome}>
                    <td>
                      <span className="table-title">
                        <strong>{loja.nome ?? 'Loja sem nome'}</strong>
                        <span>{loja.email ?? loja.telefone ?? loja.endereco ?? 'Sem contacto'}</span>
                      </span>
                    </td>
                    <td>{loja.nif ?? '-'}</td>
                    <td>
                      <select
                        aria-label={`Nivel da loja ${loja.nome ?? loja.id}`}
                        className="table-select"
                        disabled={!loja.id || actionId === `nivel-${loja.id}`}
                        onChange={(event) => void handleNivelChange(loja, Number(event.target.value))}
                        value={loja.nivelAdesao ?? 1}
                      >
                        {[1, 2, 3, 4, 5].map((nivel) => (
                          <option key={nivel} value={nivel}>
                            {nivel}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <span
                        className={
                          loja.estado === 'ATIVA'
                            ? 'badge badge--success'
                            : 'badge badge--warning'
                        }
                      >
                        {loja.estado ?? 'Sem estado'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="table-action table-action--danger"
                        disabled={!loja.id || actionId === `deactivate-${loja.id}`}
                        onClick={() => void handleDeactivate(loja)}
                        type="button"
                      >
                        <Ban aria-hidden size={14} />
                        Desativar
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5}>{isLoading ? 'A carregar...' : 'Sem lojas registadas.'}</td>
                </tr>
              )}
            </tbody>
          </table>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Nova loja</h2>
            <Store aria-hidden size={18} />
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
              NIF
              <input
                onChange={(event) => setForm({ ...form, nif: event.target.value })}
                required
                value={form.nif}
              />
            </label>
            <label>
              Email
              <input
                onChange={(event) => setForm({ ...form, email: event.target.value })}
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
              Endereco
              <input
                onChange={(event) => setForm({ ...form, endereco: event.target.value })}
                value={form.endereco}
              />
            </label>
            <label>
              Nivel de adesao
              <input
                min="1"
                onChange={(event) => setForm({ ...form, nivelAdesao: event.target.value })}
                type="number"
                value={form.nivelAdesao}
              />
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Plus aria-hidden size={16} />
              {isSubmitting ? 'A guardar...' : 'Criar loja'}
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

  return 'Nao foi possivel carregar lojas.';
}
