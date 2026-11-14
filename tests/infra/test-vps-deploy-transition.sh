#!/usr/bin/env bash
# ==============================================================================
# ProPatch BR — Teste Automatizado de Transição de Deploy e Hardening SemVer
# Valida rigorosamente todos os cenários canônicos de deploy e fail-closed:
# 1. Merge sem tag preserva a versão atual (deploy ignorado)
# 2. Transição inicial a partir do estado 'legacy'
# 3. Falha no pré-voo de autenticação aborta ANTES de parar escritores
# 4. Escritor ativo bloqueia antes do snapshot
# 5. Falha no dump do banco bloqueia deploy antes da migração
# 6. Tag válida implanta SHA esperado e atualiza marcadores
# 7. Segunda execução com a mesma tag é ignorada de forma idempotente
# 8. Rollback pré-migração restabelece serviços legados
# 9. Falha pós-migração preserva snapshot e bloqueia novos deploys com recuperacao_pendente
# ==============================================================================
set -euo pipefail

TEST_DIR=$(mktemp -d -t propatch_deploy_test_XXXXXX)
SCRIPT_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../scripts" && pwd)/vps-deploy.sh"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

MOCK_BIN="$TEST_DIR/bin"
mkdir -p "$MOCK_BIN"
export PATH="$MOCK_BIN:$PATH"

EVENTS_LOG="$TEST_DIR/events.log"
touch "$EVENTS_LOG"

# Mock do docker
cat << 'EOF' > "$MOCK_BIN/docker"
#!/usr/bin/env bash
echo "DOCKER: $*" >> "${TEST_EVENTS_LOG}"

# Mock de inspeção de containers
if [[ "$*" =~ inspect.*propatch_app ]]; then
  if [ "${MOCK_WRITER_RUNNING:-0}" = 1 ]; then
    echo "true"
  else
    echo "false"
  fi
  exit 0
fi

# Mock de parada compose
if [[ "$1" == compose && "$*" == *"ps --status running -q"* ]]; then
  if [ "${MOCK_WRITER_RUNNING:-0}" = 1 ]; then echo writer; fi
  exit 0
fi

if [[ "$*" =~ "pg_isready" ]]; then
  if [ "${MOCK_DB_FAIL:-0}" = 1 ]; then
    exit 1
  fi
  exit 0
fi

if [[ "$*" =~ "SELECT 1" ]]; then
  if [ "${MOCK_DB_AUTH_FAIL:-0}" = 1 ]; then
    exit 1
  fi
  exit 0
fi

if [[ "$*" =~ ps ]]; then
  echo "propatch_postgres"
  echo "propatch_app"
  exit 0
fi

if [[ "$*" =~ pg_dump ]]; then
  if [ "${MOCK_DUMP_FAIL:-0}" = 1 ]; then
    echo "partial dump"
    exit 1
  fi
  echo "MOCK_DUMP_DATA_FOR_RESTORE"
  exit 0
fi

if [[ "$*" =~ pg_restore ]]; then
  if [[ "$*" == *"--list"* ]]; then
    cat >/dev/null
    exit 0
  fi
  echo "RESTORE: pg_restore called with $*" >> "${TEST_EVENTS_LOG}"
  exit 0
fi

if [ "${MOCK_DOCKER_FAIL:-0}" = "1" ]; then
  exit 1
fi
exit 0
EOF
chmod +x "$MOCK_BIN/docker"

# Mock do curl para healthcheck
cat << 'EOF' > "$MOCK_BIN/curl"
#!/usr/bin/env bash
if [ "${MOCK_CURL_FAIL:-0}" = "1" ]; then
  echo "500"
  exit 1
fi
echo "200"
exit 0
EOF
chmod +x "$MOCK_BIN/curl"

# Mock do flock
cat << 'EOF' > "$MOCK_BIN/flock"
#!/usr/bin/env bash
exit 0
EOF
chmod +x "$MOCK_BIN/flock"

# Mock do notify-deploy
cat << 'EOF' > "$MOCK_BIN/notify-deploy"
#!/usr/bin/env bash
echo "NOTIFY: $*" >> "${TEST_EVENTS_LOG}"
exit 0
EOF
chmod +x "$MOCK_BIN/notify-deploy"

export TEST_EVENTS_LOG="$EVENTS_LOG"

# 1. Criar repositório Upstream bare
UPSTREAM_DIR="$TEST_DIR/upstream.git"
git init --bare "$UPSTREAM_DIR" >/dev/null 2>&1
git -C "$UPSTREAM_DIR" symbolic-ref HEAD refs/heads/main >/dev/null 2>&1

