import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AuditInterceptor, type AuditEntryInput } from '@repo/backend-commons';
import { AppModule } from './app.module';
import { prisma } from './prisma/client';
import { Prisma } from '../node_modules/.prisma-client';

// Json? de Prisma no acepta `null` de JS tal cual en `create` — hay que
// pedir explícitamente Prisma.JsonNull para escribir un null real en la
// columna (a diferencia de omitir la clave, que la deja en su default).
function toJsonInput(value: unknown): Prisma.InputJsonValue | typeof Prisma.JsonNull {
  return value === null || value === undefined ? Prisma.JsonNull : (value as Prisma.InputJsonValue);
}

function writeAuditEntry(entry: AuditEntryInput) {
  return prisma.auditLog
    .create({ data: { ...entry, before: toJsonInput(entry.before), after: toJsonInput(entry.after) } })
    .then(() => undefined);
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // Escribe en el audit_log local de este servicio (BIGINT autoincrement,
  // insert-only) — commons/ no depende de Prisma, así que la función de
  // escritura se inyecta desde acá con el cliente real de este servicio.
  app.useGlobalInterceptors(new AuditInterceptor(writeAuditEntry));
  // /health fuera del prefijo 'api' — mismo criterio que el /health del
  // gateway y de auth-service (ver sus main.ts): lo consultan herramientas
  // de infra (Docker healthcheck), no un cliente de la API real.
  app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] });

  const config = new DocumentBuilder()
    .setTitle('core-service')
    .setDescription('Marcas, campañas, publicaciones, analítica e ideas de contenido')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  // Documentación en 2 superficies sobre el mismo documento OpenAPI:
  // - /api        Swagger UI clásico + /api-json, /api-yaml (para Postman/Apidog)
  // - /docs       Scalar (UI principal) — ver ControlAcceso, mismo patrón
  // 'api' aquí es un mount point literal, no el prefijo global de los
  // controllers — SwaggerModule.setup() no hereda ese prefijo solo, así
  // que no hay colisión con las rutas reales bajo /api/*.
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.use('/docs', apiReference({ content: document }));

  await app.listen(3002);
  console.log(`🚀 core-service corriendo en puerto 3002`);
}
bootstrap();
