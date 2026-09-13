'use client';

import { useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Send } from 'lucide-react';
import type { Loja } from '@/lib/api';
import { formatAdminDate, validateSchedule } from '@/lib/admin-models';
import { Modal, Notice, Unavailable } from '@/components/admin/Workspace';
import s from '@/components/admin/Workspace.module.css';

export function CampaignWizard({
  stores,
  onClose,
}: {
  stores: Loja[];
  onClose: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    title: '',
    body: '',
    link: 'Recompensas',
    audience: 'all',
    level: 'Iniciante',
    behavior: 'Novo na app',
    store: '',
    schedule: 'now',
    date: '',
    time: '',
  });
  const [error, setError] = useState('');
  function field(key: keyof typeof form, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
    setError('');
  }
  function next(event: FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      setError('Preencha o título e a mensagem.');
      return;
    }
    setStep((value) => Math.min(2, value + 1));
  }
  const audience =
    form.audience === 'all'
      ? 'Todos os utilizadores'
      : form.audience === 'level'
        ? `Nível: ${form.level}`
        : form.audience === 'behavior'
          ? form.behavior
          : `Loja: ${stores.find((store) => String(store.id) === form.store)?.nome ?? 'Não selecionada'}`;
  const invalidDate =
    form.schedule === 'later' &&
    form.date &&
    form.time &&
    !validateSchedule(form.date, form.time);
  return (
    <Modal
      title={['Mensagem', 'Segmentação', 'Agendamento'][step]}
      onClose={onClose}
    >
      <form className={s.form} onSubmit={next}>
        <Unavailable>
          Criação, segmentação e agendamento de campanhas push
        </Unavailable>
        {step === 0 && (
          <>
            <label>
              Título da mensagem
              <input
                required
                maxLength={100}
                value={form.title}
                onChange={(e) => field('title', e.target.value)}
              />
            </label>
            <label>
              Corpo da mensagem
              <textarea
                required
                rows={4}
                maxLength={1000}
                value={form.body}
                onChange={(e) => field('body', e.target.value)}
              />
            </label>
            <label>
              Destino
              <select
                value={form.link}
                onChange={(e) => field('link', e.target.value)}
              >
                {['Recompensas', 'Explorar', 'Pontos', 'Novidades'].map(
                  (name) => (
                    <option key={name}>{name}</option>
                  ),
                )}
              </select>
            </label>
          </>
        )}
        {step === 1 && (
          <>
            <fieldset>
              <legend>Enviar para</legend>
              {[
                ['all', 'Todos os utilizadores'],
                ['level', 'Por nível de fidelização'],
                ['behavior', 'Por comportamento'],
                ['store', 'Por loja visitada'],
              ].map(([value, label]) => (
                <label className={s.choice} key={value}>
                  <input
                    type="radio"
                    name="audience"
                    value={value}
                    checked={form.audience === value}
                    onChange={() => field('audience', value)}
                  />
                  {label}
                </label>
              ))}
            </fieldset>
            {form.audience === 'level' && (
              <label>
                Nível
                <select
                  value={form.level}
                  onChange={(e) => field('level', e.target.value)}
                >
                  {['Iniciante', 'Intermédio', 'Avançado'].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            {form.audience === 'behavior' && (
              <label>
                Comportamento
                <select
                  value={form.behavior}
                  onChange={(e) => field('behavior', e.target.value)}
                >
                  {[
                    'Novo na app',
                    'Saldo inferior a 500',
                    'Saldo superior a 500',
                    'Ausente há mais de 7 dias',
                    'Nunca resgatou pontos',
                  ].map((v) => (
                    <option key={v}>{v}</option>
                  ))}
                </select>
              </label>
            )}
            {form.audience === 'store' && (
              <label>
                Loja visitada
                <select
                  required
                  value={form.store}
                  onChange={(e) => field('store', e.target.value)}
                >
                  <option value="">Selecionar loja</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.nome}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <p className={s.muted}>Estimativa de alcance: indisponível</p>
          </>
        )}
        {step === 2 && (
          <>
            <fieldset>
              <legend>Envio</legend>
              <label className={s.choice}>
                <input
                  type="radio"
                  name="schedule"
                  checked={form.schedule === 'now'}
                  onChange={() => field('schedule', 'now')}
                />
                Enviar agora
              </label>
              <label className={s.choice}>
                <input
                  type="radio"
                  name="schedule"
                  checked={form.schedule === 'later'}
                  onChange={() => field('schedule', 'later')}
                />
                Agendar envio
              </label>
            </fieldset>
            {form.schedule === 'later' && (
              <div className={s.detailGrid}>
                <label>
                  Data
                  <input
                    type="date"
                    required
                    value={form.date}
                    onChange={(e) => field('date', e.target.value)}
                  />
                </label>
                <label>
                  Hora de Angola (UTC+1)
                  <input
                    type="time"
                    required
                    value={form.time}
                    onChange={(e) => field('time', e.target.value)}
                  />
                </label>
              </div>
            )}
            {invalidDate && (
              <Notice tone="error">Escolha uma data e hora futuras.</Notice>
            )}
            <section className={s.section}>
              <h2>Resumo</h2>
              <dl className={s.details}>
                <div>
                  <dt>Mensagem</dt>
                  <dd>
                    {form.title}
                    <p>{form.body}</p>
                  </dd>
                </div>
                <div>
                  <dt>Destino</dt>
                  <dd>{form.link}</dd>
                </div>
                <div>
                  <dt>Público</dt>
                  <dd>{audience}</dd>
                </div>
                <div>
                  <dt>Envio</dt>
                  <dd>
                    {form.schedule === 'now'
                      ? 'Imediato'
                      : formatAdminDate(
                          form.date && form.time
                            ? `${form.date}T${form.time}:00+01:00`
                            : undefined,
                          true,
                        )}
                  </dd>
                </div>
              </dl>
            </section>
          </>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <footer className={s.footer}>
          <div className={s.steps} aria-label={`Etapa ${step + 1} de 3`}>
            {[0, 1, 2].map((v) => (
              <span key={v} aria-current={step === v ? 'step' : undefined} />
            ))}
          </div>
          {step > 0 && (
            <button
              type="button"
              className={s.secondary}
              onClick={() => {
                setError('');
                setStep(step - 1);
              }}
            >
              <ArrowLeft size={16} />
              Voltar
            </button>
          )}
          {step < 2 ? (
            <button className={s.button}>
              Continuar
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              className={s.button}
              disabled
              title="Aguarda suporte da API"
            >
              <Send size={16} />
              Criar campanha
            </button>
          )}
        </footer>
      </form>
    </Modal>
  );
}
