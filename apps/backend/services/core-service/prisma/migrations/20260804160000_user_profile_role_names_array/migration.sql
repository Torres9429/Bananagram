-- Multi-rol: UserProfile.roleName (String?, un solo valor) -> roleNames (String[], @default([]))
-- Backfill: cada valor existente pasa a ser un array de un solo elemento; los NULL pasan a [].
ALTER TABLE "user_profiles" ADD COLUMN "roleNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
UPDATE "user_profiles" SET "roleNames" = ARRAY["roleName"] WHERE "roleName" IS NOT NULL;
ALTER TABLE "user_profiles" DROP COLUMN "roleName";
