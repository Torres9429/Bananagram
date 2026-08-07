#!/bin/bash
# Exporta el spec OpenAPI real de cada microservicio a docs/swagger/*.yaml.
# Requiere que los servicios ya esten corriendo (pnpm dev o
# pnpm --filter @repo/<servicio> dev) - este script no los levanta, solo
# lee lo que cada uno expone en tiempo real via @nestjs/swagger.
#
# Cada servicio expone (ver src/main.ts): Scalar en /docs, Swagger UI
# clasico + /api-json + /api-yaml en /api. Este script lee /api-yaml.
#
# Corre esto cada vez que agregues/cambies un modulo o endpoint y quieras
# que docs/swagger/ refleje el estado actual de la API.
set -e
cd "$(dirname "$0")/.."

declare -A SERVICES=(
  [auth-service]=3001
  [core-service]=3002
  [alexa-service]=3004
)

mkdir -p docs/swagger

for name in "${!SERVICES[@]}"; do
  port="${SERVICES[$name]}"
  url="http://localhost:$port/api-yaml"
  tmp="docs/swagger/$name.yaml.tmp"

  echo "Exportando Swagger de $name ($url)..."
  if curl -sf "$url" -o "$tmp"; then
    mv "$tmp" "docs/swagger/$name.yaml"
    echo "OK: docs/swagger/$name.yaml"
  else
    rm -f "$tmp"
    echo "AVISO: no se pudo exportar $name - verifica que este corriendo (pnpm --filter @repo/$name dev)"
  fi
done

echo "Listo."
