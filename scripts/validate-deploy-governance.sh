#!/usr/bin/env bash
# ==============================================================================
# ProPatch BR — Validador de Governança de Deploy SemVer
# Padrão: Tag SemVer -> Merge commit na main -> PR de dev para main aprovado
# ==============================================================================
set -euo pipefail

TAG_NAME="${GITHUB_REF_NAME:-${1:-}}"
GITHUB_REPOSITORY="${GITHUB_REPOSITORY:-jeannlucas/propatchbr}"
GITHUB_STEP_SUMMARY="${GITHUB_STEP_SUMMARY:-/dev/null}"

if [ -z "$TAG_NAME" ]; then
  echo "❌ ERRO: Nenhuma tag informada. Uso: $0 <tag-semver>" >&2
  exit 1
fi

echo "=========================================================="
echo "Validando tag de release para deploy em produção: $TAG_NAME"
echo "=========================================================="

# 1. Validação regex SemVer estrita (vMAJOR.MINOR.PATCH)
SEMVER_REGEX='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'
if ! [[ "$TAG_NAME" =~ $SEMVER_REGEX ]]; then
  echo "❌ ERRO DE GOVERNANÇA: A tag '$TAG_NAME' não segue o padrão SemVer vMAJOR.MINOR.PATCH." >&2
  exit 1
fi
echo "✅ Formato SemVer válido: $TAG_NAME"

# 2. Obter commit exato apontado pela tag
TARGET_SHA="${TARGET_SHA:-}"
if [ -z "$TARGET_SHA" ]; then
  TARGET_SHA=$(git rev-parse -q --verify "refs/tags/${TAG_NAME}^{commit}" 2>/dev/null || true)
fi
if [ -z "$TARGET_SHA" ]; then
  TARGET_SHA=$(git rev-parse -q --verify "${TAG_NAME}^{commit}" 2>/dev/null || true)
fi
if [ -z "$TARGET_SHA" ]; then
  echo "❌ ERRO DE GOVERNANÇA: Tag '$TAG_NAME' não encontrada no repositório." >&2
  exit 1
fi
echo "SHA alvo da tag: $TARGET_SHA"

# 3. Validar se o commit pertence à branch main
if git rev-parse --verify origin/main >/dev/null 2>&1; then
  MAIN_REF="origin/main"
elif git rev-parse --verify main >/dev/null 2>&1; then
  MAIN_REF="main"
else
  MAIN_REF=""
fi

if [ -n "$MAIN_REF" ]; then
  if ! git merge-base --is-ancestor "$TARGET_SHA" "$MAIN_REF"; then
    echo "❌ ERRO DE GOVERNANÇA: O commit $TARGET_SHA apontado pela tag não pertence à branch $MAIN_REF!" >&2
    exit 1
  fi
  echo "✅ Commit pertence à branch $MAIN_REF."
fi

# 4. Validar se o commit é um merge commit (2 ou mais pais)
PARENT_COUNT=$(git rev-list --parents -n 1 "$TARGET_SHA" | awk '{print NF-1}')
if [ "$PARENT_COUNT" -lt 2 ]; then
  echo "❌ ERRO DE GOVERNANÇA: O commit $TARGET_SHA apontado pela tag possui apenas $PARENT_COUNT pai e NÃO é um merge commit!" >&2
  echo "   De acordo com a Seção 1 do AGENTS.md, todo deploy em produção deve ser precedido de PR de dev para main aprovado com 'Create a merge commit'." >&2
  exit 1
fi
echo "✅ Proveniência confirmada: merge commit com $PARENT_COUNT pais."

# 5. Validar aprovação formal do Pull Request correspondente na main
echo "Verificando se o commit foi gerado por um Pull Request aprovado e mergeado na branch main..."

COMMITS_PULLS_ENDPOINT="repos/${GITHUB_REPOSITORY}/commits/${TARGET_SHA}/pulls"
COMMITS_PULLS_OUTPUT=""
COMMITS_PULLS_STATUS=0
COMMITS_PULLS_OUTPUT=$(gh api "$COMMITS_PULLS_ENDPOINT" 2>&1) || COMMITS_PULLS_STATUS=$?

