#!/usr/bin/env bash
# ProPatch BR — Quality Gate & Backpressure Determinístico
# Espelhamento fiel do GitHub Actions CI (.github/workflows/ci.yml)
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

MODE="full"
for arg in "$@"; do
  case "$arg" in
    --unit|--quick|--fast)
      MODE="quick"
      ;;
    --full)
      MODE="full"
      ;;
    --help|-h)
      echo "Uso: ./scripts/check.sh [--quick | --fast | --full]"
      echo "  --full (padrão): Suíte completa (Lint, Typecheck, Testes de Infra e Build de produção)"
      echo "  --quick / --fast: Modo rápido de desenvolvimento (Lint e Typecheck - NÃO autoriza push)"
      exit 0
      ;;
    *)
      echo "Argumento desconhecido: $arg" >&2
      exit 1
      ;;
  esac
done

echo "================================================="
echo "  ProPatch BR Quality Gate — scripts/check.sh"
echo "  Modo Selecionado: $MODE"
echo "================================================="

# [1/5] Linter (ESLint)
echo "[1/5] Checando Linting (ESLint)..."
npm run lint

# [2/5] Tipagem TypeScript (tsc --noEmit)
echo "[2/5] Checando Tipagem TypeScript (tsc --noEmit)..."
npm run typecheck

# [3/5] Testes de Governança SemVer
echo "[3/5] Executando Testes de Governança de Deploy..."
./tests/infra/test-deploy-governance.sh

# [4/5] Testes de Transição e Baseline
echo "[4/5] Executando Testes de Transição e Baseline..."
./tests/infra/test-vps-deploy-transition.sh
./tests/infra/test-baseline-migration.sh

# [5/5] Build Next.js
if [ "$MODE" = "full" ]; then
  echo "[5/5] Compilação e Build Next.js de Produção..."
  NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production npm run build
else
  echo "[5/5] Build de produção pulado (--quick)."
fi

echo "================================================="
if [ "$MODE" = "full" ]; then
  echo "✅ TUDO VERDE: Backpressure do ProPatch BR APROVADO (100%)"
  echo "   Autorizado para publicação e homologação humana!"
else
  echo "✅ MODO RÁPIDO APROVADO: Linter e Tipos verdes."
  echo "   ⚠️ ATENÇÃO: Modo rápido NÃO autoriza publicação ou push. Execute sem flags para validação completa."
fi
echo "================================================="
exit 0
