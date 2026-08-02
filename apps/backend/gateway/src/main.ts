import { NestFactory } from '@nestjs/core';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';

async function bootstrap() {
  // bodyParser: false — este servicio es un proxy puro. Si Nest parseara el
  // body antes de llegar al proxy, el stream del request ya estaría
  // consumido y http-proxy-middleware no podría reenviarlo al servicio
  // destino (POST/PATCH llegarían con body vacío).
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.enableCors();

  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';

  // Montados sin path en app.use() a propósito: si se pasa un path como
  // primer argumento (app.use('/api/auth', middleware)), Express recorta
  // ese prefijo de req.url antes de pasarlo al middleware — el proxy
  // reenviaría /login en vez de /api/auth/login al servicio destino.
  // pathFilter hace el match sobre la URL completa sin tocarla.
  app.use(
    createProxyMiddleware({ pathFilter: '/api/auth', target: authServiceUrl, changeOrigin: true }),
  );
  app.use(createProxyMiddleware({ pathFilter: '/api/me', target: authServiceUrl, changeOrigin: true }));
  app.use(
    createProxyMiddleware({ pathFilter: '/api/admin', target: authServiceUrl, changeOrigin: true }),
  );
  app.use(
    createProxyMiddleware({ pathFilter: '/api/catalogs', target: coreServiceUrl, changeOrigin: true }),
  );
  app.use(
    createProxyMiddleware({ pathFilter: '/api/brands', target: coreServiceUrl, changeOrigin: true }),
  );
  app.use(
    createProxyMiddleware({ pathFilter: '/api/campaigns', target: coreServiceUrl, changeOrigin: true }),
  );
  app.use(createProxyMiddleware({ pathFilter: '/api/posts', target: coreServiceUrl, changeOrigin: true }));
  app.use(
    createProxyMiddleware({ pathFilter: '/api/reports', target: coreServiceUrl, changeOrigin: true }),
  );
  app.use(
    createProxyMiddleware({ pathFilter: '/api/ideas', target: coreServiceUrl, changeOrigin: true }),
  );

  await app.listen(4000);
  console.log('🚀 API Gateway corriendo en puerto 4000');
}
bootstrap();
