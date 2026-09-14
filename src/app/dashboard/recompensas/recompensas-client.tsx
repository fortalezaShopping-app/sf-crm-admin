'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { IconButton } from '@/components/ui/icon-button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { NativeSelect } from '@/components/ui/native-select';
import Image from 'next/image';
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowLeft, Pencil, Plus, RefreshCw, Search } from 'lucide-react';
import { clearAdminApiCache } from '@/lib/api';
import {
  listAllResources,
  listRewards,
  type Reward,
} from '@/lib/admin-resources';
import { formatNumber, rewardAvailability } from '@/lib/admin-models';
import { matchesSearchQuery } from '@/lib/admin-search';
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
import s from '@/components/admin/Workspace.module.css';

export function RecompensasClient() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [version, setVersion] = useState(0);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(0);
  const [editor, setEditor] = useState<Reward | 'new' | null>(null);
  const { query, deferredQuery, setQuery } = useAdminSearchQuery();
  useEffect(() => {
    let active = true;
    listAllResources(listRewards)
      .then((data) => {
        if (active) {
          setRewards(data);
          setError('');
        }
      })
      .catch((e: Error) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [version]);
  const filtered = rewards.filter(
    (r) =>
      (filter === 'all' || rewardAvailability(r.stock) === filter) &&
      matchesSearchQuery(deferredQuery, [
        r.name,
        r.description,
        r.type,
        r.storeName,
        r.requiredPoints,
      ]),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10));
  const current = Math.min(page, pages - 1);
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>Recompensas</h1>
        <div className={s.actions}>
          <ExportButton
            name="recompensas"
            disabled={loading}
            rows={[
              ['Nome', 'Categoria', 'Custo em pontos', 'Stock', 'Loja'],
              ...filtered.map((r) => [
                r.name,
                r.type,
                r.requiredPoints,
                r.stock,
                r.storeName,
              ]),
            ]}
          />
          <Button variant="default" onClick={() => setEditor('new')}>
            <Plus size={16} />
            Nova recompensa
          </Button>
        </div>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      <div className={s.stats}>
        {[
          ['Todas', loading || error ? '-' : rewards.length],
          ['Ativas', '-'],
          ['Inativas', '-'],
          [
            'Esgotadas',
            loading || error
              ? '-'
              : rewards.filter((r) => r.stock === 0).length,
          ],
        ].map(([label, count]) => (
          <div key={label} className={s.stat}>
            <span>{label}</span>
            <strong
              title={count === '-' ? 'Informação indisponível' : undefined}
            >
              {count}
            </strong>
          </div>
        ))}
      </div>
      <section
        className={s.panel}
        aria-label="Catálogo de recompensas"
        aria-busy={loading}
      >
        <div className={s.panelHeader}>
          <div className={s.segments}>
            {[
              ['all', 'Todas'],
              ['available', 'Com stock'],
              ['empty', 'Esgotadas'],
            ].map(([value, label]) => (
              <Button
                variant="plain"
                size="plain"
                key={value}
                className={s.segment}
                aria-pressed={filter === value}
                onClick={() => {
                  setFilter(value);
                  setPage(0);
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          <div className={s.toolbar}>
            <label className={s.search}>
              <Search size={16} />
              <Input
                aria-label="Pesquisar recompensas"
                placeholder="Pesquisar recompensas"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(0);
                }}
              />
            </label>
            <IconButton
              title="Atualizar recompensas"
              aria-label="Atualizar recompensas"
              disabled={loading}
              onClick={() => {
                setLoading(true);
                clearAdminApiCache();
                setVersion((v) => v + 1);
              }}
            >
              <RefreshCw size={16} />
            </IconButton>
          </div>
        </div>
        {loading ? (
          <EmptyState>A carregar recompensas...</EmptyState>
        ) : !filtered.length ? (
          <EmptyState>Nenhuma recompensa encontrada.</EmptyState>
        ) : (
          <div className={s.tableScroll}>
            <table className={s.table}>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Custo</th>
                  <th>Stock</th>
                  <th>Disponibilidade</th>
                  <th>Resgates</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.slice(current * 10, current * 10 + 10).map((r) => (
                  <tr key={r.id}>
                    <td>
                      <Button
                        variant="plain"
                        size="plain"
                        className={s.nameButton}
                        onClick={() => setEditor(r)}
                      >
                        <Avatar name={r.name} />
                        <span>
                          <strong>{r.name}</strong>
                          <small>{r.storeName || r.type}</small>
                        </span>
                      </Button>
                    </td>
                    <td>{formatNumber(r.requiredPoints)} pts</td>
                    <td>
                      {typeof r.stock === 'number'
                        ? formatNumber(r.stock)
                        : '-'}
                    </td>
                    <td>
                      <Badge
                        variant="secondary"
                        data-tone={r.stock === 0 ? 'warning' : undefined}
                      >
                        {r.stock === 0
                          ? 'Esgotada'
                          : rewardAvailability(r.stock) === 'available'
                            ? 'Com stock'
                            : 'Indisponível'}
                      </Badge>
                    </td>
                    <td title="Contagem não fornecida pela API">-</td>
                    <td>
                      <div className={s.actions}>
                        <Button variant="outline" onClick={() => setEditor(r)}>
                          <Pencil size={15} />
                          Editar
                        </Button>
                        <Button
                          variant="outline"
                          disabled
                          title="Alteração de estado indisponível na API"
                        >
                          Desativar
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination
          page={current}
          totalPages={pages}
          totalItems={filtered.length}
          onPageChange={setPage}
        />
      </section>
      <p className={s.muted}>
        Estado de ativação e resgates por recompensa não disponibilizados pela
        API.
      </p>
      {editor && (
        <RewardEditor
          reward={editor === 'new' ? undefined : editor}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

function RewardEditor({
  reward,
  onClose,
}: {
  reward?: Reward;
  onClose: () => void;
}) {
  const [review, setReview] = useState(false);
  const [form, setForm] = useState({
    name: reward?.name ?? '',
    description: reward?.description ?? '',
    cost: reward?.requiredPoints?.toString() ?? '',
    category: reward?.type ?? '',
    limited: reward?.stock === undefined ? 'unlimited' : 'limited',
    stock: reward?.stock?.toString() ?? '',
    expiry: 'none',
    date: '',
    status: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const id = setTimeout(() => setPreview(url), 0);
    return () => {
      clearTimeout(id);
      URL.revokeObjectURL(url);
    };
  }, [file]);
  function field(key: keyof typeof form, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }
  function next(event: FormEvent) {
    event.preventDefault();
    if (!form.name.trim()) {
      setError('Indique o nome da recompensa.');
      return;
    }
    setError('');
    setReview(true);
  }
  return (
    <Modal
      title={
        review
          ? 'Rever recompensa'
          : reward
            ? 'Editar recompensa'
            : 'Nova recompensa'
      }
      onClose={onClose}
    >
      <form className={s.form} onSubmit={next}>
        <Unavailable>Gravação de recompensas</Unavailable>
        {!review ? (
          <>
            <label>
              Nome da recompensa
              <Input
                required
                maxLength={200}
                value={form.name}
                onChange={(e) => field('name', e.target.value)}
              />
            </label>
            <label>
              Descrição
              <Textarea
                rows={3}
                value={form.description}
                onChange={(e) => field('description', e.target.value)}
              />
            </label>
            <div className={s.detailGrid}>
              <label>
                Custo em pontos
                <Input
                  type="number"
                  min={1}
                  step={1}
                  required
                  value={form.cost}
                  onChange={(e) => field('cost', e.target.value)}
                />
              </label>
              <label>
                Categoria
                <NativeSelect
                  required
                  value={form.category}
                  onChange={(e) => field('category', e.target.value)}
                >
                  <option value="">Selecionar categoria</option>
                  {[
                    ...new Set(
                      [reward?.type, 'Serviço', 'Voucher', 'Brinde'].filter(
                        (v): v is string => !!v,
                      ),
                    ),
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </NativeSelect>
              </label>
            </div>
            <label>
              Imagem
              <Input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0];
                  if (!nextFile) return;
                  if (
                    !['image/jpeg', 'image/png', 'image/webp'].includes(
                      nextFile.type,
                    ) ||
                    nextFile.size > 5 * 1024 * 1024
                  ) {
                    setError('Escolha uma imagem JPG, PNG ou WebP até 5 MB.');
                    e.target.value = '';
                    return;
                  }
                  setError('');
                  setFile(nextFile);
                }}
              />
            </label>
            {preview && (
              <Image
                className={s.preview}
                alt="Pré-visualização da recompensa"
                src={preview}
                width={500}
                height={160}
                unoptimized
              />
            )}
            <fieldset>
              <legend>Stock</legend>
              <div className={s.actions}>
                <label className={s.choice}>
                  <input
                    type="radio"
                    name="stock"
                    checked={form.limited === 'unlimited'}
                    onChange={() => field('limited', 'unlimited')}
                  />
                  Ilimitado
                </label>
                <label className={s.choice}>
                  <input
                    type="radio"
                    name="stock"
                    checked={form.limited === 'limited'}
                    onChange={() => field('limited', 'limited')}
                  />
                  Limitado
                </label>
              </div>
              {form.limited === 'limited' && (
                <label>
                  Quantidade
                  <Input
                    required
                    type="number"
                    min={0}
                    step={1}
                    value={form.stock}
                    onChange={(e) => field('stock', e.target.value)}
                  />
                </label>
              )}
            </fieldset>
            <fieldset>
              <legend>Validade</legend>
              <div className={s.actions}>
                <label className={s.choice}>
                  <input
                    type="radio"
                    name="expiry"
                    checked={form.expiry === 'none'}
                    onChange={() => field('expiry', 'none')}
                  />
                  Sem limite
                </label>
                <label className={s.choice}>
                  <input
                    type="radio"
                    name="expiry"
                    checked={form.expiry === 'date'}
                    onChange={() => field('expiry', 'date')}
                  />
                  Até
                </label>
              </div>
              {form.expiry === 'date' && (
                <label>
                  Data de validade
                  <Input
                    required
                    type="date"
                    min={new Date().toLocaleDateString('en-CA', {
                      timeZone: 'Africa/Luanda',
                    })}
                    value={form.date}
                    onChange={(e) => field('date', e.target.value)}
                  />
                </label>
              )}
            </fieldset>
            <fieldset>
              <legend>Estado</legend>
              <div className={s.actions}>
                {['Ativo', 'Inativo'].map((value) => (
                  <label className={s.choice} key={value}>
                    <input
                      required
                      type="radio"
                      name="status"
                      checked={form.status === value}
                      onChange={() => field('status', value)}
                    />
                    {value}
                  </label>
                ))}
              </div>
            </fieldset>
          </>
        ) : (
          <dl className={s.details}>
            {[
              ['Nome', form.name],
              ['Descrição', form.description || '-'],
              ['Custo', `${form.cost} pts`],
              ['Categoria', form.category],
              [
                'Stock',
                form.limited === 'unlimited' ? 'Ilimitado' : form.stock,
              ],
              ['Validade', form.expiry === 'none' ? 'Sem limite' : form.date],
              ['Estado', form.status],
              ['Imagem', file?.name || 'Sem imagem selecionada'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <footer className={s.footer}>
          <Button
            type="button"
            variant="outline"
            onClick={() => (review ? setReview(false) : onClose())}
          >
            {review && <ArrowLeft size={16} />}
            {review ? 'Voltar' : 'Cancelar'}
          </Button>
          {review ? (
            <Button
              type="button"
              variant="default"
              disabled
              title="Aguarda suporte da API"
            >
              Guardar recompensa
            </Button>
          ) : (
            <Button variant="default">Continuar</Button>
          )}
        </footer>
      </form>
    </Modal>
  );
}
