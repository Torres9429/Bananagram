-- Se ejecuta solo en la primera inicialización de un volumen nuevo de
-- Postgres (docker-entrypoint-initdb.d). auth-service y core-service ya no
-- comparten una sola base de datos (ver docs/base/modelo2.txt): cada uno
-- tiene su propio schema.prisma y su propia base.
CREATE DATABASE gestor_redes_auth;
CREATE DATABASE gestor_redes_core;
