#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# ProPatch BR — Wrapper Protegido de Comando Forçado SSH para Deploy
# ==============================================================================
# Destino na VPS: /usr/local/bin/propatch-deploy
# Permissões na VPS: root:propatch-deploy chmod 750
# Configuração em authorized_keys:
#   command="/usr/local/bin/propatch-deploy",restrict,from="100.64.0.0/10" ssh-ed25519 ...
# ==============================================================================

# Caminho fixo, absoluto e inalterável do script de deploy oficial na VPS.
readonly DEPLOY_SCRIPT="/srv/propatchbr/scripts/vps-deploy.sh"

# O SSH repassa o comando fornecido pelo cliente através da variável SSH_ORIGINAL_COMMAND
INPUT_COMMAND="${SSH_ORIGINAL_COMMAND:-${1:-}}"

# Regex estrita SemVer canônica: vMAJOR.MINOR.PATCH (sem espaços, sem flags, sem injeções)
SEMVER_REGEX='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'

# 1. Rejeição fail-closed de entrada vazia
if [ -z "$INPUT_COMMAND" ]; then
  echo "❌ ERRO DE SEGURANÇA [Wrapper]: Nenhuma tag fornecida. Entrada vazia rejeitada." >&2
  exit 1
fi

# 2. Rejeição de quebras de linha ou caracteres de controle antes do regex
if [[ "$INPUT_COMMAND" =~ [$'\r\n'] ]]; then
  echo "❌ ERRO DE SEGURANÇA [Wrapper]: Caracteres de quebra de linha detectados. Rejeitado." >&2
  exit 1
fi

# 3. Validação estrita da entrada inteira como UMA ÚNICA tag SemVer
if ! [[ "$INPUT_COMMAND" =~ $SEMVER_REGEX ]]; then
  echo "❌ ERRO DE SEGURANÇA [Wrapper]: Entrada rejeitada: '$INPUT_COMMAND'." >&2
  echo "   Apenas uma única tag no formato vMAJOR.MINOR.PATCH (ex: v1.0.1) é autorizada." >&2
  echo "   Comandos arbitrários, argumentos extras ou formatos inválidos são bloqueados." >&2
  exit 1
fi

# Entrada validada com 100% de integridade
VALIDATED_TAG="$INPUT_COMMAND"

# 4. Verificação de existência e executabilidade do script de deploy oficial
if [ ! -x "$DEPLOY_SCRIPT" ]; then
  echo "❌ ERRO DE SEGURANÇA [Wrapper]: Script de deploy não encontrado ou sem permissão de execução: $DEPLOY_SCRIPT" >&2
  exit 1
fi

# 5. Execução do script oficial passando estritamente a tag como único argumento
exec "$DEPLOY_SCRIPT" --tag "$VALIDATED_TAG"