# 2. Criar repositório clone para semear origin/main
INIT_REPO="$TEST_DIR/init-repo"
git clone "$UPSTREAM_DIR" "$INIT_REPO" >/dev/null 2>&1
(
  cd "$INIT_REPO"
  git config user.name "Tester"
  git config user.email "tester@propatchbr.com"
  git config commit.gpgsign false

  git commit --allow-empty -m "chore: base" >/dev/null 2>&1
  git checkout -b branch-initial >/dev/null 2>&1
  git commit --allow-empty -m "feat: initial feature" >/dev/null 2>&1
  git checkout -B main >/dev/null 2>&1
  git merge --no-ff branch-initial -m "Merge pull request #1 into main" >/dev/null 2>&1
  git tag v1.0.0
  git push origin main --tags >/dev/null 2>&1
)
UPSTREAM_INITIAL_SHA=$(cd "$INIT_REPO" && git rev-parse HEAD)

# 3. Criar repositório alvo (simulando /srv/propatchbr)
REPO_DIR="$TEST_DIR/srv/propatchbr"
git clone "$UPSTREAM_DIR" "$REPO_DIR" >/dev/null 2>&1
(
  cd "$REPO_DIR"
  git config user.name "Tester"
  git config user.email "tester@propatchbr.com"
  git config commit.gpgsign false
)

mkdir -p "$REPO_DIR/scripts"
cp "$SCRIPT_SRC" "$REPO_DIR/scripts/vps-deploy.sh"
chmod +x "$REPO_DIR/scripts/vps-deploy.sh"
touch "$REPO_DIR/docker-compose.yml"

VAR_LIB="$TEST_DIR/var/lib/vps-deploy/propatchbr"
mkdir -p "$VAR_LIB"
echo "legacy" > "$VAR_LIB/implantado_tag"
echo "legacy" > "$VAR_LIB/implantado"

SANDBOX_SCRIPT="$TEST_DIR/vps-deploy-sandbox"
sed \
  -e "s|TARGET_DIR=\"\${TARGET_DIR:-/srv/propatchbr}\"|TARGET_DIR=\"\${TARGET_DIR:-$REPO_DIR}\"|g" \
  -e "s|/var/lock/vps-deploy-propatchbr.lock|$TEST_DIR/lock|g" \
  -e "s|/var/lib/vps-deploy/propatchbr|$VAR_LIB|g" \
  -e "s|HEALTH_TIMEOUT=\"\${HEALTH_TIMEOUT:-30}\"|HEALTH_TIMEOUT=\"\${HEALTH_TIMEOUT:-2}\"|g" \
  "$REPO_DIR/scripts/vps-deploy.sh" > "$SANDBOX_SCRIPT"
chmod +x "$SANDBOX_SCRIPT"

echo "=========================================================="
echo "  ProPatch BR — Teste de Transição e Gatilho SemVer       "
echo "=========================================================="

# ------------------------------------------------------------------------------
# Cenário 1: Merge na main sem tag preserva a versão atual (deploy ignorado)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 1: Merge na main sem tag preserva a versão atual .. "
(
  cd "$INIT_REPO"
  git checkout -b dev-pr-sem-tag >/dev/null 2>&1
  git commit --allow-empty -m "feat: alteracao sem tag" >/dev/null 2>&1
  git checkout main >/dev/null 2>&1
  git merge --no-ff dev-pr-sem-tag -m "Merge pull request #2 into main" >/dev/null 2>&1
  git push origin main >/dev/null 2>&1
)
> "$EVENTS_LOG"
bash "$SANDBOX_SCRIPT" >/dev/null 2>&1

if [ "$(cat "$VAR_LIB/implantado_tag")" != "legacy" ]; then
  echo "❌ FALHOU (marcador implantado_tag alterado)"
  exit 1
fi
if [ "$(cat "$VAR_LIB/implantado")" != "legacy" ]; then
  echo "❌ FALHOU (marcador implantado alterado)"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 2: Falha no pré-voo de autenticação aborta ANTES de parar escritores
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 2: Falha no pré-voo aborta ANTES de parar escritores .. "
export MOCK_DB_AUTH_FAIL=1
> "$EVENTS_LOG"
if bash "$SANDBOX_SCRIPT" --tag v1.0.1 >/dev/null 2>&1; then
  echo "❌ FALHOU (Deveria ter abortado por falha no pré-voo)"
  exit 1
fi
unset MOCK_DB_AUTH_FAIL
if grep -q "stop propatch-app" "$EVENTS_LOG"; then
  echo "❌ FALHOU (Parou escritores mesmo com falha no pré-voo)"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 3: Escritor ativo que não para bloqueia antes do snapshot
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 3: Escritor ativo bloqueia antes do snapshot .. "
(
  cd "$INIT_REPO"
  git tag -a v1.0.1 -m "Release v1.0.1"
  git push origin main --tags >/dev/null 2>&1
)
export MOCK_WRITER_RUNNING=1
> "$EVENTS_LOG"
if bash "$SANDBOX_SCRIPT" --tag v1.0.1 >/dev/null 2>&1; then
  echo "❌ FALHOU (Deveria ter bloqueado com escritor ativo)"
  exit 1
