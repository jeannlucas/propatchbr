#!/usr/bin/env bash
# ==============================================================================
# BigDev.Z ProPatch BR — Teste Automatizado de Governança de Deploy SemVer
# Valida rigorosamente todos os critérios de proveniência e aprovação humana:
# 1. PR de autoria de jeannlucas mergeado por jeannlucas -> APROVADO
# 2. PR de terceiro com review de aprovação formal de jeannlucas -> APROVADO
# 3. PR de terceiro mergeado sem aprovação formal válida -> REJEITADO
# 4. PR de terceiro com review de aprovação obsoleto (stale commit) -> REJEITADO
# 5. SHA da tag divergente do merge_commit_sha retornado pela API -> REJEITADO
# 6. PR mergeado de branch diferente de dev (ex: feature -> main) -> REJEITADO
# 7. PR de autoria de jeannlucas mergeado por terceiro sem autorização -> REJEITADO
# 8. Rejeição com HTTP 403 identificando a consulta que falhou -> TRATADO COM SUCESSO
# 9. Rejeição em caso de resposta inválida da API -> TRATADO COM SUCESSO
# 10. Fallback via mensagem de commit quando endpoint de pulls retorna vazio -> APROVADO
# ==============================================================================
set -euo pipefail

TEST_DIR=$(mktemp -d -t ethos_gov_test_XXXXXX)
VALIDATOR_SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../scripts" && pwd)/validate-deploy-governance.sh"

cleanup() {
  rm -rf "$TEST_DIR"
}
trap cleanup EXIT

MOCK_BIN="$TEST_DIR/bin"
mkdir -p "$MOCK_BIN"
export PATH="$MOCK_BIN:$PATH"

# 1. Repositório Git de Teste
REPO_DIR="$TEST_DIR/repo"
mkdir -p "$REPO_DIR"
(
  cd "$REPO_DIR"
  git init -b main >/dev/null 2>&1
  git config user.name "Tester"
  git config user.email "tester@bigdevz.com"
  git config commit.gpgsign false

  # Base commit
  git commit --allow-empty -m "chore: base" >/dev/null 2>&1
  git checkout -b dev >/dev/null 2>&1
  git commit --allow-empty -m "feat: work on dev" >/dev/null 2>&1
  git checkout main >/dev/null 2>&1
  git merge --no-ff dev -m "Merge pull request #10 from dev" >/dev/null 2>&1
  git tag v1.0.1
)
VALID_MERGE_SHA=$(git -C "$REPO_DIR" rev-parse HEAD)
DEV_HEAD_SHA=$(git -C "$REPO_DIR" rev-parse dev)

# Mock do `gh`
GH_MOCK="$MOCK_BIN/gh"
cat << 'EOF' > "$GH_MOCK"
#!/usr/bin/env bash
set -euo pipefail

