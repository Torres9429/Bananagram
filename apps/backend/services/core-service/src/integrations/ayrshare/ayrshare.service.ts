import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createCircuitBreaker } from '@repo/backend-commons';
import { prisma } from '../../prisma/client';
import { getAyrshareConfig, getAyrshareErrorMessage } from '../../brands/ayrshare.util';
import { computeEngagement } from './engagement.util';
import { getMapperForNetwork } from './mappers/mapper.registry';
import { getAccountMapperForNetwork } from './mappers/account-metrics-mapper.registry';
import {
  AccountMetrics,
  AnalyticsContext,
  NormalizedAnalytics,
  PublishResultItem,
  PublishTarget,
  SocialProvider,
} from './social-provider.interface';

type AyrsharePublishResult = {
  status: string;
  id?: string;
  platform: string;
  postUrl?: string;
  errors?: { message?: string }[];
};

// Forma real confirmada en vivo (Fase P1) contra POST /post: tanto los
// resultados por red (éxito) como el detalle del error (fallo) vienen
// anidados en payload.posts[0], no en la raíz como se asumió originalmente
// — payload.postIds/payload.message/payload.code en la raíz no existen en
// ninguno de los dos casos. Con la forma vieja, resultsByPlatform quedaba
// siempre vacío y todo se marcaba 'error' aunque Ayrshare hubiera publicado
// de verdad (confirmado: el post apareció en Instagram real mientras
// nuestro backend lo reportaba como fallido), y los errores reales (p.ej.
// "Media Error") se perdían detrás de un mensaje genérico.
type AyrsharePublishResponse = {
  status: 'success' | 'error';
  id?: string;
  code?: number;
  message?: string;
  posts?: {
    id?: string;
    status?: string;
    postIds?: AyrsharePublishResult[];
    errors?: { code?: number; message?: string }[];
  }[];
};

// Forma confirmada en vivo (ya usada por social-accounts.service.ts): los
// datos vienen anidados en payload[code].analytics, no en la raíz.
// IMPORTANTE (verificado en vivo 2026-08-17 contra las 3 redes conectadas):
// el shape REAL de `analytics` es distinto por red — Instagram usa
// followersCount/likeCount/commentsCount/shareCount/viewsCount/reachCount,
// pero TikTok usa followerCount (sin 's')/likeCountTotal/commentCountTotal/
// shareCountTotal/viewCountTotal y NO expone reach de cuenta; Facebook solo
// expone followersCount, el resto no tiene equivalente limpio. Por eso
// `analytics` se tipa como `Record<string, unknown>` genérico — el mapeo a
// campos concretos vive en account-metrics-mapper.registry.ts (uno por red),
// no aquí. audienceGenderAge/audienceCountry confirmados contra la doc
// oficial + una llamada real (con `quarters` en el body, sin eso Ayrshare ni
// intenta calcularlos) — en Instagram salieron ausentes porque exige ≥100
// interacciones en 30 días para liberarlos; en TikTok vienen en un shape de
// array (audienceAges/audienceCountries), no como Record — no mapeado
// todavía, queda pendiente como hallazgo aparte.
type AyrshareAccountAnalyticsResponse = Record<
  string,
  {
    analytics?: Record<string, unknown> & {
      audienceGenderAge?: Record<string, number>;
      audienceCountry?: Record<string, number>;
    };
  } | undefined
>;

type AyrshareAnalyticsResponse = Record<string, Record<string, unknown>> | { status: 'error'; code?: number; message?: string };

// Forma real confirmada en vivo (2026-08-19) contra GET /history/facebook —
// soporte de Ayrshare confirmó que no existe un endpoint que devuelva
// directamente el total de publicaciones de una página de Facebook; la forma
// real es traer el historial y contar/sumar nosotros mismos.
type AyrshareHistoryPost = {
  likeCount?: number;
  commentsCount?: number;
  sharesCount?: number;
  mediaView?: number;
};
type AyrshareHistoryResponse = {
  status?: string;
  posts?: AyrshareHistoryPost[];
};

