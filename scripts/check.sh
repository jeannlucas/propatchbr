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
      echo "  --full (padrão): Suíte completa (Lint, Typecheck e Build de produção)"
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

# [1/3] Linter (ESLint)
echo "[1/3] Checando Linting (ESLint)..."
npm run lint

# [2/3] Tipagem TypeScript (tsc --noEmit)
echo "[2/3] Checando Tipagem TypeScript (tsc --noEmit)..."
npm run typecheck

# [3/3] Build Next.js
if [ "$MODE" = "full" ]; then
  echo "[3/3] Compilação e Build Next.js de Produção..."
  NEXT_TELEMETRY_DISABLED=1 NODE_ENV=production npm run build
else
  echo "[3/3] Build de produção pulado (--quick)."
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
