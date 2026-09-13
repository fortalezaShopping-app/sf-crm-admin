'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Pencil, ShieldCheck } from 'lucide-react';
import { getProfile, updateProfile, type Profile } from '@/lib/api';
import {
  confirmPasswordReset,
  requestPasswordReset,
} from '@/lib/admin-resources';
import { formatAdminDate } from '@/lib/admin-models';
import {
  Avatar,
  EmptyState,
  Modal,
  Notice,
  Unavailable,
} from '@/components/admin/Workspace';
import { useAdminSession } from '@/components/admin/AdminSessionContext';
import s from '@/components/admin/Workspace.module.css';

export function PerfilClient() {
  const session = useAdminSession();
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<
    'identity' | 'password' | '2fa' | 'sessions' | null
  >(null);
  useEffect(() => {
    let active = true;
    getProfile()
      .then((data) => {
        if (active) setProfile(data);
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
  }, []);
  const role =
    session?.role === 'ADMIN'
      ? 'Administrador'
      : session?.role === 'MANAGER'
        ? 'Gestor'
        : 'Lojista';
  return (
    <div className={s.page}>
      <header className={s.heading}>
        <h1>Perfil</h1>
      </header>
      {error && <Notice tone="error">{error}</Notice>}
      {message && <Notice tone="success">{message}</Notice>}
      {loading ? (
        <EmptyState>A carregar perfil...</EmptyState>
      ) : (
        profile && (
          <div className={s.settings}>
            <section className={s.section}>
              <h2>Identidade</h2>
            <div className={s.profileIdentity}>
                <Avatar name={profile.name} src={profile.photoUrl} />
                <dl className={`${s.details} ${s.detailGrid}`}>
                  <div>
                    <dt>Nome do operador</dt>
                    <dd>{profile.name || '-'}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{profile.email || '-'}</dd>
                  </div>
                  <div>
                    <dt>Função</dt>
                    <dd>{role}</dd>
                  </div>
                  <div>
                    <dt>Telefone</dt>
                    <dd>{profile.phone || '-'}</dd>
                  </div>
                </dl>
              </div>
            </section>
            <section className={s.section}>
              <h2>Conta</h2>
              <div className={s.setting}>
                <span>Dados pessoais</span>
                <span className={s.muted}>{profile.email}</span>
                <button
                  className={s.iconButton}
                  title="Editar dados pessoais"
                  aria-label="Editar dados pessoais"
                  onClick={() => setModal('identity')}
                >
                  <Pencil size={16} />
                </button>
              </div>
              <div className={s.setting}>
                <span>Alterar palavra-passe</span>
                <span />
                <button
                  className={s.iconButton}
                  title="Alterar palavra-passe"
                  aria-label="Alterar palavra-passe"
                  onClick={() => setModal('password')}
                >
                  <KeyRound size={16} />
                </button>
              </div>
              <div className={s.setting}>
                <span>Autenticação de dois fatores</span>
                <span className={s.muted}>
                  {profile.twoFactorEnabled === undefined
                    ? 'Estado não disponibilizado'
                    : profile.twoFactorEnabled
                      ? 'Ativa'
                      : 'Inativa'}
                </span>
                <button
                  className={s.iconButton}
                  title="Autenticação de dois fatores"
                  aria-label="Autenticação de dois fatores"
                  onClick={() => setModal('2fa')}
                >
                  <ShieldCheck size={16} />
                </button>
              </div>
            </section>
            <section className={s.section}>
              <h2>Preferências</h2>
              <div className={s.setting}>
                <span>Idioma</span>
                <span>Português</span>
                <select
                  className={s.select}
                  aria-label="Idioma"
                  disabled
                  value="pt"
                  onChange={() => {}}
                >
                  <option value="pt">Português</option>
                </select>
              </div>
              {[
                'Notificações de sistema',
                'Alertas de SLA',
                'Relatório semanal por email',
              ].map((label) => (
                <div className={s.setting} key={label}>
                  <span>{label}</span>
                  <span className={s.muted}>Indisponível na API</span>
                  <input
                    type="checkbox"
                    aria-label={label}
                    disabled
                    title="Preferência não disponibilizada pela API"
                  />
                </div>
              ))}
            </section>
            <section className={s.section}>
              <h2>Sessão</h2>
              <dl className={s.details}>
                <div>
                  <dt>Último acesso</dt>
                  <dd>{formatAdminDate(profile.lastLogin, true)}</dd>
                </div>
                <div>
                  <dt>Conta criada</dt>
                  <dd>{formatAdminDate(profile.createdAt)}</dd>
                </div>
              </dl>
              <div className={s.setting}>
                <span>Dispositivos e histórico de acessos</span>
                <span className={s.muted}>Indisponível na API</span>
                <button
                  className={s.secondary}
                  onClick={() => setModal('sessions')}
                >
                  Consultar
                </button>
              </div>
            </section>
          </div>
        )
      )}
      {modal === 'identity' && profile && (
        <IdentityEditor
          profile={profile}
          onClose={() => setModal(null)}
          onSaved={(data) => {
            setProfile(data);
            setMessage('Perfil atualizado.');
            setModal(null);
            router.refresh();
          }}
        />
      )}
      {modal === 'password' && profile?.email && (
        <PasswordEditor
          email={profile.email}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            setMessage('Palavra-passe atualizada.');
          }}
        />
      )}
      {modal === '2fa' && (
        <Modal
          title="Autenticação de dois fatores"
          onClose={() => setModal(null)}
        >
          <Notice>
            A API possui operações de configuração, ativação e desativação, mas
            ainda não documenta os campos da resposta de configuração. A
            integração será ativada após confirmar esse formato e o fluxo de
            entrada com código.
          </Notice>
        </Modal>
      )}
      {modal === 'sessions' && (
        <Modal title="Sessões e acessos" onClose={() => setModal(null)}>
          <Unavailable>
            Listagem de dispositivos, revogação de sessões e histórico completo
          </Unavailable>
        </Modal>
      )}
    </div>
  );
}

