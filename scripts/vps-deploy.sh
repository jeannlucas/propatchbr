#!/usr/bin/env bash
# ==============================================================================
# ProPatch BR — Script Canônico de Deploy na VPS (/srv/propatchbr)
# Padrão: SemVer tag -> Merge commit na main -> Fail-closed rollback com DB
# ==============================================================================
set -euo pipefail

PROJECT_NAME="propatchbr"
TARGET_DIR="${TARGET_DIR:-/srv/propatchbr}"
COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.yml}"
ENV_FILE="${ENV_FILE:-$TARGET_DIR/.env}"
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
ALLOW_BASELINE="${ALLOW_BASELINE:-0}"

while [ $# -gt 0 ]; do
  case "$1" in
    --tag)
      DEPLOY_TAG="$2"
      shift 2
      ;;
    --allow-baseline)
      ALLOW_BASELINE=1
      shift
      ;;
    --skip-checkout)
      SKIP_GIT_CHECKOUT=1
      shift
      ;;
    --help|-h)
      echo "Uso: $0 [--tag vX.Y.Z] [--allow-baseline] [--skip-checkout]"
      echo "  --tag: Tag SemVer vMAJOR.MINOR.PATCH a implantar"
      echo "  --allow-baseline: Autoriza modo explícito de baseline para bancos legados"
      echo "  --skip-checkout: Executa migração e subida sem checkout git (modo teste/local)"
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
SEMVER_REGEX='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
if ! [[ "$DEPLOY_TAG" =~ $SEMVER_REGEX ]]; then
  echo "❌ ERRO DE GOVERNANÇA: A tag '$DEPLOY_TAG' não segue o padrão SemVer vMAJOR.MINOR.PATCH." >&2
  exit 1
fi

# 4. Obtenção do commit alvo e validação de merge commit
TARGET_SHA="${TARGET_SHA:-}"
if [ -d "$TARGET_DIR/.git" ]; then
  if [ -z "$TARGET_SHA" ]; then
    TARGET_SHA=$(git rev-parse -q --verify "refs/remotes/origin/tags/${DEPLOY_TAG}^{commit}" 2>/dev/null || true)
  fi
  if [ -z "$TARGET_SHA" ]; then
    TARGET_SHA=$(git rev-parse -q --verify "refs/tags/${DEPLOY_TAG}^{commit}" 2>/dev/null || true)
  fi
  if [ -z "$TARGET_SHA" ]; then
    TARGET_SHA=$(git rev-parse -q --verify "${DEPLOY_TAG}^{commit}" 2>/dev/null || true)
  fi

  if [ -z "$TARGET_SHA" ]; then
    echo "❌ ERRO DE GOVERNANÇA: Tag '$DEPLOY_TAG' não encontrada no repositório." >&2
    exit 1
  fi

  MAIN_REF=""
  if git rev-parse --verify refs/remotes/origin/main >/dev/null 2>&1; then
    MAIN_REF="refs/remotes/origin/main"
  elif git rev-parse --verify refs/heads/main >/dev/null 2>&1; then
    MAIN_REF="refs/heads/main"
  elif git rev-parse --verify main >/dev/null 2>&1; then
    MAIN_REF="main"
  fi

  if [ -n "$MAIN_REF" ]; then
    if ! git merge-base --is-ancestor "$TARGET_SHA" "$MAIN_REF"; then
      echo "❌ ERRO DE GOVERNANÇA: O commit $TARGET_SHA apontado pela tag não pertence a $MAIN_REF!" >&2
      exit 1
    fi
  fi

  PARENTS=$(git rev-list --parents -n 1 "$TARGET_SHA" | awk '{print NF-1}')
  if [ "$PARENTS" -lt 2 ]; then
    echo "❌ ERRO DE GOVERNANÇA: Tag $DEPLOY_TAG aponta para commit direto na main ($PARENTS pais). Deploy rejeitado." >&2
    exit 1
  fi
else
  if [ "$SKIP_GIT_CHECKOUT" -eq 0 ]; then
    echo "Checkout Git de produção indisponível em $TARGET_DIR." >&2
    exit 1
  fi
  TARGET_SHA="test-target-sha"
