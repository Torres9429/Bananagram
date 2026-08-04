/*
  Warnings:

  - Made the column `campaignId` on table `posts` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "posts" DROP CONSTRAINT "posts_campaignId_fkey";

-- AlterTable
ALTER TABLE "posts" ADD COLUMN     "instructions" TEXT,
ALTER COLUMN "campaignId" SET NOT NULL;

-- CreateTable
CREATE TABLE "post_social_networks" (
    "postId" TEXT NOT NULL,
    "socialNetworkId" TEXT NOT NULL,

    CONSTRAINT "post_social_networks_pkey" PRIMARY KEY ("postId","socialNetworkId")
);

-- AddForeignKey
ALTER TABLE "posts" ADD CONSTRAINT "posts_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "campaigns"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_social_networks" ADD CONSTRAINT "post_social_networks_postId_fkey" FOREIGN KEY ("postId") REFERENCES "posts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "post_social_networks" ADD CONSTRAINT "post_social_networks_socialNetworkId_fkey" FOREIGN KEY ("socialNetworkId") REFERENCES "social_networks"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
