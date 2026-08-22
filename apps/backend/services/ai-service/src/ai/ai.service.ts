import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CoreServiceClient } from './core-service.client';
import { OpenRouterClient, ChatContentBlock, ChatMessage } from './openrouter.client';
import { GenerateIdeasDto } from './dto/generate-ideas.dto';
import { AnalyzePostDto } from './dto/analyze-post.dto';
import { ImprovePostDto, ImprovePostAction } from './dto/improve-post.dto';
import { SuggestCaptionDto } from './dto/suggest-caption.dto';
import { CampaignRecommendationsDto } from './dto/campaign-recommendations.dto';

export type GeneratedIdea = {
  title: string;
  concept: string;
  hook: string;
  suggestedFormat: string;
  callToAction: string;
};

export type AnalyzePostResult = {
  score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  hashtagAnalysis: string;
  visualRecommendations?: string[];
};

export type ImprovePostResult = {
  original: string;
  improved: string;
  changes: string[];
  suggestedHashtags?: string[];
  variants?: string[];
};

export type CampaignRecommendationsResult = {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
};

const ANALYZE_SYSTEM_PROMPT = `Eres un asistente de marketing de redes sociales para Bananagram. Analizas
publicaciones antes de que se aprueben. "score" es una evaluación CUALITATIVA de 0 a 100 generada por IA
sobre la calidad/potencial del contenido — nunca la presentes ni la calcules como una predicción estadística
real de éxito, alcance o engagement (no tenemos datos suficientes para eso). Responde ÚNICAMENTE con un
objeto JSON válido, sin texto adicional, sin backticks ni bloques de código, con exactamente esta forma:
{"score": number, "summary": string, "strengths": string[], "weaknesses": string[], "recommendations":
string[], "hashtagAnalysis": string, "visualRecommendations": string[] | undefined}.
"visualRecommendations" solo si se te proporcionó una imagen.`;

const IMPROVE_SYSTEM_PROMPT = `Eres un asistente de marketing de redes sociales para Bananagram. Se te pide
mejorar una publicación existente. Nunca inventes datos de la marca que no se te dieron. Responde
ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin backticks, con exactamente esta forma:
{"original": string, "improved": string, "changes": string[], "suggestedHashtags": string[] | undefined,
"variants": string[] | undefined}. "variants" solo si se te pide generar variantes (2 o 3 alternativas
adicionales a "improved").`;

const IDEAS_SYSTEM_PROMPT = `Eres un asistente de marketing de redes sociales para Bananagram. Generas ideas
de publicaciones nuevas a partir del contexto de una marca/campaña. Uno de los consumidores de esta
respuesta es una skill de voz (Alexa) que lee "hook" y "concept" en voz alta — por eso deben ser CORTOS y
CONCRETOS, tipo pitch rápido, nunca un párrafo explicativo largo.

Reglas de longitud (estrictas, no las excedas):
- "concept": una sola frase corta (máximo 15 palabras), formato + idea concreta, no una explicación de por
  qué funcionaría. Ejemplos de buen estilo: "Video de 3 segundos mostrando el producto en acción", "Reto de
  baile de 15 segundos con el hashtag de la marca", "Carrusel de 5 tips rápidos sobre el tema". Ejemplo de
  mal estilo (demasiado largo, evítalo): "Un video dinámico y estético que muestra el proceso creativo detrás
  de la campaña, conectando emocionalmente con la audiencia a través de una narrativa inspiradora sobre..."
- "hook": una frase corta (máximo 12 palabras) que se pueda leer de corrido sin sonar como un párrafo.
- "suggestedFormat": 2 a 4 palabras (ej. "Reel de 15s", "Carrusel de 5 fotos", "Video reto").
- "callToAction": una frase corta y directa (máximo 10 palabras).

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin backticks, con exactamente esta
forma: {"ideas": [{"title": string, "concept": string, "hook": string, "suggestedFormat": string,
"callToAction": string}]}.`;

