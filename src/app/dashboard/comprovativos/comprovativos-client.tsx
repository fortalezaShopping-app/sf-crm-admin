'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, ReceiptText, Send, XCircle } from 'lucide-react';

import { ApiError, validarFatura, type ValidarFaturaRequest } from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

type FormState = {
  estado: ValidarFaturaRequest['estado'];
  faturaId: string;
  observacao: string;
};

const initialFormState: FormState = {
  estado: 'APROVADA',
  faturaId: '',
  observacao: '',
};

export function ComprovativosClient() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await validarFatura(session.token, form.faturaId, {
        estado: form.estado,
        observacao: form.observacao || undefined,
      });
      setForm(initialFormState);
      setMessage('Fatura validada com sucesso.');
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
          <p className="eyebrow">Comprovativos</p>
          <h1>Validacao de faturas</h1>
          <p>Acompanhe e valide comprovativos submetidos pelos clientes no app mobile.</p>
        </div>

        <span className="status-pill status-pill--danger">
          <span className="status-dot" />
          Listagem pendente na API
        </span>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Estado atual da integracao</h2>
            <ReceiptText aria-hidden size={18} />
          </div>

          <div className="helper-panel">
            <p>
              A documentacao atual expoe a rota de validacao por ID, mas ainda nao expoe uma rota
              para listar faturas pendentes. Por isso deixei este painel pronto para validar um
              comprovativo especifico assim que tiver o ID vindo da API ou dos testes.
            </p>

            <div className="quick-list quick-list--compact">
              <span className="integration-step">
                <CheckCircle2 aria-hidden size={17} />
                <strong>PATCH /api/faturas/{'{id}'}/validar</strong>
              </span>
              <span className="integration-step">
                <XCircle aria-hidden size={17} />
                <strong>GET de listagem ainda nao disponivel</strong>
              </span>
            </div>
          </div>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Validar por ID</h2>
            <ReceiptText aria-hidden size={18} />
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              ID da fatura
              <input
                onChange={(event) => setForm({ ...form, faturaId: event.target.value })}
                required
                value={form.faturaId}
              />
            </label>
            <label>
              Decisao
              <select
                onChange={(event) =>
                  setForm({
                    ...form,
                    estado: event.target.value as FormState['estado'],
                  })
                }
                value={form.estado}
              >
                <option value="APROVADA">Aprovar</option>
                <option value="REJEITADA">Rejeitar</option>
              </select>
            </label>
            <label>
              Observacao
              <textarea
                onChange={(event) => setForm({ ...form, observacao: event.target.value })}
                rows={4}
                value={form.observacao}
              />
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Send aria-hidden size={16} />
              {isSubmitting ? 'A enviar...' : 'Validar fatura'}
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel validar a fatura.';
}

function getMessageClassName(message: string) {
  return message.includes('sucesso') ? 'form-success' : 'form-error';
}
