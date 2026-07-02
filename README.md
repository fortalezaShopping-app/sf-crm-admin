# SF CRM Admin

Base web administrativa do Shopping Fortaleza, construida com Next.js App Router.

## Scripts

```bash
npm install
npm run dev
```

O projeto usa `NEXT_PUBLIC_API_URL` para apontar para a API. Copie `.env.example`
para `.env.local` se precisar trocar o endereco.

## Estrutura inicial

- `/login`: autenticacao administrativa via `/api/v1/auth/admin/login`.
- `/dashboard`: shell inicial do backoffice com a paleta do Shopping Fortaleza.
- `src/lib/api.ts`: cliente HTTP base para integrar os proximos endpoints.