const CAMPAIGN_RECOMMENDATIONS_SYSTEM_PROMPT = `Eres un asistente de marketing de redes sociales para
Bananagram. Se te da un resumen de métricas reales de una campaña (posts, alcance, interacciones, tasa de
engagement si está disponible) y debes dar recomendaciones cualitativas para mejorarla. Nunca inventes
cifras que no se te dieron, y nunca presentes tu evaluación como una predicción estadística real — es una
lectura cualitativa de un asistente de IA sobre los datos entregados. Responde ÚNICAMENTE con un objeto
JSON válido, sin texto adicional, sin backticks, con exactamente esta forma: {"summary": string,
"strengths": string[], "weaknesses": string[], "recommendations": string[]}.`;

const SUGGEST_CAPTION_SYSTEM_PROMPT = `Eres un asistente de marketing de redes sociales para Bananagram. Se
te pide sugerir captions para una publicación que el usuario todavía no ha redactado, a partir de una
descripción breve y/o una o más imágenes que se te proporcionen. Responde ÚNICAMENTE con un objeto JSON
válido, sin texto adicional, sin backticks, con exactamente esta forma: {"suggestions": string[]}. Genera
entre 2 y 3 opciones de caption listas para usar, adecuadas para la plataforma indicada.`;

@Injectable()
export class AiService {
  constructor(
    private readonly openRouter: OpenRouterClient,
    private readonly coreService: CoreServiceClient,
  ) {}