CMD="$*"
JQ_FILTER=""
for ((i=1; i<=$#; i++)); do
  eval "arg=\${$i}"
  if [ "$arg" = "--jq" ]; then
    next=$((i+1))
    eval "JQ_FILTER=\${$next}"
    break
  fi
done

process_output() {
  if [ -n "$JQ_FILTER" ]; then
    jq -r "$JQ_FILTER"
  else
    cat
  fi
}

# Consulta de pulls por commit
if [[ "$CMD" =~ /commits/.*/pulls ]]; then
  if [ "${MOCK_HTTP_403:-0}" = "1" ]; then
    echo '{"message":"Resource not accessible by integration","status":"403"}' >&2
    exit 1
  fi
  if [ "${MOCK_INVALID_RESPONSE:-0}" = "1" ]; then
    echo '{"message":"invalid non-array response"}'
    exit 0
  fi
  if [ "${MOCK_EMPTY_PULLS:-0}" = "1" ]; then
    echo '[]' | process_output
    exit 0
  fi
  echo '[{"number": 10, "base": {"ref": "main"}, "merged_at": "2026-11-12T00:00:00Z"}]' | process_output
  exit 0
fi

# Consulta de detalhes do PR
if [[ "$CMD" =~ /pulls/10(\ |$) ]]; then
  AUTHOR="${MOCK_PR_AUTHOR:-jeannlucas}"
  MERGED_BY="${MOCK_PR_MERGED_BY:-jeannlucas}"
  BASE_REF="${MOCK_PR_BASE:-main}"
  HEAD_REF="${MOCK_PR_HEAD:-dev}"
  HEAD_SHA="${MOCK_PR_HEAD_SHA:-}"
  MERGE_SHA="${MOCK_PR_MERGE_SHA:-}"

  cat << JSON | process_output
{
  "number": 10,
  "merged": true,
  "user": {"login": "$AUTHOR"},
  "merged_by": {"login": "$MERGED_BY"},
  "base": {"ref": "$BASE_REF"},
  "head": {"ref": "$HEAD_REF", "sha": "$HEAD_SHA"},
  "merge_commit_sha": "$MERGE_SHA"
}
JSON
  exit 0
fi

# Consulta de reviews
if [[ "$CMD" =~ /pulls/10/reviews ]]; then
  if [ "${MOCK_HAS_APPROVAL:-0}" -eq 1 ]; then
    COMMIT_REVIEWED="${MOCK_REVIEW_COMMIT:-}"
    REVIEWER="${MOCK_REVIEWER:-jeannlucas}"
    STATE="${MOCK_REVIEW_STATE:-APPROVED}"
    cat << JSON | process_output
[
  {
    "user": {"login": "$REVIEWER"},
    "state": "$STATE",
    "commit_id": "$COMMIT_REVIEWED"
  }
]
JSON
  else
    echo "[]" | process_output
  fi
  exit 0
fi

echo "gh mock: unhandled command: $CMD" >&2
exit 1
EOF
chmod +x "$GH_MOCK"

echo "=========================================================="
echo "  BigDev.Z ProPatch BR — Testes de Governança de Deploy SemVer  "
echo "=========================================================="

cd "$REPO_DIR"

export GITHUB_REPOSITORY="jeannlucas/bigdevz-ethos"

# ------------------------------------------------------------------------------
# Teste 1: PR de autoria de jeannlucas mergeado por jeannlucas (dev -> main)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 1: PR de autoria de jeannlucas mergeado pelo próprio .. "
export MOCK_PR_AUTHOR="jeannlucas"
export MOCK_PR_MERGED_BY="jeannlucas"
export MOCK_PR_BASE="main"
export MOCK_PR_HEAD="dev"
export MOCK_PR_HEAD_SHA="$DEV_HEAD_SHA"
export MOCK_PR_MERGE_SHA="$VALID_MERGE_SHA"
export MOCK_HAS_APPROVAL=0

if "$VALIDATOR_SRC" v1.0.1 >/dev/null 2>&1; then
  echo "✅ APROVOU (Correto)"
else
  echo "❌ FALHOU (Deveria ter aprovado PR de jeannlucas mergeado por jeannlucas)"
  exit 1
fi

# ------------------------------------------------------------------------------
# Teste 2: PR de terceiro com aprovação formal de jeannlucas no head commit
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 2: PR de terceiro com aprovação de jeannlucas no head commit .. "
export MOCK_PR_AUTHOR="developer-terceiro"
export MOCK_PR_MERGED_BY="maintainer-bot"
export MOCK_HAS_APPROVAL=1
export MOCK_REVIEWER="jeannlucas"
export MOCK_REVIEW_STATE="APPROVED"
export MOCK_REVIEW_COMMIT="$DEV_HEAD_SHA"

if "$VALIDATOR_SRC" v1.0.1 >/dev/null 2>&1; then
  echo "✅ APROVOU (Correto)"
else
  echo "❌ FALHOU (Deveria ter aprovado com review formal válido de jeannlucas)"
  exit 1
fi

# ------------------------------------------------------------------------------
# Teste 3: Rejeição de PR de terceiro sem review formal de jeannlucas
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 3: Rejeição de PR de terceiro sem aprovação formal .. "
export MOCK_PR_AUTHOR="developer-terceiro"
export MOCK_PR_MERGED_BY="maintainer-bot"
export MOCK_HAS_APPROVAL=0

if "$VALIDATOR_SRC" v1.0.1 >/dev/null 2>&1; then
  echo "❌ FALHOU (Deveria ter rejeitado merge sem aprovação)"
  exit 1
fi
echo "✅ REJEITOU (Correto)"

# ------------------------------------------------------------------------------
# Teste 4: Rejeição de aprovação em commit anterior desatualizado (stale)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 4: Rejeição de aprovação em commit anterior desatualizado .. "
export MOCK_PR_AUTHOR="developer-terceiro"
export MOCK_PR_MERGED_BY="maintainer-bot"
export MOCK_HAS_APPROVAL=1
export MOCK_REVIEW_COMMIT="sha_antigo_nao_revisado"

if "$VALIDATOR_SRC" v1.0.1 >/dev/null 2>&1; then
  echo "❌ FALHOU (Deveria ter rejeitado por aprovação em commit obsoleto)"
  exit 1
fi
echo "✅ REJEITOU (Correto)"

# ------------------------------------------------------------------------------
# Teste 5: Rejeição quando o SHA da tag diverge do merge_commit_sha oficial
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 5: Rejeição de divergência de SHA entre tag e merge_commit .. "
export MOCK_PR_AUTHOR="jeannlucas"
export MOCK_PR_MERGED_BY="jeannlucas"
export MOCK_PR_MERGE_SHA="sha_divergente_da_tag"
export MOCK_HAS_APPROVAL=0

if "$VALIDATOR_SRC" v1.0.1 >/dev/null 2>&1; then
  echo "❌ FALHOU (Deveria ter rejeitado SHA divergente)"
  exit 1
fi
echo "✅ REJEITOU (Correto)"

# ------------------------------------------------------------------------------
# Teste 6: Rejeição de PR mergeado de branch diferente de dev (ex: feature -> main)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 6: Rejeição de PR com branch base/head inválida .. "
export MOCK_PR_AUTHOR="jeannlucas"
export MOCK_PR_MERGED_BY="jeannlucas"
export MOCK_PR_HEAD="feature/qualquer"
export MOCK_PR_MERGE_SHA="$VALID_MERGE_SHA"

if "$VALIDATOR_SRC" v1.0.1 >/dev/null 2>&1; then
  echo "❌ FALHOU (Deveria ter rejeitado branch que não seja dev)"
  exit 1
fi
echo "✅ REJEITOU (Correto)"

# ------------------------------------------------------------------------------
# Teste 7: Rejeição de PR de jeannlucas mergeado por terceiro sem aprovação
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 7: Rejeição de PR de jeannlucas mergeado por terceiro .. "
export MOCK_PR_AUTHOR="jeannlucas"
export MOCK_PR_MERGED_BY="usuario-invasor"
export MOCK_PR_HEAD="dev"
export MOCK_PR_MERGE_SHA="$VALID_MERGE_SHA"

if "$VALIDATOR_SRC" v1.0.1 >/dev/null 2>&1; then
  echo "❌ FALHOU (Deveria ter rejeitado terceiro mergeando PR de jeannlucas)"
  exit 1
fi
echo "✅ REJEITOU (Correto)"

# ------------------------------------------------------------------------------
# Teste 8: Rejeição com HTTP 403 identificando a consulta que falhou
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 8: Rejeição com HTTP 403 identificando consulta .. "
export MOCK_HTTP_403=1
OUTPUT_403=$("$VALIDATOR_SRC" v1.0.1 2>&1 || true)
unset MOCK_HTTP_403

if echo "$OUTPUT_403" | grep -q "Falha ao consultar Pull Requests associados ao commit"; then
  echo "✅ REJEITOU COM MENSAGEM CORRETA"
else
  echo "❌ FALHOU (Não rejeitou com a mensagem esperada: $OUTPUT_403)"
  exit 1
fi

# ------------------------------------------------------------------------------
# Teste 9: Rejeição em caso de resposta inválida (não-array)
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 9: Rejeição em resposta inválida da API .. "
export MOCK_INVALID_RESPONSE=1
OUTPUT_INV=$("$VALIDATOR_SRC" v1.0.1 2>&1 || true)
unset MOCK_INVALID_RESPONSE

if echo "$OUTPUT_INV" | grep -q "esperava-se array JSON"; then
  echo "✅ REJEITOU COM RESPOSTA INVÁLIDA"
else
  echo "❌ FALHOU (Não identificou resposta inválida: $OUTPUT_INV)"
  exit 1
fi

# ------------------------------------------------------------------------------
# Teste 10: Fallback válido via mensagem do commit quando API retorna []
# ------------------------------------------------------------------------------
echo -n "🧪 Cenário 10: Sucesso com fallback via mensagem do merge .. "
export MOCK_EMPTY_PULLS=1
export MOCK_PR_AUTHOR="jeannlucas"
export MOCK_PR_MERGED_BY="jeannlucas"
export MOCK_PR_HEAD="dev"
export MOCK_PR_MERGE_SHA="$VALID_MERGE_SHA"

if "$VALIDATOR_SRC" v1.0.1 >/dev/null 2>&1; then
  echo "✅ PASSOU COM FALLBACK"
else
  echo "❌ FALHOU (Deveria ter aprovado via fallback da mensagem de commit)"
  exit 1
fi
unset MOCK_EMPTY_PULLS

echo "=========================================================="
echo "🎉 Todos os 10 testes de governança passaram com 100% de sucesso!"
echo "=========================================================="
exit 0
