import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

// alexa-service no tiene login propio (no tiene BD, ver
// docs/base/service-boundaries.md) — solo valida el JWT que auth-service ya
// emitió, con el mismo JWT_SECRET, igual que core-service.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET || 'supersecret',
    });
  }
  validate(payload: any) {
    return payload;
  }
}
