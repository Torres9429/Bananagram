import { HttpException, HttpStatus, Injectable, InternalServerErrorException } from '@nestjs/common';
import { createCircuitBreaker } from '@repo/backend-commons';
import { getOpenRouterConfig, getOpenRouterErrorMessage } from './openrouter.util';

export type ChatContentBlock = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export type ChatMessage = { role: 'system' | 'user'; content: string | ChatContentBlock[] };

type OpenRouterResponse = {
  choices?: { message?: { content?: string } }[];
  error?: { message?: string; code?: unknown };
  message?: string;
};

// Mismo patrón que core-service/src/integrations/ayrshare/ayrshare.service.ts:
// fetch nativo envuelto en createCircuitBreaker (@repo/backend-commons,
// opossum) — nunca se loguea el body de la request (puede traer contenido de
// marca) ni la API key.
@Injectable()
export class OpenRouterClient {
  async chatCompletion(messages: ChatMessage[]): Promise<string> {
    const { apiKey, model, baseUrl } = getOpenRouterConfig();

    // IMPORTANTE: fetch() resuelve en cuanto llegan los headers, no cuando
    // termina de bajar el body — si solo se envuelve el fetch en el breaker
    // (como hacía la primera versión, calcada de ayrshare.service.ts), el
    // response.json() que sigue queda SIN protección de timeout. Verificado
    // en vivo contra el modelo gratis configurado: la conexión se aceptaba
    // rápido pero el body tardaba minutos en llegar completo, y el breaker
    // nunca cortaba la espera. Por eso acá se envuelve fetch+json() juntos
    // dentro de la misma acción del breaker, para que el timeout cubra el
    // round-trip completo.
    const breaker = createCircuitBreaker(
      async () => {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'X-Title': 'Bananagram',
          },
          body: JSON.stringify({ model, messages, temperature: 0.7 }),
        });
        const payload = (await response.json().catch(() => ({}))) as OpenRouterResponse;
        return { status: response.status, ok: response.ok, payload };
      },
      { timeout: 30000 },
    );

    let result: { status: number; ok: boolean; payload: OpenRouterResponse };
    try {
      result = (await breaker.fire()) as { status: number; ok: boolean; payload: OpenRouterResponse };
    } catch (error) {
      throw new InternalServerErrorException('No se pudo contactar a OpenRouter (tardó demasiado en responder)');
    }

    // Caso aparte a pedido explícito: 429 se distingue del resto de errores
    // de OpenRouter (los modelos gratis comparten rate limit entre todos los
    // usuarios del router, no es un error de configuración nuestro).
    if (result.status === 429) {
      throw new HttpException(
        'OpenRouter: límite de solicitudes alcanzado, intenta de nuevo en un momento',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Verificado en vivo: cuando el proveedor upstream (detrás del modelo
    // gratis elegido) tarda demasiado, OpenRouter devuelve un cuerpo con
    // `{"error":{"message":"Upstream idle timeout exceeded","code":504}}`
    // (a veces con la conexión "rellenada" con espacios en blanco mientras
    // esperaba, para no cortar el stream por inactividad) — CON UN STATUS
    // HTTP que puede seguir en el rango 2xx (`response.ok === true`). Por
    // eso el error embebido se revisa ANTES de confiar en `result.ok`, en
    // vez de asumir que 2xx significa payload válido.
    if (result.payload.error) {
      throw new InternalServerErrorException(
        getOpenRouterErrorMessage(result.payload, 'OpenRouter no pudo procesar la solicitud'),
      );
    }

    if (!result.ok) {
      throw new InternalServerErrorException(
        getOpenRouterErrorMessage(result.payload, `OpenRouter respondió ${result.status}`),
      );
    }

    const content = result.payload.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      throw new InternalServerErrorException('OpenRouter devolvió una respuesta vacía');
    }

    return content;
  }
}
