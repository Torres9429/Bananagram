import { ArgumentsHost, Catch, HttpStatus } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import type { Response } from 'express';

// El error real de `raw-body`/`body-parser` cuando el body supera el límite
// configurado (ver main.ts, app.useBodyParser) no es una HttpException de
// Nest — es un Error plano con `.type === 'entity.too.large'` (propiedad
// estable de esa librería, no depende del texto de `.message`, que además
// viene en inglés). Sin este filtro, Nest lo trataba como un error genérico
// no reconocido y el mensaje en inglés se filtraba tal cual hasta el
// frontend.
//
// Extiende BaseExceptionFilter (no implementa ExceptionFilter a mano) para
// poder llamar a `super.catch()` en el caso "no es esto" — eso reproduce
// EXACTAMENTE el comportamiento default de Nest (respeta HttpException,
// arma bien el shape {statusCode,message,error} de ValidationPipe, etc.).
// Bug real encontrado en vivo (2026-08-19): la primera versión hacía
// `throw exception` para el caso default en vez de delegar — eso NO
// reengancha con el manejo de excepciones de Nest (ya estás en el último
// filtro), tira un error sin capturar fuera del ciclo request/response y
// tumbó el proceso entero de ai-service en el siguiente error de validación
// normal (un simple @MaxLength fallido).
@Catch()
export class PayloadTooLargeFilter extends BaseExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const isPayloadTooLarge =
      exception && typeof exception === 'object' && (exception as { type?: string }).type === 'entity.too.large';

    if (!isPayloadTooLarge) {
      super.catch(exception, host);
      return;
    }

    // Mismo shape {statusCode, message, error} que ya devuelve ValidationPipe
    // para el resto de errores 4xx de este servicio — new HttpException(string,
    // status).getResponse() NO arma ese shape solo, devuelve el string crudo
    // (confirmado con test unitario), así que se arma el objeto a mano.
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.PAYLOAD_TOO_LARGE).json({
      statusCode: HttpStatus.PAYLOAD_TOO_LARGE,
      message: 'La imagen (o imágenes) adjunta es demasiado grande. Máximo 3 imágenes, ~3MB cada una.',
      error: 'Payload Too Large',
    });
  }
}