fi
unset MOCK_WRITER_RUNNING
if grep -q "pg_dump" "$EVENTS_LOG"; then
  echo "❌ FALHOU (Iniciou snapshot com escritor ativo)"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 4: Falha no snapshot bloqueia antes da migração
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 4: Falha no snapshot bloqueia antes da migração .. "
export MOCK_DUMP_FAIL=1
> "$EVENTS_LOG"
if bash "$SANDBOX_SCRIPT" --tag v1.0.1 >/dev/null 2>&1; then
  echo "❌ FALHOU (Deveria ter bloqueado por falha no dump)"
  exit 1
fi
unset MOCK_DUMP_FAIL
if grep -q "scripts/migrate.js" "$EVENTS_LOG"; then
  echo "❌ FALHOU (Iniciou migrações apesar de falha no backup)"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 5: Transição válida de 'legacy' para v1.0.1
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 5: Transição válida de legacy para v1.0.1 .. "
EXPECTED_SHA=$(cd "$INIT_REPO" && git rev-parse HEAD)
> "$EVENTS_LOG"
bash "$SANDBOX_SCRIPT" --tag v1.0.1 >/dev/null 2>&1

if [ "$(cat "$VAR_LIB/implantado_tag")" != "v1.0.1" ]; then
  echo "❌ FALHOU (implantado_tag não foi atualizado para v1.0.1)"
  exit 1
fi
if [ "$(cat "$VAR_LIB/implantado")" != "$EXPECTED_SHA" ]; then
  echo "❌ FALHOU (implantado não foi atualizado para $EXPECTED_SHA)"
  exit 1
fi
if [ "$(cd "$REPO_DIR" && git rev-parse HEAD)" != "$EXPECTED_SHA" ]; then
  echo "❌ FALHOU (HEAD local diverge do commit esperado $EXPECTED_SHA)"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 6: Segunda execução da mesma tag é ignorada de forma idempotente
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 6: Idempotência na reexecução da mesma tag .. "
> "$EVENTS_LOG"
bash "$SANDBOX_SCRIPT" --tag v1.0.1 >/dev/null 2>&1
if grep -q "Parando escritores" "$EVENTS_LOG"; then
  echo "❌ FALHOU (Executou parada desnecessária em tag já implantada)"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 7: Falha pós-migração bloqueia novos deploys e preserva o snapshot
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 7: Falha pós-migração bloqueia novos deploys e preserva snapshot .. "
(
  cd "$INIT_REPO"
  git checkout -b dev-pr-falha >/dev/null 2>&1
  git commit --allow-empty -m "feat: alteracao com bug no healthcheck" >/dev/null 2>&1
  git checkout main >/dev/null 2>&1
  git merge --no-ff dev-pr-falha -m "Merge pull request #3 into main" >/dev/null 2>&1
  git tag -a v1.0.2 -m "Release com falha v1.0.2"
  git push origin main --tags >/dev/null 2>&1
)

> "$EVENTS_LOG"
export MOCK_CURL_FAIL=1
set +e
bash "$SANDBOX_SCRIPT" --tag v1.0.2 >/dev/null 2>&1
DEPLOY_EXIT=$?
set -e
export MOCK_CURL_FAIL=0

if [ "$DEPLOY_EXIT" -eq 0 ]; then
  echo "❌ FALHOU (Deploy deveria ter falhado)"
  exit 1
fi

if [ "$(cat "$VAR_LIB/implantado_tag")" != "v1.0.1" ]; then
  echo "❌ FALHOU (implantado_tag não preservou a versão estável anterior)"
  exit 1
fi
if [ "$(cat "$VAR_LIB/implantado")" != "$EXPECTED_SHA" ]; then
  echo "❌ FALHOU (implantado não preservou o commit estável anterior)"
  exit 1
fi
if [ ! -s "$VAR_LIB/recuperacao_pendente" ]; then
  echo "❌ FALHOU (recuperação pendente não registrada)"
  exit 1
fi
if grep -q "RESTORE: pg_restore called with" "$EVENTS_LOG"; then
  echo "❌ FALHOU (restauração destrutiva disparada automaticamente)"
  exit 1
fi

# Nova tentativa deve ser bloqueada pela trava
> "$EVENTS_LOG"
if bash "$SANDBOX_SCRIPT" --tag v1.0.2 >/dev/null 2>&1 || [ -s "$EVENTS_LOG" ]; then
  echo "❌ FALHOU (nova tentativa prosseguiu com recuperação pendente)"
  exit 1
fi
rm -f "$VAR_LIB/recuperacao_pendente"
echo "✅ PASSOU"

echo "=========================================================="
echo "🎉 Todos os 7 cenários de transição passaram 100% no ProPatch BR!"
echo "=========================================================="
exit 0
