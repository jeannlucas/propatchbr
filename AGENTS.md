# Pro Patch BR — Governança e Instruções Locais

> **Autoridade Canônica Local:** Este documento orienta todas as ferramentas de IA (Google Antigravity, OpenAI Codex e Claude Code) que operam no repositório `propatchbr`.  
> **Continuidade Operacional:** Consulte compulsoriamente [docs/ai/HANDOFF.md](docs/ai/HANDOFF.md) para o estado ativo e histórico de trabalho.  
> **Diretrizes Globais:** Sujeito às 44 práticas globais da BigDev.Z ([padroes-engenharia-bigdevz.md](~/.agents/governanca/padroes-engenharia-bigdevz.md) e [padroes-qa-bigdevz.md](~/.agents/governanca/padroes-qa-bigdevz.md)).  
> **Filosofia Central:** A máquina dá o primeiro NÃO antes de qualquer humano inspecionar (*Backpressure*). O código responde a contratos duradouros (*Spec-Anchored*).

---

## 1. Identidade e Domínio

- **Produto:** Plataforma moderna de comércio eletrônico e distribuição protegida de patches/mods para **Winning Eleven 10 (PS2 / OPL)**.
- **Modelo de Negócio:** Vitrine com menor preço de entrada (a partir de R$ 24,90), seletor de modalidades (Versão Avulsa, 30 dias de atualizações, 90 dias de atualizações; planos trimestrais/anuais/vitalícios no catálogo), checkout PIX transparente via AbacatePay e concessão automática de licenças (*entitlements*).
- **Proteção Anti-Pirataria e Entrega de Mídia:** Distribuição de ISOs via endpoint protegido (`/api/downloads/file`) com tokens JWT assinados temporários (validade de 2 horas) a partir do armazenamento local (`STORAGE_LOCAL_PATH`) ou provedor configurado, validando compulsoriamente a existência de licença ativa no banco de dados.
- **Modo do Repositório:** **MANUTENÇÃO / OPERAÇÃO**.
- **Idioma:** Código, identificadores e commits em inglês técnico; documentação, comunicação com o usuário e comentários em **português do Brasil**.

---

## 2. Stack Tecnológica e Arquitetura

- **Frontend & Aplicação:** Next.js 16 (App Router, Server Actions), React 19, TypeScript 5, Tailwind CSS v4, Radix UI, Lucide React.
- **Backend & Dados:** PostgreSQL 16 (local via Docker Compose ou remoto), Drizzle ORM (`drizzle-orm` / `drizzle-kit`), driver `postgres`.
- **Autenticação & Sessões:** Autenticação nativa com sessões em PostgreSQL e tokens JWT (`jose`, `bcryptjs`), suporte a Google OAuth e compatibilidade legada com Supabase Auth (SSR).
- **Gateway de Pagamento:** AbacatePay API v2 (cobrança PIX instantânea e processamento de webhooks `checkout.completed`).
- **Infraestrutura:** Docker Compose (`docker-compose.yml`) com containers `propatch_postgres` (porta 5434) e `propatch_app` (porta 3002).

---

## 3. Soberania Humana e Governança de Git

> [!CAUTION]
> Regras inegociáveis de soberania de versionamento e integridade de ambiente.

1. **Soberania de Git:** Commits e pushes para branches principais são de autoridade exclusiva de Jeann Lucas. Nenhuma IA faz push ou merge sem autorização prévia e explícita.
2. **Estratégia Obrigatória de Branches:**
   - `main`: Branch de **produção** (estável, protegida; estritamente proibido desenvolver direto nela).
   - `dev`: Branch de **desenvolvimento e integração contínua**.
   - `feature/<nome>` ou `fix/<nome>`: Branches de trabalho que **sempre nascem a partir da `dev`** (preferencialmente em Git Worktree) e retornam para a `dev` após testes 100% verdes e aprovação humana.