fi

# 5. Verificação de Marcadores e Bloqueios Prévios
MARCADOR_TAG="$VAR_LIB_DIR/implantado_tag"
MARCADOR_COMMIT="$VAR_LIB_DIR/implantado"
mkdir -p "$VAR_LIB_DIR"
RECOVERY_PENDING="$VAR_LIB_DIR/recuperacao_pendente"
if [ -e "$RECOVERY_PENDING" ]; then
  echo "Recuperação pendente em $RECOVERY_PENDING. Deploy bloqueado." >&2
  exit 1
fi

IMPLANTADA_TAG=$(cat "$MARCADOR_TAG" 2>/dev/null || true)
IMPLANTADO_COMMIT=$(cat "$MARCADOR_COMMIT" 2>/dev/null || true)

if [ "$IMPLANTADA_TAG" = "$DEPLOY_TAG" ] && [ -n "$DEPLOY_TAG" ]; then
  echo "ℹ️ [vps-deploy] Tag $DEPLOY_TAG já está implantada (marcador sincronizado). Deploy ignorado."
  exit 0
fi

if [ -n "$IMPLANTADO_COMMIT" ] && [ "$IMPLANTADO_COMMIT" = "$TARGET_SHA" ] && [ "$TARGET_SHA" != "static-version" ] && [ "$TARGET_SHA" != "legacy" ]; then
  echo "ℹ️ [vps-deploy] Commit $TARGET_SHA da tag $DEPLOY_TAG já está em execução. Sincronizando marcador de tag."
  printf '%s\n' "$DEPLOY_TAG" > "$MARCADOR_TAG"
  exit 0
fi

PREVIOUS_COMMIT="$IMPLANTADO_COMMIT"
if [ -z "$PREVIOUS_COMMIT" ]; then
  PREVIOUS_COMMIT="legacy"
fi

# Autorização explícita de baseline estritamente limitada à primeira transição legada aprovada
if [ "$PREVIOUS_COMMIT" = "legacy" ] || [ -f "$VAR_LIB_DIR/allow_legacy_baseline" ]; then
  ALLOW_BASELINE=1
  echo "🔒 Transição a partir da instalação legada confirmada ($PREVIOUS_COMMIT). Autorização explícita de baseline habilitada para esta release inicial."
fi

# Validação do commit anterior (aceita 'legacy' para a primeira transição)
if [ "$PREVIOUS_COMMIT" != "legacy" ] && [ -d "$TARGET_DIR/.git" ]; then
  if ! git cat-file -e "${PREVIOUS_COMMIT}^{commit}" 2>/dev/null; then
    echo "Não foi possível comprovar o commit implantado ($PREVIOUS_COMMIT). Deploy bloqueado." >&2
    exit 1
  fi
fi

if [ ! -f "$COMPOSE_FILE" ] || ! command -v docker >/dev/null 2>&1; then
  echo "Docker ou manifesto Compose de produção indisponível em $TARGET_DIR." >&2
  exit 1
fi

# Opções do Compose com arquivo de ambiente se existir
COMPOSE_ARGS=("-f" "$COMPOSE_FILE")
if [ -f "$ENV_FILE" ]; then
  COMPOSE_ARGS=("--env-file" "$ENV_FILE" "-f" "$COMPOSE_FILE")
fi

# 6. Pré-Voo de Configuração e Conectividade no PostgreSQL ANTES de Parar Aplicação
echo "🔍 Executando pré-voo de autenticação no PostgreSQL..."
if ! docker exec -i "$CONTAINER_PG" pg_isready -U "$DB_USER" -d "$DB_NAME" >/dev/null 2>&1; then
  echo "❌ ERRO DE PRÉ-VOO: PostgreSQL ($CONTAINER_PG) não está aceitando conexões para $DB_USER@$DB_NAME!" >&2
  echo "   Nenhum serviço foi interrompido. Deploy abortado fail-closed." >&2
  exit 1
fi

