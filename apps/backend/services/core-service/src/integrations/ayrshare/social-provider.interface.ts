// Contrato único para publicar/sincronizar métricas, sin importar si detrás
// hay Ayrshare real (AyrshareProvider, Fase 3) o el simulador (MockSocialProvider,
// esta fase) — así el resto del sistema (scheduler, cron de métricas) nunca
// sabe cuál de los dos está activo.

export interface PublishTarget {
  socialAccountId: string;
  networkCode: string; // SocialNetwork.code, p. ej. 'instagram'
}

export interface PublishResultItem {
  socialAccountId: string;
  status: 'publicado' | 'error';
  socialPostId?: string;
  providerStatus?: string;
  errorCode?: string;
  errorMessage?: string;
}

// Datos que el provider necesita para calcular/pedir analíticas de una
// publicación por red — MockSocialProvider los usa para simular
// (simulateMetrics), AyrshareProvider ignora la mayoría y solo necesita
// socialPostId + networkCode (para elegir el mapper correcto).
export interface AnalyticsContext {
  socialAccountId: string;
  networkCode: string;
  followers: number;
  baseEngagementRate: number; // 0–1, ya dividido /100
  publishedAt: Date;
}

// null = no disponible, nunca 0 (auditoría §7/§16) — ver mappers en Fase 3.
export interface NormalizedAnalytics {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
  engagement: number | null;
  engagementBase: string | null; // 'reach' | 'views' | 'impressions'
  raw: unknown;
  // Cada provider declara su propio origen ('simulated' | 'ayrshare') — así
  // metrics-cron.service.ts nunca necesita leer SOCIAL_PROVIDER por su cuenta
  // para decidir qué guardar en PostMetric.source (auditoría §2, crítico
  // para no mezclar datos falsos con reales sin marcarlos).
  source: string;
}

export interface SocialProvider {
  // profileKey identifica el perfil de Ayrshare de la marca (Brand.profileKey)
  // — MockSocialProvider lo ignora, AyrshareProvider lo manda como header
  // 'Profile-Key' (mismo patrón ya usado en social-accounts.service.ts).
  // postId es solo para trazabilidad (ProviderRequestLog) — no se manda a Ayrshare.
  publish(profileKey: string, postId: string, content: string, targets: PublishTarget[]): Promise<PublishResultItem[]>;
  getAnalytics(profileKey: string, socialPostId: string, context: AnalyticsContext): Promise<NormalizedAnalytics>;
}

// Token de inyección — NestJS no puede inyectar por interfaz (se borra en
// runtime), así que se usa un string como provider token.
export const SOCIAL_PROVIDER = 'SocialProvider';