3. **Zero Credenciais Rastreadas:** Proibição estrita de ler, imprimir em logs ou commitar arquivos `.env` reais, chaves privadas ou tokens de API. Use estritamente `.env.example` com placeholders.
4. **Isolamento de Mudanças:** Toda tarefa que altere código ou arquitetura deve operar em ambiente isolado (Git Worktree ou branch dedicada criada a partir de `dev`).
5. **Autoridade do Servidor (*Zero-Trust*):** O FRONTEND ENCANTA. O BACKEND DECIDE E PROTEGE. Preços e prazos são definidos e validados exclusivamente no servidor; o cliente envia apenas intenções de compra.
6. **Validação de Webhooks:** Webhook AbacatePay (`checkout.completed`) deve validar assinatura de segurança e garantir idempotência transacional no processamento.
7. **Segurança de Downloads:** Downloads só são gerados após validação de licença (*entitlement*) ativa na base de dados. Links temporários expiram e são rejeitados compulsoriamente se a licença estiver vencida ou revogada.

---

## 4. Gestão de Portas Locais e Segurança Docker (Ambiente Seguro)

1. **Verificação Prévia Obrigatória:** Antes de subir qualquer container Docker (`docker compose up`) ou servidor local (`npm run dev`), o agente DEVE verificar se a porta pretendida no host está ocupada usando `lsof -i :<porta>` ou `docker ps` para prevenir colisões entre múltiplos projetos ativos no Mac.
2. **Sem Portas Padrão Hardcoded:** Nunca assumir que portas padrão (`5432`, `6379`, `3000`, `8000`) estão livres no Mac do desenvolvedor.
3. **Parametrização via Variáveis de Ambiente:** No `docker-compose.yml`, mapeamentos de portas do host devem usar bind local seguro em loopback (`127.0.0.1`) e variáveis de ambiente com portas padrão isoladas no `.env.example` (ex: `127.0.0.1:${POSTGRES_PORT:-5434}:5432`, `127.0.0.1:${APP_PORT:-3002}:3000`), evitando contaminação acidental entre bancos e serviços de projetos diferentes rodando simultaneamente.
4. **Resolução de Conflitos:** Se uma porta estiver em uso por outro projeto ativo, o agente deve sugerir e configurar uma porta livre alternativa em vez de falhar ou interromper o container do projeto vizinho.
5. **Segurança Docker & .dockerignore:** O arquivo `.dockerignore` deve obrigatoriamente bloquear qualquer `.env*` (permitindo apenas `!.env.example`). O `Dockerfile` adota multi-stage build, roda sob usuário não-root (`USER nextjs`) e nunca embute credenciais reais ou senhas utilizáveis em camadas ou fallbacks.
6. **Proteção de Fallbacks no Compose:** Proibido chumbamento de senhas reais em fallbacks; variáveis críticas exigem definição explícita (`:?Defina ... no .env`) ou uso de placeholders inofensivos.

---

## 5. Fidelidade à Stack e Proibição de Alucinação de APIs

1. **Zero Invenção de Métodos:** É expressamente proibido supor métodos, parâmetros ou inventar assinaturas de funções inexistentes.
2. **Consulta Obrigatória à Versão Real:** O agente DEVE verificar a versão exata das dependências no projeto (`package.json`, lockfiles) antes de escrever código. Bibliotecas modernas (Next.js 16, Tailwind CSS v4, Drizzle ORM, React 19) sofrem mudanças drásticas entre versões.
3. **Fonte Primária da Verdade:** Em caso de dúvida sobre tipagem ou APIs, o agente DEVE consultar os arquivos de tipos locais (`.d.ts`), o código em `node_modules/` ou a documentação oficial da versão exata antes de codificar.
4. **Sem Dependências Não Solicitadas (YAGNI):** Proibido instalar bibliotecas ou pacotes novos (`npm install`) sem autorização prévia e explícita de Jeann Lucas. Priorize sempre a biblioteca padrão e as dependências já instaladas no projeto.

---

## 6. As 3 Camadas de Contexto e Continuidade

