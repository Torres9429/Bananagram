import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AiServiceClient } from './ai-service.client';

describe('AiServiceClient', () => {
  const originalFetch = global.fetch;
  let client: AiServiceClient;

  beforeEach(() => {
    client = new AiServiceClient();
  });

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('forwards the caller Bearer token and returns the parsed response on success', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 201,
      json: async () => ({ ideas: [{ title: 'A' }] }),
    }) as unknown as typeof fetch;

    const result = await client.generateIdeas({ platform: 'instagram' }, 'Bearer abc123');

    expect(result).toEqual({ ideas: [{ title: 'A' }] });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/ai/generate-ideas'),
      expect.objectContaining({ headers: expect.objectContaining({ Authorization: 'Bearer abc123' }) }),
    );
  });

  it('maps a 400 from ai-service to BadRequestException with the real message', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({ message: ['platform must be a string'] }),
    }) as unknown as typeof fetch;

    await expect(client.generateIdeas({ platform: '' }, 'Bearer abc123')).rejects.toThrow(BadRequestException);
  });

  it('maps any other non-2xx status to InternalServerErrorException', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Permiso requerido: campanas:crear' }),
    }) as unknown as typeof fetch;

    await expect(client.generateIdeas({ platform: 'instagram' }, 'Bearer abc123')).rejects.toThrow(
      InternalServerErrorException,
    );
  });
});
