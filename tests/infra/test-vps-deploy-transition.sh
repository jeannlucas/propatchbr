#!/usr/bin/env bash
# ==============================================================================
# ProPatch BR — Teste Automatizado de Transição de Deploy e Hardening SemVer
# Valida os 3 cenários obrigatórios:
# 1. Merge sem tag preserva a versão atual (deploy ignorado)
# 2. Tag válida implanta o SHA esperado e atualiza marcadores
# 3. Falha no deploy recupera a versão anterior e restaura o banco de dados
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
if [[ "$*" =~ ps ]]; then
  echo "propatch_postgres"
  echo "propatch_app"
  exit 0
fi
if [[ "$*" =~ pg_dump ]]; then
  echo "MOCK_DUMP_DATA_FOR_RESTORE"
  exit 0
fi
if [[ "$*" =~ pg_restore ]]; then
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
echo "v1.0.0" > "$VAR_LIB/implantado_tag"
echo "$UPSTREAM_INITIAL_SHA" > "$VAR_LIB/implantado"

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

if [ "$(cat "$VAR_LIB/implantado_tag")" != "v1.0.0" ]; then
  echo "❌ FALHOU (marcador implantado_tag alterado)"
  exit 1
fi
if [ "$(cat "$VAR_LIB/implantado")" != "$UPSTREAM_INITIAL_SHA" ]; then
  echo "❌ FALHOU (marcador implantado alterado)"
  exit 1
fi
if [ "$(cd "$REPO_DIR" && git rev-parse HEAD)" != "$UPSTREAM_INITIAL_SHA" ]; then
  echo "❌ FALHOU (HEAD local alterado)"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 2: Tag SemVer válida implanta o SHA esperado e atualiza marcadores
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 2: Tag válida implanta SHA esperado e atualiza marcadores .. "
(
  cd "$INIT_REPO"
  git tag -a v1.0.1 -m "Release formal v1.0.1"
  git push origin main --tags >/dev/null 2>&1
)
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
if ! grep -q "DOCKER: compose -f docker-compose.yml up -d --build" "$EVENTS_LOG"; then
  echo "❌ FALHOU (Comando docker compose up não foi emitido)"
  exit 1
fi
echo "✅ PASSOU"

# ------------------------------------------------------------------------------
# Cenário 3: Falha no deploy recupera versão anterior e restaura banco
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 3: Falha no deploy recupera versão anterior e restaura banco .. "
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
  echo "❌ FALHOU (implantado_tag não preservou a versão anterior)"
  exit 1
fi
if [ "$(cat "$VAR_LIB/implantado")" != "$EXPECTED_SHA" ]; then
  echo "❌ FALHOU (implantado não preservou o commit estável anterior)"
  exit 1
fi
if [ "$(cd "$REPO_DIR" && git rev-parse HEAD)" != "$EXPECTED_SHA" ]; then
  echo "❌ FALHOU (HEAD local não retornou ao commit anterior $EXPECTED_SHA)"
  exit 1
fi
if ! grep -q "RESTORE: pg_restore called with" "$EVENTS_LOG"; then
  echo "❌ FALHOU (Restauração do banco via pg_restore não foi executada no rollback)"
  exit 1
fi
echo "✅ PASSOU"

echo "=========================================================="
echo "🎉 Todos os 3 cenários de transição passaram 100% no ProPatch BR!"
echo "=========================================================="
exit 0
