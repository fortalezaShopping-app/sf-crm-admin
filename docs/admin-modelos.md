# Painel administrativo: modelos e integracao

Implementacao das referencias visuais de notificacoes/campanhas, utilizadores,
taloes, recompensas, definicoes e perfil. Mantem Dax, a identidade visual existente,
pesquisa por URL, autorizacao por sessao e o proxy autenticado do projeto.

## Contrato verificado

Consulta read-only em 13/09/2026 de
[api-docs publicado](https://api.appshoppingfortaleza.ao/api-docs).
Nao foram criados dados nem executadas mutacoes em producao.

| Area | Operacoes ligadas | Dependencias pendentes |
| --- | --- | --- |
| Utilizadores | Listar todas as funcoes, pesquisar, exportar CSV, criar contas internas, editar contactos, associar lojista, ativar/desativar | Saldo/nivel individual, ajuste de pontos, log completo e alteracao de funcoes |
| Notificacoes | Listar, pesquisar, filtrar por leitura/data, marcar como lida | Publico destinatario, campanhas, alcance, segmentacao e envio agendado |
| Destaques | Criacao e edicao em `/api/admin/store-content` com loja, titulo, corpo e estado | Valores aceites de `status` nao enumerados; editor sugere valores recebidos e valida no servidor |
| Taloes | Listar, pesquisar, exportar, consultar imagem/OCR/validacao, aprovar/rejeitar com confirmacao | Identidade/historico do cliente e pedido de informacao a loja |
| Recompensas | Catalogo paginado, pesquisa, stock, exportacao | Criacao/edicao/ativacao, imagem, validade, stock ilimitado, resgates por recompensa |
| Perfil | Nome, email, telefone e alteracao de palavra-passe com codigo | Preferencias, dispositivos, revogacao e historico completo |
| Definicoes | Acessos a carrossel e conteudos | Leitura/gravacao global, reset de pontos e exportacao global |

Os endpoints 2FA existem, mas a resposta de setup e um objeto sem propriedades
documentadas. O painel nao ativa 2FA antes da confirmacao desse formato e do fluxo
de login, para nao bloquear o acesso do operador.

## Formularios preparados

- Campanha: mensagem/destino, segmentacao e agendamento/resumo. Datas em UTC+1.
- Recompensa: nome, descricao, pontos, categoria, imagem local limitada a 5 MB,
  stock, validade, estado e revisao.
- Definicoes: editores numericos e janela horaria.

As gravacoes pendentes estao desativadas e identificadas. Os dados destes
formularios ficam apenas em memoria enquanto o modal estiver aberto: nao ha
rascunhos ficticios, envio de notificacoes ou gravacao local apresentada como API.
As categorias e segmentos do modelo precisam de mapeamento para os futuros DTOs.
Ausencia de stock nao significa stock ilimitado; ausencia de estado nao significa ativo.

## Validacao local

```bash
npm run lint
npm run typecheck
npm test
npx playwright install chromium
npm run test:e2e
npm run build
```

Os testes E2E usam Next em `localhost:3103` e um servidor HTTPS local em
`127.0.0.1:4443`, com certificado efemero criado por OpenSSL e confiado apenas pelo
processo de teste. As duas portas devem estar livres. Fixtures sao demonstrativas.
Capturas desktop/mobile e traces de falhas ficam em `test-results/` (ignorado no Git).
Requer Node com suporte a `--experimental-strip-types` (validado com Node 24).

Validacao local nao substitui UAT contra o backend real nem confirma entrega de
email/push. Nao houve publicacao desta versao.

## Dependencias

O `npm audit` desta verificacao reportou 8 alertas (1 critico, 6 altos e 1 moderado),
incluindo o Next.js 16.2.10 ja utilizado no projeto. A atualizacao do framework e
das dependencias transitivas nao foi misturada com esta implementacao visual.
Tratar os alertas e repetir a validacao antes de publicar; o relatorio do audit
nao demonstra exploracao nem confirma a aplicabilidade de cada aviso em producao.
