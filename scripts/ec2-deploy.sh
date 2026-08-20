#!/usr/bin/env bash
# Sincroniza el working tree local a un EC2 y redespliega su parte del stack
# (build + up -d) — el "sube cambios" de un solo comando.
#
# Uso: ./scripts/ec2-deploy.sh <frontend|core|auth-gateway|extras>
#
# Construye los servicios de ese host DE A UNO (nunca `--build` de una sola
# pasada) — un t3.small no tiene RAM para construir varios a la vez, ver el
# comentario en scripts/lib/ec2-hosts.sh. Corre el build desacoplado de la
# sesión SSH (nohup en el servidor) para que sobreviva si la conexión se cae
# a mitad de camino — vas a ver el progreso igual porque el script hace
# streaming del log mientras espera.

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/ec2-hosts.sh

ROLE="${1:-}"
if [ -z "$ROLE" ]; then
  echo "Uso: $0 <$(ec2_all_roles | tr ' ' '|')>" >&2
  exit 1
fi
ec2_require_valid_role "$ROLE"

COMPOSE_FILE="$(ec2_compose_file_for "$ROLE")"
SERVICES="$(ec2_services_for "$ROLE")"

echo "== 1/3: sincronizando código -> $ROLE =="
./scripts/ec2-sync.sh "$ROLE"

echo "== 2/3: build (uno por uno) + up -d en $ROLE =="
BUILD_CMDS=""
for svc in $SERVICES; do
  BUILD_CMDS="$BUILD_CMDS sudo docker compose -f $COMPOSE_FILE build $svc &&"
done

./scripts/ec2-connect.sh "$ROLE" "cd /home/ubuntu/Bananagram && rm -f build.log && nohup bash -c '
set -e
$BUILD_CMDS
sudo docker compose -f $COMPOSE_FILE up -d
echo DEPLOY_DONE
' > build.log 2>&1 < /dev/null & disown; sleep 1; echo LAUNCHED"

echo "== 3/3: siguiendo build.log (Ctrl+C solo corta el seguimiento, el build sigue en el servidor) =="
./scripts/ec2-connect.sh "$ROLE" "tail -f -n +1 build.log" &
TAIL_PID=$!
trap 'kill $TAIL_PID 2>/dev/null || true' EXIT

while ! ./scripts/ec2-connect.sh "$ROLE" "grep -q DEPLOY_DONE build.log" 2>/dev/null; do
  sleep 5
done
kill $TAIL_PID 2>/dev/null || true
trap - EXIT

echo "== listo — estado final de $ROLE =="
./scripts/ec2-connect.sh "$ROLE" "sudo docker compose -f $COMPOSE_FILE ps"
