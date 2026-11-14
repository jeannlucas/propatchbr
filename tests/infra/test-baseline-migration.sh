#!/usr/bin/env bash
# ==============================================================================
# ProPatch BR — Teste Automatizado de Baseline e Migração Drizzle
# Valida rigorosamente os cenários de migração e autorização explícita:
# 1. Banco vazio em modo normal -> Aplica 0000 e registra histórico normalmente
# 2. Base legada sem histórico em modo normal -> ABORTA sem gravar alterações
# 3. Base legada com constraint divergente em modo explícito -> ABORTA sem gravar histórico
# 4. Base legada com tipo/nulabilidade divergente em modo explícito -> ABORTA sem gravar histórico
# 5. Base legada compatível com --allow-baseline -> Registra baseline e conclui
# 6. Segunda execução na base compatível -> Preserva dados e histórico (idempotente)
# ==============================================================================
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$PROJECT_ROOT"

if ! command -v docker >/dev/null 2>&1; then
  echo "⚠️ Docker não disponível localmente. Pulando teste de integração de banco."
  exit 0
fi

# Buscar porta livre dinamicamente
TEST_PORT=5495
for p in 5495 5496 5497 5498 5499; do
  if ! lsof -i :$p >/dev/null 2>&1; then
    TEST_PORT=$p
    break
  fi
done

CONTAINER_NAME="propatch-baseline-test-${RANDOM}"

