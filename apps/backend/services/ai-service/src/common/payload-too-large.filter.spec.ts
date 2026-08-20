import { HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { PayloadTooLargeFilter } from './payload-too-large.filter';

function mockHost(response: { status: jest.Mock; json: jest.Mock }) {
  return {
    switchToHttp: () => ({ getResponse: () => response }),
  } as any;
}

describe('PayloadTooLargeFilter', () => {
  it('responde 413 con el shape {statusCode,message,error} en español cuando el error es entity.too.large', () => {
    const json = jest.fn();
    const status = jest.fn(() => ({ json }));
    const filter = new PayloadTooLargeFilter();

    filter.catch({ type: 'entity.too.large', message: 'request entity too large' }, mockHost({ status, json }));

    expect(status).toHaveBeenCalledWith(HttpStatus.PAYLOAD_TOO_LARGE);
    const [body] = json.mock.calls[0];
    expect(body.statusCode).toBe(HttpStatus.PAYLOAD_TOO_LARGE);
    expect(body.message).toMatch(/demasiado grande/i);
    expect(body.message).not.toMatch(/entity too large/i);
  });

  // Bug real encontrado en vivo (2026-08-19): la primera versión hacía
  // `throw exception` para el caso "no es esto", lo que no reengancha con
  // el manejo de Nest y tumbó el proceso en el siguiente BadRequestException
  // normal. super.catch() (BaseExceptionFilter) es la forma correcta de
  // delegar — este test verifica que SÍ delega, no que vuelve a lanzar.
  it('delega a BaseExceptionFilter.catch() para cualquier otro error, sin volver a lanzarlo', () => {
    const baseCatchSpy = jest.spyOn(BaseExceptionFilter.prototype, 'catch').mockImplementation(() => undefined);
    const filter = new PayloadTooLargeFilter();
    const other = new Error('otra cosa');
    const host = mockHost({ status: jest.fn(), json: jest.fn() });

    expect(() => filter.catch(other, host)).not.toThrow();
    expect(baseCatchSpy).toHaveBeenCalledWith(other, host);

    baseCatchSpy.mockRestore();
  });
});
