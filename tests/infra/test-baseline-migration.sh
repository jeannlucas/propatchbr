#!/usr/bin/env bash
# ==============================================================================
# ProPatch BR — Teste Automatizado de Baseline e Migração Drizzle
# Valida os cenários obrigatórios em PostgreSQL real descartável:
# 1. Banco vazio -> Aplica migração 0000_lame_onslaught com sucesso
# 2. Banco legado compatível -> Registra baseline sem erro de duplicação
# 3. Segunda execução -> Idempotência comprovada (nada reaplicado)
# 4. Banco divergente -> Aborta fail-closed antes de gravar baseline
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
for p in 5495 5496 5497 5498; do
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
# Cenário 1: Banco Vazio
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 1: Banco vazio aplica migração 0000 com sucesso .. "
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
# Cenário 2: Banco Legado Compatível (Sem tabela drizzle)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 2: Banco legado compatível registra baseline sem duplicar .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_legacy
# Criar tabelas legadas sem a tabela drizzle (simulando estado real da VPS)
docker exec -i "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy < drizzle/0000_lame_onslaught.sql >/dev/null 2>&1

# Executar migrador com baseline automático
DATABASE_URL="${BASE_URL}/db_legacy" node scripts/migrate.js >/dev/null 2>&1
LEGACY_MIGRATION_ENTRY=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations;")
if [ "$LEGACY_MIGRATION_ENTRY" -ne 1 ]; then
  echo "❌ FALHOU: baseline não foi registrado em drizzle.__drizzle_migrations"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 3: Segunda Execução (Idempotência)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 3: Segunda execução preserva estado de forma idempotente .. "
DATABASE_URL="${BASE_URL}/db_legacy" node scripts/migrate.js >/dev/null 2>&1
TOTAL_AFTER_REEXEC=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_legacy -tAc "SELECT count(*) FROM drizzle.__drizzle_migrations;")
if [ "$TOTAL_AFTER_REEXEC" -ne 1 ]; then
  echo "❌ FALHOU: reexecução duplicou registros na tabela de migrações"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 4: Banco Divergente (Abort Fail-Closed)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 4: Banco com schema divergente aborta fail-closed .. "
docker exec "$CONTAINER_NAME" createdb -h 127.0.0.1 -U propatch_user db_divergent
docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent -c "CREATE TABLE tabela_desconhecida (id int);" >/dev/null 2>&1

set +e
DATABASE_URL="${BASE_URL}/db_divergent" node scripts/migrate.js >/dev/null 2>&1
DIV_EXIT=$?
set -e

if [ "$DIV_EXIT" -eq 0 ]; then
  echo "❌ FALHOU: migrador deveria ter abortado em banco divergente"
  exit 1
fi
# Confirma que não criou tabela de migrações no banco divergente
HAS_DRIZZLE=$(docker exec "$CONTAINER_NAME" psql -h 127.0.0.1 -U propatch_user -d db_divergent -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='drizzle';")
if [ "$HAS_DRIZZLE" -ne 0 ]; then
  echo "❌ FALHOU: gravou baseline indevidamente em banco divergente"
  exit 1
fi
echo "✅ PASSOU"

echo "=========================================================="
echo "🎉 Todos os 4 cenários de migração/baseline passaram 100%!"
echo "=========================================================="
exit 0
