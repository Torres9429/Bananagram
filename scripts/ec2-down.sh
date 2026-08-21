#!/usr/bin/env bash
# Baja los contenedores de una o las 4 instancias EC2 del despliegue.
#
# Uso: ./scripts/ec2-down.sh <frontend|core|auth-gateway|extras|all> [-v]
#   -v  también borra volúmenes (¡se pierde la base de datos de Postgres si
#       se lo pasas al rol "core"!) — úsalo cuando quieras un estado
#       realmente limpio (por ejemplo, antes de correr las migraciones +
#       seed desde cero).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/ec2-hosts.sh

ROLE="${1:-}"
VOL_FLAG="${2:-}"
if [ -z "$ROLE" ]; then
  echo "Uso: $0 <$(ec2_all_roles | tr ' ' '|')|all> [-v]" >&2
  exit 1
fi

down_one() {
  local role="$1"
  echo "== down -> $role =="
  ./scripts/ec2-connect.sh "$role" "cd $(ec2_repo_path_for "$role") && sudo docker compose -f $(ec2_compose_file_for "$role") down $VOL_FLAG"
}

if [ "$ROLE" = "all" ]; then
  for role in $(ec2_all_roles); do
    down_one "$role"
  done
else
  ec2_require_valid_role "$ROLE"
  down_one "$ROLE"
fi
