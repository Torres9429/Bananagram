import { prisma as authPrisma } from '../../services/auth-service/src/prisma/client';
import { prisma as corePrisma } from '../../services/core-service/src/prisma/client';

// auth-service y core-service ya no comparten base de datos (ver
// docs/base/modelo2.txt) — hay que limpiar cada una por separado.
//
// ADVERTENCIA (no hay BD de test separada — DATABASE_URL_AUTH/CORE apuntan a
// la misma Postgres que usa `pnpm dev`): esta función ya borraba TODOS los
// usuarios/marcas/campañas desde antes de esta nota, no solo lo que se
// agregó ahora — correr el test suite después de sembrar datos reales
// (marca/campaña/cuenta social conectada de verdad) los destruye. Hay que
// volver a correr `pnpm seed` (y rehacer cualquier dato manual) después de
// cada corrida del test suite.
export async function cleanDatabase() {
  // core-service — orden por dependencias FK
  await corePrisma.auditLog.deleteMany();
  await corePrisma.providerRequestLog.deleteMany();
  await corePrisma.metricSyncRun.deleteMany();
  await corePrisma.postMetric.deleteMany();
  await corePrisma.postSocialAccount.deleteMany();
  await corePrisma.postSocialNetwork.deleteMany();
  await corePrisma.postStatusHistory.deleteMany();
  await corePrisma.postMedia.deleteMany();
  await corePrisma.post.deleteMany();
  await corePrisma.contentIdea.deleteMany();
  await corePrisma.campaignDesigner.deleteMany();
  await corePrisma.campaignCategory.deleteMany();
  await corePrisma.campaign.deleteMany();
  await corePrisma.media.deleteMany();
  // Agregado 2026-08-19 (feature de métricas de cuenta): socialAccount.
  // deleteMany() de abajo rompía por FK contra esta tabla, nunca actualizada
  // acá cuando se agregó el modelo — bloqueaba el test suite entero.
  await corePrisma.socialAccountMetricSnapshot.deleteMany();
  await corePrisma.socialAccount.deleteMany();
  // Mismo gap que socialAccountMetricSnapshot arriba — brandScore/report
  // nunca se agregaron acá, rompían brand.deleteMany() por FK en cuanto
  // algún spec o uso real generaba una fila en cualquiera de las 2.
  await corePrisma.brandScore.deleteMany();
  await corePrisma.report.deleteMany();
  await corePrisma.brand.deleteMany();
  // UserProfileCategory/Specialty antes que UserProfile (FK) — antes de esta
  // fase se quedaban huérfanas cada vez que cleanDatabase() borraba el User
  // de auth-service pero nunca su UserProfile correspondiente en
  // core-service, acumulando duplicados cada ciclo test-wipe + reseed.
  await corePrisma.userProfileCategory.deleteMany();
  await corePrisma.userProfileSpecialty.deleteMany();
  await corePrisma.userProfile.deleteMany();
  // Catálogo de redes sociales: varios specs crean SocialNetwork de prueba
  // con códigos aleatorios (posts-flow, campaign-metrics-flow) y nunca los
  // limpiaban — contaminaban el catálogo real que ve el Administrador.
  await corePrisma.socialNetwork.deleteMany();

  // auth-service
  await authPrisma.notification.deleteMany();
  await authPrisma.auditLog.deleteMany();
  await authPrisma.accountLinkCode.deleteMany();
  await authPrisma.passwordResetToken.deleteMany();
  await authPrisma.refreshToken.deleteMany();
  await authPrisma.user.deleteMany();
}
