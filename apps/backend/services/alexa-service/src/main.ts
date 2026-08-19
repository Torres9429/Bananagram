import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // /health fuera del prefijo 'api' — mismo criterio que el /health del
  // gateway y de auth-service (ver sus main.ts): lo consultan herramientas
  // de infra (Docker healthcheck), no un cliente de la API real.
  app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] });

  const config = new DocumentBuilder()
    .setTitle('alexa-service')
    .setDescription(
      'Consumidor de API para la Alexa Skill: traduce intents de voz a llamadas HTTP contra core-service y auth-service',
    )
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

  await app.listen(3004);
  console.log(`🚀 alexa-service corriendo en puerto 3004`);
}
bootstrap();
