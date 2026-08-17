-- CreateTable
CREATE TABLE "social_account_metric_snapshots" (
    "id" TEXT NOT NULL,
    "socialAccountId" TEXT NOT NULL,
    "followers" INTEGER NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'simulated',
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "social_account_metric_snapshots_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "social_account_metric_snapshots" ADD CONSTRAINT "social_account_metric_snapshots_socialAccountId_fkey" FOREIGN KEY ("socialAccountId") REFERENCES "social_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
