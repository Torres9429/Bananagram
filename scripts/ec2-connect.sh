#!/usr/bin/env bash
# Conecta por SSH a una de las 4 instancias EC2 del despliegue (arquitectura
# multi-instancia, ver docs/todos/deployment.md): frontend, core, auth-gateway, extras.
#
# Uso: ./scripts/ec2-connect.sh <rol> ["comando"]
#   ./scripts/ec2-connect.sh frontend              # shell interactiva
#   ./scripts/ec2-connect.sh core "docker ps"      # un comando puntual
#
# Usa un socket ControlMaster (~/.ssh/sockets/) por instancia: la primera vez que
# te conectas a un rol hace el handshake completo; las siguientes reutilizan el
# mismo socket y conectan casi instantáneo. Para cerrar esa conexión de fondo (no
# solo la sesión interactiva), usa ec2-disconnect.sh <rol>.
#
# Overrides opcionales: EC2_KEY_PATH=/ruta/a/otra.pem, EC2_USER=otro-usuario

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/ec2-hosts.sh

EC2_KEY_PATH="${EC2_KEY_PATH:-$HOME/Descargas/Bananagram.pem}"

ROLE="${1:-}"
if [ -z "$ROLE" ]; then
  echo "Uso: $0 <$(ec2_all_roles | tr ' ' '|')> [\"comando\"]" >&2
  exit 1
fi
ec2_require_valid_role "$ROLE"
shift

EC2_HOST="$(ec2_host_for "$ROLE")"
# frontend corre Amazon Linux 2023 (usuario ec2-user) — los otros 3, Ubuntu
# (usuario ubuntu). EC2_USER en el entorno gana si se pasa explícito.
EC2_USER="${EC2_USER:-$(ec2_user_for "$ROLE")}"
CONTROL_SOCKET="$HOME/.ssh/sockets/bananagram-ec2-$ROLE.sock"

if [ ! -f "$EC2_KEY_PATH" ]; then
  echo "No se encontró la llave en $EC2_KEY_PATH (override con EC2_KEY_PATH=...)" >&2
  exit 1
fi

mkdir -p "$(dirname "$CONTROL_SOCKET")"
chmod 700 "$(dirname "$CONTROL_SOCKET")"
chmod 400 "$EC2_KEY_PATH"

exec ssh \
  -i "$EC2_KEY_PATH" \
  -o StrictHostKeyChecking=accept-new \
  -o ControlMaster=auto \
  -o ControlPath="$CONTROL_SOCKET" \
  -o ControlPersist=10m \
  "$EC2_USER@$EC2_HOST" \
  "$@"