// Primer consumidor real de createCircuitBreaker() (commons/circuit-breaker) —
// hasta esta fase, ese factory existía sin ningún caller. Reintentos con
// backoff quedan fuera del breaker a propósito (auditoría §5: el breaker
// cuenta fallos, reintentar dentro de él distorsiona errorThresholdPercentage).
@Injectable()
export class AyrshareService implements SocialProvider {
  async publish(profileKey: string, postId: string, content: string, targets: PublishTarget[], mediaUrls?: string[]): Promise<PublishResultItem[]> {
    const { apiKey, baseUrl } = getAyrshareConfig();
    const requestId = randomUUID();
    const startedAt = Date.now();

    // IMPORTANTE (hallazgo en vivo, 2026-08-18, mismo patrón encontrado y
    // corregido primero en ai-service/openrouter.client.ts): fetch()
    // resuelve en cuanto llegan los headers, no cuando termina de bajar el
    // body — envolver solo el fetch en el breaker (como hacía esta función
    // antes) deja el response.json() posterior SIN protección de timeout
    // real. Un post quedó marcado 'error' a los 60.0s exactos mientras
    // Ayrshare seguía procesando la publicación real en segundo plano
    // (opossum no cancela el fetch subyacente al hacer timeout, solo deja
    // de esperar de nuestro lado). Por eso fetch+json van juntos dentro de
    // la misma acción del breaker: el timeout de 60s cubre el round-trip
    // completo, no solo la conexión inicial.
    const breaker = createCircuitBreaker(
      async () => {
        const response = await fetch(`${baseUrl}/post`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Profile-Key': profileKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            post: content,
            platforms: targets.map((target) => target.networkCode),
            ...(mediaUrls?.length ? { mediaUrls } : {}),
          }),
        });
        const payload = (await response.json()) as AyrsharePublishResponse;
        return { status: response.status, ok: response.ok, payload };
      },
      // Hallazgo real de Fase P1: el timeout default del breaker (5s,
      // opossum.factory.ts) corta la llamada antes de que Ayrshare termine
      // de procesar/subir la media a Instagram. 30s tampoco alcanzó de
      // forma consistente en pruebas en vivo contra la cuenta trial — 60s
      // deja margen real. opossum NO cancela el fetch subyacente al hacer
      // timeout (no hay AbortController aquí), así que esto solo evita
      // que NOSOTROS abandonemos antes de que Ayrshare responda, no reduce
      // la latencia real del lado de Ayrshare.
      { timeout: 60000 },
    );

    let result: { status: number; ok: boolean; payload: AyrsharePublishResponse };
    try {
      result = (await breaker.fire()) as { status: number; ok: boolean; payload: AyrsharePublishResponse };
    } catch (error) {
      await this.logRequest({ operation: 'publish', entityType: 'post', entityId: postId, requestId, succeeded: false, durationMs: Date.now() - startedAt });
      throw new InternalServerErrorException('No se pudo contactar a Ayrshare para publicar');
    }

    await this.logRequest({
      operation: 'publish',
      entityType: 'post',
      entityId: postId,
      requestId,
      httpStatus: result.status,
      succeeded: result.ok && result.payload.status === 'success',
      durationMs: Date.now() - startedAt,
    });

    if (!result.ok || result.payload.status !== 'success') {
      const nestedError = result.payload.posts?.[0]?.errors?.[0];
      throw new InternalServerErrorException(
        getAyrshareErrorMessage(nestedError ?? result.payload, 'No se pudo publicar en Ayrshare'),
      );
    }

    // El id que exige /analytics/post es el "top level id" de Ayrshare
    // (payload.posts[0].id), NO el id nativo por red que trae cada entrada
    // de postIds[] (ese es el id de Instagram/Facebook/etc., útil para
    // trazabilidad pero Ayrshare lo rechaza con 404 si se lo mandas a
    // analíticas — confirmado en vivo, Fase P1, mensaje de error de
    // Ayrshare: "verify the top level ID returned from the /post endpoint").
    const ayrshareId = result.payload.posts?.[0]?.id;
    const postIds = result.payload.posts?.flatMap((entry) => entry.postIds ?? []) ?? [];
    const resultsByPlatform = new Map(postIds.map((item) => [item.platform, item]));
    return targets.map((target) => {
      const found = resultsByPlatform.get(target.networkCode);
      if (!found || found.status !== 'success') {
        return {
          socialAccountId: target.socialAccountId,
          status: 'error',
          providerStatus: found?.status,
          errorMessage: found?.errors?.[0]?.message,
        };
      }
      return {
        socialAccountId: target.socialAccountId,
        status: 'publicado',
        socialPostId: ayrshareId,
        postUrl: found.postUrl,
        providerStatus: found.status,
      };
    });
  }

  async getAnalytics(profileKey: string, socialPostId: string, context: AnalyticsContext): Promise<NormalizedAnalytics> {
    const { apiKey, baseUrl } = getAyrshareConfig();
    const requestId = randomUUID();
    const startedAt = Date.now();

    // Ver comentario en publish(): fetch+json van juntos dentro de la
    // acción del breaker para que el timeout cubra el round-trip completo,
    // no solo la conexión inicial.
    const breaker = createCircuitBreaker(async () => {
      const response = await fetch(`${baseUrl}/analytics/post`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Profile-Key': profileKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: socialPostId }),
      });
      const payload = (await response.json()) as AyrshareAnalyticsResponse;
      return { status: response.status, ok: response.ok, payload };
    });

    let result: { status: number; ok: boolean; payload: AyrshareAnalyticsResponse };
    try {
      result = (await breaker.fire()) as { status: number; ok: boolean; payload: AyrshareAnalyticsResponse };
    } catch (error) {
      await this.logRequest({
        operation: 'analytics',
        entityType: 'socialAccount',
        entityId: context.socialAccountId,
        requestId,
        succeeded: false,
        durationMs: Date.now() - startedAt,
      });
      throw new InternalServerErrorException('No se pudo contactar a Ayrshare para pedir analíticas');
    }

    const succeeded = result.ok && !('status' in result.payload && result.payload.status === 'error');
    await this.logRequest({
      operation: 'analytics',
      entityType: 'socialAccount',
      entityId: context.socialAccountId,
      requestId,
      httpStatus: result.status,
      succeeded,
      durationMs: Date.now() - startedAt,
    });

    if (!succeeded) {
      throw new InternalServerErrorException(
        getAyrshareErrorMessage(result.payload as { message?: string; code?: number }, 'No se pudieron obtener analíticas de Ayrshare'),
      );
    }

    const rawForNetwork = (result.payload as Record<string, Record<string, unknown>>)[context.networkCode] ?? {};
    // Forma real confirmada en vivo (Fase P1): los campos que esperan los
    // mappers (likeCount, reachCount, etc.) NO están al nivel de
    // rawForNetwork — vienen un nivel más adentro, en rawForNetwork.analytics.
    // Con la lectura vieja el mapper siempre recibía {} y todo salía null,
    // aunque `raw` ya guardara el payload real completo (comentario
    // engañoso: parecía que sí había datos porque raw sí los tenía).
    const analyticsPayload = (rawForNetwork.analytics as Record<string, unknown> | undefined) ?? rawForNetwork;
    const mapper = getMapperForNetwork(context.networkCode);
    const mapped = mapper(analyticsPayload);
    const { engagement, engagementBase } = computeEngagement(mapped);

    return { ...mapped, engagement, engagementBase, raw: rawForNetwork, source: 'ayrshare' };
  }

  // Mismo endpoint y forma de respuesta que ya usaba
  // social-accounts.service.ts.fetchFollowerCounts() (confirmado en vivo:
  // payload[code].analytics.followersCount, un nivel más anidado de lo que
  // parecía) — promovido al contrato SocialProvider para que
  // account-metrics-cron.service.ts también pueda usarlo, no solo el sync
  // manual. Nunca lanza: si Ayrshare falla, followers vuelve null (nunca 0),
  // el caller decide si vale la pena guardar un snapshot con null.
  async getAccountMetrics(profileKey: string, networkCode: string): Promise<AccountMetrics> {
    const { apiKey, baseUrl } = getAyrshareConfig();
    const requestId = randomUUID();
    const startedAt = Date.now();
    const empty: AccountMetrics = {
      followers: null,
      likes: null,
      comments: null,
      shares: null,
      views: null,
      reach: null,
      posts: null,
      audienceGenderAge: null,
      audienceCountry: null,
      source: 'ayrshare',
    };

    let result: { status: number; ok: boolean; payload: AyrshareAccountAnalyticsResponse };
    try {
      // Ver comentario en publish(): fetch+json van juntos dentro de la
      // acción del breaker para que el timeout cubra el round-trip
      // completo, no solo la conexión inicial.
      const breaker = createCircuitBreaker(async () => {
        const response = await fetch(`${baseUrl}/analytics/social`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Profile-Key': profileKey,
            'Content-Type': 'application/json',
          },
          // quarters: sin esto Ayrshare ni intenta calcular
          // audienceGenderAge/audienceCountry (confirmado en vivo — la
          // llamada sin quarters devuelve exactamente los mismos campos que
          // con él si la cuenta no califica, pero SIN quarters nunca los
          // devolvería aunque calificara).
          body: JSON.stringify({ platforms: [networkCode], quarters: 1 }),
        });
        const payload = (await response.json().catch(() => ({}))) as AyrshareAccountAnalyticsResponse;
        return { status: response.status, ok: response.ok, payload };
      });
      result = (await breaker.fire()) as { status: number; ok: boolean; payload: AyrshareAccountAnalyticsResponse };
    } catch (error) {
      await this.logRequest({
        operation: 'account-metrics',
        entityType: 'socialAccount',
        entityId: `${profileKey}:${networkCode}`,
        requestId,
        succeeded: false,
        durationMs: Date.now() - startedAt,
      });
      return empty;
    }

    await this.logRequest({
      operation: 'account-metrics',
      entityType: 'socialAccount',
      entityId: `${profileKey}:${networkCode}`,
      requestId,
      httpStatus: result.status,
      succeeded: result.ok,
      durationMs: Date.now() - startedAt,
    });

    if (!result.ok) {
      return empty;
    }

    const analytics = result.payload[networkCode]?.analytics;
    // Objeto vacío se normaliza a null también — mismo criterio "0/{} no es
    // lo mismo que no disponible" del resto del sistema.
    const toNullableRecord = (value: Record<string, number> | undefined) =>
      value && Object.keys(value).length > 0 ? value : null;

    if (!analytics) {
      return empty;
    }

    const mapper = getAccountMapperForNetwork(networkCode);
    const mapped = mapper(analytics);

    // Facebook-específico (2026-08-19): /analytics/social acota por
    // `quarters` (ver body del fetch de arriba) — para Facebook eso deja
    // `reactions`/`pageMediaView` casi en 0 cuando las publicaciones reales
    // son más viejas que esa ventana (confirmado en vivo: reactions.total=0
    // ahí mismo, mientras /history/facebook mostró 33 posts reales con 189
    // likes/3 comments/47 shares acumulados desde 2023 — Instagram/TikTok no
    // tienen este problema porque sus campos de posts/likes ya son acumulados
    // de toda la cuenta, no acotados por `quarters`). Se enriquece con el
    // historial completo de posts (fuente única y coherente para Facebook:
    // todo all-time, no se mezcla con datos acotados por ventana) — si esa
    // llamada falla, se degrada de vuelta a `mapped` (fetchFacebookHistorySummary
    // nunca lanza).
    const enriched =
      networkCode === 'facebook'
        ? { ...mapped, ...(await this.fetchFacebookHistorySummary(profileKey)) }
        : mapped;

    return {
      ...enriched,
      audienceGenderAge: toNullableRecord(analytics.audienceGenderAge),
      audienceCountry: toNullableRecord(analytics.audienceCountry),
      source: 'ayrshare',
    };
  }

  // Ver comentario en getAccountMetrics() — único consumidor. Nunca lanza:
  // si Ayrshare falla o cambia de forma, mapped (el baseline de
  // /analytics/social) se usa tal cual, mismo criterio "null > excepción"
  // del resto de este archivo.
  private async fetchFacebookHistorySummary(
    profileKey: string,
  ): Promise<Pick<AccountMetrics, 'posts' | 'likes' | 'comments' | 'shares' | 'views'>> {
    const { apiKey, baseUrl } = getAyrshareConfig();
    const empty = { posts: null, likes: null, comments: null, shares: null, views: null };
    try {
      const breaker = createCircuitBreaker(async () => {
        const response = await fetch(`${baseUrl}/history/facebook?limit=500`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${apiKey}`, 'Profile-Key': profileKey },
        });
        const payload = (await response.json().catch(() => ({}))) as AyrshareHistoryResponse;
        return { ok: response.ok, payload };
      });
      const result = (await breaker.fire()) as { ok: boolean; payload: AyrshareHistoryResponse };
      if (!result.ok || result.payload.status !== 'success' || !result.payload.posts) {
        return empty;
      }
      // Sin paginación a propósito: 500 es el límite máximo por request de
      // Ayrshare y alcanza para el volumen real de este proyecto — si una
      // cuenta superara 500 publicaciones históricas esto subcontaría en vez
      // de paginar, limitación conocida y documentada, no resuelta con un
      // loop todavía (auditoría de métricas, no sobreingeniería para un caso
      // que no existe hoy en ninguna cuenta real conectada).
      const posts = result.payload.posts;
      return {
        posts: posts.length,
        likes: posts.reduce((sum, p) => sum + (p.likeCount ?? 0), 0),
        comments: posts.reduce((sum, p) => sum + (p.commentsCount ?? 0), 0),
        shares: posts.reduce((sum, p) => sum + (p.sharesCount ?? 0), 0),
        views: posts.reduce((sum, p) => sum + (p.mediaView ?? 0), 0),
      };
    } catch {
      return empty;
    }
  }

  // Nunca guarda el body completo de la request/response ni la API key —
  // solo metadatos (auditoría §17).
  private async logRequest(entry: {
    operation: string;
    entityType: string;
    entityId: string;
    requestId: string;
    httpStatus?: number;
    succeeded: boolean;
    durationMs?: number;
  }): Promise<void> {
    await prisma.providerRequestLog.create({
      data: {
        provider: 'ayrshare',
        operation: entry.operation,
        entityType: entry.entityType,
        entityId: entry.entityId,
        requestId: entry.requestId,
        httpStatus: entry.httpStatus,
        succeeded: entry.succeeded,
        durationMs: entry.durationMs,
      },
    });
  }
}
