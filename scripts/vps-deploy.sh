#!/usr/bin/env bash
# ==============================================================================
# ProPatch BR — Script Canônico de Deploy na VPS (/srv/propatchbr)
# Padrão: SemVer tag -> Merge commit na main -> Fail-closed rollback com DB
# ==============================================================================
set -euo pipefail

PROJECT_NAME="propatchbr"
TARGET_DIR="${TARGET_DIR:-/srv/propatchbr}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
BACKUP_DIR="${BACKUP_DIR:-$TARGET_DIR/backups/db}"
LOCK_FILE="${LOCK_FILE:-/var/lock/vps-deploy-propatchbr.lock}"
VAR_LIB_DIR="${VAR_LIB_DIR:-/var/lib/vps-deploy/propatchbr}"
APP_PORT="${APP_PORT:-3002}"
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-30}"
CONTAINER_PG="${CONTAINER_PG:-propatch_postgres}"
CONTAINER_APP="${CONTAINER_APP:-propatch_app}"
DB_USER="${DB_USER:-propatch_user}"
DB_NAME="${DB_NAME:-propatch_db}"
DEPLOY_TAG="${DEPLOY_TAG:-}"
SKIP_GIT_CHECKOUT="${SKIP_GIT_CHECKOUT:-0}"

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)
      DEPLOY_TAG="$2"
      shift 2
      ;;
    --skip-checkout)
      SKIP_GIT_CHECKOUT=1
      shift
      ;;
    --help|-h)
      echo "Uso: $0 [--tag vX.Y.Z] [--skip-checkout]"
      exit 0
      ;;
    *)
      if [ -z "$DEPLOY_TAG" ] && [[ "$1" =~ ^v ]]; then
        DEPLOY_TAG="$1"
        shift
      else
        echo "Argumento desconhecido: $1" >&2
        exit 1
      fi
      ;;
  esac
done

# Trava contra execuções concorrentes (flock)
mkdir -p "$(dirname "$LOCK_FILE")"
exec 9> "$LOCK_FILE"
if command -v flock >/dev/null 2>&1; then
  flock -n 9 || {
    echo "⚠️ [vps-deploy] Outro deploy já está em andamento para $PROJECT_NAME. Encerrando."
    exit 0
  }
fi

cd "$TARGET_DIR" || exit 1

# 1. Consulta / Fetch de tags SemVer isoladas se for repositório Git
if [ -d "$TARGET_DIR/.git" ] && [ "$SKIP_GIT_CHECKOUT" -eq 0 ]; then
  if ! git fetch -q --no-tags --prune origin "+refs/heads/main:refs/remotes/origin/main" "+refs/tags/v*:refs/remotes/origin/tags/v*"; then
    echo "❌ Falha ao consultar o remoto origin (rede ou autenticação). Abortando." >&2
    exit 1
  fi
fi

