/*
  Warnings:

  - You are about to drop the column `categoryId` on the `brands` table. All the data in the column will be lost.
  - You are about to drop the column `uploadedBy` on the `media` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "brands" DROP CONSTRAINT "brands_categoryId_fkey";

-- AlterTable
ALTER TABLE "brands" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "media" DROP COLUMN "uploadedBy";