function IdentityEditor({
  profile,
  onClose,
  onSaved,
}: {
  profile: Profile;
  onClose: () => void;
  onSaved: (p: Profile) => void;
}) {
  const [form, setForm] = useState({
    name: profile.name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!form.name.trim()) throw new Error('Indique o nome.');
      const data = await updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      });
      onSaved(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : 'Não foi possível guardar o perfil.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Editar dados pessoais" onClose={onClose} busy={busy}>
      <form className={s.form} onSubmit={submit}>
        <label>
          Nome
          <input
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </label>
        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>
        <label>
          Telefone
          <input
            type="tel"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className={s.footer}>
          <button
            type="button"
            className={s.secondary}
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className={s.button} disabled={busy}>
            {busy ? 'A guardar...' : 'Guardar perfil'}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function PasswordEditor({
  email,
  onClose,
  onSaved,
}: {
  email: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      if (!sent) {
        await requestPasswordReset(email);
        setSent(true);
      } else {
        if (password !== confirmation)
          throw new Error('As palavras-passe não coincidem.');
        await confirmPasswordReset(email, code, password);
        onSaved();
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Não foi possível alterar a palavra-passe.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Alterar palavra-passe" busy={busy} onClose={onClose}>
      <form className={s.form} onSubmit={submit}>
        <p className={s.muted}>
          {sent
            ? 'Pedido aceite. Introduza o código recebido no seu email.'
            : `Enviar código de confirmação para ${email}?`}
        </p>
        {sent && (
          <>
            <label>
              Código de confirmação
              <input
                required
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
            <label>
              Nova palavra-passe
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            <label>
              Confirmar palavra-passe
              <input
                required
                type="password"
                minLength={8}
                autoComplete="new-password"
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
              />
            </label>
          </>
        )}
        {error && <Notice tone="error">{error}</Notice>}
        <div className={s.footer}>
          <button
            type="button"
            className={s.secondary}
            disabled={busy}
            onClick={onClose}
          >
            Cancelar
          </button>
          <button className={s.button} disabled={busy}>
            {busy
              ? 'A processar...'
              : sent
                ? 'Atualizar palavra-passe'
                : 'Enviar código'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
