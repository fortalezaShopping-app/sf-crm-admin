# SF CRM Admin

Base web administrativa do Shopping Fortaleza, construida com Next.js App Router.

## Scripts

```bash
npm install
npm run dev
```

O projeto usa `NEXT_PUBLIC_API_URL` para apontar para a API. Copie `.env.example`
para `.env.local` se precisar trocar o endereco.

A URL da API deve usar HTTPS:

```bash
NEXT_PUBLIC_API_URL=https://187-127-227-251.sslip.io
```

No navegador, as chamadas passam por `/api/backend/*` no proprio Next.js. Isso evita
bloqueio de CORS durante o desenvolvimento e mantem a rota real da API em HTTPS no
servidor.

## Estrutura inicial

- `/login`: autenticacao administrativa via `/api/auth/login` e validacao em `/api/auth/me`.
- `/dashboard`: visao geral com indicadores de lojas, clientes, recompensas e regras.
- `/dashboard/lojas`: listagem e criacao de lojas aderentes.
- `/dashboard/clientes`: listagem de clientes do app mobile.
- `/dashboard/recompensas`: catalogo de recompensas para resgate.
- `/dashboard/regras`: configuracao das regras de pontuacao.
- `/dashboard/comprovativos`: validacao de faturas por ID.
- `/dashboard/utilizadores`: gestao de contas administrativas.
- `/dashboard/configuracoes`: CRUD de parametros do sistema.
- `/dashboard/auditoria`: consulta dos logs administrativos recentes.
- `src/lib/api.ts`: cliente HTTP base para integrar os endpoints da API.
