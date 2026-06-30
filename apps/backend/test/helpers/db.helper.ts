import { prisma } from '../../commons/prisma/client';
export async function cleanDatabase() {
  // Orden por dependencias FK
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.postMetric.deleteMany();
  await prisma.postStatusHistory.deleteMany();
  await prisma.post.deleteMany();
  await prisma.campaignTeam.deleteMany();
  await prisma.campaign.deleteMany();
  await prisma.brandProfile.deleteMany();
  await prisma.brandUser.deleteMany();
  await prisma.brand.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
}
