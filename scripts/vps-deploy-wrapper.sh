#!/usr/bin/env bash
set -euo pipefail

readonly DEPLOY_SCRIPT="/srv/propatchbr/scripts/vps-deploy.sh"
tag="${SSH_ORIGINAL_COMMAND:-}"
semver='^v(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$'

if ! [[ "$tag" =~ $semver ]]; then
  echo "Entrada rejeitada. Apenas uma única tag no formato vMAJOR.MINOR.PATCH é autorizada." >&2
  exit 1
fi
if [ ! -x "$DEPLOY_SCRIPT" ]; then
  echo "Script de deploy indisponível: $DEPLOY_SCRIPT" >&2
  exit 1
fi
exec "$DEPLOY_SCRIPT" --tag "$tag"
