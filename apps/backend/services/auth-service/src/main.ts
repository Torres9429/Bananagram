import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // .well-known/jwks.json queda fuera del prefijo 'api': es una ruta estándar
  // que se espera en la raíz del origen, y core-service/alexa-service/gateway
  // la consultan directo por HTTP (nunca a través del proxy del gateway).
  // /health también queda fuera — mismo criterio que el /health del gateway
  // (src/health/health.controller.ts): lo consultan herramientas de infra
  // (Docker healthcheck), no un cliente de la API real.
  app.setGlobalPrefix('api', {
    exclude: [
      { path: '.well-known/jwks.json', method: RequestMethod.GET },
      { path: 'health', method: RequestMethod.GET },
    ],
  });

  const config = new DocumentBuilder()
    .setTitle('auth-service')
    .setDescription('Autenticación, usuarios, roles y privilegios')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  // Documentación en 3 superficies sobre el mismo documento OpenAPI:
  // - /api        Swagger UI clásico + /api-json, /api-yaml (para Postman/Apidog)
  // - /docs       Scalar (UI principal) — ver ControlAcceso, mismo patrón
  // 'api' aquí es un mount point literal, no el prefijo global de los
  // controllers — SwaggerModule.setup() no hereda ese prefijo solo, así
  // que no hay colisión con las rutas reales bajo /api/*.
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.use('/docs', apiReference({ content: document }));

  await app.listen(3001);
  console.log(`🚀 auth-service corriendo en puerto 3001`);
}
bootstrap();
