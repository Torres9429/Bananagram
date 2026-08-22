-- AlterTable
ALTER TABLE "brands" ADD COLUMN     "timezone" TEXT;

-- AlterTable
ALTER TABLE "post_metrics" ADD COLUMN     "engagementBase" TEXT,
ADD COLUMN     "raw" JSONB,
ADD COLUMN     "source" TEXT NOT NULL DEFAULT 'simulated';

-- AlterTable
ALTER TABLE "post_social_accounts" ADD COLUMN     "errorCode" TEXT,
ADD COLUMN     "lastSyncedAt" TIMESTAMP(3),
ADD COLUMN     "providerScheduledAt" TIMESTAMP(3),
ADD COLUMN     "providerStatus" TEXT,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "submittedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "social_accounts" ADD COLUMN     "disconnectedAt" TIMESTAMP(3),
ADD COLUMN     "lastAuthenticatedAt" TIMESTAMP(3),
ADD COLUMN     "platformAccountId" TEXT;

-- CreateTable
CREATE TABLE "provider_request_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'ayrshare',
    "operation" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "requestId" TEXT,
    "httpStatus" INTEGER,
    "succeeded" BOOLEAN NOT NULL,
    "errorCode" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "provider_request_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "metric_sync_runs" (
    "id" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "itemsProcessed" INTEGER NOT NULL DEFAULT 0,
    "itemsFailed" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL,

    CONSTRAINT "metric_sync_runs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "provider_request_logs_entityType_entityId_idx" ON "provider_request_logs"("entityType", "entityId");
