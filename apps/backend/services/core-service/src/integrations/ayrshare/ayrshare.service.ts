import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createCircuitBreaker } from '../../circuit-breaker/opossum.factory';
import { prisma } from '../../prisma/client';
import { getAyrshareConfig, getAyrshareErrorMessage } from '../../brands/ayrshare.util';
import { computeEngagement } from './engagement.util';
import { getMapperForNetwork } from './mappers/mapper.registry';
import {
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

type AyrsharePublishResponse =
  | { status: 'success'; id: string; postIds?: AyrsharePublishResult[] }
  | { status: 'error'; code?: number; message?: string };

type AyrshareAnalyticsResponse = Record<string, Record<string, unknown>> | { status: 'error'; code?: number; message?: string };

// Primer consumidor real de createCircuitBreaker() (commons/circuit-breaker) —
// hasta esta fase, ese factory existía sin ningún caller. Reintentos con
// backoff quedan fuera del breaker a propósito (auditoría §5: el breaker
// cuenta fallos, reintentar dentro de él distorsiona errorThresholdPercentage).
@Injectable()
export class AyrshareService implements SocialProvider {
  async publish(profileKey: string, postId: string, content: string, targets: PublishTarget[]): Promise<PublishResultItem[]> {
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
        body: JSON.stringify({ post: content, platforms: targets.map((target) => target.networkCode) }),
      }),
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
      throw new InternalServerErrorException(
        getAyrshareErrorMessage(payload as { message?: string; code?: number }, 'No se pudo publicar en Ayrshare'),
      );
    }

    const resultsByPlatform = new Map((payload.postIds ?? []).map((result) => [result.platform, result]));
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
        socialPostId: result.id,
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
    const mapper = getMapperForNetwork(context.networkCode);
    const mapped = mapper(rawForNetwork);
    const { engagement, engagementBase } = computeEngagement(mapped);

    return { ...mapped, engagement, engagementBase, raw: rawForNetwork, source: 'ayrshare' };
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
