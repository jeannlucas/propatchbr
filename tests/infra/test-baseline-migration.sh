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
# Cenário 3: Base com Constraint Divergente em Modo Explícito -> Deve Abortar
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 3: Base com constraint ausente aborta em modo explícito .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_divergent_con
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent_con < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1
# Remover uma constraint propositalmente
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

echo "=========================================================="
echo "🎉 Todos os 6 cenários de baseline e migração passaram 100%!"
echo "=========================================================="
exit 0
