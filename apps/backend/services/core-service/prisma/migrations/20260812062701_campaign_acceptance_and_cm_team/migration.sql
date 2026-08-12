-- CreateEnum
CREATE TYPE "CmAssignmentStatus" AS ENUM ('pendiente', 'aceptada', 'rechazada');

-- AlterTable
ALTER TABLE "campaigns" ADD COLUMN     "cmRejectionReason" TEXT,
ADD COLUMN     "cmRespondedAt" TIMESTAMP(3),
ADD COLUMN     "cmStatus" "CmAssignmentStatus" NOT NULL DEFAULT 'pendiente';

-- CreateTable
CREATE TABLE "cm_team_members" (
    "cmUserId" TEXT NOT NULL,
    "designerUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cm_team_members_pkey" PRIMARY KEY ("cmUserId","designerUserId")
);
