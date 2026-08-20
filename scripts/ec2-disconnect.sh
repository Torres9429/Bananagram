#!/usr/bin/env bash
# Cierra la(s) conexión(es) SSH de fondo (ControlMaster) abiertas por ec2-connect.sh.
# Una sesión interactiva normal se cierra con `exit` o Ctrl+D — este script es para
# matar el socket persistente en ~/.ssh/sockets/ cuando ya no lo necesitas.
#
# Uso: ./scripts/ec2-disconnect.sh <frontend|core|auth-gateway|extras|all>

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/ec2-hosts.sh

EC2_USER="${EC2_USER:-ubuntu}"
ROLE="${1:-all}"

close_one() {
  local role="$1" host socket
  host="$(ec2_host_for "$role")"
  socket="$HOME/.ssh/sockets/bananagram-ec2-$role.sock"
  if [ -S "$socket" ]; then
    ssh -o ControlPath="$socket" -O exit "$EC2_USER@$host" 2>/dev/null || true
    echo "Conexión cerrada: $role"
  fi
}

if [ "$ROLE" = "all" ]; then
  for role in $(ec2_all_roles); do
    close_one "$role"
  done
else
  ec2_require_valid_role "$ROLE"
  close_one "$ROLE"
fi
