'use client';

import { useEffect, useState } from 'react';
import { History, RefreshCcw } from 'lucide-react';

import { ApiError, listLogsAuditoria, type LogAuditoria } from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

export function AuditoriaClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [logs, setLogs] = useState<LogAuditoria[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadLogs();
  }, []);

  async function loadLogs() {
    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      setLogs(await listLogsAuditoria(session.token));
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Seguranca</p>
          <h1>Auditoria</h1>
          <p>Ultimas operacoes registadas pela API para rastreio administrativo.</p>
        </div>

        <button className="ghost-button" onClick={() => void loadLogs()} type="button">
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className="form-error">{message}</p> : null}

      <article className="panel">
        <div className="panel-header">
          <h2>Eventos recentes</h2>
          <History aria-hidden size={18} />
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Acao</th>
              <th>Entidade</th>
              <th>Utilizador</th>
              <th>Data</th>
              <th>Dados novos</th>
            </tr>
          </thead>
          <tbody>
            {logs.length > 0 ? (
              logs.map((log) => (
                <tr key={log.id ?? `${log.entidade}-${log.createdAt}`}>
                  <td>{log.acao ?? '-'}</td>
                  <td>
                    <span className="table-title">
                      <strong>{log.entidade ?? '-'}</strong>
                      <span>{log.entidadeId ? `#${log.entidadeId}` : 'Sem ID'}</span>
                    </span>
                  </td>
                  <td>{log.utilizador ?? '-'}</td>
                  <td>{formatDate(log.createdAt)}</td>
                  <td>
                    <span className="table-json">{shorten(log.dadosNovos)}</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5}>{isLoading ? 'A carregar...' : 'Sem logs de auditoria.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
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

function shorten(value: string | undefined) {
  if (!value) {
    return '-';
  }

  return value.length > 90 ? `${value.slice(0, 90)}...` : value;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar logs de auditoria.';
}
