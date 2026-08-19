import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { AppModule } from './app.module';
import { RateLimitMiddleware } from './rate-limit/rate-limit.middleware';
import { JwtEdgeMiddleware } from './auth/jwt-edge.middleware';
import { CorrelationIdMiddleware } from './middleware/correlation-id.middleware';

async function bootstrap() {
  // bodyParser: false — este servicio es un proxy puro. Si Nest parseara el
  // body antes de llegar al proxy, el stream del request ya estaría
  // consumido y http-proxy-middleware no podría reenviarlo al servicio
  // destino (POST/PATCH llegarían con body vacío).
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  app.enableCors();

  // Solo cuando hay un proxy/LB propio delante que escriba X-Forwarded-For
  // (nunca confiar en ese header si viene directo del cliente, que puede
  // falsear su IP y saltarse el rate-limit — ver rate-limit.middleware.ts).
  if (process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  // Montaje manual (NO vía AppModule.configure()/MiddlewareConsumer) — esto
  // importa por el orden real de la cadena de Express, no solo por el orden
  // en que se "declaran" en Nest:
  //   1) nuestros middlewares (rate-limit, jwt-edge, correlation-id)
  //   2) los proxies hacia auth-service/core-service
  //   3) recién ahí Nest arma su propio router de controllers + su 404
  //      catch-all, como parte de app.init() (invocado implícito dentro de
  //      app.listen(), al final)
  // Si el 404 catch-all de Nest queda ANTES que los proxies en la cadena
  // (p. ej. llamando a app.init() antes de montar los app.use(proxy...)),
  // absorbe la respuesta de cualquier ruta que no sea /health y los proxies
  // nunca se alcanzan — confirmado en vivo (todas las rutas /api/* daban
  // "Cannot POST ..." de Nest en vez de llegar al servicio real). Por eso
  // acá se resuelven las instancias directo del contenedor de DI
  // (ya están listas después de NestFactory.create(), no hace falta init())
  // y se montan con app.use() antes que nada más.
  const rateLimit = app.get(RateLimitMiddleware);
  const jwtEdge = app.get(JwtEdgeMiddleware);
  const correlationId = app.get(CorrelationIdMiddleware);
  app.use((req: any, res: any, next: any) => rateLimit.use(req, res, next));
  app.use((req: any, res: any, next: any) => jwtEdge.use(req, res, next));
  app.use((req: any, res: any, next: any) => correlationId.use(req, res, next));

  const authServiceUrl = process.env.AUTH_SERVICE_URL || 'http://localhost:3001';
  const coreServiceUrl = process.env.CORE_SERVICE_URL || 'http://localhost:3002';
  const alexaServiceUrl = process.env.ALEXA_SERVICE_URL || 'http://localhost:3004';
  const aiServiceUrl = process.env.AI_SERVICE_URL || 'http://localhost:3005';

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
  // Prefijo propio (no /api/me/*, que ya está tomado por auth-service arriba)
  // — equipo GENERAL de un CM, vive en core-service (Fase J).
  app.use(
    createProxyMiddleware({ pathFilter: '/api/cm-team', target: coreServiceUrl, changeOrigin: true }),
  );
  app.use(createProxyMiddleware({ pathFilter: '/api/posts', target: coreServiceUrl, changeOrigin: true }));
  app.use(
    createProxyMiddleware({ pathFilter: '/api/reports', target: coreServiceUrl, changeOrigin: true }),
  );
  // /api/ideas ya NO es core-service — el dominio de ideas se mudó entero a
  // alexa-service (acceso directo a la misma BD física, ver
  // docs/todos/2026-08-10-ayrshare-pipeline-alexa-endpoints-plan.md Fase 6).
  // Mismo prefijo de URL para el cliente (web o Lambda), dueño distinto detrás.
  // No se agrega un proxy /api/alexa: alexa-service expone /campaigns e
  // /ideas bajo el mismo prefijo 'api' que core-service (ver alexa-service
  // src/main.ts), y /api/campaigns ya está tomado por core-service arriba —
  // agregar /api/alexa sin re-mapear las rutas de alexa-service no
  // apuntaría a nada real. El Lambda llama a alexa-service directo
  // (puerto 3004, no proxeado hoy) para campañas/métricas; solo /api/ideas
  // cambia de dueño porque ese prefijo no colisiona con nada más.
  app.use(
    createProxyMiddleware({ pathFilter: '/api/ideas', target: alexaServiceUrl, changeOrigin: true }),
  );
  // AI Service — único punto del backend que habla con OpenRouter. El
  // frontend nunca lo llama directo, solo vía este proxy (mismo patrón que
  // el resto de las entradas de esta tabla).
  app.use(createProxyMiddleware({ pathFilter: '/api/ai', target: aiServiceUrl, changeOrigin: true }));

  await app.listen(4000);
  console.log('🚀 API Gateway corriendo en puerto 4000');
}
bootstrap();
