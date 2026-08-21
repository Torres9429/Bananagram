#!/usr/bin/env bash
# Sincroniza el working tree local hacia una (o todas) de las 4 instancias EC2,
# sin tocar contenedores. Para sincronizar Y redesplegar de una, usa ec2-deploy.sh.
#
# Uso: ./scripts/ec2-sync.sh <frontend|core|auth-gateway|extras|all>
#
# Excluye lo mismo que .gitignore excluye del repo, más node_modules/.next/.turbo/
# dist (se generan de nuevo en cada build de Docker) y keys/*.pem (los `.env` y las
# llaves JWT se generan una sola vez por host, directo en el servidor — nunca se
# sincronizan desde acá). Ojo con el patrón de *.sql: usa '/*.sql' (ancla a la raíz
# del repo, como en .gitignore) — un '*.sql' sin ancla también excluiría
# infra/postgres/init-databases.sql, que sí debe viajar (bug real que costó
# tiempo diagnosticar: Docker crea un directorio vacío en el destino del bind
# mount cuando el archivo fuente no existe, en vez de fallar con un error claro).

set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
source scripts/lib/ec2-hosts.sh

EC2_KEY_PATH="${EC2_KEY_PATH:-$HOME/Descargas/Bananagram.pem}"

RSYNC_EXCLUDES=(
  --exclude 'node_modules' --exclude '.git' --exclude '.next' --exclude '.turbo'
  --exclude 'dist' --exclude '.env' --exclude '.env.*' --exclude '!.env.example'
  --exclude '*.tsbuildinfo' --exclude 'coverage' --exclude '*.log'
  --exclude '.dev-pids' --exclude '.dev-logs' --exclude 'keys' --exclude '*.pem'
  --exclude '/*.sql' --exclude '/backups'
)

sync_one() {
  local role="$1" host user
  host="$(ec2_host_for "$role")"
  user="${EC2_USER:-$(ec2_user_for "$role")}"
  echo "== sync -> $role ($host) =="
  rsync -az --delete "${RSYNC_EXCLUDES[@]}" \
    -e "ssh -i $EC2_KEY_PATH -o StrictHostKeyChecking=accept-new" \
    ./ "$user@$host:$(ec2_repo_path_for "$role")/"
}

ROLE="${1:-}"
if [ -z "$ROLE" ]; then
  echo "Uso: $0 <$(ec2_all_roles | tr ' ' '|')|all>" >&2
  exit 1
fi

if [ "$ROLE" = "all" ]; then
  for role in $(ec2_all_roles); do
    sync_one "$role"
  done
else
  ec2_require_valid_role "$ROLE"
  sync_one "$ROLE"
fi
