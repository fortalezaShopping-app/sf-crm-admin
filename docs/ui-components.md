# Componentes do painel

O sf-admin usa agora shadcn/ui, com componentes Radix e Tailwind CSS 4.
O codigo dos componentes pertence ao repositorio: `src/components/ui/`.
Nao foi substituido o layout aprovado nem a fonte Daxline.
Os componentes oficiais foram obtidos do registo new-york-v4. A licenca MIT
original esta preservada em `src/components/ui/LICENSE.md`.

## O que reutilizar

- `Button`: comandos, confirmacoes e links de acao (`asChild`). Variantes
  `default`, `outline`, `secondary`, `ghost`, `destructive` e `success`.
- `IconButton`: botoes de ferramentas com nome acessivel e tooltip.
- `Input`, `Textarea`, `NativeSelect`: campos, validacao HTML e estados de foco.
  O select nativo preserva a experiencia do sistema em telemoveis.
- `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`: alternar vistas, com suporte
  a setas do teclado e atributos de acessibilidade.
- `Badge`: estado compacto; `data-tone` aceita success, danger e warning.
- `Alert`: avisos e erros. Preferir `Notice` do Workspace nos fluxos existentes.
- `Modal` em `components/admin/Workspace.tsx`: fachada comum sobre Dialog.
  Recebe titulo, onClose, busy e wide; gere foco, rolagem, Escape e retorno ao
  controlo que abriu o formulario. Nao fecha ao clicar fora, evitando perder
  dados. Durante uma gravacao, os botoes do formulario tambem devem ser
  desativados pelo respetivo estado busy.
- `Pagination` continua a centralizar a navegacao de todas as listas.

Os componentes estao aplicados a utilizadores, notificacoes, campanhas,
recompensas, taloes, perfil, definicoes, lojas, eventos, carrossel, dashboard,
analytics, clientes, login e area do lojista. Os layouts e componentes de
dominio continuam em CSS Modules. Filtros, tabelas, imagens, scanner QR e
regras de negocio nao foram substituidos por novas bibliotecas.

## Tema e manutencao

- `src/app/shadcn.css` liga as cores semanticas ao tema existente. Mantem a
  fonte Daxline, a cor principal do shopping e os estados verde/vermelho.
- `src/app/globals.css` e importado na camada legacy. O reset global Preflight
  nao e carregado, para preservar as paginas existentes.
- `src/lib/utils.ts` fornece cn() para compor classes com tailwind-merge.
- `components.json` configura aliases e o estilo new-york do shadcn.
- As variantes plain de Button servem apenas aos controlos estruturais legados,
  como linhas selecionaveis. Novos comandos devem usar variantes semanticas.

Para adicionar outro componente, a partir de sf-admin:

```bash
npx shadcn@latest add checkbox
```

Rever sempre o diff. Nao substituir os componentes existentes com --overwrite:
ha adaptacoes locais de tema, acessibilidade, dimensoes e movimento reduzido.
As tooltips fecham sem animacao de saida para nao reter o Escape de um modal
apos o foco passar para outro campo.

## Validacao

```bash
npm run lint
npm run typecheck
npm test
npm run test:e2e
npm run build
```

Os testes de navegador usam uma API HTTPS local de teste. Cobrem desktop e
telemovel, formularios, foco, tooltips, separadores, validacao, imagens e os
fluxos existentes. Nao sao uma validacao de producao.
O servidor E2E usa .next-e2e e tsconfig.e2e.json, separados do servidor habitual
em .next. O build e o typecheck principal nao incluem os tipos temporarios E2E.
NEXT_DIST_DIR permite separar os artefactos de verificacao quando necessario.

Nao foram criadas novas operacoes de backend. As funcionalidades sem contrato
continuam indisponiveis, conforme `docs/pendencias-api-backend.txt`.

A auditoria de dependencias ainda assinala vulnerabilidades preexistentes,
incluindo Next.js 16.2.10. A atualizacao de seguranca do framework continua
pendente; esta integracao nao equivale a uma aprovacao de seguranca para deploy.

Referencias oficiais:
- https://ui.shadcn.com/docs/installation/manual
- https://ui.shadcn.com/docs/theming
- https://tailwindcss.com/docs/preflight
