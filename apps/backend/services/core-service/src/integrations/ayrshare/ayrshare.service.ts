import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createCircuitBreaker } from '@repo/backend-commons';
import { prisma } from '../../prisma/client';
import { getAyrshareConfig, getAyrshareErrorMessage } from '../../brands/ayrshare.util';
import { computeEngagement } from './engagement.util';
import { getMapperForNetwork } from './mappers/mapper.registry';
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
// Forma real confirmada en vivo (Fase Q3) contra POST /analytics/social —
// likeCount/commentsCount/shareCount/viewsCount/reachCount son acumulados de
// toda la cuenta (todas las publicaciones), no de un post. No hay
// "profileVisitsCount" en este endpoint — Ayrshare no lo expone aquí.
// audienceGenderAge/audienceCountry confirmados contra la doc oficial +
// una llamada real (con `quarters` en el body, sin eso Ayrshare ni intenta
// calcularlos) — en esta cuenta salieron ausentes porque Instagram exige
// ≥100 interacciones en 30 días para liberarlos, no por el shape del código.
type AyrshareAccountAnalyticsResponse = Record<
  string,
  {
    analytics?: {
      followersCount?: number;
      followers?: number;
      likeCount?: number;
      commentsCount?: number;
      shareCount?: number;
      viewsCount?: number;
      reachCount?: number;
      audienceGenderAge?: Record<string, number>;
      audienceCountry?: Record<string, number>;
    };
  } | undefined
>;

type AyrshareAnalyticsResponse = Record<string, Record<string, unknown>> | { status: 'error'; code?: number; message?: string };

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

    const breaker = createCircuitBreaker(async () =>
      fetch(`${baseUrl}/post`, {
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
      }),
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

    let response: Response;
    try {
      response = (await breaker.fire()) as Response;
    } catch (error) {
      await this.logRequest({ operation: 'publish', entityType: 'post', entityId: postId, requestId, succeeded: false, durationMs: Date.now() - startedAt });
      throw new InternalServerErrorException('No se pudo contactar a Ayrshare para publicar');
    }

    const payload = (await response.json()) as AyrsharePublishResponse;
    await this.logRequest({
      operation: 'publish',
      entityType: 'post',
      entityId: postId,
      requestId,
      httpStatus: response.status,
      succeeded: response.ok && payload.status === 'success',
      durationMs: Date.now() - startedAt,
    });

    if (!response.ok || payload.status !== 'success') {
      const nestedError = payload.posts?.[0]?.errors?.[0];
      throw new InternalServerErrorException(
        getAyrshareErrorMessage(nestedError ?? payload, 'No se pudo publicar en Ayrshare'),
      );
    }

    // El id que exige /analytics/post es el "top level id" de Ayrshare
    // (payload.posts[0].id), NO el id nativo por red que trae cada entrada
    // de postIds[] (ese es el id de Instagram/Facebook/etc., útil para
    // trazabilidad pero Ayrshare lo rechaza con 404 si se lo mandas a
    // analíticas — confirmado en vivo, Fase P1, mensaje de error de
    // Ayrshare: "verify the top level ID returned from the /post endpoint").
    const ayrshareId = payload.posts?.[0]?.id;
    const postIds = payload.posts?.flatMap((entry) => entry.postIds ?? []) ?? [];
    const resultsByPlatform = new Map(postIds.map((result) => [result.platform, result]));
    return targets.map((target) => {
      const result = resultsByPlatform.get(target.networkCode);
      if (!result || result.status !== 'success') {
        return {
          socialAccountId: target.socialAccountId,
          status: 'error',
          providerStatus: result?.status,
          errorMessage: result?.errors?.[0]?.message,
        };
      }
      return {
        socialAccountId: target.socialAccountId,
        status: 'publicado',
        socialPostId: ayrshareId,
        postUrl: result.postUrl,
        providerStatus: result.status,
      };
    });
  }

  async getAnalytics(profileKey: string, socialPostId: string, context: AnalyticsContext): Promise<NormalizedAnalytics> {
    const { apiKey, baseUrl } = getAyrshareConfig();
    const requestId = randomUUID();
    const startedAt = Date.now();

    const breaker = createCircuitBreaker(async () =>
      fetch(`${baseUrl}/analytics/post`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Profile-Key': profileKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: socialPostId }),
      }),
    );

    let response: Response;
    try {
      response = (await breaker.fire()) as Response;
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

    const payload = (await response.json()) as AyrshareAnalyticsResponse;
    const succeeded = response.ok && !('status' in payload && payload.status === 'error');
    await this.logRequest({
      operation: 'analytics',
      entityType: 'socialAccount',
      entityId: context.socialAccountId,
      requestId,
      httpStatus: response.status,
      succeeded,
      durationMs: Date.now() - startedAt,
    });

    if (!succeeded) {
      throw new InternalServerErrorException(
        getAyrshareErrorMessage(payload as { message?: string; code?: number }, 'No se pudieron obtener analíticas de Ayrshare'),
      );
    }

    const rawForNetwork = (payload as Record<string, Record<string, unknown>>)[context.networkCode] ?? {};
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

    let response: Response;
    try {
      const breaker = createCircuitBreaker(async () =>
        fetch(`${baseUrl}/analytics/social`, {
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
        }),
      );
      response = (await breaker.fire()) as Response;
    } catch (error) {
      await this.logRequest({
        operation: 'account-metrics',
        entityType: 'socialAccount',
        entityId: `${profileKey}:${networkCode}`,
        requestId,
        succeeded: false,
        durationMs: Date.now() - startedAt,
      });
      return { followers: null, likes: null, comments: null, shares: null, views: null, reach: null, audienceGenderAge: null, audienceCountry: null, source: 'ayrshare' };
    }

    const payload = (await response.json().catch(() => ({}))) as AyrshareAccountAnalyticsResponse;
    await this.logRequest({
      operation: 'account-metrics',
      entityType: 'socialAccount',
      entityId: `${profileKey}:${networkCode}`,
      requestId,
      httpStatus: response.status,
      succeeded: response.ok,
      durationMs: Date.now() - startedAt,
    });

    if (!response.ok) {
      return { followers: null, likes: null, comments: null, shares: null, views: null, reach: null, audienceGenderAge: null, audienceCountry: null, source: 'ayrshare' };
    }

    const analytics = payload[networkCode]?.analytics;
    const toNullableNumber = (value: number | undefined) => (typeof value === 'number' && Number.isFinite(value) ? value : null);
    // Objeto vacío se normaliza a null también — mismo criterio "0/{} no es
    // lo mismo que no disponible" del resto del sistema.
    const toNullableRecord = (value: Record<string, number> | undefined) =>
      value && Object.keys(value).length > 0 ? value : null;

    return {
      followers: toNullableNumber(analytics?.followersCount ?? analytics?.followers),
      likes: toNullableNumber(analytics?.likeCount),
      comments: toNullableNumber(analytics?.commentsCount),
      shares: toNullableNumber(analytics?.shareCount),
      views: toNullableNumber(analytics?.viewsCount),
      reach: toNullableNumber(analytics?.reachCount),
      audienceGenderAge: toNullableRecord(analytics?.audienceGenderAge),
      audienceCountry: toNullableRecord(analytics?.audienceCountry),
      source: 'ayrshare',
    };
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