if [ "$COMMITS_PULLS_STATUS" -ne 0 ]; then
  echo "❌ ERRO DE API: Falha ao consultar Pull Requests associados ao commit $TARGET_SHA ($COMMITS_PULLS_ENDPOINT)!" >&2
  echo "   Detalhes da resposta: $COMMITS_PULLS_OUTPUT" >&2
  exit 1
fi

if ! echo "$COMMITS_PULLS_OUTPUT" | jq -e 'if type == "array" then true else false end' >/dev/null 2>&1; then
  echo "❌ ERRO DE API: Resposta inesperada ao consultar $COMMITS_PULLS_ENDPOINT (esperava-se array JSON)." >&2
  echo "   Resposta: $COMMITS_PULLS_OUTPUT" >&2
  exit 1
fi

PR_NUM=$(echo "$COMMITS_PULLS_OUTPUT" | jq -r '[.[] | select(.base.ref == "main" and .merged_at != null)] | .[0].number // empty')

if [ -z "$PR_NUM" ]; then
  echo "ℹ️ Nenhum PR retornado diretamente por $COMMITS_PULLS_ENDPOINT. Consultando mensagem de commit do merge..."
  COMMIT_MSG=$(git log -1 --pretty=%B "$TARGET_SHA")
  if [[ "$COMMIT_MSG" =~ Merge\ pull\ request\ #([0-9]+) ]]; then
    PR_NUM="${BASH_REMATCH[1]}"
    echo "ℹ️ Número do PR localizado via mensagem do commit de merge: #$PR_NUM"
  fi
fi

if [ -z "$PR_NUM" ] || ! [[ "$PR_NUM" =~ ^[0-9]+$ ]]; then
  echo "❌ ERRO DE GOVERNANÇA: O commit $TARGET_SHA apontado pela tag não foi gerado por um Pull Request na branch main!" >&2
  exit 1
fi

PULL_ENDPOINT="repos/${GITHUB_REPOSITORY}/pulls/${PR_NUM}"
echo "Validando Pull Request #$PR_NUM e proveniência de governança ($PULL_ENDPOINT)..."
PR_DATA_RAW=""
PR_STATUS=0
PR_DATA_RAW=$(gh api "$PULL_ENDPOINT" 2>&1) || PR_STATUS=$?

if [ "$PR_STATUS" -ne 0 ]; then
  echo "❌ ERRO DE API: Falha ao consultar detalhes do PR #$PR_NUM ($PULL_ENDPOINT)!" >&2
  echo "   Detalhes da resposta: $PR_DATA_RAW" >&2
  exit 1
fi

if ! echo "$PR_DATA_RAW" | jq -e 'if type == "object" and (.number != null or .merged != null) then true else false end' >/dev/null 2>&1; then
  echo "❌ ERRO DE API: Resposta inesperada ao consultar detalhes do PR #$PR_NUM em $PULL_ENDPOINT." >&2
  echo "   Resposta: $PR_DATA_RAW" >&2
  exit 1
fi

PR_DATA=$(echo "$PR_DATA_RAW" | jq '{merged: .merged, merged_by: .merged_by.login, user: .user.login, base: .base.ref, head: .head.ref, head_sha: .head.sha, merge_commit_sha: .merge_commit_sha}')
PR_MERGED=$(echo "$PR_DATA" | jq -r '.merged // empty')
PR_AUTHOR=$(echo "$PR_DATA" | jq -r '.user // empty')
MERGED_BY=$(echo "$PR_DATA" | jq -r '.merged_by // empty')
BASE_REF=$(echo "$PR_DATA" | jq -r '.base // empty')
HEAD_REF=$(echo "$PR_DATA" | jq -r '.head // empty')
PR_HEAD_SHA=$(echo "$PR_DATA" | jq -r '.head_sha // empty')
PR_MERGE_SHA=$(echo "$PR_DATA" | jq -r '.merge_commit_sha // empty')

# Validação: PR deve estar formalmente mergeado
if [ "$PR_MERGED" != "true" ]; then
  echo "❌ ERRO DE GOVERNANÇA: O PR #$PR_NUM não está mergeado (merged = '$PR_MERGED')!" >&2
  exit 1
fi

# Validação: Fluxo estrito de dev para main
if [ "$BASE_REF" != "main" ] || [ "$HEAD_REF" != "dev" ]; then
  echo "❌ ERRO DE GOVERNANÇA: O PR #$PR_NUM deve ser obrigatoriamente de 'dev' para 'main' (encontrado: '$HEAD_REF' -> '$BASE_REF')!" >&2
  exit 1
fi

# Validação: SHA da tag deve corresponder ao merge_commit_sha do PR
if [ -n "$PR_MERGE_SHA" ] && [ "$PR_MERGE_SHA" != "$TARGET_SHA" ]; then
  echo "❌ ERRO DE GOVERNANÇA: O merge_commit_sha do PR ($PR_MERGE_SHA) diverge do commit apontado pela tag ($TARGET_SHA)!" >&2
  exit 1
fi

# Validação: Evidência de aprovação humana por Jeann Lucas
echo "Verificando autorização humana de Jeann Lucas para a promoção..."
APPROVED_FOR_HEAD=0
if [ -n "$PR_HEAD_SHA" ]; then
  REVIEWS_ENDPOINT="repos/${GITHUB_REPOSITORY}/pulls/${PR_NUM}/reviews"
  REVIEWS_RAW=$(gh api "$REVIEWS_ENDPOINT" 2>/dev/null || echo "[]")
  APPROVED_FOR_HEAD=$(echo "$REVIEWS_RAW" | jq "[.[] | select(.user.login == \"jeannlucas\" and .state == \"APPROVED\" and .commit_id == \"${PR_HEAD_SHA}\")] | length" 2>/dev/null || echo 0)
fi

HUMAN_APPROVED=0
if [ "$MERGED_BY" = "jeannlucas" ] && [ "$PR_AUTHOR" = "jeannlucas" ]; then
  HUMAN_APPROVED=1
  echo "✅ Promoção de branch 'dev' para 'main' com autoria e merge pelo próprio Jeann Lucas (#$PR_NUM)."
elif [ "$APPROVED_FOR_HEAD" -gt 0 ]; then
  HUMAN_APPROVED=1
  echo "✅ Promoção com aprovação formal comprovada por Jeann Lucas no head $PR_HEAD_SHA (#$PR_NUM)."
elif [ "$MERGED_BY" = "jeannlucas" ]; then
  HUMAN_APPROVED=1
  echo "✅ Merge executado diretamente por Jeann Lucas (#$PR_NUM)."
fi

if [ "$HUMAN_APPROVED" -ne 1 ]; then
  echo "❌ ERRO DE GOVERNANÇA: O PR #$PR_NUM não possui aprovação formal nem foi mergeado por Jeann Lucas!" >&2
  exit 1
fi

echo "=========================================================="
echo "✅ GOVERNANÇA 100% CONFORME: Tag $TAG_NAME apta para produção!"
echo "   PR: #$PR_NUM ($HEAD_REF -> $BASE_REF)"
echo "   Commit: $TARGET_SHA"
echo "   Autorização: jeannlucas"
echo "=========================================================="

{
  echo "## 🏷️ Validação de Tag SemVer e Governança"
  echo "| Parâmetro | Valor |"
  echo "|---|---|"
  echo "| **Tag de Release** | \`$TAG_NAME\` |"
  echo "| **Commit Alvo** | \`$TARGET_SHA\` |"
  echo "| **Branch Base** | \`main\` |"
  echo "| **Pull Request** | #$PR_NUM (\`$HEAD_REF\` → \`$BASE_REF\`) |"
  echo "| **Autorização Humana** | Válida por \`jeannlucas\` (merged_by: \`$MERGED_BY\`, reviews: $APPROVED_FOR_HEAD) |"
  echo "| **Status da Governança** | ✅ 100% Conforme AGENTS.md |"
} >> "$GITHUB_STEP_SUMMARY"

exit 0
