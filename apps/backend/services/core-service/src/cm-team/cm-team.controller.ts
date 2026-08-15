import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionGuard } from '../guards/permission.guard';
import { RequirePermission } from '../decorators/require-permission.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { CmTeamService } from './cm-team.service';
import { AddTeamMemberDto } from './dto/add-team-member.dto';

type Claims = { sub: string; roles: string[] };

// Prefijo propio /cm-team (no /me/team): el gateway enruta TODO /api/me/*
// a auth-service (ver apps/backend/gateway/src/main.ts) — un sub-path bajo
// /me/* que en realidad vive en core-service quedaría inalcanzable ahí sin
// tocar el orden del proxy. campanas:asignar (misma noción que ya usa
// CampaignsController para asignar/quitar diseñadores por campaña —
// "gestionar quién trabaja conmigo") — solo lo tiene community_manager en
// el seed.
@ApiTags('cm-team')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, PermissionGuard)
@Controller('cm-team')
export class CmTeamController {
  constructor(private readonly cmTeam: CmTeamService) {}

  @Get()
  @RequirePermission('campanas', 'asignar')
  listMine(@CurrentUser() user: Claims) {
    return this.cmTeam.listMine(user.sub);
  }

  @Post()
  @RequirePermission('campanas', 'asignar')
  add(@Body() dto: AddTeamMemberDto, @CurrentUser() user: Claims) {
    return this.cmTeam.add(user.sub, dto.designerUserId);
  }

  @Delete(':designerUserId')
  @RequirePermission('campanas', 'asignar')
  remove(@Param('designerUserId', ParseUUIDPipe) designerUserId: string, @CurrentUser() user: Claims) {
    return this.cmTeam.remove(user.sub, designerUserId);
  }
}
