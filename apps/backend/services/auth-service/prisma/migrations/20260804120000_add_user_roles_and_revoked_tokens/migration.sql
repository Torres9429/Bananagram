-- Multi-rol: reemplaza users.roleId (FK escalar, un solo rol) por una tabla
-- puente user_roles (N:M) — ver Role.users/User.roles en schema.prisma.
CREATE TABLE "user_roles" (
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("userId","roleId")
);
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill: cada usuario existente conserva su único rol de antes, ahora como
-- la primera fila de user_roles.
INSERT INTO "user_roles" ("userId", "roleId") SELECT "id", "roleId" FROM "users";

-- users.roleId deja de existir — el rol de un usuario ya solo vive en user_roles.
ALTER TABLE "users" DROP CONSTRAINT "users_roleId_fkey";
ALTER TABLE "users" DROP COLUMN "roleId";

-- Respaldo en Postgres de la denylist de access tokens revocados por logout
-- (ver RevokedAccessToken en schema.prisma / TokenDenylistService). El hot
-- path de cada request consulta Redis; esta tabla es el fallback si Redis cae.
CREATE TABLE "revoked_access_tokens" (
    "jti" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "revoked_access_tokens_pkey" PRIMARY KEY ("jti")
);
