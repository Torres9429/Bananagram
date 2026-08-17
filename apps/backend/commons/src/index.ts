// Punto de entrada único (sin subpaths, ver package.json) — el
// tsconfig.base.json de backend usa moduleResolution clásica ("node",
// implícita por module:"commonjs"), que no resuelve de forma confiable un
// exports map con subpaths para el chequeo de tipos. Un solo barrel evita
// ese riesgo.

export * from './decorators/current-user.decorator';
export * from './decorators/require-permission.decorator';

export * from './guards/permission.guard';
export * from './guards/jwt-auth.guard';
export * from './guards/token-denylist.service';

export * from './filters/http-exception.filter';
export * from './interceptors/logging.interceptor';
export * from './circuit-breaker/opossum.factory';

export * from './types/jwt-payload.type';
export * from './types/modules.enum';
export * from './types/actions.enum';
export * from './types/roles.enum';
