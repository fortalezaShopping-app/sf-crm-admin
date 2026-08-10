'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, RefreshCcw, Users } from 'lucide-react';

import { Pagination } from '@/components/admin/Pagination';
import {
  ApiError,
  clearAdminApiCache,
  deactivateUtilizador,
  listUtilizadores,
  type Utilizador,
} from '@/lib/api';

export function ClientesClient() {
  const [actionId, setActionId] = useState<number | null>(null);
  const [clientes, setClientes] = useState<Utilizador[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  const loadClientes = useCallback(async (targetPage: number, bypassCache = false) => {
    await Promise.resolve();
    setIsLoading(true);
    setMessage(null);

    try {
      if (bypassCache) {
        clearAdminApiCache();
      }

      const result = await listUtilizadores('CUSTOMER', { page: targetPage });
      setClientes(result.items);
      setTotalItems(result.totalItems);
      setTotalPages(result.totalPages);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  }, []);

  async function handleDeactivate(cliente: Utilizador) {
    if (!cliente.id || !window.confirm(`Desativar o cliente ${cliente.nome ?? cliente.email}?`)) {
      return;
    }

    setActionId(cliente.id);
    setMessage(null);

    try {
      await deactivateUtilizador(cliente.id);
      setMessage('Cliente desativado com sucesso.');
      await loadClientes(page, true);
    } catch (error) {
      setMessage(getErrorMessage(error));
    } finally {
      setActionId(null);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadClientes(page), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadClientes, page]);

  return (
    <div className="dashboard-content">
      <section className="dashboard-heading">
        <div className="heading-copy">
          <p className="eyebrow">Utilizadores mobile</p>
          <h1>Clientes</h1>
          <p>Lista de contas criadas no app mobile do shopping.</p>
        </div>

        <button className="ghost-button" onClick={() => void loadClientes(page, true)} type="button">
          <RefreshCcw aria-hidden size={16} />
          Atualizar
        </button>
      </section>

      {message ? <p className={getMessageClassName(message)}>{message}</p> : null}

      <article className="panel">
        <div className="panel-header">
          <h2>Clientes registados</h2>
          <span className="count-pill">
            <Users aria-hidden size={14} />
            {totalItems}
          </span>
        </div>

        <table className="admin-table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Telefone</th>
              <th>Ultimo login</th>
              <th>Estado</th>
              <th>Acoes</th>
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
                  <td>
                    <button
                      className="table-action table-action--danger"
                      disabled={!cliente.id || actionId === cliente.id}
                      onClick={() => void handleDeactivate(cliente)}
                      type="button"
                    >
                      <Ban aria-hidden size={14} />
                      Desativar
                    </button>
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
                <td colSpan={5}>{isLoading ? 'A carregar...' : 'Sem clientes registados.'}</td>
              </tr>
            )}
          </tbody>
        </table>
        <Pagination
          isLoading={isLoading}
          onPageChange={setPage}
          page={page}
          totalItems={totalItems}
          totalPages={totalPages}
        />
      </article>
    </div>
  );
}

function getMessageClassName(message: string) {
  return message.includes('sucesso') ? 'form-success' : 'form-error';
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
