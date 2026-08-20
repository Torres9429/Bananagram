#!/usr/bin/env bash
# Fuente única de verdad de las 4 instancias EC2 del despliegue multi-host
# (ver docs/todos/deployment.md). La usan ec2-connect.sh, ec2-disconnect.sh,
# ec2-sync.sh y ec2-deploy.sh — cámbiala acá si una IP cambia, no en cada script.
#
# rol           qué corre                                    compose file
# frontend      web-shell + 5 zonas                           docker-compose.frontend.yml
# core          Postgres + Redis + core-service                docker-compose.core.yml
# auth-gateway  auth-service + api-gateway                     docker-compose.auth-gateway.yml
# extras        alexa-service + ai-service                     docker-compose.extras.yml

ec2_host_for() {
  case "$1" in
    frontend)     echo "52.200.97.70" ;;
    core)         echo "100.48.200.42" ;;
    auth-gateway) echo "44.216.180.59" ;;
    extras)       echo "52.2.62.9" ;;
    *) return 1 ;;
  esac
}

ec2_compose_file_for() {
  case "$1" in
    frontend)     echo "docker-compose.frontend.yml" ;;
    core)         echo "docker-compose.core.yml" ;;
    auth-gateway) echo "docker-compose.auth-gateway.yml" ;;
    extras)       echo "docker-compose.extras.yml" ;;
    *) return 1 ;;
  esac
}

ec2_all_roles() {
  echo "frontend core auth-gateway extras"
}

# Servicios de cada compose file, en el orden en que conviene construirlos
# (dependencias primero). ec2-deploy.sh los construye uno por uno — NUNCA con
# `--build` de una sola pasada sobre todo el archivo: un t3.small (2GB RAM) se
# quedó sin memoria construyendo las 6 apps de frontend en paralelo (el
# default de `docker compose build`) y el kernel reinició la instancia dos
# veces seguidas. Construir de a uno cuesta un poco más de tiempo total pero
# nunca satura la RAM — cada build usa toda la máquina para sí solo.
ec2_services_for() {
  case "$1" in
    frontend)     echo "admin-front analytics-front auth-front brands-front posts-front web-shell" ;;
    core)         echo "core-service" ;;
    auth-gateway) echo "auth-service api-gateway" ;;
    extras)       echo "ai-service alexa-service" ;;
    *) return 1 ;;
  esac
}

ec2_require_valid_role() {
  if ! ec2_host_for "$1" > /dev/null 2>&1; then
    echo "Rol desconocido: '$1'. Usa: $(ec2_all_roles)" >&2
    exit 1
  fi
}
