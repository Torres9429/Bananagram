import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const SENSITIVE_KEY = /password|token|secret|apikey|privatekey/i;

export interface AuditEntryInput {
  tableName: string;
  recordId: string | null;
  action: string;
  before: unknown;
  after: unknown;
  performedBy: string;
  requestId?: string;
}

// Nunca debe permitir que un password/token/secret quede en texto plano en
// audit_log — antes de guardar cualquier body de respuesta, se redacta
// recursivamente (profundidad acotada) cualquier clave que matchee el
// patrón, sin importar en qué endpoint aparezca (login/refresh devuelven
// JWTs en el body, por ejemplo).
function redactSensitive(value: unknown, depth = 0): unknown {
  if (depth > 3 || value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map((item) => redactSensitive(item, depth + 1));
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    result[key] = SENSITIVE_KEY.test(key) ? '[REDACTED]' : redactSensitive(val, depth + 1);
  }
  return result;
}

// login/register/refresh no tienen req.user (todavía no hay sesión en ese
// punto de la request) — pero SÍ acaban de emitir un accessToken propio en
// la respuesta. Se decodifica (sin verificar firma — es el token que este
// mismo servicio acaba de firmar en esta misma request, no uno recibido de
// afuera) solo para leer el email y no dejar 'anonymous' en cada login real.
// Nunca se usa para autorizar nada, solo para poblar el audit trail.
function decodeEmailFromFreshToken(response: unknown): string | null {
  const token = (response as { accessToken?: unknown } | null)?.accessToken;
  if (typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  try {
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    return typeof payload?.email === 'string' ? payload.email : null;
  } catch {
    return null;
  }
}

// Deliberadamente agnóstico de base de datos — commons/ no depende de
// Prisma (ai-service no lo tiene, alexa-service no tiene tabla AuditLog).
// Cada servicio dueño de audit_log (auth-service, core-service) inyecta su
// propia función de escritura contra su propio cliente de Prisma.
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Audit');

  constructor(private readonly write: (entry: AuditEntryInput) => Promise<void>) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    if (!MUTATING_METHODS.has(req.method)) return next.handle();

    return next.handle().pipe(
      tap((response) => {
        const route: string = req.route?.path ?? req.url;
        // Tanto req.route.path como req.url pueden traer el prefijo global
        // 'api' incluido (setGlobalPrefix('api') en cada main.ts) —
        // filtrado explícito acá en vez de asumir cuál de los dos lo trae,
        // para no adivinar el comportamiento exacto de Nest/Express sin
        // poder probarlo en vivo en este entorno.
        const segments = route.split('/').filter((segment) => segment && segment !== 'api');
        const tableName = segments[0] ?? 'unknown';
        const recordId =
          response?.id ??
          req.params?.id ??
          req.params?.brandId ??
          req.params?.userId ??
          req.params?.campaignId ??
          null;

        const entry: AuditEntryInput = {
          tableName,
          recordId: recordId ? String(recordId) : null,
          action: `${req.method} ${route}`,
          before: null,
          after: redactSensitive(response),
          // Antes: req.user?.sub (UUID crudo, ilegible en /audit-log — el
          // payload del JWT ya trae `email`, mismo costo, mucho más útil).
          performedBy: req.user?.email ?? decodeEmailFromFreshToken(response) ?? 'anónimo',
          requestId: req.headers?.['x-request-id'],
        };

        this.write(entry).catch((err) => this.logger.warn(`No se pudo escribir audit_log: ${err?.message}`));
      }),
    );
  }
}
