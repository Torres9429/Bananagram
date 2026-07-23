import { prisma as authPrisma } from '../../services/auth-service/src/prisma/client';
import { prisma as corePrisma } from '../../services/core-service/src/prisma/client';

// auth-service y core-service ya no comparten base de datos (ver
// docs/base/modelo2.txt) — hay que limpiar cada una por separado.
export async function cleanDatabase() {
  // core-service — orden por dependencias FK
  await corePrisma.auditLog.deleteMany();
  await corePrisma.postMetric.deleteMany();
  await corePrisma.postSocialAccount.deleteMany();
  await corePrisma.postStatusHistory.deleteMany();
  await corePrisma.postMedia.deleteMany();
  await corePrisma.post.deleteMany();
  await corePrisma.contentIdea.deleteMany();
  await corePrisma.campaignDesigner.deleteMany();
  await corePrisma.campaignCategory.deleteMany();
  await corePrisma.campaign.deleteMany();
  await corePrisma.media.deleteMany();
  await corePrisma.socialAccount.deleteMany();
  await corePrisma.brand.deleteMany();

  // auth-service
  await authPrisma.notification.deleteMany();
  await authPrisma.auditLog.deleteMany();
  await authPrisma.passwordResetToken.deleteMany();
  await authPrisma.refreshToken.deleteMany();
  await authPrisma.user.deleteMany();
}
