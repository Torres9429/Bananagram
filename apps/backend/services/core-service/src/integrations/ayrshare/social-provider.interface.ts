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
  postUrl?: string;
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

// Resultado de getAccountMetrics — a diferencia de NormalizedAnalytics (por
// post), esto es a nivel de cuenta/red completa, sin depender de ningún post
// publicado. Todo null = no disponible, nunca 0 (mismo criterio que el resto
// de las métricas normalizadas). likes/comments/shares/views/reach son
// acumulados de toda la cuenta (todas las publicaciones), confirmados en
// vivo contra POST /analytics/social de Ayrshare — ese endpoint NO expone
// "visitas al perfil", por eso no hay un campo para eso aquí.
export interface AccountMetrics {
  followers: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  views: number | null;
  reach: number | null;
  // Total de publicaciones de la cuenta completa (Instagram: mediaCount,
  // TikTok: videoCountTotal — confirmado en vivo 2026-08-18). Facebook no
  // trae un campo equivalente en ESTE endpoint (/analytics/social) — se
  // resuelve aparte contando GET /history/facebook (ver ayrshare.service.ts.
  // fetchFacebookHistorySummary, 2026-08-19: confirmado con soporte de
  // Ayrshare que no existe un conteo directo). X sigue sin campo ni fuente
  // alternativa verificada, queda null.
  posts: number | null;
  // Demografía de audiencia — confirmado en vivo contra Ayrshare real que el
  // shape es { "F.25-34": 15, "M.18-24": 11 } (género.rango unidos por
  // punto) y { "US": 161 } por país. Requiere mandar `quarters` en el
  // request (si no, Ayrshare ni siquiera intenta calcularlo) y, del lado de
  // Instagram, al menos 100 interacciones en los últimos 30 días — por eso
  // sigue null en cuentas nuevas/de prueba, no es un bug, es una condición
  // real de la plataforma. Object vacío también se normaliza a null.
  audienceGenderAge: Record<string, number> | null;
  audienceCountry: Record<string, number> | null;
  source: string; // 'ayrshare' | 'simulated'
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
  // mediaUrls: hallazgo real de Fase P1 — Instagram rechaza posts sin media
  // (Ayrshare error 139, "Media Error"), así que ya no es opcional para esa
  // red en la práctica. URLs públicas ya subidas (Media.url, Cloudinary) —
  // el provider nunca sube archivos, solo reenvía URLs.
  publish(profileKey: string, postId: string, content: string, targets: PublishTarget[], mediaUrls?: string[]): Promise<PublishResultItem[]>;
  getAnalytics(profileKey: string, socialPostId: string, context: AnalyticsContext): Promise<NormalizedAnalytics>;
  // Métricas de la cuenta/red completa (seguidores) — no depende de ningún
  // post. Mismo profileKey de la marca, networkCode identifica qué red
  // dentro del perfil (Ayrshare devuelve todas las redes del perfil en una
  // sola llamada, pero el contrato pide una por invocación para que el
  // caller no tenga que conocer el shape crudo de Ayrshare).
  getAccountMetrics(profileKey: string, networkCode: string): Promise<AccountMetrics>;
}

// Token de inyección — NestJS no puede inyectar por interfaz (se borra en
// runtime), así que se usa un string como provider token.
export const SOCIAL_PROVIDER = 'SocialProvider';
