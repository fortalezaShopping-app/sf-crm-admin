'use client';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NativeSelect } from '@/components/ui/native-select';
import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import {
  Ban,
  Check,
  History,
  Pencil,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  activateUtilizador,
  clearAdminApiCache,
  associateUtilizadorLoja,
  createUtilizador,
  deactivateUtilizador,
  listAllLojas,
  listAllUtilizadores,
  updateUtilizador,
  type Loja,
  type Utilizador,
  type UserRole,
} from '@/lib/api';
import { matchesSearchQuery } from '@/lib/admin-search';
import { formatAdminDate } from '@/lib/admin-models';
import {
  Avatar,
  EmptyState,
  ExportButton,
  Modal,
  Notice,
  Unavailable,
} from '@/components/admin/Workspace';
import { Pagination } from '@/components/admin/Pagination';
import { useAdminSearchQuery } from '@/components/admin/useAdminSearchQuery';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import s from '@/components/admin/Workspace.module.css';

const roles: Record<UserRole, string> = {
  ADMIN: 'Administrador',
  MANAGER: 'Gestor',
  STORE_USER: 'Lojista',
  CUSTOMER: 'Cliente',
};
const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'Não foi possível concluir a operação.';

export function UtilizadoresClient() {
  const session = useAdminSession();
  const [users, setUsers] = useState<Utilizador[]>([]);
  const [stores, setStores] = useState<Loja[]>([]);
  const [loading, setLoading] = useState(true);
  const [version, setVersion] = useState(0);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [role, setRole] = useState('ALL');
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<number>();
  const [tab, setTab] = useState('details');
  const [editor, setEditor] = useState<Utilizador | 'new' | null>(null);
  const [confirm, setConfirm] = useState<Utilizador | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState('');
  const detail = useRef<HTMLElement>(null);
  const { query, deferredQuery, setQuery } = useAdminSearchQuery();
  useEffect(() => {
    let active = true;
    listAllUtilizadores()
      .then((data) => {
        if (active) {
          setUsers(data);
          setError('');
        }
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);
  useEffect(() => {
    let active = true;
    listAllLojas()
      .then((data) => {
        if (active) setStores(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);
  const filtered = users.filter(
    (u) =>
      (role === 'ALL' || (u.roles ?? [u.role]).includes(role as UserRole)) &&
      matchesSearchQuery(deferredQuery, [
        u.nome,
        u.email,
        u.telefone,
        u.id,
        u.estado,
        ...(u.roles ?? []).map((r) => roles[r]),
      ]),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const currentPage = Math.min(page, pages - 1);
  const visible = filtered.slice(currentPage * 10, currentPage * 10 + 10);
  const selected = filtered.find((u) => u.id === selectedId) ?? visible[0];
  function refresh() {
    clearAdminApiCache();
    setLoading(true);
    setVersion((v) => v + 1);
  }
  async function changeStatus() {
    if (!confirm?.id) return;
    setBusy(true);
    setActionError('');
    try {
      const updated = await (confirm.estado === 'ATIVO'
        ? deactivateUtilizador(confirm.id)
        : activateUtilizador(confirm.id));
      setUsers((all) =>
        all.map((u) => (u.id === confirm.id ? { ...u, ...updated } : u)),
      );
      setConfirm(null);
      setMessage('Estado do utilizador atualizado.');
    } catch (e) {
      setActionError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>Gestão de utilizadores</h1>
        <div className={s.actions}>
          <ExportButton
            name="utilizadores"
            disabled={loading}
            rows={[
              ['Nome', 'Email', 'Telefone', 'Estado', 'Função'],
              ...filtered.map((u) => [
                u.nome,
                u.email,
                u.telefone,
                u.estado,
                (u.roles ?? [u.role])
                  .filter(Boolean)
                  .map((r) => roles[r!])
                  .join(', '),
              ]),
            ]}
          />
          <Button variant="default" onClick={() => setEditor('new')}>
            <Plus size={16} />
            Novo utilizador
          </Button>
        </div>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      <div className={s.split}>
        <section
          className={s.panel}
          aria-label="Lista de utilizadores"
          aria-busy={loading}
        >
          <div className={s.panelHeader}>
            <label className={s.search}>
              <Search size={17} />
              <Input
                aria-label="Pesquisar utilizadores"
                placeholder="Pesquisar utilizadores"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <NativeSelect
              className={s.select}
              aria-label="Filtrar por função"
              value={role}
              onChange={(e) => {
                setRole(e.target.value);
                setPage(0);
              }}
            >
              <option value="ALL">Todas as funções</option>
              {Object.entries(roles).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </NativeSelect>
            <IconButton
              title="Atualizar utilizadores"
              aria-label="Atualizar utilizadores"
              disabled={loading}
              onClick={refresh}
            >
              <RefreshCw size={16} />
            </IconButton>
          </div>
          {loading ? (
            <EmptyState>A carregar utilizadores...</EmptyState>
          ) : !filtered.length ? (
            <EmptyState>Nenhum utilizador encontrado.</EmptyState>
          ) : (
            <div className={s.tableScroll}>
              <table className={s.table}>
                <thead>
                  <tr>
                    <th>Nome</th>
                    <th>Telefone</th>
                    <th>Estado</th>
                    <th>Pontos</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((u) => (
                    <tr
                      key={u.id}
                      className={selected?.id === u.id ? s.selected : undefined}
                    >
                      <td>
                        <Button
                          variant="plain"
                          size="plain"
                          className={s.nameButton}
                          aria-pressed={selected?.id === u.id}
                          onClick={() => {
                            setSelectedId(u.id);
                            setTab('details');
                            if (window.innerWidth < 760)
                              detail.current?.scrollIntoView({
                                block: 'start',
                              });
                          }}
                        >
                          <Avatar name={u.nome} src={u.photoUrl} />
                          <span>
                            <strong>{u.nome || 'Sem nome'}</strong>
                            <small>{u.email}</small>
                          </span>
                        </Button>
                      </td>
                      <td>{u.telefone || '-'}</td>
                      <td>
                        <UserStatus user={u} />
                      </td>
                      <td title="Saldo não disponibilizado pela API">-</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <Pagination
            page={currentPage}
            totalPages={pages}
            totalItems={filtered.length}
            onPageChange={setPage}
            isLoading={loading}
          />
        </section>
        <aside
          ref={detail}
          className={s.panel}
          aria-label="Detalhes do utilizador"
        >
          {!selected || loading ? (
            <EmptyState>Selecione um utilizador.</EmptyState>
          ) : (
            <>
              <div className={s.identity}>
                <Avatar large name={selected.nome} src={selected.photoUrl} />
                <h2>{selected.nome || 'Sem nome'}</h2>
                <p>Membro desde {formatAdminDate(selected.createdAt)}</p>
                <Badge variant="secondary">
                  {(selected.roles ?? [selected.role])
                    .filter(Boolean)
                    .map((r) => roles[r!])
                    .join(', ') || 'Função não disponível'}
                </Badge>
              </div>
              <div className={`${s.padding} ${s.stack}`}>
                <Tabs
                  value={tab}
                  onValueChange={(value) => setTab(value as typeof tab)}
                >
                  <TabsList aria-label="Dados do utilizador">
                    <TabsTrigger value="details">Detalhes</TabsTrigger>
                    <TabsTrigger value="history">Histórico</TabsTrigger>
                  </TabsList>
                  <TabsContent value="details">
                    <dl className={s.details}>
                      <div>
                        <dt>Email</dt>
                        <dd>{selected.email || '-'}</dd>
                      </div>
                      <div>
                        <dt>Telefone</dt>
                        <dd>{selected.telefone || '-'}</dd>
                      </div>
                      <div>
                        <dt>Último acesso</dt>
                        <dd>{formatAdminDate(selected.ultimoLogin, true)}</dd>
                      </div>
                      <div>
                        <dt>Estado</dt>
                        <dd>
                          <UserStatus user={selected} />
                        </dd>
                      </div>
                    </dl>
                  </TabsContent>
                  <TabsContent value="history">
                    <UserHistory user={selected} />
                  </TabsContent>
                </Tabs>
                <div className={s.actions}>
                  <Button variant="outline" onClick={() => setEditor(selected)}>
                    <Pencil size={15} />
                    Editar
                  </Button>
                  <IconButton
                    title="Histórico da conta"
                    aria-label="Histórico da conta"
                    onClick={() => setShowLog(true)}
                  >
                    <History size={16} />
                  </IconButton>
                  <Button
                    variant="outline"
                    disabled
                    title="Ajustes de saldo ainda não disponíveis na API"
                  >
                    Ajustar saldo
                  </Button>
                  <Button
                    variant={
                      selected.estado === 'ATIVO' ? 'destructive' : 'success'
                    }
                    disabled={!selected.id || selected.id === session?.id}
                    title={
                      selected.id === session?.id
                        ? 'Não pode desativar a sua própria conta'
                        : undefined
                    }
                    onClick={() => {
                      setActionError('');
                      setConfirm(selected);
                    }}
                  >
                    {selected.estado === 'ATIVO' ? (
                      <Ban size={15} />
                    ) : (
                      <Check size={15} />
                    )}
                    {selected.estado === 'ATIVO' ? 'Desativar' : 'Ativar'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
      {editor && (
        <UserEditor
          user={editor === 'new' ? undefined : editor}
          stores={stores}
          onClose={() => setEditor(null)}
          onSaved={() => {
            setEditor(null);
            setMessage('Utilizador guardado.');
            refresh();
          }}
        />
      )}
      {confirm && (
        <Modal
          title={`${confirm.estado === 'ATIVO' ? 'Desativar' : 'Ativar'} utilizador`}
          busy={busy}
          onClose={() => setConfirm(null)}
        >
          <div className={s.stack}>
            <p>
              Confirmar a alteração de acesso de{' '}
              <strong>{confirm.nome || confirm.email}</strong>?
            </p>
            {actionError && <Notice tone="error">{actionError}</Notice>}
            <div className={s.footer}>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Cancelar
              </Button>
              <Button variant="default" disabled={busy} onClick={changeStatus}>
                {busy ? 'A atualizar...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
      {showLog && selected && (
        <Modal title="Histórico da conta" onClose={() => setShowLog(false)}>
          <div className={s.stack}>
            <UserHistory user={selected} />
            <Unavailable>Log completo de acessos e movimentos</Unavailable>
          </div>
        </Modal>
      )}
    </div>
  );
}

function UserStatus({ user }: { user: Utilizador }) {
  return (
    <Badge
      variant="secondary"
      data-tone={
        user.estado === 'ATIVO'
          ? 'success'
          : user.estado === 'BLOQUEADO'
            ? 'warning'
            : 'danger'
      }
    >
      {user.estado === 'ATIVO'
        ? 'Ativo'
        : user.estado === 'BLOQUEADO'
          ? 'Bloqueado'
          : user.estado === 'INATIVO'
            ? 'Inativo'
            : 'Indisponível'}
    </Badge>
  );
}
function UserHistory({ user }: { user: Utilizador }) {
  return (
    <ol className={s.timeline}>
      {[
        ['Último acesso', user.ultimoLogin],
        ['Atualização da conta', user.updatedAt],
        ['Registo', user.createdAt],
      ].map(([label, date]) => (
        <li key={label}>
          {label}
          <small>{formatAdminDate(date, true)}</small>
        </li>
      ))}
    </ol>
  );
}

function UserEditor({
  user,
  stores,
  onClose,
  onSaved,
}: {
  user?: Utilizador;
  stores: Loja[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    nome: user?.nome ?? '',
    email: user?.email ?? '',
    telefone: user?.telefone ?? '',
    role: user?.role ?? 'MANAGER',
    lojaId: '',
    cargo: '',
    password: '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  function field(key: keyof typeof form, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    let profileSaved = false;
    try {
      if (user?.id) {
        await updateUtilizador(user.id, {
          nome: form.nome.trim(),
          email: form.email.trim(),
          telefone: form.telefone.trim(),
        });
        profileSaved = true;
        if (form.lojaId && (user.roles ?? [user.role]).includes('STORE_USER'))
          await associateUtilizadorLoja(
            user.id,
            Number(form.lojaId),
            form.cargo.trim() || undefined,
          );
      } else {
        if (form.role === 'CUSTOMER')
          throw new Error(
            'A criação administrativa destina-se a contas internas.',
          );
        await createUtilizador({
          ...form,
          nome: form.nome.trim(),
          email: form.email.trim(),
          role: form.role,
          lojaId: form.lojaId ? Number(form.lojaId) : undefined,
        });
      }
      onSaved();
    } catch (e) {
      setError(
        `${profileSaved ? 'Dados pessoais guardados; a associação à loja falhou. ' : ''}${errorText(e)}`,
      );
    } finally {
      setBusy(false);
    }
  }
  const merchant = user
    ? (user.roles ?? [user.role]).includes('STORE_USER')
    : form.role === 'STORE_USER';
  return (
    <Modal
      title={user ? 'Editar utilizador' : 'Novo utilizador'}
      onClose={onClose}
      busy={busy}
    >
      <form className={s.form} onSubmit={submit}>
        <label>
          Nome
          <Input
            required
            maxLength={120}
            value={form.nome}
            onChange={(e) => field('nome', e.target.value)}
          />
        </label>
        <div className={s.detailGrid}>
          <label>
            Email
            <Input
              required
              type="email"
              value={form.email}
              onChange={(e) => field('email', e.target.value)}
            />
          </label>
          <label>
            Telefone
            <Input
              type="tel"
              value={form.telefone}
              onChange={(e) => field('telefone', e.target.value)}
            />
          </label>
        </div>
        <label>
          Função
          <NativeSelect
            value={form.role}
            disabled={!!user}
            onChange={(e) => field('role', e.target.value)}
          >
            {Object.entries(roles)
              .filter(([r]) => !!user || r !== 'CUSTOMER')
              .map(([r, name]) => (
                <option key={r} value={r}>
                  {name}
                </option>
              ))}
          </NativeSelect>
        </label>
        {merchant && (
          <>
            <label>
              {user ? 'Associar a uma loja' : 'Loja de registo'}
              <NativeSelect
                value={form.lojaId}
                required={!user}
                onChange={(e) => field('lojaId', e.target.value)}
              >
                <option value="">
                  {user ? 'Manter associação atual' : 'Selecionar loja'}
                </option>
                {stores.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.nome}
                  </option>
                ))}
              </NativeSelect>
            </label>
            {!stores.length && (
              <Notice>
                Não foi possível obter lojas. Feche e atualize a página para
                tentar novamente.
              </Notice>
            )}
            <label>
              Cargo
              <Input
                value={form.cargo}
                onChange={(e) => field('cargo', e.target.value)}
              />
            </label>
          </>
        )}
        {!user && (
          <label>
            Palavra-passe
            <Input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={form.password}
              onChange={(e) => field('password', e.target.value)}
            />
          </label>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className={s.footer}>
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button variant="default" disabled={busy}>
            {busy ? 'A guardar...' : 'Guardar utilizador'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