cleanup() {
  docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=========================================================="
echo "  ProPatch BR — Teste de Migração e Baseline Drizzle      "
echo "  Postgres Descartável na porta $TEST_PORT                "
echo "=========================================================="

docker run -d --rm --name "$CONTAINER_NAME" \
  -e POSTGRES_USER=propatch_user \
  -e POSTGRES_PASSWORD=test_password \
  -e POSTGRES_DB=postgres \
  -p "127.0.0.1:${TEST_PORT}:5432" \
  --health-cmd "pg_isready -h 127.0.0.1 -U propatch_user -d postgres" \
  --health-interval 1s \
  --health-timeout 2s \
  --health-retries 20 \
  postgres:16-alpine >/dev/null

# Aguardar PostgreSQL estar 100% pronto e saudável
for _ in $(seq 1 40); do
  STATUS=$(docker inspect "$CONTAINER_NAME" --format '{{.State.Health.Status}}' 2>/dev/null || echo "starting")
  if [ "$STATUS" = "healthy" ]; then
    break
  fi
  sleep 0.5
done

BASE_URL="postgresql://propatch_user:test_password@127.0.0.1:${TEST_PORT}"

# ------------------------------------------------------------------------------
# Cenário 1: Banco Vazio em Modo Normal
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 1: Banco vazio em modo normal aplica 0000 normalmente .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_empty
DATABASE_URL="${BASE_URL}/db_empty" node scripts/migrate.js >/dev/null 2>&1
TABLES_COUNT=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_empty -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
if [ "$TABLES_COUNT" -ne 9 ]; then
  echo "❌ FALHOU: esperava 9 tabelas, encontrou $TABLES_COUNT"
  exit 1
fi
MIGRATION_ENTRY=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_empty -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations;")
if [ "$MIGRATION_ENTRY" -ne 1 ]; then
  echo "❌ FALHOU: registro de migração não encontrado em drizzle.__drizzle_migrations"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 2: Base Legada em Modo Normal (Sem --allow-baseline) -> Deve Abortar
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 2: Base legada em modo normal rejeita e aborta sem gravar histórico .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_legacy_normal
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy_normal < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1

set +e
NORMAL_OUT=$(DATABASE_URL="${BASE_URL}/db_legacy_normal" node scripts/migrate.js 2>&1)
NORMAL_EXIT=$?
set -e

if [ "$NORMAL_EXIT" -eq 0 ]; then
  echo "❌ FALHOU: migrador deveria ter abortado em base legada sem --allow-baseline"
  exit 1
fi

if ! echo "$NORMAL_OUT" | grep -q "BASELINE NÃO AUTORIZADO"; then
  echo "❌ FALHOU: mensagem explicativa de baseline não encontrada na saída"
  exit 1
fi

# Confirmar que nenhuma tabela drizzle foi criada
HAS_DRIZZLE=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy_normal -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='drizzle';")
if [ "$HAS_DRIZZLE" -ne 0 ]; then
  echo "❌ FALHOU: tabela de migrações foi criada indevidamente"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 3A: Base com Constraint Ausente em Modo Explícito -> Deve Abortar
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 3A: Base com constraint ausente aborta em modo explícito .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_divergent_con
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_con < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1
# Remover uma constraint propositalmente mantendo todas as 9 tabelas
docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_con -c "ALTER TABLE download_logs DROP CONSTRAINT download_logs_user_id_users_id_fk;" >/dev/null 2>&1

set +e
CON_OUT=$(DATABASE_URL="${BASE_URL}/db_divergent_con" node scripts/migrate.js --allow-baseline 2>&1)
CON_EXIT=$?
set -e

if [ "$CON_EXIT" -eq 0 ]; then
  echo "❌ FALHOU: deveria ter abortado por divergência de constraint"
  exit 1
fi

if ! echo "$CON_OUT" | grep -q "Constraint obrigatória ausente"; then
  echo "❌ FALHOU: mensagem de constraint ausente não reportada"
  exit 1
fi

HAS_DRIZZLE_CON=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_con -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='drizzle';")
if [ "$HAS_DRIZZLE_CON" -ne 0 ]; then
  echo "❌ FALHOU: gravou histórico em banco divergente de constraints"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 3B: Base com 9 Tabelas mas Definição de Constraint Divergente -> Deve Abortar
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 3B: Base com 9 tabelas e definição de constraint divergente aborta .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_divergent_con_def
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_con_def < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1
# Alterar definição da constraint para ON DELETE RESTRICT (mantendo as 9 tabelas intactas)
docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_con_def -c "
  ALTER TABLE download_logs DROP CONSTRAINT download_logs_user_id_users_id_fk;
  ALTER TABLE download_logs ADD CONSTRAINT download_logs_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE RESTRICT;
" >/dev/null 2>&1

set +e
CON_DEF_OUT=$(DATABASE_URL="${BASE_URL}/db_divergent_con_def" node scripts/migrate.js --allow-baseline 2>&1)
CON_DEF_EXIT=$?
set -e

if [ "$CON_DEF_EXIT" -eq 0 ]; then
  echo "❌ FALHOU: deveria ter abortado por definição divergente de constraint"
  exit 1
fi

if ! echo "$CON_DEF_OUT" | grep -q "Definição divergente na constraint"; then
  echo "❌ FALHOU: mensagem de definição divergente de constraint não encontrada"
  exit 1
fi

HAS_DRIZZLE_CON_DEF=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_con_def -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='drizzle';")
if [ "$HAS_DRIZZLE_CON_DEF" -ne 0 ]; then
  echo "❌ FALHOU: histórico foi gravado em banco com definição de constraint divergente"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 3C: Base com 9 Tabelas mas Divergência na Estrutura de Índices -> Deve Abortar
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 3C: Base com 9 tabelas e divergência de índice aborta .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_divergent_idx_def
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_idx_def < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1
# Criar índice extra não homologado mantendo as 9 tabelas e 24 constraints intactas
docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_idx_def -c "
  CREATE INDEX products_name_idx ON products (name);
" >/dev/null 2>&1

set +e
IDX_DEF_OUT=$(DATABASE_URL="${BASE_URL}/db_divergent_idx_def" node scripts/migrate.js --allow-baseline 2>&1)
IDX_DEF_EXIT=$?
set -e

if [ "$IDX_DEF_EXIT" -eq 0 ]; then
  echo "❌ FALHOU: deveria ter abortado por divergência de índice"
  exit 1
fi

if ! echo "$IDX_DEF_OUT" | grep -q -E "Índices extras inesperados|Definição divergente no índice"; then
  echo "❌ FALHOU: mensagem de divergência de índice não encontrada"
  exit 1
fi

HAS_DRIZZLE_IDX_DEF=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_idx_def -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='drizzle';")
if [ "$HAS_DRIZZLE_IDX_DEF" -ne 0 ]; then
  echo "❌ FALHOU: histórico foi gravado em banco com definição de índice divergente"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 4: Base com Tipo/Nulabilidade Divergente -> Deve Abortar
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 4: Base com tipo/nulabilidade divergente aborta .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_divergent_col
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_col < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1
# Alterar nulabilidade de coluna obrigatória
docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_col -c "ALTER TABLE users ALTER COLUMN email DROP NOT NULL;" >/dev/null 2>&1

set +e
COL_OUT=$(DATABASE_URL="${BASE_URL}/db_divergent_col" node scripts/migrate.js --allow-baseline 2>&1)
COL_EXIT=$?
set -e

if [ "$COL_EXIT" -eq 0 ]; then
  echo "❌ FALHOU: deveria ter abortado por divergência de nulabilidade"
  exit 1
fi

if ! echo "$COL_OUT" | grep -q "Nulabilidade divergente"; then
  echo "❌ FALHOU: mensagem de nulabilidade divergente não reportada"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 5: Base Legada Compatível com --allow-baseline -> Sucesso
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 5: Base legada compatível com --allow-baseline registra baseline .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_legacy_allowed
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy_allowed < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1

# Inserir um registro simulado para provar preservação de dados
docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy_allowed -c "INSERT INTO users (id, email, password_hash) VALUES ('00000000-0000-0000-0000-000000000001', 'admin@teste.com', 'hash_teste');" >/dev/null 2>&1

DATABASE_URL="${BASE_URL}/db_legacy_allowed" node scripts/migrate.js --allow-baseline >/dev/null 2>&1

ALLOWED_ENTRY=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy_allowed -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations;")
if [ "$ALLOWED_ENTRY" -ne 1 ]; then
  echo "❌ FALHOU: histórico de baseline não registrado"
  exit 1
fi

USER_DATA_COUNT=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy_allowed -tAc "SELECT count(*) FROM users WHERE email='admin@teste.com';")
if [ "$USER_DATA_COUNT" -ne 1 ]; then
  echo "❌ FALHOU: dados do usuário foram perdidos no baseline"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 6: Segunda Execução na Base Compatível (Idempotência)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 6: Segunda execução preserva dados e histórico de migrações .. "
