import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.setGlobalPrefix('api');

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
