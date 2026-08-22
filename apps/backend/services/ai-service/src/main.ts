import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  // useBodyParser (abajo) solo existe en NestExpressApplication — mismo
  // patrón que apps/backend/gateway/src/main.ts.
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // Default de Nest/Express para el body parser JSON es 100kb — muy por
  // debajo de lo que SuggestCaptionDto.images ya declara soportar (hasta 3
  // imágenes en base64, ~6MB cada una — subido de ~3MB el 2026-08-19 tras
  // confirmar que una foto real de un usuario superaba ese límite, ver
  // suggest-caption.dto.ts). Sin esto, cualquier imagen adjunta desde
  // /posts/new tiraba "request entity too large" antes de que la validación
  // del DTO llegara a correr. 28mb da margen sobre el máximo teórico real
  // (3 × 8_000_000 caracteres ≈ 24MB + overhead de JSON).
  app.useBodyParser('json', { limit: '28mb' });
  // PayloadTooLargeFilter se registra en app.module.ts (APP_FILTER), no acá
  // — extiende BaseExceptionFilter, que necesita HttpAdapterHost inyectado
  // por Nest para su fallback (super.catch()). new PayloadTooLargeFilter() +
  // useGlobalFilters() lo deja sin inyectar (bypassa el contenedor de DI) y
  // el fallback revienta con cualquier excepción normal — confirmado en vivo.
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  // /health fuera del prefijo 'api' — mismo criterio que el resto de los
  // servicios (ver sus main.ts): lo consultan herramientas de infra, no un
  // cliente de la API real.
  app.setGlobalPrefix('api', { exclude: [{ path: 'health', method: RequestMethod.GET }] });

  const config = new DocumentBuilder()
    .setTitle('ai-service')
    .setDescription('Único punto de contacto del backend con OpenRouter — genera ideas, analiza y mejora publicaciones')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  app.use('/docs', apiReference({ content: document }));

  await app.listen(3005);
  console.log(`🚀 ai-service corriendo en puerto 3005`);
}
bootstrap();
