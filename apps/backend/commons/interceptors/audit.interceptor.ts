import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const method = req.method;
    const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);
    if (!mutating) return next.handle();
    return next.handle().pipe(
      tap(() => {
        // TODO: escribir en audit_log con before/after, actor, requestId
      }),
    );
  }
}
