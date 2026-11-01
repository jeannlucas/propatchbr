# Handoff Universal — Pro Patch BR

> **Autoridade Canônica Local:** Este documento define a continuidade operacional entre Google Antigravity e OpenAI Codex para o projeto `Pro Patch BR`.
> **Diretrizes Globais:** Em conformidade com o GOV-03 (Handoff Universal) e as 44 práticas globais da BigDev.Z ([padroes-engenharia-bigdevz.md](~/.agents/governanca/padroes-engenharia-bigdevz.md) e [padroes-qa-bigdevz.md](~/.agents/governanca/padroes-qa-bigdevz.md)).

---

## 1. Contexto e Identidade do Projeto

- **Nome Canônico:** Pro Patch BR (`propatchbr`).
- **Repositório:** `/Users/jeannlucasdev/Documents/Projetos/propatchbr`.
- **Propósito:** Plataforma moderna de comércio eletrônico e distribuição protegida de patches e mods para **Winning Eleven 10 (PS2 / OPL)**.
- **Princípio Arquitetural:**
  - *O FRONTEND ENCANTA. O BACKEND DECIDE E PROTEGE.*
  - A segurança e o controle de acesso começam na arquitetura: vitrine com menor preço de entrada (R$ 24,90), checkout transparente via PIX (AbacatePay), concessão automática de licenças (*entitlements*) e distribuição de arquivos ISO via endpoint protegido com tokens JWT temporários (validade de 2 horas).
- **Modo do Repositório:** **MANUTENÇÃO / OPERAÇÃO**.

---

## 2. Tecnologias e Ambiente

- **Frontend & Aplicação:** Next.js 16.3.5 (App Router, Server Actions), React 19.2.8, TypeScript 5, Tailwind CSS v4, Lucide React, Radix UI.
- **Backend & Dados:**
  - Banco de Dados: PostgreSQL 16 (local via Docker ou remoto via Supabase).
  - ORM & Migrations: Drizzle ORM 0.45.3, Drizzle Kit 0.31.11, driver `postgres` 3.4.9.
  - Autenticação: Supabase Auth (SSR) com suporte a sessões em PostgreSQL e tokens JWT (`jose`, `bcryptjs`).
- **Gateway de Pagamento:** AbacatePay API v2 (cobrança PIX e processamento de webhooks `checkout.completed`).
- **Infraestrutura:** Docker Compose (`docker-compose.yml`) com containers `propatch-postgres` (porta 5434) e `propatch-app` (porta 3002).

---

## 3. Estado Operacional Atual e Histórico

### 3.1. Estado do Repositório
- **Status Operacional:** **OPERAÇÃO / MANUTENÇÃO ESTÁVEL**.
- **Módulos Concluídos e Funcionais:**
  1. Vitrine Pública (`/`): Exibição do patch principal (*Pro Patch 2026*) com menor preço em destaque.
  2. Página de Produto (`/produtos/[id]` ou slug `pro-patch-2026`): Seletor de planos no catálogo (modalidades 30d/90d em migrations; planos trimestrais/anuais/vitalícios no seed).
  3. Checkout & Pagamento: Criação de cobrança PIX via AbacatePay e recebimento de webhooks.
  4. Gestão de Licenças (*Entitlements*): Cálculo automático do período de vigência e concessão do acesso na tabela `licenses`.
  5. Dashboard do Cliente (`/dashboard`): Painel protegido para geração de tokens JWT assinados temporários para download das ISOs.
  6. Painel Administrativo (`/admin/planos`): Gestão dinâmica de planos, preços e metadados.

### 3.2. Histórico de Commits Recentes
- `809bbb6` (HEAD): `feat(branding): add custom Pro Patch BR favicons and app icons`.
- `8df6449`: `fix(ui): remove overlapping PS2 / OPL badge from game cover art`.
- `d403d52`: `fix(db): rename product to Pro Patch 2026 with pro-patch-2026 slug`.
- `dc77f3f`: `fix(ui): improve plan selection cards, badges, and support product slug url`.
- `86a7980`: `feat: implement native Google OAuth authentication with PostgreSQL session`.

---

## 4. Decisões Arquiteturais e Referência a Planos

- **Validação Server-Side e Zero-Trust:** Valores, prazos e direitos de download são checados exclusivamente no backend.
- **Entrega de Mídia via Tokens JWT Temporários:** Downloads são servidos a partir de volume/filesystem (`STORAGE_LOCAL_PATH`) através de tokens JWT com expiração de 2 horas gerados após validação de licença ativa.
- **Persistência via Drizzle ORM:** Tabelas e schemas versionados em `src/infra/db/schema.ts` e gerenciados por Drizzle Kit.
- **Docker Compose com Portas Isoladas:** Postgres local mapeado em `127.0.0.1:5434` e aplicação em `127.0.0.1:3002` para evitar conflito com outros serviços locais.

---

## 5. Working Tree e Arquivos Locais

- **Branch Ativa:** `main` (branch única e padrão do repositório).
- **Commit HEAD:** `809bbb6c366e7b23144ebc0de14820c726c18901`.
- **Estado do Working Tree Inicial:** Totalmente limpo.
- **Arquivos Deste Checkpoint:**
  - `M AGENTS.md`: Atualizado com governança local, regras de negócio e referências às 44 práticas globais.
  - `docs/ai/HANDOFF.md`: Criado como Handoff Universal canônico do projeto.
  - Zero alterações em código da aplicação, componentes ou infraestrutura.