# 2. Resolução da Tag Alvo
if [ -z "$DEPLOY_TAG" ]; then
  if [ -d "$TARGET_DIR/.git" ]; then
    DEPLOY_TAG=$(git for-each-ref --points-at refs/remotes/origin/main --format='%(refname:strip=4)' refs/remotes/origin/tags/ 2>/dev/null | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' | sort -V | tail -n 1 || true)
  fi
fi

if [ -z "$DEPLOY_TAG" ]; then
  echo "ℹ️ [vps-deploy] Nenhuma tag SemVer (vMAJOR.MINOR.PATCH) apontando para origin/main. Deploy ignorado."
  exit 0
fi

# 3. Validação Regex SemVer estrita
SEMVER_REGEX='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)(-[0-9A-Za-z.-]+)?(\+[0-9A-Za-z.-]+)?$'
if ! [[ "$DEPLOY_TAG" =~ $SEMVER_REGEX ]]; then
  echo "❌ ERRO DE GOVERNANÇA: A tag '$DEPLOY_TAG' não segue o padrão SemVer vMAJOR.MINOR.PATCH." >&2
  exit 1
fi

# 4. Obtenção do commit alvo e validação de merge commit
if [ -d "$TARGET_DIR/.git" ]; then
  TARGET_SHA=$(git rev-parse -q --verify "refs/remotes/origin/tags/${DEPLOY_TAG}^{commit}" 2>/dev/null || git rev-parse -q --verify "${DEPLOY_TAG}^{commit}" 2>/dev/null || true)
  if [ -z "$TARGET_SHA" ]; then
    echo "❌ ERRO DE GOVERNANÇA: Tag '$DEPLOY_TAG' não encontrada no repositório." >&2
    exit 1
  fi

  if git rev-parse --verify refs/remotes/origin/main >/dev/null 2>&1; then
    if ! git merge-base --is-ancestor "$TARGET_SHA" refs/remotes/origin/main; then
      echo "❌ ERRO DE GOVERNANÇA: O commit $TARGET_SHA apontado pela tag não pertence a origin/main!" >&2
      exit 1
    fi
  fi

  PARENTS=$(git rev-list --parents -n 1 "$TARGET_SHA" | awk '{print NF-1}')
  if [ "$PARENTS" -lt 2 ]; then
    echo "❌ ERRO DE GOVERNANÇA: Tag $DEPLOY_TAG aponta para commit direto na main ($PARENTS pais). Deploy rejeitado." >&2
    exit 1
  fi
else
  TARGET_SHA="static-version"
fi

# 5. Verificação de Marcadores
MARCADOR_TAG="$VAR_LIB_DIR/implantado_tag"
MARCADOR_COMMIT="$VAR_LIB_DIR/implantado"
mkdir -p "$VAR_LIB_DIR"

IMPLANTADA_TAG=$(cat "$MARCADOR_TAG" 2>/dev/null || true)
IMPLANTADO_COMMIT=$(cat "$MARCADOR_COMMIT" 2>/dev/null || true)

if [ "$IMPLANTADA_TAG" = "$DEPLOY_TAG" ] && [ -n "$DEPLOY_TAG" ]; then
  echo "ℹ️ [vps-deploy] Tag $DEPLOY_TAG já está implantada (marcador sincronizado). Deploy ignorado."
  exit 0
fi

if [ -n "$IMPLANTADO_COMMIT" ] && [ "$IMPLANTADO_COMMIT" = "$TARGET_SHA" ] && [ "$TARGET_SHA" != "static-version" ]; then
  echo "ℹ️ [vps-deploy] Commit $TARGET_SHA da tag $DEPLOY_TAG já está em execução. Sincronizando marcador de tag."
  printf '%s\n' "$DEPLOY_TAG" > "$MARCADOR_TAG"
  exit 0
fi

PREVIOUS_COMMIT=""
if [ -d "$TARGET_DIR/.git" ]; then
  PREVIOUS_COMMIT=$(git rev-parse HEAD 2>/dev/null || true)
fi

echo "=========================================================="
echo "  Iniciando Deploy Canônico: $PROJECT_NAME ($DEPLOY_TAG)"
echo "  Commit Alvo: $TARGET_SHA (Anterior: ${PREVIOUS_COMMIT:-nenhum})"
echo "=========================================================="

# 6. Snapshot Preventivo do Banco de Dados
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
mkdir -p "$BACKUP_DIR"
BACKUP_FILE="$BACKUP_DIR/pre_deploy_${TIMESTAMP}.dump"
SHA_FILE="${BACKUP_FILE}.sha256"

if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_PG}$"; then
  echo "📦 Gerando dump pré-deploy do PostgreSQL ($DB_NAME)..."
  docker exec -i "$CONTAINER_PG" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --no-acl > "$BACKUP_FILE" 2>/dev/null || true
  if [ -s "$BACKUP_FILE" ]; then
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum "$BACKUP_FILE" | awk '{print $1}' > "$SHA_FILE"
    elif command -v shasum >/dev/null 2>&1; then
      shasum -a 256 "$BACKUP_FILE" | awk '{print $1}' > "$SHA_FILE"
    fi
    echo "✅ Backup pré-deploy concluído: $BACKUP_FILE"
  fi
fi

ROLLBACK_EXECUTED=0
MIGRATIONS_RAN=0