DATABASE_URL="${BASE_URL}/db_legacy_allowed" node scripts/migrate.js >/dev/null 2>&1
TOTAL_AFTER_REEXEC=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy_allowed -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations;")
if [ "$TOTAL_AFTER_REEXEC" -ne 1 ]; then
  echo "❌ FALHOU: reexecução duplicou registros na tabela de migrações"
  exit 1
fi

USER_DATA_COUNT2=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy_allowed -tAc "SELECT count(*) FROM users WHERE email='admin@teste.com';")
if [ "$USER_DATA_COUNT2" -ne 1 ]; then
  echo "❌ FALHOU: dados foram alterados na segunda execução"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 7: Imagem sem dependência aborta fail-closed antes de alterar o banco
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 7: Imagem sem módulo exigido aborta antes de tocar no banco .. "
if ! docker image inspect propatch-test-fixed >/dev/null 2>&1; then
  docker build -t propatch-test-fixed . >/dev/null 2>&1
fi
if ! docker image inspect propatch-test-fail >/dev/null 2>&1; then
  printf "FROM propatch-test-fixed\nUSER root\nRUN rm -rf /app/node_modules/postgres\nUSER nextjs\n" | docker build -t propatch-test-fail - >/dev/null 2>&1
fi
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_docker_fail
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_docker_fail < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1

