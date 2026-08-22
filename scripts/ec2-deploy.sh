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
REPO_PATH="$(ec2_repo_path_for "$ROLE")"

echo "== 1/3: sincronizando código -> $ROLE =="
./scripts/ec2-sync.sh "$ROLE"

echo "== 2/3: build (uno por uno, con cache de BuildKit) + up -d en $ROLE =="
# DOCKER_BUILDKIT=1 + COMPOSE_DOCKER_CLI_BUILD=1: los Dockerfiles usan
# `RUN --mount=type=cache,...` para compartir el store de pnpm y la cache de
# turbo entre builds de distintos servicios en el mismo host — sin BuildKit
# ese --mount no existe y el build falla. No asumir que el daemon ya lo tiene
# de default: varía entre el Docker de apt (Ubuntu) y el binario manual
# (Amazon Linux, ver scripts/lib/ec2-hosts.sh).
BUILD_CMDS=""
for svc in $SERVICES; do
  BUILD_CMDS="$BUILD_CMDS sudo DOCKER_BUILDKIT=1 COMPOSE_DOCKER_CLI_BUILD=1 docker compose -f $COMPOSE_FILE build $svc &&"
done

./scripts/ec2-connect.sh "$ROLE" "cd $REPO_PATH && rm -f build.log && nohup bash -c '
(
  set -e
  $BUILD_CMDS
  sudo docker compose -f $COMPOSE_FILE up -d
) && echo DEPLOY_DONE || echo DEPLOY_FAILED
' > build.log 2>&1 < /dev/null & disown; sleep 1; echo LAUNCHED"

echo "== 3/3: siguiendo build.log (Ctrl+C solo corta el seguimiento, el build sigue en el servidor) =="
# Bug real corregido en vivo (2026-08-21, primera corrida real de CI): las 3
# llamadas de acá abajo (tail, el loop de grep, y el "docker compose ps"
# final) le pasaban a ec2-connect.sh un comando con rutas relativas
# (build.log, $COMPOSE_FILE) SIN hacer `cd` primero — una sesión SSH no
# interactiva nueva (`ssh host "cmd"`) arranca en $HOME del usuario remoto
# (ej. /home/ubuntu), no en $REPO_PATH, así que "build.log" ahí nunca
# existía. El loop de abajo nunca podía ver DEPLOY_DONE ni DEPLOY_FAILED —
# se quedaba reintentando para siempre hasta el timeout del job, aunque el
# deploy real ya hubiera terminado bien en el servidor (confirmado por SSH
# directo). No se notó en uso manual de esta sesión porque siempre usé la
# ruta completa (~/Bananagram/build.log) a mano en vez de llamar a este
# script tal cual — recién se manifestó al correr esto de punta a punta sin
# intervención, que es exactamente lo que hace CI.
./scripts/ec2-connect.sh "$ROLE" "cd $REPO_PATH && tail -f -n +1 build.log" &
TAIL_PID=$!
trap 'kill $TAIL_PID 2>/dev/null || true' EXIT

while true; do
  if ./scripts/ec2-connect.sh "$ROLE" "cd $REPO_PATH && grep -q DEPLOY_DONE build.log" 2>/dev/null; then
    break
  fi
  if ./scripts/ec2-connect.sh "$ROLE" "cd $REPO_PATH && grep -q DEPLOY_FAILED build.log" 2>/dev/null; then
    kill $TAIL_PID 2>/dev/null || true
    trap - EXIT
    echo "== FALLÓ el deploy de $ROLE — ver el log de arriba =="
    exit 1
  fi
  sleep 5
done
kill $TAIL_PID 2>/dev/null || true
trap - EXIT

echo "== listo — estado final de $ROLE =="
./scripts/ec2-connect.sh "$ROLE" "cd $REPO_PATH && sudo docker compose -f $COMPOSE_FILE ps"
