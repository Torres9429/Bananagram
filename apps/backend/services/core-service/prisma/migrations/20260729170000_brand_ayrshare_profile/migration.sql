ALTER TABLE "brands" RENAME COLUMN "ayrshareProfileKey" TO "profileKey";
ALTER TABLE "brands" ADD COLUMN "refId" TEXT;
ALTER INDEX "brands_ayrshareProfileKey_key" RENAME TO "brands_profileKey_key";
CREATE UNIQUE INDEX "brands_refId_key" ON "brands"("refId");