---

## 6. Evidências de Qualidade e Conformidade com as 44 Práticas Globais

- **Engenharia de Software (19 Padrões):**
  - Organização em `src/app` (rotas e handlers), `src/infra` (banco Drizzle, pagamentos e clientes) e `src/core`.
  - Validação de entrada com Zod em schemas de formulários e APIs.
  - Imagem Docker multi-stage otimizada para produção.
- **Quality Assurance (25 Padrões):**
  - *Estado Atual:* Não há suíte automatizada de testes (unitários/E2E) configurada no repositório.
  - *Mitigação:* Toda alteração deve ser validada por testes manuais rigorosos e caracterização prévia antes de qualquer refatoração.
  - Zero testes funcionais executados nesta sessão estritamente documental.

---

## 7. Pendências, Riscos e Hardening Futuro

- **Hardening Recomendado em Webhooks e Downloads:**
  - Validação estrita de assinatura no corpo do webhook AbacatePay e reforço contra processamento duplicado de eventos de licença.
  - Revalidação de licença no endpoint de entrega física do arquivo (`/api/downloads/file`).
- **Riscos Operacionais e de Ambiente:**
  - Branch única `main`: Toda modificação precisa de revisão e validação manual antes de commit.
  - Ausência de suíte de testes automatizados: Recomenda-se propor testes E2E para o fluxo crítico de checkout e downloads em checkpoints futuros.

---

## 8. Próximos Passos e Ações Permitidas

- **Ações Permitidas:**
  - Inspeção documental, conferência de schemas via `drizzle-kit` e testes manuais locais.
- **Ações Proibidas Sem Autorização Humana:**
  - Commits e pushes para a branch `main`.
  - Execução de migrations contra bancos remotos ou de produção.
  - Deploys em produção ou alterações em regras de webhooks.


## Registro documental de retomada em 15/10/2026

Por solicitação do Jeann, foi acrescentado [AJUSTES-PARA-RETOMADA.md](AJUSTES-PARA-RETOMADA.md), com prioridades, evidências, critérios de aceite, infraestrutura Mac/VPS e materiais antigos a avaliar. AGENTS.md recebeu o ponteiro de leitura. Arquivos desta entrega: `docs/ai/AJUSTES-PARA-RETOMADA.md`, `AGENTS.md` e este registro em `docs/ai/HANDOFF.md`; todos permanecem fora de commit, preservando o staging anterior.

Escopo exclusivamente documental: nenhum código, compose, ambiente real, dado, referência Git ou worktree protegido foi alterado. Nenhum teste/build, fetch, migration, deploy, push ou acesso à VPS foi executado. Resultados históricos não foram revalidados. Este acréscimo não altera o estado de aprovação de checkpoints anteriores nem concede autorização operacional. Próximo passo: escolher um item com o Jeann, revalidar o estado real da árvore e executar somente o escopo autorizado.

---

## Registro de Padronização de Governança e Backpressure em 01/11/2026

Atualização da governança do repositório para conformidade com o padrão oficial de engenharia BigDev.Z:
1. **Governança de Branches:** Branch `dev` preparada a partir de `main`. Fluxo padronizado: `main` (produção), `dev` (integração), `feature/*` e `fix/*` nascem de `dev`.
2. **Backpressure Pré-Push Determinístico:** Configurado script `npm run check` (`npm run lint && npm run typecheck && npm run build`), testado e 100% verde localmente no Mac.
3. **Pipeline de CI:** Criado workflow GitHub Actions `.github/workflows/ci.yml` espelhando fielmente o gate local de lint, tipagem e build.
4. **Segurança Docker & .env:**
   - `.dockerignore` endurecido para bloquear `.env*` (permitindo apenas `!.env.example`).
   - `docker-compose.yml` ajustado com bind local `127.0.0.1`, portas parametrizadas (`POSTGRES_PORT:-5434`, `APP_PORT:-3002`) e remoção de fallbacks com senhas utilizáveis.
   - `Dockerfile` revisado: multi-stage build, usuário não-root `nextjs` e variáveis dummy de compilação sem segredos.
   - `.env.example` 100% preenchido com todas as variáveis utilizadas pela aplicação e docker-compose com placeholders seguros.
5. **Camada de Specs (L2):** Criada pasta `specs/` com `specs/README.md` e `specs/TEMPLATE.md` (com critérios de aceite `AC-00X` e matriz de rastreabilidade).
6. **Auditoria e Limpeza de Legado Concluída:** Sob autorização explícita do desenvolvedor, foram excluídos por blocos:
   - Módulos órfãos e código morto (`src/infra/payments`, `src/infra/supabase`).
   - Migrações legadas do Supabase (`supabase/`) e configuração residual v3 (`tailwind.config.ts`).
   - Assets de template Next.js não utilizados em `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
   - Scaffold fantasma de pastas vazias (`src/core/`, `src/modules/{billing,entitlements,admin}`, `src/infra/{storage,email}`).
   - Cache de compilação `tsconfig.tsbuildinfo`.
7. **Validação Pós-Limpeza:** O comando de integridade `npm run check` foi executado imediatamente após as exclusões, passando com 100% de sucesso (zero erros).