- **L1 (Operacional):** Este arquivo `AGENTS.md` de governança local e as diretrizes globais de engenharia.
- **L2 (Contratos de Negócio - Specs):** Toda nova funcionalidade relevante deve ter sua especificação permanente em `specs/<capability>/<capability>.md`, com critérios de aceite numerados (`AC-001`, `AC-002`...).
- **L3 (Planos Efêmeros):** Planos de implementação guiam a sessão imediata e são descartados ou consolidados após o encerramento da tarefa.
- **Continuidade Operacional (Handoff):** Ao iniciar uma nova sessão, o agente DEVE ler `docs/ai/HANDOFF.md` para retomar de onde o trabalho anterior parou. Ao pausar a sessão ou atingir limites de contexto/tokens, o agente deve atualizar o `docs/ai/HANDOFF.md` via skill `handoff`.

---

## 7. Ciclo de Desenvolvimento e Backpressure Pré-Push

1. **Delta Provado:** Antes de implementar um bugfix ou feature, demonstre no terminal a falha ou a ausência da funcionalidade (teste falhando, log ou rota inexistente).
2. **Ambiguidades de Negócio:** Se houver dúvida ou bifurcação em regras de negócio, pare imediatamente e pergunte, apresentando opções estruturadas e recomendação clara.
3. **Desenvolvimento Guiado por Testes (TDD):**
   - Escreva o teste primeiro (vermelho) ancorado no critério de aceite correspondente (`AC-00X`).
   - Escreva o código mínimo necessário para o teste passar (verde).
   - Refatore eliminando complexidade desnecessária (YAGNI / DRY / Clean Code).
4. **Backpressure Determinístico Obrigatório (Espelhamento do CI / Pré-Push):**
   - A pipeline do GitHub Actions (`.github/workflows/ci.yml`) executa linter (`npm run lint`), checagem estática de tipos (`npm run typecheck`) e compilação de produção (`npm run build`).
   - O comando de validação local unificado DEVE espelhar exatamente essas etapas:
     ```bash
     npm run check
     ```
   - **REGRA INEGOCIÁVEL DE PRÉ-PUSH:** Nenhum push para o GitHub pode ser sugerido ou realizado sem que o comando `npm run check` tenha rodado e passado com **ZERO erros** no terminal do Mac.
   - Se qualquer verificação falhar localmente, o agente deve corrigir o problema no loop interno antes de apresentar o trabalho a Jeann Lucas. A pipeline remota deve ser apenas um espelho com 100% de sucesso daquilo que já foi validado localmente.

---

## 8. Revisão e Evidência Final (Formato Obrigatório de Entrega)

O agente deve revisar o `git diff` garantindo que apenas os arquivos necessários foram modificados.  
Toda conclusão de feature ou correção DEVE ser entregue ao humano estruturada obrigatoriamente assim:
1. **O que foi feito?** — Resumo executivo em tópicos claros e objetivos explicando o que foi implementado ou corrigido.
2. **Critérios de Aceite Atendidos** — Lista dos critérios da spec (`AC-001`, `AC-002`, etc.) que foram satisfeitos.
3. **Arquivos Alterados** — Lista dos arquivos criados ou modificados.
4. **Comprovação de Backpressure** — O comando de verificação executado (`npm run check`) e o log comprovando 100% de sucesso (zero erros).
5. **Evidência Visual (se envolver Frontend / UI)** — Screenshots e logs do Chrome DevTools comprovando ausência de erros no console e layout correto.

---

## 9. Instruções do Framework Next.js

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

## Ajustes pendentes para a retomada

Antes de iniciar implementação ou infraestrutura, leia [docs/ai/AJUSTES-PARA-RETOMADA.md](docs/ai/AJUSTES-PARA-RETOMADA.md). A lista registra prioridades, evidências, paridade de segurança Mac/VPS e avaliação de material antigo; não autoriza executar toda a fila nem excluir recursos. Preserve alterações preexistentes e worktrees protegidos; as regras globais e a autorização humana permanecem obrigatórias.
