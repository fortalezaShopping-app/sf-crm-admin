# Seguranca do painel

Revisao local: 14/09/2026. Escopo: `sf-admin`, sem alteracoes na API, VPS ou mobile.

## Alteracoes

- Next.js e eslint-config-next alinhados em 16.3.5; lockfile atualizado para as
  correcoes de Sharp, PostCSS, Browserslist, brace-expansion, js-yaml e
  baseline-browser-mapping. A auditoria deve ser repetida antes de cada deploy.
- Otimizador de imagens desativado globalmente; as imagens autenticadas ja eram
  servidas sem otimizacao. A rota `/_next/image` nao deve processar imagens.
- Protecao contra enquadramento, deteccao incorreta de tipos e envio de formularios
  para outras origens. A camera continua permitida para leitura de QR.
- CSP restrita e sandbox nas respostas da API para impedir scripts em documentos
  enviados por utilizadores. A CSP das paginas nao e uma politica completa contra
  XSS; nao restringe ainda scripts com nonces.
- Respostas da API privadas e sem armazenamento em cache HTTP.
- Login, logout, proxy e compras verificam a origem das alteracoes. Headers
  `X-Forwarded-Host` enviados pelo cliente nao sao usados para autorizar pedidos.
- Sessao confirmada no backend; cookies antigos de funcao/loja nao autorizam
  operacoes. Nao existe fallback automatico para ADMIN. O proxy e o resumo do
  dashboard verificam a funcao antes de consultar recursos administrativos.
- Login e pedidos seguintes usam a mesma verificacao, sem depender de permissoes
  presentes apenas na resposta do login. Quando perfil/JWT omitem a funcao,
  consulta-se `/api/admin/users/{id}` apenas para o ID do perfil autenticado,
  confirmando a identidade devolvida e recusando contas inativas.
- Apenas dados autenticados da API/JWT ou mapeamento explicito no servidor
  determinam a loja. Cookies antigos de funcao/loja continuam sem autoridade.
- Falhas temporarias ao confirmar a sessao devolvem 503, nao 401, preservando o
  cookie sem permitir a operacao. A pagina permite tentar novamente. Expiracao,
  revogacao e recusa de acesso continuam a impedir pedidos; nao ha renovacao
  automatica de tokens sem suporte da API.
- Caminhos ambiguos e redirecionamentos do backend sao rejeitados pelo proxy.
- Limites de tamanho: 16 KiB para login/QR e 25 MiB para o pedido completo no proxy.
  Dados invalidos devolvem 400/415; pedidos demasiado grandes devolvem 413.
- Contagem de utilizadores no dashboard suporta respostas paginadas.

## Antes do deploy

1. Configurar `SF_MERCHANT_STORE_MAP` somente para contas cujo vinculo nao vem da
   API. Nao ha vinculos implicitos de contas de teste. Preferir IDs imutaveis;
   remover entradas obsoletas. Confirmar a funcao e loja nos dados autenticados.
2. Executar os comandos de validacao no README. Publicar o lockfile com o codigo.
3. Confirmar HTTPS, cookies Secure/HttpOnly/SameSite e preservacao dos cabecalhos
   no dominio real, atras do proxy utilizado no deploy. O HSTS aplica-se apenas
   ao host do painel, sem incluir automaticamente subdominios.
4. Testar login de administrador/gestor/lojista, QR com camera, upload real e
   recuperacao de palavra-passe num ambiente autorizado de homologacao.
   Confirmar tambem navegacao, recarregamento e nova aba apos o login, bem como
   recuperacao de indisponibilidade temporaria da API sem logout.
5. Confirmar que `/_next/image` devolve 404 e que os cabecalhos de seguranca
   permanecem presentes apos o deploy.

## Ainda depende do backend e infraestrutura

- Validar assinatura, expiracao e revogacao de tokens; aplicar permissoes e
  propriedade dos recursos em todos os endpoints, mesmo fora deste frontend.
- Na confirmacao de compra, verificar a loja e o cliente ANTES de creditar pontos,
  com transacao atomica e idempotencia. O contrato nao tem consulta de compra
  pendente para uma verificacao previa pelo painel; verificar a resposta depois
  do POST nao desfaz uma operacao indevida no backend.
- Aplicar limites de tentativas no login, recuperacao de senha e leitura/confirmacao
  de QR, usando armazenamento partilhado ou regras no gateway. Um contador em
  memoria no Next.js nao protegeria todos os processos/instancias.
- Completar o contrato de 2FA e revogacao de sessoes conforme as pendencias da API.
- Validar formato real dos uploads, tamanho, acesso e retencao no backend;
  nao confiar apenas em extensao, Content-Type ou verificacoes do navegador.
- Verificar logs/auditoria, backups e a seguranca do backend em homologacao.

Testes locais com API simulada nao comprovam autorizacao, entrega de mensagens,
credito de pontos, configuracao do proxy ou ausencia de vulnerabilidades em producao.

## Validacao local realizada

- `npm ci`: instalacao limpa concluida; lockfile reproduzivel.
- `npm run audit` e `npm audit --omit=dev`: zero vulnerabilidades reportadas.
- `npm run lint`, `npm run typecheck` e `npm run build`: aprovados.
- `npm test`: 9 testes aprovados.
- `npm run test:e2e`: 39 testes aprovados, incluindo telas a 1440/390 px,
  isolamento de lojistas, cookies adulterados, formularios, origem dos pedidos,
  limites de entrada e bloqueio de scripts em SVG aberto diretamente. Os 9 testes
  de sessao cobrem login sem funcao no perfil/JWT, navegacao/reload/nova aba,
  recuperacao de falhas temporarias e verificacao inconclusiva de um 401,
  identidade/permissoes, revogacao e expiracao real.
- A regressao de sessao foi reproduzida antes da correcao com API simulada:
  login 200 seguido de 401, e indisponibilidade 503 convertida em logout.
  A correcao foi validada sem chamadas autenticadas nem alteracoes em producao.
  Build repetido com `NEXT_DIST_DIR=.next-build npm run build`, sem interferir
  com o servidor de desenvolvimento existente.
- Build de producao executado apenas localmente: login 200; HSTS e protecao contra
  enquadramento presentes; otimizador 404; resumo sem sessao 401; API com no-store e
  sandbox; alteracao de outra origem 403.

## Referencias

- [Next.js: seguranca de dados](https://nextjs.org/docs/app/guides/data-security)
- [Next.js: cabecalhos HTTP](https://nextjs.org/docs/app/api-reference/config/next-config-js/headers)
- [Next.js: imagens sem otimizacao](https://nextjs.org/docs/app/api-reference/components/image#unoptimized)