if ! docker exec -i "$CONTAINER_PG" psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT 1" >/dev/null 2>&1; then
  echo "❌ ERRO DE PRÉ-VOO: Falha ao autenticar no banco $DB_NAME com o usuário $DB_USER!" >&2
  echo "   Nenhum serviço foi interrompido. Deploy abortado fail-closed." >&2
  exit 1
fi
echo "✅ Pré-voo do banco aprovado com 100% de sucesso."

# 7. Identificação de Escritores e Preservação de Imagem Legada
LEGACY_APP_IMAGE_ID=$(docker inspect "$CONTAINER_APP" --format '{{.Image}}' 2>/dev/null || true)
if [ -n "$LEGACY_APP_IMAGE_ID" ]; then
  docker tag "$LEGACY_APP_IMAGE_ID" "propatchbr-propatch-app:legacy-backup" 2>/dev/null || true
  echo "✅ Imagem legada preservada para rollback imediato ($LEGACY_APP_IMAGE_ID)."
fi

umask 077
mkdir -p "$BACKUP_DIR"
BACKUP_FILE=$(mktemp "$BACKUP_DIR/pre_deploy_XXXXXXXX")
SHA_FILE="${BACKUP_FILE}.sha256"
MIGRATIONS_RAN=0
WRITERS_STOPPED=0

perform_rollback() {
  local exit_code=$?
  if [ "$exit_code" -eq 0 ]; then
    return
  fi

  echo "⚠️ Detectada falha no processo de deploy (código $exit_code). Iniciando protocolo de rollback..." >&2

  # Se a migração começou, o banco pode ter sido modificado. NUNCA restaura banco automaticamente.
  if [ "$MIGRATIONS_RAN" -eq 1 ]; then
    echo "🛑 Parando aplicação para proteger o estado do banco..." >&2
    docker compose "${COMPOSE_ARGS[@]}" stop propatch-app 2>/dev/null || true
    echo "❌ O banco de dados pode ter sido alterado. Snapshot pré-deploy preservado em $BACKUP_FILE." >&2
    echo "   Trava de segurança registrada em $RECOVERY_PENDING." >&2
    echo "   Novos deploys permanecem bloqueados. Intervenção humana necessária para autorizar restauração." >&2
    return
  fi

  # Se apenas os escritores foram parados e a migração NÃO foi iniciada: restabelece legado
  if [ "$WRITERS_STOPPED" -eq 1 ]; then
    echo "🔄 Restabelecendo serviços legados sem alteração de banco..." >&2
    if [ "$PREVIOUS_COMMIT" != "legacy" ] && [ -d "$TARGET_DIR/.git" ]; then
      git reset --hard "$PREVIOUS_COMMIT" -q 2>/dev/null || true
    fi
    docker compose "${COMPOSE_ARGS[@]}" up -d propatch-app 2>/dev/null || true
    
    # Valida se a aplicação voltou
    local rec_ok=0
    for _ in $(seq 1 "$HEALTH_TIMEOUT"); do
      if [ "$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:${APP_PORT}/" 2>/dev/null || true)" = "200" ]; then
        rec_ok=1
        break
      fi
      sleep 1
    done

    if [ "$rec_ok" -eq 1 ]; then
      echo "✅ Serviços legados restabelecidos com sucesso. Endpoints respondendo 200." >&2
      rm -f "$RECOVERY_PENDING" "$BACKUP_FILE" "$SHA_FILE" 2>/dev/null || true
    else
      echo "❌ Falha ao restabelecer a saúde dos serviços legados. Intervenção necessária." >&2
    fi
  fi
}
trap perform_rollback EXIT

# 8. Parar Escritores e Confirmar Isolamento do Banco
echo "🛑 Parando escritores da aplicação ($CONTAINER_APP)..."
WRITERS_STOPPED=1
docker compose "${COMPOSE_ARGS[@]}" stop propatch-app
if running_writers=$(docker compose "${COMPOSE_ARGS[@]}" ps --status running -q propatch-app) && [ -n "$running_writers" ]; then
  echo "❌ Não foi possível confirmar a parada dos escritores. Deploy bloqueado." >&2
  exit 1
