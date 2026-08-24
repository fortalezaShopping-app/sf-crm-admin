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
NEXT_PUBLIC_API_URL=https://api.appshoppingfortaleza.ao
```

No navegador, as chamadas passam por `/api/backend/*` no proprio Next.js. Isso evita
bloqueio de CORS durante o desenvolvimento e mantem a rota real da API em HTTPS no
servidor.

## Estrutura

- `/login`: autenticacao exclusiva de administradores por `/api/auth/admin/login`.
- `/dashboard`: indicadores de lojas, imagens, clientes e utilizadores internos.
- `/dashboard/lojas`: catalogo dinamico com pesquisa e filtros, criacao, edicao,
  troca independente de imagem/logotipo, ativacao e desativacao.
- `/dashboard/eventos`: agenda dinamica com criacao, edicao, imagem, pesquisa,
  ativacao, desativacao, cancelamento e eliminacao.
- `/dashboard/clientes`: consulta, ativacao e desativacao de contas `CUSTOMER` do aplicativo.
- `/dashboard/utilizadores`: gestao de `ADMIN`, `MANAGER` e `STORE_USER`, incluindo associacao a lojas e controlo de estado.
- `/dashboard/comprovativos`: aprovacao ou rejeicao de faturas por ID.
- `/dashboard/perfil`: consulta e atualizacao do perfil autenticado.
- `src/lib/api.ts`: cliente tipado para os endpoints da OpenAPI v1.
- `docs/openapi.json`: copia do contrato OpenAPI usado pela implementacao.

As imagens e logotipos das lojas sao carregados por
`/api/backend/api/admin/stores/{id}/image` e
`/api/backend/api/admin/stores/{id}/logo`.
O navegador envia apenas o cookie de sessao ao Next.js, e o proxy acrescenta o JWT
ao pedido feito para a API.

## Importacao das lojas

O importador usa a base preparada em `sf-mobile`, cruza as lojas por nome e piso,
otimiza as imagens antes do envio e atualiza registros existentes sem duplicar:

```bash
SF_ADMIN_EMAIL='admin@fortaleza.ao' \
SF_ADMIN_PASSWORD='defina-localmente' \
npm run import:stores -- --quiet
```

Para auditar o pareamento sem alterar a API e para validar os endpoints publicos:

```bash
npm run import:stores -- --dry-run
npm run import:stores -- --verify-only --quiet
```

As credenciais nunca sao guardadas no repositorio. Cortesias da Dul, Frammenti e
VOGA usam temporariamente a fotografia principal no endpoint de logo porque nao
ha logotipo isolado nos assets. Terrincha Maison e Tabacaria Executiva usam uma
imagem principal neutra gerada a partir do logotipo disponivel.

Os antigos ecras de recompensas, regras, configuracoes e auditoria foram retirados da
navegacao porque a API v1 nao expoe endpoints administrativos para esses recursos.
