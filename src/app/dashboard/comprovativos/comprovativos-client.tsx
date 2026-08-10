'use client';

import { FormEvent, useState } from 'react';
import { CheckCircle2, ReceiptText, Send } from 'lucide-react';

import {
  ApiError,
  validarFatura,
  type ValidacaoFatura,
  type ValidarFaturaRequest,
} from '@/lib/api';

type FormState = {
  decision: ValidarFaturaRequest['decision'];
  faturaId: string;
  note: string;
};

const initialFormState: FormState = {
  decision: 'APPROVED',
  faturaId: '',
  note: '',
};

export function ComprovativosClient() {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastValidation, setLastValidation] = useState<ValidacaoFatura | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    try {
      const validation = await validarFatura(form.faturaId, {
        decision: form.decision,
        note: form.note || undefined,
      });
      setLastValidation(validation);
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
          <p className="eyebrow">Faturas</p>
          <h1>Validacao</h1>
          <p>Aprove ou rejeite uma fatura submetida no aplicativo.</p>
        </div>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <section className="workspace-grid">
        <article className="panel">
          <div className="panel-header">
            <h2>Validar fatura</h2>
            <ReceiptText aria-hidden size={18} />
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <label>
              ID da fatura
              <input
                inputMode="numeric"
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
                    decision: event.target.value as FormState['decision'],
                  })
                }
                value={form.decision}
              >
                <option value="APPROVED">Aprovar</option>
                <option value="REJECTED">Rejeitar</option>
              </select>
            </label>
            <label>
              Nota
              <textarea
                onChange={(event) => setForm({ ...form, note: event.target.value })}
                rows={4}
                value={form.note}
              />
            </label>

            <button className="primary-button" disabled={isSubmitting} type="submit">
              <Send aria-hidden size={16} />
              {isSubmitting ? 'A enviar...' : 'Validar fatura'}
            </button>
          </form>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h2>Ultima validacao</h2>
            <CheckCircle2 aria-hidden size={18} />
          </div>
          <div className="helper-panel">
            {lastValidation ? (
              <dl className="detail-list">
                <div>
                  <dt>Fatura</dt>
                  <dd>#{lastValidation.invoiceId ?? '-'}</dd>
                </div>
                <div>
                  <dt>Decisao</dt>
                  <dd>{formatDecision(lastValidation.decision)}</dd>
                </div>
                <div>
                  <dt>Data</dt>
                  <dd>{formatDate(lastValidation.validatedAt)}</dd>
                </div>
                <div>
                  <dt>Nota</dt>
                  <dd>{lastValidation.note ?? '-'}</dd>
                </div>
              </dl>
            ) : (
              <p>Nenhuma validacao realizada nesta sessao.</p>
            )}
          </div>
        </article>
      </section>
    </div>
  );
}

function formatDecision(value?: string) {
  return value === 'APPROVED' ? 'Aprovada' : value === 'REJECTED' ? 'Rejeitada' : value ?? '-';
}

function formatDate(value?: string) {
  return value ? new Intl.DateTimeFormat('pt-AO', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '-';
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