fi
echo "✅ Escritores parados com sucesso. PostgreSQL ativo para snapshot."

# 9. Geração e Verificação de Integridade do Snapshot Físico
echo "📦 Criando snapshot do banco de dados em $BACKUP_FILE..."
if ! docker exec -i "$CONTAINER_PG" pg_dump -U "$DB_USER" -d "$DB_NAME" -Fc --no-owner --no-acl > "$BACKUP_FILE" || [ ! -s "$BACKUP_FILE" ]; then
  echo "❌ Backup pré-deploy falhou ou está vazio. Deploy bloqueado." >&2
  exit 1
fi

if ! docker exec -i "$CONTAINER_PG" pg_restore --list < "$BACKUP_FILE" >/dev/null 2>&1; then
  echo "❌ Falha na verificação de integridade do snapshot (pg_restore --list). Abortando." >&2
  exit 1
fi

if command -v sha256sum >/dev/null 2>&1; then
  sha256sum "$BACKUP_FILE" > "$SHA_FILE"
else
  shasum -a 256 "$BACKUP_FILE" > "$SHA_FILE"
fi

# Persistir estado de recuperação antes de qualquer migração
printf 'SHA=%s\nTAG=%s\nBACKUP=%s\nCHECKSUM=%s\n' "$PREVIOUS_COMMIT" "$DEPLOY_TAG" "$BACKUP_FILE" "$SHA_FILE" > "$RECOVERY_PENDING"
echo "✅ Snapshot verificado e checksum registrado com sucesso."

# 10. Atualização do Código para a Versão Alvo
if [ -d "$TARGET_DIR/.git" ] && [ "$SKIP_GIT_CHECKOUT" -eq 0 ]; then
  echo "🔄 Atualizando repositório para o commit $TARGET_SHA..."
  git reset --hard "$TARGET_SHA" -q
fi

# 11. Compilação e Migração de Banco com Baseline Drizzle
if [ ! -f "$COMPOSE_FILE" ]; then
  echo "❌ Manifesto de produção ($COMPOSE_FILE) ausente no commit de destino." >&2
  exit 1
fi

echo "📦 Construindo imagem atualizada..."
docker compose "${COMPOSE_ARGS[@]}" build propatch-app

MIGRATIONS_RAN=1
echo "📦 Executando migrações seguras com baseline Drizzle..."
if [ "$ALLOW_BASELINE" -eq 1 ] || [ "${ALLOW_BASELINE:-0}" = "true" ]; then
  docker compose "${COMPOSE_ARGS[@]}" run --rm -T --no-deps propatch-app node scripts/migrate.js --allow-baseline
else
  docker compose "${COMPOSE_ARGS[@]}" run --rm -T --no-deps propatch-app node scripts/migrate.js
fi

echo "🚀 Subindo serviços atualizados..."
docker compose "${COMPOSE_ARGS[@]}" up -d propatch-app

# 12. Validação de Saúde (Healthcheck)
echo "🩺 Executando healthcheck pós-deploy..."
HEALTH_OK=0
for i in $(seq 1 "$HEALTH_TIMEOUT"); do
  STATUS_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:${APP_PORT}/" 2>/dev/null || true)
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

# 13. Atualização dos Marcadores de Sucesso
printf '%s\n' "$DEPLOY_TAG" > "$MARCADOR_TAG"
printf '%s\n' "$TARGET_SHA" > "$MARCADOR_COMMIT"
rm -f "$RECOVERY_PENDING" "$VAR_LIB_DIR/allow_legacy_baseline"

if command -v notify-deploy >/dev/null 2>&1; then
  notify-deploy success --project "$PROJECT_NAME" --msg "Produção promovida com sucesso para $DEPLOY_TAG ($TARGET_SHA)" || true
fi

echo "=========================================================="
echo "✅ Deploy de $PROJECT_NAME concluído com 100% de sucesso!"
echo "   Tag: $DEPLOY_TAG | Commit: $TARGET_SHA"
echo "=========================================================="
exit 0
