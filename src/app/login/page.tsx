import { ShoppingLogo } from '@/components/brand/ShoppingLogo';

import { LoginForm } from './login-form';

const metrics = [
  { label: 'operacao', value: 'CRM' },
  { label: 'canal web', value: 'Admin' },
  { label: 'API v1', value: 'Online' },
];

export default function LoginPage() {
  return (
    <main className="login-page">
      <section className="login-intro" aria-label="Resumo do painel">
        <ShoppingLogo />

        <div className="login-intro__content">
          <p className="eyebrow">Backoffice Shopping Fortaleza</p>
          <h1>Gestao central para lojas, clientes e recompensas.</h1>
          <p>
            Uma base limpa para evoluir o CRM do shopping: autenticar administradores,
            acompanhar comprovativos e preparar os fluxos que chegam da API.
          </p>

          <div className="intro-metrics">
            {metrics.map((metric) => (
              <div className="intro-metric" key={metric.label}>
                <strong>{metric.value}</strong>
                <span>{metric.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="login-panel" aria-label="Entrar no admin">
        <div className="login-card">
          <div className="login-card__header">
            <p className="eyebrow">Acesso restrito</p>
            <h1>Entrar no admin</h1>
            <p>Use uma conta administrativa para acessar o painel web.</p>
          </div>

          <LoginForm />
        </div>
      </section>
    </main>
  );
}