set +e
FAIL_OUT=$(docker run --rm propatch-test-fail node scripts/migrate.js --allow-baseline 2>&1)
FAIL_EXIT=$?
set -e

if [ "$FAIL_EXIT" -eq 0 ]; then
  echo "❌ FALHOU: container sem módulo deveria ter falhado"
  exit 1
fi
if ! echo "$FAIL_OUT" | grep -q "MODULE_NOT_FOUND"; then
  echo "❌ FALHOU: erro MODULE_NOT_FOUND esperado não ocorreu"
  exit 1
fi

HAS_DRIZZLE_DOCKER_FAIL=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_docker_fail -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='drizzle';")
if [ "$HAS_DRIZZLE_DOCKER_FAIL" -ne 0 ]; then
  echo "❌ FALHOU: gravou histórico em falha de módulo"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 8: Imagem final corrigida executa baseline e preserva dados
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 8: Imagem final executa baseline e preserva dados sobre base legada .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_docker_success
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_docker_success < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1

# Inserir registro no banco legado para validação de integridade de dados
docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_docker_success -c "INSERT INTO users (id, email, password_hash) VALUES ('00000000-0000-0000-0000-000000000002', 'producao@propatchbr.com', 'hash_prod');" >/dev/null 2>&1

# No Mac com Docker Desktop, host.docker.internal conecta na porta exposta no host
docker run --rm -e DATABASE_URL="postgresql://propatch_user:test_password@host.docker.internal:${TEST_PORT}/db_docker_success" propatch-test-fixed node scripts/migrate.js --allow-baseline >/dev/null 2>&1

DOCKER_MIG_ENTRY=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_docker_success -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations;")
if [ "$DOCKER_MIG_ENTRY" -ne 1 ]; then
  echo "❌ FALHOU: baseline não registrado pela imagem final (encontrado: $DOCKER_MIG_ENTRY)"
  exit 1
fi

DOCKER_USER_COUNT=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_docker_success -tAc "SELECT count(*) FROM users WHERE email='producao@propatchbr.com';")
if [ "$DOCKER_USER_COUNT" -ne 1 ]; then
  echo "❌ FALHOU: dados do usuário foram perdidos no baseline via Docker"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 9: Subida da aplicação na imagem final responde HTTP 200 conectada ao banco
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 9: Imagem final sobe aplicação e responde HTTP 200 com banco migrado .. "
APP_TEST_CONTAINER="propatch-app-test-${RANDOM}"
APP_TEST_PORT=3098
for p in 3098 3097 3096; do
  if ! lsof -i :$p >/dev/null 2>&1; then
    APP_TEST_PORT=$p
    break
  fi
done

docker run -d --rm --name "$APP_TEST_CONTAINER" \
  -p "127.0.0.1:${APP_TEST_PORT}:3000" \
  -e DATABASE_URL="postgresql://propatch_user:test_password@host.docker.internal:${TEST_PORT}/db_docker_success" \
  -e AUTH_SECRET="propatch_test_secret_key_min_32_characters_long_2026" \
  -e PORT=3000 \
  propatch-test-fixed >/dev/null 2>&1

APP_OK=0
for _ in $(seq 1 30); do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_TEST_PORT}/" 2>/dev/null || true)
  if [ "$CODE" = "200" ]; then
    APP_OK=1
    break
  fi
  sleep 0.5
done

docker stop "$APP_TEST_CONTAINER" >/dev/null 2>&1 || true

if [ "$APP_OK" -ne 1 ]; then
  echo "❌ FALHOU: aplicação na imagem final não respondeu HTTP 200"
  exit 1
fi
echo "✅ PASSOU"

echo "=========================================================="
echo "🎉 Todos os 11 cenários de baseline e migração passaram 100%!"
echo "=========================================================="
exit 0
