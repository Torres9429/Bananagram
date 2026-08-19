import { HttpException, InternalServerErrorException } from '@nestjs/common';
import { OpenRouterClient } from './openrouter.client';

describe('OpenRouterClient', () => {
  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_MODEL = 'test-model:free';
  });

  afterEach(() => {
    global.fetch = originalFetch;
    process.env = { ...originalEnv };
    jest.restoreAllMocks();
  });

  it('throws if OPENROUTER_API_KEY is missing', async () => {
    delete process.env.OPENROUTER_API_KEY;
    const client = new OpenRouterClient();
    await expect(client.chatCompletion([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('returns the message content on a successful response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: '{"ideas":[]}' } }] }),
    }) as unknown as typeof fetch;

    const client = new OpenRouterClient();
    const content = await client.chatCompletion([{ role: 'user', content: 'hola' }]);
    expect(content).toBe('{"ideas":[]}');
  });

  it('maps HTTP 429 to a distinct HttpException (rate limit), not a generic 500', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 429,
      json: async () => ({ error: { message: 'rate limited' } }),
    }) as unknown as typeof fetch;

    const client = new OpenRouterClient();
    await expect(client.chatCompletion([{ role: 'user', content: 'hola' }])).rejects.toMatchObject({
      status: 429,
    } as Partial<HttpException>);
  });

  it('wraps a network failure (fetch rejects) as InternalServerErrorException', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;

    const client = new OpenRouterClient();
    await expect(client.chatCompletion([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  it('throws when the response has no usable content', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ choices: [] }),
    }) as unknown as typeof fetch;

    const client = new OpenRouterClient();
    await expect(client.chatCompletion([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      InternalServerErrorException,
    );
  });

  // Caso real verificado en vivo (2026-08-18): bajo carga, OpenRouter
  // devuelve {"error":{"message":"Upstream idle timeout exceeded","code":504}}
  // en el body con un status que sigue reportando ok:true — response.ok NO
  // alcanza para detectarlo, hay que revisar payload.error explícitamente.
  it('throws a clear error when OpenRouter embeds an error object even with a 2xx status', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ error: { message: 'Upstream idle timeout exceeded', code: 504 } }),
    }) as unknown as typeof fetch;

    const client = new OpenRouterClient();
    await expect(client.chatCompletion([{ role: 'user', content: 'hola' }])).rejects.toThrow(
      /Upstream idle timeout exceeded/,
    );
  });
});