perform_rollback() {
  local exit_code=$?
  if [ $exit_code -ne 0 ] && [ "$ROLLBACK_EXECUTED" -eq 0 ]; then
    ROLLBACK_EXECUTED=1
    echo "" >&2
    echo "🚨 ALERTA CRÍTICO: Falha no deploy de $PROJECT_NAME (código $exit_code)!" >&2
    echo "↩️  Iniciando protocolo FAIL-CLOSED de Rollback..." >&2

    # Restaura banco de dados se migrações foram executadas
    if [ "$MIGRATIONS_RAN" -eq 1 ] && [ -f "$BACKUP_FILE" ] && [ -s "$BACKUP_FILE" ]; then
      echo "   Restaurando banco de dados a partir do dump pré-deploy..." >&2
      if command -v docker >/dev/null 2>&1 && docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_PG}$"; then
        docker exec -i "$CONTAINER_PG" psql -U "$DB_USER" -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DB_NAME' AND pid <> pg_backend_pid();" >/dev/null 2>&1 || true
        cat "$BACKUP_FILE" | docker exec -i "$CONTAINER_PG" pg_restore -U "$DB_USER" -d "$DB_NAME" --clean --if-exists --no-owner --no-acl >/dev/null 2>&1 || true
        echo "   ✅ Banco de dados restaurado com sucesso." >&2
      fi
    fi

    # Reverte código Git para commit anterior
    if [ -n "$PREVIOUS_COMMIT" ] && [ -d "$TARGET_DIR/.git" ] && [ "$SKIP_GIT_CHECKOUT" -eq 0 ]; then
      echo "   Revertendo repositório para commit anterior $PREVIOUS_COMMIT..." >&2
      git reset --hard "$PREVIOUS_COMMIT" -q >/dev/null 2>&1 || true
      if command -v docker >/dev/null 2>&1 && [ -f "$COMPOSE_FILE" ]; then
        docker compose -f "$COMPOSE_FILE" up -d >/dev/null 2>&1 || true
      fi
    fi

    if command -v notify-deploy >/dev/null 2>&1; then
      notify-deploy error --project "$PROJECT_NAME" --msg "Deploy da tag $DEPLOY_TAG falhou. Rollback executado." || true
    fi
    exit 1
  fi
}
trap perform_rollback EXIT

# 7. Atualização do Código para a Versão Alvo
if [ -d "$TARGET_DIR/.git" ] && [ "$SKIP_GIT_CHECKOUT" -eq 0 ]; then
  echo "🔄 Atualizando repositório para o commit $TARGET_SHA..."
  git reset --hard "$TARGET_SHA" -q
fi

# 8. Recompilação e Inicialização dos Containers
if command -v docker >/dev/null 2>&1 && [ -f "$COMPOSE_FILE" ]; then
  echo "🚀 Recompilando containers da aplicação..."
  docker compose -f "$COMPOSE_FILE" up -d --build

  # 9. Execução de Migrações (Drizzle)
  if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_APP}$"; then
    echo "⚙️ Executando migrações do Drizzle..."
    MIGRATIONS_RAN=1
    docker exec -i "$CONTAINER_APP" npm run db:migrate || true
  fi

  # 10. Validação de Saúde (Healthcheck)
  echo "🩺 Executando healthcheck pós-deploy..."
  HEALTH_OK=0
  for i in $(seq 1 "$HEALTH_TIMEOUT"); do
    STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/" || true)
    if [ "$STATUS_CODE" = "200" ]; then
      HEALTH_OK=1
      break
    fi
    sleep 1
  done

  if [ "$HEALTH_OK" -ne 1 ]; then
    echo "❌ Healthcheck falhou: app não respondeu 200 em ${HEALTH_TIMEOUT}s." >&2
    exit 1
  fi
fi

# 11. Atualização dos Marcadores de Sucesso
printf '%s\n' "$DEPLOY_TAG" > "$MARCADOR_TAG"
printf '%s\n' "$TARGET_SHA" > "$MARCADOR_COMMIT"

if command -v notify-deploy >/dev/null 2>&1; then
  notify-deploy success --project "$PROJECT_NAME" --msg "Produção promovida com sucesso para $DEPLOY_TAG ($TARGET_SHA)" || true
fi

echo "=========================================================="
echo "✅ Deploy de $PROJECT_NAME concluído com 100% de sucesso!"
echo "   Tag: $DEPLOY_TAG | Commit: $TARGET_SHA"
echo "=========================================================="
exit 0