  async generateIdeas(dto: GenerateIdeasDto): Promise<{ ideas: GeneratedIdea[] }> {
    const quantity = dto.quantity ?? 5;
    const lines = [
      `Plataforma objetivo: ${dto.platform}`,
      dto.brandName && `Marca: ${dto.brandName}`,
      dto.category && `Categoría/nicho: ${dto.category}`,
      dto.description && `Descripción: ${dto.description}`,
      dto.audience && `Audiencia: ${dto.audience}`,
      dto.tone && `Tono de comunicación: ${dto.tone}`,
      dto.additionalContext && `Contexto adicional: ${dto.additionalContext}`,
      dto.previousPosts?.length && `Publicaciones anteriores de referencia:\n- ${dto.previousPosts.join('\n- ')}`,
      `Genera exactamente ${quantity} ideas.`,
    ].filter(Boolean);

    // maxTokens tiene que cubrir el bloque de razonamiento obligatorio del
    // modelo MÁS la respuesta real — verificado en vivo que ese razonamiento
    // es VARIABLE (576-864 tokens en corridas reales, no un tamaño fijo), así
    // que ni siquiera un tope generoso garantiza no truncar en una corrida
    // con más razonamiento de lo normal (ver OpenRouterClient.chatCompletion
    // para el detalle completo). Esto no acelera la respuesta (el
    // razonamiento manda igual, ~9s típico) — es solo contención de
    // truncamiento mientras se decide si vale la pena cambiar de modelo.
    const content = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: IDEAS_SYSTEM_PROMPT },
        { role: 'user', content: lines.join('\n') },
      ],
      { maxTokens: 1500 },
    );

    const parsed = parseJsonResponse<{ ideas?: unknown }>(content);
    if (!Array.isArray(parsed.ideas) || parsed.ideas.length === 0) {
      throw new InternalServerErrorException('La respuesta de IA no tuvo el formato esperado (ideas[])');
    }
    const ideas = parsed.ideas.filter(isValidIdea);
    if (ideas.length === 0) {
      throw new InternalServerErrorException('La respuesta de IA no tuvo el formato esperado (ideas[])');
    }
    return { ideas };
  }

  async analyzePost(dto: AnalyzePostDto, authHeader: string): Promise<AnalyzePostResult> {
    const post = await this.coreService.fetchPostContext(dto.postId, authHeader);

    const lines = [
      `Contenido de la publicación:\n${post.content}`,
      post.platforms.length && `Plataformas: ${post.platforms.join(', ')}`,
      post.brandName && `Marca: ${post.brandName}`,
      post.campaignName && `Campaña: ${post.campaignName}`,
      dto.additionalContext && `Instrucción adicional del revisor: ${dto.additionalContext}`,
    ].filter(Boolean);

    const userContent: ChatContentBlock[] = [{ type: 'text', text: lines.join('\n') }];
    if (post.imageUrl) {
      userContent.push({ type: 'image_url', image_url: { url: post.imageUrl } });
    }

    const messages: ChatMessage[] = [
      { role: 'system', content: ANALYZE_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ];

    const content = await this.openRouter.chatCompletion(messages);
    const parsed = parseJsonResponse<Partial<AnalyzePostResult>>(content);
    if (
      typeof parsed.score !== 'number' ||
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.weaknesses) ||
      !Array.isArray(parsed.recommendations)
    ) {
      throw new InternalServerErrorException('La respuesta de IA no tuvo el formato esperado');
    }

    return {
      score: parsed.score,
      summary: parsed.summary,
      strengths: parsed.strengths as string[],
      weaknesses: parsed.weaknesses as string[],
      recommendations: parsed.recommendations as string[],
      hashtagAnalysis: typeof parsed.hashtagAnalysis === 'string' ? parsed.hashtagAnalysis : '',
      visualRecommendations: Array.isArray(parsed.visualRecommendations) ? parsed.visualRecommendations : undefined,
    };
  }

  async improvePost(dto: ImprovePostDto, authHeader: string): Promise<ImprovePostResult> {
    const post = await this.coreService.fetchPostContext(dto.postId, authHeader);

    const actionInstruction: Record<ImprovePostAction, string> = {
      [ImprovePostAction.MEJORAR]: 'Mejora la redacción y claridad del caption, conservando su intención original.',
      [ImprovePostAction.VARIANTES]: 'Genera 2 o 3 variantes adicionales del caption (campo "variants"), además de la versión principal en "improved".',
      [ImprovePostAction.HASHTAGS]: 'Sugiere hashtags relevantes (campo "suggestedHashtags") acordes a la plataforma y el contenido.',
      [ImprovePostAction.ADAPTAR]: `Adapta el caption a la plataforma destino: ${dto.targetPlatform ?? '(no especificada, usa buen criterio)'}.`,
    };

    const lines = [
      `Caption original:\n${post.content}`,
      post.platforms.length && `Plataforma(s) actual(es): ${post.platforms.join(', ')}`,
      `Acción solicitada: ${actionInstruction[dto.action]}`,
      dto.additionalContext && `Instrucción adicional: ${dto.additionalContext}`,
    ].filter(Boolean);

    const content = await this.openRouter.chatCompletion([
      { role: 'system', content: IMPROVE_SYSTEM_PROMPT },
      { role: 'user', content: lines.join('\n') },
    ]);

    const parsed = parseJsonResponse<Partial<ImprovePostResult>>(content);
    if (typeof parsed.improved !== 'string' || !Array.isArray(parsed.changes)) {
      throw new InternalServerErrorException('La respuesta de IA no tuvo el formato esperado');
    }

    return {
      original: post.content,
      improved: parsed.improved,
      changes: parsed.changes as string[],
      suggestedHashtags: Array.isArray(parsed.suggestedHashtags) ? parsed.suggestedHashtags : undefined,
      variants: Array.isArray(parsed.variants) ? parsed.variants : undefined,
    };
  }

  // Sin postId: la publicación todavía no existe (posts/new) — no hay nada
  // que validar contra core-service, a diferencia de analyze/improve.
  async suggestCaption(dto: SuggestCaptionDto): Promise<{ suggestions: string[] }> {
    if (!dto.brief?.trim() && !(dto.images && dto.images.length > 0)) {
      throw new BadRequestException('Debes indicar una descripción breve o al menos una imagen');
    }

    const lines = [`Plataforma objetivo: ${dto.platform}`, dto.brief && `Descripción breve: ${dto.brief}`].filter(
      Boolean,
    );

    const userContent: ChatContentBlock[] = [{ type: 'text', text: lines.join('\n') }];
    for (const image of dto.images ?? []) {
      userContent.push({ type: 'image_url', image_url: { url: image } });
    }

    const content = await this.openRouter.chatCompletion([
      { role: 'system', content: SUGGEST_CAPTION_SYSTEM_PROMPT },
      { role: 'user', content: userContent },
    ]);

    const parsed = parseJsonResponse<{ suggestions?: unknown }>(content);
    if (
      !Array.isArray(parsed.suggestions) ||
      parsed.suggestions.length === 0 ||
      !parsed.suggestions.every((s) => typeof s === 'string')
    ) {
      throw new InternalServerErrorException('La respuesta de IA no tuvo el formato esperado (suggestions[])');
    }

    return { suggestions: parsed.suggestions as string[] };
  }

  // Para GetIdeaRecommendationsIntent (Alexa Skill, vía alexa-service) — a
  // diferencia de analyzePost, no hay postId ni core-service de por medio:
  // el caller ya manda el resumen agregado que necesita (arma ese resumen a
  // partir de endpoints que ya tiene, no se le pide nada nuevo a core-service
  // desde acá).
  async campaignRecommendations(dto: CampaignRecommendationsDto): Promise<CampaignRecommendationsResult> {
    const lines = [
      `Campaña: ${dto.campaignName}`,
      `Publicaciones: ${dto.totalPosts}`,
      `Alcance total: ${dto.reach}`,
      `Interacciones totales: ${dto.interactions}`,
      dto.engagementRate != null && `Tasa de engagement: ${dto.engagementRate}%`,
      dto.additionalContext && `Contexto adicional: ${dto.additionalContext}`,
    ].filter(Boolean);

    // Mismo criterio que generateIdeas — ver comentario ahí.
    const content = await this.openRouter.chatCompletion(
      [
        { role: 'system', content: CAMPAIGN_RECOMMENDATIONS_SYSTEM_PROMPT },
        { role: 'user', content: lines.join('\n') },
      ],
      { maxTokens: 1300 },
    );

    const parsed = parseJsonResponse<Partial<CampaignRecommendationsResult>>(content);
    if (
      typeof parsed.summary !== 'string' ||
      !Array.isArray(parsed.strengths) ||
      !Array.isArray(parsed.weaknesses) ||
      !Array.isArray(parsed.recommendations)
    ) {
      throw new InternalServerErrorException('La respuesta de IA no tuvo el formato esperado');
    }

    return {
      summary: parsed.summary,
      strengths: parsed.strengths as string[],
      weaknesses: parsed.weaknesses as string[],
      recommendations: parsed.recommendations as string[],
    };
  }
}

// No confiar ciegamente en que el modelo respeta "sin backticks" — algunos
// proveedores igual envuelven el JSON en ```json ... ``` pese a la
// instrucción del system prompt.
function parseJsonResponse<T>(content: string): T {
  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    // Segundo intento: algunos modelos (sobre todo los gratis, bajo carga)
    // agregan una frase antes/después del JSON pese a la instrucción del
    // system prompt (ej. "Aquí tienes el análisis: {...}") — se busca el
    // primer '{' y el último '}' y se reintenta con ese recorte antes de
    // rendirse. Nunca se asume JSON válido sin pasar por JSON.parse().
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1)) as T;
      } catch {
        // sigue al error de abajo
      }
    }
    throw new InternalServerErrorException('La respuesta de IA no pudo interpretarse como JSON válido');
  }
}

function isValidIdea(value: unknown): value is GeneratedIdea {
  if (!value || typeof value !== 'object') return false;
  const idea = value as Record<string, unknown>;
  return typeof idea.title === 'string' && typeof idea.concept === 'string';
}
