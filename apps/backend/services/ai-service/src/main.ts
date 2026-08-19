import { NestFactory } from '@nestjs/core';
import { RequestMethod, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
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
