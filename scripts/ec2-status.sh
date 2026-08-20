#!/usr/bin/env bash
# Estado rápido de contenedores en una o las 4 instancias EC2 del despliegue.
#
# Uso: ./scripts/ec2-status.sh [frontend|core|auth-gateway|extras|all]
# (sin argumento = all)

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/ec2-hosts.sh

status_one() {
  local role="$1"
  echo "=== $role ($(ec2_host_for "$role")) ==="
  ./scripts/ec2-connect.sh "$role" "cd /home/ubuntu/Bananagram && sudo docker compose -f $(ec2_compose_file_for "$role") ps" 2>&1 \
    || echo "(no se pudo conectar)"
  echo
}

ROLE="${1:-all}"
if [ "$ROLE" = "all" ]; then
  for role in $(ec2_all_roles); do
    status_one "$role"
  done
else
  ec2_require_valid_role "$ROLE"
  status_one "$ROLE"
fi
