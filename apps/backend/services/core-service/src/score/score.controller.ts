import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '@repo/backend-commons';
import { PermissionGuard } from '@repo/backend-commons';
import { RequirePermission } from '@repo/backend-commons';
import { CurrentUser } from '@repo/backend-commons';
import { ScoreService } from './score.service';

type Claims = { sub: string; roles: string[] };

// score.service.ts ya existía completo (fórmula de 4 factores) pero nunca se
// conectó a NestJS — sin module/controller, no estaba en app.module.ts.
// Sin BrandAccessGuard a propósito: ese guard deja pasar también a CM/
// Diseñador de cualquier campaña de la marca (pensado para "ver el detalle
// de la marca") — Score/crecimiento de cuenta es más estricto (decisión
// confirmada: solo dueño de marca o Administrador), se resuelve a mano vía
// ScoreService.assertIsBrandOwnerOrAdmin, no modificando el guard
// compartido (rompería a brands.controller.ts, que sí necesita el criterio
// amplio).
@ApiTags('score')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('brands')
export class ScoreController {
  constructor(private readonly score: ScoreService) {}

  @Get(':id/score')
  @RequirePermission('score', 'ver')
  async getScore(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: Claims) {
    await this.score.assertIsBrandOwnerOrAdmin(id, user);
    return this.score.calculateIfStale(id);
  }

  @Get(':id/score-history')
  @RequirePermission('score', 'ver')
  async getScoreHistory(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: Claims,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    await this.score.assertIsBrandOwnerOrAdmin(id, user);
    return this.score.getScoreHistory(id, from ? new Date(from) : undefined, to ? new Date(to) : undefined);
  }
}
