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

### Associacao temporaria de lojistas

Enquanto a API nao devolver `storeId` no perfil ou JWT, o servidor do painel
pode resolver a loja de contas `STORE_USER` por uma lista temporaria:

```bash
SF_MERCHANT_STORE_MAP='{"lojista@exemplo.ao":12,"id:345":27}'
```

As chaves aceitam o email do lojista ou `id:<userId>` e os valores sao os IDs das
lojas. A variavel e exclusiva do servidor e nao deve usar o prefixo `NEXT_PUBLIC_`.
Dados reais recebidos da API/JWT tem prioridade sobre esta lista. Depois de alterar
a configuracao, o lojista deve iniciar uma nova sessao.

Nao existem associacoes de teste implicitas. Antes de atualizar um ambiente que
dependia dos antigos defaults, configure explicitamente os vinculos autorizados
em `SF_MERCHANT_STORE_MAP`. Prefira IDs imutaveis a emails editaveis.
Uma conta sem funcao reconhecida nao recebe permissoes administrativas e um
lojista sem loja nao consegue registar compras.

## Seguranca e validacao

Use Node.js 24 para os testes locais e `npm ci` para instalar o lockfile validado.

```bash
npm run audit
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Os testes E2E usam uma API HTTPS local simulada, sem credenciais nem alteracoes
em producao. Precisam de OpenSSL, Chromium do Playwright e portas 3103/4443 livres.
Na primeira execucao, instale o navegador com `npx playwright install chromium`.

O painel verifica a sessao junto da API e nao usa cookies de funcao/loja para
autorizar pedidos. Alteracoes exigem evidencia de mesma origem; clientes de teste
HTTP devem enviar o cabecalho `Origin` correspondente ao endereco do painel.
Os pedidos de login/QR aceitam ate 16 KiB e o proxy ate 25 MiB por pedido completo.

Login e pedidos seguintes usam a mesma verificacao. Quando o perfil e o JWT nao
incluem a funcao, o servidor consulta `/api/admin/users/{id}` apenas para o ID
devolvido pelo perfil autenticado. Dados presentes apenas na resposta do login
nao servem de permissao temporaria. Falhas de rede, limites de pedidos e erros
temporarios da API devolvem 503 sem apagar a sessao; a pagina permite tentar
novamente. Expiracao, revogacao e recusa de acesso continuam a bloquear a conta.
O painel nao prolonga tokens: o contrato atual nao disponibiliza renovacao.

Consulte [Seguranca do painel](docs/seguranca.md) para limites e verificacoes de
deploy. Uma auditoria npm limpa nao substitui a validacao de permissoes na API.

## Estrutura

- `/login`: autenticacao de administradores, gestores e lojistas, com encaminhamento
  por perfil de acesso.
- `/dashboard`: indicadores de lojas, imagens, clientes e utilizadores internos.
- `/dashboard/lojas`: catalogo dinamico com pesquisa e filtros, criacao, edicao,
  troca independente de imagem/logotipo, ativacao e desativacao.
- `/dashboard/eventos`: agenda dinamica com criacao, edicao, imagem, pesquisa,
  ativacao, desativacao, cancelamento e eliminacao.
- `/dashboard/carrossel`: gestao visual das imagens principais da Home mobile.
- `/dashboard/clientes`: consulta, ativacao e desativacao de contas `CUSTOMER` do aplicativo.
- `/dashboard/utilizadores`: gestao de `ADMIN`, `MANAGER` e `STORE_USER`, incluindo associacao a lojas e controlo de estado.
- `/dashboard/comprovativos`: aprovacao ou rejeicao de faturas por ID.
- `/dashboard/perfil`: consulta e atualizacao do perfil autenticado.
- `src/lib/api.ts`: cliente tipado para os endpoints da OpenAPI v1.
- `docs/openapi.json`: copia do contrato OpenAPI usado pela implementacao.

As imagens, logotipos e modelos oficiais de fatura das lojas sao carregados por
`/api/backend/api/admin/stores/{id}/image` e
`/api/backend/api/admin/stores/{id}/logo` e
`/api/backend/api/admin/stores/{id}/invoice-template`.
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

As telas de recompensas e definicoes ja estao disponiveis. Operacoes ainda nao
documentadas na API permanecem preparadas, sem gravacao simulada. As pendencias
estao em `docs/pendencias-api-backend.txt`.
