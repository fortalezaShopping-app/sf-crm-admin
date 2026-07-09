'use client';

import { useEffect, useState } from 'react';
import { RefreshCcw, Users } from 'lucide-react';

import { ApiError, listUtilizadores, type Utilizador } from '@/lib/api';
import { getAdminSessionSnapshot } from '@/lib/auth';

export function ClientesClient() {
  const [clientes, setClientes] = useState<Utilizador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void loadClientes();
  }, []);

  async function loadClientes() {
    const session = getAdminSessionSnapshot();

    if (!session?.token) {
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      setClientes(await listUtilizadores(session.token, 'CLIENTE'));
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
          <p className="eyebrow">Utilizadores mobile</p>
          <h1>Clientes</h1>
          <p>Lista de contas criadas no app mobile do shopping.</p>
        </div>

        <button className="ghost-button" onClick={() => void loadClientes()} type="button">
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className="form-error">{message}</p> : null}

      <article className="panel">
        <div className="panel-header">
          <h2>Clientes registados</h2>
          <span className="count-pill">
            <Users aria-hidden size={14} />
            {clientes.length}
          </span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Ultimo login</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {clientes.length > 0 ? (
              clientes.map((cliente) => (
                <tr key={cliente.id ?? cliente.email}>
                  <td>
                    <span className="table-title">
                      <strong>{cliente.nome ?? 'Cliente sem nome'}</strong>
                      <span>{cliente.email ?? 'Sem email'}</span>
                    </span>
                  </td>
                  <td>{cliente.telefone ?? '-'}</td>
                  <td>{formatDate(cliente.ultimoLogin)}</td>
                  <td>
                    <span
                      className={
                        cliente.estado === 'ATIVO'
                          ? 'badge badge--success'
                          : 'badge badge--warning'
                      }
                    >
                      {cliente.estado ?? 'Sem estado'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4}>{isLoading ? 'A carregar...' : 'Sem clientes registados.'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </article>
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('pt-AO', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError || error instanceof Error) {
    return error.message;
  }

  return 'Nao foi possivel carregar clientes.';
}
